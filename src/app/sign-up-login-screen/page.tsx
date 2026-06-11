'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import AuthCard from './components/AuthCard';

export default function AuthPage() {
  return (
    <div className="w-full min-h-screen overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: '#ECEAF8' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

        @keyframes auth-orb {
          0%,100% { opacity: .40; transform: scale(1); }
          50%      { opacity: .65; transform: scale(1.06); }
        }
        @keyframes auth-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes form-rise {
          from { opacity: 0; transform: translateY(16px) scale(.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes bubble-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.12); }
          70% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        @keyframes spectrum-flow {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }

        .auth-enter { opacity: 0; animation: auth-in 1s cubic-bezier(.19,1,.22,1) forwards; }
        .ae-1 { animation-delay: 80ms; }
        .ae-2 { animation-delay: 220ms; }
        .ae-3 { animation-delay: 380ms; }
        .ae-4 { animation-delay: 540ms; }
        .ae-5 { animation-delay: 720ms; }

        .form-rise { animation: form-rise 0.9s cubic-bezier(.19,1,.22,1) both; animation-delay: 200ms; opacity: 0; }

        /* Light inputs inside AuthCard */
        [data-auth-theme="light"] input[type="email"],
        [data-auth-theme="light"] input[type="password"],
        [data-auth-theme="light"] input[type="text"] {
          background: #FFFFFF !important;
          border: 1.5px solid rgba(26,27,58,0.24) !important;
          color: #1A1B3A !important;
          border-radius: 10px;
        }
        [data-auth-theme="light"] input::placeholder {
          color: rgba(90,95,128,0.45) !important;
        }
        [data-auth-theme="light"] input:focus {
          border-color: rgba(91,79,219,0.50) !important;
          box-shadow: 0 0 0 3px rgba(26,27,58,0.15) !important;
          outline: none !important;
        }
        [data-auth-theme="light"] label {
          color: #1A1B3A !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
        [data-auth-theme="light"] button[type="submit"],
        [data-auth-theme="light"] .btn-primary {
          background: linear-gradient(135deg, #5B4FDB 0%, #7B6FEB 100%) !important;
          color: #FFFFFF !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 16px rgba(91,79,219,0.28) !important;
        }
        [data-auth-theme="light"] button[type="submit"]:hover,
        [data-auth-theme="light"] .btn-primary:hover {
          background: linear-gradient(135deg, #4238C8 0%, #6B5FDB 100%) !important;
        }
        [data-auth-theme="light"] a { color: #5B4FDB !important; }
      `}</style>

      <main className="relative w-full min-h-screen flex flex-col lg:flex-row overflow-hidden">

        {/* ══════════════════════════════════════════════════
            LEFT — Vibrant brand panel
        ══════════════════════════════════════════════════ */}
        <section className="relative lg:w-[44%] flex flex-col justify-center px-10 md:px-14 lg:px-20 xl:px-24 py-20 lg:py-0 min-h-[360px] lg:min-h-screen overflow-hidden" style={{ background: 'linear-gradient(150deg, #5B4FDB 0%, #8B3FDB 55%, #C026D3 100%)' }}>

          {/* Mesh grid */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

          {/* Light orbs */}
          <div className="absolute pointer-events-none" style={{ width: 500, height: 500, top: '-15%', left: '-12%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 65%)', filter: 'blur(72px)', animation: 'auth-orb 9s ease-in-out infinite' }} />
          <div className="absolute pointer-events-none" style={{ width: 360, height: 360, bottom: '-8%', right: '0%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'auth-orb 12s ease-in-out infinite 2s' }} />

          {/* Corner rings */}
          <div className="absolute top-0 right-0 hidden lg:block overflow-hidden" style={{ width: 220, height: 220 }}>
            {[180, 120, 60].map((s, i) => (
              <div key={s} className="absolute rounded-full" style={{ width: s, height: s, top: -s / 2, right: -s / 2, border: `1px solid rgba(255,255,255,${0.12 - i * 0.03})` }} />
            ))}
          </div>

          {/* Spectrum bar at edge */}
          <div className="absolute top-0 right-0 bottom-0 pointer-events-none" style={{ width: 3, background: 'linear-gradient(180deg, rgba(255,255,255,0.40), rgba(255,255,255,0.10), rgba(255,255,255,0.40))' }} />

          {/* Content */}
          <div className="relative" style={{ maxWidth: 420 }}>
            {/* Logo */}
            <Link href="/" className="auth-enter ae-1 flex items-center gap-3 no-underline mb-12 w-fit group">
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.20)', border: '1.5px solid rgba(255,255,255,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', transition: 'transform .3s' }} className="group-hover:scale-105">
                <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 900 }}>EX</span>
              </div>
              <div>
                <span style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 19, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.025em' }}>
                  EduTechEx<span style={{ color: 'rgba(255,255,255,0.65)' }}>OS</span>
                </span>
                <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, letterSpacing: '.36em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.50)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Institutional Portal
                </span>
              </div>
            </Link>

            {/* White hairline */}
            <div className="auth-enter ae-1" style={{ maxWidth: 56, height: 2, background: 'rgba(255,255,255,0.40)', borderRadius: 1, marginBottom: '2rem' }} />

            {/* Headline */}
            <h1 className="auth-enter ae-2" style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.4rem, 4vw, 4rem)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.04em', color: '#FFFFFF', marginBottom: '1.6rem', maxWidth: '14ch' }}>
              Return to<br />
              <span style={{ color: 'rgba(255,255,255,0.60)' }}>Excellence.</span>
            </h1>

            {/* Sub-label */}
            <div className="auth-enter ae-2 flex items-center gap-3 mb-7">
              <div style={{ flexShrink: 0, width: 22, height: 1.5, background: 'rgba(255,255,255,0.40)', borderRadius: 1 }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.60)', fontFamily: "'JetBrains Mono', monospace" }}>
                Secure Institutional Access
              </span>
            </div>

            {/* Body */}
            <p className="auth-enter ae-3" style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.78, color: 'rgba(255,255,255,0.65)', maxWidth: '34ch', marginBottom: '2.4rem' }}>
              Enter the secure gateway of EduTechEx. Continue your journey developing world-class curriculum and academic intelligence.
            </p>

            {/* Status chips */}
            <div className="auth-enter ae-4 flex flex-wrap gap-3">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10C98A', boxShadow: '0 0 6px rgba(16,201,138,0.8)' }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.90)', fontFamily: "'JetBrains Mono', monospace" }}>System online</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)', backdropFilter: 'blur(8px)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.80)' }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.80)', fontFamily: "'JetBrains Mono', monospace" }}>11 members</span>
              </div>
            </div>

            {/* Feature mini-icons */}
            <div className="auth-enter ae-5 flex items-center gap-3 mt-10">
              {[
                { label: 'AI', color: '#FFFFFF', bg: 'rgba(255,255,255,0.15)' },
                { label: '≡', color: '#FFFFFF', bg: 'rgba(255,255,255,0.12)' },
                { label: '✓', color: '#FFFFFF', bg: 'rgba(255,255,255,0.12)' },
                { label: '◎', color: '#FFFFFF', bg: 'rgba(255,255,255,0.12)' },
              ].map(({ label, color, bg }) => (
                <div key={label} style={{ width: 32, height: 32, borderRadius: 8, background: bg, border: '1px solid rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color }}>
                  {label}
                </div>
              ))}
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>+ more</span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            RIGHT — Light elevated form panel
        ══════════════════════════════════════════════════ */}
        <section className="relative flex-1 flex flex-col overflow-y-auto min-h-screen lg:h-screen" style={{ background: '#FFFFFF' }}>

          {/* Subtle dot grid */}
          <div className="absolute inset-0 dot-grid pointer-events-none" />

          {/* Soft gradient */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 60% 30%, rgba(91,79,219,0.05) 0%, transparent 70%)' }} />

          {/* Large watermark */}
          <div className="absolute bottom-16 left-0 right-0 flex justify-center overflow-hidden pointer-events-none">
            <span style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(80px, 16vw, 160px)', fontWeight: 900, color: 'rgba(91,79,219,0.04)', letterSpacing: '-.04em', userSelect: 'none', whiteSpace: 'nowrap' }}>EduTechEx</span>
          </div>

          {/* Back button */}
          <div className="absolute top-6 left-6 z-20">
            <Link
              href="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(91,79,219,0.05)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(26,27,58,0.18)', borderRadius: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.20em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.65)', textDecoration: 'none', boxShadow: '0 2px 8px rgba(91,79,219,0.06)', transition: 'all .2s', fontFamily: "'JetBrains Mono', monospace' " }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#5B4FDB'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(91,79,219,0.30)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(26,27,58,0.14)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(90,95,128,0.65)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(26,27,58,0.18)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(91,79,219,0.05)'; }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M13 8H3M7 4l-4 4 4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Home
            </Link>
          </div>

          {/* Form card */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 lg:py-20 z-10">
            <div
              className="form-rise w-full"
              data-auth-theme="light"
              style={{
                maxWidth: 480,
                background: '#FFFFFF',
                border: '1.5px solid rgba(26,27,58,0.15)',
                borderRadius: 20,
                boxShadow: '0 24px 72px rgba(26,27,58,0.15), 0 4px 16px rgba(91,79,219,0.06)',
                padding: 'clamp(28px, 5vw, 44px)',
              }}
            >
              {/* Spectrum top bar */}
              <div style={{ height: 3, background: 'linear-gradient(90deg, #5B4FDB, #8B3FDB, #0DAFCE, #10C98A)', borderRadius: '8px 8px 0 0', margin: '-clamp(28px,5vw,44px) -clamp(28px,5vw,44px) clamp(28px,5vw,44px)', position: 'relative', top: 0, backgroundSize: '200% 100%', animation: 'spectrum-flow 5s linear infinite', marginBottom: 24 }} />

              {/* Card header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ width: 36, height: 2, background: 'linear-gradient(90deg, #5B4FDB, transparent)', borderRadius: 1, opacity: 0.60, marginBottom: 16 }} />
                <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 800, color: '#1A1B3A', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
                  Sign in to your<br />
                  <span style={{ background: 'linear-gradient(135deg, #5B4FDB, #8B3FDB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>workspace</span>
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(90,95,128,0.70)', fontWeight: 400, lineHeight: 1.6 }}>
                  Use your institutional credentials to continue.
                </p>
              </div>

              {/* Auth form */}
              <Suspense
                fallback={
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid rgba(26,27,58,0.18)', borderTopColor: '#5B4FDB', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 10, color: 'rgba(90,95,128,0.45)', letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                      Loading portal…
                    </span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                }
              >
                <AuthCard darkMode />
              </Suspense>
            </div>

            {/* Below footnote */}
            <p style={{ fontSize: 10.5, color: 'rgba(90,95,128,0.45)', textAlign: 'center', marginTop: 24, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}>
              Protected by institutional-grade encryption.{' '}
              <Link href="/" style={{ color: '#5B4FDB', fontWeight: 700, textDecoration: 'none' }}>
                ← Back to home
              </Link>
            </p>
          </div>

          {/* Partner ticker */}
          <div className="relative z-10 w-full py-4 overflow-hidden" style={{ borderTop: '1px solid rgba(91,79,219,0.06)', background: 'rgba(247,248,255,0.60)' }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.40em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>
                Trusted Academic Partners
              </span>
            </div>
            <div style={{ display: 'flex', overflow: 'hidden' }}>
              <div style={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: 40, animation: 'ticker-scroll 32s linear infinite' }}>
                {[...Array(2)].map((_, rep) => (
                  <div key={rep} style={{ display: 'flex', alignItems: 'center', gap: 40, paddingRight: 40 }}>
                    {['Oxford', 'Harvard', 'Cambridge', 'Princeton', 'Stanford', 'MIT', 'Yale', 'LSE'].map(name => (
                      <span key={name} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.26em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.30)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
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
