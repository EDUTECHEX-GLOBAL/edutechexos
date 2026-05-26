'use client';
import React from 'react';
import { ArrowRight, Users, MessageSquare, Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const steps = [
  {
    id: 'step-connect', number: '01', title: 'Connect your team', icon: Users,
    description: 'Invite team members, assign roles, and set up project channels in under two minutes.',
  },
  {
    id: 'step-communicate', number: '02', title: 'Communicate in channels', icon: MessageSquare,
    description: 'Use dedicated channels for each project. Every message is indexed and fed into the AI context window.',
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
    items: [{ label: '#skillnaav', sub: 'Project channel' }, { label: '#edutechexassessa', sub: 'Project channel' }, { label: '#general', sub: 'Team hub' }],
  },
  {
    type: 'ai' as const,
    items: [{ label: '🤖', sub: 'Extracted 3 tasks from #skillnaav' }, { label: '📋', sub: 'Morning digest ready — 6 May' }],
  },
];

export default function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 py-24 overflow-hidden bg-dark"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-dark via-dark to-primary-dark/10 pointer-events-none" />
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-gradient-radial from-lavender/4 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto">
        <AnimatedSection direction="up">
          <div className="max-w-3xl mb-20">
            <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-accent/8 backdrop-blur-xl mb-8">
              <span className="w-2 h-2 rounded-full bg-lavender animate-neon-pulse" />
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-lavender uppercase">How it works</span>
            </span>
            <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] text-dark-foreground mt-4 mb-4">
              Three steps to <span className="text-gradient-lavender">full context.</span>
            </h2>
            <p className="text-lg text-dark-muted font-medium max-w-xl leading-relaxed">
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
                  className="group relative p-8 rounded-3xl transition-all duration-700 hover:scale-[1.02] cursor-default"
                  style={{
                    backgroundColor: 'rgba(34,34,58,0.4)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(45,106,79,0.08), rgba(124,58,237,0.04))' }}
                  />
                  <div className="relative flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <Icon size={24} className="text-primary-light" />
                    </div>
                    <span className="font-mono text-3xl font-bold" style={{ color: 'rgba(255,255,255,0.08)' }}>{step.number}</span>
                  </div>

                  <h3 className="font-display font-bold text-xl text-dark-foreground mb-3 group-hover:text-primary-light transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-sm text-dark-muted font-medium leading-relaxed mb-8">{step.description}</p>

                  <div
                    className="rounded-2xl p-5 transition-all duration-500"
                    style={{ backgroundColor: 'rgba(26,26,46,0.6)' }}
                  >
                    {demo.type === 'avatars' && (
                      <div className="flex -space-x-2">
                        {demo.items.map((item, idx) => (
                          <div key={item.label} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-green-light flex items-center justify-center border-2 border-dark-surface shadow-lg" style={{ zIndex: 4 - idx }}>
                            <span className="text-[10px] font-bold text-white">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {demo.type === 'channels' && (
                      <div className="flex flex-col gap-2">
                        {demo.items.map((item) => (
                          <div key={item.label} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-300"
                            style={{ backgroundColor: 'rgba(34,34,58,0.6)' }}
                          >
                            <span className="text-primary-light font-mono text-sm font-bold">#</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-dark-foreground">{item.label.replace('#', '')}</span>
                              <span className="text-[10px] text-dark-muted font-semibold">{item.sub}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {demo.type === 'ai' && (
                      <div className="flex flex-col gap-2.5">
                        {demo.items.map((item) => (
                          <div key={item.sub} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300"
                            style={{ backgroundColor: 'rgba(34,34,58,0.6)' }}
                          >
                            <span className="text-base">{item.label}</span>
                            <span className="text-xs font-bold text-dark-foreground">{item.sub}</span>
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
          <div className="flex items-center justify-center gap-4 mt-16 font-mono text-xs">
            <span className="text-dark-muted font-bold tracking-[0.25em]">FROM SETUP TO LIVE</span>
            <ArrowRight size={14} className="text-primary-light" />
            <span className="text-primary-light font-bold tracking-[0.25em]">&lt; 2 MINUTES</span>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
