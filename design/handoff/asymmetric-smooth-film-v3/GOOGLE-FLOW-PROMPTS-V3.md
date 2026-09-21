# Google Flow — שלושה מעברי מסך ומעבר אחרון בחיתוך מוסתר

זהו הנוסח העדכני לתמונות 2–5. תמונה 1 נשארת ללא שינוי. הכיוון הקודם של F02 → F01 → F03 בוטל: עוברים ישירות מתמונה 2 לתמונה 3 בזום־אאוט אחד.

## רפרנסים

| התמונה ליצירה | התמונה שמצרפים כקלט | מה נחשף סביב המסך |
|---|---|---|
| F02 | F01 המאושר | משרד תקציב עם כסף, מחשבון ותשלומים |
| F03 | F02 החדש | כיכר עירונית עם מפגינים שגבם למצלמה |
| F04 | F03 החדש | ועדה פנימית קטנה, מיקרופונים ותיקי חקירה |
| F05 | F04 המאושר | תדרוך דיפלומטי משותף לתקשורת, נציגים עומדים ומצלמות |

בכל תמונה, המסך מציג את הרפרנס השלם — כולל מסך קטן שכבר קיים בתוך הרפרנס. אין להחליף אותו בתמונת שדה הקרב לבדה. הדמויות והסביבה החדשה הן מוקד התחנה; אין צורך לקרוא פרטים זעירים שבתוך מסכים מקוננים.

## כללי הפקה ובדיקה

- כל פרומפט בהמשך עצמאי ומלא. צרף את תמונת הקלט בפועל.
- יחס 16:9 קבוע ומסך ישר במרכז x=50%, y=50%. ב-F02–F04 גודלו כ-32% מכל ממד, כעשירית משטח הפריים. ב-F05 גודלו כ-22% מכל ממד, כ-5% מהשטח, במיקום x=39–61%, y=39–61%.
- בתמונה 3: כל האנשים פונים למסך; לא נראות פנים או פרופילים. גב השלטים פונה למצלמה. איש ושלט אינם מכסים את המסך.
- בתמונות 2, 4 ו-5: קומפוזיציות יציבות עם מעט מחוות וללא תקריבי פנים. ב-F05 הנציגים עומדים ופונים לתקשורת או לדובר. אף אחד אינו צופה במסך ואין שולחן ישיבות.
- המספרים הם יעד קומפוזיציה; המודל אינו מבטיח נעילה מדויקת או הטמעה מושלמת. בודקים את התמונה לפני ההנפשה.
- השינוי מחייב F02–F05 חדשים כדי להתאים את הסדרה. שמור את קובצי המקור הקודמים בלי לדרוס. F01 הקיים נשאר.
- כותרות, תאריכים, שאלות וטקסט לימודי מופיעים באתר. לא משקפים מדיה עבור RTL.

## ארבע ההנפשות

T01: F01 → F02. T02: F02 → F03. T03: F03 → F04. T04: F04 → F05.

T01–T03 הם זום־אאוט ישיר מתמונת ההתחלה אל מסך בתוך תמונת הסיום. T04 משתמש בכיסוי קדמי כהה וחיתוך מוסתר לפי T04-FOREGROUND-WIPE.md; אין בו זום דרך מסך. משתמשים באותן תמונות מאושרות משני צדי כל חיבור. קובצי T02A/T02B מבוטלים. בכל המעברים משך של שש שניות הוא יעד; ב-T04 יש כיסוי קצר של התמונה בזמן החיתוך. אם אינו זמין משתמשים במשך נתמך ובודקים עצירות וקצב בתוצר. אין כאן הבטחה שהמודל ישמור תנועה או זהות מושלמות. ב-T03 הקהל נע במחאה בתוך המסך לאורך הזום־אאוט ומתייצב רק בסיום. T04 הוא נוסח חדש שלא נוסה, לאחר שהמשתמש דיווח שתוצאת הזום־אאוט אינה מוצלחת; ראו T04-FOREGROUND-WIPE.md. סוגיית חסימת המדיניות הקודמת מתועדת בנפרד ב-PROMINENT-PEOPLE-NOTE.md.

מבחינת הפעילות נשארים חמש תחנות, ארבעה סרטונים וארבע שאלות, עם העברת חול אחת בכל מעבר. פרטי האינטראקציה ב-INTERACTION-ADDENDUM.md.

## הפרומפטים המלאים לתמונות 2–5


### F02

