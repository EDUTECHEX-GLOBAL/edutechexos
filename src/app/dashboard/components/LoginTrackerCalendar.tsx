'use client';
import React, { useState, useEffect } from 'react';
import { Users, Flame, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';

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
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    // Load current user
    const authData = localStorage.getItem('edutechex_token');
    if (authData) {
      try {
        const { user } = JSON.parse(authData);
        if (user) {
          setCurrentUser(user);
        }
      } catch (e) {
        console.error('Failed to parse user data', e);
      }
    }

    // Load logins for all members
    const logins: Record<string, string[]> = {};
    members.forEach((m) => {
      const key = `edutechex_logins_${m.email}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      logins[m.email] = stored;
    });
    setUserLogins(logins);
  }, [members]);

  if (!mounted) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-slate-400 text-sm font-bold shadow-sm">
        Loading Login Tracker...
      </div>
    );
  }

  const todayStr = toDateStr(new Date());

  const handleSimulateLogin = (email: string, name: string) => {
    const key = `edutechex_logins_${email}`;
    const existing: string[] = userLogins[email] || [];
    if (existing.includes(todayStr)) {
      // Toggle off / remove today's login
      const updated = existing.filter(d => d !== todayStr);
      localStorage.setItem(key, JSON.stringify(updated));
      setUserLogins(prev => ({ ...prev, [email]: updated }));
      toast.success(`Removed today's attendance for ${name}`);
    } else {
      // Toggle on / add today's login
      const updated = [...existing, todayStr];
      localStorage.setItem(key, JSON.stringify(updated));
      setUserLogins(prev => ({ ...prev, [email]: updated }));
      toast.success(`Logged attendance today for ${name}! 🎉`);
    }
  };

  // Calculate high level stats
  const totalUsers = members.length;
  const loggedInTodayCount = members.filter(m => (userLogins[m.email] || []).includes(todayStr)).length;
  const attendancePercentage = totalUsers > 0 ? Math.round((loggedInTodayCount / totalUsers) * 100) : 0;

  return (
    <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-7 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
            <Users size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-900 uppercase tracking-tight">Login Tracker</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Daily Team Attendance</p>
          </div>
        </div>

        {/* Attendance Summary Badge */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Today's Attendance</span>
            <span className="text-sm font-black text-slate-800">{loggedInTodayCount} of {totalUsers} Active</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-500/20">
              {attendancePercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Simple Attendance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/30 text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-50">
              <th className="px-8 py-4">Team Colleague</th>
              <th className="px-8 py-4">Today's Status</th>
              <th className="px-8 py-4">Current Streak</th>
              <th className="px-8 py-4">Total Logins</th>
              <th className="px-8 py-4 text-right">Quick Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {members.map((member) => {
              const logins = userLogins[member.email] || [];
              const isLoggedToday = logins.includes(todayStr);
              const streak = calcStreak(logins, todayStr);
              const isSelf = member.email.toLowerCase() === currentUser?.email?.toLowerCase();
              
              return (
                <tr key={member.id} className="hover:bg-slate-50/40 transition-all group">
                  {/* Profile */}
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3.5">
                      <div 
                        className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border border-slate-100"
                        style={{ color: member.color, backgroundColor: `${member.color}12` }}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">{member.name} {isSelf && <span className="text-[10px] text-indigo-600 font-extrabold uppercase ml-1">(You)</span>}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{member.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Today's Status */}
                  <td className="px-8 py-4">
                    {isLoggedToday ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 size={12} className="text-emerald-500" strokeWidth={3} />
                        Active Today
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-150 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <AlertCircle size={12} className="text-slate-350" strokeWidth={3} />
                        Absent
                      </span>
                    )}
                  </td>

                  {/* Current Streak */}
                  <td className="px-8 py-4">
                    {streak > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Flame size={14} className="animate-bounce" />
                        </div>
                        <span className="text-sm font-black text-orange-500">{streak} Days</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">0 Days</span>
                    )}
                  </td>

                  {/* Total Logins */}
                  <td className="px-8 py-4">
                    <span className="text-sm font-black text-slate-700 tabular-nums">{logins.length} Logins</span>
                  </td>

                  {/* Toggle simulated login */}
                  <td className="px-8 py-4 text-right">
                    {isSelf ? (
                      <button
                        onClick={() => handleSimulateLogin(member.email, member.name)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${
                          isLoggedToday
                            ? 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100/60'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isLoggedToday ? '❌ Reset' : '⚡ Check-In'}
                      </button>
                    ) : (
                      <span className="text-[10px] font-black text-slate-350 uppercase tracking-wider bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl">
                        View Only
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
