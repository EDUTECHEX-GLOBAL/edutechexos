'use client';
import React from 'react';
import { Video, ExternalLink, X, Users } from 'lucide-react';

export interface MeetingStartedProps {
  title?: string;
  subtitle?: string;
  meetLink: string;
  onClose?: () => void;
}

export default function MeetingStartedCard({
  title = 'Meeting Started',
  subtitle = 'Join on Google Meet',
  meetLink,
  onClose,
}: MeetingStartedProps) {
  return (
    <>
      <style>{`
        @keyframes msc-slideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes msc-liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }
        @keyframes msc-ring {
          0%   { transform: scale(0.8);  opacity: 0.8; }
          100% { transform: scale(2.2);  opacity: 0; }
        }
        @keyframes msc-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes msc-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-3px); }
        }

        .msc-card-new {
          animation: msc-slideIn 0.38s cubic-bezier(0.16,1,0.3,1) both;
        }
        .msc-join-btn-new {
          position: relative;
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .msc-join-btn-new::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255,255,255,0.22) 50%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: msc-shimmer 2.4s ease infinite;
        }
        .msc-join-btn-new:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(26,115,232,0.50), 0 2px 8px rgba(0,0,0,0.18);
        }
        .msc-join-btn-new:active {
          transform: translateY(0);
        }
        .msc-icon-float {
          animation: msc-float 3s ease-in-out infinite;
        }
      `}</style>

      <div
        className="msc-card-new"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 348,
          borderRadius: 20,
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #0d1117 0%, #0a1628 55%, #0d1535 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: [
            '0 0 0 1px rgba(26,115,232,0.12)',
            '0 24px 56px rgba(0,0,0,0.60)',
            '0 4px 16px rgba(26,115,232,0.08)',
            'inset 0 1px 0 rgba(255,255,255,0.06)',
          ].join(','),
        }}
      >
        {/* Background ambient glows */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: [
            'radial-gradient(ellipse 80% 60% at 15% 0%, rgba(26,115,232,0.13) 0%, transparent 70%)',
            'radial-gradient(ellipse 60% 50% at 90% 100%, rgba(52,168,83,0.09) 0%, transparent 65%)',
            'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(234,67,53,0.04) 0%, transparent 70%)',
          ].join(','),
        }} />

        {/* Top accent line – Google 4-color */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, zIndex: 2,
          background: 'linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%)',
        }} />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.40)', transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = 'rgba(234,67,53,0.18)';
              b.style.color = '#EA4335';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = 'rgba(255,255,255,0.06)';
              b.style.color = 'rgba(255,255,255,0.40)';
            }}
          >
            <X size={13} />
          </button>
        )}

        <div style={{ position: 'relative', zIndex: 1, padding: '20px 18px 18px' }}>

          {/* ── Header row ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 16 }}>

            {/* Animated Google Meet icon */}
            <div className="msc-icon-float" style={{ position: 'relative', flexShrink: 0 }}>
              {/* Ripple rings */}
              <div style={{
                position: 'absolute', inset: -6, borderRadius: '50%',
                border: '1.5px solid rgba(26,115,232,0.35)',
                animation: 'msc-ring 2.2s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -6, borderRadius: '50%',
                border: '1.5px solid rgba(26,115,232,0.20)',
                animation: 'msc-ring 2.2s ease-out 0.7s infinite',
              }} />

              {/* Icon box */}
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(145deg, #1a73e8, #0d47a1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 1px rgba(26,115,232,0.25), 0 6px 22px rgba(26,115,232,0.40)',
              }}>
                {/* Google Meet "M" camera icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M15 8h-8a1 1 0 00-1 1v6a1 1 0 001 1h8a1 1 0 001-1v-1.5l3 2.5V8.5L16 11V9a1 1 0 00-1-1z" fill="#fff" />
                </svg>
              </div>
            </div>

            {/* Title + live badge */}
            <div style={{ flex: 1, paddingTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{
                  fontSize: 14.5, fontWeight: 800, letterSpacing: '-.02em', color: '#ffffff',
                }}>
                  {title}
                </span>

                {/* Live pill */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(234,67,53,0.15)',
                  border: '1px solid rgba(234,67,53,0.30)',
                  borderRadius: 20, padding: '2px 7px',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#EA4335',
                    boxShadow: '0 0 5px rgba(234,67,53,0.8)',
                    animation: 'msc-liveDot 1.5s ease-in-out infinite',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#EA4335', letterSpacing: '.04em' }}>
                    LIVE
                  </span>
                </span>
              </div>

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 500, letterSpacing: '.005em' }}>
                {subtitle}
              </p>
            </div>
          </div>

          {/* ── Meet link preview ── */}
          {meetLink && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 12px', borderRadius: 11, marginBottom: 14,
              background: 'rgba(26,115,232,0.07)',
              border: '1px solid rgba(26,115,232,0.16)',
              overflow: 'hidden',
            }}>
              {/* Google "G" icon */}
              <div style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: 'rgba(26,115,232,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>

              <span style={{
                fontSize: 10.5, color: 'rgba(26,115,232,0.85)', fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                fontFamily: 'monospace',
              }}>
                {meetLink}
              </span>

              <ExternalLink size={11} color="rgba(26,115,232,0.50)" style={{ flexShrink: 0 }} />
            </div>
          )}

          {/* ── Join button ── */}
          <a
            href={meetLink || '#'}
            target="_blank"
            rel="noreferrer"
            className="msc-join-btn-new"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '11px 0', borderRadius: 13,
              background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
              color: '#fff', fontWeight: 800, fontSize: 13.5, letterSpacing: '-.01em',
              textDecoration: 'none', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(26,115,232,0.38)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 8h-8a1 1 0 00-1 1v6a1 1 0 001 1h8a1 1 0 001-1v-1.5l3 2.5V8.5L16 11V9a1 1 0 00-1-1z" fill="#fff"/>
            </svg>
            Join Google Meet
          </a>

          {/* ── Footer row ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 12, paddingTop: 11,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Users size={11} color="rgba(255,255,255,0.28)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
                Open to all channel members
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {['#4285F4','#EA4335','#FBBC04','#34A853'].map((c, i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%', background: c,
                  opacity: 0.7,
                }} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
