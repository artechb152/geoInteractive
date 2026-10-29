/**
 * „מתי עוצרים לבדוק?” — the replay of one navigation along leg 2 and leg 3 of
 * the planning map, in four moments. A made-up training route (not a real
 * place).
 *
 * The model keeps apart what the navigator KNOWS from what is TRUE:
 *   - `plan`      the planned route and its distances (navTipsGeometry);
 *   - `lastFix`   the last identified point;
 *   - `estimate`  the dead-reckoned progress from it — a fixed scenario value,
 *                 always shown as an estimate, never derived from the camera;
 *   - `story` / `field`  what the learner is told (the route story, the
 *                 field data) — no hint of the answer;
 *   - `truth`     where the navigator really stands and the way really walked
 *                 (the 3D camera stands there; the map shows it only in the
 *                 moment-4 debrief).
 */
import { M_PER_UNIT, P1, P2, P3, TIP_LEGS, lerp, type Pt } from '../navTipsGeometry';
import { along, bearingW, distW, toMap, toWorld } from './replayWorld';

export type MomentId = 'depart' | 'enroute' | 'saddle' | 'after';
export type Choice = 'check' | 'continue';
export type Verdict = 'right' | 'partial' | 'wrong';

export type EvidenceOption = { id: string; label: string; verdict: Verdict; feedback: string };

export type DecisionFeedback = {
  /** One line: whether the choice fits, said without blame. */
  lead: string;
  body: string;
  /** retry = the learner chooses again; evidence = ask for the reason next; done = explained, move on */
  next: 'retry' | 'evidence' | 'done';
};

export type Moment = {
  id: MomentId;
  n: 1 | 2 | 3 | 4;
  label: string;
  /** Short title of the moment for the decision area and the accessible description. */
  title: string;
  kind: 'guided' | 'decision';
  lastFix: { at: Pt; name: string };
  /** Dead-reckoned position: metres from the last fix along the planned leg. */
  estimate: { at: Pt; meters: number } | null;
  /** The planned leg in progress (index into TIP_LEGS) and its next checkpoint. */
  leg: 1 | 2;
  next: { at: Pt; name: string };
  story: string;
  field: string;
  /** What the view shows, for screen readers — what is seen, not what it means. */
  viewText: string;
  truth: { at: Pt; walkedFromFix: Pt[] };
  view: { yawDeg: number; pitchDeg: number };
  /** decision moments */
  expected?: Choice;
  onChoice?: Record<Choice, DecisionFeedback>;
  evidence?: { question: string; options: EvidenceOption[] };
  /** After the right evidence: what the decision lets the navigator do now. */
  outcome?: string;
  /** Moment 4: what the check reveals in the replay (truth shown after the decision only). */
  debrief?: string;
  continueLabel?: string;
  /** The guided opening: where each check can be seen from the station (heading, degrees). */
  lookAt?: { place: number; direction: number };
};

const r = (m: number) => Math.round(m / 50) * 50;

// ——— stations ———
/** Moment 1 stands on the inner bank of the stream bend, beside the channel. */
const AT_BEND = toMap(along(toWorld(P1), TIP_LEGS[1].az, 2));
/** Moment 2: under halfway along leg 2. */
const LEG2_T = 0.45;
const ON_LEG2 = lerp(P1, P2, LEG2_T);
export const LEG2_SO_FAR_M = r(TIP_LEGS[1].m * LEG2_T); // ≈ 250 m
/**
 * Moment 4, the truth: from the saddle the navigator walked leg 3's distance,
 * but on a heading 20° east of the plan — down the swale east of the low spur
 * instead of west of it.
 */
export const DRIFT_AZ = TIP_LEGS[2].az + 20;
export const DRIFT_END: Pt = toMap(along(toWorld(P2), DRIFT_AZ, TIP_LEGS[2].m));

export const LEG3_PLAN_AZ = TIP_LEGS[2].az;

