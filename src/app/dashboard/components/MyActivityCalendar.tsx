'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, CalendarDays, Flame, TrendingUp } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

const RadialProgress = ({ percentage, color }: { percentage: number; color: string }) => {
  const radius = 18;
  const stroke = 3.5;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
      <svg className="h-full w-full transform -rotate-90">
        <circle
          stroke="rgba(255, 255, 255, 0.1)"
          fill="transparent"
          strokeWidth={stroke}
          r={radius}
          cx={24}
          cy={24}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={radius}
          cx={24}
          cy={24}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-black text-white tabular-nums">{percentage}%</span>
    </div>
  );
};

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
  const [userColor, setUserColor] = useState('#6366f1');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setMounted(true);
  }, []);

  // Load current user's login dates
  useEffect(() => {
    if (!open || !mounted) return;
    try {
      const authData = localStorage.getItem('edutechex_token');
      if (authData) {
        const { user } = JSON.parse(authData);
        if (user) {
          const key = `edutechex_logins_${user.email}`;
          let stored: string[] = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Populate realistic mock log dates if empty
          if (stored.length === 0) {
            const generated: string[] = [];
            const today = new Date();
            for (let i = 0; i < 30; i++) {
              const date = new Date();
              date.setDate(today.getDate() - i);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const prob = isWeekend ? 0.12 : 0.88; // high attendance on weekdays
              if (Math.random() < prob) {
                generated.push(date.toISOString().split('T')[0]);
              }
            }
            // Always ensure today is logged
            const todayStr = today.toISOString().split('T')[0];
            if (!generated.includes(todayStr)) {
              generated.push(todayStr);
            }
            localStorage.setItem(key, JSON.stringify(generated));
            stored = generated;
          }

          setLoginDates(stored);
          setUserName(user.name?.split(' ')[0] || 'You');
          setUserInitials(user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ME');
          
          const colors: Record<string, string> = {
            'Admin': '#0ea5e9', 
            'Manager': '#6366f1', 
            'Developer': '#10b981', 
            'Designer': '#f59e0b'
          };
          setUserColor(colors[user.role] || '#6366f1');
        }
      }
    } catch (e) {
      console.error('Error fetching user activity details:', e);
    }
  }, [open, mounted]);

  if (!mounted || !open) return null;

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);

  // Stats
  const thisMonthLogins = loginDates.filter(d => {
    const [y, m] = d.split('-').map(Number);
    return y === viewYear && m === viewMonth + 1;
  }).length;

  const totalLogins = loginDates.length;
  const streak = calcStreak(loginDates, todayStr);

  const totalPastDays = Array.from({ length: daysInMonth }, (_, i) => {
    return toDateStr(viewYear, viewMonth, i + 1) <= todayStr;
  }).filter(Boolean).length;
  const loginRate = totalPastDays > 0 ? Math.round((thisMonthLogins / totalPastDays) * 100) : 0;

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      {/* High-End Dark-Glassmorphism Modal Card */}
      <div className="w-full max-w-sm bg-slate-900/95 border border-white/10 text-white rounded-3xl shadow-2xl shadow-indigo-950/20 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 backdrop-blur-xl">

        {/* Premium Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-gradient-to-r from-indigo-700/60 to-purple-700/40">
          <div className="flex items-center gap-3.5">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black text-white border border-white/20 shadow-md shadow-slate-950/20"
              style={{ backgroundColor: userColor }}
            >
              {userInitials}
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-tight">{userName}'s Activity</p>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Personal Log OS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-95"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Stats Row with radial glows */}
        <div className="grid grid-cols-3 divide-x divide-white/5 bg-white/[0.02] border-b border-white/5">
          <div className="flex flex-col items-center py-4 gap-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CalendarDays size={14} strokeWidth={2.5} />
              <span className="text-lg font-black">{thisMonthLogins}</span>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">This Month</p>
          </div>
          <div className="flex flex-col items-center py-4 gap-1">
            <div className="flex items-center gap-1.5 text-orange-400">
              <Flame size={14} className="animate-pulse" strokeWidth={2.5} />
              <span className="text-lg font-black">{streak}</span>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Streak</p>
          </div>
          <div className="flex flex-col items-center py-4 gap-1">
            <div className="flex items-center gap-2">
              <RadialProgress percentage={loginRate} color={userColor} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Login Rate</p>
          </div>
        </div>

        {/* Month Nav */}
        <div className="flex items-center justify-between px-6 py-4">
          <button 
            type="button" 
            onClick={prevMonth}
            className="h-9 w-9 rounded-xl border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 shadow-sm"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <span className="text-sm font-black text-slate-200 tracking-tight">{monthLabel}</span>
          <button 
            type="button" 
            onClick={nextMonth}
            disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
            className="h-9 w-9 rounded-xl border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 active:scale-95 shadow-sm"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Calendar Grid (Unique Glass Squircle layout) */}
        <div className="px-6 pb-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`b${i}`} className="bg-white/[0.01] rounded-xl" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const didLogin = loginDates.includes(dateStr);

              return (
                <div
                  key={day}
                  title={isFuture ? '' : didLogin ? `Logged in ✅` : `No login ❌`}
                  className={`flex flex-col items-center justify-center rounded-xl py-2 aspect-square transition-all duration-300 border
                    ${isFuture 
                      ? 'bg-white/[0.02] text-slate-600 border-white/[0.02] cursor-not-allowed opacity-30' 
                      : didLogin 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/5 cursor-pointer hover:scale-105 active:scale-95' 
                        : 'bg-rose-500/5 text-rose-400 border-rose-500/10 hover:bg-rose-500/15 cursor-pointer hover:scale-105 active:scale-95'
                    }
                    ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-900 z-10 scale-105 border-indigo-400/40 bg-indigo-500/10 text-indigo-300 font-extrabold' : ''}
                  `}
                >
                  <span className="text-xs font-black">
                    {day}
                  </span>
                  {!isFuture && (
                    <span
                      className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                        didLogin
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend + total */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-950/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Logged In</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Missed</span>
            </div>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            {totalLogins} Total Logins
          </div>
        </div>
      </div>
    </div>
  );
}
