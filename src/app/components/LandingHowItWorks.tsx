'use client';
import React from 'react';
import { Users, MessageSquare, Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const steps = [
  {
    id: 'connect',
    number: '01',
    title: 'Connect your team',
    Icon: Users,
    accent: '#10D9A0',
    description: 'Invite team members, assign roles, and set up project channels in under two minutes. Everyone lands in #general automatically — zero configuration needed.',
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          {[['AK','#3E4A89'],['SA','#6366F1'],['TM','#0d7490'],['JM','#7c3aed']].map(([l,c], i) => (
            <div key={l as string} style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c as string, color: '#fff', fontSize: 11, fontWeight: 800, border: '2px solid #0A1020', marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i, boxShadow: '0 4px 12px rgba(0,0,0,0.40)' }}>{l}</div>
          ))}
          <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', color: 'rgba(238,240,248,0.50)', fontSize: 11, fontWeight: 800, border: '2px solid #0A1020', marginLeft: -10, zIndex: 0 }}>+3</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(238,240,248,0.45)', letterSpacing: '.06em' }}>7 team members · 3 roles · 1 workspace</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Developer', 'Designer', 'Lead'].map(role => (
            <span key={role} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#10D9A0', background: 'rgba(16,217,160,0.10)', padding: '4px 10px', borderRadius: 20, fontFamily: "'JetBrains Mono', monospace" }}>{role}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'communicate',
    number: '02',
    title: 'Communicate in channels',
    Icon: MessageSquare,
    accent: '#6366F1',
    description: 'Use dedicated channels for every project. Every message is indexed and fed into the AI context so nothing is ever lost — the AI knows your team\'s full history.',
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { name: '#general', sub: 'Team hub', color: '#F0A028' },
          { name: '#curriculum', sub: 'Project channel', color: '#6366F1' },
          { name: '#ai-digest', sub: 'AI output', color: '#10D9A0' },
        ].map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, boxShadow: `0 0 6px ${c.color}80` }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#EEF0F8', flex: 1 }}>{c.name}</span>
            <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(238,240,248,0.35)', letterSpacing: '.06em' }}>{c.sub}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'ai',
    number: '03',
    title: 'AI handles the rest',
    Icon: Sparkles,
    accent: '#F0A028',
    description: 'AI extracts tasks, generates the morning digest, answers questions with channel citations, and keeps the knowledge base current — automatically, every single day.',
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { icon: '⚡', text: 'Extracted 3 tasks from #curriculum', color: '#F0A028' },
          { icon: '🗞', text: 'Morning digest ready — 10 Jun 2026', color: '#6366F1' },
          { icon: '✓', text: 'Knowledge base updated with 2 new pages', color: '#10D9A0' },
        ].map(item => (
          <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(238,240,248,0.72)', flex: 1, lineHeight: 1.4 }}>{item.text}</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: `0 0 6px ${item.color}60` }} />
          </div>
        ))}
      </div>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden" style={{ background: '#07090F' }}>
      {/* dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Orbs */}
      <div className="absolute pointer-events-none" style={{ width: 480, height: 480, top: '5%', right: '-8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)', filter: 'blur(56px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 380, height: 380, bottom: '5%', left: '-6%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,40,0.05) 0%, transparent 65%)', filter: 'blur(48px)' }} />

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <AnimatedSection direction="up">
          <div className="pt-28 pb-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F0A028', display: 'inline-block' }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>How it works</span>
              </div>
              <h2 style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.92, color: '#EEF0F8' }}>
                Three steps<br />
                <span style={{ color: '#6366F1' }}>to full</span><br />
                context.
              </h2>
            </div>
            <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: 'rgba(238,240,248,0.42)', maxWidth: '36ch' }}>
              From zero to fully operational in minutes — your team will be running on EduTechExOS before lunch.
            </p>
          </div>
        </AnimatedSection>

        {/* Steps */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {steps.map((step, i) => {
            const { Icon } = step;
            const isEven = i % 2 === 1;
            return (
              <AnimatedSection key={step.id} direction="up" delay={i * 0.1}>
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-0`}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {/* Text side */}
                  <div
                    className={`relative flex flex-col justify-center px-8 lg:px-16 py-16 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}
                    style={{
                      borderRight: isEven ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      borderLeft: isEven ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    }}
                  >
                    {/* Big bg number */}
                    <span style={{ position: 'absolute', right: 24, bottom: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: '7rem', fontWeight: 900, color: 'rgba(255,255,255,0.025)', letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
                      {step.number}
                    </span>

                    {/* Step badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: step.accent + '18', border: `1px solid ${step.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} style={{ color: step.accent }} />
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: step.accent }}>
                        Step {step.number}
                      </span>
                    </div>

                    <h3 style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: '#EEF0F8', marginBottom: 16 }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.72, color: 'rgba(238,240,248,0.48)', maxWidth: '38ch' }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Demo side */}
                  <div
                    className={`flex flex-col justify-center px-8 lg:px-16 py-16 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div style={{ padding: 24, borderRadius: 16, background: '#0A1020', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.30)' }}>
                      {step.demo}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        {/* Bottom label */}
        <AnimatedSection direction="up" delay={0.4}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '56px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.30)', whiteSpace: 'nowrap' }}>From setup to live</span>
            <span style={{ fontWeight: 900, letterSpacing: '.22em', color: '#F0A028', whiteSpace: 'nowrap' }}>— &lt; 2 MINUTES</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
