/**
 * The route story of lesson 6 („תכנון ציר: בניית סיפור דרך”): five points,
 * the four legs that join them, the map geometry they are drawn from, and
 * the learner's one application step — writing leg ד׳ from the map.
 *
 * One source for everything shown: the map draws each leg from its azimuth
 * and distance (north up, never mirrored), the list and the panel print the
 * same numbers, and the signs named in the text are the objects drawn on the
 * map at those places. scripts/qa/route-story.test.mjs checks that they agree.
 *
 * Map units: the SVG viewBox is 100 × 92, x grows east, y grows south.
 *
 * Pure data and a reducer — no React — so the test runs it under plain Node.
 */

// ---------------------------------------------------------------- geometry

export type Pt = { x: number; y: number };

export const VIEW_W = 100;
export const VIEW_H = 92;
/** Map scale: metres per SVG unit (the 500 מ׳ scale bar is drawn from it). */
export const M_PER_UNIT = 23.5;
/** נ.ה — where the route starts. */
export const START: Pt = { x: 14, y: 80 };

const fx = (n: number) => Math.round(n * 100) / 100;

/** The point `dist` units from `p` on the bearing `az` (degrees clockwise from north). */
export function polar(p: Pt, az: number, dist: number): Pt {
  const r = (az * Math.PI) / 180;
  return { x: fx(p.x + dist * Math.sin(r)), y: fx(p.y - dist * Math.cos(r)) };
}

export function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: fx(a.x + (b.x - a.x) * t), y: fx(a.y + (b.y - a.y) * t) };
}

/** Bearing from a to b, degrees clockwise from north, 0–360. */
export function bearing(a: Pt, b: Pt): number {
  const deg = (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/** A path of cubic Bézier curves: a start point, then [control 1, control 2, end] per curve. */
export type CurvePath = { start: Pt; curves: readonly (readonly [Pt, Pt, Pt])[] };

const P = (x: number, y: number): Pt => ({ x, y });

export function pathD(c: CurvePath): string {
  return `M${c.start.x} ${c.start.y} ${c.curves.map(([a, b, e]) => `C ${a.x} ${a.y}, ${b.x} ${b.y}, ${e.x} ${e.y}`).join(' ')}`;
}

/** The curve as a polyline (enough points to measure crossings to a few hundredths of a unit). */
export function samplePath(c: CurvePath, perCurve = 48): Pt[] {
  const out: Pt[] = [c.start];
  let p0 = c.start;
  for (const [c1, c2, e] of c.curves) {
    for (let k = 1; k <= perCurve; k++) {
      const t = k / perCurve;
      const u = 1 - t;
      out.push({
        x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * e.x,
        y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * e.y,
      });
    }
    p0 = e;
  }
  return out;
}

/** Where segment a→b crosses a polyline: the fraction along a→b (0–1) and the point. */
export function crossings(a: Pt, b: Pt, line: readonly Pt[]): { t: number; at: Pt }[] {
  const out: { t: number; at: Pt }[] = [];
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  for (let i = 1; i < line.length; i++) {
    const p = line[i - 1];
    const q = line[i];
    const sx = q.x - p.x;
    const sy = q.y - p.y;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((p.x - a.x) * sy - (p.y - a.y) * sx) / den;
    const u = ((p.x - a.x) * ry - (p.y - a.y) * rx) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u < 1) out.push({ t, at: { x: a.x + rx * t, y: a.y + ry * t } });
  }
  return out;
}

/** Shortest distance from a point to a polyline. */
export function distToLine(p: Pt, line: readonly Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t)));
  }
  return best;
}

// ---------------------------------------------------------------- the ground

