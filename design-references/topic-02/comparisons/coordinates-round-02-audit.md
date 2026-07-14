# Round 2 visual audit — CoordinatesScene

Screenshots: `coordinates-round-02-top.png` (header/intro/systems), `coordinates-round-02-mid.png`
(datum-shift + anatomy strip, scrolled to bottom, shift=0 default state).

## Confirmed fixed from round 1
- Format row no longer uppercases embedded English ("Google Maps", "Easting", "Northing"
  now render in normal case).
- ITM/WGS84 example coordinate pairs no longer bidi-reversed (`dir="ltr"` fix) — now read
  "666250 / 178350" and "35.2007° / 31.7857°" matching the real `SYSTEMS` data.
- `ImpactMap` radial gradient now visibly renders (blue glow around target zone) after
  switching the broken `var(--accent-cool)` stop-color to the `currentColor` + className
  pattern already used elsewhere in the file. Both pin labels ("מטרה מבוקשת" blue,
  "מיקום פגיעה בפועל" red-orange) are legible via the existing white text-halo.

## Regressions found and fixed this round (content-preservation bugs, not styling)
1. `DatumShiftDemo` header label had been replaced with mockup placeholder text
   ("הדגמת סטייה בין שפות המפה (Datum Shift)" + a fabricated description sentence lifted
   from the reference image) instead of the real code string ("הדמיה מבצעית: מה קורה
   כשהשפה לא תואמת"). Reverted to the real text; removed the fabricated sentence.
2. The big shift-number's unit label had been shortened from "מ׳ סטייה" to "מ׳", dropping
   a real word. Restored "מ׳ סטייה".
3. The slider had 3 real tick labels in the original ("0 מ׳" / "50 מ׳ (טווח רסיסים)" /
   "100 מ׳ (החטאה מלאה)") — round 1 only kept 2, dropping the middle tick and the
   "(החטאה מלאה)" qualifier. Restored all 3.
4. `CoordinateAnatomy`'s heading half ("נ"צ הוא לא סתם מספר") had been dropped when
   merging the heading into the flowing paragraph. Restored.

These were caught by re-diffing the implementation against the original file read at the
start of the task — a reminder that "restyle only" edits can silently drop copy when
JSX is being restructured; worth a full text diff every round, not just a visual one.

## Remaining deltas to consider for round 3
- The 3-part slider tick-label row is now inside a narrower (~1fr of 3 columns) column;
  need to verify "50 מ׳ (טווח רסיסים)" doesn't wrap awkwardly or collide with the other
  two labels at this width — check screenshot, shrink font or allow wrap gracefully if
  needed.
- Exercise the slider at a non-zero value (e.g. ~50) to confirm the danger-tier styling
  (red pill, red big number, red bordered callout, animated impact-point offset in the
  map, displacement dashed line) all render together correctly — round 2 only screenshotted
  the resting shift=0 state.
- Minor: decorative "spark" divider glyph in the systems grid sits slightly low (aligned
  to the format-row hairline rather than true vertical center of the whole grid) — low
  priority, acceptable as-is.
