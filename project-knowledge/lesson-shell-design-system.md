# lesson-shell-design-system.md

> **Redesign implementation brief — based on selected Lesson Shell design 1**  
> פרויקט: קורס גיאוגרפיה צבאית / GeoInteractive  
> מטרה: לבנות מחדש את מעטפת השיעור וכל תבניות השיעורים בסגנון אחיד, מודרני, בהיר ומבצעי — בלי לשנות תוכן, סדר למידה, אינטראקציות או לוגיקה קיימת.

---

## 0. מה המסמך הזה עושה

המסמך הזה מגדיר את מערכת ה־UI/UX החדשה לשיעורים בקורס, על בסיס **עיצוב 1 של Lesson Shell** שנבחר ככיוון.

הכיוון הוא:

- ממשק בהיר, נקי, מבוסס קרם/לבן/מרווה/כתום.
- תחושה של **שולחן מפות צבאי מודרני**.
- כרטיסים לבנים מוגבהים, רקע טופוגרפי עדין, ניווט ברור, CTA כתום חזק.
- מעטפת שיעור עם Header, Breadcrumb, Hero שיעור, Tabs, TOC צדדי, תוכן מרכזי, ניווט תחתון ו־Utility bar.
- נכסי Magnific בסגנון isometric papercut / military map editorial — כתוספת ויזואלית תומכת, לא כתחליף לתרשימים או סימולציות אינטראקטיביות.

המסמך מיועד ל־Claude for VS Code כדי לבצע redesign עמוק בקוד.

---

## 1. מטרת העל

לבנות מערכת שיעור אחידה לכל הקורס כך שכל השיעורים ייראו כאילו נבנו מאותה מערכת עיצובית:

- אותו Header.
- אותה מעטפת שיעור.
- אותם כפתורים.
- אותם Tabs.
- אותו TOC.
- אותו מבנה סצנה.
- אותו סגנון כרטיסים.
- אותה שפת נכסים של Magnific.
- אותה היררכיית טיפוגרפיה.
- אותה שפת התקדמות וניווט.

**אסור לשנות את התוכן או האינטראקציות.**  
מותר לשנות רק את העיצוב, המבנה הוויזואלי, הקומפוננטות, המרווחים, הטיפוגרפיה, צבעים מתוך הפלטה, מיקום אלמנטים, ושילוב נכסי תמונה דקורטיביים/תומכים.

---

## 2. עקרונות שלא שוברים

### 2.1 תוכן ולוגיקה

אסור:

- למחוק טקסטים קיימים.
- להוסיף תוכן לימודי חדש.
- לשנות כותרות שיעור או מטרות לימוד ללא הוראה מפורשת.
- לשנות סדר סצנות.
- לשנות תשובות Quiz או רציונלים.
- להחליף אינטראקציות פעילות בתמונה סטטית.
- להפוך מפות או SVG בגלל RTL.
- להכניס טקסט לתוך נכסי Magnific.

מותר:

- לעטוף את התוכן מחדש בקומפוננטות מעוצבות.
- לשנות layout.
- לשנות spacing.
- לשפר כפתורים, כרטיסים, headers, tabs, progress, TOC.
- להוסיף placeholders ברורים לנכסים שחסרים.
- להוסיף assets דקורטיביים תומכים בלבד.
- להחליף תמונת אווירה/אייקון דקורטיבי, אבל לא תרשים/סימולציה שמלמדים מושג מדויק.

### 2.2 זהות הקורס

כל מסך חייב להרגיש:

- עברי RTL.
- צבאי־מקצועי.
- גיאוגרפי ומבצעי.
- רציני, נקי, לא משחקי.
- מודרני, לא “מצגת ישנה”.
- ברור ונגיש ללומד בן 18–23 בלי רקע קודם.

---

## 3. הסגנון הוויזואלי הנבחר

שם הסגנון:

**Modern Military Map · Light Tactical Lesson Shell**

תיאור:

