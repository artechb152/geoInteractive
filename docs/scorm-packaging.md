# SCORM Packaging — הטמעה ב-LMS

הפרויקט מוגדר עם `next.config.mjs` במצב `output: 'export'`, כך שכל בנייה מפיקה אתר סטטי ב-`out/` שניתן לעטוף כ-SCORM 1.2.

## תהליך הבנייה

```bash
npm install
npm run build         # מפיק תיקיית out/ סטטית
npm run scorm:package # יוצר scorm-package/geo-course-v{version}.zip
```

## מה כולל חבילת SCORM

```
scorm-package/
├── imsmanifest.xml          # מטה־דאטה לפי תקן SCORM 1.2
├── adlcp_rootv1p2.xsd       # סכמות SCORM
├── ims_xml.xsd
├── imscp_rootv1p1p2.xsd
├── imsmd_rootv1p2p1.xsd
└── content/                 # זה התוכן עצמו (out/ של Next.js)
    ├── index.html
    ├── lessons/...
    └── _next/...
```

## SCORM Wrapper

יש להוסיף `public/scorm-wrapper.js` שמטפל ב:
- `pipwerks.SCORM.init()` בעלייה ראשונה.
- שמירת התקדמות (`cmi.lesson_status`, `cmi.score.raw`) בסיום כל Quiz.
- `pipwerks.SCORM.quit()` ב-`window.beforeunload`.

הספרייה המומלצת: [`pipwerks-scormwrapper`](https://github.com/pipwerks/scorm-api-wrapper). ניתן לטעון אותה ב-`layout.tsx` עם `<Script src="/scorm-wrapper.js" strategy="beforeInteractive" />`.

## אינטגרציה ב-Quiz

ב-`src/components/interactive/Quiz.tsx` אחרי `setSubmitted(true)` יש להוסיף:

```ts
declare const pipwerks: any;
if (typeof window !== 'undefined' && (window as any).pipwerks) {
  pipwerks.SCORM.set('cmi.score.raw', String(score));
  pipwerks.SCORM.set('cmi.score.max', String(questions.length));
  pipwerks.SCORM.set('cmi.lesson_status', score === questions.length ? 'completed' : 'incomplete');
  pipwerks.SCORM.save();
}
```

## בדיקה לפני העלאה ל-LMS

1. בנו עם `npm run build` ופתחו `out/index.html` בדפדפן — אמור לעבוד גם בלי שרת.
2. בדקו ב-[SCORM Cloud](https://cloud.scorm.com/) — חשבון בחינם, מאפשר העלאה ובדיקת סנכרון.
3. ודאו ש-`basePath` מוגדר נכון אם ה-LMS שלכם מטמיע ב-subpath.

## הערה על ניווט פנימי

ב-LMS רוב הפעמים הקורס נטען ב-iframe. ודאו ש:
- אין `target="_blank"` על Link פנימי.
- כל הניווט נעשה ב-Next.js Router (קליינט-side) ולא טוען דף מלא — חוסך אובדן sessions של SCORM.

## גרסה מתקדמת — xAPI

אם ה-LMS תומך ב-xAPI (Tin Can), אפשר להחליף את ה-pipwerks ב-[xapi-js](https://github.com/Rustici-Software/xAPIWrapper) ולשלוח statements עשירים יותר (לדוגמה: "user attempted question Q3 in topic-04 with answer X").
