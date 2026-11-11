שיעור 6 — פרומפטים מלאים לתמונות ולהנפשות ב־Google Flow
29.10.2026

מה מכינים
ארבע תמונות מצב ושלוש הנפשות מעבר עבור ארבע הכרטיסיות הקיימות ב״לפני שמתחילים״ בלבד. הפרומפטים מוכנים להעתקה באנגלית. התמונות והסרטונים עצמם יופקו על ידך ב־Flow; המסמך אינו משנה את הכרטיסיות או מחבר נכסים לאתר.

המקור לתוכן
src/components/lessons/topic-06/OnboardingScene.tsx — STEPS, כפי שהוא ב־29.10.2026.
הייחוס החזותי: public/assets/scene-onboarding/topic-02/states/state-1-base.webp ושאר תמונות המצבים משיעור 2. אותו ריאליזם של קרקע, סלעים וצמחייה, עם מבט אלכסוני קבוע; יוצרים תא שטח חדש שמתאים לכרטיסיות שיעור 6.

התאמה לכרטיסיות
1. ״תכנון: בחירת המסלול״ — מוצא ויעד, השוואת מסלולים לפי מרחק, תנאי שטח וחשיפה, ובחירת נקודות לבדיקה. המסלול הקצר אינו בהכרח המתאים.
2. ״יציאה: קביעת כיוון״ — אימות נקודת המוצא וקביעת כיוון במצפן לפי האזימוט המתוכנן. סטייה קטנה גדלה לאורך הדרך.
3. ״בתנועה: בדיקת המיקום״ — התאמת הגבעה והדקלים בשטח למפה. כשאין התאמה, עוצרים לבדיקה לפני המשך.
4. ״הגעה: אימות היעד״ — זיהוי היעד לפי צומת ומבנה שנבחרו מראש; קרבה לבדה אינה אימות, במיוחד בראות מוגבלת.

החלטת הבימוי
אותו נוף, אותה מצלמה ואותה תאורה בכל ארבעת המצבים. רק הסימון של המנווט ושכבת ההסבר משתנים. לא בונים כבישים או בתים מחדש, ולא מחליפים את הנוף בין הכרטיסיות. קווי המסלול הם מידע גרפי מעל נוף מציאותי. תוואי השטח ותצוגת המפה הם המחשה בדיונית, לא מפה מדידה. הצבע אינו קובע אם מסלול בטוח.

סדר הפקה
1. צרפו את state-1-base.webp משיעור 2 כרפרנס לחומרים ולתאורה בלבד. צרו את F01 ואשרו את הגיאוגרפיה לפני ההמשך.
2. צרו את F02 בעריכת F01 המאושרת; את F03 בעריכת F02; ואת F04 בעריכת F03. בכל שלב צרפו גם את F01 כרפרנס נעילת גיאוגרפיה, אם נדרשת תזכורת.
3. לכל מעבר צרפו את שתי תמונות המצב: T01 משתמש ב־F01 ו־F02; T02 ב־F02 ו־F03; T03 ב־F03 ו־F04. בחרו אותן כפריים התחלה ופריים סיום והדביקו את פרומפט המעבר המתאים.
4. יחס 16:9. יעד: 4 שניות לכל מעבר, אם זמין במודל שנבחר. התזמונים בפרומפט הם הנחיית בימוי; אם בחרתם משך אחר, שמרו על היחסים בין החזקה, פעולה ועצירה.
5. שמרו ארבע תמונות ושלושה קטעי וידאו נפרדים, בשמות המופיעים בהמשך. אין צורך בקליפ פתיחה נוסף: התמונה הראשונה היא מצב הפתיחה.
6. אל תצרבו כותרות, עברית, A/B, מספרי מעלות או כתוביות בתוך המדיה. בהמשך אפשר להוסיף סימונים מדויקים כשכבה באתר. לא להציג את שלבי הלמידה כתהליך אוטומטי: המנווט בודק לפני תנועה ולפני אישור הגעה.

