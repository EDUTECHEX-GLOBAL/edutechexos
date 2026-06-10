'use client';
import React from 'react';
import { Hash, Bot, CheckSquare, Newspaper, Database, Users, Bookmark } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const features = [
  {
    icons: [Hash, Bot] as React.ElementType[],
    iconColors: ['#2563eb', '#1d4ed8'],
    iconBgs: ['#dbeafe', '#eff6ff'],
    title: 'Project Channels',
    description:
      'Dedicated channels for every project. Context stays where work happens, not scattered across threads.',
    tag: 'Real-time · Organised',
    pill: '3 channels',
    pillColor: '#2563eb',
    cardBg: 'linear-gradient(140deg, rgba(219,234,254,0.88) 0%, rgba(191,219,254,0.60) 100%)',
    border: '1px solid rgba(147,197,253,0.55)',
  },
  {
    icons: [Bot, CheckSquare] as React.ElementType[],
    iconColors: ['#7c3aed', '#6d28d9'],
    iconBgs: ['#ede9fe', '#f5f3ff'],
    title: 'Embedded AI Agent',
    description:
      'AI lives inside your workspace. Ask it anything — answers are cited from your actual channel history.',
    tag: 'AI · Context-aware',
    pill: 'Always on',
    pillColor: '#7c3aed',
    cardBg: 'linear-gradient(140deg, rgba(237,233,254,0.88) 0%, rgba(221,214,254,0.58) 100%)',
    border: '1px solid rgba(196,181,253,0.55)',
  },
  {
    icons: [CheckSquare, Newspaper] as React.ElementType[],
    iconColors: ['#0891b2', '#0e7490'],
    iconBgs: ['#cffafe', '#ecfeff'],
    title: 'Auto Task Extraction',
    description:
      'The AI reads every message and automatically surfaces actionable tasks — nothing slips through.',
    tag: 'AI · Productivity',
    pill: 'Auto-detect',
    pillColor: '#0891b2',
    cardBg: 'linear-gradient(140deg, rgba(207,250,254,0.88) 0%, rgba(165,243,252,0.58) 100%)',
    border: '1px solid rgba(103,232,249,0.50)',
  },
  {
    icons: [Newspaper, Database] as React.ElementType[],
    iconColors: ['#d97706', '#b45309'],
    iconBgs: ['#fef3c7', '#fffbeb'],
    title: 'Daily Digest',
    description:
      'Wake up to a crisp morning summary of everything that happened yesterday across all channels.',
    tag: 'Async · Summary',
    pill: 'Daily 9 AM',
    pillColor: '#d97706',
    cardBg: 'linear-gradient(140deg, rgba(254,243,199,0.92) 0%, rgba(253,230,138,0.62) 100%)',
    border: '1px solid rgba(252,211,77,0.55)',
  },
  {
    icons: [Database, Hash] as React.ElementType[],
    iconColors: ['#059669', '#047857'],
    iconBgs: ['#d1fae5', '#ecfdf5'],
    title: 'Org Knowledge Base',
    description: 'Every decision, doc, and discussion becomes searchable org memory — forever.',
    tag: 'Search · Memory',
    pill: '∞ stored',
    pillColor: '#059669',
    cardBg: 'linear-gradient(140deg, rgba(209,250,229,0.90) 0%, rgba(167,243,208,0.60) 100%)',
    border: '1px solid rgba(110,231,183,0.55)',
  },
  {
    icons: [Users, Bot] as React.ElementType[],
    iconColors: ['#e11d48', '#be123c'],
    iconBgs: ['#ffe4e6', '#fff1f2'],
    title: 'Member Onboarding',
    description:
      'New team members get instant context from the org knowledge base the moment they join.',
    tag: 'Onboarding · Team',
    pill: '< 2 min',
    pillColor: '#e11d48',
    cardBg: 'linear-gradient(140deg, rgba(255,228,230,0.90) 0%, rgba(254,205,211,0.60) 100%)',
    border: '1px solid rgba(253,164,175,0.55)',
  },
];

