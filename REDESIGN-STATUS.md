# REDESIGN-STATUS.md — סטטוס ה-Redesign המלא (V2)

> קובץ המשך-עבודה. אם הסשן נקטע — ממשיכים מכאן, מכל מחשב.
> עודכן לאחרונה: 2026-07-06 — **QA ויזואלי מלא הושלם**: 25/25 נכסים נבדקו ואושרו,
> QA דסקטופ+מובייל (בית/סילבוס/overview/מעטפת שיעור/Quiz) עבר, פאנל reviewers
> מקצועי (RTL/frontend/cartographic) רץ על קבצי V2, ונמצא ותוקן **באג קריטי אחד**
> (ראו סעיף 4א). `npm run build` ירוק אחרי התיקונים. **~98% מהעבודה גמור** —
> נשאר רק ליטושים אופציונליים (סעיף 4ב) ודוח סיכום ללקוח.
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
- **כל 25 הנכסים נבדקו חזותית אחד-אחד ואושרו** (§4א) — כולם עקביים בסגנון, אין צורך
  בהפקה מחדש.

## 4א. QA מלא + באג קריטי שנמצא ותוקן (2026-07-06)

**הבאג:** `IsometricAsset.tsx` הסתמך אך ורק על אירוע `onLoad` של ה-`<img>` כדי לעבור
מ-`status: 'pending'` (מציג placeholder רועש מג'נטה) ל-`'ready'`. לתמונות שנטענות
מהר מספיק (בתצוגה הראשונית, מהמטמון) — ה-load event כבר קורה לפני ש-React מספיק
לחבר את המאזין, והוא מוחמץ **לצמיתות**. תוצאה: **דף הבית וכל 12 כרטיסי הסילבוס
הציגו placeholder מג'נטה "PLACEHOLDER" במקום הנכסים האמיתיים**, למרות שה-network
מחזיר 200 ו-`img.complete`/`naturalWidth` תקינים. זה נתפס ב-QA-הקודם (§4 הישן) כ"בעיה
של תזמון הצילום" — בפועל זה היה קבוע, אומת שוב אחרי המתנה וריענון.

**התיקון** (`src/components/assets/IsometricAsset.tsx`): נוסף `imgRef` (מחובר ל-`<img>`
דרך `ref=`), ואפקט שבודק `imgRef.current?.complete && naturalWidth > 0` בכל שינוי `src`
— כדי לתפוס תמונות שכבר סיימו להיטען לפני שה-effect רץ. `onLoad`/`onError` נשארו
כרשת ביטחון לתמונות שעדיין בטעינה. אומת חזותית ב-Playwright: כל 25 הנכסים
(hero + 12×card + 12×hook) עכשיו נטענים ומוצגים נכון בבית ובסילבוס.

**ליטוש נוסף שבוצע:** `LessonTabs.tsx` — ה-prop `layoutIdSuffix` היה מחווט מ-`LessonShell`
אך לא בשימוש בפועל (הפס הכתום התחלף בקפיצה, לא "זז בעדינות" כפי שדורש §25 של מסמך
העיצוב). נוסף `motion.span` עם `layoutId` (framer-motion, כבר תלות קיימת בפרויקט,
בשימוש נרחב בכל סצנות השיעור) + כיבוד `useReducedMotion`. אומת חזותית שהמעבר בין
טאבים חלק ואין קריסה.

**QA מלא שבוצע ועבר** (Playwright, דסקטופ 1440 + מובייל 390):
בית, #syllabus, `/lessons/topic-03/overview/`, מעטפת שיעור topic-03 (hook, deep-link
ל-`#scene-planning`, מעבר סצנה הבא/הקודם, recap), טאב תרגול (placeholder מוצהר —
תקין), טאב בדיקת ידע (מולאו 5 תשובות ונשלחו — ✓/✗ ורציונל מוצגים נכון, ציון 4/5,
"ניסיון נוסף"). אין overflow אופקי במובייל בשום עמוד. Hash deep-link נבדק על טעינה
אמיתית (לא ניווט same-page) ועובד: נחיתה בטאב "לימוד" בדיוק בסצנה מה-hash. מפות/SVG
לא התהפכו (compass emblem, מסלול ב-PlanningScene). קונסולת דפדפן נקייה (רק 404
של favicon.ico, לא רלוונטי).

