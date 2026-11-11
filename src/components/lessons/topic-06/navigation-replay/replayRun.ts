/**
 * The run of the decision exercise — one reducer over what the navigator KNOWS
 * and what really HAPPENED, kept apart:
 *
 *   know    the last identified point (fix), the distance counted since it,
 *           the plan from it, the estimate on that plan, how uncertain the
 *           estimate has become, and the next target. The map draws only this.
 *   visits  every stop reached, in order: where the eye really stood, what was
 *           known on arrival and on leaving, the decision, every check and the
 *           fix it gave. The review and the debrief read only this record.
 *
 * Continuing walks the next fixed segment (replayRoute) and moves the estimate
 * by the distance counted on it; checking gathers evidence (replayCheck) and
 * only a fix — two loci crossing — changes the last identified point. Choosing
 * "check" by itself verifies nothing.
 */
import { evaluate, locusOf, noLocusReason, type CheckVerdict, type Locus } from './replayCheck';
import {
  PLAN_A_LINE,
  PLAN_B_LINE,
  PLAN_C,
  PLAN_POINTS,
  STOP_AT,
  STOP_SEES,
  segmentOf,
  slice,
  pointAlong,
  type SignId,
  type StopId,
} from './replayRoute';
import { distW, nearestOn, polyline, type W2 } from './replayWorld';

export type Fix = { at: W2; stop: StopId };
export type TargetId = 'saddle' | 'crossing' | 'pines';
export type Knowledge = {
  fix: Fix;
  /** metres counted since the fix (each walked stretch's straight distance) */
  counted: number;
  /** the planned way on from the fix */
  plan: W2[];
  estimate: W2;
  /** radius of the estimate's uncertainty, m */
  uncertainty: number;
  target: TargetId;
};

export type CheckMsg =
  | { kind: 'view-none' }
  | { kind: 'view-area' | 'view-far-line' | 'view-ok' | 'view-dup' | 'view-hidden'; sign: SignId }
  | { kind: 'map-none' }
  | { kind: 'map-first' }
  | { kind: 'map-wrong'; picked: SignId; want: SignId }
  | { kind: 'map-ok'; sign: SignId; locus: Locus['kind'] }
  | { kind: 'distance-ok' };

export type CheckState = {
  /** identified in the view, not yet found on the map */
  pending: SignId | null;
  /** identified in the view and found on the map */
  matched: SignId[];
  distance: boolean;
  msg: CheckMsg | null;
  /** the last "determine the position" — a partial verdict keeps the check open */
  verdict: CheckVerdict | null;
  /** wrong picks so far (a hint is offered after two, where hints are given) */
  misses: number;
};

export type CheckRecord = { signs: SignId[]; distance: boolean; verdict: CheckVerdict };

export type Visit = {
  stop: StopId;
  truth: W2;
  arrival: Knowledge;
  /** the first decision taken at this stop */
  decision: 'continue' | 'check' | null;
  checks: CheckRecord[];
  /** the fix this stop's check gave, and how far it was from the estimate */
  fix: Fix | null;
  offsetM: number | null;
  agrees: boolean | null;
  /** the check's evidence that is still drawn on the map */
  check: CheckState | null;
};

export type RunState = {
  visits: Visit[];
  phase: 'decide' | 'check' | 'walking' | 'done';
  know: Knowledge;
  /** metres really walked (the path, not the counted straight stretches) */
  walked: number;
  walk: { from: StopId; to: StopId; route: W2[] } | null;
  /** index of a visit being reviewed, or null */
  review: number | null;
};

export type RunAction =
  | { type: 'check' }
  | { type: 'cancel-check' }
  /** from the view (a click) or from the list (keyboard, or the stills) */
  | { type: 'pick-view'; sign: SignId | null; from?: 'view' | 'list' }
  | { type: 'pick-map'; sign: SignId | null }
  | { type: 'add-distance' }
  | { type: 'commit' }
  | { type: 'continue' }
  | { type: 'arrive' }
  | { type: 'review'; index: number | null }
  | { type: 'reset' };

// ───────────────────────────────────────────── knowledge

const UNCERTAIN_BASE_M = 8;
const UNCERTAIN_PER_M = 0.08;

const legOfFix = (stop: StopId): 'A' | 'B' => (stop === 'stream' || stop === 'enroute' ? 'A' : 'B');

/** The plan from a fix: on along the planned route when the fix is on it, else straight to the next checkpoint. */
export function planFrom(fix: Fix): W2[] {
  const tail = PLAN_C.slice(1);
  if (fix.stop === 'crossing') return [fix.at, ...tail];
  if (legOfFix(fix.stop) === 'A') {
    const s = nearestOn(PLAN_A_LINE, fix.at).s;
    return [fix.at, ...slice(PLAN_A_LINE, s, PLAN_A_LINE.length).slice(1), ...PLAN_B_LINE.pts.slice(1), ...tail];
  }
  const n = nearestOn(PLAN_B_LINE, fix.at);
  if (n.d <= 25) return [fix.at, ...slice(PLAN_B_LINE, n.s, PLAN_B_LINE.length).slice(1), ...tail];
  return [fix.at, PLAN_POINTS.crossing, ...tail];
}

