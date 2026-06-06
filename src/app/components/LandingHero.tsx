'use client';
import React from 'react';
import Link from 'next/link';

export default function LandingHero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#F2F0EC' }}
    >
      {/* ── Grid — icy blue lines ─────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(62,74,137,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(62,74,137,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '52px 52px',
      }} />
      {/* Radial fade — clears grid near centre */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 55% 60% at 50% 50%, #F2F0EC 30%, transparent 75%)',
      }} />

      {/* ── Animated floating orbs ───────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', width:640, height:640, borderRadius:'50%', background:'radial-gradient(circle, rgba(62,74,137,0.12) 0%, transparent 68%)', filter:'blur(48px)', top:'-8%', left:'-12%', animation:'hero-orb-1 20s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', width:560, height:560, borderRadius:'50%', background:'radial-gradient(circle, rgba(42,53,104,0.08) 0%, transparent 68%)', filter:'blur(60px)', bottom:'0%', right:'-8%', animation:'hero-orb-2 26s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(160,174,192,0.14) 0%, transparent 68%)', filter:'blur(44px)', top:'35%', right:'18%', animation:'hero-orb-3 32s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(155,166,211,0.08) 0%, transparent 68%)', filter:'blur(36px)', bottom:'20%', left:'25%', animation:'hero-orb-4 24s ease-in-out infinite 4s', willChange:'transform' }} />
      </div>

      {/* ── Decorative corner arcs — top right ───────────────────────── */}
      <div className="absolute top-0 right-0 pointer-events-none overflow-hidden" style={{ width: 420, height: 420 }}>
        {[340, 260, 180, 100].map((size, i) => (
          <div key={size} className="absolute rounded-full" style={{
            width: size, height: size,
            top: -size / 2, right: -size / 2,
            border: `1px solid rgba(62,74,137,${0.08 - i * 0.015})`,
          }} />
        ))}
      </div>

      {/* ── Decorative corner arcs — bottom left ─────────────────────── */}
      <div className="absolute bottom-0 left-0 pointer-events-none overflow-hidden" style={{ width: 300, height: 300 }}>
        {[240, 160, 80].map((size, i) => (
          <div key={size} className="absolute rounded-full" style={{
            width: size, height: size,
            bottom: -size / 2, left: -size / 2,
            border: `1px solid rgba(62,74,137,${0.07 - i * 0.015})`,
          }} />
        ))}
      </div>

      {/* ── Thin vertical accent lines ────────────────────────────────── */}
      <div className="absolute left-[8%] top-1/4 bottom-1/4 pointer-events-none hidden lg:block" style={{
        width: 1,
        background: 'linear-gradient(to bottom, transparent, rgba(62,74,137,0.15) 30%, rgba(62,74,137,0.15) 70%, transparent)',
      }} />
      <div className="absolute right-[8%] top-1/4 bottom-1/4 pointer-events-none hidden lg:block" style={{
        width: 1,
        background: 'linear-gradient(to bottom, transparent, rgba(62,74,137,0.15) 30%, rgba(62,74,137,0.15) 70%, transparent)',
      }} />

      {/* ── Center content ────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">

        {/* Heading */}
        <h1
          className="font-black leading-[0.92] mb-8 tracking-[-0.035em]"
          style={{ fontSize: 'clamp(3rem, 7.5vw, 6.5rem)', color: '#1E2636', maxWidth: '14ch' }}
        >
          The team OS
          <br />
          EduTechEx runs&nbsp;on.
        </h1>

        {/* Pagination dots */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-full transition-all duration-300" style={{
              width: i === 1 ? 28 : 8, height: 8,
              background: i === 1 ? '#3E4A89' : 'rgba(62,74,137,0.22)',
            }} />
          ))}
        </div>

        {/* Subtitle */}
        <p className="text-base md:text-lg font-medium max-w-md mx-auto mb-10 leading-relaxed" style={{ color: '#4A5578' }}>
          Channels, embedded AI, auto-extracted tasks, and morning digests
          — all the context your team needs, without the noise.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap mb-8">
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: '#191E2F', boxShadow: '0 4px 18px rgba(25,30,47,0.25)' }}
          >
            Sign Up for Free
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #3E4A89, #2A3568)', boxShadow: '0 4px 18px rgba(62,74,137,0.30)' }}
          >
            Sign in to your account
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm transition-all duration-200 hover:bg-black/5 hover:scale-[1.02] active:scale-[0.98]"
            style={{ color: '#1E2636', border: '1.5px solid rgba(62,74,137,0.28)', background: 'transparent' }}
          >
            Request a Demo
          </a>
        </div>

      </div>

      <style>{`
        @keyframes hero-orb-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%      { transform: translate(90px,70px) scale(1.12); }
          65%      { transform: translate(-50px,110px) scale(0.93); }
        }
        @keyframes hero-orb-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          35%      { transform: translate(-110px,-80px) scale(1.18); }
          70%      { transform: translate(70px,-50px) scale(0.88); }
        }
        @keyframes hero-orb-3 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%      { transform: translate(60px,-90px) scale(1.10); }
          60%      { transform: translate(-90px,50px) scale(1.15); }
        }
        @keyframes hero-orb-4 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-70px,-60px) scale(1.08); }
          75%      { transform: translate(80px,40px) scale(0.92); }
        }
      `}</style>
    </section>
  );
}
