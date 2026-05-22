import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const techStack = ['Python', 'FastAPI', 'React', 'MongoDB', 'Claude 3.5'];

export default function LandingHero() {
  return (
    <section className="pt-32 pb-24 px-6 lg:px-10 max-w-screen-xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: Copy */}
        <div className="flex flex-col gap-8">
          {/* Tag */}
          <div className="flex items-center gap-2 animate-fade-in-down">
            <span className="font-mono text-xs font-600 tracking-[0.15em] text-muted-foreground uppercase border border-border px-3 py-1.5 rounded-full bg-muted/50">
              [INTERNAL PLATFORM · V1.0]
            </span>
          </div>

          {/* Headline */}
          <div className="flex flex-col gap-1">
            <h1
              className="font-display font-800 leading-none tracking-tight animate-fade-in-up delay-150"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
            >
              The team OS
            </h1>
            <h1
              className="font-display font-800 leading-none tracking-tight text-primary text-shimmer animate-fade-in-up delay-300"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
            >
              EduTechEx runs on.
            </h1>
          </div>

          {/* Subtext */}
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md animate-fade-in-up delay-400">
            Channels, embedded AI, auto-extracted tasks, and morning digests —
            all the context your team needs, without the noise.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-in-up delay-500">
            <Link
              href="/dashboard"
              className="btn-black px-7 py-3.5 text-sm rounded-full hover-lift animate-pulse-glow"
            >
              Open the platform →
            </Link>
            <Link
              href="/sign-up-login-screen"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 underline underline-offset-4"
            >
              I already have an account
            </Link>
          </div>

          {/* Tech stack pills */}
          <div className="flex flex-wrap gap-2 pt-2 animate-fade-in-up delay-600">
            <span className="font-mono text-xs text-muted-foreground mr-1 self-center">Built on:</span>
            {techStack?.map((tech, i) => (
              <span
                key={`tech-${tech}`}
                className="pill-tag font-mono hover-lift cursor-default"
                style={{ animationDelay: `${600 + i * 60}ms` }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Illustration */}
        <div className="hidden lg:flex items-center justify-center animate-fade-in-right delay-300 animate-float">
          <Image 
            src="/assets/images/hero-illustration.png"
            alt="EduTechEx Team OS Illustration"
            width={600}
            height={600}
            className="w-full h-auto max-w-lg object-contain drop-shadow-2xl"
            priority
          />
        </div>
      </div>
    </section>
  );
}