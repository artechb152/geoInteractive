/**
 * The ground of the dead-reckoning sandstorm: one deterministic height field
 * and its surface masks, meshed in chunks around the navigator. Pure maths, no
 * three.js — the scene (DeadReckoningScene3D) turns the arrays into buffers,
 * and scripts/qa/dead-reckoning.test.mjs checks the wadi, the roads and the
 * eye height under plain Node.
 *
 * Space. The sheet's E/N metres (deadReckoningModel) map to the scene with
 * 1 unit = 1 m and A at the origin:
 *     x = E − A.E      y = height (m)      z = −(N − A.N)
 * so north is −z and an azimuth θ (clockwise from north) points along
 * (sin θ, 0, −cos θ). Chunks are laid out in the leg's own frame — u along
 * the 62° line from A, v to its right — so the few that the walk needs are
 * easy to name.
 *
 * Relief. Gentle undulation (±2 m over ~150 m), hummocks and low rock
 * outcrops, wind-shaped sand drifts, the two dirt roads at A (flattened, with
 * tyre ruts), and the dry wadi: a 1.8 m deep channel with a sandy, gravelly bed
 * and steep, crumbling cut banks, carved along the map's own centre line.
 */
import { AZIMUTH_DEG, ROADS, ROAD_WIDTH_M, START, WADI, WADI_WIDTH_M, type XY } from './deadReckoningModel';

// ---------------------------------------------------------------- frames

const RAD = (AZIMUTH_DEG * Math.PI) / 180;
/** Unit vectors of the leg in E/N: along it, and to its right. */
export const LEG = { aE: Math.sin(RAD), aN: Math.cos(RAD), rE: Math.cos(RAD), rN: -Math.sin(RAD) } as const;

export const toScene = (E: number, N: number, h: number): [number, number, number] => [E - START.E, h, -(N - START.N)];
export const sceneToEN = (x: number, z: number) => ({ E: x + START.E, N: -z + START.N });
/** E/N of a point u metres along the leg and v metres to its right. */
export const legToEN = (u: number, v: number) => ({ E: START.E + u * LEG.aE + v * LEG.rE, N: START.N + u * LEG.aN + v * LEG.rN });
/** Scene direction of an azimuth. */
export const azimuthToScene = (deg: number): [number, number] => {
  const r = (deg * Math.PI) / 180;
  return [Math.sin(r), -Math.cos(r)];
};

/** The navigator's eyes above the ground under their feet, metres. */
export const EYE_HEIGHT_M = 1.7;

// ---------------------------------------------------------------- noise (seeded, the same on every machine)

const PERM = new Uint8Array(512);
const GRAD = new Float32Array(512);
(() => {
  let seed = 0x6a1c3f;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const p = Array.from({ length: 256 }, (_, k) => k);
  for (let k = 255; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [p[k], p[j]] = [p[j], p[k]];
  }
  for (let k = 0; k < 512; k++) PERM[k] = p[k & 255];
  for (let k = 0; k < 256; k++) {
    const a = rnd() * Math.PI * 2;
    GRAD[k * 2] = Math.cos(a);
    GRAD[k * 2 + 1] = Math.sin(a);
  }
})();

/** 2-D gradient noise, about −0.7…0.7, period 256. */
export function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const X = xi & 255;
  const Y = yi & 255;
  const g = (ix: number, iy: number, dx: number, dy: number) => {
    const h = PERM[PERM[ix] + iy] * 2;
    return GRAD[h] * dx + GRAD[h + 1] * dy;
  };
  const n00 = g(X, Y, xf, yf);
  const n10 = g(X + 1, Y, xf - 1, yf);
  const n01 = g(X, Y + 1, xf, yf - 1);
  const n11 = g(X + 1, Y + 1, xf - 1, yf - 1);
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  return n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v;
}

