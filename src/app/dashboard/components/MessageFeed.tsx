'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Paperclip, Pencil, Check, X, Pin, Bookmark, MessageSquare, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboardStore } from '@/store/dashboardStore';
import { MESSAGES_BY_CHANNEL } from '@/data/mockData';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageFeedProps {
  channelId: string;
  parentId?: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🔥', '👀', '✅', '🎉', '💯'];

function PollCard({ msg, channelId, userEmail }: { msg: any; channelId: string; userEmail: string }) {
  const votePoll = useDashboardStore((s) => s.votePoll);
  const poll = msg.poll;
  const totalVotes = poll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
  return (
    <div className="mt-2 max-w-sm rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-bold text-slate-900">📊 {poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((opt: any, i: number) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          const voted = opt.votes.includes(userEmail);
          return (
            <button key={i} onClick={() => votePoll(channelId, msg.id, i, userEmail)}
              className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition-all ${voted ? 'border-indigo-400 bg-indigo-50 font-bold text-indigo-700' : 'border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-slate-50'}`}>
              <div className="absolute inset-y-0 left-0 rounded-l-xl bg-indigo-100/60 transition-all" style={{ width: `${pct}%` }} />
              <span className="relative flex items-center justify-between">
                <span>{opt.text}</span>
                <span className="text-xs font-bold text-slate-400">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    </div>
  );
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0 text-sm leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children, className }) => {
          const isBlock = String(className).includes('language-');
          return isBlock ? (
            <pre className="my-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-green-400"><code>{children}</code></pre>
          ) : (
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-indigo-700">{children}</code>
          );
        },
        ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5 text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5 text-sm">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <h1 className="mb-1 text-base font-black text-slate-900">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1 text-sm font-black text-slate-900">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 text-sm font-bold text-slate-800">{children}</h3>,
        blockquote: ({ children }) => <blockquote className="my-1 border-l-4 border-indigo-300 pl-3 italic text-slate-600 text-sm">{children}</blockquote>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-indigo-600 underline hover:text-indigo-800">{children}</a>,
      }}>
      {text}
    </ReactMarkdown>
  );
}

function MeetingCard({ text }: { text: string }) {
  const title = text.match(/Meeting Scheduled:\s*(.+)/)?.[1]?.trim() ?? 'Team meeting';
  const time = text.match(/Time:\s*(.+)/)?.[1]?.trim() ?? '';
  const people = text.match(/Mentioned people:\s*(.+)/)?.[1]?.trim() ?? '';
  const link = text.match(/Join Link:\s*(https?:\/\/\S+)/)?.[1]?.trim() ?? '';
  if (!link) return <MarkdownContent text={text} />;
  return (
    <div className="mt-2 max-w-sm rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">📅 Meeting Scheduled</p>
      <p className="mt-1 font-black text-slate-900">{title}</p>
      {time && <p className="mt-1 text-xs text-slate-600">🕐 {time}</p>}
      {people && <p className="mt-0.5 text-xs text-slate-600">👥 {people}</p>}
      <a href={link} target="_blank" rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-colors">
        Join Meeting →
      </a>
    </div>
  );
}

export default function MessageFeed({ channelId, parentId }: MessageFeedProps) {
  const allMessages = useDashboardStore((s) => s.messages[channelId]) ?? MESSAGES_BY_CHANNEL[channelId] ?? [];
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

  const messages = parentId
    ? allMessages.filter((m) => m.parentId === parentId || m.id === parentId)
    : allMessages.filter((m) => !m.parentId);

  useEffect(() => {
    try {
      const auth = localStorage.getItem('edutechex_token');
      if (auth) { const { user } = JSON.parse(auth); setCurrentUser(user || null); }
    } catch { /* */ }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  useEffect(() => {
    if (!activeEmojiPicker) return;
    const h = (e: MouseEvent) => { if (!(e.target as Element).closest('[data-emoji-picker]')) setActiveEmojiPicker(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [activeEmojiPicker]);

  const userEmail = currentUser?.email ?? '';
  const isAdmin = currentUser?.name === 'Admin';

  const handleDelete = (msgId: string, sender: string) => {
    if (sender !== currentUser?.name && !isAdmin) { toast.error('You can only delete your own messages'); return; }
    deleteMessage(channelId, msgId);
    toast.success('Message deleted');
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim()) return;
    editMessage(channelId, editingId, editText.trim());
    setEditingId(null); setEditText('');
    toast.success('Message updated');
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso), today = new Date(), yest = new Date(today);
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
          <p className="font-bold text-slate-700 dark:text-slate-200">Start the conversation</p>
          <p className="mt-1 text-sm text-slate-400">Send a message to begin</p>
        </div>
      </div>
    );
  }

  const grouped = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const isFirst = i === 0 || prev?.sender !== msg.sender || new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime() > 5 * 60 * 1000;
    const showDate = i === 0 || new Date(msg.timestamp).toDateString() !== new Date(prev?.timestamp).toDateString();
    return { ...msg, isFirst, showDate, dateLabel: showDate ? formatDate(msg.timestamp) : undefined };
  });

  const replyCount = (msgId: string) => allMessages.filter((m) => m.parentId === msgId).length;

  return (
    <div className="space-y-0 pb-4">
      {grouped.map((msg) => {
        const isPinned = pinnedIds.includes(msg.id);
        const isBookmarked = bookmarkedIds.includes(msg.id);
        const isMyMsg = msg.sender === currentUser?.name;
        const isMeeting = msg.text?.startsWith('Meeting Scheduled:');
        const replies = !parentId ? replyCount(msg.id) : 0;

        return (
          <React.Fragment key={msg.id}>
            {msg.showDate && (
              <div className="my-6 flex items-center gap-3 px-4">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
                <span className="text-xs font-semibold uppercase text-slate-400">{msg.dateLabel}</span>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
              </div>
            )}

            {isPinned && (
              <div className="mx-4 mb-0.5 flex items-center gap-1 text-[10px] font-bold text-amber-600">
                <Pin size={10} /> Pinned
              </div>
            )}

            <div className={`group relative flex gap-3 px-4 py-1.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${isPinned ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
              {msg.isFirst ? (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm" style={{ backgroundColor: msg.color }}>
                  {msg.initials}
                </div>
              ) : (
                <div className="h-9 w-9 shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                {msg.isFirst && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{msg.sender}</span>
                    <span className="text-xs text-slate-400">{formatTime(msg.timestamp)}</span>
                    {msg.editedAt && <span className="text-[10px] italic text-slate-400">(edited)</span>}
                  </div>
                )}

                {editingId === msg.id ? (
                  <div className="mt-1 flex gap-2">
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
                      className="flex-1 resize-none rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                      rows={2} autoFocus />
                    <div className="flex flex-col gap-1">
                      <button onClick={saveEdit} className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700"><Check size={14} /></button>
                      <button onClick={() => { setEditingId(null); setEditText(''); }} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"><X size={14} /></button>
                    </div>
                  </div>
                ) : isMeeting ? (
                  <MeetingCard text={msg.text} />
                ) : (
                  <div className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                    <MarkdownContent text={msg.text ?? ''} />
                  </div>
                )}

                {msg.poll && <PollCard msg={msg} channelId={channelId} userEmail={userEmail} />}

                {msg.audioUrl && (
                  <div className="mt-2 max-w-xs rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <audio className="w-full" controls src={msg.audioUrl}><track kind="captions" /></audio>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Voice note</p>
                  </div>
                )}

                {msg.videoUrl && (
                  <div className="mt-2 max-w-md">
                    <video className="w-full rounded-2xl border border-slate-200 bg-black shadow-sm" controls src={msg.videoUrl}><track kind="captions" /></video>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Camera recording</p>
                  </div>
                )}

                {msg.files && msg.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.files.map((file: any, fi: number) => (
                      <a key={fi} href={file.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600">
                        <Paperclip size={12} />{file.name}
                      </a>
                    ))}
                  </div>
                )}

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) =>
                      users.length > 0 ? (
                        <button key={emoji} onClick={() => toggleReaction(channelId, msg.id, emoji, userEmail)}
                          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all ${users.includes(userEmail) ? 'border-indigo-200 bg-indigo-100 font-bold text-indigo-700' : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          <span>{emoji}</span><span>{users.length}</span>
                        </button>
                      ) : null
                    )}
                  </div>
                )}

                {replies > 0 && (
                  <button onClick={() => setActiveThread(msg.id)}
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                    <MessageSquare size={12} />{replies} {replies === 1 ? 'reply' : 'replies'}<ChevronDown size={12} />
                  </button>
                )}
              </div>

              {/* Action bar */}
              <div className="absolute right-3 top-1 hidden items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg group-hover:flex dark:border-slate-700 dark:bg-slate-800">
                <div className="relative" data-emoji-picker>
                  <button onClick={() => setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-base hover:bg-slate-100 dark:hover:bg-slate-700" title="React">
                    😊
                  </button>
                  {activeEmojiPicker === msg.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800" data-emoji-picker>
                      {EMOJI_OPTIONS.map((em) => (
                        <button key={em} onClick={() => { toggleReaction(channelId, msg.id, em, userEmail); setActiveEmojiPicker(null); }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-lg transition-all hover:scale-110 hover:bg-slate-100 dark:hover:bg-slate-700">
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!parentId && (
                  <button onClick={() => setActiveThread(msg.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700" title="Reply in thread">
                    <MessageSquare size={14} />
                  </button>
                )}

                <button onClick={() => { toggleBookmark(msg.id); toast.success(isBookmarked ? 'Removed from saved' : 'Message saved!'); }}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${isBookmarked ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
                  title={isBookmarked ? 'Remove from saved' : 'Save message'}>
                  <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
                </button>

                <button onClick={() => { isPinned ? unpinMessage(channelId, msg.id) : pinMessage(channelId, msg.id); toast.success(isPinned ? 'Unpinned' : 'Message pinned!'); }}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${isPinned ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
                  title={isPinned ? 'Unpin' : 'Pin message'}>
                  <Pin size={14} />
                </button>

                {isMyMsg && !msg.poll && (
                  <button onClick={() => { setEditingId(msg.id); setEditText(msg.text ?? ''); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700" title="Edit">
                    <Pencil size={14} />
                  </button>
                )}

                {(isMyMsg || isAdmin) && (
                  <button onClick={() => handleDelete(msg.id, msg.sender)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="Delete">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
