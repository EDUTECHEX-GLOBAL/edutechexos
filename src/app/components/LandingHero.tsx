'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingHero() {
  const [dotCount, setDotCount]   = useState(1);
  const [liveTime, setLiveTime]   = useState('');

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

        @keyframes fa { 0%,100%{transform:translateY(0) rotate(-1.2deg)} 50%{transform:translateY(-16px) rotate(0.4deg)} }
        @keyframes fb { 0%,100%{transform:translateY(0) rotate(1deg)}   50%{transform:translateY(-20px) rotate(-0.6deg)} }
        @keyframes fc { 0%,100%{transform:translateY(0) rotate(-0.6deg)} 50%{transform:translateY(-12px) rotate(0.8deg)} }

        @keyframes glow-p { 0%,100%{opacity:.10} 50%{opacity:.22} }
        @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

        @keyframes rh-in {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .rh { opacity:0; animation: rh-in 1s cubic-bezier(.19,1,.22,1) forwards; }
        .d1 { animation-delay:  80ms; }
        .d2 { animation-delay: 220ms; }
        .d3 { animation-delay: 380ms; }
        .d4 { animation-delay: 540ms; }
        .d5 { animation-delay: 720ms; }
        .d6 { animation-delay: 900ms; }

        .cta-gold {
          display:inline-flex; align-items:center; justify-content:center; gap:10px;
          padding:14px 30px; background:#D4AF37; color:#0A1128;
          font-size:10px; font-weight:900; letter-spacing:.26em; text-transform:uppercase;
          text-decoration:none; border-radius:3px;
          transition:box-shadow .3s, transform .2s;
        }
        .cta-gold:hover { box-shadow:0 0 28px rgba(212,175,55,.35); transform:translateY(-1px); }

        .cta-outline {
          display:inline-flex; align-items:center; justify-content:center;
          padding:14px 28px;
          border:1px solid rgba(212,175,55,.22); color:rgba(249,248,246,.45);
          font-size:10px; font-weight:800; letter-spacing:.26em; text-transform:uppercase;
          text-decoration:none; border-radius:3px;
          transition:border-color .3s, color .3s;
        }
        .cta-outline:hover { border-color:rgba(212,175,55,.5); color:rgba(249,248,246,.8); }

        .glass-card {
          background:rgba(255,255,255,.8);
          backdrop-filter:blur(22px);
          -webkit-backdrop-filter:blur(22px);
          border:1px solid rgba(255,255,255,.92);
          box-shadow:0 12px 44px rgba(10,17,40,.09), 0 1px 0 rgba(255,255,255,1) inset;
        }
        .glass-card-gold {
          background:rgba(255,255,255,.76);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(212,175,55,.18);
          box-shadow:0 10px 36px rgba(10,17,40,.08), 0 1px 0 rgba(255,255,255,.9) inset;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          LEFT — Deep Navy diagonal panel
      ══════════════════════════════════════════════════════ */}
      <div
        className="hero-diag relative lg:w-[54%] bg-[#0A1128] z-10 flex flex-col justify-center
                   px-10 md:px-16 lg:px-20 xl:px-28 py-32 min-h-screen"
      >
        {/* Dot-grid overlay */}
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
          background: 'radial-gradient(circle, rgba(62,74,137,.06) 0%, transparent 65%)',
          filter: 'blur(56px)', animation: 'glow-p 12s ease-in-out infinite 3s',
        }} />

        {/* Corner ring ornaments — top-right */}
        <div className="absolute top-0 right-0 hidden lg:block overflow-hidden"
          style={{ width: 260, height: 260 }}>
          {[220, 155, 90].map((s, i) => (
            <div key={s} className="absolute rounded-full" style={{
              width: s, height: s, top: -s / 2, right: -s / 2,
              border: `1px solid rgba(212,175,55,${0.13 - i * 0.04})`,
            }} />
          ))}
        </div>

        {/* Thin vertical accent line */}
        <div className="absolute left-[8.5%] top-[22%] bottom-[22%] hidden xl:block" style={{
          width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,.10) 35%, rgba(212,175,55,.10) 65%, transparent)',
        }} />

        {/* ── CONTENT ─────────────────────────────────────── */}
        <div className="relative" style={{ maxWidth: 530 }}>

          {/* Logo + label row */}
          <div className="rh d1 flex items-center gap-3 mb-10">
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: '#D4AF37', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#0A1128', fontSize: 10, fontWeight: 900, letterSpacing: '-.03em' }}>EX</span>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '.38em', textTransform: 'uppercase',
              color: 'rgba(212,175,55,.52)',
            }}>
              Institutional Operating System
            </span>
          </div>

          {/* Gold rule */}
          <div className="rh d1 mb-8" style={{ width: 54, height: 2, background: '#D4AF37', opacity: .65 }} />

          {/* Main serif heading */}
          <h1
            className="rh d2 text-white"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(2.7rem, 4.5vw, 4.9rem)',
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: '-.02em',
              marginBottom: '2rem',
              maxWidth: '13ch',
            }}
          >
            The Team OS{' '}
            <em style={{ color: '#D4AF37', fontWeight: 400 }}>EduTechEx</em>{' '}
            Runs&nbsp;On.
          </h1>

          {/* Gold tracked sub-label */}
          <div className="rh d2 flex items-center gap-3 mb-6">
            <div style={{ flexShrink: 0, width: 26, height: 1, background: 'rgba(212,175,55,.4)' }} />
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase',
              color: 'rgba(212,175,55,.48)',
            }}>
              Channels · AI · Tasks · Digests
            </span>
          </div>

          {/* Description */}
          <p className="rh d3" style={{
            fontSize: '1rem', fontWeight: 400, lineHeight: 1.8,
            color: 'rgba(249,248,246,.45)', maxWidth: '37ch', marginBottom: '2.6rem',
          }}>
            All the context your team needs — channels, embedded AI,
            auto&#8209;extracted tasks, and morning digests — without the noise.
          </p>

          {/* CTA Row */}
          <div className="rh d4 flex flex-col sm:flex-row gap-3" style={{ marginBottom: '2.6rem' }}>
            <Link href="/sign-up-login-screen?mode=user" className="cta-gold">
              Enter System
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
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
                    border: '2px solid #0A1128',
                    marginLeft: i === 0 ? 0 : -9,
                  }} />
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(249,248,246,.78)' }}>
                14 members active
              </div>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase',
                color: 'rgba(212,175,55,.48)',
              }}>
                Verified Institutional Access
              </div>
            </div>
          </div>
        </div>

        {/* Version watermark */}
        <div className="rh d6 absolute bottom-8"
          style={{ left: 'clamp(40px, 10vw, 112px)' }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.30em', textTransform: 'uppercase',
            color: 'rgba(212,175,55,.22)',
          }}>
            v2.4.0 · Secured · Institutional Grade
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT — Bone White + Glassmorphism Cards
      ══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex relative flex-1 bg-[#F9F8F6] overflow-hidden">

        {/* Dot grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(10,17,40,.05) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />

        {/* Ambient gold glow */}
        <div className="absolute pointer-events-none" style={{
          width: 500, height: 500, top: '5%', left: '10%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,.07) 0%, transparent 65%)',
          filter: 'blur(72px)', animation: 'glow-p 10s ease-in-out infinite 2s',
        }} />

        {/* Left-edge accent rule */}
        <div className="absolute left-0 top-[18%] bottom-[18%]" style={{
          width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,.12) 40%, rgba(212,175,55,.12) 60%, transparent)',
        }} />

        {/* ── FLOATING CARDS ─────────────────────────────── */}
        <div className="relative w-full h-full" style={{ padding: '5% 5%' }}>

          {/* ── Card 1: Morning Digest ── top-left */}
          <div
            className="glass-card-gold"
            style={{
              position: 'absolute', top: '9%', left: '5%',
              width: 252, borderRadius: 16, padding: '20px 22px',
              animation: 'fa 7s ease-in-out infinite',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(10,17,40,.42)' }}>
                Morning Digest
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#D4AF37', fontVariantNumeric: 'tabular-nums' }}>
                {liveTime || '8:00 AM'}
              </span>
            </div>
            <div style={{ width: 34, height: 1.5, background: '#D4AF37', opacity: .6, marginBottom: 14 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { text: '3 tasks auto-extracted', dot: '#3E4A89' },
                { text: 'AI summary is ready',   dot: '#D4AF37' },
                { text: '2 channels updated',    dot: '#10b981' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(30,38,54,.8)' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 13, borderTop: '1px solid rgba(10,17,40,.06)' }}>
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#D4AF37',
                letterSpacing: '.12em', textTransform: 'uppercase',
              }}>
                View Full Digest →
              </span>
            </div>
          </div>

          {/* ── Card 2: Embedded AI ── center-right (largest card) */}
          <div
            className="glass-card"
            style={{
              position: 'absolute', top: '23%', right: '4%',
              width: 314, borderRadius: 20, padding: '22px 24px',
              animation: 'fb 9s ease-in-out infinite 1.5s',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #0A1128, #1E2E5C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#D4AF37', fontSize: 11, fontWeight: 900 }}>AI</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0A1128', letterSpacing: '.04em' }}>Embedded AI</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#D4AF37', letterSpacing: '.18em', textTransform: 'uppercase' }}>Active Session</div>
              </div>
              {/* Animated dots */}
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: i < dotCount ? '#D4AF37' : 'rgba(10,17,40,.1)',
                    transition: 'background .25s',
                  }} />
                ))}
              </div>
            </div>

            {/* User bubble */}
            <div style={{
              background: 'rgba(10,17,40,.05)', borderRadius: '12px 12px 12px 4px',
              padding: '10px 14px', marginBottom: 10,
            }}>
              <p style={{ fontSize: 11, color: 'rgba(30,38,54,.7)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
                "Summarize yesterday's curriculum discussion..."
              </p>
            </div>

            {/* AI bubble */}
            <div style={{
              background: 'linear-gradient(135deg, #0A1128, #182040)',
              borderRadius: '4px 12px 12px 12px',
              padding: '11px 14px', marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, color: 'rgba(249,248,246,.88)', lineHeight: 1.65, margin: 0 }}>
                The team aligned on{' '}
                <span style={{ color: '#D4AF37', fontWeight: 600 }}>3 key areas</span>:
                LMS integration, assessment redesign, and the Q3 launch timeline...
              </p>
            </div>

            {/* Fake input bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', background: 'rgba(10,17,40,.04)',
              borderRadius: 8, border: '1px solid rgba(10,17,40,.07)',
            }}>
              <span style={{ fontSize: 11, color: 'rgba(10,17,40,.25)', flex: 1 }}>
                Ask anything about your workspace...
              </span>
              <div style={{
                width: 26, height: 26, borderRadius: 6, background: '#D4AF37', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#0A1128', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>↑</span>
              </div>
            </div>
          </div>

          {/* ── Card 3: Auto Tasks ── bottom-left */}
          <div
            className="glass-card-gold"
            style={{
              position: 'absolute', bottom: '8%', left: '9%',
              width: 234, borderRadius: 14, padding: '18px 20px',
              animation: 'fc 6.5s ease-in-out infinite 0.8s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(10,17,40,.42)' }}>
                Auto Tasks
              </span>
              <span style={{
                fontSize: 9, fontWeight: 800,
                background: 'rgba(10,17,40,.06)', color: 'rgba(10,17,40,.55)',
                padding: '2px 9px', borderRadius: 100,
              }}>
                3 extracted
              </span>
            </div>
            <div style={{ width: 34, height: 1.5, background: '#D4AF37', opacity: .6, marginBottom: 12 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[
                { text: 'Review LMS proposal',   done: false },
                { text: 'Update curriculum doc', done: true  },
                { text: 'Schedule AI demo',       done: false },
              ].map((task, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: task.done ? 'none' : '1.5px solid rgba(10,17,40,.18)',
                    background: task.done ? '#D4AF37' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {task.done && (
                      <span style={{ color: '#0A1128', fontSize: 9, fontWeight: 900 }}>✓</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: task.done ? 400 : 500,
                    color: task.done ? 'rgba(30,38,54,.3)' : 'rgba(30,38,54,.82)',
                    textDecoration: task.done ? 'line-through' : 'none',
                  }}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative gold dot cluster */}
          <div style={{
            position: 'absolute', top: '57%', left: '50%',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7,
          }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: `rgba(212,175,55,${0.08 + (i % 3) * 0.08})`,
              }} />
            ))}
          </div>
        </div>

        {/* ── Trusted By Ticker ───────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[#0A1128]/5
                        bg-white/45 backdrop-blur-sm overflow-hidden py-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 10 }}>
            <span style={{
              fontSize: 8, fontWeight: 900, letterSpacing: '.4em', textTransform: 'uppercase',
              color: 'rgba(10,17,40,.28)',
            }}>
              Trusted Academic Partners
            </span>
          </div>
          <div style={{ display: 'flex', overflow: 'hidden' }}>
            <div style={{ display: 'flex', width: 'fit-content', animation: 'ticker 30s linear infinite', alignItems: 'center', gap: 48 }}>
              {[...Array(2)].map((_, rep) => (
                <React.Fragment key={rep}>
                  {['Oxford', 'Harvard', 'Cambridge', 'Princeton', 'Stanford', 'MIT', 'Yale'].map(name => (
                    <span key={name} style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase',
                      color: 'rgba(10,17,40,.2)', whiteSpace: 'nowrap',
                      fontFamily: "'Playfair Display', serif",
                    }}>
                      {name}
                    </span>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