/** Fractal sum, each octave rotated ~37° so no grid shows. Roughly −1…1. */
export function fbm(x: number, y: number, octaves: number): number {
  let sum = 0;
  let amp = 0.6;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x + o * 17.3, y - o * 9.1);
    norm += amp * 0.7;
    const nx = 0.8 * x - 0.6 * y;
    y = 0.6 * x + 0.8 * y;
    x = nx * 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- polylines

type Seg = { ax: number; ay: number; dx: number; dy: number; len2: number; along0: number };
function segments(pts: readonly XY[]): { segs: Seg[]; box: [number, number, number, number] } {
  const segs: Seg[] = [];
  let along = 0;
  let box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[k + 1];
    const dx = bx - ax;
    const dy = by - ay;
    segs.push({ ax, ay, dx, dy, len2: dx * dx + dy * dy, along0: along });
    along += Math.hypot(dx, dy);
    box = [Math.min(box[0], ax, bx), Math.min(box[1], ay, by), Math.max(box[2], ax, bx), Math.max(box[3], ay, by)];
  }
  return { segs, box };
}
/** Distance to a polyline and the arc length of the nearest point (for noise that runs along it). */
function nearest(segs: Seg[], E: number, N: number): { d: number; s: number } {
  let best = Infinity;
  let s = 0;
  for (const g of segs) {
    let t = ((E - g.ax) * g.dx + (N - g.ay) * g.dy) / g.len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = g.ax + g.dx * t - E;
    const py = g.ay + g.dy * t - N;
    const d2 = px * px + py * py;
    if (d2 < best) {
      best = d2;
      s = g.along0 + t * Math.sqrt(g.len2);
    }
  }
  return { d: Math.sqrt(best), s };
}

const WADI_GEOM = segments(WADI);
const ROAD_GEOM = ROADS.map((r) => segments(r.pts));
const NEAR_WADI_M = WADI_WIDTH_M / 2 + 12;
const NEAR_ROAD_M = ROAD_WIDTH_M / 2 + 6;
const inBox = (b: [number, number, number, number], E: number, N: number, m: number) => E > b[0] - m && E < b[2] + m && N > b[1] - m && N < b[3] + m;

// ---------------------------------------------------------------- the wadi's cross-section

/** Depth of the channel below the plain, metres. */
export const WADI_DEPTH_M = 1.8;
/** Half-width of the flat bed (the banks rise from here to WADI_WIDTH_M / 2). */
const BED_HALF_M = 3.3;

/** Depth carved at distance `d` from the centre line; `s` (arc length) and the local noise make the banks irregular. */
function wadiCut(d: number, s: number): { depth: number; bed: number; bank: number } {
  const top = WADI_WIDTH_M / 2 + 1.2 * noise(s / 9, 3.7) + 0.5 * noise(s / 2.6, 8.1);
  const bed = BED_HALF_M + 0.7 * noise(s / 13, 1.3);
  if (d >= top) {
    // A low crumbling lip and the first metre of the plain sloping into the channel.
    const lip = Math.max(0, 1 - (d - top) / 2.2);
    return { depth: 0.12 * lip * lip, bed: 0, bank: lip * 0.6 };
  }
  const floor = WADI_DEPTH_M + 0.12 * noise(s / 6, 5.5);
  // The bed: shallow braided runnels and bars.
  if (d <= bed) return { depth: floor - 0.08 * (1 - d / bed) + 0.1 * noise(s / 3.1, d / 1.6), bed: 1, bank: 0 };
  const t = (d - bed) / (top - bed);
  // A cut bank: a talus near the bed, steep near the top (t³), with erosion runnels down its face.
  const runnels = 0.26 * Math.abs(noise(s / 1.4, t * 2.2)) * Math.sin(Math.PI * t) + 0.12 * noise(s / 0.6, t * 4.0) * t;
  return { depth: floor * (1 - t * t * t) + runnels, bed: Math.max(0, 1 - t * 2.5), bank: 1 };
}

