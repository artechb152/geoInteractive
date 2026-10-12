/**
 * The practice of the terrain-association activity: four legs (קטעי דרך), the
 * points the learner can mark, the evidence statements and the evaluation.
 * Pure data and functions — no React — so scripts/qa/terrain-nav.test.mjs runs
 * them under plain Node.
 *
 * Every evidence statement is a geometric predicate over the shared scenario
 * (a feature's nearest point in a compass sector, within a distance; a higher
 * summit; houses around), evaluated from the point it is read at. Its text
 * says exactly what the predicate checks. The tests require, for each leg, that
 * both true statements hold at the real point and at none of the look-alike
 * candidates, and that each false statement fails at the real point and holds
 * at one of the look-alikes — so the false ones are plausible, not absurd.
 */
import {
  CHECKPOINT_LABEL,
  GROVES,
  ROUTE,
  SQUARE_CENTER,
  SQUARE_RING,
  START,
  VILLAGE_RING,
  WATER_TOWER,
  type CheckpointId,
  type DomeId,
  type GroveId,
  type Point,
  type RoadId,
  type XY,
} from './terrainNavScenario';
import { COMPASS_HE, angularDifference, bearing, compassPoint, distance, type CompassPoint } from './terrainNavGeometry';
import { checkpoint, houses, ringPoints, roads, summitOf, summits, waterCourses } from './terrainNavTerrain';
import { distanceToPolyline, pointInPolygon } from '../locationCheckGeometry';

// ---------------------------------------------------------------- features (ids shared by both views)

export type FeatureId =
  | 'A'
  | 'B'
  | DomeId
  | GroveId
  | 'village'
  | 'square'
  | 'tower'
  | 'stream'
  | 'gully-north'
  | RoadId;

// ---------------------------------------------------------------- candidates

export type CandidateId = DomeId | 'square' | 'entrance' | 'tower-yard' | 'west-lane';

/** Points inside the village the last leg can be confused with. */
export const VILLAGE_POINTS: Record<'entrance' | 'tower-yard' | 'west-lane', Point> = {
  /** On the western road, just short of the built-up area's southern edge. */
  entrance: { E: 296, N: 1412 },
  /** The open yard at the foot of the water tower. */
  'tower-yard': { E: 482, N: 1628 },
  /** The far end of the lane that leaves the square westward. */
  'west-lane': { E: 162, N: 1680 },
};

export function candidatePoint(id: CandidateId): Point {
  if (id === 'square') return SQUARE_CENTER;
  if (id === 'entrance' || id === 'tower-yard' || id === 'west-lane') return VILLAGE_POINTS[id];
  const s = summitOf(id);
  return { E: s.E, N: s.N };
}

// ---------------------------------------------------------------- evidence

type Target =
  | { readonly road: RoadId }
  | { readonly anyRoad: true }
  | { readonly water: 'stream' | 'gully-north' }
  | { readonly grove: GroveId }
  | { readonly point: 'tower' | 'square' | 'village' };

export type EvidencePredicate =
  | {
      readonly kind: 'direction';
      readonly target: Target;
      /** The target's nearest point lies in one of these 45° sectors… */
      readonly sectors: readonly CompassPoint[];
      /** …and within this horizontal distance, metres. */
      readonly maxM: number;
      readonly minM?: number;
    }
  | {
      readonly kind: 'higher';
      /** A summit at least this much higher than the ground here… */
      readonly riseM: number;
      readonly sectors: readonly CompassPoint[];
      readonly maxM: number;
    }
  | {
      readonly kind: 'houses-around';
      /** Houses in all four quarters (N, E, S, W) within this radius. */
      readonly radiusM: number;
      readonly holds: boolean;
    }
  | {
      readonly kind: 'houses-only';
      /** Every house within radiusM lies in these sectors (and there are some). */
      readonly sectors: readonly CompassPoint[];
      readonly radiusM: number;
    };

export type Evidence = {
  readonly id: string;
  readonly text: string;
  /** The feature this statement is about — highlighted in both views on success, a hint or the explanation. */
  readonly feature: FeatureId;
  readonly predicate: EvidencePredicate;
};

