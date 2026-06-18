'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { Command, Hash, User, Moon, Sun, Bell, Search, ChevronRight } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type ResultItem = {
  id: string;
  type: 'channel' | 'member' | 'action';
  icon: React.ReactNode;
  label: string;
  description: string;
  onSelect: () => void;
};

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const channels = useDashboardStore((s) => s.channels);
  const members = useDashboardStore((s) => s.members);
  const setActiveChannel = useDashboardStore((s) => s.setActiveChannel);
  const darkMode = useDashboardStore((s) => s.darkMode);
  const toggleDarkMode = useDashboardStore((s) => s.toggleDarkMode);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const workspaceChannels = channels.filter((ch) => !ch.id.startsWith('member-'));

  const allResults: ResultItem[] = [
    ...workspaceChannels.map((ch) => ({
      id: `channel-${ch.id}`,
      type: 'channel' as const,
      icon: <Hash size={15} strokeWidth={2.5} />,
      label: `#${ch.name}`,
      description: ch.description || `${ch.memberCount} members`,
      onSelect: () => {
        setActiveChannel(ch.id);
        onClose();
      },
    })),
    ...members.map((m) => ({
      id: `member-${m.id}`,
      type: 'member' as const,
      icon: (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white"
          style={{ backgroundColor: m.color }}
        >
          {m.initials}
        </span>
      ),
      label: m.name,
      description: `${m.role} · ${m.status}`,
      onSelect: () => {
        setActiveChannel(m.id);
        onClose();
      },
    })),
    {
      id: 'action-darkmode',
      type: 'action' as const,
      icon: darkMode ? <Sun size={15} strokeWidth={2.5} /> : <Moon size={15} strokeWidth={2.5} />,
      label: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle the colour scheme',
      onSelect: () => {
        toggleDarkMode();
        onClose();
      },
    },
    {
      id: 'action-notifications',
      type: 'action' as const,
      icon: <Bell size={15} strokeWidth={2.5} />,
      label: 'Open Notifications',
      description: 'View your recent alerts',
      onSelect: () => {
        onClose();
      },
    },
    {
      id: 'action-search',
      type: 'action' as const,
      icon: <Search size={15} strokeWidth={2.5} />,
      label: 'Search Messages',
      description: 'Full-text search across all channels',
      onSelect: () => {
        onClose();
      },
    },
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? allResults.filter(
        (r) => r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      )
    : allResults;

  const grouped: Record<string, ResultItem[]> = {};
  filtered.forEach((r) => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  const flat = [...(grouped.channel ?? []), ...(grouped.member ?? []), ...(grouped.action ?? [])];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        flat[activeIndex]?.onSelect();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [flat, activeIndex, onClose]
  );

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const GROUP_LABELS: Record<string, string> = {
    channel: 'Channels',
    member: 'Members',
    action: 'Actions',
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgba(25,30,47,0.70)] backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl bg-[#191E2F] shadow-2xl ring-1 ring-[rgba(62,74,137,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[rgba(62,74,137,0.15)]">
          <Command size={18} className="text-indigo-400 flex-shrink-0" strokeWidth={2.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search channels, members, actions…"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-[10px] font-mono text-[#7C859E] border border-[rgba(62,74,137,0.15)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#7C859E]">
              <Search size={28} strokeWidth={1.5} />
              <p className="text-sm font-medium">No results for &quot;{query}&quot;</p>
            </div>
          ) : (
            (['channel', 'member', 'action'] as const).map((type) => {
              const items = grouped[type];
              if (!items?.length) return null;
              let globalOffset = 0;
              if (type === 'member') globalOffset = grouped.channel?.length ?? 0;
              if (type === 'action')
                globalOffset = (grouped.channel?.length ?? 0) + (grouped.member?.length ?? 0);
              return (
                <div key={type}>
                  <div className="px-4 py-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#7C859E]">
                      {GROUP_LABELS[type]}
                    </span>
                  </div>
                  {items.map((item, idx) => {
                    const globalIdx = globalOffset + idx;
                    const isActive = globalIdx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        data-index={globalIdx}
                        onClick={item.onSelect}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-[#3E4A89]/20 text-slate-100'
                            : 'text-[#9BA6D3] hover:bg-slate-800/50'
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 ${
                            isActive ? 'text-indigo-400' : 'text-[#7C859E]'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">{item.label}</span>
                          <span className="block text-xs text-[#7C859E] truncate">
                            {item.description}
                          </span>
                        </span>
                        {isActive && (
                          <ChevronRight size={14} className="text-indigo-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-[rgba(62,74,137,0.15)] bg-[rgba(25,30,47,0.80)]">
          <span className="flex items-center gap-1.5 text-[10px] text-[#7C859E]">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-[rgba(62,74,137,0.15)] font-mono text-[10px]">
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#7C859E]">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-[rgba(62,74,137,0.15)] font-mono text-[10px]">
              ↵
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#7C859E]">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-[rgba(62,74,137,0.15)] font-mono text-[10px]">
              ESC
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
