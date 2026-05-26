'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type SignupFormData = { name: string; email: string; password: string; role: string };

const roles = ['Developer', 'Designer', 'Manager', 'Other'];
const ACCESS_REQUESTS_KEY = 'edutechex_access_requests';

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
    const requests: AccessRequest[] = JSON.parse(localStorage.getItem(ACCESS_REQUESTS_KEY) || '[]');
    const existing = requests.find((r) => r.email.toLowerCase() === emailClean);

    if (existing) {
      setIsLoading(false);
      toast.info(
        existing.status === 'approved'
          ? 'Your access is approved. You can sign in now.'
          : 'Your access request is already waiting for admin approval.'
      );
      onSwitchToLogin();
      return;
    }

    const nextRequest: AccessRequest = {
      ...data,
      id: `request-${Date.now()}`,
      email: emailClean,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify([nextRequest, ...requests]));

    setIsLoading(false);
    toast.success('Account request submitted. You can sign in after admin approval.');
    reset();
    onSwitchToLogin();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="font-display font-bold text-xl text-foreground mb-1">Create your account</h2>
        <p className="text-sm text-ink-light">Request access to the EduTechEx internal OS.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-name" className="text-sm font-semibold text-foreground">
          Full name
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          placeholder="Venkata Aditya Cherikuri"
          className={`input-premium ${errors.name ? 'border-red-300 bg-red-50/30' : ''}`}
          {...register('name', {
            required: 'Full name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
          })}
        />
        {errors.name && <p className="text-xs text-red-400 font-medium">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-email" className="text-sm font-semibold text-foreground">
          Work email
        </label>
        <p className="text-xs text-ink-light -mt-0.5">
          Use your @edutechex.in address if you have one.
        </p>
        <input
          id="signup-email"
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
        <label htmlFor="signup-password" className="text-sm font-semibold text-foreground">
          Password
        </label>
        <p className="text-xs text-ink-light -mt-0.5">
          Minimum 8 characters. Mix letters, numbers, and symbols.
        </p>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            className={`input-premium pr-11 ${errors.password ? 'border-red-300 bg-red-50/30' : ''}`}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
              pattern: {
                value: /^(?=.*[a-zA-Z])(?=.*\d)/,
                message: 'Include at least one letter and one number',
              },
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-role" className="text-sm font-semibold text-foreground">
          Your role
        </label>
        <p className="text-xs text-ink-light -mt-0.5">
          This determines which channels you&apos;re added to by default.
        </p>
        <select
          id="signup-role"
          className={`input-premium appearance-none cursor-pointer ${errors.role ? 'border-red-300 bg-red-50/30' : ''}`}
          {...register('role', { required: 'Please select your role' })}
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
        {errors.role && <p className="text-xs text-red-400 font-medium">{errors.role.message}</p>}
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
            Submitting request…
          </span>
        ) : (
          'Request access'
        )}
      </button>

      <p className="text-center text-xs text-ink-light leading-relaxed">
        By requesting access, you agree to EduTechEx&apos;s{' '}
        <span className="underline cursor-pointer hover:text-foreground">Terms of Service</span> and{' '}
        <span className="underline cursor-pointer hover:text-foreground">Privacy Policy</span>.
      </p>

      <p className="text-center text-sm text-ink-light">
        Already have access?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-foreground font-semibold hover:text-primary transition-colors"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
