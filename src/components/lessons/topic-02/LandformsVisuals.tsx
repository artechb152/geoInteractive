'use client';

/**
 * LandformsVisuals — illustrations for LandformsScene ("תבניות נוף").
 *
 * Every landform is defined ONCE as a height field h(x, y) over a 100×50 map
 * tile. From that single source we derive both boards, so they always agree:
 *
 *   - "במציאות": a papercut diorama. Each contour level is a cut paper sheet
 *     (the region where h ≥ level) raised to its height in a gentle
 *     axonometric view — coloured top face, cream paper edge shaded by the
 *     way it faces the light, soft drop shadow under every sheet.
 *   - "במפה": the same levels traced as contour lines (marching squares) with
 *     a constant 10 m interval and a heavier index contour at 150.
 *
 * The landform's key feature (summit / spur axis / drainage line / saddle
 * point / depression rim) is marked the same way in both views. Copy strings
 * are passed in from the scene (single source of copy).
 */

import { useId, useMemo, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/* ── Shared geometry ─────────────────────────────────────────────────────── */

export type LandformId = 'hill' | 'spur' | 'valley' | 'saddle' | 'depression';

type Pt = [number, number];
type HeightFn = (x: number, y: number) => number;

const TW = 100; // tile width  (map units)
const TH = 50; // tile depth  (map units)
const BASE = 100; // elevation of the base plain (m)
const LEVELS = [110, 120, 130, 140, 150, 160]; // contour interval 10 m
const INDEX_LEVEL = 150; // index contour (every 5th line)

// Map board window (plan view, north up).
const VB_X = -6;
const VB_W = 112;
const MAP_Y = -2.5;
const MAP_H = 55;

// Diorama camera: the tile is turned ROT degrees and seen from above-front-right
// (a gentle axonometric, like the course's isometric papercut art), so a spur
// shows its flank and a valley opens toward the viewer.
const ROT = (32 * Math.PI) / 180;
const CR = Math.cos(ROT);
const SR = Math.sin(ROT);
const KY = 0.4; // foreshortening of the ground plane
const VIEW: Pt = [SR, CR]; // plan direction pointing toward the viewer
const planX = (x: number, y: number) => x * CR - y * SR;
const planY = (x: number, y: number) => (x * SR + y * CR) * KY;
const REAL_X = planX(0, 50) - 3; // tile's front-left corner + margin
const REAL_W = planX(100, 0) - planX(0, 50) + 6;
const REAL_H = 59; // reality board viewBox height
const BASE_SLAB = 2.4; // base slab thickness in screen units

// Illustration palette (design-spec §3 illustration colours + tanline tokens).
const C = {
  greenDeep: '#55613C',
  greenMid: '#6E7A4E',
  greenLight: '#8A9163',
  paperEdge: '#E8DCC4',
  rim: '#C9B892',
  contour: '#C9A56B', // tanline.contour
  contourIndex: '#8A6F4D', // tanline.badge (warm brown)
  river: '#7FB4C6',
  riverDeep: '#4F8FA6',
  ink: '#38432E',
  accent: '#D97E2B',
  paper: '#FDFBF3',
  hairline: '#DCCDB2',
  hairlineSoft: '#ECE4D2',
};

const E = Math.exp;

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const k = Math.min(1, Math.max(0, t));
  return (
    '#' +
    pa
      .map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0'))
      .join('')
  );
}

// Sheet colours by elevation — sand base, then sage → deep olive as the ground
// rises (the map tint follows the same logic: deeper tint = higher ground).
// Neighbouring sheets alternate slightly so every paper layer reads on its own.
const SAND = mix(C.rim, C.paperEdge, 0.45);
const LOW_FACE = mix(C.greenLight, C.paperEdge, 0.55);
function faceColor(z: number): string {
  if (z <= BASE) return SAND;
  const t = (z - LEVELS[0]) / (LEVELS[LEVELS.length - 1] - LEVELS[0]);
  const c = t < 0.5 ? mix(LOW_FACE, C.greenLight, t / 0.5) : mix(C.greenLight, C.greenMid, (t - 0.5) / 0.5);
  return Math.round((z - BASE) / 10) % 2 ? c : mix(c, C.paperEdge, 0.1);
}

// Paper-edge (wall) colour by how squarely the wall faces the light (front-left).
const WALL_LIT = mix(C.paperEdge, '#FFFFFF', 0.3);
const WALL_SHADE = mix(C.rim, C.greenDeep, 0.3);
const LIGHT: Pt = [-0.514, 0.857]; // plan components of the (unit) light vector
const SHADES = 8;
const wallColor = (s: number) => mix(WALL_SHADE, WALL_LIT, s);

/* ── Landform definitions ────────────────────────────────────────────────── */

type Spec = {
  h: HeightFn;
  kz: number; // oblique: screen-y per metre of elevation (vertical exaggeration)
  highlight?: number; // level whose closed contour is the key feature
  numbers: { level: number; at: Pt }[]; // elevation labels on the map
};

