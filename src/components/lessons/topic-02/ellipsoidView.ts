/**
 * The ellipsoid view's geometry (no React): ONE view state, EllView
 * {elev, az}, and the one transform that draws the body and its marked area.
 *
 *   The body: an ellipse turned about its axis, drawn orthographically.
 *   The flattening is exaggerated (the real one, about 1/298, would not show).
 *   The marked area: the stretch of the landscape the section is drawn along —
 *   SURVEY_SPAN across, the model's whole depth — laid on the body at
 *   mid-latitude (the same proportions, its front edge to the south), with the
 *   survey line across it where it runs on the landscape. The enlargement
 *   (EllipsoidZoom) and the section use the same area and the same line, so the
 *   three are one area seen three ways; turning moves where the area is drawn
 *   on the body and the angle the enlargement shows it from, never the section.
 *
 * Unit-tested in scripts/qa/measurement-mission.test.mjs.
 */
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { SECTION, SURVEY_SPAN, type Pt } from './measurementLayout';
import type { StationId } from './measurementMission.data';

export type EllView = { readonly elev: number; readonly az: number };

/** Drawn flattening (schematic): b = a·(1 − FLAT). */
export const FLAT = 0.13;
/** Side-on (the meridian ellipse, flattening shows) and straight down (a circle, it does not). */
export const ELL_SIDE = 0;
export const ELL_TOP = 90;
/** Opening view: a little above the equator, turned so the marked area is in sight to the right of the middle. */
export const ELL_START: EllView = { elev: 16, az: -28 };
/** The model's footprint (m): along the survey line, and in depth. */
const LINE_M = L.width * L.mPerUnit;
const DEPTH_M = L.depth * L.mPerUnit;
/** The marked area across the model's width (0 its left edge … 1 its right edge): the section's stretch. */
export const SPAN_U: readonly [number, number] = [SURVEY_SPAN.s0 / LINE_M, SURVEY_SPAN.s1 / LINE_M];
/** Where the survey line crosses the model's depth (0 the front edge … 1 the back). */
export const LINE_V = (L.lineY + L.depth / 2) / L.depth;
/** Where each station lies across the model's width. */
export const STATION_U: Readonly<Record<StationId, number>> = { C: L.stations.C.s / LINE_M, B: L.stations.B.s / LINE_M, A: L.stations.A.s / LINE_M };
/**
 * The marked area on the body (deg): its centre and half-sizes, in the area's
 * own proportions (3500 × 2300 m) at this latitude.
 */
export const PATCH = (() => {
  const lat = 32;
  const halfLat = 5.5;
  const aspect = ((SPAN_U[1] - SPAN_U[0]) * LINE_M) / DEPTH_M;
  return { lat, lon: 52, halfLat, halfLon: (halfLat * aspect) / Math.cos((lat * Math.PI) / 180) };
})();

const DEG = Math.PI / 180;
export const clampElev = (e: number) => Math.min(ELL_TOP, Math.max(ELL_SIDE, e));
export const sameEll = (a: EllView, b: EllView) => Math.abs(a.elev - b.elev) < 0.05 && Math.abs(wrap(a.az - b.az)) < 0.05;
/** An angle difference folded into −180 … 180. */
export const wrap = (d: number) => ((((d % 360) + 540) % 360) - 180);

export type EllFrame = {
  a: number;
  b: number;
  cx: number;
  cy: number;
  /** Half-height of the body's outline from here (a seen from straight above, b from the side). */
  ry: number;
  /** Screen point of a body point (parametric latitude, longitude; deg), and whether it faces the reader. */
  at: (lat: number, lon: number) => Pt & { front: boolean };
  se: number;
  ce: number;
};

/** The body in a box of width × height, seen from `view`. */
export function ellipsoidFrame(view: EllView, width: number, height: number, zoom = 1): EllFrame {
  const a = Math.min(width * 0.3, height * 0.4) * zoom;
  const b = a * (1 - FLAT);
  const cx = width * 0.5;
  const cy = height * 0.52;
  const se = Math.sin(view.elev * DEG);
  const ce = Math.cos(view.elev * DEG);
  const at = (lat: number, lon: number) => {
    const cb = Math.cos(lat * DEG);
    const X = a * cb * Math.cos((lon + view.az) * DEG);
    const Y = a * cb * Math.sin((lon + view.az) * DEG);
    const Z = b * Math.sin(lat * DEG);
    return { x: cx + Y, y: cy - (-X * se + Z * ce), front: (X / (a * a)) * ce + (Z / (b * b)) * se > -1e-9 };
  };
  return { a, b, cx, cy, ry: Math.sqrt(a * a * se * se + b * b * ce * ce), at, se, ce };
}

/** The marked area's u (across the model, SPAN_U) as a fraction of its own width. */
const across = (u: number) => (u - SPAN_U[0]) / (SPAN_U[1] - SPAN_U[0]);
/** A point of the marked area on the body: u across the model (within SPAN_U), v in depth (front → back). */
export const footprintAt = (F: EllFrame, u: number, v: number) =>
  F.at(PATCH.lat - PATCH.halfLat + 2 * PATCH.halfLat * v, PATCH.lon - PATCH.halfLon + 2 * PATCH.halfLon * across(u));

export type PatchView = {
  /** The area's outline, following the body's curvature (closed). */
  outline: Pt[];
  /** The survey line over the section's stretch, left end (C side) to right end (A side). */
  line: [Pt, Pt];
  stations: Record<StationId, Pt>;
  /** Its screen box (the enlargement grows from it). */
  box: { x: number; y: number; w: number; h: number };
  /** cos of the angle between the area's normal and the direction to the reader (−1 … 1). */
  facing: number;
  /** Whether the whole area is on the near side. */
  front: boolean;
};

