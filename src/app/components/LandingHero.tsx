'use client';
import React from 'react';
import Link from 'next/link';
import { Hash, AtSign, Newspaper, Bot, BookOpen, LayoutDashboard, Search, Bell, Users, CheckSquare, Calendar, MessageCircle, MessageSquare, ChevronDown } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const towerItems = [
  { icon: Hash,      label: 'channels',          color: '#b5651d' },
  { icon: AtSign,    label: 'mentions',           color: '#8b5e3c' },
  { icon: Newspaper, label: 'A daily digest',     color: '#a0522d' },
  { icon: Bot,       label: 'AI task extracted',  color: '#7a5230' },
  { icon: BookOpen,  label: 'Wiki updated',       color: '#6b4423' },
];

/* Mini dashboard data for the right-side mockup */
const activityItems = [
  { text: 'Join our silly clean-up!', sub: 'Brenda Agius' },
  { text: 'Nel di are-recommended', sub: '' },
  { text: 'Who wants to play a pick-up game?', sub: '' },
];

export default function LandingHero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{
        background: '#0e1a2b',
        backgroundImage: 'url(/hero-bg.jpg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* ── Warm architectural background texture ──────────────────── */}
      {/* Dark overlay so text stays readable over the image */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(to bottom, rgba(10,18,35,0.72) 0%, rgba(10,18,35,0.35) 45%, rgba(10,18,35,0.55) 100%),
          radial-gradient(ellipse 60% 50% at 50% 0%, rgba(10,18,35,0.60) 0%, transparent 70%)
        `,
      }} />

      {/* Bottom fade so the scene transitions smoothly into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(10,18,35,0.85) 0%, transparent 100%)',
      }} />

      {/* ── Drifting aurora glows (GPU-composited, no filter blur) ── */}
      <div className="absolute pointer-events-none rounded-full"
        style={{
          top: '8%', left: '12%', width: 420, height: 420,
          background: 'radial-gradient(circle, rgba(124,58,237,0.20) 0%, rgba(124,58,237,0.08) 35%, transparent 70%)',
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          animation: 'aurora-a 16s ease-in-out infinite alternate',
        }} />
      <div className="absolute pointer-events-none rounded-full"
        style={{
          top: '20%', right: '10%', width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(127,180,255,0.18) 0%, rgba(127,180,255,0.07) 35%, transparent 70%)',
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          animation: 'aurora-b 20s ease-in-out infinite alternate',
        }} />
      <div className="absolute pointer-events-none rounded-full"
        style={{
          bottom: '18%', left: '38%', width: 380, height: 380,
          background: 'radial-gradient(circle, rgba(255,179,71,0.15) 0%, rgba(255,179,71,0.06) 35%, transparent 70%)',
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          animation: 'aurora-a 22s ease-in-out 2s infinite alternate',
        }} />

      {/* ── Main 3-column layout ──────────────────────────────────── */}
      <div className="relative flex-1 flex items-center w-full max-w-screen-2xl mx-auto px-6 lg:px-10 pt-24 pb-16 gap-8 xl:gap-12">

        {/* ── LEFT: Feature tower ───────────────────────────────── */}
        <div className="hidden lg:flex flex-col items-start gap-2 flex-shrink-0 w-52 xl:w-60 self-center">
          {towerItems.map(({ icon: Icon, label, color }, i) => (
            <div
              key={label}
              className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl select-none"
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(200,210,255,0.07) 100%)`,
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.12)',
                animation: `float-tower 4s ease-in-out ${i * 0.4}s infinite alternate`,
              }}
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <Icon size={14} color="rgba(220,235,255,0.95)" />
              </div>
              <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'rgba(220,235,255,0.95)' }}>
                {label}
              </span>
              {/* decorative dot */}
              <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(180,210,255,0.45)' }} />
            </div>
          ))}

          {/* Connector lines between tower items */}
          <div className="absolute left-[calc(13rem/2)] pointer-events-none" style={{ top: '30%', bottom: '55%', width: 2, background: 'linear-gradient(to bottom, transparent, rgba(255,200,140,0.3), transparent)' }} />
        </div>

        {/* ── CENTER: Heading + CTA ─────────────────────────────── */}
        <div className="flex-1 text-center flex flex-col items-center justify-center min-w-0">

          <AnimatedSection direction="up" delay={0}>
            <h1
              className="font-display font-black leading-[0.95] mb-5 tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(2.8rem, 6.5vw, 6rem)',
                color: '#fff8f0',
                textShadow: '0 2px 20px rgba(0,0,0,0.3)',
              }}
            >
              The team OS
              <br />
              <span style={{
                background: 'linear-gradient(120deg, #ffe4b5 0%, #ffd090 25%, #ffb347 50%, #ffd090 75%, #ffe4b5 100%)',
                backgroundSize: '220% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'gradient-flow 6s ease-in-out infinite',
              }}>
                EduTechEx runs on.
              </span>
            </h1>
          </AnimatedSection>

          {/* Decorative divider — chat bubbles + central group icon */}
          <AnimatedSection direction="up" delay={0.08}>
            <div className="flex items-center justify-center gap-2 mb-7">
              {/* far-left line */}
              <div className="h-px w-12 sm:w-20" style={{ background: 'linear-gradient(to right, transparent, rgba(180,210,255,0.40))' }} />
              {/* left chat bubble */}
              <div className="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7fb4ff 0%, #5a8fd8 100%)', border: '1.5px solid rgba(255,255,255,0.30)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                <MessageCircle size={13} color="#fff" strokeWidth={2.4} />
              </div>
              {/* dotted connector */}
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full" style={{ background: 'rgba(180,210,255,0.45)' }} />)}
              </div>
              {/* central group badge */}
              <div className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', border: '2px solid rgba(255,255,255,0.35)', boxShadow: '0 4px 14px rgba(124,58,237,0.40)' }}>
                <Users size={17} color="#fff" strokeWidth={2.2} />
              </div>
              {/* dotted connector */}
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full" style={{ background: 'rgba(180,210,255,0.45)' }} />)}
              </div>
              {/* right chat bubble */}
              <div className="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #f4a3c0 0%, #d8728f 100%)', border: '1.5px solid rgba(255,255,255,0.30)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                <MessageSquare size={13} color="#fff" strokeWidth={2.4} />
              </div>
              {/* far-right line */}
              <div className="h-px w-12 sm:w-20" style={{ background: 'linear-gradient(to left, transparent, rgba(180,210,255,0.40))' }} />
            </div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.15}>
            <p
              className="text-base md:text-lg font-medium max-w-xl mx-auto mb-10 leading-relaxed"
              style={{ color: 'rgba(200,220,255,0.85)' }}
            >
              Channels, embedded AI, community-managed tasks, and morning digests
              — all the context your community needs, without the noise.
            </p>
          </AnimatedSection>

        </div>

        {/* ── RIGHT: Dashboard mockup ───────────────────────────── */}
        <div className="hidden lg:flex flex-shrink-0 w-64 xl:w-80 self-center">
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,248,240,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,210,160,0.4)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.15)',
              animation: 'float-tower 5s ease-in-out 0.5s infinite alternate',
            }}
          >
            {/* Dashboard header */}
            <div className="flex items-center justify-between px-3 py-2.5" style={{ background: 'rgba(139,78,40,0.08)', borderBottom: '1px solid rgba(139,78,40,0.10)' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <Search size={10} style={{ color: '#8b4a20' }} />
                <span className="text-[9px] font-medium" style={{ color: '#8b4a20' }}>Search...</span>
              </div>
              <Bell size={11} style={{ color: '#8b4a20' }} />
            </div>

            <div className="flex" style={{ minHeight: 200 }}>
              {/* Sidebar */}
              <div className="flex flex-col gap-1 p-2" style={{ width: 36, background: 'rgba(139,78,40,0.05)', borderRight: '1px solid rgba(139,78,40,0.08)' }}>
                {[LayoutDashboard, Hash, Users, CheckSquare, Calendar, BookOpen].map((Icon, i) => (
                  <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: i === 0 ? 'rgba(139,78,40,0.15)' : 'transparent' }}>
                    <Icon size={12} style={{ color: i === 0 ? '#8b4a20' : '#b8956a' }} />
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-2.5 flex flex-col gap-2">
                {/* Section: Activity */}
                <div>
                  <div className="text-[8px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#6b3a10' }}>Activity feed</div>
                  {activityItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1.5">
                      <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                        style={{ background: `hsl(${25 + i * 20},60%,70%)` }}>
                        <span className="text-[6px] font-bold text-white">{item.text[0]}</span>
                      </div>
                      <div>
                        <div className="text-[8px] font-medium leading-tight" style={{ color: '#3d1f0a' }}>{item.text}</div>
                        {item.sub && <div className="text-[7px]" style={{ color: '#a07050' }}>{item.sub}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section: Tasks */}
                <div>
                  <div className="text-[8px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#6b3a10' }}>Tasks</div>
                  {['Toogaz...', 'Sonvers...'].map((t, i) => (
                    <div key={i} className="flex items-center gap-1.5 mb-1 px-2 py-1 rounded-md" style={{ background: 'rgba(139,78,40,0.06)' }}>
                      <CheckSquare size={8} style={{ color: i === 0 ? '#8b4a20' : '#c4a070' }} />
                      <span className="text-[8px] font-medium" style={{ color: '#5a3010' }}>{t}</span>
                    </div>
                  ))}
                </div>

                {/* Events section */}
                <div>
                  <div className="text-[8px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#6b3a10' }}>Events & Hubs</div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { label: 'Community Potluck', color: '#c4905a' },
                      { label: 'Book Club', color: '#8b6040' },
                    ].map((ev, i) => (
                      <div key={i} className="rounded-lg p-1.5 flex items-end" style={{ background: ev.color, minHeight: 32 }}>
                        <span className="text-[7px] font-bold text-white leading-tight">{ev.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll-down indicator ─────────────────────────────────── */}
      <a
        href="#features"
        className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 group"
        style={{ animation: 'fade-in-up 1s ease 0.6s both' }}
        aria-label="Scroll to features"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(200,220,255,0.55)' }}>
          Scroll
        </span>
        <div className="flex items-start justify-center w-6 h-9 rounded-full p-1.5"
          style={{ border: '1.5px solid rgba(200,220,255,0.40)' }}>
          <span className="w-1 h-1.5 rounded-full" style={{ background: 'rgba(200,220,255,0.80)', animation: 'scroll-dot 1.6s ease-in-out infinite' }} />
        </div>
        <ChevronDown size={14} style={{ color: 'rgba(200,220,255,0.50)', animation: 'scroll-bounce 1.6s ease-in-out infinite' }} />
      </a>

      <style>{`
        @keyframes float-tower {
          from { transform: translateY(0px); }
          to   { transform: translateY(-8px); }
        }
        @keyframes float-card {
          from { transform: translateY(0px); }
          to   { transform: translateY(-12px); }
        }
        @keyframes gradient-flow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes aurora-a {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.55; }
          50%  { transform: translate(40px, 30px) scale(1.15); opacity: 0.85; }
          100% { transform: translate(-20px, 20px) scale(1); opacity: 0.6; }
        }
        @keyframes aurora-b {
          0%   { transform: translate(0, 0) scale(1.1); opacity: 0.5; }
          50%  { transform: translate(-35px, 40px) scale(0.95); opacity: 0.8; }
          100% { transform: translate(20px, -15px) scale(1.1); opacity: 0.55; }
        }
        @keyframes scroll-dot {
          0%   { transform: translateY(0); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateY(10px); opacity: 0; }
        }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(4px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </section>
  );
}
