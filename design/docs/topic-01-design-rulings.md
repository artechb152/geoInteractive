# Controller rulings — binding, override the plan's "Open decisions" section

These answer every item in `plan-draft.md → Open decisions for the controller`. A step whose ruling is **CLOSED** must NOT be applied — mark it `no_change_needed` in your report. A step whose ruling is **APPLY** ships exactly as the plan's step text says, unless amended here.

## A. Multi-task

| # | Decision | RULING |
|---|---|---|
| A1 | SceneHeader `underline` bar on 4 of 5 scenes | **APPLY option A** — pass `underline` in `LevelsScene:224`, `MDOScene:69`, `AsymmetricScene:344`, `RecapScene:21` so all five scene titles carry the centered accent bar (matches the approved onboarding). |
| A2 | Accent bar under T1 *section* titles | **APPLY option A** — every T1 section title gets `<span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />` directly under it (5 sites). This is the "heading + short accent underline" pattern already adopted in `docs/UI-CONSISTENCY-RECOMMENDATIONS.md`. |
| A3 | Asymmetric `my-16` → `mt-12` | **APPLY option A** — all wrappers change. Tasks 9–14 ship in one merge window (the controller merges every branch together), so margin collapse resolves correctly. |
| A4 | `text-right` → `text-start` | **APPLY option A** — all four sites, including the approved `OnboardingScene:109`. Zero visual change in an always-RTL document; it is pure logical-property correctness. |
| A5 | Exercise button pair, 3 spellings | **APPLY option A** — all three pairs become `.btn-primary` / `.btn-secondary`. |
| A6 | Quiz/practice tab width | **APPLY option B** — cap the tabpanel ONCE in `LessonShell` (Task 16). Task 18: `quiz-practice-F23` and `F24` are **CLOSED** (do not cap from inside `Quiz.tsx` / `InteractionPlaceholder.tsx`). |
| A7 | `.section-eyebrow` kickers: overview has 4, scenes have 0 | **APPLY option A** — keep the overview's eyebrows, accept the asymmetry. Unifying either way would delete or re-show Hebrew strings (iron rule 0.1). |

## B. Shared / approved files

| # | Decision | RULING |
|---|---|---|
| B1 | `ReadyCallout.tsx:23` `rounded-md` | **APPLY option A** — use the verifier's corrected fix (`.surface-elevated`), not the paraphrased `rounded-2xl`. Radius/surface rule wins; the callout then reads as the same card family as every other block. |
| B2 | `HookSceneLayout` CTA class alignment | **APPLY option A** — provably zero visual delta, lands on the topic-01/02/03 covers. |
| B3 | `onboarding-edit-mode.tsx:142` `SCENE_SCALE = 0.86` | **APPLY option A — set it to `1`.** The controller verified in the browser that this preserves the composition exactly (proportional: same line breaks, same relative layout) and brings the scene to the same rendered sizes as every other page. Without it the "reference" scene is 16% smaller than everything that copies it. |
| B4 | `OnboardingScene.tsx:201` `mt-20 mb-12` band gap | **APPLY `mt-12 mb-12`** (change `mt-20`→`mt-12`, KEEP `mb-12`). With B3 the scene grows ~16%; keeping 80px would make onboarding the rhythm outlier. |
| B5 | Terrain video cream void (`onboarding-accordion-V01`) | **CLOSED — no change.** Any fix crops or re-fits the user's own video (iron rule 0.3). Reported to the user instead. |
| B6 | `HistoricalCasesPanel:272` accent-bold key-fact sentence | **APPLY option A** (`onboarding-history-F01`) — the label `עובדה מרכזית:` keeps `text-accent`, the stat sentence becomes T4 black. Brief §2 forbids accent on long text; the box keeps its `bg-bg-accent` fill as its cue. Flagged to the user as a visible change to an approved block. |
| B7 | `HistoricalCasesPanel` `md:gap-3.5` (2 sites) | **CLOSED — leave both.** Changing one drifts the dot rail off its cards; the gain is invisible. |
| B8 | `HistoricalCasesPanel` `paper-bright` opacity ladder | **CLOSED — keep the ladder.** This file is the brief's own dark-band reference. |
| B9 | `overview/page.tsx` `PageShell` 1400px → `max-w-lesson` | **APPLY option A.** The user's explicit requirement is identical section width from page to page. This is the largest single visual delta in the pass and is exactly what was asked for. |
| B10 | `overview/page.tsx:60-61` `TopoField` + `bg-topo-fade` | **APPLY option A — remove both.** Brief §7 names both in the forbidden list for lesson scope; the overview is a lesson page, not landing chrome. |
| B11 | `overview/page.tsx:88` H1 clamp `3.25rem` | **APPLY option A** — align to SceneHeader's `2.875rem` so the lesson has one titling scale. |
| B12 | `LessonShell.tsx:83` raw hex `bg-[#EBE9E4]` | **CLOSED — leave it.** It matches the approved background tile exactly; `bg-bg` would be a visible regression. Logged as an approved exception; a token needs CLAUDE.md sign-off. |
| B13 | `design-approval/LessonMock.tsx` | **CLOSED — leave frozen.** Non-production client-approval surface, out of scope. |

