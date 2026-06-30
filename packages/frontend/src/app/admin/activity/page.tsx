'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Bell,
  Clock,
  Eye,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import AdminGuard from '@/app/components/AdminGuard';
import LoginTrackerCalendar from '../components/LoginTrackerCalendar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

type ActivityStat = {
  email: string;
  name: string;
  totalMinutes: number;
  activeDays: number;
  lastSeen: string | null;
  messageCount: number;
  taskCount: number;
};

type SortKey = 'totalMinutes' | 'messageCount' | 'activeDays' | 'name';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Never';
  const d = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ActivityPage() {
  const { members, loadLocalMembers } = useDashboardStore();
  const [stats, setStats] = useState<ActivityStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('totalMinutes');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  function getToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null;
    } catch {
      return null;
    }
  }

  async function fetchStats() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/activity/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { success: boolean; stats?: ActivityStat[] } = res.ok ? await res.json() : {};
      if (data.success && Array.isArray(data.stats)) {
        setStats(data.stats);
        setLastRefreshed(new Date());
      }
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocalMembers?.();
    fetchStats();
  }, []);

  // Derived totals
  const totalMinutes = stats.reduce((s, x) => s + (x.totalMinutes ?? 0), 0);
  const totalMessages = stats.reduce((s, x) => s + (x.messageCount ?? 0), 0);
  const activeThisWeek = stats.filter((x) => (x.activeDays ?? 0) > 0).length;
  const avgEngagement =
    stats.length > 0
      ? Math.round(
          stats.reduce(
            (s, x) => s + Math.min(100, ((x.totalMinutes ?? 0) / (7 * 8 * 60)) * 100),
            0
          ) / stats.length
        )
      : 0;

  const sorted = [...stats].sort((a, b) => {
    if (sortKey === 'name') return (a.name || a.email).localeCompare(b.name || b.email);
    return (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
  });

  const topUser = sorted[0];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* ── Header ── */}
        <header className="sticky top-0 z-30 glass-nav">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5 no-underline">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-green-light flex items-center justify-center shadow-md shadow-primary/20">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-display font-bold text-base tracking-[-0.02em] text-foreground">
                  EduTechEx<span className="text-primary">OS</span>
                </span>
              </Link>
              <span className="hidden rounded-lg bg-primary/10 border border-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:inline-flex">
                Activity
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-ink border border-border bg-surface hover:border-primary/20 hover:text-primary transition-all"
              >
                <ArrowLeft size={13} />
                Admin Panel
              </Link>
              <Link
                href="/dashboard"
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-ink border border-border bg-surface hover:border-primary/20 hover:text-primary transition-all"
              >
                Workspace
              </Link>
              <button
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink-light hover:bg-surface hover:text-foreground transition-all"
                title="Notifications"
              >
                <Bell size={17} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-8">
          {/* ── Hero ── */}
          <section className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                Last 7 days · With user permission
              </p>
              <h1 className="flex items-center gap-3 font-display font-bold text-3xl md:text-4xl tracking-[-0.03em] text-foreground">
                <Eye size={32} className="text-primary" />
                Activity & Engagement
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-light leading-relaxed">
                In-app session time, messages sent, and engagement per team member. Users can see
                exactly what is tracked in <strong className="text-foreground">Settings → Privacy</strong>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-ink-light">
                Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                type="button"
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary/20 hover:text-primary transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </section>

          {/* ── Summary stat cards ── */}
          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card-premium p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-green-light flex items-center justify-center shadow-md">
                  <Clock size={17} className="text-white" />
                </div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                  Team total
                </span>
              </div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-light">
                Total session time
              </p>
              <p className="mt-1 font-display font-bold text-3xl tracking-[-0.02em] text-foreground">
                {formatDuration(totalMinutes)}
              </p>
            </div>

            <div className="card-premium p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] flex items-center justify-center shadow-md">
                  <MessageSquare size={17} className="text-white" />
                </div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                  This week
                </span>
              </div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-light">
                Total messages sent
              </p>
              <p className="mt-1 font-display font-bold text-3xl tracking-[-0.02em] text-foreground">
                {totalMessages}
              </p>
            </div>

            <div className="card-premium p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-md">
                  <Users size={17} className="text-white" />
                </div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                  7-day window
                </span>
              </div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-light">
                Active members
              </p>
              <p className="mt-1 font-display font-bold text-3xl tracking-[-0.02em] text-foreground">
                {activeThisWeek}
                <span className="ml-1 text-base font-semibold text-ink-light">
                  / {stats.length}
                </span>
              </p>
            </div>

            <div className="card-premium p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-md">
                  <Zap size={17} className="text-white" />
                </div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-light">
                  Average
                </span>
              </div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-light">
                Team engagement
              </p>
              <p className="mt-1 font-display font-bold text-3xl tracking-[-0.02em] text-foreground">
                {avgEngagement}%
              </p>
            </div>
          </section>

          {/* ── Top performer spotlight ── */}
          {topUser && !loading && (
            <section className="mb-8">
              <div className="card-premium p-5 bg-gradient-to-r from-primary/5 to-transparent border-primary/15">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] shadow-lg">
                      <Trophy size={22} className="text-white" />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d97706]">
                        Top performer this week
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-foreground">
                        {topUser.name || topUser.email}
                      </p>
                      <p className="text-xs text-ink-light">{topUser.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-black text-foreground">
                        {formatDuration(topUser.totalMinutes ?? 0)}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-light">
                        Session
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-foreground">
                        {topUser.messageCount ?? 0}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-light">
                        Messages
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-foreground">
                        {topUser.activeDays ?? 0}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-light">
                        Active days
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-foreground">
                        {Math.min(
                          100,
                          Math.round(((topUser.totalMinutes ?? 0) / (7 * 8 * 60)) * 100)
                        )}
                        %
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-light">
                        Engagement
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Member activity grid ── */}
          <section className="mb-10">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 font-display font-bold text-xl tracking-[-0.02em] text-foreground">
                <TrendingUp size={18} className="text-primary" />
                Member Breakdown
              </h2>
              {/* Sort controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-light">Sort by:</span>
                {(
                  [
                    { key: 'totalMinutes', label: 'Session time' },
                    { key: 'messageCount', label: 'Messages' },
                    { key: 'activeDays', label: 'Days active' },
                    { key: 'name', label: 'Name' },
                  ] as { key: SortKey; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSortKey(key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      sortKey === key
                        ? 'bg-primary text-white'
                        : 'bg-surface border border-border text-ink-light hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-ink-light">
                <RefreshCw size={16} className="mr-2 animate-spin" /> Loading activity data…
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-14 text-center">
                <Activity size={28} className="mx-auto mb-3 text-ink-light opacity-30" />
                <p className="text-sm font-semibold text-ink-light">No activity data yet.</p>
                <p className="mt-1 text-xs text-ink-light opacity-60">
                  Data appears once users open the dashboard.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((stat, idx) => {
                  const member = members.find(
                    (m) => m.email.toLowerCase() === stat.email.toLowerCase()
                  );
                  const initials =
                    member?.initials ??
                    (stat.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || '??');
                  const color = member?.color ?? '#64748b';
                  const engagementPct = Math.min(
                    100,
                    Math.round(((stat.totalMinutes ?? 0) / (7 * 8 * 60)) * 100)
                  );
                  const isTop = idx === 0 && sortKey === 'totalMinutes';

                  return (
                    <div
                      key={stat.email}
                      className={`card-premium flex flex-col gap-3 p-5 ${isTop ? 'ring-2 ring-[#f59e0b]/30' : ''}`}
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white"
                            style={{ backgroundColor: color }}
                          >
                            {initials}
                          </div>
                          {isTop && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f59e0b] text-[8px]">
                              👑
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">
                            {stat.name || stat.email}
                          </p>
                          <p className="truncate text-[11px] text-ink-light">{stat.email}</p>
                        </div>
                        <span
                          className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            member?.status === 'online'
                              ? 'bg-emerald-50 text-emerald-600'
                              : member?.status === 'away'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-secondary text-ink-light'
                          }`}
                        >
                          {member?.status ?? 'offline'}
                        </span>
                      </div>

                      {/* Engagement bar */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-ink-light">
                          <span>Engagement this week</span>
                          <span
                            className={`font-bold ${engagementPct >= 50 ? 'text-emerald-600' : engagementPct >= 20 ? 'text-amber-600' : 'text-ink-light'}`}
                          >
                            {engagementPct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${
                              engagementPct >= 50
                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                : engagementPct >= 20
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                  : 'bg-gradient-to-r from-primary to-green-light'
                            }`}
                            style={{ width: `${engagementPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center rounded-xl bg-surface-muted px-1 py-3">
                          <Clock size={13} className="mb-1 text-primary" />
                          <span className="text-sm font-black text-foreground">
                            {formatDuration(stat.totalMinutes ?? 0)}
                          </span>
                          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-light">
                            Session
                          </span>
                        </div>
                        <div className="flex flex-col items-center rounded-xl bg-surface-muted px-1 py-3">
                          <MessageSquare size={13} className="mb-1 text-[#7c3aed]" />
                          <span className="text-sm font-black text-foreground">
                            {stat.messageCount ?? 0}
                          </span>
                          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-light">
                            Messages
                          </span>
                        </div>
                        <div className="flex flex-col items-center rounded-xl bg-surface-muted px-1 py-3">
                          <Activity size={13} className="mb-1 text-[#10b981]" />
                          <span className="text-sm font-black text-foreground">
                            {stat.activeDays ?? 0}
                          </span>
                          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-light">
                            Days
                          </span>
                        </div>
                      </div>

                      {/* Last active */}
                      <div className="flex items-center justify-between border-t border-border pt-2.5">
                        <span className="text-[11px] text-ink-light">Last active</span>
                        <span className="text-[11px] font-semibold text-foreground">
                          {formatLastSeen(stat.lastSeen)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Login tracker calendar ── */}
          <section>
            <LoginTrackerCalendar />
          </section>
        </main>
      </div>
    </AdminGuard>
  );
}
