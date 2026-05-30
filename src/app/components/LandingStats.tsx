'use client';
import React from 'react';
import AnimatedSection from './AnimatedSection';

const stats = [
  { value: '07',   label: 'Team Members',     sub: 'Active accounts'         },
  { value: '3+',   label: 'Live Channels',     sub: 'Project workspaces'      },
  { value: '100%', label: 'Context Retained',  sub: 'Zero information loss'   },
  { value: '∞',    label: 'Org Memory',        sub: 'Searchable forever'      },
];

export default function LandingStats() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#ede8dd', borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
        backgroundSize: '52px 52px',
      }} />

      <div className="relative max-w-screen-xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          {stats.map((s, i) => (
            <AnimatedSection key={s.label} direction="up" delay={i * 0.08}>
              <div className="flex flex-col justify-center px-10 py-14 group cursor-default transition-all duration-300 hover:bg-white/40">
                {/* Big number */}
                <div
                  className="font-black leading-none mb-3 transition-all duration-300 group-hover:scale-[1.04]"
                  style={{
                    fontSize: 'clamp(3rem, 5vw, 4.5rem)',
                    color: '#1a2e1a',
                    letterSpacing: '-0.04em',
                    fontFamily: '"Cabinet Grotesk", "Inter", system-ui, sans-serif',
                  }}
                >
                  {s.value}
                </div>
                {/* Label */}
                <div className="font-bold text-sm mb-1" style={{ color: '#1a2e1a' }}>{s.label}</div>
                {/* Sub */}
                <div className="text-xs font-medium" style={{ color: '#6b7b6b' }}>{s.sub}</div>
                {/* Bottom accent line on hover */}
                <div
                  className="mt-5 h-0.5 w-8 rounded-full transition-all duration-300 group-hover:w-16"
                  style={{ background: '#1a3a2a' }}
                />
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
