'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Hash, Bot, CheckSquare, Zap, Users, MessageSquare, BookOpen, Bell } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { GlassButton } from './ScrollShine';

const floatingCards = [
  { icon: Hash,          label: '#general',           top: '12%',  left: '3%',   delay: '0s'   },
  { icon: Bot,           label: 'AI Copilot',         top: '22%',  right: '4%',  delay: '1.2s' },
  { icon: CheckSquare,   label: 'Task extracted',     top: '62%',  left: '2%',   delay: '0.6s' },
  { icon: MessageSquare, label: 'New message',        top: '74%',  right: '3%',  delay: '1.8s' },
  { icon: Zap,           label: 'Daily digest',       top: '42%',  left: '5%',   delay: '2.1s' },
  { icon: Users,         label: 'Team Hub',           top: '40%',  right: '5%',  delay: '0.9s' },
  { icon: BookOpen,      label: 'Wiki updated',       top: '82%',  left: '8%',   delay: '1.5s' },
  { icon: Bell,          label: 'You were mentioned', top: '16%',  left: '14%',  delay: '2.4s' },
];

export default function LandingHero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 overflow-hidden"
    >
      {/* ── Professional grid pattern ────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(45,106,79,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45,106,79,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
      {/* Grid fade-out vignette so edges stay clean */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(240,245,240,0.95) 100%)' }}
      />

      {/* ── Center spotlight glow ────────────────────────────────────── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[520px] bg-gradient-radial from-primary/14 via-lavender/8 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Accent corner glows ──────────────────────────────────────── */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-radial from-lavender/12 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-radial from-green-light/8 to-transparent rounded-full blur-[100px] animate-morph pointer-events-none" />

      {/* ── Floating product cards (desktop only) ────────────────────── */}
      {floatingCards.map(({ icon: Icon, label, top, left, right, delay }) => (
        <div
          key={label}
          className="hidden xl:flex absolute items-center gap-2 px-3.5 py-2 rounded-xl pointer-events-none select-none"
          style={{
            top, left, right,
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(45,106,79,0.14)',
            boxShadow: '0 4px 20px rgba(45,106,79,0.10), 0 1px 4px rgba(0,0,0,0.04)',
            animation: `float-card 5s ease-in-out ${delay} infinite alternate`,
            opacity: 0.82,
          }}
        >
          <Icon size={14} style={{ color: '#2d6a4f' }} />
          <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: '#1a3320' }}>{label}</span>
        </div>
      ))}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="relative w-full max-w-screen-xl mx-auto">
        <div className="max-w-4xl mx-auto text-center">

          <AnimatedSection direction="up" delay={0}>
            <h1
              className="font-display font-black text-hero-xl leading-[0.95] mb-5 tracking-[-0.05em]"
              style={{ color: '#0a1a0a' }}
            >
              The team OS
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-green-light to-lavender">
                EduTechEx runs on.
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.1}>
            <div className="flex items-center justify-center gap-3 mb-7">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-primary/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-primary/40" />
            </div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.18}>
            <p
              className="text-lg md:text-xl font-semibold max-w-2xl mx-auto mb-10 leading-relaxed"
              style={{ color: '#1a3320' }}
            >
              Channels, embedded AI, auto-extracted tasks, and morning digests — all the context
              your team needs, without the noise.
            </p>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.26}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-primary to-green-light text-white font-bold px-10 py-4 text-base rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10">Open the platform</span>
                <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <GlassButton
                href="/sign-up-login-screen"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign in to your account
              </GlassButton>
            </div>
          </AnimatedSection>

        </div>
      </div>

      <style>{`
        @keyframes float-card {
          from { transform: translateY(0px); }
          to   { transform: translateY(-10px); }
        }
      `}</style>
    </section>
  );
}