const SPECS: Record<LandformId, Spec> = {
  hill: {
    h: (x, y) => {
      const dx = (x - 50) / 23;
      const dy = (y - 25) / 12.5;
      const th = Math.atan2(dy, dx);
      const r2 = (dx * dx + dy * dy) * (1 + 0.08 * Math.sin(2 * th + 0.7) + 0.05 * Math.cos(3 * th - 0.4));
      return BASE + 68 * E(-0.9 * r2);
    },
    kz: 0.28,
    highlight: 160,
    numbers: [
      { level: 150, at: [66, 25] },
      { level: 110, at: [84, 25] },
    ],
  },
  spur: {
    h: (x, y) => {
      const b = 22 * E(-(((x - 50) / 11) ** 2));
      return 170 - 1.8 * (y + 3 - b) + 0.8 * Math.sin(x * 0.19);
    },
    kz: 0.23,
    numbers: [
      { level: 150, at: [16, 12] },
      { level: 120, at: [16, 29] },
    ],
  },
  valley: {
    h: (x, y) => {
      const v = 18 * Math.max(0, 1 - Math.abs(x - 50) / 17) ** 1.5;
      const s = 5 * (E(-(((x - 16) / 10) ** 2)) + E(-(((x - 84) / 10) ** 2)));
      return 160 - 1.8 * (y - 20 + v - s);
    },
    kz: 0.23,
    numbers: [
      { level: 150, at: [86, 27] },
      { level: 120, at: [86, 44] },
    ],
  },
  saddle: {
    h: (x, y) => {
      const q = (cx: number) => ((x - cx) / 11) ** 2 + ((y - 25) / 11.5) ** 2;
      return (
        BASE +
        42.6 * (E(-q(26)) + E(-q(74))) +
        35.3 * E(-(((y - 25) / 10.5) ** 2)) * E(-(((x - 50) / 30) ** 4))
      );
    },
    kz: 0.24,
    numbers: [
      { level: 150, at: [26, 17] },
      { level: 130, at: [50, 13] },
    ],
  },
  depression: {
    h: (x, y) => {
      const dx = (x - 50) / 31;
      const dy = (y - 24) / 18;
      const th = Math.atan2(dy, dx);
      const r = Math.sqrt(dx * dx + dy * dy) * (1 + 0.05 * Math.sin(3 * th + 1));
      return 112 + 40 * Math.min(1, r) ** 1.25;
    },
    kz: 0.2,
    highlight: 150,
    numbers: [
      { level: 150, at: [82, 24] },
      { level: 130, at: [64, 24] },
    ],
  },
};

/* ── Contouring (marching squares on a padded grid) ──────────────────────── */

type Grid = { PX: number; PY: number; xs: Float64Array; ys: Float64Array; v: Float64Array };

const STEP = 1;
const PAD = -1e9;

function sampleGrid(f: HeightFn): Grid {
  const nx = Math.round(TW / STEP) + 1;
  const ny = Math.round(TH / STEP) + 1;
  // One padding ring (far below every level) closes all regions along the
  // tile border, so every level yields closed rings we can fill.
  const PX = nx + 2;
  const PY = ny + 2;
  const xs = new Float64Array(PX);
  const ys = new Float64Array(PY);
  for (let i = 0; i < PX; i++) xs[i] = i === 0 ? -1e-3 : i === PX - 1 ? TW + 1e-3 : (i - 1) * STEP;
  for (let j = 0; j < PY; j++) ys[j] = j === 0 ? -1e-3 : j === PY - 1 ? TH + 1e-3 : (j - 1) * STEP;
  const v = new Float64Array(PX * PY);
  for (let j = 0; j < PY; j++) {
    for (let i = 0; i < PX; i++) {
      const edge = i === 0 || j === 0 || i === PX - 1 || j === PY - 1;
      v[j * PX + i] = edge ? PAD : f(xs[i], ys[j]);
    }
  }
  return { PX, PY, xs, ys, v };
}

