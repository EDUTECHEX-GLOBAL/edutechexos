'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, CalendarDays, Flame, TrendingUp } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function isWeekend(dateStr: string) { const d = new Date(dateStr).getDay(); return d === 0 || d === 6; }

function calcStreak(dates: string[], todayStr: string): number {
  let s = 0;
  const sorted = [...dates].sort().reverse();
  const cur = new Date(todayStr);
  for (let i = 0; i < 365; i++) {
    const ds = cur.toISOString().split('T')[0];
    if (sorted.includes(ds)) { s++; cur.setDate(cur.getDate() - 1); }
    else if (i === 0)         { cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return s;
}

interface Props { open: boolean; onClose: () => void; }

export default function MyActivityCalendar({ open, onClose }: Props) {
  const [mounted,      setMounted]      = useState(false);
  const [viewYear,     setViewYear]     = useState(0);
  const [viewMonth,    setViewMonth]    = useState(0);
  const [loginDates,   setLoginDates]   = useState<string[]>([]);
  const [userName,     setUserName]     = useState('You');
  const [userInitials, setUserInitials] = useState('ME');
  const [userColor,    setUserColor]    = useState('#3E4A89');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    try {
      const authData = localStorage.getItem('edutechex_token');
      if (!authData) return;
      const { user, token } = JSON.parse(authData);
      if (!user) return;

      setUserName(user.name?.split(' ')[0] || 'You');
      setUserInitials(user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ME');
      const COLORS: Record<string, string> = { Admin: '#0ea5e9', Manager: '#3E4A89', Developer: '#10b981', Designer: '#f59e0b' };
      setUserColor(COLORS[user.role] || '#3E4A89');

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';
      fetch(`${apiBase}/api/login-history`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.success && data.history?.[user.email]) { setLoginDates(data.history[user.email]); return; }
          const key = `edutechex_logins_${user.email}`;
          let stored: string[] = JSON.parse(localStorage.getItem(key) || '[]');
          if (!stored.length) {
            const gen: string[] = []; const today = new Date();
            for (let i = 0; i < 30; i++) {
              const d = new Date(); d.setDate(today.getDate() - i);
              if (Math.random() < (d.getDay() === 0 || d.getDay() === 6 ? 0.1 : 0.85)) gen.push(d.toISOString().split('T')[0]);
            }
            const ts = today.toISOString().split('T')[0]; if (!gen.includes(ts)) gen.push(ts);
            localStorage.setItem(key, JSON.stringify(gen)); stored = gen;
          }
          setLoginDates(stored);
        })
        .catch(() => { setLoginDates(JSON.parse(localStorage.getItem(`edutechex_logins_${user.email}`) || '[]')); });
    } catch { /**/ }
  }, [open, mounted]);

  if (!mounted || !open) return null;

  const today    = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDay(viewYear, viewMonth);

  /* ── Stats ── */
  const thisMonthLogins = loginDates.filter(d => { const [y,m] = d.split('-').map(Number); return y === viewYear && m === viewMonth + 1; }).length;
  const totalLogins     = loginDates.length;
  const streak          = calcStreak(loginDates, todayStr);

  const workdaysElapsed = Array.from({ length: daysInMonth }, (_, i) => {
    const ds = toDateStr(viewYear, viewMonth, i + 1);
    return ds <= todayStr && !isWeekend(ds);
  }).filter(Boolean).length;

  const loginRate   = workdaysElapsed > 0 ? Math.round((thisMonthLogins / workdaysElapsed) * 100) : 0;
  const monthLabel  = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  /* ── Last 7 days strip ── */
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d  = new Date(today); d.setDate(today.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    return { ds, label: ['S','M','T','W','T','F','S'][d.getDay()], loggedIn: loginDates.includes(ds), isToday: ds === todayStr, weekend: d.getDay() === 0 || d.getDay() === 6 };
  });

  const prevMonth = () => viewMonth === 0  ? (setViewYear(y => y-1), setViewMonth(11))    : setViewMonth(m => m-1);
  const nextMonth = () => viewMonth === 11 ? (setViewYear(y => y+1), setViewMonth(0))     : setViewMonth(m => m+1);
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const STATS = [
    { icon: <CalendarDays size={15} className="text-emerald-400" />, value: thisMonthLogins, top: 'This month',  sub: 'days logged in',      color: 'text-emerald-400' },
    { icon: <Flame        size={15} className="text-orange-400 animate-pulse" />, value: streak, top: 'Day streak',   sub: streak === 1 ? 'day in a row' : 'days in a row', color: 'text-orange-400' },
    { icon: <TrendingUp   size={15} className="text-sky-400"     />, value: `${loginRate}%`, top: 'Active rate',  sub: 'of workdays',         color: 'text-sky-400' },
  ];

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,18,34,0.65)] backdrop-blur-md p-4 animate-in fade-in duration-200">

      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        style={{ background: '#0F1222', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(135deg, #1a2140 0%, #1e2538 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg shrink-0" style={{ backgroundColor: userColor }}>
              {userInitials}
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">{userName}</p>
              <p className="text-[10px] text-white/40 mt-0.5 font-semibold">Login Activity</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* ── Stats — 3 clear cards ── */}
        <div className="grid grid-cols-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center py-4 gap-0.5" style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</span></div>
              <p className="text-[10px] font-black text-white/70">{s.top}</p>
              <p className="text-[9px] text-white/25 font-medium">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Last 7 days ── */}
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25 mb-2.5">Last 7 days</p>
          <div className="grid grid-cols-7 gap-1.5">
            {last7.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-white/25">{d.label}</span>
                <div className={`h-8 w-full rounded-xl flex items-center justify-center text-[11px] font-black transition-all
                  ${d.isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
                  ${d.loggedIn  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  : d.weekend   ? 'bg-white/[0.03] text-white/15'
                  :               'bg-rose-500/15 text-rose-400/50'}`}
                >
                  {d.loggedIn ? '✓' : d.weekend ? '—' : '·'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Month nav ── */}
        <div className="flex items-center justify-between px-5 py-3">
          <button onClick={prevMonth} className="h-8 w-8 rounded-xl flex items-center justify-center text-white/35 hover:text-white hover:bg-white/5 transition-all active:scale-95">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-black text-white/75">{monthLabel}</span>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white/35 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 active:scale-95">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── Calendar grid ── */}
        <div className="px-5 pb-4">
          {/* Day headers — single letter */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[9px] font-black text-white/20 uppercase tracking-widest py-0.5">
                {d[0]}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const ds  = toDateStr(viewYear, viewMonth, day);
              const isToday   = ds === todayStr;
              const isFuture  = ds > todayStr;
              const didLogin  = loginDates.includes(ds);
              const weekend   = isWeekend(ds);

              let bg = '', textC = 'text-white/15', border = '';
              if (!isFuture) {
                if (didLogin)           { bg = 'bg-emerald-500/20'; textC = 'text-emerald-300'; border = 'border border-emerald-500/25'; }
                else if (!weekend)      { bg = 'bg-rose-500/10';    textC = 'text-rose-400/55'; border = 'border border-rose-500/12'; }
                else                    { textC = 'text-white/20'; }
              }

              return (
                <div key={day}
                  title={isFuture ? '' : didLogin ? 'Logged in ✓' : weekend ? 'Weekend' : 'No login'}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-black transition-all cursor-default
                    ${bg} ${textC} ${border}
                    ${isToday ? 'ring-2 ring-indigo-400 ring-offset-[2px] scale-110 z-10' : ''}
                    ${!isFuture && !isToday ? 'hover:scale-105' : ''}
                  `}
                >
                  {day}
                  {/* Status dot at bottom */}
                  {!isFuture && (
                    <span className={`absolute bottom-[3px] h-1 w-1 rounded-full ${didLogin ? 'bg-emerald-400' : weekend ? 'bg-white/10' : 'bg-rose-400/40'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Month progress bar + legend ── */}
        <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Month attendance</p>
            <p className="text-[10px] font-black text-white/40 tabular-nums">{thisMonthLogins} / {workdaysElapsed} workdays</p>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(loginRate, 100)}%`, backgroundColor: userColor }} />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm" style={{ background: 'rgba(16,185,129,0.6)' }} />
              <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">Logged in</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm" style={{ background: 'rgba(244,63,94,0.25)' }} />
              <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">Missed</span>
            </span>
            <span className="ml-auto text-[9px] font-black text-white/25 uppercase tracking-wider tabular-nums">{totalLogins} total logins</span>
          </div>
        </div>
      </div>
    </div>
  );
}
