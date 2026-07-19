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
        // — Semantic layer — mapped 1:1 onto the Home design-lock palette
        //   (paper/olive/ember/tanline below). Values are shared, never new.
        //   Every inner screen inherits the Home look through these tokens. —
        bg: {
          // cream paper canvas (= paper.page)
          DEFAULT: '#F3E9DC',
          // white elevated cards on the cream field (reference style)
          elevated: '#FFFFFF',
          card: '#FFFFFF',
          // subtle in-family tint for chips/hover (= paper.panel)
          accent: '#F6EFE6',
          // optional warm accent band — reserved
          warm: '#FFDCB5',
        },
        border: {
          // hairlines (= tanline)
          DEFAULT: '#DCCDB2',
          subtle: '#ECE4D2',
          // strong tan (= tanline.contour)
          strong: '#C9A56B',
        },
        fg: {
          // olive ink (= olive.ink / soft / muted)
          DEFAULT: '#38432E',
          muted: '#4A5240',
          dim: '#8A8873',
        },
        accent: {
          // Orange is action/focus ONLY (= ember). Goes from DEFAULT
          // LIGHTER — never darker.
          DEFAULT: '#D97E2B',
          // hover state (= ember.hi)
          hover: '#E08A38',
          // softest emphasis tint (= ember.soft); token keeps the legacy
          // `deep` name for backwards compatibility with existing classNames.
          deep: '#D69051',
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
        // — Landing redesign palette (design/design-spec.md, sampled from design/mockup.png) —
        // Additive namespaces only; existing pages keep bg/fg/accent/brand untouched.
        paper: {
          page: '#F3E9DC',
          card: '#F8F2E7',
          panel: '#F6EFE6',
          bright: '#FDFBF3',
        },
        olive: {
          ink: '#38432E',
          soft: '#4A5240',
          muted: '#8A8873',
          ring: '#A3A832',
        },
        ember: {
          DEFAULT: '#D97E2B',
          hi: '#E08A38',
          deep: '#C96714',
          soft: '#D69051',
        },
        pine: {
          DEFAULT: '#2E3826',
          hi: '#374133',
          lo: '#283223',
        },
        tanline: {
          DEFAULT: '#DCCDB2',
          badge: '#8A6F4D',
          contour: '#C9A56B',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(235, 158, 72, 0.45)',
        'glow-brand': '0 0 40px -10px rgba(116, 156, 117, 0.4)',
        'glow-cool': '0 0 40px -10px rgba(91, 157, 217, 0.4)',
        // = card-soft — the Home warm soft shadow becomes the site default.
        elevated: '0 6px 18px rgba(90, 70, 40, 0.07)',
        // "דף על שולחן מפות" — קו דק קשיח + צל רך רחוק (שפת V2)
        paper:
          '0 1px 0 rgba(91, 124, 92, 0.10), 0 14px 28px -18px rgba(58, 58, 58, 0.30)',
        // — Landing redesign shadows (design/design-spec.md §6) —
        'card-soft': '0 6px 18px rgba(90, 70, 40, 0.07)',
        'panel-soft': '0 8px 24px rgba(90, 70, 40, 0.06)',
        'pine-card': '0 10px 28px rgba(40, 50, 35, 0.25)',
        'cta-ember': '0 6px 16px rgba(201, 103, 20, 0.30)',
        'pill-soft': '0 4px 12px rgba(90, 70, 40, 0.08)',
      },
      backgroundImage: {
        // soft sage grid that reads on the cream page
        'grid-pattern':
          'linear-gradient(to right, rgba(91, 124, 92, 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(91, 124, 92, 0.10) 1px, transparent 1px)',
        // subtle warm wash at the top of sections — gives the cream page a sunlight gradient
        'topo-fade':
          'radial-gradient(ellipse at top, rgba(255, 220, 181, 0.35), transparent 65%)',
        // — Landing redesign gradients (design/design-spec.md §3) —
        'cta-ember': 'linear-gradient(to bottom, #E08A38, #C96714)',
        'pine-grad': 'linear-gradient(135deg, #374133, #283223)',
        'paper-grad': 'linear-gradient(to bottom, #F4E9DC, #F0E5D6)',
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
