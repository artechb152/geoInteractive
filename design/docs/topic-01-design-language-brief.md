# Topic-01 Design-Language Brief — the single rule set every agent works from

Repo: `C:\Users\user\Desktop\Programming\עבודה מהבית\GeoInteractiveVer2` (branch `design/topic-01-unify`).
Scope: lesson 1 = `/lessons/topic-01` (6 scenes: hook, onboarding, levels, mdo, asymmetric, recap) + `/lessons/topic-01/overview` + the shared lesson shell those pages render through.
Goal: every page of lesson 1 speaks ONE design language (hierarchy, font, sizes, heading tiers, spacing, equal gaps, buttons, hover states, colors, radii, shadows, icons), per the project's documented rules. Each interaction stays unique thanks to the user's own PNG assets — the *chrome around* interactions/images (text, SVGs, components) must be uniform.

## 0. IRON RULES (never break — any violation is a Critical finding)

1. **Zero text changes.** No Hebrew/English string may be reworded, deleted, added, re-punctuated, or moved to a different sentence. This includes micro-copy, button labels, hints, captions, aria-labels, alt text. If a string looks redundant, REPORT it — do not touch it. (Wrapping a string in a different element with different classes is fine; changing characters is not.)
2. **Zero interaction changes.** Same state, handlers, click/drag/keyboard flows, same DOM order (RTL layout depends on it), same framer-motion semantics. Restyling is class/markup-only.
3. **Zero image changes.** No PNG replaced, removed, re-cropped, re-fitted. `IsometricAsset` props `src`/`assetId`/`fit`/`aspect`/`position`/`prompt` unchanged; `<img src>` unchanged. Only the *frame* around an image (radius, border, padding) may change to match the language. Never mirror illustrations/maps for RTL.
4. **No new hex values, no new color tokens.** Only classes that exist in `tailwind.config.ts` / `src/app/globals.css`.
5. **RTL logical properties only** for new/changed layout classes (`ms-/me-/ps-/pe-/start-/end-`). Physical `left/top` is allowed ONLY for coordinates pinned to an illustration/photo (existing pattern in MDOFieldDiagram, CornerMark, LevelZone offsets).
6. **Do not touch import lines in a file you share with other agents** (see §9 ownership). Leave a now-unused import in place; the controller cleans imports after merge.

## 1. Sources of truth (precedence, highest first)

1. **Approved reference files** (user: "hook and onboarding look good"): `src/components/lessons/topic-01/HookScene.tsx` + `src/components/lesson/HookSceneLayout.tsx`; `src/components/lessons/topic-01/OnboardingScene.tsx`; `src/components/lessons/topic-01/HistoricalCasesPanel.tsx`; `src/components/lesson/ReadyCallout.tsx`; `src/components/lesson/SceneHeader.tsx`. Copy their classes verbatim.
2. `.claude/skills/checking-design-fidelity/SKILL.md` Tables 2 & 3 — NOTE Table 2 is slightly stale vs the reference file: the reference now uses badge `size-11`, number `text-base`, check icon `18`, row title `text-lg md:text-xl`, chevron `22`. **The reference file wins.**
3. `project-knowledge/lesson-shell-design-system.md` §4 (palette rules), §5 (typography), §16 (buttons), §25 (motion).
4. `tailwind.config.ts`, `src/app/globals.css` (`.surface`, `.surface-elevated`, `.chip`, `.btn-*`, `.section-eyebrow`, `.gradient-text` = `text-accent`).
5. `design/docs/assumptions.md` + `docs/UI-CONSISTENCY-RECOMMENDATIONS.md` — **user-approved exceptions** (§8 below). Honor them; do not "fix" them.

## 2. Color roles (semantic tokens for lesson content)

