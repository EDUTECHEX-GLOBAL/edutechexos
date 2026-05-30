'use client';
import React from 'react';
import { ArrowRight, Users, MessageSquare, Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const steps = [
  {
    id: 'step-connect',
    number: '01',
    title: 'Connect your team',
    icon: Users,
    description: 'Invite team members, assign roles, and set up project channels in under two minutes.',
    demo: {
      type: 'avatars' as const,
      items: [
        { label: 'VK', color: '#1a3a2a' },
        { label: 'RA', color: '#4f46e5' },
        { label: 'TM', color: '#0d7490' },
        { label: 'SA', color: '#7c3aed' },
      ],
    },
  },
  {
    id: 'step-communicate',
    number: '02',
    title: 'Communicate in channels',
    icon: MessageSquare,
    description: 'Use dedicated channels for every project. Every message is indexed and fed into the AI context window.',
    demo: {
      type: 'channels' as const,
      items: [
        { label: '#skillnaav',        sub: 'Project channel' },
        { label: '#edutechexassessa', sub: 'Project channel' },
        { label: '#general',          sub: 'Team hub'        },
      ],
    },
  },
  {
    id: 'step-ai',
    number: '03',
    title: 'AI handles the rest',
    icon: Sparkles,
    description: 'AI extracts tasks, generates the morning digest, answers questions, and keeps the knowledge base current.',
    demo: {
      type: 'ai' as const,
      items: [
        { emoji: '🤖', text: 'Extracted 3 tasks from #skillnaav'  },
        { emoji: '📋', text: 'Morning digest ready — 30 May'       },
      ],
    },
  },
];

export default function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-28 px-6 lg:px-10 overflow-hidden"
      style={{ background: '#e8e3d8' }}
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
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #e8e3d8 20%, transparent 75%)',
        }}
      />

      <div className="relative max-w-screen-xl mx-auto">

        {/* Header */}
        <AnimatedSection direction="up">
          <div className="mb-16">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.18em] mb-6"
              style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)', color: '#4f46e5' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4f46e5' }} />
              How it works
            </span>
            <h2
              className="font-black tracking-[-0.03em] leading-[0.92] mb-5"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4.5rem)', color: '#1a2e1a' }}
            >
              Three steps to<br />full context.
            </h2>
            <p className="text-base font-medium max-w-lg leading-relaxed" style={{ color: '#4d5d4d' }}>
              From zero to fully operational in minutes — your team will be running on EduTechExOS before lunch.
            </p>
          </div>
        </AnimatedSection>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <AnimatedSection key={step.id} direction="up" delay={i * 0.12}>
                <div
                  className="group relative p-8 rounded-2xl cursor-default transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Step number */}
                  <span
                    className="absolute top-7 right-8 font-mono text-4xl font-black"
                    style={{ color: 'rgba(0,0,0,0.06)' }}
                  >
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(26,58,42,0.10)' }}
                  >
                    <Icon size={22} style={{ color: '#1a3a2a' }} />
                  </div>

                  <h3 className="font-bold text-lg mb-3" style={{ color: '#1a2e1a' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-7" style={{ color: '#4d5d4d' }}>
                    {step.description}
                  </p>

                  {/* Demo preview */}
                  <div
                    className="rounded-xl p-4"
                    style={{ background: '#f5f1ea', border: '1px solid rgba(0,0,0,0.06)' }}
                  >
                    {step.demo.type === 'avatars' && (
                      <div className="flex -space-x-2">
                        {step.demo.items.map((item, idx) => (
                          <div
                            key={item.label}
                            className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white text-white text-[10px] font-bold shadow-sm"
                            style={{ background: item.color, zIndex: 4 - idx }}
                          >
                            {item.label}
                          </div>
                        ))}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white text-[10px] font-bold shadow-sm"
                          style={{ background: '#f0ede5', color: '#4d5d4d', zIndex: 0 }}
                        >
                          +4
                        </div>
                      </div>
                    )}
                    {step.demo.type === 'channels' && (
                      <div className="flex flex-col gap-2">
                        {step.demo.items.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                            style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)' }}
                          >
                            <span className="font-mono text-sm font-bold" style={{ color: '#1a3a2a' }}>#</span>
                            <div>
                              <div className="text-xs font-bold" style={{ color: '#1a2e1a' }}>{item.label.replace('#', '')}</div>
                              <div className="text-[10px]" style={{ color: '#6b7b6b' }}>{item.sub}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {step.demo.type === 'ai' && (
                      <div className="flex flex-col gap-2">
                        {step.demo.items.map((item) => (
                          <div
                            key={item.text}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                            style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)' }}
                          >
                            <span className="text-base leading-none">{item.emoji}</span>
                            <span className="text-xs font-medium" style={{ color: '#1a2e1a' }}>{item.text}</span>
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

        {/* Bottom label */}
        <AnimatedSection direction="up" delay={0.4}>
          <div className="flex items-center justify-center gap-3 mt-14 font-mono text-xs">
            <span className="font-bold tracking-[0.22em]" style={{ color: '#6b7b6b' }}>FROM SETUP TO LIVE</span>
            <ArrowRight size={13} style={{ color: '#1a3a2a' }} />
            <span className="font-bold tracking-[0.22em]" style={{ color: '#1a3a2a' }}>&lt; 2 MINUTES</span>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
