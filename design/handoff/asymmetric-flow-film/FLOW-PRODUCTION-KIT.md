# חמש חזיתות — חבילת הפקה ל־Google Flow

החבילה כוללת 5 פרומפטים מלאים לתמונות מפתח ו־4 פרומפטים מלאים להנפשה בין כל זוג עוקב. הפרומפטים באנגלית; ההוראות, התסריט והמלל בעברית. כל פרומפט עומד בפני עצמו ואין צורך לצרף אליו נוסח משותף ממקום אחר.
נוצרו גם F01-style-draft.png ו־storyboard-preview.png להמחשה. אלה אינן חמש תמונות ההפקה המאושרות. לא נוצר סרטון, לא בוצעה פעולה בחשבון Flow ולא נערך קוד האתר.

## הכיוון החזותי והקשר לדוגמה

בדקתי את https://geo-interactive.vercel.app/lessons/topic-01/#scene-onboarding ואת הרכיב המקומי. בדוגמה נשמרת אותה סצנה, והשינוי בטופוגרפיה מצטבר. המלל נמצא לצידה ונשאר לקריאה. ברכיב המקומי המעברים נשמרים כרצפי פריימים, ולא כמצגת של תמונות נפרדות.

נשמור את העיקרון הזה ונמשיך את רעיון הפתח שהתגבש בשיחה:
- זווית מצלמה אחת קבועה ונוף ריאליסטי אחד.
- ביום הראשון רואים את החזית הצבאית דרך פתח פתוח.
- בכל מעבר שכבה אחת נעה פנימה: אוצר מלמעלה, דעת קהל משמאל, פוליטיקה מלמטה, בינלאומית מימין.
- השכבות הקודמות נשארות במקום. הנוף עצמו אינו משתנה ואינו מצטמצם בקנה מידה; רק חלקים ממנו מוסתרים.
- בסיום ארבע שכבות סביב החזית הצבאית: בסך הכול חמש חזיתות, לא חמש שכבות ועוד צבא.
- הפתח אינו נסגר לגמרי, ואין אפקט תבוסה, הרס או החשכה.

זו מטפורה להצטברות לחצים, לא ייצוג של מכשולים פיזיים או מדידה של חופש פעולה.
המקור התוכני: https://geo-interactive-preview.vercel.app/lessons/topic-01/#scene-asymmetric
הנחת עבודה: קהל הקורס הקיים; תצוגה לרוחב; קריאה עצמאית כברירת מחדל; קריינות כאפשרות.

## מה מפיקים

| קובץ תמונה | מצב | חזית שנוספה | שכבות שנשארות |
|---|---|---|---|
| F01-day-1.png | יום 1 | האויב בשטח | אין שכבות חיצוניות |
| F02-week-2.png | שבוע 2 | משרד האוצר | עליונה |
| F03-month-3.png | חודש 3 | דעת הקהל | עליונה + שמאלית |
| F04-year-1.png | שנה 1 | הפוליטיקה הפנימית | עליונה + שמאלית + תחתונה |
| F05-year-2.png | שנה 2 | הבמה הבינלאומית | ארבע השכבות |

| קליפ | תמונת התחלה | תמונת סיום | תנועה יחידה | אורך מבוקש |
|---|---|---|---|---|
| T01-day-to-week.mp4 | F01 | F02 | עליונה יורדת | 8 שניות |
| T02-week-to-month.mp4 | F02 | F03 | שמאלית נעה ימינה | 8 שניות |
| T03-month-to-year.mp4 | F03 | F04 | תחתונה עולה | 8 שניות |
| T04-year-to-year2.mp4 | F04 | F05 | ימנית נעה שמאלה | 8 שניות |

הכיוונים פיזיים של התמונה, ללא קשר לכיוון הקריאה בעברית. אין לשקף פריימים.

## סדר העבודה — עקביות לפני הנפשה

