/**
 * deepLink.ts — קריאה וכתיבה של מצב הרכיב אל ה-hash של הכתובת.
 *
 * המטרה המעשית: מדריך שולח קישור אחד — `#area=darga&feature=cliff&mode=quiz` —
 * והלומד נוחת בדיוק על המצוק בנחל דרגות במצב תרגול. בלי זה, "פתחו את
 * הסימולטור, בחרו נחל דרגות, גללו למטה, לחצו על..." הוא ההוראה היחידה
 * האפשרית, והיא נכשלת אצל חצי מהכיתה.
 *
 * הכתיבה היא `replaceState` ולא `pushState`: כל בחירת צורה היא לא צעד
 * היסטוריה, ואחרת כפתור "אחורה" הופך לבלתי שמיש אחרי דקה של חקירה.
 */

export interface DeepLinkState {
  area?: string;
  feature?: string;
  mode?: string;
  compare?: string;
  /** מיקום הווילון / ערך המחוון באחוזים. */
  blend?: number;
}

const KEYS = ['area', 'feature', 'mode', 'compare', 'blend'] as const;

/** קורא את ה-hash. תומך גם ב-`?` וגם ב-`#` כדי לא להיתקע על צורת השילוב בקורס. */
export function readDeepLink(search = '', hash = ''): DeepLinkState {
  const out: DeepLinkState = {};
  const raw = (hash.replace(/^#/, '') || search.replace(/^\?/, '')).trim();
  if (!raw) return out;
  const params = new URLSearchParams(raw);
  for (const key of KEYS) {
    const v = params.get(key);
    if (v === null) continue;
    if (key === 'blend') {
      const n = Number(v);
      if (Number.isFinite(n)) out.blend = Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** בונה את מחרוזת ה-hash. משמיט ערכים ריקים — קישור נקי הוא קישור שנשלח. */
export function buildHash(state: DeepLinkState): string {
  const params = new URLSearchParams();
  if (state.area) params.set('area', state.area);
  if (state.feature) params.set('feature', state.feature);
  if (state.mode && state.mode !== 'explore') params.set('mode', state.mode);
  if (state.compare && state.compare !== 'wipe') params.set('compare', state.compare);
  if (state.blend !== undefined) params.set('blend', String(Math.round(state.blend * 100)));
  const s = params.toString();
  return s ? `#${s}` : '';
}

/** מעדכן את הכתובת בלי להוסיף צעד היסטוריה ובלי לגלול את הדף. */
export function writeDeepLink(state: DeepLinkState) {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const hash = buildHash(state);
  const url = window.location.pathname + window.location.search + hash;
  try {
    window.history.replaceState(window.history.state, '', url);
  } catch {
    /* דף הקורס עשוי לרוץ ב-iframe עם origin שונה — הכתובת פשוט לא תתעדכן */
  }
}

/** קישור מלא לשיתוף, כפי שהוא נראה בפועל בשורת הכתובת. */
export function shareUrl(state: DeepLinkState): string {
  if (typeof window === 'undefined') return buildHash(state);
  return (
    window.location.origin + window.location.pathname + window.location.search + buildHash(state)
  );
}
