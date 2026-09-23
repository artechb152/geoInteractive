# רמות המלחמה והקשר המרחבי — מודול למידה אינטראקטיבי

מודול למידה אינטראקטיבי (React + Vite) לקורס גיאוגרפיה לגילאי 18–23, בנושא
**תת־נושא 1.1: רמות המלחמה והקשר המרחבי**. הממשק כולו בעברית ובפריסת RTL.

המודול כולל שני מצבי למידה חלופיים:

- **פירמידה תלת־ממדית אינטראקטיבית** (WebGL / three.js) — מודל פירמידה מלא
  הניתן לסיבוב, שכל שכבה בו לחיצה, עם פאנל פרטים, בדיקת הבנה וטבלת השוואה.
- **מפת זום אינטראקטיבית** — מפת שטח אימון בדויה (SVG) עם שלוש רמות זום,
  סמנים לחיצים, פירמידה מוקטנת תלת־ממדית מסונכרנת ובוחן תרחישים.

## הרצה מקומית

```bash
npm install
npm run dev       # שרת פיתוח (http://localhost:5173)
npm run build     # בנייה לפרודקשן → dist/
npm run preview   # תצוגה מקדימה של הבנייה
```

`vite.config.js` מוגדר עם `base: './'` כדי שהבנייה תעבוד מתוך iframe / עמוד LMS
בכל נתיב.

## עריכת תוכן (ללא נגיעה ברכיבים)

- `src/data/levels.js` — כל תוכן שלוש הרמות (שמות, תיאורים, דוגמאות, שאלות,
  משוב, צבעים).
- `src/data/scenarios.js` — תרחישי התרגול של מפת הזום.
- `src/components/TrainingMap.jsx` — סמני המפה והתוויות לפי רמת הזום.

## מבנה

```
src/
  App.jsx                 # מצב משותף (mode, selectedLevel) + פריסה
  main.jsx
  data/                   # levels.js, scenarios.js  (תוכן נערך)
  components/
    PyramidModel.jsx      # פירמידת ה-WebGL (ראשית + מוקטנת)
    pyramidGeometry.js    # מידות הפירמידה
    LevelLegend.jsx       # מקרא/בוררי רמה נגישים
    InteractivePyramid.jsx, InteractiveMapZoom.jsx
    TrainingMap.jsx, MapMarker.jsx, MiniPyramid.jsx
    ScenarioQuiz.jsx, LevelDetailsPanel.jsx, ComparisonPanel.jsx
    Header.jsx, ModeSwitcher.jsx, UsageSection.jsx
  styles/global.css
```

## טכנולוגיות

React 18 · Vite 5 · three.js + @react-three/fiber + @react-three/drei
(נטענים בעצלתיים כ-chunk נפרד) · CSS גלובלי. ללא backend וללא תלות בתמונות
חיצוניות.
