'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutGrid,
  Plus,
  Trash2,
  Hash,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useDashboardStore, KanbanTask } from '@/store/dashboardStore';

interface KanbanBoardProps {
  onClose: () => void;
}

type Status = 'todo' | 'inprogress' | 'done';

const COLUMNS: {
  id: Status;
  label: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  icon: React.ReactNode;
  emptyText: string;
  emptyHint: string;
}[] = [
  {
    id: 'todo',
    label: 'To Do',
    accent: '#64748B',
    accentBg: 'rgba(100,116,139,0.07)',
    accentBorder: 'rgba(100,116,139,0.18)',
    icon: <Circle size={13} strokeWidth={2.5} />,
    emptyText: 'No tasks yet',
    emptyHint: 'Add your first task below',
  },
  {
    id: 'inprogress',
    label: 'In Progress',
    accent: '#D97706',
    accentBg: 'rgba(217,119,6,0.07)',
    accentBorder: 'rgba(217,119,6,0.20)',
    icon: <Clock size={13} strokeWidth={2.5} />,
    emptyText: 'Nothing in progress',
    emptyHint: 'Move a task here when you start',
  },
  {
    id: 'done',
    label: 'Done',
    accent: '#059669',
    accentBg: 'rgba(5,150,105,0.07)',
    accentBorder: 'rgba(5,150,105,0.20)',
    icon: <CheckCircle2 size={13} strokeWidth={2.5} />,
    emptyText: 'Nothing completed yet',
    emptyHint: "Finish a task to see it here",
  },
];

const STATUS_ORDER: Status[] = ['todo', 'inprogress', 'done'];

const NEXT_LABEL: Record<Status, string> = {
  todo: 'Start',
  inprogress: 'Mark done',
  done: '',
};
const PREV_LABEL: Record<Status, string> = {
  todo: '',
  inprogress: 'Back to Todo',
  done: 'Reopen',
};

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

