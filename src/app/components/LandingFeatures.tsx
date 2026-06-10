'use client';
import React from 'react';
import { Hash, Bot, CheckSquare, Newspaper, Database, Users, Zap, Eye, Calendar } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const features = [
  {
    Icon: Hash,
    accent: '#6366F1',
    accentBg: 'rgba(99,102,241,0.10)',
    title: 'Project Channels',
    description: 'Dedicated channels for every project. Context stays where work happens, not scattered across threads. Every message indexed for AI retrieval.',
    tag: 'Real-time · Organised',
  },
  {
    Icon: Bot,
    accent: '#F0A028',
    accentBg: 'rgba(240,160,40,0.10)',
    title: 'Embedded AI Agent',
    description: 'AI lives inside your workspace — ask it anything. Answers are cited from your actual channel history, not the internet.',
    tag: 'AI · Context-aware',
  },
  {
    Icon: CheckSquare,
    accent: '#10D9A0',
    accentBg: 'rgba(16,217,160,0.10)',
    title: 'Auto Task Extraction',
    description: 'The AI reads every message and surfaces actionable tasks automatically. Nothing slips through the cracks during busy project sprints.',
    tag: 'AI · Productivity',
  },
  {
    Icon: Newspaper,
    accent: '#F0A028',
    accentBg: 'rgba(240,160,40,0.10)',
    title: 'Morning Digest',
    description: 'Wake up to a crisp AI-generated summary of everything that happened across all channels since you were last online.',
    tag: 'Async · Summary',
  },
  {
    Icon: Calendar,
    accent: '#818CF8',
    accentBg: 'rgba(129,140,248,0.10)',
    title: 'Attendance Tracking',
    description: 'Per-user login calendars, admin attendance dashboards, and daily presence tracking — all automated from login events.',
    tag: 'Ops · HR',
  },
  {
    Icon: Zap,
    accent: '#10D9A0',
    accentBg: 'rgba(16,217,160,0.10)',
    title: 'Broadcast & Alerts',
    description: 'Send institution-wide announcements to all members in one click. Channel activity feeds and admin monitoring built in.',
    tag: 'Comms · Admin',
  },
  {
    Icon: Database,
    accent: '#6366F1',
    accentBg: 'rgba(99,102,241,0.10)',
    title: 'Org Knowledge Base',
    description: 'Every decision, doc, and discussion becomes searchable org memory — forever. New members get instant context from the moment they join.',
    tag: 'Search · Memory',
  },
  {
    Icon: Eye,
    accent: '#F0A028',
    accentBg: 'rgba(240,160,40,0.10)',
    title: 'Activity Monitoring',
    description: 'Admin-level engagement dashboards: session time, message counts, active days, and weekly engagement rates per team member.',
    tag: 'Analytics · Admin',
  },
  {
    Icon: Users,
    accent: '#10D9A0',
    accentBg: 'rgba(16,217,160,0.10)',
    title: 'Member Onboarding',
    description: 'New members request access, admin approves, and channels are assigned in seconds. Role-based access control out of the box.',
    tag: 'Onboarding · Access',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="relative py-28 px-6 lg:px-10 overflow-hidden" style={{ background: '#04060E' }}>
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Amber orb top-right */}
      <div className="absolute pointer-events-none" style={{ width: 520, height: 520, top: '-12%', right: '-6%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,160,40,0.05) 0%, transparent 65%)', filter: 'blur(64px)' }} />
      {/* Indigo orb bottom-left */}
      <div className="absolute pointer-events-none" style={{ width: 440, height: 440, bottom: '0%', left: '-6%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)', filter: 'blur(56px)' }} />

      <div className="relative max-w-screen-xl mx-auto">

        {/* ── Section header ── */}
        <AnimatedSection direction="up">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-20">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F0A028', display: 'inline-block' }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.38)', fontFamily: "'JetBrains Mono', monospace" }}>What lives inside</span>
              </div>
              <h2 style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.92, color: '#EEF0F8' }}>
                Every tool<br />
                <span style={{ color: '#F0A028' }}>your team</span><br />
                needs.
              </h2>
            </div>
            <div className="lg:max-w-xs">
              <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.72, color: 'rgba(238,240,248,0.48)', marginBottom: 20 }}>
                Nine tightly integrated capabilities that replace five disconnected tools — in one dark, precision interface.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", color: '#F0A028' }}>
                <span>09 capabilities</span>
                <div style={{ height: 1, flex: 1, background: 'rgba(240,160,40,0.25)', maxWidth: 40 }} />
                <span style={{ color: 'rgba(238,240,248,0.38)' }}>1 platform</span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── Feature grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => {
            const { Icon } = feat;
            return (
              <AnimatedSection key={feat.title} direction="up" delay={i * 0.06}>
                <div
                  className="group relative flex flex-col p-6 rounded-2xl transition-all duration-300"
                  style={{
                    background: '#0A1020',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.30)',
                    minHeight: 220,
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${feat.accent}30`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${feat.accent}20`;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.30)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top accent line */}
                  <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg, transparent, ${feat.accent}50, transparent)`, opacity: 0, transition: 'opacity 0.3s' }} className="group-hover:opacity-100" />

                  {/* Icon */}
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: feat.accentBg, border: `1px solid ${feat.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, flexShrink: 0, boxShadow: `0 4px 16px ${feat.accent}15` }}>
                    <Icon size={20} style={{ color: feat.accent }} />
                  </div>

                  {/* Title */}
                  <h3 style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: '#EEF0F8', marginBottom: 10, lineHeight: 1.2 }}>
                    {feat.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.68, color: 'rgba(238,240,248,0.48)', flex: 1 }}>
                    {feat.description}
                  </p>

                  {/* Tag pill */}
                  <div style={{ marginTop: 18 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: feat.accent, background: feat.accentBg, padding: '4px 10px', borderRadius: 20, fontFamily: "'JetBrains Mono', monospace" }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: feat.accent, display: 'inline-block' }} />
                      {feat.tag}
                    </span>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        {/* ── Bottom rule ── */}
        <AnimatedSection direction="up" delay={0.35}>
          <div className="flex items-center gap-6 mt-20">
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.28)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
              Designed for EduTechEx · Built for institutions
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
