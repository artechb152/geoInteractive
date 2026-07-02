# COURSE_STATE_INVENTORY.md — מצב הקורס הנוכחי

> ⚠️ **זהו מסמך מצב, לא מסמך עקרונות.** הוא מתאר את הקורס **כפי שהוא כרגע** ומתיישן.
> העקרונות הקבועים חיים ב-COURSE_DNA / CONTENT / VISUAL / INTERACTION / LESSON_STRUCTURE.
> נכון לכתיבה: יולי 2026. עומק האימות מסומן — חלק נקרא לעומק, חלק הוסק ממבנה הקבצים.

---

## סקירה כללית

- **סטאק:** Next.js + React + TypeScript + Tailwind (`output: 'export'` → סטטי ל-LMS/SCORM).
- **שפה:** עברית, RTL. פונטים: Heebo (גוף), Rubik (כותרות), mono (נ״צ/אזימוט).
- **מבנה טכני:** כל שיעור = תיקייה `src/components/lessons/topic-XX/` עם רכיב
  `TopicNNLesson` שמזין סצנות ל-`PagedLearn`. מטא-דאטה ב-`src/lib/lessons.ts`,
  שאלות ב-`src/lib/quizzes.ts`, תוכן גולמי ב-`content/topic-XX.md`.

## השיעורים הקיימים, לפי הסדר (topic-01 … topic-12)

מקור: `src/lib/lessons.ts` (מטרות מלאות שם) + מבנה קבצי הסצנות.

| # | שיעור | קושי | אינטראקציה מיועדת | סצנות תוכן עיקריות (קבצים) |
|---|---|---|---|---|
| 01 | מבוא: מרחב, כוח, אסטרטגיה, רמות מלחמה | foundation | `concept-cards` | Levels, MDO, Asymmetric *(+ TerrainCanvas — R3F תלת-ממד)* |
| 02 | יסודות קרטוגרפיה וקריאת מפות | foundation | `map-explorer` | Scale, Coordinates, Contours, Topography *(+ ContourCake3D)* |
| 03 | ניווטים: אזימוט ותכנון ציר | foundation | `navigation-sim` | Principles, Planning, CombatNav |
| 04 | טופוגרפיה ומורפולוגיית שטח | intermediate | `terrain-classifier` | Geology, Landforms, TacticalTerrain |
| 05 | ניידות ותמרון: עבירות, כיסוי, תכסית | intermediate | `mobility-grid` | Trafficability, Engineering, Cover, Vegetation |
| 06 | קווי ראייה ותצפית (LOS/Viewshed) | intermediate | `los-simulator` | LOS, Viewshed, KillChain |
| 07 | אקלים, מזג אוויר ועונתיות | intermediate | `weather-impact` | Climate, Sensors, Platforms |
| 08 | תשתיות וגיאוגרפיה של לוגיסטיקה | intermediate | `supply-chain` | Infrastructure, LOC, Tail |
| 09 | משאבים, אנרגיה וגיאו־כלכלה | advanced | `chokepoint-map` | Chokepoints, Mahan, WaterEnergy |
| 10 | לחימה בשטח בנוי (Urban / MOUT) | advanced | `urban-3d` | UrbanMorphology, ThreeDim, Civilian |
| 11 | גבולות, עומק אסטרטגי ואזורי חיץ | intermediate | `border-strategy` | Depth, Buffer, Borders |
| 12 | GIS יישומי לניתוח מבצעי | advanced | `gis-layers` | Basics, CostSurface, Network |

בכל שיעור, בנוסף לסצנות התוכן: **HookScene, OnboardingScene, RecapScene, SceneHeader**
(re-export של הרכיב המשותף), ורכיב ה-`TopicNNLesson`.

## אינטראקציות/ויזואליות קיימות לפי שיעור

- **13 סוגי `InteractionKind`** מוגדרים ב-`lessons.ts`; המטריצה המלאה + נימוק "למה דווקא
  זה" ב-`docs/instructional-briefs.md`.
- **תלת-ממד אמיתי (R3F/three):** topic-01 (`TerrainCanvas`, סצנת POV תלת-ממדית),
  topic-02 (`ContourCake3D`), topic-10 (`ThreeDimScene`).
- **סצנות למידה אינטראקטיביות מלאות שנקראו לעומק ומאומתות:**
  - `topic-06/ViewshedScene` — מפת גריד עם חישוב LOS אמיתי (`isVisibleFrom`/`terrainHeight`),
    הזזת עד 3 תצפיתנים, מצב בודד/מצטבר, מד כיסוי חי, InsightCards.
  - `topic-03/CombatNavScene` — לוח-הסבר + accordion 3 טכניקות, תרשימי SVG מותאמים.
- שאר סצנות התוכן: תבנית SceneHeader + לוח/כרטיסים *(הוסק ממבנה הקבצים; לא כל אחת נקראה)*.

## דפים נוספים בפרויקט

- דף בית + סילבוס (`src/app/page.tsx`, `LessonCard`).
- עמוד `/prt` (או `/prototypes/<id>`) — 3 פרוטוטייפים מוטמעים כ-iframe לתיקיית embed
  (ראו commits 835a497, fca4ead), עם כפתור הערות. *(מוגן.)*

