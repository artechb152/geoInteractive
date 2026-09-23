# סימולטור צורות שטח

רכיב React ללימוד **זיהוי צורות שטח** — קריאת מפה טופוגרפית מול תצלום אוויר אנכי של
אותו שטח בדיוק.

הלומד מקבל שלוש שכבות מיושרות של אותו קטע קרקע (תצ״א, מפה טופוגרפית והצללת תבליט),
שש-עשרה צורות שטח שכל הגאומטריה שלהן חולצה אוטומטית ממודל גובה אמיתי, מצב תרגול עם
משוב, מסלול שיעור מובנה, וכלי חתך גובה.

> **אין כאן אף קואורדינטה שנכתבה ביד.** כל צורה מאותרת מהשטח עצמו לפי הקריטריון
> הקרטוגרפי שלה — טבעת קונטור סגורה, קודקוד U מול קודקוד V, התלכדות קווים — ולכן
> אותו קוד עובד על כל אזור חדש. צורה שאין לה מופע מובהק באזור מסוים פשוט אינה
> מיוצרת שם.

---

## התקנה

```bash
npm install terrain-map-simulator
```

React 18 ומעלה הוא תלות עמית (`peerDependency`).

```tsx
import TerrainMapSimulator from 'terrain-map-simulator';
import 'terrain-map-simulator/style.css';

export default function Lesson() {
  return <TerrainMapSimulator areaId="gilboa" headingLevel={2} />;
}
```

החבילה היא **ESM בלבד**. כל בנדלר מודרני (Vite, Next, webpack 5, Parcel) טוען אותה
כמות שהיא. ב-Next App Router הרכיב כבר מסומן `'use client'` ואינו דורש עטיפה.

---

## Props

| Prop             | טיפוס                                        | ברירת מחדל                 | תיאור                                                            |
| ---------------- | -------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `areaId`         | `string`                                     | האזור הראשון               | אזור הפתיחה. כשמסופק — הרכיב **נשלט מבחוץ** ואינו זוכר אזור אחר. |
| `mode`           | `'explore' \| 'quiz' \| 'lesson'`            | `'explore'`                | מצב הפתיחה.                                                      |
| `initialBlend`   | `number` (0..1)                              | `0.5` בווילון, `0` בשקיפות | ערך פתיחה למחוון ההשוואה.                                        |
| `compareMode`    | `'wipe' \| 'fade' \| 'split' \| 'hillshade'` | `'wipe'`                   | מצב ההשוואה ההתחלתי.                                             |
| `showLegend`     | `boolean`                                    | `true`                     | הצגת המקרא.                                                      |
| `showAreaPicker` | `boolean`                                    | `true`                     | הצגת בורר האזורים. כבו אם הקורס מנהל בעצמו את הרצף.              |
| `showProgress`   | `boolean`                                    | `true`                     | הצגת מחוון ההתקדמות וכפתור האיפוס.                               |
| `locale`         | `'he' \| 'en'`                               | `'he'`                     | שפת הממשק. **קובעת גם את `dir`** — אין `rtl` קשיח.               |
| `headingLevel`   | `2 \| 3 \| 4`                                | `2`                        | רמת הכותרת הנראית, לשילוב תקין בהיררכיית דף הקורס.               |
| `deepLink`       | `boolean`                                    | `true`                     | קריאה וכתיבה של המצב אל ה-hash. כבו כשיש כמה רכיבים באותו דף.    |
| `className`      | `string`                                     | —                          | מחלקה נוספת על העוטף.                                            |
| `onEvent`        | `(e: TmsEvent) => void`                      | —                          | אירועי מדידה גולמיים.                                            |
| `onProgress`     | `(e: ProgressEvent) => void`                 | —                          | כל שינוי במצב הלמידה.                                            |
| `onComplete`     | `(r: CompletionResult) => void`              | —                          | אירוע יחיד ברגע שתנאי ההשלמה התקיים.                             |
| `emitXapi`       | `boolean`                                    | `false`                    | ייצור הצהרות xAPI.                                               |
| `onXapi`         | `(s: XapiStatement) => void`                 | —                          | מקבל את ההצהרות. הרכיב **אינו שולח אותן לשום מקום**.             |
| `xapiBaseIri`    | `string`                                     | `https://example.org/…`    | בסיס ה-IRI של האובייקטים ב-xAPI.                                 |

### חיבור למערכת הלמידה

```tsx
<TerrainMapSimulator
  areaId="darga"
  mode="lesson"
  emitXapi
  onXapi={(stmt) => lrs.send(stmt)}
  onComplete={({ score, passed, durationSec }) => {
    course.reportCompletion({ score, passed, durationSec });
  }}
/>
```