1. הפק את F01 עם הפרומפט הראשון. אפשר לצרף את pressure-aperture-v2.png כרפרנס סגנון בלבד. אין להזין מוקאפ של דף האתר כפריים התחלה לווידאו.
2. בדוק שהפריים נקי מכתב ומממשק, שהמצלמה חזיתית, שהפתח פתוח, ושיש מסילות לכל ארבע השכבות. אשר את הפריים כ־F01. אם הייצור לא עומד במבנה, תקן עכשיו לפני המשך השרשרת.
3. צור F02 בעריכת F01; F03 בעריכת F02; F04 בעריכת F03; F05 בעריכת F04. בכל עריכה צרף את התמונה הקודמת בפועל. תיאור טקסטואלי בלבד אינו מחליף אותה.
4. שמור F01 כמקור השוואה לכל הסדרה. אל תשתמש בחמש יצירות text-to-image עצמאיות. אם הכלי מאפשר מסכה, תחום את העריכה לפס שבו השכבה משתנה ולצל המקומי בלבד.
5. המידות המנורמלות בפרומפטים הן מפרט קומפוזיציה רצוי, לא דיוק מובטח. אם שינית את פריים הבסיס באופן מהותי, עדכן את כל העוגנים באופן עקבי לפני המשך העבודה.
6. השווה כל זוג לפני הנפשה: הרכב, המוצב, רכס ההרים ושני סלעים בולטים צריכים להישאר באותו מקום. תזוזה או שינוי צורה ייצרו morph בסרטון — תיקון הפריים קודם לניסיון לתקן בפרומפט התנועה.
7. ב־Flow בחר Video ואז Frames, הוסף Start ו־End, ובחר יחס 16:9 ו־8 שניות במודל שתומך בכך. הדבק את פרומפט המעבר המתאים.
8. תמונת הסיום של T01 היא בדיוק תמונת ההתחלה של T02, וכן הלאה. השתמש באותו קובץ, לא בגרסה דומה.
9. העוגנים מכוונים את המודל אך אינם מבטיחים דיוק מלא. בדוק את הפריים האחרון שהופק. אם הוא שונה, העדף לייצר שוב את המעבר; לחלופין שמור אותו כפריים חדש ועדכן את כל השרשרת הבאה. אל תחבר אותו בכוח לפריים שונה.
10. הורד את ארבעת הקליפים ושמור גם את חמש התמונות. חבר ללא dissolve. חתוך כפילויות של holds בנקודות החיבור.
11. אל תנסה לייצר את כל ארבע התנועות בקליפ אחד. אל תערבב זוויות צילום, שעות יום, יחסי מסך או גרסאות מאסטר.

לפי התיעוד הרשמי שנבדק ב־21.09.2026, Flow תומך בתמונות התחלה וסיום; התמיכה במודלים ובהגדרות תלויה בבחירה ובזמינות בחשבון. Veo 3.1 מציע בין היתר קליפים של 8 שניות במצב זה. יש לבדוק את המודל הפעיל במסך ההפקה.
המקורות:
- https://support.google.com/flow/answer/16353334?hl=en
- https://support.google.com/flow/answer/16352836?hl=en
- https://support.google.com/flow/answer/16935718?hl=en

## תסריט הבימוי לכל מעבר

בכל אחד מארבעת הקליפים: 0–0.75 שניות פריים פתיחה יציב; 0.75–6.5 תנועה אחת חלקה; 6.5–8 עצירה יציבה בפריים הסיום. אלו הנחיות בימוי; את התזמון המדויק מסדרים בעריכה.
אין תנועת מצלמה, אין שינוי תאורה, ואין תנועת עננים או רכב. הבחירה להקפיא אותם מכוונת: היא מסייעת למעבר הפוך ולרציפות בין מקטעים.

T01: שפת הלוח העליון מתנתקת מעט מהמסילה; הלוח יורד בתנועה ישרה ואיטית. צל המגע נע איתו. החלק העליון של השמיים מוסתר. שלוש השכבות האחרות נשארות בפנים.
T02: הלוח השמאלי גולש ימינה. העליון אינו זז שוב. המצלמה אינה עוקבת אחרי הלוח. הסלעים נשארים זהים, ורק נסתרים מאחורי השפה.
T03: הלוח התחתון עולה ומסתיר חלק מהקרקע הקרובה. לא את הרכב והמוצב. העליון והשמאלי נשארים במקומם.
T04: הלוח הימני גולש שמאלה. בסיום השדה הצבאי עדיין נראה בבירור, אך הוא מוקף בארבעה לחצים. עצירה שקטה מאפשרת לקלוט את התמונה כולה.
אין להציג את העברת הזמן כסימולציה של שינוי עונות. הזמן הוא מושג לימודי שמתווסף בתוויות.

## המלל — נשאר חלק מרכזי

לא מבקשים מ־Flow לכתוב עברית, כותרות או מספרים. מפיקים וידאו נקי ומוסיפים טקסט בעריכה או באתר. כך נשמרים חדות, RTL, נגישות ויכולת לשנות ניסוח.

בגרסת האתר: כותרת השלב + הפסקה המקורית לצד הסרטון; פירוט החזית מופיע מתחתיה. בכל מצב התמונה נעצרת והמלל נשאר עד שהלומד מתקדם. אין להחליף את כל תוכן השיעור בקריינות קצרה.
בתוך הפריים אפשר להוסיף רק תוויות קצרות, לאחר ההפקה, כשכבת טקסט נפרדת. שמות השכבות מתווספים רק אחרי שהשכבה נכנסה. אין טקסט שזז בזמן שהלוח נע.

### F01 — יום 1 · האויב בשטח

טקסט התחנה המקורי:
הלחימה רק התחילה. מבחוץ זה עוד נראה כמו "מלחמה פשוטה, צבא מול צבא" — רק חזית אחת פעילה משני הצדדים.

