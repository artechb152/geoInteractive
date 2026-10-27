/**
 * Datum field activity — pure logic (no React), unit-tested in
 * scripts/qa/datum-field-challenge.test.mjs.
 *
 * Two rules carry the whole model (datumField.data.ts):
 *   - interpret(pair, datum): where a map that works in `datum` puts a pair —
 *     A: the pair itself (the ground plane is in A metres); B: pair + SHIFT;
 *   - convert(pair, from, to): the same place's numbers in another datum —
 *     A→B subtracts SHIFT, B→A adds it, same datum changes nothing.
 * Every gap is the distance between two ground positions, in metres (never
 * pixels, never label positions). The source data are constants and are never
 * written; the copy sent to the map, its label and the conversion result are
 * derived from the activity state.
 */
import { CASES, MAP, GRID_STEP, PLACES, SHIFT, type Action, type CalcKind, type Datum, type EN, type PlaceId, type PracticeCase } from './datumField.data';

// ---------------------------------------------------------------- the model

/** The same place's numbers in another datum. */
export function convert(p: EN, from: Datum, to: Datum): EN {
  if (from === to) return p;
  return from === 'A' ? { e: p.e - SHIFT.e, n: p.n - SHIFT.n } : { e: p.e + SHIFT.e, n: p.n + SHIFT.n };
}

/** Where a map working in `datum` puts a number pair: its ground position (datum-A metres). */
export const interpret = (p: EN, datum: Datum): EN => (datum === 'A' ? p : { e: p.e + SHIFT.e, n: p.n + SHIFT.n });

/** Distance between two ground positions, in metres. */
export const distance = (p: EN, q: EN): number => Math.hypot(p.e - q.e, p.n - q.n);

export const sameEN = (p: EN, q: EN): boolean => p.e === q.e && p.n === q.n;

/** "E 1200 · N 800" — always shown left-to-right. */
export const formatEN = (p: EN): string => `E ${p.e} · N ${p.n}`;

/** A place's numbers in a datum. */
export const numbersOf = (id: PlaceId, datum: Datum): EN => convert(PLACES[id].ground, 'A', datum);

/** How far from `target` a map working in `datum` puts the pair `p` (m). */
export const gapOf = (p: EN, datum: Datum, target: EN): number => distance(interpret(p, datum), target);

export const lerpEN = (p: EN, q: EN, t: number): EN => ({ e: p.e + (q.e - p.e) * t, n: p.n + (q.n - p.n) * t });

/** One line of a datum's grid: its value in that datum and where it stands on the ground. */
export type GridLine = { value: number; ground: number };

/** Lines closer to the map's edge than this fraction of its size are not drawn. */
const GRID_EDGE = 0.005;

/**
 * The grid the map draws, at slide fraction `t` (0 = A's lines, 1 = B's, in
 * between while stage 1 slides from one to the other): lines every GRID_STEP
 * of the datum's own values, kept off the map's edge. Same unit and
 * orientation in both datums; B's lines stand SHIFT east and north of A's
 * lines with the same values.
 */
export function gridLines(t: number): { e: GridLine[]; n: GridLine[] } {
  const lines = (lo: number, hi: number, offset: number): GridLine[] => {
    const out: GridLine[] = [];
    const span = hi - lo;
    for (let v = Math.floor((lo - Math.max(SHIFT.e, SHIFT.n)) / GRID_STEP) * GRID_STEP; v <= hi; v += GRID_STEP) {
      const ground = v + offset;
      const f = (ground - lo) / span;
      if (f > GRID_EDGE && f < 1 - GRID_EDGE) out.push({ value: v, ground });
    }
    return out;
  };
  return { e: lines(MAP.e0, MAP.e1, SHIFT.e * t), n: lines(MAP.n0, MAP.n1, SHIFT.n * t) };
}

/** A datum's own grid inside the map. */
export const gridOf = (datum: Datum) => gridLines(datum === 'B' ? 1 : 0);

// ---------------------------------------------------------------- stage 2: the error

/** The source of stage 2: the bridge's numbers, delivered in datum A. */
export const ERROR_SOURCE = { datum: 'A' as Datum, numbers: numbersOf('bridge', 'A') };
/** The map of stage 2 reads every pair as datum B. */
export const ERROR_MAP: Datum = 'B';

