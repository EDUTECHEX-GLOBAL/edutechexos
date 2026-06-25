'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import {
  X,
  MessageSquare,
  Smile,
  Pin,
  CheckSquare,
  Bell,
  BellOff,
  AtSign,
  ChevronDown,
  ChevronUp,
  Clock,
  Hash,
  Video,
} from 'lucide-react';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatFullTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const TYPE_CONFIG = {
  reply: {
    icon: MessageSquare,
    color: '#3E4A89',
    bg: '#eef2ff',
    label: 'Reply',
    gradient: 'linear-gradient(135deg,#3E4A89,#9BA6D3)',
  },
  reaction: {
    icon: Smile,
    color: '#f59e0b',
    bg: '#fffbeb',
    label: 'Reaction',
    gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
  },
  pin: {
    icon: Pin,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    label: 'Pinned',
    gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa)',
  },
  task: {
    icon: CheckSquare,
    color: '#10b981',
    bg: '#ecfdf5',
    label: 'Task',
    gradient: 'linear-gradient(135deg,#10b981,#34d399)',
  },
  mention: {
    icon: AtSign,
    color: '#ef4444',
    bg: '#fef2f2',
    label: 'Mention',
    gradient: 'linear-gradient(135deg,#ef4444,#f87171)',
  },
};

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  onGoToChannel?: (channelId: string) => void;
}

