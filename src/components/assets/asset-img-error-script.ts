/**
 * סקריפט inline ל-<head> של ה-layout, בשביל IsometricAsset.
 *
 * אירועי load/error של תמונה לא מבעבעים, אבל נתפסים ב-capture על document —
 * כבר מהפריים הראשון, לפני ש-React עושה hydration ומחבר onLoad/onError.
 * תמונת נכס (`img[data-asset-img]`) מסומנת:
 *   - `data-asset-loaded` — משטח הטעינה שמאחוריה מוסתר ב-CSS מיד, כך
 *     שתמונה זמינה לא חושפת אותו אף פעם (גם כשה-hydration איטי).
 *   - `data-asset-failed` — התמונה מוסתרת ב-CSS, בלי אייקון תמונה-שבורה,
 *     עד ש-React מחליף אותה בחלופה.
 * בלי רשת ובלי תלות: עובד ב-static export / LMS offline.
 *
 * מודול נפרד (לא 'use client') כדי שה-layout, שהוא Server Component, יקבל
 * את המחרוזת עצמה ולא client reference.
 */
export const ASSET_IMG_ERROR_SCRIPT =
  "(function(){function m(a){return function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.hasAttribute('data-asset-img'))t.setAttribute(a,'')}}document.addEventListener('load',m('data-asset-loaded'),true);document.addEventListener('error',m('data-asset-failed'),true)})();";
