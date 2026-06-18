'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-green-surface/30 via-transparent to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-radial from-primary/8 via-lavender/4 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="text-center max-w-md relative">
        <div className="mb-8">
          <h1 className="font-display font-bold text-[8rem] md:text-[10rem] leading-none text-gradient-warm tracking-[-0.05em]">
            404
          </h1>
        </div>
        <h2 className="font-display font-semibold text-2xl text-foreground mb-3">Page not found</h2>
        <p className="text-ink-light mb-10 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you
          back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => window.history.back()} className="btn-secondary px-6 py-3 text-sm">
            <ArrowLeft size={16} />
            Go back
          </button>
          <button onClick={() => router.push('/')} className="btn-primary px-6 py-3 text-sm">
            <Home size={16} />
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
