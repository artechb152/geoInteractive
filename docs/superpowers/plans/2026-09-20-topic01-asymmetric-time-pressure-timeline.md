# Topic-01 Asymmetric Scene — "כשהזמן משנה את מאזן הכוחות" Timeline Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 3-round predict/check + pressure-map interaction inside `TimePressureExperience.tsx` (rendered by `AsymmetricScene.tsx` at `/lessons/topic-01/#scene-asymmetric`) with a 5-station timeline that compares "five fronts vs. one" between a regular army and an irregular player, restoring the original activity title and its full original explanatory text.

**Architecture:** A content-only data module (`TimePressureContent.ts`) exports the 5 stations (each = one time point that adds exactly one "front"), UI microcopy, and the original insight text. A single client component (`TimePressureExperience.tsx`) renders: title+instruction → a 5-station timeline (click or drag-to-snap) → one station panel (text right / image left, crossfading) → a fixed 5-row comparison table using the existing `StatusChip` component for row status → a numeric summary row → a "מה המשמעות?" disclosure with the full original explanation. No map, no connecting lines, no multiple animated regions — exactly one image, one text block, one table on screen at a time.

**Tech Stack:** Next.js 15 / React 19 (client component), Tailwind (project's existing `paper/olive/ember/pine/tanline`-derived semantic tokens — see `.agents/skills/checking-design-fidelity/SKILL.md` Table 2/3), `framer-motion` (already a dependency) for the crossfade and the drag-to-snap timeline thumb, existing `IsometricAsset`, `Icon`, `StatusChip`, `cn` utilities.

**Spec:** The user's Hebrew brief in this conversation ("פרומפט לפיתוח — הזמן וחמש החזיתות"), which this plan section-by-section implements. Everything under "Verbatim content" below is copied character-for-character from that brief — never paraphrase it.

## Global Constraints

- Original activity title (per the brief: "השב את הכותרת המקורית", matching the referenced source activity name) is **"למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?"** — not the current file's `'כשהזמן משנה את מאזן הכוחות'`.
- Exactly 5 stations, 5 fronts, verbatim original text for all 5 station narratives, all 5 front elaborations, and the full 3-paragraph original insight. Never merge into 3 rounds, never add a quiz/score/timer.
- Ratios 1:1, 2:1, 3:1, 4:1, 5:1 must equal the **count of active fronts per side at each station** (regular climbs 1→5, irregular stays 1), not any invented "power ratio".
- RTL logical properties only (`ms-`/`me-`/`start-`/`end-`); no `left-`/`right-` literals for content flow. Images: `fit="contain"`, never mirrored, no text burned into the image.
- No new color tokens/hex. Reuse existing tokens per `.agents/skills/checking-design-fidelity/SKILL.md` Table 2 (lesson-scene content: flat black text, 3 tiers max) and Table 3 (reuse `StatusChip`, `.surface-elevated`, `.chip`, `btn-*` — never hand-roll a status pill).
- Typography: content ≥16px, so the table's front-label cells (the actual pedagogical content column) must use `text-base` (16px) or larger — never shrink them to fit. `StatusChip`'s own default badge size (its pre-approved, reused-as-is sizing) is the one exception, since it is short UI-state chrome ("נוספה"/"טרם נוספה"/"לא במודל"), not prose content, matching how badges are already used sitewide alongside the 3-tier heading/sub-heading/body system without counting as a 4th tier. All interactive elements (station buttons, front-name buttons, prev/next, insight toggle) need a visible keyboard focus ring — reuse this file's/the project's existing `focus-visible:ring-2 focus-visible:ring-accent` convention (see e.g. `PredictionOption`/`DigitZoneButton` in the reference files).
- Screen shows **only one image + one explanation + one table at a time** — no map, no connecting lines, no floating popovers, no conveyor belt, no combat effects, no multiple animated regions.
- Time navigation is fully reversible; browsing a previous front's detail never changes the active-front count or the current time. Full keyboard alternative to the drag interaction (the 5 station buttons already provide it). Reduced motion ⇒ instant transitions, no crossfade.
- Do not touch `AsymmetricScene.tsx` (only its already-existing `<TimePressureExperience />` call site stays as-is), lesson navigation, or global styles. Do not touch the currently-uncommitted nav-refactor files (`LessonSidebar.tsx`, `lesson-nav-context.ts`, `HookSceneLayout.tsx`, `LessonShell.tsx`, `PagedLearn.tsx`, `page.tsx`, `globals.css`) — those are unrelated in-progress work on this branch.
- Assets: the 5 approved photos are **already copied** (by the plan's controller, before Task 1) to `public/assets/lessons/topic01/scene-asymmetric/time-pressure-timeline/{01-field,02-treasury,03-public,04-politics,05-international}-photo.png`, served at `/assets/lessons/topic01/scene-asymmetric/time-pressure-timeline/...`. Do not use any other image under `design/handoff/asymmetric-timeline-focused/` (everything without a `-photo.png` suffix there is a superseded draft).
- Verification commands for this project (no Jest/vitest configured): `npx tsc --noEmit`, `npm run lint`, `npm run qa:rtl`. Visual verification is Playwright MCP screenshots at 1440×1122 (`browser_navigate` → `http://localhost:3000/lessons/topic-01#scene-asymmetric` → `browser_resize(1440,1122)` → `browser_take_screenshot`), per `AGENTS.md`'s verification loop — the dev server (`npm run dev`) must be running.

---

## Verbatim content (source of truth for Task 1 — copy exactly, do not rephrase)

**Title:** `למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?`

**Instruction line:** `התקדמו בציר הזמן וגלו איזו חזית נוספת בכל שלב.`

**Source question (table caption):** `מי באמת יכול להכריח אותך לסיים את המלחמה?`

**Timeline note:** `ציר הזמן הוא המחשה רעיונית, לא לוח זמנים קבוע לכל מלחמה.`

**Insight toggle label:** `מה המשמעות?`

**Insight section heading:** `ההסבר במודל המוצג`

**Insight paragraphs (3, verbatim, in this order):**
1. `זו לא רק שאלה של מספרים — זה הבדל בכללי המשחק. הצבא הסדיר חייב לנצח בכל אחת מ-5 החזיתות, כי הפסד באחת מהן מספיק כדי להפיל את כל המלחמה. השחקן הלא-סדיר צריך רק לא לאבד את החזית היחידה שלו — וזה כבר מספיק לו לניצחון, בכל שלב בציר הזמן.`
2. `המעצמה רואה את עצמה במלחמה אחת — נגד האויב שבשטח. בפועל, היא לוחמת ב-5 חזיתות בו-זמנית, וכל אחת מ-4 הפנימיות יכולה לבדה לסיים את המלחמה. אין לו אוצר שיתרוקן, אין לו ועדת חקירה שתפיל אותו, אין לו או"ם שילחץ. הוא צריך רק לשרוד עוד יום.`
3. `ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות.`

**5 stations, in fixed array order (index 0→4 = day1→year2), each with: id, timeLabel (timeline chip), stationText (main-panel narrative), frontLabel (table row / detail heading), frontDetail (shown when that front's name is clicked), image path/alt:**

| index | id | timeLabel | stationText | frontLabel | frontDetail | image src (under `/assets/lessons/topic01/scene-asymmetric/time-pressure-timeline/`) | alt |
|---|---|---|---|---|---|---|---|
| 0 | `field` | `יום 1` | `הלחימה רק התחילה. מבחוץ זה עוד נראה כמו "מלחמה פשוטה, צבא מול צבא" — רק חזית אחת פעילה משני הצדדים.` | `האויב בשטח` | `לוחמי גרילה או מחבלים — היריב הצבאי המוצהר.` | `01-field-photo.png` | `עמדת שטח ורכב` |
| 1 | `treasury` | `שבוע 2` | `משרד האוצר מתחיל ללחוץ — המלחמה כבר עולה מיליארדי דולרים בשבוע, והמילואים נשחקים.` | `משרד האוצר` | `תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים, פגיעה בעורף.` | `02-treasury-photo.png` | `משרד תקציב` |
| 2 | `public` | `חודש 3` | `דעת הקהל נשחקת — תמונות מהזירה ולוויות חיילים משפיעות על התמיכה הציבורית מיום ליום.` | `דעת הקהל` | `תמונות מהזירה, לוויות חיילים, תמיכה ציבורית שנשחקת מיום ליום.` | `03-public-photo.png` | `אזרחים צופים בדיווח` |
| 3 | `politics` | `שנה 1` | `הפוליטיקה הפנימית מתעוררת — ועדות חקירה, אופוזיציה, ולחץ קואליציוני מבית.` | `הפוליטיקה הפנימית` | `הכנסת, הקונגרס, אופוזיציה, ועדות חקירה, שעון הבחירות.` | `04-politics-photo.png` | `חדר ועדה` |
| 4 | `international` | `שנה 2` | `הבמה הבינלאומית דורשת הפסקת אש — לחץ מהאו"ם, מבעלות ברית, ואיום בסנקציות.` | `הבמה הבינלאומית` | `או"ם, בעלות ברית, האג, סנקציות — כולם דורשים "הפסקת אש מיד".` | `05-international-photo.png` | `שולחן דיון בינלאומי` |

**Table columns:** `חזית` / `צבא סדיר` / `שחקן לא־סדיר` (no image column in this table — the table is text-only).

**Irregular-side rule:** only the `field` row (index 0) is ever active for the irregular column — for every other row, the irregular cell always reads "לא במודל" regardless of the current station.

---

## Interaction / state model (binding on Task 2 — this is a documented interpretation of the brief, not free design; log it verbatim into `design/docs/assumptions.md` as instructed in Task 2 Step 1)

State: `currentIndex: 0|1|2|3|4` (default `0`, no autoplay) and `viewedFrontId: StationId | null` (default `null`).

- **Time navigation** (clicking a station button, dragging the thumb to a station, or Prev/Next) sets `currentIndex` and resets `viewedFrontId` to `null`. Jumping from station 4 straight to station 0 resets to station 0's state exactly like any other navigation (no special-case needed — it's just `currentIndex = 0`).
- **Row/front activation:** a row at array index `i` is "reached" once `i <= currentIndex`. Regular-army count = `currentIndex + 1`. Irregular count is always `1` (only row 0 is ever active for that column).
- **Panel content:**
  - `viewedFrontId === null` → show `STATIONS[currentIndex].stationText` + `STATIONS[currentIndex].image`. No "עיון בחזית" banner.
  - `viewedFrontId === STATIONS[currentIndex].id` (user clicked the current station's own front name) → show that station's `frontDetail` + same image. Still no banner (it's the just-added front, not a previous one).
  - `viewedFrontId` is any other **reached** front (`STATIONS[j].id` where `j < currentIndex`) → show `STATIONS[j].frontDetail` + `STATIONS[j].image`, plus a banner reading `עיון בחזית: ${STATIONS[j].frontLabel}` and a small button `חזרה לחזית שנוספה` that sets `viewedFrontId` back to `null`.
  - A front at `j > currentIndex` (not yet reached) is never clickable — plain text in the table, per the brief ("חזית עתידית נשארת טקסט רגיל").
- **Table row status per column** (drives which `StatusChip` tone + label to render — see Task 2 for the exact tone mapping):
  - Regular column, row `i`: `i > currentIndex` → "טרם נוספה" (future). `i === currentIndex` → "נוספה" (just added — tone `accent`). `i < currentIndex` → previously-added, neutral active (tone `neutral`), no label text needed beyond the row being visually "on" (a small check, matching the brief's "קודמות מסומנות בסימון פעיל ניטרלי").
  - Irregular column, row `0`: same 3-state logic as above but only ever evaluated against `currentIndex >= 0`, i.e. row 0 is "נוספה" only while `currentIndex === 0`, then becomes the neutral previously-added state for every `currentIndex >= 1`. Row 0 is **never** "טרם נוספה".
  - Irregular column, rows `1..4`: always "לא במודל" (tone `dim`), regardless of `currentIndex`. Never a bare dash/minus — always this literal label text.
- **Accessible live update:** on every time-navigation (not on front-detail peeking), announce once via a visually-hidden `aria-live="polite"` region: `"${STATIONS[currentIndex].timeLabel}: נוספה חזית ${STATIONS[currentIndex].frontLabel}. ${currentIndex + 1} מתוך 5 חזיתות פעילות לצבא הסדיר."` — never re-announce the whole table.
- **Summary row text** (new UI microcopy, not pedagogical content — document as an implementation-only string like the old file's `UI_*` constants): two `StatusChip` tone="accent" style stat pills, e.g. `${currentIndex + 1} חזיתות פעילות — צבא סדיר` and `1 חזית פעילה — שחקן לא־סדיר`, with a trailing small label `במודל המוצג`.

---

## File Structure

- **Modify (full rewrite):** `src/components/lessons/topic-01/TimePressureContent.ts` — content-only module (types + data + microcopy). No JSX, no state, no framer-motion.
- **Modify (full rewrite):** `src/components/lessons/topic-01/TimePressureExperience.tsx` — the interactive component. `AsymmetricScene.tsx` already imports and renders `<TimePressureExperience />` with no props (`src/components/lessons/topic-01/AsymmetricScene.tsx:369`) — keep that call site untouched; only this file's internals change.
- **Already done (controller, before Task 1):** 5 image files copied to `public/assets/lessons/topic01/scene-asymmetric/time-pressure-timeline/`.
- **Append-only:** `design/docs/assumptions.md` — Task 2 Step 1 appends one new dated section at the end of the file (the interaction/state-model interpretation above). Never edit any existing line in this file — it already has unrelated uncommitted content from other work on this branch.

---

## Task 1: Rewrite `TimePressureContent.ts` (content module)

**Files:**
- Modify: `src/components/lessons/topic-01/TimePressureContent.ts` (full rewrite — delete all current exports, they belonged to the old 3-round/map design)

**Interfaces:**
- Consumes: nothing (this is the base content module).
- Produces (Task 2 imports these exact names):
  - `export type StationId = 'field' | 'treasury' | 'public' | 'politics' | 'international'`
  - `export type Station = { id: StationId; index: 0 | 1 | 2 | 3 | 4; timeLabel: string; stationText: string; frontLabel: string; frontDetail: string; image: { assetId: string; src: string; alt: string; prompt: string } }`
  - `export const STATIONS: Station[]` — length 5, in the fixed order from the table above (field, treasury, public, politics, international)
  - `export const TITLE: string`
  - `export const INSTRUCTION: string`
  - `export const SOURCE_QUESTION: string`
  - `export const TIMELINE_NOTE: string`
  - `export const TABLE_HEADER: { front: string; regular: string; irregular: string }`
  - `export const NOT_IN_MODEL_LABEL: string` (`'לא במודל'`)
  - `export const NOT_YET_ADDED_LABEL: string` (`'טרם נוספה'`)
  - `export const JUST_ADDED_LABEL: string` (`'נוספה'`)
  - `export const UI: { prev: string; next: string; toggleInsight: string; insightHeading: string; backToAdded: string; viewingPrevious: (frontLabel: string) => string; regularSummary: (count: number) => string; irregularSummary: string; summaryTag: string; liveUpdate: (station: Station, count: number) => string }`
  - `export const INSIGHT_PARAGRAPHS: string[]` — the 3 paragraphs verbatim, in order

- [ ] **Step 1: Write the module**

```typescript
/**
 * TimePressureContent — נתוני הפעילות "למה הזמן הוא הנשק הסודי של השחקן
 * הלא-סדיר?" (#scene-asymmetric, topic-01, ציר זמן + השוואת חמש חזיתות).
 *
 * כל מחרוזת עברית תחת ROUNDS/STATIONS ותחת INSIGHT_PARAGRAPHS הועתקה
 * מילה במילה מהפרומפט שסופק למימוש מחדש של הפעילות (ציר זמן, יום 1 →
 * שנה 2, חמש חזיתות). מודול תוכן בלבד: אין כאן JSX, state או לוגיקת
 * תצוגה — ראו TimePressureExperience.tsx לרכיב עצמו.
 */

export type StationId = 'field' | 'treasury' | 'public' | 'politics' | 'international';

export type Station = {
  id: StationId;
  index: 0 | 1 | 2 | 3 | 4;
  /** תווית תחנה קצרה על ציר הזמן, למשל "יום 1". */
  timeLabel: string;
  /** הטקסט הנרטיבי של התחנה, מוצג כברירת מחדל במשטח המרכזי. */
  stationText: string;
  /** שם החזית כפי שהוא מופיע בטבלה ובכותרת פאנל הפירוט. */
  frontLabel: string;
  /** הפירוט המקורי של החזית, מוצג כשלוחצים על שם חזית פעילה. */
  frontDetail: string;
  image: { assetId: string; src: string; alt: string; prompt: string };
};

const ASSET_BASE = '/assets/lessons/topic01/scene-asymmetric/time-pressure-timeline';

/** פרספקטיבת מצלמה טבעית בגובה העיניים, ריאליסטי, אור יום טבעי — דרישת
 * הסגנון של בעל הפרויקט לחמש התמונות האלה (לא איזומטריה/דיוראמה). */
const PHOTO_STYLE =
  'photorealistic photograph, natural eye-level camera perspective, natural daylight, muted stone/sand/olive tones, quiet single-focus composition, no isometric or miniature or tilt-shift styling, no studio background, no burned-in text';

export const STATIONS: Station[] = [
  {
    id: 'field',
    index: 0,
    timeLabel: 'יום 1',
    stationText:
      'הלחימה רק התחילה. מבחוץ זה עוד נראה כמו "מלחמה פשוטה, צבא מול צבא" — רק חזית אחת פעילה משני הצדדים.',
    frontLabel: 'האויב בשטח',
    frontDetail: 'לוחמי גרילה או מחבלים — היריב הצבאי המוצהר.',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-FIELD',
      src: `${ASSET_BASE}/01-field-photo.png`,
      alt: 'עמדת שטח ורכב',
      prompt: `A military field position with a parked armored vehicle at eye level, ${PHOTO_STYLE}`,
    },
  },
  {
    id: 'treasury',
    index: 1,
    timeLabel: 'שבוע 2',
    stationText:
      'משרד האוצר מתחיל ללחוץ — המלחמה כבר עולה מיליארדי דולרים בשבוע, והמילואים נשחקים.',
    frontLabel: 'משרד האוצר',
    frontDetail: 'תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים, פגיעה בעורף.',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-TREASURY',
      src: `${ASSET_BASE}/02-treasury-photo.png`,
      alt: 'משרד תקציב',
      prompt: `A government treasury office interior with budget documents on a desk, ${PHOTO_STYLE}`,
    },
  },
  {
    id: 'public',
    index: 2,
    timeLabel: 'חודש 3',
    stationText:
      'דעת הקהל נשחקת — תמונות מהזירה ולוויות חיילים משפיעות על התמיכה הציבורית מיום ליום.',
    frontLabel: 'דעת הקהל',
    frontDetail: 'תמונות מהזירה, לוויות חיילים, תמיכה ציבורית שנשחקת מיום ליום.',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-PUBLIC',
      src: `${ASSET_BASE}/03-public-photo.png`,
      alt: 'אזרחים צופים בדיווח',
      prompt: `Civilians watching a news broadcast on a television, ${PHOTO_STYLE}`,
    },
  },
  {
    id: 'politics',
    index: 3,
    timeLabel: 'שנה 1',
    stationText: 'הפוליטיקה הפנימית מתעוררת — ועדות חקירה, אופוזיציה, ולחץ קואליציוני מבית.',
    frontLabel: 'הפוליטיקה הפנימית',
    frontDetail: 'הכנסת, הקונגרס, אופוזיציה, ועדות חקירה, שעון הבחירות.',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-POLITICS',
      src: `${ASSET_BASE}/04-politics-photo.png`,
      alt: 'חדר ועדה',
      prompt: `A parliamentary committee hearing room with officials seated at a long table, ${PHOTO_STYLE}`,
    },
  },
  {
    id: 'international',
    index: 4,
    timeLabel: 'שנה 2',
    stationText: 'הבמה הבינלאומית דורשת הפסקת אש — לחץ מהאו"ם, מבעלות ברית, ואיום בסנקציות.',
    frontLabel: 'הבמה הבינלאומית',
    frontDetail: 'או"ם, בעלות ברית, האג, סנקציות — כולם דורשים "הפסקת אש מיד".',
    image: {
      assetId: 'TOPIC01-ASYM-TIME-TIMELINE-INTERNATIONAL',
      src: `${ASSET_BASE}/05-international-photo.png`,
      alt: 'שולחן דיון בינלאומי',
      prompt: `An international diplomatic roundtable discussion with delegates and flags, ${PHOTO_STYLE}`,
    },
  },
];

export const TITLE: string = 'למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?';
export const INSTRUCTION: string = 'התקדמו בציר הזמן וגלו איזו חזית נוספת בכל שלב.';
export const SOURCE_QUESTION: string = 'מי באמת יכול להכריח אותך לסיים את המלחמה?';
export const TIMELINE_NOTE: string =
  'ציר הזמן הוא המחשה רעיונית, לא לוח זמנים קבוע לכל מלחמה.';

export const TABLE_HEADER = {
  front: 'חזית',
  regular: 'צבא סדיר',
  irregular: 'שחקן לא־סדיר',
} as const;

export const NOT_IN_MODEL_LABEL: string = 'לא במודל';
export const NOT_YET_ADDED_LABEL: string = 'טרם נוספה';
export const JUST_ADDED_LABEL: string = 'נוספה';

export const UI = {
  prev: 'התחנה הקודמת',
  next: 'התחנה הבאה',
  toggleInsight: 'מה המשמעות?',
  insightHeading: 'ההסבר במודל המוצג',
  backToAdded: 'חזרה לחזית שנוספה',
  viewingPrevious: (frontLabel: string) => `עיון בחזית: ${frontLabel}`,
  regularSummary: (count: number) => `${count} חזיתות פעילות — צבא סדיר`,
  irregularSummary: '1 חזית פעילה — שחקן לא־סדיר',
  summaryTag: 'במודל המוצג',
  liveUpdate: (station: Station, count: number) =>
    `${station.timeLabel}: נוספה חזית ${station.frontLabel}. ${count} מתוך 5 חזיתות פעילות לצבא הסדיר.`,
};

/** ההסבר המקורי המלא — שלוש הפסקאות מהמקור, ללא שינוי ניסוח. */
export const INSIGHT_PARAGRAPHS: string[] = [
  'זו לא רק שאלה של מספרים — זה הבדל בכללי המשחק. הצבא הסדיר חייב לנצח בכל אחת מ-5 החזיתות, כי הפסד באחת מהן מספיק כדי להפיל את כל המלחמה. השחקן הלא-סדיר צריך רק לא לאבד את החזית היחידה שלו — וזה כבר מספיק לו לניצחון, בכל שלב בציר הזמן.',
  'המעצמה רואה את עצמה במלחמה אחת — נגד האויב שבשטח. בפועל, היא לוחמת ב-5 חזיתות בו-זמנית, וכל אחת מ-4 הפנימיות יכולה לבדה לסיים את המלחמה. אין לו אוצר שיתרוקן, אין לו ועדת חקירה שתפיל אותו, אין לו או"ם שילחץ. הוא צריך רק לשרוד עוד יום.',
  'ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות.',
];
```

- [ ] **Step 2: Verify every verbatim string against the "Verbatim content" table above, character for character**

There is no automated test for prose fidelity — do this by placing this plan file and the written module side by side and diffing every Hebrew string by eye, including punctuation (״/", quotes, dashes). This is the single most important check in this task.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `TimePressureContent.ts` (errors from unrelated in-progress files on this branch, if any, are not this task's concern — note them in your report but do not fix them).

- [ ] **Step 4: Commit**

```bash
git add src/components/lessons/topic-01/TimePressureContent.ts
git commit -m "feat(topic-01): rewrite time-pressure content as 5-station timeline data"
```

---

## Task 2: Rewrite `TimePressureExperience.tsx` (component)

**Files:**
- Modify: `src/components/lessons/topic-01/TimePressureExperience.tsx` (full rewrite)
- Reference only (do not modify): `src/components/lessons/topic-02/CoordinatesScene.tsx` (for the "one hover/click → one highlighted relationship" principle in `DigitReadout`/`DigitZoneButton`), `src/components/lessons/topic-01/AsymmetricScene.tsx` (for the `ActorTypologySelector` crossfade-detail-panel pattern and RTL DOM-order convention), `src/components/ui/StatusChip.tsx`, `src/components/assets/IsometricAsset.tsx`, `src/components/Icon.tsx`

**Interfaces:**
- Consumes from Task 1 (`./TimePressureContent`): `StationId`, `Station`, `STATIONS`, `TITLE`, `INSTRUCTION`, `SOURCE_QUESTION`, `TIMELINE_NOTE`, `TABLE_HEADER`, `NOT_IN_MODEL_LABEL`, `NOT_YET_ADDED_LABEL`, `JUST_ADDED_LABEL`, `UI`, `INSIGHT_PARAGRAPHS`.
- Consumes existing project components: `IsometricAsset` (props: `assetId`, `src`, `alt`, `aspect`, `fit`, `prompt`, `className` — see `IsometricAsset.tsx:26-54`; use `fit="contain"`, and for the required 3:2 box use the project's established custom-aspect override technique: an outer `<div style={{ aspectRatio: '3 / 2' }}>` wrapper plus `aspect="4/3"` (nominal) and `className="... [aspect-ratio:auto]"` on `IsometricAsset` itself — same technique already used by `LevelsScene.tsx`'s diorama and `HistoricalCasesPanel.tsx`'s map column, documented in `design/docs/assumptions.md` under "Diorama aspect"), `Icon` (from `@/components/Icon`, e.g. `name="arrow-left"` for the prev/next chevrons — chevrons point left for "forward" per this project's RTL convention, do not flip them), `StatusChip` (from `@/components/ui/StatusChip`, props `tone` ∈ `'accent'|'brand'|'neutral'|'badge'|'dim'|'command'`, `children`, optional `icon`), `cn` (from `@/lib/utils`).
- Produces: `export function TimePressureExperience()` — same export name and zero-argument signature as today, so `AsymmetricScene.tsx:369`'s `<TimePressureExperience />` call site keeps working with no changes there.

- [ ] **Step 1: Append the interaction/state-model interpretation to `design/docs/assumptions.md`**

Before writing any code, append this new section to the **end** of `design/docs/assumptions.md` (do not touch any existing line in that file):

```markdown

## 2026-09-20 — Topic-01 "כשהזמן משנה את מאזן הכוחות" rebuilt as a 5-station timeline (restores original title "למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?")

- **Replaced the 3-round predict/check + pressure-map interaction** (`TimePressureExperience.tsx`, previously implementing `design/handoff/asymmetric-time-v3/`) with a 5-station timeline (day 1 → week 2 → month 3 → year 1 → year 2), each station adding one "front" to a fixed 5-row comparison table (regular army vs. irregular player), per direct user brief. The old `PressureMap`, `LandscapeStrip` (irregular/takeaway bands), and their assets under `public/assets/lessons/topic01/scene-asymmetric/time-pressure/` are no longer referenced by this component — left on disk unused, per this project's existing precedent for superseded assets (see other entries in this file, e.g. "Pyramid + paragraph deleted, not relocated" / "`TOPIC01-ASYM-PILLAR.png` … stays on disk unused").
- **Panel-content state machine** (not fully spelled out in the brief as code, this is the implementer's documented reading of it): two state variables, `currentIndex` (time position, resets nothing else on change except `viewedFrontId`) and `viewedFrontId` (which front's detail is being "peeked" at, resets to `null` on every time-navigation). Default view (`viewedFrontId === null`) shows the current station's narrative `stationText`; clicking any reached front's name (current or previous) sets `viewedFrontId` and switches the panel to that front's `frontDetail`; only a *previous* front's detail additionally shows the "עיון בחזית: …" banner and "חזרה לחזית שנוספה" button, per the brief's explicit distinction.
- **Table cell status uses the existing `StatusChip` component** (`tone="accent"` for "נוספה", `tone="neutral"` for a previously-added front, `tone="dim"` for both "טרם נוספה" and "לא במודל" — distinguished by label text, not by a new tone), per `.agents/skills/checking-design-fidelity/SKILL.md` Table 3's "never build a pill by hand" rule.
```

- [ ] **Step 2: Write the component**

Build `TimePressureExperience.tsx` with this structure (adapt exact JSX/Tailwind classes to match this file's own established look from Task 1's imports and the reference files above — the structure and behavior below are binding, the precise class strings are for the implementer to match against `.agents/skills/checking-design-fidelity/SKILL.md` Table 2/3):

```typescript
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import {
  INSIGHT_PARAGRAPHS,
  INSTRUCTION,
  JUST_ADDED_LABEL,
  NOT_IN_MODEL_LABEL,
  NOT_YET_ADDED_LABEL,
  SOURCE_QUESTION,
  STATIONS,
  TABLE_HEADER,
  TIMELINE_NOTE,
  TITLE,
  UI,
  type Station,
  type StationId,
} from './TimePressureContent';

export function TimePressureExperience() {
  const uid = useId();
  const reduce = !!useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [viewedFrontId, setViewedFrontId] = useState<StationId | null>(null);
  const [insightOpen, setInsightOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);

  const current = STATIONS[currentIndex];
  const viewedIndex = viewedFrontId ? STATIONS.findIndex((s) => s.id === viewedFrontId) : -1;
  const viewingPrevious = viewedIndex >= 0 && viewedIndex < currentIndex;
  const panelStation: Station = viewedIndex >= 0 ? STATIONS[viewedIndex] : current;
  const panelText = viewedFrontId === null ? current.stationText : panelStation.frontDetail;

  const goTo = (index: 0 | 1 | 2 | 3 | 4) => {
    setCurrentIndex(index);
    setViewedFrontId(null);
    setAnnouncement(UI.liveUpdate(STATIONS[index], index + 1));
  };

  const viewFront = (id: StationId) => setViewedFrontId(id);
  const backToAdded = () => setViewedFrontId(null);

  // Preload the next station's image so the crossfade never waits on network.
  useEffect(() => {
    const next = STATIONS[currentIndex + 1];
    if (!next) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = next.image.src;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [currentIndex]);

  const panelKey = `${current.id}-${viewedFrontId ?? 'default'}`;
  const fadeTransition = reduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' as const };

  return (
    <div className="mt-12">
      {/* כותרת + הנחיה — מבנה סעיף 1 */}
      <div className="mb-5">
        <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">
          {TITLE}
          <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
        </h3>
        <p className="mt-2 text-base leading-relaxed text-fg-muted">{INSTRUCTION}</p>
      </div>

      {/* עדכון נגיש קצר — לא מקריא מחדש את הטבלה */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* ציר זמן — סעיף 2: חמש תחנות, יום 1 מימין (ראשון ב-DOM) לשנה 2 משמאל */}
      <Timeline current={currentIndex} onSelect={goTo} uid={uid} reduce={reduce} />

      {/* משטח מרכזי אחד — סעיף 3: טקסט מימין, תמונה משמאל */}
      <div className="surface-elevated mt-5 grid gap-0 overflow-hidden md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col justify-center p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={panelKey}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={fadeTransition}
            >
              {viewingPrevious && (
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <StatusChip tone="neutral">{UI.viewingPrevious(panelStation.frontLabel)}</StatusChip>
                  <button type="button" onClick={backToAdded} className="btn-ghost text-sm">
                    {UI.backToAdded}
                  </button>
                </div>
              )}
              <h4
                ref={panelHeadingRef}
                tabIndex={-1}
                className="font-display text-xl font-bold leading-tight text-black outline-none"
              >
                {panelStation.frontLabel}
              </h4>
              <p className="mt-3 text-base leading-relaxed text-black text-pretty">{panelText}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative min-h-[220px]" style={{ aspectRatio: '3 / 2' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={panelKey}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={fadeTransition}
              className="absolute inset-0"
            >
              <IsometricAsset
                assetId={panelStation.image.assetId}
                src={panelStation.image.src}
                alt={panelStation.image.alt}
                aspect="4/3"
                fit="contain"
                prompt={panelStation.image.prompt}
                className="absolute inset-0 size-full bg-bg-accent [aspect-ratio:auto]"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* הקודם/הבא */}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => currentIndex > 0 && goTo((currentIndex - 1) as 0 | 1 | 2 | 3 | 4)}
          disabled={currentIndex === 0}
          className={cn('btn-secondary', currentIndex === 0 && 'cursor-not-allowed opacity-45')}
        >
          {UI.prev}
        </button>
        <button
          type="button"
          onClick={() => currentIndex < 4 && goTo((currentIndex + 1) as 0 | 1 | 2 | 3 | 4)}
          disabled={currentIndex === 4}
          className={cn('btn-primary', currentIndex === 4 && 'cursor-not-allowed opacity-45')}
        >
          {UI.next}
          <Icon name="arrow-left" size={18} strokeWidth={2} />
        </button>
      </div>

      {/* טבלת השוואה — סעיף 4 */}
      <ComparisonTable currentIndex={currentIndex} viewedFrontId={viewedFrontId} onViewFront={viewFront} />

      {/* שורת סיכום — סעיף 5 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusChip tone="accent">{UI.regularSummary(currentIndex + 1)}</StatusChip>
        <StatusChip tone="neutral">{UI.irregularSummary}</StatusChip>
        <span className="text-sm text-fg-muted">{UI.summaryTag}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg-muted text-pretty">{TIMELINE_NOTE}</p>

      {/* "מה המשמעות?" — סעיף 6, לא מותנה */}
      <InsightDisclosure open={insightOpen} onToggle={() => setInsightOpen((o) => !o)} uid={uid} />
    </div>
  );
}
```

Then implement the three sub-components below it in the same file:

1. **`Timeline({ current, onSelect, uid, reduce })`** — a thin horizontal track with 5 native `<button>`s in `STATIONS` array order (so `field`/day 1 lands first in DOM → visual right under this page's inherited `dir="rtl"`, matching `ActorTypologySelector`'s own documented convention). Each button: `aria-current={i === current ? 'step' : undefined}`, shows `STATIONS[i].timeLabel`, active styling reuses this file's existing "active tab" convention (see the deleted `RoundCard` tabs for the exact class shape: `isActive && 'border-accent bg-accent/10 text-accent'`). Add a `framer-motion` `drag="x"` thumb positioned via `getBoundingClientRect()` of the button refs (not fraction math — measure the real rendered positions so RTL layout is never fought manually), `dragMomentum={false}`, `onDragEnd` computing the nearest button's index by comparing the thumb's released x to each button's measured center and calling `onSelect` with that index. The thumb only needs to work with a pointer; it is a progressive enhancement — the 5 buttons above are already the required "full alternative to drag" per the brief, so a bare-minimum drag implementation (snap-on-release, no live magnetism) is sufficient and should not consume implementation time disproportionate to the rest of this task.

2. **`ComparisonTable({ currentIndex, viewedFrontId, onViewFront })`** — a `surface-elevated` block. First: a heading line rendering `SOURCE_QUESTION`. Then a header row with `TABLE_HEADER.front` / `.regular` / `.irregular` (3-column grid, matching this file's own pre-existing table-row grid convention). Then exactly 5 rows in fixed `STATIONS` order, each row never reordering and never changing height across states (`grid grid-cols-3` per row, same as every state). Per row `i`:
   - Front-name cell: if `i <= currentIndex`, a `<button type="button" onClick={() => onViewFront(STATIONS[i].id)}>` showing `STATIONS[i].frontLabel`, with `aria-pressed={viewedFrontId === STATIONS[i].id}`; else a plain `<span>` with the same label, not a button.
   - Regular cell: `i > currentIndex` → `<StatusChip tone="dim">{NOT_YET_ADDED_LABEL}</StatusChip>`; `i === currentIndex` → `<StatusChip tone="accent">{JUST_ADDED_LABEL}</StatusChip>`; `i < currentIndex` → `<StatusChip tone="neutral" icon={<Icon name="check" size={12} strokeWidth={3} />}>{STATIONS[i].frontLabel}</StatusChip>` (a plain active indicator — reuse the front label itself as the chip's content so it doesn't read as a bare checkmark with no text, since color must never be the only cue).
   - Irregular cell: `i !== 0` → `<StatusChip tone="dim">{NOT_IN_MODEL_LABEL}</StatusChip>` always, regardless of `currentIndex`. `i === 0` → same 3-state logic as the regular cell's row-0 evaluation (`currentIndex === 0` ⇒ `JUST_ADDED_LABEL` tone accent; `currentIndex > 0` ⇒ neutral active; never "טרם נוספה" for this cell).

3. **`InsightDisclosure({ open, onToggle, uid })`** — a `<button type="button" aria-expanded={open} aria-controls={\`${uid}-insight\`} onClick={onToggle} className="btn-secondary mt-5">{UI.toggleInsight}</button>` followed by a conditionally-rendered `<div id={\`${uid}-insight\`} className="surface-elevated mt-3 p-5 sm:p-6">` containing an `<h4>{UI.insightHeading}</h4>` and `INSIGHT_PARAGRAPHS.map((p) => <p key={p} className="mt-3 text-base leading-relaxed text-black text-pretty">{p}</p>)`. Never require any prior interaction/answer to open this — it is a plain, always-available disclosure.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors from `TimePressureExperience.tsx` or `TimePressureContent.ts`.

Run: `npm run lint`
Expected: no new errors in either file.

- [ ] **Step 4: Manual verification — all 5 states, keyboard, reduced motion**

With `npm run dev` running, open `http://localhost:3000/lessons/topic-01#scene-asymmetric` and confirm, in order:
1. Loads at station 0 (day 1), no autoplay, table shows only row 0 as "נוספה" (regular) / "נוספה" (irregular), rows 1–4 "טרם נוספה" / "לא במודל".
2. Clicking each of the 5 timeline buttons in order (0→4) updates image, text, table, and summary count together (1→5 for regular, always 1 for irregular); the live-region text (inspect via accessibility tree, not visually) changes each time.
3. Jumping directly from station 4 to station 0 (click the first button) resets every row back to the day-1 state.
4. Clicking a previous front's name in the table (e.g. at station 3, click row 0's "האויב בשטח") shows "עיון בחזית: האויב בשטח" + the back button, without changing `currentIndex` or the summary count; clicking "חזרה לחזית שנוספה" returns to the default station-3 view.
5. Clicking the *current* station's own front name shows its `frontDetail` with no "עיון בחזית" banner.
6. A future row's front name (e.g. row 4 while at station 1) is plain text, not a button.
7. Tab through the whole component with only the keyboard: every station button, the drag thumb (if focusable), prev/next, every reached front-name button, and the insight toggle must all be reachable and operable with Enter/Space, with a visible focus ring.
8. Emulate `prefers-reduced-motion: reduce` (Playwright `browser_emulate_media` or OS setting) and confirm the image/text swap is instant, no fade.
9. "מה המשמעות?" opens without needing to interact with anything else first, and shows all 3 paragraphs verbatim.

- [ ] **Step 5: Screenshot verification at 1440×1122**

Use the Playwright MCP tools: `browser_navigate` to the URL above, `browser_resize(1440, 1122)`, `browser_take_screenshot` at station 0 and again at station 4 (expanded insight open). Confirm: exactly one image + one text block + one table visible per screen (no map/extra bands), image keeps a fixed 3:2 box with no layout jump between stations, table stays 5 rows at constant height, text is readable at ≥16px, RTL reads correctly (Hebrew right-aligned, day 1 at the visual right end of the timeline), and the section visually fits with the rest of the topic-01 lesson above/below it (no color/typography drift — compare against a feature card or the `ActorTypologySelector` panel just above this section on the same page).

Run: `npm run qa:rtl`
Expected: no new findings attributable to this component (pre-existing unrelated findings elsewhere on the branch are not this task's concern).

- [ ] **Step 6: Commit**

```bash
git add src/components/lessons/topic-01/TimePressureExperience.tsx design/docs/assumptions.md
git commit -m "feat(topic-01): rebuild time-pressure activity as 5-station timeline"
```
