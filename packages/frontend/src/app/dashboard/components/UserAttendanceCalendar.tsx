'use client';

import React, { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toIST(date: Date): string {
  return new Date(date.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
}

export default function UserAttendanceCalendar() {
  const [loginDates, setLoginDates] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const today = new Date();
  const todayStr = toIST(today);
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem('edutechex_token');
    let token: string | null = null;
    try { token = JSON.parse(raw!).token; } catch { return; }
    if (!token) return;

    fetch(`${API_BASE}/api/activity/my-attendance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((data: { success: boolean; dates?: string[] } | null) => {
        if (data?.success && Array.isArray(data.dates)) setLoginDates(data.dates);
      })
      .catch(() => {
        try {
          const email = JSON.parse(raw!).user?.email;
          const stored = JSON.parse(localStorage.getItem(`edutechex_logins_${email}`) || '[]');
          if (Array.isArray(stored)) setLoginDates(stored);
        } catch { /* ignore */ }
      });
  }, []);

  if (!mounted) return null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonthDates = loginDates.filter(d => d.startsWith(prefix));
  const presentCount = thisMonthDates.length;

  let workingDays = 0;
  for (let d = 1; d <= Math.min(daysInMonth, todayDay); d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) workingDays++;
  }
  const leaveCount = Math.max(0, workingDays - presentCount);
  const rate = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 0;

  return (
    <div style={{ marginBottom: '6px' }}>

      {/* ── Toggle bar ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 8px',
          borderRadius: '8px',
          border: open ? '1px solid rgba(74,90,223,0.25)' : '1px solid transparent',
          background: open ? 'rgba(74,90,223,0.1)' : 'rgba(255,255,255,0.03)',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {/* calendar icon via CSS */}
          <span style={{
            width: '14px', height: '14px', borderRadius: '3px',
            border: '1.5px solid rgba(74,90,223,0.7)',
            flexShrink: 0, position: 'relative', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '7px', fontWeight: 900, color: '#818CF8', lineHeight: 1 }}>
              {todayDay}
            </span>
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'rgba(185,194,215,0.9)', letterSpacing: '0.01em' }}>
            {MONTH_NAMES[month].slice(0, 3)} Attendance
          </span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            fontSize: '9px', fontWeight: 800, color: '#4ade80',
            background: 'rgba(74,222,128,0.12)', padding: '1px 5px', borderRadius: '4px',
          }}>
            {presentCount}P
          </span>
          <span style={{
            fontSize: '9px', fontWeight: 800,
            color: leaveCount > 0 ? '#f87171' : 'rgba(100,115,145,0.5)',
            background: leaveCount > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)',
            padding: '1px 5px', borderRadius: '4px',
          }}>
            {leaveCount}L
          </span>
          <span style={{ fontSize: '8px', color: 'rgba(100,115,145,0.5)', marginLeft: '1px' }}>
            {open ? '▲' : '▼'}
          </span>
        </span>
      </button>

      {/* ── Expanded panel ── */}
      {open && (
        <div style={{
          marginTop: '4px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(15,20,38,0.6)',
          overflow: 'hidden',
        }}>

          {/* Month header */}
          <div style={{
            padding: '8px 10px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(185,194,215,0.95)', letterSpacing: '0.05em' }}>
              {MONTH_NAMES[month].toUpperCase()} {year}
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 700,
              color: rate >= 80 ? '#4ade80' : rate >= 60 ? '#fbbf24' : '#f87171',
              background: rate >= 80 ? 'rgba(74,222,128,0.1)' : rate >= 60 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
              padding: '2px 6px', borderRadius: '4px',
            }}>
              {rate}% rate
            </span>
          </div>

          <div style={{ padding: '8px 8px 4px' }}>
            {/* Day labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
              {DAY_LABELS.map((l, i) => (
                <div key={i} style={{
                  textAlign: 'center', fontSize: '7.5px', fontWeight: 800,
                  color: (i === 0 || i === 6) ? 'rgba(100,115,145,0.4)' : 'rgba(100,115,145,0.55)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {l}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: totalCells }).map((_, idx) => {
                const day = idx - firstDay + 1;
                if (day < 1 || day > daysInMonth) return <div key={idx} style={{ aspectRatio: '1' }} />;

                const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const isPresent = loginDates.includes(dateStr);
                const isFuture = dateStr > todayStr;
                const dow = new Date(year, month, day).getDay();
                const isWeekend = dow === 0 || dow === 6;

                let bg = 'rgba(255,255,255,0.03)';
                let textColor = 'rgba(100,115,145,0.4)';
                let dotColor = 'transparent';

                if (isPresent) {
                  bg = 'rgba(74,222,128,0.15)';
                  textColor = 'rgba(134,239,172,0.95)';
                  dotColor = '#4ade80';
                } else if (isFuture) {
                  bg = 'transparent';
                  textColor = 'rgba(100,115,145,0.2)';
                } else if (isWeekend) {
                  bg = 'transparent';
                  textColor = 'rgba(100,115,145,0.25)';
                } else {
                  bg = 'rgba(248,113,113,0.07)';
                  textColor = 'rgba(248,113,113,0.4)';
                  dotColor = 'rgba(248,113,113,0.35)';
                }

                return (
                  <div
                    key={idx}
                    title={isPresent ? 'Present' : isFuture ? '' : isWeekend ? 'Weekend' : 'Absent'}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '5px',
                      background: bg,
                      position: 'relative',
                      outline: isToday ? '1.5px solid rgba(251,191,36,0.7)' : 'none',
                      outlineOffset: '-1px',
                    }}
                  >
                    <span style={{ fontSize: '8.5px', fontWeight: 700, color: textColor, lineHeight: 1 }}>
                      {day}
                    </span>
                    {dotColor !== 'transparent' && (
                      <span style={{
                        position: 'absolute', bottom: '2px',
                        width: '3px', height: '3px', borderRadius: '50%',
                        background: dotColor,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer summary */}
          <div style={{
            margin: '4px 8px 8px',
            padding: '6px 8px',
            borderRadius: '7px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 700, color: '#4ade80' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '2px', background: 'rgba(74,222,128,0.5)', display: 'inline-block' }} />
              {presentCount} present
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 700, color: leaveCount > 0 ? '#f87171' : 'rgba(100,115,145,0.4)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '2px', background: leaveCount > 0 ? 'rgba(248,113,113,0.4)' : 'rgba(100,115,145,0.15)', display: 'inline-block' }} />
              {leaveCount} leave
            </span>
            <span style={{ fontSize: '9px', color: 'rgba(100,115,145,0.45)', fontWeight: 600 }}>
              {workingDays} work days
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
