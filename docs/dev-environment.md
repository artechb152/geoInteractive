# סביבת בדיקה: בדיקת טיפוסים, שרת פיתוח ו־build

כמה הרצות עובדות על הריפו במקביל. כל `next dev` ו־`next build` כותבים לתיקיית build, וכשני תהליכים כותבים לאותה תיקייה השרת נשבר (500, `__webpack_modules__[moduleId] is not a function`).

**הכלל: תיקיית build אחת, תהליך אחד.** בתיקייה הראשית של הפרויקט רץ שרת משותף יחיד, `npm run dev` על פורט 3000, והוא כותב ל־`.next/`. לא מפעילים שם שרת נוסף ולא `next build`. כל בדיקה אחרת רצה ב־worktree מבודד, כמתואר בהמשך.

## בדיקת טיפוסים

```powershell
npx tsc --noEmit
```

- מריצים מהתיקייה הראשית. הבדיקה לא נוגעת בשרת או ב־`.next/`, וכותבת רק את `tsconfig.tsbuildinfo` (ב־`.gitignore`).
- היא בודקת את `src/`, את `tailwind.config.ts`, את `next-env.d.ts` ואת טיפוסי הנתיבים שנוצרו תחת `.next*/types`. גם `next build` מריץ אותה בדיקה.
- `qa-output/` מוחרגת ב־`tsconfig.json`. זו תיקיית תוצרי QA וקבצי ניסוי, היא ב־`.gitignore` ואף קובץ יישום לא מייבא ממנה. ההחרגה רק מונעת מקבצים שם להיאסף לבדיקה; קובץ שמיובא מ־`src` נבדק תמיד, גם אם הוא יושב בתיקייה מוחרגת.
- קובץ ניסוי `.ts` שומרים ב־`qa-output/` או בתיקיית ה־scratchpad של ההרצה, לא בשורש הריפו או ב־`src/`.
- התוצאה הצפויה: 0 שגיאות. כל שגיאה היא שגיאת יישום אמיתית.

## בדיקה מבודדת: שרת נוסף או build

הדרך היחידה: worktree בשם `qa-<שם>` תחת `.claude\worktrees\`. ל־worktree יש `.next/` משלו, ולכן אין צורך ב־`NEXT_DIST_DIR` ואין שינוי בקבצים משותפים.

את ה־worktree מקימים ומסירים רק עם הסקריפט [`scripts/qa-worktree.ps1`](../scripts/qa-worktree.ps1), ב־PowerShell, מהתיקייה הראשית. הסקריפט עובד עם נתיבים מוחלטים ומאומתים. אין להרכיב את הפקודות שלו ידנית.

השם הוא שם תיקייה אחד: מתחיל ב־`qa-`, ומכיל רק אותיות לטיניות, ספרות, רווח, `.`, `_` ו־`-`. נתיב, `..` או `\` נדחים.

**הקמה:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\qa-worktree.ps1 -Action New -Name qa-<שם>
$wt = (Resolve-Path -LiteralPath '.claude\worktrees\qa-<שם>').Path
```

הסקריפט מריץ `git worktree add --no-checkout --detach` ומוציא רק את `src`, `content` וקובצי ההגדרה. אחר כך הוא יוצר את שני ה־junctions, `node_modules` ו־`public`, אל התיקיות המשותפות ובודק את שניהם. `--no-checkout` חוסך את `design/` ושאר התיקיות הכבדות, שה־build לא צריך. אחרי ההקמה מעתיקים לתוך `$wt` את הקבצים שלך, באותם נתיבים יחסיים.

**שרת פיתוח.** קודם בודקים שהפורט פנוי (פלט ריק), ואז מפעילים:

```powershell
netstat -ano | findstr LISTENING | findstr ":3061 "
Push-Location -LiteralPath $wt; npx next dev -p 3061
```

**build:**

```powershell
Push-Location -LiteralPath $wt; npx next build; Pop-Location
```

ה־build כותב ל־`$wt\.next\` ומייצא את האתר הסטטי ל־`$wt\out\`.

**ניקוי.** שני שלבים, בסדר הזה:

1. **עוצרים רק את התהליכים שלך.** את השרת עוצרים עם Ctrl+C בטרמינל שבו הוא רץ. תהליך שנשאר מאתרים לפי הפורט (`netstat`, למטה) או לפי שורת הפקודה:

   ```powershell
   Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*qa-<שם>*' } | Select-Object ProcessId, Name, CommandLine
   ```

   עוצרים רק PID שאתה הפעלת, עם `Stop-Process -Id <PID>`. שרת של הרצה אחרת לא עוצרים בלי תיאום.

2. **מסירים עם הסקריפט ובודקים את קוד היציאה:**

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\qa-worktree.ps1 -Action Remove -Name qa-<שם>
   if ($LASTEXITCODE -ne 0) { Write-Host 'הניקוי נעצר. לא ממשיכים ידנית.' }
   ```

הסקריפט עובר את השלבים האלה, ונעצר עם קוד יציאה 1 בכל שגיאה או מצב לא צפוי, לפני השלב הבא:

