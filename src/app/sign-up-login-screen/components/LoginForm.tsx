'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

type LoginFormData = { email: string; password: string };

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
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

// Hardcoded fallback for when backend is unreachable
const VALID_ACCOUNTS = [
  { email: 'admin@edutechex.in',     password: 'Admin@2026',    name: 'Admin',            role: 'Admin'    },
  { email: 'aditya@edutechex.in',    password: 'TeamOS@2026',   name: 'Aditya Cherikuri', role: 'Manager'  },
  { email: 'dev.rk@edutechex.in',    password: 'DevAccess#26',  name: 'Developer RK',     role: 'Developer'},
  { email: 'design.sa@edutechex.in', password: 'Design$2026',   name: 'Designer SA',      role: 'Designer' },
  { email: 'mohan.kumar@edutechex.in',  password: 'MohanK@2026', name: 'Mohan K.', role: 'Member' },
  { email: 'mohan.reddy@edutechex.in',  password: 'MohanR@2026', name: 'Mohan R.', role: 'Member' },
  { email: 'mohan.sen@edutechex.in',    password: 'MohanS@2026', name: 'Mohan S.', role: 'Member' },
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

  // ── Forgot-password modal state ────────────────────────────────────────────
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotPreviewUrl, setForgotPreviewUrl] = useState('');

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

  function finishLogin(loginAccount: { name: string; email: string; role: string }) {
    // Role guard
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

    // Store token
    localStorage.setItem(
      'edutechex_token',
      JSON.stringify({ user: loginAccount, token: `mock-jwt-${Date.now()}` })
    );

    // Track login date
    const today = new Date().toISOString().split('T')[0];
    const trackKey = `edutechex_logins_${loginAccount.email}`;
    const existing: string[] = JSON.parse(localStorage.getItem(trackKey) || '[]');
    if (!existing.includes(today)) {
      localStorage.setItem(trackKey, JSON.stringify([...existing, today]));
    }

    toast.success(`Welcome back, ${loginAccount.name.split(' ')[0]}!`);
    setIsLoading(false);

    const redirectPath = searchParams.get('redirect');
    if (redirectPath) router.push(redirectPath);
    else if (loginAccount.role === 'Admin') router.push('/admin');
    else router.push('/dashboard');
  }

  // ── Forgot-password: step 1 — request reset code ──────────────────────────
  async function handleForgotRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotError('Enter your email address.'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotError(data.error ?? 'Failed to send reset code.');
      } else {
        if (data.previewUrl) setForgotPreviewUrl(data.previewUrl);
        setForgotStep(2);
      }
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  }

  // ── Forgot-password: step 2 — submit code + new password ──────────────────
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotCode.trim()) { setForgotError('Enter the 6-digit code.'); return; }
    if (forgotNewPass.length < 6) { setForgotError('Password must be at least 6 characters.'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: forgotCode.trim(),
          newPassword: forgotNewPass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotError(data.error ?? 'Failed to reset password.');
      } else {
        toast.success('Password reset! Sign in with your new password.');
        setForgotOpen(false);
        setForgotStep(1);
        setForgotEmail('');
        setForgotCode('');
        setForgotNewPass('');
        setForgotError('');
        setForgotPreviewUrl('');
      }
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    const emailClean = data.email.trim().toLowerCase();

    try {
      // ── Primary: backend authentication ────────────────────────────────────
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailClean, password: data.password }),
      });

      const result = await res.json();

      if (!result.success) {
        setIsLoading(false);
        if (result.error === 'pending') {
          setError('password', { message: 'Your request is waiting for admin approval.' });
        } else if (result.error === 'rejected') {
          setError('password', { message: 'Your access request was declined. Contact admin.' });
        } else {
          setError('password', { message: result.message ?? 'Invalid credentials.' });
        }
        return;
      }

      finishLogin(result.user);
    } catch {
      // ── Fallback: backend unreachable — check localStorage ─────────────────
      const hardcoded = VALID_ACCOUNTS.find(
        (a) => a.email === emailClean && a.password === data.password
      );
      if (hardcoded) {
        finishLogin(hardcoded);
        return;
      }

      const requests: AccessRequest[] = JSON.parse(
        localStorage.getItem(ACCESS_REQUESTS_KEY) || '[]'
      );
      const requestedAccount = requests.find(
        (r) => r.email.toLowerCase() === emailClean && r.password === data.password
      );

      if (!requestedAccount) {
        setIsLoading(false);
        setError('password', { message: 'Invalid credentials. Use an approved user account.' });
        return;
      }
      if (requestedAccount.status === 'pending') {
        setIsLoading(false);
        setError('password', { message: 'Your request is waiting for admin approval.' });
        return;
      }

      // Approved in localStorage fallback
      finishLogin({
        email: requestedAccount.email,
        name: requestedAccount.name,
        role: requestedAccount.role,
      });
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="font-display font-bold text-xl text-foreground mb-1">
          {authMode === 'admin' ? 'Admin sign in' : 'User sign in'}
        </h2>
        <p className="text-sm text-ink-light">
          {authMode === 'admin'
            ? 'Only the admin account can open this path.'
            : 'Approved users can sign in here after admin access is granted.'}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-semibold text-foreground">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@edutechex.in"
          className={`input-premium ${errors.email ? 'border-red-300 bg-red-50/30' : ''}`}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Enter a valid email address',
            },
          })}
        />
        {errors.email && <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-sm font-semibold text-foreground">
            Password
          </label>
          <button
            type="button"
            onClick={() => { setForgotOpen(true); setForgotStep(1); setForgotError(''); setForgotEmail(''); setForgotCode(''); setForgotNewPass(''); setForgotPreviewUrl(''); }}
            className="text-xs text-primary hover:underline font-medium"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Password"
            className={`input-premium pr-11 ${errors.password ? 'border-red-300 bg-red-50/30' : ''}`}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full justify-center py-3.5 text-sm"
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
        <p className="text-center text-sm text-ink-light">
          Need access?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-foreground font-semibold hover:text-primary transition-colors"
          >
            Create account
          </button>
        </p>
      )}
    </form>

    {/* ── Forgot Password Modal ───────────────────────────────────────────── */}
    {forgotOpen && (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="font-display font-bold text-base text-foreground">
                {forgotStep === 1 ? 'Reset your password' : 'Enter the code'}
              </h3>
              <p className="text-xs text-ink-light mt-0.5">
                {forgotStep === 1
                  ? 'We will email a 6-digit reset code to your address.'
                  : `Code sent to ${forgotEmail} — check your inbox (or spam).`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-light hover:bg-secondary hover:text-foreground transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {forgotError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50/50 px-4 py-2.5 text-xs font-medium text-red-600">
                {forgotError}
              </div>
            )}

            {/* Step 1 — email */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotRequest} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Email address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@edutechex.in"
                    className="input-premium"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary w-full justify-center py-3 text-sm"
                >
                  {forgotLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={15} className="animate-spin" /> Sending code…
                    </span>
                  ) : 'Send reset code'}
                </button>
              </form>
            )}

            {/* Step 2 — code + new password */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4" noValidate>
                {forgotPreviewUrl && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-ink">
                    <span className="font-semibold text-primary">Dev mode:</span>{' '}
                    <a href={forgotPreviewUrl} target="_blank" rel="noreferrer" className="underline text-primary">
                      Preview email →
                    </a>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">6-digit code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="input-premium tracking-[0.4em] text-center font-mono text-lg"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">New password</label>
                  <div className="relative">
                    <input
                      type={forgotShowPass ? 'text' : 'password'}
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="New password (min. 6 chars)"
                      className="input-premium pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setForgotShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-foreground"
                    >
                      {forgotShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotError(''); }}
                    className="btn-secondary flex-1 py-3 text-sm"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary flex-1 justify-center py-3 text-sm"
                  >
                    {forgotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={15} className="animate-spin" /> Resetting…
                      </span>
                    ) : 'Reset password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