function pointsOf(t: Target): { pts: readonly XY[]; kind: 'line' | 'ring' | 'point' } {
  if ('road' in t) return { pts: roads().find((r) => r.id === t.road)!.pts, kind: 'line' };
  if ('anyRoad' in t) return { pts: roads().flatMap((r) => r.pts), kind: 'point' };
  if ('water' in t) {
    const w = waterCourses();
    return { pts: t.water === 'stream' ? w.stream.pts : w.gullies.find((g) => g.id === t.water)!.pts, kind: 'line' };
  }
  if ('grove' in t) return { pts: GROVES.find((g) => g.id === t.grove)!.ring, kind: 'ring' };
  if (t.point === 'tower') return { pts: [[WATER_TOWER.E, WATER_TOWER.N]], kind: 'point' };
  if (t.point === 'square') return { pts: SQUARE_RING, kind: 'ring' };
  return { pts: VILLAGE_RING, kind: 'ring' };
}

/** Nearest point of a target from p (densified, ≤ 2 m between samples for lines and ring edges). */
export function nearestOf(t: Target, p: Point): { point: Point; distanceM: number; inside: boolean } {
  const { pts, kind } = pointsOf(t);
  if (kind === 'ring' && pointInPolygon(p, ringPoints(pts))) return { point: p, distanceM: 0, inside: true };
  const seq: XY[] = kind === 'ring' ? [...pts, pts[0]] : [...pts];
  let best = { E: seq[0][0], N: seq[0][1] };
  let bd = Infinity;
  for (let k = 0; k < seq.length; k++) {
    const a = seq[k];
    const b = seq[Math.min(k + 1, seq.length - 1)];
    const steps = kind === 'point' || k === seq.length - 1 ? 1 : Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    for (let s = 0; s < steps; s++) {
      const q = { E: a[0] + ((b[0] - a[0]) * s) / steps, N: a[1] + ((b[1] - a[1]) * s) / steps };
      const d = distance(p, q);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
  }
  return { point: best, distanceM: bd, inside: false };
}

const inSectors = (deg: number, sectors: readonly CompassPoint[]) => sectors.includes(compassPoint(deg));

/** Whether a statement is true when read at p. */
export function evidenceHolds(e: Evidence, p: Point): boolean {
  const q = e.predicate;
  if (q.kind === 'direction') {
    const n = nearestOf(q.target, p);
    if (n.inside || n.distanceM > q.maxM || n.distanceM < (q.minM ?? 0)) return false;
    return inSectors(bearing(p, n.point)!, q.sectors);
  }
  if (q.kind === 'higher') {
    const here = summits().find((s) => s.E === p.E && s.N === p.N)?.heightM ?? -Infinity;
    return summits().some((s) => {
      const d = distance(p, s);
      return d > 1 && d <= q.maxM && s.heightM >= here + q.riseM && inSectors(bearing(p, s)!, q.sectors);
    });
  }
  if (q.kind === 'houses-around') {
    const quarters = new Set<number>();
    for (const h of houses()) {
      const d = distance(p, h);
      if (d <= q.radiusM && d > 1) quarters.add(Math.round((bearing(p, h)! % 360) / 90) % 4);
    }
    return (quarters.size === 4) === q.holds;
  }
  const near = houses().filter((h) => distance(p, h) <= q.radiusM);
  return near.length > 0 && near.every((h) => inSectors(bearing(p, h)!, q.sectors));
}

/** Where the statement's feature is, seen from p — for feedback ("from there the road is west of you"). */
export function featureDirection(e: Evidence, p: Point): { bearingDeg: number; distanceM: number; sector: string } | null {
  const q = e.predicate;
  if (q.kind !== 'direction') return null;
  const n = nearestOf(q.target, p);
  if (n.inside) return null;
  const b = bearing(p, n.point)!;
  return { bearingDeg: b, distanceM: n.distanceM, sector: COMPASS_HE[compassPoint(b)] };
}

// ---------------------------------------------------------------- legs

export type Leg = {
  readonly index: number;
  /** Where the leg starts: A or the previous checkpoint. */
  readonly from: 'A' | CheckpointId;
  readonly to: CheckpointId;
/**
   * The points offered, in display order (letters א׳, ב׳, …). The order is fixed
   * per leg and set so the answer's letter differs from leg to leg; it says
   * nothing about the answer.
   */
  readonly candidates: readonly CandidateId[];
  readonly answer: CandidateId;
  /** Two true statements, two false ones (order shown as written). */
  readonly evidence: readonly Evidence[];
  readonly correctEvidence: readonly [string, string];
  /** First hint: which kind of evidence to look at. */
  readonly hint1: string;
  /** Second hint: the feature highlighted in both views, and what to check about it. */
  readonly hint2: { readonly feature: FeatureId; readonly text: string };
};

const E = (id: string, text: string, feature: FeatureId, predicate: EvidencePredicate): Evidence => ({ id, text, feature, predicate });

export const LEGS: readonly Leg[] = [
  {
    index: 0,
    from: 'A',
    to: 'H1',
    candidates: ['D1', 'H2', 'H1'],
    answer: 'H1',
    evidence: [
      E('l1-track-east', 'דרך עפר עוברת למרגלות הכיפה, ממזרח לכם.', 'track-east', { kind: 'direction', target: { road: 'track-east' }, sectors: ['E'], maxM: 260 }),
      E('l1-grove-nw', 'חורשה צמודה למדרון הצפון־מערבי של הכיפה.', 'G1', { kind: 'direction', target: { grove: 'G1' }, sectors: ['NW'], maxM: 160 }),
      E('l1-track-west', 'דרך עפר עוברת למרגלות הכיפה, ממערב לכם.', 'track-east', { kind: 'direction', target: { road: 'track-east' }, sectors: ['W'], maxM: 260 }),
      E('l1-stream-se', 'ערוץ הנחל עובר מדרום־מזרח לכם.', 'stream', { kind: 'direction', target: { water: 'stream' }, sectors: ['SE'], maxM: 320 }),
    ],
    correctEvidence: ['l1-track-east', 'l1-grove-nw'],
    hint1: 'בדקו באיזה צד שלכם עוברת דרך העפר, והיכן נמצאת החורשה הקרובה.',
    hint2: { feature: 'track-east', text: 'דרך העפר מודגשת במפה ובמודל. באיזה צד של הכיפה היא עוברת?' },
  },
  {
    index: 1,
    from: 'H1',
    to: 'H2',
    candidates: ['H2', 'D3', 'D2'],
    answer: 'H2',
    evidence: [
      E('l2-grove-se', 'מדרום־מזרח, מעבר לנחל, נראית החורשה שליד כיפה 1.', 'G1', { kind: 'direction', target: { grove: 'G1' }, sectors: ['SE'], maxM: 400 }),
      E('l2-road-w', 'דרך עפר עוברת בעמק שממערב לכם, כ־300 מ׳ מכם.', 'road-west', { kind: 'direction', target: { road: 'road-west' }, sectors: ['W'], minM: 200, maxM: 420 }),
      E('l2-grove-n', 'חורשה צמודה למדרון הצפוני של הכיפה.', 'G3', { kind: 'direction', target: { grove: 'G3' }, sectors: ['N', 'NE'], maxM: 160 }),
      E('l2-village-n', 'הכפר נמצא מצפון לכם.', 'village', { kind: 'direction', target: { point: 'village' }, sectors: ['N'], maxM: 900 }),
    ],
    correctEvidence: ['l2-grove-se', 'l2-road-w'],
    hint1: 'הביטו לאחור, אל החורשה שליד כיפה 1, ובדקו מה עובר בעמק שממערב לכם.',
    hint2: { feature: 'road-west', text: 'דרך העפר המערבית מודגשת במפה ובמודל. באיזה צד שלכם היא עוברת, ובאיזה מרחק?' },
  },
  {
    index: 2,
    from: 'H2',
    to: 'H3',
    candidates: ['D4', 'H3', 'D3'],
    answer: 'H3',
    evidence: [
      E('l3-village-nw', 'הכפר נראה מצפון־מערב, פחות מחצי ק״מ מכם.', 'village', { kind: 'direction', target: { point: 'village' }, sectors: ['NW'], maxM: 500 }),
      E('l3-grove-w', 'חורשה צמודה למדרון המערבי של הכיפה.', 'G2', { kind: 'direction', target: { grove: 'G2' }, sectors: ['W', 'SW'], maxM: 180 }),
      E('l3-village-n', 'הכפר נמצא מצפון לכם.', 'village', { kind: 'direction', target: { point: 'village' }, sectors: ['N'], maxM: 900 }),
      E('l3-road-n', 'הדרך הצפונית עוברת למרגלות הכיפה, מצפון לכם.', 'road-north', { kind: 'direction', target: { road: 'road-north' }, sectors: ['N'], maxM: 200 }),
    ],
    correctEvidence: ['l3-village-nw', 'l3-grove-w'],
    hint1: 'השוו באיזה כיוון ממכם נמצא הכפר, ומה צמוד למדרון שמתחתיכם.',
    hint2: { feature: 'G2', text: 'החורשה מודגשת במפה ובמודל. באיזה צד של הכיפה היא נמצאת?' },
  },
  {
    index: 3,
    from: 'H3',
    to: 'B',
    candidates: ['tower-yard', 'entrance', 'west-lane', 'square'],
    answer: 'square',
    evidence: [
      E('l4-around', 'סביבכם בתים מכל הצדדים — אתם בלב הכפר.', 'square', { kind: 'houses-around', radiusM: 70, holds: true }),
      E('l4-tower-e', 'מגדל המים נראה ממזרח לכם, כ־200 מ׳ מכם.', 'tower', { kind: 'direction', target: { point: 'tower' }, sectors: ['E', 'NE'], minM: 120, maxM: 280 }),
      E('l4-houses-n', 'כל הבתים הקרובים נמצאים מצפון לכם.', 'village', { kind: 'houses-only', sectors: ['N', 'NE', 'NW'], radiusM: 120 }),
      E('l4-tower-close', 'מגדל המים נמצא ממש לידכם.', 'tower', { kind: 'direction', target: { point: 'tower' }, sectors: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], maxM: 60 }),
    ],
    correctEvidence: ['l4-around', 'l4-tower-e'],
    hint1: 'בדקו אם יש בתים מכל צדדיכם, ובאיזה כיוון ובאיזה מרחק נמצא מגדל המים.',
    hint2: { feature: 'tower', text: 'מגדל המים מודגש במפה ובמודל. כמה רחוק הוא ממכם, ובאיזה כיוון?' },
  },
];

