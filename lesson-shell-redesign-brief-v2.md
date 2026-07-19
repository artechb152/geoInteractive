# lesson-shell-redesign-brief-v2.md

## מטרת המסמך

מסמך זה הוא brief מחייב ל־Claude for VS Code לביצוע **redesign מלא** למעטפת השיעור ולכל מסכי השיעורים בקורס גיאוגרפיה צבאית.

הכוונה איננה לשפר את העיצוב הקיים, לא להחליף צבעים על אותו layout, ולא “ללטש” קומפוננטות ישנות. המטרה היא לקחת את **עיצוב 1** שנבחר ככיוון עיצובי ולהפוך אותו לשפת מוצר מלאה לכל השיעורים.

העיצוב החדש צריך להרגיש כמו:

> שולחן מפות צבאי מודרני, בהיר, נקי, פרימיום, עם נכסי terrain / map / compass / route בסגנון Magnific papercut-isometric, כרטיסים לבנים מוגבהים, כפתורים כתומים ברורים, היררכיה חזקה, והרבה אוויר.

אסור שהמסך ירגיש כמו העיצוב הקודם של האתר. אם בסוף העבודה עדיין מזהים את השפה הישנה — העבודה לא הסתיימה.

---

## עקרון על: לא משנים תוכן, כן מחליפים את כל השפה הוויזואלית

### אסור לשנות

- אין לשנות טקסטים לימודיים.
- אין למחוק תוכן.
- אין להוסיף תוכן חדש שלא קיים.
- אין לשנות את רצף השיעור.
- אין לשנות את הלוגיקה של אינטראקציות קיימות.
- אין לשנות את מטרות הלמידה, quiz, metadata או state behavior.
- אין להחליף סימולטורים אינטראקטיביים בתמונה סטטית.

### כן לשנות

- Layout מלא.
- מבנה קומפוננטות תצוגה.
- מעטפת שיעור.
- header / breadcrumb / tabs / TOC / progress / footer utility bar.
- כרטיסים, גרידים, spacing, typography, shadows, borders.
- אזורי hero ו־visual panels.
- כפתורים.
- placeholders ל־assets חסרים.
- שילוב עתידי של Magnific assets.

---

## קבצים שחובה לקרוא לפני תחילת עבודה

קרא לפני כל שינוי:

- `COURSE_DNA.md`
- `VISUAL_IDENTITY.md`
- `ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md`
- `MAGNIFIC_ASSET_PROMPTS.md`
- `ASSET_INTEGRATION_WORKFLOW.md`
- `LESSON_STRUCTURE_GUIDE.md`
- `INTERACTION_DNA.md`
- `CLAUDE_PROJECT_RULES.md`
- `COURSE_STATE_INVENTORY.md`

מקור אמת טכני לצבעים:

- `tailwind.config.ts`
- `docs/palette.md`, אם קיים בפרויקט

אל תסתמך על `docs/design-system.md` אם הוא מתאר dark theme ישן.

---

## הכיוון הוויזואלי שנבחר: Design 1

Design 1 הוא הבסיס. אל תמציא כיוון אחר.

### מאפייני Design 1

- רקע קרם בהיר עם טקסטורת קווי גובה עדינה מאוד.
- Header עליון לבן/קרם, נקי, דק, לא כבד.
- הרבה whitespace.
- כותרות ענקיות, כהות, עם משקל חזק.
- Accent כתום רק לפעולה, התקדמות, סימון פעיל ודגש קטן.
- ירוק מרווה / olive לפרוגרס, אייקונים, גבולות עדינים, סטטוסים חיוביים.
- כרטיסים לבנים מוגבהים עם border עדין וצל רך.
- Hero visual גדול — asset איזומטרי / מפה / מצפן / terrain — לא screenshot של UI ישן.
- כל אזור נראה כמו חלק ממערכת אחת: header, hero, כרטיסים, כפתורים, TOC, tabs.
- העיצוב צריך להיות בהיר, מודרני, יוקרתי, ולא “מערכת צבאית כהה”.

---

## הגדרת השפה החדשה

שם השפה:

**Modern Military Map / Light Papercut Course UI**

