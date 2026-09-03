# UI Consistency Recommendations

## Shared design language

## Reusable tokens and components

- **Grid-matched overlay for connector/pointer elements:** when a decorative element (a progress dot, a callout tail/pointer triangle) needs to align with the horizontal center of items in a grid row above or below it, build it as an overlay `<div>` using the *exact same* `grid-cols`/`gap` classes as that row — not a `left: N%`/`insetInlineStart` percentage formula. A percentage-of-row-width formula silently drifts from the true item center as soon as the row has gaps between columns. Applied in `HistoricalCasesPanel.tsx` (topic-01) 2026-09-03; worth reusing if another scene needs a stepper/carousel pointer aligned to a grid of cards.
- **`overflow-visible` on absolutely-positioned decorative SVGs with a `filter`:** an inline SVG that is (a) absolutely positioned via `bottom`/`right` (not `top`/`left`), (b) sits inside a fractional-height ancestor (e.g. `aspect-video`), and (c) has a CSS `filter` (e.g. chained `drop-shadow()`), can silently clip a stroke that sits exactly on its own `viewBox` edge — Chromium was observed dropping the entire edge-aligned segment while the equivalent `top`/`left`-positioned copy of the same path rendered correctly. Root-caused in `CornerMark` (`OnboardingScene.tsx`, topic-01) 2026-09-03 — the bottom two of four identical corner-bracket SVGs were missing their horizontal arm. Fix: add `overflow-visible` to the SVG's own class list. Worth a defensive default on any future viewfinder/corner-bracket-style decorative SVG positioned from the bottom or end edge.
- **Match two side-by-side columns' height with `items-stretch` + `h-full`, not tuned padding:** when one grid/flex column's height is driven by its own content (text, an accordion) and the sibling column is a fixed-aspect-ratio media box (`aspect-video`), don't hand-tune the content column's padding/type-scale to match the media box's height at one viewport width — `aspect-video`'s height is a function of *that column's own width*, so the match only holds at the exact width it was tuned against and drifts (sometimes badly) at every other width. Instead: `items-stretch` on the row + drop `aspect-video` from the media box (`h-full`/`min-h` floor only) so CSS makes both columns equal at *any* width; a canvas/video inside that already cover-fits its container (`object-fit: cover` or an equivalent draw-cover routine) never distorts when its box's aspect ratio changes. Applied in `OnboardingScene.tsx` (topic-01) 2026-09-03 — a first pass tuned the accordion's padding to match the video at 1440px exactly, which the user then reported as unbalanced at their actual (narrower) window width; switching to `items-stretch` fixed it at every width from 1024–1440 tested.

## Screen-specific findings

### topic-01 `#scene-onboarding` — HistoricalCasesPanel ("4 historical stories")

- 2026-09-03: fixed via `/reference-to-ui-exact` against `lesson1part2image2.png` — detail-panel map now insets with padding instead of bleeding to the panel edges; the card-tail triangle, progress dot, and detail-panel tail triangle now share one grid-based positioning source (previously the dot and pointer-tab used unrelated layout math and drifted apart); active progress dot enlarged. Full rationale in `design/assumptions.md` under "Round 3 fixes (2026-09-03)".
- 2026-09-03 (round 4, `/reference-to-ui-exact` against `lesson1part2image2.png`): added a `border border-border` hairline around the detail-panel map so the existing inset padding reads as a defined frame/mat instead of plain whitespace, matching the reference's map-card keyline.

### topic-01 `#scene-onboarding` — OnboardingScene (terrain visualization + step accordion)

- 2026-09-03 (`/reference-to-ui-exact`): fixed the terrain-video corner-bracket marks (`CornerMark`) — the bottom-left/bottom-right brackets were rendering as a lone vertical tick instead of a full L-shape (see reusable-token note above for the root cause and general fix pattern). Also shrank the step-accordion's padding/type scale (button `p-4`→`p-3`, body copy `text-base`→`text-sm`, `size-9`→`size-8` step-number chip, tighter internal spacing) for a denser, more proportionate accordion.
- 2026-09-03 (same-day follow-up): the padding shrink above only balanced the accordion/video column heights at exactly 1440px — reported unbalanced at the user's actual (narrower) window width, because the video's old `aspect-video` height is a function of its own column width. Replaced with the robust fix: parent row `items-start`→`items-stretch`, video box drops `aspect-video` (keeps `min-h-[320px]` as a floor, adds `h-full`). Columns now match within 1px at every width tested (1024–1440); see reusable-tokens note above.

### topic-01 `#scene-levels`

- 2026-09-03 (`/reference-to-ui-exact` against `lesson1part3image1.png`): the top card's new diorama + active-level detail panel intentionally uses only ONE accent color (orange/`accent`) for whichever level is active, with the other two buttons neutral-dark — unlike the tri-color per-level identity (`accent-intel` purple / `accent` orange / `terrain-sand` sand) used by this same file's pyramid-derived `LEVELS` data everywhere else (the drag-and-drop practice bins below it, untouched). This was a direct, explicit user correction against the reference, not an oversight — do not "fix" it back to tri-color in a future consistency pass without checking `design/assumptions.md`'s "Topic-01 levels scene" entry first.

## Open decisions

## Adopted decisions
