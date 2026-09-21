/**
 * TimePressureContent — נתוני הפעילות "למה הזמן הוא הנשק הסודי של השחקן
 * הלא-סדיר?" (#scene-asymmetric, topic-01, ציר זמן + השוואת חמש חזיתות).
 *
 * כל מחרוזת עברית תחת STATIONS ותחת INSIGHT_PARAGRAPHS הועתקה
 * מילה במילה מהפרומפט שסופק למימוש מחדש של הפעילות (ציר זמן, יום 1 →
 * שנה 2, חמש חזיתות). מודול תוכן בלבד: אין כאן JSX, state או לוגיקת
 * תצוגה — ראו TimePressureExperience.tsx לרכיב עצמו.
 */

export type StationId = 'field' | 'treasury' | 'public' | 'politics' | 'international';

export type Station = {
  id: StationId;
  index: 0 | 1 | 2 | 3 | 4;
  /** תווית תחנה קצרה על ציר הזמן, למשל "יום 1". */
  timeLabel: string;
  /** הטקסט הנרטיבי של התחנה, מוצג כברירת מחדל במשטח המרכזי. */
  stationText: string;
  /** שם החזית כפי שהוא מופיע בטבלה ובכותרת פאנל הפירוט. */
  frontLabel: string;
  /** הפירוט המקורי של החזית, מוצג כשלוחצים על שם חזית פעילה. */
  frontDetail: string;
  image: { assetId: string; src: string; alt: string; prompt: string };
};

const ASSET_BASE_OLD = '/assets/lessons/topic01/scene-asymmetric/time-pressure-timeline';
const ASSET_BASE = '/assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3/states';

/** פרספקטיבת מצלמה טבעית בגובה העיניים, ריאליסטי, אור יום טבעי — דרישת
 * הסגנון של בעל הפרויקט לחמש התמונות האלה (לא איזומטריה/דיוראמה). */
const PHOTO_STYLE =
  'photorealistic photograph, natural eye-level camera perspective, natural daylight, muted stone/sand/olive tones, quiet single-focus composition, no isometric or miniature or tilt-shift styling, no studio background, no burned-in text';

export const STATIONS: Station[] = [
  {
    id: 'field',
    index: 0,
    timeLabel: 'יום 1',
    stationText:
      'הלחימה רק התחילה. מבחוץ זה עוד נראה כמו "מלחמה פשוטה, צבא מול צבא" — רק חזית אחת פעילה משני הצדדים.',
    frontLabel: 'האויב בשטח',
    frontDetail: 'לוחמי גרילה או מחבלים — היריב הצבאי המוצהר.',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-FIELD',
      src: `${ASSET_BASE}/F01-field.jpg`,
      alt: 'עמדת שטח ורכב',
      prompt: `A military field position with a parked armored vehicle at eye level, ${PHOTO_STYLE}`,
    },
  },
  {
    id: 'treasury',
    index: 1,
    timeLabel: 'שבוע 2',
    stationText:
      'משרד האוצר מתחיל ללחוץ — המלחמה כבר עולה מיליארדי דולרים בשבוע, והמילואים נשחקים.',
    frontLabel: 'משרד האוצר',
    frontDetail: 'תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים, פגיעה בעורף.',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-TREASURY',
      src: `${ASSET_BASE}/F02-treasury.jpg`,
      alt: 'משרד תקציב',
      prompt: `A government treasury office interior with budget documents on a desk, ${PHOTO_STYLE}`,
    },
  },
  {
    id: 'public',
    index: 2,
    timeLabel: 'חודש 3',
    stationText:
      'דעת הקהל נשחקת — תמונות מהזירה ולוויות חיילים משפיעות על התמיכה הציבורית מיום ליום.',
    frontLabel: 'דעת הקהל',
    frontDetail: 'תמונות מהזירה, לוויות חיילים, תמיכה ציבורית שנשחקת מיום ליום.',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-PUBLIC',
      src: `${ASSET_BASE}/F03-public.jpg`,
      alt: 'אזרחים צופים בדיווח',
      prompt: `Civilians watching a news broadcast on a television, ${PHOTO_STYLE}`,
    },
  },
  {
    id: 'politics',
    index: 3,
    timeLabel: 'שנה 1',
    stationText: 'הפוליטיקה הפנימית מתעוררת — ועדות חקירה, אופוזיציה, ולחץ קואליציוני מבית.',
    frontLabel: 'הפוליטיקה הפנימית',
    frontDetail: 'הכנסת, הקונגרס, אופוזיציה, ועדות חקירה, שעון הבחירות.',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-POLITICS',
      src: `${ASSET_BASE}/F04-politics.jpg`,
      alt: 'חדר ועדה',
      prompt: `A parliamentary committee hearing room with officials seated at a long table, ${PHOTO_STYLE}`,
    },
  },
  {
    id: 'international',
    index: 4,
    timeLabel: 'שנה 2',
    stationText: 'הבמה הבינלאומית דורשת הפסקת אש — לחץ מהאו"ם, מבעלות ברית, ואיום בסנקציות.',
    frontLabel: 'הבמה הבינלאומית',
    frontDetail: 'או"ם, בעלות ברית, האג, סנקציות — כולם דורשים "הפסקת אש מיד".',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-INTERNATIONAL',
      src: `${ASSET_BASE}/F05-international.jpg`,
      alt: 'שולחן דיון בינלאומי',
      prompt: `An international diplomatic roundtable discussion with delegates and flags, ${PHOTO_STYLE}`,
    },
  },
];

