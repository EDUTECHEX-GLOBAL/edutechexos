'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

export default function AuthCard({ darkMode = false }: { darkMode?: boolean }) {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const authMode = mode === 'admin' ? 'admin' : 'user';
  const isSignup = mode === 'signup';

  /* ── Dark mode — used on the sign-in page ────────────────────────── */
  if (darkMode) {
    return (
      <div className="w-full animate-fade-up">
        {isSignup ? (
          <SignupForm onSwitchToLogin={() => {
            window.location.href = '/sign-up-login-screen';
          }} />
        ) : (
          <LoginForm authMode={authMode} onSwitchToSignup={() => {
            window.location.href = '/sign-up-login-screen?mode=signup';
          }} darkMode />
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
          boxShadow: '0 8px 48px rgba(0,0,0,0.06), 0 0 40px -8px rgba(62,74,137,0.12)',
        }}
      >
        <div className="p-8 animate-fade-up">
          {isSignup ? (
            <SignupForm onSwitchToLogin={() => {
              window.location.href = '/sign-up-login-screen';
            }} />
          ) : (
            <LoginForm authMode={authMode} onSwitchToSignup={() => {
              window.location.href = '/sign-up-login-screen?mode=signup';
            }} />
          )}
        </div>
      </div>
    </div>
  );
}
