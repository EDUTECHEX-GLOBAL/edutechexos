'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

type WeekUser = { email: string; name: string; totalMinutes: number; messageCount: number; taskCount: number };
type Week = { label: string; startDate: string; endDate: string; totalMinutes: number; activeUserCount: number; byUser: WeekUser[] };

function getToken(): string | null {
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '{}')?.token ?? null; }
  catch { return null; }
}

const fmt = (m: number) => (m <= 0 ? '0m' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

export default function TeamActivityTrend() {
  const [weekCount, setWeekCount] = useState(4);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrend = useCallback((n: number) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/activity/trend?weeks=${n}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.success) setWeeks(data.weeks ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTrend(weekCount); }, [weekCount, fetchTrend]);

  const chartData = weeks.map((w) => ({ name: w.label, minutes: w.totalMinutes, hours: +(w.totalMinutes / 60).toFixed(1) }));

  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];

  const userDeltas = (thisWeek?.byUser ?? []).map((u) => {
    const prev = lastWeek?.byUser.find((p) => p.email === u.email);
    const prevMins = prev?.totalMinutes ?? 0;
    const delta = prevMins > 0 ? Math.round(((u.totalMinutes - prevMins) / prevMins) * 100) : (u.totalMinutes > 0 ? 100 : 0);
    return { ...u, prevMins, delta };
  }).sort((a, b) => b.totalMinutes - a.totalMinutes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1A1B3A', margin: 0 }}>Weekly Activity Trend</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={weekCount}
            onChange={(e) => setWeekCount(Number(e.target.value))}
            style={{ borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', background: '#fff', padding: '7px 10px', fontSize: 12, fontWeight: 600, color: '#1A1B3A', outline: 'none' }}
          >
            {[4, 6, 8, 12].map((n) => <option key={n} value={n}>{n} weeks</option>)}
          </select>
          <button type="button" onClick={() => fetchTrend(weekCount)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', background: '#fff', padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#1A1B3A', cursor: 'pointer' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,27,58,0.08)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} unit="h" />
            <Tooltip
              formatter={(value: number) => [`${value}h`, 'Team hours']}
              contentStyle={{ borderRadius: 10, border: '1px solid rgba(26,27,58,0.10)', fontSize: 12 }}
            />
            <Bar dataKey="hours" fill="#6366F1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {thisWeek && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 8px' }}>
            This week vs last week — by member
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {userDeltas.length === 0 && (
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>No tracked activity this week yet.</p>
            )}
            {userDeltas.map((u) => (
              <div key={u.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.04)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A1B3A' }}>{u.name || u.email}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{fmt(u.totalMinutes)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 700, color: u.delta > 0 ? '#059669' : u.delta < 0 ? '#DC2626' : '#94A3B8' }}>
                    {u.delta > 0 ? <TrendingUp size={12} /> : u.delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {u.delta === 0 ? '—' : `${u.delta > 0 ? '+' : ''}${u.delta}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