function contourRings(g: Grid, L: number): Pt[][] {
  const { PX, PY, xs, ys, v } = g;
  const cache = new Map<number, Pt>();
  const pt = (key: number): Pt => {
    const hit = cache.get(key);
    if (hit) return hit;
    const base = key >> 1;
    const vert = key & 1;
    const i = base % PX;
    const j = (base - i) / PX;
    const i2 = vert ? i : i + 1;
    const j2 = vert ? j + 1 : j;
    const a = v[j * PX + i];
    const b = v[j2 * PX + i2];
    const t = (L - a) / (b - a);
    const p: Pt = [xs[i] + t * (xs[i2] - xs[i]), ys[j] + t * (ys[j2] - ys[j])];
    cache.set(key, p);
    return p;
  };

  const segs: number[] = [];
  for (let j = 0; j < PY - 1; j++) {
    for (let i = 0; i < PX - 1; i++) {
      const vtl = v[j * PX + i];
      const vtr = v[j * PX + i + 1];
      const vbr = v[(j + 1) * PX + i + 1];
      const vbl = v[(j + 1) * PX + i];
      const c = (vtl >= L ? 8 : 0) | (vtr >= L ? 4 : 0) | (vbr >= L ? 2 : 0) | (vbl >= L ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const T = (j * PX + i) * 2;
      const B = ((j + 1) * PX + i) * 2;
      const Lf = (j * PX + i) * 2 + 1;
      const R = (j * PX + i + 1) * 2 + 1;
      const centerIn = (vtl + vtr + vbr + vbl) / 4 >= L;
      switch (c) {
        case 1: case 14: segs.push(Lf, B); break;
        case 2: case 13: segs.push(B, R); break;
        case 3: case 12: segs.push(Lf, R); break;
        case 4: case 11: segs.push(T, R); break;
        case 6: case 9: segs.push(T, B); break;
        case 7: case 8: segs.push(T, Lf); break;
        case 5:
          if (centerIn) segs.push(T, Lf, B, R);
          else segs.push(Lf, B, T, R);
          break;
        case 10:
          if (centerIn) segs.push(T, R, Lf, B);
          else segs.push(T, Lf, B, R);
          break;
      }
    }
  }

  const nSeg = segs.length / 2;
  const adj = new Map<number, number[]>();
  for (let s = 0; s < nSeg; s++) {
    for (const k of [segs[2 * s], segs[2 * s + 1]]) {
      const list = adj.get(k);
      if (list) list.push(s);
      else adj.set(k, [s]);
    }
  }
  const used = new Uint8Array(nSeg);
  const rings: Pt[][] = [];
  for (let s0 = 0; s0 < nSeg; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const startKey = segs[2 * s0];
    let key = segs[2 * s0 + 1];
    const ring: Pt[] = [pt(startKey), pt(key)];
    let prev = s0;
    for (;;) {
      if (key === startKey) break;
      const list = adj.get(key) ?? [];
      const next = list[0] === prev ? list[1] : list[0];
      if (next === undefined || used[next]) break;
      used[next] = 1;
      key = segs[2 * next] === key ? segs[2 * next + 1] : segs[2 * next];
      if (key !== startKey) ring.push(pt(key));
      prev = next;
    }
    // drop near-duplicate vertices (they appear where a ring hugs the border)
    const clean = ring.filter((p, i) => {
      const q = ring[(i + ring.length - 1) % ring.length];
      return i === 0 || Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > 0.02;
    });
    if (clean.length > 2) rings.push(clean);
  }
  return rings;
}

const onBorder = (p: Pt) => p[0] < 0.05 || p[0] > TW - 0.05 || p[1] < 0.05 || p[1] > TH - 0.05;
const isInterior = (ring: Pt[]) => !ring.some(onBorder);

type Landform = {
  spec: Spec;
  rings: Map<number, Pt[][]>; // level → rings of the region h ≥ level
  levels: number[]; // levels actually present on this tile
  terr: (x: number, y: number) => number; // terraced (stepped) elevation
  y0: number; // oblique-view vertical offset (centres the diorama)
  peaks: Pt[];
};

const cache = new Map<LandformId, Landform>();

function getLandform(id: LandformId): Landform {
  const hit = cache.get(id);
  if (hit) return hit;
  const spec = SPECS[id];
  const g = sampleGrid(spec.h);
  const rings = new Map<number, Pt[][]>();
  const levels: number[] = [];
  for (const L of LEVELS) {
    const r = contourRings(g, L);
    if (r.length) {
      rings.set(L, r);
      levels.push(L);
    }
  }
  const terr = (x: number, y: number) => {
    const h = spec.h(x, y);
    let z = BASE;
    for (const L of levels) if (h >= L) z = L;
    return z;
  };
  // Vertical bounds of the oblique projection → centre it in the board.
  let minY = Infinity;
  for (let y = 0; y <= TH; y += 1) {
    for (let x = 0; x <= TW; x += 2) {
      minY = Math.min(minY, planY(x, y) - (terr(x, y) - BASE) * spec.kz);
    }
  }
  const maxY = planY(TW, TH) + BASE_SLAB;
  const y0 = (REAL_H - (maxY - minY)) / 2 - minY + 0.8;
  // Local maxima (grid) that stand on the top level = summits.
  const peaks: Pt[] = [];
  for (let y = 2; y < TH - 1; y++) {
    for (let x = 2; x < TW - 1; x++) {
      const h = spec.h(x, y);
      if (h < LEVELS[LEVELS.length - 1]) continue;
      let isMax = true;
      for (let dy = -1; dy <= 1 && isMax; dy++)
        for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && spec.h(x + dx, y + dy) > h) isMax = false;
      if (isMax) peaks.push([x, y]);
    }
  }
  const lf: Landform = { spec, rings, levels, terr, y0, peaks };
  cache.set(id, lf);
  return lf;
}

const f2 = (n: number) => n.toFixed(2);
const id = (p: Pt) => p;

function ringsPath(rings: Pt[][], proj: (p: Pt) => Pt): string {
  return rings
    .map((r) => 'M' + r.map((p) => proj(p)).map(([x, y]) => `${f2(x)},${f2(y)}`).join('L') + 'Z')
    .join('');
}

function polyPath(pts: Pt[]): string {
  return 'M' + pts.map(([x, y]) => `${f2(x)},${f2(y)}`).join('L');
}

/* ── Feature overlays (the key feature of each landform) ─────────────────── */

type Line = { from: Pt; to: Pt };

// Plan-view geometry of each key feature, shared by both boards.
const FEATURES: Record<LandformId, { axis?: Line; ridge?: Line; drain?: Line; point?: Pt }> = {
  hill: {},
  spur: { axis: { from: [50, 9], to: [50, 41] } },
  valley: { drain: { from: [50, 1], to: [50, 49.5] } },
  saddle: { ridge: { from: [26, 25], to: [74, 25] }, point: [50, 25] },
  depression: { point: [50, 24] },
};

function sampleLine(l: Line, step = 0.25): Pt[] {
  const [x1, y1] = l.from;
  const [x2, y2] = l.to;
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step));
  return Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n] as Pt);
}

function Arrowhead({ tip, dir, size = 2.2, fill }: { tip: Pt; dir: Pt; size?: number; fill: string }) {
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / len;
  const uy = dir[1] / len;
  const bx = tip[0] - ux * size;
  const by = tip[1] - uy * size;
  const w = size * 0.55;
  return (
    <polygon
      points={`${f2(tip[0])},${f2(tip[1])} ${f2(bx - uy * w)},${f2(by + ux * w)} ${f2(bx + uy * w)},${f2(by - ux * w)}`}
      fill={fill}
    />
  );
}

function Summit({ at, fill, size = 2.4 }: { at: Pt; fill: string; size?: number }) {
  const [x, y] = at;
  return (
    <polygon
      points={`${f2(x)},${f2(y - size)} ${f2(x - size * 0.62)},${f2(y + size * 0.1)} ${f2(x + size * 0.62)},${f2(y + size * 0.1)}`}
      fill={fill}
      stroke="#FFFFFF"
      strokeWidth={0.35}
      strokeLinejoin="round"
    />
  );
}

