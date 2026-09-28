'use client';

/**
 * LandformsVisuals — illustrations for LandformsScene ("תבניות נוף").
 *
 * Every landform is defined ONCE as a height field h(x, y) over a 100×50 map
 * tile. From that single source we derive both boards, so they always agree:
 *
 *   - "במציאות": a terrain block — the continuous surface in a gentle
 *     axonometric view, coloured by elevation and hill-shaded by the sun, cut
 *     out of the ground with cream paper edges (the course's papercut look).
 *     No contour layers here: the rings belong to the map.
 *   - "במפה": the same surface traced as contour lines (marching squares) with
 *     a constant 10 m interval and a heavier index contour at 150.
 *
 * The landform's key feature (summit ring / spur axis / drainage line / saddle
 * point / depression rim) is marked the same way in both views. Copy strings
 * are passed in from the scene (single source of copy).
 */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { animate, cubicBezier, motion, useReducedMotion } from 'framer-motion';

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
const KY = 0.4; // foreshortening of the ground plane (sin of the view elevation)
const VIEW: Pt = [SR, CR]; // plan direction pointing toward the viewer
const planX = (x: number, y: number) => x * CR - y * SR;
const REAL_X = planX(0, 50) - 3; // tile's front-left corner + margin
const REAL_W = planX(100, 0) - planX(0, 50) + 6;
const REAL_H = 59; // reality board viewBox height
const BASE_SLAB = 3; // block depth below the base plain, in screen units

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

// Terrain block: elevation ramp (sand plain → sage slopes → olive tops), lit by a
// sun from the viewer's front-left so slopes facing the reader stay readable.
const GROUND_RAMP: [number, string][] = [
  [0, mix(SAND, LOW_FACE, 0.35)],
  [0.3, LOW_FACE],
  [0.62, C.greenLight],
  [1, C.greenMid],
];
const SUN_EL = (50 * Math.PI) / 180;
const SUN: [number, number, number] = [-0.6 * Math.cos(SUN_EL), 0.8 * Math.cos(SUN_EL), Math.sin(SUN_EL)];
const SHADOW_TONE = '#3A4230';
const LIGHT_TONE = '#F7F0DF';
// Cut edges of the block — cream paper, the sunlit (south) face brighter.
const WALL_LIT = mix(C.paperEdge, '#FFFFFF', 0.3);
const WALL_SHADE = mix(C.rim, C.paperEdge, 0.35);
const TOPSOIL = mix(C.greenMid, C.rim, 0.4);
// Inside a closed pit the ground is bare: light rock just under the rim, a
// browner sandy floor deeper down (a makhtesh under a vegetated plateau).
const PIT_ROCK = mix(C.contour, C.paperEdge, 0.3);
const PIT_FLOOR = mix(C.contourIndex, C.contour, 0.4);

function groundColor(t: number): string {
  const k = Math.min(1, Math.max(0, t));
  for (let i = 1; i < GROUND_RAMP.length; i++) {
    const [t1, c1] = GROUND_RAMP[i];
    const [t0, c0] = GROUND_RAMP[i - 1];
    if (k <= t1) return mix(c0, c1, (k - t0) / (t1 - t0));
  }
  return GROUND_RAMP[GROUND_RAMP.length - 1][1];
}

/* ── Landform definitions ────────────────────────────────────────────────── */

type Spec = {
  h: HeightFn;
  kz: number; // oblique: screen-y per metre of elevation (vertical exaggeration)
  ky?: number; // camera: foreshortening of the ground plane (default KY)
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
      // smooth min(1, r): a rounded rim instead of a sharp crease
      const k = Math.max(0.08 - Math.abs(1 - r), 0) / 0.08;
      // steep walls around a wide, flat floor — a makhtesh, not a funnel
      return 112 + 40 * (Math.min(1, r) - k * k * 0.02) ** 1.8;
    },
    kz: 0.3,
    // looked at from a little higher than the rest, so the eye sees INTO the pit
    ky: 0.52,
    highlight: 150,
    numbers: [
      { level: 150, at: [82, 24] },
      { level: 130, at: [64, 24] },
    ],
  },
};

/* ── Contouring (marching squares on a padded grid) ──────────────────────── */

type Grid = { PX: number; PY: number; xs: Float64Array; ys: Float64Array; v: ArrayLike<number> };

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
  grid: Grid; // the sampled height field (the map's morph blends these)
  rings: Map<number, Pt[][]>; // level → rings of the region h ≥ level
  levels: number[]; // levels actually present on this tile
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
  const lf: Landform = { spec, grid: g, rings, levels };
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

