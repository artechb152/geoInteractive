שיעור 6 — פרומפטים ל־Google Flow, גרסה 3: תצוגה אחת
29.10.2026

הכיוון שאושר
שטח תלת־ממדי אחד ממלא את הפריים. אין מסך מפוצל, מפה בצד, קו הפרדה או חלונית מפה. בבדיקת המיקום בלבד עוברים זמנית למפה של אותו שטח על כל הפריים, ואז חוזרים לתלת־ממד. המפה והשטח מוצגים בזה אחר זה, לעולם לא במקביל.
משמרים את המראה המציאותי ואת הדמות הכחולה בתמונה שיצרת. מבטלים את הטשטוש: הגבעה, הדקלים, הצומת והמבנה צריכים להיות מזוהים וחדים.

התוכן
ארבע כרטיסיות הפתיחה הקיימות ב־src/components/lessons/topic-06/OnboardingScene.tsx:
1. תכנון: בחירת המסלול — חלופות מסלול ונקודות לבדיקת מיקום.
2. יציאה: קביעת כיוון — מאמתים מוצא וקובעים כיוון לפני הליכה.
3. בתנועה: בדיקת המיקום — משווים את הגבעה והדקלים למפה של אותו מקום.
4. הגעה: אימות היעד — מזהים את הצומת והמבנה שנבחרו מראש.
לא משנים כרטיסיות או קוד במסגרת הכנת הפרומפטים.

מה מפיקים
שש תמונות: B00 בסיס, P01 תכנון, P02 יציאה, P03T בדיקה בשטח, P03M מפת ביניים, P04 הגעה.
חמישה קליפים: A01 תכנון; A02 יציאה; A03A תנועה ועצירה ואז מעבר למפה; A03B חזרה מהמפה לשטח; A04 הגעה.
לכרטיסייה השלישית שני קטעים כדי להבטיח שהמפה תהיה מצב ברור ולא הבזק שהמודל עלול לדלג עליו. P03M אינו אקורדיון נוסף.

סדר ההפקה
א. צרף את התמונה שהעלית והשתמש ב־B00 לעריכה שלה. מאשרים תמונת בסיס בלי הפיצול לפני שממשיכים.
ב. צור את P01 בעריכת B00, את P02 בעריכת P01, ואת P03T בעריכת P02.
ג. צור את P03M דווקא מתוך P03T המאושרת, כדי שהמפה תיגזר מהשטח הנכון. אין להשתמש במפה שבצד שמאל של התמונה המקורית כבסיס למפת הביניים.
ד. צור את P04 מתוך P03T. P03M הוא מעבר ביניים בייצוג, לא עולם חדש.
ה. לכל הנפשה מצוינים פריים התחלה ופריים סיום. צרף אותם במקומות המתאימים ב־Flow והדבק רק את פרומפט ההנפשה. אפשרויות ההפקה לפי תיעוד Google: https://support.google.com/flow/answer/16353334?hl=en .
ו. יחס 16:9. פרומפטי ההנפשה מגדירים יעדי בימוי של 4–8 שניות; בחר אורך נתמך במודל שבו אתה עובד. זמני הפעולה הם הנחיה ולא הבטחת תזמון של Flow.
ז. אין ליצור תמונות מצב חדשות מאפס אחרי אישור הבסיס. שומרים על אותה גבעה, קבוצת דקלים, דמות, צומת ומבנה. הדמות והסימונים מוגדלים לקריאות; השטח עצמו אינו נבנה מחדש בזמן הניווט.

שפה חזותית
חומרי קרקע וסלע מציאותיים כמו בשיעור 2, דמות תלת־ממדית בולטת כמו בשיעור 1, סרטי מסלול כתומים רחבים כמו קו הגבול הבולט בשיעור 2. הסרטים הם שכבת הסבר, לא דרכים חדשות שנבנות בעולם ולא הבטחה לנתיב בטוח.
אין טשטוש מיניאטורות או עומק שדה שמסתיר סימני ניווט. אין טקסט, עברית, אותיות A/B או מעלות בתוך תוצרי Flow. סימונים מדויקים אפשר להוסיף באתר בהמשך.

=== B00 — תמונת בסיס: תיקון התמונה שלך לתצוגה אחת ===
קלט: התמונה שהעלית ובה המפה משמאל והשטח מימין.
תוצר: base-single-view.png

