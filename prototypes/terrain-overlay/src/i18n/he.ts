/**
 * he.ts — כל מחרוזות הממשק בעברית.
 *
 * הפרדה בין **ממשק** ל**תוכן**: הטקסטים הלימודיים (הגדרות הצורות, המילון,
 * ההסברים) חיים ב-`content/terrain.he.json` ונגזרים ל-`src/data/`. הקובץ הזה
 * מחזיק רק את הכרום — כפתורים, תוויות, הודעות מצב. שניהם צריכים תרגום, אבל
 * הם מתורגמים ע"י אנשים שונים ובקצב שונה.
 *
 * הערכים יכולים להיות פונקציה כשיש בהם מספר או שם — כך המתרגם שולט בסדר
 * המילים, שהוא בדיוק מה שנשבר כשמשרשרים מחרוזות.
 */
export const he = {
  dir: 'rtl' as const,
  localeTag: 'he',

  /* ------------------------------- כותרות ------------------------------- */
  title: 'סימולטור צורות שטח',
  subtitle: 'זיהוי צורות שטח בתצלום אוויר ובמפה טופוגרפית',
  titleWithArea: (area: string) => `סימולטור צורות שטח — ${area}`,

  /* ------------------------------- מצבים ------------------------------- */
  modeExplore: 'חקירה',
  modeQuiz: 'תרגול',
  modeLesson: 'שיעור',
  glossary: 'מילון',
  helpLabel: 'קיצורי מקלדת ועזרה',
  showAll: 'הצג הכול',
  clearSelection: 'נקו בחירה',
  close: 'סגירה',
  back: 'הקודם',
  next: 'הבא',
  skip: 'דילוג',
  start: 'מתחילים',
  retry: 'נסו שוב',
  print: 'הדפסה',
  copy: 'העתקה',
  copied: 'הועתק',

  /* ------------------------------- השוואה ------------------------------- */
  layerAerial: 'תצ״א',
  layerAerialFull: 'תצלום אוויר אנכי',
  layerTopo: 'מפה',
  layerTopoFull: 'מפה טופוגרפית',
  layerHillshade: 'הצללה',
  compareGroup: 'מצב השוואה בין השכבות',
  compareWipe: 'וילון',
  compareFade: 'שקיפות',
  compareSplit: 'זה לצד זה',
  compareHillshade: 'הצללה',
  compareWipeHint: 'קו מפריד נגרר. שתי השכבות חדות ב-100%, וההשוואה מקומית ומדויקת.',
  compareFadeHint: 'מעבר רציף בין השכבות. שימושי לראות איפה בדיוק יושב קו גובה על השטח.',
  compareSplitHint: 'שני חלונות מסונכרנים — הזום וההזזה משותפים לשניהם.',
  compareHillshadeHint: 'תבליט השטח מואר מצפון-מערב — הגשר בין התצלום למפה.',
  onlyLayer: (layer: string) => `הצג ${layer} בלבד`,
  betweenLayers: (a: string, b: string) => `מעבר בין ${a} ל${b}`,

  /* ------------------------------- זום ------------------------------- */
  zoomIn: 'התקרבות',
  zoomOut: 'התרחקות',
  zoomFit: 'התאמה למסך',
  loupe: 'לופה',
  zoomLevel: (k: string) => `זום ${k} כפול`,

  /* ------------------------------ הנחיות ------------------------------ */
  hint: 'לחצו על צורת שטח במפה כדי ללמוד כיצד היא נראית בתצ״א ובמפה — וגררו את המחוון כדי להשוות בין השכבות באותו שטח.',
  hintQuiz: 'ענו על השאלה שבראש המסך. אפשר להיעזר במקרא, בזום ובלופה.',
  hintLoading: 'טוען את שכבות המפה…',
  hintShowAll: 'כל הצורות מסומנות. לחצו על אחת מהן כדי לפתוח את הכרטיס שלה.',
  hintRemaining: (n: number) => `נותרו ${n} צורות שטרם נצפו. לחצו על נקודה במפה.`,

  /* ------------------------------ התקדמות ------------------------------ */
  progressLabel: 'התקדמות בלמידה',
  progressSeen: (seen: number, total: number) => `נצפו ${seen} מתוך ${total} צורות`,
  progressComplete: 'הושלם ✓',
  resetProgress: 'איפוס התקדמות',
  resetConfirm: 'לאפס את כל ההתקדמות השמורה במכשיר הזה?',
  resetDone: 'ההתקדמות אופסה.',
  privacyNote:
    'ההתקדמות נשמרת במכשיר שלכם בלבד (localStorage). שום דבר אינו נשלח לשרת ואין שמירה של מזהה אישי.',
  shareLink: 'העתקת קישור למצב הנוכחי',

  /* ------------------------------- תרגול ------------------------------- */
  quizScore: (score: number) => `ניקוד ${score}`,
  quizStreak: (n: number) => `רצף ${n}`,
  quizHint: 'רמז',
  quizExit: 'יציאה מהתרגול',
  quizNext: 'לשאלה הבאה',
  quizCorrect: 'תשובה נכונה',
  quizWrong: (name: string) => `תשובה שגויה. הצורה הנכונה היא ${name}`,
  quizNotEnough: 'אין באזור הזה מספיק צורות לתרגול.',
  quizRetryMissed: 'תרגלו שוב את מה שפספסתם',
  quizRestart: 'סבב חדש',

  /* ------------------------------- שיעור ------------------------------- */
  lessonGoalsTitle: 'מה תדעו בסוף',
  lessonEstimate: (min: number) => `זמן משוער: כ-${min} דקות`,
  lessonStart: 'התחלת השיעור',
  lessonSkipToExplore: 'דילוג לחקירה חופשית',
  lessonStageIntro: 'מבוא',
  lessonStageExplore: 'חקירה מונחית',
  lessonStagePractice: 'תרגול',
  lessonStageTest: 'מבחן',
  lessonStageSummary: 'סיכום',
  lessonNextFeature: 'לצורה הבאה',
  lessonPrevFeature: 'לצורה הקודמת',
  lessonToPractice: 'מעבר לתרגול',
  lessonOf: (i: number, n: number) => `צורה ${i} מתוך ${n}`,
  lessonStageOf: (i: number, n: number) => `שלב ${i} מתוך ${n}`,

  /* ------------------------------ חתך גובה ------------------------------ */
  profileTitle: 'חתך גובה',
  profileStart: 'שרטוט חתך',
  profileHint: 'גררו קו על המפה — ייפתח גרף הגובה לאורכו.',
  profileClear: 'ניקוי החתך',
  profileTypical: 'החתך האופייני של הצורה',
  profileLength: (m: number) => `אורך ${m} מ׳`,
  profileRange: (min: number, max: number) => `${min}–${max} מ׳`,

  /* ------------------------------- הקראה ------------------------------- */
  speakStart: 'הקראת הטקסט',
  speakStop: 'עצירת ההקראה',
  speakRate: 'מהירות ההקראה',
  speakUnavailable: 'הדפדפן הזה אינו תומך בהקראה בעברית.',

  /* ------------------------------ הודעות ------------------------------ */
  selected: (name: string, definition: string) => `נבחרה ${name}. ${definition}`,
  cleared: 'בוטלה הבחירה',
  areaChanged: (name: string, intro: string) => `הוחלף אזור: ${name}. ${intro}`,
  loadError: (area: string) => `לא הצלחנו לטעון את שכבות המפה של ${area}.`,
  loadErrorDetail: 'ייתכן שאין חיבור לרשת, או שהנכסים לא הועלו לשרת הקורס.',
  loadSlow: 'הטעינה איטית מהרגיל — ממשיכים לנסות…',
  attribution: 'מקורות ורישוי',
};

export type Dict = typeof he;
