'use client';

import React from 'react';
import {
  DecoCorner,
  DecoDiamond,
  DecoEyebrow,
  DecoRule,
  DecoStyles,
} from '@/app/components/LandingDeco';
import { LayoutGrid, Cpu, Layers, Sparkles } from 'lucide-react';

export default function InternalPlatform() {
  return (
    <main className="min-h-screen bg-background dot-grid flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <DecoStyles />

      {/* Decorative Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] orb-indigo opacity-50 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] orb-purple opacity-40 pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-4xl bg-white/94 rounded-3xl border border-border/50 p-6 md:p-12 shadow-[0_32px_96px_rgba(26,27,58,0.08)] backdrop-blur-xl">
        {/* Deco corners */}
        <div className="absolute top-3 left-3"><DecoCorner corner="tl" size={64} opacity={0.5} /></div>
        <div className="absolute top-3 right-3"><DecoCorner corner="tr" size={64} opacity={0.5} /></div>
        <div className="absolute bottom-3 left-3"><DecoCorner corner="bl" size={64} opacity={0.5} /></div>
        <div className="absolute bottom-3 right-3"><DecoCorner corner="br" size={64} opacity={0.5} /></div>

        {/* Header Section */}
        <div className="text-center mb-12 mt-4">
          <DecoEyebrow label="Workspace Engine v1.0" align="center" />
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-foreground font-display tracking-tight">
            Internal Platform
          </h1>
          <p className="mt-3 text-lg text-ink font-medium">
            The collaborative backbone powering the entire EduTechEx ecosystem.
          </p>
          <div className="mt-4 flex justify-center">
            <DecoRule width={200} />
          </div>
        </div>

        {/* Feature Grid & Tech Stack Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Features Card */}
          <div className="relative overflow-hidden bg-white border border-border/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles size={20} />
              </div>
              <h2 className="text-lg font-bold text-foreground font-display">Core Features</h2>
            </div>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-1.5"><DecoDiamond size={6} /></div>
                <p className="text-sm text-ink leading-relaxed">
                  <strong className="text-foreground">Channels:</strong> Dedicated workspaces for real-time team synchronization.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1.5"><DecoDiamond size={6} /></div>
                <p className="text-sm text-ink leading-relaxed">
                  <strong className="text-foreground">Embedded AI:</strong> Intelligent assistance integrated directly into chat flows.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1.5"><DecoDiamond size={6} /></div>
                <p className="text-sm text-ink leading-relaxed">
                  <strong className="text-foreground">Auto-extracted Tasks:</strong> Auto-detection and tracking of task items from conversations.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1.5"><DecoDiamond size={6} /></div>
                <p className="text-sm text-ink leading-relaxed">
                  <strong className="text-foreground">Morning Digests:</strong> Comprehensive summaries compiling daily accomplishments and focus points.
                </p>
              </li>
            </ul>
          </div>

          {/* Tech Stack Card */}
          <div className="relative overflow-hidden bg-white border border-border/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                  <Layers size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground font-display">Architecture & Stack</h2>
              </div>
              <p className="text-sm text-ink mb-6 leading-relaxed">
                Built on a highly scalable, robust stack designed for minimal overhead and zero latency operations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-center p-3 rounded-xl border border-border/40 bg-background/30 text-foreground font-mono text-xs font-semibold">
                Python / FastAPI
              </div>
              <div className="flex items-center justify-center p-3 rounded-xl border border-border/40 bg-background/30 text-foreground font-mono text-xs font-semibold">
                React / Next.js
              </div>
              <div className="flex items-center justify-center p-3 rounded-xl border border-border/40 bg-background/30 text-foreground font-mono text-xs font-semibold">
                MongoDB
              </div>
              <div className="flex items-center justify-center p-3 rounded-xl border border-border/40 bg-background/30 text-foreground font-mono text-xs font-semibold">
                Gemini LLM
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-border/30 pt-8">
          <a href="/dashboard" className="hero-cta-primary w-full sm:w-auto text-center rounded-xl">
            Open the Platform
          </a>
          <a href="/sign-up-login-screen" className="hero-cta-ghost w-full sm:w-auto text-center rounded-xl">
            Sign in to your account
          </a>
        </div>
      </div>
    </main>
  );
}