/* ── "במציאות" — terrain block ───────────────────────────────────────────── */

// The shown surface is the analytic height, softly held between the base plain
// and a ridge-top ceiling, so the long ramps of the spur and valley stay on the
// board. The map keeps the exact heights (it only draws 110–160 anyway).
const CEIL = 172;
const softplus = (v: number) => (v > 30 ? v : Math.log1p(Math.exp(v)));
const shownHeight = (h: number) => {
  const lo = BASE + 3 * softplus((h - BASE) / 3);
  return CEIL - 5 * softplus((CEIL - lo) / 5);
};

// Gentle ground swell (about ±1 m) so plains and plateaus read as real ground,
// not a machined surface. Far below the 10 m contour interval.
const swell = (x: number, y: number) =>
  0.45 * Math.sin(0.23 * x + 0.12 * y + 1.3) +
  0.35 * Math.sin(-0.14 * x + 0.29 * y + 0.4) +
  0.25 * Math.sin(0.37 * x - 0.21 * y + 2.1);

const MESH = 1; // surface mesh step (map units)

type Shape = { d: string; fill: string };
// The same block as raw mesh data, for the moving frames: every ground vertex
// on screen as if flattened to the block's lowest ground (x, y0) plus its lift
// to full height (lift).
type Growth = {
  nx: number;
  ny: number;
  x: Float32Array;
  y0: Float32Array;
  lift: Float32Array;
  fills: string[]; // every quad, row by row from the far edge — hidden ones too
  hidden: Uint8Array; // quads the finished board leaves out (behind nearer ground)
  base: { ne: Pt; se: Pt; sw: Pt }; // the block's underside corners (fixed)
};
type Terrain = {
  at: (x: number, y: number) => Pt; // a ground point on screen
  surface: Shape[]; // painted back → front
  walls: Shape[];
  footprint: number[]; // contact-shadow corners, x0, y0, x1, y1, …
  growth: Growth;
};

const pointsAttr = (xy: ArrayLike<number>) =>
  Array.from({ length: xy.length / 2 }, (_, i) => `${f2(xy[2 * i])},${f2(xy[2 * i + 1])}`).join(' ');

const terrainCache = new Map<LandformId, Terrain>();

