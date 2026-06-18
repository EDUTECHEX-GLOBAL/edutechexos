'use client';
import React from 'react';
import { useScrollProgress } from '@/hooks/useScrollProgress';

interface Orb {
  size: number;
  x: number;
  y: number;
  color1: string;
  color2: string;
  duration: number;
  delay: number;
  blur: string;
  driftX: number;
  driftY: number;
}

const orbs: Orb[] = [
  {
    size: 700,
    x: -15,
    y: -25,
    color1: '#3E4A89',
    color2: '#9BA6D3',
    duration: 30,
    delay: 0,
    blur: '140px',
    driftX: 8,
    driftY: -10,
  },
  {
    size: 600,
    x: 55,
    y: 35,
    color1: '#7c3aed',
    color2: '#c4b5fd',
    duration: 35,
    delay: -8,
    blur: '120px',
    driftX: -12,
    driftY: 8,
  },
  {
    size: 500,
    x: 25,
    y: 65,
    color1: '#191E2F',
    color2: '#3E4A89',
    duration: 25,
    delay: -15,
    blur: '100px',
    driftX: 10,
    driftY: 12,
  },
  {
    size: 450,
    x: 75,
    y: 15,
    color1: '#c4b5fd',
    color2: '#a78bfa',
    duration: 32,
    delay: -5,
    blur: '90px',
    driftX: -8,
    driftY: -12,
  },
  {
    size: 350,
    x: 45,
    y: 80,
    color1: '#9BA6D3',
    color2: '#2A3568',
    duration: 28,
    delay: -12,
    blur: '80px',
    driftX: 6,
    driftY: -8,
  },
  {
    size: 250,
    x: 10,
    y: 50,
    color1: '#a78bfa',
    color2: '#7c3aed',
    duration: 22,
    delay: -3,
    blur: '60px',
    driftX: -15,
    driftY: 5,
  },
];

export default function FloatingOrbs() {
  const { scrollY } = useScrollProgress();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {orbs.map((orb, i) => {
        const scrollOffset = (scrollY * 0.02 * (i % 2 === 0 ? 1 : -1)) % 15;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              transform: `translate(${scrollOffset * orb.driftX * 0.1}px, ${scrollOffset * orb.driftY * 0.1}px)`,
              background: `radial-gradient(circle, ${orb.color1}18, ${orb.color2}08, transparent)`,
              filter: `blur(${orb.blur})`,
              animation: `orbFloat${i} ${orb.duration}s ease-in-out ${orb.delay}s infinite alternate`,
            }}
          />
        );
      })}
      <style>
        {orbs
          .map(
            (_, i) => `
        @keyframes orbFloat${i} {
          0% { opacity: 0.3; border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
          25% { opacity: 0.5; border-radius: 58% 42% 75% 25% / 76% 46% 54% 24%; }
          50% { opacity: 0.35; border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%; }
          75% { opacity: 0.45; border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%; }
          100% { opacity: 0.3; border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
        }
      `
          )
          .join('')}
      </style>
    </div>
  );
}
