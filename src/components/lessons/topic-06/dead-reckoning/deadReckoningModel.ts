/**
 * The dead-reckoning activity of lesson 6 ("ניווט עיוור"): the scenario, its
 * geometry and the learner's three steps — prepare (the pace count and the
 * compass), walk the leg through the sandstorm in 100-pair segments with one
 * landmark check on the way, then decide what the finished count proves.
 *
 * A fictional training area in a local metric grid, north up: E grows east, N
 * grows north, origin at the sheet's south-west corner. Every distance is
 * horizontal and every bearing is clockwise from the grid north, which is also
 * the compass north of the exercise (no declination is modelled). The planning
 * map, the first-person terrain (deadReckoningTerrain), the camera and the
 * feedback all read these constants, so every number shown comes from this
 * geometry. Nothing here is rounded; rounding is for display.
 *
 * Pure data and a reducer — no React, no three.js — so
 * scripts/qa/dead-reckoning.test.mjs runs it under plain Node.
 */
import { angularDifference, destination, distance, normalizeDegrees, signedTurn } from '../locationCheckGeometry';
import type { Point, XY } from '../locationCheckScenario';

export type { Point, XY };

// ---------------------------------------------------------------- the planned leg

/** The sheet, metres. */
export const SHEET = { width: 1400, height: 900 } as const;

/** A — a known point: the junction of two dirt roads. */
export const START: Point = { E: 230, N: 140 };
/** The planned azimuth and horizontal distance from A to B. */
export const AZIMUTH_DEG = 62;
export const DISTANCE_M = 1200;
/** The example's double pace, from the navigator's own measurement — not a value for everyone. */
export const PACE_M = 1.5;
/** Pace pairs per segment (one press of "advance"), and the planned count. */
export const STEP_PAIRS = 100;
export const PLANNED_PAIRS = DISTANCE_M / PACE_M; // 800
export const SEGMENT_M = STEP_PAIRS * PACE_M; // 150
/** About how far the navigator can still recognise things in the sandstorm, metres (a gradual fade, not a wall). */
export const VISIBILITY_M = 30;

/** B — the planned destination: A + 1200 m at 62°. */
export const TARGET: Point = destination(START, AZIMUTH_DEG, DISTANCE_M);

/** The point `metres` along a heading from A. */
export const along = (metres: number, headingDeg = AZIMUTH_DEG): Point => destination(START, headingDeg, metres);
export const pairsToMetres = (pairs: number) => pairs * PACE_M;
/** The stops: 0, 100, …, 800 pace pairs. */
export const STOPS: readonly number[] = Array.from({ length: PLANNED_PAIRS / STEP_PAIRS + 1 }, (_, k) => k * STEP_PAIRS);

// ---------------------------------------------------------------- the ground (same data in the map and the terrain)

/** The two dirt roads that meet at A (a T-junction): one from the north, one west–east. */
export const ROADS: readonly { id: string; pts: readonly XY[] }[] = [
  { id: 'road-north', pts: [[120, 900], [160, 700], [200, 450], [222, 280], [230, 140]] },
  { id: 'road-ew', pts: [[0, 190], [110, 165], [230, 140], [520, 112], [760, 60], [820, 0]] },
];
export const ROAD_WIDTH_M = 5;

/**
 * The dry wadi's centre line crosses the planned line 615 m from A — just past
 * the 400-pair stop (600 m), so from that stop its near bank lies a few metres
 * ahead and the whole channel is in sight; from every other stop it is at
 * least 135 m away and hidden by the storm.
 */
