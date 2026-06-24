'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import {
  DecoCorner,
  DecoDiamond,
  DecoEyebrow,
  DecoRule,
  DecoStyles,
} from '@/app/components/LandingDeco';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background dot-grid flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <DecoStyles />
      
      {/* Background orbs */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#DDD8F6]/20 via-transparent to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-radial from-primary/8 via-lavender/4 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/94 rounded-3xl border border-border/50 p-8 shadow-[0_32px_80px_rgba(26,27,58,0.08)] backdrop-blur-xl text-center">
        {/* Deco stepped corners */}
        <div className="absolute top-2 left-2"><DecoCorner corner="tl" size={40} opacity={0.4} /></div>
        <div className="absolute top-2 right-2"><DecoCorner corner="tr" size={40} opacity={0.4} /></div>
        <div className="absolute bottom-2 left-2"><DecoCorner corner="bl" size={40} opacity={0.4} /></div>
        <div className="absolute bottom-2 right-2"><DecoCorner corner="br" size={40} opacity={0.4} /></div>

        <div className="mb-4">
          <DecoEyebrow label="System Error" align="center" />
        </div>

        <h1 className="font-display font-black text-7xl md:text-8xl leading-none text-gradient-rainbow tracking-tighter my-2">
          404
        </h1>

        <div className="flex justify-center my-4">
          <DecoRule width={140} />
        </div>

        <h2 className="font-display font-bold text-xl text-foreground mb-2 mt-4">Page Not Found</h2>
        <p className="text-ink text-sm mb-8 leading-relaxed">
          The workspace resource you are seeking is either restricted or does not exist at this address.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => window.history.back()} 
            className="btn-ghost px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            Go back
          </button>
          
          <button 
            onClick={() => router.push('/dashboard')} 
            className="btn-primary px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <Home size={14} />
            Back to Dashboard
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5">
          <DecoDiamond size={4} />
          <span className="text-[10px] text-ink-light font-mono uppercase tracking-wider">EduTechExOS v1.0</span>
          <DecoDiamond size={4} />
        </div>
      </div>
    </div>
  );
}
