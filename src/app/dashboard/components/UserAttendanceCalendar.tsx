'use client';

import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toIST(date: Date): string {
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(date.getTime() + offset).toISOString().slice(0, 10);
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

export default function UserAttendanceCalendar() {
  const [loginDates, setLoginDates] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const today = new Date();
  const todayStr = toIST(today);
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  useEffect(() => {
    setMounted(true);
    const authData = localStorage.getItem('edutechex_token');
    if (!authData) return;
    let token: string | null = null;
    try { token = JSON.parse(authData).token; } catch { return; }
    if (!token) return;

    fetch(`${API_BASE}/api/my-attendance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { success: boolean; dates?: string[] } | null) => {
        if (data?.success && Array.isArray(data.dates)) {
          setLoginDates(data.dates);
        }
      })
      .catch(() => {
        // fallback: try localStorage
        const authRaw = localStorage.getItem('edutechex_token');
        if (!authRaw) return;
        try {
          const email = JSON.parse(authRaw)?.user?.email;
          if (!email) return;
          const key = `edutechex_logins_${email}`;
          const stored = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(stored)) setLoginDates(stored);
        } catch { /* ignore */ }
      });
  }, []);

  if (!mounted) return null;

  // Calendar grid for current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  // Stats for this month
  const thisMonthDates = loginDates.filter((d) => {
    const [y, m] = d.split('-').map(Number);
    return y === year && m === month + 1;
  });
  const presentCount = thisMonthDates.length;

  // Working days so far this month (Mon–Fri, up to today or end of month)
  const todayDay = today.getDate();
  let workingDaysSoFar = 0;
  for (let d = 1; d <= Math.min(daysInMonth, todayDay); d++) {
    if (!isWeekend(year, month, d)) workingDaysSoFar++;
  }
  const leaveCount = Math.max(0, workingDaysSoFar - presentCount);

  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  return (
    <div className="mb-2">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
        style={{ color: 'rgba(180,188,210,0.85)' }}
      >
        <span className="flex items-center gap-1.5">
          <CalendarDays size={12} style={{ color: '#4A5ADF' }} />
          <span className="text-[10px] font-semibold tracking-wide">
            {MONTH_NAMES[month]} Attendance
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold"
            style={{ color: '#4ade80' }}
          >
            {presentCount}P
          </span>
          <span
            className="text-[10px] font-bold"
            style={{ color: leaveCount > 0 ? '#f87171' : 'rgba(124,133,158,0.6)' }}
          >
            {leaveCount}L
          </span>
          {open
            ? <ChevronUp size={10} />
            : <ChevronDown size={10} />}
        </span>
      </button>

      {/* Expanded calendar grid */}
      {open && (
        <div
          className="mt-1 rounded-xl px-2 pb-2.5 pt-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Weekday headers */}
          <div className="mb-1.5 grid grid-cols-7 gap-0.5">
            {WEEKDAY_LABELS.map((l, i) => (
              <div
                key={i}
                className="text-center text-[8px] font-bold uppercase"
                style={{ color: 'rgba(124,133,158,0.55)' }}
              >
                {l}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDayOfWeek + 1;

              if (dayNum < 1 || dayNum > daysInMonth) {
                return <div key={idx} className="aspect-square" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isPresent = loginDates.includes(dateStr);
              const isFuture = dateStr > todayStr;
              const weekend = isWeekend(year, month, dayNum);

              let bg = 'rgba(255,255,255,0.04)';
              let textColor = 'rgba(124,133,158,0.35)';
              let ring = 'none';

              if (isFuture) {
                bg = 'transparent';
                textColor = 'rgba(124,133,158,0.2)';
              } else if (isPresent) {
                bg = 'rgba(74,222,128,0.22)';
                textColor = '#4ade80';
              } else if (weekend) {
                bg = 'rgba(255,255,255,0.03)';
                textColor = 'rgba(124,133,158,0.25)';
              } else {
                // Weekday absent
                bg = 'rgba(248,113,113,0.1)';
                textColor = 'rgba(248,113,113,0.55)';
              }

              if (isToday) {
                ring = '1.5px solid #f59e0b';
              }

              return (
                <div
                  key={idx}
                  className="aspect-square flex items-center justify-center rounded-sm text-[8px] font-bold"
                  style={{
                    background: bg,
                    color: textColor,
                    outline: ring,
                    outlineOffset: '-1px',
                  }}
                  title={isPresent ? `${dateStr} — Present` : isFuture ? '' : weekend ? `${dateStr} — Weekend` : `${dateStr} — Absent`}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>

          {/* Summary row */}
          <div
            className="mt-2 flex items-center justify-between rounded-lg px-2 py-1.5"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: '#4ade80' }}>
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: 'rgba(74,222,128,0.4)' }}
              />
              {presentCount} Present
            </span>
            <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: leaveCount > 0 ? '#f87171' : 'rgba(124,133,158,0.4)' }}>
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: leaveCount > 0 ? 'rgba(248,113,113,0.3)' : 'rgba(124,133,158,0.1)' }}
              />
              {leaveCount} Leave
            </span>
            <span className="text-[9px] font-semibold" style={{ color: 'rgba(124,133,158,0.5)' }}>
              {workingDaysSoFar} working days
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
