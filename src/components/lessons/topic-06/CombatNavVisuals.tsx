'use client';
/**
 * CombatNavVisuals — copy-free illustration kit for CombatNavScene's
 * "הסבר חזותי" board.
 *
 *   - Papercut primitives (tile slab, hills, houses, pines, cover objects)
 *     drawn in the approved illustration palette (design-spec §3).
 *   - One marker language shared by all three technique diagrams:
 *       A (start)  = blue dot        B (target) = red dot + ring
 *       route      = orange + chevrons, the force = white/blue "puck"
 *   - A tiny timeline engine: each diagram is driven by ONE motion value `t`
 *     (seconds). Positions / path draws are pure functions of `t`, so the
 *     learner sees one cause→effect story per technique. Under
 *     `prefers-reduced-motion` `t` jumps straight to the end state.
 *   - `LegendGlyph` mirrors the marks exactly, so the מקרא reads 1:1.
 *
 * All Hebrew labels live in CombatNavScene.tsx (the copy stays in one place).
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  animate,
  easeInOut,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';

/* ── Palette ─────────────────────────────────────────────────────────── */
/** Illustration-only hexes (design-spec §3 "Illustration palette"). */
export const PAPER = {
  cream: '#E8DCC4',
  rim: '#C9B892',
  g1: '#8A9163',
  g2: '#6E7A4E',
  g3: '#55613C',
} as const;

/** White halo that keeps SVG labels legible on any fill (VISUAL_IDENTITY). */
export const HALO = {
  paintOrder: 'stroke',
  stroke: '#ffffff',
  strokeWidth: 0.9,
  strokeLinejoin: 'round',
} as const;

/** Small filled arrowhead, tip at +x; rotate to point along travel. */
export const ARROW = '-1.2,-1.3 1.8,0 -1.2,1.3';

export type Pt = { x: number; y: number };

export const angleDeg = (from: Pt, to: Pt) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
export const lerpPt = (a: Pt, b: Pt, s: number): Pt => ({ x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s });

/** SVG-safe unique id (React ids contain characters `url(#…)` dislikes). */
export function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/* ── Timeline engine ─────────────────────────────────────────────────── */
/**
 * Drives `t` from 0 → `duration` seconds once `play` is true; replays when
 * `run` changes. Reduced motion → `t` sits at the end state (static diagram).
 */
export function useSequence(duration: number, play: boolean, run: number) {
  const reduce = !!useReducedMotion();
  const t = useMotionValue(reduce ? duration : 0);
  useEffect(() => {
    if (reduce) {
      t.jump(duration);
      return;
    }
    t.jump(0);
    if (!play) return;
    const controls = animate(t, duration, { duration, ease: 'linear' });
    return () => controls.stop();
  }, [t, duration, play, run, reduce]);
  return { t, reduce };
}

/** Number of `marks` (seconds) that `t` has passed — discrete story beats. */
export function useStep(t: MotionValue<number>, marks: readonly number[]) {
  const count = (v: number) => marks.reduce((n, m) => (v >= m ? n + 1 : n), 0);
  const [step, setStep] = useState(() => count(t.get()));
  useMotionValueEvent(t, 'change', (v) => {
    const s = count(v);
    setStep((prev) => (prev === s ? prev : s));
  });
  return step;
}

export type Key = readonly [time: number, value: number];
export type Ease = (v: number) => number;
export const linear: Ease = (v) => v;

/**
 * Piece-wise track: holds between equal values, eases each moving segment.
 * `ease` may be one easing for every segment or one per segment.
 */
export function useTrack(t: MotionValue<number>, keys: readonly Key[], ease: Ease | Ease[] = easeInOut) {
  return useTransform(
    t,
    keys.map((k) => k[0]),
    keys.map((k) => k[1]),
    { ease, clamp: true },
  );
}

/* ── Papercut primitives ─────────────────────────────────────────────── */
/**
 * A papercut terrain slab: soft cast shadow → extruded rim → top face.
 * `children` are clipped to the top face (fields, texture, haze).
 */
