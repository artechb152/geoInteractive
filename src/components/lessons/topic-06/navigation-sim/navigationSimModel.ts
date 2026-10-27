/**
 * The practice of lesson 6 ("תרגול"): resection — "חיתוך לאחור". From an
 * unknown position the learner measures the azimuth to two identified objects,
 * reverses each measurement, draws a line from each object on the map, marks
 * the crossing, and checks it against a measurement to the third object.
 *
 * A fictional area in a local metric grid, north up: E grows east, N grows
 * north, origin at the sheet's south-west corner. Every bearing is clockwise
 * from the map's north, and the exercise's compass reads the same north — no
 * conversion between norths is modelled. The map, the readings, the learner's
 * lines, the checks and the answers all come from the constants below.
 *
 * Exactness: the three objects are built as the crossing of two whole-degree
 * rays from positions A and B, so every reading from A and B is exact.
 * Position C was searched for: its three bearings are within 0.02° of whole
 * degrees, so a line drawn at the rounded value passes within 0.5 m of C
 * (scripts/qa/navigation-sim.test.mjs checks both).
 *
 * Pure data and a reducer — no React — so the test runs it under plain Node.
 */
import { bearing, distance, normalizeDegrees, signedTurn } from '../locationCheckGeometry';
import type { Point, XY } from '../locationCheckScenario';

export type { Point, XY };

const RAD = Math.PI / 180;

// ---------------------------------------------------------------- the sheet

/** The map sheet, metres (4:3). */
export const SHEET = { width: 2400, height: 1800 } as const;

/** A ray from `from` at `deg` (clockwise from north) and its end on the sheet's edge. */
export function rayEnd(from: Point, deg: number): Point {
  const dE = Math.sin(deg * RAD);
  const dN = Math.cos(deg * RAD);
  const ts = [
    dE > 1e-12 ? (SHEET.width - from.E) / dE : dE < -1e-12 ? -from.E / dE : Infinity,
    dN > 1e-12 ? (SHEET.height - from.N) / dN : dN < -1e-12 ? -from.N / dN : Infinity,
  ];
  const t = Math.min(...ts);
  return { E: from.E + t * dE, N: from.N + t * dN };
}

/** Point `metres` from `from` along `deg`. */
export function along(from: Point, deg: number, metres: number): Point {
  return { E: from.E + Math.sin(deg * RAD) * metres, N: from.N + Math.cos(deg * RAD) * metres };
}

/** Where the ray from p at a° meets the ray from q at b° (the lines' crossing; null when parallel). */
export function crossing(p: Point, a: number, q: Point, b: number): Point | null {
  const u = { E: Math.sin(a * RAD), N: Math.cos(a * RAD) };
  const v = { E: Math.sin(b * RAD), N: Math.cos(b * RAD) };
  const den = u.E * v.N - u.N * v.E;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((q.E - p.E) * v.N - (q.N - p.N) * v.E) / den;
  return { E: p.E + t * u.E, N: p.N + t * u.N };
}

/** Distance from p to the segment a–b. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dE = b.E - a.E;
  const dN = b.N - a.N;
  const len2 = dE * dE + dN * dN;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.E - a.E) * dE + (p.N - a.N) * dN) / len2));
  return Math.hypot(p.E - (a.E + t * dE), p.N - (a.N + t * dN));
}

// ---------------------------------------------------------------- azimuths

/** The back azimuth: the opposite direction, in [0, 360). */
export const backAzimuth = (deg: number) => normalizeDegrees(deg + 180);

/** "056°" — three digits, as a compass is read. */
export const fmtDeg = (deg: number) => `${String(Math.round(normalizeDegrees(deg)) % 360).padStart(3, '0')}°`;

/** The working for a back azimuth, as the lesson teaches it: under 180° add 180°, from 180° up subtract 180°. */
export function backAzimuthWorking(reading: number): string {
  return reading < 180 ? `${fmtDeg(reading)} + 180° = ${fmtDeg(reading + 180)}` : `${fmtDeg(reading)} − 180° = ${fmtDeg(reading - 180)}`;
}

/**
 * A typed azimuth: digits only, 0–360 (360 is north, read as 0). Empty → null;
 * above 360 → 'over' (the field says to subtract 360°; the check waits).
 */
export function parseAzimuth(text: string | undefined): number | null | 'over' {
  if (!text) return null;
  const n = Number(text);
  if (!Number.isInteger(n)) return null;
  if (n > 360) return 'over';
  return n % 360;
}
export const sanitizeAzimuth = (text: string) => text.replace(/[^0-9]/g, '').slice(0, 3);

