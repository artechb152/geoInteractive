# Round 01 — visual audit

Screenshot: `scale-round-01.png` (viewport-only, 1568×1003; live page has its own
top nav bar + right lesson-outline sidebar, both outside `ScaleScene`'s scope,
so the scene content starts lower than in the flat mockup frame and the
bottom of the scene is below the fold in this viewport capture).

## Deltas found

1. **Bug: active-row checkmark badge mis-positioned.** The `motion.span
   layoutId="t2-scale-check"` checkmark on the active `1:50,000` row renders
   pinned to the row's top-start corner, overlapping the border, instead of
   sitting inline at the row's end (vertically centered) like the mockup's
   trailing check. Root cause: pairing `layoutId` with a plain flex child
   (no previous shared instance, no `AnimatePresence`) makes Framer Motion's
   projection miscompute the transform on mount. **Fix applied this round:**
   dropped `motion.span`/`layoutId`, replaced with a plain `<span>` — still
   conditionally rendered on `active`, same visual badge, no projection bug.
2. Concept row, scale-selector panel, header row all otherwise match the
   mockup's structure well: slim divided 2-cell row with icons + retained
   paragraphs; vertical "בחר קנה מידה" list with icon-circle + ratio + size +
   subtitle, active row bordered.
3. Icon circles for the 3 scale rows read correctly on the row's visual-right
   (inline-start), matching mockup.
4. Not yet verified in this round: map preview frame, sidebar cards,
   projections row (below the fold in this capture) — will screenshot
   full-page next round.

## Next round plan
- Re-screenshot full-page after the checkmark fix.
- Check map preview grid-frame numbers/scale-bar box render as intended.
- Check sidebar "מחשבון" input/arrow/result row alignment.
- Check projections 4-column row + divider lines.
