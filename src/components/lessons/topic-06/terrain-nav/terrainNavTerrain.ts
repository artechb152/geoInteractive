/**
 * The one terrain of the terrain-association activity, and everything derived from it.
 *
 *   generator     heightField(E, N): the regional surface, ridges and domes of
 *                 terrainNavScenario, a little fixed noise, and the stream and
 *                 gully valleys carved into it with a falling bed. Fictional data
 *                 for a training area — not a geological model, not a survey.
 *   height grid   the generator sampled every 5 m: 281 × 351 samples over
 *                 0 ≤ E ≤ 1400, 0 ≤ N ≤ 1750. Every cell is split along its
 *                 SW–NE diagonal, always. The 3D mesh uses exactly these
 *                 triangles and heightAt() interpolates on them, so anything
 *                 placed with heightAt() sits on the surface that is drawn.
 *   contours      marching triangles over the same triangles every 10 m (index
 *                 line every 50 m): a contour vertex lies on a mesh edge at the
 *                 contour height (checked in scripts/qa/terrain-nav.test.mjs).
 *   cover         grove, woodland, orchard and lone trees, village houses, low
 *                 scrub and boulders — deterministic lists the 3D instances and
 *                 the map symbols both read.
 *
 * Everything is computed once, on first use, and memoised. No three.js here, so
 * the SVG map and plain Node use it too.
 */
import {
  CONTOUR_INTERVAL_M,
  DISTANT_HILLS,
  DOMES,
  EYE_HEIGHT_M,
  FIELDS,
  GROVES,
  GULLIES,
  INDEX_INTERVAL_M,
  ORCHARDS,
  RIDGES,
  ROAD_CONTROL_POINTS,
  ROAD_WIDTH_M,
  ROUTE,
  SQUARE_CENTER,
  SQUARE_RING,
  START,
  STREAM,
  VILLAGE_RING,
  WATER_TOWER,
  WOODLAND,
  WORLD_BOUNDS,
  type CheckpointId,
  type DomeId,
  type GroveId,
  type Point,
  type RoadId,
  type XY,
} from './terrainNavScenario';
import { distance, distanceToPolyline, pointInPolygon } from '../locationCheckGeometry';
import { rng, smoothCurve } from '../locationCheckTerrain';

export { rng, smoothCurve };

const DEG = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const ringPoints = (ring: readonly XY[]): Point[] => ring.map(([E, N]) => ({ E, N }));

// ---------------------------------------------------------------- noise (fixed in space)

function hash2(i: number, j: number): number {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [−1, 1]. */
export function valueNoise(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash2(i, j);
  const b = hash2(i + 1, j);
  const c = hash2(i, j + 1);
  const d = hash2(i + 1, j + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

function fbm(x: number, y: number, octaves: number): number {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let k = 0; k < octaves; k++) {
    s += a * valueNoise(x * f + k * 17.3, y * f - k * 9.1);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}

// ---------------------------------------------------------------- polylines

type Seg = { ax: number; ay: number; dx: number; dy: number; len2: number; s0: number; len: number };
type Chunk = { from: number; to: number; minE: number; maxE: number; minN: number; maxN: number };
type Line = { segs: Seg[]; chunks: Chunk[]; total: number; minE: number; maxE: number; minN: number; maxN: number };

function lineOf(pts: readonly XY[]): Line {
  const segs: Seg[] = [];
  let s = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k];
    const dx = pts[k + 1][0] - ax;
    const dy = pts[k + 1][1] - ay;
    const len = Math.hypot(dx, dy);
    segs.push({ ax, ay, dx, dy, len2: dx * dx + dy * dy, s0: s, len });
    s += len;
  }
  const Es = pts.map((p) => p[0]);
  const Ns = pts.map((p) => p[1]);
  const chunks: Chunk[] = [];
  for (let from = 0; from < segs.length; from += 6) {
    const to = Math.min(segs.length, from + 6);
    const e = Es.slice(from, to + 1);
    const n = Ns.slice(from, to + 1);
    chunks.push({ from, to, minE: Math.min(...e), maxE: Math.max(...e), minN: Math.min(...n), maxN: Math.max(...n) });
  }
  return { segs, chunks, total: s, minE: Math.min(...Es), maxE: Math.max(...Es), minN: Math.min(...Ns), maxN: Math.max(...Ns) };
}

export type WaterCurve = { readonly id: string; readonly pts: readonly XY[]; /** Bed height at each curve sample. */ readonly bed: readonly number[] };

/**
 * A water course as drawn: a smooth curve through its control points, and its
 * bed — incisionM below the ground at each sample, never rising downstream
 * (where the ground ahead is higher, the bed keeps its level and the carve
 * deepens). So the water always lies in its valley.
 */
function bedCurve(id: string, ctrl: readonly XY[], incisionM: number, ground: (E: number, N: number) => number): WaterCurve {
  const pts = smoothCurve(ctrl, 2);
  const bed: number[] = [];
  let prev = Infinity;
  for (const [E, N] of pts) {
    prev = Math.min(prev, ground(E, N) - incisionM);
    bed.push(prev);
  }
  return { id, pts, bed };
}

let waterCache: { stream: WaterCurve; gullies: WaterCurve[] } | null = null;
/**
 * The stream and the gullies as drawn, with their falling beds. The stream is
 * cut into the natural ground first; the gullies take their beds from the ground
 * as the stream left it, so each one drains into the stream instead of hanging
 * above it.
 */
export function waterCourses() {
  if (!waterCache) {
    const stream = bedCurve(STREAM.id, STREAM.pts, STREAM.incisionM, naturalHeight);
    const streamCarve = { ...carveLine(stream), ...STREAM_CARVE };
    const ground = (E: number, N: number) => applyCarve(naturalHeight(E, N), E, N, streamCarve);
    waterCache = { stream, gullies: GULLIES.map((g) => bedCurve(g.id, g.pts, g.incisionM, ground)) };
  }
  return waterCache;
}

/** The carve uses the drawn curve, thinned to ~24 m chords (≤ 0.6 m from the 2 m curve). */
function carveLine(c: WaterCurve) {
  const keep: number[] = [0];
  let s = 0;
  for (let i = 1; i < c.pts.length; i++) {
    s += Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]);
    if (s >= 24 || i === c.pts.length - 1) {
      keep.push(i);
      s = 0;
    }
  }
  const pts = keep.map((i) => c.pts[i]);
  return { line: lineOf(pts), pts, bed: keep.map((i) => c.bed[i]) };
}

// ---------------------------------------------------------------- the generator

/** Regional surface: low in the south-west, rising to the north-east, gently undulating. */
function regional(E: number, N: number): number {
  return 300 + 0.014 * E + 0.012 * N + 9 * fbm(E / 600 + 3.1, N / 600 - 1.7, 3);
}

const domeK = DOMES.map((d, k) => ({
  ...d,
  sa: Math.sin(d.axisDeg * DEG),
  ca: Math.cos(d.axisDeg * DEG),
  lobes: 5 + (k % 3),
  phase: k * 1.37,
  twist: k % 2 ? 0.004 : -0.004,
}));

