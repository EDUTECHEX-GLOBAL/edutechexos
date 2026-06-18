'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['S','M','T','W','T','F','S'];

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

export default function LoginTrackerCalendar() {
  const { members } = useDashboardStore();
  const [mounted, setMounted] = useState(false);
  const [userLogins, setUserLogins] = useState<Record<string, string[]>>({});
  const [selectedId, setSelectedId] = useState('');
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const fetchHistory = useCallback(async () => {
    try {
      const raw = localStorage.getItem('edutechex_token');
      const token = raw ? JSON.parse(raw).token : null;
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/login-history`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.history) setUserLogins(data.history);
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (members.length > 0) setSelectedId(members[0].id);
    fetchHistory().then(() => {
      setUserLogins(prev => {
        const merged = { ...prev };
        members.forEach(m => {
          if (!merged[m.email]?.length) {
            const key = `edutechex_logins_${m.email}`;
            let stored: string[] = [];
            try { stored = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /**/ }
            if (!stored.length) {
              const gen: string[] = [];
              for (let i = 0; i < 30; i++) {
                const d = new Date(); d.setDate(d.getDate() - i);
                const wd = d.getDay(); const isWe = wd===0||wd===6;
                let p = m.role==='Manager' ? 0.95 : m.role==='Designer' ? 0.75 : 0.85;
                if (isWe) p = 0.1;
                if (Math.random() < p) gen.push(d.toISOString().split('T')[0]);
              }
              localStorage.setItem(key, JSON.stringify(gen));
              stored = gen;
            }
            merged[m.email] = stored;
          }
        });
        return merged;
      });
    });
  }, [members, fetchHistory]);

  const todayStr = toDateStr(today);
  const sel = members.find(m => m.id === selectedId) || members[0];
  const selLogins = sel ? userLogins[sel.email] || [] : [];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const presentThisMonth = selLogins.filter(e => {
    const d = new Date(e);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length;

  const todayDay = today.getDate();
  let workDays = 0;
  for (let d = 1; d <= Math.min(daysInMonth, todayDay); d++) {
    const dow = new Date(viewYear, viewMonth, d).getDay();
    if (dow !== 0 && dow !== 6) workDays++;
  }
  const leave = Math.max(0, workDays - presentThisMonth);
  const rate = workDays > 0 ? Math.round((presentThisMonth / workDays) * 100) : 0;
  const streak = sel ? calcStreak(selLogins, todayStr) : 0;

  const totalUsers = members.length;
  const todayActive = members.filter(m => (userLogins[m.email] || []).includes(todayStr)).length;

  const roster = useMemo(() => members.map(m => {
    const logins = userLogins[m.email] || [];
    let wd = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (d.getDay() !== 0 && d.getDay() !== 6) wd++;
    }
    return {
      ...m, logins,
      present: logins.length,
      leave: Math.max(0, wd - logins.length),
      rate: wd > 0 ? Math.round((logins.length / wd) * 100) : 0,
      inToday: logins.includes(todayStr),
      streak: calcStreak(logins, todayStr),
    };
  }), [members, userLogins, todayStr]);

  const toggleDate = (email: string, dateStr: string) => {
    const cur = userLogins[email] || [];
    const next = cur.includes(dateStr) ? cur.filter(d => d !== dateStr) : [...cur, dateStr];
    toast.success(cur.includes(dateStr) ? `Removed ${dateStr}` : `Marked present ${dateStr}`);
    localStorage.setItem(`edutechex_logins_${email}`, JSON.stringify(next));
    setUserLogins(p => ({ ...p, [email]: next }));
  };

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  if (!mounted) return <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:13}}>Loading…</div>;

  const rateClr = rate>=80?'#10b981':rate>=60?'#f59e0b':'#ef4444';

  return (
    <div style={{
      borderRadius: 14,
      border: '1px solid #e8edf5',
      background: '#fff',
      boxShadow: '0 2px 12px rgba(15,23,42,0.07)',
      overflow: 'hidden',
      fontFamily: 'inherit',
    }}>

      {/* ═══ COMPACT TOP BAR ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p style={{margin:0, fontSize:10, fontWeight:700, color:'rgba(199,210,254,0.8)', letterSpacing:'0.1em', textTransform:'uppercase'}}>Attendance</p>
            <p style={{margin:0, fontSize:14, fontWeight:800, color:'#fff', lineHeight:1.2}}>Team Calendar</p>
          </div>
        </div>

        {/* Live pills */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {[
            { label: `${totalUsers} members`, color:'rgba(165,180,252,0.9)', bg:'rgba(255,255,255,0.1)' },
            { label: `${todayActive} today`, color:'#6ee7b7', bg:'rgba(16,185,129,0.18)' },
            { label: `${Math.round((todayActive/Math.max(totalUsers,1))*100)}% rate`, color:'#fde68a', bg:'rgba(245,158,11,0.18)' },
          ].map(p => (
            <span key={p.label} style={{
              fontSize:10.5, fontWeight:700, color:p.color, background:p.bg,
              padding:'3px 9px', borderRadius:99,
              border:'1px solid rgba(255,255,255,0.12)',
            }}>{p.label}</span>
          ))}
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', minHeight:400 }}>

        {/* LEFT — roster */}
        <div style={{
          borderRight:'1px solid #f1f5f9',
          background:'#fafbfd',
          display:'flex', flexDirection:'column',
          overflowY:'auto', maxHeight:500,
        }}>
          <div style={{
            padding:'10px 12px 6px', fontSize:10, fontWeight:800,
            color:'#94a3b8', letterSpacing:'0.1em', textTransform:'uppercase',
            borderBottom:'1px solid #f1f5f9', flexShrink:0,
          }}>
            Members · {totalUsers}
          </div>

          <div style={{ padding:'6px 8px', display:'flex', flexDirection:'column', gap:2 }}>
            {roster.map(m => {
              const isSel = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  style={{
                    width:'100%', textAlign:'left',
                    padding:'8px 9px', borderRadius:9,
                    border: isSel ? '1px solid #c7d2fe' : '1px solid transparent',
                    background: isSel ? '#eef2ff' : 'transparent',
                    cursor:'pointer', transition:'all 0.1s',
                  }}
                  onMouseEnter={e => { if(!isSel)(e.currentTarget as HTMLButtonElement).style.background='#f1f5f9'; }}
                  onMouseLeave={e => { if(!isSel)(e.currentTarget as HTMLButtonElement).style.background='transparent'; }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {/* Avatar */}
                    <span style={{
                      width:28, height:28, borderRadius:7, flexShrink:0,
                      background: isSel ? m.color : `${m.color}25`,
                      color: isSel ? '#fff' : m.color,
                      fontSize:10, fontWeight:800,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>{m.initials}</span>

                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <p style={{margin:0, fontSize:11.5, fontWeight:700, color: isSel?'#3730a3':'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:80}}>{m.name.split(' ')[0]}</p>
                        {/* in/out dot */}
                        <span style={{
                          fontSize:9, fontWeight:700,
                          color: m.inToday ? '#10b981':'#94a3b8',
                          display:'flex', alignItems:'center', gap:3,
                        }}>
                          <span style={{ width:5,height:5,borderRadius:'50%', background: m.inToday?'#10b981':'#cbd5e1', flexShrink:0 }} />
                          {m.inToday ? 'in':'out'}
                        </span>
                      </div>
                      {/* P / L / rate */}
                      <div style={{ display:'flex', gap:4, marginTop:3 }}>
                        <span style={{ fontSize:9, fontWeight:700, color:'#10b981', background:'#f0fdf4', padding:'1px 5px', borderRadius:4 }}>{m.present}P</span>
                        <span style={{ fontSize:9, fontWeight:700, color: m.leave>0?'#ef4444':'#94a3b8', background: m.leave>0?'#fef2f2':'#f8fafc', padding:'1px 5px', borderRadius:4 }}>{m.leave}L</span>
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

          {/* Member header + nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <span style={{
                width:34, height:34, borderRadius:8, flexShrink:0,
                background: sel ? `${sel.color}20` : '#f1f5f9',
                color: sel?.color ?? '#64748b',
                fontSize:11, fontWeight:800,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>{sel?.initials ?? '?'}</span>
              <div>
                <p style={{margin:0, fontSize:13, fontWeight:800, color:'#0f172a'}}>{sel?.name ?? '—'}</p>
                <p style={{margin:0, fontSize:10, color:'#94a3b8', fontWeight:600}}>{sel?.role}</p>
              </div>
            </div>

            {/* Month nav */}
            <div style={{
              display:'flex', alignItems:'center',
              background:'#f8fafc', borderRadius:9,
              border:'1px solid #e2e8f0', overflow:'hidden',
            }}>
              <button onClick={prevMonth} style={{padding:'5px 8px',border:'none',background:'transparent',cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center'}}><ChevronLeft size={13} strokeWidth={2.5}/></button>
              <span style={{padding:'0 8px',fontSize:11.5,fontWeight:800,color:'#1e293b',minWidth:108,textAlign:'center'}}>{MONTHS_FULL[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} style={{padding:'5px 8px',border:'none',background:'transparent',cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center'}}><ChevronRight size={13} strokeWidth={2.5}/></button>
            </div>
          </div>

          {/* 4 compact metric pills */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
            {[
              { label:'Present', val: presentThisMonth, color:'#059669', bg:'#ecfdf5', border:'#a7f3d0' },
              { label:'Leave',   val: leave,            color: leave>0?'#dc2626':'#94a3b8', bg: leave>0?'#fef2f2':'#f8fafc', border: leave>0?'#fecaca':'#e2e8f0' },
              { label:'Rate',    val: `${rate}%`,       color: rateClr, bg:'#f8fafc', border:'#e2e8f0' },
              { label:'Streak',  val: `${streak}🔥`,   color:'#ea580c', bg:'#fff7ed', border:'#fed7aa' },
            ].map(m => (
              <div key={m.label} style={{
                padding:'8px 10px', borderRadius:9,
                background:m.bg, border:`1px solid ${m.border}`,
                textAlign:'center',
              }}>
                <p style={{margin:0, fontSize:16, fontWeight:800, color:m.color, lineHeight:1}}>{m.val}</p>
                <p style={{margin:'3px 0 0', fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em'}}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ borderRadius:10, border:'1px solid #e8edf5', overflow:'hidden' }}>
            {/* Day-of-week row */}
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(7,1fr)',
              background:'#f8fafc', borderBottom:'1px solid #e8edf5',
              padding:'6px 4px',
            }}>
              {DAYS.map((d,i) => (
                <div key={i} style={{
                  textAlign:'center', fontSize:9.5, fontWeight:800,
                  color: i===0||i===6 ? '#cbd5e1':'#94a3b8',
                  textTransform:'uppercase', letterSpacing:'0.06em',
                }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, padding:5 }}>
              {Array.from({ length: totalCells }).map((_,idx) => {
                const dn = idx - firstDay + 1;
                if (dn < 1 || dn > daysInMonth) return <div key={idx} style={{aspectRatio:'1'}}/>;

                const ds = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(dn).padStart(2,'0')}`;
                const logged = selLogins.includes(ds);
                const isToday = ds === todayStr;
                const future = ds > todayStr;
                const dow = new Date(viewYear, viewMonth, dn).getDay();
                const weekend = dow===0||dow===6;

                let bg = '#fff', border = '1px solid #f1f5f9', clr = '#64748b';
                if (logged) { bg='#eef2ff'; border='1px solid #a5b4fc'; clr='#4338ca'; }
                else if (future||weekend) { bg='transparent'; border='1px solid transparent'; clr='#e2e8f0'; }
                else { bg='#fff'; border='1px solid #f1f5f9'; clr='#94a3b8'; }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sel && !future && toggleDate(sel.email, ds)}
                    title={logged ? 'Present — click to remove' : future ? '' : 'Absent — click to mark'}
                    style={{
                      aspectRatio:'1', borderRadius:7,
                      border: isToday ? '2px solid #f59e0b' : border,
                      background: bg, cursor: future?'default':'pointer',
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                      gap:2, transition:'background 0.08s', padding:0,
                    }}
                    onMouseEnter={e => { if(!future&&!weekend&&!logged)(e.currentTarget as HTMLButtonElement).style.background='#f8fafc'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background=bg; }}
                  >
                    <span style={{fontSize:10.5, fontWeight:700, color: isToday?'#92400e':clr, lineHeight:1}}>{dn}</span>
                    {!future && !weekend && (
                      <span style={{
                        width:4, height:4, borderRadius:'50%',
                        background: logged ? '#6366f1' : '#e2e8f0',
                      }}/>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{width:11,height:11,borderRadius:3,background:'#eef2ff',border:'1px solid #a5b4fc',display:'inline-block'}}/>
              <span style={{fontSize:10,color:'#64748b',fontWeight:600}}>Present</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{width:11,height:11,borderRadius:3,background:'#fff',border:'1px solid #e2e8f0',display:'inline-block'}}/>
              <span style={{fontSize:10,color:'#64748b',fontWeight:600}}>Absent</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{width:11,height:11,borderRadius:3,background:'transparent',display:'inline-block'}}/>
              <span style={{fontSize:10,color:'#cbd5e1',fontWeight:600}}>Weekend</span>
            </div>
            <span style={{marginLeft:'auto',fontSize:10,color:'#94a3b8',fontWeight:500}}>Click to toggle · {workDays} working days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
