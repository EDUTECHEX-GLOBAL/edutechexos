'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export default function LandingHero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#ede8dd' }}
    >
      {/* Grid — darker lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.13) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
        }}
      />
      {/* Radial fade — clears grid near centre text */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 60% at 50% 50%, #ede8dd 30%, transparent 75%)',
        }}
      />

      {/* Center content */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">

        <h1
          className="font-black leading-[0.92] mb-8 tracking-[-0.035em]"
          style={{ fontSize: 'clamp(3rem, 7.5vw, 6.5rem)', color: '#1a2e1a', maxWidth: '14ch' }}
        >
          The team OS
          <br />
          EduTechEx runs&nbsp;on.
        </h1>

        {/* Pagination dots */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === 1 ? 28 : 8,
                height: 8,
                background: i === 1 ? '#1a3a2a' : 'rgba(26,58,42,0.22)',
              }}
            />
          ))}
        </div>

        <p
          className="text-base md:text-lg font-medium max-w-md mx-auto mb-10 leading-relaxed"
          style={{ color: '#4d5d4d' }}
        >
          Channels, embedded AI, auto-extracted tasks, and morning digests
          — all the context your team needs, without the noise.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: '#1a3a2a', boxShadow: '0 4px 18px rgba(26,58,42,0.25)' }}
          >
            Sign Up for Free
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <Link
            href="/sign-up-login-screen?mode=user"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: '#4f46e5', boxShadow: '0 4px 18px rgba(79,70,229,0.25)' }}
          >
            Sign in to your account
          </Link>

          <a
            href="#features"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm transition-all duration-200 hover:bg-black/5 hover:scale-[1.02] active:scale-[0.98]"
            style={{ color: '#1a2e1a', border: '1.5px solid rgba(26,46,26,0.28)', background: 'transparent' }}
          >
            Request a Demo
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#features"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10"
        aria-label="Scroll to features"
        style={{ animation: 'fade-in-up 1s ease 0.4s both' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(26,46,26,0.40)' }}>SCROLL</span>
        <div className="flex items-start justify-center w-6 h-9 rounded-full p-1.5" style={{ border: '1.5px solid rgba(26,46,26,0.22)' }}>
          <span className="w-1 h-1.5 rounded-full" style={{ background: 'rgba(26,46,26,0.45)', animation: 'scroll-dot 1.6s ease-in-out infinite' }} />
        </div>
        <ChevronDown size={14} style={{ color: 'rgba(26,46,26,0.32)', animation: 'scroll-bounce 1.6s ease-in-out infinite' }} />
      </a>

      <style>{`
        @keyframes scroll-dot {
          0%   { transform: translateY(0);    opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateY(10px); opacity: 0; }
        }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0);  }
          50%      { transform: translateY(4px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0);    }
        }
      `}</style>
    </section>
  );
}