function getTerrain(form: LandformId): Terrain {
  const hit = terrainCache.get(form);
  if (hit) return hit;
  const { h, kz, highlight, ky = KY } = SPECS[form];
  const cosTilt = Math.sqrt(1 - ky * ky); // ky = sin(camera elevation)
  const toViewer = [VIEW[0] * cosTilt, VIEW[1] * cosTilt, ky];
  const pY = (x: number, y: number) => (x * SR + y * CR) * ky;
  const H: HeightFn = (x, y) => shownHeight(h(x, y)) + swell(x, y);
  const form0 = (x: number, y: number) => shownHeight(h(x, y)); // landform only, no swell
  const nx = Math.round(TW / MESH) + 1;
  const ny = Math.round(TH / MESH) + 1;
  const raw = new Float64Array(nx * ny);
  const Z = new Float64Array(nx * ny);
  let minY = Infinity;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      raw[k] = h(i * MESH, j * MESH);
      Z[k] = H(i * MESH, j * MESH);
      minY = Math.min(minY, pY(i * MESH, j * MESH) - (Z[k] - BASE) * kz);
    }
  }
  // The block's underside sits a slab below its lowest ground — but never more
  // than 12 m under its lowest edge, so a pit doesn't turn the block into a box.
  let edgeMin = Infinity;
  for (let i = 0; i < nx; i++) edgeMin = Math.min(edgeMin, Z[i], Z[(ny - 1) * nx + i]);
  for (let j = 0; j < ny; j++) edgeMin = Math.min(edgeMin, Z[j * nx], Z[j * nx + nx - 1]);
  const floor = Math.max(
    Z.reduce((a, b) => Math.min(a, b), Infinity),
    edgeMin - 12,
  );
  const maxY = pY(TW, TH) - (floor - BASE) * kz + BASE_SLAB;
  const y0 = (REAL_H - (maxY - minY)) / 2 - minY;
  const proj = (x: number, y: number, z: number): Pt => [planX(x, y), y0 + pY(x, y) - (z - BASE) * kz];
  const V = (i: number, j: number): Pt => proj(i * MESH, j * MESH, Z[j * nx + i]);
  const fmt = (p: Pt) => `${f2(p[0])},${f2(p[1])}`;
  const down = (p: Pt, dy: number): Pt => [p[0], p[1] + dy];

  // Depth below the spill level: how deep water poured here would pond. Zero on
  // open ground (it drains off the tile); only a closed pit has any.
  const F0 = raw.map(shownHeight);
  const spill = new Float64Array(nx * ny).fill(Infinity);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) spill[j * nx + i] = F0[j * nx + i];
    }
  }
  for (let changed = true, pass = 0; changed; pass++) {
    changed = false;
    // alternate the sweep direction so the fill spreads fast both ways
    for (let n = 0; n < (nx - 2) * (ny - 2); n++) {
      const m = pass % 2 ? (nx - 2) * (ny - 2) - 1 - n : n;
      const k = (1 + Math.floor(m / (nx - 2))) * nx + 1 + (m % (nx - 2));
      const v = Math.max(F0[k], Math.min(spill[k - 1], spill[k + 1], spill[k - nx], spill[k + nx]));
      if (v < spill[k] - 1e-9) {
        spill[k] = v;
        changed = true;
      }
    }
  }
  const sunk = F0.map((z, k) => spill[k] - z);

  // Shade each quad: elevation tint, hollows a touch darker and crests a touch
  // lighter (curvature), a closed pit darkening with depth, then sunlit /
  // shadowed by its slope. The relief is drawn exaggerated, so the normal uses
  // the drawn (not true) height.
  const zw = kz / cosTilt;
  // Hidden quads get a colour too: while the block rises they are still low
  // enough to show (see Growth), the final board skips them.
  const hidden = new Uint8Array((nx - 1) * (ny - 1));
  const quad = (i: number, j: number): string => {
    const z00 = Z[j * nx + i];
    const z10 = Z[j * nx + i + 1];
    const z01 = Z[(j + 1) * nx + i];
    const z11 = Z[(j + 1) * nx + i + 1];
    const gx = ((z10 - z00 + z11 - z01) / (2 * MESH)) * zw;
    const gy = ((z01 - z00 + z11 - z10) / (2 * MESH)) * zw;
    const inv = 1 / Math.hypot(gx, gy, 1);
    const n = [-gx * inv, -gy * inv, inv];
    // faces away from the viewer → always hidden behind nearer ground
    if (n[0] * toViewer[0] + n[1] * toViewer[1] + n[2] * toViewer[2] <= 0) hidden[j * (nx - 1) + i] = 1;
    let col = groundColor(((z00 + z10 + z01 + z11) / 4 - BASE) / (CEIL - 6 - BASE));
    // depth below the spill level — only inside a closed pit
    const pit = (sunk[j * nx + i] + sunk[j * nx + i + 1] + sunk[(j + 1) * nx + i] + sunk[(j + 1) * nx + i + 1]) / 4;
    // green gives way to rock right at the rim (the highlighted 150 m ring)
    if (pit > 0.15) col = mix(col, mix(PIT_ROCK, PIT_FLOOR, Math.min(1, pit / 30)), Math.min(1, (pit - 0.15) / 0.6));
    if (form === 'hill' && highlight !== undefined) {
      const rm = (raw[j * nx + i] + raw[j * nx + i + 1] + raw[(j + 1) * nx + i] + raw[(j + 1) * nx + i + 1]) / 4;
      if (rm >= highlight) col = mix(col, C.accent, 0.32);
    }
    const cx = (i + 0.5) * MESH;
    const cy = (j + 0.5) * MESH;
    const f0 = form0(cx, cy);
    const d = 2.5;
    const lap = (form0(cx + d, cy) + form0(cx - d, cy) + form0(cx, cy + d) + form0(cx, cy - d) - 4 * f0) / (d * d);
    // (no crest glow along a pit's rim — the green → rock edge stays crisp)
    const rimNear = [-3, 3].some(
      (o) =>
        sunk[j * nx + Math.min(nx - 1, Math.max(0, i + o))] > 0 ||
        sunk[Math.min(ny - 1, Math.max(0, j + o)) * nx + i] > 0,
    );
    if (lap > 0) col = mix(col, SHADOW_TONE, Math.min(0.24, lap * 0.4));
    else if (!rimNear) col = mix(col, LIGHT_TONE, Math.min(0.15, -lap * 0.5));
    // …and darkens with depth — deep reads as dark
    if (pit > 0) col = mix(col, SHADOW_TONE, 0.4 * Math.min(1, pit / 40) ** 1.6);
    const lit = n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2] - SUN[2];
    return lit < 0 ? mix(col, SHADOW_TONE, Math.min(0.6, -lit * 0.95)) : mix(col, LIGHT_TONE, Math.min(0.35, lit * 0.6));
  };

  // Row by row from the far edge, and far → near inside a row: a valid painter's
  // order for a height field seen from this side. Equal-colour neighbours in a
  // row merge into one strip.
  const qw = nx - 1;
  const fills: string[] = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < qw; i++) fills.push(quad(i, j));
  const surface: Shape[] = [];
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < qw; ) {
      const fill = fills[j * qw + i];
      if (hidden[j * qw + i]) {
        i++;
        continue;
      }
      let i1 = i;
      while (i1 + 1 < qw && !hidden[j * qw + i1 + 1] && fills[j * qw + i1 + 1] === fill) i1++;
      const top: Pt[] = [];
      const bot: Pt[] = [];
      for (let k = i; k <= i1 + 1; k++) {
        top.push(V(k, j));
        bot.push(V(k, j + 1));
      }
      surface.push({ d: 'M' + [...top, ...bot.reverse()].map(fmt).join('L') + 'Z', fill });
      i = i1 + 1;
    }
  }

  // Cut edges on the two sides facing the viewer (south, east): cream paper
  // below a thin topsoil band that traces the terrain's cross-section.
  const south = Array.from({ length: nx }, (_, i) => V(i, ny - 1));
  const east = Array.from({ length: ny }, (_, j) => V(nx - 1, j));
  const baseAt = (x: number, y: number): Pt => down(proj(x, y, floor), BASE_SLAB);
  const band = (edge: Pt[]) => 'M' + [...edge, ...edge.map((p) => down(p, 0.55)).reverse()].map(fmt).join('L') + 'Z';
  const walls: Shape[] = [
    { d: 'M' + [...south, baseAt(TW, TH), baseAt(0, TH)].map(fmt).join('L') + 'Z', fill: WALL_LIT },
    { d: 'M' + [...east, baseAt(TW, TH), baseAt(TW, 0)].map(fmt).join('L') + 'Z', fill: WALL_SHADE },
    { d: band(south), fill: TOPSOIL },
    { d: band(east), fill: mix(TOPSOIL, SHADOW_TONE, 0.25) },
  ];

  const footprint = ([[0, 0], [TW, 0], [TW, TH], [0, TH]] as Pt[]).flatMap(([x, y]) => down(baseAt(x, y), 0.9));

  const growth: Growth = {
    nx,
    ny,
    x: new Float32Array(nx * ny),
    y0: new Float32Array(nx * ny),
    lift: new Float32Array(nx * ny),
    fills,
    hidden,
    base: { ne: baseAt(TW, 0), se: baseAt(TW, TH), sw: baseAt(0, TH) },
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const [px, py] = proj(i * MESH, j * MESH, floor);
      growth.x[k] = px;
      growth.y0[k] = py;
      growth.lift[k] = (Z[k] - floor) * kz;
    }
  }

  const t: Terrain = { at: (x, y) => proj(x, y, H(x, y)), surface, walls, footprint, growth };
  terrainCache.set(form, t);
  return t;
}

