# Lesson Renumbering (ניווטים → שיעור 6) + Home Lesson-Card Hover TOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the two "כללי" (general) items from `project-knowledge/FIXES_2026-08-27.md`: (1) move the navigation lesson from position 3 to position 6, shifting the landforms/mobility/LOS lessons from 4-5-6 down to 3-4-5; (2) add a hover/focus popover on home-page lesson cards showing that lesson's scene/chapter list.

**Architecture:** The lesson id string `topic-0N` is simultaneously: the array key in `src/lib/lessons.ts`, the Next.js route segment (`/lessons/topic-0N/`), the directory name under `src/components/lessons/`, the markdown filename under `content/`, and the numeric prefix baked into `public/assets/isometric/lesson-0N-*.png` filenames. Renumbering therefore means physically rotating 4 topics' worth of files/directories through a temp holding slot (a 4-cycle: 03→06, 04→03, 05→04, 06→05) so that folder `topic-03` ends up holding what is currently the landforms lesson, etc., and re-keying the three data tables (`lessons.ts`, `quizzes.ts`, `lesson-scenes.ts`) to match. `src/app/lessons/[topicId]/page.tsx` needs **no changes** — its `customLearn` map and `generateStaticParams` are already generic over `topic-01..topic-12` and will pick up whatever now lives in each folder. The hover TOC is a pure-CSS `focus-within`/`hover` opacity overlay (no JS state, no new dependency) added to the existing `LessonCard` defined inside `CoursePlanPanel.tsx`, so it can't intercept clicks (`pointer-events-none`) and can't be clipped by the carousel's `overflow-x-auto` row (it stays `inset-0` within the card's own box instead of extending past it).

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind, Playwright MCP for visual verification.

**Spec:** `project-knowledge/FIXES_2026-08-27.md` (section "כללי", items 1–2)

## Global Constraints

- RTL: whole page is `dir="rtl"` — no `left-`/`right-` literals, use logical properties (`start-`/`end-`/`ms-`/`me-`). (from `CLAUDE.md`)
- No mirroring of illustrations/diagrams. (from `CLAUDE.md`)
- Do not touch unrelated files; preserve Hebrew wording unless a rewrite is explicitly required. (from `FIXES_2026-08-27.md` §"הנחיה מומלצת")
- Success criteria for item 1 (verbatim from spec): lesson menu, `lessons.ts`, `quizzes.ts`, topic folders and URL/slug of every lesson show the new numbering; navigation appears at position 6; no broken link between lessons (recap/next-lesson); `tsc --noEmit` and `next build` pass clean.
- Success criteria for item 2 (verbatim from spec): hover on a lesson card on the home screen shows its chapter/scene list in under 300ms, doesn't block the click-through into the lesson, works under RTL, and is keyboard/focus accessible.

---

### Task 1: Rotate the 4 topic component directories

**Files:**
- Move: `src/components/lessons/topic-03/` → (via temp) → `src/components/lessons/topic-06/`
- Move: `src/components/lessons/topic-04/` → `src/components/lessons/topic-03/`
- Move: `src/components/lessons/topic-05/` → `src/components/lessons/topic-04/`
- Move: `src/components/lessons/topic-06/` → `src/components/lessons/topic-05/`
- Modify (rename file + exported symbol) inside each moved directory: `Topic0XLesson.tsx`

**Interfaces:**
- Produces: after this task, `src/components/lessons/topic-03/Topic03Lesson.tsx` exports `Topic03Lesson` and contains what is today's landforms lesson; `topic-04/Topic04Lesson.tsx` exports `Topic04Lesson` (today's mobility); `topic-05/Topic05Lesson.tsx` exports `Topic05Lesson` (today's LOS); `topic-06/Topic06Lesson.tsx` exports `Topic06Lesson` (today's navigation). `src/app/lessons/[topicId]/page.tsx`'s existing imports (`Topic03Lesson` from `.../topic-03/Topic03Lesson`, etc.) resolve unchanged — do not edit that file in this task.

- [ ] **Step 1: Rotate the 4 directories through a temp slot**

```bash
cd "c:/Users/wolft/Desktop/Programming/Artech/Geo9900"
mkdir -p _tmp_rotate
git mv src/components/lessons/topic-03 _tmp_rotate/topic-03
git mv src/components/lessons/topic-04 src/components/lessons/topic-03
git mv src/components/lessons/topic-05 src/components/lessons/topic-04
git mv src/components/lessons/topic-06 src/components/lessons/topic-05
git mv _tmp_rotate/topic-03 src/components/lessons/topic-06
rmdir _tmp_rotate
```

