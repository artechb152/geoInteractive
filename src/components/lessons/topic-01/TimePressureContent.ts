/**
 * TimePressureContent — נתוני הפעילות "כשהזמן משנה את מאזן הכוחות"
 * (#scene-asymmetric, topic-01).
 *
 * הבסיס: כל מחרוזת עברית כאן הועתקה במקור מילה במילה מ־
 * design/handoff/asymmetric-time-v3/interaction-content.json,
 * והקואורדינטות מ־design/handoff/asymmetric-time-v3/asset-manifest.json.
 *
 * עדכון לאחר משוב הבעלים (ראו design/docs/assumptions.md, הערך התואם
 * לתאריך העדכון): כמה שדות הועשרו בחזרה בפרטים ומושגים קונקרטיים
 * מהגרסה הקודמת של הרכיב (TimeAsymmetry, לפני ההחלפה) שהושמטו בניסוח
 * החדש — הוצאות/מילואים, לוויות חיילים ומחיר אנושי, ועדות חקירה/
 * אופוזיציה/לחץ קואליציוני, או"ם/סנקציות, ותמצית "כללי המשחק" של
 * השחקן הלא־סדיר — בלי לשחזר את ה"5 חזיתות מול 1" המנוסח-מספרים או כל
 * טענת ניצחון מובטח, ובלי אזכור היסטורי קונקרטי (ראו ההערה המסומנת
 * למשתמש בנפרד). שדות שלא מסומנים כאן נשארו מילה במילה מה-JSON.
 *
 * מודול תוכן בלבד: אין כאן JSX, state או לוגיקת תצוגה.
 */

export type PressureNodeId = 'military' | 'economy' | 'public' | 'politics' | 'international';
export type MapNodeId = 'center' | PressureNodeId;

/** חמש הזירות שמצב המפה נגזר עבורן. `center` אינו כלול — הוא מוקד ניטרלי קבוע. */
export const ALL_NODE_IDS: PressureNodeId[] = ['military', 'economy', 'public', 'politics', 'international'];

/** כל שש התוויות במפה, כולל המוקד המרכזי. */
export const ALL_MAP_NODE_IDS: MapNodeId[] = ['center', ...ALL_NODE_IDS];

export type RoundOption = { id: string; text: string };

export type RoundContent = {
  id: 'opening' | 'accumulation' | 'picture';
  stepLabel: string;
  title: string;
  event: string;
  question: string;
  options: RoundOption[];
  correctOptionId: string;
  feedbackByOption: Record<string, string>;
  causalExplanation: string;
  newPressureIds: PressureNodeId[];
  previousPressureIds: PressureNodeId[];
};

/** שלושת הסבבים, בסדר המערך שב־JSON (opening, accumulation, picture). */
export const ROUNDS: RoundContent[] = [
  {
    id: 'opening',
    stepLabel: 'פתיחת המערכה',
    title: 'כוח רב, מטרות שונות.',
    event: 'בתרחיש הזה לצבא הסדיר יתרון צבאי. השחקן הלא־סדיר מבקש לשמר את יכולתו ולהמשיך להתקיים.',
    question: 'מה אפשר להסיק מהיתרון הצבאי לבדו?',
    options: [
      { id: 'guaranteed', text: 'שהצבא הסדיר ישיג את מטרותיו גם אם המערכה תימשך.' },
      { id: 'conditional', text: 'שהוא מחזיק ביתרון, אך השגת המטרות תלויה גם בתנאים נוספים.' },
    ],
    correctOptionId: 'conditional',
    feedbackByOption: {
      guaranteed: 'יתרון צבאי הוא נתון חשוב, אך אינו מבטיח השגת מטרות. נבדוק מה עוד עשוי להשתנות כשהמערכה מתמשכת.',
      conditional: 'יתרון צבאי אינו כל התמונה. מטרות שונות ומשאבים שונים משפיעים על היכולת של כל צד להתמיד.',
    },
    causalExplanation: 'נקודת הפתיחה היא הזירה הצבאית. כעת נבדוק כיצד ההתמשכות יכולה להוסיף לחצים.',
    newPressureIds: ['military'],
    previousPressureIds: [],
  },
  {
    id: 'accumulation',
    stepLabel: 'הלחץ מצטבר',
    title: 'המערכה נמשכת. המחיר מצטבר.',
    event: 'ההוצאות מזנקות למיליארדי דולרים בשבוע, והמילואים נשארים מגויסים ונשחקים.',
    question: 'מה עשוי להשתנות גם בלי הפסד בקרב?',
    options: [
      { id: 'unchanged', text: 'כל עוד היתרון הצבאי נשמר, חופש הפעולה נשאר ללא שינוי.' },
      { id: 'pressure', text: 'הלחץ הכלכלי והציבורי עשוי לגדול ולצמצם את חופש הפעולה.' },
    ],
    correctOptionId: 'pressure',
    feedbackByOption: {
      unchanged: 'הבחירה מתייחסת ליתרון בשטח, אבל האירוע מתאר גם מחיר מתמשך. המחיר עשוי להשפיע על משאבים ועל תמיכה, גם בלי הפסד בקרב.',
      pressure: 'גם כשהכוח הצבאי נשמר, מחיר ההתמשכות עשוי לצמצם את חופש הפעולה.',
    },
    causalExplanation: 'הוצאות ומילואים לאורך זמן → לחץ כלכלי וציבורי → השפעה אפשרית על היכולת להתמיד.',
    newPressureIds: ['economy', 'public'],
    previousPressureIds: ['military'],
  },
  {
    id: 'picture',
    stepLabel: 'תמונת המצב',
    title: 'גם מחוץ לשטח מתקבלות החלטות.',
    event: 'בתרחיש הזה מתרחב הוויכוח הפוליטי על המשך המערכה, ובעלות ברית מבקשות לקדם הסדרה.',
    question: 'מה נוסף לתמונת המצב?',
    options: [
      { id: 'outside', text: 'לחצים פוליטיים ובינלאומיים עשויים להשפיע על המשך המערכה.' },
      { id: 'onlybattle', text: 'כל עוד לא חל שינוי בזירה הצבאית, אין לכך השפעה על המשך המערכה.' },
    ],
    correctOptionId: 'outside',
    feedbackByOption: {
      outside: 'ההחלטה אם וכיצד להמשיך אינה מתקבלת רק על סמך המצב הצבאי. גם יחסים חיצוניים ודיון פוליטי עשויים להשפיע.',
      onlybattle: 'האירוע מתאר שינוי בתנאים שבהם מתקבלות ההחלטות. התנאים האלה עשויים להשפיע על המשך המערכה גם בלי שינוי צבאי.',
    },
    causalExplanation: 'ויכוח פנימי ועמדות של בעלות ברית → לחץ פוליטי ובינלאומי → השפעה אפשרית על ההחלטה כיצד להמשיך.',
    newPressureIds: ['politics', 'international'],
    previousPressureIds: ['military', 'economy', 'public'],
  },
];