function knowledge(fix: Fix, counted: number, plan = planFrom(fix)): Knowledge {
  const pl = polyline(plan);
  const estimate = counted > 0 ? pointAlong(pl, counted) : fix.at;
  // the next checkpoint not yet passed by the estimate on the plan (arriving at it by the count, it is still the target)
  const sOf = (p: W2) => nearestOn(pl, p).s;
  const target: TargetId =
    legOfFix(fix.stop) === 'A' && counted < sOf(PLAN_POINTS.saddle) + 15 ? 'saddle' : fix.stop === 'crossing' || counted > sOf(PLAN_POINTS.crossing) + 15 ? 'pines' : 'crossing';
  return { fix, counted, plan, estimate, uncertainty: counted > 0 ? UNCERTAIN_BASE_M + UNCERTAIN_PER_M * counted : 0, target };
}

export const TARGET_AT: Record<TargetId, W2> = { saddle: PLAN_POINTS.saddle, crossing: PLAN_POINTS.crossing, pines: PLAN_POINTS.pines };

/** Metres left on the plan from the estimate to the target. */
export function toTargetM(k: Knowledge): number {
  const pl = polyline(k.plan);
  return Math.max(0, nearestOn(pl, TARGET_AT[k.target]).s - k.counted);
}

// ───────────────────────────────────────────── the start

export function initialRun(): RunState {
  const fix: Fix = { at: STOP_AT.stream, stop: 'stream' };
  const know = knowledge(fix, 0);
  return {
    visits: [{ stop: 'stream', truth: STOP_AT.stream, arrival: know, decision: 'check', checks: [], fix: null, offsetM: null, agrees: null, check: freshCheck() }],
    phase: 'check',
    know,
    walked: 0,
    walk: null,
    review: null,
  };
}

const freshCheck = (): CheckState => ({ pending: null, matched: [], distance: false, msg: null, verdict: null, misses: 0 });

export const current = (s: RunState) => s.visits[s.visits.length - 1];

/** Where continuing leads from the current stop: a stop, the end, or nowhere yet (a check is needed first). */
export function nextStop(s: RunState): StopId | 'end' | null {
  const v = current(s);
  const fixed = !!v.fix;
  switch (v.stop) {
    case 'stream':
      return fixed ? 'enroute' : null;
    case 'enroute':
      return 'saddle';
    case 'saddle':
      return 'woods';
    case 'woods':
      return fixed ? 'crossing' : 'road';
    case 'road':
      return fixed ? 'crossing' : 'beyond';
    case 'beyond':
      return fixed ? 'crossing' : null;
    case 'crossing':
      return 'end';
  }
}

const patchVisit = (s: RunState, p: Partial<Visit>): RunState => ({ ...s, visits: [...s.visits.slice(0, -1), { ...current(s), ...p }] });
const patchCheck = (s: RunState, p: Partial<CheckState>): RunState => patchVisit(s, { check: { ...(current(s).check ?? freshCheck()), ...p } });

/** The loci the current check has gathered. */
export function lociOf(s: RunState, v = current(s)): Locus[] {
  const c = v.check;
  if (!c) return [];
  const eye = v.truth;
  const out: Locus[] = [];
  for (const id of c.matched) {
    const l = locusOf(id, eye);
    if (l) out.push(l);
  }
  const k = v.fix ? v.arrival : s.know;
  if (c.distance && k.counted > 0) out.push({ kind: 'arc', centre: k.fix.at, r: k.counted });
  return out;
}

// ───────────────────────────────────────────── the reducer

