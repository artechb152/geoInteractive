# Design Spec — TopographyScene (topic-02 / scene-topography)

Source: `design-references/topic-02/scene-topography.png` (1568 × 1003 px — this is a full-page
render at the exact target viewport, so it includes app chrome — AppHeader, the vertical
lesson step-nav on the visual right/far edge — that belongs to locked/shared files
(`Topic02Lesson.tsx`, `SceneHeader`, `LessonShell`/`PagedLearn`) and is **out of scope** for this
component. Only the content area below the scene's own eyebrow/title/intro (rendered by the
shared `SceneHeader`) is in scope: the view-switch controls + visualization + info panel.

## 1. Composition / layout (in-scope area only)

```
[ tab row: 3 buttons — מודל תלת-ממדי | תצ״א (תצלום מהאוויר) | מפה טופוגרפית (active) ]
[ info panel (≈37%, right/inline-start) ]   [ visualization panel (≈63%, left/inline-end) ]
  · במילים פשוטות  + icon + paragraph            · big SVG diagram (3d/photo/topo)
  · מה היתרון      + icon + bullet list           · bottom-start chip: icon + active label
  · מה הבעיה       + icon + bullet list
  · למה זה חשוב    + icon + paragraph
```

- The three view buttons are a single continuous row (not stacked/accordion), each ~equal width,
  icon above/beside label. Active button ("מפה טופוגרפית" in the reference resting state) gets an
  accent border + accent bottom bar + accent-colored label; inactive buttons are cream/white with
  muted-ink label.
- Below the tab row: 2-column grid. Right column (inline-start, narrower) = always-visible info
  panel driven by the *currently selected* view's data (whatItIs/pros/cons/whyItMatters) — this
  replaces the old per-item accordion with a single panel whose content swaps when the view
  changes (crossfade), matching the mockup which shows one continuous info column, not 3 stacked
  collapsed rows.
- Left column (inline-end, wider, ~63% vs ~37%) = the existing visualization surface (View3D /
  ViewPhoto / ViewTopo), unchanged diagrams, restyled frame only.

## 2. Color mapping → existing tokens (no new hex)

| Mockup element | Token | Notes |
|---|---|---|
| Page/canvas cream | `bg` (`#F3E9DC`) | already the ambient page bg, untouched here |
| Card / panel white | `bg-elevated` / `bg-card` (`#FFFFFF`) via `.surface` / `.surface-elevated` | tab buttons, info panel, viz panel |
| Ink / headings | `fg` (`#38432E`) | section headings, active tab label fallback |
| Muted ink | `fg-muted` (`#4A5240`) | body copy in info panel |
| Dim ink | `fg-dim` (`#8A8873`) | "תצוגה 0N" eyebrow-style label kept for the tab meta line |
| Orange accent (active state, "מה היתרון" bullets skew warm in ref but code already ties bullet color semantically) | `accent` (`#D97E2B`) | active tab border + bottom bar + label + panel active heading + chip |
| Tan hairline borders | `border` (`#DCCDB2`) / `border-strong` (`#C9A56B`) | card borders, dividers between info-panel sections |
| Pros bullets | `status-ok` (`#4ade80`) | unchanged from current code |
| Cons bullets | `status-warn` (`#fbbf24`) | unchanged from current code |
| "למה זה חשוב" heading/icon | `brand-dark` (`#5B7C5C`) | unchanged from current code |

No new color, shadow, or radius token is introduced. Shadows use existing `shadow-elevated`
(`.surface-elevated`) / `shadow-card-soft`. Radius uses existing `rounded-2xl` (`.surface*`
classes already apply this).

## 3. Typography

- Tab button label: `text-sm font-semibold` (matches existing `font-medium text-sm` in old
  accordion header, bumped to `font-semibold` for active-tab hierarchy). Small eyebrow line above
  it ("תצוגה 0N") keeps `text-xs font-display font-semibold tracking-wider text-fg-dim` (rescaled
  down slightly from the old `text-sm` since it now sits in a horizontal tab, not a wide accordion
  row).
- Info-panel section heading: `text-sm font-display font-semibold tracking-wider` — reuses the
  exact classes already used for "במילים פשוטות" / "מה היתרון" / "מה הבעיה" / "למה זה חשוב" in the
  current code (no change needed, they already match the mockup's small-caps-like tracked
  heading style).
- Body / list text: existing `text-sm text-fg leading-relaxed` — unchanged.

## 4. Spacing

- Tab row: `gap-3` between the 3 buttons, row sits above the 2-col grid with `mb-6` (roughly
  matches the visual gap between button row and content row in the mockup).
- Info panel internal: sections separated by `divide-y divide-border/60`, each section
  `py-4` (first section `pt-0`), consistent with hairline dividers visible in the mockup between
  "במילים פשוטות" → "מה היתרון" → "מה הבעיה" → "למה זה חשוב".
- Grid column ratio: `lg:grid-cols-[1fr_1.7fr]` (info panel ≈37%, viz panel ≈63%), adjusted from
  the old `[1fr_1.4fr]` to better match the mockup's wider visualization pane. Verified/tuned
  during the screenshot-compare rounds.

## 5. Radius / shadow / border

- Tab buttons: `.surface` (rounded-2xl, `border-border/60`); active tab adds `border-accent`
  (2px) + a 2px accent bottom bar (`::after`-style via a small absolutely-positioned span, using
  logical `inset-inline` position, NOT `left/right`).
- Info panel + viz panel: `.surface-elevated` (rounded-2xl, `shadow-elevated`), same as before.

## 6. RTL

- Info panel is the grid's first child → renders at the visual right (inline-start) exactly as
  today; visualization stays second child → visual left (inline-end). Unchanged from current
  code's documented intent.
- Tab row buttons keep natural DOM order (01 מודל תלת-ממדי, 02 תצ״א, 03 topo) — under `dir="rtl"`
  (inherited from `<html>`) this reads right-to-left automatically via normal flex/grid flow, no
  `flex-row-reverse` needed (matches existing accordion's assumption).
  the active-tab bottom accent bar uses `inset-inline-start-0`/`w-full`, no `left-0`.
- All touched/added inline `<text>` elements (none of the 3 diagram SVGs' `<text>` nodes are
  modified in content) already set `textAnchor` explicitly — verified unchanged; any *new*
  decorative section-icon SVGs added for the info panel headings contain no `<text>` nodes, so no
  new RTL text-anchor risk is introduced.

## 7. Assumptions (also logged to design/assumptions.md if genuinely ambiguous)

- The mockup's per-section icons (ruler for "מה היתרון", tangled lines for "מה הבעיה", folded map
  for "למה זה חשוב", mountain+contours for "במילים פשוטות") have no exact match in the shared
  `Icon.tsx` icon set (read-only, cannot extend). Small inline decorative SVGs are added locally
  in `TopographyScene.tsx` (same understated line-icon style as `Icon.tsx`: 24×24 viewBox,
  `currentColor` stroke, no fill, no text nodes) to preserve the mockup's per-section visual
  identity without touching the shared icon file or inventing new color tokens.
- The mockup's 3-button row shows the *topo* view active at rest; the component's real default
  state is `view = 'topo'` already (unchanged), so this matches without any logic change.
