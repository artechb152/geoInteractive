/**
 * State of the terrain-association activity: the mode (learn / practice), the
 * learn-mode selection, and the practice — the current leg, the learner's
 * three answers (the point, two pieces of evidence, the direction-and-distance
 * comparison), the last check, the hint level and what was verified so far.
 * Pure reducer, so scripts/qa/terrain-nav.test.mjs runs every flow under Node.
 */
import { LEGS, evidenceHolds, candidatePoint, matchesPlan, type CandidateId, type FeatureId, type Leg } from './terrainNavPractice';

export type Mode = 'learn' | 'practice';
export type Comparison = 'match' | 'mismatch';

export type Selections = {
  readonly candidate: CandidateId | null;
  readonly evidence: readonly string[];
  readonly comparison: Comparison | null;
};

export const EMPTY_SELECTIONS: Selections = { candidate: null, evidence: [], comparison: null };
/** How many statements make the evidence step. */
export const EVIDENCE_COUNT = 2;

export type Evaluation =
  /** No point marked yet. */
  | { readonly kind: 'missing' }
  /** The marked point is not where the learner is. `comparisonRight`: they also said the plan does not match it. */
  | { readonly kind: 'wrong-location'; readonly candidate: CandidateId; readonly comparisonRight: boolean | null }
  /** The right point, with the evidence or the comparison incomplete or wrong — no full credit for a guess. */
  | {
      readonly kind: 'partial';
      readonly candidate: CandidateId;
      /** Chosen statements that are false here. */
      readonly wrongEvidence: readonly string[];
      /** How many more true statements are needed. */
      readonly evidenceMissing: number;
      readonly comparison: 'missing' | 'wrong' | 'right';
    }
  | { readonly kind: 'verified'; readonly candidate: CandidateId };

export type LegOutcome = 'verified' | 'explained';

export type State = {
  readonly mode: Mode;
  readonly learnFeature: FeatureId | null;
  /** Current leg, 0–3; LEGS.length once the route is done. */
  readonly leg: number;
  readonly outcomes: readonly (LegOutcome | null)[];
  readonly sel: Selections;
  /** The last check and the selections it judged. */
  readonly checked: { readonly sel: Selections; readonly result: Evaluation } | null;
  readonly hint: 0 | 1 | 2;
  readonly revealed: boolean;
  /** Checks in this leg — a key for announcing each new result. */
  readonly attempts: number;
};

export const INITIAL_STATE: State = {
  mode: 'learn',
  learnFeature: null,
  leg: 0,
  outcomes: LEGS.map(() => null),
  sel: EMPTY_SELECTIONS,
  checked: null,
  hint: 0,
  revealed: false,
  attempts: 0,
};

export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'selectFeature'; id: FeatureId | null }
  | { type: 'selectCandidate'; id: CandidateId }
  | { type: 'toggleEvidence'; id: string }
  | { type: 'setComparison'; value: Comparison }
  | { type: 'check' }
  | { type: 'hint' }
  | { type: 'reveal' }
  | { type: 'next' }
  | { type: 'restart' };

export function evaluate(leg: Leg, sel: Selections): Evaluation {
  if (!sel.candidate) return { kind: 'missing' };
  const fits = matchesPlan(leg, sel.candidate);
  if (sel.candidate !== leg.answer) {
    return { kind: 'wrong-location', candidate: sel.candidate, comparisonRight: sel.comparison ? (sel.comparison === 'match') === fits : null };
  }
  const here = candidatePoint(leg.answer);
  const byId = new Map(leg.evidence.map((e) => [e.id, e]));
  const wrongEvidence = sel.evidence.filter((id) => !evidenceHolds(byId.get(id)!, here));
  const right = sel.evidence.length - wrongEvidence.length;
  const comparison = !sel.comparison ? 'missing' : (sel.comparison === 'match') === fits ? 'right' : 'wrong';
  if (wrongEvidence.length === 0 && right === EVIDENCE_COUNT && comparison === 'right') return { kind: 'verified', candidate: sel.candidate };
  return { kind: 'partial', candidate: sel.candidate, wrongEvidence, evidenceMissing: Math.max(0, EVIDENCE_COUNT - right), comparison };
}

const sameSel = (a: Selections, b: Selections) =>
  a.candidate === b.candidate && a.comparison === b.comparison && a.evidence.length === b.evidence.length && a.evidence.every((id) => b.evidence.includes(id));

/** Derived view of the state: the current leg, whether the last result still describes the selections, and whether the leg is closed. */
export function view(s: State) {
  const leg = s.leg < LEGS.length ? LEGS[s.leg] : null;
  const stale = !!s.checked && !sameSel(s.checked.sel, s.sel);
  const result = s.checked && !stale ? s.checked.result : null;
  const closed = !!leg && (s.revealed || result?.kind === 'verified');
  return { leg, stale, result, closed, finished: s.leg >= LEGS.length };
}

const freshLeg = (s: State, leg: number): State => ({ ...s, leg, sel: EMPTY_SELECTIONS, checked: null, hint: 0, revealed: false, attempts: 0 });

export function reducer(s: State, a: Action): State {
  const v = view(s);
  switch (a.type) {
    case 'setMode':
      return s.mode === a.mode ? s : { ...s, mode: a.mode };
    case 'selectFeature':
      return { ...s, learnFeature: a.id };
    case 'selectCandidate':
      if (!v.leg || v.closed || !v.leg.candidates.includes(a.id)) return s;
      return s.sel.candidate === a.id ? s : { ...s, sel: { ...s.sel, candidate: a.id, comparison: null } };
    case 'toggleEvidence': {
      if (!v.leg || v.closed || !v.leg.evidence.some((e) => e.id === a.id)) return s;
      const has = s.sel.evidence.includes(a.id);
      // At most two: a third choice is ignored until one is cleared (the UI says so).
      if (!has && s.sel.evidence.length >= EVIDENCE_COUNT) return s;
      return { ...s, sel: { ...s.sel, evidence: has ? s.sel.evidence.filter((id) => id !== a.id) : [...s.sel.evidence, a.id] } };
    }
    case 'setComparison':
      if (!v.leg || v.closed || !s.sel.candidate) return s;
      return { ...s, sel: { ...s.sel, comparison: a.value } };
    case 'check': {
      if (!v.leg || v.closed) return s;
      const result = evaluate(v.leg, s.sel);
      const outcomes = result.kind === 'verified' ? s.outcomes.map((o, k) => (k === s.leg ? 'verified' : o)) : s.outcomes;
      return { ...s, checked: { sel: s.sel, result }, attempts: s.attempts + 1, outcomes };
    }
    case 'hint':
      if (!v.leg || v.closed) return s;
      return { ...s, hint: Math.min(2, s.hint + 1) as 0 | 1 | 2 };
    case 'reveal': {
      if (!v.leg || v.closed) return s;
      const leg = v.leg;
      const sel: Selections = { candidate: leg.answer, evidence: [...leg.correctEvidence], comparison: 'match' };
      return {
        ...s,
        sel,
        checked: { sel, result: { kind: 'verified', candidate: leg.answer } },
        revealed: true,
        outcomes: s.outcomes.map((o, k) => (k === s.leg ? 'explained' : o)),
      };
    }
    case 'next':
      if (!v.closed) return s;
      return freshLeg(s, s.leg + 1);
    case 'restart':
      return { ...freshLeg(s, 0), outcomes: LEGS.map(() => null) };
  }
}
