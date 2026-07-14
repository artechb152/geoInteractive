# Design Spec — ContoursScene ("קווי גובה"), Topic 02

Source: `design-references/topic-02/scene-contours.png` (1568 × 1003 px — matches our 1568×1003
desktop target ≈1:1). Header + right nav rail visible in the reference are the shared, locked
`AppHeader` / `PagedLearn` / `SceneHeader` chrome — out of scope, not addressed below.

All colors/radii/shadows below are mapped to existing tokens in `tailwind.config.ts` and the
component classes in `src/app/globals.css`. No new hex values are introduced.

## 1. Composition (top → bottom, inside the scene content column)

1. **SceneHeader** (locked shared component) — eyebrow "קווי גובה", H1 title, intro paragraph.
   Unchanged; only the props passed to it are already correct in the current code.
2. **Panel A — "3D cake" + "top-down map"**: one bordered, rounded panel containing a 2-column
   grid: left = "מבט תלת־ממדי" (ContourCake3D, locked), right = "מבט מלמעלה" (ContoursAsMap,
   locked). Section labels are centered above each column. Caption under each view.
3. **Panel B — shape selector + description + graph**: one bordered, rounded panel containing:
   - a segmented-control row of the 3 terrain shapes (pill-style tabs, not card-grid),
   - below it, a 2-column split: left = icon + title + description of the selected shape,
     right = the ShapeMap graph (locked-ish, "preserve exactly functionally").
4. **Glossary ("מילון מונחים")** — NOT boxed. Sits to the right of Panel B (RTL: this is the
   visual-right / inline-start… actually per the reference crop, the glossary occupies the
   right-hand half of the row and Panel B (tabs+desc+graph) occupies the left-hand half, i.e. in
   RTL flow the glossary is inline-START and Panel B is inline-END). A thin vertical hairline
   divider separates the two halves. Title "מילון מושגים" centered, flanked by short horizontal
   dashes (echoes the SceneHeader eyebrow style). Each glossary row: icon (small, circular swatch,
   far right / inline-start) + term (bold) + definition (muted, wraps, trails to the left /
   inline-end), separated by thin horizontal hairlines between rows.

