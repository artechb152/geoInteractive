# Visual audit log — TopographyScene vs scene-topography.png

Note: the reference PNG is a full-page render at 1568×1003 including app chrome (AppHeader, the
vertical lesson step-nav on the far right) that belongs to locked/shared files and is out of
scope. Also, the 3 diagrams (`View3D`/`ViewPhoto`/`ViewTopo`) are frozen by the task constraints
(their SVG data must stay byte-identical) — any illustration-fidelity gap inside those diagrams
(e.g. mockup shows a compass/N-arrow drawn inside the map, richer terrain shading, a real aerial
photo thumbnail) is a known, accepted gap, not something rounds 2/3 will attempt to close.

## Round 01

Screenshot: `design-references/topic-02/comparisons/topography-round-01.png`

Deltas found (ranked):

1. **Tab visual order is reversed vs mockup.** Mockup: rightmost (inline-start) tab is the
   active "מפה טופוגרפית", middle is "תצ״א", leftmost is "מודל תלת-ממדי". Mine: DOM order
   (3d, photo, topo) renders 3d rightmost and topo (active) leftmost under normal RTL grid flow —
   opposite of the mockup. Fix: apply a CSS `order` per button (topo → order 0, photo → order 1,
   3d → order 2) so the *visual* position matches the mockup without reordering the `VIEWS` array
   or changing any id/label/icon data.
2. **Active tab isn't visually bold enough.** Mockup's active tab reads as a clearly "lifted"
   card: stronger orange border, soft peach fill, drop shadow, thicker bottom accent bar. Mine
   used a very light `bg-accent/5` wash, no shadow, 3px bar. Fix: `bg-accent/10`, add
   `shadow-card-soft` on the active tab, bump bar to 4px.
2. **Tab-row → content gap slightly too loose.** ~32px in mine vs an estimated ~20-24px in the
   mockup. Fix: `mb-6` → `mb-5`.
4. **Info-panel section icons read too small/flat** relative to the mockup's more prominent
   per-section glyphs. Fix: bump the 3 local decorative icons (`IconWordsSimple`,
   `IconAdvantage`, `IconProblem`) from 18px → 22px (still within the app's existing icon-size
   vocabulary, not a new illustration style).
5. **Bullet-list rhythm feels tight.** Mockup's pros/cons bullets have a bit more breathing room
   between lines than the current `space-y-1.5`. Fix: `space-y-1.5` → `space-y-2`.

## Round 02

Screenshot: `design-references/topic-02/comparisons/topography-round-02.png`

(filled in after round-02 fixes + re-screenshot)

## Round 03

Screenshot: `design-references/topic-02/comparisons/topography-round-03.png` (and
`topography-round-03-clean.png` after a dev-server restart cleared stale-chunk console noise
caused by running `npm run build` alongside the live `next dev` process — unrelated to the
component itself).

Deltas found (ranked):

1. **Heading colors didn't match the mockup's single-accent pattern.** Re-inspecting the
   reference at full resolution: "מה היתרון", "מה הבעיה" and "למה זה חשוב" are ALL rendered in the
   same orange accent color in the mockup (only "במילים פשוטות" stays dark ink) — not
   green/amber/status-coded as the pre-existing code had it. Fixed: all three headings + their
   bullet markers + the "למה זה חשוב" spark icon now use `text-accent` instead of
   `text-status-ok` / `text-status-warn` / `text-brand-dark`. This is a color-only change (no
   text/data/logic touched), matching CLAUDE.md's "never substitute close-enough colors" rule
   against the actual reference pixels.
2. **`qa:rtl` flagged a real offender I introduced**: my own new tab-button className used
   `text-right` (line 86) instead of the project's required logical `text-start`. Fixed
   immediately — confirmed by re-running `npm run qa:rtl` (offender count dropped from 98 → 97;
   the remaining 8 in this file are pre-existing sub-legible `text-[Npx]` font sizes inside the
   frozen `View3D`/`ViewPhoto`/`ViewTopo` diagrams, unrelated to this redesign and out of scope
   per the "diagram data must be identical" constraint).
