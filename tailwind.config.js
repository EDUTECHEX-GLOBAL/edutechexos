/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        /* ── Core surfaces ───────────────────────────── */
        background:      '#ECEAF8',
        foreground:      '#1A1B3A',
        surface:         '#FFFFFF',
        'surface-muted': '#DDD8F6',

        /* ── Text shades ─────────────────────────────── */
        ink:         '#5A5F80',
        'ink-light': '#9296B0',

        /* ── Primary — Indigo Violet ─────────────────── */
        primary: {
          DEFAULT:    '#5B4FDB',
          foreground: '#FFFFFF',
          light:      '#7B6FEB',
          dark:       '#4238C8',
        },

        /* ── Secondary — Coral Orange ────────────────── */
        secondary: {
          DEFAULT:    '#FF6B4A',
          foreground: '#FFFFFF',
          light:      '#FF9070',
          dark:       '#E55030',
        },

        /* ── Accent ───────────────────────────────────── */
        accent: {
          DEFAULT:    '#5B4FDB',
          foreground: '#FFFFFF',
          light:      '#7B6FEB',
          dark:       '#4238C8',
        },

        /* ── Feature-specific color rooms ─────────────── */
        channel:    { DEFAULT: '#0DAFCE', light: '#7ECEF0', surface: '#E8F8FD', border: '#B3E8F5' },
        task:       { DEFAULT: '#10C98A', light: '#7BE8CC', surface: '#E7FBF5', border: '#A3EDD3' },
        ai:         { DEFAULT: '#8B3FDB', light: '#A868D8', surface: '#F3E8FF', border: '#D5ADFF' },
        admin:      { DEFAULT: '#EF476F', light: '#F57A98', surface: '#FDE8EE', border: '#F9ADBE' },
        calendar:   { DEFAULT: '#F59E0B', light: '#FFBF5E', surface: '#FFF7E0', border: '#FDD89A' },
        analytics:  { DEFAULT: '#3B82F6', light: '#7AADFF', surface: '#EEF4FF', border: '#B3CFFE' },
        broadcast:  { DEFAULT: '#C026D3', light: '#CF7FF5', surface: '#FEE8FF', border: '#F0ADFF' },
        attendance: { DEFAULT: '#F59E0B', light: '#F5C060', surface: '#FFF8E0', border: '#FFD77A' },
        wiki:       { DEFAULT: '#059669', light: '#34D399', surface: '#ECFDF5', border: '#A7F3D0' },
        notes:      { DEFAULT: '#F97316', light: '#FB923C', surface: '#FFF7ED', border: '#FED7AA' },

        /* ── Lavender ─────────────────────────────────── */
        lavender: {
          DEFAULT: '#7B6FEB',
          light:   '#A89FEF',
          dark:    '#5B4FDB',
          surface: '#F3F0FF',
        },

        /* ── Green ────────────────────────────────────── */
        green: {
          DEFAULT: '#10C98A',
          light:   '#7BE8CC',
          dark:    '#0A9E6A',
          surface: '#E7FBF5',
          pale:    '#F0FDF9',
        },

        /* ── Muted ───────────────────────────────────── */
        muted: {
          DEFAULT:    '#EEF2FF',
          foreground: '#5A5F80',
        },

        /* ── Dark (kept for text, not backgrounds) ───── */
        dark: {
          DEFAULT:    '#1A1B3A',
          foreground: '#F7F8FF',
          muted:      '#5A5F80',
          border:     '#C4C0E4',
          surface:    '#F7F8FF',
        },

        /* ── Card ────────────────────────────────────── */
        card: {
          DEFAULT:    '#FFFFFF',
          foreground: '#1A1B3A',
          border:     '#C4C0E4',
        },

        /* ── Structural ──────────────────────────────── */
        border: '#C4C0E4',
        input:  '#C4C0E4',
        ring:   '#5B4FDB',

        /* ── Amber (kept for compatibility) ──────────── */
        amber: {
          DEFAULT:    '#F59E0B',
          dim:        'rgba(245,158,11,0.12)',
          glow:       'rgba(245,158,11,0.20)',
        },
      },

      borderRadius: {
        lg: '1rem', md: '0.75rem', sm: '0.5rem',
        xl: '1.25rem', '2xl': '1.5rem',
      },

      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Sora"', '"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },

      fontSize: {
        'hero-xl':  ['clamp(3.2rem, 8vw, 7rem)',  { lineHeight: '1.0',  letterSpacing: '-0.04em', fontWeight: '900' }],
        'hero-2xl': ['clamp(4rem, 10vw, 9rem)',    { lineHeight: '0.95', letterSpacing: '-0.05em', fontWeight: '900' }],
        'hero-md':  ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
      },

      boxShadow: {
        glass:       '0 8px 32px rgba(91,79,219,0.06), 0 1px 2px rgba(91,79,219,0.04)',
        'glass-lg':  '0 16px 48px rgba(91,79,219,0.10), 0 2px 8px rgba(91,79,219,0.05)',
        glow:        '0 0 40px -8px rgba(91,79,219,0.25)',
        'glow-lg':   '0 0 60px -12px rgba(91,79,219,0.35)',
        soft:        '0 4px 16px rgba(91,79,219,0.08)',
        card:        '0 2px 8px rgba(91,79,219,0.06), 0 16px 32px -8px rgba(91,79,219,0.08)',
        'card-hover':'0 4px 16px rgba(91,79,219,0.12), 0 24px 48px -8px rgba(91,79,219,0.14)',
        feature:     '0 8px 24px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
      },

      keyframes: {
        'fade-up':    { from: { opacity: '0', transform: 'translateY(24px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-down':  { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in':    { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in':   { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        float:        { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        'float-slow': { '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' }, '50%': { transform: 'translateY(-20px) rotate(2deg)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'gradient-shift': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        morph: {
          '0%, 100%': { borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' },
          '25%':      { borderRadius: '58% 42% 75% 25% / 76% 46% 54% 24%' },
          '50%':      { borderRadius: '50% 50% 33% 67% / 55% 27% 73% 45%' },
          '75%':      { borderRadius: '33% 67% 58% 42% / 63% 68% 32% 37%' },
        },
        /* ── Feature click animations ─── */
        'bubble-pop': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.12)' },
          '70%':  { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        'card-flip': {
          '0%':   { transform: 'rotateY(0deg)' },
          '50%':  { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        'neural-pulse': {
          '0%':   { transform: 'scale(1)',   opacity: '0.8' },
          '50%':  { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '0' },
        },
        'page-unfold': {
          '0%':   { transform: 'scaleY(0)',    transformOrigin: 'top',  opacity: '0' },
          '60%':  { transform: 'scaleY(1.04)', transformOrigin: 'top',  opacity: '1' },
          '100%': { transform: 'scaleY(1)',    transformOrigin: 'top',  opacity: '1' },
        },
        'bar-rise': {
          '0%':   { transform: 'scaleY(0)',    transformOrigin: 'bottom' },
          '80%':  { transform: 'scaleY(1.06)', transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(1)',    transformOrigin: 'bottom' },
        },
        'bell-ring': {
          '0%,100%': { transform: 'rotate(0deg)' },
          '15%':     { transform: 'rotate(14deg)' },
          '30%':     { transform: 'rotate(-12deg)' },
          '45%':     { transform: 'rotate(10deg)' },
          '60%':     { transform: 'rotate(-8deg)' },
          '75%':     { transform: 'rotate(4deg)' },
        },
        'spotlight-ripple': {
          '0%':   { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        },
        'send-whoosh': {
          '0%':   { transform: 'translate(0,0)   rotate(0deg)',   opacity: '1' },
          '60%':  { transform: 'translate(80px,-80px) rotate(45deg)', opacity: '0' },
          '61%':  { transform: 'translate(-20px,10px) rotate(0deg)',  opacity: '0' },
          '100%': { transform: 'translate(0,0)   rotate(0deg)',   opacity: '1' },
        },
        'cell-bloom': {
          '0%':   { transform: 'scale(0)',    opacity: '0' },
          '60%':  { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        'slide-deck': {
          '0%':   { transform: 'translateX(-12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        'orb-drift': {
          '0%':   { transform: 'translate(0, 0)   scale(1)' },
          '25%':  { transform: 'translate(3%, 4%) scale(1.04)' },
          '50%':  { transform: 'translate(5%, 2%) scale(0.98)' },
          '75%':  { transform: 'translate(2%, 6%) scale(1.02)' },
          '100%': { transform: 'translate(0, 0)   scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(91,79,219,0.10)' },
          '50%':      { boxShadow: '0 0 40px rgba(91,79,219,0.22)' },
        },
        'ticker-scroll': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'ring-expand': {
          '0%':   { transform: 'scale(1)',   opacity: '0.6' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'gradient-x': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
        'word-up': {
          from: { transform: 'translateY(110%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'hero-in': {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'shine-sweep': {
          '0%':   { transform: 'translateX(-100%) skewX(-20deg)' },
          '100%': { transform: 'translateX(220%)  skewX(-20deg)' },
        },
        'signal-flow': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },

      animation: {
        'fade-up':         'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-down':       'fade-down 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in':         'fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in':        'scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        float:             'float 6s ease-in-out infinite',
        'float-slow':      'float-slow 8s ease-in-out infinite',
        shimmer:           'shimmer 3s linear infinite',
        'gradient-shift':  'gradient-shift 8s ease infinite',
        morph:             'morph 8s ease-in-out infinite',
        'bubble-pop':      'bubble-pop 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        'card-flip':       'card-flip 0.5s ease-in-out',
        'neural-pulse':    'neural-pulse 1.2s ease-out infinite',
        'page-unfold':     'page-unfold 0.5s cubic-bezier(0.19,1,0.22,1)',
        'bar-rise':        'bar-rise 0.6s cubic-bezier(0.22,1,0.36,1)',
        'bell-ring':       'bell-ring 0.8s ease-in-out',
        'spotlight-ripple':'spotlight-ripple 0.6s ease-out',
        'send-whoosh':     'send-whoosh 0.7s cubic-bezier(0.22,1,0.36,1)',
        'cell-bloom':      'cell-bloom 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-deck':      'slide-deck 0.4s cubic-bezier(0.22,1,0.36,1)',
        'orb-drift':       'orb-drift 14s ease-in-out infinite',
        'glow-pulse':      'glow-pulse 3s ease-in-out infinite',
        'ticker-scroll':   'ticker-scroll 30s linear infinite',
        'ring-expand':     'ring-expand 1.6s ease-out infinite',
        'spin-slow':       'spin-slow 16s linear infinite',
        'gradient-x':      'gradient-x 4s ease infinite',
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};
