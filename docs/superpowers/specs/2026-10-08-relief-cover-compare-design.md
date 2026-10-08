# Topic 02 · Relief vs. land cover (`#scene-relief-cover`, screen 3): "same hill, three landscapes"

**Status:** design, awaiting user review · **Date:** 2026-10-08
**Scope:** screen 3 of `src/components/lessons/topic-02/ReliefCoverIntroScene.tsx` ("השוואה בין תבליט לתכסית"). The engine is extracted out of `LandformsVisuals.tsx`. New files are listed in §8.

## 1. Problem

Screen 3 is a static five-row table (`COMPARE_ROWS`). It states the relief/land-cover distinction but never *shows* it:

- that the ground's shape can stay identical while everything on it changes;
- that a map encodes the two differently: contour lines for relief, symbols in a legend for land cover;
- that relief usually changes slowly, but engineering works can change it fast.

## 2. Goals / non-goals

**Goals**
1. One hill is shown in four successive states, with the change of state happening in front of the learner:
   - bare ground → natural grove → buildings and orchard → a quarry cut into the hill.
2. Each state has a 3D terrain block ("בשטח") beside a contour map ("במפה"), both derived from **one height function**.
3. **Predict, then see.** Before every transition the learner predicts what will change: relief, land cover, or both. The transition then plays, followed by short supportive feedback.
4. The whole existing comparison is conveyed, including both rate-of-change cells. Nothing may suggest that relief never changes.
5. The full original table closes the activity as "סיכום ההשוואה".

**Non-goals**
- Rewriting any existing lesson text (§3).
- Changing screens 1, 2, 4 or 5 of the scene.
- Changing how any other lesson scene looks. In particular, the "green = vegetation" rule applies **only** inside the new illustration.
- Mobile polish beyond "stacks and doesn't break", since the target is desktop first per `CLAUDE.md`.
- Seasonal animation of vegetation. The seasons are conveyed by the verbatim rate-of-change cell only.

## 3. Content lock

**Verbatim, character for character:**

- All ten cells of `COMPARE_ROWS` and its five row labels. They stay in the scene file unchanged and are passed to the component as props.
- The section heading "השוואה בין תבליט לתכסית".
- The full table, rendered unchanged as the closing summary with today's markup and `CompareHead`.

**Display split (approved 2026-10-08):** the cover "דוגמאות" cell is shown in two parts, split at its existing " · " separator:

- "עצים, שיחים ועשב", shown in state 2;
- "בתים, כבישים, שדות, מטעים, גדרות וקווי חשמל.", shown in state 3.

No word is added or dropped. The summary shows the cell whole.

**Existing sentence reused verbatim:** "מטע נחשב לתכסית מלאכותית משום שנוצר בידי אדם." This comes from `FEATURES.orchard.desc` in the same file.

New strings (§4) are **supportive feedback and UI chrome only**. They never replace or paraphrase a locked cell.

## 4. New copy

This goes through `hebrew-copy-editor` before shipping. All strings live in the scene file (single source of copy).

| Key | Text |
|---|---|
| State labels | "שטח חשוף" · "חורש טבעי" · "מבנים ומטע" · "חציבה" |
| Prediction question (every transition) | "מה ישתנה במעבר מהמצב הנוכחי למצב הבא?" with the pair under it, e.g. "שטח חשוף ← חורש טבעי" (RTL: ← points forward) |
| Options | "תבליט" · "תכסית" · "שניהם" |
| Feedback head | correct: "נכון" · wrong: "התשובה הנכונה: {answer}" |
| Feedback 1→2 (answer: תכסית) | "צורת הגבעה לא השתנתה, ולכן קווי הגובה במפה נשארו זהים. על פני הקרקע נוסף חורש — תכסית טבעית — ובמפה הוא מסומן בסמל משלו." |
| Feedback 2→3 (answer: תכסית) | "במעבר הזה התבליט לא השתנה, וקווי הגובה נשארו במקומם. התכסית הטבעית הוחלפה בתכסית מלאכותית: מבנים ומטע. מטע נחשב לתכסית מלאכותית משום שנוצר בידי אדם." |
| Feedback 3→4 (answer: שניהם) | Lead: "החציבה שינתה את צורת הקרקע, ולכן גם קווי הגובה המתארים אותה השתנו." Then two lines, each tagged with its component's dot: **תבליט** — "חציבת הקרקע שינתה את צורת הגבעה." · **תכסית** — "עצי המטע שעמדו באזור החציבה הוסרו." |
| Map chips | states 2–3: "קווי הגובה: ללא שינוי" · state 4: "קווי הגובה השתנו" |
| Legend | title "מקרא" · "קו גובה" · "קו גובה ראשי" · "חורש" · "מטע" · "מבנים" · "אזור חציבה" · "קווי הגובה לפני החציבה" |
| Disclaimer (beside the legend, always visible) | "המחשה סכמטית — הסמלים אינם מקרא רשמי" |
| Buttons | "המשך" (reveals the next prediction) · "התחילו מחדש" · summary disclosure "הצגת ההשוואה המלאה" / "הסתרת ההשוואה המלאה" |
| Summary heading | "סיכום ההשוואה" |

