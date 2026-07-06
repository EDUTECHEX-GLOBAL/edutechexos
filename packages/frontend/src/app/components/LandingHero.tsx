'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DecoEyebrow, DecoRule, DecoCorner, DecoSunburst, DECO_GOLD } from './LandingDeco';

function HeroDashboardMockup({ dotCount }: { dotCount: number }) {
  const messages = [
    { init: 'AK', name: 'Aditya K.', text: 'LMS proposal ready for review!', time: '9:14', ai: false, color: '#5B4FDB' },
    { init: 'AI', name: 'EduTech AI', text: '3 tasks extracted from thread.', time: '9:15', ai: true, color: '#8B3FDB' },
    { init: 'MS', name: 'Mohan S.', text: "Scheduling walkthrough tomorrow.", time: '9:17', ai: false, color: '#0DAFCE' },
  ];
  const featureIcons = [
    { icon: '≡', color: '#5B4FDB', bg: 'rgba(26,27,58,0.18)', active: true },
    { icon: '✓', color: '#10C98A', bg: 'rgba(16,201,138,0.10)', active: false },
    { icon: '✦', color: '#8B3FDB', bg: 'rgba(139,63,219,0.10)', active: false },
    { icon: '◎', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', active: false },
  ];

  return (
    <div style={{
      width: '100%', maxWidth: 460,
      borderRadius: 16, overflow: 'hidden',
      border: '1.5px solid rgba(26,27,58,0.18)',
      boxShadow: '0 32px 80px rgba(91,79,219,0.14), 0 8px 24px rgba(26,27,58,0.14), 0 2px 8px rgba(91,79,219,0.06)',
      background: '#ECEAF8',
    }}>
      {/* Browser chrome */}
      <div style={{ height: 38, background: '#FFFFFF', borderBottom: '1px solid rgba(26,27,58,0.14)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, height: 20, borderRadius: 5, background: 'rgba(91,79,219,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(90,95,128,0.50)', letterSpacing: '.02em' }}>app.edutechex.in/dashboard</span>
        </div>
      </div>

      {/* App shell */}
      <div style={{ display: 'flex', height: 320 }}>
        {/* Icon rail */}
        <div style={{ width: 46, background: 'linear-gradient(180deg, #5B4FDB 0%, #8B3FDB 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, flexShrink: 0 }}>
            <span style={{ color: '#FFFFFF', fontSize: 8, fontWeight: 900 }}>EX</span>
          </div>
          {featureIcons.map(({ icon, color, bg, active }, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,0.25)' : 'transparent', fontSize: 13, color: '#FFFFFF', opacity: active ? 1 : 0.55 }}>
              {icon}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ width: 130, background: '#FFFFFF', borderRight: '1px solid rgba(26,27,58,0.14)', padding: '12px 0' }}>
          <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(91,79,219,0.45)', padding: '0 10px', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>Channels</div>
          {['#general', '#curriculum', '#planning', '#ai-digest'].map((ch, i) => (
            <div key={ch} style={{ padding: '6px 10px', fontSize: 10, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#1A1B3A' : 'rgba(90,95,128,0.55)', background: i === 0 ? 'rgba(26,27,58,0.14)' : 'transparent', borderLeft: i === 0 ? '2.5px solid #5B4FDB' : '2.5px solid transparent' }}>
              {ch}
            </div>
          ))}
          <div style={{ margin: '10px 10px 6px', fontSize: 7.5, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(91,79,219,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>Team</div>
          {['Aditya K.', 'Designer SA', 'Dev RK'].map((name, i) => (
            <div key={name} style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#10C98A' : 'rgba(90,95,128,0.20)', flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: 'rgba(90,95,128,0.55)', fontWeight: 500 }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ECEAF8' }}>
          <div style={{ height: 40, borderBottom: '1px solid rgba(91,79,219,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1A1B3A' }}>#general</span>
              <span style={{ fontSize: 8.5, color: 'rgba(90,95,128,0.45)' }}>14 members</span>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i < dotCount ? '#5B4FDB' : 'rgba(91,79,219,0.15)', transition: 'background .22s' }} />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'hidden' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: msg.ai ? 'linear-gradient(135deg, #8B3FDB, #5B4FDB)' : `${msg.color}20`, border: `1.5px solid ${msg.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 900, color: msg.color }}>
                  {msg.init}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1B3A' }}>{msg.name}</span>
                    <span style={{ fontSize: 8.5, color: 'rgba(90,95,128,0.40)' }}>{msg.time}</span>
                    {msg.ai && (
                      <span style={{ fontSize: 6.5, fontWeight: 800, color: '#8B3FDB', background: 'rgba(139,63,219,0.10)', padding: '1px 5px', borderRadius: 3, letterSpacing: '.12em', textTransform: 'uppercase' }}>AI</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#5A5F80', lineHeight: 1.45, background: msg.ai ? 'rgba(139,63,219,0.05)' : 'rgba(255,255,255,0.8)', padding: '5px 8px', borderRadius: 6, border: msg.ai ? '1px solid rgba(139,63,219,0.12)' : '1px solid rgba(91,79,219,0.06)' }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ margin: '0 8px 8px', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px 6px 11px', background: '#FFFFFF', borderRadius: 8, border: '1px solid rgba(26,27,58,0.15)' }}>
            <span style={{ flex: 1, fontSize: 10, color: 'rgba(90,95,128,0.35)' }}>Message #general…</span>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #5B4FDB, #7B6FEB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#FFFFFF', fontWeight: 900 }}>↑</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 12,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(20px)',
      border: `1.5px solid ${color}22`,
      boxShadow: `0 8px 32px ${color}14, 0 2px 8px rgba(0,0,0,0.04)`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 8px ${color}80` }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1B3A' }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(90,95,128,0.60)', letterSpacing: '.02em' }}>{label}</span>
    </div>
  );
}

export default function LandingHero() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const dId = setInterval(() => setDotCount(d => (d >= 3 ? 1 : d + 1)), 600);
    return () => clearInterval(dId);
  }, []);

  const features = [
    { title: 'AI Copilot', desc: 'Your always-on assistant for smarter decisions.', icon: '✦', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)' },
    { title: 'Real-time Channels', desc: 'Instant updates. Better collaboration.', icon: '💬', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' },
    { title: 'Knowledge Base', desc: 'Find, share, learn. All in one place.', icon: '📚', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.08)' },
    { title: 'Task Boards', desc: 'Organize work. Drive results.', icon: '⊞', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
    { title: 'Attendance', desc: 'Accurate tracking. Actionable insights.', icon: '✓', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
    { title: 'Leave Management', desc: 'Seamless requests. Smart approvals.', icon: '↪', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.08)' },
    { title: 'Analytics', desc: 'Beautiful dashboards. Real impact.', icon: '📈', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
    { title: 'Video Meetings', desc: 'Connect face-to-face. From anywhere.', icon: '🎥', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' },
  ];

  return (
    <section className="relative w-full min-h-screen flex flex-col items-center overflow-hidden" style={{ background: '#EBF0F5' }}>
      <style>{`
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        .h-in { opacity: 0; animation: hero-in 1s cubic-bezier(.19,1,.22,1) forwards; }
        .h-d1 { animation-delay: 60ms; }
        .h-d2 { animation-delay: 180ms; }
        .h-d3 { animation-delay: 320ms; }
        .h-d4 { animation-delay: 480ms; }

        .hero-cta-primary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 14px 28px;
          background: #111827;
          color: #FFFFFF;
          font-size: 15px; font-weight: 600;
          text-decoration: none; border-radius: 8px;
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15);
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .hero-cta-primary:hover {
          background: #1F2937;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(17, 24, 39, 0.25);
        }

        .hero-cta-ghost {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 14px 28px;
          background: #FFFFFF;
          color: #1F2937;
          font-size: 15px; font-weight: 600;
          text-decoration: none; border-radius: 8px;
          border: 1px solid #D1D5DB;
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .hero-cta-ghost:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .feature-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          border-color: #5B4FDB;
          box-shadow: 0 12px 24px rgba(91, 79, 219, 0.08);
        }

        .mockup-float { animation: hero-float 6s ease-in-out infinite; }
      `}</style>

      {/* ── Background Gradients (Soft, matching mockup glow) ── */}
      <div className="absolute pointer-events-none" style={{ width: 700, height: 700, top: '15%', right: '-5%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,79,219,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />

      <div className="relative w-full max-w-[1400px] mx-auto px-6 lg:px-10 pt-32 pb-12 flex flex-col items-center" style={{ zIndex: 2 }}>
        
        {/* Main Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full mb-16">
          {/* Left: Content */}
          <div className="flex flex-col items-start text-left">
            {/* Pill */}
            <div className="h-in h-d1 mb-6 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full" style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#5B4FDB',
            }}>
              <div style={{
                width: 18, height: 18,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontSize: 10, fontWeight: 900
              }}>
                ✦
              </div>
              <span>AI-Powered. People-Centric. Future-Ready.</span>
              <div style={{
                width: 16, height: 16,
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#5B4FDB', fontSize: 10, fontWeight: 900
              }}>
                ›
              </div>
            </div>

            {/* Headline */}
            <h1 className="h-in h-d2" style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(2.75rem, 4.5vw, 4rem)',
              fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em',
              color: '#111827', marginBottom: '1.5rem'
            }}>
              The <span style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI</span> Operating<br />
              System Your<br />
              Institution Runs On
            </h1>

            {/* Description */}
            <p className="h-in h-d3" style={{ fontSize: '1.1rem', fontWeight: 400, lineHeight: 1.6, color: '#4B5563', maxWidth: '44ch', marginBottom: '2.5rem' }}>
              Unify operations. Empower people. Elevate outcomes with the power of AI.
            </p>

            {/* CTAs */}
            <div className="h-in h-d4 flex flex-col sm:flex-row flex-wrap gap-4 w-full sm:w-auto">
              <Link href="/sign-up-login-screen?mode=signup" className="hero-cta-primary">
                Get Started
              </Link>
              <Link href="/contact" className="hero-cta-ghost">
                Talk to an Expert
              </Link>
            </div>
          </div>

          {/* Right: Mockup */}
          <div className="relative h-full flex items-center justify-center">
            <div className="mockup-float" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 680 }}>
               <img src="/hero-bg.jpg.png" alt="Platform Mockup" style={{ width: '100%', height: 'auto', borderRadius: 24, boxShadow: '0 20px 48px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)' }} />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-16 h-in" style={{ animationDelay: '800ms' }}>
          {features.map((feature, i) => (
            <div key={i} className="feature-card">
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: feature.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: feature.color,
                marginBottom: 14
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{feature.title}</h3>
              <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Unified Search Bar */}
        <div className="w-full max-w-2xl mx-auto h-in" style={{ animationDelay: '1000ms' }}>
          <div style={{
            display: 'flex', background: '#FFFFFF', borderRadius: 50,
            padding: '12px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E5E7EB',
            alignItems: 'center', gap: 16
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Unified Search</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Search people, documents, tasks, and more...</div>
            </div>
            <div style={{ background: '#F3F4F6', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>⌘</span>K
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