// ---------------------------------------------------------------- the height field and its masks

export type Surface = {
  /** Height above the datum, metres. */
  h: number;
  /** Layer weights before the shader's height blend: base ground, stony ground, bank soil, wind-blown sand. */
  ground: number;
  stony: number;
  bank: number;
  drift: number;
  /** Compacted road surface, 0–1. */
  road: number;
};

const S: Surface = { h: 0, ground: 1, stony: 0, bank: 0, drift: 0, road: 0 };
/** Wind blows towards this azimuth; drifts are elongated along it. */
export const WIND_DEG = 320;
const WR = (WIND_DEG * Math.PI) / 180;
const WE = Math.sin(WR);
const WN = Math.cos(WR);

/**
 * The surface at a point. Returns a shared object (no allocation per vertex) —
 * copy what you need before the next call.
 */
export function surfaceAt(E: number, N: number): Surface {
  // Large and medium relief.
  const broad = 2.1 * fbm(E / 170, N / 170, 3) + 0.55 * fbm(E / 38 + 40, N / 38, 3);
  // Hummocks and micro-relief.
  let fine = 0.14 * fbm(E / 7.5, N / 7.5 + 13, 3) + 0.05 * fbm(E / 1.9, N / 1.9, 2) + 0.025 * fbm(E / 0.7 + 5, N / 0.7, 2);

  // Wind-shaped sand: patches of low drifts stretched along the wind.
  const patch = smoothstep(0.05, 0.45, fbm(E / 46 + 7, N / 46 - 3, 2));
  const a = E * WE + N * WN; // along the wind
  const c = E * WN - N * WE; // across it
  const dune = Math.max(0, fbm(a / 11, c / 3.6, 2) + 0.15);
  fine += patch * 0.32 * dune;

  // Low rock outcrops: rare, broken, with gravel around them.
  let outcrop = smoothstep(0.42, 0.62, fbm(E / 28 - 11, N / 28 + 5, 2));

  let stony = 0.2 + 0.45 * smoothstep(-0.1, 0.45, fbm(E / 15 + 3, N / 15 - 8, 3));
  let drift = patch * (0.35 + 0.65 * smoothstep(0, 0.4, dune));
  let bank = 0;
  let road = 0;
  let rut = 0;

  // The dirt roads at A: levelled to the broad relief, compacted, two shallow tyre ruts.
  for (const g of ROAD_GEOM) {
    if (!inBox(g.box, E, N, NEAR_ROAD_M)) continue;
    const { d } = nearest(g.segs, E, N);
    if (d >= NEAR_ROAD_M) continue;
    const w = 1 - smoothstep(ROAD_WIDTH_M / 2 - 0.4, NEAR_ROAD_M, d);
    const core = 1 - smoothstep(ROAD_WIDTH_M / 2 - 0.6, ROAD_WIDTH_M / 2 + 0.5, d);
    fine *= 1 - 0.85 * w;
    outcrop *= 1 - w;
    rut = Math.max(rut, core * (0.05 + 0.045 * Math.exp(-(((d - 0.85) / 0.22) ** 2))));
    road = Math.max(road, core);
    stony *= 1 - 0.85 * core;
    drift *= 1 - 0.7 * core;
  }

  const ridged = outcrop > 0 ? 1 - Math.abs(fbm(E / 3.2, N / 3.2, 3)) : 0;
  let h = broad + fine + outcrop * (0.35 * ridged * ridged + 0.15) - rut;
  stony = stony + 0.9 * outcrop;

  // The wadi.
  if (inBox(WADI_GEOM.box, E, N, NEAR_WADI_M)) {
    const { d, s } = nearest(WADI_GEOM.segs, E, N);
    if (d < NEAR_WADI_M) {
      const cut = wadiCut(d, s);
      h -= cut.depth;
      bank = Math.max(bank, cut.bank);
      // The bed: sand in the middle of the flow, gravel bars along it.
      const bars = smoothstep(-0.1, 0.35, fbm(s / 7, d / 2.5, 2));
      stony = stony * (1 - cut.bed) + cut.bed * (0.55 + 0.4 * bars);
      drift = drift * (1 - cut.bed) + cut.bed * (0.5 - 0.35 * bars);
    }
  }

  S.h = h;
  S.stony = Math.min(1, stony);
  S.drift = Math.min(1, drift);
  S.bank = Math.min(1, bank);
  S.road = road;
  S.ground = 1;
  return S;
}