/* ── "במציאות" — papercut diorama ────────────────────────────────────────── */

type Layer = { z: number; face: string; walls: { shade: number; d: string }[] };

// Each level becomes a paper sheet: its top face (the region h ≥ level, lifted
// to its height) plus the visible edge walls down to the sheet below. Walls are
// built per contour segment so each can be shaded by the way it faces.
function buildLayers(lf: Landform): Layer[] {
  const { kz, h } = lf.spec;
  const { y0 } = lf;
  const P = (p: Pt, z: number): string =>
    `${f2(planX(p[0], p[1]))},${f2(y0 + planY(p[0], p[1]) - (z - BASE) * kz)}`;

  const layer = (z: number, zFrom: number, rings: Pt[][], isBase: boolean): Layer => {
    const buckets: string[][] = Array.from({ length: SHADES }, () => []);
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const ex = b[0] - a[0];
        const ey = b[1] - a[1];
        const len = Math.hypot(ex, ey);
        if (len < 1e-6) continue;
        let nx = ey / len;
        let ny = -ex / len;
        // orient the normal downhill (out of the sheet)
        const tx = (a[0] + b[0]) / 2 + nx * 0.4;
        const ty = (a[1] + b[1]) / 2 + ny * 0.4;
        const outside = tx < 0 || tx > TW || ty < 0 || ty > TH;
        if (!(isBase ? outside : outside || h(tx, ty) < z)) {
          nx = -nx;
          ny = -ny;
        }
        // faces away from the viewer → hidden under the sheet's own face
        if (nx * VIEW[0] + ny * VIEW[1] <= 0.02) continue;
        const lambert = nx * LIGHT[0] + ny * LIGHT[1];
        const s = Math.min(1, Math.max(0, 0.55 + 0.45 * lambert));
        const k = Math.round(s * (SHADES - 1));
        buckets[k].push(`M${P(a, z)}L${P(b, z)}L${P(b, zFrom)}L${P(a, zFrom)}Z`);
      }
    }
    return {
      z,
      face: rings
        .map((r) => 'M' + r.map((p) => P(p, z)).join('L') + 'Z')
        .join(''),
      walls: buckets
        .map((list, k) => ({ shade: k / (SHADES - 1), d: list.join('') }))
        .filter((w) => w.d.length > 0),
    };
  };

  const tile: Pt[][] = [[[0, 0], [TW, 0], [TW, TH], [0, TH]]];
  const out: Layer[] = [layer(BASE, BASE - BASE_SLAB / kz, tile, true)];
  let prev = BASE;
  for (const L of lf.levels) {
    out.push(layer(L, prev, lf.rings.get(L) ?? [], false));
    prev = L;
  }
  return out;
}

