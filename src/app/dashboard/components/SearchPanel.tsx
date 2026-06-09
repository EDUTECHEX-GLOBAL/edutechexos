'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { Search, X, Hash, MessageSquare, BookOpen, CheckSquare, Loader2 } from 'lucide-react';

interface SearchPanelProps {
  onClose: () => void;
}

type SearchResult = {
  type: 'message' | 'wiki' | 'task';
  id: string;
  channelId: string;
  text: string;
  sender: string;
  timestamp: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token; } catch { return null; }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <strong key={i} className="font-bold text-[#3E4A89] bg-[rgba(62,74,137,0.08)] rounded px-0.5">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

const TYPE_META = {
  message: { icon: MessageSquare, label: 'Message', color: '#3E4A89', bg: 'bg-[rgba(62,74,137,0.08)]' },
  wiki:    { icon: BookOpen,      label: 'Wiki',    color: '#059669', bg: 'bg-emerald-50' },
  task:    { icon: CheckSquare,   label: 'Task',    color: '#d97706', bg: 'bg-amber-50' },
};

export default function SearchPanel({ onClose }: SearchPanelProps) {
  const channels = useDashboardStore(s => s.channels);
  const setActiveChannel = useDashboardStore(s => s.setActiveChannel);

  const [inputValue, setInputValue]     = useState('');
  const [debouncedQuery, setDebounced]  = useState('');
  const [results, setResults]           = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(inputValue.trim()), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [inputValue]);

  const channelName = useCallback((id: string) => {
    const ch = channels.find(c => c.id === id);
    return ch ? (id.startsWith('member-') ? ch.name : `#${ch.name}`) : id;
  }, [channels]);

  // Backend full-text search; graceful fallback to client messages store
  useEffect(() => {
    if (!debouncedQuery) { setResults([]); return; }
    setIsLoading(true);
    const token = getToken();
    fetch(`${API_BASE}/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=30`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setResults(data.results ?? []);
        else setResults([]);
      })
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [debouncedQuery]);

  const handleResultClick = (channelId: string) => {
    setActiveChannel(channelId);
    onClose();
  };

  // Group by type for display
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });
  const typeOrder: Array<'message' | 'wiki' | 'task'> = ['message', 'wiki', 'task'];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#191E2F] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-indigo-400" strokeWidth={2.5} />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Search Workspace</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-[#7C859E] hover:text-white hover:bg-slate-700 transition-colors">
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-b border-[rgba(62,74,137,0.08)] flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[rgba(62,74,137,0.12)] focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          {isLoading
            ? <Loader2 size={15} className="text-[#3E4A89] flex-shrink-0 animate-spin" />
            : <Search size={15} className="text-[#7C859E] flex-shrink-0" />
          }
          <input ref={inputRef} type="text" value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Search messages, wiki pages, tasks…"
            className="flex-1 bg-transparent text-sm text-[#1E2636] placeholder-slate-400 outline-none"
          />
          {inputValue && (
            <button onClick={() => { setInputValue(''); setDebounced(''); }}
              className="text-[#7C859E] hover:text-[#4A5578] transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        {/* Type filter pills */}
        {results.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {typeOrder.filter(t => grouped[t]?.length).map(t => {
              const meta = TYPE_META[t];
              return (
                <span key={t} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg}`} style={{ color: meta.color }}>
                  <meta.icon size={9} />{meta.label}s ({grouped[t].length})
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!debouncedQuery ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-[rgba(62,74,137,0.08)] flex items-center justify-center">
              <Search size={24} className="text-[#9BA6D3]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#4A5578]">Search everything</p>
              <p className="text-xs text-[#7C859E] mt-1 leading-relaxed">Messages, wiki pages, and tasks — all in one place.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {['meeting notes', 'task', 'bug fix', 'design'].map(hint => (
                <button key={hint} onClick={() => setInputValue(hint)}
                  className="rounded-full border border-[rgba(62,74,137,0.12)] bg-[#FAF8F5] px-3 py-1 text-[11px] font-semibold text-[#4A5578] hover:border-[#3E4A89] hover:text-[#3E4A89] transition-all">
                  {hint}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-[rgba(62,74,137,0.08)] flex items-center justify-center">
              <Search size={24} className="text-[#9BA6D3]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#4A5578]">No results found</p>
              <p className="text-xs text-[#7C859E] mt-1">Nothing matched &ldquo;{debouncedQuery}&rdquo;</p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="px-5 py-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#7C859E]">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>

            {typeOrder.map(type => {
              const items = grouped[type];
              if (!items?.length) return null;
              const meta = TYPE_META[type];
              return (
                <div key={type} className="mb-1">
                  <div className="flex items-center gap-2 px-5 py-1.5 bg-[#FAF8F5] border-y border-[rgba(62,74,137,0.08)]">
                    <meta.icon size={11} style={{ color: meta.color }} strokeWidth={2.5} />
                    <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: meta.color }}>
                      {meta.label}s
                    </span>
                    <span className="ml-auto text-[10px] text-[#7C859E]">{items.length}</span>
                  </div>

                  {items.map(result => (
                    <button key={result.id} onClick={() => handleResultClick(result.channelId)}
                      className="w-full flex items-start gap-3 px-5 py-3 hover:bg-[rgba(62,74,137,0.06)] transition-colors text-left border-b border-slate-50 last:border-0">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
                        <meta.icon size={12} style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-bold text-[#1E2636] truncate">
                            {result.sender || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-[#7C859E] shrink-0">{formatTime(result.timestamp)}</span>
                          <span className="ml-auto shrink-0 flex items-center gap-1 text-[10px] text-[#9BA6D3]">
                            <Hash size={9} />{channelName(result.channelId)}
                          </span>
                        </div>
                        <p className="text-xs text-[#4A5578] leading-relaxed line-clamp-2">
                          <HighlightText text={result.text} query={debouncedQuery} />
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
