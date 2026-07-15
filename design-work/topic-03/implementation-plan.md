# Implementation Plan — Topic 03 Scenes 1–5

## Files to be edited

- `src/components/lessons/topic-03/HookScene.tsx`
- `src/components/lessons/topic-03/OnboardingScene.tsx`
- `src/components/lessons/topic-03/PrinciplesScene.tsx`
- `src/components/lessons/topic-03/PlanningScene.tsx`
- `src/components/lessons/topic-03/CombatNavScene.tsx`
- `src/components/lessons/topic-03/SceneHeader.tsx` (converted from a 1-line re-export of the shared component into a local topic-03 implementation — see shared-component-candidates.md §1)

## New local files to be created (all under `topic-03/`, used only by these 5 scenes)

- `src/components/lessons/topic-03/NavExampleCard.tsx` — bordered historical-example card for `OnboardingScene` (replaces `IntelCard` usage locally; see shared-component-candidates.md §2)
- `src/components/lessons/topic-03/ReadyBand.tsx` — tinted callout band with icon for `OnboardingScene` (replaces `ReadyCallout` usage locally; see shared-component-candidates.md §3)

## Explicitly NOT touched

- Anything under `src/components/lessons/topic-02/`
- `src/components/lessons/topic-03/RecapScene.tsx`
- `src/components/lesson/PagedLearn.tsx`, `src/components/lesson/SceneHeader.tsx`, `src/components/lesson/IntelCard.tsx`, `src/components/lesson/ReadyCallout.tsx` (shared — read-only reference)
- `src/app/globals.css`, `tailwind.config.ts`
- `package.json` / lockfiles
- `src/lib/lessons.ts`, `src/lib/quizzes.ts` (read-only reference — content/order confirmed already correct, no edits needed)

## Implementation order

1. **HookScene** — richer `BackdropTerrain` (coordinate-grid map furniture, larger compass rose with degree ticks, dashed route + bullseye target, N-arrow + scale bar), right-align text column, drop orange gradient on H1 line 2, left-align CTA under text with leading arrow. Isolated, no shared deps beyond existing tokens.
2. **OnboardingScene** — depends on new local `SceneHeader` (step 6 below happens first in practice since it's shared by all 4 content scenes — see note). Build `NavExampleCard` + `ReadyBand`, swap them in for `IntelCard`/`ReadyCallout`, restyle `MissionStage` card chrome (border/shadow), light styling pass on the 4-step accordion rows to match mockup spacing.
3. **PrinciplesScene** — restructure `AzimuthExplorer` into 3-zone board (readout | dial | info callout) inside one bordered surface; restack `ThreeNorthsCard` selectors vertically with diagram+explanation regrouped; lighten `GpsDeniedCard` icon treatment and rebalance the 2-column proportions. All state/logic (`azimuth`, `active` north, smoothed-angle spring) untouched.
4. **PlanningScene** — add compact concept-strip illustration glyph (scoped per assumptions.md §4); add a title band above `RouteStoryBuilder`; visually distinguish the azimuth/distance leading clause in each checkpoint row (typography only, same string); promote the equation display in `PacingDemo`'s result card. `RouteMap` SVG, `CHECKPOINTS` data, `PacingDemo` math untouched.
5. **CombatNavScene** — add rotating chevron + optional mini-icon to accordion rows; add terrain hachure texture to `HandrailVisual`/`DeadReckoningVisual`/`PaceControlVisual`; restyle the "דוגמה" block as a highlighted callout box; convert the plain legend list into a compact corner-box legend (same data). `METHODS`/`SUPPORT` data, single-open-accordion mechanic untouched.
6. **`topic-03/SceneHeader.tsx`** — done as part of step 2 (first scene that needs it), then reused as-is by steps 3–5 since it's already a local shared-within-topic-03 file.

## Local `SceneHeader` design

Same call signature as today (`step?`, `eyebrow?`, `title`, `intro`) so all 4 existing call sites need zero prop changes — only the component body changes. Renders (when `eyebrow` is provided): a small label line above the `title`, `text-center`, tone controlled by a new optional `eyebrowTone?: 'muted' | 'accent'` prop (default `'muted'`) so Onboarding can use muted and Principles/Planning/CombatNav can opt into the orange tracked-caps treatment per assumptions.md §3, all without changing the 4 scenes' existing prop calls except adding `eyebrowTone` where the mockup calls for orange.

## RTL risks

- HookScene switching from centered to right-aligned text: verify CTA icon-before-label reads correctly in RTL (arrow should point toward inline-start / visual-left, i.e. "forward").
- `NavExampleCard`'s icon must sit at the card's inline-start (visual right) using `Icon`+`ms-auto`/`start-` positioning, never `right-`.
- `PlanningScene` checkpoint leading-clause split must not reverse Hebrew/numeral order inside the string (no manual reversal — pure `<strong>`/`<span>` wrapping via a safe split point).
- Any new SVG `<text>` (compass tick labels, legend text, board callouts) must set `textAnchor` explicitly and use the white-halo `paintOrder="stroke"` pattern already used everywhere else in these files.
- No diagram/map may be mirrored — new HookScene compass/grid and CombatNavScene terrain hachures must be authored in the same orientation convention as existing SVGs in this codebase (north-up, unmirrored).

## Interaction-regression risks

- `OnboardingScene`'s 4-step accordion: `handleStepClick` toggle logic must survive the header/card restyle untouched.
- `PrinciplesScene`'s `AzimuthExplorer` reflow to 3 zones must keep the slider, digit readout, back-azimuth, and dial all driven by the same `azimuth`/`angle` state — no duplicated/desynced state.
- `PrinciplesScene`'s `ThreeNorthsCard` reflow must keep `active` state driving both the selector highlight and the diagram/explanation panel.
- `PlanningScene`'s `RouteStoryBuilder` restyle must keep `active`/`setActive` wired to both the checkpoint list and `RouteMap`'s `activeStep`.
- `PlanningScene`'s `PacingDemo` restyle must keep `distance`/`setDistance` driving the slider, equation, and result number.
- `CombatNavScene`'s accordion must keep exactly one method open at a time (`active`/`setActive`), `aria-expanded` correct on the trigger, and per-method diagram/caption/legend swap in sync.

## Screenshot-comparison strategy

- Dev server runs isolated on `http://localhost:3005` (topic-03 worktree only — ports 3001–3004 are in use by topic-02 worktrees, avoided to prevent any cross-session interference).
- Per scene: navigate directly via hash (`http://localhost:3005/course/topic-03#scene-<id>` — hash ids: `hook`, `onboarding`, `principles`, `planning`, `combatnav`), resize to 1536×dynamic per the project's viewport rules, screenshot, save to `design-work/topic-03/screenshots/<scene>-current.png`, compare side-by-side against `design-references/topic-03/scene-<name>.png`, log deltas in `screenshots/<scene>-comparison-notes.md`, fix top 5, re-shoot, repeat until no significant deviation.
- After all 5 are desktop-accurate, spot-check 1280/1024/768/390 widths for overflow only (per project rule, mobile polish is out of scope for this pass beyond "no horizontal overflow").
