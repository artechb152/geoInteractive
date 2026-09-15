# סקירת היררכיית טקסטים — שיעור 1

הרשימה הזו מרכזת **רק** טקסטים שהדרגה שלהם (כותרת ראשית / כותרת משנית / כותרת כרטיס / תת-כותרת / גוף / מטא) לא הייתה חד-משמעית — כלומר הסוכנים לא הצליחו להכריע לאיזו שכבה בהיררכיה הטקסט שייך, ולכן **לא נגעו בו**.
לכל פריט: הטקסט המלא, המיקום בקוד, איך הוא נראה היום, והאפשרויות. סמן/י **אפשרות אחת** בכל פריט (`[x]`), ואפשר להוסיף הערה חופשית בשורה.
הקובץ הזה חוזר אליי ומשמש כמקור היחיד לסבב תיקון הטקסטים — שום מחרוזת לא משתנה, רק המחלקות (הגדלים/המשקלים/הצבעים).

> **עדכון מצב (אחרי סבב העיצוב):** סבב העיצוב של שיעור 1 כבר הוחל, והקובץ עודכן למצב הקוד הנוכחי (מיקומים ומחלקות).
> פריטים שמסומנים **"שונה בסבב הזה"** כבר עוצבו מחדש בזמן הסבב — מוצג בהם "לפני → אחרי", ואם השינוי תואם בדיוק לאחת האפשרויות היא מסומנת `[x]` עם "← הוחל כבר".
> כל שאר הפריטים הושארו כמו שהם בכוונה, ומחכים לבחירה שלך.
> כל בחירה הפיכה לגמרי ומשנה רק מחלקות — אף פעם לא את הטקסט עצמו.

## מקרא הדרגות (המחלקות המדויקות)

| דרגה | תפקיד | המחלקות המדויקות |
|---|---|---|
| **T0** | כותרת סצנה | קומפוננטת `<SceneHeader>` בלבד (46px) — לא כותבים ידנית |
| **T0-intro** | משפט פתיחה מתחת לכותרת הסצנה | `text-lg sm:text-xl text-black` (20px) |
| **T1** | כותרת מקטע בתוך סצנה | `font-display text-2xl font-bold leading-tight text-black sm:text-3xl` (30px) |
| **T1-intro** | שורת הסבר אחת מתחת לכותרת מקטע | `mt-2 text-base leading-relaxed text-fg-muted` (16px אפור) |
| **T2** | כותרת כרטיס / כותרת שורה | `font-display font-bold leading-tight text-black text-lg md:text-xl` (20px שחור) |
| **T3** | תת-כותרת בתוך גוף כרטיס (תווית שדה) | `text-base font-display font-bold text-black mb-1.5 tracking-wider` (16px שחור מודגש) |
| **T4** | גוף טקסט קריא | `text-base leading-relaxed text-black` (16px שחור) |
| **T5** | מטא / תווית / ספירה / רמז | `text-sm font-display font-semibold tracking-wider text-fg-muted` (14px אפור מרווח) |
| **T6** | כיתוב זעיר מתחת לאלמנט | `text-sm text-fg-muted leading-snug` (14px אפור) |
| **כהה-כותרת** | על הפאנל הירוק הכהה | `font-display text-3xl font-extrabold leading-tight text-paper-bright md:text-4xl` |
| **כהה-משנה / כהה-גוף / כהה-תווית** | על הפאנל הכהה | `text-base text-paper-bright/70 md:text-lg` · `text-base leading-relaxed text-paper-bright/90` · `text-sm font-display font-bold tracking-wide text-ember` |
| **כפתור** | תווית של כפתור | `font-display font-bold` דרך `<Button>` / `.btn-*` |

> אין דרגה רביעית של "תווית זעירה" מתחת ל-T3 — כל טקסט של 10–12px מחוץ לצ'יפ הוא חריגה בהגדרה.

> **הכרעה שהתקבלה בסבב:** בהגדרת T5 בוטל `tracking-wider` (כלומר T5 = `text-sm font-display font-semibold text-fg-muted`). אלמנטים שעוצבו בסבב עם `tracking-wider` נשארו כך — ההבדל זניח. ראו 2.4.

---

## 1. פתיחה (סצנת הקאבר)

#### 1.1 "המלחמה המודרנית לא מוכרעת ביחס כוחות — היא מוכרעת ב-5 ממדים, 3 רמות פיקוד, ובתלות במימד הזמן והמרחב. בשיעור הזה תבין איך המרחב הופך לשחקן הראשי, ולמה רחפן של 300 דולר מפיל מטוס של 80 מיליון."
- מיקום: `src/components/lessons/topic-01/HookScene.tsx:20` (מעוצב ב-`lesson/HookSceneLayout.tsx:109`)
- היום: `mx-auto max-w-md text-sm leading-relaxed text-olive-soft text-pretty sm:text-base` → 16px, ירוק-זית בהיר
- [ ] T0-intro (20px שחור) — כמו משפט הפתיחה בסצנת "לפני שמתחילים"
- [ ] T4 (16px שחור)
- [ ] להשאיר כפי שהוא — חריג מאושר של הקאבר
- **המלצה:** T0-intro. שימי לב: הקובץ משותף לקאברים של שיעורים 1–3, ולכן הבחירה תשנה את שלושתם.

---

## 2. לפני שמתחילים (אונבורדינג)

> הערה לכל הסעיף: בסבב הזה בוטל הכיווץ הכללי של הסצנה (`SCENE_SCALE` 0.86 → 1 ב-`onboarding-edit-mode.tsx`). לכן כל הטקסטים בסעיף מוצגים עכשיו בגודל המחלקה המלא (קודם ~86% ממנו), גם כשהמחלקות עצמן לא השתנו.

#### 2.1 "עכשיו אתם מוכנים"
- מיקום: `src/components/lesson/ReadyCallout.tsx:24` (קומפוננטה משותפת ל-12 השיעורים)
- היום: `font-display font-bold text-xl md:text-2xl leading-tight text-balance text-black mb-3` → 24px
- [ ] T1 (30px)
- [ ] T2 (20px)
- [ ] להשאיר 24px — גודל שלישי מכוון של "קריאת סיום"
- **המלצה:** להשאיר 24px ולהכריז עליו רשמית כדרגת "קריאת סיום", כי הקובץ מאושר ומשמש את כל השיעורים.

#### 2.2 "הבנתם את ההיגיון? מעולה. כל מה שראיתם עכשיו מבוסס על אינסטינקט בריא. בצבא, לאינסטינקטים האלה יש שמות, חוקים והגדרות…"
- מיקום: `src/components/lesson/ReadyCallout.tsx:31` (הטקסט עצמו ב-`OnboardingScene.tsx:203`)
- היום: `text-base md:text-lg text-black leading-relaxed text-pretty` → 18px בדסקטופ
- [ ] T4 (16px) — זהה לגוף האקורדיון שלידו
- [ ] להשאיר 18px — גוף "קריאת סיום" מכוון
- **המלצה:** להשאיר 18px אם 2.1 נשאר 24px (שתי השורות הן זוג אחד).