תנאי ההשלמה הוא **גם** צפייה בכל צורות האזור **וגם** מעבר תרגול (70%). צפייה לבדה
מודדת נוכחות ולא ידיעה; תרגול לבדו מאפשר לנחש את הדרך פנימה. `onComplete` נורה
פעם אחת לכל אזור — LMS שמקבל את אותו `completed` חמש פעמים רושם חמש השלמות.

### קישורים עמוקים

```
#area=darga&feature=cliff&mode=quiz&compare=split&blend=40
```

מדריך שולח קישור אחד והלומד נוחת בדיוק על המצוק בנחל דרגות, במצב תרגול. הכתובת
גוברת על המצב השמור במכשיר.

### עיצוב

כל צבע, גופן, מרווח ורדיוס מוגדרים כ-`var(--course-*, ברירת-מחדל)`. דף הקורס מזריק
את הטוקנים שלו על כל אב-קדמון והרכיב מאמץ אותם בלי שינוי קוד:

```css
.course-page {
  --course-accent: #2f6b6f;
  --course-ink: #17212a;
  --course-font: 'Rubik', sans-serif;
}
```

---

## מבנה הנתונים

```ts
interface TerrainArea {
  id: string;
  name: string;
  region: string;
  difficulty: 'easy' | 'medium' | 'hard';
  groundWidthM: number;          // רוחב השטח בקרקע, במטרים
  scaleBarM: number;             // אורך סרגל קנה המידה
  viewBox: { width: 1000; height: 1000 };
  layers: {
    aerial: ImageLayer;
    topo: ImageLayer;
    hillshade?: ImageLayer;      // אופציונלית
  };
  stats: { min; max; relief; interval; indexInterval; … };
  features: TerrainFeature[];
}

interface TerrainFeature {
  id: string;
  name: string;
  family: 'concept' | 'convex' | 'concave' | 'pass' | 'surface' | 'scarp';
  signature: SignatureKind;      // חתימת קווי הגובה, לתרשים ההמחשה
  definition: string;            // הגדרה כללית — נכונה בכל שטח
  localNote?: string;            // ההערה על המופע הזה, נגזרת מה-DEM
  aerialExplanation: string;     // איך זה נראה בתצלום
  mapExplanation: string;        // איך זה נראה במפה
  whyItMatters: string;          // למה זה חשוב בשטח
  confusedWith?: string;         // הזוג המבלבל — רק אם הוא קיים באזור הזה
  hitPath: string;               // אזור לחיצה במרחב ה-viewBox
  labelPoint: Point;
  elevation?: number;
}
```

`src/data/` **נוצר אוטומטית ואין לערוך אותו ידנית.** מקורות האמת הם שלושה:
`tools/areas.config.json` (גאוגרפיה), `content/terrain.he.json` (כל הטקסט),
ומודל הגובה עצמו (כל הגאומטריה).

---

## אזורי הלימוד

| #   | אזור                    | `id`      | סוג שטח        | צורות |
| --- | ----------------------- | --------- | -------------- | ----: |
| 1   | רכס הגלבוע              | `gilboa`  | רכס ים-תיכוני  |    10 |
| 2   | הר תבור                 | `tavor`   | הר בודד במישור |     6 |
| 3   | מישור החוף / רכס הכורכר | `sharon`  | מישורי         |     9 |
| 4   | הר בנטל ורמת הגולן      | `bental`  | געשי-רמתי      |     9 |
| 5   | הרי מירון               | `meron`   | הר גבוה ויערי  |    11 |
| 6   | מדבר יהודה / נחל דרגות  | `darga`   | מדברי-מצוקי    |    10 |
| 7   | מכתש רמון               | `ramon`   | מכתש           |     7 |
| 8   | עמק יזרעאל וגבעת המורה  | `yizrael` | בקעה וגבעה     |    10 |

**שש-עשרה הצורות:** קווי גובה · קו רכס · הר · כיפה · גבעה · שלוחה · כתף · אוכף ·
צוואר · גיא/ואדי · ערוץ/אפיק · בקעה/עמק · שקע/קער סגור · מדרון · מישור · מצוק.

מספר הצורות לאזור נגזר מהשטח עצמו. נחל דרגות אינו מקבל "כיפה" משום שאין בו טבעת
קונטור סגורה, ומישור החוף אינו מקבל "מצוק" משום שאין בו מדרון שעובר את סף
ההתלכדות — התנהגות נכונה של מנוע מונחה-נתונים, ולא חוסר.

### הוספת אזור

1. הוסיפו רשומה ל-[`tools/areas.config.json`](tools/areas.config.json):
   ```json
   { "id": "eilat", "lat": 29.55, "lon": 34.95, "halfMeters": 1800, "order": 9 }
   ```
