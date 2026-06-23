'use client';

import React from 'react';
import {
  MessageSquare, CheckSquare, BookOpen, CalendarDays,
  BarChart2, FileText, Sun, Moon, ChevronLeft, Layout,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppLogo from '@/components/ui/AppLogo';

export type LayoutTab = 'chats' | 'tasks' | 'docs' | 'calendar' | 'analytics' | 'reports';

interface DashboardLayoutProps {
  activeTab: LayoutTab;
  onTabChange: (tab: LayoutTab) => void;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  topBar?: React.ReactNode;
  isAdmin?: boolean;
  currentUser?: { name: string; initials: string; role: string; email: string } | null;
  darkMode?: boolean;
  onToggleTheme?: () => void;
  onSettingsOpen?: () => void;
}

const tabs: { id: LayoutTab; label: string; icon: React.ElementType }[] = [
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'docs', label: 'Docs', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export default function DashboardLayout({
  activeTab,
  onTabChange,
  children,
  rightPanel,
  topBar,
  isAdmin,
  currentUser,
  darkMode,
  onToggleTheme,
  onSettingsOpen,
}: DashboardLayoutProps) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#06080F]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-noise" />
      <div className="ambient-cyan pointer-events-none fixed inset-0 z-0" />
      <div className="ambient-coral pointer-events-none fixed inset-0 z-0" />
      <div className="ambient-violet pointer-events-none fixed inset-0 z-0" />

      <nav className="relative z-10 hidden md:flex w-[68px] shrink-0 flex-col items-center py-5 gap-3 border-r border-[rgba(148,163,184,0.06)] bg-[rgba(13,16,37,0.60)] backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0AE8D0] to-[#06B8A5] shadow-lg shadow-[#0AE8D0]/20 mb-4"
        >
          <Layout size={16} className="text-[#06080F]" strokeWidth={2.5} />
        </motion.div>

        <div className="flex flex-col items-center gap-1.5 flex-1 w-full px-2.5">
          {tabs.map((tab, i) => {
            if (tab.id === 'analytics' && !isAdmin) return null;
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => onTabChange(tab.id)}
                className={`group relative flex flex-col items-center gap-1 w-full py-2 text-[9px] font-bold uppercase tracking-[0.18em] transition-all duration-300
                  ${isActive ? 'text-[#0AE8D0]' : 'text-[#4B5678] hover:text-[#8896B0]'}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300
                  ${isActive
                    ? 'bg-[rgba(10,232,208,0.10)] shadow-sm shadow-[#0AE8D0]/5'
                    : 'hover:bg-[rgba(148,163,184,0.04)]'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                </span>
                {tab.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-full bg-[#0AE8D0] shadow-sm shadow-[#0AE8D0]/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2.5 mt-auto pt-4 border-t border-[rgba(148,163,184,0.06)] w-full px-3">
          {onToggleTheme && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-xl text-[#4B5678] hover:text-[#8896B0] hover:bg-[rgba(148,163,184,0.04)] transition-all"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </motion.button>
          )}
          {currentUser && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSettingsOpen}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-black text-white shadow-lg shadow-black/20"
              style={{ background: 'linear-gradient(135deg, #FF6B7F, #FF4770)' }}
              title={currentUser.name}
            >
              {currentUser.initials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#38D9A9] border-2 border-[#06080F]" />
            </motion.button>
          )}
        </div>
      </nav>

      <div className="relative z-10 flex flex-1 flex-col min-w-0">
        {topBar && (
          <div className="shrink-0 border-b border-[rgba(148,163,184,0.06)] bg-[rgba(13,16,37,0.50)] backdrop-blur-2xl">
            {topBar}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {rightPanel && (
        <aside className="relative z-10 hidden lg:flex w-[300px] shrink-0 flex-col border-l border-[rgba(148,163,184,0.06)] bg-[rgba(13,16,37,0.40)] backdrop-blur-2xl overflow-y-auto scrollbar-dark">
          {rightPanel}
        </aside>
      )}
    </div>
  );
}
