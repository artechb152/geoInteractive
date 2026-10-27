/* ─────────── קוראים את המפה — lesson 2 › תרגול: scenarios, answers and state ───────────
   One fictional map per scenario, four short tasks on it:

     1 זיהוי    which of three marked elements is relief (תבליט), not cover (תכסית)
     2 תלילות   which of two segments with the same height difference is gentler
     3 מרחק     the horizontal distance between two points, from the ruler and the map's scale
     4 מיקום    which of three full UTM readings describes a point on a grid intersection

   Everything the map draws and every answer comes from the scenario below and the height model in
   practiceTerrain.ts: contours, spot heights, segment ends, the ruler, grid labels and the readings.
   Pure data and functions (no JSX), shared with scripts/qa/cartography-practice.test.mjs. */

import { contours, dist, heightAt, pointAtLevel, topNear, type ContourLevel, type Terrain, type XY } from './practiceTerrain';

export type { XY } from './practiceTerrain';

/* ── scenarios ───────────────────────────────────────────────────────────── */

export type MarkLetter = 'א' | 'ב' | 'ג';
export type FeatureKind = 'dome' | 'saddle' | 'grove' | 'orchard' | 'building' | 'road';
export type SegmentId = '1' | '2';

/** A full UTM reading offered in task 4, as offsets from the point's own grid lines. */
export type ReadingSpec = { readonly dE: 0 | 1; readonly dN: 0 | 1; readonly hemi: 'N' | 'S'; readonly swap: boolean };

type ScenarioDef = {
  readonly id: 'A' | 'B';
  readonly denominator: number;
  /** Ground size of the sheet (m): x east, y north. */
  readonly ground: { readonly w: number; readonly h: number };
  /** UTM of the sheet's south-west corner (m). */
  readonly origin: { readonly E: number; readonly N: number };
  readonly gridStep: number;
  readonly interval: number;
  readonly indexEvery: number;
  /** Contour sample spacing (m). */
  readonly sample: number;
  readonly terrain: Terrain;
  readonly cover: {
    readonly groves: readonly (readonly XY[])[];
    readonly orchards: readonly (readonly XY[])[];
    readonly buildings: readonly { readonly at: XY; readonly w: number; readonly h: number; readonly angle: number }[];
    readonly roads: readonly (readonly XY[])[];
  };
  /** Task 1: three marks, one of them on relief. A mark on a hill or saddle is placed by the model. */
  readonly relief: readonly { readonly letter: MarkLetter; readonly kind: FeatureKind; readonly at?: XY; readonly hills?: readonly number[] }[];
  /** Task 2: two segments down the same hill, between the same two contour levels. */
  readonly slope: { readonly hill: number; readonly levels: readonly [number, number]; readonly segments: readonly { readonly id: SegmentId; readonly dir: XY }[] };
  /** Task 3: the two points. */
  readonly distance: { readonly a: XY; readonly b: XY };
  /** Task 4: the point (on a grid intersection) and the three readings in the order shown. */
  readonly location: { readonly at: XY; readonly options: readonly { readonly letter: MarkLetter; readonly spec: ReadingSpec }[] };
};

export const ZONE = 36;
export const HEMISPHERE = 'N' as const;
export const DATUM = 'WGS84';

