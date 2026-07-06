'use client';
import React from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';
import { DecoDiamond, DECO_GOLD } from './LandingDeco';

const footerGroups = [
  {
    title: 'Product',
    accent: '#5B4FDB',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Request access', href: '/sign-up-login-screen' },
    ],
  },
  {
    title: 'Access',
    accent: '#0DAFCE',
    links: [
      { label: 'Sign in', href: '/sign-up-login-screen' },
      { label: 'Get access', href: '/sign-up-login-screen' },
      { label: 'Admin portal', href: '/sign-up-login-screen?mode=admin&redirect=/admin' },
    ],
  },
  {
    title: 'Legal',
    accent: '#10C98A',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="relative" style={{ background: '#E8EAF6', borderTop: '1px solid #E5E7EB' }}>
      {/* Spectrum bar top */}
      <div className="absolute top-0 left-0 right-0 spectrum-bar pointer-events-none" />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Soft gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(91,79,219,0.03) 0%, transparent 70%)' }} />

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-20" style={{ zIndex: 2 }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <AnimatedSection direction="up" className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 no-underline group mb-5">
              <div
                style={{
                  width: 32, height: 32,
                  background: 'linear-gradient(135deg, #0DAFCE 0%, #5B4FDB 50%, #8B3FDB 100%)',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.3s'
                }}
                className="group-hover:scale-105"
              >
                <div style={{ width: 14, height: 14, background: '#E8EAF6', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
              </div>
              <div>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                  EduTechExOS
                </span>
                <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', color: '#5B4FDB', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Institutional OS
                </span>
              </div>
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#4B5563', maxWidth: '28ch', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
              Internal operating system for the EduTechEx team. Built in Hyderabad.
            </p>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.6)', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#10B981', fontFamily: "'JetBrains Mono', monospace" }}>System online</span>
            </div>

            {/* Feature color strip */}
            <div style={{ display: 'flex', gap: 4, marginTop: 20 }}>
              {['#5B4FDB', '#0DAFCE', '#10C98A', '#F59E0B', '#EF476F', '#8B3FDB'].map(c => (
                <div key={c} style={{ height: 4, flex: 1, borderRadius: 2, background: c, opacity: 0.65 }} />
              ))}
            </div>
          </AnimatedSection>

          {/* Link groups */}
          {footerGroups.map((group, i) => (
            <AnimatedSection key={group.title} direction="up" delay={i * 0.08}>
              <h4 style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase', color: group.accent, marginBottom: 18, fontFamily: "'JetBrains Mono', monospace" }}>
                {group.title}
              </h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', padding: 0 }}>
                {group.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{ fontSize: 13, fontWeight: 500, color: '#4B5563', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: "'Inter', sans-serif" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = group.accent; (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4B5563'; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #D1D5DB, transparent)', borderRadius: 1 }} />
            <DecoDiamond size={5} color="#9CA3AF" hollow />
            <DecoDiamond size={8} color="#9CA3AF" />
            <DecoDiamond size={5} color="#9CA3AF" hollow />
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #D1D5DB, transparent)', borderRadius: 1 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="sm:flex-row sm:items-center sm:justify-between">
            <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#6B7280', fontWeight: 500 }}>
              © 2026 EduTechEx Global · V1.0 · Hyderabad, India
            </p>
            <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF', fontWeight: 500 }}>
              Designed with passion in Hyderabad
            </p>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
