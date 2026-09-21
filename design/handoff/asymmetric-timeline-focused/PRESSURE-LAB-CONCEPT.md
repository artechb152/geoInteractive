# ניסוי בחמש החזיתות — מוקאפ רעיוני

נוצר בכלי יצירת תמונות. אין שינוי בקוד האתר. המוקאפ מציג את מצב הניסוי לאחר חשיפת חמש החזיתות, ואינו מפרט את כל שלבי הלמידה.

המלל הוא חלק מהבקרות: בכל שורה שם החזית והפירוט מהמקור. בחירת תנאי שאינו מתקיים מעדכנת מיד את תוצאת המודל. אין ניקוד, תקציב מלאכותי או הסתברות מומצאת. זו בחינת הלוגיקה במקור, לא סימולציה עובדתית של מלחמות.

בפיתוח עתידי יש לשמר את חמש תחנות הזמן מהמקור ולחשוף בכל תחנה שורת חזית עם הטקסט המקורי שלה. לאחר החשיפה ניתן לבצע ניסוי חופשי. המוקאפ מציג את הניסוי החופשי בלבד. ההסבר המקורי המלא והתובנה צריכים להישאר נגישים ולא להתחלף רק במשפטים הקצרים בתמונה.

דיוק חשוב: הכיתוב הגרפי 'לחץ מופעל' אינו מספיק מדויק למשוב 'המשך המערכה נבלם'. לחץ כלשהו אינו מחייב עצירה. בגרסת הפיתוח יש לכתוב 'תנאי ההמשך לא מתקיים' או 'משבר שמונע המשך', ולהסביר שזה תנאי הניסוי על פי המודל המקורי. אין לאפשר למוקאפ להכתיב כלל שגוי שלפיו כל לחץ קל עוצר מערכה.

בשני הצדדים השתמש באותה סמנטיקה לבקרה: הפעלה פירושה שהתנאי אינו מתקיים. הפעלת משבר בחזית הצבאית בצד הסדיר אינה מחסלת אוטומטית את הלא־סדיר; אלה תנאים עצמאיים. בצד הלא־סדיר אפשר לבדוק בנפרד את אובדן היכולת להמשיך לפעול. על כן אין להשוות מכנית את אותו מפסק לשני השחקנים.

הצעה זו טרם אושרה. CLAUDE-PROMPT.md מתאר את הגרסה הישנה ולא את ההצעה הזו.

## Generation prompt

Use case ui-mockup. Generate a high-fidelity flat front-on desktop Hebrew RTL educational website interaction mockup, 1536x1200 or similar landscape. This concept deliberately uses NO PHOTOS: it is a meaningful interactive CAUSAL MODEL built of readable Hebrew text, physical-looking minimal toggle controls, and one simple continuous indicator line. NO illustrations, no isometric objects, no stock pictures, no charts, no floating decoration. Serious adult UI matching established military geography course: warm ivory #F3E9DC background, white content surfaces, olive #38432E, near-black text, beige hairline dividers, orange #D97E2B reserved for the selected pressure switch and its resulting stop. Heebo-like Hebrew font, crisp readable body 18px, bold headings. Calm restrained typography, generous whitespace.

White top header 70px high. Right brand EXACT "גיאוגרפיה צבאית", simple compass mark. Center links "בית" "תכנית הלימודים" "תרגול חוזר". White right sidebar width190, "שיעור 1", "מרחב, כוח, אסטרטגיה", links פתיחה, לפני שמתחילים, רמות מלחמה, MDO, selected לחימה אסימטרית, סיכום, divider לימוד, תרגול, בדיקת ידע.

Main content x=45 to1260. Heading right aligned y=125 exact "למה הזמן הוא הנשק הסודי של השחקן הלא־סדיר?"
Below bold short challenge "הפעילו לחץ בחזית אחת. מה קורה להמשך המערכה?"
Below small explanatory text "מודל להמחשה: בדקו מה קורה כשאחד התנאים להמשך אינו מתקיים."

ONE main interaction area with TWO panels side by side. RIGHT panel occupies 65 percent, LEFT panel35 percent, same top and bottom bounds about y=255 to965. White surfaces and very thin borders, rounded16, no nested excessive boxes.
RIGHT panel header "הצבא הסדיר" and subtitle "חמש חזיתות שצריך להתמודד איתן".
Under header show exactly FIVE full-width text rows vertically stacked separated by hairlines. Each row contains right-aligned bold front name and two lines of explanatory body; at far LEFT one tactile accessible toggle switch with text underneath. All row content legible. A very thin olive vertical continuity rail runs beside these five switches; interrupted with small orange gap only at second row. Not electric circuit complicated wiring, just a single line carrying continuity. No crossings.
ROW1 title "האויב בשטח"; body "לוחמי גרילה או מחבלים — היריב הצבאי המוצהר."; switch olive, label "אין משבר".
ROW2 title "משרד האוצר"; body "תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים ופגיעה בעורף."; toggle orange activated, label "לחץ מופעל". Row2 has pale warm orange background only, subtle. This is the learner-chosen pressure, not a right/wrong quiz.
ROW3 title "דעת הקהל"; body "תמונות מהזירה, לוויות חיילים ותמיכה ציבורית שנשחקת מיום ליום."; olive switch, label "אין משבר".
ROW4 title "הפוליטיקה הפנימית"; body "הכנסת, הקונגרס, אופוזיציה, ועדות חקירה ושעון הבחירות."; olive switch, label "אין משבר".
ROW5 title "הבמה הבינלאומית"; body "האו״ם, בעלות ברית, האג וסנקציות — לחץ להפסקת אש."; olive switch, label "אין משבר".
At bottom of right panel a slim quiet feedback area pale warm orange with orange small pause icon, bold "המשך המערכה נבלם" and body "במודל הזה, משבר בחזית אחת מספיק — גם כשהמצב הצבאי לא השתנה."
Very small near this area "ארבע החזיתות האחרות עדיין ללא משבר".

LEFT panel header "השחקן הלא־סדיר" subtitle "במודל המקורי: חזית אחת".
Upper middle panel one simple bold text row "שרידות מול האויב בשטח", body "לשמר את היכולת להמשיך לפעול." One olive toggle labeled "היכולת נשמרת".
One long thin olive vertical continuity line from this row down to panel footer, open white space surrounding it. In middle of open area a short black paragraph, not a floating card:
"הלחץ שהפעלתם על משרד האוצר של המדינה אינו משנה את התנאי הזה במודל."
At bottom aligned exactly with right panel feedback strip, subtle pale olive strip with simple small play icon, bold "ממשיך לפעול".
No numeric health bars or invented probabilities. Both outcomes visible at same time.

Below whole interaction at y=1000 a short bold takeaway "יתרון בשטח לבדו לא סוגר את שאר החזיתות."
Then tiny ordinary note "זהו המודל המפושט מהשיעור. גם שחקנים לא־סדירים מושפעים ממשאבים ומתמיכה."
At far left bottom one quiet text button "איפוס הניסוי".
The UI must clearly communicate a learner can toggle any pressure on or off, immediately compare different consequences for two sides, and READ all original front descriptions without opening popups or flipping images.
Avoid extra labels, badges, clocks, tables, next/back buttons, background images, photographic content, heavy red/green coding. No English. Main focus is interaction + content, not visual decoration. The selected orange toggle and paired outcomes are the only accent focus.
