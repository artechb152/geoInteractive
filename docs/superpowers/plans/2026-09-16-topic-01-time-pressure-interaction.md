# Plan: topic-01 `#scene-asymmetric` — replace `<TimeAsymmetry />` with the "כשהזמן משנה את מאזן הכוחות" time-pressure interaction

Handoff package: `design/handoff/asymmetric-time-v3/` (`IMPLEMENTATION-SPEC.md`,
`interaction-content.json`, `asset-manifest.json`, `CLAUDE-CODE-PROMPT.md`). Approved mockup:
`design/mockups/asymmetric-time-realistic-v3.png` (visual direction only — its top search bar,
top nav, right-hand lesson sidebar and "01/02/03" page-level stepper are page-shell chrome that
does **not** belong to this component; do not build any of that). This plan is the sole source
of task breakdown — the three files above remain the source of truth for exact copy, coordinates
and behavior; read them yourself before starting any task, don't rely solely on this plan's
paraphrasing.

**No git commits.** The user explicitly asked for local-only implementation ("השלם את המימוש
המקומי; אל תפרסם ואל תעשה commit ללא בקשה") — work directly on `main` in the primary working
tree (no worktree; this repo's established practice for a single self-contained addition to one
topic-01 scene file, see `docs/superpowers/plans/2026-09-06-topic01-asymmetric-actor-tabs.md`'s
own reasoning for the same class of task). Every implementer must leave its changes **uncommitted**
in the working tree — do not run `git add`, `git commit`, or any other git write command. The
controller tracks progress and diffs via plain file snapshots instead of commit ranges.

The three raster assets are already copied and already tracked in git at
`public/assets/lessons/topic01/scene-asymmetric/time-pressure/{pressure-map-daylight,irregular-landscape,takeaway-landscape}.png`
(verified byte-identical to `design/handoff/asymmetric-time-v3/assets/` via `copy-assets.ps1
-CheckOnly` and `git ls-files`) — no task needs to copy or touch them again.

## Global Constraints

- **Scope of edits.** Only these files may change:
  - `src/components/lessons/topic-01/AsymmetricScene.tsx` — remove the `<TimeAsymmetry />` call
    and its now-dead supporting code (see Task 1), add the new component's import and call in
    the exact same position. Do not touch any other part of this file (`ActorTypologySelector`,
    `TypologyTable`, `PillarSimulator`, `TacticMatchExercise`, `DragExercise`, the closing
    "המסקנה" block, or the top-level `AsymmetricScene()` function body beyond that one swap).
  - New file `src/components/lessons/topic-01/TimePressureContent.ts` (content/data module).
  - New file `src/components/lessons/topic-01/TimePressureExperience.tsx` (the component; may
    contain multiple private subcomponents in one file, matching this directory's existing
    convention — e.g. `LevelsScene.tsx` and `AsymmetricScene.tsx` itself each hold 5-10 private
    subcomponents per file).
  - `design/docs/assumptions.md` — append entries for any judgment call flagged below (create the
    file if it does not already exist; check first).
  - Do not touch `tailwind.config.ts` (it currently has an unrelated local modification already
    in the working tree — leave it exactly as you found it), any other scene file, `AGENTS.md`,
    or anything under `design/handoff/` or `design/mockups/` (read-only references).
- **Content is transcribed, never paraphrased.** Every visible Hebrew string (titles, event text,
  questions, option text, feedback, causal explanations, node labels/definitions, button labels,
  irregular/takeaway copy) must be copied verbatim from
  `design/handoff/asymmetric-time-v3/interaction-content.json` into `TimePressureContent.ts` —
  same characters, same punctuation (including `׳`/`״`), no fixed typos, no added copy beyond
  the few small UI-chrome strings this plan explicitly authorizes below (locked-step captions,
  `aria-label`s, the map's accessible description). Do not copy any text from the mockup image —
  the README in the handoff package explicitly warns the mockup's on-image text contains a
  generation typo ("מצב 3 מתוך 3") that `interaction-content.json` is the correction for.
- **Design tokens.** This file (`AsymmetricScene.tsx`) already uses the `bg`/`fg`/`border`/
  `accent`/`brand`/`status` semantic namespace throughout (see `tailwind.config.ts`), plus the
  `.surface`, `.surface-elevated`, `.chip`, `.btn-primary`/`.btn-secondary`/`.btn-ghost` utility
  classes from `globals.css`. Use ONLY that namespace and those utilities. Do **not** introduce
  the `paper`/`olive`/`ember`/`pine`/`tanline` namespace — that is a different visual system
  (the landing-page redesign, see `design/docs/design-spec.md`) and is out of scope here even
  though `#D97E2B` happens to be shared between `accent.DEFAULT` and `ember.DEFAULT`. Use
  `accent` for the one "current focus" color throughout (map current-node line/border/badge,
  selected-radio border, primary buttons) — never introduce a new hex value.
- **Fonts, RTL, images** — same project-wide rules as always (`CLAUDE.md`): Heebo/Rubik via the
  existing `font-sans`/`font-display` tokens, logical properties (`ms-`/`me-`/`ps-`/`pe-`/
  `start-`/`end-`) for all layout and text alignment, no mirrored images, explicit `textAnchor`
  on any raw SVG `<text>` (prefer HTML labels over SVG `<text>` — see Task 2). **One documented
  exception:** the map's 6 node anchors are positioned with physical inline `style={{ left:
  '…%', top: '…%' }}` (never a Tailwind `left-`/`right-` utility class) because
  `asset-manifest.json`'s coordinates are explicitly physical-image coordinates ("x משמאל לימין…
  ללא קשר ל-RTL") that must never flip under RTL — this is intentional, not an oversight; note it
  in `design/docs/assumptions.md` (Task 2) so a future RTL audit doesn't "fix" it.
- **Images** go through `IsometricAsset` (`src/components/assets/IsometricAsset.tsx`), exactly
  like every other image already in this file — never a raw `<img>`. None of the 3 images match
  `IsometricAsset`'s fixed `aspect` presets (`16/9`/`21/9`/`1/1`/`4/3`), so use this file's own
  established technique (see e.g. the `TOPIC01-ASYM-ACTOR-*-BANNER` and `TOPIC01-ASYM-PILLAR-*`
  calls): wrap in a `div` whose className/style sets the REAL aspect ratio, pass any nominal
  `aspect` prop to `IsometricAsset` and cancel it with `className="... [aspect-ratio:auto]"`, so
  the wrapper's ratio is what actually renders. Exact ratios and `fit` values are specified per
  task below — the map specifically must use `fit="contain"`, never `fit="cover"` (the spec
  explicitly forbids cropping the map).
- **Motion.** Use `framer-motion` (already imported elsewhere in this file) and this project's
  established `useReducedMotion()` pattern (see `MDOScene.tsx`, `LandformsScene.tsx`,
  `TopographyScene.tsx` for precedent) to skip/shortcut animations under
  `prefers-reduced-motion`. New-connection reveals animate 350-500ms, once, on the transition
  that creates them — never looping/pulsing, never on a review pass that has already been seen
  once for that round+submitted combination.
- **No server, no analytics, no persistence across reloads.** Everything is local React state in
  `TimePressureExperience`. Do not wire this into any progress/analytics system (none exists in
  this codebase today — confirmed by search).
- **Verification commands available in this repo** (do not assume others exist):
  `npx tsc --noEmit`, `node scripts/qa/rtl-audit.mjs`, `npm run build` (static export — this is
  the closest thing to an integration test here). There is no test runner and no committed
  ESLint config, so do not run/rely on `npm run lint`; do not claim to have run it if you didn't.
  A dev server may already be running at `http://localhost:3000` — check before starting a
  second one.

