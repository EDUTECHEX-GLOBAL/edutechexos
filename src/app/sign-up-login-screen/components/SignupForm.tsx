'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type SignupFormData = { name: string; email: string; password: string; role: string };

const roles = ['Developer', 'Designer', 'Manager', 'Other'];
const ACCESS_REQUESTS_KEY = 'edutechex_access_requests';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type AccessRequest = SignupFormData & {
  id: string;
  status: 'pending' | 'approved';
  requestedAt: string;
};

export default function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignupFormData>();

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    const emailClean = data.email.trim().toLowerCase();

    try {
      // ── Try backend first ──────────────────────────────────────────────────
      const res = await fetch(`${API_BASE}/api/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, email: emailClean }),
      });
      const result = await res.json();

      if (result.exists) {
        // Already submitted before
        toast.info(result.message);
        if (result.status === 'approved') onSwitchToLogin();
        return;
      }

      if (result.success) {
        // Also persist to localStorage so the same device works offline / as fallback
        const localRequests: AccessRequest[] = JSON.parse(
          localStorage.getItem(ACCESS_REQUESTS_KEY) || '[]'
        );
        if (!localRequests.some((r) => r.email.toLowerCase() === emailClean)) {
          const localEntry: AccessRequest = {
            ...data,
            id: result.request?.id ?? `request-${Date.now()}`,
            email: emailClean,
            status: 'pending',
            requestedAt: new Date().toISOString(),
          };
          localStorage.setItem(
            ACCESS_REQUESTS_KEY,
            JSON.stringify([localEntry, ...localRequests])
          );
        }
        toast.success('Account request submitted. You can sign in after admin approval.');
        reset();
        onSwitchToLogin();
        return;
      }

      // Backend returned an error (e.g. system account conflict)
      toast.error(result.error ?? 'Failed to submit request.');
    } catch {
      // ── Backend unreachable — fall back to localStorage ────────────────────
      const requests: AccessRequest[] = JSON.parse(
        localStorage.getItem(ACCESS_REQUESTS_KEY) || '[]'
      );
      const existing = requests.find((r) => r.email.toLowerCase() === emailClean);

      if (existing) {
        toast.info(
          existing.status === 'approved'
            ? 'Your access is approved. You can sign in now.'
            : 'Your access request is already waiting for admin approval.'
        );
        if (existing.status === 'approved') onSwitchToLogin();
        return;
      }

      const nextRequest: AccessRequest = {
        ...data,
        id: `request-${Date.now()}`,
        email: emailClean,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        ACCESS_REQUESTS_KEY,
        JSON.stringify([nextRequest, ...requests])
      );
      toast.success('Account request submitted (offline mode). Admin will review it.');
      reset();
      onSwitchToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>

      <div className="flex flex-col gap-1">
        <label htmlFor="signup-name" className="text-xs font-semibold" style={{ color: 'rgba(180,200,255,0.70)' }}>Full name</label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          className={`input-premium ${errors.name ? 'border-red-300 bg-red-50/30' : ''}`}
          {...register('name', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })}
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="signup-email" className="text-xs font-semibold" style={{ color: 'rgba(180,200,255,0.70)' }}>Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@edutechex.in"
          className={`input-premium ${errors.email ? 'border-red-300 bg-red-50/30' : ''}`}
          {...register('email', {
            required: 'Required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
          })}
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="signup-password" className="text-xs font-semibold" style={{ color: 'rgba(180,200,255,0.70)' }}>Password</label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className={`input-premium pr-11 ${errors.password ? 'border-red-300 bg-red-50/30' : ''}`}
            {...register('password', {
              required: 'Required',
              minLength: { value: 8, message: 'Min 8 characters' },
              pattern: { value: /^(?=.*[a-zA-Z])(?=.*\d)/, message: 'Include a letter and number' },
            })}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-foreground transition-colors">
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="signup-role" className="text-xs font-semibold" style={{ color: 'rgba(180,200,255,0.70)' }}>Role</label>
        <select
          id="signup-role"
          className={`input-premium appearance-none cursor-pointer ${errors.role ? 'border-red-300 bg-red-50/30' : ''}`}
          {...register('role', { required: 'Required' })}
          defaultValue=""
        >
          <option value="" disabled>Select role…</option>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        {errors.role && <p className="text-xs text-red-400">{errors.role.message}</p>}
      </div>

      <button type="submit" disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-1"
        style={{
          background: 'linear-gradient(135deg, #7a4a20 0%, #9b5e28 50%, #8a5220 100%)',
          color: '#ffe4b5',
          border: '1px solid rgba(255,200,140,0.30)',
          borderRadius: '12px',
          padding: '11px',
          fontSize: '0.88rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          minHeight: '44px',
        }}>
        {isLoading ? (
          <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Submitting…</span>
        ) : 'Request access'}
      </button>

      <p className="text-center text-xs" style={{ color: 'rgba(180,200,255,0.55)' }}>
        Already have access?{' '}
        <button type="button" onClick={onSwitchToLogin}
          className="font-semibold hover:underline" style={{ color: 'rgba(220,235,255,0.90)' }}>
          Sign in
        </button>
      </p>
    </form>
  );
}
