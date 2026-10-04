'use client';

/**
 * Topic-12 · 12.2 — the terrain behind the live cost surface.
 *
 * One terrain model, on a 30 × 18 grid of square cells, drives everything:
 *   - the four cost factors per cell: slope (from the height model's gradient),
 *     water (the river), built-up (the village) and threat proximity;
 *   - the map: cost raster + contours, river, road, village and threat site;
 *   - the per-factor thumbnails beside the weight sliders.
 * A paved road with a bridge is part of the terrain: its cells are cheap
 * ("כביש סלול"), so the least-cost path sticks to it until a weight (usually
 * threat) makes leaving it cheaper. Everything is illustrative, not surveyed.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const W = 30;
export const H = 18;
export const START: [number, number] = [2, 15];
export const END: [number, number] = [27, 3];

type Pt = [number, number];
export type Factor = 'slope' | 'water' | 'urban' | 'threat';
export type Cell = Record<Factor, number> & { road: boolean };

// ── The terrain ──────────────────────────────────────────────────────────

function heightAt(x: number, y: number): number {
  const g = (cx: number, cy: number, sx: number, sy: number) =>
    Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((y - cy) ** 2) / (2 * sy * sy)));
  return 40 * g(9, 6, 3.6, 3) + 30 * g(22, 12, 3.4, 2.8) + 18 * g(16, 1, 4, 2.5) + 10 * g(3, 3, 3, 3);
}
/** River centre-line: enters in the north-west, leaves in the south-east. */
const riverX = (y: number) => 6 + y * 1.05 + Math.sin(y * 0.55) * 1.6;
const RIVER: Pt[] = Array.from({ length: 19 }, (_, i) => [riverX(i), i]);
/** Paved road A → village → bridge → B (grid units). */
const ROAD: Pt[] = [
  [2, 15.5], [5, 15], [8, 14], [11, 13.2], [14, 12.6], [16.5, 11.2], [18.5, 9.6], [19.2, 7.5],
  [20.5, 5.6], [23, 4.4], [25.5, 3.6], [28, 3],
];
const VILLAGE = { x0: 13, x1: 16, y0: 11, y1: 14 };
const VILLAGE_HOUSES: { x: number; y: number; w: number; h: number }[] = [
  { x: 13.3, y: 11.4, w: 0.8, h: 0.6 },
  { x: 14.5, y: 11.25, w: 0.7, h: 0.55 },
  { x: 13.4, y: 13.0, w: 0.9, h: 0.6 },
  { x: 14.6, y: 13.3, w: 0.75, h: 0.55 },
  { x: 15.2, y: 12.0, w: 0.6, h: 0.5 },
];
export const THREAT = { x: 18.5, y: 6.5, r: 4.6 };

function segDist(px: number, py: number, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}
const roadDist = (x: number, y: number) => Math.min(...ROAD.slice(1).map((b, i) => segDist(x, y, ROAD[i], b)));

/** GRID[x][y] — every factor normalised to 0–1. */
export const GRID: Cell[][] = (() => {
  const raw: { s: number; water: number; urban: number; threat: number; road: boolean }[][] = [];
  let maxS = 0;
  for (let x = 0; x < W; x++) {
    raw[x] = [];
    for (let y = 0; y < H; y++) {
      const cx = x + 0.5, cy = y + 0.5, e = 0.5;
      const s = Math.hypot(heightAt(cx + e, cy) - heightAt(cx - e, cy), heightAt(cx, cy + e) - heightAt(cx, cy - e));
      maxS = Math.max(maxS, s);
      raw[x][y] = {
        s,
        water: Math.max(0, 1 - Math.abs(cx - riverX(cy)) / 1.1),
        urban: cx > VILLAGE.x0 && cx < VILLAGE.x1 && cy > VILLAGE.y0 && cy < VILLAGE.y1 ? 0.9 : 0,
        threat: Math.max(0, 1 - Math.hypot(cx - THREAT.x, cy - THREAT.y) / THREAT.r),
        road: roadDist(cx, cy) < 0.62,
      };
    }
  }
  return raw.map((col) => col.map(({ s, ...c }) => ({ ...c, slope: s / maxS })));
})();

