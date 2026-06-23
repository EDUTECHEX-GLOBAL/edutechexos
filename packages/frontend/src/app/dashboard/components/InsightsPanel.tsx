'use client';

import React from 'react';
import { BarChart2, CalendarDays, Users, Clock, TrendingUp, MessageCircle, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface InsightsPanelProps {
  activeChannel?: string;
  members?: Array<{ id: string; initials: string; name: string; color?: string; status?: string }>;
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
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#4B5678]">Overview</p>
        <h2 className="text-xl font-black text-[#EEF2F6] tracking-tight mt-0.5">Workspace</h2>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#4B5678] mb-3 flex items-center gap-2">
          <Zap size={11} className="text-[#0AE8D0]" />
          Activity
        </p>
        <div className="space-y-2.5">
          <MetricCard
            label="Messages"
            value={String(todayMessages)}
            trend="up"
            trendLabel="+12%"
            bars={[0.3, 0.6, 0.4, 0.8, 0.5, 1.0, 0.7]}
            accent="#0AE8D0"
          />
          <MetricCard
            label="Completed"
            value={String(doneTasks)}
            trend="up"
            trendLabel="+18%"
            progress={completionRate}
            accent="#38D9A9"
          />
          <MetricCard
            label="Pending"
            value={String(todoTasks)}
            trend="down"
            trendLabel="-5%"
            dots={todoTasks}
            accent="#FF6B7F"
          />
        </div>
      </motion.section>

      {onlineMembers.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#4B5678] mb-3 flex items-center gap-2">
            <Users size={11} className="text-[#38D9A9]" />
            Online
          </p>
          <div className="flex flex-wrap gap-2">
            {onlineMembers.slice(0, 8).map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black text-white shadow-lg"
                style={{ background: member.color ?? 'linear-gradient(135deg, #FF6B7F, #FF4770)' }}
                title={member.name}
              >
                {member.initials}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#38D9A9] border-2 border-[#06080F]" />
                <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
              </motion.div>
            ))}
            {onlineMembers.length > 8 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(148,163,184,0.08)] text-[10px] font-bold text-[#4B5678] border border-[rgba(148,163,184,0.06)]">
                +{onlineMembers.length - 8}
              </div>
            )}
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#4B5678] mb-3 flex items-center gap-2">
          <Zap size={11} className="text-[#F59E0B]" />
          Quick Actions
        </p>
        <div className="space-y-1.5">
          {[
            { icon: CalendarDays, label: 'Schedule', desc: 'Plan a meeting', accent: '#0AE8D0' },
            { icon: Users, label: 'Members', desc: 'View directory', accent: '#7C5CFC' },
            { icon: BarChart2, label: 'Reports', desc: 'View analytics', accent: '#38D9A9' },
            { icon: MessageCircle, label: 'Broadcast', desc: 'Send announcement', accent: '#F59E0B' },
          ].map(({ icon: Icon, label, desc, accent }) => (
            <motion.button
              key={label}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-[rgba(148,163,184,0.04)]"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm shadow-sm"
                style={{ background: `${accent}15`, color: accent }}
              >
                <Icon size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#EEF2F6] group-hover:text-white transition-colors">{label}</p>
                <p className="text-[10px] text-[#4B5678]">{desc}</p>
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
  accent = '#0AE8D0',
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
    <div className="glass-dark-card rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-semibold text-[#4B5678]">{label}</p>
        <span
          className={`text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${
            trend === 'up'
              ? 'text-[#38D9A9] bg-[rgba(56,217,169,0.10)]'
              : 'text-[#FF6B7F] bg-[rgba(255,107,127,0.10)]'
          }`}
          style={{ border: `1px solid ${trend === 'up' ? 'rgba(56,217,169,0.15)' : 'rgba(255,107,127,0.15)'}` }}
        >
          <TrendingUp size={10} className="inline mr-0.5" />
          {trendLabel}
        </span>
      </div>
      <p className="text-[22px] font-black text-[#EEF2F6]">{value}</p>
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
          <div className="h-1 rounded-full overflow-hidden bg-[rgba(148,163,184,0.08)]">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accent}88, ${accent})`,
                boxShadow: `0 0 8px ${accent}30`,
              }}
            />
          </div>
          <p className="text-[10px] font-medium text-[#4B5678] mt-1">{progress}% target</p>
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
