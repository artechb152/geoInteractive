export type InteractionKind =
  | 'concept-cards'      // כרטיסי מושג מתהפכים
  | 'map-explorer'       // חקירת מפה אינטראקטיבית
  | 'navigation-sim'     // סימולציית ניווט באזימוטים
  | 'terrain-classifier' // סיווג צורות נוף
  | 'mobility-grid'      // ניתוח עבירות על גריד
  | 'los-simulator'      // סימולטור קווי ראייה
  | 'weather-impact'     // השפעת מזג אוויר על מערכות
  | 'supply-chain'       // משחק שרשרת אספקה
  | 'chokepoint-map'     // מפת נקודות חנק עולמיות
  | 'urban-3d'           // ניווט תלת־ממדי בעיר
  | 'border-strategy'    // משחק עומק אסטרטגי
  | 'sensor-fusion'      // מיזוג סנסורים (GEOINT)
  | 'gis-layers';        // משחק שכבות GIS

export type Lesson = {
  id: string;            // 'topic-01'
  number: number;        // 1
  title: string;
  shortTitle: string;
  subtitle: string;
  duration: number;      // דקות
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  hero: { color: string; icon: string };
  interactions: InteractionKind[]; // אינטראקציה ראשית + משניות
  objectives: string[];
  tags: string[];
};