תיעוד Flow שנבדק בעת הכתיבה:
https://support.google.com/flow/answer/16353334?hl=en — הוספת פריים התחלה וסיום ותיאור התנועה שביניהם.
https://support.google.com/flow/answer/16352836?hl=en — מודלים, משכים ותכונות נתמכות. בדקו את ההגדרות הזמינות בחשבון בזמן ההפקה.

=== F01 — תמונה: תכנון ובחירת מסלול ===
קלט: רפרנס משיעור 2 לסגנון בלבד.
תוצר: state-1-plan.png
מטרת ההמחשה: להראות שתי חלופות בין אותן נקודות, ואת המקומות שנבחרו לבדיקת מיקום.

Create a photorealistic educational terrain image, landscape 16:9, preferably 1920 by 1080 or higher. Match the supplied lesson-2 reference only in its realistic limestone, dusty earth, sparse olive-green vegetation, deep focus and soft daylight. Create the new geography described here; do not copy the reference river. Use natural terrain filling the frame, without a tabletop base, cutaway block, plastic miniatures or illustrated rendering.

Lock an elevated oblique camera looking down about 45 degrees, with no horizon. Establish one coherent semi-arid landscape. Place the departure point in the lower-left quadrant, a broad rounded rocky hill near the center, a distinctive cluster of three date palms to the lower-right of the hill, and the destination in the upper-right quadrant. The destination is one clearly identifiable three-way dirt-road junction beside a small rectangular pale-stone building. Keep the hill, palms, junction and building comfortably inside the central 70 percent of the image. Show natural erosion, readable slopes and believable ground contact shadows. Make the important features readable in a 600-pixel-wide display.

Overlay a restrained planning diagram registered to the ground: a small plain circle at departure and a small outlined square at the destination. Draw two alternatives connecting these exact same endpoints. A thin dashed warm-gray alternative goes more directly across the broad hill shoulder. A slightly stronger solid burnt-orange alternative follows the lower ground around the hill toward the same junction. The longer route is an example under consideration, not a guarantee of safety. Mark two planned checking places on that lower route using small empty rings. No arrows suggesting movement yet.

Use the site's warm cream, limestone, olive and muted burnt-orange palette. Keep the terrain visually dominant and the graphics thin, clear and unlit. No compass instrument, moving traveler, sightlines, arrival confirmation, enemy symbols, combat, HUD, glowing holograms, text, letters, numbers, captions, logos or watermarks. Do not imply that the shortest route is automatically the best.

=== F02 — תמונה: יציאה וקביעת כיוון ===
קלט: עריכת F01 המאושרת; לא יצירה מחדש של השטח.
תוצר: state-2-start.png
מטרת ההמחשה: להישאר בנקודת המוצא ולבדוק את כיוון היציאה לפני שמתקדמים.

Edit the supplied approved planning frame into the departure-direction frame of the same educational sequence. Preserve its camera, 16:9 crop, terrain geometry, every rock and shrub, hill, three-palm cluster, three-way junction, pale-stone building, daylight and shadows. Do not regenerate, mirror, rotate or rescale the landscape. Maintain the same photorealistic limestone, dusty ground, olive vegetation and warm daylight used in the lesson-2 visual reference.

Remove the unchosen dashed direct alternative. Keep the solid muted burnt-orange lower-ground route, its two empty checking rings, the departure circle and destination square exactly registered to their existing locations. Place one small, clearly visible olive-colored navigator marker inside the departure circle; it has not started moving. Use a simple solid marker with a directional tip rather than a person whose body or clothing could change between frames.

Beside the departure circle, add a compact clean compass schematic as a flat educational overlay. Show a north-reference needle and a separate direction pointer aligned with the route's first leg, not a straight shortcut to the final destination. A subtle small arc between the reference and pointer communicates setting the departure direction. Keep the compass clear of the departure marker and all landmarks. It must have no dial numerals, letters or claimed degree value: exact azimuth is not specified by this illustrative frame. Keep only one north reference; do not introduce the three-norths topic here.