export const WADI_CROSSING_M = 615;
/** The stop that has the wadi in sight. */
export const WADI_STOP_PAIRS = 400;
const WADI_X = along(WADI_CROSSING_M);
/** The wadi's direction where it crosses the leg: NW–SE, so from the 400-pair stop it runs obliquely across the view. */
const WADI_DIR = 140;
/** A point `m` metres along the wadi from the crossing (south-east positive), `side` metres off it to the south-west. */
const wadiAt = (m: number, side = 0): XY => {
  const p = destination(destination(WADI_X, m >= 0 ? WADI_DIR : WADI_DIR + 180, Math.abs(m)), WADI_DIR + 90, side);
  return [p.E, p.N];
};
/** A dry wadi (ערוץ יבש) running from the north edge of the sheet to the south edge, across the leg. */
export const WADI: readonly XY[] = [
  [684, 900],
  [688, 800],
  [684, 700],
  [690, 600],
  wadiAt(-110, -6),
  wadiAt(-50, -3),
  wadiAt(-22, 2.5),
  [WADI_X.E, WADI_X.N],
  wadiAt(22, -2.5),
  wadiAt(50, 2),
  wadiAt(110, 6),
  [850, 240],
  [845, 130],
  [850, 0],
];
/** Width between the bank tops, metres — the channel the map draws and the terrain carves. */
export const WADI_WIDTH_M = 14;

/** A low hill with an antenna mast: a landmark on the map, 160 m north-west of B — far beyond sight on the whole walk. */
export const HILL = (() => {
  const c = destination(TARGET, 315, 160);
  return { center: c, radiusM: 70, antenna: c, fromTargetM: 160, fromTargetDeg: 315 } as const;
})();

// ---------------------------------------------------------------- what the errors would do (the debrief)

/** A small compass error for the explanation: the same 1,200 m walked at 65° instead of 62°. */
export const DEVIATION_DEG = 3;
/** Gap between the planned point and the deviated one after `metres` (same distance walked on both lines). */
export const deviationGap = (metres: number, deg = DEVIATION_DEG) => 2 * metres * Math.sin((deg * Math.PI) / 360);
/** A shorter pace in the sand: 800 pairs of 1.4 m stop this far before B. */
export const SHORT_PACE_M = 1.4;
export const shortPaceShortfall = () => DISTANCE_M - PLANNED_PAIRS * SHORT_PACE_M;
/** Where each debrief case really ends after the full count. */
export const DEBRIEF_END = {
  deviation: along(DISTANCE_M, AZIMUTH_DEG + DEVIATION_DEG),
  'short-pace': along(PLANNED_PAIRS * SHORT_PACE_M),
} as const;
export type DebriefCase = keyof typeof DEBRIEF_END;
export const DEBRIEF_CASES: readonly DebriefCase[] = ['deviation', 'short-pace'];

// ---------------------------------------------------------------- step 1 · plan the count

/** The learner types the count. Each common slip is recognised by the number it gives. */
export type CountVerdict = 'right' | 'metres' | 'single-steps' | 'multiplied' | 'other';
export function evaluateCount(n: number): CountVerdict {
  if (n === PLANNED_PAIRS) return 'right';
  if (n === DISTANCE_M) return 'metres';
  if (n === PLANNED_PAIRS * 2) return 'single-steps';
  if (n === DISTANCE_M * PACE_M) return 'multiplied';
  return 'other';
}
/** Another navigator's double pace, for the feedback: the count depends on the pace. */
export const OTHER_PACE_M = 1.6;
/** The largest count the field accepts (a typo guard, not a hint). */
export const COUNT_MAX = 99999;

// ---------------------------------------------------------------- step 1 · set the compass

export type HeadingError =
  | { readonly kind: 'right' }
  | { readonly kind: 'off'; readonly turnDeg: number; readonly endGapM: number; readonly cause: 'reverse' | 'counter-clockwise' | 'from-east' | null };

