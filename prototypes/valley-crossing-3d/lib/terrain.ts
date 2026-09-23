// Procedural terrain field. Every object in the scene is placed using getHeight /
// onTerrain / onSurface so the world stays perfectly consistent.

import type { Vec2, Vec3 } from "./types";

export const WORLD = {
  size: 240,
  half: 120,
  segments: 256,
};

/** Water surface elevation. The river only appears where terrain is carved below this. */
export const RIVER_LEVEL = 1.2;

/** Bridge geometry, shared by the Bridge mesh and the road/route surface logic. */
export const BRIDGE = {
  x: 12,
  z: 0,
  spanX: 14,
  halfZ: 4.2,
  deckY: 4.9,
};

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// --- Deterministic value noise (no external assets) ---

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const n00 = hash2(xi, zi);
  const n10 = hash2(xi + 1, zi);
  const n01 = hash2(xi, zi + 1);
  const n11 = hash2(xi + 1, zi + 1);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

function fbm(x: number, z: number): number {
  let total = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < 4; i++) {
    total += valueNoise(x * freq, z * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / max;
}

function gaussian(
  x: number,
  z: number,
  cx: number,
  cz: number,
  sx: number,
  sz: number
): number {
  const dx = (x - cx) / sx;
  const dz = (z - cz) / sz;
  return Math.exp(-(dx * dx + dz * dz));
}

/** Winding river centerline x-position as a function of z. */
export function riverCenterX(z: number): number {
  return 12 + 10 * Math.sin(z * 0.02) + 4 * Math.sin(z * 0.07);
}

const RIVER_HALF_WIDTH = 9;

/** Core terrain elevation at a planar position. */
export function getHeight(x: number, z: number): number {
  let h = 6 + fbm(x * 0.012 + 11, z * 0.012 + 7) * 4;

  // Western observation hill (dominant friendly high ground)
  h += 31 * gaussian(x, z, -72, -6, 30, 34);
  // Western shoulder
  h += 9 * gaussian(x, z, -52, 26, 22, 20);
  // Eastern ridge (enemy overwatch), elongated along z
  h += 28 * gaussian(x, z, 74, 0, 16, 72);
  // Eastern ridge sharp dominant crest (makes the ridge read as a threatening wall)
  h += 9 * gaussian(x, z, 80, 0, 7, 66);
  // Eastern ridge spur
  h += 11 * gaussian(x, z, 60, -42, 18, 30);
  // Northern + southern framing high ground
  h += 13 * gaussian(x, z, 0, -100, 150, 32);
  h += 13 * gaussian(x, z, 0, 100, 150, 32);
  // Central valley depression (wide + open)
  h -= 4.2 * gaussian(x, z, 6, 0, 66, 44);
  // Mid-frequency detail
  h += (fbm(x * 0.05, z * 0.05) - 0.5) * 2.5;
  // Fine sculpting detail (visual roughness; small amplitude keeps placement stable)
  h += (fbm(x * 0.14 + 4, z * 0.14 + 9) - 0.5) * 0.9;

  // Village shelf — flatten a plateau near the objective
  const vd = Math.hypot(x - 58, z - 8);
  if (vd < 22) {
    const blend = smoothstep(22, 7, vd) * 0.82;
    h = h * (1 - blend) + 5 * blend;
  }

  // Carve the river channel
  const d = Math.abs(x - riverCenterX(z));
  if (d < RIVER_HALF_WIDTH) {
    const t = 1 - d / RIVER_HALF_WIDTH;
    const carve = smoothstep(0, 1, t) * 7;
    h -= carve;
    h = Math.max(h, RIVER_LEVEL - 1.4);
  }

  return h;
}

/** True when a planar point sits on the bridge deck footprint. */
export function onBridge(x: number, z: number): boolean {
  return (
    Math.abs(x - BRIDGE.x) < BRIDGE.spanX && Math.abs(z - BRIDGE.z) < BRIDGE.halfZ
  );
}

/** Walkable surface height: the bridge deck overrides the terrain over the river. */
export function surfaceHeight(x: number, z: number): number {
  if (onBridge(x, z)) {
    const edge = smoothstep(BRIDGE.spanX, BRIDGE.spanX - 4, Math.abs(x - BRIDGE.x));
    return lerp(getHeight(x, z), BRIDGE.deckY, edge);
  }
  return getHeight(x, z);
}

/** Approximate terrain slope magnitude (for vegetation/rock placement). */
export function slopeAt(x: number, z: number): number {
  const e = 1.5;
  const hx = getHeight(x + e, z) - getHeight(x - e, z);
  const hz = getHeight(x, z + e) - getHeight(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

/** Lift a planar point onto the terrain with an optional vertical offset. */
export function onTerrain(x: number, z: number, offset = 0): Vec3 {
  return [x, getHeight(x, z) + offset, z];
}

/** Lift a planar point onto the walkable surface (terrain or bridge deck). */
export function onSurface(x: number, z: number, offset = 0): Vec3 {
  return [x, surfaceHeight(x, z) + offset, z];
}

/** Shortest distance from a planar point to a polyline (e.g. the road). */
export function distToPolyline(x: number, z: number, pts: Vec2[]): number {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = clamp(t, 0, 1);
    const px = ax + dx * t;
    const pz = az + dz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < min) min = dist;
  }
  return min;
}

/** Resample a planar polyline into evenly-spaced points lifted onto the surface. */
export function sampleSurfacePath(
  pts: Vec2[],
  spacing: number,
  offset = 0
): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.round(segLen / spacing));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      out.push(onSurface(x, z, offset));
    }
  }
  const last = pts[pts.length - 1];
  out.push(onSurface(last[0], last[1], offset));
  return out;
}
