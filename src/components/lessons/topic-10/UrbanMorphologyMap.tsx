'use client';
/**
 * UrbanMorphologyMap — aerial plans for UrbanMorphologyScene (10.1).
 *
 *   - Two street models, one per pattern, each drawn at its own scale (the
 *     scene's own numbers — an 800 m avenue vs. alleys under 8 m — cannot
 *     share one): GRID is a block grid (1 unit = 6.4 m), CASBAH is a network
 *     of winding alley centre-lines (1 unit = 1 m).
 *   - Line of sight is COMPUTED, not drawn: each model is rasterised into a
 *     free-space mask and the lit area is a visibility polygon cast from the
 *     selected force position (rays stop at the first wall). Every street
 *     cell outside that polygon is dead space. Threat markers switch between
 *     "seen" and "unseen" by the same ray test.
 *   - `EnfiladeDiagram` is a crop of the same GRID model (same blocks, same
 *     houses), so the rat-run route crosses the party walls drawn above.
 *   - Copy-free: every Hebrew label arrives from UrbanMorphologyScene.tsx.
 *     Only numbers / units (scale bars) are written here.
 *
 * Not mirrored for RTL — a map keeps its geometry; the force enters from the
 * west in both patterns.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useTransform } from 'framer-motion';
import { useSequence, useSvgId } from '@/components/lessons/topic-06/CombatNavVisuals';
import { Icon } from '@/components/Icon';

/* ── Model ───────────────────────────────────────────────────────────── */

export type UrbanPattern = 'grid' | 'casbah';
type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Alley = { pts: readonly (readonly [number, number])[]; w: number };

const VB_W = 160;
const VB_H = 90;

/** Illustration palette (SVG only). Threat red is distinct from the UI orange. */
export const URBAN_PALETTE = {
  street: '#F2EADB',
  streetEdge: '#B9A27A',
  roof: ['#D9C8A6', '#D2BF98', '#DFD0B1', '#CDB990'],
  roofLine: '#A88F66',
  court: '#EDE3CF',
  shadow: '#4F4128',
  lit: '#FBE49A',
  litEdge: '#D2A93E',
  dead: '#6E6578',
  threat: '#C8452B',
  ink: '#38432E',
  plateEdge: '#DCCDB2',
  select: '#D97E2B',
} as const;
const C = URBAN_PALETTE;

/** Signed numbers in RTL labels: an LRM keeps "-10" from rendering as "10-". */
export const bidiNum = (s: string) => s.replace(/^([+\-−]?\d)/, '‎$1');

/* GRID — 8 block columns × 7 block rows; the main avenue (38–44) is twice a
   street's width and is closed at its east end by one building (Enfilade). */
const GRID_M_PER_UNIT = 6.4;
const GRID_COLS = [[3, 20], [23, 40], [43, 60], [63, 80], [83, 100], [103, 120], [123, 140], [143, 161]] as const;
const GRID_ROWS = [[-1, 10], [13, 24], [27, 38], [44, 55], [58, 69], [72, 83], [86, 91]] as const;
const GRID_BLOCKS: Rect[] = [
  ...GRID_COLS.flatMap(([x0, x1]) => GRID_ROWS.map(([y0, y1]) => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }))),
  { x: 152, y: 38, w: 9, h: 6 },
];
const AVENUE_Y = 41;
/** Sniper sits in the window of the building that closes the avenue. */
const GRID_SNIPER: Pt = { x: 151.4, y: AVENUE_Y };
/** 1: mid-avenue, 800 m from the sniper · 2: avenue junction · 3: parallel street. */
const GRID_THREATS: Pt[] = [GRID_SNIPER];
const GRID_POSITIONS: Pt[] = [
  { x: 151.4 - 800 / GRID_M_PER_UNIT, y: AVENUE_Y },
  { x: 81.5, y: AVENUE_Y },
  { x: 51.5, y: 25.5 },
];

/* CASBAH — alley centre-lines (metres). Alley 0 is the force's route; the
   rest branch off it, with two dead ends and one small square. */