export function evaluateHeading(heading: number): HeadingError {
  const h = normalizeDegrees(Math.round(heading));
  if (h === AZIMUTH_DEG) return { kind: 'right' };
  const turnDeg = signedTurn(h, AZIMUTH_DEG);
  const endGapM = deviationGap(DISTANCE_M, angularDifference(h, AZIMUTH_DEG));
  const cause =
    angularDifference(h, AZIMUTH_DEG + 180) <= 5
      ? 'reverse'
      : angularDifference(h, 360 - AZIMUTH_DEG) <= 1
        ? 'counter-clockwise'
        : angularDifference(h, 90 - AZIMUTH_DEG) <= 1
          ? 'from-east'
          : null;
  return { kind: 'off', turnDeg, endGapM, cause };
}

// ---------------------------------------------------------------- step 2 · the landmark on the way

/** What crosses the way at the 400-pair stop — told apart by comparing the ground with the map. */
export type SignOption = 'wadi' | 'road' | 'hill';
export const SIGN_OPTIONS: readonly SignOption[] = ['wadi', 'road', 'hill'];
export const SIGN_RIGHT: SignOption = 'wadi';

// ---------------------------------------------------------------- step 3 · what the count proves

export type VerifyOption = 'proof' | 'estimate' | 'keep-walking';
export const VERIFY_OPTIONS: readonly VerifyOption[] = ['proof', 'estimate', 'keep-walking'];
export const VERIFY_RIGHT: VerifyOption = 'estimate';

// ---------------------------------------------------------------- state

export type StepId = 'plan' | 'walk' | 'verify';
export const STEPS: readonly { id: StepId; n: 1 | 2 | 3 }[] = [
  { id: 'plan', n: 1 },
  { id: 'walk', n: 2 },
  { id: 'verify', n: 3 },
];

export type State = {
  readonly step: StepId;
  /** The count the learner typed (null while the field is empty or not a whole number). */
  readonly count: number | null;
  /** The count the last check judged (stale once the field changes). */
  readonly countChecked: number | null;
  /** Compass setting, whole degrees 0–359. */
  readonly heading: number;
  /** The setting the last departure attempt judged, while it was off. */
  readonly headingChecked: number | null;
  /** Pace pairs counted at the last stop, 0–800 in steps of 100. */
  readonly pairs: number;
  /** A segment is being walked (pairs → pairs + 100 on arrival). Presses meanwhile are ignored. */
  readonly moving: boolean;
  readonly sign: SignOption | null;
  readonly signChecked: SignOption | null;
  readonly verify: VerifyOption | null;
  readonly verifyChecked: VerifyOption | null;
  /** The error case drawn on the debrief map. */
  readonly debrief: DebriefCase;
  /** Every check, for announcing each result once. */
  readonly attempts: number;
};

export const INITIAL_STATE: State = {
  step: 'plan',
  count: null,
  countChecked: null,
  heading: 0,
  headingChecked: null,
  pairs: 0,
  moving: false,
  sign: null,
  signChecked: null,
  verify: null,
  verifyChecked: null,
  debrief: 'deviation',
  attempts: 0,
};

export type Action =
  | { type: 'setCount'; value: number | null }
  | { type: 'checkCount' }
  | { type: 'setHeading'; value: number }
  | { type: 'turn'; by: number }
  | { type: 'depart' }
  | { type: 'advance' }
  | { type: 'arrive' }
  | { type: 'chooseSign'; value: SignOption }
  | { type: 'checkSign' }
  | { type: 'chooseVerify'; value: VerifyOption }
  | { type: 'checkVerify' }
  | { type: 'setDebrief'; value: DebriefCase }
  | { type: 'restart' };

