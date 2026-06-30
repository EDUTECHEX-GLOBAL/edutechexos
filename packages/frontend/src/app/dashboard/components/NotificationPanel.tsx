'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import {
  X, MessageSquare, Smile, Pin, CheckSquare, Bell, BellOff,
  AtSign, Clock, Hash, Video, CheckCheck, Trash2, CalendarClock,
  ArrowRight,
} from 'lucide-react';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE = {
  mention: {
    icon: AtSign,
    label: 'Mention',
    color: '#6366F1',
    light: '#EEF2FF',
    border: '#C7D2FE',
    dot: '#6366F1',
    badge: { background: '#EEF2FF', color: '#4338CA' },
  },
  task: {
    icon: CheckSquare,
    label: 'Task',
    color: '#059669',
    light: '#ECFDF5',
    border: '#A7F3D0',
    dot: '#10B981',
    badge: { background: '#ECFDF5', color: '#047857' },
  },
  reply: {
    icon: MessageSquare,
    label: 'Reply',
    color: '#2563EB',
    light: '#EFF6FF',
    border: '#BFDBFE',
    dot: '#3B82F6',
    badge: { background: '#EFF6FF', color: '#1D4ED8' },
  },
  reaction: {
    icon: Smile,
    label: 'Reaction',
    color: '#D97706',
    light: '#FFFBEB',
    border: '#FDE68A',
    dot: '#F59E0B',
    badge: { background: '#FFFBEB', color: '#B45309' },
  },
  pin: {
    icon: Pin,
    label: 'Pinned',
    color: '#7C3AED',
    light: '#F5F3FF',
    border: '#DDD6FE',
    dot: '#8B5CF6',
    badge: { background: '#F5F3FF', color: '#6D28D9' },
  },
} as const;

type NotifType = keyof typeof TYPE;
type Tab = 'all' | 'unread' | 'meetings' | 'tasks';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  onGoToChannel?: (channelId: string, messageId?: string) => void;
}

