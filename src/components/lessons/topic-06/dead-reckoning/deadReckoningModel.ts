/**
 * The dead-reckoning activity of lesson 6 ("ניווט עיוור"): the scenario, its
 * geometry and the learner's three steps — plan the pace count, set the
 * compass and count, decide what the finished count proves.
 *
 * A fictional training area in a local metric grid, north up: E grows east, N
 * grows north, origin at the sheet's south-west corner. Every distance is
 * horizontal and every bearing is clockwise from the grid north, which is also
 * the compass north of the exercise (no declination is modelled). The map, the
 * field view and the feedback read the same constants, so each number shown
 * comes from this geometry. Nothing here is rounded; rounding is for display.
 *
 * Pure data and a reducer — no React — so scripts/qa/dead-reckoning.test.mjs
 * runs it under plain Node.
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
/** Pace pairs per press of "advance", and the planned count. */
export const STEP_PAIRS = 100;
export const PLANNED_PAIRS = DISTANCE_M / PACE_M; // 800
/** How far the navigator sees in the sandstorm, metres. */
export const VISIBILITY_M = 30;

/** B — the planned destination: A + 1200 m at 62°. */
export const TARGET: Point = destination(START, AZIMUTH_DEG, DISTANCE_M);

/** The point `metres` along a heading from A. */
export const along = (metres: number, headingDeg = AZIMUTH_DEG): Point => destination(START, headingDeg, metres);
export const pairsToMetres = (pairs: number) => pairs * PACE_M;

// ---------------------------------------------------------------- the ground (same data in the map and the field view)

/** The two dirt roads that meet at A (a T-junction): one from the north, one west–east. */
export const ROADS: readonly { id: string; pts: readonly XY[] }[] = [
  { id: 'road-north', pts: [[120, 900], [160, 700], [200, 450], [222, 280], [230, 140]] },
  { id: 'road-ew', pts: [[0, 190], [110, 165], [230, 140], [520, 112], [760, 60], [820, 0]] },
];
export const ROAD_WIDTH_M = 5;

/** Where the dry wadi crosses the planned line: 450 m from A = 300 pace pairs. */
export const WADI_CROSSING_M = 450;
const WADI_X = along(WADI_CROSSING_M);
/** A dry wadi (ערוץ יבש) running north–south across the leg. */
export const WADI: readonly XY[] = [
  [540, 900],
  [565, 760],
  [596, 610],
  [610, 470],
  [WADI_X.E, WADI_X.N],
  [660, 210],
  [672, 90],
  [690, 0],
];
export const WADI_WIDTH_M = 10;

/** A low hill with an antenna mast: a landmark on the map, 160 m north-west of B. */
export const HILL = (() => {
  const c = destination(TARGET, 315, 160);
  return { center: c, radiusM: 70, antenna: c, fromTargetM: 160, fromTargetDeg: 315 } as const;
})();

// ---------------------------------------------------------------- what the errors would do (the verify step)

/** A small compass error for the explanation: the same 1,200 m walked at 65° instead of 62°. */
export const DEVIATION_DEG = 3;
/** Gap between the planned point and the deviated one after `metres` (same distance walked on both lines). */
export const deviationGap = (metres: number, deg = DEVIATION_DEG) => 2 * metres * Math.sin((deg * Math.PI) / 360);
/** A shorter pace in the sand: 800 pairs of 1.4 m stop this far before B. */
export const SHORT_PACE_M = 1.4;
export const shortPaceShortfall = () => DISTANCE_M - PLANNED_PAIRS * SHORT_PACE_M;

// ---------------------------------------------------------------- step 1 · plan the count

export type PaceOption = 800 | 1200 | 1600 | 1800;
export const PACE_OPTIONS: readonly PaceOption[] = [800, 1200, 1600, 1800];
/** What each wrong count means. */
export const PACE_ERROR: Record<Exclude<PaceOption, 800>, 'metres' | 'single-steps' | 'multiplied'> = {
  1200: 'metres',
  1600: 'single-steps',
  1800: 'multiplied',
};
/** Another navigator's double pace, for the feedback: the count depends on the pace. */
export const OTHER_PACE_M = 1.6;

// ---------------------------------------------------------------- step 2 · set the compass

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

// ---------------------------------------------------------------- step 3 · what the count proves

export type VerifyOption = 'proof' | 'estimate' | 'keep-walking';
export const VERIFY_OPTIONS: readonly VerifyOption[] = ['proof', 'estimate', 'keep-walking'];
export const VERIFY_RIGHT: VerifyOption = 'estimate';

// ---------------------------------------------------------------- state

export type StepId = 'plan' | 'heading' | 'walk' | 'verify';
export const STEPS: readonly { id: StepId; n: 1 | 2 | 3 }[] = [
  { id: 'plan', n: 1 },
  { id: 'heading', n: 2 },
  { id: 'walk', n: 2 },
  { id: 'verify', n: 3 },
];

