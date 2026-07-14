# Implementation Plan — ContoursScene.tsx

Only file touched: `src/components/lessons/topic-02/ContoursScene.tsx`.

## Step 1 — Panel A (3D cake + top-down map)

- Keep `<SceneHeader .../>` call exactly as-is (props unchanged).
- Wrapping panel: swap `surface-elevated p-6 mb-6 rounded-[4px] border border-border/50` for
  `surface-elevated p-6 mb-6` (drop the radius/border overrides, let `.surface-elevated` supply
  `rounded-2xl border-border/60 shadow-elevated`).
- Section label rows ("מבט תלת־ממדי · ההר כעוגת פרוסות", "מבט מלמעלה · איך זה נראה במפה"):
  add `text-center` (currently start-aligned by default).
- Inner mini-panels around `<ContourCake3D .../>` and `<ContoursAsMap .../>`: swap
  `rounded-[3px]` for `rounded-xl` (softer, but still clearly nested inside the outer rounded-2xl
  panel — avoids two competing large radii).
- Captions under each view: unchanged text/logic, keep centered.
- Do NOT touch props/state passed into `ContourCake3D` or `ContoursAsMap`.

## Step 2 — Soft divider

- Keep `<SoftDivider text="זיהוי תנאי שטח לפי צפיפות" />` (content preserved per project rule).
- Reduce visual weight: smaller vertical margin (`my-8` instead of `my-14`) and smaller text
  (`text-xs` instead of `text-sm`) so it reads as a quiet section seam, closer to the mockup's
  plain gap, without deleting real copy.

## Step 3 — Shape selector → segmented control

- Replace the `grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6` card grid with a single pill-track:
  `flex rounded-full border border-border p-1 bg-bg-elevated gap-1 mb-0` (this track becomes the
  TOP part of Panel B, see step 4 — it moves inside Panel B's own wrapper, not a separate
  standalone block above it).
- Each `SHAPES.map` button:
  - Same `onClick={() => setShapeId(s.id)}`, same `key`, same active-detection logic (`s.id ===
    shapeId`) — unchanged.
  - Drop the icon-badge (`badgeChar` circle) and the subtitle line — the mockup's tabs are label-
    only. `badgeChar`/`subtitle` derivation can stay in code (harmless) or be removed; simplest is
    to stop rendering the icon-badge `<span>` and the subtitle `<div>`, keep only `s.label` as the
    button's text, since the visual language changes to plain segmented tabs.
  - Classes: `flex-1 rounded-full py-2.5 px-4 text-center font-display font-bold text-base
    transition-colors` — active: `border border-accent bg-bg-elevated text-accent`; inactive:
    `border border-transparent text-fg hover:text-accent/80`.
  - Remove the `motion.span layoutId="t2-shape-bar"` absolute bar (was for the old card style) —
    replaced by the border+text color swap on the tab itself, still framer-motion-friendly if
    desired (optional `layoutId` on the active tab's border wrapper), but not required for the
    interaction to keep working (state/behavior unchanged either way).

## Step 4 — Panel B wrapper (tabs + description + graph together)

- New outer wrapper: `surface-elevated p-6 mb-6` containing:
  1. The segmented-control row from Step 3.
  2. A `grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch mt-6` containing:
     - Left: the existing `AnimatePresence` shape-description `motion.div` (icon + title +
       paragraph) — keep the internal content and animation exactly as-is; only restyle its own
       card wrapper from `surface p-6 border-r-4 border-accent rounded-[3px]` to `border-e-4
       border-accent ps-6` (logical RTL border, no more nested surface-inside-surface / no more
       rounded-[3px] since it now lives inside Panel B rather than being its own boxed card).
     - Right: the existing `ShapeMap` wrapper, restyled from
       `surface-elevated bg-bg-accent/20 ... border border-border/50 rounded-[4px]` to
       `bg-bg-accent/20 rounded-xl border border-border/40` (drop `surface-elevated`'s own
       shadow/border since it's now a nested graph area inside Panel B, not a second competing
       elevated panel).
  3. `<Glossary />` is REMOVED from this left column (see Step 5 — it moves out to its own
     section, not nested inside Panel B / the left description column).

## Step 5 — Glossary becomes its own (unboxed) section beside Panel B

- Restructure the row that currently is `grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch`
  (Panel B) plus the description+Glossary column, into:
  - An outer `grid lg:grid-cols-[1.35fr_1fr] gap-8 items-start` row where:
    - First column (renders at inline-start / visual right in RTL... verify empirically in
      screenshot since grid column order follows DOM order under `dir=rtl`) = Panel B (Step 4).
    - Second column = Glossary section: no `surface`/border-radius/shadow on the outer
      container; instead `lg:border-e lg:border-border/50 lg:ps-8` for the vertical hairline
      divider (logical property, RTL-safe) and internal `divide-y divide-border/40` between rows.
  - `Glossary()` component: keep function name/export shape, replace internal markup:
    - Header: centered `מילון מושגים` title with two flanking `h-px flex-1 bg-border/50` rules
      (small local reuse of the `SoftDivider` visual idea, not a shared/locked component).
    - Each `Item`: change from vertical stack to
      `flex items-center gap-4 py-4 first:pt-0 last:pb-0` with, in DOM order: icon swatch (small
      inline SVG glyph per term, decorative only — concentric ellipses / vertical arrow /
      ellipse outline / diagonal lines, matching the 4 existing terms), then `term` (bold,
      shrink-0 width ~ fits content), then `def` (flex-1, `text-fg-muted text-xs`).
    - Text content (`term`, `def` strings) unchanged — only layout changes.

## Step 6 — Verify nothing in the locked island moved

- Diff review before each screenshot round: `ContourCake3D` import/usage line, `ContoursAsMap`
  function body, `LEVELS`, `CX`/`MAP_CY`/`RING_K`/`ringRx`/`ringRy`, `activeRing` state and its
  setter wiring — all must be byte-identical to the pre-edit version except possibly the
  className on the ContoursAsMap's own outer `<div className="aspect-video ...">` (not touched
  per plan either — only the OUTER-OUTER wrapper `<div className="surface bg-bg-accent/20
  rounded-[3px] p-4 border border-border/40">` around `<ContoursAsMap .../>` gets a radius class
  tweak per Step 1; the component's own internal div/svg is never edited).

## Step 7 — Screenshot rounds

- Round 1: implement Steps 1–5, screenshot, audit.
- Round 2: fix top 5 deltas.
- Round 3: fix top 5 deltas, confirm interaction (hover rings, shape switch, 3D drag) still works.