const DEFS: readonly ScenarioDef[] = [
  {
    id: 'A',
    denominator: 10_000,
    ground: { w: 2000, h: 1500 },
    origin: { E: 684_000, N: 3_621_000 },
    gridStep: 500,
    interval: 10,
    indexEvery: 5,
    sample: 10,
    terrain: {
      base: 120,
      tilt: [0.008, 0],
      hills: [
        { x: 1250, y: 820, amp: 145, sx: [560, 230], sy: [360, 340] },
        { x: 280, y: 1260, amp: 22, sx: [260, 260], sy: [220, 220] },
      ],
    },
    cover: {
      groves: [[[300, 340], [380, 300], [500, 310], [580, 380], [570, 500], [480, 570], [360, 560], [290, 470]]],
      orchards: [],
      buildings: [
        { at: [1720, 330], w: 34, h: 22, angle: -8 },
        { at: [1770, 360], w: 22, h: 18, angle: -8 },
        { at: [1690, 380], w: 20, h: 16, angle: -8 },
      ],
      roads: [[[2000, 250], [1840, 280], [1730, 300], [1560, 240], [1240, 190], [900, 170], [620, 220], [300, 230], [0, 260]]],
    },
    relief: [
      { letter: 'א', kind: 'grove', at: [440, 440] },
      { letter: 'ב', kind: 'building', at: [1720, 330] },
      { letter: 'ג', kind: 'dome', hills: [0] },
    ],
    slope: {
      hill: 0,
      levels: [180, 240],
      segments: [
        { id: '1', dir: [1, 0] },
        { id: '2', dir: [-1, 0] },
      ],
    },
    distance: { a: [1500, 1350], b: [860, 870] },
    location: {
      at: [1000, 1000],
      options: [
        { letter: 'א', spec: { dE: 1, dN: 0, hemi: 'N', swap: false } },
        { letter: 'ב', spec: { dE: 0, dN: 0, hemi: 'N', swap: false } },
        { letter: 'ג', spec: { dE: 1, dN: 0, hemi: 'S', swap: false } },
      ],
    },
  },
  {
    id: 'B',
    denominator: 20_000,
    ground: { w: 4000, h: 3000 },
    origin: { E: 702_000, N: 3_578_000 },
    gridStep: 1000,
    interval: 20,
    indexEvery: 5,
    sample: 20,
    terrain: {
      base: 280,
      tilt: [0, 0.01],
      hills: [
        { x: 1300, y: 1950, amp: 190, sx: [460, 440], sy: [430, 460] },
        { x: 2750, y: 1650, amp: 200, sx: [430, 450], sy: [800, 360] },
      ],
    },
    cover: {
      groves: [],
      orchards: [[[2900, 250], [3650, 250], [3650, 720], [2900, 720]]],
      buildings: [
        { at: [700, 760], w: 60, h: 44, angle: 6 },
        { at: [800, 720], w: 50, h: 40, angle: 6 },
      ],
      roads: [[[0, 820], [450, 800], [760, 700], [1200, 640], [1700, 560], [2300, 470], [2850, 400], [3700, 160], [4000, 120]]],
    },
    relief: [
      { letter: 'א', kind: 'saddle', hills: [0, 1] },
      { letter: 'ב', kind: 'orchard', at: [3280, 490] },
      { letter: 'ג', kind: 'road', at: [1450, 600] },
    ],
    slope: {
      hill: 1,
      levels: [360, 460],
      segments: [
        { id: '1', dir: [0, -1] },
        { id: '2', dir: [0, 1] },
      ],
    },
    distance: { a: [520, 300], b: [1600, 1740] },
    location: {
      at: [3000, 2000],
      options: [
        { letter: 'א', spec: { dE: 0, dN: 1, hemi: 'N', swap: false } },
        { letter: 'ב', spec: { dE: 0, dN: 1, hemi: 'N', swap: true } },
        { letter: 'ג', spec: { dE: 0, dN: 0, hemi: 'N', swap: false } },
      ],
    },
  },
];

export const SCENARIO_COUNT = DEFS.length;

/* ── derived geometry (computed once per scenario) ───────────────────────── */

export type Segment = { readonly id: SegmentId; readonly a: XY; readonly b: XY; readonly length: number };
export type ReliefMark = { readonly letter: MarkLetter; readonly kind: FeatureKind; readonly at: XY };
export type Reading = { readonly letter: MarkLetter; readonly spec: ReadingSpec; readonly zone: number; readonly hemi: 'N' | 'S'; readonly E: number; readonly N: number; readonly text: string };

export type Scenario = ScenarioDef & {
  readonly contours: readonly ContourLevel[];
  readonly tops: readonly { readonly at: XY; readonly z: number }[];
  readonly marks: readonly ReliefMark[];
  readonly reliefAnswer: MarkLetter;
  readonly segments: readonly Segment[];
  readonly slopeAnswer: SegmentId;
  /** Task 3: ground distance (m), map distance (cm on the printed sheet), tolerance (m). */
  readonly ground3: { readonly metres: number; readonly cm: number; readonly tolerance: number };
  /** Metres on the ground per cm of the sheet. */
  readonly mPerCm: number;
  readonly point: { readonly E: number; readonly N: number };
  readonly readings: readonly Reading[];
  readonly locationAnswer: MarkLetter;
  readonly gridE: readonly number[];
  readonly gridN: readonly number[];
};

/** Sheet distance (mm) a ruler reading is trusted to, and the task-3 tolerance it sets. */
export const READ_MM = 2;