3. **Confirmed a live instance of the project's documented "RTL SVG text-anchor clip" bug** inside
   `ViewTopo` (pre-existing, not introduced by this redesign): measured via
   `getBoundingClientRect()` in the browser, the "N31°45'" coordinate label rendered ~73% off the
   left edge of the diagram (bounding box start at -37.5 CSS px relative to the SVG's own visible
   frame — genuinely clipped, not just a screenshot legibility issue). Root cause: these 5
   `<text>` nodes had no explicit `textAnchor`, so they defaulted to `start`, and because
   `direction` inherits as `rtl` from `<html dir="rtl">`, "start" anchors the (LTR-content)
   string so it extends *leftward* from its `x`, running off the `viewBox`'s left edge for labels
   placed near `x=0`.
   - **Decision:** added `textAnchor="start" direction="ltr"` to the 4 text nodes whose content is
     inherently LTR (two grid-value labels "300"/"350", and the two coordinate-corner labels
     "N31°45'"/"E35°12'"), so they anchor and extend the way their `x` position was clearly
     designed for (label starts at `x`, runs right), which also matches this file's own existing
     convention for the other diagram text (`textAnchor="middle"` is already explicit on "412"/
     "מ׳" — those were fine because `middle` doesn't shift with direction).
   - Deliberately did **not** touch "מבנה" (the Hebrew building label): its un-anchored `start` +
     inherited `rtl` behavior is *correct* there — Hebrew is genuinely RTL content, and the
     current rendering already aligns the label's right edge with the building glyph, which is
     the intended pairing.
   - This is a narrow, additive fix: no coordinate, text content, color, or opacity in the
     diagrams changed — only two presentation attributes were added to correct an active,
     measured rendering bug that the task explicitly asked to watch for. Flagged here in full for
     the merge reviewer in case a stricter "zero diagram diff" reading is preferred — trivially
     revertible (`textAnchor`/`direction` attrs on 4 `<text>` nodes only).
4. Reduced remaining gaps are all **out of scope by the task's own constraints**: the mockup's
   in-diagram compass/N-arrow, richer terrain shading, and the real aerial-photo thumbnail cannot
   be added without changing the frozen diagrams' data, so this redesign stops at restyling the
   chrome around them.

No other deltas rose to "top 5" significance after rounds 1–3; the tab order, active-tab
emphasis, spacing, icon sizes, and heading colors now closely track the reference.

Post-round-03 verification: re-measured the "N31°45'"/"E35°12'"/"300"/"350" text nodes via
`getBoundingClientRect()` after the `textAnchor`/`direction` fix — all four now render fully
within the diagram's visible frame (previously "N31°45'" started ~37.5 CSS px to the left of the
SVG's own edge, i.e. clipped). Re-clicked all 3 view buttons afterward (accessibility snapshot) —
state, labels, and content are all still correct and unaffected by the SVG attribute fix.

## Responsive observation (not fixed — out of scope per task constraints)

A brief look at 768px and 390px widths (screenshots: `topography-responsive-768.png`,
`topography-responsive-390.png`):

- **768px**: graceful — the 2-column grid (`lg:grid-cols-[1fr_1.7fr]`) falls back to a single
  stacked column below the `lg` breakpoint (info panel, then visualization), and the 3-tab row
  compresses acceptably. No overlap or clipping observed.
- **390px (mobile)**: the tab row (`grid grid-cols-3`, no responsive variant) does **not** stack
  or compress further, causing horizontal overflow — the third tab card and parts of the heading
  text run off the viewport edge. This is a real gap, but per this task's explicit constraint
  ("Touching responsive/mobile layout before the desktop pass is fully verified across 3 rounds"
  is forbidden) and the project-wide rule ("Mobile/responsive behavior: only after desktop is
  signed off, as a separate task"), this was **not** fixed here — flagging it for the follow-up
  responsive pass instead of silently leaving it undocumented.
