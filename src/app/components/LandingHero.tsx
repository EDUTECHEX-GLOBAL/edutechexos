'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { useScrollColors } from './ScrollColorText';

const techStack = ['Python', 'FastAPI', 'React', 'MongoDB', 'Gemini'];

export default function LandingHero() {
  const colors = useScrollColors();

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 overflow-hidden"
    >
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-primary/8 via-lavender/4 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-green-light/6 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full bg-gradient-radial from-lavender/10 to-transparent blur-[100px] animate-morph pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection direction="up" delay={0}>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/30 backdrop-blur-xl mb-10 shadow-soft group hover:shadow-glow transition-all duration-700 hover:bg-white/50">
              <div className="w-2 h-2 rounded-full animate-neon-pulse" style={{ backgroundColor: colors.accent }} />
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: colors.accent }}>
                Internal Platform v1.0
              </span>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.15}>
            <h1 className="font-display font-bold text-hero-xl leading-[1.05] mb-8" style={{ color: colors.h1 }}>
              The team OS
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-green-light to-lavender">
                EduTechEx runs on.
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.3}>
            <p className="text-lg md:text-xl font-medium max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: colors.body }}>
              Channels, embedded AI, auto-extracted tasks, and morning digests — all the context
              your team needs, without the noise.
            </p>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.45}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-primary to-green-light text-white font-bold px-10 py-4 text-base rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative">Open the platform</span>
                <ArrowRight size={18} className="relative group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <Link
                href="/sign-up-login-screen"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  color: colors.body,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                Sign in to your account
              </Link>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.6}>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-16">
              <span className="font-mono text-xs font-bold tracking-widest mr-1" style={{ color: colors.muted }}>Built on:</span>
              {techStack.map((tech, i) => (
                <span
                  key={tech}
                  className="inline-flex items-center px-4 py-2 text-[11px] font-bold rounded-full transition-all duration-500 hover:scale-105"
                  style={{
                    color: colors.accent,
                    backgroundColor: `${colors.accent}15`,
                    animationDelay: `${600 + i * 80}ms`,
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
