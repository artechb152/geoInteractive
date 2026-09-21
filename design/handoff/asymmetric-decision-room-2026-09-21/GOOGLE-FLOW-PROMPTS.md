# Google Flow — חדר החלטות אחד, חמש חזיתות

זו גרסה קודמת. [גרסה 3 עם מעברי מסך](../asymmetric-smooth-film-v3/GOOGLE-FLOW-PROMPTS-V3.md) היא המקור העדכני לתמונות ולהנפשות.

זו הצעת בימוי חדשה על בסיס התוכן, ללא הסתמכות על התמונות הישנות. חבילת ההפקה הקודמת בפרויקט נשארת ללא שינוי. החבילה הזו כוללת פרומפטים בלבד; התמונות והסרטונים עוד לא הופקו.

## הרעיון

אותו חדר החלטות נשאר בפריים, והחזית הצבאית נשארת במסך המרכזי. בכל קפיצה בזמן נכנס מקור לחץ נוסף: שולחן תקציב, שידור המשקף דעת קהל, נציגי ועדה, ושיחת ועידה בינלאומית. כל מה שנוסף נשאר גם בתחנות הבאות. השינוי הוא במספר הדרישות המופנות לצד המדינתי, לא בהשמדת הצבא שלו.

הסגנון הוא צילום קולנועי מאופק, בגובה העיניים, בחומרים ובצבעים טבעיים. זו זירה בדיונית ומטפורה לימודית; אין כאן טענה שכל הגורמים יושבים בפועל באותו חדר. התאורה המשתנה בעדינות וההצטברות מסמנות זמן, והתווית המדויקת מופיעה באתר כטקסט נגיש.

מטרת הלמידה: הלומד יוכל להסביר, על בסיס המודל הקיים, כיצד התמשכות הלחימה מוסיפה לצבא הסדיר לחצים מעבר לאויב בשטח, ולהשוות זאת למיקוד בשרידות של השחקן הלא־סדיר במודל. הנחת העבודה היא קהל הקורס הקיים, למידה עצמאית בעברית ודסקטופ ברוחב 1440px.

## הרצף

| פריים | תחנה | התוספת לתמונה | מה נשאר | חזיתות במודל: סדיר / לא־סדיר |
|---|---|---|---|---|
| F01 | יום 1 | חדר ומסך של החזית הצבאית | נקודת הפתיחה | 1 / 1 |
| F02 | שבוע 2 | תיקי תקציב, יומן, מחשבון ותיק מילואים | החזית הצבאית | 2 / 1 |
| F03 | חודש 3 | מסך עם התקהלות אזרחית שקטה לזיכרון | צבא ותקציב | 3 / 1 |
| F04 | שנה 1 | שני נציגי ועדה ותיק בדיקה | צבא, תקציב ודעת קהל | 4 / 1 |
| F05 | שנה 2 | מסך ועידה בינלאומית | כל ארבע החזיתות הקודמות | 5 / 1 |

המספרים הם ספירת החזיתות במודל המקורי, לא מדדי כוח, סיכויי ניצחון או נתוני אמת. אין צורך בפריים שישי של תבוסה. השחקן הלא־סדיר לא נעשה חזק יותר בתמונה; ההשוואה המפורשת אליו נשמרת בטבלה ובטקסט באתר. נשמרות ההבהרות המקומיות: ״במודל המוצג״ ו״ציר הזמן הוא המחשה רעיונית, לא לוח זמנים קבוע לכל מלחמה.״

## איך מפיקים בלי לאבד אחידות