/**
 *   ready       nothing sent yet: only the bridge on the map;
 *   raw         the source numbers copied without conversion, labelled A;
 *   relabeled   the same numbers, only the copy's label changed to B;
 *   converting  the numbers converted A→B, the marker on its way (motion only);
 *   converted   the converted numbers, labelled B.
 */
export type ErrorPhase = 'ready' | 'raw' | 'relabeled' | 'converting' | 'converted';

/** The copy sent to the map: its label and its numbers. The source itself never changes. */
export type SentCopy = { label: Datum; numbers: EN; converted: boolean };

export function sentCopy(phase: ErrorPhase): SentCopy | null {
  switch (phase) {
    case 'ready':
      return null;
    case 'raw':
      return { label: 'A', numbers: ERROR_SOURCE.numbers, converted: false };
    case 'relabeled':
      return { label: 'B', numbers: ERROR_SOURCE.numbers, converted: false };
    default:
      // always converted from the true source, never from the copy or its label
      return { label: 'B', numbers: convert(ERROR_SOURCE.numbers, ERROR_SOURCE.datum, ERROR_MAP), converted: true };
  }
}

/** Where the map puts the unconverted numbers (the "before" of every conversion). */
export const ERROR_BEFORE = interpret(ERROR_SOURCE.numbers, ERROR_MAP);

/** Where the map puts the sent copy, at rest (null: nothing sent). */
export function errorResult(phase: ErrorPhase): EN | null {
  const sent = sentCopy(phase);
  return sent && interpret(sent.numbers, ERROR_MAP);
}

// ---------------------------------------------------------------- stage 3: practice

export const caseTarget = (c: PracticeCase): EN => PLACES[c.place].ground;
/** The numbers as delivered: the place in the source datum. */
export const caseSource = (c: PracticeCase): EN => numbersOf(c.place, c.source);

/** The learner's three decisions on a case: do the datums match, the action, and (for a conversion) the pair. */
export type PracticeAnswer = { match: boolean | null; action: Action | null; calc: number | null };
export const EMPTY_ANSWER: PracticeAnswer = { match: null, action: null, calc: null };

export type Conversion = 'AtoB' | 'BtoA';
export const isConversion = (a: Action | null): a is Conversion => a === 'AtoB' || a === 'BtoA';
export const directionOf = (a: Conversion): { from: Datum; to: Datum } => (a === 'AtoB' ? { from: 'A', to: 'B' } : { from: 'B', to: 'A' });

/** Step 1's truth: do the source and the target map use the same datum? */
export const datumsMatch = (c: PracticeCase): boolean => c.source === c.target;

/** Step 2's truth: nothing to convert when the datums match; otherwise from the source's datum to the map's. */
export const rightAction = (c: PracticeCase): Action => (datumsMatch(c) ? 'keep' : c.source === 'A' ? 'AtoB' : 'BtoA');

/**
 * Step 3's pairs for a conversion: the conversion of the source numbers, the two shifts swapped between
 * E and N, and only E converted — each built from SHIFT with its direction's sign, so 'right' is
 * convert() itself (unit-tested).
 */
export function calcPair(c: PracticeCase, a: Conversion, kind: CalcKind): EN {
  const s = caseSource(c);
  const sign = directionOf(a).from === 'A' ? -1 : 1;
  switch (kind) {
    case 'right':
      return { e: s.e + sign * SHIFT.e, n: s.n + sign * SHIFT.n };
    case 'swapped':
      return { e: s.e + sign * SHIFT.n, n: s.n + sign * SHIFT.e };
    case 'partial':
      return { e: s.e + sign * SHIFT.e, n: s.n };
  }
}

/** Step 3's pairs, in the case's order (none unless the action is a conversion). */
export const calcOptions = (c: PracticeCase, a: Action | null): EN[] => (isConversion(a) ? c.calcOrder.map((k) => calcPair(c, a, k)) : []);

/** Complete enough to check: a conversion needs its pair; the other actions send the source numbers as they are. */
export const answerComplete = (c: PracticeCase, x: PracticeAnswer): boolean =>
  x.match !== null && x.action !== null && (!isConversion(x.action) || (x.calc !== null && x.calc >= 0 && x.calc < c.calcOrder.length));

