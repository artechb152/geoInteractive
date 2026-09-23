/**
 * types.ts — טיפוסי הנתונים של הסימולטור.
 *
 * זהו החוזה שבין ה-pipeline (tools/) לבין הרכיב: הקבצים שב-`src/data/areas`
 * נוצרים אוטומטית ומצייתים לטיפוסים האלה. הוספת אזור אינה דורשת שינוי קוד —
 * רק רשומה ב-tools/areas.config.json, טקסט ב-content/terrain.he.json והרצת
 * `npm run generate:area -- --area=<id>`.
 */

/**
 * חתימת קווי הגובה האידיאלית של הצורה (לתרשים ההמחשה).
 *
 * החתימה היא **הדפוס במפה**, לא הצורה בשטח: גבעה וכיפה חולקות `rings` כי
 * שתיהן טבעות סגורות, וההבדל ביניהן הוא בגודל ובהקשר — וזה בדיוק מה שהופך
 * אותן לזוג מבלבל.
 */
export type SignatureKind =
  | 'rings'
  | 'crest'
  | 'bowtie'
  | 'parallel'
  | 'u'
  | 'v'
  | 'contours'
  /** מצוק — קווים מתלכדים כמעט לקו אחד. */
  | 'cliff'
  /** קער סגור / שקע — טבעות סגורות עם שנצים כלפי פנים. */
  | 'depression'
  /** מישור — קווים דלילים מאוד או היעדרם. */
  | 'flat'
  /** מדף / כתף — קווים שמתרווחים בפתאומיות בתוך מדרון צפוף. */
  | 'shelf'
  /** צוואר — היצרות חדה בין שתי מערכות סגורות. */
  | 'neck'
  /** בקעה / עמק — רצפה רחבה ושטוחה בין שני מדרונות. */
  | 'basin';

/** משפחת הצורה — הקיבוץ שלפיו בנוי המקרא. */
export type FeatureFamily = 'concept' | 'convex' | 'concave' | 'pass' | 'surface' | 'scarp';

/** רמת קושי של אזור לימוד. */
export type AreaDifficulty = 'easy' | 'medium' | 'hard';

/** מזהה הצורה הנבחרת, או null. */
export type SelectedFeatureId = string | null;

/** נקודה במרחב ה-viewBox של המפה (0..1000). */
export interface Point {
  x: number;
  y: number;
}

/** שכבת תמונה אחת של אזור, בכל הפורמטים והרוחבים. */
export interface ImageLayer {
  /** ערך srcset מוכן לכל פורמט מודרני. */
  avif: string;
  webp: string;
  /** קובץ יחיד לדפדפנים ללא AVIF/WebP. */
  fallback: string;
  /** תמונה זעירה מוטבעת (data URI) שמוצגת עד לטעינת השכבה. */
  lqip: string;
  /** הרוחב המקורי בפיקסלים. */
  width: number;
  /** רשימת הרוחבים הזמינים — לחישוב `sizes`. */
  widths: number[];
}

/** שאלת אתגר עם תשובה (החליפה את ה"אתגר:" חסר-המענה). */
export interface Challenge {
  prompt: string;
  answer: string;
}

/** צורת שטח בודדת באזור מסוים. */
export interface TerrainFeature {
  id: string;
  name: string;
  family: FeatureFamily;
  signature: SignatureKind;
  /** true עבור "קווי גובה" — מושג יסוד שנלמד לפני הצורות. */
  isConcept?: boolean;
  /** ההגדרה הכללית של הצורה — אינה תלוית אזור. */
  definition: string;
  /** מה רואים כאן בפועל, כולל נתוני גובה אמיתיים מה-DEM. */
  localNote?: string;
  /** definition + localNote — שורת הפתיחה של הכרטיס. */
  shortDescription: string;
  aerialExplanation: string;
  mapExplanation: string;
  /** למה זה משנה בשטח — ניווט, ציר תנועה, תצפית. */
  whyItMatters: string;
  /** הערת הבחנה מול הצורה המתבלבלת. */
  contrastNote?: string;
  /** מזהה הצורה שהכי קל להתבלבל איתה. */
  confusedWith?: string;
  challenge?: Challenge;
  /** מזהי מונחים במילון שרלוונטיים לצורה. */
  terms?: string[];
  /** גובה מדוד במטרים (פסגה / אוכף / רום הקו), אם רלוונטי. */
  elevation?: number;
  /** חץ כיוון מורד: נקודה + זווית במעלות. */
  flowArrow?: { x: number; y: number; angle: number };
  /** נתיב SVG — אזור לחיץ (ולצורות עם מתאר: גם קו ה-highlight). */
  hitPath: string;
  /** שטח אזור הלחיצה — קובע את סדר הערום כך שצורה קטנה לא נחסמת (S-06). */
  hitArea?: number;
  /** קווי הגובה האמיתיים המודגשים ב-highlight. */
  accentPaths?: string[];
  /** ברירת מחדל true. false => מודגשים רק קווי הגובה, ללא מסגרת. */
  showOutline?: boolean;
  /** עיגון תווית השם. */
  labelPoint: Point;
}

/** נתוני גובה של האזור — משמשים גם לטקסט וגם לשאלות התרגול. */
export interface AreaStats {
  min: number;
  max: number;
  relief: number;
  /** הפרש הגובה בין שני קווים סמוכים, במטרים. */
  interval: number;
  /** הפרש הגובה בין שני קווי מדד. */
  indexInterval: number;
  peakCount: number;
  saddleCount: number;
}

/** אזור לימוד שלם. */
export interface TerrainArea {
  id: string;
  name: string;
  region: string;
  difficulty: AreaDifficulty;
  /** מה האזור מלמד — מוצג בבורר האזורים. */
  teaches: string;
  intro: string;
  order: number;
  /** רוחב התחום בקרקע במטרים. */
  groundWidthM: number;
  /** אורך סרגל קנה המידה במטרים. */
  scaleBarM: number;
  viewBox: { width: number; height: number };
  /** תמונה ממוזערת לבורר האזורים. */
  thumbnail: string;
  /**
   * ההצללה אופציונלית: אזור שנוצר לפני שהשכבה נוספה עדיין תקף, והרכיב
   * משמיט את מצב התצוגה במקום להיכשל.
   */
  layers: { aerial: ImageLayer; topo: ImageLayer; hillshade?: ImageLayer };
  attribution: { aerial: string; topo: string; dem: string };
  stats: AreaStats;
  features: TerrainFeature[];
}

/**
 * רשת גבהים דחוסה לכלי חתך הגובה.
 * נטענת בייבוא דינמי בלבד — היא שוקלת יותר מכל שאר נתוני האזור יחד, ורוב
 * הלומדים לעולם לא יפתחו את הכלי.
 */
export interface ElevationGridData {
  /** מספר התאים בכל צלע. */
  size: number;
  /** הגובה שמיוצג ע"י הערך 0. */
  min: number;
  /** טווח הגבהים שעליו פרוסים 65535 הערכים. */
  span: number;
  groundWidthM: number;
  /** Uint16LE little-endian, מקודד base64. */
  data: string;
}

/** מונח במילון. */
export interface GlossaryTerm {
  id: string;
  term: string;
  aliases?: string[];
  definition: string;
}

/** משפחת צורות (לכותרות המקרא). */
export interface FamilyInfo {
  name: string;
  description: string;
}