const AVATAR_COLORS = ['#3E4A89', '#0891b2', '#059669', '#dc2626', '#7c3aed', '#d97706', '#db2777'];
function stringToColor(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface TaskCardProps {
  task: KanbanTask;
  colAccent: string;
  colAccentBg: string;
  onMoveForward: () => void;
  onMoveBack: () => void;
  onDelete: () => void;
  canMoveForward: boolean;
  canMoveBack: boolean;
}

function TaskCard({ task, colAccent, colAccentBg, onMoveForward, onMoveBack, onDelete, canMoveForward, canMoveBack }: TaskCardProps) {
  const [hovered, setHovered] = useState(false);
  const avatarColor = stringToColor(task.assignee || task.assigneeInitials);
  const isDone = task.status === 'done';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#FAFAFA' : '#FFFFFF',
        borderTop: `1.5px solid ${hovered ? colAccent + '35' : 'rgba(26,27,58,0.08)'}`,
        borderRight: `1.5px solid ${hovered ? colAccent + '35' : 'rgba(26,27,58,0.08)'}`,
        borderBottom: `1.5px solid ${hovered ? colAccent + '35' : 'rgba(26,27,58,0.08)'}`,
        borderLeft: `3px solid ${colAccent}`,
        borderRadius: 12,
        padding: '12px 12px 10px',
        position: 'relative',
        transition: 'all 0.15s',
        boxShadow: hovered ? `0 4px 16px ${colAccent}15` : '0 1px 4px rgba(26,27,58,0.04)',
      }}
    >
      {/* Delete — top right on hover */}
      {hovered && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete task"
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 24, height: 24, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(239,68,68,0.07)', color: '#DC2626',
            border: 'none', cursor: 'pointer', transition: 'background 0.12s',
          }}
        >
          <Trash2 size={11} strokeWidth={2.5} />
        </button>
      )}

      {/* Task text */}
      <p style={{
        fontSize: 13,
        fontWeight: 600,
        color: isDone ? '#9BA6C0' : '#1E2636',
        lineHeight: 1.5,
        paddingRight: hovered ? 28 : 0,
        textDecoration: isDone ? 'line-through' : 'none',
        transition: 'color 0.15s',
      }}>
        {task.text}
      </p>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        {task.assigneeInitials && (
          <span
            title={task.assignee}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 800, color: '#fff',
              backgroundColor: avatarColor, flexShrink: 0,
            }}
          >
            {task.assigneeInitials}
          </span>
        )}
        {task.sourceChannel && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 600, color: '#7C859E',
            background: 'rgba(62,74,137,0.07)', borderRadius: 6, padding: '2px 7px',
          }}>
            <Hash size={8} strokeWidth={2.5} />
            {task.sourceChannel}
          </span>
        )}

        {/* Move buttons — appear on hover, pushed to right */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {canMoveBack && hovered && (
            <button
              type="button"
              onClick={onMoveBack}
              title={PREV_LABEL[task.status]}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9, fontWeight: 700, color: '#64748B',
                background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.18)',
                borderRadius: 6, padding: '3px 7px', cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              <ArrowLeft size={9} strokeWidth={2.5} />
              {PREV_LABEL[task.status]}
            </button>
          )}
          {canMoveForward && hovered && (
            <button
              type="button"
              onClick={onMoveForward}
              title={NEXT_LABEL[task.status]}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9, fontWeight: 700, color: '#fff',
                background: colAccent, border: `1px solid ${colAccent}`,
                borderRadius: 6, padding: '3px 7px', cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              {NEXT_LABEL[task.status]}
              <ArrowRight size={9} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add-task inline form ─────────────────────────────────────────────────────
interface AddTaskFormProps {
  onAdd: (text: string, assignee: string) => void;
  accent: string;
}
function AddTaskForm({ onAdd, accent }: AddTaskFormProps) {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 10px', borderRadius: 10,
          border: `1.5px dashed ${accent}30`,
          background: `${accent}05`, color: accent,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}10`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}05`; }}
      >
        <Plus size={13} strokeWidth={2.5} />
        Add task
      </button>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF', border: '1.5px solid rgba(26,27,58,0.12)',
      borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === 'Escape') setOpen(false); }}
        placeholder="What needs to be done?"
        rows={2}
        style={{
          width: '100%', resize: 'none', outline: 'none', border: 'none',
          fontSize: 13, fontWeight: 500, color: '#1E2636', lineHeight: 1.5,
          background: 'transparent', fontFamily: 'inherit',
        }}
      />
      <input
        type="text"
        value={assignee}
        onChange={e => setAssignee(e.target.value)}
        placeholder="Assignee (optional)"
        style={{
          outline: 'none', border: '1px solid rgba(26,27,58,0.10)', borderRadius: 8,
          padding: '5px 8px', fontSize: 11, color: '#5A6070', background: '#F8F8FC',
          fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
            background: text.trim() ? accent : 'rgba(26,27,58,0.08)',
            color: text.trim() ? '#fff' : '#9BA6C0',
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
            padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,27,58,0.12)',
            background: 'transparent', color: '#9BA6C0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main board ───────────────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, borderRadius: 'inherit', overflow: 'hidden', background: '#F4F3FA' }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        background: 'linear-gradient(135deg, #191E2F 0%, #1E2640 100%)',
        padding: '14px 18px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LayoutGrid size={15} color="#C4CAE0" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B7898', marginBottom: 1 }}>
                Task Board
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                My Tasks
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#9BA6C0',
              background: 'rgba(255,255,255,0.07)', borderRadius: 20,
              padding: '3px 10px', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {doneTasks}/{totalTasks} done
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.06)', color: '#7C859E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#7C859E'; }}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: '#6B7898', fontWeight: 600 }}>Overall progress</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: progressPct === 100 ? '#4ade80' : '#9BA6C0' }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 10,
              width: `${progressPct}%`,
              background: progressPct === 100
                ? 'linear-gradient(90deg, #059669, #4ade80)'
                : 'linear-gradient(90deg, #5B4FDB, #818CF8)',
              transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>
      </div>

      {/* ── Columns ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12, padding: 14, overflowX: 'auto' }}>
        {COLUMNS.map((col) => {
          const tasks = tasksByStatus(col.id);
          return (
            <div
              key={col.id}
              style={{
                width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column',
                background: '#FFFFFF', borderRadius: 14,
                border: `1.5px solid ${col.accentBorder}`,
                overflow: 'hidden',
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '11px 14px 10px',
                borderBottom: `1px solid ${col.accentBorder}`,
                background: col.accentBg,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ color: col.accent, display: 'flex', alignItems: 'center' }}>
                  {col.icon}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1E2636', flex: 1 }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: col.accent, color: '#fff',
                  minWidth: 20, height: 20, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 6px',
                }}>
                  {tasks.length}
                </span>
              </div>

              {/* Task list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '28px 12px', borderRadius: 10,
                    border: `1.5px dashed ${col.accent}25`,
                    background: `${col.accent}04`,
                    textAlign: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 20, opacity: 0.25 }}>
                      {col.id === 'todo' ? '📋' : col.id === 'inprogress' ? '⏳' : '✅'}
                    </span>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9BA6C0', marginTop: 4 }}>
                      {col.emptyText}
                    </p>
                    <p style={{ fontSize: 10, color: '#C0C8DA' }}>
                      {col.emptyHint}
                    </p>
                  </div>
                ) : (
                  tasks.map((task) => (
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
                  ))
                )}
              </div>

              {/* Add task — every column */}
              <div style={{ padding: '6px 10px 10px', borderTop: `1px solid ${col.accentBorder}`, background: `${col.accent}04` }}>
                <AddTaskForm accent={col.accent} onAdd={handleAddTask(col.id)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
