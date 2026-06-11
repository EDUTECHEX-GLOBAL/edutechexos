'use client';
import React, { useRef } from 'react';
import { Hash, Bot, CheckSquare, Newspaper, Database, Users, Zap, Eye, Calendar } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const features = [
  {
    Icon: Hash,
    accent: '#0DAFCE',
    accentBg: 'rgba(13,175,206,0.10)',
    accentBorder: 'rgba(13,175,206,0.20)',
    accentGlow: 'rgba(13,175,206,0.15)',
    title: 'Project Channels',
    description: 'Dedicated channels for every project. Context stays where work happens. Every message indexed for instant AI retrieval.',
    tag: 'Real-time · Organised',
    animClass: 'click-bubble-pop',
    gradient: 'linear-gradient(135deg, rgba(13,175,206,0.08), rgba(59,130,246,0.08))',
  },
  {
    Icon: Bot,
    accent: '#8B3FDB',
    accentBg: 'rgba(139,63,219,0.10)',
    accentBorder: 'rgba(139,63,219,0.20)',
    accentGlow: 'rgba(139,63,219,0.15)',
    title: 'Embedded AI Agent',
    description: 'AI lives inside your workspace — answers cited from your actual channel history, not the internet. Your institutional memory, made searchable.',
    tag: 'AI · Context-aware',
    animClass: 'click-neural-pulse',
    gradient: 'linear-gradient(135deg, rgba(139,63,219,0.08), rgba(26,27,58,0.14))',
  },
  {
    Icon: CheckSquare,
    accent: '#10C98A',
    accentBg: 'rgba(16,201,138,0.10)',
    accentBorder: 'rgba(16,201,138,0.20)',
    accentGlow: 'rgba(16,201,138,0.15)',
    title: 'Auto Task Extraction',
    description: 'AI reads every message and surfaces actionable tasks automatically. Nothing slips through during busy project sprints.',
    tag: 'AI · Productivity',
    animClass: 'click-card-flip',
    gradient: 'linear-gradient(135deg, rgba(16,201,138,0.08), rgba(5,150,105,0.08))',
  },
  {
    Icon: Newspaper,
    accent: '#F97316',
    accentBg: 'rgba(249,115,22,0.10)',
    accentBorder: 'rgba(249,115,22,0.20)',
    accentGlow: 'rgba(249,115,22,0.15)',
    title: 'Morning Digest',
    description: 'Wake up to a crisp AI-generated summary of everything that happened across all channels since you were last online.',
    tag: 'Async · Summary',
    animClass: 'click-page-unfold',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(245,158,11,0.08))',
  },
  {
    Icon: Calendar,
    accent: '#F59E0B',
    accentBg: 'rgba(245,158,11,0.10)',
    accentBorder: 'rgba(245,158,11,0.20)',
    accentGlow: 'rgba(245,158,11,0.15)',
    title: 'Attendance Tracking',
    description: 'Per-user login calendars, admin attendance dashboards, and daily presence tracking — all automated from login events.',
    tag: 'Ops · HR',
    animClass: 'click-cell-bloom',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,71,111,0.06))',
  },
  {
    Icon: Zap,
    accent: '#C026D3',
    accentBg: 'rgba(192,38,211,0.10)',
    accentBorder: 'rgba(192,38,211,0.20)',
    accentGlow: 'rgba(192,38,211,0.15)',
    title: 'Broadcast & Alerts',
    description: 'Send institution-wide announcements to all members in one click. Channel activity feeds and admin monitoring built in.',
    tag: 'Comms · Admin',
    animClass: 'click-send-whoosh',
    gradient: 'linear-gradient(135deg, rgba(192,38,211,0.08), rgba(139,63,219,0.08))',
  },
  {
    Icon: Database,
    accent: '#059669',
    accentBg: 'rgba(5,150,105,0.10)',
    accentBorder: 'rgba(5,150,105,0.20)',
    accentGlow: 'rgba(5,150,105,0.15)',
    title: 'Org Knowledge Base',
    description: 'Every decision, doc, and discussion becomes searchable org memory — forever. New members get instant context from day one.',
    tag: 'Search · Memory',
    animClass: 'click-page-unfold',
    gradient: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(16,201,138,0.08))',
  },
  {
    Icon: Eye,
    accent: '#3B82F6',
    accentBg: 'rgba(59,130,246,0.10)',
    accentBorder: 'rgba(59,130,246,0.20)',
    accentGlow: 'rgba(59,130,246,0.15)',
    title: 'Activity Monitoring',
    description: 'Admin-level engagement dashboards: session time, message counts, active days, and weekly engagement rates per team member.',
    tag: 'Analytics · Admin',
    animClass: 'click-bar-rise',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(26,27,58,0.14))',
  },
  {
    Icon: Users,
    accent: '#EF476F',
    accentBg: 'rgba(239,71,111,0.10)',
    accentBorder: 'rgba(239,71,111,0.20)',
    accentGlow: 'rgba(239,71,111,0.15)',
    title: 'Member Onboarding',
    description: 'New members request access, admin approves, and channels are assigned in seconds. Role-based access control out of the box.',
    tag: 'Onboarding · Access',
    animClass: 'click-slide-deck',
    gradient: 'linear-gradient(135deg, rgba(239,71,111,0.08), rgba(255,107,74,0.08))',
  },
];

