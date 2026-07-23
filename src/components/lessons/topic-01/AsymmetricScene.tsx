'use client';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
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
type Tactic = { id: string; title: string; icon: IconName; vignette: string; desc: string };

const TRAITS: Tactic[] = [
  {
    id: 'conceal',
    title: 'הסתרה והסוואה',
    icon: 'mask',
    vignette: 'לוחם לא לובש מדים, לא נוסע בשיירת רכבים מאורגנת, ולא יוצא מבסיס קבוע — הוא נראה בדיוק כמו אזרח רגיל ברחוב.',
    desc:
      'החוק הראשון הוא לא לבלוט. אין מדים, אין שיירות ג\'יפים מאורגנות ואין בסיסים מסודרים. הלוחמים מתלבשים כמו אזרחים רגילים ונבלעים בסביבה. למה? כי הם מבינים שברגע שמטוס קרב או רחפן מזהה אותם – ייקח בדיוק 10 שניות להשמיד אותם.',
  },
  {
    id: 'embed',
    title: 'להתערבב עם אזרחים',
    icon: 'people',
    vignette: 'משגר טילים חונה בחצר בית ספר; חדר הפיקוד ממוקם קומה מתחת למחלקת ילדים בבית חולים.',
    desc:
      'במקום שדה קרב פתוח, הם ממקמים מפקדות ומשגרי טילים בתוך בתי חולים, בתי ספר ושכונות מגורים צפופות. זה תוקע את הצבא הסדיר בדילמה אכזרית: לתקוף ולחטוף אש מהעולם על פגיעה בחפים מפשע, או לוותר על חיסול המטרה ולתת להם לברוח?',
  },
  {
    id: 'silence',
    title: 'להיות "שקטים" טכנולוגית',
    icon: 'satellite',
    vignette: 'הלוחמים אספו את כל הסמארטפונים לפני היציאה למשימה, ומעבירים הוראות בפתק נייר ביד שליח.',
    desc:
      'איך מתחבאים מצבא שקולט כל שיחת טלפון ורואה הכל מהחלל? יורדים מהרדאר. עוזבים את הסמארטפונים ועוברים להעביר פתקים מנייר דרך שליחים. נמנעים מנסיעה ברכבים שפולטים חום שלוויינים יכולים לקלוט. אי אפשר לעשות מתקפת סייבר על פתק נייר.',
  },
  {
    id: 'cheap',
    title: 'לפגוע בזול בנשק יקר',
    icon: 'box',
    vignette: 'רחפן צעצוע שנקנה ברשת ב-300 דולר, עם רימון מאולתר מחובר לגחון, משבית טנק בשווי 5 מיליון דולר.',
    desc:
      'מתמטיקה פשוטה: למה לפתח תעשיית נשק אם אפשר לקנות רחפן צעצוע ב-300 דולר, לחבר לו רימון, ולשתק טנק טכנולוגי שעולה 5 מיליון דולר? האסטרטגיה היא כלכלית — להכריח את הצבא הסדיר לבזבז הון וטילי יירוט יקרים על איומים שעולים גרושים.',
  },
  {
    id: 'optics',
    title: 'דעת הקהל היא שדה הקרב האמיתי',
    icon: 'megaphone',
    vignette: 'תוך דקות מההפצצה, סרטון של הריסות ופצועים כבר עולה לרשתות החברתיות ומופץ ברחבי העולם.',
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
    <section id="scene-asymmetric" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.3"
        eyebrow="לחימה אסימטרית"
        title={
          <>
           צבא סדיר, טרור וגרילה —<br />
           <span className="gradient-text">שלושה שחקנים, שלוש לוגיקות שונות</span>
          </>
        }
        intro={`פעם, מלחמות היו פשוטות: צבא מול צבא. היום זה לא תמיד ככה. צבא רגיל של מדינה נפגש עם ארגוני גרילה (שיש להם שטח ושליטה) ועם ארגוני טרור (רשת תאים מפוזרת בלי שטח). שלושת השחקנים פועלים בלוגיקה שונה לגמרי — חוקי המלחמה משתנים בכל אחת מהזירות.`}
      />

      {/* Hero illustration — sits on a bg-warm "platform" band per
          docs/palette.md's illustration-base role. */}
      <div className="-mt-10 rounded-[4px] bg-warm/50 p-2 sm:p-3 mb-8">
        <IsometricAsset
          assetId="TOPIC01-ASYM-HERO"
          src="/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-HERO.png"
          alt="איור איזומטרי: הר גדול מול אוהלים מפוזרים, מסמל את האסימטריה בין צבא גדול לשחקן קטן"
          aspect="16/9"
          position="top"
          className="rounded-[3px]"
          prompt="Isometric papercut illustration on a warm cream background (#FFFBF7). A large layered-paper fortress/mountain shape in sage green tones (#749C75 base, #5B7C5C shadow) sits on a warm peach platform (#FFDCB5), facing a scattered cluster of many small paper tent shapes in the same sage palette, connected by a thin dashed orange line (#EB9E48) between them. Flat layered-paper shading, soft edges, no text, no human figures, no weapons, no flags or insignia, generous empty cream space around the scene for text overlay."
        />
      </div>

      {/* 3-actor typology cards — neutral, label-only.
          Each actor is still its own card (motion.div, border, shadow,
          fade-in-on-scroll) — but on desktop the three cards subgrid their
          internal rows off a shared 7-row parent grid, so the divider under
          the intro line and each dt/dd pair auto-size to the tallest cell
          and land at the same height in every card. Mobile drops the
          subgrid (row alignment is moot in a single column) below. */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 mb-6" style={{ gridTemplateRows: 'repeat(7, auto)' }}>
        {ACTORS_LIST.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="grid surface-elevated rounded-[4px] p-6 border border-border"
            style={{ gridTemplateRows: 'subgrid', gridRow: '1 / span 7' }}
          >
            <div style={{ gridRow: 1 }}>
              <div className="font-display font-bold text-lg leading-tight text-fg">{a.label}</div>
              <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim mt-0.5">
                {a.shortDesc}
              </div>
            </div>
            <p className="text-sm text-fg leading-relaxed text-pretty self-start pt-3" style={{ gridRow: 2 }}>
              {a.oneLiner}
            </p>
            <div className="border-t border-border-subtle self-end mt-4" style={{ gridRow: 3 }} />
            {ACTOR_FIELD_ROWS.map((field, ri) => (
              <div
                key={field.key}
                className={cn('text-xs self-start', ri === 0 && 'pt-3')}
                style={{ gridRow: 4 + ri }}
              >
                <dt className="font-display font-semibold tracking-wider mb-0.5 text-fg-muted">{field.label}</dt>
                <dd className="text-fg leading-relaxed">{a[field.key]}</dd>
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      {/* Mobile fallback — simple per-actor stack, no cross-column alignment needed */}
      <div className="grid md:hidden gap-4 mb-6">
        {ACTORS_LIST.map((a) => (
          <div key={a.id} className="surface-elevated rounded-[4px] p-6 flex flex-col border border-border">
            <div className="mb-3">
              <div className="font-display font-bold text-lg leading-tight text-fg">{a.label}</div>
              <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim mt-0.5">
                {a.shortDesc}
              </div>
            </div>
            <p className="text-sm text-fg leading-relaxed text-pretty mb-4">{a.oneLiner}</p>
            <dl className="text-xs space-y-2.5 pt-3 border-t border-border-subtle mt-auto">
              {ACTOR_FIELD_ROWS.map((field) => (
                <div key={field.key}>
                  <dt className="font-display font-semibold tracking-wider mb-0.5 text-fg-muted">{field.label}</dt>
                  <dd className="text-fg leading-relaxed">{a[field.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <TypologyTable />

      <PillarSimulator />

      <TimeAsymmetry />

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
        className="surface-elevated p-5 sm:p-6 mt-8"
      >
        <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-center">
          <div>
            <div className="text-xl sm:text-2xl font-display font-extrabold text-fg mb-1.5 tracking-wide">
              המסקנה: זורקים את ספר החוקים הישן לפח
            </div>
            <p className="text-fg leading-relaxed text-pretty">
              צבא מסורתי התאמן במשך שנים להילחם "ראש בראש": חזית מול חזית, מדים מול מדים. אבל כשאתה נלחם בארגון גרילה שנעלם מתחת לאדמה — או ברשת טרור שתוקפת אזרחים בכל מקום בעולם — כל החוקים הישנים קורסים. כדי לנצח כאוס כזה, אי אפשר רק לשלוח עוד טנקים. הצבא הסדיר חייב לשנות דיסקט, להמציא טכנולוגיות חדשות, ולאסוף מודיעין מסוג אחר לגמרי. את הכלים האלה בדיוק נלמד בשיעורים הבאים.
            </p>
          </div>
          <IsometricAsset
            assetId="TOPIC01-ASYM-CLOSING"
            src="/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-CLOSING.png"
            alt="איור איזומטרי: חיילים וטנק ליד פח אשפה שספר חוקים ישן נזרק לתוכו, מול עיר עם מנהרות, כטב&quot;מ ועמדת ניטור"
            aspect="1/1"
            fit="contain"
            className="rounded-[3px] w-[150px] sm:w-[180px] shrink-0 bg-bg-elevated"
            prompt="An isometric papercut illustration of a simple layered-paper balance scale on a cream background (#FFFBF7), resting on a warm peach base (#FFDCB5). One arm holds a large sage-green paper block (#749C75) tipping down, the other arm holds one small paper dot rendered in orange (#EB9E48) staying level and steady. Flat paper-cut shading, minimal composition, generous empty cream space, no text, no people, no weapons."
          />
        </div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────── 3-COL COMPARISON TABLE ─────────────────────── */
/* Guess-before-reveal: each row starts as a riddle. The learner picks which
   actor it describes, then the full row (all 3 columns) reveals with the
   guess marked right/wrong. A "reveal without guessing" escape hatch stays
   available per-row and for the whole table. */

function TypologyTable() {
  const [answers, setAnswers] = useState<Record<number, ActorType | undefined>>({});

  const guess = (rowIndex: number, choice: ActorType) => {
    setAnswers((prev) => ({ ...prev, [rowIndex]: choice }));
  };

  return (
    <div className="surface-elevated overflow-hidden rounded-[4px]">
      <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] border-b border-border-strong">
        <div className="p-4 bg-bg-accent/40">
          <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">השוואה</div>
        </div>
        {ACTORS_LIST.map((a) => (
          <div key={a.id} className="p-4 border-r border-border-strong bg-bg-accent/20">
            <div className="font-display font-bold text-sm leading-tight text-fg">{a.label}</div>
            <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim mt-1 leading-tight">
              {a.shortDesc}
            </div>
          </div>
        ))}
      </div>

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
            className={cn(
              'border-b border-border-subtle last:border-b-0',
              i % 2 === 0 ? 'bg-bg-card/40' : 'bg-transparent',
            )}
          >
            {!revealed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-[1.1fr_1fr_1fr_1fr]"
              >
                <div className="p-4 bg-bg-accent/30 flex items-center">
                  <div className="text-sm font-medium">{row.label}</div>
                </div>
                <div className="col-span-3 p-4 border-r border-border-subtle">
                  <p className="text-sm text-fg leading-relaxed text-pretty mb-3">{row.riddle}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ACTORS_LIST.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => guess(i, a.id)}
                        className="px-2 py-2 rounded-md border border-border bg-bg-elevated text-xs sm:text-sm font-display font-semibold text-fg hover:border-fg-muted hover:bg-bg-accent transition-colors"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-[1.1fr_1fr_1fr_1fr]"
              >
                <div className="p-4 bg-bg-accent/30 flex items-center gap-2">
                  <div className="text-sm font-medium">{row.label}</div>
                  <span
                    className={cn(
                      'shrink-0 inline-flex items-center justify-center size-4 rounded-full text-[10px] font-bold leading-none',
                      state === row.answer
                        ? 'bg-status-ok/15 text-status-ok'
                        : 'bg-status-danger/15 text-status-danger',
                    )}
                  >
                    {state === row.answer ? '✓' : '✗'}
                  </span>
                </div>
                {ACTORS_LIST.map((a) => {
                  const isAnswer = a.id === row.answer;
                  const isWrongGuess = state === a.id && !isAnswer;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'p-4 border-r border-border-subtle text-sm text-fg leading-snug',
                        isAnswer && 'bg-status-ok/10',
                        isWrongGuess && 'bg-status-danger/10',
                      )}
                    >
                      {row[a.id]}
                    </div>
                  );
                })}
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
    <div className="my-12">
      <div className="rounded-[4px] bg-warm/50 p-2 sm:p-2.5 mb-5 max-w-2xl mx-auto">
        <IsometricAsset
          assetId="TOPIC01-ASYM-PILLARS"
          src="/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-PILLARS.png"
          alt="שלושה איורים איזומטריים קטנים: דמות יציבה, חץ מתעקל סביב קיר, שעון חול"
          aspect="21/9"
          className="rounded-[3px]"
          prompt="Three small isometric papercut vignettes side by side on a cream background (#FFFBF7), each sitting on its own small warm peach platform (#FFDCB5): (1) a single sage-green paper figure standing still and grounded, (2) a sage-green paper arrow curving around a low wall toward a distant skyline silhouette, (3) a paper hourglass with a thin orange (#EB9E48) accent line at its narrow waist. Flat layered-paper style, soft shading, no realistic people, no weapons, no text."
        />
      </div>

      <div className="mb-5 text-center">
        <h3 className="font-display font-bold text-xl leading-tight mb-1">
          שלושה עמודי האסטרטגיה של השחקן הלא-סדיר
        </h3>
        <p className="text-fg-muted text-sm">
          אתם מפקדים על ארגון לא-סדיר מול צבא גדול פי 100 מכם. בכל אחד משלושת רגעי ההחלטה — בחרו מה הייתם עושים.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
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
            className="rounded-[3px] border border-border bg-bg-accent/30 p-5 mt-4"
          >
            <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider">התובנה</div>
            <p className="text-sm text-fg leading-relaxed text-pretty">
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
      className="surface text-right p-5 sm:p-6 relative overflow-hidden flex flex-col"
    >
      <div className="mb-3">
        <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">
          עמוד {index + 1}
        </div>
        {solved && (
          <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance">{pillar.label}</h4>
        )}
      </div>

      {!solved ? (
        <div className="flex-1 flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-fg-muted">{decision.prompt}</p>
          <div className="flex flex-col gap-2 mt-auto">
            {decision.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className={cn(
                  'text-right p-3 rounded-[3px] border text-sm transition-colors',
                  lastChoice?.id === c.id && lastChoice.outcome === 'wrong'
                    ? 'border-status-danger/50 bg-status-danger/5'
                    : 'border-border bg-bg-elevated hover:border-fg-muted',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {lastChoice && lastChoice.outcome === 'wrong' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-status-danger leading-snug overflow-hidden"
              >
                {lastChoice.feedback} נסו שוב.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1">
          <p className="text-xs text-status-ok font-display font-semibold mb-2">{lastChoice?.feedback}</p>
          <p className="text-sm leading-relaxed text-fg-muted mb-3">{pillar.oneLiner}</p>
          <p className="text-sm leading-relaxed text-fg pt-3 border-t border-border-subtle">{pillar.detail}</p>
        </div>
      )}
    </motion.div>
  );
}

/* ───────────────────────── TIME ASYMMETRY ─────────────────────────── */
/* Interactive "sand clock": a scrubbable timeline turns the static 5-vs-1
   front table into a causal simulation — each internal front of the
   regular army breaks at its own point in time, while the non-state
   actor's single front never changes. */

/** Reusable style suffix for the Magnific icon-generation prompts below —
 * intentionally NOT the papercut-isometric illustration language used
 * elsewhere in this file; these render as plain flat UI icons. */
const ICON_PROMPT_STYLE =
  'flat modern vector icon, simple bold black outline with solid black fill on transparent background, monochrome black and white, minimal geometric shapes, centered, no text, no shadow, no gradient, no color, no 3D or isometric or papercut styling, clean UI icon like Lucide or Phosphor icon sets, 128x128px';

const FRONTLINE: { title: string; desc: string; iconAssetId: string; iconPrompt: string } = {
  title: 'האויב בשטח',
  desc: 'לוחמי גרילה או מחבלים — היריב הצבאי המוצהר.',
  iconAssetId: 'TOPIC01-ASYM-ICON-FRONTLINE',
  iconPrompt: `A crosshair / target reticle icon, ${ICON_PROMPT_STYLE}`,
};

const TIME_STEPS: { id: string; label: string; caption: string }[] = [
  {
    id: 'day1',
    label: 'יום 1',
    caption: 'הלחימה רק התחילה. מבחוץ זה עוד נראה כמו "מלחמה פשוטה, צבא מול צבא" — רק חזית אחת פעילה משני הצדדים.',
  },
  {
    id: 'week2',
    label: 'שבוע 2',
    caption: 'משרד האוצר מתחיל ללחוץ — המלחמה כבר עולה מיליארדי דולרים בשבוע, והמילואים נשחקים.',
  },
  {
    id: 'month3',
    label: 'חודש 3',
    caption: 'דעת הקהל נשחקת — תמונות מהזירה ולוויות חיילים משפיעות על התמיכה הציבורית מיום ליום.',
  },
  {
    id: 'year1',
    label: 'שנה 1',
    caption: 'הפוליטיקה הפנימית מתעוררת — ועדות חקירה, אופוזיציה, ולחץ קואליציוני מבית.',
  },
  {
    id: 'year2',
    label: 'שנה 2',
    caption: 'הבמה הבינלאומית דורשת הפסקת אש — לחץ מהאו"ם, מבעלות ברית, ואיום בסנקציות.',
  },
];

const INTERNAL_FRONTS: { title: string; desc: string; breaksAt: number; iconAssetId: string; iconPrompt: string }[] = [
  {
    title: 'משרד האוצר',
    desc: 'תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים, פגיעה בעורף.',
    breaksAt: 1,
    iconAssetId: 'TOPIC01-ASYM-ICON-TREASURY',
    iconPrompt: `A stack of coins with a small downward arrow icon (shrinking budget / treasury), ${ICON_PROMPT_STYLE}`,
  },
  {
    title: 'דעת הקהל',
    desc: 'תמונות מהזירה, לוויות חיילים, תמיכה ציבורית שנשחקת מיום ליום.',
    breaksAt: 2,
    iconAssetId: 'TOPIC01-ASYM-ICON-PUBLIC-OPINION',
    iconPrompt: `A megaphone icon (public opinion / protest), ${ICON_PROMPT_STYLE}`,
  },
  {
    title: 'הפוליטיקה הפנימית',
    desc: 'הכנסת, הקונגרס, אופוזיציה, ועדות חקירה, שעון הבחירות.',
    breaksAt: 3,
    iconAssetId: 'TOPIC01-ASYM-ICON-POLITICS',
    iconPrompt: `A government building / parliament icon with columns and a triangular roof, ${ICON_PROMPT_STYLE}`,
  },
  {
    title: 'הבמה הבינלאומית',
    desc: 'או"ם, בעלות ברית, האג, סנקציות — כולם דורשים "הפסקת אש מיד".',
    breaksAt: 4,
    iconAssetId: 'TOPIC01-ASYM-ICON-INTERNATIONAL',
    iconPrompt: `A globe icon with latitude/longitude grid lines (international stage / diplomacy), ${ICON_PROMPT_STYLE}`,
  },
];

function TimeAsymmetry() {
  const [step, setStep] = useState(0);
  const lastStep = TIME_STEPS.length - 1;

  const regularCount = 1 + INTERNAL_FRONTS.filter((f) => f.breaksAt <= step).length;
  const nonStateCount = 1;

  return (
    <div className="my-12">
      <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center mb-5">
        <div className="rounded-[4px] bg-warm/50 p-2 shrink-0 mx-auto sm:mx-0">
          <IsometricAsset
            assetId="TOPIC01-ASYM-CLOCK"
            src="/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-CLOCK.png"
            alt="איור איזומטרי: שעון חול שראשו העליון בצורת בניין ממשל וראשו התחתון בצורת אוהל"
            aspect="1/1"
            className="rounded-[3px] w-[140px] sm:w-[160px]"
            prompt="An isometric papercut hourglass illustration on a cream background (#FFFBF7), resting on a small warm peach base (#FFDCB5). Top chamber shaped like a tiny layered government-building dome in sage green (#749C75/#5B7C5C), bottom chamber shaped like a simple paper tent in the same sage tones, with a single thin orange (#EB9E48) trickle of small paper dots flowing from top to bottom. Flat paper-cut shading, centered composition, no text, no people."
          />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl leading-tight mb-1">
            למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?
          </h3>
          <p className="text-fg-muted text-sm">
            גררו את ציר הזמן קדימה וראו איך המעצמה נכנסת בהדרגה ל-5 חזיתות בו-זמנית — בזמן שהגרילה והטרור נשארים בחזית אחת בלבד לכל אורך הדרך.
          </p>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className="surface-elevated p-5 sm:p-6 pt-10 mb-4">
        <TimelineScrubber step={step} lastStep={lastStep} onChange={setStep} steps={TIME_STEPS} />

        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-sm text-fg leading-relaxed text-pretty text-center mt-8"
          >
            {TIME_STEPS[step].caption}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] border-b border-border-strong">
          <div className="p-3 sm:p-4 bg-bg-accent/40">
            <div className="text-xs font-display font-semibold text-fg-muted tracking-wider">
              מי באמת יכול להכריח אותך לסיים את המלחמה?
            </div>
          </div>
          <div className="px-3 sm:px-4 py-3 bg-bg-accent/20 border-r border-border-strong text-center min-w-[88px]">
            <div className="text-xs font-display font-semibold tracking-wider text-fg">סדיר</div>
          </div>
          <div className="px-3 sm:px-4 py-3 bg-bg-accent/20 border-r border-border-strong text-center min-w-[88px]">
            <div className="text-xs font-display font-semibold tracking-wider text-fg">לא-סדיר</div>
          </div>
        </div>

        <FrontRow
          index={0}
          title={FRONTLINE.title}
          desc={FRONTLINE.desc}
          iconAssetId={FRONTLINE.iconAssetId}
          iconPrompt={FRONTLINE.iconPrompt}
          regularActive
          nonStateActive
        />

        {INTERNAL_FRONTS.map((f, i) => (
          <FrontRow
            key={f.title}
            index={i + 1}
            title={f.title}
            desc={f.desc}
            iconAssetId={f.iconAssetId}
            iconPrompt={f.iconPrompt}
            regularActive={f.breaksAt <= step}
            nonStateActive={false}
          />
        ))}

        <div className="grid grid-cols-[1fr_auto_auto] bg-bg-accent/30 border-t border-border-strong">
          <div className="p-3 sm:p-4">
            <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">סך החזיתות</span>
          </div>
          <div className="px-3 sm:px-4 py-3 border-r border-border-subtle text-center min-w-[88px]">
            <div className="font-display font-bold text-2xl tabular-nums text-fg leading-none">{regularCount}</div>
          </div>
          <div className="px-3 sm:px-4 py-3 border-r border-border-subtle text-center min-w-[88px]">
            <div className="font-display font-bold text-2xl tabular-nums text-fg leading-none">{nonStateCount}</div>
          </div>
        </div>
      </div>

      <div className="surface-elevated p-5 sm:p-6 mt-4">
        <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">התובנה</div>

        <p className="text-sm text-fg leading-relaxed text-pretty">
          זו לא רק שאלה של מספרים — זה הבדל בכללי המשחק. הצבא הסדיר חייב <strong className="text-fg">לנצח בכל אחת</strong> מ-5 החזיתות, כי הפסד באחת מהן מספיק כדי להפיל את כל המלחמה. השחקן הלא-סדיר צריך <strong className="text-fg">רק לא לאבד</strong> את החזית היחידה שלו — וזה כבר מספיק לו לניצחון, בכל שלב בציר הזמן.
          <br /><br />
          המעצמה רואה את עצמה במלחמה אחת — נגד האויב שבשטח. בפועל, היא לוחמת ב-5 חזיתות בו-זמנית, וכל אחת מ-4 הפנימיות יכולה לבדה לסיים את המלחמה. אין לו אוצר שיתרוקן, אין לו ועדת חקירה שתפיל אותו, אין לו או"ם שילחץ. הוא צריך רק לשרוד עוד יום.
          <strong className="text-fg block mt-2">
            ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות.
          </strong>
        </p>
      </div>
    </div>
  );
}

/* Draggable RTL timeline: track runs inline-start (right, step 0) →
   inline-end (left, last step). Handle is pointer-draggable along the
   track and snaps to the nearest step; ticks remain clickable too. */
function TimelineScrubber({
  step,
  lastStep,
  onChange,
  steps,
}: {
  step: number;
  lastStep: number;
  onChange: (i: number) => void;
  steps: { id: string; label: string }[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  // Continuous 0..1 position while the pointer is down, so the handle
  // glides with the cursor instead of hopping tick-to-tick; null once
  // released, at which point `pct` falls back to the snapped step and
  // the spring transition eases it into place.
  const [dragFraction, setDragFraction] = useState<number | null>(null);

  const fractionFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return step / lastStep;
    const rect = el.getBoundingClientRect();
    const pxFraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    // RTL: inline-start (fraction 0) sits at the visual right edge.
    return 1 - pxFraction;
  };

  const handlePointerMove = (clientX: number) => {
    const fraction = fractionFromClientX(clientX);
    setDragFraction(fraction);
    const nextStep = Math.round(fraction * lastStep);
    if (nextStep !== step) onChange(nextStep);
  };

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    handlePointerMove(e.clientX);

    const onMove = (ev: PointerEvent) => handlePointerMove(ev.clientX);
    const onUp = () => {
      setDragging(false);
      setDragFraction(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const pct = (dragging && dragFraction !== null ? dragFraction : step / lastStep) * 100;

  return (
    <div
      ref={trackRef}
      onPointerDown={startDrag}
      className="relative h-9 select-none touch-none cursor-pointer"
    >
      <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-border" />
      <motion.div
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-accent"
        initial={false}
        style={{ insetInlineStart: 0 }}
        animate={{ width: `${pct}%` }}
        transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
      />

      {steps.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(i)}
          aria-current={i === step}
          aria-label={s.label}
          style={{ insetInlineStart: `${(i / lastStep) * 100}%`, translate: '50% -50%' }}
          className="absolute top-1/2 z-10 flex items-center justify-center"
        >
          <span
            className={cn(
              'block rounded-full transition-colors',
              i <= step ? 'size-2.5 bg-accent' : 'size-2.5 bg-border-strong hover:bg-fg-muted',
            )}
          />
        </button>
      ))}

      <motion.div
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={lastStep}
        aria-valuenow={step}
        aria-valuetext={steps[step].label}
        onPointerDown={startDrag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onChange(Math.max(0, step - 1));
          if (e.key === 'ArrowLeft') onChange(Math.min(lastStep, step + 1));
        }}
        initial={false}
        animate={{ insetInlineStart: `${pct}%` }}
        transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
        style={{ translate: '50% -50%' }}
        className="absolute top-1/2 z-20 size-6 -mt-px rounded-full border-2 border-accent bg-bg-elevated shadow-md cursor-grab active:cursor-grabbing"
      />

      <div className="absolute inset-x-0 top-full mt-2 flex items-center justify-between">
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              'text-[11px] font-display font-semibold tracking-wide whitespace-nowrap',
              i === step ? 'text-accent' : 'text-fg-dim',
            )}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function FrontRow({
  index,
  title,
  desc,
  iconAssetId,
  iconPrompt,
  regularActive,
  nonStateActive,
}: {
  index: number;
  title: string;
  desc: string;
  iconAssetId: string;
  iconPrompt: string;
  regularActive: boolean;
  nonStateActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        'grid grid-cols-[1fr_auto_auto] border-b border-border-subtle last:border-b-0',
        index % 2 === 0 ? 'bg-bg-card/40' : 'bg-transparent',
      )}
    >
      <div className="p-3 sm:p-4 min-w-0 flex items-start gap-2.5">
        <IsometricAsset
          assetId={iconAssetId}
          src={`/assets/lessons/topic01/scene-asymmetric/icons/${iconAssetId}.png`}
          alt=""
          aspect="1/1"
          fit="contain"
          compactPlaceholder
          prompt={iconPrompt}
          className="size-9 shrink-0 mt-0.5 rounded-[3px] bg-transparent"
        />
        <div className="min-w-0">
          <div className="font-display font-semibold text-sm leading-tight">{title}</div>
          <div className="text-xs text-fg-muted leading-snug mt-0.5">{desc}</div>
        </div>
      </div>
      <div className="px-3 sm:px-4 py-3 border-r border-border-subtle flex items-center justify-center min-w-[88px]">
        <FrontMark active={regularActive} />
      </div>
      <div className="px-3 sm:px-4 py-3 border-r border-border-subtle flex items-center justify-center min-w-[88px]">
        <FrontMark active={nonStateActive} />
      </div>
    </motion.div>
  );
}

function FrontMark({ active }: { active: boolean }) {
  return (
    <motion.span
      key={active ? 'on' : 'off'}
      initial={{ scale: active ? 0.6 : 1, opacity: active ? 0.4 : 1 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      className={cn(
        'inline-flex items-center justify-center size-7 rounded-full border text-sm font-display font-bold leading-none',
        active ? 'bg-fg/8 text-fg border-fg/30' : 'bg-bg-accent text-fg-dim border-border-subtle',
      )}
    >
      {active ? '✓' : '—'}
    </motion.span>
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
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const pool = TRAITS.filter((t) => placement[t.id] == null);
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
    setSelected(null);
    setSubmitted(false);
  };

  const reset = () => {
    setPlacement(Object.fromEntries(TRAITS.map((t) => [t.id, null])));
    setSelected(null);
    setSubmitted(false);
  };

  return (
    <div className="my-12">
      <div className="rounded-[4px] border border-border-subtle bg-bg p-4 sm:p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-2">
              חמש טקטיקות של השחקן הלא-סדיר
            </h3>
            <p className="text-fg-muted text-sm sm:text-base leading-relaxed text-pretty">
              לפני שתראו את שם הטקטיקה — קראו כל "דיווח שטח" קצר וגררו (או הקישו עליו ואז על שם הטקטיקה) אותו למקום המתאים. אחרי ששיבצתם את כל החמישה, לחצו "בדוק תשובות" לקבל את ההסבר המלא לכל אחת.
            </p>
          </div>
          <IsometricAsset
            assetId="TOPIC01-ASYM-TACTICS"
            src="/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-TACTICS.png"
            alt="איור איזומטרי: משטח שטח בדמדומים עם עצים קטנים ורחפן קטן מרחף מעל"
            aspect="16/9"
            className="rounded-[3px] h-20 sm:h-28 w-auto shrink-0"
            prompt="Isometric papercut illustration of a small layered terrain tile at dusk on a cream background (#FFFBF7): a warm peach ground platform (#FFDCB5), a few sage-green paper trees (#749C75), a winding paper dirt path, and one small abstract drone-like paper shape with a single orange (#EB9E48) accent light hovering above. No visible weapons, no people, flat paper-cut shading, small and simple composition, no text."
          />
        </div>
      </div>

      <div className="surface-elevated p-4 rounded-[4px] mb-3">
        <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
          דיווחי שטח
        </div>
        {pool.length === 0 ? (
          <div className="text-center text-sm text-fg-muted py-4">
            שיבצתם את כל הדיווחים. {submitted ? 'בדקו את התוצאה למטה.' : 'לחצו "בדוק תשובות".'}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {pool.map((t) => (
              <VignetteChip
                key={t.id}
                tactic={t}
                isSelected={selected === t.id}
                onSelect={() => setSelected(selected === t.id ? null : t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {TRAITS.map((t) => (
          <TacticBin
            key={t.id}
            tactic={t}
            occupant={TRAITS.find((v) => placement[v.id] === t.id) ?? null}
            selected={selected}
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-md font-medium text-sm border border-border text-fg-muted hover:bg-bg-accent transition-colors"
          >
            איפוס
          </button>
          {!submitted && (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              disabled={!allPlaced}
              className={cn(
                'px-4 py-2 rounded-md font-bold text-sm transition-colors',
                allPlaced
                  ? 'bg-fg text-bg-elevated hover:bg-fg-muted'
                  : 'bg-bg-accent text-fg-dim cursor-not-allowed',
              )}
            >
              בדוק תשובות
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VignetteChip({
  tactic,
  isSelected,
  onSelect,
}: {
  tactic: Tactic;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/tactic', tactic.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onSelect}
      className={cn(
        'text-right p-3 rounded-[3px] border transition-all cursor-grab active:cursor-grabbing',
        isSelected ? 'border-fg bg-bg-accent' : 'border-border bg-bg-elevated hover:border-fg-muted',
      )}
    >
      <p className="text-sm leading-relaxed text-fg">{tactic.vignette}</p>
    </button>
  );
}

function TacticBin({
  tactic,
  occupant,
  selected,
  submitted,
  onPlace,
}: {
  tactic: Tactic;
  occupant: Tactic | null;
  selected: string | null;
  submitted: boolean;
  onPlace: (vignetteId: string, binId: string | null) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const isCorrect = submitted && occupant?.id === tactic.id;
  const isWrong = submitted && occupant != null && occupant.id !== tactic.id;

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/tactic');
        if (id) onPlace(id, tactic.id);
        setIsOver(false);
      }}
      onClick={() => {
        if (submitted) return;
        if (occupant) {
          onPlace(occupant.id, null);
          return;
        }
        if (selected) onPlace(selected, tactic.id);
      }}
      animate={{ scale: isOver ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'rounded-[3px] border bg-bg-elevated p-4 flex flex-col gap-2 min-h-[160px] transition-colors',
        isOver
          ? 'border-fg'
          : submitted
            ? isCorrect
              ? 'border-status-ok/50'
              : isWrong
                ? 'border-status-danger/50'
                : 'border-border'
            : 'border-border',
      )}
    >
      <div className="flex items-center gap-1.5">
        {submitted && occupant && (
          <span
            className={cn(
              'shrink-0 inline-flex items-center justify-center size-4 rounded-full text-[10px] font-bold leading-none',
              isCorrect ? 'bg-status-ok/15 text-status-ok' : 'bg-status-danger/15 text-status-danger',
            )}
          >
            {isCorrect ? '✓' : '✗'}
          </span>
        )}
        <div className="font-display font-bold text-sm leading-tight text-fg">{tactic.title}</div>
      </div>

      {occupant ? (
        <div className="flex-1 min-w-0">
          {submitted ? (
            <div className="space-y-1">
              {isCorrect && (
                <div className="text-[11px] font-display font-bold tracking-wide text-status-ok">
                  התאמה נכונה
                </div>
              )}
              <p className="text-xs text-fg-muted leading-snug">{occupant.desc}</p>
            </div>
          ) : (
            <div className="text-xs text-fg-muted leading-snug">{occupant.vignette}</div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex-1 min-h-[60px] rounded-[3px] flex items-center justify-center text-xs font-display font-semibold transition-colors',
            isOver ? 'bg-bg-accent text-fg' : selected ? 'bg-bg-accent/40 text-fg-muted' : 'text-fg-dim bg-bg-accent/40',
          )}
        >
          {isOver ? 'שחרר כאן' : selected ? 'הקש לשיבוץ כאן' : 'גרור לכאן'}
        </div>
      )}
    </motion.div>
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
    <div className="my-12">
      <div className="mb-5">
        <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted mb-2">
          תרגול · סווג שחקנים אמיתיים
        </div>
        <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-2">
          לאיזה סוג שייך כל ארגון?
        </h3>
        <p className="text-fg-muted text-sm sm:text-base leading-relaxed text-pretty">
          גרור (או הקש על ארגון ואז על קטגוריה) את כל 9 הארגונים לקטגוריה הנכונה. אחרי שתשבץ את כולם, לחץ "בדוק תשובות" — וקבל הסבר אם טעית.
        </p>
      </div>

      <div className="surface-elevated p-4 rounded-[4px] mb-3">
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

      <div className="grid md:grid-cols-3 gap-3 mb-4">
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
          {!submitted && !allPlaced && `סווגת ${ORGS.length - pool.length} מתוך ${ORGS.length}`}
          {!submitted && allPlaced && 'הכל מוכן — לחץ לבדיקה'}
          {submitted && (
            <span className={cn('font-display font-bold', correctCount === ORGS.length ? 'text-status-ok' : 'text-fg')}>
              ציון: {correctCount}/{ORGS.length} {correctCount === ORGS.length && '· מצוין!'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 rounded-md font-medium text-sm border border-border text-fg-muted hover:bg-bg-accent transition-colors"
          >
            איפוס
          </button>
          {!submitted && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!allPlaced}
              className={cn(
                'px-4 py-2 rounded-md font-bold text-sm transition-colors',
                allPlaced
                  ? 'bg-fg text-bg-elevated hover:bg-fg-muted'
                  : 'bg-bg-accent text-fg-dim cursor-not-allowed',
              )}
            >
              בדוק תשובות
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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
      }}
      onClick={onSelect}
      className={cn(
        'group inline-flex items-center gap-2 text-right transition-all border',
        compact ? 'px-2.5 py-1.5 rounded-md' : 'px-3 py-2 rounded-[3px]',
        submitted && isCorrect && 'border-status-ok/50 bg-status-ok/10',
        submitted && isWrong && 'border-status-danger/50 bg-status-danger/10',
        !submitted && isSelected && state === 'pool' && 'border-fg bg-bg-accent',
        !submitted && !isSelected && state === 'pool' && 'border-border bg-bg-elevated hover:border-fg-muted',
        !submitted && state === 'bin' && 'border-border bg-bg-elevated',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      {submitted && (
        <span
          className={cn(
            'shrink-0 inline-flex items-center justify-center size-4 rounded-full text-[10px] font-bold leading-none',
            isCorrect ? 'bg-status-ok/15 text-status-ok' : 'bg-status-danger/15 text-status-danger',
          )}
        >
          {isCorrect ? '✓' : '✗'}
        </span>
      )}
      <span className="min-w-0">
        <span className={cn('block font-display font-semibold leading-tight', compact ? 'text-xs' : 'text-sm', 'text-fg')}>
          {org.label}
        </span>
        <span className="block text-[10px] font-display font-medium tracking-wide text-fg-dim mt-0.5 leading-tight">
          {org.subtitle}
        </span>
      </span>
    </button>
  );
}

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
      className={cn(
        'rounded-[3px] border bg-bg-elevated p-4 transition-colors flex flex-col gap-3 min-h-[180px]',
        isOver || (selectedOrg && !isOver) ? 'border-fg' : 'border-border',
      )}
    >
      <div>
        <div className="font-display font-bold text-base leading-tight text-fg">{actor.label}</div>
        <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim mt-0.5">
          {orgsHere.length === 0 ? 'ריק · מחכה לסיווג' : `${orgsHere.length} סווגו כאן`}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {orgsHere.length === 0 ? (
          <div
            className={cn(
              'flex-1 min-h-[80px] rounded-[3px] flex items-center justify-center text-sm font-display font-semibold transition-colors',
              isOver ? 'bg-bg-accent text-fg' : selectedOrg ? 'bg-bg-accent/40 text-fg-muted' : 'text-fg-dim bg-bg-accent/40',
            )}
          >
            {isOver ? 'שחרר כאן' : selectedOrg ? 'הקש לסיווג כאן' : 'גרור לכאן'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="flex flex-wrap gap-1.5">
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
              <div key={o.id} className="text-[11px] text-fg leading-snug">
                <strong className="text-status-danger">{o.label}</strong>{' '}
                <span className="text-fg-muted">← {ACTORS[o.correct].label}.</span>{' '}
                <span className="text-fg-muted">{o.hint}</span>
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );
}