export const heightAt = (E: number, N: number) => surfaceAt(E, N).h;

/** Ground under the navigator, softened over half a metre so the eye does not ride every pebble. */
export function groundUnder(E: number, N: number): number {
  const r = 0.45;
  return (heightAt(E, N) * 2 + heightAt(E + r, N) + heightAt(E - r, N) + heightAt(E, N + r) + heightAt(E, N - r)) / 6;
}
export const eyeHeightAt = (E: number, N: number) => groundUnder(E, N) + EYE_HEIGHT_M;

// ---------------------------------------------------------------- chunks

/** Chunk edge, metres, in the leg's frame. */
export const CHUNK_M = 24;
/** Grid spacing by lateral band: the ground near the walk is the densest. */
export function chunkStep(j: number): number {
  const v = Math.min(Math.abs(j * CHUNK_M), Math.abs((j + 1) * CHUNK_M));
  return v < 24 ? 0.25 : v < 48 ? 0.5 : 1;
}
/** Lateral chunk columns that exist (|v| ≤ 96 m: the storm hides everything farther). */
export const CHUNK_J = [-4, -3, -2, -1, 0, 1, 2, 3] as const;
/** How far along the leg chunks are kept around the navigator, metres. */
export const CHUNK_REACH_M = 100;

export type ChunkMesh = {
  /** Scene-space xyz per vertex (skirt included). */
  position: Float32Array;
  normal: Float32Array;
  /** stony, bank, drift, road per vertex. */
  layers: Float32Array;
  /** Ambient occlusion per vertex (1 = open). */
  ao: Float32Array;
  index: Uint32Array;
  /** Scene-space bounds, for culling. */
  center: [number, number, number];
  radius: number;
};

const SKIRT_M = 0.6;

/**
 * Mesh chunk (i, j): u in [i·C, (i+1)·C], v in [j·C, (j+1)·C]. Heights are sampled
 * with a one-cell border so the normals match across chunk edges; a short
 * skirt hides the cracks where chunks of different spacing meet. `occluders`
 * darken the ground around the rocks standing on it.
 */