/** The stream: it comes from the west, bends south at point 2, and leg ב׳ crosses it just after. */
export const STREAM: CurvePath = {
  start: P(-3, 47),
  curves: [
    [P(7, 48.5), P(16, 52.5), P(22.5, 56)],
    [P(26.5, 58), P(29.6, 58.6), P(30.8, 61.6)],
    [P(32, 65), P(33.2, 70), P(39, 73)],
    [P(47, 77), P(60, 76.5), P(72, 78.5)],
    [P(84, 80.5), P(94, 79), P(103, 80.5)],
  ],
};
/** Where the stream turns from south-east to south (the bend named at point 2). */
export const STREAM_BEND: Pt = P(29.8, 59.6);

/** The wide dirt road, crossed at point 4. */
export const ROAD: CurvePath = {
  start: P(49, 15.5),
  curves: [
    [P(57, 23), P(63, 30), P(69.5, 36.3)],
    [P(76, 42.6), P(83, 50), P(92, 57.5)],
    [P(96, 61), P(100, 63), P(104, 64)],
  ],
};

/** The saddle: two summits either side of the col at point 3, along an axis turned this far from east. */
export const SADDLE_ROTATE = 56.7;
export const SUMMIT_OFFSET = 8.9;

export type Deco = { x: number; y: number; s?: number };

/** The grove leg ד׳ passes, on its left (north-west) side, about half-way. */
export const GROVE_PINES: Deco[] = [
  { x: 72.6, y: 27.2, s: 0.8 },
  { x: 75.6, y: 22.6, s: 0.9 },
  { x: 68.8, y: 22.2, s: 0.75 },
];
/** The pine cluster on rocky ground at נ.ס. */
export const TARGET_PINES: Deco[] = [
  { x: 80.6, y: 12.6, s: 0.85 },
  { x: 84.4, y: 9.8, s: 1 },
  { x: 89.8, y: 10.8, s: 0.9 },
  { x: 93.8, y: 14.6, s: 0.8 },
];
export const TARGET_ROCKS: Deco[] = [
  { x: 93.6, y: 21.2, s: 0.95 },
  { x: 91.8, y: 22.6, s: 0.75 },
  { x: 80.4, y: 17.4, s: 0.7 },
];

// ---------------------------------------------------------------- points and legs

export type FeatureId = 'stream-bend' | 'stream-crossing' | 'saddle' | 'road' | 'grove' | 'pines-rocks';

export type RoutePoint = {
  /** 1–5, as on the map marker. */
  n: number;
  /** נ.ה / נ.ס on the two ends. */
  abbr?: string;
  name: string;
  /** What you recognise there to confirm the position. */
  identify: string;
  feature: FeatureId | null;
};

export const POINTS: readonly RoutePoint[] = [
  { n: 1, abbr: 'נ.ה', name: 'נקודת ההתחלה', identify: 'נקודה ידועה. מאמתים אותה במפה ובשטח לפני היציאה.', feature: null },
  { n: 2, name: 'עיקול הנחל', identify: 'העיקול ממש לפניכם: הנחל משנה כאן כיוון ופונה דרומה.', feature: 'stream-bend' },
  { n: 3, name: 'אוכף ברכס', identify: 'מקום נמוך ברכס, ופסגה מכל צד.', feature: 'saddle' },
  { n: 4, name: 'חציית דרך עפר', identify: 'דרך עפר רחבה שחוצה את הציר.', feature: 'road' },
  { n: 5, abbr: 'נ.ס', name: 'נקודת הסיום', identify: 'קבוצת אורנים בקרקע סלעית.', feature: 'pines-rocks' },
];

export type RouteLeg = {
  letter: string;
  /** Index of the point the leg leaves, and of the one it reaches (= from + 1). */
  from: number;
  to: number;
  /** Azimuth, degrees clockwise from north, and horizontal distance, metres. */
  az: number;
  m: number;
  /** What you pass on the way, in order. */
  along: string;
  alongFeatures: readonly FeatureId[];
};

