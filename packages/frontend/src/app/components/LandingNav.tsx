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
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
  ];

  return (
    <>
      <style>{`
        .nav-link-item {
          position: relative;
          font-size: 9.5px; font-weight: 700; letter-spacing: .26em; text-transform: uppercase;
          color: #737373;
          text-decoration: none;
          font-family: 'JetBrains Mono', monospace;
          transition: color .2s;
        }
        .nav-link-item::after {
          content: '';
          position: absolute;
          bottom: -5px; left: 0;
          width: 0; height: 1.5px;
          background: #4F46E5;
          transition: width .3s cubic-bezier(.19,1,.22,1);
        }
        .nav-link-item:hover { color: #111111; }
        .nav-link-item:hover::after { width: 100%; }

        .nav-cta-ghost {
          padding: 9px 20px; font-size: 9.5px; font-weight: 700; letter-spacing: .20em;
          text-transform: uppercase; font-family: 'JetBrains Mono', monospace;
          color: #404040; border: 1px solid #E5E5E5;
          border-radius: 8px; text-decoration: none;
          background: #FFFFFF;
          transition: all .2s cubic-bezier(.22,1,.36,1);
        }
        .nav-cta-ghost:hover {
          border-color: #111111;
          color: #111111;
        }
        .nav-cta-primary {
          padding: 9px 20px; font-size: 9.5px; font-weight: 800; letter-spacing: .18em;
          text-transform: uppercase; font-family: 'JetBrains Mono', monospace;
          background: #4F46E5;
          color: #FFFFFF; border-radius: 8px; text-decoration: none;
          transition: all .2s cubic-bezier(.22,1,.36,1);
          border: 1px solid #4F46E5;
        }
        .nav-cta-primary:hover {
          background: #4338CA;
          border-color: #4338CA;
          transform: translateY(-1px);
        }
        .nav-cta-primary:active { transform: translateY(0); }
      `}</style>

      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid #E5E5E5' : '1px solid transparent',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline group">
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#4F46E5',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform .25s',
              }}
              className="group-hover:scale-105"
            >
              <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 900, letterSpacing: '-.02em' }}>EX</span>
            </div>
            <div>
              <span style={{
                fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
                fontSize: 17, fontWeight: 800, color: '#111111', letterSpacing: '-0.025em'
              }}>
                EduTechEx<span style={{ color: '#4F46E5' }}>OS</span>
              </span>
              <span style={{
                display: 'block', fontSize: 7, fontWeight: 700, letterSpacing: '.36em',
                textTransform: 'uppercase', color: '#A3A3A3', marginTop: 1,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Institutional OS
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <div style={{ height: 14, width: 1, background: '#E5E5E5' }} />
            {navLinks.map(item => (
              <a key={item.label} href={item.href} className="nav-link-item">{item.label}</a>
            ))}
            <div style={{ height: 14, width: 1, background: '#E5E5E5' }} />
          </nav>

          {/* Right CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/sign-up-login-screen?mode=admin&redirect=/admin" className="nav-cta-ghost">
              Admin
            </Link>
            <Link href="/sign-up-login-screen?mode=user" className="nav-cta-ghost">
              Sign In
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
              border: '1px solid #E5E5E5',
              background: mobileOpen ? '#F5F5F5' : '#FFFFFF',
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
                  background: '#111111',
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
            borderTop: '1px solid #E5E5E5',
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
            <div style={{ height: 1, background: '#E5E5E5', margin: '8px 0' }} />
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
