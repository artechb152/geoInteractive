# רשימת בדיקת אימות עיצובי — Geo9900

מעקב עמוד-אחר-עמוד לפי `CLAUDE.md` / `checking-design-fidelity`. מסמנים ✅ רק אחרי מעבר בפועל על הסקשן (קוד + רינדור + RTL) לפי לוגיקת הבדיקה שהוגדרה בפרויקט.

מקרא: ✅ עבר בדיקת אימות · ⬜ עדיין לא נבדק

## שיעורים (`/lessons/topic-XX`)

כל שיעור בנוי מ-"סצנות" (PagedLearn, `#scene-<id>`) — מסמנים סטטוס לפי סצנה, לא לפי השיעור כולו.

### topic-01 — `/lessons/topic-01`
- ⬜ hook — `#scene-hook`
- ⬜ onboarding — `#scene-onboarding`
- ⬜ levels — `#scene-levels`
- ⬜ mdo — `#scene-mdo`
- ⬜ asymmetric — `#scene-asymmetric`
- ⬜ recap — `#scene-recap`

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
- ⬜ topic-01/overview
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