ממשק לימוד בהיר שמרגיש כמו שולחן עבודה של קצין שטח: נייר קרם, מפות טופוגרפיות, כרטיסים לבנים, קווי מתאר עדינים, אייקונים צבאיים נקיים, ואקסנט כתום שמוביל את הפעולה הבאה.

הסגנון לא כהה ברובו. הוא בהיר ומאוורר, עם שימוש נקודתי במרווה כהה או ירוק צבאי רק להדגשה, לא כרקע ראשי לכל המסך.

---

## 4. פלטת צבעים מחייבת

להשתמש רק בטוקנים קיימים מהפרויקט / Tailwind / palette.

### צבעי בסיס

| שימוש | צבע | תפקיד |
|---|---|---|
| רקע עמוד | `#FFFBF7` | קנבס קרם חם |
| כרטיסים | `#FFFFFF` | Surface לבן מוגבה |
| רקע hover / אזור עדין | `#F5EDDE` | מילוי חם ועדין |
| טקסט ראשי | `#000000` | כותרות וגוף |
| טקסט משני | `#3a3a3a` / `#6a6a6a` | תיאורים, metadata |
| אקסנט ראשי | `#EB9E48` | CTA, active state, קו הדגשה |
| אקסנט hover | `#F2B872` | hover/gradient עדין |
| מרווה | `#749C75` | ברנד, אייקונים, progress חיובי |
| מרווה כהה | `#5B7C5C` | טקסט/גבול/רקע קטן |
| חול | `#C2A26B` | Terrain / paper edges |
| פחם | `#3a3a3a` | אייקונים/מיקרו-פרטים |

### כללים

- כתום הוא צבע פעולה. לא להשתמש בו כטקסט ארוך.
- ירוק/מרווה הוא צבע מערכת, סטטוס ומותג.
- אדום/כחול/סגול רק אם הם כבר סמנטיים בתרשים קיים — לא להוסיף לצורך גיוון.
- אין HEX חדשים.
- אין neon.
- אין dark sci-fi.
- אין gradient צבעוני מוגזם.

---

## 5. טיפוגרפיה

### פונטים

- גוף: Heebo.
- כותרות: Rubik / font-display.
- מספרים, קואורדינטות, אזימוט, נתוני שטח: mono אם קיים בפרויקט.

### היררכיה

#### H1 — כותרת שיעור / Hero

- גדול מאוד, שחור, משקל כבד.
- line-height צפוף.
- אפשר underline קצר בצבע כתום מתחת לחלק מהכותרת.
- לא להשתמש בכתום לכל הכותרת.

#### H2 — כותרת סצנה

- ברור, שמן, יושב בתוך card/content area.
- לצד chip קטן של מספר סצנה.

#### H3 — כותרת כרטיס/מטרה

- בינוני, חד, לא ארוך.

#### גוף

- קצר, קריא, 2–4 שורות לפסקה.
- צבע `fg-muted` לטקסט משני.

---

## 6. מבנה מעטפת שיעור — העיצוב הנבחר

מעטפת השיעור צריכה להיות מבוססת על עיצוב 1 שנבחר:

```text
Global Header
↓
Breadcrumb + Lesson Hero
↓
Lesson stats card
↓
Tabs row: לימוד / תרגול / בדיקת ידע
↓
Main layout:
  Right side: TOC / תוכן השיעור
  Center/Left: scene content card
↓
Scene navigation footer
↓
Sticky utility/action bar
```

ב־RTL הצד הימני הוא הצד המוביל. לכן TOC יושב מימין בדסקטופ.

---

## 7. Global Header

### מבנה

Header עליון קבוע בכל המסכים:

- לוגו/סמל קורס בצד ימין.
- שם הקורס: “גיאוגרפיה צבאית”.
- תת־כותרת קטנה: “לקרוא שטח. להבין החלטה.” או טקסט קיים אם יש.
- ניווט ראשי: בית / הקורס שלי / ספרייה / מפת שטח / כלים / אודות.
- אזור משתמש בצד שמאל: Avatar, שם, התראות, חיפוש.

