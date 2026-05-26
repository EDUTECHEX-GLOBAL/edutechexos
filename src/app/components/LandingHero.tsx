'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { useScrollColors } from './ScrollColorText';
import { GlassButton } from './ScrollShine';

export default function LandingHero() {
  const colors = useScrollColors();

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 overflow-hidden"
    >
      <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-gradient-radial from-primary/6 via-lavender/3 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-gradient-radial from-green-light/5 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-gradient-radial from-lavender/8 to-transparent rounded-full blur-[120px] animate-morph pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-gradient-radial from-primary/6 to-transparent rounded-full blur-[100px] animate-float-slow pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto">
        <div className="max-w-5xl mx-auto text-center">
          <AnimatedSection direction="up" delay={0}>
            <h1 className="font-display font-black text-hero-xl md:text-hero-2xl leading-[0.95] mb-6 tracking-[-0.05em]" style={{ color: colors.h1 }}>
              The team OS
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-green-light to-lavender">
                EduTechEx runs on.
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.15}>
            <p className="text-lg md:text-xl font-semibold max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: colors.body }}>
              Channels, embedded AI, auto-extracted tasks, and morning digests — all the context
              your team needs, without the noise.
            </p>
          </AnimatedSection>

          <AnimatedSection direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
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
    </section>
  );
}