/** Tip rounding of the dome profile, in units of the dome's radius. */
const DOME_CAP = 0.13;
/**
 * The dome profile: a small rounded cap (convex only within ≈ 0.15 of the
 * radius) over concave flanks, as on real hills — so the slopes below are in
 * view from the top, where the navigator stands. A Gaussian would be convex
 * out to 0.7 of the radius and hide its own flanks from the summit.
 */
function domeProfile(rho: number): number {
  return Math.exp(-(Math.sqrt(rho * rho + DOME_CAP * DOME_CAP) - DOME_CAP) * 1.1 - 0.25 * rho * rho);
}

/**
 * The domes: rounded tops whose flanks break into radial spurs and gullies (the
 * modulation is nil at the top and grows down the slope), on a warped plan so
 * no dome reads as a perfect ellipse.
 */
function domeKernel(wE: number, wN: number): number {
  let h = 0;
  for (const d of domeK) {
    const dE = wE - d.E;
    const dN = wN - d.N;
    const along = dE * d.sa + dN * d.ca;
    const across = dE * d.ca - dN * d.sa;
    const q = (along / d.rAlong) ** 2 + (across / d.rAcross) ** 2;
    if (q > 16) continue;
    const r = Math.sqrt(q);
    const theta = Math.atan2(dE, dN);
    const dist = Math.hypot(dE, dN);
    const lobe = 0.62 * Math.sin(d.lobes * theta + d.phase + dist * d.twist) + 0.38 * Math.sin((d.lobes + 3) * theta - d.phase * 1.7 + dist * d.twist * 1.6);
    h += d.rise * domeProfile(r) * (1 + 0.3 * smoothstep(0.3, 1.2, r) * lobe);
  }
  return h;
}

const ridgeLines = RIDGES.map((r) => ({ spec: r, line: lineOf(r.pts) }));

/**
 * Per-segment evaluation along a polyline: f(d, segment, t, side) for each segment
 * within reach, combined with `pick` (max for ridges, min for valleys). Every
 * segment's own value is continuous, so the combination never jumps — unlike a
 * single nearest point, whose arc length jumps on the inside of a bend.
 */
function alongSegments(line: Line, E: number, N: number, reachM: number, f: (d: number, k: number, t: number, side: number) => number, pick: (a: number, b: number) => number, none: number): number {
  let out = none;
  for (const c of line.chunks) {
    if (E < c.minE - reachM || E > c.maxE + reachM || N < c.minN - reachM || N > c.maxN + reachM) continue;
    for (let k = c.from; k < c.to; k++) {
      const g = line.segs[k];
      const t = g.len2 === 0 ? 0 : Math.min(1, Math.max(0, ((E - g.ax) * g.dx + (N - g.ay) * g.dy) / g.len2));
      const d = Math.hypot(E - (g.ax + t * g.dx), N - (g.ay + t * g.dy));
      if (d > reachM) continue;
      const side = d < 1e-6 ? 0 : (g.dy * (E - g.ax) - g.dx * (N - g.ay)) / (g.len * d);
      out = pick(out, f(d, k, t, side));
    }
  }
  return out;
}

/** Ridge lines with lateral spurs that alternate from side to side along them. */
function ridgeKernel(E: number, N: number): number {
  let h = 0;
  for (const { spec, line } of ridgeLines) {
    const reach = spec.width * 3;
    if (E < line.minE - reach || E > line.maxE + reach || N < line.minN - reach || N > line.maxN + reach) continue;
    h += alongSegments(
      line,
      E,
      N,
      reach,
      (d, k, t, side) => {
        const g = line.segs[k];
        const spur = 1 + 0.28 * Math.sin((g.s0 + t * g.len) / 62 + side * 1.9) * smoothstep(0.25, 1, d / spec.width);
        return (spec.rise[k] + (spec.rise[k + 1] - spec.rise[k]) * t) * Math.exp(-((d / (spec.width * spur)) ** 2));
      },
      Math.max,
      0,
    );
  }
  return h;
}

function distantKernel(E: number, N: number): number {
  let h = 0;
  for (const d of DISTANT_HILLS) {
    const q = ((E - d.E) ** 2 + (N - d.N) ** 2) / (d.r * d.r);
    if (q < 9) h += d.rise * Math.exp(-q) * (1 + 0.25 * valueNoise(E / 400 + d.E, N / 400 - d.N));
  }
  return h;
}

/** Fine relief: small rounded spurs and runnels (ridged noise with a softened crest) and a little roughness. */
function slopeDetail(E: number, N: number): number {
  const n = valueNoise(E / 110 + 2.2, N / 110 - 5.1);
  const r = 1.12 - Math.sqrt(n * n + 0.03);
  return 4.2 * (r * r - 0.45) + 1.2 * valueNoise(E / 42 - 1.3, N / 42 + 8.4) + 0.45 * valueNoise(E / 17 + 4.1, N / 17 - 2.2);
}

/** Smooth minimum (polynomial), k in metres — the carve meets the slopes without a crease. */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
}

/**
 * A water course's inner valley: a flat floor floorM wide either side of the
 * line, banks rising at bankSlope, met by the slopes through a smooth minimum.
 * The broad valley is the natural low ground between the landforms; the carve
 * only incises it, and fades out between fadeM and reachM so it never ends in
 * a step.
 */
type CarveShape = { floorM: number; bankSlope: number; k: number; fadeM: number; reachM: number };
type Carve = CarveShape & { line: Line; pts: XY[]; bed: number[] };
const STREAM_CARVE: CarveShape = { floorM: 7, bankSlope: 0.5, k: 8, fadeM: 80, reachM: 130 };
const GULLY_CARVE: CarveShape = { floorM: 2.5, bankSlope: 0.55, k: 5, fadeM: 45, reachM: 75 };
let carveCache: Carve[] | null = null;
function carves(): Carve[] {
  if (!carveCache) {
    const { stream, gullies } = waterCourses();
    carveCache = [{ ...carveLine(stream), ...STREAM_CARVE }, ...gullies.map((g) => ({ ...carveLine(g), ...GULLY_CARVE }))];
  }
  return carveCache;
}

/** One carve applied to a height h at (E, N). */
function applyCarve(h: number, E: number, N: number, c: Carve): number {
  const l = c.line;
  if (E < l.minE - c.reachM || E > l.maxE + c.reachM || N < l.minN - c.reachM || N > l.maxN + c.reachM) return h;
  let dMin = Infinity;
  const valley = alongSegments(
    l,
    E,
    N,
    c.reachM,
    (d, k, t) => {
      dMin = Math.min(dMin, d);
      return c.bed[k] + (c.bed[k + 1] - c.bed[k]) * t + Math.max(0, d - c.floorM) * c.bankSlope + 0.6 * Math.min(1, d / c.floorM) ** 2;
    },
    Math.min,
    Infinity,
  );
  return valley < Infinity ? h + (smin(h, valley, c.k) - h) * (1 - smoothstep(c.fadeM, c.reachM, dMin)) : h;
}