```text
Create one photorealistic cinematic still, landscape 16:9, for a fictional educational film. Restrained documentary realism, soft natural light, muted limestone, sand, olive, warm wood and charcoal colors. Natural proportions, level eye-height camera, 35mm-equivalent perspective. Match the photographic treatment of the supplied reference.

CONTINUITY AND COMPOSITION: This is the final frame of a smooth zoom-out from the supplied previous image. Place that COMPLETE image unchanged inside one physical 16:9 screen, directly facing the camera. The active display is centered at x=50%, y=50%, with edges approximately x=34–66% and y=34–66%. It occupies 32% of the total image width and height, only about 10% of the full image area. Thin matte charcoal bezel, no perspective skew, cropping, glare or color shift. Preserve any smaller screen already present inside the reference; do not invent extra screens or magnify the nested content. Keep the entire display unobstructed. The newly revealed environment and foreground action must dominate the composition.

SCENE — THE FINANCIAL COST. Use the approved F01 military-valley image as the screen content. Reveal a modest government budget office. A broad warm wooden desk occupies the lower third, entirely below the display. Three unmistakable foreground objects communicate ongoing spending: a shallow tray with a few remaining bundles of generic paper banknotes on the left, a large ordinary calculator with a short receipt strip in the middle, and an outgoing-payment tray with two bundles on the right. Bills have no readable denomination or recognizable currency.

A financial officer in plain civilian office clothing sits at the far-right edge, seen from behind in a restrained three-quarter rear view. Their head and shoulder remain outside the display rectangle. One hand rests on a bundle just placed in the outgoing tray: a settled endpoint pose, without counting, tossing money or complex hand motion. Two closed procurement folders and a desk lamp support the setting without clutter.

Make the calculator, remaining funds and outgoing payment readable at website size. Some money remains. This is a visual metaphor for budget pressure and continuing expenditure, not bankruptcy or a literal depiction of government cash-payment procedures.

No readable text, dates, captions, invented numbers, broadcast graphics, brands, flags, party symbols or recognizable public figures. No memorial, funeral, candles, mourning portraits, casualties or violence. No split-screen, collage, floating overlays, miniature effect or fisheye distortion. Output one clean still.
```

### F03

```text
Create one photorealistic cinematic still, landscape 16:9, for a fictional educational film. Restrained documentary realism, soft natural light, muted limestone, sand, olive, warm wood and charcoal colors. Natural proportions, level eye-height camera, 35mm-equivalent perspective. Match the photographic treatment of the supplied reference.

CONTINUITY AND COMPOSITION: This is the final frame of a smooth zoom-out from the supplied previous image. Place that COMPLETE image unchanged inside one physical 16:9 screen, directly facing the camera. The active display is centered at x=50%, y=50%, with edges approximately x=34–66% and y=34–66%. It occupies 32% of the total image width and height, only about 10% of the full image area. Thin matte charcoal bezel, no perspective skew, cropping, glare or color shift. Preserve any smaller screen already present inside the reference; do not invent extra screens or magnify the nested content. Keep the entire display unobstructed. The newly revealed environment and foreground action must dominate the composition.

SCENE — PUBLIC PRESSURE. Use the COMPLETE approved F02 budget-office image as the picture on a single outdoor news screen. Do not replace it with F01 or isolate only the military valley inside F02. The office exists only within the display.

Reveal a fictional city square with the urban scale of Times Square, but restrained daylight architecture rather than neon advertising. Dozens of civilians are gathered in a peaceful demonstration against the continuation of the war. The camera stands BEHIND the crowd. Every person faces away from the camera, toward the news screen. Show backs, shoulders and the backs of heads only: no visible faces, profiles, over-the-shoulder glances or people looking at the viewer.

Place nearby people across the lower third, with smaller groups receding along the side edges. A clear central sightline exposes the entire screen. A number of people hold cardboard protest placards facing toward the screen, so the camera sees their plain backs, wooden sticks and attachment tape. Keep placards below or beside the active display, never across it. Varied everyday coats, shirts and bags, naturally spaced bodies, no duplicated figures or regimented rows.

Communicate peaceful protest through the density of the gathering, raised placards and restrained collective posture. No applause, celebration, crowd wave, riot police, smoke or weapons. Keep everyone in a quiet, stable pose suitable for a smooth reveal. One news display in the physical square; architecture and the rear-view crowd occupy the rest of the image.

No readable text, dates, captions, invented numbers, broadcast graphics, brands, flags, party symbols or recognizable public figures. No memorial, funeral, candles, mourning portraits, casualties or violence. No split-screen, collage, floating overlays, miniature effect or fisheye distortion. Output one clean still.
```

