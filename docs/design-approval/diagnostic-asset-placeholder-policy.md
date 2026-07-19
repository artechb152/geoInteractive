# diagnostic-asset-placeholder-policy.md — מדיניות placeholder אבחוני לנכסי Magnific חסרים

> **עדכון מדיניות למוקאפי `/design-approval` בלבד.** מבטל ומחליף את §5 (Placeholders
> זמניים) של [papercut-mockup-design-lock.md](papercut-mockup-design-lock.md) בכל
> הנוגע לנכסי Magnific עתידיים (raster). שאר מסמך הנעילה — כולל §5.3 (MapBoardBackground,
> שאינו slot נכס) — נשאר בתוקף במלואו.

## 1. למה זה רועש בכוונה

עד לעדכון הזה, כל חריץ נכס חסר הוצג כאיור SVG "מלוטש" ברמת הצגה ללקוח (הר
פייפרקאט, מיניאטורות כרטיסים). זה יצר סיכון אמיתי: מי שצופה במוקאפ עלול לחשוב
שהאיור **הוא** הנכס הסופי, ולכן לאשר עיצוב שלא ייצג נכון את מה שיגיע בפועל
מ-Magnific.

המדיניות החדשה הפוכה במכוון: כל מקום שבו אמור לשבת נכס Magnific עתידי אך הקובץ
עדיין לא קיים ב-`public/assets/isometric/` — מוצג בלוק **MissingAssetPlaceholder**
רועש, לא-אסתטי, בלתי-ניתן-לבלבול עם עיצוב סופי:

- פסים אלכסוניים מגנטה/צהוב/שחור (warning stripes).
- טקסט גדול וקריא: "MISSING ASSET" ו"נדרש Asset מ-Magnific".
- `assetId` ונתיב הקובץ הצפוי גלויים על גבי הבלוק עצמו.

זה הופך את ה-grep הידני על `data-asset-id` (§6.1 בנעילה) לכפול-ביטחון: גם חיפוש
קוד וגם צפייה חזותית חושפים מיידית אילו נכסים עדיין חסרים.

## 2. תחום התוקף — רק מסלולי אישור/פיתוח

- ה-placeholder הרועש קיים **אך ורק** מתחת ל-`/design-approval` (הקבצים תחת
  `src/components/design-approval/` ו-`src/app/design-approval/`).
- מותר לו להשתמש בצבעי אזהרה בוטים (מגנטה/צהוב/שחור) **שאינם** בטבלת הטוקנים
  (§4.1 בנעילה) — משום שהוא במפורש **לא** חלק מהעיצוב שנשלח לאישור לקוח; הוא כלי
  אבחון-פיתוח.
- אסור להשתמש ב-`MissingAssetPlaceholder` (או בדפוס דומה) בכל רכיב פרודקשן.

## 3. מה מחליף מה

| רכיב ישן (הוסר) | קובץ | תפקיד קודם |
|---|---|---|
| `TerrainSlabPlaceholder` | `placeholders.tsx` | placeholder מלוטש ל-HOME-01 |
| `LessonCardPlaceholder` + 12 `*Art` functions | `placeholders.tsx` | placeholder מלוטש לכל LESSON-NN-CARD |

| רכיב חדש | קובץ | תפקיד |
|---|---|---|
| `MissingAssetPlaceholder` | `MissingAssetPlaceholder.tsx` | בלוק אבחוני גנרי לכל slot חסר, מוצג אוטומטית ע"י `AssetSlot` |

`AssetSlot` כבר לא מקבל `placeholder` prop מבחוץ — הוא בעצמו מרנדר
`MissingAssetPlaceholder` כל עוד הסטטוס אינו `ready` (`onError`/לא נטען = `missing`).
כך כל slot חדש מקבל את אותה התנהגות אבחונית בלי צורך לכתוב איור ייעודי.

## 4. מה נשאר ללא שינוי

הכלל "אין placeholder גנרי" בטל **רק לגבי נכסי Magnific עתידיים**. הרכיבים הבאים
אינם נכסי Magnific — הם סמנטיקת ממשק אמיתית ונשארים מצוירים ב-React/SVG ברמת
גימור מלאה, בלי שום סגנון אזהרה:

- `MapBoardBackground` — עיצוב קבוע (§5.3 בנעילה), אין לו slot ראסטר.
- `ContourBackdrop`, `DotGrid`, `CompassRose`/`CompassEmblem`, `RouteMotif` (motifs.tsx).
- כל מד-התקדמות, כפתור, וקו/סמן/מקרא סמנטי (ציר A→B, סמני A/B) בתוך המוקאפים.

## 5. מה קורה כשהנכס האמיתי מגיע

ללא שינוי מ-§6.1 בנעילה: מניחים את הקובץ בשם המדויק תחת
`public/assets/isometric/`, ה-`<img>` נטען בהצלחה (`onLoad`), ה-status הופך
`ready`, ו-`MissingAssetPlaceholder` נעלם — בלי לשנות פריסה. שום קובץ פרודקשן
לא נוגע ב-placeholder הזה בשום שלב; שילוב הנכסים בפרודקשן בפועל ממשיך להתבצע לפי
[ASSET_INTEGRATION_WORKFLOW.md](../../project-knowledge/ASSET_INTEGRATION_WORKFLOW.md).

**חובה בשילוב הסופי:** לוודא שאין דרך שבה `MissingAssetPlaceholder` או בלוק
אזהרה דומה מגיע לתוך `src/app`/`src/components` מחוץ ל-`design-approval` —
זה כלי פיתוח בלבד, לא נראה-סופי-לקוח.
