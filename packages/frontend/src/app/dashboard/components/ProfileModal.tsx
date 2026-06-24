'use client';
import React, { useState, useRef } from 'react';
import { X, User, Lock, Camera, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

function getAuth() {
  try { const d = JSON.parse(localStorage.getItem('edutechex_token') ?? ''); return { token: d.token, user: d.user }; }
  catch { return { token: null, user: null }; }
}

interface Props {
  open: boolean;
  onClose: () => void;
  currentUser: { name: string; email: string; role: string; initials: string } | null;
  onProfileUpdated?: (name: string, avatarUrl?: string) => void;
}

export default function ProfileModal({ open, onClose, currentUser, onProfileUpdated }: Props) {
  const [tab, setTab] = useState<'profile' | 'security'>('profile');
  const [name, setName] = useState(currentUser?.name ?? '');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const { token, user } = getAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!preset || !cloud) { toast.error('Cloudinary not configured'); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) setAvatarUrl(data.secure_url);
    } catch { toast.error('Upload failed'); }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ name: name.trim(), bio, timezone, avatarUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Profile updated');
        const stored = JSON.parse(localStorage.getItem('edutechex_token') ?? '{}');
        stored.user = { ...stored.user, name: name.trim(), avatarUrl };
        localStorage.setItem('edutechex_token', JSON.stringify(stored));
        onProfileUpdated?.(name.trim(), avatarUrl || undefined);
      } else toast.error(data.error ?? 'Update failed');
    } catch { toast.error('Network error'); }
    setSaving(false);
  }

  async function changePassword() {
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setChangingPw(true);
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ email: user?.email, currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) { toast.success('Password changed'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
      else toast.error(data.error ?? 'Failed');
    } catch { toast.error('Network error'); }
    setChangingPw(false);
  }

  const initials = (name || currentUser?.name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid rgba(99,102,241,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(99,102,241,0.08)]">
          <span className="text-sm font-black text-slate-800">My Profile</span>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {(['profile', 'security'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === t ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'profile' ? <User size={11} /> : <Lock size={11} />}
              {t === 'profile' ? 'Profile' : 'Security'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'profile' && (
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#FF6B7F,#FF4770)' }}>
                      {initials}
                    </div>
                  )}
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg">
                    <Camera size={10} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">{currentUser?.name}</div>
                  <div className="text-xs text-slate-500">{currentUser?.email}</div>
                  <div className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 inline-block">{currentUser?.role}</div>
                </div>
              </div>

              {/* Fields */}
              <Field label="Display Name">
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-sm" />
              </Field>
              <Field label="Bio">
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} maxLength={300}
                  placeholder="Tell your team a little about yourself..."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none shadow-sm" />
              </Field>
              <Field label="Timezone">
                <select value={timezone} onChange={e => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-sm">
                  {['Asia/Kolkata','Asia/Dubai','America/New_York','America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Singapore','Asia/Tokyo','Australia/Sydney','UTC'].map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_',' ')}</option>
                  ))}
                </select>
              </Field>

              <button onClick={saveProfile} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Changes
              </button>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Min 8 characters, one uppercase letter, one number.
              </div>
              <Field label="Current Password">
                <PasswordInput value={currentPw} onChange={setCurrentPw} show={showCurrent} onToggle={() => setShowCurrent(p => !p)} />
              </Field>
              <Field label="New Password">
                <PasswordInput value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew(p => !p)} />
              </Field>
              <Field label="Confirm New Password">
                <PasswordInput value={confirmPw} onChange={setConfirmPw} show={showNew} onToggle={() => setShowNew(p => !p)} />
              </Field>

              <button onClick={changePassword} disabled={changingPw || !currentPw || !newPw}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:opacity-60">
                {changingPw ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Change Password
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggle }: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-sm" />
      <button type="button" onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}