The learning focus is verifying the known starting point and establishing direction before departure. Everything else stays calm and unchanged. Use crisp understated flat graphics rather than luminous effects. No travel trail, second traveler, sightlines to distant landmarks, arrival signal, new roads or buildings, weather change, camera movement, text, Hebrew, letters, numbers, captions, logos or watermark. The image must look like the same photographed location with a different explanatory overlay.

=== F03 — תמונה: בדיקת המיקום בתנועה ===
קלט: עריכת F02; אפשר לצרף גם F01 לנעילת הנוף.
תוצר: state-3-travel.png
מטרת ההמחשה: לעצור בדרך ולהשוות את מיקום הגבעה והדקלים למפה.

Edit the supplied approved departure frame into a mid-route position-check frame. Preserve the exact 16:9 crop, locked elevated oblique camera, hill, three date palms, road network, destination junction and pale-stone building. Every natural feature, ground texture, light source and shadow stays in its original location. Keep the photorealistic semi-arid limestone landscape and warm restrained palette of the preceding frame.

Remove the compass schematic. Move the same single olive navigator marker from departure to the first planned checking ring on the lower-ground route. Place it visibly on that ring and keep it stationary, because the navigator is checking before continuing. Keep the departure circle, remaining checking ring, destination square and the selected route. Use a slightly stronger burnt-orange stroke only for the route already traveled; make the remaining route a lighter continuous stroke of the same hue. These strokes indicate progress, not safe versus dangerous ground.

Highlight exactly two existing landmarks with restrained, unfilled outlines: the rocky hill and the three-palm cluster. Connect the stationary navigator to each with a thin neutral sightline. These are visual-comparison guides, not extra walking routes. Add one small flat top-down map inset in the otherwise quiet lower-right corner, with a warm paper background. Its hill footprint, palm-cluster symbol, route shape, departure and destination must correspond to this same landscape, not a different location. Mark the same two landmarks in the inset using matching outline shapes, so terrain-to-map comparison is readable without text. Keep the inset secondary and clear of the actual palm cluster and destination.

Communicate an intentional pause to compare two features and verify position. Do not show an automatic success check or suggest the device determines position by itself. No additional terrain features, different season, route teleportation, camera pan or zoom, changing landscape, GPS screens, futuristic interface, text, letters, numbers, captions, logos or watermarks. Maintain enough open space that the two comparisons remain visually distinct.

=== F04 — תמונה: הגעה ואימות היעד ===
קלט: עריכת F03; אפשר לצרף גם F01 לנעילת הנוף.
תוצר: state-4-arrive.png
מטרת ההמחשה: לאמת את הצומת והמבנה שנבחרו מראש, ולא להסתפק בקרבה ליעד.

Edit the supplied approved mid-route frame into the final destination-verification frame of the same four-state educational sequence. Keep precisely the same photorealistic landscape, elevated oblique camera, 16:9 crop, hill, three palms, every road, the three-way destination junction and its neighboring rectangular pale-stone building. Preserve the exact lighting, ground textures, camera direction and scale. Nothing in the physical environment moves or newly appears.

Move the same single olive navigator marker along the selected lower-ground route to the existing destination square, at the actual three-way junction. The marker is stopped there. The complete selected route is now a restrained solid burnt-orange stroke. Keep the departure circle visible but quiet. Remove the old mid-route sightlines and hill/palm highlighting.

The focus is identification using two planned destination signs. Outline the three-way junction itself with one thin clean contour and outline the adjacent pale-stone building separately. Both must be visually recognizable and unchanged from all earlier frames. Do not draw a broad arrival halo that treats the whole neighborhood as the destination. Retain the small top-down map inset in the lower-right corner, with the same geography and route as before. In that inset, emphasize the corresponding junction symbol and building footprint, with the navigator at that exact planned junction rather than merely nearby. The pair of matching signs communicates why the destination is identified.

