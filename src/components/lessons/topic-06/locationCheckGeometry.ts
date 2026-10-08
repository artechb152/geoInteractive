/**
 * Pure measurement and coordinate contracts for the location-check activity.
 * No three.js and no React — the map, the 3D observation, the evaluation and
 * scripts/qa/location-check.test.mjs all share these functions.
 *
 * Internal values are never rounded; format* helpers round for display only.
 */
import { GROVE_BASE_POLYGON, HEIGHT_DATUM_M, WORLD_BOUNDS, type Point, type XY } from './locationCheckScenario';

const DEG = 180 / Math.PI;

// ---------------------------------------------------------------- measurements

/** Horizontal distance in the map plane, metres. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.E - a.E, b.N - a.N);
}

/** Wraps any angle into [0, 360). */
export function normalizeDegrees(deg: number): number {
  const r = deg % 360;
  const n = r < 0 ? r + 360 : r;
  // -1e-14 % 360 + 360 rounds to exactly 360 in floating point.
  return n >= 360 ? 0 : n;
}

/**
 * Grid bearing from a to b: degrees clockwise from local grid north, in
 * [0, 360). Undefined (null) between coincident points — never a silent 0°.
 */
export function bearing(a: Point, b: Point): number | null {
  const dE = b.E - a.E;
  const dN = b.N - a.N;
  if (dE === 0 && dN === 0) return null;
  return normalizeDegrees(Math.atan2(dE, dN) * DEG);
}

/** Shortest angular difference, in [0, 180] — 359° vs 1° is 2°. */
export function angularDifference(a: number, b: number): number {
  const d = normalizeDegrees(a - b);
  return d > 180 ? 360 - d : d;
}

/** Signed shortest turn from `from` to `to`, in (-180, 180] — positive is clockwise. */
export function signedTurn(from: number, to: number): number {
  const d = normalizeDegrees(to - from);
  return d > 180 ? d - 360 : d;
}

/** Point at a bearing and distance from `from`. */
export function destination(from: Point, bearingDeg: number, distanceM: number): Point {
  const r = bearingDeg / DEG;
  return { E: from.E + Math.sin(r) * distanceM, N: from.N + Math.cos(r) * distanceM };
}

// ---------------------------------------------------------------- map sheet
// The printed map, north up. 1 viewBox unit = 1 m, so the neatline is
// 1400 × 1050 units (4:3); collar and legend lie outside it.

export const MAP_SHEET = { width: WORLD_BOUNDS.maxE - WORLD_BOUNDS.minE, height: WORLD_BOUNDS.maxN - WORLD_BOUNDS.minN } as const;

/** xMap = (E/1400)·mapWidth, yMap = ((1050−N)/1050)·mapHeight. */
export function worldToMap(p: Point, mapWidth: number = MAP_SHEET.width, mapHeight: number = MAP_SHEET.height): { x: number; y: number } {
  return {
    x: ((p.E - WORLD_BOUNDS.minE) / MAP_SHEET.width) * mapWidth,
    y: ((WORLD_BOUNDS.maxN - p.N) / MAP_SHEET.height) * mapHeight,
  };
}

export function mapToWorld(x: number, y: number, mapWidth: number = MAP_SHEET.width, mapHeight: number = MAP_SHEET.height): Point {
  return {
    E: WORLD_BOUNDS.minE + (x / mapWidth) * MAP_SHEET.width,
    N: WORLD_BOUNDS.maxN - (y / mapHeight) * MAP_SHEET.height,
  };
}

/** Map length (in mapWidth units) of a ground distance — the scale bar uses this. */
export function metresToMap(m: number, mapWidth: number = MAP_SHEET.width): number {
  return (m / MAP_SHEET.width) * mapWidth;
}

// ---------------------------------------------------------------- 3D world
// three.js: x east, y up, z SOUTH (north is −z), 350 m per world unit, no
// vertical exaggeration in this activity.

export const WORLD3D = {
  metresPerUnit: 350,
  originE: 700,
  originN: 525,
  datumM: HEIGHT_DATUM_M,
  verticalExaggeration: 1,
} as const;

export function toWorld3(E: number, N: number, heightM: number): [number, number, number] {
  const s = WORLD3D.metresPerUnit;
  return [(E - WORLD3D.originE) / s, ((heightM - WORLD3D.datumM) * WORLD3D.verticalExaggeration) / s, (WORLD3D.originN - N) / s];
}

export function fromWorld3(x: number, y: number, z: number): { E: number; N: number; heightM: number } {
  const s = WORLD3D.metresPerUnit;
  return { E: x * s + WORLD3D.originE, N: WORLD3D.originN - z * s, heightM: (y * s) / WORLD3D.verticalExaggeration + WORLD3D.datumM };
}

/** World-space unit vector of a view yaw (0 = north = −z, positive clockwise) and pitch (positive up). */
export function viewDirection(yawDeg: number, pitchDeg = 0): [number, number, number] {
  const y = yawDeg / DEG;
  const p = pitchDeg / DEG;
  return [Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)];
}