/** The saddle between two tops: the lowest point of the highest path between them (refined numerically). */
function saddleBetween(t: Terrain, p: XY, q: XY): XY {
  // Lowest point on the straight line, then climb across it to the ridge, a few rounds.
  let best: XY = p;
  let bestZ = Infinity;
  for (let k = 1; k < 200; k++) {
    const s: XY = [p[0] + ((q[0] - p[0]) * k) / 200, p[1] + ((q[1] - p[1]) * k) / 200];
    const z = heightAt(t, s[0], s[1]);
    if (z < bestZ) {
      bestZ = z;
      best = s;
    }
  }
  const ux = (q[0] - p[0]) / dist(p, q);
  const uy = (q[1] - p[1]) / dist(p, q);
  let [x, y] = best;
  for (let round = 0; round < 40; round++) {
    // across the line: maximise; along it: minimise (golden-free small search)
    for (const [dx, dy, maxim] of [[-uy, ux, true], [ux, uy, false]] as const) {
      let lo = -120;
      let hi = 120;
      for (let i = 0; i < 50; i++) {
        const m1 = lo + (hi - lo) / 3;
        const m2 = hi - (hi - lo) / 3;
        const z1 = heightAt(t, x + dx * m1, y + dy * m1);
        const z2 = heightAt(t, x + dx * m2, y + dy * m2);
        if (maxim ? z1 < z2 : z1 > z2) lo = m1;
        else hi = m2;
      }
      const m = (lo + hi) / 2;
      x += dx * m;
      y += dy * m;
    }
  }
  return [x, y];
}

const fmtReading = (zone: number, hemi: string, first: [string, number], second: [string, number]) =>
  `${DATUM} · UTM ${zone}${hemi} · ${first[0]} ${first[1]} · ${second[0]} ${second[1]}`;

function derive(def: ScenarioDef): Scenario {
  const t = def.terrain;
  const tops = def.terrain.hills.map((h) => {
    const at = topNear(t, [h.x, h.y]);
    return { at, z: heightAt(t, at[0], at[1]) };
  });
  const marks = def.relief.map((r): ReliefMark => {
    if (r.kind === 'dome') return { letter: r.letter, kind: r.kind, at: tops[r.hills![0]].at };
    if (r.kind === 'saddle') return { letter: r.letter, kind: r.kind, at: saddleBetween(t, tops[r.hills![0]].at, tops[r.hills![1]].at) };
    return { letter: r.letter, kind: r.kind, at: r.at! };
  });
  const reliefAnswer = marks.find((m) => m.kind === 'dome' || m.kind === 'saddle')!.letter;

  const top = tops[def.slope.hill].at;
  const reach = Math.max(def.ground.w, def.ground.h);
  const segments = def.slope.segments.map((s): Segment => {
    const hiPt = pointAtLevel(t, top, s.dir, def.slope.levels[1], reach);
    const loPt = pointAtLevel(t, top, s.dir, def.slope.levels[0], reach);
    return { id: s.id, a: hiPt, b: loPt, length: dist(hiPt, loPt) };
  });
  const slopeAnswer = segments.reduce((a, b) => (b.length > a.length ? b : a)).id;

  const metres = dist(def.distance.a, def.distance.b);
  const mPerCm = def.denominator / 100;
  const ground3 = { metres, cm: metres / mPerCm, tolerance: (READ_MM / 10) * mPerCm };

  const point = { E: def.origin.E + def.location.at[0], N: def.origin.N + def.location.at[1] };
  const readings = def.location.options.map(({ letter, spec }): Reading => {
    const E = point.E + spec.dE * def.gridStep;
    const N = point.N + spec.dN * def.gridStep;
    const text = spec.swap ? fmtReading(ZONE, spec.hemi, ['E', N], ['N', E]) : fmtReading(ZONE, spec.hemi, ['E', E], ['N', N]);
    return { letter, spec, zone: ZONE, hemi: spec.hemi, E: spec.swap ? N : E, N: spec.swap ? E : N, text };
  });
  const locationAnswer = readings.find((r) => r.hemi === HEMISPHERE && !r.spec.swap && r.E === point.E && r.N === point.N)!.letter;

  const gridE: number[] = [];
  for (let x = 0; x <= def.ground.w; x += def.gridStep) gridE.push(def.origin.E + x);
  const gridN: number[] = [];
  for (let y = 0; y <= def.ground.h; y += def.gridStep) gridN.push(def.origin.N + y);

  return {
    ...def,
    contours: contours(t, def.ground.w, def.ground.h, def.interval, def.indexEvery, def.sample),
    tops,
    marks,
    reliefAnswer,
    segments,
    slopeAnswer,
    ground3,
    mPerCm,
    point,
    readings,
    locationAnswer,
    gridE,
    gridN,
  };
}

