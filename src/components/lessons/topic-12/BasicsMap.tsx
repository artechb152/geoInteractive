'use client';

/**
 * Topic-12 · 12.1 — one operational area, drawn from one model.
 *
 * The area is the orthophoto in `assets/valley-aerial.jpg` (0–100 × 0–100,
 * north up). Everything else in the scene is generated from the data below:
 *   - the 4 GIS layers (DTM raster, roads, buildings, threats) in the layer
 *     stack and in the composed top-down map;
 *   - the vector panel of "ראסטר מול וקטור" (roads/fields/wadi re-traced on
 *     the photo, contours from the same height model as the DTM layer).
 * The height model is illustrative (no survey behind it): a hilltop
 * settlement, a western hill and a wadi floor, placed where the photo shows
 * them. Maps are never mirrored for RTL.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type LayerId = 'elevation' | 'roads' | 'buildings' | 'threats';
type Pt = [number, number];

// ── Geometry helpers ─────────────────────────────────────────────────────

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smoothPath(pts: Pt[], closed = false): string {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0]} ${p2[1]}`;
  }
  return closed ? d + ' Z' : d;
}

/** Dense samples along the same Catmull-Rom curve (for raster look-ups). */
function sampleSmooth(pts: Pt[], perSeg = 24): Pt[] {
  const n = pts.length;
  const at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))];
  const out: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg;
      const u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

// ── The area (traced on valley-aerial.jpg) ───────────────────────────────

/** Main road — the paved serpentine across the photo. */
const MAIN_ROAD: Pt[] = [
  [15.5, 0], [16, 6], [19, 10], [24, 13], [28, 17], [31, 21], [33.5, 25], [34.5, 30], [33, 34],
  [30, 37], [26, 39.5], [24, 42], [23.5, 45], [25, 47], [28, 48], [32, 46], [36, 45], [41, 45],
  [44.5, 46.5], [46, 49], [45, 52], [43, 55], [42, 58], [43, 60.5], [46, 62], [50, 61.5], [55, 60],
  [60, 59], [65, 58], [69, 59], [72, 61], [76, 62], [82, 63], [86, 64], [89, 66.5], [89.5, 69],
  [88, 72], [85, 74.5], [82, 77], [80, 80], [80, 82], [82, 84], [85, 85.5], [87, 87.5], [87, 89.5],
  [85, 91], [82, 92], [80, 93.5], [79.5, 96], [80, 100],
];
/** Secondary roads: settlement ring, the NE road, the paved stub at the SW edge. */
const SETTLEMENT_RING: Pt[] = [
  [63, 21], [70, 19], [75, 20], [77.5, 24], [77, 31], [73, 35.5], [66, 36.5], [61, 33], [60, 27],
];
const SECONDARY_ROADS: Pt[][] = [
  [[78, 0], [80, 5], [84, 10], [87, 15], [92, 18], [100, 22]],
  [[0, 80.5], [5, 79], [10, 76]],
];
/** Dirt track from the settlement down to the main road. */
const TRACK: Pt[] = [[61, 33], [57, 36], [55, 39], [54, 43], [54.5, 48], [56, 53], [57, 59.6]];
/** Seasonal wadi along the field band. */
const WADI: Pt[] = [[0, 78.5], [10, 80], [20, 82], [30, 83.2], [40, 84.4], [50, 85.5], [57, 88.5], [62, 94], [65, 100]];
/** Tilled fields (brown patches on the photo). */
const FIELDS: Pt[][] = [
  [[0, 8], [10, 8.5], [13, 12], [10, 15], [0, 14]],
  [[79, 1], [89, 2.5], [89.5, 8], [80, 6]],
  [[92, 4], [100, 3], [100, 9.5], [92, 10]],
  [[4, 33], [10, 35], [10.5, 42], [5.5, 40]],
  [[30, 48.5], [36, 49.5], [37.5, 55], [33, 59], [30, 55]],
  [[63.5, 63], [69, 63.5], [70, 73], [64.5, 74]],
  [[3, 71], [15, 68], [22, 72.5], [18, 78], [5, 77.5]],
  [[20, 75], [32, 77], [35.5, 81.5], [22, 80.5]],
  [[35, 80], [48, 81], [52, 85.5], [40, 86]],
  [[52, 81.5], [60, 80], [64, 87.5], [57, 90.5]],
];
/** Settlement footprints (hilltop cluster, photo x≈63–78, y≈22–34). */
const BUILDINGS: { x: number; y: number; w: number; h: number }[] = [
  { x: 64, y: 24, w: 3, h: 2.2 },
  { x: 68, y: 23, w: 2.6, h: 2 },
  { x: 71.5, y: 24.5, w: 3.2, h: 2.4 },
  { x: 65.5, y: 27.5, w: 2.4, h: 2 },
  { x: 69, y: 27, w: 3, h: 2.4 },
  { x: 73, y: 28, w: 2.6, h: 2.2 },
  { x: 74.5, y: 23, w: 2.4, h: 2 },
  { x: 67, y: 30.5, w: 2.8, h: 2 },
  { x: 71, y: 31, w: 3, h: 2.2 },
  { x: 63, y: 30, w: 2.4, h: 2 },
];
/** Point features. The first is the vector panel's observation site. */
export const SITE: Pt = [54, 43];
const THREATS: { at: Pt; r: number }[] = [
  { at: SITE, r: 9 },
  { at: [87, 78], r: 7 },
];

