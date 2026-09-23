import { useInsertionEffect, useRef, type MutableRefObject } from 'react';

/**
 * useLatestRef — ref שמחזיק תמיד את הערך האחרון, בלי לכתוב אליו בזמן רינדור.
 *
 * הצורה המקוצרת הנפוצה היא:
 *
 *     const ref = useRef(value);
 *     ref.current = value;        // ← כתיבה בזמן רינדור
 *
 * היא עובדת ברוב המקרים, אבל היא שגויה תחת רינדור מקבילי: React רשאי להתחיל
 * רינדור, לזרוק אותו, ולרנדר מחדש — והכתיבה כבר קרתה. במצב פיתוח StrictMode
 * מרנדר כל רכיב פעמיים בדיוק כדי לחשוף את זה. הכלל `react-hooks/refs` סימן
 * שמונה מופעים כאלה ברכיב הזה.
 *
 * `useInsertionEffect` ולא `useEffect`: הוא רץ לפני אפקטי הפריסה ולפני
 * האפקטים הפסיביים, ולכן הערך כבר מעודכן עבור כל אפקט אחר באותו commit.
 * זהו אותו מנגנון שבו משתמש ה-polyfill הרשמי של `useEffectEvent`.
 */
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
