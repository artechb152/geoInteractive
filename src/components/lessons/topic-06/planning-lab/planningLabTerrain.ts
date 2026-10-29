/**
 * The one terrain of the planning lab, and everything derived from it.
 *
 *   generator     heightField(E, N): a regional surface, the two summits and the
 *                 crest that joins them through the saddle, the low knolls, fixed
 *                 noise, and the stream and the ravine carved in with falling
 *                 beds. Fictional data for a training area.
 *   height grid   the generator every 5 m over the sheet (201 × 241 samples),
 *                 each cell split along its SW–NE diagonal. The 3D mesh uses
 *                 exactly these triangles and heightAt() interpolates on them, so
 *                 the route, the pins and every measurement sit on the drawn surface.
 *   contours      marching triangles on the same triangles (terrain-nav's
 *                 extractLevel) every 10 m, index every 50 m.
 *   cover         grove, woodland, orchard and lone trees, maquis, boulders, the
 *                 rocks at B and the building at A — deterministic lists that the
 *                 3D instances and the map symbols both read.
 *
 * Built on terrain-nav's machinery (noise, contour extraction, Poisson sampling,
 * mesh apron) without touching that activity's world. No three.js here, so the
 * map and plain Node use it too. Everything is computed once and memoised.
 */
import {
  CONTOUR_INTERVAL_M,
  CREST,
  DEST,
  DISTANT_HILLS,
  GROVE,
  INDEX_INTERVAL_M,
  KNOLLS,
  ORCHARD,
  PEAKS,
  RAVINE,
  ROAD_CONTROL_POINTS,
  ROAD_WIDTH_M,
  ROCKS,
  START,
  STREAM,
  BUILDING,
  WATER_TANK,
  WOODLAND,
  WORLD,
  type PeakId,
  type Point,
  type RoadId,
  type XY,
} from './planningLabWorld';
import { extractLevel, meshAxis, poissonInRing, rng, smoothCurve, valueNoise, type ContourLevel } from '../terrain-nav/terrainNavTerrain';
import { distanceToPolyline, pointInPolygon } from '../locationCheckGeometry';

const DEG = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const ringPoints = (ring: readonly XY[]): Point[] => ring.map(([E, N]) => ({ E, N }));

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

// ---------------------------------------------------------------- landforms

/** The terrain-nav dome profile: a small rounded cap over concave flanks. */
function domeProfile(rho: number): number {
  const cap = 0.13;
  return Math.exp(-(Math.sqrt(rho * rho + cap * cap) - cap) * 1.1 - 0.25 * rho * rho);
}

const peakK = PEAKS.map((d, k) => ({ ...d, sa: Math.sin(d.axisDeg * DEG), ca: Math.cos(d.axisDeg * DEG), lobes: 5 + k, phase: 0.9 + k * 1.37, twist: k % 2 ? 0.004 : -0.004 }));

/** The summits: rounded tops whose flanks break into radial spurs and gullies down the slope. */
function peakKernel(E: number, N: number): number {
  let h = 0;
  for (const d of peakK) {
    const dE = E - d.E;
    const dN = N - d.N;
    const along = dE * d.sa + dN * d.ca;
    const across = dE * d.ca - dN * d.sa;
    const q = (along / d.rAlong) ** 2 + (across / d.rAcross) ** 2;
    if (q > 16) continue;
    const r = Math.sqrt(q);
    const theta = Math.atan2(dE, dN);
    const dist = Math.hypot(dE, dN);
    const lobe = 0.62 * Math.sin(d.lobes * theta + d.phase + dist * d.twist) + 0.38 * Math.sin((d.lobes + 3) * theta - d.phase * 1.7 + dist * d.twist * 1.6);
    h = Math.max(h, d.rise * domeProfile(r) * (1 + 0.3 * smoothstep(0.3, 1.2, r) * lobe));
  }
  return h;
}

/**
 * The crest: per segment, the rise eased between the vertices (smoothstep, so
 * every vertex is a level point — the summits' shoulders and the saddle) and a
 * Gaussian fall-off across, with spurs alternating along the flanks.
 */
const crestSegs = CREST.pts.slice(0, -1).map((a, k) => {
  const b = CREST.pts[k + 1];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return { ax: a[0], ay: a[1], dx, dy, len: Math.hypot(dx, dy), r0: CREST.rise[k], r1: CREST.rise[k + 1] };
});
function crestKernel(E: number, N: number): number {
  let h = 0;
  const w = CREST.widthM;
  let s0 = 0;
  for (const g of crestSegs) {
    const t = clamp01(((E - g.ax) * g.dx + (N - g.ay) * g.dy) / (g.len * g.len));
    const d = Math.hypot(E - (g.ax + t * g.dx), N - (g.ay + t * g.dy));
    if (d < w * 3) {
      const side = d < 1e-6 ? 0 : (g.dy * (E - g.ax) - g.dx * (N - g.ay)) / (g.len * d);
      const spur = 1 + 0.26 * Math.sin((s0 + t * g.len) / 58 + side * 1.9) * smoothstep(0.3, 1, d / w);
      const rise = g.r0 + (g.r1 - g.r0) * smoothstep(0, 1, t);
      h = Math.max(h, rise * Math.exp(-((d / (w * spur)) ** 2)));
    }
    s0 += g.len;
  }
  return h;
}