- [ ] **Step 2: Rename the lesson file + exported function inside each moved directory**

```bash
git mv src/components/lessons/topic-03/Topic04Lesson.tsx src/components/lessons/topic-03/Topic03Lesson.tsx
git mv src/components/lessons/topic-04/Topic05Lesson.tsx src/components/lessons/topic-04/Topic04Lesson.tsx
git mv src/components/lessons/topic-05/Topic06Lesson.tsx src/components/lessons/topic-05/Topic05Lesson.tsx
git mv src/components/lessons/topic-06/Topic03Lesson.tsx src/components/lessons/topic-06/Topic06Lesson.tsx
```

Then, in each of the 4 renamed files, change the two occurrences of the old function name to the new one (declaration + nothing else references it internally — each file is self-contained, per Task investigation):
- `src/components/lessons/topic-03/Topic03Lesson.tsx`: `export function Topic04Lesson()` → `export function Topic03Lesson()`
- `src/components/lessons/topic-04/Topic04Lesson.tsx`: `export function Topic05Lesson()` → `export function Topic04Lesson()`
- `src/components/lessons/topic-05/Topic05Lesson.tsx`: `export function Topic06Lesson()` → `export function Topic05Lesson()`
- `src/components/lessons/topic-06/Topic06Lesson.tsx`: `export function Topic03Lesson()` → `export function Topic06Lesson()`

- [ ] **Step 3: Verify no stray references to the old function names remain in `src/`**

```bash
grep -rn "Topic04Lesson\|Topic05Lesson\|Topic06Lesson\|Topic03Lesson" "c:/Users/wolft/Desktop/Programming/Artech/Geo9900/src" | grep -v "src/components/lessons/topic-0[3-6]/Topic0[3-6]Lesson.tsx" | grep -v "src/app/lessons"
```
Expected: no output (the only occurrences left should be the 4 self-declarations just renamed, and the 4 static imports in `page.tsx` which are untouched and already correct by folder position).

- [ ] **Step 4: Commit**

```bash
git add -A src/components/lessons
git commit -m "refactor: rotate topic-03..06 lesson component directories for renumbering"
```

---

### Task 2: Rotate the 4 markdown content files

**Files:**
- Move: `content/topic-03.md` → (via temp) → `content/topic-06.md`
- Move: `content/topic-04.md` → `content/topic-03.md`
- Move: `content/topic-05.md` → `content/topic-04.md`
- Move: `content/topic-06.md` → `content/topic-05.md`
- Modify: first line ("נושא N:") of each of the 4 moved files

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `content/topic-0N.md` files whose content matches the lesson now assigned to that id. (Note: `loadTopicContent()` output is currently unused for rendering — every id has a `customLearn` override — so this is a correctness/consistency fix for future use, not a live-rendering fix.)

- [ ] **Step 1: Rotate the 4 files through a temp slot**

```bash
cd "c:/Users/wolft/Desktop/Programming/Artech/Geo9900"
mkdir -p _tmp_rotate
git mv content/topic-03.md _tmp_rotate/topic-03.md
git mv content/topic-04.md content/topic-03.md
git mv content/topic-05.md content/topic-04.md
git mv content/topic-06.md content/topic-05.md
git mv _tmp_rotate/topic-03.md content/topic-06.md
rmdir _tmp_rotate
```

- [ ] **Step 2: Fix the first-line heading number in each moved file**

Edit `content/topic-03.md` line 1 from `נושא 4:` to `נושא 3:`
Edit `content/topic-04.md` line 1 from `נושא 5:` to `נושא 4:`
Edit `content/topic-05.md` line 1 from `נושא 6:` to `נושא 5:`
Edit `content/topic-06.md` line 1 from `נושא 3: ניווטים (Navigations)` to `נושא 6: ניווטים (Navigations)`

