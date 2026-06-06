'use client';
import React from 'react';
import { useScrollProgress } from '@/hooks/useScrollProgress';

export default function ScrollProgressBar() {
  const { progress } = useScrollProgress();

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] h-[3px] pointer-events-none">
      <div
        className="h-full w-full transition-transform duration-100 ease-linear"
        style={{
          background: 'linear-gradient(90deg, #3E4A89, #9BA6D3, #c4b5fd, #7c3aed, #2A3568)',
          backgroundSize: '200% 100%',
          animation: 'gradient-shift 3s ease infinite',
          transform: `scaleX(${progress})`,
          transformOrigin: 'left center',
          boxShadow: '0 0 12px rgba(62,74,137,0.45), 0 0 24px rgba(124,58,237,0.2)',
        }}
      />
    </div>
  );
}

export function ScrollIndicator() {
  const { progress, direction } = useScrollProgress();
  if (progress > 0.97) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
      <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-primary/50 uppercase">
        {direction === 'down' ? 'Scroll' : 'Continue'}
      </span>
      <div className="w-[18px] h-[30px] rounded-full border-2 border-primary/25 flex items-start justify-center p-1">
        <div
          className="w-[3px] h-[6px] rounded-full bg-primary transition-all duration-300"
          style={{
            animation: 'scrollDot 2s cubic-bezier(0.22, 1, 0.36, 1) infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes scrollDot {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(14px); opacity: 0.2; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
