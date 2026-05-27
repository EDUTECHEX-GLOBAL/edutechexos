'use client';
import React from 'react';
import { useActiveSection } from '@/hooks/useScrollProgress';

interface GradientConfig { from: string; via: string; to: string; }

const sectionGradients: Record<string, GradientConfig> = {
  hero:          { from: '#edf7f0', via: '#f0edff', to: '#eaf6f0' },
  trusted:       { from: '#ece8fc', via: '#e4f4ec', to: '#f0ecff' },
  features:      { from: '#f3f0ff', via: '#eaf4f0', to: '#f5f2ff' },
  'how-it-works':{ from: '#e8f5ec', via: '#ede8fc', to: '#e6f4ea' },
  testimonials:  { from: '#f0ecff', via: '#e8f5ec', to: '#f5f0ff' },
  cta:           { from: '#e6f4ea', via: '#ece8fc', to: '#f0f5ff' },
  footer:        { from: '#1a1a2e', via: '#2d2d44', to: '#1a1a2e' },
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
