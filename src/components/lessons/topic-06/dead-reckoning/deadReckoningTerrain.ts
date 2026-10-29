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
import { AZIMUTH_DEG, ROADS, ROAD_WIDTH_M, START, WADI, WADI_CROSSING_M, WADI_WIDTH_M, along, type XY } from './deadReckoningModel';

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
/**
 * Distance to a polyline, the arc length of the nearest point (for noise that runs along it) and the side
 * of the line the point is on (+1 left of its direction, −1 right) — the wadi's two banks differ.
 */
function nearest(segs: Seg[], E: number, N: number): { d: number; s: number; side: number } {
  let best = Infinity;
  let s = 0;
  let side = 1;
  for (const g of segs) {
    let t = ((E - g.ax) * g.dx + (N - g.ay) * g.dy) / g.len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = g.ax + g.dx * t - E;
    const py = g.ay + g.dy * t - N;
    const d2 = px * px + py * py;
    if (d2 < best) {
      best = d2;
      s = g.along0 + t * Math.sqrt(g.len2);
      side = g.dx * -py - g.dy * -px >= 0 ? 1 : -1;
    }
  }
  return { d: Math.sqrt(best), s, side };
}

const WADI_GEOM = segments(WADI);
const ROAD_GEOM = ROADS.map((r) => segments(r.pts));
/** How far from its centre line the wadi shapes the ground: the channel, then the rills that drain into it. */
const NEAR_WADI_M = WADI_WIDTH_M / 2 + 34;
const NEAR_ROAD_M = ROAD_WIDTH_M / 2 + 6;
const inBox = (b: [number, number, number, number], E: number, N: number, m: number) => E > b[0] - m && E < b[2] + m && N > b[1] - m && N < b[3] + m;

// ---------------------------------------------------------------- the wadi's cross-section

/** Depth of the channel below the plain, metres (at the crossing; it varies by about ±0.4 m elsewhere). */
export const WADI_DEPTH_M = 1.8;
/** Half-width of the bed (the banks rise from here to about WADI_WIDTH_M / 2). */
const BED_HALF_M = 3.0;
/** Arc length of the wadi where the planned line crosses it: the reach the walker sees and crosses. */
const S_CROSS = (() => {
  const p = along(WADI_CROSSING_M);
  return nearest(WADI_GEOM.segs, p.E, p.N).s;
})();

