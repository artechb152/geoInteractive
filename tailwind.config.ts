import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-rubik)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // — Brand palette (see docs/palette.md) —
        bg: {
          DEFAULT: '#FFFBF7',
          elevated: '#FFFFFF',
          card: '#FFFFFF',
          // subtle warm-tinted hover background
          accent: '#F5EDDE',
          // optional warm accent band — was the "site bg" originally, now reserved
          warm: '#FFDCB5',
        },
        border: {
          DEFAULT: '#ECE4D2',
          subtle: '#F4EEDE',
          strong: '#C5B695',
        },
        fg: {
          DEFAULT: '#000000',
          muted: '#3a3a3a',
          dim: '#6a6a6a',
        },
        accent: {
          // Site-wide rule: orange goes from DEFAULT (darkest) only
          // LIGHTER — never darker. DEFAULT carries h1, primary buttons,
          // and every coloured label that needs to read on cream.
          DEFAULT: '#EB9E48',
          // ~15% lighter wash — button-hover state and h2 emphasis.
          hover: '#F2B872',
          // Lightest tint — h3 emphasis. Token still named `deep` for
          // backwards compatibility with existing classNames; the value
          // is the palest orange in the system.
          deep: '#F7CFA0',
          hot: '#e2553a',
          cool: '#5b9dd9',
          intel: '#9d6bd9',
        },
        brand: {
          DEFAULT: '#749C75',
          dark: '#5B7C5C',
        },
        // — Legacy / illustration tokens (kept for terrain visualisations) —
        terrain: {
          sand: '#c2a26b',
          olive: '#7a8a3f',
          ridge: '#5a6b4a',
          sky: '#3d6b8e',
          steel: '#4a5663',
        },
        status: {
          ok: '#4ade80',
          warn: '#fbbf24',
          danger: '#ef4444',
          info: '#60a5fa',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(235, 158, 72, 0.45)',
        'glow-brand': '0 0 40px -10px rgba(116, 156, 117, 0.4)',
        'glow-cool': '0 0 40px -10px rgba(91, 157, 217, 0.4)',
        elevated:
          '0 10px 30px -12px rgba(91, 124, 92, 0.18), 0 4px 10px -4px rgba(91, 124, 92, 0.10)',
        // "דף על שולחן מפות" — קו דק קשיח + צל רך רחוק (שפת V2)
        paper:
          '0 1px 0 rgba(91, 124, 92, 0.10), 0 14px 28px -18px rgba(58, 58, 58, 0.30)',
      },
      backgroundImage: {
        // soft sage grid that reads on the cream page
        'grid-pattern':
          'linear-gradient(to right, rgba(91, 124, 92, 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(91, 124, 92, 0.10) 1px, transparent 1px)',
        // subtle warm wash at the top of sections — gives the cream page a sunlight gradient
        'topo-fade':
          'radial-gradient(ellipse at top, rgba(255, 220, 181, 0.35), transparent 65%)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'accordion-up': 'accordion-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-rtl')],
};

export default config;
