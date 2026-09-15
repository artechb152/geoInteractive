# Plan: topic-01 `#scene-asymmetric` — 3-actor cards → banner-tab selector

`/reference-to-ui-exact` against `lesson1part5image1.png` (`design/reference/lesson-01/`). Continues the same
established convention as `docs/superpowers/plans/2026-09-03-topic01-levels-scene-redesign.md`
(see `design/docs/assumptions.md`'s "Topic-01 levels scene" section for the precedent this plan
follows). Branch: work directly on `main` — this repo's established practice for this exact
class of task (every prior `/reference-to-ui-exact` pass landed as direct commits on `main`;
the one prior plan that named a feature branch turned out to be an ancestor of `main` by the
time work continued, i.e. no long-lived branch is actually in use for this workflow).

## Global Constraints

- Do not modify ANY Hebrew copy/string literal in `AsymmetricScene.tsx`. Every visible string
  in the new markup must come, unchanged, from the existing `ACTORS_LIST` / `ACTOR_FIELD_ROWS`
  data structures already in the file. If a diff shows a changed character inside a string
  literal that isn't whitespace/formatting-only, that's a bug.
- Touch ONLY the "3-actor typology cards" block inside
  `src/components/lessons/topic-01/AsymmetricScene.tsx` — currently the comment header
  `/* 3-actor typology cards — neutral, label-only. ... */` through the end of the
  `<div className="grid md:hidden ...">` mobile fallback block that immediately precedes
  `<TypologyTable />` (roughly lines 355–418 as of this plan's writing; find the exact range
  by grepping for that comment and for `<TypologyTable />`). Do not touch `SceneHeader`, the
  hero `IsometricAsset`, or any of `TypologyTable`, `PillarSimulator`, `TimeAsymmetry`,
  `TacticMatchExercise`, `DragExercise`, or the closing "המסקנה" block. Do not touch any other
  file except to add the new/already-present asset files to the commit and to append to
  `design/docs/assumptions.md` / `docs/UI-CONSISTENCY-RECOMMENDATIONS.md` per the Verification
  section below.
- Color/token rule: this file already uses the project's non-landing token namespace
  (`bg`/`fg`/`border`/`accent`/`status`, plus utility classes `surface-elevated`, `bg-warm`,
  `font-display`) throughout — reuse ONLY tokens already used in this file. Do NOT introduce
  the `paper`/`olive`/`ember`/`pine`/`tanline` namespace (`HistoricalCasesPanel.tsx`'s /
  `OnboardingScene.tsx`'s landing-redesign palette — a different visual system for a different
  part of the app) and do not add any new hex value. `tailwind.config.ts` documents `accent`
  (orange, `#D97E2B`) as "action/focus ONLY" for this namespace — use it for the one active/
  selected state in this component, exactly like the precedent in `design/docs/assumptions.md`'s
  "Topic-01 levels scene" entry (single accent-colored active state, neutral dark/muted for
  the other two) — even though the reference screenshot happens to render its own active-tab
  indicator in an olive-green tone; normalizing to this app's `accent` token for "currently
  selected" is the established, already-approved decision for this exact situation, not a new
  judgment call to relitigate.