### עיצוב

- רקע לבן או קרם שקוף־עדין.
- border-bottom דק.
- גובה בערך 72px.
- sticky top אם זה לא פוגע בלמידה.
- shadow עדין מאוד.

### אסור

- Header כהה כבד בכל העמוד.
- הרבה צבעים.
- לוגו גדול מדי.

---

## 8. Lesson Hero בתוך מעטפת שיעור

### מבנה

בכל שיעור, מעל הסצנה הפעילה, יש Hero קצר:

- Breadcrumb קטן: `הקורס שלי / שיעורים / שיעור 03`.
- כותרת שיעור גדולה: `שיעור 03 — ניווט ותכנון מסלול`.
- תיאור קצר של השיעור.
- כרטיס התקדמות קטן בצד שמאל/ימין לפי layout.
- רקע טופוגרפי עדין.

### עיצוב

- רקע קרם, ללא כרטיס כבד.
- אפשר `topo-bg` עדין.
- כותרת גדולה אבל לא תופסת את כל המסך.
- קו כתום קצר מתחת לכותרת.
- כרטיס התקדמות לבן מוגבה עם אחוז, progress bar, “X מתוך Y שלבים”.

---

## 9. Lesson Stats Card

מתחת ל־Hero יופיע כרטיס נתוני שיעור רוחבי.

### שדות

- משך השיעור.
- רמת קושי.
- סוג שיעור / סוג תרגול.
- התקדמות.
- סטטוס השלמה.

### עיצוב

- כרטיס לבן ארוך, rounded-2xl.
- חלוקה לעמודות עם border פנימי עדין.
- אייקון פשוט ליד כל שדה.
- הערך המרכזי מודגש.
- טקסט משנה קטן.

---

## 10. Tabs — לימוד / תרגול / בדיקת ידע

Tabs הם חלק חשוב מהשפה של הכפתורים.

### מבנה

שלושה טאבים קבועים:

1. לימוד
2. תרגול
3. בדיקת ידע

### מצב פעיל

- Active tab: כתום או מרווה, קו תחתון כתום, אייקון פעיל.
- Inactive: טקסט שחור/אפור, רקע לבן.

### עיצוב

- הכרטיס כולו לבן.
- border-bottom פנימי.
- כל tab ברוחב שווה בדסקטופ.
- במובייל להפוך ל־horizontal scroll pills.

---

## 11. Main Lesson Layout

### בדסקטופ

```text
[ Content Card — wide ] [ TOC Sidebar — fixed width ]
```

- TOC בצד ימין.
- תוכן מרכזי תופס את רוב הרוחב.
- gap 24–32px.
- max-width מרכזי 1280–1440px.

### במובייל

```text
[ Mobile scene pills / TOC drawer ]
[ Content Card ]
[ Navigation buttons ]
```

- TOC הופך ל־drawer או scrollable chips.
- אין sidebar קבוע.
- ה־CTA נשאר ברור.

---

## 12. TOC Sidebar — תוכן השיעור

### מבנה

רשימת סצנות:

- מספר סצנה.
- שם סצנה.
- סטטוס: completed / active / locked / not started.
- משך אם קיים.
- אייקון קטן אם מתאים.

### מצב סצנה

| מצב | עיצוב |
|---|---|
| completed | עיגול ירוק/מרווה עם check |
| active | פס כתום בצד + טקסט כתום/שחור + רקע קרם חם |
| locked | lock אפור, opacity נמוך |
| future | עיגול outline אפור |

### כללים

- לא להסתיר את שמות הסצנות.
- לא להשתמש במספרים בלבד.
- active state חייב להיות ברור מאוד.
- ב־RTL הפס הפעיל בצד ימין של הפריט.

---

## 13. Content Card — אזור הסצנה

כל סצנה יושבת בתוך כרטיס מרכזי:

- רקע לבן.
- rounded-2xl.
- border עדין.
- shadow רך.
- padding רחב.
- Header פנימי לסצנה.
- גוף הסצנה.
- Caption / insight / conclusion אם קיים.

