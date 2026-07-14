# Design spec — CoordinatesScene (topic-02)

Source: `design-references/topic-02/scene-coordinates.png` (1568×1003, matches the target
viewport exactly). Style family: same "design lock" as the rest of the app (warm cream
paper canvas, olive ink, ember-orange reserved for action/danger, flat/minimal — see
`src/app/globals.css` header comment). Colors below are mapped to the closest existing
Tailwind tokens (`tailwind.config.ts`) — no new hex values are introduced.

Note: the header (eyebrow/H1/intro) is rendered by the globally shared, read-only
`src/components/lesson/SceneHeader.tsx` (re-exported from the local topic-02
`SceneHeader.tsx`, also locked). Its internal styling is out of scope — this spec only
covers what `CoordinatesScene.tsx` itself renders below the header.

## 1. Overall composition (top → bottom, within my scope)

1. Compact "concept vs. danger" intro pair (currently 2 heavy boxed cards) — mockup
   shows this space collapsed to a single flat, borderless strip (no visible card box
   in the reference). Real content (both card headings + paragraphs) must be fully
   preserved; restyle to a flatter, tighter pair separated by a thin hairline, echoing
   the flat divider language used everywhere else in the mockup. The danger-themed
   card's heading gets an orange/warning treatment (matches the mockup's orange
   "ספרה אחת שגויה..." callout line under the H1); the concept card's heading stays ink.
