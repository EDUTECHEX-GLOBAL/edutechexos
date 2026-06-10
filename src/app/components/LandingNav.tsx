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
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@700;800;900&display=swap');

        .nav-lnk {
          position: relative;
          font-size: 9.5px; font-weight: 700; letter-spacing: .28em; text-transform: uppercase;
          color: rgba(238,240,248,0.42);
          text-decoration: none;
          font-family: 'JetBrains Mono', monospace;
          transition: color .25s;
        }
        .nav-lnk::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 0;
          width: 0; height: 1px;
          background: #F0A028;
          transition: width .3s cubic-bezier(.19,1,.22,1);
        }
        .nav-lnk:hover { color: #F0A028; }
        .nav-lnk:hover::after { width: 100%; }
      `}</style>

      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? 'rgba(4,6,14,0.97)' : 'rgba(4,6,14,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${scrolled ? 'rgba(240,160,40,0.14)' : 'rgba(240,160,40,0.06)'}`,
          boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.50)' : 'none',
        }}
      >
        {/* Amber signal hairline */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,160,40,0.40), transparent)', opacity: scrolled ? 0.8 : 0, transition: 'opacity .5s' }} />

        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline group">
            <div
              style={{ width: 32, height: 32, borderRadius: 6, background: '#F0A028', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(240,160,40,0.28)', transition: 'transform .3s, box-shadow .3s' }}
              className="group-hover:scale-105 group-hover:shadow-[0_4px_20px_rgba(240,160,40,0.45)]"
            >
              <span style={{ color: '#04060E', fontSize: 10, fontWeight: 900, letterSpacing: '-.02em' }}>EX</span>
            </div>
            <div>
              <span style={{ fontFamily: "'Cabinet Grotesk', 'Inter', sans-serif", fontSize: 17, fontWeight: 800, color: '#EEF0F8', letterSpacing: '-0.025em' }}>
                EduTechEx<span style={{ color: '#F0A028' }}>OS</span>
              </span>
              <span style={{ display: 'block', fontSize: 7, fontWeight: 700, letterSpacing: '.38em', textTransform: 'uppercase', color: 'rgba(240,160,40,0.38)', marginTop: 1 }}>
                Institutional OS
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <div style={{ height: 14, width: 1, background: 'rgba(240,160,40,0.15)' }} />
            {navLinks.map(item => (
              <a key={item.label} href={item.href} className="nav-lnk">{item.label}</a>
            ))}
            <div style={{ height: 14, width: 1, background: 'rgba(240,160,40,0.15)' }} />
          </nav>

          {/* Right CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-up-login-screen?mode=admin&redirect=/admin"
              style={{ padding: '8px 16px', fontSize: 9.5, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.42)', border: '1px solid rgba(240,160,40,0.15)', borderRadius: 5, textDecoration: 'none', transition: 'all .25s', fontFamily: "'JetBrains Mono', monospace" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F0A028'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,160,40,0.40)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(238,240,248,0.42)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,160,40,0.15)'; }}
            >
              Admin
            </Link>
            <Link
              href="/sign-up-login-screen?mode=user"
              style={{ padding: '9px 22px', fontSize: 9.5, fontWeight: 800, letterSpacing: '.22em', textTransform: 'uppercase', background: '#F0A028', color: '#04060E', borderRadius: 5, textDecoration: 'none', boxShadow: '0 2px 12px rgba(240,160,40,0.28)', transition: 'all .25s', fontFamily: "'JetBrains Mono', monospace", position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFB040'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(240,160,40,0.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F0A028'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(240,160,40,0.28)'; }}
            >
              Sign In
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid rgba(240,160,40,0.12)', background: 'transparent', cursor: 'pointer', transition: 'background .2s' }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4.5 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  display: 'block', width: 18, height: 1.5, borderRadius: 2,
                  background: '#F0A028',
                  transition: 'all .3s',
                  transform: mobileOpen && i === 0 ? 'rotate(45deg) translateY(6px)' : mobileOpen && i === 1 ? 'scaleX(0) opacity(0)' : mobileOpen && i === 2 ? 'rotate(-45deg) translateY(-6px)' : 'none',
                  opacity: mobileOpen && i === 1 ? 0 : 1,
                }} />
              ))}
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ background: 'rgba(4,6,14,0.99)', borderTop: '1px solid rgba(240,160,40,0.08)', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navLinks.map(item => (
              <a key={item.label} href={item.href} className="nav-lnk" style={{ padding: '12px 0', display: 'block' }} onClick={() => setMobileOpen(false)}>
                {item.label}
              </a>
            ))}
            <div style={{ height: 1, background: 'rgba(240,160,40,0.10)', margin: '8px 0' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Link href="/sign-up-login-screen?mode=admin&redirect=/admin" style={{ flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 9.5, fontWeight: 700, letterSpacing: '.20em', textTransform: 'uppercase', border: '1px solid rgba(240,160,40,0.20)', borderRadius: 5, color: 'rgba(238,240,248,0.52)', textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setMobileOpen(false)}>
                Admin
              </Link>
              <Link href="/sign-up-login-screen?mode=user" style={{ flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 9.5, fontWeight: 800, letterSpacing: '.20em', textTransform: 'uppercase', background: '#F0A028', borderRadius: 5, color: '#04060E', textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