export function buildChunk(i: number, j: number, occluders: readonly Occluder[] = []): ChunkMesh {
  const step = chunkStep(j);
  const n = Math.round(CHUNK_M / step) + 1; // vertices per side
  const g = n + 2; // with the border
  const u0 = i * CHUNK_M;
  const v0 = j * CHUNK_M;
  const H = new Float32Array(g * g);
  const L = new Float32Array(n * n * 4);
  for (let b = 0; b < g; b++) {
    for (let a = 0; a < g; a++) {
      const p = legToEN(u0 + (a - 1) * step, v0 + (b - 1) * step);
      const s = surfaceAt(p.E, p.N);
      H[b * g + a] = s.h;
      if (a >= 1 && a <= n && b >= 1 && b <= n) {
        const k = ((b - 1) * n + (a - 1)) * 4;
        L[k] = s.stony;
        L[k + 1] = s.bank;
        L[k + 2] = s.drift;
        L[k + 3] = s.road;
      }
    }
  }
  const skirtN = 4 * (n - 1);
  const vCount = n * n + skirtN * 2;
  const position = new Float32Array(vCount * 3);
  const normal = new Float32Array(vCount * 3);
  const layers = new Float32Array(vCount * 4);
  const ao = new Float32Array(vCount);
  layers.set(L);

  // Leg frame axes in scene space: u → (aE, −aN), v → (rE, −rN).
  const ux = LEG.aE;
  const uz = -LEG.aN;
  const vx = LEG.rE;
  const vz = -LEG.rN;
  for (let b = 0; b < n; b++) {
    for (let a = 0; a < n; a++) {
      const k = b * n + a;
      const u = u0 + a * step;
      const v = v0 + b * step;
      const h = H[(b + 1) * g + (a + 1)];
      position[k * 3] = u * ux + v * vx;
      position[k * 3 + 1] = h;
      position[k * 3 + 2] = u * uz + v * vz;
      // Central differences in the leg frame, then rotated to the scene.
      const dhu = (H[(b + 1) * g + (a + 2)] - H[(b + 1) * g + a]) / (2 * step);
      const dhv = (H[(b + 2) * g + (a + 1)] - H[b * g + (a + 1)]) / (2 * step);
      // Surface gradient in scene xz.
      const gx = dhu * ux + dhv * vx;
      const gz = dhu * uz + dhv * vz;
      const inv = 1 / Math.sqrt(gx * gx + 1 + gz * gz);
      normal[k * 3] = -gx * inv;
      normal[k * 3 + 1] = inv;
      normal[k * 3 + 2] = -gz * inv;
      // Cavity: hollows a little darker, crests a little lighter (curvature from the 4-neighbourhood).
      const lap = (H[(b + 1) * g + a] + H[(b + 1) * g + a + 2] + H[b * g + a + 1] + H[(b + 2) * g + a + 1] - 4 * h) / (step * step);
      ao[k] = Math.min(1.05, Math.max(0.5, 1 - 0.12 * lap));
    }
  }

  // Rock contact shadows on the ground.
  for (const o of occluders) {
    const ou = o.x * ux + o.z * uz - u0;
    const ov = o.x * vx + o.z * vz - v0;
    const R = o.r * 1.9;
    const a0 = Math.max(0, Math.floor((ou - R) / step));
    const a1 = Math.min(n - 1, Math.ceil((ou + R) / step));
    const b0 = Math.max(0, Math.floor((ov - R) / step));
    const b1 = Math.min(n - 1, Math.ceil((ov + R) / step));
    for (let b = b0; b <= b1; b++) {
      for (let a = a0; a <= a1; a++) {
        const d = Math.hypot(a * step - ou, b * step - ov) / R;
        if (d < 1) ao[b * n + a] *= 1 - 0.55 * (1 - d) * (1 - d);
      }
    }
  }

  // Skirt: the border ring repeated SKIRT_M lower.
  const ring: number[] = [];
  for (let a = 0; a < n - 1; a++) ring.push(a); // south edge (b = 0)
  for (let b = 0; b < n - 1; b++) ring.push(b * n + (n - 1));
  for (let a = n - 1; a > 0; a--) ring.push((n - 1) * n + a);
  for (let b = n - 1; b > 0; b--) ring.push(b * n);
  const base = n * n;
  ring.forEach((src, r) => {
    for (const [dst, drop] of [
      [base + r, 0],
      [base + skirtN + r, SKIRT_M],
    ] as const) {
      position[dst * 3] = position[src * 3];
      position[dst * 3 + 1] = position[src * 3 + 1] - drop;
      position[dst * 3 + 2] = position[src * 3 + 2];
      normal.copyWithin(dst * 3, src * 3, src * 3 + 3);
      layers.copyWithin(dst * 4, src * 4, src * 4 + 4);
      ao[dst] = ao[src] * 0.8;
    }
  });

  // The skirt is seen from either side, so its quads are wound both ways.
  const quads = (n - 1) * (n - 1) + skirtN * 2;
  const index = new Uint32Array(quads * 6);
  let q = 0;
  // Triangles wound counter-clockwise seen from above (+y): the leg frame is right-handed in scene space.
  const quad = (p00: number, p10: number, p01: number, p11: number) => {
    index[q++] = p00;
    index[q++] = p01;
    index[q++] = p10;
    index[q++] = p10;
    index[q++] = p01;
    index[q++] = p11;
  };
  for (let b = 0; b < n - 1; b++) for (let a = 0; a < n - 1; a++) quad(b * n + a, b * n + a + 1, (b + 1) * n + a, (b + 1) * n + a + 1);
  for (let r = 0; r < skirtN; r++) {
    const r1 = (r + 1) % skirtN;
    quad(base + r, base + r1, base + skirtN + r, base + skirtN + r1);
    quad(base + r1, base + r, base + skirtN + r1, base + skirtN + r);
  }

  const cu = u0 + CHUNK_M / 2;
  const cv = v0 + CHUNK_M / 2;
  const ch = H[Math.floor(g / 2) * g + Math.floor(g / 2)];
  return {
    position,
    normal,
    layers,
    ao,
    index,
    center: [cu * ux + cv * vx, ch, cu * uz + cv * vz],
    radius: CHUNK_M * 0.75 + 4,
  };
}

