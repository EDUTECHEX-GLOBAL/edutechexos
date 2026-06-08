'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, CheckSquare, Square, Sparkles, StopCircle, Bot, MessageSquare, ListChecks } from 'lucide-react';
import { MOCK_TASKS, MOCK_AI_RESPONSES } from '@/data/mockData';
import { toast } from 'sonner';
import { useDashboardStore } from '@/store/dashboardStore';
import { extractActionItems } from '@/app/actions/aiActions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIPanelProps {
  onClose: () => void;
  activeChannel: string;
}

type AIMessage = { id: string; role: 'user' | 'assistant'; text: string; timestamp: string };

const QUICK_PROMPTS = ['Project status', 'Extract tasks', 'Daily summary', 'List blockers'];

export default function AIPanel({ onClose, activeChannel }: AIPanelProps) {
  const [aiInput,     setAiInput]     = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab,   setActiveTab]   = useState<'chat' | 'tasks'>('chat');
  const [messages,    setMessages]    = useState<AIMessage[]>(
    MOCK_AI_RESPONSES.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', text: m.text, timestamp: m.timestamp }))
  );
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const channelMessages = useDashboardStore(s => s.messages[activeChannel] || []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isStreaming]);

  const handleAskAI = useCallback(async () => {
    if (!aiInput.trim() || isStreaming) return;
    const question = aiInput.trim();
    const userMsg: AIMessage = { id: `user-${Date.now()}`, role: 'user', text: question, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setIsStreaming(true);
    const assistantId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: '', timestamp: new Date().toISOString() }]);

    const channelTranscript = channelMessages.length > 0
      ? channelMessages.slice(-40).map(m => `[${new Date(m.timestamp).toISOString()}] ${m.sender}: ${m.text}`).join('\n') : '';

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: question }], channelName: activeChannel, channelTranscript }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: acc } : m));
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Copilot encountered an error. Please try again.');
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: 'Sorry, I ran into an error. Please try again.' } : m));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [aiInput, isStreaming, activeChannel, channelMessages]);

  const handleStop = () => abortRef.current?.abort();

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.done) toast.success('Task marked complete');
  };

  const extractTasksAction = async () => {
    toast.info('Extracting tasks from conversation…', { duration: 3000 });
    try {
      const result = await extractActionItems(channelMessages);
      if (result.success && result.data && Array.isArray(result.data)) {
        if (result.data.length === 0) { toast.success('No new tasks found.'); return; }
        const extractedAt   = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const extractedDate = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
        const newTasks = result.data.map((t: { text: string; assignee?: string; assigneeInitials?: string }) => ({
          id: `task-${Date.now()}-${Math.random()}`,
          text: t.text,
          assignee: t.assignee || 'Unassigned',
          assigneeInitials: t.assigneeInitials || '?',
          sourceChannel: `#${activeChannel}`,
          timestamp: `${extractedDate} · ${extractedAt}`,
          done: false,
        }));
        setTasks(prev => [...newTasks, ...prev]);
        toast.success(`${newTasks.length} task${newTasks.length !== 1 ? 's' : ''} extracted`);
      } else { toast.error('Could not parse tasks from AI response.'); }
    } catch { toast.error('Task extraction failed.'); }
  };

  const doneTasks    = tasks.filter(t => t.done);
  const pendingTasks = tasks.filter(t => !t.done);

  return (
    <div className="flex h-full flex-col bg-[#FAFAF8]">

      {/* ── Header ── */}
      <div className="shrink-0 bg-gradient-to-b from-[#1E2538] to-[#252D45] px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">EduTechEx Copilot</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-white/40 font-medium">#{activeChannel}</span>
                {isStreaming
                  ? <span className="flex items-center gap-1 text-[9px] font-bold text-amber-300"><Loader2 size={8} className="animate-spin" />thinking…</span>
                  : <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400"><Sparkles size={8} />ready</span>
                }
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isStreaming && (
              <button onClick={handleStop} title="Stop" className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
                <StopCircle size={14} />
              </button>
            )}
            <button onClick={onClose} title="Close" className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs inside header */}
        <div className="flex gap-1 mt-3">
          {([
            { id: 'chat'  as const, label: 'Chat',  icon: <MessageSquare size={11} /> },
            { id: 'tasks' as const, label: 'Tasks', icon: <ListChecks    size={11} />, badge: pendingTasks.length },
          ]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                activeTab === t.id ? 'bg-white/15 text-white' : 'text-white/35 hover:text-white/60 hover:bg-white/8'
              }`}>
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
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="h-6 w-6 shrink-0 rounded-lg bg-[#252D45] flex items-center justify-center mt-1">
                    <Bot size={12} className="text-white/70" />
                  </div>
                )}

                <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[88%]`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#3E4A89] text-white rounded-tr-sm'
                      : 'bg-white border border-[rgba(62,74,137,0.10)] text-[#2D3550] rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      msg.text ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2 text-[#9BA6D3]">
                          <Loader2 size={12} className="animate-spin" /> Thinking…
                        </span>
                      )
                    ) : msg.text}
                  </div>
                  <span className="text-[10px] text-[#9BA6D3] px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="p-4">

            {/* Extract button */}
            <button onClick={extractTasksAction}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(62,74,137,0.25)] bg-white py-3 text-xs font-bold text-[#3E4A89] hover:border-[#3E4A89] hover:bg-indigo-50 transition-all mb-4">
              <Sparkles size={13} /> Extract action items from #{activeChannel}
            </button>

            {/* Pending */}
            {pendingTasks.length > 0 && (
              <div className="mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#9BA6D3] mb-2 px-0.5">
                  To do · {pendingTasks.length}
                </p>
                <div className="space-y-1.5">
                  {pendingTasks.map(task => (
                    <div key={task.id} onClick={() => toggleTask(task.id)}
                      className="flex items-start gap-3 rounded-xl bg-white border border-[rgba(62,74,137,0.08)] px-3.5 py-3 cursor-pointer hover:border-[rgba(62,74,137,0.20)] hover:shadow-sm transition-all group">
                      <Square size={15} className="mt-0.5 shrink-0 text-[#C4CAE0] group-hover:text-[#3E4A89] transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1E2636] leading-snug">{task.text}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-[#F0F1F7] text-[8px] font-black text-[#4A5578] border border-[rgba(62,74,137,0.12)]">
                            {task.assigneeInitials}
                          </span>
                          <span className="text-[10px] font-semibold text-[#9BA6D3]">{task.assignee}</span>
                          {(task as { sourceChannel?: string }).sourceChannel && (
                            <span className="ml-auto text-[10px] text-[#C4CAE0]">{(task as { sourceChannel?: string }).sourceChannel}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Done */}
            {doneTasks.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#C4CAE0] mb-2 px-0.5">
                  Completed · {doneTasks.length}
                </p>
                <div className="space-y-1.5">
                  {doneTasks.map(task => (
                    <div key={task.id} onClick={() => toggleTask(task.id)}
                      className="flex items-start gap-3 rounded-xl bg-[#F7F6F2] border border-[rgba(62,74,137,0.05)] px-3.5 py-3 cursor-pointer opacity-55 hover:opacity-80 transition-all">
                      <CheckSquare size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                      <p className="text-xs font-semibold text-[#7C859E] line-through leading-snug">{task.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <ListChecks size={24} className="text-slate-200" />
                <p className="text-sm font-bold text-[#7C859E]">No tasks yet</p>
                <p className="text-xs text-[#9BA6D3]">Click "Extract action items" to pull tasks from the chat.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Chat input ── */}
      {activeTab === 'chat' && (
        <div className="shrink-0 p-3 bg-[#FAFAF8] border-t border-[rgba(62,74,137,0.08)]">

          {/* Quick prompts */}
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-0.5 scrollbar-none">
            {QUICK_PROMPTS.map(q => (
              <button key={q} onClick={() => { setAiInput(q); inputRef.current?.focus(); }}
                className="shrink-0 rounded-full border border-[rgba(62,74,137,0.12)] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#4A5578] hover:border-[#3E4A89] hover:text-[#3E4A89] transition-all whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2 rounded-xl border border-[rgba(62,74,137,0.14)] bg-white px-3 py-2 focus-within:border-[#3E4A89] focus-within:ring-2 focus-within:ring-[rgba(62,74,137,0.08)] transition-all shadow-sm">
            <input ref={inputRef} type="text" value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAskAI()}
              placeholder="Ask about this channel…"
              className="flex-1 bg-transparent text-sm text-[#1E2636] placeholder-[#C4CAE0] outline-none font-medium"
            />
            <button onClick={handleAskAI} disabled={!aiInput.trim() || isStreaming}
              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                aiInput.trim() && !isStreaming ? 'bg-[#3E4A89] text-white hover:bg-[#2F3970] shadow-sm' : 'text-[#C4CAE0]'
              }`}>
              {isStreaming ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