תיאור:

ממשק לימוד בעברית שנראה כמו שולחן מפות צבאי מודרני: נייר קרם, מפות טופוגרפיות, אובייקטים איזומטריים של terrain, מצפן, מסלול ושכבות מידע, עם UI מינימליסטי ופרימיום.

התחושה צריכה להיות:

- מקצועית
- נקייה
- מבצעית
- בטוחה
- יוקרתית
- לא משחקית
- לא עמוסה
- לא dark dashboard
- לא SaaS גנרי
- לא “קורס ישן עם צבעים חדשים”

---

## פלטת צבעים מחייבת

השתמש בטוקנים קיימים בלבד. אם חסרים טוקנים, הוסף אותם בצורה מסודרת ולא כ־HEX מפוזר בקומפוננטות.

### צבעי בסיס

- Background: קרם חם `#FFFBF7`
- Elevated card: לבן `#FFFFFF`
- Warm hover / subtle panel: `#F5EDDE`
- Text primary: שחור/פחם עמוק
- Text muted: אפור חם / charcoal muted
- Primary accent: כתום `#EB9E48`
- Accent hover: כתום בהיר יותר בלבד
- Brand / success / progress: sage / olive `#749C75`, `#5B7C5C`
- Sand / terrain: sand, warm beige, olive, sage

### כללי צבע

- כתום מיועד ל־CTA, מצב פעיל, progress key marker, פוקוס, מספרי שיעור.
- כתום לא משמש לטקסט ארוך.
- ירוק/מרווה משמש למסגרת, progress, אייקונים, pill status.
- אין להוסיף כחולים, סגולים, אדומים או ניאון בשביל “גיוון”.
- אין לחזור ל־dark theme, למעט footer utility או strip תחתון אם הוא חלק מהעיצוב הנבחר.

---

## טיפוגרפיה

- כותרות: Rubik / font-display.
- גוף: Heebo / font-sans.
- קואורדינטות, אזימוטים ומדידות: font-mono.

### היררכיה

- H1 גדול מאוד, דומיננטי, עם line-height הדוק.
- H2 ברור ומרווח.
- פסקאות קצרות, 2–4 שורות.
- metadata קטן ומדויק.
- אין טקסט צפוף בתוך כרטיסים.

---

## מבנה מעטפת שיעור חדש

המבנה החדש צריך להחליף את התחושה של המעטפת הישנה.

### Desktop layout

המסך בנוי מלמעלה למטה:

1. **Global Top Bar**
2. **Lesson Hero Header**
3. **Lesson Mode Tabs**
4. **Main Learning Area**
5. **Scene Navigation / Bottom Progress**
6. **Footer Utility Bar**

---

## 1. Global Top Bar

Top bar חדש, דק, בהיר, עם תחושה של מוצר פרימיום.

### כולל

- לוגו/סמל מימין.
- שם הקורס: “גאוגרפיה צבאית”.
- tagline קצר מתחת/לצד השם, למשל “לקרוא שטח. להבין החלטה.”
- navigation מינימלי:
  - בית
  - שיעורים
  - סילבוס
  - מפות וכלים
  - משאבים
  - אודות
- אזור משתמש משמאל: avatar קטן, שם, התראות, חיפוש.

### סגנון

- גובה כ־72px.
- רקע קרם/לבן עם blur או border תחתון עדין.
- active nav מסומן בקו כתום דק מתחת.
- לא להשתמש ב־navbar כהה וכבד.

---

## 2. Lesson Hero Header

זה אזור הכניסה לכל שיעור. הוא חייב להרגיש חדש לגמרי.

### מבנה

שני טורים בדסקטופ:

- צד ימין: טקסט השיעור.
- צד שמאל: visual asset גדול.

ב־RTL הצד הטקסטואלי נשאר דומיננטי בצד ימין.

### תוכן בצד הטקסט

- Breadcrumb קטן:
  - הקורס שלי / שיעורים / שיעור 03
- chip קטן:
  - שיעור 03 מתוך 12
- H1 גדול:
  - שם השיעור
- subtitle קצר:
  - description הקיים מה־metadata
