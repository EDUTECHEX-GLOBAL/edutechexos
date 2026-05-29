'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Users, LayoutGrid, MessageCircle, MessageSquare, Megaphone, Monitor } from 'lucide-react';
import AuthCard from './components/AuthCard';

/* Floating nodes orbiting the tablet — varied icons like the mockup */
const orbitNodes = [
  { top: '6%',  left: '50%', size: 38, delay: '0s',   color: '#a78bfa', icon: Users        },
  { top: '16%', left: '80%', size: 30, delay: '0.6s', color: '#7fb4ff', icon: MessageCircle },
  { top: '40%', left: '90%', size: 34, delay: '1.2s', color: '#ffb347', icon: Megaphone     },
  { top: '66%', left: '84%', size: 30, delay: '1.8s', color: '#f4a3c0', icon: MessageSquare },
  { top: '80%', left: '50%', size: 32, delay: '2.2s', color: '#9ad6a0', icon: Users         },
  { top: '66%', left: '16%', size: 30, delay: '2.6s', color: '#7fb4ff', icon: MessageCircle },
  { top: '40%', left: '10%', size: 34, delay: '3.0s', color: '#c4a882', icon: Monitor       },
  { top: '16%', left: '20%', size: 30, delay: '3.4s', color: '#a78bfa', icon: MessageSquare },
];

const towerItems = [
  { icon: LayoutGrid, label: 'Features' },
  { icon: Users,      label: 'Team Portal' },
];

export default function AuthPage() {
  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        background: '#0e1a2b',
        backgroundImage: 'url(/hero-bg.jpg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(to bottom, rgba(10,18,35,0.65) 0%, rgba(10,18,35,0.30) 45%, rgba(10,18,35,0.55) 100%),
          radial-gradient(ellipse 60% 50% at 50% 0%, rgba(10,18,35,0.55) 0%, transparent 70%)
        `,
      }} />
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(10,18,35,0.80) 0%, transparent 100%)',
      }} />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="relative z-50 w-full" style={{
        backgroundColor: 'rgba(10,18,35,0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(180,210,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.20)', boxShadow: '0 4px 14px rgba(0,0,0,0.30)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-[-0.02em] text-white">
              EduTechEx<span style={{ color: 'rgba(180,210,255,0.90)' }}>OS</span>
            </span>
          </Link>

          <div />
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center w-full max-w-screen-xl mx-auto px-6 lg:px-10 py-10 gap-6">

        {/* ── LEFT: Feature tower ─────────────────────────────── */}
        <div className="hidden lg:flex flex-col gap-2.5 flex-shrink-0 w-44 self-center">
          {towerItems.map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex items-center gap-2.5 px-4 py-3 rounded-xl select-none"
              style={{
                background: 'linear-gradient(135deg, rgba(180,120,60,0.55) 0%, rgba(140,85,35,0.45) 100%)',
                border: '1px solid rgba(255,200,140,0.25)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,220,160,0.15)',
                animation: `float-soft 4s ease-in-out ${i * 0.5}s infinite alternate`,
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,200,140,0.20)' }}>
                <Icon size={14} color="rgba(255,230,190,0.95)" />
              </div>
              <span className="text-xs font-bold" style={{ color: 'rgba(255,235,200,0.95)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── CENTER: Tablet + orbit ───────────────────────────── */}
        <div className="relative flex items-center justify-center flex-shrink-0">

          {/* SVG orbit rings */}
          <svg className="absolute pointer-events-none" width="600" height="600"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0 }}>
            <ellipse cx="300" cy="300" rx="270" ry="225" fill="none"
              stroke="rgba(180,160,120,0.22)" strokeWidth="1.5" strokeDasharray="5 9" />
            <ellipse cx="300" cy="300" rx="215" ry="172" fill="none"
              stroke="rgba(180,160,120,0.14)" strokeWidth="1" />
          </svg>

          {/* Floating orbit bubbles — varied icons */}
          {orbitNodes.map(({ top, left, size, delay, color, icon: Icon }, i) => (
            <div key={i} className="absolute rounded-2xl flex items-center justify-center z-10"
              style={{
                top, left,
                width: size, height: size,
                background: `linear-gradient(135deg, ${color}f0 0%, ${color}aa 100%)`,
                border: '2px solid rgba(255,255,255,0.35)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                transform: 'translate(-50%,-50%)',
                animation: `float-orbit 3.6s ease-in-out ${delay} infinite alternate`,
              }}>
              <Icon size={size * 0.46} color="rgba(255,255,255,0.95)" strokeWidth={2.2} />
            </div>
          ))}

          {/* Speech bubble accents near the tablet */}
          {[
            { top: '30%', left: '14%', color: '#7fb4ff' },
            { top: '34%', left: '86%', color: '#a78bfa' },
          ].map((pos, i) => (
            <div key={i} className="absolute z-10 flex flex-col items-center"
              style={{ top: pos.top, left: pos.left, transform: 'translate(-50%,-50%)',
                animation: `float-orbit 4s ease-in-out ${i * 1.2}s infinite alternate` }}>
              <div className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }}>
                {[0,1,2].map(d => <div key={d} className="w-1 h-1 rounded-full" style={{ background: pos.color }} />)}
              </div>
            </div>
          ))}

          {/* ── Tablet device frame ─────────────────────────── */}
          <div className="relative z-20 w-80 xl:w-96 rounded-[28px] overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1e2c42 0%, #162030 60%, #111825 100%)',
              border: '2px solid rgba(255,255,255,0.10)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.60), 0 8px 20px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
            {/* Tablet top bar */}
            <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Form area */}
            <div className="px-7 pb-8 pt-2">
              {/* Logo inside tablet */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Sparkles size={13} className="text-white" />
                </div>
                <span className="text-sm font-bold" style={{ color: 'rgba(220,235,255,0.90)' }}>EduTechExOS</span>
              </div>

              {/* Welcome heading */}
              <h1 className="text-center font-display font-bold text-xl mb-6 leading-snug"
                style={{ color: '#ffffff' }}>
                Welcome back to<br />
                <span style={{ color: 'rgba(200,220,255,0.85)' }}>your EduTechExOS,</span>
              </h1>

              {/* Auth form — keep all logic */}
              <Suspense fallback={<div className="text-center text-xs text-white/50 py-4">Loading…</div>}>
                <AuthCard darkMode />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Right spacer to balance layout */}
        <div className="hidden lg:block w-44 flex-shrink-0" />
      </div>

      <style>{`
        @keyframes float-tower {
          from { transform: translate(-50%,-50%) translateY(0px); }
          to   { transform: translate(-50%,-50%) translateY(-7px); }
        }
        @keyframes float-orbit {
          from { transform: translate(-50%,-50%) translateY(0px); }
          to   { transform: translate(-50%,-50%) translateY(-9px); }
        }
        @keyframes float-soft {
          from { transform: translateY(0px); }
          to   { transform: translateY(-7px); }
        }
      `}</style>
    </div>
  );
}