export const TITLE: string = 'למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?';
export const INSTRUCTION: string = 'התקדמו בציר הזמן וגלו איזו חזית נוספת בכל שלב.';
export const SOURCE_QUESTION: string = 'מי באמת יכול להכריח אותך לסיים את המלחמה?';
export const TIMELINE_NOTE: string =
  'ציר הזמן הוא המחשה רעיונית, לא לוח זמנים קבוע לכל מלחמה.';

export const TABLE_HEADER = {
  front: 'חזית',
  regular: 'צבא סדיר',
  irregular: 'שחקן לא־סדיר',
} as const;

export const NOT_IN_MODEL_LABEL: string = 'לא במודל';
export const NOT_YET_ADDED_LABEL: string = 'טרם נוספה';
export const JUST_ADDED_LABEL: string = 'נוספה';

export const UI = {
  prev: 'התחנה הקודמת',
  next: 'התחנה הבאה',
  toggleInsight: 'מה המשמעות?',
  insightHeading: 'ההסבר במודל המוצג',
  backToAdded: 'חזרה לחזית שנוספה',
  viewingPrevious: (frontLabel: string) => `עיון בחזית: ${frontLabel}`,
  regularSummary: (count: number) =>
    count === 1 ? '1 חזית פעילה — צבא סדיר' : `${count} חזיתות פעילות — צבא סדיר`,
  irregularSummary: '1 חזית פעילה — שחקן לא־סדיר',
  summaryTag: 'במודל המוצג',
  liveUpdate: (station: Station, count: number) =>
    `${station.timeLabel}: נוספה חזית ${station.frontLabel}. ${count} מתוך 5 חזיתות פעילות לצבא הסדיר.`,
  // Time-pressure transition question UI
  sandtimerLabel: 'הזמן במודל',
  sandtimerCaption: 'החול ממחיש התקדמות בין התחנות, ולא את זמן המענה שלכם.',
  stopMotion: 'עצרו את תנועת החול',
  resumeMotion: 'הפעילו את תנועת החול',
  skipAnimation: 'דלגו על ההנפשה',
  sequentialProgressNotice: 'מתקדמים תחנה אחת בכל פעם. אפשר לחזור לכל תחנה שכבר ביקרתם בה.',
  resetActivity: 'התחילו את הפעילות מחדש',
};

// Transition Questions — shared header and instruction
export const QUESTION_HEADING: string = 'רגע לפני שמתקדמים';
export const QUESTION_INSTRUCTION: string =
  'בחרו תשובה אחת לפי המודל המוצג. אחרי המשוב תוכלו להמשיך בסרט.';

