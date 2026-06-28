'use client';

import React from 'react';
import {
  MessageSquare, CheckSquare, BookOpen, CalendarDays,
  BarChart2, FileText, Sun, Moon,
  Bookmark, NotebookPen, CalendarOff, MessageSquareDot,
  Hash, ChevronDown, ChevronRight, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type LayoutTab = 'chats' | 'tasks' | 'docs' | 'calendar' | 'analytics' | 'reports' | 'bookmarks' | 'notepad' | 'leave' | 'dms' | 'people';

interface Channel { id: string; name: string; description?: string; type?: string; }

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
  channels?: Channel[];
  activeChannel?: string;
  onChannelChange?: (id: string) => void;
}

const tabs: { id: LayoutTab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: 'chats',        label: 'Chats',        icon: MessageSquare },
  { id: 'dms',          label: 'DMs',          icon: MessageSquareDot },
  { id: 'tasks',        label: 'Tasks',        icon: CheckSquare },
  { id: 'docs',         label: 'Docs',         icon: BookOpen },
  { id: 'calendar',     label: 'Calendar',     icon: CalendarDays },
  { id: 'people',       label: 'People',       icon: Users },
  { id: 'leave',        label: 'Leave',        icon: CalendarOff },
  { id: 'bookmarks',    label: 'Saved',        icon: Bookmark },
  { id: 'notepad',      label: 'Notes',        icon: NotebookPen },

  { id: 'analytics',    label: 'Analytics',    icon: BarChart2, adminOnly: true },
  { id: 'reports',      label: 'Reports',      icon: FileText,  adminOnly: true },
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
  channels = [],
  activeChannel,
  onChannelChange,
}: DashboardLayoutProps) {
  const workspaceChannels = channels.filter(c => c.type !== 'dm');

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#F1F5F9' }}>

      {/* ── Left Sidebar ─────────────────────────────────────── */}
      <nav
        className="hidden md:flex flex-col shrink-0 border-r overflow-y-auto"
        style={{ width: 240, background: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        {/* Workspace header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b shrink-0" style={{ borderColor: '#E2E8F0' }}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #0D9488, #0891B2)' }}
          >
            <span className="text-white font-black text-sm">E</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black truncate" style={{ color: '#0F172A' }}>EduTechExOS</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: '#10B981' }} />
              <span className="text-[10px]" style={{ color: '#94A3B8' }}>Workspace</span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {tabs.map((tab) => {
            if (tab.adminOnly && !isAdmin) return null;
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const isChatsWithChannels = tab.id === 'chats' && workspaceChannels.length > 0;
            const showChannelList = isActive && isChatsWithChannels;

            return (
              <React.Fragment key={tab.id}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onTabChange(tab.id)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all text-left"
                  style={{
                    background: isActive ? '#F0FDFA' : 'transparent',
                    color: isActive ? '#0D9488' : '#64748B',
                  }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[13px] font-semibold flex-1">{tab.label}</span>
                  {isChatsWithChannels && (
                    <span style={{ color: isActive ? '#0D9488' : '#CBD5E1' }}>
                      {showChannelList ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                  )}
                </motion.button>

                {/* Channel list nested under Chats */}
                <AnimatePresence initial={false}>
                  {showChannelList && (
                    <motion.div
                      key="channels"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="ml-7 pl-3 pb-1 border-l space-y-0.5" style={{ borderColor: '#E2E8F0' }}>
                        {workspaceChannels.map(ch => {
                          const isCh = ch.id === activeChannel;
                          return (
                            <button
                              key={ch.id}
                              onClick={() => onChannelChange?.(ch.id)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-all text-left"
                              style={{
                                background: isCh ? '#E0F2FE' : 'transparent',
                                color: isCh ? '#0369A1' : '#64748B',
                              }}
                            >
                              <Hash size={11} className="shrink-0" />
                              <span className="text-xs font-medium truncate">{ch.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>

        {/* Bottom: theme + user */}
        <div className="px-2 pb-3 pt-2 border-t space-y-0.5 shrink-0" style={{ borderColor: '#E2E8F0' }}>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all hover:bg-slate-50"
              style={{ color: '#64748B' }}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              <span className="text-[13px] font-semibold">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          )}
          {currentUser && (
            <motion.button
              whileHover={{ backgroundColor: '#F8FAFC' }}
              whileTap={{ scale: 0.99 }}
              onClick={onSettingsOpen}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all"
              style={{ color: '#475569' }}
            >
              <div className="relative shrink-0">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #FF6B7F, #FF4770)' }}
                >
                  {currentUser.initials}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{ background: '#10B981' }}
                />
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[13px] font-bold truncate" style={{ color: '#0F172A' }}>{currentUser.name}</div>
                <div className="text-[10px] truncate" style={{ color: '#94A3B8' }}>{currentUser.role}</div>
              </div>
            </motion.button>
          )}
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col min-w-0 pb-[56px] md:pb-0">
        {topBar && (
          <div className="shrink-0 border-b" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
            {topBar}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────── */}
      {rightPanel && (
        <aside
          className="hidden lg:flex flex-col shrink-0 border-l overflow-y-auto"
          style={{ width: 280, background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {rightPanel}
        </aside>
      )}

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around px-1 py-1 border-t shadow-sm"
        style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        {tabs.filter(t => !t.adminOnly || isAdmin).slice(0, 5).map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 text-[8px] font-bold uppercase tracking-wider transition-all"
              style={{ color: isActive ? '#0D9488' : '#94A3B8' }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-xl transition-all"
                style={{ background: isActive ? '#F0FDFA' : 'transparent' }}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
              </span>
              {tab.label}
            </button>
          );
        })}
        {currentUser && (
          <button
            onClick={onSettingsOpen}
            className="flex flex-col items-center gap-0.5 flex-1 py-2 text-[8px] font-bold uppercase tracking-wider"
            style={{ color: '#94A3B8' }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black text-white"
              style={{ background: 'linear-gradient(135deg,#FF6B7F,#FF4770)' }}
            >
              {currentUser.initials}
            </span>
            Me
          </button>
        )}
      </nav>
    </div>
  );
}