const VILLAGE_C = { E: 300, N: 1575 };

/** The landforms before the water courses incise them. */
function naturalHeight(E: number, N: number): number {
  const wE = E + 48 * valueNoise(E / 330 + 7.7, N / 330 + 1.1) + 16 * valueNoise(E / 120 - 2.1, N / 120 + 6.3);
  const wN = N + 48 * valueNoise(E / 330 - 3.3, N / 330 + 4.4) + 16 * valueNoise(E / 120 + 5.5, N / 120 - 0.7);
  let h = regional(E, N) + ridgeKernel(wE, wN) + domeKernel(wE, wN) + distantKernel(E, N) + slopeDetail(E, N);
  // The village sits on a gentle shoulder: the ground eases toward a level platform.
  const dv = Math.hypot(E - VILLAGE_C.E, N - VILLAGE_C.N);
  if (dv < 260) {
    const w = 1 - smoothstep(110, 260, dv);
    h += (366 + 0.03 * (N - VILLAGE_C.N) - h) * w * 0.55;
  }
  return h;
}

/**
 * The deterministic generator, metres. Defined everywhere, so the 3D apron
 * beyond the mapped sheet continues the same ground to the horizon.
 */
export function heightField(E: number, N: number): number {
  let h = naturalHeight(E, N);
  for (const c of carves()) h = applyCarve(h, E, N, c);
  return h;
}

// ---------------------------------------------------------------- height grid

export const GRID = { stepM: 5, nE: 281, nN: 351 } as const;

let gridCache: Float64Array | null = null;
let gridRows = 0;
let gridPartial: Float64Array | null = null;
function fillRows(g: Float64Array, from: number, to: number) {
  for (let j = from; j < to; j++) for (let i = 0; i < GRID.nE; i++) g[j * GRID.nE + i] = heightField(i * GRID.stepM, j * GRID.stepM);
}
/** Heights at the grid samples, row-major from the south: index j·nE + i ↔ (E = 5i, N = 5j). */
export function heightGrid(): Float64Array {
  if (!gridCache) {
    const g = gridPartial ?? new Float64Array(GRID.nE * GRID.nN);
    fillRows(g, gridRows, GRID.nN);
    gridCache = g;
    gridPartial = null;
  }
  return gridCache;
}

const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0));
let preparing: Promise<void> | null = null;
/**
 * Computes the grid, the contours and the cover lists in short slices (≈ 30 ms
 * each), yielding to the browser between them, so opening the activity never
 * blocks the page. The results are the same memoised values the synchronous
 * accessors return (and compute on demand if called first).
 */
export function prepareTerrain(): Promise<void> {
  preparing ??= (async () => {
    if (!gridCache) {
      gridPartial ??= new Float64Array(GRID.nE * GRID.nN);
      while (gridRows < GRID.nN && !gridCache) {
        const t0 = performance.now();
        while (gridRows < GRID.nN && performance.now() - t0 < 30) {
          const to = Math.min(GRID.nN, gridRows + 4);
          fillRows(gridPartial, gridRows, to);
          gridRows = to;
        }
        await yieldToBrowser();
      }
      heightGrid();
    }
    for (const step of [contours, summits, domeFootprints, roads, waterCourses, trees, houses, shrubs, boulders, groundTufts, groundStones, contourLabels]) {
      step();
      await yieldToBrowser();
    }
  })();
  return preparing;
}

export function insideSheet(E: number, N: number): boolean {
  return E >= WORLD_BOUNDS.minE && E <= WORLD_BOUNDS.maxE && N >= WORLD_BOUNDS.minN && N <= WORLD_BOUNDS.maxN;
}

/**
 * Ground height at (E, N), interpolated on the mesh triangle that contains the
 * point (cell split SW–NE). Outside the sheet the apron mesh samples the
 * generator directly, so this does too.
 */
export function heightAt(E: number, N: number): number {
  if (!insideSheet(E, N)) return heightField(E, N);
  const g = heightGrid();
  const fi = E / GRID.stepM;
  const fj = N / GRID.stepM;
  const i = Math.min(Math.floor(fi), GRID.nE - 2);
  const j = Math.min(Math.floor(fj), GRID.nN - 2);
  const u = fi - i;
  const v = fj - j;
  const a = g[j * GRID.nE + i];
  const b = g[j * GRID.nE + i + 1];
  const c = g[(j + 1) * GRID.nE + i + 1];
  const d = g[(j + 1) * GRID.nE + i];
  return u >= v ? a + u * (b - a) + v * (c - b) : a + v * (d - a) + u * (c - d);
}

/** Ground slope (rise over run) at a point, from the mesh. */
export function slopeAt(E: number, N: number): number {
  const s = 2.5;
  return Math.hypot(heightAt(E + s, N) - heightAt(E - s, N), heightAt(E, N + s) - heightAt(E, N - s)) / (2 * s);
}

/**
 * Mesh axis for the 3D terrain: exactly the 5 m sheet samples, then spacing that
 * grows geometrically outward to `extentM` beyond the sheet (the apron that
 * carries the ground to the hazy horizon). A rectilinear grid, so the apron
 * joins the sheet without cracks.
 */
export function meshAxis(min: number, max: number, extentM: number, growth = 1.2): number[] {
  const n = Math.round((max - min) / GRID.stepM);
  const inner = Array.from({ length: n + 1 }, (_, k) => min + k * GRID.stepM);
  const before: number[] = [];
  const after: number[] = [];
  let s = GRID.stepM;
  let lo = min;
  let hi = max;
  while (lo > min - extentM) {
    s *= growth;
    lo -= s;
    hi += s;
    before.unshift(lo);
    after.push(hi);
  }
  return [...before, ...inner, ...after];
}

// ---------------------------------------------------------------- contours

export type ContourLine = { readonly pts: readonly XY[]; readonly closed: boolean };
export type ContourLevel = { readonly heightM: number; readonly index: boolean; readonly lines: readonly ContourLine[] };

