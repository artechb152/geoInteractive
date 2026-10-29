/**
 * The ground of the navigation replay — one height field for the 3D view, the
 * map's contour lines, the camera's eye height and the fairness tests.
 *
 *   heightAt(x, z)    the terrain (m above sea level): the designed features of
 *                     the planning map plus natural variation. The map's
 *                     contours are traced from it (replayContours.ts).
 *   microRelief(x, z) ≤ ±0.6 m of ground texture the 3D view adds on top —
 *                     below any contour interval, never moves a landmark.
 *   groundAt(x, z)    heightAt + microRelief: the surface the camera stands on
 *                     and every rock, shrub and grass tuft is planted in.
 *
 * Features, all placed from navTipsGeometry (the planning map's geography):
 *   - the stream valley: a dry stream bed bending at checkpoint 1, draining
 *     south-west;
 *   - the ridge across the route: two summits (~424 m north-east, ~406 m
 *     south-west) and the saddle between them at checkpoint 2 (~381 m);
 *   - the dirt-road valley: a broad shallow valley along the road, crossed at
 *     checkpoint 3 (~350 m);
 *   - a low spur running north-north-west from the saddle's north-west foot,
 *     east of the planned leg 3 — it hides the road from the swale beside it;
 *   - a rocky knoll with pines at the destination; rolling hills beyond the
 *     sheet and ridges to the horizon.
 *
 * Everything is deterministic (seeded gradient noise): the same point always
 * has the same height, on every device and quality setting.
 */
import { P2, P3, POINTS as ROUTE_POINTS, RIDGE_AXIS, ROAD, STREAM, SUMMIT_N, SUMMIT_S, END, START, type Pt } from '../navTipsGeometry';
import { PolyIndex, extendEnds, nearestOn, polyline, samplePath, toWorld, type Polyline, type W2 } from './replayWorld';

// ───────────────────────────────────────────────────────────── noise

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERM = new Uint8Array(512);
const GX = new Float32Array(256);
const GZ = new Float32Array(256);
{
  const rnd = mulberry32(9900);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  for (let i = 0; i < 256; i++) {
    const a = rnd() * Math.PI * 2;
    GX[i] = Math.cos(a);
    GZ[i] = Math.sin(a);
  }
}

/** 2D gradient noise, about −1…1. */
export function noise2(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const X = xi & 255;
  const Z = zi & 255;
  const g = (ix: number, iz: number, dx: number, dz: number) => {
    const h = PERM[PERM[ix] + iz];
    return GX[h] * dx + GZ[h] * dz;
  };
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = zf * zf * zf * (zf * (zf * 6 - 15) + 10);
  const n00 = g(X, Z, xf, zf);
  const n10 = g(X + 1, Z, xf - 1, zf);
  const n01 = g(X, Z + 1, xf, zf - 1);
  const n11 = g(X + 1, Z + 1, xf - 1, zf - 1);
  const a = n00 + u * (n10 - n00);
  const b = n01 + u * (n11 - n01);
  return (a + v * (b - a)) * 1.6;
}

export function fbm(x: number, z: number, octaves: number, lac = 2.03, gain = 0.5): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise2(x + o * 17.3, z - o * 31.7);
    norm += amp;
    amp *= gain;
    x *= lac;
    z *= lac;
  }
  return sum / norm;
}

/** Ridged multifractal, 0…1 (sharp crests, rounded troughs). */
export function ridged(x: number, z: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let w = 1;
  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(noise2(x + o * 5.1, z + o * 9.7));
    n *= n * w;
    w = Math.min(1, Math.max(0, n * 2));
    sum += n * amp;
    amp *= 0.5;
    x *= 2.1;
    z *= 2.1;
  }
  return sum;
}

const smoothstep = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
/** Smooth maximum (polynomial), blending over `k` metres. */
const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + (h * h * k) / 4;
};

// ───────────────────────────────────────────────────────────── features

const W = (p: Pt) => toWorld(p);
const AX: W2 = { x: RIDGE_AXIS.x, z: RIDGE_AXIS.y };
const SADDLE = W(P2);
const SN = W(SUMMIT_N);
const SS = W(SUMMIT_S);