// Build-up (the board's first showing): the flat block fades in, then its
// relief rises into place.
const BUILD_S = 1.05;
const BUILD_FADE = 0.14; // share of BUILD_S
const BUILD_HOLD = 0.1; // flat, before the rise starts
// Switching landforms: the shown ground reshapes straight into the next form.
const MORPH_S = 0.9;
const MOVE_EASE = cubicBezier(0.45, 0, 0.2, 1);

// a → b by s, element by element
function lerpArr(a: ArrayLike<number>, b: ArrayLike<number>, s: number): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < out.length; i++) out[i] = a[i] + (b[i] - a[i]) * s;
  return out;
}

// The moving frames run on the GPU (thousands of quads a frame — far too many
// for SVG or a 2D canvas). Every landform yields the same vertices in the same
// order: the surface in the board's painter's order, then the cut edges, each
// a strip from the ground edge down to the underside. So any two poses blend
// vertex by vertex, and every blend is again a height field seen from the same
// side — the painter's order still holds. A pose is x, y, r, g, b per vertex:
// `pose` the finished block, `flat` its relief pressed down to the lowest
// ground, the ground plain-coloured (where the build-up starts).
type MorphMesh = { index: Uint16Array; pose: Float32Array; flat: Float32Array };
const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const morphMeshes = new WeakMap<Terrain, MorphMesh>();