/** Marching triangles on the grid's SW–NE triangles at one level. */
function extractLevel(g: Float64Array, level: number): ContourLine[] {
  const nE = GRID.nE;
  const nN = GRID.nN;
  const H_EDGES = (nE - 1) * nN;
  const V_EDGES = nE * (nN - 1);
  const nEdges = H_EDGES + V_EDGES + (nE - 1) * (nN - 1);
  const hEdge = (i: number, j: number) => j * (nE - 1) + i;
  const vEdge = (i: number, j: number) => H_EDGES + j * nE + i;
  const dEdge = (i: number, j: number) => H_EDGES + V_EDGES + j * (nE - 1) + i;
  const ptE = new Float64Array(nEdges);
  const ptN = new Float64Array(nEdges);
  const seg0 = new Int32Array(nEdges).fill(-1);
  const seg1 = new Int32Array(nEdges).fill(-1);
  const seen = new Uint8Array(nEdges);
  const segA: number[] = [];
  const segB: number[] = [];
  // Vertex classification: strictly above the level vs not — every triangle then
  // has 0 or 2 crossing edges, and a shared edge yields one shared point.
  const cross = (edge: number, p: number, q: number) => {
    const hp = g[p];
    const hq = g[q];
    if (hp > level === hq > level) return -1;
    if (!seen[edge]) {
      seen[edge] = 1;
      const t = (level - hp) / (hq - hp);
      const Ep = (p % nE) * GRID.stepM;
      const Np = Math.floor(p / nE) * GRID.stepM;
      const Eq = (q % nE) * GRID.stepM;
      const Nq = Math.floor(q / nE) * GRID.stepM;
      ptE[edge] = Ep + t * (Eq - Ep);
      ptN[edge] = Np + t * (Nq - Np);
    }
    return edge;
  };
  const link = (e: number, s: number) => {
    if (seg0[e] === -1) seg0[e] = s;
    else seg1[e] = s;
  };
  const tri = (e1: number, e2: number, e3: number) => {
    const x = e1 >= 0 ? e1 : e2;
    const y = e1 >= 0 ? (e2 >= 0 ? e2 : e3) : e3;
    if (x < 0 || y < 0) return;
    const s = segA.length;
    segA.push(x);
    segB.push(y);
    link(x, s);
    link(y, s);
  };
  for (let j = 0; j < nN - 1; j++) {
    for (let i = 0; i < nE - 1; i++) {
      const a = j * nE + i;
      const b = a + 1;
      const c = a + nE + 1;
      const d = a + nE;
      const above = (g[a] > level ? 1 : 0) + (g[b] > level ? 1 : 0) + (g[c] > level ? 1 : 0) + (g[d] > level ? 1 : 0);
      if (above === 0 || above === 4) continue;
      const ac = cross(dEdge(i, j), a, c);
      tri(cross(hEdge(i, j), a, b), cross(vEdge(i + 1, j), b, c), ac);
      tri(ac, cross(hEdge(i, j + 1), d, c), cross(vEdge(i, j), a, d));
    }
  }
  const used = new Uint8Array(segA.length);
  const walk = (start: number, fromSeg: number, out: number[]) => {
    let cur = start;
    let prev = fromSeg;
    for (;;) {
      const s0 = seg0[cur];
      const s1 = seg1[cur];
      const next = s0 !== prev && s0 >= 0 && !used[s0] ? s0 : s1 !== prev && s1 >= 0 && !used[s1] ? s1 : -1;
      if (next < 0) return;
      used[next] = 1;
      const other = segA[next] === cur ? segB[next] : segA[next];
      out.push(other);
      cur = other;
      prev = next;
    }
  };
  const lines: ContourLine[] = [];
  for (let s = 0; s < segA.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const fwd: number[] = [segA[s], segB[s]];
    walk(segB[s], s, fwd);
    const closed = fwd.length > 2 && fwd[0] === fwd[fwd.length - 1];
    let keys = fwd;
    if (closed) keys = fwd.slice(0, -1);
    else {
      const back: number[] = [];
      walk(segA[s], s, back);
      keys = [...back.reverse(), ...fwd];
    }
    lines.push({ pts: keys.map((k) => [ptE[k], ptN[k]] as XY), closed });
  }
  return lines;
}