/** The copy an answer sends to the target map: its label and its numbers (null while incomplete). */
export function sentOf(c: PracticeCase, x: PracticeAnswer): { label: Datum; numbers: EN } | null {
  if (!answerComplete(c, x)) return null;
  const a = x.action!;
  if (a === 'keep') return { label: c.source, numbers: caseSource(c) };
  // a new label only: the numbers stay the source's
  if (a === 'relabel') return { label: c.target, numbers: caseSource(c) };
  return { label: directionOf(a).to, numbers: calcOptions(c, a)[x.calc!] };
}

/** The first step that went wrong — identifying the datums, choosing the action, the calculation — or right. */
export type Verdict = 'right' | 'identify' | 'action' | 'calc';

export type Diagnosis = {
  verdict: Verdict;
  sent: { label: Datum; numbers: EN };
  /** Where the target map puts the numbers sent (ground, datum-A metres). */
  at: EN;
  /** Metres from the place. */
  gap: number;
  /** The kind of pair chosen, for a conversion. */
  calc: CalcKind | null;
};

/**
 * Judge a complete answer: the verdict names the first step that went wrong. Every step right means —
 * from the data, not from a slot — the target map puts the numbers on the place itself (unit-tested).
 */
export function diagnose(c: PracticeCase, x: PracticeAnswer): Diagnosis | null {
  const sent = sentOf(c, x);
  if (!sent) return null;
  const at = interpret(sent.numbers, c.target);
  const calc = isConversion(x.action) ? c.calcOrder[x.calc!] : null;
  const verdict: Verdict =
    x.match !== datumsMatch(c) ? 'identify' : x.action !== rightAction(c) ? 'action' : calc !== null && calc !== 'right' ? 'calc' : 'right';
  return { verdict, sent, at, gap: distance(at, caseTarget(c)), calc };
}

// ---------------------------------------------------------------- the activity

export type Mode = 'compare' | 'error' | 'practice';
export const MODES: readonly Mode[] = ['compare', 'error', 'practice'];

export type PracticeState = {
  /** The case on screen. */
  index: number;
  /** The learner's decisions on it. Nothing of them reaches the map before a check. */
  answer: PracticeAnswer;
  /** The answer on screen was checked with "בדיקה" (any change clears it). */
  checked: boolean;
  /** Cases answered right at least once. */
  solved: readonly boolean[];
  /** The closing message after the last case. */
  summary: boolean;
};

/** Stage 2: the phase, and the state the label experiment started from (its undo goes back there). */
export type ErrorState = { phase: ErrorPhase; labelFrom: 'raw' | 'converted' };

export type ActivityState = {
  mode: Mode;
  compare: { datum: Datum; switched: boolean };
  error: ErrorState;
  practice: PracticeState;
  /** Bumped by every change that starts or cancels a motion; a late motion end of an older run is ignored. */
  run: number;
};

export type ActivityAction =
  | { type: 'setMode'; mode: Mode }
  | { type: 'setDatum'; datum: Datum }
  | { type: 'copyRaw' }
  | { type: 'toggleLabel' }
  | { type: 'convert' }
  | { type: 'arrive'; run: number }
  | { type: 'resetError' }
  | { type: 'setMatch'; match: boolean }
  | { type: 'setAction'; action: Action }
  | { type: 'setCalc'; option: number }
  | { type: 'check' }
  | { type: 'resetCase' }
  | { type: 'goCase'; index: number }
  | { type: 'showSummary' }
  | { type: 'restartPractice' }
  | { type: 'backToDemo' };

const initialPractice = (): PracticeState => ({ index: 0, answer: EMPTY_ANSWER, checked: false, solved: CASES.map(() => false), summary: false });

export const initialActivity = (): ActivityState => ({
  mode: 'compare',
  compare: { datum: 'A', switched: false },
  error: { phase: 'ready', labelFrom: 'raw' },
  practice: initialPractice(),
  run: 0,
});

/** A conversion caught mid-motion settles where it was going (the numbers were already converted). */
const settle = (phase: ErrorPhase): ErrorPhase => (phase === 'converting' ? 'converted' : phase);

/** Practice changes act only on a case on screen (not on the summary). */
const answering = (s: ActivityState) => s.mode === 'practice' && !s.practice.summary;
/** A new answer clears the last verdict: nothing is judged or drawn until the next check. */
const withAnswer = (s: ActivityState, answer: PracticeAnswer): ActivityState => ({ ...s, practice: { ...s.practice, answer, checked: false } });

