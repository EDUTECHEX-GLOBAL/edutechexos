'use client';
import React from 'react';
import { Hash, Bot, CheckSquare, Newspaper, Database, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const features = [
  { num: '01', icon: Hash,        title: 'Project Channels',     description: 'Dedicated channels for every project. Context stays where work happens, not scattered across threads.',      tag: 'Real-time · Organised',  accent: '#1a3a2a' },
  { num: '02', icon: Bot,         title: 'Embedded AI Agent',    description: 'AI lives inside your workspace. Ask it anything — answers are cited from your actual channel history.',       tag: 'AI · Context-aware',     accent: '#4f46e5' },
  { num: '03', icon: CheckSquare, title: 'Auto Task Extraction', description: 'The AI reads every message and automatically surfaces actionable tasks — nothing slips through.',             tag: 'AI · Productivity',      accent: '#0d7490' },
  { num: '04', icon: Newspaper,   title: 'Daily Digest',         description: 'Wake up to a crisp morning summary of everything that happened yesterday across all channels.',               tag: 'Async · Summary',        accent: '#7c3aed' },
  { num: '05', icon: Database,    title: 'Org Knowledge Base',   description: 'Every decision, doc, and discussion becomes searchable org memory — forever.',                               tag: 'Search · Memory',        accent: '#065f46' },
  { num: '06', icon: Users,       title: 'Member Onboarding',    description: 'New team members get instant context from the org knowledge base the moment they join.',                     tag: 'Onboarding · Team',      accent: '#b45309' },
];

export default function LandingFeatures() {
  return (
    <section
      id="features"
      className="relative py-28 px-6 lg:px-10 overflow-hidden"
      style={{ background: '#ede8dd' }}
    >
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.13) 1px, transparent 1px)`,
        backgroundSize: '52px 52px',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #ede8dd 20%, transparent 75%)',
      }} />

      <div className="relative max-w-screen-xl mx-auto">

        {/* ── Editorial section header ──────────────────────────────── */}
        <AnimatedSection direction="up">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-20">
            {/* Left side */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-5">
                <span className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#6b7b6b' }}>What lives inside</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.12)', maxWidth: 80 }} />
              </div>
              <h2
                className="font-black tracking-[-0.035em] leading-[0.90]"
                style={{ fontSize: 'clamp(2.8rem, 5.5vw, 5rem)', color: '#1a2e1a' }}
              >
                Everything<br />
                <span style={{ color: '#2d6a4f' }}>your team</span><br />
                needs.
              </h2>
            </div>
            {/* Right side */}
            <div className="lg:max-w-xs">
              <p className="text-base font-medium leading-relaxed mb-6" style={{ color: '#4d5d4d' }}>
                Six tightly integrated capabilities that replace five disconnected tools.
              </p>
              <div className="flex items-center gap-3 text-xs font-mono font-bold tracking-[0.16em] uppercase" style={{ color: '#1a3a2a' }}>
                <span>06 capabilities</span>
                <span>—</span>
                <span>1 platform</span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── Feature grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'rgba(0,0,0,0.08)' }}>
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <AnimatedSection key={feat.num} direction="up" delay={i * 0.06}>
                <div
                  className="group relative flex flex-col p-8 cursor-default transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: '#ffffff' }}
                >
                  {/* Hover tint */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" style={{ background: `${feat.accent}06` }} />

                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: feat.accent }} />

                  {/* Number + Icon row */}
                  <div className="relative flex items-start justify-between mb-6">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]"
                      style={{ background: `${feat.accent}12`, border: `1px solid ${feat.accent}20` }}
                    >
                      <Icon size={20} style={{ color: feat.accent }} />
                    </div>
                    <span
                      className="font-mono font-black text-5xl leading-none select-none"
                      style={{ color: 'rgba(0,0,0,0.055)', letterSpacing: '-0.04em' }}
                    >
                      {feat.num}
                    </span>
                  </div>

                  {/* Text */}
                  <h3 className="relative font-bold text-base mb-3 transition-colors duration-200" style={{ color: '#1a2e1a' }}>
                    {feat.title}
                  </h3>
                  <p className="relative text-sm leading-relaxed flex-1" style={{ color: '#4d5d4d' }}>
                    {feat.description}
                  </p>

                  {/* Tag */}
                  <div
                    className="relative flex items-center gap-2 mt-7 pt-5 text-xs font-bold"
                    style={{ color: feat.accent, borderTop: `1px solid ${feat.accent}18` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: feat.accent }} />
                    {feat.tag}
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        {/* ── Bottom rule ───────────────────────────────────────────── */}
        <AnimatedSection direction="up" delay={0.3}>
          <div className="flex items-center gap-6 mt-16">
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.10)' }} />
            <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: '#6b7b6b' }}>
              Designed for EduTechEx · Built to last
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.10)' }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
