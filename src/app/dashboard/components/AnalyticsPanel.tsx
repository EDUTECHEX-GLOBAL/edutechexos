'use client';

import React, { useMemo } from 'react';
import { X, BarChart2, MessageSquare, Hash, Users, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';

interface AnalyticsPanelProps {
  onClose: () => void;
}

function isToday(iso: string): boolean {
  try {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  } catch { return false; }
}

function isYesterday(iso: string): boolean {
  try {
    const d = new Date(iso);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
  } catch { return false; }
}

function getInitials(name: string): string {
  return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

const MEMBER_COLORS = ['#3E4A89', '#0891b2', '#059669', '#dc2626', '#7c3aed', '#d97706', '#db2777', '#0284c7'];

function stringToColor(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

const RANK = ['🥇', '🥈', '🥉'];

const STAT_CARDS = [
  { key: 'total',    label: 'Total Messages',  icon: MessageSquare, color: '#60a5fa', glow: 'rgba(59,130,246,0.32)',   grad: 'linear-gradient(145deg,#0d1f3c,#1e3a8a)' },
  { key: 'channels', label: 'Active Channels', icon: Hash,          color: '#34d399', glow: 'rgba(52,211,153,0.32)',   grad: 'linear-gradient(145deg,#022c22,#065f46)' },
  { key: 'today',    label: 'Messages Today',  icon: TrendingUp,    color: '#fbbf24', glow: 'rgba(251,191,36,0.32)',   grad: 'linear-gradient(145deg,#1c1003,#92400e)' },
  { key: 'senders',  label: 'Active Senders',  icon: Users,         color: '#c4b5fd', glow: 'rgba(139,92,246,0.32)',   grad: 'linear-gradient(145deg,#1e1140,#4c1d95)' },
];

const BAR_GRADS = [
  'linear-gradient(90deg,#6366f1,#8b5cf6)',
  'linear-gradient(90deg,#3b82f6,#6366f1)',
  'linear-gradient(90deg,#06b6d4,#3b82f6)',
  'linear-gradient(90deg,#8b5cf6,#a855f7)',
];

export default function AnalyticsPanel({ onClose }: AnalyticsPanelProps) {
  const messages = useDashboardStore(s => s.messages);
  const channels = useDashboardStore(s => s.channels);

  const { channelStats, senderStats, todayCount, yesterdayCount, totalMessages, activeChannelCount } = useMemo(() => {
    const nameMap: Record<string, string> = {};
    const descMap: Record<string, string> = {};
    channels.forEach(ch => { nameMap[ch.id] = ch.name; descMap[ch.id] = ch.description ?? ''; });

    let total = 0, todayC = 0, yesterdayC = 0, activeChans = 0;
    const chanCounts: Record<string, number> = {};
    const senderCounts: Record<string, number> = {};

    Object.entries(messages).forEach(([cid, msgs]) => {
      if (msgs.length > 0) activeChans++;
      chanCounts[cid] = msgs.length;
      total += msgs.length;
      msgs.forEach(m => {
        if (isToday(m.timestamp)) todayC++;
        if (isYesterday(m.timestamp)) yesterdayC++;
        if (m.sender) senderCounts[m.sender] = (senderCounts[m.sender] ?? 0) + 1;
      });
    });

    return {
      channelStats: Object.entries(chanCounts)
        .map(([id, count]) => ({ id, name: nameMap[id] ?? id, description: descMap[id] ?? '', count }))
        .filter(c => c.count > 0).sort((a, b) => b.count - a.count),
      senderStats: Object.entries(senderCounts)
        .map(([sender, count]) => ({ sender, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5),
      todayCount: todayC,
      yesterdayCount: yesterdayC,
      totalMessages: total,
      activeChannelCount: activeChans,
    };
  }, [messages, channels]);

  const maxChan = channelStats[0]?.count ?? 1;
  const maxSender = senderStats[0]?.count ?? 1;
  const delta = todayCount - yesterdayCount;

  const statValues = [totalMessages, activeChannelCount, todayCount, senderStats.length];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ background: '#F4F5FA' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg,#191E2F 0%,#1E2538 100%)',
          padding: '0 20px', height: 60, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          borderBottom: '1px solid rgba(139,92,246,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: 'linear-gradient(145deg,#1e1140,#4c1d95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(139,92,246,0.45)',
          }}>
            <BarChart2 size={18} style={{ color: '#c4b5fd' }} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Team Activity</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1.15 }}>Analytics</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Stat cards 2×2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STAT_CARDS.map(({ key, label, icon: Icon, color, glow, grad }, i) => (
            <div key={key} style={{ background: grad, borderRadius: 14, padding: '16px 14px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ position: 'absolute', top: -18, right: -18, width: 64, height: 64, background: glow, borderRadius: '50%', filter: 'blur(18px)', pointerEvents: 'none' }} />
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon size={18} style={{ color }} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: 'white', lineHeight: 1 }}>{statValues[i]}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.52)', marginTop: 5, letterSpacing: '0.01em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Delta badge ── */}
        {delta !== 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 14px', borderRadius: 10,
            background: delta > 0 ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${delta > 0 ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            {delta > 0
              ? <ArrowUp size={13} style={{ color: '#34d399', flexShrink: 0 }} />
              : <ArrowDown size={13} style={{ color: '#f87171', flexShrink: 0 }} />}
            <span style={{ fontSize: 12, fontWeight: 700, color: delta > 0 ? '#34d399' : '#f87171' }}>
              {delta > 0 ? `+${delta}` : delta} messages compared to yesterday
            </span>
          </div>
        )}

        {/* ── Channel activity ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: '18px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hash size={12} style={{ color: '#6366f1' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Channel Activity</span>
          </div>
          {channelStats.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>No channel activity yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {channelStats.map((ch, i) => {
                const w = Math.round((ch.count / maxChan) * 100);
                return (
                  <div key={ch.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <Hash size={10} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1E2636', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#6366f1', marginLeft: 8, flexShrink: 0 }}>{ch.count}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(99,102,241,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${w}%`, background: BAR_GRADS[i % BAR_GRADS.length], borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Top senders ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: '18px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={12} style={{ color: '#8b5cf6' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#8b5cf6', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Top Senders</span>
          </div>
          {senderStats.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>No messages yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {senderStats.map((s, i) => {
                const w = Math.round((s.count / maxSender) * 100);
                const pct = totalMessages > 0 ? Math.round((s.count / totalMessages) * 100) : 0;
                const color = stringToColor(s.sender);
                return (
                  <div key={s.sender} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 20, textAlign: 'center', fontSize: i < 3 ? 14 : 11, fontWeight: 800, color: '#9CA3AF', flexShrink: 0, lineHeight: 1 }}>
                      {i < 3 ? RANK[i] : i + 1}
                    </span>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {getInitials(s.sender)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1E2636', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sender}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: color, marginLeft: 8, flexShrink: 0 }}>
                          {s.count} <span style={{ color: '#9CA3AF', fontWeight: 500 }}>({pct}%)</span>
                        </span>
                      </div>
                      <div style={{ height: 5, background: `${color}22`, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 3, opacity: 0.75, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Today vs Yesterday ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: '18px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={12} style={{ color: '#10b981' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Today vs Yesterday</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ borderRadius: 12, padding: '18px 12px', background: 'linear-gradient(145deg,#022c22,#065f46)', textAlign: 'center' }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{todayCount}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>Today</div>
            </div>
            <div style={{ borderRadius: 12, padding: '18px 12px', background: 'linear-gradient(145deg,#111827,#1f2937)', textAlign: 'center' }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: '#6b7280', lineHeight: 1 }}>{yesterdayCount}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.32)', marginTop: 6 }}>Yesterday</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