- meta row:
  - משך שיעור
  - רמת קושי
  - סוג שיעור
  - התקדמות

### Visual asset

- asset גדול בסגנון Magnific:
  - מצפן על מפה
  - terrain slab
  - folded map
  - route line
  - layer stack
- לא להשתמש ב־screenshot של מפה קיימת בתור hero.
- לא להכניס טקסט בתוך התמונה.
- אם אין asset מוכן, להציג placeholder בולט.

### Placeholder מחייב ל־asset חסר

אם asset חסר, הצג placeholder ברור מאוד כדי שיהיה ברור שצריך להפיק אותו ב־Magnific:

- רקע ורוד/מג’נטה או צהוב בולט, לא חלק מהפלטה.
- טקסט HTML אמיתי: `MISSING MAGNIFIC ASSET`
- שם הקובץ הצפוי.
- target path.
- אין ליצור fake illustration זמני שנראה כאילו הוא סופי.

דוגמה:

```tsx
<MissingAssetPlaceholder
  filename="lesson-03-navigation-shell.png"
  targetPath="public/assets/isometric/lesson-03-navigation-shell.png"
/>
```

---

## 3. Lesson Mode Tabs

הטאבים צריכים להיות חלק בולט וברור מהמעטפת החדשה.

### טאבים

- לימוד
- תרגול
- בדיקת ידע

### סגנון

- Container לבן מוגבה.
- Tab פעיל: פס כתום תחתון + אייקון כתום/ירוק.
- Tab לא פעיל: טקסט כהה או muted.
- Hover עדין בצבע warm.
- לא להשתמש בטאבים הישנים אם הם נראים כמו העיצוב הקודם.

---

## 4. Main Learning Area

אזור הלמידה הראשי צריך להיות card גדול ומרווח, לא “עמוד טקסט”.

### Desktop structure

- מרכז/שמאל: תוכן הסצנה הנוכחית.
- ימין: TOC / תוכן השיעור.
- מתחת: previous / next / dots / progress.

### Scene Card

כל סצנה מוצגת בתוך כרטיס גדול:

- רקע לבן.
- border עדין.
- shadow רך.
- radius גדול.
- padding רחב.
- headline ברור.
- intro קצר.
- אזור visual / interaction רחב.

### סצנות תוכן

כל סצנה צריכה לשמור על התוכן והאינטראקציה, אבל לקבל מעטפת חדשה:

- SceneHeader מעוצב מחדש.
- step chip חדש.
- visual board מעוצב כמו מפה/לוח הסבר בהיר.
- caption + legend נקיים.
- InsightCard במראה החדש.

---

## 5. TOC / תוכן השיעור

ה־TOC הוא חלק מרכזי בעיצוב 1. הוא לא sidebar טכני ישן.

### Desktop

- Card לבן בצד ימין.
- כותרת: “תוכן השיעור”.
- רשימת סצנות אנכית.
- לכל item:
  - מספר סצנה
  - label
  - משך אם קיים
  - סטטוס: הושלם / פעיל / נעול
- active item:
  - רקע warm עדין.
  - פס כתום בצד ימין.
  - אייקון play או dot כתום.
- completed:
  - check ירוק.
- locked:
  - lock muted.

### Mobile

- TOC הופך ל־horizontal pill rail.
- לא להסתיר את ההתקדמות.
- active scene תמיד גלוי.

---

## 6. Scene Navigation / Bottom Progress

מתחת לכרטיס הסצנה:

- כפתור הבא כתום מלא.
- כפתור הקודם outline.
- Dots / progress stepper באמצע.
- טקסט: “סצנה 2 מתוך 11”.

הניווט חייב להשתמש באירועי `learn:next` / `learn:prev` הקיימים אם זה מה שהפרויקט עושה היום.

---

## 7. Footer Utility Bar

בתחתית המעטפת אפשר להשתמש ב־utility bar בהיר או ירוק כהה עדין, בהתאם לעיצוב 1.

### כולל

- המשך ליעד הבא / המשך ללמוד
- סמן כהושלם
- הוסף למועדפים
- רשום הערה
- הורדת חומרי שיעור
- התקדמות כללית בשיעור