// ---------------------------------------------------------------- rocks and bushes

/** The scattered shapes, by family (the names of the meshes in rocks.glb / shrubs.glb). */
export const ROCK_SHAPES = ['stone_a', 'stone_b', 'stone_c', 'stone_d', 'stone_e', 'rock_a', 'rock_b', 'rock_c', 'rock_d', 'rock07_a', 'boulder_a'] as const;
export const SHRUB_SHAPES = ['shrub_b', 'shrub_c', 'shrub_d', 'shrub_e'] as const;
export type RockShape = (typeof ROCK_SHAPES)[number];
export type ShrubShape = (typeof SHRUB_SHAPES)[number];

/** Approximate footprint radius of each shape at scale 1, metres (from the scans). */
const ROCK_RADIUS: Record<RockShape, number> = {
  stone_a: 0.07, stone_b: 0.06, stone_c: 0.07, stone_d: 0.05, stone_e: 0.06,
  rock_a: 0.16, rock_b: 0.18, rock_c: 0.17, rock_d: 0.18, rock07_a: 0.13, boulder_a: 0.62,
};

export type Instance = {
  shape: string;
  /** Scene position of the base. */
  x: number;
  y: number;
  z: number;
  /** Yaw (rad), tilt axis angle and tilt (rad), uniform scale with a squash. */
  yaw: number;
  tiltDir: number;
  tilt: number;
  scale: number;
  squash: number;
};
export type Occluder = { x: number; z: number; r: number };

function chunkRng(i: number, j: number, salt: number) {
  let seed = (Math.imul(i + 1013, 73856093) ^ Math.imul(j + 7919, 19349663) ^ salt) >>> 0;
  return () => ((seed = (Math.imul(seed ^ (seed >>> 15), 2246822519) + 3266489917) >>> 0) / 4294967296);
}

/** Distance from the leg's line (rocks and bushes keep off the walker's path, metres). */
const PATH_CLEAR_M = 1.3;

/**
 * Rocks and bushes standing in chunk (i, j) — deterministic, so a chunk rebuilt
 * later holds the same ones. Stones gather on gravel, outcrops, the wadi bed
 * and its banks; bushes favour the wadi's edges and sandy patches; none stand
 * on the roads or in the walker's way.
 */