// Contours of the same height model (marching squares, 8 m interval).
const CONTOURS: string = (() => {
  const N = 4; // samples per cell
  const sx = W * N, sy = H * N;
  const v: number[][] = [];
  for (let j = 0; j <= sy; j++) {
    v[j] = [];
    for (let i = 0; i <= sx; i++) v[j][i] = heightAt(i / N, j / N);
  }
  let d = '';
  for (let level = 8; level < 48; level += 8) {
    for (let j = 0; j < sy; j++) {
      for (let i = 0; i < sx; i++) {
        const a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], e = v[j + 1][i];
        const x0 = i / N, y0 = j / N, s = 1 / N;
        const t = (p: number, q: number) => (level - p) / (q - p);
        const p: Pt[] = [];
        if ((a < level) !== (b < level)) p.push([x0 + t(a, b) * s, y0]);
        if ((b < level) !== (c < level)) p.push([x0 + s, y0 + t(b, c) * s]);
        if ((e < level) !== (c < level)) p.push([x0 + t(e, c) * s, y0 + s]);
        if ((a < level) !== (e < level)) p.push([x0, y0 + t(a, e) * s]);
        for (let k = 0; k + 1 < p.length; k += 2) d += `M${p[k][0].toFixed(2)} ${p[k][1].toFixed(2)}L${p[k + 1][0].toFixed(2)} ${p[k + 1][1].toFixed(2)}`;
      }
    }
  }
  return d;
})();

function smoothPath(pts: Pt[]): string {
  const n = pts.length;
  const at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}
const RIVER_D = smoothPath(RIVER);

/** Where the road crosses the river, and the road's direction there (for the bridge mark). */
const BRIDGE: { at: Pt; dir: Pt } = (() => {
  let best = { d: Infinity, at: ROAD[0], dir: [1, 0] as Pt };
  for (let i = 1; i < ROAD.length; i++) {
    const a = ROAD[i - 1], b = ROAD[i];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const p: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const d = Math.abs(p[0] - riverX(p[1]));
      if (d < best.d) {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        best = { d, at: p, dir: [(b[0] - a[0]) / len, (b[1] - a[1]) / len] };
      }
    }
  }
  return { at: best.at, dir: best.dir };
})();
/** Two brackets either side of the road, parallel to it, flared at the ends — the map symbol for a bridge. */
const BRIDGE_D = (() => {
  const { at, dir } = BRIDGE;
  const n: Pt = [-dir[1], dir[0]];
  const L = 0.62, off = 0.36, flare = 0.2;
  const side = (s: number) => {
    const p = (u: number, v: number): string => `${(at[0] + dir[0] * u + n[0] * v).toFixed(2)} ${(at[1] + dir[1] * u + n[1] * v).toFixed(2)}`;
    return `M${p(-L - flare, s * (off + flare))}L${p(-L, s * off)}L${p(L, s * off)}L${p(L + flare, s * (off + flare))}`;
  };
  return side(1) + side(-1);
})();
const ROAD_D = smoothPath(ROAD);

// ── Cost colour scale ────────────────────────────────────────────────────

/** Sequential cost ramp, light (cheap) → dark (expensive). Never orange: orange is the path. */
export const COST_RAMP = ['#F3F1E4', '#E1E2C6', '#C9CDA2', '#ABB27E', '#8A9361', '#69734A', '#4D5636'];
/**
 * Absolute scale (not re-normalised per weight setting), so raising a weight
 * visibly darkens the surface and zero weights leave it pale.
 */
export const costColor = (c: number) =>
  COST_RAMP[Math.min(COST_RAMP.length - 1, Math.floor(Math.sqrt(Math.max(0, c - 0.3) / 18) * COST_RAMP.length))];

export function LegendSwatch({ fill, line = false }: { fill?: string; line?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
      {line ? (
        <path d="M1 9 L11 3" className="stroke-accent" strokeWidth="2.6" strokeLinecap="round" />
      ) : (
        <rect x="0.5" y="0.5" width="11" height="11" rx="2.5" fill={fill} className="stroke-fg-dim/40" strokeWidth="1" />
      )}
    </svg>
  );
}

// ── Run-once traveller ───────────────────────────────────────────────────

/** 0 → 1 over `ms` each time `runKey` changes (never loops). null = idle. */
function useRunOnce(runKey: number, ms: number, enabled: boolean): number | null {
  const [t, setT] = useState<number | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    if (!enabled || runKey === 0) {
      setT(null);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setT(k);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [runKey, ms, enabled]);
  return t;
}

function pointAlong(pts: Pt[], t: number): Pt {
  const seg = pts.slice(1).map((b, i) => Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]));
  let left = seg.reduce((s, l) => s + l, 0) * t;
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i] || i === seg.length - 1) {
      const k = seg[i] === 0 ? 0 : Math.min(1, left / seg[i]);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    left -= seg[i];
  }
  return pts[pts.length - 1];
}

// ── The map ──────────────────────────────────────────────────────────────

const centre = (p: [number, number]): Pt => [p[0] + 0.5, p[1] + 0.5];

/** Start = hollow ring, goal = filled disc in a target ring — they differ by shape, not only by letter. */
function Marker({ at, children, goal = false }: { at: Pt; children: string; goal?: boolean }) {
  return (
    <g>
      {goal ? (
        <>
          <circle cx={at[0]} cy={at[1]} r="0.82" className="fill-bg-elevated stroke-fg" strokeWidth="0.14" />
          <circle cx={at[0]} cy={at[1]} r="0.46" className="fill-fg" />
        </>
      ) : (
        <circle cx={at[0]} cy={at[1]} r="0.56" className="fill-bg-elevated stroke-fg" strokeWidth="0.26" />
      )}
      <rect x={at[0] - 0.62} y={at[1] - 2.02} width="1.24" height="1.08" rx="0.54" className="fill-bg-elevated" opacity={0.94} />
      <text x={at[0]} y={at[1] - 1.2} textAnchor="middle" fontSize="0.8" className="fill-fg font-display font-bold">
        {children}
      </text>
    </g>
  );
}

