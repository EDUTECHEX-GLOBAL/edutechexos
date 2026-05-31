'use client';
import React from 'react';
import { Bot, CheckSquare, Newspaper, Zap, Shield, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const capabilities = [
  { name: 'AI Agent',        icon: Bot,         desc: 'Ask anything about your projects',  color: '#4f46e5' },
  { name: 'Task Extraction', icon: CheckSquare, desc: 'Auto-surfaced action items',         color: '#1a3a2a' },
  { name: 'Daily Digest',    icon: Newspaper,   desc: 'Morning context in minutes',         color: '#0891b2' },
  { name: 'Fast Search',     icon: Zap,         desc: 'Instant org-wide knowledge lookup', color: '#d97706' },
  { name: 'Access Control',  icon: Shield,      desc: 'Role-based channel permissions',     color: '#dc2626' },
  { name: 'Team Hub',        icon: Users,       desc: 'All members in one workspace',       color: '#2d6a4f' },
];

export default function LandingTrustedBy() {
  return (
    <section
      id="trusted"
      className="relative py-24 px-6 lg:px-10 overflow-hidden"
      style={{ background: '#ede8dd' }}
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
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, #ede8dd 20%, transparent 75%)',
        }}
      />

      {/* Animated orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(26,58,42,0.09) 0%, transparent 65%)', filter:'blur(56px)', top:'-15%', right:'5%', animation:'trusted-orb-1 22s ease-in-out infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 65%)', filter:'blur(48px)', bottom:'-10%', left:'10%', animation:'trusted-orb-2 28s ease-in-out infinite 3s', willChange:'transform' }} />
      </div>
      <style>{`
        @keyframes trusted-orb-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-80px,60px) scale(1.14); }
          70%      { transform: translate(60px,-40px) scale(0.90); }
        }
        @keyframes trusted-orb-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          35%      { transform: translate(90px,-70px) scale(1.10); }
          68%      { transform: translate(-50px,80px) scale(0.94); }
        }
      `}</style>

      <div className="relative max-w-screen-xl mx-auto flex flex-col items-center">

        {/* Header */}
        <AnimatedSection direction="up">
          <div className="text-center mb-16">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.18em] mb-6"
              style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)', color: '#1a3a2a' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#1a3a2a' }} />
              Capabilities
            </span>
            <h2
              className="font-black tracking-[-0.03em] leading-[0.92]"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', color: '#1a2e1a' }}
            >
              Everything <span style={{
                background: 'linear-gradient(135deg, #4f46e5, #2563eb)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>built in.</span>
            </h2>
          </div>
        </AnimatedSection>

        {/* Capability cards */}
        <AnimatedSection direction="up" delay={0.15}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.name}
                  className="group flex flex-col items-center gap-3 text-center rounded-2xl p-5 cursor-default transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <div
                    className="w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{
                      width: 52, height: 52,
                      background: `${cap.color}12`,
                      border: `1px solid ${cap.color}22`,
                    }}
                  >
                    <Icon size={22} style={{ color: cap.color }} />
                  </div>
                  <span className="font-bold text-sm" style={{ color: '#1a2e1a' }}>
                    {cap.name}
                  </span>
                  <span className="text-[11px] font-medium leading-snug max-w-[110px]" style={{ color: '#6b7b6b' }}>
                    {cap.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </AnimatedSection>

        {/* Footer label */}
        <AnimatedSection direction="up" delay={0.35}>
          <p
            className="font-mono text-xs font-bold tracking-[0.3em] text-center uppercase mt-14"
            style={{ color: '#6b7b6b' }}
          >
            No context lost. Ever.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
