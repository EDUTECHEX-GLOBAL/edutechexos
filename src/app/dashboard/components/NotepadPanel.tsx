'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FileText, X, Trash2, Send, Bold, Italic, Code, List, Save, Check } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';

interface NotepadPanelProps {
  onClose: () => void;
  activeChannel: string;
}

export default function NotepadPanel({ onClose, activeChannel }: NotepadPanelProps) {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addMessage = useDashboardStore((s) => s.addMessage);
  const channels = useDashboardStore((s) => s.channels);
  
  // Find current channel/user name
  const currentChannel = channels.find(c => c.id === activeChannel);
  const displayName = currentChannel ? currentChannel.name : 'Direct Message';

  // Load note from localstorage when activeChannel changes
  useEffect(() => {
    const key = `edutechex_notes_${activeChannel}`;
    const saved = localStorage.getItem(key) || '';
    setNote(saved);
    setSaveStatus('idle');
  }, [activeChannel]);

  // Autosave note when changed
  useEffect(() => {
    if (note === '') return;
    setIsSaving(true);
    setSaveStatus('idle');
    const timer = setTimeout(() => {
      const key = `edutechex_notes_${activeChannel}`;
      localStorage.setItem(key, note);
      setIsSaving(false);
      setSaveStatus('saved');
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [note, activeChannel]);

  // Insert markdown tag at cursor position
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

    // Refocus and place selection
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
      let color = '#2563eb';
      if (auth) {
        const { user } = JSON.parse(auth);
        if (user) {
          sender = user.name || 'Admin';
          initials = sender.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
        }
      }

      const noteMessage = {
        id: `msg-note-${Date.now()}`,
        sender,
        initials,
        color,
        timestamp: new Date().toISOString(),
        text: `📝 **Shared Note:**\n\n${note.trim()}`,
      };

      addMessage(activeChannel, noteMessage);
      toast.success('Note shared to channel successfully!');
    } catch (e) {
      toast.error('Failed to share note to channel.');
    }
  };

  const handleClearNote = () => {
    if (window.confirm('Are you sure you want to clear this notepad? This cannot be undone.')) {
      setNote('');
      const key = `edutechex_notes_${activeChannel}`;
      localStorage.removeItem(key);
      setSaveStatus('idle');
      toast.success('Notepad cleared');
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <FileText size={13} strokeWidth={2.5} />
          </div>
          <span className="truncate text-sm font-bold text-slate-900 tracking-tight">Notepad: {displayName}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          title="Close Notepad"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Editor Controls */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-3 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertMarkdown('**', '**')}
            className="p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 rounded-md transition-colors"
            title="Bold"
          >
            <Bold size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('*', '*')}
            className="p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 rounded-md transition-colors"
            title="Italic"
          >
            <Italic size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('`', '`')}
            className="p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 rounded-md transition-colors"
            title="Code"
          >
            <Code size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('- ', '')}
            className="p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 rounded-md transition-colors"
            title="Bullet List"
          >
            <List size={14} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {isSaving && <span>Saving...</span>}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-0.5 text-emerald-600">
              <Check size={12} strokeWidth={3} />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 p-3">
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Type notes for ${displayName} here... (Auto-saves in workspace)`}
          className="w-full h-full resize-none bg-transparent text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 font-medium"
        />
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 border-t border-slate-200 p-3 bg-slate-50/50 flex gap-2">
        <button
          type="button"
          onClick={handleClearNote}
          disabled={!note.trim()}
          className="flex-1 py-2 px-3 border border-slate-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 cursor-pointer"
        >
          <Trash2 size={13} />
          Clear
        </button>

        <button
          type="button"
          onClick={handleShareToChannel}
          disabled={!note.trim()}
          className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:hover:bg-indigo-600 cursor-pointer"
        >
          <Send size={13} />
          Share to Chat
        </button>
      </div>
    </div>
  );
}
