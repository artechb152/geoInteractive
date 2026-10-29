/**
 * Pure planning measurements of the planning lab: no React, no three.js — the
 * map, the model, the panel and scripts/qa/planning-lab.test.mjs share them.
 *
 *   route     A, then the learner's route points, then B. A leg is the straight
 *             line between two consecutive route points; its direction and
 *             distance come from those two points only.
 *   distance  horizontal, in the map plane, metres (hypot ΔE, ΔN) — what a map
 *             measure gives. The height profile, the climb and the ground length
 *             are computed separately and labelled as such.
 *   features  the identified places of the practice area. Each knows where a
 *             route passes it (a crossing, a passage through it, or its closest
 *             approach within a tolerance) — or that the route does not.
 *
 * Every number is kept unrounded here; rounding happens on display only.
 */
import { DEST, GROVE, ORCHARD, ROCKS, START, BUILDING, WORLD, type PeakId, type Point, type XY } from './planningLabWorld';
import { heightAt, ringPoints, roadOf, saddle, summitOf, waterCourses } from './planningLabTerrain';
import { pointInPolygon } from '../locationCheckGeometry';

export { compassPoint, COMPASS_HE } from '../terrain-nav/terrainNavGeometry';

// ---------------------------------------------------------------- basics

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.E - a.E, b.N - a.N);
}

/** Grid bearing a → b, degrees clockwise from the map's north; null for the same point. */
export function bearing(a: Point, b: Point): number | null {
  if (a.E === b.E && a.N === b.N) return null;
  const d = (Math.atan2(b.E - a.E, b.N - a.N) * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}

export function pathLength(pts: readonly Point[]): number {
  let s = 0;
  for (let k = 1; k < pts.length; k++) s += distance(pts[k - 1], pts[k]);
  return s;
}

/** Closest point of segment a–b to p: the point, its parameter t ∈ [0, 1] and the distance. */
export function closestOnSegment(p: Point, a: Point, b: Point): { at: Point; t: number; d: number } {
  const dx = b.E - a.E;
  const dy = b.N - a.N;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.E - a.E) * dx + (p.N - a.N) * dy) / len2));
  const at = { E: a.E + dx * t, N: a.N + dy * t };
  return { at, t, d: distance(p, at) };
}

/** Closest point of a polyline to p, with its arc length from the start and the segment it is on. */
export function closestOnPath(p: Point, pts: readonly Point[]): { at: Point; s: number; seg: number; d: number } {
  let best = { at: pts[0], s: 0, seg: 0, d: Infinity };
  let s0 = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const c = closestOnSegment(p, pts[k], pts[k + 1]);
    const len = distance(pts[k], pts[k + 1]);
    if (c.d < best.d) best = { at: c.at, s: s0 + c.t * len, seg: k, d: c.d };
    s0 += len;
  }
  return best;
}

/** Intersection of segments p1–p2 and q1–q2: the parameter along p and the point, or null. */
function segmentHit(p1: Point, p2: Point, q1: Point, q2: Point): { t: number; at: Point } | null {
  const rx = p2.E - p1.E;
  const ry = p2.N - p1.N;
  const sx = q2.E - q1.E;
  const sy = q2.N - q1.N;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  const qpx = q1.E - p1.E;
  const qpy = q1.N - p1.N;
  const t = (qpx * sy - qpy * sx) / den;
  const u = (qpx * ry - qpy * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, at: { E: p1.E + rx * t, N: p1.N + ry * t } };
}