export const MOMENTS: Moment[] = [
  {
    id: 'depart',
    n: 1,
    label: 'יציאה',
    title: 'לפני היציאה: מאמתים מקום וכיוון',
    kind: 'guided',
    lastFix: { at: P1, name: 'עיקול הנחל' },
    estimate: null,
    leg: 1,
    next: { at: P2, name: 'האוכף' },
    story: `מעיקול הנחל: כ־${TIP_LEGS[1].m} מ׳ אל האוכף, השקע שבין שתי פסגות.`,
    field: 'אתם בעיקול הנחל: המקום זוהה במפה ובשטח.',
    viewText: 'מבט מגדת הנחל. משמאל ערוץ הנחל היבש מתעקל, ולפנים השטח עולה בהדרגה אל שתי פסגות מעוגלות עם שקע ביניהן.',
    truth: { at: AT_BEND, walkedFromFix: [P1, AT_BEND] },
    view: { yawDeg: 250, pitchDeg: -6 },
    continueLabel: 'יוצאים לקטע הבא',
    lookAt: { place: 236, direction: TIP_LEGS[1].az },
  },
  {
    id: 'enroute',
    n: 2,
    label: 'בדרך לאוכף',
    title: 'בדרך לאוכף',
    kind: 'decision',
    lastFix: { at: P1, name: 'עיקול הנחל' },
    estimate: { at: ON_LEG2, meters: LEG2_SO_FAR_M },
    leg: 1,
    next: { at: P2, name: 'אוכף' },
    story: `מעיקול הנחל: כ־${TIP_LEGS[1].m} מ׳ אל האוכף, השקע שבין שתי פסגות.`,
    field: `מרחק משוער מעיקול הנחל: כ־${LEG2_SO_FAR_M} מ׳.`,
    viewText: 'מבט קדימה בעלייה מתונה. לפנים שתי פסגות מעוגלות, אחת מימין ואחת משמאל, ושקע ביניהן. שיחים ואבנים פזורים במדרון.',
    truth: { at: ON_LEG2, walkedFromFix: [P1, ON_LEG2] },
    view: { yawDeg: TIP_LEGS[1].az, pitchDeg: -2 },
    expected: 'continue',
    onChoice: {
      continue: {
        lead: 'אפשר להמשיך.',
        body: 'על מה אתם מסתמכים?',
        next: 'evidence',
      },
      check: {
        lead: 'בדיקה כאן אינה טעות.',
        body: `מה אפשר לאמת עכשיו: השקע שבין שתי הפסגות נמצא לפניכם, בכיוון ההליכה; עיקול הנחל מאחוריכם והאוכף לפניכם, כמו בסיפור הדרך; וכ־${LEG2_SO_FAR_M} מ׳ מתוך ${TIP_LEGS[1].m} מתאימים לכך שעוד לא הגעתם. אין אי־התאמה, ולכן ממשיכים — ובודקים שוב באוכף.`,
        next: 'done',
      },
    },
    evidence: {
      question: 'על מה אתם מסתמכים?',
      options: [
        {
          id: 'landmark',
          label: 'השקע בין שתי הפסגות נמצא לפנינו, בכיוון ההליכה',
          verdict: 'right',
          feedback: `נכון. הסימן הבא מופיע בכיוון הצפוי ובצורה שבמפה, והמרחק (כ־${LEG2_SO_FAR_M} מתוך ${TIP_LEGS[1].m} מ׳) מתאים לכך שעוד לא הגעתם. כשהצפוי והנראה תואמים, ממשיכים — ובודקים שוב באוכף.`,
        },
        {
          id: 'distance',
          label: `עברנו רק כ־${LEG2_SO_FAR_M} מ׳, אז עוד מוקדם לבדוק`,
          verdict: 'partial',
          feedback: 'המרחק לבדו אינו מראה שאתם במסלול: הוא אומדן, ושגיאה בכיוון לא תיראה בו. כאן ההמשך נשען גם על השטח: השקע בין שתי הפסגות נמצא לפניכם, כמו בתכנון.',
        },
        {
          id: 'nothing',
          label: 'אין כאן סימן מיוחד, אז אין מה לבדוק',
          verdict: 'wrong',
          feedback: 'יש לפניכם סימן בולט — שתי פסגות והשקע שביניהן. ההחלטה להמשיך נשענת על ההתאמה שלו לתכנון, לא על היעדר סימנים.',
        },
      ],
    },
    outcome: 'ממשיכים בכיוון האוכף, ובודקים שוב כשמגיעים אליו.',
    continueLabel: 'ממשיכים לאוכף',
  },
  {
    id: 'saddle',
    n: 3,
    label: 'באוכף',
    title: 'הגעתם לאוכף',
    kind: 'decision',
    lastFix: { at: P1, name: 'עיקול הנחל' },
    estimate: { at: P2, meters: TIP_LEGS[1].m },
    leg: 1,
    next: { at: P2, name: 'אוכף' },
    story: `מעיקול הנחל: כ־${TIP_LEGS[1].m} מ׳ אל האוכף, נקודת בדיקה. משם: כ־${TIP_LEGS[2].m} מ׳ עד חציית דרך עפר.`,
    field: `מרחק משוער מעיקול הנחל: כ־${TIP_LEGS[1].m} מ׳.`,
    viewText: 'אתם בשקע נמוך בין שני מדרונות: מימין השטח עולה אל פסגה, ומאחוריכם משמאל אל פסגה שנייה. לפנים ומשמאל השטח יורד.',
    truth: { at: P2, walkedFromFix: [P1, P2] },
    view: { yawDeg: 342, pitchDeg: -2 },
    expected: 'check',
    onChoice: {
      continue: {
        lead: 'עוד לא.',
        body: 'זו נקודת בדיקה מתוכננת. גם כשהכול נראה תואם, מאמתים כאן לפני שיוצאים לקטע הבא — אחרת הקטע הבא יוצא מנקודה שלא אומתה.',
        next: 'retry',
      },
      check: {
        lead: 'נכון, עוצרים לבדוק.',
        body: 'מה מאמת שהגעתם לאוכף?',
        next: 'evidence',
      },
    },
    evidence: {
      question: 'מה מאמת שהגעתם לאוכף?',
      options: [
        {
          id: 'combined',
          label: 'שקע בין שתי פסגות, כיוון ומרחק — מתאימים יחד',
          verdict: 'right',
          feedback: 'נכון. כמה נתונים שמתאימים יחד הם אימות אמין יותר מסימן אחד.',
        },
        {
          id: 'distance',
          label: `עברנו כ־${TIP_LEGS[1].m} מ׳, המרחק שבתכנון`,
          verdict: 'partial',
          feedback: 'מרחק משוער לבדו אינו מאמת הגעה: הוא אומדן, ושגיאות בו מצטברות. הוא תומך באימות רק יחד עם צורת השטח והכיוון.',
        },
        {
          id: 'low',
          label: 'השטח כאן נמוך ממה שמסביב',
          verdict: 'wrong',
          feedback: 'שקע לבדו מתאים להרבה מקומות. אוכף מזהים לפי השקע שבין שתי פסגות, יחד עם הכיוון והמרחק מהנקודה הקודמת.',
        },
      ],
    },
    outcome: `האוכף הוא עכשיו הנקודה המזוהה האחרונה. ממנו יוצאים לקטע הבא: כ־${TIP_LEGS[2].m} מ׳ אל חציית דרך העפר.`,
    continueLabel: 'יוצאים לקטע הבא',
  },
  {
    id: 'after',
    n: 4,
    label: 'אחרי האוכף',
    title: 'אחרי האוכף',
    kind: 'decision',
    lastFix: { at: P2, name: 'האוכף' },
    estimate: { at: P3, meters: TIP_LEGS[2].m },
    leg: 2,
    next: { at: P3, name: 'חציית דרך עפר' },
    story: `מהאוכף: כ־${TIP_LEGS[2].m} מ׳ עד חציית דרך עפר.`,
    field: `מרחק משוער מהנקודה המזוהה האחרונה: כ־${TIP_LEGS[2].m} מ׳.`,
    viewText: 'מבט קדימה במורד מתון, בין שיחים ואבנים. משמאל השטח עולה מעט. דרך עפר אינה נראית סביבכם.',
    truth: { at: DRIFT_END, walkedFromFix: [P2, DRIFT_END] },
    view: { yawDeg: DRIFT_AZ, pitchDeg: -3 },
    expected: 'check',
    onChoice: {
      continue: {
        lead: 'עוד לא.',
        body: 'לפי האומדן הייתם אמורים לחצות כאן דרך עפר, והיא לא נראית סביבכם. ממשיכים רק אחרי בדיקה — כל צעד נוסף מנקודה לא ברורה עלול להגדיל את הסטייה.',
        next: 'retry',
      },
      check: {
        lead: 'נכון, עוצרים לבדוק.',
        body: 'מה הסיבה לעצור?',
        next: 'evidence',
      },
    },
    evidence: {
      question: 'מה הסיבה לעצור?',
      options: [
        {
          id: 'missing',
          label: 'דרך העפר הצפויה לא הופיעה במרחק המשוער',
          verdict: 'right',
          feedback: 'נכון. אי־התאמה בין הצפוי לנראה היא סיבה לבדוק לפני שממשיכים. היא עוד לא מראה מה השתבש: הכיוון, המרחק, או שניהם.',
        },
        {
          id: 'proof',
          label: 'ברור שסטינו מהמסלול, ואנחנו יודעים לאן',
          verdict: 'wrong',
          feedback: 'סימן חסר מראה שיש אי־התאמה, אבל לא מוכיח לאן סטיתם: אולי הכיוון סטה, אולי המרחק שונה. את זה בודקים — לא מניחים.',
        },
        {
          id: 'routine',
          label: `עברנו ${TIP_LEGS[2].m} מ׳, ובכל ${TIP_LEGS[2].m} מ׳ עוצרים`,
          verdict: 'partial',
          feedback: 'המרחק המשוער הוא הרגע שבו הדרך הייתה אמורה להופיע — אבל הסיבה לעצור היא שהיא לא הופיעה.',
        },
      ],
    },
    outcome: 'בודקים מהנקודה המזוהה האחרונה: משווים את צורות הקרקע סביבכם למפה, ובודקים את הכיוון שבו הלכתם מהאוכף ואת המרחק. ממשיכים רק כשהמיקום ברור.',
    debrief: '', // filled below from the geometry
    continueLabel: 'לסיכום',
  },
];

