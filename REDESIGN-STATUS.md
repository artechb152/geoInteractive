# REDESIGN-STATUS.md — סטטוס ה-Redesign המלא (V2)

> קובץ המשך-עבודה. אם הסשן נקטע — ממשיכים מכאן, מכל מחשב.
> עודכן לאחרונה: 2026-07-06, עצירה יזומה (קרדיטים) אחרי: V2 מיושם על כל המסכים,
> build ירוק, כל 25 נכסי Magnific בדיסק. **מה שנשאר: בעיקר QA ויזואלי וליטוש.**
>
> **המשך מהמחשב האחר:** `git clone https://github.com/artechb152/geoInteractive.git`
> → `npm install` → `npm run dev` → http://localhost:3000 — ואז סעיף 4 למטה.

---

## 1. מה המשימה

Redesign גמור לכל האתר לפי `project-knowledge/lesson-shell-design-system.md`:
- **בלי לגעת בתוכן הלימודי, בסדר הסצנות, באינטראקציות וב-Quiz.**
- פלטה מחייבת: קרם `#FFFBF7` / לבן / מרווה `#749C75`+`#5B7C5C` / כתום `#EB9E48` (טוקנים קיימים ב-tailwind, אין HEX חדשים).
- פונטים: Heebo (גוף) / Rubik (כותרות) / mono (ספרות).

### היסטוריה חשובה
- **V1** נבנה קודם (מעטפת שיעור, Overview, דף בית, header) — עבד ונבנה בהצלחה,
  אבל המשתמש פסל: *"נראה כמעט בדיוק כמו העיצוב הקודם"*.
- **V2 (הנוכחי)** — שפה ויזואלית חדשה לגמרי: **"שולחן מפות מבצעי"**.
  לגרוס כל ביטוי ויזואלי ישן; התוכן קדוש.

## 2. שפת V2 — החתימות הוויזואליות

| חתימה | מימוש | איפה |
|---|---|---|
| פלטות אוקטגון (פינות קטומות) | `.oct` / `.oct-sm` ב-globals.css (`--notch`) | כפתורים, chips, badges |
| פאנלים חדים | `.surface` / `SurfaceCard` — radius 3px, מסגרת `brand-dark/20`, צל `shadow-paper` | כל הכרטיסים |
| סוגריים-מסגרת בפינות | `FrameCorners` (ui/FrameCorners.tsx) | לוחות מרכזיים, מסגרות asset |
| שדה קווי-גובה דקורטיבי | `TopoField` (ui/TopoField.tsx) | רקעי Hero ורצועות |
| מספר-מתאר ענק | `.outline-numeral` (WebkitTextStroke מרווה) | Hero שיעור, כרטיסי סילבוס |
| פסי פיקוד מרווה-כהה | `bg-brand-dark text-bg` — נקודתי בלבד | קומת-על ב-header, utility bar |
| טאבי תיקייה | `.tab-folder` (clip-path טרפז) | LessonTabs (טרם מומש) |
| waypoints מעוינים + ציר מקווקו | rotate-45 + border-dashed | TOC, ProgressBar (ראש מעוין) |
| מוביל נקודות (dossier) | `.dotted-leader` | שורות מטא |
| eyebrow עם מעוין | `.section-eyebrow` (::before מעוין כתום) | כותרות סקשן |

## 3. מה בוצע ✅

### תשתית V2 (הושלם)
- `tailwind.config.ts` — נוסף `shadow-paper`.
- `src/app/globals.css` — נכתב מחדש: כל ה-utilities של סעיף 2, `--header-h`
  (3.5rem מובייל / 5rem דסקטופ), `.surface`/`.chip`/`.btn-*` הישנים קיבלו את שפת V2
  (כך סצנות קיימות מקבלות reskin אוטומטי).
