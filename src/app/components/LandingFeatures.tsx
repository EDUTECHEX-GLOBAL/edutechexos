'use client';
import React from 'react';
import { Hash, Bot, CheckSquare, Newspaper, Database, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const features = [
  {
    id: 'feat-channels', icon: Hash, title: 'Project Channels',
    description: 'Dedicated channels for every project. Context stays where work happens.',
    tag: 'Real-time · Organised',
    accent: '#1a3a2a',
  },
  {
    id: 'feat-ai', icon: Bot, title: 'Embedded AI Agent',
    description: 'AI lives inside your workspace. Ask it anything about your projects and get answers cited from channel history.',
    tag: 'AI · Context-aware',
    accent: '#4f46e5',
  },
  {
    id: 'feat-tasks', icon: CheckSquare, title: 'Auto Task Extraction',
    description: 'The AI reads every message and surfaces actionable tasks automatically.',
    tag: 'AI · Productivity',
    accent: '#0d7490',
  },
  {
    id: 'feat-digest', icon: Newspaper, title: 'Daily Digest',
    description: 'A morning summary of what happened yesterday across all channels.',
    tag: 'Async · Summary',
    accent: '#7c3aed',
  },
  {
    id: 'feat-kb', icon: Database, title: 'Org Knowledge Base',
    description: 'Every decision, design doc, and discussion becomes searchable org memory.',
    tag: 'Search · Memory',
    accent: '#065f46',
  },
  {
    id: 'feat-onboarding', icon: Users, title: 'Member Onboarding',
    description: 'New team members get instant context from the org knowledge base.',
    tag: 'Onboarding · Team',
    accent: '#1a3a2a',
  },
];

export default function LandingFeatures() {
  return (
    <section
      id="features"
      className="relative py-28 px-6 lg:px-10 overflow-hidden"
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
      {/* Radial fade — clears grid near centre content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #ede8dd 20%, transparent 75%)',
        }}
      />
      {/* Large faded watermark number */}
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden xl:block"
        style={{
          fontSize: '22rem',
          fontWeight: 900,
          lineHeight: 1,
          color: 'rgba(26,58,42,0.04)',
          letterSpacing: '-0.05em',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        06
      </div>

      <div className="relative max-w-screen-xl mx-auto">

        {/* Section header */}
        <AnimatedSection direction="up">
          <div className="mb-16">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.18em] mb-6"
              style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)', color: '#1a3a2a' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#1a3a2a' }} />
              What lives inside
            </span>
            <h2
              className="font-black tracking-[-0.03em] leading-[0.92] mb-5"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4.5rem)', color: '#1a2e1a' }}
            >
              Everything your<br />team needs.
            </h2>
            <p className="text-base font-medium max-w-lg leading-relaxed" style={{ color: '#4d5d4d' }}>
              Six tightly integrated capabilities that replace five disconnected tools — designed for the modern workflow.
            </p>
          </div>
        </AnimatedSection>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <AnimatedSection key={feat.id} direction="up" delay={i * 0.07}>
                <div
                  className="group relative p-7 rounded-2xl cursor-default transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Hover tint */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
                    style={{ background: `${feat.accent}08` }}
                  />

                  <div className="relative">
                    {/* Icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${feat.accent}14` }}
                    >
                      <Icon size={20} style={{ color: feat.accent }} />
                    </div>

                    {/* Title */}
                    <h3
                      className="font-bold text-base mb-2.5 transition-colors duration-300"
                      style={{ color: '#1a2e1a' }}
                    >
                      {feat.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm leading-relaxed mb-6" style={{ color: '#4d5d4d' }}>
                      {feat.description}
                    </p>

                    {/* Tag */}
                    <div
                      className="flex items-center gap-2 text-xs font-semibold pt-5"
                      style={{ color: feat.accent, borderTop: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: feat.accent }}
                      />
                      {feat.tag}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
