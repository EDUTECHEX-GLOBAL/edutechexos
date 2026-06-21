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
    description: 'Invite team members, assign roles, and set up project channels in under two minutes. Everyone lands in #general automatically — zero configuration needed.',
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          {['AK', 'SA', 'TM', 'JM'].map((l, i) => (
            <div key={l} style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111111', color: '#fff', fontSize: 12, fontWeight: 800, border: '2.5px solid #FFFFFF', marginLeft: i === 0 ? 0 : -12, zIndex: 4 - i, boxShadow: '0 4px 12px rgba(17,17,17,0.10)' }}>{l}</div>
          ))}
          <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4F46E5', color: '#FFFFFF', fontSize: 12, fontWeight: 800, border: '2.5px solid #FFFFFF', marginLeft: -12, zIndex: 0 }}>+3</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#737373', letterSpacing: '.04em' }}>7 team members · 3 roles · 1 workspace</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Developer', 'Designer', 'Lead'].map(role => (
            <span key={role} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#404040', background: '#F5F5F5', border: '1px solid #E5E5E5', padding: '5px 12px', borderRadius: 20, fontFamily: "'JetBrains Mono', monospace" }}>{role}</span>
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
    description: "Use dedicated channels for every project. Every message is indexed and fed into the AI context so nothing is ever lost — the AI knows your team's full history.",
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { name: '#general', sub: 'Team hub' },
          { name: '#curriculum', sub: 'Project channel' },
          { name: '#ai-digest', sub: 'AI output' },
        ].map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5', flexShrink: 0 }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#111111', flex: 1 }}>{c.name}</span>
            <span style={{ fontSize: 9.5, fontWeight: 500, color: '#A3A3A3', letterSpacing: '.04em' }}>{c.sub}</span>
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
    description: 'AI extracts tasks, generates the morning digest, answers questions with channel citations, and keeps the knowledge base current — automatically, every single day.',
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          'Extracted 3 tasks from #curriculum',
          'Morning digest ready — 11 Jun 2026',
          'Knowledge base updated — 2 new pages',
        ].map(text => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5', flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, fontWeight: 500, color: '#111111', flex: 1, lineHeight: 1.4 }}>{text}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden" style={{ background: '#FAFAFA' }}>

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <AnimatedSection direction="up">
          <div className="pt-28 pb-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>How it works</span>
              </div>
              <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.92, color: '#111111' }}>
                Three steps<br />
                <span style={{ color: '#4F46E5' }}>to full</span><br />
                context.
              </h2>
            </div>
            <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: '#525252', maxWidth: '36ch' }}>
              From zero to fully operational in minutes — your team will be running on EduTechExOS before lunch.
            </p>
          </div>
        </AnimatedSection>

        {/* Steps */}
        <div style={{ borderTop: '1px solid #E5E5E5' }}>
          {steps.map((step, i) => {
            const { Icon } = step;
            const isEven = i % 2 === 1;
            return (
              <AnimatedSection key={step.id} direction="up" delay={i * 0.1}>
                <div
                  className="grid grid-cols-1 lg:grid-cols-2 gap-0"
                  style={{ borderBottom: '1px solid #E5E5E5' }}
                >
                  {/* Text side */}
                  <div
                    className={`relative flex flex-col justify-center px-8 lg:px-16 py-16 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}
                    style={{
                      background: '#FFFFFF',
                      borderRight: isEven ? 'none' : '1px solid #E5E5E5',
                      borderLeft: isEven ? '1px solid #E5E5E5' : 'none',
                    }}
                  >
                    {/* Big bg number */}
                    <span style={{ position: 'absolute', right: 24, bottom: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: '7rem', fontWeight: 900, color: '#F5F5F5', letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
                      {step.number}
                    </span>

                    {/* Step badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, position: 'relative' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 13, background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={20} style={{ color: '#FFFFFF' }} />
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#4F46E5' }}>
                        Step {step.number}
                      </span>
                    </div>

                    <h3 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: '#111111', marginBottom: 16, position: 'relative' }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.72, color: '#737373', maxWidth: '38ch', position: 'relative' }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Demo side */}
                  <div
                    className={`flex flex-col justify-center px-8 lg:px-16 py-16 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                    style={{ background: '#FAFAFA' }}
                  >
                    <div style={{ padding: 24, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E5E5E5', boxShadow: '0 8px 24px rgba(17,17,17,0.04)' }}>
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
            <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
            <span style={{ fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#A3A3A3', whiteSpace: 'nowrap' }}>From setup to live</span>
            <span style={{ fontWeight: 900, letterSpacing: '.22em', color: '#4F46E5', whiteSpace: 'nowrap' }}>— &lt; 2 MINUTES</span>
            <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
