'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Book,
  Plus,
  Trash2,
  Bold,
  Italic,
  Code,
  Heading,
  List,
  FileText,
  Clock,
  Lock,
  Type,
  Quote,
  Minus,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
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

// Tiptap toolbar button
function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-indigo-100 text-[#3E4A89]'
          : 'text-[#7C859E] hover:bg-white hover:text-[#1E2636]'
      }`}
    >
      {children}
    </button>
  );
}

export default function WikiPanel({ onClose, activeChannel }: WikiPanelProps) {
  const wikiPages = useDashboardStore((s) => s.wikiPages);
  const addWikiPage = useDashboardStore((s) => s.addWikiPage);
  const updateWikiPage = useDashboardStore((s) => s.updateWikiPage);
  const deleteWikiPage = useDashboardStore((s) => s.deleteWikiPage);
  const addMessage = useDashboardStore((s) => s.addMessage);

  const isPersonal = activeChannel.startsWith('personal-');
  const pages = wikiPages[activeChannel] ?? [];

  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id ?? null);
  const [title, setTitle] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tiptap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Placeholder.configure({
        placeholder: 'Write your wiki content here…\n\nTip: Use the toolbar above to format text.',
      }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none h-full min-h-[200px] px-4 py-3 text-[#1E2636] outline-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (!selectedPageId) return;
      const htmlContent = editor.getHTML();
      scheduleAutoSave(title, htmlContent);
    },
  });

  // Sync selected page into editor
  useEffect(() => {
    const page = pages.find((p) => p.id === selectedPageId);
    if (page && editor) {
      setTitle(page.title);
      // Only update editor content if it differs (avoids cursor jump)
      if (editor.getHTML() !== page.content) {
        editor.commands.setContent(page.content || '', { emitUpdate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId]);

  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  const scheduleAutoSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!selectedPageId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateWikiPage(activeChannel, selectedPageId, { title: newTitle, content: newContent });
      }, 500);
    },
    [activeChannel, selectedPageId, updateWikiPage]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleAutoSave(e.target.value, editor?.getHTML() ?? '');
  };

  const handleNewPage = () => {
    addWikiPage(activeChannel, { title: 'Untitled Page', content: '' });
    setTimeout(() => {
      const freshPages = useDashboardStore.getState().wikiPages[activeChannel] ?? [];
      const newest = freshPages[freshPages.length - 1];
      if (newest) {
        setSelectedPageId(newest.id);
        setTitle(newest.title);
        editor?.commands.setContent('', { emitUpdate: false });
      }
    }, 0);
  };

  const handleDeletePage = () => {
    if (!selectedPageId) return;
    if (!window.confirm('Delete this wiki page? This cannot be undone.')) return;
    deleteWikiPage(activeChannel, selectedPageId);
    const remaining = pages.filter((p) => p.id !== selectedPageId);
    if (remaining.length > 0) {
      setSelectedPageId(remaining[0].id);
    } else {
      setSelectedPageId(null);
      setTitle('');
      editor?.commands.clearContent();
    }
  };

  const handleShareToChat = () => {
    const content = editor?.getText() ?? '';
    if (!title.trim() && !content.trim()) return;
    let sender = 'You';
    let initials = 'YO';
    const color = '#3E4A89';
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
      /* ignore */
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

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;
  const charCount = editor?.storage.characterCount.characters() ?? 0;
  const wordCount = editor?.storage.characterCount.words() ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-white">
      {/* Header */}
      <div
        className="flex h-14 shrink-0 items-center justify-between px-4"
        style={{ background: 'linear-gradient(135deg, #191E2F 0%, #1E2538 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/25 bg-[#1E2538]">
            {isPersonal ? (
              <Lock size={16} className="text-[#C4CAE0]" strokeWidth={2.5} />
            ) : (
              <Book size={16} className="text-[#C4CAE0]" strokeWidth={2.5} />
            )}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7C859E]">
              {isPersonal ? 'Private · only you can see this' : 'Knowledge Base'}
            </p>
            <p className="text-sm font-black leading-none text-white">
              {isPersonal ? 'My Notes' : 'Wiki'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <span className="rounded-full bg-[#1E2538] px-2.5 py-1 text-[11px] font-black text-[#C4CAE0]">
              {pages.length} page{pages.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#7C859E] transition-colors hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Body: sidebar + editor */}
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '200px 1fr' }}>
        {/* Sidebar */}
        <aside
          className="flex flex-col overflow-hidden border-r border-[rgba(62,74,137,0.12)]"
          style={{ background: '#191E2F' }}
        >
          <div className="shrink-0 p-3">
            <button
              type="button"
              onClick={handleNewPage}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E4A89] px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-[rgba(62,74,137,0.08)]0 active:scale-95"
            >
              <Plus size={13} strokeWidth={3} />
              New Page
            </button>
          </div>
          <div className="mx-3 border-t border-[#9BA6D3]/12" />
          <div className="flex-1 overflow-y-auto p-2">
            {pages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#9BA6D3]/20 p-4 text-center mt-2">
                <FileText size={18} className="mx-auto mb-1.5 text-[#4A5578]" />
                <p className="text-[11px] font-semibold text-[#4A5578]">No pages yet</p>
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
                          ? 'bg-[#9BA6D3] shadow-lg shadow-amber-900/50'
                          : 'hover:bg-[rgba(62,74,137,0.08)]'
                      }`}
                    >
                      <p
                        className={`truncate text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}
                      >
                        {page.title || 'Untitled'}
                      </p>
                      <div
                        className={`mt-1 flex items-center gap-1 text-[10px] ${isSelected ? 'text-[#C4CAE0]' : 'text-[#7C859E]'}`}
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
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(62,74,137,0.08)]">
                {isPersonal ? (
                  <Lock size={28} className="text-[#C4CAE0]" strokeWidth={1.5} />
                ) : (
                  <Book size={28} className="text-[#C4CAE0]" strokeWidth={1.5} />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-[#4A5578]">
                  {isPersonal ? 'Your notepad is empty' : 'No pages yet'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#7C859E]">
                  {isPersonal
                    ? 'Jot down ideas, tasks, or anything personal. Only you can see these notes.'
                    : 'Create your first wiki page to capture knowledge for this channel.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleNewPage}
                className="flex items-center gap-2 rounded-xl bg-[#3E4A89] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[rgba(62,74,137,0.08)]0 active:scale-95"
              >
                <Plus size={15} strokeWidth={2.5} />
                {isPersonal ? 'Create your first note' : 'Create your first wiki page'}
              </button>
            </div>
          ) : (
            <>
              {/* Editor sub-header */}
              <div className="shrink-0 border-b border-[rgba(62,74,137,0.08)] bg-white px-4 py-3">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Page title…"
                  className="w-full border-0 bg-transparent text-lg font-black text-[#1E2636] placeholder-slate-300 outline-none"
                />

                {/* Tiptap Toolbar */}
                <div className="mt-2.5 flex items-center gap-0.5 rounded-lg border border-[rgba(62,74,137,0.08)] bg-[#FAF8F5] p-1 flex-wrap">
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    active={editor?.isActive('bold')}
                    title="Bold (Ctrl+B)"
                  >
                    <Bold size={13} strokeWidth={2.5} />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    active={editor?.isActive('italic')}
                    title="Italic (Ctrl+I)"
                  >
                    <Italic size={13} strokeWidth={2.5} />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleCode().run()}
                    active={editor?.isActive('code')}
                    title="Inline code"
                  >
                    <Code size={13} strokeWidth={2.5} />
                  </ToolbarButton>
                  <div className="mx-1 h-4 w-px bg-slate-200" />
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={editor?.isActive('heading', { level: 2 })}
                    title="Heading 2"
                  >
                    <Heading size={13} strokeWidth={2.5} />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    active={editor?.isActive('heading', { level: 3 })}
                    title="Heading 3"
                  >
                    <Type size={13} strokeWidth={2.5} />
                  </ToolbarButton>
                  <div className="mx-1 h-4 w-px bg-slate-200" />
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    active={editor?.isActive('bulletList')}
                    title="Bullet list"
                  >
                    <List size={13} strokeWidth={2.5} />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    active={editor?.isActive('orderedList')}
                    title="Numbered list"
                  >
                    <List size={13} strokeWidth={2.5} className="scale-x-[-1]" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    active={editor?.isActive('blockquote')}
                    title="Blockquote"
                  >
                    <Quote size={13} strokeWidth={2.5} />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    active={editor?.isActive('codeBlock')}
                    title="Code block"
                  >
                    <Code size={13} strokeWidth={3} />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                    title="Divider"
                  >
                    <Minus size={13} strokeWidth={2.5} />
                  </ToolbarButton>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[9px] font-bold text-[#7C859E]">
                      {wordCount}w · {charCount}c
                    </span>
                    <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-600">
                        Auto-save
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tiptap Editor Content */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <EditorContent
                  editor={editor}
                  className="h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#9BA6D3] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
                />
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-[rgba(62,74,137,0.08)] bg-white p-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeletePage}
                    className="flex items-center gap-1.5 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#7C859E] transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                    Delete
                  </button>
                  {!isPersonal ? (
                    <button
                      type="button"
                      onClick={handleShareToChat}
                      disabled={!title.trim() && !editor?.getText().trim()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        background:
                          title.trim() || editor?.getText().trim()
                            ? 'linear-gradient(135deg, #3E4A89, #7c3aed)'
                            : '#94a3b8',
                      }}
                    >
                      Share to chat
                    </button>
                  ) : (
                    <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[rgba(62,74,137,0.12)] py-2.5 text-[12px] font-semibold text-[#7C859E]">
                      <Lock size={11} strokeWidth={2.5} />
                      Private — only visible to you
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
