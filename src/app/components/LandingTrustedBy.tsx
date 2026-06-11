'use client';
import React, { useRef } from 'react';
import { Bot, CheckSquare, Newspaper, Zap, Shield, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

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
      className="group flex flex-col items-center gap-3 text-center rounded-2xl p-5 cursor-pointer transition-all duration-300"
      style={{ background: '#FFFFFF', border: '1.5px solid rgba(91,79,219,0.08)', boxShadow: '0 2px 12px rgba(91,79,219,0.06)' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${cap.accent}35`;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = `0 12px 32px ${cap.accent}18`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(91,79,219,0.08)';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 2px 12px rgba(91,79,219,0.06)';
      }}
    >
      <div
        className="group-hover:scale-110"
        style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cap.accent}12`, border: `1.5px solid ${cap.accent}25`, transition: 'transform .3s' }}
      >
        <Icon size={22} style={{ color: cap.accent }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 13, color: '#1A1B3A', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {cap.name}
      </span>
      <span style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.55, color: 'rgba(90,95,128,0.65)', maxWidth: 110 }}>
        {cap.desc}
      </span>
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: cap.accent, opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>
        tap to animate
      </span>
    </div>
  );
}

export default function LandingTrustedBy() {
  return (
    <section id="trusted" className="relative py-24 px-6 lg:px-10 overflow-hidden" style={{ background: '#F7F8FF' }}>
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Soft orbs */}
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, top: '-15%', right: '5%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,79,219,0.06) 0%, transparent 65%)', filter: 'blur(56px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 400, height: 400, bottom: '-10%', left: '10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,175,206,0.06) 0%, transparent 65%)', filter: 'blur(48px)' }} />

      <div className="relative max-w-screen-xl mx-auto flex flex-col items-center">

        {/* Header */}
        <AnimatedSection direction="up">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 20, background: 'rgba(91,79,219,0.08)', border: '1px solid rgba(91,79,219,0.16)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#5B4FDB', fontFamily: "'JetBrains Mono', monospace", marginBottom: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#5B4FDB', boxShadow: '0 0 6px rgba(91,79,219,0.5)' }} />
              Capabilities
            </span>
            <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.4rem, 5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, color: '#1A1B3A', display: 'block', marginTop: 8 }}>
              Everything{' '}
              <span style={{ background: 'linear-gradient(135deg, #5B4FDB, #8B3FDB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                built in.
              </span>
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
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.35)', textAlign: 'center', marginTop: 48 }}>
            No context lost. Ever.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
