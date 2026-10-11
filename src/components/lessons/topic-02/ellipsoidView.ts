/**
 * The ellipsoid view's geometry (no React): ONE view state, EllView
 * {elev, az}, and the one transform that draws the body, its marked area and
 * that area's link to the section below. EllipsoidModel draws the body with
 * it; MeasurementIllustration draws the callout from the area down to the
 * section with the same numbers, so the two never disagree.
 *
 *   The body: an ellipse turned about its axis, drawn orthographically.
 *   The flattening is exaggerated (the real one, about 1/298, would not show).
 *   The marked area: a small patch at mid-latitude with the survey line across
 *   it — the line the section below is drawn along, its stations on it.
 *   patchView(): where the area and its line are on screen now, how squarely the
 *   area faces the reader, and from that the section's focus (0 … 1): full when
 *   the area is turned to the middle of the body, none when it is round the back.
 *
 * Unit-tested in scripts/qa/measurement-mission.test.mjs.
 */
import type { Pt } from './measurementLayout';
import type { StationId } from './measurementMission.data';

export type EllView = { readonly elev: number; readonly az: number };

/** Drawn flattening (schematic): b = a·(1 − FLAT). */
export const FLAT = 0.13;
/** Side-on (the meridian ellipse, flattening shows) and straight down (a circle, it does not). */
export const ELL_SIDE = 0;
export const ELL_TOP = 90;
/** Opening view: a little above the equator, the marked area turned away to the right. */
export const ELL_START: EllView = { elev: 16, az: 0 };
/** The marked area (deg): mid-latitude, off to the right of the opening view. */
export const PATCH = { lat: 32, lon: 52, half: 5 };
/** Where the stations lie along the area's line, as fractions of it (their place along the survey line). */
const STATION_AT: Record<StationId, number> = { C: 1300 / 4500, B: 2850 / 4500, A: 3700 / 4500 };

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
export function ellipsoidFrame(view: EllView, width: number, height: number): EllFrame {
  const a = Math.min(width * 0.27, height * 0.38);
  const b = a * (1 - FLAT);
  const cx = width * 0.5;
  const cy = height * 0.53;
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

export type PatchView = {
  /** The area's four corners on screen. */
  corners: Pt[];
  /** The survey line across it, left end (C side) to right end (A side), and the stations on it. */
  line: [Pt, Pt];
  stations: Record<StationId, Pt>;
  /** Its lowest corner (the callout leaves from there). */
  low: Pt;
  /** cos of the angle between the area's normal and the direction to the reader (−1 … 1). */
  facing: number;
  /** 0 … 1: how fully the section below is in focus. */
  focus: number;
  /** Whether the whole area is on the near side. */
  front: boolean;
};

const smooth = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** The marked area, its line and stations, as seen from `view` — the same transform as the body. */
export function patchView(view: EllView, width: number, height: number): PatchView {
  const F = ellipsoidFrame(view, width, height);
  const { lat, lon, half } = PATCH;
  const corners = [F.at(lat - half, lon - half), F.at(lat - half, lon + half), F.at(lat + half, lon + half), F.at(lat + half, lon - half)];
  const lineAt = (t: number) => F.at(lat, lon - half * 0.9 + t * half * 1.8);
  const line: [Pt, Pt] = [lineAt(0), lineAt(1)];
  const stations: Record<StationId, Pt> = { C: lineAt(STATION_AT.C), B: lineAt(STATION_AT.B), A: lineAt(STATION_AT.A) };
  // the area's outward normal (an ellipsoid of revolution: geodetic latitude from the parametric one)
  const geo = Math.atan(Math.tan(lat * DEG) / (1 - FLAT));
  const l = (lon + view.az) * DEG;
  const n = [Math.cos(geo) * Math.cos(l), Math.cos(geo) * Math.sin(l), Math.sin(geo)];
  // the reader looks from (cos elev, 0, sin elev) in the body's frame
  const facing = n[0] * F.ce + n[2] * F.se;
  const low = corners.reduce((m, p) => (p.y > m.y ? p : m), corners[0]);
  return {
    corners,
    line,
    stations,
    low,
    facing,
    focus: smooth(0.55, 0.93, facing),
    front: corners.every((p) => p.front),
  };
}
