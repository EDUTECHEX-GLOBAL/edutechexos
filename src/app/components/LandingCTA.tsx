'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

export default function LandingCTA() {
  return (
    <section
      id="cta"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 overflow-hidden bg-dark"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/40 via-dark to-dark pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-radial from-primary/5 via-lavender/3 to-transparent rounded-full blur-3xl animate-aurora-1 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-green-light/4 to-transparent rounded-full blur-3xl animate-aurora-2 pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto">
        <AnimatedSection direction="up">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] backdrop-blur-xl mb-10">
              <Sparkles size={14} className="text-primary-light" />
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-primary-light uppercase">Ready to deploy</span>
            </div>

            <h2 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl tracking-[-0.03em] text-dark-foreground mb-6 leading-[1.1]">
              Upgrade your team&apos;s
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-light via-green-light to-lavender">
                operating system
              </span>
              <br />
              today.
            </h2>

            <p className="text-lg md:text-xl text-dark-muted font-medium max-w-xl mx-auto mb-12 leading-relaxed">
              Join the forward-thinking teams using EduTechExOS to eliminate noise, automate
              context, and focus on what actually matters.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-primary to-green-light text-white font-bold px-10 py-4 text-lg rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative">Start building now</span>
                <ArrowRight size={20} className="relative group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  color: '#9498b0',
                  backgroundColor: 'rgba(34,34,58,0.4)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
