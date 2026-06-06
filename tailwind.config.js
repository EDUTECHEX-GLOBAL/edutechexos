/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        /* ── Core surfaces ───────────────────────────── */
        background:      '#F2F0EC',
        foreground:      '#1E2636',
        surface:         '#ffffff',
        'surface-muted': '#FAF8F5',

        /* ── Text shades ─────────────────────────────── */
        ink:         '#4A5578',
        'ink-light': '#7C859E',

        /* ── Primary — Icy Blue ──────────────────────── */
        primary: {
          DEFAULT:    '#3E4A89',
          foreground: '#ffffff',
          light:      '#9BA6D3',
          dark:       '#2A3568',
        },

        /* ── Secondary — Pure Frost ──────────────────── */
        secondary: {
          DEFAULT:    '#FAF8F5',
          foreground: '#1E2636',
        },

        /* ── Accent — kept for feature-card variety ──── */
        accent: {
          DEFAULT:    '#4f46e5',
          foreground: '#ffffff',
          light:      '#6366f1',
          dark:       '#3730a3',
        },

        /* ── Lavender (keep for existing uses) ───────── */
        lavender: {
          DEFAULT: '#a78bfa',
          light:   '#c4b5fd',
          dark:    '#7c3aed',
          surface: '#f3f0ff',
        },

        /* ── Blue scale ──────────────────────────────── */
        green: {
          DEFAULT: '#3E4A89',
          light:   '#9BA6D3',
          dark:    '#2A3568',
          surface: '#EFF6FF',
          pale:    '#F2F0EC',
        },

        /* ── Muted ───────────────────────────────────── */
        muted: {
          DEFAULT:    '#FAF8F5',
          foreground: '#4A5578',
        },

        /* ── Dark — Deep Slate ───────────────────────── */
        dark: {
          DEFAULT:    '#191E2F',
          foreground: '#FAF8F5',
          muted:      '#A0AEC0',
          border:     '#191E2F',
          surface:    '#191E2F',
        },

        /* ── Card ────────────────────────────────────── */
        card: {
          DEFAULT:    '#ffffff',
          foreground: '#1E2636',
          border:     '#E0DDE8',
        },

        /* ── Structural ──────────────────────────────── */
        border: '#E0DDE8',
        input:  '#E0DDE8',
        ring:   '#3E4A89',
      },

      borderRadius: {
        lg: '1rem', md: '0.75rem', sm: '0.5rem',
        xl: '1.25rem', '2xl': '1.5rem',
      },

      fontFamily: {
        sans:    ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Cabinet Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },

      fontSize: {
        'hero-xl':  ['clamp(3.2rem, 8vw, 7rem)',  { lineHeight: '1.0',  letterSpacing: '-0.04em', fontWeight: '900' }],
        'hero-2xl': ['clamp(4rem, 10vw, 9rem)',    { lineHeight: '0.95', letterSpacing: '-0.05em', fontWeight: '900' }],
        'hero-md':  ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
      },

      boxShadow: {
        glass:       '0 8px 32px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'glass-lg':  '0 16px 48px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.02)',
        glow:        '0 0 40px -8px rgba(62,74,137,0.25)',
        'glow-lg':   '0 0 60px -12px rgba(62,74,137,0.35)',
        soft:        '0 4px 16px rgba(0,0,0,0.04)',
        card:        '0 2px 8px rgba(0,0,0,0.04), 0 16px 32px -8px rgba(0,0,0,0.06)',
        'card-hover':'0 4px 16px rgba(0,0,0,0.06), 0 24px 48px -8px rgba(62,74,137,0.10)',
        dark:        '0 4px 24px rgba(0,0,0,0.18), 0 16px 48px rgba(0,0,0,0.10)',
      },

      keyframes: {
        'fade-up':   { from: { opacity: '0', transform: 'translateY(24px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-down': { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in':   { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in':  { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        float:       { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        'float-slow':{ '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' }, '50%': { transform: 'translateY(-20px) rotate(2deg)' } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(62,74,137,0.15), 0 0 40px rgba(62,74,137,0.06)' },
          '50%':      { boxShadow: '0 0 30px rgba(62,74,137,0.28), 0 0 60px rgba(62,74,137,0.12)' },
        },
        'neon-pulse': {
          '0%, 100%': { opacity: '0.4', filter: 'brightness(1)' },
          '50%':      { opacity: '0.8', filter: 'brightness(1.3)' },
        },
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
        'aurora-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)',        opacity: '0.35' },
          '25%':      { transform: 'translate(10%, -10%) scale(1.1)', opacity: '0.45' },
          '50%':      { transform: 'translate(-5%, 15%) scale(0.95)', opacity: '0.30' },
          '75%':      { transform: 'translate(8%, 5%) scale(1.05)',   opacity: '0.40' },
        },
        'aurora-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)',         opacity: '0.25' },
          '25%':      { transform: 'translate(-8%, 12%) scale(1.15)',  opacity: '0.35' },
          '50%':      { transform: 'translate(12%, -8%) scale(0.9)',   opacity: '0.20' },
          '75%':      { transform: 'translate(-5%, 10%) scale(1.1)',   opacity: '0.30' },
        },
      },

      animation: {
        'fade-up':       'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-down':     'fade-down 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in':       'fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in':      'scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        float:           'float 6s ease-in-out infinite',
        'float-slow':    'float-slow 8s ease-in-out infinite',
        shimmer:         'shimmer 3s linear infinite',
        'glow-pulse':    'glow-pulse 3s ease-in-out infinite',
        'neon-pulse':    'neon-pulse 2s ease-in-out infinite',
        'gradient-shift':'gradient-shift 8s ease infinite',
        morph:           'morph 8s ease-in-out infinite',
        'aurora-1':      'aurora-1 20s ease-in-out infinite',
        'aurora-2':      'aurora-2 25s ease-in-out infinite',
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
