# tools/ — צינור הנתונים של הסימולטור

כל הנתונים בפרויקט — התמונות, קווי הגובה וגאומטריית הצורות — נגזרים ממקורות
אמיתיים בהרצת סקריפט. אין קואורדינטה אחת שנכתבה ביד.

## הפקודה האחת

```bash
npm run generate:area -- --area=gilboa     # אזור אחד
npm run generate:area -- --all             # כל האזורים
npm run generate:area -- --all --force     # התעלמות מהמטמון והורדה מחדש
npm run generate:area -- --area=meron --skip-assets   # רק חילוץ צורות + מודול TS
```

היא מריצה ברצף:

| #   | שלב               | סקריפט                 | פלט                                            |
| --- | ----------------- | ---------------------- | ---------------------------------------------- |
| 1   | תצ״א              | `fetch-imagery.mjs`    | `tools/.cache/raw/<id>-aerial.png`             |
| 2   | מפה טופוגרפית     | `fetch-topo.mjs`       | `tools/.cache/raw/<id>-topo.png`               |
| 3   | נכסים             | `optimize-assets.mjs`  | `src/assets/areas/<id>/*.avif\|webp\|jpg\|png` |
| 4   | DEM + חילוץ צורות | `extract-features.mjs` | `tools/.cache/features/<id>.json`              |
| 5   | מודול נתונים      | `gen-area.mjs`         | `src/data/areas/<id>.ts`                       |

## הוספת אזור חדש — בלי לגעת בקוד

1. הוסיפו רשומה ל-[`areas.config.json`](areas.config.json):
   ```json
   { "id": "tabor", "lat": 32.687, "lon": 35.39, "halfMeters": 1500, "order": 8 }
   ```
2. הוסיפו טקסטים ל-[`../content/terrain.he.json`](../content/terrain.he.json)
   תחת `areas.tabor` (שם, אזור, קושי, מה הוא מלמד, מבוא).
3. הריצו `npm run generate:area -- --area=tabor`.

זהו. `src/data/areas/index.ts` נבנה מחדש אוטומטית והאזור מופיע בבורר.

## מקורות ורישוי

| שכבה          | מקור                          | רישיון                                    |
| ------------- | ----------------------------- | ----------------------------------------- |
| תצ״א          | Esri World Imagery            | תנאי השימוש של Esri                       |
| מפה טופוגרפית | OpenTopoMap                   | **CC-BY-SA** — ראו אזהרת הרישוי ב-ROADMAP |
| מודל גובה     | AWS Terrain Tiles (terrarium) | קוד פתוח                                  |

הורדות האריחים ממוזערות במטמון (`tools/.cache/`) כדי שהרצה חוזרת לא תפנה
שוב לשרתים.

## דרישות סביבה

- Node 18+ (משתמש ב-`fetch` המובנה).
- דפדפן Chromium להרכבת אריחי המפה. הנתיב נקרא מ-`BROWSER_PATH`, ואם אינו
  מוגדר — מזוהה אוטומטית (Edge/Chrome/Chromium, Windows/macOS/Linux):

  ```bash
  BROWSER_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run generate:area -- --all
  ```

## סקריפטים נוספים

```bash
node tools/check-budget.mjs      # תקציב הנכסים (עד 400KB לאזור) — רץ ב-CI
node tools/verify/shots.mjs      # רתמת אימות חזותי מול preview
```

## מה בכל קובץ

```
lib/geo.mjs        מרקטור, חשבון אריחים, קריאת התצורה, איתור דפדפן
lib/geometry.mjs   marching squares, תפירה, RDP, החלקה, קמור
lib/dem.mjs        שליפת DEM וניתוח שטח (פסגות, אוכפים, קודקודי U/V)
```
