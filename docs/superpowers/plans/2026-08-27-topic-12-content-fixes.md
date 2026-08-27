# Topic-12 (GIS מבצעי) Content Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four "שיעור GIS מבצעי (topic-12)" items from `project-knowledge/FIXES_2026-08-27.md`: (1) rewrite the unclear/self-contradicting "לפני שמתחילים" onboarding wording; (2) add standalone deep-explanation paragraphs for raster, orthophoto, and coordinates (today only raster has a *demo*, not a definition; orthophoto and coordinates have no explanation at all in this lesson); (3) add a purpose-clarifying paragraph before the attribute-table demo; (4) add an explicit definition of what "cost" is composed of in Least-Cost Path.

**Architecture:** All four items are pure content/copy edits inside existing scene components under `src/components/lessons/topic-12/` — no new components, no new state, no layout changes. Tasks 2 and 3 both land in `BasicsScene.tsx` and run sequentially (never in parallel per SDD rules), so there is no merge risk. Content drafts below come from a prior instructional-designer gap analysis (quoted inline per task) — treat the drafted Hebrew text as the required content, not just a suggestion, but implementers may make minor `<strong>`/emphasis adjustments to fit surrounding style as noted per task.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind, `output: 'export'` static site. RTL Hebrew throughout.

**Spec:** `project-knowledge/FIXES_2026-08-27.md` (section "שיעור GIS מבצעי (topic-12)", all 4 items)

## Global Constraints

- RTL: whole page is `dir="rtl"` — logical properties only, no `left-`/`right-` literals. (CLAUDE.md)
- Do not invent layout/structural changes; this is a wording/content-addition pass only — keep existing JSX structure, classNames, and interactivity intact. (CLAUDE.md, FIXES §"הנחיה מומלצת")
- Preserve existing Hebrew wording except where a rewrite is explicitly specified in a task below.
- Do not touch files outside `src/components/lessons/topic-12/` for these tasks.
- Every task's specific review gate (below) is a hard requirement, not optional — a task is not DONE until its named reviewer(s) approve, per the fixes file's own success criteria.
- After all 4 tasks: `npx tsc --noEmit` and `npm run build` must both pass clean (general engineering hygiene; not explicitly named per-item but implied by "נבדק תקין" across the spec and required before this branch can be considered mergeable).
- Never use `<strong>` nesting or emphasis choices that change factual meaning — reviewers should treat drafted text as authoritative content, HTML markup as implementer's judgment call within the existing visual pattern of the file.

---

### Task 1: Fix "לפני שמתחילים" onboarding wording (FIXES item 1)

**Files:**
- Modify: `src/components/lessons/topic-12/OnboardingScene.tsx`

**Problem (from gap analysis):** The intro has a typo ("מההצילום" — extra ה). Step 1's popup body claims the old map is "ציור על נייר" (paper drawing) then two sentences later says "היא רק רואה פיקסלים" (pixels) — pixels are a digital/raster concept, so the metaphor self-contradicts within one paragraph. Step 4's popup title "מהמפה ישר לחימוש" ("straight from map to weapon") overclaims — its own body's three examples (route-cost savings, bridge demolition, threat range over villages) aren't all weapons-decisions.

**Exact edits:**

1. Replace the `intro` prop (currently at line 110):
   - Old: `intro="מפה רגילה היא רק ציור. GIS הופך אותה לסביבת קבלת החלטות שמחשבת איומים, מציעה מסלולים, ומזהה נקודות תורפה. בוא נראה את ה-4 שלבים מההצילום למסקנה."`
   - New: `intro="מפה רגילה היא ציור: היא מציגה איפה עובר הכביש, אבל לא יודעת שזה כביש. GIS הופך אותה למערכת שמבינה את עצמה — מחשבת איומים, מציעה מסלולים, ומזהה נקודות תורפה. בארבעה שלבים נעבור מתצלום פשוט להחלטה מבצעית."`