### F04

```text
Create one photorealistic cinematic still, landscape 16:9, for a fictional educational film. Restrained documentary realism, soft natural light, muted limestone, sand, olive, warm wood and charcoal colors. Natural proportions, level eye-height camera, 35mm-equivalent perspective. Match the photographic treatment of the supplied reference.

CONTINUITY AND COMPOSITION: This is the final frame of a smooth zoom-out from the supplied previous image. Place that COMPLETE image unchanged inside one physical 16:9 screen, directly facing the camera. The active display is centered at x=50%, y=50%, with edges approximately x=34–66% and y=34–66%. It occupies 32% of the total image width and height, only about 10% of the full image area. Thin matte charcoal bezel, no perspective skew, cropping, glare or color shift. Preserve any smaller screen already present inside the reference; do not invent extra screens or magnify the nested content. Keep the entire display unobstructed. The newly revealed environment and foreground action must dominate the composition.

SCENE — DOMESTIC POLITICAL SCRUTINY. Use the COMPLETE approved F03 city-square demonstration image as the screen content. Reveal a modest parliamentary committee hearing room, visibly small and intimate. A plain rectangular wooden hearing table fills the lower foreground. Five adults in understated formal clothing sit along its side edges: committee members and one government representative facing their questions.

The camera looks through the open space between the seated participants toward the centered wall screen. Show nearby participants from behind or in three-quarter rear view; avoid close-up faces. Place people, microphones and chair backs below or to the sides of the display. One committee member has a hand resting beside an open inquiry folder, indicating a request for an explanation; the representative listens. Their settled poses suggest a hearing in progress without theatrical confrontation or complicated gestures.

Several compact desk microphones, thick neutral inquiry folders and a simple witness position make domestic oversight recognizable. Warm wood paneling and practical lighting. Keep the institution human-scale: one small hearing table and five participants, not a grand conference hall or a crowd. No national emblems, party signs, press scrum or voting graphics. The square and protesters remain entirely inside the display; they are not physically present in the hearing room.

No readable text, dates, captions, invented numbers, broadcast graphics, brands, flags, party symbols or recognizable public figures. No memorial, funeral, candles, mourning portraits, casualties or violence. No split-screen, collage, floating overlays, miniature effect or fisheye distortion. Output one clean still.
```

### F05

```text
Create one photorealistic cinematic still, landscape 16:9, for a fictional educational film. The subject is INTERNATIONAL DIPLOMATIC PRESSURE, expressed through a joint diplomatic press briefing. Restrained documentary realism, natural proportions, level eye-height camera, natural 35mm-equivalent perspective.

SCENE AND ATMOSPHERE: A bright, spacious press atrium in a fictional international conference center. Tall glass windows, pale stone, brushed metal and abundant soft daylight create an open, formal, outward-facing atmosphere. Use neutral whites, light limestone and charcoal, with natural skin tones and restrained saturation. Keep the photographic realism of the reference, but give this location its own bright daylight identity. No warm wood-paneled hearing room, long committee table, horseshoe conference table or seated discussion circle.

MAIN ACTION: Six fictional diplomatic representatives stand in two small groups beside two slim lecterns, one on each side of the composition. Each lectern has several ordinary press microphones. One representative addresses the journalists with a restrained open-hand gesture; another holds a closed briefing folder; the others stand in attentive, serious poses. Their gaze and body orientation are directed toward the journalists and cameras in front of them, or toward the speaking representative. They are issuing a joint public demand concerning the continuing conflict. There is no signing, handshake, celebration, agreement announcement or depiction of an achieved ceasefire.

FOREGROUND: Two professional television cameras on tripods, seen from behind near the lower corners, point toward the representatives. A few journalists with notebooks and one photographer occupy the lower edge, also seen from behind. Keep their silhouettes low and do not obstruct the speakers. The lecterns, standing representatives and press equipment are the immediately recognizable subject, even at small website size. A large understated, unlabelled world-map relief on a SIDE wall provides international context. No recognizable organization or national symbols.

SMALL CONTINUITY SCREEN: Include one small, recessed background monitor on the distant rear wall, in the clear central gap BETWEEN the two groups. Its only visual role is to connect this frame to the previous shot. The active display is front-facing and 16:9, centered at x=50%, y=50%, with edges approximately x=39–61% and y=39–61%. This is 22% of the full image width and height, ONLY ABOUT FIVE PERCENT OF TOTAL IMAGE AREA. It must read as a minor background fixture. No large presentation wall, giant screen, projection surface or luminous focal point. Keep its rectangle unobstructed, with a thin matte bezel and restrained brightness.

REFERENCE USE: Place the COMPLETE supplied F04 committee-room image inside that small monitor only, preserving its framing and contents. Use F04 as a photographic plate for the monitor, not as a layout reference for the new scene. Build the atrium, standing diplomats and press equipment independently around it. No one looks at, points toward, reacts to or discusses the monitor. No audience is seated facing it. The representatives are engaged in their own press briefing.

COMPOSITION FOR ANIMATION: This is the endpoint of a single smooth zoom-out from F04. The monitor remains centered to support the reveal. Keep speakers and lecterns on the sides of its rectangle, with the press equipment below it. Stable poses, clear human spacing, no crowded overlaps or close-up faces.

No readable text, captions, dates, news tickers, logos, flags, party symbols or recognizable public figures. No memorial, candles, casualties, violence, split-screen or floating graphics. Output one clean still.
```