// ——— truth of moment 4, from the same geometry ———
const D_W = toWorld(DRIFT_END);
const CROSS_W = toWorld(P3);
/** How far the true moment-4 station is from the planned road crossing, m (≈ 200). */
export const DRIFT_FROM_CROSSING_M = distW(D_W, CROSS_W);
export const DRIFT_TURN_DEG = Math.round(DRIFT_AZ - LEG3_PLAN_AZ);

MOMENTS[3].debrief = `בשחזור: מהאוכף ירדתם בערוץ שממזרח לשלוחה נמוכה, ולא ממערב לה — הכיוון סטה צפונה בכ־${DRIFT_TURN_DEG}°. השלוחה מסתירה את דרך העפר, ואתם כ־${r(DRIFT_FROM_CROSSING_M)} מ׳ מנקודת החצייה המתוכננת. בשטח לא יודעים זאת מראש — הבדיקה היא שמגלה.`;

export const MOMENT_IDS = MOMENTS.map((m) => m.id);
export const momentById = (id: MomentId) => MOMENTS.find((m) => m.id === id)!;

/** Distance (m) between two map points. */
export const mapDistM = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y) * M_PER_UNIT;

/** Bearing between two map points, degrees clockwise from north. */
export const mapBearing = (a: Pt, b: Pt) => bearingW(toWorld(a), toWorld(b));

