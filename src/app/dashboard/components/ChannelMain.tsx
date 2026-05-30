'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Search, Video, Bot, FileText, Activity, Pin, X, MessageSquare, LayoutGrid, BookOpen, BarChart2, Bookmark, Phone, ChevronDown } from 'lucide-react';
import MessageFeed from './MessageFeed';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';

interface ChannelMainProps {
  onToggleAI: () => void;
  aiPanelOpen: boolean;
  onToggleNotepad: () => void;
  notepadOpen: boolean;
  onToggleActivity?: () => void;
  activityPanelOpen?: boolean;
  onOpenSearch?: () => void;
  onOpenKanban?: () => void;
  onOpenWiki?: () => void;
  onOpenAnalytics?: () => void;
  onOpenBookmarks?: () => void;
  onOpenVideoCall?: () => void;
}

function getMeetingState(now = new Date()) {
  const day = now.getDay(), hour = now.getHours();
  if (day === 0 || day === 6) return { label: 'No meeting', link: null, message: 'No meeting on weekends.' };
  if (day === 5) return { label: 'Friday meet', link: 'https://meet.google.com/eeq-maem-ztc', message: 'Friday meeting.' };
  if (day === 4 && hour >= 14) return { label: 'Thursday PM', link: 'https://meet.google.com/dss-wmvy-cuq', message: 'Thursday afternoon.' };
  return { label: 'Main meet', link: 'https://meet.google.com/uie-jxkt-vkx', message: 'Main meeting.' };
}

export default function ChannelMain({
  onToggleAI, aiPanelOpen, onToggleNotepad, notepadOpen,
  onToggleActivity, activityPanelOpen = false,
  onOpenSearch, onOpenKanban, onOpenWiki, onOpenAnalytics, onOpenBookmarks, onOpenVideoCall,
}: ChannelMainProps) {
  const { activeChannel: activeChannelId, channels, members, messages, pinnedMessageIds, typingUsers, activeThreadId, setActiveThread } = useDashboardStore();
  const channel = channels.find((c) => c.id === activeChannelId) ?? channels[0];
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [meetDropdownOpen, setMeetDropdownOpen] = useState(false);
  const meetingState = getMeetingState();

  useEffect(() => {
    if (!meetDropdownOpen) return;
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.meet-dropdown')) setMeetDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [meetDropdownOpen]);
  const pinnedIds = pinnedMessageIds[activeChannelId] ?? [];
  const typing = typingUsers[activeChannelId] ?? [];
  const allMessages = messages[activeChannelId] ?? [];
  const threadRoot = activeThreadId ? allMessages.find((m) => m.id === activeThreadId) : null;

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-semibold text-slate-500">No channel selected</p>
      </div>
    );
  }

  const filteredMembers = members.filter(
    (m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const isDM = channel.id.startsWith('member-');

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200/50 px-4 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 dark:border-slate-700/50">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            <span className="text-slate-400">{isDM ? '@' : '#'}</span>
            {channel.name}
          </h1>
          {channel.description && (
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{channel.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Pinned messages badge */}
          {pinnedIds.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-bold text-amber-600">
              <Pin size={11} /> {pinnedIds.length}
            </div>
          )}

          {!isDM && (
            <button onClick={() => setShowMembersModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Users size={14} />{channel.memberCount}
            </button>
          )}

          <button onClick={onOpenSearch}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Search messages">
            <Search size={16} />
          </button>

          <div className="relative meet-dropdown">
            <button onClick={() => setMeetDropdownOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${meetingState.link ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400 cursor-default'}`}>
              <Video size={14} />Meet<ChevronDown size={12} />
            </button>
            {meetDropdownOpen && (
              <div className="absolute right-0 top-9 z-50 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <button onClick={() => { setMeetDropdownOpen(false); if (meetingState.link) window.open(meetingState.link, '_blank'); else toast.info(meetingState.message); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <Video size={16} className="text-indigo-600" />Join meet
                </button>
                {onOpenVideoCall && (
                  <button onClick={() => { setMeetDropdownOpen(false); onOpenVideoCall(); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <Phone size={16} className="text-green-600" />Start video call
                  </button>
                )}
              </div>
            )}
          </div>

          <button onClick={onToggleAI}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${aiPanelOpen ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="AI Copilot">
            <Bot size={16} />
          </button>

          <button onClick={onToggleNotepad}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${notepadOpen ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Notepad">
            <FileText size={16} />
          </button>

          {onOpenWiki && (
            <button onClick={onOpenWiki}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors" title="Wiki / Knowledge base">
              <BookOpen size={16} />
            </button>
          )}

          {onOpenKanban && (
            <button onClick={onOpenKanban}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-orange-600 transition-colors" title="Kanban board">
              <LayoutGrid size={16} />
            </button>
          )}

          {onToggleActivity && (
            <button onClick={onToggleActivity}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${activityPanelOpen ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Activity">
              <Activity size={16} />
            </button>
          )}

          {onOpenBookmarks && (
            <button onClick={onOpenBookmarks}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors" title="Saved messages">
              <Bookmark size={16} />
            </button>
          )}

          {onOpenAnalytics && (
            <button onClick={onOpenAnalytics}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition-colors" title="Analytics">
              <BarChart2 size={16} />
            </button>
          )}
        </div>
      </header>

      {/* ── Pinned messages strip ──────────────────────────────────── */}
      {pinnedIds.length > 0 && !activeThreadId && (
        <div className="border-b border-amber-100 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-800/30 px-4 py-2">
          <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400">
            <Pin size={11} />
            <span className="font-bold">{pinnedIds.length} pinned message{pinnedIds.length > 1 ? 's' : ''}</span>
            <span className="text-amber-500">·</span>
            <span className="truncate">
              {allMessages.find((m) => m.id === pinnedIds[pinnedIds.length - 1])?.text?.slice(0, 60) ?? ''}
            </span>
          </div>
        </div>
      )}

      {/* ── Main area: feed + optional thread panel ────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Message feed */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <MessageFeed channelId={channel.id} />
            </div>
          </div>

          {/* Typing indicator */}
          <TypingIndicator channelId={channel.id} />

          {/* Message input */}
          <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="max-w-4xl mx-auto px-4">
              <MessageInput channelId={channel.id} channelName={channel.name} />
            </div>
          </div>
        </div>

        {/* Thread panel */}
        {activeThreadId && threadRoot && (
          <div className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-indigo-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Thread</span>
              </div>
              <button onClick={() => setActiveThread(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <MessageFeed channelId={channel.id} parentId={activeThreadId} />
            </div>
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-3">
              <MessageInput channelId={channel.id} channelName={channel.name} replyToId={activeThreadId} />
            </div>
          </div>
        )}
      </div>

      {/* ── Members modal ──────────────────────────────────────────── */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-900 to-indigo-900 px-6 py-4 text-white">
              <h2 className="text-base font-black">#{channel.name} Members</h2>
              <p className="mt-0.5 text-xs text-slate-300">{channel.memberCount} members</p>
            </div>
            <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3">
              <input type="text" placeholder="Search members…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundColor: member.color }}>
                    {member.initials}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : member.status === 'away' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
                  </div>
                  <span className={`text-[10px] font-bold capitalize ${member.status === 'online' ? 'text-emerald-600' : member.status === 'away' ? 'text-amber-500' : 'text-slate-400'}`}>
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
              <button onClick={() => { setShowMembersModal(false); setMemberSearch(''); }}
                className="w-full rounded-xl bg-slate-900 dark:bg-indigo-600 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