function knollKernel(E: number, N: number): number {
  let h = 0;
  for (const k of [...KNOLLS, ...DISTANT_HILLS]) {
    const q = Math.hypot(E - k.E, N - k.N) / k.r;
    if (q < 4) h += k.rise * domeProfile(q);
  }
  return h;
}

/** Fine relief: small rounded spurs and runnels (terrain-nav's ridged noise) and roughness. */
function slopeDetail(E: number, N: number): number {
  const n = valueNoise(E / 100 + 2.2, N / 100 - 5.1);
  const r = 1.12 - Math.sqrt(n * n + 0.03);
  return 3.6 * (r * r - 0.45) + 1.1 * valueNoise(E / 38 - 1.3, N / 38 + 8.4) + 0.4 * valueNoise(E / 15 + 4.1, N / 15 - 2.2);
}

/** The landforms before the water incises them: low in the west, a stream valley south of the ridge, a road valley north of it. */
function naturalHeight(E: number, N: number): number {
  const wE = E + 26 * valueNoise(E / 280 + 7.7, N / 280 + 1.1) + 9 * valueNoise(E / 100 - 2.1, N / 100 + 6.3);
  const wN = N + 26 * valueNoise(E / 280 - 3.3, N / 280 + 4.4) + 9 * valueNoise(E / 100 + 5.5, N / 100 - 0.7);
  const regional = 300 + 0.006 * E + 0.006 * Math.max(0, N - 950) + 7 * fbm(E / 520 + 3.1, N / 520 - 1.7, 3);
  return regional + Math.max(peakKernel(wE, wN), crestKernel(wE, wN)) + knollKernel(E, N) + slopeDetail(E, N);
}

// ---------------------------------------------------------------- water

export type WaterCurve = { readonly id: 'stream' | 'ravine'; readonly pts: readonly XY[]; /** Bed height at each curve sample. */ readonly bed: readonly number[] };

function bedCurve(id: WaterCurve['id'], ctrl: readonly XY[], incisionM: number, ground: (E: number, N: number) => number): WaterCurve {
  const pts = smoothCurve(ctrl, 2);
  const bed: number[] = [];
  let prev = Infinity;
  for (const [E, N] of pts) {
    prev = Math.min(prev, ground(E, N) - incisionM);
    bed.push(prev);
  }
  return { id, pts, bed };
}

type CarveShape = { floorM: number; bankSlope: number; k: number; fadeM: number; reachM: number };
type Carve = CarveShape & { pts: XY[]; bed: number[]; minE: number; maxE: number; minN: number; maxN: number };
const STREAM_CARVE: CarveShape = { floorM: 5, bankSlope: 0.32, k: 7, fadeM: 70, reachM: 110 };
const RAVINE_CARVE: CarveShape = { floorM: 3, bankSlope: 0.27, k: 6, fadeM: 60, reachM: 95 };

/** The carve follows the drawn curve, thinned to ~16 m chords. */
function carveOf(c: WaterCurve, shape: CarveShape): Carve {
  const keep: number[] = [0];
  let s = 0;
  for (let i = 1; i < c.pts.length; i++) {
    s += Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]);
    if (s >= 16 || i === c.pts.length - 1) {
      keep.push(i);
      s = 0;
    }
  }
  const pts = keep.map((i) => c.pts[i]);
  const Es = pts.map((p) => p[0]);
  const Ns = pts.map((p) => p[1]);
  return { ...shape, pts: [...pts], bed: keep.map((i) => c.bed[i]), minE: Math.min(...Es), maxE: Math.max(...Es), minN: Math.min(...Ns), maxN: Math.max(...Ns) };
}

/** Smooth minimum (polynomial), k in metres. */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
}