#### 2.3 "הצבא הגדול בעולם נחרב — בלי קרב גדול" (וגם: "32 ק\"מ של מים שמרו על אימפריה", "ישראל ברוחבה הצר ביותר: 14 ק\"מ בלבד", "מדינה קטנה ששרדה שתי מלחמות עולם")
- מיקום: `src/components/lessons/topic-01/HistoricalCasesPanel.tsx:184` — כותרות 4 כרטיסי המקרה על הפאנל הכהה
- היום: `font-display text-base font-bold leading-snug text-paper-bright` → 16px
- [ ] T2 בגרסה כהה — כלומר להשאיר 16px ולהגדיר את זה כשורת "כותרת כרטיס כהה" בספר הכללים
- [ ] כהה-גוף (16px /90)
- **המלצה:** T2-כהה, בלי לשנות כלום בפועל — 20px לא ייכנס לרשת של 4 כרטיסים ליד ספרה של 46px.

#### 2.4 "נפוליאון פולש לרוסיה · 1812" (וגם "בריטניה · 200 שנה", "אזור השרון · ישראל", "שוויץ · 1914 ו-1939")
- מיקום: `HistoricalCasesPanel.tsx:198`
- היום: `mt-2 text-sm font-display font-semibold` (כתום כשפעיל / `paper-bright/50` כשלא)
- **שונה בסבב הזה:** השורה עצמה (198) לא השתנתה. התאום שלה בפאנל הפרטים (שורה 267) היה `mt-1.5 font-display text-base font-semibold text-fg-muted` (16px) → עכשיו `mt-1.5 text-sm font-display font-semibold tracking-wider text-fg-muted` (14px). בנוסף התקבלה הכרעה ש-`tracking-wider` יורד מהגדרת T5 בספר הכללים. אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T5 — להוסיף `tracking-wider` לשורה (וגם לתאום שלה בשורה 267)
- [x] להוריד את `tracking-wider` מהגדרת T5 בספר הכללים, כי השורה הזו היא המקור שלה ← הוחל כבר
- **המלצה:** להוריד את `tracking-wider` מהגדרת T5 — השורה הזו היא ההפניה המאושרת, עדיף שהכלל יתיישר אליה ולא להפך.

#### 2.5 "כוח אדיר, אך המרחק והחורף הכריעו." (וגם "תעלה צרה שקבעה את גורלה של אימפריה.", "רוחב קריטי — כל ק\"מ נחשב.", "נייטרלית, הררית ומוגנת — וזה הספיק.")
- מיקום: `HistoricalCasesPanel.tsx:214`
- היום: `mt-2 text-sm leading-relaxed text-paper-bright/60` → 14px, שקיפות 60%
- [ ] T6-כהה — להשאיר 14px ורק ליישר את השקיפות ל-/70
- [ ] כהה-גוף (16px /90)
- **המלצה:** T6-כהה עם /70 — משפט טיזר מתחת לתמונה ממוזערת, לא גוף טקסט.

#### 2.6 "הצבא הגדול בעולם נחרב — בלי קרב גדול" (אותה כותרת, אבל בפאנל הפרטים הנפתח)
- מיקום: `HistoricalCasesPanel.tsx:266`
- היום: `font-display text-2xl font-bold leading-snug text-fg md:text-3xl` → 30px
- [ ] T1 (להתאים ל-`leading-tight` ולנקודת שבירה `sm:` — שינוי זעיר בלבד)
- [ ] T2 (20px) — כי זו כותרת של כרטיס בתוך הפאנל
- **המלצה:** T1 — היא הכותרת של פאנל שלם מול כותרת פס של 36px.

---

## 3. רמות מלחמה

#### 3.1 "אסטרטגית" / "אופרטיבית" / "טקטית" (כותרות העמודות בטבלה הסטטית)
- מיקום: `src/components/lessons/topic-01/LevelsScene.tsx:373`
- היום: `font-display font-bold leading-tight text-black text-lg md:text-xl` → 20px, משקל 700
- **שונה בסבב הזה:** היה `font-display text-lg sm:text-xl font-extrabold leading-tight text-fg` (20px, משקל 800) → עכשיו `font-display font-bold leading-tight text-black text-lg md:text-xl` (20px, משקל 700). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T2 (20px, משקל 700) — כל עמודה נקראת ככרטיס ← הוחל כבר
- [ ] T3 (16px מודגש) — הטבלה נקראת כמשטח אחד עם תוויות עמודה
- **המלצה:** T2 — הגודל כבר נכון, רק המשקל יורד מ-800 ל-700.

#### 3.2 "המבט הרחב: מטרות המלחמה והמשאבים להשגתן." (וגם "התיאום האזורי: סנכרון כוחות, ציוד ותנועה בין החזית לעורף.", "הפעולה בשטח: ההחלטה המיידית שמכריעה את הרגע.")
- מיקום: `LevelsScene.tsx:394`
- היום: `px-4 pb-4 text-sm text-fg-muted leading-snug text-pretty` → 14px אפור
- **שונה בסבב הזה:** היה `px-4 pb-4 text-xs sm:text-sm text-fg-muted leading-relaxed text-pretty` (12px במובייל / 14px מ-sm) → עכשיו `px-4 pb-4 text-sm text-fg-muted leading-snug text-pretty` (14px בכל הרזולוציות). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T6 (14px אפור) — כיתוב מתחת לתמונה ← הוחל כבר
- [ ] T1-intro (16px אפור) — שורת הסבר מתחת לכותרת
- [ ] T5 (14px מודגש מרווח)
- **המלצה:** T6. **חשוב:** התיקון בקוד מושהה עד שתסמן/י — אין החלה חלקית.

#### 3.3 "אירועים למיון · {מספר}" (ובמצב השני: "✓ כל המשפטים סווגו")
- מיקום: `LevelsScene.tsx:456` — הכותרת היחידה של כרטיס מאגר המשפטים
- היום: `text-sm font-display font-semibold text-fg tracking-wider` → 14px
- [ ] T2 (20px שחור) — זו כותרת הכרטיס
- [ ] T5 (14px אפור) — זו ספירה חיה
- **המלצה:** T5 (רק להחליף `text-fg` ל-`text-fg-muted`) — הספירה החיה מושכת אותה לשכבת המטא.

#### 3.4 "גרור משפט לאחת מ־3 הקטגוריות למטה"
- מיקום: `LevelsScene.tsx:462`
- היום: `text-sm text-fg-muted` → 14px אפור רגיל
- **שונה בסבב הזה:** היה `text-xs text-fg-muted` (12px) → עכשיו `text-sm text-fg-muted` (14px; זהה ל-T6 פרט ל-`leading-snug`, שלא משנה בשורה אחת). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T5 (14px מודגש מרווח)
- [x] T6 (14px רגיל) ← הוחל כבר
- **המלצה:** T6. בכל מקרה הגודל עולה ל-14px — 12px אסור מחוץ לצ'יפ.

#### 3.5 "לחץ \"בדוק תשובות\" כדי לראות תוצאות, או גרור משפט בחזרה לכאן כדי לסווג מחדש."
- מיקום: `LevelsScene.tsx:469` — מצב ריק של המאגר
- היום: `text-center py-3 text-sm text-fg-muted`
- [ ] T4 (16px שחור) — משפט הוראה מלא
- [ ] T6 (14px אפור) — טקסט של מצב ריק
- **המלצה:** T6.