1. מפיקים תחילה רק F01. בודקים בגודל התצוגה הצפוי באתר שהמסך המרכזי, שולחן התקציב, שני מסכי הצד ושני הכיסאות נבדלים זה מזה. אם הפרטים זעירים או החדר עמוס, מתקנים את המאסטר לפני שממשיכים.
2. מפיקים F02 כעריכת F01, את F03 כעריכת F02, וכן הלאה. מצרפים בכל פעם את הפריים הקודם בפועל כרפרנס. בכל פרומפט מלא מופיעות שוב ההנחיות הקבועות; אין צורך להדביק ״פרומפט בסיס״ נוסף.
3. עורכים רק את האזור שמשתנה, ככל שאפשר בכלי. שומרים את F01 להשוואת מצלמה וגיאומטריה ואת הפריים הקודם להשוואת האביזרים שהצטברו. אין להפיק חמש תמונות בלתי תלויות מטקסט בלבד.
4. משווים כל זוג לפני הנפשה: זהות הקצין, מיקום השולחן, מסגרות המסכים, תמונת השטח והאביזרים הקודמים חייבים להישאר עקביים. בודקים גם את F05 מול F01 כדי לגלות סחיפה מצטברת.
5. ב־Flow בוחרים Video → Frames ומצרפים Start ו־End עבור כל זוג עוקב. בוחרים 16:9, ארבע שניות ומודל שתומך גם בפריים התחלה וגם בפריים סיום. שם התכונה עשוי להשתנות בממשק; אלה היכולות הנדרשות.
6. T01 משתמש ב־F01 וב־F02; T02 באותו קובץ F02 וב־F03; T03 ב־F03 וב־F04; T04 ב־F04 וב־F05. כך מפיקים ארבעה מעברים בלבד. תנועה לאחור באתר תהיה מעבר קצר לתמונת התחנה, ולכן אין צורך להפיק עוד ארבעה סרטונים.
7. בודקים את סוף כל קליפ מול התמונה שסופקה. הפרומפט אינו מבטיח נעילה מדויקת. אם יש קפיצה בזהות, במיקום או בתאורה, מתקנים את ההפקה לפני חיבור הקליפים. אין להחליף בשקט את F02 רק בקליפ אחד ולשבור את שאר השרשרת.
8. אם מעבר אנושי מורכב מדי בארבע שניות, מפיקים את אותו זוג בשש שניות ומאריכים יחסית את שלב הפעולה; מעדכנים את משך הנגינה במניפסט לפי התוצר. אין צורך להכריח קליפ ארוך להתנגן במהירות מוגזמת.
9. מורידים ושומרים גם את חמש התמונות וגם את ארבעת קובצי הווידאו, ברזולוציה ויחס אחידים. היעד הרצוי לתמונות הוא 1920×1080 אם זמין; המימוש לא יניח שזו רזולוציית הייצוא בפועל. לא צריך לחבר את כל המעברים לסרט יחיד.
10. אין להטמיע עברית, תאריכים, מונים, חצים או כתוביות בקובצי Flow. האתר מציג אותם כטקסט חי. הסדרה מיועדת לפעול ללא קול.