export type TransferChoice = { id: string; text: string };

export const TRANSFER: {
  title: string;
  event: string;
  instruction: string;
  claimQuestion: string;
  claims: TransferChoice[];
  correctClaimId: string;
  evidenceQuestion: string;
  evidence: TransferChoice[];
  correctEvidenceId: string;
  success: string;
  wrongClaim: string;
  wrongEvidence: string;
  wrongBoth: string;
} = {
  title: 'עכשיו הסבירו את הקשר',
  event: 'במערכה אחרת נשמר היתרון הצבאי, אבל המחיר הכלכלי עולה והתמיכה בהמשך הלחימה נחלשת.',
  instruction: 'בחרו טענה ואת הראיה שתומכת בה.',
  claimQuestion: 'איזו טענה מתאימה לתרחיש?',
  claims: [
    { id: 'guarantee', text: 'היתרון הצבאי מבטיח שהיכולת להתמיד תישמר.' },
    { id: 'constrained', text: 'היכולת להתמיד עשויה להצטמצם למרות היתרון הצבאי.' },
    { id: 'inevitable', text: 'עצם התמשכות המערכה מבטיחה ניצחון לשחקן הלא־סדיר.' },
  ],
  correctClaimId: 'constrained',
  evidenceQuestion: 'איזו ראיה תומכת בטענה?',
  evidence: [
    { id: 'advantage', text: 'היתרון הצבאי נשמר.' },
    { id: 'costsupport', text: 'המחיר עולה והתמיכה בהמשך נחלשת.' },
    { id: 'duration', text: 'המערכה מתמשכת.' },
  ],
  correctEvidenceId: 'costsupport',
  success: 'נכון. עליית המחיר וירידת התמיכה מסבירות מדוע היכולת להתמיד עשויה להצטמצם. יתרון צבאי לבדו אינו מסביר את כל התמונה.',
  wrongClaim: 'בדקו אם הטענה מתייחסת גם למחיר ולתמיכה, ולא רק ליתרון הצבאי או לעצם חלוף הזמן.',
  wrongEvidence: 'בחרו את השינוי שמסביר את הלחץ על היכולת להתמיד. עצם חלוף הזמן אינו הסבר מספיק.',
  wrongBoth: 'חפשו טענה מותנית על היכולת להתמיד, וראיה מתוך התרחיש שמסבירה מה השתנה.',
};

export const NODE_LABELS: Record<MapNodeId, string> = {
  center: 'היכולת להמשיך במערכה',
  military: 'הזירה הצבאית',
  economy: 'כלכלה',
  public: 'דעת הקהל',
  politics: 'פוליטיקה',
  international: 'זירה בינלאומית',
};

