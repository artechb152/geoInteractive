# Integration requests — OnboardingScene (topic-02)

Filed per the task brief: "If you believe any shared/read-only file (or the `LayeredMap` island)
genuinely needs a change to hit the mockup: do NOT edit it. Instead write... describing exactly what you
think needs to change and why." These are visual gaps between `design-references/topic-02/scene-onboarding.png`
and the current render that **cannot be closed from this worktree** because they live inside files/logic
this agent was told to treat as locked.

## 1. `LayeredMap` renders a flat schematic map, not the mockup's isometric diorama

The mockup's centerpiece is a 3-D-looking isometric terrain diorama with translucent stacked "sheets"
(one per layer) floating above each other. The locked `LayeredMap` function in `OnboardingScene.tsx`
(and its `Layer`/`Toggle` helpers) instead renders a flat top-down 2-D schematic SVG (terrain silhouette +
contour arcs, road lines, building dots, dashed border line + label, friendly/threat markers). This is a
fundamentally different rendering technique, not a styling delta — closing this gap would mean rewriting
the SVG's own render tree, which is explicitly out of this worktree's scope ("Do NOT change ... its
internal JSX markup, its internal styling").
**Suggested next step for the orchestrator**: if the isometric look is a hard requirement, it likely needs
a dedicated illustration/SVG asset (or a new component) built by whichever workstream owns
diagram/illustration assets, then swapped in behind the same `enabled: Set<string>` prop contract so
`OnboardingScene`'s state/logic doesn't need to change.

## 2. The accordion list styling can't match the mockup's numbered/connected-line list

The mockup's layer list (right column) is a minimal design: plain numbered circles connected by a
vertical line, with small icons, no card chrome, and the active/last item shown as a highlighted full-row
pill. The current implementation is a "surface" accordion-card list (white rounded cards, chevron
expand/collapse, badge with number/check). Since `LAYERS`, `step`, `expanded`, `clickLayer`, and the
per-item JSX/className are all named as locked in this task's brief, this worktree did not touch them —
only the JSX/classes surrounding the whole `LAYERS.map(...)` block (spacing, grid proportions) were
adjusted.
**Suggested next step**: if a future pass is authorized to touch this list's internal styling, it can keep
the exact same state/handlers/ids and only change the per-item visual treatment.

## 3. `IntelCard` (shared, `src/components/lesson/IntelCard.tsx`) has no icon slot anymore

The mockup shows a small circular icon per fact card (crosshair, wave, snowflake, globe). `IntelCard`
still accepts `icon`/`accent` props (for backward compatibility) but its own docstring says they are
"Unused. Kept for backwards compatibility" — a prior sitewide design pass intentionally dropped icon
rendering. This worktree left `IntelCard` untouched (it's under `src/components/lesson/*`, in the
project's global read-only list) and only adjusted the surrounding grid (now a single 4-up row with
`divide-x` hairlines instead of a 2×2 grid of separate white cards, per the mockup's continuous-band
composition).
**Suggested next step**: if icon-per-fact-card is wanted back, it needs to be re-added inside
`IntelCard.tsx` itself by whoever owns that shared component, since every topic's OnboardingScene depends
on it.

## 4. Shared `SceneHeader` (`src/components/lesson/SceneHeader.tsx`) no longer renders its own `eyebrow` prop

`OnboardingScene.tsx` still passes `eyebrow="לפני שמתחילים"` to `<SceneHeader>`, but the shared component's
current implementation only destructures `title`/`intro` and silently ignores `step`/`eyebrow` (see its
own comment: "`step`/`eyebrow` נשמרים אופציונליים לתאימות לאחור... אך אינם מוצגים עוד" — kept for
backward compat but no longer displayed). The mockup clearly shows this eyebrow label (plus a small
decorative divider) above the H1.
**Workaround applied in this worktree**: `OnboardingScene.tsx` now renders its own small eyebrow block
directly (using the existing global `.section-eyebrow` utility class from `globals.css`, and the exact
same pre-existing Hebrew string already passed to `SceneHeader`) plus a small decorative line+diamond
rule, both living entirely in `OnboardingScene.tsx`'s own JSX — `SceneHeader.tsx` itself was not touched.
This closes the visual gap for this one scene, but every other topic's OnboardingScene presumably has the
same gap since they all share the same `SceneHeader`.
**Suggested next step**: if this is wanted everywhere, it likely belongs back in the shared
`SceneHeader` component rather than duplicated per-scene — flagging for the orchestrator to decide since
that file is out of scope for every one of the six parallel workstreams.