/** Grid bearing of a horizontal world-space direction; null for a vertical one. */
export function bearingOfWorldDirection(dx: number, dz: number): number | null {
  if (dx === 0 && dz === 0) return null;
  return normalizeDegrees(Math.atan2(dx, -dz) * DEG);
}

/** Vertical FOV for a horizontal FOV at a frame aspect (width / height). */
export function verticalFov(hfovDeg: number, aspect: number): number {
  return 2 * Math.atan(Math.tan(hfovDeg / 2 / DEG) / aspect) * DEG;
}

export type Look = { readonly yawDeg: number; readonly pitchDeg: number; readonly hfovDeg: number };
export type EyePoint = { readonly E: number; readonly N: number; readonly heightM: number };

/**
 * Camera basis of the observation — the same one three.js gets from
 * rotation (pitch, −yaw, 0, 'YXZ'): forward, right and up in world axes
 * (x east, y up, z south).
 */
function basis(look: Look) {
  const f = viewDirection(look.yawDeg, look.pitchDeg);
  const y = look.yawDeg / DEG;
  const r: [number, number, number] = [Math.cos(y), 0, Math.sin(y)];
  const u: [number, number, number] = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return { f, r, u };
}

/**
 * Where a point appears in the observation frame: x, y in 0–1 from the
 * frame's top-left, and whether it is in front of the eye. Pure pinhole maths
 * shared by the DOM labels over the live canvas and by the static fallback.
 */
export function projectToView(look: Look, aspect: number, eye: EyePoint, p: EyePoint): { x: number; y: number; inFront: boolean } {
  const { f, r, u } = basis(look);
  const d = [p.E - eye.E, p.heightM - eye.heightM, -(p.N - eye.N)];
  const xc = d[0] * r[0] + d[1] * r[1] + d[2] * r[2];
  const yc = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
  const zc = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  const tx = Math.tan(look.hfovDeg / 2 / DEG);
  const ty = Math.tan(verticalFov(look.hfovDeg, aspect) / 2 / DEG);
  return { x: (xc / zc / tx + 1) / 2, y: (1 - yc / zc / ty) / 2, inFront: zc > 0 };
}

/** Screen-x (0–1) of a horizontal bearing in the frame, or null when it is behind the eye. */
export function bearingToViewX(look: Look, bearingDeg: number): number | null {
  const { f, r } = basis(look);
  const d = viewDirection(bearingDeg, 0);
  const xc = d[0] * r[0] + d[2] * r[2];
  const zc = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  if (zc <= 1e-6) return null;
  // A horizontal direction seen with a pitched camera: project its horizon point.
  return (xc / zc / Math.tan(look.hfovDeg / 2 / DEG) + 1) / 2;
}

// ---------------------------------------------------------------- shapes

export function grovePolygon(center: Point): Point[] {
  return GROVE_BASE_POLYGON.map(([dE, dN]) => ({ E: center.E + dE, N: center.N + dN }));
}

export function pointInPolygon(p: Point, ring: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.N > p.N !== b.N > p.N && p.E < ((b.E - a.E) * (p.N - a.N)) / (b.N - a.N) + a.E) inside = !inside;
  }
  return inside;
}

/** Distance from p to a polyline (open) or ring (closed). */
export function distanceToPolyline(p: Point, pts: readonly Point[] | readonly XY[], closed = false): number {
  const P = pts.map((q) => (Array.isArray(q) ? { E: (q as XY)[0], N: (q as XY)[1] } : (q as Point)));
  let best = Infinity;
  const n = closed ? P.length : P.length - 1;
  for (let i = 0; i < n; i++) {
    const a = P[i];
    const b = P[(i + 1) % P.length];
    const dE = b.E - a.E;
    const dN = b.N - a.N;
    const len2 = dE * dE + dN * dN;
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.E - a.E) * dE + (p.N - a.N) * dN) / len2));
    best = Math.min(best, Math.hypot(p.E - (a.E + t * dE), p.N - (a.N + t * dN)));
  }
  return best;
}

export function polygonArea(ring: readonly Point[]): number {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j].E + ring[i].E) * (ring[j].N - ring[i].N);
  return Math.abs(s) / 2;
}

export function polygonCentroid(ring: readonly Point[]): Point {
  let a = 0;
  let cE = 0;
  let cN = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j].E * ring[i].N - ring[i].E * ring[j].N;
    a += cross;
    cE += (ring[j].E + ring[i].E) * cross;
    cN += (ring[j].N + ring[i].N) * cross;
  }
  return { E: cE / (3 * a), N: cN / (3 * a) };
}

// ---------------------------------------------------------------- display

/** "043°" — three digits, display rounding only. */
export function formatBearing(deg: number): string {
  const r = Math.round(normalizeDegrees(deg)) % 360;
  return `${String(r).padStart(3, '0')}°`;
}

export function formatMetres(m: number): string {
  return `${Math.round(m)} מ׳`;
}