function FeatureCard({ feat, i }: { feat: typeof features[0]; i: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { Icon } = feat;

  function handleClick() {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove(feat.animClass);
    void el.offsetWidth;
    el.classList.add(feat.animClass);
    setTimeout(() => el.classList.remove(feat.animClass), 600);
  }

  return (
    <AnimatedSection direction="up" delay={i * 0.06}>
      <div
        ref={cardRef}
        onClick={handleClick}
        className="group relative flex flex-col p-6 rounded-2xl cursor-pointer"
        style={{
          background: '#FFFFFF',
          border: `1.5px solid ${feat.accentBorder}`,
          boxShadow: `0 2px 12px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.9) inset`,
          minHeight: 220,
          transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.borderColor = feat.accent + '50';
          el.style.boxShadow = `0 16px 48px ${feat.accentGlow}, 0 4px 16px rgba(0,0,0,0.04)`;
          el.style.transform = 'translateY(-4px) scale(1.005)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.borderColor = feat.accentBorder;
          el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.9) inset';
          el.style.transform = 'translateY(0) scale(1)';
        }}
      >
        {/* Gradient bg fill (subtle) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: feat.gradient, opacity: 0, transition: 'opacity 0.35s', pointerEvents: 'none' }} className="group-hover:opacity-100" />

        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 2, background: `linear-gradient(90deg, transparent, ${feat.accent}60, transparent)`, borderRadius: '0 0 2px 2px', opacity: 0, transition: 'opacity 0.3s' }} className="group-hover:opacity-100" />

        {/* Left border accent on hover */}
        <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: '0 2px 2px 0', background: feat.accent, opacity: 0, transition: 'opacity 0.3s' }} className="group-hover:opacity-100" />

        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: feat.accentBg,
          border: `1.5px solid ${feat.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18, flexShrink: 0,
          boxShadow: `0 4px 16px ${feat.accentGlow}`,
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative', zIndex: 1,
        }} className="group-hover:scale-110">
          <Icon size={22} style={{ color: feat.accent }} />
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
          fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em',
          color: '#1A1B3A', marginBottom: 10, lineHeight: 1.2,
          position: 'relative', zIndex: 1,
        }}>
          {feat.title}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: 13, fontWeight: 400, lineHeight: 1.70,
          color: 'rgba(90,95,128,0.80)', flex: 1,
          position: 'relative', zIndex: 1,
        }}>
          {feat.description}
        </p>

        {/* Tag pill */}
        <div style={{ marginTop: 18, position: 'relative', zIndex: 1 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase',
            color: feat.accent, background: feat.accentBg,
            border: `1px solid ${feat.accentBorder}`,
            padding: '4px 10px', borderRadius: 20,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: feat.accent, display: 'inline-block' }} />
            {feat.tag}
          </span>
        </div>

        {/* Click hint */}
        <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 8, fontWeight: 600, color: `${feat.accent}60`, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", opacity: 0, transition: 'opacity 0.3s' }} className="group-hover:opacity-100">
          click to animate
        </div>
      </div>
    </AnimatedSection>
  );
}

export default function LandingFeatures() {
  return (
    <section id="features" className="relative py-28 px-6 lg:px-10 overflow-hidden" style={{ background: '#ECEAF8' }}>
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Colorful orbs */}
      <div className="absolute pointer-events-none" style={{ width: 520, height: 520, top: '-12%', right: '-6%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,175,206,0.08) 0%, transparent 65%)', filter: 'blur(64px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 440, height: 440, bottom: '0%', left: '-6%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,27,58,0.14) 0%, transparent 65%)', filter: 'blur(56px)' }} />
      <div className="absolute pointer-events-none" style={{ width: 360, height: 360, top: '40%', left: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,201,138,0.06) 0%, transparent 65%)', filter: 'blur(48px)' }} />

      <div className="relative max-w-screen-xl mx-auto">

        {/* ── Section header ── */}
        <AnimatedSection direction="up">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-20">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5B4FDB', display: 'inline-block', boxShadow: '0 0 8px rgba(91,79,219,0.50)' }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.60)', fontFamily: "'JetBrains Mono', monospace" }}>What lives inside</span>
              </div>
              <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.92, color: '#1A1B3A' }}>
                Every tool<br />
                <span style={{ background: 'linear-gradient(135deg, #5B4FDB, #0DAFCE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>your team</span><br />
                needs.
              </h2>
            </div>
            <div className="lg:max-w-xs">
              <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: 'rgba(90,95,128,0.75)', marginBottom: 20 }}>
                Nine tightly integrated capabilities that replace five disconnected tools — in one vibrant, precision interface. Click any card to see its unique animation.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: '#5B4FDB' }}>
                <span>09 capabilities</span>
                <div style={{ height: 1.5, flex: 1, background: 'linear-gradient(90deg, #5B4FDB, transparent)', maxWidth: 40, borderRadius: 1 }} />
                <span style={{ color: 'rgba(90,95,128,0.55)' }}>1 platform</span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── Feature grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <FeatureCard key={feat.title} feat={feat} i={i} />
          ))}
        </div>

        {/* ── Bottom rule ── */}
        <AnimatedSection direction="up" delay={0.35}>
          <div className="flex items-center gap-6 mt-20">
            <div style={{ flex: 1, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(91,79,219,0.15))', borderRadius: 1 }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(90,95,128,0.45)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
              Designed for EduTechEx · Built for institutions
            </span>
            <div style={{ flex: 1, height: 1.5, background: 'linear-gradient(90deg, rgba(91,79,219,0.15), transparent)', borderRadius: 1 }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
