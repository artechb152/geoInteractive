# isometric-asset-slot-map.md — מפת חריצי נכסים ותור-ייצור Magnific למוקאפי האישור

> **מסמך תפעולי למוקאפי `/design-approval` בלבד.** מרכז במקום אחד את כל חריצי הנכסים
> (`AssetSlot`) שהמוקאפים משתמשים בהם, את מדיניות ה-placeholder האבחוני, ואת תור
> ההפקה המומלץ ב-Magnific. לא נוגע בפרודקשן.
>
> נכתב: 2026-07-05.
>
> **מקורות סמכות (בכל סתירה — הם מנצחים את המסמך הזה):**
> [papercut-mockup-design-lock.md](papercut-mockup-design-lock.md) (§6 — חוזה `AssetSlot`
> ורישום ה-slots) ·
> [diagnostic-asset-placeholder-policy.md](diagnostic-asset-placeholder-policy.md) (מדיניות
> ה-placeholder הרועש) ·
> [ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md](../../project-knowledge/ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md) ·
> [MAGNIFIC_ASSET_PROMPTS.md](../../project-knowledge/MAGNIFIC_ASSET_PROMPTS.md) ·
> [ASSET_INTEGRATION_WORKFLOW.md](../../project-knowledge/ASSET_INTEGRATION_WORKFLOW.md)

---

## 1. טבלת חריצי נכסים (Asset Slots) למוקאפים

כל שורה = חריץ `AssetSlot` אחד. כל עוד הקובץ לא קיים תחת `public/assets/isometric/<suggested filename>`
— `AssetSlot` מרנדר אוטומטית `MissingAssetPlaceholder` (§2). אין slot שמרנדר "איור זמני מלוטש".