פירוט החזית המקורי:
לוחמי גרילה או מחבלים — היריב הצבאי המוצהר.

תווית בפריים: האויב בשטח.
השוואה מחוץ לווידאו: צבא סדיר — 1; שחקן לא־סדיר — 1; כותרת: "חזיתות במודל המוצג".

### F02 — שבוע 2 · משרד האוצר

טקסט התחנה המקורי:
משרד האוצר מתחיל ללחוץ — המלחמה כבר עולה מיליארדי דולרים בשבוע, והמילואים נשחקים.

פירוט החזית המקורי:
תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים, פגיעה בעורף.

תווית עליונה: משרד האוצר.
השוואה: 2 מול 1.

### F03 — חודש 3 · דעת הקהל

טקסט התחנה המקורי:
דעת הקהל נשחקת — תמונות מהזירה ולוויות חיילים משפיעות על התמיכה הציבורית מיום ליום.

פירוט החזית המקורי:
תמונות מהזירה, לוויות חיילים, תמיכה ציבורית שנשחקת מיום ליום.

תווית שמאלית: דעת הקהל.
השוואה: 3 מול 1.

### F04 — שנה 1 · הפוליטיקה הפנימית

טקסט התחנה המקורי:
הפוליטיקה הפנימית מתעוררת — ועדות חקירה, אופוזיציה, ולחץ קואליציוני מבית.

פירוט החזית המקורי:
הכנסת, הקונגרס, אופוזיציה, ועדות חקירה, שעון הבחירות.

תווית תחתונה: הפוליטיקה הפנימית.
השוואה: 4 מול 1.

### F05 — שנה 2 · הבמה הבינלאומית

טקסט התחנה המקורי:
הבמה הבינלאומית דורשת הפסקת אש — לחץ מהאו"ם, מבעלות ברית, ואיום בסנקציות.

פירוט החזית המקורי:
או"ם, בעלות ברית, האג, סנקציות — כולם דורשים "הפסקת אש מיד".

תווית ימנית: הבמה הבינלאומית. אם ארוכה מדי עבור השכבה, הצג לצד הפריים עם מחבר קצר; אין להקטין את האותיות או לסובב אותן.
השוואה: 5 מול 1.

### סיום — התובנה

כותרת מוצעת, עיבוד ולא ציטוט:
המלחמה אינה מתנהלת רק מול האויב שבשטח.

תמצית לקריינות, עיבוד:
"במודל שבשיעור, הצבא הסדיר מתמודד עם חמש חזיתות, והשחקן הלא־סדיר מתמקד בשרידות. הזמן מאפשר ללחצים שמחוץ לשדה הקרב להצטבר."

ההסבר המקורי המלא נשמר לקריאה באזור התובנה:
"זו לא רק שאלה של מספרים — זה הבדל בכללי המשחק. הצבא הסדיר חייב לנצח בכל אחת מ-5 החזיתות, כי הפסד באחת מהן מספיק כדי להפיל את כל המלחמה. השחקן הלא-סדיר צריך רק לא לאבד את החזית היחידה שלו — וזה כבר מספיק לו לניצחון, בכל שלב בציר הזמן."

"המעצמה רואה את עצמה במלחמה אחת — נגד האויב שבשטח. בפועל, היא לוחמת ב-5 חזיתות בו-זמנית, וכל אחת מ-4 הפנימיות יכולה לבדה לסיים את המלחמה. אין לו אוצר שיתרוקן, אין לו ועדת חקירה שתפיל אותו, אין לו או"ם שילחץ. הוא צריך רק לשרוד עוד יום."

גם הדוגמה ההיסטורית שבמקור נשמרת כחומר מקור, לא כעובדה חדשה שנבדקה בהפקה:
"ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות."

הטענות המוחלטות וההסבר ההיסטורי הם ניסוח המקור, לא מסקנה שההנפשה מוכיחה. אין לתרגם אותם אוטומטית לסגירה מלאה או להציג שרידות כניצחון מובטח. השורה "זהו מודל מפושט; גם שחקנים לא־סדירים מושפעים ממשאבים ומתמיכה" יכולה להופיע כהבהרת מסגרת. כל שינוי מהותי בטקסט המקורי יידון בנפרד, לא ייעשה בשקט בתוך ההפקה.

## שתי דרכי עריכה מאותה חבילה

### א. כמו בשיעור 1 — מומלץ

ארבעת הקליפים משמשים כמעברים בין חמש עצירות. הלומד בוחר שלב; רק המעבר מתנגן; לאחריו התמונה נעצרת והטקסט נשאר פתוח. יש גם הפעלה חוזרת והשהיה. אפשר לנגן מעבר לאחור מכיוון שאין בו תנועה בלתי־הפיכה או דיבור. גרסת הפחתת תנועה משתמשת בחמש תמונות המצב.
32 שניות הן חומר המעברים, לא הזמן המוקצב ללמידה. אין חובה לקרוא פסקה ב־8 שניות.

