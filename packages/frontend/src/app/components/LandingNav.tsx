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

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
  ];

  return (
    <>
      <style>{`
        .nav-link-item {
          position: relative;
          font-size: 9.5px; font-weight: 700; letter-spacing: .28em; text-transform: uppercase;
          color: rgba(90,95,128,0.70);
          text-decoration: none;
          font-family: 'JetBrains Mono', monospace;
          transition: color .25s;
        }
        .nav-link-item::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 0;
          width: 0; height: 2px;
          background: linear-gradient(90deg, #5B4FDB, #8B3FDB);
          border-radius: 1px;
          transition: width .35s cubic-bezier(.19,1,.22,1);
        }
        .nav-link-item:hover { color: #5B4FDB; }
        .nav-link-item:hover::after { width: 100%; }

        .nav-cta-ghost {
          padding: 9px 22px; font-size: 9.5px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; font-family: 'JetBrains Mono', monospace;
          color: #5A5F80; border: 1px solid rgba(26,27,58,0.24);
          border-radius: 8px; text-decoration: none;
          background: transparent;
          transition: all .25s cubic-bezier(.22,1,.36,1);
        }
        .nav-cta-ghost:hover {
          background: rgba(91,79,219,0.06);
          border-color: rgba(91,79,219,0.35);
          color: #5B4FDB;
          transform: translateY(-1px);
        }
        .nav-cta-primary {
          padding: 9px 22px; font-size: 9.5px; font-weight: 800; letter-spacing: .20em;
          text-transform: uppercase; font-family: 'JetBrains Mono', monospace;
          background: linear-gradient(135deg, #5B4FDB 0%, #7B6FEB 100%);
          color: #FFFFFF; border-radius: 8px; text-decoration: none;
          box-shadow: 0 4px 16px rgba(91,79,219,0.28);
          transition: all .25s cubic-bezier(.22,1,.36,1);
          border: 1px solid rgba(91,79,219,0.20);
        }
        .nav-cta-primary:hover {
          background: linear-gradient(135deg, #4238C8 0%, #6B5FDB 100%);
          box-shadow: 0 6px 24px rgba(91,79,219,0.40);
          transform: translateY(-1px) scale(1.02);
        }
        .nav-cta-primary:active { transform: scale(0.97); }
      `}</style>

      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: scrolled ? '1px solid rgba(26,27,58,0.15)' : '1px solid rgba(91,79,219,0.05)',
          boxShadow: scrolled ? '0 4px 32px rgba(26,27,58,0.14)' : 'none',
        }}
      >
        {/* Spectrum bar at very top */}
        <div className="spectrum-bar" />
        {/* Art Deco gold hairline */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${DECO_GOLD}55 30%, ${DECO_GOLD}55 70%, transparent)`, pointerEvents: 'none' }} />

        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline group">
            <div
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'linear-gradient(135deg, #5B4FDB 0%, #8B3FDB 100%)',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(91,79,219,0.30)',
                transition: 'transform .3s, box-shadow .3s',
              }}
              className="group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(91,79,219,0.45)]"
            >
              <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 900, letterSpacing: '-.02em' }}>EX</span>
            </div>
            <div>
              <span style={{
                fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
                fontSize: 17, fontWeight: 800, color: '#1A1B3A', letterSpacing: '-0.025em'
              }}>
                EduTechEx<span style={{ color: '#5B4FDB' }}>OS</span>
              </span>
              <span style={{
                display: 'block', fontSize: 7, fontWeight: 700, letterSpacing: '.38em',
                textTransform: 'uppercase', color: 'rgba(91,79,219,0.45)', marginTop: 1,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Institutional OS
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <DecoDiamond size={6} color={DECO_GOLD} />
            {navLinks.map(item => (
              <a key={item.label} href={item.href} className="nav-link-item">{item.label}</a>
            ))}
            <DecoDiamond size={6} color={DECO_GOLD} />
          </nav>

          {/* Right CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/sign-up-login-screen?mode=admin&redirect=/admin" className="nav-cta-ghost">
              Admin
            </Link>
            <Link href="/sign-up-login-screen?mode=user" className="nav-cta-ghost">
              Sign In here
            </Link>
            <Link href="/sign-up-login-screen?mode=signup" className="nav-cta-primary">
              Create Account
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
