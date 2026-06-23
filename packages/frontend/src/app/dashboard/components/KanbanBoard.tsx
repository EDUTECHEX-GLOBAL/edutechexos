'use client';

import React, { useState, useEffect } from 'react';
import {
  X, LayoutGrid, Plus, Trash2, Hash,
  ArrowRight, ArrowLeft, CheckCircle2,
  Circle, Clock, Sparkles, Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore, KanbanTask } from '@/store/dashboardStore';

interface KanbanBoardProps {
  onClose: () => void;
}

type Status = 'todo' | 'inprogress' | 'done';

const COLUMNS: {
  id: Status; label: string;
  accent: string; accentBg: string; accentBorder: string;
  icon: React.ReactNode; emptyText: string; emptyHint: string;
}[] = [
  {
    id: 'todo', label: 'To Do',
    accent: '#4B5678', accentBg: 'rgba(75,86,120,0.10)', accentBorder: 'rgba(75,86,120,0.15)',
    icon: <Circle size={13} strokeWidth={2.5} />,
    emptyText: 'No tasks yet', emptyHint: 'Add your first task below',
  },
  {
    id: 'inprogress', label: 'In Progress',
    accent: '#F59E0B', accentBg: 'rgba(245,158,11,0.10)', accentBorder: 'rgba(245,158,11,0.15)',
    icon: <Clock size={13} strokeWidth={2.5} />,
    emptyText: 'Nothing in progress', emptyHint: 'Move a task here when you start',
  },
  {
    id: 'done', label: 'Done',
    accent: '#38D9A9', accentBg: 'rgba(56,217,169,0.10)', accentBorder: 'rgba(56,217,169,0.15)',
    icon: <CheckCircle2 size={13} strokeWidth={2.5} />,
    emptyText: 'Nothing completed yet', emptyHint: 'Finish a task to see it here',
  },
];

const STATUS_ORDER: Status[] = ['todo', 'inprogress', 'done'];
const NEXT_LABEL: Record<Status, string> = { todo: 'Start', inprogress: 'Mark done', done: '' };
const PREV_LABEL: Record<Status, string> = { todo: '', inprogress: 'Back', done: 'Reopen' };

function getNextStatus(s: Status): Status | null {
  const i = STATUS_ORDER.indexOf(s);
  return i < STATUS_ORDER.length - 1 ? STATUS_ORDER[i + 1] : null;
}
function getPrevStatus(s: Status): Status | null {
  const i = STATUS_ORDER.indexOf(s);
  return i > 0 ? STATUS_ORDER[i - 1] : null;
}
function getInitials(name: string): string {
  return name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
}