function getMorphMesh(t: Terrain): MorphMesh {
  const hit = morphMeshes.get(t);
  if (hit) return hit;
  const { nx, ny, x, y0, lift, fills, hidden, base } = t.growth;
  const pose: number[] = [];
  const flat: number[] = [];
  const index: number[] = [];
  const plain = hexRgb(GROUND_RAMP[0][1]);
  type V3 = [number, number, number]; // flat x, flat y, lift
  // flat ground is plain-coloured; the tint and the hill-shading come with the relief
  const vertex = (v: V3, col: number[], ground: boolean) => {
    pose.push(v[0], v[1] - v[2], col[0], col[1], col[2]);
    const c = ground ? plain : col;
    flat.push(v[0], v[1], c[0], c[1], c[2]);
  };
  const quad = (a: V3, b: V3, c: V3, d: V3, fill: string) => {
    const n = pose.length / 5;
    const col = hexRgb(fill);
    for (const v of [a, b, c, d]) vertex(v, col, false);
    index.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  const V = (k: number): V3 => [x[k], y0[k], lift[k]];
  const drop = (v: V3, dy: number): V3 => [v[0], v[1] + dy, v[2]];
  const on = (p: Pt, q: Pt, u: number): V3 => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, 0];
  // Surface: shared vertices, each coloured with the mean of the quads around
  // it that show on the finished board (all of them where none does) — smooth
  // shading, as the board's smoothing filter gives; flat quads would streak.
  const qw = nx - 1;
  const quadRgb = fills.map(hexRgb);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const shown = [0, 0, 0, 0];
      const any = [0, 0, 0, 0];
      for (const [qi, qj] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
        if (qi < 0 || qj < 0 || qi >= qw || qj >= ny - 1) continue;
        const q = qj * qw + qi;
        for (const acc of hidden[q] ? [any] : [any, shown]) {
          for (let c = 0; c < 3; c++) acc[c] += quadRgb[q][c];
          acc[3]++;
        }
      }
      const m = shown[3] ? shown : any;
      vertex(V(j * nx + i), [m[0] / m[3], m[1] / m[3], m[2] / m[3]], true);
    }
  }
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < qw; i++) {
      const k = j * nx + i;
      index.push(k, k + 1, k + nx + 1, k, k + nx + 1, k + nx);
    }
  }
  const south = Array.from({ length: nx }, (_, i) => (ny - 1) * nx + i);
  const east = Array.from({ length: ny }, (_, j) => j * nx + nx - 1);
  const wall = (ks: number[], from: Pt, to: Pt, fill: string) => {
    for (let i = 0; i < ks.length - 1; i++) {
      const u = (n: number) => n / (ks.length - 1);
      quad(V(ks[i]), V(ks[i + 1]), on(from, to, u(i + 1)), on(from, to, u(i)), fill);
    }
  };
  const band = (ks: number[], fill: string) => {
    for (let i = 0; i < ks.length - 1; i++) {
      quad(V(ks[i]), V(ks[i + 1]), drop(V(ks[i + 1]), 0.55), drop(V(ks[i]), 0.55), fill);
    }
  };
  wall(south, base.sw, base.se, t.walls[0].fill);
  wall(east, base.ne, base.se, t.walls[1].fill);
  band(south, t.walls[2].fill);
  band(east, t.walls[3].fill);
  const mesh = { index: new Uint16Array(index), pose: new Float32Array(pose), flat: new Float32Array(flat) };
  morphMeshes.set(t, mesh);
  return mesh;
}

const MORPH_VS = `
attribute vec2 a_pos0;
attribute vec3 a_col0;
attribute vec2 a_pos1;
attribute vec3 a_col1;
uniform float u_s;
uniform vec4 u_view;
varying vec3 v_col;
void main() {
  vec2 p = (mix(a_pos0, a_pos1, u_s) - u_view.xy) / u_view.zw * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  v_col = mix(a_col0, a_col1, u_s);
}`;
const MORPH_FS = `
precision mediump float;
varying vec3 v_col;
void main() { gl_FragColor = vec4(v_col, 1.0); }`;

