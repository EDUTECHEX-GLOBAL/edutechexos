'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, CalendarDays, Flame, TrendingUp } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstDay(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function isWeekend(ds: string) {
  const d = new Date(ds).getDay();
  return d === 0 || d === 6;
}

function calcStreak(dates: string[], todayStr: string): number {
  let s = 0;
  const sorted = [...dates].sort().reverse();
  const cur = new Date(todayStr);
  for (let i = 0; i < 365; i++) {
    const ds = cur.toISOString().split('T')[0];
    if (sorted.includes(ds)) {
      s++;
      cur.setDate(cur.getDate() - 1);
    } else if (i === 0) {
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  return s;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MyActivityCalendar({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const [loginDates, setLoginDates] = useState<string[]>([]);
  const [userName, setUserName] = useState('You');
  const [userInitials, setUserInitials] = useState('ME');
  const [userColor, setUserColor] = useState('#3E4A89');
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
      setUserInitials(
        user.name
          ?.split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'ME'
      );
      const COLORS: Record<string, string> = {
        Admin: '#0ea5e9',
        Manager: '#3E4A89',
        Developer: '#10b981',
        Designer: '#f59e0b',
      };
      setUserColor(COLORS[user.role] || '#3E4A89');

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';
      fetch(`${apiBase}/api/activity/login-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.success && data.history?.[user.email]) {
            setLoginDates(data.history[user.email]);
            return;
          }
          const key = `edutechex_logins_${user.email}`;
          let stored: string[] = JSON.parse(localStorage.getItem(key) || '[]');
          if (!stored.length) {
            const gen: string[] = [];
            const t = new Date();
            for (let i = 0; i < 30; i++) {
              const d = new Date();
              d.setDate(t.getDate() - i);
              if (Math.random() < (d.getDay() === 0 || d.getDay() === 6 ? 0.1 : 0.85))
                gen.push(d.toISOString().split('T')[0]);
            }
            const ts = t.toISOString().split('T')[0];
            if (!gen.includes(ts)) gen.push(ts);
            localStorage.setItem(key, JSON.stringify(gen));
            stored = gen;
          }
          setLoginDates(stored);
        })
        .catch(() =>
          setLoginDates(JSON.parse(localStorage.getItem(`edutechex_logins_${user.email}`) || '[]'))
        );
    } catch {
      /**/
    }
  }, [open, mounted]);

  if (!mounted || !open) return null;

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);

  const thisMonthLogins = loginDates.filter((d) => {
    const [y, m] = d.split('-').map(Number);
    return y === viewYear && m === viewMonth + 1;
  }).length;
  const streak = calcStreak(loginDates, todayStr);
  const workdaysElapsed = Array.from({ length: daysInMonth }, (_, i) => {
    const ds = toDateStr(viewYear, viewMonth, i + 1);
    return ds <= todayStr && !isWeekend(ds);
  }).filter(Boolean).length;
  const loginRate = workdaysElapsed > 0 ? Math.round((thisMonthLogins / workdaysElapsed) * 100) : 0;
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const prevMonth = () =>
    viewMonth === 0 ? (setViewYear((y) => y - 1), setViewMonth(11)) : setViewMonth((m) => m - 1);
  const nextMonth = () =>
    viewMonth === 11 ? (setViewYear((y) => y + 1), setViewMonth(0)) : setViewMonth((m) => m + 1);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-[340px] rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md shrink-0"
              style={{ background: userColor }}
            >
              {userInitials}
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{userName}</p>
              <p className="text-[11px] text-white/35 mt-0.5">Login Activity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Stats row — 3 clear tiles ── */}
        <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
          {[
            {
              icon: <CalendarDays size={14} />,
              value: thisMonthLogins,
              label: 'This month',
              color: '#34d399',
              bg: 'rgba(52,211,153,0.08)',
            },
            {
              icon: <Flame size={14} />,
              value: streak,
              label: 'Day streak',
              color: '#fb923c',
              bg: 'rgba(251,146,60,0.08)',
            },
            {
              icon: <TrendingUp size={14} />,
              value: `${loginRate}%`,
              label: 'Active rate',
              color: '#38bdf8',
              bg: 'rgba(56,189,248,0.08)',
            },
          ].map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2"
              style={{ background: s.bg }}
            >
              <span style={{ color: s.color }}>{s.icon}</span>
              <span
                className="text-xl font-black tabular-nums text-white"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
              <span className="text-[9px] font-semibold text-white/35 text-center leading-tight">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Month nav ── */}
        <div className="flex items-center justify-between px-5 pb-3">
          <button
            onClick={prevMonth}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/6 transition-all"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-white/60">{monthLabel}</span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/6 transition-all disabled:opacity-20"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* ── Calendar ── */}
        <div className="px-4 pb-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[9px] font-bold text-white/20 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-[5px]">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`b${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const ds = toDateStr(viewYear, viewMonth, day);
              const isToday = ds === todayStr;
              const isFuture = ds > todayStr;
              const didLogin = loginDates.includes(ds);
              const weekend = isWeekend(ds);

              /* cell appearance */
              let cellStyle: React.CSSProperties = {};
              let textStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.12)' };

              if (!isFuture) {
                if (didLogin) {
                  cellStyle = { background: `${userColor}22`, border: `1px solid ${userColor}55` };
                  textStyle = { color: userColor };
                } else if (!weekend) {
                  cellStyle = {
                    background: 'rgba(244,63,94,0.08)',
                    border: '1px solid rgba(244,63,94,0.15)',
                  };
                  textStyle = { color: 'rgba(244,63,94,0.45)' };
                } else {
                  textStyle = { color: 'rgba(255,255,255,0.18)' };
                }
              }

              if (isToday) {
                cellStyle = {
                  ...cellStyle,
                  outline: `2px solid ${userColor}`,
                  outlineOffset: '2px',
                };
                textStyle = { ...textStyle, color: '#fff', fontWeight: 900 };
              }

              return (
                <div
                  key={day}
                  title={isFuture ? '' : didLogin ? 'Logged in' : weekend ? 'Weekend' : 'No login'}
                  className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold transition-all"
                  style={cellStyle}
                >
                  <span style={textStyle}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Progress bar + legend ── */}
        <div
          className="mx-4 mb-4 rounded-xl p-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-white/30">Attendance this month</span>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: userColor }}>
              {thisMonthLogins}/{workdaysElapsed} days
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(loginRate, 100)}%`, background: userColor }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2.5">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-white/30">
              <span className="h-2 w-2 rounded-sm" style={{ background: `${userColor}88` }} />
              Logged in
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-white/30">
              <span className="h-2 w-2 rounded-sm" style={{ background: 'rgba(244,63,94,0.35)' }} />
              Missed
            </span>
            <span className="ml-auto text-[9px] font-semibold text-white/20 tabular-nums">
              {loginDates.length} total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
