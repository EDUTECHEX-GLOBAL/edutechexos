'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, CheckSquare, BookOpen, CalendarDays,
  BarChart2, FileText, Sun, Moon,
  Bookmark, NotebookPen, CalendarOff, MessageSquareDot,
  Hash, ChevronDown, ChevronRight, Users, Video, ExternalLink, MoreHorizontal, X as XIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMeetingState } from '@/lib/meetLinks';

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
  unreadCounts?: Record<string, number>;
  dmUnread?: number;
  currentUserStatus?: 'online' | 'away' | 'in-meeting' | 'offline';
  onStatusChange?: (status: 'online' | 'away' | 'in-meeting' | 'offline') => void;
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
  unreadCounts = {},
  dmUnread = 0,
  currentUserStatus = 'online',
  onStatusChange,
}: DashboardLayoutProps) {
  const workspaceChannels = channels.filter(c => c.type !== 'dm');
  const [meetOpen, setMeetOpen] = useState(false);
  const meetRef = useRef<HTMLDivElement>(null);
  const meetState = getMeetingState();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const STATUS_OPTIONS = [
    { value: 'online' as const,     label: 'Online',      dot: '#10B981' },
    { value: 'away' as const,       label: 'Away',        dot: '#F59E0B' },
    { value: 'in-meeting' as const, label: 'In Meeting',  dot: '#EF4444' },
    { value: 'offline' as const,    label: 'Offline',     dot: '#94A3B8' },
  ];

  const statusDotColor = STATUS_OPTIONS.find(s => s.value === currentUserStatus)?.dot ?? '#10B981';

  useEffect(() => {
    if (!meetOpen) return;
    function handler(e: MouseEvent) {
      if (meetRef.current && !meetRef.current.contains(e.target as Node)) setMeetOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [meetOpen]);

  useEffect(() => {
    if (!statusOpen) return;
    function handler(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusOpen]);

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
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black truncate" style={{ color: '#0F172A' }}>EduTechExOS</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: '#10B981' }} />
              <span className="text-[10px]" style={{ color: '#94A3B8' }}>Workspace</span>
            </div>
          </div>

          {/* Meeting quick-join button */}
          <div className="relative shrink-0" ref={meetRef}>
            <button
              onClick={() => setMeetOpen(v => !v)}
              title={meetState.link ? `Join ${meetState.label}` : 'No meeting today'}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
              style={{
                background: meetOpen ? 'rgba(5,150,105,0.12)' : meetState.link ? 'rgba(5,150,105,0.08)' : 'rgba(148,163,184,0.08)',
                color: meetState.link ? '#059669' : '#94A3B8',
              }}
            >
              <Video size={15} strokeWidth={2.5} />
            </button>

            <AnimatePresence>
              {meetOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-10 z-[300] w-64 rounded-2xl shadow-2xl border overflow-hidden"
                  style={{ background: '#FFFFFF', borderColor: 'rgba(62,74,137,0.12)' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: '#F1F5F9', background: 'linear-gradient(135deg,#059669,#0891B2)' }}>
                    <p className="text-[11px] font-black text-white/80 uppercase tracking-wider">Today&apos;s Meeting</p>
                    <p className="text-[13px] font-black text-white mt-0.5">{meetState.label}</p>
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    {meetState.link ? (
                      <a
                        href={meetState.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setMeetOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg,#059669,#10B981)', boxShadow: '0 3px 10px rgba(5,150,105,0.25)' }}
                      >
                        <Video size={14} strokeWidth={2.5} />
                        Join Google Meet
                        <ExternalLink size={11} className="ml-auto opacity-70" />
                      </a>
                    ) : (
                      <p className="text-[12px] text-center py-2" style={{ color: '#94A3B8' }}>No meeting on weekends.</p>
                    )}
                    <p className="text-[10px] text-center" style={{ color: '#CBD5E1' }}>{meetState.message}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
            // DM unread badge
            const tabBadge = tab.id === 'dms' ? dmUnread : 0;

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
                  {tabBadge > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-black text-white">
                      {tabBadge > 9 ? '9+' : tabBadge}
                    </span>
                  )}
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
                          const chUnread = unreadCounts[ch.id] ?? 0;
                          return (
                            <button
                              key={ch.id}
                              onClick={() => onChannelChange?.(ch.id)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-all text-left"
                              style={{
                                background: isCh ? '#E0F2FE' : 'transparent',
                                color: isCh ? '#0369A1' : chUnread > 0 ? '#0F172A' : '#64748B',
                                fontWeight: chUnread > 0 ? 700 : undefined,
                              }}
                            >
                              <Hash size={11} className="shrink-0" />
                              <span className="text-xs truncate flex-1">{ch.name}</span>
                              {chUnread > 0 && (
                                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-black text-white shrink-0">
                                  {chUnread > 9 ? '9+' : chUnread}
                                </span>
                              )}
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
            <div className="relative" ref={statusRef}>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ backgroundColor: '#F8FAFC' }}
                  whileTap={{ scale: 0.99 }}
                  onClick={onSettingsOpen}
                  className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2.5 rounded-xl transition-all"
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
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white transition-colors"
                      style={{ background: statusDotColor }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] font-bold truncate" style={{ color: '#0F172A' }}>{currentUser.name}</div>
                    <div className="text-[10px] truncate" style={{ color: statusDotColor, fontWeight: 600 }}>
                      {STATUS_OPTIONS.find(s => s.value === currentUserStatus)?.label ?? 'Online'}
                    </div>
                  </div>
                </motion.button>
                {onStatusChange && (
                  <button
                    onClick={() => setStatusOpen(v => !v)}
                    title="Change status"
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:bg-slate-100 mr-1"
                    style={{ color: '#94A3B8' }}
                  >
                    <ChevronDown size={13} strokeWidth={2.5} style={{ transform: statusOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {statusOpen && onStatusChange && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute bottom-12 left-2 right-2 z-[300] rounded-2xl shadow-2xl border overflow-hidden"
                    style={{ background: '#FFFFFF', borderColor: 'rgba(62,74,137,0.12)' }}
                  >
                    <div className="px-3 py-2.5 border-b" style={{ borderColor: '#F1F5F9' }}>
                      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#94A3B8' }}>Set Status</p>
                    </div>
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { onStatusChange(opt.value); setStatusOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] font-semibold transition-all hover:bg-slate-50 text-left"
                        style={{ color: currentUserStatus === opt.value ? opt.dot : '#374151', fontWeight: currentUserStatus === opt.value ? 700 : undefined }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: opt.dot }} />
                        {opt.label}
                        {currentUserStatus === opt.value && <span className="ml-auto text-[10px] font-black" style={{ color: opt.dot }}>active</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col min-w-0 pb-14 md:pb-0">
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
      <MobileBottomNav
        tabs={tabs}
        isAdmin={!!isAdmin}
        activeTab={activeTab}
        onTabChange={onTabChange}
        currentUser={currentUser}
        onSettingsOpen={onSettingsOpen}
        dmUnread={dmUnread}
        unreadCounts={unreadCounts}
      />
    </div>
  );
}

/* ── Mobile bottom navigation with "More" drawer ─────────────────── */
const MOBILE_PRIMARY: LayoutTab[] = ['chats', 'dms', 'tasks', 'people', 'leave'];

function MobileBottomNav({
  tabs, isAdmin, activeTab, onTabChange, currentUser, onSettingsOpen, dmUnread, unreadCounts,
}: {
  tabs: { id: LayoutTab; label: string; icon: React.ElementType; adminOnly?: boolean }[];
  isAdmin: boolean;
  activeTab: LayoutTab;
  onTabChange: (t: LayoutTab) => void;
  currentUser?: { name: string; initials: string; role: string; email: string } | null;
  onSettingsOpen?: () => void;
  dmUnread: number;
  unreadCounts: Record<string, number>;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const allTabs = tabs.filter(t => !t.adminOnly || isAdmin);
  const primaryTabs = allTabs.filter(t => MOBILE_PRIMARY.includes(t.id));
  const moreTabs = allTabs.filter(t => !MOBILE_PRIMARY.includes(t.id));
  const isMoreActive = moreTabs.some(t => t.id === activeTab);

  return (
    <>
      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[25] bg-black/30"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="absolute bottom-14 left-0 right-0 bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl pb-2"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-black text-slate-800">More</span>
                <button onClick={() => setMoreOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                  <XIcon size={14} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1 p-3">
                {moreTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id}
                      onClick={() => { onTabChange(tab.id); setMoreOpen(false); }}
                      className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all"
                      style={{ background: isActive ? '#F0FDFA' : 'transparent', color: isActive ? '#0D9488' : '#64748B' }}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
                    </button>
                  );
                })}
                {currentUser && (
                  <button onClick={() => { onSettingsOpen?.(); setMoreOpen(false); }}
                    className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all"
                    style={{ color: '#64748B' }}
                  >
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8px] font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#FF6B7F,#FF4770)' }}>
                      {currentUser.initials}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">Profile</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around px-1 py-1 border-t shadow-sm"
        style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        {primaryTabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const badge = tab.id === 'dms' ? dmUnread : 0;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center gap-0.5 flex-1 py-2 text-[8px] font-bold uppercase tracking-wider transition-all"
              style={{ color: isActive ? '#0D9488' : '#94A3B8' }}
            >
              <span className="relative flex h-7 w-7 items-center justify-center rounded-xl transition-all"
                style={{ background: isActive ? '#F0FDFA' : 'transparent' }}>
                <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 text-[7px] font-black text-white px-0.5">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              {tab.label}
            </button>
          );
        })}
        {/* More button */}
        <button onClick={() => setMoreOpen(v => !v)}
          className="flex flex-col items-center gap-0.5 flex-1 py-2 text-[8px] font-bold uppercase tracking-wider transition-all"
          style={{ color: isMoreActive || moreOpen ? '#0D9488' : '#94A3B8' }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-xl transition-all"
            style={{ background: isMoreActive || moreOpen ? '#F0FDFA' : 'transparent' }}>
            <MoreHorizontal size={15} strokeWidth={2} />
          </span>
          More
        </button>
      </nav>
    </>
  );
}
