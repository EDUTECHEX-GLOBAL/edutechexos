'use client';
import React, { useMemo, useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { X, Mail, Copy, Check, Hash, MessageSquare, Send } from 'lucide-react';

interface MemberProp {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  color: string;
}

interface UserProfileModalProps {
  member: MemberProp | null;
  onClose: () => void;
}

const STATUS_CONFIG = {
  online: { label: 'Online', color: 'bg-green-400', textColor: 'text-green-600' },
  away: { label: 'Away', color: 'bg-amber-400', textColor: 'text-amber-600' },
  offline: { label: 'Offline', color: 'bg-slate-400', textColor: 'text-[#7C859E]' },
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

export default function UserProfileModal({ member, onClose }: UserProfileModalProps) {
  const channels = useDashboardStore((s) => s.channels);
  const messages = useDashboardStore((s) => s.messages);
  const setActiveChannel = useDashboardStore((s) => s.setActiveChannel);

  const [copied, setCopied] = useState(false);

  // Channels this member belongs to â€” must be before the early return
  const memberChannels = useMemo(
    () =>
      member
        ? channels.filter(
            (ch) => !ch.id.startsWith('member-') && (ch.memberIds?.includes(member.id) ?? false)
          )
        : [],
    [channels, member]
  );

  // Last 3 messages from this member (scan all channels) â€” must be before the early return
  const recentMessages = useMemo(() => {
    if (!member) return [];

    const found: Array<{
      channelId: string;
      channelName: string;
      text: string;
      timestamp: string;
    }> = [];

    Object.entries(messages).forEach(([channelId, msgs]) => {
      const ch = channels.find((c) => c.id === channelId);
      msgs.forEach((msg) => {
        if (msg.sender === member.name || msg.initials === member.initials) {
          found.push({
            channelId,
            channelName: channelId.startsWith('member-') ? 'DM' : `#${ch?.name ?? channelId}`,
            text: msg.text,
            timestamp: msg.timestamp,
          });
        }
      });
    });

    return found
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);
  }, [messages, channels, member]);

  if (!member) return null;

  const statusCfg = STATUS_CONFIG[member.status];

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(member.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleSendDM = () => {
    setActiveChannel(member.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgba(25,30,47,0.60)] backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-[#7C859E] hover:text-[#4A5578] hover:bg-[rgba(62,74,137,0.08)] transition-colors"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Header / Avatar */}
        <div className="flex flex-col items-center px-6 pt-8 pb-5 bg-gradient-to-b from-slate-50 to-white">
          {/* Avatar */}
          <div
            className="h-20 w-20 rounded-3xl flex items-center justify-center shadow-lg text-2xl font-black text-white mb-3"
            style={{ backgroundColor: member.color }}
          >
            {member.initials}
          </div>

          {/* Name */}
          <h2 className="text-lg font-black text-[#1E2636]">{member.name}</h2>

          {/* Role badge */}
          <span className="mt-1.5 px-3 py-1 rounded-full bg-indigo-100 text-[#3E4A89] text-[11px] font-black uppercase tracking-widest">
            {member.role}
          </span>

          {/* Status */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className={`h-2 w-2 rounded-full ${statusCfg.color}`} />
            <span className={`text-xs font-semibold ${statusCfg.textColor}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-4 border-t border-[rgba(62,74,137,0.08)]">
          {/* Contact section */}
          <div className="pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#7C859E] mb-2">
              Contact
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[rgba(62,74,137,0.08)]">
              <Mail size={15} className="text-[#7C859E] flex-shrink-0" />
              <span className="flex-1 text-sm text-[#4A5578] truncate">{member.email}</span>
              <button
                onClick={handleCopyEmail}
                title="Copy email"
                className="p-1.5 rounded-lg text-[#7C859E] hover:text-[#3E4A89] hover:bg-[rgba(62,74,137,0.08)] transition-colors flex-shrink-0"
              >
                {copied ? (
                  <Check size={14} className="text-[#9BA6D3]" strokeWidth={2.5} />
                ) : (
                  <Copy size={14} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {/* Channels section */}
          {memberChannels.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#7C859E] mb-2">
                Channels
              </p>
              <div className="flex flex-wrap gap-2">
                {memberChannels.map((ch) => (
                  <span
                    key={ch.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(62,74,137,0.08)] text-[#4A5578] text-[11px] font-semibold"
                  >
                    <Hash size={10} strokeWidth={3} />
                    {ch.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity section */}
          {recentMessages.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#7C859E] mb-2">
                Recent Activity
              </p>
              <div className="space-y-2">
                {recentMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF8F5] border border-[rgba(62,74,137,0.08)]"
                  >
                    <MessageSquare
                      size={13}
                      className="text-[#9BA6D3] flex-shrink-0 mt-0.5"
                      strokeWidth={2}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">
                          {msg.channelName}
                        </span>
                        <span className="text-[10px] text-[#7C859E] flex-shrink-0">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A5578] leading-relaxed line-clamp-2">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Send DM button */}
          <button
            onClick={handleSendDM}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3E4A89] hover:bg-[#2A3568] active:bg-[#2A3568] text-white text-sm font-bold transition-colors shadow-md shadow-indigo-200"
          >
            <Send size={15} strokeWidth={2.5} />
            Send DM
          </button>
        </div>
      </div>
    </div>
  );
}