const CASBAH_ALLEYS: Alley[] = [
  { w: 2.6, pts: [[-2, 62], [5, 61.5], [5.5, 55], [11, 54.5], [11.5, 48], [18, 47.5], [21, 52], [28, 52.5], [30, 46.5], [36, 45.5], [37, 40], [43, 40.5], [45, 46], [52, 46.5], [54, 40.5], [60, 39.5], [61.5, 34], [68, 33.5], [70, 39], [77, 40], [79, 34], [86, 33], [88, 38.5], [95, 39], [97, 33.5], [104, 33], [106, 38], [113, 38.5], [115, 33], [122, 32], [124, 37.5], [131, 38], [133, 32.5], [140, 32], [142, 37], [149, 37.5], [151, 32], [162, 31.5]] },
  { w: 2.4, pts: [[37, 40], [35, 33], [39, 27], [36, 20], [40, 13], [38, 5], [40, -2]] },
  { w: 2.4, pts: [[11.5, 48], [9, 41], [13, 35], [10, 28], [14, 21], [11, 13], [15, 5], [13, -2]] },
  { w: 2.0, pts: [[13, 35], [19, 33], [24, 37], [30, 34], [35, 33]] },
  { w: 2.4, pts: [[28, 52.5], [26, 59], [31, 65], [27, 72], [32, 79], [29, 86], [31, 92]] },
  { w: 2.0, pts: [[31, 65], [38, 63], [44, 67], [51, 64], [56, 68]] },
  { w: 2.4, pts: [[52, 46.5], [55, 53], [52, 60], [56, 68], [53, 75], [58, 83], [56, 92]] },
  { w: 2.0, pts: [[45, 46], [46, 52], [42, 55]] },
  { w: 2.0, pts: [[66, 33.5], [66.5, 29], [71, 27.5]] },
  { w: 2.4, pts: [[79, 34], [77, 27], [81, 20], [78, 12], [82, 5], [80, -2]] },
  { w: 2.4, pts: [[77, 40], [80, 47], [85, 51]] },
  { w: 2.4, pts: [[91, 60], [89, 67], [94, 73], [91, 81], [95, 92]] },
  { w: 2.0, pts: [[95, 39], [97, 45], [93, 49]] },
  { w: 2.2, pts: [[104, 33], [103, 26], [108, 21], [105, 14]] },
  { w: 2.4, pts: [[113, 38.5], [115, 46], [111, 52], [115, 59], [112, 66], [117, 72], [124, 74], [127, 80], [125, 92]] },
  { w: 2.4, pts: [[122, 32], [120, 25], [125, 19], [122, 12], [126, 5], [124, -2]] },
  { w: 2.4, pts: [[142, 37], [145, 44], [141, 51], [147, 57], [154, 56], [162, 59]] },
  { w: 2.2, pts: [[133, 32.5], [134, 25], [140, 22], [139, 15]] },
  { w: 2.2, pts: [[115, 59], [108, 61], [101, 58], [92, 57]] },
  { w: 2.0, pts: [[5, 61.5], [4, 68], [8, 74], [5, 81], [9, 88], [7, 92]] },
];
const CASBAH_PLAZA = { x: 88, y: 56, r: 4.6 };
/** A covered stretch of the route (a roofed passage — dark from the air). */
const CASBAH_COVERED: readonly [Pt, Pt] = [{ x: 45, y: 46 }, { x: 52, y: 46.5 }];
/** 1: entrance (sight < 8 m) · 2: just before a bend · 3: deeper in, by a dead end. */
const CASBAH_POSITIONS: Pt[] = [
  { x: 8.25, y: 54.75 },
  { x: 41.5, y: 40.4 },
  { x: 66.5, y: 33.6 },
];
/** Same order as the scene's threat labels: ambush · IED · hidden gunman (in a dead end). */
const CASBAH_THREATS: Pt[] = [
  { x: 44.6, y: 44.9 },
  { x: 69.6, y: 37.9 },
  { x: 70.3, y: 27.8 },
];
const CASBAH_SHORT_SIGHT_M = 8;

export const URBAN_POSITION_COUNT = 3;

/* ── Free-space raster + visibility ──────────────────────────────────── */

const RES = 10; // raster cells per unit
const STEP = 0.5 / RES;

class FreeMask {
  readonly w = VB_W * RES;
  readonly h = VB_H * RES;
  readonly data = new Uint8Array(VB_W * RES * VB_H * RES);
  free(x: number, y: number) {
    if (x < 0 || y < 0 || x >= VB_W || y >= VB_H) return false;
    return this.data[Math.floor(y * RES) * this.w + Math.floor(x * RES)] === 1;
  }
  paint(x0: number, y0: number, x1: number, y1: number, v: 0 | 1, test?: (x: number, y: number) => boolean) {
    for (let cy = Math.max(0, Math.floor(y0 * RES)); cy < Math.min(this.h, Math.ceil(y1 * RES)); cy++)
      for (let cx = Math.max(0, Math.floor(x0 * RES)); cx < Math.min(this.w, Math.ceil(x1 * RES)); cx++)
        if (!test || test((cx + 0.5) / RES, (cy + 0.5) / RES)) this.data[cy * this.w + cx] = v;
  }
}

const distToSeg = (x: number, y: number, a: Pt, b: Pt) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
};

