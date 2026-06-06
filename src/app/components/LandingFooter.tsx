'use client';
import React from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

const footerGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Features',    href: '#features'     },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Testimonials', href: '#testimonials' },
    ],
  },
  {
    title: 'Access',
    links: [
      { label: 'Sign in',    href: '/sign-up-login-screen'                        },
      { label: 'Get access', href: '/sign-up-login-screen'                        },
      { label: 'Admin',      href: '/sign-up-login-screen?mode=admin&redirect=/admin' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms',   href: '#' },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer
      className="relative"
      style={{ background: '#191E2F', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
        }}
      />

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <AnimatedSection direction="up" className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 no-underline group mb-5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="5" cy="8" r="2.5" fill="white" />
                  <circle cx="11" cy="5" r="1.8" fill="white" opacity="0.65" />
                  <circle cx="11" cy="11" r="1.8" fill="white" opacity="0.65" />
                </svg>
              </div>
              <span className="font-bold text-base" style={{ color: '#ffffff' }}>
                EduTechEx<span style={{ color: '#9BA6D3' }}>OS</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Internal operating system for the EduTechEx team. Built in Hyderabad.
            </p>
          </AnimatedSection>

          {/* Link groups */}
          {footerGroups.map((group, i) => (
            <AnimatedSection key={group.title} direction="up" delay={i * 0.08}>
              <h4
                className="text-xs font-bold uppercase tracking-[0.16em] mb-5"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {group.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                      style={{ color: 'rgba(255,255,255,0.55)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          ))}
        </div>

        {/* Bottom bar */}
        <AnimatedSection direction="up" delay={0.25}>
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.30)' }}>
              &copy; 2026 EduTechEx Global &middot; V1.0 &middot; Hyderabad, India
            </p>
            <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.20)' }}>
              Designed with passion in Hyderabad
            </p>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
