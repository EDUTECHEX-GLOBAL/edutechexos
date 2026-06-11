'use client';
import React from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

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
    <footer className="relative" style={{ background: '#ECEAF8', borderTop: '1.5px solid rgba(26,27,58,0.14)' }}>
      {/* Spectrum bar top */}
      <div className="absolute top-0 left-0 right-0 spectrum-bar pointer-events-none" />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Soft gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(91,79,219,0.05) 0%, transparent 70%)' }} />

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <AnimatedSection direction="up" className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 no-underline group mb-5">
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #5B4FDB, #8B3FDB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .3s', boxShadow: '0 4px 14px rgba(91,79,219,0.25)' }} className="group-hover:scale-105">
                <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 900 }}>EX</span>
              </div>
              <div>
                <span style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, color: '#1A1B3A', letterSpacing: '-0.02em' }}>
                  EduTechEx<span style={{ color: '#5B4FDB' }}>OS</span>
                </span>
                <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, letterSpacing: '.32em', textTransform: 'uppercase', color: 'rgba(91,79,219,0.40)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Institutional OS
                </span>
              </div>
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.72, color: 'rgba(90,95,128,0.70)', maxWidth: '28ch', fontWeight: 400 }}>
              Internal operating system for the EduTechEx team. Built in Hyderabad.
            </p>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10C98A', boxShadow: '0 0 8px rgba(16,201,138,0.6)', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#10C98A', fontFamily: "'JetBrains Mono', monospace" }}>System online</span>
            </div>

            {/* Feature color strip */}
            <div style={{ display: 'flex', gap: 4, marginTop: 20 }}>
              {['#5B4FDB', '#0DAFCE', '#10C98A', '#F59E0B', '#EF476F', '#8B3FDB'].map(c => (
                <div key={c} style={{ height: 4, flex: 1, borderRadius: 2, background: c, opacity: 0.75 }} />
              ))}
            </div>
          </AnimatedSection>

          {/* Link groups */}
          {footerGroups.map((group, i) => (
            <AnimatedSection key={group.title} direction="up" delay={i * 0.08}>
              <h4 style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase', color: group.accent, marginBottom: 18, fontFamily: "'JetBrains Mono', monospace" }}>
                {group.title}
              </h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{ fontSize: 13, fontWeight: 500, color: 'rgba(90,95,128,0.70)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = group.accent; (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(90,95,128,0.70)'; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}
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
          <div style={{ height: 1.5, background: 'linear-gradient(90deg, rgba(26,27,58,0.14), rgba(13,175,206,0.08), rgba(16,201,138,0.08))', borderRadius: 1, marginBottom: 20 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="sm:flex-row sm:items-center sm:justify-between">
            <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(90,95,128,0.50)', fontWeight: 500 }}>
              © 2026 EduTechEx Global · V1.0 · Hyderabad, India
            </p>
            <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(90,95,128,0.35)', fontWeight: 500 }}>
              Designed with passion in Hyderabad
            </p>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