### ב. סרטון עצמאי עם קריינות — עריכת בסיס 94 שניות

| זמן בעריכה | תמונה/קליפ | קריינות מוצעת |
|---|---|---|
| 00–10 | החזקת F01 | טקסט התחנה של יום 1 |
| 10–18 | T01 | תחילת טקסט שבוע 2 |
| 18–26 | החזקת F02 | השלמת טקסט שבוע 2; הפסקה לקריאה |
| 26–34 | T02 | תחילת טקסט חודש 3 |
| 34–42 | החזקת F03 | השלמת טקסט חודש 3; הפסקה לקריאה |
| 42–50 | T03 | טקסט שנה 1 |
| 50–58 | החזקת F04 | הפסקה לקריאת פירוט החזית |
| 58–66 | T04 | טקסט שנה 2 |
| 66–76 | החזקת F05 | השלמת טקסט שנה 2; קליטת ההשוואה |
| 76–94 | F05, ללא תנועה נוספת | תמצית הסיום המעובדת לעיל |

קריינות בעברית מקליטים בנפרד אחרי אישור טקסט; אל תסמוך על דיבור שנוצר בקליפ שצריך לחבר או לנגן לאחור.
94 שניות הן תכנון עריכה, לא מגבלת Flow. ההחזקות נוצרות בעריכה מתמונות המצב ולא ביצירת קליפים מיותרים. יש למדוד את הקריינות בפועל ולהתאים את ההחזקות לפני הייצוא. אין להאיץ דיבור כדי לעמוד בתזמון.
המלל המלא נשאר גם בתמליל נגיש ובפאנל הקריאה, כי סרטון עם כמה משפטים אינו מכיל את כל פירוט המקור.

## שמירת אחידות וקבלה

- יחס תמונה אחיד לכל חמש התמונות ולכל הקליפים; יעד 16:9. בדוק מידות קובץ בפועל לפני העלאה. אם נדרש crop, בצע בדיוק אותו crop על כל הסדרה לפני הנפשה.
- F01-style-draft.png הוא ניסוי חזותי: השכבות ההיקפיות נראות בו יותר מהנדרש והעוגנים אינם התאמה מאושרת למפרט. אין להשתמש בו אוטומטית כמאסטר סופי.
- storyboard-preview.png מראה כיוון בלבד. אין לחתוך ממנו פריימים ל־Flow: יש בו הבדלי קנה מידה קטנים בין המצבים.
- במצב הראשוני אין להציג ארבע חזיתות כפעילות רק מפני שרואים חריצים במסגרת; רק שכבה שנכנסה מסומנת ומקבלת שם.
- כל קליפ מזיז שכבה אחת; אינו משנה את השכבות הקודמות.
- אותו רכב, אותו מוצב, אותם הרים ואותו אור בכל הפריימים.
- אין טקסט שנוצר במנוע התמונה/וידאו. Hebrew overlays are added later.
- גם בפריים החמישי נשאר פתח ברור; אין שוויון מומצא בין מידת הסגירה לבין כמות הלחץ.
- השוואת 1–5 מול 1 היא מניין חזיתות במודל, לא יחסי כוחות.
- בחזרה אחורה זמן ותוויות מסתנכרנים; אין להשאיר תוויות של שכבות שכבר נסוגו.
- לצפייה עם קריינות נדרשות כתוביות ותמליל; לצפייה ללא שמע נשאר מלל מלא. אין מידע קריטי בצבע בלבד.
- בדיקת למידה קצרה לאחר צפייה: הלומד מסביר שתי חזיתות שאינן הלחימה בשטח ואת הקשר להתמשכות. בדיקת חוויה: באיזה מעבר הקשר בין התנועה להסבר לא היה ברור? אין להוסיף חידון לממשק בלי צורך.

## פרומפטים מלאים לתמונות

### F01 — יום 1 — האויב בשטח

קובץ יעד: F01-day-1.png
רפרנס: רפרנס הסגנון: pressure-aperture-v2.png; אין להשתמש בכולו כפריים.

