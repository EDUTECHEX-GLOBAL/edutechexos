'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  Clock,
  Flame,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(date: Date) {
  return date.toISOString().split('T')[0];
}

function calcStreak(loginDates: string[], todayStr: string): number {
  let streak = 0;
  const sorted = [...loginDates].sort().reverse();
  const check = new Date(todayStr);
  for (let i = 0; i < 365; i++) {
    const d = check.toISOString().split('T')[0];
    if (sorted.includes(d)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else if (i === 0) {
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function LoginTrackerCalendar() {
  const { members } = useDashboardStore();
  const [mounted, setMounted] = useState(false);
  const [userLogins, setUserLogins] = useState<Record<string, string[]>>({});
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const fetchRealLoginHistory = useCallback(async () => {
    try {
      const authData = localStorage.getItem('edutechex_token');
      const token = authData ? JSON.parse(authData).token : null;
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/login-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.history) setUserLogins(data.history);
    } catch { /* backend unavailable */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (members.length > 0) setSelectedMemberId(members[0].id);
    fetchRealLoginHistory().then(() => {
      setUserLogins((prev) => {
        const merged: Record<string, string[]> = { ...prev };
        const current = new Date();
        members.forEach((member) => {
          if (!merged[member.email] || merged[member.email].length === 0) {
            const key = `edutechex_logins_${member.email}`;
            let stored: string[] = [];
            try { stored = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /* */ }
            if (stored.length === 0) {
              const generated: string[] = [];
              for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(current.getDate() - i);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                let prob = 0.85;
                if (member.role === 'Manager') prob = 0.95;
                if (member.role === 'Designer') prob = 0.75;
                if (isWeekend) prob = 0.12;
                if (Math.random() < prob) generated.push(date.toISOString().split('T')[0]);
              }
              localStorage.setItem(key, JSON.stringify(generated));
              stored = generated;
            }
            merged[member.email] = stored;
          }
        });
        return merged;
      });
    });
  }, [members, fetchRealLoginHistory]);

  const todayStr = toDateStr(today);
  const selectedMember = members.find(m => m.id === selectedMemberId) || members[0];
  const selectedLogins = selectedMember ? userLogins[selectedMember.email] || [] : [];

  const totalUsers = members.length;
  const loggedInTodayCount = members.filter(m => (userLogins[m.email] || []).includes(todayStr)).length;
  const attendancePercentage = totalUsers > 0 ? Math.round((loggedInTodayCount / totalUsers) * 100) : 0;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const activeDaysThisMonth = selectedLogins.filter(e => {
    const d = new Date(e);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length;

  // Working days so far this month
  const todayDay = today.getDate();
  let workingDaysThisMonth = 0;
  for (let d = 1; d <= Math.min(daysInMonth, todayDay); d++) {
    const dow = new Date(viewYear, viewMonth, d).getDay();
    if (dow !== 0 && dow !== 6) workingDaysThisMonth++;
  }
  const leaveThisMonth = Math.max(0, workingDaysThisMonth - activeDaysThisMonth);
  const attendanceRate = workingDaysThisMonth > 0
    ? Math.round((activeDaysThisMonth / workingDaysThisMonth) * 100)
    : 0;
  const currentStreak = selectedMember ? calcStreak(selectedLogins, todayStr) : 0;

  const teamInsights = useMemo(() =>
    members.map(member => {
      const logins = userLogins[member.email] || [];
      let workDays = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (d.getDay() !== 0 && d.getDay() !== 6) workDays++;
      }
      const attended = logins.length;
      const leave = Math.max(0, workDays - attended);
      return {
        ...member, logins,
        loggedInToday: logins.includes(todayStr),
        streak: calcStreak(logins, todayStr),
        attended, leave, workDays,
        rate: workDays > 0 ? Math.round((attended / workDays) * 100) : 0,
      };
    }),
    [members, todayStr, userLogins] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSimulateLoginDate = (email: string, dateStr: string) => {
    const existing = userLogins[email] || [];
    const updated = existing.includes(dateStr)
      ? existing.filter(d => d !== dateStr)
      : [...existing, dateStr];
    const verb = existing.includes(dateStr) ? 'removed' : 'marked';
    toast.success(`Attendance ${verb} for ${dateStr}`);
    const key = `edutechex_logins_${email}`;
    localStorage.setItem(key, JSON.stringify(updated));
    setUserLogins(prev => ({ ...prev, [email]: updated }));
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  if (!mounted) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
        Loading attendance…
      </div>
    );
  }

  const rateColor = attendanceRate >= 80 ? '#16a34a' : attendanceRate >= 60 ? '#d97706' : '#dc2626';
  const rateBg   = attendanceRate >= 80 ? '#f0fdf4' : attendanceRate >= 60 ? '#fffbeb' : '#fef2f2';
  const rateBorder= attendanceRate >= 80 ? '#bbf7d0' : attendanceRate >= 60 ? '#fde68a' : '#fecaca';

  return (
    <div style={{
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      background: '#ffffff',
      boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
      overflow: 'hidden',
    }}>

      {/* ── Top header bar ── */}
      <div style={{
        padding: '20px 24px 18px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <Calendar size={15} color="#6366f1" strokeWidth={2.5} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Attendance Tracker
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Team Attendance Calendar
          </h2>
        </div>

        {/* Global stat chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Chip icon={<Users size={12} strokeWidth={2.5} />} label="Team" value={`${totalUsers}`} color="#6366f1" bg="#eef2ff" border="#c7d2fe" />
          <Chip icon={<CheckCircle2 size={12} strokeWidth={2.5} />} label="In today" value={`${loggedInTodayCount}`} color="#16a34a" bg="#f0fdf4" border="#bbf7d0" />
          <Chip icon={<TrendingUp size={12} strokeWidth={2.5} />} label="Rate" value={`${attendancePercentage}%`} color={attendancePercentage >= 75 ? '#16a34a' : '#d97706'} bg={attendancePercentage >= 75 ? '#f0fdf4' : '#fffbeb'} border={attendancePercentage >= 75 ? '#bbf7d0' : '#fde68a'} />
        </div>
      </div>

      {/* ── Body: roster + calendar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr' }}>

        {/* Left: Team roster */}
        <div style={{
          borderRight: '1px solid #f1f5f9',
          background: '#fafafa',
          maxHeight: '540px',
          overflowY: 'auto',
          padding: '12px 10px',
        }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 6px 8px', margin: 0 }}>
            Team Members
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {teamInsights.map(member => {
              const selected = member.id === selectedMemberId;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 10px 9px',
                    borderRadius: '10px',
                    border: selected ? '1px solid #c7d2fe' : '1px solid transparent',
                    background: selected ? '#eef2ff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; }}
                  onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{
                      flexShrink: 0, width: '32px', height: '32px', borderRadius: '8px',
                      background: selected ? member.color : `${member.color}22`,
                      color: selected ? '#fff' : member.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 800,
                    }}>
                      {member.initials}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: selected ? '#3730a3' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '10px', color: selected ? '#6366f1' : '#94a3b8', fontWeight: 600 }}>
                        {member.role}
                      </p>
                    </div>
                  </div>

                  {/* Present / Leave / Rate row */}
                  <div style={{ marginTop: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                      {member.attended}P
                    </span>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: member.leave > 0 ? '#dc2626' : '#94a3b8', background: member.leave > 0 ? '#fef2f2' : '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${member.leave > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                      {member.leave}L
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '9.5px', fontWeight: 700, color: member.loggedInToday ? '#16a34a' : '#94a3b8' }}>
                      {member.loggedInToday ? '● in' : '○ out'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: calendar panel */}
        <div style={{ padding: '20px 20px 20px', background: '#fff' }}>

          {/* Member name + month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                background: selectedMember ? `${selectedMember.color}22` : '#f1f5f9',
                color: selectedMember?.color ?? '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 800,
              }}>
                {selectedMember?.initials ?? '?'}
              </span>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedMember?.name ?? 'Select a member'}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {selectedMember?.role}
                </p>
              </div>
            </div>

            {/* Month navigator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '2px',
              background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '3px',
            }}>
              <button onClick={handlePrevMonth} style={{ padding: '5px 7px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
              <span style={{ padding: '0 8px', fontSize: '12px', fontWeight: 800, color: '#1e293b', minWidth: '110px', textAlign: 'center' }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={handleNextMonth} style={{ padding: '5px 7px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Stat cards row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <StatCard
              icon={<CheckCircle2 size={13} strokeWidth={2.5} color="#16a34a" />}
              label="Present" value={String(activeDaysThisMonth)}
              sub="days this month"
              bg="#f0fdf4" border="#bbf7d0" valueColor="#16a34a"
            />
            <StatCard
              icon={<Clock size={13} strokeWidth={2.5} color={leaveThisMonth > 0 ? '#dc2626' : '#94a3b8'} />}
              label="On Leave" value={String(leaveThisMonth)}
              sub="working days missed"
              bg={leaveThisMonth > 0 ? '#fef2f2' : '#f8fafc'}
              border={leaveThisMonth > 0 ? '#fecaca' : '#e2e8f0'}
              valueColor={leaveThisMonth > 0 ? '#dc2626' : '#94a3b8'}
            />
            <StatCard
              icon={<TrendingUp size={13} strokeWidth={2.5} color={rateColor} />}
              label="Rate" value={`${attendanceRate}%`}
              sub={`of ${workingDaysThisMonth} work days`}
              bg={rateBg} border={rateBorder} valueColor={rateColor}
            />
            <StatCard
              icon={<Flame size={13} strokeWidth={2.5} color="#f97316" />}
              label="Streak" value={String(currentStreak)}
              sub="consecutive days"
              bg="#fff7ed" border="#fed7aa" valueColor="#ea580c"
            />
          </div>

          {/* Calendar grid */}
          <div style={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            {/* Weekday header */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              padding: '8px 4px',
            }}>
              {WEEKDAYS_SHORT.map((d, i) => (
                <div key={d + i} style={{
                  textAlign: 'center', fontSize: '10px', fontWeight: 800,
                  color: (i === 0 || i === 6) ? '#cbd5e1' : '#94a3b8',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', padding: '6px' }}>
              {Array.from({ length: totalCells }).map((_, index) => {
                const dayNumber = index - firstDayIndex + 1;

                if (dayNumber < 1 || dayNumber > daysInMonth) {
                  return <div key={`e${index}`} style={{ aspectRatio: '1' }} />;
                }

                const dateObj = new Date(viewYear, viewMonth, dayNumber);
                const dateStr = toDateStr(dateObj);
                const isLogged = selectedLogins.includes(dateStr);
                const isTodayCell = dateStr === todayStr;
                const dow = dateObj.getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isFuture = dateStr > todayStr;

                let bg = '#f8fafc';
                let border = '1px solid #f1f5f9';
                let numColor = '#94a3b8';
                let statusColor = 'transparent';
                let hoverBg = '#f1f5f9';

                if (isLogged) {
                  bg = '#eef2ff';
                  border = '1px solid #c7d2fe';
                  numColor = '#3730a3';
                  statusColor = '#6366f1';
                  hoverBg = '#e0e7ff';
                } else if (isFuture || isWeekend) {
                  bg = 'transparent';
                  border = '1px solid transparent';
                  numColor = '#cbd5e1';
                  hoverBg = 'transparent';
                } else {
                  bg = '#fff';
                  border = '1px solid #f1f5f9';
                  numColor = '#475569';
                  hoverBg = '#f8fafc';
                }

                return (
                  <button
                    key={`d${dayNumber}`}
                    type="button"
                    onClick={() => selectedMember && handleSimulateLoginDate(selectedMember.email, dateStr)}
                    title={isLogged ? `${dateStr} — Present (click to remove)` : isFuture ? '' : `${dateStr} — Absent (click to mark present)`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '8px',
                      border: isTodayCell ? '2px solid #f59e0b' : border,
                      background: bg,
                      cursor: isFuture ? 'default' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      transition: 'all 0.1s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isFuture && !isWeekend) (e.currentTarget as HTMLButtonElement).style.background = hoverBg; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = bg; }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: numColor, lineHeight: 1 }}>
                      {dayNumber}
                    </span>
                    {!isFuture && !isWeekend && (
                      <span style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: isLogged ? statusColor : '#e2e8f0',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <LegendItem dot="#6366f1" bg="#eef2ff" border="#c7d2fe" label="Present" />
            <LegendItem dot="#e2e8f0" bg="#fff" border="#f1f5f9" label="Absent" />
            <LegendItem dot="transparent" bg="transparent" border="transparent" label="Weekend" textColor="#cbd5e1" />
            <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
              Click a day to toggle attendance
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ── */

function Chip({ icon, label, value, color, bg, border }: {
  icon: React.ReactNode; label: string; value: string;
  color: string; bg: string; border: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '6px 10px', borderRadius: '8px',
      background: bg, border: `1px solid ${border}`,
    }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, sub, bg, border, valueColor }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  bg: string; border: string; valueColor: string;
}) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: '10px',
      background: bg, border: `1px solid ${border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
        {icon}
        <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: valueColor, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '3px 0 0', fontSize: '9.5px', color: '#94a3b8', fontWeight: 600 }}>{sub}</p>
    </div>
  );
}

function LegendItem({ dot, bg, border, label, textColor }: {
  dot: string; bg: string; border: string; label: string; textColor?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {dot !== 'transparent' && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dot }} />}
      </span>
      <span style={{ fontSize: '10px', fontWeight: 600, color: textColor ?? '#64748b' }}>{label}</span>
    </div>
  );
}
