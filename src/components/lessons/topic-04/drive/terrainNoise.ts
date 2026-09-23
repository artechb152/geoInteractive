/**
 * Small, self-contained noise toolkit for the drive lab's terrain shaping
 * (no external noise dependency). Everything is deterministic and pure so
 * the render mesh and the vehicle's wheel-contact sampling always agree.
 *
 * Unlike the old value noise, the gradient noise here has no axis-aligned
 * "blockiness", which is what made the previous relief read as random lumps.
 */

/** Integer hash → [0, 1). */
export function hash2(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function smoothstep01(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/** GLSL-style smoothstep(edge0, edge1, x). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  return smoothstep01((x - edge0) / (edge1 - edge0));
}

const GRAD_COUNT = 16;
const GRAD_X = new Float64Array(GRAD_COUNT);
const GRAD_Z = new Float64Array(GRAD_COUNT);
for (let i = 0; i < GRAD_COUNT; i++) {
  GRAD_X[i] = Math.cos((i / GRAD_COUNT) * Math.PI * 2);
  GRAD_Z[i] = Math.sin((i / GRAD_COUNT) * Math.PI * 2);
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function corner(ix: number, iz: number, seed: number, dx: number, dz: number): number {
  const g = (hash2(ix, iz, seed) * GRAD_COUNT) | 0;
  return GRAD_X[g] * dx + GRAD_Z[g] * dz;
}

/** 2D gradient (Perlin-style) noise, roughly -1..1. */
export function noise2(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const u = fade(fx);
  const v = fade(fz);
  const n00 = corner(x0, z0, seed, fx, fz);
  const n10 = corner(x0 + 1, z0, seed, fx - 1, fz);
  const n01 = corner(x0, z0 + 1, seed, fx, fz - 1);
  const n11 = corner(x0 + 1, z0 + 1, seed, fx - 1, fz - 1);
  const a = n00 + (n10 - n00) * u;
  const b = n01 + (n11 - n01) * u;
  return (a + (b - a) * v) * 1.4;
}

/** Fractal sum of gradient noise, normalised to roughly -1..1. */
export function fbm2(x: number, z: number, seed: number, octaves: number, lacunarity = 2.03, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq, z * freq, seed + i * 131) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged multifractal, 0..1 — sharp crests where the noise crosses zero (rock ribs, jagged skylines). */
export function ridged2(x: number, z: number, seed: number, octaves: number, lacunarity = 2.1, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const r = 1 - Math.abs(noise2(x * freq, z * freq, seed + i * 173));
    sum += r * r * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/**
 * Soft terrace quantisation: flat treads of height `step` joined by steep,
 * smooth risers occupying the top `(1 - riserStart)` of every step. Returns
 * the offset to add to `v` (re-centred to ~zero mean) so callers can scale it.
 */
export function terraceOffset(v: number, step: number, riserStart: number): number {
  const n = v / step;
  const f = n - Math.floor(n);
  const s = smoothstep01((f - riserStart) / (1 - riserStart));
  return (s - f + riserStart / 2) * step;
}

export type BoulderOptions = {
  /** Jitter-grid cell size (m); at most one boulder per cell. */
  cell: number;
  /** 0..1 — fraction of cells that hold a boulder. */
  density: number;
  minRadius: number;
  maxRadius: number;
  /** Boulder height as a fraction of its radius. */
  heightRatio: number;
  seed: number;
};

/**
 * Field of individual embedded boulders on a jittered grid, combined by
 * taking the max. Each boulder is elongated at a random angle, has a
 * noise-warped outline and a flattened, weathered crown, so it reads as a
 * distinct stone rather than a noise bump or a perfect dome. Radii stay well
 * above the mesh spacing, so the rendered surface matches what the wheels feel.
 */
export function boulderField(x: number, z: number, o: BoulderOptions): number {
  const cx = Math.floor(x / o.cell);
  const cz = Math.floor(z / o.cell);
  let best = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ix = cx + dx;
      const iz = cz + dz;
      if (hash2(ix, iz, o.seed) > o.density) continue;
      const px = (ix + 0.15 + 0.7 * hash2(ix, iz, o.seed + 1)) * o.cell;
      const pz = (iz + 0.15 + 0.7 * hash2(ix, iz, o.seed + 2)) * o.cell;
      const radius = o.minRadius + (o.maxRadius - o.minRadius) * hash2(ix, iz, o.seed + 3);
      const ox = x - px;
      const oz = z - pz;
      if (ox * ox + oz * oz >= radius * radius) continue;
      const angle = hash2(ix, iz, o.seed + 5) * Math.PI;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const minor = 0.55 + 0.4 * hash2(ix, iz, o.seed + 6);
      const u = (ox * c + oz * s) / radius;
      const v = (-ox * s + oz * c) / (radius * minor);
      const q = (u * u + v * v) * (1 + 0.35 * noise2(x * 1.3, z * 1.3, o.seed + 7));
      if (q >= 1) continue;
      const height = radius * o.heightRatio * (0.75 + 0.5 * hash2(ix, iz, o.seed + 4));
      const t = Math.min(1, 1.25 * Math.pow(1 - q, 0.6));
      const crown = 1 - (1 - t) * (1 - t);
      if (height * crown > best) best = height * crown;
    }
  }
  return best;
}
