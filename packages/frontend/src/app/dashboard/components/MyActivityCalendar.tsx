'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, CalendarDays, Flame, TrendingUp, Clock, Plus, Check, Loader2, Trash2 } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

type Slot = { time: string; status: 'available' | 'busy' | 'ooo'; label?: string };

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('edutechex_token');
    return raw ? JSON.parse(raw).token ?? null : null;
  } catch { return null; }
}

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
  const [userEmail, setUserEmail] = useState('');
  const [availByDate, setAvailByDate] = useState<Record<string, Slot[]>>({});
  const [editDate, setEditDate] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const loadAvailability = useCallback(async (email: string) => {
    const token = getAuthToken();
    if (!token || !email) return;
    const month = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    try {
      const res = await fetch(`${API_BASE}/api/availability?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        const mine: Record<string, Slot[]> = {};
        data.records
          .filter((r: { adminEmail?: string }) => (r.adminEmail || '').toLowerCase() === email.toLowerCase())
          .forEach((r: { date: string; slots: Slot[] }) => { mine[r.date] = r.slots || []; });
        setAvailByDate(mine);
      }
    } catch { /* offline */ }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    if (open && userEmail) loadAvailability(userEmail);
  }, [open, userEmail, loadAvailability]);

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
      setUserEmail(user.email || '');
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

      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';
      fetch(`${apiBase}/api/activity/login-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.success && data.history?.[user.email]) {
            setLoginDates(data.history[user.email]);
            return;
          }
          // Fall back to localStorage only (no fake random data)
          const stored: string[] = JSON.parse(
            localStorage.getItem(`edutechex_logins_${user.email}`) || '[]'
          );
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
              const isPast = ds < todayStr;
              const didLogin = loginDates.includes(ds);
              const weekend = isWeekend(ds);
              const hasAvail = (availByDate[ds]?.length ?? 0) > 0;
              // Backend only allows setting availability for today or future days.
              const canEditAvail = !isPast;

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
                <button
                  key={day}
                  type="button"
                  disabled={!canEditAvail}
                  onClick={() => canEditAvail && setEditDate(ds)}
                  title={
                    canEditAvail
                      ? (hasAvail ? 'Availability set — click to edit' : 'Click to set availability')
                      : didLogin ? 'Logged in' : weekend ? 'Weekend' : 'No login'
                  }
                  className={`relative aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${canEditAvail ? 'cursor-pointer hover:ring-1 hover:ring-white/30' : 'cursor-default'}`}
                  style={cellStyle}
                >
                  <span style={textStyle}>{day}</span>
                  {hasAvail && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full"
                      style={{ background: '#34d399' }}
                    />
                  )}
                </button>
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
          <p className="mt-2.5 flex items-center gap-1.5 text-[9px] font-medium text-white/30">
            <Clock size={10} className="text-emerald-400" />
            Tap any day from today onward to set your availability
          </p>
        </div>
      </div>

      {editDate && (
        <AvailabilityEditor
          dateStr={editDate}
          initialSlots={availByDate[editDate] ?? []}
          onClose={() => setEditDate(null)}
          onSaved={(date, slots) => {
            setAvailByDate((prev) => {
              const next = { ...prev };
              if (slots.length === 0) delete next[date];
              else next[date] = slots;
              return next;
            });
            setEditDate(null);
          }}
        />
      )}
    </div>
  );
}

function AvailabilityEditor({
  dateStr,
  initialSlots,
  onClose,
  onSaved,
}: {
  dateStr: string;
  initialSlots: Slot[];
  onClose: () => void;
  onSaved: (date: string, slots: Slot[]) => void;
}) {
  const isAllDayInitial = initialSlots.length === 1 && initialSlots[0].time === 'all-day';
  const [mode, setMode] = useState<'all-day' | 'ranges'>(
    initialSlots.length > 0 && !isAllDayInitial ? 'ranges' : 'all-day'
  );
  const [ranges, setRanges] = useState<Array<{ from: string; to: string }>>(
    isAllDayInitial || initialSlots.length === 0
      ? [{ from: '09:00', to: '17:00' }]
      : initialSlots.map((s) => {
          const [from, to] = s.time.split('-');
          return { from: from || '09:00', to: to || '17:00' };
        })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const prettyDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  function updateRange(i: number, field: 'from' | 'to', value: string) {
    setRanges((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function save(clear = false) {
    setSaving(true);
    setError('');
    let slots: Slot[] = [];
    if (!clear) {
      if (mode === 'all-day') {
        slots = [{ time: 'all-day', status: 'available', label: 'Available all day' }];
      } else {
        const valid = ranges.filter((r) => r.from && r.to && r.from < r.to);
        if (valid.length === 0) {
          setError('Add at least one valid time range (start before end).');
          setSaving(false);
          return;
        }
        slots = valid.map((r) => ({ time: `${r.from}-${r.to}`, status: 'available' as const, label: '' }));
      }
    }
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE}/api/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: dateStr, slots }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Could not save.'); setSaving(false); return; }
      onSaved(dateStr, slots);
    } catch {
      setError('Network error — please try again.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[320px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
          <div>
            <p className="text-sm font-bold text-white">Set availability</p>
            <p className="text-[11px] text-white/40 mt-0.5">{prettyDate}</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            {(['all-day', 'ranges'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
                  mode === m
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 text-white/40 border-white/5 hover:text-white/70'
                }`}
              >
                {m === 'all-day' ? 'Available all day' : 'Specific times'}
              </button>
            ))}
          </div>

          {mode === 'ranges' && (
            <div className="space-y-2">
              {ranges.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={r.from}
                    onChange={(e) => updateRange(i, 'from', e.target.value)}
                    className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-white/30 text-xs">to</span>
                  <input
                    type="time"
                    value={r.to}
                    onChange={(e) => updateRange(i, 'to', e.target.value)}
                    className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                  {ranges.length > 1 && (
                    <button
                      onClick={() => setRanges((prev) => prev.filter((_, idx) => idx !== i))}
                      className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-white/30 hover:text-rose-400 hover:bg-white/5"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setRanges((prev) => [...prev, { from: '09:00', to: '17:00' }])}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Plus size={12} /> Add time range
              </button>
            </div>
          )}

          {error && <p className="text-[11px] text-rose-400">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            {initialSlots.length > 0 && (
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="rounded-xl px-3 py-2 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-all disabled:opacity-50"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {saving ? 'Saving…' : 'Save availability'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