/** y of the drawn wadi at x (linear between its points), so the valley floor and the line agree. */
function wadiYAt(x: number): number {
  for (let i = 1; i < WADI.length; i++) {
    const [x0, y0] = WADI[i - 1], [x1, y1] = WADI[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 140; // east of where the wadi leaves the frame → no dip inside the map
}

/** Illustrative height model (m): settlement hilltop, western hill, wadi floor. */
function heightAt(x: number, y: number): number {
  const g = (cx: number, cy: number, sx: number, sy: number) =>
    Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((y - cy) ** 2) / (2 * sy * sy)));
  const wadiY = wadiYAt(x);
  return (
    330 +
    200 * g(70, 28, 14, 11) +
    130 * g(14, 50, 12, 13) +
    90 * g(38, 12, 16, 10) +
    70 * g(92, 82, 12, 13) +
    (100 - y) * 0.6 -
    55 * Math.exp(-((y - wadiY) ** 2) / (2 * 5 * 5))
  );
}

// DTM raster: 20 × 20 cells of 5 units, coloured by elevation class.
const DTM_N = 20;
const DTM: number[] = Array.from({ length: DTM_N * DTM_N }, (_, i) =>
  heightAt((i % DTM_N) * 5 + 2.5, Math.floor(i / DTM_N) * 5 + 2.5),
);
const DTM_MIN = Math.min(...DTM);
const DTM_MAX = Math.max(...DTM);
/** Hypsometric ramp, lowland olive → upland tan → hilltop brown (illustration palette). */
const HYPSO = ['#C9CFA4', '#B3BB89', '#9CA570', '#C9B892', '#B59D72', '#9A8159', '#7E6747'];
const hypso = (h: number) =>
  HYPSO[Math.min(HYPSO.length - 1, Math.floor(((h - DTM_MIN) / (DTM_MAX - DTM_MIN + 1e-6)) * HYPSO.length))];