- `src/app/layout.tsx` — AppHeader חדש + `pt-[var(--header-h)]`.
- `src/components/ui/` — **נכתבו ב-V2**: `Button` (פלטות אוקטגון, secondary עם
  מסגרת-מדומה), `SurfaceCard` (+prop `frame`), `ProgressBar` (מסילת-שנתות + ראש מעוין),
  `StatusChip` (חותמות, כולל tone `command`), `IconBadge`, `FrameCorners`, `TopoField`,
  `BrandEmblem` (מצפן SVG), `PageShell`, `AppHeader` (דו-קומתי: פס פיקוד מרווה-כהה
  עם GEO-9900 + שורת מותג + ניווט ממוספר).
- `src/components/landing/ContinueLearningButton.tsx` — משתמש ב-Button החדש, מקבל size/className.
- `src/components/landing/Navbar.tsx` — **נמחק** (הוחלף ב-AppHeader).
- `src/components/prt/*` — עודכן ל-`var(--header-h)`.

### מבנה ולוגיקה (הושלם ב-V1, תקף גם ל-V2)
- `src/lib/lesson-scenes.ts` — **חדש**: מפת סצנות לכל 12 השיעורים, `interactionLabels`,
  `difficultyLabels`, `lessonAssets` (נתיבי card+hook לכל שיעור; hooks הם **.png** — שונה
  מהמסמך שציין .webp, כי Magnific מחזיר PNG).
- `src/components/lesson/scene-context.ts` — SceneStepContext (chip "סצנה X מתוך Y").
- `src/components/lesson/PagedLearn.tsx` — נכתב מחדש: TOC בגריד (לא drawer צף),
  SceneCard, SceneNavigation, שמירת hash/deep-link, אירועי `learn:next/prev/scene-change`,
  last-visit — הכל נשמר.
- `src/components/lesson/LessonShell.tsx` — נכתב מחדש: Breadcrumb → Hero → StatsBar →
  Tabs → תוכן → UtilityBar; מאזין ל-scene-change; footer prev/next בטאבי תרגול/בדיקה.
- `src/app/lessons/[topicId]/overview/page.tsx` — **דף חדש** לכל שיעור (hero דו-עמודי,
  מטרות, מבנה השיעור, דרישות קדם, שיעורים קשורים). כרטיסי הסילבוס מקשרים אליו.