export function scatterChunk(i: number, j: number): { rocks: Instance[]; shrubs: Instance[]; occluders: Occluder[] } {
  const rocks: Instance[] = [];
  const shrubs: Instance[] = [];
  const occluders: Occluder[] = [];
  const near = j >= -2 && j <= 1; // |v| < 48 m: the bands where the eye still makes out a stone
  const fine = chunkStep(j) <= 0.25;
  const rnd = chunkRng(i, j, 0x51ed);
  const u0 = i * CHUNK_M;
  const v0 = j * CHUNK_M;

  /** `sink`: metres below the ground at scale 1 (the scans' bases are uneven; a little burial seats them). */
  const place = (shape: string, u: number, v: number, scale: number, sink: number, list: Instance[], tiltMax: number) => {
    const p = legToEN(u, v);
    const s = surfaceAt(p.E, p.N);
    const h = s.h;
    // Local slope for the tilt: rocks settle into it.
    const e = 0.3;
    const hx = (heightAt(p.E + e, p.N) - heightAt(p.E - e, p.N)) / (2 * e);
    const hn = (heightAt(p.E, p.N + e) - heightAt(p.E, p.N - e)) / (2 * e);
    const [x, , z] = toScene(p.E, p.N, 0);
    list.push({
      shape,
      x,
      y: h - sink * scale,
      z,
      yaw: rnd() * Math.PI * 2,
      tiltDir: Math.atan2(-hn, hx),
      tilt: Math.min(tiltMax, Math.atan(Math.hypot(hx, hn))) * 0.8 + (rnd() - 0.5) * 0.25,
      scale,
      squash: 0.75 + rnd() * 0.45,
    });
    return { x, z };
  };

  // Jittered cells: medium rocks every ~5 m, stones every ~1.4 m near the walk, bushes every ~9 m.
  const cells = (size: number, fn: (u: number, v: number) => void) => {
    for (let b = 0; b < CHUNK_M / size; b++) for (let a = 0; a < CHUNK_M / size; a++) fn(u0 + (a + rnd()) * size, v0 + (b + rnd()) * size);
  };

  // Medium rocks and the odd boulder.
  cells(4.2, (u, v) => {
    if (Math.abs(v) < PATH_CLEAR_M + 0.6) return;
    const p = legToEN(u, v);
    const s = surfaceAt(p.E, p.N);
    const want = 0.18 + 0.7 * s.stony + 0.5 * s.bank - 0.8 * s.road - 0.35 * s.drift;
    if (rnd() > want) return;
    const boulder = rnd() < 0.06 + 0.12 * s.bank;
    const shape: RockShape = boulder ? 'boulder_a' : (['rock_a', 'rock_b', 'rock_c', 'rock_d', 'rock07_a'] as const)[Math.floor(rnd() * 5)];
    const scale = boulder ? 0.35 + rnd() * 0.75 : 1.0 + rnd() * rnd() * 3.6;
    const at = place(shape, u, v, scale, boulder ? 0.1 : 0.035, rocks, 0.5);
    occluders.push({ x: at.x, z: at.z, r: ROCK_RADIUS[shape] * scale });
  });

  // Small stones, in clusters, only where the eye can see them.
  if (near) {
    cells(fine ? 1.1 : 2.2, (u, v) => {
      if (Math.abs(v) < 0.5) return;
      const p = legToEN(u, v);
      const s = surfaceAt(p.E, p.N);
      // Clustered: stony ground in patches a few metres across, bare between them.
      const clump = smoothstep(-0.25, 0.35, fbm(p.E / 6.5 + 31, p.N / 6.5 - 17, 2));
      const want = (0.15 + 0.75 * s.stony + 0.4 * s.bank) * (0.35 + 0.9 * clump) - 0.9 * s.road - 0.45 * s.drift;
      if (rnd() > want) return;
      const k = 1 + Math.floor(rnd() * 3);
      for (let c = 0; c < k; c++) {
        const shape: RockShape = (['stone_a', 'stone_b', 'stone_c', 'stone_d', 'stone_e'] as const)[Math.floor(rnd() * 5)];
        const scale = 0.7 + rnd() * rnd() * 3.2;
        const du = (rnd() - 0.5) * 0.9;
        const dv = (rnd() - 0.5) * 0.9;
        const at = place(shape, u + du, v + dv, scale, 0.012, rocks, 0.6);
        if (scale > 1.4) occluders.push({ x: at.x, z: at.z, r: ROCK_RADIUS[shape] * scale });
      }
    });
  }

  // Dry bushes.
  cells(6, (u, v) => {
    if (Math.abs(v) < PATH_CLEAR_M + 0.8) return;
    const p = legToEN(u, v);
    const s = surfaceAt(p.E, p.N);
    // Desert scrub gathers where water runs: thickest along the wadi's banks and bed.
    const nearWadi = s.bank > 0 || s.stony > 0.6 ? 0.45 : 0;
    const want = 0.36 + 0.6 * s.bank + nearWadi + 0.25 * s.drift - 0.9 * s.road - 0.2 * s.stony;
    if (rnd() > want) return;
    const r = rnd();
    const shape: ShrubShape = r < 0.12 ? 'shrub_b' : r < 0.35 ? 'shrub_c' : r < 0.7 ? 'shrub_d' : 'shrub_e';
    place(shape, u, v, 0.75 + rnd() * 0.7, 0.04, shrubs, 0.15);
  });

  return { rocks, shrubs, occluders };
}

