'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, X, Trash2, Send, Bold, Italic, Code, List, Check } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';

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

function getNoteKey(channelId: string) {
  return `edutechex_notes_${channelId}`;
}

function getTimestampKey(channelId: string) {
  return `edutechex_notes_${channelId}_updated_at`;
}

function getPreview(note: string) {
  return note.replace(/\s+/g, ' ').trim();
}

export default function NotepadPanel({ onClose, activeChannel }: NotepadPanelProps) {
  const [selectedPadId, setSelectedPadId] = useState(activeChannel);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [savedPads, setSavedPads] = useState<SavedPad[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addMessage = useDashboardStore((s) => s.addMessage);
  const channels = useDashboardStore((s) => s.channels);

  const channelNameById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel.name] as const)),
    [channels]
  );

  const selectedName = channelNameById.get(selectedPadId) ?? 'Direct Message';
  const currentPadPreview = savedPads.find((pad) => pad.id === activeChannel)?.note ?? '';

  const refreshSavedPads = React.useCallback(() => {
    const pads = channels
      .map((channel) => {
        const stored = localStorage.getItem(getNoteKey(channel.id)) || '';
        const preview = getPreview(stored);
        if (!preview) return null;

        const updatedRaw = localStorage.getItem(getTimestampKey(channel.id));
        const updatedAt = updatedRaw ? Number(updatedRaw) : 0;

        return {
          id: channel.id,
          name: channel.name,
          note: stored,
          updatedAt,
        };
      })
      .filter((pad): pad is SavedPad => Boolean(pad))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    setSavedPads(pads);
  }, [channels]);

  useEffect(() => {
    setSelectedPadId(activeChannel);
  }, [activeChannel]);

  useEffect(() => {
    const saved = localStorage.getItem(getNoteKey(selectedPadId)) || '';
    setNote(saved);
    setSaveStatus('idle');
    refreshSavedPads();
  }, [refreshSavedPads, selectedPadId]);

  useEffect(() => {
    if (!note.trim()) {
      setIsSaving(false);
      setSaveStatus('idle');
      localStorage.removeItem(getNoteKey(selectedPadId));
      localStorage.removeItem(getTimestampKey(selectedPadId));
      refreshSavedPads();
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');
    const timer = setTimeout(() => {
      localStorage.setItem(getNoteKey(selectedPadId), note);
      localStorage.setItem(getTimestampKey(selectedPadId), String(Date.now()));
      setIsSaving(false);
      setSaveStatus('saved');
      refreshSavedPads();
    }, 500);

    return () => clearTimeout(timer);
  }, [note, refreshSavedPads, selectedPadId]);

  const selectedPadPreview = getPreview(note);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = prefix + selected + suffix;

    const newNote = text.substring(0, start) + replacement + text.substring(end);
    setNote(newNote);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
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
      const color = '#2563eb';
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
        color,
        timestamp: new Date().toISOString(),
        text: `Shared note from ${selectedName}\n\n${note.trim()}`,
      });

      toast.success(`Note sent to ${selectedName}.`);
    } catch {
      toast.error('Failed to share note to channel.');
    }
  };

  const handleClearNote = () => {
    if (window.confirm('Are you sure you want to clear this notepad? This cannot be undone.')) {
      setNote('');
      localStorage.removeItem(getNoteKey(selectedPadId));
      localStorage.removeItem(getTimestampKey(selectedPadId));
      setSaveStatus('idle');
      refreshSavedPads();
      toast.success('Notepad cleared');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <FileText size={16} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600">
              Workspace Notes
            </p>
            <span className="block truncate text-sm font-black text-slate-900">
              {savedPads.length} saved notepad{savedPads.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          title="Close Notepad"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50/80 p-3 lg:border-b-0 lg:border-r">
          <button
            type="button"
            onClick={() => setSelectedPadId(activeChannel)}
            className={`mb-3 w-full rounded-2xl border px-3 py-3 text-left transition ${
              selectedPadId === activeChannel
                ? 'border-indigo-200 bg-white shadow-sm'
                : 'border-slate-200 bg-white/70 hover:border-slate-300'
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Current chat
            </p>
            <p className="mt-1 truncate text-sm font-black text-slate-900">
              {channelNameById.get(activeChannel) ?? 'Direct Message'}
            </p>
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
              {selectedPadId === activeChannel && selectedPadPreview
                ? selectedPadPreview
                : getPreview(currentPadPreview) || 'Start drafting notes for this chat.'}
            </p>
          </button>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              All saved
            </p>
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
              {savedPads.length}
            </span>
          </div>

          <div className="max-h-[28vh] space-y-2 overflow-y-auto pr-1 lg:max-h-none lg:h-[calc(100vh-15rem)]">
            {savedPads.length ? (
              savedPads.map((pad) => (
                <button
                  key={pad.id}
                  type="button"
                  onClick={() => setSelectedPadId(pad.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    selectedPadId === pad.id
                      ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200'
                      : 'border-transparent bg-white hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-xs font-black ${selectedPadId === pad.id ? 'text-white' : 'text-slate-900'}`}
                    >
                      {pad.name}
                    </span>
                    <span
                      className={`text-[10px] font-black ${selectedPadId === pad.id ? 'text-slate-300' : 'text-slate-400'}`}
                    >
                      {pad.note.trim().length}
                    </span>
                  </div>
                  <p
                    className={`mt-1 line-clamp-3 text-xs font-semibold leading-5 ${selectedPadId === pad.id ? 'text-slate-200' : 'text-slate-500'}`}
                  >
                    {getPreview(pad.note)}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
                No saved notepads yet.
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Editing note
                </p>
                <h3 className="text-base font-black text-slate-950">{selectedName}</h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                {isSaving && <span>Saving...</span>}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Check size={12} strokeWidth={3} />
                    Saved
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => insertMarkdown('**', '**')}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="Bold"
              >
                <Bold size={14} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('*', '*')}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="Italic"
              >
                <Italic size={14} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('`', '`')}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="Code"
              >
                <Code size={14} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('- ')}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="Bullet List"
              >
                <List size={14} strokeWidth={2.5} />
              </button>
              <div className="ml-auto rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                Auto-save on
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 p-4">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Type notes for ${selectedName} here...`}
              className="h-full w-full resize-none rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm font-medium leading-7 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white/80 p-4">
            <div className="mb-3 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Ready to send
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Share this note directly into{' '}
                <span className="font-black text-slate-900">{selectedName}</span>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearNote}
                disabled={!note.trim()}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Trash2 size={13} />
                  Clear
                </span>
              </button>

              <button
                type="button"
                onClick={handleShareToChannel}
                disabled={!note.trim()}
                className="flex-1 rounded-2xl bg-slate-950 px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Send size={13} />
                  Send to chat
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
