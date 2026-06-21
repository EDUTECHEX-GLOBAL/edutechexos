'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Zap, BookOpen, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Msg = {
  id: string;
  role: 'user' | 'bot';
  text: string;
};

type HistoryEntry = { role: string; text: string };

/* ─── Quick replies ──────────────────────────────────────────────────────── */
const QUICK_REPLIES = [
  { label: 'What can you do?', icon: Sparkles },
  { label: 'Explain EduTechExOS', icon: BookOpen },
  { label: 'Team productivity tips', icon: Users },
  { label: 'How do channels work?', icon: Zap },
];

/* ─── Initial greeting ───────────────────────────────────────────────────── */
const WELCOME: Msg = {
  id: 'welcome',
  role: 'bot',
  text: "Hi there! 👋 I'm **EduTechExOS Copilot** — your AI assistant. Ask me anything about the platform, team workflows, or whatever's on your mind.",
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function WidgetPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || thinking) return;
      setShowQuick(false);
      setInput('');

      const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: q };
      setMessages((p) => [...p, userMsg]);
      setThinking(true);

      try {
        const res = await fetch('/api/widget-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, history }),
        });
        const data = await res.json();
        const answer: string = data.answer || data.error || 'Sorry, something went wrong.';
        const botMsg: Msg = { id: `b-${Date.now()}`, role: 'bot', text: answer };
        setMessages((p) => [...p, botMsg]);
        setHistory((h) => [...h, { role: 'user', text: q }, { role: 'bot', text: answer }]);
      } catch {
        setMessages((p) => [
          ...p,
          {
            id: `err-${Date.now()}`,
            role: 'bot',
            text: "Sorry, I couldn't connect. Please try again.",
          },
        ]);
      } finally {
        setThinking(false);
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    },
    [thinking, history]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* ── Inject keyframes ───────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes avatarGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(82,183,136,0); }
          50%       { box-shadow: 0 0 0 10px rgba(82,183,136,0.18); }
        }
        @keyframes statusBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .widget-scrollbar::-webkit-scrollbar { width: 4px; }
        .widget-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .widget-scrollbar::-webkit-scrollbar-thumb { background: #d4d3d0; border-radius: 99px; }
        .prose-widget p { margin-bottom: 6px; line-height: 1.55; }
        .prose-widget p:last-child { margin-bottom: 0; }
        .prose-widget strong { font-weight: 650; }
        .prose-widget code {
          background: rgba(62,74,137,0.08);
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
        }
        .prose-widget ul, .prose-widget ol { padding-left: 16px; margin: 4px 0 6px; }
        .prose-widget li { margin-bottom: 2px; }
      `}</style>

      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', system-ui, sans-serif",
          background: '#F2F0EC',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #191E2F 0%, #191E2F 45%, #3E4A89 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 8s ease infinite',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle shimmer layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at 80% 50%, rgba(155,166,211,0.12) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />

          {/* Bot avatar */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0px rgba(62,74,137,0)',
                '0 0 0 8px rgba(62,74,137,0.20)',
                '0 0 0 0px rgba(62,74,137,0)',
              ],
            }}
            transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.10)',
              border: '1.5px solid rgba(62,74,137,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Sparkles size={20} color="#9BA6D3" />
          </motion.div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              EduTechExOS Copilot
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#9BA6D3',
                  flexShrink: 0,
                }}
              />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 500 }}>
                AI Powered · Always online
              </span>
            </div>
          </div>

          {/* Powered-by badge */}
          <div
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20,
              padding: '3px 10px',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              position: 'relative',
              zIndex: 1,
              whiteSpace: 'nowrap',
            }}
          >
            EduTechExOS
          </div>
        </div>

        {/* ── Messages ────────────────────────────────────────────────── */}
        <div
          className="widget-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                {/* Bot avatar */}
                {msg.role === 'bot' && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #191E2F, #3E4A89)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 1px 4px rgba(62,74,137,0.25)',
                    }}
                  >
                    <Sparkles size={13} color="#74c69d" />
                  </div>
                )}

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: '76%',
                    padding: '10px 13px',
                    borderRadius: msg.role === 'user' ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                    background: msg.role === 'user' ? '#191E2F' : '#ffffff',
                    color: msg.role === 'user' ? '#ffffff' : '#191919',
                    fontSize: 13.5,
                    lineHeight: 1.52,
                    boxShadow:
                      msg.role === 'user'
                        ? '0 2px 10px rgba(62,74,137,0.28)'
                        : '0 1px 4px rgba(0,0,0,0.07)',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.role === 'bot' ? (
                    <div className="prose-widget">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {thinking && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #191E2F, #3E4A89)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 4px rgba(62,74,137,0.25)',
                  }}
                >
                  <Sparkles size={13} color="#74c69d" />
                </div>
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px 16px 16px 3px',
                    padding: '12px 16px',
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#9BA6D3',
                      }}
                      animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.1,
                        delay: i * 0.18,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick replies */}
          <AnimatePresence>
            {showQuick && !thinking && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.22, delay: 0.35 }}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginLeft: 36,
                  marginBottom: 8,
                }}
              >
                {QUICK_REPLIES.map(({ label, icon: Icon }) => (
                  <motion.button
                    key={label}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => send(label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 11px',
                      borderRadius: 20,
                      border: '1.5px solid #E0DDE8',
                      background: 'white',
                      color: '#1E2636',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.borderColor = '#3E4A89')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.borderColor = '#E0DDE8')
                    }
                  >
                    <Icon size={12} />
                    {label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ───────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          style={{
            borderTop: '1px solid #E0DDE8',
            padding: '10px 12px',
            background: '#ffffff',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything…"
            disabled={thinking}
            autoComplete="off"
            style={{
              flex: 1,
              border: '1.5px solid #E0DDE8',
              borderRadius: 12,
              padding: '9px 13px',
              fontSize: 13.5,
              outline: 'none',
              fontFamily: 'inherit',
              color: '#191919',
              background: '#F2F0EC',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3E4A89';
              e.currentTarget.style.background = '#ffffff';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E0DDE8';
              e.currentTarget.style.background = '#F2F0EC';
            }}
          />

          <motion.button
            type="submit"
            disabled={!input.trim() || thinking}
            whileHover={input.trim() && !thinking ? { scale: 1.08 } : {}}
            whileTap={input.trim() && !thinking ? { scale: 0.9 } : {}}
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              border: 'none',
              cursor: input.trim() && !thinking ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.18s',
              background: input.trim() && !thinking ? '#191E2F' : '#E0DDE8',
              color: input.trim() && !thinking ? '#ffffff' : '#a3a3a0',
            }}
          >
            <Send size={16} />
          </motion.button>
        </form>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div
          style={{
            textAlign: 'center',
            padding: '6px 12px',
            fontSize: 10,
            color: '#b0afac',
            background: '#ffffff',
            borderTop: '1px solid #FAF8F5',
            flexShrink: 0,
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ color: '#c0bfbc' }}>Powered by </span>
          <span style={{ color: '#3E4A89', fontWeight: 600 }}>EduTechExOS</span>
        </div>
      </div>
    </>
  );
}
