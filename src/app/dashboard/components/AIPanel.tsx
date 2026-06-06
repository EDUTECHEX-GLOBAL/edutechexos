'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, CheckSquare, Square, Sparkles, StopCircle } from 'lucide-react';
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

export default function AIPanel({ onClose, activeChannel }: AIPanelProps) {
  const [aiInput, setAiInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat');
  const [messages, setMessages] = useState<AIMessage[]>(
    MOCK_AI_RESPONSES.map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', text: m.text, timestamp: m.timestamp }))
  );
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const channelMessages = useDashboardStore((s) => s.messages[activeChannel] || []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  const handleAskAI = useCallback(async () => {
    if (!aiInput.trim() || isStreaming) return;

    const question = aiInput.trim();
    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsStreaming(true);

    const assistantId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '', timestamp: new Date().toISOString() }]);

    const channelTranscript = channelMessages.length > 0
      ? channelMessages.slice(-40).map((m) => `[${new Date(m.timestamp).toISOString()}] ${m.sender}: ${m.text}`).join('\n')
      : '';

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }],
          channelName: activeChannel,
          channelTranscript,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, text: accumulated } : m)
        );
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Copilot encountered an error. Please try again.');
        setMessages((prev) => prev.map((m) =>
          m.id === assistantId ? { ...m, text: 'Sorry, I encountered an error. Please try again.' } : m
        ));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [aiInput, isStreaming, activeChannel, channelMessages]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
    const task = tasks.find((t) => t.id === taskId);
    if (task && !task.done) toast.success('Task marked as done');
  };

  const extractTasksAction = async () => {
    toast.info('AI Agent extracting tasks from conversation...', { duration: 3000 });
    try {
      const result = await extractActionItems(channelMessages);
      if (result.success && result.data && Array.isArray(result.data)) {
        if (result.data.length === 0) { toast.success('No new tasks found in the recent chat.'); return; }
        const extractedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        setTasks((prev) => [...newTasks, ...prev]);
        toast.success(`Successfully extracted ${newTasks.length} tasks!`);
      } else {
        toast.error('Failed to parse tasks from the AI response.');
      }
    } catch { toast.error('An error occurred during task extraction.'); }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[rgba(62,74,137,0.12)] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-[#3E4A89] flex items-center justify-center text-[11px] font-black text-white shadow-sm shadow-[rgba(62,74,137,0.12)]">
            AI
          </div>
          <span className="truncate text-sm font-bold text-[#1E2636] tracking-tight">EduTechEx Copilot</span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">
            <Sparkles size={8} />
            Streaming
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isStreaming && (
            <button type="button" onClick={handleStop} className="rounded-md p-1.5 text-[#7C859E] hover:bg-red-50 hover:text-red-500 transition-colors" title="Stop">
              <StopCircle size={14} strokeWidth={2.5} />
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-[#7C859E] hover:bg-[rgba(62,74,137,0.08)] hover:text-[#1E2636] transition-colors" title="Close">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[rgba(62,74,137,0.08)] bg-[rgba(242,240,236,0.30)]">
        {(['chat', 'tasks'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === t ? 'text-[#3E4A89] border-b-2 border-[#3E4A89] bg-[rgba(62,74,137,0.06)]' : 'text-[#7C859E] hover:text-[#1E2636] hover:bg-[rgba(62,74,137,0.08)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin bg-white">
        {activeTab === 'chat' && (
          <div className="flex flex-col gap-4 p-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'user' ? (
                  <div className="max-w-[90%] rounded-2xl rounded-tr-none bg-[#3E4A89] px-4 py-2.5 text-sm font-medium leading-relaxed text-white shadow-sm">
                    {msg.text}
                  </div>
                ) : (
                  <div className="max-w-[95%]">
                    <div className="prose prose-xs max-w-none rounded-2xl rounded-tl-none border border-[rgba(62,74,137,0.12)] bg-white px-4 py-2.5 text-sm leading-relaxed text-[#4A5578] shadow-sm">
                      {msg.text ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-2 text-[#7C859E]">
                          <Loader2 size={12} className="animate-spin text-indigo-500" />
                          <span>Thinking…</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 ml-1 text-[11px] font-bold text-[#7C859E] uppercase tracking-tight">
                      {`#${activeChannel} · ${new Date(msg.timestamp).toLocaleDateString()}`}
                    </p>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="flex flex-col gap-4 p-4">
            <button type="button" onClick={extractTasksAction} className="w-full py-2.5 text-[10px] bg-white hover:bg-[rgba(62,74,137,0.08)] border border-[rgba(62,74,137,0.12)] text-[#3E4A89] rounded-xl transition-all font-black uppercase tracking-wider shadow-sm mb-2">
              + Extract Action Items
            </button>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className={`rounded-2xl border border-[rgba(62,74,137,0.08)] bg-[#FAF8F5] p-4 text-sm shadow-sm hover:border-[rgba(62,74,137,0.18)] transition-all group ${task.done ? 'opacity-50' : ''}`}>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0 text-[#9BA6D3] hover:text-[#3E4A89] transition-colors">
                      {task.done ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-[#1E2636] leading-snug group-hover:text-[#3E4A89] transition-colors ${task.done ? 'line-through' : ''}`}>
                        {task.text}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-[rgba(62,74,137,0.08)] flex items-center justify-center text-[8px] font-bold text-[#4A5578] border border-[rgba(62,74,137,0.12)]">
                            {task.assigneeInitials}
                          </div>
                          <span className="text-[11px] font-bold text-[#7C859E] uppercase tracking-tight">{task.assignee}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[9px] font-black text-[#7C859E] uppercase tracking-widest">{(task as { sourceChannel?: string }).sourceChannel?.split('·')[0]}</span>
                          {(task as { timestamp?: string }).timestamp && (
                            <span className="text-[9px] font-bold text-indigo-400">{(task as { timestamp?: string }).timestamp}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      {activeTab === 'chat' && (
        <div className="shrink-0 border-t border-[rgba(62,74,137,0.08)] p-4 bg-[rgba(242,240,236,0.50)]">
          <div className="flex gap-2 rounded-xl border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] p-1.5 focus-within:border-[rgba(62,74,137,0.30)] focus-within:ring-4 focus-within:ring-[rgba(62,74,137,0.08)] shadow-sm transition-all">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder="Ask Copilot..."
              className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-[#1E2636] outline-none placeholder:text-[#7C859E]"
            />
            <button
              type="button"
              onClick={handleAskAI}
              disabled={!aiInput.trim() || isStreaming}
              className={`shrink-0 rounded-lg p-2 transition-all ${aiInput.trim() ? 'bg-[#3E4A89] text-white shadow-md shadow-[rgba(62,74,137,0.12)] hover:bg-[#2A3568]' : 'text-[#9BA6D3]'}`}
            >
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.5} />}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Project status', 'Extract tasks', 'Daily summary', 'List blockers'].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAiInput(q)}
                className="px-2.5 py-1 rounded-full bg-white border border-[rgba(62,74,137,0.12)] text-[11px] font-bold text-[#7C859E] hover:border-[rgba(62,74,137,0.30)] hover:text-[#3E4A89] transition-all shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



