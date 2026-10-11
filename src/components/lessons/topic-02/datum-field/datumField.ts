/**
 * Datum field challenge — pure logic (no React), unit-tested in
 * scripts/qa/datum-field-challenge.test.mjs.
 *
 * The schematic model, one rule for every landmark:
 *   - datum B = datum A − DATUM_SHIFT (same unit and orientation);
 *   - the map is set to datum B, so it reads any number pair as B coordinates:
 *     a pair (e, n) stands on the ground at (e, n) + DATUM_SHIFT in datum A,
 *     the plane the diorama is drawn in;
 *   - reading a landmark's A numbers as B shows it at P + DATUM_SHIFT (60 m off);
 *     converting them to B first (A − DATUM_SHIFT) shows it at P.
 * The source numbers and the source datum never change; the gap is always
 * derived from the marker's position, in metres of that plane (never pixels).
 */
import { DATUM_SHIFT, FIRST_LANDMARK, LANDMARKS, type EN, type LandmarkId } from './datumField.data';

// ---------------------------------------------------------------- the model

/** Datum-A numbers converted to datum B. */
export const toDatumB = (a: EN): EN => ({ e: a.e - DATUM_SHIFT.e, n: a.n - DATUM_SHIFT.n });

/** Where the map (datum B) puts a number pair: its ground position in datum A. */
export const groundOfMapNumbers = (numbers: EN): EN => ({ e: numbers.e + DATUM_SHIFT.e, n: numbers.n + DATUM_SHIFT.n });

/** Distance in metres between two ground positions. */
export const distanceM = (p: EN, q: EN): number => Math.hypot(p.e - q.e, p.n - q.n);

/** The number pair the map is using: the source A numbers until they are converted to B. */
export const mapNumbers = (id: LandmarkId, converted: boolean): EN => (converted ? toDatumB(LANDMARKS[id].a) : LANDMARKS[id].a);

/** The requested location: the landmark itself. */
export const requestedAt = (id: LandmarkId): EN => LANDMARKS[id].a;

/**
 * The displayed location at `t` along its path: t = 0 where the unconverted
 * numbers land (A read as B), t = 1 where the converted numbers land (the
 * landmark). Both ends come from the map's reading of the numbers.
 */
export function displayedAt(id: LandmarkId, t: number): EN {
  const from = groundOfMapNumbers(mapNumbers(id, false));
  const to = groundOfMapNumbers(mapNumbers(id, true));
  const k = Math.min(1, Math.max(0, t));
  return { e: from.e + (to.e - from.e) * k, n: from.n + (to.n - from.n) * k };
}

/** The gap between the displayed and the requested location (m). */
export const gapAt = (id: LandmarkId, t: number): number => distanceM(displayedAt(id, t), requestedAt(id));

/** "E 1200 · N 800" — always set inside an LTR isolate. */
export const formatEN = (p: EN): string => `E ${p.e} · N ${p.n}`;

// ---------------------------------------------------------------- reading the gap

export type GapReading = { status: string; consequence: string };

/** The block's original wording and thresholds (the former slider demo), applied to a gap in metres. */
export function readGap(m: number): GapReading {
  const level = m < 15 ? 'safe' : m < 40 ? 'warn' : 'danger';
  const status =
    m === 0 ? 'ללא סטייה' : level === 'safe' ? 'סטייה קטנה בהדמיה' : level === 'warn' ? 'סטייה בינונית בהדמיה' : 'סטייה גדולה בהדמיה';
  const consequence =
    m < 15
      ? 'שתי הנקודות קרובות זו לזו. בערך אפס הן חופפות.'
      : m < 40
        ? 'המרחק בין המיקום המבוקש למיקום המוצג גדל.'
        : m < 70
          ? 'המיקום המוצג נמצא באזור אחר של המפה ביחס לנקודה המבוקשת.'
          : 'הפער בין הנקודות בהדמיה גדול.';
  return { status, consequence };
}

// ---------------------------------------------------------------- the task

export type Answer = 'label' | 'convert';
export const CORRECT_ANSWER: Answer = 'convert';

/**
 *   inspect     the numbers are read as B; an answer may be picked (none at first)
 *   wrong       "label only" was checked: feedback, nothing else changes
 *   converting  the numbers were converted; the displayed location travels to the landmark
 *   done        it arrived: gap 0, confirmation
 */
export type Phase = 'inspect' | 'wrong' | 'converting' | 'done';

export type FieldState = {
  landmark: LandmarkId;
  answer: Answer | null;
  phase: Phase;
  hint: boolean;
  /** Counts conversions (and resets): an arrival is accepted only for the current run. */
  run: number;
};

export type FieldAction =
  | { type: 'selectLandmark'; id: LandmarkId }
  | { type: 'selectAnswer'; answer: Answer }
  | { type: 'check' }
  | { type: 'arrive'; run: number }
  | { type: 'toggleHint' }
  | { type: 'reset' };

export const initialField = (): FieldState => ({ landmark: FIRST_LANDMARK, answer: null, phase: 'inspect', hint: false, run: 0 });

/** Whether the map's numbers are the converted ones. */
export const isConverted = (s: FieldState) => s.phase === 'converting' || s.phase === 'done';

/** Whether the answers, the check and the hint still take input. */
export const isOpen = (s: FieldState) => s.phase === 'inspect' || s.phase === 'wrong';

export function fieldReducer(s: FieldState, a: FieldAction): FieldState {
  switch (a.type) {
    case 'selectLandmark':
      // a new point: its own numbers, back to inspecting, no answer, hint or feedback;
      // a conversion under way is dropped (its arrival no longer matches the run)
      if (a.id === s.landmark) return s;
      return { landmark: a.id, answer: null, phase: 'inspect', hint: false, run: s.run + 1 };
    case 'selectAnswer':
      // picking is not judging: it clears an earlier check's feedback and moves nothing
      if (!isOpen(s) || a.answer === s.answer) return s;
      return { ...s, answer: a.answer, phase: 'inspect' };
    case 'check':
      if (!isOpen(s) || s.answer === null) return s;
      if (s.answer === CORRECT_ANSWER) return { ...s, phase: 'converting', hint: false, run: s.run + 1 };
      return { ...s, phase: 'wrong' };
    case 'arrive':
      if (s.phase !== 'converting' || a.run !== s.run) return s;
      return { ...s, phase: 'done' };
    case 'toggleHint':
      if (!isOpen(s)) return s;
      return { ...s, hint: !s.hint };
    case 'reset':
      return { ...initialField(), run: s.run + 1 };
  }
}

/** Where the displayed location rests in this phase (0 = unconverted, 1 = converted). */
export const restingT = (s: FieldState): number => (s.phase === 'done' ? 1 : 0);

export type StepStatus = 'done' | 'active' | 'upcoming';

/** The three steps: receive the point (always done) → check the location → fix the error. */
export function stepStatuses(s: FieldState): readonly [StepStatus, StepStatus, StepStatus] {
  if (s.phase === 'done') return ['done', 'done', 'done'];
  if (s.phase === 'inspect' && s.answer === null) return ['done', 'active', 'upcoming'];
  return ['done', 'done', 'active'];
}
