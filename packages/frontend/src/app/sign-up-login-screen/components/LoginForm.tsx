'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Lock, ArrowRight, Mail, X } from 'lucide-react';

import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { identifyUser, trackEvent } from '@/app/PostHogProvider';

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
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';


export default function LoginForm({
  authMode,
  onSwitchToSignup,
  darkMode = false,
}: {
  authMode: 'admin' | 'user';
  onSwitchToSignup: () => void;
  darkMode?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Forgot-password modal state ────────────────────────────────────────────
  const lastForgotRef = useRef<number>(0);
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

  function finishLogin(
    loginAccount: { name: string; email: string; role: string },
    jwtToken?: string
  ) {
    if (authMode === 'admin' && loginAccount.role !== 'Admin') {
      setIsLoading(false);
      setError('email', { message: 'Only the admin account can sign in from the Admin button.' });
      return;
    }
    if (authMode === 'user' && loginAccount.role === 'Admin') {
      // Admin logged in from the regular page — just send them to /admin
      if (!jwtToken) {
        setIsLoading(false);
        setError('password', { message: 'Authentication failed: no token received from server.' });
        return;
      }
      const token = jwtToken;
      localStorage.setItem('edutechex_token', JSON.stringify({ user: loginAccount, token }));
      document.cookie = 'auth_session=1; path=/; max-age=604800; SameSite=Lax';
      toast.success(`Welcome back, ${loginAccount.name.split(' ')[0]}!`);
      identifyUser(loginAccount.email, loginAccount.name);
      trackEvent('login', { role: loginAccount.role });
      setIsLoading(false);
      router.push('/admin');
      return;
    }

    try {
      const prevRaw = localStorage.getItem('edutechex_token');
      if (prevRaw) {
        const prevEmail = JSON.parse(prevRaw)?.user?.email ?? '';
        if (prevEmail.toLowerCase() !== loginAccount.email.toLowerCase()) {
          localStorage.removeItem('edutechex-dashboard-v3');
          localStorage.removeItem('edutechex_dashboard_settings');
        }
      }
    } catch {
      /* ignore parse errors */
    }

    if (!jwtToken) {
      setIsLoading(false);
      setError('password', { message: 'Authentication failed: no token received from server.' });
      return;
    }
    const token = jwtToken;
    localStorage.setItem('edutechex_token', JSON.stringify({ user: loginAccount, token }));
    document.cookie = 'auth_session=1; path=/; max-age=604800; SameSite=Lax';

    const today = new Date().toISOString().split('T')[0];
    const trackKey = `edutechex_logins_${loginAccount.email}`;
    const existing: string[] = JSON.parse(localStorage.getItem(trackKey) || '[]');
    if (!existing.includes(today)) {
      localStorage.setItem(trackKey, JSON.stringify([...existing, today]));
    }

    const isPending = (loginAccount as { status?: string }).status === 'pending';
    if (isPending) {
      toast.info(`Signed in, ${loginAccount.name.split(' ')[0]}. Your account is pending admin approval.`, { duration: 5000 });
    } else {
      toast.success(`Welcome back, ${loginAccount.name.split(' ')[0]}!`);
    }
    identifyUser(loginAccount.email, loginAccount.name);
    trackEvent('login', { role: loginAccount.role });
    setIsLoading(false);

    const redirectPath = searchParams?.get('redirect');
    const safeRedirect = redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : null;
    if (safeRedirect) router.push(safeRedirect);
    else if (loginAccount.role === 'Admin') router.push('/admin');
    else router.push('/dashboard');
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    const emailClean = data.email.trim().toLowerCase();

    try {
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

      finishLogin(result.user, result.token);
    } catch {
      setIsLoading(false);
      setError('password', { message: 'Service temporarily unavailable, please try again later.' });
    }
  };

  const inputIvyStyle = {
    background: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(10, 17, 40, 0.08)',
    transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
    borderRadius: '4px',
  };

  return (
    <>
      <style>{`
        .input-ivy:focus {
          border-color: #4F46E5 !important;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.12) !important;
          background: white !important;
          outline: none;
        }
      `}</style>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Email */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#111111]/80 ml-1">
            Institutional Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#111111]/30 group-focus-within:text-[#4F46E5] transition-colors" />
            <input
              type="email"
              autoComplete="email"
              placeholder="email@institution.edu"
              className={`input-ivy w-full pl-12 pr-4 py-4 text-sm text-[#111111] font-medium placeholder:text-[#111111]/20 ${errors.email ? 'border-red-300 bg-red-50/30' : ''}`}
              style={{
                ...inputIvyStyle,
                borderColor: errors.email ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)',
              }}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
            />
          </div>
          {errors.email && (
            <p className="text-xs font-medium text-red-600 ml-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#111111]/80">
              Security Key
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotOpen(true);
                setForgotStep(1);
                setForgotError('');
                setForgotEmail('');
              }}
              className="text-[10px] font-bold text-[#4F46E5] hover:underline transition-all"
            >
              Forgot Key?
            </button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#111111]/30 group-focus-within:text-[#4F46E5] transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••••"
              className={`input-ivy w-full pl-12 pr-12 py-4 text-sm text-[#111111] font-medium placeholder:text-[#111111]/20 ${errors.password ? 'border-red-300 bg-red-50/30' : ''}`}
              style={{
                ...inputIvyStyle,
                borderColor: errors.password ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)',
              }}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#111111]/20 hover:text-[#111111]/60 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-red-600 ml-1">{errors.password.message}</p>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full bg-[#111111] text-[#4F46E5] py-5 font-black uppercase tracking-[0.3em] text-[11px] overflow-hidden transition-all hover:shadow-[0_0_32px_rgba(212,175,55,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#111111]/30 border border-[#111111]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Enter System{' '}
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </span>
            {/* Gold shimmer sweep on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4F46E5]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
        </div>

        {authMode === 'user' && (
          <div className="text-center pt-4">
            <p className="text-xs text-[#111111]/40">
              New to the institution?
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-[#111111] font-bold hover:text-[#4F46E5] underline underline-offset-4 transition-colors ml-1"
              >
                Request Access
              </button>
            </p>
          </div>
        )}
      </form>

      {/* Forgot Password Modal Refactored for Ivy Style */}
      {forgotOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#111111]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/80 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#111111]/5 px-8 py-6">
              <div>
                <h3 className="font-extrabold tracking-tight text-2xl text-[#111111]">
                  {forgotStep === 1 ? 'Reset Security Key' : 'Verify Key'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="text-[#111111]/30 hover:text-[#111111] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 py-8">
              {forgotError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
                  {forgotError}
                </div>
              )}

              {forgotStep === 1 ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!forgotEmail.trim()) {
                      setForgotError('Enter your email address.');
                      return;
                    }
                    const now = Date.now();
                    if (now - lastForgotRef.current < 60000) {
                      setForgotError('Please wait 60 seconds before requesting another reset.');
                      return;
                    }
                    lastForgotRef.current = now;
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
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#111111]/80 ml-1">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@institution.edu"
                      className="input-ivy w-full px-4 py-4 text-sm text-[#111111] font-medium"
                      style={inputIvyStyle}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-[#111111] text-white py-4 font-black uppercase tracking-[0.2em] text-[10px] rounded-xs transition-all hover:bg-[#4F46E5] hover:text-[#111111]"
                  >
                    {forgotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" /> Sending...
                      </span>
                    ) : (
                      'Send Reset Code'
                    )}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!forgotCode.trim()) {
                      setForgotError('Enter the 6-digit code.');
                      return;
                    }
                    if (forgotNewPass.length < 6) {
                      setForgotError('Password must be at least 6 characters.');
                      return;
                    }
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
                        toast.success('Security key reset! Sign in with your new key.');
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
                  }}
                  className="space-y-6"
                >
                  {forgotPreviewUrl && (
                    <div className="rounded-lg border border-[#4F46E5]/20 bg-[#4F46E5]/5 px-4 py-2.5 text-xs text-[#111111]">
                      <span className="font-semibold text-[#4F46E5]">Dev mode:</span>{' '}
                      <a
                        href={forgotPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-[#4F46E5]"
                      >
                        Preview email →
                      </a>
                    </div>
                  )}
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#111111]/80 ml-1">
                      6-Digit Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="input-ivy w-full px-4 py-4 text-center font-mono text-xl tracking-[0.4em] text-[#111111]"
                      style={inputIvyStyle}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#111111]/80 ml-1">
                      New Security Key
                    </label>
                    <div className="relative">
                      <input
                        type={forgotShowPass ? 'text' : 'password'}
                        value={forgotNewPass}
                        onChange={(e) => setForgotNewPass(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="input-ivy w-full pl-4 pr-12 py-4 text-sm text-[#111111] font-medium"
                        style={inputIvyStyle}
                      />
                      <button
                        type="button"
                        onClick={() => setForgotShowPass((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#111111]/20 hover:text-[#111111]/60"
                      >
                        {forgotShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotError('');
                      }}
                      className="flex-1 bg-transparent border border-[#111111]/10 text-[#111111] py-4 font-black uppercase tracking-[0.2em] text-[10px] rounded-sm hover:bg-[#111111]/5 transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 bg-[#111111] text-white py-4 font-black uppercase tracking-[0.2em] text-[10px] rounded-sm transition-all hover:bg-[#4F46E5] hover:text-[#111111]"
                    >
                      {forgotLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Verifying...
                        </span>
                      ) : (
                        'Reset Key'
                      )}
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
