/**
 * Datum field challenge — the one projection from the coordinate plane to the
 * picture (pure, no React). A single fixed camera rendered the terrain
 * (scripts/blender/render_datum_field.py); its matrix and the ground heights
 * along each landmark's path are in datumFieldTerrain.data.ts.
 *
 *   datum-A metres (e, n) → world x, y (eC, nC, mPerUnit) + the ground's z
 *   → camera → a point in the picture box, as fractions (0–1) of its width
 *   and height.
 *
 * Every overlay point (the requested location, the displayed location, the
 * line between them, north) goes through project(), and the picture keeps the
 * render's 25:14 box, so the overlay and the picture can only scale and move
 * together. Distances are never measured here — the gap is metres of the plane
 * (datumField.ts), not pixels.
 *
 * Unit-tested in scripts/qa/datum-field-challenge.test.mjs.
 */
import { DATUM_FIELD_TERRAIN as T } from './datumFieldTerrain.data';
import type { EN, LandmarkId } from './datumField.data';
import { displayedAt, requestedAt } from './datumField';

/** A point in the picture box: fractions of its width (x) and height (y), origin top-left. */
export type Pt = { x: number; y: number };

/** The render's proportions (25:14); the picture box always keeps them. */
export const TERRAIN_ASPECT = T.image.w / T.image.h;

/** A ground position (datum-A metres) at world height z → its place in the picture. */
export function project(p: EN, z: number): Pt {
  const m = T.camera;
  const x = (p.e - T.eC) / T.mPerUnit;
  const y = (p.n - T.nC) / T.mPerUnit;
  const cx = m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3];
  const cy = m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3];
  const cw = m[3][0] * x + m[3][1] * y + m[3][2] * z + m[3][3];
  return { x: (cx / cw + 1) / 2, y: (1 - cy / cw) / 2 };
}

/** World height of the ground (or the bridge deck) at t along a landmark's path (0 = displayed, 1 = requested). */
export function pathZ(id: LandmarkId, t: number): number {
  const z = T.paths[id].z;
  const f = Math.min(1, Math.max(0, t)) * (z.length - 1);
  const i = Math.min(z.length - 2, Math.floor(f));
  const u = f - i;
  return z[i] * (1 - u) + z[i + 1] * u;
}

/** The displayed location at t, in the picture. */
export const displayedPx = (id: LandmarkId, t: number): Pt => project(displayedAt(id, t), pathZ(id, t));

/** The requested location (the landmark), in the picture. */
export const requestedPx = (id: LandmarkId): Pt => project(requestedAt(id), pathZ(id, 1));

/** The line from the displayed location at t to the requested one, draped on the ground. */
export function gapLine(id: LandmarkId, t: number): Pt[] {
  const z = T.paths[id].z;
  const n = z.length - 1;
  const pts: Pt[] = [displayedPx(id, t)];
  for (let i = Math.floor(t * n) + 1; i <= n; i++) pts.push(project(displayedAt(id, i / n), z[i]));
  return pts;
}

/** Which way north points in the picture at a landmark: a unit vector in screen units (y down). */
export function northAt(id: LandmarkId): Pt {
  const p = requestedAt(id);
  const z = pathZ(id, 1);
  const a = project(p, z);
  const b = project({ e: p.e, n: p.n + 50 }, z);
  const dx = (b.x - a.x) * TERRAIN_ASPECT;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
}
