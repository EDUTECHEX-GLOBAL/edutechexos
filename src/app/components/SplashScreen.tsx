'use client';
import React, { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFadingOut(true), 1200);
    const unmountTimer = setTimeout(() => setIsMounted(false), 1800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-all duration-700 ${
        isFadingOut ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'
      }`}
    >
      <div className="relative flex flex-col items-center justify-center space-y-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(62,74,137,0.08),transparent_70%)] pointer-events-none" />
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-[-0.03em] text-foreground">
            EduTechEx<span className="text-gradient-warm">OS</span>
          </h1>
          <p className="font-mono text-xs text-ink-light tracking-[0.2em] uppercase">
            Initializing System
          </p>
        </div>
        <div className="relative w-48 h-[2px] bg-border rounded-full overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-r from-primary via-green-light to-lavender rounded-full"
            style={{ animation: 'splashProgress 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
          />
        </div>
      </div>
      <style>{`
        @keyframes splashProgress {
          0% { width: 0%; opacity: 1; }
          70% { width: 85%; opacity: 1; }
          100% { width: 100%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
