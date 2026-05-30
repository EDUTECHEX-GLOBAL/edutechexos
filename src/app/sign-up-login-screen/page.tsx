'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  Hash, Bell, CheckSquare, BookOpen,
  Sparkles, Users, MessageCircle, Bot, Newspaper,
} from 'lucide-react';
import AuthCard from './components/AuthCard';

/* Floating ambient chips */
const leftChips = [
  { icon: Hash,        label: '#general',          top: '20%', left: '3%',  delay: '0s'   },
  { icon: Bell,        label: 'You were mentioned', top: '35%', left: '1%',  delay: '0.6s' },
  { icon: Newspaper,   label: 'Daily digest',       top: '52%', left: '4%',  delay: '1.1s' },
  { icon: CheckSquare, label: 'Task extracted',     top: '68%', left: '2%',  delay: '0.4s' },
  { icon: BookOpen,    label: 'Wiki updated',       top: '81%', left: '5%',  delay: '0.9s' },
];

const rightChips = [
  { icon: Sparkles,     label: 'AI Copilot',  top: '22%', right: '2%', delay: '0.3s' },
  { icon: Users,        label: 'Team Hub',    top: '42%', right: '3%', delay: '0.8s' },
  { icon: Bot,          label: 'AI Agent',    top: '60%', right: '1%', delay: '1.3s' },
  { icon: MessageCircle,label: 'New message', top: '76%', right: '4%', delay: '0.5s' },
];

function Chip({
  icon: Icon, label, style,
}: {
  icon: React.ElementType;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="absolute flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold select-none pointer-events-none whitespace-nowrap"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.09)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        color: '#1a2e1a',
        ...style,
      }}
    >
      <Icon size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#ede8dd' }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.045) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
        }}
      />

      {/* Left floating chips */}
      {leftChips.map((chip, i) => (
        <Chip
          key={chip.label}
          icon={chip.icon}
          label={chip.label}
          style={{
            top: chip.top,
            left: chip.left,
            animation: `chip-float ${3.5 + i * 0.4}s ease-in-out ${chip.delay} infinite alternate`,
          }}
        />
      ))}

      {/* Right floating chips */}
      {rightChips.map((chip, i) => (
        <Chip
          key={chip.label}
          icon={chip.icon}
          label={chip.label}
          style={{
            top: chip.top,
            right: chip.right,
            animation: `chip-float ${3.8 + i * 0.5}s ease-in-out ${chip.delay} infinite alternate`,
          }}
        />
      ))}

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <header
        className="relative z-50 w-full"
        style={{
          backgroundColor: 'rgba(237,232,221,0.90)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              style={{ background: '#1a3a2a' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="5" cy="8" r="2.5" fill="white" />
                <circle cx="11" cy="5" r="1.8" fill="white" opacity="0.7" />
                <circle cx="11" cy="11" r="1.8" fill="white" opacity="0.7" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-[-0.01em]" style={{ color: '#1a2e1a' }}>
              EduTechEx<span style={{ color: '#2d6a4f' }}>OS</span>
            </span>
          </Link>

          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:text-foreground"
            style={{ color: '#6b7b6b' }}
          >
            ← Back to home
          </Link>
        </div>
      </header>

      {/* ── Main layout ───────────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Heading */}
          <div className="text-center mb-8">
            <h1
              className="font-black tracking-[-0.03em] leading-[0.92] mb-3"
              style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#1a2e1a' }}
            >
              Welcome back to<br />your workspace.
            </h1>
            <p className="text-sm font-medium" style={{ color: '#6b7b6b' }}>
              Sign in or create an account to continue.
            </p>
          </div>

          {/* Auth card */}
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}
          >
            <Suspense fallback={
              <div className="text-center text-xs py-8" style={{ color: '#6b7b6b' }}>
                Loading…
              </div>
            }>
              <AuthCard />
            </Suspense>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chip-float {
          from { transform: translateY(0px);   }
          to   { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
