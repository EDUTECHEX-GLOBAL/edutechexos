import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function LandingCTA() {
  return (
    <section className="py-32 px-6 lg:px-10 max-w-screen-xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden bg-foreground text-background border border-border/20 shadow-2xl p-10 md:p-16 lg:p-24 flex flex-col items-center text-center">
        {/* Abstract background gradient for the dark CTA card */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center max-w-3xl animate-fade-in-up">
          <span className="font-mono text-xs font-600 tracking-[0.15em] text-primary/80 uppercase mb-6 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            [ READY TO DEPLOY ]
          </span>
          
          <h2 className="font-display font-800 text-4xl md:text-5xl lg:text-6xl tracking-tight leading-tight mb-6">
            Upgrade your team's operating system today.
          </h2>
          
          <p className="text-muted text-lg md:text-xl leading-relaxed max-w-2xl mb-10 opacity-90">
            Join the forward-thinking teams using EduTechExOS to eliminate noise, automate context, and focus on what actually matters.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium px-8 py-4 rounded-full text-base hover:bg-primary/90 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] hover:-translate-y-1 w-full sm:w-auto"
            >
              <span>Start building now</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-medium text-background border border-background/20 hover:bg-background/10 transition-colors w-full sm:w-auto"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