(Leave the internal "תת נושא N.X" sub-headings as-is — they are not parsed by `parseTopic()` today and a full internal renumber is out of scope for this pass; this file's content is dead code until a future task wires markdown rendering back in.)

- [ ] **Step 3: Commit**

```bash
git add -A content
git commit -m "refactor: rotate topic-03..06 markdown content files for renumbering"
```

---

### Task 3: Rotate the public isometric lesson-diorama assets

**Files:**
- Move (2 files each, `.png` + `-hook.png`): `public/assets/isometric/lesson-03-navigation*.png` → (via temp) → `lesson-06-navigation*.png`
- Move: `lesson-04-landforms*.png` → `lesson-03-landforms*.png`
- Move: `lesson-05-mobility*.png` → `lesson-04-mobility*.png`
- Move: `lesson-06-los*.png` → `lesson-05-los*.png`

**Interfaces:**
- Produces: filenames matching the `lesson-{number}-{slug}.png` convention used by `lessonDioramaSrc()` in `src/lib/lessons.ts`, once Task 4 updates `DIORAMA_SLUGS`.

- [ ] **Step 1: Rotate the 8 files through a temp slot**

```bash
cd "c:/Users/wolft/Desktop/Programming/Artech/Geo9900/public/assets/isometric"
mkdir -p _tmp_rotate
git mv lesson-03-navigation.png _tmp_rotate/lesson-03-navigation.png
git mv lesson-03-navigation-hook.png _tmp_rotate/lesson-03-navigation-hook.png
git mv lesson-04-landforms.png lesson-03-landforms.png
git mv lesson-04-landforms-hook.png lesson-03-landforms-hook.png
git mv lesson-05-mobility.png lesson-04-mobility.png
git mv lesson-05-mobility-hook.png lesson-04-mobility-hook.png
git mv lesson-06-los.png lesson-05-los.png
git mv lesson-06-los-hook.png lesson-05-los-hook.png
git mv _tmp_rotate/lesson-03-navigation.png lesson-06-navigation.png
git mv _tmp_rotate/lesson-03-navigation-hook.png lesson-06-navigation-hook.png
rmdir _tmp_rotate
```

- [ ] **Step 2: Verify the resulting filename set**

```bash
ls "c:/Users/wolft/Desktop/Programming/Artech/Geo9900/public/assets/isometric/" | grep -E "lesson-0[3-6]"
```
Expected: `lesson-03-landforms.png`, `lesson-03-landforms-hook.png`, `lesson-04-mobility.png`, `lesson-04-mobility-hook.png`, `lesson-05-los.png`, `lesson-05-los-hook.png`, `lesson-06-navigation.png`, `lesson-06-navigation-hook.png`.

- [ ] **Step 3: Commit**

```bash
git add -A "public/assets/isometric"
git commit -m "refactor: rotate topic-03..06 diorama asset filenames for renumbering"
```

---

### Task 4: Reorder and re-key `src/lib/lessons.ts`

**Files:**
- Modify: `src/lib/lessons.ts` (the `DIORAMA_SLUGS` map, and the 4 lesson objects for topic-03..06 inside the `lessons` array)

**Interfaces:**
- Consumes: nothing structurally from Tasks 1-3 (this is independent data-layer work), but must be consistent with them before build/verify.
- Produces: `lessons` array whose **position** 3,4,5,6 (0-indexed 2,3,4,5) now holds, in order: landforms (`id:'topic-03', number:3`), mobility (`id:'topic-04', number:4`), LOS (`id:'topic-05', number:5`), navigation (`id:'topic-06', number:6`). `nextLesson`/`prevLesson` walk this array by index, so **array order must match**, not just the `id`/`number` fields.

- [ ] **Step 1: Update `DIORAMA_SLUGS`**

In `src/lib/lessons.ts`, replace:
```ts
const DIORAMA_SLUGS: Record<number, string> = {
  1: 'strategy-terrain',
  2: 'map-reading',
  3: 'navigation',
  4: 'landforms',
  5: 'mobility',
  6: 'los',
  7: 'weather',
  8: 'logistics',
  9: 'chokepoints',
  10: 'urban',
  11: 'borders',
  12: 'gis-layers',
};
```
with:
```ts
const DIORAMA_SLUGS: Record<number, string> = {
  1: 'strategy-terrain',
  2: 'map-reading',
  3: 'landforms',
  4: 'mobility',
  5: 'los',
  6: 'navigation',
  7: 'weather',
  8: 'logistics',
  9: 'chokepoints',
  10: 'urban',
  11: 'borders',
  12: 'gis-layers',
};
```

- [ ] **Step 2: Reorder the 4 lesson objects and update their `id`/`number` fields**

Replace the four lesson objects currently at array positions 3-6 (today's `topic-03` "ניווטים" through today's `topic-06` "קווי ראייה", i.e. everything between the `topic-02` object and the `topic-07` object) with the same 4 objects in this new order: landforms, mobility, cover/vegetation (mobility), LOS, then navigation last — i.e. today's `topic-04`, `topic-05`, `topic-06`, `topic-03` objects, verbatim except for `id` and `number`:

```ts
  {
    id: 'topic-03',
    number: 3,
    title: 'טופוגרפיה ומורפולוגיית שטח',
    shortTitle: 'מורפולוגיית שטח',
    subtitle: 'גיאולוגיה צבאית, 5 תבניות נוף ושטח שולט/חיוני/מת',
    duration: 40,
    difficulty: 'intermediate',
    hero: { color: 'from-terrain-ridge/30 via-bg to-bg', icon: 'mountain' },
    interactions: ['terrain-classifier'],
    objectives: [
      'להבחין בין שלוש קבוצות סלעים ולהבין את ההשלכות הצבאיות שלהן',
      'להסביר את ההבדל בין כוחות אנדוגניים לאקסוגניים בעיצוב הנוף',
      'לזהות חמש תבניות נוף בסיסיות (כיפה, שלוחה, גיא, אוכף, שקע) במפה ובשטח',
      'לסווג מדרון לאחד מ-4 הסוגים (קצוב, קמור, קעור, כתף)',
      'להבדיל בין שטח שולט, שטח חיוני ושטח מת ולתת לכל אחד דוגמה מבצעית',
    ],
    tags: ['תבליט', 'Key Terrain', 'גיאולוגיה'],
  },
  {
    id: 'topic-04',
    number: 4,
    title: 'ניידות ותמרון: עבירות, כיסוי והסתרה, תכסית',
    shortTitle: 'ניידות ותמרון',
    subtitle: 'מסדרונות תמרון, שיפועים, הנדסה גיאוגרפית, צומח וחקלאות',
    duration: 55,
    difficulty: 'intermediate',
    hero: { color: 'from-terrain-olive/25 via-bg to-bg', icon: 'route' },
    interactions: ['mobility-grid'],
    objectives: [
      'לחשב גבולות עבירות לכלים גלגליים מול זחליליים לפי שיפוע ומסלע',
      'לתכנן מסדרון תמרון שמשלב מכשולים טבעיים והנדסיים',
      'להבחין בין כיסוי (Cover) להסתרה (Concealment) ולהשתמש בכל אחד נכון',
      'לסווג תצורות צומח וחקלאות ולהסיק משמעויות מבצעיות',
    ],
    tags: ['Trafficability', 'Cover', 'תכסית'],
  },
  {
    id: 'topic-05',
    number: 5,
    title: 'קווי ראייה ותצפית (LOS / Viewshed)',
    shortTitle: 'קווי ראייה',
    subtitle: 'ניתוח תצפיות, Viewshed אלגוריתמי וסגירת מעגלי אש',
    duration: 45,
    difficulty: 'intermediate',
    hero: { color: 'from-accent-cool/25 via-bg to-bg', icon: 'eye' },
    interactions: ['los-simulator'],
    objectives: [
      'לחשב קו ראייה ידני ולזהות שבירת LOS על ידי תכסית או תבליט',
      'להפעיל ניתוח Viewshed ולפרש את תוצאותיו',
      'לבצע ניתוח תצפית מרובת מקורות ולאתר פערי כיסוי',
      'להסביר תלות של חימוש מונחה בשמירת LOS לאורך Kill Chain',
    ],
    tags: ['LOS', 'Viewshed', 'Kill Chain'],
  },
  {
    id: 'topic-06',
    number: 6,
    title: 'ניווטים: התמצאות, אזימוט ותכנון ציר',
    shortTitle: 'ניווטים',
    subtitle: 'אזימוט, סיפור דרך, ניווט בשטח אויב ובסביבת GPS-Denied',
    duration: 45,
    difficulty: 'foundation',
    hero: { color: 'from-accent/25 via-bg to-bg', icon: 'compass' },
    interactions: ['navigation-sim'],
    objectives: [
      'לחשב אזימוט ואזימוט חוזר ולהבחין בין 3 סוגי "צפון"',
      'להבין את המגבלות של GPS ולמה צריך לדעת לעבוד בלעדיו',
      'לבנות "סיפור דרך" עם נקודות אימות ולחשב מרחק בספירת צעדים',
      'לבחור שיטת ניווט מתאימה לשטח (איגוף / עיוור / שליטה בקצב)',
    ],
    tags: ['אזימוט', 'GPS-Denied', 'סיפור דרך'],
  },
```

Note `difficulty: 'foundation'` is preserved as-is on the navigation lesson even though it's now lesson 6 (content difficulty didn't change, only position) — do not "fix" this to `'intermediate'`, that would be inventing a change not requested by the spec.

