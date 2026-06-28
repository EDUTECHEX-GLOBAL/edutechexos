'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2, Clock, CheckCheck } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { getSocket } from '@/lib/socket';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

function getAuth() {
  try {
    const d = JSON.parse(localStorage.getItem('edutechex_token') ?? '');
    return { token: d.token, user: d.user };
  } catch {
    return { token: null, user: null };
  }
}

interface DMMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  senderEmail?: string;
  initials?: string;
}

export default function DMChatPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const members = useDashboardStore((s) => s.members);
  const loadLocalMembers = useDashboardStore((s) => s.loadLocalMembers);

  const { token, user } = getAuth();
  const myEmail = user?.email?.toLowerCase() ?? '';

  const targetMember = members.find((m) => m.id === userId);
  const sorted = [userId, members.find((m) => m.email === myEmail)?.id ?? ''].sort();
  const dmChannelId = `dm-${sorted[0]}-${sorted[1]}`;

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [composer, setComposer] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { router.replace('/sign-up-login-screen?mode=user'); return; }
    loadLocalMembers?.();
    loadMessages();
  }, [userId, token]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (msg: { channelId: string; message: DMMessage }) => {
      if (msg.channelId === dmChannelId || msg.channelId === userId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.message.id)) return prev;
          return [...prev, msg.message];
        });
      }
    };
    socket?.on('new_message', handler);
    return () => { socket?.off('new_message', handler); };
  }, [dmChannelId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/messages?channelId=${dmChannelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const msgs = data.messages ?? data.messages?.[dmChannelId] ?? [];
      setMessages(Array.isArray(msgs) ? msgs.reverse() : []);
    } catch {}
    setLoading(false);
  }

  async function sendMessage() {
    const text = composer.trim();
    if (!text || sending || !token) return;
    setSending(true);
    setComposer('');

    const optimistic: DMMessage = {
      id: `msg-${Date.now()}`,
      sender: user?.name ?? 'You',
      senderEmail: myEmail,
      text,
      timestamp: new Date().toISOString(),
      initials: user?.initials ?? 'U',
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...optimistic, channelId: dmChannelId }),
      });
    } catch {}
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const displayName = targetMember?.name ?? userId;
  const initials = targetMember?.initials ?? displayName.charAt(0).toUpperCase();
  const avatarColor = targetMember?.color ?? '#4f46e5';

  return (
    <div className="flex h-screen flex-col bg-[#0D1025]">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[rgba(148,163,184,0.08)] bg-[#13173A] px-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7C859E] hover:bg-[rgba(108,123,245,0.1)] hover:text-[#6C7BF5] transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shrink-0"
          style={{ background: avatarColor }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{displayName}</p>
          <p className="truncate text-[11px] text-[#7C859E]">{targetMember?.email ?? ''}</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <Loader2 size={24} className="animate-spin text-[#6C7BF5]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <Clock size={32} className="text-[#4A5578] mb-3" />
            <p className="text-sm font-bold text-[#7C859E]">No messages yet</p>
            <p className="text-xs text-[#4A5578] mt-1">Send a message to start chatting</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderEmail?.toLowerCase() === myEmail;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-[#6C7BF5] text-white rounded-br-md'
                      : 'bg-[#1E2245] text-[#E0E4F0] rounded-bl-md'
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-bold text-[#6C7BF5] mb-1">{msg.sender}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`text-[9px] mt-1 flex items-center gap-1 ${isMe ? 'text-[rgba(255,255,255,0.5)] justify-end' : 'text-[rgba(255,255,255,0.3)]'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <CheckCheck size={11} />}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-[rgba(148,163,184,0.08)] bg-[#13173A] px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl bg-[#1E2245] px-3 py-2">
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-[#4A5578] max-h-32 py-1"
          />
          <button
            onClick={sendMessage}
            disabled={!composer.trim() || sending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6C7BF5] text-white transition-all hover:bg-[#5A6AE5] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
