/**
 * Scenario contract for the lesson-6 activity "אין GPS. מה עדיין אפשר לבדוק?"
 * (design/mockups/topic-06-principles-2026-10-08/claude-location-check-prompt.md §4).
 *
 * A fictional training area in a local metric grid — not a real place and not a
 * live GPS: E grows east, N grows north, origin at the south-west corner,
 * 0 ≤ E ≤ 1400, 0 ≤ N ≤ 1050. All distances are horizontal, in the map plane,
 * and every bearing is relative to the local grid north.
 *
 * This is the single source for every view: the eye-level 3D observation, the
 * printed map, the measurements and the evaluation all read the points,
 * polygons and road control points below by the same IDs. Nothing here is
 * rounded; rounding happens on display only.
 *
 * No imports, so plain Node runs it (scripts/qa/location-check.test.mjs).
 */

export type Point = { readonly E: number; readonly N: number };
export type XY = readonly [number, number];

export const WORLD_BOUNDS = { minE: 0, maxE: 1400, minN: 0, maxN: 1050 } as const;

/** Last known position — drawn on the map as a hollow, faded marker. */
export const LAST_KNOWN: Point = { E: 650, N: 120 };

export type CandidateId = 'area-1' | 'area-2';
/** Location hypotheses. Their centres are where the exercise measures from; the halo is a selection mark, not a GPS accuracy radius. */
export const CANDIDATES: readonly { id: CandidateId; label: string; center: Point }[] = [
  { id: 'area-1', label: 'אזור 1', center: { E: 650, N: 420 } },
  { id: 'area-2', label: 'אזור 2', center: { E: 890, N: 300 } },
];

/**
 * Where the observation was actually taken (= the centre of area 1). Used only
 * to build the eye-level view; never drawn on the map or the model before the
 * learner's check succeeds.
 */
export const OBSERVER: Point = { E: 650, N: 420 };
/** Eye above the ground at OBSERVER, metres. */
export const EYE_HEIGHT_M = 1.7;

/** The road fork — the junction of the three dirt-road arms. */
export const FORK: Point = { E: 950, N: 740 };
/** Approximate main summit; its real height comes from the height field. */
export const RIDGE_SUMMIT_HINT: Point = { E: 1000, N: 800 };

export type GroveId = 'G1' | 'G2';
/**
 * Landmarks only: drawn in the observation and on the map, never part of the
 * check. Both groves share one base outline (local metres around the centre).
 */
export const GROVE_BASE_POLYGON: readonly XY[] = [
  [-45, -20],
  [-30, -45],
  [15, -50],
  [45, -20],
  [40, 25],
  [0, 50],
  [-35, 30],
];
export const GROVES: readonly { id: GroveId; center: Point; mapLabel: string; treeSeed: number }[] = [
  { id: 'G1', center: { E: 430, N: 700 }, mapLabel: 'חורשה א׳', treeSeed: 0x6a09e667 },
  { id: 'G2', center: { E: 670, N: 580 }, mapLabel: 'חורשה ב׳', treeSeed: 0xbb67ae85 },
];

/** Shared dirt-road width (metres) — the same in the observation and on the map. */
export const ROAD_WIDTH_M = 8;

/**
 * Road control points. One main road from the south-east, through the fork, to
 * the north-east; one branch from the fork to the north-west. A smooth curve
 * passes through every control point (locationCheckTerrain roads()), so FORK
 * is on both curves exactly.
 *
 * Intermediate points only shape the curves so the fork reads from the
 * observation point. Seen from there F lies on the skyline brow (the slope is
 * seen at a grazing angle), so an arm shows only where it runs roughly toward
 * the observer — its 8 m width then faces the eye; an arm that traverses the
 * slope collapses to a hairline. Both arms on the near slope therefore meet F
 * almost head-on: the main road arrives from the south, the branch leaves
 * west-south-west before turning north round the west shoulder; the main
 * road's continuation crosses the crest and drops out of sight. End points and
 * F are the brief's values; scripts/qa/location-check.test.mjs checks which
 * arms are visible.
 */
export const ROAD_CONTROL_POINTS: { readonly main: readonly XY[]; readonly branch: readonly XY[] } = {
  main: [
    [1080, 350],
    [1042, 440],
    [992, 530],
    [957, 620],
    [943, 690],
    [FORK.E, FORK.N],
    [985, 797],
    [1058, 868],
    [1130, 930],
    [1190, 990],
  ],
  branch: [
    [FORK.E, FORK.N],
    [917, 721],
    [878, 712],
    [843, 723],
    [814, 762],
    [795, 830],
    [783, 900],
    [780, 960],
  ],
};

/** What the learner measured at the observation point. */
export const READINGS = {
  /** Compass reading to the fork, degrees from local grid north. */
  forkBearingDeg: 43,
  forkBearingToleranceDeg: 5,
  /** Paced horizontal distance from the last known position, metres. */
  distanceM: 300,
  distanceMinM: 260,
  distanceMaxM: 340,
} as const;

/** Height field generator (brief §6) — a fictional input, not a geological model. */
export const HEIGHT_DATUM_M = 280;
