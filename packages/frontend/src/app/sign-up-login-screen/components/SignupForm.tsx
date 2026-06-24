'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Mail, User, Briefcase, ArrowRight, KeyRound, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type SignupFormData = { name: string; email: string; role: string };

const roles = ['Developer', 'Designer', 'Manager', 'Other'];
const ACCESS_REQUESTS_KEY = 'edutechex_access_requests';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

type AccessRequest = SignupFormData & {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
};

const inputIvyStyle = {
  background: 'rgba(255, 255, 255, 0.8)',
  border: '1px solid rgba(10, 17, 40, 0.08)',
  transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
  borderRadius: '4px',
};

export default function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleResendPassword = async () => {
    if (!submittedEmail) return;
    setIsResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: submittedEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Confirmation email resent! Check your inbox.', { duration: 6000 });
      } else {
        toast.error(data.error ?? 'Failed to resend. Please try again.');
      }
    } catch {
      toast.error('Network error. Please check your connection.');
    } finally {
      setIsResending(false);
    }
  };

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
          localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify([localEntry, ...localRequests]));
        }
        toast.success('Access request submitted! Check your email for a confirmation.', { duration: 7000 });
        setSubmittedEmail(emailClean);
        setSubmitted(true);
        reset();
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
            : 'Your account is pending admin approval. Check your email for your temporary password.'
        );
        if (existing.status === 'approved') onSwitchToLogin();
        return;
      }

      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 8px' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Mail size={24} style={{ color: '#4f46e5' }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A1128', marginBottom: 8 }}>Request submitted!</h2>
        <p style={{ fontSize: 13, color: 'rgba(10,17,40,0.55)', marginBottom: 6, lineHeight: 1.6 }}>
          A confirmation email has been sent to
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5', marginBottom: 28 }}>{submittedEmail}</p>
        <p style={{ fontSize: 12, color: 'rgba(10,17,40,0.4)', marginBottom: 24 }}>
          An admin will review your request. You&apos;ll receive a separate email with your login credentials once approved.
        </p>

        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{
            width: '100%',
            background: '#0A1128',
            color: '#D4AF37',
            padding: '14px 0',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Go to Sign In <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={handleResendPassword}
          disabled={isResending}
          style={{
            width: '100%',
            background: 'transparent',
            color: 'rgba(10,17,40,0.55)',
            padding: '12px 0',
            fontWeight: 600,
            fontSize: 12,
            border: '1px solid rgba(10,17,40,0.12)',
            borderRadius: 4,
            cursor: isResending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: isResending ? 0.6 : 1,
          }}
        >
          {isResending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {isResending ? 'Resending…' : "Didn't receive it? Resend confirmation"}
        </button>
      </div>
    );
  }

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

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(91,79,219,0.06)', border: '1px solid rgba(91,79,219,0.14)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
        <KeyRound size={14} style={{ color: '#5B4FDB', flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(26,27,58,0.65)', lineHeight: 1.5 }}>
          This workspace is <strong>invite-only</strong>. Submit your request and an admin will review and approve your access.
        </p>
      </div>

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
              style={{
                ...inputIvyStyle,
                borderColor: errors.name ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)',
              }}
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Min 2 characters' },
              })}
            />
          </div>
          {errors.name && (
            <p className="text-xs font-medium text-red-600 ml-1">{errors.name.message}</p>
          )}
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
              placeholder="you@gmail.com"
              className={`input-ivy w-full pl-12 pr-4 py-4 text-sm text-[#0A1128] font-medium placeholder:text-[#0A1128]/20 ${errors.email ? 'border-red-300 bg-red-50/30' : ''}`}
              style={{
                ...inputIvyStyle,
                borderColor: errors.email ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)',
              }}
              {...register('email', {
                required: 'Email is required',
                validate: (v) => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase()))
                    return 'Enter a valid email address';
                  return true;
                },
              })}
            />
          </div>
          {errors.email && (
            <p className="text-xs font-medium text-red-600 ml-1">{errors.email.message}</p>
          )}
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
              style={{
                ...inputIvyStyle,
                borderColor: errors.role ? 'rgba(248,113,113,0.6)' : 'rgba(10, 17, 40, 0.08)',
              }}
              {...register('role', { required: 'Role is required' })}
              defaultValue=""
            >
              <option value="" disabled>
                Select your role…
              </option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          {errors.role && (
            <p className="text-xs font-medium text-red-600 ml-1">{errors.role.message}</p>
          )}
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
                  Creating account…
                </>
              ) : (
                <>
                  Create Account{' '}
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
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