## Shared data contract (authoritative — all 3 tasks depend on this exact shape)

`TimePressureContent.ts` must export, at minimum, types and constants shaped like this (field
names are binding; every string value must come from `interaction-content.json` as described
above — do not retype the Hebrew here from this plan, read the JSON directly):

```ts
export type PressureNodeId = 'military' | 'economy' | 'public' | 'politics' | 'international';
export type MapNodeId = 'center' | PressureNodeId;

export type RoundOption = { id: string; text: string };
export type RoundContent = {
  id: 'opening' | 'accumulation' | 'picture';
  stepLabel: string;
  title: string;
  event: string;
  question: string;
  options: RoundOption[]; // length 2
  correctOptionId: string;
  feedbackByOption: Record<string, string>;
  causalExplanation: string;
  newPressureIds: PressureNodeId[];
  previousPressureIds: PressureNodeId[];
};

export const ROUNDS: RoundContent[]; // 3 entries, in JSON array order (opening, accumulation, picture)

export type TransferChoice = { id: string; text: string };
export const TRANSFER: {
  title: string; event: string; instruction: string;
  claimQuestion: string; claims: TransferChoice[]; correctClaimId: string;
  evidenceQuestion: string; evidence: TransferChoice[]; correctEvidenceId: string;
  success: string; wrongClaim: string; wrongEvidence: string; wrongBoth: string;
};

export const NODE_LABELS: Record<MapNodeId, string>;
export const NODE_DEFINITIONS: Record<MapNodeId, string>;
export const MAP_TEXT = { title: string; subtitle: string }; // interaction-content.json's mapTitle/mapSubtitle
export const SCENARIO_LABEL: string; // "scenarioLabel"
export const BUTTONS: { check; next; previous; transfer; checkTransfer; retryTransfer; reset: string };
export const FEEDBACK_HEADINGS: { correct; incorrect; complete: string };
export const IRREGULAR = { title: string; body: string; note: string }; // irregularTitle/irregularBody/irregularNote
export const TAKEAWAY = { title: string; text: string; note: string }; // takeawayTitle/takeaway/takeawayNote
export const TITLE: string; // "כשהזמן משנה את מאזן הכוחות"
export const INTRO: string; // interaction-content.json's "intro"

// From asset-manifest.json's mapCoordinates.nodes — normalized fractions [x, y], physical
// left-to-right / top-to-bottom, independent of RTL. viewBox is exactly the source image's
// pixel size (do not rescale).
export const MAP_IMAGE_VIEWBOX = { width: 1536, height: 1024 } as const;
export const MAP_NODE_ANCHORS: Record<MapNodeId, { anchor: [number, number]; label: [number, number] }> = {
  center:        { anchor: [0.50, 0.53],  label: [0.50, 0.585] },
  military:      { anchor: [0.48, 0.22],  label: [0.48, 0.30]  },
  international: { anchor: [0.19, 0.38],  label: [0.19, 0.475] },
  economy:       { anchor: [0.82, 0.385], label: [0.82, 0.515] },
  politics:      { anchor: [0.27, 0.73],  label: [0.27, 0.835] },
  public:        { anchor: [0.745, 0.715],label: [0.745, 0.82] },
};
```

