# Implementation Plan — TopographyScene restyle

Goal: restructure JSX/Tailwind classes only. No change to `View` type, `VIEWS` data (labels,
icons, whatItIs/pros/cons/whyItMatters copy), `useState<View>`, `meta` lookup, or any SVG diagram
(`View3D`, `ViewPhoto`, `ViewTopo`) data/paths/text content.

## Step A — Tab row (replaces accordion header)

- Keep `VIEWS.map` over the same 3 objects.
- Each item renders a `<button type="button" onClick={() => setView(v.id)} aria-pressed={isActive}>`
  inside a `.surface` container (was: accordion card). Row layout: `grid grid-cols-3 gap-3` (or
  `flex gap-3`) sitting above the 2-col grid.
- Button internals: icon (`<Icon name={v.icon} .../>`) + two-line label stack ("תצוגה 0N" small +
  `v.label` — reuses existing text, just smaller/inline instead of accordion-header-sized).
- Active state: `border-accent` (replacing `border-brand-dark`... check: current active accordion
  border was `border-brand-dark bg-brand/5`; mockup shows an ORANGE active border, so this is a
  genuine color correction, not an invention — `accent` is an existing token) + accent-colored
  label + a thin accent bar under the label (absolutely positioned span, `inset-inline-start-0
  bottom-0 h-[3px] w-full bg-accent rounded-full`).
- Remove the `AnimatePresence`/expanding panel that used to live inside each accordion item
  (`motion.div` with `height: 'auto'`) — its content moves to Step B. Keep the chevron-rotate
  motion.span removed too (no longer an expand/collapse affordance since it's a tab now); replace
  visually with the accent bottom bar as the "active" indicator, matching the mockup (no chevron
  on the tabs in the reference).

## Step B — Info panel (new, always-visible, replaces old per-item expanding content)

- New `.surface-elevated` panel as the grid's first child.
- Content: same 4 blocks currently inside the accordion's expanded panel, now reading from `meta`
  (the single currently-active view) instead of per-`v` in the `.map`:
  1. "במילים פשוטות" + custom mountain/contour icon + `meta.whatItIs`
  2. "מה היתרון" + custom ruler icon + `meta.pros.map(...)` (same bullet markup, `status-ok`)
  3. "מה הבעיה" + existing inline X-icon (kept, just resized) + `meta.cons.map(...)` (same bullet
     markup, `status-warn`)
  4. "למה זה חשוב" + `Icon name="spark"` (unchanged, already used) + `meta.whyItMatters`
- Wrap the whole 4-block stack in `<AnimatePresence mode="wait"><motion.div key={view} ...>` for a
  crossfade when `view` changes (same fade pattern already used for the visualization pane) so
  switching tabs doesn't feel abrupt now that there's no per-item expand animation.
- Sections separated with `divide-y divide-border/60`; each section `py-4` (`pt-0` on first,
  `pb-0` on last).

## Step C — Visualization panel (existing, restyle only)

- Keep exactly as-is: `.surface-elevated`, `AnimatePresence mode="wait"` over `View3D`/`ViewPhoto`/
  `ViewTopo`, bottom-start chip showing `meta.icon` + `meta.label`.
- Only adjust: grid column ratio (`lg:grid-cols-[1fr_1.7fr]` instead of `[1fr_1.4fr]`) so this
  panel reads visually larger, matching the mockup's ~63/37 split. Tune padding/min-height if the
  screenshot compare shows a gap.

## Step D — New local decorative icons

- 4 small inline SVG functions colocated in `TopographyScene.tsx` (not exported, not touching
  `Icon.tsx`): `IconWordsSimple` (mountain+contour), `IconAdvantage` (ruler), `IconProblem`
  (tangled/squiggly lines — can reuse the existing inline X-mark for cons, OR add a distinct
  squiggle; decide during build based on the mockup crop). All follow the `Icon.tsx` visual
  contract: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.5-2}`,
  `strokeLinecap/Linejoin="round"`, `aria-hidden`, no `<text>` nodes (so no RTL text-anchor risk).

## Step E — RTL check

- Grid child order unchanged (info panel first = inline-start/right, viz second =
  inline-end/left).
- Active-tab accent bar: `inset-inline-start-0`, never `left-0`.
- Chip position: already `bottom-3 start-3` (logical) — untouched, verified still correct.
- No diagram is mirrored; `View3D`/`ViewPhoto`/`ViewTopo` internals untouched.
- Re-verify every `<text>` in the 3 diagram functions keeps explicit `textAnchor` (already true
  today — must not regress if any wrapper styling change accidentally touches these — it won't,
  since Step C doesn't edit diagram internals).

## Step F — What must NOT change (explicit checklist before editing)

- [ ] `type View = '3d' | 'photo' | 'topo'` untouched.
- [ ] `VIEWS` array: same 3 ids, same `label`, `icon`, `pros`, `cons`, `whatItIs`, `whyItMatters`
      strings, verbatim.
- [ ] `useState<View>('topo')` untouched.
- [ ] `meta = VIEWS.find((v) => v.id === view)!` untouched.
- [ ] `id="scene-topography"` untouched.
- [ ] `View3D`, `ViewPhoto`, `ViewTopo` function bodies byte-identical (only touch the wrapping
      container's classes, never their SVG markup).
- [ ] `SceneHeader` usage/props untouched.
- [ ] No new npm dependency; only `framer-motion`, `Icon`, `cn` (all already imported).
