/* ─────────── כיצד מפרשים קואורדינטות? — data and logic ───────────
   The screen after "מערכות ייחוס" in קואורדינטות 2: one real reading of point A (the bridge on the
   map before it) taken apart, in the geographic system and in UTM, a short note on the datum and the
   reference system, then a three-question check. Pure data and functions (no JSX), shared by
   ReadingCoordinates.tsx and scripts/qa/reading-coordinates.test.mjs.

   Sources: the deck "מבוא לגיאודזיה חלק ב׳" — slide 6 (ϕ from the equator, λ from Greenwich, signs),
   slides 7–9 (its own notation "(90E,30S)": longitude first), slides 10–11 (division by 60),
   slides 13–16 (60 zones of 6°, metres, zone and hemisphere must be stated), slide 17 (reference
   system). The numbers are READINGS.A of the reference-systems map — never typed here.

   Copy strings mark LTR runs as [[…]]: each run renders in its own LTR isolate. */

import { READINGS, dmsParts, NBSP } from '../reference-systems/referenceSystemsGeometry';
import { DATUM, ZONE } from '../reference-systems/referenceSystems.data';

const A = READINGS.A;
/** Metres of E at a zone's middle line (taught in the UTM atlas: "קו האמצע · E = 500000"). */
const E_MIDDLE = 500000;

/* ── the decomposed examples ─────────────────────────────────────────────── */

export type GeoPart = 'lat' | 'lon' | 'dir' | 'units';
export type UtmPart = 'zone' | 'hemi' | 'east' | 'north' | 'metres';
export type PartId = GeoPart | UtmPart | 'datum';

/** One glyph run of a written reading. `parts` = the components it belongs to; `unit` = the run is
    a unit sign inside a value (°, ′, ″), drawn tight against its number. */
export type Glyph = { text: string; parts: PartId[]; unit?: boolean };
/** A written reading, left to right as it is written (never mirrored); `gap` = a visible space before it. */
export type Token = Glyph & { gap?: boolean };

const [latDeg, latMin, latSec, latHemi] = dmsParts(A.latDms);
const [lonDeg, lonMin, lonSec, lonHemi] = dmsParts(A.lonDms);

/** "31°" → ["31", "°"]: the number, then its unit sign. */
const splitUnit = (s: string) => [s.slice(0, -1), s.slice(-1)] as const;

function dmsTokens(axis: 'lat' | 'lon', groups: readonly string[], hemi: string): Token[] {
  return [
    ...groups.flatMap((g, i): Token[] => {
      const [num, sign] = splitUnit(g);
      return [
        { text: num, parts: [axis], gap: i > 0 },
        { text: sign, parts: [axis, 'units'], unit: true },
      ];
    }),
    { text: hemi, parts: [axis, 'dir'], gap: true },
  ];
}

/** 31° 48′ 27.98″ N, 35° 07′ 28.83″ E — latitude first in this example (see GEO.orderNote). */
export const GEO_TOKENS: Token[] = [
  ...dmsTokens('lat', [latDeg, latMin, latSec], latHemi),
  { text: ',', parts: [] },
  ...dmsTokens('lon', [lonDeg, lonMin, lonSec], lonHemi).map((t, i) => (i === 0 ? { ...t, gap: true } : t)),
];

/** 36N E 701125 N 3521095 — zone and hemisphere, then E, then N, each number with its own label. */
export const UTM_TOKENS: Token[] = [
  { text: String(ZONE.zone), parts: ['zone'] },
  { text: ZONE.hemisphere, parts: ['hemi'] },
  { text: 'E', parts: ['east'], gap: true },
  { text: A.eText, parts: ['east', 'metres'], gap: true },
  { text: 'N', parts: ['north'], gap: true },
  { text: A.nText, parts: ['north', 'metres'], gap: true },
];

/** What the key shows of the reading: the exact runs, or (metres) a sign that is not written. */
export type Excerpt = { runs: string[] } | { implied: string };

export type KeyRow<P extends PartId> = { id: P; name: string; body: string; excerpt: Excerpt };

const km = (m: number) => Math.round(m / 1000);

