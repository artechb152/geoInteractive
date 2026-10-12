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
import { CASES, MAP, GRID_STEP, PLACES, SHIFT, type Datum, type EN, type PlaceId, type PracticeCase } from './datumField.data';

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

export type OptionKind = 'kept' | 'plus' | 'minus' | 'other';

export const caseTarget = (c: PracticeCase): EN => PLACES[c.place].ground;
/** The numbers as delivered: the place in the source datum. */
export const caseSource = (c: PracticeCase): EN => numbersOf(c.place, c.source);

/** How an output pair relates to the source numbers. */
export function optionKind(c: PracticeCase, p: EN): OptionKind {
  const s = caseSource(c);
  if (sameEN(p, s)) return 'kept';
  if (sameEN(p, { e: s.e + SHIFT.e, n: s.n + SHIFT.n })) return 'plus';
  if (sameEN(p, { e: s.e - SHIFT.e, n: s.n - SHIFT.n })) return 'minus';
  return 'other';
}

/** The gap a pair makes in the target map (m). */
export const optionGap = (c: PracticeCase, p: EN): number => gapOf(p, c.target, caseTarget(c));

/** Right means: the target map puts the pair on the place itself — read from the data, not from a slot. */
export const isRight = (c: PracticeCase, p: EN): boolean => optionGap(c, p) < 1e-9;

export function feedbackFor(c: PracticeCase, p: EN): string | undefined {
  if (isRight(c, p)) return c.feedback.right;
  const kind = optionKind(c, p);
  return (kind === 'kept' || kind === 'plus' || kind === 'minus' ? c.feedback[kind] : undefined) ?? c.feedback.wrong;
}

// ---------------------------------------------------------------- the activity

export type Mode = 'compare' | 'error' | 'practice';
export const MODES: readonly Mode[] = ['compare', 'error', 'practice'];

export type PracticeState = {
  /** The case on screen. */
  index: number;
  /** The option previewed on the map (not an answer yet). */
  choice: number | null;
  /** The option last checked with "בדיקת הנתונים" (null: nothing checked since the last choice). */
  checked: number | null;
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
  | { type: 'choose'; option: number }
  | { type: 'check' }
  | { type: 'goCase'; index: number }
  | { type: 'showSummary' }
  | { type: 'restartPractice' }
  | { type: 'backToDemo' };

const initialPractice = (): PracticeState => ({ index: 0, choice: null, checked: null, solved: CASES.map(() => false), summary: false });

export const initialActivity = (): ActivityState => ({
  mode: 'compare',
  compare: { datum: 'A', switched: false },
  error: { phase: 'ready', labelFrom: 'raw' },
  practice: initialPractice(),
  run: 0,
});

/** A conversion caught mid-motion settles where it was going (the numbers were already converted). */
const settle = (phase: ErrorPhase): ErrorPhase => (phase === 'converting' ? 'converted' : phase);

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
      if (s.mode !== 'error') return s;
      return { ...s, error: { phase: 'ready', labelFrom: 'raw' }, run: s.run + 1 };

    case 'choose': {
      const c = CASES[s.practice.index];
      if (s.mode !== 'practice' || s.practice.summary || a.option < 0 || a.option >= c.options.length) return s;
      if (a.option === s.practice.choice) return s;
      return { ...s, practice: { ...s.practice, choice: a.option, checked: null } };
    }

    case 'check': {
      const p = s.practice;
      if (s.mode !== 'practice' || p.summary || p.choice === null || p.checked === p.choice) return s;
      const c = CASES[p.index];
      const right = isRight(c, c.options[p.choice]);
      return {
        ...s,
        practice: { ...p, checked: p.choice, solved: right ? p.solved.map((v, i) => v || i === p.index) : p.solved },
      };
    }

    case 'goCase':
      if (s.mode !== 'practice' || a.index < 0 || a.index >= CASES.length) return s;
      // every case starts clean
      return { ...s, practice: { ...s.practice, index: a.index, choice: null, checked: null, summary: false } };

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

/** The checked option of the case on screen, if any, and whether it was right. */
export function checkedResult(p: PracticeState): { option: number; right: boolean } | null {
  if (p.checked === null) return null;
  const c = CASES[p.index];
  return { option: p.checked, right: isRight(c, c.options[p.checked]) };
}
