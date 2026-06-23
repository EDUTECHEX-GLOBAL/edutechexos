'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Loader2,
  CheckSquare,
  Square,
  Sparkles,
  StopCircle,
  Bot,
  MessageSquare,
  ListChecks,
  CheckCircle2,
  Search,
  ClipboardList,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDashboardStore } from '@/store/dashboardStore';
import { extractActionItems } from '@/app/actions/aiActions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat, Chat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

interface AIPanelProps {
  onClose: () => void;
  activeChannel: string;
}

const QUICK_PROMPTS = [
  'Project status',
  'List tasks in progress',
  'Extract tasks',
  'Who is on the team?',
  'Search for meeting notes',
  'Daily summary',
];

function ToolResultCard({
  toolName,
  result,
}: {
  toolName: string;
  result: Record<string, unknown>;
}) {
  if (toolName === 'create_task') {
    const ok = result.success as boolean;
    return (
      <div
        className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] ${
          ok
              ? 'border-[rgba(56,217,169,0.20)] bg-[rgba(56,217,169,0.08)] text-[#38D9A9]'
            : 'border-[rgba(255,107,127,0.20)] bg-[rgba(255,107,127,0.08)] text-[#FF6B7F]'
        }`}
      >
        <CheckCircle2
          size={13}
          className={`mt-0.5 shrink-0 ${ok ? 'text-[#38D9A9]' : 'text-[#FF6B7F]'}`}
        />
        <span className="font-semibold">
          {ok
            ? ((result.message as string) ?? 'Task created.')
            : `Task failed: ${result.error ?? 'unknown error'}`}
        </span>
      </div>
    );
  }
  if (toolName === 'search_messages') {
    const results = (result.results as Array<Record<string, unknown>>) ?? [];
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.10)] bg-[rgba(22,27,61,0.50)] px-3 py-2.5 text-[12px]">
        <div className="flex items-center gap-1.5 mb-1.5 text-[#0AE8D0] font-bold">
          <Search size={11} /> {results.length} result{results.length !== 1 ? 's' : ''} found
        </div>
        {results.slice(0, 3).map((r, i) => (
          <p
            key={i}
            className="truncate text-[11px] text-[#8896B0] py-0.5 border-b border-[rgba(148,163,184,0.06)] last:border-0"
          >
            <span className="font-semibold">{String(r.sender ?? '')}:</span>{' '}
            {String(r.text ?? '').slice(0, 80)}
          </p>
        ))}
      </div>
    );
  }
  if (toolName === 'list_tasks') {
    const tasks = (result.tasks as Array<Record<string, unknown>>) ?? [];
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.10)] bg-[rgba(22,27,61,0.50)] px-3 py-2.5 text-[12px]">
        <div className="flex items-center gap-1.5 mb-1.5 text-[#0AE8D0] font-bold">
          <ClipboardList size={11} /> {(result.total as number) ?? tasks.length} task
          {((result.total as number) ?? 0) !== 1 ? 's' : ''}
        </div>
        {tasks.slice(0, 4).map((t, i) => (
          <p
            key={i}
            className="truncate text-[11px] text-[#8896B0] py-0.5 border-b border-[rgba(148,163,184,0.06)] last:border-0"
          >
            <span
              className={`inline-block w-14 font-bold ${t.status === 'done' ? 'text-[#38D9A9]' : t.status === 'inprogress' ? 'text-[#F59E0B]' : 'text-[#4B5678]'}`}
            >
              {String(t.status)}
            </span>
            {String(t.text ?? '').slice(0, 60)} → {String(t.assignee ?? '')}
          </p>
        ))}
      </div>
    );
  }
  if (toolName === 'get_members') {
    const members = (result.members as Array<Record<string, unknown>>) ?? [];
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.10)] bg-[rgba(22,27,61,0.50)] px-3 py-2.5 text-[12px]">
        <div className="flex items-center gap-1.5 mb-1.5 text-[#0AE8D0] font-bold">
          <Users size={11} /> {members.length} team member{members.length !== 1 ? 's' : ''}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {members.slice(0, 8).map((m, i) => (
            <span
              key={i}
              className="rounded-full bg-[rgba(10,232,208,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#0AE8D0]"
            >
              {String(m.name ?? '')}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('edutechex_token');
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
}

function getUserEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('edutechex_token');
    return raw ? (JSON.parse(raw).user?.email ?? '') : '';
  } catch {
    return '';
  }
}

export default function AIPanel({ onClose, activeChannel }: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat');
  const [tasks, setTasks] = useState<Array<{ id: string; text: string; assignee: string; assigneeInitials: string; sourceChannel: string; timestamp: string; done: boolean }>>([]);
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const channelMessages = useDashboardStore((s) => s.messages[activeChannel] || []);
  const addKanbanTask = useDashboardStore((s) => s.addKanbanTask);
  const transcriptRef = useRef('');

  // Keep transcript ref fresh
  useEffect(() => {
    transcriptRef.current =
      channelMessages.length > 0
        ? channelMessages
            .slice(-40)
            .map((m) => `[${m.sender}]: ${m.text}`)
            .join('\n')
        : '';
  }, [channelMessages]);

  // Context ref read by prepareSendMessagesRequest at send time
  const contextRef = useRef({ channelName: activeChannel, channelId: activeChannel });
  contextRef.current = { channelName: activeChannel, channelId: activeChannel };

  // Create the Chat instance once — uses a ref so it survives re-renders
  const chatRef = useRef<Chat<UIMessage>>(null!);
  if (!chatRef.current) {
    chatRef.current = new Chat({
      transport: new DefaultChatTransport({
        api: '/api/ai/chat',
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            uiMessages: messages,
            channelName: contextRef.current.channelName,
            channelId: contextRef.current.channelId,
            channelTranscript: transcriptRef.current,
            userToken: getToken(),
            userEmail: getUserEmail(),
          },
        }),
      }),
    });
  }

  const { messages, sendMessage, status, stop } = useChat({ chat: chatRef.current });
  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    sendMessage({ text });
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
    const task = tasks.find((t) => t.id === taskId);
    if (task && !task.done) toast.success('Task marked complete');
  };

  const extractTasksAction = async () => {
    toast.info('Extracting tasks from conversation…', { duration: 3000 });
    try {
      const result = await extractActionItems(channelMessages);
      if (result.success && result.data && Array.isArray(result.data)) {
        if (result.data.length === 0) {
          toast.success('No new tasks found.');
          return;
        }
        const extractedAt = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const extractedDate = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
        const newTasks = result.data.map(
          (t: { text: string; assignee?: string; assigneeInitials?: string }) => ({
            id: `task-${Date.now()}-${Math.random()}`,
            text: t.text,
            assignee: t.assignee || 'Unassigned',
            assigneeInitials: t.assigneeInitials || '?',
            sourceChannel: `#${activeChannel}`,
            timestamp: `${extractedDate} · ${extractedAt}`,
            done: false,
          })
        );
        setTasks((prev) => [...newTasks, ...prev]);
        newTasks.forEach((t) =>
          addKanbanTask({ text: t.text, assignee: t.assignee, assigneeInitials: t.assigneeInitials, sourceChannel: t.sourceChannel, status: 'todo' })
        );
        toast.success(`${newTasks.length} task${newTasks.length !== 1 ? 's' : ''} extracted`);
      } else {
        toast.error('Could not parse tasks from AI response.');
      }
    } catch {
      toast.error('Task extraction failed.');
    }
  };

  const doneTasks = tasks.filter((t) => t.done);
  const pendingTasks = tasks.filter((t) => !t.done);

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* ── Header ── */}
      <div className="shrink-0 bg-gradient-to-b from-[rgba(13,16,37,0.90)] to-[rgba(22,27,61,0.80)] px-4 pt-4 pb-3 border-b border-[rgba(148,163,184,0.06)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">EduTechEx Copilot</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-white/40 font-medium">#{activeChannel}</span>
                {isLoading ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-300">
                    <Loader2 size={8} className="animate-spin" />
                    thinking…
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                    <Sparkles size={8} />
                    agent ready
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isLoading && (
              <button
                onClick={() => stop()}
                title="Stop"
                className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <StopCircle size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {[
            { id: 'chat' as const, label: 'Chat', icon: <MessageSquare size={11} /> },
            {
              id: 'tasks' as const,
              label: 'Tasks',
              icon: <ListChecks size={11} />,
              badge: pendingTasks.length,
            },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-white/15 text-white'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/8'
              }`}
            >
              {t.icon}
              {t.label}
              {t.badge ? (
                <span className="h-4 min-w-[16px] rounded-full bg-white/20 px-1 text-[8px] font-black text-white/80 flex items-center justify-center">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Chat tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col gap-3 p-4">
            {/* Welcome state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-[rgba(10,232,208,0.10)] flex items-center justify-center border border-[rgba(10,232,208,0.15)]">
                  <Sparkles size={20} className="text-[#0AE8D0]" />
                </div>
                <p className="text-sm font-bold text-[#EEF2F6]">EduTechEx Copilot</p>
                <p className="text-xs text-[#4B5678] max-w-[200px] leading-relaxed">
                  I can create tasks, search messages, list team members, and answer questions about
                  this workspace.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const textContent = msg.parts
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('');

              type ToolPart = {
                type: string;
                toolCallId: string;
                state: string;
                input?: unknown;
                output?: unknown;
                errorText?: string;
              };
              const toolParts = msg.parts
                .filter((p) => typeof p.type === 'string' && p.type.startsWith('tool-'))
                .map((p) => p as unknown as ToolPart);

              const hasPendingTool = toolParts.some(
                (p) =>
                  p.state === 'input-streaming' ||
                  p.state === 'input-available' ||
                  p.state === 'output-streaming'
              );
              const completedTools = toolParts.filter((p) => p.state === 'output-available');

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-6 w-6 shrink-0 rounded-lg bg-[rgba(10,232,208,0.10)] flex items-center justify-center mt-1 border border-[rgba(10,232,208,0.12)]">
                      <Bot size={12} className="text-[#0AE8D0]" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[90%]`}
                  >
                    {/* Completed tool result cards */}
                    {msg.role === 'assistant' &&
                      completedTools.map((p, i) => {
                        const toolName = p.type.replace(/^tool-/, '');
                        return (
                          <ToolResultCard
                            key={i}
                            toolName={toolName}
                            result={(p.output as Record<string, unknown>) ?? {}}
                          />
                        );
                      })}

                    {/* In-progress tool call spinner */}
                    {msg.role === 'assistant' && hasPendingTool && (
                      <div className="flex items-center gap-1.5 rounded-xl bg-[rgba(10,232,208,0.06)] border border-[rgba(10,232,208,0.12)] px-3 py-2 text-[11px] text-[#0AE8D0] font-semibold">
                        <Loader2 size={10} className="animate-spin" /> Running action…
                      </div>
                    )}

                    {/* Text bubble */}
                    {(textContent ||
                      (isLoading &&
                        msg === messages[messages.length - 1] &&
                        msg.role === 'assistant')) && (
                      <div
                          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-[#0AE8D0] to-[#06B8A5] text-[#06080F] rounded-tr-sm font-medium'
                            : 'bg-[rgba(22,27,61,0.70)] border border-[rgba(148,163,184,0.08)] text-[#EEF2F6] rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          textContent ? (
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {textContent}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <span className="flex items-center gap-2 text-[#4B5678]">
                              <Loader2 size={12} className="animate-spin text-[#0AE8D0]" /> Thinking…
                            </span>
                          )
                        ) : (
                          textContent ||
                          msg.parts
                            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                            .map((p) => p.text)
                            .join('') ||
                          ''
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-[#4B5678] px-1">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {((msg as any).createdAt ? new Date((msg as any).createdAt) : new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="p-4">
            <button
              onClick={extractTasksAction}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(10,232,208,0.20)] bg-[rgba(10,232,208,0.04)] py-3 text-xs font-bold text-[#0AE8D0] hover:border-[#0AE8D0] hover:bg-[rgba(10,232,208,0.08)] transition-all mb-4"
            >
              <Sparkles size={13} /> Extract action items from #{activeChannel}
            </button>

            {pendingTasks.length > 0 && (
              <div className="mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#4B5678] mb-2 px-0.5">
                  To do · {pendingTasks.length}
                </p>
                <div className="space-y-1.5">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className="flex items-start gap-3 rounded-xl bg-[rgba(22,27,61,0.50)] border border-[rgba(148,163,184,0.08)] px-3.5 py-3 cursor-pointer hover:border-[rgba(10,232,208,0.15)] hover:shadow-sm transition-all group"
                    >
                      <Square
                        size={15}
                        className="mt-0.5 shrink-0 text-[#4B5678] group-hover:text-[#0AE8D0] transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#EEF2F6] leading-snug">
                          {task.text}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-[rgba(10,232,208,0.10)] text-[8px] font-black text-[#0AE8D0] border border-[rgba(10,232,208,0.15)]">
                            {task.assigneeInitials}
                          </span>
                          <span className="text-[10px] font-semibold text-[#4B5678]">
                            {task.assignee}
                          </span>
                          {(task as { sourceChannel?: string }).sourceChannel && (
                            <span className="ml-auto text-[10px] text-[#4B5678]">
                              {(task as { sourceChannel?: string }).sourceChannel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doneTasks.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#4B5678] mb-2 px-0.5">
                  Completed · {doneTasks.length}
                </p>
                <div className="space-y-1.5">
                  {doneTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className="flex items-start gap-3 rounded-xl bg-[rgba(22,27,61,0.30)] border border-[rgba(148,163,184,0.06)] px-3.5 py-3 cursor-pointer opacity-55 hover:opacity-80 transition-all"
                    >
                      <CheckSquare size={15} className="mt-0.5 shrink-0 text-[#38D9A9]" />
                      <p className="text-xs font-semibold text-[#4B5678] line-through leading-snug">
                        {task.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <ListChecks size={24} className="text-[#4B5678]" />
                <p className="text-sm font-bold text-[#4B5678]">No tasks yet</p>
                <p className="text-xs text-[#4B5678]">
                  Click &quot;Extract action items&quot; to pull tasks from the chat.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Chat input ── */}
      {activeTab === 'chat' && (
        <div className="shrink-0 p-3 bg-transparent border-t border-[rgba(148,163,184,0.06)]">
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-0.5 scrollbar-none">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => handleQuickPrompt(q)}
                className="shrink-0 rounded-full border border-[rgba(148,163,184,0.10)] bg-[rgba(22,27,61,0.50)] px-2.5 py-1 text-[10px] font-semibold text-[#8896B0] hover:border-[#0AE8D0] hover:text-[#0AE8D0] hover:bg-[rgba(10,232,208,0.06)] transition-all whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[rgba(148,163,184,0.10)] bg-[rgba(22,27,61,0.50)] px-3 py-2 focus-within:border-[rgba(10,232,208,0.25)] focus-within:ring-2 focus-within:ring-[rgba(10,232,208,0.06)] transition-all shadow-sm">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything, or say 'create a task for…'"
              className="flex-1 bg-transparent text-sm text-[#EEF2F6] placeholder-[#4B5678] outline-none font-medium"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                inputValue.trim() && !isLoading
                  ? 'bg-gradient-to-br from-[#0AE8D0] to-[#06B8A5] text-[#06080F] hover:shadow-lg hover:shadow-[#0AE8D0]/20 shadow-sm'
                  : 'text-[#4B5678]'
              }`}
            >
              {isLoading ? <Loader2 size={13} className="animate-spin text-[#0AE8D0]" /> : <Send size={13} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
