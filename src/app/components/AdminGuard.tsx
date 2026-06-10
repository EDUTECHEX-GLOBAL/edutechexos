'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const authData = localStorage.getItem('edutechex_token');
    if (!authData) {
      router.push('/sign-up-login-screen?mode=admin&redirect=/admin');
      return;
    }

    try {
      const { user } = JSON.parse(authData);
      if (user && user.role === 'Admin') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error('Error parsing auth token:', error);
      setIsAuthorized(false);
    }
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-ink-light font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl border border-border bg-surface shadow-2xl animate-fade-in-up">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-ink-light mb-8">
            You don&apos;t have the required administrative permissions to view this page.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => router.push('/sign-up-login-screen')}
              className="text-sm text-primary font-600 hover:underline"
            >
              Sign in with a different account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