### סגנון

- אם כהה: להשתמש ב־brand-dark בלבד, לא שחור צבאי כבד.
- טקסט קריא מאוד.
- לא להעמיס.

---

## שפת כפתורים חדשה

### Primary CTA

משמש רק לפעולה המרכזית:

- “התחל שיעור”
- “המשך ללמוד”
- “הבא”
- “המשך לסצנה הבאה”

סגנון:

- רקע כתום `accent`.
- טקסט לבן/כהה לפי ניגודיות בפועל.
- פינות בינוניות/גדולות.
- צל רך.
- icon arrow קטן.
- hover: כתום בהיר יותר בלבד.

### Secondary button

משמש לפעולה משנית:

- “חזור לסילבוס”
- “הקודם”
- “צפה במבנה השיעור”

סגנון:

- רקע לבן/קרם.
- border sage/fg-muted עדין.
- טקסט כהה.
- hover warm.

### Tertiary / ghost

משמש לפעולות שקטות:

- סימון מועדף
- הורדה
- שיתוף
- פתיחת מקרא

סגנון:

- ללא מילוי.
- hover warm.
- icon ברור.

### אסור

- לא להשתמש בכפתורים מהעיצוב הישן אם הם נראים out of place.
- לא להשתמש ב־gradient צעקני.
- לא להשתמש בצבעים חדשים.
- לא להשתמש בכפתורי dark console.

---

## כרטיסים ורכיבים שחייבים להיראות חדשים

יש ליצור או לעדכן component primitives כדי שכל השיעורים ייראו אותו דבר:

### Required primitives

- `CourseTopBar`
- `LessonHeroHeader`
- `LessonHeroAsset`
- `MissingAssetPlaceholder`
- `LessonModeTabs`
- `LessonShellLayout`
- `LessonSceneCard`
- `LessonTocCard`
- `SceneProgressNav`
- `FooterUtilityBar`
- `MetricPill`
- `ObjectiveCard`
- `InsightPanel`
- `MapBoard`
- `LegendRow`

### חובה

- להעדיף primitives משותפים במקום עיצוב מחדש ידני בכל שיעור.
- לא לשכפל Tailwind ענקי בכל קובץ שיעור.
- לא לשבור את הסצנות עצמן.

---

## התאמת כל סוגי המסכים לשפה החדשה

העיצוב צריך לעבוד על כל 10 סוגי המסכים שהוגדרו, גם אם עכשיו עובדים בעיקר על מעטפת שיעור.

### Home Hero

- Hero עם terrain asset גדול.
- כותרת גדולה.
- CTA כתום.
- feature strip לבן.

### Syllabus / Lesson Grid

- גריד כרטיסי שיעור עם assets קטנים.
- progress panel.
- filters לבנים נקיים.
- cards airy.

### Lesson Overview

- Hero גדול לשיעור.
- מטרות.
- משך/קושי/סוג.
- מבנה השיעור.
- CTA.

### Lesson Shell

- המעטפת המתוארת במסמך זה.

### Hook Scene

- מסך פתיחה דרמטי אבל בהיר.
- H1 ענק.
- asset atmospheric.
- CTA יחיד.

### Onboarding

- מטרות, מפת דרך, מושגים בסיסיים.
- cards לבנים.
- visual asset תומך.

### Teaching Scene

- SceneCard + MapBoard / explanation board.
- accordion/cards במראה החדש.

### Interactive Simulator

- סימולטור נשאר React/SVG/Canvas.
- מקבל shell חדש: panel, controls, result meter, feedback.
- לא מוחלף ב־Magnific image.

### Recap

- completion banner.
- concept network.
- next lesson CTA.
- asset קטן celebratory אבל לא ילדותי.

### Quiz

- question card.
- options cards.
- feedback panel.
- progress.
- CTA ברור.

---

## מדיניות Magnific Assets

### עיקרון

Magnific assets הם שכבת המחשה/אווירה פרימיום, לא מקור תוכן ולא תחליף למפות מדויקות.

### איפה להשתמש

