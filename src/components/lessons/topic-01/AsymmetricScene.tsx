'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { TimePressureExperience } from './TimePressureExperience';
import { cn } from '@/lib/utils';

/* ─────────────────────────── 3-ACTOR TYPOLOGY ──────────────────────────
   Neutral: no per-actor colour, no icon, no English on the 3 actor types
   themselves — the three categories are distinguished by label + position
   only. Icons/color ARE used elsewhere in this scene (pillars, tactics,
   fronts, table rows) per docs/palette.md: shape/icon carries the
   differentiation, `accent` orange stays reserved for single focal
   moments, no new hues are introduced. */

type ActorType = 'regular' | 'guerrilla' | 'terror';

type ActorMeta = {
  id: ActorType;
  label: string;
  shortDesc: string;
  oneLiner: string;
  identity: string;
  goals: string;
  targets: string;
  structure: string;
};

const ACTORS_LIST: ActorMeta[] = [
  {
    id: 'regular',
    label: 'צבא סדיר',
    shortDesc: 'זרוע רשמית של מדינה',
    oneLiner: 'הצבא הרשמי של מדינה ריבונית. במדים, היררכי, מתקציב המדינה.',
    identity: 'זרוע רשמית של מדינה ריבונית — שייך לממשלה, מפוקח על ידה, ומחוייב לחוקי המדינה.',
    goals: 'להגן על המדינה, לכפות את רצונה במלחמה ולהחזיק שטח.',
    targets: 'יחידות צבא של אויב. מחוייב לדין בינלאומי (אמנת ז\'נבה).',
    structure: 'היררכי, מדים וסמלים גלויים, תקציב מדינה, מצבת מילואים.',
  },
  {
    id: 'guerrilla',
    label: 'ארגון גרילה',
    shortDesc: 'פועל בתוך מדינה — שולט בטריטוריה',
    oneLiner: 'ארגון פוליטי-צבאי שפועל בתוך מדינה ושולט בפועל באזורים שלה.',
    identity: 'שחקן לא-מדינתי בתוך מדינה. בעל שליטה טריטוריאלית (כפרים, ערים, רובעים). לעיתים גם עם מושבים בפרלמנט.',
    goals: 'שליטה פוליטית או טריטוריאלית, אוטונומיה לקבוצה אתנית או דתית, סילוק כיבוש זר.',
    targets: 'בעיקר יחידות צבא וסמלי שלטון. חוקי הלחימה מוצהרים — אך לא תמיד מקויימים בשטח.',
    structure: 'חצי-היררכי, יחידות לוחמים מאומנות, מימון מקומי או אזורי, מערך מודיעין ולוגיסטיקה משלו.',
  },
  {
    id: 'terror',
    label: 'ארגון טרור',
    shortDesc: 'רשת תאים — לא באחריות מדינה',
    oneLiner: 'רשת תאים מבוזרת ללא טריטוריה ברורה. תוקפת בעיקר אזרחים כדי להפיץ אימה.',
    identity: 'שחקן לא-מדינתי, ללא טריטוריה ברורה, אינו באחריות מדינה (גם אם מדינה מממנת — אין לוגיקה מדינית רשמית).',
    goals: 'הפצת אידיאולוגיה, זרע פחד באוכלוסיה, יצירת לחץ פוליטי דרך פגיעה באזרחים.',
    targets: 'בעיקר אזרחים — מטרת ההפחדה היא הציבור, לא הצבא. מתעלם מחוקי לחימה.',
    structure: 'רשת תאים מבוזרת ללא היררכיה ברורה, מימון תרומות, פשע או הלבנה, פעילות חוצת-מדינות.',
  },
];

const ACTORS: Record<ActorType, ActorMeta> = {
  regular: ACTORS_LIST[0],
  guerrilla: ACTORS_LIST[1],
  terror: ACTORS_LIST[2],
};

const ACTOR_FIELD_ROWS: { key: keyof ActorMeta; label: string }[] = [
  { key: 'identity', label: 'זהות' },
  { key: 'goals', label: 'מטרות' },
  { key: 'targets', label: 'מטרות לחימה' },
  { key: 'structure', label: 'מבנה' },
];

/* ───────────────────────── 3-COL COMPARISON DATA ───────────────────── */
type CompareRow = {
  label: string;
  icon: IconName;
  regular: string;
  guerrilla: string;
  terror: string;
  /** Guess-before-reveal prompt shown before the row's answers are visible. */
  riddle: string;
  /** Which column the riddle's answer points to. */
  answer: ActorType;
};
const COMPARE_ROWS: CompareRow[] = [
  {
    label: 'דוגמאות',
    icon: 'people',
    regular: 'צה"ל, צבא ארה"ב, צבא רוסיה, בונדסוור גרמני',
    guerrilla: 'חיזבאללה, חות׳ים, טאליבאן (היסטורית), פאר"ק קולומביה',
    terror: 'אל-קאעידה, דאע"ש, בוקו חראם, אש-שבאב',
    riddle: 'באיזו קטגוריה תמצאו גם את חיזבאללה וגם את החות\'ים — שני ארגונים ששולטים בפועל בשטח משלהם?',
    answer: 'guerrilla',
  },
  {
    label: 'תקציב שנתי',
    icon: 'fuel',
    regular: 'עשרות עד מאות מיליארדי דולרים מתקציב המדינה',
    guerrilla: 'מאות מיליונים — מיסוי מקומי, נפט, סיוע איראני או אחר',
    terror: 'מיליונים — תרומות, פשע, הלבנת הון',
    riddle: 'מי משלושת השחקנים מתוקצב הכי דל — רק מיליונים בודדים, מתרומות, פשע והלבנת הון?',
    answer: 'terror',
  },
  {
    label: 'מטרת לחימה ראשית',
    icon: 'crosshair',
    regular: 'יחידות צבא אויב — קונבנציונאלי',
    guerrilla: 'יחידות צבא וסמלי שלטון — להחליש סדר קיים',
    terror: 'אזרחים — להפיץ פחד וליצור לחץ פוליטי',
    riddle: 'מי היחיד מבין השלושה שממוקד אך ורק ביחידות צבא יריבות, לפי כללי לחימה קונבנציונליים?',
    answer: 'regular',
  },
  {
    label: 'שטח שליטה',
    icon: 'flag',
    regular: 'כל שטח המדינה הריבונית',
    guerrilla: 'אזורים מוגדרים — מעוזים, עמקים, רובעים',
    terror: 'אין טריטוריה — תאים פזורים בעולם',
    riddle: 'מי משלושת השחקנים שולט בפועל בעיר בירה שלמה (כמו צנעא) ומפעיל שם שלטון אזרחי מקומי משלו?',
    answer: 'guerrilla',
  },
  {
    label: 'חוקי לחימה',
    icon: 'shield',
    regular: 'מחוייב לדין בינלאומי (אמנת ז\'נבה)',
    guerrilla: 'מצהיר על מחויבות — מפר בפועל',
    terror: 'מתעלם לחלוטין',
    riddle: 'מי היחיד מהשלושה שבאמת מחויב לחוקי הלחימה הבינלאומיים (אמנת ז\'נבה) — גם בהצהרה וגם בפועל?',
    answer: 'regular',
  },
];

/* ───────────────────────── 3 PILLARS OF NON-STATE ──────────────────── */
type Pillar = { id: string; label: string; icon: IconName; oneLiner: string; detail: string };

