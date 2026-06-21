'use client';
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Eye, EyeOff, Lock, ShieldCheck, XCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

const INK = '#111111';
const MUTE = '#737373';
const FAINT = '#A3A3A3';
const LINE = '#E5E5E5';
const ACCENT = '#4F46E5';

type InviteInfo = { email: string; name: string; role: string; expiresAt: string };
type Phase = 'loading' | 'valid' | 'used' | 'expired' | 'invalid' | 'success';

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState('');
  const [pct, setPct] = useState(100);

  useEffect(() => {
    if (!expiresAt) return;
    const TOTAL = 4.5 * 60 * 60 * 1000;
    const end = new Date(expiresAt).getTime();

    function tick() {
      const left = end - Date.now();
      if (left <= 0) { setRemaining('Expired'); setPct(0); return; }
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const s = Math.floor((left % 60000) / 1000);
      setRemaining(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
      setPct(Math.max(0, (left / TOTAL) * 100));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { remaining, pct };
}

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: ok ? ACCENT : FAINT, fontWeight: ok ? 600 : 400 }}>
      <span style={{ fontSize: 13 }}>{ok ? '✓' : '○'}</span>
      {label}
    </div>
  );
}

export default function InvitePage() {
  return (
    <React.Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#E9EBFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${LINE}`, borderTop: `3px solid ${ACCENT}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <InviteContent />
    </React.Suspense>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#E9EBFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${LINE} 1px, transparent 1px)`, backgroundSize: '28px 28px', opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 12, padding: '10px 18px', marginBottom: 12 }}>
            <ShieldCheck size={18} color={ACCENT} />
            <span style={{ fontSize: 15, fontWeight: 800, color: INK, letterSpacing: '-0.3px' }}>EduTechExOS</span>
          </div>
          <p style={{ fontSize: 11, color: FAINT, margin: 0, letterSpacing: '.04em' }}>Secure Workspace Invitation</p>
        </div>
        <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 18, padding: '28px 24px', boxShadow: '0 16px 48px rgba(17,17,17,0.06)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function InviteContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const token     = params?.get('token') ?? '';

  const [phase, setPhase]       = useState<Phase>('loading');
  const [invite, setInvite]     = useState<InviteInfo | null>(null);
  const [errMsg, setErrMsg]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [submitting, setSub]    = useState(false);

  const { remaining, pct } = useCountdown(invite?.expiresAt ?? null);

  // Rules
  const rules = {
    len:    password.length >= 8,
    upper:  /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match:  password === confirm && password.length > 0,
  };
  const allOk = Object.values(rules).every(Boolean);

  const validate = useCallback(async () => {
    if (!token) { setPhase('invalid'); return; }
    try {
      const res  = await fetch(`${API_BASE}/api/invite/validate?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('already been used')) { setPhase('used'); return; }
        if (data.error?.includes('expired'))           { setPhase('expired'); return; }
        setErrMsg(data.error ?? 'Invalid invite link.'); setPhase('invalid'); return;
      }
      setInvite(data);
      setPhase('valid');
    } catch {
      setErrMsg('Could not reach server. Check your connection.'); setPhase('invalid');
    }
  }, [token]);

  useEffect(() => { validate(); }, [validate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allOk || submitting) return;
    setSub(true);
    try {
      const res  = await fetch(`${API_BASE}/api/invite/accept`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error ?? 'Failed to activate account.'); setSub(false); return; }
      setPhase('success');
    } catch {
      setErrMsg('Could not reach server. Try again.'); setSub(false);
    }
  }

  const primaryBtn: React.CSSProperties = {
    marginTop: 20, width: '100%', height: 46, borderRadius: 10, background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${LINE}`, borderTop: `3px solid ${ACCENT}`, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: MUTE, fontSize: 13 }}>Validating your invite link…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Shell>
  );

  // ── Used ─────────────────────────────────────────────────────────────────────
  if (phase === 'used') return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <CheckCircle2 size={44} color={ACCENT} style={{ margin: '0 auto 14px' }} />
        <h2 style={{ color: INK, fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Already Activated</h2>
        <p style={{ color: MUTE, fontSize: 13, lineHeight: 1.6 }}>This invite link has already been used to create an account. You can sign in directly.</p>
        <button onClick={() => router.push('/sign-up-login-screen')} style={primaryBtn}>
          Go to Sign In →
        </button>
      </div>
    </Shell>
  );

  // ── Expired ───────────────────────────────────────────────────────────────────
  if (phase === 'expired') return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <Clock size={44} color={INK} style={{ margin: '0 auto 14px' }} />
        <h2 style={{ color: INK, fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Invite Expired</h2>
        <p style={{ color: MUTE, fontSize: 13, lineHeight: 1.6 }}>This invite link expired after 4.5 hours. Please ask your admin to send a new invite.</p>
        <div style={{ marginTop: 20, background: '#E9EBFA', border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 14px', fontSize: 12, color: MUTE, textAlign: 'left' }}>
          Admins can resend an invite from the <strong style={{ color: INK }}>Admin Panel → Requests</strong> tab.
        </div>
      </div>
    </Shell>
  );

  // ── Invalid ───────────────────────────────────────────────────────────────────
  if (phase === 'invalid') return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <XCircle size={44} color="#DC2626" style={{ margin: '0 auto 14px' }} />
        <h2 style={{ color: INK, fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Invalid Link</h2>
        <p style={{ color: MUTE, fontSize: 13, lineHeight: 1.6 }}>{errMsg || 'This invite link is not valid. Make sure you copied the full URL from your email.'}</p>
      </div>
    </Shell>
  );

  // ── Success ───────────────────────────────────────────────────────────────────
  if (phase === 'success') return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle2 size={28} color="#fff" />
        </div>
        <h2 style={{ color: INK, fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Account Activated!</h2>
        <p style={{ color: MUTE, fontSize: 13, lineHeight: 1.6, margin: '0 0 6px' }}>Welcome to EduTechExOS, <strong style={{ color: INK }}>{invite?.name}</strong>.</p>
        <p style={{ color: FAINT, fontSize: 12 }}>Your account is ready. Sign in with your email and the password you just set.</p>
        <button onClick={() => router.push('/sign-up-login-screen')} style={{ ...primaryBtn, marginTop: 24 }}>
          Sign In to EduTechExOS →
        </button>
      </div>
    </Shell>
  );

  // ── Valid — show password form ────────────────────────────────────────────────
  const barColor = pct > 20 ? ACCENT : '#DC2626';
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, paddingLeft: 34, paddingRight: 38, borderRadius: 10, background: '#FFFFFF', border: `1px solid ${LINE}`, color: INK, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <Shell>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: INK, fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          You&apos;re Invited!
        </h2>
        <p style={{ color: MUTE, fontSize: 13, margin: 0 }}>
          Set your password to activate your account.
        </p>
      </div>

      {/* Invite info card */}
      <div style={{ background: '#E9EBFA', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
          <div>
            <p style={{ fontSize: 10, color: FAINT, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.06em' }}>Name</p>
            <p style={{ fontSize: 13, color: INK, fontWeight: 600, margin: 0 }}>{invite?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: FAINT, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.06em' }}>Role</p>
            <p style={{ fontSize: 13, color: ACCENT, fontWeight: 700, margin: 0 }}>{invite?.role}</p>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <p style={{ fontSize: 10, color: FAINT, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.06em' }}>Email</p>
            <p style={{ fontSize: 13, color: INK, margin: 0 }}>{invite?.email}</p>
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: MUTE, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> Link expires in
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: barColor, fontVariantNumeric: 'tabular-nums' }}>{remaining}</span>
        </div>
        <div style={{ height: 4, background: LINE, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 1s linear, background 0.5s' }} />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Password */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTE, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Set Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: FAINT }} />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Choose a strong password"
              required
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: FAINT, padding: 2 }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTE, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Confirm Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: FAINT }} />
            <input
              type={showCf ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              style={{ ...inputStyle, border: `1px solid ${confirm && !rules.match ? '#DC2626' : LINE}` }}
            />
            <button type="button" onClick={() => setShowCf(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: FAINT, padding: 2 }}>
              {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Rules */}
        {password.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 14, padding: '10px 12px', background: '#E9EBFA', border: `1px solid ${LINE}`, borderRadius: 8 }}>
            <PasswordRule ok={rules.len}    label="8+ characters" />
            <PasswordRule ok={rules.upper}  label="Uppercase letter" />
            <PasswordRule ok={rules.number} label="Number" />
            <PasswordRule ok={rules.match}  label="Passwords match" />
          </div>
        )}

        {errMsg && (
          <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.20)', borderRadius: 8, fontSize: 12, color: '#DC2626' }}>
            {errMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={!allOk || submitting}
          style={{ width: '100%', height: 46, borderRadius: 10, background: allOk && !submitting ? ACCENT : '#F5F5F5', color: allOk && !submitting ? '#fff' : FAINT, fontSize: 14, fontWeight: 700, border: allOk && !submitting ? 'none' : `1px solid ${LINE}`, cursor: allOk && !submitting ? 'pointer' : 'not-allowed', transition: 'all .2s' }}
        >
          {submitting ? 'Activating…' : 'Activate My Account →'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 11, color: FAINT, marginTop: 16 }}>
        This link is tied to <strong style={{ color: MUTE }}>{invite?.email}</strong> only.
      </p>
    </Shell>
  );
}