- `src/components/interactive/InteractionPlaceholder.tsx` — placeholder מוצהר.
- `src/components/assets/AssetPlaceholder.tsx` + `IsometricAsset.tsx` — עטיפת נכסים
  בטוחה (fallback רועש מג'נטה אם קובץ חסר, `data-asset-*` ל-grep).

### נכסי Magnific (הושלם!) 🎨
- **כל 25 הנכסים הופקו דרך MCP של Magnific והורדו** ל-`public/assets/isometric/`:
  `home-hero-terrain.png`, `lesson-NN-<slug>.png` ×12 (1:1), `lesson-NN-<slug>-hook.png` ×12 (16:9).
- מודל: **Google Nano Banana Pro** (`imagen-nano-banana-2`), עם style-reference לתמונת
  ה-hero הראשונה לאחידות. עלות ~75 קרדיטים/תמונה, נשארו ~385K קרדיטים ב-Magnific.
- מיפוי creation-id→קובץ שמור ב-scratchpad (`asset-map.txt`) — לא קריטי, הקבצים כבר בדיסק.
- **טרם נבדק ויזואלית שכל 24 החדשים תואמים סגנון** (נבדקו רק 2 הראשונים). לבדוק ב-QA;
  אם נכס חורג (טקסט/צבע זר) — להפיק מחדש באותו פרומפט מ-`project-knowledge/magnific_prompts_style_short_no_transparent_bg.md`.

## 4. מה נשאר לעשות ⬜ (לפי סדר)

> **עדכון אחרון לפני עצירה:** סעיפים 1–5 שלמטה **בוצעו במלואם** — דף בית V2 (נכס hero
> אמיתי בתוך מסגרת גיליון-מפה + פס מקרא מרווה; קוד הדיורמה התלת-ממדית נשאר ב-Hero.tsx
> כ-`export function TerrainDiorama` לא-בשימוש, לא למחוק), כרטיסי דוסייה בסילבוס
> (מספר-מתאר, dotted-leader, פס "פתח תדריך"), כל רכיבי מעטפת השיעור V2 (LessonHero עם
> מספר-מתאר ענק, StatsBar דוסייה, טאבי-תיקייה `.tab-folder`, TOC waypoints מעוינים,
> SceneCard עם FrameCorners, SceneNavigation מעוינים, UtilityBar פס-פיקוד מרווה-כהה,
> SceneHeader חותמת "נקודת ציון"), Overview כתדריך, ו-sed חידוד פינות על כל הסצנות
> (rounded-2xl→[4px] וכו' בכל src/components/lessons + interactive + recap-demos).
> **`npx tsc --noEmit` נקי ו-`npm run build` ירוק אחרי כל אלה.**
>
> **QA ויזואלי שבוצע חלקית:** צילום דסקטופ של דף הבית אימת שהשפה החדשה חיה
> (פס פיקוד, מספור ניווט, מסגרות, TopoField). נכס ה-hero אומת שמוגש (HTTP 200)
> — בצילום נראה placeholder רק כי הצילום קדם לטעינת התמונה (1.1MB, loading=lazy).
> **כל שאר ה-QA טרם בוצע** — ראו רשימה למטה.

### ⬜ נשאר בפועל:

1. **QA ויזואלי מלא (Playwright / דפדפן):**
   - דסקטופ 1440 + מובייל 390: בית, סילבוס (#syllabus), overview של topic-03,
     שיעור topic-03 — hook, סצנה אמצעית (#scene-planning), recap, טאב תרגול, טאב
     בדיקת ידע (לענות על Quiz ולוודא נכון/שגוי/רציונל).
   - לוודא: אין overflow אופקי במובייל; טאבי התיקייה לא נשברים במובייל צר;
     המספר-המתאר הענק לא מתנגש בכותרות במסכים בינוניים; ה-TOC sticky לא נחתך;
     hash deep-link עובד; המפות/SVG לא התהפכו; ניגודיות טקסט על פס הפיקוד תקינה.
   - **לבדוק את 24 הנכסים החדשים אחד-אחד** (נבדקו רק 2): פתח כל overview
     (/lessons/topic-NN/overview/) וכל כרטיס בסילבוס. נכס עם טקסט/גיבריש/צבע זר —
     להפיק מחדש (פרומפטים ב-project-knowledge/magnific_prompts_style_short_no_transparent_bg.md,
     דרך ה-MCP של Magnific, מודל imagen-nano-banana-2, עלות ~75 קרדיטים).
2. **ליטושים צפויים אחרי QA** (השערות, לאמת מול מסך):
   - ייתכן שהמספר-המתאר ב-LessonHero/Overview גולש מעל טקסט במסכים צרים — אם כן,
     להקטין/להסתיר מתחת ל-sm.
   - כרטיס הנכס ב-LessonCard חותך תמונות 1:1 לחלון 16:9 (מכוון, cover) — לוודא שזה נראה טוב.
   - divide/מפרידים ב-RTL: המפרידים בסטטס-בר ממומשים ידנית עם border-s — לוודא כיוון.
3. **אופציונלי (שלב הבא):** רקע hook אטמוספרי — לשלב את `lessonAssets[id].hook`
   כרקע עדין בסצנות הפתיחה (HookScene) מאחורי הטקסט, opacity נמוך; וכן עמוד recap-demos
   ו-prt שלא עברו V2 מלא (ירשו חלקית דרך .surface/.btn).
4. **דוח סיכום ללקוח** לפי הפורמט של §26 במסמך העיצוב.

1. **דף בית V2** — `src/components/landing/Hero.tsx`:
   - להחליף את ויזואל הצד (כיום TerrainDiorama תלת-ממדי) ב-`IsometricAsset` של
     `home-hero-terrain.png` בתוך פאנל עם `FrameCorners` (את קוד הדיורמה להשאיר בקובץ,
     לא למחוק — הנחיה §21).
   - רקע: `TopoField` במקום topo-bg הישן. מספור/פלטות לפי שפת V2. שורת יתרונות
     כפאנל עם FrameCorners ומעוינים.
2. **סילבוס V2** — `src/components/LessonCard.tsx` + `landing/LessonsGrid.tsx`:
   כרטיס דוסייה: מספר-מתאר ענק (.outline-numeral) ברקע, thumb מהנכס האמיתי (1:1),
   חותמת קושי, מטא עם `.dotted-leader`, פס-פעולה "פתח תדריך".
3. **מעטפת שיעור V2** — הקבצים כבר קיימים, להחליף ביטוי ויזואלי:
   - `LessonHero.tsx` — briefing: מספר-מתאר ענק מאחורי הכותרת, breadcrumb כ"מסלול",
     כרטיס התקדמות כ"כרטיס ציר" עם waypoints.
   - `LessonStatsBar.tsx` — דוסייה עם `.dotted-leader` במקום גריד עמודות.
   - `LessonTabs.tsx` — טאבי תיקייה (`.tab-folder`) על קו בסיס מרווה, active עם פס כתום.
   - `LessonToc.tsx` — ציר waypoints: קו אנכי מקווקו + מעוינים (הושלם=מרווה מלא עם ✓,
     פעיל=כתום עם טבעת, עתידי=outline) + מספרי mono.
   - `SceneCard.tsx` — "גיליון מפה": `frame` (FrameCorners) + תווית mono פינתית.
   - `SceneNavigation.tsx` — פלטות V2 (Button כבר V2 — בעיקר לוודא מראה), מעוינים במרכז.
   - `LessonUtilityBar.tsx` — פס פיקוד `bg-brand-dark text-bg` + CTA כתום.
   - `SceneHeader.tsx` — chip חותמת + מעוין, H2 כבד יותר, קו כתום קצר.
4. **Overview V2** — `src/app/lessons/[topicId]/overview/page.tsx`: מספר-מתאר ענק ב-hero,
   `TopoField` ברקע, מבנה-השיעור כציר waypoints (לשתף ויזואל עם LessonToc), פאנלים עם frame.
5. **sed חידוד פינות בסצנות** (reskin זול לכל 60+ הסצנות, בלי לגעת בתוכן):
   בתוך `src/components/lessons/`, `src/components/interactive/`, `src/components/recap-demos/`:
   `rounded-4xl→rounded-[6px]`, `rounded-3xl→rounded-[5px]`, `rounded-2xl→rounded-[4px]`,
   `rounded-xl→rounded-[3px]`, `rounded-lg→rounded-[3px]` (להשאיר `rounded-full` ו-`rounded-md`).
   זהירות: לא לגעת ב-`src/components/design-approval/` (מוקאפים נעולים).
6. **חיבור hook assets לסצנות פתיחה** (אופציונלי, §22.5): אפשר להוסיף את
   `lessonAssets[id].hook` כרקע אטמוספרי ב-HookScene דרך SceneCard flush — לא חובה לשלב ראשון.
7. **QA** (חובה לפני סיום — §26):
   - `npx tsc --noEmit` ואז `npm run build`.
   - dev server קיים ברקע (`npm run dev`, פורט 3000).
   - Playwright MCP: צילומי דסקטופ 1440 + מובייל 390 של: בית, סילבוס, overview topic-03,
     שיעור topic-03 (hook, סצנת תכנון ציר, recap), טאב תרגול, טאב בדיקת ידע (לענות על Quiz).
   - לבדוק: אין overflow אופקי, TOC/Tabs/ניווט עובדים, hash נשמר, מפות לא התהפכו,
     placeholders בולטים אם נכס חסר, 24 הנכסים החדשים תקינים סגנונית.
8. **דוח סיכום בעברית** לפי הפורמט בסוף `lesson-shell-design-system.md` §26.

## 5. החלטות שהתקבלו (לא לפתוח מחדש בלי סיבה)

- hooks נשמרים כ-`.png` (לא .webp) — `lessonAssets` כבר מעודכן.
- ניווט header: בית / תכנית הלימודים (/#syllabus) / פרוטוטייפים (/#prototypes) /
  תרגול חוזר (/recap-demos) — רק יעדים אמיתיים, אין קישורים מתים מהמסמך (ספרייה/כלים/אודות).
- כרטיסי סילבוס → `/lessons/topic-XX/overview/`; ה-CTA בדף ה-overview → `/lessons/topic-XX/`.
- `LessonNavContext` נשאר ב-LessonShell; `SceneChangeDetail` מיובא type-only (אין מעגל).
- סצנת hook מרונדרת ב-SceneCard `flush` בלי SceneNavigation ובלי UtilityBar (יש לה CTA משלה).
- דף בית: הדיורמה התלת-ממדית מוחלפת בנכס שהופק, אבל הקוד נשאר בקובץ (§21 אוסר מחיקה).
- `.surface`/`.btn-*`/`.chip` ב-globals הם צינור ה-reskin של הסצנות — לא למחוק אותם.

## 6. איך מריצים

```bash
npm run dev        # http://localhost:3000
npx tsc --noEmit   # typecheck מהיר
npm run build      # חייב לעבור לפני סיום
```

קישורי בדיקה:
- בית: http://localhost:3000/
- סילבוס: http://localhost:3000/#syllabus
- Overview: http://localhost:3000/lessons/topic-03/overview/
- מעטפת שיעור: http://localhost:3000/lessons/topic-03/
- דיפ-לינק סצנה: http://localhost:3000/lessons/topic-03/#scene-planning

## 7. אחוז התקדמות משוער

**~85%** מהעבודה הכוללת:
- לוגיקה/מבנה/ניווט/Overview — גמור ועובד (build ירוק). ✅
- נכסים — גמור (25/25 הופקו דרך MCP של Magnific והורדו ל-public). ✅
- תשתית ויזואלית V2 + יישום על כל המסכים (בית, סילבוס, מעטפת, overview, סצנות) — גמור. ✅
- נשאר (~15%): QA ויזואלי דסקטופ+מובייל, בדיקת 24 הנכסים, תיקוני ליטוש שיעלו מה-QA,
  ודוח סיכום. הכל מפורט בסעיף 4.

## 8. נספח — מזהי ההפקות ב-Magnific (לשחזור/הפקה מחדש)

הקבצים כבר בדיסק וב-git; המזהים כאן רק אם צריך לפתוח הפקה ב-magnific.com:

| קובץ | creation |
|---|---|
| home-hero-terrain.png | aQBCWDOfSh (וגרסת recraft שנפסלה: CH8u0zsEEy) |
| lesson-01..12 (cards) | CH8upxpEEy, rlFjaZDxtc, wPxJboK7EI, Xt0oG0eBfo, Xt0oGeIBfo, 3GOZS0lREY, kLurv8H16B, J9LykgzOq4, 3GOZUAKREY, CH8udxMEEy, y6l4xD7PW9, EqIQX3xuuO |
| lesson-01..12 (hooks) | rlFjCHAxtc, kLurfLP16B, y6l4jYjPW9, KjE1aGtkqp, tfphVRkmZJ, KjE1afgkqp, 8vMtTjAIrU, jSqsFMbLD0, iAJRwrA3uK, iAJRwwV3uK, CH8uBf6EEy, CH8uobGEEy |

סגנון: כל ההפקות עם style-reference ל-aQBCWDOfSh, מודל `imagen-nano-banana-2`,
פרומפט = פסקת הסגנון הקבועה + Subject מהקובץ בפרויקט-נולדג'.
