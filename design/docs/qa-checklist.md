# רשימת בדיקת אימות עיצובי — Geo9900

מעקב עמוד-אחר-עמוד לפי `CLAUDE.md` / `checking-design-fidelity`. מסמנים ✅ רק אחרי מעבר בפועל על הסקשן (קוד + רינדור + RTL) לפי לוגיקת הבדיקה שהוגדרה בפרויקט.

מקרא: ✅ עבר בדיקת אימות · ⬜ עדיין לא נבדק

## שיעורים (`/lessons/topic-XX`)

כל שיעור בנוי מ-"סצנות" (PagedLearn, `#scene-<id>`) — מסמנים סטטוס לפי סצנה, לא לפי השיעור כולו.

### topic-01 — `/lessons/topic-01`
> **2026-09-15 — סבב איחוד שפה עיצובית לכל השיעור** (ענף `design/topic-01-unify`). כל 6 הסצנות, עמוד ה-overview והמעטפת המשותפת (טאבים, ניווט הבא/הקודם, תפריט צד, בדיקת ידע, תרגול) נבדקו מול סט חוקים אחד: היררכיית כותרות, צבעים, כפתורים ו-hover, רדיוסים וצללים, רוחב וריווח ומדיניות אייקונים. הבדיקה כללה קוד, רינדור 1440px לפני/אחרי ו-RTL.
> **נבדק אוטומטית על הקוד הממוזג:** אפס שינויי טקסט עברי, אפס שינויי תמונה (`src`/`assetId`), אפס שינויי `aria-label`/`alt`, ואפס נגיעה ב-handlers, state, גרירה או אנימציה. 21/21 אינטראקציות עובדות בלי שגיאות קונסולה, `tsc` נקי, ואין גלישה אופקית ב-1440px.
> **נשאר פתוח (ממתין להחלטת המשתמש):** 64 טקסטים שהדרגה שלהם לא חד-משמעית, בקובץ `design/docs/text-hierarchy-review-topic-01.md`. בנוסף: סבב motion נפרד, והערות ניסוח שלא נגענו בהן (ר' `design/docs/assumptions.md`).

- ✅ **hook** — `#scene-hook` — קאבר מאושר. רק יישור קלאסים לא-ויזואלי של כפתור ה-CTA (משותף לקאברים של שיעורים 1–3).
- ✅ **onboarding** — `#scene-onboarding` — הוסר zoom קבוע של 86% (⚠️ **עודכן 2026-09-16:** הוחזר בעקבות בקשת הבעלים — `SCENE_SCALE` שוב `0.86`, ר' `design/docs/assumptions.md` וקומיט `f01eb6c`): הסצנה המאושרת רונדרה קטנה ב-16% מכל השאר (הקומפוזיציה נשמרה). הוסרו סוגרי ה"כוונת" הדקורטיביים על הווידאו. בפאנל הדוגמאות ההיסטוריות המשפט של "עובדה מרכזית" כבר לא כתום, רק התווית. ReadyCallout הפך לכרטיס `.surface-elevated` (משותף לכל השיעורים). ⚠️ נשאר: שטח קרם ריק ליד הווידאו — כל תיקון ידרוש לחתוך או להתאים את הווידאו, לכן לא נגענו.
- ✅ **levels** — `#scene-levels` — הטבלה כבר לא חורגת מרוחב הסצנה (1169→1152px). כפתורי התרגול עברו ל-`.btn-primary`/`.btn-secondary`, צ'יפ התוצאה בלי צהוב, אייקוני spark הוסרו, הטקסטים ברובד הנכון ותיבות הגרירה מופרדות.
- ✅ **mdo** — `#scene-mdo` — ריווח אחיד 48px (היה 24px). הוסר רקע TopoField; אייקוני תחומים דקורטיביים בבלוק "3 דוגמאות עכשוויות" הוחלפו בתוויות (⚠️ **עודכן 2026-09-16:** הוחזר בעקבות בקשת הבעלים — עיגולי האייקונים מעל תוויות הממדים חזרו, ר' `design/docs/assumptions.md` וקומיט `f01eb6c`) וצבעי סטטוס צהוב/אדום. כפתורי הבקרה מעל התרשים ברובד טקסט אחיד. תרשים השדה והקואורדינטות שלו לא נגעו.
- ✅ **asymmetric** — `#scene-asymmetric` — ריווח 64px→48px בכל הבלוקים, כל כותרות המקטעים 30px עם פס כתום, `rounded-[3px]/[4px]` הוחלפו בסקאלה הרכה, אותו זוג כפתורים בשני התרגילים ומצב נבחר אחיד לצ'יפים. אינטראקציות ותמונות זהות.
- ✅ **recap** — `#scene-recap` — הוסרו 8 כתמי blur דקורטיביים והמספרים הכתומים במונו. תג מספור ברובד של האקורדיון, מונחים ב-T2 והגדרות ב-T4.
- ⚠️ **שינויים משותפים לכל 12 השיעורים:** ניווט הבא/הקודם, טאבי השיעור, תפריט הצד, footer ניווט השיעורים, בדיקת ידע, placeholder התרגול, ReadyCallout, RecapBanner ועמוד ה-overview. הם עכשיו באותה שפה בכל השיעורים, אבל הסצנות של שיעורים 2–12 **לא** נבדקו בסבב הזה ולכן לא סומנו.

### topic-02 — `/lessons/topic-02`
- ⬜ hook — `#scene-hook`
- ✅ **onboarding** — `#scene-onboarding` — נבדק 2026-09-15: RTL, טוקנים עיצוביים, עברית, דיוק מקצועי. תוקן: שכבת כותרת כפולה בפאנל, טעות כתיב (מתנייע→מתנייד), ניסוח לא עקבי (buildings/borders), text-pretty מיותר.
- ⬜ topography — `#scene-topography`
- ⬜ scale — `#scene-scale`
- ⬜ coordinates — `#scene-coordinates`
- ⬜ contours — `#scene-contours`
- ⬜ recap — `#scene-recap`

### topic-03 — `/lessons/topic-03`
- ⬜ hook — `#scene-hook`
- ✅ **onboarding** — `#scene-onboarding` — נבדק 2026-09-15: התאמת עיצוב/רינדור/RTL בלבד ל-topic-02 (לא בוצעה בדיקת עברית/דיוק מקצועי בסבב הזה). תוקן: גודל תגיות/תוויות/שברון באקורדיון הותאם ל-topic-02, שכבת כותרת כפולה בפאנל הוסרה (כמו התיקון ב-topic-02), min-height הפאנל וריווח לפני המפריד תוקנו לפי מדידת Playwright בפועל. **עדכון:** בלוק הדוגמאות ההיסטוריות הוחלף מרשת IntelCard ל-`HistoricalCasesPanel` ייעודי לnושא 3 (כמו ב-topic-02) — קוד ואינטראקציה נבדקו חי (Playwright), אבל 8 קבצי תמונה עדיין חסרים (`TOPIC03-ONB-HIST-{PEAK,WADI,SADDLE,BOWL}[-PREVIEW].png`, ר' `design/docs/assumptions.md`) — פלייסהולדר מוצג עד שהמשתמש יפיק אותם.
- ⬜ geology — `#scene-geology`
- ⬜ rocks — `#scene-rocks`
- ⬜ geology-forces — `#scene-geology-forces`
- ⬜ landforms — `#scene-landforms`
- ⬜ tacticalterrain — `#scene-tacticalterrain`
- ⬜ recap — `#scene-recap`

> ⚠️ ידוע: `src/lib/lesson-scenes.ts` (מטא-דאטה לעמוד `/overview`) לא מסונכרן — חסרות בו `rocks` ו-`geology-forces`. לתקן לפני שמאשרים את `topic-03/overview`.

### topic-04 — `/lessons/topic-04`
- ⬜ hook · ⬜ onboarding · ⬜ trafficability · ⬜ engineering · ⬜ cover · ⬜ vegetation · ⬜ recap

### topic-05 — `/lessons/topic-05`
- ⬜ hook · ⬜ onboarding · ⬜ los · ⬜ viewshed · ⬜ killchain · ⬜ recap

### topic-06 — `/lessons/topic-06`
- ⬜ hook · ⬜ onboarding · ⬜ principles · ⬜ planning · ⬜ combatnav · ⬜ recap

### topic-07 — `/lessons/topic-07`
- ⬜ hook · ⬜ onboarding · ⬜ climate · ⬜ sensors · ⬜ platforms · ⬜ recap

### topic-08 — `/lessons/topic-08`
- ⬜ hook · ⬜ onboarding · ⬜ loc · ⬜ tail · ⬜ infrastructure · ⬜ recap

### topic-09 — `/lessons/topic-09`
- ⬜ hook · ⬜ onboarding · ⬜ waterenergy · ⬜ chokepoints · ⬜ mahan · ⬜ recap

### topic-10 — `/lessons/topic-10`
- ⬜ hook · ⬜ onboarding · ⬜ urbanmorphology · ⬜ threedim · ⬜ civilian · ⬜ recap

### topic-11 — `/lessons/topic-11`
- ⬜ hook · ⬜ onboarding · ⬜ depth · ⬜ buffer · ⬜ borders · ⬜ recap

### topic-12 — `/lessons/topic-12`
- ⬜ hook · ⬜ onboarding · ⬜ basics · ⬜ costsurface · ⬜ network · ⬜ recap

## עמודי סיכום שיעור (`/lessons/topic-XX/overview`)
- ✅ **topic-01/overview** — נבדק 2026-09-15: רוחב 1400px→1152px כמו הסצנות, הוסרו רקע TopoField וה-wash, כותרת H1 בסקאלה של SceneHeader, כותרות המקטעים שחורות, וכרטיס "השיעור הבא" זהה לזה שבמעטפת. ⚠️ העמוד משותף — אותו שינוי חל על ה-overview של כל 12 השיעורים.
- ⬜ topic-02/overview
- ⬜ topic-03/overview *(תלוי בתיקון ה-metadata לעיל)*
- ⬜ topic-04/overview
- ⬜ topic-05/overview
- ⬜ topic-06/overview
- ⬜ topic-07/overview
- ⬜ topic-08/overview
- ⬜ topic-09/overview
- ⬜ topic-10/overview
- ⬜ topic-11/overview
- ⬜ topic-12/overview

> ⚠️ ידוע: אף מסך חי בפועל לא מקשר ל-`/overview` (עמוד הבית וכפתורי "המשך" מדלגים עליו ישר ל-player) — יש לבדוק ידנית ב-URL.

## עמודים אחרים
- ⬜ `/` — עמוד הבית (כולל אנקורים `#syllabus`, `#prototypes`)
- ⬜ `/recap-demos` — עמוד אינדקס
- ⬜ `/recap-demos/match`
- ⬜ `/recap-demos/flashcards`
- ⬜ `/recap-demos/sort`
- ⬜ `/recap-demos/quiz`

## פרוטוטיפים ציבוריים (`/prototypes/[id]`)
- ⬜ `/prototypes/terrain-3d`
- ⬜ `/prototypes/terrain-overlay`
- ⬜ `/prototypes/valley-crossing-3d`

## אזור פרוטוטיפים סודי (`/prt`, לא מקושר בניווט, מוגן סיסמה) — מחוץ לסקופ QA ציבורי אלא אם מבקשים אחרת
- ⬜ `/prt`
- ⬜ `/prt/terrain-overlay`
- ⬜ `/prt/terrain-3d`
- ⬜ `/prt/pyramid-3-levels`

## מוקאפים פנימיים לאישור עיצוב (`noindex`, לא חלק מזרימת הפרודקשן) — מחוץ לסקופ QA פונקציונלי
- ⬜ `/design-approval`
- ⬜ `/design-approval/home`
- ⬜ `/design-approval/lesson`
