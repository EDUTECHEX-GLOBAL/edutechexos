'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────
   Mini dashboard mockup — floating in the hero right column
──────────────────────────────────────────────────────────────────────*/
function HeroDashboardMockup({ dotCount }: { dotCount: number }) {
  const messages = [
    { init: 'AK', name: 'Aditya K.', text: 'LMS proposal is ready for review.', time: '9:14', ai: false },
    { init: 'AI', name: 'EduTechEx AI', text: '3 action items extracted from thread.', time: '9:15', ai: true },
    { init: 'JM', name: 'Mohan S.', text: "I'll schedule the walkthrough for tomorrow.", time: '9:17', ai: false },
  ];

  return (
    <div style={{
      width: '100%',
      maxWidth: 460,
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.09)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(240,160,40,0.06)',
      background: '#0C1828',
    }}>
      {/* Browser chrome */}
      <div style={{ height: 38, background: '#080F1C', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '.02em' }}>app.edutechex.in/dashboard</span>
        </div>
      </div>

      {/* App shell */}
      <div style={{ display: 'flex', height: 320 }}>
        {/* Icon rail */}
        <div style={{ width: 44, background: '#04060E', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 3 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#F0A028', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, flexShrink: 0 }}>
            <span style={{ color: '#04060E', fontSize: 7, fontWeight: 900 }}>EX</span>
          </div>
          {[{ icon: '≡', active: true }, { icon: '✦', active: false }, { icon: '✓', active: false }, { icon: '◎', active: false }].map(({ icon, active }, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(240,160,40,0.15)' : 'transparent', fontSize: 13, color: active ? '#F0A028' : 'rgba(255,255,255,0.22)' }}>
              {icon}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ width: 126, background: '#07090F', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}>
          <div style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(240,160,40,0.4)', padding: '0 10px', marginBottom: 8 }}>Channels</div>
          {['#general','#curriculum','#planning','#ai-digest'].map((ch, i) => (
            <div key={ch} style={{ padding: '5px 10px', fontSize: 10, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#EEF0F8' : 'rgba(255,255,255,0.32)', background: i === 0 ? 'rgba(240,160,40,0.08)' : 'transparent', borderLeft: i === 0 ? '2px solid #F0A028' : '2px solid transparent' }}>
              {ch}
            </div>
          ))}
          <div style={{ margin: '10px 10px 6px', fontSize: 7.5, fontWeight: 900, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(240,160,40,0.30)' }}>Team</div>
          {['Aditya K.','Designer SA','Dev RK'].map((name, i) => (
            <div key={name} style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#10D9A0' : 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F1F3F9' }}>
          <div style={{ height: 40, borderBottom: '1px solid rgba(10,17,40,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0A1128' }}>#general</span>
              <span style={{ fontSize: 8.5, color: 'rgba(10,17,40,0.32)' }}>14 members</span>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i < dotCount ? '#F0A028' : 'rgba(10,17,40,0.12)', transition: 'background .22s' }} />)}
            </div>
          </div>

          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'hidden' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: msg.ai ? 'linear-gradient(135deg, #0A1128, #1E2E5C)' : `hsl(${i*55+200},40%,48%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: msg.ai ? '#F0A028' : '#fff' }}>
                  {msg.init}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0A1128' }}>{msg.name}</span>
                    <span style={{ fontSize: 8.5, color: 'rgba(10,17,40,0.30)' }}>{msg.time}</span>
                    {msg.ai && <span style={{ fontSize: 7, fontWeight: 800, color: '#F0A028', background: 'rgba(240,160,40,0.10)', padding: '1px 4px', borderRadius: 3, letterSpacing: '.14em', textTransform: 'uppercase' }}>AI</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(10,17,40,0.70)', lineHeight: 1.45, background: msg.ai ? 'rgba(240,160,40,0.05)' : 'transparent', padding: msg.ai ? '4px 7px' : '0', borderRadius: msg.ai ? 5 : 0, border: msg.ai ? '1px solid rgba(240,160,40,0.12)' : 'none' }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ margin: '0 8px 8px', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px 6px 11px', background: 'rgba(10,17,40,0.04)', borderRadius: 7, border: '1px solid rgba(10,17,40,0.07)' }}>
            <span style={{ flex: 1, fontSize: 10, color: 'rgba(10,17,40,0.22)' }}>Message #general…</span>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: '#F0A028', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#04060E' }}>↑</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Floating stat badge
──────────────────────────────────────────────────────────────────────*/
function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 10,
      background: 'rgba(10,16,32,0.90)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.09)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 8px ${color}` }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: '#EEF0F8' }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.38)', letterSpacing: '.02em' }}>{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   HERO
──────────────────────────────────────────────────────────────────────*/
export default function LandingHero() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const dId = setInterval(() => setDotCount(d => (d >= 3 ? 1 : d + 1)), 600);
    return () => clearInterval(dId);
  }, []);

  return (
    <section className="relative w-full min-h-screen flex items-center overflow-hidden" style={{ background: '#04060E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&display=swap');

        @keyframes hero-in {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-float {
          0%,100% { transform: translateY(0px) rotate(-0.5deg); }
          50%      { transform: translateY(-14px) rotate(0.5deg); }
        }
        @keyframes orb-drift {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.6; }
          33%      { transform: translate(60px,40px) scale(1.08); opacity: 0.8; }
          66%      { transform: translate(-40px,70px) scale(0.94); opacity: 0.5; }
        }
        @keyframes badge-float-1 {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes badge-float-2 {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(8px); }
        }
        @keyframes scan-line {
          0%   { transform: translateX(-100%); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }

        .h-in { opacity: 0; animation: hero-in 1s cubic-bezier(.19,1,.22,1) forwards; }
        .h-d1 { animation-delay: 60ms; }
        .h-d2 { animation-delay: 180ms; }
        .h-d3 { animation-delay: 320ms; }
        .h-d4 { animation-delay: 480ms; }
        .h-d5 { animation-delay: 640ms; }
        .h-d6 { animation-delay: 820ms; }

        .mockup-float { animation: hero-float 8s ease-in-out infinite 1.2s; }
        .badge-1 { animation: badge-float-1 6s ease-in-out infinite 0.4s; }
        .badge-2 { animation: badge-float-2 7s ease-in-out infinite 1.0s; }

        .hero-cta-amber {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px 32px;
          background: #F0A028;
          color: #04060E;
          font-size: 11px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase;
          text-decoration: none; border-radius: 5px;
          box-shadow: 0 4px 20px rgba(240,160,40,0.30);
          transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
        }
        .hero-cta-amber:hover {
          background: #FFB040;
          box-shadow: 0 8px 32px rgba(240,160,40,0.45);
          transform: translateY(-2px);
        }
        .hero-cta-ghost {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 14px 28px;
          border: 1.5px solid rgba(255,255,255,0.14);
          color: rgba(238,240,248,0.55);
          font-size: 11px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
          text-decoration: none; border-radius: 5px;
          transition: all 0.25s ease;
        }
        .hero-cta-ghost:hover {
          border-color: rgba(240,160,40,0.35);
          color: rgba(238,240,248,0.85);
          background: rgba(240,160,40,0.06);
        }

        .word-signal {
          position: absolute; pointer-events: none; user-select: none;
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(120px, 22vw, 220px);
          color: rgba(255,255,255,0.018);
          letter-spacing: -.05em;
          line-height: 1;
          white-space: nowrap;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
      `}</style>

      {/* ── Background: void with subtle mesh ── */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* ── Ambient orbs ── */}
      <div className="absolute pointer-events-none" style={{ width: 700, height: 700, top: '-20%', left: '-15%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,40,0.06) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'orb-drift 20s ease-in-out infinite' }} />
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, bottom: '-10%', right: '5%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 60%)', filter: 'blur(64px)', animation: 'orb-drift 28s ease-in-out infinite 6s' }} />
      <div className="absolute pointer-events-none" style={{ width: 300, height: 300, top: '35%', left: '38%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,40,0.04) 0%, transparent 60%)', filter: 'blur(40px)', animation: 'orb-drift 16s ease-in-out infinite 2s' }} />

      {/* ── Watermark word ── */}
      <span className="word-signal">MERIDIAN</span>

      {/* ── Amber signal hairline at top ── */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,160,40,0.4), transparent)' }} />

      {/* ══════════════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════════════ */}
      <div className="relative w-full max-w-screen-xl mx-auto px-6 lg:px-10 xl:px-16 pt-28 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center" style={{ zIndex: 2 }}>

        {/* ── Left: Headline + CTAs ── */}
        <div>
          {/* Overline */}
          <div className="h-in h-d1 flex items-center gap-3 mb-8">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10D9A0', boxShadow: '0 0 8px rgba(16,217,160,0.6)', flexShrink: 0 }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.32em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.38)', fontFamily: "'JetBrains Mono', monospace" }}>
              EduTechExOS · Institutional Workspace
            </span>
          </div>

          {/* Headline */}
          <h1 className="h-in h-d2" style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(3.2rem, 5.5vw, 5.4rem)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.04em', color: '#EEF0F8', marginBottom: '1.6rem', maxWidth: '14ch' }}>
            The OS your<br />
            institution<br />
            <span style={{ color: '#F0A028' }}>runs on.</span>
          </h1>

          {/* Amber signal hairline under headline */}
          <div className="h-in h-d2 signal-line mb-7" style={{ maxWidth: 220 }} />

          {/* Descriptor */}
          <p className="h-in h-d3" style={{ fontSize: '1rem', fontWeight: 400, lineHeight: 1.78, color: 'rgba(238,240,248,0.45)', maxWidth: '38ch', marginBottom: '2.4rem' }}>
            Channels, embedded AI, auto‑extracted tasks, morning digests, and attendance — all in one dark command interface built for your team.
          </p>

          {/* CTA row */}
          <div className="h-in h-d4 flex flex-col sm:flex-row gap-3" style={{ marginBottom: '2.8rem' }}>
            <Link href="/sign-up-login-screen?mode=user" className="hero-cta-amber">
              Enter System
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a href="#features" className="hero-cta-ghost">Explore features</a>
          </div>

          {/* Social proof */}
          <div className="h-in h-d5 flex flex-wrap items-center gap-4">
            {[
              { value: '11+', label: 'Team members' },
              { value: '6', label: 'Channels' },
              { value: '99.8%', label: 'Uptime' },
            ].map(({ value, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: '#EEF0F8', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.30)', letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 3 }}>{label}</span>
              </div>
            ))}
            <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.22)', letterSpacing: '.10em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>Live · Hyderabad, IN</span>
          </div>
        </div>

        {/* ── Right: Floating dashboard mockup ── */}
        <div className="hidden lg:flex relative items-center justify-center" style={{ minHeight: 520 }}>
          {/* Floating stat badges */}
          <div className="badge-1 absolute" style={{ top: '8%', right: '-2%', zIndex: 5 }}>
            <StatBadge label="online now" value="7" color="#10D9A0" />
          </div>
          <div className="badge-2 absolute" style={{ bottom: '10%', left: '-4%', zIndex: 5 }}>
            <StatBadge label="tasks extracted" value="12 AI" color="#F0A028" />
          </div>

          {/* Glow behind mockup */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(240,160,40,0.06) 0%, transparent 70%)', filter: 'blur(20px)' }} />

          <div className="mockup-float" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <HeroDashboardMockup dotCount={dotCount} />
          </div>
        </div>
      </div>

      {/* ── Bottom: trusted by ticker ── */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', overflow: 'hidden', padding: '14px 0' }}>
          <div style={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: 48, animation: 'hero-ticker 30s linear infinite' }}>
            {[...Array(2)].map((_, rep) => (
              <div key={rep} style={{ display: 'flex', alignItems: 'center', gap: 48, paddingRight: 48 }}>
                {['Oxford', 'Harvard', 'Cambridge', 'Princeton', 'Stanford', 'MIT', 'LSE', 'IIT'].map(name => (
                  <span key={name} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.16)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{name}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes hero-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
