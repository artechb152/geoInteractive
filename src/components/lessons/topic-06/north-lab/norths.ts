import type { NorthId } from './northLabGeometry';

export type { NorthId };

export interface NorthMeta {
  label: string;
  english: string;
  /** arrow label on the map (main map and inset) — the label's last word, as in the tabs */
  short: string;
  /** text-* token — the arrow / legend colour, read in SVG via currentColor */
  color: string;
  /** the definition, ending with what the north is used for */
  what: string;
  /** the practical caveat ("דגש לשימוש"), shown with the definition */
  note: string;
}

/*
 * Each fact is shown once, next to what it explains: the definition (with its
 * use) and the caveat here (the tab panel); "משתנה לפי המקום והזמן" and the term "נטייה מגנטית"
 * under the declination slider; the map-to-compass correction in the card's
 * closing line.
 */
export const NORTHS: Record<NorthId, NorthMeta> = {
  magnetic: {
    label: 'צפון מגנטי',
    english: 'Magnetic North',
    short: 'מגנטי',
    color: 'text-accent-hot',
    what: 'הכיוון שמורה הקצה הצפוני של מחט המצפן, בהתאם לשדה המגנטי המקומי של כדור הארץ. ממנו מודדים כיוון במצפן.',
    note: 'מתכות ושדות מגנטיים סמוכים עלולים לשבש את הקריאה.',
  },
  grid: {
    label: 'צפון רשת',
    english: 'Grid North',
    short: 'רשת',
    color: 'text-terrain-olive',
    what: 'כיוון הצפון לאורך הקווים האנכיים של רשת הקואורדינטות במפה. לפיו מודדים כיוונים במפה.',
    note: 'עשוי להיות שונה מצפון אמיתי ומצפון מגנטי.',
  },
  true: {
    label: 'צפון אמיתי',
    english: 'True North',
    short: 'אמיתי',
    color: 'text-brand-dark',
    what: 'הכיוון אל הקוטב הצפוני הגאוגרפי לאורך קו האורך המקומי. משמש כייחוס גאוגרפי למדידת כיוונים.',
    note: 'מצפן מגנטי אינו מורה בהכרח לכיוון זה.',
  },
};

/** Choice order, right → left in the RTL row and top → bottom in the table (as in the mockup). */
export const NORTH_IDS: NorthId[] = ['true', 'grid', 'magnetic'];