#### 3.6 "מפקד פלוגה מאתר עמדת מקלע אויב על שלוחה" (וכל 6 משפטי התרחישים, בגרסה הדחוסה בתוך אזור השחרור)
- מיקום: `LevelsScene.tsx:650`
- היום: `text-xs leading-snug` בענף הדחוס (12px) / `text-base leading-relaxed text-black` במאגר (16px)
- **שונה בסבב הזה:** רק הענף של המאגר השתנה — היה `leading-snug text-sm` (14px) → עכשיו `text-base leading-relaxed text-black` (16px, T4). הענף הדחוס שהפריט הזה עוסק בו לא השתנה (`text-xs leading-snug`, 12px). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T4 (16px) — אותו משפט קריא כמו במאגר
- [ ] T6 (14px) — קופסת השחרור ברוחב 220px מעל המפה
- **המלצה:** T6 — 16px יכפיל את גובה כל קופסה מעל האיור.

---

## 4. MDO

#### 4.1 "ראשי תיבות של Multi-Domain Operations (מבצעים רב-ממדיים). במקום שחיל האוויר יילחם לבד והשריון לבד – הכל קורה ביחד…"
- מיקום: `src/components/lessons/topic-01/MDOScene.tsx:84`
- היום: `mt-2 text-base leading-relaxed text-fg-muted` → 16px אפור
- **שונה בסבב הזה:** היה `text-sm leading-relaxed text-fg-muted sm:text-base` (14px במובייל / 16px מ-sm) → עכשיו `mt-2 text-base leading-relaxed text-fg-muted` (16px אפור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T4 (16px שחור) — פסקה של 4 משפטים שהיא כל גוף הכרטיס
- [x] T1-intro (16px אפור) — יושבת ישירות מתחת לכותרת מקטע ← הוחל כבר
- **המלצה:** T4 (הגודל לא משתנה, רק הצבע נעשה שחור).

#### 4.2 "מה כובה — ומה זה אומר"
- מיקום: `MDOScene.tsx:115` — כותרת כרטיס המצב
- היום: `text-sm font-display font-semibold tracking-wider text-fg-muted` → 14px אפור (בלי אייקון)
- **שונה בסבב הזה:** היה `flex items-center gap-2 text-sm font-display font-semibold text-status-warn tracking-wider` (14px צהוב, עם אייקון) → עכשיו `text-sm font-display font-semibold tracking-wider text-fg-muted` (14px אפור, האייקון הוסר). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T2 (20px שחור)
- [x] T5 (14px אפור) ← הוחל כבר
- **המלצה:** T2. הצהוב יורד בכל מקרה (צבע אסור), וגם 4.3 חייב לקבל את אותה תשובה.

#### 4.3 "המצב האידיאלי ·\"בועה\" סביב האויב"
- מיקום: `MDOScene.tsx:147` — הכותרת המקבילה בכרטיס המצב השני
- היום: `text-sm font-display font-semibold text-accent mb-1 tracking-wider` → 14px כתום
- [ ] T2 (20px שחור)
- [ ] T5 עם הדגשה כתומה (בדיוק כמו היום — כלומר אין שינוי)
- **המלצה:** זהה ל-4.2. שתי הכותרות האלה חייבות לנחות על אותה דרגה.

#### 4.4 "2022 ואילך" / "2023–2024" / "2024" (התאריך מעל כותרת כל כרטיס דוגמה)
- מיקום: `MDOScene.tsx:541`
- היום: `text-sm font-display font-semibold tracking-wider text-fg-muted` → 14px אפור, בשלושת הכרטיסים
- **שונה בסבב הזה:** היה `text-sm font-display font-semibold tracking-wider text-accent` (14px כתום) → עכשיו `text-sm font-display font-semibold tracking-wider text-fg-muted` (14px אפור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T5 אפור — כי כתום בשלושה כרטיסים זהים אינו "הדגשה אחת מרכזית" ← הוחל כבר
- [ ] T5 כתום (כמו היום) — מותר "תווית מפתח אחת לכרטיס"
- **המלצה:** T5 אפור — שלושה כרטיסים זהים לא יוצרים מוקד.

#### 4.5 "כמה ממדים פעילים"
- מיקום: `MDOScene.tsx:602`
- היום: `text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider` → כבר T5 מדויק
- [ ] T5 (בלי שינוי)
- [ ] T2 (20px שחור) — זו הכותרת היחידה של הכרטיס
- **המלצה:** T5 — היא "כותרת מקדימה" מעל ספרה של 48px.

#### 4.6 "כוח מלא — שליטה מוחלטת" / "הצבא משותק לחלוטין" / "שליטה חלקית — {N} מתוך 5 ממדים פעילים"
- מיקום: `MDOScene.tsx:612` (המחלקות בשורה 606)
- היום: `text-sm font-display font-semibold tracking-wider` + כתום במצב "כוח מלא" / `text-fg-muted` בשני המצבים האחרים
- **שונה בסבב הזה:** היה `text-sm font-medium` + כתום/אדום/צהוב לפי מצב (14px, עם אייקון וי במצב מלא) → עכשיו `text-sm font-display font-semibold tracking-wider` + כתום/אפור/אפור (14px, אייקון הוסר). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T5 (14px מודגש מרווח, אפור) ← הוחל כבר (במצב "כוח מלא" נשאר כתום)
- [ ] T6 (14px רגיל אפור)
- **המלצה:** T5. האדום והצהוב יורדים בכל מקרה.

---

## 5. לחימה אסימטרית

#### 5.1 "המסקנה: זורקים את ספר החוקים הישן לפח"
- מיקום: `src/components/lessons/topic-01/AsymmetricScene.tsx:393`
- היום: `font-display font-bold text-xl md:text-2xl leading-tight text-balance text-black mb-3` → 24px משקל 700 (כ-`<h3>`)
- **שונה בסבב הזה:** היה `text-xl sm:text-2xl font-display font-extrabold text-fg mb-1.5 tracking-wide` (24px, משקל 800, `<div>`) → עכשיו `font-display font-bold text-xl md:text-2xl leading-tight text-balance text-black mb-3` (24px, משקל 700, `<h3>`). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] כמו כותרת "קריאת סיום" המאושרת (`font-display font-bold text-xl md:text-2xl leading-tight text-balance text-black mb-3`) ← הוחל כבר
- [ ] T1 (30px)
- [ ] T2 (20px)
- **המלצה:** כמו קריאת הסיום המאושרת — זו בדיוק אותה תפקיד בסוף הסצנה.

#### 5.2 "צבא סדיר" · "ארגון גרילה" · "ארגון טרור" (תוויות שלושת הטאבים עם התמונה)
- מיקום: `AsymmetricScene.tsx:538`
- היום: `font-display text-sm sm:text-base font-bold leading-tight text-pretty` → 16px
- [ ] כפתור (16px מודגש — כמו היום)
- [ ] T2 (20px) — זו הכותרת היחידה על כרטיס תמונה בגובה 96px
- **המלצה:** T2, אבל רק אם לא צפוף מדי; ברירת המחדל הבטוחה היא להשאיר.

#### 5.3 "צבא סדיר" / "ארגון גרילה" / "ארגון טרור" (הכותרת הגדולה בפאנל הפרטים מתחת לטאבים)
- מיקום: `AsymmetricScene.tsx:563-564`
- היום: `font-display text-2xl font-bold leading-tight text-black sm:text-3xl` → 30px משקל 700
- **שונה בסבב הזה:** היה `font-display text-2xl sm:text-3xl font-extrabold leading-tight text-fg` (30px, משקל 800) → עכשיו `font-display text-2xl font-bold leading-tight text-black sm:text-3xl` (30px, משקל 700). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T1 (30px משקל 700) — רק המשקל יורד ← הוחל כבר
- [ ] T2 (20px) — כי זו כותרת בתוך כרטיס
- **המלצה:** T1 — האח המאושר שלה (פאנל המקרים ההיסטוריים) באותו גודל בדיוק.

#### 5.4 "הצבא הרשמי של מדינה ריבונית. במדים, היררכי, מתקציב המדינה." (וגם שתי המקבילות)
- מיקום: `AsymmetricScene.tsx:566`
- היום: `mt-3 text-base leading-relaxed text-black text-pretty` → 16px שחור
- **שונה בסבב הזה:** היה `mt-3 text-sm sm:text-base leading-relaxed text-fg text-pretty` (14px במובייל / 16px מ-sm) → עכשיו `mt-3 text-base leading-relaxed text-black text-pretty` (16px שחור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T4 (16px שחור) ← הוחל כבר
- [ ] T1-intro (16px אפור)
- **המלצה:** T4 — האח המאושר בפאנל המקרים מציג את השורה המקבילה כגוף טקסט.

#### 5.5 "זרוע רשמית של מדינה" (וגם "פועל בתוך מדינה — שולט בטריטוריה", "רשת תאים — לא באחריות מדינה") — כיתוב על גבי תמונת הדמות
- מיקום: `AsymmetricScene.tsx:653`
- היום: `text-end text-sm font-display font-medium text-bg-elevated` → 14px לבן על הצללה כהה
- [ ] כהה-משנה (לבן, 16px)
- [ ] T5 בגרסה בהירה (14px מודגש מרווח, לבן)
- [ ] T6 בגרסה בהירה (14px רגיל, לבן)
- **המלצה:** T5-בהיר — הצבע הלבן נשאר, רק המשקל/הריווח מתיישרים. אין בספר הכללים שורה ל"כיתוב על תמונה", אז זו הכרעה שלך.

#### 5.6 "השוואה" (תא הפינה של טבלת ההשוואה)
- מיקום: `AsymmetricScene.tsx:677`
- היום: `font-display font-bold text-sm sm:text-base text-fg tracking-wide` → 16px מודגש
- [ ] T2 (20px) — חלק משורת הכותרות
- [ ] T3 (16px מודגש) — הכותרת של עמודת התוויות
- [ ] T5 (14px אפור) — תווית-על של הטבלה
- **המלצה:** T2 או T3 — לא T5, כי T5 יהפוך כותרת עמודה לאפורה. הטבלה המאושרת ברמות משאירה את התא הזה ריק, ולכן אין תקדים.

#### 5.7 "התובנה" (×2 — גם בסימולטור העמודים וגם בבלוק הזמן)
- מיקום: `AsymmetricScene.tsx:844` (`mb-1.5`) ו-`AsymmetricScene.tsx:1147` (`mb-3`)
- היום בשניהם: `text-sm font-display font-semibold text-fg-muted tracking-wider` → 14px אפור
- [ ] T3 (16px שחור מודגש) — היא תווית מעל פסקה בתוך כרטיס
- [ ] T5 (כמו היום) — היא תווית מטא
- [ ] T2 (20px) — היא הכותרת של כרטיס התובנה
- **המלצה:** T5 (להשאיר) — כרגע זו המשפחה היחידה בשיעור שכן אחידה. אם בכל זאת T3: זה חייב לכלול גם את "דיווחי שטח" (5.8) ואת "ארגונים לסיווג" (5.9) ואת שתי התוויות ב-MDO.

#### 5.8 "דיווחי שטח"
- מיקום: `AsymmetricScene.tsx:1437-1438`
- היום: `relative text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider text-center` → 14px אפור, ממורכז
- [ ] T3 (16px שחור מודגש)
- [ ] T5 (כמו היום)
- **המלצה:** זהה ל-5.7 — אותה משפחה.

#### 5.9 "ארגונים לסיווג ({מספר})"
- מיקום: `AsymmetricScene.tsx:1644`
- היום: `text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider`
- [ ] T5 (כמו היום) — בגלל הספירה החיה
- [ ] T3 (16px שחור מודגש) — כמו שאר המשפחה
- **המלצה:** T5 גם אם השאר עוברים ל-T3 — הספירה החיה מושכת למטא.

#### 5.10 "לרכז את כל הכוח למתקפה אחת גדולה שתכריע את המלחמה" (וכל 6 משפטי הבחירה בכרטיסי ההחלטה)
- מיקום: `AsymmetricScene.tsx:940`
- היום: `text-sm` בתוך כפתור הבחירה → 14px
- [ ] T4 (16px שחור) — אלה משפטים שלמים לקריאה
- [ ] כפתור (14px מודגש) — זו תווית של פקד
- **המלצה:** T4 — אבל שימי לב שגובה הכרטיס נעול על `min-h-[30rem]`, וייתכן שיידרש למדוד מחדש.

#### 5.11 "בדיוק — הזמן עצמו הוא הנשק שלכם." (וגם שתי המקבילות במשוב הירוק)
- מיקום: `AsymmetricScene.tsx:969`
- היום: `text-xs text-status-ok font-display font-semibold leading-snug` → 12px (מחוץ לכל דרגה)
- [ ] T4 בצבע ירוק (16px)
- [ ] T5 (14px מודגש)
- **המלצה:** T4 — כדי להתאים לקופסת המשוב השגוי שלידה.

#### 5.12 "הזמן עובד לטובתם. המטרה היא פשוט לשרוד את המכות." (ושתי המקבילות — שורת הסיכום מתחת לכותרת הכרטיס הפתור)
- מיקום: `AsymmetricScene.tsx:971`
- היום: `text-sm leading-relaxed text-fg-muted` → 14px אפור
- [ ] T1-intro (16px אפור) — שורת פתיחה מתחת לכותרת
- [ ] T4 (16px שחור) — אבל אז היא תיראה זהה לפסקת ההסבר שמתחתיה
- **המלצה:** T1-intro — כדי לשמר את ההבדל בין שורת הפתיחה לפסקת ההסבר.

#### 5.13 "מי באמת יכול להכריח אותך לסיים את המלחמה?"
- מיקום: `AsymmetricScene.tsx:1099`
- היום: `text-sm font-display font-semibold tracking-wider text-fg-muted` → 14px אפור
- **שונה בסבב הזה:** היה `text-xs font-display font-semibold text-fg-muted tracking-wider` (12px) → עכשיו `text-sm font-display font-semibold tracking-wider text-fg-muted` (14px). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T5 (14px אפור) ← הוחל כבר
- [ ] T3 (16px שחור מודגש) — זו הכותרת היחידה שמסבירה מה הטבלה
- **המלצה:** T5.

#### 5.14 "סדיר" / "לא-סדיר" (כותרות העמודות בטבלת החזיתות)
- מיקום: `AsymmetricScene.tsx:1103` ו-`:1106`
- היום: `text-sm font-display font-semibold tracking-wider text-fg` → 14px, צבע טקסט רגיל (לא אפור)
- **שונה בסבב הזה:** היה `text-xs font-display font-semibold tracking-wider text-fg` (12px) → עכשיו `text-sm font-display font-semibold tracking-wider text-fg` (14px). הצבע נשאר `text-fg` ולא הפך לאפור, ולכן זה לא בדיוק T5. אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T5 (14px אפור)
- [ ] T3 (16px שחור מודגש)
- **המלצה:** T5. בכל מקרה 12px עולה.

#### 5.15 "האויב בשטח" (וגם "משרד האוצר", "דעת הקהל", "הפוליטיקה הפנימית", "הבמה הבינלאומית")
- מיקום: `AsymmetricScene.tsx:1328`
- היום: `text-base font-display font-bold text-black mb-1.5 tracking-wider leading-tight` → 16px שחור מודגש
- **שונה בסבב הזה:** היה `font-display font-semibold text-sm leading-tight` (14px, בלי צבע מוגדר) → עכשיו `text-base font-display font-bold text-black mb-1.5 tracking-wider leading-tight` (16px שחור מודגש). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T3 (16px שחור מודגש) — תווית שורה בטבלה דחוסה ← הוחל כבר
- [ ] T2 (20px) — כותרת שורה
- [ ] T5 (14px אפור)
- **המלצה:** T3 — 20px ישבור טבלה של 3 עמודות עם אייקון בגודל 36px.

#### 5.16 "לוחמי גרילה או מחבלים — היריב הצבאי המוצהר." (וארבעת התיאורים המקבילים)
- מיקום: `AsymmetricScene.tsx:1329`
- היום: `text-sm text-fg-muted leading-snug mt-0.5` → 14px אפור
- **שונה בסבב הזה:** היה `text-xs text-fg-muted leading-snug mt-0.5` (12px) → עכשיו `text-sm text-fg-muted leading-snug mt-0.5` (14px). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T6 (14px אפור) ← הוחל כבר
- [ ] T4 (16px שחור)
- **המלצה:** T6 — תיאור שורה של שורה אחת מתחת לכותרת השורה.

#### 5.17 "יום 1" / "שבוע 2" / "חודש 3" / "שנה 1" / "שנה 2" (תוויות ציר הזמן)
- מיקום: `AsymmetricScene.tsx:1279` (הטקסט בשורה 1283)
- היום: `text-sm font-display font-semibold tracking-wider whitespace-nowrap` (כתום לשלב הפעיל / `text-fg-muted` לשאר) → 14px
- **שונה בסבב הזה:** היה `text-[11px] font-display font-semibold tracking-wide whitespace-nowrap` + `text-fg-dim` לשלבים לא פעילים (11px) → עכשיו `text-sm font-display font-semibold tracking-wider whitespace-nowrap` + `text-fg-muted` (14px). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T5 (14px) — **מותנה במדידה**: צריך לבדוק ב-1440px שהתוויות הקיצוניות לא חורגות מקצות הציר ← הוחל כבר
- [ ] להשאיר 11px — מקרה מיוחד של רצועת ציר
- **המלצה:** להשאיר עד שמישהו ימדוד; אם זה נכנס — T5.

#### 5.18 "לוחם לא לובש מדים, לא נוסע בשיירת רכבים מאורגנת, ולא יוצא מבסיס קבוע — הוא נראה בדיוק כמו אזרח רגיל ברחוב." (וארבעת ה"דיווחים" האחרים)
- מיקום: `AsymmetricScene.tsx:1450`
- היום: `relative max-w-2xl mx-auto text-center text-base sm:text-lg leading-relaxed text-fg text-pretty` ממורכז → 18px
- [ ] גוף "קריאת סיום" (`text-base md:text-lg text-black leading-relaxed`) — כלומר להשאיר 18px ולהחשיך
- [ ] T4 (16px שחור) — יקטין את הטקסט המרכזי של התרגיל
- **המלצה:** גוף קריאת הסיום — זו השאלה המרכזית של התרגיל, חבל להקטין.

#### 5.19 "שיבצתם את כל הדיווחים. לחצו \"בדוק תשובות\"." / "שיבצתם את כל הדיווחים. בדקו את התוצאה למטה."
- מיקום: `AsymmetricScene.tsx:1454` (התאום שלה: `:1648` — "שיבצת את כל הארגונים…")
- היום בשניהם: `text-center text-sm text-fg-muted py-4` → 14px אפור
- [ ] T6 (14px אפור, בלי שינוי מעשי)
- [ ] T4 (16px שחור)
- [ ] T5 (14px מודגש מרווח)
- **המלצה:** T6 בשניהם — אותה תשובה לשני התרגילים.

#### 5.20 "הכל מוכן — לחצו לבדיקה" (והתאום: "הכל מוכן — לחץ לבדיקה", `:1681`)
- מיקום: `AsymmetricScene.tsx:1475` ו-`:1681`
- היום בשניהם: `text-sm text-fg-muted` → 14px
- [ ] T5 (14px מודגש מרווח)
- [ ] T6 (14px רגיל)
- **המלצה:** T5 בשניהם — זו שורת סטטוס ליד הכפתורים, ובאותו אלמנט מופיע גם הניקוד.

#### 5.21 "החוק הראשון הוא לא לבלוט. אין מדים, אין שיירות ג'יפים מאורגנות ואין בסיסים מסודרים…" (הסבר מלא אחרי "בדוק תשובות"; לפני הבדיקה אותו אלמנט מציג תקציר של 3–5 מילים)
- מיקום: `AsymmetricScene.tsx:1595-1596`
- היום: `text-sm text-fg-muted leading-snug text-center` → 14px אפור בשני המצבים
- **שונה בסבב הזה:** היה `text-[11px] text-fg-muted leading-snug text-center` (11px) → עכשיו `text-sm text-fg-muted leading-snug text-center` (14px, T6 בשני המצבים). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T4 אחרי הבדיקה + T6 לפני (שתי דרגות לפי מצב)
- [x] T6 בשני המצבים ← הוחל כבר
- [ ] T4 בשני המצבים
- **המלצה:** T4 אחרי הבדיקה / T6 לפני — ההסבר הארוך הוא ההבטחה של התרגיל, לא כיתוב.

#### 5.22 "גרור לכאן" / "שחרר כאן" (הטקסט בתוך קופסת השחרור)
- מיקום: `AsymmetricScene.tsx:1891`
- היום: `text-sm font-display font-semibold text-fg`
- **שונה בסבב הזה:** היה `text-sm font-display font-semibold text-fg-dim` (14px, אפור בהיר) → עכשיו `text-sm font-display font-semibold text-fg` (14px, צבע טקסט רגיל). השינוי הזה לא תואם אף אחת מהאפשרויות. אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] להשאיר — טקסט placeholder אמור להיות `text-fg-dim`
- [ ] T5 (להוסיף `tracking-wider` ולהעביר ל-`text-fg-muted`)
- **המלצה:** להשאיר. רק אם את/ה רוצה ליישר את כל טקסטי ה-placeholder בשיעור — אז T5.

#### 5.23 "חיזבאללה ← ארגון גרילה. ארגון פוליטי-צבאי השולט בדרום לבנון… בעל שטח והיררכיה — גרילה, לא צבא של מדינה ולא רשת תאים פזורה." (שורת המשוב לכל ארגון ששובץ לא נכון)
- מיקום: `AsymmetricScene.tsx:1933`
- היום: `text-sm text-fg-muted leading-snug` → 14px אפור
- **שונה בסבב הזה:** היה `text-[11px] text-fg leading-snug` (11px) → עכשיו `text-sm text-fg-muted leading-snug` (14px אפור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T6 (14px אפור) ← הוחל כבר
- [ ] T4 (16px שחור)
- **המלצה:** T6 — 16px ישתלט על הכרטיס. ההחלטה כאן חלה גם על טקסטי המשוב הדחוסים בתרגילים האחרים.

---

## 6. סיכום

#### 6.1 "הבנת את היסודות של גיאוגרפיה צבאית"
- מיקום: `src/components/lesson/RecapBanner.tsx:65` (נקרא מ-`RecapScene.tsx:33`)
- היום: `font-display text-xl font-bold leading-tight text-balance sm:text-2xl` → 24px, בלי צבע מוגדר
- [ ] כמו כותרת "קריאת סיום" (`text-xl md:text-2xl … text-black`) — שינוי של נקודת שבירה + הוספת שחור
- [ ] T2 (20px שחור)
- [ ] T1 (30px)
- **המלצה:** כמו קריאת הסיום — זה אותו סוג "ציון דרך". בכל בחירה מתווסף `text-black` (היום הכותרת יורשת אפור-זית).

#### 6.2 "אסטרטגית · אופרטיבית · טקטית — אותה מלחמה ברזולוציה אחרת." (וכל 8 ההגדרות בכרטיסי הסיכום)
- מיקום: `RecapScene.tsx:61-62`
- היום: `text-base leading-relaxed text-black` → 16px שחור
- **שונה בסבב הזה:** היה `text-sm text-fg-muted leading-relaxed` (14px אפור) → עכשיו `text-base leading-relaxed text-black` (16px שחור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T4 (16px שחור) — זה כל התוכן של הכרטיס ← הוחל כבר
- [ ] T6 (14px אפור) — כיתוב מתחת למונח
- **המלצה:** T4 — אלה לא עזר מתחת למשהו, אלה הכרטיס עצמו. שימי לב שזה מעבה את רשת 8 הכרטיסים.

---

## 7. תדריך השיעור (עמוד ה-overview)

#### 7.1 "מבוא לגיאוגרפיה צבאית: מרחב, כוח, אסטרטגיה ורמות מלחמה"
- מיקום: `src/app/lessons/[topicId]/overview/page.tsx:82` (ה-`<h1>` בשורה 81)
- היום: `text-[clamp(1.875rem,3.8vw,2.875rem)]` משקל 800, `text-black` → 46px
- **שונה בסבב הזה:** היה `mt-4 font-display font-extrabold tracking-tight text-balance leading-[1.08] text-[clamp(1.875rem,4.2vw,3.25rem)]` (52px) → עכשיו `mt-4 font-display font-extrabold tracking-tight text-balance leading-[1.1] text-black text-[clamp(1.875rem,3.8vw,2.875rem)]` (46px שחור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T0 — להעתיק את הקלאמפ של `SceneHeader` (`clamp(1.875rem,3.8vw,2.875rem)`, 46px, שחור) כדי שלעמוד התדריך ולסצנות תהיה סקאלה אחת ← הוחל כבר
- [ ] להשאיר 52px — כותרת עמוד כניסה גדולה יותר במכוון
- **המלצה:** T0 — סקאלת כותרות אחת לכל השיעור.

#### 7.2 "מה יוצאים איתו" (וגם "מפת דרך", "לפני שמתחילים", "המשך המסלול")
- מיקום: `page.tsx:117`, `:137`, `:175`, `:201`
- היום: `text-sm font-display font-semibold tracking-wider text-fg-muted` → 14px אפור מרווח
- **שונה בסבב הזה:** היה `.section-eyebrow` (11px גדול-קטן, כתום-ירוק) → עכשיו `text-sm font-display font-semibold tracking-wider text-fg-muted` (14px אפור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T5 (14px אפור מרווח) ← הוחל כבר
- [ ] להשאיר `.section-eyebrow` — זו תשתית מאושרת
- **המלצה:** T5. הערה: אלה הכותרות-המקדימות היחידות בשיעור — אף סצנה לא מציגה כאלה. מחיקה שלהן היא שינוי טקסט ולכן לא באה בחשבון.

#### 7.3 "פתיחה" · "לפני שמתחילים" · "רמות מלחמה" · "MDO" · "לחימה אסימטרית" · "סיכום" (שמות הסצנות ברשימת "מבנה השיעור")
- מיקום: `page.tsx:157-158`
- היום: `font-display text-sm font-bold leading-tight text-black` → 14px משקל 700 שחור
- **שונה בסבב הזה:** היה `font-display text-sm font-extrabold text-fg` (14px, משקל 800) → עכשיו `font-display text-sm font-bold leading-tight text-black` (14px, משקל 700, שחור). זה לא בדיוק T2 ולא בדיוק T5 (קרוב להמלצה "T5 עם שחור", אבל מודגש ולא semibold ובלי ריווח). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T2 (20px שחור) — זו הכותרת של השורה
- [ ] T5 (14px אפור) — שורה קומפקטית בתוך כרטיס
- **המלצה:** T5 אבל עם `text-black` במקום אפור, כדי שרשימת מבנה השיעור לא תיראה משנית.

#### 7.4 "דרישות קדם"
- מיקום: `page.tsx:176`
- היום: `mt-1 font-display text-xl font-bold leading-tight tracking-tight` → 20px (גודל כותרת רביעי בעמוד)
- **שונה בסבב הזה:** היה `mt-1 font-display text-xl font-bold tracking-tight` (20px) → עכשיו `mt-1 font-display text-xl font-bold leading-tight tracking-tight` (20px — נוסף רק `leading-tight`, הדרגה לא השתנתה). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T1 (30px) — כמו שלוש האחיות שלה באותו עמוד
- [ ] T2 (20px) — כותרת כרטיס בעמודה הצדדית
- **המלצה:** T1 — היא מסמנת בלוק, לא כרטיס.

#### 7.5 "שיעור {NN} · {שם השיעור הקודם}" (לא מוצג בשיעור 1 — אין שיעור קודם)
- מיקום: `page.tsx:185-186`
- היום: `truncate font-display text-sm font-bold leading-tight text-black` → 14px שחור
- **שונה בסבב הזה:** היה `truncate font-display text-sm font-bold text-fg` (14px) → עכשיו `truncate font-display text-sm font-bold leading-tight text-black` (14px, שחור + `leading-tight`; הדרגה לא השתנתה). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T2 (20px) — זו הכותרת הראשית של כרטיס לחיץ
- [ ] T5 (14px אפור)
- **המלצה:** T5 — 20px יחתוך את שם השיעור בשורה צרה. חייב לקבל את אותה תשובה כמו 7.3.

#### 7.6 "זהו שיעור הפתיחה…" (הטקסט שכן מוצג בשיעור 1 בבלוק "דרישות קדם")
- מיקום: `page.tsx:191-192`
- היום: `mt-3 text-base leading-relaxed text-black` → 16px שחור
- **שונה בסבב הזה:** היה `mt-3 text-sm text-fg-muted` (14px אפור) → עכשיו `mt-3 text-base leading-relaxed text-black` (16px שחור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T6 (14px אפור) — כמעט בלי שינוי
- [x] T4 (16px שחור) ← הוחל כבר
- **המלצה:** T6 — הערת גיבוי של שורה אחת בעמודה צרה.

#### 7.7 "קרטוגרפיה" (ותאומו בכרטיס "השיעור הקודם")
- מיקום: `page.tsx:234` ו-`:219`
- היום בשניהם: `truncate font-display text-sm font-bold leading-tight text-black` → 14px מודגש שחור (שתי השורות זהות)
- **שונה בסבב הזה:** היה `truncate font-display text-sm font-semibold text-fg md:text-[15px]` (14–15px) → עכשיו `truncate font-display text-sm font-bold leading-tight text-black` (14px, מודגש, שחור). לא תואם בדיוק לא T2 ולא T5. אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] T2 (20px)
- [ ] T5 (14px)
- **המלצה:** T5 — ושתי השורות חייבות להיות זהות בדיוק זו לזו.

#### 7.8 "35 דק'" (וגם "יסוד", "כרטיסי מושג", "6 סצנות" — ערכי תא בפס הנתונים)
- מיקום: `src/components/lesson/LessonStatsBar.tsx:29`
- היום: `mt-0.5 truncate font-display text-base font-bold text-black` → 16px משקל 700 שחור
- **שונה בסבב הזה:** היה `mt-0.5 truncate font-display text-sm font-extrabold text-fg` (14px, משקל 800) → עכשיו `mt-0.5 truncate font-display text-base font-bold text-black` (16px, משקל 700; זהה לדרגת המספרים פרט ל-`tabular-nums`). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] דרגת מספרים (`font-display text-base font-bold tabular-nums text-black`) ← הוחל כבר
- [ ] T4 (16px שחור)
- **המלצה:** דרגת המספרים — היא עובדת טוב גם לשני הערכים המילוליים.

---

## 8. מעטפת השיעור (shell, טאבים ותפריט הצד)

#### 8.1 "שיעור 1" (השורה העליונה במגירת התוכן בדסקטופ)
- מיקום: `src/components/lesson/PagedLearn.tsx:294`
- היום: `text-sm font-display font-semibold tracking-wider text-fg-muted mb-2` → 14px אפור מרווח
- **שונה בסבב הזה:** היה `font-display font-bold text-accent text-xl mb-2` (20px כתום) → עכשיו `text-sm font-display font-semibold tracking-wider text-fg-muted mb-2` (14px אפור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T5 (14px אפור מרווח) — ואז שם השיעור מתחתיו הוא הכותרת ← הוחל כבר
- [ ] דרגת מספרים
- [ ] T2 (20px שחור)
- **המלצה:** T5 — זו כותרת מקדימה, לא תוכן.

#### 8.2 "שיעור 1" (המראה המקביל במובייל/טאבלט)
- מיקום: `PagedLearn.tsx:375`
- היום: `text-sm font-display font-semibold tracking-wider text-fg-muted mb-0.5` → 14px
- **שונה בסבב הזה:** היה `text-[10px] font-display font-semibold text-accent tracking-[0.2em] uppercase mb-0.5` (10px כתום) → עכשיו `text-sm font-display font-semibold tracking-wider text-fg-muted mb-0.5` (14px אפור, זהה ל-8.1). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] זהה בדיוק למה שנבחר ב-8.1 ← הוחל כבר
- **המלצה:** לאכוף זהות בין שתי רזולוציות — היום הן חלוקות על עצם הגדרת הטקסט.

#### 8.3 "מרחב, כוח, אסטרטגיה" (שם השיעור במגירת התוכן)
- מיקום: `PagedLearn.tsx:297`
- היום: `font-display font-bold text-lg text-fg leading-tight text-balance` בתוך `<div>` רגיל — ובמובייל אותו טקסט הוא `<h1>` (שורה 377), כלומר **בדסקטופ אין לעמוד h1 בכלל**
- [ ] להשאיר `<div>` (שאלת נגישות לפעם אחרת)
- [ ] להפוך ל-`<h1>` גם בדסקטופ (שינוי מבנה מסמך, לא רק עיצוב)
- **המלצה:** להשאיר בסבב הזה ולפתוח משימת נגישות נפרדת.

#### 8.4 "תוכן השיעור" (מפריד במגירה)
- מיקום: `PagedLearn.tsx:302`
- היום: `text-sm font-display font-semibold tracking-wider text-fg-muted px-2 mb-3` → 14px אפור מרווח
- **שונה בסבב הזה:** היה `text-xs font-display font-semibold text-fg-muted tracking-[0.2em] uppercase px-2 mb-3` (12px) → עכשיו `text-sm font-display font-semibold tracking-wider text-fg-muted px-2 mb-3` (14px). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T5 (14px אפור מרווח) ← הוחל כבר
- [ ] T6 (14px רגיל)
- **המלצה:** T5.

#### 8.5 "פתיחה" / "לפני שמתחילים" / "רמות מלחמה" / "MDO" / "לחימה אסימטרית" / "סיכום" (שורות הניווט במגירה)
- מיקום: `PagedLearn.tsx:337` (המחלקות בשורה 333)
- היום: `text-base leading-snug transition-colors text-balance` + `font-bold` לשורה הפעילה
- **שונה בסבב הזה:** היה `text-base leading-snug transition-colors truncate` + `font-semibold` בשורה הפעילה (16px) → עכשיו `text-base leading-snug transition-colors text-balance` + `font-bold` בשורה הפעילה (16px; בנוסף השורה הפעילה קיבלה מסגרת כתומה ורקע `bg-accent/10`). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] להשאיר גוף 16px ולהחליף `font-semibold` ל-`font-bold` בשורה הפעילה בלבד ← הוחל כבר
- [ ] דרגת כפתור לכל השורות (`font-display font-bold`)
- **המלצה:** הראשונה — רשימה שקטה עם שורה פעילה מודגשת.

#### 8.6 "השיעור הבא" (וגם "סיום הקורס") — התווית מעל כותרת כרטיס הניווט התחתון
- מיקום: `src/components/lesson/LessonShell.tsx:189` ו-`:207`
- היום בשניהם: `text-sm font-display font-semibold tracking-wider text-accent` → 14px כתום
- **שונה בסבב הזה:** היה `text-[11px] font-display font-semibold tracking-wider text-accent-hover … uppercase` (11px כתום; "סיום הקורס" היה `text-brand-dark` ירוק) → עכשיו `text-sm font-display font-semibold tracking-wider text-accent` בשניהם (14px כתום). התווית המקבילה "השיעור הקודם" (שורה 167) עברה ל-T5 אפור. אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T5 בכתום — תווית ההדגשה היחידה בכרטיס ← הוחל כבר
- [ ] T5 אפור (`text-fg-muted`) — כי הכרטיס כבר יקבל מסגרת ורקע כתומים
- **המלצה:** כתום — כדי לשמור על ההבדל בין "הקודם" ל"הבא". אם את/ה רוצה רמז כתום אחד לכרטיס — אפור.

#### 8.7 שמות השיעורים בכרטיסי הניווט התחתונים
- מיקום: `LessonShell.tsx:170`, `:192`, `:210`
- היום: `font-display font-bold leading-tight text-black text-lg md:text-xl truncate` → 20px שחור
- **שונה בסבב הזה:** היה `text-sm md:text-[15px] font-display font-semibold text-fg truncate` (14–15px) → עכשיו `font-display font-bold leading-tight text-black text-lg md:text-xl truncate` (20px שחור). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T2 (20px שחור) — מבחינה מבנית אלה כותרות כרטיס ← הוחל כבר
- [ ] T5 (14px) — זו רצועת chrome בתחתית העמוד
- **המלצה:** T2, ובמקביל התוויות שמעליהן (8.6) יורדות ל-T5 — כך הזוג עדיין נקרא כ-chrome.

#### 8.8 "בדקו את עצמכם." (כותרת טאב "בדיקת ידע")
- מיקום: `src/components/interactive/Quiz.tsx:64` (ה-`<h2>` בשורה 63)
- היום: `font-display text-2xl font-bold leading-tight text-black sm:text-3xl text-balance` → 30px
- **שונה בסבב הזה:** היה `font-display font-bold tracking-tight text-balance leading-tight text-[clamp(1.25rem,2.2vw,1.625rem)]` (~26px) → עכשיו `font-display text-2xl font-bold leading-tight text-black sm:text-3xl text-balance` (30px). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T1 (30px) ← הוחל כבר
- [ ] T0 (כותרת סצנה מלאה, 46px, ממורכזת)
- **המלצה:** T1 — ובאותה תשובה גם 8.9.

#### 8.9 "כרטיסי מושג מתהפכים" (כותרת טאב "תרגול")
- מיקום: `src/components/interactive/InteractionPlaceholder.tsx:93`
- היום: `font-display text-2xl font-bold leading-tight text-black sm:text-3xl text-balance` → 30px
- **שונה בסבב הזה:** היה `font-display text-2xl font-bold tracking-tight text-balance` (24px) → עכשיו `font-display text-2xl font-bold leading-tight text-black sm:text-3xl text-balance` (30px). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T1 (30px) ← הוחל כבר
- [ ] T0
- **המלצה:** T1 — שני הטאבים חייבים לקבל את אותה תשובה.

#### 8.10 "תרגול אינטראקטיבי" (הכותרת המקדימה מעל 8.9)
- מיקום: `InteractionPlaceholder.tsx:92`
- היום: `.section-eyebrow` → 11px — בעוד הכותרת המקבילה בטאב הבוחן ("בדיקת ידע") היא 14px
- [ ] T5 (14px אפור מרווח) — כדי ששני הטאבים יתלבשו אותו דבר
- [ ] להשאיר `.section-eyebrow`
- **המלצה:** T5 — שני הטאבים צריכים להיראות אותו דבר.

#### 8.11 "ענית על כל השאלות — מוכן לשלוח." / "{N}/{M} שאלות נענו"
- מיקום: `Quiz.tsx:262-265`
- היום: `text-sm text-fg-muted leading-snug` → 14px
- **שונה בסבב הזה:** היה `text-sm text-fg-muted` (14px) → עכשיו `text-sm text-fg-muted leading-snug` (14px, נוסף `leading-snug` = T6 מדויק). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [x] T6 (14px רגיל) — כי אותו אלמנט מציג גם משפט שלם וגם ספירה ← הוחל כבר
- [ ] T5 (14px מודגש מרווח)
- **המלצה:** T6 — T5 עם ריווח מוגדל מקלקל משפט שלם.

#### 8.12 האימוג'י 🎴 שלפני "כרטיסים אינטראקטיביים"
- מיקום: `InteractionPlaceholder.tsx:100-102` (קבוע המחרוזת `preview` בשורה 11)
- היום: ה-`<div>` של האימוג'י נמחק. קבוע המחרוזת `preview` לא השתנה (האימוג'י עדיין **התו הראשון** שלו), ומוצג רק החלק שאחריו
- **שונה בסבב הזה:** היה `<div className="mb-3 text-6xl opacity-80">` שמציג את האימוג'י (96px) → עכשיו האלמנט הזה לא קיים (המחרוזת עצמה לא נגעה). אם תסמנ/י אפשרות אחרת — אחזיר/אשנה בהתאם.
- [ ] להשאיר (כלל הברזל: לא נוגעים במחרוזות)
- [x] למחוק את ה-`<div>` של האימוג'י בלבד, בלי לגעת בקבוע המחרוזת ← הוחל כבר
- **המלצה:** להשאיר, אלא אם את/ה מאשר/ת במפורש.

---

## סיכום למי שמסמן

- **פריטים שכבר שונו בסבב העיצוב** (מסומנים "שונה בסבב הזה" ומציגים לפני → אחרי): 2.4 (התאום בשורה 267 + הכרעת T5) · 3.1 · 3.2 · 3.4 · 3.6 (רק ענף המאגר) · 4.1 · 4.2 · 4.4 · 4.6 · 5.1 · 5.3 · 5.4 · 5.13 · 5.14 · 5.15 · 5.16 · 5.17 · 5.21 · 5.22 · 5.23 · 6.2 · 7.1 · 7.2 · 7.3 · 7.4 · 7.5 · 7.6 · 7.7 · 7.8 · 8.1 · 8.2 · 8.4 · 8.5 · 8.6 · 8.7 · 8.8 · 8.9 · 8.11 · 8.12. כל השאר לא נגעו ומחכים לבחירה.
- **החלטות שמחייבות תשובה זהה בכמה מקומות:** 4.2+4.3 · 5.7+5.8+5.9 (+4.5+4.6) · 5.19 בשני התרגילים · 5.20 בשני התרגילים · 7.3+7.5+7.7 · 8.1+8.2 · 8.8+8.9+8.10.
- **פריטים שבהם הגודל עדיין אסור בכל מקרה** (11–12px מחוץ לצ'יפ), כך שגם "אין שינוי" אינו אפשרות: 3.6 (הענף הקומפקטי בתוך אזורי הגרירה) · 5.11. הפריטים 3.4 · 5.13 · 5.14 · 5.16 · 5.21 · 5.23 · 8.2 · 8.4 · 8.6 כבר הוגדלו ל-14px בסבב העיצוב.
- **פריטים שהסבב שינה בניגוד להמלצה שכתובה בקובץ — כדאי להתחיל מהם:** 4.1 · 4.2 · 5.21 · 7.6 · 8.12.
- **פריטים שנוגעים בקבצים משותפים לכל 12 השיעורים:** 1.1 (קאברים 1–3) · 2.1 · 2.2 · 7.x · 8.x.