export default function NotificationPanel({ open, onClose, onGoToChannel }: NotificationPanelProps) {
  const allNotifications = useDashboardStore((s) => s.notifications);
  const markRead = useDashboardStore((s) => s.markNotificationRead);
  const dismiss = useDashboardStore((s) => s.dismissNotification);
  const setActiveChannel = useDashboardStore((s) => s.setActiveChannel);
  const clearUnread = useDashboardStore((s) => s.clearUnread);
  const panelRef = useRef<HTMLDivElement>(null);
  const [currentEmail, setCurrentEmail] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const authData = localStorage.getItem('edutechex_token');
      if (!authData) return;
      const { user } = JSON.parse(authData);
      setCurrentEmail(user?.email?.toLowerCase() || '');
    } catch {
      setCurrentEmail('');
    }
  }, [open]);

  const notifications = allNotifications.filter((n) => {
    // Only show notifications that are directly relevant to this user:
    // - explicitly addressed to them via recipientEmails
    // - OR meeting join notifications (joinLink present) when no specific recipients set
    if (n.recipientEmails?.length) {
      return n.recipientEmails.map((e) => e.toLowerCase()).includes(currentEmail);
    }
    // Untargeted notifications (no recipientEmails) are only shown if they have a join link
    return !!n.joinLink;
  });
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', h), 50);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);

  if (!open) return null;

  const handleToggle = (id: string, read: boolean) => {
    setExpandedId(expandedId === id ? null : id);
    if (!read) markRead(id);
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/10 backdrop-blur-[2px]" onClick={onClose} />

      <div
        ref={panelRef}
        className="fixed bottom-4 left-2 right-2 sm:left-16 sm:right-auto sm:w-[380px] z-[201] rounded-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: '78vh',
          background: 'linear-gradient(160deg,#191E2F 0%,#312e81 40%,#191E2F 100%)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.40), 0 0 0 1px rgba(165,180,252,0.20)',
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: 'linear-gradient(135deg,#3E4A89,#9BA6D3)',
                  boxShadow: '0 4px 12px rgba(62,74,137,0.50)',
                }}
              >
                <Bell size={16} strokeWidth={2.5} className="text-white" />
              </div>
              <div>
                <p className="text-[15px] font-black text-white tracking-tight">Notifications</p>
                <p
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(165,180,252,0.70)' }}
                >
                  {unread > 0 ? `${unread} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() =>
                    notifications.filter((n) => !n.read).forEach((n) => markRead(n.id))
                  }
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-black uppercase tracking-widest transition-colors"
                  style={{ color: '#a5b4fc', background: 'rgba(165,180,252,0.12)' }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Shimmer divider */}
          <div
            className="mt-4 h-px"
            style={{
              background: 'linear-gradient(90deg,transparent,rgba(165,180,252,0.35),transparent)',
            }}
          />
        </div>

        {/* List */}
        <div
          className="flex-1 overflow-y-auto px-3 pb-4 space-y-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                <BellOff size={24} style={{ color: 'rgba(165,180,252,0.40)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-white/60">All caught up</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(165,180,252,0.45)' }}>
                  No notifications yet
                </p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.mention;
              const Icon = cfg.icon;
              const isExpanded = expandedId === notif.id;

              return (
                <motion.div
                  key={notif.id}
                  layout
                  transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                  className="rounded-xl overflow-hidden cursor-pointer"
                  style={{
                    background: isExpanded
                      ? 'rgba(255,255,255,0.12)'
                      : notif.read
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(255,255,255,0.08)',
                    border: isExpanded
                      ? `1px solid ${cfg.color}55`
                      : notif.read
                        ? '1px solid rgba(255,255,255,0.06)'
                        : `1px solid ${cfg.color}33`,
                    boxShadow: isExpanded ? `0 4px 20px ${cfg.color}22` : 'none',
                  }}
                  onClick={() => handleToggle(notif.id, notif.read)}
                >
                  {/* Collapsed row */}
                  <div className="flex items-center gap-3 px-3.5 py-3">
                    {/* Avatar + type badge */}
                    <div className="relative shrink-0">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-sm"
                        style={{ background: notif.actorColor }}
                      >
                        {notif.actorInitials}
                      </div>
                      <div
                        className="absolute -bottom-1 -right-1 rounded-md flex items-center justify-center border-2"
                        style={{ background: cfg.gradient, borderColor: '#191E2F', width: 18, height: 18 }}
                      >
                        <Icon size={9} className="text-white" strokeWidth={3} />
                      </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[13px] font-black leading-tight"
                          style={{ background: cfg.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                        >
                          {notif.actor}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
                          style={{ background: `${cfg.color}22`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[9px] font-bold" style={{ color: 'rgba(165,180,252,0.50)' }}>
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.60)' }}>
                        {notif.message}
                      </p>
                      {/* Inline action buttons — always visible, no expand needed */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {notif.joinLink && (
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(notif.joinLink, '_blank', 'noreferrer'); markRead(notif.id); }}
                            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black text-white"
                            style={{ background: 'linear-gradient(135deg,#10b981,#34d399)', boxShadow: '0 2px 6px rgba(16,185,129,0.35)' }}
                          >
                            <Video size={9} strokeWidth={2.5} /> Join Meeting
                          </button>
                        )}
                        {(notif as { channelId?: string }).channelId && !notif.joinLink && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const cId = (notif as { channelId?: string }).channelId!;
                              setActiveChannel(cId);
                              clearUnread(cId);
                              markRead(notif.id);
                              onClose();
                            }}
                            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black text-white"
                            style={{ background: 'linear-gradient(135deg,#3E4A89,#6C7BF5)', boxShadow: '0 2px 6px rgba(62,74,137,0.35)' }}
                          >
                            <Hash size={9} strokeWidth={2.5} /> Go to message
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                          className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
                          style={{ color: 'rgba(248,113,113,0.8)', background: 'rgba(239,68,68,0.10)' }}
                        >
                          <X size={9} /> Dismiss
                        </button>
                      </div>
                    </div>

                    {/* Unread dot */}
                    <div className="flex flex-col items-end gap-1 shrink-0 self-start pt-1">
                      {!notif.read && (
                        <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: cfg.color }} />
                      )}
                      {isExpanded ? (
                        <ChevronUp size={12} style={{ color: cfg.color }} />
                      ) : (
                        <ChevronDown size={12} style={{ color: 'rgba(165,180,252,0.35)' }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="detail"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        style={{ overflow: 'hidden' }}
                      >
                        {/* Thin colour separator */}
                        <div
                          className="mx-3.5 h-px"
                          style={{
                            background: `linear-gradient(90deg,transparent,${cfg.color}55,transparent)`,
                          }}
                        />

                        <div className="px-3.5 py-3 space-y-3">
                          {/* Full message highlighted */}
                          <div
                            className="rounded-xl px-3 py-2.5"
                            style={{
                              background: `${cfg.color}14`,
                              border: `1px solid ${cfg.color}30`,
                            }}
                          >
                            <p
                              className="text-[13px] leading-relaxed font-medium"
                              style={{ color: 'rgba(255,255,255,0.88)' }}
                            >
                              {notif.message}
                            </p>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div
                              className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                              style={{ background: 'rgba(255,255,255,0.07)' }}
                            >
                              <Hash size={10} style={{ color: cfg.color }} />
                              <span
                                className="text-[11px] font-bold"
                                style={{ color: 'rgba(255,255,255,0.65)' }}
                              >
                                {notif.channel}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                              style={{ background: 'rgba(255,255,255,0.07)' }}
                            >
                              <Clock size={10} style={{ color: 'rgba(165,180,252,0.60)' }} />
                              <span
                                className="text-[11px] font-bold"
                                style={{ color: 'rgba(255,255,255,0.55)' }}
                              >
                                {formatFullTime(notif.timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* Action row */}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismiss(notif.id);
                                setExpandedId(null);
                              }}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors"
                              style={{ color: '#f87171', background: 'rgba(239,68,68,0.12)' }}
                            >
                              <X size={11} /> Dismiss
                            </button>
                            <div className="flex items-center gap-2">
                              {(notif as { channelId?: string }).channelId && !notif.joinLink && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const cId = (notif as { channelId?: string }).channelId!;
                                    setActiveChannel(cId);
                                    if (onGoToChannel) onGoToChannel(cId);
                                    markRead(notif.id);
                                    onClose();
                                  }}
                                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black text-white transition-opacity hover:opacity-90"
                                  style={{
                                    background: 'linear-gradient(135deg,#3E4A89,#6C7BF5)',
                                    boxShadow: '0 2px 8px rgba(62,74,137,0.40)',
                                  }}
                                >
                                  <Hash size={11} strokeWidth={2.5} /> Go to message
                                </button>
                              )}
                              {notif.joinLink && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(notif.joinLink, '_blank', 'noreferrer');
                                  }}
                                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black text-white transition-opacity hover:opacity-90"
                                  style={{
                                    background: 'linear-gradient(135deg,#10b981,#34d399)',
                                    boxShadow: '0 2px 8px rgba(16,185,129,0.40)',
                                  }}
                                >
                                  <Video size={11} strokeWidth={2.5} /> Join Meeting
                                </button>
                              )}
                              <div
                                className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                                style={{
                                  background: cfg.gradient,
                                  boxShadow: `0 2px 8px ${cfg.color}44`,
                                }}
                              >
                                <Icon size={11} className="text-white" strokeWidth={2.5} />
                                <span className="text-[11px] font-black text-white uppercase tracking-wider">
                                  {cfg.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