export function LandformReality({ form, ariaLabel }: { form: LandformId; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const lf = getLandform(form);
  const { kz } = lf.spec;
  const { y0 } = lf;
  const project = (x: number, y: number, z: number): Pt => [planX(x, y), y0 + planY(x, y) - (z - BASE) * kz];
  const onGround = (x: number, y: number): Pt => project(x, y, lf.terr(x, y));

  const layers = useMemo(() => buildLayers(lf), [lf]);
  const overlays = realityOverlays(form, lf, project);
  const footprint = ([[0, 0], [TW, 0], [TW, TH], [0, TH]] as Pt[])
    .map(([x, y]) => {
      const [sx, sy] = project(x, y, BASE);
      return `${f2(sx)},${f2(sy + BASE_SLAB + 0.9)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`${f2(REAL_X)} 0 ${f2(REAL_W)} ${REAL_H}`}
      className="block w-full h-auto"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F6EFE6" />
        </linearGradient>
        <filter id={`${uid}-lift`} x="-5%" y="-10%" width="110%" height="130%">
          <feDropShadow dx="0" dy="0.45" stdDeviation="0.45" floodColor="#3B3524" floodOpacity="0.26" />
        </filter>
        <filter id={`${uid}-soft`} x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      <rect x={REAL_X} y={0} width={REAL_W} height={REAL_H} fill={`url(#${uid}-sky)`} />
      {/* soft contact shadow under the whole diorama */}
      <polygon points={footprint} fill="#5A4628" opacity={0.2} filter={`url(#${uid}-soft)`} />

      {layers.map((l, i) => (
        <motion.g
          key={l.z}
          filter={`url(#${uid}-lift)`}
          initial={reduce ? false : { opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.05 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* paper edges — shaded by how much each wall faces the light */}
          {l.walls.map((w) => (
            <path key={w.shade} d={w.d} fill={wallColor(w.shade)} stroke={wallColor(w.shade)} strokeWidth={0.12} strokeLinejoin="round" />
          ))}
          {/* top face of the sheet */}
          <path
            d={l.face}
            fillRule="evenodd"
            fill={faceColor(l.z)}
            stroke={C.greenDeep}
            strokeOpacity={0.35}
            strokeWidth={0.14}
            strokeLinejoin="round"
          />
          {overlays.get(l.z)}
        </motion.g>
      ))}

      {/* summits sit on the top sheet — nothing can hide them */}
      <motion.g
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.45 }}
      >
        {form === 'hill' &&
          lf.peaks.slice(0, 1).map((p, i) => <Summit key={i} at={onGround(p[0], p[1])} fill={C.accent} size={3} />)}
        {form === 'saddle' &&
          lf.peaks.map((p, i) => <Summit key={i} at={onGround(p[0], p[1])} fill={C.ink} size={2.2} />)}
      </motion.g>
    </svg>
  );
}

type Run = { z: number; pts: { p: Pt; z: number }[] };

// Split a plan-view line into runs lying on one sheet each. The vertical step
// between two sheets belongs to the higher one (it runs down that sheet's edge).
function splitByLevel(pts: Pt[], terr: (x: number, y: number) => number): Run[] {
  const runs: Run[] = [];
  let cur: Run | null = null;
  for (const p of pts) {
    const z = terr(p[0], p[1]);
    if (!cur || cur.z !== z) {
      const prev: Run | null = cur;
      cur = { z, pts: [] };
      runs.push(cur);
      if (prev) {
        if (prev.z > z) prev.pts.push({ p, z });
        else cur.pts.push(prev.pts[prev.pts.length - 1]);
      }
    }
    cur.pts.push({ p, z });
  }
  return runs;
}

// Key-feature marks for the diorama, grouped by the sheet they lie on so each is
// painted right after its sheet (and correctly hidden by any higher sheet).
function realityOverlays(
  form: LandformId,
  lf: Landform,
  project: (x: number, y: number, z: number) => Pt,
): Map<number, ReactNode[]> {
  const out = new Map<number, ReactNode[]>();
  const add = (z: number, node: ReactNode) => {
    const list = out.get(z);
    if (list) list.push(node);
    else out.set(z, [node]);
  };
  const feat = FEATURES[form];
  const runPath = (r: Run) => polyPath(r.pts.map(({ p, z }) => project(p[0], p[1], z)));

  if (lf.spec.highlight) {
    const rings = (lf.rings.get(lf.spec.highlight) ?? []).filter(isInterior);
    if (rings.length) {
      add(
        lf.spec.highlight,
        <path
          key="hl"
          d={ringsPath(rings, (p) => project(p[0], p[1], lf.spec.highlight!))}
          fill={form === 'hill' ? C.accent : 'none'}
          fillOpacity={0.28}
          stroke={C.accent}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />,
      );
    }
  }
  if (feat.axis) {
    splitByLevel(sampleLine(feat.axis), lf.terr).forEach((r, i) =>
      add(
        r.z,
        <path
          key={'ax' + i}
          d={runPath(r)}
          fill="none"
          stroke={C.accent}
          strokeWidth={0.65}
          strokeDasharray="1.6 1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      ),
    );
    const [ex, ey] = feat.axis.to;
    const zt = lf.terr(ex, ey + 2.6);
    const tip = project(ex, ey + 2.6, zt);
    const from = project(ex, ey, zt);
    add(zt, <Arrowhead key="axh" tip={tip} dir={[tip[0] - from[0], tip[1] - from[1]]} fill={C.accent} />);
  }
  if (feat.drain) {
    splitByLevel(sampleLine(feat.drain), lf.terr).forEach((r, i) =>
      add(
        r.z,
        <g key={'dr' + i} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={runPath(r)} stroke={C.riverDeep} strokeWidth={1.4} />
          <path d={runPath(r)} stroke={C.river} strokeWidth={0.85} />
        </g>,
      ),
    );
  }
  if (feat.ridge) {
    splitByLevel(sampleLine(feat.ridge), lf.terr).forEach((r, i) =>
      add(
        r.z,
        <path
          key={'rg' + i}
          d={runPath(r)}
          fill="none"
          stroke={C.accent}
          strokeWidth={0.6}
          strokeDasharray="1.4 0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      ),
    );
  }
  if (form === 'saddle' && feat.point) {
    const [x, y] = feat.point;
    const z = lf.terr(x, y);
    const [sx, sy] = project(x, y, z);
    add(z, <circle key="sp" cx={sx} cy={sy} r={1.3} fill={C.accent} stroke="#FFFFFF" strokeWidth={0.45} />);
  }
  return out;
}

/* ── "במפה" — contour map ─────────────────────────────────────────────────── */

export type LandformMapLabels = {
  toLow: string;
  toPeak: string;
  drainage: string;
  saddle: string;
  low: string;
};

function MapLabel({
  at,
  text,
  fill,
  size = 2.7,
  bg = '#FFFFFF',
  charW = 0.56,
}: {
  at: Pt;
  text: string;
  fill: string;
  size?: number;
  bg?: string;
  charW?: number;
}) {
  const w = text.length * size * charW + 1.6;
  const h = size + 1.1;
  return (
    <g>
      <rect x={at[0] - w / 2} y={at[1] - h / 2} width={w} height={h} rx={h / 2} fill={bg} opacity={0.94} />
      <text
        x={at[0]}
        y={at[1] + size * 0.36}
        textAnchor="middle"
        fontSize={size}
        fill={fill}
        className="font-display font-bold"
      >
        {text}
      </text>
    </g>
  );
}

function nearestOnLevel(lf: Landform, level: number, at: Pt): Pt | null {
  let best: Pt | null = null;
  let bd = Infinity;
  for (const r of lf.rings.get(level) ?? []) {
    for (const p of r) {
      if (onBorder(p)) continue;
      const d = (p[0] - at[0]) ** 2 + (p[1] - at[1]) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
  }
  return best;
}

// Short ticks on each depression contour, pointing downhill (into the pit).
function hachures(lf: Landform, level: number): string {
  const out: string[] = [];
  const h = lf.spec.h;
  for (const ring of (lf.rings.get(level) ?? []).filter(isInterior)) {
    let acc = 0;
    for (let i = 1; i <= ring.length; i++) {
      const a = ring[i - 1];
      const b = ring[i % ring.length];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc < 3.2) continue;
      acc = 0;
      const e = 0.3;
      const gx = (h(b[0] + e, b[1]) - h(b[0] - e, b[1])) / (2 * e);
      const gy = (h(b[0], b[1] + e) - h(b[0], b[1] - e)) / (2 * e);
      const g = Math.hypot(gx, gy) || 1;
      out.push(`M${f2(b[0])},${f2(b[1])}L${f2(b[0] - (gx / g) * 1.1)},${f2(b[1] - (gy / g) * 1.1)}`);
    }
  }
  return out.join('');
}

export function LandformMap({
  form,
  labels,
  ariaLabel,
}: {
  form: LandformId;
  labels: LandformMapLabels;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const lf = getLandform(form);
  const feat = FEATURES[form];
  const highlightRings = lf.spec.highlight ? (lf.rings.get(lf.spec.highlight) ?? []).filter(isInterior) : [];

  const contours = useMemo(() => lf.levels.map((L) => ({ L, d: ringsPath(lf.rings.get(L) ?? [], id) })), [lf]);

  return (
    <svg
      viewBox={`${VB_X} ${MAP_Y} ${VB_W} ${MAP_H}`}
      className="block w-full h-auto"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={`${uid}-tile`}>
          <rect x={0.2} y={0.2} width={TW - 0.4} height={TH - 0.4} />
        </clipPath>
      </defs>
      <rect x={VB_X} y={MAP_Y} width={VB_W} height={MAP_H} fill={C.paper} />
      <rect x={0} y={0} width={TW} height={TH} fill="#FFFFFF" />
      {/* map grid */}
      <g stroke={C.hairlineSoft} strokeWidth={0.18}>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={'x' + i} x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={TH} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={'y' + i} x1={0} y1={(i + 1) * 10} x2={TW} y2={(i + 1) * 10} />
        ))}
      </g>

      <motion.g
        clipPath={`url(#${uid}-tile)`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.1 }}
      >
        {/* faint layer tint — deeper tint = higher ground, like the diorama */}
        {contours.map(({ L, d }) => (
          <path key={'t' + L} d={d} fillRule="evenodd" fill={C.greenLight} fillOpacity={0.045} />
        ))}
        {contours.map(({ L, d }) => (
          <path
            key={L}
            d={d}
            fill="none"
            stroke={L === INDEX_LEVEL ? C.contourIndex : C.contour}
            strokeWidth={L === INDEX_LEVEL ? 0.55 : 0.32}
            strokeLinejoin="round"
          />
        ))}
        {form === 'depression' && (
          <path
            d={lf.levels.map((L) => hachures(lf, L)).join('')}
            fill="none"
            stroke={C.contourIndex}
            strokeWidth={0.28}
            strokeLinecap="round"
          />
        )}
      </motion.g>
      <rect x={0} y={0} width={TW} height={TH} fill="none" stroke={C.hairline} strokeWidth={0.35} />

      {/* key contour — matches the highlighted sheet on the diorama */}
      {highlightRings.length > 0 && (
        <motion.path
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.45 }}
          d={ringsPath(highlightRings, id)}
          fill={form === 'hill' ? C.accent : 'none'}
          fillOpacity={0.14}
          stroke={C.accent}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      )}

      {/* elevation numbers on the lines (metres) */}
      {lf.spec.numbers.map(({ level, at }) => {
        const p = nearestOnLevel(lf, level, at);
        return p ? (
          <MapLabel key={level} at={p} text={String(level)} fill={C.contourIndex} size={2.3} charW={0.62} />
        ) : null;
      })}

      {/* key feature — matches the marks on the diorama */}
      <motion.g
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.45 }}
      >
        {form === 'hill' && lf.peaks.slice(0, 1).map((p, i) => <Summit key={i} at={[p[0], p[1] + 1]} fill={C.accent} size={2.6} />)}

        {form === 'spur' && feat.axis && (
          <>
            <line
              x1={feat.axis.from[0]}
              y1={feat.axis.from[1]}
              x2={feat.axis.to[0]}
              y2={feat.axis.to[1]}
              stroke={C.accent}
              strokeWidth={0.6}
              strokeDasharray="1.6 1"
              strokeLinecap="round"
            />
            <Arrowhead tip={[feat.axis.to[0], feat.axis.to[1] + 2.4]} dir={[0, 1]} fill={C.accent} />
            <MapLabel at={[50, 47]} text={labels.toLow} fill={C.accent} />
          </>
        )}

        {form === 'valley' && feat.drain && (
          <>
            <line
              x1={feat.drain.from[0]}
              y1={feat.drain.from[1]}
              x2={feat.drain.to[0]}
              y2={feat.drain.to[1]}
              stroke={C.river}
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            {/* reading cue: the V's apex points up-valley, toward the high ground */}
            <line x1={59} y1={38} x2={59} y2={12} stroke={C.accent} strokeWidth={0.55} strokeLinecap="round" />
            <Arrowhead tip={[59, 9.4]} dir={[0, -1]} fill={C.accent} />
            <MapLabel at={[59, 5.6]} text={labels.toPeak} fill={C.accent} />
            <MapLabel at={[50, 45.5]} text={labels.drainage} fill={C.riverDeep} />
          </>
        )}

        {form === 'saddle' && feat.ridge && feat.point && (
          <>
            {lf.peaks.map((p, i) => (
              <Summit key={i} at={[p[0], p[1] + 1]} fill={C.ink} size={2.2} />
            ))}
            <line
              x1={feat.ridge.from[0] + 3}
              y1={feat.ridge.from[1]}
              x2={feat.ridge.to[0] - 3}
              y2={feat.ridge.to[1]}
              stroke={C.accent}
              strokeWidth={0.55}
              strokeDasharray="1.4 0.9"
              strokeLinecap="round"
            />
            <circle cx={feat.point[0]} cy={feat.point[1]} r={1.2} fill={C.accent} stroke="#FFFFFF" strokeWidth={0.4} />
            <MapLabel at={[50, 31]} text={labels.saddle} fill={C.accent} />
          </>
        )}

        {form === 'depression' && feat.point && <MapLabel at={feat.point} text={labels.low} fill={C.accent} />}
      </motion.g>
    </svg>
  );
}

