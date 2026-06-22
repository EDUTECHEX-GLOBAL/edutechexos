'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Zap, CalendarRange, Clock, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Stethoscope, Palmtree, User, HelpCircle, Send,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-ueoq.onrender.com';

type LeaveType = 'instant' | 'planned';
type LeaveCategory = 'sick' | 'vacation' | 'personal' | 'emergency' | 'other';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

interface Leave {
  id: string;
  type: LeaveType;
  leaveCategory: LeaveCategory;
  startDate: string;
  endDate?: string;
  duration?: 'half' | 'full';
  reason: string;
  status: LeaveStatus;
  adminNote?: string;
  requestedAt: string;
}

const SPRING = { type: 'spring', damping: 28, stiffness: 340, mass: 0.85 } as const;

const categoryMeta: Record<LeaveCategory, { icon: React.ElementType; label: string; color: string }> = {
  sick:       { icon: Stethoscope, label: 'Sick leave',     color: '#EF476F' },
  vacation:   { icon: Palmtree,    label: 'Vacation',        color: '#10C98A' },
  personal:   { icon: User,        label: 'Personal',        color: '#5B4FDB' },
  emergency:  { icon: AlertTriangle,label:'Emergency',       color: '#F59E0B' },
  other:      { icon: HelpCircle,  label: 'Other',           color: '#9BA6D3' },
};

function today() {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const cfg = {
    pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)',  label: 'Pending' },
    approved: { color: '#10C98A', bg: 'rgba(16,201,138,0.10)',  border: 'rgba(16,201,138,0.25)',  label: 'Approved' },
    rejected: { color: '#EF476F', bg: 'rgba(239,71,111,0.10)',  border: 'rgba(239,71,111,0.25)',  label: 'Rejected' },
  }[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: 10.5, fontWeight: 700, color: cfg.color, letterSpacing: '.08em', textTransform: 'uppercase' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}

