# Topic-01 "זמן — הנשק הסודי" — Accordion + Film + Sand-Timer Rebuild

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for Tasks 1–2 (genuinely independent, spec-able). Task 3 (the core state machine) is intentionally marked "controller-implemented" per that skill's own tightly-coupled-work guidance — dispatch a task-reviewer for it anyway. Task 4 wires everything together and runs the verification loop.

**Goal:** Rebuild the "למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?" activity (`#scene-asymmetric`, lesson topic-01) on the visual/behavioral pattern of the existing onboarding accordion (`#scene-onboarding`, `OnboardingScene.tsx`): accordion of N station sections on the right, media (video + sand-timer) on the left. Station count (currently 5, with 4 transition videos + 4 boundary questions) must be derived from data, never hardcoded. Add a small vector sand-timer next to the video whose two chamber levels are fixed per station and animate in sync with real video transition progress (never with elapsed real time). Add the four boundary questions from `INTERACTION-ADDENDUM.md` between stations, gating first-time forward progress but never blocking revisits. Preserve every original Hebrew string in `TimePressureContent.ts` verbatim.

**Architecture:** Media (4 transition MP4s + 5 station stills) is already identified, renamed and organized — see `design/handoff/asymmetric-smooth-film-v3/MEDIA-MAP.md` (already done, not a task below). The rebuild touches three files:
1. `src/components/lessons/topic-01/TimePressureContent.ts` — extend (not rewrite) with the question data and new UI copy; update `Station.image.src` to the new `time-pressure-film-v3/states/` stills.
2. `src/components/lessons/topic-01/SandTimer.tsx` — **new** file, a small self-contained SVG hourglass component, pure props → visual, no knowledge of video/accordion state.
3. `src/components/lessons/topic-01/TimePressureExperience.tsx` — rewritten to the accordion+media layout, owning the interaction state machine from `INTERACTION-ADDENDUM.md` §4.2, and rendering `SandTimer` + a native `<video>` element instead of the old Timeline-strip + crossfaded-panel layout. `AsymmetricScene.tsx` keeps its single `<TimePressureExperience />` call site untouched.

**Tech stack:** Next.js 15 / React 19, TypeScript, `framer-motion` (`AnimatePresence`/`motion.div`, `useReducedMotion`), Tailwind CSS 3 with this project's existing `surface`/`surface-elevated`/`btn-primary`/`btn-secondary`/`btn-ghost` utility classes and `cn()` from `@/lib/utils`. No test framework in this repo — verification is `npx tsc --noEmit`, `npm run lint`, `npm run build`, a Playwright MCP screenshot pass at 1440×1122, and a written manual-QA checklist per `CLAUDE-IMPLEMENTATION-FINAL.md` §7.

**Spec:** `design/handoff/asymmetric-smooth-film-v3/CLAUDE-IMPLEMENTATION-FINAL.md` (structure, media rules, scope) and `design/handoff/asymmetric-smooth-film-v3/INTERACTION-ADDENDUM.md` (questions verbatim in §3, state machine in §4, sand-timer behavior in §5, a11y in §7, acceptance criteria in §8) are the binding spec, in that priority order where they overlap with older docs in the same folder (`CLAUDE-PROMPT-V3.md` etc. are superseded — `CLAUDE-RUN-BRIEF.md` says so explicitly). Every task below cites the exact section it implements; read the cited section before writing code — this plan does not re-transcribe the full prose.

**Pre-flight audit (done, not a task):**
- Media identified, renamed, organized under `public/assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3/{source,transitions,states}/`, fully documented in `design/handoff/asymmetric-smooth-film-v3/MEDIA-MAP.md`. T01=field→budget, T02=budget→public, T03=public→politics (visible protest motion, confirmed), T04=politics→international (dark-wipe cut, confirmed — not a zoom-out). Boundary continuity (T0N end ≈ T0N+1 start) verified visually for all 3 internal boundaries.
- Station stills in `states/F01-field.jpg` … `F05-international.jpg` are extracted directly from the approved videos' own first/last frames (perfect continuity, no separate "jump" risk). The two pre-existing files `time-pressure-film-v3/source/F01-day-1.jpg` / `F02-week-2.jpg` do NOT match the approved videos (different lighting) and must not be used — left in place per the spec's "don't delete prior versions" rule.
- `OnboardingScene.tsx` read: accordion pattern is a `space-y-1` stack of `surface` divs, each a `<button>` header (numbered circle + label + rotating chevron) driving an `AnimatePresence`-height panel (`height: 0/auto`, `duration: 0.3`, RTL `text-start`). This plan's accordion copies that structure's classes/timings exactly — do not invent a different card/border treatment.
- `SceneOnboardingFramePlayer.tsx` read: it's a bespoke WebP canvas frame-stepper with a fixed 1.3s/1.5s duration budget — **not reused**. The new component uses a plain `<video>` element instead (spec explicitly allows MP4 here and explicitly forbids copying the 1.3s acceleration or touching the onboarding component).
- `Quiz.tsx` read: it's a multi-item quiz with a pass threshold and full-quiz submit — **not reused as-is** (spec explicitly forbids planting 4 full `Quiz` instances or changing the shared quiz engine). Only its data-shape idea (option id/label/feedback, `correctId`) is echoed in the new question type in Task 1.

