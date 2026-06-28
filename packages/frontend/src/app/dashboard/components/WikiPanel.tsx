'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, BookOpen, Plus, Trash2, Bold, Italic, Code, Heading,
  List, FileText, Clock, Lock, Type, Quote, Minus, Share2,
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
  } catch { return ''; }
}

function ToolbarBtn({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
        color: active ? '#4F46E5' : '#475569',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#4F46E5'; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; } }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div style={{ width: 1, height: 16, background: 'rgba(148,163,184,0.08)', margin: '0 3px', flexShrink: 0 }} />;
}

export default function WikiPanel({ onClose, activeChannel }: WikiPanelProps) {
  const wikiPages = useDashboardStore(s => s.wikiPages);
  const addWikiPage = useDashboardStore(s => s.addWikiPage);
  const updateWikiPage = useDashboardStore(s => s.updateWikiPage);
  const deleteWikiPage = useDashboardStore(s => s.deleteWikiPage);
  const addMessage = useDashboardStore(s => s.addMessage);

  const isPersonal = activeChannel.startsWith('personal-');
  const pages = wikiPages[activeChannel] ?? [];

  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id ?? null);
  const [title, setTitle] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs so TipTap's onUpdate closure always reads the LATEST values even after page switches
  const selectedPageIdRef = useRef(selectedPageId);
  const titleRef = useRef(title);
  const activeChannelRef = useRef(activeChannel);
  useEffect(() => { selectedPageIdRef.current = selectedPageId; }, [selectedPageId]);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);

  // Flush any pending save immediately — call before switching pages
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pageId = selectedPageIdRef.current;
    const ch = activeChannelRef.current;
    if (!pageId) return;
    updateWikiPage(ch, pageId, { title: titleRef.current, content: editorRef.current?.getHTML() ?? '' });
  }, [updateWikiPage]);

  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: { languageClassPrefix: 'language-' } }),
      Placeholder.configure({ placeholder: 'Start writing here…  Use the toolbar above to format text.' }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none h-full min-h-[200px] px-5 py-4 text-[#1E2636] outline-none focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Always use refs so this never captures stale state
      const pageId = selectedPageIdRef.current;
      if (!pageId) return;
      const newContent = ed.getHTML();
      const newTitle = titleRef.current;
      const ch = activeChannelRef.current;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateWikiPage(ch, pageId, { title: newTitle, content: newContent });
        saveTimerRef.current = null;
      }, 500);
    },
  });

  // Keep editorRef in sync so flushSave can access it
  useEffect(() => {
    (editorRef as React.MutableRefObject<typeof editor>).current = editor;
  }, [editor]);

  useEffect(() => {
    const page = pages.find(p => p.id === selectedPageId);
    if (page && editor) {
      setTitle(page.title);
      titleRef.current = page.title;
      if (editor.getHTML() !== page.content) editor.commands.setContent(page.content || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId, editor]);

  useEffect(() => {
    if (pages.length > 0) {
      if (!selectedPageId || !pages.find(p => p.id === selectedPageId)) {
        setSelectedPageId(pages[0].id);
      }
    }
  }, [pages, selectedPageId]);

  useEffect(() => {
    return () => {
      // Flush unsaved content on unmount
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        const pageId = selectedPageIdRef.current;
        const ch = activeChannelRef.current;
        if (pageId) updateWikiPage(ch, pageId, { title: titleRef.current, content: editorRef.current?.getHTML() ?? '' });
      }
    };
  }, [updateWikiPage]);

  const selectedPage = pages.find(p => p.id === selectedPageId) ?? null;
  const pageIsPrivate = selectedPage ? selectedPage.isPrivate !== false : true;

  const togglePrivacy = () => {
    if (!selectedPageId) return;
    updateWikiPage(activeChannel, selectedPageId, { isPrivate: !pageIsPrivate });
  };

  // scheduleAutoSave is still exposed for title changes — uses refs internally
  const scheduleAutoSave = useCallback((newTitle: string, newContent: string) => {
    const pageId = selectedPageIdRef.current;
    const ch = activeChannelRef.current;
    if (!pageId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateWikiPage(ch, pageId, { title: newTitle, content: newContent });
      saveTimerRef.current = null;
    }, 500);
  }, [updateWikiPage]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleAutoSave(e.target.value, editor?.getHTML() ?? '');
  };

  const switchToPage = useCallback((pageId: string) => {
    // Flush current page before switching so nothing is lost
    flushSave();
    setSelectedPageId(pageId);
  }, [flushSave]);

  const handleNewPage = () => {
    // Save current page immediately before creating new one
    flushSave();
    addWikiPage(activeChannel, { title: 'Untitled Page', content: '' });
    setTimeout(() => {
      const freshPages = useDashboardStore.getState().wikiPages[activeChannel] ?? [];
      const newest = freshPages[freshPages.length - 1];
      if (newest) {
        setSelectedPageId(newest.id);
        selectedPageIdRef.current = newest.id;
        setTitle(newest.title);
        titleRef.current = newest.title;
        editor?.commands.setContent('', { emitUpdate: false });
      }
    }, 0);
  };

  const handleDeletePage = () => {
    if (!selectedPageId) return;
    if (!window.confirm('Delete this wiki page? This cannot be undone.')) return;
    deleteWikiPage(activeChannel, selectedPageId);
    const remaining = pages.filter(p => p.id !== selectedPageId);
    if (remaining.length > 0) { switchToPage(remaining[0].id); }
    else { setSelectedPageId(null); selectedPageIdRef.current = null; setTitle(''); titleRef.current = ''; editor?.commands.clearContent(); }
  };

  const handleShareToChat = () => {
    const content = editor?.getText() ?? '';
    if (!title.trim() && !content.trim()) return;
    let sender = 'You'; let initials = 'YO'; const color = '#3E4A89';
    try {
      const auth = localStorage.getItem('edutechex_token');
      if (auth) {
        const { user } = JSON.parse(auth);
        if (user) {
          sender = user.name || 'You';
          initials = sender.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
        }
      }
    } catch { /* ignore */ }
    addMessage(activeChannel, {
      id: `msg-wiki-${Date.now()}`, sender, initials, color,
      timestamp: new Date().toISOString(),
      text: `📖 **Wiki: ${title || 'Untitled'}**\n\n${content}`,
    });
    onClose();
  };

  const charCount = editor?.storage.characterCount.characters() ?? 0;
  const wordCount = editor?.storage.characterCount.words() ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ background: 'transparent' }}>
      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg,#F8FAFC 0%,#EEF2F6 100%)',
        padding: '0 18px', height: 60, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        borderBottom: '1px solid rgba(99,102,241,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: isPersonal
              ? 'linear-gradient(145deg,#1e1140,#4c1d95)'
              : 'linear-gradient(145deg,#0d1f3c,#1e3a8a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${isPersonal ? 'rgba(139,92,246,0.4)' : 'rgba(59,130,246,0.4)'}`,
          }}>
            {isPersonal
              ? <Lock size={17} style={{ color: '#c4b5fd' }} strokeWidth={2} />
              : <BookOpen size={17} style={{ color: '#60a5fa' }} strokeWidth={2} />}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {isPersonal ? 'Private · only you' : 'Knowledge Base'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B', lineHeight: 1.15 }}>
              {isPersonal ? 'My Notes' : 'Wiki'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pages.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: isPersonal ? '#c4b5fd' : '#60a5fa',
              background: isPersonal ? 'rgba(139,92,246,0.14)' : 'rgba(59,130,246,0.14)',
              border: `1px solid ${isPersonal ? 'rgba(139,92,246,0.28)' : 'rgba(59,130,246,0.28)'}`,
              borderRadius: 20, padding: '3px 10px',
            }}>
              {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(15,23,42,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} style={{ color: 'rgba(15,23,42,0.4)' }} />
          </button>
        </div>
      </div>

      {/* ── Body: sidebar + editor ── */}
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '200px 1fr' }}>
        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC', borderRight: '1px solid rgba(99,102,241,0.08)' }}>
          {/* New page button */}
          <div style={{ padding: '12px 10px 8px' }}>
            <button
              type="button"
              onClick={handleNewPage}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                borderRadius: 10, padding: '9px 0',
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '0.05em',
                boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
              }}
            >
              <Plus size={13} strokeWidth={3} />
              New Page
            </button>
          </div>
          <div style={{ height: 1, background: 'rgba(99,102,241,0.08)', margin: '0 10px' }} />

          {/* Page list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            {pages.length === 0 ? (
              <div style={{
                margin: '8px 0', padding: '16px 12px', textAlign: 'center',
                borderRadius: 10, border: '1px dashed rgba(99,102,241,0.2)',
              }}>
                <FileText size={18} style={{ color: '#94A3B8', marginBottom: 6 }} />
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>No pages yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pages.map(page => {
                  const isSelected = page.id === selectedPageId;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => switchToPage(page.id)}
                      style={{
                        width: '100%', textAlign: 'left', borderRadius: 9, padding: '9px 10px',
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        background: isSelected
                          ? 'rgba(99,102,241,0.08)'
                          : 'transparent',
                        borderLeft: isSelected ? '2px solid #6366f1' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.04)'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        {page.isPrivate !== false && (
                          <Lock size={9} style={{ color: isSelected ? '#4F46E5' : '#64748B', flexShrink: 0 }} />
                        )}
                        <p style={{
                          fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: isSelected ? '#4F46E5' : '#475569', margin: 0,
                        }}>
                          {page.title || 'Untitled'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: isSelected ? '#64748B' : '#94A3B8' }}>
                        <Clock size={9} />
                        <span>{formatRelativeTime(page.updatedAt)}</span>
                        {page.isPrivate === false && (
                          <span style={{ marginLeft: 2, color: '#3B82F6', fontWeight: 700 }}>· shared</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── Editor ── */}
        <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#FFFFFF' }}>
          {!selectedPage ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '32px 28px', textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22,
                background: isPersonal ? 'linear-gradient(145deg,#1e1140,#4c1d95)' : 'linear-gradient(145deg,#0d1f3c,#1e3a8a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 12px 32px ${isPersonal ? 'rgba(139,92,246,0.25)' : 'rgba(59,130,246,0.25)'}`,
              }}>
                {isPersonal
                  ? <Lock size={30} style={{ color: '#c4b5fd' }} strokeWidth={1.5} />
                  : <BookOpen size={30} style={{ color: '#60a5fa' }} strokeWidth={1.5} />}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
                  {isPersonal ? 'Your notepad is empty' : 'No pages yet'}
                </p>
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.65, maxWidth: 240 }}>
                  {isPersonal
                    ? 'Jot down ideas or personal tasks. Only you can see these notes.'
                    : 'Create your first wiki page to capture knowledge for this channel.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleNewPage}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                  border: 'none', borderRadius: 10, padding: '10px 20px',
                  fontSize: 13, fontWeight: 800, color: 'white', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                {isPersonal ? 'Create your first note' : 'Create first page'}
              </button>
            </div>
          ) : (
            <>
              {/* Editor sub-header: title + toolbar */}
              <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(99,102,241,0.08)', padding: '14px 18px 10px' }}>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Page title…"
                  style={{
                    width: '100%', border: 'none', background: 'transparent',
                    fontSize: 18, fontWeight: 900, color: '#1E293B',
                    outline: 'none', marginBottom: 10,
                  }}
                />

                {/* Toolbar */}
                <div style={{
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1,
                  background: 'rgba(248,250,252,0.80)', borderRadius: 8, padding: '4px 6px',
                  border: '1px solid rgba(99,102,241,0.08)',
                }}>
                  {/* Format */}
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold (Ctrl+B)">
                    <Bold size={13} strokeWidth={2.5} />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic (Ctrl+I)">
                    <Italic size={13} strokeWidth={2.5} />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} title="Inline code">
                    <Code size={13} strokeWidth={2.5} />
                  </ToolbarBtn>

                  <ToolbarDivider />

                  {/* Headings */}
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
                    <Heading size={13} strokeWidth={2.5} />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Heading 3">
                    <Type size={13} strokeWidth={2.5} />
                  </ToolbarBtn>

                  <ToolbarDivider />

                  {/* Lists & blocks */}
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
                    <List size={13} strokeWidth={2.5} />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
                    <List size={13} strokeWidth={2.5} className="scale-x-[-1]" />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Blockquote">
                    <Quote size={13} strokeWidth={2.5} />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')} title="Code block">
                    <Code size={13} strokeWidth={3} />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider">
                    <Minus size={13} strokeWidth={2.5} />
                  </ToolbarBtn>

                  {/* Stats + autosave */}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#64748B' }}>{wordCount}w · {charCount}c</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '3px 7px' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Auto-save</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editor content */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <EditorContent
                  editor={editor}
                  className="h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[#1E293B] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#94A3B8] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
                />
              </div>

              {/* Footer */}
              <div style={{ flexShrink: 0, borderTop: '1px solid rgba(99,102,241,0.08)', padding: '10px 14px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleDeletePage}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      border: '1px solid rgba(148,163,184,0.15)', borderRadius: 9,
                      background: 'transparent', padding: '8px 14px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.05)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(148,163,184,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#64748B'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <Trash2 size={12} strokeWidth={2.5} /> Delete
                  </button>

                  {/* Privacy toggle */}
                  <button
                    type="button"
                    onClick={togglePrivacy}
                    title={pageIsPrivate ? 'Only you can see this note — click to share with channel' : 'Shared with channel — click to make private'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      border: pageIsPrivate ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(59,130,246,0.3)',
                      borderRadius: 9, background: pageIsPrivate ? 'rgba(139,92,246,0.07)' : 'rgba(59,130,246,0.07)',
                      padding: '8px 12px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 800,
                      color: pageIsPrivate ? '#7c3aed' : '#2563eb',
                      letterSpacing: '0.04em', transition: 'all 0.15s',
                    }}
                  >
                    {pageIsPrivate
                      ? <><Lock size={11} strokeWidth={2.5} /> Private</>
                      : <><Share2 size={11} strokeWidth={2.5} /> Shared</>}
                  </button>

                  {!isPersonal ? (
                    <button
                      type="button"
                      onClick={handleShareToChat}
                      disabled={!title.trim() && !editor?.getText().trim()}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        borderRadius: 9, padding: '8px 0', border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '0.04em',
                        background: title.trim() || editor?.getText().trim()
                          ? 'linear-gradient(135deg,#3b82f6,#6366f1)'
                          : '#94a3b8',
                        boxShadow: title.trim() || editor?.getText().trim() ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                        opacity: !title.trim() && !editor?.getText().trim() ? 0.5 : 1,
                      }}
                    >
                      <Share2 size={12} strokeWidth={2.5} /> Share to chat
                    </button>
                  ) : (
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      borderRadius: 9, border: '1px dashed rgba(148,163,184,0.12)', padding: '8px 0',
                      fontSize: 12, fontWeight: 600, color: '#64748B',
                    }}>
                      <Lock size={11} strokeWidth={2.5} /> Private — only visible to you
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