```text
Create a single cinematic 16:9 production keyframe for a realistic educational animation. This is NOT a webpage screenshot. Full-frame artwork only. Photorealistic natural limestone, sand and matte olive materials, restrained Mediterranean daylight, soft physical contact shadows, clear realistic depth. Front-on natural perspective, a locked level tripod camera at eye height, 50mm-equivalent lens, no isometric projection, no orthographic view, no miniature, no diorama, no tilt-shift. A thin precise rectangular limestone aperture is viewed straight on. Its unobstructed inner opening spans x=0.12 to0.88 and y=0.14 to0.86 of the image. Behind it is one continuous real-scale rocky Mediterranean valley, pale stone hills, muted olive shrubs, pale blue sky. A small stationary olive utility vehicle at x=0.53,y=0.64 and one low observation post at x=0.46,y=0.61 remain clearly visible. No people or combat. A quiet off-white limestone surround fills the margins.
Four independent slim rigid matte sliding panels are recessed in tracks in the surrounding frame: top olive, left desaturated olive-gray, bottom pale limestone, right dark muted olive. Their depth order and shape never change. They represent conceptual pressures, not actual barriers on a battlefield. No panel fully closes the central opening. There are NO words, letters, labels, symbols, flags, numbers, logos, subtitles, interface elements, hands, arrows, orange accents or decorative handles. Text will be added later as editable overlays.
Lighting direction from upper left remains constant. Preserve the valley, clouds, rock shapes, vehicle, observation post, all surface textures, composition, camera and exposure across the entire series. The only allowed changes between keyframes are specified rigid translations of one panel and the physically necessary contact-shadow changes. Do not regenerate the scene, zoom, recrop, redesign objects, change seasons or simulate day/night. The amount of closure is a visual metaphor, not a quantitative measurement. Output one clean landscape image, never a storyboard or collage.

STATE-SPECIFIC INSTRUCTION:
BASE FRAME. Use the attached approved aperture mockup only for the front-on material language; remove all webpage UI and all writing. Recompose as the clean single scene described here. All four panels are fully retracted into their respective tracks, with only subtle seams visible in the surround. The entire inner opening x=0.12..0.88,y=0.14..0.86 is unobstructed. This establishes the immutable master environment for all later frames.
```

### F02 — שבוע 2 — משרד האוצר

קובץ יעד: F02-week-2.png
רפרנס: F01 בלבד כיעד עריכה.

```text
Create a single cinematic 16:9 production keyframe for a realistic educational animation. This is NOT a webpage screenshot. Full-frame artwork only. Photorealistic natural limestone, sand and matte olive materials, restrained Mediterranean daylight, soft physical contact shadows, clear realistic depth. Front-on natural perspective, a locked level tripod camera at eye height, 50mm-equivalent lens, no isometric projection, no orthographic view, no miniature, no diorama, no tilt-shift. A thin precise rectangular limestone aperture is viewed straight on. Its unobstructed inner opening spans x=0.12 to0.88 and y=0.14 to0.86 of the image. Behind it is one continuous real-scale rocky Mediterranean valley, pale stone hills, muted olive shrubs, pale blue sky. A small stationary olive utility vehicle at x=0.53,y=0.64 and one low observation post at x=0.46,y=0.61 remain clearly visible. No people or combat. A quiet off-white limestone surround fills the margins.
Four independent slim rigid matte sliding panels are recessed in tracks in the surrounding frame: top olive, left desaturated olive-gray, bottom pale limestone, right dark muted olive. Their depth order and shape never change. They represent conceptual pressures, not actual barriers on a battlefield. No panel fully closes the central opening. There are NO words, letters, labels, symbols, flags, numbers, logos, subtitles, interface elements, hands, arrows, orange accents or decorative handles. Text will be added later as editable overlays.
Lighting direction from upper left remains constant. Preserve the valley, clouds, rock shapes, vehicle, observation post, all surface textures, composition, camera and exposure across the entire series. The only allowed changes between keyframes are specified rigid translations of one panel and the physically necessary contact-shadow changes. Do not regenerate the scene, zoom, recrop, redesign objects, change seasons or simulate day/night. The amount of closure is a visual metaphor, not a quantitative measurement. Output one clean landscape image, never a storyboard or collage.

STATE-SPECIFIC INSTRUCTION:
EDIT the attached F01 image, do not create an independent new scene. Move ONLY the TOP olive panel straight downward from its recessed track until its bottom edge reaches y=0.25; it spans x=0.12..0.88. It covers the band y=0.14..0.25. The left, bottom and right panels remain completely retracted. Everything outside this changed top band and its immediate shadow remains identical to F01. The vehicle and observation post remain fully visible. No writing on the panel.
```

### F03 — חודש 3 — דעת הקהל

קובץ יעד: F03-month-3.png
רפרנס: F02 כיעד עריכה; F01 לבדיקת רציפות בלבד.