/* ── Slopes — linked side profile + contour strip ────────────────────────── */

// [d, e] normalized — d = horizontal distance from the foot (0) to the crest (1),
// e = height in equal contour intervals (0 = foot, 1 = crest). The same crossings feed
// both the side profile and the map view, so a steep segment reads as tight contours.
export const SLOPE_GEO: Record<string, [number, number][]> = {
  even: [[0, 0], [0.2, 0.2], [0.4, 0.4], [0.6, 0.6], [0.8, 0.8], [1, 1]],
  convex: [[0, 0], [0.04, 0.2], [0.16, 0.4], [0.36, 0.6], [0.64, 0.8], [1, 1]],
  concave: [[0, 0], [0.36, 0.2], [0.64, 0.4], [0.84, 0.6], [0.96, 0.8], [1, 1]],
  shoulder: [[0, 0], [0.1, 0.2], [0.2, 0.4], [0.75, 0.6], [0.86, 0.8], [1, 1]],
};

const geoOf = (slope: string) => SLOPE_GEO[slope] ?? SLOPE_GEO.even;

// Monotone cubic (Fritsch–Carlson) through the crossings — a smooth slope that
// still passes exactly through every equal-height crossing.
function monotoneSegments(pts: [number, number][]): { c1: Pt; c2: Pt; to: Pt }[] {
  const n = pts.length;
  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(pts[i + 1][0] - pts[i][0]);
    delta.push((pts[i + 1][1] - pts[i][1]) / h[i]);
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }
  return pts.slice(0, -1).map(([d, e], i) => {
    const [d2, e2] = pts[i + 1];
    return {
      c1: [d + h[i] / 3, e + (m[i] * h[i]) / 3] as Pt,
      c2: [d2 - h[i] / 3, e2 - (m[i + 1] * h[i]) / 3] as Pt,
      to: [d2, e2] as Pt,
    };
  });
}

