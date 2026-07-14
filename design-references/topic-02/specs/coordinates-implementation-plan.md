# Implementation plan — CoordinatesScene.tsx

Scope: `src/components/lessons/topic-02/CoordinatesScene.tsx` only. Nothing else is
touched. Preserved 1:1: `SYSTEMS` data content (all Hebrew strings, `example` values,
`pros`/`cons` arrays), the `shift` state + `setShift`, the `<input type="range">` and its
`onChange`, the `dangerLevel` calculation (`shift < 15 / < 40` thresholds), the
`consequenceText` tiers, and the `ImpactMap` component's `offsetX`/`offsetY` motion
logic and both its text labels.

## Step A — intro pair (concept vs. danger)

- Replace the two `surface-elevated p-6 sm:p-8 rounded-[4px]` boxed cards with a single
  flat `grid md:grid-cols-2 divide-x divide-border/60` strip, tighter vertical rhythm
  (`py-5`), no card background/border/shadow.
- Card 1 heading stays ink (`text-fg`); Card 2 heading (the דו"צ-risk one) gets an
  orange "attention" treatment: small inline `!` badge (span, rounded-full, ember bg/10,
  ember text — no new icon, mirrors the existing `'!'` glyph pattern already used for
  `dangerLevel === 'warn'` further down in this same file) + `text-accent` heading color.
- Body paragraphs unchanged text, restyled to `text-sm sm:text-base` to fit the flatter
  band.

## Step B — systems grid (ITM / WGS84)

- Container: `grid md:grid-cols-2 divide-x divide-border/60` (drop `gap-5`,
  `surface-elevated`, `border`, `rounded-[3px]`); add a centered decorative `spark`
  icon absolutely centered on the middle divider (small, `text-border-strong`, purely
  ornamental, `aria-hidden`).
- Drop `s.color` usage on the icon/short-name (both render in plain ink `text-fg`) —
  keeps the `color` field harmless/unused in the data array (not deleted, just no
  longer applied decoratively) so the data shape is untouched.
- Icon per system: keep `Icon name="crosshair"` for ITM; switch WGS84's icon to
  `Icon name="globe"` (already a valid `IconName`, no new icon/dependency) — matches
  the mockup's literal globe glyph for the "global/GPS" system.
- Reflow: short name + scope stacked (no separate boxed example row); thin
  `border-t border-border/60` before the format+example block; another thin rule before
  pros/cons.
- Pros/cons rows: replace the plain `Icon check` / `·` bullets with a small ring-circle
  wrapper (`inline-flex items-center justify-center size-4 rounded-full border` in the
  matching status color) so it reads as the mockup's badge-in-a-ring, list content
  (`s.pros.map` / `s.cons.map`) unchanged.

## Step C — datum-shift demo

- Outer wrapper: drop `surface-elevated ... border` box; use a plain `div` with
  `border-y border-border/60 py-8` (thin top/bottom rule only, no radius/shadow) so it
  reads flat like the rest, still visually separated from neighboring sections.
- Restructure inner grid from the current header-row + full-width-slider + 2-col grid
  into: `grid md:grid-cols-[1fr_1.7fr_0.85fr] divide-x divide-border/60 gap-0` with:
  - col 1: title + description + "גודל הסטייה המשוערת" label + `<input type=range>`
    (unchanged props/handler) + min/max end labels + big `{shift}` number (color now
    keyed off `dangerLevel` via the same 3-way className pattern already used for the
    status pill) + the status pill (kept, restyled as a solid-ish pill using the same
    `dangerLevel` conditional).
  - col 2: `<ImpactMap shift={shift} />` in a taller/wider frame.
  - col 3: the `dangerLevel`-colored bordered callout box, containing only the
    "השלכה מבצעית בשטח" heading + `consequenceText` (this is what visually matches the
    mockup's short orange box).
- Below the 3-col grid, full width: the existing "איך זה קורה בפועל?" / "התוצאה" prose
  block, unchanged text, `border-t border-border-subtle pt-4 text-xs text-fg-muted`
  (same classes as today, just relocated out of col 3 so nothing is cut).
- `ImpactMap` internals: recolor only —
  - background rect: `fill-bg` (cream) instead of `fill-bg-elevated` (white), so it
    reads as paper, not a card.
  - grid line opacity/stroke tweak to feel like the mockup's faint contour grid
    (`stroke-border/30`, thinner).
  - fix the two `radialGradient` `<stop>` elements: replace the non-resolving
    `stopColor="var(--accent-cool)"` with `className="text-accent-cool" stopColor="currentColor"`,
    matching the working `fill-accent-cool` pattern used elsewhere in the same file (a
    correctness fix uncovered while restyling, not a behavior change — the gradient was
    silently not rendering its intended color before).
  - target pin: `fill-accent-cool`/`stroke-accent-cool` (was already `accent-cool` in
    parts, make consistent); impact pin stays `fill-accent-hot`/`stroke-accent-hot`
    (unchanged, already correct).
  - both text labels get a small backing chip (`rect` with `fill-bg/90` behind the
    `<text>`) so they read as label pills like the mockup, `textAnchor="middle"` kept
    explicit on every `<text>` (already the case).

## Step D — CoordinateAnatomy strip

- Replace `surface-elevated p-8 ... flex-col md:flex-row items-center` (with big 48px
  icon) with a slim full-width band: `border-y border-border/60 py-5 px-4 text-center`,
  small `spark` icons (`size ~14`, `text-border-strong`) as bookends at each inline
  edge (`inline-flex items-center gap-3`, icons `aria-hidden`).
- All existing sentences/emphasis spans kept verbatim, just re-flowed into the
  single-band layout (no `text-3xl`/48px icon; run as `text-sm sm:text-base` prose).

## Step E — verification

1. `npm run dev -- -p 3105` (background), Playwright round 1 screenshot at 1568×1003 →
   compare against `scene-coordinates.png` → note deltas → fix top 5.
2. Round 2, round 3 — same loop.
3. Responsive spot-check (tablet/mobile) after desktop is solid.
4. `npx tsc --noEmit`, `npm run build`, `npm run qa:rtl`.
5. Manually exercise the slider in-browser: confirm number/status pill/consequence
   text/`ImpactMap` pin all update together via the unchanged `onChange`.
6. Commit.
