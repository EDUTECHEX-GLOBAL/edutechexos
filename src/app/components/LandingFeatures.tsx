'use client';
import React from 'react';
import { Hash, Bot, CheckSquare, Newspaper, Database, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const features = [
  {
    id: 'feat-channels', icon: Hash, title: 'Project Channels',
    description: 'Dedicated channels for every project. Context stays where work happens.',
  },
  {
    id: 'feat-ai', icon: Bot, title: 'Embedded AI Agent',
    description: 'AI lives inside your workspace. Ask it anything about your projects and get answers cited from channel history.',
  },
  {
    id: 'feat-tasks', icon: CheckSquare, title: 'Auto Task Extraction',
    description: 'The AI reads every message and surfaces actionable tasks automatically.',
  },
  {
    id: 'feat-digest', icon: Newspaper, title: 'Daily Digest',
    description: 'A morning summary of what happened yesterday across all channels.',
  },
  {
    id: 'feat-kb', icon: Database, title: 'Org Knowledge Base',
    description: 'Every decision, design doc, and discussion becomes searchable org memory.',
  },
  {
    id: 'feat-onboarding', icon: Users, title: 'Member Onboarding',
    description: 'New team members get instant context from the org knowledge base.',
  },
];

export default function LandingFeatures() {
  return (
    <section
      id="features"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 py-24 overflow-hidden"
    >
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-[500px] h-[500px] bg-gradient-radial from-lavender/4 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto">
        <AnimatedSection direction="up">
          <div className="max-w-3xl mb-20">
            <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/8 backdrop-blur-xl mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-neon-pulse" />
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-primary uppercase">What lives inside</span>
            </span>
            <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] text-foreground mt-4 mb-4">
              Everything your <span className="text-gradient-warm">team needs.</span>
            </h2>
            <p className="text-lg text-ink font-medium max-w-xl leading-relaxed">
              Six tightly integrated capabilities that replace five disconnected tools — designed for the modern workflow.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <AnimatedSection key={feat.id} direction="up" delay={i * 0.08}>
                <div
                  className="group relative p-8 rounded-3xl transition-all duration-700 hover:scale-[1.02] cursor-default"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(45,106,79,0.06), rgba(196,181,253,0.04))',
                    }}
                  />
                  <div className="relative flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-base text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                        {feat.title}
                      </h3>
                      <p className="text-sm text-ink font-medium leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border/30 flex items-center gap-2 text-xs font-mono font-bold" style={{ color: '#6b806b' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Feature 0{i + 1}</span>
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
