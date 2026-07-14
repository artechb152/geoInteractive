# Implementation Plan — ScaleScene restyle

Guiding constraint: `scale` state, `setScale`, `mapDistance` state, `setMapDistance`,
the `realKm` formula, the `<input type="number">` + its `onChange`, the `SCALES`
data array (ids/ratios/labels/detail arrays), `ScalePreview`'s conditional
`detailLevel` logic and every one of its SVG branches, and all Hebrew copy strings
stay byte-for-byte identical. Only JSX structure/className/inline decorative SVG
(new icons, grid-frame ticks) may change.

## Step A — Concept row (replaces the 2-card grid)
- Replace the two `surface-elevated p-6 sm:p-8` cards with a single
  `surface p-4 sm:p-5 rounded-[3px]` strip, `grid sm:grid-cols-2` with a
  vertical divider (`sm:divide-x sm:divide-border` using RTL-safe divide
  utility, or an explicit `border-e` on the first cell to avoid relying on
  `divide-x` physical-direction quirks — use `sm:[&>*:first-child]:sm:border-e`
  style or simpler: wrap each cell then apply `border-e border-border` on the
  first cell only, logical property, RTL-correct).
- Each cell: icon (custom inline svg, 16–18px, `text-accent`) + headline
  (unchanged text) inline; paragraph text below in `text-sm text-fg-muted`
  (kept, not deleted, just demoted visually to secondary weight so the row
  reads compact like the mockup while content survives).
- Remove the uppercase eyebrow ("הכלל המנחה"/"ההיגיון ההפוך") — mockup has no
  equivalent chip and it's decorative/no unique content lost since headline
  text is retained; note: this is content trim of a purely structural label,
  not of substantive copy — acceptable per scope (the label just says "the
  guiding rule" / "the inverse logic", the substantive learning content is the
  headline + paragraph, both kept).

## Step B — Scale selector (grid → vertical list)
- Change `grid grid-cols-1 sm:grid-cols-3 gap-3` → `flex flex-col gap-3`
  (or `grid grid-cols-1 gap-3`), inside a `surface p-4 sm:p-5 rounded-[3px]`
  panel with a small header line "בחר קנה מידה" (new UI label text — allowed:
  it's a functional section header analogous to existing "מחשבון...\"/"משימתך
  כעת" headers already in the file, not learning content).
- Each `<button>` row keeps `onClick={() => setScale(s)}`, active-state
  detection (`s.id === scale.id`), and the `motion.span` active-bar — just
  restyle to full-width row: icon circle start-side, ratio+size-label+subtitle
  stacked end-side, checkmark at the far end when active.

## Step C — Map preview (`ScalePreview`) restyle
- Keep function signature, `detailLevel` derivation, every existing SVG
  element (grid lines, contour ellipses, high/medium/low detail markers, main
  road, scale-bar rects/text) unchanged in logic and values.
- Only touch: `className` colors (swap to sage/olive/tan token classes already
  available: `stroke-border-subtle`, `stroke-accent/40`, `fill-fg-muted`,
  etc. — these already exist in the current code, just push palette closer to
  mockup where a token allows, e.g. verify `stroke-brand` availability for a
  more sage contour tone), add a wrapping bordered frame
  (`border border-border rounded-[3px]`, matches current
  `surface-elevated ... border border-border/50`, keep), and add purely
  decorative generic coordinate-frame tick numbers along the top/start edge of
  the svg (a fixed, scale-independent sequence, NOT tied to any real place —
  documented assumption) to sell the "military topo map" read.
- Scale-bar: wrap existing `<g transform="translate(68,68)">` bar in a small
  bordered box (`rect` with `stroke-border`) to match the mockup's boxed ruler
  look; keep the two `<text>` labels and their existing conditional strings
  exactly as-is.

## Step D — Sidebar "מחשבון מהיר" card
- Keep the real `<input type="number" value={mapDistance}
  onChange={(e) => setMapDistance(Number(e.target.value) || 0)} />` element,
  restyle only: remove visible box chrome by default (`border-transparent
  bg-transparent`), bump to `text-accent` (orange, matches mockup's "4"), keep
  focus ring/border for a11y (`focus:border-accent` already present — keep).
- Keep the rotate `-90` chevron arrow, keep `realKm.toFixed(2)` display, keep
  tip line.

## Step E — Sidebar second card ("רזולוציה קרטוגרפית" + "משימה אופיינית")
- Keep `AnimatePresence`/`motion.div` with `key={scale.id}` and its
  enter/exit animation untouched.
- Restyle inner spacing/border only: swap `border-r-2 border-accent` framing
  for a plain `surface p-5 rounded-[3px]` panel (matching the mockup's simple
  bordered card) with an internal hairline divider between the checklist and
  the task text (already present as `border-t border-border-subtle`, keep).

## Step F — Projections callout
- Change `grid grid-cols-1 md:grid-cols-3 gap-4` → `md:grid-cols-4`, add the
  warning content as a 4th tile-shaped cell reusing `ProjectionTile`'s visual
  rhythm (icon + headline + paragraph) instead of the separate full-width
  `bg-accent-cool/5` banner below. Exact same warning sentence, same
  `AlertTriangle`-style inline svg already in the code, same `<strong>` markup.
- Add a small line-art inline svg icon per `ProjectionTile` (none exist today)
  since `Icon.tsx` is read-only and doesn't have barrel/globe-grid glyphs —
  reuse `Icon name="globe"` for two, a small custom inline "cylinder" svg for
  Transverse Mercator. Documented as an approximation in assumptions.md.

## Verification
- After each step, screenshot @1568×1003 and diff against
  `design-references/topic-02/scene-scale.png`.
- Exercise `scale` switching (click all 3 rows) and the distance `<input>`
  (type a new value) live in the browser before committing.