// ---------------------------------------------------------------- the three objects and the scenarios

export type ObjectId = 'tower' | 'antenna' | 'summit';
export const OBJECT_IDS: readonly ObjectId[] = ['tower', 'antenna', 'summit'];

/** Practice positions A and B, and the whole-degree readings from each — the objects are built from these. */
const POS_A: Point = { E: 1410, N: 1120 };
const POS_B: Point = { E: 1690, N: 520 };
const READ_A: Readonly<Record<ObjectId, number>> = { tower: 56, antenna: 284, summit: 190 };
const READ_B: Readonly<Record<ObjectId, number>> = { tower: 13, antenna: 304, summit: 238 };

const built = (id: ObjectId) => crossing(POS_A, READ_A[id], POS_B, READ_B[id])!;

export type MapObject = {
  readonly id: ObjectId;
  /** In a sentence ("מגדל המים נראה…"). */
  readonly name: string;
  /** With "from" ("קו ממגדל המים"). */
  readonly from: string;
  /** The map label. */
  readonly label: string;
  readonly pos: Point;
};

export const OBJECTS: Readonly<Record<ObjectId, MapObject>> = {
  tower: { id: 'tower', name: 'מגדל המים', from: 'ממגדל המים', label: 'מגדל מים', pos: built('tower') },
  antenna: { id: 'antenna', name: 'האנטנה', from: 'מהאנטנה', label: 'אנטנה', pos: built('antenna') },
  summit: { id: 'summit', name: 'פסגה 412', from: 'מפסגה 412', label: 'פסגה 412', pos: built('summit') },
};

export type Scenario = {
  readonly id: 'a' | 'b' | 'c';
  /** The unknown position. Never drawn, named or put in the DOM before the learner's check or a requested solution. */
  readonly position: Point;
  /** Compass readings from the position to each object, whole degrees. */
  readonly readings: Readonly<Record<ObjectId, number>>;
};

/** Position C — a searched point; its readings are the rounded bearings (all within 0.02°). */
const POS_C: Point = { E: 840.5, N: 425.5 };

export const SCENARIOS: readonly Scenario[] = [
  { id: 'a', position: POS_A, readings: READ_A },
  { id: 'b', position: POS_B, readings: READ_B },
  { id: 'c', position: POS_C, readings: { tower: 46, antenna: 337, summit: 113 } },
];

/** The opening demonstration: one measurement to the water tower, and the probe points drawn on each ray. */
export const DEMO = {
  object: 'tower' as ObjectId,
  reading: 80,
  /** Along the un-reversed ray (080° from the tower): one point, from which the tower is at 260°. */
  wrongProbesM: [260],
  /** Along the reversed ray (260° from the tower): the tower is at 080° from each. */
  rightProbesM: [300, 700, 1100],
} as const;

// ---------------------------------------------------------------- the map's ground (context only — never part of a check)

export type Hill = { readonly id: string; readonly center: Point; readonly rings: readonly number[] };
export const HILLS: readonly Hill[] = [
  { id: 'antenna-hill', center: OBJECTS.antenna.pos, rings: [235, 160, 85] },
  { id: 'summit-hill', center: OBJECTS.summit.pos, rings: [205, 135, 65] },
];

/** Dirt roads (metres, [E, N]). */
export const ROADS: readonly { id: string; pts: readonly XY[] }[] = [
  { id: 'west', pts: [[0, 980], [420, 1005], [800, 955], [1150, 900], [1500, 860]] },
  { id: 'village', pts: [[1500, 860], [1640, 1060], [1800, 1330], [1890, 1560], [1960, 1800]] },
  { id: 'south', pts: [[1000, 0], [1030, 450], [1150, 900]] },
  { id: 'east', pts: [[1500, 860], [1900, 790], [2400, 700]] },
];
/** A dry wadi, north-west to south. */
export const WADI: readonly XY[] = [[700, 1800], [760, 1500], [650, 1150], [560, 800], [420, 400], [380, 0]];

// ---------------------------------------------------------------- checks

/** A line's verdict: the learner's value from an object, against the measurement to it. */
export type LineVerdict =
  | { readonly kind: 'right' }
  /** The measured azimuth itself — not reversed. */
  | { readonly kind: 'reverse' }
  /** Built from another object's measurement (reversed or not). */
  | { readonly kind: 'other-object'; readonly other: ObjectId; readonly reversed: boolean }
  /** Anything else: the turn from the line to the right one, positive clockwise. */
  | { readonly kind: 'off'; readonly turn: number };