Keep all annotations clear, modest and flat. The landscape remains the main visual. No giant green checkmark, confetti, celebration, new landmarks, spontaneous building construction, GPS lock animation, weather or daylight change, night scene, camera movement, glowing UI, text, Hebrew, letters, numbers, captions, logos or watermarks. This still should show the result of an explicit destination check, not arrival certified by proximity alone.

=== T01 — הנפשה: מתכנון לקביעת כיוון ===
פריים התחלה: state-1-plan.png
פריים סיום: state-2-start.png
תוצר: transition-1-2.mp4

Animate from the supplied first planning frame to the supplied last departure-direction frame in one continuous four-second educational shot. Treat both frames as exact visual anchors. Keep the camera absolutely locked: no pan, zoom, tilt, orbit, shake or change of lens. The semi-arid terrain, central rocky hill, three-palm cluster, roads, destination junction, stone building, daylight and every shadow remain perfectly stationary. The graphics are overlays; do not morph or rebuild the ground.

For approximately the first half-second, hold the planning view so both route alternatives can be read. Over the next second, smoothly fade away only the thin dashed direct alternative. Keep the chosen solid burnt-orange lower-ground route and both checking rings fixed. Then reveal the one olive navigator marker at the departure circle, with no movement along the route.

Over the following second and a half, softly introduce the compact compass schematic beside departure. Its north-reference needle settles, then its separate direction pointer smoothly turns once to match the first leg of the chosen route. End with the small unnumbered arc visible. The pointer must align with that first leg, not point straight across the hill to the final destination. Do not show a numeric azimuth or add an extra north reference. Hold the supplied final frame cleanly for the remaining time.

Only the planning overlays and compass change. Do not move the navigator off the known starting point: this transition teaches checking position and direction before departure. Match the existing realistic limestone, dusty ground, olive vegetation and restrained warm graphics. No new terrain, additional travelers, subtitles, speech, narration, music, text, letters, numbers, logos, watermarks, glow, dramatic effects, cuts or dissolves between different landscapes. Finish precisely on the supplied end frame with no overshoot.

=== T02 — הנפשה: מהיציאה לבדיקת המיקום ===
פריים התחלה: state-2-start.png
פריים סיום: state-3-travel.png
תוצר: transition-2-3.mp4

Create one continuous four-second transition from the supplied departure-direction frame to the supplied mid-route verification frame. Use the supplied images as exact first and last frames. Lock the elevated oblique camera and all photorealistic terrain: central hill, three date palms, road network, destination junction, stone building, ground textures and shadows remain identical throughout. No camera motion, spatial mirroring or landscape transformation.

Hold the start briefly. Fade out the compass schematic without moving the departure circle. Move exactly one olive navigator marker smoothly along the already selected lower-ground route, following its existing bends. It must not take the discarded direct shortcut, teleport across slopes or duplicate itself. The completed portion of the route becomes slightly stronger burnt-orange immediately behind the marker; the remaining route stays light and continuous.

Bring the marker to a definite stop at the first planned checking ring roughly halfway through this transition. Only after the stop, gently reveal a thin outline around the existing rocky hill, then around the existing three-palm cluster, and introduce the two neutral comparison sightlines from the stationary navigator. Fade in the small paper map inset at the lower-right without covering the real landmarks. Its hill footprint, palms, route, endpoints and marker must correspond to the same scene. Reveal the matching landmark outlines in the inset one after the other. The sequence is move, stop, compare; the marker must remain stopped while the comparisons appear.

End by holding the supplied last frame. Keep this a calm demonstration of a position check, with no automatic correctness badge. No extra route, new landmarks, growing palm trees, newly built roads or houses, GPS lock, compass reappearing, narration, speech, music, labels, text, letters, numbers, logo, watermark, glowing beams, edits or cuts. Preserve the geometry and graphic alignment through the final frame.

