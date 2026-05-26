'use client';
import React from 'react';
import { ArrowRight, Users, MessageSquare, Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { useScrollColors } from './ScrollColorText';
import GlassSection from './GlassSection';

const steps = [
  {
    id: 'step-connect', number: '01', title: 'Connect your team', icon: Users,
    description: 'Invite team members, assign roles, and set up project channels in under two minutes.',
  },
  {
    id: 'step-communicate', number: '02', title: 'Communicate in channels', icon: MessageSquare,
    description: 'Use dedicated channels for every project. Every message is indexed and fed into the AI context window.',
  },
  {
    id: 'step-ai', number: '03', title: 'AI handles the rest', icon: Sparkles,
    description: 'AI extracts tasks, generates the morning digest, answers questions, and keeps the knowledge base current.',
  },
];

const demoContent = [
  {
    type: 'avatars' as const,
    items: [{ label: 'VK', sub: 'Venkata' }, { label: 'RA', sub: 'Rahul' }, { label: 'TM', sub: 'Tara' }, { label: 'SA', sub: 'Sam' }],
  },
  {
    type: 'channels' as const,
    items: [
      { label: '#skillnaav', sub: 'Project channel' },
      { label: '#edutechexassessa', sub: 'Project channel' },
      { label: '#general', sub: 'Team hub' },
    ],
  },
  {
    type: 'ai' as const,
    items: [
      { label: '🤖', sub: 'Extracted 3 tasks from #skillnaav' },
      { label: '📋', sub: 'Morning digest ready — 6 May' },
    ],
  },
];

export default function LandingHowItWorks() {
  const colors = useScrollColors();

  return (
    <section
      id="how-it-works"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 py-24 overflow-hidden bg-gradient-to-b from-background via-green-surface/30 to-lavender-surface/40"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-lavender/3 pointer-events-none" />
      <div className="absolute top-1/4 left-0 w-[450px] h-[450px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[380px] h-[380px] bg-gradient-radial from-lavender/4 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto">
        <GlassSection padding="p-10 md:p-14 lg:p-16">
          <AnimatedSection direction="up">
            <div className="max-w-3xl mb-14">
              <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-xl mb-8 shadow-soft">
                <span className="w-2 h-2 rounded-full bg-lavender animate-neon-pulse" />
                <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: colors.accent }}>How it works</span>
              </span>
              <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] mt-4 mb-4" style={{ color: colors.h1 }}>
                Three steps to <span className="text-gradient-lavender">full context.</span>
              </h2>
              <p className="text-lg font-semibold max-w-xl leading-relaxed" style={{ color: colors.body }}>
                From zero to fully operational in minutes — your team will be running on EduTechExOS before lunch.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const demo = demoContent[i];
              return (
                <AnimatedSection key={step.id} direction="up" delay={i * 0.15}>
                  <div
                    className="group relative p-8 rounded-2xl transition-all duration-700 hover:scale-[1.02] cursor-default"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ background: 'linear-gradient(135deg, rgba(45,106,79,0.04), rgba(196,181,253,0.03))' }}
                    />
                    <div className="relative flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
                        <Icon size={24} className="text-primary" />
                      </div>
                      <span className="font-mono text-3xl font-bold" style={{ color: `${colors.muted}40` }}>{step.number}</span>
                    </div>

                    <h3 className="font-display font-bold text-xl mb-3 group-hover:text-primary transition-colors duration-300" style={{ color: colors.h1 }}>
                      {step.title}
                    </h3>
                    <p className="text-sm font-semibold leading-relaxed mb-8" style={{ color: colors.body }}>
                      {step.description}
                    </p>

                    <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                      {demo.type === 'avatars' && (
                        <div className="flex -space-x-2">
                          {demo.items.map((item, idx) => (
                            <div
                              key={item.label}
                              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-green-light flex items-center justify-center border-2 border-white/60 shadow-lg animate-float"
                              style={{ zIndex: 4 - idx, animationDelay: `${idx * 0.5}s` }}
                            >
                              <span className="text-[10px] font-bold text-white">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {demo.type === 'channels' && (
                        <div className="flex flex-col gap-2">
                          {demo.items.map((item) => (
                            <div key={item.label} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                              <span className="text-primary font-mono text-sm font-bold">#</span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold" style={{ color: colors.h1 }}>{item.label.replace('#', '')}</span>
                                <span className="text-[10px] font-semibold" style={{ color: colors.body }}>{item.sub}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {demo.type === 'ai' && (
                        <div className="flex flex-col gap-2.5">
                          {demo.items.map((item) => (
                            <div key={item.sub} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                              <span className="text-base">{item.label}</span>
                              <span className="text-xs font-bold" style={{ color: colors.h1 }}>{item.sub}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>

          <AnimatedSection direction="up" delay={0.5}>
            <div className="flex items-center justify-center gap-4 mt-14 font-mono text-xs">
              <span className="font-bold tracking-[0.25em]" style={{ color: colors.muted }}>FROM SETUP TO LIVE</span>
              <ArrowRight size={14} className="text-primary" />
              <span className="font-bold tracking-[0.25em]" style={{ color: colors.accent }}>&lt; 2 MINUTES</span>
            </div>
          </AnimatedSection>
        </GlassSection>
      </div>
    </section>
  );
}