const masks: Partial<Record<UrbanPattern, FreeMask>> = {};
function freeMask(pattern: UrbanPattern): FreeMask {
  const cached = masks[pattern];
  if (cached) return cached;
  const m = new FreeMask();
  if (pattern === 'grid') {
    m.data.fill(1);
    for (const b of GRID_BLOCKS) m.paint(b.x, b.y, b.x + b.w, b.y + b.h, 0);
  } else {
    for (const a of CASBAH_ALLEYS) {
      const hw = a.w / 2;
      for (let i = 0; i < a.pts.length - 1; i++) {
        const p = { x: a.pts[i][0], y: a.pts[i][1] };
        const q = { x: a.pts[i + 1][0], y: a.pts[i + 1][1] };
        m.paint(Math.min(p.x, q.x) - hw, Math.min(p.y, q.y) - hw, Math.max(p.x, q.x) + hw, Math.max(p.y, q.y) + hw, 1,
          (x, y) => distToSeg(x, y, p, q) <= hw);
      }
    }
    const pl = CASBAH_PLAZA;
    m.paint(pl.x - pl.r, pl.y - pl.r, pl.x + pl.r, pl.y + pl.r, 1, (x, y) => Math.hypot(x - pl.x, y - pl.y) <= pl.r);
  }
  masks[pattern] = m;
  return m;
}

function castRay(m: FreeMask, o: Pt, a: number, maxR: number) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let d = 0;
  while (d < maxR && m.free(o.x + dx * (d + STEP), o.y + dy * (d + STEP))) d += STEP;
  return d;
}

function sees(m: FreeMask, o: Pt, p: Pt) {
  const L = Math.hypot(p.x - o.x, p.y - o.y);
  return castRay(m, o, Math.atan2(p.y - o.y, p.x - o.x), L) >= L - STEP * 2;
}

type Sight = { d: string; max: number };
const sightCache = new Map<string, Sight>();
/** Visibility polygon from `o` (rays every 360/2048°), collinear points dropped. */
function sightFrom(pattern: UrbanPattern, idx: number, o: Pt): Sight {
  const key = `${pattern}-${idx}`;
  const hit = sightCache.get(key);
  if (hit) return hit;
  const m = freeMask(pattern);
  const RAYS = 2048;
  const pts: Pt[] = [];
  let max = 0;
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2;
    const d = castRay(m, o, a, 200);
    max = Math.max(max, d);
    pts.push({ x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d });
  }
  const kept = pts.filter((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length];
    const b = pts[(i + 1) % pts.length];
    return Math.abs((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) > 0.004;
  });
  const d = `M${kept.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('L')}Z`;
  const sight = { d, max };
  sightCache.set(key, sight);
  return sight;
}

/* ── Decoration (deterministic) ──────────────────────────────────────── */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type House = { x: number; y: number; w: number; h: number; tone: string; court: boolean };
/** Each grid block split into houses: ~4.25-unit frontages, two rows deep. */
const GRID_HOUSES: House[] = (() => {
  const r = rng(10);
  const out: House[] = [];
  for (const b of GRID_BLOCKS) {
    const cols = Math.max(1, Math.round(b.w / 4.25));
    const rows = b.h > 8 ? 2 : 1;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++)
        out.push({
          x: b.x + (b.w / cols) * i,
          y: b.y + (b.h / rows) * j,
          w: b.w / cols,
          h: b.h / rows,
          tone: C.roof[Math.floor(r() * C.roof.length)],
          court: r() < 0.18,
        });
  }
  return out;
})();

type Cell = { d: string; tone: string };
/** Casbah roofscape: a jittered lattice of irregular roofs; alleys are cut over it. */
const CASBAH_ROOFS = (() => {
  const r = rng(7);
  const S = 6.5;
  const nx = Math.ceil(VB_W / S) + 1;
  const ny = Math.ceil(VB_H / S) + 1;
  const p: Pt[][] = [];
  for (let i = 0; i <= nx; i++) {
    p.push([]);
    for (let j = 0; j <= ny; j++) p[i].push({ x: (i - 0.5) * S + (r() - 0.5) * 3.2, y: (j - 0.5) * S + (r() - 0.5) * 3.2 });
  }
  const cells: Cell[] = [];
  const centres: Pt[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const q = [p[i][j], p[i + 1][j], p[i + 1][j + 1], p[i][j + 1]];
      cells.push({ d: `M${q.map((v) => `${v.x.toFixed(2)} ${v.y.toFixed(2)}`).join('L')}Z`, tone: C.roof[Math.floor(r() * C.roof.length)] });
      centres.push({ x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 });
    }
  return { cells, centres, pick: r };
})();

const polyline = (pts: Alley['pts']) => `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}`;

/* ── Shared marks ────────────────────────────────────────────────────── */

/**
 * Label on a white pill plate (no stroke halos). Measures its own text and
 * keeps the plate inside the frame; `textAnchor` is explicit (RTL rule).
 */