- [ ] **Step 3: Commit**

```bash
git add src/lib/lessons.ts
git commit -m "refactor: renumber navigation to lesson 6 in lessons.ts, shift landforms/mobility/LOS to 3-4-5"
```

---

### Task 5: Re-key `src/lib/quizzes.ts`

**Files:**
- Modify: `src/lib/quizzes.ts` (rename 4 top-level object keys only — leave question content untouched)

**Interfaces:**
- Consumes: nothing from other tasks (pure key rename, independent).
- Produces: `quizzes['topic-06']` now holds the navigation questions (previously under `quizzes['topic-03']`); `quizzes['topic-03']` now holds what was under `quizzes['topic-04']` (landforms); `quizzes['topic-04']` holds what was `quizzes['topic-05']` (mobility); `quizzes['topic-05']` holds what was `quizzes['topic-06']` (LOS).

- [ ] **Step 1: Rename the 4 key labels in place**

In `src/lib/quizzes.ts`, find each top-level key line and rename **only the key string**, leaving its entire question array untouched, using this mapping (apply in this order to avoid a key colliding with one not yet renamed — rename 03 first since nothing currently targets 03):

1. `'topic-03': [` (the section whose questions are about azimuth/GPS-Denied/dead-reckoning — navigation) → `'topic-06': [`
2. `'topic-04': [` (landforms questions) → `'topic-03': [`
3. `'topic-05': [` (mobility questions) → `'topic-04': [`
4. `'topic-06': [` (LOS questions) → `'topic-05': [`