## פרומפטים מלאים להנפשות


### T01

```text
Create one photorealistic cinematic transition using the supplied START and END images, landscape 16:9. Target duration six seconds, or the supported duration with the same sequence. The complete START image is already the photographic picture within the physical screen in END.

Make one smooth continuous zoom-out / screen reveal. Start with START filling the entire output, then steadily reduce its apparent size until the physical screen, new surroundings and foreground subjects of END are fully revealed. Keep the optical center fixed, with no pan, tilt, orbit, roll, sideways move or change of aspect ratio. The end display is centered, approximately x=34–66% and y=34–66%, around ten percent of the total image area. Match the ACTUAL approved END geometry if it differs slightly; do not distort the END image to force target coordinates.

Briefly hold the exact START image. Ease into the backward movement, keep an even pace, then ease to a stop on the exact END composition and hold for about one second. This is an editorial change of context, not travel through a wall or portal. The screen picture stays a stable flat photographic plate; nothing within it transforms into objects or people in the newly revealed space.

The newly revealed people are already in their endpoint positions. Allow only very subtle breathing or clothing motion. No turning toward the camera, walking through the sightline, complex hand gestures, duplicated bodies, changing signs or crowd waves. No cut, cross-dissolve, flash, fade to black, elastic morphing, animated portal or focus jump. Preserve lighting, landmarks and human identity. No added captions, dates, readable writing, logos, flags, speech, music or sound effects. No memorial imagery or violence. Preserve the supplied peaceful protest when it occurs within a reference image.

SPECIFIC REVEAL: START = F01 military valley. END = revised F02 budget office. Reveal the bezel and office, then the desk, calculator, remaining banknotes, outgoing-payment tray and rear-view financial officer. The valley remains entirely inside the screen. Money must not materialize, disappear or change into other objects.
```

### T02

```text
Create one photorealistic cinematic transition using the supplied START and END images, landscape 16:9. Target duration six seconds, or the supported duration with the same sequence. The complete START image is already the photographic picture within the physical screen in END.

Make one smooth continuous zoom-out / screen reveal. Start with START filling the entire output, then steadily reduce its apparent size until the physical screen, new surroundings and foreground subjects of END are fully revealed. Keep the optical center fixed, with no pan, tilt, orbit, roll, sideways move or change of aspect ratio. The end display is centered, approximately x=34–66% and y=34–66%, around ten percent of the total image area. Match the ACTUAL approved END geometry if it differs slightly; do not distort the END image to force target coordinates.

Briefly hold the exact START image. Ease into the backward movement, keep an even pace, then ease to a stop on the exact END composition and hold for about one second. This is an editorial change of context, not travel through a wall or portal. The screen picture stays a stable flat photographic plate; nothing within it transforms into objects or people in the newly revealed space.

The newly revealed people are already in their endpoint positions. Allow only very subtle breathing or clothing motion. No turning toward the camera, walking through the sightline, complex hand gestures, duplicated bodies, changing signs or crowd waves. No cut, cross-dissolve, flash, fade to black, elastic morphing, animated portal or focus jump. Preserve lighting, landmarks and human identity. No added captions, dates, readable writing, logos, flags, speech, music or sound effects. No memorial imagery or violence. Preserve the supplied peaceful protest when it occurs within a reference image.

SPECIFIC REVEAL: START = COMPLETE revised F02 budget office. END = revised F03 rear-view city-square demonstration. Reveal that the entire budget-office image is shown on the square's outdoor news display. Then reveal the facade, square, backs of heads, shoulders and backs of protest placards. All civilians keep facing the screen throughout; no faces or profiles appear. Their bodies emerge only as the view widens, never from the office furniture or money. Do not zoom into the inner military picture. Do not return to F01. One continuous backward reveal, without an intermediate shot.
```

