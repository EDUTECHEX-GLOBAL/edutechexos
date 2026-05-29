'use client';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

export default function AuthCard({ darkMode = false }: { darkMode?: boolean }) {
  const searchParams = useSearchParams();
  const authMode = searchParams.get('mode') === 'admin' ? 'admin' : 'user';
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const isAdminMode = authMode === 'admin';

  /* ── Dark (tablet) mode — bare form, no outer card ──────────────── */
  if (darkMode) {
    return (
      <div className="w-full animate-fade-up">
        {/* Tabs */}
        {!isAdminMode && (
          <div className="flex mb-5 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 text-xs font-bold tracking-wide transition-all duration-300"
                style={{
                  backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : 'rgba(180,200,255,0.55)',
                  borderBottom: activeTab === tab ? '2px solid rgba(180,210,255,0.60)' : '2px solid transparent',
                }}
              >
                {tab === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'login' ? (
          <LoginForm authMode={authMode} onSwitchToSignup={() => setActiveTab('signup')} darkMode />
        ) : (
          <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
        )}
      </div>
    );
  }

  /* ── Light (default) mode ────────────────────────────────────────── */
  return (
    <div className="w-full max-w-md mt-14 animate-fade-up">
      <div
        className="overflow-hidden rounded-2xl transition-all duration-700"
        style={{
          backgroundColor: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.06), 0 0 40px -8px rgba(45,106,79,0.1)',
        }}
      >
        <div className="flex" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          {(isAdminMode ? ['login'] : ['login', 'signup']).map((tab) => (
            <button
              key={`tab-${tab}`}
              onClick={() => setActiveTab(tab as 'login' | 'signup')}
              className={`flex-1 py-4 text-sm font-bold tracking-wide transition-all duration-300 ${
                activeTab === tab ? 'text-foreground' : 'text-ink-light hover:text-ink'
              }`}
              style={{
                backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.3)' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid #2d6a4f' : '2px solid transparent',
              }}
            >
              {tab === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <div className="p-8 animate-fade-up">
          {activeTab === 'login' ? (
            <LoginForm authMode={authMode} onSwitchToSignup={() => setActiveTab('signup')} />
          ) : (
            <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
          )}
        </div>
      </div>

      <DemoCredentials
        authMode={authMode}
        onUse={(email, password) => {
          const event = new CustomEvent('demo-autofill', { detail: { email, password } });
          window.dispatchEvent(event);
          setActiveTab('login');
        }}
      />
    </div>
  );
}

function DemoCredentials({
  authMode,
  onUse,
}: {
  authMode: 'admin' | 'user';
  onUse: (email: string, password: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const allAccounts = [
    { role: 'Admin', email: 'admin@edutechex.in', password: 'Admin@2026' },
    { role: 'Manager', email: 'aditya@edutechex.in', password: 'TeamOS@2026' },
    { role: 'Developer', email: 'dev.rk@edutechex.in', password: 'DevAccess#26' },
    { role: 'Designer', email: 'design.sa@edutechex.in', password: 'Design$2026' },
    { role: 'Mohan K.', email: 'mohan.kumar@edutechex.in', password: 'MohanK@2026' },
    { role: 'Mohan R.', email: 'mohan.reddy@edutechex.in', password: 'MohanR@2026' },
    { role: 'Mohan S.', email: 'mohan.sen@edutechex.in', password: 'MohanS@2026' },
  ];
  const accounts = allAccounts.filter((a) =>
    authMode === 'admin' ? a.role === 'Admin' : a.role !== 'Admin'
  );

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      className="mt-5 p-5 rounded-2xl transition-all duration-700"
      style={{
        backgroundColor: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <p className="font-mono text-[10px] font-bold text-ink-light uppercase tracking-[0.15em] mb-3">
        Demo accounts
      </p>
      <div className="flex flex-col gap-2">
        {accounts.map((acc, i) => (
          <div
            key={acc.role}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 animate-fade-up"
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              animationDelay: `${300 + i * 80}ms`,
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[10px] font-mono font-semibold text-ink-light w-16 flex-shrink-0">
                {acc.role}
              </span>
              <span className="text-xs text-foreground truncate font-mono">{acc.email}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleCopy(acc.email, `email-${acc.role}`)}
                className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all font-semibold"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: '#6b806b',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                title="Copy email"
              >
                {copied === `email-${acc.role}` ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => onUse(acc.email, acc.password)}
                className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #2d6a4f, #52b788)',
                  color: 'white',
                }}
              >
                Use
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
