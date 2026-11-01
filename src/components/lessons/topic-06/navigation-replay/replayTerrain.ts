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
import { heightAt as labHeight, roadOf, waterCourses } from '../planning-lab/planningLabTerrain';
import { PolyIndex, polyline, type Polyline } from './replayWorld';
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

// Shared planning-lab geography: x east, z south; E=x+500, N=600-z.
const worldLine = (pts: readonly (readonly number[])[]) => polyline(pts.map(([E,N])=>({x:E-500,z:600-N})));
export const STREAM_LINE: Polyline = worldLine(waterCourses().stream.pts);
export const ROAD_LINE: Polyline = worldLine(roadOf('road').pts);
const RAVINE_LINE = worldLine(waterCourses().ravine.pts);
const STREAM_IDX = new PolyIndex(STREAM_LINE,420);
const ROAD_IDX = new PolyIndex(ROAD_LINE,420);
const RAVINE_IDX = new PolyIndex(RAVINE_LINE,420);
export function heightAt(x: number,z: number): number { return labHeight(x+500,600-z); }

/** Fine ground texture, ≤ ±0.6 m: the 3D surface only. */
export function microRelief(x: number, z: number): number {
  return 0.34 * noise2(x / 11 + 0.7, z / 11 - 3.3) + 0.16 * noise2(x / 4.3 - 5.1, z / 4.3 + 2.4) + 0.07 * noise2(x / 1.7 + 9.2, z / 1.7 - 6.6);
}

export const groundAt = (x: number, z: number) => heightAt(x, z) + microRelief(x, z);

/** Distances (m) to the road and to the stream's centre line, capped at 420. */
export function surfaceAt(x: number, z: number) {
  return { roadD: ROAD_IDX.query({ x, z }).d, streamD: Math.min(STREAM_IDX.query({ x, z }).d, RAVINE_IDX.query({ x, z }).d) };
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
        const surface = surfaceAt(x,z);
        g.road[i] = surface.roadD;
        g.stream[i] = surface.streamD;
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
