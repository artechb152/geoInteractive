/**
 * Where the replay's shrubs, grass tufts, stones and rocks grow — one
 * deterministic layout for the whole ground.
 *
 * Every candidate is anchored to a world cell and drawn from a hash of the
 * cell, so a shrub stands in the same spot whichever station looks at it;
 * only how far out each kind is drawn depends on the eye (level of detail).
 * Nothing grows on the road bed or in the stream's channel, and nothing
 * stands within a few metres of the eye, so the view is never blocked.
 */
import { fbm, noise2 } from './replayTerrain';
import type { W2 } from './replayWorld';
import { finish, runBatched } from './replayBatch';

export type Instance = {
  x: number;
  z: number;
  /** ground height under it, m */
  y: number;
  scale: number;
  /** rotation about the vertical, radians */
  rot: number;
  /** a lean (radians) for rocks and shrubs on slopes */
  tilt: number;
  variant: number;
  /** 0…1 colour variation */
  tint: number;
  /** distance from the eye, m */
  dist: number;
};

export type Ground = {
  height: (x: number, z: number) => number;
  road: (x: number, z: number) => number;
  stream: (x: number, z: number) => number;
};

/** Integer hash → 0…1 (deterministic, per cell and salt). */
export function hash01(ix: number, iz: number, salt: number) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(salt, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smoothstep = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** Maquis density 0…1: clumped, thicker along the stream banks, none on the road or the bed. */
export function shrubDensity(x: number, z: number, road: number, stream: number) {
  if (road < 4.5 || stream < 8) return 0;
  const clumps = smoothstep(-0.18, 0.22, fbm(x / 65 + 3.3, z / 65 - 8.1, 3));
  const patches = smoothstep(-0.2, 0.22, fbm(x / 250 - 1.9, z / 250 + 4.7, 2));
  const banks = 0.7 * (1 - smoothstep(9, 36, stream));
  return Math.min(1, patches * (0.025 + 0.95 * clumps) + banks) * smoothstep(4.5, 9, road);
}

/** Exposed limestone 0…1 (the same field brightens the terrain's rock layer in the shader). */
export function rockiness(x: number, z: number) {
  return smoothstep(0.05, 0.5, fbm(x / 26 - 4.1, z / 26 + 7.7, 3) + 0.35 * noise2(x / 120 + 2, z / 120 - 5));
}

type Kind = {
  cell: number;
  salt: number;
  near: number;
  far: number;
  /** probability of a candidate in its cell */
  chance: (x: number, z: number, road: number, stream: number) => number;
  scale: (r: number) => number;
  variants: number;
};

const KINDS = {
  shrub: {
    cell: 3.8,
    salt: 11,
    near: 5,
    far: 1500,
    chance: (x: number, z: number, road: number, stream: number) => shrubDensity(x, z, road, stream),
    scale: (r: number) => 0.28 + 2.15 * r * r,
    variants: 4,
  },
  /** low grey-green cushions (thorny burnet, sage) between the shrubs */
  cushion: {
    cell: 1.5,
    salt: 61,
    near: 1.6,
    far: 70,
    chance: (x: number, z: number, road: number, stream: number) => (road < 3 || stream < 6.5 ? 0 : 0.2 + 0.22 * (1 - rockiness(x, z)) + 0.2 * shrubDensity(x, z, road, stream)),
    scale: (r: number) => 0.24 + 0.34 * r,
    variants: 4,
  },
  grass: {
    cell: 0.48,
    salt: 23,
    near: 0.8,
    far: 30,
    chance: (x: number, z: number, road: number, stream: number) => (road < 2.6 ? (road > 1.4 && road < 2.1 ? 0.15 : 0.02) : stream < 6 ? 0.04 : 0.62 - 0.4 * rockiness(x, z)),
    scale: (r: number) => 0.38 + 0.55 * r,
    variants: 3,
  },
  stone: {
    cell: 0.85,
    salt: 37,
    near: 1.0,
    far: 55,
    chance: (x: number, z: number, road: number, stream: number) => (road < 2.4 ? 0.05 : stream < 7 ? 0.92 : 0.04 + 0.62 * rockiness(x, z)),
    scale: (r: number) => 0.07 + 0.3 * r * r,
    variants: 5,
  },
  /** rounded cobbles packing the dry stream bed */
  cobble: {
    cell: 0.42,
    salt: 71,
    near: 0.8,
    far: 55,
    chance: (_x: number, _z: number, _road: number, stream: number) => (stream < 3.2 ? 0.85 : stream < 4.4 ? 0.4 : 0),
    scale: (r: number) => 0.06 + 0.2 * r * r,
    variants: 5,
  },
  /** the limestone that litters the near ground */
  rockNear: {
    cell: 1.7,
    salt: 83,
    near: 2.2,
    far: 60,
    chance: (x: number, z: number, road: number, stream: number) => (road < 4 ? 0 : stream < 7 ? 0.3 : 0.1 + 0.55 * rockiness(x, z)),
    scale: (r: number) => 0.14 + 0.55 * r * r,
    variants: 11,
  },
  rock: {
    cell: 3.2,
    salt: 51,
    near: 3,
    far: 420,
    chance: (x: number, z: number, road: number, stream: number) => (road < 5 ? 0 : stream < 7 ? 0.55 : 0.025 + 0.68 * rockiness(x, z)),
    scale: (r: number) => 0.28 + 1.5 * r * r,
    variants: 11,
  },
} satisfies Record<string, Kind>;

export type KindName = keyof typeof KINDS;

/** One polyline, or several (the branches of a walking route): a band / clearance around any of them. */
export type PathSpec = readonly W2[] | readonly (readonly W2[])[];
const isMulti = (p: PathSpec): p is readonly (readonly W2[])[] => p.length > 0 && Array.isArray(p[0]);
const toLines = (p: PathSpec | undefined): (readonly W2[])[] | null =>
  !p || !p.length ? null : (isMulti(p) ? [...p] : [p as readonly W2[]]).filter((l) => l.length > 0);

/**
 * Exact distance to the nearest of many segments (all the polylines of a
 * route, a few hundred points), answered from a bounding-box tree instead of
 * testing every segment: each query visits only the boxes that could still
 * hold a nearer segment. The per-segment arithmetic is nearestOn's, so the
 * distances — and so the scatter — are the same as a brute-force search.
 */
class SegmentIndex {
  private readonly seg: Float64Array; // ax, az, bx, bz per segment
  private readonly box: Float64Array; // minX, minZ, maxX, maxZ per node
  private readonly kids: Int32Array; // left, right (−1: leaf) per node
  private readonly range: Int32Array; // first segment, count per node
  private readonly order: Int32Array;
  private nodes = 0;
  constructor(lines: readonly (readonly W2[])[]) {
    const s: number[] = [];
    for (const l of lines) {
      if (l.length === 1) s.push(l[0].x, l[0].z, l[0].x, l[0].z);
      for (let i = 0; i + 1 < l.length; i++) s.push(l[i].x, l[i].z, l[i + 1].x, l[i + 1].z);
    }
    this.seg = new Float64Array(s);
    const n = s.length / 4;
    this.order = new Int32Array(n).map((_, i) => i);
    const maxNodes = Math.max(1, 2 * n);
    this.box = new Float64Array(maxNodes * 4);
    this.kids = new Int32Array(maxNodes * 2);
    this.range = new Int32Array(maxNodes * 2);
    if (n) this.build(0, n);
  }
  private build(start: number, count: number): number {
    const k = this.nodes++;
    const S = this.seg;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let i = start; i < start + count; i++) {
      const o = this.order[i] * 4;
      x0 = Math.min(x0, S[o], S[o + 2]); x1 = Math.max(x1, S[o], S[o + 2]);
      z0 = Math.min(z0, S[o + 1], S[o + 3]); z1 = Math.max(z1, S[o + 1], S[o + 3]);
    }
    this.box.set([x0, z0, x1, z1], k * 4);
    this.range[k * 2] = start;
    this.range[k * 2 + 1] = count;
    if (count <= 4) {
      this.kids[k * 2] = this.kids[k * 2 + 1] = -1;
      return k;
    }
    // split at the median of segment midpoints along the longer side
    const axis = x1 - x0 >= z1 - z0 ? 0 : 1;
    const mid = (i: number) => (S[i * 4 + axis] + S[i * 4 + 2 + axis]) / 2;
    const part = Array.from(this.order.subarray(start, start + count)).sort((a, b) => mid(a) - mid(b));
    this.order.set(part, start);
    const half = count >> 1;
    this.kids[k * 2] = this.build(start, half);
    this.kids[k * 2 + 1] = this.build(start + half, count - half);
    return k;
  }
  private boxD2(k: number, x: number, z: number) {
    const b = this.box;
    const dx = Math.max(b[k * 4] - x, 0, x - b[k * 4 + 2]);
    const dz = Math.max(b[k * 4 + 1] - z, 0, z - b[k * 4 + 3]);
    return dx * dx + dz * dz;
  }
  distance(x: number, z: number): number {
    if (!this.nodes) return Infinity;
    const S = this.seg;
    let best = Infinity;
    const stack = [0];
    while (stack.length) {
      const k = stack.pop()!;
      if (this.boxD2(k, x, z) >= best) continue;
      const l = this.kids[k * 2];
      if (l < 0) {
        const st = this.range[k * 2];
        for (let i = st; i < st + this.range[k * 2 + 1]; i++) {
          const o = this.order[i] * 4;
          const ax = S[o], az = S[o + 1];
          const vx = S[o + 2] - ax;
          const vz = S[o + 3] - az;
          const L2 = vx * vx + vz * vz || 1;
          let t = ((x - ax) * vx + (z - az) * vz) / L2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = ax + vx * t - x;
          const dz = az + vz * t - z;
          const d2 = dx * dx + dz * dz;
          if (d2 < best) best = d2;
        }
        continue;
      }
      const r = this.kids[k * 2 + 1];
      // nearer box last, so it is searched first
      if (this.boxD2(l, x, z) < this.boxD2(r, x, z)) stack.push(r, l);
      else stack.push(l, r);
    }
    return Math.sqrt(best);
  }
}