/** The four principles of the replaced screen, as the summary restates them. */
export const PRINCIPLES: { title: string; moment: MomentId; line: string }[] = [
  { title: 'מאמתים מיקום וכיוון לפני ההתקדמות', moment: 'depart', line: 'יצאתם מעיקול הנחל רק אחרי שזיהיתם אותו ובדקתם את הכיוון לאוכף.' },
  { title: 'משווים בין הצפוי לנראה בשטח', moment: 'enroute', line: 'בדרך, השקע בין שתי הפסגות הופיע כמו בתכנון — ולכן המשכתם.' },
  { title: 'משלבים כיוון, מרחק וסימני שטח', moment: 'saddle', line: 'באוכף, הצורה, הכיוון והמרחק התאימו יחד, והאוכף הפך לנקודה מזוהה.' },
  { title: 'בודקים אי־התאמה לפני שממשיכים', moment: 'after', line: 'כשדרך העפר לא הופיעה, עצרתם לבדוק — לפני שהסטייה גדלה.' },
];

// ——— the map's state and its accessible name ———

export type MapState = {
  moment: Moment;
  /** the saddle has been verified (moment 3 done) */
  saddleFixed: boolean;
  /** moment 4's debrief is open: the true track may be shown */
  revealTruth: boolean;
};

/** What the map shows in a state — also its accessible name (no solution before the debrief). */
export function mapDescription(s: MapState): string {
  const m = s.moment;
  const parts: string[] = [];
  if (m.id === 'depart') parts.push('במפה: אתם בעיקול הנחל, נקודה מזוהה. החץ מראה את הכיוון לקטע הבא, אל האוכף שבין שתי הפסגות.');
  else {
    const fixName = s.saddleFixed && m.id === 'saddle' ? 'האוכף' : m.lastFix.name;
    parts.push(`במפה: הנקודה המזוהה האחרונה — ${fixName}.`);
    if (m.id === 'enroute') parts.push(`המסלול המתוכנן ממשיך אל האוכף. האומדן: כ־${m.estimate?.meters} מ׳ מעיקול הנחל, על המסלול.`);
    if (m.id === 'saddle' && !s.saddleFixed) parts.push(`לפי האומדן, כ־${m.estimate?.meters} מ׳ מעיקול הנחל — האוכף שבין שתי הפסגות.`);
    if (m.id === 'saddle' && s.saddleFixed) parts.push('המסלול המתוכנן ממשיך ממנו אל חציית דרך העפר.');
    if (m.id === 'after') parts.push(`המסלול המתוכנן ממשיך ממנו כ־${m.estimate?.meters} מ׳ אל חציית דרך עפר; לפי האומדן הגעתם אליה.`);
    if (m.id === 'after' && s.revealTruth) parts.push('בשחזור מסומנת גם הדרך שעברתם בפועל: צפונה מהמתוכנן, בערוץ שממזרח לשלוחה נמוכה, והמיקום בפועל — לפני דרך העפר.');
  }
  return parts.join(' ');
}
