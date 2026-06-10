'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Trash2,
  Paperclip,
  Pencil,
  Check,
  X,
  Pin,
  Bookmark,
  MessageSquare,
  ChevronDown,
  Share2,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDashboardStore } from '@/store/dashboardStore';
import { MESSAGES_BY_CHANNEL } from '@/data/mockData';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageFeedProps {
  channelId: string;
  parentId?: string;
}

const EMOJI_OPTIONS = [
  '👍', // 👍
  '❤️', // ❤️
  '😂', // 😂
  '🔥', // 🔥
  '👀', // 👀
  '✅', // ✅
  '🎉', // 🎉
  '💯', // 💯
];

function PollCard({
  msg,
  channelId,
  userEmail,
}: {
  msg: any;
  channelId: string;
  userEmail: string;
}) {
  const votePoll = useDashboardStore((s) => s.votePoll);
  const poll = msg.poll;
  const totalVotes = poll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
  return (
    <div className="mt-2 w-64 rounded-2xl border border-[rgba(62,74,137,0.10)] bg-white dark:bg-slate-800  p-4 shadow-sm">
      <p className="mb-3 text-sm font-bold text-[#1E2636]">📊 {poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((opt: any, i: number) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          const voted = opt.votes.includes(userEmail);
          return (
            <button
              key={i}
              onClick={() => votePoll(channelId, msg.id, i, userEmail)}
              className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition-all ${voted ? 'border-indigo-400 bg-[rgba(62,74,137,0.08)] font-bold text-[#3E4A89]' : 'border-[rgba(62,74,137,0.12)] text-[#4A5578] hover:border-[rgba(62,74,137,0.15)] hover:bg-[rgba(62,74,137,0.06)] dark:border-slate-600 dark:text-[#9BA6D3]'}`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-l-xl bg-indigo-100/60 transition-all"
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex items-center justify-between">
                <span>{opt.text}</span>
                <span className="text-xs font-bold text-[#7C859E]">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[#7C859E]">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// Wrap @Name tokens in markdown bold; @here/@channel get bold+italic to stand out
function applyMentionBold(text: string): string {
  return text.replace(/@([A-Za-z][^\s@,!?\n]*)/g, (_, name) => {
    if (/^(here|channel)$/i.test(name)) return `***@${name}***`;
    return `**@${name}**`;
  });
}

function MarkdownContent({ text, isOwn }: { text: string; isOwn: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-1 last:mb-0 text-[15px] leading-relaxed">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className={`font-black ${isOwn ? 'text-white' : 'text-[#0a0f1e]'}`}>
            {children}
          </strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children, className }) => {
          const isBlock = String(className).includes('language-');
          return isBlock ? (
            <pre className="my-2 overflow-x-auto rounded-xl bg-black/20 p-3 text-sm text-[#C4CAE0]">
              <code>{children}</code>
            </pre>
          ) : (
            <code
              className={`rounded-md px-1.5 py-0.5 font-mono text-sm ${isOwn ? 'bg-white/20 text-white' : 'bg-[rgba(62,74,137,0.08)] dark:bg-slate-700 text-[#3E4A89] dark:text-indigo-300'}`}
            >
              {children}
            </code>
          );
        },
        ul: ({ children }) => (
          <ul className="my-1 ml-4 list-disc space-y-0.5 text-[15px]">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1 ml-4 list-decimal space-y-0.5 text-[15px]">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <h1 className="mb-1 text-base font-black">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1 text-sm font-black">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 text-sm font-bold">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote
            className={`my-1 border-l-4 pl-3 italic text-sm ${isOwn ? 'border-white/40 text-white/80' : 'border-[rgba(62,74,137,0.25)] text-[#4A5578]'}`}
          >
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`underline ${isOwn ? 'text-white/90' : 'text-[#3E4A89]'}`}
          >
            {children}
          </a>
        ),
      }}
    >
      {applyMentionBold(text)}
    </ReactMarkdown>
  );
}

function MeetingCard({ text }: { text: string }) {
  const title = text.match(/Meeting Scheduled:\s*(.+)/)?.[1]?.trim() ?? 'Team meeting';
  const time = text.match(/Time:\s*(.+)/)?.[1]?.trim() ?? '';
  const people = text.match(/Mentioned people:\s*(.+)/)?.[1]?.trim() ?? '';
  const link = text.match(/Join Link:\s*(https?:\/\/\S+)/)?.[1]?.trim() ?? '';
  if (!link) return <MarkdownContent text={text} isOwn={false} />;
  return (
    <div className="min-w-[220px] max-w-xs rounded-2xl border border-[rgba(62,74,137,0.15)] bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-600 p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
        📅 Meeting Scheduled
      </p>
      <p className="mt-1 font-black text-[#1E2636]">{title}</p>
      {time && <p className="mt-1 text-sm text-[#4A5578] dark:text-[#7C859E]">🕐 {time}</p>}
      {people && <p className="mt-0.5 text-sm text-[#4A5578] dark:text-[#7C859E]">👥 {people}</p>}
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#3E4A89] px-3 py-2 text-sm font-black text-white hover:bg-[#2A3568] transition-colors"
      >
        Join Meeting →
      </a>
    </div>
  );
}

/* ── Forward Modal ───────────────────────────────────────────────────────── */
interface FwdMsg {
  id: string;
  text: string;
  sender: string;
}

function ForwardModal({
  msg,
  sourceChannelId,
  onClose,
}: {
  msg: FwdMsg;
  sourceChannelId: string;
  onClose: () => void;
}) {
  const channels = useDashboardStore((s) => s.channels);
  const members = useDashboardStore((s) => s.members);
  const addMessage = useDashboardStore((s) => s.addMessage);
  const [query, setQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    initials: string;
    color: string;
  } | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('edutechex_token');
      if (raw) {
        const { user } = JSON.parse(raw);
        if (user) {
          setCurrentUser(user);
          const m = members.find((mb) => mb.email?.toLowerCase() === user.email?.toLowerCase());
          if (m) setCurrentMemberId(m.id);
        }
      }
    } catch {
      /* */
    }
  }, [members]);

  const sourceChannel = channels.find((c) => c.id === sourceChannelId);
  const sourceName = sourceChannel?.id.startsWith('member-')
    ? 'DM'
    : `#${sourceChannel?.name ?? sourceChannelId}`;

  const wsChannels = channels.filter(
    (c) => !c.id.startsWith('member-') && c.id !== sourceChannelId
  );
  const dmMembers = members.filter((m) => m.id !== currentMemberId);

  const q = query.toLowerCase();
  const filteredWS = wsChannels.filter((c) => c.name.toLowerCase().includes(q));
  const filteredDMs = dmMembers.filter((m) => m.name.toLowerCase().includes(q));

  function doForward(targetId: string, targetLabel: string) {
    const preview = msg.text.length > 300 ? msg.text.slice(0, 300) + '…' : msg.text;
    const quoted = preview.replace(/\n/g, '\n> ');
    const text = `↪ Forwarded from **${sourceName}** · *${msg.sender}:*\n> ${quoted}`;
    addMessage(targetId, {
      id: `msg-${Date.now()}`,
      sender: currentUser?.name ?? 'You',
      initials: currentUser?.initials ?? 'Y',
      color: currentUser?.color ?? '#64748b',
      timestamp: new Date().toISOString(),
      text,
    });
    toast.success(`Forwarded to ${targetLabel}`);
    onClose();
  }

  function forwardToChannel(ch: { id: string; name: string }) {
    doForward(ch.id, `#${ch.name}`);
  }

  function forwardToDM(member: { id: string; name: string }) {
    const sorted = [member.id, currentMemberId].sort();
    const dmId = `dm-${sorted[0]}-${sorted[1]}`;
    doForward(dmId, member.name);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] dark:bg-[#191E2F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(62,74,137,0.08)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Share2 size={15} className="text-[#3E4A89]" />
            <h3 className="font-bold text-[#1E2636] dark:text-white">Forward message</h3>
          </div>
          <button onClick={onClose} className="text-[#7C859E] hover:text-[#4A5578]">
            <X size={16} />
          </button>
        </div>
        {/* Preview */}
        <div className="border-b border-[rgba(62,74,137,0.08)] bg-[rgba(62,74,137,0.04)] px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#7C859E]">
            From {sourceName}
          </p>
          <p className="line-clamp-2 text-sm text-[#4A5578] dark:text-[#9BA6D3] italic">
            &quot;{msg.text.slice(0, 120)}
            {msg.text.length > 120 ? '…' : ''}&quot;
          </p>
        </div>
        {/* Search */}
        <div className="border-b border-[rgba(62,74,137,0.08)] px-4 py-2">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels or people…"
            className="w-full rounded-xl border border-[rgba(62,74,137,0.12)] bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:text-white dark:placeholder-slate-500"
          />
        </div>
        {/* List */}
        <div className="max-h-60 overflow-y-auto">
          {filteredWS.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-[#7C859E]">
                Channels
              </p>
              {filteredWS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => forwardToChannel(ch)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(62,74,137,0.06)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                    <Hash size={14} className="text-[#3E4A89]" />
                  </div>
                  <span className="text-sm font-semibold text-[#1E2636] dark:text-white">
                    {ch.name}
                  </span>
                </button>
              ))}
            </>
          )}
          {filteredDMs.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-[#7C859E]">
                Direct Messages
              </p>
              {filteredDMs.map((m) => (
                <button
                  key={m.id}
                  onClick={() => forwardToDM(m)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(62,74,137,0.06)]"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: (m as any).color ?? '#64748b' }}
                  >
                    {(m as any).initials ?? m.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1E2636] dark:text-white">{m.name}</p>
                    <p className="text-xs text-[#7C859E]">{(m as any).role}</p>
                  </div>
                </button>
              ))}
            </>
          )}
          {filteredWS.length === 0 && filteredDMs.length === 0 && (
            <p className="py-8 text-center text-sm text-[#7C859E]">
              No results for &quot;{query}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessageFeed({ channelId, parentId }: MessageFeedProps) {
  const allMessages =
    useDashboardStore((s) => s.messages[channelId]) ?? MESSAGES_BY_CHANNEL[channelId] ?? [];
  const deleteMessage = useDashboardStore((s) => s.deleteMessage);
  const editMessage = useDashboardStore((s) => s.editMessage);
  const toggleReaction = useDashboardStore((s) => s.toggleReaction);
  const pinMessage = useDashboardStore((s) => s.pinMessage);
  const unpinMessage = useDashboardStore((s) => s.unpinMessage);
  const pinnedIds = useDashboardStore((s) => s.pinnedMessageIds[channelId] ?? []);
  const toggleBookmark = useDashboardStore((s) => s.toggleBookmark);
  const bookmarkedIds = useDashboardStore((s) => s.bookmarkedMessageIds);
  const setActiveThread = useDashboardStore((s) => s.setActiveThread);

  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<FwdMsg | null>(null);

  const messages = parentId
    ? allMessages.filter((m) => m.parentId === parentId || m.id === parentId)
    : allMessages.filter((m) => !m.parentId);

  useEffect(() => {
    try {
      const auth = localStorage.getItem('edutechex_token');
      if (auth) {
        const { user } = JSON.parse(auth);
        setCurrentUser(user || null);
      }
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!activeEmojiPicker) return;
    const h = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-emoji-picker]')) setActiveEmojiPicker(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [activeEmojiPicker]);

  const userEmail = currentUser?.email ?? '';
  const isAdmin = currentUser?.name === 'Admin';

  const handleDelete = (msgId: string, sender: string) => {
    if (sender !== currentUser?.name && !isAdmin) {
      toast.error('You can only delete your own messages');
      return;
    }
    deleteMessage(channelId, msgId);
    toast.success('Message deleted');
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim()) return;
    editMessage(channelId, editingId, editText.trim());
    setEditingId(null);
    setEditText('');
    toast.success('Message updated');
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso),
      today = new Date(),
      yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <div className="text-center">
          <div className="mb-3 text-4xl">💬</div>
          <p className="font-bold text-[#4A5578]">Start the conversation</p>
          <p className="mt-1 text-sm text-[#7C859E]">Send a message to begin</p>
        </div>
      </div>
    );
  }

  const grouped = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const isFirst =
      i === 0 ||
      prev?.sender !== msg.sender ||
      new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime() > 5 * 60 * 1000;
    const isLast =
      i === messages.length - 1 ||
      next?.sender !== msg.sender ||
      new Date(next.timestamp).getTime() - new Date(msg.timestamp).getTime() > 5 * 60 * 1000;
    const showDate =
      i === 0 ||
      new Date(msg.timestamp).toDateString() !== new Date(prev?.timestamp).toDateString();
    return {
      ...msg,
      isFirst,
      isLast,
      showDate,
      dateLabel: showDate ? formatDate(msg.timestamp) : undefined,
    };
  });

  const replyCount = (msgId: string) => allMessages.filter((m) => m.parentId === msgId).length;

  return (
    <div className="flex flex-col gap-0 pb-4 px-3">
      {grouped.map((msg) => {
        const isPinned = pinnedIds.includes(msg.id);
        const isBookmarked = bookmarkedIds.includes(msg.id);
        const isOwn = msg.sender === currentUser?.name;
        const isMeeting = msg.text?.startsWith('Meeting Scheduled:');
        const replies = !parentId ? replyCount(msg.id) : 0;

        return (
          <React.Fragment key={msg.id}>
            {/* Date divider */}
            {msg.showDate && (
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="rounded-full bg-[rgba(62,74,137,0.08)] dark:bg-slate-800 px-3 py-1 text-[12px] font-semibold text-[#7C859E] dark:text-[#7C859E]">
                  {msg.dateLabel}
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
            )}

            {/* Pinned indicator */}
            {isPinned && (
              <div
                className={`mb-0.5 flex items-center gap-1 text-[11px] font-bold text-amber-600 ${isOwn ? 'justify-start pl-10' : 'justify-end pr-1'}`}
              >
                <Pin size={10} /> Pinned
              </div>
            )}

            {/* Message row */}
            <div
              className={`group flex items-end gap-2 ${msg.isFirst ? 'mt-3 mb-0' : 'mt-0.5 mb-0'} ${isOwn ? 'flex-row' : 'flex-row-reverse'}`}
            >
              {/* Avatar — only show for first in group, on receiver (right) side */}
              {!isOwn && (
                <div className="mb-1 shrink-0">
                  {msg.isFirst ? (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: msg.color }}
                    >
                      {msg.initials}
                    </div>
                  ) : (
                    <div className="h-8 w-8" />
                  )}
                </div>
              )}

              {/* Bubble column */}
              <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-start' : 'items-end'}`}>
                {/* Sender name (only for first in group, receiver side) */}
                {msg.isFirst && !isOwn && (
                  <span className="mb-1 mr-1 text-[14px] font-bold" style={{ color: msg.color }}>
                    {msg.sender}
                  </span>
                )}

                {/* Soft-deleted placeholder (WhatsApp style) */}
                {msg.isDeleted ? (
                  <div
                    className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-[13px] italic shadow-sm
                    ${
                      isOwn
                        ? 'bg-[#3E4A89]/60 text-indigo-100'
                        : 'bg-white dark:bg-slate-800 border border-[rgba(62,74,137,0.08)]  text-[#7C859E] dark:text-[#7C859E]'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-60"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    This message was deleted
                  </div>
                ) : editingId === msg.id ? (
                  <div className="flex gap-2 w-full">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditText('');
                        }
                      }}
                      className="flex-1 resize-none rounded-2xl border border-[rgba(62,74,137,0.25)] bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={saveEdit}
                        className="rounded-xl bg-[#3E4A89] p-1.5 text-white hover:bg-[#2A3568]"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                        className="rounded-xl border border-[rgba(62,74,137,0.12)] p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Main bubble */}
                    {!msg.poll && (
                      <div
                        className={`relative group/bubble rounded-2xl shadow-sm
                        ${
                          isMeeting
                            ? `p-0 bg-transparent border-0 overflow-hidden ${isPinned ? 'ring-2 ring-amber-400' : ''}`
                            : `px-3.5 py-2.5 ${
                                isOwn
                                  ? `bg-[#3E4A89] text-white ${msg.isLast ? 'rounded-bl-sm' : ''}`
                                  : `bg-white dark:bg-slate-800 text-[#1E2636] border border-[rgba(62,74,137,0.08)] ${msg.isLast ? 'rounded-br-sm' : ''}`
                              } ${isPinned ? 'ring-2 ring-amber-400' : ''}`
                        }
                      `}
                      >
                        {isMeeting ? (
                          <MeetingCard text={msg.text} />
                        ) : (
                          <div className={isOwn ? 'text-white' : 'text-[#1E2636]'}>
                            <MarkdownContent text={msg.text ?? ''} isOwn={isOwn} />
                          </div>
                        )}

                        {/* Audio — visible to all channel members */}
                        {msg.audioUrl && (
                          <div
                            className={`mt-2 rounded-xl p-2 ${isOwn ? 'bg-white/10' : 'bg-[#FAF8F5] dark:bg-slate-700'}`}
                          >
                            <audio className="w-full h-8" controls src={msg.audioUrl}>
                              <track kind="captions" />
                            </audio>
                            <p
                              className={`mt-1 text-[11px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}
                            >
                              🎤 Voice note
                            </p>
                          </div>
                        )}

                        {/* Video — visible to all channel members */}
                        {msg.videoUrl && (
                          <div className="mt-2 w-full max-w-xs">
                            <video
                              className="w-full rounded-xl bg-black"
                              controls
                              src={msg.videoUrl}
                            >
                              <track kind="captions" />
                            </video>
                            <p
                              className={`mt-1 text-[11px] font-bold uppercase tracking-wider ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}
                            >
                              🎥 Screen recording
                            </p>
                          </div>
                        )}

                        {/* Files */}
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {msg.files.map((file: any, fi: number) => (
                              <a
                                key={fi}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-sm font-bold transition-colors
                                  ${isOwn ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-[rgba(62,74,137,0.12)] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#4A5578] dark:text-[#9BA6D3] hover:border-[rgba(62,74,137,0.15)]'}`}
                              >
                                <Paperclip size={11} />
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Timestamp + edited */}
                        <div
                          className={`mt-1.5 flex items-center gap-1.5 justify-end text-[10px] ${isOwn ? 'text-white/60' : 'text-[#7C859E]'}`}
                        >
                          {msg.editedAt && <span className="italic">(edited)</span>}
                          <span>{formatTime(msg.timestamp)}</span>
                          {isOwn && (
                            <svg
                              width="16"
                              height="11"
                              viewBox="0 0 16 11"
                              className="text-white/70"
                              fill="currentColor"
                            >
                              <path d="M11.071.653a.75.75 0 0 1 .001 1.06l-5.78 5.79a.75.75 0 0 1-1.063 0L1.928 5.2a.75.75 0 1 1 1.062-1.059l1.769 1.77L10.01.653a.75.75 0 0 1 1.061 0z" />
                              <path
                                d="M15.071.653a.75.75 0 0 1 .001 1.06l-5.78 5.79a.75.75 0 0 1-.532.22.75.75 0 0 1-.532-1.28L13.01.653a.75.75 0 0 1 1.061 0z"
                                opacity="0.6"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Hover action bar inside bubble */}
                        <div
                          className={`absolute ${isOwn ? 'right-0 translate-x-full pl-2' : 'left-0 -translate-x-full pr-2'} top-0 hidden group-hover/bubble:flex items-center`}
                        >
                          <div className="flex items-center gap-0.5 rounded-xl border border-[rgba(62,74,137,0.12)]  bg-white dark:bg-slate-800 p-1 shadow-lg">
                            {/* Emoji reaction */}
                            <div className="relative" data-emoji-picker>
                              <button
                                onClick={() =>
                                  setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id)
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm hover:bg-[rgba(62,74,137,0.08)]"
                                title="React"
                              >
                                😊
                              </button>
                              {activeEmojiPicker === msg.id && (
                                <div
                                  className={`absolute top-full mt-1 z-[100] flex gap-1 rounded-xl border border-[rgba(62,74,137,0.12)]  bg-white dark:bg-slate-800 p-1.5 shadow-xl ${isOwn ? 'left-0' : 'right-0'}`}
                                  data-emoji-picker
                                >
                                  {EMOJI_OPTIONS.map((em) => (
                                    <button
                                      key={em}
                                      onClick={() => {
                                        toggleReaction(channelId, msg.id, em, userEmail);
                                        setActiveEmojiPicker(null);
                                      }}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg text-lg transition-all hover:scale-110 hover:bg-[rgba(62,74,137,0.08)]"
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {!parentId && (
                              <button
                                onClick={() => setActiveThread(msg.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#3E4A89]"
                                title="Reply in thread"
                              >
                                <MessageSquare size={13} />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                toggleBookmark(msg.id, {
                                  channelId,
                                  text: msg.text,
                                  sender: msg.sender,
                                  timestamp: msg.timestamp,
                                });
                                toast.success(
                                  isBookmarked ? 'Removed from saved' : 'Message saved!'
                                );
                              }}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(62,74,137,0.08)] ${isBookmarked ? 'text-amber-500' : 'text-[#7C859E] hover:text-amber-500'}`}
                              title={isBookmarked ? 'Remove from saved' : 'Save message'}
                            >
                              <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
                            </button>

                            <button
                              onClick={() => {
                                if (isPinned) {
                                  unpinMessage(channelId, msg.id);
                                } else {
                                  pinMessage(channelId, msg.id);
                                }
                                toast.success(isPinned ? 'Unpinned' : 'Message pinned!');
                              }}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(62,74,137,0.08)] ${isPinned ? 'text-amber-500' : 'text-[#7C859E] hover:text-amber-500'}`}
                              title={isPinned ? 'Unpin' : 'Pin message'}
                            >
                              <Pin size={13} />
                            </button>

                            {!msg.isDeleted && !msg.poll && (
                              <button
                                onClick={() =>
                                  setForwardingMsg({
                                    id: msg.id,
                                    text: msg.text ?? '',
                                    sender: msg.sender,
                                  })
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#3E4A89]"
                                title="Forward message"
                              >
                                <Share2 size={13} />
                              </button>
                            )}

                            {isOwn && !msg.poll && (
                              <button
                                onClick={() => {
                                  setEditingId(msg.id);
                                  setEditText(msg.text ?? '');
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#4A5578]"
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                            )}

                            {(isOwn || isAdmin) && (
                              <button
                                onClick={() => handleDelete(msg.id, msg.sender)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C859E] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Poll card (outside bubble) */}
                    {msg.poll && <PollCard msg={msg} channelId={channelId} userEmail={userEmail} />}
                  </>
                )}

                {/* Reactions */}
                {!msg.isDeleted && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div
                    className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-start' : 'justify-end'}`}
                  >
                    {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) =>
                      users.length > 0 ? (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(channelId, msg.id, emoji, userEmail)}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all
                            ${
                              users.includes(userEmail)
                                ? 'border-[rgba(62,74,137,0.15)] bg-indigo-100 dark:bg-indigo-900/40 font-bold text-[#3E4A89] dark:text-indigo-300'
                                : 'border-[rgba(62,74,137,0.12)]  bg-white dark:bg-slate-800 text-[#4A5578] dark:text-[#7C859E] hover:bg-[rgba(62,74,137,0.06)]'
                            }`}
                        >
                          <span>{emoji}</span>
                          <span>{users.length}</span>
                        </button>
                      ) : null
                    )}
                  </div>
                )}

                {/* Thread replies */}
                {replies > 0 && (
                  <button
                    onClick={() => setActiveThread(msg.id)}
                    className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#3E4A89] hover:text-indigo-800"
                  >
                    <MessageSquare size={12} />
                    {replies} {replies === 1 ? 'reply' : 'replies'}
                    <ChevronDown size={12} />
                  </button>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} className="h-1" />
      {forwardingMsg && (
        <ForwardModal
          msg={forwardingMsg}
          sourceChannelId={channelId}
          onClose={() => setForwardingMsg(null)}
        />
      )}
    </div>
  );
}
