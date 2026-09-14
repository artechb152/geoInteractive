# UI Consistency Recommendations

## Shared design language

## Reusable tokens and components

## Screen-specific findings

### topic-01 `#scene-levels`

- 2026-09-03 (`/reference-to-ui-exact` against `lesson1part3image1.png`): the top card's new diorama + active-level detail panel intentionally uses only ONE accent color (orange/`accent`) for whichever level is active, with the other two buttons neutral-dark — unlike the tri-color per-level identity (`accent-intel` purple / `accent` orange / `terrain-sand` sand) used by this same file's pyramid-derived `LEVELS` data everywhere else (the drag-and-drop practice bins below it, untouched). This was a direct, explicit user correction against the reference, not an oversight — do not "fix" it back to tri-color in a future consistency pass without checking `design/assumptions.md`'s "Topic-01 levels scene" entry first.
- 2026-09-03 (`/reference-to-ui-exact` against `lesson1part3image2.png`): fixed drop-box/zone-header position, zone-icon size, answer-card icon size, and answer-card icon side (now left, was right) in the drag-exercise practice section (`LevelZone`/`ScenarioChip`). See `design/assumptions.md`'s "Topic-01 drag-exercise practice section" entry for the CSS gotcha behind the position fix (padding-top % resolves against width, not height) and the measurement method used.

### topic-01 `#scene-asymmetric`

- 2026-09-06: the 3-actor "all at once" card grid was replaced with a banner-tab selector + single detail panel (`ActorTypologySelector` in `AsymmetricScene.tsx`, reference: `lesson1part5image1.png`). Like `#scene-levels` above, it uses only ONE accent color (orange/`accent`) on the active tab (bottom underline bar + `text-accent` label) — the other two tabs stay neutral. The reference screenshot's own active-tab color (olive/green) belongs to a different, out-of-bounds palette (the landing-redesign mockup colors) — do not "fix" this back to that literal hue in a future consistency pass without checking `design/assumptions.md`'s "Topic-01 asymmetric-actor scene" entry first.

### topic-02 `#scene-coordinates`

- 2026-09-14: the "אנטומיה של נ״צ" block was rebuilt as an interactive map + coordinate-anatomy panel (`DigitAnatomy` in `CoordinatesScene.tsx`, reference: `lesson2part5image3.png`). Verification pass (same date) found and fixed a real RTL `<text>` clipping bug in the map's grid-line axis labels: `textAnchor="start"` alone is not sufficient under this page's `dir="rtl"` — it anchors to the visual right and grows leftward, silently clipping plain LTR numerals. **Candidate consistency check for other lesson maps/diagrams with inline SVG `<text>` grid or axis labels**: confirm each one also sets `direction="ltr"` on the text element, not just `textAnchor` — see `design/assumptions.md`'s 2026-09-14 topic-02 entry for the full before/after measurements.
- Same rebuild reuses one raster asset for both the full map and a live zoom inset, purely via CSS `background-position`/`background-size` on the same `<img>` source (no second cropped file). **Candidate reusable pattern for other lesson maps that need a "zoom into the same terrain" affordance** — cheaper than shipping a second asset, at the cost of visible softness at very deep zoom (see assumptions.md for the accepted trade-off).

## Open decisions

- topic-01 `#scene-levels` drag-exercise section: pre-existing horizontal overflow at the project's 1440px target width (`document.body.scrollWidth` ≈1560px vs `clientWidth` 1440px). Confirmed present before the 2026-09-03 icon/position fixes (not introduced by them) and out of scope for that task (user asked to stay focused on 4 specific items). Needs its own investigation — likely something in the pool-sidebar + map grid (`grid-cols-[320px_1fr]`) not shrinking to fit at exactly 1440px. See `design/assumptions.md`.
- topic-01 lesson pages, mobile widths (~390px): a pre-existing, page-wide horizontal overflow (`document.body.scrollWidth` ≈535–537px vs a 390px viewport) was found on 2026-09-06 while verifying the new `#scene-asymmetric` banner-tab selector's mobile collapse. Confirmed NOT caused by that new component (zero elements inside `#scene-asymmetric` itself exceed the viewport bounds) and NOT scene-specific — the same overflow is present on that lesson's default `#scene-hook` scene too, and absent on the site's home page (`/`). Likely something in the shared lesson-page chrome (`LessonShell.tsx` / `PagedLearn.tsx`). Needs its own dedicated mobile-pass investigation. See `design/assumptions.md`.
- topic-02 lesson page, mobile width (~390px): the same class of pre-existing, page-chrome-level horizontal overflow was reconfirmed here on 2026-09-14 while verifying `#scene-coordinates`'s `DigitAnatomy` block (`document.body.scrollWidth` ≈594px vs a 390px viewport). A DOM walk scoped to `DigitAnatomy` itself found zero offending elements, consistent with the topic-01 finding above that this is shared lesson-page chrome, not any one scene/component. Still needs the same dedicated mobile-pass investigation as the topic-01 entry above — not duplicated further here.
- topic-01 `#scene-asymmetric` new asset payload (2026-09-06, flagged by final whole-branch review): the new banner/portrait/field-icon PNGs added by `ActorTypologySelector` (3 banners + 3 portraits + 4 field icons, the icons oversampled well past the size they're actually rendered at) add ~12.4MB total. Real concern for the static-export/SCORM delivery target, but explicitly not this task's to fix — matches this same asset folder's pre-existing size convention (other `scene-asymmetric`/`scene-onboarding` assets are similarly unoptimized). Needs a dedicated future asset-optimization pass (resize-to-rendered-resolution + recompression) across the folder, not a one-off fix here.

## Adopted decisions