| Role | Class | Notes |
|---|---|---|
| Primary text (headings, body) | `text-black` | reference accordion/ReadyCallout/SceneHeader. `text-fg` (olive ink #38432E) is an accepted near-equivalent already present in approved files — do NOT churn existing `text-fg` → `text-black` just for its own sake; use `text-black` for anything you restyle. |
| Secondary / meta text | `text-fg-muted` | intros under section titles, captions, places/years, counts, hints |
| Tertiary / disabled / placeholder | `text-fg-dim` | closed chevrons, disabled labels |
| Single focal emphasis / active / action | `text-accent` `bg-accent` `border-accent` (== `ember`, same hex) | CTA, selected item, ONE key-fact label per card, active tab. Never decorative, never long text. |
| Inline technical-term highlight, "open" state | `text-brand-dark` / `border-brand/45` | e.g. "Multi-Domain Operations", open accordion border, open chevron |
| Hover tint on light surfaces | `hover:border-brand/30 hover:bg-brand/[0.03]` | reference accordion idle hover |
| Surfaces | `bg-bg-elevated` (white), `bg-bg-card` (white), `bg-bg-accent` (warm cream tint for inner boxes/idle badges), `bg-bg` (page cream) | |
| Hairlines | `border-border` (tan), `border-border/60` (surface), `border-border-subtle`, `border-border-strong` (only for drag targets / strong dividers) | |
| Dark band panel | `bg-pine-grad shadow-pine-card rounded-[28px]` + `text-paper-bright` (/70 /90) + `text-ember` / `text-ember-soft` / `border-ember bg-ember/20` for active | the approved HistoricalCasesPanel + ChokepointBand language |
| Correct / wrong feedback ONLY | `text-status-ok bg-status-ok/10 border-status-ok/50` / `text-status-danger bg-status-danger/10 border-status-danger/50` | exercises after "check answers"; also the approved solid radio circles in PillarDecisionCard |

**Forbidden in lesson content (off-palette / "AI slop" colors):** `accent-cool` (blue), `accent-hot` (red), `accent-intel` (purple), `terrain-sand/sky/steel/ridge/olive`, `status-warn` (yellow), `status-info`, raw hex in className/style (except inside an SVG diagram that draws a map/route — leave those), `shadow-glow*`, `gradient-to-*` decorative washes, `blur-2xl/3xl` decorative blobs, `bg-topo-fade`.

## 3. Typography tiers (lesson-scene content) — exact classes

Global: every `<h1-6>` gets `font-display tracking-tight` automatically (globals.css). Hebrew body font = Heebo (`font-sans`, default); display = Rubik (`font-display`).

| Tier | Element | Exact classes | Where it comes from |
|---|---|---|---|
| **T0 Scene title** | `<SceneHeader title intro underline?>` | component only — never hand-roll an h2 scene title | lesson/SceneHeader.tsx |
| **T0-intro** | SceneHeader `intro` | component (`text-lg sm:text-xl text-black`, centered) | same |
| **T1 Section title** (h3 inside a scene: a sub-block like "מה זה MDO?", "איך זה נראה בעולם האמיתי", "תרגול גרירה") | `font-display text-2xl font-bold leading-tight text-black sm:text-3xl` + optional accent bar directly under it: `<span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />` | majority pattern in topic-01 + UI-CONSISTENCY "heading + short accent underline bar" adopted pattern |
| **T1-intro** (one-line explainer under a section title) | `mt-2 text-base leading-relaxed text-fg-muted` | design-system §5 "fg-muted for secondary text"; never `text-sm` |
| **T2 Card heading** (row title / card title / h4 inside a card) | `font-display font-bold leading-tight text-black text-lg md:text-xl` | reference accordion row title |
| **T3 Sub-heading** (label inside a card body: "מה קורה בשלב הזה?", field names) | `text-base font-display font-bold text-black mb-1.5 tracking-wider` | reference accordion body label |
| **T4 Body** | `text-base leading-relaxed text-black` | reference accordion body. Never `text-sm` for readable paragraphs. |
| **T5 Meta / label** (dates, places, counts, hints, divider labels, small kickers) | `text-sm font-display font-semibold tracking-wider text-fg-muted` | SoftDivider label / HistoricalCasesPanel place line. Accent variant `text-accent` allowed for ONE key-emphasis label per card (e.g. "עובדה מרכזית"). |
| **T6 Caption / footnote** (tiny helper under an element) | `text-sm text-fg-muted leading-snug` (`text-xs` only inside pills/chips) | |
| **Dark-band variants** | title `font-display text-3xl font-extrabold leading-tight text-paper-bright md:text-4xl`; sub `text-base text-paper-bright/70 md:text-lg`; body `text-base leading-relaxed text-paper-bright/90`; label `text-sm font-display font-bold tracking-wide text-ember` | HistoricalCasesPanel / ChokepointBand |
| **Numerals** | decorative big number: `font-display font-extrabold`; data numbers (counts, coordinates): `font-display font-bold tabular-nums` or `font-mono` (design-system §5) — keep whichever the block already uses, don't churn | |
| **Button label** | via Button component / `.btn-*` (`font-display font-bold`, primary `text-white`) | |

There are exactly these tiers. Never add a 4th micro-label tier under a sub-heading. **If you cannot decide which tier a text belongs to, DO NOT restyle it — report it as `uncertain` with its first 3 words** (the controller collects these into a review file for the user).

## 4. Buttons & interactive states

| Kind | Use | Never |
|---|---|---|
| Primary action (check answers, continue, start, submit) | `<Button>` (`@/components/ui/Button`, variant `primary`, size `sm`/`md`) or `.btn-primary` | ad-hoc `bg-accent rounded-[3px]/rounded-md font-medium`, `hover:scale-105`, `active:scale-95` |
| Secondary action (reset, back, alternative) | `<Button variant="secondary">` / `.btn-secondary` | `border border-border hover:border-border-strong` hand-rolled |
| Ghost / inline text action (small toggles like pause/enable-all) | `<Button variant="ghost" size="sm">` or, for tiny inline controls, `text-sm font-display font-semibold text-fg-muted hover:text-brand-dark transition-colors` | `text-xs font-mono hover:text-accent` |
| Disabled | `opacity-45 cursor-not-allowed` (Button does this) | custom grey fills |
| Selectable option card / choice (quiz-like choices, tabs, chips) idle | `border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03] transition-all duration-300 ease-snap` (light) · `border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]` (on dark) | `hover:border-fg-muted`, `hover:bg-bg-accent` on cards |
| Selected / active choice | `border-accent bg-accent/10` (light) · `border-ember bg-ember/20` (dark); text stays black/bright; **exactly one accent cue per control group** | tri-color per item |
| Open / expanded (accordion) | `border-brand/45 bg-bg-elevated`; chevron `text-brand-dark` open / `text-fg-dim` closed | |
| Drag / drop target idle → over | dashed `border-2 border-dashed border-accent/60 bg-paper-card/90` → `border-accent bg-accent/20` | `border-border-strong` dashed |
| Focus | inherit global `focus-visible` ring (globals.css) — do not add custom rings except the existing `ring-accent/40` selection pattern | |
| Transitions | `transition-all duration-200/300 ease-snap`; framer ease `[0.22, 1, 0.36, 1]` | bounce, scale pops |

## 5. Cards, surfaces, radii, shadows

| Element | Classes |
|---|---|
| Inner content card (in a grid/list) | `.surface` (= `bg-bg-card border border-border/60 rounded-2xl`) + `p-4`/`p-5` |
| Panel / elevated block | `.surface-elevated` (+ `shadow-elevated`) + `p-5 sm:p-6` or `p-6 md:p-8` for detail panels |
| Small nested box (highlight, image frame, stat box) | `rounded-xl` (+ `bg-bg-accent` for a tinted box, or `border border-border` for an image frame) |
| Thumbnail inside a card | `rounded-lg overflow-hidden` |
| Dark band | `relative isolate overflow-hidden rounded-[28px] bg-pine-grad p-5 shadow-pine-card sm:p-7 md:p-8` |
| Icon / number badge | `size-11 rounded-xl flex items-center justify-center shrink-0 border` — active `bg-brand-dark text-bg-elevated border-brand-dark`, idle `bg-bg-accent text-fg-muted border-border` |
| Pill / chip | `.chip` (rounded-full, text-xs semibold) or `<StatusChip>` — never hand-build a pill |
| Accent bar under a title | `h-1 w-10 rounded-full bg-accent` (start-aligned) / `h-1 w-14` centered (SceneHeader) / `h-[3px] w-7 bg-accent-hover` (ReadyCallout, approved) |

**Forbidden (V2 leftovers / slop):** `rounded-[3px]`, `rounded-[4px]`, `rounded-md` on cards/buttons/images, `.oct`, `FrameCorners`, `.outline-numeral`, `.dotted-leader`, decorative `TopoField` backdrops inside a scene block, decorative blur circles, `bg-gradient-to-*` washes (except the approved RecapBanner), `shadow-glow*`.

## 6. Spacing & width rhythm

- **Scene root width — must be identical on every page:** `<section id="scene-…" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">` (`max-w-lesson` = 72rem, defined in tailwind.config). Hook is intentionally full-bleed (approved cover). No per-scene negative-margin breakouts (`-mx-4 sm:-mx-6 lg:-mx-8`) and no blocks that escape the root width — a block that renders wider than its sibling blocks is a finding.
- SceneHeader → first block: `mb-8` (component).
- Gap between major blocks inside a scene: **`mt-12`** (48px). Before/after a dark band or the closing callout: `mt-12` as well (the approved onboarding uses `mt-20 mb-12` around its band — report if you think it should move to `mt-12`, do not change the approved file's spacing yourself).
- Two-column layouts: `gap-6`; card grids: `gap-4` (or `gap-3` for dense grids); stacked accordion items: `space-y-1` (reference) — keep each block's *internal* rhythm consistent with the reference block of the same kind.
- Card padding: see §5. Text stacks inside a card: title → `mb-1.5` → sub-heading/meta → `mt-2/3` → body.

## 7. Icons & decorative elements ("AI slop" policy)

The user's own PNG assets (all `IsometricAsset`/`<img>` files under `public/assets/lessons/topic01/**` and `public/reference-assets/**`) are approved and must stay. Code-drawn icons (the `Icon` component in `src/components/Icon.tsx`, lucide icons) were NOT made by the user.

- **Keep (functional glyphs):** `check` (completed / correct), chevron (expand/collapse), `ArrowLeft/ArrowRight` (navigation), `grip` (drag handle, approved), `plus` (drop-zone, approved), `Crosshair` divider in the hook (approved), `chevrons-down` inside drop boxes only if it conveys "drop here" — otherwise remove.
- **Remove (decorative code-drawn):** `spark`, `shield`, `globe/layers/crosshair` used as decoration, domain glyphs (`mountain/plane/ship/satellite/bolt`) used as label ornaments, `people/clock/target` field ornaments, any lucide icon used purely as decoration, emoji glyphs in UI chrome, decorative blur blobs, `TopoField` inside scene blocks, `gradient-to-*` washes. Replace with nothing (label-only) — never with a new image. When an icon sits inside a status chip (e.g. "3/6 נכון"), drop the icon and keep the text.
- Text glyphs that are part of a string (e.g. "✓ כל המשפטים סווגו") are TEXT — iron rule 1, leave them.
- `gradient-text` spans inside SceneHeader titles = `text-accent` phrase emphasis (same idea as the approved hook title's `text-ember` phrase) — allowed, keep.

## 8. User-approved exceptions (honor, do not "fix")

- Levels drag zones: uniform ink label with paper halo + accent dashed drop boxes (`ZONE_*` constants); zone PNG badges; scenario chips with PNG event icons. (assumptions 2026-09-14)
- Levels table: static shared-border table, 3:1 banner photos, taglines. (2026-09-15)
- Asymmetric actor selector: accent-only active tab (underline bar + `text-accent` label), no caption underline, detail panel 2×2 field grid with the user's PNG field icons; portrait column. (2026-09-06)
- Typology table: rows answerable in any order, green/red per-cell tint after reveal, no ✓/✗ badge, no shortDesc caption. (2026-09-07)
- Tactic match: click-only flow, no progress dots, no added heading, 5 PNG photo cards. (2026-09-07)
- Pillar decision cards: PNG banner per card, solid-fill radio circles (`bg-status-danger text-white` / `bg-status-ok text-white`), `min-h-[30rem]` fixed card height, no footer band. (2026-09-07)
- Org drag exercise: `rounded-full` pill chips with `grip` icon in pool state, `rounded-2xl` photo bins with gradient scrim title. (2026-09-07)
- MDO explainer card: two-panel `surface-elevated`, image `max-w-[150px] sm:max-w-[180px]` with `bg-bg-accent`, English term `font-mono text-brand-dark`, no spark icon. (2026-09-15)
- MDO field diagram: physical `left/top` coordinates on the photo, orange (#D97E2B) SVG connection lines and rings = accent hex, decorative SVG layer `aria-hidden`. (keep as is)
- HistoricalCasesPanel & HookSceneLayout use landing-namespace tokens (`ember`, `pine`, `paper-*`, `olive-*`, `tanline`) — hex-identical to the semantic tokens; approved; do not churn.
- RecapBanner (shared): gradient wash + pulse — shared component, approved language for the "well done" banner.

## 9. Shared-file ownership for parallel agents

Multiple agents edit the same big files concurrently in separate git worktrees; hunks are merged by the controller. Each agent owns ONLY the functions/line ranges named in its task. Never edit outside your range, never touch import lines (rule 0.6), never reformat unrelated code, never run a formatter on the whole file.

## 10. Verification an implementer must do

1. `npx tsc --noEmit` from the repo root of your worktree (symlink `node_modules` first if missing: `cmd //c mklink /J node_modules "C:\Users\user\Desktop\Programming\עבודה מהבית\GeoInteractiveVer2\node_modules"`).
2. Diff your final classes against the exact rows above (copy, don't paraphrase).
3. Re-read the strings in your diff: byte-identical to before (rule 0.1).
4. Commit on your worktree branch with message `style(topic-01/<scene>): <what>`.