2. Replace the `'photo'` step's `popupBody` (currently lines 27-28):
   - Old: `'בעבר מפה הייתה <strong>תמונה</strong>. ציור על נייר. תלכלכת אותו עם עיפרון? אבד מידע. רוצה להוסיף משהו? צריך לצייר מחדש. <strong>הבעיה:</strong> המפה לא מבינה את עצמה. היא לא יודעת שהקו האדום הוא כביש, ושהמשולש הוא הר. היא רק רואה פיקסלים.'`
   - New: `'בעבר מפה הייתה ציור — קווים וצבעים על נייר, או סריקה שלהם למחשב. גם בגרסה הדיגיטלית המפה עדיין <strong>"טיפשה"</strong>: היא לא יודעת שהקו האדום הוא כביש או שהמשולש הוא הר, היא רק מציגה צורות. <strong>הבעיה:</strong> המידע לא מחובר למשמעות שלו — כדי לשנות משהו צריך לצייר מחדש, לא לעדכן נתון.'`
   - This removes the paper/pixels contradiction by keeping the whole step anchored on "shapes without meaning," never invoking pixels (raster is introduced properly in Task 2).

3. Replace the `'decision'` step's `popupTitle` (currently line 50):
   - Old: `popupTitle: 'מהמפה ישר לחימוש',`
   - New: `popupTitle: 'מהמפה ישר להחלטה',`
   - Leave `label`, `icon`, and `popupBody` for this step unchanged — the body already lists non-weapons examples correctly.