### Scene Header

לכל סצנה:

- chip קטן: `סצנה 02 מתוך 11`.
- H2 גדול.
- intro קצר.
- metadata אם קיים: משך / סוג / קושי.

### גוף הסצנה

בהתאם לסוג:

- טקסט + כרטיסים.
- לוח הסבר + accordion.
- מפה / SVG.
- סימולציה.
- Quiz.

**לא לשנות את הלוגיקה של גוף הסצנה. רק לעטוף ולהתאים לעיצוב החדש.**

---

## 14. Navigation Footer בתוך שיעור

בתחתית כרטיס הסצנה:

- כפתור “הבא” כתום.
- כפתור “הקודם” outline.
- אינדיקטור נקודות/שלבים במרכז.
- טקסט: `סצנה 2 מתוך 11`.

### RTL

- כיוון החץ חייב להרגיש נכון בעברית.
- “הבא” מוביל קדימה לפי סדר הלמידה, לא לפי צד ויזואלי בלבד.

---

## 15. Sticky Utility Bar

בתחתית המסך, בדסקטופ, אפשר להשתמש ב־utility bar דק:

- כפתור CTA ראשי: “המשך לשלב הבא”.
- סימון השלמה.
- הוסף למועדפים.
- רשום הערה.
- הורדת חומרי שיעור.
- התקדמות כללית בשיעור.

### עיצוב

- לבן / קרם.
- border-top עדין.
- shadow מעל.
- לא גבוה מדי.
- במובייל: להפוך ל־bottom action bar עם CTA אחד ברור.

---

## 16. שפת כפתורים

השפה של הכפתורים חייבת להישמר בכל הקורס.

### Primary CTA

שימוש:

- התחלת שיעור.
- המשך לשלב הבא.
- בדיקת תשובה.
- סיום שיעור.

עיצוב:

```text
background: accent #EB9E48
hover: accent-hover #F2B872
text: white / near-black only if contrast better
rounded-xl
height: 48–56px
font-weight: 700
icon: small arrow/play
shadow: subtle orange glow, not neon
```

טקסטים אפשריים:

- `התחל שיעור`
- `המשך לשלב הבא`
- `בדוק תשובה`
- `סיים שיעור`
- `המשך לתרגול`

### Secondary Button

שימוש:

- חזרה לסילבוס.
- צפייה במבנה שיעור.
- הורדת חומרי שיעור.

עיצוב:

```text
background: transparent / white
border: 1px solid muted sage/fg-dim
text: fg / brand-dark
rounded-xl
height: 48–56px
```

### Tertiary / Ghost

שימוש:

- קישורים קטנים.
- פעולות משניות.

עיצוב:

```text
background: none
text: fg-muted
hover: bg-accent
```

### Disabled

- opacity 40–50%.
- cursor not-allowed.
- ללא hover חזק.

---

## 17. רכיבים שחייבים להיות עקביים

יש ליצור/לעדכן רכיבים משותפים, ולא להעתיק classNames בכל שיעור.

### רשימת רכיבים מומלצת

```text
src/components/ui/AppHeader.tsx
src/components/ui/PageShell.tsx
src/components/ui/SurfaceCard.tsx
src/components/ui/Button.tsx
src/components/ui/ProgressBar.tsx
src/components/ui/StatusChip.tsx
src/components/ui/IconBadge.tsx
src/components/lesson/LessonHero.tsx
src/components/lesson/LessonStatsBar.tsx
src/components/lesson/LessonTabs.tsx
src/components/lesson/LessonShell.tsx
src/components/lesson/LessonToc.tsx
src/components/lesson/SceneCard.tsx
src/components/lesson/SceneNavigation.tsx
src/components/lesson/LessonUtilityBar.tsx
src/components/assets/IsometricAsset.tsx
src/components/assets/AssetPlaceholder.tsx
```

אם קיימים רכיבים מקבילים — לשדרג אותם במקום ליצור כפילות.

---

## 18. נכסי Magnific — עקרונות שימוש