/**
 * Instances of a kind between `near` and `far` metres of the eye at (ex, ez) —
 * or, with `path`, of any of the given polylines (a walking corridor and its
 * branches). `clearancePath` (defaults to `path`) keeps the kind's own `near`
 * metres clear around the walked line(s).
 * `stride` > 1 visits every stride-th cell only — a far band drawn from the
 * same cells as the near one, so far shrubs are a subset of the near ones.
 */
type Band = { near?: number; far?: number; stride?: number; path?: PathSpec; clearancePath?: PathSpec };
export function scatter(kind: KindName, ex: number, ez: number, g: Ground, band: Band = {}): Instance[] {
  return finish(scatterSteps(kind, ex, ez, g, band));
}
export function scatterAsync(kind: KindName, ex: number, ez: number, g: Ground, band: Band = {}, signal?: AbortSignal): Promise<Instance[]> {
  return runBatched(scatterSteps(kind, ex, ez, g, band), signal);
}
function* scatterSteps(kind: KindName, ex: number, ez: number, g: Ground, band: Band): Generator<void, Instance[]> {
  const k: Kind = KINDS[kind];
  const far = band.far ?? k.far;
  const near = band.near ?? k.near;
  const stride = band.stride ?? 1;
  const out: Instance[] = [];
  const snap = (v: number) => Math.floor(v / stride) * stride;
  const lines = toLines(band.path);
  const clearLines = toLines(band.clearancePath);
  const path = lines ? new SegmentIndex(lines) : null;
  const clearancePath = clearLines ? new SegmentIndex(clearLines) : path;
  const pts = lines ? lines.flat() : [{ x: ex, z: ez }];
  const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
  const i0 = snap(Math.floor((Math.min(...xs) - far) / k.cell));
  const i1 = Math.floor((Math.max(...xs) + far) / k.cell);
  const j0 = snap(Math.floor((Math.min(...zs) - far) / k.cell));
  const j1 = Math.floor((Math.max(...zs) + far) / k.cell);
  for (let j = j0; j <= j1; j += stride) {
    for (let i = i0; i <= i1; i += stride) {
      const x = (i + hash01(i, j, k.salt)) * k.cell;
      const z = (j + hash01(i, j, k.salt + 1)) * k.cell;
      const dist = path ? path.distance(x, z) : Math.hypot(x - ex, z - ez);
      const clearance = clearancePath === path ? dist : clearancePath ? clearancePath.distance(x, z) : dist;
      if (dist > far || dist < near || clearance < k.near) continue;
      const pick = hash01(i, j, k.salt + 2);
      // cheap reject before the ground lookups
      if (pick > 0.92) continue;
      const road = g.road(x, z);
      const stream = g.stream(x, z);
      if (pick > k.chance(x, z, road, stream)) continue;
      const r = hash01(i, j, k.salt + 3);
      // far away only the bigger shrubs are worth drawing
      if (kind === 'shrub' && dist > 650 && r < 0.45) continue;
      let scale = k.scale(r);
      // near the eye, shrubs and rocks stay low, so the view is never walled off
      if (kind === 'shrub' && clearance < 18) scale = Math.min(scale, 0.35 + (0.55 * clearance) / 18);
      if (kind === 'rock' && clearance < 10) scale = Math.min(scale, 0.25 + clearance * 0.06);
      out.push({
        x,
        z,
        y: g.height(x, z),
        scale,
        rot: hash01(i, j, k.salt + 4) * Math.PI * 2,
        tilt: (hash01(i, j, k.salt + 5) - 0.5) * 0.25,
        variant: Math.floor(hash01(i, j, k.salt + 6) * k.variants),
        tint: hash01(i, j, k.salt + 7),
        dist,
      });
    }
    yield;
  }
  return out;
}