export const NODE_DEFINITIONS: Record<MapNodeId, string> = {
  center: 'היכולת להתמיד תלויה במטרות, במשאבים ובתנאי המערכה.',
  military: 'היכולת להפעיל כוח ולקדם את מטרות המערכה בזירה הצבאית.',
  economy: 'משאבים, הוצאות והמחיר של התמשכות המערכה.',
  public: 'תמונות מהזירה, לוויות חיילים והמחיר האנושי משפיעים על התמיכה הציבורית ועל האופן שבו היא מעריכה את התוצאות.',
  politics: 'החלטות הדרג המדיני, ועדות חקירה, אופוזיציה ולחץ קואליציוני — הוויכוח הפנימי על מטרות המערכה והמשכה.',
  international: 'יחסים עם האו"ם, בעלות ברית וגורמים חיצוניים נוספים — ואיך עמדותיהם, כולל איום בסנקציות, משפיעים על חופש הפעולה.',
};

export const MAP_TEXT = {
  title: 'מפת הלחצים',
  subtitle: 'מה השתנה בעקבות האירוע?',
};

export const SCENARIO_LABEL: string = 'תרחיש להמחשה';

export const BUTTONS = {
  check: 'בדיקת התחזית',
  next: 'חשפו את האירוע הבא',
  previous: 'חזרה לאירוע הקודם',
  transfer: 'לבדיקת ההבנה',
  checkTransfer: 'בדיקת ההסבר',
  retryTransfer: 'נסו לתקן',
  reset: 'התחלה מחדש',
};

export const FEEDBACK_HEADINGS = {
  correct: 'נכון — זה הקשר',
  incorrect: 'נבחן את הקשר',
  complete: 'השלמתם את הפעילות',
};

export const IRREGULAR = {
  title: 'השחקן הלא־סדיר',
  body: 'לעיתים קרובות, כדי להכריע, על הצד החזק לנצח כמעט בכל זירה שבה הוא נבחן; ליריב הלא־סדיר עשויה להספיק שרידות ושימור יכולת כדי לשרת את יעדיו.',
  note: 'גם הוא מושפע ממשאבים, מתמיכה ומלחצים. הזמן אינו מבטיח לו ניצחון.',
};

export const TAKEAWAY = {
  title: 'התובנה',
  text: 'יתרון צבאי אינו מבטיח יכולת להתמיד לאורך זמן.',
  note: 'ההשפעה תלויה במטרות, במשאבים ובתנאי המערכה.',
};

export const TITLE: string = 'כשהזמן משנה את מאזן הכוחות';
export const INTRO: string = 'נתחו אירוע, חזו את ההשפעה וגלו איך הלחץ מצטבר.';

/* ─────────────────────────── נכסים (asset-manifest.json) ───────────────────────────
   שלושת ה-PNG כבר יושבים ב-public/ ומנוהלים בגיט. `alt` הועתק מהמניפסט:
   למפה יש alt תיאורי, ולשתי רצועות הנוף alt ריק (דקורטיביות). */
export const ASSETS = {
  map: {
    assetId: 'TOPIC01-ASYM-TIME-PRESSURE-MAP',
    src: '/assets/lessons/topic01/scene-asymmetric/time-pressure/pressure-map-daylight.png',
    alt: 'המחשה של מרחב עירוני הררי ובו שישה מוקדים למפת לחצים; קווי ההשפעה וההסברים מוצגים בנפרד.',
    width: 1536,
    height: 1024,
  },
  irregular: {
    assetId: 'TOPIC01-ASYM-TIME-PRESSURE-IRREGULAR',
    src: '/assets/lessons/topic01/scene-asymmetric/time-pressure/irregular-landscape.png',
    alt: '',
    width: 2172,
    height: 724,
  },
  takeaway: {
    assetId: 'TOPIC01-ASYM-TIME-PRESSURE-TAKEAWAY',
    src: '/assets/lessons/topic01/scene-asymmetric/time-pressure/takeaway-landscape.png',
    alt: '',
    width: 2172,
    height: 724,
  },
} as const;

/** viewBox של שכבת ה-SVG = גודל הפיקסלים המקורי של המפה. אין לשנות קנה מידה. */
export const MAP_IMAGE_VIEWBOX = { width: 1536, height: 1024 } as const;

/**
 * עוגני התוויות מ-mapCoordinates.nodes: שברים מנורמלים, x משמאל לימין ו-y מלמעלה
 * למטה — קואורדינטות פיזיות של התמונה, ללא קשר ל-RTL. `anchor` משמש לקצות הקווים
 * ב-SVG, `label` למיקום כרטיס התווית ב-HTML.
 */
export const MAP_NODE_ANCHORS: Record<MapNodeId, { anchor: [number, number]; label: [number, number] }> = {
  center: { anchor: [0.5, 0.53], label: [0.5, 0.585] },
  military: { anchor: [0.48, 0.22], label: [0.48, 0.3] },
  international: { anchor: [0.19, 0.38], label: [0.19, 0.475] },
  economy: { anchor: [0.82, 0.385], label: [0.82, 0.515] },
  politics: { anchor: [0.27, 0.73], label: [0.27, 0.835] },
  public: { anchor: [0.745, 0.715], label: [0.745, 0.82] },
};
