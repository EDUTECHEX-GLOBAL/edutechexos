'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   MIDNIGHT AURORA HERO
   Deep slate + flowing aurora blobs + central product mockup showcase
───────────────────────────────────────────────────────────────────────────── */

/* ── Mini dashboard sub-components ────────────────────────────────────────── */

function TypingDots() {
  return (
    <span className="aurora-typing">
      <span className="aurora-dot" />
      <span className="aurora-dot" />
      <span className="aurora-dot" />
    </span>
  );
}

function SidebarChannel({
  name, badge, active,
}: { name: string; badge?: number; active?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '6px 14px',
      background: active ? 'rgba(0,212,255,0.09)' : 'transparent',
      borderLeft: active ? '2px solid #00d4ff' : '2px solid transparent',
      cursor: 'pointer',
    }}>
      <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.38)', fontWeight: active ? 700 : 500 }}>
        # {name}
      </span>
      {badge && (
        <span style={{
          marginLeft: 'auto', padding: '1px 5px', borderRadius: 999,
          background: 'rgba(0,212,255,0.18)', color: '#00d4ff',
          fontSize: 8.5, fontWeight: 800,
        }}>{badge}</span>
      )}
    </div>
  );
}

function SidebarTool({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
      cursor: 'pointer',
    }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

type ChatMsg = {
  init: string;
  color: string;
  sender: string;
  time: string;
  text: string;
  media?: boolean;
  reactions?: string[];
};

function ChatMessage({ msg }: { msg: ChatMsg }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: msg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8.5, fontWeight: 900, color: '#fff',
      }}>{msg.init}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{msg.sender}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>{msg.time}</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.58)', lineHeight: 1.55, margin: 0 }}>{msg.text}</p>
        {msg.media && (
          <div style={{
            marginTop: 7, width: 160, height: 88, borderRadius: 8,
            background: 'linear-gradient(135deg,rgba(0,212,255,0.12),rgba(124,58,237,0.12))',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🖼️</div>
        )}
        {msg.reactions && (
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            {msg.reactions.map((r, i) => (
              <span key={i} style={{
                padding: '2px 7px', borderRadius: 999,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 10, color: 'rgba(255,255,255,0.55)',
              }}>{r}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Animated counter ──────────────────────────────────────────────────────── */
function CountUp({ target, suffix = '' }: { target: number | string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof target === 'string') return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(target / 40);
      const id = setInterval(() => {
        start = Math.min(start + step, target);
        setVal(start);
        if (start >= target) clearInterval(id);
      }, 30);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  if (typeof target === 'string') return <span ref={ref as React.Ref<HTMLDivElement>}>{target}</span>;
  return <span ref={ref as React.Ref<HTMLDivElement>}>{val}{suffix}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
export default function LandingHero() {
  const [mounted, setMounted] = useState(false);
  const [typingVisible, setTypingVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTypingVisible(v => !v), 2400);
    return () => clearInterval(id);
  }, []);

  const messages: ChatMsg[] = [
    {
      init: 'AC', color: '#2563eb', sender: 'Aditya Cherikuri', time: '09:14 AM',
      text: 'Good morning team! 🙌 Sprint review is at 3 pm today — please update Kanban before then.',
      reactions: ['👋 4', '✅ 3'],
    },
    {
      init: 'RK', color: '#7c3aed', sender: 'Ram K Aluru', time: '09:17 AM',
      text: 'On it! Also pushed the new upload API changes — ready for review.',
      media: true,
    },
    {
      init: 'SA', color: '#0891b2', sender: 'Sneha Agarwal', time: '09:21 AM',
      text: 'Shared the updated Figma mockups for the Skillnaav onboarding flow ✨',
    },
  ];

  const kanban = [
    { color: '#3b82f6', label: 'API integration review' },
    { color: '#f59e0b', label: 'Figma design handoff' },
    { color: '#22c55e', label: 'Sprint retrospective' },
    { color: '#3b82f6', label: 'Skillnaav onboarding' },
  ];

  const chartHeights = [30, 55, 40, 75, 60, 85, 100];

  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#060b18', minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════════════════
          CSS — all keyframes + utility classes
      ══════════════════════════════════════════════════════ */}
      <style>{`
        /* ── Aurora blobs ─────────────────────────────── */
        @keyframes blob1 {
          0%,100% { transform:translate(0,0) scale(1); }
          33%      { transform:translate(60px,40px) scale(1.12); }
          66%      { transform:translate(-30px,70px) scale(0.94); }
        }
        @keyframes blob2 {
          0%,100% { transform:translate(0,0) scale(1); }
          33%      { transform:translate(-80px,50px) scale(1.16); }
          66%      { transform:translate(45px,-30px) scale(0.90); }
        }
        @keyframes blob3 {
          0%,100% { transform:translateX(-50%) scale(1); }
          50%      { transform:translateX(-50%) translateY(-56px) scale(1.18); }
        }
        @keyframes blob4 {
          0%,100% { transform:translate(0,0) scale(1); }
          50%      { transform:translate(-55px,-72px) scale(1.12); }
        }
        @keyframes blob5 {
          0%,100% { transform:translate(0,0) scale(1); }
          50%      { transform:translate(72px,-40px) scale(1.20); }
        }

        /* ── Scan line across mockup ──────────────────── */
        @keyframes scan {
          0%   { top:0%; opacity:0; }
          5%   { opacity:1; }
          95%  { opacity:1; }
          100% { top:100%; opacity:0; }
        }

        /* ── Hero text entrance ───────────────────────── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── Gradient text pulse ──────────────────────── */
        @keyframes gradShift {
          0%,100% { background-position:0% 50%; }
          50%      { background-position:100% 50%; }
        }

        /* ── Orbs floating ────────────────────────────── */
        @keyframes orbFloat {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-18px); }
        }

        /* ── Typing dots ──────────────────────────────── */
        @keyframes typingPulse {
          0%,100% { transform:translateY(0);   opacity:.35; }
          50%      { transform:translateY(-4px); opacity:1; }
        }

        /* ── Entrance delays ──────────────────────────── */
        .aur-badge  { opacity:0; animation:fadeUp .9s cubic-bezier(.19,1,.22,1) .30s forwards; }
        .aur-h1     { opacity:0; animation:fadeUp 1s  cubic-bezier(.19,1,.22,1) .55s forwards; }
        .aur-sub    { opacity:0; animation:fadeUp 1s  cubic-bezier(.19,1,.22,1) .75s forwards; }
        .aur-proof  { opacity:0; animation:fadeUp 1s  cubic-bezier(.19,1,.22,1) .90s forwards; }
        .aur-cta    { opacity:0; animation:fadeUp 1s  cubic-bezier(.19,1,.22,1) 1.05s forwards; }
        .aur-mock   { opacity:0; animation:fadeUp 1.2s cubic-bezier(.19,1,.22,1) 1.20s forwards; }
        .aur-strip  { opacity:0; animation:fadeUp 1s  cubic-bezier(.19,1,.22,1) 1.60s forwards; }

        /* ── Gradient headline text ───────────────────── */
        .aurora-grad-text {
          background: linear-gradient(135deg,#00d4ff 0%,#7c3aed 38%,#00ffaa 72%,#00d4ff 100%);
          background-size: 220% 220%;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          animation:gradShift 7s ease infinite;
        }

        /* ── Primary CTA button ───────────────────────── */
        .aur-btn-primary {
          position:relative; overflow:hidden;
          padding:14px 32px; border-radius:12px;
          font-size:13px; font-weight:800; color:#04080f;
          background:linear-gradient(135deg,#00d4ff,#7c3aed);
          border:none; cursor:pointer; text-decoration:none;
          display:inline-flex; align-items:center; gap:8px;
          transition:transform .22s, box-shadow .22s;
          letter-spacing:.01em;
        }
        .aur-btn-primary::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,#00ffcc,#a855f7);
          opacity:0; transition:opacity .3s;
        }
        .aur-btn-primary:hover {
          transform:translateY(-2px);
          box-shadow:0 18px 40px rgba(0,212,255,0.32), 0 0 0 1px rgba(0,212,255,0.38);
        }
        .aur-btn-primary:hover::after { opacity:1; }
        .aur-btn-primary span { position:relative; z-index:1; }

        /* ── Secondary CTA button ─────────────────────── */
        .aur-btn-secondary {
          padding:14px 32px; border-radius:12px;
          font-size:13px; font-weight:600; color:rgba(255,255,255,0.82);
          background:rgba(255,255,255,0.055);
          border:1px solid rgba(255,255,255,0.10);
          cursor:pointer; text-decoration:none;
          display:inline-flex; align-items:center; gap:8px;
          transition:all .22s; backdrop-filter:blur(8px);
          letter-spacing:.01em;
        }
        .aur-btn-secondary:hover {
          background:rgba(255,255,255,0.09);
          border-color:rgba(255,255,255,0.16);
          transform:translateY(-2px);
        }

        /* ── Typing indicator ─────────────────────────── */
        .aurora-typing { display:inline-flex; gap:3px; align-items:center; }
        .aurora-dot {
          width:4px; height:4px; border-radius:50%;
          background:rgba(0,212,255,0.7);
          animation:typingPulse 1.2s ease infinite;
        }
        .aurora-dot:nth-child(2) { animation-delay:.2s; }
        .aurora-dot:nth-child(3) { animation-delay:.4s; }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          AURORA BACKGROUND LAYER
      ══════════════════════════════════════════════════════ */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:0 }}>
        {/* Blob 1 — teal, top-left */}
        <div style={{
          position:'absolute', width:700, height:700,
          top:-240, left:-160, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(0,212,255,0.30) 0%,transparent 68%)',
          filter:'blur(90px)',
          animation:'blob1 13s ease-in-out infinite',
          opacity: mounted ? 1 : 0,
          transition:'opacity 2s ease',
        }} />
        {/* Blob 2 — purple, top-right */}
        <div style={{
          position:'absolute', width:780, height:780,
          top:-200, right:-220, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(124,58,237,0.36) 0%,transparent 68%)',
          filter:'blur(100px)',
          animation:'blob2 16s ease-in-out infinite 0.4s',
          opacity: mounted ? 1 : 0,
          transition:'opacity 2.4s ease',
        }} />
        {/* Blob 3 — aqua-green, bottom-center */}
        <div style={{
          position:'absolute', width:900, height:500,
          bottom:-220, left:'50%',
          borderRadius:'50%',
          background:'radial-gradient(ellipse,rgba(0,255,170,0.18) 0%,transparent 68%)',
          filter:'blur(110px)',
          animation:'blob3 19s ease-in-out infinite 0.8s',
          opacity: mounted ? 1 : 0,
          transition:'opacity 2.8s ease',
        }} />
        {/* Blob 4 — pink, bottom-right */}
        <div style={{
          position:'absolute', width:520, height:520,
          bottom:80, right:-100, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(236,72,153,0.20) 0%,transparent 68%)',
          filter:'blur(80px)',
          animation:'blob4 15s ease-in-out infinite 1.2s',
          opacity: mounted ? 1 : 0,
          transition:'opacity 2.4s ease',
        }} />
        {/* Blob 5 — deep blue, mid-left */}
        <div style={{
          position:'absolute', width:440, height:440,
          top:'38%', left:-160, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(30,64,175,0.30) 0%,transparent 68%)',
          filter:'blur(80px)',
          animation:'blob5 21s ease-in-out infinite 1.6s',
          opacity: mounted ? 1 : 0,
          transition:'opacity 3s ease',
        }} />
      </div>

      {/* ── Grid overlay ──────────────────────────────────── */}
      <div style={{
        position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
        backgroundImage:[
          'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px)',
          'linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)',
        ].join(','),
        backgroundSize:'56px 56px',
      }} />

      {/* ══════════════════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════════════════ */}
      <div style={{
        position:'relative', zIndex:2,
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'120px 24px 64px',
        gap:0,
      }}>

        {/* ── Badge ──────────────────────────────────────── */}
        <div className="aur-badge" style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'6px 14px 6px 7px', borderRadius:999, marginBottom:28,
          background:'rgba(0,212,255,0.07)',
          border:'1px solid rgba(0,212,255,0.20)',
        }}>
          <div style={{
            width:20, height:20, borderRadius:999,
            background:'linear-gradient(135deg,#00d4ff,#7c3aed)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:9, fontWeight:900, color:'#fff',
          }}>✦</div>
          <span style={{
            fontSize:10.5, fontWeight:800, letterSpacing:'.12em',
            textTransform:'uppercase', color:'#00d4ff',
          }}>
            Institutional OS · v2.4
          </span>
        </div>

        {/* ── Headline ───────────────────────────────────── */}
        <h1 className="aur-h1" style={{
          fontSize:'clamp(38px,6.5vw,82px)',
          fontWeight:900, lineHeight:1.02,
          letterSpacing:'-.04em', textAlign:'center',
          maxWidth:860, marginBottom:22,
          color:'rgba(255,255,255,0.96)',
        }}>
          The Team OS<br />
          <span className="aurora-grad-text">EduTechEx Runs On.</span>
        </h1>

        {/* ── Sub ────────────────────────────────────────── */}
        <p className="aur-sub" style={{
          fontSize:'clamp(14px,1.8vw,17.5px)', fontWeight:400,
          color:'rgba(255,255,255,0.48)', textAlign:'center',
          maxWidth:560, lineHeight:1.78, marginBottom:36,
        }}>
          All the context your team needs — real-time channels, embedded AI,
          auto-extracted tasks, morning digests — without the noise.
        </p>

        {/* ── Social proof ───────────────────────────────── */}
        <div className="aur-proof" style={{
          display:'flex', alignItems:'center', gap:12, marginBottom:32,
        }}>
          <div style={{ display:'flex' }}>
            {[
              { init:'AC', bg:'#2563eb' }, { init:'RK', bg:'#7c3aed' },
              { init:'SA', bg:'#0891b2' }, { init:'TM', bg:'#059669' },
              { init:'MK', bg:'#dc2626' },
            ].map((m, i) => (
              <div key={i} style={{
                width:28, height:28, borderRadius:'50%',
                background:m.bg, border:'2px solid #060b18',
                marginLeft: i === 0 ? 0 : -8,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:8, fontWeight:900, color:'#fff', zIndex:5-i,
                position:'relative',
              }}>{m.init}</div>
            ))}
          </div>
          <div>
            <div style={{ color:'#fbbf24', fontSize:11, letterSpacing:1 }}>★★★★★</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:1 }}>
              Used daily by the entire EduTechEx team
            </div>
          </div>
        </div>

        {/* ── CTAs ───────────────────────────────────────── */}
        <div className="aur-cta" style={{
          display:'flex', gap:14, marginBottom:64,
          flexWrap:'wrap', justifyContent:'center',
        }}>
          <Link href="/sign-up-login-screen?mode=user" className="aur-btn-primary">
            <span>Enter System</span>
            <span style={{ position:'relative', zIndex:1, fontSize:14 }}>→</span>
          </Link>
          <a href="#features" className="aur-btn-secondary">
            Explore Features
          </a>
        </div>

        {/* ══════════════════════════════════════════════════
            PRODUCT MOCKUP
        ══════════════════════════════════════════════════ */}
        <div className="aur-mock" style={{
          position:'relative', width:'100%', maxWidth:1080,
        }}>
          {/* Glow halo */}
          <div style={{
            position:'absolute', inset:'-80px',
            background:'radial-gradient(ellipse at 50% 55%,rgba(0,212,255,0.13) 0%,rgba(124,58,237,0.10) 40%,transparent 70%)',
            pointerEvents:'none', zIndex:0,
          }} />

          {/* Floating orbs */}
          {([
            { size:12, color:'#00d4ff', glow:'#00d4ff', top:'-18px' as string|undefined, right:undefined as string|undefined, bottom:undefined as string|undefined, left:'16%' as string|undefined, delay:'0s' },
            { size:8,  color:'#7c3aed', glow:'#7c3aed', top:'22%',  right:'6%',          bottom:undefined,                    left:undefined,                      delay:'1.2s' },
            { size:10, color:'#00ffaa', glow:'#00ffaa', top:undefined, right:undefined,   bottom:'8%',                         left:'4%',                           delay:'0.6s' },
          ] as const).map((o, i) => (
            <div key={i} style={{
              position:'absolute', width:o.size, height:o.size,
              borderRadius:'50%', background:o.color,
              boxShadow:`0 0 ${o.size * 2}px ${o.glow}`,
              top:o.top, right:o.right, bottom:o.bottom, left:o.left,
              animation:`orbFloat ${6 + i * 1.5}s ease-in-out ${o.delay} infinite`,
              zIndex:3,
            }} />
          ))}

          {/* Browser frame */}
          <div style={{
            position:'relative', zIndex:2, borderRadius:16,
            overflow:'hidden',
            border:'1px solid rgba(255,255,255,0.09)',
            boxShadow:[
              '0 0 0 1px rgba(0,212,255,0.07)',
              '0 40px 80px rgba(0,0,0,0.65)',
              '0 0 120px rgba(0,212,255,0.05)',
              'inset 0 1px 0 rgba(255,255,255,0.07)',
            ].join(', '),
            background:'#0d1117',
          }}>

            {/* Scan line animation */}
            <div style={{
              position:'absolute', left:0, right:0, height:2,
              background:'linear-gradient(90deg,transparent,rgba(0,212,255,0.45),rgba(124,58,237,0.45),transparent)',
              animation:'scan 9s linear infinite', zIndex:10, top:0,
              pointerEvents:'none',
            }} />

            {/* Browser chrome bar */}
            <div style={{
              display:'flex', alignItems:'center', gap:7, padding:'11px 16px',
              background:'#161b22', borderBottom:'1px solid rgba(255,255,255,0.055)',
            }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#ff5f57' }} />
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#febc2e' }} />
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#28c840' }} />
              <div style={{
                flex:1, margin:'0 12px', padding:'4px 12px',
                borderRadius:7, background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.055)',
                fontSize:10.5, fontFamily:'monospace', color:'rgba(255,255,255,0.35)',
              }}>
                edutechexos.vercel.app/dashboard
              </div>
            </div>

            {/* Dashboard layout */}
            <div style={{ display:'flex', height:500, background:'#0d1117' }}>

              {/* ── Sidebar ─────────────────────────────── */}
              <div style={{
                width:204, flexShrink:0,
                background:'#090d14',
                borderRight:'1px solid rgba(255,255,255,0.045)',
                display:'flex', flexDirection:'column',
                paddingTop:14,
              }}>
                {/* Logo */}
                <div style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'0 14px 14px',
                  borderBottom:'1px solid rgba(255,255,255,0.045)',
                  marginBottom:10,
                }}>
                  <div style={{
                    width:26, height:26, borderRadius:7,
                    background:'linear-gradient(135deg,#00d4ff,#7c3aed)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:900, color:'#fff',
                  }}>E</div>
                  <span style={{ fontSize:11.5, fontWeight:800, color:'rgba(255,255,255,0.88)', letterSpacing:'-.01em' }}>
                    EduTechExOS
                  </span>
                </div>

                {/* Channels */}
                <div style={{ padding:'0 14px 5px', fontSize:8.5, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)' }}>
                  Channels
                </div>
                <SidebarChannel name="general" badge={3} active />
                <SidebarChannel name="skillnaav" />
                <SidebarChannel name="edutechex" />
                <SidebarChannel name="assessa" />

                {/* Tools */}
                <div style={{ padding:'10px 14px 5px', fontSize:8.5, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginTop:4 }}>
                  Tools
                </div>
                <SidebarTool icon="⬡" label="Kanban" />
                <SidebarTool icon="📖" label="Wiki" />
                <SidebarTool icon="📅" label="Calendar" />
                <SidebarTool icon="✦" label="AI Copilot" />

                {/* Members */}
                <div style={{ marginTop:'auto', padding:'10px 14px 0', borderTop:'1px solid rgba(255,255,255,0.045)' }}>
                  {[
                    { init:'AC', bg:'#2563eb', name:'Aditya C.', role:'Manager', online:true },
                    { init:'RK', bg:'#7c3aed', name:'Ram K.',    role:'Dev',     online:true },
                    { init:'SA', bg:'#0891b2', name:'Sneha A.',  role:'Design',  online:false },
                  ].map((m, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 0' }}>
                      <div style={{
                        width:22, height:22, borderRadius:6, flexShrink:0,
                        background:m.bg, display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:7.5, fontWeight:900, color:'#fff',
                      }}>{m.init}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:9.5, fontWeight:600, color:'rgba(255,255,255,0.65)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.name}</div>
                        <div style={{ fontSize:8, color:'rgba(255,255,255,0.25)' }}>{m.role}</div>
                      </div>
                      <div style={{ width:6, height:6, borderRadius:'50%', background: m.online ? '#22c55e' : '#6b7280', flexShrink:0 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Main chat area ───────────────────────── */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
                {/* Channel header */}
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'11px 18px',
                  borderBottom:'1px solid rgba(255,255,255,0.045)',
                  background:'rgba(13,17,23,0.7)', backdropFilter:'blur(10px)',
                }}>
                  <div>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'rgba(255,255,255,0.88)' }}># general</div>
                    <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.28)', marginTop:1 }}>Team-wide announcements &amp; updates</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {['📅 Meet','✦ AI'].map(l => (
                      <div key={l} style={{
                        padding:'4px 11px', borderRadius:6, fontSize:9.5, fontWeight:700,
                        background:'rgba(0,212,255,0.09)', border:'1px solid rgba(0,212,255,0.18)',
                        color:'#00d4ff', cursor:'pointer',
                      }}>{l}</div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex:1, overflowY:'hidden', padding:'18px 18px 0', display:'flex', flexDirection:'column', gap:14 }}>
                  {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}
                </div>

                {/* Typing bar */}
                <div style={{
                  padding:'7px 18px', fontSize:10, color:'rgba(255,255,255,0.30)',
                  display:'flex', alignItems:'center', gap:6,
                  opacity: typingVisible ? 1 : 0, transition:'opacity .5s',
                }}>
                  <TypingDots />
                  Ram K Aluru is typing…
                </div>

                {/* Input bar */}
                <div style={{
                  padding:'10px 18px', borderTop:'1px solid rgba(255,255,255,0.045)',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  {['📎','🎤'].map(ic => (
                    <div key={ic} style={{
                      width:26, height:26, borderRadius:6,
                      background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.055)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, cursor:'pointer',
                    }}>{ic}</div>
                  ))}
                  <div style={{
                    flex:1, padding:'7px 12px', borderRadius:8,
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.07)',
                    fontSize:10.5, color:'rgba(255,255,255,0.20)',
                  }}>Message #general…</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', cursor:'pointer' }}>😊</div>
                  <div style={{
                    width:30, height:30, borderRadius:8,
                    background:'linear-gradient(135deg,#00d4ff,#7c3aed)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, cursor:'pointer', flexShrink:0,
                  }}>↑</div>
                </div>
              </div>

              {/* ── Right panel ─────────────────────────── */}
              <div style={{
                width:220, flexShrink:0,
                background:'#090d14',
                borderLeft:'1px solid rgba(255,255,255,0.045)',
                padding:14, display:'flex', flexDirection:'column', gap:14, overflow:'hidden',
              }}>
                {/* Analytics */}
                <div>
                  <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:8 }}>Analytics</div>
                  <div style={{
                    padding:'11px', borderRadius:10,
                    background:'rgba(255,255,255,0.025)',
                    border:'1px solid rgba(255,255,255,0.045)',
                  }}>
                    <div style={{
                      fontSize:22, fontWeight:900, letterSpacing:'-.02em',
                      background:'linear-gradient(135deg,#00d4ff,#7c3aed)',
                      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                      backgroundClip:'text',
                    }}>247</div>
                    <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.28)', marginTop:2 }}>Messages today</div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:34, marginTop:10 }}>
                      {chartHeights.map((h, i) => (
                        <div key={i} style={{
                          flex:1, borderRadius:2,
                          height:`${h}%`,
                          background: i === chartHeights.length - 1
                            ? 'linear-gradient(to top,#00d4ff,#7c3aed)'
                            : 'rgba(0,212,255,0.18)',
                        }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Kanban */}
                <div>
                  <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:7 }}>Kanban</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {kanban.map((k, i) => (
                      <div key={i} style={{
                        display:'flex', alignItems:'center', gap:7, padding:'7px 9px',
                        borderRadius:8, background:'rgba(255,255,255,0.025)',
                        border:'1px solid rgba(255,255,255,0.045)', fontSize:10,
                        color:'rgba(255,255,255,0.52)',
                      }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:k.color, flexShrink:0 }} />
                        {k.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next meeting */}
                <div>
                  <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:7 }}>Next Meeting</div>
                  <div style={{
                    padding:'11px', borderRadius:10,
                    background:'rgba(255,255,255,0.025)',
                    border:'1px solid rgba(0,212,255,0.14)',
                  }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#00d4ff', marginBottom:3 }}>Sprint Review</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.42)' }}>Today at 3:00 PM</div>
                    <div style={{
                      marginTop:8, padding:'4px 0', borderRadius:6, textAlign:'center',
                      background:'rgba(0,212,255,0.09)', border:'1px solid rgba(0,212,255,0.18)',
                      fontSize:9, fontWeight:700, color:'#00d4ff', cursor:'pointer',
                    }}>Join Meet →</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            STATS STRIP
        ══════════════════════════════════════════════════ */}
        <div className="aur-strip" style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:'100%', maxWidth:680, marginTop:52,
          borderTop:'1px solid rgba(255,255,255,0.06)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { num:10, suffix:'+',  label:'Team channels' },
            { num:'∞', suffix:'',  label:'Message history' },
            { num:'AI', suffix:'', label:'Copilot built-in' },
            { num:0,   suffix:'ms',label:'Real-time sync' },
          ].map((s, i) => (
            <div key={i} style={{
              flex:1, textAlign:'center', padding:'22px 12px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{
                fontSize:'clamp(22px,3.5vw,34px)', fontWeight:900, letterSpacing:'-.02em', lineHeight:1,
                background:'linear-gradient(135deg,#00d4ff,#7c3aed)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>
                {typeof s.num === 'number'
                  ? <CountUp target={s.num} suffix={s.suffix} />
                  : <>{s.num}{s.suffix}</>
                }
              </div>
              <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.38)', marginTop:4, fontWeight:500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Version watermark */}
        <div style={{
          marginTop:24, fontSize:9.5, fontWeight:700,
          letterSpacing:'.24em', textTransform:'uppercase',
          color:'rgba(255,255,255,0.14)',
        }}>
          v2.4.0 · Secured · Institutional Grade
        </div>
      </div>
    </section>
  );
}
