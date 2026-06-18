'use client';
import React from 'react';

interface GlassSectionProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
  padding?: string;
}

export default function GlassSection({
  children,
  className = '',
  maxWidth = 'max-w-6xl',
  padding = 'p-10 md:p-14 lg:p-16',
}: GlassSectionProps) {
  return (
    <div
      className={`relative w-full ${maxWidth} mx-auto rounded-3xl ${padding} ${className}`}
      style={{
        backgroundColor: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 8px 48px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)',
      }}
    >
      {children}
    </div>
  );
}

export function GlassCard({
  children,
  className = '',
  padding = 'p-8',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`relative ${padding} rounded-2xl ${className}`}
      style={{
        backgroundColor: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      {children}
    </div>
  );
}