Between Panel A and Panel B, the reference shows only a gap — no visible divider caption. Current
code has a `SoftDivider` with the text "זיהוי תנאי שטח לפי צפיפות". Per project rule ("do not
remove content that doesn't fit neatly into the mockup"), this text is kept but restyled smaller /
quieter so it doesn't compete visually, since the mockup itself doesn't emphasize a transition
label there. **Assumption logged in `design/assumptions.md`.**

## 2. Colors (token mapping)

| Mockup element | Sampled look | Token |
|---|---|---|
| Page / scene background | warm cream | `bg-bg` (`#F3E9DC`) — inherited from PageShell, not set here |
| Panel background (Panel A / Panel B) | near-white warm cream | `bg-bg-elevated` (`#FFFFFF`) via `.surface-elevated` |
| Panel hairline border | light tan | `border-border/60` (`#DCCDB2`) via `.surface-elevated` |
| Segmented-tab container border | light tan | `border-border` |
| Active tab border + text | orange | `border-accent` / `text-accent` (`#D97E2B`) |
| Inactive tab text | dark olive ink | `text-fg` (`#38432E`) |
| H3 shape title ("הר תלול") | dark olive ink | `text-fg` |
| Body / description paragraph | muted olive-grey | `text-fg-muted` (`#4A5240`) |
| Glossary term (bold) | dark olive ink | `text-fg` |
| Glossary definition | muted | `text-fg-muted` |
| Glossary icon swatch background | soft tan tint | `bg-bg-accent` (`#F6EFE6`) |
| Divider hairlines | light tan | `border-border/60` or `/40` |
| "30 מ׳" active-level highlight (inside locked island) | orange | already `text-accent` — untouched, inside locked components |

No new hex introduced. `terrain-*` tokens remain untouched (used only inside the locked
`ContourCake3D` / `ContoursAsMap`).

## 3. Typography

- Panel section labels ("מבט תלת־ממדי", "מבט מלמעלה"): `font-display font-bold`, centered,
  `text-fg-muted`, ~14px (`text-sm`) — matches current, just center-aligned instead of start-aligned.
- Segmented tab label: `font-display font-bold text-base` (~16px), single line, no subtitle,
  no icon badge (mockup tabs are text-only).
- Shape title ("הר תלול" etc.): `font-display font-bold text-2xl` — matches current (`text-2xl`).
- Shape description paragraph: `text-sm text-fg-muted leading-relaxed` — matches current.
- Glossary title "מילון מושגים": `font-display font-bold text-sm tracking-wider text-accent`,
  centered with flanking dash rules (reuse the same visual language as `SoftDivider`, just used
  as a section title here rather than a full-width divider).
- Glossary term: `font-display font-bold text-sm` (kept close to current `Item` styling, just
  laid out horizontally).
- Glossary definition: `text-xs text-fg-muted leading-relaxed`.

## 4. Spacing / radius / shadow

- Panel A / Panel B: `.surface-elevated` (→ `rounded-2xl`, `border-border/60`, `shadow-elevated`
  i.e. the `card-soft` shadow `0 6px 18px rgba(90,70,40,0.07)`), padding `p-6`. This replaces the
  current ad-hoc `rounded-[3px]` / `rounded-[4px]` overrides, which fight the shared `.surface*`
  convention and read far sharper/flatter than the generously rounded mockup panels.
- Segmented tab row: outer container `rounded-full` (pill), `border border-border`, `p-1`; each
  tab `flex-1 rounded-full py-2.5 px-4 text-center`; active tab gets `border border-accent
  bg-bg-elevated text-accent` (a pill "chip" nested inside the pill track — matches the mockup's
  orange-outlined active segment).
- Panel B internal 2-col split: `grid lg:grid-cols-[1fr_1.4fr] gap-6` (kept from current code —
  already matches the mockup's narrower-description / wider-graph ratio).
- Glossary rows: `divide-y divide-border/40`, each row `flex items-center gap-4 py-4`; icon
  swatch `size-11 rounded-full bg-bg-accent flex items-center justify-center shrink-0`.
- Vertical divider between Panel B and Glossary: on the `lg:grid-cols-[1.4fr_1fr]` (or similar)
  wrapping grid, a `lg:border-e lg:border-border/50 lg:pe-8` (logical, RTL-safe) instead of a
  literal absolutely-positioned line.

## 5. RTL notes

- Glossary row uses logical `gap`/`ps`/`pe`, no left/right.
- Divider between Panel B and Glossary uses `border-e` (logical "end" border), not `border-l`.
- No SVG `<text>` is added by this restructuring; existing `textAnchor="middle"` inside the
  locked `ContoursAsMap`/`ShapeMap` is untouched.
- Segmented tab active state must not depend on physical left/right — `flex-1` items in normal
  DOM order render correctly RTL because the container is `dir` inherited from the page.

## 6. Explicitly out of scope / preserved untouched

- `ContourCake3D.tsx` — not edited.
- `ContoursAsMap` function body (SVG rendering, `LEVELS`, ring math, hover coupling) — not edited,
  only its wrapping container's utility classes (border/radius/padding) may change.
- `ShapeMap` function body — not edited. The reference image shows a much more elaborate,
  realistic irregular contour-line illustration with axis tick labels (1600–1840 / 2040–2240).
  That numeric axis data does not exist in `shape.contours` and inventing it would fabricate
  content, plus the instructions require preserving `ShapeMap` "exactly (functionally)". Only the
  outer wrapping panel's styling (border/radius/background) is adjusted to match Panel B's frame.
  Logged as an integration-request candidate, not implemented.
- `SHAPES` data array, `shapeId` state, `activeRing` state — untouched.
- `Glossary`'s actual term/definition text — untouched (only the layout of `Item` changes from a
  vertical stack to a horizontal row with a leading icon swatch).
