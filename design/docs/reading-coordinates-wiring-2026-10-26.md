# חיבור המסך „כיצד מפרשים קואורדינטות?” — שיעור 2, קואורדינטות 2 (משימה 22)

תאריך: 2026-10-26

## מצב נוכחי

| | סטטוס |
|---|---|
| הרכיב החדש `ReadingCoordinates` | מחובר לשיעור. עמוד הסקירה `/lab/reading-coordinates/` הוסר. |
| חיבור לשיעור | **בוצע בעץ הראשי (2026-10-26, לא נעשה commit).** פרטים, תיקוני ההתאמה לגובה המסך ומה נשאר פתוח: `design/docs/assumptions.md`, בסעיף „Topic 02 task 22 wired”. |
| המסך הישן `ReadingCoordinatesBlock` | הוסר, יחד עם הקוד שנשאר ללא שימוש. |

> שימו לב: הגובה 1294 שבסעיף 2 לא כלל את מצב המשוב הגבוה ביותר (שאלה 3 עם חמש הערות). אחרי קיצור הנוסח, 1294 הוא הגובה המרבי בכל המצבים.

הקובץ `CoordinatesPart2Scene.tsx` באחריות הרצה אחרת, והיא עורכת אותו כעת. למשל, היא מוציאה את `GeoProsCons` לקובץ נפרד. השינויים שלה אינם נוגעים בשורות שלהלן. לכן ההוראות מעוגנות לקטעי קוד ולא למספרי שורות.

## מה מחליפים

- **ישן:** `ReadingCoordinatesBlock`, `SystemDifferences`, `TERMS` ו־`SYSTEM_DIFFERENCES`, כולם בתוך `CoordinatesPart2Scene.tsx`.
- **חדש:** `<ReadingCoordinates />` מתוך `src/components/lessons/topic-02/reading-coordinates/ReadingCoordinates.tsx`.
- הרכיב כולל כרטיס לבן אחד ובו כל המסך: הכותרת `h3` „כיצד מפרשים קואורדינטות?”, פתיח, שתי דוגמאות מפורקות, הערת דאטום ומערכת ייחוס ובדיקת הבנה. לכן אין להוסיף מעליו כותרת או `header`.
- התכונה `data-screen="reading-coordinates"` והמרווח `my-10` נשמרים כמו במסך הישן. `FitScreen` מעביר את המרווח אל העוטף.

## שלבי חיבור (חובה)

קובץ: `src/components/lessons/topic-02/CoordinatesPart2Scene.tsx`

**1. ייבוא.** הוסיפו שורה לצד שאר הייבואים מ־`./…` של topic-02, למשל מיד אחרי `import { ProjectionsLab } from './projections/ProjectionsLab';`:

```tsx
import { ReadingCoordinates } from './reading-coordinates/ReadingCoordinates';
```

**2. החלפת המסך.** בתוך `CoordinatesPart2Scene()`, החליפו את הקטע:

```tsx
      <FitScreen name="reading-coordinates" height={724}>
        <ReadingCoordinatesBlock />
      </FitScreen>
```

בקטע הזה:

```tsx
      <FitScreen name="reading-coordinates" height={1294}>
        <ReadingCoordinates />
      </FitScreen>
```

`1294` הוא הגובה שנמדד ברוחב הייחוס של 1344px, במצב הגבוה ביותר. בתוך `LessonFitUniform` הגובה הזה אינו משנה את קנה המידה, ולכן רוחב המסך זהה לשאר מסכי השיעור. ב־1440×1122 נמדד קנה מידה 0.7827, והכרטיס כולו נכנס מתחת ל־header, מ־y=96 עד y=1108.

הקובץ בעץ הראשי משתמש ב־LF, ובעותק worktree ב־CRLF. אם החלפה בסקריפט נכשלת, ייתכן שהיא תלויה בסוף השורה.

## ניקוי (מומלץ, באותו commit)

אחרי שלב 2, הקוד הבא ב־`CoordinatesPart2Scene.tsx` אינו בשימוש. ההגדרה `strict` בלי `noUnusedLocals` לא תיכשל בגללו, אבל מומלץ להסיר:

- `ReadingCoordinatesBlock`, `SystemDifferences`, `TERMS`, `SYSTEM_DIFFERENCES`.
- `H3` ו־`LEAD`. ב־HEAD רק `ReadingCoordinatesBlock` משתמש בהם. לפני ההסרה, ודאו בעזרת grep שזה עדיין המצב.
- `import { cn } …`, אם אחרי ההסרות ואחרי הוצאת `GeoProsCons` לא נשאר בקובץ אף `cn(`. ‏`L` עדיין בשימוש ב־`UtmBlock` וב־`Part2Summary`.
- הערת הבלוק שמעל `TERMS`, שמתחילה ב־`/* Two screens (claude-linked-comparison-toggle-and-split.md …`, וההערה `/* Screen 2 — static … */` כבר אינן מתארות את המצב. במקומן אפשר לכתוב:
  `/* Screen 2 — ./reading-coordinates: point A's reading taken apart (geographic, UTM), the datum and the reference system, and a short check. */`

## עדכון QA שנדרש בסקריפט של מערכות הייחוס

הסקריפט `scripts/qa/shot-reference-systems.mjs` שייך לפעילות מערכות הייחוס, ולכן לא נערך כאן. ב־worktree הורץ הסקריפט על השיעור לפני החיבור ואחריו:

| בדיקה | לפני החיבור (HEAD) | אחרי החיבור |
|---|---|---|
| `screen 2: separate, static, after the card, still defines the datum (WGS84)` | עוברת | **נכשלת:** התנאי `s2Controls === 0` דורש מסך סטטי, והמסך החדש אינטראקטיבי בכוונה. |
| `shell: order …` (הכותרת „מידע נוסף על UTM” מופיעה בין „היטל UTM” ל„מערכות ייחוס”) | נכשלת | נכשלת. לא קשור לחיבור. |
| `scene copy: "בהמשך נכיר שתי מערכות…"` | נכשלת | נכשלת. לא קשור לחיבור. |
| שאר הבדיקות, כולל `palette`, `icons` ו־`a11y ids` | עוברות | עוברות |

התיקון המוצע לבדיקה הראשונה, בתנאי של `check(layout.inCard === 0 && layout.s2After && …)`:

- הסירו את `layout.s2Controls === 0`.
- שנו את ההודעה ל־`'screen 2: separate, after the card, still names the datum (WGS84)'`.
- שמרו את `inCard === 0`, את `s2After` ואת `s2Datum`.

אחרי החיבור, הצילום `r4-07-screen2-static-summary.png` יציג את המסך החדש, ולכן שמו כבר לא יתאר אותו.

## בדיקה אחרי החיבור

```bash
node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/reading-coordinates.test.mjs
QA_BASE=http://localhost:3000 node scripts/qa/shot-reading-coordinates.mjs design/screenshots/reading-coordinates-2026-10-26 --lesson
```

הצפי:

- 9/9 בבדיקות היחידה.
- `PASS — 13 shots` בבדיקת הדפדפן. הצילומים נשמרים בשמות `lesson-NN-*.png`.
- ב־1440×1122, ראש הכרטיס ב־y≈96 ותחתיתו לכל היותר ב־y=1122.

## אחרי החיבור

אפשר למחוק את עמוד הסקירה `src/app/lab/reading-coordinates/page.tsx`. הוא לא מקושר מהאתר, אבל נכלל ב־static export, בדומה ל־`lab/trafficability-drive`.