## דפוסים חוזרים שכדאי לשמר

1. **שלישיית Hook → Onboarding → … → Recap** בכל שיעור.
2. **SceneHeader משותף** (מקור אמת יחיד, כל topic עושה re-export).
3. **תבנית לוח-הסבר + accordion** (CombatNav) ו**מפת-גריד + בקרות + מד** (Viewshed).
4. **InsightCard** ל"מאחורי הקלעים"/"אתגר".
5. **הילת-קו לבנה** (`paintOrder="stroke"`) על כל תווית SVG — טכניקת אנטי-חפיפה.
6. **easeSnap** `cubic-bezier(0.22,1,0.36,1)` בכל האנימציות, `whileInView once`.
7. **PagedLearn** עם TOC, שמירת מצב ב-hash, אירועי `learn:next/prev`.
8. **מטרות בפועל פעולה** ב-`lessons.ts`; **Quiz MCQ + רציונל** ב-`quizzes.ts`.

## בעיות ידועות ואזורים חלשים

### חוסר-עקביות בתיעוד (לתקן/לשים לב)
- 🔴 **`docs/design-system.md` מיושן** — מתאר טון **כהה** (`#0a0e14`, זהב `#d4a72c`)
  מהעידן שלפני המעבר לפלטה הבהירה. **מקור האמת לצבעים: `tailwind.config.ts` +
  `docs/palette.md`.** כדאי לעדכן או לסמן את המסמך כ-deprecated.
- 🟠 **13 מול 12 שיעורים:** `README.md` ו-`docs/instructional-briefs.md` מדברים על
  **13 שיעורים** (השיעור ה-13 = "GIS מבצעי"). בפועל בנויים **12** (topic-01…12), ו-GIS
  הוא topic-12. `InteractionKind` והמטריצות עדיין מונים 13. יש ליישר את הספירה.
- 🟠 **הסילבוס במסמך המקור שונה מהבנוי:** `קובץ שאפשר לשנות.md` (מסמך המקור המלא) כולל
  נושאים שלא נבנו כשיעור נפרד (למשל "פוטוגרמטריה") וממספר נושאים אחרת. הקורס הבנוי הוא
  **מיפוי-מחדש/תמצית** של המקור — זה תקין, אבל אל תניח התאמה 1:1 בין המסמך לקוד.

### חוב מצב/סגנון
- 🟡 **טוקנים מהעידן הכהה + terrain** עדיין ב-`tailwind.config.ts` (`terrain-*`,
  `status-*`, `accent-cool/intel`). חלקם בשימוש לגיטימי באיורים; חלקם שאריות. לא לנקות
  בלי בדיקה — נעשה בהם שימוש בתוך SVG.
- 🟡 **`accent-deep` misnomer:** הטוקן נקרא `deep` אבל ערכו הוא הכתום ה**בהיר** ביותר
  (`#F7CFA0`) — שם נשמר לתאימות לאחור. לא לשנות שם בלי מעבר גלובלי.

### פוליש תוכן (נמצא ב-`topic-03/CombatNavScene.tsx`, כדאי לסרוק דומים)
- 🟡 **רווחים חסרים סביב מירכאות** בטקסט עברי: `מנווטים"על עיוור"`, `שנקרא"אזימוט"`,
  `בשפה המקצועית שטח"חסר תכסית"`.
- 🟡 **תווים תלושים** בסוף מחרוזת דוגמה: `…מגיעים בדיוק ליעד המתוכנן.ד` ו-`…סוד ההצלחה … "לקרוא" את השטח. ` (רווח/אות עודפים).
- 🟡 **`icon: 'route' as never, // Not used`** — האק טיפוסים קטן ב-`MethodData` של handrail.

*(אלה נמצאו בקובץ אחד שנקרא לעומק — סביר שדפוסים דומים קיימים בסצנות אחרות; שווה סריקה
ממוקדת של מחרוזות עברית עם מירכאות דבוקות.)*

### אזורים לאימות (לא נבדקו לעומק)
- מצב האינטראקציות ה"ייעודיות" (`map-explorer`, `terrain-classifier`, `supply-chain`
  וכו') — לפי `docs/instructional-briefs.md` הן תוכננו כ-placeholders בתחילה; חלק מסצנות
  הלמידה כבר אינטראקטיביות מלאות (Viewshed), אך יש לוודא לכל שיעור אם האינטראקציה
  המיועדת מומשה במלואה או שנשארה placeholder.
- אחידות RTL, קריאוּת תוויות, וחפיפות — נבדקו בשתי סצנות בלבד; שווה מעבר ויזואלי על כולן.

## אי-עקביויות לתיקון לאורך זמן

1. ליישר את ספירת השיעורים (12) בין `README.md`, `instructional-briefs.md` ל-`lessons.ts`.
2. לעדכן/להוציא משימוש את `docs/design-system.md` הכהה.
3. סריקת פוליש עברית (מירכאות דבוקות, תווים תלושים) על כל מחרוזות הסצנות.
4. מיפוי מלא: לכל שיעור — האם האינטראקציה המיועדת מומשה או placeholder.
5. תיעוד עקבי של המינוח החוצה-שיעורים (LOS ב-06 ו-12; Cover/Concealment; שטח מת).
