# OnboardingScene (topic-02) — Design Spec

Source image: `design-references/topic-02/scene-onboarding.png` (full-page concept render, 1560×1003-ish).
Scope note: the reference image includes the app header + right-hand lesson TOC sidebar. Those are
rendered by locked shared files (`AppHeader`, `LessonShell`, `Topic02Lesson`, `src/components/lessons/topic-02/SceneHeader.tsx`
which re-exports the shared `src/components/lesson/SceneHeader.tsx`) and are **out of scope** for this
worktree. This spec only covers the content that `OnboardingScene.tsx` itself is responsible for, and
only the parts of it that are NOT the locked `LayeredMap` island (see `onboarding-implementation-plan.md`
for the exact boundary).

## 1. What is locked vs. editable (recap, see task brief for full wording)

Locked (do not touch): `LAYERS` data, `step`/`expanded` state, `clickLayer`, the per-item accordion
button/panel JSX+classes at lines ~126–219 of the original file, and the `LayeredMap` / `Layer` / `Toggle`
functions (SVG map render). These render a flat schematic top-down map — NOT the isometric 3-D diorama
shown in the mockup. **That mismatch (schematic 2-D map vs. isometric diorama) cannot be fixed from this
worktree** — see `design-references/topic-02/specs/onboarding-integration-request.md`.

Editable: the outer grid wrapper around the list+map pair, the wrapper `<div>` directly around
`<LayeredMap>`, the wrapper `<div>` directly around the `LAYERS.map(...)` list, the `SoftDivider`
helper (defined in this same file, not part of the locked island), the `FACTS` grid wrapper (`IntelCard`
itself is a locked shared component, but the grid/columns/gap around it are mine), and the section's own
top-level spacing/padding.

## 2. Colors (mapped to existing tokens only — no new hex)

| Mockup swatch | Approx hex sampled | Existing Tailwind token | Notes |
|---|---|---|---|
| Page/canvas cream | `#F3E9DC` | `bg` (DEFAULT) | inherited from page shell, not set here |
| Ink / heading green | `#38432E` | `fg` (DEFAULT) | exact match — already used site-wide as `text-fg`/`text-black` |
| Muted taupe caption | `#8A8873` | `fg-dim` | exact match |
| Card / panel tint | `#F8F2E7`–`#F6EFE6` | `bg-accent` (`#F6EFE6`) | used for the subtle panel behind FACTS row |
| Hairline border | `#DCCDB2` | `border` (DEFAULT) | used for `divide-x` rules between fact cards and subtle panel border |
| Orange accent (active "05", chevrons) | `#D97E2B` | `accent` (DEFAULT) | already used inside the locked accordion; reused here only for the eyebrow dot (via existing `.section-eyebrow` global class) |
| Dark moss highlight pill | `#5B7C5C`-ish | `brand-dark` | already used inside the locked accordion states — no action needed, it's internal |

No new hex values are introduced anywhere in this pass.

## 3. Typography

Reuses existing scale already present in the file / shared components — no new sizes invented:

| Element | Class plan |
|---|---|
| Eyebrow "לפני שמתחילים" | `.section-eyebrow` (existing global util: 11px, bold, tracking-[0.22em], uppercase, brand-dark text, orange dot) — centered, placed directly above `SceneHeader` |
| H1 + intro | Unchanged — rendered by locked `SceneHeader` (already centered, bold, dark ink — reasonably close to mockup already) |
| "לקרוא מפה — להציל חיים" divider label | `font-display font-bold text-fg` bumped from implicit default to `text-lg sm:text-xl` to read as a real section title (mockup shows it larger/bolder than a caption) |
| Fact cards | Unchanged — `IntelCard` internals are locked |

## 4. Spacing / composition

- Eyebrow → H1: use existing `.section-eyebrow` block with `mb-3` before the (unchanged) `SceneHeader`.
- List/map grid: keep `grid md:grid-cols-[2fr_3fr]` proportions (already matches the mockup's ~40/60
  list/map split once RTL column order is accounted for — column 1 = 2fr = the list, renders on the
  visual right in RTL; column 2 = 3fr = the map, renders on the visual left — this already matches the
  mockup's "big diorama left, list right" composition). Widen `gap-6` → `gap-8 md:gap-10` to match the
  mockup's more generous breathing room between the two columns.
- Map wrapper: drop the boxed `surface-elevated` card look (white fill + hairline border + shadow) in
  favor of a borderless, larger-radius container (`rounded-2xl`, transparent/`bg-transparent`) so the
  locked SVG map reads as sitting directly on the cream canvas, per the mockup's open (non-carded)
  treatment of the diorama. Raise `min-h-[280px]` → `min-h-[360px] md:min-h-[420px]` so the map gets a
  similar visual weight to the mockup's large diorama.
- List wrapper: keep `space-y-3`; no change needed structurally (item-level styling is locked).
- Section rhythm: `SoftDivider` gets slightly more vertical air (`my-10 md:my-14` vs `my-12` flat) and a
  bolder label per §3.
- FACTS: change `grid sm:grid-cols-2 gap-4` → `grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0`, wrapped
  in a subtle panel (`rounded-2xl bg-bg-accent/60 p-4 md:p-6`) with `lg:divide-x lg:divide-border`
  between the 4 cards at the `lg` breakpoint, to match the mockup's single continuous 4-up band with
  hairline separators instead of 4 discrete white cards in a 2×2 grid.

## 5. Radius / shadows / borders

All reused from existing tokens: `rounded-2xl` (already in `borderRadius` scale), `border-border` /
`divide-border` (existing hairline token), no new shadow — the map wrapper intentionally drops
`shadow-elevated` per §4, and the FACTS panel uses no shadow (mockup's bottom band reads flat, only the
individual fact "icon disks" have any depth, which is internal to `IntelCard`/`Icon`, both locked).

## 6. RTL

- No `left-`/`right-` introduced. All spacing added is via `gap`, `p`, `divide-x` (logical in Tailwind's
  RTL plugin already loaded — `tailwindcss-rtl` flips `divide-x` correctly under `dir="rtl"`).
- No diagrams touched/mirrored (locked island untouched).
- No new inline SVG `<text>` added by this pass.

## 7. Assumptions (per CLAUDE.md §"If a visual detail is uncertain")

- The mockup's isometric terrain diorama cannot be reproduced (locked SVG renders a flat schematic map
  instead) — documented as an integration request, not silently faked.
- The mockup's "לפני שמתחילים" eyebrow chip above the H1 is reproduced using the existing copy string
  already present in the source (`eyebrow="לפני שמתחילים"` prop, currently accepted but not rendered by
  the shared `SceneHeader`) — I'm not inventing new Hebrew copy, just re-surfacing the exact existing
  string via my own wrapper markup + an existing global class (`.section-eyebrow`), since I cannot edit
  the shared `SceneHeader.tsx` to make it render its own `eyebrow` prop again.
- FACTS 4-up-with-dividers layout at `lg:` is an approximation of the mockup's continuous band; exact
  breakpoint where it switches from 2-up to 4-up is a judgment call (chosen at `lg` = 1024px so it is
  reliably 4-up at the 1568px verification viewport).