**פאנל reviewers מקצועי** (rtl-qa-reviewer, frontend-reviewer, cartographic-reviewer)
רץ על כל קבצי ה-V2 (ui/, lesson/, landing/, overview page). לא נמצאו באגים נוספים
מלבד מה שתואר למעלה. שאר הממצאים הם הצעות ניקיון/מיזוג-קוד (reuse) ברמת חומרה
נמוכה-בינונית — ראו §4ב למטה; לא בוצעו כי הם לא באגים ולא נצפו חזותית, וסיכון/תועלת
לא הצדיק שינוי מבני בשלב זה של המסירה.

`npm run build` ירוק אחרי כל התיקונים (static export, 42 עמודים).

## 4ב. ליטושים אופציונליים לעתיד (לא חוסמים מסירה)

מהפאנל המקצועי — ניקיון קוד/reuse, לא באגים חזותיים מאומתים:
- כמה מקומות עם markup כמעט-זהה שכדאי למזג לרכיב משותף: כרטיס "שיעור קודם/הבא"
  (מופיע ב-3 קבצים), "מסגרת נכס + מקרא" (Hero + overview, 2 מקומות), "מספר-מתאר ענק"
  (3 מקומות עם magic numbers שונים), "קו כותרת + מעוין" (5 מקומות).
- 5 רכיבי תוכן-סצנה (`InsightCard`, `IntelCard`, `ReadyCallout`, `SceneDivider`,
  `LessonContent`) עדיין עם `rounded-full`/`rounded-md` מהשפה הישנה — הבדל קטן
  ולא בולט חזותית מול פינות ה-`rounded-[3px]` של V2 (נבדק בזום), אפשר ליישר בעתיד.
- `BrandEmblem`/`TopoField` מקודדים hex ישירות ב-SVG במקום טוקני Tailwind — לא משפיע
  חזותית (הערכים תואמים את הטוקנים הנעולים), רק עניין של "אם הפלטה תשתנה בעתיד".
- תג קושי "מתקדם" משתמש בגוון accent (כתום) — אותו גוון שה-CTA/מצב-פעיל משתמשים
  בו. עובד ויזואלית אבל שווה לשקול גוון נפרד להבחנה עיצובית.

אופציונלי נוסף (מ-4 הישן, עדיין לא בוצע כי לא חובה):
- רקע hook אטמוספרי ב-HookScene (opacity נמוך מאחורי הטקסט) — §22.5.
- V2 מלא לעמודי `recap-demos`/`prt` (כרגע יורשים חלקית דרך `.surface`/`.btn`).

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

**~98%** מהעבודה הכוללת:
- לוגיקה/מבנה/ניווט/Overview — גמור ועובד (build ירוק). ✅
- נכסים — גמור, כל 25/25 הופקו **ונבדקו חזותית אחד-אחד**. ✅
- תשתית ויזואלית V2 + יישום על כל המסכים (בית, סילבוס, מעטפת, overview, סצנות) — גמור. ✅
- QA ויזואלי מלא (דסקטופ+מובייל, Quiz, ניווט, hash) + פאנל reviewers מקצועי — גמור,
  באג קריטי אחד נמצא ותוקן (§4א). ✅
- נשאר (~2%): ליטושים אופציונליים לא-חוסמים (§4ב) ודוח סיכום ללקוח (§26 של מסמך העיצוב).

## 8. נספח — מזהי ההפקות ב-Magnific (לשחזור/הפקה מחדש)

הקבצים כבר בדיסק וב-git; המזהים כאן רק אם צריך לפתוח הפקה ב-magnific.com:

