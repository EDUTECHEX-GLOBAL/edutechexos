'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquareDot, Send, ArrowLeft, Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

function getAuth() {
  try { const d = JSON.parse(localStorage.getItem('edutechex_token') ?? ''); return { token: d.token, user: d.user }; }
  catch { return { token: null, user: null }; }
}

interface DMChannel { id: string; name: string; dmMembers: string[]; updatedAt?: string; }
interface DMMessage { id: string; sender: string; text: string; timestamp: string; senderEmail?: string; }

interface Props {
  currentUser: { name: string; email: string; initials: string; role: string } | null;
  members: any[];
}

export default function DMPanel({ currentUser, members }: Props) {
  const [dmChannels, setDmChannels] = useState<DMChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<DMChannel | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [composer, setComposer] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { token, user } = getAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const myEmail = user?.email?.toLowerCase() ?? '';

  useEffect(() => { loadDMChannels(); }, []);
  useEffect(() => { if (activeChannel) loadMessages(activeChannel.id); }, [activeChannel?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadDMChannels() {
    try {
      const res = await fetch(`${API}/api/channels`, { headers });
      const data = await res.json();
      const dms = (data.channels ?? []).filter((c: any) => c.type === 'dm');
      setDmChannels(dms);
    } catch {}
  }

  async function loadMessages(channelId: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/messages?channelId=${channelId}`, { headers });
      const data = await res.json();
      const msgs = data.messages ?? data.messages?.[channelId] ?? [];
      setMessages(Array.isArray(msgs) ? msgs : Object.values(msgs).flat() as DMMessage[]);
    } catch {}
    setLoading(false);
  }

  async function openDM(targetEmail: string) {
    try {
      const res = await fetch(`${API}/api/channels/dm`, {
        method: 'POST', headers,
        body: JSON.stringify({ targetEmail }),
      });
      const data = await res.json();
      if (data.channel) {
        setActiveChannel(data.channel);
        setDmChannels(prev => prev.find(c => c.id === data.channel.id) ? prev : [data.channel, ...prev]);
      }
    } catch {}
  }

  async function sendMessage() {
    if (!composer.trim() || !activeChannel) return;
    const text = composer.trim();
    setComposer('');
    const optimistic: DMMessage = {
      id: `opt-${Date.now()}`, sender: currentUser?.name ?? 'You',
      text, timestamp: new Date().toISOString(), senderEmail: myEmail,
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      await fetch(`${API}/api/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({
          id: optimistic.id, channelId: activeChannel.id,
          sender: currentUser?.name, text,
          senderEmail: myEmail,
          initials: currentUser?.initials ?? '?',
          color: '#0AE8D0',
          timestamp: optimistic.timestamp,
        }),
      });
    } catch {}
  }

  function getOtherEmail(ch: DMChannel) {
    return ch.dmMembers?.find(e => e !== myEmail) ?? '';
  }

  function getOtherName(ch: DMChannel) {
    const email = getOtherEmail(ch);
    return members.find(m => m.email?.toLowerCase() === email)?.name ?? email.split('@')[0];
  }

  function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  const filteredMembers = members.filter(m =>
    m.email?.toLowerCase() !== myEmail &&
    (search === '' || m.name.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()))
  );

  if (activeChannel) {
    const otherEmail = getOtherEmail(activeChannel);
    const otherName = getOtherName(activeChannel);
    const otherMember = members.find(m => m.email?.toLowerCase() === otherEmail);

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(148,163,184,0.06)] shrink-0">
          <button onClick={() => setActiveChannel(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#EEF2F6] hover:bg-[rgba(148,163,184,0.07)] transition-all">
            <ArrowLeft size={14} />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0"
            style={{ background: otherMember?.color ?? 'linear-gradient(135deg,#7C5CFC,#FF6B7F)' }}>
            {getInitials(otherName)}
          </div>
          <div>
            <div className="text-sm font-bold text-[#EEF2F6]">{otherName}</div>
            <div className="text-[10px] text-[#4B5678]">{otherEmail}</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-dark">
          {loading && <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-[#4B5678]" /></div>}
          {messages.map(msg => {
            const isOwn = msg.senderEmail === myEmail || msg.sender === currentUser?.name;
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-gradient-to-br from-[#0AE8D0] to-[#06B8A5] text-[#06080F] font-medium rounded-br-sm' : 'bg-[rgba(22,27,61,0.80)] text-[#EEF2F6] border border-[rgba(148,163,184,0.08)] rounded-bl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 px-4 pb-4 pt-2">
          <div className="flex items-center gap-2 rounded-xl border border-[rgba(148,163,184,0.10)] bg-[rgba(22,27,61,0.60)] px-3 py-2">
            <input
              value={composer}
              onChange={e => setComposer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder={`Message ${otherName}...`}
              className="flex-1 bg-transparent text-sm text-[#EEF2F6] placeholder-[#4B5678] focus:outline-none"
            />
            <button onClick={sendMessage} disabled={!composer.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0D9488] text-white disabled:opacity-30 transition-all">
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[rgba(148,163,184,0.06)] shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareDot size={15} className="text-[#0AE8D0]" />
          <span className="text-sm font-black text-[#EEF2F6]">Direct Messages</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(148,163,184,0.05)] border border-[rgba(148,163,184,0.08)]">
          <Search size={12} className="text-[#4B5678] shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search members..." className="flex-1 bg-transparent text-xs text-[#EEF2F6] placeholder-[#4B5678] focus:outline-none" />
        </div>
      </div>

      {/* Recent DMs */}
      {dmChannels.length > 0 && (
        <div className="px-3 pt-3">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#4B5678] px-1 mb-2">Recent</div>
          {dmChannels.map(ch => {
            const name = getOtherName(ch);
            const member = members.find(m => m.email?.toLowerCase() === getOtherEmail(ch));
            return (
              <button key={ch.id} onClick={() => setActiveChannel(ch)}
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-[rgba(148,163,184,0.06)] transition-all text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                  style={{ background: member?.color ?? 'linear-gradient(135deg,#7C5CFC,#FF6B7F)' }}>
                  {getInitials(name)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#EEF2F6] truncate">{name}</div>
                  <div className="text-[10px] text-[#4B5678] truncate">{getOtherEmail(ch)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* All members */}
      <div className="px-3 pt-3 flex-1 overflow-y-auto scrollbar-dark">
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#4B5678] px-1 mb-2">Start a conversation</div>
        {filteredMembers.map(m => (
          <button key={m.id} onClick={() => openDM(m.email)}
            className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-[rgba(148,163,184,0.06)] transition-all text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
              style={{ background: m.color ?? '#0AE8D0' }}>
              {m.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#EEF2F6] truncate">{m.name}</div>
              <div className="text-[10px] text-[#4B5678]">{m.role}</div>
            </div>
            <div className={`w-2 h-2 rounded-full shrink-0 ${m.status === 'online' ? 'bg-[#10B981]' : 'bg-[#4B5678]'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
