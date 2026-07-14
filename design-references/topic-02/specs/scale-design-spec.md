# Design Spec — ScaleScene (topic-02 / "קנה מידה")

Source: `design-references/topic-02/scene-scale.png` (1568×1003 — matches the desktop
target viewport exactly, ≈1:1 mapping to CSS px).

Scope note: the mockup's top brand header, the "02" step numeral + underline, and the
right-hand full-height lesson nav rail (פתיחה / לפני שמתחילים / ... / סיכום) belong to
shared/locked chrome (`AppHeader`, `Topic02Lesson`, `PagedLearn`, topic-02-local
`SceneHeader`) — not to `ScaleScene.tsx`. This spec only covers the content area that
`ScaleScene` actually renders: the title/intro row is produced by `<SceneHeader/>` from
props already in the code and is NOT restyled here (it's the locked component); the
spec starts from what sits below/inside the scene body.

## 1. Colors → tokens

| Mockup swatch | Nearest hex | Tailwind token |
|---|---|---|
| Page/canvas cream | `#F3E9DC` | `bg-bg` / `bg-paper-page` |
| Card / panel white-cream | `#FFFFFF` / `#F8F2E7` | `bg-bg-elevated`, `bg-bg-card`, `surface`, `surface-elevated` |
| Hairline divider | `#DCCDB2` @ ~60% | `border-border/60` (as already used by `.surface`) |
| Ink (titles, numbers) | `#38432E` | `text-fg` |
| Muted ink (subtitles, captions) | `#8A8873` | `text-fg-dim` / `text-fg-muted` |
| Orange accent (active state, "4 ס"מ", warning headline, checkmark) | `#D97E2B` | `text-accent`, `bg-accent`, `border-accent` |
| Olive-green big numbers ("2.00 ק"מ", ratios) | `#38432E` / `#5B7C5C` | `text-fg`, `brand-dark` for active icon fill |
| Icon chip (inactive, tan/khaki) | `~#C9B892` tint | `bg-bg-accent` with `text-fg-muted` |
| Icon chip (active, dark olive/pine) | `~#2E3826` | `bg-brand-dark` (existing `.text-bg-elevated` icon glyph on top) |

No new hex values were needed — every mockup color maps onto an existing semantic
token already used elsewhere in this scene/codebase.

## 2. Layout (top → bottom, inside the scene body)

1. **Concept row** — was two large padded cards ("הכלל המנחה" / "ההיגיון ההפוך");
   mockup shows one slim divided row: two cells separated by a vertical hairline,
   each cell = small icon + single bold line of takeaway text. No visible body
   paragraph in the mockup crop.
   → We keep both existing headline lines **and** both existing body paragraphs
   (dropping the paragraphs would violate "never remove content that doesn't fit
   the mockup" — see `design/assumptions.md`), but compress the chrome: no more
   big padded `surface-elevated` cards with an uppercase eyebrow tag; instead a
   single thin row (one hairline-bordered strip, not two separate elevated
   cards), 2 columns divided by a vertical `border-border` line, icon + headline
   inline, paragraph below in smaller muted type.
   - Icons: magnifying glass (custom inline svg, not in `Icon.tsx`) for the first
     cell, a left-right swap glyph (custom inline svg) for the second — mirrors
     the mockup's search icon / ⇄ icon.
2. **Scale selector "בחר קנה מידה"** — was a horizontal 3-up grid of pill
   buttons; mockup shows a **vertical stack of 3 rows** inside one bordered
   panel, each row = icon circle + ratio (bold) + size-label in parens + 2-line
   subtitle, active row gets a bordered box + trailing checkmark. Panel gets its
   own small header "בחר קנה מידה" (existing pattern already used with
   "מחשבון..."/"משימתך כעת" headers — reuse the same label style).
3. **Two-column body**: map preview (start/right side, wider, ~1.4fr) + sidebar
   (end/left side, ~1fr) — this matches the existing `lg:grid-cols-[1.4fr_1fr]`
   already in the code; kept as-is, just restyled surfaces.
   - **Map preview** (`ScalePreview`): mockup shows a much richer "real
     topographic map" look (coordinate-grid frame numbers, olive/sage contour
     tint, tan grid lines, bordered scale-bar box with tick marks) — but with
     invented place names/rivers not present in source. Per project rule
     ("never invent or transcribe Hebrew copy/data from the reference image"),
     we do NOT add fictional toponyms. We DO lift the *chrome*: card border/
     radius/shadow, palette (sage contour lines, tan grid), a light decorative
     coordinate-frame tick numbering (generic, not tied to any real place —
     documented in assumptions.md), and a bordered/ticked scale-bar box —
     while keeping the exact same conditional SVG logic, values, and computed
     scale-bar caption strings.
   - **Sidebar top card "מחשבון מהיר"**: mockup = bordered panel, ruler icon
     top-end, big two-part readout "4 ס"מ במפה" (orange) → arrow → "2.00 ק"מ
     בשטח" (ink), caption line below a hairline. Existing `<input>` stays a real
     `<input type="number">`, just restyled to look like the bold orange "4"
     (no visible chrome except on focus) instead of a boxed input.
   - **Sidebar second card**: mockup shows one card "משימתך כעת" (icon + orange
     headline + paragraph). Source code's second sidebar block has an
     additional "רזולוציה קרטוגרפית" checklist ABOVE the task text that has no
     mockup equivalent — kept in full (see assumptions.md) inside one
     matching-style bordered card, checklist first, hairline, then the task
     text — this is the closest fit that loses no content.
4. **Projections callout** ("למה כל מפה משקרת קצת?"): mockup turns the 3-tile
   grid + separate full-width warning banner into a **single 4-column row**
   (3 projection tiles + a 4th "warning" tile in the same row, divided by
   hairlines instead of individual card backgrounds). We keep the exact same
   copy (title, intro paragraph, all 3 `ProjectionTile` props, and the full
   warning sentence) — only `grid-cols-3` + separate banner become
   `lg:grid-cols-4` with the warning content restyled into the 4th cell
   (icon + orange headline + paragraph, matching the tile shape). The mockup's
   extra orange tagline under the title ("הקרנה היא כמעט תמיד...") is NOT
   present in source code — not added (would be inventing copy); see
   assumptions.md.

## 3. Typography

- Headline-weight text throughout keeps `font-display font-bold`, already the
  project convention (Rubik display font via `font-display`).
- Ratio numbers ("1:10,000" etc.) and computed numbers ("2.00", "4") keep
  `tabular-nums`.
- Small caption/eyebrow labels keep `text-[11px]`–`text-xs` with
  `tracking-wide`/`tracking-wider`, matching existing sidebar card headers.

## 4. Radius / shadow / border

- Cards/panels: keep the project's `rounded-[3px]`/`rounded-[4px]` sharp-corner
  convention already used throughout this scene (not the generic
  `surface-elevated` 2xl radius) — the mockup shows small, near-square corners
  (~3–6px), consistent with what's already in `ScaleScene.tsx` today (a
  deliberate scene-local variant of `.surface`). Continue that convention.
- Borders: 1px `border-border` hairlines between cells instead of drop shadows
  wherever mockup shows a divided row rather than stacked cards.
- Active/selected states: `border-accent` + `bg-bg-elevated`, checkmark icon
  trailing (already the existing active-row treatment, kept).

## 5. RTL

- All existing logical properties (`start-`, `end-`, `me-`, `ms-`) are kept;
  no new `left-`/`right-` utilities introduced.
- The "4 ס"מ → 2.00 ק"מ" arrow keeps its current `sm:-rotate-90` chevron
  (verified: already renders pointing start→end correctly, matches mockup).
- All SVG `<text>` in `ScalePreview` already sets `textAnchor` explicitly —
  preserved as-is; any new SVG `<text>` (grid-frame numbers) also sets
  `textAnchor` explicitly.