/** Every place a route crosses a line (polyline), in order along the route: arc length and point. */
export function crossings(route: readonly Point[], line: readonly XY[]): { s: number; at: Point; seg: number }[] {
  const out: { s: number; at: Point; seg: number }[] = [];
  const L = line.map(([E, N]) => ({ E, N }));
  let s0 = 0;
  for (let k = 0; k < route.length - 1; k++) {
    const a = route[k];
    const b = route[k + 1];
    const len = distance(a, b);
    const minE = Math.min(a.E, b.E);
    const maxE = Math.max(a.E, b.E);
    const minN = Math.min(a.N, b.N);
    const maxN = Math.max(a.N, b.N);
    for (let i = 0; i < L.length - 1; i++) {
      const q1 = L[i];
      const q2 = L[i + 1];
      if (Math.max(q1.E, q2.E) < minE || Math.min(q1.E, q2.E) > maxE || Math.max(q1.N, q2.N) < minN || Math.min(q1.N, q2.N) > maxN) continue;
      const h = segmentHit(a, b, q1, q2);
      if (h) out.push({ s: s0 + h.t * len, at: h.at, seg: k });
    }
    s0 += len;
  }
  return out.sort((x, y) => x.s - y.s);
}

/** The point at arc length s along a polyline. */
export function pointAt(pts: readonly Point[], s: number): Point {
  let rest = s;
  for (let k = 0; k < pts.length - 1; k++) {
    const len = distance(pts[k], pts[k + 1]);
    if (rest <= len || k === pts.length - 2) {
      const t = len === 0 ? 0 : Math.min(1, Math.max(0, rest / len));
      return { E: pts[k].E + (pts[k + 1].E - pts[k].E) * t, N: pts[k].N + (pts[k + 1].N - pts[k].N) * t };
    }
    rest -= len;
  }
  return pts[pts.length - 1];
}

// ---------------------------------------------------------------- height profile

export type Profile = {
  /** Samples every ≤ stepM along the route (horizontal arc length s, ground height h). */
  readonly samples: readonly { readonly s: number; readonly h: number }[];
  /** Horizontal length — the map measure. */
  readonly lengthM: number;
  /** Cumulative ascent and descent along the ground, metres. */
  readonly climbM: number;
  readonly descentM: number;
  readonly maxH: number;
  readonly maxAt: Point;
  readonly minH: number;
};

/** The ground under a route, from the mesh (heightAt), sampled every stepM of horizontal distance. */
export function profile(pts: readonly Point[], stepM = 5): Profile {
  const samples: { s: number; h: number }[] = [];
  let s0 = 0;
  let maxH = -Infinity;
  let minH = Infinity;
  let maxAt = pts[0];
  const push = (s: number, p: Point) => {
    const h = heightAt(p.E, p.N);
    samples.push({ s, h });
    if (h > maxH) {
      maxH = h;
      maxAt = p;
    }
    minH = Math.min(minH, h);
  };
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    const len = distance(a, b);
    const n = Math.max(1, Math.ceil(len / stepM));
    for (let i = 0; i < n; i++) push(s0 + (len * i) / n, { E: a.E + ((b.E - a.E) * i) / n, N: a.N + ((b.N - a.N) * i) / n });
    s0 += len;
  }
  push(s0, pts[pts.length - 1]);
  let climbM = 0;
  let descentM = 0;
  for (let i = 1; i < samples.length; i++) {
    const dh = samples[i].h - samples[i - 1].h;
    if (dh > 0) climbM += dh;
    else descentM -= dh;
  }
  return { samples, lengthM: s0, climbM, descentM, maxH, maxAt, minH };
}

// ---------------------------------------------------------------- legs

export type Leg = {
  readonly index: number;
  readonly from: Point;
  readonly to: Point;
  /** Horizontal distance, metres. */
  readonly distanceM: number;
  /** Grid bearing of the leg, degrees (shown as an arrow and a compass word, not as a number). */
  readonly bearingDeg: number;
  /** Ground height at the leg's ends, metres. */
  readonly fromH: number;
  readonly toH: number;
};

export function legsOf(pts: readonly Point[]): Leg[] {
  return pts.slice(1).map((to, k) => {
    const from = pts[k];
    return { index: k, from, to, distanceM: distance(from, to), bearingDeg: bearing(from, to) ?? 0, fromH: heightAt(from.E, from.N), toH: heightAt(to.E, to.N) };
  });
}