כל השיעורים צריכים להשתמש בשפת asset אחידה:

**Isometric papercut-style 3D illustration for a modern military-map educational interface.**

### תפקיד הנכסים

נכסי Magnific הם:

- Hero visual.
- Card thumbnail.
- Feature icon.
- Atmospheric hook asset.
- Decorative support panel.

נכסי Magnific אינם:

- מפה מדויקת.
- תרשים שמסביר חישוב.
- סימולציה.
- תחליף ל־SVG אינטראקטיבי.
- מקום לטקסט עברי.
- מקום לקואורדינטות/מספרים/תוויות.

### סגנון הנכס

כל נכס:

- איזומטרי 30–45 מעלות.
- matte paper / clay / cut-paper.
- לא פלסטיק מבריק.
- לא cartoon.
- לא low-poly game.
- לא dark sci-fi.
- צבעים: cream, sand, olive, sage, dark sage, charcoal, orange accent.
- ללא טקסט.
- ללא watermark.
- ללא בני אדם קרובים/פנים.
- ללא אלימות או כלי נשק בקלוז־אפ.

---

## 19. Asset Placeholder — חובה כשאין תמונה

אם asset חסר, לא לייצר placeholder יפה שנראה גמור.

במקום זה לשים placeholder ברור ובולט:

- רקע מג׳נטה/ורוד חזק או pattern חריג.
- טקסט בעברית: `PLACEHOLDER — צריך להפיק asset ב-Magnific`.
- שם asset צפוי.
- target path.

לדוגמה:

```tsx
<AssetPlaceholder
  assetId="LESSON-03-HOOK"
  targetPath="public/assets/isometric/lesson-03-navigation-hook.webp"
  note="להפיק ב-Magnific לפי prompt"
/>
```

מטרת placeholder: שיהיה ברור שעדיין חסר asset ולא לחשוב שזה עיצוב סופי.

---

## 20. מיפוי נכסים לפי שיעור

כל שיעור יקבל לפחות שני נכסים:

1. Card asset — 1:1 לכרטיס/סילבוס/overview.
2. Hook/Hero asset — 16:9 או 21:9 לסצנת פתיחה/overview.

| שיעור | נושא | Card asset | Hook/Hero asset |
|---|---|---|---|
| 01 | מבוא, מרחב, אסטרטגיה | `lesson-01-strategy-terrain.png` | `lesson-01-strategy-terrain-hook.webp` |
| 02 | מפות, קואורדינטות, קווי גובה | `lesson-02-map-reading.png` | `lesson-02-map-reading-hook.webp` |
| 03 | ניווט ותכנון מסלול | `lesson-03-navigation.png` | `lesson-03-navigation-hook.webp` |
| 04 | טופוגרפיה ומורפולוגיה | `lesson-04-landforms.png` | `lesson-04-landforms-hook.webp` |
| 05 | ניידות, עבירות, מחסה/מסתור | `lesson-05-mobility.png` | `lesson-05-mobility-hook.webp` |
| 06 | LOS / קווי ראייה | `lesson-06-los.png` | `lesson-06-los-hook.webp` |
| 07 | אקלים ומזג אוויר | `lesson-07-weather.png` | `lesson-07-weather-hook.webp` |
| 08 | לוגיסטיקה ותשתיות | `lesson-08-logistics.png` | `lesson-08-logistics-hook.webp` |
| 09 | משאבים ונקודות חנק | `lesson-09-chokepoints.png` | `lesson-09-chokepoints-hook.webp` |
| 10 | שטח בנוי / Urban | `lesson-10-urban.png` | `lesson-10-urban-hook.webp` |
| 11 | גבולות ועומק אסטרטגי | `lesson-11-borders.png` | `lesson-11-borders-hook.webp` |
| 12 | GIS ושכבות מידע | `lesson-12-gis-layers.png` | `lesson-12-gis-layers-hook.webp` |

כל הקבצים יישבו תחת:

```text
public/assets/isometric/
```

---

