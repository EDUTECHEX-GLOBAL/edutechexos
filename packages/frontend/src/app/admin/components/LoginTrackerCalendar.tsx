'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['S','M','T','W','T','F','S'];

type AttendanceStatus = 'full' | 'half' | 'absent' | null;

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }

function calcStreak(dates: string[], todayStr: string): number {
  let s = 0;
  const sorted = [...dates].sort().reverse();
  const cur = new Date(todayStr);
  for (let i = 0; i < 365; i++) {
    const ds = cur.toISOString().split('T')[0];
    if (sorted.includes(ds)) { s++; cur.setDate(cur.getDate() - 1); }
    else if (i === 0) { cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return s;
}

const ATTENDANCE_STYLE: Record<string, { bg: string; border: string; clr: string; dot: string; label: string }> = {
  full:   { bg: '#ecfdf5', border: '#6ee7b7', clr: '#065f46', dot: '#10b981', label: 'Full' },
  half:   { bg: '#fffbeb', border: '#fcd34d', clr: '#92400e', dot: '#f59e0b', label: 'Half' },
  absent: { bg: '#fff1f2', border: '#fca5a5', clr: '#991b1b', dot: '#ef4444', label: 'Absent' },
};

export default function LoginTrackerCalendar() {
  const { members } = useDashboardStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLogins, setUserLogins] = useState<Record<string, string[]>>({});
  const [userAttendance, setUserAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({});
  const [selectedId, setSelectedId] = useState('');
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const fetchHistory = useCallback(async () => {
    try {
      const raw = localStorage.getItem('edutechex_token');
      const token = raw ? JSON.parse(raw).token : null;
      if (!token) return;
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/activity/login-history`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (data.history) setUserLogins(data.history);
        if (data.attendance) setUserAttendance(data.attendance);
      }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (members.length > 0) setSelectedId(members[0].id);
    fetchHistory();
  }, [members, fetchHistory]);

  const todayStr = toDateStr(today);
  const sel = members.find(m => m.id === selectedId) || members[0];
  const selLogins = sel ? userLogins[sel.email] || [] : [];
  const selAttendance: Record<string, AttendanceStatus> = sel ? userAttendance[sel.email] || {} : {};

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const presentThisMonth = selLogins.filter(e => {
    const d = new Date(e + 'T00:00:00');
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length;

  const absentThisMonth = Object.entries(selAttendance).filter(([ds, v]) => {
    const d = new Date(ds + 'T00:00:00');
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth && v === 'absent';
  }).length;

  const fullDaysThisMonth = Object.entries(selAttendance).filter(([ds, v]) => {
    const d = new Date(ds + 'T00:00:00');
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth && v === 'full';
  }).length;

  const halfDaysThisMonth = Object.entries(selAttendance).filter(([ds, v]) => {
    const d = new Date(ds + 'T00:00:00');
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth && v === 'half';
  }).length;

  const todayDay = today.getDate();
  let workDays = 0;
  const isCurrentMonthYear = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const upToDay = isCurrentMonthYear ? todayDay : daysInMonth;
  for (let d = 1; d <= upToDay; d++) {
    const dow = new Date(viewYear, viewMonth, d).getDay();
    if (dow !== 0 && dow !== 6) workDays++;
  }

  const rate = workDays > 0 ? Math.round((presentThisMonth / workDays) * 100) : 0;
  const streak = sel ? calcStreak(selLogins, todayStr) : 0;
  const rateClr = rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444';

  const totalUsers = members.length;
  const todayActive = members.filter(m => (userLogins[m.email] || []).includes(todayStr)).length;

  const roster = useMemo(() => members.map(m => {
    const logins = userLogins[m.email] || [];
    let wd = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (d.getDay() !== 0 && d.getDay() !== 6) wd++;
    }
    const att = userAttendance[m.email] || {};
    const absentDays = Object.values(att).filter(v => v === 'absent').length;
    return {
      ...m, logins,
      present: logins.length,
      absent: absentDays,
      rate: wd > 0 ? Math.round((logins.length / wd) * 100) : 0,
      inToday: logins.includes(todayStr),
      todayStatus: att[todayStr] ?? null as AttendanceStatus,
      streak: calcStreak(logins, todayStr),
    };
  }), [members, userLogins, userAttendance, todayStr]);

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  if (!mounted) return <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:13}}>Loading…</div>;

  return (
    <div style={{ borderRadius: 14, border: '1px solid #e8edf5', background: '#fff', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', overflow: 'hidden', fontFamily: 'inherit' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p style={{margin:0, fontSize:10, fontWeight:700, color:'rgba(199,210,254,0.8)', letterSpacing:'0.1em', textTransform:'uppercase'}}>Attendance</p>
            <p style={{margin:0, fontSize:14, fontWeight:800, color:'#fff', lineHeight:1.2}}>Team Calendar</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
            {[
              { label: `${totalUsers} members`, color:'rgba(165,180,252,0.9)', bg:'rgba(255,255,255,0.1)' },
              { label: `${todayActive} today`, color:'#6ee7b7', bg:'rgba(16,185,129,0.18)' },
            ].map(p => (
              <span key={p.label} style={{ fontSize:10.5, fontWeight:700, color:p.color, background:p.bg, padding:'3px 9px', borderRadius:99, border:'1px solid rgba(255,255,255,0.12)' }}>{p.label}</span>
            ))}
          </div>
          <button type="button" onClick={fetchHistory} title="Refresh" style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.20)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
            <RefreshCw size={12} color="rgba(255,255,255,0.85)" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', minHeight:400 }}>

        {/* LEFT — roster */}
        <div style={{ borderRight:'1px solid #f1f5f9', background:'#fafbfd', display:'flex', flexDirection:'column', overflowY:'auto', maxHeight:520 }}>
          <div style={{ padding:'10px 12px 6px', fontSize:10, fontWeight:800, color:'#94a3b8', letterSpacing:'0.1em', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
            Members · {totalUsers}
          </div>
          <div style={{ padding:'6px 8px', display:'flex', flexDirection:'column', gap:2 }}>
            {roster.map(m => {
              const isSel = m.id === selectedId;
              const todayAtt = m.todayStatus;
              const attStyle = todayAtt ? ATTENDANCE_STYLE[todayAtt] : null;
              return (
                <button key={m.id} type="button" onClick={() => setSelectedId(m.id)}
                  style={{ width:'100%', textAlign:'left', padding:'8px 9px', borderRadius:9, border: isSel ? '1px solid #c7d2fe' : '1px solid transparent', background: isSel ? '#eef2ff' : 'transparent', cursor:'pointer', transition:'all 0.1s' }}
                  onMouseEnter={e => { if(!isSel)(e.currentTarget as HTMLButtonElement).style.background='#f1f5f9'; }}
                  onMouseLeave={e => { if(!isSel)(e.currentTarget as HTMLButtonElement).style.background='transparent'; }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:28, height:28, borderRadius:7, flexShrink:0, background: isSel ? m.color : `${m.color}25`, color: isSel ? '#fff' : m.color, fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{m.initials}</span>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <p style={{margin:0, fontSize:11.5, fontWeight:700, color: isSel?'#3730a3':'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:80}}>{m.name.split(' ')[0]}</p>
                        {attStyle ? (
                          <span style={{ fontSize:8, fontWeight:800, color: attStyle.clr, background: attStyle.bg, border: `1px solid ${attStyle.border}`, padding:'1px 5px', borderRadius:4 }}>{attStyle.label}</span>
                        ) : (
                          <span style={{ fontSize:9, fontWeight:700, color: m.inToday ? '#10b981':'#94a3b8', display:'flex', alignItems:'center', gap:3 }}>
                            <span style={{ width:5,height:5,borderRadius:'50%', background: m.inToday?'#10b981':'#cbd5e1', flexShrink:0 }} />
                            {m.inToday ? 'in':'out'}
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:4, marginTop:3 }}>
                        <span style={{ fontSize:9, fontWeight:700, color:'#10b981', background:'#f0fdf4', padding:'1px 5px', borderRadius:4 }}>{m.present}P</span>
                        {m.absent > 0 && <span style={{ fontSize:9, fontWeight:700, color:'#ef4444', background:'#fef2f2', padding:'1px 5px', borderRadius:4 }}>{m.absent}A</span>}
                        <span style={{ fontSize:9, fontWeight:600, color: m.rate>=80?'#059669':m.rate>=60?'#d97706':'#ef4444', marginLeft:'auto' }}>{m.rate}%</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — calendar */}
        <div style={{ padding:'14px 16px', background:'#fff', display:'flex', flexDirection:'column', gap:12 }}>

          {/* Member header + month nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <span style={{ width:34, height:34, borderRadius:8, flexShrink:0, background: sel ? `${sel.color}20` : '#f1f5f9', color: sel?.color ?? '#64748b', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{sel?.initials ?? '?'}</span>
              <div>
                <p style={{margin:0, fontSize:13, fontWeight:800, color:'#0f172a'}}>{sel?.name ?? '—'}</p>
                <p style={{margin:0, fontSize:10, color:'#94a3b8', fontWeight:600}}>{sel?.role}</p>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', background:'#f8fafc', borderRadius:9, border:'1px solid #e2e8f0', overflow:'hidden' }}>
              <button onClick={prevMonth} style={{padding:'5px 8px',border:'none',background:'transparent',cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center'}}><ChevronLeft size={13} strokeWidth={2.5}/></button>
              <span style={{padding:'0 8px',fontSize:11.5,fontWeight:800,color:'#1e293b',minWidth:108,textAlign:'center'}}>{MONTHS_FULL[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} style={{padding:'5px 8px',border:'none',background:'transparent',cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center'}}><ChevronRight size={13} strokeWidth={2.5}/></button>
            </div>
          </div>

          {/* Metric pills */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
            {[
              { label:'Present',   val: presentThisMonth,   color:'#059669', bg:'#ecfdf5', border:'#a7f3d0' },
              { label:'Full Days', val: fullDaysThisMonth,  color:'#059669', bg:'#f0fdf4', border:'#bbf7d0' },
              { label:'Half Days', val: halfDaysThisMonth,  color:'#b45309', bg:'#fffbeb', border:'#fde68a' },
              { label:'Absent',    val: absentThisMonth,    color: absentThisMonth>0?'#dc2626':'#94a3b8', bg: absentThisMonth>0?'#fef2f2':'#f8fafc', border: absentThisMonth>0?'#fecaca':'#e2e8f0' },
              { label:'Streak',    val: `${streak}🔥`,      color:'#ea580c', bg:'#fff7ed', border:'#fed7aa' },
            ].map(m => (
              <div key={m.label} style={{ padding:'8px 10px', borderRadius:9, background:m.bg, border:`1px solid ${m.border}`, textAlign:'center' }}>
                <p style={{margin:0, fontSize:16, fontWeight:800, color:m.color, lineHeight:1}}>{m.val}</p>
                <p style={{margin:'3px 0 0', fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em'}}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ borderRadius:10, border:'1px solid #e8edf5', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'#f8fafc', borderBottom:'1px solid #e8edf5', padding:'6px 4px' }}>
              {DAYS.map((d,i) => (
                <div key={i} style={{ textAlign:'center', fontSize:9.5, fontWeight:800, color: i===0||i===6 ? '#cbd5e1':'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, padding:5 }}>
              {Array.from({ length: totalCells }).map((_,idx) => {
                const dn = idx - firstDay + 1;
                if (dn < 1 || dn > daysInMonth) return <div key={idx} style={{aspectRatio:'1'}}/>;

                const ds = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(dn).padStart(2,'0')}`;
                const logged = selLogins.includes(ds);
                const att = selAttendance[ds] ?? null;
                const isToday = ds === todayStr;
                const future = ds > todayStr;
                const dow = new Date(viewYear, viewMonth, dn).getDay();
                const weekend = dow===0||dow===6;

                let bg = '#fff', border = '1px solid #f1f5f9', clr = '#64748b', dotClr = '#e2e8f0';
                let attLabel = '';
                if (att && ATTENDANCE_STYLE[att]) {
                  const s = ATTENDANCE_STYLE[att];
                  bg = s.bg; border = `1px solid ${s.border}`; clr = s.clr; dotClr = s.dot; attLabel = s.label;
                } else if (logged) {
                  bg='#eef2ff'; border='1px solid #a5b4fc'; clr='#4338ca'; dotClr='#6366f1';
                } else if (future || weekend) {
                  bg='transparent'; border='1px solid transparent'; clr='#e2e8f0'; dotClr='transparent';
                }

                const titleText = att ? `${att === 'full' ? 'Full Day' : att === 'half' ? 'Half Day' : 'Absent'} — ${ds}` : logged ? `Logged in — ${ds}` : future ? '' : `Absent — ${ds}`;

                return (
                  <div
                    key={idx}
                    title={titleText}
                    style={{
                      aspectRatio:'1', borderRadius:7,
                      border: isToday ? '2px solid #f59e0b' : border,
                      background: bg,
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                      gap:1, padding:2,
                    }}
                  >
                    <span style={{fontSize:10.5, fontWeight:700, color: isToday?'#92400e':clr, lineHeight:1}}>{dn}</span>
                    {!future && !weekend && attLabel ? (
                      <span style={{ fontSize:6.5, fontWeight:800, color: clr, lineHeight:1, letterSpacing:'0.02em' }}>{attLabel}</span>
                    ) : !future && !weekend ? (
                      <span style={{ width:4, height:4, borderRadius:'50%', background: dotClr }}/>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {[
              { bg:'#ecfdf5', border:'#a7f3d0', label:'Full Day' },
              { bg:'#fffbeb', border:'#fcd34d', label:'Half Day' },
              { bg:'#fff1f2', border:'#fca5a5', label:'Absent' },
              { bg:'#eef2ff', border:'#a5b4fc', label:'Logged in' },
            ].map(l => (
              <div key={l.label} style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{width:11,height:11,borderRadius:3,background:l.bg,border:`1px solid ${l.border}`,display:'inline-block'}}/>
                <span style={{fontSize:10,color:'#64748b',fontWeight:600}}>{l.label}</span>
              </div>
            ))}
            <span style={{marginLeft:'auto',fontSize:10,color:'#94a3b8',fontWeight:500}}>{workDays} working days · {rate}% rate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
