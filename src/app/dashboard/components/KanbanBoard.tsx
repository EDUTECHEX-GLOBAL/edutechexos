'use client';

import React, { useState } from 'react';
import {
  X,
  LayoutGrid,
  Plus,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Hash,
} from 'lucide-react';
import { useDashboardStore, KanbanTask } from '@/store/dashboardStore';

interface KanbanBoardProps {
  onClose: () => void;
}

type Status = 'todo' | 'inprogress' | 'done';

const COLUMNS: {
  id: Status;
  label: string;
  color: string;
  headerBg: string;
  countBg: string;
  emptyText: string;
}[] = [
  {
    id: 'todo',
    label: 'To Do',
    color: 'border-slate-300',
    headerBg: 'bg-slate-700',
    countBg: 'bg-slate-600',
    emptyText: 'No tasks here',
  },
  {
    id: 'inprogress',
    label: 'In Progress',
    color: 'border-amber-400',
    headerBg: 'bg-amber-600',
    countBg: 'bg-amber-500',
    emptyText: 'Nothing in progress',
  },
  {
    id: 'done',
    label: 'Done',
    color: 'border-emerald-400',
    headerBg: 'bg-emerald-700',
    countBg: 'bg-emerald-600',
    emptyText: 'No completed tasks',
  },
];

const STATUS_ORDER: Status[] = ['todo', 'inprogress', 'done'];

function getNextStatus(current: Status): Status | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

function getPrevStatus(current: Status): Status | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx > 0 ? STATUS_ORDER[idx - 1] : null;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

const AVATAR_COLORS = [
  '#4f46e5',
  '#0891b2',
  '#059669',
  '#dc2626',
  '#7c3aed',
  '#d97706',
  '#db2777',
];

function stringToColor(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface TaskCardProps {
  task: KanbanTask;
  onMoveForward: () => void;
  onMoveBack: () => void;
  onDelete: () => void;
  canMoveForward: boolean;
  canMoveBack: boolean;
}

function TaskCard({
  task,
  onMoveForward,
  onMoveBack,
  onDelete,
  canMoveForward,
  canMoveBack,
}: TaskCardProps) {
  const [hovered, setHovered] = useState(false);
  const avatarColor = stringToColor(task.assignee || task.assigneeInitials);

  return (
    <div
      className="group relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Delete button */}
      {hovered && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Delete task"
        >
          <Trash2 size={11} strokeWidth={2.5} />
        </button>
      )}

      {/* Task text */}
      <p className="pr-6 text-sm font-medium leading-snug text-slate-800">
        {task.text}
      </p>

      {/* Meta */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Assignee avatar */}
          {task.assigneeInitials && (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black text-white"
              style={{ backgroundColor: avatarColor }}
              title={task.assignee}
            >
              {task.assigneeInitials}
            </span>
          )}
          {/* Source channel */}
          {task.sourceChannel && (
            <span className="flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              <Hash size={8} strokeWidth={2.5} />
              {task.sourceChannel}
            </span>
          )}
        </div>

        {/* Move buttons */}
        <div className="flex items-center gap-1">
          {canMoveBack && (
            <button
              type="button"
              onClick={onMoveBack}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              title="Move back"
            >
              <ChevronLeft size={13} strokeWidth={2.5} />
            </button>
          )}
          {canMoveForward && (
            <button
              type="button"
              onClick={onMoveForward}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              title="Move forward"
            >
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard({ onClose }: KanbanBoardProps) {
  const kanbanTasks = useDashboardStore((s) => s.kanbanTasks);
  const addKanbanTask = useDashboardStore((s) => s.addKanbanTask);
  const updateKanbanTaskStatus = useDashboardStore(
    (s) => s.updateKanbanTaskStatus
  );
  const deleteKanbanTask = useDashboardStore((s) => s.deleteKanbanTask);
  const activeChannel = useDashboardStore((s) => s.activeChannel);
  const channels = useDashboardStore((s) => s.channels);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  const channelName =
    channels.find((c) => c.id === activeChannel)?.name ?? activeChannel;

  const tasksByStatus = (status: Status) =>
    kanbanTasks.filter((t) => t.status === status);

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const assignee = newTaskAssignee.trim() || 'Unassigned';
    const assigneeInitials = getInitials(assignee);
    addKanbanTask({
      text: newTaskText.trim(),
      assignee,
      assigneeInitials,
      sourceChannel: channelName,
      status: 'todo',
    });
    setNewTaskText('');
    setNewTaskAssignee('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-slate-50">
      {/* Header */}
      <div
        className="flex h-14 shrink-0 items-center justify-between px-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/20">
            <LayoutGrid
              size={16}
              className="text-indigo-300"
              strokeWidth={2.5}
            />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              Task Management
            </p>
            <p className="text-sm font-black leading-none text-white">
              Kanban Board
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-black text-indigo-300">
            {kanbanTasks.length} task{kanbanTasks.length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4">
        {COLUMNS.map((col) => {
          const tasks = tasksByStatus(col.id);
          return (
            <div
              key={col.id}
              className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-4 py-3 ${col.headerBg}`}
              >
                <span className="text-sm font-black text-white">
                  {col.label}
                </span>
                <span
                  className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[11px] font-black text-white ${col.countBg}`}
                >
                  {tasks.length}
                </span>
              </div>

              {/* Task list */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
                    <p className="text-xs font-semibold text-slate-400">
                      {col.emptyText}
                    </p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
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

              {/* Add task form (only in To Do column) */}
              {col.id === 'todo' && (
                <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 p-3">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Task description…"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all"
                    />
                    <input
                      type="text"
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Assignee (optional)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddTask}
                      disabled={!newTaskText.trim()}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                    >
                      <Plus size={12} strokeWidth={3} />
                      Add Task
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
