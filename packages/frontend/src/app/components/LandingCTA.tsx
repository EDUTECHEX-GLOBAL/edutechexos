'use client';
import React, { useRef } from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';
import { DecoEyebrow, DecoCorner, DecoSunburst, DECO_GOLD_LIGHT } from './LandingDeco';

export default function LandingCTA() {
  const btnRef = useRef<HTMLAnchorElement>(null);

  function handleCtaClick() {
    const el = btnRef.current;
    if (!el) return;
    el.classList.remove('click-bubble-pop');
    void el.offsetWidth;
    el.classList.add('click-bubble-pop');
    setTimeout(() => el.classList.remove('click-bubble-pop'), 500);
  }

  return (
    <section id="cta" className="relative overflow-hidden py-32 px-6 lg:px-10" style={{ background: 'linear-gradient(135deg, #5B4FDB 0%, #8B3FDB 60%, #C026D3 100%)' }}>

      {/* Mesh overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Light orbs */}
      <div className="absolute pointer-events-none" style={{ width: 560, height: 560, top: '-25%', left: '-10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 65%)', filter: 'blur(72px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 480, height: 480, bottom: '-20%', right: '-8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)', filter: 'blur(64px)' }} />

      {/* Corner arcs (white, subtle) */}
      <div className="absolute top-0 left-0 overflow-hidden pointer-events-none" style={{ width: 380, height: 380 }}>
        {[320, 220, 120].map(s => (
          <div key={s} className="absolute rounded-full" style={{ width: s, height: s, top: -s / 2, left: -s / 2, border: '1px solid rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <div className="absolute bottom-0 right-0 overflow-hidden pointer-events-none" style={{ width: 380, height: 380 }}>
        {[320, 220, 120].map(s => (
          <div key={s} className="absolute rounded-full" style={{ width: s, height: s, bottom: -s / 2, right: -s / 2, border: '1px solid rgba(255,255,255,0.06)' }} />
        ))}
      </div>

      {/* Art Deco gold corners + sunburst */}
      <div className="absolute pointer-events-none deco-shimmer" style={{ top: 28, right: 36 }}>
        <DecoSunburst size={300} rays={32} color={DECO_GOLD_LIGHT} opacity={0.16} />
      </div>
      <div className="absolute pointer-events-none" style={{ top: 26, left: 26 }}>
        <DecoCorner corner="tl" size={92} color={DECO_GOLD_LIGHT} opacity={0.6} />
      </div>
      <div className="absolute pointer-events-none" style={{ bottom: 26, right: 26 }}>
        <DecoCorner corner="br" size={92} color={DECO_GOLD_LIGHT} opacity={0.6} />
      </div>

      <div className="relative max-w-screen-xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">

        {/* Heading */}
        <AnimatedSection direction="up" className="flex-1">
          <div className="mb-7">
            <DecoEyebrow label="Get started today" color={DECO_GOLD_LIGHT} />
          </div>
          <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.92, color: '#FFFFFF', marginBottom: 24 }}>
            Ready to bring<br />
            your team<br />
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>together?</span>
          </h2>
          <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: 'rgba(255,255,255,0.65)', maxWidth: '40ch' }}>
            EduTechExOS is live and running. Request access or sign in to your existing account right now.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
            {['AI-powered', 'Real-time channels', 'Admin controls', 'Attendance tracking'].map(f => (
              <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.70)', display: 'inline-block' }} />
                {f}
              </span>
            ))}
          </div>
        </AnimatedSection>

        {/* CTAs */}
        <AnimatedSection direction="up" delay={0.15} className="flex flex-col gap-4 lg:items-end w-full lg:w-auto">
          <Link
            ref={btnRef}
            href="/sign-up-login-screen?mode=user"
            onClick={handleCtaClick}
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-xl font-bold text-sm transition-all duration-300 w-full lg:w-auto"
            style={{ background: '#FFFFFF', color: '#5B4FDB', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontWeight: 800, letterSpacing: '.04em', fontSize: 13 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)'; }}
          >
            Enter the System
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-xl font-bold text-sm transition-all duration-200 w-full lg:w-auto"
            style={{ color: 'rgba(255,255,255,0.80)', border: '1.5px solid rgba(255,255,255,0.25)', fontSize: 13, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.40)'; (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.80)'; }}
          >
            Sign in to your account
          </Link>
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="text-xs font-bold text-center transition-all w-full lg:w-auto"
            style={{ color: 'rgba(255,255,255,0.40)', letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.80)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.40)'; }}
          >
            Admin portal →
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
