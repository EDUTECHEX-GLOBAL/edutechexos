'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Link2, AlertCircle, RefreshCw, Pencil, Check, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface FigmaPanelProps {
  onClose: () => void;
}

const STORAGE_KEY = 'edutechex_figma_links';

type QuickLink = { label: string; url: string };

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { label: 'Skillnaav UI',    url: '' },
  { label: 'AssessA Screens', url: '' },
  { label: 'EduTechEx Brand', url: '' },
];

function loadQuickLinks(): QuickLink[] {
  if (typeof window === 'undefined') return DEFAULT_QUICK_LINKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as QuickLink[];
  } catch { /* */ }
  return DEFAULT_QUICK_LINKS;
}

function saveQuickLinks(links: QuickLink[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(links)); } catch { /* */ }
}

/* Convert any Figma share URL into the embeddable iframe URL */
function toEmbedUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('https://www.figma.com/embed')) return trimmed;
  if (trimmed.includes('figma.com/'))
    return `https://www.figma.com/embed?embed_host=edutechexos&url=${encodeURIComponent(trimmed)}`;
  return null;
}

export default function FigmaPanel({ onClose }: FigmaPanelProps) {
  const [inputUrl, setInputUrl]   = useState('');
  const [embedUrl, setEmbedUrl]   = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  // Quick links state — loaded from localStorage
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(DEFAULT_QUICK_LINKS);
  const [editMode, setEditMode]     = useState(false);
  const [editLinks, setEditLinks]   = useState<QuickLink[]>([]);

  useEffect(() => {
    const stored = loadQuickLinks();
    setQuickLinks(stored);
  }, []);

  function loadFile(url?: string) {
    const target = url ?? inputUrl;
    const result = toEmbedUrl(target);
    if (!result) {
      setError('Paste a valid Figma URL (figma.com/design/… or figma.com/proto/…)');
      return;
    }
    setError('');
    setLoading(true);
    setEmbedUrl(result);
  }

  function startEdit() {
    setEditLinks(quickLinks.map((l) => ({ ...l })));
    setEditMode(true);
  }

  function saveEdit() {
    const cleaned = editLinks.filter((l) => l.label.trim());
    setQuickLinks(cleaned);
    saveQuickLinks(cleaned);
    setEditMode(false);
  }

  function cancelEdit() {
    setEditMode(false);
  }

  function updateEditLink(i: number, field: keyof QuickLink, value: string) {
    setEditLinks((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function addEditLink() {
    setEditLinks((prev) => [...prev, { label: '', url: '' }]);
  }

  function removeEditLink(i: number) {
    setEditLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[rgba(62,74,137,0.12)] bg-white shadow-2xl  dark:bg-[#191E2F]"
        onClick={(e) => e.stopPropagation()}
        style={{ height: '90vh' }}
        initial={{ opacity: 0, y: 50, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360, mass: 0.8 }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[rgba(62,74,137,0.12)]  bg-gradient-to-r from-[#191E2F] to-[#1E2538] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <svg viewBox="0 0 38 57" width="16" height="16" aria-hidden="true">
                <path fill="#F24E1E" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
                <path fill="#FF7262" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/>
                <path fill="#1ABCFE" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/>
                <path fill="#0ACF83" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
                <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Figma Viewer</h2>
              <p className="text-[10px] text-white/50">Paste a Figma file or prototype URL to embed it</p>
            </div>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── URL bar ─────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[rgba(62,74,137,0.12)]  bg-[#FAF8F5] px-4 py-3">
          <Link2 size={15} className="shrink-0 text-[#7C859E]" />
          <input
            value={inputUrl}
            onChange={(e) => { setInputUrl(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && loadFile()}
            placeholder="https://www.figma.com/design/… or /proto/…"
            className="flex-1 bg-transparent text-sm font-semibold text-[#1E2636] placeholder-slate-400 outline-none"
          />
          {embedUrl && (
            <button onClick={() => { setEmbedUrl(null); setInputUrl(''); }}
              title="Clear" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C859E] hover:bg-slate-200 hover:text-[#4A5578] transition-colors">
              <RefreshCw size={13} />
            </button>
          )}
          <button onClick={() => loadFile()}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#191E2F] hover:bg-[#191E2F] transition-colors">
            <ExternalLink size={12} /> Embed
          </button>
        </div>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div className="flex shrink-0 items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {/* ── Main area ───────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {embedUrl ? (
            /* iframe embed */
            <div className="relative flex-1 min-h-0">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#191E2F] z-10">
                  <svg viewBox="0 0 38 57" width="40" height="40" className="animate-pulse" aria-hidden="true">
                    <path fill="#F24E1E" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
                    <path fill="#0ACF83" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
                    <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
                    <path fill="#FF7262" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/>
                    <path fill="#1ABCFE" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/>
                  </svg>
                  <p className="text-sm font-bold text-[#7C859E]">Loading Figma file…</p>
                  <p className="text-xs text-[#7C859E]">Make sure the file is set to "Anyone with the link can view"</p>
                </div>
              )}
              <iframe
                key={embedUrl}
                src={embedUrl}
                title="Figma embed"
                className="h-full w-full border-0"
                allowFullScreen
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : (
            /* Placeholder / Quick links */
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[rgba(62,74,137,0.08)] dark:bg-slate-800">
                  <svg viewBox="0 0 38 57" width="40" height="40" aria-hidden="true">
                    <path fill="#F24E1E" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
                    <path fill="#FF7262" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/>
                    <path fill="#1ABCFE" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/>
                    <path fill="#0ACF83" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
                    <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-black text-[#1E2636]">Embed a Figma File</h3>
                <p className="max-w-sm text-sm text-[#7C859E] dark:text-[#7C859E] leading-relaxed">
                  Paste any Figma URL above — design files, prototypes, or FigJam boards — to review them without leaving EduTechExOS.
                </p>
              </div>

              {/* Quick-link tiles */}
              <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                <div className="flex items-center justify-between w-full">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7C859E]">Quick links</p>
                  {!editMode ? (
                    <button onClick={startEdit}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#7C859E] hover:text-[#C4CAE0] transition-colors">
                      <Pencil size={11} /> Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={addEditLink}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                        <Plus size={11} /> Add
                      </button>
                      <button onClick={saveEdit}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#C4CAE0] hover:text-[#3E4A89] transition-colors">
                        <Check size={11} /> Save
                      </button>
                      <button onClick={cancelEdit}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#7C859E] hover:text-[#4A5578] transition-colors">
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit mode */}
                {editMode ? (
                  <div className="flex flex-col gap-2 w-full">
                    {editLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 dark:bg-indigo-900/20 p-2">
                        <div className="flex flex-1 flex-col gap-1 min-w-0">
                          <input
                            value={link.label}
                            onChange={(e) => updateEditLink(i, 'label', e.target.value)}
                            placeholder="Label (e.g. Skillnaav UI)"
                            className="w-full rounded-lg border border-[rgba(62,74,137,0.12)] px-2 py-1 text-xs font-semibold text-[#4A5578] outline-none focus:border-green-400 bg-white dark:bg-slate-800"
                          />
                          <input
                            value={link.url}
                            onChange={(e) => updateEditLink(i, 'url', e.target.value)}
                            placeholder="https://www.figma.com/design/…"
                            className="w-full rounded-lg border border-[rgba(62,74,137,0.12)] px-2 py-1 text-xs font-mono text-[#4A5578] outline-none focus:border-green-400 bg-white dark:bg-slate-800 dark:text-[#9BA6D3]"
                          />
                        </div>
                        <button onClick={() => removeEditLink(i)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#7C859E] hover:bg-red-100 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Normal mode */
                  <div className="flex flex-col gap-2 w-full">
                    {quickLinks.length === 0 && (
                      <p className="text-center text-xs text-[#7C859E] py-2">No quick links yet. Click Edit to add your Figma files.</p>
                    )}
                    {quickLinks.map((link, idx) => (
                      <button key={idx}
                        onClick={() => {
                          if (!link.url.trim()) return;
                          setInputUrl(link.url);
                          loadFile(link.url);
                        }}
                        disabled={!link.url.trim()}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all group
                          ${link.url.trim()
                            ? 'border-[rgba(62,74,137,0.12)]  bg-white dark:bg-slate-800 hover:border-[#C4CAE0] hover:bg-[#1E2538] dark:hover:bg-indigo-900/20 cursor-pointer'
                            : 'border-dashed border-[rgba(62,74,137,0.12)]  bg-[#FAF8F5] opacity-60 cursor-not-allowed'
                          }`}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(62,74,137,0.08)] dark:bg-slate-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                          <svg viewBox="0 0 38 57" width="16" height="16" aria-hidden="true">
                            <path fill="#F24E1E" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
                            <path fill="#0ACF83" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
                            <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-bold text-[#4A5578] group-hover:text-[#3E4A89] dark:group-hover:text-indigo-300 transition-colors">
                            {link.label}
                          </span>
                          {!link.url.trim() && (
                            <p className="text-[10px] text-[#7C859E] mt-0.5">No URL set — click Edit to add</p>
                          )}
                        </div>
                        {link.url.trim() && (
                          <ExternalLink size={12} className="ml-auto text-[#9BA6D3] group-hover:text-[#9BA6D3] transition-colors" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tip */}
              <p className="max-w-sm text-center text-[11px] text-[#7C859E] leading-relaxed">
                💡 <strong>Tip:</strong> In Figma, click <em>Share → Copy link</em> and paste it above.
                The file must be set to <strong>Anyone with the link can view</strong>.
                Use <strong>Edit</strong> to save your team&apos;s Figma links as quick access shortcuts.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}