// ---------------------------------------------------------------- features

export type FeatureId = 'building' | 'stream' | 'ravine' | 'saddle' | 'peak-west' | 'peak-east' | 'road' | 'track' | 'orchard' | 'grove' | 'rocks';

export type Feature = {
  readonly id: FeatureId;
  /** Name as a label (on the map, the model and the panel). */
  readonly name: string;
  /** Short name for the feature buttons. */
  readonly short: string;
  /** What it is, in a few words. */
  readonly kind: string;
  /** How the map shows it. */
  readonly onMap: string;
  /** What to look for on the ground. */
  readonly onGround: string;
  /** Where to place its label and to focus the camera. */
  readonly anchor: Point;
  /** A checkpoint at this feature makes sense (A and B are identified already). */
  readonly checkpoint: boolean;
};

let featureCache: Feature[] | null = null;
/** The identified places of the area — the lists, labels and descriptions come from the terrain itself (heights read from the grid). */
export function features(): readonly Feature[] {
  if (!featureCache) {
    const sd = saddle();
    const w = summitOf('peak-west');
    const e = summitOf('peak-east');
    const mid = (pts: readonly XY[], t: number): Point => {
      const p = pts[Math.min(pts.length - 1, Math.round((pts.length - 1) * t))];
      return { E: p[0], N: p[1] };
    };
    const water = waterCourses();
    featureCache = [
      { id: 'building', name: 'מבנה בולט', short: 'המבנה', kind: 'מבנה אבן דו־קומתי ליד המוצא', onMap: 'ריבוע שחור לצד דרך הגישה.', onGround: 'בית אבן עם גג רעפים ומגדל מים קטן לידו.', anchor: { E: BUILDING.E, N: BUILDING.N }, checkpoint: false },
      { id: 'stream', name: 'הנחל', short: 'הנחל', kind: 'ערוץ מים רחב בעמק שמדרום לרכס', onMap: 'קו כחול רציף.', onGround: 'פס של עצים וצמחייה ירוקה לאורך ערוץ נמוך.', anchor: mid(water.stream.pts, 0.42), checkpoint: true },
      { id: 'ravine', name: 'הערוץ', short: 'הערוץ', kind: 'ערוץ יבש שעולה מהנחל אל האוכף', onMap: 'קו כחול מקווקו, וקווי גובה שמתעקמים אל הרכס.', onGround: 'קפל עמוק במדרון, שעולה אל הנקודה הנמוכה ברכס.', anchor: mid(water.ravine.pts, 0.45), checkpoint: true },
      {
        id: 'saddle',
        name: 'האוכף',
        short: 'האוכף',
        kind: `הנקודה הנמוכה ברכס, בין שתי הפסגות (${Math.round(sd.heightM)} מ׳)`,
        onMap: 'קווי גובה בצורת שעון חול בין שתי פסגות.',
        onGround: 'שקע ברכס: הקרקע עולה משני צדדיו אל הפסגות.',
        anchor: { E: sd.E, N: sd.N },
        checkpoint: true,
      },
      { id: 'peak-west', name: 'הפסגה המערבית', short: 'פסגה מערבית', kind: `הנקודה הגבוהה ברכס (${Math.round(w.heightM)} מ׳)`, onMap: 'קווי גובה סגורים סביב נקודת גובה.', onGround: 'כיפה סלעית חשופה, הגבוהה באזור.', anchor: { E: w.E, N: w.N }, checkpoint: true },
      { id: 'peak-east', name: 'הפסגה המזרחית', short: 'פסגה מזרחית', kind: `פסגה נמוכה יותר מזרחה לאוכף (${Math.round(e.heightM)} מ׳)`, onMap: 'קווי גובה סגורים סביב נקודת גובה.', onGround: 'כיפה מעוגלת עם עצים פזורים על מדרונותיה.', anchor: { E: e.E, N: e.N }, checkpoint: true },
      { id: 'road', name: 'דרך העפר', short: 'דרך העפר', kind: 'דרך בעמק שמצפון לרכס', onMap: 'קו חום כפול.', onGround: 'פס עפר בהיר וישר יחסית לרוחב העמק.', anchor: mid(roadOf('road').pts, 0.55), checkpoint: true },
      { id: 'track', name: 'דרך הגישה', short: 'דרך הגישה', kind: 'דרך עפר דרומית, ליד המוצא', onMap: 'קו חום כפול בדרום המפה.', onGround: 'דרך עפר שעוברת לצד המבנה.', anchor: mid(roadOf('track').pts, 0.32), checkpoint: true },
      { id: 'orchard', name: 'מטע הזיתים', short: 'המטע', kind: 'עצי זית בשורות, מערבית למוצא', onMap: 'נקודות ירוקות בשורות.', onGround: 'עצים נמוכים בשורות ישרות.', anchor: { E: 585, N: 172 }, checkpoint: true },
      { id: 'grove', name: 'חורשת האורנים', short: 'החורשה', kind: 'חורשה צפופה שבה נמצא היעד', onMap: 'שטח ירוק עם עיגולי עצים צפופים.', onGround: 'גוש כהה של אורנים גבוהים.', anchor: { E: 180, N: 1120 }, checkpoint: true },
      { id: 'rocks', name: 'הסלעים בחורשה', short: 'הסלעים', kind: 'קרקע סלעית בתוך החורשה, במקום היעד', onMap: 'סימני סלע בתוך החורשה, ליד היעד.', onGround: 'גושי אבן גיר אפורים בין האורנים.', anchor: { E: ROCKS.E, N: ROCKS.N }, checkpoint: false },
    ];
  }
  return featureCache;
}