- Home hero.
- כרטיסי שיעור בסילבוס.
- Lesson overview hero.
- Lesson shell hero.
- Hook scenes.
- Recap banners.
- cards קטנים שמייצגים נושאים.

### איפה לא להשתמש

- לא במקום Viewshed simulator.
- לא במקום navigation simulator.
- לא במקום map explorer.
- לא במקום כל דיאגרמה שדורשת דיוק, מדידה, אזימוט, קו ראייה, קואורדינטות או feedback חי.

---

## שמות נכסים נדרשים לכל שיעור

יש להכין lookup מסודר לפי lesson id.

```ts
const lessonVisualAssets = {
  'topic-01': {
    card: '/assets/isometric/lesson-01-strategy-terrain.png',
    hero: '/assets/isometric/lesson-01-strategy-terrain-shell.png',
    hook: '/assets/isometric/lesson-01-strategy-terrain-hook.webp',
  },
  'topic-02': {
    card: '/assets/isometric/lesson-02-map-reading.png',
    hero: '/assets/isometric/lesson-02-map-reading-shell.png',
    hook: '/assets/isometric/lesson-02-map-reading-hook.webp',
  },
  'topic-03': {
    card: '/assets/isometric/lesson-03-navigation.png',
    hero: '/assets/isometric/lesson-03-navigation-shell.png',
    hook: '/assets/isometric/lesson-03-navigation-hook.webp',
  },
  'topic-04': {
    card: '/assets/isometric/lesson-04-landforms.png',
    hero: '/assets/isometric/lesson-04-landforms-shell.png',
    hook: '/assets/isometric/lesson-04-landforms-hook.webp',
  },
  'topic-05': {
    card: '/assets/isometric/lesson-05-mobility.png',
    hero: '/assets/isometric/lesson-05-mobility-shell.png',
    hook: '/assets/isometric/lesson-05-mobility-hook.webp',
  },
  'topic-06': {
    card: '/assets/isometric/lesson-06-los.png',
    hero: '/assets/isometric/lesson-06-los-shell.png',
    hook: '/assets/isometric/lesson-06-los-hook.webp',
  },
  'topic-07': {
    card: '/assets/isometric/lesson-07-weather.png',
    hero: '/assets/isometric/lesson-07-weather-shell.png',
    hook: '/assets/isometric/lesson-07-weather-hook.webp',
  },
  'topic-08': {
    card: '/assets/isometric/lesson-08-logistics.png',
    hero: '/assets/isometric/lesson-08-logistics-shell.png',
    hook: '/assets/isometric/lesson-08-logistics-hook.webp',
  },
  'topic-09': {
    card: '/assets/isometric/lesson-09-chokepoints.png',
    hero: '/assets/isometric/lesson-09-chokepoints-shell.png',
    hook: '/assets/isometric/lesson-09-chokepoints-hook.webp',
  },
  'topic-10': {
    card: '/assets/isometric/lesson-10-urban.png',
    hero: '/assets/isometric/lesson-10-urban-shell.png',
    hook: '/assets/isometric/lesson-10-urban-hook.webp',
  },
  'topic-11': {
    card: '/assets/isometric/lesson-11-borders.png',
    hero: '/assets/isometric/lesson-11-borders-shell.png',
    hook: '/assets/isometric/lesson-11-borders-hook.webp',
  },
  'topic-12': {
    card: '/assets/isometric/lesson-12-gis-layers.png',
    hero: '/assets/isometric/lesson-12-gis-layers-shell.png',
    hook: '/assets/isometric/lesson-12-gis-layers-hook.webp',
  },
};
```

אם קובץ לא קיים — להציג MissingAssetPlaceholder, לא תמונה זמנית.

---

## פרומפטים ל־Magnific עבור נכסי shell חדשים

הנכסים הקיימים ב־MAGNIFIC_ASSET_PROMPTS טובים לכרטיסים ול־hook. עבור Lesson Shell צריך נכס רחב/hero שמרגיש כמו עיצוב 1.

### Global shell asset prompt

