'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Briefcase, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

type SignupFormData = { name: string; email: string; password: string; role: string };

const roles = ['Developer', 'Designer', 'Manager', 'Other'];
const ACCESS_REQUESTS_KEY = 'edutechex_access_requests';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

type AccessRequest = SignupFormData & {
  id: string;
  status: 'pending' | 'approved';
  requestedAt: string;
};

const inputIvyStyle = {
  background: 'rgba(255, 255, 255, 0.8)',
  border: '1px solid rgba(10, 17, 40, 0.08)',
  transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
  borderRadius: '4px',
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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);

      const res = await fetch(`${API_BASE}/api/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, email: emailClean }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const result = await res.json();

      if (result.exists) {
        toast.info(result.message);
        if (result.status === 'approved') onSwitchToLogin();
        return;
      }

      if (result.success) {
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

      toast.error(result.error ?? 'Failed to submit request.');
    } catch {
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
    <>
      <style>{`
        .input-ivy:focus {
          border-color: #D4AF37 !important;
          box-shadow: 0 0 0 1px #D4AF37 !important;
          background: white !important;
          outline: none;
        }
      `}</style>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

        {/* Full Name */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0A1128]/80 ml-1">
            Full Name
          </label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0A1128]/30 group-focus-within:text-[#D4AF37] transition-colors" />
            <input
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              className={`input-ivy w-full pl-12 pr-4 py-4 text-sm text-[#0A1128] font-medium placeholder:text-[#0A1128]/20 ${errors.name ? 'border-red-300 bg-red-50/30' : ''}`}
              style={{ ...inputIvyStyle, borderColor: errors.name ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)' }}
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
            />
          </div>
          {errors.name && <p className="text-xs font-medium text-red-600 ml-1">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0A1128]/80 ml-1">
            Institutional Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0A1128]/30 group-focus-within:text-[#D4AF37] transition-colors" />
            <input
              type="email"
              autoComplete="email"
              placeholder="you@edutechex.in"
              className={`input-ivy w-full pl-12 pr-4 py-4 text-sm text-[#0A1128] font-medium placeholder:text-[#0A1128]/20 ${errors.email ? 'border-red-300 bg-red-50/30' : ''}`}
              style={{ ...inputIvyStyle, borderColor: errors.email ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)' }}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
              })}
            />
          </div>
          {errors.email && <p className="text-xs font-medium text-red-600 ml-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0A1128]/80 ml-1">
            Security Key
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0A1128]/30 group-focus-within:text-[#D4AF37] transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className={`input-ivy w-full pl-12 pr-12 py-4 text-sm text-[#0A1128] font-medium placeholder:text-[#0A1128]/20 ${errors.password ? 'border-red-300 bg-red-50/30' : ''}`}
              style={{ ...inputIvyStyle, borderColor: errors.password ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)' }}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Min 8 characters' },
                pattern: { value: /^(?=.*[a-zA-Z])(?=.*\d)/, message: 'Include a letter and number' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0A1128]/20 hover:text-[#0A1128]/60 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-xs font-medium text-red-600 ml-1">{errors.password.message}</p>}
        </div>

        {/* Role */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0A1128]/80 ml-1">
            Role
          </label>
          <div className="relative group">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0A1128]/30 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />
            <select
              className={`input-ivy w-full pl-12 pr-4 py-4 text-sm text-[#0A1128] font-medium appearance-none cursor-pointer ${errors.role ? 'border-red-300 bg-red-50/30' : ''}`}
              style={{ ...inputIvyStyle, borderColor: errors.role ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)' }}
              {...register('role', { required: 'Role is required' })}
              defaultValue=""
            >
              <option value="" disabled>Select your role…</option>
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          {errors.role && <p className="text-xs font-medium text-red-600 ml-1">{errors.role.message}</p>}
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full bg-[#0A1128] text-[#D4AF37] py-5 font-black uppercase tracking-[0.3em] text-[11px] overflow-hidden transition-all hover:shadow-[0_0_32px_rgba(212,175,55,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#0A1128]/30 border border-[#0A1128]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                <>Request Access <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-[#0A1128]/40">
            Already have access?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[#0A1128] font-bold hover:text-[#D4AF37] underline underline-offset-4 transition-colors ml-1"
            >
              Sign in
            </button>
          </p>
        </div>
      </form>
    </>
  );
}