export const lessons: Lesson[] = [
  {
    id: 'topic-01',
    number: 1,
    title: 'מבוא לגיאוגרפיה צבאית: מרחב, כוח, אסטרטגיה ורמות מלחמה',
    shortTitle: 'מרחב, כוח, אסטרטגיה',
    subtitle: 'רמות המלחמה, MDO ולחימה אסימטרית',
    duration: 35,
    difficulty: 'foundation',
    hero: { color: 'from-accent-intel/30 via-bg to-bg', icon: 'globe' },
    interactions: ['concept-cards'],
    objectives: [
      'להבדיל בין שלוש רמות המלחמה (אסטרטגית, אופרטיבית, טקטית) ולשייך נכון משימות לכל רמה',
      'להסביר את תפיסת המבצעים הרב־ממדיים (MDO) ואת חמשת ממדי הלחימה',
      'להסביר את מושג העליונות המרחבית ולתת דוגמה לסנכרון בין ממדים',
      'לזהות את שלושת עמודי האסטרטגיה של הצד החלש בלחימה אסימטרית',
      'לתאר חמישה מאפיינים של לחימה אסימטרית ואת השפעתם על המרחב המבצעי',
    ],
    tags: ['רמות מלחמה', 'MDO', 'אסימטרי'],
  },
  {
    id: 'topic-02',
    number: 2,
    title: 'יסודות קרטוגרפיה וקריאת מפות',
    shortTitle: 'קרטוגרפיה',
    subtitle: 'טופוגרפיה, קנה מידה, ITM/WGS84 וקווי גובה',
    duration: 50,
    difficulty: 'foundation',
    hero: { color: 'from-terrain-sand/25 via-bg to-bg', icon: 'map' },
    interactions: ['map-explorer'],
    objectives: [
      'להסביר מהי טופוגרפיה ומדוע מפה טופוגרפית עדיפה על תצ״א לתכנון מבצעי',
      'לחשב מרחק אמיתי לפי קנה מידה ולהבחין בין קנה גדול לקטן',
      'להבדיל בין רשת ישראל החדשה (ITM) לבין WGS84 ולהבין את הסיכון של Datum Shift',
      'לקרוא קווי גובה ולזהות תלילות מדרון לפי צפיפות הקווים',
      'לזהות היטלים קרטוגרפיים נפוצים ומתי כל אחד מתאים',
    ],
    tags: ['מפות', 'נ"צ', 'קווי גובה'],
  },
  {
    id: 'topic-03',
    number: 3,
    title: 'ניווטים: התמצאות, אזימוט ותכנון ציר',
    shortTitle: 'ניווטים',
    subtitle: 'אזימוט, סיפור דרך, ניווט בשטח אויב ובסביבת GPS-Denied',
    duration: 45,
    difficulty: 'foundation',
    hero: { color: 'from-accent/25 via-bg to-bg', icon: 'compass' },
    interactions: ['navigation-sim'],
    objectives: [
      'לחשב אזימוט ואזימוט חוזר ולהבחין בין 3 סוגי "צפון"',
      'להבין את המגבלות של GPS ולמה צריך לדעת לעבוד בלעדיו',
      'לבנות "סיפור דרך" עם נקודות אימות ולחשב מרחק בספירת צעדים',
      'לבחור שיטת ניווט מתאימה לשטח (איגוף / עיוור / שליטה בקצב)',
    ],
    tags: ['אזימוט', 'GPS-Denied', 'סיפור דרך'],
  },
  {
    id: 'topic-04',
    number: 4,
    title: 'טופוגרפיה ומורפולוגיית שטח',
    shortTitle: 'מורפולוגיית שטח',
    subtitle: 'גיאולוגיה צבאית, 5 תבניות נוף ושטח שולט/חיוני/מת',
    duration: 40,
    difficulty: 'intermediate',
    hero: { color: 'from-terrain-ridge/30 via-bg to-bg', icon: 'mountain' },
    interactions: ['terrain-classifier'],
    objectives: [
      'להבחין בין שלוש קבוצות סלעים ולהבין את ההשלכות הצבאיות שלהן',
      'להסביר את ההבדל בין כוחות אנדוגניים לאקסוגניים בעיצוב הנוף',
      'לזהות חמש תבניות נוף בסיסיות (כיפה, שלוחה, גיא, אוכף, שקע) במפה ובשטח',
      'לסווג מדרון לאחד מ-4 הסוגים (קצוב, קמור, קעור, כתף)',
      'להבדיל בין שטח שולט, שטח חיוני ושטח מת ולתת לכל אחד דוגמה מבצעית',
    ],
    tags: ['תבליט', 'Key Terrain', 'גיאולוגיה'],
  },
  {
    id: 'topic-05',
    number: 5,
    title: 'ניידות ותמרון: עבירות, כיסוי והסתרה, תכסית',
    shortTitle: 'ניידות ותמרון',
    subtitle: 'מסדרונות תמרון, שיפועים, הנדסה גיאוגרפית, צומח וחקלאות',
    duration: 55,
    difficulty: 'intermediate',
    hero: { color: 'from-terrain-olive/25 via-bg to-bg', icon: 'route' },
    interactions: ['mobility-grid'],
    objectives: [
      'לחשב גבולות עבירות לכלים גלגליים מול זחליליים לפי שיפוע ומסלע',
      'לתכנן מסדרון תמרון שמשלב מכשולים טבעיים והנדסיים',
      'להבחין בין כיסוי (Cover) להסתרה (Concealment) ולהשתמש בכל אחד נכון',
      'לסווג תצורות צומח וחקלאות ולהסיק משמעויות מבצעיות',
    ],
    tags: ['Trafficability', 'Cover', 'תכסית'],
  },
  {
    id: 'topic-06',
    number: 6,
    title: 'קווי ראייה ותצפית (LOS / Viewshed)',
    shortTitle: 'קווי ראייה',
    subtitle: 'ניתוח תצפיות, Viewshed אלגוריתמי וסגירת מעגלי אש',
    duration: 45,
    difficulty: 'intermediate',
    hero: { color: 'from-accent-cool/25 via-bg to-bg', icon: 'eye' },
    interactions: ['los-simulator'],
    objectives: [
      'לחשב קו ראייה ידני ולזהות שבירת LOS על ידי תכסית או תבליט',
      'להפעיל ניתוח Viewshed ולפרש את תוצאותיו',
      'לבצע ניתוח תצפית מרובת מקורות ולאתר פערי כיסוי',
      'להסביר תלות של חימוש מונחה בשמירת LOS לאורך Kill Chain',
    ],
    tags: ['LOS', 'Viewshed', 'Kill Chain'],
  },
  {
    id: 'topic-07',
    number: 7,
    title: 'אקלים, מזג אוויר ועונתיות',
    shortTitle: 'אקלים ומזג אוויר',
    subtitle: 'מיקרו־אקלים, עומס אקלימי, בליעה אטמוספרית ותקרת ענן',
    duration: 30,
    difficulty: 'intermediate',
    hero: { color: 'from-terrain-sky/25 via-bg to-bg', icon: 'cloud' },
    interactions: ['weather-impact'],
    objectives: [
      'לזהות מיקרו־אקלים ולכלול אותו בתכנון מבצע',
      'להעריך את ההשפעה של עומס חום/קור על שחיקת כוח',
      'להסביר Thermal Crossover והשפעתו על סנסורים תרמיים',
      'לקשר תקרת ענן לבחירת פלטפורמת איסוף ותקיפה',
    ],
    tags: ['מטאורולוגיה', 'סנסורים', 'IR'],
  },
  {
    id: 'topic-08',
    number: 8,
    title: 'תשתיות וגיאוגרפיה של לוגיסטיקה',
    shortTitle: 'לוגיסטיקה',
    subtitle: 'LOC, MSR/ASR, "בטן לוגיסטית", נמלים ומסופים היברידיים',
    duration: 40,
    difficulty: 'intermediate',
    hero: { color: 'from-terrain-steel/30 via-bg to-bg', icon: 'truck' },
    interactions: ['supply-chain'],
    objectives: [
      'למפות LOC ולתעדף MSR מול ASR בתרחיש נתון',
      'להעריך פגיעות "בטן לוגיסטית" לפי עומק חדירה',
      'להסביר את ערכם של נמלי מים עמוקים ומסופים היברידיים',
      'לבחור נקודת תקיפה תשתיתית עם השפעה רחבה',
    ],
    tags: ['LOC', 'MSR', 'תשתיות'],
  },
  {
    id: 'topic-09',
    number: 9,
    title: 'משאבים, אנרגיה וגיאו־כלכלה',
    shortTitle: 'גיאו־כלכלה',
    subtitle: 'הידרו־פוליטיקה, אבטחת SLOC ונקודות חנק עולמיות',
    duration: 35,
    difficulty: 'advanced',
    hero: { color: 'from-accent-cool/30 via-bg to-bg', icon: 'world' },
    interactions: ['chokepoint-map'],
    objectives: [
      'לנתח שליטה גיאוגרפית במשאבי מים כמנוף לחץ אסטרטגי',
      'לזהות נקודות חנק ימיות מרכזיות והשלכות חסימה',
      'להסביר את דוקטרינת מהן (Mahan) בהקשר עכשווי',
      'לקשר תשתיות אנרגיה לסיכוני ביטחון לאומי',
    ],
    tags: ['SLOC', 'Hydropolitics', 'Mahan'],
  },
  {
    id: 'topic-10',
    number: 10,
    title: 'גיאוגרפיה של לחימה בשטח בנוי (Urban)',
    shortTitle: 'לחימה אורבנית',
    subtitle: 'MOUT, מנהרות וממד אנכי, אילוצים אזרחיים ומשפטיים',
    duration: 50,
    difficulty: 'advanced',
    hero: { color: 'from-terrain-steel/25 via-bg to-bg', icon: 'building' },
    interactions: ['urban-3d'],
    objectives: [
      'לזהות הבדל בין גריד עירוני לקסבה ואת השפעתו הטקטית',
      'להסביר אתגרי לוחמת תת־קרקע (GPS-Denied, קשר, איסוף)',
      'לנתח איומי הממד האנכי על כוח רגלי ומשוריין',
      'לסווג אתרים רגישים ולנהל "ציר הומניטרי" באזור לחימה',
    ],
    tags: ['MOUT', 'מנהרות', 'אזרחים'],
  },
  {
    id: 'topic-11',
    number: 11,
    title: 'גבולות, עומק אסטרטגי ואזורי חיץ',
    shortTitle: 'גבולות ועומק',
    subtitle: 'עומק אסטרטגי, אזורי חיץ וטיפולוגיית גבולות',
    duration: 30,
    difficulty: 'intermediate',
    hero: { color: 'from-accent-hot/25 via-bg to-bg', icon: 'border' },
    interactions: ['border-strategy'],
    objectives: [
      'להסביר את משמעות העומק האסטרטגי על גמישות אופרטיבית',
      'לתאר תפקיד אזור חיץ והטכנולוגיות שמחליפות עומק פיזי',
      'להבחין בין גבול טבעי לגבול מלאכותי ולהשלכות',
      'לבחור אסטרטגיה למרחב צר מול מרחב פתוח',
    ],
    tags: ['עומק', 'אזור חיץ', 'גבולות'],
  },
  {
    id: 'topic-12',
    number: 12,
    title: 'מודיעין גיאו־מרחבי (GEOINT) וחישה מרחוק',
    shortTitle: 'GEOINT',
    subtitle: 'IMINT, לווייני LEO, SAR, רחפנים, OSINT והונאה',
    duration: 50,
    difficulty: 'advanced',
    hero: { color: 'from-accent-intel/35 via-bg to-bg', icon: 'satellite' },
    interactions: ['sensor-fusion'],
    objectives: [
      'לבחור פלטפורמת איסוף נכונה לפי מטרה, מזג אוויר וחשיפה',
      'להסביר יתרונות SAR מול אופטיקה רגילה',
      'להפעיל הצלבת סנסורים לחשיפת הונאה (Deception)',
      'להעריך את השפעת OSINT על שדה הקרב המודרני',
    ],
    tags: ['SAR', 'לוויינים', 'OSINT'],
  },
  {
    id: 'topic-13',
    number: 13,
    title: 'GIS יישומי לניתוח מבצעי',
    shortTitle: 'GIS מבצעי',
    subtitle: 'שכבות, ראסטר/וקטור, Cost Surface ו-Network Analysis',
    duration: 55,
    difficulty: 'advanced',
    hero: { color: 'from-accent/30 via-bg to-bg', icon: 'layers' },
    interactions: ['gis-layers'],
    objectives: [
      'להסביר עקרון השכבות וההבדל בין ראסטר לוקטור',
      'לבנות Cost Surface ולהפיק Least-Cost Path',
      'להפעיל Network Analysis לאיתור נקודות כשל',
      'להשתמש ב-Buffers להערכת איום ופגיעות',
    ],
    tags: ['GIS', 'Cost Surface', 'Network'],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export function nextLesson(id: string): Lesson | undefined {
  const i = lessons.findIndex((l) => l.id === id);
  return i >= 0 ? lessons[i + 1] : undefined;
}

export function prevLesson(id: string): Lesson | undefined {
  const i = lessons.findIndex((l) => l.id === id);
  return i > 0 ? lessons[i - 1] : undefined;
}

export const totalDuration = lessons.reduce((s, l) => s + l.duration, 0);
