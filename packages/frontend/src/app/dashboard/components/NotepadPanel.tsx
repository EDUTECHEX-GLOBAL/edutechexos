'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Trash2,
  Share2,
  Bold,
  Italic,
  Code,
  List,
  Check,
  Pencil,
  FileText,
  Hash,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';
import { getNoteAction, saveNoteAction } from '@/app/actions/dbActions';
// Server actions for note persistence

interface NotepadPanelProps {
  onClose: () => void;
  activeChannel: string;
}

type SavedPad = {
  id: string;
  name: string;
  note: string;
  updatedAt: number;
};

function getCurrentUserEmail(): string {
  if (typeof window === 'undefined') return 'guest';
  try {
    const raw = localStorage.getItem('edutechex_token');
    return raw ? (JSON.parse(raw).user?.email?.toLowerCase() ?? 'guest') : 'guest';
  } catch {
    return 'guest';
  }
}

function getNoteKey(channelId: string) {
  return `edutechex_notes_${getCurrentUserEmail()}_${channelId}`;
}

function getTimestampKey(channelId: string) {
  return `edutechex_notes_${getCurrentUserEmail()}_${channelId}_updated_at`;
}

function getPreview(note: string) {
  return note.replace(/\s+/g, ' ').trim();
}

function formatRelativeTime(ts: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotepadPanel({ onClose, activeChannel }: NotepadPanelProps) {
  const [selectedPadId, setSelectedPadId] = useState(activeChannel);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addMessage = useDashboardStore((s) => s.addMessage);
  const channels = useDashboardStore((s) => s.channels);

  const channelNameById = useMemo(
    () => new Map(channels.map((ch) => [ch.id, ch.name] as const)),
    [channels]
  );

  const recomputeSavedPads = React.useCallback((): SavedPad[] => {
    if (typeof window === 'undefined') return [];
    return channels
      .map((ch) => {
        const stored = localStorage.getItem(getNoteKey(ch.id)) || '';
        if (!getPreview(stored)) return null;
        const updatedRaw = localStorage.getItem(getTimestampKey(ch.id));
        return {
          id: ch.id,
          name: ch.name,
          note: stored,
          updatedAt: updatedRaw ? Number(updatedRaw) : 0,
        } as SavedPad;
      })
      .filter((p): p is SavedPad => Boolean(p))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [channels]);

  const [savedPads, setSavedPads] = React.useState<SavedPad[]>(() => recomputeSavedPads());

  // Re-derive when channels list changes (new channel added, etc.)
  React.useEffect(() => {
    setSavedPads(recomputeSavedPads());
  }, [recomputeSavedPads]);

  const selectedName = channelNameById.get(selectedPadId) ?? 'Direct Message';

  useEffect(() => {
    setSelectedPadId(activeChannel);
  }, [activeChannel]);

  useEffect(() => {
    const loadNote = async () => {
      // Try fetching note from MongoDB
      const dbNote = await getNoteAction(selectedPadId);
      if (dbNote && dbNote.content) {
        setNote(dbNote.content);
      } else {
        const local = localStorage.getItem(getNoteKey(selectedPadId)) || '';
        setNote(local);
      }
      setSaveStatus('idle');
    };
    loadNote();
  }, [selectedPadId]);

  useEffect(() => {
    if (!note.trim()) {
      setIsSaving(false);
      setSaveStatus('idle');
      return;
    }
    setIsSaving(true);
    setSaveStatus('idle');
    const timer = setTimeout(async () => {
      localStorage.setItem(getNoteKey(selectedPadId), note);
      localStorage.setItem(getTimestampKey(selectedPadId), String(Date.now()));
      await saveNoteAction(selectedPadId, note);
      setIsSaving(false);
      setSaveStatus('saved');
      setSavedPads(recomputeSavedPads());
    }, 500);
    return () => clearTimeout(timer);
  }, [note, selectedPadId]);

  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;
  const charCount = note.length;

  const insertMarkdown = (prefix: string, suffix = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    const newNote =
      ta.value.substring(0, start) + prefix + selected + suffix + ta.value.substring(end);
    setNote(newNote);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const insertHeading = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const newNote = ta.value.substring(0, lineStart) + '## ' + ta.value.substring(lineStart);
    setNote(newNote);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(lineStart + 3, lineStart + 3);
    }, 0);
  };

  const handleShareToChannel = () => {
    if (!note.trim()) {
      toast.error('Cannot share an empty note.');
      return;
    }
    try {
      const auth = localStorage.getItem('edutechex_token');
      let sender = 'Admin';
      let initials = 'A';
      if (auth) {
        const { user } = JSON.parse(auth);
        if (user) {
          sender = user.name || 'Admin';
          initials = sender
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        }
      }
      addMessage(selectedPadId, {
        id: `msg-note-${Date.now()}`,
        sender,
        initials,
        color: '#3E4A89',
        timestamp: new Date().toISOString(),
        text: `📝 Shared note from ${selectedName}\n\n${note.trim()}`,
      });
      toast.success(`Note shared to #${selectedName}`);
      onClose();
    } catch {
      toast.error('Failed to share note.');
    }
  };

  const handleClearNote = () => {
    if (window.confirm('Clear this notepad? This cannot be undone.')) {
      setNote('');
      localStorage.removeItem(getNoteKey(selectedPadId));
      localStorage.removeItem(getTimestampKey(selectedPadId));
      setSaveStatus('idle');
      setSavedPads(recomputeSavedPads());
      toast.success('Notepad cleared');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-white">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="flex h-14 shrink-0 items-center justify-between px-4"
        style={{
          background: 'linear-gradient(135deg, #191E2F 0%, #0f172a 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/25 bg-[#1E2538]">
            <Pencil size={16} className="text-[#C4CAE0]" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7C859E]">
              Workspace
            </p>
            <p className="text-sm font-black leading-none text-white">Notes</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedPads.length > 0 && (
            <span className="rounded-full bg-[#1E2538] px-2.5 py-1 text-[11px] font-black text-[#C4CAE0]">
              {savedPads.length} saved
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

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '200px 1fr' }}>
        {/* ── Sidebar ── */}
        <aside
          className="flex flex-col gap-0 overflow-hidden border-r border-slate-900"
          style={{ background: '#191E2F' }}
        >
          {/* Current channel */}
          <div className="shrink-0 p-2.5">
            <p className="mb-1.5 px-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#7C859E]">
              Current chat
            </p>
            <button
              type="button"
              onClick={() => setSelectedPadId(activeChannel)}
              className={`w-full rounded-xl p-2.5 text-left transition-all ${
                selectedPadId === activeChannel
                  ? 'bg-[#3E4A89] shadow-lg shadow-indigo-900/50'
                  : 'hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash
                  size={11}
                  className={selectedPadId === activeChannel ? 'text-[#C4CAE0]' : 'text-[#7C859E]'}
                />
                <span
                  className={`truncate text-sm font-black ${
                    selectedPadId === activeChannel ? 'text-white' : 'text-[#9BA6D3]'
                  }`}
                >
                  {channelNameById.get(activeChannel) ?? 'DM'}
                </span>
              </div>
              {savedPads.find((p) => p.id === activeChannel) && (
                <p
                  className={`mt-1 line-clamp-2 text-[11px] leading-4 ${
                    selectedPadId === activeChannel ? 'text-indigo-200' : 'text-[#7C859E]'
                  }`}
                >
                  {getPreview(savedPads.find((p) => p.id === activeChannel)?.note ?? '')}
                </p>
              )}
              {!savedPads.find((p) => p.id === activeChannel) && (
                <p
                  className={`mt-1 text-[11px] italic ${
                    selectedPadId === activeChannel ? 'text-[#C4CAE0]' : 'text-[#4A5578]'
                  }`}
                >
                  No notes yet
                </p>
              )}
            </button>
          </div>

          <div className="mx-2.5 border-t border-[rgba(62,74,137,0.15)]" />

          {/* All saved */}
          <div className="flex min-h-0 flex-1 flex-col gap-0 p-2.5">
            <p className="mb-1.5 px-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#7C859E]">
              All saved
            </p>

            <div className="flex-1 space-y-1 overflow-y-auto">
              {savedPads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[rgba(62,74,137,0.15)] p-4 text-center">
                  <FileText size={20} className="mx-auto mb-1.5 text-[#4A5578]" />
                  <p className="text-[12px] font-semibold text-[#4A5578]">No saved notes yet</p>
                </div>
              ) : (
                savedPads.map((pad) => (
                  <button
                    key={pad.id}
                    type="button"
                    onClick={() => setSelectedPadId(pad.id)}
                    className={`w-full rounded-xl p-2.5 text-left transition-all ${
                      selectedPadId === pad.id
                        ? 'bg-[#3E4A89] shadow-lg shadow-indigo-900/50'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`truncate text-[11px] font-black ${
                          selectedPadId === pad.id ? 'text-white' : 'text-[#9BA6D3]'
                        }`}
                      >
                        {pad.name}
                      </span>
                      <span
                        className={`shrink-0 text-[9px] font-semibold ${
                          selectedPadId === pad.id ? 'text-[#C4CAE0]' : 'text-[#4A5578]'
                        }`}
                      >
                        {formatRelativeTime(pad.updatedAt)}
                      </span>
                    </div>
                    <p
                      className={`mt-1 line-clamp-2 text-[10px] leading-[1.4] ${
                        selectedPadId === pad.id ? 'text-indigo-200' : 'text-[#7C859E]'
                      }`}
                    >
                      {getPreview(pad.note)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ── Editor ── */}
        <section className="flex min-h-0 flex-1 flex-col" style={{ background: '#F2F0EC' }}>
          {/* Editor sub-header */}
          <div className="shrink-0 border-b border-amber-100 bg-white/80 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash size={13} className="text-[#7C859E]" />
                <h3 className="text-sm font-black text-[#1E2636]">{selectedName}</h3>
              </div>
              <div className="flex items-center gap-2">
                {isSaving && (
                  <span className="text-[11px] font-semibold text-amber-500">Saving…</span>
                )}
                {saveStatus === 'saved' && !isSaving && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <Check size={11} strokeWidth={3} />
                    Saved
                  </span>
                )}
                {charCount > 0 && (
                  <span className="text-[11px] font-semibold text-[#7C859E]">
                    {wordCount}w · {charCount}c
                  </span>
                )}
              </div>
            </div>

            {/* Formatting toolbar */}
            <div className="mt-2 flex items-center gap-0.5 rounded-lg border border-[rgba(62,74,137,0.08)] bg-white p-1">
              {[
                { icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**') },
                { icon: Italic, label: 'Italic', action: () => insertMarkdown('*', '*') },
                { icon: Code, label: 'Inline code', action: () => insertMarkdown('`', '`') },
                { icon: List, label: 'Bullet', action: () => insertMarkdown('- ') },
                { icon: Hash, label: 'Heading', action: insertHeading },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#7C859E] transition-colors hover:bg-[rgba(62,74,137,0.08)] hover:text-[#1E2636]"
                  title={label}
                >
                  <Icon size={13} strokeWidth={2.5} />
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600">
                  Auto-save
                </span>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="min-h-0 flex-1 p-4">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Start writing notes for #${selectedName}…\n\nTip: Use **bold**, *italic*, or \`code\` for formatting.`}
              className="h-full w-full resize-none rounded-2xl border-0 bg-transparent px-4 py-4 text-sm font-medium leading-7 text-[#1E2636] placeholder-slate-300 outline-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(transparent, transparent 27px, #E8E5F0 27px, #E8E5F0 28px)',
                backgroundSize: '100% 28px',
                backgroundPositionY: '28px',
                fontFamily: "'Georgia', 'Times New Roman', serif",
                lineHeight: '28px',
              }}
            />
          </div>

          {/* Footer actions */}
          <div className="shrink-0 border-t border-amber-100 bg-white/90 p-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearNote}
                disabled={!note.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(62,74,137,0.12)] bg-white py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#4A5578] transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={12} strokeWidth={2.5} />
                Clear
              </button>

              <button
                type="button"
                onClick={handleShareToChannel}
                disabled={!note.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: note.trim() ? 'linear-gradient(135deg, #3E4A89, #7c3aed)' : '#94a3b8',
                }}
              >
                <Share2 size={12} strokeWidth={2.5} />
                Share to chat
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