| קובץ | creation |
|---|---|
| home-hero-terrain.png | aQBCWDOfSh (וגרסת recraft שנפסלה: CH8u0zsEEy) |
| lesson-01..12 (cards) | CH8upxpEEy, rlFjaZDxtc, wPxJboK7EI, Xt0oG0eBfo, Xt0oGeIBfo, 3GOZS0lREY, kLurv8H16B, J9LykgzOq4, 3GOZUAKREY, CH8udxMEEy, y6l4xD7PW9, EqIQX3xuuO |
| lesson-01..12 (hooks) | rlFjCHAxtc, kLurfLP16B, y6l4jYjPW9, KjE1aGtkqp, tfphVRkmZJ, KjE1afgkqp, 8vMtTjAIrU, jSqsFMbLD0, iAJRwrA3uK, iAJRwwV3uK, CH8uBf6EEy, CH8uobGEEy |

סגנון: כל ההפקות עם style-reference ל-aQBCWDOfSh, מודל `imagen-nano-banana-2`,
פרומפט = פסקת הסגנון הקבועה + Subject מהקובץ בפרויקט-נולדג'.

---

## 9. פיבוט 2026-07-06 (ערב): "Design 1" רך מחליף את שפת ה-V2 הטקטית — לשעת שיעור + topic-03

המשתמש בדק את ה-V2 המתואר למעלה (אוקטגונים, פאנלים חדים, סוגריים-מסגרת,
מספר-מתאר ענק, פסי פיקוד כהים) מול brief חדש (`lesson-shell-redesign-brief-v2.md`)
ותמונת רפרנס ("Design 1") — קרם רך, כרטיסים לבנים מוגבהים עם **רדיוס גדול**,
מסגרות מרווה כמעט בלתי מורגשות, בלי אוקטגונים/סוגריים/פסי פיקוד כהים.
**הוחלט להחליף** את שפת ה-V2 (לא רק "לתקן פערים") — ראו הודעת המשתמש
"Replace V2 with true soft Design 1".

**מה בוצע** (scope: מעטפת השיעור + topic-03 בלבד — לא roll-out לכל 12 השיעורים):
- `globals.css` — `.surface`/`.surface-elevated`/`.chip`/`.btn-*` נכתבו מחדש
  לרדיוס גדול (`rounded-2xl`), מסגרת `border-brand/15`, `shadow-elevated`.
  `.oct`/`.oct-sm`/`.tab-folder`/`.outline-numeral`/`.dotted-leader` **נשארו
  בקובץ בכוונה** (לא נמחקו) — עדיין בשימוש ב-Home/Syllabus/Overview/Prototypes
  שלא עברו redesign בסבב הזה.
- `ui/`: `Button`, `SurfaceCard` (prop `frame` נשמר לתאימות לאחור), `ProgressBar`,
  `StatusChip`, `IconBadge`, `AppHeader` (הוסר פס הפיקוד המרווה-כהה העליון —
  שורה רכה אחת).
- `lesson/`: `LessonHero` (צ'יפ רך "שיעור X מתוך Y" במקום מספר-מתאר ענק, נכס
  Magnific אמיתי בכרטיס `rounded-3xl` — לא placeholder, הקובץ כבר קיים),
  `LessonStatsBar`, `LessonTabs` (segmented control רך עם רקע נגלל), `LessonToc`
  (עיגולים ממוספרים במקום מעוינים), `LessonUtilityBar` (בר תחתון לבן/קרם במקום
  מרווה-כהה), `SceneCard`/`SceneNavigation`/`SceneHeader`.
- `lessons/topic-03/*` — מעבר מכני של רדיוסים (`rounded-[3px]`→`rounded-xl`,
  `rounded-[4px]`→`rounded-2xl`) בכל 6 קבצי הסצנה; תוכן/לוגיקה/state לא נגעו.
