/**
 * The ground mesh of the "בשטח" model (ReliefCover3D), from the same height functions as the map
 * (reliefCoverCompare.data): a 2 m grid over the sheet, widening outward to an apron that runs on to
 * the hazy horizon. Two poses share one index — the hill (states 1–3) and the quarried hill
 * (state 4) — and the model morphs between them only where they differ.
 * World axes (metres): X east, Y up (0 = 100 m, heights × VEX), Z south — seen from the south,
 * north is up the screen, as on the map. Never mirrored for RTL.
 * Pure TS, no three.js: scripts/qa/relief-cover-compare.test.mjs checks it against the map.
 */
import { HILL, QUARRIED, SHEET, quarryMask, quarryRock } from './reliefCoverCompare.data';

export const DATUM = 100; // the height at world Y = 0
export const CENTER = { x: SHEET.w / 2, y: SHEET.h / 2 } as const;
/** Vertical exaggeration of the model's ground (the map keeps true heights): at true scale a 75 m hill
 *  on a 480 m sheet reads almost flat from the model's oblique view. Objects keep their own true size. */
export const VEX = 1.6;
/** Sheet point (x east, y south) at ground height h, plus `lift` true metres above it, in world units. */
export const toWorld = (x: number, y: number, h: number, lift = 0): [number, number, number] => [x - CENTER.x, (h - DATUM) * VEX + lift, y - CENTER.y];

const FINE = 2; // grid step over the sheet and a margin around it (m)
const MARGIN = 24;
export const APRON = 2600; // how far the ground runs past the sheet (m)

/** The model's look is three straight-down Cycles renders draped on this mesh
 *  (scripts/blender/render_relief_cover_model.py): the whole ground to the horizon, a ring around
 *  the sheet, and the sheet itself — the only one that differs per state. Sheet-plan metres
 *  (x east, y south) and metres per pixel; each later one is drawn over the one before. */
export type DrapeRegion = { x0: number; x1: number; y0: number; y1: number; px: number };
export const DRAPE = {
  outer: { x0: -APRON - 40, x1: SHEET.w + APRON + 40, y0: -APRON - 40, y1: SHEET.h + APRON + 40, px: 4 },
  mid: { x0: -200, x1: 680, y0: -180, y1: 500, px: 0.5 },
  sheet: { x0: -20, x1: 500, y0: -20, y1: 340, px: 0.25 },
} as const satisfies Record<string, DrapeRegion>;
/** How far inside its edge a region fades in over the one beneath it (m). */
export const DRAPE_FEATHER = { mid: 40, sheet: 8 } as const;

/** Grid lines along one axis: every 2 m across the sheet, then steps growing by 18 % out to the apron. */
function axis(len: number): number[] {
  const inner: number[] = [];
  for (let v = -MARGIN; v <= len + MARGIN + 1e-9; v += FINE) inner.push(v);
  const outer: number[] = [];
  let step = FINE;
  for (let d = MARGIN; d < APRON; ) {
    step *= 1.18;
    d += step;
    outer.push(d);
  }
  return [...outer.map((d) => -d).reverse(), ...inner, ...outer.map((d) => len + d)];
}

export type GroundMesh = {
  nx: number;
  ny: number;
  index: Uint32Array;
  /** XYZ per vertex, hill and quarried hill */
  pose: [Float32Array, Float32Array];
  /** 0…1 per vertex: how much of the quarry's fresh-rock look it takes, per pose */
  rock: [Float32Array, Float32Array];
  /** low-frequency tone variation of the bare earth, 0…1 */
  tone: Float32Array;
  /** vertices whose height or rock differs between the poses (the morph touches only these) */
  morph: Uint32Array;
  /** sheet-plan coordinates (x east, y south) per vertex */
  plan: Float32Array;
};

let cache: GroundMesh | null = null;

export function groundMesh(): GroundMesh {
  if (cache) return cache;
  const xs = axis(SHEET.w);
  const ys = axis(SHEET.h);
  const nx = xs.length;
  const ny = ys.length;
  const n = nx * ny;
  const p0 = new Float32Array(n * 3);
  const p1 = new Float32Array(n * 3);
  const r0 = new Float32Array(n);
  const r1 = new Float32Array(n);
  const tone = new Float32Array(n);
  const plan = new Float32Array(n * 2);
  const morph: number[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const x = xs[i];
      const y = ys[j];
      const h0 = HILL(x, y);
      const inCut = quarryMask(x, y) > 0;
      const h1 = inCut ? QUARRIED(x, y) : h0;
      const w0 = toWorld(x, y, h0);
      p0.set(w0, k * 3);
      p1.set(inCut ? toWorld(x, y, h1) : w0, k * 3);
      r1[k] = inCut ? quarryRock(x, y) : 0;
      tone[k] = 0.5 + 0.28 * Math.sin(0.021 * x + 0.017 * y + 0.4) + 0.22 * Math.sin(-0.013 * x + 0.029 * y + 2.2);
      plan[k * 2] = x;
      plan[k * 2 + 1] = y;
      if (inCut && (h1 !== h0 || r1[k] > 0)) morph.push(k);
    }
  }
  const index = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let t = 0;
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      // two triangles per cell, wound counter-clockwise seen from above (+Y)
      index.set([a, c, b, b, c, d], t);
      t += 6;
    }
  }
  cache = { nx, ny, index, pose: [p0, p1], rock: [r0, r1], tone, morph: Uint32Array.from(morph), plan };
  return cache;
}
