'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-sm border-b border-border shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <AppLogo size={32} />
          <span className="font-display font-700 text-base tracking-tight text-foreground">
            EduTechEx<span className="text-primary font-800">OS</span>
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Features', href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Track', href: '#track' },
          ]?.map((item) => (
            <a
              key={`nav-${item?.label}`}
              href={item?.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              {item?.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-150"
          >
            Admin
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-150"
          >
            Login
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="btn-black text-sm px-5 py-2.5 rounded-full"
          >
            Get access →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}
          />
          <span
            className={`block w-5 h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block w-5 h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}
          />
        </button>
      </div>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-border px-6 pb-6 pt-2 flex flex-col gap-4">
          {['Features', 'How it works', 'Track']?.map((item) => (
            <a
              key={`mobile-nav-${item}`}
              href={`#${item?.toLowerCase()?.replace(/ /g, '-')}`}
              className="text-sm font-medium text-foreground py-1"
              onClick={() => setMobileOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="text-sm font-medium text-foreground py-1"
            onClick={() => setMobileOpen(false)}
          >
            Admin
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="btn-black w-full text-center text-sm py-3 rounded-full"
          >
            Get access →
          </Link>
        </div>
      )}
    </header>
  );
}