let contourCache: ContourLevel[] | null = null;
/** Every contour level of the sheet, from the mesh triangles. */
export function contours(): readonly ContourLevel[] {
  if (!contourCache) {
    const g = heightGrid();
    let lo = Infinity;
    let hi = -Infinity;
    for (const h of g) {
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    const out: ContourLevel[] = [];
    for (let h = Math.ceil(lo / CONTOUR_INTERVAL_M) * CONTOUR_INTERVAL_M; h <= hi; h += CONTOUR_INTERVAL_M) {
      out.push({ heightM: h, index: h % INDEX_INTERVAL_M === 0, lines: extractLevel(g, h) });
    }
    contourCache = out;
  }
  return contourCache;
}

// ---------------------------------------------------------------- summits and checkpoints

export type Summit = { readonly id: DomeId; readonly E: number; readonly N: number; readonly heightM: number };

let summitCache: Summit[] | null = null;
/** Each dome's real summit: the highest grid sample within 140 m of its generator centre. */
export function summits(): readonly Summit[] {
  if (!summitCache) {
    const g = heightGrid();
    summitCache = DOMES.map((d) => {
      let best: Summit = { id: d.id, E: d.E, N: d.N, heightM: -Infinity };
      const R = 140;
      for (let j = Math.ceil((d.N - R) / GRID.stepM); j <= Math.floor((d.N + R) / GRID.stepM); j++) {
        for (let i = Math.ceil((d.E - R) / GRID.stepM); i <= Math.floor((d.E + R) / GRID.stepM); i++) {
          if (i < 0 || j < 0 || i >= GRID.nE || j >= GRID.nN) continue;
          if ((i * GRID.stepM - d.E) ** 2 + (j * GRID.stepM - d.N) ** 2 > R * R) continue;
          const h = g[j * GRID.nE + i];
          if (h > best.heightM) best = { id: d.id, E: i * GRID.stepM, N: j * GRID.stepM, heightM: h };
        }
      }
      return best;
    });
  }
  return summitCache;
}

export function summitOf(id: DomeId): Summit {
  return summits().find((s) => s.id === id)!;
}

/** Where a checkpoint is: a route dome's summit, or the square's centre (B). */
export function checkpoint(id: CheckpointId): Point {
  if (id === 'B') return SQUARE_CENTER;
  const s = summitOf(id);
  return { E: s.E, N: s.N };
}

/** The route's points in order: A, then every checkpoint. */
export function routePoints(): Point[] {
  return [START, ...ROUTE.map(checkpoint)];
}

let footprintCache: Map<DomeId, Uint8Array> | null = null;
/** Grid cells that belong to a dome's top: connected to the summit and at most 25 m below it (the closed contours around it). */
export const DOME_TOP_DROP_M = 25;
export function domeFootprints(): Map<DomeId, Uint8Array> {
  if (!footprintCache) {
    const g = heightGrid();
    footprintCache = new Map();
    for (const s of summits()) {
      const mask = new Uint8Array(GRID.nE * GRID.nN);
      const floor = s.heightM - DOME_TOP_DROP_M;
      const stack = [Math.round(s.N / GRID.stepM) * GRID.nE + Math.round(s.E / GRID.stepM)];
      while (stack.length) {
        const k = stack.pop()!;
        if (mask[k] || g[k] < floor) continue;
        mask[k] = 1;
        const i = k % GRID.nE;
        const j = (k - i) / GRID.nE;
        if (i > 0) stack.push(k - 1);
        if (i < GRID.nE - 1) stack.push(k + 1);
        if (j > 0) stack.push(k - GRID.nE);
        if (j < GRID.nN - 1) stack.push(k + GRID.nE);
      }
      footprintCache.set(s.id, mask);
    }
  }
  return footprintCache;
}

// ---------------------------------------------------------------- roads

export type Road = { readonly id: RoadId; readonly pts: readonly XY[] };

let roadCache: Road[] | null = null;
/** Smooth curves through every control point, sampled about every 2 m. */
export function roads(): readonly Road[] {
  if (!roadCache) roadCache = (Object.keys(ROAD_CONTROL_POINTS) as RoadId[]).map((id) => ({ id, pts: smoothCurve(ROAD_CONTROL_POINTS[id], 2) }));
  return roadCache;
}

/** Spatial hash of samples of the linear features (roads, stream, gullies) for "near it?" tests. */
const HASH_CELL = 20;
let lineHash: Map<number, { E: number; N: number; kind: 'road' | 'stream' | 'gully' }[]> | null = null;
function lineSamplesNear(p: Point, radiusM: number) {
  if (!lineHash) {
    lineHash = new Map();
    const add = (pts: readonly XY[], kind: 'road' | 'stream' | 'gully') => {
      for (const q of pts) {
        const k = Math.floor(q[0] / HASH_CELL) * 100000 + Math.floor(q[1] / HASH_CELL);
        const list = lineHash!.get(k);
        const item = { E: q[0], N: q[1], kind };
        if (list) list.push(item);
        else lineHash!.set(k, [item]);
      }
    };
    for (const r of roads()) add(r.pts, 'road');
    const w = waterCourses();
    add(w.stream.pts, 'stream');
    for (const g of w.gullies) add(g.pts, 'gully');
  }
  const reach = Math.ceil(radiusM / HASH_CELL);
  const ci = Math.floor(p.E / HASH_CELL);
  const cj = Math.floor(p.N / HASH_CELL);
  const out: { E: number; N: number; kind: 'road' | 'stream' | 'gully' }[] = [];
  for (let di = -reach; di <= reach; di++) for (let dj = -reach; dj <= reach; dj++) out.push(...(lineHash.get((ci + di) * 100000 + cj + dj) ?? []));
  return out;
}

/** Whether p is within radius of a road, the stream or a gully (samples ≤ 2 m apart). */
export function nearLine(p: Point, radiusM: number, kinds: readonly ('road' | 'stream' | 'gully')[] = ['road', 'stream', 'gully']): boolean {
  const r2 = (radiusM + 1) ** 2;
  return lineSamplesNear(p, radiusM).some((q) => kinds.includes(q.kind) && (q.E - p.E) ** 2 + (q.N - p.N) ** 2 <= r2);
}

// ---------------------------------------------------------------- shapes

const groveRings = GROVES.map((g) => ({ id: g.id, ring: ringPoints(g.ring) }));
const woodlandRings = WOODLAND.map((w) => ringPoints(w.ring));
const orchardRings = ORCHARDS.map((o) => ringPoints(o.ring));
const fieldRings = FIELDS.map((f) => ringPoints(f.ring));
const villageRing = ringPoints(VILLAGE_RING);
const squareRing = ringPoints(SQUARE_RING);

export const inRing = (p: Point, ring: readonly XY[]) => pointInPolygon(p, ringPoints(ring));

/** Open ground around each route summit stays clear of trees: the navigator's view from it is not blocked. */
const SUMMIT_CLEAR_M = 70;
function nearSummit(p: Point, extra = 0): boolean {
  return summits().some((s) => (s.id === 'H1' || s.id === 'H2' || s.id === 'H3' ? Math.hypot(p.E - s.E, p.N - s.N) < SUMMIT_CLEAR_M + extra : false));
}

// ---------------------------------------------------------------- trees

export type TreeKind = 'pine' | 'oak' | 'olive';
export type TreeGroup = GroveId | 'woodland' | 'orchard' | 'lone';
export type Tree = {
  readonly group: TreeGroup;
  readonly kind: TreeKind;
  readonly E: number;
  readonly N: number;
  /** Ground height under the trunk (heightAt). */
  readonly baseM: number;
  readonly heightM: number;
  readonly crownR: number;
  readonly spin: number;
  /** 0–1 colour variation. */
  readonly tone: number;
};

/** Bridson Poisson-disk sampling inside a ring. */
function poissonInRing(ring: readonly Point[], minDist: number, margin: number, rand: () => number): Point[] {
  const xs = ring.map((p) => p.E);
  const ys = ring.map((p) => p.N);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const cell = minDist / Math.SQRT2;
  const gw = Math.ceil((x1 - x0) / cell) + 1;
  const gh = Math.ceil((y1 - y0) / cell) + 1;
  const grid = new Int32Array(gw * gh).fill(-1);
  const pts: Point[] = [];
  const ok = (p: Point) => {
    if (p.E < x0 || p.E > x1 || p.N < y0 || p.N > y1) return false;
    if (!pointInPolygon(p, ring) || distanceToPolyline(p, ring, true) < margin) return false;
    const gx = Math.floor((p.E - x0) / cell);
    const gy = Math.floor((p.N - y0) / cell);
    for (let y = Math.max(0, gy - 2); y <= Math.min(gh - 1, gy + 2); y++) {
      for (let x = Math.max(0, gx - 2); x <= Math.min(gw - 1, gx + 2); x++) {
        const k = grid[y * gw + x];
        if (k >= 0 && distance(pts[k], p) < minDist) return false;
      }
    }
    return true;
  };
  const add = (p: Point) => {
    grid[Math.floor((p.N - y0) / cell) * gw + Math.floor((p.E - x0) / cell)] = pts.length;
    pts.push(p);
  };
  // Seed at the first point that fits, scanning from the centroid outward.
  const cE = xs.reduce((s, v) => s + v, 0) / xs.length;
  const cN = ys.reduce((s, v) => s + v, 0) / ys.length;
  const seed = [{ E: cE, N: cN }, ...Array.from({ length: 200 }, () => ({ E: x0 + rand() * (x1 - x0), N: y0 + rand() * (y1 - y0) }))].find(ok);
  if (!seed) return pts;
  add(seed);
  const active = [0];
  while (active.length) {
    const ai = Math.floor(rand() * active.length);
    const base = pts[active[ai]];
    let placed = false;
    for (let k = 0; k < 30; k++) {
      const r = minDist * (1 + rand());
      const a = rand() * Math.PI * 2;
      const p = { E: base.E + Math.cos(a) * r, N: base.N + Math.sin(a) * r };
      if (ok(p)) {
        add(p);
        active.push(pts.length - 1);
        placed = true;
        break;
      }
    }
    if (!placed) active.splice(ai, 1);
  }
  return pts;
}

/** Clear of roads (surface + verge), the stream and the gully beds. */
const clearOfLines = (p: Point, extra = 0) => !nearLine(p, ROAD_WIDTH_M / 2 + 3 + extra, ['road']) && !nearLine(p, 9 + extra, ['stream']) && !nearLine(p, 4 + extra, ['gully']);

let treeCache: Tree[] | null = null;
/** Every tree of the sheet — the same list feeds the 3D instances and the map's tree symbols. */
export function trees(): readonly Tree[] {
  if (!treeCache) {
    const out: Tree[] = [];
    // Planted pine groves: dense, tall, dark.
    for (const g of GROVES) {
      const rand = rng(g.seed);
      const ring = ringPoints(g.ring);
      for (const p of poissonInRing(ring, 7.2, 2, rand)) {
        if (!clearOfLines(p)) continue;
        out.push({ group: g.id, kind: 'pine', E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 11 + rand() * 4, crownR: 3.1 + rand() * 1.1, spin: rand() * Math.PI * 2, tone: rand() });
      }
    }
    // Natural woodland: scattered oaks and carobs, thinned in patches.
    WOODLAND.forEach((w, k) => {
      const rand = rng(0x9e3779b9 ^ (k * 0x85ebca6b));
      for (const p of poissonInRing(ringPoints(w.ring), 11, 3, rand)) {
        const patch = 0.5 + 0.5 * valueNoise(p.E / 60 + k * 3.1, p.N / 60 - k);
        const keep = rand();
        if (keep > 0.35 + patch * 0.6 || !clearOfLines(p) || nearSummit(p)) continue;
        out.push({ group: 'woodland', kind: 'oak', E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 6.5 + rand() * 3.5, crownR: 3.6 + rand() * 2, spin: rand() * Math.PI * 2, tone: rand() });
      }
    });
    // Olive orchards: trees in rows.
    ORCHARDS.forEach((o, k) => {
      const rand = rng(0x510e527f ^ (k * 0x2545f491));
      const ring = orchardRings[k];
      const a = o.rowDeg * DEG;
      const ux = Math.sin(a);
      const uy = Math.cos(a);
      const xs = ring.map((p) => p.E);
      const ys = ring.map((p) => p.N);
      const c = { E: (Math.min(...xs) + Math.max(...xs)) / 2, N: (Math.min(...ys) + Math.max(...ys)) / 2 };
      const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      for (let r = -R; r <= R; r += o.spacingM) {
        for (let s = -R; s <= R; s += o.spacingM) {
          const p = { E: c.E + ux * s + uy * r, N: c.N + uy * s - ux * r };
          if (!pointInPolygon(p, ring) || distanceToPolyline(p, ring, true) < 3 || !clearOfLines(p)) continue;
          if (rand() < 0.06) continue; // a few gaps, as in an old grove
          out.push({ group: 'orchard', kind: 'olive', E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 4 + rand() * 1.4, crownR: 2.4 + rand() * 0.7, spin: rand() * Math.PI * 2, tone: rand() });
        }
      }
    });
    // Lone trees on open slopes and along the stream.
    {
      const rand = rng(0x1f83d9ab);
      const STEP = 32;
      for (let N = STEP / 2; N < WORLD_BOUNDS.maxN; N += STEP) {
        for (let E = STEP / 2; E < WORLD_BOUNDS.maxE; E += STEP) {
          const p = { E: E + (rand() - 0.5) * STEP * 0.9, N: N + (rand() - 0.5) * STEP * 0.9 };
          const keep = rand();
          const size = rand();
          const tone = rand();
          const spin = rand() * Math.PI * 2;
          const nearStream = nearLine(p, 26, ['stream']);
          const slopeBias = Math.min(0.25, slopeAt(p.E, p.N));
          if (keep > (nearStream ? 0.8 : 0.16 + slopeBias * 1.1)) continue;
          if (!insideSheet(p.E, p.N) || !clearOfLines(p, 2) || nearSummit(p, 25)) continue;
          if (groveRings.some((g) => pointInPolygon(p, g.ring)) || woodlandRings.some((r) => pointInPolygon(p, r)) || orchardRings.some((r) => pointInPolygon(p, r))) continue;
          if (fieldRings.some((r) => pointInPolygon(p, r)) || pointInPolygon(p, villageRing)) continue;
          if (Math.hypot(p.E - START.E, p.N - START.N) < 40 || Math.hypot(p.E - WATER_TOWER.E, p.N - WATER_TOWER.N) < 30) continue;
          out.push({ group: 'lone', kind: 'oak', E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 7 + size * 3.5, crownR: 3.8 + size * 2.2, spin, tone });
        }
      }
    }
    treeCache = out;
  }
  return treeCache;
}

/** A tree's crown as drawn: an ellipsoid from a short trunk up to the tree's height, crownR across. */
export function crownShape(t: Tree): { E: number; N: number; centerM: number; radiusM: number; halfHeightM: number } {
  const bottom = t.kind === 'pine' ? t.heightM * 0.42 : t.kind === 'olive' ? 1.1 : 1.8 + t.tone * 0.6;
  const halfHeightM = (t.heightM - bottom) / 2;
  return { E: t.E, N: t.N, centerM: t.baseM + bottom + halfHeightM, radiusM: t.crownR, halfHeightM };
}

// ---------------------------------------------------------------- village

export type House = {
  readonly E: number;
  readonly N: number;
  /** Footprint along / across `angleDeg` (a grid bearing of the long side), metres. */
  readonly lenM: number;
  readonly widM: number;
  readonly angleDeg: number;
  readonly floors: 1 | 2;
  readonly roof: 'flat' | 'tile';
  /** Lowest ground under the footprint — the walls start there (no house floats on a slope). */
  readonly baseM: number;
  /** Ground at the footprint's high side — the floor level. */
  readonly floorM: number;
  readonly tone: number;
};

/** Corners of a rotated rectangle (E, N), counter-clockwise from the rear-left. */
export function houseCorners(h: Pick<House, 'E' | 'N' | 'lenM' | 'widM' | 'angleDeg'>): Point[] {
  const a = h.angleDeg * DEG;
  const ux = Math.sin(a);
  const uy = Math.cos(a);
  const vx = Math.cos(a);
  const vy = -Math.sin(a);
  const l = h.lenM / 2;
  const w = h.widM / 2;
  return [
    { E: h.E - ux * l - vx * w, N: h.N - uy * l - vy * w },
    { E: h.E + ux * l - vx * w, N: h.N + uy * l - vy * w },
    { E: h.E + ux * l + vx * w, N: h.N + uy * l + vy * w },
    { E: h.E - ux * l + vx * w, N: h.N - uy * l + vy * w },
  ];
}

function roadBearingNear(p: Point): number {
  let best = Infinity;
  let deg = 0;
  for (const r of roads()) {
    for (let k = 0; k < r.pts.length - 1; k += 2) {
      const d = Math.hypot(r.pts[k][0] - p.E, r.pts[k][1] - p.N);
      if (d < best) {
        best = d;
        const q = r.pts[Math.min(k + 2, r.pts.length - 1)];
        deg = Math.atan2(q[0] - r.pts[k][0], q[1] - r.pts[k][1]) / DEG;
      }
    }
  }
  return deg;
}

let houseCache: House[] | null = null;
/**
 * The village houses: Poisson-disk lots inside the built-up area, off the
 * streets and the square, each turned to face the nearest street, plus a ring
 * of houses fronting the square. The map draws the same footprints.
 */
export function houses(): readonly House[] {
  if (!houseCache) {
    const rand = rng(0xa54ff53a);
    const out: House[] = [];
    const overlaps = (c: Point[]) =>
      out.some((o) => {
        const oc = houseCorners(o);
        // separating axis on the two rectangles' edge normals
        for (const poly of [c, oc]) {
          for (let k = 0; k < 4; k++) {
            const a = poly[k];
            const b = poly[(k + 1) % 4];
            const nx = b.N - a.N;
            const ny = -(b.E - a.E);
            const proj = (ps: Point[]) => ps.map((p) => p.E * nx + p.N * ny);
            const p1 = proj(c);
            const p2 = proj(oc);
            const gap = 3 * Math.hypot(nx, ny);
            if (Math.max(...p1) + gap < Math.min(...p2) || Math.max(...p2) + gap < Math.min(...p1)) return false;
          }
        }
        return true;
      });
    const place = (p: Point, angleDeg: number, lenM: number, widM: number) => {
      const h0 = { E: p.E, N: p.N, lenM, widM, angleDeg };
      const c = houseCorners(h0);
      if (!c.every((q) => pointInPolygon(q, villageRing))) return false;
      if (c.some((q) => nearLine(q, ROAD_WIDTH_M / 2 + 2.5, ['road'])) || nearLine(p, ROAD_WIDTH_M / 2 + 2.5 + widM / 2, ['road'])) return false;
      if (c.some((q) => distanceToPolyline(q, squareRing, true) < 4 || pointInPolygon(q, squareRing))) return false;
      if (Math.hypot(p.E - WATER_TOWER.E, p.N - WATER_TOWER.N) < 24) return false;
      if (overlaps(c)) return false;
      const gs = [...c, p].map((q) => heightAt(q.E, q.N));
      out.push({ ...h0, floors: rand() < 0.45 ? 2 : 1, roof: rand() < 0.45 ? 'tile' : 'flat', baseM: Math.min(...gs) - 0.3, floorM: Math.max(...gs), tone: rand() });
      return true;
    };
    // Houses fronting the square (their long side along its edge).
    const sq = squareRing;
    for (let k = 0; k < 4; k++) {
      const a = sq[k];
      const b = sq[(k + 1) % 4];
      const len = Math.hypot(b.E - a.E, b.N - a.N);
      const deg = Math.atan2(b.E - a.E, b.N - a.N) / DEG;
      // outward normal of a counter-clockwise ring: to the right of the edge direction
      const nx = (b.N - a.N) / len;
      const ny = -(b.E - a.E) / len;
      for (let t = 0.2; t < 0.95; t += 0.33) {
        const w = 9 + rand() * 2;
        const p = { E: a.E + (b.E - a.E) * t + nx * (4 + w / 2 + 2), N: a.N + (b.N - a.N) * t + ny * (4 + w / 2 + 2) };
        place(p, deg, 11 + rand() * 3, w);
      }
    }
    // The rest of the lots.
    const lots = poissonInRing(villageRing, 19, 6, rand);
    for (const p of lots) {
      const deg = roadBearingNear(p) + (rand() - 0.5) * 8;
      place(p, deg, 10 + rand() * 5, 8 + rand() * 3);
    }
    houseCache = out;
  }
  return houseCache;
}

// ---------------------------------------------------------------- ground detail (below the map's threshold)

export type Shrub = { readonly E: number; readonly N: number; readonly baseM: number; readonly heightM: number; readonly radiusM: number; readonly tone: number; readonly spin: number };

let shrubCache: Shrub[] | null = null;
/**
 * Low scrub (≤ 1.4 m): ground detail below the map's mapping threshold, so it
 * has no map symbol (as on any printed map at this scale). Patchy, denser on
 * the slopes; off the roads, the water, the fields, the village and the groves.
 */
export function shrubs(): readonly Shrub[] {
  if (!shrubCache) {
    const rand = rng(0x6c8e9cf5);
    const out: Shrub[] = [];
    const STEP = 9;
    for (let N = STEP / 2; N < WORLD_BOUNDS.maxN; N += STEP) {
      for (let E = STEP / 2; E < WORLD_BOUNDS.maxE; E += STEP) {
        const p = { E: E + (rand() - 0.5) * STEP * 0.95, N: N + (rand() - 0.5) * STEP * 0.95 };
        const keep = rand();
        const size = rand();
        const tone = rand();
        const spin = rand() * Math.PI * 2;
        const patch = 0.5 + 0.5 * valueNoise(p.E / 45 + 1.7, p.N / 45 - 3.3);
        const slope = slopeAt(p.E, p.N);
        if (keep > 0.06 + patch * 0.32 + Math.min(slope, 0.4) * 0.5) continue;
        if (!insideSheet(p.E, p.N) || !clearOfLines(p, 1) || nearEye(p, 10)) continue;
        if (fieldRings.some((r) => pointInPolygon(p, r)) || pointInPolygon(p, villageRing) || groveRings.some((g) => pointInPolygon(p, g.ring))) continue;
        out.push({ E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 0.5 + size * 0.9, radiusM: 0.7 + size * 1.2, tone, spin });
      }
    }
    shrubCache = out;
  }
  return shrubCache;
}

export type Boulder = { readonly E: number; readonly N: number; readonly baseM: number; readonly sizeM: number; readonly spin: number; readonly tone: number };

let boulderCache: Boulder[] | null = null;
/** Limestone boulders (≤ 2 m) where the slope is steep or the rock breaks through — below the map's threshold. */
export function boulders(): readonly Boulder[] {
  if (!boulderCache) {
    const rand = rng(0x1b2c3d4e);
    const out: Boulder[] = [];
    const STEP = 11;
    for (let N = STEP / 2; N < WORLD_BOUNDS.maxN; N += STEP) {
      for (let E = STEP / 2; E < WORLD_BOUNDS.maxE; E += STEP) {
        const p = { E: E + (rand() - 0.5) * STEP, N: N + (rand() - 0.5) * STEP };
        const keep = rand();
        const size = rand();
        const spin = rand() * Math.PI * 2;
        const tone = rand();
        const outcrop = 0.5 + 0.5 * valueNoise(p.E / 33 - 4.1, p.N / 33 + 2.6);
        const slope = slopeAt(p.E, p.N);
        if (keep > Math.max(0, outcrop - 0.55) * 1.1 + Math.max(0, slope - 0.16) * 1.4) continue;
        if (!insideSheet(p.E, p.N) || !clearOfLines(p, 1) || nearEye(p, 8)) continue;
        if (fieldRings.some((r) => pointInPolygon(p, r)) || pointInPolygon(p, villageRing) || orchardRings.some((r) => pointInPolygon(p, r))) continue;
        out.push({ E: p.E, N: p.N, baseM: heightAt(p.E, p.N), sizeM: 0.5 + size * size * 1.5, spin, tone });
      }
    }
    boulderCache = out;
  }
  return boulderCache;
}

/** Where the navigator stands on the hilltops (the route's dome summits). */
function hilltopEyes(): Point[] {
  return summits()
    .filter((s) => s.id === 'H1' || s.id === 'H2' || s.id === 'H3')
    .map((s) => ({ E: s.E, N: s.N }));
}
/** Nothing taller than a grass tuft stands right at the navigator's feet: it would fill the eye-level view. */
function nearEye(p: Point, radiusM: number): boolean {
  return hilltopEyes().some((q) => Math.hypot(p.E - q.E, p.N - q.N) < radiusM);
}

export type Tuft = { readonly E: number; readonly N: number; readonly baseM: number; readonly heightM: number; readonly spin: number; readonly tone: number };

/** Radius of the foreground ground detail around each hilltop where the navigator stands. */
export const NEAR_FIELD_M = 70;

let tuftCache: Tuft[] | null = null;
/**
 * Dry grass tufts (≤ 0.6 m) around the hilltops only — the foreground of the
 * navigator's eye-level view, far below any mapping threshold, on heightAt().
 */
export function groundTufts(): readonly Tuft[] {
  if (!tuftCache) {
    const rand = rng(0xa54ff53a);
    const out: Tuft[] = [];
    const STEP = 1.5;
    for (const c of hilltopEyes()) {
      for (let dN = -NEAR_FIELD_M; dN <= NEAR_FIELD_M; dN += STEP) {
        for (let dE = -NEAR_FIELD_M; dE <= NEAR_FIELD_M; dE += STEP) {
          const E = c.E + dE + (rand() - 0.5) * STEP;
          const N = c.N + dN + (rand() - 0.5) * STEP;
          const keep = rand();
          const h = rand();
          const spin = rand() * Math.PI * 2;
          const tone = rand();
          const d = Math.hypot(E - c.E, N - c.N);
          if (d > NEAR_FIELD_M || d < 1.2) continue;
          const patch = 0.5 + 0.5 * Math.sin(E / 6.3 + Math.sin(N / 4.1) * 1.7) * Math.cos(N / 7.7 - E / 11);
          if (keep > patch * (1 - (d / NEAR_FIELD_M) * 0.7)) continue;
          if (!clearOfLines({ E, N })) continue;
          out.push({ E, N, baseM: heightAt(E, N), heightM: 0.22 + h * 0.4, spin, tone });
        }
      }
    }
    tuftCache = out;
  }
  return tuftCache;
}

export type Stone = { readonly E: number; readonly N: number; readonly baseM: number; readonly sizeM: number; readonly spin: number; readonly tone: number };

let stoneCache: Stone[] | null = null;
/** Loose limestone stones (≤ 0.6 m) around the hilltops — the same foreground detail. */
export function groundStones(): readonly Stone[] {
  if (!stoneCache) {
    const rand = rng(0x5be0cd19);
    const out: Stone[] = [];
    const STEP = 2.6;
    const R = 60;
    for (const c of hilltopEyes()) {
      for (let dN = -R; dN <= R; dN += STEP) {
        for (let dE = -R; dE <= R; dE += STEP) {
          const E = c.E + dE + (rand() - 0.5) * STEP;
          const N = c.N + dN + (rand() - 0.5) * STEP;
          const keep = rand();
          const size = rand();
          const spin = rand() * Math.PI * 2;
          const tone = rand();
          const d = Math.hypot(E - c.E, N - c.N);
          if (d > R || d < 2.5) continue;
          const patch = 0.5 + 0.5 * Math.sin(E / 7.1 - Math.cos(N / 5.3) * 1.3) * Math.sin(N / 8.9 + E / 15);
          if (keep > 0.04 + patch * 0.2) continue;
          out.push({ E, N, baseM: heightAt(E, N), sizeM: 0.12 + size * size * 0.5, spin, tone });
        }
      }
    }
    stoneCache = out;
  }
  return stoneCache;
}

// ---------------------------------------------------------------- the navigator's eye

export type Eye = { readonly E: number; readonly N: number; readonly heightM: number };

export function eyeAt(p: Point): Eye {
  return { E: p.E, N: p.N, heightM: heightAt(p.E, p.N) + EYE_HEIGHT_M };
}

/** Whether the ground hides `target` from `eye` (terrain only), sampling heightAt every `stepM`. */
export function terrainClear(eye: Eye, target: Eye, stepM = 2): boolean {
  const d = Math.hypot(target.E - eye.E, target.N - eye.N);
  for (let s = stepM; s < d - stepM; s += stepM) {
    const t = s / d;
    const ground = heightAt(eye.E + (target.E - eye.E) * t, eye.N + (target.N - eye.N) * t);
    if (ground > eye.heightM + (target.heightM - eye.heightM) * t) return false;
  }
  return true;
}

// ---------------------------------------------------------------- map label placement

export type ContourLabel = { readonly heightM: number; readonly E: number; readonly N: number; /** Screen rotation on the north-up map, degrees (SVG, y down). */ readonly angleDeg: number };

let labelCache: ContourLabel[] | null = null;
/**
 * Where the index-contour heights are printed: on straight-ish stretches of
 * each index line, away from the exercise's points, roads, water and the sheet
 * edge, at most two per level.
 */
export function contourLabels(): readonly ContourLabel[] {
  if (!labelCache) {
    const avoid: Point[] = [START, SQUARE_CENTER, WATER_TOWER, ...summits().map((s) => ({ E: s.E, N: s.N }))];
    const out: ContourLabel[] = [];
    for (const lv of contours().filter((c) => c.index)) {
      const picks: (ContourLabel & { score: number })[] = [];
      for (const line of lv.lines) {
        const P = line.pts;
        if (P.length < 30) continue;
        for (let k = 8; k < P.length - 8; k += 4) {
          const [E, N] = P[k];
          const edge = Math.min(E - WORLD_BOUNDS.minE, WORLD_BOUNDS.maxE - E, N - WORLD_BOUNDS.minN, WORLD_BOUNDS.maxN - N);
          if (edge < 80) continue;
          const p = { E, N };
          if (nearLine(p, 30)) continue;
          const clear = Math.min(...avoid.map((a) => distance(a, p)));
          if (clear < 90) continue;
          const [Ea, Na] = P[k - 6];
          const [Eb, Nb] = P[k + 6];
          let len = 0;
          for (let q = k - 6; q < k + 6; q++) len += Math.hypot(P[q + 1][0] - P[q][0], P[q + 1][1] - P[q][1]);
          if (Math.hypot(Eb - Ea, Nb - Na) / len < 0.93) continue;
          picks.push({ heightM: lv.heightM, E, N, angleDeg: (Math.atan2(-(Nb - Na), Eb - Ea) * 180) / Math.PI, score: clear + edge * 0.3 });
        }
      }
      picks.sort((a, b) => b.score - a.score);
      const chosen: ContourLabel[] = [];
      for (const p of picks) {
        if (chosen.length === 2) break;
        if (chosen.some((c) => Math.hypot(c.E - p.E, c.N - p.N) < 420)) continue;
        if (out.some((c) => Math.hypot(c.E - p.E, c.N - p.N) < 130)) continue;
        chosen.push({ heightM: p.heightM, E: p.E, N: p.N, angleDeg: p.angleDeg });
      }
      out.push(...chosen);
    }
    labelCache = out;
  }
  return labelCache;
}
