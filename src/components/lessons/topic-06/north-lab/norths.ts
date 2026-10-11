import type { NorthId } from './northLabGeometry';

export type { NorthId };

export interface NorthMeta {
  label: string;
  english: string;
  /** arrow label on the map */
  abbr: 'TN' | 'GN' | 'MN';
  /** text-* token — the arrow / legend colour, read in SVG via currentColor */
  color: string;
  who: string;
  what: string;
  why: string;
}

export const NORTHS: Record<NorthId, NorthMeta> = {
  magnetic: {
    label: 'צפון מגנטי',
    english: 'Magnetic North',
    abbr: 'MN',
    color: 'text-accent-hot',
    who: 'מדידת כיוון במצפן מגנטי',
    what: 'הכיוון שמורה הקצה הצפוני של מחט המצפן, בהתאם לשדה המגנטי המקומי של כדור הארץ.',
    why: 'ההפרש בינו לצפון אמיתי משתנה לפי המקום והזמן. מתכות ושדות מגנטיים סמוכים עלולים לשבש את הקריאה.',
  },
  grid: {
    label: 'צפון רשת',
    english: 'Grid North',
    abbr: 'GN',
    color: 'text-terrain-olive',
    who: 'תכנון ומדידת כיוון במפת רשת',
    what: 'כיוון הצפון לאורך הקווים האנכיים של רשת הקואורדינטות במפה.',
    why: 'עשוי להיות שונה מצפון אמיתי ומצפון מגנטי. במעבר בין המפה למצפן מתחשבים בהפרש המתאים.',
  },
  true: {
    label: 'צפון אמיתי',
    english: 'True North',
    abbr: 'TN',
    color: 'text-brand-dark',
    who: 'ייחוס גאוגרפי למדידת כיוונים',
    what: 'הכיוון אל הקוטב הצפוני הגאוגרפי לאורך קו האורך המקומי.',
    why: 'מצפן מגנטי אינו מורה בהכרח לכיוון זה. ההפרש הזוויתי בין צפון מגנטי לצפון אמיתי נקרא נטייה מגנטית.',
  },
};

/** Choice order, right → left in the RTL row and top → bottom in the table (as in the mockup). */
export const NORTH_IDS: NorthId[] = ['true', 'grid', 'magnetic'];