## C. Single-task taste calls

| # | Decision | RULING |
|---|---|---|
| C1 | `MDOScene:487` on/off status dot (`mdo-diagram-F04`) | **CLOSED — keep the dot.** It is a state cue, not ornament; §7 targets ornament. F01/F02/F03/V01 still ship. |
| C2 | `MDOScene:149` + `:634` two accent cues in the all-on card | **APPLY option A — keep both.** §3 allows one key-emphasis label per card, and the meter fill is progress, not a second control cue. |
| C3 | `AsymmetricScene:1878` ink rule under CategoryBin scrim title (`slop-sweep-F35`) | **CLOSED — keep it.** Named in the approved 2026-09-07 assumptions entry for that scrim treatment. |
| C4 | `AsymmetricScene:878` `min-h-[30rem]` pillar height | **HOLD the value as-is.** Do not change `min-h-[30rem]`. The controller re-measures the all-three-solved state after merge and raises it only if it actually overflows. |
| C5 | `Quiz.tsx:267` `text-brand-dark` passing score (and `AsymmetricScene:966` `text-status-ok`) | **CLOSED — keep both as they are.** `status-ok` on white is ~1.7:1; legibility beats role purity. Do not introduce new `text-status-ok` body text on a light surface anywhere. |
| C6 | `InteractionPlaceholder:101-103` emoji glyph | **APPLY option B** — delete the emoji `<div>` element only. The `preview` string constant stays byte-identical (iron rule 0.1 is about strings, not about which slice of one is rendered). |
| C7 | `InteractionPlaceholder:87-115` → `AssetPlaceholder` | **CLOSED — keep the dashed frame.** Out of this pass. |
| C8 | `LessonShell:194/:212` next-lesson accent kicker | **APPLY option A** — ship `shell-F15` as written; the accent kicker is what distinguishes next from prev. |
| C9 | `LevelsScene` `ScenarioChip` padding | **CLOSED — leave `p-3` / `p-2.5`.** `p-4` grows an already over-tall pool column. |
| C10 | `RecapBanner:40` `border-accent/30` | **CLOSED — leave.** Part of the approved banner. |
| C11 | Recap block gap | **APPLY `recap-F06` ONLY** (`<RecapBanner className="mb-12">`). `recap-F07` is **CLOSED**. |
| C12 | `LessonShell:83-89` sticky tabs band padding | **CLOSED — leave.** No rule covers it; reported to the user. |

## D. Never touched in this pass (report only)

- **Motion.** All framer scale-pops and non-standard easings stay exactly as they are (iron rule 0.2). The ONE exception: `asym-selector-V01`, the reveal/crossfade `transition` easing the verifier explicitly cleared — apply that one. Everything else: **CLOSED**, queued for a separate motion pass.
- **Strings.** Every copy issue the audit found (missing spaces, singular/plural, drag-vs-click wording, the CTA whose `aria-label` differs from its label, duplicate labels, dead `step`/`eyebrow` props) is **reported to the user, never edited.** Do not "fix" one.
- **Dead code.** Do NOT delete any file or import in this pass. Task 11: the `InsightCallout.tsx` finding (`cross-scene-V03`) is **CLOSED** — the file is imported by nothing. Do NOT rewire the pager to `SceneNavigation.tsx` (that is a structural change, not styling).
- **Docs.** The controller updates `design/docs/assumptions.md` and `docs/UI-CONSISTENCY-RECOMMENDATIONS.md` in the merge commit. Implementers do not edit docs.

## E. Sequencing (instructions)

Follow the plan's section E verbatim. In particular: `slop-sweep-F01` (cap the root) before `slop-sweep-F02`/`levels-table-F02` (remove the breakout); `mdo-examples-F08` and `mdo-top-F03` are the same hunk — Task 6 owns it, Task 8 skips it; grouped `⚑ Same anchor` steps are composed into ONE className edit.

## F. Missing brief rows (rule now, so nobody guesses)

Three real elements had no tier row. Use these:

- **Card heading on the dark band** (a card title inside a `bg-pine-grad` panel): `font-display text-base font-bold leading-snug text-paper-bright`.
- **Caption over a photo** (text on a scrim above an image): `text-sm font-display font-semibold tracking-wider text-paper-bright`.
- **Tagline under a card title** (a one-line descriptor below a T2): `text-sm text-fg-muted leading-snug` (T6).
- **T5 clarification:** the T5 row's `tracking-wider` is **dropped** — T5 is `text-sm font-display font-semibold text-fg-muted`, matching `HistoricalCasesPanel`'s place line. Where a step's replacement string still contains `tracking-wider` for a T5 element, keep the step as written (it is harmless and already verified) — this ruling only settles new cases.
- **§3 vs §4 conflict:** §3 wins — one key-emphasis label per card is allowed alongside an active-state accent cue.