- No mirrored images. No `left-`/`right-` literal Tailwind classes or `text-align: left/right`
  anywhere in the new markup — logical properties only (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`),
  per this project's `CLAUDE.md`.
- Assets already exist on disk — do not regenerate, rename, or move them. Load every one of
  them through `IsometricAsset` (`src/components/assets/IsometricAsset.tsx`, this project's
  standard image wrapper — never a raw `<img>`), exactly as every other asset in this file
  already does, `prompt` prop included (write a reasonable description of the already-existing
  photo/icon; it's only ever shown as a placeholder caption before the asset resolves, which it
  already has, but every other call site in this file supplies one, so match that convention):
  - Banners (~3:1 wide crop, actual pixel dimensions may not match exactly — measure the real
    file): `/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-ACTOR-REGULAR-BANNER.png`,
    `...-GUERRILLA-BANNER.png`, `...-TERROR-BANNER.png`.
  - Detail-panel photos (portrait crop): `/assets/lessons/topic01/scene-asymmetric/TOPIC01-ASYM-ACTOR-REGULAR.png`,
    `...-GUERRILLA.png`, `...-TERROR.png`.
  - Field icons: `/assets/lessons/topic01/scene-asymmetric/icons/TOPIC01-ASYM-ICON-IDENTITY.png`,
    `...-GOALS.png`, `...-TARGETS.png`, `...-STRUCTURE.png`.
  - `IsometricAsset`'s `aspect` prop only accepts `'16/9' | '21/9' | '1/1' | '4/3'`. If a real
    asset's own aspect ratio doesn't cleanly match one of those (the wide banners almost
    certainly won't — they look close to 3:1), use the same technique already established in
    `design/docs/assumptions.md`'s "Diorama aspect" entry: a wrapper with a custom
    `style={{ aspectRatio: '<measured w> / <measured h>' }}` and `IsometricAsset`
    `className="... [aspect-ratio:auto]"` so the real image renders uncropped instead of being
    squeezed into the nearest fixed preset.
- Dev server is already running at `http://localhost:3000` — do not start a second one; if
  that port is unexpectedly unavailable, report it rather than guessing.
- Run `npx tsc --noEmit` before reporting done — a type error here is a real regression.

## Task 1 — Replace the 3 static actor cards with a banner-tab selector + single detail panel

### Where this fits

`src/components/lessons/topic-01/AsymmetricScene.tsx` renders the `#scene-asymmetric` lesson
scene. Right after the hero illustration, it currently renders the 3 entries of `ACTORS_LIST`
(`regular` / `guerrilla` / `terror`, each a `label`, `shortDesc`, `oneLiner`, and 4 more fields
via `ACTOR_FIELD_ROWS` — `identity`/`goals`/`targets`/`structure`) as 3 static side-by-side
cards (desktop: CSS subgrid so rows align across cards; mobile: a simpler stacked fallback),
showing all three actors' full data simultaneously. Below that, unchanged and out of scope,
sit `TypologyTable`, `PillarSimulator`, `TimeAsymmetry`, `TacticMatchExercise`, `DragExercise`,
and a closing conclusion block.

This task replaces that "all 3 at once" block with an interactive selector matching
`lesson1part5image1.png`: 3 clickable banner-tabs up top (one per actor, using the pre-made
`*-BANNER.png` images), and a single detail panel below showing only the currently-active
actor's data. Read the full current file before starting — everything needed (`ACTORS_LIST`,
`ActorMeta`, `ACTOR_FIELD_ROWS`, `IsometricAsset`, `cn`, `motion`/`AnimatePresence` already
imported) already exists there; reuse it, don't recreate it.

For a working precedent of the exact "click a button, an active-item detail panel crossfades
in" interaction pattern (state, `AnimatePresence mode="wait"`, RTL DOM-order convention), read
`src/components/lessons/topic-01/HistoricalCasesPanel.tsx` in this same directory for
structure/technique only — its own colors are the landing-redesign palette (out of bounds
here, see Global Constraints); copy the *pattern*, not the classes.