```text
Isometric papercut-style 3D illustration for a modern military-map educational interface. Clean premium editorial product-render quality. Camera angle isometric, 30–45 degrees from above. Soft realistic studio lighting with gentle shadows. Matte paper, clay, and cut-paper-layer material only. Restrained muted military-map palette: warm cream, sand paper edges, olive green, sage green, dark sage shadows, charcoal micro-details, and one small orange accent as the focal point. Professional operational tone, not playful, not cartoonish, not game-like. Wide composition suitable for a lesson hero panel, with generous empty space on one side for Hebrew UI text placed later in React. No visible text of any kind. No letters, numbers, labels, coordinates, compass letters, signage, logos, watermarks, or pseudo-writing.
```

### Negative prompt for all shell assets

```text
text, letters, numbers, words, captions, labels, signage, Hebrew text, English text, gibberish text, watermark, signature, logo, UI screenshot, browser chrome, humans, faces, crowds, blood, gore, explosions, close-up weapons, neon colors, saturated colors, glossy plastic, toy style, low-poly game asset, cluttered background, unreadable map markings, distorted geometry, motion blur
```

### topic-03 shell asset example

```text
[GLOBAL SHELL ASSET PROMPT]
A wide isometric papercut composition of a folded topographic map on a clean cream surface, with a classic olive field compass resting on the map, a subtle orange dotted route line crossing the terrain, and one small orange flag at the destination. The route should feel like navigation planning, not combat. Leave generous clean empty space on the right side for Hebrew lesson title UI. No text, no numbers, no map labels, no compass letters.
```

---

## התאמת עיצוב לכל שיעור

כל 12 השיעורים צריכים להשתמש באותה מערכת, אבל ה־asset והאייקונים משתנים לפי נושא.

| שיעור | נושא | Hero asset direction |
|---|---|---|
| 01 | מבוא/אסטרטגיה | terrain slab עם tiers אסטרטגי/אופרטיבי/טקטי ללא טקסט |
| 02 | מפות/קרטוגרפיה | folded map + contour cake + ruler |
| 03 | ניווט | compass + route + map |
| 04 | טופוגרפיה | landform relief set: ridge/valley/saddle |
| 05 | ניידות | terrain patch: trafficable route vs rough vegetation |
| 06 | LOS | hill + observation point + translucent viewshed fan |
| 07 | מזג אוויר | terrain + low cloud layer + sensor silhouette |
| 08 | לוגיסטיקה | road ribbon + supply route + depot block |
| 09 | משאבים | strait/chokepoint terrain + ship silhouette |
| 10 | עירוני | isometric city blocks + vertical depth |
| 11 | גבולות | split terrain slab + buffer band |
| 12 | GIS | stacked map layers + terrain base + network nodes |

---

## Responsive behavior

### Desktop

- max-width רחב ומרווח.
- Hero שני טורים.
- TOC בצד ימין.
- Scene card מרכזי.
- Progress bottom bar.

### Tablet

- Hero נשאר שני טורים אם יש מקום, אחרת visual יורד למעלה.
- TOC יכול להפוך ל־top horizontal list.

### Mobile

- Header compact.
- Hero vertical.
- TOC כ־horizontal pills.
- Tabs sticky קריאים.
- CTA bottom sticky אפשרי.
- אין גלילה אופקית לא רצויה.
- כל כרטיס מקבל padding קטן יותר אבל נשאר אוורירי.

---

## Animation

- fade + y 16–24px.
- duration 0.35–0.6s.
- ease `[0.22, 1, 0.36, 1]`.
- stagger עדין.
- active tab underline יכול לזוז ב־layoutId.
- אין אנימציות רבות בו זמנית.
- חובה לכבד `prefers-reduced-motion`.

---

## מה למחוק / לא להשתמש יותר

במסגרת redesign יש להסיר/להחליף כל דבר שגורם למסך להיראות כמו העיצוב הקודם:

- shell כהה מדי.
- panels צפופים.
- כותרות קטנות וחלשות.
- tabs שנראים כמו מערכת ישנה.
- TOC טכני ולא מעוצב.
- cards בלי hierarchy.
- כפתורים ישנים.
- placeholders אפורים שנראים סופיים.
- שימוש יתר ב־borders כהים.
- layout שמרגיש כמו dashboard ישן ולא כמו עיצוב 1.