**Review gate (required, not the generic task-reviewer):** Dispatch `hebrew-copy-editor` (tone/typo/clarity check on the 3 changed strings) AND `military-geo-editor` (confirm no factual drift in the reworded GIS claims) in parallel as the task review, per FIXES success criterion "נוסח חדש עבר עריכה ע"י hebrew-copy-editor ואישור תוכן ע"י military-geo-editor". Both must approve. Additionally, before marking complete, start the dev server and load the `#scene-onboarding` section at 1440px width (or the project's standard verification viewport) and confirm no text overlap/clipping in the 4 expandable step panels — per success criterion "נבדק חי בדפדפן שאין חפיפה/חיתוך".

- [ ] Step 1: Apply the 3 edits above to `OnboardingScene.tsx`.
- [ ] Step 2: Run `npx tsc --noEmit` — must pass clean.
- [ ] Step 3: Commit: `git commit -m "content: rewrite topic-12 onboarding wording — fix typo and self-contradicting metaphor"`

---

### Task 2: Add raster / orthophoto / coordinates deep explanations (FIXES item 2)

**Files:**
- Modify: `src/components/lessons/topic-12/BasicsScene.tsx`

**Problem (from gap analysis):** Raster has a live demo (the raster/vector compare panel) but no standalone definition paragraph. Orthophoto and coordinates have **no explanation anywhere in this lesson** — the real aerial photo asset is currently mislabeled "תצלום לוויין" (satellite photo) when the file (`assets/valley-aerial.jpg`) is an aerial image, and "coordinates" only ever appears as a passing clause, never explained.

**Exact edits (3 insertions, in file order):**

1. **Coordinates paragraph** — insert immediately after the existing layers lead-in paragraph closes (after the `</p>` that follows "מדליקים כמה שכבות יחד..." around line 99, before the `{/* Layer toggles */}` comment):

```tsx
<p className="max-w-3xl text-base text-fg leading-relaxed text-pretty mb-6">
  <strong className="text-fg">קואורדינטה</strong> היא הכתובת המדויקת של נקודה בשטח — זוג מספרים שמצביע על מיקום אחד ויחיד, בלי תלות בשפה או בציור. זה מה ש-Georeferencing עושה בפועל: מחבר כל פיסת מידע — פיקסל בראסטר, נקודה בוקטור — לקואורדינטה שלה. ברגע שלכל שכבה יש אותה &quot;שפת מיקום&quot;, אפשר להצליב תבליט, כבישים ואיומים בדיוק זה על זה — בלי זה, השכבות היו נופלות זו לצד זו, לא זו על זו.
</p>
```

2. **Raster definition paragraph** — insert inside the raster/vector compare container, after the `<div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">אותו שטח מבצעי · פעם כראסטר, פעם כוקטור</div>` block closes and before `<RasterVectorCompare />` (around current line 161-163):

```tsx
<p className="text-sm text-fg-muted leading-relaxed text-pretty mb-4">
  <strong className="text-fg">מהו ראסטר בפועל:</strong> הראסטר הוא הדרך שבה מחשב מייצג משטח רציף — הוא מחלק את השטח לרשת של תאים (פיקסלים), ולכל תא נותן ערך מספרי אחד: גובה, טמפרטורה, צפיפות צמחייה. ככל שהתא קטן יותר, כך הרזולוציה גבוהה יותר. בצבא, הראסטר הכי שימושי הוא DTM — מודל גבהים ספרתי, הבסיס לכל חישוב קווי ראייה, נסתרות ושיפועים.
</p>
```

3. **Orthophoto fix + explanation** — inside `RasterVectorCompare()`'s raster `<figure>` (currently ~lines 344-380):
   - Change the `alt` text (line 348): replace `"תצלום לוויין אמיתי של אזור כפרי הררי — כביש מתפתל, יישוב על גבעה ושדות חקלאיים. דוגמה לשכבת ראסטר: כל פיקסל מחזיק ערך אחד."` → `"אורתופוטו של אזור כפרי הררי — כביש מתפתל, יישוב על גבעה ושדות חקלאיים. דוגמה לשכבת ראסטר: כל פיקסל מחזיק ערך אחד."`
   - Change the figcaption title (line 375): `תצלום לוויין · שכבת רקע רציפה` → `אורתופוטו · שכבת רקע רציפה`
   - Add a second paragraph inside the same `<figcaption>`, right after the existing `<p>` (after line 378's `</p>`, before `</figcaption>`):

```tsx
<p className="text-xs text-fg-muted leading-relaxed text-pretty mt-2">
  <strong className="text-fg">זהו אורתופוטו</strong> — תמונת אוויר שעברה תיקון גיאומטרי (אורתורקטיפיקציה) שמסיר את עיוותי זווית הצילום וגובה השטח, כך שכל פיקסל יושב במיקום האמיתי שלו. בזכות זה אפשר למדוד עליו מרחקים ולשכב עליו שכבות וקטוריות בדיוק — בתצלום רגיל (לא מתוקן) המרחקים משתבשים ליד הקצוות.
</p>
```

**Note for implementer/reviewer:** the asset filename is `valley-aerial.jpg`, so "תמונת אוויר" (aerial image) is used rather than "לוויין" (satellite) — the military-geo-editor review below must confirm this is the correct/defensible framing for the term "אורתופוטו" in this context, or adjust the wording if not.

**Review gate (required):** Dispatch `military-geo-editor` to fact-check all 3 new paragraphs (raster resolution/DTM claims, orthophoto/orthorectification claims, coordinates/georeferencing claims) per FIXES success criterion "ההסבר עבר בדיקת דיוק תוכן (military-geo-editor)". Also dispatch `hebrew-copy-editor` for a light tone/clarity pass on the same 3 paragraphs (general project quality bar, not merely spec-mandated for this item).

- [ ] Step 1: Apply the 3 insertions above to `BasicsScene.tsx`.
- [ ] Step 2: Run `npx tsc --noEmit` — must pass clean.
- [ ] Step 3: Commit: `git commit -m "content: add raster/orthophoto/coordinates deep explanations to topic-12 basics scene"`

---

### Task 3: Clarify attribute-table purpose (FIXES item 3)

**Files:**
- Modify: `src/components/lessons/topic-12/BasicsScene.tsx` (run this task after Task 2 is committed, same file)

**Problem (from gap analysis):** The "טבלת תכונות · 4 מבנים בגזרה" section jumps straight into a live queryable table with no sentence establishing what an attribute table *is* (row = object, column = property) or why it matters operationally — a learner sees a table + a query button without ever being told the underlying model.

**Exact edit:** Insert a new paragraph after `<SoftDivider text="הכוח של וקטור · שאילתות חכמות" />` and before the `{/* Vector query demo */}` / `<div className="surface-elevated p-5 rounded-[4px] mb-12">` block (currently around line 173-176):

```tsx
<p className="max-w-3xl text-sm text-fg-muted leading-relaxed text-pretty mb-4">
  <strong className="text-fg">מה זו טבלת תכונות?</strong> כל אובייקט וקטורי במפה — כביש, מבנה, איום — הוא בעצם שורה בטבלה שיושבת מאחורי הצורה הגרפית שלו. כל עמודה בשורה היא תכונה: סוג, גובה, אוכלוסייה, סטטוס מבצעי. בלי הטבלה הזו, הצורה על המפה היא רק קו או מלבן; איתה, אפשר לשאול עליה שאלה ולקבל תשובה — לא רק להסתכל.
</p>
```

**Review gate (required):** Dispatch `instructional-designer` to confirm the added paragraph clearly connects the attribute-table concept to the scene's objective (why an analyst needs this, not just what it is) per FIXES success criterion "מאושר ע"י instructional-designer שהוא מתקשר למטרת הסצנה". Also dispatch `hebrew-copy-editor` for tone/clarity.

- [ ] Step 1: Apply the insertion above to `BasicsScene.tsx`.
- [ ] Step 2: Run `npx tsc --noEmit` — must pass clean.
- [ ] Step 3: Commit: `git commit -m "content: clarify attribute-table purpose in topic-12 basics scene"`

---

### Task 4: Define what "cost" means in Least-Cost Path (FIXES item 4)

**Files:**
- Modify: `src/components/lessons/topic-12/CostSurfaceScene.tsx`

**Problem (from gap analysis):** The scene already names the cost factors (slope/water/urban/threat) and has live weight sliders (already interactive/tested), which is good — but it never explicitly states that a cell's cost score is a **weighted sum** of those factors, nor states the general rule "cost ≠ distance" (only implies it via one route-savings example).

**Exact edit:** In the "הקלט" card, insert a new paragraph immediately after the existing `<p className="text-base text-fg leading-relaxed text-pretty">...עלות נמוכה...</p>` closes (currently around line 165-167), before that card's closing `</div>`:

```tsx
<p className="text-sm text-fg-muted leading-relaxed text-pretty mt-3">
  <strong className="text-fg">&quot;עלות&quot; כאן היא לא מרחק ולא זמן</strong> — היא ציון מצטבר שנבנה מסכום גורמים: שיפוע (כמה קשה לטפס), מכשולים כמו נחל או שטח בנוי (כמה קשה לחצות או לעקוף), וקרבה לאיום (כמה מסוכן להיחשף). לכל גורם יש משקל שקובעים בסליידרים למטה — אותו תא בשטח יכול להיות &quot;זול&quot; במשימה שקטה ו&quot;יקר&quot; כשמעלים את משקל האיום.
</p>
```

**Review gate (required):** Dispatch `military-geo-editor` to confirm the cost-factor description and the "cost ≠ distance" framing are operationally accurate, per FIXES success criterion "מאושר ע"י military-geo-editor".

- [ ] Step 1: Apply the insertion above to `CostSurfaceScene.tsx`.
- [ ] Step 2: Run `npx tsc --noEmit` — must pass clean.
- [ ] Step 3: Commit: `git commit -m "content: explain cost-factor composition in topic-12 cost-surface scene"`

---

### Final verification (after all 4 tasks, before whole-branch review)

- [ ] Run `npm run build` from repo root of the worktree — must complete clean (static export).
- [ ] Start the dev server, navigate to `/lessons/topic-12/`, and visually check `#scene-onboarding` and `#scene-basics` at the project's standard verification viewport for text overflow/clipping introduced by the new paragraphs (mobile/tablet width is not in scope per CLAUDE.md — desktop only).
- [ ] Once clean, mark all 4 checklist items in `project-knowledge/FIXES_2026-08-27.md` (section "שיעור GIS מבצעי (topic-12)") from `[ ]` to `[x]` and add a one-line implementation note under each, per that file's own convention (see topic-04 item for the note format) and the "הנחיה מומלצת ל-Claude Code" instructions at the bottom of that file.
