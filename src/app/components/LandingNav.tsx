'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Features',     href: '#features'     },
    { label: 'How It Works', href: '#how-it-works'  },
    { label: 'Testimonials', href: '#testimonials'  },
  ];

  return (
    <>
      <style>{`
        .nav-link-gold::after {
          content: '';
          display: block;
          height: 1px;
          width: 0;
          background: #D4AF37;
          transition: width 0.3s cubic-bezier(0.19, 1, 0.22, 1);
          margin-top: 2px;
        }
        .nav-link-gold:hover::after { width: 100%; }
        .nav-link-gold:hover { color: #D4AF37 !important; }
      `}</style>

      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? 'rgba(10,17,40,0.97)' : 'rgba(10,17,40,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${scrolled ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.06)'}`,
          boxShadow: scrolled ? '0 4px 32px rgba(10,17,40,0.4)' : 'none',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline group">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-lg shadow-[#D4AF37]/10"
              style={{ background: '#D4AF37' }}
            >
              <span className="text-[#0A1128] font-black text-xs tracking-tight">EX</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-white font-bold text-base leading-none tracking-tight">
                EduTechEx<span className="text-[#D4AF37]">OS</span>
              </span>
              <span className="text-[#D4AF37]/40 text-[7px] font-bold tracking-[0.35em] uppercase mt-0.5">
                Institutional OS
              </span>
            </div>
          </Link>

          {/* Desktop nav — thin gold rule underline style */}
          <nav className="hidden md:flex items-center gap-8">
            {/* Thin gold rule */}
            <div className="h-4 w-[1px] bg-[#D4AF37]/20"></div>
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="nav-link-gold text-[10px] font-bold uppercase tracking-[0.25em] transition-colors duration-200"
                style={{ color: 'rgba(249,248,246,0.55)' }}
              >
                {item.label}
              </a>
            ))}
            <div className="h-4 w-[1px] bg-[#D4AF37]/20"></div>
          </nav>

          {/* Right CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-up-login-screen?mode=admin&redirect=/admin"
              className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.25em] transition-all duration-200 hover:text-[#D4AF37] border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 rounded-sm"
              style={{ color: 'rgba(249,248,246,0.55)' }}
            >
              Admin
            </Link>
            <Link
              href="/sign-up-login-screen?mode=user"
              className="group relative overflow-hidden px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] rounded-sm transition-all duration-300 hover:shadow-[0_0_24px_rgba(212,175,55,0.3)]"
              style={{ background: '#D4AF37', color: '#0A1128' }}
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 bg-white/20 -translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-sm transition-colors hover:bg-[#D4AF37]/10 border border-[#D4AF37]/10"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-[5px]">
              <span
                className={`block w-5 h-[1.5px] rounded-full transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`}
                style={{ backgroundColor: '#D4AF37' }}
              />
              <span
                className={`block w-5 h-[1.5px] rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`}
                style={{ backgroundColor: '#D4AF37' }}
              />
              <span
                className={`block w-5 h-[1.5px] rounded-full transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`}
                style={{ backgroundColor: '#D4AF37' }}
              />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden px-6 pb-6 pt-4 flex flex-col gap-1 border-t border-[#D4AF37]/10"
            style={{ backgroundColor: 'rgba(10,17,40,0.98)' }}
          >
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.25em] transition-all hover:text-[#D4AF37]"
                style={{ color: 'rgba(249,248,246,0.55)' }}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="h-[1px] my-3 bg-[#D4AF37]/10"></div>
            <div className="flex gap-3 mt-1">
              <Link
                href="/sign-up-login-screen?mode=admin&redirect=/admin"
                className="flex-1 text-center px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] border border-[#D4AF37]/20 rounded-sm transition-all hover:border-[#D4AF37]/50 hover:text-[#D4AF37]"
                style={{ color: 'rgba(249,248,246,0.55)' }}
                onClick={() => setMobileOpen(false)}
              >
                Admin
              </Link>
              <Link
                href="/sign-up-login-screen?mode=user"
                className="flex-1 text-center px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm transition-all hover:opacity-90"
                style={{ background: '#D4AF37', color: '#0A1128' }}
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
