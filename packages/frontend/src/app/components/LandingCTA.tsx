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
    <section id="cta" className="relative overflow-hidden py-32 px-6 lg:px-10" style={{ background: '#E2E4FA' }}>

      {/* Light orbs */}
      <div className="absolute pointer-events-none" style={{ width: 560, height: 560, top: '-25%', left: '-10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,79,219,0.03) 0%, transparent 65%)', filter: 'blur(72px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 480, height: 480, bottom: '-20%', right: '-8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,175,206,0.03) 0%, transparent 65%)', filter: 'blur(64px)' }} />

      <div className="relative max-w-screen-xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16" style={{ zIndex: 2 }}>

        {/* Heading */}
        <AnimatedSection direction="up" className="flex-1">
          <div className="mb-7">
            <DecoEyebrow label="Get started today" />
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#111827', marginBottom: 24 }}>
            Ready to bring<br />
            your team<br />
            <span style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>together?</span>
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15.5, fontWeight: 400, lineHeight: 1.6, color: '#4B5563', maxWidth: '40ch' }}>
            EduTechExOS is live and running. Request access or sign in to your existing account right now.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>
            {['AI-powered', 'Real-time channels', 'Admin controls', 'Attendance tracking'].map(f => (
              <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 24, background: 'rgba(91,79,219,0.06)', border: '1px solid rgba(91,79,219,0.15)', fontSize: 12, fontWeight: 600, color: '#5B4FDB' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#0DAFCE', display: 'inline-block' }} />
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
            className="inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-lg transition-all duration-300 w-full lg:w-auto"
            style={{ background: '#111827', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(17, 24, 39, 0.15)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1F2937'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(17, 24, 39, 0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#111827'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(17, 24, 39, 0.15)'; }}
          >
            Enter the System
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-lg transition-all duration-200 w-full lg:w-auto"
            style={{ color: '#1F2937', border: '1px solid #D1D5DB', fontSize: 15, fontWeight: 600, background: '#FFFFFF', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.borderColor = '#9CA3AF'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            Sign in to your account
          </Link>
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="text-xs font-bold text-center transition-all w-full lg:w-auto"
            style={{ color: '#6B7280', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 8, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#5B4FDB'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7280'; }}
          >
            Admin portal →
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