export function Plate({
  x,
  y,
  text,
  size = 2.3,
  tone = C.ink,
  minX = 0,
  maxX = VB_W,
}: {
  x: number;
  y: number;
  text: string;
  size?: number;
  tone?: string;
  minX?: number;
  maxX?: number;
}) {
  const ref = useRef<SVGTextElement>(null);
  const [w, setW] = useState(text.length * size * 0.5);
  useLayoutEffect(() => {
    if (ref.current) setW(ref.current.getComputedTextLength());
  }, [text, size]);
  const padX = size * 0.6;
  const h = size * 1.6;
  const half = w / 2 + padX;
  const cx = Math.min(Math.max(x, minX + half + 0.6), maxX - half - 0.6);
  return (
    <g pointerEvents="none">
      <rect x={cx - half + 0.25} y={y - h / 2 + 0.35} width={half * 2} height={h} rx={h / 2} fill={C.shadow} fillOpacity={0.12} />
      <rect x={cx - half} y={y - h / 2} width={half * 2} height={h} rx={h / 2} fill="#FFFFFF" fillOpacity={0.96} stroke={C.plateEdge} strokeWidth={0.18} />
      <text
        ref={ref}
        x={cx}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        direction="rtl"
        fontSize={size}
        fontWeight={700}
        fill={tone}
        className="font-display"
      >
        {text}
      </text>
    </g>
  );
}

/** Friendly force — the blue puck used across lessons (topic-06). */
export function ForcePuck({ x, y, r = 1.9, selected }: { x: number; y: number; r?: number; selected?: boolean }) {
  return (
    <g pointerEvents="none">
      {selected && <circle cx={x} cy={y} r={r * 1.55} fill="none" stroke={C.select} strokeWidth={0.4} />}
      <ellipse cx={x + 0.35} cy={y + 0.9} rx={r} ry={r * 0.6} fill={C.shadow} fillOpacity={0.22} />
      <circle cx={x} cy={y} r={r} fill="#FFFFFF" className="stroke-accent-cool" strokeWidth={0.6} />
      <circle cx={x} cy={y} r={r * 0.45} className="fill-accent-cool" />
    </g>
  );
}

export function ThreatMark({ p, seen, playKey, reduce }: { p: Pt; seen: boolean; playKey: string; reduce: boolean }) {
  return (
    <g pointerEvents="none">
      {seen && !reduce && (
        <motion.circle
          key={playKey}
          cx={p.x}
          cy={p.y}
          fill="none"
          stroke={C.threat}
          strokeWidth={0.4}
          initial={{ r: 1.3, opacity: 0.9 }}
          animate={{ r: 5.5, opacity: 0 }}
          transition={{ duration: 1.1, delay: 0.55, ease: 'easeOut' }}
        />
      )}
      <circle cx={p.x} cy={p.y} r={1.35} fill={seen ? C.threat : '#FFFFFF'} stroke={C.threat} strokeWidth={0.4} strokeDasharray={seen ? undefined : '0.7 0.45'} />
      {seen && <circle cx={p.x} cy={p.y} r={0.45} fill="#FFFFFF" />}
    </g>
  );
}

function ScaleBar({ meters, unitsPerMeter }: { meters: number; unitsPerMeter: number }) {
  const len = meters * unitsPerMeter;
  const x0 = 5;
  const y = 85.2;
  return (
    <g pointerEvents="none">
      <rect x={x0 - 3} y={y - 3.4} width={len + 11.5} height={5.6} rx={2.8} fill="#FFFFFF" fillOpacity={0.94} stroke={C.plateEdge} strokeWidth={0.18} />
      <path d={`M${x0} ${y - 0.7}V${y + 0.5}H${x0 + len}V${y - 0.7}`} fill="none" stroke={C.ink} strokeWidth={0.32} />
      <text x={x0} y={y - 1.35} textAnchor="middle" fontSize={2.2} fontWeight={700} fill={C.ink} className="font-display">0</text>
      <text x={x0 + len} y={y - 1.35} textAnchor="middle" direction="rtl" fontSize={2.2} fontWeight={700} fill={C.ink} className="font-display">
        {`${meters} מ׳`}
      </text>
    </g>
  );
}

function PositionMark({ p, n, r, onPick }: { p: Pt; n: number; r: number; onPick: () => void }) {
  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={p.x} cy={p.y} r={2.6} fill="transparent" />
      <circle cx={p.x} cy={p.y} r={r} fill="#FFFFFF" fillOpacity={0.95} className="stroke-accent-cool" strokeWidth={0.4} />
      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={2.2} fontWeight={800} fill={C.ink} className="font-display" pointerEvents="none">
        {n}
      </text>
    </g>
  );
}

/* ── Aerial map ──────────────────────────────────────────────────────── */

export type UrbanMapLabels = {
  grid: { los: string; sniper: string };
  casbah: { los: string; threats: readonly [string, string, string] };
};

/**
 * Aerial plan with computed LOS. `position` null = nothing selected (plain
 * map). Position marks are mouse targets only — the scene's chips are the
 * keyboard path. Clicking the selected mark again, or empty map, clears it.
 */
