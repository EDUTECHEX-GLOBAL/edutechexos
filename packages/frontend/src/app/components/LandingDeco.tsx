'use client';
import React from 'react';

/* ──────────────────────────────────────────────────────────────────────────
   LandingDeco — refined Art Deco ornament toolkit for the EduTechExOS landing.
   Keeps the violet brand (#5B4FDB / #8B3FDB / ink #1A1B3A) and layers on
   Art Deco geometry: gold hairlines, stepped corners, sunburst fans, and
   symmetrical diamond medallions. Used across every landing section so the
   whole page reads as one cohesive Art Deco experience.
   ────────────────────────────────────────────────────────────────────────── */

export const DECO_GOLD = '#C9A24B';
export const DECO_GOLD_LIGHT = '#E3C77A';
export const DECO_INK = '#1A1B3A';

/* Global keyframes + helpers — render once on the page. */
export function DecoStyles() {
  return (
    <style>{`
      @keyframes deco-shimmer { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
      @keyframes deco-rotate  { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      .deco-shimmer { animation: deco-shimmer 4.5s ease-in-out infinite; }
      .deco-spin-slow { animation: deco-rotate 60s linear infinite; transform-origin: center; }
    `}</style>
  );
}

/* Small solid diamond — the recurring Art Deco unit. */
export function DecoDiamond({ size = 7, color = DECO_GOLD, hollow = false }: { size?: number; color?: string; hollow?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, flexShrink: 0,
        transform: 'rotate(45deg)',
        background: hollow ? 'transparent' : color,
        border: `1.2px solid ${color}`,
        display: 'inline-block',
        boxShadow: hollow ? 'none' : `0 0 6px ${color}55`,
      }}
    />
  );
}

/* Symmetric eyebrow:  ◆ ──  LABEL  ── ◆   (replaces the plain dot+mono label). */
export function DecoEyebrow({
  label,
  color = DECO_GOLD,
  align = 'left',
}: { label: string; color?: string; align?: 'left' | 'center' }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      {align === 'center' && <span style={{ height: 1, width: 28, background: `linear-gradient(90deg, transparent, ${color})` }} />}
      <DecoDiamond size={6} color={color} />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5, fontWeight: 800, letterSpacing: '.30em',
          textTransform: 'uppercase', color,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span style={{ height: 1, width: align === 'center' ? 28 : 40, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      {align === 'center' && <DecoDiamond size={6} color={color} />}
    </div>
  );
}

/* Sunburst / fan — rays emanating from a point. Use as a subtle backdrop. */
export function DecoSunburst({
  size = 320,
  color = DECO_GOLD,
  rays = 24,
  opacity = 0.12,
  style,
}: { size?: number; color?: string; rays?: number; opacity?: number; style?: React.CSSProperties }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      aria-hidden style={{ opacity, ...style }}
    >
      {Array.from({ length: rays }).map((_, i) => {
        const a = (i / rays) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
            stroke={color} strokeWidth={i % 2 === 0 ? 1.1 : 0.5}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.34} fill="none" stroke={color} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={color} strokeWidth={0.6} />
    </svg>
  );
}

/* Stepped Art Deco corner bracket. corner = which corner it sits in. */
export function DecoCorner({
  corner = 'tl',
  size = 88,
  color = DECO_GOLD,
  opacity = 0.55,
}: { corner?: 'tl' | 'tr' | 'bl' | 'br'; size?: number; color?: string; opacity?: number }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[corner];
  return (
    <svg
      width={size} height={size} viewBox="0 0 88 88" aria-hidden
      style={{ opacity, transform: `rotate(${rot}deg)` }}
    >
      <path
        d="M4 84 L4 34 L14 34 L14 22 L26 22 L26 12 L38 12 L38 4 L84 4"
        fill="none" stroke={color} strokeWidth="1.4"
      />
      <path d="M12 84 L12 42 L22 42" fill="none" stroke={color} strokeWidth="0.7" opacity="0.6" />
      <rect x="80" y="0" width="8" height="8" transform="rotate(45 84 4)" fill={color} opacity="0.8" />
    </svg>
  );
}

/* Gold rule with a central diamond — sits under headlines. */
export function DecoRule({ width = 220, color = DECO_GOLD }: { width?: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width }}>
      <span style={{ flex: 1, height: 1.5, background: `linear-gradient(90deg, ${color}, ${color}33)`, borderRadius: 1 }} />
      <DecoDiamond size={7} color={color} />
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}55, transparent)`, borderRadius: 1 }} />
    </div>
  );
}

/* Full-width section divider — gold medallion centered between hairlines. */
export function DecoDivider({
  label,
  color = DECO_GOLD,
  background,
}: { label?: string; color?: string; background?: string }) {
  return (
    <div style={{ background, padding: '34px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, maxWidth: 780, margin: '0 auto' }}>
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${color}66)` }} />
        <DecoDiamond size={5} color={color} hollow />
        <DecoDiamond size={9} color={color} />
        {label ? (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: '.34em', textTransform: 'uppercase', color, whiteSpace: 'nowrap' }}>
            {label}
          </span>
        ) : null}
        <DecoDiamond size={9} color={color} />
        <DecoDiamond size={5} color={color} hollow />
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}66, transparent)` }} />
      </div>
    </div>
  );
}