/** Stream and road as world polylines, continued 6 km past the sheet's edge. */
export const STREAM_LINE: Polyline = polyline(extendEnds(samplePath(STREAM).map(W), 6000));
export const ROAD_LINE: Polyline = polyline(extendEnds(samplePath(ROAD).map(W), 6000));
const STREAM_IDX = new PolyIndex(STREAM_LINE, 420);
const ROAD_IDX = new PolyIndex(ROAD_LINE, 420);

/** A floor profile along a polyline: heights at map points, linear in arc length, extrapolated past the ends. */
function floorProfile(line: Polyline, stops: [Pt, number][], slopeHead: number, slopeTail: number) {
  const s = stops.map(([p, h]) => [nearestOn(line, W(p)).s, h] as const).sort((a, b) => a[0] - b[0]);
  return (at: number) => {
    if (at <= s[0][0]) return s[0][1] + (s[0][0] - at) * slopeHead;
    const last = s[s.length - 1];
    if (at >= last[0]) return last[1] - (at - last[0]) * slopeTail;
    for (let i = 1; i < s.length; i++)
      if (at <= s[i][0]) {
        const t = (at - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
        return s[i - 1][1] + t * (s[i][1] - s[i - 1][1]);
      }
    return last[1];
  };
}

/** Dry stream bed: 360 m where it enters the sheet in the north, ~331 m at the bend (checkpoint 1), 302 m in the west. */
const STREAM_FLOOR = floorProfile(
  STREAM_LINE,
  [
    [{ x: 74, y: -2 }, 361],
    [{ x: 71, y: 30 }, 347],
    [{ x: 66.4, y: 60.4 }, 331],
    [{ x: 36, y: 70.5 }, 316],
    [{ x: -2, y: 74 }, 302],
  ],
  0.008,
  0.005,
);
/** The road's valley floor: 366 m in the north, ~350 m at the crossing (checkpoint 3), 318 m by the stream. */
const ROAD_FLOOR = floorProfile(
  ROAD_LINE,
  [
    [{ x: 37, y: -2 }, 365],
    [P3, 350],
    [{ x: 24, y: 62 }, 327],
    [{ x: 17, y: 77 }, 318],
  ],
  0.006,
  0.004,
);

/** The low spur north-west of the saddle: crest points (map) and crest heights (m). */
const SPUR: { p: W2; h: number }[] = [
  { p: W({ x: 44.6, y: 45.8 }), h: 377 },
  { p: W({ x: 40.6, y: 37.0 }), h: 371 },
  { p: W({ x: 37.1, y: 28.0 }), h: 368 },
  { p: W({ x: 35.6, y: 19.0 }), h: 364 },
  { p: W({ x: 35.4, y: 10.0 }), h: 362 },
  { p: W({ x: 35.6, y: 2.0 }), h: 361 },
];
/**
 * The gully beside it, on its eastern side: it leaves the saddle's northern
 * slope and runs north-north-west until it opens into the road's valley.
 * Floor heights (m) at its points.
 */
const GULLY: { p: W2; h: number }[] = [
  { p: W({ x: 46.3, y: 47.4 }), h: 377 },
  { p: W({ x: 43.6, y: 40.5 }), h: 370 },
  { p: W({ x: 41.0, y: 33.0 }), h: 364 },
  { p: W({ x: 39.0, y: 25.0 }), h: 359 },
  { p: W({ x: 38.4, y: 15.0 }), h: 357 },
  { p: W({ x: 38.6, y: 4.0 }), h: 356 },
  { p: W({ x: 37.4, y: -8.0 }), h: 356 },
];
const GULLY_LINE = polyline(GULLY.map((g) => g.p));
const SPUR_LINE = polyline(SPUR.map((s) => s.p));
const SPUR_CUM = SPUR_LINE.cum;

const KNOLL = W(END);
const TERRACE = W(START);

/** Base level the designed hills rise from. */
const BASE = 352;

/** A natural hill profile: convex top, long concave feet. r = distance / radius. */
const hillProfile = (r: number) => 1 / (1 + Math.pow(r / 0.55, 3));

function designed(x: number, z: number, base: number): number {
  // ridge frame: u along the axis (+ towards the north-east summit), v across
  const dx = x - SADDLE.x;
  const dz = z - SADDLE.z;
  const u = dx * AX.x + dz * AX.z;
  const v = -dx * AX.z + dz * AX.x;
  // a little domain warp so the hills are not circles
  const wx = x + 38 * noise2(x / 260 + 3.1, z / 260 - 1.7);
  const wz = z + 38 * noise2(x / 260 - 7.4, z / 260 + 2.2);
  const rN = Math.hypot((wx - SN.x) / 1.05, wz - SN.z) / 295;
  const rS = Math.hypot(wx - SS.x, (wz - SS.z) / 1.08) / 320;
  const hillN = base + (428 - BASE) * hillProfile(rN);
  const hillS = base + (409 - BASE) * hillProfile(rS);
  // the col: lowest along the axis exactly at the saddle, falling away across it
  const cross = 1 / (1 + Math.pow(Math.abs(v) / 130, 2.4));
  const along = Math.max(0, 1 - Math.abs(u) / 300);
  const col = base + (383 - BASE + 0.00045 * u * u) * cross * along;
  let h = smax(smax(hillN, hillS, 6), col, 5);
  // destination knoll (rocky, pines)
  const rK = Math.hypot(wx - KNOLL.x, wz - KNOLL.z) / 230;
  h = smax(h, base + (373 - BASE) * hillProfile(rK), 6);
  // a low terrace by the start building
  const rT = Math.hypot(x - TERRACE.x, z - TERRACE.z) / 260;
  h = smax(h, base - 3 + 2 * hillProfile(rT), 4);
  return h;
}

function spur(x: number, z: number): number {
  const r = nearestOn(SPUR_LINE, { x, z });
  if (r.d > 140) return -Infinity;
  // crest height at the nearest point, linear between the crest points
  let i = 1;
  while (i < SPUR_CUM.length - 1 && SPUR_CUM[i] < r.s) i++;
  const t = Math.min(1, Math.max(0, (r.s - SPUR_CUM[i - 1]) / (SPUR_CUM[i] - SPUR_CUM[i - 1])));
  const crest = SPUR[i - 1].h + t * (SPUR[i].h - SPUR[i - 1].h);
  // rounded cross-section, ~10 m high over ~60 m, fading out well before the road
  const d = r.d / 55;
  return crest - (10 * d * d) / (1 + 0.5 * d * d) - 30 * smoothstep(70, 140, r.d) - 4 * smoothstep(0.85, 1, r.s / SPUR_LINE.length);
}

function gullyFloor(x: number, z: number): { d: number; floor: number } {
  const r = nearestOn(GULLY_LINE, { x, z });
  let i = 1;
  while (i < GULLY_LINE.cum.length - 1 && GULLY_LINE.cum[i] < r.s) i++;
  const t = Math.min(1, Math.max(0, (r.s - GULLY_LINE.cum[i - 1]) / (GULLY_LINE.cum[i] - GULLY_LINE.cum[i - 1])));
  return { d: r.d, floor: GULLY[i - 1].h + t * (GULLY[i].h - GULLY[i - 1].h) };
}

const CORE_R = 1400; // the sheet's half-diagonal ≈ 1.56 km

/** The planned route (נ.ה → נ.ס), for keeping the random relief calm where the evidence must read. */
const ROUTE_IDX = new PolyIndex(polyline(ROUTE_POINTS.map(W)), 420);

/**
 * The terrain height (m above sea level). Deterministic and continuous; the
 * map's contours and every view are taken from it.
 */
export function heightAt(x: number, z: number): number {
  const rC = Math.hypot(x, z);
  // How free the random relief may be: calm along the route and at the saddle, free elsewhere.
  const route = ROUTE_IDX.query({ x, z }).d;
  const free = 0.3 + 0.7 * smoothstep(50, 330, route);

  // regional surface: gentle undulation, slightly higher to the north
  let base = BASE + 10 * fbm(x / 1700 + 11.3, z / 1700 - 4.2, 3) - 0.004 * z;
  // rolling hills: everywhere, stronger away from the route and beyond the sheet
  const mid = smoothstep(CORE_R * 0.45, CORE_R * 1.5, rC);
  base += (14 * free + 34 * mid) * (fbm(x / 640 - 2.7, z / 640 + 8.1, 4) + 0.35 * mid);
  // broader hills that lift the skyline a kilometre out
  base += mid * 115 * Math.max(0, fbm(x / 1500 + 6.2, z / 1500 - 3.4, 3) + 0.3);
  // side gullies: valley lines where a noise field crosses zero, so they branch and wander
  const g = Math.abs(fbm(x / 520 + 4.4, z / 520 - 2.9, 3));
  base -= (6 + 4 * mid) * free * (1 - smoothstep(0, 0.22, g));
  // ridges to the horizon
  const far = smoothstep(2600, 7000, rC);
  base += far * (50 + 120 * ridged(x / 2900 + 1.3, z / 2900 - 0.6, 4) + 40 * fbm(x / 1300, z / 1300, 3));

  let h = designed(x, z, base);
  // medium relief: undulation and rocky lumps (damped where the designed shapes must read cleanly)
  h += (0.45 + 0.55 * free) * (3.2 * fbm(x / 230 + 5.5, z / 230 - 9.1, 4) + 2.4 * (ridged(x / 140 - 3.3, z / 140 + 1.9, 3) - 0.35));

  // valleys: the floor replaces the slope near the line, banks wander and blend back out
  const st = STREAM_IDX.query({ x, z });
  if (st.d < 420) {
    const floor = STREAM_FLOOR(st.s) + 0.6 * fbm(x / 90, z / 90, 2);
    const d = st.d + 22 * fbm(x / 210 + 1.1, z / 210 + 6.6, 2);
    const w = 1 - smoothstep(14, 175 + 45 * noise2(st.s / 380, 0.5), d);
    h = Math.min(h, h + (floor - h) * w * (0.6 + 0.4 * w));
    // the dry channel itself
    if (st.d < 8) h -= 1.7 * (1 - smoothstep(2.6, 6.8, st.d + 0.8 * noise2(x / 14, z / 14)));
  }
  const rd = ROAD_IDX.query({ x, z });
  if (rd.d < 420) {
    const floor = ROAD_FLOOR(rd.s) + 0.5 * fbm(x / 120 - 4, z / 120 + 2, 2);
    const d = rd.d + 30 * fbm(x / 260 - 3.1, z / 260 + 0.4, 2);
    const w = 1 - smoothstep(26, 270 + 50 * noise2(rd.s / 420, 2.5), d);
    h = Math.min(h, h + (floor - h) * w * w * (3 - 2 * w));
    // the road bed: graded flat across its 4 m
    if (rd.d < 6) h += (floor - h) * 0.7 * (1 - smoothstep(2.2, 6, rd.d));
  }
  // the gully east of the spur: a shallow, wandering V that opens into the road's valley
  const gl = gullyFloor(x, z);
  if (gl.d < 150) {
    const d = gl.d + 10 * noise2(x / 90 + 2.2, z / 90 - 1.3);
    const w = 1 - smoothstep(6, 120, d);
    h = Math.min(h, h + (gl.floor + 0.4 * noise2(x / 30, z / 30) - h) * w * (0.55 + 0.45 * w));
  }
  // the spur rises out of the road valley's eastern slope
  h = smax(h, spur(x, z), 7);
  return h;
}

/** Fine ground texture, ≤ ±0.6 m: the 3D surface only. */
export function microRelief(x: number, z: number): number {
  return 0.34 * noise2(x / 11 + 0.7, z / 11 - 3.3) + 0.16 * noise2(x / 4.3 - 5.1, z / 4.3 + 2.4) + 0.07 * noise2(x / 1.7 + 9.2, z / 1.7 - 6.6);
}

export const groundAt = (x: number, z: number) => heightAt(x, z) + microRelief(x, z);

/** Distances (m) to the road and to the stream's centre line, capped at 420. */
export function surfaceAt(x: number, z: number) {
  return { roadD: ROAD_IDX.query({ x, z }).d, streamD: STREAM_IDX.query({ x, z }).d };
}


// ───────────────────────────────────────────────────────────── grids

/**
 * Heights and surface distances sampled on a regular grid, for fast bilinear
 * lookup when meshing and scattering (the analytic field is ~µs per point).
 */
export class TerrainGrid {
  readonly h: Float32Array;
  readonly road: Float32Array;
  readonly stream: Float32Array;
  readonly x0: number;
  readonly z0: number;
  readonly step: number;
  readonly nx: number;
  readonly nz: number;
  constructor(x0: number, z0: number, step: number, nx: number, nz: number) {
    this.x0 = x0;
    this.z0 = z0;
    this.step = step;
    this.nx = nx;
    this.nz = nz;
    this.h = new Float32Array(nx * nz);
    this.road = new Float32Array(nx * nz);
    this.stream = new Float32Array(nx * nz);
  }
  contains(x: number, z: number, margin = 0) {
    return x >= this.x0 + margin && z >= this.z0 + margin && x <= this.x0 + (this.nx - 1) * this.step - margin && z <= this.z0 + (this.nz - 1) * this.step - margin;
  }
  /** Distance from (x, z) to the grid's edge, m (negative outside). */
  inset(x: number, z: number) {
    return Math.min(x - this.x0, z - this.z0, this.x0 + (this.nx - 1) * this.step - x, this.z0 + (this.nz - 1) * this.step - z);
  }
  sample(arr: Float32Array, x: number, z: number) {
    const fxp = Math.min(this.nx - 1.0001, Math.max(0, (x - this.x0) / this.step));
    const fzp = Math.min(this.nz - 1.0001, Math.max(0, (z - this.z0) / this.step));
    const ix = Math.floor(fxp);
    const iz = Math.floor(fzp);
    const tx = fxp - ix;
    const tz = fzp - iz;
    const i = iz * this.nx + ix;
    const a = arr[i] + (arr[i + 1] - arr[i]) * tx;
    const b = arr[i + this.nx] + (arr[i + this.nx + 1] - arr[i + this.nx]) * tx;
    return a + (b - a) * tz;
  }
}

/** Fills a grid, yielding to the browser every ~12 ms so the page stays responsive. */
export async function buildGrid(cx: number, cz: number, half: number, step: number, withSurface: boolean, signal?: AbortSignal): Promise<TerrainGrid> {
  const n = Math.round((half * 2) / step) + 1;
  const g = new TerrainGrid(cx - half, cz - half, step, n, n);
  let t0 = now();
  for (let iz = 0; iz < n; iz++) {
    const z = g.z0 + iz * step;
    for (let ix = 0; ix < n; ix++) {
      const x = g.x0 + ix * step;
      const i = iz * n + ix;
      g.h[i] = heightAt(x, z);
      if (withSurface) {
        g.road[i] = ROAD_IDX.query({ x, z }).d;
        g.stream[i] = STREAM_IDX.query({ x, z }).d;
      } else {
        g.road[i] = 420;
        g.stream[i] = 420;
      }
    }
    if (now() - t0 > 12) {
      await new Promise((r) => setTimeout(r, 0));
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      t0 = now();
    }
  }
  return g;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Nested grids around one station: fine near the eye, coarser out to the
 * horizon. `sample` blends across each grid's edge, then adds the micro relief.
 */
export class StationTerrain {
  readonly grids: TerrainGrid[];
  /** Finest first. */
  constructor(grids: TerrainGrid[]) {
    this.grids = grids;
  }
  private pick(x: number, z: number, arr: 'h' | 'road' | 'stream') {
    let value = NaN;
    for (let k = this.grids.length - 1; k >= 0; k--) {
      const g = this.grids[k];
      const inset = g.inset(x, z);
      if (inset < 0) continue;
      const v = g.sample(g[arr], x, z);
      if (Number.isNaN(value)) value = v;
      else {
        const blend = Math.min(1, inset / (g.step * 6));
        value = value + (v - value) * blend;
      }
    }
    return value;
  }
  height(x: number, z: number) {
    const h = this.pick(x, z, 'h');
    return (Number.isNaN(h) ? heightAt(x, z) : h) + microRelief(x, z);
  }
  road(x: number, z: number) {
    const v = this.pick(x, z, 'road');
    return Number.isNaN(v) ? 420 : v;
  }
  stream(x: number, z: number) {
    const v = this.pick(x, z, 'stream');
    return Number.isNaN(v) ? 420 : v;
  }
}