export const GEO = {
  title: 'קואורדינטות גיאוגרפיות',
  system: 'גיאוגרפית',
  orderNote:
    'בדוגמה הזאת הרוחב כתוב לפני האורך. יש מקורות ומכשירים שכותבים קודם את האורך, ולכן מזהים כל ערך לפי אות הכיוון שלו ולא לפי מקומו.',
  rows: [
    {
      id: 'lat',
      name: 'רוחב [[ϕ]]',
      body: 'זווית מקו המשווה צפונה או דרומה, מ־[[0°]] עד [[90°]].',
      excerpt: { runs: [A.latShown] },
    },
    {
      id: 'lon',
      name: 'אורך [[λ]]',
      body: 'זווית מקו האורך של גריניץ׳ מזרחה או מערבה, מ־[[0°]] עד [[180°]].',
      excerpt: { runs: [A.lonShown] },
    },
    {
      id: 'dir',
      name: 'כיוון',
      body: '[[N]] או [[S]] ליד הרוחב: צפונית או דרומית לקו המשווה. [[E]] או [[W]] ליד האורך: מזרחית או מערבית לגריניץ׳. יש פורמטים שבהם מינוס מחליף את [[S]] ואת [[W]].',
      excerpt: { runs: [latHemi, lonHemi] },
    },
    {
      id: 'units',
      name: 'יחידות: מעלות, דקות ושניות',
      body: 'יחידות זווית בחלוקה ב־60: [[1° = 60′]], [[1′ = 60″]].',
      excerpt: { runs: ['°', '′', '″'] },
    },
  ] satisfies KeyRow<GeoPart>[],
};

export const UTM = {
  title: 'קואורדינטות UTM',
  system: `UTM ${ZONE.zone}${ZONE.hemisphere}`,
  orderNote: 'בדוגמה הזאת: פלח וחצי כדור, אחריהם מזרח ואז צפון. הסדר והכתיב משתנים בין מקורות, ולכן מזהים כל מספר לפי התווית שלו.',
  rows: [
    {
      id: 'zone',
      name: 'פלח',
      body: 'אחד מ־60 פלחים ברוחב [[6°]] של אורך. לכל פלח רשת משלו, ולכן אותם מספרים בפלח אחר מצביעים על מקום אחר.',
      excerpt: { runs: [String(ZONE.zone)] },
    },
    {
      id: 'hemi',
      name: 'חצי כדור',
      body: `[[N]] – צפוני, [[S]] – דרומי. ה־[[N]] הזה צמוד למספר הפלח, והוא אינו ציר הצפון.`,
      excerpt: { runs: [ZONE.hemisphere] },
    },
    {
      id: 'east',
      name: 'מזרח [[E]]',
      body: `מרחק מזרחה בתוך הפלח. בקו האמצע של הפלח [[E = ${E_MIDDLE}]], ולכן [[${A.eText}]] הוא כ־${km(A.point.e - E_MIDDLE)} ק״מ ${
        A.point.e >= E_MIDDLE ? 'מזרחית' : 'מערבית'
      } לו.`,
      excerpt: { runs: [`E${NBSP}${A.eText}`] },
    },
    {
      id: 'north',
      name: 'צפון [[N]]',
      body: `מרחק צפונה מקו המשווה, שבו [[N = 0]] בחצי הכדור הצפוני: כאן כ־${km(A.point.n)} ק״מ.`,
      excerpt: { runs: [`N${NBSP}${A.nText}`] },
    },
    {
      id: 'metres',
      name: 'יחידות: מטרים',
      body: 'שני המספרים במטרים. היחידה לא נכתבת לצדם; יודעים אותה מתוך המערכת.',
      excerpt: { implied: 'מ׳' },
    },
  ] satisfies KeyRow<UtmPart>[],
};

/** The datum and the reference system — one short note under both examples (the datum activity
    itself is in קואורדינטות 1 and is not repeated here). */
export const REFERENCE = {
  datum: DATUM,
  heading: 'מה עוד צריך לדעת: דאטום ומערכת ייחוס',
  body: `שתי הקריאות נכתבו בדאטום [[${DATUM}]]. הדאטום קובע את גוף הייחוס ואת עיגונו לכדור הארץ, ולכן אותם מספרים בדאטום אחר מצביעים על מקום אחר, כמו בהדמיה שבקואורדינטות 1. מערכת הייחוס כוללת את כל הדרוש לפירוש המספרים: הדאטום, הצירים והיחידות, וב־[[UTM]] גם ההיטל, הפלח וחצי הכדור. רוחב ואורך אינם היטל: הם זוויות על גוף הייחוס.`,
};

