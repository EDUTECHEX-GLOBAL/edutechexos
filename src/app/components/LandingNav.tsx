'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useActiveSection } from '@/hooks/useScrollProgress';
import { LayoutDashboard, Zap, Users, FileText } from 'lucide-react';

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
    { label: 'Features',     href: '#features',     id: 'features',     icon: LayoutDashboard },
    { label: 'How it works', href: '#how-it-works',  id: 'how-it-works', icon: Zap            },
    { label: 'Testimonials', href: '#testimonials',  id: 'testimonials', icon: Users           },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(248,250,252,0.97)' : 'rgba(248,250,252,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(62,74,137,0.10)',
        boxShadow: scrolled ? '0 2px 20px rgba(62,74,137,0.08)' : 'none',
      }}
    >
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            style={{ background: '#191E2F' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="5" cy="8" r="2.5" fill="white" />
              <circle cx="11" cy="5" r="1.8" fill="white" opacity="0.7" />
              <circle cx="11" cy="11" r="1.8" fill="white" opacity="0.7" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-[-0.01em]" style={{ color: '#1E2636' }}>
            EduTechEx<span style={{ color: '#3E4A89' }}>OS</span>
          </span>
        </Link>

        {/* Desktop nav — tubelight pill navbar */}
        <nav className="hidden md:flex items-center">
          <div className="flex items-center gap-1 bg-white/60 border border-black/08 backdrop-blur-lg py-1 px-1 rounded-full shadow-sm"
            style={{ borderColor: 'rgba(62,74,137,0.12)' }}>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="relative px-5 py-2 text-sm font-semibold rounded-full transition-colors flex items-center gap-1.5"
                  style={{ color: isActive ? '#1E2636' : '#4A5578' }}
                >
                  <Icon size={14} strokeWidth={2.2} />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="landing-lamp"
                      className="absolute inset-0 rounded-full -z-10"
                      style={{ background: 'rgba(62,74,137,0.10)' }}
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      {/* Lamp glow */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-t-full" style={{ background: '#3E4A89' }}>
                        <div className="absolute w-12 h-6 rounded-full blur-md -top-2 -left-2" style={{ background: 'rgba(62,74,137,0.25)' }} />
                        <div className="absolute w-8 h-5 rounded-full blur-md -top-1" style={{ background: 'rgba(62,74,137,0.15)' }} />
                      </div>
                    </motion.div>
                  )}
                </a>
              );
            })}
          </div>
        </nav>

        {/* Right buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/sign-up-login-screen?mode=admin&redirect=/admin"
            className="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200 hover:bg-black/5"
            style={{
              color: '#1E2636',
              border: '1.5px solid rgba(62,74,137,0.25)',
              background: 'transparent',
            }}
          >
            Admin
          </Link>
          <Link
            href="/sign-up-login-screen?mode=user"
            className="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200"
            style={{
              color: '#ffffff',
              background: '#191E2F',
              border: '1.5px solid rgba(25,30,47,0.80)',
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
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} style={{ backgroundColor: '#1E2636' }} />
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} style={{ backgroundColor: '#1E2636' }} />
            <span className={`block w-5 h-[2px] rounded-full transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} style={{ backgroundColor: '#1E2636' }} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-3 flex flex-col gap-1"
          style={{ backgroundColor: 'rgba(248,250,252,0.98)', borderTop: '1px solid rgba(62,74,137,0.10)' }}
        >
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-3 text-sm font-medium rounded-xl transition-all hover:bg-black/5"
              style={{ color: '#1E2636' }}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="h-px my-2" style={{ backgroundColor: 'rgba(62,74,137,0.10)' }} />
          <div className="flex gap-2 mt-1">
            <Link
              href="/sign-up-login-screen?mode=admin&redirect=/admin"
              className="flex-1 text-center px-4 py-3 text-sm font-semibold rounded-full border transition-all hover:bg-black/5"
              style={{ color: '#1E2636', borderColor: 'rgba(62,74,137,0.25)' }}
              onClick={() => setMobileOpen(false)}
            >
              Admin
            </Link>
            <Link
              href="/sign-up-login-screen?mode=user"
              className="flex-1 text-center px-4 py-3 text-sm font-semibold rounded-full text-white transition-all hover:opacity-90"
              style={{ background: '#191E2F' }}
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
