'use client';
import React from 'react';
import AnimatedSection from './AnimatedSection';

/* ── Custom SVG icons — one per feature (white stroke, sit on ink tile) ───── */
const IconChannels = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <rect x="2" y="3" width="14" height="11" rx="2.5" stroke="white" strokeWidth="1.7" />
    <path d="M5 7.5h8M5 10h6" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity=".75" />
    <path d="M6 14l-3 3.5h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".75" />
    <rect x="10" y="12" width="14" height="11" rx="2.5" stroke="white" strokeWidth="1.7" opacity=".55" />
    <path d="M13 16.5h8M13 19h5" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity=".4" />
  </svg>
);

const IconAI = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="13" r="3" fill="white" />
    <circle cx="5"  cy="6"  r="1.8" fill="white" opacity=".7" />
    <circle cx="21" cy="6"  r="1.8" fill="white" opacity=".7" />
    <circle cx="5"  cy="20" r="1.8" fill="white" opacity=".7" />
    <circle cx="21" cy="20" r="1.8" fill="white" opacity=".7" />
    <path d="M7 7.5L10.2 10.8M18.8 7.5L15.8 10.8M7 18.5L10.2 15.2M18.8 18.5L15.8 15.2" stroke="white" strokeWidth="1.2" opacity=".5" />
    <circle cx="13" cy="13" r="6" stroke="white" strokeWidth="1" strokeDasharray="2 2.5" opacity=".35" />
  </svg>
);

const IconTasks = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <rect x="4" y="3" width="14" height="18" rx="2.5" stroke="white" strokeWidth="1.7" />
    <path d="M8 9l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 15h6M8 18h4" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity=".65" />
    <path d="M21 4l.8 1.8L23.5 6l-1.7.5L21 8l-.8-1.5L18.5 6l1.7-.7Z" fill="white" opacity=".9" />
  </svg>
);

const IconDigest = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <circle cx="19" cy="7" r="3.5" stroke="white" strokeWidth="1.6" fill="none" />
    <path d="M19 2.5V4M19 10v1.5M13.5 7H15M23 7h1.5M15 3.5l1 1M22.5 10.5l1 1M15 10.5l1-1M22.5 3.5l1-1" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity=".65" />
    <rect x="3" y="10" width="13" height="14" rx="2" stroke="white" strokeWidth="1.7" />
    <path d="M6 15h7M6 18h5M6 21h3" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity=".65" />
  </svg>
);

const IconAttendance = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <rect x="3" y="6" width="20" height="17" rx="2.5" stroke="white" strokeWidth="1.7" />
    <path d="M3 11.5h20" stroke="white" strokeWidth="1.3" opacity=".5" />
    <path d="M9 3v5M17 3v5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="6"  y="15" width="3.5" height="3.5" rx="1" fill="white" />
    <rect x="11" y="15" width="3.5" height="3.5" rx="1" fill="white" opacity=".4" />
    <rect x="16" y="15" width="3.5" height="3.5" rx="1" fill="white" />
    <rect x="6"  y="19.5" width="3.5" height="1.5" rx=".75" fill="white" opacity=".3" />
  </svg>
);

const IconBroadcast = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="15" r="2.5" fill="white" />
    <path d="M8.5 11.5C10 9.5 11.4 8.5 13 8.5s3 1 4.5 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M5 8C7.5 4.5 10 2.5 13 2.5S18.5 4.5 21 8" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".55" />
    <path d="M6 22h14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M13 17.5V22" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconKnowledge = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <ellipse cx="13" cy="19.5" rx="8" ry="3" stroke="white" strokeWidth="1.6" fill="none" />
    <ellipse cx="13" cy="13"   rx="8" ry="3" stroke="white" strokeWidth="1.6" fill="none" />
    <ellipse cx="13" cy="6.5"  rx="8" ry="3" stroke="white" strokeWidth="1.6" fill="none" />
    <path d="M5 6.5v13M21 6.5v13" stroke="white" strokeWidth="1.6" />
    <path d="M10 6l1.5 1.5L15 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
  </svg>
);

const IconActivity = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <path d="M2 13h4l2.5-7 4 13 3-10 2 4h6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="21" cy="13" r="2" fill="white" opacity=".7" />
  </svg>
);

const IconOnboarding = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <circle cx="10" cy="8" r="3.5" stroke="white" strokeWidth="1.7" fill="none" />
    <path d="M3 22c0-4.5 3.2-7 7-7" stroke="white" strokeWidth="1.7" strokeLinecap="round" fill="none" />
    <path d="M20 9.5C19 9 17 10 16 11.8c0 4.5 4 6.2 4 6.2s4-1.7 4-6.2C23 10 21 9 20 9.5Z" stroke="white" strokeWidth="1.6" fill="none" />
    <path d="M18 14l1.5 1.5 3-3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CUSTOM_ICONS = [
  IconChannels, IconAI, IconTasks, IconDigest, IconAttendance,
  IconBroadcast, IconKnowledge, IconActivity, IconOnboarding,
];

