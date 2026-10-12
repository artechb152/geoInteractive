/* חלוקה ב־60 — פירוק המספר, צעד אחר צעד (CoordinatesPart2Scene, deck ב׳ slides 10–11).
   Brief: design/mockups/base60-concepts-2026-10-12/claude-code-handoff.txt, alternative 2.

   One source value per axis; every other writing is computed from it. Values are integer counts
   of 1e-4 units (the deck's four decimals): 0.1234° × 60 is exactly 7.404′ and 0.404′ × 60
   exactly 24.24″, so no writing is ever rounded and no minute or second can carry over to 60.

   The activity: a guided example on the longitude (one step per "הצעד הבא"), then the learner
   completes the same decomposition, then a transfer task on the latitude. Copy marks its LTR runs
   with [[…]]: the view isolates them, the live region reads them plain. */

export type Axis = 'lon' | 'lat';
export type Mode = 'guided' | 'practice';
export type Step = 1 | 2 | 3;
export type FormatId = 'D' | 'DM' | 'DMS' | 'S';
export type Op = 'mul' | 'div';
export type Pick = 'whole' | 'frac' | 'all';
export type Reflect = 'deg' | 'min' | 'sec';
export type Copy = string;

/** 1e-4 units per unit. */
const U = 10_000;

/** The deck's sample point (slide 11), in 1e-4 degree. Height is not part of this conversion. */
export const SOURCE: Record<Axis, number> = { lon: 351_234, lat: 335_678 };
export const AXES: readonly Axis[] = ['lon', 'lat'];
export const AXIS_NAME: Record<Axis, string> = { lon: 'קו אורך', lat: 'קו רוחב' };
/** Each axis's own opening: the longitude is the guided example, the latitude the transfer task. */
export const START_MODE: Record<Axis, Mode> = { lon: 'guided', lat: 'practice' };

export const FORMATS: readonly FormatId[] = ['D', 'DM', 'DMS', 'S'];
export const STEPS: readonly Step[] = [1, 2, 3];

/* ─────────────────── the arithmetic ─────────────────── */

export type Breakdown = {
  /** whole degrees */
  deg: number;
  /** the degree's fraction, 1e-4 degree */
  degFrac: number;
  /** degFrac × 60, 1e-4 minute */
  minAll: number;
  /** whole minutes */
  min: number;
  /** the minute's fraction, 1e-4 minute */
  minFrac: number;
  /** minFrac × 60, 1e-4 second */
  sec: number;
  /** the whole value in seconds (S), 1e-4 second */
  total: number;
};

export function breakdown(units: number): Breakdown {
  const deg = Math.floor(units / U);
  const degFrac = units - deg * U;
  const minAll = degFrac * 60;
  const min = Math.floor(minAll / U);
  const minFrac = minAll - min * U;
  const sec = minFrac * 60;
  return { deg, degFrac, minAll, min, minFrac, sec, total: deg * 3600 * U + min * 60 * U + sec };
}