const PILLARS: Pillar[] = [
  {
    id: 'persistence',
    label: 'ספיגה והתמדה',
    icon: 'hourglass',
    oneLiner: 'הזמן עובד לטובתם. המטרה היא פשוט לשרוד את המכות.',
    detail:
      'השחקן הלא-סדיר מבין מראש שהוא לא יכול להשמיד צבא של מדינה, אז המטרה שלו היא פשוט לא להפסיד. מבחינתו, כל יום שבו הוא נשאר בחיים וממשיך לירות – נחשב לניצחון. הוא מנצל את העובדה שלמדינה יש "שעון חול": המלחמה עולה לה מיליארדים, חיילי המילואים נשחקים, ויש לחץ בינלאומי.',
  },
  {
    id: 'deterrence',
    label: 'הרתעה אסימטרית',
    icon: 'target',
    oneLiner: 'עוקפים את החזית – תוקפים את האזרחים בעורף במקום את החיילים.',
    detail:
      'כשהשחקן הלא-סדיר לא מצליח לחדור שריון של טנק או להפיל מטוסי קרב, הוא פשוט "מדלג" עליהם. במקום להילחם מול הצבא פנים אל פנים, הוא יורה טילים זולים ורחפנים ישירות על הערים של המדינה. המטרה היא לשתק את הכלכלה, לזרוע פאניקה ולגרום לאזרחים המפוחדים ללחוץ על הממשלה לעצור את המלחמה מיד.',
  },
  {
    id: 'attrition',
    label: 'התשה',
    icon: 'clock',
    oneLiner: 'להפוך את המלחמה לבוץ יקר, מתסכל וחסר תועלת.',
    detail:
      'השחקן הלא-סדיר עובד בשיטת "עקיצות קטנות": צלף יורה מהחלון ונעלם לפיר של מנהרה, או מטען חבלה קטן שמתפוצץ משום מקום. הלוחמים גורמים למדינה להוציא מאות אלפי דולרים על פצצות נגד מטרות ריקות או רחפנים מפלסטיק. הטפטוף המעצבן והבלתי פוסק הזה נועד לייאש את הצבא הסדיר ולגרום לו להרגיש שהוא מנסה להילחם ברוחות רפאים.',
  },
];

/* ─────────────── "מה הייתם עושים?" — PER-PILLAR DECISION SIM ───────────── */
type PillarChoice = { id: string; label: string; outcome: 'correct' | 'wrong'; feedback: string };
type PillarDecision = { pillarId: string; prompt: string; choices: PillarChoice[] };

const PILLAR_DECISIONS: PillarDecision[] = [
  {
    pillarId: 'persistence',
    prompt:
      'עברו שבועיים מתחילת הלחימה. הצבא שמולכם גדול וחזק פי 100 מכם, ואי אפשר להכריע אותו בקרב ישיר. מה תבחרו לעשות?',
    choices: [
      {
        id: 'big-battle',
        label: 'לרכז את כל הכוח למתקפה אחת גדולה שתכריע את המלחמה',
        outcome: 'wrong',
        feedback:
          'קרב גדול וחד-פעמי מול צבא גדול פי 100 הוא כמעט תמיד התאבדות טקטית — גם אם תצליחו לפגוע בו, לא תוכלו "לנצח" אותו במשחק שהוא הכי טוב בו.',
      },
      {
        id: 'survive',
        label: 'להימנע מהכרעה, ופשוט להישאר בחיים ולהמשיך לירות יום אחרי יום',
        outcome: 'correct',
        feedback: 'בדיוק — הזמן עצמו הוא הנשק שלכם.',
      },
    ],
  },
  {
    pillarId: 'deterrence',
    prompt:
      'ניסיתם לפגוע ישירות בשריון ובחיל האוויר של האויב — וזה לא עבד, הטכנולוגיה שלו פשוט טובה מדי. מה השלב הבא?',
    choices: [
      {
        id: 'more-military',
        label: 'להשקיע עוד יותר משאבים בניסיון לשפר את היכולת לפגוע בכוחות הצבאיים שלו',
        outcome: 'wrong',
        feedback:
          'זה בדיוק המשחק שבו תמיד תפסידו — למעצמה יש תמיד טכנולוגיה טובה וזולה יותר מכם בזירה הזאת.',
      },
      {
        id: 'skip-front',
        label: 'לדלג על החזית הצבאית ולתקוף ישירות את הערים והאזרחים בעורף',
        outcome: 'correct',
        feedback: 'בדיוק — עוקפים את מה שהוא חזק בו, ותוקפים את מה שהוא לא יכול להגן עליו.',
      },
    ],
  },
  {
    pillarId: 'attrition',
    prompt: 'אין לכם סיכוי לנצח בקרב גדול אחד. איך בכל זאת תשחקו בהדרגה את הצבא הסדיר?',
    choices: [
      {
        id: 'one-big-op',
        label: 'לתכנן מבצע ענק אחד שיפתיע את כולם וישנה את התמונה בבת אחת',
        outcome: 'wrong',
        feedback:
          'מבצע ענק וחד-פעמי חושף אתכם — ברגע שהאויב מזהה אותו, יש לו את כל הכוח הדרוש כדי לחסל אתכם באש אחת.',
      },
      {
        id: 'small-stings',
        label: 'לבצע הרבה "עקיצות קטנות" — צלף כאן, מטען שם — בלי הפסקה ובלי דפוס קבוע',
        outcome: 'correct',
        feedback: 'בדיוק — טפטוף מתמיד ובלתי צפוי שוחק את הסבלנות והתקציב של הצד החזק.',
      },
    ],
  },
];

/* ───────────────────────── 5 TACTICS OF NON-STATE ──────────────────── */
type Tactic = {
  id: string;
  title: string;
  icon: IconName;
  vignette: string;
  /** 3–5 word paraphrase of `vignette`, shown under the tactic card once the
   * report is placed there — replaces the plain "placed" checkmark that used
   * to sit on the photo before the answers are checked. */
  reportSummary: string;
  desc: string;
};

const TRAITS: Tactic[] = [
  {
    id: 'conceal',
    title: 'הסתרה והסוואה',
    icon: 'mask',
    vignette: 'לוחם לא לובש מדים, לא נוסע בשיירת רכבים מאורגנת, ולא יוצא מבסיס קבוע — הוא נראה בדיוק כמו אזרח רגיל ברחוב.',
    reportSummary: 'מתחזה לאזרח רגיל ברחוב',
    desc:
      'החוק הראשון הוא לא לבלוט. אין מדים, אין שיירות ג\'יפים מאורגנות ואין בסיסים מסודרים. הלוחמים מתלבשים כמו אזרחים רגילים ונבלעים בסביבה. למה? כי הם מבינים שברגע שמטוס קרב או רחפן מזהה אותם – ייקח בדיוק 10 שניות להשמיד אותם.',
  },
  {
    id: 'embed',
    title: 'להתערבב עם אזרחים',
    icon: 'people',
    vignette: 'משגר טילים חונה בחצר בית ספר; חדר הפיקוד ממוקם קומה מתחת למחלקת ילדים בבית חולים.',
    reportSummary: 'משגר טילים בחצר בית-ספר',
    desc:
      'במקום שדה קרב פתוח, הם ממקמים מפקדות ומשגרי טילים בתוך בתי חולים, בתי ספר ושכונות מגורים צפופות. זה תוקע את הצבא הסדיר בדילמה אכזרית: לתקוף ולחטוף אש מהעולם על פגיעה בחפים מפשע, או לוותר על חיסול המטרה ולתת להם לברוח?',
  },
  {
    id: 'silence',
    title: 'להיות "שקטים" טכנולוגית',
    icon: 'satellite',
    vignette: 'הלוחמים אספו את כל הסמארטפונים לפני היציאה למשימה, ומעבירים הוראות בפתק נייר ביד שליח.',
    reportSummary: 'בלי סמארטפונים, פתקים ביד שליח',
    desc:
      'איך מתחבאים מצבא שקולט כל שיחת טלפון ורואה הכל מהחלל? יורדים מהרדאר. עוזבים את הסמארטפונים ועוברים להעביר פתקים מנייר דרך שליחים. נמנעים מנסיעה ברכבים שפולטים חום שלוויינים יכולים לקלוט. אי אפשר לעשות מתקפת סייבר על פתק נייר.',
  },
  {
    id: 'cheap',
    title: 'לפגוע בזול בנשק יקר',
    icon: 'box',
    vignette: 'רחפן צעצוע שנקנה ברשת ב-300 דולר, עם רימון מאולתר מחובר לגחון, משבית טנק בשווי 5 מיליון דולר.',
    reportSummary: 'רחפן זול משבית טנק יקר',
    desc:
      'מתמטיקה פשוטה: למה לפתח תעשיית נשק אם אפשר לקנות רחפן צעצוע ב-300 דולר, לחבר לו רימון, ולשתק טנק טכנולוגי שעולה 5 מיליון דולר? האסטרטגיה היא כלכלית — להכריח את הצבא הסדיר לבזבז הון וטילי יירוט יקרים על איומים שעולים גרושים.',
  },
  {
    id: 'optics',
    title: 'דעת הקהל היא שדה הקרב האמיתי',
    icon: 'megaphone',
    vignette: 'תוך דקות מההפצצה, סרטון של הריסות ופצועים כבר עולה לרשתות החברתיות ומופץ ברחבי העולם.',
    reportSummary: 'סרטון הריסות מופץ ברשת מהר',
    desc:
      'הסמארטפון קטלני לא פחות מרובה. השחקן הלא-סדיר מתעד בניינים הרוסים ואזרחים פגועים ומפיץ ברשתות כדי לזעזע את העולם. הם יודעים שלחץ בינלאומי וסרטונים ויראליים יבלמו את הצבא הסדיר הרבה לפני שייגמרו לו הטילים.',
  },
];