Runtime state shape, owned by `TimePressureExperience` (not exported — internal to the
component; documented here so Tasks 1-3 agree on it without re-deriving it):

```ts
type NodeVisualState = 'inactive' | 'previous' | 'current';
type RoundRuntimeState = { selectedOptionId: string | null; submitted: boolean; firstAttemptCorrect: boolean | null };
type TransferRuntimeState = { claimId: string | null; evidenceId: string | null; submitted: boolean; firstAttemptCorrect: boolean | null };

// activeView: which of the 3 rounds is currently displayed, OR the transfer stage.
// 0 | 1 | 2 selects ROUNDS[activeView]; 'transfer' selects the transfer section.
type ActiveView = 0 | 1 | 2 | 'transfer';
```

**Map node-state derivation (binding — this is the one rule every other behavior rule follows
from):**

```ts
function computeNodeStates(view: ActiveView, roundStates: RoundRuntimeState[]): Record<PressureNodeId, NodeVisualState> {
  if (view === 'transfer') {
    // Every node ever exposed across all 3 rounds reads as neutral 'previous'; nothing is
    // 'current' — the transfer scenario is a new, unrelated case and must not carry a hint
    // forward from round 3's highlight.
    const allExposed = ROUNDS.flatMap(r => r.newPressureIds);
    return Object.fromEntries(ALL_NODE_IDS.map(id => [id, allExposed.includes(id) ? 'previous' : 'inactive'])) as any;
  }
  const round = ROUNDS[view];
  const submitted = roundStates[view].submitted;
  const states = Object.fromEntries(ALL_NODE_IDS.map(id => [id, 'inactive'])) as Record<PressureNodeId, NodeVisualState>;
  for (const id of round.previousPressureIds) states[id] = 'previous';
  if (submitted) for (const id of round.newPressureIds) states[id] = 'current';
  return states;
}
```

This is why "going back to round 1 after round 3 doesn't show future highlights" and "the map
state derives from the viewed round, not the furthest reached" both fall out for free: each
round's own `previousPressureIds`/`newPressureIds` (already authored per-round in the JSON) are
the only inputs, never a cross-round accumulator. `center` is not part of `ALL_NODE_IDS` — render
it as a constant neutral hub, never colored by round state.

---

## Task 1 — Content module, map visualization, round interaction loop, scene integration

### Where this fits

`src/components/lessons/topic-01/AsymmetricScene.tsx` currently renders, in order:
`ActorTypologySelector`, `TypologyTable`, `PillarSimulator`, then `<TimeAsymmetry />` (call site
~line 368), then `TacticMatchExercise`, `DragExercise`, and a closing conclusion block.
`TimeAsymmetry` (function def ~line 1058) renders a draggable 5-step timeline scrubber
(`TimelineScrubber`, ~line 1165) plus a "fronts" comparison table (`FrontRow`/`FrontMark`,
~line 1291+), backed by module-level constants `TIME_STEPS`, `FRONTLINE`, `INTERNAL_FRONTS`,
`ICON_PROMPT_STYLE` (~lines 989-1057). Find the exact current ranges by name/content, not by
these line numbers — prior edits may have shifted them. Confirm via grep that
`TimeAsymmetry`/`TimelineScrubber`/`FrontRow`/`FrontMark`/`TIME_STEPS`/`FRONTLINE`/
`INTERNAL_FRONTS`/`ICON_PROMPT_STYLE` are not referenced anywhere else in the file (they are not,
per a prior grep pass — but re-verify) before deleting them. After deletion, `useRef` becomes
unused in this file's top import (`import { useRef, useState } from 'react';`) — drop it from
that import if nothing else in the file uses `useRef` (re-check; `TimelineScrubber` was its only
user as of this plan).