function applyCarve(h: number, E: number, N: number, c: Carve): number {
  if (E < c.minE - c.reachM || E > c.maxE + c.reachM || N < c.minN - c.reachM || N > c.maxN + c.reachM) return h;
  let dMin = Infinity;
  let valley = Infinity;
  for (let k = 0; k < c.pts.length - 1; k++) {
    const [ax, ay] = c.pts[k];
    const dx = c.pts[k + 1][0] - ax;
    const dy = c.pts[k + 1][1] - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : clamp01(((E - ax) * dx + (N - ay) * dy) / len2);
    const d = Math.hypot(E - (ax + t * dx), N - (ay + t * dy));
    if (d > c.reachM) continue;
    dMin = Math.min(dMin, d);
    const v = c.bed[k] + (c.bed[k + 1] - c.bed[k]) * t + Math.max(0, d - c.floorM) * c.bankSlope + 0.5 * Math.min(1, d / c.floorM) ** 2;
    valley = Math.min(valley, v);
  }
  return valley < Infinity ? h + (smin(h, valley, c.k) - h) * (1 - smoothstep(c.fadeM, c.reachM, dMin)) : h;
}

let waterCache: { stream: WaterCurve; ravine: WaterCurve; carves: Carve[] } | null = null;
/** The stream and the ravine as drawn, with falling beds; the ravine drains into the stream as the stream left the ground. */
export function waterCourses(): { readonly stream: WaterCurve; readonly ravine: WaterCurve } {
  return water();
}
function water() {
  if (!waterCache) {
    const stream = bedCurve('stream', STREAM.pts, STREAM.incisionM, naturalHeight);
    const sc = carveOf(stream, STREAM_CARVE);
    const ravine = bedCurve('ravine', RAVINE.pts, RAVINE.incisionM, (E, N) => applyCarve(naturalHeight(E, N), E, N, sc));
    waterCache = { stream, ravine, carves: [sc, carveOf(ravine, RAVINE_CARVE)] };
  }
  return waterCache;
}

/** The deterministic generator, metres — defined everywhere, so the model's apron continues the same ground. */
export function heightField(E: number, N: number): number {
  let h = naturalHeight(E, N);
  for (const c of water().carves) h = applyCarve(h, E, N, c);
  return h;
}

// ---------------------------------------------------------------- height grid

export const GRID = { stepM: 5, nE: (WORLD.maxE - WORLD.minE) / 5 + 1, nN: (WORLD.maxN - WORLD.minN) / 5 + 1 } as const;

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
/** Computes the grid, the contours and the cover in short slices, yielding between them, so opening the lab never blocks the page. */
export function prepareWorld(): Promise<void> {
  preparing ??= (async () => {
    if (!gridCache) {
      gridPartial ??= new Float64Array(GRID.nE * GRID.nN);
      while (gridRows < GRID.nN && !gridCache) {
        const t0 = performance.now();
        while (gridRows < GRID.nN && performance.now() - t0 < 24) {
          const to = Math.min(GRID.nN, gridRows + 4);
          fillRows(gridPartial, gridRows, to);
          gridRows = to;
        }
        await yieldToBrowser();
      }
      heightGrid();
    }
    for (const step of [contours, summits, saddle, roads, waterCourses, contourLabels, trees, shrubs, boulders]) {
      step();
      await yieldToBrowser();
    }
    if (!toneCache) {
      tonePartial ??= { height: new Float32Array(TONE.nE * TONE.nN), scrub: new Float32Array(TONE.nE * TONE.nN) };
      while (toneRows < TONE.nN && !toneCache) {
        const t0 = performance.now();
        while (toneRows < TONE.nN && performance.now() - t0 < 24) {
          const to = Math.min(TONE.nN, toneRows + 6);
          fillToneRows(tonePartial, toneRows, to);
          toneRows = to;
        }
        await yieldToBrowser();
      }
      toneGrid();
    }
  })();
  return preparing;
}

// ---------------------------------------------------------------- the model's ground tone

/** The ground under the model's tone map: the sheet and 300 m around it, 10 m per sample (sample centres at +5 m). */
export const TONE = { minE: WORLD.minE - 300, minN: WORLD.minN - 300, stepM: 10, nE: (WORLD.maxE - WORLD.minE + 600) / 10, nN: (WORLD.maxN - WORLD.minN + 600) / 10 } as const;
export type ToneGrid = { readonly height: Float32Array; readonly scrub: Float32Array };

let toneCache: ToneGrid | null = null;
let toneRows = 0;
let tonePartial: { height: Float32Array; scrub: Float32Array } | null = null;
function fillToneRows(g: { height: Float32Array; scrub: Float32Array }, from: number, to: number) {
  for (let j = from; j < to; j++) {
    for (let i = 0; i < TONE.nE; i++) {
      const p = { E: TONE.minE + (i + 0.5) * TONE.stepM, N: TONE.minN + (j + 0.5) * TONE.stepM };
      g.height[j * TONE.nE + i] = heightAt(p.E, p.N);
      g.scrub[j * TONE.nE + i] = scrubCover(p);
    }
  }
}
/** Ground height and maquis cover at the tone samples, row-major from the south — read by the model's ground tone. */
export function toneGrid(): ToneGrid {
  if (!toneCache) {
    const g = tonePartial ?? { height: new Float32Array(TONE.nE * TONE.nN), scrub: new Float32Array(TONE.nE * TONE.nN) };
    fillToneRows(g, toneRows, TONE.nN);
    toneCache = g;
    tonePartial = null;
  }
  return toneCache;
}