## 21. שימוש ב-assets לפי סוג מסך

### Home Hero

- להשתמש ב־`home-hero-terrain.png` או ב־TerrainDiorama הקיים אם הוא מוצלח יותר.
- לא למחוק רכיב תלת־ממדי קיים בלי אישור.

### Syllabus / Lesson Grid

- כל כרטיס שיעור מקבל `lesson-XX-*.png`.
- התמונה קטנה, לא מתחרה עם הטקסט.
- סטטוס/משך/קושי נשאר HTML אמיתי.

### Lesson Overview

- Hero visual רחב או card image.
- Objectives בכרטיסים.
- CTA ברור להתחלה.

### Lesson Shell

- asset קטן ב־Hero בלבד או ברקע עדין.
- לא לשים asset גדול בכל סצנה.

### Hook Scene

- מותר asset אטמוספרי רחב.
- לא לשים טקסט בתוך התמונה.
- הכותרת וה־CTA ב־HTML אמיתי.

### Teaching Scene

- עדיפות לתרשים SVG אמיתי אם יש מושג מדויק.
- asset רק כקישוט תומך בצד, לא במרכז ההסבר.

### Interactive Simulator

- אין להחליף את הלוח/מפה/סימולציה בתמונה.
- אפשר asset קטן בכותרת או empty-state בלבד.

### Recap

- אפשר asset קטן של סיום/דגל/מפה.
- המונחים נשארים כ־HTML cards.

### Quiz

- מינימלי. לא להעמיס asset.
- פוקוס על שאלה, תשובות, פידבק ורציונל.

---

## 22. התאמת 10 סוגי המסכים לשפה החדשה

### 22.1 Home Hero

מבנה:

- Header.
- כותרת גדולה.
- תיאור קצר.
- CTA כתום.
- secondary CTA.
- Hero asset איזומטרי.
- שורת יתרונות בתחתית.

עיצוב:

- קרם בהיר.
- asset גדול בצד.
- כרטיס יתרונות לבן נמוך.

### 22.2 Syllabus / Lesson Grid

מבנה:

- כותרת “תכנית הלימודים”.
- progress summary.
- filters.
- grid של 12 שיעורים.
- CTA להמשך מהנקודה האחרונה.

עיצוב:

- grid cards לבנים.
- מספר שיעור כתום.
- asset קטן לכל שיעור.
- סטטוס עם chip.

### 22.3 Lesson Overview

מבנה:

- Hero דו־עמודי: asset + טקסט.
- כפתור התחלה.
- stats bar.
- מטרות השיעור.
- מבנה השיעור.
- דרישות קדם.
- שיעורים קשורים.

עיצוב:

- כרטיסי מטרות עם אייקון.
- CTA כתום גדול.
- secondary “חזור לסילבוס”.

### 22.4 Lesson Shell

מבנה לפי מסמך זה.

חובה:

- Header.
- Breadcrumb.
- Hero שיעור.
- Progress card.
- Tabs.
- TOC sidebar.
- Content card.
- Scene navigation.
- Utility bar.

### 22.5 Hook Scene

מבנה:

- מסך כמעט מלא.
- chip שיעור.
- כותרת hook גדולה.
- תת־כותרת קצרה.
- CTA יחיד.
- asset אטמוספרי.

עיצוב:

- דרמטי אבל בהיר.
- לא ללמד פה — רק לייצר מתח ורצון להמשיך.

### 22.6 Onboarding

מבנה:

- מטרות.
- מפת דרך.
- מושגי בסיס.
- מה יקרה בשיעור.

עיצוב:

- cards + timeline.
- asset קטן/צידי.
- בלי עומס טקסט.

### 22.7 Teaching Scene

מבנה:

- SceneHeader.
- הסבר קצר.
- לוח הסבר / תרשים / cards.
- מקרא.
- מסקנה מבצעית.

עיצוב:

- card מרכזי.
- כרטיס conclusion בגוון חם.
- תרשים SVG נשאר מדויק.

### 22.8 Interactive Simulator Scene

