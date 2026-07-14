# HookScene (topic-02) — Design Spec

Measured from `design-references/topic-02/scene-hook.png` (1568×1003 px, matches the
1568×1003 desktop verification viewport ≈ 1:1). Pixel colors sampled programmatically
with `sharp` (darkest-pixel / mode-color scans per region — see scan commands in this
session; not re-derivable from this doc alone, values below are the conclusions).

## 0. Scope note

The header row (logo/title/tagline + bell/person icons) and the right-side lesson TOC
column ("פתיחה" active + "לפני שמתחילים"… "סיכום") visible in the mockup are rendered by
shared/locked components (`AppHeader`, `ScenePagerDesktop` inside `PagedLearn.tsx`) — NOT
by `HookScene.tsx`. This spec covers only the **content column HookScene owns**: the "02"
numeral + divider, headline, body copy, CTA, and the left-side illustration.

## 1. Layout / composition

Two-column row, vertically centered in the viewport (below the sticky header/tabs),
inside the content area already narrowed by the shared TOC (`ps-[calc(13vw+20px)]` on
the `PagedLearn` root). At 1568px viewport this leaves roughly x:[20, 1340] for our content.

```
┌──────────────────────────────────────────────────────────┐
│  [illustration: tilted survey/coordinate grid]  [text col] │
│   x ≈ 20–700, full column height, roughly square            x ≈ 800–1340
└──────────────────────────────────────────────────────────┘
```

- Illustration (left / inline-end): tilted square dashed grid + full-bleed crosshair +
  center "true vs measured point" pair of dots + faint background contour lines.
  Measured bbox of the diagram proper ≈ x:[65,690] y:[165,830] (roughly square, ~625×665).
- Text column (right / inline-start): natural-width column, right-aligned (`text-end`)
  Hebrew paragraph text, EXCEPT the numeral+its divider and the small accent rule under
  the headline, which are horizontally centered as standalone ornaments:
  - Numeral "02": bbox x:[901,1089] y:[263,419] → glyph height ≈ 156px, centered at x≈995.
  - Divider (thin line + 8-point star, centered): bbox x:[793,1216] y:[400,454], line
    center ≈ x:1004 (matches numeral center).
  - Headline (2 lines): bbox x:[800,1316] y:[481,606]. Both lines share the same **right**
    edge (~1314–1316) → right-aligned, ragged-left, NOT centered.
  - Small accent underline below headline: bbox x:[954,1159] y:[616,646], center ≈ x:1056
    — matches the headline block's own center (1058), so this one ornament IS centered
    under the headline (not right-aligned like the paragraph text around it).
  - Body paragraph (4 lines): bbox x:[833,1298] y:[670,807] — right-aligned (shared right
    edge ~1298, ragged left, classic Hebrew paragraph flow).
  - CTA row ("לחץ כדי להתחיל" + arrow): bbox x:[828,1076] y:[890,933]. Column-density scan
    shows the **arrow sits to the right of the text** (arrow x≈1000–1100, text x≈828–1005)
    — i.e. in DOM/reading order the arrow icon comes *before* the label (arrow renders at
    inline-start), and it points rightward/outward (NOT the usual RTL "chevron-left forward"
    — this one is a plain long arrow glyph, part of the survey/bearing-line motif, not a
    page-navigation chevron, so it is reproduced as literally drawn rather than flipped).

## 2. Colors → token mapping

