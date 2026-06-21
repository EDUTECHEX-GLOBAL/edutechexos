'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

function HeroDashboardMockup({ dotCount }: { dotCount: number }) {
  const messages = [
    { init: 'AK', name: 'Aditya K.', text: 'LMS proposal ready for review!', time: '9:14', ai: false },
    { init: 'AI', name: 'EduTech AI', text: '3 tasks extracted from thread.', time: '9:15', ai: true },
    { init: 'MS', name: 'Mohan S.', text: 'Scheduling walkthrough tomorrow.', time: '9:17', ai: false },
  ];
  const featureIcons = ['≡', '✓', '✦', '◎'];

  return (
    <div style={{
      width: '100%', maxWidth: 460,
      borderRadius: 14, overflow: 'hidden',
      border: '1px solid #E5E5E5',
      boxShadow: '0 24px 64px rgba(17,17,17,0.10), 0 4px 16px rgba(17,17,17,0.05)',
      background: '#FFFFFF',
    }}>
      {/* Browser chrome */}
      <div style={{ height: 38, background: '#FAFAFA', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#D4D4D4', '#D4D4D4', '#D4D4D4'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, height: 20, borderRadius: 5, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#A3A3A3', letterSpacing: '.02em' }}>app.edutechex.in/dashboard</span>
        </div>
      </div>

      {/* App shell */}
      <div style={{ display: 'flex', height: 320 }}>
        {/* Icon rail */}
        <div style={{ width: 46, background: '#312E81', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, flexShrink: 0 }}>
            <span style={{ color: '#FFFFFF', fontSize: 8, fontWeight: 900 }}>EX</span>
          </div>
          {featureIcons.map((icon, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? 'rgba(255,255,255,0.14)' : 'transparent', fontSize: 13, color: '#FFFFFF', opacity: i === 0 ? 1 : 0.45 }}>
              {icon}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ width: 130, background: '#FFFFFF', borderRight: '1px solid #E5E5E5', padding: '12px 0' }}>
          <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: '#A3A3A3', padding: '0 10px', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>Channels</div>
          {['#general', '#curriculum', '#planning', '#ai-digest'].map((ch, i) => (
            <div key={ch} style={{ padding: '6px 10px', fontSize: 10, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#111111' : '#737373', background: i === 0 ? '#F5F5F5' : 'transparent', borderLeft: i === 0 ? '2px solid #4F46E5' : '2px solid transparent' }}>
              {ch}
            </div>
          ))}
          <div style={{ margin: '10px 10px 6px', fontSize: 7.5, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: '#A3A3A3', fontFamily: 'JetBrains Mono, monospace' }}>Team</div>
          {['Aditya K.', 'Designer SA', 'Dev RK'].map((name, i) => (
            <div key={name} style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#4F46E5' : '#D4D4D4', flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: '#737373', fontWeight: 500 }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>
          <div style={{ height: 40, borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#111111' }}>#general</span>
              <span style={{ fontSize: 8.5, color: '#A3A3A3' }}>14 members</span>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i < dotCount ? '#4F46E5' : '#E5E5E5', transition: 'background .22s' }} />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'hidden' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: msg.ai ? '#4F46E5' : '#F5F5F5', border: msg.ai ? '1px solid #4F46E5' : '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 900, color: msg.ai ? '#FFFFFF' : '#404040' }}>
                  {msg.init}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#111111' }}>{msg.name}</span>
                    <span style={{ fontSize: 8.5, color: '#A3A3A3' }}>{msg.time}</span>
                    {msg.ai && (
                      <span style={{ fontSize: 6.5, fontWeight: 800, color: '#4F46E5', background: 'rgba(79,70,229,0.08)', padding: '1px 5px', borderRadius: 3, letterSpacing: '.12em', textTransform: 'uppercase' }}>AI</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#525252', lineHeight: 1.45, background: '#FFFFFF', padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E5E5' }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ margin: '0 8px 8px', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px 6px 11px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E5E5' }}>
            <span style={{ flex: 1, fontSize: 10, color: '#A3A3A3' }}>Message #general…</span>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#FFFFFF', fontWeight: 900 }}>↑</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 10,
      background: '#FFFFFF',
      border: '1px solid #E5E5E5',
      boxShadow: '0 8px 24px rgba(17,17,17,0.06)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: '#111111' }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: '#737373', letterSpacing: '.02em' }}>{label}</span>
    </div>
  );
}

export default function LandingHero() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const dId = setInterval(() => setDotCount(d => (d >= 3 ? 1 : d + 1)), 600);
    return () => clearInterval(dId);
  }, []);

  return (
    <section className="relative w-full min-h-screen flex items-center overflow-hidden" style={{ background: '#E9EBFA' }}>
      <style>{`
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes badge-float-1 {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes badge-float-2 {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(8px); }
        }

        .h-in { opacity: 0; animation: hero-in .9s cubic-bezier(.19,1,.22,1) forwards; }
        .h-d1 { animation-delay: 60ms; }
        .h-d2 { animation-delay: 180ms; }
        .h-d3 { animation-delay: 320ms; }
        .h-d4 { animation-delay: 480ms; }

        .mockup-float { animation: hero-float 8s ease-in-out infinite 1.2s; }
        .badge-1 { animation: badge-float-1 6s ease-in-out infinite 0.4s; }
        .badge-2 { animation: badge-float-2 7s ease-in-out infinite 1.0s; }

        .hero-cta-primary {
          position: relative; overflow: hidden;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          padding: 15px 32px;
          background: #4F46E5;
          color: #FFFFFF;
          font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase;
          text-decoration: none; border-radius: 8px;
          border: 1px solid #4F46E5;
          transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          font-family: 'JetBrains Mono', monospace;
        }
        .hero-cta-primary:hover {
          background: #4338CA;
          border-color: #4338CA;
          transform: translateY(-2px);
        }
        .hero-cta-primary:active { transform: translateY(0); }

        .hero-cta-ghost {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 15px 28px;
          background: #FFFFFF;
          color: #111111;
          font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
          text-decoration: none; border-radius: 8px;
          border: 1px solid #E5E5E5;
          transition: all 0.2s ease;
          font-family: 'JetBrains Mono', monospace;
        }
        .hero-cta-ghost:hover {
          border-color: #111111;
          transform: translateY(-2px);
        }
      `}</style>

      {/* ── Background: faint grid wash ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E5E5E5 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.5 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(233,235,250,0) 60%, #E9EBFA 100%)' }} />

      {/* ══════════════════════════════════════
          CONTENT
      ══════════════════════════════════════ */}
      <div className="relative w-full max-w-screen-xl mx-auto px-6 lg:px-10 xl:px-16 pt-28 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" style={{ zIndex: 2 }}>

        {/* ── Left: Headline + CTAs ── */}
        <div>
          {/* Overline */}
          <div className="h-in h-d1 flex items-center gap-3 mb-8">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5', flexShrink: 0 }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>
              EduTechExOS · Institutional Workspace
            </span>
          </div>

          {/* Headline */}
          <h1 className="h-in h-d2" style={{
            fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(3.2rem, 5.5vw, 5.4rem)',
            fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.045em',
            color: '#111111', marginBottom: '1.6rem', maxWidth: '14ch',
          }}>
            The OS your<br />
            institution<br />
            <span style={{ color: '#4F46E5' }}>runs on.</span>
          </h1>

          {/* Hairline */}
          <div className="h-in h-d2" style={{ maxWidth: 200, height: 1, background: '#E5E5E5', marginBottom: '1.75rem' }} />

          {/* Descriptor */}
          <p className="h-in h-d3" style={{ fontSize: '1rem', fontWeight: 400, lineHeight: 1.78, color: '#525252', maxWidth: '38ch', marginBottom: '2.4rem' }}>
            Channels, embedded AI, auto-extracted tasks, morning digests, and attendance — all in one focused workspace built for your institution.
          </p>

          {/* CTA row */}
          <div className="h-in h-d4 flex flex-col sm:flex-row gap-3" style={{ marginBottom: '2.8rem' }}>
            <Link href="/sign-up-login-screen" className="hero-cta-primary">
              Sign In
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/sign-up-login-screen?mode=signup" className="hero-cta-ghost">
              Create Account
            </Link>
          </div>

        </div>

        {/* ── Right: Floating dashboard mockup ── */}
        <div className="hidden lg:flex relative items-center justify-center" style={{ minHeight: 520 }}>
          {/* Floating stat badges */}
          <div className="badge-1 absolute" style={{ top: '8%', right: '-2%', zIndex: 5 }}>
            <StatBadge label="online now" value="7" />
          </div>
          <div className="badge-2 absolute" style={{ bottom: '10%', left: '-4%', zIndex: 5 }}>
            <StatBadge label="AI tasks extracted" value="12" />
          </div>

          <div className="mockup-float" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <HeroDashboardMockup dotCount={dotCount} />
          </div>
        </div>
      </div>

    </section>
  );
}
