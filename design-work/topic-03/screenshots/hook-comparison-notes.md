# HookScene comparison notes

Reference: `design-references/topic-03/scene-hook.png`
Current: `screenshots/hook-current-tall.png` (1536×960), `hook-current.png` (1536×864)

## Round 1
- Rebuilt `BackdropTerrain`: coordinate-grid map (eastings/northings ticks), large "03" numeral, azimuth compass rose (0–330° ticks, cross hairlines, center star), dashed orange route to concentric-ring target bullseye, N-arrow + scale bar.
- Switched text column from centered to right-aligned, dropped orange gradient on H1 line 2 (both lines now same ink color), added divider+star ornament, left-aligned CTA with leading (RTL-forward, left-pointing) arrow icon.
- Delta found: route path crossed directly through H1 text → rerouted to climb on the start/left side and cut across above the headline.
- Delta found: target bullseye's outer ring clipped by top viewport crop → moved target down (y 8→11).
- Delta found: route read as near-solid, not dashed → increased dash gap.
- Delta found: northing axis labels (7424000 etc.) had their leading digit clipped at the left edge (unexpected horizontal crop under `preserveAspectRatio="xMidYMid slice"` at this viewport) → moved label x-anchor inward until fully visible.
- Result: composition now matches the mockup's structure (map field + right-aligned text column + CTA) closely. Remaining minor gaps (exact route wiggle shape, exact compass tick density) are cosmetic and left as-is per "fix top 5 deltas per round."

## Verified
- No horizontal overflow at 1536 width.
- `learn:next` CTA click still dispatches the event (interaction unchanged, only markup/classes touched).
- Copy text is byte-identical to the original code (only the orange-gradient span wrapper was removed from line 2, no text changed).
