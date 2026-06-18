'use client';
import React, { useEffect, useState } from 'react';
import { MessageSquare, Smile, Pin, CheckSquare, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'reply' | 'reaction' | 'pin' | 'task' | 'dm';
  actor: string;
  actorInitials: string;
  actorColor: string;
  message: string;
  channel: string;
  onClickAction?: () => void;
}

const TYPE_CONFIG = {
  reply:    { icon: MessageSquare, label: 'Reply',          color: '#3E4A89', bg: '#f5f3ff' },
  reaction: { icon: Smile,         label: 'Reaction',       color: '#f59e0b', bg: '#fffbeb' },
  pin:      { icon: Pin,           label: 'Pinned',         color: '#8b5cf6', bg: '#f5f3ff' },
  task:     { icon: CheckSquare,   label: 'Task assigned',  color: '#10b981', bg: '#ecfdf5' },
  dm:       { icon: MessageSquare, label: 'Direct Message', color: '#6366f1', bg: '#eef2ff' },
};

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TYPE_CONFIG[toast.type];
  const TypeIcon = cfg.icon;
  const clickable = Boolean(toast.onClickAction);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onDismiss(toast.id), 500);
    }, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onDismiss]);

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 500);
  }

  function handleClick() {
    if (toast.onClickAction) {
      toast.onClickAction();
      setLeaving(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }
  }

  return (
    <div
      onClick={clickable ? handleClick : undefined}
      className={`flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl border bg-white max-w-sm w-full transition-all duration-500 ${
        visible && !leaving ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
      }`}
      style={{
        borderColor: `${cfg.color}30`,
        borderLeft: `4px solid ${cfg.color}`,
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: toast.actorColor }}
        >
          <span className="text-xs font-black text-white">{toast.actorInitials}</span>
        </div>
        <div
          className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-lg flex items-center justify-center shadow-md border-2 border-white"
          style={{ backgroundColor: cfg.bg }}
        >
          <TypeIcon size={10} style={{ color: cfg.color }} strokeWidth={3} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {toast.type !== 'dm' && (
            <span className="text-[10px] font-bold text-[#7C859E] uppercase tracking-tight">
              #{toast.channel}
            </span>
          )}
        </div>
        <p className="text-[13px] font-bold text-[#1E2636] leading-tight">{toast.actor}</p>
        <p className="text-xs font-medium text-[#7C859E] mt-1 leading-relaxed line-clamp-2">
          {toast.message}
        </p>
        {clickable && (
          <p className="text-[10px] font-semibold mt-1.5" style={{ color: cfg.color }}>
            Click to open →
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-lg text-[#9BA6D3] hover:text-[#1E2636] hover:bg-[#FAF8F5] transition-all"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 items-end pointer-events-none"
      style={{ maxWidth: '400px' }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-full animate-in slide-in-from-right-10 duration-500"
        >
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
