# מרחב שהולך ונסגר — מוקאפ רעיוני

נוצר בכלי יצירת תמונות. לא בוצע מימוש ולא נערך קוד. הרכיב העתידי הוא סצנה רציפה עם שכבות נעות ותוויות HTML, לא שימוש במוקאפ כתמונה לחיצה.

מטרת הלמידה: זיהוי חמש חזיתות המקור והסבר כיצד לחצים מחוץ לשדה הקרב מצטברים לאורך הזמן. הפתח הוא מטפורה חזותית בלבד; אין למדוד אותו כאחוז יכולת, עוצמה או סיכוי לניצחון.

חמש תחנות המקור: יום 1 — האויב בשטח; שבוע 2 — משרד האוצר; חודש 3 — דעת הקהל; שנה 1 — הפוליטיקה הפנימית; שנה 2 — הבמה הבינלאומית. בכל תחנה שכבת לחץ אחת נכנסת והקודמות נשארות. לצד הסצנה מופיע טקסט התחנה המקורי ופירוט החזית המקורי, לא רק תווית. בחירת שכבה קודמת מציגה את מלוא המלל שלה באותו אזור. ההסבר המסכם המלא זמין בהרחבה.

פעולת ניסוי: משיכת שכבה פעילה החוצה ממחישה הסרה היפותטית של אותו לחץ בלבד. השכבות האחרות אינן נעלמות. יש לסמן מצב 'בדיקת תרחיש' ולהציע חזרה לתמונת המצב של התחנה. השינוי אינו החלטה מבצעית או פעולה שאפשר לבצע במציאות. מצב הזמן נשאר ללא שינוי בניסוי. אין לקשור בין גודל השכבה למשקל עובדתי של החזית.

המלל נשאר חי, נגיש, בגודל 16px לפחות. מקלדת וכפתורי בחירה/שחרור הם חלופה לגרירה. הפחתת תנועה מציגה מצבים ללא תנועה. הצבע הכתום מייחד את השכבה שבמיקוד בלבד. הצגת הלא־סדיר מתארת את המודל המקורי ואינה טענה שאין עליו לחצים אחרים.

תיקונים מחייבים לפני פיתוח: במוקאפ המחולל ציר הזמן מוצג הפוך; בפיתוח יום 1 מימין ושנה 2 משמאל. הניווט הצדדי המחולל אינו נאמן לניווט הקיים ואין להעתיקו. אין לשקף תמונות נוף עבור RTL. הכותרת והמלל המדויק מגיעים מהמקור. זה מוקאפ להערכת כיוון חזותי, לא מפרט פיקסלים מאושר. CLAUDE-PROMPT.md הישן אינו מתאר הצעה זו.

## Generation prompt

Create a striking yet restrained high-fidelity desktop UI mockup for a Hebrew military geography course, landscape 1536x1152. Flat front-on website screenshot. NOT a gallery, not flashcards, not switches, not quiz buttons, not a city hotspot map. The centerpiece is a premium LIVE INTERACTIVE SPATIAL VISUALIZATION: an architectural aperture progressively constricted by pressures, a metaphor the learner manipulates. It should look like an impressive real-time depth scene made with layered geometry and lighting, not photos pasted in cards. NO isometric angle. Camera looks STRAIGHT THROUGH an architectural rectangular opening at natural eye height. Calm believable limestone and muted olive materials, real physical depth and soft shadows. Existing site warm paper ivory #F3E9DC, olive #38432E, black text, orange #D97E2B only for active manipulation. Sophisticated editorial design not sci-fi, NO neon, NO glowing HUD, NO weapons action, NO game health gauges or percentages.

Header white 75px with exact brand "גיאוגרפיה צבאית" at right and simple compass, top links "בית" "תכנית הלימודים" "תרגול חוזר". Right sidebar 190px white with "שיעור 1", "מרחב, כוח, אסטרטגיה", selected "לחימה אסימטרית" among subdued course navigation. Main title at top right of content "למה הזמן הוא הנשק הסודי של השחקן הלא־סדיר?" subtitle "הזמן עובר. מרחב הפעולה משתנה."

Hero interaction is ONE unboxed panoramic visual occupying x=40 to1270 y=240 to820, blended into ivory page edges, no thick outer card. Left 70% of hero is a realistic FRONT-ON 3D rectangular aperture about 680x420. Through center opening one continuous distant rocky landscape with a very small field position and olive military vehicle, photograph-like environment, no explosions. The scenery STAYS the same while four distinct matte panels physically slide inward from four edges at different depths:
upper horizontal pale limestone slab with engraved readable "משרד האוצר";
left vertical matte olive slab with horizontal attached small label "דעת הקהל";
lower horizontal limestone slab engraved "הפוליטיקה הפנימית";
right vertical olive-gray slab with horizontal label "הבמה הבינלאומית".
These are moving semantic architectural planes, NOT image tiles, no photos on their surfaces. Five fronts total: visible landscape center has discreet small label "האויב בשטח". All labels horizontal and legible. Different layers visibly cast soft physical shadows inward, visually reducing the available view. This is a conceptual metaphor, not literal military equipment. Opening at current late stage remains about 45% visible, enough to see same landscape. One active upper slab has a thin orange edge and a small tactile orange grab handle showing direct manipulation. Subtle outward arrow beside handle shows learner can pull it away. Avoid excessive labels.

Right 30% of hero, beside aperture and fully separate from it, is a calm text column on page background, right-aligned:
small "החזית שבמיקוד"
bold "משרד האוצר"
body at readable size:
"תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים ופגיעה בעורף."
Then after generous space a short interaction challenge:
"משכו את השכבה החוצה."
Under it:
"אילו לחצים נשארים גם אחרי שהלחץ הזה הוסר?"
One subtle action link "להסבר המלא". No buttons for correct/incorrect, no switch.

Under large aperture small label "צבא סדיר · כמה לחצים פועלים יחד".
Farther below, a VERY SLIM secondary visual comparison strip at y=835: a small unobstructed rectangular opening onto the same rocky landscape on one end, olive caption "השחקן הלא־סדיר", next text "במודל המקורי: המיקוד נשאר בשרידות". This comparison is visually subordinate, not second giant illustration.

At bottom y=940 a single elegant time scrubbing line with a small orange draggable knob, five marked stop labels RTL: "יום 1", "שבוע 2", "חודש 3", "שנה 1", "שנה 2". Current final stage "שנה 2" subtly active. Small instruction "גררו את הזמן — או משכו שכבה כדי לבדוק את השפעתה".
Tiny caption "המחשה רעיונית — רוחב הפתח אינו מדד מספרי."
No invented numeric gauges, no simulated probabilities. All explanatory text remains readable and plain. Strong visual depth in hero without isometric view, background stays quiet, no unrelated decoration. Most important communicate that this is one manipulable continuous scene with moving pressure planes, not a slideshow of photos.

