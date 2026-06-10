'use client';
import React from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

export default function LandingCTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-32 px-6 lg:px-10" style={{ background: '#0A1020' }}>
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Amber signal hairline top */}
      <div className="absolute top-0 left-0 right-0 signal-line pointer-events-none" />

      {/* Orbs */}
      <div className="absolute pointer-events-none" style={{ width: 560, height: 560, top: '-25%', left: '-10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,40,0.08) 0%, transparent 65%)', filter: 'blur(72px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 480, height: 480, bottom: '-20%', right: '-8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)', filter: 'blur(64px)' }} />

      {/* Corner arcs */}
      <div className="absolute top-0 left-0 overflow-hidden pointer-events-none" style={{ width: 380, height: 380 }}>
        {[320, 220, 120].map(s => (
          <div key={s} className="absolute rounded-full" style={{ width: s, height: s, top: -s/2, left: -s/2, border: '1px solid rgba(240,160,40,0.07)' }} />
        ))}
      </div>
      <div className="absolute bottom-0 right-0 overflow-hidden pointer-events-none" style={{ width: 380, height: 380 }}>
        {[320, 220, 120].map(s => (
          <div key={s} className="absolute rounded-full" style={{ width: s, height: s, bottom: -s/2, right: -s/2, border: '1px solid rgba(99,102,241,0.07)' }} />
        ))}
      </div>

      <div className="relative max-w-screen-xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">

        {/* Heading */}
        <AnimatedSection direction="up" className="flex-1">
          <div className="flex items-center gap-3 mb-7">
            <div style={{ height: 1, width: 32, background: 'rgba(240,160,40,0.35)' }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>
              Get started today
            </span>
          </div>
          <h2 style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.92, color: '#EEF0F8', marginBottom: 24 }}>
            Ready to bring<br />
            your team<br />
            <span style={{ color: 'rgba(238,240,248,0.28)' }}>together?</span>
          </h2>
          <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: 'rgba(238,240,248,0.45)', maxWidth: '40ch' }}>
            EduTechExOS is live and running. Request access or sign in to your existing account right now.
          </p>
        </AnimatedSection>

        {/* CTAs */}
        <AnimatedSection direction="up" delay={0.15} className="flex flex-col gap-4 lg:items-end w-full lg:w-auto">
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-lg font-bold text-sm transition-all duration-300 w-full lg:w-auto active:scale-[0.98]"
            style={{ background: '#F0A028', color: '#04060E', boxShadow: '0 4px 24px rgba(240,160,40,0.30)', fontWeight: 800, letterSpacing: '.06em', fontSize: 13 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFB040'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(240,160,40,0.45)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F0A028'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(240,160,40,0.30)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            Enter the System
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-lg font-bold text-sm transition-all duration-200 w-full lg:w-auto active:scale-[0.98]"
            style={{ color: 'rgba(238,240,248,0.65)', border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 13 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            Sign in to your account
          </Link>
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="text-xs font-bold text-center transition-opacity w-full lg:w-auto"
            style={{ color: 'rgba(238,240,248,0.22)', letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F0A028')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,240,248,0.22)')}
          >
            Admin portal →
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
