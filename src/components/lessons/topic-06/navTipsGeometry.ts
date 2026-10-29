/**
 * The geography of „דגשים לתכנון ולניווט” (PlanningTipsScene) — one source for
 * the planning map (NavTipsMap) and the navigation replay
 * (navigation-replay/, „מתי עוצרים לבדוק?”), so both screens tell the same
 * route over the same ground.
 *
 * Map units: a 100 × 75 sheet, north up, x east, y south, 25 m per unit. Every
 * leg is a straight line built from a bearing and a distance, so the map is to
 * scale. The bearings stay internal — this part of the lesson shows direction
 * as an arrow, not as a number (azimuth is taught later in the lesson).
 */
export type Pt = { x: number; y: number };

export const VB_W = 100;
export const VB_H = 75;
/** map scale — metres per map unit (the 500 מ׳ scale bar is drawn from it) */
export const M_PER_UNIT = 25;
/** נ.ה — beside a prominent building */
export const START: Pt = { x: 86, y: 62 };

/**
 * The planned route, leg by leg: נ.ה → 1 עיקול הנחל → 2 אוכף → 3 חציית דרך
 * עפר → נ.ס. `m` is the distance the lesson quotes; `az` only places the leg.
 */
export const TIP_LEGS = [
  { az: 275, m: 500 },
  { az: 298, m: 550 },
  { az: 322, m: 600 },
  { az: 292, m: 500 },
] as const;

export const fx = (n: number) => Math.round(n * 100) / 100;
export function polar(p: Pt, az: number, dist: number): Pt {
  const r = (az * Math.PI) / 180;
  return { x: fx(p.x + dist * Math.sin(r)), y: fx(p.y - dist * Math.cos(r)) };
}
export function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: fx(a.x + (b.x - a.x) * t), y: fx(a.y + (b.y - a.y) * t) };
}
/** Bearing a → b, degrees clockwise from map north (−180…180). */
export const bearing = (a: Pt, b: Pt) => (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;

/** נ.ה, the three checkpoints, נ.ס */
export const POINTS: Pt[] = TIP_LEGS.reduce<Pt[]>((pts, leg) => [...pts, polar(pts[pts.length - 1], leg.az, leg.m / M_PER_UNIT)], [START]);
export const [, P1, P2, P3, END] = POINTS;

// The ridge lies across the straight line נ.ה → נ.ס: that line climbs over its
// northern summit, the planned route crosses at the saddle (P2) between them.
const DIRECT_LEN = Math.hypot(END.x - START.x, END.y - START.y);
export const RIDGE_AXIS: Pt = { x: -(END.y - START.y) / DIRECT_LEN, y: (END.x - START.x) / DIRECT_LEN };
export const RIDGE_ROT = fx((Math.atan2(RIDGE_AXIS.y, RIDGE_AXIS.x) * 180) / Math.PI);
/** Each summit's distance from the saddle along the ridge axis, map units. */
export const SUMMIT_OFFSET = 8.9;
export const SUMMIT_N: Pt = { x: fx(P2.x + SUMMIT_OFFSET * RIDGE_AXIS.x), y: fx(P2.y + SUMMIT_OFFSET * RIDGE_AXIS.y) };
export const SUMMIT_S: Pt = { x: fx(P2.x - SUMMIT_OFFSET * RIDGE_AXIS.x), y: fx(P2.y - SUMMIT_OFFSET * RIDGE_AXIS.y) };

// Paths are tuned to the points above: the stream bends at P1, the road is crossed at P3.
export const STREAM =
  'M74 -2 C 73 10, 70 20, 71 30 C 72 40, 73 50, 69.5 56.5 C 67.5 60, 64 62, 59 64.5 C 52 68, 44 69, 36 70.5 C 26 72.5, 14 71.5, -2 74';
export const ROAD = 'M37 -2 C 35 8, 33 20, 31.9 31 C 30.8 42, 28 52, 24 62 C 21 69, 19 73, 17 77';

/** the prominent building beside נ.ה */
export const BUILDING: Pt = { x: 89.4, y: 55.6 };
/** the destination: a group of pines on rocky ground */
export const DESTINATION_PINES: { x: number; y: number; s: number }[] = [
  { x: 9.2, y: 19.6, s: 0.85 },
  { x: 12.6, y: 17.6, s: 1 },
  { x: 16.8, y: 18.8, s: 0.85 },
  { x: 7.2, y: 24.4, s: 0.75 },
];
