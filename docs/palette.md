# Palette · גיאוגרפיה צבאית

The brand palette for the whole site (landing + lessons). All UI colors should derive
from this file — do not introduce other colors without updating it.

## Colors

| Hex | Tailwind token | Role |
|---|---|---|
| `#EB9E48` | `accent` | Primary buttons + key call-out accents |
| `#B17736` | `accent-hover` | Primary button hover / pressed |
| `#749C75` | `brand` | Site primary color + secondary buttons |
| `#5B7C5C` | `brand-dark` | Emphasis (headlines, links), secondary button hover |
| `#000000` | `fg` | Body text + the partner color of `brand` (sage green) |
| `#FFFBF7` | `bg` | **Site background** — the canvas everywhere |
| `#FFFFFF` | `bg-elevated` / `bg-card` | **Differentiated surfaces** — cards, modals, accordion panels, popovers, scrolled navbar |
| `#FFDCB5` | `bg-warm` | **Optional decorative warm band** — accent sections, illustration bases (e.g. the diorama platform). Not for full-page or card backgrounds. |

## Visual roles

```
PRIMARY      orange #EB9E48   → "buy / start / submit" buttons
PRIMARY hover         #B17736 → press state for the orange button

BRAND        sage   #749C75   → secondary buttons, brand identity, body accents
BRAND dark           #5B7C5C  → emphasised headings, links, secondary hover

TEXT         black  #000000   → all body and heading copy; pairs with sage

PAGE bg      cream  #FFFBF7   → the canvas
CARD bg      white  #FFFFFF   → cards, accordion panels, modals — lifted off the page
WARM band    peach  #FFDCB5   → optional accent sections / illustration bases
```

## Usage rules

- **Primary CTA** — `bg-accent text-fg hover:bg-accent-hover`
  e.g. `התחלת הקורס`, `שליחה`, `הצטרפות`.
- **Secondary CTA** — `bg-brand text-bg-elevated hover:bg-brand-dark`
  e.g. `מה לומדים`, `קרא עוד`, `סילבוס`.
- **Tertiary / ghost** — `border border-brand/40 text-brand hover:bg-brand/10`
  Use sparingly; prefer one of the two above.
- **Headlines / emphasis** — `text-brand-dark` (or `text-fg` for max contrast).
- **Body copy** — `text-fg`. Muted body — `text-fg/70` (still black, just softer).
- **Page background** — `bg-bg` (cream). Body in `globals.css` sets this once.
- **Cards / accordion / elevated surfaces** — `bg-bg-elevated` (pure white).
- **Borders** — `border-border-subtle` (very soft) or `border-border` (default).
- **Warm decorative bands** — only `bg-warm` when you want a deliberately warm
  highlight section. Don't use it for the whole page or for card backgrounds.

## Don't

- Don't introduce extra accent colors (blues, purples, reds) for variety —
  variety comes from typography, layout, and motion, not new hues.
- Don't put `text-accent` on `bg-bg` for long-form text — orange-on-cream
  contrast is borderline. Reserve orange for fills, icons, and short labels.
- Don't use the gold `#d4a72c` from earlier drafts anywhere — replaced by `#EB9E48`.
- Don't use `bg-warm` for the whole page — it's a feature accent, not a canvas.

## Diorama / illustration mapping

For the Hero 3D terrain (and any future illustrations), elevations map roughly:

```
platform → warm peach  (#FFDCB5 — the bg-warm) → the mountain sits on a sand patch
base     → sand cream  (close to bg-warm)
mid      → sage greens (#749C75 / #5B7C5C)
peak     → primary orange (#EB9E48 → bright peak)
```

So the mountain rises from a sand-coloured platform that itself rests on the cream
page — three readable "altitudes" of warmth, with sage as the middle counterpoint.