/* ─────────────────────── DRAG EXERCISE — 9 ORGS ────────────────────── */

type Org = { id: string; label: string; subtitle: string; correct: ActorType; hint: string };

const ORGS: Org[] = [
  { id: 'idf', label: 'צה"ל', subtitle: 'ישראל', correct: 'regular',
    hint: 'הזרוע הצבאית הרשמית של מדינת ישראל — מדים, היררכיה, תקציב מדינה. צבא סדיר במובהק.' },
  { id: 'us-army', label: 'צבא ארה"ב', subtitle: 'ארה"ב', correct: 'regular',
    hint: 'הצבא הרשמי של ארצות הברית, מדינה ריבונית. צבא סדיר.' },
  { id: 'russia-army', label: 'צבא רוסיה', subtitle: 'רוסיה', correct: 'regular',
    hint: 'הצבא הרשמי של רוסיה. צבא סדיר.' },
  { id: 'hezbollah', label: 'חיזבאללה', subtitle: 'לבנון', correct: 'guerrilla',
    hint: 'ארגון פוליטי-צבאי השולט בדרום לבנון, עם מושבים בפרלמנט הלבנוני. בעל שטח והיררכיה — גרילה, לא צבא של מדינה ולא רשת תאים פזורה.' },
  { id: 'houthis', label: 'חות׳ים', subtitle: 'תימן', correct: 'guerrilla',
    hint: 'שולטים בצנעא וצפון תימן בפועל, מנהלים שלטון אזרחי משלהם. בעלי טריטוריה = גרילה, לא טרור.' },
  { id: 'taliban', label: 'טאליבאן (היסטורית)', subtitle: 'אפגניסטן · 2001–2021', correct: 'guerrilla',
    hint: 'במהלך 20 שנות נוכחות אמריקאית באפגניסטן הם לחמו כגרילה — שלטו בשטחים והיו עם מבנה צבאי-פוליטי ברור.' },
  { id: 'al-qaeda', label: 'אל-קאעידה', subtitle: 'גלובלי', correct: 'terror',
    hint: 'רשת תאים גלובלית ללא טריטוריה. תוקפת בעיקר אזרחים (פיגועי 11.9, שגרירויות, רכבות). ארגון טרור במובהק.' },
  { id: 'isis', label: 'דאע"ש', subtitle: 'סוריה-עיראק וגלובלי', correct: 'terror',
    hint: 'בשיא (2014-2017) היה גם בעל שטח, אך התדרדר לרשת תאים פזורה שתוקפת אזרחים בעולם. סיווג טרור.' },
  { id: 'boko-haram', label: 'בוקו חראם', subtitle: 'ניגריה', correct: 'terror',
    hint: 'תוקפים בעיקר אוכלוסייה אזרחית: חוטפים ילדות מבתי-ספר, מפציצים שווקים. ללא טריטוריה רשמית מנוהלת.' },
];

/* ──────────────────────────────── SCENE ───────────────────────────── */

export function AsymmetricScene() {
  const [placement, setPlacement] = useState<Record<string, ActorType | null>>(
    Object.fromEntries(ORGS.map((o) => [o.id, null])) as Record<string, ActorType | null>,
  );
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const allPlaced = ORGS.every((o) => placement[o.id] != null);
  const correctCount = ORGS.filter((o) => placement[o.id] === o.correct).length;

  const handleMove = (id: string, bucket: ActorType | null) => {
    setPlacement((p) => ({ ...p, [id]: bucket }));
    setSelectedOrg(null);
    setSubmitted(false);
  };

  const reset = () => {
    setPlacement(Object.fromEntries(ORGS.map((o) => [o.id, null])) as Record<string, ActorType | null>);
    setSelectedOrg(null);
    setSubmitted(false);
  };

  return (
    <section id="scene-asymmetric" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.3"
        eyebrow="לחימה אסימטרית"
        underline
        title={
          <>
           צבא סדיר, טרור וגרילה —<br />
           <span className="gradient-text">שלושה שחקנים, שלוש לוגיקות שונות</span>
          </>
        }
        intro={`פעם, מלחמות היו פשוטות: צבא מול צבא. היום זה לא תמיד ככה. צבא רגיל של מדינה נפגש עם ארגוני גרילה (שיש להם שטח ושליטה) ועם ארגוני טרור (רשת תאים מפוזרת בלי שטח). שלושת השחקנים פועלים בלוגיקה שונה לגמרי — חוקי המלחמה משתנים בכל אחת מהזירות.`}
      />

      {/* Banner-tab selector + single active-actor detail panel — replaces
          the former "all 3 at once" static card grid (see
          design/docs/assumptions.md, "Topic-01 asymmetric-actor tabs"). */}
      <ActorTypologySelector />

      <div className="mt-12">
        <TypologyTable />
      </div>

      <PillarSimulator />

      <TimePressureExperience />

      <TacticMatchExercise />

      <DragExercise
        placement={placement}
        selectedOrg={selectedOrg}
        submitted={submitted}
        allPlaced={allPlaced}
        correctCount={correctCount}
        onSelect={setSelectedOrg}
        onMove={handleMove}
        onSubmit={() => setSubmitted(true)}
        onReset={reset}
      />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="surface-elevated p-5 sm:p-6 mt-12"
      >
        <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h3 className="font-display font-bold text-xl md:text-2xl leading-tight text-balance text-black mb-3">
              המסקנה: זורקים את ספר החוקים הישן לפח
            </h3>
            <span aria-hidden className="inline-block h-[3px] w-7 rounded-full bg-accent-hover mb-3" />
            <p className="text-base md:text-lg text-black leading-relaxed text-pretty">
              צבא מסורתי התאמן במשך שנים להילחם "ראש בראש": חזית מול חזית, מדים מול מדים. אבל כשאתה נלחם בארגון גרילה שנעלם מתחת לאדמה — או ברשת טרור שתוקפת אזרחים בכל מקום בעולם — כל החוקים הישנים קורסים. כדי לנצח כאוס כזה, אי אפשר רק לשלוח עוד טנקים. הצבא הסדיר חייב לשנות דיסקט, להמציא טכנולוגיות חדשות, ולאסוף מודיעין מסוג אחר לגמרי. את הכלים האלה בדיוק נלמד בשיעורים הבאים.
            </p>
          </div>
          <IsometricAsset
            assetId="TOPIC01-ASYM-CLOSING"
            src="/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-CLOSING.png"
            alt="איור איזומטרי: חיילים וטנק ליד פח אשפה שספר חוקים ישן נזרק לתוכו, מול עיר עם מנהרות, כטב&quot;מ ועמדת ניטור"
            aspect="1/1"
            fit="contain"
            className="rounded-lg w-[150px] sm:w-[180px] shrink-0 bg-bg-elevated"
            prompt="An isometric papercut illustration of a simple layered-paper balance scale on a cream background (#FFFBF7), resting on a warm peach base (#FFDCB5). One arm holds a large sage-green paper block (#749C75) tipping down, the other arm holds one small paper dot rendered in orange (#EB9E48) staying level and steady. Flat paper-cut shading, minimal composition, generous empty cream space, no text, no people, no weapons."
          />
        </div>
      </motion.div>
    </section>
  );
}

