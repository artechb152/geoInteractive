'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Mountain, ScanEye, Crosshair, ArrowLeft } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { Reveal, stagger } from './Reveal';
import { cn } from '@/lib/utils';

type Tone = 'gold' | 'cool' | 'intel';

type Feature = {
  tone: Tone;
  badge: string;
  title: string;
  description: string;
  points: string[];
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  Illustration: ComponentType<{ className?: string }>;
};

const FEATURES: Feature[] = [
  {
    tone: 'gold',
    badge: 'שטח · TERRAIN',
    title: 'סימולציות שטח אינטראקטיביות',
    description:
      'נסיון יד-ראשונה עם תצוגות תלת-ממדיות, ניתוח קוו-ראייה, שיפועים והשפעת הטופוגרפיה על תמרון.',
    points: ['ניתוח Intervisibility', 'מסלולי תנועה ושטחי כיסוי', 'מודלים של הסוואה והסתרה'],
    Icon: Mountain,
    Illustration: ContourIllustration,
  },
  {
    tone: 'cool',
    badge: 'GEOINT · IMAGERY',
    title: 'ניתוח חישה מרחוק ו-GEOINT',
    description:
      'איך לקרוא תצלומי לוויין, להבחין בין מטרה לדמה, ולשלב מודיעין רב-מקורי בתמונת מצב אחת.',
    points: ['פענוח תמונה לוויינית', 'אינדיקטורים והטעיה', 'שכבות מידע ו-fusion'],
    Icon: ScanEye,
    Illustration: GridIllustration,
  },
  {
    tone: 'intel',
    badge: 'OPS · APPLICATION',
    title: 'יישום מבצעי וקבלת החלטות',
    description:
      'חיבור הניתוח הגיאוגרפי לסיטואציה מבצעית — מתכנון מסלול ועד הערכת איום וניצול מודיעין.',
    points: ['העברה מניתוח לפעולה', 'הערכת איום וסדר עדיפויות', 'תרגולי תרחיש מקצה לקצה'],
    Icon: Crosshair,
    Illustration: ReticleIllustration,
  },
];

const toneStyles: Record<
  Tone,
  {
    chip: string;
    iconWrap: string;
    iconColor: string;
    hoverBorder: string;
    hoverShadow: string;
    dot: string;
    bullet: string;
    arrow: string;
    glow: string;
  }
> = {
  // Pillar 1 — primary orange (accent)
  gold: {
    chip: 'border-accent/40 bg-accent/10 text-accent-hover',
    iconWrap: 'bg-accent/10 border-accent/30',
    iconColor: 'text-accent-hover',
    hoverBorder: 'group-hover:border-accent/60',
    hoverShadow: 'group-hover:shadow-glow',
    dot: 'bg-accent',
    bullet: 'text-accent-hover',
    arrow: 'text-accent-hover',
    glow: 'from-accent/15',
  },
  // Pillar 2 — brand sage
  cool: {
    chip: 'border-brand/40 bg-brand/10 text-brand-dark',
    iconWrap: 'bg-brand/10 border-brand/30',
    iconColor: 'text-brand-dark',
    hoverBorder: 'group-hover:border-brand/60',
    hoverShadow: 'group-hover:shadow-glow-brand',
    dot: 'bg-brand',
    bullet: 'text-brand-dark',
    arrow: 'text-brand-dark',
    glow: 'from-brand/15',
  },
  // Pillar 3 — brand dark / black emphasis pair
  intel: {
    chip: 'border-brand-dark/40 bg-brand-dark/10 text-brand-dark',
    iconWrap: 'bg-brand-dark/10 border-brand-dark/30',
    iconColor: 'text-brand-dark',
    hoverBorder: 'group-hover:border-fg/40',
    hoverShadow: 'group-hover:[box-shadow:0_0_40px_-10px_rgba(91,124,92,0.45)]',
    dot: 'bg-brand-dark',
    bullet: 'text-brand-dark',
    arrow: 'text-brand-dark',
    glow: 'from-brand-dark/15',
  },
};

