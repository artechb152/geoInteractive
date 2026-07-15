# PlanningScene comparison notes

Reference: `design-references/topic-03/scene-planning.png`
Current: `screenshots/planning-current.png` (1536, full page)

## Round 1
- Eyebrow "תכנון ציר ותנועה" now renders in orange tracked-caps tone.
- Top concept pair rewritten from two heavy boxed cards to a light icon-led 2-column strip with divider (same treatment as Principles), matching mockup.
- Added a centered title band "בנו את סיפור הדרך שלכם (Route Story Builder)" above the interactive map+checklist module — this text did not previously render anywhere on screen (it's new decorative UI chrome only, not new instructional content — the words themselves are a direct, unmodified translation of the module's existing internal heading "בנו את סיפור הדרך שלכם" already used elsewhere in-scene, paired with the English name already used in the design-spec/user brief).
- Checkpoint rows: visually split each `feature` string on its single ": " boundary (pure presentational — verified lossless round-trip) so the azimuth+distance clause reads bold/orange and the terrain description reads as regular muted text, matching the mockup's two-tier checkpoint typography. No wording, values, or order changed.
- `PacingDemo` result card: increased the "חישוב: ..." caption from a barely-visible 10px hint to a full-size, prominent line, promoting the equation's visual weight per the mockup — kept the exact original string (did not shorten it to bare symbols, to avoid dropping copy).
- Scoping decision confirmed (assumptions.md §4): did not build a second full interactive map for the top concept strip; the existing single `RouteMap`/`RouteStoryBuilder` remains the only interactive map, unchanged (terrain art, checkpoint data, azimuth/distance values, active-step wiring all untouched).

## Verified
- All 5 checkpoint labels/features, `stepLength=1.5`, default `distance=500` → `333`, and all surrounding copy are byte-identical to the original code.
- `active`/`setActive` still drives both the checkpoint list and `RouteMap`'s `activeStep`; `distance`/`setDistance` still drives the slider, equation and result.
- No horizontal overflow at 1536 width; page kept as a long full-page layout (not compressed to 16:9).