const AVATAR_COLORS = ['#0AE8D0', '#7C5CFC', '#38D9A9', '#FF6B7F', '#F59E0B', '#A78BFA', '#FF4770'];
function stringToColor(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function TaskDetailModal({ task, colAccent, onClose, onMoveForward, onMoveBack, onDelete, canMoveForward, canMoveBack }: {
  task: KanbanTask; colAccent: string; onClose: () => void;
  onMoveForward: () => void; onMoveBack: () => void; onDelete: () => void;
  canMoveForward: boolean; canMoveBack: boolean;
}) {
  const statusLabel = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[task.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#0D1025', border: `1px solid ${colAccent}30` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: `${colAccent}20` }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: colAccent }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: colAccent }}>{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#FF6B7F] hover:bg-[rgba(255,107,127,0.12)] transition-all"><Trash2 size={13} /></button>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5678] hover:text-[#EEF2F6] hover:bg-[rgba(148,163,184,0.07)] transition-all"><X size={14} /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-base font-bold text-[#EEF2F6] leading-relaxed">{task.text}</p>

          <div className="flex items-center gap-3 flex-wrap">
            {task.assignee && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.10)]">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-[#06080F]"
                  style={{ background: colAccent }}>{task.assigneeInitials}</span>
                <span className="text-xs font-semibold text-[#8896B0]">{task.assignee}</span>
              </div>
            )}
            {task.sourceChannel && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.10)]">
                <Hash size={11} className="text-[#4B5678]" />
                <span className="text-xs font-semibold text-[#8896B0]">{task.sourceChannel}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.10)]">
              <Clock size={11} className="text-[#4B5678]" />
              <span className="text-xs font-semibold text-[#8896B0]">{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {canMoveBack && (
              <button onClick={() => { onMoveBack(); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all text-[#8896B0] border-[rgba(148,163,184,0.15)] hover:border-[rgba(148,163,184,0.3)]">
                <ArrowLeft size={12} />{PREV_LABEL[task.status]}
              </button>
            )}
            {canMoveForward && (
              <button onClick={() => { onMoveForward(); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all text-[#06080F]"
                style={{ background: colAccent }}>
                {NEXT_LABEL[task.status]}<ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TaskCard({
  task, colAccent, colAccentBg,
  onMoveForward, onMoveBack, onDelete,
  canMoveForward, canMoveBack,
}: {
  task: KanbanTask; colAccent: string; colAccentBg: string;
  onMoveForward: () => void; onMoveBack: () => void; onDelete: () => void;
  canMoveForward: boolean; canMoveBack: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const avatarColor = stringToColor(task.assignee || task.assigneeInitials);
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(22,27,61,0.95)' : 'rgba(22,27,61,0.70)',
        borderLeft: `3px solid ${colAccent}`,
        borderTop: `1px solid ${hovered ? `${colAccent}30` : 'rgba(148,163,184,0.08)'}`,
        borderRight: `1px solid ${hovered ? `${colAccent}30` : 'rgba(148,163,184,0.08)'}`,
        borderBottom: `1px solid ${hovered ? `${colAccent}30` : 'rgba(148,163,184,0.08)'}`,
        borderRadius: 12,
        padding: '12px 12px 10px',
        position: 'relative',
        transition: 'all 0.2s',
        boxShadow: hovered ? `0 4px 20px rgba(0,0,0,0.25), 0 0 30px ${colAccent}08` : '0 1px 4px rgba(0,0,0,0.15)',
      }}
    >
      {hovered && (
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            type="button" onClick={() => setExpanded(true)} title="Expand task"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,232,208,0.12)', color: '#0AE8D0', border: '1px solid rgba(10,232,208,0.20)', cursor: 'pointer' }}>
            <Maximize2 size={10} strokeWidth={2.5} />
          </motion.button>
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            type="button" onClick={onDelete} title="Delete task"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,71,112,0.12)', color: '#FF6B7F', border: '1px solid rgba(255,71,112,0.20)', cursor: 'pointer' }}>
            <Trash2 size={11} strokeWidth={2.5} />
          </motion.button>
        </div>
      )}
      <AnimatePresence>
        {expanded && (
          <TaskDetailModal
            task={task} colAccent={colAccent}
            onClose={() => setExpanded(false)}
            onMoveForward={onMoveForward} onMoveBack={onMoveBack} onDelete={onDelete}
            canMoveForward={canMoveForward} canMoveBack={canMoveBack}
          />
        )}
      </AnimatePresence>

      <p style={{
        fontSize: 13, fontWeight: 600,
        color: isDone ? '#4B5678' : '#EEF2F6',
        lineHeight: 1.5, paddingRight: hovered ? 28 : 0,
        textDecoration: isDone ? 'line-through' : 'none',
        transition: 'color 0.15s',
      }}>
        {task.text}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        {task.assigneeInitials && (
          <span
            title={task.assignee}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 800, color: '#06080F',
              backgroundColor: avatarColor, flexShrink: 0,
            }}
          >
            {task.assigneeInitials}
          </span>
        )}
        {task.sourceChannel && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 600, color: '#4B5678',
            background: 'rgba(148,163,184,0.06)', borderRadius: 6, padding: '2px 7px',
          }}>
            <Hash size={8} strokeWidth={2.5} />
            {task.sourceChannel}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {canMoveBack && hovered && (
            <motion.button
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              type="button"
              onClick={onMoveBack}
              title={PREV_LABEL[task.status]}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9, fontWeight: 700, color: '#4B5678',
                background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.12)',
                borderRadius: 6, padding: '3px 7px', cursor: 'pointer',
              }}
            >
              <ArrowLeft size={9} strokeWidth={2.5} />
              {PREV_LABEL[task.status]}
            </motion.button>
          )}
          {canMoveForward && hovered && (
            <motion.button
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              type="button"
              onClick={onMoveForward}
              title={NEXT_LABEL[task.status]}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9, fontWeight: 700, color: '#06080F',
                background: colAccent, border: `1px solid ${colAccent}`,
                borderRadius: 6, padding: '3px 7px', cursor: 'pointer',
                boxShadow: `0 2px 8px ${colAccent}30`,
              }}
            >
              {NEXT_LABEL[task.status]}
              <ArrowRight size={9} strokeWidth={2.5} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AddTaskForm({ onAdd, accent }: { onAdd: (text: string, assignee: string) => void; accent: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), assignee.trim());
    setText('');
    setAssignee('');
    setOpen(false);
  };

  if (!open) {
    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 10px', borderRadius: 10,
          border: `1.5px dashed ${accent}30`,
          background: `${accent}06`, color: accent,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Plus size={13} strokeWidth={2.5} />
        Add task
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(22,27,61,0.85)', border: '1px solid rgba(148,163,184,0.10)',
        borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === 'Escape') setOpen(false); }}
        placeholder="What needs to be done?"
        rows={2}
        style={{
          width: '100%', resize: 'none', outline: 'none', border: 'none',
          fontSize: 13, fontWeight: 500, color: '#EEF2F6', lineHeight: 1.5,
          background: 'transparent', fontFamily: 'inherit',
        }}
      />
      <input
        type="text"
        value={assignee}
        onChange={e => setAssignee(e.target.value)}
        placeholder="Assignee (optional)"
        style={{
          outline: 'none', border: '1px solid rgba(148,163,184,0.10)', borderRadius: 8,
          padding: '5px 8px', fontSize: 11, color: '#8896B0',
          background: 'rgba(13,16,37,0.50)', fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
            background: text.trim() ? accent : 'rgba(148,163,184,0.08)',
            color: text.trim() ? '#06080F' : '#4B5678',
            fontSize: 11, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.10)',
            background: 'transparent', color: '#4B5678', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

export default function KanbanBoard({ onClose }: KanbanBoardProps) {
  const allKanbanTasks = useDashboardStore((s) => s.kanbanTasks);
  const addKanbanTask = useDashboardStore((s) => s.addKanbanTask);
  const updateKanbanTaskStatus = useDashboardStore((s) => s.updateKanbanTaskStatus);
  const deleteKanbanTask = useDashboardStore((s) => s.deleteKanbanTask);
  const activeChannel = useDashboardStore((s) => s.activeChannel);
  const channels = useDashboardStore((s) => s.channels);

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem('edutechex_token');
      if (raw) {
        const { user } = JSON.parse(raw);
        setCurrentUserEmail((user?.email ?? '').toLowerCase());
        setCurrentUserName((user?.name ?? '').toLowerCase());
      }
    } catch { /* ignore */ }
  }, []);

  const channelName = channels.find((c) => c.id === activeChannel)?.name ?? activeChannel;
  const kanbanTasks = allKanbanTasks.filter((t) => {
    if (t.assigneeEmail) return t.assigneeEmail.toLowerCase() === currentUserEmail;
    return t.assignee.toLowerCase() === currentUserName;
  });

  const tasksByStatus = (status: Status) => kanbanTasks.filter((t) => t.status === status);
  const totalTasks = kanbanTasks.length;
  const doneTasks = tasksByStatus('done').length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleAddTask = (colId: Status) => (text: string, assignee: string) => {
    const name = assignee || currentUserName || 'Unassigned';
    addKanbanTask({
      text,
      assignee: name,
      assigneeInitials: getInitials(name),
      assigneeEmail: !assignee ? currentUserEmail || undefined : undefined,
      sourceChannel: channelName,
      status: colId,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flexShrink: 0,
          padding: '16px 18px 14px',
          borderBottom: '1px solid rgba(148,163,184,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(10,232,208,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LayoutGrid size={15} color="#0AE8D0" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4B5678', marginBottom: 1 }}>
                Task Board
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#EEF2F6', lineHeight: 1 }}>
                My Tasks
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#4B5678',
              background: 'rgba(148,163,184,0.06)', borderRadius: 20,
              padding: '3px 10px', border: '1px solid rgba(148,163,184,0.08)',
            }}>
              {doneTasks}/{totalTasks} done
            </span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: '#4B5678', fontWeight: 600 }}>Overall progress</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: progressPct === 100 ? '#38D9A9' : '#4B5678' }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(148,163,184,0.06)', borderRadius: 10, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: '100%', borderRadius: 10,
                background: progressPct === 100
                  ? 'linear-gradient(90deg, #38D9A9, #0AE8D0)'
                  : 'linear-gradient(90deg, #0AE8D0, #7C5CFC)',
                boxShadow: '0 0 12px rgba(10,232,208,0.15)',
              }}
            />
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12, padding: 16, overflowX: 'auto' }}>
        <AnimatePresence>
          {COLUMNS.map((col, colIdx) => {
            const tasks = tasksByStatus(col.id);
            return (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: colIdx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column',
                  background: 'rgba(13,16,37,0.50)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 14,
                  border: `1px solid ${col.accentBorder}`,
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: '11px 14px 10px',
                  borderBottom: `1px solid ${col.accentBorder}`,
                  background: col.accentBg,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: col.accent, display: 'flex', alignItems: 'center' }}>
                    {col.icon}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#EEF2F6', flex: 1 }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    background: col.accent, color: '#06080F',
                    minWidth: 20, height: 20, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px',
                  }}>
                    {tasks.length}
                  </span>
                </div>

                <div style={{
                  flex: 1, overflowY: 'auto', padding: '10px 10px 6px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {tasks.length === 0 ? (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '28px 12px', borderRadius: 10,
                      border: `1.5px dashed ${col.accent}20`,
                      background: `${col.accent}04`,
                      textAlign: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 20, opacity: 0.3 }}>
                        {col.id === 'todo' ? '📋' : col.id === 'inprogress' ? '⏳' : '✅'}
                      </span>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#4B5678', marginTop: 4 }}>
                        {col.emptyText}
                      </p>
                      <p style={{ fontSize: 10, color: '#4B5678' }}>
                        {col.emptyHint}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          colAccent={col.accent}
                          colAccentBg={col.accentBg}
                          canMoveForward={!!getNextStatus(task.status)}
                          canMoveBack={!!getPrevStatus(task.status)}
                          onMoveForward={() => {
                            const next = getNextStatus(task.status);
                            if (next) updateKanbanTaskStatus(task.id, next);
                          }}
                          onMoveBack={() => {
                            const prev = getPrevStatus(task.status);
                            if (prev) updateKanbanTaskStatus(task.id, prev);
                          }}
                          onDelete={() => deleteKanbanTask(task.id)}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                <div style={{
                  padding: '6px 10px 10px',
                  borderTop: `1px solid ${col.accentBorder}`,
                  background: col.accentBg,
                }}>
                  <AddTaskForm accent={col.accent} onAdd={handleAddTask(col.id)} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