// ---------------------------------------------------------------- measurements

export function legStart(leg: Leg): Point {
  return leg.from === 'A' ? START : checkpoint(leg.from);
}

/** The planned leg: from its start to the real end point — exact, from the map geometry. */
export function plannedLeg(leg: Leg): { bearingDeg: number; distanceM: number } {
  const a = legStart(leg);
  const b = checkpoint(leg.to);
  return { bearingDeg: bearing(a, b)!, distanceM: distance(a, b) };
}

/** The leg start → a candidate: what the map gives for the point the learner marked. */
export function measuredTo(leg: Leg, id: CandidateId): { bearingDeg: number; distanceM: number } {
  const a = legStart(leg);
  const p = candidatePoint(id);
  return { bearingDeg: bearing(a, p)!, distanceM: distance(a, p) };
}

/** Tolerances for "matches the plan": compass and pace-count precision of the exercise. */
export const MATCH_TOLERANCE = { bearingDeg: 8, distanceFraction: 0.12 } as const;

export function matchesPlan(leg: Leg, id: CandidateId): boolean {
  const p = plannedLeg(leg);
  const m = measuredTo(leg, id);
  return angularDifference(p.bearingDeg, m.bearingDeg) <= MATCH_TOLERANCE.bearingDeg && Math.abs(m.distanceM - p.distanceM) <= p.distanceM * MATCH_TOLERANCE.distanceFraction;
}

/** Hebrew letters for a leg's candidates, in the leg's display order. */
export const LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳'] as const;
export function candidateLetters(leg: Leg): Record<CandidateId, string> {
  return Object.fromEntries(leg.candidates.map((id, k) => [id, LETTERS[k]])) as Record<CandidateId, string>;
}

export const LEG_TARGET_LABEL = CHECKPOINT_LABEL;
export const LEG_COUNT = ROUTE.length;