export function PaperTile({
  x = 4,
  y = 5,
  w = 92,
  h = 61,
  r = 3.2,
  depth = 2.2,
  fill = PAPER.cream,
  children,
}: {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  depth?: number;
  fill?: string;
  children?: ReactNode;
}) {
  const id = useSvgId('tile');
  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x={x} y={y} width={w} height={h} rx={r} />
        </clipPath>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="135%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <rect x={x + 1.5} y={y + depth + 1.6} width={w - 3} height={h} rx={r} className="fill-fg" fillOpacity={0.16} filter={`url(#${id}-soft)`} />
      <rect x={x} y={y + depth} width={w} height={h} rx={r} fill={PAPER.rim} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
      <g clipPath={`url(#${id}-clip)`}>{children}</g>
      <rect x={x + 0.2} y={y + 0.2} width={w - 0.4} height={h - 0.4} rx={r - 0.2} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.35} />
    </g>
  );
}

/** Faint topographic contour texture for a tile (tan, like the page canvas). */
export function ContourTexture({ paths }: { paths: string[] }) {
  return (
    <g fill="none" className="stroke-tanline-contour" strokeOpacity={0.45} strokeWidth={0.3}>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

/**
 * A papercut hilltop (כיפה): three stacked paper layers, each lifted and
 * casting a crisp offset shadow. `x,y` is the summit (checkpoint spot).
 */
export function PaperHill({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const layers = [
    { rx: 9.5, ry: 5.8, fill: PAPER.g1, lift: 0 },
    { rx: 6.6, ry: 4.0, fill: PAPER.g2, lift: 0.9 },
    { rx: 3.7, ry: 2.3, fill: PAPER.g3, lift: 1.8 },
  ];
  const baseY = y + 1.8 * s;
  return (
    <g>
      {layers.map((l, i) => (
        <g key={i}>
          <ellipse cx={x + 0.45 * s} cy={baseY - l.lift * s + 0.8 * s} rx={l.rx * s} ry={l.ry * s} className="fill-fg" fillOpacity={i === 0 ? 0.14 : 0.2} />
          <ellipse cx={x} cy={baseY - l.lift * s} rx={l.rx * s} ry={l.ry * s} fill={l.fill} />
        </g>
      ))}
    </g>
  );
}

/** Top-down papercut house: a two-tone pitched roof with a crisp shadow. */
export function PaperHouse({ x, y, w = 3, h = 2.4 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x + 0.45} y={y + 0.6} width={w} height={h} rx={0.35} className="fill-fg" fillOpacity={0.24} />
      <rect x={x} y={y} width={w} height={h} rx={0.35} className="fill-tanline-badge" />
      <path d={`M${x} ${y + h / 2} H${x + w} V${y + h - 0.35} Q${x + w} ${y + h} ${x + w - 0.35} ${y + h} H${x + 0.35} Q${x} ${y + h} ${x} ${y + h - 0.35} Z`} className="fill-fg" fillOpacity={0.28} />
    </g>
  );
}

/** Standing papercut pine (diorama style) with a ground shadow. */
export function PaperPine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      <ellipse cx={x + 0.6 * s} cy={y + 2.1 * s} rx={2.6 * s} ry={0.8 * s} className="fill-fg" fillOpacity={0.22} />
      <rect x={x - 0.45 * s} y={y - 0.2 * s} width={0.9 * s} height={2.4 * s} className="fill-tanline-badge" />
      <polygon points={`${x - 2.4 * s},${y + 0.7 * s} ${x + 2.4 * s},${y + 0.7 * s} ${x},${y - 3 * s}`} fill={PAPER.g2} />
      <polygon points={`${x},${y + 0.7 * s} ${x + 2.4 * s},${y + 0.7 * s} ${x},${y - 3 * s}`} fill={PAPER.g3} />
      <polygon points={`${x - 1.7 * s},${y - 1.3 * s} ${x + 1.7 * s},${y - 1.3 * s} ${x},${y - 4.7 * s}`} fill={PAPER.g2} />
      <polygon points={`${x},${y - 1.3 * s} ${x + 1.7 * s},${y - 1.3 * s} ${x},${y - 4.7 * s}`} fill={PAPER.g3} />
    </g>
  );
}

