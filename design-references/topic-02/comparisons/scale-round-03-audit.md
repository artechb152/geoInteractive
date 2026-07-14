# Round 03 — visual audit (final desktop pass)

Screenshots: `scale-round-03-full.png` (full page, 1568px wide),
`scale-round-03-interaction-10k.png` (after clicking the 1:10,000 row),
`scale-round-03-interaction-input.png` (after typing "10" into the distance
input).

## Fixes verified this round
1. **Calculator row order** — now reads "4" (orange, visual-left) → arrow (→)
   → "2.00" (ink, visual-right), matching the mockup's left-to-right
   "equation" reading exactly. Confirmed via `flex-row-reverse` fix from
   round 02.
2. Dev server hiccup (unrelated to the component): running `npm run build`
   in the same worktree while `npm run dev` was live corrupted `.next`'s
   dev webpack-runtime (`Cannot find module './vendor-chunks/next.js'`),
   which cascaded into 404s for `main-app.js`/`layout.css` in the browser.
   Fixed by killing the stale dev process, deleting `.next`, and restarting
   `next dev` — not a ScaleScene regression, just build/dev cache
   contention. No further QA impact once restarted (fresh tab loaded with
   zero console errors).

## Structural comparison vs. mockup (`scene-scale.png`)
- Concept row: divided 2-cell strip, icons + retained full paragraphs —
  matches mockup's compact layout while keeping 100% of the source copy.
- "בחר קנה מידה" panel: vertical icon-led list, active row bordered +
  checkmark badge at the visual-left edge (overlapping the border, same as
  mockup) — matches.
- Map preview: schematic/abstract (intentionally, no fabricated place data
  per design-spec assumption), bordered neatline frame, tan/olive contour
  palette, boxed scale-bar with tick marks — reads as "topo map chrome"
  close to the mockup's spirit without inventing content.
- Sidebar "מחשבון" card: input/output order and arrow direction now match.
- Sidebar "רזולוציה קרטוגרפית" + "משימה אופיינית" card: kept both sections
  (mockup only shows a single condensed paragraph under "משימתך כעת" — see
  `scale-design-spec.md` §2 for why the checklist was kept, not dropped).
- Projections row: 4-column divided row (3 tiles + warning as 4th tile),
  right-to-left order (Transverse Mercator → Web Mercator → UTM → warning)
  matches the mockup's column order.

## Interaction QA (live in browser, this round)
- Clicked `1:10,000` row → `scale` state updated, checkmark moved, map detail
  level switched to "high" (grid density + contour count changed), scale-bar
  caption switched to "500 מ׳", resolution checklist + "משימה אופיינית" text
  updated to the 10k entries, and the quick-calculator recomputed
  `4 × 10,000 / 100,000 = 0.40` km — confirmed "0.40" in the DOM.
- Typed "10" into the distance input (`onChange` → `setMapDistance`) →
  recomputed `10 × 10,000 / 100,000 = 1.00` km — confirmed "1.00" in the DOM.
  Formula, state, and input wiring are untouched and working.

## Remaining known gaps (acceptable, documented)
- Map preview stays abstract/schematic rather than the mockup's richly
  detailed named-place topographic map — deliberate, to avoid inventing
  Hebrew place-name/coordinate data not present in the source code.
- Icon glyphs for the 3 projection tiles are close approximations (existing
  `Icon` set + small custom inline SVGs), not pixel-identical to the
  mockup's exact icons, since `Icon.tsx` is read-only and doesn't have
  barrel/globe-grid glyphs.

Desktop (1568×1003) pass considered solid after 3 rounds. Moving to a brief
responsive check next, per the process.
