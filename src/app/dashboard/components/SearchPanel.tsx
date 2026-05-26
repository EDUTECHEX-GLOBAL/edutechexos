'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { Search, X, Hash, MessageSquare } from 'lucide-react';

interface SearchPanelProps {
  onClose: () => void;
}

type SearchResult = {
  channelId: string;
  channelName: string;
  messageId: string;
  sender: string;
  initials: string;
  color: string;
  text: string;
  timestamp: string;
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <strong key={i} className="font-bold text-slate-900">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function SearchPanel({ onClose }: SearchPanelProps) {
  const messages = useDashboardStore((s) => s.messages);
  const channels = useDashboardStore((s) => s.channels);
  const setActiveChannel = useDashboardStore((s) => s.setActiveChannel);

  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputValue]);

  const channelMap = useMemo(() => {
    const map: Record<string, string> = {};
    channels.forEach((ch) => {
      map[ch.id] = ch.id.startsWith('member-') ? ch.name : `#${ch.name}`;
    });
    return map;
  }, [channels]);

  const results = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase();
    const found: SearchResult[] = [];
    Object.entries(messages).forEach(([channelId, msgs]) => {
      msgs.forEach((msg) => {
        if (msg.text?.toLowerCase().includes(q)) {
          found.push({
            channelId,
            channelName: channelMap[channelId] ?? channelId,
            messageId: msg.id,
            sender: msg.sender,
            initials: msg.initials,
            color: msg.color,
            text: msg.text,
            timestamp: msg.timestamp,
          });
        }
      });
    });
    // Most recent first
    return found.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [debouncedQuery, messages, channelMap]);

  // Group results by channel
  const grouped = useMemo(() => {
    const map: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!map[r.channelId]) map[r.channelId] = [];
      map[r.channelId].push(r);
    });
    return map;
  }, [results]);

  const handleResultClick = (channelId: string) => {
    setActiveChannel(channelId);
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-indigo-400" strokeWidth={2.5} />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            Search Messages
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Search input */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search all messages…"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          {inputValue && (
            <button
              onClick={() => setInputValue('')}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!debouncedQuery ? (
          /* Empty state – no query yet */
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <MessageSquare size={24} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Search across all channels</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Type a keyword to find messages from any channel.
              </p>
            </div>
          </div>
        ) : results.length === 0 ? (
          /* No results state */
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Search size={24} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">No results found</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                No messages match &quot;{debouncedQuery}&quot;. Try a different keyword.
              </p>
            </div>
          </div>
        ) : (
          /* Grouped results */
          <div className="py-2">
            <div className="px-5 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
            {Object.entries(grouped).map(([channelId, items]) => (
              <div key={channelId} className="mb-2">
                {/* Channel header */}
                <div className="flex items-center gap-2 px-5 py-2 bg-slate-50 border-y border-slate-100">
                  <Hash size={12} className="text-indigo-500" strokeWidth={2.5} />
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
                    {items[0].channelName}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400">
                    {items.length} match{items.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                {/* Messages in channel */}
                {items.map((result) => (
                  <button
                    key={result.messageId}
                    onClick={() => handleResultClick(channelId)}
                    className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                  >
                    {/* Avatar */}
                    <span
                      className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-black text-white mt-0.5"
                      style={{ backgroundColor: result.color }}
                    >
                      {result.initials}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-bold text-slate-800">
                          {result.sender}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTime(result.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        <HighlightText text={result.text} query={debouncedQuery} />
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