---

## סדר עבודה מומלץ ל־Claude

### Phase 1 — Foundation

1. אתר את רכיבי מעטפת השיעור הקיימים:
   - `PagedLearn`
   - Lesson shell / tabs
   - TOC
   - progress
   - Lesson pages
2. צור primitives חדשים במקום לשנות נקודתית בכל שיעור.
3. חבר theme tokens.
4. צור `MissingAssetPlaceholder`.
5. צור asset lookup.

### Phase 2 — Implement topic-03 as reference

יישם קודם על שיעור 03 כי הוא מתאים לעיצוב שנבחר:

- Lesson Overview
- Lesson Shell
- Hook
- Onboarding
- Teaching scene אחת
- Interactive scene אם קיימת
- Recap
- Quiz

אל תמשיך לכל הקורס לפני ששיעור 03 נראה כמו Design 1.

### Phase 3 — Rollout to all lessons

לאחר ששיעור 03 עובד:

- החיל את ה־shell על כל 12 השיעורים.
- חבר assets לפי lesson id.
- הצג placeholders לנכסים חסרים.
- ודא שכל סצנות ה־PagedLearn עדיין עובדות.

### Phase 4 — Home / Syllabus / Lesson Overview alignment

אחד את השפה בין:

- Home Hero
- Syllabus grid
- Lesson Overview
- Lesson Shell

המטרה: כל האתר נראה כמו אותה מערכת, לא כמו מסכים מתקופות שונות.

### Phase 5 — QA

בדוק:

- desktop 1280/1440
- mobile 390/430
- RTL
- no horizontal overflow
- no text overlap
- tabs working
- next/prev working
- hash/deeplink working
- quiz working
- simulators still interactive
- `npm run build`

---

## Checklist סופי

העבודה לא גמורה עד שכל הסעיפים נכונים:

- [ ] המסך כבר לא נראה כמו העיצוב הקודם.
- [ ] Design 1 ברור כמקור ההשראה.
- [ ] כל השיעורים משתמשים באותה מעטפת חדשה.
- [ ] התוכן לא השתנה.
- [ ] האינטראקציות לא נשברו.
- [ ] הכפתורים בשפה החדשה.
- [ ] TOC חדש ומעוצב.
- [ ] Tabs חדשים ומעוצבים.
- [ ] Hero לכל שיעור תומך ב־Magnific asset.
- [ ] נכס חסר מוצג כ־MissingAssetPlaceholder בולט.
- [ ] אין fake placeholder שנראה סופי.
- [ ] אין טקסט בתוך נכסי Magnific.
- [ ] אין מפות מדויקות שהוחלפו בתמונת AI.
- [ ] RTL תקין.
- [ ] mobile תקין.
- [ ] build עובר.

---

## פרומט עבודה מומלץ ל־Claude for VS Code

```text
You are working on the Military Geography interactive course.

Read this file fully before touching code. This is a full visual redesign brief, not a polish task.

Goal:
Redesign the lesson shell and all lesson-related screens according to Design 1: a light modern military map / papercut-isometric UI. The final result must not look like the old design. Preserve all Hebrew content, lesson order, metadata, quizzes, state behavior, and interactive logic. Only redesign the UI, layout, component structure, visual hierarchy, buttons, cards, TOC, tabs, and asset integration layer.

Mandatory:
- Use existing palette tokens from tailwind.config.ts / docs/palette.md.
- Use RTL-safe layout.
- Build reusable primitives, do not manually restyle every lesson.
- Add MissingAssetPlaceholder for every missing Magnific asset.
- Use Magnific assets only as decorative/supporting visuals, never as replacements for interactive maps or simulators.
- Implement topic-03 first as the reference lesson, then roll out to all lessons.
- At the end, report in Hebrew what changed, which files were touched, what still needs visual review, and provide localhost links to check Home, Syllabus, Lesson Overview, and topic-03 Lesson Shell.

Do not stop after minor styling changes. Continue until the old visual language is fully replaced by the new Design 1 system.
```