export function runReducer(s: RunState, a: RunAction): RunState {
  if (a.type === 'reset') return initialRun();
  if (a.type === 'review') return { ...s, review: a.index === null || a.index >= s.visits.length - 1 ? null : a.index };
  if (s.review !== null && a.type !== 'arrive') return s; // the review is read-only
  const v = current(s);
  const c = v.check;
  switch (a.type) {
    case 'check':
      if (s.phase !== 'decide' || v.fix) return s;
      return { ...patchVisit(s, { decision: v.decision ?? 'check', check: freshCheck() }), phase: 'check' };
    case 'cancel-check':
      if (s.phase !== 'check' || v.stop === 'stream') return s;
      return { ...patchVisit(s, { check: null }), phase: 'decide' };
    case 'pick-view': {
      if (s.phase !== 'check' || !c) return s;
      if (!a.sign) return patchCheck(s, { msg: { kind: 'view-none' }, misses: c.misses + 1 });
      if (a.from === 'list' && !STOP_SEES[v.stop].includes(a.sign)) return patchCheck(s, { msg: { kind: 'view-hidden', sign: a.sign }, pending: null });
      const why = noLocusReason(a.sign, v.truth);
      if (why) return patchCheck(s, { msg: { kind: why === 'area' ? 'view-area' : 'view-far-line', sign: a.sign }, pending: null });
      if (c.matched.includes(a.sign)) return patchCheck(s, { msg: { kind: 'view-dup', sign: a.sign }, pending: null });
      return patchCheck(s, { pending: a.sign, msg: { kind: 'view-ok', sign: a.sign } });
    }
    case 'pick-map': {
      if (s.phase !== 'check' || !c) return s;
      if (!c.pending) return patchCheck(s, { msg: { kind: 'map-first' } });
      if (!a.sign) return patchCheck(s, { msg: { kind: 'map-none' }, misses: c.misses + 1 });
      if (a.sign !== c.pending) return patchCheck(s, { msg: { kind: 'map-wrong', picked: a.sign, want: c.pending }, misses: c.misses + 1 });
      const l = locusOf(a.sign, v.truth)!;
      return patchCheck(s, { matched: [...c.matched, a.sign], pending: null, msg: { kind: 'map-ok', sign: a.sign, locus: l.kind }, verdict: null });
    }
    case 'add-distance':
      if (s.phase !== 'check' || !c || c.distance || s.know.counted <= 0) return s;
      return patchCheck(s, { distance: true, msg: { kind: 'distance-ok' }, verdict: null });
    case 'commit': {
      if (s.phase !== 'check' || !c) return s;
      const loci = lociOf(s);
      if (!loci.length) return s;
      const verdict = evaluate(loci, s.know.estimate);
      const rec: CheckRecord = { signs: [...c.matched], distance: c.distance, verdict };
      const checked = patchVisit(patchCheck(s, { verdict, msg: null }), { checks: [...v.checks, rec] });
      if (verdict.kind === 'partial') return checked;
      const fix: Fix = { at: verdict.at, stop: v.stop };
      const know = knowledge(fix, 0);
      return { ...patchVisit(checked, { fix, offsetM: verdict.offsetM, agrees: verdict.agrees }), know, phase: 'decide' };
    }
    case 'continue': {
      if (s.phase !== 'decide' && s.phase !== 'check') return s;
      const to = nextStop(s);
      if (!to) return s;
      const decided = patchVisit(s, { decision: v.decision ?? 'continue', check: v.fix ? v.check : null });
      if (to === 'end') return { ...decided, phase: 'done' };
      return { ...decided, phase: 'walking', walk: { from: v.stop, to, route: segmentOf(v.stop, to)! } };
    }
    case 'arrive': {
      if (s.phase !== 'walking' || !s.walk) return s;
      const route = s.walk.route;
      const chord = distW(route[0], route[route.length - 1]);
      const pathM = polyline(route).length;
      const know = knowledge(s.know.fix, s.know.counted + chord, s.know.plan);
      const visit: Visit = { stop: s.walk.to, truth: STOP_AT[s.walk.to], arrival: know, decision: null, checks: [], fix: null, offsetM: null, agrees: null, check: null };
      return { ...s, visits: [...s.visits, visit], know, walked: s.walked + pathM, walk: null, phase: 'decide', review: null };
    }
  }
}

/** Can the learner continue from here now (or is a check required first)? */
export const canContinue = (s: RunState) => s.review === null && (s.phase === 'decide' || s.phase === 'check') && nextStop(s) !== null;

// ───────────────────────────────────────────── the debrief, from what was done

export type Debrief = {
  walkedM: number;
  plannedM: number;
  /** stops where a check gave a fix */
  fixes: StopId[];
  /** checks that ended partial */
  partials: number;
  /** stops left without a fix */
  unchecked: StopId[];
  /** where the woodland drift was found, and how far the fix was from the estimate there */
  driftFoundAt: StopId | null;
  driftOffsetM: number | null;
  /** the furthest the navigator was from the planned route before the drift was found, m */
  maxOffRouteM: number;
  saddleVerified: boolean;
  crossingVerified: boolean;
};

const PLAN_B_THEN_C = polyline([...PLAN_B_LINE.pts, ...PLAN_C.slice(1)]);

export function debriefOf(s: RunState): Debrief {
  const fixes = s.visits.filter((v) => v.fix).map((v) => v.stop);
  const found = s.visits.find((v) => (v.stop === 'woods' || v.stop === 'road' || v.stop === 'beyond') && v.fix);
  let maxOff = 0;
  for (const v of s.visits) {
    if (found && s.visits.indexOf(v) > s.visits.indexOf(found)) break;
    if (v.stop === 'woods' || v.stop === 'road' || v.stop === 'beyond') maxOff = Math.max(maxOff, nearestOn(PLAN_B_THEN_C, v.truth).d);
  }
  return {
    walkedM: s.walked,
    plannedM: PLAN_A_LINE.length + PLAN_B_LINE.length,
    fixes,
    partials: s.visits.reduce((n, v) => n + v.checks.filter((c) => c.verdict.kind === 'partial').length, 0),
    unchecked: s.visits.filter((v) => !v.fix).map((v) => v.stop),
    driftFoundAt: found?.stop ?? null,
    driftOffsetM: found?.offsetM ?? null,
    maxOffRouteM: maxOff,
    saddleVerified: fixes.includes('saddle'),
    crossingVerified: fixes.includes('crossing'),
  };
}
