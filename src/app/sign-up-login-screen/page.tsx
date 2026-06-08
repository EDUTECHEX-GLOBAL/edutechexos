'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import AuthCard from './components/AuthCard';

export default function AuthPage() {
  return (
    <div
      className="w-full min-h-screen overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif", background: '#F9F8F6' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        /* ── Diagonal split ────────────────────────────── */
        .auth-diag {
          clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%);
        }
        @media (max-width: 1023px) {
          .auth-diag { clip-path: none; width: 100%; min-height: 340px; }
        }

        /* ── Animations ─────────────────────────────────── */
        @keyframes glow-p { 0%,100%{opacity:.10} 50%{opacity:.22} }
        @keyframes rh-in  {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes form-in {
          from { opacity:0; transform:translateY(16px) scale(.99); }
          to   { opacity:1; transform:translateY(0)   scale(1); }
        }

        .rh  { opacity:0; animation: rh-in 1s cubic-bezier(.19,1,.22,1) forwards; }
        .d1  { animation-delay: 100ms; }
        .d2  { animation-delay: 260ms; }
        .d3  { animation-delay: 420ms; }
        .d4  { animation-delay: 580ms; }
        .d5  { animation-delay: 760ms; }

        .form-reveal { animation: form-in 0.9s cubic-bezier(.19,1,.22,1) forwards; animation-delay:200ms; opacity:0; }

        /* ── Focus glow on inputs (referenced in LoginForm) ─ */
        .input-ivy:focus {
          border-color: #D4AF37 !important;
          box-shadow: 0 0 0 2px rgba(212,175,55,.15) !important;
          outline: none;
          background: #fff !important;
        }

        /* ── Watermark text ─────────────────────────────── */
        .watermark {
          font-family: 'Playfair Display', serif;
          font-size: clamp(80px, 16vw, 160px);
          font-weight: 900;
          color: rgba(10,17,40,.03);
          letter-spacing: -.04em;
          user-select: none;
          pointer-events: none;
          white-space: nowrap;
        }
      `}</style>

      <main className="relative w-full min-h-screen flex flex-col lg:flex-row overflow-hidden">

        {/* ══════════════════════════════════════════════════
            LEFT — Deep Navy Brand Panel
        ══════════════════════════════════════════════════ */}
        <section
          className="auth-diag relative lg:w-[44%] bg-[#0A1128] z-10 flex flex-col justify-center px-10 md:px-14 lg:px-20 xl:px-24 py-20 lg:py-0 min-h-[380px] lg:min-h-screen"
        >
          {/* Dot grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(rgba(212,175,55,.09) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />

          {/* Gold ambient orb — top left */}
          <div className="absolute pointer-events-none" style={{
            width: 500, height: 500, top: '-15%', left: '-12%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,.09) 0%, transparent 65%)',
            filter: 'blur(70px)', animation: 'glow-p 8s ease-in-out infinite',
          }} />
          {/* Indigo orb — bottom right */}
          <div className="absolute pointer-events-none" style={{
            width: 380, height: 380, bottom: '-8%', right: '0%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(62,74,137,.07) 0%, transparent 65%)',
            filter: 'blur(60px)', animation: 'glow-p 11s ease-in-out infinite 2s',
          }} />

          {/* Corner rings */}
          <div className="absolute top-0 right-0 hidden lg:block overflow-hidden"
            style={{ width: 240, height: 240 }}>
            {[200, 140, 80].map((s, i) => (
              <div key={s} className="absolute rounded-full" style={{
                width: s, height: s, top: -s / 2, right: -s / 2,
                border: `1px solid rgba(212,175,55,${0.13 - i * 0.04})`,
              }} />
            ))}
          </div>

          {/* ── Content ──────────────────────────────────── */}
          <div className="relative max-w-md">

            {/* Logo nav */}
            <Link href="/" className="rh d1 flex items-center gap-3 no-underline mb-12 w-fit group">
              <div style={{
                width: 40, height: 40, borderRadius: 8, background: '#D4AF37',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(212,175,55,.25)',
                transition: 'transform .3s', flexShrink: 0,
              }}
                className="group-hover:scale-105">
                <span style={{ color: '#0A1128', fontSize: 13, fontWeight: 900 }}>EX</span>
              </div>
              <div>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-.01em',
                }}>
                  EduTechEx<span style={{ color: '#D4AF37' }}>OS</span>
                </span>
                <span style={{
                  display: 'block', fontSize: 8, fontWeight: 800,
                  letterSpacing: '.38em', textTransform: 'uppercase', color: 'rgba(212,175,55,.45)',
                  marginTop: 2,
                }}>
                  Institutional Portal
                </span>
              </div>
            </Link>

            {/* Gold rule */}
            <div className="rh d1 mb-8" style={{ width: 48, height: 2, background: '#D4AF37', opacity: .65 }} />

            {/* Serif heading */}
            <h1
              className="rh d2 text-white"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(2.4rem, 4vw, 4.2rem)',
                fontWeight: 700, lineHeight: 1.08,
                letterSpacing: '-.02em', marginBottom: '1.8rem',
                maxWidth: '12ch',
              }}
            >
              Return to{' '}
              <br />
              <em style={{ color: '#D4AF37', fontWeight: 400 }}>Excellence.</em>
            </h1>

            {/* Sub-label */}
            <div className="rh d2 flex items-center gap-3 mb-7">
              <div style={{ flexShrink: 0, width: 22, height: 1, background: 'rgba(212,175,55,.4)' }} />
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase',
                color: 'rgba(212,175,55,.46)',
              }}>
                Secure Institutional Access
              </span>
            </div>

            {/* Body copy */}
            <p className="rh d3" style={{
              fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.78,
              color: 'rgba(249,248,246,.42)', maxWidth: '34ch', marginBottom: '2.8rem',
            }}>
              Enter the secure gateway of EduTechEx. Continue your journey in developing
              world-class curriculum and academic intelligence.
            </p>

          </div>

        </section>

        {/* ══════════════════════════════════════════════════
            RIGHT — Bone White Form Panel
        ══════════════════════════════════════════════════ */}
        <section className="relative flex-1 bg-[#F9F8F6] flex flex-col overflow-y-auto min-h-screen lg:h-screen">

          {/* Paper texture overlay */}
          <div className="absolute inset-0 opacity-[.025] pointer-events-none" style={{
            backgroundImage: "url('https://www.transparenttextures.com/patterns/natural-paper.png')",
          }} />

          {/* Dot grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(rgba(10,17,40,.04) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

          {/* Gold ambient glow */}
          <div className="absolute pointer-events-none" style={{
            width: 420, height: 420, top: '8%', right: '10%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,.06) 0%, transparent 65%)',
            filter: 'blur(64px)',
          }} />

          {/* Large watermark lettering */}
          <div className="absolute bottom-20 left-0 right-0 flex justify-center overflow-hidden">
            <span className="watermark">EduTechEx</span>
          </div>

          {/* ── Back to Home button ───────────────────────── */}
          <div className="absolute top-6 left-6 z-20">
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(10,17,40,0.08)',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(10,17,40,0.6)',
                textDecoration: 'none',
                boxShadow: '0 2px 12px rgba(10,17,40,0.06)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = '#D4AF37';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(212,175,55,0.35)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(212,175,55,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(10,17,40,0.6)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(10,17,40,0.08)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 12px rgba(10,17,40,0.06)';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M13 8H3M7 4l-4 4 4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Home
            </Link>
          </div>

          {/* ── Centered Form Card ────────────────────────── */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 lg:py-20 z-10">

            {/* Glassmorphism card wrapper */}
            <div
              className="form-reveal w-full"
              style={{
                maxWidth: 480,
                background: 'rgba(255,255,255,.82)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,.95)',
                borderRadius: 20,
                boxShadow: '0 24px 72px rgba(10,17,40,.09), 0 1px 0 rgba(255,255,255,1) inset',
                padding: 'clamp(28px, 5vw, 44px)',
              }}
            >
              {/* Card header */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ width: 36, height: 2, background: '#D4AF37', opacity: .7, marginBottom: 16 }} />
                <h2 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                  fontWeight: 700, color: '#0A1128',
                  letterSpacing: '-.02em', lineHeight: 1.12,
                  marginBottom: 8,
                }}>
                  Sign in to your
                  <em style={{ color: '#D4AF37', fontWeight: 400 }}> workspace</em>
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(10,17,40,.4)', fontWeight: 400, lineHeight: 1.6 }}>
                  Use your institutional credentials to continue.
                </p>
              </div>

              {/* Auth form (tab switcher + login/signup) */}
              <Suspense fallback={
                <div className="text-center py-10">
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: '2px solid rgba(10,17,40,.08)',
                    borderTopColor: '#D4AF37',
                    margin: '0 auto 12px',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <span style={{ fontSize: 11, color: 'rgba(10,17,40,.4)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                    Loading portal…
                  </span>
                </div>
              }>
                <AuthCard />
              </Suspense>
            </div>

            {/* Below-card footnote */}
            <p style={{
              fontSize: 11, color: 'rgba(10,17,40,.28)', textAlign: 'center',
              marginTop: 24, lineHeight: 1.6,
            }}>
              Protected by institutional-grade encryption.{' '}
              <Link href="/" style={{ color: '#D4AF37', fontWeight: 700, textDecoration: 'none' }}>
                ← Back to home
              </Link>
            </p>
          </div>

          {/* ── Trusted Partners Ticker ────────────────────── */}
          <div className="relative z-10 w-full py-5 bg-white/40 backdrop-blur-sm border-t border-[#0A1128]/5 overflow-hidden">
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <span style={{
                fontSize: 8, fontWeight: 900, letterSpacing: '.45em', textTransform: 'uppercase',
                color: 'rgba(10,17,40,.26)',
              }}>
                Trusted Academic Partners
              </span>
            </div>
            <div style={{ display: 'flex', overflow: 'hidden' }}>
              <div style={{
                display: 'flex', width: 'fit-content', alignItems: 'center', gap: 40,
                animation: 'ticker 32s linear infinite',
              }}>
                {[...Array(2)].map((_, rep) => (
                  <div key={rep} style={{ display: 'flex', alignItems: 'center', gap: 40, paddingRight: 40 }}>
                    {['Oxford', 'Harvard', 'Cambridge', 'Princeton', 'Stanford', 'MIT', 'Yale', 'LSE'].map(name => (
                      <span key={name} style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase',
                        color: 'rgba(10,17,40,.2)', whiteSpace: 'nowrap',
                        fontFamily: "'Playfair Display', serif",
                      }}>
                        {name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