const cache = new Map<number, Scenario>();
export function scenario(i: number): Scenario {
  let s = cache.get(i);
  if (!s) {
    s = derive(DEFS[i]);
    cache.set(i, s);
  }
  return s;
}

/* ── verdicts ────────────────────────────────────────────────────────────── */

export type TaskId = 'relief' | 'slope' | 'distance' | 'location';
export const TASKS: readonly TaskId[] = ['relief', 'slope', 'distance', 'location'];

export type ReliefVerdict = 'right' | 'cover-natural' | 'cover-artificial';
export type SlopeVerdict = 'right' | 'steeper';
export type DistanceVerdict = 'right' | 'map-cm' | 'units-km' | 'units-cm' | 'scale' | 'far';
export type LocationVerdict = 'right' | 'adjacent-E' | 'adjacent-N' | 'hemisphere' | 'swap';
export type Verdict = ReliefVerdict | SlopeVerdict | DistanceVerdict | LocationVerdict;

export function reliefVerdict(sc: Scenario, letter: string): ReliefVerdict {
  const m = sc.marks.find((x) => x.letter === letter)!;
  if (m.kind === 'dome' || m.kind === 'saddle') return 'right';
  return m.kind === 'grove' ? 'cover-natural' : 'cover-artificial';
}

export function slopeVerdict(sc: Scenario, id: string): SlopeVerdict {
  return id === sc.slopeAnswer ? 'right' : 'steeper';
}

/** Factors that mean "a wrong scale" (distance = factor × the right one), apart from the unit mistakes. */
const SCALE_FACTORS = [10, 0.1, 2, 0.5, 2.5, 0.4, 5, 0.2, 1000];