/**
 * `known` are the objects whose measurements the learner holds — the two chosen
 * in the lines step, all three when verifying.
 */
export function evaluateLine(readings: Readonly<Record<ObjectId, number>>, id: ObjectId, value: number, known: readonly ObjectId[]): LineVerdict {
  const v = normalizeDegrees(value);
  const right = backAzimuth(readings[id]);
  if (v === right) return { kind: 'right' };
  if (v === readings[id]) return { kind: 'reverse' };
  for (const other of known) {
    if (other === id) continue;
    if (v === backAzimuth(readings[other])) return { kind: 'other-object', other, reversed: true };
    if (v === readings[other]) return { kind: 'other-object', other, reversed: false };
  }
  return { kind: 'off', turn: signedTurn(v, right) };
}

/** A mark this close to the position is right (≈ 16 px on the desktop map). */
export const MARK_TOLERANCE_M = 60;
/**
 * A right mark this close to the crossing is "on" it — inside the mark's centre
 * dot (r 10 m). Farther, the text gives the distance instead of saying a line
 * passes through the mark.
 */
export const ON_CROSSING_M = 10;
/** A mark this close to a line is "on" it, for the feedback. */
export const ON_LINE_M = 40;

export type MarkVerdict =
  | { readonly kind: 'right'; readonly offM: number }
  /** On one line, away from the other. */
  | { readonly kind: 'one-line'; readonly on: ObjectId; readonly off: ObjectId }
  /** Near both lines, not yet at their crossing. */
  | { readonly kind: 'near' }
  /** On neither line. */
  | { readonly kind: 'no-line' };

/** The learner's ray from an object (to the sheet's edge). */
export const lineSegment = (id: ObjectId, deg: number) => [OBJECTS[id].pos, rayEnd(OBJECTS[id].pos, deg)] as const;

export function evaluateMark(scenario: Scenario, chosen: readonly [ObjectId, ObjectId], mark: Point): MarkVerdict {
  const offM = distance(mark, scenario.position);
  if (offM <= MARK_TOLERANCE_M) return { kind: 'right', offM };
  const [a, b] = chosen;
  const da = distanceToSegment(mark, ...lineSegment(a, backAzimuth(scenario.readings[a])));
  const db = distanceToSegment(mark, ...lineSegment(b, backAzimuth(scenario.readings[b])));
  if (da <= ON_LINE_M && db <= ON_LINE_M) return { kind: 'near' };
  if (da <= ON_LINE_M) return { kind: 'one-line', on: a, off: b };
  if (db <= ON_LINE_M) return { kind: 'one-line', on: b, off: a };
  return { kind: 'no-line' };
}

/** The ideal-measurement caveat at the end: how far a line moves at the position for a small compass error. */
export const REAL_ERROR_DEG = 2;
export const lineShiftAt = (metres: number, deg = REAL_ERROR_DEG) => metres * Math.tan(deg * RAD);

// ---------------------------------------------------------------- state

export type Step = 'demo-1' | 'demo-2' | 'choose' | 'lines' | 'mark' | 'verify' | 'done';
/** The stepper: הדגמה · בחירה · קווים · מיקום · אימות. */
export const STEP_NUMBER: Record<Step, 1 | 2 | 3 | 4 | 5> = { 'demo-1': 1, 'demo-2': 1, choose: 2, lines: 3, mark: 4, verify: 5, done: 5 };

export type Stage = 'lines' | 'mark' | 'verify';
/** Help in one stage: wrong checks so far, hints opened (0–2), and whether the solution was shown. */
export type Help = { readonly wrong: number; readonly hint: 0 | 1 | 2; readonly solved: boolean };
const NO_HELP: Help = { wrong: 0, hint: 0, solved: false };

export type State = {
  readonly scenario: number;
  readonly step: Step;
  /** Chosen objects, in the order chosen; at most two. */
  readonly chosen: readonly ObjectId[];
  /** What the learner typed in each line's field. */
  readonly entries: Readonly<Partial<Record<ObjectId, string>>>;
  /** The values the last check judged; an entry changed since has no verdict. */
  readonly judged: Readonly<Partial<Record<ObjectId, number>>>;
  readonly marker: Point | null;
  readonly markJudged: Point | null;
  readonly help: Readonly<Record<Stage, Help>>;
  /** Every check, for announcing each result once. */
  readonly checks: number;
};

