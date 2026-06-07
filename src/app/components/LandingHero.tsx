'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   Shared card shell — multi-layer shadow, bright-top border, high-opacity glass
───────────────────────────────────────────────────────────────────────────── */
const cardShell: React.CSSProperties = {
  background: 'rgba(255,255,255,0.94)',
  backdropFilter: 'blur(32px) saturate(170%)',
  WebkitBackdropFilter: 'blur(32px) saturate(170%)',
  borderRadius: 18,
  border: '1px solid rgba(10,17,40,0.07)',
  /* top-edge bright highlight gives the "lifted glass" effect */
  boxShadow: [
    '0 1px 0 rgba(255,255,255,0.95) inset',      /* top edge highlight  */
    '0 1px 2px rgba(10,17,40,0.04)',               /* contact shadow      */
    '0 4px 12px rgba(10,17,40,0.05)',              /* close penumbra      */
    '0 16px 40px rgba(10,17,40,0.08)',             /* medium ambient      */
    '0 36px 64px rgba(10,17,40,0.05)',             /* far diffuse         */
  ].join(', '),
};

/* Label used across all three cards */
function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 8.5, fontWeight: 900, letterSpacing: '.28em',
      textTransform: 'uppercase', color: 'rgba(10,17,40,0.38)',
    }}>
      {children}
    </span>
  );
}

/* Thin horizontal divider */
function Divider() {
  return <div style={{ height: 1, background: 'rgba(10,17,40,0.055)', margin: '12px 0' }} />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 1 — Morning Digest
───────────────────────────────────────────────────────────────────────────── */
function DigestCard({ liveTime }: { liveTime: string }) {
  return (
    <div style={{ ...cardShell, width: 268, padding: '18px 20px' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 7,
            background: 'linear-gradient(135deg,rgba(212,175,55,.18),rgba(212,175,55,.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
          }}>☀</div>
          <CardLabel>Morning Digest</CardLabel>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#D4AF37', fontVariantNumeric: 'tabular-nums' }}>
          {liveTime || '08:43 AM'}
        </span>
      </div>

      {/* Full-width gold gradient rule */}
      <div style={{
        height: 1.5, borderRadius: 1,
        background: 'linear-gradient(to right, #D4AF37, rgba(212,175,55,0))',
        opacity: .45, marginBottom: 14,
      }} />

      {/* Metric chips */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: '3 Tasks',  color: '#3E4A89', bg: 'rgba(62,74,137,0.08)'   },
          { label: 'AI Ready', color: '#92720c', bg: 'rgba(212,175,55,0.12)'  },
          { label: '2 Updates',color: '#047857', bg: 'rgba(16,185,129,0.08)'  },
        ].map(({ label, color, bg }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 9px', borderRadius: 7, background: bg,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
          </div>
        ))}
      </div>

      <Divider />

      {/* Priority highlight block */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'stretch',
        padding: '10px 11px', borderRadius: 10,
        background: 'rgba(10,17,40,0.025)',
        border: '1px solid rgba(10,17,40,0.05)', marginBottom: 14,
      }}>
        {/* Gold left accent bar */}
        <div style={{ width: 3, borderRadius: 2, background: '#D4AF37', opacity: .8, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(10,17,40,0.32)', marginBottom: 4 }}>
            Priority
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(10,17,40,0.86)', lineHeight: 1.38 }}>
            Review LMS integration proposal
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(10,17,40,0.36)', marginTop: 3 }}>
            Due today · Assigned to you
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#D4AF37', letterSpacing: '.14em', textTransform: 'uppercase' }}>
          View Full Digest
        </span>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'rgba(212,175,55,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#b8922e', fontWeight: 700 }}>→</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 2 — Embedded AI  (largest card, center-right)
