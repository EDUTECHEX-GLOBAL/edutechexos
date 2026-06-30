'use client';

import React from 'react';
import { BarChart2, CalendarDays, Users, Clock, TrendingUp, MessageCircle, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface InsightsPanelProps {
  activeChannel?: string;
  members?: Array<{ id: string; initials: string; name: string; color?: string; status?: string; isAvailable?: boolean }>;
  kanbanTasks?: Array<{ status: string }>;
  messages?: Record<string, Array<{ timestamp: string }>>;
}

export default function InsightsPanel({
  activeChannel,
  members = [],
  kanbanTasks = [],
  messages = {},
}: InsightsPanelProps) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const todayMessages = Object.values(messages).flat().filter(
    (m) => m.timestamp?.startsWith(todayStr)
  ).length;

  const onlineMembers = members.filter((m) => m.status === 'online');
  const availableMembers = members.filter((m) => m.isAvailable === true);

  const todoTasks = kanbanTasks.filter((t) => t.status === 'todo').length;
  const doneTasks = kanbanTasks.filter((t) => t.status === 'done').length;
  const totalTasks = kanbanTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col gap-5 p-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Overview</p>
        <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">Workspace</h2>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-3 flex items-center gap-2">
          <Zap size={11} className="text-indigo-600" />
          Activity
        </p>
        <div className="space-y-2.5">
          <MetricCard
            label="Messages"
            value={String(todayMessages)}
            trend="up"
            trendLabel="+12%"
            bars={[0.3, 0.6, 0.4, 0.8, 0.5, 1.0, 0.7]}
            accent="#4F46E5"
          />
          <MetricCard
            label="Completed"
            value={String(doneTasks)}
            trend="up"
            trendLabel="+18%"
            progress={completionRate}
            accent="#10B981"
          />
          <MetricCard
            label="Pending"
            value={String(todoTasks)}
            trend="down"
            trendLabel="-5%"
            dots={todoTasks}
            accent="#EF4444"
          />
        </div>
      </motion.section>

      {(onlineMembers.length > 0 || availableMembers.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-3 flex items-center gap-2">
            <Users size={11} className="text-emerald-500" />
            Team
          </p>
          <div className="flex flex-wrap gap-2">
            {members.slice(0, 10).map((member) => {
              const online = member.status === 'online';
              const avail = member.isAvailable;
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black text-white shadow-lg"
                  style={{ background: member.color ?? 'linear-gradient(135deg, #FF6B7F, #FF4770)' }}
                  title={`${member.name}${avail !== undefined ? (avail ? ' · Available' : ' · Busy') : ''}`}
                >
                  {member.initials}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                    avail === true ? 'bg-emerald-500' : avail === false ? 'bg-slate-400' : online ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                  <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
                </motion.div>
              );
            })}
            {members.length > 10 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200">
                +{members.length - 10}
              </div>
            )}
          </div>
          {availableMembers.length > 0 && (
            <p className="mt-2 text-[10px] text-emerald-600 font-semibold">
              {availableMembers.length} available now
            </p>
          )}
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-3 flex items-center gap-2">
          <Zap size={11} className="text-amber-500" />
          Quick Actions
        </p>
        <div className="space-y-1.5">
          {[
            { icon: CalendarDays, label: 'Schedule', desc: 'Plan a meeting', accent: '#4F46E5' },
            { icon: Users, label: 'Members', desc: 'View directory', accent: '#7C5CFC' },
            { icon: BarChart2, label: 'Reports', desc: 'View analytics', accent: '#10B981' },
            { icon: MessageCircle, label: 'Broadcast', desc: 'Send announcement', accent: '#F59E0B' },
          ].map(({ icon: Icon, label, desc, accent }) => (
            <motion.button
              key={label}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-slate-100/60"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm shadow-sm"
                style={{ background: `${accent}15`, color: accent }}
              >
                <Icon size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{label}</p>
                <p className="text-[10px] text-slate-500">{desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  trendLabel,
  bars,
  progress,
  dots,
  accent = '#4F46E5',
}: {
  label: string;
  value: string;
  trend: 'up' | 'down';
  trendLabel: string;
  bars?: number[];
  progress?: number;
  dots?: number;
  accent?: string;
}) {
  return (
    <div className="bg-white/80 border border-indigo-50 shadow-sm rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <span
          className={`text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${
            trend === 'up'
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-rose-600 bg-rose-50'
          }`}
          style={{ border: `1px solid ${trend === 'up' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}` }}
        >
          <TrendingUp size={10} className="inline mr-0.5" />
          {trendLabel}
        </span>
      </div>
      <p className="text-[22px] font-black text-slate-800">{value}</p>
      {bars && (
        <div className="mt-2 flex items-end gap-[3px] h-6">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h * 24}px`,
                background: i === bars.length - 1
                  ? `linear-gradient(to top, ${accent}, ${accent}CC)`
                  : `${accent}18`,
                opacity: i === bars.length - 1 ? 1 : 0.6,
              }}
            />
          ))}
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-2">
          <div className="h-1 rounded-full overflow-hidden bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accent}88, ${accent})`,
                boxShadow: `0 0 8px ${accent}30`,
              }}
            />
          </div>
          <p className="text-[10px] font-medium text-slate-500 mt-1">{progress}% target</p>
        </div>
      )}
      {dots !== undefined && (
        <div className="flex flex-wrap gap-1 mt-2">
          {Array.from({ length: Math.max(dots, 5) }, (_, i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-sm transition-all"
              style={{
                background: i < dots ? accent : `${accent}18`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
