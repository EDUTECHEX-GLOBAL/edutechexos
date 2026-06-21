'use client';
import React from 'react';
import { Bot, CheckSquare, Newspaper, Zap, Shield, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const capabilities = [
  { name: 'AI Agent',        Icon: Bot,         desc: 'Ask anything about your projects' },
  { name: 'Task Extraction', Icon: CheckSquare, desc: 'Auto-surfaced action items' },
  { name: 'Daily Digest',    Icon: Newspaper,   desc: 'Morning context in minutes' },
  { name: 'Fast Search',     Icon: Zap,         desc: 'Instant org-wide knowledge lookup' },
  { name: 'Access Control',  Icon: Shield,      desc: 'Role-based channel permissions' },
  { name: 'Team Hub',        Icon: Users,       desc: 'All members in one workspace' },
];

function CapabilityCard({ cap }: { cap: typeof capabilities[0] }) {
  const { Icon } = cap;

  return (
    <div
      className="group flex flex-col items-center gap-3 text-center rounded-2xl p-5 transition-all duration-300"
      style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#111111';
        el.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#E5E5E5';
        el.style.transform = 'translateY(0)';
      }}
    >
      <div
        className="group-hover:scale-110"
        style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5', border: '1px solid #E5E5E5', transition: 'transform .3s, background .3s, border-color .3s' }}
      >
        <Icon size={22} style={{ color: '#111111' }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 13, color: '#111111', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {cap.name}
      </span>
      <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.55, color: '#737373', maxWidth: 110 }}>
        {cap.desc}
      </span>
    </div>
  );
}

export default function LandingTrustedBy() {
  return (
    <section id="trusted" className="relative py-24 px-6 lg:px-10 overflow-hidden" style={{ background: '#FAFAFA', borderTop: '1px solid #E5E5E5' }}>

      <div className="relative max-w-screen-xl mx-auto flex flex-col items-center">

        {/* Header */}
        <AnimatedSection direction="up">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 20, background: '#FFFFFF', border: '1px solid #E5E5E5', fontSize: 9.5, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#404040', fontFamily: "'JetBrains Mono', monospace", marginBottom: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4F46E5' }} />
              Capabilities
            </span>
            <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.4rem, 5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, color: '#111111', display: 'block', marginTop: 8 }}>
              Everything{' '}
              <span style={{ color: '#4F46E5' }}>built in.</span>
            </h2>
          </div>
        </AnimatedSection>

        {/* Capability cards */}
        <AnimatedSection direction="up" delay={0.15}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {capabilities.map((cap) => (
              <CapabilityCard key={cap.name} cap={cap} />
            ))}
          </div>
        </AnimatedSection>

        {/* Footer label */}
        <AnimatedSection direction="up" delay={0.35}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', color: '#A3A3A3', textAlign: 'center', marginTop: 48 }}>
            No context lost. Ever.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
