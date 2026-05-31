'use client';
import React from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

export default function LandingCTA() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden py-32 px-6 lg:px-10"
      style={{ background: '#1a2e1a' }}
    >
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '52px 52px',
      }} />

      {/* Animated orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', width:560, height:560, borderRadius:'50%', background:'radial-gradient(circle, rgba(45,106,79,0.22) 0%, transparent 65%)', filter:'blur(60px)', top:'-20%', left:'-10%', animation:'cta-orb-1 22s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 65%)', filter:'blur(64px)', bottom:'-15%', right:'-8%', animation:'cta-orb-2 28s ease-in-out infinite 4s', willChange:'transform' }} />
        <div style={{ position:'absolute', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 65%)', filter:'blur(40px)', top:'40%', right:'30%', animation:'cta-orb-3 18s ease-in-out infinite 8s', willChange:'transform' }} />
      </div>
      <style>{`
        @keyframes cta-orb-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          35%      { transform: translate(110px,90px) scale(1.14); }
          68%      { transform: translate(-60px,130px) scale(0.90); }
        }
        @keyframes cta-orb-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-120px,-100px) scale(1.18); }
          75%      { transform: translate(80px,-70px) scale(0.86); }
        }
        @keyframes cta-orb-3 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%      { transform: translate(70px,-80px) scale(1.09); }
          65%      { transform: translate(-80px,60px) scale(1.13); }
        }
      `}</style>

      {/* Corner arcs — top left */}
      <div className="absolute top-0 left-0 pointer-events-none overflow-hidden" style={{ width: 420, height: 420 }}>
        {[340, 240, 140].map((size) => (
          <div key={size} className="absolute rounded-full" style={{
            width: size, height: size,
            top: -size / 2, left: -size / 2,
            border: '1px solid rgba(255,255,255,0.06)',
          }} />
        ))}
      </div>
      {/* Corner arcs — bottom right */}
      <div className="absolute bottom-0 right-0 pointer-events-none overflow-hidden" style={{ width: 420, height: 420 }}>
        {[340, 240, 140].map((size) => (
          <div key={size} className="absolute rounded-full" style={{
            width: size, height: size,
            bottom: -size / 2, right: -size / 2,
            border: '1px solid rgba(255,255,255,0.06)',
          }} />
        ))}
      </div>

      <div className="relative max-w-screen-xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-14">

        {/* Heading */}
        <AnimatedSection direction="up" className="flex-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.20)' }} />
            <span className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Get started today
            </span>
          </div>
          <h2
            className="font-black leading-[0.90] tracking-[-0.035em] mb-6"
            style={{ fontSize: 'clamp(2.8rem, 5.5vw, 5rem)', color: '#ffffff' }}
          >
            Ready to bring<br />
            your team<br />
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>together?</span>
          </h2>
          <p className="text-base font-medium leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.50)' }}>
            EduTechExOS is live and running. Request access or sign in to your existing account now.
          </p>
        </AnimatedSection>

        {/* CTAs */}
        <AnimatedSection direction="up" delay={0.15} className="flex flex-col gap-4 lg:items-end w-full lg:w-auto">
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full font-bold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] w-full lg:w-auto"
            style={{ background: '#ffffff', color: '#1a2e1a', boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}
          >
            Sign Up for Free
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full font-bold text-sm transition-all duration-200 hover:bg-white/10 active:scale-[0.98] w-full lg:w-auto"
            style={{ color: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(255,255,255,0.18)' }}
          >
            Sign in to your account
          </Link>
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="text-xs font-semibold text-center transition-opacity hover:opacity-60 w-full lg:w-auto"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            Admin portal →
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