export const INITIAL_STATE: State = {
  scenario: 0,
  step: 'demo-1',
  chosen: [],
  entries: {},
  judged: {},
  marker: null,
  markJudged: null,
  help: { lines: NO_HELP, mark: NO_HELP, verify: NO_HELP },
  checks: 0,
};

/** A fresh practice round (after the demonstration). */
const freshRound = (scenario: number): State => ({ ...INITIAL_STATE, scenario, step: 'choose' });

export type Action =
  | { type: 'next' }
  | { type: 'toggle'; id: ObjectId }
  | { type: 'measure' }
  | { type: 'setEntry'; id: ObjectId; text: string }
  | { type: 'nudge'; id: ObjectId; by: number }
  | { type: 'checkLines' }
  | { type: 'toMark' }
  | { type: 'place'; at: Point }
  | { type: 'move'; dE: number; dN: number }
  | { type: 'checkMark' }
  | { type: 'toVerify' }
  | { type: 'checkVerify' }
  | { type: 'hint'; stage: Stage }
  | { type: 'solve'; stage: Stage }
  | { type: 'reset' }
  | { type: 'nextScenario' };

const samePoint = (a: Point | null, b: Point | null) => !!a && !!b && a.E === b.E && a.N === b.N;
const clampToSheet = (p: Point): Point => ({ E: Math.min(SHEET.width, Math.max(0, p.E)), N: Math.min(SHEET.height, Math.max(0, p.N)) });

/** Derived view: the verdicts that still hold, and what the card may show. */
export function view(s: State) {
  const scenario = SCENARIOS[s.scenario];
  const pair = s.chosen.length === 2 ? ([s.chosen[0], s.chosen[1]] as const) : null;
  const third = pair ? OBJECT_IDS.find((id) => !s.chosen.includes(id))! : null;
  const value = (id: ObjectId) => {
    const v = parseAzimuth(s.entries[id]);
    return typeof v === 'number' ? v : null;
  };
  /** The verdict of a line, while its field still holds the judged value. */
  const verdict = (id: ObjectId): LineVerdict | null => {
    const v = value(id);
    const j = s.judged[id];
    if (v === null || j === undefined || j !== v) return null;
    return evaluateLine(scenario.readings, id, v, s.step === 'verify' || s.step === 'done' ? OBJECT_IDS : s.chosen);
  };
  const isRight = (id: ObjectId) => verdict(id)?.kind === 'right';
  const linesRight = !!pair && pair.every(isRight);
  const mark = pair && s.markJudged && samePoint(s.marker, s.markJudged) ? evaluateMark(scenario, pair, s.marker!) : null;
  const verify = third ? verdict(third) : null;
  return {
    scenario,
    pair,
    third,
    value,
    verdict,
    isRight,
    linesRight,
    mark,
    markRight: mark?.kind === 'right',
    verifyRight: verify?.kind === 'right',
    stepNumber: STEP_NUMBER[s.step],
    done: s.step === 'done',
  };
}

/** A stage the learner has got right (by checking, or by the solution) needs no more help. */
function stageSettled(s: State, stage: Stage) {
  const v = view(s);
  if (s.help[stage].solved) return true;
  return stage === 'lines' ? v.linesRight : stage === 'mark' ? v.markRight : v.verifyRight || s.step === 'done';
}

/**
 * Which help a stage offers now: a hint after a wrong check; the solution after
 * a hint or a second wrong check; nothing once the stage is right. `show` says
 * whether opened hints are still shown.
 */
export function helpOffer(s: State, stage: Stage) {
  const h = s.help[stage];
  const open = !stageSettled(s, stage) && h.wrong > 0;
  return { hint: open && h.hint < 2, solve: open && (h.hint > 0 || h.wrong > 1), show: open && h.hint > 0 };
}

