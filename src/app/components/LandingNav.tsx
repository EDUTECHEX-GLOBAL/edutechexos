'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useActiveSection } from '@/hooks/useScrollProgress';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useActiveSection(['hero', 'trusted', 'features', 'how-it-works', 'testimonials', 'cta']);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Features',     href: '#features',     id: 'features'     },
    { label: 'How it works', href: '#how-it-works',  id: 'how-it-works' },
    { label: 'Testimonials', href: '#testimonials',  id: 'testimonials' },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(237,232,221,0.97)' : 'rgba(237,232,221,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            style={{ background: '#1a3a2a' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="5" cy="8" r="2.5" fill="white" />
              <circle cx="11" cy="5" r="1.8" fill="white" opacity="0.7" />
              <circle cx="11" cy="11" r="1.8" fill="white" opacity="0.7" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-[-0.01em]" style={{ color: '#1a2e1a' }}>
            EduTechEx<span style={{ color: '#2d6a4f' }}>OS</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
              style={{
                color: activeSection === item.id ? '#1a2e1a' : '#5a6a5a',
                backgroundColor: activeSection === item.id ? 'rgba(26,58,42,0.08)' : 'transparent',
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200 hover:bg-black/5"
            style={{
              color: '#1a2e1a',
              border: '1.5px solid rgba(26,46,26,0.22)',
              background: 'transparent',
            }}
          >
            Admin
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200 hover:bg-black/5"
            style={{
              color: '#1a2e1a',
              border: '1.5px solid rgba(26,46,26,0.22)',
              background: 'transparent',
            }}
          >
            Sign in
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-colors hover:bg-black/5"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className="flex flex-col gap-[5px]">
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} style={{ backgroundColor: '#1a2e1a' }} />
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} style={{ backgroundColor: '#1a2e1a' }} />
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} style={{ backgroundColor: '#1a2e1a' }} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-3 flex flex-col gap-1"
          style={{ backgroundColor: 'rgba(237,232,221,0.98)', borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-3 text-sm font-medium rounded-xl transition-all hover:bg-black/5"
              style={{ color: '#1a2e1a' }}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="h-px my-2" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
          <div className="flex gap-2 mt-1">
            <Link
              href="/sign-up-login-screen?mode=admin&redirect=/admin"
              className="flex-1 text-center px-4 py-3 text-sm font-semibold rounded-full border transition-all hover:bg-black/5"
              style={{ color: '#1a2e1a', borderColor: 'rgba(26,46,26,0.22)' }}
              onClick={() => setMobileOpen(false)}
            >
              Admin
            </Link>
            <Link
              href="/sign-up-login-screen?mode=user"
              className="flex-1 text-center px-4 py-3 text-sm font-semibold rounded-full text-white transition-all hover:opacity-90"
              style={{ background: '#1a3a2a' }}
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