export default function LeavePanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'apply' | 'history'>('apply');
  const [leaveType, setLeaveType] = useState<LeaveType>('instant');
  const [category, setCategory] = useState<LeaveCategory>('sick');
  const [duration, setDuration] = useState<'half' | 'full'>('full');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate]     = useState('');
  const [reason, setReason]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [leaves, setLeaves]       = useState<Leave[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  function getToken() {
    try { return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? null; }
    catch { return null; }
  }

  async function fetchLeaves() {
    const token = getToken();
    if (!token) return;
    setLoadingLeaves(true);
    try {
      const res = await fetch(`${API_BASE}/api/leaves`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setLeaves(data.leaves);
    } catch { /* offline */ }
    finally { setLoadingLeaves(false); }
  }

  useEffect(() => { fetchLeaves(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { toast.error('Please provide a reason.'); return; }
    if (leaveType === 'planned' && !endDate) { toast.error('Please select an end date.'); return; }
    if (leaveType === 'planned' && endDate < startDate) { toast.error('End date must be on or after start date.'); return; }

    setSubmitting(true);
    const token = getToken();
    try {
      const body: Record<string, string> = { type: leaveType, leaveCategory: category, startDate, reason };
      if (leaveType === 'instant') body.duration = duration;
      else body.endDate = endDate;

      const res = await fetch(`${API_BASE}/api/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(leaveType === 'instant'
        ? 'Emergency leave submitted! Admin has been notified.'
        : 'Planned leave request sent! Admin will review it shortly.');
      setReason('');
      setEndDate('');
      setStartDate(today());
      setLeaveType('instant');
      setCategory('sick');
      setDuration('full');
      setTab('history');
      fetchLeaves();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to submit leave. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const pendingLeaves  = leaves.filter(l => l.status === 'pending');
  const resolvedLeaves = leaves.filter(l => l.status !== 'pending');

  return (
    <motion.div
      key="leave-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,15,30,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={SPRING}
        style={{ width: '100%', maxWidth: 520, height: '100%', background: '#FFFFFF', display: 'flex', flexDirection: 'column', boxShadow: '-24px 0 72px rgba(26,27,58,0.18)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(26,27,58,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#5B4FDB,#8B3FDB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarRange size={18} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1A1B3A', letterSpacing: '-0.02em' }}>Leave Management</h2>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(90,95,128,0.60)' }}>Apply for leave · Track requests</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(26,27,58,0.10)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(90,95,128,0.55)', transition: 'all .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,27,58,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#1A1B3A'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(90,95,128,0.55)'; }}
            ><X size={15} /></button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
            {(['apply', 'history'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: 'transparent', border: 'none', cursor: 'pointer', color: tab === t ? '#5B4FDB' : 'rgba(90,95,128,0.50)', borderBottom: tab === t ? '2px solid #5B4FDB' : '2px solid transparent', transition: 'all .2s' }}>
                {t === 'apply' ? 'Apply for Leave' : `My Requests ${leaves.length > 0 ? `(${leaves.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ── Apply tab ── */}
          {tab === 'apply' && (
            <form onSubmit={handleSubmit}>

              {/* Leave type selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
                {([
                  { val: 'instant', icon: Zap,           label: 'Emergency / Instant', sub: 'Need to leave now or today', color: '#EF476F' },
                  { val: 'planned', icon: CalendarRange,  label: 'Planned Leave',       sub: 'Schedule future time off', color: '#5B4FDB' },
                ] as const).map(({ val, icon: Icon, label, sub, color }) => (
                  <button key={val} type="button" onClick={() => { setLeaveType(val); if (val === 'instant') setStartDate(today()); }}
                    style={{ padding: '14px 12px', borderRadius: 14, border: `2px solid ${leaveType === val ? color : 'rgba(26,27,58,0.10)'}`, background: leaveType === val ? `${color}0D` : '#FAFAFA', cursor: 'pointer', textAlign: 'left', transition: 'all .2s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: leaveType === val ? `${color}20` : 'rgba(26,27,58,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <Icon size={16} color={leaveType === val ? color : 'rgba(90,95,128,0.45)'} />
                    </div>
                    <p style={{ margin: '0 0 3px', fontSize: 12.5, fontWeight: 700, color: leaveType === val ? color : '#1A1B3A' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(90,95,128,0.55)', lineHeight: 1.4 }}>{sub}</p>
                  </button>
                ))}
              </div>

              {/* Category */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(90,95,128,0.55)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>Leave category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(Object.keys(categoryMeta) as LeaveCategory[]).map(cat => {
                    const { icon: Icon, label, color } = categoryMeta[cat];
                    const active = category === cat;
                    return (
                      <button key={cat} type="button" onClick={() => setCategory(cat)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${active ? color : 'rgba(26,27,58,0.10)'}`, background: active ? `${color}10` : 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: active ? color : 'rgba(90,95,128,0.70)', transition: 'all .15s' }}>
                        <Icon size={13} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              {leaveType === 'instant' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(90,95,128,0.55)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', fontSize: 13, color: '#1A1B3A', background: '#FAFAFA', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(90,95,128,0.55)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>Duration</label>
                    <div style={{ display: 'flex', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', overflow: 'hidden' }}>
                      {(['full', 'half'] as const).map(d => (
                        <button key={d} type="button" onClick={() => setDuration(d)}
                          style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: duration === d ? '#5B4FDB' : '#FAFAFA', color: duration === d ? '#fff' : 'rgba(90,95,128,0.65)', transition: 'all .15s' }}>
                          {d === 'full' ? 'Full day' : 'Half day'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(90,95,128,0.55)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>From</label>
                    <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (endDate && endDate < e.target.value) setEndDate(e.target.value); }}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', fontSize: 13, color: '#1A1B3A', background: '#FAFAFA', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(90,95,128,0.55)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>To</label>
                    <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', fontSize: 13, color: '#1A1B3A', background: '#FAFAFA', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(90,95,128,0.55)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>Reason <span style={{ color: '#EF476F' }}>*</span></label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  placeholder={leaveType === 'instant' ? 'Briefly describe why you need to be absent today…' : 'Describe your reason for taking leave…'}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid rgba(26,27,58,0.12)', fontSize: 13, color: '#1A1B3A', background: '#FAFAFA', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#5B4FDB'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(26,27,58,0.12)'; e.currentTarget.style.background = '#FAFAFA'; }}
                />
              </div>

              {/* Preview summary */}
              {reason.trim() && (
                <div style={{ background: 'rgba(91,79,219,0.05)', border: '1.5px solid rgba(91,79,219,0.14)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#5B4FDB', letterSpacing: '.16em', textTransform: 'uppercase' }}>Request summary</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12.5, color: '#1A1B3A' }}>
                    <span><strong>Type:</strong> {leaveType === 'instant' ? 'Emergency' : 'Planned'}</span>
                    <span><strong>Category:</strong> {categoryMeta[category].label}</span>
                    <span><strong>Date{leaveType === 'planned' ? 's' : ''}:</strong> {leaveType === 'instant' ? `${fmtDate(startDate)} · ${duration === 'full' ? 'Full day' : 'Half day'}` : `${fmtDate(startDate)}${endDate ? ` → ${fmtDate(endDate)}` : ''}`}</span>
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: leaveType === 'instant' ? 'linear-gradient(135deg,#EF476F,#c03057)' : 'linear-gradient(135deg,#5B4FDB,#8B3FDB)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '.04em', transition: 'all .2s', boxShadow: '0 4px 16px rgba(91,79,219,0.22)' }}>
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : <><Send size={14} /> {leaveType === 'instant' ? 'Submit Emergency Leave' : 'Submit Leave Request'}</>}
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(90,95,128,0.45)', marginTop: 12, lineHeight: 1.5 }}>
                Admin will be notified immediately and will approve or reject via the admin panel.
              </p>
            </form>
          )}

          {/* ── History tab ── */}
          {tab === 'history' && (
            <div>
              {loadingLeaves ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10, color: 'rgba(90,95,128,0.55)' }}>
                  <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: 13 }}>Loading…</span>
                </div>
              ) : leaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <CalendarRange size={36} style={{ margin: '0 auto 12px', color: 'rgba(91,79,219,0.25)' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(90,95,128,0.55)', margin: '0 0 6px' }}>No leave requests yet</p>
                  <p style={{ fontSize: 12, color: 'rgba(90,95,128,0.40)' }}>Your submitted requests will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendingLeaves.length > 0 && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(90,95,128,0.45)', letterSpacing: '.18em', textTransform: 'uppercase', margin: '0 0 4px' }}>Pending review</p>
                  )}
                  {pendingLeaves.map(l => <LeaveCard key={l.id} leave={l} />)}

                  {resolvedLeaves.length > 0 && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(90,95,128,0.45)', letterSpacing: '.18em', textTransform: 'uppercase', margin: `${pendingLeaves.length > 0 ? '8px' : '0'} 0 4px` }}>Past requests</p>
                  )}
                  {resolvedLeaves.map(l => <LeaveCard key={l.id} leave={l} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function LeaveCard({ leave }: { leave: Leave }) {
  const { icon: CatIcon, label: catLabel, color: catColor } = categoryMeta[leave.leaveCategory] ?? categoryMeta.other;
  const typeLabel = leave.type === 'instant' ? 'Emergency' : 'Planned';
  const dateRange = leave.type === 'instant'
    ? `${fmtDate(leave.startDate)} · ${leave.duration === 'half' ? 'Half day' : 'Full day'}`
    : `${fmtDate(leave.startDate)}${leave.endDate ? ` → ${fmtDate(leave.endDate)}` : ''}`;

  return (
    <div style={{ borderRadius: 14, border: '1.5px solid rgba(26,27,58,0.09)', background: '#FAFAFA', padding: '14px 16px', transition: 'box-shadow .2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(91,79,219,0.10)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${catColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CatIcon size={14} color={catColor} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1A1B3A' }}>{catLabel}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(90,95,128,0.55)' }}>{typeLabel} · {dateRange}</p>
          </div>
        </div>
        <StatusBadge status={leave.status} />
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#4A5578', lineHeight: 1.5, background: 'rgba(26,27,58,0.03)', borderRadius: 8, padding: '6px 10px' }}>{leave.reason}</p>
      {leave.adminNote && (
        <p style={{ margin: 0, fontSize: 11.5, color: leave.status === 'approved' ? '#10C98A' : '#EF476F', fontStyle: 'italic', paddingLeft: 4 }}>
          Admin note: {leave.adminNote}
        </p>
      )}
      <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(90,95,128,0.38)' }}>
        Submitted {new Date(leave.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}
