# Round 02 — visual audit

Screenshots: `scale-round-02.png` (viewport), `scale-round-02-full.png` (full
page, after manually triggering the `whileInView` reveal on `ProjectionCallout`
— see note below).

## Note on a false alarm
The first full-page capture this round appeared to be missing the entire
"למה כל מפה משקרת קצת?" section — it wasn't a bug in my markup: that block
uses `whileInView` / `viewport={{ once: true }}` (pre-existing, untouched
code) and Playwright's `fullPage` screenshot doesn't scroll-trigger the
IntersectionObserver, so it stayed at `opacity: 0`. Confirmed via
`browser_evaluate` that the element exists with full reserved height and
`opacity: 0`. Scrolled it into view once (`once: true` keeps it visible after
that), then re-screenshotted — section renders fully. Not a regression.

## Deltas found
1. **Checkmark badge** — fixed last round (plain `<span>` instead of
   `motion.span layoutId`), now renders correctly inline at the active row's
   visual-left edge, overlapping the border like the mockup. Confirmed good.
2. **Bug: calculator row order/arrow reversed.** Mockup reads, left→right:
   "4 ס"מ במפה" (orange) → arrow (→) → "2.00 ק"מ בשטח" (ink) — i.e. input on
   the visual-left, output on the visual-right, arrow pointing right (a
   deliberate LTR "equation" reading inside the RTL page, similar to how the
   design spec keeps digits/percent LTR). My round-02 render had input on the
   right and output on the left (default RTL flex-row: first DOM child →
   right), which is backwards vs. the mockup. **Fix applied:** switched the
   row to `flex-row-reverse` (DOM order unchanged: input, arrow, output) so
   input lands left / output lands right, matching the mockup; kept the arrow
   at `-rotate-90` (still points right, was already correct for the
   "point toward the right-hand block" reading once the blocks are swapped).
3. Scale-selector list, concept row, map preview frame, sidebar
   checklist/task card, and the 4-column projections row all read close to
   the mockup structurally: same 4-tile divided row (3 projections + warning
   as 4th tile), same icon-led vertical scale list, same divided concept row.
4. Minor: the map's decorative grid-frame numbers ("20/40/60/80" top, "0"
   start-edge) are legible but sparse compared to mockup's denser numbered
   frame — acceptable given they're schematic-only (no fabricated place data,
   see design spec assumption); not treating as a "top-5" fix.

## Next round plan
- Re-screenshot after the calculator order/arrow fix and confirm "4 → 2.00"
  reads left-to-right like the mockup.
- Do a close pixel check of the projections 4-column row spacing/dividers.
- Then move to the interaction pass (click each scale row, type into the
  input) before the responsive pass.