```text
Create a single cinematic 16:9 production keyframe for a realistic educational animation. This is NOT a webpage screenshot. Full-frame artwork only. Photorealistic natural limestone, sand and matte olive materials, restrained Mediterranean daylight, soft physical contact shadows, clear realistic depth. Front-on natural perspective, a locked level tripod camera at eye height, 50mm-equivalent lens, no isometric projection, no orthographic view, no miniature, no diorama, no tilt-shift. A thin precise rectangular limestone aperture is viewed straight on. Its unobstructed inner opening spans x=0.12 to0.88 and y=0.14 to0.86 of the image. Behind it is one continuous real-scale rocky Mediterranean valley, pale stone hills, muted olive shrubs, pale blue sky. A small stationary olive utility vehicle at x=0.53,y=0.64 and one low observation post at x=0.46,y=0.61 remain clearly visible. No people or combat. A quiet off-white limestone surround fills the margins.
Four independent slim rigid matte sliding panels are recessed in tracks in the surrounding frame: top olive, left desaturated olive-gray, bottom pale limestone, right dark muted olive. Their depth order and shape never change. They represent conceptual pressures, not actual barriers on a battlefield. No panel fully closes the central opening. There are NO words, letters, labels, symbols, flags, numbers, logos, subtitles, interface elements, hands, arrows, orange accents or decorative handles. Text will be added later as editable overlays.
Lighting direction from upper left remains constant. Preserve the valley, clouds, rock shapes, vehicle, observation post, all surface textures, composition, camera and exposure across the entire series. The only allowed changes between keyframes are specified rigid translations of one panel and the physically necessary contact-shadow changes. Do not regenerate the scene, zoom, recrop, redesign objects, change seasons or simulate day/night. The amount of closure is a visual metaphor, not a quantitative measurement. Output one clean landscape image, never a storyboard or collage.

STATE-SPECIFIC INSTRUCTION:
EDIT the attached approved F02 image. Keep the existing TOP panel absolutely fixed with its lower edge at y=0.25. Move ONLY the LEFT olive-gray panel horizontally rightward from x=0.12 until its inner edge reaches x=0.24. It covers x=0.12..0.24 and y=0.25..0.86. The bottom and right panels remain retracted. Unoccluded landscape, top panel and all other pixels must remain unchanged except the necessary local shadow. No deformation, redesign or perspective shift. The vehicle and observation post remain fully visible.
```

### F04 — שנה 1 — הפוליטיקה הפנימית

קובץ יעד: F04-year-1.png
רפרנס: F03 כיעד עריכה; F01 לבדיקת רציפות בלבד.

```text
Create a single cinematic 16:9 production keyframe for a realistic educational animation. This is NOT a webpage screenshot. Full-frame artwork only. Photorealistic natural limestone, sand and matte olive materials, restrained Mediterranean daylight, soft physical contact shadows, clear realistic depth. Front-on natural perspective, a locked level tripod camera at eye height, 50mm-equivalent lens, no isometric projection, no orthographic view, no miniature, no diorama, no tilt-shift. A thin precise rectangular limestone aperture is viewed straight on. Its unobstructed inner opening spans x=0.12 to0.88 and y=0.14 to0.86 of the image. Behind it is one continuous real-scale rocky Mediterranean valley, pale stone hills, muted olive shrubs, pale blue sky. A small stationary olive utility vehicle at x=0.53,y=0.64 and one low observation post at x=0.46,y=0.61 remain clearly visible. No people or combat. A quiet off-white limestone surround fills the margins.
Four independent slim rigid matte sliding panels are recessed in tracks in the surrounding frame: top olive, left desaturated olive-gray, bottom pale limestone, right dark muted olive. Their depth order and shape never change. They represent conceptual pressures, not actual barriers on a battlefield. No panel fully closes the central opening. There are NO words, letters, labels, symbols, flags, numbers, logos, subtitles, interface elements, hands, arrows, orange accents or decorative handles. Text will be added later as editable overlays.
Lighting direction from upper left remains constant. Preserve the valley, clouds, rock shapes, vehicle, observation post, all surface textures, composition, camera and exposure across the entire series. The only allowed changes between keyframes are specified rigid translations of one panel and the physically necessary contact-shadow changes. Do not regenerate the scene, zoom, recrop, redesign objects, change seasons or simulate day/night. The amount of closure is a visual metaphor, not a quantitative measurement. Output one clean landscape image, never a storyboard or collage.

STATE-SPECIFIC INSTRUCTION:
EDIT the attached approved F03 image. Preserve TOP lower edge y=0.25 and LEFT inner edge x=0.24 exactly. Move ONLY the BOTTOM pale limestone panel vertically upward until its top edge reaches y=0.75. It covers y=0.75..0.86, x=0.24..0.88. Right panel stays retracted. Do not move or resize any earlier panel. The central valley and the same small vehicle and observation post remain unchanged and visible. Add only realistic local contact shadows caused by the bottom panel. No letters or symbols.
```

### F05 — שנה 2 — הבמה הבינלאומית

קובץ יעד: F05-year-2.png
רפרנס: F04 כיעד עריכה; F01 לבדיקת רציפות בלבד.

