'use client';
import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const footerGroups = [
  {
    title: 'Product',
    links: [{ label: 'Features', href: '#features' }, { label: 'How it works', href: '#how-it-works' }, { label: 'Testimonials', href: '#testimonials' }],
  },
  {
    title: 'Access',
    links: [{ label: 'Sign in', href: '/sign-up-login-screen' }, { label: 'Get access', href: '/sign-up-login-screen' }, { label: 'Admin', href: '/sign-up-login-screen?mode=admin&redirect=/admin' }],
  },
  {
    title: 'Legal',
    links: [{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }],
  },
];

export default function LandingFooter() {
  return (
    <footer className="relative bg-dark border-t border-dark-border/20">
      <div className="absolute inset-0 bg-gradient-to-b from-dark via-dark to-primary-dark/15 pointer-events-none" />
      <div className="relative max-w-screen-2xl mx-auto px-6 lg:px-10 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          <AnimatedSection direction="up" className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 no-underline group mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-green-light flex items-center justify-center shadow-lg group-hover:shadow-primary/30 transition-all duration-500 group-hover:scale-105">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg tracking-[-0.02em] text-dark-foreground">
                EduTechEx<span className="text-primary-light">OS</span>
              </span>
            </Link>
            <p className="text-sm text-dark-muted font-medium leading-relaxed max-w-xs">
              Internal operating system for the EduTechEx team. Built in Hyderabad.
            </p>
          </AnimatedSection>

          {footerGroups.map((group) => (
            <AnimatedSection key={group.title} direction="up" delay={0.1}>
              <h4 className="font-display font-bold text-xs text-dark-foreground tracking-[0.1em] uppercase mb-4">
                {group.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-dark-muted font-medium hover:text-dark-foreground transition-all duration-200 hover:translate-x-1 inline-block">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection direction="up" delay={0.2}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-20 pt-8 border-t border-dark-border/20">
            <p className="text-xs text-dark-muted font-mono font-semibold">&copy; 2026 EduTechEx Global &middot; V1.0 &middot; Hyderabad, India</p>
            <p className="text-xs text-dark-muted/40 font-mono font-semibold">Designed with passion in Hyderabad</p>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
