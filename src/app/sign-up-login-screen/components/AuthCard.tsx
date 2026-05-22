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
    <div className="w-full max-w-md mt-14 animate-scale-in">
      {/* Card */}
      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden hover-lift transition-shadow duration-300">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {(['login', ...(!isAdminMode ? ['signup'] : [])] as Array<'login' | 'signup'>).map(
            (tab) => (
              <button
                key={`auth-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-sm font-600 tracking-wide transition-all duration-200 ${
                  activeTab === tab
                    ? 'text-foreground border-b-2 border-foreground bg-white'
                    : 'text-muted-foreground bg-muted/30 hover:bg-muted/50'
                }`}
              >
                {tab === 'login' ? 'Sign in' : 'Create account'}
              </button>
            )
          )}
        </div>

        {/* Form content */}
        <div className="p-8 animate-fade-in-up delay-150">
          {activeTab === 'login' ? (
            <LoginForm authMode={authMode} onSwitchToSignup={() => setActiveTab('signup')} />
          ) : (
            <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
          )}
        </div>
      </div>

      {/* Demo credentials */}
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
  const accounts = allAccounts.filter((account) =>
    authMode === 'admin' ? account.role === 'Admin' : account.role !== 'Admin'
  );

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mt-4 border border-border rounded-xl bg-white/80 backdrop-blur-sm p-4 animate-fade-in-up delay-300">
      <p className="text-xs font-mono font-600 text-muted-foreground uppercase tracking-widest mb-3">
        Demo accounts
      </p>
      <div className="flex flex-col gap-2">
        {accounts.map((acc, i) => (
          <div
            key={`demo-${acc.role}`}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-muted/40 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 animate-fade-in-up"
            style={{ animationDelay: `${400 + i * 80}ms` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono font-600 text-muted-foreground w-16 flex-shrink-0">
                {acc.role}
              </span>
              <span className="text-xs text-foreground truncate font-mono">{acc.email}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleCopy(acc.email, `email-${acc.role}`)}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-muted text-muted-foreground transition-colors"
                title="Copy email"
              >
                {copied === `email-${acc.role}` ? '✓' : 'copy'}
              </button>
              <button
                onClick={() => onUse(acc.email, acc.password)}
                className="text-xs px-2.5 py-1 rounded bg-foreground text-background hover:bg-foreground/80 transition-colors font-600 hover-lift"
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