export type State = {
  readonly step: StepId;
  readonly pace: PaceOption | null;
  /** The answer the last check judged (stale once the choice changes). */
  readonly paceChecked: PaceOption | null;
  /** Compass setting, whole degrees 0–359. */
  readonly heading: number;
  /** The setting the last departure attempt judged, while it was off. */
  readonly headingChecked: number | null;
  /** Pace pairs counted so far, 0–800 in steps of 100. */
  readonly pairs: number;
  readonly verify: VerifyOption | null;
  readonly verifyChecked: VerifyOption | null;
  /** Every check, for announcing each result once. */
  readonly attempts: number;
};

export const INITIAL_STATE: State = {
  step: 'plan',
  pace: null,
  paceChecked: null,
  heading: 0,
  headingChecked: null,
  pairs: 0,
  verify: null,
  verifyChecked: null,
  attempts: 0,
};

export type Action =
  | { type: 'choosePace'; value: PaceOption }
  | { type: 'checkPace' }
  | { type: 'toHeading' }
  | { type: 'setHeading'; value: number }
  | { type: 'turn'; by: number }
  | { type: 'depart' }
  | { type: 'advance' }
  | { type: 'chooseVerify'; value: VerifyOption }
  | { type: 'checkVerify' }
  | { type: 'restart' };

/** Derived view: each step's current verdict (null when nothing is checked or the answer changed since). */
export function view(s: State) {
  const pace = s.paceChecked !== null && s.paceChecked === s.pace ? (s.pace === PLANNED_PAIRS ? 'right' : PACE_ERROR[s.pace as Exclude<PaceOption, 800>]) : null;
  const heading = s.headingChecked !== null && s.headingChecked === s.heading ? evaluateHeading(s.heading) : null;
  const verify = s.verifyChecked !== null && s.verifyChecked === s.verify ? (s.verify === VERIFY_RIGHT ? 'right' : 'wrong') : null;
  const metres = pairsToMetres(s.pairs);
  return {
    pace,
    heading,
    verify,
    metres,
    /**
     * Step 1 asks for the count, so until it is checked right nothing on the card
     * shows it (the field counter, the map's 100-pair ticks, the legend, the example).
     */
    countKnown: s.step !== 'plan' || pace === 'right',
    /** The count is complete — not the same as having arrived. */
    counted: s.pairs >= PLANNED_PAIRS,
    done: verify === 'right',
    /** The navigator stands in the wadi (300 pairs): the one terrain check on the way. */
    atWadi: s.step !== 'plan' && s.step !== 'heading' && metres === WADI_CROSSING_M,
    stepNumber: STEPS.find((x) => x.id === s.step)!.n,
  };
}

export function reducer(s: State, a: Action): State {
  const v = view(s);
  switch (a.type) {
    case 'choosePace':
      return s.step !== 'plan' || v.pace === 'right' ? s : { ...s, pace: a.value };
    case 'checkPace':
      if (s.step !== 'plan' || s.pace === null || v.pace) return s;
      return { ...s, paceChecked: s.pace, attempts: s.attempts + 1 };
    case 'toHeading':
      return s.step === 'plan' && v.pace === 'right' ? { ...s, step: 'heading' } : s;
    case 'setHeading':
      if (s.step !== 'heading') return s;
      return { ...s, heading: normalizeDegrees(Math.round(a.value)) };
    case 'turn':
      if (s.step !== 'heading') return s;
      return { ...s, heading: normalizeDegrees(s.heading + a.by) };
    case 'depart':
      if (s.step !== 'heading') return s;
      if (evaluateHeading(s.heading).kind === 'right') return { ...s, step: 'walk', headingChecked: null, attempts: s.attempts + 1 };
      return { ...s, headingChecked: s.heading, attempts: s.attempts + 1 };
    case 'advance': {
      if (s.step !== 'walk') return s;
      const pairs = Math.min(PLANNED_PAIRS, s.pairs + STEP_PAIRS);
      return { ...s, pairs, step: pairs >= PLANNED_PAIRS ? 'verify' : 'walk' };
    }
    case 'chooseVerify':
      return s.step !== 'verify' || v.done ? s : { ...s, verify: a.value };
    case 'checkVerify':
      if (s.step !== 'verify' || s.verify === null || v.verify) return s;
      return { ...s, verifyChecked: s.verify, attempts: s.attempts + 1 };
    case 'restart':
      return INITIAL_STATE;
  }
}

/** Position the count gives (the estimate): along the planned azimuth once under way, A before that. */
export function estimateAt(metres: number): Point {
  return metres <= 0 ? START : along(metres);
}

export const distanceFromStart = (p: Point) => distance(START, p);
