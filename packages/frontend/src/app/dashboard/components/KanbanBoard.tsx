'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, Hash,
  ArrowRight, ArrowLeft, CheckCircle2,
  Circle, Clock, CheckSquare, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore, KanbanTask } from '@/store/dashboardStore';

interface KanbanBoardProps {
  onClose: () => void;
}

type Status = 'todo' | 'inprogress' | 'done';

const COLUMNS: {
  id: Status; label: string;
  accent: string; bg: string; border: string; icon: React.ReactNode;
  emptyText: string;
}[] = [
  { id: 'todo',       label: 'To Do',       accent: '#6366f1', bg: '#f5f3ff', border: '#e0e7ff', icon: <Circle size={14} strokeWidth={2} />,        emptyText: 'No tasks yet' },
  { id: 'inprogress', label: 'In Progress',  accent: '#f59e0b', bg: '#fffbeb', border: '#fef3c7', icon: <Clock size={14} strokeWidth={2} />,          emptyText: 'Nothing in progress' },
  { id: 'done',       label: 'Done',         accent: '#10b981', bg: '#ecfdf5', border: '#d1fae5', icon: <CheckCircle2 size={14} strokeWidth={2} />,   emptyText: 'Nothing completed yet' },
];

const STATUS_ORDER: Status[] = ['todo', 'inprogress', 'done'];
const NEXT_LABEL: Record<Status, string> = { todo: 'Start',  inprogress: 'Complete', done: '' };
const PREV_LABEL: Record<Status, string> = { todo: '',       inprogress: 'Back',     done: 'Reopen' };

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
const AVATAR_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
function stringToColor(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AddTaskForm({ onAdd, accent }: { onAdd: (text: string, assignee: string) => void; accent: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), assignee.trim());
    setText(''); setAssignee(''); setOpen(false);
  };

  if (!open) return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 10px', borderRadius: 8,
        border: `1.5px dashed ${accent}40`,
        background: 'transparent', color: accent,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}08`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <Plus size={13} strokeWidth={2.5} /> Add task
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
    >
      <textarea
        autoFocus value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === 'Escape') setOpen(false); }}
        placeholder="What needs to be done?"
        rows={2}
        style={{ width: '100%', resize: 'none', outline: 'none', border: 'none', fontSize: 13, fontWeight: 500, color: '#111', lineHeight: 1.5, background: 'transparent', fontFamily: 'inherit' }}
      />
      <input
        type="text" value={assignee} onChange={e => setAssignee(e.target.value)}
        placeholder="Assignee (optional)"
        style={{ outline: 'none', border: '1px solid #e5e7eb', borderRadius: 7, padding: '5px 8px', fontSize: 11, color: '#555', background: '#fafafa', fontFamily: 'inherit' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={submit} disabled={!text.trim()}
          style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: text.trim() ? accent : '#f3f4f6', color: text.trim() ? '#fff' : '#9ca3af', fontSize: 11, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
          Add Task
        </button>
        <button type="button" onClick={() => setOpen(false)}
          style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function TaskCard({ task, colAccent, onMoveForward, onMoveBack, onDelete, canMoveForward, canMoveBack }: {
  task: KanbanTask; colAccent: string;
  onMoveForward: () => void; onMoveBack: () => void; onDelete: () => void;
  canMoveForward: boolean; canMoveBack: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const avatarColor = stringToColor(task.assignee || task.assigneeInitials);
  const isDone = task.status === 'done';

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onClick={() => setExpanded(true)}
        style={{
          background: '#fff',
          border: `1px solid ${hovered ? `${colAccent}30` : '#f0f0f0'}`,
          borderLeft: `3px solid ${colAccent}`,
          borderRadius: 10, padding: '11px 12px 10px',
          cursor: 'pointer', transition: 'all 0.15s',
          boxShadow: hovered ? `0 4px 16px rgba(0,0,0,0.08)` : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: isDone ? '#9ca3af' : '#111', lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none', flex: 1 }}>
            {task.text}
          </p>
          {hovered && (
            <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <Trash2 size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
          {task.assigneeInitials && (
            <span title={task.assignee} style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#fff', background: avatarColor, flexShrink: 0 }}>
              {task.assigneeInitials}
            </span>
          )}
          {task.sourceChannel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderRadius: 5, padding: '2px 6px', border: '1px solid #f0f0f0' }}>
              <Hash size={8} strokeWidth={2.5} />{task.sourceChannel}
            </span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {canMoveBack && hovered && (
              <button type="button" onClick={e => { e.stopPropagation(); onMoveBack(); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9, fontWeight: 700, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 6px', cursor: 'pointer' }}
                title={PREV_LABEL[task.status]}
              >
                <ArrowLeft size={8} strokeWidth={2.5} />{PREV_LABEL[task.status]}
              </button>
            )}
            {canMoveForward && hovered && (
              <button type="button" onClick={e => { e.stopPropagation(); onMoveForward(); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9, fontWeight: 700, color: '#fff', background: colAccent, border: 'none', borderRadius: 5, padding: '2px 6px', cursor: 'pointer' }}
                title={NEXT_LABEL[task.status]}
              >
                {NEXT_LABEL[task.status]}<ArrowRight size={8} strokeWidth={2.5} />
              </button>
            )}
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={() => setExpanded(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: `${colAccent}08` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: colAccent }} />
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: colAccent }}>
                    {{ todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[task.status]}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                  <button onClick={() => setExpanded(false)} style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', color: '#6b7280', border: 'none', cursor: 'pointer' }}>
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '18px 18px 16px' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.5, marginBottom: 14 }}>{task.text}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {task.assignee && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f0f0f0' }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: colAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#fff' }}>{task.assigneeInitials}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{task.assignee}</span>
                    </div>
                  )}
                  {task.sourceChannel && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f0f0f0' }}>
                      <Hash size={11} color="#9ca3af" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{task.sourceChannel}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f0f0f0' }}>
                    <Clock size={11} color="#9ca3af" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {canMoveBack && (
                    <button onClick={() => { onMoveBack(); setExpanded(false); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 9, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <ArrowLeft size={13} />{PREV_LABEL[task.status]}
                    </button>
                  )}
                  {canMoveForward && (
                    <button onClick={() => { onMoveForward(); setExpanded(false); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 9, border: 'none', background: colAccent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {NEXT_LABEL[task.status]}<ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function KanbanBoard({ onClose }: KanbanBoardProps) {
  const allKanbanTasks   = useDashboardStore((s) => s.kanbanTasks);
  const addKanbanTask    = useDashboardStore((s) => s.addKanbanTask);
  const updateKanbanTaskStatus = useDashboardStore((s) => s.updateKanbanTaskStatus);
  const deleteKanbanTask = useDashboardStore((s) => s.deleteKanbanTask);
  const activeChannel    = useDashboardStore((s) => s.activeChannel);
  const channels         = useDashboardStore((s) => s.channels);

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName,  setCurrentUserName]  = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem('edutechex_token');
      if (raw) {
        const { user } = JSON.parse(raw);
        setCurrentUserEmail((user?.email ?? '').toLowerCase());
        setCurrentUserName((user?.name  ?? '').toLowerCase());
      }
    } catch { /* ignore */ }
  }, []);

  const channelName = channels.find((c) => c.id === activeChannel)?.name ?? activeChannel;
  const kanbanTasks = allKanbanTasks.filter((t) => {
    if (t.assigneeEmail) return t.assigneeEmail.toLowerCase() === currentUserEmail;
    return t.assignee.toLowerCase() === currentUserName;
  });

  const tasksByStatus = (status: Status) => kanbanTasks.filter((t) => t.status === status);
  const totalTasks    = kanbanTasks.length;
  const doneTasks     = tasksByStatus('done').length;
  const progressPct   = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleAddTask = (colId: Status) => (text: string, assignee: string) => {
    const name = assignee || currentUserName || 'Unassigned';
    addKanbanTask({ text, assignee: name, assigneeInitials: getInitials(name), assigneeEmail: !assignee ? currentUserEmail || undefined : undefined, sourceChannel: channelName, status: colId });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f8f9fb', borderRadius: 16, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, padding: '16px 20px 14px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
              <CheckSquare size={16} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: 0, lineHeight: 1.2 }}>My Tasks</p>
              <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, margin: 0 }}>{totalTasks} task{totalTasks !== 1 ? 's' : ''} · {doneTasks} done</p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall progress</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: progressPct === 100 ? '#10b981' : '#6366f1' }}>{progressPct}%</span>
          </div>
          <div style={{ height: 5, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', borderRadius: 99, background: progressPct === 100 ? 'linear-gradient(90deg,#10b981,#6366f1)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', boxShadow: '0 0 8px rgba(99,102,241,0.2)' }}
            />
          </div>
        </div>
      </div>

      {/* ── Columns ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12, padding: '14px 14px 14px', overflowX: 'auto' }}>
        <AnimatePresence>
          {COLUMNS.map((col, colIdx) => {
            const tasks = tasksByStatus(col.id);
            return (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: colIdx * 0.07 }}
                style={{ width: 265, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRadius: 12, background: '#fff', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {/* Column header */}
                <div style={{ padding: '10px 12px 9px', background: col.bg, borderBottom: `1px solid ${col.border}`, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                  <span style={{ color: col.accent }}>{col.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#111', flex: 1 }}>{col.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, background: col.accent, color: '#fff', minWidth: 20, height: 20, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                    {tasks.length}
                  </span>
                </div>

                {/* Task list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <AnimatePresence mode="popLayout">
                    {tasks.length === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 12px', textAlign: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, color: col.accent }}>
                          {col.icon}
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', margin: 0 }}>{col.emptyText}</p>
                      </motion.div>
                    )}
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id} task={task} colAccent={col.accent}
                        canMoveForward={!!getNextStatus(task.status)}
                        canMoveBack={!!getPrevStatus(task.status)}
                        onMoveForward={() => { const n = getNextStatus(task.status); if (n) updateKanbanTaskStatus(task.id, n); }}
                        onMoveBack={() => { const p = getPrevStatus(task.status); if (p) updateKanbanTaskStatus(task.id, p); }}
                        onDelete={() => deleteKanbanTask(task.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add task */}
                <div style={{ padding: '6px 8px 8px', flexShrink: 0 }}>
                  <AddTaskForm onAdd={handleAddTask(col.id)} accent={col.accent} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