Edit the supplied image into ONE continuous full-width 16:9 terrain scene. Remove the entire paper-map panel on the left and remove the vertical divider. Use only the realistic terrain on the right as the visual source, then recompose and outpaint that same landscape across the full canvas. Do not stretch the right-hand image, mirror it, duplicate the hill, or replace the removed panel with a new panel.

Preserve the identity of the broad rocky hill, the distinctive palm cluster, the existing dirt-track junction, the single rectangular pale-stone building, and the same solid-blue three-dimensional navigator. Keep the navigator near the lower-left departure area, the hill ahead near the center, the palms to the hill's lower-right, and the junction and stone building farther away toward the upper-right. Make the full route area readable within the central composition.

Use realistic semi-arid limestone, dusty earth, sparse olive vegetation, soft daylight and an elevated oblique camera. Keep deep focus across the entire scene: the navigator, hill, palms, junction and building must all be sharp and recognizable. Remove miniature tilt-shift blur and excessive background blur. The blue navigator has visible volume, feet and a grounded contact shadow, with the same design as the reference.

This is the unmarked base state. No route ribbons, compass, checkpoint discs, map sheet, inset, split screen, border between views, text, letters, numbers, captions, logo, watermark, new landmarks or enemy forces. The finished image must read as one coherent location filling the entire frame.

=== P01 — תמונה: בחירת מסלול ===
קלט: עריכת B00 המאושרת.
תוצר: state-1-plan.png

Edit the approved single-view base image into the planning state. Preserve its full-width 16:9 composition, camera, rocky hill, palm cluster, dirt tracks, junction, pale-stone building, blue three-dimensional navigator and lighting. Keep every landmark sharp. The landscape remains one continuous scene; do not introduce a paper map or a second view.

Add two large, clearly distinguishable teaching routes from the navigator's departure point to the same destination junction beside the building. One shorter candidate crosses the steep, exposed rocky shoulder of the hill. Draw it as a broad gray dashed line. The chosen longer candidate follows lower ground around the hill, passing near the palm cluster before continuing to the destination. Draw it as a thick solid burnt-orange ribbon, slightly raised above the ground as a clearly instructional overlay, not a newly built road.

Place two large hollow checkpoint discs on the chosen ribbon. The first is on lower ground where the hill and palm cluster can both be compared; the second is farther along before the destination. Use simple unlettered endpoint shapes. Keep the navigator stationary at departure. The two alternatives and checking places must remain immediately readable at 600-pixel display width.

Maintain realistic materials and strong, tangible graphics like the reference lesson animations. The orange route is a selected example, not a guarantee of safety or a universal preference for longer routes. No compass, walking figure, new road construction, split screen, map inset, delicate hairlines, text, numbers, glowing HUD, logos or watermarks.

=== P02 — תמונה: קביעת כיוון היציאה ===
קלט: עריכת P01.
תוצר: state-2-start.png

Edit the approved planning image into the departure-direction state. Preserve the same single full-width landscape, exact geography, deep focus, blue navigator at departure, chosen orange route and checkpoint positions. Reduce the prominence of the unchosen gray route. Do not move the navigator yet.

Introduce one large tangible educational compass in the foreground beside the navigator. It should occupy roughly one quarter of the frame width, large enough to read at a small display size, while leaving the figure and first checkpoint visible. Give it a pale face, material depth, a clearly distinct north needle and a separate burnt-orange travel-direction pointer on its baseplate. Fine numerals or letters are unnecessary.

The north needle remains aligned with the scene's north reference. The separate orange travel pointer is aligned with the FIRST leg of the chosen route toward the first checkpoint. It must not aim straight at the final destination across the hill. A broad matching arrow on the ground clearly indicates that same first leg. The final state shows one unambiguous departure direction, not a fan of overlapping rays.

Keep realistic limestone, natural vegetation, soft daylight and all landmarks sharp. The oversized compass is a teaching prop, not a new physical landmark. No walking navigator, north needle magically pointing to the destination, invented degree reading, extra north references, paper map, split screen, inset, text, captions, GPS display, glowing effects, logos or watermarks.

=== P03T — תמונה: עצירה לבדיקת המיקום בשטח ===
קלט: עריכת P02.
תוצר: state-3-check-terrain.png

Edit the approved departure image into the stopped position-check state. Preserve the same full-width 16:9 terrain scene, oblique camera, rocky hill, palm cluster, tracks, junction, stone building, light and deep focus. Remove the oversized compass and its temporary direction arrow; retain the chosen orange route and checkpoints.