## Global Constraints

- **N is always derived from `STATIONS.length`** — accordion section count, station-image count, `"תחנה X מתוך N"` labels, sand formula, forward-navigation bounds, and the finish state. Never write a literal `4` or `5` in `TimePressureExperience.tsx` or `SandTimer.tsx` for a station/transition count (literal `4`/`5` inside `TimePressureContent.ts`'s own data literals — e.g. the STATIONS array itself — are fine, that's the data).
- **Transitions/questions = N−1, keyed by the pair of stations they connect**, never by a bare index that could silently misalign if a station is ever inserted. Use the adjacent stations' `id`s (e.g. `field-treasury`) as the transition/question key.
- **Zero rewording of existing Hebrew.** Every string already in `TimePressureContent.ts` (title, 5×`stationText`/`frontLabel`/`frontDetail`, `SOURCE_QUESTION`, `TIMELINE_NOTE`, 3×`INSIGHT_PARAGRAPHS`, `TABLE_HEADER`, existing `UI` strings) is moved byte-for-byte if reused, never re-typed by hand — copy the file, edit only additive sections. The 4 questions/options/feedback strings come byte-for-byte from `INTERACTION-ADDENDUM.md` §3 the same way (Law 1 of `reusing-component-templates`: text is transported, never authored). New UI chrome strings this plan does require (button labels, sand caption, a11y labels) are listed explicitly in Task 1 — do not add any beyond those.
- **RTL logical properties only** — `ms-`/`me-`/`start-`/`end-`, no `left-`/`right-` literals, no `text-align: left/right`. The sand-timer sits at the video's inline-end (visual left) using grid column order, not an absolute `left`. Video/diorama content itself is never mirrored.
- **No new color tokens.** Sand timer reuses this file's existing palette only: `--brand-dark`/`accent`/`fg`/`fg-muted`/`bg-elevated`/`border` (as already used elsewhere in `TimePressureExperience.tsx`/`AsymmetricScene.tsx`) — check `tailwind.config.ts` before picking a class, do not invent a "sand" hue.
- **Sand levels are a pure function of station index**, per `INTERACTION-ADDENDUM.md` §5: for N>1, station i (0-based) → bottom = `10 + 80*i/(N-1)`, top = `100-bottom`; single-station N=1 → bottom 10/top 90, no transitions. These are internal design values, never rendered as text/`%` to the learner. Revisiting an already-visited station shows its fixed level directly — no re-accumulation, no animation.
- **Two motion layers, kept separate in code:** ambient idle drip (loops forever at rest, never changes chamber levels, pausable via a dedicated control) vs. transition fill (only during an explicit "המשיכו ל-…" click, driven by the video's real `timeupdate` progress, never a fixed-duration timer). `prefers-reduced-motion` disables both layers and any camera/fade motion; a continue click then shows the destination poster + destination level immediately.
- **Phase state machine** (`INTERACTION-ADDENDUM.md` §4.2 table) — `selectedIndex` / `currentIndex` / `viewedFrontId` / `visitedIndices` / `answers` / `phase` (`idle|question|feedback|loading|playing`) are five *separate* pieces of state; do not collapse any two of them (e.g. do not derive "visited" from `answers` — a skipped-media station is still visited per §4.1's accessibility fallback, even with no answer recorded for a question that doesn't apply to it).
- First-time forward progress is strictly sequential and question-gated; revisiting any `visitedIndices` station is always free (no re-question, no re-play). Jumping from station 1 to station 5 the first time opens only the next unvisited boundary's question, never a queue of four.
- Keep `ComparisonTable` and the `InsightDisclosure` ("מה המשמעות?") — both already in `TimePressureExperience.tsx` — working against the same `currentIndex`, per `CLAUDE-IMPLEMENTATION-FINAL.md` §4 ("שמור את הטבלה ואת הגישה להסבר"). The old `Timeline` component (5-button strip with a draggable thumb) is replaced by the accordion and can be deleted from this file.
- Scope is this activity only: do not touch `OnboardingScene.tsx`, `SceneOnboardingFramePlayer.tsx`, `MDOScene.tsx`, `LevelsScene.tsx`, site navigation, or any file outside the three listed above (plus the new `SandTimer.tsx`). `AsymmetricScene.tsx` is touched only if `TimePressureExperience`'s exported props/name change (they should not — same zero-prop component, same call site).
- No commit, no deploy, no security-setting change as part of any task's own steps — the controller decides when/whether to commit after the final review, per this project's own git-safety norms.

---

## Task 1: Question & content data model (SDD-dispatched, mechanical transcription)

**Files:**
- Modify: `src/components/lessons/topic-01/TimePressureContent.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a new exported type `TransitionQuestion` and array `TRANSITION_QUESTIONS: TransitionQuestion[]` (or equivalent name — implementer's choice, but export it), plus updated `Station.image.src` paths and any new `UI` keys, all of which Task 3 (controller) imports and renders. Document the exact export names chosen in this task's report.

- [ ] **Step 1: Update station image paths**

In the existing `STATIONS` array, change `ASSET_BASE` (or each `image.src`) from `/assets/lessons/topic01/scene-asymmetric/time-pressure-timeline` to `/assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3/states`, and the five filenames to match `design/handoff/asymmetric-smooth-film-v3/MEDIA-MAP.md`'s `states/` listing exactly: `F01-field.jpg`, `F02-treasury.jpg`, `F03-public.jpg`, `F04-politics.jpg`, `F05-international.jpg` (station order is field→treasury→public→politics→international, matching the existing `STATIONS` order — do not reorder the array). Read `MEDIA-MAP.md` first to confirm these five filenames still match what's on disk before typing them. Leave every other field on each `Station` object (`id`, `index`, `timeLabel`, `stationText`, `frontLabel`, `frontDetail`) untouched — do not retype them, only the `image` sub-object's `src` (and `assetId`/`alt`/`prompt` may stay as-is; they're metadata for the old asset pipeline and aren't load-bearing for what's on screen, but don't delete them either — leave harmless unused fields rather than guessing whether something else reads them).

- [ ] **Step 2: Add the transition/question data type + array**

Read `design/handoff/asymmetric-smooth-film-v3/INTERACTION-ADDENDUM.md` §3 in full (all four questions: Q1 `time-pressure-q1-budget`, Q2 `time-pressure-q2-accumulation`, Q3 `time-pressure-q3-politics`, Q4 `time-pressure-q4-time`) and §3's shared header/instruction strings ("רגע לפני שמתקדמים" / "בחרו תשובה אחת לפי המודל המוצג. אחרי המשוב תוכלו להמשיך בסרט."), plus each question's own "המשיכו ל-…" button label from §4 step 5 (four distinct labels: "המשיכו לשבוע 2" / "המשיכו לחודש 3" / "המשיכו לשנה 1" / "המשיכו לשנה 2"). Transcribe byte-for-byte (Hebrew quotes, punctuation, line breaks exactly as written) into a new exported type and array, e.g.:

```ts
export type TransitionQuestionOption = {
  id: 'A' | 'B' | 'C';
  label: string;
  correct: boolean;
  feedback: string;
};

export type TransitionQuestion = {
  id: string;                 // e.g. 'time-pressure-q1-budget'
  fromStationId: StationId;   // e.g. 'field'
  toStationId: StationId;     // e.g. 'treasury'
  prompt: string;
  options: TransitionQuestionOption[];
  explanation: string;        // shared "הסבר משותף לאחר בדיקה" text, per-question
  continueLabel: string;      // e.g. 'המשיכו לשבוע 2'
};

export const QUESTION_HEADING = 'רגע לפני שמתקדמים';
export const QUESTION_INSTRUCTION = 'בחרו תשובה אחת לפי המודל המוצג. אחרי המשוב תוכלו להמשיך בסרט.';

export const TRANSITION_QUESTIONS: TransitionQuestion[] = [ /* Q1..Q4, in order */ ];
```

(Exact TS shape is the implementer's call — the array must have exactly 4 entries in station order, each carrying its own `prompt`/3×`options` with `correct`/`feedback`/`explanation`/`continueLabel`, all copied verbatim from the addendum.) Diff the transcribed strings back against the addendum file before finishing (per `reusing-component-templates`: extract, substitute, diff — never retype-and-trust).

- [ ] **Step 3: Add supporting UI copy constants**

Add these exact strings (also from the addendum, cited section in parentheses) as new named exports alongside the existing `UI` object (either as new `UI` keys or standalone consts — implementer's choice, document which):
- Sand-timer fixed label: `"הזמן במודל"` (§5, "מיקום ומראה")
- Sand-timer clarifying caption: `"החול ממחיש התקדמות בין התחנות, ולא את זמן המענה שלכם."` (§5)
- Ambient-motion toggle pair: `"עצרו את תנועת החול"` / `"הפעילו את תנועת החול"` (§5, "שתי שכבות תנועה נפרדות")
- Skip-animation control: `"דלגו על ההנפשה"` (§5, "סנכרון ומצבי קצה")
- First-time sequential-progress notice: `"מתקדמים תחנה אחת בכל פעם. אפשר לחזור לכל תחנה שכבר ביקרתם בה."` (§4.1)
- Reset control (optional, only if Task 3 ends up adding a reset button): `"התחילו את הפעילות מחדש"` (§4.1)

Do not invent any string beyond this list plus the four `continueLabel`s from Step 2 — if Task 3's controller-author needs one more piece of UI chrome later, it gets added directly in Task 3, not retrofitted here.

- [ ] **Step 4: Type-check**

Run `npx tsc --noEmit`. This file has zero JSX and no React imports, so this should be a pure data/type change — any error means a typo in the new type, not a pre-existing issue.

- [ ] **Step 5: Report**

In the report, include: the exact new export names chosen, a copy-paste of the full `TRANSITION_QUESTIONS` array as written (so the controller can diff it against the addendum independently), and confirmation that Step 1's five new image paths were checked against `MEDIA-MAP.md` (quote the five filenames used).

---

## Task 2: `SandTimer` component (SDD-dispatched, isolated spec)

**Files:**
- Create: `src/components/lessons/topic-01/SandTimer.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 (this component takes plain numeric props, no import of `TimePressureContent.ts` — keep it decoupled/reusable).
- Produces: a default- or named-exported React component that Task 3 (controller) imports and places next to the `<video>` element. Document the exact prop names chosen — Task 3 will read this task's report to wire it up.

- [ ] **Step 1: Read the spec**

Read `design/handoff/asymmetric-smooth-film-v3/INTERACTION-ADDENDUM.md` §5 in full ("שעון החול — התנהגות ומשמעות") before writing any code — it specifies exact placement rules, the two-motion-layer split, the sand-level formula, and every edge case (loading/buffering freezes progress, skip/failure jumps straight to destination level, revisit shows fixed level with no re-accumulation, `prefers-reduced-motion` disables both motion layers, a pause control is required for the ambient loop).

- [ ] **Step 2: Define the component's prop contract**

This component owns **no timers, no video, no station data** — it is a pure presentational hourglass driven entirely by props from the controller (Task 3). Suggested shape (implementer may rename, but keep the same semantics and document any change in the report):

```ts
type SandTimerProps = {
  /** Bottom-chamber fill 0–100 at rest (design value from the formula, never shown as text). */
  bottomPercent: number;
  /** 0–1 progress of an in-flight transition; only meaningful when `phase === 'transitioning'`. */
  transitionProgress?: number;
  /** When transitioning, the bottom-chamber value to interpolate *toward* as `transitionProgress` goes 0→1. */
  targetBottomPercent?: number;
  phase: 'idle' | 'transitioning';
  /** Ambient drip on/off — independent of `phase`; caller flips this from the "עצרו/הפעילו את תנועת החול" toggle. */
  ambientMotionEnabled: boolean;
  reducedMotion: boolean;
  className?: string;
};
```

The rendered bottom level is: `phase === 'idle' ? bottomPercent : lerp(bottomPercent, targetBottomPercent, transitionProgress)`; top level is always `100 - bottom`. `reducedMotion` (or `!ambientMotionEnabled`) fully disables the idle drip particles but must NOT disable the transition fill itself moving to its target when `phase === 'transitioning'` with `reducedMotion` — per the addendum, reduced-motion means the *continue click shows the destination immediately* (i.e. the controller in Task 3 is responsible for skipping straight to `transitionProgress = 1` / not animating when `reducedMotion` is true; this component just renders whatever `transitionProgress` it's given, so it must render correctly at `transitionProgress = 0`, `0.5`, and `1` with no assumption about how it got there).

- [ ] **Step 3: Build the SVG**

Small inline SVG (roughly 40–56px wide, tall aspect — this sits in a compact side column next to the video, per §5 "עמודת צד קומפקטית"): two trapezoid/triangle chambers (top narrowing down, bottom widening down) joined at a narrow neck, a filled region in each chamber whose height responds to the bottom/top percentages above (clip-path or a `<rect>`/`<path>` height driven by the percent, whichever renders a convincing sand-pile — flat top surface is fine, doesn't need to be a realistic sloped pile). Ambient drip = a few small circles animated falling through the neck in a loop (CSS `@keyframes` or SVG `<animate>`), fading out just before they'd visually add to the pile (per §5: "החלקיקים דוהים ממש לפני המגע בערמה, ואינם משנים את נפח הערמה"). If any `<text>` element is used anywhere in this SVG, set `textAnchor` explicitly (this codebase's own known RTL-clipping bug, called out in `CLAUDE.md` and the addendum §5) — but per §5 ("לא מוסיפים טקסט זעיר בתוך ה-SVG"), prefer no `<text>` at all; the "הזמן במודל" label and caption are rendered as normal HTML next to the SVG by Task 3, not inside it.

- [ ] **Step 4: Wire up motion + reduced-motion**

Use `framer-motion`'s `useReducedMotion()` internally as a fallback default for the ambient-particle animation's own duration (`0` when true or when `!ambientMotionEnabled`), but still accept the `reducedMotion`/`ambientMotionEnabled` props explicitly rather than only relying on the internal hook — Task 3 already computes `useReducedMotion()` once at the top of the experience component for other purposes and should be able to pass it down instead of this component re-deriving it, for a single consistent source of truth. Animate the fill-level *transitions* (idle level → idle level, when `bottomPercent` prop changes on a revisit) with either no animation or an instant snap — per the addendum, revisiting a station must show its fixed level directly, no re-accumulation animation, regardless of `reducedMotion`.

- [ ] **Step 5: Verify visually**

No test framework exists; instead, add a temporary throwaway `<SandTimer bottomPercent={10} phase="idle" ambientMotionEnabled reducedMotion={false} />`-style render into any already-running page during manual dev-server testing (e.g. via a scratch route or by temporarily mounting it in `TimePressureExperience.tsx` if Task 3 hasn't started yet — but if Task 3 has already landed by the time this task runs, don't touch that file; verify by rendering `SandTimer` alone in a disposable test harness instead, and delete the harness before finishing). Confirm at both `bottomPercent=10` and `bottomPercent=90` that the two chambers visibly differ, and that toggling `ambientMotionEnabled={false}` stops the falling-particle animation without changing the fill heights.

- [ ] **Step 6: Type-check + lint**

Run `npx tsc --noEmit` and `npm run lint`.

- [ ] **Step 7: Report**

Include the final prop names/types (confirm or note any deviation from Step 2's suggested shape) and a one-paragraph description of the SVG structure so Task 3's controller-author can wire sizing/placement without re-reading the whole file.

---

## Task 3: `TimePressureExperience.tsx` rebuild — accordion, video, question flow, sand sync

**Owner: controller (this session), not a dispatched subagent.** `subagent-driven-development`'s own decision tree routes tightly-coupled, single-state-machine work to manual execution rather than fragmenting it across fresh-context dispatches — this task is exactly that (one `phase` state machine touching the accordion, the video element, the sand timer, and the question flow all at once, per `INTERACTION-ADDENDUM.md` §4.2's own warning against mixing up selection/viewing/browsing state). The controller still gets an independent task-reviewer pass on this task's diff before moving on, same as any dispatched task.

**Files:**
- Modify: `src/components/lessons/topic-01/TimePressureExperience.tsx` (near-total rewrite; keep `ComparisonTable` and `InsightDisclosure` function bodies, replace `Timeline` + the crossfaded single-panel layout with the new accordion+media layout)

**Interfaces:**
- Consumes: Task 1's `TRANSITION_QUESTIONS`/`QUESTION_HEADING`/`QUESTION_INSTRUCTION`/new `UI`-adjacent copy consts and updated `STATIONS[].image.src`; Task 2's `SandTimer` component and its prop contract.
- Produces: same zero-prop `TimePressureExperience` export `AsymmetricScene.tsx` already calls — no signature change, so no edit needed there.

- [ ] **Step 1: Re-read the full state machine spec before touching code**

Read `INTERACTION-ADDENDUM.md` §4 (all of it — "רצף למידה והתנהגות", "ביקור חוזר, קפיצות והמשכיות", "מצב פנימי") and §5 ("סנכרון ומצבי קצה") end to end. This is the actual spec for this task; the steps below are a build checklist against it, not a paraphrase — resolve any ambiguity by re-reading the cited subsection, not by guessing.

- [ ] **Step 2: Layout shell — accordion right, media left**

Copy `OnboardingScene.tsx`'s accordion structure (the `STEPS.map` block: `surface` wrapper classes, numbered/checked circle, `AnimatePresence` height-panel, chevron rotation, `active`/`passed` styling) into this file's own per-station accordion, keyed on `STATIONS` instead of `STEPS`. Grid: `grid md:grid-cols-[2fr_3fr] gap-6 items-stretch` — accordion is the **first** DOM child (→ visual right in RTL), media column is second (→ visual left), matching both `OnboardingScene.tsx`'s existing convention and this file's own current RTL comments. Each accordion header shows the station's `timeLabel` + a short label; the open panel shows `stationText` (and, once visited, keeps rendering the boundary-question UI from Step 4 inline if that boundary hasn't been answered yet — see Step 5). Delete the old `Timeline` function entirely.

- [ ] **Step 3: Media column — video + sand timer, not the old canvas/crossfade**

Inside the media column (visual left): a two-part row — the video area and, at its own visual-left edge (inline-end in this RTL page, per addendum §5 "בעמודת צד קומפקטית"), the compact `SandTimer` column with its "הזמן במודל" label and clarifying caption underneath/beside it (small text, this file's existing `text-sm`/`text-fg-muted` conventions). The video area itself: a single native `<video muted playsInline preload="metadata">` whose `poster` is the *current* station's still (`STATIONS[currentIndex].image.src`) at rest, and whose `src` is set to the relevant `transitions/T0N-*.mp4` only while actually playing a transition (unmount/clear `src` back to idle-poster-only once a segment finishes, so the browser doesn't keep decoding a finished clip). Preload the *next* transition's video file (a `<link rel="preload" as="video">` or a hidden prefetch `<video>` with the next `src` and no autoplay) once the current station settles, mirroring the existing `useEffect` that already preloads the next station's image — but only one station ahead, never the whole set. Play each segment exactly once (no loop), and on `ended` leave the video element showing its own last frame or swap to the destination poster (either is acceptable per spec — pick whichever avoids a visible flash, and note the choice in the report) for as long as the learner stays on that station.

- [ ] **Step 4: State machine**

Implement the five state pieces from §4.2 exactly as named/scoped there: `selectedIndex`, `currentIndex`, `viewedFrontId` (already exists — keep it, it's the existing "peek at a previous front via the comparison table" state, unrelated to the new question flow), `visitedIndices` (a `Set`/array of visited station indices, seeded with `{0}` on mount — station 1 is always pre-visited per §4 step 1), `answers` (per-question-id record of `{ selectedOptionId, submitted }`), `phase: 'idle' | 'question' | 'feedback' | 'loading' | 'playing'`. Requesting a station beyond the highest `visitedIndices` entry, when that boundary has no submitted answer yet, sets `phase = 'question'` and shows only that one boundary's question (never a queue) — per §4.1's "קפיצה ראשונה מ-1 ל-5 אינה עוקפת ארבע שאלות" and its exact required copy: `"מתקדמים תחנה אחת בכל פעם. אפשר לחזור לכל תחנה שכבר ביקרתם בה."` (from Task 1). Requesting an already-visited station (via accordion click or, if kept, a direct station selector) always jumps immediately with no question and no re-play, per §4.1.

- [ ] **Step 5: Question UI — inline, not a modal**

The question (heading, instruction, `fieldset`/`legend` radiogroup of 3 options, "בדקו את התשובה" button disabled until a selection is made) renders **inside the existing content area** (the accordion's open panel, or a dedicated area directly below/beside it — implementer's call on exact placement, but it must never cover or replace the video, and the video must keep showing the *current* (not yet advanced) station's poster throughout, per §4 step 2's "תמונת התחנה הנוכחית נשארת מוצגת"). Selecting an option only selects it (`phase` stays `'question'`); "בדקו את התשובה" moves to `phase = 'feedback'`, revealing the per-option feedback text and the correct answer, plus a "נסו שוב" affordance that returns to `'question'` with the same question still visible (not a fresh unanswered state — the previous submission is preserved per §4.1 "התשובה והמשוב נשמרים גם אם המשתמש חזר לאחור", though "נסו שוב" specifically lets them pick again before finally continuing). Only the question's own `continueLabel` button (from Task 1) starts the actual transition — never the option click or the check click.

- [ ] **Step 6: Transition playback + sand sync**

Clicking `continueLabel` sets `phase = 'loading'` momentarily if the video isn't ready, then `phase = 'playing'` once `canplay`/`loadeddata` fires and playback actually starts (never before — per §5 "בזמן loading החול נשאר במפלס המקור... העברה משמעותית מתחילה רק כאשר המדיה מתחילה בפועל"). Drive `SandTimer`'s `transitionProgress` from the video's own `timeupdate` (`currentTime / duration`), not a separate timer — pause progress whenever the video is `waiting`/paused/buffering (`onwaiting`/`onstalled` handlers freeze the last progress value; `onplaying` resumes reading `timeupdate` again). On `ended`, set `currentIndex = selectedIndex`, add it to `visitedIndices`, clear the question's "target" framing, set `phase = 'idle'`, and show the destination poster/level with no further animation. A media `error` event, or the user clicking "דלגו על ההנפשה" mid-`loading`/`playing`, does the same end-of-transition state update immediately (destination poster + destination sand level) without waiting for `ended` — per §5's error/skip rules. `prefers-reduced-motion` (read once via `useReducedMotion()` and passed into `SandTimer`) makes a `continueLabel` click resolve straight to the end state with no visible playback at all, per §5's last bullet.

- [ ] **Step 7: Race conditions — rapid clicks, retargeting mid-flight, tab hidden**

Per §5 "סנכרון ומצבי קצה" bullets 5–7: clicking a different (already-visited) station while a transition is `'playing'` finishes the *current* segment as an implicit skip (jump straight to its destination state), then — only if the newly-requested station is itself not yet visited — opens that new boundary's question next (never two videos queued, never skipping a required question). Use a monotonically-incrementing "request token" ref (same pattern `SceneOnboardingFramePlayer.tsx` already uses for its own segment player) so a stale `timeupdate`/`ended` callback from an abandoned segment can never write over newer state. On `visibilitychange` to hidden, pause the video and stop the sand's `requestAnimationFrame`/interval work (if any beyond the video-driven `timeupdate`); on return, do not fast-forward or "catch up" — resume exactly where paused.

- [ ] **Step 8: Ambient sand drip + its pause control**

Render the "עצרו את תנועת החול" / "הפעילו את תנועת החול" toggle (from Task 1) next to the sand timer, wired to `SandTimer`'s `ambientMotionEnabled` prop, defaulting to enabled unless `prefers-reduced-motion` is set (then default disabled and the toggle still works to explicitly re-enable *only* if reduced-motion isn't the reason — actually per §5, reduced-motion should mean no ambient drip at all, full stop; if `reducedMotion` is true, either hide this toggle entirely or leave it permanently off — pick one, document the choice in the report, don't half-implement it as a toggle that fights the OS-level preference).

- [ ] **Step 9: Reset (optional per spec, implement if straightforward)**

Per §4.1, an explicit reset ("התחילו את הפעילות מחדש", already added in Task 1) is optional; if you add a reset control, wire it to: `currentIndex/selectedIndex → 0`, `visitedIndices → {0}`, clear `answers`, cancel any in-flight video/rAF work, snap the sand to station-0's level with no reverse-animation. If you decide not to add a reset control at all, say so plainly in the report — do not half-build it.

- [ ] **Step 10: Accessibility pass**

Per §7: the question is a proper `fieldset`/`legend` radiogroup (not color-only selection); feedback uses `aria-live="polite"` firing once per submit (not per keystroke/hover); after the question first opens, move focus to its heading/legend only as a direct result of the explicit "request this station" action (no focus theft on unrelated re-renders); after a transition ends, focus lands somewhere useful (the continue-button's next logical control, or the newly current station's accordion header) with no focus trap; the `SandTimer` SVG is `aria-hidden` (its real information — the station label — is already plain text elsewhere, per §5/§7, it must never be exposed as a response-time progressbar).

- [ ] **Step 11: Type-check, lint, build**

Run `npx tsc --noEmit`, `npm run lint`, `npm run build`. Fix everything before moving to Task 4.

- [ ] **Step 12: Report**

Full list of files touched, the exact final shape of the `phase` state machine (any deviation from Step 4's naming, and why), which `ended`-vs-poster-swap choice was made in Step 3, which reduced-motion/toggle choice was made in Step 8, and the reset decision from Step 9. This report is the task-reviewer's primary input alongside the diff.

---

## Task 4: Wire-check + verification loop

**Files:** none expected (verification only) unless the review in Task 3 or this task's own screenshot pass surfaces a fix, in which case the fix lands in `TimePressureExperience.tsx`/`SandTimer.tsx`/`TimePressureContent.ts` only.

**Interfaces:**
- Consumes: the finished Task 1–3 output.
- Produces: `design/handoff/asymmetric-smooth-film-v3/CLAUDE-IMPLEMENTATION-REPORT.md` (required deliverable per `CLAUDE-IMPLEMENTATION-FINAL.md` §7 — do not claim the activity is finished before this exists and is accurate).

- [ ] **Step 1: Confirm `AsymmetricScene.tsx` needs no edit**

Since `TimePressureExperience`'s export signature doesn't change, confirm `AsymmetricScene.tsx`'s existing `<TimePressureExperience />` call (inside `AsymmetricScene`, after `PillarSimulator` and before `TacticMatchExercise`) still compiles and renders — no edit expected here, but verify rather than assume.

- [ ] **Step 2: Manual-check checklist — NOT a Playwright pass**

**Ruling (superseding this step's original text): do not use Playwright, the Playwright MCP tools, or any other browser-automation tool for this task, or anywhere else in this plan.** Explicit user instruction, given twice in this project now — the user verifies visually themselves. Confirm `npx tsc --noEmit` and `npm run build` are clean (already the case as of Task 3), then write a plain-language checklist of exactly what to check by hand at 1440×1122 on `http://localhost:3000/lessons/topic-01/#scene-asymmetric`: (a) the activity at rest on station 1, (b) an open accordion panel, (c) a boundary question mid-answer, (d) its feedback state, (e) a transition mid-playback (sand mid-fill), (f) the final station 5 resting state, (g) the same with the OS-level "reduce motion" setting on. Note that (a)/(b) should be compared by eye against `#scene-onboarding`'s own accordion for visual-language parity (surface colors, spacing, chevron behavior) per `CLAUDE.md`'s own verification-loop rule — this comparison is the user's to make, not something to screenshot-diff automatically.

- [ ] **Step 3: Behavioral checklist against `INTERACTION-ADDENDUM.md` §8**

Walk every row of the acceptance-criteria table in §8 against the actual code paths (read the implementation, do not run a browser) — first transition, wrong answer, 2-minute idle wait, media transition, stuck/failed clip, revisit 5→2→5, first jump 1→5, rapid requests during a transition, viewing a prior table row, reduced-motion + ambient-stop, keyboard+screen-reader pass. Record a code-level pass/fail/needs-manual-check per row in the report — do not claim a row "passed" from a live run that didn't happen; say plainly which rows still need the user's own manual check per Step 2's list.

- [ ] **Step 4: Regression note on the onboarding scene**

Since Step 2 (Task 3) copied `OnboardingScene.tsx`'s accordion *pattern* (not its code) into a different file, there's no direct code-sharing risk — confirm this by inspection (neither `OnboardingScene.tsx` nor `SceneOnboardingFramePlayer.tsx` appear in this plan's diff at all), rather than loading the page.

- [ ] **Step 5: Write the delivery report**

Write `design/handoff/asymmetric-smooth-film-v3/CLAUDE-IMPLEMENTATION-REPORT.md`: what was implemented, the final media map (point at `MEDIA-MAP.md`), which of §8's acceptance rows passed/failed/were-not-testable-here-and-why, any assumption logged to `design/docs/assumptions.md`, and what (if anything) remains before this can be called done. Do not declare the activity complete if any §8 row failed or any media file is still a placeholder.

- [ ] **Step 6: Final whole-branch review**

Dispatch `superpowers:requesting-code-review`'s reviewer over the full diff (Tasks 1–4 combined) on the most capable available model, per `subagent-driven-development`'s own final-review step. Fix any findings in one batch, one scoped re-review, then stop.