- [ ] **Step 2: Verify each key's content still matches its topic by spot-checking one question stem per renamed key**

```bash
grep -n "'topic-0[3-6]':" "c:/Users/wolft/Desktop/Programming/Artech/Geo9900/src/lib/quizzes.ts"
```
For each match, read a few lines after it and confirm the question content (topic-03 → landforms/rock-type questions, topic-04 → mobility/trafficability questions, topic-05 → LOS/viewshed questions, topic-06 → azimuth/navigation questions).

- [ ] **Step 3: Commit**

```bash
git add src/lib/quizzes.ts
git commit -m "refactor: re-key quizzes.ts topic-03..06 to match lesson renumbering"
```

---

### Task 6: Re-key `src/lib/lesson-scenes.ts`

**Files:**
- Modify: `src/lib/lesson-scenes.ts` (rename 4 keys in `lessonScenes`, rename 4 keys **and** update the `card`/`hook` path numbers in `lessonAssets`)

**Interfaces:**
- Consumes: the new filenames produced by Task 3 (`lesson-03-landforms.png` etc.) — this task's `lessonAssets` path strings must match those exactly.
- Produces: `lessonScenes['topic-06']` = navigation's scene list (hook/onboarding/principles/planning/combatnav/recap), `lessonScenes['topic-03']` = landforms' scene list, etc. `lessonAssets['topic-03']` = `{ slug: 'landforms', card: '/assets/isometric/lesson-03-landforms.png', hook: '/assets/isometric/lesson-03-landforms-hook.png' }`, and so on for 04/05/06.

- [ ] **Step 1: Rename the 4 key labels in `lessonScenes`** (content of each scene array untouched)