מבנה:

- Header.
- לוח/מפה/סימולציה.
- controls.
- live result.
- feedback.
- explanation.

עיצוב:

- controls בכרטיסים לבנים.
- מד תוצאה ברור.
- כתום מסמן פעולה.
- ירוק מסמן הצלחה/כיסוי.

### 22.9 Recap Scene

מבנה:

- “כל הכבוד”.
- מה הלומד יודע לעשות עכשיו.
- רשת מושגים.
- CTA לשיעור הבא.

עיצוב:

- celebration מאופק.
- badge/asset קטן.
- אין קונפטי/משחקיות.

### 22.10 Quiz Scene

מבנה:

- שאלה.
- 4 תשובות.
- progress בשאלות.
- feedback נכון/לא נכון.
- רציונל.

עיצוב:

- תשובה נבחרת עם border כתום.
- נכון ירוק.
- שגוי אדום רק סמנטית, לא דרמטי.
- רציונל בכרטיס קרם.

---

## 23. Responsive rules

### Desktop

- max width: 1280–1440.
- TOC sidebar קבוע מימין.
- content card רחב.
- stats bar אופקי.

### Tablet

- TOC יכול להפוך ל־collapsible panel.
- Hero מקטין asset.
- cards ב־2 columns.

### Mobile

- Header מצומצם.
- TOC כ־drawer או horizontal chips.
- כפתור CTA sticky בתחתית.
- cards בעמודה אחת.
- padding קטן יותר.
- אין overflow אופקי.

---

## 24. RTL rules

חובה:

- להשתמש ב־logical properties: `ms`, `me`, `ps`, `pe`, `start`, `end`.
- לא להשתמש ב־left/right אם אין סיבה חזקה.
- maps/SVG לא מתהפכים ב־RTL.
- arrows צריכים להרגיש נכונים למשתמש עברי, אבל לא להפוך משמעות גיאוגרפית.
- TOC בצד ימין בדסקטופ.
- active border בצד ימין של פריט TOC.

---

## 25. Motion / Animation

אנימציה מותרת רק כשהיא תומכת בהבנה.

### כללים

- reveal עדין: fade + y קטן.
- duration 0.3–0.6s.
- ease קבוע: `[0.22, 1, 0.36, 1]` אם כבר קיים.
- לא להנפיש הרבה דברים בבת אחת.
- לכבד `prefers-reduced-motion`.

### דוגמאות טובות

- active tab underline זז בעדינות.
- TOC active state משתנה בצורה ברורה.
- progress bar מתמלא.
- scene card מופיע בכניסה.

### דוגמאות אסורות

- floating icons ללא משמעות.
- parallax מוגזם.
- bounce/cartoon.
- אנימציות שמאטות למידה.

---

## 26. QA לפני סיום

Claude חייב לבצע בדיקות לפני שהוא מסיים.

### בדיקות חובה

- `npm run build` או לפחות typecheck אם build חסום מסיבה קיימת.
- בדיקה בדסקטופ.
- בדיקה במובייל.
- אין overflow אופקי.
- TOC עובד.
- Tabs עובדים.
- Hash/deep-link של PagedLearn נשמר.
- כפתורי הבא/הקודם עובדים.
- Quiz עובד.
- אינטראקציות קיימות לא נשברו.
- מפות לא התהפכו.
- אין טקסט חופף.
- אין asset עם טקסט פנימי.
- placeholders בולטים אם חסר asset.

### Checklist סופי לדיווח בעברית

בסוף העבודה Claude צריך להחזיר בעברית:

```text
מה שיניתי:
- ...

איפה שיניתי:
- ...

מה לא שיניתי בכוונה:
- תוכן השיעורים
- סדר הסצנות
- לוגיקת אינטראקציות
- שאלות Quiz

מה צריך לבדוק ידנית:
- ...

קישורים לבדיקה ב-localhost:
- דף הבית: http://localhost:3000/
- סילבוס: http://localhost:3000/#/ או הנתיב הקיים בפועל
- שיעור 03 מעטפת: http://localhost:3000/lessons/topic-03 או הנתיב הקיים בפועל
```