- `npx tsc --noEmit` נקי, `npm run build` ירוק (42 עמודים), QA ויזואלי ב-Playwright
  (דסקטופ 1440 + מובייל 390) על topic-03: hook→onboarding→tabs→quiz, hash
  deep-link, אין overflow אופקי במובייל.

**לא נגענו** (מחוץ להיקף המפורש של הסבב): Home hero, Syllabus grid, ו-11
השיעורים האחרים (המעטפת המשותפת שלהם כבר רכה כי היא אותם רכיבים, אבל תוכן
הסצנות הפנימי שלהם — רדיוסים/hex ישירים — עדיין לא טופל, ראו §10 למטה). אלה
עדיין ב"מראה V2" ומחכים לגלגול הבא — ראו brief §"Phase 3/4" ואת ה-checklist שם.

### 9א. המשך אותו ערב: Overview page + code review מקצועי

לאחר שהמשתמש בדק וציין ש"זה לא דומה בכלל" — התברר שדף **Lesson Overview**
(`/lessons/topic-03/overview/`) עדיין נחשב חלק מ"שיעור 3" בעיני המשתמש (הוא ה-
entry point לפני מעטפת השיעור), למרות שה-brief המקורי שם אותו ב-Phase נפרד.
עודכן גם הוא לשפת Design 1 המלאה: הוסר מספר-המתאר הענק, מעוינים ב-breadcrumb
ובמבנה השיעור, סוגריים-מסגרת (FrameCorners) ופס ה-GEO-9900 הכהה מתחת לנכס
ה-hero; הוחלפו ב-chip רך, שברוני ChevronLeft, ועיגולים ממוספרים — באותה שפה
בדיוק כמו מעטפת השיעור.

**Workflow של 4 reviewers מקצועיים במקביל** (frontend-tokens, rtl-audit,
cartographic, residual-v2-scan) רץ על כל 22 הקבצים שהשתנו בסבב הזה, ואחריו
adversarial-verify (סקפטיקן) על כל ממצא. 24 ממצאים גולמיים → 5 אושרו:
- hex ישיר בתוך אילוסטרציית ה-SVG של MissionStage (OnboardingScene) שכפל טוקנים
  קיימים (`terrain.ridge/sand/olive/steel`, `brand`, `brand-dark`) — תוקן ל-
  className מבוסס-טוקן; **לא** נגעתי בגוונים בודדים שלא תואמים אף טוקן (גוונים
  ייחודיים לאיור, כמו חום גזע הדקל) כדי לא לסכן את המראה החזותי.
- אותו דבר ב-PlanningScene (סמני נקודות הציון על המפה, קווי המסלול, כלי המפה) —
  תוקן באותה זהירות, השאיר `#d4842f` ו-`#cdba90` (אין להם טוקן תואם).
- `rounded-l-full` (פיזי) במקום `rounded-e-full` (לוגי) על פס-האקטיב, משוכפל
  זהה ב-4 קבצי סצנה — תוקן בכולם (ללא השפעה חזותית בפועל כי האתר תמיד RTL, אבל
  תיקון נכון לתחזוקה).
- `font-bold font-bold` (typo כפול) ב-5 מקומות ב-OnboardingScene — תוקן.
- (לא תוקן, severity בינונית, מוצהר כ-cleanup עתידי): כפילות ה-idiom של "halo
  לבן סביב תווית מפה" (`paintOrder="stroke" stroke="#ffffff"...`) שחוזר 30+
  פעמים ב-4 קבצים עם אי-עקביות קלה בין `#ffffff` ל-`#FFFBF7` — ראוי ל-component
  משותף `<MapLabel>` בעתיד, לא בוצע כי אין באג חזותי וזה סיכון עריכה גבוה מול
  ערך נמוך בשלב הזה.

כל תיקון אומת חזותית ב-Playwright (ללא שינוי פיקסלים באיורים) + `tsc --noEmit`
+ `npm run build` ירוקים לפני ה-commit.
