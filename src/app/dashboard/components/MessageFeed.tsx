'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboardStore } from '@/store/dashboardStore';
import { MESSAGES_BY_CHANNEL } from '@/data/mockData';

interface MessageFeedProps {
  channelId: string;
}

interface MessageState {
  reactions: Record<string, string[]>;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🔥', '👀', '✅'];

export default function MessageFeed({ channelId }: MessageFeedProps) {
  const messages = useDashboardStore((s) => s.messages[channelId]) ?? MESSAGES_BY_CHANNEL[channelId] ?? [];
  const deleteMessage = useDashboardStore((s) => s.deleteMessage);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messageStates, setMessageStates] = useState<Record<string, MessageState>>({});
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    try {
      const auth = localStorage.getItem('edutechex_token');
      if (auth) {
        const { user } = JSON.parse(auth);
        setCurrentUser(user || null);
      }
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const getMessageState = (id: string): MessageState => {
    return messageStates[id] ?? { reactions: {} };
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setMessageStates((prev) => {
      const state = prev[msgId] ?? { reactions: {} };
      const currentReactions = state.reactions[emoji] ?? [];
      const userEmail = currentUser?.email || '';

      const updated = {
        ...state,
        reactions: {
          ...state.reactions,
          [emoji]: currentReactions.includes(userEmail)
            ? currentReactions.filter((e) => e !== userEmail)
            : [...currentReactions, userEmail],
        },
      };

      // Clean up empty reactions
      Object.keys(updated.reactions).forEach((key) => {
        if (updated.reactions[key].length === 0) {
          delete updated.reactions[key];
        }
      });

      return { ...prev, [msgId]: updated };
    });
    setActiveEmojiPicker(null);
  };

  const handleDelete = (msgId: string, sender: string) => {
    if (sender !== currentUser?.name) {
      toast.error('You can only delete your own messages');
      return;
    }
    deleteMessage(channelId, msgId);
    toast.success('Message deleted');
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">💬</div>
          <p className="font-semibold text-slate-900">Start the conversation</p>
          <p className="mt-1 text-sm text-slate-500">Send a message to begin</p>
        </div>
      </div>
    );
  }

  // Group messages by sender and date
  const grouped = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const isFirst = i === 0 || prev?.sender !== msg.sender || 
                    new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime() > 5 * 60 * 1000;
    const showDate = i === 0 || new Date(msg.timestamp).toDateString() !== new Date(prev?.timestamp).toDateString();
    
    return { ...msg, isFirst, showDate, dateLabel: showDate ? formatDate(msg.timestamp) : undefined };
  });

  return (
    <div className="space-y-0">
      {grouped.map((msg) => {
        const state = getMessageState(msg.id);
        const hasReactions = Object.keys(state.reactions).length > 0;
        const isMyMessage = msg.sender === currentUser?.name;

        return (
          <React.Fragment key={msg.id}>
            {msg.showDate && (
              <div className="my-6 flex items-center gap-3 px-4">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-semibold text-slate-400 uppercase">{msg.dateLabel}</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
            )}

            <div className={`group relative flex gap-3 px-4 py-2 hover:bg-slate-50/50 transition-colors ${msg.isFirst ? '' : 'mt-0.5'}`}>
              {/* Avatar */}
              {msg.isFirst ? (
                <div
                  className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: msg.color }}
                >
                  {msg.initials}
                </div>
              ) : (
                <div className="mt-1 h-9 w-9 shrink-0" />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                {msg.isFirst && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate-900">{msg.sender}</span>
                    <span className="text-xs text-slate-400">{formatTime(msg.timestamp)}</span>
                  </div>
                )}

                <p className="mt-1 text-sm text-slate-700 break-words">{msg.text}</p>

                {/* Audio message */}
                {msg.audioUrl && (
                  <div className="mt-2 max-w-xs">
                    <audio className="w-full h-10 rounded-lg" controls src={msg.audioUrl}>
                      <track kind="captions" />
                    </audio>
                    <span className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voice note</span>
                  </div>
                )}

                {/* Video message */}
                {msg.videoUrl && (
                  <div className="mt-2 max-w-md">
                    <video
                      className="w-full rounded-xl border border-slate-200 bg-black shadow-sm"
                      controls
                      src={msg.videoUrl}
                    >
                      <track kind="captions" />
                    </video>
                    <span className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screen recording</span>
                  </div>
                )}

                {/* File attachments */}
                {msg.files && msg.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.files.map((file, fi) => (
                      <a
                        key={fi}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                      >
                        <Paperclip size={12} />
                        {file.name}
                      </a>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                {hasReactions && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(state.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(msg.id, emoji)}
                        className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200 transition-colors"
                      >
                        <span>{emoji}</span>
                        {users.length > 0 && <span className="text-slate-600">{users.length}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="absolute right-3 top-1 hidden flex-shrink-0 gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg group-hover:flex">
                <div className="relative">
                  <button
                    onClick={() => setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id)}
                    className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-slate-100 transition-colors"
                    title="React"
                  >
                    +
                  </button>
                  {activeEmojiPicker === msg.id && (
                    <div className="absolute top-full right-0 mt-1 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-10">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className="flex h-7 w-7 items-center justify-center text-lg hover:bg-slate-100 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isMyMessage && (
                  <button
                    onClick={() => handleDelete(msg.id, msg.sender)}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
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