### Requirements

1. **`TimePressureContent.ts`** — implement the full shared data contract above, transcribed from
   `interaction-content.json` and `asset-manifest.json` as described in Global Constraints.
2. **Remove `TimeAsymmetry` and its now-dead supporting code** from `AsymmetricScene.tsx` per the
   scope note above. Replace the call site with the new component, same position in the JSX
   (`<PillarSimulator />` immediately before, `<TacticMatchExercise />` immediately after,
   unchanged):
   ```tsx
   <TimePressureExperience />
   ```
   Add the import: `import { TimePressureExperience } from './TimePressureExperience';`
3. **`TimePressureExperience.tsx` — header.** `<h3>` with `TITLE`, matching this file's existing
   sub-section heading style (`font-display text-2xl font-bold ... sm:text-3xl` + the
   `<span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />` underline
   convention already used for the old `TimeAsymmetry` heading and `LevelsScene`'s "תרגול גרירה"
   heading) — then `INTRO` as a `text-base text-fg-muted` paragraph below it. Wrap the whole
   component in `<div className="mt-12">` matching sibling spacing.
4. **Round stepper (3 steps).** A `role="tablist"` row of 3 buttons, one per `ROUNDS[i].stepLabel`,
   rendered in `ROUNDS` array order (index 0 lands at the visual right in this RTL page — do not
   reorder). Each tab: `role="tab"`, `aria-selected={activeView === i}`, `aria-controls` pointing
   at the shared round-panel's id. A tab for index `i` is enabled (clickable, sets
   `activeView = i`) only when `i <= furthestRoundIndex` (state described below); a locked tab
   gets a real `disabled` attribute (not just a visual style — must not be focusable/operable)
   plus a small always-visible caption under its label (not a `title` tooltip — "don't rely on
   hover alone") reading `טרם נפתח` (new, minimal UI-chrome string; not in `interaction-content.json`
   — record this in `design/docs/assumptions.md`, see Task 3). Visually distinguish 3 states —
   active (accent), completed/reachable-but-not-active (neutral, still clickable), locked (muted +
   caption) — using more than color alone (e.g. a small check glyph on completed tabs, via the
   existing `Icon name="check"`).
5. **State owned by `TimePressureExperience`:**
   - `activeView: 0 | 1 | 2 | 'transfer'`, initial `0`.
   - `furthestRoundIndex: 0 | 1 | 2`, initial `0` — the furthest round index the learner has
     opened; a round tab for index `i` is clickable iff `i <= furthestRoundIndex`. Advancing via
     the "next" button raises this; navigating backward via a tab or the "previous" link does not
     lower it.
   - `roundStates: RoundRuntimeState[3]`, initial `{ selectedOptionId: null, submitted: false,
     firstAttemptCorrect: null }` for each.
   - `transferState: TransferRuntimeState`, initial all-null/false.
   - `openNodeId: MapNodeId | null` — which map node's definition disclosure is open (Task 2).