export const LEGS: readonly RouteLeg[] = [
  { letter: 'א׳', from: 0, to: 1, az: 35, m: 500, along: 'שטח פתוח, ובהמשך מתקרבים אל הנחל.', alongFeatures: [] },
  { letter: 'ב׳', from: 1, to: 2, az: 65, m: 700, along: 'כ־100 מ׳ מנקודה 2 חוצים את הנחל, ומשם עולים אל הרכס.', alongFeatures: ['stream-crossing'] },
  { letter: 'ג׳', from: 2, to: 3, az: 50, m: 500, along: 'יורדים מהאוכף בשטח פתוח.', alongFeatures: [] },
  { letter: 'ד׳', from: 3, to: 4, az: 40, m: 600, along: 'באמצע הקטע עוברים ליד חורשה, משמאל לציר.', alongFeatures: ['grove'] },
];

/** The sign that confirms the end of a leg is what you recognise at the point it reaches. */
export const legEnd = (leg: RouteLeg) => POINTS[leg.to];

/** The points on the map, walked out from נ.ה leg by leg. */
export const POINT_XY: readonly Pt[] = LEGS.reduce<Pt[]>((pts, leg) => [...pts, polar(pts[leg.from], leg.az, leg.m / M_PER_UNIT)], [START]);

export const legFrom = (i: number) => POINT_XY[LEGS[i].from];
export const legTo = (i: number) => POINT_XY[LEGS[i].to];

const STREAM_LINE = samplePath(STREAM);
/** Where leg ב׳ crosses the stream (computed from the drawing, not typed in). */
export const STREAM_CROSSING: Pt = (() => {
  const c = crossings(legFrom(1), legTo(1), STREAM_LINE)[0];
  return { x: fx(c.at.x), y: fx(c.at.y) };
})();

/**
 * Where each named sign sits on the map, and the ring that marks it when it is in focus.
 * `pin`: a point sign on a line (the stream), marked with a pin and a leader to its label — a ring there would hide behind marker 2.
 */
export const FEATURES: Record<FeatureId, { label: string; at: Pt; rx: number; ry: number; rotate?: number; labelAt?: Pt; pin?: true }> = {
  'stream-bend': { label: 'עיקול הנחל', at: STREAM_BEND, rx: 1.3, ry: 1.3, labelAt: P(39.2, 63.6), pin: true },
  'stream-crossing': { label: 'חציית הנחל', at: STREAM_CROSSING, rx: 1.3, ry: 1.3, labelAt: P(39.2, 65.8), pin: true },
  saddle: { label: 'אוכף', at: POINT_XY[2], rx: 17.2, ry: 9.6, rotate: SADDLE_ROTATE },
  road: { label: 'דרך עפר', at: POINT_XY[3], rx: 4.4, ry: 4.4, labelAt: P(56.6, 33.2) },
  grove: { label: 'חורשה', at: P(71.9, 22.9), rx: 6.4, ry: 5.6, labelAt: P(61.6, 18.2) },
  'pines-rocks': { label: 'אורנים בקרקע סלעית', at: P(88.2, 15.6), rx: 9.8, ry: 8.6, labelAt: P(69.6, 5.4) },
};

// ---------------------------------------------------------------- the stops: point, leg, point, …

export type Stop = { kind: 'point' | 'leg'; i: number };
/** נ.ה, leg א׳, point 2, leg ב׳, … נ.ס — the order of the list and of the prev/next buttons. */
export const STOPS: readonly Stop[] = POINTS.flatMap((_, i) => (i < LEGS.length ? [{ kind: 'point', i }, { kind: 'leg', i }] : [{ kind: 'point', i }])) as Stop[];
export const stopIndex = (kind: Stop['kind'], i: number) => STOPS.findIndex((s) => s.kind === kind && s.i === i);

export type LegState = 'focus' | 'next' | 'walked' | 'ahead';
export type PointState = 'focus' | 'from' | 'to' | 'passed' | 'ahead';

/** How each leg is drawn: the selected leg, or the leg leaving the selected point, is the one with numbers. */
export function legStates(stop: Stop): LegState[] {
  return LEGS.map((_, j) => {
    if (stop.kind === 'leg') return j < stop.i ? 'walked' : j === stop.i ? 'focus' : 'ahead';
    return j < stop.i ? 'walked' : j === stop.i ? 'next' : 'ahead';
  });
}

