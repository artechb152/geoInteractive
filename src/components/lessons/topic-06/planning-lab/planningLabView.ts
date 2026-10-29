/**
 * Coordinate frames of the planning lab — the one place where the map and the
 * model turn ground metres into drawing units. No three.js, no React.
 *
 *   map  north up, 1 viewBox unit = 1 m: x = E, y = maxN − N (never mirrored for RTL).
 *   3D   x = E, y = height, z = −N about a local origin, one uniform scale
 *        (100 m per world unit), no vertical exaggeration.
 */
import { WORLD, type Point } from './planningLabWorld';

export const MAP_SHEET = { width: WORLD.maxE - WORLD.minE, height: WORLD.maxN - WORLD.minN } as const;

export function worldToMap(p: Point): { x: number; y: number } {
  return { x: p.E - WORLD.minE, y: WORLD.maxN - p.N };
}

export function mapToWorld(x: number, y: number): Point {
  return { E: WORLD.minE + x, N: WORLD.maxN - y };
}

export const WORLD3D = { metresPerUnit: 100, originE: 500, originN: 600, datumM: 350, verticalExaggeration: 1 } as const;

/** three.js position of a ground point: x east, y up, z south (north is −z). */
export function toWorld3(E: number, N: number, heightM: number): [number, number, number] {
  const s = WORLD3D.metresPerUnit;
  return [(E - WORLD3D.originE) / s, ((heightM - WORLD3D.datumM) * WORLD3D.verticalExaggeration) / s, (WORLD3D.originN - N) / s];
}

export function fromWorld3(x: number, y: number, z: number): { E: number; N: number; heightM: number } {
  const s = WORLD3D.metresPerUnit;
  return { E: x * s + WORLD3D.originE, N: WORLD3D.originN - z * s, heightM: (y * s) / WORLD3D.verticalExaggeration + WORLD3D.datumM };
}
