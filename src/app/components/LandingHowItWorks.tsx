'use client';
import React from 'react';
import { Users, MessageSquare, Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const steps = [
  {
    id: 'step-connect',
    number: '01',
    title: 'Connect your team',
    icon: Users,
    description: 'Invite team members, assign roles, and set up project channels in under two minutes. Everyone lands in #general automatically.',
    demo: (
      <div className="flex flex-col gap-3">
        <div className="flex -space-x-3 mb-2">
          {[['VK','#191E2F'],['RA','#4f46e5'],['TM','#0d7490'],['SA','#2A3568']].map(([l,c],i) => (
            <div key={l} className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white text-white text-xs font-bold shadow" style={{ background: c, zIndex: 4-i }}>
              {l}
            </div>
          ))}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white text-xs font-bold shadow" style={{ background: '#FAF8F5', color: '#4A5578', zIndex: 0 }}>+3</div>
        </div>
        <div className="text-xs font-medium" style={{ color: '#4A5578' }}>7 team members · 3 roles · 1 workspace</div>
      </div>
    ),
  },
  {
    id: 'step-communicate',
    number: '02',
    title: 'Communicate in channels',
    icon: MessageSquare,
    description: 'Use dedicated channels for every project. Every message is indexed and fed into the AI context window so nothing is ever lost.',
    demo: (
      <div className="flex flex-col gap-2.5">
        {[
          { name: 'skillnaav',        sub: 'Project channel', dot: '#3E4A89' },
          { name: 'edutechexassessa', sub: 'Project channel', dot: '#4f46e5' },
          { name: 'general',          sub: 'Team hub',        dot: '#2A3568' },
        ].map((c) => (
          <div key={c.name} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
            <span className="font-mono text-sm font-bold" style={{ color: '#1E2636' }}>#{c.name}</span>
            <span className="ml-auto text-[10px] font-medium" style={{ color: '#4A5578' }}>{c.sub}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'step-ai',
    number: '03',
    title: 'AI handles the rest',
    icon: Sparkles,
    description: 'AI extracts tasks, generates the morning digest, answers questions, and keeps the knowledge base current — automatically, every day.',
    demo: (
      <div className="flex flex-col gap-2.5">
        {[
          { emoji: '🤖', text: 'Extracted 3 tasks from #skillnaav',  color: '#3E4A89' },
          { emoji: '📋', text: 'Morning digest ready — 30 May 2026', color: '#4f46e5' },
          { emoji: '🔍', text: 'Wiki updated with 2 new pages',      color: '#2A3568' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)' }}>
            <span className="text-base leading-none">{item.emoji}</span>
            <span className="text-xs font-medium flex-1" style={{ color: '#1E2636' }}>{item.text}</span>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
          </div>
        ))}
      </div>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden"
      style={{ background: '#F2F0EC' }}
    >
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(62,74,137,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(62,74,137,0.06) 1px, transparent 1px)`,
        backgroundSize: '52px 52px',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #F2F0EC 20%, transparent 75%)',
      }} />

      {/* Animated orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', width:520, height:520, borderRadius:'50%', background:'radial-gradient(circle, rgba(62,74,137,0.10) 0%, transparent 65%)', filter:'blur(52px)', top:'10%', right:'-10%', animation:'hiw-orb-1 25s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', width:440, height:440, borderRadius:'50%', background:'radial-gradient(circle, rgba(42,53,104,0.07) 0%, transparent 65%)', filter:'blur(56px)', bottom:'10%', left:'-8%', animation:'hiw-orb-2 32s ease-in-out infinite 6s', willChange:'transform' }} />
      </div>
      <style>{`
        @keyframes hiw-orb-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-100px,80px) scale(1.13); }
          72%      { transform: translate(60px,-50px) scale(0.89); }
        }
        @keyframes hiw-orb-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          35%      { transform: translate(110px,-90px) scale(1.17); }
          68%      { transform: translate(-70px,70px) scale(0.90); }
        }
      `}</style>

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10">

        {/* ── Section header ───────────────────────────────────────── */}
        <AnimatedSection direction="up">
          <div className="pt-28 pb-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <span className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#4A5578' }}>How it works</span>
                <div className="h-px w-16" style={{ background: 'rgba(0,0,0,0.12)' }} />
              </div>
              <h2
                className="font-black tracking-[-0.035em] leading-[0.90]"
                style={{ fontSize: 'clamp(2.8rem, 5.5vw, 5rem)', color: '#1E2636' }}
              >
                Three steps<br />
                <span style={{ color: '#3E4A89' }}>to full</span><br />
                context.
              </h2>
            </div>
            <p className="text-base font-medium max-w-sm leading-relaxed" style={{ color: '#4A5578' }}>
              From zero to fully operational in minutes — your team will be running on EduTechExOS before lunch.
            </p>
          </div>
        </AnimatedSection>

        {/* ── Alternating step rows ─────────────────────────────────── */}
        <div className="flex flex-col" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isEven = i % 2 === 1;
            return (
              <AnimatedSection key={step.id} direction="up" delay={i * 0.1}>
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-0 ${isEven ? 'lg:flex-row-reverse' : ''}`}
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}
                >
                  {/* Text side */}
                  <div className={`relative flex flex-col justify-center px-8 lg:px-16 py-16 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}
                    style={{ borderRight: isEven ? 'none' : '1px solid rgba(0,0,0,0.08)', borderLeft: isEven ? '1px solid rgba(0,0,0,0.08)' : 'none' }}>
                    {/* Big background number */}
                    <span
                      className="absolute right-6 bottom-4 font-mono font-black pointer-events-none select-none leading-none"
                      style={{ fontSize: '8rem', color: 'rgba(0,0,0,0.04)', letterSpacing: '-0.05em' }}
                    >
                      {step.number}
                    </span>

                    {/* Step badge */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#191E2F' }}>
                        <Icon size={18} color="white" />
                      </div>
                      <span className="font-mono text-xs font-bold tracking-[0.18em] uppercase" style={{ color: '#4A5578' }}>
                        Step {step.number}
                      </span>
                    </div>

                    <h3
                      className="font-black mb-4 leading-tight tracking-[-0.025em]"
                      style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#1E2636' }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-base font-medium leading-relaxed" style={{ color: '#4A5578', maxWidth: '38ch' }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Demo side */}
                  <div
                    className={`flex flex-col justify-center px-8 lg:px-16 py-16 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                    style={{ background: 'rgba(62,74,137,0.04)' }}
                  >
                    <div
                      className="rounded-2xl p-6"
                      style={{ background: '#FAF8F5', border: '1px solid rgba(62,74,137,0.10)' }}
                    >
                      {step.demo}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        {/* ── Bottom label ──────────────────────────────────────────── */}
        <AnimatedSection direction="up" delay={0.4}>
          <div className="flex items-center justify-center gap-4 py-14 font-mono text-xs">
            <div className="h-px flex-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
            <span className="font-bold tracking-[0.22em] uppercase" style={{ color: '#4A5578' }}>From setup to live</span>
            <span className="font-black tracking-[0.22em]" style={{ color: '#3E4A89' }}>— &lt; 2 MINUTES</span>
            <div className="h-px flex-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