התמיכה בפריימים ראשונים ואחרונים ובאורכי הקליפים נבדקה בתיעוד הרשמי של Google; יש לוודא שהאפשרות זמינה במודל ובחשבון בזמן ההפקה: [יצירת סרטונים עם פריימים](https://support.google.com/flow/answer/16353334?hl=en), [יכולות המודלים](https://support.google.com/flow/answer/16352836?hl=en).

## קובצי ההפקה

- F01: [פרומפט תמונה מלא](image-prompts/F01.txt) → לשמור כתמונה בשם `F01-day-1.png`.
- F02: [פרומפט תמונה מלא](image-prompts/F02.txt) → לשמור כתמונה בשם `F02-week-2.png`.
- F03: [פרומפט תמונה מלא](image-prompts/F03.txt) → לשמור כתמונה בשם `F03-month-3.png`.
- F04: [פרומפט תמונה מלא](image-prompts/F04.txt) → לשמור כתמונה בשם `F04-year-1.png`.
- F05: [פרומפט תמונה מלא](image-prompts/F05.txt) → לשמור כתמונה בשם `F05-year-2.png`.

- T01: [פרומפט הנפשה מלא](motion-prompts/T01.txt) — F01 → F02; לשמור בשם `T01-day-1-to-week-2.mp4`.
- T02: [פרומפט הנפשה מלא](motion-prompts/T02.txt) — F02 → F03; לשמור בשם `T02-week-2-to-month-3.mp4`.
- T03: [פרומפט הנפשה מלא](motion-prompts/T03.txt) — F03 → F04; לשמור בשם `T03-month-3-to-year-1.mp4`.
- T04: [פרומפט הנפשה מלא](motion-prompts/T04.txt) — F04 → F05; לשמור בשם `T04-year-1-to-year-2.mp4`.

## הפרומפטים המלאים לתמונות

### F01 — יום 1 — האויב בשטח

קלט: ללא תמונת מקור; יוצרים את המאסטר.

```text
Create one photorealistic cinematic keyframe for a fictional educational film about the accumulation of pressures during a prolonged conflict. Landscape 16:9, full-frame artwork, one coherent real-scale room. Locked eye-level tripod camera, natural 28mm lens, no camera tilt, no isometric view, no miniature, no cutaway, no collage. Documentary restraint, pale limestone walls, sand-colored floor, matte olive furniture, soft daylight, natural skin tones, restrained contrast, no teal-orange grading, no neon or science-fiction equipment.

COMPOSITION LOCK: A modest national decision room. One fictional middle-aged duty officer, short dark hair, plain olive uniform without insignia, is seated back-to-camera near the center foreground. One broad matte table occupies the middle of the image. A large central wall display above the table shows an unchanged distant rocky valley with a small conventional military position in the foreground and a distant indistinct opposing position. No combat is depicted and neither position grows, advances, collapses or disappears. This central display is the persistent military front. A small side desk is in the lower-left third. A smaller public-information monitor is on the upper-left wall. Two empty visitor chairs are beside the right end of the main table. A smaller international video-conference monitor is on the upper-right wall. All three monitors and both visitor chairs exist from the first frame; their physical geometry and positions never change. A narrow high window casts a soft diagonal daylight stripe on an otherwise empty upper wall. Keep every important subject within the central 84 percent of the image.

These are visual metaphors in a fictional room, not a reconstruction of any real war or institution. No readable writing anywhere: no letters, numerals, timestamps, charts with labels, subtitles, interface graphics, logos, national flags or identifiable public figures. Papers have only indistinct grey marks. Do not generate editorial labels; Hebrew explanations will be placed outside the image by the website. No explosions, injuries, victorious poses, weapons close-ups or dramatic blackout. Do not imply that the opposing force is invulnerable. Output one still, never a storyboard.

MASTER FRAME — DAY 1. Establish the entire composition described above. The duty officer calmly studies the central field display. On the main table there is only one plain folded terrain map. The lower-left side desk is nearly empty except for a closed plain ledger and a small unlit desk lamp. Both smaller wall monitors are switched off, dark matte glass with soft room reflections, not empty holes. The two visitor chairs are unoccupied. The room is operational and quiet, not luxurious or heroic. Clear uncluttered separation between the five future areas of attention. The central military display is the only active information source. Preserve enough room around the officer for subsequent additions. This image will be the master reference for every later frame.
```

### F02 — שבוע 2 — משרד האוצר

קלט: הפריים הקודם המאושר, F01, כרפרנס לעריכה.

```text
Create one photorealistic cinematic keyframe for a fictional educational film about the accumulation of pressures during a prolonged conflict. Landscape 16:9, full-frame artwork, one coherent real-scale room. Locked eye-level tripod camera, natural 28mm lens, no camera tilt, no isometric view, no miniature, no cutaway, no collage. Documentary restraint, pale limestone walls, sand-colored floor, matte olive furniture, soft daylight, natural skin tones, restrained contrast, no teal-orange grading, no neon or science-fiction equipment.

COMPOSITION LOCK: A modest national decision room. One fictional middle-aged duty officer, short dark hair, plain olive uniform without insignia, is seated back-to-camera near the center foreground. One broad matte table occupies the middle of the image. A large central wall display above the table shows an unchanged distant rocky valley with a small conventional military position in the foreground and a distant indistinct opposing position. No combat is depicted and neither position grows, advances, collapses or disappears. This central display is the persistent military front. A small side desk is in the lower-left third. A smaller public-information monitor is on the upper-left wall. Two empty visitor chairs are beside the right end of the main table. A smaller international video-conference monitor is on the upper-right wall. All three monitors and both visitor chairs exist from the first frame; their physical geometry and positions never change. A narrow high window casts a soft diagonal daylight stripe on an otherwise empty upper wall. Keep every important subject within the central 84 percent of the image.

These are visual metaphors in a fictional room, not a reconstruction of any real war or institution. No readable writing anywhere: no letters, numerals, timestamps, charts with labels, subtitles, interface graphics, logos, national flags or identifiable public figures. Papers have only indistinct grey marks. Do not generate editorial labels; Hebrew explanations will be placed outside the image by the website. No explosions, injuries, victorious poses, weapons close-ups or dramatic blackout. Do not imply that the opposing force is invulnerable. Output one still, never a storyboard.

REFERENCE EDIT — WEEK 2. Use the attached approved F01 as the actual composition reference. Preserve the camera, room architecture, officer's identity and seated position, central military display, main table, both inactive side monitors and both empty visitor chairs. Change only the lower-left side-desk zone: the ledger is now open; add two modest stacks of plain procurement folders, a small calculator with an unreadable display, and a worn olive reservist duffel tucked beside the desk. Turn on the small desk lamp with restrained warm light. No money piles or numerical statistics. The officer now glances slightly toward the paperwork while remaining seated in the same place. This is the first additional pressure: sustained spending and reserve-service burden. The battlefield remains present and unresolved. Do not activate the public monitor or diplomatic monitor; do not add visitors yet. Final lighting remains soft readable daylight.
```

### F03 — חודש 3 — דעת הקהל

קלט: הפריים הקודם המאושר, F02, כרפרנס לעריכה.

```text
Create one photorealistic cinematic keyframe for a fictional educational film about the accumulation of pressures during a prolonged conflict. Landscape 16:9, full-frame artwork, one coherent real-scale room. Locked eye-level tripod camera, natural 28mm lens, no camera tilt, no isometric view, no miniature, no cutaway, no collage. Documentary restraint, pale limestone walls, sand-colored floor, matte olive furniture, soft daylight, natural skin tones, restrained contrast, no teal-orange grading, no neon or science-fiction equipment.

COMPOSITION LOCK: A modest national decision room. One fictional middle-aged duty officer, short dark hair, plain olive uniform without insignia, is seated back-to-camera near the center foreground. One broad matte table occupies the middle of the image. A large central wall display above the table shows an unchanged distant rocky valley with a small conventional military position in the foreground and a distant indistinct opposing position. No combat is depicted and neither position grows, advances, collapses or disappears. This central display is the persistent military front. A small side desk is in the lower-left third. A smaller public-information monitor is on the upper-left wall. Two empty visitor chairs are beside the right end of the main table. A smaller international video-conference monitor is on the upper-right wall. All three monitors and both visitor chairs exist from the first frame; their physical geometry and positions never change. A narrow high window casts a soft diagonal daylight stripe on an otherwise empty upper wall. Keep every important subject within the central 84 percent of the image.

These are visual metaphors in a fictional room, not a reconstruction of any real war or institution. No readable writing anywhere: no letters, numerals, timestamps, charts with labels, subtitles, interface graphics, logos, national flags or identifiable public figures. Papers have only indistinct grey marks. Do not generate editorial labels; Hebrew explanations will be placed outside the image by the website. No explosions, injuries, victorious poses, weapons close-ups or dramatic blackout. Do not imply that the opposing force is invulnerable. Output one still, never a storyboard.

REFERENCE EDIT — MONTH 3. Use the attached approved F02 as the actual composition reference. Preserve all established geometry, the same officer, the unchanged central field display, the open ledger, both folder stacks, calculator, duffel and lit desk lamp in their exact positions. Change only the upper-left public-information monitor: it is now on, showing one natural documentary image of a small civilian gathering at a quiet memorial, seen respectfully from behind, plain dark civilian clothing, a few flowers, concerned and subdued posture. No coffins, bodies, wounded people, political slogans, banners, flags or identifiable individuals. This is a broadcast image within the existing physical monitor, not an added floating picture. The officer's head is slightly oriented toward this screen without moving the chair. The two visitor chairs remain empty and the upper-right diplomatic monitor stays off. The new public-opinion pressure is added to the existing budget burden; it does not replace it. Keep the whole room softly exposed and legible.
```

### F04 — שנה 1 — הפוליטיקה הפנימית

קלט: הפריים הקודם המאושר, F03, כרפרנס לעריכה.

```text
Create one photorealistic cinematic keyframe for a fictional educational film about the accumulation of pressures during a prolonged conflict. Landscape 16:9, full-frame artwork, one coherent real-scale room. Locked eye-level tripod camera, natural 28mm lens, no camera tilt, no isometric view, no miniature, no cutaway, no collage. Documentary restraint, pale limestone walls, sand-colored floor, matte olive furniture, soft daylight, natural skin tones, restrained contrast, no teal-orange grading, no neon or science-fiction equipment.

COMPOSITION LOCK: A modest national decision room. One fictional middle-aged duty officer, short dark hair, plain olive uniform without insignia, is seated back-to-camera near the center foreground. One broad matte table occupies the middle of the image. A large central wall display above the table shows an unchanged distant rocky valley with a small conventional military position in the foreground and a distant indistinct opposing position. No combat is depicted and neither position grows, advances, collapses or disappears. This central display is the persistent military front. A small side desk is in the lower-left third. A smaller public-information monitor is on the upper-left wall. Two empty visitor chairs are beside the right end of the main table. A smaller international video-conference monitor is on the upper-right wall. All three monitors and both visitor chairs exist from the first frame; their physical geometry and positions never change. A narrow high window casts a soft diagonal daylight stripe on an otherwise empty upper wall. Keep every important subject within the central 84 percent of the image.

These are visual metaphors in a fictional room, not a reconstruction of any real war or institution. No readable writing anywhere: no letters, numerals, timestamps, charts with labels, subtitles, interface graphics, logos, national flags or identifiable public figures. Papers have only indistinct grey marks. Do not generate editorial labels; Hebrew explanations will be placed outside the image by the website. No explosions, injuries, victorious poses, weapons close-ups or dramatic blackout. Do not imply that the opposing force is invulnerable. Output one still, never a storyboard.

REFERENCE EDIT — YEAR 1. Use the attached approved F03 as the actual composition reference. Keep the camera, architecture, original officer, unchanged military display, complete budget-desk arrangement, and the active public-information monitor with the same memorial image. Change only the right end of the main table: the two previously empty chairs are now occupied by two fictional civilian committee representatives, one woman and one man, both middle-aged in understated neutral formal clothing. They are quietly reviewing one thick plain inquiry folder on the table, with a small ordinary desktop microphone between them. Their expressions are serious but not theatrical. No arguing, pointing fingers, politicians' likenesses, institutional seals, nameplates or readable documents. The officer remains seated in the original central position, slightly turned toward the representatives. The upper-right diplomatic screen remains off. This adds domestic oversight and political pressure while the military, financial and public pressures remain visible. Do not remove earlier objects or turn the room into a courtroom.
```

### F05 — שנה 2 — הבמה הבינלאומית

קלט: הפריים הקודם המאושר, F04, כרפרנס לעריכה.

```text
Create one photorealistic cinematic keyframe for a fictional educational film about the accumulation of pressures during a prolonged conflict. Landscape 16:9, full-frame artwork, one coherent real-scale room. Locked eye-level tripod camera, natural 28mm lens, no camera tilt, no isometric view, no miniature, no cutaway, no collage. Documentary restraint, pale limestone walls, sand-colored floor, matte olive furniture, soft daylight, natural skin tones, restrained contrast, no teal-orange grading, no neon or science-fiction equipment.

COMPOSITION LOCK: A modest national decision room. One fictional middle-aged duty officer, short dark hair, plain olive uniform without insignia, is seated back-to-camera near the center foreground. One broad matte table occupies the middle of the image. A large central wall display above the table shows an unchanged distant rocky valley with a small conventional military position in the foreground and a distant indistinct opposing position. No combat is depicted and neither position grows, advances, collapses or disappears. This central display is the persistent military front. A small side desk is in the lower-left third. A smaller public-information monitor is on the upper-left wall. Two empty visitor chairs are beside the right end of the main table. A smaller international video-conference monitor is on the upper-right wall. All three monitors and both visitor chairs exist from the first frame; their physical geometry and positions never change. A narrow high window casts a soft diagonal daylight stripe on an otherwise empty upper wall. Keep every important subject within the central 84 percent of the image.

These are visual metaphors in a fictional room, not a reconstruction of any real war or institution. No readable writing anywhere: no letters, numerals, timestamps, charts with labels, subtitles, interface graphics, logos, national flags or identifiable public figures. Papers have only indistinct grey marks. Do not generate editorial labels; Hebrew explanations will be placed outside the image by the website. No explosions, injuries, victorious poses, weapons close-ups or dramatic blackout. Do not imply that the opposing force is invulnerable. Output one still, never a storyboard.

REFERENCE EDIT — YEAR 2. Use the attached approved F04 as the actual composition reference. Keep all accumulated elements exactly where they are: the same seated duty officer, the central unresolved field display, financial folders, open ledger, calculator, reservist duffel, lit desk lamp, public-information screen, both committee representatives, inquiry folder and microphone. Change only the existing upper-right diplomatic screen: turn it on to show a single coherent camera view of several fictional delegates seated around a curved conference table in a neutral international meeting room. Plain formal clothing, calm serious posture, one closed document folder on that remote table. No real politicians, flags, institutional emblems, captions, video-call interface or tiled talking-head grid. The local officer glances toward this screen. The final composition must clearly retain one military front and four additional sources of pressure, with breathing space and legible depth. No collapse, retreat, celebration or signed agreement. End with an unresolved decision, not inevitable defeat. Keep daylight and overall exposure consistent with F04.
```

## הפרומפטים המלאים להנפשות

### T01 — F01 → F02

Start: F01. End: F02. משך מבוקש: 4 שניות.

```text
Create a four-second photorealistic educational transition using the supplied START FRAME and END FRAME as visual constraints. Landscape 16:9, exactly the same fictional decision room, the same seated officer, fixed eye-level 28mm tripod camera, unchanged lens, framing, architecture, furniture geometry and natural stone/sand/olive palette. The central military screen retains the exact same unresolved field scene throughout. It must not depict a new battle or change the balance of forces. No cuts, dissolve between whole scenes, zoom, pan, handheld shake, object morphing, rubbery furniture, identity changes, teleports or sudden exposure flashes.

TIMING: Hold the supplied start composition for approximately 0.4 seconds. Perform the specified single narrative change during seconds 0.4–3.2. Settle into the supplied end composition and hold it during seconds 3.2–4.0. This is a short ellipsis of time, not real-time documentary footage. To suggest the passage of time, let the soft daylight stripe from the high window glide gently across an unoccupied wall area during the middle interval, returning to the end frame's lighting; never darken the room or flicker the monitors. This light movement is symbolic and does not measure the number of days. Keep all prior pressure elements visible and stable unless the action below explicitly changes them.

No generated words, numerals, captions, logos, flags, readable screens or documents, music, narration or intelligible speech. The website provides accessible Hebrew text separately. No combat, injuries, explosions, celebratory gestures, collapse or automatic victory. Make the final composition closely match the supplied end frame, with no further action after settling.

ACTION — FINANCIAL BURDEN ACCUMULATES. The only new activity is at the lower-left side desk. In a restrained time-compressed action, the forearms of an unseen clerk briefly enter from the lower-left edge, open the ledger, place the two modest folder stacks and calculator, place the worn olive duffel beside the desk, switch on the desk lamp, and leave the image. The final positions must match END FRAME F02. Nothing grows out of the table and no object becomes another object. The officer makes a small head turn toward the side desk. Both side monitors remain off, and the visitor chairs remain empty. Convey repetitive administration and material burden, not panic. Do not add people remaining in frame.
```

### T02 — F02 → F03

Start: F02. End: F03. משך מבוקש: 4 שניות.

```text
Create a four-second photorealistic educational transition using the supplied START FRAME and END FRAME as visual constraints. Landscape 16:9, exactly the same fictional decision room, the same seated officer, fixed eye-level 28mm tripod camera, unchanged lens, framing, architecture, furniture geometry and natural stone/sand/olive palette. The central military screen retains the exact same unresolved field scene throughout. It must not depict a new battle or change the balance of forces. No cuts, dissolve between whole scenes, zoom, pan, handheld shake, object morphing, rubbery furniture, identity changes, teleports or sudden exposure flashes.

TIMING: Hold the supplied start composition for approximately 0.4 seconds. Perform the specified single narrative change during seconds 0.4–3.2. Settle into the supplied end composition and hold it during seconds 3.2–4.0. This is a short ellipsis of time, not real-time documentary footage. To suggest the passage of time, let the soft daylight stripe from the high window glide gently across an unoccupied wall area during the middle interval, returning to the end frame's lighting; never darken the room or flicker the monitors. This light movement is symbolic and does not measure the number of days. Keep all prior pressure elements visible and stable unless the action below explicitly changes them.

No generated words, numerals, captions, logos, flags, readable screens or documents, music, narration or intelligible speech. The website provides accessible Hebrew text separately. No combat, injuries, explosions, celebratory gestures, collapse or automatic victory. Make the final composition closely match the supplied end frame, with no further action after settling.

ACTION — PUBLIC OPINION BECOMES ANOTHER FRONT. Only the existing upper-left public-information monitor changes. Its dark reflective glass softly illuminates to reveal the precise civilian memorial gathering depicted in END FRAME F03. Permit very subtle natural movement within that broadcast image, then let it settle into the end-frame composition. The officer makes a small head turn toward the monitor. Every folder, the open ledger, calculator, duffel and lit desk lamp remain unchanged and visible. The diplomatic monitor stays off and both visitor chairs remain empty. Do not show a sequence of unrelated news clips, distressing close-ups, slogans, flashing graphics or a new battlefield scene. The viewer should perceive a new concern layered onto the financial one.
```

### T03 — F03 → F04

Start: F03. End: F04. משך מבוקש: 4 שניות.

```text
Create a four-second photorealistic educational transition using the supplied START FRAME and END FRAME as visual constraints. Landscape 16:9, exactly the same fictional decision room, the same seated officer, fixed eye-level 28mm tripod camera, unchanged lens, framing, architecture, furniture geometry and natural stone/sand/olive palette. The central military screen retains the exact same unresolved field scene throughout. It must not depict a new battle or change the balance of forces. No cuts, dissolve between whole scenes, zoom, pan, handheld shake, object morphing, rubbery furniture, identity changes, teleports or sudden exposure flashes.

TIMING: Hold the supplied start composition for approximately 0.4 seconds. Perform the specified single narrative change during seconds 0.4–3.2. Settle into the supplied end composition and hold it during seconds 3.2–4.0. This is a short ellipsis of time, not real-time documentary footage. To suggest the passage of time, let the soft daylight stripe from the high window glide gently across an unoccupied wall area during the middle interval, returning to the end frame's lighting; never darken the room or flicker the monitors. This light movement is symbolic and does not measure the number of days. Keep all prior pressure elements visible and stable unless the action below explicitly changes them.

No generated words, numerals, captions, logos, flags, readable screens or documents, music, narration or intelligible speech. The website provides accessible Hebrew text separately. No combat, injuries, explosions, celebratory gestures, collapse or automatic victory. Make the final composition closely match the supplied end frame, with no further action after settling.

ACTION — DOMESTIC POLITICAL OVERSIGHT ENTERS. The two fictional committee representatives from END FRAME F04 enter naturally from the physical right edge of the room, approach the two existing visitor chairs, sit down, and place the thick plain inquiry folder and small desktop microphone on the right end of the main table. Use a restrained time-compressed movement that keeps human anatomy and chair geometry stable. They settle into the exact end-frame poses without dramatic gestures. The officer makes only a small head turn toward them. Keep the public memorial broadcast, financial desk and central field display unchanged. The upper-right diplomatic screen remains off. Do not make the visitors materialize out of the seats or replace the officer.
```

### T04 — F04 → F05

Start: F04. End: F05. משך מבוקש: 4 שניות.

```text
Create a four-second photorealistic educational transition using the supplied START FRAME and END FRAME as visual constraints. Landscape 16:9, exactly the same fictional decision room, the same seated officer, fixed eye-level 28mm tripod camera, unchanged lens, framing, architecture, furniture geometry and natural stone/sand/olive palette. The central military screen retains the exact same unresolved field scene throughout. It must not depict a new battle or change the balance of forces. No cuts, dissolve between whole scenes, zoom, pan, handheld shake, object morphing, rubbery furniture, identity changes, teleports or sudden exposure flashes.

TIMING: Hold the supplied start composition for approximately 0.4 seconds. Perform the specified single narrative change during seconds 0.4–3.2. Settle into the supplied end composition and hold it during seconds 3.2–4.0. This is a short ellipsis of time, not real-time documentary footage. To suggest the passage of time, let the soft daylight stripe from the high window glide gently across an unoccupied wall area during the middle interval, returning to the end frame's lighting; never darken the room or flicker the monitors. This light movement is symbolic and does not measure the number of days. Keep all prior pressure elements visible and stable unless the action below explicitly changes them.

No generated words, numerals, captions, logos, flags, readable screens or documents, music, narration or intelligible speech. The website provides accessible Hebrew text separately. No combat, injuries, explosions, celebratory gestures, collapse or automatic victory. Make the final composition closely match the supplied end frame, with no further action after settling.

ACTION — INTERNATIONAL PRESSURE JOINS THE EXISTING FOUR FRONTS. Only the existing upper-right diplomatic screen activates. Reveal the single coherent conference-room shot specified by END FRAME F05, with fictional delegates around a curved table. A delegate may make one small restrained hand gesture before settling. The local officer glances toward this screen. Both local committee representatives remain seated, and all budget objects and the public-information broadcast remain in place. The central military image remains unchanged. Do not display an agreement being signed, a withdrawal, a ceasefire taking effect, sanctions being executed, a national flag or institutional emblem. The final hold should communicate an unresolved field conflict surrounded by several simultaneous demands.
```

## בדיקת התוצאה לפני הפיתוח

- בכל תחנה אפשר לזהות מיד מה נוסף, והחזיתות הקודמות נשארות נראות.
- ההבדל בין לחץ ציבורי, פוליטי ובינלאומי ברור גם בתצוגה קטנה; הטקסט באתר נותן לכל אחד שם מפורש.
- אין פרטים חדשים שמוסיפים טענה לתוכן המקורי, ואין תמונת סיום שמציגה ניצחון מובטח לאחד הצדדים.
- כל פריים נקי ממלל שנוצר בתמונה, וכל קליפ מתחיל ומסתיים בלי קפיצה חזותית.
- בדיקת שימושיות קצרה עם לומדים: האם ברור מה צריך ללחוץ, והאם ניתן לעצור ולקרוא בנחת? זהו משוב על החוויה, לא תוספת חובה לממשק.
- בדיקת למידה קצרה: בקשו מהלומד להסביר מדוע אותו מצב בשדה הקרב יכול ללוות עלייה בלחץ על הצבא הסדיר, ולהצביע על שתי חזיתות נוספות. זו בדיקת הבנה ולא ספירת קליקים.

## המקורות שנבדקו

- מקור התוכן המקוון: https://geo-interactive-preview.vercel.app/lessons/topic-01/#scene-asymmetric
- דוגמת האינטראקציה המקומית: http://localhost:3000/lessons/topic-01/#scene-onboarding
- תוכן מקומי: src/components/lessons/topic-01/TimePressureContent.ts
- המימוש הקיים: src/components/lessons/topic-01/TimePressureExperience.tsx
- דוגמת הפריסה: src/components/lessons/topic-01/OnboardingScene.tsx
- נגן קיים: src/components/lessons/topic-01/SceneOnboardingFramePlayer.tsx
- סקיל שימוש חוזר ושפה עיצובית: .claude/skills/checking-design-fidelity/SKILL.md; קיים גם ב־.agents/skills/checking-design-fidelity/SKILL.md.

נמצא סקיל שמכוון לשימוש ברכיבים משותפים, אך לא נמצא סקיל ייעודי שמאפשר להזין תוכן חדש לנגן הסרט ללא התאמה. הנגן הנוכחי מקובע לארבעה מצבי שטח ולשלושה מעברים. פרומפט הפיתוח מגדיר במפורש את ההתאמה הנדרשת.
