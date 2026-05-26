'use client';
import React, { useMemo } from 'react';
import { useScrollProgress } from '@/hooks/useScrollProgress';

interface ColorPalette {
  h1: string; h2: string; body: string; accent: string; muted: string;
}

const palettes: ColorPalette[] = [
  { h1: '#1a2e1a', h2: '#2d6a4f', body: '#3d523d', accent: '#2d6a4f', muted: '#6b806b' },
  { h1: '#1a2e1a', h2: '#7c3aed', body: '#3d523d', accent: '#7c3aed', muted: '#6b806b' },
  { h1: '#1a2e1a', h2: '#52b788', body: '#3d523d', accent: '#2d6a4f', muted: '#6b806b' },
  { h1: '#2d2d44', h2: '#7c3aed', body: '#3d523d', accent: '#7c3aed', muted: '#6b806b' },
  { h1: '#1a2e1a', h2: '#7c3aed', body: '#3d523d', accent: '#c4b5fd', muted: '#6b806b' },
  { h1: '#1a2e1a', h2: '#2d6a4f', body: '#3d523d', accent: '#2d6a4f', muted: '#6b806b' },
];

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b_ = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${b_})`;
}

function getPalette(progress: number): ColorPalette {
  const segment = progress * (palettes.length - 1);
  const i = Math.min(Math.floor(segment), palettes.length - 2);
  const t = segment - i;
  const a = palettes[i];
  const b = palettes[Math.min(i + 1, palettes.length - 1)];
  return {
    h1: lerpColor(a.h1, b.h1, t),
    h2: lerpColor(a.h2, b.h2, t),
    body: lerpColor(a.body, b.body, t),
    accent: lerpColor(a.accent, b.accent, t),
    muted: lerpColor(a.muted, b.muted, t),
  };
}

export function useScrollColors() {
  const { progress } = useScrollProgress();
  return useMemo(() => getPalette(progress), [progress]);
}

export function ScrollColorText({
  children, as: Tag = 'span', className = '', style = {},
  colorVar = 'h1',
}: {
  children: React.ReactNode; as?: React.ElementType; className?: string; style?: React.CSSProperties;
  colorVar?: keyof ColorPalette;
}) {
  const colors = useScrollColors();
  return (
    <Tag className={className} style={{ color: colors[colorVar], ...style }}>
      {children}
    </Tag>
  );
}