/** Cover object in open ground: a rock… */
export function PaperRock({ x, y, s = 1.35 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
      <ellipse cx={x + 0.4} cy={y + 0.7} rx={2.1} ry={1.2} className="fill-fg" fillOpacity={0.2} />
      <path d={`M${x - 2} ${y + 0.4} Q${x - 1.6} ${y - 1.3} ${x - 0.2} ${y - 1.4} Q${x + 1.7} ${y - 1.2} ${x + 2} ${y + 0.4} Z`} fill={PAPER.rim} />
      <path d={`M${x - 0.2} ${y - 1.4} Q${x + 1.7} ${y - 1.2} ${x + 2} ${y + 0.4} L${x + 0.3} ${y + 0.4} Z`} className="fill-tanline-badge" fillOpacity={0.55} />
    </g>
  );
}

/** …or a bush. */
export function PaperBush({ x, y, s = 1.35 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
      <ellipse cx={x + 0.5} cy={y + 0.9} rx={2.3} ry={1} className="fill-fg" fillOpacity={0.2} />
      <circle cx={x - 1} cy={y} r={1.3} fill={PAPER.g2} />
      <circle cx={x + 1} cy={y} r={1.3} fill={PAPER.g2} />
      <circle cx={x} cy={y - 0.9} r={1.4} fill={PAPER.g1} />
    </g>
  );
}

/* ── Marker language ─────────────────────────────────────────────────── */
export function StartDot({ x, y }: Pt) {
  return <circle cx={x} cy={y} r={1.8} className="fill-accent-cool" stroke="#ffffff" strokeWidth={0.5} />;
}