Place the same single solid-blue three-dimensional navigator at the FIRST planned checkpoint, after following the chosen route around the lower side of the hill. The navigator is visibly stopped, with feet on the ground and the same body design as before. Do not introduce a duplicate figure or a GPS marker. The first checkpoint is in a location where both the hill and palms are clearly visible and separated.

Emphasize the existing hill with a broad unfilled burnt-orange ring, and the existing palm cluster with a large open bracket. These two distinct shapes identify the features that will be matched to the map. Keep the hill's geometry, the exact palm cluster and the whole road network unchanged. The completed route segment can be slightly stronger than the remaining route, without changing the route's location.

The image must communicate a deliberate stop to inspect recognizable terrain features. There is only one view, filling the frame. No paper-map panel, inset, split screen, added hill, new palms, expanding terrain, thin crisscrossing sightlines, automatic success tick, blurred landmarks, text, letters, numbers, captions, logos or watermarks.

=== P03M — תמונת ביניים: אותו מקום כמפה על כל הפריים ===
קלט: עריכת P03T המאושרת — לא המפה שבתמונה המקורית.
תוצר: state-3-check-map.png

Transform the supplied approved terrain-check image into ONE full-frame top-down topographic map of that EXACT same fictional location. The entire 16:9 canvas becomes the map. Do not preserve a separate terrain panel, add an inset, display a physical map sheet beside the landscape, or divide the screen.

Derive the map from the approved terrain image. Represent the same hill with nested closed contour lines, the same palm cluster with corresponding palm symbols, the same dirt-track junction with the same three road arms, and the same stone building with a rectangular footprint on the correct side of the junction. Preserve all relative locations, route bends, checkpoints and the navigator's checked location. Keep the map's north orientation consistent with the terrain camera's north reference; do not mirror or rotate the geography arbitrarily.

Use flat warm cream paper, crisp restrained brown contour lines, olive landmark symbols and the same broad orange planned route. Convert the navigator into one plain blue location symbol at its existing checkpoint; this is an illustrative position marker, not an automatic GPS fix. The hill's contour group carries the same broad open ring as the hill in the terrain image, and the palm-symbol group carries the matching open bracket. The two correspondences must be unmistakable without reading labels.

Keep the map simple and readable at 600-pixel width. No new landmarks, missing palms, invented coordinates, scale claims, text, letters, numbers, tilted paper page, 3D diorama base, split screen, thumbnails, GPS interface, logo or watermark.

=== P04 — תמונה: אימות היעד מקרוב ===
קלט: עריכת P03T.
תוצר: state-4-arrive.png

Edit the approved stopped terrain-check image into the destination-verification state. Keep the same fictional landscape, original three-way dirt-track junction, rectangular pale-stone building, navigator identity, daylight and realistic materials. Remove the earlier hill and palm highlights. The whole image remains ONE continuous three-dimensional terrain view.

Bring the camera closer to the existing destination, using an elevated oblique view that makes all three arms of the junction readable. The junction and neighboring building should now be large focal objects, together occupying about half the frame. Preserve which side of the junction the building stands on. Keep the same navigator stopped at the actual intended junction, not merely somewhere in the general destination area. Show enough of the incoming orange route to connect this location to the earlier journey.

Mark the junction itself with a bold open ring, and separately mark the existing rectangular building with a bold open bracket. These are the two previously planned identification signs. A small destination marker is filled as the completed result of checking both; it does not surround the whole neighborhood. Keep the navigator, junction and building all sharply focused.

No simultaneous paper map, divided screen, map inset, new building, different junction, changed road geometry, broad arrival-radius effect, automatic GPS lock, giant success tick, celebration, background blur, captions, text, letters, numbers, logo or watermark. Communicate identifying the precise planned place through concrete landmarks.

=== A01 — הנפשה: שני המסלולים נבנים ===
פריים התחלה: base-single-view.png
פריים סיום: state-1-plan.png
תוצר: clip-1-plan.mp4
יעד בימוי: 6 שניות.

Animate from the supplied unmarked base image to the supplied planning image in one single full-frame terrain scene, targeting approximately six seconds. Preserve the exact geography, camera, realistic materials, soft daylight, blue navigator and deep focus. Nothing in the physical landscape is built or moved. Only the teaching overlays develop.

Hold the unmarked scene briefly. Draw the shorter gray dashed route across the rocky hill shoulder toward the existing destination. Let the viewer recognize which terrain it crosses. Then build the broader burnt-orange lower-ground route from the same departure around the hill toward that same destination. The orange route grows with a clearly traveling front, like the prominent orange border in the reference lesson-2 animation. It is an overlay above existing ground, not a new road being constructed.

