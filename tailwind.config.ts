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
        bg: {
          DEFAULT: '#f6f8fb',
          elevated: '#ffffff',
          card: '#ffffff',
          accent: '#eef2f7',
        },
        border: {
          DEFAULT: '#d8dee7',
          subtle: '#e9edf2',
          strong: '#bcc4d0',
        },
        fg: {
          DEFAULT: '#101720',
          muted: '#4a5566',
          dim: '#6c7686',
        },
        terrain: {
          sand: '#c2a26b',
          olive: '#7a8a3f',
          ridge: '#5a6b4a',
          sky: '#3d6b8e',
          steel: '#4a5663',
        },
        accent: {
          DEFAULT: '#d4a72c',
          hot: '#e2553a',
          cool: '#5b9dd9',
          intel: '#9d6bd9',
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
        glow: '0 0 40px -10px rgba(212, 167, 44, 0.35)',
        'glow-cool': '0 0 40px -10px rgba(91, 157, 217, 0.4)',
        elevated: '0 10px 30px -12px rgba(15, 23, 42, 0.12), 0 4px 10px -4px rgba(15, 23, 42, 0.08)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(to right, rgba(58,68,82,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(58,68,82,0.15) 1px, transparent 1px)',
        'topo-fade':
          'radial-gradient(ellipse at top, rgba(212,167,44,0.08), transparent 60%)',
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