### T03

```text
Create a six-second photorealistic cinematic transition, landscape 16:9. START is the supplied F03 city-square demonstration, with all civilians seen from behind. END is the supplied F04 committee room, where the complete F03 scene appears on the wall display.

Animate the peaceful demonstration with CLEAR, VISIBLE PROTEST MOVEMENT. Several civilians lift their existing cardboard placards a short distance and lower them again. A few briefly raise an open hand and bring it down. Add restrained forward-and-back body movement and small weight shifts, with different people moving at different times. This should feel like a determined civilian demonstration, not a celebration, applause or a synchronized crowd wave. Everyone stays in their original place, facing the news screen in the square. Show only backs, shoulders and the backs of heads; no one turns toward the camera. Preserve each person's identity and clothing. Keep the same placards, hands and bodies, without duplication or changes of shape.

At the same time, perform ONE continuous smooth zoom-out. Begin with the complete F03 image filling the frame. Gradually reveal that the moving demonstration is VIDEO PLAYING INSIDE the committee room's wall display, then reveal the surrounding room, hearing table, folders, microphones and seated committee members. The demonstration remains animated within the display during the reveal; do not freeze it at the beginning. Its internal outdoor news screen showing F02 remains unchanged.

Keep the optical center fixed. No pan, tilt, orbit or cut. Match the screen position and size of the supplied END image, approximately x=34–66% and y=34–66%. The protesters and their placards remain inside that display; they never become committee members or appear in the physical committee room. Keep the committee participants mostly still, with only natural breathing.

TIMING: Briefly establish the exact START frame. During roughly 0.4–4.8 seconds, combine the steady zoom-out with the visible, asynchronous protest movements. Each moving person completes a small lift-and-lower gesture and settles back into the corresponding pose shown on the display in END. Ease the camera and the crowd movement to a stop. Hold the supplied END composition for the final second.

Keep the central sightline in the square clear. Placards must not sweep across its news screen. Preserve the square, architecture, screen content and committee room. No morphing, fading, flashing or changing locations through object deformation. No new text, slogans, symbols or dialogue. Silent clip. The scene remains a peaceful fictional demonstration throughout.
```

### T04

```text
Create a six-second cinematic transition between the supplied START and END images, landscape 16:9, silent.

START is the approved committee-room image. END is the approved international press-briefing image. Preserve both supplied compositions and the people already present. This is an EDITED TRANSITION BETWEEN TWO DISTINCT LOCATIONS.

Use a SOFT FOREGROUND WIPE WITH A HIDDEN CUT. Begin on the complete START composition. Make a very gentle lateral camera move. A heavily defocused, matte charcoal foreground surface passes across the lens from left to right, like the camera briefly moving behind a nearby dark partition. It is a simple opaque foreground shape with softly blurred edges, not a new person or recognizable object.

Let this foreground surface fully cover the view for a brief moment. Make ONE clean editorial cut while the view is completely covered. As the same dark surface continues moving in the same direction and clears the lens, reveal the END location already fully formed. Settle smoothly into the exact supplied END composition.

Suggested timing: 0.0–0.6 seconds, establish START; 0.6–2.4 seconds, the foreground surface crosses and covers the view; 2.4–2.6 seconds, complete coverage and the hidden cut; 2.6–4.8 seconds, the surface continues across and reveals END; 4.8–6.0 seconds, hold END.

Keep the people and furniture intact within their respective shots. Human movement is limited to subtle breathing. In END, representatives face the journalists or the speaking colleague. The small background monitor remains an ordinary static fixture.

Do not zoom into or out of a screen. Do not transform the room, stretch the image, blend faces, turn tables into lecterns, or imply that both rooms are physically connected. No flash, glowing portal, spiral, strobe or added text. Use a steady, restrained pace and end with a clean, motionless frame.
```