/** Derived view: each check's current verdict (null when nothing is checked or the answer changed since). */
export function view(s: State) {
  const count = s.countChecked !== null && s.countChecked === s.count ? evaluateCount(s.count) : null;
  const heading = s.headingChecked !== null && s.headingChecked === s.heading ? evaluateHeading(s.heading) : null;
  const sign = s.signChecked !== null && s.signChecked === s.sign ? (s.sign === SIGN_RIGHT ? 'right' : 'wrong') : null;
  const verify = s.verifyChecked !== null && s.verifyChecked === s.verify ? (s.verify === VERIFY_RIGHT ? 'right' : 'wrong') : null;
  const metres = pairsToMetres(s.pairs);
  /** Standing at the stop that has the wadi in sight. */
  const atWadi = s.step === 'walk' && !s.moving && s.pairs === WADI_STOP_PAIRS;
  return {
    count,
    heading,
    sign,
    verify,
    metres,
    /**
     * Step 1 asks for the count, so until it is checked right nothing on the card
     * shows it (the counter, the map's 100-pair ticks, labels, ARIA).
     */
    countKnown: s.step !== 'plan' || count === 'right',
    /** Step 1's second half: the count is right, the compass is next. */
    phase: s.step === 'plan' ? (count === 'right' ? ('compass' as const) : ('count' as const)) : null,
    atWadi,
    /** The wadi has been told apart (its label may show while it is in sight). */
    wadiKnown: sign === 'right',
    /** The next segment may start: under way, standing, the count not finished, the landmark at 400 identified. */
    canAdvance: s.step === 'walk' && !s.moving && s.pairs < PLANNED_PAIRS && !(s.pairs === WADI_STOP_PAIRS && sign !== 'right'),
    /** The count is complete — not the same as having arrived. */
    counted: s.pairs >= PLANNED_PAIRS,
    done: verify === 'right',
    stepNumber: STEPS.find((x) => x.id === s.step)!.n,
  };
}

export function reducer(s: State, a: Action): State {
  const v = view(s);
  switch (a.type) {
    case 'setCount':
      if (s.step !== 'plan' || v.count === 'right') return s;
      return { ...s, count: a.value === null || !Number.isInteger(a.value) || a.value < 0 || a.value > COUNT_MAX ? null : a.value };
    case 'checkCount':
      if (s.step !== 'plan' || s.count === null || v.count) return s;
      return { ...s, countChecked: s.count, attempts: s.attempts + 1 };
    case 'setHeading':
      if (v.phase !== 'compass') return s;
      return { ...s, heading: normalizeDegrees(Math.round(a.value)) };
    case 'turn':
      if (v.phase !== 'compass') return s;
      return { ...s, heading: normalizeDegrees(s.heading + Math.round(a.by)) };
    case 'depart':
      if (v.phase !== 'compass') return s;
      if (evaluateHeading(s.heading).kind === 'right') return { ...s, step: 'walk', headingChecked: null, attempts: s.attempts + 1 };
      return { ...s, headingChecked: s.heading, attempts: s.attempts + 1 };
    case 'advance':
      // One segment at a time: a press while walking, before the landmark is identified or after 800 does nothing.
      return v.canAdvance ? { ...s, moving: true } : s;
    case 'arrive': {
      if (s.step !== 'walk' || !s.moving) return s;
      const pairs = Math.min(PLANNED_PAIRS, s.pairs + STEP_PAIRS);
      return { ...s, pairs, moving: false, step: pairs >= PLANNED_PAIRS ? 'verify' : 'walk' };
    }
    case 'chooseSign':
      return !v.atWadi || v.sign === 'right' ? s : { ...s, sign: a.value };
    case 'checkSign':
      if (!v.atWadi || s.sign === null || v.sign) return s;
      return { ...s, signChecked: s.sign, attempts: s.attempts + 1 };
    case 'chooseVerify':
      return s.step !== 'verify' || v.done ? s : { ...s, verify: a.value };
    case 'checkVerify':
      if (s.step !== 'verify' || s.verify === null || v.verify) return s;
      return { ...s, verifyChecked: s.verify, attempts: s.attempts + 1 };
    case 'setDebrief':
      return v.done ? { ...s, debrief: a.value } : s;
    case 'restart':
      return INITIAL_STATE;
  }
}

/** Position the count gives (the estimate): along the planned azimuth once under way, A before that. */
export function estimateAt(metres: number): Point {
  return metres <= 0 ? START : along(metres);
}

export const distanceFromStart = (p: Point) => distance(START, p);