// Contours from the same height model (marching squares, 25 m interval).
const CONTOUR_STEP = 25;
const CONTOURS: { level: number; d: string }[] = (() => {
  const N = 80;
  const s = 100 / N;
  const v: number[][] = [];
  for (let j = 0; j <= N; j++) {
    v[j] = [];
    for (let i = 0; i <= N; i++) v[j][i] = heightAt(i * s, j * s);
  }
  const out: { level: number; d: string }[] = [];
  const lo = Math.ceil(DTM_MIN / CONTOUR_STEP) * CONTOUR_STEP;
  for (let level = lo; level < DTM_MAX + 30; level += CONTOUR_STEP) {
    let d = '';
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], e = v[j + 1][i];
        const x0 = i * s, y0 = j * s;
        const lerp = (p: number, q: number) => (level - p) / (q - p);
        const pts: Pt[] = [];
        if ((a < level) !== (b < level)) pts.push([x0 + lerp(a, b) * s, y0]);
        if ((b < level) !== (c < level)) pts.push([x0 + s, y0 + lerp(b, c) * s]);
        if ((e < level) !== (c < level)) pts.push([x0 + lerp(e, c) * s, y0 + s]);
        if ((a < level) !== (e < level)) pts.push([x0, y0 + lerp(a, e) * s]);
        for (let k = 0; k + 1 < pts.length; k += 2) {
          d += `M${pts[k][0].toFixed(2)} ${pts[k][1].toFixed(2)}L${pts[k + 1][0].toFixed(2)} ${pts[k + 1][1].toFixed(2)}`;
        }
      }
    }
    if (d) out.push({ level, d });
  }
  return out;
})();

const MAIN_ROAD_D = smoothPath(MAIN_ROAD);
const RING_D = smoothPath(SETTLEMENT_RING, true);
const SECONDARY_D = SECONDARY_ROADS.map((r) => smoothPath(r));
const TRACK_D = smoothPath(TRACK);
const WADI_D = smoothPath(WADI);
const MAIN_ROAD_SAMPLES = sampleSmooth(MAIN_ROAD);

// ── Shared label plate (white pill — no stroke halos) ────────────────────

function Plate({ x, y, text, size, className }: { x: number; y: number; text: string; size: number; className: string }) {
  const w = text.length * size * 0.58 + size * 0.9;
  const h = size * 1.45;
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} className="fill-bg-elevated" opacity={0.94} />
      <text x={x} y={y + size * 0.35} textAnchor="middle" fontSize={size} className={cn('font-display font-bold', className)}>
        {text}
      </text>
    </g>
  );
}

// ── Layer content (shared by the stack sheets and the composed map) ──────

function LayerContent({ id, sheet = false }: { id: LayerId; sheet?: boolean }) {
  if (id === 'elevation') {
    return (
      <g>
        {DTM.map((h, i) => (
          <rect
            key={i}
            x={(i % DTM_N) * 5}
            y={Math.floor(i / DTM_N) * 5}
            width={5.06}
            height={5.06}
            fill={hypso(h)}
          />
        ))}
      </g>
    );
  }
  if (id === 'roads') {
    const k = sheet ? 1.35 : 1;
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[...SECONDARY_D, RING_D].map((d, i) => (
          <g key={i}>
            <path d={d} className="stroke-fg" strokeWidth={1.5 * k} opacity={0.75} />
            <path d={d} className="stroke-paper-bright" strokeWidth={0.75 * k} />
          </g>
        ))}
        <path d={TRACK_D} className="stroke-fg-muted" strokeWidth={0.55 * k} strokeDasharray="1.2 0.9" opacity={0.8} />
        <path d={MAIN_ROAD_D} className="stroke-fg" strokeWidth={2.3 * k} opacity={0.85} />
        <path d={MAIN_ROAD_D} className="stroke-paper-bright" strokeWidth={1.3 * k} />
      </g>
    );
  }
  if (id === 'buildings') {
    return (
      <g className="fill-fg-muted stroke-paper-bright" strokeWidth={0.25}>
        {BUILDINGS.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>
    );
  }
  return (
    <g>
      {THREATS.map((t, i) => (
        <g key={i}>
          <circle cx={t.at[0]} cy={t.at[1]} r={t.r} className="fill-status-danger/10 stroke-status-danger" strokeWidth={sheet ? 0.6 : 0.4} strokeDasharray="1.2 0.8" />
          <circle cx={t.at[0]} cy={t.at[1]} r={sheet ? 2 : 1.4} className="fill-status-danger stroke-bg-elevated" strokeWidth={0.4} />
        </g>
      ))}
    </g>
  );
}