6. **Event/answer card** (right column — see layout below), for `activeView` 0/1/2, driven by
   `round = ROUNDS[activeView]` and `state = roundStates[activeView]`:
   - `SCENARIO_LABEL` as a small `.chip`.
   - `round.title` as a heading, `round.event` as body text (`text-base`).
   - `<fieldset>` with `<legend>` = `round.question`, containing `round.options.length` (2)
     selectable option cards. Implement as real `<input type="radio" name={`round-${round.id}`}
     value={opt.id} className="peer sr-only">` inside a `<label>` styled as the visible card
     (Tailwind 3.4's `has-[:checked]` variant, e.g. `has-[:checked]:border-accent
     has-[:checked]:bg-accent/10`, is available in this project — `tailwindcss@3.4.17` — use it
     instead of driving the visual state from React `className` conditionals, so the native
     input remains the single source of truth for keyboard/AT). Selecting an option before
     submit only updates `selectedOptionId` (controlled `checked`/`onChange`) — it does not
     submit. Changing the selection before submit is allowed. Once `submitted` is true, disable
     both inputs (`disabled` attribute) so the choice is locked; still show which was selected.
   - `BUTTONS.check` button: `disabled` until `selectedOptionId` is set; onClick sets
     `submitted = true` and computes `firstAttemptCorrect = selectedOptionId === round.correctOptionId`
     (only if this is the first submit for this round — never overwrite `firstAttemptCorrect`
     once set, though in this activity a round can only be submitted once at all, since inputs
     lock after submit).
   - After submit: an `aria-live="polite"` region showing, together: `FEEDBACK_HEADINGS.correct`
     or `.incorrect` (by correctness) as a small heading, then
     `round.feedbackByOption[selectedOptionId]`, then `round.causalExplanation`. This is the one
     announcement — do not stage it across multiple `aria-live` updates.
   - Continue control, in this exact DOM order (check/reset button ordering in this codebase is
     a previously-litigated convention — see `LevelsScene.tsx`'s "בדוק תשובות" `flex ...
     justify-end` block and git history `3be1c05 fix(topic-01): match check/reset button DOM
     order to LevelsScene` — the primary action is the first DOM child in a `justify-end` RTL
     row, landing at the visual right):
     1. Primary button, visible only when `submitted`: label `BUTTONS.next` for `activeView` 0/1,
        `BUTTONS.transfer` for `activeView === 2`. Clicking it: for 0/1, sets
        `activeView += 1` and raises `furthestRoundIndex` to at least the new index; for 2, sets
        `activeView = 'transfer'` (does not change `furthestRoundIndex`, which stays `2`).
     2. `BUTTONS.previous` link/button, visible whenever `activeView` is `1` or `2` (a number, not
        `'transfer'`) regardless of submit state — clicking it sets `activeView -= 1`. Does not
        reset that earlier round's own `roundStates` entry (already-answered rounds keep their
        state — that's the whole point of `roundStates` being an array, not a single slot).
   - Before submit, the primary button slot shows `BUTTONS.check` (disabled until a selection is
     made) instead of next/transfer.
7. **`PressureMap` subcomponent** (left column) — presentational, takes `nodeStates:
   Record<PressureNodeId, NodeVisualState>`, `openNodeId`, `onToggleNode(id: MapNodeId)`:
   - Outer wrapper `div` with the real image aspect ratio
     (`style={{ aspectRatio: '1536 / 1024' }}` or the Tailwind arbitrary-value equivalent), 
     containing (a) `IsometricAsset` with `fit="contain"` (never `"cover"`) rendering
     `pressure-map-daylight.png` at `className="... [aspect-ratio:auto]"` per the
     cancel-nominal-aspect convention, `alt` = the manifest's Hebrew `alt` string for this asset
     (transcribe verbatim from `asset-manifest.json`), and (b) an absolutely-positioned
     `<svg viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid meet"
     className="absolute inset-0 size-full" aria-hidden>` for the 6 connector lines only (icons/
     labels/badges are HTML overlays, not SVG, per Global Constraints' "prefer HTML labels"
     guidance) plus a visually-hidden `<p>` accessible description of what the lines mean ("קווים
     מייצגים קשרי השפעה בין הזירות למוקד המרכזי, לא מסלולי תנועה" — new minimal UI-chrome string,
     record in assumptions.md).
   - For each of the 5 `PressureNodeId`s, draw one `<line>` (or `<path>`) in the SVG from
     `MAP_NODE_ANCHORS.center.anchor` to `MAP_NODE_ANCHORS[id].anchor` (both fractions × 1536/1024
     to get SVG user-space coordinates), colored/weighted by that node's `NodeVisualState`:
     `inactive` → thin neutral (`stroke-border-strong` equivalent hex, low opacity), `previous` →
     clearly visible neutral (`stroke-fg-muted`-equivalent, no orange), `current` → `accent`
     orange, slightly thicker. A node's line+label transitioning into `current` for the first
     time animates in (350-500ms fade/draw), respecting `useReducedMotion()`; a state that was
     already `current`/`previous` on a previous render for the same round+submitted combination
     does not replay the animation (key the animation off round id + submitted, not off every
     re-render).
   - For each of the 6 `MapNodeId`s (center + 5), an HTML overlay positioned via **physical**
     inline `style={{ left: `${x * 100}%`, top: `${y * 100}%`, translate: '-50% -50%' }}` at its
     `label` fraction (not `anchor` — anchors are for the SVG line endpoints only), containing:
     - A `<button type="button">` showing `NODE_LABELS[id]`, `aria-expanded={openNodeId === id}`,
       `aria-controls` pointing at the shared definition region's id, `onClick` toggles
       `openNodeId` (same id → close / null, different id → switch). This button is the "open a
       short explanation on click or focus" mechanism from the spec — a real button, so
       Enter/Space work natively; do not implement a hover-only tooltip.
     - For `previous`/`current` states (never for `inactive`, never for `center`), an additional
       small `.chip`-styled tag: `נחשף קודם` for `previous`, `מוקד נוכחי` for `current` (new
       minimal UI-chrome strings — not learner-facing pedagogical content, just state labels;
       record in assumptions.md). `current`'s chip and label additionally get the `accent`
       border/text treatment; `previous`'s stays neutral. This satisfies "color alone must not
       carry the state" — text differs, not just color.
     - `center`'s label is always the plain neutral style (never colored by round state, no chip).
   - A single shared definition region below the map image (still inside the map's own card),
     `id` matching the buttons' `aria-controls`, `aria-live="polite"`: when `openNodeId` is set,
     shows `NODE_LABELS[openNodeId]` + `NODE_DEFINITIONS[openNodeId]`; otherwise a short neutral
     prompt (author a minimal one, e.g. "בחרו זירה במפה לקבלת הסבר קצר" — record in
     assumptions.md). This is the general-definition disclosure only — never the round's
     `causalExplanation`, which lives exclusively in the event/answer card and only appears after
     that round's own submit.
   - `MAP_TEXT.title`/`MAP_TEXT.subtitle` render above the map image, on a plain light area (not
     over the image) — matches the mockup's "מפת הלחצים" placement.
8. **Layout — the "main area."** Two-column grid at `lg`+ (`grid-cols-[360px_1fr] gap-5` or
   similar — the exact split is adjustable per Global "spacing" guidance in the handoff spec,
   360px/~930px at 1290px content width is a reasonable starting point for the ~32%/68% split;
   tune for readability, don't force text to wrap awkwardly). **Event/answer card is the FIRST DOM
   child** (renders at the visual right in RTL, matching the handoff spec's explicit "כרטיס
   האירוע והתשובות מימין, מפה גדולה משמאל"); `PressureMap` is the second. Below `lg`, stack them
   (card above map is fine — not pixel-specified for narrower widths; this project's global rule
   is "1440px is the only target until desktop is signed off," so a reasonable graceful stack
   below `lg` is sufficient, not a pixel-tuned mobile layout).
9. **Focus management.** On any `activeView` change (round tab, next, previous — not on the
   node-definition toggle or on radio selection), move focus to the round/section heading (e.g. a
   `tabIndex={-1}` ref on the round title or "עכשיו הסבירו את הקשר" heading, `.focus()` in a
   `useEffect` keyed on `activeView`) per the spec's explicit focus-management requirement.
10. Do **not** implement the transfer section, irregular-actor strip, or reset button in this
    task — those are Task 2. It is fine (and expected) for `activeView === 'transfer'` to be
    reachable (the round-3 continue button must already set it, per requirement 6, so Task 2 has
    something to render into) even though nothing renders for it yet — render nothing (or a
    minimal empty fragment) for `'transfer'` in this task; Task 2 fills it in.

### Verification

1. `npx tsc --noEmit` — zero errors introduced by this task's files.
2. `node scripts/qa/rtl-audit.mjs` — zero new offenders in `AsymmetricScene.tsx` or
   `TimePressureExperience.tsx` (the physical `left`/`top` inline styles on map nodes are NOT
   flagged by this script — it only scans Tailwind utility classes — but double-check you used
   inline `style`, never a `left-`/`right-` class, for those specifically).
3. Manually exercise, in a running dev server (`npm run dev` if one isn't already running) at
   1440px width via Playwright or the browser: initial state (round 1, nothing selected, check
   disabled, no map highlight beyond neutral), select/change selection before submit, submit
   correct and incorrect for round 1, confirm map shows `military` as `current` only after
   submit either way, confirm causal explanation text appears, click next → round 2, confirm its
   `military` node now shows `previous` (with chip) even before submitting round 2, submit round 2
   and confirm `economy`+`public` become `current`, click previous back to round 1 and confirm it
   shows ONLY round 1's own state (not round 2/3 leftovers), re-select is blocked (inputs
   disabled) but the previously-submitted feedback/explanation still shows. Repeat through round
   3, confirm the round-3 continue button reads `BUTTONS.transfer` and clicking it doesn't crash
   (nothing needs to render yet) and that clicking a round tab afterward correctly returns to
   that round's real state.
4. Click a map node label at each of its 3 states and confirm the shared definition region
   updates; confirm it's reachable and toggleable via keyboard (Tab to the button, Enter/Space).
5. Toggle OS/browser `prefers-reduced-motion` and confirm the connector-line reveal has no
   transition (final state renders immediately) without otherwise changing behavior.
6. Report exactly what was run and its output/screenshots — do not claim a check passed without
   having run it.

---

## Task 2 — Irregular-actor strip, transfer (bridge) question, takeaway, reset

Builds on Task 1's file. Read `TimePressureExperience.tsx` and `TimePressureContent.ts` as Task 1
left them before starting.

### Requirements

1. **Irregular-actor strip**, always rendered (not gated by any round state), placed below the
   map card per the handoff spec's layout order (item 5: "מתחת למפה"). Two-column-ish band: the
   `irregular-landscape.png` image via `IsometricAsset` (village on the right per
   `asset-manifest.json`'s `objectPosition: "right center"`), wrapped at a flat custom aspect
   ratio wider than the source's own 2172:724 (e.g. `aspect-[2172/300]` or similar — must be
   wide enough that `fit="cover"` crops only top/bottom, never the sides, so the village stays
   fully visible; verify this arithmetically or visually before finalizing the exact ratio),
   `fit="cover"`, default `position="center"` (no need for `IsometricAsset` position variants —
   picking a flat-enough box makes left/right cropping physically impossible). Overlay
   `IRREGULAR.title`, `IRREGULAR.body`, `IRREGULAR.note` on a CSS gradient scrim fading from
   transparent (photo side) to a near-solid light ground (text side) — same visual technique
   already used for the `ACTOR_BANNER` scrim in `ActorTypologySelector` in this same file (read
   it for the gradient/scrim technique, not its colors). All 3 strings render regardless of
   round/transfer state — this block never claims the irregular actor is immune to pressure (per
   `IRREGULAR.note`) and never shows a numeric "life" meter or percentage of any kind.
2. **Transfer section**, rendered only when `activeView === 'transfer'` (i.e. after the round-3
   continue button was clicked — Task 1 already wires that transition). Reuses
   `TransferRuntimeState` from Task 1's state (already declared, just unused until now):
   - `TRANSFER.title` heading (gets the focus-management treatment from Task 1 requirement 9 —
     extend that `useEffect` to also fire when `activeView` becomes `'transfer'`, if it doesn't
     already since `activeView` is already in its dependency array).
   - `TRANSFER.event`, `TRANSFER.instruction`.
   - Two independent `<fieldset>`s, same accessible-radio-card technique as Task 1's round
     options: `TRANSFER.claimQuestion` over `TRANSFER.claims` (3 options, radio name e.g.
     `transfer-claim`) and `TRANSFER.evidenceQuestion` over `TRANSFER.evidence` (3 options, radio
     name `transfer-evidence`). Unlike round options, these remain enabled/editable even after a
     submitted check (see retry behavior below) — do not disable them post-submit.
   - Check button: label `BUTTONS.checkTransfer` before any submit, `BUTTONS.retryTransfer` after
     a submit that was NOT fully correct (the same button/handler either way — just relabeled).
     `disabled` until both `claimId` and `evidenceId` are set. On click: sets
     `transferState.submitted = true`, computes correctness
     (`claimId === TRANSFER.correctClaimId && evidenceId === TRANSFER.correctEvidenceId`), sets
     `firstAttemptCorrect` only the first time this is ever computed (`prev.firstAttemptCorrect
     ?? justComputedCorrectness` — this is the one place a resubmission is possible, unlike the 3
     main rounds, so guard against overwriting the first-attempt record on a retry).
   - Feedback, `aria-live="polite"`, shown once `transferState.submitted`: if fully correct →
     `FEEDBACK_HEADINGS.complete` heading + `TRANSFER.success`; else pick exactly one of
     `TRANSFER.wrongClaim` (claim wrong, evidence right), `TRANSFER.wrongEvidence` (claim right,
     evidence wrong), `TRANSFER.wrongBoth` (both wrong) — use `FEEDBACK_HEADINGS.incorrect` as the
     heading for all 3 wrong cases.
   - **Takeaway block** (`TAKEAWAY.title`/`.text`/`.note`, over the `takeaway-landscape.png`
     image — same flat-aspect/scrim technique as the irregular strip, village on the LEFT per its
     `objectPosition`, text on an opaque/light ground per the handoff spec) renders whenever
     `transferState.submitted` is true, regardless of correctness — the summary explanation is
     part of the learning even after a wrong attempt; only the success-specific heading/message
     is gated on a fully-correct pair. Do not gate the takeaway block behind `firstAttemptCorrect`
     — gate it behind `submitted`.
3. **Reset.** A `BUTTONS.reset` button, always visible (a reasonable placement is near the round
   stepper or at the very bottom of the whole component — your call, not pixel-specified), that
   restores every piece of state this component owns to its Task 1 + Task 2 initial values:
   `activeView = 0`, `furthestRoundIndex = 0`, all 3 `roundStates` reset, `transferState` reset,
   `openNodeId = null`. After reset, move focus to the component's own title (same mechanism as
   requirement 9's focus effect, or a direct call) so a screen-reader user lands somewhere
   sensible, not on a now-removed control.
4. Do not add a `<form onSubmit>` anywhere — all buttons are plain `type="button"` with `onClick`
   handlers (there is no actual form submission/navigation happening here).

### Verification

1. `npx tsc --noEmit`, `node scripts/qa/rtl-audit.mjs` — clean.
2. Reach the transfer section by completing all 3 rounds (any answers). Verify: check button
   disabled until both a claim and evidence are picked; submit a wrong claim + right evidence →
   `wrongClaim` feedback, `incorrect` heading, takeaway block visible, button now reads
   `BUTTONS.retryTransfer`; change the claim to the correct one, click retry → `success` feedback,
   `complete` heading. Repeat once for right-claim/wrong-evidence and once for both-wrong,
   confirming the correct one of the 3 wrong-feedback strings appears each time (not always the
   same one).
3. Verify the irregular-actor strip is visible from round 1 onward (before any answers), the
   village is not cropped off in either strip image, and neither strip's text ever sits directly
   on unmodified photo (always on the scrim/opaque ground).
4. Click reset from mid-activity (e.g. round 2, transfer partially answered) and confirm every
   piece of state — including the transfer question and the takeaway visibility — returns to the
   true initial state, and round tabs 2/3 become locked again.
5. Report exactly what was run/observed.

---

## Task 3 — Accessibility/motion hardening + 1440px visual fidelity pass

Holistic review pass over the now-functionally-complete component from Tasks 1-2. This task
fixes deltas, it doesn't add new features.

### Requirements

1. Walk every item in `IMPLEMENTATION-SPEC.md`'s "בדיקות קבלה" (acceptance tests, 9 items) and
   the "בדיקה והשלמה" section of `CLAUDE-CODE-PROMPT.md`, plus this repo's own `CLAUDE.md`
   verification loop (screenshot at 1440×1122, compare to the mockup, list concrete deltas, fix
   them) — treat every one as a checklist item to actually execute, not to eyeball. In
   particular, explicitly verify:
   - No image is cropped-and-mirrored or otherwise reflected; the map is never `object-fit: cover`.
   - All 6 map labels remain inside the map's frame and never visually overlap each other or the
     definition region at 1440px, across all 4 view states (round 1/2/3 post-submit, transfer).
   - Body copy (event text, question, options, feedback, causal explanation, irregular/takeaway
     text) is ≥16px (`text-base` or larger) everywhere — audit for any stray smaller size that
     crept in.
   - Full keyboard traversal end-to-end: Tab through step tabs (locked ones are skipped because
     they're `disabled`, not merely `tabIndex={-1}` — confirm this is really true, not just
     visually implied), radio groups (arrow keys move selection per native radio semantics, Enter
     activates), buttons, map node buttons, all the way through reset — never a dead end, never a
     focus trap.
   - `prefers-reduced-motion` end-to-end, not just the map connector lines from Task 1 — confirm
     no other new animation (round-card fade, transfer reveal, etc.) loops or persists motion
     under that setting; the final visual state must render immediately.
   - Screen-reader-relevant structure: exactly one `aria-live="polite"` region announces round
     feedback (not duplicated), fieldsets have legends, images have the correct `alt` (empty for
     the two decorative strips, the transcribed manifest `alt` for the map).
2. Take Playwright screenshots at 1440×1122 (or full scene height, whichever the existing
   Playwright workflow in this repo uses — check for a helper script under `scripts/qa/` or an
   established ad-hoc pattern from a recent plan, e.g.
   `docs/superpowers/plans/2026-09-06-topic01-asymmetric-actor-tabs.md`'s verification section)
   of: initial state, round 1 correct, round 1 incorrect, round 2 post-submit, round 3
   post-submit, transfer (wrong pair), transfer (correct pair, success), and the irregular/
   takeaway strips. Compare each against the equivalent region of
   `design/mockups/asymmetric-time-realistic-v3.png` for spacing/color/type deltas (remember: the
   mockup's page-shell chrome is out of scope, ignore it) and fix anything material. Un-fixable
   or deliberately-different items get a short, specific note in the final report — not a silent
   claim of pixel match.
3. Confirm the 3 images all load with no 404 in the Network tab (or via response-status checks in
   the Playwright script) at least once during this pass, and that `npm run build` (static
   export) completes successfully with the new component included — this is the closest thing to
   an LMS/SCORM static-export smoke test available in this repo.
4. Append every judgment call flagged in Tasks 1-2 as "record in assumptions.md" into
   `design/docs/assumptions.md` in one pass (create the file with a top-level `# Assumptions` if
   it doesn't exist; otherwise append a new dated `##` section): the physical-coordinate RTL
   exception, every new minimal UI-chrome string authored (locked-step caption, map description,
   empty-definition prompt, previous/current chips), and the exact strip aspect ratios chosen for
   the irregular/takeaway images and why they don't crop the village.
5. Final full read-through of `TimePressureExperience.tsx` + `TimePressureContent.ts` for dead
   code, unused imports/variables, and any leftover TODO/placeholder from Task 1's "render
   nothing for `'transfer'`" note (should be fully replaced by Task 2 — confirm nothing was left
   behind).

### Verification

1. `npx tsc --noEmit`, `node scripts/qa/rtl-audit.mjs`, `npm run build` — all clean; paste the
   actual command output (or a faithful summary) in the report, not just "passed."
2. Every acceptance-test item from `IMPLEMENTATION-SPEC.md` and every checklist item in the
   user's own "בדיקות לפני סיום" list (13 items, in the original task instructions) gets an
   explicit pass/fail/N-A line in the final report, with what was actually done to check it.
3. List every visual delta found against the mockup and what was changed to fix it (or why it was
   deliberately left different).

---

## Final report (controller, after all 3 tasks)

Summarize for the user: files changed/created, confirmation the 3 assets were already present
(no copy needed), the behavior implemented per section of the handoff spec, every verification
command actually run and its result, every assumption recorded in `design/docs/assumptions.md`,
and any remaining known limitation. Explicitly restate that nothing was committed or published,
per the user's instruction.