**Wording rules**
- Cover-only feedback scopes the claim to the transition ("במעבר הזה התבליט לא השתנה"). It never says "התבליט לא משתנה".
- The quarry feedback does not describe the contour geometry ("retreat", "crowd" and the like). The picture shows *where* the lines changed: the previous lines, dashed and labelled as the previous state, sit under the new ones.

## 5. Learning flow

```
[ שטח חשוף ]──▶[ חורש טבעי ]──▶[ מבנים ומטע ]──▶[ חציבה ]        ← stepper (RTL: right → left)
┌ surface-elevated card ────────────────────────────────────────────────────┐
│  ┌ בשטח ─────────────────────┐   ┌ במפה ─── [chip] ──────────┐            │
│  │  terrain block + objects  │   │  contours + cover symbols │            │
│  └───────────────────────────┘   └───────────────────────────┘            │
│                                   מקרא: …   · המחשה סכמטית — …             │
│  ┌ state card ─────────────────────────────────────────────────────────┐ │
│  │ feedback (if arrived by prediction)                                  │ │
│  │ locked table cells for this state                                    │ │
│  │ [המשך] → prediction: question · pair · [תבליט] [תכסית] [שניהם]       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
סיכום ההשוואה  [הצגת ההשוואה המלאה]   → full original table
```

**States and the locked cells each one shows**

| # | State | Arrives by | Correct answer | Locked cells shown |
|---|---|---|---|---|
| 1 | שטח חשוף | opening | — | relief: הגדרה, דוגמאות, אופן הסיווג, הייצוג במפה |
| 2 | חורש טבעי | prediction | תכסית | cover: הגדרה, הייצוג במפה, דוגמאות (first part) |
| 3 | מבנים ומטע | prediction | תכסית | cover: דוגמאות (second part), אופן הסיווג, קצב השינוי |
| 4 | חציבה | prediction | שניהם | relief: קצב השינוי (includes the engineering caveat) |

Each cell is shown with its row label and its layer dot (sand = relief, sage = cover), matching the rest of the scene.

**Rules**
- **Gated forward.** The next state is reachable only by answering its prediction. A wrong answer still advances, because the reveal is the point; the feedback then corrects it.
- **One task at a time.** After feedback, the next prediction is hidden behind "המשך", so the learner reads before answering again.
- **Revisiting.** Any reached state can be re-opened from the stepper. It shows its board, its cells and the stored prediction result, without a question. After state 4 every state is freely navigable. "התחילו מחדש" resets everything to state 1.
- **Summary.** "סיכום ההשוואה" always sits below the card, so a learner who skips the activity can still open it. It is collapsed behind "הצגת ההשוואה המלאה" and expands automatically when state 4 is reached.

## 6. Visual design

**Palette.** Only existing colours are used: the illustration palette `C` in `LandformsVisuals.tsx` and the colours already used in `ReliefCoverTerrain.tsx`, plus the engine's existing mixes and hill-shading of them. No new tokens.

**Terrain block ("בשטח")**
- **Camera and style:** the same camera, papercut cut-edges, hill-shading and build-up/morph animation as the landforms boards.
- **Ground:** a bare-earth ramp from the sand/rim/paper-edge tones, with **no green elevation tint**. Inside this illustration, green always means vegetation.
- **Objects:** SVG drawn on the surface at `terrain.at(x, y)`, painted back to front by screen y, and omitted where `isVisible` is false (behind the hill).
  - **Natural grove:** clumps of round crowns with varied radii and irregular spacing, in green900/700/500.
  - **Orchard:** identical small crowns in straight rows at a fixed spacing. The cue "natural = irregular, planted = orderly" matches `LandCoverMap`.
  - **Buildings:** small papercut boxes with walls `#FDFBF3`/`#E8DCC4` and roofs `#8A6F4D`, as in `ReliefCoverTerrain`.
  - **Quarry:** the cut faces and floor in the engine's existing bare-rock tones (`PIT_ROCK`/`PIT_FLOOR` mixes).
