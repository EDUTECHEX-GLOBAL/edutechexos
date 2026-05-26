'use client';
import React from 'react';
import { Hexagon, Globe, Shield, Sparkles, Zap } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const companies = [
  { name: 'Acme Corp', icon: Hexagon },
  { name: 'Globex', icon: Globe },
  { name: 'Initech', icon: Shield },
  { name: 'Soylent', icon: Sparkles },
  { name: 'Umbrella', icon: Zap },
];

export default function LandingTrustedBy() {
  return (
    <section
      id="trusted"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 overflow-hidden bg-dark"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/25 via-dark to-accent-dark/15 pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-gradient-radial from-primary/8 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-radial from-lavender/6 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto flex flex-col items-center gap-20">
        <AnimatedSection direction="up">
          <div className="text-center">
            <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] backdrop-blur-xl mb-8">
              <span className="w-2 h-2 rounded-full bg-green-light animate-neon-pulse" />
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-dark-muted uppercase">Trusted globally</span>
            </span>
            <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-dark-foreground tracking-[-0.03em]">
              Backed by <span className="text-gradient-warm">forward-thinking</span> teams
            </h2>
          </div>
        </AnimatedSection>

        <AnimatedSection direction="up" delay={0.2}>
          <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24">
            {companies.map((company, i) => {
              const Icon = company.icon;
              return (
                <div
                  key={company.name}
                  className="flex flex-col items-center gap-4 group cursor-default transition-all duration-700 hover:scale-110"
                >
                  <div className="w-16 h-16 rounded-3xl bg-white/[0.03] flex items-center justify-center group-hover:bg-lavender/10 transition-all duration-700 group-hover:shadow-2xl group-hover:shadow-lavender/10">
                    <Icon size={24} className="text-dark-muted/30 group-hover:text-lavender transition-colors duration-700" />
                  </div>
                  <span className="font-display font-bold text-xl text-dark-muted/30 group-hover:text-dark-foreground transition-all duration-700 tracking-[-0.02em]">
                    {company.name}
                  </span>
                </div>
              );
            })}
          </div>
        </AnimatedSection>

        <AnimatedSection direction="up" delay={0.4}>
          <p className="font-mono text-xs text-dark-muted/40 font-bold tracking-[0.3em] text-center uppercase">
            And more teams are joining every week
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