export function UrbanMap({
  pattern,
  position,
  onPosition,
  labels,
}: {
  pattern: UrbanPattern;
  position: number | null;
  onPosition: (p: number | null) => void;
  labels: UrbanMapLabels;
}) {
  const reduce = !!useReducedMotion();
  const id = useSvgId('urban');
  const positions = pattern === 'grid' ? GRID_POSITIONS : CASBAH_POSITIONS;
  const origin = position === null ? null : positions[position];
  const sight = useMemo(
    () => (origin && position !== null ? sightFrom(pattern, position, origin) : null),
    [pattern, position, origin],
  );
  const threats = pattern === 'grid' ? GRID_THREATS : CASBAH_THREATS;
  const seen = useMemo(
    () => threats.map((t) => (origin ? sees(freeMask(pattern), origin, t) : false)),
    [threats, origin, pattern],
  );
  const playKey = `${pattern}-${position}`;
  const pick = (i: number) => onPosition(position === i ? null : i);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="block w-full h-full select-none"
      aria-hidden
    >
      <defs>
        <pattern id={`${id}-dead`} patternUnits="userSpaceOnUse" width={1.3} height={1.3} patternTransform="rotate(45)">
          <rect width={1.3} height={1.3} fill={C.dead} fillOpacity={0.14} />
          <line x1={0} y1={0} x2={0} y2={1.3} stroke={C.dead} strokeOpacity={0.5} strokeWidth={0.32} />
        </pattern>
        <mask id={`${id}-alleys`} maskUnits="userSpaceOnUse" x={0} y={0} width={VB_W} height={VB_H}>
          {CASBAH_ALLEYS.map((a, i) => (
            <path key={i} d={polyline(a.pts)} fill="none" stroke="#fff" strokeWidth={a.w} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          <circle cx={CASBAH_PLAZA.x} cy={CASBAH_PLAZA.y} r={CASBAH_PLAZA.r} fill="#fff" />
        </mask>
        {origin && sight && (
          <clipPath id={`${id}-reveal`}>
            <motion.circle
              key={playKey}
              cx={origin.x}
              cy={origin.y}
              initial={reduce ? false : { r: 0 }}
              animate={{ r: sight.max + 4 }}
              transition={{ duration: pattern === 'grid' ? 1 : 0.7, ease: 'easeOut' }}
            />
          </clipPath>
        )}
      </defs>

      {pattern === 'grid' ? (
        <GridBase deadFill={origin ? `url(#${id}-dead)` : undefined} sightPath={sight?.d} revealClip={`url(#${id}-reveal)`} onBackground={() => onPosition(null)} />
      ) : (
        <CasbahBase
          deadStroke={origin ? `url(#${id}-dead)` : undefined}
          sightPath={sight?.d}
          revealClip={`url(#${id}-reveal)`}
          alleyMask={`url(#${id}-alleys)`}
          onBackground={() => onPosition(null)}
        />
      )}

      {/* LOS callouts — only where the scene's number holds for this position */}
      {pattern === 'grid' && position === 0 && origin && (
        <g pointerEvents="none">
          <path d={`M${origin.x} 46.2V48.2M${origin.x} 47.2H${GRID_SNIPER.x}M${GRID_SNIPER.x} 46.2V48.2`} fill="none" stroke={C.ink} strokeWidth={0.3} />
          <Plate x={(origin.x + GRID_SNIPER.x) / 2} y={47.2} text={labels.grid.los} />
        </g>
      )}
      {pattern === 'casbah' && position === 0 && origin && sight && sight.max < CASBAH_SHORT_SIGHT_M && (
        <g pointerEvents="none">
          <circle cx={origin.x} cy={origin.y} r={CASBAH_SHORT_SIGHT_M} fill="none" stroke={C.ink} strokeWidth={0.3} strokeOpacity={0.55} />
          <Plate x={origin.x + 4} y={origin.y - CASBAH_SHORT_SIGHT_M - 2.2} text={labels.casbah.los} />
        </g>
      )}

      {/* Threats: fire line to the force when it can see (and be seen) */}
      {origin &&
        threats.map((t, i) =>
          seen[i] ? (
            <motion.line
              key={`${playKey}-fire-${i}`}
              x1={t.x}
              y1={t.y}
              x2={origin.x}
              y2={origin.y}
              stroke={C.threat}
              strokeWidth={0.45}
              strokeDasharray="1.4 0.9"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              pointerEvents="none"
            />
          ) : null,
        )}
      {threats.map((t, i) => (
        <ThreatMark key={i} p={t} seen={seen[i]} playKey={playKey} reduce={reduce} />
      ))}
      {pattern === 'grid' ? (
        <Plate x={GRID_SNIPER.x - 6} y={35.4} text={labels.grid.sniper} tone={C.threat} />
      ) : (
        <>
          <Plate x={50.5} y={50.6} text={labels.casbah.threats[0]} tone={C.threat} />
          <Plate x={76.5} y={44.6} text={labels.casbah.threats[1]} tone={C.threat} />
          <Plate x={72} y={23.6} text={labels.casbah.threats[2]} tone={C.threat} />
        </>
      )}

      {/* Force positions — sized to each map's scale (the casbah is 1 m/unit,
          so a grid-sized puck would cover the few metres it can see). */}
      {positions.map((p, i) =>
        position === i ? (
          <g key={i} onClick={(e) => { e.stopPropagation(); pick(i); }} style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r={2.6} fill="transparent" />
            <ForcePuck x={p.x} y={p.y} r={pattern === 'grid' ? 1.9 : 1.15} selected />
          </g>
        ) : (
          <PositionMark key={i} p={p} n={i + 1} r={pattern === 'grid' ? 1.85 : 1.6} onPick={() => pick(i)} />
        ),
      )}

      {pattern === 'grid' ? <ScaleBar meters={200} unitsPerMeter={1 / GRID_M_PER_UNIT} /> : <ScaleBar meters={10} unitsPerMeter={1} />}
    </svg>
  );
}

function GridBase({
  deadFill,
  sightPath,
  revealClip,
  onBackground,
  crop,
}: {
  deadFill?: string;
  sightPath?: string;
  revealClip?: string;
  onBackground?: () => void;
  crop?: { y0: number; y1: number };
}) {
  const inCrop = (r: Rect) => !crop || (r.y < crop.y1 && r.y + r.h > crop.y0);
  return (
    <g>
      <rect x={0} y={0} width={VB_W} height={VB_H} fill={C.street} onClick={onBackground} />
      {deadFill && <rect x={0} y={0} width={VB_W} height={VB_H} fill={deadFill} pointerEvents="none" />}
      {sightPath && (
        <g clipPath={revealClip} pointerEvents="none">
          <path d={sightPath} fill={C.lit} fillOpacity={0.92} stroke={C.litEdge} strokeWidth={0.25} strokeLinejoin="round" />
        </g>
      )}
      <g pointerEvents="none">
        {GRID_BLOCKS.filter(inCrop).map((b, i) => (
          <rect key={`s${i}`} x={b.x + 0.45} y={b.y + 0.6} width={b.w} height={b.h} fill={C.shadow} fillOpacity={0.2} />
        ))}
        {GRID_HOUSES.filter(inCrop).map((h, i) => (
          <g key={i}>
            <rect x={h.x} y={h.y} width={h.w} height={h.h} fill={h.tone} stroke={C.roofLine} strokeWidth={0.14} />
            {h.court && <rect x={h.x + h.w * 0.3} y={h.y + h.h * 0.3} width={h.w * 0.4} height={h.h * 0.4} fill={C.court} stroke={C.roofLine} strokeWidth={0.1} />}
          </g>
        ))}
        {GRID_BLOCKS.filter(inCrop).map((b, i) => (
          <rect key={`o${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={C.streetEdge} strokeWidth={0.28} />
        ))}
      </g>
    </g>
  );
}

function CasbahBase({
  deadStroke,
  sightPath,
  revealClip,
  alleyMask,
  onBackground,
}: {
  deadStroke?: string;
  sightPath?: string;
  revealClip?: string;
  alleyMask: string;
  onBackground: () => void;
}) {
  const decor = useMemo(() => {
    const m = freeMask('casbah');
    const solid = (p: Pt, r: number) => {
      for (let a = 0; a < 8; a++) if (m.free(p.x + Math.cos((a * Math.PI) / 4) * r, p.y + Math.sin((a * Math.PI) / 4) * r)) return false;
      return m.free(p.x, p.y) === false;
    };
    const courts: Pt[] = [];
    const domes: Pt[] = [];
    CASBAH_ROOFS.centres.forEach((c, i) => {
      if (!solid(c, 2.6)) return;
      if (i % 7 === 3) domes.push(c);
      else if (i % 5 === 1) courts.push(c);
    });
    return { courts, domes };
  }, []);
  const [a, b] = CASBAH_COVERED;
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return (
    <g>
      <g onClick={onBackground}>
        <rect x={0} y={0} width={VB_W} height={VB_H} fill={C.roof[0]} />
        {CASBAH_ROOFS.cells.map((c, i) => (
          <path key={i} d={c.d} fill={c.tone} stroke={C.roofLine} strokeWidth={0.16} strokeLinejoin="round" />
        ))}
      </g>
      <g pointerEvents="none">
        {decor.courts.map((c, i) => (
          <rect key={i} x={c.x - 1.4} y={c.y - 1.1} width={2.8} height={2.2} fill={C.court} stroke={C.roofLine} strokeWidth={0.12} />
        ))}
        {decor.domes.map((c, i) => (
          <g key={i}>
            <circle cx={c.x + 0.3} cy={c.y + 0.4} r={1.5} fill={C.shadow} fillOpacity={0.18} />
            <circle cx={c.x} cy={c.y} r={1.5} fill={C.court} stroke={C.roofLine} strokeWidth={0.14} />
            <circle cx={c.x - 0.45} cy={c.y - 0.45} r={0.5} fill="#FFFFFF" fillOpacity={0.6} />
          </g>
        ))}
        {/* Alleys: wall edge, shadowed floor, floor */}
        {CASBAH_ALLEYS.map((al, i) => (
          <path key={`e${i}`} d={polyline(al.pts)} fill="none" stroke={C.streetEdge} strokeWidth={al.w + 0.4} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <circle cx={CASBAH_PLAZA.x} cy={CASBAH_PLAZA.y} r={CASBAH_PLAZA.r + 0.2} fill={C.streetEdge} />
        {CASBAH_ALLEYS.map((al, i) => (
          <path key={`f${i}`} d={polyline(al.pts)} fill="none" stroke={C.street} strokeWidth={al.w} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <circle cx={CASBAH_PLAZA.x} cy={CASBAH_PLAZA.y} r={CASBAH_PLAZA.r} fill={C.street} />
        {deadStroke && (
          <>
            {CASBAH_ALLEYS.map((al, i) => (
              <path key={`d${i}`} d={polyline(al.pts)} fill="none" stroke={deadStroke} strokeWidth={al.w} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            <circle cx={CASBAH_PLAZA.x} cy={CASBAH_PLAZA.y} r={CASBAH_PLAZA.r} fill={deadStroke} />
          </>
        )}
        {sightPath && (
          <g mask={alleyMask}>
            <g clipPath={revealClip}>
              <path d={sightPath} fill={C.lit} fillOpacity={0.95} stroke={C.litEdge} strokeWidth={0.2} strokeLinejoin="round" />
            </g>
          </g>
        )}
        {/* Covered passage — roofed over, beams across */}
        <g transform={`translate(${a.x} ${a.y}) rotate(${ang})`}>
          <rect x={0.6} y={-1.75} width={len - 1.2} height={3.5} fill={C.roof[3]} fillOpacity={0.88} stroke={C.roofLine} strokeWidth={0.16} />
          {Array.from({ length: Math.floor((len - 1.2) / 1.1) }, (_, i) => (
            <line key={i} x1={1.2 + i * 1.1} y1={-1.75} x2={1.2 + i * 1.1} y2={1.75} stroke={C.roofLine} strokeWidth={0.14} />
          ))}
        </g>
      </g>
    </g>
  );
}

/* ── Legend glyphs (mirror the map marks 1:1) ────────────────────────── */

/** `threat` = seen by the force (solid), `threat-unseen` = in dead space (hollow, dashed). */
export function UrbanLegendGlyph({ kind }: { kind: 'force' | 'lit' | 'dead' | 'threat' | 'threat-unseen' }) {
  const id = useSvgId('urban-lg');
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
      {kind === 'force' && (
        <>
          <circle cx={8} cy={8} r={6} fill="#FFFFFF" className="stroke-accent-cool" strokeWidth={2} />
          <circle cx={8} cy={8} r={2.6} className="fill-accent-cool" />
        </>
      )}
      {kind === 'lit' && <rect x={1} y={3} width={14} height={10} rx={2} fill={C.lit} stroke={C.litEdge} strokeWidth={1} />}
      {kind === 'dead' && (
        <>
          <defs>
            <pattern id={id} patternUnits="userSpaceOnUse" width={4} height={4} patternTransform="rotate(45)">
              <rect width={4} height={4} fill={C.street} />
              <line x1={0} y1={0} x2={0} y2={4} stroke={C.dead} strokeOpacity={0.7} strokeWidth={1.2} />
            </pattern>
          </defs>
          <rect x={1} y={3} width={14} height={10} rx={2} fill={`url(#${id})`} stroke={C.dead} strokeOpacity={0.5} strokeWidth={0.8} />
        </>
      )}
      {kind === 'threat' && (
        <>
          <circle cx={8} cy={8} r={5.5} fill={C.threat} />
          <circle cx={8} cy={8} r={1.8} fill="#FFFFFF" />
        </>
      )}
      {kind === 'threat-unseen' && <circle cx={8} cy={8} r={5} fill="#FFFFFF" stroke={C.threat} strokeWidth={1.6} strokeDasharray="2.6 1.7" />}
    </svg>
  );
}

/* ── Enfilade diagram — a crop of the GRID model ─────────────────────── */

const ENF_Y0 = 23;
const ENF_H = 36;
/** Rat-run line: through the houses of the row facing the avenue. */
const RAT_Y = 35;
const RAT_X0 = 1.5;
const RAT_X1 = 137;
/** Where the route is inside buildings (solid) vs. crossing a street (dashed). */
const RAT_INSIDE: [number, number][] = GRID_COLS.map(([x0, x1]) => [Math.max(RAT_X0, x0), Math.min(RAT_X1, x1)] as [number, number]).filter(([a, b]) => b > a);
const RAT_CROSSINGS: [number, number][] = [
  [RAT_X0, GRID_COLS[0][0]] as [number, number],
  ...GRID_COLS.slice(0, -1).map(([, x1], i) => [x1, GRID_COLS[i + 1][0]] as [number, number]),
].filter(([a]) => a < RAT_X1);
/** Breaches: every party wall / block face the route goes through. */
const RAT_BREACHES: number[] = [
  ...new Set(
    GRID_HOUSES.filter((h) => h.y < RAT_Y && h.y + h.h > RAT_Y)
      .flatMap((h) => [h.x, h.x + h.w])
      .filter((x) => x > RAT_X0 && x < RAT_X1)
      .map((x) => Math.round(x * 100) / 100),
  ),
];

const ENF_T = { sweep: 1.1, routeStart: 1.5, end: 5.6 };

export function EnfiladeDiagram({ labels }: { labels: { sniper: string; enfilade: string; ratRun: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [run, setRun] = useState(0);
  const { t } = useSequence(ENF_T.end, inView, run);
  const id = useSvgId('enf');
  const killX = useTransform(t, [0, ENF_T.sweep], [GRID_SNIPER.x, 0]);
  const killW = useTransform(killX, (x) => GRID_SNIPER.x - x);
  const routeW = useTransform(t, [ENF_T.routeStart, ENF_T.end - 0.3], [0, RAT_X1 - RAT_X0], { clamp: true });
  const puckX = useTransform(routeW, (w) => RAT_X0 + w);
  const routeClipW = useTransform(routeW, (w) => w + 2);
  const routeOpacity = useTransform(t, [ENF_T.routeStart - 0.05, ENF_T.routeStart], [0, 1]);

  return (
    <div ref={ref} className="relative mt-5 rounded-2xl overflow-hidden border border-border-subtle bg-bg-elevated">
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        aria-label="הפעלה חוזרת של ההדגמה"
        className="motion-reduce:hidden absolute top-2.5 end-2.5 z-10 size-8 rounded-xl border border-border bg-bg-elevated/95 text-fg-muted hover:text-fg hover:border-brand/30 transition-colors inline-flex items-center justify-center"
      >
        <Icon name="refresh" size={15} />
      </button>
      <svg viewBox={`0 ${ENF_Y0} ${VB_W} ${ENF_H}`} className="block w-full h-auto" aria-hidden>
        <defs>
          <clipPath id={`${id}-kill`}>
            <motion.rect x={killX} y={38} width={killW} height={6} />
          </clipPath>
          <clipPath id={`${id}-route`}>
            <motion.rect x={RAT_X0 - 2} y={ENF_Y0} width={routeClipW} height={ENF_H} />
          </clipPath>
        </defs>
        <GridBase crop={{ y0: ENF_Y0, y1: ENF_Y0 + ENF_H }} />

        {/* Enfilade — the avenue as one killing ground, swept from its far end */}
        <g clipPath={`url(#${id}-kill)`} pointerEvents="none">
          <rect x={0} y={38} width={GRID_SNIPER.x} height={6} fill={C.threat} fillOpacity={0.16} />
          {[39.6, 41, 42.4].map((y) => (
            <line key={y} x1={GRID_SNIPER.x} y1={AVENUE_Y} x2={0} y2={y} stroke={C.threat} strokeWidth={0.32} strokeDasharray="1.6 1" strokeOpacity={0.85} />
          ))}
        </g>

        {/* Rat run — solid through houses, dashed across streets */}
        <motion.g clipPath={`url(#${id}-route)`} style={{ opacity: routeOpacity }} pointerEvents="none">
          {/* Breach notches: the wall line opened just wider than the route */}
          {RAT_BREACHES.map((x) => (
            <rect key={x} x={x - 0.3} y={RAT_Y - 0.85} width={0.6} height={1.7} fill={C.court} />
          ))}
          {/* White casing so the orange route separates from the tan roofs */}
          <line x1={RAT_X0} y1={RAT_Y} x2={RAT_X1} y2={RAT_Y} stroke="#FFFFFF" strokeWidth={1.6} strokeOpacity={0.9} />
          {RAT_INSIDE.map(([a, b]) => (
            <line key={`i${a}`} x1={a} y1={RAT_Y} x2={b} y2={RAT_Y} stroke={C.select} strokeWidth={0.9} strokeLinecap="round" />
          ))}
          {RAT_CROSSINGS.map(([a, b]) => (
            <line key={`c${a}`} x1={a} y1={RAT_Y} x2={b} y2={RAT_Y} stroke={C.select} strokeWidth={0.75} strokeDasharray="0.7 0.6" />
          ))}
          <path d={`M${RAT_X1 - 0.2} ${RAT_Y - 1.5}L${RAT_X1 + 1.8} ${RAT_Y}L${RAT_X1 - 0.2} ${RAT_Y + 1.5}Z`} fill={C.select} />
        </motion.g>
        <motion.g style={{ x: puckX, opacity: routeOpacity }}>
          <ForcePuck x={0} y={RAT_Y} r={1.6} />
        </motion.g>

        <ThreatMark p={GRID_SNIPER} seen playKey={`enf-${run}`} reduce />
        <Plate x={GRID_SNIPER.x - 2} y={47.8} text={labels.sniper} tone={C.threat} />
        <Plate x={60} y={41} text={labels.enfilade} tone={C.threat} />
        <Plate x={70} y={30.2} text={labels.ratRun} />
      </svg>
    </div>
  );
}