| Mockup element | Sampled hex | Closest existing token | Note |
|---|---|---|---|
| Page background | `#F4EBE0`/`#F3E9DC` | `bg` (`#F3E9DC`) | exact, already used |
| Numeral "02" | `#38432E`–`#3d4531` | `text-fg` | matches `fg` DEFAULT almost exactly |
| Headline base words | `#31402e`/`#2e3d2c` | `text-fg` | matches `fg` DEFAULT |
| Headline "מילימטר" | `#c86714` (near-exact) | closest raw sample = landing-only `ember.deep`; **used `text-accent` instead** | see assumption below |
| Body paragraph | (anti-aliased, inconclusive at this size) | `text-fg-muted` | matches sibling scene convention (body copy = muted, headline = ink) |
| CTA text + arrow | `#c04f00`/`#c24f0b` (same family as headline accent) | `text-accent` (`hover:text-accent-hover`) | see assumption below |
| Illustration crosshair + primary grid | `#877b58`–`#898067` | `fg-dim` (`#8A8873`) | close match |
| Illustration tilted dashed grid | `#c7703f`–`#d28659` (muted orange) | `accent` at reduced opacity (`text-accent/60`–`/70`) | consistent with ~80% ember-deep-over-cream blend |
| Illustration faint bg contours | very faint tan | `fg-dim/10` or `border/40` | reused from existing `BackdropMap` contour-line technique already in the file |
| Illustration "true point" dot | dark olive | `fill-fg` | |
| Illustration "measured point" dot | orange | `fill-accent` | pairs with the millimeter-error headline |
| Divider hairline (under numeral) | very light gray-tan, low confidence | `border` / `fg-dim` at low opacity | thin 1px rule |
| Divider 8-point star glyph | dark, low-confidence hue (small glyph, noisy sample) | `text-fg` (reuse numeral ink) | see assumption |

### Assumption — accent hue (documented per project rule, not silently guessed)

Direct pixel sampling of "מילימטר" and the CTA text lands almost exactly on `#C96714`,
which is the *landing-only* `ember.deep` token (`tailwind.config.ts` "Landing redesign
palette" namespace — reserved for the homepage per the semantic-layer comment: *"Every
inner screen inherits the Home look through these tokens"*, i.e. inner/lesson screens use
`accent`, not `ember`/`olive`/`paper` directly). Every sibling topic-02 scene
(`ScaleScene`, `OnboardingScene`, current `HookScene`) already uses `text-accent` /
`text-accent-hover` / `bg-accent` for this exact same visual role. To stay consistent with
the rest of the lesson (which I cannot edit) and avoid introducing a second, unused orange
hue into one lesson, this rebuild uses the existing `accent` family (`#D97E2B` /
`accent-hover #E08A38`) rather than reaching for the landing-only `ember` namespace. This
is a deliberate token choice, not a color miss — flagging it here per the "uncertain
value → write it down" rule.

### Assumption — numeral typeface

The "02" glyph in the mockup has visible bracketed/flared serifs and stroke-width
contrast (thin arcs, thicker flat feet) — a slab/serif display face. The project's only
available fonts are `font-sans` (Heebo) and `font-display` (Rubik), both geometric
sans with uniform stroke weight and no serifs. Adding a new webfont requires a new
dependency / editing `globals.css` (`@font-face`), both out of scope for this file-only
task. Approximated with `font-display` at a heavy weight (`font-black`) and large size —
visually reads as a big bold numeral, just without the serif contrast of the mockup.

## 3. Typography (approximate sizes, tuned during the screenshot loop)

| Element | Size (≈) | Weight | Color |
|---|---|---|---|
| Numeral "02" | `clamp(4.5rem, 9vw, 8rem)` | 900 (`font-black`, `font-display`) | `text-fg` |
| Headline (2 lines) | `clamp(1.75rem, 3.2vw, 2.75rem)` | 700–800 | `text-fg`, accent word `text-accent` |
| Body paragraph | `text-base`–`text-lg` | 500 | `text-fg-muted` |
| CTA label | `text-base` | 600–700 (`font-display font-semibold`) | `text-accent` |

## 4. Radius / shadow / border

No cards/panels in this scene — it's typographic + line-art illustration on the bare
page canvas, matching the mockup (no boxed containers visible). CTA remains a plain text
link with arrow (no button chrome), matching the mockup (no pill/fill background drawn
around "לחץ כדי להתחיל").

## 5. RTL notes

- Text column renders at inline-start (right) purely from DOM order in the RTL document
  (same pattern already used by `OnboardingScene`'s `grid md:grid-cols-[2fr_3fr]`, list
  first / diagram second) — no manual `dir` overrides needed.
- Illustration is not mirrored (grid/crosshair authored once, no RTL flip transform).
- The CTA arrow is a literal custom glyph (not a lucide chevron), so it is not subject to
  the "don't auto-flip chevrons" rule in the same way — it's reproduced pointing the same
  direction as drawn in the mockup.
- Any SVG `<text>` added to the illustration sets `textAnchor` explicitly.