export function pointStates(stop: Stop): PointState[] {
  return POINTS.map((_, k) => {
    if (stop.kind === 'point') return k < stop.i ? 'passed' : k === stop.i ? 'focus' : 'ahead';
    const leg = LEGS[stop.i];
    return k === leg.from ? 'from' : k === leg.to ? 'to' : k < leg.from ? 'passed' : 'ahead';
  });
}

/** The leg whose azimuth and distance are on show (selected leg, or the one leaving the selected point). */
export function shownLeg(stop: Stop): number | null {
  if (stop.kind === 'leg') return stop.i;
  return stop.i < LEGS.length ? stop.i : null;
}

/** The leg the learner writes. Until it is done, its numbers and signs stay hidden everywhere. */
export const QUESTION_LEG = 3;

export const isHidden = (legIdx: number, done: boolean) => legIdx === QUESTION_LEG && !done;

/** Rings on the map for the stop in focus: the point's own sign, or what a leg passes and where it ends. */
export function halos(stop: Stop, done: boolean): { feature: FeatureId; role: 'point' | 'along' | 'end' }[] {
  if (stop.kind === 'point') {
    const f = POINTS[stop.i].feature;
    if (!f || (stop.i === LEGS[QUESTION_LEG].to && !done)) return [];
    return [{ feature: f, role: 'point' }];
  }
  if (isHidden(stop.i, done)) return [];
  const leg = LEGS[stop.i];
  const end = legEnd(leg).feature;
  return [...leg.alongFeatures.map((feature) => ({ feature, role: 'along' as const })), ...(end ? [{ feature: end, role: 'end' as const }] : [])];
}

// ---------------------------------------------------------------- the application step: write leg ד׳

export type Field = 'az' | 'm' | 'end';
export type EndOption = 'road' | 'grove' | 'pines-rocks';

const Q = LEGS[QUESTION_LEG];
/** Each wrong option is a named mistake: the reverse bearing, the angle measured counter-clockwise; half or double the length; the sign at the start or on the way. */
export const AZ_OPTIONS = [Q.az, (Q.az + 180) % 360, 360 - Q.az] as const; // 40 · 220 · 320
export const M_OPTIONS = [Q.m / 2, Q.m, Q.m * 2] as const; // 300 · 600 · 1200
export const END_OPTIONS: readonly EndOption[] = ['road', 'grove', 'pines-rocks'];
export const END_LABEL: Record<EndOption, string> = {
  road: 'דרך עפר',
  grove: 'חורשה',
  'pines-rocks': 'אורנים בקרקע סלעית',
};

export const CORRECT = { az: Q.az, m: Q.m, end: legEnd(Q).feature as EndOption } as const;

export type Answer = { az: number | null; m: number | null; end: EndOption | null };
export type State = {
  stop: number;
  answer: Answer;
  /** The answer as it was when "בדיקה" was last pressed. */
  checked: Answer | null;
  attempts: number;
  done: boolean;
};

const EMPTY: Answer = { az: null, m: null, end: null };
export const INITIAL_STATE: State = { stop: 0, answer: EMPTY, checked: null, attempts: 0, done: false };

export type Action =
  | { type: 'select'; stop: number }
  | { type: 'choose'; field: Field; value: number | EndOption }
  | { type: 'check' }
  | { type: 'reset' };

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'select':
      return { ...s, stop: Math.max(0, Math.min(STOPS.length - 1, a.stop)) };
    case 'choose':
      if (s.done) return s;
      return { ...s, answer: { ...s.answer, [a.field]: a.value } };
    case 'check': {
      if (s.done || s.answer.az === null || s.answer.m === null || s.answer.end === null) return s;
      const done = s.answer.az === CORRECT.az && s.answer.m === CORRECT.m && s.answer.end === CORRECT.end;
      return { ...s, checked: s.answer, attempts: s.attempts + 1, done };
    }
    case 'reset':
      return { ...INITIAL_STATE, stop: s.stop };
  }
}