| asset_id | suggested filename | target path | route/screen usage | component usage | aspect ratio | transparent bg | diagnostic placeholder text | priority |
|---|---|---|---|---|---|---|---|---|
| `HOME-01` | `home-hero-terrain.png` | `public/assets/isometric/home-hero-terrain.png` | `/design-approval/home` — פאנל "מסך הקורס", לוח טרֵיין ההירו | `HeroTerrainPanel` → `AssetSlot assetId="HOME-01"` | 16/9 (וריאנט 21/9 קביל) | כן | "MISSING ASSET · נדרש Asset מ-Magnific · HOME-01 · /assets/isometric/home-hero-terrain.png" | approval-critical |
| `LESSON-01-CARD` | `lesson-01-strategy-terrain.png` | `public/assets/isometric/lesson-01-strategy-terrain.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 01 | `LessonRailCard` → `AssetSlot assetId="LESSON-01-CARD"` | 1/1 | כן | "MISSING ASSET · LESSON-01-CARD · /assets/isometric/lesson-01-strategy-terrain.png" | approval-critical |
| `LESSON-02-CARD` | `lesson-02-map-reading.png` | `public/assets/isometric/lesson-02-map-reading.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 02 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-02-CARD · /assets/isometric/lesson-02-map-reading.png" | approval-critical |
| `LESSON-03-CARD` | `lesson-03-navigation.png` | `public/assets/isometric/lesson-03-navigation.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 03 (השיעור "הנוכחי" בהדגמה) | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-03-CARD · /assets/isometric/lesson-03-navigation.png" | approval-critical |
| `LESSON-04-CARD` | `lesson-04-landforms.png` | `public/assets/isometric/lesson-04-landforms.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 04 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-04-CARD · /assets/isometric/lesson-04-landforms.png" | approval-critical |
| `LESSON-05-CARD` | `lesson-05-mobility.png` | `public/assets/isometric/lesson-05-mobility.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 05 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-05-CARD · /assets/isometric/lesson-05-mobility.png" | approval-critical |
| `LESSON-06-CARD` | `lesson-06-los.png` | `public/assets/isometric/lesson-06-los.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 06 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-06-CARD · /assets/isometric/lesson-06-los.png" | approval-critical |
| `LESSON-07-CARD` | `lesson-07-weather.png` | `public/assets/isometric/lesson-07-weather.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 07 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-07-CARD · /assets/isometric/lesson-07-weather.png" | approval-critical |
| `LESSON-08-CARD` | `lesson-08-logistics.png` | `public/assets/isometric/lesson-08-logistics.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 08 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-08-CARD · /assets/isometric/lesson-08-logistics.png" | approval-critical |
| `LESSON-09-CARD` | `lesson-09-chokepoints.png` | `public/assets/isometric/lesson-09-chokepoints.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 09 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-09-CARD · /assets/isometric/lesson-09-chokepoints.png" | approval-critical |
| `LESSON-10-CARD` | `lesson-10-urban.png` | `public/assets/isometric/lesson-10-urban.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 10 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-10-CARD · /assets/isometric/lesson-10-urban.png" | approval-critical |
| `LESSON-11-CARD` | `lesson-11-borders.png` | `public/assets/isometric/lesson-11-borders.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 11 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-11-CARD · /assets/isometric/lesson-11-borders.png" | approval-critical |
| `LESSON-12-CARD` | `lesson-12-gis-layers.png` | `public/assets/isometric/lesson-12-gis-layers.png` | `/design-approval/home` — מסילת כרטיסי שיעור, כרטיס 12 | `LessonRailCard` | 1/1 | כן | "MISSING ASSET · LESSON-12-CARD · /assets/isometric/lesson-12-gis-layers.png" | approval-critical |
| `UI-COMPASS-ROSE` | `ui-compass-rose.png` | `public/assets/isometric/ui-compass-rose.png` | שני המוקאפים — אמבלמת ההירו בבית + אייקון header בשיעור | `CompassEmblem` **נשאר SVG inline כברירת מחדל**; ה-slot מוצג רק אם/כש ייקבע להחליף | 1/1 | כן | "MISSING ASSET · UI-COMPASS-ROSE · /assets/isometric/ui-compass-rose.png" | optional |
| `UI-CONTOUR-BG` | `ui-contour-paper-texture.webp` | `public/assets/isometric/ui-contour-paper-texture.webp` | רשות — רקע-על לקנבס בשני המוקאפים, כתחליף ל-`ContourBackdrop` הווקטורי | `ContourBackdrop` (motifs.tsx) **נשאר SVG כברירת מחדל**; slot רשות בלבד, `fit="cover"` מוצהר | 16/9 | לא (רקע מלא) | "MISSING ASSET · UI-CONTOUR-BG · /assets/isometric/ui-contour-paper-texture.webp" | optional |

**הבהרה מפורשת — `MapBoardMock` (מסך השיעור) אינו asset slot:**
לוח המפה בנוי מ-2 שכבות קבועות ולא ראסטריות: (1) `MapBoardBackground` — SVG טופ-דאון קבוע
ברמת גימור מלאה (design-lock §5.3), (2) שכבת סמנטיקה — ציר A→B, סמני A/B, תוויות, מקרא
ומחווני התקדמות — **תמיד React/SVG/HTML**, לעולם לא נכס Magnific. אין ל-`MapBoardMock`
`asset_id`, אין לו slot, ואין לפתוח לו אחד בלי לרשום קודם מזהה נכס ייעודי חדש (למשל
`LESSON-03-MAP`) במסמכי ה-Magnific — ראו design-lock §3.7/§6.2.

**תזכורת נעולה:** נכסים מיוצרים (Magnific) לעולם לא מכילים טקסט עברי או אנגלי. כל עברית
במוקאפים — כותרות, קיקרים, תוויות שיעור, אזימוט/מרחק, מקרא, מחווני התקדמות — היא HTML/React
אמיתי שיושב מעל/סביב הנכס, לא מודפס בתוכו.

---

## 2. מדיניות placeholder אבחוני

מקור מלא: [diagnostic-asset-placeholder-policy.md](diagnostic-asset-placeholder-policy.md).
תמצית מחייבת:

- **חסר = רועש ובוטה, בכוונה.** `MissingAssetPlaceholder` מציג פסי אזהרה
  מגנטה/צהוב/שחור, טקסט "MISSING ASSET" / "נדרש Asset מ-Magnific", ואת `assetId`
  והנתיב הצפוי גלויים על גבי הבלוק עצמו.
- **הכוונה:** למנוע מהצופה במוקאפ לחשוב שאיור-placeholder זמני *הוא* הנכס הסופי,
  מה שעלול להוביל לאישור עיצוב שלא ייצג נכון את מה שיחזור בפועל מ-Magnific.
- **תחום תוקף:** placeholder רועש כזה מותר **אך ורק** תחת `/design-approval`
  (`src/components/design-approval/`, `src/app/design-approval/`). אסור בהחלט
  שהוא יגיע לרכיב פרודקשן כלשהו.
- **היעלמות אוטומטית:** ברגע שהקובץ מונח בשם המדויק תחת `public/assets/isometric/`,
  `<img>` נטען בהצלחה (`onLoad`), הסטטוס עובר ל-`ready`, וה-`MissingAssetPlaceholder`
  נעלם — בלי לשנות פריסה (המיכל שומר על ה-`aspect` הקבוע לכל אורך הדרך, אפס CLS).
- **לא נוגע ברכיבי סמנטיקה אמיתיים** — `MapBoardBackground`, `ContourBackdrop`,
  `DotGrid`, `CompassEmblem`/`CompassRose`, `RouteMotif`, כל מד-התקדמות, כפתור, וכל
  קו/סמן/מקרא בתוך המוקאפים ממשיכים להיות מצוירים ב-React/SVG ברמת גימור מלאה,
  בלי שום סגנון אזהרה.

---

## 3. תור עדיפויות להפקה ב-Magnific

### מנת הפקה ראשונה (Batch 1)

1. `HOME-01` — `home-hero-terrain.png`
2. `LESSON-03-CARD` — `lesson-03-navigation.png`
3. `UI-COMPASS-ROSE` — `ui-compass-rose.png` (אם מוחלט לייצר; אחרת נשאר SVG)
4. `LESSON-02-CARD` — `lesson-02-map-reading.png`
5. `LESSON-04-CARD` — `lesson-04-landforms.png`

### מנת הפקה שנייה (Batch 2)

כל שאר נכסי כרטיסי השיעור: `LESSON-01-CARD`, `LESSON-05-CARD` עד `LESSON-12-CARD`
(`lesson-01-strategy-terrain.png`, `lesson-05-mobility.png` … `lesson-12-gis-layers.png`).

### מאוחר יותר (מחוץ לסקופ המוקאפים הנוכחי)

- 12 נכסי Hook רחבים (`LESSON-NN-HOOK`, §C ב-MAGNIFIC_ASSET_PROMPTS.md).
- אריחי מדור / אייקוני כרטיס-Feature נוספים (`HOME-02`…`HOME-06`).
- רקע פאנל התקדמות (`HOME-07` — `home-progress-panel-bg.webp`).
- `UI-CONTOUR-BG` — רשות, רק אם יוחלט להחליף את `ContourBackdrop` הווקטורי.

---

## 4. צ'קליסט קבלה (Acceptance) לכל תוצאת Magnific

לפני שמכניסים קובץ שהתקבל ל-`public/assets/isometric/`, כל נכס חייב לעבור:

- [ ] אין טקסט בתוך התמונה — לא עברית, לא אנגלית, לא "גיבריש" שנראה כמו טקסט
- [ ] אין watermark ואין לוגו
- [ ] פלטה נכונה: קרם `#FFFBF7`, חול חם `#C2A26B`, זית `#7A8A3F`, מרווה `#749C75`/`#5B7C5C`,
      פחם `#3a3a3a`, כתום `#EB9E48` כמוקד יחיד בלבד — אפס גוון שרירותי מחוץ לפלטה