───────────────────────────────────────────────────────────────────────────── */
function AICard({ dotCount }: { dotCount: number }) {
  return (
    <div style={{ ...cardShell, width: 316, padding: '18px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #0A1128 0%, #1E2E5C 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(10,17,40,0.2)',
        }}>
          <span style={{ color: '#D4AF37', fontSize: 10, fontWeight: 900, letterSpacing: '-.02em' }}>AI</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1128', letterSpacing: '-.01em' }}>Embedded AI</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {/* Live green dot */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: '#10b981',
              boxShadow: '0 0 0 2px rgba(16,185,129,0.2)',
            }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              Active Session
            </span>
          </div>
        </div>
        {/* Typing indicator dots */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: i < dotCount ? '#D4AF37' : 'rgba(10,17,40,0.10)',
              transition: 'background .22s ease',
            }} />
          ))}
        </div>
      </div>

      <Divider />

      {/* User message */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        {/* User avatar */}
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #3E4A89, #2A3568)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 8, fontWeight: 900, color: '#fff' }}>JM</span>
        </div>
        <div style={{
          flex: 1, padding: '9px 12px',
          background: 'rgba(10,17,40,0.04)', borderRadius: '4px 12px 12px 12px',
          border: '1px solid rgba(10,17,40,0.05)',
        }}>
          <p style={{ fontSize: 11.5, color: 'rgba(10,17,40,0.6)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
            "Summarize yesterday's curriculum discussion..."
          </p>
        </div>
      </div>

      {/* AI response bubble */}
      <div style={{
        padding: '12px 14px', marginBottom: 11,
        background: 'linear-gradient(135deg, #0A1128 0%, #141d38 100%)',
        borderRadius: '12px 12px 12px 4px',
        boxShadow: '0 4px 16px rgba(10,17,40,0.16)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 7, fontWeight: 900, color: '#D4AF37' }}>AI</span>
          </div>
          <span style={{ fontSize: 8, fontWeight: 800, color: 'rgba(212,175,55,0.6)', letterSpacing: '.2em', textTransform: 'uppercase' }}>
            EduTechEx AI
          </span>
        </div>
        <p style={{ fontSize: 11.5, color: 'rgba(249,248,246,0.82)', lineHeight: 1.6, margin: '0 0 8px' }}>
          The team aligned on <span style={{ color: '#D4AF37', fontWeight: 600 }}>3 key areas</span>:
        </p>
        {['LMS integration roadmap', 'Assessment redesign framework', 'Q3 launch timeline'].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: i < 2 ? 5 : 0 }}>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(212,175,55,0.5)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(249,248,246,0.65)' }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Source chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(10,17,40,0.32)' }}>3 sources</span>
        {['#general', '#curriculum', '#planning'].map(ch => (
          <div key={ch} style={{
            padding: '2px 7px', borderRadius: 5,
            background: 'rgba(62,74,137,0.07)', border: '1px solid rgba(62,74,137,0.1)',
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(62,74,137,0.7)' }}>{ch}</span>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px 8px 14px',
        background: 'rgba(10,17,40,0.03)',
        borderRadius: 10, border: '1px solid rgba(10,17,40,0.07)',
      }}>
        <span style={{ flex: 1, fontSize: 11.5, color: 'rgba(10,17,40,0.24)', fontWeight: 400 }}>
          Ask anything about your workspace…
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: '#D4AF37', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
        }}>
          <span style={{ color: '#0A1128', fontSize: 13, fontWeight: 900, lineHeight: 1 }}>↑</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 3 — Auto-extracted Tasks
───────────────────────────────────────────────────────────────────────────── */
function TasksCard() {
  const tasks = [
    { text: 'Review LMS proposal',   done: false, priority: 'HIGH', priorityColor: '#dc2626', priorityBg: 'rgba(220,38,38,0.08)' },
    { text: 'Update curriculum doc', done: true,  priority: null,   priorityColor: '',         priorityBg: '' },
    { text: 'Schedule AI demo',      done: false, priority: 'MED',  priorityColor: '#d97706', priorityBg: 'rgba(217,119,6,0.08)' },
  ];
  const done = tasks.filter(t => t.done).length;

  return (
    <div style={{ ...cardShell, width: 248, padding: '18px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <CardLabel>Auto-extracted Tasks</CardLabel>
        <div style={{
          padding: '3px 8px', borderRadius: 20,
          background: 'rgba(10,17,40,0.06)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4AF37' }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(10,17,40,0.55)' }}>3 new</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(10,17,40,0.35)' }}>Completion</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(10,17,40,0.5)' }}>{done}/{tasks.length}</span>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: 'rgba(10,17,40,0.07)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${(done / tasks.length) * 100}%`,
            background: 'linear-gradient(to right, #D4AF37, #c9a227)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      <Divider />

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
        {tasks.map((task, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {/* Checkbox */}
            <div style={{
              width: 17, height: 17, borderRadius: 5, flexShrink: 0,
              border: task.done ? 'none' : '1.5px solid rgba(10,17,40,0.18)',
              background: task.done ? '#D4AF37' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: task.done ? '0 1px 4px rgba(212,175,55,0.3)' : 'none',
            }}>
              {task.done && (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5 8.5 2.5" stroke="#0A1128" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            {/* Task text */}
            <span style={{
              flex: 1, fontSize: 12, fontWeight: task.done ? 400 : 500,
              color: task.done ? 'rgba(10,17,40,0.28)' : 'rgba(10,17,40,0.82)',
              textDecoration: task.done ? 'line-through' : 'none',
              lineHeight: 1.3,
            }}>
              {task.text}
            </span>
            {/* Priority badge */}
            {task.priority && (
              <div style={{
                padding: '2px 6px', borderRadius: 5,
                background: task.priorityBg, flexShrink: 0,
              }}>
                <span style={{ fontSize: 8.5, fontWeight: 800, color: task.priorityColor, letterSpacing: '.08em' }}>
                  {task.priority}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Divider />

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#D4AF37', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Assign All
        </span>
        <div style={{ display: 'flex', gap: -4 }}>
          {['JM', 'AK', '+2'].map((init, i) => (
            <div key={init} style={{
              width: 20, height: 20, borderRadius: '50%',
              background: i === 2 ? 'rgba(10,17,40,0.08)' : `hsl(${i * 60 + 220},45%,52%)`,
              border: '1.5px solid rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: i === 0 ? 0 : -5, zIndex: 3 - i,
            }}>
              <span style={{ fontSize: 7, fontWeight: 900, color: i === 2 ? 'rgba(10,17,40,0.5)' : '#fff' }}>
                {init}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN HERO
───────────────────────────────────────────────────────────────────────────── */
export default function LandingHero() {
  const [dotCount, setDotCount] = useState(1);
  const [liveTime, setLiveTime] = useState('');

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setLiveTime(fmt());
    const tId = setInterval(() => setLiveTime(fmt()), 60_000);
    const dId = setInterval(() => setDotCount(d => (d >= 3 ? 1 : d + 1)), 600);
    return () => { clearInterval(tId); clearInterval(dId); };
  }, []);

  return (
    <section className="relative w-full min-h-screen flex overflow-hidden">
      <style>{`
        .hero-diag {
          clip-path: polygon(0 0, 100% 0, 87% 100%, 0 100%);
        }
        @media (max-width: 1023px) {
          .hero-diag { clip-path: none; width: 100%; }
        }

        @keyframes fa {
          0%,100% { transform: translateY(0px) rotate(-1.5deg); }
          50%      { transform: translateY(-16px) rotate(0.5deg); }
        }
        @keyframes fb {
          0%,100% { transform: translateY(0px) rotate(1.2deg); }
          50%      { transform: translateY(-20px) rotate(-0.4deg); }
        }
        @keyframes fc {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-12px) rotate(0.8deg); }
        }
        @keyframes glow-p {
          0%,100% { opacity: .10; }
          50%      { opacity: .22; }
        }
        @keyframes rh-in {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .rh { opacity: 0; animation: rh-in 1s cubic-bezier(.19,1,.22,1) forwards; }
        .d1 { animation-delay: 80ms; }
        .d2 { animation-delay: 220ms; }
        .d3 { animation-delay: 380ms; }
        .d4 { animation-delay: 540ms; }
        .d5 { animation-delay: 720ms; }
        .d6 { animation-delay: 900ms; }

        .cta-gold {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px 30px; background: #D4AF37; color: #0A1128;
          font-size: 10px; font-weight: 900; letter-spacing: .26em; text-transform: uppercase;
          text-decoration: none; border-radius: 4px;
          transition: box-shadow .3s, transform .2s;
        }
        .cta-gold:hover {
          box-shadow: 0 0 28px rgba(212,175,55,.4), 0 4px 16px rgba(212,175,55,.2);
          transform: translateY(-1px);
        }
        .cta-outline {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 14px 28px;
          border: 1px solid rgba(212,175,55,.22); color: rgba(249,248,246,.45);
          font-size: 10px; font-weight: 800; letter-spacing: .26em; text-transform: uppercase;
          text-decoration: none; border-radius: 4px;
          transition: border-color .3s, color .3s;
        }
        .cta-outline:hover {
          border-color: rgba(212,175,55,.55);
          color: rgba(249,248,246,.82);
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════
          LEFT — Deep Navy diagonal panel
      ════════════════════════════════════════════════════════ */}
      <div
        className="hero-diag relative lg:w-[54%] bg-[#0A1128] z-10 flex flex-col
                   justify-center px-10 md:px-16 lg:px-20 xl:px-28 py-32 min-h-screen"
      >
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(212,175,55,.09) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />

        {/* Ambient gold orb */}
        <div className="absolute pointer-events-none" style={{
          width: 560, height: 560, top: '-18%', left: '-14%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,.08) 0%, transparent 65%)',
          filter: 'blur(72px)', animation: 'glow-p 8s ease-in-out infinite',
        }} />
        <div className="absolute pointer-events-none" style={{
          width: 360, height: 360, bottom: '0%', right: '5%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(62,74,137,.07) 0%, transparent 65%)',
          filter: 'blur(56px)', animation: 'glow-p 12s ease-in-out infinite 3s',
        }} />

        {/* Corner ring ornaments */}
        <div className="absolute top-0 right-0 hidden lg:block overflow-hidden"
          style={{ width: 260, height: 260 }}>
          {[220, 155, 90].map((s, i) => (
            <div key={s} className="absolute rounded-full" style={{
              width: s, height: s, top: -s / 2, right: -s / 2,
              border: `1px solid rgba(212,175,55,${0.13 - i * 0.04})`,
            }} />
          ))}
        </div>

        {/* Thin vertical accent */}
        <div className="absolute left-[8.5%] top-[22%] bottom-[22%] hidden xl:block" style={{
          width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,.10) 35%, rgba(212,175,55,.10) 65%, transparent)',
        }} />

        {/* ── Content ──────────────────────────────────────── */}
        <div className="relative" style={{ maxWidth: 530 }}>

          {/* Logo + label */}
          <div className="rh d1 flex items-center gap-3 mb-10">
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: '#D4AF37', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(212,175,55,0.3)',
            }}>
              <span style={{ color: '#0A1128', fontSize: 10, fontWeight: 900 }}>EX</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.38em', textTransform: 'uppercase', color: 'rgba(212,175,55,.52)' }}>
              Institutional Operating System
            </span>
          </div>

          {/* Gold rule */}
          <div className="rh d1 mb-8" style={{ width: 52, height: 2, background: '#D4AF37', opacity: .65, borderRadius: 1 }} />

          {/* Serif heading */}
          <h1 className="rh d2 text-white" style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.7rem, 4.5vw, 4.9rem)',
            fontWeight: 700, lineHeight: 1.06,
            letterSpacing: '-.02em', marginBottom: '2rem', maxWidth: '13ch',
          }}>
            The Team OS{' '}
            <em style={{ color: '#D4AF37', fontWeight: 400 }}>EduTechEx</em>{' '}
            Runs&nbsp;On.
          </h1>

          {/* Tracked sub-label */}
          <div className="rh d2 flex items-center gap-3 mb-6">
            <div style={{ flexShrink: 0, width: 26, height: 1, background: 'rgba(212,175,55,.4)' }} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(212,175,55,.48)' }}>
              Channels · AI · Tasks · Digests
            </span>
          </div>

          {/* Description */}
          <p className="rh d3" style={{
            fontSize: '1rem', fontWeight: 400, lineHeight: 1.8,
            color: 'rgba(249,248,246,.44)', maxWidth: '37ch', marginBottom: '2.6rem',
          }}>
            All the context your team needs — channels, embedded AI,
            auto&#8209;extracted tasks, and morning digests — without the noise.
          </p>

          {/* CTA Row */}
          <div className="rh d4 flex flex-col sm:flex-row gap-3" style={{ marginBottom: '2.6rem' }}>
            <Link href="/sign-up-login-screen?mode=user" className="cta-gold">
              Enter System
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a href="#features" className="cta-outline">Explore Features</a>
          </div>

          {/* Social proof */}
          <div className="rh d5 flex items-center gap-4">
            <div style={{ display: 'flex' }}>
              {['dean1', 'tech2', 'admin3', 'fac4'].map((u, i) => (
                <img key={u} src={`https://i.pravatar.cc/40?u=${u}`} alt=""
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: '2px solid #0A1128', marginLeft: i === 0 ? 0 : -9,
                  }} />
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(249,248,246,.78)' }}>14 members active</div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(212,175,55,.48)' }}>
                Verified Institutional Access
              </div>
            </div>
          </div>
        </div>

        {/* Version watermark */}
        <div className="rh d6 absolute bottom-8 hidden lg:block" style={{ left: 'clamp(40px, 10vw, 112px)' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.30em', textTransform: 'uppercase', color: 'rgba(212,175,55,.22)' }}>
            v2.4.0 · Secured · Institutional Grade
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          RIGHT — Bone White + Floating Product Cards
      ════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex relative flex-1 bg-[#F9F8F6] overflow-hidden">

        {/* Fine dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(10,17,40,.042) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {/* Gold ambient glow */}
        <div className="absolute pointer-events-none" style={{
          width: 520, height: 520, top: '5%', left: '8%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,.065) 0%, transparent 65%)',
          filter: 'blur(72px)', animation: 'glow-p 10s ease-in-out infinite 2s',
        }} />

        {/* Left-edge accent rule */}
        <div className="absolute left-0 top-[18%] bottom-[18%]" style={{
          width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,.12) 40%, rgba(212,175,55,.12) 60%, transparent)',
        }} />

        {/* ── Floating card stage ────────────────────────── */}
        <div className="relative w-full h-full">

          {/* CARD 1 — Morning Digest : top-left */}
          <div style={{
            position: 'absolute', top: '7%', left: '5%',
            animation: 'fa 7s ease-in-out infinite',
            filter: 'drop-shadow(0 8px 24px rgba(10,17,40,0.06))',
          }}>
            <DigestCard liveTime={liveTime} />
          </div>

          {/* CARD 2 — Embedded AI : center-right (largest, most prominent) */}
          <div style={{
            position: 'absolute', top: '24%', right: '4%',
            animation: 'fb 9s ease-in-out infinite 1.5s',
            filter: 'drop-shadow(0 12px 36px rgba(10,17,40,0.08))',
          }}>
            <AICard dotCount={dotCount} />
          </div>

          {/* CARD 3 — Tasks : bottom-left */}
          <div style={{
            position: 'absolute', bottom: '7%', left: '10%',
            animation: 'fc 6.5s ease-in-out infinite 0.8s',
            filter: 'drop-shadow(0 8px 20px rgba(10,17,40,0.06))',
          }}>
            <TasksCard />
          </div>

          {/* Decorative gold dot matrix */}
          <div style={{
            position: 'absolute', top: '58%', left: '50%',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7,
          }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                width: 3.5, height: 3.5, borderRadius: '50%',
                background: `rgba(212,175,55,${0.07 + (i % 3) * 0.08})`,
              }} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
