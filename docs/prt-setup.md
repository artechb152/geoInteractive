# עמוד `/prt` — אזור פרוטוטייפים מוגן + קבלת הערות

עמוד סודי לשיתוף פרוטוטייפים לבדיקה, מאחורי סיסמה, עם כפתור משוב צף
ששולח הערות ישירות ל-Google Sheet שלך.

## איך זה עובד

- **גישה:** רק על־ידי הקלדת הכתובת `/prt` ישירות. העמוד לא מקושר משום מקום
  באתר ומסומן `noindex` (לא ייכנס לגוגל).
- **סיסמה:** `matan`. נבדקת בדפדפן (האתר סטטי), נשמרת ל-24 שעות במכשיר
  (`localStorage`), ואז צריך להזין שוב. לשינוי הסיסמה/משך הזמן ערוך את
  `src/lib/prt-config.ts` (`PRT_PASSWORD`, `PRT_SESSION_HOURS`).
- **פרוטוטייפים:** כל ריבוע מתאר פרוטוטייפ; לחיצה פותחת אותו ב-`/prt/<id>`.
  הרשימה מוגדרת ב-`src/lib/prt-prototypes.ts`.
- **הערות:** כפתור עגול בפינה הימנית-תחתונה. כל הערה נשלחת ל-Google Sheet
  (ללא הרשמה). היעד מוגדר ב-`NOTES_ENDPOINT`.

## הגדרת קבלת ההערות ל-Google Sheet (פעם אחת)

1. צור גיליון חדש ב-https://sheets.google.com (שם לבחירתך).
2. בתפריט: **Extensions → Apps Script**.
3. מחק את הקוד הקיים והדבק את הקוד מ-`docs/prt-notes.gs` (למטה). שמור (💾).
4. למעלה: **Deploy → New deployment**.
   - גלגל השיניים → בחר **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone` ← חובה, כדי שמבקרים אנונימיים יוכלו לשלוח.
   - **Deploy** → אשר את ההרשאות (Authorize access → בחר חשבון → Advanced →
     Go to … → Allow).
5. העתק את ה-**Web app URL** (מסתיים ב-`/exec`).
6. הדבק אותו באחת משתי דרכים:
   - **הכי פשוט:** ב-`src/lib/prt-config.ts`, בתוך המרכאות של `NOTES_ENDPOINT`
     (זו לא סיסמה — אפשר להעלות אותו ל-git בלי חשש).
   - **או דרך Vercel:** Settings → Environment Variables → הוסף
     `NEXT_PUBLIC_NOTES_ENDPOINT` עם ה-URL, ובצע Redeploy.

> כשתעדכן את קוד ה-Apps Script בעתיד — חובה **Deploy → Manage deployments →
> ערוך → Version: New version**, אחרת השינוי לא נכנס לתוקף תחת אותו URL.

### למה הווידג'ט לא מקבל "אישור" מהשרת?

Apps Script לא מחזיר כותרות CORS, לכן הווידג'ט שולח ב-`mode: 'no-cors'`.
זה אומר שהדפדפן שולח את ההערה בהצלחה אבל לא יכול לקרוא את התשובה — ולכן
הווידג'ט מציג "נשלח" אופטימית. ההערה עדיין מגיעה לגיליון. אם רוצים אימות
חזק יותר אפשר לעבור לפונקציית Vercel (חורג מ-export סטטי).

### מייל על כל הערה (אופציונלי)

בקוד ה-Apps Script, בטל את ההערה מהשורה של `MailApp.sendEmail(...)` כדי לקבל
מייל לכל הערה חדשה בנוסף לשורה בגיליון.

## הוספת הפרוטוטייפ השלישי (פירמידה)

1. שכפל לתוך הפרויקט:
   ```
   git clone https://github.com/idog2210/Pyramid3LevelsPrototype01 prototypes/pyramid-3-levels
   ```
2. עדכן אותי — אקרא את ה-README, אכתוב כותרת + תיאור, ואבנה:
   ```
   npm run prototypes:build
   ```
   (כבר רשום ב-`scripts/build-prototypes.mjs`; ידלג אם התיקייה חסרה.)
3. אוסיף כרטיס ל-`src/lib/prt-prototypes.ts` והוא יופיע אוטומטית ב-`/prt`.