const LAYER_ORDER: LayerId[] = ['elevation', 'roads', 'buildings', 'threats'];

/** Composed top-down map — what you see looking straight down through the stack. */
export function LayerComposite({ activeLayers, emptyLabel }: { activeLayers: Set<LayerId>; emptyLabel: string }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 100 100" className="block h-full w-full" aria-hidden>
      <rect width="100" height="100" className="fill-bg-accent" />
      {LAYER_ORDER.map((id) =>
        activeLayers.has(id) ? (
          <motion.g key={id} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <LayerContent id={id} />
          </motion.g>
        ) : null,
      )}
      {activeLayers.size === 0 && <Plate x={50} y={50} text={emptyLabel} size={4} className="fill-fg-dim" />}
    </svg>
  );
}

// Oblique "sheet" projection (rotate + squash; determinant > 0, so never mirrored).
const SA = 0.85, SB = 0.22, SC = -0.62, SD = 0.3;
const SHEET_GAP = 27;
const STACK_X = 64; // x of the sheet origin (its north-west corner)
const STACK_TOP = 8;
/** Sheet corners in stack space, for the outline polygon. */
const sheetPt = (x: number, y: number): Pt => [SA * x + SC * y, SB * x + SD * y];
const SHEET_OUTLINE = [sheetPt(0, 0), sheetPt(100, 0), sheetPt(100, 100), sheetPt(0, 100)]
  .map((p) => p.join(','))
  .join(' ');

/**
 * Exploded layer stack — each layer is a transparent sheet ("שקף שקוף").
 * Active sheets sit in the stack; an inactive one slides out and shows only
 * its empty frame. Mouse users can click a sheet; the toggle buttons above are
 * the keyboard path, so the drawing itself is aria-hidden.
 */
