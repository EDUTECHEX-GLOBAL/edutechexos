'use client';
import React from 'react';
import { useScrollProgress } from '@/hooks/useScrollProgress';

export function ShineButton({ children, className = '', href, onClick }: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const { scrollY } = useScrollProgress();
  const shinePos = (scrollY * 0.15) % 200;

  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      href={href}
      onClick={onClick}
      className={`relative overflow-hidden group ${className}`}
    >
      <span className="relative z-10">{children}</span>
      <div
        className="absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `linear-gradient(105deg,
            transparent 0%,
            transparent ${shinePos - 30}%,
            rgba(255,255,255,0.25) ${shinePos - 10}%,
            rgba(255,255,255,0.4) ${shinePos}%,
            rgba(255,255,255,0.25) ${shinePos + 10}%,
            transparent ${shinePos + 30}%,
            transparent 100%
          )`,
        }}
      />
    </Tag>
  );
}

export function GlassButton({ children, className = '', href, onClick }: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const { scrollY, progress } = useScrollProgress();
  const hue = 140 + progress * 40;
  const shineX = (scrollY * 0.08) % 150;

  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      href={href}
      onClick={onClick}
      className={`relative overflow-hidden group ${className}`}
      style={{
        backgroundColor: `hsla(${hue}, 30%, 95%, 0.15)`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <span className="relative z-10">{children}</span>
      <div
        className="absolute inset-0 z-0 transition-all duration-200"
        style={{
          background: `linear-gradient(135deg,
            transparent ${shineX - 40}%,
            rgba(255,255,255,0.2) ${shineX - 15}%,
            rgba(255,255,255,0.35) ${shineX}%,
            rgba(255,255,255,0.2) ${shineX + 15}%,
            transparent ${shineX + 40}%
          )`,
        }}
      />
    </Tag>
  );
}
