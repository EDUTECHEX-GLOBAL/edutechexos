'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthCard from './components/AuthCard';

function SignUpLoginScreen() {
  const searchParams = useSearchParams();
  const isSignup = searchParams?.get('mode') === 'signup';
  return (
    <div className="w-full min-h-screen overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: '#E9EBFA' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

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

        /* Light inputs inside AuthCard */
        [data-auth-theme="light"] input[type="email"],
        [data-auth-theme="light"] input[type="password"],
        [data-auth-theme="light"] input[type="text"] {
          background: #FFFFFF !important;
          border: 1px solid #E5E5E5 !important;
          color: #111111 !important;
          border-radius: 10px;
        }
        [data-auth-theme="light"] input::placeholder {
          color: #A3A3A3 !important;
        }
        [data-auth-theme="light"] input:focus {
          border-color: #4F46E5 !important;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.12) !important;
          outline: none !important;
        }
        [data-auth-theme="light"] label {
          color: #111111 !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
        [data-auth-theme="light"] button[type="submit"],
        [data-auth-theme="light"] .btn-primary {
          background: #4F46E5 !important;
          color: #FFFFFF !important;
          border-radius: 10px !important;
        }
        [data-auth-theme="light"] button[type="submit"]:hover,
        [data-auth-theme="light"] .btn-primary:hover {
          background: #4338CA !important;
        }
        [data-auth-theme="light"] a { color: #4F46E5 !important; }
      `}</style>

      <main className="relative w-full min-h-screen flex flex-col lg:flex-row overflow-hidden">

        {/* ══════════════════════════════════════════════════
            LEFT — Ink brand panel
        ══════════════════════════════════════════════════ */}
        <section className="relative lg:w-[44%] flex flex-col justify-center px-10 md:px-14 lg:px-20 xl:px-24 py-20 lg:py-0 min-h-[360px] lg:min-h-screen overflow-hidden" style={{ background: 'linear-gradient(150deg, #4F46E5 0%, #3730A3 100%)' }}>

          {/* Mesh grid */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

          {/* Light glow */}
          <div className="absolute pointer-events-none" style={{ width: 500, height: 500, top: '-15%', left: '-12%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 65%)', filter: 'blur(80px)' }} />

          {/* Edge line */}
          <div className="absolute top-0 right-0 bottom-0 pointer-events-none" style={{ width: 2, background: '#FFFFFF', opacity: 0.4 }} />

          {/* Content */}
          <div className="relative" style={{ maxWidth: 420 }}>
            {/* Logo */}
            <Link href="/" className="auth-enter ae-1 flex items-center gap-3 no-underline mb-12 w-fit group">
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .3s' }} className="group-hover:scale-105">
                <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 900 }}>EX</span>
              </div>
              <div>
                <span style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 19, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.025em' }}>
                  EduTechEx<span style={{ color: '#A5B4FC' }}>OS</span>
                </span>
                <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, letterSpacing: '.36em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Institutional Portal
                </span>
              </div>
            </Link>

            {/* Hairline */}
            <div className="auth-enter ae-1" style={{ maxWidth: 56, height: 1.5, background: 'rgba(255,255,255,0.35)', marginBottom: '2rem' }} />

            {/* Headline */}
            <h1 className="auth-enter ae-2" style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.4rem, 4vw, 4rem)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.04em', color: '#FFFFFF', marginBottom: '1.6rem', maxWidth: '14ch' }}>
              Return to<br />
              <span style={{ color: '#A5B4FC' }}>Excellence.</span>
            </h1>

            {/* Sub-label */}
            <div className="auth-enter ae-2 flex items-center gap-3 mb-7">
              <div style={{ flexShrink: 0, width: 22, height: 1.5, background: 'rgba(255,255,255,0.35)' }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontFamily: "'JetBrains Mono', monospace" }}>
                Secure Institutional Access
              </span>
            </div>

            {/* Body */}
            <p className="auth-enter ae-3" style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.78, color: 'rgba(255,255,255,0.60)', maxWidth: '34ch', marginBottom: '2.4rem' }}>
              Enter the secure gateway of EduTechEx. Continue your journey developing world-class curriculum and academic intelligence.
            </p>

            {/* Status chips */}
            <div className="auth-enter ae-4 flex flex-wrap gap-3">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFFFFF' }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', fontFamily: "'JetBrains Mono', monospace" }}>System online</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.70)' }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.70)', fontFamily: "'JetBrains Mono', monospace" }}>11 members</span>
              </div>
            </div>

            {/* Feature mini-icons */}
            <div className="auth-enter ae-5 flex items-center gap-3 mt-10">
              {['AI', '≡', '✓', '◎'].map((label) => (
                <div key={label} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#FFFFFF' }}>
                  {label}
                </div>
              ))}
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>+ more</span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            RIGHT — Light elevated form panel
        ══════════════════════════════════════════════════ */}
        <section className="relative flex-1 flex flex-col overflow-y-auto min-h-screen lg:h-screen" style={{ background: '#E9EBFA' }}>

          {/* Subtle dot grid */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E5E5E5 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.5 }} />

          {/* Large watermark */}
          <div className="absolute bottom-16 left-0 right-0 flex justify-center overflow-hidden pointer-events-none">
            <span style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(80px, 16vw, 160px)', fontWeight: 900, color: 'rgba(17,17,17,0.025)', letterSpacing: '-.04em', userSelect: 'none', whiteSpace: 'nowrap' }}>EduTechEx</span>
          </div>

          {/* Back button */}
          <div className="absolute top-6 left-6 z-20">
            <Link
              href="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.20em', textTransform: 'uppercase', color: '#737373', textDecoration: 'none', transition: 'all .2s', fontFamily: "'JetBrains Mono', monospace" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#111111'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#111111'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#737373'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E5E5E5'; }}
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
                border: '1px solid #E5E5E5',
                borderRadius: 18,
                boxShadow: '0 24px 64px rgba(17,17,17,0.08)',
                padding: 'clamp(28px, 5vw, 44px)',
              }}
            >
              {/* Accent top bar */}
              <div style={{ height: 3, background: '#4F46E5', borderRadius: 2, marginBottom: 24 }} />

              {/* Card header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ width: 36, height: 2, background: '#4F46E5', opacity: 0.6, marginBottom: 16 }} />
                <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 800, color: '#111111', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
                  {isSignup ? 'Request access to' : 'Sign in to your'}<br />
                  <span style={{ color: '#4F46E5' }}>{isSignup ? 'EduTechExOS' : 'workspace'}</span>
                </h2>
                <p style={{ fontSize: 13, color: '#737373', fontWeight: 400, lineHeight: 1.6 }}>
                  {isSignup ? 'Submit your details and an admin will review your request.' : 'Use your institutional credentials to continue.'}
                </p>
              </div>

              {/* Auth form */}
              <Suspense
                fallback={
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid #E5E5E5', borderTopColor: '#4F46E5', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 10, color: '#A3A3A3', letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
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
            <p style={{ fontSize: 10.5, color: '#A3A3A3', textAlign: 'center', marginTop: 24, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}>
              Protected by institutional-grade encryption.{' '}
              <Link href="/" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>
                ← Back to home
              </Link>
            </p>
          </div>

          {/* Partner ticker */}
          <div className="relative z-10 w-full py-4 overflow-hidden" style={{ borderTop: '1px solid #E5E5E5', background: 'rgba(255,255,255,0.60)' }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.40em', textTransform: 'uppercase', color: '#A3A3A3', fontFamily: "'JetBrains Mono', monospace" }}>
                Trusted Academic Partners
              </span>
            </div>
            <div style={{ display: 'flex', overflow: 'hidden' }}>
              <div style={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: 40, animation: 'ticker-scroll 32s linear infinite' }}>
                {[...Array(2)].map((_, rep) => (
                  <div key={rep} style={{ display: 'flex', alignItems: 'center', gap: 40, paddingRight: 40 }}>
                    {['Oxford', 'Harvard', 'Cambridge', 'Princeton', 'Stanford', 'MIT', 'Yale', 'LSE'].map(name => (
                      <span key={name} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.26em', textTransform: 'uppercase', color: '#C4C4C4', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
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

export default function SignUpLoginScreenPage() {
  return (
    <Suspense fallback={null}>
      <SignUpLoginScreen />
    </Suspense>
  );
}
