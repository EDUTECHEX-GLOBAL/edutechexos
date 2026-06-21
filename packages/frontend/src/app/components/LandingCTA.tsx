'use client';
import React from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

export default function LandingCTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-32 px-6 lg:px-10" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)' }}>

      {/* Faint grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Soft light glow */}
      <div className="absolute pointer-events-none" style={{ width: 520, height: 520, top: '-30%', left: '-8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 65%)', filter: 'blur(80px)' }} />

      <div className="relative max-w-screen-xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">

        {/* Heading */}
        <AnimatedSection direction="up" className="flex-1">
          <div className="flex items-center gap-3 mb-7">
            <div style={{ height: 1, width: 32, background: 'rgba(255,255,255,0.35)' }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontFamily: "'JetBrains Mono', monospace" }}>
              Get started today
            </span>
          </div>
          <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.92, color: '#FFFFFF', marginBottom: 24 }}>
            Ready to bring<br />
            your team<br />
            <span style={{ color: '#A5B4FC' }}>together?</span>
          </h2>
          <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: 'rgba(255,255,255,0.60)', maxWidth: '40ch' }}>
            EduTechExOS is live and running. Request access or sign in to your existing account right now.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
            {['AI-powered', 'Real-time channels', 'Admin controls', 'Attendance tracking'].map(f => (
              <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
                {f}
              </span>
            ))}
          </div>
        </AnimatedSection>

        {/* CTAs */}
        <AnimatedSection direction="up" delay={0.15} className="flex flex-col gap-4 lg:items-end w-full lg:w-auto">
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-xl transition-all duration-200 w-full lg:w-auto"
            style={{ background: '#FFFFFF', color: '#4338CA', fontWeight: 800, letterSpacing: '.04em', fontSize: 13, border: '1px solid #FFFFFF' }}
            onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background = '#EEF0FB'; t.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background = '#FFFFFF'; t.style.transform = 'translateY(0)'; }}
          >
            Enter the System
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-xl transition-all duration-200 w-full lg:w-auto"
            style={{ color: 'rgba(255,255,255,0.80)', border: '1px solid rgba(255,255,255,0.20)', fontSize: 13, fontWeight: 700, background: 'transparent' }}
            onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.borderColor = 'rgba(255,255,255,0.50)'; t.style.color = '#FFFFFF'; }}
            onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.borderColor = 'rgba(255,255,255,0.20)'; t.style.color = 'rgba(255,255,255,0.80)'; }}
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
