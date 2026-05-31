'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, ChevronDown, ChevronUp, Send, Loader2, CheckSquare, Square } from 'lucide-react';
import { MOCK_TASKS, MOCK_DIGEST, MOCK_AI_RESPONSES } from '@/data/mockData';
import { toast } from 'sonner';
import { useDashboardStore } from '@/store/dashboardStore';
import { askCopilot, extractActionItems } from '@/app/actions/aiActions';
import LoginTrackerCalendar from './LoginTrackerCalendar';

interface AIPanelProps {
  onClose: () => void;
  activeChannel: string;
}

type AIMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citation?: string;
  timestamp: string;
};

export default function AIPanel({ onClose, activeChannel }: AIPanelProps) {
  const [aiInput, setAiInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat');
  const [messages, setMessages] = useState<AIMessage[]>(MOCK_AI_RESPONSES);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const aiSummary = useDashboardStore((s) => s.aiSummary[activeChannel]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeTab]);

  const handleAskAI = async () => {
    if (!aiInput.trim() || isThinking) return;
    const userMsg: AIMessage = {
      id: `ai-user-${Date.now()}`,
      role: 'user',
      text: aiInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const question = aiInput.trim();
    setAiInput('');
    setIsThinking(true);

    try {
      const channelMsgs = useDashboardStore.getState().messages[activeChannel] || [];
      const result = await askCopilot(channelMsgs, question);

      const aiReply: AIMessage = {
        id: `ai-reply-${Date.now()}`,
        role: 'assistant',
        text: result.success
          ? result.data || 'No response generated.'
          : 'Sorry, I encountered an error.',
        citation: `From #${activeChannel} · ${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      toast.error('Failed to communicate with Copilot');
    } finally {
      setIsThinking(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
    const task = tasks.find((t) => t.id === taskId);
    if (task && !task.done) {
      toast.success('Task marked as done');
    }
  };

  const extractTasksAction = async () => {
    toast.info('AI Agent extracting tasks from conversation...', { duration: 3000 });
    try {
      const channelMsgs = useDashboardStore.getState().messages[activeChannel] || [];
      const result = await extractActionItems(channelMsgs);

      if (result.success && result.data && Array.isArray(result.data)) {
        if (result.data.length === 0) {
          toast.success('No new tasks found in the recent chat.');
          return;
        }

        const extractedAt = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const extractedDate = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
        const newTasks = result.data.map((t: any) => ({
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
    } catch (err) {
      toast.error('An error occurred during task extraction.');
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm shadow-indigo-100">
            AI
          </div>
          <span className="truncate text-sm font-bold text-slate-900 tracking-tight">
            EduTechEx Copilot
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          title="Close"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex border-b border-slate-100 bg-slate-50/30">
        {(['chat', 'tasks'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === t
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin bg-white">
        {activeTab === 'chat' && (
          <div className="flex flex-col gap-4 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[90%] rounded-2xl rounded-tr-none bg-indigo-600 px-4 py-2.5 text-xs font-medium leading-relaxed text-white shadow-sm">
                    {msg.text}
                  </div>
                ) : (
                  <div className="max-w-[95%]">
                    <div className="rounded-2xl rounded-tl-none border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium leading-relaxed text-slate-700 shadow-sm">
                      {msg.text}
                    </div>
                    {msg.citation && (
                      <p className="mt-1.5 ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        {msg.citation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-none border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-500 shadow-sm">
                <Loader2 size={12} className="animate-spin text-indigo-600" strokeWidth={3} />
                Copilot is thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="flex flex-col gap-4 p-4">
            <button
              type="button"
              onClick={extractTasksAction}
              className="w-full py-2.5 text-[10px] bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-600 rounded-xl transition-all font-black uppercase tracking-wider shadow-sm mb-2"
            >
              + Extract Action Items
            </button>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-2xl border border-slate-100 bg-white p-4 text-xs shadow-sm hover:border-indigo-200 transition-all group ${task.done ? 'opacity-50' : ''}`}
                >
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="mt-0.5 shrink-0 text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      {task.done ? (
                        <CheckSquare size={16} className="text-emerald-500" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors ${task.done ? 'line-through' : ''}`}
                      >
                        {task.text}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-600 border border-slate-200">
                            {task.assigneeInitials}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            {task.assignee}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {(task as any).sourceChannel?.split('·')[0]}
                          </span>
                          {(task as any).timestamp && (
                            <span className="text-[9px] font-bold text-indigo-400">
                              {(task as any).timestamp}
                            </span>
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

      {activeTab === 'chat' && (
        <div className="shrink-0 border-t border-slate-100 p-4 bg-slate-50/50">
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1.5 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5 shadow-sm transition-all">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder="Ask Copilot..."
              className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleAskAI}
              disabled={!aiInput.trim() || isThinking}
              className={`shrink-0 rounded-lg p-2 transition-all ${
                aiInput.trim()
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700'
                  : 'text-slate-300'
              }`}
            >
              {isThinking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} strokeWidth={2.5} />
              )}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Project status', 'Extract tasks', 'Daily summary'].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setAiInput(q); }}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
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
