import React from 'react';

interface StartMeetingCardProps {
  text: string;
}

export default function StartMeetingCard({ text }: StartMeetingCardProps) {
  const title = text.match(/Meeting Started:\s*(.+)/)?.[1]?.trim() ?? 'Meeting Scheduled';
  const link  = text.match(/https?:\/\/\S+/)?.[0] ?? '';

  return (
    <>
      <style>{`
        @keyframes smc-slideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes smc-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        @keyframes smc-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes smc-calPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }

        .smc-card {
          animation: smc-slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        .smc-btn {
          position: relative;
          overflow: hidden;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        .smc-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255,255,255,0.20) 50%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: smc-shimmer 2.6s ease infinite;
        }
        .smc-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(26,115,232,0.48), 0 2px 8px rgba(0,0,0,0.20);
        }
        .smc-btn:active { transform: translateY(0); }
      `}</style>

      <div
        className="smc-card"
        style={{
          position: 'relative',
          minWidth: 260,
          maxWidth: 320,
          borderRadius: 18,
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #0d1117 0%, #0a1628 55%, #0d1535 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: [
            '0 0 0 1px rgba(26,115,232,0.12)',
            '0 16px 40px rgba(0,0,0,0.55)',
            '0 4px 12px rgba(26,115,232,0.07)',
            'inset 0 1px 0 rgba(255,255,255,0.06)',
          ].join(','),
        }}
      >
        {/* Google 4-color top stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%)',
        }} />

        {/* Ambient glows */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: [
            'radial-gradient(ellipse 80% 55% at 15% 0%,  rgba(26,115,232,0.12) 0%, transparent 70%)',
            'radial-gradient(ellipse 60% 45% at 90% 100%, rgba(52,168,83,0.08)  0%, transparent 65%)',
          ].join(','),
        }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '18px 16px 16px' }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>

            {/* Animated calendar icon */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: -5, borderRadius: '50%',
                border: '1.5px solid rgba(26,115,232,0.30)',
                animation: 'smc-ring 2.4s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -5, borderRadius: '50%',
                border: '1.5px solid rgba(26,115,232,0.18)',
                animation: 'smc-ring 2.4s ease-out 0.8s infinite',
              }} />
              <div style={{
                width: 42, height: 42, borderRadius: 13,
                background: 'linear-gradient(145deg, #1a73e8, #0d47a1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 1px rgba(26,115,232,0.25), 0 6px 20px rgba(26,115,232,0.38)',
              }}>
                {/* Calendar SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="3" stroke="#fff" strokeWidth="2"/>
                  <path d="M3 9h18" stroke="#fff" strokeWidth="2"/>
                  <path d="M8 2v4M16 2v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="8"  cy="14" r="1.2" fill="#fff"/>
                  <circle cx="12" cy="14" r="1.2" fill="#fff"/>
                  <circle cx="16" cy="14" r="1.2" fill="#fff"/>
                </svg>
              </div>
            </div>

            {/* Title + badge */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 13.5, fontWeight: 800,
                  letterSpacing: '-.02em', color: '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: 140,
                }}>
                  {title}
                </span>

                {/* Scheduled badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(26,115,232,0.15)',
                  border: '1px solid rgba(26,115,232,0.30)',
                  borderRadius: 20, padding: '2px 7px',
                  flexShrink: 0,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#4285F4',
                    boxShadow: '0 0 4px rgba(66,133,244,0.8)',
                    animation: 'smc-calPulse 2s ease-in-out infinite',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#4285F4', letterSpacing: '.05em' }}>
                    SCHEDULED
                  </span>
                </span>
              </div>

              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>
                Google Meet · Click to join
              </p>
            </div>
          </div>

          {/* ── Link preview (if link present) ── */}
          {link && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 11px', borderRadius: 10, marginBottom: 12,
              background: 'rgba(26,115,232,0.07)',
              border: '1px solid rgba(26,115,232,0.15)',
              overflow: 'hidden',
            }}>
              {/* Google G icon */}
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: 'rgba(26,115,232,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <span style={{
                fontSize: 10, color: 'rgba(26,115,232,0.80)', fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                flex: 1, fontFamily: 'monospace',
              }}>
                {link}
              </span>
            </div>
          )}

          {/* ── Join button ── */}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="smc-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', padding: '10px 0', borderRadius: 12,
                background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
                color: '#fff', fontWeight: 800, fontSize: 13,
                letterSpacing: '-.01em', textDecoration: 'none',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(26,115,232,0.36)',
              }}
            >
              {/* Video camera icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M15 8h-8a1 1 0 00-1 1v6a1 1 0 001 1h8a1 1 0 001-1v-1.5l3 2.5V8.5L16 11V9a1 1 0 00-1-1z" fill="#fff"/>
              </svg>
              Join Google Meet
            </a>
          )}

          {/* ── Footer ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 12, paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
              Open to all members
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {['#4285F4','#EA4335','#FBBC04','#34A853'].map((c, i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: c, opacity: 0.65,
                }} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
