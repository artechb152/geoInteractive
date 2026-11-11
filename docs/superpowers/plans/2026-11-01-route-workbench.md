# Route story workbench implementation plan

> For agentic workers: implement with subagent-driven-development; preserve other work in this checkout.

**Goal:** Replace only the five-point/four-leg route story activity with the approved realistic planning workbench mockup.

**Architecture:** Keep routeStoryModel as the geometric/content source. A focused workbench reducer owns measured answers, validation and undo. A map component owns measuring and a builder composes toolbar, story card and four-row summary.

**Tech Stack:** Existing React/TypeScript, Tailwind tokens, SVG map overlays and raster terrain.

**Spec:** User-approved option 2 and `design/mockups/route-workbench/approved.png`. Desktop 1440px; map left, card right, four-row table beneath. Existing page chrome and pacing stay outside scope.

## Decisions and constraints
- Use real measurements, not buttons that supply the correct answer. Keyboard-accessible map and editable numeric alternatives.
- Begin at leg D with empty fields; A–C remain worked examples. Point selection shows incoming/outgoing context.
- Accept ±3° bearing and ±35m distance for human placement. Explain approximation; landmarks remain exact.
- Hide D solution and route total until verified; show learner-entered values distinctly before checking.
- Existing colors, RTL logical properties, north-up unmirrored map, explicit SVG text anchors.
- Undo covers field edits, check and reset. Reset returns to empty D; selected tool/leg do not erase answers.

## Tasks
- [x] Add reducer tests: empty guard, arbitrary incorrect numbers, measurement tolerance, stale-feedback clearing, undo after reset/completion. Confirmed missing-model failure before implementation.
- [x] Implement state and interactive workbench/map, matching approved proportions and controls.
- [x] Run model tests, TypeScript check and browser interaction/visual checks at 1440×1122.

## Review focus
Boundary tolerances, non-finite numeric input, hidden solution through summaries, keyboard measurement, measurement state after reset/undo.

## Verification record
- 25 model tests passed (18 existing route tests + 7 new workbench tests).
- `npx tsc --noEmit --pretty false`: exit 0.
- `node scripts/qa/route-workbench.e2e.mjs`: passed empty/disabled state, D answer hiding, three wrong answers, corrected feedback, completion, reset, undo, example selection, point context, pointer azimuth, keyboard distance, map landmark selection.
- Inspected 1440×1122 screenshots under `design/screenshots/route-workbench/`; map tooltip overlap was corrected and recaptured. `07-mockup-state.png` is the partially completed D view corresponding to the approved mockup.
- The original introduction, page chrome and pacing activity were not changed. Map shape/data are authoritative rather than copying geometric inaccuracies in the generated reference.
- Final browser rerun passed after review fixes: distance-first measurement retains its numeric value across tool changes without inventing a northward endpoint; adding a bearing restores the positioned ruler; keyboard-focused map legs have a visible outline. Local development server restored after isolated production build validation.

## Revision: all four legs (user requested)
- [x] Start at point 1 / leg A with all answers empty.
- [x] Store independent draft, validation and completion for A–D; preserve when revisiting.
- [x] Offer next-leg progression after successful validation; reveal total only after all four.
- [x] Remove worked-example answers and unidentified point names from table/panel.
- [x] Whole-route reset and undo; per-leg tolerances and corrective feedback.
- [x] Expanded map landmarks and realistic terrain integration.
- [x] Run seven revised model tests, TypeScript, full four-leg map browser workflow and capture 1440px screenshots.

This revision supersedes the original D-only practice decision and its old screenshot examples. Landmark recognition may be selected on the map or through the equivalent form control; no correct choice is preselected.

All-leg verification: 25/25 tests pass (18 geometry/legacy + 7 revised state tests); TypeScript exit 0; browser acceptance exit 0. Browser measured all four legs on the map, selected their landmarks, advanced through all stages, revisited a completed card, reset/undid the whole route, and checked error feedback, hidden point answers, distance-first behavior and pointer/keyboard controls. Inspected screenshots 08-all-legs-empty.png and 10-all-legs-complete.png at 1440×1122; 12-first-leg-landmarks.png records hotspot layout.