export function insideSheet(E: number, N: number): boolean {
  return E >= WORLD.minE && E <= WORLD.maxE && N >= WORLD.minN && N <= WORLD.maxN;
}

/** Ground height at (E, N), on the mesh triangle that holds the point (cell split SW–NE); beyond the sheet, the generator (the apron). */
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
 * Whether the ground hides a point from an eye (both in metres, heights above
 * the datum): the sight line, marched over heightAt() — the drawn surface — in
 * steps of ≤ 4 m (500 at most), dips more than 1 m under the ground before its
 * last 15 m. That is a ridge or a summit between them, never the point's own slope.
 */
export function behindGround(eye: { E: number; N: number; heightM: number }, E: number, N: number, heightM: number): boolean {
  const dE = E - eye.E;
  const dN = N - eye.N;
  const dH = heightM - eye.heightM;
  const run = Math.hypot(dE, dN);
  const steps = Math.min(500, Math.ceil(run / 4));
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    if (run * (1 - t) < 15) break;
    if (eye.heightM + dH * t < heightAt(eye.E + dE * t, eye.N + dN * t) - 1) return true;
  }
  return false;
}

/** How far the model's apron reaches beyond the sheet, metres. */
export const APRON_M = 8000;

/** The 3D mesh as plain arrays: exactly the grid samples on the sheet, the generator on the apron; SW–NE triangles. */
export function terrainMeshArrays(toWorld3: (E: number, N: number, h: number) => [number, number, number]) {
  const xs = meshAxis(WORLD.minE, WORLD.maxE, APRON_M);
  const ns = meshAxis(WORLD.minN, WORLD.maxN, APRON_M);
  const nx = xs.length;
  const ny = ns.length;
  const g = heightGrid();
  const positions = new Float32Array(nx * ny * 3);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const E = xs[i];
      const N = ns[j];
      const h = insideSheet(E, N) ? g[Math.round(N / GRID.stepM) * GRID.nE + Math.round(E / GRID.stepM)] : heightField(E, N);
      positions.set(toWorld3(E, N, h), (j * nx + i) * 3);
    }
  }
  const index = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let k = 0;
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = a + nx;
      index.set([a, b, c, a, c, d], k);
      k += 6;
    }
  }
  return { positions, index, nx, ny, xs, ns };
}

// ---------------------------------------------------------------- contours

let contourCache: ContourLevel[] | null = null;
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
      out.push({ heightM: h, index: h % INDEX_INTERVAL_M === 0, lines: extractLevel(g, h, GRID) });
    }
    contourCache = out;
  }
  return contourCache;
}

// ---------------------------------------------------------------- summits and the saddle

export type Summit = { readonly id: PeakId; readonly E: number; readonly N: number; readonly heightM: number };