/** A small integer hash, 0–1 (deterministic placement of mounds and rills). */
function hash01(a: number, b: number, salt: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(salt, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Rills draining the plain into the wadi, square to it, and the notches they cut into its banks: `axis` is
 * the distance from the nearest rill's axis (metres), `amp` its strength (many reaches have none), `len`
 * how far onto the plain it reaches from the bank top.
 */
function rillAt(s: number, d: number, side: number): { axis: number; amp: number; len: number } {
  const SP = 8.5;
  // The rills wander as they climb away from the channel.
  const g = s / SP + 0.5 * noise(d / 9 + side * 3.1, s / 31 + 2.2);
  const k = Math.round(g);
  const amp = smoothstep(0.35, 0.75, hash01(k, side, 0x71)) * (0.6 + 0.4 * hash01(k, side, 0x72));
  return { axis: Math.abs(g - k) * SP, amp, len: 5 + 15 * hash01(k, side, 0x73) };
}

/**
 * The wadi's cross-section at distance `d` from its centre line on `side`, at arc length `s`. The two banks
 * are independent: each changes height, steepness and distance from the centre along the channel —
 * gentle slopes and short cut faces, bulges and recesses, the notches of rills, slump benches, a crumbling
 * face and a talus of fallen material at its foot. Near the crossing the depth stays WADI_DEPTH_M and the
 * banks moderate (the walker goes down and up them); the scenario's scale and place do not change.
 */
function wadiCut(d: number, s: number, side: number): { depth: number; bed: number; bank: number; foot: number; rill: number } {
  const nearX = 1 - smoothstep(14, 42, Math.abs(s - S_CROSS));
  const so = side * 2.9;
  const rill = rillAt(s, d, side);
  // Steepness: gentle reaches and short cut faces, independent on each bank; moderate at the crossing.
  const steep = smoothstep(-0.3, 0.3, noise(s / 14, 4.4 + so) + 0.35 * noise(s / 5, 2.2 + so));
  // Along the gentle reaches the plain leans into the channel (a shoulder), so the bank stands lower there.
  const shoulder = 0.5 * (1 - steep) * (1 - 0.5 * nearX);
  // Bank top: wanders in and out, recedes where a rill has cut a notch into it.
  const notch = rill.amp * Math.pow(Math.max(0, 1 - rill.axis / 1.9), 1.4);
  const top = WADI_WIDTH_M / 2 + 1.5 * noise(s / 13, 3.7 + so) + 0.6 * noise(s / 3.6, 8.1 + so) + 0.25 * noise(s / 1.1, 4.4 + so) + 1.5 * notch;
  if (d >= top) {
    // A crumbling lip, the shoulder, the first metres of the plain sloping into the channel, and the rills.
    const lip = Math.max(0, 1 - (d - top) / 2.2);
    const sh = shoulder * (1 - smoothstep(0, 8, d - top));
    const out = (d - top) / rill.len;
    const rw = 0.45 + 0.8 * Math.max(0, 1 - out);
    const rc = out < 1 ? rill.amp * (1 - smoothstep(0.45, 1, out)) * (0.06 + 0.3 * Math.max(0, 1 - out)) * Math.pow(Math.max(0, 1 - rill.axis / rw), 1.6) : 0;
    return { depth: 0.12 * lip * lip + sh + rc, bed: 0, bank: lip * 0.55 * (0.5 + 0.5 * steep), foot: 0, rill: rc };
  }
  // (The bed's own runnels and bars, below, add up to ~0.15 m: the crossing is held at WADI_DEPTH_M overall.)
  const floor = WADI_DEPTH_M - 0.15 * nearX + (1 - nearX) * 0.4 * noise(s / 47, 7.7) + 0.1 * noise(s / 6, 5.5);
  const bed = Math.min(top - 2.2, BED_HALF_M + 0.85 * noise(s / 17, 1.3 + so));
  // The bed: braided runnels and bars, meeting the banks without a step.
  if (d <= bed) {
    const q = d / bed;
    return { depth: floor - 0.08 * (1 - q) + 0.1 * noise(s / 3.1, d / 1.6) * (1 - q * q), bed: 1, bank: 0, foot: smoothstep(0.75, 1, q) * 0.5, rill: 0 };
  }
  const t = (d - bed) / (top - bed);
  const k = 1.4 + 3.0 * steep * (1 - 0.45 * nearX) + 0.9 * nearX;
  // A slump bench in some reaches: the lower half of the face pushed out, the upper half cut back.
  const bench = smoothstep(0.15, 0.45, noise(s / 15, 9.9 + so)) * 0.11 * Math.sin(2 * Math.PI * t);
  let z = Math.min(1, Math.max(0, Math.pow(t, k) - bench));
  // Talus: material fallen from the face piles up at its foot, more under steep faces.
  const foot = Math.sin(Math.PI * Math.min(1, t / 0.32));
  const talus = (t < 0.32 ? foot : 0) * (0.06 + 0.16 * steep) * (0.55 + 0.45 * noise(s / 1.7, 6.6 + so));
  // A crumbling face: blocky clods and erosion runnels, irregularly spaced and stronger in some reaches; on the
  // steep faces the ledges of the alluvium's layers, a hand's breadth apart.
  const sw = s + 1.6 * noise(t * 2.5, s / 5 + so);
  const ridge = 1 - Math.abs(noise(sw / 0.9, t * 2.6 + so));
  const runAmp = 0.35 + 0.65 * smoothstep(-0.2, 0.35, noise(s / 9, 6.6 + so));
  const below = z * floor; // metres under the bank top
  const ledges = 0.045 * steep * Math.sin((2 * Math.PI * below) / 0.36 + 2.5 * noise(s / 7, 1.9 + so));
  const face = Math.sin(Math.PI * t) * (0.2 * runAmp * Math.abs(noise(sw / 1.5, t * 2)) + 0.1 * (0.4 + steep) * (ridge * ridge - 0.5) + ledges);
  return {
    // (floor − lip − shoulder) so the face meets the plain's lip and shoulder at the top without a step.
    depth: (floor - 0.12 - shoulder) * (1 - z) + 0.12 + shoulder + face - talus,
    bed: Math.max(0, 1 - t * 4),
    bank: smoothstep(0.08, 0.35, t) * (0.45 + 0.55 * steep),
    foot: t < 0.32 ? foot : 0,
    rill: 0,
  };
}

// ---------------------------------------------------------------- sand mounds

/** Mounds of wind-blown sand caught by scrub (nebkhas): one cell in MOUND_CELL_M squared holds at most one. */
const MOUND_CELL_M = 6.5;
export type Mound = { E: number; N: number; r: number; h: number };
/** Every cell's mound is fixed, and each height sample looks at nine cells: worked out once per cell. */
const MOUNDS = new Map<number, Mound | null>();
/** The mound of a cell, if it has one — none on the roads, in the wadi or on the walker's line. */
export function moundOf(cx: number, cy: number): Mound | null {
  const key = cx * 8192 + cy;
  let m = MOUNDS.get(key);
  if (m === undefined) {
    m = findMound(cx, cy);
    MOUNDS.set(key, m);
  }
  return m;
}
function findMound(cx: number, cy: number): Mound | null {
  const p = hash01(cx, cy, 0x3a);
  const E = (cx + 0.15 + 0.7 * hash01(cx, cy, 0x3b)) * MOUND_CELL_M;
  const N = (cy + 0.15 + 0.7 * hash01(cx, cy, 0x3c)) * MOUND_CELL_M;
  // Scrub (and so sand caught in it) gathers in belts.
  const belt = smoothstep(-0.25, 0.35, fbm(E / 40 - 5, N / 40 + 9, 2));
  if (p > 0.14 + 0.3 * belt) return null;
  const v = (E - START.E) * LEG.rE + (N - START.N) * LEG.rN;
  if (Math.abs(v) < 3) return null;
  for (const g of ROAD_GEOM) if (inBox(g.box, E, N, 9) && nearest(g.segs, E, N).d < ROAD_WIDTH_M / 2 + 3) return null;
  if (inBox(WADI_GEOM.box, E, N, 14) && nearest(WADI_GEOM.segs, E, N).d < WADI_WIDTH_M / 2 + 3.5) return null;
  const size = hash01(cx, cy, 0x3d);
  return { E, N, r: 0.9 + 1.2 * size, h: 0.12 + 0.28 * size };
}

/** Height of the sand mounds at a point: round on the windward side, a long tail downwind. */
function moundsAt(E: number, N: number): number {
  const cx = Math.floor(E / MOUND_CELL_M);
  const cy = Math.floor(N / MOUND_CELL_M);
  let h = 0;
  for (let b = -1; b <= 1; b++)
    for (let a = -1; a <= 1; a++) {
      const m = moundOf(cx + a, cy + b);
      if (!m) continue;
      const dE = E - m.E;
      const dN = N - m.N;
      const al = dE * WE + dN * WN; // downwind is positive
      const cr = dE * WN - dN * WE;
      const q = (al > 0 ? al / 2.6 : al) ** 2 + cr * cr;
      if (q < 9 * m.r * m.r) h = Math.max(h, m.h * Math.exp(-q / (m.r * m.r)));
    }
  return h;
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
  /** The foot of a wadi bank, where fallen stones and soil gather, 0–1 (for the scatter). */
  foot: number;
  /** Sand piled up: the mounds and the filled hollows, 0–1 (for the scatter: few stones show through). */
  sand: number;
};

const S: Surface = { h: 0, ground: 1, stony: 0, bank: 0, drift: 0, road: 0, foot: 0, sand: 0 };
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
  // Swales and low rises, tens of metres across — what the eye reads in the ground's silhouette. Sand has
  // filled the swales, so their bottoms are flatter than the rises are round.
  let swell = 0.42 * fbm(E / 17 + 3.3, N / 17 - 6.1, 3);
  const fill = smoothstep(-0.04, -0.22, swell);
  if (swell < -0.06) swell = -0.06 + (swell + 0.06) * 0.45;
  // Hummocks and micro-relief.
  let fine = swell + 0.14 * fbm(E / 7.5, N / 7.5 + 13, 3) + 0.05 * fbm(E / 1.9, N / 1.9, 2) + 0.025 * fbm(E / 0.7 + 5, N / 0.7, 2);

  // Wind-shaped sand: patches of low drifts stretched along the wind, and the mounds caught by scrub.
  const patch = smoothstep(0.05, 0.45, fbm(E / 46 + 7, N / 46 - 3, 2));
  const a = E * WE + N * WN; // along the wind
  const c = E * WN - N * WE; // across it
  const dune = Math.max(0, fbm(a / 11, c / 3.6, 2) + 0.15);
  fine += patch * 0.32 * dune;
  const mound = moundsAt(E, N);

  // Low rock outcrops: rare, broken, with gravel around them.
  let outcrop = smoothstep(0.42, 0.62, fbm(E / 28 - 11, N / 28 + 5, 2));

  // Gravel lies where the wind has stripped the fines — on the rises; sand in the swales and the mounds.
  const rise = smoothstep(0.06, 0.3, swell);
  let stony = 0.14 + 0.45 * smoothstep(-0.1, 0.45, fbm(E / 15 + 3, N / 15 - 8, 3)) + 0.4 * rise;
  let drift = Math.max(patch * (0.35 + 0.65 * smoothstep(0, 0.4, dune)), 0.85 * fill, smoothstep(0.03, 0.14, mound));
  stony *= 1 - 0.75 * fill;
  let sand = Math.max(fill, smoothstep(0.02, 0.12, mound));
  let bank = 0;
  let road = 0;
  let rut = 0;
  let foot = 0;

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
    sand *= 1 - core;
  }

  const ridged = outcrop > 0 ? 1 - Math.abs(fbm(E / 3.2, N / 3.2, 3)) : 0;
  // Clods and crusts: rounded lumps a hand to a stride across with creases between them, on the bare crust
  // and at the foot of the banks; sand and the roads lie smooth.
  const crust = Math.max(0, 1 - 1.1 * sand - road) * (0.55 + 0.45 * smoothstep(-0.2, 0.3, noise(E / 6 - 2, N / 6 + 7)));
  const clods = crust * (0.075 * Math.abs(noise(E / 0.85 + 11, N / 0.85 - 4)) + 0.05 * Math.abs(noise(E / 1.7 - 3, N / 1.7 + 9)) - 0.05);
  let h = broad + fine + mound + clods + outcrop * (0.35 * ridged * ridged + 0.15) - rut;
  stony = stony + 0.9 * outcrop;

  // The wadi.
  if (inBox(WADI_GEOM.box, E, N, NEAR_WADI_M)) {
    const { d, s, side } = nearest(WADI_GEOM.segs, E, N);
    if (d < NEAR_WADI_M) {
      const cut = wadiCut(d, s, side);
      // Rills and the lip fade out on the walker's line: a path, not a sequence of ditches.
      const v = (E - START.E) * LEG.rE + (N - START.N) * LEG.rN;
      h -= cut.depth - cut.rill * (1 - smoothstep(1.5, 4, Math.abs(v)));
      bank = Math.max(bank, cut.bank);
      foot = cut.foot;
      // The bed: sand in the middle of the flow, gravel bars along it; stones and soil at the foot of the banks;
      // the rills floored with washed gravel.
      const bars = smoothstep(-0.1, 0.35, fbm(s / 7, d / 2.5, 2));
      stony = stony * (1 - cut.bed) + cut.bed * (0.55 + 0.4 * bars) + 0.55 * cut.foot + 1.2 * cut.rill;
      drift = drift * (1 - cut.bed) * (1 - 0.6 * cut.bank) + cut.bed * (0.5 - 0.35 * bars);
      sand *= 1 - Math.max(cut.bed, cut.bank);
    }
  }

  S.h = h;
  S.stony = Math.min(1, stony);
  S.drift = Math.min(1, drift);
  S.bank = Math.min(1, bank);
  S.road = road;
  S.ground = 1;
  S.foot = foot;
  S.sand = Math.min(1, sand);
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
/** Height of each shape at scale 1, metres (the meshes' bounds) — burial is a share of it. */
const ROCK_HEIGHT: Record<RockShape, number> = {
  stone_a: 0.04, stone_b: 0.08, stone_c: 0.05, stone_d: 0.04, stone_e: 0.08,
  rock_a: 0.15, rock_b: 0.08, rock_c: 0.09, rock_d: 0.12, rock07_a: 0.14, boulder_a: 0.54,
};
const STONES = ['stone_a', 'stone_b', 'stone_c', 'stone_d', 'stone_e'] as const;
const ROCKS = ['rock_a', 'rock_b', 'rock_c', 'rock_d', 'rock07_a'] as const;

export type Instance = {
  shape: string;
  /** Scene position of the base. */
  x: number;
  y: number;
  z: number;
  /** Yaw (rad), tilt axis angle and tilt (rad), scale with a squash (height) and a stretch (length against width). */
  yaw: number;
  tiltDir: number;
  tilt: number;
  scale: number;
  squash: number;
  stretch: number;
  /** Brightness of this piece's stone (1 = the scan's own), and a shift to warmer (+) or greyer (−). */
  tone: number;
  warm: number;
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
 * later holds the same ones. Rocks lie in fields of gravel and cobbles a few
 * metres across with quiet sand between them: thick on the rises, the outcrops,
 * the wadi bed and, most of all, at the foot of its banks, where fallen stones
 * gather; few show through the sand of the swales and mounds. Sizes follow a
 * power law (many pebbles, few large stones), each piece with its own
 * proportions, colour and depth of burial. Bushes stand on the sand mounds they
 * have caught and along the wadi; none on the roads or in the walker's way.
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

  /** `burial`: share of the piece's height under the ground (sand buries deeper). */
  const place = (shape: string, u: number, v: number, scale: number, height: number, burial: number, list: Instance[], tiltMax: number) => {
    const p = legToEN(u, v);
    const s = surfaceAt(p.E, p.N);
    const h = s.h;
    const sand = s.sand;
    // Local slope for the tilt: rocks settle into it (forward differences: thousands of pieces per chunk).
    const e = 0.3;
    const hx = (heightAt(p.E + e, p.N) - h) / e;
    const hn = (heightAt(p.E, p.N + e) - h) / e;
    const [x, , z] = toScene(p.E, p.N, 0);
    const squash = 0.7 + rnd() * 0.5;
    list.push({
      shape,
      x,
      y: h - Math.min(0.75, burial + 0.3 * sand) * height * scale * squash,
      z,
      yaw: rnd() * Math.PI * 2,
      tiltDir: Math.atan2(-hn, hx),
      tilt: Math.min(tiltMax, Math.atan(Math.hypot(hx, hn))) * 0.8 + (rnd() - 0.5) * 0.3,
      scale,
      squash,
      stretch: 0.78 + rnd() * 0.5,
      // Most stones a little darker than the scan, a few weathered light; warmer or greyer by piece.
      tone: 0.58 + 0.4 * rnd() + (rnd() < 0.08 ? 0.15 : 0),
      warm: rnd() * 2 - 1,
    });
    return { x, z };
  };

  // Jittered cells.
  const cells = (size: number, fn: (u: number, v: number) => void) => {
    for (let b = 0; b < CHUNK_M / size; b++) for (let a = 0; a < CHUNK_M / size; a++) fn(u0 + (a + rnd()) * size, v0 + (b + rnd()) * size);
  };
  /** Fields of stones a few metres across, and quiet ground between them (0–1). */
  const field = (E: number, N: number) => smoothstep(-0.18, 0.42, fbm(E / 9 + 31, N / 9 - 17, 3));

  // Rocks: alone or with a few smaller ones beside them; boulders on the banks, at their foot and on the outcrops.
  cells(3.4, (u, v) => {
    if (Math.abs(v) < PATH_CLEAR_M + 0.6) return;
    const p = legToEN(u, v);
    const s = surfaceAt(p.E, p.N);
    const f = field(p.E, p.N);
    const want = (0.08 + 0.65 * s.stony + 0.12 * s.bank + 0.9 * s.foot) * (0.3 + 1.0 * f) - 0.8 * s.road - 0.55 * s.sand;
    if (rnd() > want) return;
    const boulder = rnd() < 0.03 + 0.1 * s.bank + 0.12 * s.foot;
    const shape: RockShape = boulder ? 'boulder_a' : ROCKS[Math.floor(rnd() * ROCKS.length)];
    const scale = boulder ? 0.3 + 0.8 * rnd() ** 1.5 : 0.9 + 3.6 * rnd() ** 2.4;
    // The whole piece, not only its centre, keeps off the walker's line.
    if (Math.abs(v) < PATH_CLEAR_M + 0.6 + ROCK_RADIUS[shape] * scale * 1.3) return;
    const at = place(shape, u, v, scale, ROCK_HEIGHT[shape], 0.08 + 0.4 * rnd() ** 1.4, rocks, 0.5);
    occluders.push({ x: at.x, z: at.z, r: ROCK_RADIUS[shape] * scale });
    // Satellites: pieces broken off it, or smaller stones caught against it.
    const k = rnd() < 0.55 ? 1 + Math.floor(rnd() * 3) : 0;
    for (let c = 0; c < k; c++) {
      const a = rnd() * Math.PI * 2;
      const r = ROCK_RADIUS[shape] * scale * (1.1 + 1.6 * rnd());
      const du = Math.cos(a) * r;
      const dv = Math.sin(a) * r;
      const sh: RockShape = ROCKS[Math.floor(rnd() * ROCKS.length)];
      const sc = Math.max(0.8, scale * (0.25 + 0.35 * rnd()));
      if (Math.abs(v + dv) < PATH_CLEAR_M + 0.6 + ROCK_RADIUS[sh] * sc * 1.3) continue;
      place(sh, u + du, v + dv, sc, ROCK_HEIGHT[sh], 0.15 + 0.35 * rnd(), rocks, 0.5);
    }
  });

  // Small stones, in fields, only where the eye can see them — denser close to the walk.
  if (near) {
    cells(fine ? 0.75 : 1.9, (u, v) => {
      if (Math.abs(v) < 0.5) return;
      const p = legToEN(u, v);
      const s = surfaceAt(p.E, p.N);
      const f = field(p.E, p.N);
      const want = (0.18 + 0.85 * s.stony + 0.12 * s.bank + 0.9 * s.foot) * (0.3 + 1.0 * f) - 0.9 * s.road - 0.6 * s.sand;
      if (rnd() > want) return;
      const k = 1 + Math.floor(rnd() * (2 + 4 * f));
      for (let c = 0; c < k; c++) {
        const shape: RockShape = STONES[Math.floor(rnd() * STONES.length)];
        const scale = 0.6 + 3.4 * rnd() ** 2.2;
        const du = (rnd() - 0.5) * 1.1;
        const dv = (rnd() - 0.5) * 1.1;
        if (Math.abs(v + dv) < 0.5 + ROCK_RADIUS[shape] * scale) continue;
        const at = place(shape, u + du, v + dv, scale, ROCK_HEIGHT[shape], 0.05 + 0.4 * rnd(), rocks, 0.6);
        if (scale > 1.4) occluders.push({ x: at.x, z: at.z, r: ROCK_RADIUS[shape] * scale });
      }
    });
  }

  // Dry bushes: on the sand mounds they caught (the chunk holding a mound's centre places its bush) …
  const corners = [legToEN(u0, v0), legToEN(u0 + CHUNK_M, v0), legToEN(u0, v0 + CHUNK_M), legToEN(u0 + CHUNK_M, v0 + CHUNK_M)];
  const cx0 = Math.floor(Math.min(...corners.map((c) => c.E)) / MOUND_CELL_M);
  const cx1 = Math.floor(Math.max(...corners.map((c) => c.E)) / MOUND_CELL_M);
  const cy0 = Math.floor(Math.min(...corners.map((c) => c.N)) / MOUND_CELL_M);
  const cy1 = Math.floor(Math.max(...corners.map((c) => c.N)) / MOUND_CELL_M);
  const shrubShape = (r: number): ShrubShape => (r < 0.15 ? 'shrub_b' : r < 0.4 ? 'shrub_c' : r < 0.72 ? 'shrub_d' : 'shrub_e');
  for (let cy = cy0; cy <= cy1; cy++)
    for (let cx = cx0; cx <= cx1; cx++) {
      const m = moundOf(cx, cy);
      if (!m) continue;
      const u = (m.E - START.E) * LEG.aE + (m.N - START.N) * LEG.aN;
      const v = (m.E - START.E) * LEG.rE + (m.N - START.N) * LEG.rN;
      if (u < u0 || u >= u0 + CHUNK_M || v < v0 || v >= v0 + CHUNK_M) continue;
      if (hash01(cx, cy, 0x3e) > 0.85) continue;
      place(shrubShape(hash01(cx, cy, 0x3f)), u, v, 0.8 + 1.5 * (m.h - 0.12) + 0.3 * rnd(), 0.5, 0.1, shrubs, 0.15);
    }
  // … and where water runs: along the wadi's banks and bed.
  cells(6, (u, v) => {
    if (Math.abs(v) < PATH_CLEAR_M + 0.8) return;
    const p = legToEN(u, v);
    const s = surfaceAt(p.E, p.N);
    const want = 0.06 + 0.55 * s.bank + 0.35 * s.foot + 0.1 * s.drift - 0.9 * s.road;
    if (rnd() > want) return;
    place(shrubShape(rnd()), u, v, 0.7 + rnd() * 0.7, 0.5, 0.08, shrubs, 0.15);
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
  const sxx = t.scale * t.stretch;
  const szz = t.scale / t.stretch;
  const syy = t.scale * t.squash;
  out[offset] = r00 * sxx;
  out[offset + 1] = r10 * sxx;
  out[offset + 2] = r20 * sxx;
  out[offset + 3] = 0;
  out[offset + 4] = r01 * syy;
  out[offset + 5] = r11 * syy;
  out[offset + 6] = r21 * syy;
  out[offset + 7] = 0;
  out[offset + 8] = r02 * szz;
  out[offset + 9] = r12 * szz;
  out[offset + 10] = r22 * szz;
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
