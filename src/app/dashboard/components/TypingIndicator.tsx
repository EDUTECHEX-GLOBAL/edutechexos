'use client';

import React from 'react';
import { useDashboardStore } from '@/store/dashboardStore';

interface TypingIndicatorProps {
  channelId: string;
}

export default function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const typingUsers = useDashboardStore((s) => s.typingUsers[channelId] ?? []);
  const members     = useDashboardStore((s) => s.members);

  /* ── reserve the same space even when nobody is typing so the
        layout doesn't jump when the indicator appears / disappears ── */
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
      {/* ── Avatar stack ──────────────────────────────────────────── */}
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

      {/* ── Bubble ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 shadow-sm">
        {/* Animated dots */}
        <div className="flex items-end gap-[3px]">
          <span className="typing-dot" style={{ animationDelay: '0ms' }}   />
          <span className="typing-dot" style={{ animationDelay: '160ms' }} />
          <span className="typing-dot" style={{ animationDelay: '320ms' }} />
        </div>

        {/* Label */}
        <span className="text-[11px] font-semibold leading-none text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}
