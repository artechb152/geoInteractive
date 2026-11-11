/**
 * The workbench map's measuring furniture: the 100 m grid, the scale bar and
 * the two hand tools (a transparent protractor with a measuring arm, a ruler).
 * Every length here is derived from M_PER_UNIT, so one grid square, one scale
 * bar segment and one ruler division are the same 100 m on the map.
 *
 * The tools never read anything out: they are placed and turned by the
 * learner, who reads the scale and types the value into the card.
 *
 * Pure data — no React — so scripts/qa/route-workbench.test.mjs runs it under Node.
 */
import { M_PER_UNIT, POINT_XY, START, bearing, dist, polar, type Pt } from './routeStoryModel';

/** The map frame (SVG viewBox), in map units: x east, y south. */
export const BOX = { x: -16, y: 0, width: 132, height: 92 } as const;

// ---------------------------------------------------------------- grid and scale bar

/** One grid square, in metres and in map units. */
export const GRID_M = 100;
export const GRID_U = GRID_M / M_PER_UNIT;
/** Every fifth line is a major line (500 m, the length of the scale bar). */
export const MAJOR_EVERY = 5;
/** The grid is laid from נ.ה, so the known start point sits on a major intersection. */
export const GRID_ORIGIN: Pt = START;

export type GridLine = { at: number; major: boolean };

function lines(origin: number, from: number, to: number): GridLine[] {
  const out: GridLine[] = [];
  for (let k = Math.ceil((from - origin) / GRID_U); origin + k * GRID_U <= to; k++) {
    out.push({ at: Math.round((origin + k * GRID_U) * 1000) / 1000, major: ((k % MAJOR_EVERY) + MAJOR_EVERY) % MAJOR_EVERY === 0 });
  }
  return out;
}
/** Vertical lines (x = …) and horizontal lines (y = …) across the frame. */
export const GRID_X = lines(GRID_ORIGIN.x, BOX.x, BOX.x + BOX.width);
export const GRID_Y = lines(GRID_ORIGIN.y, BOX.y, BOX.y + BOX.height);

/** Scale bar: 500 m in five 100 m segments — each segment is one grid square. */
export const SCALE_BAR_M = 500;
export const SCALE_BAR_SEGMENTS = SCALE_BAR_M / GRID_M;
export const SCALE_BAR_U = SCALE_BAR_M / M_PER_UNIT;

// ---------------------------------------------------------------- the hand tools

/** Protractor radius, map units (≈ 540 m): wide enough for a printed number every 10°. */
export const PROTRACTOR_R = 23;
/** The ruler's scale, metres: longer than any leg; a division every 50 m and a number every 100 m. */
export const RULER_M = 800;
export const RULER_U = RULER_M / M_PER_UNIT;
export const RULER_MINOR_M = 50;
/** A dropped tool's centre / zero within this distance of a route point lands on it (≈ 38 m). */
export const SNAP_U = 1.6;

export type ToolPose = { at: Pt; az: number };
export type Instruments = { protractor: ToolPose; ruler: ToolPose };

/**
 * Where the tools lie before the learner picks them up: off the route, clear of
 * the points, the north arrow and the scale bar. The protractor's arm points north,
 * the ruler lies east–west; neither starts on a route point.
 */
export const PARKED: Instruments = {
  protractor: { at: { x: 92, y: 52 }, az: 0 },
  ruler: { at: { x: 36, y: 87 }, az: 90 },
};

export const clampToBox = (p: Pt): Pt => ({
  x: Math.min(BOX.x + BOX.width, Math.max(BOX.x, p.x)),
  y: Math.min(BOX.y + BOX.height, Math.max(BOX.y, p.y)),
});

/** The route point a tool centre lands on, if it is dropped close enough. */
export function snapPoint(p: Pt): number | null {
  let best: number | null = null;
  POINT_XY.forEach((q, i) => {
    if (dist(p, q) <= SNAP_U && (best === null || dist(p, q) < dist(p, POINT_XY[best]))) best = i;
  });
  return best;
}

export const snap = (p: Pt): Pt => {
  const i = snapPoint(p);
  return i === null ? clampToBox(p) : POINT_XY[i];
};

export const norm360 = (a: number) => ((a % 360) + 360) % 360;

/** The direction a handle dragged to `p` gives the tool turning about `at` (continuous, never rounded to a target). */
export const aimAt = (at: Pt, p: Pt) => norm360(bearing(at, p));

/** Where the protractor's arm and the ruler's far end lie, for drawing their handles. */
export const armTip = (pose: ToolPose, length: number) => polar(pose.at, pose.az, length);

/** Ruler divisions from 0 to RULER_M: every 50 m, a number every 100 m. */
export const RULER_TICKS = Array.from({ length: RULER_M / RULER_MINOR_M + 1 }, (_, i) => {
  const m = i * RULER_MINOR_M;
  return { m, u: m / M_PER_UNIT, major: m % GRID_M === 0 };
});

/** Protractor graduations, clockwise from north: every 1°, longer every 5°, numbered every 10°. */
export const PROTRACTOR_TICKS = Array.from({ length: 360 }, (_, deg) => ({ deg, kind: deg % 10 === 0 ? 'ten' : deg % 5 === 0 ? 'five' : 'one' }) as const);
