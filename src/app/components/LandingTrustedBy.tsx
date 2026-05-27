'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Bot, CheckSquare, Newspaper, Zap, Shield, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { useScrollColors } from './ScrollColorText';
import GlassSection from './GlassSection';

const capabilities = [
  { name: 'AI Agent',        icon: Bot,         desc: 'Ask anything about your projects',    color: '#7c3aed' },
  { name: 'Task Extraction', icon: CheckSquare, desc: 'Auto-surfaced action items',           color: '#2d6a4f' },
  { name: 'Daily Digest',    icon: Newspaper,   desc: 'Morning context in minutes',           color: '#0891b2' },
  { name: 'Fast Search',     icon: Zap,         desc: 'Instant org-wide knowledge lookup',   color: '#d97706' },
  { name: 'Access Control',  icon: Shield,      desc: 'Role-based channel permissions',       color: '#dc2626' },
  { name: 'Team Hub',        icon: Users,       desc: 'All members in one workspace',         color: '#059669' },
];

function CapabilityCard({ cap, index, colors }: {
  cap: (typeof capabilities)[0];
  index: number;
  colors: ReturnType<typeof useScrollColors>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Icon = cap.icon;

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-3 cursor-default text-center rounded-2xl p-5"
      style={{
        background: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: active ? `1.5px solid ${cap.color}44` : '1.5px solid rgba(255,255,255,0.6)',
        boxShadow: active
          ? `0 0 0 3px ${cap.color}14, 0 8px 28px ${cap.color}18`
          : '0 2px 12px rgba(0,0,0,0.04)',
        transform: active ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
        transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)',
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: active ? `${cap.color}18` : 'rgba(255,255,255,0.7)',
          border: active ? `1px solid ${cap.color}30` : '1px solid rgba(0,0,0,0.06)',
          transition: 'all 0.5s ease',
        }}
      >
        <Icon size={22} style={{ color: active ? cap.color : '#9ca3af', transition: 'color 0.4s ease' }} />
      </div>
      <span
        className="font-display font-bold text-sm tracking-[-0.02em]"
        style={{ color: active ? cap.color : colors.h1, transition: 'color 0.4s ease' }}
      >
        {cap.name}
      </span>
      <span className="text-[11px] font-semibold leading-snug max-w-[120px]" style={{ color: colors.muted }}>
        {cap.desc}
      </span>
    </div>
  );
}

export default function LandingTrustedBy() {
  const colors = useScrollColors();

  return (
    <section
      id="trusted"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #e8f5ec 0%, #f0ecff 40%, #e0f4f0 70%, #faf0ff 100%)',
      }}
    >
      {/* Bright background orbs */}
      <div className="absolute inset-0 bg-gradient-to-br from-lavender/20 via-transparent to-primary/12 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-gradient-radial from-lavender/25 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-radial from-primary/18 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-gradient-radial from-green-light/20 to-transparent rounded-full blur-[100px] animate-morph pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto flex flex-col items-center">
        <GlassSection>
          <div className="flex flex-col items-center gap-14">
            <AnimatedSection direction="up">
              <div className="text-center">
                <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-xl mb-8 shadow-soft border border-primary/10">
                  <span className="w-2 h-2 rounded-full bg-primary animate-neon-pulse" />
                  <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: colors.accent }}>Capabilities</span>
                </span>
                <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] mt-4" style={{ color: colors.h1 }}>
                  Everything <span className="text-gradient-lavender">built in.</span>
                </h2>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={0.2}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                {capabilities.map((cap, i) => (
                  <CapabilityCard key={cap.name} cap={cap} index={i} colors={colors} />
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={0.4}>
              <p className="font-mono text-xs font-bold tracking-[0.3em] text-center uppercase" style={{ color: colors.muted }}>
                No context lost. Ever.
              </p>
            </AnimatedSection>
          </div>
        </GlassSection>
      </div>
    </section>
  );
}
