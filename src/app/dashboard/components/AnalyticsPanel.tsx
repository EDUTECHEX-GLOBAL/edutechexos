'use client';

import React, { useMemo } from 'react';
import { X, BarChart2, MessageSquare, Hash, Users, TrendingUp } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';

interface AnalyticsPanelProps {
  onClose: () => void;
}

function isToday(iso: string): boolean {
  try {
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

function isYesterday(iso: string): boolean {
  try {
    const d = new Date(iso);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate()
    );
  } catch {
    return false;
  }
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

const MEMBER_COLORS = [
  '#3E4A89',
  '#0891b2',
  '#059669',
  '#dc2626',
  '#7c3aed',
  '#d97706',
  '#db2777',
  '#0284c7',
];

function stringToColor(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++)
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

interface StatCardProps {
  value: string | number;
  label: string;
  borderColor: string;
  icon: React.ReactNode;
  sub?: string;
}

function StatCard({ value, label, borderColor, icon, sub }: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white p-4 shadow-sm`}
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl font-black text-[#1E2636]">{value}</span>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${borderColor}18` }}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs font-semibold text-[#7C859E]">{label}</p>
      {sub && <p className="text-[10px] text-[#7C859E]">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPanel({ onClose }: AnalyticsPanelProps) {
  const messages = useDashboardStore((s) => s.messages);
  const channels = useDashboardStore((s) => s.channels);

  // ── Computed stats ────────────────────────────────────────────────────────

  const { channelStats, senderStats, todayCount, yesterdayCount, totalMessages, activeChannelCount } =
    useMemo(() => {
      // Channel name map
      const channelNameMap: Record<string, string> = {};
      const channelDescMap: Record<string, string> = {};
      channels.forEach((ch) => {
        channelNameMap[ch.id] = ch.name;
        channelDescMap[ch.id] = ch.description ?? '';
      });

      let total = 0;
      let todayC = 0;
      let yesterdayC = 0;
      const channelCounts: Record<string, number> = {};
      const senderCounts: Record<string, number> = {};
      let activeChannels = 0;

      Object.entries(messages).forEach(([channelId, msgs]) => {
        const count = msgs.length;
        if (count > 0) activeChannels++;
        channelCounts[channelId] = count;
        total += count;

        msgs.forEach((msg) => {
          if (isToday(msg.timestamp)) todayC++;
          if (isYesterday(msg.timestamp)) yesterdayC++;
          if (msg.sender) {
            senderCounts[msg.sender] = (senderCounts[msg.sender] ?? 0) + 1;
          }
        });
      });

      // Channel stats sorted by count desc
      const channelStatsSorted = Object.entries(channelCounts)
        .map(([id, count]) => ({
          id,
          name: channelNameMap[id] ?? id,
          description: channelDescMap[id] ?? '',
          count,
        }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);

      // Top 5 senders
      const senderStatsSorted = Object.entries(senderCounts)
        .map(([sender, count]) => ({ sender, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        channelStats: channelStatsSorted,
        senderStats: senderStatsSorted,
        todayCount: todayC,
        yesterdayCount: yesterdayC,
        totalMessages: total,
        activeChannelCount: activeChannels,
      };
    }, [messages, channels]);

  const maxChannelCount = channelStats[0]?.count ?? 1;
  const maxSenderCount = senderStats[0]?.count ?? 1;

  const todayDelta = todayCount - yesterdayCount;
  const todayDeltaLabel =
    todayDelta === 0
      ? 'Same as yesterday'
      : todayDelta > 0
      ? `+${todayDelta} vs yesterday`
      : `${todayDelta} vs yesterday`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-[#FAF8F5]">
      {/* Header */}
      <div
        className="flex h-14 shrink-0 items-center justify-between px-4"
        style={{
          background: 'linear-gradient(135deg, #191E2F 0%, #1E2538 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/25 bg-[#1E2538]">
            <BarChart2
              size={16}
              className="text-[#C4CAE0]"
              strokeWidth={2.5}
            />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7C859E]">
              Team Activity
            </p>
            <p className="text-sm font-black leading-none text-white">
              Analytics
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[#7C859E] transition-colors hover:bg-white/10 hover:text-white"
          title="Close"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Stat cards grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            value={totalMessages}
            label="Total Messages"
            borderColor="#3E4A89"
            icon={
              <MessageSquare
                size={20}
                className="text-indigo-500"
                strokeWidth={2}
              />
            }
          />
          <StatCard
            value={activeChannelCount}
            label="Active Channels"
            borderColor="#0891b2"
            icon={
              <Hash size={20} className="text-cyan-500" strokeWidth={2} />
            }
          />
          <StatCard
            value={todayCount}
            label="Messages Today"
            borderColor="#059669"
            icon={
              <TrendingUp
                size={20}
                className="text-emerald-500"
                strokeWidth={2}
              />
            }
            sub={todayDeltaLabel}
          />
          <StatCard
            value={senderStats.length}
            label="Active Senders"
            borderColor="#7c3aed"
            icon={
              <Users size={20} className="text-violet-500" strokeWidth={2} />
            }
          />
        </div>

        {/* Messages per channel */}
        <div className="rounded-2xl border border-[rgba(62,74,137,0.12)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#7C859E]">
            Messages per Channel
          </h3>
          {channelStats.length === 0 ? (
            <p className="text-sm text-[#7C859E]">No channel activity yet.</p>
          ) : (
            <div className="space-y-3">
              {channelStats.map((ch) => {
                const widthPct = Math.round((ch.count / maxChannelCount) * 100);
                return (
                  <div key={ch.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Hash
                          size={11}
                          className="shrink-0 text-[#7C859E]"
                          strokeWidth={2.5}
                        />
                        <span className="truncate text-sm font-bold text-[#1E2636]">
                          {ch.name}
                        </span>
                        {ch.description && (
                          <span className="hidden truncate text-[10px] text-[#7C859E] sm:inline">
                            · {ch.description}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-[#3E4A89]">
                        {ch.count}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(62,74,137,0.08)]">
                      <div
                        className="h-full rounded-full bg-[rgba(62,74,137,0.08)]0 transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top senders */}
        <div className="rounded-2xl border border-[rgba(62,74,137,0.12)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#7C859E]">
            Top 5 Most Active Senders
          </h3>
          {senderStats.length === 0 ? (
            <p className="text-sm text-[#7C859E]">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {senderStats.map((s, idx) => {
                const widthPct = Math.round(
                  (s.count / maxSenderCount) * 100
                );
                const pct =
                  totalMessages > 0
                    ? Math.round((s.count / totalMessages) * 100)
                    : 0;
                const color = stringToColor(s.sender);
                const initials = getInitials(s.sender);
                return (
                  <div key={s.sender} className="flex items-center gap-3">
                    {/* Rank */}
                    <span className="w-4 shrink-0 text-center text-[11px] font-black text-[#7C859E]">
                      {idx + 1}
                    </span>
                    {/* Avatar */}
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </span>
                    {/* Bar + name */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="truncate text-sm font-bold text-[#1E2636]">
                          {s.sender}
                        </span>
                        <span className="ml-2 shrink-0 text-[11px] font-black text-emerald-600">
                          {s.count}{' '}
                          <span className="text-[#7C859E] font-semibold">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(62,74,137,0.08)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today vs Yesterday */}
        <div className="rounded-2xl border border-[rgba(62,74,137,0.12)] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#7C859E]">
            Today vs Yesterday
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Today', count: todayCount, color: '#059669', bg: '#f0fdf4' },
              {
                label: 'Yesterday',
                count: yesterdayCount,
                color: '#94a3b8',
                bg: '#f8fafc',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center rounded-xl p-4"
                style={{ backgroundColor: item.bg }}
              >
                <span
                  className="text-4xl font-black"
                  style={{ color: item.color }}
                >
                  {item.count}
                </span>
                <span className="mt-1 text-sm font-semibold text-[#7C859E]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          {todayDelta !== 0 && (
            <p
              className={`mt-3 text-center text-sm font-semibold ${
                todayDelta > 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {todayDeltaLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}