```text
Create a single cinematic 16:9 production keyframe for a realistic educational animation. This is NOT a webpage screenshot. Full-frame artwork only. Photorealistic natural limestone, sand and matte olive materials, restrained Mediterranean daylight, soft physical contact shadows, clear realistic depth. Front-on natural perspective, a locked level tripod camera at eye height, 50mm-equivalent lens, no isometric projection, no orthographic view, no miniature, no diorama, no tilt-shift. A thin precise rectangular limestone aperture is viewed straight on. Its unobstructed inner opening spans x=0.12 to0.88 and y=0.14 to0.86 of the image. Behind it is one continuous real-scale rocky Mediterranean valley, pale stone hills, muted olive shrubs, pale blue sky. A small stationary olive utility vehicle at x=0.53,y=0.64 and one low observation post at x=0.46,y=0.61 remain clearly visible. No people or combat. A quiet off-white limestone surround fills the margins.
Four independent slim rigid matte sliding panels are recessed in tracks in the surrounding frame: top olive, left desaturated olive-gray, bottom pale limestone, right dark muted olive. Their depth order and shape never change. They represent conceptual pressures, not actual barriers on a battlefield. No panel fully closes the central opening. There are NO words, letters, labels, symbols, flags, numbers, logos, subtitles, interface elements, hands, arrows, orange accents or decorative handles. Text will be added later as editable overlays.
Lighting direction from upper left remains constant. Preserve the valley, clouds, rock shapes, vehicle, observation post, all surface textures, composition, camera and exposure across the entire series. The only allowed changes between keyframes are specified rigid translations of one panel and the physically necessary contact-shadow changes. Do not regenerate the scene, zoom, recrop, redesign objects, change seasons or simulate day/night. The amount of closure is a visual metaphor, not a quantitative measurement. Output one clean landscape image, never a storyboard or collage.

STATE-SPECIFIC INSTRUCTION:
EDIT the attached approved F04 image. Preserve TOP lower edge y=0.25, LEFT inner edge x=0.24, BOTTOM upper edge y=0.75. Move ONLY the RIGHT dark muted olive panel horizontally leftward until its inner edge reaches x=0.76. It covers x=0.76..0.88,y=0.25..0.75. Final clear opening is x=0.24..0.76,y=0.25..0.75. All FOUR pressure panels are now present, around the FIFTH military field at center. The same stationary vehicle and observation post remain fully visible. The scene does NOT turn dark and the opening does NOT close entirely. Preserve all other content exactly. No victory, collapse, combat or text.
```

## פרומפטים מלאים לכל זוג תמונות

### T01 — F01 → F02

Start: F01-day-1.png
End: F02-week-2.png
Output: T01-day-to-week.mp4

```text
Create one continuous 8-second 16:9 image-to-video transition using the supplied START and END keyframes as strict visual anchors. Begin from the exact start composition and land on the supplied end composition. Camera is locked to a level eye-height tripod, no pan, tilt, zoom, dolly, orbit, shake or lens change. Maintain the same realistic limestone aperture, Mediterranean valley, stationary olive vehicle, observation post, cloud positions, daylight, exposure, material textures and palette. This is a controlled educational physical transformation, not a slideshow.
Animate only the single rigid panel specified below, translating along its existing track. All other panels, objects and background remain motionless. The moving panel must remain a solid rigid object with constant dimensions: no growth, melting, morphing, stretching, duplication, dissolve, popping into existence or breaking. Reveal or occlude the already-existing background with correct occlusion. No landscape morph, no scene cut and no crossfade.
Timing: 0.00–0.75s hold the start state still. 0.75–6.50s execute one slow smooth monotonic translation, with gentle acceleration and deceleration. 6.50–8.00s hold the completed end state fully still. No bounce, overshoot or return. These timing marks are direction, not an assurance of frame-accurate generation; the result will be inspected and trimmed.
No text, no titles, subtitles, glyphs, labels, HUD, arrows or counters. No people, speech, music, gunfire or dramatic sound. Prefer silent output; any generated soundtrack will be muted in editing. Only subtle physically necessary changing contact shadows may accompany the motion. End with all scenery and geometry matched to the supplied end frame.

THIS TRANSITION:
ONLY the TOP olive panel slides DOWN from its fully retracted overhead track to the F02 end position, lower edge y=0.25. Its shape and width stay constant. LEFT, BOTTOM and RIGHT panels stay completely retracted. The foreground changes only where this panel covers the upper portion of the opening.
```

### T02 — F02 → F03

Start: F02-week-2.png
End: F03-month-3.png
Output: T02-week-to-month.mp4