export default function NotificationPanel({ open, onClose, onGoToChannel }: NotificationPanelProps) {
  const allNotifications = useDashboardStore((s) => s.notifications);
  const markRead         = useDashboardStore((s) => s.markNotificationRead);
  const markAllRead      = useDashboardStore((s) => s.markAllNotificationsRead);
  const dismiss          = useDashboardStore((s) => s.dismissNotification);
  const setActiveChannel = useDashboardStore((s) => s.setActiveChannel);
  const clearUnread      = useDashboardStore((s) => s.clearUnread);
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('edutechex_token');
      if (raw) setEmail(JSON.parse(raw).user?.email?.toLowerCase() ?? '');
    } catch { setEmail(''); }
  }, [open]);

  // Reset tab when reopened
  useEffect(() => { if (open) setTab('all'); }, [open]);

  const notifications = allNotifications.filter((n) => {
    if (n.recipientEmails?.length) return n.recipientEmails.map(e => e.toLowerCase()).includes(email);
    return !!n.joinLink;
  });

  const filtered = notifications.filter(n => {
    if (tab === 'unread') return !n.read;
    if (tab === 'meetings') return !!n.joinLink;
    if (tab === 'tasks') return n.type === 'task';
    return true;
  });

  const unreadCount   = notifications.filter(n => !n.read).length;
  const meetingCount  = notifications.filter(n => !!n.joinLink).length;
  const taskCount     = notifications.filter(n => n.type === 'task').length;

  function goTo(channelId: string, notifId: string, messageId?: string) {
    setActiveChannel(channelId);
    clearUnread(channelId);
    markRead(notifId);
    if (onGoToChannel) onGoToChannel(channelId, messageId);
    onClose();
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'all',      label: 'All',      count: notifications.length },
    { key: 'unread',   label: 'Unread',   count: unreadCount },
    { key: 'meetings', label: 'Meetings', count: meetingCount },
    { key: 'tasks',    label: 'Tasks',    count: taskCount },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200]"
            style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Centered popup */}
          <motion.div
            key="popup"
            initial={{ opacity: 0, scale: 0.90, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.85 }}
            className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none px-4"
          >
            <div
              className="pointer-events-auto w-full flex flex-col"
              style={{
                maxWidth: 520,
                maxHeight: '82vh',
                background: '#FFFFFF',
                borderRadius: 24,
                boxShadow:
                  '0 0 0 1px rgba(99,102,241,0.10), 0 24px 60px rgba(15,23,42,0.22), 0 8px 24px rgba(15,23,42,0.10)',
                overflow: 'hidden',
              }}
            >
              {/* ── Header ── */}
              <div
                className="shrink-0 px-6 pt-5 pb-0"
                style={{ borderBottom: '1px solid #F1F5F9' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg,#4F46E5,#818CF8)',
                        boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                      }}
                    >
                      <Bell size={18} strokeWidth={2} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-black tracking-tight" style={{ color: '#0F172A' }}>
                        Notifications
                      </h2>
                      <p className="text-[11px] font-semibold" style={{ color: '#94A3B8' }}>
                        {unreadCount > 0
                          ? `${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}`
                          : 'All caught up'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllRead()}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-colors hover:bg-indigo-50"
                        style={{ color: '#6366F1' }}
                      >
                        <CheckCheck size={13} strokeWidth={2.5} />
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-slate-100"
                      style={{ color: '#94A3B8' }}
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="flex gap-0.5 -mb-px">
                  {TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-bold transition-all rounded-t-xl"
                      style={{
                        color: tab === t.key ? '#4F46E5' : '#94A3B8',
                        background: tab === t.key ? '#F8F9FF' : 'transparent',
                        borderBottom: tab === t.key ? '2px solid #6366F1' : '2px solid transparent',
                      }}
                    >
                      {t.label}
                      {(t.count ?? 0) > 0 && (
                        <span
                          className="rounded-full text-[10px] font-black px-1.5 py-0.5 min-w-[18px] text-center"
                          style={{
                            background: tab === t.key ? '#6366F1' : '#E2E8F0',
                            color: tab === t.key ? '#fff' : '#64748B',
                          }}
                        >
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Notification list ── */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3"
                style={{ scrollbarWidth: 'none', background: '#F8F9FF' }}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {filtered.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-16 gap-4"
                    >
                      <div
                        className="h-16 w-16 rounded-2xl flex items-center justify-center"
                        style={{ background: '#EEF2FF', border: '2px dashed #C7D2FE' }}
                      >
                        <BellOff size={26} style={{ color: '#A5B4FC' }} />
                      </div>
                      <div className="text-center">
                        <p className="text-[14px] font-black" style={{ color: '#1E293B' }}>
                          No {tab === 'all' ? '' : tab} notifications
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: '#94A3B8' }}>
                          {tab === 'meetings'
                            ? 'Meeting invites will appear here'
                            : tab === 'tasks'
                            ? 'Assigned tasks will appear here'
                            : 'Mentions and alerts will appear here'}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    filtered.map((n, i) => (
                      <NotifCard
                        key={n.id}
                        notif={n}
                        index={i}
                        onMarkRead={() => markRead(n.id)}
                        onDismiss={() => dismiss(n.id)}
                        onGoTo={goTo}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Individual notification card ──────────────────────────────── */
function NotifCard({
  notif, index, onMarkRead, onDismiss, onGoTo,
}: {
  notif: ReturnType<typeof useDashboardStore.getState>['notifications'][0];
  index: number;
  onMarkRead: () => void;
  onDismiss: () => void;
  onGoTo: (channelId: string, notifId: string, messageId?: string) => void;
}) {
  const cfg = TYPE[notif.type as NotifType] ?? TYPE.mention;
  const Icon = cfg.icon;
  const channelId = (notif as { channelId?: string }).channelId;
  const messageId = (notif as { messageId?: string }).messageId;
  const isUnread = !notif.read;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28, delay: index * 0.025 }}
      className="group relative rounded-2xl mb-2 overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${isUnread ? cfg.border : '#E8EDF8'}`,
        boxShadow: isUnread
          ? `0 2px 12px ${cfg.color}12`
          : '0 1px 4px rgba(62,74,137,0.04)',
      }}
    >
      {/* Left accent stripe for unread */}
      {isUnread && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
          style={{ background: `linear-gradient(180deg, ${cfg.dot}, ${cfg.dot}88)` }}
        />
      )}

      <div className="flex items-start gap-3.5 pl-5 pr-4 py-4">
        {/* Avatar + type badge */}
        <div className="relative shrink-0">
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center text-[12px] font-black text-white"
            style={{ background: notif.actorColor ?? cfg.color }}
          >
            {notif.actorInitials}
          </div>
          <div
            className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-lg flex items-center justify-center border-[2px] border-white"
            style={{ background: cfg.color }}
          >
            <Icon size={9} className="text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Actor + type pill + time */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-black" style={{ color: '#0F172A' }}>
              {notif.actor}
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
              style={cfg.badge}
            >
              {cfg.label}
            </span>
            <span
              className="ml-auto shrink-0 flex items-center gap-0.5 text-[10px] font-medium"
              style={{ color: '#CBD5E1' }}
            >
              <Clock size={9} strokeWidth={2} />
              {relativeTime(notif.timestamp)}
            </span>
          </div>

          {/* Message text */}
          <p
            className="text-[12.5px] leading-relaxed mt-1 line-clamp-2"
            style={{ color: isUnread ? '#374151' : '#64748B', fontWeight: isUnread ? 500 : 400 }}
          >
            {notif.message}
          </p>

          {/* Channel tag */}
          {notif.channel && (
            <div className="flex items-center gap-1 mt-1">
              <Hash size={9} style={{ color: '#CBD5E1' }} />
              <span className="text-[10px] font-semibold" style={{ color: '#94A3B8' }}>
                {notif.channel}
              </span>
            </div>
          )}

          {/* ─── Primary CTA row ─── */}
          <div className="flex items-center gap-2 mt-3">
            {/* Meeting: prominent green join button */}
            {notif.joinLink && (
              <button
                onClick={() => { window.open(notif.joinLink, '_blank', 'noreferrer'); onMarkRead(); }}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-black text-white transition-all active:scale-95 hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg,#059669,#10B981)',
                  boxShadow: '0 3px 10px rgba(5,150,105,0.30)',
                }}
              >
                <Video size={13} strokeWidth={2.5} />
                Join Meeting
                <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            )}

            {/* Message: go to channel and jump to message */}
            {channelId && !notif.joinLink && (
              <button
                onClick={() => onGoTo(channelId, notif.id, messageId)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-black text-white transition-all active:scale-95 hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg,#4F46E5,#6366F1)',
                  boxShadow: '0 3px 10px rgba(99,102,241,0.25)',
                }}
              >
                <Hash size={13} strokeWidth={2.5} />
                Jump to message
                <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            )}

            {/* Mark read (only if unread and no primary CTA already clears it) */}
            {isUnread && !notif.joinLink && !channelId && (
              <button
                onClick={onMarkRead}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all hover:bg-slate-100"
                style={{ color: '#94A3B8' }}
              >
                <CheckCheck size={12} strokeWidth={2} />
                Mark read
              </button>
            )}

            {/* Dismiss — shows on hover at the right */}
            <button
              onClick={onDismiss}
              title="Dismiss"
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
              style={{ color: '#F87171' }}
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
