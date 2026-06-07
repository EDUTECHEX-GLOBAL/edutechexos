'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UserCheck,
  Activity,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      if (data.success && data.history) {
        setUserLogins(data.history);
      }
    } catch { /* backend unavailable — keep synthetic data */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (members.length > 0) {
      setSelectedMemberId(members[0].id);
    }

    // Fetch real login history first
    fetchRealLoginHistory().then(() => {
      // Fill in any missing members with localStorage fallback
      setUserLogins((prev) => {
        const merged: Record<string, string[]> = { ...prev };
        const current = new Date();

        members.forEach((member) => {
          if (!merged[member.email] || merged[member.email].length === 0) {
            const key = `edutechex_logins_${member.email}`;
            let stored: string[] = [];
            try { stored = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /* */ }

            if (stored.length === 0) {
              // Generate synthetic data only as fallback
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
  const selectedMember = members.find((member) => member.id === selectedMemberId) || members[0];
  const selectedLogins = selectedMember ? userLogins[selectedMember.email] || [] : [];
  const totalUsers = members.length;
  const loggedInTodayCount = members.filter((member) =>
    (userLogins[member.email] || []).includes(todayStr)
  ).length;
  const attendancePercentage =
    totalUsers > 0 ? Math.round((loggedInTodayCount / totalUsers) * 100) : 0;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const activeDaysThisMonth = selectedLogins.filter((entry) => {
    const date = new Date(entry);
    return date.getFullYear() === viewYear && date.getMonth() === viewMonth;
  }).length;

  const monthCoverage = daysInMonth > 0 ? Math.round((activeDaysThisMonth / daysInMonth) * 100) : 0;

  const teamInsights = useMemo(
    () =>
      members.map((member) => {
        const logins = userLogins[member.email] || [];
        return {
          ...member,
          logins,
          loggedInToday: logins.includes(todayStr),
          streak: calcStreak(logins, todayStr),
        };
      }),
    [members, todayStr, userLogins]
  );

  const emptyCount = firstDayIndex;
  const totalCells = Math.ceil((emptyCount + daysInMonth) / 7) * 7;

  const handleSimulateLoginDate = (email: string, dateStr: string) => {
    const key = `edutechex_logins_${email}`;
    const existing: string[] = userLogins[email] || [];
    let updated: string[];

    if (existing.includes(dateStr)) {
      updated = existing.filter((d) => d !== dateStr);
      toast.success(`Attendance removed for ${dateStr}`);
    } else {
      updated = [...existing, dateStr];
      toast.success(`Attendance saved for ${dateStr}`);
    }

    localStorage.setItem(key, JSON.stringify(updated));
    setUserLogins((prev) => ({ ...prev, [email]: updated }));
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400 shadow-sm">
        Loading attendance calendar...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_70px_-36px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#eef2ff_40%,#ffffff_100%)] px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">
              Attendance Command Center
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Admin activity calendar
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Review daily login patterns, jump between team members, and correct attendance
              directly from the calendar grid.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Users size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Team size
                  </p>
                  <p className="text-lg font-black text-slate-950">{totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Active today
                  </p>
                  <p className="text-lg font-black text-slate-950">{loggedInTodayCount}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  <Activity size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Attendance
                  </p>
                  <p className="text-lg font-black text-slate-950">{attendancePercentage}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-950 p-4 text-white xl:border-b-0 xl:border-r">
          <div className="mb-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Team roster
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-300">
              Select a teammate to review their month-by-month attendance.
            </p>
          </div>

          <div className="space-y-2">
            {teamInsights.map((member) => {
              const isSelected = member.id === selectedMemberId;
              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`w-full cursor-pointer rounded-[1.5rem] border p-4 text-left transition ${
                    isSelected
                      ? 'border-indigo-300 bg-white text-slate-950 shadow-lg shadow-black/10'
                      : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-black"
                        style={{
                          color: isSelected ? '#ffffff' : member.color,
                          backgroundColor: isSelected ? member.color : `${member.color}22`,
                        }}
                      >
                        {member.initials}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-black ${isSelected ? 'text-slate-950' : 'text-white'}`}
                        >
                          {member.name}
                        </p>
                        <p
                          className={`truncate text-xs font-semibold ${isSelected ? 'text-slate-500' : 'text-slate-400'}`}
                        >
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSimulateLoginDate(member.email, todayStr);
                      }}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                        member.loggedInToday
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {member.loggedInToday ? 'Reset today' : 'Check in'}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-black">
                    <span className={isSelected ? 'text-slate-500' : 'text-slate-400'}>
                      {member.logins.length} total active days
                    </span>
                    <span className={isSelected ? 'text-indigo-600' : 'text-indigo-300'}>
                      {member.streak} day streak
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <UserCheck size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Selected member
                </p>
                <h3 className="text-lg font-black text-slate-950">
                  {selectedMember?.name ?? 'No member selected'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={handlePrevMonth}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <span className="min-w-[8.5rem] text-center text-sm font-black text-slate-800">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Month coverage
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{monthCoverage}%</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {activeDaysThisMonth} active day{activeDaysThisMonth === 1 ? '' : 's'} in this month
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Current streak
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {selectedMember ? calcStreak(selectedLogins, todayStr) : 0} days
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Consecutive active days including today when present
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Quick tip
              </p>
              <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-slate-500">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-indigo-500" />
                Click any calendar day to toggle that member&apos;s attendance.
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 px-3 py-3">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 p-3 sm:p-4">
              {Array.from({ length: totalCells }).map((_, index) => {
                const dayNumber = index - emptyCount + 1;

                if (dayNumber < 1 || dayNumber > daysInMonth) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="aspect-square rounded-[1.25rem] border border-dashed border-slate-100 bg-slate-50/70"
                    />
                  );
                }

                const dateObj = new Date(viewYear, viewMonth, dayNumber);
                const dateStr = toDateStr(dateObj);
                const isLogged = selectedLogins.includes(dateStr);
                const isTodayCell = dateStr === todayStr;

                return (
                  <button
                    key={`day-${dayNumber}`}
                    type="button"
                    onClick={() =>
                      selectedMember && handleSimulateLoginDate(selectedMember.email, dateStr)
                    }
                    className={`aspect-square rounded-[1.25rem] border p-2 text-left transition ${
                      isLogged
                        ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                    } ${isTodayCell ? 'ring-2 ring-amber-300 ring-offset-2' : ''}`}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div
                        className={`text-[11px] font-black ${isLogged ? 'text-white' : 'text-slate-600'}`}
                      >
                        {dayNumber}
                      </div>
                      <div className="flex items-end justify-between">
                        <span
                          className={`text-[10px] font-black uppercase tracking-[0.08em] ${isLogged ? 'text-emerald-300' : 'text-slate-300'}`}
                        >
                          {isLogged ? 'In' : 'Out'}
                        </span>
                        <span
                          className={`h-3 w-3 rounded-full ${
                            isLogged ? 'bg-emerald-400' : 'bg-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
