# Comparison log — Topic 03 (ניווטים), scenes 1–5

Per-scene detail lives in `screenshots/<scene>-comparison-notes.md`. This is the running index.

| Scene | Reference | Screenshot | Rounds | Status |
|---|---|---|---|---|
| Hook | `design-references/topic-03/scene-hook.png` | `screenshots/hook-current.png` | 3 (route/target/label fixes) | Close match |
| Onboarding | `.../scene-onboarding.png` | `screenshots/onboarding-current.png` | 2 (ready-band icon) | Close match |
| Principles | `.../scene-principles.png` | `screenshots/principles-current.png` | 1 | Close match |
| Planning | `.../scene-planning.png` | `screenshots/planning-current.png` | 1 | Close match |
| Combat Nav | `.../scene-combatnav.png` | `screenshots/combatnav-current.png` | 2 (black-board Tailwind-opacity bug fix) | Close match |

## Cross-scene infrastructure built once, reused everywhere

- `topic-03/SceneHeader.tsx` — converted from a re-export of the shared `@/components/lesson/SceneHeader` into a local implementation that restores eyebrow rendering (the shared one dropped it site-wide). Used by all 4 content scenes.
- `topic-03/NavExampleCard.tsx`, `topic-03/ReadyBand.tsx` — local replacements for the shared `IntelCard`/`ReadyCallout`, used only by `OnboardingScene`.

## Most significant fix of the whole pass

`CombatNavScene.tsx`'s `HandrailVisual` base rect used `fill-terrain-sand/8`, a single-digit Tailwind opacity utility the project's build was silently failing to generate (confirmed via compiled-CSS inspection and a from-scratch `.next` rebuild — not a stale-cache artifact). With no fill rule, the SVG defaulted to solid black, turning the entire combat-nav diagram board black instead of the intended cream terrain paper. This was a **pre-existing bug**, not introduced by this pass, but it was the single largest fidelity gap found — without it the CombatNav board could not visually match the mockup at all. Fixed by bumping `/8` → `/10` in that file, plus two more same-cause instances in `CombatNavScene.tsx` (`bg-brand/5`, `to-brand/5`) and one in `PlanningScene.tsx` (`bg-accent/5`). A fourth instance in `RecapScene.tsx` was left untouched since that file is locked out of scope.

## What was deliberately NOT changed despite a visible mockup delta

- PrinciplesScene's 3-norths diagram: the mockup appears to show numeric declination labels ("6.2°", "2.3°", "8.5°") that don't exist in the `NORTHS` data. Not invented — see `assumptions.md` §3 (well, the specific note is inline in `principles-comparison-notes.md`).
- PlanningScene: no second full interactive map was built for the top concept strip (scoping decision, `assumptions.md` §4).
- CombatNavScene legend: kept in its existing position under the diagram caption rather than absolutely overlaid on the map corner, to avoid new overlap/clipping risk.

## Verification summary (see final report for full detail)

- `npx tsc --noEmit`: clean.
- `npm run build`: succeeds, static export includes `/lessons/topic-03`.
- Interaction test suite (25 assertions across all 5 scenes + keyboard + reduced-motion): all pass except one false-positive in the test itself (browser-back hash restoration — `PagedLearn` intentionally uses `history.replaceState`, not `pushState`, so this is expected behavior, not a regression).
- No horizontal overflow at 1536/1280/1024/768/390px across any of the 5 scenes.
- `git status`/`git diff --stat` in the `redesign/topic-03` worktree shows only the 5 permitted scene files + local `SceneHeader.tsx` + 2 new local components + `design-work/`/`design-references/` docs — no `topic-02`, no `RecapScene.tsx`, no shared/global files touched.
