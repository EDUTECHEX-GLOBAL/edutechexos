'use client';
import React from 'react';
import { Bot, CheckSquare, Newspaper, Zap, Shield, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { useScrollColors } from './ScrollColorText';
import GlassSection from './GlassSection';

const capabilities = [
  { name: 'AI Agent', icon: Bot, desc: 'Ask anything about your projects' },
  { name: 'Task Extraction', icon: CheckSquare, desc: 'Auto-surfaced action items' },
  { name: 'Daily Digest', icon: Newspaper, desc: 'Morning context in minutes' },
  { name: 'Fast Search', icon: Zap, desc: 'Instant org-wide knowledge lookup' },
  { name: 'Access Control', icon: Shield, desc: 'Role-based channel permissions' },
  { name: 'Team Hub', icon: Users, desc: 'All members in one workspace' },
];

export default function LandingTrustedBy() {
  const colors = useScrollColors();

  return (
    <section
      id="trusted"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 overflow-hidden bg-gradient-to-b from-lavender-surface/60 via-background to-green-surface/40"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-lavender/4 via-transparent to-primary/3 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-radial from-lavender/6 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-gradient-radial from-primary/4 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto flex flex-col items-center">
        <GlassSection>
          <div className="flex flex-col items-center gap-14">
            <AnimatedSection direction="up">
              <div className="text-center">
                <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-xl mb-8 shadow-soft">
                  <span className="w-2 h-2 rounded-full bg-primary animate-neon-pulse" />
                  <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: colors.accent }}>Capabilities</span>
                </span>
                <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] mt-4" style={{ color: colors.h1 }}>
                  Everything <span className="text-gradient-lavender">built in.</span>
                </h2>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={0.2}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {capabilities.map((cap, i) => {
                  const Icon = cap.icon;
                  return (
                    <div
                      key={cap.name}
                      className="flex flex-col items-center gap-3 group cursor-default transition-all duration-700 hover:scale-105 text-center"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/80 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-700">
                        <Icon size={22} className="text-ink-light/40 group-hover:text-primary transition-colors duration-700" />
                      </div>
                      <span className="font-display font-bold text-sm tracking-[-0.02em] transition-all duration-700" style={{ color: colors.h1 }}>
                        {cap.name}
                      </span>
                      <span className="text-[11px] font-semibold leading-snug max-w-[120px]" style={{ color: colors.muted }}>
                        {cap.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={0.4}>
              <p className="font-mono text-xs font-bold tracking-[0.3em] text-center uppercase" style={{ color: colors.muted }}>
                No context lost. Ever.
              </p>
            </AnimatedSection>
          </div>
        </GlassSection>
      </div>
    </section>
  );
}