---

## 27. הנחיות ישירות ל-Claude for VS Code

כאשר אתה מיישם את המסמך הזה:

1. קרא קודם את קבצי הפרויקט הרלוונטיים:
   - `tailwind.config.ts`
   - `docs/palette.md` אם קיים
   - `src/components/lesson/PagedLearn.tsx`
   - `src/lib/lessons.ts`
   - `src/lib/quizzes.ts`
   - `src/components/lessons/topic-XX/TopicXXLesson.tsx`
   - דוגמאות scene קיימות מכל סוג
2. אל תבנה עיצוב חדש שלא מופיע במסמך.
3. אל תשנה תוכן.
4. אל תחליף אינטראקציה בתמונה.
5. אם חסר asset — שים placeholder בולט.
6. בנה קומפוננטות משותפות, לא פתרון חד־פעמי לכל שיעור.
7. התחל ממעטפת השיעור ורק אחר כך הפץ לשיעורים.
8. ודא שכל 12 השיעורים עובדים עם אותה מערכת.
9. ודא ש־Home, Syllabus, Lesson Overview, Lesson Shell, Hook, Onboarding, Teaching, Interactive, Recap, Quiz משתמשים באותה שפה.
10. בסוף תן סיכום בעברית + קישורי localhost מדויקים.

---

## 28. סדר עבודה מומלץ

### Phase 1 — Foundations

- ליצור/לשדרג Button, SurfaceCard, ProgressBar, StatusChip.
- להגדיר class/style משותפים.
- לוודא tokens בלבד.

### Phase 2 — Lesson Shell

- לבנות LessonHero.
- לבנות LessonStatsBar.
- לבנות LessonTabs.
- לבנות LessonToc.
- לבנות SceneCard.
- לבנות SceneNavigation.
- לשלב ב־PagedLearn / LessonShell בלי לשבור state.

### Phase 3 — Lesson Overview

- לעצב דף כניסה לשיעור.
- לשלב asset/placeholder.
- לשמור CTA ושדות metadata.

### Phase 4 — Syllabus

- לעצב grid שיעורים לפי אותה שפה.
- לשלב card assets/placeholder.
- לשמור סטטוסים/קושי/משך/התקדמות.

### Phase 5 — Scene Templates

- Hook.
- Onboarding.
- Teaching.
- Interactive.
- Recap.
- Quiz.

### Phase 6 — All lessons pass

- לעבור על 12 השיעורים.
- לוודא התאמה מלאה.
- לתקן חריגות.
- לבצע QA.

---

## 29. קווים אדומים

אין לסיים את העבודה אם אחד מהדברים הבאים קורה:

- תוכן לימודי השתנה בטעות.
- סצנה נמחקה.
- אינטראקציה הפסיקה לעבוד.
- Quiz נשבר.
- מפה התהפכה ב־RTL.
- כפתורי ניווט לא עובדים.
- asset עם טקסט/גיבריש נכנס לממשק.
- placeholder נראה כמו עיצוב סופי.
- יש צבעים מחוץ לפלטה.
- יש overflow במובייל.
- יש טקסט חופף.

---

## 30. תיאור קצר של התוצאה הרצויה

בסוף היישום, הקורס צריך להרגיש כמו מוצר אחד שלם:

- דף בית עם Hero חזק.
- סילבוס כגריד שיעורים מקצועי.
- דף Overview שמכניס לשיעור בצורה ברורה.
- מעטפת שיעור אחידה עם TOC ו־Tabs.
- סצנות שנראות שייכות לאותה מערכת.
- כפתורים אחידים.
- נכסי Magnific באותה שפה.
- RTL נקי.
- חוויית למידה שמרגישה צבאית, מודרנית, ברורה ומבצעית.

התחושה הסופית:  
**לא אתר לימוד גנרי — אלא מערכת הכשרה דיגיטלית לגיאוגרפיה צבאית.**