2. Two-system comparison (ITM / WGS84) — **flat, no card box, no shadow**. Two columns
   split by a single thin vertical hairline with a small 4-point "spark" glyph centered
   on it (matches the small star/sparkle motif reused elsewhere, e.g. footer bookends).
   Per column, top→bottom:
   - icon (24–28px, plain ink color — **not** tinted orange/blue; the mockup keeps both
     icons/headings in ink, consistent with the project rule "orange only for
     action/focus, never decorative") + short name (`s.short`, bold, ~24–28px) with the
     scope line (`s.scope`) directly under it, ink-colored (not muted-gray).
   - thin horizontal hairline.
   - format row (small icon + `s.format` label) then example row (pin-style icon +
     `s.example`, bold, tabular-nums, larger).
   - thin horizontal hairline.
   - pros row: small ring-circle check icon + "יתרונות" label + list (`s.pros`,
     status-ok green).
   - cons row: small ring-circle "!" badge + "מגבלות" label + list (`s.cons`,
     status-warn amber).
3. Datum-shift demo — also flat/borderless (no big outer card), 3 columns divided by
   thin hairlines matching the systems section:
   - **left** (~26%): title "הדגמת סטייה בין שפות המפה (Datum Shift)" + 1–2 line
     description, "גודל הסטייה המשוערת" label, the slider (unchanged `onChange`), min/max
     end labels, big `{shift} מ׳` readout (color now follows `dangerLevel`, reusing the
     existing status-ok/warn/danger classes already in the file), and the status
     pill/button (existing `dangerLevel` copy, e.g. "✓ סטטוס: תקין" / "✗ סטטוס: סטייה
     קריטית") styled as a solid pill using the same status color family.
   - **middle** (~46%): `ImpactMap` — same offsetX/offsetY logic, restyled colors only
     (cream/paper background instead of pure white, softer grid, target pin blue
     (`accent-cool`, fixing the currently-broken `var(--accent-cool)` gradient stop by
     switching to the `fill-accent-cool`/`text-accent-cool` utility pattern already used
     elsewhere in the same file), impact pin `accent-hot`, label text kept in small
     pill/chip captions.
   - **right** (~28%, only column that keeps a real bordered "box"): the
     `dangerLevel`-colored callout containing the big consequence heading + description
     — matches the mockup's single bordered orange box. All the extra real prose that
     doesn't fit this compact box (the "איך זה קורה בפועל?" / "התוצאה" explanation) is
     preserved in full, moved to a full-width footnote row under the 3-column row
     (thin top hairline, small muted text) rather than deleted — the mockup's box is
     short only because its placeholder copy is short; the real copy is longer and must
     not be cut.
4. Closing "anatomy" strip (`CoordinateAnatomy`) — mockup shows this as a single slim
   banner (thin top+bottom hairline, small decorative "spark" bookend glyphs left/right,
   centered text) instead of the current big-icon card. All existing sentences are kept,
   simply laid out in the flatter band style with the same bold/emphasis color choices
   already present in the JSX (ink default, `text-accent` / `decoration-status-danger`
   for the emphasized closing clauses).

## 2. Colors (token mapping)

| Mockup element | Token |
|---|---|
| Page canvas | `bg-bg` (inherited, `#F3E9DC`) |
| Headings / ink text | `text-fg` (`#38432E`) |
| Secondary text (scope, descriptions) | `text-fg-muted` (`#4A5240`) |
| Tiny uppercase labels ("פורמט:", "יתרונות:") | `text-fg-dim` (`#8A8873`) |
| Hairline dividers (vertical + horizontal) | `border-border` / `border-border/60` (`#DCCDB2`) |
| Pros / check | `text-status-ok` (`#4ade80`) |
| Cons / warn | `text-status-warn` (`#fbbf24`) |
| Danger tier (pill, big number, callout box) | `text-status-danger` / `bg-status-danger` / `border-status-danger` (`#ef4444`) — reuses the `dangerLevel` conditional classes already in the file |
| Orange "attention" line (danger-card heading, warning glyph) | `text-accent` / `bg-accent` (`#D97E2B`) — the app's one reserved action/focus color |
| Impact-map target pin | `accent-cool` (`#5b9dd9`, already used in file) |
| Impact-map impact pin | `accent-hot` (`#e2553a`, already used in file) |

No new hex values. `s.color` field (`text-accent` / `text-accent-cool`) is dropped from
the *decorative* icon/heading usage in the systems grid (mockup + project rule both say
orange/blue must not be decorative there); the two systems keep plain ink headings.

## 3. Typography

- Systems short name (`s.short`): `text-2xl sm:text-3xl font-display font-bold` (down
  from the current `text-4xl` — mockup's "WGS84"/"ITM –…" reads smaller/tighter once the
  card box is removed).
- Scope subtitle: `text-sm sm:text-base font-display font-semibold` in `text-fg` (not
  muted — mockup keeps it ink-colored, just lighter weight than the short name).
- Format label: `text-[11px] uppercase tracking-wide text-fg-dim`.
- Example value: `text-lg font-bold tabular-nums text-fg`.
- Pros/cons label ("יתרונות"/"מגבלות"): `text-sm font-display font-semibold tracking-wide`.
- Datum-shift big number: `text-4xl sm:text-5xl font-display font-bold tabular-nums`,
  color driven by `dangerLevel`.
- Anatomy strip: `text-sm sm:text-base` running text, no separate big heading — mirrors
  the mockup's single-line density (the previous 19px eyebrow + big paragraph text
  are unified into one flowing strip using existing weight/color choices).

## 4. Spacing / layout

- Systems grid: `grid md:grid-cols-2 gap-0` with a `divide-x divide-border` (RTL-safe,
  logical) middle rule instead of `gap-5` between two boxed cards; internal column
  padding ~`px-6 py-2` instead of `p-6` card padding, since there is no card background
  to pad against.
- Datum-shift row: `grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,0.8fr)]`
  with `divide-x divide-border` between the 3 columns; footnote row below spans
  `col-span-full` with a `border-t border-border-subtle pt-4` matching the existing
  footnote style already in the file.
- Anatomy strip: full-width row, `border-y border-border/60 py-5 px-6`, centered text,
  small decorative spark glyphs at each inline edge.

## 5. Radius / shadows

- Per the mockup, the systems grid and datum-shift row are **flat** (no radius, no
  shadow) — only hairline dividers. This deliberately departs from the ambient
  `surface-elevated` card look used elsewhere in the app, because that's what the
  reference image shows for this scene.
- The one exception is the right-hand danger callout box in the datum-shift row and the
  intro pair's danger heading treatment — these may use a subtle `rounded-lg
  border` (existing radius scale, no new value) to read as a distinct alert, matching
  the mockup's bordered orange box.
- Anatomy strip keeps `border-y` only, no radius (mockup shows a straight-edged band).

## 6. RTL notes

- All dividers use `divide-x` (logical, RTL-safe) not manual left/right borders.
- Slider fill-progress visual (if added via inline gradient) must account for RTL: the
  native `<input type="range">` is not direction-aware for its visual fill by default;
  any progress-gradient enhancement will be computed from `shift` (0–100) and applied
  via inline `style` using existing token hex already referenced elsewhere in this file
  (e.g. the SVG's existing raw color use) — kept purely presentational, `onChange`
  untouched.
- All SVG `<text>` inside `ImpactMap` already sets `textAnchor="middle"` explicitly —
  keep this as-is (recurring project bug guard).
- No mirroring of the `ImpactMap` diagram.

## 7. Assumptions (documented per project rule — see also root `design/assumptions.md`)

- The mockup's placeholder pros/cons are single condensed lines; the real `SYSTEMS`
  data has 2–3 separate bullet strings per side. Kept as a tight `<ul>` list (one line
  each) rather than merged into a single run-on sentence, to avoid rewriting real
  content into invented prose.
- The mockup's right-hand consequence box only shows a short excerpt; the real
  "how it happens" / "the result" paragraphs are longer. Moved to a footnote row below
  the 3-column layout instead of shortened or dropped.
- Exact hex of the mockup's "danger" pill/border reads as a muted terracotta rather than
  the vivid `status-danger` red (`#ef4444`) — treated as the same token family already
  used by `dangerLevel` in this file rather than introducing a new shade.
- No literal ITM/WGS84 numeric axis ticks or per-pin coordinate readouts are added to
  `ImpactMap` — the mockup's specific numbers (e.g. "666250 / 178350") are illustrative
  placeholder content in the reference image, not present in the real component's data/
  state, and inventing them would violate "never invent Hebrew text/data not in the
  code." The existing two labels ("מטרה מבוקשת" / "מיקום פגיעה בפועל") are kept, just
  restyled as small chip captions.