// Draws the block blended from pose `from` to pose `to` at s (0 → 1) onto the
// canvas, in the board's viewBox. Null when WebGL isn't available.
function morphRenderer(canvas: HTMLCanvasElement, index: Uint16Array, from: Float32Array, to: Float32Array) {
  const gl = canvas.getContext('webgl', { antialias: true, depth: false, stencil: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, MORPH_VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, MORPH_FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
  // one buffer per pose, each interleaved x, y, r, g, b
  [from, to].forEach((data, n) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 20, offset);
    };
    attr(`a_pos${n}`, 2, 0);
    attr(`a_col${n}`, 3, 8);
  });
  const uS = gl.getUniformLocation(prog, 'u_s');
  gl.uniform4f(gl.getUniformLocation(prog, 'u_view'), REAL_X, 0, REAL_W, REAL_H);
  return {
    draw(s: number) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uS, s);
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    },
    // free the context right away — the page runs other WebGL scenes too
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export function LandformReality({ form, ariaLabel }: { form: LandformId; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const terrain = getTerrain(form);

  // The moving frames are drawn on a canvas over the board; the finished board
  // is painted underneath before the canvas goes.
  //  - First showing — build-up, bottom to top: the block lands flat, then the
  //    ground rises out of it to full relief, one continuous surface the whole
  //    way (user decision 2026-09-28: no stacked contour sheets).
  //  - Switching landforms — shape to shape: the ground on screen reshapes
  //    straight into the next form, without going flat again (user decision
  //    2026-09-28). A click mid-move carries on from the shape on screen.
  const layerRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<SVGPolygonElement>(null);
  // what the canvas shows: pose `from` blended toward `to` by s (and the shadow with it)
  const shownRef = useRef<{ from: Float32Array; to: Float32Array; foot: [number[], number[]]; s: number } | null>(null);
  const [stage, setStage] = useState<{ form: LandformId; step: 'landed' | 'done' } | null>(null);
  // a new form is moving until its own run lands
  const step = stage?.form === form ? stage.step : 'moving';
  const built = step !== 'moving';
  // run by the landing: drops the canvas once the finished board has painted
  const releaseRef = useRef<() => void>(() => {});

  // A layout effect: the canvas takes over in the same paint as the click, so
  // the old shape never blinks out.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const mesh = getMorphMesh(terrain);
    const prev = shownRef.current;
    const build = !prev;
    const run = {
      from: prev ? lerpArr(prev.from, prev.to, prev.s) : mesh.flat,
      to: mesh.pose,
      foot: [prev ? Array.from(lerpArr(prev.foot[0], prev.foot[1], prev.s)) : terrain.footprint, terrain.footprint] as [
        number[],
        number[],
      ],
      s: 0,
    };
    shownRef.current = run;
    // a fresh canvas per run: a context once released can't be drawn on again
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `display:block;width:100%;height:100%;opacity:${build ? 0 : 1}`;
    layer?.appendChild(canvas);
    const gl = !reduce && layer ? morphRenderer(canvas, mesh.index, run.from, run.to) : null;
    if (!gl) {
      canvas.remove();
      run.s = 1;
      setStage({ form, step: 'done' });
      return;
    }
    const frame = (p: number) => {
      if (build) canvas.style.opacity = String(Math.min(1, p / BUILD_FADE));
      run.s = MOVE_EASE(build ? Math.max(0, (p - BUILD_HOLD) / (1 - BUILD_HOLD)) : p);
      gl.draw(run.s);
      footRef.current?.setAttribute('points', pointsAttr(lerpArr(run.foot[0], run.foot[1], run.s)));
    };
    frame(0);
    const controls = animate(0, 1, {
      duration: build ? BUILD_S : MORPH_S,
      ease: 'linear',
      onUpdate: frame,
      onComplete: () => {
        run.s = 1;
        releaseRef.current = () => {
          gl.dispose();
          setStage({ form, step: 'done' });
        };
        setStage({ form, step: 'landed' });
      },
    });
    return () => {
      controls.stop();
      gl.dispose();
      canvas.remove();
      // stopped before anything rose (or re-run by Strict Mode): build up afresh
      if (build && run.s === 0) shownRef.current = null;
    };
  }, [form, reduce, terrain]);

  // Landed: the finished board is committed under the canvas's last frame. Two
  // frames later it has painted, and the canvas goes.
  useEffect(() => {
    if (step !== 'landed') return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => releaseRef.current());
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // While the ground moves, the hidden board keeps the last settled form: the
  // next form's thousands of strips are laid in under the canvas once it lands,
  // not in the frame of the click.
  const boardForm = built || !stage ? form : stage.form;
  const board = useMemo(() => {
    const t = getTerrain(boardForm);
    return (
      <>
        {/* each strip is stroked in its own colour to close hairline seams */}
        <g strokeWidth={0.32} strokeLinejoin="round" filter={`url(#${uid}-smooth)`}>
          {t.surface.map((s, i) => (
            <path key={i} d={s.d} fill={s.fill} stroke={s.fill} />
          ))}
        </g>
        {t.walls.map((w, i) => (
          <path key={i} d={w.d} fill={w.fill} stroke={w.fill} strokeWidth={0.1} strokeLinejoin="round" />
        ))}
      </>
    );
  }, [boardForm, uid]);
  const overlays = useMemo(
    () => (built ? realityOverlays(form, getLandform(form), terrain) : null),
    [built, form, terrain],
  );

  // Prepare the other landforms while the reader is idle, so switching is quick.
  useEffect(() => {
    let alive = true;
    const queue = (Object.keys(SPECS) as LandformId[]).filter((f) => !terrainCache.has(f) || !cache.has(f));
    const next = () => {
      const f = queue.shift();
      if (!alive || !f) return;
      getMorphMesh(getTerrain(f));
      getLandform(f);
      schedule();
    };
    // Safari has no requestIdleCallback
    const idle = window.requestIdleCallback as ((cb: () => void) => number) | undefined;
    const schedule = () => (idle ? idle.call(window, next) : window.setTimeout(next, 120));
    schedule();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative">
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
          <filter id={`${uid}-soft`} x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
          {/* smooths the mesh's shading steps inside the terrain while keeping its
              silhouette crisp: blur, re-solidify, clip back to the sharp shape */}
          <filter id={`${uid}-smooth`} colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur" />
            <feComponentTransfer in="blur" result="solid">
              <feFuncA type="linear" slope="40" />
            </feComponentTransfer>
            <feComposite in="solid" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>

        <rect x={REAL_X} y={0} width={REAL_W} height={REAL_H} fill={`url(#${uid}-sky)`} />
        {/* soft contact shadow under the block */}
        <polygon
          ref={footRef}
          points={pointsAttr(terrain.footprint)}
          fill="#5A4628"
          opacity={0.2}
          filter={`url(#${uid}-soft)`}
        />

        <g visibility={built ? undefined : 'hidden'}>{board}</g>

        {/* key feature, draped on the ground once the block is in place */}
        {built && (
          <motion.g
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.3 }}
          >
            {overlays}
          </motion.g>
        )}
      </svg>
      {/* the moving frames (canvas added by the effect above) */}
      {step !== 'done' && <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0" />}
    </div>
  );
}

