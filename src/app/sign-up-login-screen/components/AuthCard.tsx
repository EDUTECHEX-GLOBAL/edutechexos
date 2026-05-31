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
    <div className="w-full max-w-md animate-fade-up">
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
    </div>
  );
}