1. `RepoRoot` הוא המאגר הראשי: `.git` היא תיקייה, ו־`git rev-parse --show-toplevel` מחזיר אותו נתיב. עותק worktree נדחה.
2. נתיב ה־worktree נמצא ישירות תחת `.claude\worktrees\`, ואינו המאגר הראשי או אחת התיקיות המשותפות. `.claude` ו־`.claude\worktrees` אינם קישורים. ה־worktree רשום ב־`git worktree list` כעותק מקושר, ויש בו קובץ `.git`.
3. אף תהליך לא מזכיר את נתיב ה־worktree בשורת הפקודה. הסקריפט אף פעם לא עוצר תהליכים: הוא רק מציג את ה־PID ונעצר. זו רשת ביטחון, לא תחליף לשלב 1. שרת שהופעל עם `Push-Location` לא תמיד כולל את הנתיב בשורת הפקודה.
4. כל קישור, `node_modules` ואחריו `public`, נבדק: הוא ישירות בתוך ה־worktree, הוא junction ולא תיקייה רגילה, והוא מצביע בדיוק לתיקייה המשותפת המתאימה במאגר הראשי. קישור שכבר הוסר מדווח כ־„already absent”.
5. הקישור מוסר עם `[IO.Directory]::Delete(<קישור>, $false)`, מחיקה לא רקורסיבית. היא מסירה את ה־junction עצמו בלבד. על תיקייה רגילה עם תוכן היא נכשלת ואינה מוחקת דבר. אחרי ההסרה הסקריפט מוודא שהקישור איננו ושהיעד עדיין קיים.
6. בכל עץ ה־worktree לא נשאר אף reparse point (junction או symlink). הסריקה לא נכנסת לתוך קישורים.
7. רק אז רץ `git worktree remove --force`. אחריו הסקריפט מוודא שהתיקייה נעלמה, שהרישום הוסר ושהתיקיות המשותפות קיימות.

**כשהניקוי נעצר** (`[STOPPED]` וקוד יציאה 1): ה־worktree נשאר כמו שהיה ברגע העצירה. מתקנים את הסיבה ומריצים שוב את אותה פקודה. הרצה חוזרת בטוחה, וממשיכה מהמקום שבו נעצרה.

| הודעה | מה עושים |
|---|---|
| `Processes still name this worktree: PID …` | עוצרים את התהליכים שלך. תהליך של הרצה אחרת: מתאמים. |
| `… is a real folder or file, not a link` | תיקייה אמיתית במקום קישור. בודקים ידנית מה יש בה ומאיפה הגיעה. לא מוחקים לפני שמבינים. |
| `… points at '…', not at the expected '…'` | הקישור מצביע למקום אחר. לא נוגעים ביעד שלו. בודקים מי יצר אותו. |
| `Links still inside the worktree: …` | יש קישור נוסף בתוך העץ. בודקים כל אחד. מסירים רק את הקישור עצמו, `[IO.Directory]::Delete('<נתיב מלא>', $false)`, ואז מריצים שוב. |
| `Exception calling "Delete" … denied` / קובץ נעול | משהו מחזיק את הקישור או את הקבצים: תהליך, סייר הקבצים, או מאפיין קריאה בלבד. משחררים ומריצים שוב. |

**אסור**, גם כשהסקריפט נעצר:

- להשלים ידנית עם `git worktree remove` (בייחוד `--force`) כשיש עדיין קישור בתוך ה־worktree.
- `Remove-Item` (עם או בלי `-Recurse`), `rm -rf`, `rmdir /s` או מחיקה בסייר הקבצים על worktree שיש בו junction. אלה עלולים למחוק את התוכן של `node_modules/` ו־`public/` המשותפים.
- להעביר נתיב למחיקה ל־shell אחר (`cmd /c rmdir`, Git Bash), או להרכיב פקודת מחיקה כמחרוזת.
- נתיב יחסי או נתיב עם `/` בפקודות מחיקה.

**worktrees שהוקמו במתכון הקודם** (למשל `qa-navsim`) בנויים כמו מה שהסקריפט יוצר: שני junctions אל `node_modules` ו־`public` של התיקייה הראשית. לכן אפשר להסיר אותם באותה פקודה, אחרי שבעליהם עצרו את התהליכים שלהם. worktree ששמו לא מתחיל ב־`qa-` אינו סביבת QA, והסקריפט לא יסיר אותו.

**בדיקת הסקריפט.** [`scripts/qa-worktree.test.ps1`](../scripts/qa-worktree.test.ps1) רץ רק על נתוני דמה שהוא יוצר בתיקייה זמנית. הוא מסרב לרוץ בתוך המאגר.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\qa-worktree.test.ps1
```

הבדיקה בונה מאגר git דמה שבנתיב שלו יש רווחים. יש בו `node_modules` ו־`public` דמה, ותיקייה חיצונית עם קובצי סימון. היא מריצה את הסקריפט כתהליך נפרד, ובודקת:

