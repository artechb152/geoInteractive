import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatestRef } from './useLatestRef';

/**
 * useLocalState — מצב שנשמר בין רענוני דף, במרחב-שם ייעודי כדי לא להתנגש
 * בשום דבר אחר בדף הקורס. נכשל בשקט כשהאחסון חסום (מצב פרטי / iframe נעול)
 * ומתנהג אז כמו useState רגיל.
 */
const NS = 'tms:v1:';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(NS + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/**
 * `override` גובר על הערך השמור.
 *
 * הבאג שזה מתקן: קישור עמוק ‎`#area=darga`‎ עבד רק אצל מי שמעולם לא פתח את
 * הרכיב. אצל כל לומד חוזר, האזור השמור ב-localStorage ניצח את הכתובת בשקט —
 * כלומר מדריך ששלח קישור לצורה מסוימת קיבל דיווח ש"זה לא עובד" מחצי הכיתה
 * בלבד, וזה סוג הבאג שנראה כמו טעות של המשתמש. הכתובת מפורשת יותר מהזיכרון,
 * ולכן היא מנצחת.
 */
export function useLocalState<T>(key: string, initial: T, override?: T | null) {
  const [value, setValue] = useState<T>(() =>
    override !== undefined && override !== null ? override : read(key, initial),
  );
  const keyRef = useLatestRef(key);

  useEffect(() => {
    try {
      window.localStorage.setItem(NS + keyRef.current, JSON.stringify(value));
    } catch {
      /* אחסון חסום — ממשיכים בזיכרון בלבד */
    }
  }, [value, keyRef]);

  return [value, setValue] as const;
}

/** מוחק את כל המצב השמור של הרכיב ("אפס התקדמות"). */
export function clearStoredState() {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(NS)) doomed.push(k);
    }
    doomed.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* אין אחסון — אין מה למחוק */
  }
}

/**
 * useAnnounce — תור הכרזות ל-aria-live. הכרזה זהה ברצף לא נקראת שוב ע"י
 * קוראי מסך, ולכן מוסיפים תו רווח בלתי-נראה כדי לאלץ שינוי טקסט.
 */
export function useAnnounce() {
  const [message, setMessage] = useState('');
  const flip = useRef(false);
  const announce = useCallback((text: string) => {
    flip.current = !flip.current;
    setMessage(text ? text + (flip.current ? '' : '​') : '');
  }, []);
  return { message, announce };
}