/**
 * Where the reader stands relative to the marked area: `facing` — cos of the angle between the area's
 * normal and the direction to the reader (1 straight on … 0 edge-on … < 0 behind the body); `east` — how
 * far that direction leans along the area's width (+ seen from its east, the A side).
 */
export function areaSight(view: EllView) {
  // the area's outward normal (an ellipsoid of revolution: geodetic latitude from the parametric one)
  const geo = Math.atan(Math.tan(PATCH.lat * DEG) / (1 - FLAT));
  const l = (PATCH.lon + view.az) * DEG;
  const se = Math.sin(view.elev * DEG);
  const ce = Math.cos(view.elev * DEG);
  // the reader looks from (cos elev, 0, sin elev) in the body's frame; the area's east is (−sin l, cos l, 0)
  return { facing: Math.cos(geo) * Math.cos(l) * ce + Math.sin(geo) * se, east: -Math.sin(l) * ce };
}

/** The marked area, its line and stations, as seen from `view` — the same transform as the body. */
export function patchView(view: EllView, width: number, height: number, zoom = 1): PatchView {
  const F = ellipsoidFrame(view, width, height, zoom);
  const n = 8;
  const edge = (u0: number, v0: number, u1: number, v1: number) =>
    Array.from({ length: n }, (_, k) => footprintAt(F, u0 + ((u1 - u0) * k) / n, v0 + ((v1 - v0) * k) / n));
  const [u0, u1] = SPAN_U;
  const outline = [...edge(u0, 0, u1, 0), ...edge(u1, 0, u1, 1), ...edge(u1, 1, u0, 1), ...edge(u0, 1, u0, 0)];
  const line: [Pt, Pt] = [footprintAt(F, SPAN_U[0], LINE_V), footprintAt(F, SPAN_U[1], LINE_V)];
  const stations = { C: footprintAt(F, STATION_U.C, LINE_V), B: footprintAt(F, STATION_U.B, LINE_V), A: footprintAt(F, STATION_U.A, LINE_V) };
  const { facing } = areaSight(view);
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return { outline, line, stations, box, facing, front: outline.every((p) => (p as Pt & { front: boolean }).front) };
}

// ---------------------------------------------------------------- the enlargement

export type ZoomGeometry = {
  /** Screen point of footprint point (u, v) on the terrain layer, and on the ellipsoid patch under it. */
  terrain: (u: number, v: number) => Pt;
  patch: (u: number, v: number) => Pt;
  /** The survey line over the section's stretch on the terrain layer: its ends stand right above the section's ends. */
  line: [Pt, Pt];
  stations: Record<StationId, Pt>;
  /** The terrain layer's screen box (the frame flies here from the body). */
  box: { x: number; y: number; w: number; h: number };
};

/**
 * The marked area enlarged, in a box of width × height over the section (same
 * width, same plot): the area seen obliquely as a thin terrain layer — the
 * landscape's own top-down image — lifted above the matching piece of the
 * ellipsoid, a gently curved sheet. Across the area the scale is the
 * section's: the survey line's ends at x = plotLeft … width − padRight, the
 * section's own ends, so the line and the section line up.
 *
 * It is seen from the body's angle (`view`): the more squarely the reader
 * faces the area on the body, the deeper the layer opens (the thinner the gap
 * under it looks); turned towards edge-on, it flattens and the gap shows; the
 * back edge leans with the side it is seen from. The line stays level and its
 * ends stay over the section's ends from every angle.
 */
export function zoomGeometry(height: number, plot: { left: number; right: number }, view: EllView = ELL_START): ZoomGeometry {
  const S = (plot.right - plot.left) / (SPAN_U[1] - SPAN_U[0]);
  const sight = areaSight(view);
  const open = areaSight(ELL_START);
  const f = Math.max(0.15, sight.facing);
  // the back edge leans away from the side the reader stands on (at the opening view: a little to the left),
  // no further than the front and back corners stay inside the column
  const skew = Math.min(SECTION.padRight / (1 - LINE_V), Math.max(-Math.min(0.12 * S, SECTION.padRight / LINE_V), -0.07 * S * (sight.east / open.east)));
  const top = 8;
  const depth = Math.min(height * 0.5, Math.max(14, Math.max(34, height * 0.4) * (f / open.facing)));
  const lift = Math.max(22, height * 0.24) * (0.55 + (0.45 * Math.sqrt(1 - f * f)) / Math.sqrt(1 - open.facing ** 2));
  const bulge = Math.min(7, height * 0.045);
  const x = (u: number, v: number) => plot.left + (u - SPAN_U[0]) * S + (v - LINE_V) * skew;
  const terrain = (u: number, v: number) => ({ x: x(u, v), y: top + (1 - v) * depth });
  const patch = (u: number, v: number) => ({ x: x(u, v), y: top + lift + (1 - v) * depth - bulge * 4 * across(u) * (1 - across(u)) });
  const [u0, u1] = SPAN_U;
  const c = [terrain(u0, 0), terrain(u1, 0), terrain(u1, 1), terrain(u0, 1)];
  const xs = c.map((p) => p.x);
  const ys = c.map((p) => p.y);
  return {
    terrain,
    patch,
    line: [terrain(SPAN_U[0], LINE_V), terrain(SPAN_U[1], LINE_V)],
    stations: { C: terrain(STATION_U.C, LINE_V), B: terrain(STATION_U.B, LINE_V), A: terrain(STATION_U.A, LINE_V) },
    box: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) },
  };
}
