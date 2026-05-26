'use client';
import React from 'react';
import { Quote } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import { useScrollColors } from './ScrollColorText';
import GlassSection from './GlassSection';

const testimonials = [
  {
    quote: 'EduTechExOS completely changed how our engineering team operates. We no longer lose track of decisions in endless chat threads. The AI agent surfaces context instantly.',
    author: 'Sarah Jenkins', role: 'VP of Engineering, CloudScale', initials: 'SJ',
    gradient: 'from-primary to-green-light',
  },
  {
    quote: 'The Daily Digest feature alone saves me an hour every morning. I wake up, read the digest, and know exactly what the team accomplished while I was offline.',
    author: 'David Chen', role: 'Product Lead, InnovateTech', initials: 'DC',
    gradient: 'from-lavender to-accent',
  },
  {
    quote: "Onboarding used to take weeks. Now, new hires just ask the embedded AI about past projects, and they are up to speed in days.",
    author: 'Elena Rodriguez', role: 'HR Director, EduFuture', initials: 'ER',
    gradient: 'from-green-light to-primary',
  },
];

export default function LandingTestimonials() {
  const colors = useScrollColors();

  return (
    <section
      id="testimonials"
      className="relative min-h-screen flex items-center justify-center px-6 lg:px-10 py-24 overflow-hidden"
    >
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/4 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-radial from-lavender/4 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-screen-2xl mx-auto">
        <GlassSection padding="p-10 md:p-14 lg:p-16">
          <AnimatedSection direction="up">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-xl mb-8">
                <span className="w-2 h-2 rounded-full bg-accent animate-neon-pulse" />
                <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: colors.accent }}>User success</span>
              </span>
              <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] mt-4 mb-4" style={{ color: colors.h1 }}>
                Trusted by <span className="text-gradient-warm">industry leaders.</span>
              </h2>
              <p className="text-lg font-semibold max-w-xl mx-auto leading-relaxed" style={{ color: colors.body }}>
                See how forward-thinking teams are evolving with EduTechExOS.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <AnimatedSection key={t.author} direction="up" delay={i * 0.12}>
                <div
                  className="group relative p-8 rounded-2xl transition-all duration-700 hover:scale-[1.02] cursor-default h-full flex flex-col"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(45,106,79,0.04), rgba(196,181,253,0.03))' }}
                  />
                  <div className="relative mb-6">
                    <Quote size={24} className="opacity-30 group-hover:opacity-50 transition-opacity duration-500" style={{ color: '#2d6a4f' }} />
                  </div>
                  <p className="text-base font-semibold leading-relaxed mb-8 flex-1 relative" style={{ color: colors.body }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="relative flex items-center gap-4 pt-6" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                      <span className="text-sm font-bold text-white">{t.initials}</span>
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm group-hover:text-primary transition-colors duration-300" style={{ color: colors.h1 }}>{t.author}</p>
                      <p className="text-xs font-semibold" style={{ color: colors.muted }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </GlassSection>
      </div>
    </section>
  );
}
