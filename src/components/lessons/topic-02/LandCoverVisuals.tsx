'use client';

import { useId, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { VEGETATION_LADDER_RENDERS } from './vegetationLadderRenders.data';

/**
 * LandCoverVisuals — איורים משלימים לתת-הנושא „תכסית”:
 * סולם תצורות הצומח (מבט צד, רינדור ריאליסטי; גרסת ה-papercut בארכיון: VegetationLadderV1.tsx),
 * סמלילי מקור (טבעי/נטוע), וגליפים קטנים.
 * האיורים לא משוקפים ב-RTL; כל <text> עם textAnchor מפורש.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────── small UI glyphs (currentColor) ───────────────────────── */

type GlyphProps = { className?: string };
const glyphBase = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function CatGlyph({ cat, className }: GlyphProps & { cat: 'vegetation' | 'human' | 'infra' }) {
  return (
    <svg {...glyphBase} className={cn('w-4 h-4 shrink-0', className)}>
      {cat === 'vegetation' && (
        <>
          <path d="M8 14.5V9.5" />
          <path d="M8 9.5c-3 0-4.6-1.7-4.6-3.9C3.4 3.4 5.4 1.6 8 1.6s4.6 1.8 4.6 4C12.6 7.8 11 9.5 8 9.5Z" />
          <path d="M8 12l-2-1.6" />
        </>
      )}
      {cat === 'human' && (
        <>
          <path d="M2 7.5 8 2.5l6 5" />
          <path d="M3.6 6.3v7.9h8.8V6.3" />
          <path d="M6.8 14.2v-3.6h2.4v3.6" />
        </>
      )}
      {cat === 'infra' && (
        <>
          <path d="M5.2 14.5 8 1.8l2.8 12.7" />
          <path d="M3 5h10" />
          <path d="M4.2 9h7.6" />
          <path d="M6.2 9 9.4 5M9.8 9 6.6 5" strokeWidth={1} />
        </>
      )}
    </svg>
  );
}

export function SeasonGlyph({ season, className }: GlyphProps & { season: 'winter' | 'summer' }) {
  return (
    <svg {...glyphBase} className={cn('w-4 h-4 shrink-0', className)}>
      {season === 'summer' ? (
        <>
          <circle cx="8" cy="8" r="2.8" />
          <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
        </>
      ) : (
        <>
          <path d="M4.6 10.2h6.6a2.6 2.6 0 0 0 .3-5.2 3.6 3.6 0 0 0-6.9.6 2.3 2.3 0 0 0 0 4.6Z" />
          <path d="M5.6 12.4l-.6 1.6M8.4 12.4l-.6 1.6M11.2 12.4l-.6 1.6" />
        </>
      )}
    </svg>
  );
}

/* ───────────────────────── origin vignettes ───────────────────────── */

/**
 * Top-down crops of the same aerial world as the land-cover map (Blender,
 * scripts/blender/render_origin_vignettes.py; papercut originals in OriginVignettesV1.tsx).
 */
const VIGNETTE_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/origin-vignettes`;

function Vignette({ file, className }: GlyphProps & { file: string }) {
  return (
    <svg viewBox="0 0 88 60" aria-hidden className={cn('w-[88px] h-[60px] shrink-0', className)}>
      <image href={`${VIGNETTE_BASE}/${file}`} x={0} y={0} width={88} height={60} preserveAspectRatio="none" />
    </svg>
  );
}

/** Natural cover: irregular, lumpy crowns of mixed size — no rows, no edges. */
export function NaturalVignette({ className }: GlyphProps) {
  return <Vignette file="natural.webp" className={className} />;
}

/** Artificial cover: sharp parcel edge, straight rows, fixed spacing, identical crowns. */
export function PlantedVignette({ className }: GlyphProps) {
  return <Vignette file="planted.webp" className={className} />;
}

/* ───────────────────────── vegetation ladder (side view) ───────────────────────── */

const VB_W = 500;
const GROUND = 184;
const COL = 100;
/** Column centre for ladder index i — index 0 sits at the inline-start (right), like the label list. */
const cx = (i: number) => VB_W - COL / 2 - i * COL;

/** Schematic heights (map units above ground) — order matters more than scale. */
const LADDER_H = [16, 34, 70, 112, 164];
const SCALE_LINES = [
  { h: 34, label: 'חצי מטר' },
  { h: 70, label: '2 מטרים' },
  { h: 142, label: '5–6 מטרים' },
];

/**
 * The formations are a Blender render (scripts/blender/render_vegetation_ladder.py): one
 * camera locked to this viewBox, each formation standing on GROUND at its LADDER_H height,
 * one transparent pass per formation + the shadow it casts, and the cut slab of land.
 */
const ASSET_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/vegetation-ladder`;
type LadderRenderId = keyof typeof VEGETATION_LADDER_RENDERS;
const FORMATIONS = ['herbaceous', 'batha', 'garrigue', 'grove', 'planted'] as const;

function LadderRender({ id }: { id: LadderRenderId }) {
  const r = VEGETATION_LADDER_RENDERS[id];
  return (
    <image
      href={`${ASSET_BASE}/${r.file}`}
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      preserveAspectRatio="none"
      pointerEvents="none"
    />
  );
}

export type LadderItem = { label: string; height: string; description: string; planted?: boolean };

export function VegetationLadder({ items, legend }: { items: LadderItem[]; legend: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const uid = useId();
  const active = hover ?? focus ?? picked;
  const selected = active === null ? null : items[active];
  const pick = (i: number) => {
    setPicked(i);
    setFocus(null);
  };

  const grow: Variants = {
    hidden: { scaleY: 0.02, opacity: 0 },
    show: (i: number) => ({
      scaleY: 1,
      opacity: 1,
      transition: { delay: 0.1 + i * 0.12, duration: 0.6, ease: EASE },
    }),
  };
  const dimStyle = (i: number) => ({ opacity: active !== null && active !== i ? 0.4 : 1 });
  const DIM = 'transition-opacity duration-300 ease-snap motion-reduce:transition-none';

  return (
    <>
      <motion.svg
        viewBox={`0 0 ${VB_W} 206`}
        className="w-full h-auto block"
        aria-hidden
        initial={reduce ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
      >
        {/* height scale — the thresholds that define the formations */}
        {SCALE_LINES.map((s) => (
          <g key={s.h}>
            <line x1={0} y1={GROUND - s.h} x2={VB_W} y2={GROUND - s.h} stroke="#C9A56B" strokeOpacity={0.55} strokeWidth={0.9} strokeDasharray="3 4" />
            <text
              x={cx(0) + 18}
              y={GROUND - s.h - 5}
              textAnchor="middle"
              direction="rtl"
              fontSize={10.5}
              fontWeight={600}
              fill="#8A8873"
            >
              {s.label}
            </text>
          </g>
        ))}

        {/* planted frame — under the land, which hides its foot as the papercut strip did */}
        {items.map((v, i) =>
          v.planted ? (
            <rect
              key={v.label}
              x={cx(i) - 47}
              y={GROUND - LADDER_H[i] - 10}
              width={94}
              height={LADDER_H[i] + 14}
              rx={10}
              fill="#749C75"
              fillOpacity={0.1}
              stroke="#5B7C5C"
              strokeWidth={1.6}
              strokeDasharray="6 4"
              className={DIM}
              style={dimStyle(i)}
            />
          ) : null,
        )}

        {/* shared ground — the rendered slab: land behind the line, cut face below it */}
        <LadderRender id="land" />

        {items.map((v, i) => {
          const id = FORMATIONS[i];
          return (
            <g
              key={v.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => pick(i)}
              className={cn(DIM, 'cursor-pointer')}
              style={dimStyle(i)}
            >
              <rect x={cx(i) - COL / 2} y={0} width={COL} height={GROUND} fill="transparent" />
              <motion.g custom={i} variants={grow} style={{ originX: 0.5, originY: 1, transformBox: 'fill-box' }}>
                <LadderRender id={`shadow-${id}`} />
                <LadderRender id={id} />
              </motion.g>
            </g>
          );
        })}
      </motion.svg>

      <ul className="grid grid-cols-5 mt-2">
        {items.map((v, i) => (
          <li
            key={v.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="min-w-0"
          >
            <button
              type="button"
              aria-describedby={`${uid}-description-${i}`}
              aria-controls={`${uid}-explanation`}
              aria-pressed={picked === i}
              onClick={() => pick(i)}
              onFocus={() => setFocus(i)}
              onBlur={() => setFocus(null)}
              className={cn(
                'w-full text-center rounded-xl px-1 py-1.5 cursor-pointer transition-colors duration-200 motion-reduce:transition-none',
                active === i && 'bg-bg-accent',
              )}
            >
              <span className="block font-display font-bold text-sm text-fg">{v.label}</span>
              <span className="block text-[13px] text-fg-muted leading-snug mt-0.5">{v.height}</span>
            </button>
            <span id={`${uid}-description-${i}`} className="sr-only">{v.description}</span>
          </li>
        ))}
      </ul>
      <div id={`${uid}-explanation`} aria-live="polite" aria-atomic="true" className="mt-3 min-h-[112px] rounded-xl bg-bg-accent/60 p-4">
        <p className="text-base leading-relaxed text-black">
          {selected ? (
            <><strong className="font-display font-bold">{selected.label}</strong> — {selected.description}</>
          ) : (
            'עברו עם העכבר על תצורת צומח כדי לקרוא על מאפייני הזיהוי שלה. לחצו על הצמח או על שמו כדי להשאיר את ההסבר מוצג.'
          )}
        </p>
      </div>
      <p className="flex items-center gap-2 text-sm text-fg-muted leading-snug mt-3">
        <span aria-hidden className="inline-block w-5 h-3.5 rounded-md border-[1.5px] border-dashed border-brand-dark bg-brand/10 shrink-0" />
        {legend}
      </p>
    </>
  );
}
