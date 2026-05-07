# קורס דיגיטלי — גיאוגרפיה צבאית, GEOINT וניתוח מערכות שטח

קורס אינטראקטיבי בעברית לגילאי 18–23. **13 שיעורים**, כל אחד עם אינטראקציה ייחודית, מבוסס Next.js + React + TypeScript + Tailwind.

## הרצה מהירה

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # מפיק תיקיית out/ סטטית (להטמעה ב-LMS)
```

## מבנה הפרויקט

```
.
├── content/              # תוכן הקורס מפוצל לפי נושא (topic-01.md ... topic-13.md)
├── docs/
│   ├── instructional-briefs.md   # תכנון הדרכה לכל 13 השיעורים
│   ├── design-system.md          # פלטה, רכיבים, עקרונות
│   └── scorm-packaging.md        # הוראות חבילת SCORM ל-LMS
├── src/
│   ├── app/
│   │   ├── page.tsx              # דף הבית + רשימת שיעורים
│   │   ├── layout.tsx            # RTL + פונטים עבריים
│   │   └── lessons/[topicId]/    # עמוד שיעור דינמי
│   ├── components/
│   │   ├── lesson/               # LessonShell (טאבים), LessonContent (תוכן)
│   │   ├── interactive/          # Quiz + InteractionPlaceholder לכל 13 הסוגים
│   │   ├── LessonCard.tsx        # כרטיס שיעור בסילבוס
│   │   └── TopoBackdrop.tsx      # רקע גריד טופוגרפי
│   └── lib/
│       ├── lessons.ts            # רישום 13 השיעורים + מטא־דאטה
│       ├── quizzes.ts            # שאלות בדיקת ידע לכל שיעור
│       ├── content.ts            # טעינה ופענוח של תוכן MD
│       └── utils.ts
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## איך נבחרה אינטראקציה לכל שיעור

המתודולוגיה ב-`docs/instructional-briefs.md`. רישום קצר:

| # | שיעור | אינטראקציה |
|---|---|---|
| 01 | מבוא לגיאוגרפיה צבאית | concept-cards |
| 02 | קרטוגרפיה | map-explorer |
| 03 | ניווטים | navigation-sim |
| 04 | מורפולוגיית שטח | terrain-classifier |
| 05 | ניידות ותמרון | mobility-grid |
| 06 | קווי ראייה | los-simulator |
| 07 | אקלים ומזג אוויר | weather-impact |
| 08 | לוגיסטיקה | supply-chain |
| 09 | גיאו־כלכלה | chokepoint-map |
| 10 | לחימה אורבנית | urban-3d |
| 11 | גבולות ועומק | border-strategy |
| 12 | GEOINT | sensor-fusion |
| 13 | GIS מבצעי | gis-layers |

**כרגע** כולן placeholders ייחודיים שמתארים את המכניקה. הצעד הבא: לפתח כל אינטראקציה בנפרד.

## עריכת תוכן

תוכן השיעורים יושב ב-`content/topic-XX.md`. עורכים שם — הדף נטען מחדש אוטומטית.
מטא־דאטה (כותרת, מטרות, אינטראקציה, קושי) ב-`src/lib/lessons.ts`.
שאלות ב-`src/lib/quizzes.ts`.

## הטמעה ב-LMS

ראו [`docs/scorm-packaging.md`](docs/scorm-packaging.md) — הפרויקט נבנה כסטטי (`output: 'export'`) ועוטפים את `out/` כחבילת SCORM 1.2.

## הצעד הבא

לבחור שיעור אחד (מומלץ: שיעור 02 — `map-explorer`) ולפתח את האינטראקציה במלואה. לאחר מכן לעבור לשאר.