- **Cover transitions (1→2, 2→3):** the block is **not re-rendered**. Only objects animate: they grow from the ground staggered, and removed ones fade and sink.
- **Quarry transition (3→4):** the block morphs with the existing WebGL path, and the orchard trees inside the cut fade out.

**Contour map ("במפה")**
- **Base:** the same tile in plan view, north up, with the existing map styling: grid, contours `#C9A56B`, index contour `#8A6F4D`, and elevation labels.
- **Schematic land-cover symbols:**
  - grove: light green patches with irregular dots;
  - orchard: a green parcel with a regular grid of dots;
  - buildings: small dark squares (`C.ink`);
  - quarry area: a pale rock fill with short ticks along its upper rim, pointing into the cut.
- **States 1–3:** the contour layer is the same memoised element and is never recomputed. The chip reads "קווי הגובה: ללא שינוי".
- **State 4:** the contours are **re-derived from the quarried height function** and morph with the existing map animation. The state-1–3 contours stay drawn underneath, dashed and faded, as the legend entry "קווי הגובה לפני החציבה". Where nothing changed, the old and new lines coincide and the dashes are hidden, so only the changed stretch stands out. The chip reads "קווי הגובה השתנו".
- **Legend:** HTML below the map. It lists the contour entries always, plus only the symbols present in the current state. The disclaimer "המחשה סכמטית — הסמלים אינם מקרא רשמי" sits beside it.

**Layout (≥ md)**
- The stepper sits on top, with the two boards side by side (`md:grid-cols-2`, like `FormBoard` in `LandformsScene`).
- The board captions reuse `BoardView` from `LandformsScene`.
- The state card spans the full width under the boards.
- Below md, everything stacks.

**RTL**
- Logical properties only.
- The boards are never mirrored.
- Every SVG `<text>` sets `textAnchor`.
- Chips and the legend are HTML, not SVG text.

## 7. Geometry

- **Tile:** 100 × 50 map units, `BASE = 100` m, levels 110–160 every 10 m, index contour at 150. These are the landforms constants.
- **Hill:** one rounded hill, offset west of centre (about x = 42, y = 24), peaking at about 165 m, so that a strip of plain remains in the east for buildings. Implementation may tune it.
- **Quarry:** a plan-view mask `w(x, y)` that is 1 inside the cut, 0 outside, with a smooth **transition band** of about 1–1.5 units at its edge.
  - Quarried height: `h_q = h − w · max(0, h − F)`, with a floor level `F` of about 120 m.
  - The cut sits on the hill's **south-east flank**, which faces the camera, so it is visible on the block. It opens downhill, where `h ≤ F` and nothing is removed.
- **Cover placement:**
  - **Grove (state 2):** on the hill's slopes.
  - **Orchard (state 3):** rows on the lower south-east flank, running up into the future cut.
  - **Buildings (state 3):** on the eastern plain.
- **State 4 cover:** state 3 minus every orchard tree with `w > 0`, i.e. inside the cut **or** its transition band.

Everything in the illustration is derived from these definitions. No hand-drawn contours.

## 8. Architecture and files

| File | Change |
|---|---|
| `topic-02/terrainBlockGeometry.ts` **(new, pure TS)** | Moved verbatim from `LandformsVisuals`: tile constants, camera, `Pt`/`HeightFn`/`Grid`, `sampleGrid`, `contourRings`, ring/path helpers, terrain build (generalized to take any `{ h, kz, ky? }` plus a `look`: ground ramp and per-quad tint hook), `isVisible`, `drape`, `getMorphMesh`, `lerpArr`. Free of React and framer, so `node:test` can import it. |
| `topic-02/terrainBlock.tsx` **(new)** | Moved from `LandformsVisuals`: the WebGL `morphRenderer`, the animated block board (build-up plus morph, with an overlay slot) and the contour-morph hook. |
| `topic-02/LandformsVisuals.tsx` | Keeps `SPECS`, `FEATURES`, the overlays, map labels and slopes, and imports the engine. Its landform `look` reproduces today's green tint exactly. **Rendered output must be pixel-identical.** |
| `topic-02/LandformsScene.tsx` | `export` added to `BoardView`. No behaviour change. |
| `topic-02/reliefCoverCompare.data.ts` **(new, pure TS)** | Hill and quarry height functions, mask `w`, cover placements per state, state ids, correct answers, and a small state reducer for predict/advance/revisit/reset. |
| `topic-02/ReliefCoverCompare.tsx` **(new)** | The component: stepper, two boards, legend, disclaimer, chips, state card, prediction, and the summary table. Receives all copy as props. |
| `topic-02/ReliefCoverIntroScene.tsx` | Screen 3: the table is replaced by `<ReliefCoverCompare … />`. `COMPARE_ROWS` stays unchanged. The §4 strings are added. |
| `scripts/qa/relief-cover-compare.test.mjs` **(new)** | Geometry and reducer tests (§10). |
| `scripts/qa/shot-relief-cover.mjs` **(new)** | Screenshots of states 1–4, the summary, and the landforms before/after diff. |
| `design/docs/assumptions.md` | Appended, never rewritten: hill/quarry parameters and the schematic-symbols decision. |