1. `'topic-03': [` (hook/onboarding/principles/planning/combatnav/recap — navigation's scenes) → `'topic-06': [`
2. `'topic-04': [` (hook/onboarding/geology/landforms/tacticalterrain/recap) → `'topic-03': [`
3. `'topic-05': [` (hook/onboarding/trafficability/engineering/cover/vegetation/recap) → `'topic-04': [`
4. `'topic-06': [` (hook/onboarding/los/viewshed/killchain/recap) → `'topic-05': [`

- [ ] **Step 2: Replace the 4 `lessonAssets` entries for topic-03..06**

Replace:
```ts
  'topic-03': { slug: 'navigation', card: '/assets/isometric/lesson-03-navigation.png', hook: '/assets/isometric/lesson-03-navigation-hook.png' },
  'topic-04': { slug: 'landforms', card: '/assets/isometric/lesson-04-landforms.png', hook: '/assets/isometric/lesson-04-landforms-hook.png' },
  'topic-05': { slug: 'mobility', card: '/assets/isometric/lesson-05-mobility.png', hook: '/assets/isometric/lesson-05-mobility-hook.png' },
  'topic-06': { slug: 'los', card: '/assets/isometric/lesson-06-los.png', hook: '/assets/isometric/lesson-06-los-hook.png' },
```
with:
```ts
  'topic-03': { slug: 'landforms', card: '/assets/isometric/lesson-03-landforms.png', hook: '/assets/isometric/lesson-03-landforms-hook.png' },
  'topic-04': { slug: 'mobility', card: '/assets/isometric/lesson-04-mobility.png', hook: '/assets/isometric/lesson-04-mobility-hook.png' },
  'topic-05': { slug: 'los', card: '/assets/isometric/lesson-05-los.png', hook: '/assets/isometric/lesson-05-los-hook.png' },
  'topic-06': { slug: 'navigation', card: '/assets/isometric/lesson-06-navigation.png', hook: '/assets/isometric/lesson-06-navigation-hook.png' },
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/lesson-scenes.ts
git commit -m "refactor: re-key lesson-scenes.ts topic-03..06 to match lesson renumbering"
```

---

### Task 7: Update `CoursePlanPanel.tsx`'s `APPROVED_TITLES`

**Files:**
- Modify: `src/components/landing/home/CoursePlanPanel.tsx:27-35`

**Interfaces:**
- Consumes: nothing structurally — this is the last place the old numbering is hardcoded.

- [ ] **Step 1: Replace the `APPROVED_TITLES` map**

Replace:
```ts
const APPROVED_TITLES: Record<string, string> = {
  'topic-01': 'מבוא',
  'topic-02': 'קרטוגרפיה קריאת מפות',
  'topic-03': 'ניווטים',
  'topic-04': 'טופוגרפיה\nומורפולוגיית שטח',
  'topic-05': 'ניידות ותמרון',
  'topic-06': 'קווי ראייה',
  'topic-07': 'אקלים ומזג אוויר',
};
```
with:
```ts
const APPROVED_TITLES: Record<string, string> = {
  'topic-01': 'מבוא',
  'topic-02': 'קרטוגרפיה קריאת מפות',
  'topic-03': 'טופוגרפיה\nומורפולוגיית שטח',
  'topic-04': 'ניידות ותמרון',
  'topic-05': 'קווי ראייה',
  'topic-06': 'ניווטים',
  'topic-07': 'אקלים ומזג אוויר',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/home/CoursePlanPanel.tsx
git commit -m "refactor: update home carousel APPROVED_TITLES for lesson renumbering"
```

---

### Task 8: Verify the renumbering end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

```bash
cd "c:/Users/wolft/Desktop/Programming/Artech/Geo9900" && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Production build**

```bash
cd "c:/Users/wolft/Desktop/Programming/Artech/Geo9900" && npm run build
```
Expected: build succeeds; static params generated for `topic-01`..`topic-12` with no missing-module errors (this is where a leftover bad import path from Task 1 would surface).

- [ ] **Step 3: Grep sweep for anything still referencing the old numbering assumption**

```bash
grep -rn "lesson-03-navigation\|lesson-06-los\|lesson-04-landforms\|lesson-05-mobility" "c:/Users/wolft/Desktop/Programming/Artech/Geo9900/src" "c:/Users/wolft/Desktop/Programming/Artech/Geo9900/content" 2>/dev/null
```
Expected: no output (all such paths should now read `lesson-06-navigation`, `lesson-05-los`, `lesson-03-landforms`, `lesson-04-mobility`).

- [ ] **Step 4: Manual browser check with Playwright MCP**

Start the dev server, navigate to `/`, and:
- Confirm the home course-plan carousel shows "ניווטים" under card **06** and "טופוגרפיה ומורפולוגיית שטח" under card **03**.
- Click into `/lessons/topic-06/` and confirm the page renders the navigation lesson (compass icon, "עקרונות הניווט" scene) with prev-lesson linking to `/lessons/topic-05/` (LOS) and no next-lesson (if 06 isn't last) or correct next per array.
- Click into `/lessons/topic-03/` and confirm it renders the landforms lesson content, with prev linking to `/lessons/topic-02/` and next to `/lessons/topic-04/` (mobility).
- Take a screenshot at 1440px width of the home course-plan panel for the record.

- [ ] **Step 5: Update the FIXES doc checkbox**

In `project-knowledge/FIXES_2026-08-27.md`, check off the "שינוי מספור שיעורים — ניווטים עובר לשיעור 6" item and add an implementation note below it summarizing what moved where and confirming the 4 success-criteria bullets passed.

---

### Task 9: Implement the home lesson-card hover scene-list popover

**Files:**
- Modify: `src/components/landing/home/CoursePlanPanel.tsx`

**Interfaces:**
- Consumes: `lessonScenes` from `@/lib/lesson-scenes` (already re-keyed correctly by Task 6).
- Produces: no new exports; purely a visual addition to the existing local `LessonCard` function in this file.

- [ ] **Step 1: Import `lessonScenes` and extend `LessonItem`/`ALL_LESSONS`/`LOOPED_LESSONS` to carry the chapter list**

In `src/components/landing/home/CoursePlanPanel.tsx`, change:
```ts
import { lessons, lessonDioramaSrc } from '@/lib/lessons';
```
to:
```ts
import { lessons, lessonDioramaSrc } from '@/lib/lessons';
import { lessonScenes } from '@/lib/lesson-scenes';
```

Change the `LessonItem` type:
```ts
type LessonItem = {
  id: string;
  num: string;
  title: string;
  img: string;
};
```
to:
```ts
type LessonItem = {
  id: string;
  num: string;
  title: string;
  img: string;
  chapters: string[];
};
```

Change `ALL_LESSONS`:
```ts
const ALL_LESSONS: LessonItem[] = lessons.map((l) => ({
  id: l.id,
  num: String(l.number).padStart(2, '0'),
  title: APPROVED_TITLES[l.id] ?? l.shortTitle,
  img: lessonDioramaSrc(l.number),
}));
```
to:
```ts
const FRAMING_SCENE_IDS = new Set(['hook', 'onboarding', 'recap']);

const ALL_LESSONS: LessonItem[] = lessons.map((l) => ({
  id: l.id,
  num: String(l.number).padStart(2, '0'),
  title: APPROVED_TITLES[l.id] ?? l.shortTitle,
  img: lessonDioramaSrc(l.number),
  chapters: (lessonScenes[l.id] ?? [])
    .filter((s) => !FRAMING_SCENE_IDS.has(s.id))
    .map((s) => s.label),
}));
```

`LOOPED_LESSONS` needs no change — it already spreads `...lesson` from `ALL_LESSONS` (line: `ALL_LESSONS.map((lesson) => ({ ...lesson, copyKey: ... }))`), so `chapters` passes through automatically.

- [ ] **Step 2: Add the hover/focus overlay to the local `LessonCard` function**

Replace:
```tsx
function LessonCard({ lesson, compact }: { lesson: LessonItem; compact: boolean }) {
  return (
    <Link
      href={`/lessons/${lesson.id}/`}
      aria-label={`שיעור ${lesson.num} — ${lesson.title.replace('\n', ' ')}`}
      draggable={false}
      className={cn(
        'relative flex flex-col items-center rounded-2xl bg-paper-card px-[18px] pb-[28px] pt-[28px] text-center shadow-card-soft transition duration-150 ease-snap hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-paper-panel',
        compact ? 'shrink-0' : 'w-full',
        compact && 'h-[437px] w-[225px]',
      )}
    >
      <span dir="ltr" className="text-[44px] font-extrabold leading-none text-olive-ink">
        {lesson.num}
      </span>
      <IsometricAsset
        assetId={`HOME-CAROUSEL-LESSON-${lesson.num}`}
        src={lesson.img}
        alt=""
        aspect="1/1"
        fit="contain"
        compactPlaceholder
        eager
        className="mt-[23px] h-[219px] w-full bg-transparent mix-blend-multiply [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_50%,transparent_78%)]"
      />
      <h3 className="mt-[23px] whitespace-pre-line text-[20px] font-bold leading-snug text-olive-ink">
        {lesson.title}
      </h3>
    </Link>
  );
}
```
with:
```tsx
function LessonCard({ lesson, compact }: { lesson: LessonItem; compact: boolean }) {
  return (
    <Link
      href={`/lessons/${lesson.id}/`}
      aria-label={`שיעור ${lesson.num} — ${lesson.title.replace('\n', ' ')}`}
      draggable={false}
      className={cn(
        'group/hover relative flex flex-col items-center rounded-2xl bg-paper-card px-[18px] pb-[28px] pt-[28px] text-center shadow-card-soft transition duration-150 ease-snap hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-paper-panel',
        compact ? 'shrink-0' : 'w-full',
        compact && 'h-[437px] w-[225px]',
      )}
    >
      <span dir="ltr" className="text-[44px] font-extrabold leading-none text-olive-ink">
        {lesson.num}
      </span>
      <IsometricAsset
        assetId={`HOME-CAROUSEL-LESSON-${lesson.num}`}
        src={lesson.img}
        alt=""
        aspect="1/1"
        fit="contain"
        compactPlaceholder
        eager
        className="mt-[23px] h-[219px] w-full bg-transparent mix-blend-multiply [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_50%,transparent_78%)]"
      />
      <h3 className="mt-[23px] whitespace-pre-line text-[20px] font-bold leading-snug text-olive-ink">
        {lesson.title}
      </h3>

      {lesson.chapters.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-olive-ink/95 px-4 py-6 opacity-0 transition-opacity duration-150 ease-snap group-hover/hover:opacity-100 group-focus-visible/hover:opacity-100"
        >
          <span className="text-[13px] font-bold text-paper-card/80">ראשי פרקים</span>
          <ul className="flex flex-col gap-1.5">
            {lesson.chapters.map((chapter) => (
              <li key={chapter} className="text-[14px] font-medium leading-snug text-paper-card">
                {chapter}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Link>
  );
}
```

Notes on this design (do not deviate without re-verifying against the success criteria):
- The overlay is `absolute inset-0` **within the card's own box** rather than extending past it (`top-full` etc.) — the carousel row uses `overflow-x-auto`, which per the CSS spec forces the paired `overflow-y` to compute to `auto` too, so anything positioned outside the card's box would get silently clipped. Keeping it `inset-0` avoids that.
- `pointer-events-none` on the overlay means a click always reaches the underlying `<Link>` — the popover can never block navigation, satisfying that success criterion structurally rather than by careful hand-testing.
- Both `group-hover/hover:opacity-100` and `group-focus-visible/hover:opacity-100` are wired to the **same** `group/hover` class on the `<Link>` itself (not a separate wrapper), so keyboard Tab-focus onto the card shows the same popover a mouse hover would — satisfying "keyboard/focus accessible" without any JS.
- It's a pure CSS opacity transition (`duration-150`), i.e. well under the 300ms budget — there is no artificial delay to remove.
- `aria-hidden` on the overlay is intentional: the chapter list duplicates information available on the lesson's own page and is a supplementary visual hint, not the only way to reach that information — this avoids screen readers announcing hidden (opacity:0) content that a sighted mouse user hasn't triggered.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/home/CoursePlanPanel.tsx
git commit -m "feat: add hover/focus chapter-list popover to home lesson cards"
```

---

### Task 10: Verify the hover feature and close out the FIXES doc item

**Files:** `project-knowledge/FIXES_2026-08-27.md` (checkbox update only)

- [ ] **Step 1: Type-check and build again**

```bash
cd "c:/Users/wolft/Desktop/Programming/Artech/Geo9900" && npx tsc --noEmit && npm run build
```
Expected: no errors.

- [ ] **Step 2: Manual verification with Playwright MCP**

- Start the dev server, navigate to `/`, resize to 1440×1122.
- Hover the mouse over a carousel lesson card (not dragging) and screenshot — confirm the chapter-list overlay appears, is legible, RTL-correct (Hebrew right-aligned reading order), and doesn't visually escape the card.
- Click a card while **not** hovering long enough to trigger drag-detection and confirm navigation to `/lessons/topic-0N/` still works (the overlay must not have swallowed the click).
- Tab (keyboard) to a carousel card and confirm the same overlay appears on focus.
- Expand "צפייה בכל השיעורים" (grid mode) and confirm hover/focus works there too (same `LessonCard` component, `compact={false}`).

- [ ] **Step 3: Update the FIXES doc**

In `project-knowledge/FIXES_2026-08-27.md`, check off the "Hover על שם שיעור במסך הבית" item and add an implementation note: pure-CSS `focus-within`-free (uses `group-hover`/`group-focus-visible` directly on the `Link`) overlay in `CoursePlanPanel.tsx`'s `LessonCard`, sourcing chapter labels from `lessonScenes`, filtering out hook/onboarding/recap framing scenes.

- [ ] **Step 4: Final commit**

```bash
git add project-knowledge/FIXES_2026-08-27.md
git commit -m "docs: mark כללי items done in FIXES_2026-08-27.md"
```
