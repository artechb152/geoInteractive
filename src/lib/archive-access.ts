/**
 * גישה לארכיון (/archive/ ועמודי שיעורים ארכיוניים).
 *
 * כמו /prt, זה "סוד רך": האתר הוא static export בלי שרת, כך שהבדיקה
 * מתבצעת בדפדפן והסיסמה נמצאת בבאנדל. המטרה היא להרחיק משתמש רגיל,
 * לא להגן מפני מי שקורא את הקוד.
 *
 * ב-localStorage נשמר רק זמן הכניסה ({ at }), לעולם לא הסיסמה.
 */

export const ARCHIVE_PASSWORD = 'matan';

/** ההרשאה תקפה שעה אחת מרגע הכניסה. */
export const ARCHIVE_SESSION_MS = 60 * 60 * 1000;

export const ARCHIVE_AUTH_KEY = 'archive:auth';

/** כמה מילישניות נותרו להרשאה; 0 כשאין הרשאה תקפה. */
export function archiveAccessRemainingMs(): number {
  try {
    const raw = localStorage.getItem(ARCHIVE_AUTH_KEY);
    if (!raw) return 0;
    const { at } = JSON.parse(raw) as { at: unknown };
    if (typeof at !== 'number') return 0;
    const remaining = at + ARCHIVE_SESSION_MS - Date.now();
    // זמן כניסה עתידי (שעון שהוזז / ערך מזויף) לא מאריך את ההרשאה
    return remaining > 0 && remaining <= ARCHIVE_SESSION_MS ? remaining : 0;
  } catch {
    return 0;
  }
}

export function grantArchiveAccess() {
  try {
    localStorage.setItem(ARCHIVE_AUTH_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* storage חסום — הכניסה תקפה רק לדף הנוכחי */
  }
}

export function revokeArchiveAccess() {
  try {
    localStorage.removeItem(ARCHIVE_AUTH_KEY);
  } catch {
    /* ignore */
  }
}
