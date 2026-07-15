# Shared-component candidates — Topic 03 redesign

These are visual changes the topic-03 mockups require that touch components currently shared across every topic in the course. Per the task's shared-change protocol, none of the shared files below are edited. Instead, local topic-03-only implementations were built. Once topics 2–3 (and any others in flight) settle, these are candidates worth promoting to the shared layer — decide after reviewing how each sibling topic's own redesign handles the same need.

## 1. `src/components/lesson/SceneHeader.tsx` — eyebrow/step no longer rendered

The shared component's own doc comment says `step`/`eyebrow` props are "kept optional for backward compatibility... but are no longer displayed." All 4 topic-03 content-scene mockups (Onboarding/Principles/Planning/CombatNav) show an eyebrow label above the H1, using the exact `eyebrow` strings already passed by each scene's existing `<SceneHeader eyebrow="..." .../>` call. Rather than editing the shared component (which would affect every other topic), `topic-03/SceneHeader.tsx` (previously a 1-line re-export of the shared component) was turned into a local implementation that restores eyebrow rendering, scoped to topic-03 only.

**Candidate for promotion**: if other topics' redesigns want the eyebrow back too, consider restoring it in the shared component and deleting the local topic-03 override.

## 2. `src/components/lesson/IntelCard.tsx` — borderless "editorial" historical-example card

The shared component is explicitly documented as "the original borderless/shadowless magazine treatment every other lesson's OnboardingScene relies on — leave it untouched unless a caller opts in." Topic 03's mockup wants a bordered, icon-bearing, top-subtitle/bottom-body card. A local `topic-03/NavExampleCard.tsx` was built instead, used only by `OnboardingScene.tsx`.

**Precedent**: `src/components/lessons/topic-01/HistoricalStoryCard.tsx` (unmerged, sibling checkout) independently solves the exact same problem the exact same way, for the exact same documented reason. Two topics now want a bordered/icon variant — worth evaluating whether `IntelCard` should grow a proper `variant="bordered"` (distinct from its existing `variant="elevated"`, which doesn't add the icon/reordering) once both topics are settled.

## 3. `src/components/lesson/ReadyCallout.tsx` — white card vs. tinted band + icon

Shared component renders a plain white `bg-elevated` card with no icon. Topic 03's mockup wants a tinted band (`bg-accent` family) with a badge icon docked at the inline-end. A local `topic-03/ReadyBand.tsx` was built instead, used only by `OnboardingScene.tsx`.

**Candidate for promotion**: if this tinted/icon treatment reads better across the board, consider adding an opt-in variant to the shared component later.