// A plan point is visible when no nearer ground rises above it on screen: walk
// toward the viewer along the view direction (screen x stays fixed on that ray).
function isVisible(t: Terrain, x: number, y: number): boolean {
  const sy = t.at(x, y)[1];
  for (let s = 0.5; ; s += 0.5) {
    const qx = x + VIEW[0] * s;
    const qy = y + VIEW[1] * s;
    if (qx > TW || qy > TH) return true;
    if (t.at(qx, qy)[1] < sy - 0.08) return false;
  }
}

// Plan-view line → path on the ground, broken wherever the terrain hides it.
function drape(t: Terrain, pts: Pt[], closed = false): string {
  const vis = pts.map(([x, y]) => isVisible(t, x, y));
  const P = ([x, y]: Pt): Pt => t.at(x, y);
  if (closed && vis.every(Boolean)) return polyPath(pts.map(P)) + 'Z';
  // a closed ring starts at a hidden point so no visible run wraps around
  const start = closed ? vis.indexOf(false) : 0;
  const order = closed ? [...pts.slice(start), ...pts.slice(0, start + 1)] : pts;
  const flags = closed ? [...vis.slice(start), ...vis.slice(0, start + 1)] : vis;
  const runs: Pt[][] = [];
  let cur: Pt[] = [];
  order.forEach((p, i) => {
    if (flags[i]) cur.push(P(p));
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  });
  if (cur.length) runs.push(cur);
  return runs
    .filter((r) => r.length > 1)
    .map(polyPath)
    .join('');
}