**The reference image includes page-shell chrome that is NOT part of this component and must
NOT be built here** — this was confirmed with the user as chrome the mockup screenshot happened
to include by mistake, not part of this scene's brief: a top page header (small "לומדים
ומבחינים" eyebrow + a left-side "הכרת המציאות" caption block), a bottom primary CTA pill button
("לתרגול ההשוואה"), and a bottom breadcrumb/progress-dots row with a footer caption ("ידע •
חשיבה • אחריות"). `AsymmetricScene` already has its own `SceneHeader` above this block
(untouched) and its own next sections immediately below (`TypologyTable`, unchanged) — do not
add any of that reference chrome.

Also do NOT add the reference's lightbulb "tip" callout box under the icon grid (its Hebrew
copy — "שימו לב לקשר בין המדינה, המטרות והמבנה." — has no backing field anywhere in `ActorMeta`
/ `ACTORS_LIST`, and this task's binding constraint is zero new/invented Hebrew copy). Leave it
out; this is a confirmed, intentional omission, not an oversight to flag as a concern.

### Requirements (binding)

1. **Scope:** replace the `hidden md:grid md:grid-cols-3 ...` block and the
   `grid md:hidden ...` mobile-fallback block (both currently mapping over `ACTORS_LIST`) with
   one new component — e.g. a local function `ActorTypologySelector()` declared in this file
   alongside `TypologyTable`/`PillarSimulator` (same file-organization convention: a named
   function reading the module-level `ACTORS_LIST`/`ACTOR_FIELD_ROWS` constants directly, no
   props needed) — and render it in `AsymmetricScene()` where the two old blocks were.
2. **State:** `useState` for the active actor id, defaulting to `ACTORS_LIST[0].id`
   (`'regular'`) — matches the reference's default-selected "צבא סדיר" tab.
3. **Banner-tab row — 3 buttons, one per `ACTORS_LIST` entry, in array order** (`regular`,
   `guerrilla`, `terror` — first array item lands at the visual right in this RTL page, matching
   the reference's rightmost-active "צבא סדיר" banner; do not reorder the array or force a
   different visual order). Each banner:
   - Is a `<button>` that sets that actor active on click; `type="button"`, `role="tab"`,
     `aria-selected={isActive}`, part of a `role="tablist"` wrapper; the detail panel below gets
     `role="tabpanel"` + `aria-labelledby` wired to the active tab's id (or an equivalent
     accessible pattern — use judgment, this isn't pixel-specified by the reference).
   - Shows the actor's pre-made `*-BANNER.png` as a cover-fit background image via
     `IsometricAsset`, with the actor's exact existing `label` text overlaid, legible against
     the photo (e.g. a gradient scrim so the image stays visible toward one side and the label
     sits on a near-solid ground on the other — match the reference's composition: photo
     visible toward the visual left of each banner, label legible toward the visual right,
     i.e. the label sits at inline-start).
   - Active banner gets the one `accent`-colored treatment in this component (e.g. a solid
     bottom bar/underline in `accent` under the active banner only, and/or `text-accent` on its
     label) — see the Global Constraints color rule. Inactive banners stay neutral (existing
     `fg`/`border`/`bg-accent` tones already used elsewhere in this file).
4. **Detail panel — ONE panel, showing only the active actor, inside a `surface-elevated`-style
   card, crossfaded with `framer-motion` (`AnimatePresence mode="wait"`, keyed on the active
   actor id) matching `HistoricalCasesPanel.tsx`'s existing pattern.** Two-column layout:
   - **Text column is the FIRST DOM child** (→ renders at the visual right in RTL) — matches
     the reference (text on the right, photo on the left) and matches
     `HistoricalCasesPanel.tsx`'s own DOM-order convention for the same visual arrangement.
     Contents, top to bottom: the active actor's `label` as a large heading; `oneLiner` as the
     paragraph below it; a horizontal divider; then a `grid grid-cols-2` of the 4
     `ACTOR_FIELD_ROWS` entries **in their existing array order** (`identity`, `goals`,
     `targets`, `structure`) — do NOT manually reorder them. Rendering them in existing order
     inside a 2-column grid, relying on this page's RTL auto-flow (first item → top-right,
     second → top-left, third → bottom-right, fourth → bottom-left), reproduces the reference's
     exact cell layout (זהות top-right, מטרות top-left, מטרות לחימה bottom-right, מבנה
     bottom-left) with zero manual reordering. Each of the 4 cells shows: its field's icon
     asset (`TOPIC01-ASYM-ICON-IDENTITY/GOALS/TARGETS/STRUCTURE.png`, matched to the field's
     `key`), the field's existing `label` (from `ACTOR_FIELD_ROWS`), and the field's existing
     value text (`activeActor[field.key]`) — same data as today, just laid out as an icon grid
     instead of a stacked `<dl>`.
   - **Photo column is the SECOND DOM child** (→ renders at the visual left in RTL). Uses the
     active actor's portrait `*.png` via `IsometricAsset`, `fit="cover"`, rounded corners
     matching the panel's own radius on its outer edges. Overlay the actor's existing
     `shortDesc` text near the bottom of the photo as a caption (this is the only existing field
     that matches the reference's caption slot — reuse it verbatim, do not invent new caption
     copy).
