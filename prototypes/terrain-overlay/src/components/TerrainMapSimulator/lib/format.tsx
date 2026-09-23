import type { ReactNode } from 'react';

/**
 * format.tsx — מספרים וקטעים לועזיים בתוך טקסט עברי.
 *
 * שני באגים אמיתיים שהעטיפות האלה מונעות, ושניהם נראים רק בעין ולא בקומפילציה:
 *
 * 1. **טווח מספרים מתהפך.** "287–539 מ׳" בתוך פסקה RTL מוצג כ-"539–287":
 *    המקף הוא תו ניטרלי, ולכן אלגוריתם ה-bidi סופח אותו לכיוון הפסקה והופך
 *    את סדר שני המספרים. בידוד הטווח פותר את זה.
 *
 * 2. **שם לועזי נדבק לפיסוק העברי שלידו.** "‏(CC-BY-SA), ©" מקבל את הסוגר
 *    בצד הלא נכון בלי `dir="ltr"` מפורש.
 *
 * `unicode-bidi: isolate` ולא `embed`: בידוד מונע גם מהתוכן שבחוץ להיות מושפע
 * מהתוכן שבפנים, וזה בדיוק המקרה של מספר בסוף משפט.
 */

const ISOLATE = { unicodeBidi: 'isolate' as const };

/** קטע בכיוון שמאל-לימין בתוך טקסט עברי (שמות מוצרים, כתובות, קיצורים לועזיים). */
export function Ltr({ children, lang }: { children: ReactNode; lang?: string }) {
  return (
    <span dir="ltr" lang={lang} style={ISOLATE}>
      {children}
    </span>
  );
}

/** מספר בודד עם יחידה. היחידה נשארת עברית ומחוץ לבידוד. */
export function Num({ value, unit }: { value: number | string; unit?: string }) {
  return (
    <>
      <span dir="ltr" style={ISOLATE}>
        {value}
      </span>
      {unit ? <> {unit}</> : null}
    </>
  );
}

/** טווח מספרים. המקף חייב להיות בתוך הבידוד, אחרת הטווח מתהפך. */
export function Range({
  from,
  to,
  unit,
}: {
  from: number | string;
  to: number | string;
  unit?: string;
}) {
  return (
    <>
      <span dir="ltr" style={ISOLATE}>
        {from}–{to}
      </span>
      {unit ? <> {unit}</> : null}
    </>
  );
}

/**
 * גרש עברי (U+05F3) וגרשיים עבריים (U+05F4) במקום התווים הלטיניים.
 * `מ'` עם אפוסטרוף לטיני נראה כמעט זהה אך נקרא אחרת ע"י קוראי מסך, ונשבר
 * בחיפוש טקסט.
 */
export const GERESH = '׳';
export const GERSHAYIM = '״';

/** מנרמל מחרוזת עברית לפיסוק תקני. שימושי לטקסט שמגיע מבחוץ. */
export function normalizeHebrewPunctuation(text: string): string {
  return text
    .replace(/(א-ת)'(?![א-ת])/g, `$1${GERESH}`)
    .replace(/([א-ת])"([א-ת])/g, `$1${GERSHAYIM}$2`);
}
