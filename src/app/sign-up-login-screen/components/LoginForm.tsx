'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

type LoginFormData = {
  email: string;
  password: string;
};

type AccessRequest = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  status: 'pending' | 'approved';
  requestedAt: string;
};

const ACCESS_REQUESTS_KEY = 'edutechex_access_requests';

const VALID_ACCOUNTS = [
  { email: 'admin@edutechex.in', password: 'Admin@2026', name: 'Admin', role: 'Admin' },
  { email: 'aditya@edutechex.in', password: 'TeamOS@2026', name: 'Aditya Cherikuri', role: 'Manager' },
  { email: 'dev.rk@edutechex.in', password: 'DevAccess#26', name: 'Developer RK', role: 'Developer' },
  { email: 'design.sa@edutechex.in', password: 'Design$2026', name: 'Designer SA', role: 'Designer' },
  { email: 'mohan.kumar@edutechex.in', password: 'MohanK@2026', name: 'Mohan K.', role: 'Member' },
  { email: 'mohan.reddy@edutechex.in', password: 'MohanR@2026', name: 'Mohan R.', role: 'Member' },
  { email: 'mohan.sen@edutechex.in', password: 'MohanS@2026', name: 'Mohan S.', role: 'Member' },
];

export default function LoginForm({
  authMode,
  onSwitchToSignup,
}: {
  authMode: 'admin' | 'user';
  onSwitchToSignup: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ email: string; password: string }>).detail;
      setValue('email', detail.email);
      setValue('password', detail.password);
    };
    window.addEventListener('demo-autofill', handler);
    return () => window.removeEventListener('demo-autofill', handler);
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    const emailClean = data.email.trim().toLowerCase();
    const account = VALID_ACCOUNTS.find(
      (a) => a.email === emailClean && a.password === data.password,
    );
    const requests: AccessRequest[] = JSON.parse(localStorage.getItem(ACCESS_REQUESTS_KEY) || '[]');
    const requestedAccount = requests.find((request) => (
      request.email.toLowerCase() === emailClean && request.password === data.password
    ));
    const loginAccount = account ?? (requestedAccount?.status === 'approved'
      ? {
        email: requestedAccount.email,
        password: requestedAccount.password,
        name: requestedAccount.name,
        role: requestedAccount.role,
      }
      : null);

    if (!loginAccount) {
      setIsLoading(false);
      setError('password', {
        message: requestedAccount?.status === 'pending'
          ? 'Your request is waiting for admin approval.'
          : 'Invalid credentials. Use an approved user account.',
      });
      return;
    }

    if (authMode === 'admin' && loginAccount.role !== 'Admin') {
      setIsLoading(false);
      setError('email', { message: 'Only the admin account can sign in from the Admin button.' });
      return;
    }

    if (authMode === 'user' && loginAccount.role === 'Admin') {
      setIsLoading(false);
      setError('email', { message: 'Admin must use the Admin button on the home page.' });
      return;
    }

    localStorage.setItem(
      'edutechex_token',
      JSON.stringify({ user: loginAccount, token: `mock-jwt-${Date.now()}` }),
    );

    const today = new Date().toISOString().split('T')[0];
    const trackKey = `edutechex_logins_${loginAccount.email}`;
    const existing: string[] = JSON.parse(localStorage.getItem(trackKey) || '[]');
    if (!existing.includes(today)) {
      localStorage.setItem(trackKey, JSON.stringify([...existing, today]));
    }

    toast.success(`Welcome back, ${loginAccount.name.split(' ')[0]}!`);
    setIsLoading(false);

    const redirectPath = searchParams.get('redirect');
    if (redirectPath) {
      router.push(redirectPath);
    } else if (loginAccount.role === 'Admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="font-display font-700 text-xl text-foreground mb-1">
          {authMode === 'admin' ? 'Admin sign in' : 'User sign in'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {authMode === 'admin'
            ? 'Only the admin account can open this path.'
            : 'Approved users can sign in here after admin access is granted.'}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-600 text-foreground">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@edutechex.in"
          className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all duration-150 bg-white focus:ring-2 focus:ring-ring/30 focus:border-ring ${
            errors.email ? 'border-red-400 bg-red-50/50' : 'border-input hover:border-foreground/30'
          }`}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
          })}
        />
        {errors.email && <p className="text-xs text-red-500 font-500">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-sm font-600 text-foreground">
            Password
          </label>
          <button type="button" className="text-xs text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Password"
            className={`w-full px-3.5 py-2.5 pr-11 rounded-lg border text-sm outline-none transition-all duration-150 bg-white focus:ring-2 focus:ring-ring/30 focus:border-ring ${
              errors.password ? 'border-red-400 bg-red-50/50' : 'border-input hover:border-foreground/30'
            }`}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 font-500">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-black w-full py-3 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ minHeight: '48px' }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={15} className="animate-spin" />
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </button>

      {authMode === 'user' && (
        <p className="text-center text-sm text-muted-foreground">
          Need access?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-foreground font-600 hover:text-primary transition-colors"
          >
            Create account
          </button>
        </p>
      )}
    </form>
  );
}