let summitCache: Summit[] | null = null;
/** Each summit as drawn: the highest grid sample within 130 m of its generator centre. */
export function summits(): readonly Summit[] {
  if (!summitCache) {
    const g = heightGrid();
    summitCache = PEAKS.map((d) => {
      let best: Summit = { id: d.id, E: d.E, N: d.N, heightM: -Infinity };
      const R = 130;
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

export function summitOf(id: PeakId): Summit {
  return summits().find((s) => s.id === id)!;
}

export type Saddle = { readonly E: number; readonly N: number; readonly heightM: number };
let saddleCache: Saddle | null = null;
/**
 * The saddle (col) as drawn: walking the crest from one summit to the other on
 * the grid (each step to the highest of the cells ahead), the lowest point of
 * that walk. Lowest along the crest, highest across it.
 */
export function saddle(): Saddle {
  if (!saddleCache) {
    const a = summitOf('peak-west');
    const b = summitOf('peak-east');
    // the crest line: for each station between the summits, the highest point across the line within ±70 m
    const n = Math.ceil(Math.hypot(b.E - a.E, b.N - a.N) / GRID.stepM);
    const ux = (b.E - a.E) / Math.hypot(b.E - a.E, b.N - a.N);
    const uy = (b.N - a.N) / Math.hypot(b.E - a.E, b.N - a.N);
    let best: Saddle = { E: a.E, N: a.N, heightM: Infinity };
    for (let k = 1; k < n; k++) {
      const cE = a.E + ((b.E - a.E) * k) / n;
      const cN = a.N + ((b.N - a.N) * k) / n;
      let top = { E: cE, N: cN, h: -Infinity };
      for (let s = -70; s <= 70; s += 2.5) {
        const E = cE - uy * s;
        const N = cN + ux * s;
        const h = heightAt(E, N);
        if (h > top.h) top = { E, N, h };
      }
      if (top.h < best.heightM) best = { E: top.E, N: top.N, heightM: top.h };
    }
    saddleCache = best;
  }
  return saddleCache;
}

// ---------------------------------------------------------------- roads

export type Road = { readonly id: RoadId; readonly pts: readonly XY[] };
let roadCache: Road[] | null = null;
export function roads(): readonly Road[] {
  if (!roadCache) roadCache = (Object.keys(ROAD_CONTROL_POINTS) as RoadId[]).map((id) => ({ id, pts: smoothCurve(ROAD_CONTROL_POINTS[id], 2) }));
  return roadCache;
}
export function roadOf(id: RoadId): Road {
  return roads().find((r) => r.id === id)!;
}

/** Whether p is within radius of a road, the stream or the ravine. */
const HASH = 20;
let lineHash: Map<number, { E: number; N: number; kind: 'road' | 'stream' | 'ravine' }[]> | null = null;
export function nearLine(p: Point, radiusM: number, kinds: readonly ('road' | 'stream' | 'ravine')[] = ['road', 'stream', 'ravine']): boolean {
  if (!lineHash) {
    lineHash = new Map();
    const add = (pts: readonly XY[], kind: 'road' | 'stream' | 'ravine') => {
      for (const q of pts) {
        const k = Math.floor(q[0] / HASH) * 100000 + Math.floor(q[1] / HASH);
        const item = { E: q[0], N: q[1], kind };
        const list = lineHash!.get(k);
        if (list) list.push(item);
        else lineHash!.set(k, [item]);
      }
    };
    for (const r of roads()) add(r.pts, 'road');
    const w = water();
    add(w.stream.pts, 'stream');
    add(w.ravine.pts, 'ravine');
  }
  const reach = Math.ceil(radiusM / HASH);
  const ci = Math.floor(p.E / HASH);
  const cj = Math.floor(p.N / HASH);
  const r2 = (radiusM + 1) ** 2;
  for (let di = -reach; di <= reach; di++) {
    for (let dj = -reach; dj <= reach; dj++) {
      for (const q of lineHash.get((ci + di) * 100000 + cj + dj) ?? []) if (kinds.includes(q.kind) && (q.E - p.E) ** 2 + (q.N - p.N) ** 2 <= r2) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- the building at A

export type Block = { readonly E: number; readonly N: number; readonly lenM: number; readonly widM: number; readonly angleDeg: number; readonly heightM: number; readonly roof: 'tile' | 'flat'; readonly baseM: number; readonly floorM: number };

/** Corners of a rotated rectangle (E, N); `angleDeg` is the grid bearing of the long side. */
export function blockCorners(h: Pick<Block, 'E' | 'N' | 'lenM' | 'widM' | 'angleDeg'>): Point[] {
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

let blockCache: Block[] | null = null;
/** The prominent building at A (a two-storey house with a tiled roof) and its low annex — walls start at the lowest ground under them. */
export function buildings(): readonly Block[] {
  if (!blockCache) {
    const a = BUILDING.angleDeg * DEG;
    const specs = [
      { E: BUILDING.E, N: BUILDING.N, lenM: BUILDING.lenM, widM: BUILDING.widM, angleDeg: BUILDING.angleDeg, heightM: 7, roof: 'tile' as const },
      { E: BUILDING.E + Math.sin(a) * 13.5 + Math.cos(a) * 2, N: BUILDING.N + Math.cos(a) * 13.5 - Math.sin(a) * 2, lenM: 9, widM: 7, angleDeg: BUILDING.angleDeg, heightM: 3.6, roof: 'flat' as const },
    ];
    blockCache = specs.map((s) => {
      const gs = [...blockCorners(s), s].map((q) => heightAt(q.E, q.N));
      return { ...s, baseM: Math.min(...gs) - 0.3, floorM: Math.max(...gs) };
    });
  }
  return blockCache;
}

// ---------------------------------------------------------------- trees, maquis, boulders

export type TreeKind = 'pine' | 'oak' | 'olive';
export type TreeGroup = 'grove' | 'woodland' | 'orchard' | 'lone';
export type Tree = {
  readonly group: TreeGroup;
  readonly kind: TreeKind;
  readonly E: number;
  readonly N: number;
  readonly baseM: number;
  readonly heightM: number;
  readonly crownR: number;
  readonly spin: number;
  readonly tone: number;
};

/** A tree's crown as drawn: an ellipsoid from a short trunk up to the tree's height. */
export function crownShape(t: Tree): { E: number; N: number; centerM: number; radiusM: number; halfHeightM: number } {
  const bottom = t.kind === 'pine' ? t.heightM * 0.42 : t.kind === 'olive' ? 1.1 : 1.6 + t.tone * 0.6;
  const halfHeightM = (t.heightM - bottom) / 2;
  return { E: t.E, N: t.N, centerM: t.baseM + bottom + halfHeightM, radiusM: t.crownR, halfHeightM };
}

const groveRing = ringPoints(GROVE);
const orchardRing = ringPoints(ORCHARD.ring);
const woodlandRings = WOODLAND.map((w) => ringPoints(w.ring));
/** The cover that fades out beyond the sheet: the model shows the land around it, the map stops at its edge. */
const COVER_MARGIN_M = 260;
const inCoverArea = (p: Point) => p.E > WORLD.minE - COVER_MARGIN_M && p.E < WORLD.maxE + COVER_MARGIN_M && p.N > WORLD.minN - COVER_MARGIN_M && p.N < WORLD.maxN + COVER_MARGIN_M;
const clearOfLines = (p: Point, extra = 0) => !nearLine(p, ROAD_WIDTH_M / 2 + 3 + extra, ['road']) && !nearLine(p, 8 + extra, ['stream']) && !nearLine(p, 4 + extra, ['ravine']);
const nearBuilding = (p: Point, r: number) => Math.hypot(p.E - BUILDING.E, p.N - BUILDING.N) < r || Math.hypot(p.E - WATER_TANK.E, p.N - WATER_TANK.N) < r * 0.7;
/**
 * Where the maquis closes into thickets: a patch noise thresholded softly, so
 * slopes read as dark clumps of evergreen scrub and trees between open, drier
 * ground — the Mediterranean hillside — rather than an even speckle.
 */
function maquisPatch(p: Point): number {
  const n = 0.5 + 0.5 * (0.7 * valueNoise(p.E / 70 + 1.7, p.N / 70 - 3.3) + 0.3 * valueNoise(p.E / 24 - 5.2, p.N / 24 + 0.8));
  const broad = 0.5 + 0.5 * valueNoise(p.E / 260 - 2.9, p.N / 260 + 0.6);
  return smoothstep(0.5, 0.68, n * 0.8 + broad * 0.3);
}

/** The tops stay open: bare limestone and low scrub, so the summits read as summits. */
const nearTop = (p: Point, r: number) => summits().some((s) => Math.hypot(p.E - s.E, p.N - s.N) < r);

let treeCache: Tree[] | null = null;
/** Every tree — the same list feeds the 3D instances and the map's tree symbols (grove, woodland, orchard). */
export function trees(): readonly Tree[] {
  if (!treeCache) {
    const out: Tree[] = [];
    {
      const rand = rng(0x6a09e667);
      for (const p of poissonInRing(groveRing, 7.4, 2, rand)) {
        if (!clearOfLines(p)) continue;
        // a small clearing on the rocks at B
        if (Math.hypot(p.E - ROCKS.E, p.N - ROCKS.N) < ROCKS.rM * 0.55) continue;
        out.push({ group: 'grove', kind: 'pine', E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 11 + rand() * 4.5, crownR: 3 + rand() * 1.2, spin: rand() * Math.PI * 2, tone: rand() });
      }
    }
    WOODLAND.forEach((w, k) => {
      const rand = rng(0x9e3779b9 ^ (k * 0x85ebca6b));
      for (const p of poissonInRing(woodlandRings[k], 10, 3, rand)) {
        const patch = 0.5 + 0.5 * valueNoise(p.E / 55 + k * 3.1, p.N / 55 - k);
        if (rand() > 0.3 + patch * 0.6 || !clearOfLines(p) || nearTop(p, 70)) continue;
        out.push({ group: 'woodland', kind: 'oak', E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 6 + rand() * 3.5, crownR: 3.4 + rand() * 2, spin: rand() * Math.PI * 2, tone: rand() });
      }
    });
    {
      const rand = rng(0x510e527f);
      const a = ORCHARD.rowDeg * DEG;
      const ux = Math.sin(a);
      const uy = Math.cos(a);
      const xs = orchardRing.map((p) => p.E);
      const ys = orchardRing.map((p) => p.N);
      const c = { E: (Math.min(...xs) + Math.max(...xs)) / 2, N: (Math.min(...ys) + Math.max(...ys)) / 2 };
      const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      for (let r = -R; r <= R; r += ORCHARD.spacingM) {
        for (let s = -R; s <= R; s += ORCHARD.spacingM) {
          const p = { E: c.E + ux * s + uy * r, N: c.N + uy * s - ux * r };
          if (!pointInPolygon(p, orchardRing) || distanceToPolyline(p, orchardRing, true) < 3 || !clearOfLines(p)) continue;
          if (rand() < 0.06) continue;
          out.push({ group: 'orchard', kind: 'olive', E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 4 + rand() * 1.4, crownR: 2.3 + rand() * 0.7, spin: rand() * Math.PI * 2, tone: rand() });
        }
      }
    }
    {
      // Lone oaks and carobs on the open slopes and along the stream, out past the sheet's edge.
      const rand = rng(0x1f83d9ab);
      const STEP = 26;
      for (let N = WORLD.minN - COVER_MARGIN_M; N < WORLD.maxN + COVER_MARGIN_M; N += STEP) {
        for (let E = WORLD.minE - COVER_MARGIN_M; E < WORLD.maxE + COVER_MARGIN_M; E += STEP) {
          const p = { E: E + (rand() - 0.5) * STEP * 0.9, N: N + (rand() - 0.5) * STEP * 0.9 };
          const keep = rand();
          const size = rand();
          const tone = rand();
          const spin = rand() * Math.PI * 2;
          const nearStream = nearLine(p, 22, ['stream']);
          if (keep > (nearStream ? 0.7 : 0.04 + maquisPatch(p) * 0.55)) continue;
          if (!inCoverArea(p) || !clearOfLines(p, 2) || nearTop(p, 85) || nearBuilding(p, 30)) continue;
          if (pointInPolygon(p, groveRing) || pointInPolygon(p, orchardRing) || woodlandRings.some((r) => pointInPolygon(p, r))) continue;
          const h = heightAt(p.E, p.N);
          out.push({ group: 'lone', kind: 'oak', E: p.E, N: p.N, baseM: h, heightM: 6.5 + size * 3.5, crownR: 3.4 + size * 2.2, spin, tone });
        }
      }
    }
    treeCache = out;
  }
  return treeCache;
}

export type Shrub = { readonly E: number; readonly N: number; readonly baseM: number; readonly heightM: number; readonly radiusM: number; readonly tone: number; readonly spin: number };

/** How far p lies inside the cover area, 0 at its rim → 1 from 140 m in: the maquis thins out there instead of stopping on a line. */
function coverFade(p: Point): number {
  const inside = Math.min(p.E - (WORLD.minE - COVER_MARGIN_M), WORLD.maxE + COVER_MARGIN_M - p.E, p.N - (WORLD.minN - COVER_MARGIN_M), WORLD.maxN + COVER_MARGIN_M - p.N);
  return smoothstep(0, 140, inside);
}

/**
 * The maquis cover at p, 0…1 — the chance that a shrub stands on a 7.5 m cell
 * there. shrubs() draws from it and the model's ground darkens under it, so
 * the scrub on the ground and the shrubs on it are one pattern.
 */
export function scrubCover(p: Point): number {
  if (pointInPolygon(p, groveRing) || pointInPolygon(p, orchardRing)) return 0;
  const top = nearTop(p, 45) ? 0.4 : 1;
  return Math.min(1, (0.05 + 0.85 * maquisPatch(p) + Math.min(slopeAt(p.E, p.N), 0.4) * 0.3) * top) * coverFade(p);
}

let shrubCache: Shrub[] | null = null;
/**
 * Maquis — low evergreen scrub (≤ 2 m), patchy and denser on the slopes, as on
 * Mediterranean hills. Below the map's mapping threshold, so it has no map symbol.
 */
export function shrubs(): readonly Shrub[] {
  if (!shrubCache) {
    const rand = rng(0x6c8e9cf5);
    const out: Shrub[] = [];
    const STEP = 7.5;
    for (let N = WORLD.minN - COVER_MARGIN_M; N < WORLD.maxN + COVER_MARGIN_M; N += STEP) {
      for (let E = WORLD.minE - COVER_MARGIN_M; E < WORLD.maxE + COVER_MARGIN_M; E += STEP) {
        const p = { E: E + (rand() - 0.5) * STEP * 0.95, N: N + (rand() - 0.5) * STEP * 0.95 };
        const keep = rand();
        const size = rand();
        const tone = rand();
        const spin = rand() * Math.PI * 2;
        if (!inCoverArea(p) || keep > scrubCover(p)) continue;
        if (!clearOfLines(p, 1) || nearBuilding(p, 24)) continue;
        out.push({ E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 0.9 + size * 1.6, radiusM: 1.4 + size * 2.4, tone, spin });
      }
    }
    shrubCache = out;
  }
  return shrubCache;
}

export type Boulder = { readonly E: number; readonly N: number; readonly baseM: number; readonly sizeM: number; readonly spin: number; readonly tone: number; /** The outcrop at B — drawn on the map as the rocks sign. */ readonly atB: boolean };

let boulderCache: Boulder[] | null = null;
/** Limestone boulders where the slope is steep or the rock breaks through, and the outcrop at B. */
export function boulders(): readonly Boulder[] {
  if (!boulderCache) {
    const rand = rng(0x1b2c3d4e);
    const out: Boulder[] = [];
    const STEP = 10;
    for (let N = WORLD.minN - COVER_MARGIN_M; N < WORLD.maxN + COVER_MARGIN_M; N += STEP) {
      for (let E = WORLD.minE - COVER_MARGIN_M; E < WORLD.maxE + COVER_MARGIN_M; E += STEP) {
        const p = { E: E + (rand() - 0.5) * STEP, N: N + (rand() - 0.5) * STEP };
        const keep = rand();
        const size = rand();
        const spin = rand() * Math.PI * 2;
        const tone = rand();
        const outcrop = 0.5 + 0.5 * valueNoise(p.E / 30 - 4.1, p.N / 30 + 2.6);
        const slope = slopeAt(p.E, p.N);
        const top = nearTop(p, 60) ? 0.06 : 0;
        if (keep > Math.max(0, outcrop - 0.55) * 1.1 + Math.max(0, slope - 0.18) * 1.3 + top) continue;
        if (!inCoverArea(p) || !clearOfLines(p, 1) || nearBuilding(p, 26)) continue;
        if (pointInPolygon(p, orchardRing)) continue;
        out.push({ E: p.E, N: p.N, baseM: heightAt(p.E, p.N), sizeM: 0.5 + size * size * 1.4, spin, tone, atB: false });
      }
    }
    // The rocks at B: a cluster of large limestone blocks among the pines.
    const r2 = rng(0x2545f491);
    for (let k = 0; k < 26; k++) {
      const a = r2() * Math.PI * 2;
      const d = Math.sqrt(r2()) * ROCKS.rM;
      const p = { E: ROCKS.E + Math.cos(a) * d, N: ROCKS.N + Math.sin(a) * d };
      out.push({ E: p.E, N: p.N, baseM: heightAt(p.E, p.N), sizeM: 1.4 + r2() * 2.4 * (1 - d / ROCKS.rM) + 0.6, spin: r2() * Math.PI * 2, tone: r2(), atB: true });
    }
    boulderCache = out;
  }
  return boulderCache;
}

// ---------------------------------------------------------------- map label placement

export type ContourLabel = { readonly heightM: number; readonly E: number; readonly N: number; /** Screen rotation on the north-up map, degrees (SVG, y down). */ readonly angleDeg: number };

let labelCache: ContourLabel[] | null = null;
/** Index-contour heights on straight-ish stretches, clear of A, B, the summits, the saddle, roads, water and the sheet edge. */
export function contourLabels(): readonly ContourLabel[] {
  if (!labelCache) {
    const sd = saddle();
    const avoid: Point[] = [START, DEST, { E: sd.E, N: sd.N }, ...summits().map((s) => ({ E: s.E, N: s.N }))];
    const out: ContourLabel[] = [];
    for (const lv of contours().filter((c) => c.index)) {
      const picks: (ContourLabel & { score: number })[] = [];
      for (const line of lv.lines) {
        const P = line.pts;
        if (P.length < 24) continue;
        for (let k = 6; k < P.length - 6; k += 3) {
          const [E, N] = P[k];
          const edge = Math.min(E - WORLD.minE, WORLD.maxE - E, N - WORLD.minN, WORLD.maxN - N);
          if (edge < 70) continue;
          const p = { E, N };
          if (nearLine(p, 26)) continue;
          const clear = Math.min(...avoid.map((a) => Math.hypot(a.E - p.E, a.N - p.N)));
          if (clear < 80) continue;
          const [Ea, Na] = P[k - 5];
          const [Eb, Nb] = P[k + 5];
          let len = 0;
          for (let q = k - 5; q < k + 5; q++) len += Math.hypot(P[q + 1][0] - P[q][0], P[q + 1][1] - P[q][1]);
          if (Math.hypot(Eb - Ea, Nb - Na) / len < 0.93) continue;
          picks.push({ heightM: lv.heightM, E, N, angleDeg: (Math.atan2(-(Nb - Na), Eb - Ea) * 180) / Math.PI, score: clear + edge * 0.3 });
        }
      }
      picks.sort((a, b) => b.score - a.score);
      const chosen: ContourLabel[] = [];
      for (const p of picks) {
        if (chosen.length === 2) break;
        if (chosen.some((c) => Math.hypot(c.E - p.E, c.N - p.N) < 360)) continue;
        if (out.some((c) => Math.hypot(c.E - p.E, c.N - p.N) < 110)) continue;
        chosen.push({ heightM: p.heightM, E: p.E, N: p.N, angleDeg: p.angleDeg });
      }
      out.push(...chosen);
    }
    labelCache = out;
  }
  return labelCache;
}

export { INDEX_INTERVAL_M, CONTOUR_INTERVAL_M };