- דחיית שמות ונתיבים לא חוקיים;
- הקמה והסרה רגילות, כש־`RepoRoot` ניתן עם `/`;
- כשל מכוון בהסרת קישור: junction עם מאפיין קריאה בלבד מחזיר מ־Windows שגיאת "Access denied";
- תיקייה רגילה במקום קישור;
- קישור ליעד חיצוני;
- תהליך שמזכיר את הנתיב;
- קישור נוסף עמוק בתוך העץ;
- עותק worktree שניתן כ־`RepoRoot`.

אחרי כל מקרה היא משווה SHA-256 של כל קובצי הסימון. התוצאה הצפויה: `All checks passed`, קוד יציאה 0. בהרצה ב־27.10.2026 עברו כל 73 הבדיקות, ב־Windows PowerShell 5.1.

### למה כך

- **הסקריפט במקום המתכון הקודם (תקרית 27.10.2026):** המתכון הקודם הגדיר נתיב יחסי עם `/`, העביר את הסרת ה־junctions מ־PowerShell אל `cmd /c rmdir`, ומיד אחר כך הורה להריץ `git worktree remove --force`. בהרצה אחת `rmdir` פירש את הנתיב עם `/` כמתג ולא הסיר את ה־junctions. ה־worktree הוסר בכוח בזמן שהם עדיין במקום. ‏Git דילג עליהם, והתיקיות המשותפות נמצאו שלמות. פירוט ב־[`design/docs/navigation-sim-integration-2026-10-27.md`](../design/docs/navigation-sim-integration-2026-10-27.md). החלפת `/` ב־`\` לבדה לא מספיקה: במתכון לא הייתה עצירה בכשל, לא היה אימות שהקישורים הוסרו, והנתיב עבר בין shells. הסקריפט סוגר את שלושת הפערים.

- **`npx next` ולא `npm run`:** `npm run dev` ו־`npm run build` מריצים גם את `scripts/build-prototypes.mjs`, שכותב ל־`public/embeds/`. ב־worktree, `public/` הוא junction לתיקייה המשותפת.
- **לא `NEXT_DIST_DIR` בתיקייה הראשית:** עם תיקיית build לא סטנדרטית, Next משכתב את `next-env.d.ts` כך שיפנה ל־`./<dir>/types/routes.d.ts`. הוא גם מוסיף את `<dir>/types/**/*.ts` ל־`include` של `tsconfig.json` וממיין מחדש את הרשימה. שני הקבצים משותפים ומנוהלים ב־git. כך נשארה ב־`next-env.d.ts` הפניה ל־`.next-geoid13`, תיקייה שכבר נמחקה. עם `skipLibCheck` הפניה כזו לא מפילה את `tsc`, ולכן היא עוברת בשקט.
- **junction ל־`public/`:** שינויי נכסים של הרצות אחרות נראים מיד גם ב־worktree. בדיקת שגיאות קונסול ב־QA צריכה להתמקד במשאבים של הפעילות שלך.
- **מי רץ עכשיו:** `netstat -ano | findstr LISTENING` מראה פורטים ו־PID. את שורת הפקודה של כל תהליך מקבלים עם `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select ProcessId, CommandLine`. לא עוצרים שרת של הרצה אחרת בלי תיאום.

## תצלום מצב היסטורי: 27.10.2026, לפני תיקון נוהל הניקוי

**זה לא המצב הנוכחי.** הטבלה מתעדת מה נמצא ברגע אחד. פורטים, PID ושרתים משתנים כל הזמן. לפני כל החלטה בודקים מחדש עם הפקודות ב„מי רץ עכשיו” למעלה. דוגמה: בבדיקה חוזרת באותו יום, בזמן עדכון הנוהל, פורט 3000 כבר הוגש מ־PID אחר.

| פורט | PID | פקודה | מאז | תיקיית build |
|---|---|---|---|---|
| 3000 | 21684 | `npm run dev` (תיקייה ראשית) | 19.10, 12:55 | `.next/` |
| 3001 | 1808 | `npm run dev -- -p 3001` (תיקייה ראשית) | 19.10, 09:22 | `.next/` |

- שני השרתים כותבים לאותה `.next/`, בניגוד לכלל. לא נעצרו, כי הם של הרצות אחרות. ההמלצה: לתאם עצירה של :3001, או להפעיל אותו מחדש ב־worktree.
- ההסקה: לשני השרתים אין `NEXT_DIST_DIR` בשורת הפקודה. רק `.next/` מקבלת כתיבות מאז שעלו, וכל תיקיות `.next-*` לא נכתבו מאז 4–14.10.
- שאריות שלא שונו, כי הן הגדרה משותפת ונעשית עכשיו עבודה מקבילה:
  - ב־`include` של `tsconfig.json` נשארו השורות `.next-contours`, `.next-relief`, `.next-slopes` ו־`.next-t11`. שלוש הראשונות מכניסות לבדיקה טיפוסי נתיבים ישנים מ־7–14.10, שעוברים כרגע בלי שגיאות. לתיקייה `.next-t11` אין קיום.
  - התיקיות `.next-contours`, `.next-density-check`, `.next-geo`, `.next-lc`, `.next-relief`, `.next-slopes` ו־`.next-t10-build` עדיין קיימות.
  - כשאף הרצה לא משתמשת בהן, אפשר להסיר את השורות ואת התיקיות.