export function Features() {
  const reduce = useReducedMotion();

  return (
    <section id="features" aria-labelledby="features-title" className="relative py-10 md:py-14">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5 text-sm md:text-[15px] font-display font-semibold tracking-wider text-fg-muted mb-5">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            02 · מה לומדים
          </span>
          <h2
            id="features-title"
            className="font-display font-bold tracking-tight text-balance leading-[1.1] text-[clamp(1.5rem,3vw,2.25rem)]"
          >
            שלוש דרכים בהן הקורס משנה <br className="hidden sm:block" />
            <span className="gradient-text">איך אתה קורא את השטח</span>
          </h2>
          <p className="mt-3 text-sm md:text-base text-fg-muted leading-relaxed text-pretty">
            לא קורס תיאורטי. כל ציר משלב לימוד, סימולציה ותרגול אינטראקטיבי —
            מהבסיס הגיאוגרפי, דרך פענוח מודיעיני, ועד יישום מבצעי בשטח.
          </p>
        </Reveal>

        <motion.ul
          role="list"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15% 0px -10% 0px' }}
          variants={reduce ? undefined : stagger.container}
          className="mt-8 grid gap-3.5 md:gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f, i) => {
            const s = toneStyles[f.tone];
            return (
              <motion.li
                key={f.title}
                variants={reduce ? undefined : stagger.item}
                className="group relative"
              >
                <div
                  className={cn(
                    'surface-elevated relative h-full overflow-hidden p-4 md:p-5',
                    'transition-all duration-300 ease-snap',
                    'group-hover:-translate-y-1',
                    s.hoverBorder,
                    s.hoverShadow,
                  )}
                >
                  <div
                    aria-hidden
                    className={cn(
                      'absolute inset-x-0 -top-px h-24 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                      'bg-gradient-to-b to-transparent',
                      s.glow,
                    )}
                  />

                  <div className="relative aspect-[16/8] mb-6 overflow-hidden rounded-xl border border-border-subtle bg-bg">
                    <f.Illustration className="absolute inset-0 size-full" />
                  </div>

                  <div className="relative flex items-start gap-3 mb-3">
                    <span
                      className={cn(
                        'grid place-items-center size-10 shrink-0 rounded-xl border',
                        s.iconWrap,
                      )}
                    >
                      <f.Icon className={cn('size-5', s.iconColor)} aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={cn('chip mb-1.5 font-mono text-[10px] tracking-wider', s.chip)}>
                        <span className={cn('size-1 rounded-full', s.dot)} aria-hidden />
                        {f.badge}
                      </span>
                      <h3 className="font-display font-semibold text-lg leading-snug text-balance">
                        {f.title}
                      </h3>
                    </div>
                  </div>

                  <p className="relative text-sm text-fg-muted leading-relaxed text-pretty">
                    {f.description}
                  </p>

                  <ul className="relative mt-5 space-y-2 border-t border-border-subtle pt-4">
                    {f.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-2 text-[13px] text-fg-muted"
                      >
                        <span
                          aria-hidden
                          className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', s.dot)}
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="relative mt-6 pt-1 flex items-center justify-between text-xs text-fg-dim">
                    <span className="font-mono">PILLAR · {String(i + 1).padStart(2, '0')}</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                        s.arrow,
                      )}
                    >
                      פירוט
                      <ArrowLeft className="size-3.5" aria-hidden />
                    </span>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}

function ContourIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 160"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="contour-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#EB9E48" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#749C75" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect width="320" height="160" fill="transparent" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M -20 ${130 - i * 12} C 60 ${90 - i * 14}, 140 ${60 - i * 10}, 220 ${80 - i * 12} S 320 ${110 - i * 8}, 340 ${120 - i * 10}`}
          fill="none"
          stroke="url(#contour-grad)"
          strokeWidth={1 + i * 0.2}
          opacity={0.45 + i * 0.08}
          strokeLinecap="round"
        />
      ))}
      <circle cx="220" cy="68" r="3" fill="#EB9E48" />
      <circle cx="220" cy="68" r="10" fill="none" stroke="#EB9E48" strokeOpacity="0.55" />
    </svg>
  );
}

function GridIllustration({ className }: { className?: string }) {
  const cells = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 12; c++) {
      const i = r * 12 + c;
      const pseudo = (i * 1103515245 + 12345) % 100;
      const opacity = 0.06 + (pseudo / 100) * 0.35;
      const highlight = pseudo > 86;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * 26 + 4}
          y={r * 24 + 6}
          width={22}
          height={20}
          rx={2}
          fill={highlight ? '#749C75' : '#749C75'}
          fillOpacity={highlight ? 0.55 : opacity}
          stroke="#749C75"
          strokeOpacity={highlight ? 0.7 : 0.12}
          strokeWidth={0.5}
        />,
      );
    }
  }
  return (
    <svg
      viewBox="0 0 320 160"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <rect width="320" height="160" fill="transparent" />
      {cells}
      <g transform="translate(170 70)">
        <rect
          x="-32"
          y="-22"
          width="64"
          height="44"
          rx="3"
          fill="none"
          stroke="#749C75"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <text
          x="0"
          y="-28"
          fontFamily="var(--font-mono), monospace"
          fontSize="9"
          fill="#749C75"
          textAnchor="middle"
          letterSpacing="1"
        >
          TARGET·LOCKED
        </text>
      </g>
    </svg>
  );
}

function ReticleIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 160"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <pattern id="ret-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#5B7C5C" strokeOpacity="0.18" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="ret-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5B7C5C" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5B7C5C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="160" fill="url(#ret-grid)" />
      <g transform="translate(160 80)">
        <circle r="64" fill="url(#ret-glow)" />
        <circle r="52" fill="none" stroke="#5B7C5C" strokeOpacity="0.4" strokeWidth="1" />
        <circle r="36" fill="none" stroke="#5B7C5C" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="2 4" />
        <circle r="18" fill="none" stroke="#5B7C5C" strokeOpacity="0.7" strokeWidth="1" />
        <line x1="-62" y1="0" x2="-46" y2="0" stroke="#5B7C5C" strokeWidth="1.2" />
        <line x1="46" y1="0" x2="62" y2="0" stroke="#5B7C5C" strokeWidth="1.2" />
        <line x1="0" y1="-62" x2="0" y2="-46" stroke="#5B7C5C" strokeWidth="1.2" />
        <line x1="0" y1="46" x2="0" y2="62" stroke="#5B7C5C" strokeWidth="1.2" />
        <circle r="3" fill="#5B7C5C" />
      </g>
      <text
        x="14"
        y="20"
        fontFamily="var(--font-mono), monospace"
        fontSize="9"
        fill="#5B7C5C"
        opacity="0.7"
        letterSpacing="1.5"
      >
        OBJ·ALPHA
      </text>
      <text
        x="306"
        y="148"
        fontFamily="var(--font-mono), monospace"
        fontSize="9"
        fill="#5B7C5C"
        opacity="0.7"
        letterSpacing="1.5"
        textAnchor="end"
      >
        AOR·07
      </text>
    </svg>
  );
}
