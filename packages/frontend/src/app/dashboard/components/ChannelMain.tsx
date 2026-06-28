'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Video,
  Bot,
  FileText,
  Activity,
  Pin,
  X,
  MessageSquare,
  LayoutGrid,
  BookOpen,
  BarChart2,
  Bookmark,
} from 'lucide-react';
import MessageFeed from './MessageFeed';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import StartMeetCard from './StartMeetCard';
import { useDashboardStore } from '@/store/dashboardStore';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { getMeetingState as getMeetLinkState } from '@/lib/meetLinks';

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

export default function ChannelMain({
  onToggleAI,
  aiPanelOpen,
  onToggleNotepad,
  notepadOpen,
  onToggleActivity,
  activityPanelOpen = false,
  onOpenSearch,
  onOpenKanban,
  onOpenWiki,
  onOpenAnalytics,
  onOpenBookmarks,
  onOpenVideoCall,
}: ChannelMainProps) {
  const {
    activeChannel: activeChannelId,
    channels,
    members,
    messages,
    pinnedMessageIds,
    typingUsers,
    activeThreadId,
    setActiveThread,
    setTyping,
  } = useDashboardStore();
  const channel = channels.find((c) => c.id === activeChannelId) ?? channels[0] ?? null;
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [startMeetOpen, setStartMeetOpen] = useState(false);
  const meetingState = getMeetLinkState();

  // Listen for remote typing events so TypingIndicator shows other users
  // Pins are per-user and private — no socket broadcast needed for them
  useEffect(() => {
    const socket = getSocket();
    const onTyping = ({ channelId, userName }: { channelId: string; userName: string }) => {
      setTyping(channelId, userName, true);
    };
    const onStopTyping = ({ channelId, userName }: { channelId: string; userName: string }) => {
      setTyping(channelId, userName, false);
    };
    socket.on('user_typing', onTyping);
    socket.on('user_stopped_typing', onStopTyping);
    return () => {
      socket.off('user_typing', onTyping);
      socket.off('user_stopped_typing', onStopTyping);
    };
  }, [setTyping]);

  const pinnedIds = pinnedMessageIds[activeChannelId] ?? [];
  const typing = typingUsers[activeChannelId] ?? [];
  const allMessages = messages[activeChannelId] ?? [];
  const threadRoot = activeThreadId ? allMessages.find((m) => m.id === activeThreadId) : null;

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-semibold text-[#7C859E]">No channel selected</p>
      </div>
    );
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  if (!channel) return null;

  const isDM = channel.id.startsWith('member-');

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[rgba(62,74,137,0.08)] px-4 backdrop-blur-md bg-white/70 dark:bg-[rgba(25,30,47,0.70)] /50">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-[#1E2636]">
            <span className="text-[#7C859E]">{isDM ? '@' : '#'}</span>
            {channel.name}
          </h1>
          {channel.description && (
            <p className="mt-0.5 truncate text-[11px] text-[#7C859E] dark:text-[#7C859E]">
              {channel.description}
            </p>
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
            <button
              onClick={() => setShowMembersModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[rgba(62,74,137,0.08)] dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-[#4A5578] dark:text-[#9BA6D3] hover:bg-slate-200 transition-colors"
            >
              <Users size={14} />
              {channel.memberCount}
            </button>
          )}

          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            onClick={onOpenSearch}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C859E] dark:text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800 transition-colors"
            title="Search messages"
          >
            <Search size={16} />
          </motion.button>

          {/* Meet button → opens StartMeetCard lobby */}
          <button
            onClick={() => setStartMeetOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors bg-[#3E4A89] hover:bg-[#2A3568]"
            title="Start or join a meeting"
          >
            <Video size={14} />
            Meet
          </button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            onClick={onToggleAI}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${aiPanelOpen ? 'bg-blue-600 text-white' : 'text-[#7C859E] dark:text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800'}`}
            title="AI Copilot"
          >
            <Bot size={16} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            onClick={onToggleNotepad}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${notepadOpen ? 'bg-[#3E4A89] text-white' : 'text-[#7C859E] dark:text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800'}`}
            title="Notepad"
          >
            <FileText size={16} />
          </motion.button>

          {onOpenWiki && (
            <button
              onClick={onOpenWiki}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C859E] dark:text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800 hover:text-[#3E4A89] transition-colors"
              title="Wiki / Knowledge base"
            >
              <BookOpen size={16} />
            </button>
          )}

          {onOpenKanban && (
            <button
              onClick={onOpenKanban}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C859E] dark:text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800 hover:text-orange-600 transition-colors"
              title="Kanban board"
            >
              <LayoutGrid size={16} />
            </button>
          )}

          {onToggleActivity && (
            <button
              onClick={onToggleActivity}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${activityPanelOpen ? 'bg-emerald-600 text-white' : 'text-[#7C859E] dark:text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800'}`}
              title="Activity"
            >
              <Activity size={16} />
            </button>
          )}

          {onOpenBookmarks && (
            <button
              onClick={onOpenBookmarks}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C859E] dark:text-[#7C859E] hover:bg-amber-100 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors"
              title="Saved messages"
            >
              <Bookmark size={16} />
            </button>
          )}

          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C859E] dark:text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800 hover:text-emerald-600 transition-colors"
              title="Analytics"
            >
              <BarChart2 size={16} />
            </button>
          )}
        </div>
      </header>

      {/* ── Pinned messages strip ──────────────────────────────────── */}
      {pinnedIds.length > 0 && !activeThreadId && (
        <div className="border-b border-amber-100 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-800/30 px-4 py-2">
          <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-[#7C859E]">
            <Pin size={11} />
            <span className="font-bold">
              {pinnedIds.length} pinned message{pinnedIds.length > 1 ? 's' : ''}
            </span>
            <span className="text-amber-500">·</span>
            <span className="truncate">
              {allMessages
                .find((m) => m.id === pinnedIds[pinnedIds.length - 1])
                ?.text?.slice(0, 60) ?? ''}
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
          <div className="shrink-0 border-t border-[rgba(62,74,137,0.08)] /50 bg-white/70 dark:bg-[rgba(25,30,47,0.70)] backdrop-blur-md">
            <div className="max-w-4xl mx-auto px-4">
              <MessageInput channelId={channel.id} channelName={channel.name} />
            </div>
          </div>
        </div>

        {/* Thread panel */}
        {activeThreadId && threadRoot && (
          <div className="w-80 shrink-0 border-l border-[rgba(62,74,137,0.12)]  flex flex-col bg-white dark:bg-[#191E2F]">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.12)]  px-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-indigo-500" />
                <span className="text-sm font-bold text-[#1E2636]">Thread</span>
              </div>
              <button
                onClick={() => setActiveThread(null)}
                className="rounded-lg p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] dark:hover:bg-slate-800 hover:text-[#4A5578]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <MessageFeed channelId={channel.id} parentId={activeThreadId} />
            </div>
            <div className="shrink-0 border-t border-[rgba(62,74,137,0.12)]  p-3">
              <MessageInput
                channelId={channel.id}
                channelName={channel.name}
                replyToId={activeThreadId}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Members modal ──────────────────────────────────────────── */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(25,30,47,0.55)] p-4 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] shadow-2xl  dark:bg-[#191E2F]">
            <div className="border-b border-[rgba(62,74,137,0.12)]  bg-gradient-to-r from-slate-900 to-indigo-900 px-6 py-4 text-white">
              <h2 className="text-base font-black">
                {channel.id.startsWith('member-')
                  ? members.find((m) => m.id === channel.id)?.name ?? 'Direct Message'
                  : `#${channel.name} Members`}
              </h2>
              <p className="mt-0.5 text-xs text-[#9BA6D3]">{channel.memberCount} members</p>
            </div>
            <div className="border-b border-[rgba(62,74,137,0.12)]  px-4 py-3">
              <input
                type="text"
                placeholder="Search members…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full rounded-xl border border-[rgba(62,74,137,0.12)]  bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-[rgba(62,74,137,0.06)] dark:hover:bg-slate-800"
                >
                  <div
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.initials}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${member.status === 'online' ? 'bg-emerald-500' : member.status === 'away' ? 'bg-amber-400' : member.status === 'in-meeting' ? 'bg-red-400' : 'bg-slate-300'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1E2636]">{member.name}</p>
                    <p className="text-xs text-[#7C859E] dark:text-[#7C859E]">{member.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.onLeave ? (
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 rounded-md px-1.5 py-0.5">
                        On Leave
                      </span>
                    ) : member.isAvailable ? (
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md px-1.5 py-0.5">
                        Available
                      </span>
                    ) : null}
                    <span
                      className={`text-[10px] font-bold capitalize ${member.status === 'online' ? 'text-emerald-600' : member.status === 'away' ? 'text-amber-500' : member.status === 'in-meeting' ? 'text-red-500' : 'text-[#7C859E]'}`}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[rgba(62,74,137,0.12)]  bg-[#FAF8F5] dark:bg-slate-800 px-4 py-3">
              <button
                onClick={() => {
                  setShowMembersModal(false);
                  setMemberSearch('');
                }}
                className="w-full rounded-xl bg-[#191E2F] dark:bg-[#3E4A89] py-2 text-sm font-bold text-white hover:bg-slate-800 dark:hover:bg-[#2A3568] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Start Meet Card lobby ──────────────────────────────────────── */}
      {startMeetOpen && (
        <StartMeetCard
          channelName={channel.name}
          onClose={() => setStartMeetOpen(false)}
          meetLink={meetingState.link}
          onJoinGoogleMeet={() => {
            if (meetingState.link) window.open(meetingState.link, '_blank');
            else toast.info(meetingState.message);
          }}
          onStartVideoCall={
            onOpenVideoCall
              ? () => {
                  setStartMeetOpen(false);
                  onOpenVideoCall!();
                }
              : undefined
          }
          participants={members.slice(0, 4).map((m) => ({
            name: m.name,
            initials: m.initials,
            color: m.color,
          }))}
        />
      )}
    </div>
  );
}
