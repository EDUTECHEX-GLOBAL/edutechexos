'use client';
import React from 'react';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

const footerGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Request access', href: '/sign-up-login-screen' },
    ],
  },
  {
    title: 'Access',
    links: [
      { label: 'Sign in', href: '/sign-up-login-screen' },
      { label: 'Get access', href: '/sign-up-login-screen' },
      { label: 'Admin portal', href: '/sign-up-login-screen?mode=admin&redirect=/admin' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="relative" style={{ background: '#04060E', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Amber signal hairline top */}
      <div className="absolute top-0 left-0 right-0 signal-line pointer-events-none" />

      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <AnimatedSection direction="up" className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 no-underline group mb-5">
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0A028', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .3s', boxShadow: '0 4px 12px rgba(240,160,40,0.25)' }} className="group-hover:scale-105">
                <span style={{ color: '#04060E', fontSize: 10, fontWeight: 900 }}>EX</span>
              </div>
              <div>
                <span style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 17, fontWeight: 800, color: '#EEF0F8', letterSpacing: '-0.02em' }}>
                  EduTechEx<span style={{ color: '#F0A028' }}>OS</span>
                </span>
                <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, letterSpacing: '.32em', textTransform: 'uppercase', color: 'rgba(240,160,40,0.35)', marginTop: 2 }}>
                  Institutional OS
                </span>
              </div>
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.72, color: 'rgba(238,240,248,0.38)', maxWidth: '28ch', fontWeight: 400 }}>
              Internal operating system for the EduTechEx team. Built in Hyderabad.
            </p>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10D9A0', boxShadow: '0 0 8px rgba(16,217,160,0.6)', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#10D9A0', fontFamily: "'JetBrains Mono', monospace" }}>System online</span>
            </div>
          </AnimatedSection>

          {/* Link groups */}
          {footerGroups.map((group, i) => (
            <AnimatedSection key={group.title} direction="up" delay={i * 0.08}>
              <h4 style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.28em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.35)', marginBottom: 18, fontFamily: "'JetBrains Mono', monospace" }}>
                {group.title}
              </h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{ fontSize: 13, fontWeight: 500, color: 'rgba(238,240,248,0.48)', textDecoration: 'none', display: 'inline-block', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F0A028'; (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(238,240,248,0.48)'; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }} className="sm:flex-row sm:items-center sm:justify-between">
            <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(238,240,248,0.22)', fontWeight: 500 }}>
              © 2026 EduTechEx Global · V1.0 · Hyderabad, India
            </p>
            <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(238,240,248,0.15)', fontWeight: 500 }}>
              Designed with passion in Hyderabad
            </p>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