export const isComplete = (a: Answer) => a.az !== null && a.m !== null && a.end !== null;

/** A field's verdict, shown only while its value is the one that was checked (changing it clears the verdict). */
export function verdict(s: State, field: Field): 'right' | 'wrong' | null {
  if (!s.checked || s.checked[field] === null || s.checked[field] !== s.answer[field]) return null;
  return s.answer[field] === CORRECT[field] ? 'right' : 'wrong';
}

const pad3 = (n: number) => String(n).padStart(3, '0');
export const deg = (az: number) => `${pad3(az)}°`;
export const metres = (m: number) => `${m.toLocaleString('en-US')} מ׳`;

/** Feedback per option: what matched the map or what did not, never the value to pick instead. */
export const FEEDBACK: { az: Record<number, string>; m: Record<number, string>; end: Record<EndOption, string> } = {
  az: {
    [AZ_OPTIONS[0]]: 'נכון: מנקודה 4 הקטע יוצא לצפון־מזרח, כלומר בין 000° ל־090°.',
    [AZ_OPTIONS[1]]: `${deg(AZ_OPTIONS[1])} מוביל לדרום־מערב: זה הכיוון ההפוך, מנ.ס חזרה אל נקודה 4. מודדים מתחילת הקטע, לא מסופו.`,
    [AZ_OPTIONS[2]]: `${deg(AZ_OPTIONS[2])} מוביל לצפון־מערב: כך יוצא כשמודדים נגד כיוון השעון. האזימוט נמדד מהצפון, בכיוון השעון.`,
  },
  m: {
    [M_OPTIONS[0]]: `${metres(M_OPTIONS[0])} קצר מדי: הקטע במפה ארוך מסרגל קנה המידה, שמייצג 500 מ׳.`,
    [M_OPTIONS[1]]: 'נכון: הקטע במפה ארוך רק מעט מסרגל קנה המידה, שמייצג 500 מ׳.',
    [M_OPTIONS[2]]: `${metres(M_OPTIONS[2])} הם יותר מפי שניים מאורך הסרגל, שמייצג 500 מ׳. השוו את אורך הקטע לסרגל שבפינת המפה.`,
  },
  end: {
    road: 'דרך העפר נמצאת בנקודה 4, שממנה הקטע יוצא. בסוף הקטע מחפשים סימן אחר.',
    grove: 'החורשה באמצע הקטע, משמאל לציר. כשעוברים לידה, הקטע עוד לא נגמר.',
    'pines-rocks': 'נכון: קבוצת האורנים בקרקע הסלעית נמצאת בנ.ס, בסוף הקטע. החורשה שבדרך מסמנת התקדמות, לא הגעה.',
  },
};

export const TOTAL_M = LEGS.reduce((sum, l) => sum + l.m, 0);

/** One line for the live region and the map's label: what is selected and its numbers. */
export function describe(stop: Stop, done: boolean): string {
  if (stop.kind === 'leg') {
    const leg = LEGS[stop.i];
    const head = `קטע ${leg.letter}, מנקודה ${leg.from + 1} אל נקודה ${leg.to + 1}`;
    if (isHidden(stop.i, done)) return `${head}: להשלמה מתוך המפה`;
    return `${head}: אזימוט ${deg(leg.az)}, כ־${metres(leg.m)}. בסוף הקטע: ${legEnd(leg).name}`;
  }
  const p = POINTS[stop.i];
  const name = p.abbr ? `${p.name} (${p.abbr})` : p.name;
  const out = shownLeg(stop);
  if (out === null) return `נקודה ${p.n}: ${name}`;
  const leg = LEGS[out];
  const data = isHidden(out, done) ? 'להשלמה' : `${deg(leg.az)}, כ־${metres(leg.m)}`;
  return `נקודה ${p.n}: ${name}. הקטע היוצא: קטע ${leg.letter}, ${data}`;
}