2. הוסיפו את הטקסטים תחת `areas.eilat` ב-[`content/terrain.he.json`](content/terrain.he.json).
3. הריצו:
   ```bash
   npm run generate:area -- --area=eilat
   npm run generate:elevation -- --area=eilat
   ```

זהו. אין קוד לכתוב. הפירוט המלא ב-[`tools/README.md`](tools/README.md).

---

## פיתוח

```bash
npm install
npm run dev            # דף ההדגמה
npm run dev -- --open  # ‎?editor=1‎ פותח את עורך התוכן למדריכים

npm run verify         # טיפוסים + lint + בדיקות + תקציב נכסים
npm test               # בדיקות יחידה
npm run test:e2e       # Playwright: נגישות ורגרסיה חזותית
npm run build:lib      # בניית הספרייה
```

`npm run test:e2e` משתמש בדפדפן המערכת. אם הוא אינו נמצא אוטומטית, הגדירו
`BROWSER_PATH` לנתיב של `msedge.exe` / `chrome.exe`.

---

## נגישות

הנגישות היא דרישה מוצהרת של הקורס ולא תוספת:

- **המפה עצמה נגישה למקלדת.** כל אזור לחיצה הוא `role="button"` עם `tabIndex`,
  תווית מוקראת (שם + כיוון גאוגרפי + גובה), טיפול ב-Enter/Space, ומחוון פוקוס נראה.
  ניווט בחיצים בין הצורות לפי סדר גאוגרפי.
- **תיאור `sr-only` מלא** של האזור, ולכל שכבה `alt` תיאורי משלה.
- **הכרזות `aria-live`** על בחירה, ביטול, זום, החלפת אזור ומשוב תרגול.
- **יעדי מגע 44×44**, תמיכה ב-`prefers-reduced-motion`, ב-`prefers-contrast: more`
  וב-`forced-colors`.
- ההבחנה בין משפחות הצורות נעשית בדפוס קו ובעובי — **לא בצבע בלבד** — ולכן היא
  שורדת עיוורון צבעים.
- `npm run test:e2e` אוכף **אפס ממצאי axe ברמת serious/critical** על כל מסך מרכזי.

---

## ביצועים

תקציב של **400KB לאזור** לשלוש השכבות יחד (AVIF, רוחב 1200px), נאכף ב-CI ע"י
`npm run check:budget`. כל שמונת האזורים בטווח 259–338KB.

AVIF + WebP עם `srcset` בשלושה רוחבים, fallback יחיד, LQIP מוטבע, ורשת הגובה של
כלי החתך נטענת בייבוא דינמי — רק אם הלומד פתח את הכלי.

---

## דרישות דפדפן

Chrome / Edge / Firefox / Safari בגרסאות שתומכות ב-`clip-path`, `aspect-ratio`
ו-`ResizeObserver` (2021 ואילך). AVIF ו-WebP הם שיפור מדורג — דפדפן שאינו תומך
מקבל JPEG/PNG. הקראה קולית מוצעת רק כשקיים קול עברי מותקן.

---

## רישוי

**הקוד** — MIT, ראו [LICENSE](LICENSE).

**נכסי המפה** אינם מכוסים ברישיון הזה. כל שכבה נגזרת ממקור צד-שלישי:

| שכבה          | מקור                                       | רישיון              |
| ------------- | ------------------------------------------ | ------------------- |
| תצ״א          | Esri World Imagery                         | תנאי השימוש של Esri |
| מפה טופוגרפית | OpenTopoMap · © OpenStreetMap contributors | **CC-BY-SA 3.0**    |
| מודל גובה     | AWS Terrain Tiles (SRTM/NED)               | נחלת הכלל עד CC-BY  |

> ⚠️ שכבת OpenTopoMap היא **שיתוף-זהה**. לפני שילוב בקורס ארגוני או מבצעי יש לוודא
> שהרישיון מתאים, או להחליף את מקור המפה. ההחלפה היא שינוי כתובת אריחים אחת
> ב-[`tools/fetch-topo.mjs`](tools/fetch-topo.mjs) והרצה חוזרת של הצנרת; שכבת התצ״א,
> מודל הגובה וכל גאומטריית הצורות אינם מושפעים.

---

## מסמכים נוספים

- [ROADMAP.md](ROADMAP.md) — מקור האמת למצב הפרויקט ולמשימות הפתוחות
- [CHANGELOG.md](CHANGELOG.md) — שינויים לפי גרסה
- [CONTRIBUTING.md](CONTRIBUTING.md) — איך לתרום
- [tools/README.md](tools/README.md) — צנרת יצירת האזורים
