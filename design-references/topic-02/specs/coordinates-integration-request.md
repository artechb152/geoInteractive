# Integration request — shared `SceneHeader` mobile overflow

Filed by: topic-02 `CoordinatesScene` redesign pass.
File I cannot edit (globally shared, read-only): `src/components/lesson/SceneHeader.tsx`
(re-exported verbatim by `src/components/lessons/topic-02/SceneHeader.tsx`, also locked).

## What I observed

During the mandatory brief responsive spot-check (after the desktop 1568×1003 pass was
verified across 3 rounds), at a 390px mobile viewport the scene's H1 (rendered entirely
by `SceneHeader`, not by `CoordinatesScene.tsx`) overflows horizontally: each wrapped
line of the heading is wider than the viewport and gets visually clipped on both the
left and right edges — individual words are cut off mid-character. Screenshot:
`design-references/topic-02/comparisons/coordinates-mobile-390.png` (see the top of the
page, ~y=280-420).

I did not change anything about how `CoordinatesScene.tsx` calls `SceneHeader` (same
`title`/`intro`/`step`/`eyebrow` props as before my pass) — this reproduces with the
original, unmodified `title`/`intro` content too, since the overflow is in `SceneHeader`'s
own `<h2>` styling, not in my scene's markup.

## Likely cause (for whoever owns this file)

`SceneHeader.tsx`'s `<h2>` uses `text-[clamp(1.875rem,3.8vw,2.875rem)]` with
`text-balance` and `leading-[1.1]`, centered via `mx-auto max-w-3xl text-center`. At
very narrow viewports the balanced line-wrap appears to compute (or some ancestor
collapses to) a width wider than the actual viewport, so lines that should wrap further
don't, and the centered text overflows symmetrically past both edges. This is a
`SceneHeader`-level issue — since every topic's every scene reuses this exact component,
it likely reproduces on any scene at mobile widths, not just this one.

## What I did NOT do

- Did not edit `SceneHeader.tsx` (read-only, globally shared, used by scenes other
  agents are actively redesigning in sibling worktrees right now).
- Did not add any local override/workaround in `CoordinatesScene.tsx` to compensate for
  it (e.g. forcing a narrower `max-w` on my own container), since the bug is not caused
  by, or fixable from, my file, and a local hack would just mask the symptom
  inconsistently scene-by-scene instead of fixing the shared root cause.

## Suggested fix direction (not implemented — needs an owner with edit rights)

Add explicit wrapping safety to the `<h2>` (e.g. `break-words` / `[overflow-wrap:break-word]`)
and/or verify no ancestor between `SceneHeader` and the viewport establishes a flex/grid
context without `min-width: 0`, which is the most common cause of "text still overflows
despite wrap utilities" bugs. Recommend testing at 320–390px across a couple of scenes
with different title lengths before shipping a fix, since `text-balance`'s line-count
estimate is sensitive to content length.