/* ── the check ───────────────────────────────────────────────────────────── */

export type Option = { id: string; label: string; right: boolean; why: string };

export type Question = {
  id: string;
  kind: 'one' | 'many';
  ask: string;
  /** For "many": the instruction under the question. */
  hint?: string;
  options: Option[];
  /** A missing right option's hint (many only): leads to it without naming it. */
  missing?: Record<string, string>;
  /** Shown when the answer is right, and as the solution when it is revealed. */
  explain: string;
};

export const QUESTIONS: Question[] = [
  {
    id: 'order',
    kind: 'one',
    ask: 'במקור אחר נכתבה נקודה כך: [[(90E,30S)]]. מה מציין [[30S]]?',
    options: [
      { id: 'lat', label: 'רוחב: [[30°]] דרומית לקו המשווה', right: true, why: '' },
      {
        id: 'lon',
        label: 'אורך: [[30°]] מערבית לגריניץ׳',
        right: false,
        why: '[[S]] אינה אות של אורך: האורך נמדד מגריניץ׳ מזרחה או מערבה, ולכן מסומן ב־[[E]] או ב־[[W]]. בדקו לאיזה קו מתייחסות [[N]] ו־[[S]].',
      },
      {
        id: 'zone',
        label: 'פלח [[UTM]] 30 בחצי הכדור הדרומי',
        right: false,
        why: 'בקריאת [[UTM]] יש לצד הפלח מספרי מזרח וצפון במטרים. כאן יש רק שני ערכים, וכל אחד מהם עם אות כיוון: זו קריאה גיאוגרפית.',
      },
    ],
    explain:
      '[[S]] מציינת דרום לקו המשווה, ולכן [[30S]] הוא רוחב. הערך [[90E]] הוא האורך: בכתיבה הזאת האורך מופיע ראשון. מזהים כל ערך לפי אות הכיוון שלו.',
  },
  {
    id: 'hemisphere',
    kind: 'one',
    ask: `בקריאה [[${ZONE.zone}${ZONE.hemisphere} E ${A.eText} N ${A.nText}]], מה מציינת האות [[N]] שצמודה ל־[[${ZONE.zone}]]?`,
    options: [
      { id: 'hemi', label: 'חצי הכדור הצפוני', right: true, why: '' },
      {
        id: 'northing',
        label: 'את ערך הצפון של הנקודה',
        right: false,
        why: `ערך הצפון הוא המספר [[${A.nText}]], ויש לו תווית [[N]] משלו. ה־[[N]] הזה צמוד למספר הפלח ומשלים את הפרטים על הרשת. מה עוד צריך לדעת על פלח, מלבד מספרו?`,
      },
      {
        id: 'map-north',
        label: 'את כיוון הצפון במפה',
        right: false,
        why: 'קריאת [[UTM]] מתארת מיקום, לא כיוון במפה. ה־[[N]] צמוד למספר הפלח ומשלים את הפרטים על הרשת שבה נמדדו המספרים.',
      },
    ],
    explain: `[[${ZONE.zone}${ZONE.hemisphere}]] הוא פלח ${ZONE.zone} בחצי הכדור הצפוני. בחצי הכדור הדרומי ערך הצפון נמדד מ־[[10000000]]${NBSP}מ׳ בקו המשווה, ולכן אותם מספרים היו מצביעים שם על מקום אחר.`,
  },
  {
    id: 'missing',
    kind: 'many',
    ask: `בקשר נמסר: „[[UTM]], מזרח [[${A.eText}]], צפון [[${A.nText}]]”. מה עוד צריך לדעת כדי לסמן את הנקודה במפה?`,
    hint: 'סמנו את כל מה שחסר.',
    options: [
      { id: 'zone', label: 'הפלח', right: true, why: '' },
      { id: 'hemi', label: 'חצי הכדור', right: true, why: '' },
      { id: 'datum', label: 'הדאטום', right: true, why: '' },
      { id: 'units', label: 'יחידות המדידה', right: false, why: 'היחידות ידועות: ב־[[UTM]] המספרים הם מטרים.' },
      {
        id: 'order',
        label: 'סדר המספרים',
        right: false,
        why: 'כל מספר בהודעה מסומן במילה, מזרח או צפון, ולכן הסדר לא משנה.',
      },
    ],
    missing: {
      zone: 'חסר פרט שקובע באיזו מ־60 הרשתות נמדדו המספרים.',
      hemi: 'חסר פרט שקובע מאיפה נמדד ערך הצפון: בקו המשווה הוא [[0]] או [[10000000]]' + NBSP + 'מ׳.',
      datum: 'חסר פרט שקובע על איזה גוף ייחוס ובאיזה עיגון נמדדה הרשת. גם כשהפלח ידוע, אותם מספרים בדאטום אחר מצביעים על מקום אחר.',
    },
    explain: `בהודעה חסרים הפלח, חצי הכדור והדאטום, למשל [[${DATUM} · UTM ${ZONE.zone}${ZONE.hemisphere}]]. היחידות ידועות מתוך המערכת, והתוויות מזרח וצפון מפרשות את המספרים.`,
  },
];