5. **Responsive:** collapse the detail panel's two columns to one (photo above or below text —
   use judgment) below `md`; keep the 3-tab banner row at all widths (3 equal columns is fine
   down to mobile widths — shrink padding/font-size as needed, don't drop a tab). Every field
   must remain visible/reachable at every width — no data silently dropped on mobile.
6. Remove the now-unused old `ACTORS_LIST.map(...)` desktop-subgrid and mobile-stack blocks
   entirely once replaced (confirm via grep that nothing else in the file still depends on the
   removed JSX structure — the data constants `ACTORS_LIST`/`ACTOR_FIELD_ROWS` stay, only their
   old rendering is removed).

### Verification (mandatory — do not report done without this)

1. `npx tsc --noEmit` — fix any type errors.
2. Screenshot `http://localhost:3000/lessons/topic-01/#scene-asymmetric` at 1440px width
   (Playwright — `npx --no-install playwright ...` or an ad-hoc script driving
   `playwright-core`/`playwright`, matching the pattern described in `design/docs/assumptions.md`).
   Compare against `lesson1part5image1.png`, specifically the banner-tabs + detail-panel region
   only (the reference's header/CTA/footer chrome is explicitly out of scope, see above, and
   will legitimately not appear).
3. Click through all 3 tabs and screenshot each state. Check specifically: photo is never
   mirrored; `accent` orange appears only on the active tab, never on the other two; no
   clipped/cut-off text in the icon grid for the longest value string among the 3 actors;
   RTL column order is correct in the actual rendered screenshot (photo visually left, text
   visually right) — not just in the JSX; every one of the 4 icon images loads (not a
   placeholder) for all 3 actors.
4. Fix any material mismatch found and re-screenshot until clean. A named, specific limitation
   is acceptable to report as remaining — a silent, unverified claim of "matches the reference"
   is not.
5. Append a dated entry to `design/docs/assumptions.md` (new `##` heading, matching the existing
   "Topic-01 levels scene" entry's style) documenting: the `accent`-only active-tab decision
   and why (references the levels-scene precedent), the omitted lightbulb tip box and why, and
   the exact aspect-ratio technique used for the banner/photo images if a custom
   `aspectRatio` was needed.
6. Append one line to `docs/UI-CONSISTENCY-RECOMMENDATIONS.md` under
   `## Screen-specific findings` (new `### topic-01 #scene-asymmetric` subsection, or append to
   an existing one if already present) noting the same `accent`-only-active decision, so a
   future consistency pass doesn't "fix" it back without checking this decision first.
7. Commit the change. The banner/photo/icon asset files under
   `public/assets/lessons/topic01/scene-asymmetric/` are currently untracked — include them in
   this commit (confirm via `git status` and add them explicitly by path, not `git add -A`,
   since other unrelated untracked/modified files exist in the working tree right now — do not
   touch or commit `src/components/lessons/topic-01/LevelsScene.tsx`, `AGENTS.md`, the
   `lesson1part*image*.png` reference screenshots in `design/reference/lesson-01/`, `.agents/skills/`, or
   `public/assets/lessons/topic01/scene-mdo/` — none of those belong to this task).

### Report

Write your full report to the report file path given in your dispatch. Include: what you
implemented, the `tsc` result, each screenshot taken and what it showed, every delta found and
how it was fixed, anything left unresolved and why, and the exact commit hash(es). Then reply
with the short status contract from your dispatch instructions.