Once both alternatives are visible, emphasize the chosen orange route while keeping the shorter alternative gray and dashed. Add the first large hollow checking disc on the selected route, then the second. Let each settle visibly instead of appearing as a tiny blink. Hold the complete plan for about the final second. The navigator remains at departure throughout.

Keep the scene visually strong and uncluttered. No map panel, inset, split screen, camera move, altered endpoints, growing hill, new palms, compass, walking figure, text, degree values, captions, logos, watermark or decorative particles. Finish precisely on the supplied planning frame.

=== A02 — הנפשה: המצפן מופיע והכיוון מתיישר ===
פריים התחלה: state-1-plan.png
פריים סיום: state-2-start.png
תוצר: clip-2-start.mp4
יעד בימוי: 6 שניות.

Animate the supplied planning frame into the supplied departure-direction frame in approximately six seconds. Keep one continuous full-width terrain scene with the same camera, hill, palm cluster, tracks, building, checkpoints and stationary blue navigator. Maintain sharp focus across the landscape.

After a brief hold, make the discarded gray route quieter. Bring a large tangible teaching compass up into the foreground beside the departure point with a clear lifting and settling motion. Its size and depth must make it an immediately noticeable object, not a small corner icon. Do not cover the navigator or first checking place.

Keep its north needle pointing toward the same fixed north reference. Rotate the separate orange travel-direction pointer on the baseplate from an unaligned orientation into agreement with the first leg of the planned route. A broad ground arrow turns with the travel pointer. While unaligned it visibly misses the first checkpoint; when aligned it points toward that checkpoint. Remove any temporary misaligned arrow so the final image shows one clear direction. Never rotate the north needle toward the destination.

Hold the correct alignment at the end. The navigator has not started walking. No paper map, side panel, split screen, inset, GPS lock, new route, altered geography, arbitrary degree reading, text, captions, numbers, extra compass types, glow, logo or watermark. Match the supplied end frame.

=== A03A — הנפשה: התקדמות, עצירה ומעבר למפה ===
פריים התחלה: state-2-start.png
פריים סיום: state-3-check-map.png
תוצר: clip-3a-stop-and-map.mp4
יעד בימוי: 8 שניות; זה הקטע הארוך ברצף כדי שאפשר יהיה לקרוא את ההשוואה.

Animate from the supplied departure frame to the supplied full-frame topographic map, targeting approximately eight seconds. There is only ONE view at any moment. Start with the exact realistic terrain and finish with the exact flat map. Do not show both side by side, add a divider, or use a map inset.

First retract the oversized compass and its temporary ground arrow. Move the same single blue three-dimensional navigator along the chosen orange route to the first checkpoint near the hill and palm cluster. This is schematic time-compressed progress, without a distance counter or real-time speed claim. Stop the figure clearly before changing the viewpoint.

After the stop, lift the camera smoothly into a true overhead view of the same location. Transition that entire view into the warm flat topographic map: the existing hill's shape is represented by nested contours, the existing palm cluster becomes its corresponding symbols, and roads and the stone building retain their actual arrangement. This is a change of representation, not the landscape physically changing or a new world appearing.

Once the map fills the whole frame, emphasize the hill's contour group with a broad open ring. Then emphasize the palm-symbol group with an open bracket. Keep the blue location symbol at the same checked position. Hold the supplied map frame at the end. No new landmark, mirrored geography, teleporting checkpoint, automatic GPS fix, text, letters, numbers, captions, logos or watermarks.

=== A03B — הנפשה: חזרה מהמפה לאותו שטח ===
פריים התחלה: state-3-check-map.png
פריים סיום: state-3-check-terrain.png
תוצר: clip-3b-back-to-terrain.mp4
יעד בימוי: 4 שניות. מחברים מיד אחרי A03A במסגרת אותה כרטיסייה.

Animate from the supplied full-frame topographic map back to the supplied terrain-check frame in approximately four seconds. Start with the flat map filling the entire 16:9 image. End with the same continuous realistic terrain filling the entire image. Never show simultaneous panels, a paper-map inset, a screen divider or a floating extra sheet.

Briefly hold the map's two highlighted landmark groups. Then smoothly return from the flat topographic representation to the exact matching oblique terrain viewpoint: the nested contour group resolves into the existing rocky hill, the palm symbols resolve into the same existing palm cluster, and the road junction and building maintain their relative locations. Restore natural ground textures and depth as a representation transition, not as new terrain or trees being constructed.