export default function LandingFeatures() {
  return (
    <section
      id="features"
      className="relative py-28 px-6 lg:px-10 overflow-hidden"
      style={{ background: '#F2F0EC' }}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(62,74,137,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(62,74,137,0.06) 1px, transparent 1px)`,
          backgroundSize: '52px 52px',
        }}
      />

      {/* Animated orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          style={{
            position: 'absolute',
            width: 580,
            height: 580,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(62,74,137,0.10) 0%, transparent 65%)',
            filter: 'blur(56px)',
            top: '-10%',
            left: '-8%',
            animation: 'feat-orb-1 24s ease-in-out infinite',
            willChange: 'transform',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 460,
            height: 460,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(155,166,211,0.09) 0%, transparent 65%)',
            filter: 'blur(52px)',
            bottom: '5%',
            right: '-5%',
            animation: 'feat-orb-2 30s ease-in-out infinite 5s',
            willChange: 'transform',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(42,53,104,0.07) 0%, transparent 65%)',
            filter: 'blur(40px)',
            top: '55%',
            left: '40%',
            animation: 'feat-orb-3 20s ease-in-out infinite 2s',
            willChange: 'transform',
          }}
        />
      </div>
      <style>{`
        @keyframes feat-orb-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(100px,80px) scale(1.12); }
          66%      { transform: translate(-60px,120px) scale(0.91); }
        }
        @keyframes feat-orb-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          38%      { transform: translate(-90px,-100px) scale(1.16); }
          72%      { transform: translate(70px,-60px) scale(0.87); }
        }
        @keyframes feat-orb-3 {
          0%,100% { transform: translate(0,0) scale(1); }
          45%      { transform: translate(80px,-70px) scale(1.10); }
          78%      { transform: translate(-60px,50px) scale(0.95); }
        }
      `}</style>

      <div className="relative max-w-screen-xl mx-auto">
        {/* ── Section header ──────────────────────────────────────────── */}
        <AnimatedSection direction="up">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-5">
                <span
                  className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase"
                  style={{ color: '#4A5578' }}
                >
                  What lives inside
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: 'rgba(0,0,0,0.12)', maxWidth: 80 }}
                />
              </div>
              <h2
                className="font-black tracking-[-0.035em] leading-[0.90]"
                style={{ fontSize: 'clamp(2.8rem, 5.5vw, 5rem)', color: '#1E2636' }}
              >
                Everything
                <br />
                <span style={{ color: '#3E4A89' }}>your team</span>
                <br />
                needs.
              </h2>
            </div>
            <div className="lg:max-w-xs">
              <p
                className="text-base font-medium leading-relaxed mb-6"
                style={{ color: '#4A5578' }}
              >
                Six tightly integrated capabilities that replace five disconnected tools.
              </p>
              <div
                className="flex items-center gap-3 text-xs font-mono font-bold tracking-[0.16em] uppercase"
                style={{ color: '#3E4A89' }}
              >
                <span>06 capabilities</span>
                <span>—</span>
                <span>1 platform</span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── Glassmorphic card grid ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => {
            const [IconA, IconB] = feat.icons;
            return (
              <AnimatedSection key={feat.title} direction="up" delay={i * 0.07}>
                <div
                  className="group relative flex flex-col p-6 rounded-2xl cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                  style={{
                    background: feat.cardBg,
                    border: feat.border,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    minHeight: 260,
                  }}
                >
                  {/* ── Top row: two icon thumbnails + bookmark ── */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-2">
                      {/* Icon A */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105"
                        style={{
                          background: feat.iconBgs[0],
                          border: '1px solid rgba(255,255,255,0.80)',
                        }}
                      >
                        <IconA size={18} style={{ color: feat.iconColors[0] }} />
                      </div>
                      {/* Icon B */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105"
                        style={{
                          background: feat.iconBgs[1],
                          border: '1px solid rgba(255,255,255,0.80)',
                          transitionDelay: '40ms',
                        }}
                      >
                        <IconB size={18} style={{ color: feat.iconColors[1] }} />
                      </div>
                    </div>
                    {/* Bookmark */}
                    <button className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 opacity-40 group-hover:opacity-80 hover:bg-black/5">
                      <Bookmark size={15} style={{ color: '#1a1a2e' }} />
                    </button>
                  </div>

                  {/* ── Title ── */}
                  <h3
                    className="font-black mb-3 leading-tight"
                    style={{
                      fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
                      color: '#1E2636',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {feat.title}
                  </h3>

                  {/* ── Description ── */}
                  <p
                    className="text-sm leading-relaxed flex-1"
                    style={{ color: '#4A5578', fontWeight: 450 }}
                  >
                    {feat.description}
                  </p>

                  {/* ── Bottom pill ── */}
                  <div className="flex justify-end mt-5">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                      style={{
                        background: `${(feat as any).pillColor}18`,
                        color: (feat as any).pillColor,
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(20,20,40,0.06)',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: (feat as any).pillColor }}
                      />
                      {feat.pill}
                    </span>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        {/* ── Bottom rule ─────────────────────────────────────────────── */}
        <AnimatedSection direction="up" delay={0.3}>
          <div className="flex items-center gap-6 mt-16">
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.10)' }} />
            <span
              className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase"
              style={{ color: '#4A5578' }}
            >
              Designed for EduTechEx · Built to last
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.10)' }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
