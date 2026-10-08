/**
 * Evaluation and state machine of the location-check activity — pure, no
 * React, no three.js (scripts/qa/location-check.test.mjs drives it directly).
 *
 * The question is a decision between two hypotheses: is the observation from
 * area 1 or from area 2? The learner chooses one area; the verdict is never
 * "is area 1 selected": the bearing to the road split and the distance from
 * the last known position are computed from the chosen area's centre and
 * compared with the two field measurements. Both are always part of the
 * check, and nothing else is. The groves are landmarks only.
 */
import { CANDIDATES, FORK, LAST_KNOWN, READINGS, type CandidateId } from './locationCheckScenario';
import { angularDifference, bearing, distance } from './locationCheckGeometry';

export type Selections = {
  readonly candidateId: CandidateId | null;
};

export type DirectionCheck = {
  /** Grid bearing from the hypothesis centre to the road split. */
  readonly predictedDeg: number;
  readonly observedDeg: number;
  readonly differenceDeg: number;
  readonly consistent: boolean;
};

export type DistanceCheck = {
  /** Horizontal distance from the last known position to the hypothesis centre. */
  readonly predictedM: number;
  readonly observedM: number;
  readonly consistent: boolean;
  /** How many of the hypotheses this distance fits — 2 means it cannot decide between them. */
  readonly fitsCandidates: number;
};

export type Evaluation =
  | { readonly kind: 'missing' }
  | {
      readonly kind: 'supported' | 'contradicted';
      readonly candidateId: CandidateId;
      readonly direction: DirectionCheck;
      readonly distance: DistanceCheck;
    };

export const EMPTY_SELECTIONS: Selections = { candidateId: null };

export function candidateCenter(id: CandidateId) {
  return CANDIDATES.find((c) => c.id === id)!.center;
}

export function directionCheck(id: CandidateId): DirectionCheck {
  // Candidate centres never coincide with the road split, so the bearing is defined.
  const predictedDeg = bearing(candidateCenter(id), FORK)!;
  const differenceDeg = angularDifference(predictedDeg, READINGS.forkBearingDeg);
  return { predictedDeg, observedDeg: READINGS.forkBearingDeg, differenceDeg, consistent: differenceDeg <= READINGS.forkBearingToleranceDeg };
}

const inDistanceRange = (m: number) => m >= READINGS.distanceMinM && m <= READINGS.distanceMaxM;

export function distanceCheck(id: CandidateId): DistanceCheck {
  const predictedM = distance(LAST_KNOWN, candidateCenter(id));
  return {
    predictedM,
    observedM: READINGS.distanceM,
    consistent: inDistanceRange(predictedM),
    fitsCandidates: CANDIDATES.filter((c) => inDistanceRange(distance(LAST_KNOWN, c.center))).length,
  };
}

export function evaluate(sel: Selections): Evaluation {
  if (!sel.candidateId) return { kind: 'missing' };
  const direction = directionCheck(sel.candidateId);
  const dist = distanceCheck(sel.candidateId);
  const kind = direction.consistent && dist.consistent ? 'supported' : 'contradicted';
  return { kind, candidateId: sel.candidateId, direction, distance: dist };
}

// ---------------------------------------------------------------- state machine

export type GpsReasonId = 'blocked' | 'interference' | 'battery';

export type State = {
  readonly gpsStatus: 'unavailable';
  readonly selections: Selections;
  /** Snapshot of the last checked input and its result. */
  readonly attempt: { readonly input: Selections; readonly result: Evaluation } | null;
  readonly attempts: number;
  readonly gpsReason: GpsReasonId;
  /** Bumped by reset — the observation re-centres its camera on it. */
  readonly resetToken: number;
};

export const INITIAL_STATE: State = {
  gpsStatus: 'unavailable',
  selections: EMPTY_SELECTIONS,
  attempt: null,
  attempts: 0,
  gpsReason: 'blocked',
  resetToken: 0,
};

export type Action =
  | { type: 'selectCandidate'; id: CandidateId }
  | { type: 'check' }
  | { type: 'reset' }
  | { type: 'setGpsReason'; id: GpsReasonId };

export function reducer(state: State, action: Action): State {
  const sel = state.selections;
  switch (action.type) {
    case 'selectCandidate':
      return { ...state, selections: { ...sel, candidateId: action.id } };
    case 'check':
      return { ...state, attempt: { input: sel, result: evaluate(sel) }, attempts: state.attempts + 1 };
    case 'reset':
      return { ...INITIAL_STATE, resetToken: state.resetToken + 1 };
    case 'setGpsReason':
      return { ...state, gpsReason: action.id };
  }
}

export function sameSelections(a: Selections, b: Selections): boolean {
  return a.candidateId === b.candidateId;
}

/**
 * What the screen may show: a result only while the selections still equal the
 * checked snapshot; otherwise the old result is stale ("הבחירה השתנתה — בדקו שוב").
 */
export function view(state: State) {
  const stale = !!state.attempt && !sameSelections(state.attempt.input, state.selections);
  const result = state.attempt && !stale ? state.attempt.result : null;
  return { stale, result, solved: result?.kind === 'supported' };
}