/** Column-major 4×4 matrix of an instance (three.js Matrix4.elements order). */
export function instanceMatrix(t: Instance, out: Float32Array, offset: number): void {
  // R = Rtilt(axis in xz, angle) · Ryaw
  const cy = Math.cos(t.yaw);
  const sy = Math.sin(t.yaw);
  const ax = Math.cos(t.tiltDir);
  const az = Math.sin(t.tiltDir);
  // Tilt about the horizontal axis perpendicular to the slope direction (ax, az): axis = (−az, 0, ax).
  const kx = -az;
  const kz = ax;
  const c = Math.cos(t.tilt);
  const s = Math.sin(t.tilt);
  const C = 1 - c;
  // Rodrigues for axis (kx, 0, kz).
  const t00 = c + kx * kx * C;
  const t01 = -kz * s;
  const t02 = kx * kz * C;
  const t10 = kz * s;
  const t11 = c;
  const t12 = -kx * s;
  const t20 = kz * kx * C;
  const t21 = kx * s;
  const t22 = c + kz * kz * C;
  // Yaw about y: [cy 0 sy; 0 1 0; −sy 0 cy]
  const r00 = t00 * cy + t02 * -sy;
  const r01 = t01;
  const r02 = t00 * sy + t02 * cy;
  const r10 = t10 * cy + t12 * -sy;
  const r11 = t11;
  const r12 = t10 * sy + t12 * cy;
  const r20 = t20 * cy + t22 * -sy;
  const r21 = t21;
  const r22 = t20 * sy + t22 * cy;
  const sxz = t.scale;
  const syy = t.scale * t.squash;
  out[offset] = r00 * sxz;
  out[offset + 1] = r10 * sxz;
  out[offset + 2] = r20 * sxz;
  out[offset + 3] = 0;
  out[offset + 4] = r01 * syy;
  out[offset + 5] = r11 * syy;
  out[offset + 6] = r21 * syy;
  out[offset + 7] = 0;
  out[offset + 8] = r02 * sxz;
  out[offset + 9] = r12 * sxz;
  out[offset + 10] = r22 * sxz;
  out[offset + 11] = 0;
  out[offset + 12] = t.x;
  out[offset + 13] = t.y;
  out[offset + 14] = t.z;
  out[offset + 15] = 1;
}

/** The chunks the navigator at `u` metres along the leg needs. */
export function chunksAround(u: number): { i: number; j: number }[] {
  const out: { i: number; j: number }[] = [];
  const i0 = Math.floor((u - CHUNK_REACH_M) / CHUNK_M);
  const i1 = Math.floor((u + CHUNK_REACH_M) / CHUNK_M);
  for (let i = i0; i <= i1; i++) for (const j of CHUNK_J) out.push({ i, j });
  return out;
}