Keep the broad hill ring and palm bracket associated with their same features during the transition, so the relationship remains visible. The blue map symbol resolves into the same single blue three-dimensional navigator, still stopped at the same first checkpoint. It must not walk, duplicate itself, jump to a new place or acquire a GPS signal.

Settle on the approved terrain frame with deep focus and hold it cleanly for the last second. Preserve the chosen route, remaining checkpoint, daylight and geography. No new landmarks, different tree count, changed building location, text, letters, numbers, labels, logos, watermark, flashing interface or decorative effects.

=== A04 — הנפשה: מתקרבים ליעד ומאמתים שני סימנים ===
פריים התחלה: state-3-check-terrain.png
פריים סיום: state-4-arrive.png
תוצר: clip-4-arrive.mp4
יעד בימוי: 6 שניות.

Animate the supplied terrain-check frame into the supplied destination-verification frame, targeting approximately six seconds. Maintain one continuous full-width landscape with the same tracks, three-way junction, rectangular pale-stone building, navigator identity, lighting and realistic materials. No map appears during this clip.

Release the earlier hill and palm teaching highlights. Move the same blue three-dimensional navigator forward along the remaining chosen orange route toward the existing destination. Use clearly schematic time-compressed progress, without a clock, distance counter or claim about real walking speed. During this progression, smoothly bring the camera closer to that same junction, keeping an elevated oblique view so all three road arms remain readable. The building and junction become large, sharp focal objects.

Stop the navigator at the planned junction itself. Only after stopping, trace the junction's shape with a bold open ring. Then frame the adjacent rectangular building with a separate bold open bracket. Let the viewer recognize the two signs one after the other. Fill the small destination marker only after both checks, and hold the exact final frame for about the last second.

Do not create a new building, change the road layout, mirror the scene, duplicate the figure, show a broad arrival radius, trigger a GPS lock, or display a giant victory checkmark. No split screen, inset, paper map, blur hiding the signs, text, captions, letters, numbers, logo, watermark or celebratory effects.

בדיקה לפני המשך ההפקה
• B00 חייב להיות שטח אחד על כל הפריים. אם נשארת רצועת מפה בצד, מתקנים את הבסיס לפני יצירת יתר המצבים.
• בכל תוצר אותם סימני שטח, צומת ומבנה, ואותה דמות כחולה. אין להוסיף או להחסיר דקלים בין מצב למצב.
• בתכנון רואים שני נתיבים בין אותם קצוות ושתי נקודות בדיקה.
• ביציאה מחט הצפון נשארת מחט צפון; חץ התנועה הנפרד מתיישר לקטע הראשון, לא בקו ישיר ליעד הסופי.
• המנווט עוצר לפני המעבר למפה. המפה ממלאת את הפריים ומגיעה בדיוק למצב P03M, ואז חוזרים ל־P03T. אין לאשר מפה שאינה תואמת לשטח.
• בהגעה בודקים קודם צומת ואז מבנה. אין אישור אוטומטי המבוסס על קרבה בלבד.
• בודקים גם ברוחב 600 פיקסלים שהדמות, סרטי המסלול, המצפן וסימני הניווט מזוהים. לא משתמשים בטשטוש כדי לתת מראה מיניאטורי.

שילוב עתידי ונגישות
ארבע הכרטיסיות נשארות כפי שהן. מפת הביניים ושני הקטעים של כרטיסייה 3 הם חלק מההמחשה שלה בלבד. את קליפ התכנון מפעילים בפתיחה; תמונת הבסיס אינה כרטיסייה חמישית. בשילוב יש לאפשר זמן לקריאת המפה ולא להאיץ אוטומטית את כל הרצף לקצב המעברים הקצר של שיעור 2.
ההסברים באקורדיונים נשארים נגישים גם בלי קול. למעדיפים תנועה מופחתת מציגים תמונת סיום של כל כרטיסייה; הקשר למפה עדיין מוסבר בטקסט הקיים. אין לשקף סרטונים עבור RTL.
תיאורים חלופיים מוצעים: תכנון — שני מסלולים ונקודות בדיקה; יציאה — מצפן וחץ הקטע הראשון; בדיקת מיקום — התאמת הגבעה והדקלים בין אותו שטח למפתו; הגעה — זיהוי צומת היעד והמבנה לידו.