/* ───────────── BANNER-TAB SELECTOR + SINGLE DETAIL PANEL ───────────────
   3 clickable photo banners (one per ACTORS_LIST entry, in array order —
   `regular` lands at the visual right, matching this RTL page's inline-start
   convention) drive one crossfaded detail panel below, showing only the
   active actor's data. Pattern (state / AnimatePresence mode="wait" /
   RTL DOM-order for the two-column panel) copied from
   HistoricalCasesPanel.tsx and LevelsScene.tsx's own level-selector; only
   ONE accent-colored treatment marks the active tab (bottom bar + label
   color) — same "accent-only active state" rule as the levels-scene
   selector, see design/docs/assumptions.md. */

/* Prompt-style suffixes for this component's own IsometricAsset calls — the
   banner/portrait assets are real-world photographs and the field-grid
   assets are flat UI icons, NOT the isometric-papercut illustration
   language this file's OTHER IsometricAsset calls use (hero/closing/
   pillars/tactics above) — these write their prompts in their own
   flat-icon register rather than reusing the papercut brief verbatim. */
const ACTOR_PHOTO_PROMPT_STYLE =
  'photorealistic documentary-style photography, natural daylight, muted earth-tone color grading, shallow depth of field, no text overlays, no logos, no visible faces in close-up, no state insignia or flags, wide-angle field/terrain setting';

const ACTOR_ICON_PROMPT_STYLE =
  'flat modern vector icon, simple bold black outline with solid black fill on transparent background, monochrome black and white, minimal geometric shapes, centered, no text, no shadow, no gradient, no color, no 3D or isometric or papercut styling, clean UI icon like Lucide or Phosphor icon sets, 128x128px';

const ACTOR_BANNER_PROMPT: Record<ActorType, string> = {
  regular: `A single-file column of uniformed soldiers marching with full backpacks and helmets across open hillside terrain, shot from behind, ${ACTOR_PHOTO_PROMPT_STYLE}`,
  guerrilla: `Two irregular fighters in mixed fatigues carrying backpacks, walking through dense green hillside brush, shot from behind, ${ACTOR_PHOTO_PROMPT_STYLE}`,
  terror: `A masked fighter wearing a scarf and tactical vest standing amid war-damaged, rubble-strewn urban buildings, shot from behind/side, ${ACTOR_PHOTO_PROMPT_STYLE}`,
};

const ACTOR_PORTRAIT_PROMPT: Record<ActorType, string> = {
  regular: `A closer single-file column of uniformed soldiers marching with full combat gear and backpacks along a dirt trail through hills, shot from behind, ${ACTOR_PHOTO_PROMPT_STYLE}`,
  guerrilla: `Two irregular fighters carrying backpacks, walking together through green hillside vegetation, shot from behind, ${ACTOR_PHOTO_PROMPT_STYLE}`,
  terror: `A masked fighter in a scarf standing alone in a bombed-out city street surrounded by rubble and damaged buildings, ${ACTOR_PHOTO_PROMPT_STYLE}`,
};

/** Drag-exercise category-bin header photos (`*-BIN.png`) — a wide establishing
 * shot per actor (convoy / camp / ruined street), distinct from the banner-tab
 * and portrait crops above which frame people up close. */
const ACTOR_BIN_PROMPT: Record<ActorType, string> = {
  regular: `A convoy of armored military vehicles carrying soldiers driving fast across a dusty desert road, mountains in the background, ${ACTOR_PHOTO_PROMPT_STYLE}`,
  guerrilla: `A hidden military tent camp with stacked supply crates pitched among rocks and pine trees on a mountainside, overlooking forested hills, ${ACTOR_PHOTO_PROMPT_STYLE}`,
  terror: `A narrow street lined with bombed-out, rubble-strewn residential buildings in a dense urban neighborhood, ${ACTOR_PHOTO_PROMPT_STYLE}`,
};

/** Field-grid icon prompt, keyed on the same `ACTOR_FIELD_ROWS[i].key` this
 * component already renders — a `switch` (not a `Record`) so TypeScript
 * accepts the full `keyof ActorMeta` parameter type without a cast, even
 * though only the 4 field keys are ever actually passed in. */
function actorFieldIconPrompt(key: keyof ActorMeta): string {
  switch (key) {
    case 'identity':
      return `An identification card / ID badge icon, ${ACTOR_ICON_PROMPT_STYLE}`;
    case 'goals':
      return `A crosshair / target reticle icon, ${ACTOR_ICON_PROMPT_STYLE}`;
    case 'targets':
      return `A shield icon, ${ACTOR_ICON_PROMPT_STYLE}`;
    case 'structure':
      return `An org-chart / hierarchy icon with connected nodes, ${ACTOR_ICON_PROMPT_STYLE}`;
    default:
      return ACTOR_ICON_PROMPT_STYLE;
  }
}

