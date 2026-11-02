# Lesson 6 focused cleanup — implementation plan

> Execution: use superpowers:executing-plans, one section at a time.

**Goal:** Deliver Flow prompts for the four existing opening cards, simplify terrain-navigation and north copy, and give the location-check views more space.

**Architecture:** Keep the existing React activities, state machines, geography and lesson order. Reuse their buttons, tokens and keyboard behavior. Author media prompts separately; the user produces the assets in Flow.

**Tech stack:** Next.js, React, TypeScript, Tailwind, Playwright.

**Spec:** User request of 2026-10-29; `design/docs/lesson-screen-guide.md`; existing topic-06 components and `content/topic-06.md`.

## Constraints and decisions

- RTL logical properties; no mirrored geography, new colors, new dependencies or mobile redesign.
- Capture and visually inspect each affected screen at 1440 × 1122 before/after.
- Preserve choice → check → feedback → reset, map selection, keyboard access and fullscreen.
- Opening media: four matching stills and three transitions, based only on the current four card captions/insights. Use lesson 2's realistic terrain and start/end frame convention.
- Terrain: shorten the principle and instructions, widen the learning views by reducing their secondary sidebar, compact the repeated legend. Preserve the practice workflow and its panel width.
- North: shorten definitions and notes while retaining true/grid/magnetic distinctions, local/time variability and map-to-compass correction.
- Location: replace the left control column with a compact horizontal action row below both views; retain map tools beside the map. Verify resulting height and avoid shrinking text.

## Review focus

- Long Hebrew text and every feedback state must fit without overlaps.
- Map clicks and radio keys must remain synchronized.
- Changing a checked area must invalidate its previous result.
- Terrain learning/practice switching must preserve all four legs and hints.
- Flow images must preserve one geography and distinguish arrival from mere proximity.

## Tasks

- [x] Capture baseline screens and read the existing lesson-2 media convention.
- [x] Edit terrain copy/layout; capture and compare; exercise learning selection and practice.
- [x] Edit north copy; capture all three tabs; exercise the slider.
- [x] Move location controls; capture empty, missing, wrong, changed and supported states; exercise keyboard/reset/fullscreen.
- [x] Write four complete image prompts and three complete motion prompts, with Hebrew production notes and source mapping.
- [x] Run TypeScript and relevant existing QA; report remaining tasks without creating chats yet.

## Verification and delivery

## Follow-up requested by user

The user asked to carry out the same cleanup again; the earlier edits exist locally, but the learning screen still exposes secondary information and several practice decisions at once. Continue with a focused second pass, preserving those edits.

- Terrain screen objective: identify a sign in terrain and on the map, then verify a position. Keep the feature picker; put route figures in a native keyboard-accessible disclosure. Before a point is selected in practice, show only that first choice; show evidence and comparison after selection. Keep the same state machine, hints and scoring.
- North screen objective: distinguish the three references and compare their readings. Shorten the definitions and dynamic relation text; remove redundant English headings. Keep the local/time caveat and correction note.
- Location screen objective: choose an area and compare its measurements. Keep the enlarged full-width views and choice/check group; collect reset, legend and fullscreen in one separate quiet utility group. Do not restore a sidebar.
- Verify each screen at 1440 × 1122 and run the existing browser flows, plus check the route disclosure and staged practice with keyboard.

Follow-up verification: all three browser QA scripts passed, including the new checks for opening/closing route figures with Enter and revealing evidence/comparison after position selection. TypeScript and 66 unit tests passed. Screenshots/logs: `design/screenshots/topic06-cleanup-followup/`. Actual visual comparison covered initial learning/practice, selected/verified positions, all north tabs and location verdicts.

- TypeScript: passed. Existing terrain/nav/north/location unit suites: 66/66 passed.
- Full browser QA: terrain navigation, north lab and location check all passed at 1440 × 1122, including keyboard, reduced motion and static fallback. Location fullscreen and map legend also checked separately.
- Before/after captures: `design/screenshots/topic06-focused-cleanup-2026-10-29/`.
- Independent read-only frontend review: no actionable findings or blockers.
- Flow source: `design/storyboards/2026-10-29-flow-onboarding-topic-06.txt`. Seven standalone English prompts, Hebrew guide and lesson-2 style reference packaged in `output/flow-prompts-topic06-2026-10-29.zip`.
- Media generation/integration and the original planning-interactions, dead-reckoning and route-story work remain for follow-up. No chats created, commits made or changes published.
