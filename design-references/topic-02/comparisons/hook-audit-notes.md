# HookScene (topic-02) — Visual audit log (1568×1003)

Compared against `design-references/topic-02/scene-hook.png`. Header row and right-side
lesson TOC are shared/locked chrome (`AppHeader`, `PagedLearn`'s `ScenePagerDesktop`) —
not evaluated here since `HookScene.tsx` doesn't render them; only the content column
(numeral, headline, body, CTA, illustration) is in scope.

## Round 1 (`hook-round-01.png`)

Deltas found (measured via pixel bbox scans, not eyeballing):
1. Numeral "02" rendered at ~120px glyph height vs. the mockup's measured ~156px —
   too small (`clamp(4rem,7vw,7rem)` was capping out too low).
2. Divider "star" glyph rendered as a plain **"+"** cross, not a visible sparkle/star —
   the path was too subtle/symmetric to read as a star at 14px.
3. Illustration's faint background contour lines were too prominent (opacity 0.14),
   competing with the grid instead of sitting quietly behind it.
4. Illustration was a bit small relative to the text column vs. the mockup's larger,
   more dominant grid diagram (max-w 420/480px felt tight).
5. CTA arrow-vs-text relative position confirmed correct on first try (arrow renders at
   the visual inline-start/right of the label, matching the mockup's column-density scan
   — see `hook-design-spec.md` §1).

Fixes applied for round 2: bumped numeral clamp to `(4.5rem,9vw,9rem)`; replaced the star
path with the standard 4-point sparkle (`M12 0 C12 6.6 6.6 12 0 12 C6.6 12 12 17.4 12 24 …`);
dropped contour opacity 0.14→0.07; widened illustration max-w to 460/560px and expanded
the grid bounds from 22–78 to 12–88 (viewBox units).

## Round 2 (`hook-round-02.png`)

Re-measured: numeral glyph height now ~152px (target ~156px) — close enough. Overall
composition now reads very close to the mockup. Remaining nit: the mockup's tilted grid
shows small perpendicular tick marks along the grid's own outer edge (a "ruled frame"
look), which the illustration didn't have yet — only the center crosshair had ruler ticks.

Fix applied for round 3: added tick marks along all four edges of the tilted grid `<rect>`
at each grid-line position, echoing the mockup's ruled-frame detail.

Also used this round (while holding the browser lock) to do the live interaction check
early: clicking "לחץ כדי להתחיל" fired `learn:next` and the URL hash advanced from
`#scene-hook` to `#scene-onboarding` — confirmed working.

## Round 3 (`hook-round-03.png`)

Note: the first attempt at this round produced a visibly broken, unstyled/grayscale
screenshot — traced to running `npm run build` (production) concurrently with the
already-running `npm run dev`, which corrupted the shared `.next` directory (both point
at the same output folder). Fixed by stopping the dev server, deleting `.next`, killing a
stray process still holding port 3101, and restarting `next dev` clean. This was a local
tooling mistake, not a code regression — re-verified with `tsc --noEmit` before and after,
which stayed clean throughout.

The retaken round-3 screenshot matches the mockup closely:
- Numeral size/weight/color, divider sparkle, headline (incl. the accent word), small
  underline accent, body copy, and CTA (text + arrow, correct relative position) all read
  as close matches to the reference crops.
- Illustration: tilted dashed grid with ruled-edge ticks, full-bleed crosshair with ruler
  ticks, center ring, and the true-vs-measured dot pair all present and proportioned
  close to the reference.

## Known remaining gaps (not fixable from this file, or intentionally out of scope)

- **Numeral typeface**: mockup's "02" has visible serif/slab contrast; project has no
  serif font token, so `font-display` (Rubik) black weight is used as the closest
  available approximation (documented in `hook-design-spec.md`).
- **Header/tabs chrome**: the mockup's simplified header (logo + tagline + bell/person)
  doesn't match the actual site's `AppHeader` (nav links) + `LessonShell` tabs row —
  those are shared/locked files outside this task's scope.
- **Body paragraph line count**: wraps to 3 lines here vs. 4 in the mockup — natural
  reflow difference from column width/font-size, not a content or fidelity bug (same
  real text, same right-alignment).
- **Accent hue**: mockup's orange samples closest to the landing-only `ember` token
  family; used the existing `accent` family instead for consistency with sibling
  topic-02 scenes (documented assumption in `hook-design-spec.md`).