export function featureOf(id: FeatureId): Feature {
  return features().find((f) => f.id === id)!;
}

/** How close a route must come to a place feature to pass it, metres. */
export const PASS_RADIUS: Partial<Record<FeatureId, number>> = { saddle: 60, 'peak-west': 70, 'peak-east': 70, building: 60, rocks: 45 };
/** A route that runs along a line without crossing it still passes it within this distance, metres. */
const ALONG_LINE_M = 22;

const featureLine = (id: FeatureId): readonly XY[] | null => {
  if (id === 'stream') return waterCourses().stream.pts;
  if (id === 'ravine') return waterCourses().ravine.pts;
  if (id === 'road' || id === 'track') return roadOf(id).pts;
  return null;
};
const featureRing = (id: FeatureId): readonly Point[] | null => (id === 'grove' ? ringPoints(GROVE) : id === 'orchard' ? ringPoints(ORCHARD.ring) : null);

/**
 * Where a route passes a feature: the first crossing of a line (or its closest
 * stretch, when the route runs along it), the place it enters an area, or its
 * closest approach to a place within PASS_RADIUS. Null when the route does not
 * pass it. `s` is the arc length along the route.
 */
export function passOf(id: FeatureId, route: readonly Point[]): { at: Point; s: number; d: number } | null {
  const line = featureLine(id);
  if (line) {
    const x = crossings(route, line);
    if (x.length) return { at: x[0].at, s: x[0].s, d: 0 };
    // running along it: the route's closest approach to the line
    let best: { at: Point; s: number; d: number } | null = null;
    for (const q of line.filter((_, i) => i % 2 === 0)) {
      const c = closestOnPath({ E: q[0], N: q[1] }, route);
      if (!best || c.d < best.d) best = { at: c.at, s: c.s, d: c.d };
    }
    return best && best.d <= ALONG_LINE_M ? best : null;
  }
  const ring = featureRing(id);
  if (ring) {
    // the first boundary crossing, or the start if the route begins inside
    if (pointInPolygon(route[0], ring)) return { at: route[0], s: 0, d: 0 };
    const x = crossings(route, [...ring.map((p) => [p.E, p.N] as XY), [ring[0].E, ring[0].N]]);
    return x.length ? { at: x[0].at, s: x[0].s, d: 0 } : null;
  }
  const r = PASS_RADIUS[id] ?? 50;
  const c = closestOnPath(featureOf(id).anchor, route);
  return c.d <= r ? { at: c.at, s: c.s, d: c.d } : null;
}

