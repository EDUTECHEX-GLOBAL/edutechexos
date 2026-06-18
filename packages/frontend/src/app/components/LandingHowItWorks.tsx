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
    accent: '#10C98A',
    accentBg: 'rgba(16,201,138,0.10)',
    accentBorder: 'rgba(16,201,138,0.20)',
    sectionBg: '#ECFDF5',
    description: 'Invite team members, assign roles, and set up project channels in under two minutes. Everyone lands in #general automatically — zero configuration needed.',
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          {[['AK', '#5B4FDB'], ['SA', '#0DAFCE'], ['TM', '#10C98A'], ['JM', '#8B3FDB']].map(([l, c], i) => (
            <div key={l as string} style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c as string, color: '#fff', fontSize: 12, fontWeight: 800, border: '2.5px solid #ECFDF5', marginLeft: i === 0 ? 0 : -12, zIndex: 4 - i, boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}>{l}</div>
          ))}
          <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,201,138,0.12)', color: '#10C98A', fontSize: 12, fontWeight: 800, border: '2.5px solid #ECFDF5', marginLeft: -12, zIndex: 0 }}>+3</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(90,95,128,0.70)', letterSpacing: '.04em' }}>7 team members · 3 roles · 1 workspace</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Developer', 'Designer', 'Lead'].map(role => (
            <span key={role} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#10C98A', background: 'rgba(16,201,138,0.12)', border: '1px solid rgba(16,201,138,0.22)', padding: '5px 12px', borderRadius: 20, fontFamily: "'JetBrains Mono', monospace" }}>{role}</span>
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
    accent: '#0DAFCE',
    accentBg: 'rgba(13,175,206,0.10)',
    accentBorder: 'rgba(13,175,206,0.20)',
    sectionBg: '#E8F8FD',
    description: "Use dedicated channels for every project. Every message is indexed and fed into the AI context so nothing is ever lost — the AI knows your team's full history.",
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { name: '#general', sub: 'Team hub', color: '#5B4FDB' },
          { name: '#curriculum', sub: 'Project channel', color: '#0DAFCE' },
          { name: '#ai-digest', sub: 'AI output', color: '#8B3FDB' },
        ].map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#FFFFFF', border: `1.5px solid ${c.color}22`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, boxShadow: `0 0 6px ${c.color}60` }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#1A1B3A', flex: 1 }}>{c.name}</span>
            <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(90,95,128,0.50)', letterSpacing: '.04em' }}>{c.sub}</span>
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
    accent: '#8B3FDB',
    accentBg: 'rgba(139,63,219,0.10)',
    accentBorder: 'rgba(139,63,219,0.20)',
    sectionBg: '#F3E8FF',
    description: 'AI extracts tasks, generates the morning digest, answers questions with channel citations, and keeps the knowledge base current — automatically, every single day.',
    demo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { icon: '⚡', text: 'Extracted 3 tasks from #curriculum', color: '#F59E0B' },
          { icon: '🗞', text: 'Morning digest ready — 11 Jun 2026', color: '#0DAFCE' },
          { icon: '✓', text: 'Knowledge base updated — 2 new pages', color: '#10C98A' },
        ].map(item => (
          <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#FFFFFF', border: `1.5px solid ${item.color}22`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: '#1A1B3A', flex: 1, lineHeight: 1.4 }}>{item.text}</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: `0 0 6px ${item.color}60` }} />
          </div>
        ))}
      </div>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden" style={{ background: '#FFFFFF' }}>
      {/* Light dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Soft colorful orbs */}
      <div className="absolute pointer-events-none" style={{ width: 480, height: 480, top: '5%', right: '-8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,175,206,0.08) 0%, transparent 65%)', filter: 'blur(56px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 380, height: 380, bottom: '5%', left: '-6%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,79,219,0.07) 0%, transparent 65%)', filter: 'blur(48px)' }} />

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <AnimatedSection direction="up">
          <div className="pt-28 pb-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5B4FDB', display: 'inline-block', boxShadow: '0 0 8px rgba(91,79,219,0.5)' }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.60)', fontFamily: "'JetBrains Mono', monospace" }}>How it works</span>
              </div>
              <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.92, color: '#1A1B3A' }}>
                Three steps<br />
                <span style={{ background: 'linear-gradient(135deg, #0DAFCE, #5B4FDB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>to full</span><br />
                context.
              </h2>
            </div>
            <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: 'rgba(90,95,128,0.75)', maxWidth: '36ch' }}>
              From zero to fully operational in minutes — your team will be running on EduTechExOS before lunch.
            </p>
          </div>
        </AnimatedSection>

        {/* Steps */}
        <div style={{ borderTop: '1.5px solid rgba(26,27,58,0.14)' }}>
          {steps.map((step, i) => {
            const { Icon } = step;
            const isEven = i % 2 === 1;
            return (
              <AnimatedSection key={step.id} direction="up" delay={i * 0.1}>
                <div
                  className="grid grid-cols-1 lg:grid-cols-2 gap-0"
                  style={{ borderBottom: '1.5px solid rgba(26,27,58,0.14)' }}
                >
                  {/* Text side */}
                  <div
                    className={`relative flex flex-col justify-center px-8 lg:px-16 py-16 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}
                    style={{
                      borderRight: isEven ? 'none' : '1.5px solid rgba(26,27,58,0.14)',
                      borderLeft: isEven ? '1.5px solid rgba(26,27,58,0.14)' : 'none',
                    }}
                  >
                    {/* Big bg number */}
                    <span style={{ position: 'absolute', right: 24, bottom: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: '7rem', fontWeight: 900, color: `${step.accent}08`, letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
                      {step.number}
                    </span>

                    {/* Step badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 13, background: step.accentBg, border: `1.5px solid ${step.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${step.accent}18` }}>
                        <Icon size={20} style={{ color: step.accent }} />
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: step.accent }}>
                        Step {step.number}
                      </span>
                    </div>

                    <h3 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: '#1A1B3A', marginBottom: 16 }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.72, color: 'rgba(90,95,128,0.75)', maxWidth: '38ch' }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Demo side */}
                  <div
                    className={`flex flex-col justify-center px-8 lg:px-16 py-16 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                    style={{ background: step.sectionBg }}
                  >
                    <div style={{ padding: 24, borderRadius: 18, background: 'rgba(255,255,255,0.80)', border: `1.5px solid ${step.accentBorder}`, boxShadow: `0 8px 32px ${step.accent}10`, backdropFilter: 'blur(12px)' }}>
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
            <div style={{ flex: 1, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(91,79,219,0.15))', borderRadius: 1 }} />
            <span style={{ fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.45)', whiteSpace: 'nowrap' }}>From setup to live</span>
            <span style={{ fontWeight: 900, letterSpacing: '.22em', color: '#5B4FDB', whiteSpace: 'nowrap' }}>— &lt; 2 MINUTES</span>
            <div style={{ flex: 1, height: 1.5, background: 'linear-gradient(90deg, rgba(91,79,219,0.15), transparent)', borderRadius: 1 }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