function realityOverlays(form: LandformId, lf: Landform, t: Terrain): ReactNode[] {
  const { highlight } = lf.spec;
  const feat = FEATURES[form];
  const out: ReactNode[] = [];

  // the same closed contour that is highlighted on the map (hill top, depression rim)
  if (highlight !== undefined) {
    const d = (lf.rings.get(highlight) ?? [])
      .filter(isInterior)
      .map((r) => drape(t, r, true))
      .join('');
    if (d) out.push(<path key="hl" d={d} fill="none" stroke={C.accent} strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" />);
  }
  if (feat.axis) {
    out.push(
      <path
        key="ax"
        d={drape(t, sampleLine(feat.axis))}
        fill="none"
        stroke={C.accent}
        strokeWidth={0.65}
        strokeDasharray="1.6 1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    );
    const [ex, ey] = feat.axis.to;
    if (isVisible(t, ex, ey + 2.6)) {
      const tip = t.at(ex, ey + 2.6);
      const from = t.at(ex, ey);
      out.push(<Arrowhead key="axh" tip={tip} dir={[tip[0] - from[0], tip[1] - from[1]]} fill={C.accent} />);
    }
  }
  if (feat.drain) {
    const d = drape(t, sampleLine(feat.drain));
    out.push(
      <g key="dr" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} stroke={C.riverDeep} strokeWidth={1.3} />
        <path d={d} stroke={C.river} strokeWidth={0.8} />
      </g>,
    );
  }
  if (feat.ridge) {
    out.push(
      <path
        key="rg"
        d={drape(t, sampleLine(feat.ridge))}
        fill="none"
        stroke={C.accent}
        strokeWidth={0.6}
        strokeDasharray="1.4 0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    );
  }
  if (form === 'saddle' && feat.point && isVisible(t, feat.point[0], feat.point[1])) {
    const [sx, sy] = t.at(feat.point[0], feat.point[1]);
    out.push(<circle key="sp" cx={sx} cy={sy} r={1.3} fill={C.accent} stroke="#FFFFFF" strokeWidth={0.45} />);
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

  // Switching landforms: the contours reshape with the ground — every frame
  // traces the height field part way from the shown form to the next one (every
  // level, so rings can appear, split and merge on the way). The labels and
  // key-feature marks wait until the new form has settled.
  const settledPaths = useMemo(() => LEVELS.map((L) => ringsPath(lf.rings.get(L) ?? [], id)), [lf]);
  const [moving, setMoving] = useState<string[] | null>(null);
  const [switched, setSwitched] = useState(false);
  const shownRef = useRef<{ from: ArrayLike<number>; to: ArrayLike<number>; s: number }>({
    from: lf.grid.v,
    to: lf.grid.v,
    s: 1,
  });
  useLayoutEffect(() => {
    const prev = shownRef.current;
    const to = lf.grid.v;
    if (prev.to === to && prev.s === 1) return;
    const run = { from: lerpArr(prev.from, prev.to, prev.s), to, s: 0 };
    shownRef.current = run;
    if (reduce) {
      run.s = 1;
      setMoving(null);
      return;
    }
    setSwitched(true);
    const trace = () => {
      const g: Grid = { ...lf.grid, v: lerpArr(run.from, run.to, run.s) };
      setMoving(LEVELS.map((L) => ringsPath(contourRings(g, L), id)));
    };
    trace();
    const controls = animate(0, 1, {
      duration: MORPH_S,
      ease: 'linear',
      onUpdate: (p) => {
        run.s = MOVE_EASE(p);
        trace();
      },
      onComplete: () => {
        run.s = 1;
        setMoving(null);
      },
    });
    return () => controls.stop();
  }, [lf, reduce]);
  const paths = moving ?? settledPaths;
  const still = moving === null;
  // first showing: the marks follow the contours' fade-in; after a switch they come right away
  const marks = { duration: reduce ? 0 : 0.3, delay: reduce || switched ? 0 : 0.45 };
  const marksIn = reduce ? false : { opacity: 0 };

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
        {LEVELS.map((L, i) => (
          <path key={'t' + L} d={paths[i]} fillRule="evenodd" fill={C.greenLight} fillOpacity={0.045} />
        ))}
        {LEVELS.map((L, i) => (
          <path
            key={L}
            d={paths[i]}
            fill="none"
            stroke={L === INDEX_LEVEL ? C.contourIndex : C.contour}
            strokeWidth={L === INDEX_LEVEL ? 0.55 : 0.32}
            strokeLinejoin="round"
          />
        ))}
        {still && form === 'depression' && (
          <motion.path
            key={`hach-${form}`}
            initial={switched ? marksIn : false}
            animate={{ opacity: 1 }}
            transition={marks}
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
      {still && highlightRings.length > 0 && (
        <motion.path
          key={`hl-${form}`}
          initial={marksIn}
          animate={{ opacity: 1 }}
          transition={marks}
          d={ringsPath(highlightRings, id)}
          fill={form === 'hill' ? C.accent : 'none'}
          fillOpacity={0.14}
          stroke={C.accent}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      )}

      {/* elevation numbers on the lines (metres) */}
      {still && (
        <motion.g key={`num-${form}`} initial={switched ? marksIn : false} animate={{ opacity: 1 }} transition={marks}>
          {lf.spec.numbers.map(({ level, at }) => {
            const p = nearestOnLevel(lf, level, at);
            return p ? (
              <MapLabel key={level} at={p} text={String(level)} fill={C.contourIndex} size={2.3} charW={0.62} />
            ) : null;
          })}
        </motion.g>
      )}

      {/* key feature — matches the marks on the diorama */}
      {still && (
        <motion.g key={`feat-${form}`} initial={marksIn} animate={{ opacity: 1 }} transition={marks}>
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
      )}
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
