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
    <footer className="relative" style={{ background: '#E9EBFA', borderTop: '1px solid #DADCEF' }}>

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-10 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <AnimatedSection direction="up" className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 no-underline group mb-5">
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .25s' }} className="group-hover:scale-105">
                <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 900 }}>EX</span>
              </div>
              <div>
                <span style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, color: '#111111', letterSpacing: '-0.02em' }}>
                  EduTechEx<span style={{ color: '#4F46E5' }}>OS</span>
                </span>
                <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, letterSpacing: '.30em', textTransform: 'uppercase', color: '#A3A3A3', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Institutional OS
                </span>
              </div>
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.72, color: '#737373', maxWidth: '28ch', fontWeight: 400 }}>
              Internal operating system for the EduTechEx team. Built in Hyderabad.
            </p>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#404040', fontFamily: "'JetBrains Mono', monospace" }}>System online</span>
            </div>
          </AnimatedSection>

          {/* Link groups */}
          {footerGroups.map((group, i) => (
            <AnimatedSection key={group.title} direction="up" delay={i * 0.08}>
              <h4 style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: '#A3A3A3', marginBottom: 18, fontFamily: "'JetBrains Mono', monospace" }}>
                {group.title}
              </h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{ fontSize: 13, fontWeight: 500, color: '#737373', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#111111'; (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#737373'; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}
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
          <div style={{ height: 1, background: '#E5E5E5', marginBottom: 20 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="sm:flex-row sm:items-center sm:justify-between">
            <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#A3A3A3', fontWeight: 500 }}>
              © 2026 EduTechEx Global · V1.0 · Hyderabad, India
            </p>
            <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#A3A3A3', fontWeight: 500 }}>
              Designed with precision in Hyderabad
            </p>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
