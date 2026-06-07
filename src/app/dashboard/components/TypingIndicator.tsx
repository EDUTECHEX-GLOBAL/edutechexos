'use client';

import React from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { MessageLoading } from '@/components/ui/message-loading';

interface TypingIndicatorProps {
  channelId: string;
}

export default function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const typingUsers = useDashboardStore((s) => s.typingUsers[channelId] ?? []);
  const members     = useDashboardStore((s) => s.members);

  /* reserve height so layout never jumps when indicator appears/disappears */
  if (typingUsers.length === 0) {
    return <div className="h-9" />;
  }

  /* up to 3 avatar bubbles */
  const typingMembers = typingUsers
    .map((name) => members.find((m) => m.name === name))
    .filter(Boolean)
    .slice(0, 3) as NonNullable<ReturnType<typeof members.find>>[];

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing`
      : typingUsers.length === 2
      ? `${typingUsers[0]} & ${typingUsers[1]} are typing`
      : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`;

  return (
    <div className="typing-indicator-wrapper flex items-center gap-2 px-5 py-1">

      {/* ── Avatar stack ─────────────────────────────────────────────── */}
      <div className="flex -space-x-1.5">
        {typingMembers.map((member, i) => (
          <div
            key={member.id}
            title={member.name}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 text-[8px] font-black text-white shadow-sm"
            style={{ backgroundColor: member.color, zIndex: 10 - i }}
          >
            {member.initials}
          </div>
        ))}
      </div>

      {/* ── Bubble with MessageLoading SVG ──────────────────────────── */}
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-800 border border-[rgba(62,74,137,0.12)] px-3 py-1.5 shadow-sm">

        {/* The animated SVG dots — sized down to match the bubble */}
        <span className="flex items-center text-[#7C859E] dark:text-slate-400" style={{ width: 20, height: 20 }}>
          <MessageLoading />
        </span>

        {/* Who's typing */}
        <span className="text-[11px] font-semibold leading-none text-[#7C859E] dark:text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}