export type TransitionQuestionOption = {
  id: 'A' | 'B' | 'C';
  label: string;
  correct: boolean;
  feedback: string;
};

export type TransitionQuestion = {
  id: string;
  fromStationId: StationId;
  toStationId: StationId;
  prompt: string;
  options: TransitionQuestionOption[];
  explanation: string;
  continueLabel: string;
};

export const TRANSITION_QUESTIONS: TransitionQuestion[] = [
  {
    id: 'time-pressure-q1-budget',
    fromStationId: 'field',
    toStationId: 'treasury',
    prompt: 'הכוח ממשיך לפעול בשטח, אבל הלחימה מתארכת ודורשת עוד מימון ומילואים. איזה מרכיב צריך להוסיף להערכת היכולת להמשיך?',
    options: [
      {
        id: 'A',
        label: 'מצב האויב בשטח, כי הוא מסכם את מצב המערכה.',
        correct: false,
        feedback:
          'מצב האויב חשוב, אבל הוא אינו מסכם את כל הלחצים במודל. הצורך במימון ובמילואים מוסיף שיקול להמשך הלחימה.',
      },
      {
        id: 'B',
        label: 'יכולת המימון והמשאבים, לצד מצב האויב בשטח.',
        correct: true,
        feedback:
          'נכון. המשך הלחימה דורש משאבים, ולכן משרד האוצר מצטרף במודל כחזית נוספת לצד האויב בשטח.',
      },
      {
        id: 'C',
        label: 'יכולת המימון והמשאבים, במקום מצב האויב בשטח.',
        correct: false,
        feedback: 'זיהיתם את הלחץ החדש, אבל הוא אינו מחליף את האויב. במודל הזה החזיתות מצטברות.',
      },
    ],
    explanation: 'הלחימה נמשכת בשטח, ובמקביל עולה שאלת המשאבים שנדרשים להמשך. בתחנה הבאה תתווסף חזית משרד האוצר.',
    continueLabel: 'המשיכו לשבוע 2',
  },
  {
    id: 'time-pressure-q2-accumulation',
    fromStationId: 'treasury',
    toStationId: 'public',
    prompt:
      'הלחימה וההוצאות נמשכות. בעקבות דיווחים מהזירה, גם התמיכה הציבורית מתחילה להישחק. איך צריך לעדכן את תמונת החזיתות?',
    options: [
      {
        id: 'A',
        label: 'האויב והאוצר נשארים פעילים, ודעת הקהל מצטרפת.',
        correct: true,
        feedback:
          'נכון. השתנה מוקד נוסף של לחץ, אבל שתי החזיתות הקודמות נשארות פעילות במודל.',
      },
      {
        id: 'B',
        label: 'האויב נשאר פעיל, ודעת הקהל מחליפה את האוצר.',
        correct: false,
        feedback:
          'מעבר הסרט לכיכר אינו אומר שההוצאות פסקו. דעת הקהל מתווספת לחזית האוצר ואינה מחליפה אותה.',
      },
      {
        id: 'C',
        label: 'האויב והאוצר נשארים פעילים, בלי שינוי בחזיתות.',
        correct: false,
        feedback:
          'הדיווח אינו רק תמונת רקע: בתרחיש מתוארת שחיקה בתמיכה הציבורית. במודל זו חזית לחץ נוספת.',
      },
    ],
    explanation:
      'בכל תחנה הסרט מדגיש זירה חדשה. טבלת ההשוואה שומרת גם את החזיתות שכבר נוספו.',
    continueLabel: 'המשיכו לחודש 3',
  },
  {
    id: 'time-pressure-q3-politics',
    fromStationId: 'public',
    toStationId: 'politics',
    prompt:
      'השיח הציבורי נמשך, וכעת ועדה בפרלמנט דורשת מנציגי הממשלה להסביר את ניהול המלחמה. איזו חזית מתווספת לפי הגוף שמפעיל את הלחץ?',
    options: [
      {
        id: 'A',
        label: 'דעת הקהל — מפני שהוועדה דנה במה שמעסיק אזרחים.',
        correct: false,
        feedback:
          'הנושא עשוי להעסיק אזרחים, אך כאן פועל מוסד פוליטי שדורש דין וחשבון. המודל מבחין בינו לבין דעת הקהל.',
      },
      {
        id: 'B',
        label: 'משרד האוצר — מפני שבדיון אפשר לבחון גם עלויות.',
        correct: false,
        feedback:
          'אפשר לדון גם בעלויות, אבל השאלה מזהה את הגוף שמפעיל את הלחץ: ועדה בפרלמנט, ולא משרד האוצר.',
      },
      {
        id: 'C',
        label: 'הפוליטיקה הפנימית — מפני שמוסד פוליטי דורש תשובות.',
        correct: true,
        feedback:
          'נכון. ועדות וביקורת פוליטית שייכות במודל לחזית הפוליטיקה הפנימית, לצד דעת הקהל שכבר פעילה.',
      },
    ],
    explanation:
      'כדי להבחין בין החזיתות, בדקו מי מפעיל את הלחץ ובאיזה תפקיד. כאן הלחץ מגיע ממוסד פוליטי פנימי.',
    continueLabel: 'המשיכו לשנה 1',
  },
  {
    id: 'time-pressure-q4-time',
    fromStationId: 'politics',
    toStationId: 'international',
    prompt:
      'כעת גם בעלות ברית דורשות הפסקת אש. לצבא הסדיר יש הישגים בשטח, והשחקן הלא־סדיר ממשיך לשרוד. מה מסביר את יתרון הזמן של השחקן הלא־סדיר במודל המוצג?',
    options: [
      {
        id: 'A',
        label: 'ההישגים בשטח מפחיתים את חשיבות הלחצים שמחוץ לזירה.',
        correct: false,
        feedback:
          'זהו בדיוק הפער שהמודל מדגים: הישגים בשטח אינם מסירים את שאלת התקציב, התמיכה הציבורית והלחצים המדיניים.',
      },
      {
        id: 'B',
        label: 'המשך השרידות שלו מלווה בהצטברות לחצים על הצבא הסדיר.',
        correct: true,
        feedback:
          'נכון. במודל, לצבא הסדיר מצטרפים לחצים מעבר לאויב שבשטח, בעוד ההשוואה לשחקן הלא־סדיר מתמקדת בשרידותו.',
      },
      {
        id: 'C',
        label: 'הדרישה להפסקת אש מחליפה את הלחצים שהצטברו בתוך המדינה.',
        correct: false,
        feedback:
          'הלחץ הבינלאומי מצטרף לחזיתות הקודמות. הוא אינו מוחק את שאלות התקציב, דעת הקהל והפוליטיקה הפנימית.',
      },
    ],
    explanation:
      'הזמן משנה את מכלול הלחצים, גם כשהלחימה בשטח נמשכת. זו ההשוואה של הפעילות; השעון אינו מנבא תוצאת מלחמה.',
    continueLabel: 'המשיכו לשנה 2',
  },
];

/** ההסבר המקורי המלא — שלוש הפסקאות מהמקור, ללא שינוי ניסוח. */
export const INSIGHT_PARAGRAPHS: string[] = [
  'זו לא רק שאלה של מספרים — זה הבדל בכללי המשחק. הצבא הסדיר חייב לנצח בכל אחת מ-5 החזיתות, כי הפסד באחת מהן מספיק כדי להפיל את כל המלחמה. השחקן הלא-סדיר צריך רק לא לאבד את החזית היחידה שלו — וזה כבר מספיק לו לניצחון, בכל שלב בציר הזמן.',
  'המעצמה רואה את עצמה במלחמה אחת — נגד האויב שבשטח. בפועל, היא לוחמת ב-5 חזיתות בו-זמנית, וכל אחת מ-4 הפנימיות יכולה לבדה לסיים את המלחמה. אין לו אוצר שיתרוקן, אין לו ועדת חקירה שתפיל אותו, אין לו או"ם שילחץ. הוא צריך רק לשרוד עוד יום.',
  'ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות.',
];