/** Target (B): red dot inside a red ring; `pulse` plays a one-shot ripple. */
export function TargetMark({ x, y, pulse = false }: Pt & { pulse?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.3} fill="#ffffff" fillOpacity={0.55} className="stroke-accent-hot" strokeWidth={0.5} />
      <circle cx={x} cy={y} r={1.8} className="fill-accent-hot" stroke="#ffffff" strokeWidth={0.5} />
      {pulse && (
        <motion.circle
          cx={x}
          cy={y}
          r={3.3}
          fill="none"
          className="stroke-accent-hot"
          strokeWidth={0.5}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 2.3, opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </g>
  );
}

export function Chevron({ at, rot, className = 'fill-accent', scale = 1 }: { at: Pt; rot: number; className?: string; scale?: number }) {
  return <polygon points={ARROW} className={className} transform={`translate(${at.x} ${at.y}) rotate(${rot}) scale(${scale})`} />;
}

/** Checkpoint (נקודת אימות): orange ring → pops to a filled ✓ once confirmed. */
export function Checkpoint({ x, y, confirmed, animated }: Pt & { confirmed: boolean; animated: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={2.1} fill="#ffffff" className="stroke-accent" strokeWidth={0.55} />
      {confirmed && (
        <motion.g
          initial={animated ? { scale: 0.2, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        >
          <circle cx={x} cy={y} r={2.1} className="fill-accent" />
          <path d={`M${x - 1} ${y + 0.05} L${x - 0.25} ${y + 0.8} L${x + 1.05} ${y - 0.75}`} fill="none" stroke="#ffffff" strokeWidth={0.55} strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      )}
    </g>
  );
}

/** The force / navigator: a white puck with a blue core (friendly unit). */
export function UnitPuck({ x, y, r = 1.8 }: { x: MotionValue<number>; y: MotionValue<number>; r?: number }) {
  return (
    <motion.g style={{ x, y }}>
      <ellipse cx={0.35} cy={0.9} rx={r} ry={r * 0.6} className="fill-fg" fillOpacity={0.22} />
      <circle r={r} fill="#ffffff" className="stroke-accent-cool" strokeWidth={0.6} />
      <circle r={r * 0.45} className="fill-accent-cool" />
    </motion.g>
  );
}

/** A puck that follows keyframed x/y tracks (one hook set per unit). */
export function TrackedPuck({ t, xs, ys, ease, r }: { t: MotionValue<number>; xs: readonly Key[]; ys: readonly Key[]; ease?: Ease | Ease[]; r?: number }) {
  const x = useTrack(t, xs, ease);
  const y = useTrack(t, ys, ease);
  return <UnitPuck x={x} y={y} r={r} />;
}

/* ── Legend glyphs (mirror the diagram marks 1:1) ────────────────────── */
export type GlyphKind =
  | 'hill'
  | 'village'
  | 'route'
  | 'checkpoint'
  | 'start'
  | 'target'
  | 'bearing'
  | 'distance'
  | 'unit'
  | 'storm'
  | 'open'
  | 'forest';

export function LegendGlyph({ kind }: { kind: GlyphKind }) {
  return (
    <svg viewBox="0 0 20 12" className="h-3.5 w-6 shrink-0 overflow-visible" aria-hidden>
      {kind === 'hill' && (
        <g>
          <ellipse cx="10" cy="7.2" rx="8" ry="4.2" fill={PAPER.g1} />
          <ellipse cx="10" cy="6.2" rx="5.4" ry="2.9" fill={PAPER.g2} />
          <ellipse cx="10" cy="5.3" rx="2.8" ry="1.6" fill={PAPER.g3} />
        </g>
      )}
      {kind === 'village' && (
        <g>
          <rect x="3.6" y="3.4" width="5.4" height="4.2" rx="0.6" className="fill-fg" fillOpacity={0.22} />
          <rect x="3" y="2.8" width="5.4" height="4.2" rx="0.6" className="fill-tanline-badge" />
          <rect x="11.6" y="5.6" width="5.4" height="4.2" rx="0.6" className="fill-fg" fillOpacity={0.22} />
          <rect x="11" y="5" width="5.4" height="4.2" rx="0.6" className="fill-tanline-badge" />
        </g>
      )}
      {kind === 'route' && (
        <g>
          <line x1="1.5" y1="6" x2="18" y2="6" className="stroke-accent" strokeWidth="1.8" strokeLinecap="round" />
          <polygon points="-1.6,-2 2.4,0 -1.6,2" className="fill-accent" stroke="#ffffff" strokeWidth="0.4" transform="translate(8.5 6) rotate(180)" />
        </g>
      )}
      {kind === 'checkpoint' && (
        <g>
          <circle cx="10" cy="6" r="4.4" className="fill-accent" />
          <path d="M7.9 6.1 L9.4 7.6 L12.2 4.5" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {kind === 'start' && <circle cx="10" cy="6" r="3.6" className="fill-accent-cool" stroke="#ffffff" strokeWidth="1" />}
      {kind === 'target' && (
        <g>
          <circle cx="10" cy="6" r="5.2" fill="none" className="stroke-accent-hot" strokeWidth="1" />
          <circle cx="10" cy="6" r="2.8" className="fill-accent-hot" />
        </g>
      )}
      {kind === 'bearing' && (
        <line x1="1.5" y1="6" x2="18.5" y2="6" className="stroke-accent" strokeWidth="1.6" strokeDasharray="3 2" strokeLinecap="round" />
      )}
      {kind === 'distance' && (
        <g className="stroke-accent" strokeLinecap="round">
          <line x1="1.5" y1="6" x2="18.5" y2="6" strokeWidth="1.8" />
          {[4.5, 10, 15.5].map((x) => (
            <line key={x} x1={x} y1="3" x2={x} y2="9" strokeWidth="1.1" />
          ))}
        </g>
      )}
      {kind === 'unit' && (
        <g>
          <circle cx="10" cy="6" r="4.4" fill="#ffffff" className="stroke-accent-cool" strokeWidth="1.3" />
          <circle cx="10" cy="6" r="2" className="fill-accent-cool" />
        </g>
      )}
      {kind === 'storm' && (
        <g>
          <rect x="1" y="1" width="18" height="10" rx="2" fill={PAPER.cream} />
          <rect x="1" y="1" width="18" height="10" rx="2" className="fill-tanline-contour" fillOpacity={0.62} />
          <g stroke="#ffffff" strokeOpacity={0.85} strokeWidth="1.1" strokeLinecap="round">
            <line x1="3" y1="4" x2="11" y2="3" />
            <line x1="7" y1="7.5" x2="17" y2="6.2" />
          </g>
        </g>
      )}
      {kind === 'open' && (
        <g>
          <rect x="1" y="1" width="18" height="10" rx="2" fill={PAPER.cream} stroke={PAPER.rim} strokeWidth="0.8" />
          <ellipse cx="13" cy="7" rx="2.4" ry="1.5" fill={PAPER.rim} />
        </g>
      )}
      {kind === 'forest' && (
        <g>
          <rect x="1" y="1" width="18" height="10" rx="2" fill={PAPER.g1} />
          <polygon points="6.5,9.5 10,2.2 13.5,9.5" fill={PAPER.g3} />
        </g>
      )}
    </svg>
  );
}
