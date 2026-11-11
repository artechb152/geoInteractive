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
    what: 'כיוון הקצה הצפוני של מחט המצפן; ממנו מודדים אזימוט במצפן.',
    note: 'מתכות ושדות מגנטיים עלולים לשבש את הקריאה.',
  },
  grid: {
    label: 'צפון רשת',
    english: 'Grid North',
    short: 'רשת',
    color: 'text-terrain-olive',
    what: 'הצפון של קווי הרשת האנכיים; ממנו מודדים אזימוט במפה.',
    note: 'עשוי להיות שונה מהצפון האמיתי והמגנטי.',
  },
  true: {
    label: 'צפון אמיתי',
    english: 'True North',
    short: 'אמיתי',
    color: 'text-brand-dark',
    what: 'הכיוון לקוטב הצפוני הגאוגרפי לאורך קו האורך המקומי.',
    note: 'מחט המצפן לא בהכרח מצביעה אליו.',
  },
};

/** Choice order, right → left in the RTL row and top → bottom in the table (as in the mockup). */
export const NORTH_IDS: NorthId[] = ['true', 'grid', 'magnetic'];
