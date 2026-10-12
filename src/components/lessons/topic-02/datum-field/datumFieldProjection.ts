/**
 * Datum field activity — the one world → picture transform (pure, no React).
 *
 * The base map is a straight-down orthographic picture of MAP (north up, east
 * right, never mirrored for RTL), drawn by scripts/maps/build-datum-field-map.mjs
 * at MAP.ppm pixels per metre on BOTH axes. Every live layer — the grid, the
 * margin values, the markers, the distance line — goes through toPicture(),
 * and the picture box keeps MAP's proportions, so they can only scale and move
 * together with the picture. Distances are never measured here: gaps are
 * metres of the ground plane (datumField.ts), not pixels.
 *
 * Unit-tested in scripts/qa/datum-field-challenge.test.mjs.
 */
import { MAP, type EN } from './datumField.data';

/** A point in the picture box: fractions of its width (x) and height (y), origin top-left. */
export type Pt = { x: number; y: number };

export const MAP_W_M = MAP.e1 - MAP.e0;
export const MAP_H_M = MAP.n1 - MAP.n0;
/** Width ÷ height of the picture box (uniform scale ⇒ the extent's own proportions). */
export const MAP_ASPECT = MAP_W_M / MAP_H_M;
/** The base picture's size in pixels. */
export const MAP_PX = { w: Math.round(MAP_W_M * MAP.ppm), h: Math.round(MAP_H_M * MAP.ppm) } as const;

export const xOfE = (e: number): number => (e - MAP.e0) / MAP_W_M;
export const yOfN = (n: number): number => (MAP.n1 - n) / MAP_H_M;

/** A ground position (datum-A metres) → its place in the picture box. */
export const toPicture = (p: EN): Pt => ({ x: xOfE(p.e), y: yOfN(p.n) });

/** Is a ground position inside the map, at least `marginM` metres from every edge? */
export const insideMap = (p: EN, marginM = 0): boolean =>
  p.e >= MAP.e0 + marginM && p.e <= MAP.e1 - marginM && p.n >= MAP.n0 + marginM && p.n <= MAP.n1 - marginM;