export function CostMap({
  cost,
  path,
  showDirect,
  runKey,
}: {
  cost: number[][];
  path: [number, number][];
  showDirect: boolean;
  /** bumps when the path settles after a change, or on replay → traveller runs once */
  runKey: number;
}) {
  const reduce = !!useReducedMotion();
  const pts = path.map(centre);
  const t = useRunOnce(runKey, 2600, !reduce);
  const traveller = t !== null && t < 1 ? pointAlong(pts, t) : null;
  const a = centre(START), b = centre(END);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" aria-hidden>
      {/* cost raster */}
      {cost.map((col, x) =>
        col.map((c, y) => <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={costColor(c)} />),
      )}
      {/* cell grid */}
      <g className="stroke-bg-elevated" strokeWidth="0.03" opacity="0.6">
        {Array.from({ length: W - 1 }, (_, i) => <line key={`x${i}`} x1={i + 1} y1="0" x2={i + 1} y2={H} />)}
        {Array.from({ length: H - 1 }, (_, i) => <line key={`y${i}`} x1="0" y1={i + 1} x2={W} y2={i + 1} />)}
      </g>

      {/* the terrain that makes the cost */}
      <path d={CONTOURS} fill="none" className="stroke-fg" strokeWidth="0.05" opacity="0.35" />
      <path d={RIVER_D} fill="none" className="stroke-terrain-sky" strokeWidth="0.36" strokeLinecap="round" opacity="0.9" />
      <rect x={VILLAGE.x0} y={VILLAGE.y0} width={VILLAGE.x1 - VILLAGE.x0} height={VILLAGE.y1 - VILLAGE.y0} rx="0.3" fill="none" className="stroke-fg-muted" strokeWidth="0.06" opacity="0.8" />
      <g className="fill-fg-muted">
        {VILLAGE_HOUSES.map((h, i) => <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} />)}
      </g>
      <path d={ROAD_D} fill="none" className="stroke-fg" strokeWidth="0.44" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <path d={ROAD_D} fill="none" className="stroke-paper-bright" strokeWidth="0.24" strokeLinecap="round" strokeLinejoin="round" />
      <path d={BRIDGE_D} fill="none" className="stroke-fg" strokeWidth="0.09" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={THREAT.x} cy={THREAT.y} r={THREAT.r} className="fill-status-danger/10 stroke-status-danger" strokeWidth="0.13" strokeDasharray="0.36 0.22" />
      <circle cx={THREAT.x} cy={THREAT.y} r="0.36" className="fill-status-danger stroke-bg-elevated" strokeWidth="0.1" />

      {/* straight line A–B, for comparison */}
      {showDirect && (
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="stroke-fg" strokeWidth="0.16" strokeDasharray="0.55 0.35" strokeLinecap="round" />
      )}

      {/* least-cost path */}
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" className="stroke-bg-elevated" strokeWidth="0.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <motion.polyline
        key={pts.map((p) => p.join(',')).join(' ')}
        points={pts.map((p) => p.join(',')).join(' ')}
        fill="none"
        className="stroke-accent"
        strokeWidth="0.3"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduce ? false : { opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      />

      <Marker at={a}>A</Marker>
      <Marker at={b} goal>B</Marker>

      {/* traveller — runs once along the path after it settles (or on replay) */}
      {traveller && <circle cx={traveller[0]} cy={traveller[1]} r="0.42" className="fill-accent stroke-bg-elevated" strokeWidth="0.14" />}
    </svg>
  );
}

// ── Factor thumbnails (one per weight slider) ────────────────────────────

const FACTOR_FILL: Record<Factor, string> = {
  slope: 'fill-terrain-ridge',
  water: 'fill-terrain-sky',
  urban: 'fill-fg-muted',
  threat: 'fill-status-danger',
};

/** The factor's footprint on the same grid, its strength scaled by the weight. */
export function FactorThumb({ factor, weight }: { factor: Factor; weight: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-9 w-[60px] shrink-0 rounded-md bg-bg-accent" aria-hidden>
      <g className={cn(FACTOR_FILL[factor], 'transition-opacity')}>
        {GRID.map((col, x) =>
          col.map((c, y) =>
            c[factor] > 0.04 ? (
              <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" opacity={Math.min(1, c[factor] * (0.15 + weight * 0.85))} />
            ) : null,
          ),
        )}
      </g>
    </svg>
  );
}
