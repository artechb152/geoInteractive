/**
 * terrainBlockGeometry — the pure (React-free) half of the course's terrain-block
 * engine, extracted from LandformsVisuals so other scenes can reuse it
 * (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §8).
 *
 * One height field h(x, y) over a 100 × 50 tile drives both boards:
 *   - "בשטח": the axonometric papercut block (buildTerrain → SVG strips, plus a
 *     morph mesh for the WebGL frames in terrainBlock.tsx);
 *   - "במפה": contour rings by marching squares, 10 m interval (buildContours).
 * Node's test runner imports this file directly (scripts/qa/*.test.mjs): keep it
 * free of React, and import types with `type`.
 */

export type Pt = [number, number];
export type HeightFn = (x: number, y: number) => number;

export const TW = 100; // tile width  (map units)
export const TH = 50; // tile depth  (map units)
export const BASE = 100; // elevation of the base plain (m)
export const LEVELS = [110, 120, 130, 140, 150, 160]; // contour interval 10 m
export const INDEX_LEVEL = 150; // index contour (every 5th line)

// Map board window (plan view, north up).
export const VB_X = -6;
export const VB_W = 112;
export const MAP_Y = -2.5;
export const MAP_H = 55;

// Diorama camera: the tile is turned ROT degrees and seen from above-front-right
// (a gentle axonometric, like the course's isometric papercut art), so a spur
// shows its flank and a valley opens toward the viewer.
const ROT = (32 * Math.PI) / 180;
const CR = Math.cos(ROT);
const SR = Math.sin(ROT);
const KY = 0.4; // foreshortening of the ground plane (sin of the view elevation)
export const VIEW: Pt = [SR, CR]; // plan direction pointing toward the viewer
const planX = (x: number, y: number) => x * CR - y * SR;
export const REAL_X = planX(0, 50) - 3; // tile's front-left corner + margin
export const REAL_W = planX(100, 0) - planX(0, 50) + 6;
export const REAL_H = 59; // reality board viewBox height
const BASE_SLAB = 3; // block depth below the base plain, in screen units

