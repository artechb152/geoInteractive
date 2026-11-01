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
import { nearestOn, polyline, type W2 } from './replayWorld';
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

/**
 * Instances of a kind between `near` and `far` metres of the eye at (ex, ez).
 * `stride` > 1 visits every stride-th cell only — a far band drawn from the
 * same cells as the near one, so far shrubs are a subset of the near ones.
 */
type Band = { near?: number; far?: number; stride?: number; path?: readonly W2[]; clearancePath?: readonly W2[] };
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
  const path = band.path ? polyline([...band.path]) : null;
  const clearancePath = band.clearancePath ? polyline([...band.clearancePath]) : path;
  const xs = band.path?.map(p => p.x) ?? [ex], zs = band.path?.map(p => p.z) ?? [ez];
  const i0 = snap(Math.floor((Math.min(...xs) - far) / k.cell));
  const i1 = Math.floor((Math.max(...xs) + far) / k.cell);
  const j0 = snap(Math.floor((Math.min(...zs) - far) / k.cell));
  const j1 = Math.floor((Math.max(...zs) + far) / k.cell);
  for (let j = j0; j <= j1; j += stride) {
    for (let i = i0; i <= i1; i += stride) {
      const x = (i + hash01(i, j, k.salt)) * k.cell;
      const z = (j + hash01(i, j, k.salt + 1)) * k.cell;
      const dist = path ? nearestOn(path, {x,z}).d : Math.hypot(x - ex, z - ez);
      const clearance = clearancePath ? nearestOn(clearancePath, {x,z}).d : dist;
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

