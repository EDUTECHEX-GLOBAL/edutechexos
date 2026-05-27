'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useActiveSection } from '@/hooks/useScrollProgress';
import { useScrollColors } from './ScrollColorText';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useActiveSection(['hero', 'trusted', 'features', 'how-it-works', 'testimonials', 'cta']);
  const colors = useScrollColors();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'How it works', href: '#how-it-works', id: 'how-it-works' },
    { label: 'Testimonials', href: '#testimonials', id: 'testimonials' },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-700"
      style={{
        backgroundColor: scrolled ? 'rgba(240,245,240,0.80)' : 'rgba(255,255,255,0.30)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(45,106,79,0.10)' : '1px solid rgba(255,255,255,0.40)',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.06)' : '0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 no-underline group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-green-light flex items-center justify-center shadow-lg group-hover:shadow-primary/40 transition-all duration-500 group-hover:scale-105">
            <Sparkles size={18} className="text-white" />
          </div>
          <span
            className="font-display font-bold text-lg tracking-[-0.02em] transition-colors duration-500"
            style={{ color: colors.h1 }}
          >
            EduTechEx<span className="text-primary">OS</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-sm font-bold rounded-full transition-all duration-300"
              style={{
                color: activeSection === item.id ? colors.accent : colors.muted,
                backgroundColor: activeSection === item.id ? `${colors.accent}12` : 'transparent',
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="px-5 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              color: '#7c3aed',
              background: 'rgba(124,58,237,0.10)',
              border: '1px solid rgba(124,58,237,0.22)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Admin
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="px-5 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              color: '#2d6a4f',
              background: 'rgba(45,106,79,0.10)',
              border: '1px solid rgba(45,106,79,0.22)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Sign in
          </Link>
        </div>

        <button
          className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-primary/10 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className="flex flex-col gap-[5px]">
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} style={{ backgroundColor: colors.h1 }} />
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} style={{ backgroundColor: colors.h1 }} />
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} style={{ backgroundColor: colors.h1 }} />
          </div>
        </button>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden px-6 pb-8 pt-4 flex flex-col gap-2 animate-fade-down"
          style={{
            backgroundColor: 'rgba(240,245,240,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {navLinks.map((item) => (
            <a key={item.label} href={item.href} className="px-4 py-3 text-sm font-bold rounded-xl hover:bg-primary/10 transition-all" style={{ color: colors.body }} onClick={() => setMobileOpen(false)}>
              {item.label}
            </a>
          ))}
          <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.06)' }} />
          <Link href="/sign-up-login-screen?mode=admin&redirect=/admin" className="px-4 py-3 text-sm font-bold rounded-xl hover:bg-primary/10 transition-all" style={{ color: colors.body }} onClick={() => setMobileOpen(false)}>
            Admin
          </Link>
          <div className="flex gap-2 mt-1">
            <Link href="/sign-up-login-screen?mode=admin&redirect=/admin" className="flex-1 text-center px-4 py-3 text-sm font-bold rounded-full transition-all" style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.22)' }} onClick={() => setMobileOpen(false)}>Admin</Link>
            <Link href="/sign-up-login-screen?mode=user" className="flex-1 text-center px-4 py-3 text-sm font-bold rounded-full transition-all" style={{ color: '#2d6a4f', background: 'rgba(45,106,79,0.10)', border: '1px solid rgba(45,106,79,0.22)' }} onClick={() => setMobileOpen(false)}>Sign in</Link>
          </div>
        </div>
      )}
    </header>
  );
}