## 9. Motion and accessibility

- **Durations:** cover objects about 0.5 s, staggered. The quarry morph uses the engine's `MORPH_S` (0.9 s). Feedback appears after the transition lands.
- **`prefers-reduced-motion`:**
  - every change is instant;
  - the block shows its final SVG with no morph;
  - the map contours swap without tracing.
- **No WebGL:** falls back to the static SVG board, as the engine does today.
- **Keyboard and screen readers:**
  - The stepper is a list of buttons with `aria-current="step"`, and unreached states are `disabled`.
  - Prediction options use `aria-pressed`.
  - Feedback is announced in an `aria-live="polite"` region.
  - Each board's `aria-label` names the state, e.g. "חורש טבעי — בשטח".
  - Everything is reachable by keyboard.

## 10. Verification

1. **Engine extraction is a no-op for landforms.**
   - Before touching anything, capture the 5 landforms (block plus map) at 1440 px, after the build-up has settled.
   - Capture them again after the extraction. The pixel diff must be **0**. `tsc --noEmit` is clean.
2. **Geometry tests** (`node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test …`):
   - States 1–3 use one height function. The contour rings are deep-equal across them.
   - Sampled heights differ between state 3 and state 4 **only where `w > 0`**, including the transition band, and differ somewhere in it.
   - For every level and every grid cell whose four corners are unchanged, the state-4 contour segments equal the state-3 ones. Contour change is confined to cells touching `w > 0`.
   - Every vertex of a state-4 contour satisfies `|h_q(p) − L| ≤ ε`, i.e. it sits on the quarried surface.
   - At least one level visibly changes. Some cut-floor samples are visible from the camera (`isVisible`).
   - No state-4 orchard tree has `w > 0`, and at least one tree was removed. Every object sits on the surface of its state (base height = `h` or `h_q` at its point).
   - The "דוגמאות" split helper joins its two parts back to the original cell exactly.
   - Reducer: forward needs a prediction, wrong answers advance, revisit shows stored results, reset clears.
3. **Content lock:** the summary renders straight from the `rows` prop (the same objects, no copies). `shot-relief-cover.mjs` asserts in the DOM that every `COMPARE_ROWS` cell appears verbatim in the opened summary, and that each state card shows exactly its §5 cells.
4. **Render loop** (`CLAUDE.md`): screenshots of states 1–4 and the opened summary at 1440 px. Check overlap, clipping, legibility and the dashed previous-contour reading, then fix the deltas.
5. **Reviews:**
   - `hebrew-copy-editor`: §4 strings.
   - `military-geo-editor`: the quarry depiction, map-symbol wording and disclaimer.
   - `cartographic-reviewer` and `visual-qa-reviewer`: the boards.
   - `rtl-qa-reviewer`: the component.
6. **Build:**
   - My own dev server runs on `NEXT_DIST_DIR=.next-relief`.
   - `next build` runs **only in a temporary git worktree**, because concurrent sessions share `.next/`.

## 11. Risks and notes

- **Concurrent sessions.** The topic-02 contour-mountain files and others are being edited by another session. This work touches none of them. Before editing I snapshot the files I own, and re-read them before each edit.
- **Extraction size.** The landforms extraction moves about 700 lines. The pixel-diff gate in §10.1 is the safety net. If any diff remains, the extraction is reverted and approached in smaller moves.
- **Previous contours.** The dashed "before" lines could be misread as extra contour lines. They are labelled in the legend as the previous state, faded, and drawn only in state 4.
- **Map symbols.** They are schematic, not an official legend. This is said on screen (the §4 disclaimer) and recorded in `assumptions.md`.
