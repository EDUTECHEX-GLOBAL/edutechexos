'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DecoDiamond, DECO_GOLD } from './LandingDeco';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks: { label: string; href: string; dropdown: boolean }[] = [];

  return (
    <>
      <style>{`
        .nav-link-item {
          position: relative;
          font-size: 14px; font-weight: 500;
          color: #374151;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color .2s;
        }
        .nav-link-item:hover { color: #5B4FDB; }

        .nav-cta-ghost {
          padding: 8px 18px; font-size: 14px; font-weight: 600;
          color: #1F2937; border: 1px solid #D1D5DB;
          border-radius: 8px; text-decoration: none;
          background: #FFFFFF;
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .nav-cta-ghost:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
          transform: translateY(-1px);
        }
        .nav-cta-primary {
          padding: 8px 20px; font-size: 14px; font-weight: 600;
          background: #111827;
          color: #FFFFFF; border-radius: 8px; text-decoration: none;
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .nav-cta-primary:hover {
          background: #1F2937;
          transform: translateY(-1px);
        }
        .nav-cta-primary:active { transform: scale(0.97); }
      `}</style>

      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.60)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: scrolled ? '1px solid rgba(91,79,219,0.1)' : '1px solid transparent',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 no-underline group">
            <div
              style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg, #0DAFCE 0%, #5B4FDB 50%, #8B3FDB 100%)',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: 14, height: 14, background: '#fff', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            </div>
            <div>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20, fontWeight: 700, color: '#1A1B3A', letterSpacing: '-0.02em'
              }}>
                EduTechExOS
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(item => (
              <a key={item.label} href={item.href} className="nav-link-item">
                {item.label}
                {item.dropdown && (
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginTop: 2 }}>
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
            ))}
          </nav>

          {/* Right CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/sign-up-login-screen?mode=admin&redirect=/admin" className="nav-cta-ghost" style={{ borderStyle: 'dashed', color: '#5B4FDB', borderColor: 'rgba(91,79,219,0.35)' }}>
              Admin Login
            </Link>
            <Link href="/sign-up-login-screen?mode=user" className="nav-cta-ghost">
              Log in
            </Link>
            <Link href="/sign-up-login-screen?mode=signup" className="nav-cta-primary">
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              border: '1.5px solid rgba(91,79,219,0.15)',
              background: mobileOpen ? 'rgba(91,79,219,0.06)' : 'transparent',
              cursor: 'pointer',
              transition: 'background .2s',
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4.5 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  display: 'block', width: 18, height: 2, borderRadius: 2,
                  background: '#5B4FDB',
                  transition: 'all .3s',
                  transform:
                    mobileOpen && i === 0 ? 'rotate(45deg) translateY(6px)' :
                    mobileOpen && i === 2 ? 'rotate(-45deg) translateY(-6px)' :
                    'none',
                  opacity: mobileOpen && i === 1 ? 0 : 1,
                }} />
              ))}
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{
            background: 'rgba(255,255,255,0.98)',
            borderTop: '1px solid rgba(26,27,58,0.14)',
            padding: '16px 24px 24px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {navLinks.map(item => (
              <a
                key={item.label} href={item.href}
                className="nav-link-item"
                style={{ padding: '12px 0', display: 'block' }}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div style={{ height: 1, background: 'rgba(26,27,58,0.14)', margin: '8px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  href="/sign-up-login-screen?mode=admin&redirect=/admin"
                  className="nav-cta-ghost"
                  style={{ flex: 1, textAlign: 'center', display: 'block', padding: '12px 0' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Admin
                </Link>
                <Link
                  href="/sign-up-login-screen?mode=user"
                  className="nav-cta-ghost"
                  style={{ flex: 1, textAlign: 'center', display: 'block', padding: '12px 0' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
              </div>
              <Link
                href="/sign-up-login-screen?mode=signup"
                className="nav-cta-primary"
                style={{ textAlign: 'center', display: 'block', padding: '12px 0' }}
                onClick={() => setMobileOpen(false)}
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
