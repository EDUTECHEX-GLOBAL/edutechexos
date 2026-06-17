'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

function HeroDashboardMockup({ dotCount }: { dotCount: number }) {
  const messages = [
    { init: 'AK', name: 'Aditya K.', text: 'LMS proposal ready for review!', time: '9:14', ai: false, color: '#5B4FDB' },
    { init: 'AI', name: 'EduTech AI', text: '3 tasks extracted from thread.', time: '9:15', ai: true, color: '#8B3FDB' },
    { init: 'MS', name: 'Mohan S.', text: "Scheduling walkthrough tomorrow.", time: '9:17', ai: false, color: '#0DAFCE' },
  ];
  const featureIcons = [
    { icon: '≡', color: '#5B4FDB', bg: 'rgba(26,27,58,0.18)', active: true },
    { icon: '✓', color: '#10C98A', bg: 'rgba(16,201,138,0.10)', active: false },
    { icon: '✦', color: '#8B3FDB', bg: 'rgba(139,63,219,0.10)', active: false },
    { icon: '◎', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', active: false },
  ];

  return (
    <div style={{
      width: '100%', maxWidth: 460,
      borderRadius: 16, overflow: 'hidden',
      border: '1.5px solid rgba(26,27,58,0.18)',
      boxShadow: '0 32px 80px rgba(91,79,219,0.14), 0 8px 24px rgba(26,27,58,0.14), 0 2px 8px rgba(91,79,219,0.06)',
      background: '#ECEAF8',
    }}>
      {/* Browser chrome */}
      <div style={{ height: 38, background: '#FFFFFF', borderBottom: '1px solid rgba(26,27,58,0.14)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, height: 20, borderRadius: 5, background: 'rgba(91,79,219,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(90,95,128,0.50)', letterSpacing: '.02em' }}>app.edutechex.in/dashboard</span>
        </div>
      </div>

      {/* App shell */}
      <div style={{ display: 'flex', height: 320 }}>
        {/* Icon rail */}
        <div style={{ width: 46, background: 'linear-gradient(180deg, #5B4FDB 0%, #8B3FDB 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, flexShrink: 0 }}>
            <span style={{ color: '#FFFFFF', fontSize: 8, fontWeight: 900 }}>EX</span>
          </div>
          {featureIcons.map(({ icon, color, bg, active }, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,0.25)' : 'transparent', fontSize: 13, color: '#FFFFFF', opacity: active ? 1 : 0.55 }}>
              {icon}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ width: 130, background: '#FFFFFF', borderRight: '1px solid rgba(26,27,58,0.14)', padding: '12px 0' }}>
          <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(91,79,219,0.45)', padding: '0 10px', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>Channels</div>
          {['#general', '#curriculum', '#planning', '#ai-digest'].map((ch, i) => (
            <div key={ch} style={{ padding: '6px 10px', fontSize: 10, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#1A1B3A' : 'rgba(90,95,128,0.55)', background: i === 0 ? 'rgba(26,27,58,0.14)' : 'transparent', borderLeft: i === 0 ? '2.5px solid #5B4FDB' : '2.5px solid transparent' }}>
              {ch}
            </div>
          ))}
          <div style={{ margin: '10px 10px 6px', fontSize: 7.5, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(91,79,219,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>Team</div>
          {['Aditya K.', 'Designer SA', 'Dev RK'].map((name, i) => (
            <div key={name} style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#10C98A' : 'rgba(90,95,128,0.20)', flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: 'rgba(90,95,128,0.55)', fontWeight: 500 }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ECEAF8' }}>
          <div style={{ height: 40, borderBottom: '1px solid rgba(91,79,219,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1A1B3A' }}>#general</span>
              <span style={{ fontSize: 8.5, color: 'rgba(90,95,128,0.45)' }}>14 members</span>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i < dotCount ? '#5B4FDB' : 'rgba(91,79,219,0.15)', transition: 'background .22s' }} />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'hidden' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: msg.ai ? 'linear-gradient(135deg, #8B3FDB, #5B4FDB)' : `${msg.color}20`, border: `1.5px solid ${msg.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 900, color: msg.color }}>
                  {msg.init}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1B3A' }}>{msg.name}</span>
                    <span style={{ fontSize: 8.5, color: 'rgba(90,95,128,0.40)' }}>{msg.time}</span>
                    {msg.ai && (
                      <span style={{ fontSize: 6.5, fontWeight: 800, color: '#8B3FDB', background: 'rgba(139,63,219,0.10)', padding: '1px 5px', borderRadius: 3, letterSpacing: '.12em', textTransform: 'uppercase' }}>AI</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#5A5F80', lineHeight: 1.45, background: msg.ai ? 'rgba(139,63,219,0.05)' : 'rgba(255,255,255,0.8)', padding: '5px 8px', borderRadius: 6, border: msg.ai ? '1px solid rgba(139,63,219,0.12)' : '1px solid rgba(91,79,219,0.06)' }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ margin: '0 8px 8px', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px 6px 11px', background: '#FFFFFF', borderRadius: 8, border: '1px solid rgba(26,27,58,0.15)' }}>
            <span style={{ flex: 1, fontSize: 10, color: 'rgba(90,95,128,0.35)' }}>Message #general…</span>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #5B4FDB, #7B6FEB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#FFFFFF', fontWeight: 900 }}>↑</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 12,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(20px)',
      border: `1.5px solid ${color}22`,
      boxShadow: `0 8px 32px ${color}14, 0 2px 8px rgba(0,0,0,0.04)`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 8px ${color}80` }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1B3A' }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(90,95,128,0.60)', letterSpacing: '.02em' }}>{label}</span>
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
    <section className="relative w-full min-h-screen flex items-center overflow-hidden" style={{ background: '#ECEAF8' }}>
      <style>{`
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-float {
          0%,100% { transform: translateY(0px) rotate(-0.5deg); }
          50%      { transform: translateY(-14px) rotate(0.5deg); }
        }
        @keyframes badge-float-1 {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes badge-float-2 {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(8px); }
        }
        @keyframes bubble-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.12); }
          70% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }

        .h-in { opacity: 0; animation: hero-in 1s cubic-bezier(.19,1,.22,1) forwards; }
        .h-d1 { animation-delay: 60ms; }
        .h-d2 { animation-delay: 180ms; }
        .h-d3 { animation-delay: 320ms; }
        .h-d4 { animation-delay: 480ms; }
        .h-d5 { animation-delay: 640ms; }

        .mockup-float { animation: hero-float 8s ease-in-out infinite 1.2s; }
        .badge-1 { animation: badge-float-1 6s ease-in-out infinite 0.4s; }
        .badge-2 { animation: badge-float-2 7s ease-in-out infinite 1.0s; }

        .hero-cta-primary {
          position: relative; overflow: hidden;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          padding: 15px 34px;
          background: linear-gradient(135deg, #5B4FDB 0%, #7B6FEB 100%);
          color: #FFFFFF;
          font-size: 11px; font-weight: 800; letter-spacing: .20em; text-transform: uppercase;
          text-decoration: none; border-radius: 8px;
          box-shadow: 0 4px 20px rgba(91,79,219,0.32), 0 1px 0 rgba(255,255,255,0.20) inset;
          border: 1px solid rgba(91,79,219,0.20);
          transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
          font-family: 'JetBrains Mono', monospace;
        }
        .hero-cta-primary:hover {
          background: linear-gradient(135deg, #4238C8 0%, #6B5FDB 100%);
          box-shadow: 0 8px 36px rgba(91,79,219,0.45);
          transform: translateY(-2px) scale(1.02);
        }
        .hero-cta-primary:active { animation: bubble-pop 0.4s; transform: scale(0.97); }

        .hero-cta-ghost {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 15px 30px;
          background: rgba(255,255,255,0.90);
          color: #5B4FDB;
          font-size: 11px; font-weight: 700; letter-spacing: .20em; text-transform: uppercase;
          text-decoration: none; border-radius: 8px;
          border: 1.5px solid rgba(91,79,219,0.22);
          backdrop-filter: blur(12px);
          transition: all 0.25s ease;
          font-family: 'JetBrains Mono', monospace;
        }
        .hero-cta-ghost:hover {
          background: #FFFFFF;
          border-color: rgba(91,79,219,0.40);
          box-shadow: 0 4px 20px rgba(91,79,219,0.14);
          transform: translateY(-2px);
        }
      `}</style>

      {/* ── Background: soft lavender mesh ── */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,79,219,0.07) 0%, transparent 70%)' }} />

      {/* ── Ambient orbs ── */}
      <div className="absolute pointer-events-none" style={{ width: 700, height: 700, top: '-20%', left: '-15%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,27,58,0.15) 0%, transparent 60%)', filter: 'blur(80px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, bottom: '-10%', right: '5%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,63,219,0.08) 0%, transparent 60%)', filter: 'blur(64px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 400, height: 400, top: '40%', left: '38%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,175,206,0.07) 0%, transparent 60%)', filter: 'blur(52px)' }} />

      {/* ── Spectrum bar at top ── */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none spectrum-bar" />

      {/* ══════════════════════════════════════
          CONTENT
      ══════════════════════════════════════ */}
      <div className="relative w-full max-w-screen-xl mx-auto px-6 lg:px-10 xl:px-16 pt-28 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" style={{ zIndex: 2 }}>

        {/* ── Left: Headline + CTAs ── */}
        <div>
          {/* Overline */}
          <div className="h-in h-d1 flex items-center gap-3 mb-8">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10C98A', boxShadow: '0 0 8px rgba(16,201,138,0.6)', flexShrink: 0 }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.32em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.60)', fontFamily: "'JetBrains Mono', monospace" }}>
              EduTechExOS · Institutional Workspace
            </span>
          </div>

          {/* Headline */}
          <h1 className="h-in h-d2" style={{
            fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(3.2rem, 5.5vw, 5.4rem)',
            fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.04em',
            color: '#1A1B3A', marginBottom: '1.6rem', maxWidth: '14ch',
          }}>
            The OS your<br />
            institution<br />
            <span style={{ background: 'linear-gradient(135deg, #5B4FDB, #8B3FDB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>runs on.</span>
          </h1>

          {/* Indigo signal hairline */}
          <div className="h-in h-d2" style={{ maxWidth: 220, height: 2, background: 'linear-gradient(90deg, #5B4FDB, #8B3FDB, transparent)', borderRadius: 1, marginBottom: '1.75rem', opacity: 0.40 }} />

          {/* Descriptor */}
          <p className="h-in h-d3" style={{ fontSize: '1rem', fontWeight: 400, lineHeight: 1.78, color: 'rgba(90,95,128,0.80)', maxWidth: '38ch', marginBottom: '2.4rem' }}>
            Channels, embedded AI, auto‑extracted tasks, morning digests, and attendance — all in one vibrant workspace built for your institution.
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
              Request Access
            </Link>
          </div>

        </div>

        {/* ── Right: Floating dashboard mockup ── */}
        <div className="hidden lg:flex relative items-center justify-center" style={{ minHeight: 520 }}>
          {/* Floating stat badges */}
          <div className="badge-1 absolute" style={{ top: '8%', right: '-2%', zIndex: 5 }}>
            <StatBadge label="online now" value="7" color="#10C98A" bg="#E7FBF5" />
          </div>
          <div className="badge-2 absolute" style={{ bottom: '10%', left: '-4%', zIndex: 5 }}>
            <StatBadge label="AI tasks extracted" value="12" color="#8B3FDB" bg="#F3E8FF" />
          </div>

          {/* Glow behind mockup */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(26,27,58,0.14) 0%, transparent 70%)', filter: 'blur(20px)' }} />

          <div className="mockup-float" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <HeroDashboardMockup dotCount={dotCount} />
          </div>
        </div>
      </div>

    </section>
  );
}
