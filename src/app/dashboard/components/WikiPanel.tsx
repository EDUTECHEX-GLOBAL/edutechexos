'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Book,
  Plus,
  Trash2,
  Share2,
  Bold,
  Italic,
  Code,
  Heading,
  List,
  FileText,
  Clock,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';

interface WikiPanelProps {
  onClose: () => void;
  activeChannel: string;
}

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

export default function WikiPanel({ onClose, activeChannel }: WikiPanelProps) {
  const wikiPages = useDashboardStore((s) => s.wikiPages);
  const addWikiPage = useDashboardStore((s) => s.addWikiPage);
  const updateWikiPage = useDashboardStore((s) => s.updateWikiPage);
  const deleteWikiPage = useDashboardStore((s) => s.deleteWikiPage);
  const channels = useDashboardStore((s) => s.channels);
  const addMessage = useDashboardStore((s) => s.addMessage);

  const pages = wikiPages[activeChannel] ?? [];
  const channelName =
    channels.find((c) => c.id === activeChannel)?.name ?? activeChannel;

  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    pages[0]?.id ?? null
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync selected page data into local state
  useEffect(() => {
    const page = pages.find((p) => p.id === selectedPageId);
    if (page) {
      setTitle(page.title);
      setContent(page.content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId]);

  // Auto-select first page when pages change (e.g. after create)
  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  // Debounced auto-save
  const scheduleAutoSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!selectedPageId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateWikiPage(activeChannel, selectedPageId, {
          title: newTitle,
          content: newContent,
        });
      }, 500);
    },
    [activeChannel, selectedPageId, updateWikiPage]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleAutoSave(e.target.value, content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    scheduleAutoSave(title, e.target.value);
  };

  const handleNewPage = () => {
    addWikiPage(activeChannel, {
      title: 'Untitled Page',
      content: '',
    });
    // Select the newly created page (it will be the last one)
    const updated = (wikiPages[activeChannel] ?? []);
    // We'll rely on the useEffect to select it after state updates
    setTimeout(() => {
      const freshPages = useDashboardStore.getState().wikiPages[activeChannel] ?? [];
      const newest = freshPages[freshPages.length - 1];
      if (newest) {
        setSelectedPageId(newest.id);
        setTitle(newest.title);
        setContent(newest.content);
      }
    }, 0);
  };

  const handleDeletePage = () => {
    if (!selectedPageId) return;
    const confirmed = window.confirm(
      'Delete this wiki page? This cannot be undone.'
    );
    if (!confirmed) return;
    deleteWikiPage(activeChannel, selectedPageId);
    const remaining = pages.filter((p) => p.id !== selectedPageId);
    if (remaining.length > 0) {
      setSelectedPageId(remaining[0].id);
    } else {
      setSelectedPageId(null);
      setTitle('');
      setContent('');
    }
  };

  const handleShareToChat = () => {
    if (!title.trim() && !content.trim()) return;
    let sender = 'You';
    let initials = 'YO';
    let color = '#4f46e5';
    try {
      const auth = localStorage.getItem('edutechex_token');
      if (auth) {
        const { user } = JSON.parse(auth);
        if (user) {
          sender = user.name || 'You';
          initials = sender
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        }
      }
    } catch {
      // ignore
    }
    addMessage(activeChannel, {
      id: `msg-wiki-${Date.now()}`,
      sender,
      initials,
      color,
      timestamp: new Date().toISOString(),
      text: `📖 **Wiki: ${title || 'Untitled'}**\n\n${content}`,
    });
    onClose();
  };

  const insertMarkdown = (prefix: string, suffix = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    const newContent =
      ta.value.substring(0, start) +
      prefix +
      selected +
      suffix +
      ta.value.substring(end);
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  const insertHeading = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const newContent =
      ta.value.substring(0, lineStart) + '## ' + ta.value.substring(lineStart);
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(lineStart + 3, lineStart + 3);
    }, 0);
  };

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-white">
      {/* Header */}
      <div
        className="flex h-14 shrink-0 items-center justify-between px-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/20">
            <Book size={16} className="text-indigo-300" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              #{channelName}
            </p>
            <p className="text-sm font-black leading-none text-white">Wiki</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-black text-indigo-300">
              {pages.length} page{pages.length !== 1 ? 's' : ''}
            </span>
          )}
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

      {/* Body: sidebar + editor */}
      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: '200px 1fr' }}
      >
        {/* Sidebar */}
        <aside
          className="flex flex-col overflow-hidden border-r border-slate-800"
          style={{ background: '#0f172a' }}
        >
          {/* New Page button */}
          <div className="shrink-0 p-3">
            <button
              type="button"
              onClick={handleNewPage}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-indigo-500 active:scale-95"
            >
              <Plus size={13} strokeWidth={3} />
              New Page
            </button>
          </div>

          <div className="mx-3 border-t border-slate-800" />

          {/* Page list */}
          <div className="flex-1 overflow-y-auto p-2">
            {pages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center mt-2">
                <FileText size={18} className="mx-auto mb-1.5 text-slate-600" />
                <p className="text-[10px] font-semibold text-slate-600">
                  No pages yet
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {pages.map((page) => {
                  const isSelected = page.id === selectedPageId;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setSelectedPageId(page.id)}
                      className={`w-full rounded-xl p-2.5 text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600 shadow-lg shadow-indigo-900/50'
                          : 'hover:bg-slate-800'
                      }`}
                    >
                      <p
                        className={`truncate text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {page.title || 'Untitled'}
                      </p>
                      <div
                        className={`mt-1 flex items-center gap-1 text-[10px] ${
                          isSelected ? 'text-indigo-300' : 'text-slate-500'
                        }`}
                      >
                        <Clock size={9} />
                        <span>{formatRelativeTime(page.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Editor */}
        <section className="flex min-h-0 flex-col bg-white">
          {!selectedPage ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
                <Book size={28} className="text-indigo-300" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  No pages yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Create your first wiki page to capture knowledge for this
                  channel.
                </p>
              </div>
              <button
                type="button"
                onClick={handleNewPage}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-500 active:scale-95"
              >
                <Plus size={15} strokeWidth={2.5} />
                Create your first wiki page
              </button>
            </div>
          ) : (
            <>
              {/* Editor sub-header */}
              <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
                {/* Title input */}
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Page title…"
                  className="w-full border-0 bg-transparent text-lg font-black text-slate-900 placeholder-slate-300 outline-none"
                />

                {/* Markdown toolbar */}
                <div className="mt-2.5 flex items-center gap-0.5 rounded-lg border border-slate-100 bg-slate-50 p-1">
                  {[
                    {
                      icon: Bold,
                      label: 'Bold',
                      action: () => insertMarkdown('**', '**'),
                    },
                    {
                      icon: Italic,
                      label: 'Italic',
                      action: () => insertMarkdown('*', '*'),
                    },
                    {
                      icon: Code,
                      label: 'Code',
                      action: () => insertMarkdown('`', '`'),
                    },
                    {
                      icon: Heading,
                      label: 'Heading',
                      action: insertHeading,
                    },
                    {
                      icon: List,
                      label: 'List',
                      action: () => insertMarkdown('- '),
                    },
                  ].map(({ icon: Icon, label, action }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={action}
                      title={label}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
                    >
                      <Icon size={13} strokeWidth={2.5} />
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-600">
                      Auto-save
                    </span>
                  </div>
                </div>
              </div>

              {/* Content textarea */}
              <div className="min-h-0 flex-1 p-4">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  placeholder={`Write your wiki content here…\n\nTip: Use **bold**, *italic*, \`code\`, ## headings, and - lists.`}
                  className="h-full w-full resize-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium leading-7 text-slate-800 placeholder-slate-300 outline-none focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-50 transition-all"
                />
              </div>

              {/* Footer actions */}
              <div className="shrink-0 border-t border-slate-100 bg-white p-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeletePage}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleShareToChat}
                    disabled={!title.trim() && !content.trim()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background:
                        title.trim() || content.trim()
                          ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                          : '#94a3b8',
                    }}
                  >
                    <Share2 size={12} strokeWidth={2.5} />
                    Share to chat
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
