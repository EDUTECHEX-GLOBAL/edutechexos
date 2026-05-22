'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { X, MessageSquare, Smile, Pin, CheckSquare, Bell, BellOff, AtSign } from 'lucide-react';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_CONFIG = {
  reply: { icon: MessageSquare, label: 'Reply', color: '#6366f1', bg: '#f5f3ff' }, // Indigo-500
  reaction: { icon: Smile, label: 'Reaction', color: '#f59e0b', bg: '#fffbeb' }, // Amber-500
  pin: { icon: Pin, label: 'Pinned', color: '#8b5cf6', bg: '#f5f3ff' }, // Violet-500
  task: { icon: CheckSquare, label: 'Task', color: '#10b981', bg: '#ecfdf5' }, // Emerald-500
  mention: { icon: AtSign, label: 'Mention', color: '#ef4444', bg: '#fef2f2' }, // Red-500
};

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const allNotifications = useDashboardStore((s) => s.notifications);
  const markRead = useDashboardStore((s) => s.markNotificationRead);
  const dismiss = useDashboardStore((s) => s.dismissNotification);

  const [filter, setFilter] = useState<'all' | 'reply' | 'reaction' | 'pin' | 'task' | 'mention'>('all');
  const [muted, setMuted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [currentEmail, setCurrentEmail] = useState('');

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

  const notifications = allNotifications.filter((notification) => {
    if (!notification.recipientEmails?.length) return true;
    return notification.recipientEmails.map((email) => email.toLowerCase()).includes(currentEmail);
  });
  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 50);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop with premium blur */}
      <div
        className={`fixed inset-0 z-[100] bg-slate-900/10 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full z-[101] flex flex-col shadow-2xl bg-white border-l border-slate-200 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '380px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-colors ${
              unreadCount > 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'
            }`}>
              <Bell size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMuted((v) => !v)}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <BellOff size={16} /> : <Bell size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-slate-50 overflow-x-auto scrollbar-none">
          {(['all', 'reply', 'reaction', 'pin', 'task', 'mention'] as const).map((f) => {
            const isActive = filter === f;
            const cfg = f !== 'all' ? TYPE_CONFIG[f] : null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  isActive 
                    ? (cfg ? `bg-white border-2 shadow-sm` : 'bg-slate-900 text-white shadow-lg shadow-slate-100') 
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border-2 border-transparent'
                }`}
                style={{
                  borderColor: isActive && cfg ? cfg.color : 'transparent',
                  color: isActive && cfg ? cfg.color : undefined
                }}
              >
                {cfg && <cfg.icon size={12} strokeWidth={3} />}
                {f}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-50/30">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-10 text-center animate-fade-in">
              <div className="h-16 w-16 rounded-3xl bg-white border border-slate-100 flex items-center justify-center text-2xl shadow-sm text-slate-300">
                <BellOff size={28} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-widest">All caught up</p>
                <p className="text-[11px] font-medium text-slate-400 mt-1 leading-relaxed">No {filter !== 'all' ? filter : ''} notifications at the moment.</p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <div className="px-6 py-2 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => filtered.filter((item) => !item.read).forEach((item) => markRead(item.id))}
                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {filtered.map((notif, idx) => {
                const cfg = TYPE_CONFIG[notif.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    className={`group relative flex gap-4 px-6 py-4 cursor-pointer transition-all border-l-4 ${
                      notif.read ? 'border-transparent bg-transparent hover:bg-white' : 'bg-white shadow-sm ring-1 ring-slate-100/50'
                    }`}
                    style={{ 
                      borderLeftColor: notif.read ? 'transparent' : cfg.color,
                      animationDelay: `${idx * 50}ms`
                    }}
                    onClick={() => markRead(notif.id)}
                  >
                    {/* Actor avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: notif.actorColor }}
                      >
                        <span className="text-xs font-black text-white">
                          {notif.actorInitials}
                        </span>
                      </div>
                      {/* Type badge */}
                      <div
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center shadow-md border-2 border-white"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <Icon size={10} style={{ color: cfg.color }} strokeWidth={3} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-bold text-slate-900 leading-tight">{notif.actor}</p>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight whitespace-nowrap">
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500">
                          <span className="text-[9px] font-black uppercase tracking-widest">#{notif.channel}</span>
                        </div>
                        {!notif.read && (
                          <div className="h-1.5 w-1.5 rounded-full animate-pulse ml-auto" style={{ backgroundColor: cfg.color }} />
                        )}
                      </div>
                    </div>

                    {/* Dismiss button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                      className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 bg-white">
          <div className={`flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${muted ? 'text-slate-400' : 'text-indigo-600 animate-pulse'}`}>
             {muted ? 'Silent Mode' : 'Live Alerts Active'}
          </div>
        </div>
      </div>
    </>
  );
}