export function LayerStack({
  activeLayers,
  labels,
  onToggle,
}: {
  activeLayers: Set<LayerId>;
  labels: Record<LayerId, string>;
  onToggle: (id: LayerId) => void;
}) {
  const reduce = useReducedMotion();
  // bottom (DTM) is index 0 → lowest on screen
  return (
    <svg viewBox="-16 0 224 150" className="block h-full w-full" aria-hidden>
      {LAYER_ORDER.map((id, i) => {
        const on = activeLayers.has(id);
        const oy = STACK_TOP + (LAYER_ORDER.length - 1 - i) * SHEET_GAP;
        const right = sheetPt(100, 0); // the sheet's east corner → label anchor
        return (
          <g key={id} onClick={() => onToggle(id)} style={{ cursor: 'pointer' }}>
            {/* only the sheet slides out and fades — its label stays put and legible */}
            <motion.g
              initial={false}
              animate={{ x: on ? 0 : -14, opacity: on ? 1 : 0.55 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }}
            >
              <g transform={`translate(${STACK_X} ${oy})`}>
                <g transform={`matrix(${SA} ${SB} ${SC} ${SD} 0 0)`}>
                  {/* the transparent sheet itself */}
                  <rect width="100" height="100" className="fill-bg-elevated" opacity={id === 'elevation' ? 1 : on ? 0.32 : 0.15} />
                  {on && <LayerContent id={id} sheet />}
                </g>
                <polygon
                  points={SHEET_OUTLINE}
                  fill="none"
                  className={on ? 'stroke-fg-muted' : 'stroke-fg-dim'}
                  strokeWidth={0.5}
                  strokeDasharray={on ? undefined : '2 1.5'}
                  strokeLinejoin="round"
                />
              </g>
            </motion.g>
            <Plate
              x={STACK_X + right[0] + 24}
              y={oy + right[1] + 4}
              text={labels[id]}
              size={6.2}
              className={on ? 'fill-fg' : 'fill-fg-muted'}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ── "ראסטר מול וקטור" ────────────────────────────────────────────────────

export const RASTER_N = 16;
const CELL = 100 / RASTER_N;
const cellOf = ([x, y]: Pt) => Math.min(RASTER_N - 1, Math.floor(y / CELL)) * RASTER_N + Math.min(RASTER_N - 1, Math.floor(x / CELL));
/** Raster cells the main road passes through, and the site's cell. */
export const ROAD_CELLS = new Set(MAIN_ROAD_SAMPLES.map(cellOf));
export const SITE_CELL = cellOf(SITE);

/** Mean colour of each 16×16 cell of the photo (computed client-side, no extra asset). */
export function useCellColors(src: string): string[] | null {
  const [colors, setColors] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      const S = 128;
      const k = S / RASTER_N;
      const c = document.createElement('canvas');
      c.width = S;
      c.height = S;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, S, S);
      const px = ctx.getImageData(0, 0, S, S).data;
      const out: string[] = [];
      for (let cy = 0; cy < RASTER_N; cy++) {
        for (let cx = 0; cx < RASTER_N; cx++) {
          let r = 0, g = 0, b = 0;
          for (let y = cy * k; y < (cy + 1) * k; y++) {
            for (let x = cx * k; x < (cx + 1) * k; x++) {
              const o = (y * S + x) * 4;
              r += px[o];
              g += px[o + 1];
              b += px[o + 2];
            }
          }
          const n = k * k;
          out.push(`rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`);
        }
      }
      if (alive) setColors(out);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return colors;
}

/**
 * Pixel grid over the orthophoto. One cell is the selected "pixel"; its single
 * value (the cell's mean colour) is shown enlarged beside it. When a vector
 * feature is selected, the raster cells it crosses are outlined — the raster
 * holds only cell values, it has no "road" object.
 */
/** Where the panel's two HTML chips sit, in 0–100 panel units (top-end "◧ ראסטר", bottom-start value chip). */
const CHIP_ZONES = [
  { x0: 0, y0: 0, x1: 19, y1: 8.5, id: 'top' as const },
  { x0: 63, y0: 91.5, x1: 100, y1: 100, id: 'bottom' as const },
];
type Box = { x0: number; y0: number; x1: number; y1: number };
const hits = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const cellBox = (c: number): Box => {
  const x = (c % RASTER_N) * CELL, y = Math.floor(c / RASTER_N) * CELL;
  return { x0: x, y0: y, x1: x + CELL, y1: y + CELL };
};
/** Which chip (if any) sits over a cell — the scene fades that chip so the pick stays visible. */
export function chipOverCell(cell: number | null): 'top' | 'bottom' | null {
  if (cell === null) return null;
  return CHIP_ZONES.find((z) => hits(z, cellBox(cell)))?.id ?? null;
}

/** Loupe spot: first candidate beside the cell that stays in frame and clear of chips and traced cells. */
function placeLoupe(cell: number, traced: Set<number> | null): Box {
  const c = cellBox(cell);
  const S = CELL * 2;
  const cands: [number, number][] = [
    [c.x1 + CELL * 0.9, c.y0 - CELL * 0.5],
    [c.x0 - CELL * 0.9 - S, c.y0 - CELL * 0.5],
    [c.x1 + CELL * 0.9, c.y1 - S - CELL * 1.5],
    [c.x0 - CELL * 0.9 - S, c.y1 - S - CELL * 1.5],
    [c.x1 + CELL * 0.9, c.y0 + CELL * 1.5],
    [c.x0 - CELL * 0.9 - S, c.y0 + CELL * 1.5],
    [c.x0 - CELL * 0.5, c.y0 - CELL * 0.9 - S],
    [c.x0 - CELL * 0.5, c.y1 + CELL * 0.9],
  ];
  const boxes = cands.map(([x, y]) => ({ x0: x, y0: y, x1: x + S, y1: y + S }));
  const inFrame = (b: Box) => b.x0 >= 0.6 && b.y0 >= 0.6 && b.x1 <= 99.4 && b.y1 <= 99.4;
  const free = (b: Box) =>
    !CHIP_ZONES.some((z) => hits(z, b)) && !(traced && [...traced].some((t) => hits(cellBox(t), b)));
  return boxes.find((b) => inFrame(b) && free(b)) ?? boxes.find(inFrame) ?? boxes[0];
}
/** Point where the ray from a box centre toward (tx, ty) leaves the box. */
function exitPoint(b: Box, tx: number, ty: number): Pt {
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const dx = tx - cx, dy = ty - cy;
  const k = Math.min((b.x1 - b.x0) / 2 / Math.max(1e-6, Math.abs(dx)), (b.y1 - b.y0) / 2 / Math.max(1e-6, Math.abs(dy)));
  return [cx + dx * k, cy + dy * k];
}

export function RasterGridOverlay({
  selectedCell,
  colors,
  traced,
}: {
  selectedCell: number | null;
  colors: string[] | null;
  traced: Set<number> | null;
}) {
  const sx = selectedCell === null ? 0 : (selectedCell % RASTER_N) * CELL;
  const sy = selectedCell === null ? 0 : Math.floor(selectedCell / RASTER_N) * CELL;
  const loupe = selectedCell === null ? null : placeLoupe(selectedCell, traced);
  const cellB: Box = { x0: sx, y0: sy, x1: sx + CELL, y1: sy + CELL };
  const lc: Pt = loupe ? [(loupe.x0 + loupe.x1) / 2, (loupe.y0 + loupe.y1) / 2] : [0, 0];
  const a = exitPoint(cellB, lc[0], lc[1]);
  const b = loupe ? exitPoint(loupe, sx + CELL / 2, sy + CELL / 2) : a;
  const lines = Array.from({ length: RASTER_N - 1 }, (_, i) => ((i + 1) * 100) / RASTER_N);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {/* dual-tone grid: dark casing + light line, reads over forest and bare fields */}
      {lines.map((p) => (
        <g key={p}>
          <line x1={p} y1="0" x2={p} y2="100" stroke="#1c1c1c" strokeWidth="0.4" opacity="0.18" />
          <line x1="0" y1={p} x2="100" y2={p} stroke="#1c1c1c" strokeWidth="0.4" opacity="0.18" />
          <line x1={p} y1="0" x2={p} y2="100" stroke="#FFFBF7" strokeWidth="0.18" opacity="0.32" />
          <line x1="0" y1={p} x2="100" y2={p} stroke="#FFFBF7" strokeWidth="0.18" opacity="0.32" />
        </g>
      ))}
      {traced &&
        [...traced].map((c) => (
          <rect
            key={c}
            x={(c % RASTER_N) * CELL}
            y={Math.floor(c / RASTER_N) * CELL}
            width={CELL}
            height={CELL}
            className="fill-accent/25 stroke-accent"
            strokeWidth="0.35"
          />
        ))}
      {selectedCell !== null && loupe && (
        <g>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="stroke-bg-elevated" strokeWidth="0.45" />
          <rect x={sx} y={sy} width={CELL} height={CELL} fill="none" className="stroke-accent" strokeWidth="0.9" />
          <rect x={loupe.x0} y={loupe.y0} width={CELL * 2} height={CELL * 2} rx="0.6" className="stroke-bg-elevated" strokeWidth="0.8" fill={colors?.[selectedCell] ?? 'transparent'} />
        </g>
      )}
    </svg>
  );
}

export type VectorFeature = 'road' | 'site';

/**
 * The same area as clean vector objects: fields (polygons), wadi and roads
 * (lines), settlement (polygons), observation site (point + buffer).
 * The road and the site are the two rows of the attribute table — they are
 * selectable (mouse + keyboard) and linked to those rows.
 */
export function VectorAreaMap({
  selected,
  onSelect,
  labels,
}: {
  selected: VectorFeature | null;
  onSelect: (f: VectorFeature | null) => void;
  labels: { buildings: string; site: string; road: string; wadi: string };
}) {
  const key = (f: VectorFeature) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(selected === f ? null : f);
    }
  };
  const click = (f: VectorFeature) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(selected === f ? null : f);
  };
  const roadOn = selected === 'road';
  const siteOn = selected === 'site';
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      onClick={() => onSelect(null)}
    >
      <rect width="100" height="100" className="fill-bg-elevated" />

      {/* contours — the same height model as the DTM layer above */}
      <g fill="none" className="stroke-tanline-contour" strokeLinecap="round">
        {CONTOURS.map((c) => (
          <path key={c.level} d={c.d} strokeWidth={c.level % 100 === 0 ? 0.32 : 0.18} opacity={c.level % 100 === 0 ? 0.85 : 0.6} />
        ))}
      </g>

      {/* fields (polygons) */}
      <g className="fill-brand/10 stroke-brand-dark/50" strokeWidth="0.25" strokeLinejoin="round">
        {FIELDS.map((f, i) => (
          <polygon key={i} points={f.map((p) => p.join(',')).join(' ')} />
        ))}
      </g>

      {/* wadi (line) */}
      <path d={WADI_D} fill="none" className="stroke-terrain-sky" strokeWidth="0.7" strokeLinecap="round" opacity="0.85" />

      {/* secondary roads + track */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[...SECONDARY_D, RING_D].map((d, i) => (
          <g key={i}>
            <path d={d} className="stroke-fg-dim" strokeWidth="1.2" />
            <path d={d} className="stroke-bg-elevated" strokeWidth="0.55" />
          </g>
        ))}
        <path d={TRACK_D} className="stroke-fg-dim" strokeWidth="0.5" strokeDasharray="1.1 0.8" />
      </g>

      {/* buildings (polygons) */}
      <g className="fill-fg-muted/80 stroke-bg-elevated" strokeWidth="0.2">
        {BUILDINGS.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>

      {/* main road (line) — attribute row 1 */}
      <g
        role="button"
        tabIndex={0}
        aria-pressed={roadOn}
        aria-label={labels.road}
        onClick={click('road')}
        onKeyDown={key('road')}
        className="group cursor-pointer outline-none"
      >
        <path d={MAIN_ROAD_D} fill="none" stroke="transparent" strokeWidth="5" />
        <path d={MAIN_ROAD_D} fill="none" className={roadOn ? 'stroke-accent' : 'stroke-fg'} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" opacity={roadOn ? 1 : 0.8} />
        <path d={MAIN_ROAD_D} fill="none" className={roadOn ? 'stroke-accent-hover' : 'stroke-paper-bright'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={MAIN_ROAD_D} fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-60" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* observation site (point + buffer) — attribute row 2 */}
      <g
        role="button"
        tabIndex={0}
        aria-pressed={siteOn}
        aria-label={labels.site}
        onClick={click('site')}
        onKeyDown={key('site')}
        className="group cursor-pointer outline-none"
      >
        <circle cx={SITE[0]} cy={SITE[1]} r="4.5" className={siteOn ? 'fill-accent/15 stroke-accent' : 'fill-transparent stroke-status-danger/60'} strokeWidth="0.35" strokeDasharray="0.9 0.7" />
        <circle cx={SITE[0]} cy={SITE[1]} r="1.2" className={siteOn ? 'fill-accent' : 'fill-status-danger'} />
        <circle cx={SITE[0]} cy={SITE[1]} r="5.6" fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-70" strokeWidth="0.6" />
      </g>

      <Plate x={70} y={15.5} text={labels.buildings} size={3.2} className="fill-fg" />
      <Plate x={45.5} y={34.2} text={labels.site} size={3.2} className="fill-fg" />
      <Plate x={53} y={66} text={labels.road} size={3.2} className="fill-fg" />
      <Plate x={24} y={88} text={labels.wadi} size={3.2} className="fill-terrain-sky" />
    </svg>
  );
}
