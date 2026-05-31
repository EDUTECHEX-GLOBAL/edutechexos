'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import AuthCard from './components/AuthCard';

export default function AuthPage() {
  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#ede8dd' }}
    >
      {/* Grid — darker lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.13) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
        }}
      />
      {/* Radial fade — clears grid near centre form */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 65% at 50% 55%, #ede8dd 30%, transparent 75%)',
        }}
      />

      {/* Nav */}
      <header
        className="relative z-50 w-full"
        style={{
          backgroundColor: 'rgba(237,232,221,0.90)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
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

          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:text-foreground"
            style={{ color: '#6b7b6b' }}
          >
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Main */}
      <div className="relative flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <h1
              className="font-black tracking-[-0.03em] leading-[0.92] mb-3"
              style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#1a2e1a' }}
            >
              Welcome back to<br />your workspace.
            </h1>
            <p className="text-sm font-medium" style={{ color: '#6b7b6b' }}>
              Sign in or create an account to continue.
            </p>
          </div>

          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}
          >
            <Suspense fallback={
              <div className="text-center text-xs py-8" style={{ color: '#6b7b6b' }}>Loading…</div>
            }>
              <AuthCard />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