function ActorTypologySelector() {
  const [activeId, setActiveId] = useState<ActorType>(ACTORS_LIST[0].id);
  const active = ACTORS[activeId];

  return (
    <div>
      {/* Banner tabs — 3 equal columns at every width; each shows its
          actor's pre-made *-BANNER.png cover-fit, with a scrim fading from
          solid (visual right / inline-start, where the label sits) to
          transparent (visual left, where the photo stays visible) — this
          page is a fixed-RTL layout (no LTR variant), so the physical
          `to-l` gradient direction is intentional here, matching existing
          precedent elsewhere in this codebase (e.g. Footer.tsx). */}
      <div role="tablist" aria-label="בחר סוג שחקן" className="grid grid-cols-3 gap-3 mb-3">
        {ACTORS_LIST.map((a, i) => {
          const isActive = a.id === activeId;
          return (
            <motion.button
              key={a.id}
              type="button"
              role="tab"
              id={`actor-tab-${a.id}`}
              aria-selected={isActive}
              aria-controls="actor-detail-panel"
              onClick={() => setActiveId(a.id)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="group relative h-20 sm:h-24 overflow-hidden rounded-2xl border border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03] transition-all duration-300 ease-snap"
            >
              <IsometricAsset
                assetId={`TOPIC01-ASYM-ACTOR-${a.id.toUpperCase()}-BANNER`}
                src={`/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-ACTOR-${a.id.toUpperCase()}-BANNER.png`}
                alt=""
                // `aspect` is nominal only — canceled below by the
                // `[aspect-ratio:auto]` override className (the real
                // source is ~3:1, not 1:1).
                aspect="1/1"
                fit="cover"
                compactPlaceholder
                prompt={ACTOR_BANNER_PROMPT[a.id]}
                className="absolute inset-0 size-full [aspect-ratio:auto]"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-l from-bg-elevated via-bg-elevated/85 to-transparent"
              />
              <span
                className={cn(
                  // justify-start packs toward inline-start (visual RIGHT
                  // under this page's dir="rtl"), landing the label over
                  // the scrim's solid side — justify-end would pack it
                  // toward the visual left (main-end under RTL), over the
                  // transparent/photo side instead.
                  'relative z-10 flex h-full items-center justify-start px-3 sm:px-4 font-display text-sm sm:text-base font-bold leading-tight text-pretty transition-colors',
                  isActive ? 'text-accent' : 'text-fg group-hover:text-brand-dark',
                )}
              >
                {a.label}
              </span>
              {isActive && (
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-accent" />
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          id="actor-detail-panel"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`actor-tab-${active.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="surface-elevated grid overflow-hidden md:grid-cols-[1.15fr_1fr]"
        >
          {/* Text column — first DOM child → right in RTL. */}
          <div className="flex flex-col p-6 md:p-8">
            <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">
              {active.label}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-black text-pretty">{active.oneLiner}</p>
            <div className="mt-4 border-t border-border-subtle" />
            {/* grid-cols-1 below sm: the reference mockup's own placeholder
                text is much shorter than ACTOR_FIELD_ROWS' real values (2-4x
                longer), so a fixed 2-up grid gets too narrow/tall on mobile —
                stack single-column there, 2-up from sm+ where there's room. */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ACTOR_FIELD_ROWS.map((field, i) => (
                // Text is the FIRST child (→ right in RTL) and the icon
                // circle is SECOND (→ left) — matches the reference's own
                // per-cell composition (icon toward the visual left, label
                // + value toward the visual right), confirmed by cropping
                // the reference image at pixel level.
                // Divider rules (sm+ only, once the grid is actually 2
                // columns): border-s on column-2 cells reproduces the
                // reference's vertical rule, border-t on row-2 cells
                // reproduces its horizontal rule — together a "+" cross
                // matching the reference, no extra divider markup needed.
                <div
                  key={field.key}
                  className={cn(
                    'flex items-start gap-2.5 min-w-0',
                    i % 2 === 1 && 'sm:border-s sm:border-border-subtle sm:ps-4',
                    i >= 2 && 'sm:border-t sm:border-border-subtle sm:pt-4',
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider">
                      {field.label}
                    </div>
                    <p className="text-base leading-relaxed text-black text-pretty">
                      {active[field.key]}
                    </p>
                  </div>
                  <div className="size-11 rounded-xl flex items-center justify-center shrink-0 border bg-bg-accent border-border">
                    <IsometricAsset
                      assetId={`TOPIC01-ASYM-ICON-${field.key.toUpperCase()}`}
                      src={`/assets/lessons/topic01/scene-asymmetric/icons/TOPIC01-ASYM-ICON-${field.key.toUpperCase()}.png`}
                      alt=""
                      // `aspect` is real here (no `[aspect-ratio:auto]`
                      // override on this call) — the icon PNGs are true
                      // 1:1 squares, so this actually governs the box.
                      aspect="1/1"
                      fit="contain"
                      compactPlaceholder
                      prompt={actorFieldIconPrompt(field.key)}
                      className="size-6 sm:size-7 bg-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo column — second DOM child → left in RTL. Rounded corners
              on its outer edges come free from the panel's own
              `overflow-hidden` + radius (no separate framing needed here,
              unlike HistoricalCasesPanel's inset map column). */}
          <div className="relative min-h-[220px] md:min-h-0">
            <IsometricAsset
              assetId={`TOPIC01-ASYM-ACTOR-${active.id.toUpperCase()}`}
              src={`/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-ACTOR-${active.id.toUpperCase()}.png`}
              // Empty: the adjacent <h3> heading two columns over already
              // names this actor — an alt repeating it would be redundant,
              // same treatment already used by the banner tabs above.
              alt=""
              // `aspect` is nominal only — canceled below by the
              // `[aspect-ratio:auto]` override className (the real source
              // is closer to 4:5 portrait, not 4:3).
              aspect="4/3"
              fit="cover"
              prompt={ACTOR_PORTRAIT_PROMPT[active.id]}
              className="absolute inset-0 size-full [aspect-ratio:auto]"
            />
            {/* Caption lives INSIDE the scrim (not a sibling absolute box)
                so the scrim's own height always tracks the caption's real
                content height — if `shortDesc` ever wraps to 2 lines, the
                scrim grows with it instead of the first line escaping onto
                bare photo. `text-end` places it at the visual left
                (inline-end), matching the reference — this <p> has no
                inherited alignment otherwise, which would default to the
                page's RTL `start` (visual right). */}
            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-fg/85 via-fg/15 to-transparent p-4 pt-12"
            >
              <p className="text-end text-sm font-display font-medium text-bg-elevated">
                {active.shortDesc}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── 3-COL COMPARISON TABLE ─────────────────────── */
/* Guess-before-reveal: each row starts as a riddle. The learner picks which
   actor it describes, then the full row (all 3 columns) reveals with the
   guess marked right/wrong. A "reveal without guessing" escape hatch stays
   available per-row and for the whole table. */

/* Header photo strip re-uses the same actor banner PNGs already produced
   for ActorTypologySelector's tabs above (TOPIC01-ASYM-ACTOR-*-BANNER.png)
   — no new image assets for this table, per the reference's own "photo above
   the column label" header treatment. */
function TypologyTableHeader() {
  return (
    <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] border-b border-border-strong">
      <div className="p-4 bg-bg-accent flex items-center">
        <div className="font-display font-bold text-sm sm:text-base text-fg tracking-wide">השוואה</div>
      </div>
      {ACTORS_LIST.map((a) => (
        <div key={a.id} className="flex flex-col border-s border-border-subtle bg-bg-accent">
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-2.5">
            <div className="font-display font-bold leading-tight text-black text-lg md:text-xl">{a.label}</div>
          </div>
          <div className="relative mx-3 sm:mx-4 mb-3 sm:mb-4 h-16 sm:h-20 overflow-hidden rounded-lg">
            <IsometricAsset
              assetId={`TOPIC01-ASYM-ACTOR-${a.id.toUpperCase()}-BANNER`}
              src={`/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-ACTOR-${a.id.toUpperCase()}-BANNER.png`}
              alt=""
              // `aspect` nominal only — canceled by `[aspect-ratio:auto]`,
              // same convention as this file's other banner-image calls.
              aspect="1/1"
              fit="cover"
              compactPlaceholder
              className="absolute inset-0 size-full [aspect-ratio:auto]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Any-order answering: every row is its own independent riddle and stays
   answerable at all times, regardless of whether earlier/later rows have
   been guessed yet — no sequential lock, no "טרם הושלם" placeholder, and no
   accent highlight singling out one row as "the active one". Reveal keeps
   the existing per-cell correct/wrong tint (bg-status-ok/10 /
   bg-status-danger/10) as pedagogical feedback, but drops the ✓/✗ badge —
   see design/docs/assumptions.md, "Topic-01 typology table restyle" for why this
   supersedes the table's earlier sequential-lock behavior. */
function TypologyTable() {
  const [answers, setAnswers] = useState<Record<number, ActorType | undefined>>({});

  const guess = (rowIndex: number, choice: ActorType) => {
    setAnswers((prev) => ({ ...prev, [rowIndex]: choice }));
  };

  return (
    <div className="surface-elevated overflow-hidden">
      <TypologyTableHeader />

      {COMPARE_ROWS.map((row, i) => {
        const state = answers[i];
        const revealed = state !== undefined;
        return (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: i * 0.05 }}
            className="border-b border-border-subtle last:border-b-0"
          >
            {revealed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-[1.1fr_1fr_1fr_1fr]"
              >
                <div className="p-4 flex items-center bg-bg-accent">
                  <div className="text-base font-display font-bold text-black tracking-wider">{row.label}</div>
                </div>
                {ACTORS_LIST.map((a) => {
                  const isAnswer = a.id === row.answer;
                  const isWrongGuess = state === a.id && !isAnswer;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'p-4 border-s border-border-subtle text-base leading-relaxed text-black',
                        isAnswer && 'bg-status-ok/10',
                        isWrongGuess && 'bg-status-danger/10',
                      )}
                    >
                      {row[a.id]}
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-[1.1fr_1fr_1fr_1fr]"
              >
                <div className="p-4 flex items-center bg-bg-accent">
                  <div className="text-base font-display font-bold text-black tracking-wider">{row.label}</div>
                </div>
                <div className="col-span-3 p-4 border-s border-border-subtle">
                  <p className="text-base leading-relaxed text-black text-pretty text-center mb-2">{row.riddle}</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {ACTORS_LIST.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => guess(i, a.id)}
                        className="px-3 py-2 rounded-xl border border-border bg-bg-elevated text-sm font-display font-semibold text-black hover:border-brand/30 hover:bg-brand/[0.03] transition-all duration-300 ease-snap"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ───────────────── "מה הייתם עושים?" — PILLAR SIMULATOR UI ─────────────── */

function PillarSimulator() {
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const solvedCount = Object.values(solved).filter(Boolean).length;

  return (
    <div className="mt-12">
      <div className="mb-5">
        <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">
          שלושה עמודי האסטרטגיה של השחקן הלא-סדיר
        </h3>
        <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
        <p className="mt-2 text-base leading-relaxed text-fg-muted">
          אתם מפקדים על ארגון לא-סדיר מול צבא גדול פי 100 מכם. בכל אחד משלושת רגעי ההחלטה — בחרו מה הייתם עושים.
        </p>
      </div>

      {/* Step-connector: a hairline spanning the 3 columns with a dot
          centered above each card — purely decorative (no text), matching
          the reference's 3-2-1 progress rail above the card row. */}
      <div className="relative hidden sm:grid grid-cols-3 h-3 mb-3" aria-hidden>
        <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-border-strong/60" />
        {PILLAR_DECISIONS.map((d) => (
          <div key={d.pillarId} className="relative mx-auto size-2.5 rounded-full bg-border-strong/80" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PILLAR_DECISIONS.map((d, i) => {
          const pillar = PILLARS.find((p) => p.id === d.pillarId)!;
          return (
            <PillarDecisionCard
              key={d.pillarId}
              index={i}
              decision={d}
              pillar={pillar}
              solved={!!solved[d.pillarId]}
              onSolved={() => setSolved((s) => ({ ...s, [d.pillarId]: true }))}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {solvedCount === PILLARS.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-bg-accent p-5 mt-4"
          >
            <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider">התובנה</div>
            <p className="text-base leading-relaxed text-black text-pretty">
              לא משנה אם זה ארגון גרילה או רשת טרור — הם חולקים את אותה אסטרטגיית-יסוד מול הצבא הסדיר: לשרוד, לעקוף, ולשחוק.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PillarDecisionCard({
  index,
  decision,
  pillar,
  solved,
  onSolved,
}: {
  index: number;
  decision: PillarDecision;
  pillar: Pillar;
  solved: boolean;
  onSolved: () => void;
}) {
  const [lastChoice, setLastChoice] = useState<PillarChoice | null>(null);

  const pick = (choice: PillarChoice) => {
    setLastChoice(choice);
    if (choice.outcome === 'correct') onSolved();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="surface text-start relative overflow-hidden flex flex-col"
    >
      {/* Banner — big pillar number + themed icon illustration, one source
          PNG per pillar (…-1-/-2-/-3-BANNER, matching this card's
          `index + 1`, same numbering as PILLAR_DECISIONS/"עמוד N" always
          used). Replaces the former plain "עמוד N" text label — the number
          is now baked into the artwork, as in the reference. */}
      <div className="relative w-full shrink-0 aspect-[1983/793]">
        <IsometricAsset
          assetId={`TOPIC01-ASYM-PILLAR-${index + 1}-BANNER`}
          src={`/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-PILLAR-${index + 1}-BANNER.png`}
          alt=""
          aspect="4/3"
          fit="cover"
          className="absolute inset-0 size-full [aspect-ratio:auto]"
        />
      </div>

      {/* Content — a fixed `min-h` (roomy enough for the longest "solved"
          state across all 3 pillars) so the card's footprint is set from
          first paint and never grows/shrinks as a choice reveals more or
          less text; see design/docs/assumptions.md for how this value was
          measured. */}
      <div className="flex flex-col gap-3 p-5 min-h-[30rem]">
        {solved && (
          <h4 className="font-display font-bold leading-tight text-black text-lg md:text-xl text-balance">{pillar.label}</h4>
        )}

        {!solved ? (
          <div className="flex-1 flex flex-col gap-3">
            <p className="text-base leading-relaxed text-black">{decision.prompt}</p>
            <div className="flex flex-col gap-2">
              {decision.choices.map((c) => {
                const isWrongPick = lastChoice?.id === c.id && lastChoice.outcome === 'wrong';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(c)}
                    className={cn(
                      'flex items-center gap-2.5 text-start p-3 rounded-xl border text-sm transition-all duration-300 ease-snap',
                      isWrongPick
                        ? 'border-status-danger/50 bg-status-danger/10'
                        : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                    )}
                  >
                    {/* Radio indicator — inline-start (visual right under
                        RTL), first DOM child in this flex row so it lands
                        at the row's start edge next to the Hebrew text,
                        matching the reference's right-anchored circles. */}
                    <span
                      aria-hidden
                      className={cn(
                        'shrink-0 inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold leading-none',
                        isWrongPick ? 'bg-status-danger text-white' : 'border-[1.5px] border-border',
                      )}
                    >
                      {isWrongPick && '✗'}
                    </span>
                    <span className="flex-1">{c.label}</span>
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {lastChoice && lastChoice.outcome === 'wrong' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-base leading-relaxed text-status-danger rounded-xl border border-status-danger/50 bg-status-danger/10 p-3">
                    {lastChoice.feedback} נסו שוב.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-status-ok/50 bg-status-ok/10 p-3">
              <span
                aria-hidden
                className="mt-0.5 shrink-0 inline-flex items-center justify-center size-5 rounded-full bg-status-ok text-white text-[10px] font-bold leading-none"
              >
                ✓
              </span>
              <p className="text-xs text-status-ok font-display font-semibold leading-snug">{lastChoice?.feedback}</p>
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">{pillar.oneLiner}</p>
            <p className="text-base leading-relaxed text-black pt-3 border-t border-border-subtle">{pillar.detail}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────── TACTIC MATCH — FIELD REPORTS ──────────────────── */
/* Matching exercise: 5 short "field report" vignettes, each matched to
   exactly one of the 5 tactic slots (unlike CategoryBin, a slot holds at
   most one item). Full title + explanation reveal once matched. */

function TacticMatchExercise() {
  const [placement, setPlacement] = useState<Record<string, string | null>>(
    Object.fromEntries(TRAITS.map((t) => [t.id, null])),
  );
  const [submitted, setSubmitted] = useState(false);

  // One-at-a-time flow: `current` is the next un-placed field report — the
  // single "question" on screen. Placing it (correctly or not) immediately
  // surfaces the next un-placed trait as the new `current`, purely as a
  // side effect of TRAITS.find() re-running — no separate step/index state.
  const current = TRAITS.find((t) => placement[t.id] == null) ?? null;
  const allPlaced = TRAITS.every((t) => placement[t.id] != null);
  const correctCount = TRAITS.filter((t) => placement[t.id] === t.id).length;

  const place = (vignetteId: string, binId: string | null) => {
    setPlacement((prev) => {
      const next = { ...prev };
      if (binId) {
        for (const key of Object.keys(next)) {
          if (next[key] === binId) next[key] = null;
        }
      }
      next[vignetteId] = binId;
      return next;
    });
    setSubmitted(false);
  };

  const reset = () => {
    setPlacement(Object.fromEntries(TRAITS.map((t) => [t.id, null])));
    setSubmitted(false);
  };

  return (
    <div className="mt-12">
      <div className="mb-5">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">
              חמש טקטיקות של השחקן הלא-סדיר
            </h3>
            <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
            <p className="mt-2 text-base leading-relaxed text-fg-muted">
              לפני שתראו את שם הטקטיקה — קראו כל "דיווח שטח" קצר וגררו (או הקישו עליו ואז על שם הטקטיקה) אותו למקום המתאים. אחרי ששיבצתם את כל החמישה, לחצו "בדוק תשובות" לקבל את ההסבר המלא לכל אחת.
            </p>
          </div>
          <IsometricAsset
            assetId="TOPIC01-ASYM-TACTICS"
            src="/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-TACTICS.png"
            alt="איור איזומטרי: משטח שטח בדמדומים עם עצים קטנים ורחפן קטן מרחף מעל"
            aspect="16/9"
            className="rounded-xl h-20 sm:h-28 w-auto shrink-0"
            prompt="Isometric papercut illustration of a small layered terrain tile at dusk on a cream background (#FFFBF7): a warm peach ground platform (#FFDCB5), a few sage-green paper trees (#749C75), a winding paper dirt path, and one small abstract drone-like paper shape with a single orange (#EB9E48) accent light hovering above. No visible weapons, no people, flat paper-cut shading, small and simple composition, no text."
          />
        </div>
      </div>

      <div className="surface-elevated p-5 sm:p-6 mb-4 relative overflow-hidden">
        {/* Accent flash — an independent overlay keyed on the same id, so it
            re-triggers every time the report switches regardless of the
            text's own slide/fade, giving an unmissable "something just
            changed" cue on top of the (subtler) text motion below. */}
        <AnimatePresence>
          <motion.span
            key={`flash-${current?.id ?? 'done'}`}
            aria-hidden
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 rounded-2xl bg-accent/15 ring-2 ring-accent/40"
          />
        </AnimatePresence>

        <div className="relative text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider text-center">
          דיווחי שטח
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          {current ? (
            <motion.p
              key={current.id}
              initial={{ opacity: 0, y: -26, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 26, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="relative max-w-2xl mx-auto text-center text-base sm:text-lg leading-relaxed text-fg text-pretty"
            >
              {current.vignette}
            </motion.p>
          ) : (
            <div className="relative text-center text-sm text-fg-muted py-4">
              שיבצתם את כל הדיווחים. {submitted ? 'בדקו את התוצאה למטה.' : 'לחצו "בדוק תשובות".'}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-4">
        {TRAITS.map((t) => (
          <TacticPhotoCard
            key={t.id}
            tactic={t}
            occupant={TRAITS.find((v) => placement[v.id] === t.id) ?? null}
            current={current}
            submitted={submitted}
            onPlace={place}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-fg-muted">
          {!submitted && allPlaced && 'הכל מוכן — לחצו לבדיקה'}
          {submitted && (
            <span className={cn('font-display font-bold', correctCount === TRAITS.length ? 'text-status-ok' : 'text-fg')}>
              ציון: {correctCount}/{TRAITS.length} {correctCount === TRAITS.length && '· מצוין!'}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {!submitted && (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              disabled={!allPlaced}
              className={cn('btn-primary', !allPlaced && 'opacity-45 cursor-not-allowed hover:brightness-100 active:translate-y-0')}
            >
              בדוק תשובות
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="btn-secondary"
          >
            איפוס
          </button>
        </div>
      </div>
    </div>
  );
}

/* Photo-card tactic target: click-only (no drag). A click either (a) places
   the current pending report into an empty card, or (b) un-places an
   already-occupied card's report back into the pool — same swap semantics
   the old drag/drop bins had, just without the drag half. Photos are the
   real-world TOPIC01-ASYM-TACTIC-*.png assets generated for this exercise,
   one per TRAITS id. */
function TacticPhotoCard({
  tactic,
  occupant,
  current,
  submitted,
  onPlace,
}: {
  tactic: Tactic;
  occupant: Tactic | null;
  current: Tactic | null;
  submitted: boolean;
  onPlace: (vignetteId: string, binId: string | null) => void;
}) {
  const isCorrect = submitted && occupant?.id === tactic.id;
  const isWrong = submitted && occupant != null && occupant.id !== tactic.id;
  const clickable = !submitted && (occupant != null || current != null);

  return (
    <motion.button
      type="button"
      disabled={!clickable}
      whileTap={clickable ? { scale: 0.97 } : undefined}
      onClick={() => {
        if (submitted) return;
        if (occupant) {
          onPlace(occupant.id, null);
          return;
        }
        if (current) onPlace(current.id, tactic.id);
      }}
      className={cn(
        // No max-w cap: the section itself is already bounded by max-w-lesson,
        // so letting basis alone drive width keeps this reliably 3-per-row
        // at sm+ (wrapping the last 2, centered) instead of a stray 4th
        // card sneaking onto row 1 once a fixed cap makes cards narrow
        // enough to fit four across.
        'basis-[47%] sm:basis-[31%] text-start rounded-2xl border bg-bg-elevated overflow-hidden flex flex-col transition-all duration-300 ease-snap',
        submitted
          ? isCorrect
            ? 'border-status-ok/50 bg-status-ok/10'
            : isWrong
              ? 'border-status-danger/50 bg-status-danger/10'
              : 'border-border'
          : occupant
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-brand/30 hover:bg-brand/[0.03]',
        !clickable && !occupant && 'opacity-45 cursor-not-allowed',
      )}
    >
      <div className="relative h-28 sm:h-32 shrink-0 bg-bg-accent">
        <IsometricAsset
          assetId={`TOPIC01-ASYM-TACTIC-${tactic.id.toUpperCase()}`}
          src={`/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-TACTIC-${tactic.id.toUpperCase()}.png`}
          alt=""
          aspect="1/1"
          fit="cover"
          compactPlaceholder
          className="absolute inset-0 size-full [aspect-ratio:auto]"
        />
        {submitted && occupant && (
          <span
            className={cn(
              'absolute top-2 start-2 inline-flex items-center justify-center size-5 rounded-full text-xs font-bold leading-none',
              isCorrect ? 'bg-status-ok text-bg-elevated' : 'bg-status-danger text-bg-elevated',
            )}
          >
            {isCorrect ? '✓' : '✗'}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1.5">
        <div className="font-display font-bold leading-tight text-black text-lg md:text-xl text-center text-balance">
          {tactic.title}
        </div>

        {occupant && (
          <div className="pt-1.5 mt-0.5 border-t border-border-subtle space-y-1">
            {submitted && isCorrect && (
              <div className="text-sm font-display font-semibold tracking-wider text-status-ok text-center">
                התאמה נכונה
              </div>
            )}
            <p className="text-sm text-fg-muted leading-snug text-center">
              {submitted ? occupant.desc : occupant.reportSummary}
            </p>
          </div>
        )}
      </div>
    </motion.button>
  );
}

/* ────────────────────────── DRAG EXERCISE UI ──────────────────────── */

function DragExercise({
  placement,
  selectedOrg,
  submitted,
  allPlaced,
  correctCount,
  onSelect,
  onMove,
  onSubmit,
  onReset,
}: {
  placement: Record<string, ActorType | null>;
  selectedOrg: string | null;
  submitted: boolean;
  allPlaced: boolean;
  correctCount: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, bucket: ActorType | null) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  const pool = ORGS.filter((o) => placement[o.id] == null);

  return (
    <div className="mt-12">
      <div className="mb-5">
        <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl text-balance">
          לאיזה סוג שייך כל ארגון?
        </h3>
        <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
        <p className="mt-2 text-base leading-relaxed text-fg-muted text-pretty">
          גרור את כל 9 הארגונים לקטגוריה הנכונה. אחרי שתשבץ את כולם, לחץ "בדוק תשובות" — וקבל הסבר אם טעית.
        </p>
      </div>

      <div className="surface-elevated p-5 sm:p-6 mb-4">
        <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
          ארגונים לסיווג ({pool.length})
        </div>
        {pool.length === 0 ? (
          <div className="text-center text-sm text-fg-muted py-4">
            שיבצת את כל הארגונים. {submitted ? 'בדוק את התוצאה למטה.' : 'לחץ "בדוק תשובות".'}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pool.map((o) => (
              <OrgChip
                key={o.id}
                org={o}
                state="pool"
                isSelected={selectedOrg === o.id}
                onSelect={() => onSelect(selectedOrg === o.id ? null : o.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {ACTORS_LIST.map((a) => (
          <CategoryBin
            key={a.id}
            actor={a}
            orgsHere={ORGS.filter((o) => placement[o.id] === a.id)}
            selectedOrg={selectedOrg}
            submitted={submitted}
            onSelect={onSelect}
            onMoveOrg={onMove}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-fg-muted">
          {!submitted && allPlaced && 'הכל מוכן — לחץ לבדיקה'}
          {submitted && (
            <span className={cn('font-display font-bold', correctCount === ORGS.length ? 'text-status-ok' : 'text-fg')}>
              ציון: {correctCount}/{ORGS.length} {correctCount === ORGS.length && '· מצוין!'}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {!submitted && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!allPlaced}
              className={cn('btn-primary', !allPlaced && 'opacity-45 cursor-not-allowed hover:brightness-100 active:translate-y-0')}
            >
              בדוק תשובות
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="btn-secondary"
          >
            איפוס
          </button>
        </div>
      </div>
    </div>
  );
}

/* Pill-shaped chip, per reference `lesson1part5image6.png`: rounded-full,
   a drag-grip glyph at inline-start (pool state only — matches the
   reference, which shows no grip once a chip has already been sorted into
   a bin), org label + subtitle stacked inside. Visual restyle only — no
   copy changed, both `label` and `subtitle` still render verbatim. */
function OrgChip({
  org,
  state,
  isSelected,
  isCorrect,
  isWrong,
  onSelect,
  submitted,
  compact,
}: {
  org: Org;
  state: 'pool' | 'bin';
  isSelected?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  submitted?: boolean;
  compact?: boolean;
  onSelect?: () => void;
}) {
  const draggable = !submitted;
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData('text/org', org.id);
        e.dataTransfer.effectAllowed = 'move';

        // Custom drag image: the browser's automatic snapshot of this pill
        // includes the focus/outline box around it, so the drag ghost reads
        // as a rectangle with the pill drawn inside it. Render a clean,
        // outline-free clone instead so only the pill shape is visible.
        const source = e.currentTarget;
        const rect = source.getBoundingClientRect();
        const clone = source.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.margin = '0';
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.overflow = 'hidden';
        clone.style.outline = 'none';
        clone.style.boxShadow = 'none';
        clone.style.pointerEvents = 'none';
        document.body.appendChild(clone);
        e.dataTransfer.setDragImage(clone, e.clientX - rect.left, e.clientY - rect.top);
        requestAnimationFrame(() => {
          document.body.removeChild(clone);
        });
      }}
      onClick={onSelect}
      className={cn(
        'group inline-flex items-center gap-2 text-start transition-all duration-300 ease-snap border rounded-full bg-bg-elevated',
        compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2',
        submitted && isCorrect && 'border-status-ok/50 bg-status-ok/10',
        submitted && isWrong && 'border-status-danger/50 bg-status-danger/10',
        !submitted && isSelected && state === 'pool' && 'border-accent bg-accent/10 ring-2 ring-accent/40',
        !submitted && !isSelected && 'border-border hover:border-brand/30 hover:bg-brand/[0.03]',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      {submitted ? (
        <span
          className={cn(
            'shrink-0 inline-flex items-center justify-center size-4 rounded-full text-xs font-bold leading-none',
            isCorrect ? 'bg-status-ok/10 text-status-ok' : 'bg-status-danger/10 text-status-danger',
          )}
        >
          {isCorrect ? '✓' : '✗'}
        </span>
      ) : (
        state === 'pool' && <Icon name="grip" size={14} className="shrink-0 text-fg-dim" />
      )}
      <span className="min-w-0">
        <span className={cn('block font-display font-semibold leading-tight', compact ? 'text-xs' : 'text-sm', 'text-fg')}>
          {org.label}
        </span>
        <span className="block text-xs font-display font-semibold tracking-wider text-fg-muted mt-0.5 leading-tight">
          {org.subtitle}
        </span>
      </span>
    </button>
  );
}

/* Photo-topped bin, per reference `lesson1part5image6.png`: the actor's
   `*-BIN.png` establishing shot fills the top of the card with the actor
   label overlaid (scrim + short accent rule, matching this file's existing
   scrim-caption pattern in `ActorTypologySelector`'s photo column), then a
   dashed drop-zone below with a circular "+" and "גרור לכאן" — same existing
   copy as before, just restyled. Card radius reuses `rounded-2xl`, the same
   token this file's own `PillarDecisionCard` already uses for its
   photo-topped cards (see design/docs/assumptions.md), rather than the
   reference's own (unrelated app's) corner scale. */
function CategoryBin({
  actor,
  orgsHere,
  selectedOrg,
  submitted,
  onSelect,
  onMoveOrg,
}: {
  actor: ActorMeta;
  orgsHere: Org[];
  selectedOrg: string | null;
  submitted: boolean;
  onSelect: (id: string | null) => void;
  onMoveOrg: (id: string, bucket: ActorType) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/org');
        if (id) onMoveOrg(id, actor.id);
        setIsOver(false);
      }}
      onClick={() => {
        if (selectedOrg) onMoveOrg(selectedOrg, actor.id);
      }}
      animate={{ scale: isOver ? 1.01 : 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="surface overflow-hidden transition-all duration-300 ease-snap flex flex-col"
    >
      <div className="relative">
        <IsometricAsset
          assetId={`TOPIC01-ASYM-ACTOR-${actor.id.toUpperCase()}-BIN`}
          src={`/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-ACTOR-${actor.id.toUpperCase()}-BIN.png`}
          alt=""
          aspect="16/9"
          fit="cover"
          compactPlaceholder
          prompt={ACTOR_BIN_PROMPT[actor.id]}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b from-bg-elevated/85 via-bg-elevated/25 to-transparent"
        />
        <div className="absolute inset-x-0 top-0 p-3 sm:p-4">
          <div className="font-display font-bold leading-tight text-black text-lg md:text-xl text-pretty">
            {actor.label}
          </div>
          <div aria-hidden className="mt-1.5 h-0.5 w-8 rounded-full bg-fg/70" />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2">
        <div
          className={cn(
            'min-h-[104px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 p-3 transition-all duration-200 ease-snap',
            isOver ? 'border-accent bg-accent/20' : selectedOrg ? 'border-accent bg-accent/10' : 'border-accent/60 bg-paper-card/90',
          )}
        >
          {orgsHere.length === 0 ? (
            <>
              <span
                aria-hidden
                className={cn(
                  'inline-flex items-center justify-center size-9 rounded-full transition-all duration-200 ease-snap',
                  isOver ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
                )}
              >
                <Icon name="plus" size={18} />
              </span>
              <span className="text-sm font-display font-semibold text-fg">
                {isOver ? 'שחרר כאן' : 'גרור לכאן'}
              </span>
            </>
          ) : (
            <AnimatePresence initial={false}>
              <div className="flex flex-wrap justify-center gap-1.5 w-full">
                {orgsHere.map((o) => {
                  const isCorrect = submitted && o.correct === actor.id;
                  const isWrong = submitted && o.correct !== actor.id;
                  return (
                    <motion.div
                      key={o.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                    >
                      <OrgChip
                        org={o}
                        state="bin"
                        isCorrect={isCorrect}
                        isWrong={isWrong}
                        submitted={submitted}
                        compact
                        onSelect={() => {
                          if (submitted) return;
                          onSelect(o.id);
                        }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Per-org feedback on wrong placements */}
        {submitted && orgsHere.some((o) => o.correct !== actor.id) && (
          <div className="pt-2 border-t border-border-subtle space-y-1.5">
            {orgsHere
              .filter((o) => o.correct !== actor.id)
              .map((o) => (
                <div key={o.id} className="text-sm text-fg-muted leading-snug">
                  <strong className="text-status-danger">{o.label}</strong>{' '}
                  <span className="text-fg-muted">← {ACTORS[o.correct].label}.</span>{' '}
                  <span className="text-fg-muted">{o.hint}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
