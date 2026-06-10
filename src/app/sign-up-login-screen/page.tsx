'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import AuthCard from './components/AuthCard';

export default function AuthPage() {
  return (
    <div className="w-full min-h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", background: '#04060E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');

        @keyframes auth-glow {
          0%,100% { opacity: .08; transform: scale(1); }
          50%      { opacity: .16; transform: scale(1.05); }
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

        .auth-enter { opacity: 0; animation: auth-in 1s cubic-bezier(.19,1,.22,1) forwards; }
        .ae-1 { animation-delay: 80ms; }
        .ae-2 { animation-delay: 220ms; }
        .ae-3 { animation-delay: 380ms; }
        .ae-4 { animation-delay: 540ms; }
        .ae-5 { animation-delay: 720ms; }

        .form-rise { animation: form-rise 0.9s cubic-bezier(.19,1,.22,1) both; animation-delay: 200ms; opacity: 0; }

        /* Dark glass inputs inside AuthCard */
        .auth-input-dark {
          width: 100%; padding: 12px 14px;
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-radius: 10px;
          color: #EEF0F8 !important;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .auth-input-dark::placeholder { color: rgba(122,139,168,0.45) !important; }
        .auth-input-dark:focus {
          border-color: rgba(240,160,40,0.45) !important;
          background: rgba(255,255,255,0.07) !important;
          box-shadow: 0 0 0 3px rgba(240,160,40,0.10) !important;
        }

        /* Override AuthCard light styles for dark theme */
        [data-auth-theme="dark"] input[type="email"],
        [data-auth-theme="dark"] input[type="password"],
        [data-auth-theme="dark"] input[type="text"] {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.10) !important;
          color: #EEF0F8 !important;
        }
        [data-auth-theme="dark"] input::placeholder {
          color: rgba(122,139,168,0.45) !important;
        }
        [data-auth-theme="dark"] input:focus {
          border-color: rgba(240,160,40,0.45) !important;
          box-shadow: 0 0 0 3px rgba(240,160,40,0.10) !important;
        }
        [data-auth-theme="dark"] label {
          color: rgba(238,240,248,0.55) !important;
        }
        [data-auth-theme="dark"] .input-ivy:focus {
          border-color: rgba(240,160,40,0.45) !important;
          box-shadow: 0 0 0 2px rgba(240,160,40,0.10) !important;
          background: rgba(255,255,255,0.07) !important;
        }
      `}</style>

      <main className="relative w-full min-h-screen flex flex-col lg:flex-row overflow-hidden">

        {/* ══════════════════════════════════════════════════
            LEFT — Deep void brand panel
        ══════════════════════════════════════════════════ */}
        <section className="relative lg:w-[44%] flex flex-col justify-center px-10 md:px-14 lg:px-20 xl:px-24 py-20 lg:py-0 min-h-[360px] lg:min-h-screen overflow-hidden" style={{ background: '#04060E' }}>

          {/* Dot grid */}
          <div className="absolute inset-0 dot-grid pointer-events-none" />

          {/* Amber orb top */}
          <div className="absolute pointer-events-none" style={{ width: 500, height: 500, top: '-15%', left: '-12%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,40,0.07) 0%, transparent 65%)', filter: 'blur(72px)', animation: 'auth-glow 9s ease-in-out infinite' }} />

          {/* Indigo orb bottom */}
          <div className="absolute pointer-events-none" style={{ width: 360, height: 360, bottom: '-8%', right: '0%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'auth-glow 12s ease-in-out infinite 2s' }} />

          {/* Amber signal hairline right edge */}
          <div className="absolute top-0 bottom-0 right-0 signal-line-v pointer-events-none" />

          {/* Corner rings */}
          <div className="absolute top-0 right-0 hidden lg:block overflow-hidden" style={{ width: 220, height: 220 }}>
            {[180, 120, 60].map((s, i) => (
              <div key={s} className="absolute rounded-full" style={{ width: s, height: s, top: -s/2, right: -s/2, border: `1px solid rgba(240,160,40,${0.10 - i*0.03})` }} />
            ))}
          </div>

          {/* Content */}
          <div className="relative" style={{ maxWidth: 420 }}>
            {/* Logo */}
            <Link href="/" className="auth-enter ae-1 flex items-center gap-3 no-underline mb-12 w-fit group">
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F0A028', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(240,160,40,0.28)', transition: 'transform .3s' }} className="group-hover:scale-105">
                <span style={{ color: '#04060E', fontSize: 13, fontWeight: 900 }}>EX</span>
              </div>
              <div>
                <span style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 19, fontWeight: 800, color: '#EEF0F8', letterSpacing: '-0.025em' }}>
                  EduTechEx<span style={{ color: '#F0A028' }}>OS</span>
                </span>
                <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, letterSpacing: '.36em', textTransform: 'uppercase', color: 'rgba(240,160,40,0.38)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Institutional Portal
                </span>
              </div>
            </Link>

            {/* Amber hairline */}
            <div className="auth-enter ae-1 signal-line mb-8" style={{ maxWidth: 56 }} />

            {/* Headline */}
            <h1 className="auth-enter ae-2" style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(2.4rem, 4vw, 4rem)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.04em', color: '#EEF0F8', marginBottom: '1.6rem', maxWidth: '12ch' }}>
              Return to<br />
              <span style={{ color: '#F0A028' }}>Excellence.</span>
            </h1>

            {/* Sub-label */}
            <div className="auth-enter ae-2 flex items-center gap-3 mb-7">
              <div style={{ flexShrink: 0, width: 22, height: 1, background: 'rgba(240,160,40,0.35)' }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: 'rgba(240,160,40,0.45)', fontFamily: "'JetBrains Mono', monospace" }}>
                Secure Institutional Access
              </span>
            </div>

            {/* Body */}
            <p className="auth-enter ae-3" style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.78, color: 'rgba(238,240,248,0.38)', maxWidth: '34ch', marginBottom: '2.4rem' }}>
              Enter the secure gateway of EduTechEx. Continue your journey in developing world-class curriculum and academic intelligence.
            </p>

            {/* Status chips */}
            <div className="auth-enter ae-4 flex flex-wrap gap-3">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(16,217,160,0.10)', border: '1px solid rgba(16,217,160,0.20)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10D9A0', boxShadow: '0 0 6px rgba(16,217,160,0.6)' }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#10D9A0', fontFamily: "'JetBrains Mono', monospace" }}>System online</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(240,160,40,0.08)', border: '1px solid rgba(240,160,40,0.15)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F0A028' }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#F0A028', fontFamily: "'JetBrains Mono', monospace" }}>11 members</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            RIGHT — Dark elevated form panel
        ══════════════════════════════════════════════════ */}
        <section className="relative flex-1 flex flex-col overflow-y-auto min-h-screen lg:h-screen" style={{ background: '#07090F' }}>

          {/* Subtle dot grid */}
          <div className="absolute inset-0 dot-grid pointer-events-none" />

          {/* Indigo ambient glow */}
          <div className="absolute pointer-events-none" style={{ width: 400, height: 400, top: '8%', right: '8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)', filter: 'blur(60px)' }} />

          {/* Large watermark */}
          <div className="absolute bottom-16 left-0 right-0 flex justify-center overflow-hidden pointer-events-none">
            <span style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(80px, 16vw, 160px)', fontWeight: 900, color: 'rgba(255,255,255,0.018)', letterSpacing: '-.04em', userSelect: 'none', whiteSpace: 'nowrap' }}>EduTechEx</span>
          </div>

          {/* Back button */}
          <div className="absolute top-6 left-6 z-20">
            <Link
              href="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, fontSize: 9.5, fontWeight: 700, letterSpacing: '.20em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.40)', textDecoration: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.30)', transition: 'all .2s', fontFamily: "'JetBrains Mono', monospace" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#F0A028'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(240,160,40,0.30)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(238,240,248,0.40)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.09)'; }}
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
              data-auth-theme="dark"
              style={{
                maxWidth: 480,
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 20,
                boxShadow: '0 24px 72px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.05) inset',
                padding: 'clamp(28px, 5vw, 44px)',
              }}
            >
              {/* Card header */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg, #F0A028, transparent)', opacity: 0.7, marginBottom: 18 }} />
                <h2 style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 800, color: '#EEF0F8', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
                  Sign in to your<br />
                  <span style={{ color: '#F0A028' }}> workspace</span>
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(238,240,248,0.38)', fontWeight: 400, lineHeight: 1.6 }}>
                  Use your institutional credentials to continue.
                </p>
              </div>

              {/* Auth form */}
              <Suspense
                fallback={
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#F0A028', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 10, color: 'rgba(238,240,248,0.30)', letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
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
            <p style={{ fontSize: 10.5, color: 'rgba(238,240,248,0.20)', textAlign: 'center', marginTop: 24, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}>
              Protected by institutional-grade encryption.{' '}
              <Link href="/" style={{ color: '#F0A028', fontWeight: 700, textDecoration: 'none', opacity: 0.8 }}>
                ← Back to home
              </Link>
            </p>
          </div>

          {/* Partner ticker */}
          <div className="relative z-10 w-full py-4 overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.40em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.18)', fontFamily: "'JetBrains Mono', monospace" }}>
                Trusted Academic Partners
              </span>
            </div>
            <div style={{ display: 'flex', overflow: 'hidden' }}>
              <div style={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: 40, animation: 'ticker-scroll 32s linear infinite' }}>
                {[...Array(2)].map((_, rep) => (
                  <div key={rep} style={{ display: 'flex', alignItems: 'center', gap: 40, paddingRight: 40 }}>
                    {['Oxford', 'Harvard', 'Cambridge', 'Princeton', 'Stanford', 'MIT', 'Yale', 'LSE'].map(name => (
                      <span key={name} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.26em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.16)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
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
