'use client';
import React from 'react';
import { Bot, CheckSquare, Newspaper, Zap, Shield, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const capabilities = [
  { name: 'AI Agent', Icon: Bot, desc: 'Ask anything about your projects', accent: '#6366F1' },
  { name: 'Task Extraction', Icon: CheckSquare, desc: 'Auto-surfaced action items', accent: '#F0A028' },
  { name: 'Daily Digest', Icon: Newspaper, desc: 'Morning context in minutes', accent: '#10D9A0' },
  { name: 'Fast Search', Icon: Zap, desc: 'Instant org-wide knowledge lookup', accent: '#F0A028' },
  { name: 'Access Control', Icon: Shield, desc: 'Role-based channel permissions', accent: '#818CF8' },
  { name: 'Team Hub', Icon: Users, desc: 'All members in one workspace', accent: '#10D9A0' },
];

export default function LandingTrustedBy() {
  return (
    <section id="trusted" className="relative py-24 px-6 lg:px-10 overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Orbs */}
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, top: '-15%', right: '5%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)', filter: 'blur(56px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 400, height: 400, bottom: '-10%', left: '10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,40,0.05) 0%, transparent 65%)', filter: 'blur(48px)' }} />

      <div className="relative max-w-screen-xl mx-auto flex flex-col items-center">

        {/* Header */}
        <AnimatedSection direction="up">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 20, background: 'rgba(240,160,40,0.10)', border: '1px solid rgba(240,160,40,0.20)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#F0A028', fontFamily: "'JetBrains Mono', monospace", marginBottom: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F0A028', boxShadow: '0 0 6px rgba(240,160,40,0.6)' }} />
              Capabilities
            </span>
            <h2 style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(2.4rem, 5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, color: '#EEF0F8', display: 'block' }}>
              Everything{' '}
              <span style={{ color: '#F0A028' }}>built in.</span>
            </h2>
          </div>
        </AnimatedSection>

        {/* Capability cards */}
        <AnimatedSection direction="up" delay={0.15}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {capabilities.map((cap) => {
              const { Icon } = cap;
              return (
                <div
                  key={cap.name}
                  className="group flex flex-col items-center gap-3 text-center rounded-2xl p-5 cursor-default transition-all duration-300"
                  style={{ background: '#0A1020', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${cap.accent}30`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px ${cap.accent}20`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.25)'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cap.accent}15`, border: `1px solid ${cap.accent}25`, transition: 'transform .3s' }} className="group-hover:scale-110">
                    <Icon size={20} style={{ color: cap.accent }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#EEF0F8', letterSpacing: '-0.01em' }}>{cap.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.5, color: 'rgba(238,240,248,0.40)', maxWidth: 110 }}>{cap.desc}</span>
                </div>
              );
            })}
          </div>
        </AnimatedSection>

        {/* Footer label */}
        <AnimatedSection direction="up" delay={0.35}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.25)', textAlign: 'center', marginTop: 48 }}>
            No context lost. Ever.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