/** Whether a route point stands on a feature (for a checkpoint): on its line, inside its area, or near its place. */
export function standsOn(id: FeatureId, p: Point): boolean {
  const line = featureLine(id);
  if (line) return closestOnPath(p, line.map(([E, N]) => ({ E, N }))).d <= 12;
  const ring = featureRing(id);
  if (ring) return pointInPolygon(p, ring) || closestOnPath(p, [...ring, ring[0]]).d <= 12;
  return distance(p, featureOf(id).anchor) <= (PASS_RADIUS[id] ?? 50);
}

/** The feature a ground point picks (a click on the map or the model): the nearest within reach, places before lines before areas. */
export function pickFeature(p: Point, slackM = 0): FeatureId | null {
  if (distance(p, featureOf('rocks').anchor) <= ROCKS.rM + slackM) return 'rocks';
  if (distance(p, featureOf('building').anchor) <= 30 + slackM) return 'building';
  const sd = saddle();
  if (distance(p, sd) <= 55 + slackM) return 'saddle';
  for (const id of ['peak-west', 'peak-east'] as PeakId[]) {
    const s = summitOf(id);
    if (distance(p, s) <= 70 + slackM) return id;
  }
  let best: { id: FeatureId; d: number } | null = null;
  for (const id of ['stream', 'ravine', 'road', 'track'] as FeatureId[]) {
    const d = closestOnPath(p, featureLine(id)!.map(([E, N]) => ({ E, N }))).d;
    if (d <= 18 + slackM && (!best || d < best.d)) best = { id, d };
  }
  if (best) return best.id;
  if (pointInPolygon(p, ringPoints(GROVE))) return 'grove';
  if (pointInPolygon(p, ringPoints(ORCHARD.ring))) return 'orchard';
  return null;
}

// ---------------------------------------------------------------- assessment

export type Crossing = 'saddle' | 'peak-west' | 'peak-east' | 'slope' | 'around';

export type Assessment = {
  readonly profile: Profile;
  /** How the route crosses the ridge: at the saddle, over a summit, on a flank above the saddle, or not at all. */
  readonly crossing: Crossing;
  readonly saddleH: number;
};

/**
 * What the route does with the ridge — read from the route's own geometry and
 * the ground under it, never from which button was pressed: over a summit
 * (it comes within PASS_RADIUS of one), through the saddle (within its radius),
 * over the crest elsewhere (its highest point stands above the saddle), or
 * around the ridge (it never climbs to the saddle's height).
 */
export function assess(route: readonly Point[]): Assessment {
  const pr = profile(route);
  const sd = saddle();
  const near = (id: FeatureId) => passOf(id, route) !== null;
  let crossing: Crossing;
  if (near('peak-west')) crossing = 'peak-west';
  else if (near('peak-east')) crossing = 'peak-east';
  else if (near('saddle')) crossing = 'saddle';
  else if (pr.maxH > sd.heightM + 4) crossing = 'slope';
  else crossing = 'around';
  return { profile: pr, crossing, saddleH: sd.heightM };
}

/** The straight line A → B: its length and its ground. */
export function directLine(): { pts: Point[]; assessment: Assessment } {
  const pts = [START, DEST];
  return { pts, assessment: assess(pts) };
}

// ---------------------------------------------------------------- the sheet

/** Route points stay this far inside the sheet. */
export const EDGE_M = 15;
export function clampToSheet(p: Point): Point {
  return { E: Math.min(WORLD.maxE - EDGE_M, Math.max(WORLD.minE + EDGE_M, p.E)), N: Math.min(WORLD.maxN - EDGE_M, Math.max(WORLD.minN + EDGE_M, p.N)) };
}