// Illustration palette (design-spec §3 illustration colours + tanline tokens).
export const C = {
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

export function mix(a: string, b: string, t: number): string {
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
export const PIT_ROCK = mix(C.contour, C.paperEdge, 0.3);
export const PIT_FLOOR = mix(C.contourIndex, C.contour, 0.4);

/** How a block is coloured. Landforms tint by elevation; other scenes bring their own ramp. */
export type TerrainLook = {
  /** Ground colour by relative height t (0 = base plain, 1 = CEIL − 6), as [t, #rrggbb] stops. */
  ramp: [number, string][];
  /** Extra tint for one surface quad (centre x, y; mean raw height): after the pit tint, before curvature and sun. */
  tint?: (col: string, quad: { x: number; y: number; raw: number }) => string;
};

export type TerrainSpec = {
  h: HeightFn;
  kz: number; // oblique: screen-y per metre of elevation (vertical exaggeration)
  ky?: number; // camera: foreshortening of the ground plane (default KY)
  look: TerrainLook;
};

function rampColor(ramp: [number, string][], t: number): string {
  const k = Math.min(1, Math.max(0, t));
  for (let i = 1; i < ramp.length; i++) {
    const [t1, c1] = ramp[i];
    const [t0, c0] = ramp[i - 1];
    if (k <= t1) return mix(c0, c1, (k - t0) / (t1 - t0));
  }
  return ramp[ramp.length - 1][1];
}

/* ── Contouring (marching squares on a padded grid) ──────────────────────── */

export type Grid = { PX: number; PY: number; xs: Float64Array; ys: Float64Array; v: ArrayLike<number> };

const STEP = 1;
const PAD = -1e9;

export function sampleGrid(f: HeightFn): Grid {
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

export function contourRings(g: Grid, L: number): Pt[][] {
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

export const onBorder = (p: Pt) => p[0] < 0.05 || p[0] > TW - 0.05 || p[1] < 0.05 || p[1] > TH - 0.05;
export const isInterior = (ring: Pt[]) => !ring.some(onBorder);

export type Contours = {
  grid: Grid; // the sampled height field (a map's morph blends these)
  rings: Map<number, Pt[][]>; // level → rings of the region h ≥ level
  levels: number[]; // levels actually present on this tile
};

const contourCache = new WeakMap<HeightFn, Contours>();

export function buildContours(h: HeightFn): Contours {
  const hit = contourCache.get(h);
  if (hit) return hit;
  const grid = sampleGrid(h);
  const rings = new Map<number, Pt[][]>();
  const levels: number[] = [];
  for (const L of LEVELS) {
    const r = contourRings(grid, L);
    if (r.length) {
      rings.set(L, r);
      levels.push(L);
    }
  }
  const c: Contours = { grid, rings, levels };
  contourCache.set(h, c);
  return c;
}

export const f2 = (n: number) => n.toFixed(2);
export const identity = (p: Pt) => p;

export function ringsPath(rings: Pt[][], proj: (p: Pt) => Pt): string {
  return rings
    .map((r) => 'M' + r.map((p) => proj(p)).map(([x, y]) => `${f2(x)},${f2(y)}`).join('L') + 'Z')
    .join('');
}

export function polyPath(pts: Pt[]): string {
  return 'M' + pts.map(([x, y]) => `${f2(x)},${f2(y)}`).join('L');
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

export type Shape = { d: string; fill: string };
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
  plain: string; // flat (pre-relief) ground colour for the build-up
  hidden: Uint8Array; // quads the finished board leaves out (behind nearer ground)
  base: { ne: Pt; se: Pt; sw: Pt }; // the block's underside corners (fixed)
};
export type Terrain = {
  at: (x: number, y: number) => Pt; // a ground point on screen
  surface: Shape[]; // painted back → front
  walls: Shape[];
  footprint: number[]; // contact-shadow corners, x0, y0, x1, y1, …
  growth: Growth;
};

export const pointsAttr = (xy: ArrayLike<number>) =>
  Array.from({ length: xy.length / 2 }, (_, i) => `${f2(xy[2 * i])},${f2(xy[2 * i + 1])}`).join(' ');

const terrainCache = new WeakMap<TerrainSpec, Terrain>();

export function buildTerrain(spec: TerrainSpec): Terrain {
  const hit = terrainCache.get(spec);
  if (hit) return hit;
  const { h, kz, ky = KY, look } = spec;
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
    let col = rampColor(look.ramp, ((z00 + z10 + z01 + z11) / 4 - BASE) / (CEIL - 6 - BASE));
    // depth below the spill level — only inside a closed pit
    const pit = (sunk[j * nx + i] + sunk[j * nx + i + 1] + sunk[(j + 1) * nx + i] + sunk[(j + 1) * nx + i + 1]) / 4;
    // green gives way to rock right at the rim (the highlighted 150 m ring)
    if (pit > 0.15) col = mix(col, mix(PIT_ROCK, PIT_FLOOR, Math.min(1, pit / 30)), Math.min(1, (pit - 0.15) / 0.6));
    const cx = (i + 0.5) * MESH;
    const cy = (j + 0.5) * MESH;
    if (look.tint) {
      const rm = (raw[j * nx + i] + raw[j * nx + i + 1] + raw[(j + 1) * nx + i] + raw[(j + 1) * nx + i + 1]) / 4;
      col = look.tint(col, { x: cx, y: cy, raw: rm });
    }
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
    plain: look.ramp[0][1],
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
  terrainCache.set(spec, t);
  return t;
}

// a → b by s, element by element
export function lerpArr(a: ArrayLike<number>, b: ArrayLike<number>, s: number): Float32Array {
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
export type MorphMesh = { index: Uint16Array; pose: Float32Array; flat: Float32Array };
const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const morphMeshes = new WeakMap<Terrain, MorphMesh>();

export function getMorphMesh(t: Terrain): MorphMesh {
  const hit = morphMeshes.get(t);
  if (hit) return hit;
  const { nx, ny, x, y0, lift, fills, plain, hidden, base } = t.growth;
  const pose: number[] = [];
  const flat: number[] = [];
  const index: number[] = [];
  const plainRgb = hexRgb(plain);
  type V3 = [number, number, number]; // flat x, flat y, lift
  // flat ground is plain-coloured; the tint and the hill-shading come with the relief
  const vertex = (v: V3, col: number[], ground: boolean) => {
    pose.push(v[0], v[1] - v[2], col[0], col[1], col[2]);
    const c = ground ? plainRgb : col;
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

// A plan point is visible when no nearer ground rises above it on screen: walk
// toward the viewer along the view direction (screen x stays fixed on that ray).
export function isVisible(t: Terrain, x: number, y: number): boolean {
  const sy = t.at(x, y)[1];
  for (let s = 0.5; ; s += 0.5) {
    const qx = x + VIEW[0] * s;
    const qy = y + VIEW[1] * s;
    if (qx > TW || qy > TH) return true;
    if (t.at(qx, qy)[1] < sy - 0.08) return false;
  }
}

// Plan-view line → path on the ground, broken wherever the terrain hides it.
export function drape(t: Terrain, pts: Pt[], closed = false): string {
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

export function nearestOnLevel(c: Pick<Contours, 'rings'>, level: number, at: Pt): Pt | null {
  let best: Pt | null = null;
  let bd = Infinity;
  for (const r of c.rings.get(level) ?? []) {
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