/** Parses a typed distance: digits with an optional decimal point; thousands commas allowed. */
export function parseMetres(raw: string): number | null {
  const s = raw.replace(/[\s, ]/g, '').replace(/מ(׳|')?$/u, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

export function distanceVerdict(sc: Scenario, x: number): DistanceVerdict {
  const { metres: D, cm, tolerance: T } = sc.ground3;
  if (Math.abs(x - D) <= T) return 'right';
  if (Math.abs(x - cm) <= READ_MM / 10) return 'map-cm';
  if (Math.abs(x - D / 1000) <= T / 1000) return 'units-km';
  if (Math.abs(x - D * 100) <= T * 100) return 'units-cm';
  if (SCALE_FACTORS.some((f) => Math.abs(x - f * D) <= f * T)) return 'scale';
  return 'far';
}

export function locationVerdict(sc: Scenario, letter: string): LocationVerdict {
  const r = sc.readings.find((x) => x.letter === letter)!;
  if (r.spec.swap) return 'swap';
  if (r.hemi !== HEMISPHERE) return 'hemisphere';
  if (r.spec.dE) return 'adjacent-E';
  if (r.spec.dN) return 'adjacent-N';
  return 'right';
}

/** The normal form of an answer: equal forms are the same answer (re-checking it is not a new try). */
export function normalise(task: TaskId, raw: string): string | null {
  if (task !== 'distance') return raw || null;
  const v = parseMetres(raw);
  return v === null ? null : String(v);
}

export function verdictOf(sc: Scenario, task: TaskId, norm: string): Verdict {
  if (task === 'relief') return reliefVerdict(sc, norm);
  if (task === 'slope') return slopeVerdict(sc, norm);
  if (task === 'location') return locationVerdict(sc, norm);
  return distanceVerdict(sc, Number(norm));
}

/** The answer the solution fills in. */
export function solutionOf(sc: Scenario, task: TaskId): string {
  if (task === 'relief') return sc.reliefAnswer;
  if (task === 'slope') return sc.slopeAnswer;
  if (task === 'location') return sc.locationAnswer;
  return String(Math.round(sc.ground3.metres));
}

/* ── state ───────────────────────────────────────────────────────────────── */

export type TaskState = {
  /** The current selection or typed text (neutral until checked). */
  readonly answer: string;
  /** The last check: the normal form checked and its verdict. Shown only while the answer still has that form. */
  readonly checked: { readonly norm: string; readonly verdict: Verdict } | null;
  /** Distinct wrong answers (normal forms). */
  readonly wrong: readonly string[];
  readonly hint: boolean;
  readonly outcome: null | 'right' | 'solution';
};

export type State = {
  readonly scenario: number;
  /** 0–3 = the tasks, 4 = the summary. */
  readonly step: number;
  readonly tasks: Readonly<Record<TaskId, TaskState>>;
  /** Count of checks (keys the feedback so a repeated verdict is announced again). */
  readonly checks: number;
};

const EMPTY_TASK: TaskState = { answer: '', checked: null, wrong: [], hint: false, outcome: null };
const freshTasks = (): Record<TaskId, TaskState> => ({ relief: EMPTY_TASK, slope: EMPTY_TASK, distance: EMPTY_TASK, location: EMPTY_TASK });

export const initialState = (scenarioIdx = 0): State => ({ scenario: scenarioIdx, step: 0, tasks: freshTasks(), checks: 0 });

export type Action =
  | { type: 'answer'; task: TaskId; value: string }
  | { type: 'check'; task: TaskId }
  | { type: 'hint'; task: TaskId }
  | { type: 'solve'; task: TaskId }
  | { type: 'goto'; step: number }
  | { type: 'restart' }
  | { type: 'nextScenario' };

/** The furthest step the learner may open: every task before it is done. */
export function reachable(s: State): number {
  let k = 0;
  while (k < TASKS.length && s.tasks[TASKS[k]].outcome) k++;
  return k;
}

export function reducer(s: State, a: Action): State {
  const sc = scenario(s.scenario);
  const put = (task: TaskId, next: TaskState): State => ({ ...s, tasks: { ...s.tasks, [task]: next } });
  switch (a.type) {
    case 'answer': {
      const t = s.tasks[a.task];
      if (t.outcome || t.answer === a.value) return s;
      return put(a.task, { ...t, answer: a.value });
    }
    case 'check': {
      const t = s.tasks[a.task];
      if (t.outcome) return s;
      const norm = normalise(a.task, t.answer);
      if (norm === null) return s;
      // The same answer again: no new try, no change in the help offered.
      if (t.checked && t.checked.norm === norm) return s;
      const verdict = verdictOf(sc, a.task, norm);
      const right = verdict === 'right';
      const next: TaskState = {
        ...t,
        checked: { norm, verdict },
        wrong: right || t.wrong.includes(norm) ? t.wrong : [...t.wrong, norm],
        outcome: right ? 'right' : null,
      };
      return { ...put(a.task, next), checks: s.checks + 1 };
    }
    case 'hint': {
      const t = s.tasks[a.task];
      if (t.outcome || t.hint || !helpOffer(t).hint) return s;
      return put(a.task, { ...t, hint: true });
    }
    case 'solve': {
      const t = s.tasks[a.task];
      if (t.outcome || !helpOffer(t).solve) return s;
      const answer = solutionOf(sc, a.task);
      return { ...put(a.task, { ...t, answer, checked: { norm: normalise(a.task, answer)!, verdict: 'right' }, outcome: 'solution' }), checks: s.checks + 1 };
    }
    case 'goto':
      if (a.step < 0 || a.step > reachable(s) || a.step === s.step) return s;
      return { ...s, step: a.step };
    case 'restart':
      return initialState(s.scenario);
    case 'nextScenario':
      return initialState((s.scenario + 1) % SCENARIO_COUNT);
  }
}

/** Hint after the first wrong check; the solution after two different wrong answers or after the hint. */
export function helpOffer(t: TaskState): { hint: boolean; solve: boolean } {
  if (t.outcome) return { hint: false, solve: false };
  return { hint: t.wrong.length >= 1 && !t.hint, solve: t.wrong.length >= 2 || t.hint };
}

/** The verdict to show now: only while the answer is still the one that was checked. */
export function shownVerdict(task: TaskId, t: TaskState): Verdict | null {
  if (!t.checked) return null;
  return normalise(task, t.answer) === t.checked.norm ? t.checked.verdict : null;
}

export type Result = 'self' | 'hint' | 'solution';
export function resultOf(t: TaskState): Result | null {
  if (!t.outcome) return null;
  if (t.outcome === 'solution') return 'solution';
  return t.hint ? 'hint' : 'self';
}

/* ── formatting ──────────────────────────────────────────────────────────── */

/** 1500 → "1,500". */
export const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US');
/** 8 → "8", 8.5 → "8.5". */
export const fmtCm = (v: number) => (Math.round(v * 10) / 10).toString();
export const fmtRatio = (d: number) => `1:${fmtInt(d)}`;
/** A horizontal length rounded for prose (to 10 m). */
export const round10 = (v: number) => Math.round(v / 10) * 10;
