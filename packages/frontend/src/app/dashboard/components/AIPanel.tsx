'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Loader2, CheckSquare, Square, Sparkles, Bot,
  MessageSquare, ListChecks, CheckCircle2, Search,
  ClipboardList, Users, Zap,
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

function ToolResultCard({ toolName, result }: { toolName: string; result: Record<string, unknown> }) {
  if (toolName === 'create_task') {
    const ok = result.success as boolean;
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: '8px 12px',
        fontSize: 12, fontWeight: 600,
        background: ok ? '#ecfdf5' : '#fef2f2',
        border: `1px solid ${ok ? '#d1fae5' : '#fee2e2'}`,
        color: ok ? '#059669' : '#ef4444',
      }}>
        <CheckCircle2 size={13} style={{ marginTop: 1, flexShrink: 0, color: ok ? '#10b981' : '#ef4444' }} />
        <span>{ok ? ((result.message as string) ?? 'Task created.') : `Task failed: ${result.error ?? 'unknown error'}`}</span>
      </div>
    );
  }
  if (toolName === 'search_messages') {
    const results = (result.results as Array<Record<string, unknown>>) ?? [];
    return (
      <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', padding: '9px 12px', fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, color: '#6366f1', fontWeight: 700 }}>
          <Search size={11} /> {results.length} result{results.length !== 1 ? 's' : ''} found
        </div>
        {results.slice(0, 3).map((r, i) => (
          <p key={i} style={{ fontSize: 11, color: '#6b7280', padding: '3px 0', borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ fontWeight: 700 }}>{String(r.sender ?? '')}:</span>{' '}{String(r.text ?? '').slice(0, 80)}
          </p>
        ))}
      </div>
    );
  }
  if (toolName === 'list_tasks') {
    const tasks = (result.tasks as Array<Record<string, unknown>>) ?? [];
    return (
      <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', padding: '9px 12px', fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, color: '#6366f1', fontWeight: 700 }}>
          <ClipboardList size={11} /> {(result.total as number) ?? tasks.length} task{((result.total as number) ?? 0) !== 1 ? 's' : ''}
        </div>
        {tasks.slice(0, 4).map((t, i) => (
          <p key={i} style={{ fontSize: 11, color: '#6b7280', padding: '3px 0', borderBottom: i < tasks.slice(0,4).length - 1 ? '1px solid #f0f0f0' : 'none', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', width: 68, fontWeight: 700, color: t.status === 'done' ? '#10b981' : t.status === 'inprogress' ? '#f59e0b' : '#9ca3af' }}>
              {String(t.status)}
            </span>
            {String(t.text ?? '').slice(0, 55)} → {String(t.assignee ?? '')}
          </p>
        ))}
      </div>
    );
  }
  if (toolName === 'get_members') {
    const members = (result.members as Array<Record<string, unknown>>) ?? [];
    return (
      <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', padding: '9px 12px', fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, color: '#6366f1', fontWeight: 700 }}>
          <Users size={11} /> {members.length} team member{members.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {members.slice(0, 8).map((m, i) => (
            <span key={i} style={{ borderRadius: 99, background: '#ede9fe', padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#6366f1' }}>
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
  } catch { return null; }
}

function getUserEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('edutechex_token');
    return raw ? (JSON.parse(raw).user?.email ?? '') : '';
  } catch { return ''; }
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

  useEffect(() => {
    transcriptRef.current = channelMessages.length > 0
      ? channelMessages.slice(-40).map((m) => `[${m.sender}]: ${m.text}`).join('\n')
      : '';
  }, [channelMessages]);

  const contextRef = useRef({ channelName: activeChannel, channelId: activeChannel });
  contextRef.current = { channelName: activeChannel, channelId: activeChannel };

  const chatRef = useRef<Chat<UIMessage>>(null!);
  if (!chatRef.current) {
    chatRef.current = new Chat({
      transport: new DefaultChatTransport({
        api: '/api/ai/chat',
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { ...body, uiMessages: messages, channelName: contextRef.current.channelName, channelId: contextRef.current.channelId, channelTranscript: transcriptRef.current, userToken: getToken(), userEmail: getUserEmail() },
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
        if (result.data.length === 0) { toast.success('No new tasks found.'); return; }
        const extractedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const extractedDate = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
        const newTasks = result.data.map((t: { text: string; assignee?: string; assigneeInitials?: string }) => ({
          id: `task-${Date.now()}-${Math.random()}`,
          text: t.text, assignee: t.assignee || 'Unassigned', assigneeInitials: t.assigneeInitials || '?',
          sourceChannel: `#${activeChannel}`, timestamp: `${extractedDate} · ${extractedAt}`, done: false,
        }));
        setTasks((prev) => [...newTasks, ...prev]);
        newTasks.forEach((t) => addKanbanTask({ text: t.text, assignee: t.assignee, assigneeInitials: t.assigneeInitials, sourceChannel: t.sourceChannel, status: 'todo' }));
        toast.success(`${newTasks.length} task${newTasks.length !== 1 ? 's' : ''} extracted`);
      } else {
        toast.error((result as { error?: string }).error ?? 'Could not extract tasks. Try again.');
      }
    } catch { toast.error('Task extraction failed.'); }
  };

  const doneTasks = tasks.filter((t) => t.done);
  const pendingTasks = tasks.filter((t) => !t.done);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f8f9fb', borderRadius: 16, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)', padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Bot size={17} color="#a5b4fc" strokeWidth={2} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>EduTechEx Copilot</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: '#a5b4fc', fontWeight: 500 }}>#{activeChannel}</span>
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, color: '#fbbf24' }}>
                    <Loader2 size={8} style={{ animation: 'spin 1s linear infinite' }} /> thinking…
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, color: '#34d399' }}>
                    <Sparkles size={8} /> ready
                  </span>
                )}
              </div>
            </div>
          </div>
          {isLoading && (
            <button onClick={stop} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
              Stop
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: 3 }}>
          {[
            { id: 'chat' as const, label: 'Chat', icon: <MessageSquare size={11} /> },
            { id: 'tasks' as const, label: 'Tasks', icon: <ListChecks size={11} />, badge: pendingTasks.length },
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
              background: activeTab === t.id ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
            }}>
              {t.icon}{t.label}
              {t.badge ? (
                <span style={{ background: '#818cf8', color: '#fff', fontSize: 8, fontWeight: 800, minWidth: 14, height: 14, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

        {/* Chat tab */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 14px 8px' }}>

            {/* Welcome */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #4338ca, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}>
                  <Zap size={20} color="#fff" strokeWidth={2.5} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>EduTechEx Copilot</p>
                <p style={{ fontSize: 12, color: '#9ca3af', maxWidth: 210, lineHeight: 1.6, margin: 0 }}>
                  I can create tasks, search messages, list team members, and answer questions about this workspace.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4, justifyContent: 'center' }}>
                  {['Create task', 'Team status', 'Search notes'].map((s) => (
                    <button key={s} onClick={() => handleQuickPrompt(s)}
                      style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#ede9fe', border: 'none', borderRadius: 99, padding: '4px 10px', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const textContent = msg.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map((p) => p.text).join('');
              type ToolPart = { type: string; toolCallId: string; state: string; input?: unknown; output?: unknown; errorText?: string };
              const toolParts = msg.parts.filter((p) => typeof p.type === 'string' && p.type.startsWith('tool-')).map((p) => p as unknown as ToolPart);
              const hasPendingTool = toolParts.some((p) => p.state === 'input-streaming' || p.state === 'input-available' || p.state === 'output-streaming');
              const completedTools = toolParts.filter((p) => p.state === 'output-available');

              return (
                <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, background: 'linear-gradient(135deg, #4338ca, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={13} color="#fff" strokeWidth={2} />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                    {msg.role === 'assistant' && completedTools.map((p, i) => {
                      const toolName = p.type.replace(/^tool-/, '');
                      return <ToolResultCard key={i} toolName={toolName} result={(p.output as Record<string, unknown>) ?? {}} />;
                    })}

                    {msg.role === 'assistant' && hasPendingTool && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ede9fe', border: '1px solid #ddd6fe', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#6366f1' }}>
                        <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Running action…
                      </div>
                    )}

                    {(textContent || (isLoading && msg === messages[messages.length - 1] && msg.role === 'assistant')) && (
                      <div style={{
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
                        background: msg.role === 'user' ? 'linear-gradient(135deg,#4338ca,#7c3aed)' : '#fff',
                        color: msg.role === 'user' ? '#fff' : '#111',
                        border: msg.role === 'user' ? 'none' : '1px solid #f0f0f0',
                        boxShadow: msg.role === 'user' ? '0 4px 12px rgba(67,56,202,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
                        fontWeight: msg.role === 'user' ? 600 : 400,
                      }}>
                        {msg.role === 'assistant' ? (
                          textContent ? (
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
                            </div>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 12 }}>
                              <Loader2 size={12} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} /> Thinking…
                            </span>
                          )
                        ) : (
                          textContent || msg.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map((p) => p.text).join('') || ''
                        )}
                      </div>
                    )}

                    <span style={{ fontSize: 9, color: '#d1d5db', padding: '0 2px' }}>
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
          <div style={{ padding: '12px 12px' }}>
            <button onClick={extractTasksAction} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 0', borderRadius: 10, border: '1.5px dashed #c7d2fe', background: '#f5f3ff',
              color: '#6366f1', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 12, transition: 'all 0.15s',
            }}>
              <Sparkles size={13} /> Extract action items from #{activeChannel}
            </button>

            {pendingTasks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', marginBottom: 8, margin: '0 0 8px' }}>
                  To do · {pendingTasks.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pendingTasks.map((task) => (
                    <div key={task.id} onClick={() => toggleTask(task.id)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, borderRadius: 10,
                      background: '#fff', border: '1px solid #f0f0f0', padding: '10px 12px',
                      cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                      <Square size={15} style={{ marginTop: 1, flexShrink: 0, color: '#9ca3af' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#111', lineHeight: 1.5, margin: 0 }}>{task.text}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                          <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#6366f1' }}>
                            {task.assigneeInitials}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>{task.assignee}</span>
                          {(task as { sourceChannel?: string }).sourceChannel && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#d1d5db' }}>
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
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', margin: '0 0 8px' }}>
                  Completed · {doneTasks.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {doneTasks.map((task) => (
                    <div key={task.id} onClick={() => toggleTask(task.id)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, borderRadius: 10,
                      background: '#f9fafb', border: '1px solid #f0f0f0', padding: '10px 12px',
                      cursor: 'pointer', opacity: 0.65, transition: 'all 0.15s',
                    }}>
                      <CheckSquare size={15} style={{ marginTop: 1, flexShrink: 0, color: '#10b981' }} />
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textDecoration: 'line-through', lineHeight: 1.5, margin: 0 }}>{task.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '32px 16px', textAlign: 'center' }}>
                <ListChecks size={28} color="#d1d5db" />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', margin: 0 }}>No tasks yet</p>
                <p style={{ fontSize: 11, color: '#d1d5db', margin: 0 }}>Click &quot;Extract action items&quot; to pull tasks from the chat.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Chat input ── */}
      {activeTab === 'chat' && (
        <div style={{ flexShrink: 0, padding: '10px 12px 12px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
          {/* Quick prompts */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {QUICK_PROMPTS.map((q) => (
              <button key={q} onClick={() => handleQuickPrompt(q)} style={{
                flexShrink: 0, borderRadius: 99, border: '1px solid #e5e7eb', background: '#f9fafb',
                padding: '3px 10px', fontSize: 10, fontWeight: 600, color: '#6b7280',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6366f1'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#a5b4fc'; (e.currentTarget as HTMLButtonElement).style.background = '#ede9fe'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f3ff', borderRadius: 12, padding: '8px 8px 8px 14px', border: '1.5px solid #e0e7ff', transition: 'border-color 0.15s' }}>
            <input
              ref={inputRef}
              type="text" value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything, or say 'create a task for…'"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#111', fontWeight: 500, fontFamily: 'inherit' }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              style={{
                width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                background: inputValue.trim() && !isLoading ? 'linear-gradient(135deg,#4338ca,#7c3aed)' : '#e5e7eb',
                boxShadow: inputValue.trim() && !isLoading ? '0 4px 12px rgba(67,56,202,0.3)' : 'none',
              }}
            >
              {isLoading
                ? <Loader2 size={14} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={14} color={inputValue.trim() ? '#fff' : '#9ca3af'} strokeWidth={2.5} />
              }
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
