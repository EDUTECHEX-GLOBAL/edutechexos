'use client';
import React, { useRef } from 'react';
import { Bot, CheckSquare, Newspaper, Zap, Shield, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { DecoEyebrow } from './LandingDeco';

const capabilities = [
  { name: 'AI Agent',        Icon: Bot,         desc: 'Ask anything about your projects',        accent: '#5B4FDB', animClass: 'click-neural-pulse' },
  { name: 'Task Extraction', Icon: CheckSquare, desc: 'Auto-surfaced action items',               accent: '#10C98A', animClass: 'click-card-flip'    },
  { name: 'Daily Digest',    Icon: Newspaper,   desc: 'Morning context in minutes',               accent: '#0DAFCE', animClass: 'click-page-unfold'  },
  { name: 'Fast Search',     Icon: Zap,         desc: 'Instant org-wide knowledge lookup',        accent: '#F59E0B', animClass: 'click-bar-rise'     },
  { name: 'Access Control',  Icon: Shield,      desc: 'Role-based channel permissions',           accent: '#EF476F', animClass: 'click-spotlight'    },
  { name: 'Team Hub',        Icon: Users,       desc: 'All members in one workspace',             accent: '#8B3FDB', animClass: 'click-slide-deck'   },
];

function CapabilityCard({ cap }: { cap: typeof capabilities[0] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { Icon } = cap;

  function handleClick() {
    const el = ref.current;
    if (!el) return;
    el.classList.remove(cap.animClass);
    void el.offsetWidth;
    el.classList.add(cap.animClass);
    setTimeout(() => el.classList.remove(cap.animClass), 600);
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className="group flex flex-col items-center gap-4 text-center rounded-2xl p-6 cursor-pointer transition-all duration-300"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = cap.accent;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = `0 12px 24px ${cap.accent}0a, 0 4px 12px rgba(0, 0, 0, 0.04)`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#E5E7EB';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.02)';
      }}
    >
      <div
        className="group-hover:scale-110"
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${cap.accent}0a`,
          color: cap.accent,
          transition: 'all .3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        <Icon size={20} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 13, color: '#111827', letterSpacing: '-0.01em', fontFamily: "'Inter', sans-serif" }}>
        {cap.name}
      </span>
      <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.55, color: '#6B7280', maxWidth: 120 }}>
        {cap.desc}
      </span>
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: cap.accent, opacity: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>
        tap to animate
      </span>
    </div>
  );
}

export default function LandingTrustedBy() {
  return (
    <section id="trusted" className="relative py-24 px-6 lg:px-10 overflow-hidden" style={{ background: '#E4E6F8' }}>
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Soft orbs */}
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, top: '-15%', right: '5%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,79,219,0.03) 0%, transparent 65%)', filter: 'blur(56px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 400, height: 400, bottom: '-10%', left: '10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,175,206,0.03) 0%, transparent 65%)', filter: 'blur(48px)' }} />

      <div className="relative max-w-screen-xl mx-auto flex flex-col items-center">

        {/* Header */}
        <AnimatedSection direction="up">
          <div style={{ textAlign: 'center', marginBottom: 56, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <DecoEyebrow label="Capabilities" align="center" />
            </div>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#111827', display: 'block', marginTop: 8 }}>
              Everything{' '}
              <span style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                built in.
              </span>
            </h2>
          </div>
        </AnimatedSection>

        {/* Capability cards */}
        <AnimatedSection direction="up" delay={0.15}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
            {capabilities.map((cap) => (
              <CapabilityCard key={cap.name} cap={cap} />
            ))}
          </div>
        </AnimatedSection>

        {/* Footer label */}
        <AnimatedSection direction="up" delay={0.35}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', color: '#9CA3AF', textAlign: 'center', marginTop: 48 }}>
            No context lost. Ever.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
