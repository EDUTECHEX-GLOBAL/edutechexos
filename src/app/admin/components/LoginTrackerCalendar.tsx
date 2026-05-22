'use client';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(date: Date) {
  return date.toISOString().split('T')[0];
}

function calcStreak(loginDates: string[], todayStr: string): number {
  let streak = 0;
  const sorted = [...loginDates].sort().reverse();
  let check = new Date(todayStr);
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
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  
  // Calendar View State
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    setMounted(true);
    // Load or populate logins for all members
    const logins: Record<string, string[]> = {};
    const today = new Date();

    members.forEach((m) => {
      const key = `edutechex_logins_${m.email}`;
      let stored = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Auto-populate logs if empty to give immediate tracking data
      if (stored.length === 0) {
        const generated: string[] = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          
          let prob = 0.85; // default 85% attendance
          if (m.role === 'Manager') prob = 0.95;
          if (m.role === 'Designer') prob = 0.75;
          if (isWeekend) prob = 0.12; // low weekend activity
          
          if (Math.random() < prob) {
            generated.push(date.toISOString().split('T')[0]);
          }
        }
        
        // Ensure today is checked-in for active demo sync
        const todayStr = today.toISOString().split('T')[0];
        if (m.status === 'online' && !generated.includes(todayStr)) {
          generated.push(todayStr);
        }

        localStorage.setItem(key, JSON.stringify(generated));
        stored = generated;
      }

      logins[m.email] = stored;
    });
    setUserLogins(logins);

    if (members.length > 0) {
      setSelectedMemberId(members[0].id);
    }
  }, [members]);

  if (!mounted) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm font-bold shadow-sm">
        Loading Attendance Calendar...
      </div>
    );
  }

  const todayStr = toDateStr(today);
  const selectedMember = members.find(m => m.id === selectedMemberId) || members[0];

  const handleSimulateLoginDate = (email: string, dateStr: string) => {
    const key = `edutechex_logins_${email}`;
    const existing: string[] = userLogins[email] || [];
    let updated: string[];

    if (existing.includes(dateStr)) {
      updated = existing.filter(d => d !== dateStr);
      toast.success(`Removed attendance for ${dateStr}`);
    } else {
      updated = [...existing, dateStr];
      toast.success(`Added attendance for ${dateStr}! 🎉`);
    }

    localStorage.setItem(key, JSON.stringify(updated));
    setUserLogins(prev => ({ ...prev, [email]: updated }));
  };

  const handleSimulateToday = (email: string, name: string) => {
    handleSimulateLoginDate(email, todayStr);
  };

  // High-level stats
  const totalUsers = members.length;
  const loggedInTodayCount = members.filter(m => (userLogins[m.email] || []).includes(todayStr)).length;
  const attendancePercentage = totalUsers > 0 ? Math.round((loggedInTodayCount / totalUsers) * 100) : 0;

  // Calendar Helpers
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Render calendar cells
  const calendarCells = [];
  // Empty slots for padding
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="aspect-square bg-slate-50/20 border border-slate-100/30 rounded-xl" />);
  }

  // Active dates of the current month
  const selectedLogins = selectedMember ? (userLogins[selectedMember.email] || []) : [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(viewYear, viewMonth, day);
    const dateStr = toDateStr(dateObj);
    const isLogged = selectedLogins.includes(dateStr);
    const isTodayCell = dateStr === todayStr;

    calendarCells.push(
      <button
        key={`day-${day}`}
        onClick={() => selectedMember && handleSimulateLoginDate(selectedMember.email, dateStr)}
        className={`aspect-square flex flex-col items-center justify-between p-2 rounded-lg border text-xs font-bold transition-all relative group cursor-pointer ${
          isLogged
            ? 'bg-slate-950 border-slate-900 text-white shadow-md shadow-slate-200 hover:-translate-y-0.5'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200'
        } ${isTodayCell ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
      >
        <span className={`${isLogged ? 'text-indigo-100/90' : 'text-slate-400'} text-[9px] font-black self-start`}>
          {day}
        </span>
        <div className="flex-1 flex items-center justify-center">
          {isLogged ? (
            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-400 shadow-sm" />
          ) : (
            <div className="h-1.5 w-1.5 rounded-sm bg-slate-200 group-hover:bg-indigo-300" />
          )}
        </div>
        
        {/* Tooltip detail on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50 animate-in zoom-in-95 pointer-events-none">
          {isLogged ? 'Active ⚡ Click to reset' : 'Absent ✕ Click to check-in'}
        </div>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100 transition-all duration-300 xl:flex">
      
      {/* LEFT: Team Attendance Roster */}
      <div className="w-full shrink-0 border-r border-slate-200 bg-slate-950 text-white xl:w-[26rem]">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-950 shadow-sm">
              <Users size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-white">Access Pulse</h2>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Click a user to inspect activity</p>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-sm">
            {attendancePercentage}%
          </div>
        </div>

        {/* Member selection roster */}
        <div className="flex max-h-[500px] flex-col gap-2 overflow-y-auto p-4 scrollbar-thin">
          {members.map((member) => {
            const logins = userLogins[member.email] || [];
            const isLoggedToday = logins.includes(todayStr);
            const streak = calcStreak(logins, todayStr);
            const isSelected = member.id === selectedMemberId;

            return (
              <div
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`flex cursor-pointer select-none items-center justify-between rounded-lg border p-3.5 transition-all ${
                  isSelected
                    ? 'border-emerald-400/40 bg-white text-slate-950 shadow-sm'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black shadow-inner"
                    style={{ color: member.color, backgroundColor: `${member.color}15` }}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${isSelected ? 'text-slate-900' : 'text-white'}`}>
                      {member.name}
                      {isLoggedToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <div className={`mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide ${isSelected ? 'text-slate-500' : 'text-slate-400'}`}>
                      {logins.length} active logs
                      {streak > 0 && (
                        <span className="text-orange-500 font-extrabold flex items-center gap-0.5">
                          🔥 {streak}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Instant Check-In simulated control */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSimulateToday(member.email, member.name);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
                    isLoggedToday
                      ? 'bg-rose-50 text-rose-600 border border-rose-200/50 hover:bg-rose-100/50'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-100/50'
                  }`}
                >
                  {isLoggedToday ? 'Reset' : 'Check-In'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Visual Monthly Calendar Grid */}
      <div className="flex flex-1 flex-col bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eef2ff_100%)] p-6 sm:p-8">
        
        {/* Calendar Nav Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                {selectedMember?.name}'s Attendance
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                {MONTH_NAMES[viewMonth]} {viewYear} Calendar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider px-2 min-w-[5.5rem] text-center">
              {MONTH_NAMES[viewMonth].slice(0, 3)} {viewYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <div className="h-1 w-1 rounded-full bg-emerald-400" />
            </div>
            <span>Present / Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded-md border border-slate-100 bg-white" />
            <span>Absent / Rest</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded-md border-2 border-indigo-500 bg-white" />
            <span>Today's Date</span>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="flex flex-1 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-3 text-center">
            {WEEKDAYS.map((wd, i) => (
              <span 
                key={wd} 
                className={`text-[9px] font-black uppercase tracking-widest ${
                  i === 0 || i === 6 ? 'text-indigo-400' : 'text-slate-400'
                }`}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarCells}
          </div>

          {/* Detailed summary card at bottom */}
          {selectedMember && (
            <div className="mt-6 border-t border-slate-50 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Streak</span>
                  <span className="text-sm font-black text-orange-500 flex items-center gap-1">
                    🔥 {calcStreak(userLogins[selectedMember.email] || [], todayStr)} Days Active
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-100 hidden sm:block"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Active Logs</span>
                  <span className="text-sm font-black text-slate-800">
                    {(userLogins[selectedMember.email] || []).length} Logs recorded
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-indigo-50/40 rounded-2xl px-4 py-2 border border-indigo-100/30">
                <Sparkles size={12} className="text-indigo-500 animate-pulse" />
                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">
                  Click calendar cells to toggle daily attendance
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
