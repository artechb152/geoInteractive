/**
 * Source content for every recap-format demo. All four demos
 * (matching, flashcards, sorting, quiz) consume the same 8 terms so
 * the user can directly compare formats on identical material.
 *
 * Terms are the lesson-01 recap terms verbatim. The `category`
 * field is used only by the sorting demo.
 */

export type Term = {
  id: string;
  term: string;
  def: string;
  category: CategoryId;
};

export type CategoryId = 'levels' | 'mdo' | 'asymmetric';

export const LESSON_1_TERMS: Term[] = [
  {
    id: 't1',
    term: 'רמות המלחמה',
    def: 'אסטרטגית · אופרטיבית · טקטית — אותה מלחמה ברזולוציה אחרת.',
    category: 'levels',
  },
  {
    id: 't2',
    term: 'הרמה האסטרטגית',
    def: 'מטכ״ל ודרג מדיני — זירות, בריתות, חלוקת משאבים לאומית.',
    category: 'levels',
  },
  {
    id: 't3',
    term: 'הרמה האופרטיבית',
    def: 'פיקוד מרחב / גיס — מערכות, מסדרונות תמרון, צורות קרב.',
    category: 'levels',
  },
  {
    id: 't4',
    term: 'הרמה הטקטית',
    def: 'דרג קרבי — Micro-geography, מרחק במטרים, זמן בשניות.',
    category: 'levels',
  },
  {
    id: 't5',
    term: 'MDO',
    def: 'סנכרון 5 ממדים: יבשה, אוויר, ים, חלל, סייבר.',
    category: 'mdo',
  },
  {
    id: 't6',
    term: 'עליונות מרחבית',
    def: 'מצב שבו האויב לא יכול לנוע, לראות או לתקשר באותו מרחב.',
    category: 'mdo',
  },
  {
    id: 't7',
    term: 'לחימה אסימטרית',
    def: 'עימות בין צד חזק (צבא סדיר) לצד חלש (גרילה / טרור).',
    category: 'asymmetric',
  },
  {
    id: 't8',
    term: '3 עמודי הצד החלש',
    def: 'ספיגה והתמדה · הרתעה אסימטרית · התשה.',
    category: 'asymmetric',
  },
];

export const CATEGORIES: { id: CategoryId; label: string; tone: 'cool' | 'accent' | 'hot' }[] = [
  { id: 'levels',     label: 'רמות המלחמה',  tone: 'cool' },
  { id: 'mdo',        label: 'MDO ועליונות', tone: 'accent' },
  { id: 'asymmetric', label: 'לחימה אסימטרית', tone: 'hot' },
];

// Shared classnames per tone — small mapping so each demo paints
// categories consistently.
export const TONE_CLASSES: Record<
  'cool' | 'accent' | 'hot',
  { text: string; bg: string; border: string; dot: string }
> = {
  cool: {
    text: 'text-accent-cool',
    bg: 'bg-accent-cool/10',
    border: 'border-accent-cool/40',
    dot: 'bg-accent-cool',
  },
  accent: {
    text: 'text-accent-hover',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
    dot: 'bg-accent',
  },
  hot: {
    text: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
    dot: 'bg-accent-hot',
  },
};
