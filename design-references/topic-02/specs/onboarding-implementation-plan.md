# OnboardingScene (topic-02) — Implementation Plan

## Locked boundary (exact line reference, original file)

- `LAYERS` array (lines 20–61) — untouched.
- `FACTS` array (lines 63–92) — NOT locked (unrelated to the diagram island), but its Hebrew content is
  the real source-of-truth content and stays untouched; only its container/grid may change.
- `OnboardingScene()` state: `step`, `expanded`, `enabled`, `clickLayer` (lines 96–109) — untouched.
- The `LAYERS.map(...)` accordion list JSX (lines 126–219, i.e. everything inside
  `<div className="space-y-3">...</div>`) — untouched, including every className inside it.
- `LayeredMap`, `Layer`, `Toggle` function components (lines 250–360) — untouched, including the wrapper
  chip (`"הדלק שכבות מימין כדי לבנות את המפה"`) and the "מפה ריקה" empty state.

## What actually changes

1. **Add an eyebrow line above `SceneHeader`.** New small block using the existing global
   `.section-eyebrow` utility class, centered, containing the exact same string already passed as the
   (currently unrendered) `eyebrow` prop: `לפני שמתחילים`. Purely additive JSX in `OnboardingScene`'s own
   return — does not touch `SceneHeader.tsx`.
2. **Widen the grid gap** on the `grid md:grid-cols-[2fr_3fr]` wrapper: `gap-6` → `gap-8 md:gap-10`.
   Column proportions (`2fr_3fr`) stay — they already reproduce the mockup's list/map ratio once RTL
   column order is accounted for.
3. **Restyle the map's wrapper `<div>`** (the one directly around `<LayeredMap enabled={enabled} />`,
   currently `"surface-elevated bg-bg relative overflow-hidden min-h-[280px]"`): drop the card look, bump
   min-height. New classes: `"bg-transparent relative overflow-hidden rounded-2xl min-h-[360px] md:min-h-[420px]"`.
   Nothing inside `<LayeredMap>` itself changes — same props, same component.
4. **Leave the list wrapper `<div className="space-y-3">` structurally alone** (spacing already fine,
   nothing to gain by changing it since item-level styling inside is locked).
5. **Restyle `SoftDivider`** (own helper in this file, fully editable): bump label typography
   (`text-sm font-display font-semibold` → `text-lg sm:text-xl font-display font-bold text-fg`), bump
   outer margin (`my-12` → `my-10 md:my-14`).
6. **Restyle the FACTS grid**: wrap `FACTS.map(...)` in a subtle panel
   (`rounded-2xl bg-bg-accent/60 p-4 md:p-6`), change grid from `grid sm:grid-cols-2 gap-4` to
   `grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x lg:divide-border`, and give each
   `IntelCard` a small `lg:px-4` wrapper div for spacing once dividers are added (`IntelCard` itself is
   untouched, just its immediate wrapper).
7. No changes to `ReadyCallout` usage (already matches mockup's closing line acceptably; it's a locked
   component anyway).

## Explicit non-goals for this pass

- Not attempting to reshape the locked accordion list to look like the mockup's numbered/connected-line
  list — flagged as a permanent, expected visual gap (see integration request doc).
- Not attempting to turn the flat schematic `LayeredMap` SVG into an isometric diorama — flagged likewise.
- Not touching mobile/responsive breakpoints below `md` in this pass (desktop-first per project rule);
  the `sm:`/`lg:` classes added above are pre-existing responsive conventions already used elsewhere in
  this same file, not a new mobile pass.

## Visual audit log (rounds 1–3, desktop 1568×1003)

**Round 1** (`comparisons/onboarding-round-01.png`) — deltas found:
1. H1 rendered entirely in orange (`gradient-text` wrapped the whole sentence) vs. mockup where only
   the word "פאזל" is orange and the rest is dark ink → fixed (span narrowed to just that word).
2. Map sat in a boxed white `surface-elevated` card vs. mockup's open/borderless diorama → fixed
   (dropped to transparent wrapper, bumped min-height).
3. List/map gap felt tight vs. mockup's more generous breathing room → fixed (`gap-6` → `gap-8 md:gap-10`).
4. FACTS were a 2×2 grid of separate white cards vs. mockup's single continuous 4-up band with hairline
   dividers → fixed (4-col grid + `divide-x` + subtle panel background).
5. Locked-island deltas that cannot be fixed from this worktree (schematic 2-D map vs. isometric diorama;
   boxed accordion list vs. mockup's minimal numbered/connected-line list) — logged in the integration
   request doc, not attempted.

**Round 2** (`comparisons/onboarding-round-02-top.png` / `-bottom.png`) — re-checked after round-1 fixes:
- H1 hierarchy now matches (dark ink sentence, orange "פאזל"). Confirmed good.
- FACTS band reads correctly as one row of 4 with dividers; panel tint is subtle and doesn't fight the
  cream canvas. Confirmed good.
- Remaining delta: mockup shows a small decorative line+diamond rule directly under the "לפני שמתחילים"
  eyebrow, before the H1 — missing in the render → fixed in round 3 (added as new, purely decorative
  markup local to `OnboardingScene.tsx`, existing `border`/`border-strong` tokens only, zero new colors).
- Also exercised the real interaction here: clicked layer 5, confirmed all 5 accordion states
  (checkmarks on 1–4, layer 5 expanded) and the `LayeredMap` SVG updated to show all 5 layers
  (terrain, road line, building dots, dashed border + label, friendly/threat markers) — unchanged
  behavior, confirmed working (`comparisons/onboarding-interaction-step5.png`).

**Round 3** (`comparisons/onboarding-round-03.png` / `-bottom.png`) — after adding the eyebrow divider:
- Divider renders correctly, centered, matches the mockup's treatment reasonably well.
- Note: the first two round-3 screenshot attempts came back as a broken/unstyled page (giant unstyled
  compass icon, CSS 404s in console). Root cause: an `npm run build` was run concurrently with the
  running `npm run dev` process in this same worktree, and both write to `.next/`, corrupting the dev
  server's build output. Fixed by killing the dev server, deleting `.next/`, and restarting `next dev`
  cleanly — not a regression from the component change itself (confirmed by re-diffing: no source edits
  between the broken and fixed screenshots, only the dev-server restart).
- No further deltas found that are both (a) real and (b) inside this worktree's editable scope. Remaining
  gaps are all inside the locked island or locked shared components — see
  `onboarding-integration-request.md`.

## Verification plan

1. `npm run dev -- -p 3102`, navigate to `http://localhost:3102/lessons/topic-02/#scene-onboarding`.
2. Resize to 1568×1003, screenshot → `design-references/topic-02/comparisons/onboarding-round-01.png`.
3. Compare against `scene-onboarding.png` for the content region only (ignore header/sidebar chrome not
   owned by this component).
4. Iterate 3 rounds fixing the top 5 deltas each round.
5. Exercise the real interaction: click layers 1→5, confirm expand/collapse and map layer toggling still
   work exactly as before (unchanged code path).