- [ ] חומר מאט — פייפרקאט/חימר (matte paper/clay) — לא פלסטיק מבריק, לא צעצוע
- [ ] קריא בגודל כרטיס קטן (thumbnail, ~56px) — נבדק בפועל, לא רק "בעין"
- [ ] זווית עקבית: איזומטרי, 30–45 מעלות מלמעלה, אחידה מול שאר הסט
- [ ] אין בני-אדם/פרצופים, אין אלימות (דם/קרב/נשק תקריב)
- [ ] אין כרום ממשק חיצוני (UI chrome, screenshot, מסגרות מכשיר וכו')
- [ ] עובד ויזואלית על צלחת רקע קרם `bg` (#FFFBF7) — אין שוליים/גימור שמתנגשים איתה
- [ ] לא מחליף ולא מתחרה במפה/תרשים סמנטי מדויק — נשאר נכס אווירה/אובייקט בלבד

---

## 5. כללי דחייה (Rejection Rules)

יש לדחות ולהפיק מחדש (או לחתוך את האזור הבעייתי) נכס שבו מתקיים אחד מאלה:

- מכיל טקסט עברי או אנגלי, כולל "גיבריש" דמוי-טקסט על מפות/שלטים/דגלים.
- הצבעים סוטים מהפלטה הנעולה (§4.1 בנעילה) — כולל גוון כתום/ירוק שאינו הטוקן המדויק.
- נראה משחקי/פלסטיקי — מבריק, "toy-like", low-poly, סגנון קריקטורה.
- מתנגש חזותית עם תמונות הרפרנס הקיימות (`referenceImageDesign.png`, סולם הדיורמה
  ב-`Hero.tsx`) מבחינת זווית/תאורה/מרקם.
- מכיל תוויות/סימוני מפה, מסלול, קואורדינטות או מדידה שאינם נכונים או עלולים ללמד
  סמנטיקה שגויה (למשל ציר שנראה כמו מסלול אמיתי עם כיוון/מרחק מובנה בתוך הנכס עצמו).
- נראה כמו ממשק פרודקשן גמור (מסך, כפתורים, טקסט UI) ולא כמו נכס-אובייקט מבודד.

---

## 6. הערות אינטגרציה

- כל הנכסים יושבים תחת `public/assets/isometric/` בלבד — kebab-case, בלי רווחים,
  בלי אותיות גדולות, בלי עברית בשם הקובץ (מוסכמת השמות המלאה: MAGNIFIC_ASSET_PROMPTS.md).
- **אין URL חיצוני/CDN** לעולם — שובר את היעד ה-offline של LMS/SCORM (`output: 'export'`).
- `alt` עברי מלא ותיאורי חובה על כל `<img>` (לא "image1"/גנרי) — ראו הדוגמה בחוזה
  `AssetSlot` בנעילה (§6.1).
- יחס גובה-רוחב יציב חובה לכל slot (`aspect-[...]` על המיכל) — אפס Layout Shift
  ברגע שההחלפה מהמצב "חסר" ל"קיים" מתרחשת.
- **לעולם לא להחליף תרשים/סימולציה SVG/React מדויקים בנכס ראסטר** — `MapBoardBackground`,
  כל תרשים עם מקרא/חצים סמנטיים, וכל סימולציה אינטראקטיבית עתידית (`ViewshedScene`,
  `CombatNavScene` וכדומה) נשארים מחוץ לתחום לנצח, גם אחרי שכל הנכסים למעלה מיוצרים.
- שילוב בפועל של קובץ שחזר מ-Magnific ל-slot תמיד לפי
  [ASSET_INTEGRATION_WORKFLOW.md](../../project-knowledge/ASSET_INTEGRATION_WORKFLOW.md)
  (שלבים מדורגים: בית → כרטיסי שיעור → hooks → recap).

---

### קבצים קשורים

- [papercut-mockup-design-lock.md](papercut-mockup-design-lock.md) — נעילת העיצוב המלאה למוקאפים.
- [diagnostic-asset-placeholder-policy.md](diagnostic-asset-placeholder-policy.md) — מדיניות ה-placeholder הרועש.
- [ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md](../../project-knowledge/ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md)
- [MAGNIFIC_ASSET_PROMPTS.md](../../project-knowledge/MAGNIFIC_ASSET_PROMPTS.md)
- [ASSET_INTEGRATION_WORKFLOW.md](../../project-knowledge/ASSET_INTEGRATION_WORKFLOW.md)