const features = [
  {
    title: 'Project Channels',
    description: 'Dedicated channels for every project. Context stays where work happens. Every message indexed for instant AI retrieval.',
    tag: 'Real-time · Organised',
  },
  {
    title: 'Embedded AI Agent',
    description: 'AI lives inside your workspace — answers cited from your actual channel history, not the internet. Your institutional memory, made searchable.',
    tag: 'AI · Context-aware',
  },
  {
    title: 'Auto Task Extraction',
    description: 'AI reads every message and surfaces actionable tasks automatically. Nothing slips through during busy project sprints.',
    tag: 'AI · Productivity',
  },
  {
    title: 'Morning Digest',
    description: 'Wake up to a crisp AI-generated summary of everything that happened across all channels since you were last online.',
    tag: 'Async · Summary',
  },
  {
    title: 'Attendance Tracking',
    description: 'Per-user login calendars, admin attendance dashboards, and daily presence tracking — all automated from login events.',
    tag: 'Ops · HR',
  },
  {
    title: 'Broadcast & Alerts',
    description: 'Send institution-wide announcements to all members in one click. Channel activity feeds and admin monitoring built in.',
    tag: 'Comms · Admin',
  },
  {
    title: 'Org Knowledge Base',
    description: 'Every decision, doc, and discussion becomes searchable org memory — forever. New members get instant context from day one.',
    tag: 'Search · Memory',
  },
  {
    title: 'Activity Monitoring',
    description: 'Admin-level engagement dashboards: session time, message counts, active days, and weekly engagement rates per team member.',
    tag: 'Analytics · Admin',
  },
  {
    title: 'Member Onboarding',
    description: 'New members request access, admin approves, and channels are assigned in seconds. Role-based access control out of the box.',
    tag: 'Onboarding · Access',
  },
];

function FeatureCard({ feat, i }: { feat: typeof features[0]; i: number }) {
  const CustomIcon = CUSTOM_ICONS[i];

  return (
    <AnimatedSection direction="up" delay={i * 0.06}>
      <div
        className="group relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E5E5E5',
          minHeight: 240,
          transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.borderColor = '#111111';
          el.style.boxShadow = '0 16px 40px rgba(17,17,17,0.08)';
          el.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.borderColor = '#E5E5E5';
          el.style.boxShadow = 'none';
          el.style.transform = 'translateY(0)';
        }}
      >
        {/* Card body */}
        <div style={{ padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>

          {/* Icon row — index number left, icon right */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>

            {/* Index number */}
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 800,
              color: '#A3A3A3',
              letterSpacing: '0.05em',
              paddingTop: 6,
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>

            {/* Icon container — ink tile, white icon; accent on hover */}
            <div
              className="feat-tile group-hover:scale-105"
              style={{
                width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                background: '#111111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.3s',
              }}
            >
              <CustomIcon />
            </div>
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em',
            color: '#111111', marginBottom: 10, lineHeight: 1.25,
          }}>
            {feat.title}
          </h3>

          {/* Description */}
          <p style={{
            fontSize: 13, fontWeight: 400, lineHeight: 1.70,
            color: '#737373', flex: 1,
          }}>
            {feat.description}
          </p>

          {/* Bottom row — tag + arrow */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase',
              color: '#737373', background: '#F5F5F5',
              border: '1px solid #E5E5E5',
              padding: '4px 10px', borderRadius: 20,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
              {feat.tag}
            </span>

            {/* Arrow — visible on hover */}
            <div
              className="group-hover:opacity-100"
              style={{
                opacity: 0, transition: 'opacity 0.25s',
                width: 28, height: 28, borderRadius: 8,
                background: '#4F46E5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#FFFFFF', fontWeight: 700,
              }}
            >
              →
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default function LandingFeatures() {
  return (
    <section id="features" className="relative py-28 px-6 lg:px-10 overflow-hidden" style={{ background: '#FFFFFF', borderTop: '1px solid #E5E5E5' }}>
      <style>{`.group:hover .feat-tile { background: #4F46E5 !important; }`}</style>

      <div className="relative max-w-screen-xl mx-auto">

        {/* ── Section header ── */}
        <AnimatedSection direction="up">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-20">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>What lives inside</span>
              </div>
              <h2 style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.92, color: '#111111' }}>
                Every tool<br />
                <span style={{ color: '#4F46E5' }}>your team</span><br />
                needs.
              </h2>
            </div>
            <div className="lg:max-w-xs">
              <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: '#525252', marginBottom: 20 }}>
                Nine tightly integrated capabilities that replace five disconnected tools — in one focused, precision interface.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: '#111111' }}>
                <span>09 capabilities</span>
                <div style={{ height: 1, flex: 1, background: '#E5E5E5', maxWidth: 40 }} />
                <span style={{ color: '#A3A3A3' }}>1 platform</span>
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
            <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.26em', textTransform: 'uppercase', color: '#A3A3A3', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
              Designed for EduTechEx · Built for institutions
            </span>
            <div style={{ flex: 1, height: 1, background: '#E5E5E5' }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
