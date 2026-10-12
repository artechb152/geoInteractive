/**
 * Pure measurement and coordinate contracts for the terrain-association
 * activity. No three.js and no React — the map, the 3D model, the practice
 * evaluation and scripts/qa/terrain-nav.test.mjs share these functions.
 *
 *   measurements  horizontal, in the map plane, in metres:
 *                 distance = hypot(ΔE, ΔN)
 *                 bearing  = normalizeDegrees(atan2(ΔE, ΔN) · 180/π) — clockwise from grid north
 *                 (the lesson's shared functions, re-exported).
 *   map           north up, 1 viewBox unit = 1 m: x = E − 0, y = 1750 − N.
 *   3D            x = E, y = height, z = −N about a local origin, one uniform
 *                 scale (100 m per world unit), no vertical exaggeration.
 *
 * Internal values are never rounded; the format helpers round for display only.
 */
import { WORLD_BOUNDS, type Point } from './terrainNavScenario';
import { normalizeDegrees } from '../locationCheckGeometry';

export {
  angularDifference,
  bearing,
  destination,
  distance,
  formatBearing,
  normalizeDegrees,
  signedTurn,
} from '../locationCheckGeometry';

const DEG = 180 / Math.PI;

// ---------------------------------------------------------------- map sheet

export const MAP_SHEET = { width: WORLD_BOUNDS.maxE - WORLD_BOUNDS.minE, height: WORLD_BOUNDS.maxN - WORLD_BOUNDS.minN } as const;

/** Map position of a ground point (viewBox units = metres; y grows southward). */
export function worldToMap(p: Point): { x: number; y: number } {
  return { x: p.E - WORLD_BOUNDS.minE, y: WORLD_BOUNDS.maxN - p.N };
}

export function mapToWorld(x: number, y: number): Point {
  return { E: WORLD_BOUNDS.minE + x, N: WORLD_BOUNDS.maxN - y };
}

// ---------------------------------------------------------------- 3D world

export const WORLD3D = {
  metresPerUnit: 100,
  originE: 700,
  originN: 875,
  datumM: 350,
  verticalExaggeration: 1,
} as const;

/** three.js position of a ground point: x east, y up, z south (north is −z). */
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

// ---------------------------------------------------------------- directions in words

export type CompassPoint = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
const POINTS: readonly CompassPoint[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** The 8-wind sector of a bearing (each 45° wide, centred on its direction). */
export function compassPoint(bearingDeg: number): CompassPoint {
  return POINTS[Math.round(normalizeDegrees(bearingDeg) / 45) % 8];
}

/** Hebrew name of a compass point, as used in the activity's text. */
export const COMPASS_HE: Record<CompassPoint, string> = {
  N: 'צפון',
  NE: 'צפון־מזרח',
  E: 'מזרח',
  SE: 'דרום־מזרח',
  S: 'דרום',
  SW: 'דרום־מערב',
  W: 'מערב',
  NW: 'צפון־מערב',
};

/** "420 מ׳" — whole metres, display rounding only. */
export function formatMetres(m: number): string {
  return `${Math.round(m)} מ׳`;
}