=== T03 — הנפשה: מבדיקת המיקום לאימות היעד ===
פריים התחלה: state-3-travel.png
פריים סיום: state-4-arrive.png
תוצר: transition-3-4.mp4

Animate one continuous four-second educational transition from the supplied mid-route position-check frame to the supplied destination-verification frame. The first and last images are binding anchors. Keep the exact camera pose, 16:9 framing, photorealistic limestone terrain, hill, three palms, every road, three-way destination junction, pale-stone building, illumination and shadows unchanged. The building and junction already exist; they must not be constructed or transformed during the shot.

Begin with a brief hold of the stopped mid-route navigator. Gently fade the hill/palm comparison outlines and sightlines. Move the same single olive navigator marker along the remaining chosen route, following its bends and passing the second checking ring. Update the traveled-route stroke behind it. Preserve the small top-down map inset; update its marker consistently with the main scene, without changing the inset's geography.

Arrive at the actual planned three-way junction, inside the destination square, and stop the marker there. After stopping, first reveal a fine outline of the existing junction geometry, then a separate fine outline of the adjacent stone building. Emphasize their two corresponding shapes in the map inset in the same order. The destination is identified by these two matching signs, not by entering a broad circular neighborhood. Leave a clean final hold of approximately the last second, matching the supplied destination-verification frame exactly.

No green victory tick, celebration, expanding arrival radius, GPS acquisition, new destination, alternate building, changed roads, duplicated or teleporting marker, added obstacles, combat, camera movement, time-of-day change, text, Hebrew, letters, numbers, captions, speech, narration, music, logos, watermarks or cinematic cuts. Favor restrained sequential attention and clear physical continuity over decorative motion.

בדיקת התוצרים לפני שמוסרים לפיתוח
• בכל ארבע התמונות אותה גבעה, אותה קבוצת דקלים, אותו צומת ואותו מבנה באותם מיקומים.
• רואים את המסר גם בתצוגה צרה של כ־600 פיקסלים; אין צורך לקרוא טקסט בתוך התמונה.
• בתמונה 2 המנווט עדיין במוצא, ומחוון הכיוון מצביע לקטע הראשון במסלול שנבחר.
• בתמונה 3 המנווט עצר לבדיקה ושתי ההתאמות למפה ברורות; אם המפה המוקטנת אינה תואמת, מתקנים אותה לפני ההנפשה.
• בתמונה 4 מודגשים בנפרד הצומת והמבנה, ולא רק עיגול כללי סביב היעד.
• אין תנועת מצלמה, שינוי גיאוגרפיה או קפיצה בין פריים סיום של מעבר לתמונת המצב הבאה.
• הקטעים מסתיימים בעצירה יציבה; אפשר לקצרם בנגן האתר לאחר ההפקה.
• התוכן בכרטיסיות נשאר מקור ההסבר הנגיש. בזמן שילוב באתר יש לתמוך בתמונה סטטית למעדיפים תנועה מופחתת.

תיאורים חלופיים מוצעים לשילוב העתידי
F01: שתי חלופות מסלול בין נקודת מוצא לצומת ליד מבנה; לאורך אחת מהן מסומנות נקודות לבדיקת מיקום.
F02: המנווט בנקודת המוצא בודק במצפן את כיוון קטע הדרך הראשון.
F03: המנווט עוצר בדרך ומשווה את הגבעה וקבוצת הדקלים להופעתן במפה.
F04: המנווט מאמת את היעד באמצעות התאמת הצומת והמבנה למפה.

בדיקת הבנה קצרה, ללא הרחבת השיעור
אחרי צפייה, בקשו מהלומד לזהות מה בודקים לפני היציאה, בתנועה ובהגעה; התשובות צריכות להתאים לארבע הכרטיסיות. בדיקת שימושיות: האם ההמחשה עזרה לזהות את הפעולה בכל שלב בלי להוסיף עומס?
