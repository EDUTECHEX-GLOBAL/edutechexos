'use client';
import React from 'react';
import { useActiveSection } from '@/hooks/useScrollProgress';

interface GradientConfig { from: string; via: string; to: string; }

const sectionGradients: Record<string, GradientConfig> = {
  hero: { from: '#f0f5f0', via: '#e8f5ec', to: '#f5f0ff' },
  trusted: { from: '#f5f0ff', via: '#f0f5f0', to: '#e8f5ec' },
  features: { from: '#f0f5f0', via: '#e8f5ec', to: '#f8f5ff' },
  'how-it-works': { from: '#f5f0ff', via: '#f0f5f0', to: '#eef5f0' },
  testimonials: { from: '#f8f5ff', via: '#f0f5f0', to: '#e8f5ec' },
  cta: { from: '#e8f5ec', via: '#f0f5f0', to: '#f5f0ff' },
  footer: { from: '#1a1a2e', via: '#2d2d44', to: '#1a1a2e' },
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
