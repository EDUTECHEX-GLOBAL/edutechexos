'use client';
import React from 'react';

const items = [
  'Channels',
  'AI Agent',
  'Task Extraction',
  'Daily Digest',
  'Wiki',
  'Team Hub',
  'Access Control',
  'AI Copilot',
  'Morning Digest',
  'Org Memory',
  'Real-time Sync',
  'Knowledge Base',
];

function Track({ reverse = false }: { reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="flex overflow-hidden whitespace-nowrap">
      <div
        className="flex gap-0 shrink-0"
        style={{ animation: `marquee${reverse ? '-rev' : ''} 28s linear infinite` }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center">
            <span
              className="px-8 text-xs font-bold uppercase tracking-[0.22em]"
              style={{ color: reverse ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.75)' }}
            >
              {item}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8 }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingMarquee() {
  return (
    <div
      className="relative overflow-hidden py-5"
      style={{
        background: '#191E2F',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex flex-col gap-3">
        <Track />
        <Track reverse />
      </div>

      {/* Edge fade masks */}
      <div
        className="absolute inset-y-0 left-0 w-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, #191E2F, transparent)',
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, #191E2F, transparent)',
        }}
      />

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes marquee-rev {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
