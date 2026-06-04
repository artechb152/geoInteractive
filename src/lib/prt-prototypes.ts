/**
 * The prototypes shown on the secret /prt page.
 *
 * Each entry maps a prebuilt Vite/React SPA (under
 * `public/embeds/<id>/index.html`, produced by
 * `scripts/build-prototypes.mjs`) to a card on /prt and a dedicated
 * viewer at /prt/<id>. Titles + descriptions are derived from each
 * prototype repo's name and README.
 *
 * To add a prototype: clone its repo into `prototypes/<id>/`, add it to
 * the PROTOTYPES list in `scripts/build-prototypes.mjs`, run
 * `npm run prototypes:build`, then add an entry here.
 */

export type PrtPrototype = {
  /** URL slug + embed folder name (public/embeds/<id>/). */
  id: string;
  /** Short heading shown on the card and viewer header. */
  title: string;
  /** One-line eyebrow above the title. */
  tagline: string;
  /** 1–2 sentence description shown on the card, before opening. */
  description: string;
};

export const PRT_PROTOTYPES: PrtPrototype[] = [
  {
    id: 'terrain-overlay',
    title: 'סימולטור צורות שטח',
    tagline: 'תצלום אווירי מול מפה טופוגרפית',
    description:
      'תרגול זיהוי צורות שטח על־ידי השוואה בין תצלום אווירי אמיתי למפת קווי־גובה של אותו אזור (רכס הגלבוע). לוחצים על צורת שטח כדי לראות אותה בשני הייצוגים במקביל.',
  },
  {
    id: 'terrain-3d',
    title: 'סימולטור שטח תלת־ממדי',
    tagline: 'ניווט וחקירה במודל גובה אינטראקטיבי',
    description:
      'סביבת לימוד תלת־ממדית של שטח — מסתובבים, מזיזים את זווית הצפייה וחוקרים את התבליט מכל כיוון, כדי לתרגל קריאת מורפולוגיה לפני יציאה לשטח.',
  },
  {
    id: 'pyramid-3-levels',
    title: 'רמות המלחמה והקשר המרחבי',
    tagline: 'פירמידה תלת־ממדית ומפת זום אינטראקטיבית',
    description:
      'מודול לימוד אינטראקטיבי על שלוש רמות המלחמה והקשר המרחבי. שני מצבים: פירמידה תלת־ממדית שמסתובבת ושכל שכבה בה לחיצה (עם פאנל פרטים ובדיקת הבנה), ומפת אימון עם שלוש רמות זום, סמנים לחיצים ובוחן תרחישים.',
  },
];

export function getPrototype(id: string): PrtPrototype | undefined {
  return PRT_PROTOTYPES.find((p) => p.id === id);
}