export function reducer(s: State, a: Action): State {
  const v = view(s);
  const sc = v.scenario;
  switch (a.type) {
    case 'next':
      if (s.step === 'demo-1') return { ...s, step: 'demo-2' };
      if (s.step === 'demo-2') return freshRound(s.scenario);
      return s;
    case 'toggle': {
      if (s.step !== 'choose') return s;
      if (s.chosen.includes(a.id)) return { ...s, chosen: s.chosen.filter((id) => id !== a.id) };
      // A third choice replaces the earliest one.
      const chosen = s.chosen.length < 2 ? [...s.chosen, a.id] : [s.chosen[1], a.id];
      return { ...s, chosen };
    }
    case 'measure':
      return s.step === 'choose' && s.chosen.length === 2 ? { ...s, step: 'lines' } : s;
    case 'setEntry':
    case 'nudge': {
      const editable = (s.step === 'lines' && s.chosen.includes(a.id)) || (s.step === 'verify' && a.id === v.third);
      if (!editable || v.isRight(a.id)) return s;
      let text: string;
      if (a.type === 'setEntry') text = sanitizeAzimuth(a.text);
      else {
        const cur = v.value(a.id);
        text = String(normalizeDegrees((cur ?? 0) + a.by));
      }
      return { ...s, entries: { ...s.entries, [a.id]: text } };
    }
    case 'checkLines': {
      if (s.step !== 'lines' || !v.pair) return s;
      const vals = v.pair.map((id) => v.value(id));
      if (vals.some((x) => x === null)) return s;
      // Nothing new to judge: the same values were checked already.
      if (v.pair.every((id, k) => s.judged[id] === vals[k])) return s;
      const judged = { ...s.judged, [v.pair[0]]: vals[0]!, [v.pair[1]]: vals[1]! };
      const allRight = v.pair.every((id, k) => evaluateLine(sc.readings, id, vals[k]!, s.chosen).kind === 'right');
      const h = s.help.lines;
      return { ...s, judged, checks: s.checks + 1, help: { ...s.help, lines: allRight ? h : { ...h, wrong: h.wrong + 1 } } };
    }
    case 'toMark':
      return s.step === 'lines' && v.linesRight ? { ...s, step: 'mark' } : s;
    case 'place':
      if (s.step !== 'mark' || v.markRight || s.help.mark.solved) return s;
      return { ...s, marker: clampToSheet(a.at) };
    case 'move': {
      if (s.step !== 'mark' || v.markRight || s.help.mark.solved) return s;
      const from = s.marker ?? { E: SHEET.width / 2, N: SHEET.height / 2 };
      return { ...s, marker: s.marker ? clampToSheet({ E: from.E + a.dE, N: from.N + a.dN }) : from };
    }
    case 'checkMark': {
      if (s.step !== 'mark' || !s.marker || !v.pair || samePoint(s.marker, s.markJudged)) return s;
      const right = evaluateMark(sc, v.pair, s.marker).kind === 'right';
      const h = s.help.mark;
      return { ...s, markJudged: s.marker, checks: s.checks + 1, help: { ...s.help, mark: right ? h : { ...h, wrong: h.wrong + 1 } } };
    }
    case 'toVerify':
      return s.step === 'mark' && (v.markRight || s.help.mark.solved) ? { ...s, step: 'verify' } : s;
    case 'checkVerify': {
      if (s.step !== 'verify' || !v.third) return s;
      const val = v.value(v.third);
      if (val === null || s.judged[v.third] === val) return s;
      const right = evaluateLine(sc.readings, v.third, val, OBJECT_IDS).kind === 'right';
      const h = s.help.verify;
      return {
        ...s,
        judged: { ...s.judged, [v.third]: val },
        checks: s.checks + 1,
        step: right ? 'done' : 'verify',
        help: { ...s.help, verify: right ? h : { ...h, wrong: h.wrong + 1 } },
      };
    }
    case 'hint': {
      if (s.step !== a.stage || !helpOffer(s, a.stage).hint) return s;
      const h = s.help[a.stage];
      return { ...s, help: { ...s.help, [a.stage]: { ...h, hint: (h.hint + 1) as 1 | 2 } } };
    }
    case 'solve': {
      if (s.step !== a.stage || !helpOffer(s, a.stage).solve) return s;
      const help = { ...s.help, [a.stage]: { ...s.help[a.stage], solved: true } };
      if (a.stage === 'mark') return { ...s, marker: sc.position, markJudged: sc.position, help };
      const ids = a.stage === 'lines' ? s.chosen : [v.third!];
      const entries = { ...s.entries };
      const judged = { ...s.judged };
      for (const id of ids) {
        const right = backAzimuth(sc.readings[id]);
        entries[id] = String(right);
        judged[id] = right;
      }
      return { ...s, entries, judged, help, step: a.stage === 'verify' ? 'done' : s.step };
    }
    case 'reset':
      return s.step === 'demo-1' || s.step === 'demo-2' ? INITIAL_STATE : freshRound(s.scenario);
    case 'nextScenario':
      return freshRound((s.scenario + 1) % SCENARIOS.length);
  }
}