/** A 1e-4 count as a decimal: trailing zeros dropped, the whole part padded to `pad` digits. */
export function dec(units: number, pad = 1): string {
  const whole = Math.floor(units / U);
  const frac = units - whole * U;
  const head = String(whole).padStart(pad, '0');
  return frac ? `${head}.${String(frac).padStart(4, '0').replace(/0+$/, '')}` : head;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatValue(units: number, f: FormatId): string {
  const b = breakdown(units);
  switch (f) {
    case 'D':
      return `${dec(units)}°`;
    case 'DM':
      return `${b.deg}°${dec(b.minAll, 2)}′`;
    case 'DMS':
      return `${b.deg}°${pad2(b.min)}′${dec(b.sec, 2)}″`;
    case 'S':
      return `${dec(b.total)}″`;
  }
}

/** The numbers one axis shows, as text. */
export function numbers(axis: Axis) {
  const b = breakdown(SOURCE[axis]);
  return {
    src: dec(SOURCE[axis]),
    deg: String(b.deg),
    degFrac: dec(b.degFrac),
    minAll: dec(b.minAll),
    min: String(b.min),
    min2: pad2(b.min),
    minFrac: dec(b.minFrac),
    sec: dec(b.sec),
    sec2: dec(b.sec, 2),
    total: dec(b.total),
  };
}

/** A writing is open once the steps have produced its parts: DM after the minutes, DMS and S after the seconds. */
export const formatOpen = (f: FormatId, done: number) => f === 'D' || (f === 'DM' ? done >= 2 : done >= 3);
/** The newest writing the decomposition has reached. */
export const newestFormat = (done: number): FormatId => (done >= 3 ? 'DMS' : done >= 2 ? 'DM' : 'D');

/** A fraction split for the worked hint: its first significant digit, and the rest (1e-4 units). */
export function splitFraction(frac: number): [number, number] {
  let p = 1000;
  while (p > 1 && frac < p) p /= 10;
  const head = Math.floor(frac / p) * p;
  return [head, frac - head];
}

/** The learner's number: a point or a comma as the decimal separator; unit marks and spaces ignored. */
export function parseNumber(raw: string): { value: number; dp: number } | null {
  const s = raw.replace(/[\s′″'"°]/g, '').replace(',', '.');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  return { value: Number(s), dp: (s.split('.')[1] ?? '').length };
}

/* ─────────────────── checking an attempt ─────────────────── */

export type Attempt = { pick: Pick | null; op: Op | null; value: string; msg: Msg | null; hints: number };
export type Wrong = 'noPick' | 'pickFrac' | 'pickAll' | 'noOp' | 'empty' | 'nan' | 'div' | 'whole' | 'shift' | 'rounded' | 'range' | 'off';
export type Msg = { kind: 'hint'; level: number } | { kind: 'wrong'; why: Wrong };

/** The step's own two numbers: the whole part that stays, and the fraction that is converted (1e-4 units). */
function parts(axis: Axis, step: 2 | 3) {
  const b = breakdown(SOURCE[axis]);
  return step === 2 ? { whole: b.deg, frac: b.degFrac } : { whole: b.min, frac: b.minFrac };
}

/**
 * Judged from the data: right within half a unit of the answer's last digit. Each common mistake
 * has its own reason — dividing, converting the whole number, reading the fraction's digits as the
 * next unit, rounding, a result of 60 or more.
 */
export function judge(axis: Axis, step: Step, at: Attempt): 'right' | Wrong {
  if (step === 1) return at.pick === 'whole' ? 'right' : at.pick === 'frac' ? 'pickFrac' : at.pick === 'all' ? 'pickAll' : 'noPick';
  if (!at.op) return 'noOp';
  if (!at.value.trim()) return 'empty';
  const v = parseNumber(at.value);
  if (!v) return 'nan';
  if (at.op === 'div') return 'div';
  const { whole, frac } = parts(axis, step);
  const want = (frac * 60) / U;
  const wantDp = (dec(frac * 60).split('.')[1] ?? '').length;
  const near = (x: number, tol: number) => Math.abs(v.value - x) <= tol + 1e-9;
  if (near(want, 0.5 * 10 ** -wantDp)) return 'right';
  if (near(((whole * U + frac) * 60) / U, 0.5)) return 'whole';
  const digits = dec(frac).split('.')[1] ?? '';
  if (near(frac / 100, 1e-6) || near(Number(digits), 1e-6)) return 'shift';
  if (v.dp < wantDp && near(want, 0.5 * 10 ** -v.dp)) return 'rounded';
  if (v.value >= 60) return 'range';
  return 'off';
}

/** How many hint levels a step has: highlight → rule (step 1); highlight → ×60 rule → worked calculation. */
export const HINTS: Record<Step, number> = { 1: 2, 2: 3, 3: 3 };

/* ─────────────────── copy ─────────────────── */

export const TITLE = 'חלוקה ב־60: אותה נקודה, כמה דרכי כתיבה';
export const LEAD = 'מעלה אחת היא 60 דקות, ודקה אחת היא 60 שניות. נבחן איך משנים את הכתיבה ושומרים על אותה נקודה.';
export const MODE_LINE: Record<Mode, string> = {
  guided: 'דוגמה מונחית: עקבו אחרי הפירוק צעד אחר צעד.',
  practice: 'תרגול: השלימו כל צעד בעצמכם.',
};
export const STEP_TITLE: Record<Step, string> = { 1: 'שומרים את המעלות', 2: 'ממירים את שבר המעלה', 3: 'ממירים את שבר הדקה' };
export const RULE = 'החלק השלם נשמר. רק השבר עובר ליחידה הבאה.';
export const PICK_ORDER: readonly Pick[] = ['whole', 'frac', 'all'];
export const OPS: readonly Op[] = ['mul', 'div'];
export const OP_SIGN: Record<Op, string> = { mul: '×', div: '÷' };

export function pickLabel(axis: Axis, p: Pick): string {
  const n = numbers(axis);
  return p === 'whole' ? n.deg : p === 'frac' ? n.degFrac : n.src;
}

/** The active step's question. */
export function stepAsk(axis: Axis, step: Step, mode: Mode): Copy {
  const n = numbers(axis);
  if (step === 1) return 'איזה חלק שומרים כמעלות שלמות?';
  if (step === 2)
    return mode === 'guided'
      ? `מה עושים עם שבר המעלה, [[${n.degFrac}°]]?`
      : 'בחרו פעולה לשבר המעלה, וכתבו במסלול את התוצאה בדקות.';
  return mode === 'guided'
    ? `שומרים את [[${n.min}]] הדקות השלמות. מה עושים עם שבר הדקה, [[${n.minFrac}′]]?`
    : `[[${n.min}]] הדקות השלמות נשמרות. בחרו פעולה לשבר הדקה, וכתבו במסלול את התוצאה בשניות.`;
}

/** A completed step: what was done, and its arithmetic. */
export function stepDone(axis: Axis, step: Step): { text: Copy; eq: string } {
  const n = numbers(axis);
  if (step === 1) return { text: 'החלק השלם של המעלות נשאר כפי שהוא.', eq: `${n.src}° → ${n.deg}°` };
  if (step === 2) return { text: 'כופלים את שבר המעלה ב־60 ומקבלים דקות.', eq: `${n.degFrac} × 60 = ${n.minAll}′` };
  return { text: 'שומרים את הדקות השלמות, וכופלים את שבר הדקה ב־60 כדי לקבל שניות.', eq: `${n.minFrac} × 60 = ${n.sec}″` };
}

export function hintText(axis: Axis, step: Step, level: number): Copy {
  const n = numbers(axis);
  if (step === 1)
    return level === 1
      ? 'שימו לב לנקודה העשרונית: לפניה המעלות השלמות, ואחריה שבר המעלה.'
      : 'המעלות השלמות נשמרות כפי שהן. רק השבר שאחרי הנקודה ממשיך לשלב הבא.';
  const deg = step === 2;
  if (level === 1)
    return deg
      ? `התמקדו בשבר המעלה, [[${n.degFrac}°]]. [[${n.deg}]] המעלות השלמות כבר נשמרו.`
      : `התמקדו בשבר הדקה, [[${n.minFrac}′]]. [[${n.min}]] הדקות השלמות כבר נשמרו.`;
  if (level === 2)
    return deg
      ? 'מעלה אחת היא 60 דקות. כדי לעבור ליחידה קטנה יותר כופלים ב־60.'
      : 'דקה אחת היא 60 שניות. כופלים את שבר הדקה ב־60.';
  const [head, rest] = splitFraction(parts(axis, step).frac);
  if (!rest) return `כפלו את [[${dec(head)}]] ב־60.`;
  return `חישוב בחלקים: [[${dec(head)} × 60 = ${dec(head * 60)}]], וגם [[${dec(rest)} × 60 = ${dec(rest * 60)}]]. חברו את שתי התוצאות.`;
}

export function wrongText(axis: Axis, step: Step, why: Wrong): Copy {
  const n = numbers(axis);
  const deg = step === 2;
  switch (why) {
    case 'noPick':
      return 'בחרו את החלק שנשמר.';
    case 'pickFrac':
      return `[[${n.degFrac}]] הוא שבר המעלה, החלק שאחרי הנקודה. הוא ממשיך לשלב הבא. המעלות השלמות הן המספר שלפני הנקודה.`;
    case 'pickAll':
      return `[[${n.src}]] כולל גם את שבר המעלה. שומרים רק את המעלות השלמות, המספר שלפני הנקודה.`;
    case 'noOp':
      return 'בחרו פעולה: [[× 60]] או [[÷ 60]].';
    case 'empty':
      return 'כתבו את התוצאה בשדה שבמסלול המספרים.';
    case 'nan':
      return 'כתבו מספר בלבד. אפשר להשתמש בנקודה או בפסיק עשרוני.';
    case 'div':
      return `כדי לעבור ליחידה קטנה יותר כופלים ב־60. נסו שוב עם ${deg ? 'שבר המעלה' : 'שבר הדקה'}.`;
    case 'whole':
      return deg
        ? `[[${n.deg}]] המעלות נשמרות. כופלים רק את [[${n.degFrac}]].`
        : `[[${n.min}]] הדקות נשמרות. כופלים רק את [[${n.minFrac}]].`;
    case 'shift':
      return `הספרות אחרי הנקודה הן ${deg ? 'שבר מעלה' : 'שבר דקה'}. קודם כופלים את השבר ב־60.`;
    case 'rounded':
      return 'התוצאה קרובה, אבל עוגלה. כתבו את כל הספרות שמתקבלות מהכפל, בלי לעגל.';
    case 'range':
      return deg ? 'דקות צריכות להיות פחות מ־60. בדקו שכפלתם רק את שבר המעלה.' : 'שניות צריכות להיות פחות מ־60. בדקו שכפלתם רק את שבר הדקה.';
    case 'off':
      return `התוצאה עדיין לא נכונה. חשבו שוב את [[${deg ? n.degFrac : n.minFrac} × 60]], או היעזרו ברמז.`;
  }
}

/** The end of a decomposition. */
export function successText(axis: Axis, mode: Mode): Copy {
  const n = numbers(axis);
  return mode === 'guided'
    ? 'בכל צעד נשמר החלק השלם, ורק השבר עבר ליחידה הקטנה הבאה. עכשיו תורכם.'
    : `נכון — [[${n.deg}]] מעלות, [[${n.min}]] דקות ו־[[${n.sec}]] שניות מתארות את אותו ערך.`;
}

/** Under the track: the rule while converting; once done, how the chosen writing is built. */
export function formatNote(axis: Axis, f: FormatId): Copy {
  const n = numbers(axis);
  switch (f) {
    case 'D':
      return `[[D]] — הכול במעלות: [[${n.deg} + ${n.min}/60 + ${n.sec}/3600 = ${n.src}°]]`;
    case 'DM':
      return `[[DM]] — מעלות שלמות ודקות: [[${n.deg}°]] ועוד [[${n.minAll}′]]`;
    case 'DMS':
      return `[[DMS]] — מעלות, דקות ושניות: [[${n.deg}°]], [[${n.min}′]] ו־[[${n.sec}″]]`;
    case 'S':
      return `[[S]] — הכול בשניות: [[${n.deg} × 3600 + ${n.min} × 60 + ${n.sec} = ${n.total}″]]`;
  }
}

/** In the band, under the writings: what the chosen writing is, in words. */
export const FORMAT_INFO: Record<FormatId, { name: string; text: Copy }> = {
  D: { name: 'מעלות עשרוניות', text: 'כל הערך כתוב במעלות. המספר שאחרי הנקודה הוא חלק ממעלה, לא דקות.' },
  DM: { name: 'מעלות ודקות', text: 'המעלות השלמות נשמרות, ושבר המעלה כתוב בדקות: מעלה אחת היא 60 דקות.' },
  DMS: { name: 'מעלות, דקות ושניות', text: 'גם הדקות השלמות נשמרות, ושבר הדקה כתוב בשניות: דקה אחת היא 60 שניות.' },
  S: { name: 'הכול בשניות', text: 'כל הערך מומר לשניות: מעלה אחת היא [[3600]] שניות, ודקה אחת היא 60 שניות.' },
};

export const REFLECT_ASK = 'איזה חלק היה לכם קשה לפרק?';
export const REFLECT: { id: Reflect; label: string; tip: string }[] = [
  { id: 'deg', label: 'שמירת המעלות', tip: 'המעלות השלמות הן המספר שלפני הנקודה. הן נשמרות כפי שהן, ורק השבר ממשיך הלאה.' },
  { id: 'min', label: 'המרה לדקות', tip: 'את שבר המעלה כופלים ב־60, כי מעלה אחת היא 60 דקות. הדקות השלמות נשמרות.' },
  { id: 'sec', label: 'המרה לשניות', tip: 'את שבר הדקה כופלים ב־60, כי דקה אחת היא 60 שניות. כך מתקבלות השניות.' },
];

export const plain = (c: Copy) => c.replace(/\[\[|\]\]/g, '');

/* ─────────────────── the activity ─────────────────── */

export type Track = { mode: Mode; done: 0 | 1 | 2 | 3; fmt: FormatId; attempt: Attempt };
export type State = { axis: Axis; lon: Track; lat: Track; reflect: Reflect | null; say: { text: string; n: number } };

export type Action =
  | { type: 'axis'; axis: Axis }
  /** guided: the active step's result */
  | { type: 'next' }
  | { type: 'pick'; pick: Pick }
  | { type: 'op'; op: Op }
  | { type: 'input'; value: string }
  | { type: 'check' }
  | { type: 'hint' }
  | { type: 'back' }
  | { type: 'reset' }
  /** the guided example's end: the same number, now by the learner */
  | { type: 'practice' }
  | { type: 'format'; fmt: FormatId }
  | { type: 'reflect'; part: Reflect };

export const BLANK: Attempt = { pick: null, op: null, value: '', msg: null, hints: 0 };
const fresh = (mode: Mode): Track => ({ mode, done: 0, fmt: 'D', attempt: BLANK });

export const initialState = (): State => ({
  axis: 'lon',
  lon: fresh(START_MODE.lon),
  lat: fresh(START_MODE.lat),
  reflect: null,
  say: { text: '', n: 0 },
});

/** The step being worked, or null once the value is fully decomposed. */
export const activeStep = (t: Track): Step | null => (t.done < 3 ? ((t.done + 1) as Step) : null);

/** A step's result joins the track; the newest writing it opens becomes the shown one. */
function advance(t: Track): Track {
  const done = (t.done + 1) as Track['done'];
  return { ...t, done, fmt: newestFormat(done), attempt: BLANK };
}

/** The sentence a screen reader hears when a step becomes active. */
const askLine = (axis: Axis, t: Track) => {
  const k = activeStep(t);
  return k ? `${STEP_TITLE[k]}: ${plain(stepAsk(axis, k, t.mode))}` : '';
};

export function reducer(s: State, a: Action): State {
  const t = s[s.axis];
  const step = activeStep(t);
  const put = (next: Track, say?: string): State => ({
    ...s,
    [s.axis]: next,
    say: say === undefined ? s.say : { text: say, n: s.say.n + 1 },
  });
  const attempt = (patch: Partial<Attempt>) => put({ ...t, attempt: { ...t.attempt, ...patch } });

  switch (a.type) {
    case 'axis': {
      if (a.axis === s.axis) return s;
      const next = s[a.axis];
      return { ...s, axis: a.axis, say: { text: `${AXIS_NAME[a.axis]}: ${dec(SOURCE[a.axis])}°. ${askLine(a.axis, next)}`.trim(), n: s.say.n + 1 } };
    }
    case 'next': {
      if (t.mode !== 'guided' || !step) return s;
      const d = stepDone(s.axis, step);
      const after = advance(t);
      const end = activeStep(after) ? askLine(s.axis, after) : plain(successText(s.axis, 'guided'));
      return put(after, `${STEP_TITLE[step]}: ${d.text} ${d.eq}. ${end}`);
    }
    case 'pick':
      return t.mode === 'practice' && step === 1 ? attempt({ pick: a.pick }) : s;
    case 'op':
      return t.mode === 'practice' && (step === 2 || step === 3) ? attempt({ op: a.op }) : s;
    case 'input':
      return t.mode === 'practice' && (step === 2 || step === 3) ? attempt({ value: a.value.slice(0, 12) }) : s;
    case 'check': {
      if (t.mode !== 'practice' || !step) return s;
      const why = judge(s.axis, step, t.attempt);
      if (why !== 'right') return put({ ...t, attempt: { ...t.attempt, msg: { kind: 'wrong', why } } }, plain(wrongText(s.axis, step, why)));
      const d = stepDone(s.axis, step);
      const after = advance(t);
      const end = activeStep(after) ? askLine(s.axis, after) : plain(successText(s.axis, 'practice'));
      return put(after, `נכון. ${d.text} ${d.eq}. ${end}`);
    }
    case 'hint': {
      if (t.mode !== 'practice' || !step) return s;
      const level = Math.min(t.attempt.hints + 1, HINTS[step]);
      const msg: Msg = { kind: 'hint', level };
      return put({ ...t, attempt: { ...t.attempt, hints: level, msg } }, `רמז ${level} מתוך ${HINTS[step]}: ${plain(hintText(s.axis, step, level))}`);
    }
    case 'back': {
      if (t.done === 0) return s;
      const done = (t.done - 1) as Track['done'];
      const fmt = formatOpen(t.fmt, done) ? t.fmt : newestFormat(done);
      const next: Track = { ...t, done, fmt, attempt: BLANK };
      return put(next, `חזרה צעד: ${askLine(s.axis, next)}`);
    }
    case 'reset': {
      const next = fresh(START_MODE[s.axis]);
      return { ...put(next, `איפוס. ${MODE_LINE[next.mode]} ${askLine(s.axis, next)}`), reflect: s.axis === 'lat' ? null : s.reflect };
    }
    case 'practice': {
      if (t.mode !== 'guided' || step) return s;
      const next = fresh('practice');
      return put(next, `${MODE_LINE.practice} ${askLine(s.axis, next)}`);
    }
    case 'format':
      if (!formatOpen(a.fmt, t.done) || a.fmt === t.fmt) return s;
      return put({ ...t, fmt: a.fmt }, `${a.fmt}: ${formatValue(SOURCE[s.axis], a.fmt)}`);
    case 'reflect': {
      const tip = REFLECT.find((r) => r.id === a.part)!.tip;
      return { ...s, reflect: a.part, say: { text: tip, n: s.say.n + 1 } };
    }
  }
}
