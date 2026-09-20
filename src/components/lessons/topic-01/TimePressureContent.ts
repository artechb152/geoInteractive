/**
 * TimePressureContent — נתוני הפעילות "למה הזמן הוא הנשק הסודי של השחקן
 * הלא-סדיר?" (#scene-asymmetric, topic-01, ציר זמן + השוואת חמש חזיתות).
 *
 * כל מחרוזת עברית תחת ROUNDS/STATIONS ותחת INSIGHT_PARAGRAPHS הועתקה
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

const ASSET_BASE = '/assets/lessons/topic01/scene-asymmetric/time-pressure-timeline';

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
      src: `${ASSET_BASE}/01-field-photo.png`,
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
      src: `${ASSET_BASE}/02-treasury-photo.png`,
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
      src: `${ASSET_BASE}/03-public-photo.png`,
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
      src: `${ASSET_BASE}/04-politics-photo.png`,
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
      src: `${ASSET_BASE}/05-international-photo.png`,
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
  regularSummary: (count: number) => `${count} חזיתות פעילות — צבא סדיר`,
  irregularSummary: '1 חזית פעילה — שחקן לא־סדיר',
  summaryTag: 'במודל המוצג',
  liveUpdate: (station: Station, count: number) =>
    `${station.timeLabel}: נוספה חזית ${station.frontLabel}. ${count} מתוך 5 חזיתות פעילות לצבא הסדיר.`,
};

/** ההסבר המקורי המלא — שלוש הפסקאות מהמקור, ללא שינוי ניסוח. */
export const INSIGHT_PARAGRAPHS: string[] = [
  'זו לא רק שאלה של מספרים — זה הבדל בכללי המשחק. הצבא הסדיר חייב לנצח בכל אחת מ-5 החזיתות, כי הפסד באחת מהן מספיק כדי להפיל את כל המלחמה. השחקן הלא-סדיר צריך רק לא לאבד את החזית היחידה שלו — וזה כבר מספיק לו לניצחון, בכל שלב בציר הזמן.',
  'המעצמה רואה את עצמה במלחמה אחת — נגד האויב שבשטח. בפועל, היא לוחמת ב-5 חזיתות בו-זמנית, וכל אחת מ-4 הפנימיות יכולה לבדה לסיים את המלחמה. אין לו אוצר שיתרוקן, אין לו ועדת חקירה שתפיל אותו, אין לו או"ם שילחץ. הוא צריך רק לשרוד עוד יום.',
  'ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות.',
];