// Profile board geometry (viewBox 0 0 200 56)
const P_W = 200;
const P_H = 51;
const sx = (d: number) => 30 + d * 144; // foot → crest, shared with the contour strip
const py = (e: number) => 40 - e * 29;
const P_GROUND = 40;
const P_BOTTOM = 45;
const P_LEFT = 18;
const P_RIGHT = 190;

function surfacePath(slope: string, X = sx, Y = py, left = P_LEFT, right = P_RIGHT): string {
  const pts = geoOf(slope);
  const segs = monotoneSegments(pts);
  let d = `M${f2(left)},${f2(Y(0))}L${f2(X(0))},${f2(Y(0))}`;
  for (const s of segs) {
    d += `C${f2(X(s.c1[0]))},${f2(Y(s.c1[1]))} ${f2(X(s.c2[0]))},${f2(Y(s.c2[1]))} ${f2(X(s.to[0]))},${f2(Y(s.to[1]))}`;
  }
  d += `L${f2(right)},${f2(Y(1))}`;
  return d;
}

const BAND_COLORS = [0, 1, 2, 3, 4].map((k) => faceColor(BASE + ((k + 0.5) / 5) * 60));
const ELEV = (e: number) => String(Math.round(100 + e * 100));

export function SlopeProfile({
  slope,
  bottomLabel,
  topLabel,
  ariaLabel,
}: {
  slope: string;
  bottomLabel: string;
  topLabel: string;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pts = geoOf(slope);
  const surface = surfacePath(slope);
  const body = `${surface}L${P_RIGHT},${P_BOTTOM}L${P_LEFT},${P_BOTTOM}Z`;
  const tr = { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <svg viewBox={`0 0 ${P_W} ${P_H}`} className="block w-full h-auto" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F6EFE6" />
        </linearGradient>
        <clipPath id={`${uid}-body`}>
          <motion.path initial={false} animate={{ d: body }} transition={tr} />
        </clipPath>
        <filter id={`${uid}-lift`} x="-5%" y="-20%" width="110%" height="150%">
          <feDropShadow dx="0" dy="0.7" stdDeviation="0.8" floodColor="#3B3524" floodOpacity="0.22" />
        </filter>
      </defs>
      <rect x={0} y={0} width={P_W} height={P_H} fill={`url(#${uid}-sky)`} />

      {/* equal-height reference lines + elevations (m) */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((e) => (
        <g key={e}>
          <line
            x1={18}
            y1={py(e)}
            x2={P_RIGHT + 4}
            y2={py(e)}
            stroke={C.contour}
            strokeOpacity={0.55}
            strokeWidth={0.28}
            strokeDasharray="1.4 1.2"
          />
          <text
            x={11}
            y={py(e) + 1.05}
            textAnchor="middle"
            fontSize={2.9}
            fill={C.contourIndex}
            className="font-display font-semibold"
          >
            {ELEV(e)}
          </text>
        </g>
      ))}

      {/* the terrain as a papercut cross-section: one band per contour interval */}
      <g filter={`url(#${uid}-lift)`}>
        <g clipPath={`url(#${uid}-body)`}>
          <rect x={P_LEFT} y={P_GROUND} width={P_RIGHT - P_LEFT} height={P_BOTTOM - P_GROUND} fill={C.rim} />
          {BAND_COLORS.map((col, k) => (
            <rect
              key={k}
              x={P_LEFT}
              y={py((k + 1) / 5)}
              width={P_RIGHT - P_LEFT}
              height={py(k / 5) - py((k + 1) / 5) + 0.02}
              fill={col}
            />
          ))}
        </g>
        <motion.path
          initial={false}
          animate={{ d: surface }}
          transition={tr}
          fill="none"
          stroke={C.greenDeep}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      </g>

      {/* drop lines — each crossing falls straight onto its contour line below */}
      {pts.map(([d, e], i) => (
        <motion.line
          key={'drop' + i}
          initial={false}
          animate={{ x1: sx(d), x2: sx(d), y1: py(e) }}
          transition={tr}
          y2={P_H}
          stroke={C.contourIndex}
          strokeOpacity={0.55}
          strokeWidth={0.3}
          strokeDasharray="0.9 0.9"
        />
      ))}
      {pts.slice(1, 5).map(([d, e], i) => (
        <motion.circle
          key={'dot' + i}
          initial={false}
          animate={{ cx: sx(d), cy: py(e) }}
          transition={tr}
          r={1.5}
          fill={C.accent}
          stroke="#FFFFFF"
          strokeWidth={0.5}
        />
      ))}

      {/* crest + foot */}
      <Summit at={[sx(1), py(1) - 0.9]} fill={C.ink} size={2.6} />
      <text x={sx(1) + 9} y={py(1) - 1.2} textAnchor="middle" fontSize={3.6} fill={C.ink} className="font-display font-bold">
        {topLabel}
      </text>
      <text x={sx(0) - 11} y={P_BOTTOM + 4.4} textAnchor="middle" fontSize={3.6} fill={C.ink} className="font-display font-bold">
        {bottomLabel}
      </text>
    </svg>
  );
}

// Contour strip (viewBox 0 0 200 40) — the same slope from above. Every line is the
// same gentle curve shifted to its crossing's x, so spacing is the only variable.
const M_H = 36;
const M_TOP = 7.5;
const M_BOT = 28.5;
const contourD = (x: number) =>
  `M${f2(x)},${M_TOP}C${f2(x + 1.8)},${f2(M_TOP + 8)} ${f2(x - 1.8)},${f2(M_BOT - 8)} ${f2(x)},${M_BOT}`;

export function SlopeContours({
  slope,
  bottomLabel,
  topLabel,
  ruleLabel,
  ariaLabel,
}: {
  slope: string;
  bottomLabel: string;
  topLabel: string;
  ruleLabel: string;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const pts = geoOf(slope);
  const tr = { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };
  const mid = (M_TOP + M_BOT) / 2;

  return (
    <svg viewBox={`0 0 ${P_W} ${M_H}`} className="block w-full h-auto" role="img" aria-label={ariaLabel}>
      <rect x={0} y={0} width={P_W} height={M_H} fill={C.paper} />
      <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} fill="#FFFFFF" />
      <g stroke={C.hairlineSoft} strokeWidth={0.2}>
        {Array.from({ length: 17 }, (_, i) => (
          <line key={i} x1={P_LEFT + (i + 1) * 10} y1={M_TOP} x2={P_LEFT + (i + 1) * 10} y2={M_BOT} />
        ))}
        <line x1={P_LEFT} y1={18} x2={P_RIGHT} y2={18} />
      </g>
      {/* drop-line stubs continuing from the profile above */}
      {pts.map(([d], i) => (
        <motion.line
          key={'stub' + i}
          initial={false}
          animate={{ x1: sx(d), x2: sx(d) }}
          transition={tr}
          y1={0}
          y2={M_TOP}
          stroke={C.contourIndex}
          strokeOpacity={0.55}
          strokeWidth={0.3}
          strokeDasharray="0.9 0.9"
        />
      ))}
      {pts.map(([d], i) => {
        const isIndex = i === 0 || i === pts.length - 1;
        return (
          <g key={i}>
            <motion.path
              initial={false}
              animate={{ d: contourD(sx(d)) }}
              transition={tr}
              fill="none"
              stroke={isIndex ? C.contourIndex : C.contour}
              strokeWidth={isIndex ? 0.75 : 0.55}
              strokeLinecap="round"
            />
            {/* downhill tick — points toward the foot (lower ground) */}
            <motion.line
              initial={false}
              animate={{ x1: sx(d), x2: sx(d) - 2.2 }}
              transition={tr}
              y1={mid}
              y2={mid}
              stroke={isIndex ? C.contourIndex : C.contour}
              strokeWidth={0.5}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} fill="none" stroke={C.hairline} strokeWidth={0.35} />
      <text x={P_W / 2} y={5} textAnchor="middle" fontSize={3.3} fill={C.ink} className="font-display font-bold">
        {ruleLabel}
      </text>
      <text x={sx(0)} y={33.3} textAnchor="middle" fontSize={3.4} fill={C.ink} className="font-display font-bold">
        {bottomLabel}
      </text>
      <text x={sx(1)} y={33.3} textAnchor="middle" fontSize={3.4} fill={C.ink} className="font-display font-bold">
        {topLabel}
      </text>
    </svg>
  );
}

// Tiny profile glyph for the slope tabs.
export function SlopeGlyph({ slope, className }: { slope: string; className?: string }) {
  const X = (d: number) => 4 + d * 32;
  const Y = (e: number) => 19 - e * 15;
  return (
    <svg viewBox="0 0 40 22" className={className} aria-hidden>
      <path d={`${surfacePath(slope, X, Y, 1, 39)}L39,21L1,21Z`} fill="currentColor" fillOpacity={0.16} />
      <path
        d={surfacePath(slope, X, Y, 1, 39)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
