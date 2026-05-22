import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

const footerLinks = [
  { id: 'footer-features', label: 'Features', href: '#features' },
  { id: 'footer-how', label: 'How it works', href: '#how-it-works' },
  { id: 'footer-login', label: 'Login', href: '/sign-up-login-screen' },
  { id: 'footer-signup', label: 'Get access', href: '/sign-up-login-screen' },
];

export default function LandingFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Logo + tagline */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-display font-700 text-base text-background">
              EduTechEx<span className="text-primary">OS</span>
            </span>
          </div>
          <p className="text-xs text-background/50 max-w-xs leading-relaxed">
            Internal operating system for the EduTechEx team. Built in Hyderabad.
          </p>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {footerLinks?.map((link) => (
            <Link
              key={link?.id}
              href={link?.href}
              className="text-sm text-background/60 hover:text-background transition-colors duration-150"
            >
              {link?.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <div className="flex flex-col gap-1 text-right">
          <p className="text-xs text-background/40 font-mono">
            © 2026 EduTechEx Global
          </p>
          <p className="text-xs text-background/30 font-mono">
            V1.0 · Hyderabad, India
          </p>
        </div>
      </div>
    </footer>
  );
}