export const DONE_TEXT =
  'כדי לפרש קואורדינטות, מזהים כל רכיב לפי התווית שלו ובודקים שיש את המידע הנלווה: הכיוון או חצי הכדור, היחידות, הפלח ב־[[UTM]] והדאטום.';

/** The right answer of a question, as a pick. */
export const solution = (q: Question): string[] => q.options.filter((o) => o.right).map((o) => o.id);

export type Verdict = {
  right: boolean;
  /** Explanations of the wrong picks, then hints for right options left out — never the answer itself. */
  notes: string[];
};

/** Judges a pick (one id, or a set for "many"). */
export function judge(q: Question, pick: readonly string[]): Verdict {
  const want = new Set(solution(q));
  const got = new Set(pick);
  const extra = q.options.filter((o) => got.has(o.id) && !o.right);
  const left = q.options.filter((o) => o.right && !got.has(o.id));
  const right = extra.length === 0 && left.length === 0 && got.size === want.size;
  return {
    right,
    notes: right ? [] : [...extra.map((o) => o.why), ...left.map((o) => q.missing?.[o.id] ?? '').filter(Boolean)],
  };
}

/* ── check state ─────────────────────────────────────────────────────────── */

export type CheckState = {
  index: number;
  pick: string[];
  verdict: Verdict | null;
  /** Checks made on this question. */
  tries: number;
  revealed: boolean;
  done: boolean;
};

export type CheckAction =
  | { type: 'pick'; id: string }
  | { type: 'check' }
  | { type: 'reveal' }
  | { type: 'next' }
  | { type: 'restart' };

export const initialCheck: CheckState = { index: 0, pick: [], verdict: null, tries: 0, revealed: false, done: false };

/** A question is closed once answered right or once its solution is shown. */
export const closed = (s: CheckState) => s.revealed || Boolean(s.verdict?.right);
/** The solution can be shown only after a wrong check has explained the mistake. */
export const canReveal = (s: CheckState) => !closed(s) && s.tries > 0;

export function checkReducer(s: CheckState, a: CheckAction): CheckState {
  const q = QUESTIONS[s.index];
  switch (a.type) {
    case 'pick': {
      if (s.done || closed(s)) return s;
      const pick = q.kind === 'one' ? [a.id] : s.pick.includes(a.id) ? s.pick.filter((x) => x !== a.id) : [...s.pick, a.id];
      // any change clears the last verdict: it no longer describes the pick on screen
      return { ...s, pick, verdict: null };
    }
    case 'check':
      if (s.done || closed(s) || s.pick.length === 0) return s;
      return { ...s, verdict: judge(q, s.pick), tries: s.tries + 1 };
    case 'reveal':
      if (!canReveal(s)) return s;
      return { ...s, revealed: true, pick: solution(q), verdict: null };
    case 'next':
      if (!closed(s)) return s;
      return s.index + 1 < QUESTIONS.length ? { ...initialCheck, index: s.index + 1 } : { ...s, done: true };
    case 'restart':
      return initialCheck;
  }
}
