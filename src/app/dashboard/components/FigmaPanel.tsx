'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Link2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface FigmaPanelProps {
  onClose: () => void;
}

/* Convert any Figma share URL into the embeddable iframe URL */
function toEmbedUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Already an embed URL
  if (trimmed.startsWith('https://www.figma.com/embed')) return trimmed;

  // Any figma.com URL (design, proto, file…)
  if (trimmed.includes('figma.com/')) {
    return `https://www.figma.com/embed?embed_host=edutechexos&url=${encodeURIComponent(trimmed)}`;
  }
  return null;
}

const QUICK_LINKS = [
  { label: 'Skillnaav UI',     url: 'https://www.figma.com/design/skillnaav-placeholder' },
  { label: 'AssessA Screens',  url: 'https://www.figma.com/design/assessa-placeholder' },
  { label: 'EduTechEx Brand',  url: 'https://www.figma.com/design/edutechex-brand-placeholder' },
];

export default function FigmaPanel({ onClose }: FigmaPanelProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{ height: '90vh' }}
        initial={{ opacity: 0, y: 50, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360, mass: 0.8 }}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              {/* Figma-coloured F icon */}
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
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
          <Link2 size={15} className="shrink-0 text-slate-400" />
          <input
            value={inputUrl}
            onChange={(e) => { setInputUrl(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && loadFile()}
            placeholder="https://www.figma.com/design/… or /proto/…"
            className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
          />
          {embedUrl && (
            <button onClick={() => { setEmbedUrl(null); setInputUrl(''); }}
              title="Clear" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 transition-colors">
              <RefreshCw size={13} />
            </button>
          )}
          <button onClick={() => loadFile()}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#1a1a2e] px-3 text-xs font-black text-white hover:bg-[#0f0f1e] transition-colors">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 z-10">
                  <svg viewBox="0 0 38 57" width="40" height="40" className="animate-pulse" aria-hidden="true">
                    <path fill="#F24E1E" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
                    <path fill="#0ACF83" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
                    <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
                    <path fill="#FF7262" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/>
                    <path fill="#1ABCFE" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/>
                  </svg>
                  <p className="text-sm font-bold text-slate-500">Loading Figma file…</p>
                  <p className="text-xs text-slate-400">Make sure the file is set to "Anyone with the link can view"</p>
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
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800">
                  <svg viewBox="0 0 38 57" width="40" height="40" aria-hidden="true">
                    <path fill="#F24E1E" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
                    <path fill="#FF7262" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/>
                    <path fill="#1ABCFE" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/>
                    <path fill="#0ACF83" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
                    <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Embed a Figma File</h3>
                <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Paste any Figma URL above — design files, prototypes, or FigJam boards — to review them without leaving EduTechExOS.
                </p>
              </div>

              {/* Quick-link tiles */}
              <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Quick links</p>
                {QUICK_LINKS.map((link) => (
                  <button key={link.label}
                    onClick={() => { setInputUrl(link.url); loadFile(link.url); }}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                      <svg viewBox="0 0 38 57" width="16" height="16" aria-hidden="true">
                        <path fill="#F24E1E" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
                        <path fill="#0ACF83" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
                        <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                      {link.label}
                    </span>
                    <ExternalLink size={12} className="ml-auto text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Tip */}
              <p className="max-w-sm text-center text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>Tip:</strong> In Figma, click <em>Share → Copy link</em> and paste it above.
                The file must be set to <strong>Anyone with the link can view</strong>.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
