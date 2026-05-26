'use client';
import React from 'react';
import { useActiveSection } from '@/hooks/useScrollProgress';

interface GradientConfig { from: string; via: string; to: string; }

const sectionGradients: Record<string, GradientConfig> = {
  hero: { from: '#f0f5f0', via: '#e8f0ec', to: '#f0ecfa' },
  trusted: { from: '#1a1a2e', via: '#2d2d44', to: '#1b4332' },
  features: { from: '#e8f5ec', via: '#f0f5f0', to: '#f0ecfa' },
  'how-it-works': { from: '#1a1a2e', via: '#22223a', to: '#2d2d44' },
  testimonials: { from: '#f0ecfa', via: '#f8f5ff', to: '#e8f5ec' },
  cta: { from: '#1a1a2e', via: '#1b4332', to: '#2d2d44' },
  footer: { from: '#1a1a2e', via: '#2d2d44', to: '#1a1a2e' },
};

const sectionThemes: Record<string, { hue: number; saturation: number; lightness: number }> = {
  hero: { hue: 150, saturation: 20, lightness: 95 },
  trusted: { hue: 250, saturation: 15, lightness: 12 },
  features: { hue: 140, saturation: 25, lightness: 94 },
  'how-it-works': { hue: 240, saturation: 20, lightness: 14 },
  testimonials: { hue: 260, saturation: 25, lightness: 95 },
  cta: { hue: 220, saturation: 20, lightness: 13 },
};

export default function DynamicBackground() {
  const activeSection = useActiveSection(Object.keys(sectionGradients));
  const grad = sectionGradients[activeSection] || sectionGradients.hero;

  return (
    <div
      className="fixed inset-0 z-[-2] transition-all duration-1000 ease-smooth"
      style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.via}, ${grad.to})` }}
    />
  );
}

export function useThemeColor() {
  const activeSection = useActiveSection(Object.keys(sectionThemes));
  return sectionThemes[activeSection] || sectionThemes.hero;
}