```text
Create one continuous 8-second 16:9 image-to-video transition using the supplied START and END keyframes as strict visual anchors. Begin from the exact start composition and land on the supplied end composition. Camera is locked to a level eye-height tripod, no pan, tilt, zoom, dolly, orbit, shake or lens change. Maintain the same realistic limestone aperture, Mediterranean valley, stationary olive vehicle, observation post, cloud positions, daylight, exposure, material textures and palette. This is a controlled educational physical transformation, not a slideshow.
Animate only the single rigid panel specified below, translating along its existing track. All other panels, objects and background remain motionless. The moving panel must remain a solid rigid object with constant dimensions: no growth, melting, morphing, stretching, duplication, dissolve, popping into existence or breaking. Reveal or occlude the already-existing background with correct occlusion. No landscape morph, no scene cut and no crossfade.
Timing: 0.00–0.75s hold the start state still. 0.75–6.50s execute one slow smooth monotonic translation, with gentle acceleration and deceleration. 6.50–8.00s hold the completed end state fully still. No bounce, overshoot or return. These timing marks are direction, not an assurance of frame-accurate generation; the result will be inspected and trimmed.
No text, no titles, subtitles, glyphs, labels, HUD, arrows or counters. No people, speech, music, gunfire or dramatic sound. Prefer silent output; any generated soundtrack will be muted in editing. Only subtle physically necessary changing contact shadows may accompany the motion. End with all scenery and geometry matched to the supplied end frame.

THIS TRANSITION:
ONLY the LEFT olive-gray panel slides RIGHT from its left track to the F03 end position, inner edge x=0.24. TOP remains exactly at its F02 position, lower edge y=0.25; BOTTOM and RIGHT remain retracted. No additional movement.
```

### T03 — F03 → F04

Start: F03-month-3.png
End: F04-year-1.png
Output: T03-month-to-year.mp4

```text
Create one continuous 8-second 16:9 image-to-video transition using the supplied START and END keyframes as strict visual anchors. Begin from the exact start composition and land on the supplied end composition. Camera is locked to a level eye-height tripod, no pan, tilt, zoom, dolly, orbit, shake or lens change. Maintain the same realistic limestone aperture, Mediterranean valley, stationary olive vehicle, observation post, cloud positions, daylight, exposure, material textures and palette. This is a controlled educational physical transformation, not a slideshow.
Animate only the single rigid panel specified below, translating along its existing track. All other panels, objects and background remain motionless. The moving panel must remain a solid rigid object with constant dimensions: no growth, melting, morphing, stretching, duplication, dissolve, popping into existence or breaking. Reveal or occlude the already-existing background with correct occlusion. No landscape morph, no scene cut and no crossfade.
Timing: 0.00–0.75s hold the start state still. 0.75–6.50s execute one slow smooth monotonic translation, with gentle acceleration and deceleration. 6.50–8.00s hold the completed end state fully still. No bounce, overshoot or return. These timing marks are direction, not an assurance of frame-accurate generation; the result will be inspected and trimmed.
No text, no titles, subtitles, glyphs, labels, HUD, arrows or counters. No people, speech, music, gunfire or dramatic sound. Prefer silent output; any generated soundtrack will be muted in editing. Only subtle physically necessary changing contact shadows may accompany the motion. End with all scenery and geometry matched to the supplied end frame.

THIS TRANSITION:
ONLY the BOTTOM pale limestone panel slides UP from its lower track to the F04 end position, top edge y=0.75. TOP and LEFT remain exactly fixed; RIGHT remains retracted. The moving slab never stretches, tilts or hides the vehicle.
```

### T04 — F04 → F05

Start: F04-year-1.png
End: F05-year-2.png
Output: T04-year-to-year2.mp4

```text
Create one continuous 8-second 16:9 image-to-video transition using the supplied START and END keyframes as strict visual anchors. Begin from the exact start composition and land on the supplied end composition. Camera is locked to a level eye-height tripod, no pan, tilt, zoom, dolly, orbit, shake or lens change. Maintain the same realistic limestone aperture, Mediterranean valley, stationary olive vehicle, observation post, cloud positions, daylight, exposure, material textures and palette. This is a controlled educational physical transformation, not a slideshow.
Animate only the single rigid panel specified below, translating along its existing track. All other panels, objects and background remain motionless. The moving panel must remain a solid rigid object with constant dimensions: no growth, melting, morphing, stretching, duplication, dissolve, popping into existence or breaking. Reveal or occlude the already-existing background with correct occlusion. No landscape morph, no scene cut and no crossfade.
Timing: 0.00–0.75s hold the start state still. 0.75–6.50s execute one slow smooth monotonic translation, with gentle acceleration and deceleration. 6.50–8.00s hold the completed end state fully still. No bounce, overshoot or return. These timing marks are direction, not an assurance of frame-accurate generation; the result will be inspected and trimmed.
No text, no titles, subtitles, glyphs, labels, HUD, arrows or counters. No people, speech, music, gunfire or dramatic sound. Prefer silent output; any generated soundtrack will be muted in editing. Only subtle physically necessary changing contact shadows may accompany the motion. End with all scenery and geometry matched to the supplied end frame.

THIS TRANSITION:
ONLY the RIGHT dark muted olive panel slides LEFT from its right track to the F05 end position, inner edge x=0.76. TOP, LEFT and BOTTOM remain exactly fixed. End with FOUR visible pressure panels framing the unchanged central military scene. The remaining opening stays clearly open; never create blackout or imply inevitable defeat.
```