export function activityReducer(s: ActivityState, a: ActivityAction): ActivityState {
  switch (a.type) {
    case 'setMode':
      if (a.mode === s.mode) return s;
      return { ...s, mode: a.mode, error: { ...s.error, phase: settle(s.error.phase) }, run: s.run + 1 };

    case 'setDatum':
      if (s.mode !== 'compare' || a.datum === s.compare.datum) return s;
      return { ...s, compare: { datum: a.datum, switched: true }, run: s.run + 1 };

    case 'copyRaw':
      if (s.mode !== 'error' || s.error.phase !== 'ready') return s;
      return { ...s, error: { phase: 'raw', labelFrom: 'raw' } };

    case 'toggleLabel': {
      if (s.mode !== 'error' || s.error.phase === 'ready') return s;
      // off: back to the state the experiment started from (the raw copy, or the converted one)
      if (s.error.phase === 'relabeled') return { ...s, error: { ...s.error, phase: s.error.labelFrom }, run: s.run + 1 };
      // on: the raw copy with only its label changed — also straight after a conversion
      return { ...s, error: { phase: 'relabeled', labelFrom: s.error.phase === 'raw' ? 'raw' : 'converted' }, run: s.run + 1 };
    }

    case 'convert':
      // from the error, from the label experiment, or again after a conversion (a replay):
      // always the true source, so it can never convert twice
      if (s.mode !== 'error' || s.error.phase === 'ready' || s.error.phase === 'converting') return s;
      return { ...s, error: { ...s.error, phase: 'converting' }, run: s.run + 1 };

    case 'arrive':
      if (s.error.phase !== 'converting' || a.run !== s.run) return s;
      return { ...s, error: { ...s.error, phase: 'converted' } };

    case 'resetError':
      // the stage from its start: nothing sent yet
      if (s.mode !== 'error') return s;
      return { ...s, error: { phase: 'ready', labelFrom: 'raw' }, run: s.run + 1 };

    case 'setMatch':
      if (!answering(s) || a.match === s.practice.answer.match) return s;
      return withAnswer(s, { ...s.practice.answer, match: a.match });

    case 'setAction': {
      const c = CASES[s.practice.index];
      if (!answering(s) || !c.actions.includes(a.action) || a.action === s.practice.answer.action) return s;
      // another action: the old pair belonged to the old one
      return withAnswer(s, { ...s.practice.answer, action: a.action, calc: null });
    }

    case 'setCalc': {
      const c = CASES[s.practice.index];
      const x = s.practice.answer;
      if (!answering(s) || !isConversion(x.action) || a.option < 0 || a.option >= c.calcOrder.length || a.option === x.calc) return s;
      return withAnswer(s, { ...x, calc: a.option });
    }

    case 'check': {
      const p = s.practice;
      const c = CASES[p.index];
      if (!answering(s) || p.checked || !answerComplete(c, p.answer)) return s;
      const right = diagnose(c, p.answer)!.verdict === 'right';
      return { ...s, practice: { ...p, checked: true, solved: right ? p.solved.map((v, i) => v || i === p.index) : p.solved } };
    }

    case 'resetCase':
      // the case on screen from its start; a case solved once stays solved
      if (!answering(s)) return s;
      return withAnswer(s, EMPTY_ANSWER);

    case 'goCase':
      if (s.mode !== 'practice' || a.index < 0 || a.index >= CASES.length) return s;
      // every case starts clean
      return { ...s, practice: { ...s.practice, index: a.index, answer: EMPTY_ANSWER, checked: false, summary: false } };

    case 'showSummary':
      if (s.mode !== 'practice' || !s.practice.solved.every(Boolean)) return s;
      return { ...s, practice: { ...s.practice, summary: true } };

    case 'restartPractice':
      if (s.mode !== 'practice') return s;
      return { ...s, practice: initialPractice(), run: s.run + 1 };

    case 'backToDemo':
      // the whole activity again, from the demonstration: every stage clean
      return { ...initialActivity(), run: s.run + 1 };
  }
}

// ---------------------------------------------------------------- readings

/** The verdict on the case on screen, once checked. */
export function checkedDiagnosis(p: PracticeState): Diagnosis | null {
  return p.checked ? diagnose(CASES[p.index], p.answer) : null;
}
