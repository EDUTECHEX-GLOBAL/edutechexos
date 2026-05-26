'use client';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

export default function AuthCard() {
  const searchParams = useSearchParams();
  const authMode = searchParams.get('mode') === 'admin' ? 'admin' : 'user';
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const isAdminMode = authMode === 'admin';

  return (
    <div className="w-full max-w-md mt-14 animate-fade-up">
      <div className="card-premium overflow-hidden">
        <div className="flex border-b border-border">
          {(isAdminMode ? ['login'] : ['login', 'signup']).map((tab) => (
            <button
              key={`tab-${tab}`}
              onClick={() => setActiveTab(tab as 'login' | 'signup')}
              className={`flex-1 py-4 text-sm font-semibold tracking-wide transition-all duration-300 ${
                activeTab === tab
                  ? 'text-foreground border-b-2 border-primary bg-surface'
                  : 'text-ink-light hover:text-ink hover:bg-secondary/50'
              }`}
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
    <div className="mt-4 card-premium p-5 animate-fade-up delay-200">
      <p className="font-mono text-[10px] font-semibold text-ink-light uppercase tracking-[0.15em] mb-3">
        Demo accounts
      </p>
      <div className="flex flex-col gap-2">
        {accounts.map((acc, i) => (
          <div
            key={acc.role}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface-muted border border-border hover:border-primary/20 hover:bg-surface transition-all duration-200 animate-fade-up"
            style={{ animationDelay: `${300 + i * 80}ms` }}
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
                className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface text-ink-light hover:text-primary hover:border-primary/20 transition-all"
                title="Copy email"
              >
                {copied === `email-${acc.role}` ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => onUse(acc.email, acc.password)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all font-medium hover-lift"
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
