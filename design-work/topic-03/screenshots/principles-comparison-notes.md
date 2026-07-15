# PrinciplesScene comparison notes

Reference: `design-references/topic-03/scene-principles.png`
Current: `screenshots/principles-current.png` (1536, full page)

## Round 1
- Eyebrow "עקרונות הניווט" now renders in the orange tracked-caps tone (`eyebrowTone="accent"`).
- Top concept pair rewritten from two heavy `surface-elevated` boxes to a light icon-led 2-column strip with a divider, matching mockup's lighter treatment.
- `AzimuthExplorer` restructured into one continuous bordered board ("מחקר אזימוט" title band) with 3 divided zones: readout+slider | compass dial | "when to use back-azimuth" callout — matches mockup's 3-zone board layout. State/logic (`azimuth`, spring-smoothed `angle`, `back`, `direction`) untouched.
- `ThreeNorthsCard` selectors restacked from a 3-up horizontal grid into a vertical full-width list (right column); diagram + explanation panel grouped together in the left column — matches mockup's grouping. `active` state and all data untouched.
- `GpsDeniedCard` icons lightened (removed colored bg chip, now plain monoline icon over title+desc in a 3-up strip) — matches mockup's "one continuous system" framing better than the previous card-chip treatment.
- Gap found: mockup appears to show numeric declination labels ("6.2°", "2.3°", "סה״כ 8.5°") directly on the 3-norths diagram. These values do not exist anywhere in the current `NORTHS` data (only a decorative `angle` offset per north, not a declination figure) — per the rule that code data is authoritative and mockup text/numbers must not be invented, these labels were **not** added. Documented here rather than fabricated.
- Minor: the back-azimuth formula row ("47° + 180° = 227°") wraps to two lines in the narrower zone-3 column at 1536px — acceptable given the mockup's own back-azimuth readout sits in a similarly narrow column; left as-is.

## Verified
- All copy (concept strip, azimuth explorer, three-norths who/what/why, GPS-Denied reasons, conclusion) byte-identical to original code.
- Azimuth slider, north selection, and all derived values still computed from the same state — only JSX/class structure changed, no logic edited.
