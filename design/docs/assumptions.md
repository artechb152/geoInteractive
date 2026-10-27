# Design Assumptions

## 2026-10-12 — Selected definitions layout: option 1, realistic assets and fuller copy

- The user explicitly selected option 1 (two always-visible definition cards). Two final images plus PNG masters are in `public/assets/lessons/topic02/scene-coordinates/definitions/`; runtime WebP files are 1536×1024. The implementation prompt with exact expanded Hebrew copy is `design/docs/2026-10-12-coordinates-definitions-claude-prompt.txt`. Application code was not changed.
- The photographic field scene is synthetic and its paper map is illustrative. The Earth pair uses the site's NASA-based texture as reference; the result is a generated conceptual image, not a data-rendered map or a numerical demonstration of flattening. Labels stay in HTML; no crop/stretch/mirror. Fuller copy was checked against the source deck and official NOAA educational material; its mathematical ellipsoid is one reference-body example, distinct from the geoid.


## 2026-10-12 — Simplified presentation of the two coordinate definitions (revised brief)

- The user clarified that this opening is for definitions, with practice later. This supersedes the exploration/task/stepper alternatives below. New concepts in `design/mockups/coordinates-definitions-simple-2026-10-12/` present both definitions continuously: two illustrated cards, one annotated shared image, or two glossary rows with one optional visibility button. No definition tabs, quizzes, feedback, or required interaction.
- The mathematical body is an illustrative example, not a definition of every reference body. Exaggerated globe/ellipsoid separation and flattening in generated art are schematic; the README specifies the precise source copy, existing tokens, static/SVG implementation option and unchanged downstream lesson. No application code was modified.


## 2026-10-12 — Coordinates 1 opening definitions: three mockup alternatives

- Requested scope is the two opening definitions in `CoordinatesScene.tsx` / `IntroColumns`: geodesy and spatial reference bodies. Three alternative images and a Hebrew interaction handoff are saved in `design/mockups/coordinates-intro-2026-10-12/`. No application code was edited for this request.
- The lesson shell, existing tokens and 1440px desktop review are the references. Generated PNGs are concept art (actual raster size is recorded in the accompanying README), not exact CSS measurements. Generated sidebar deviations and typography differences are not proposed shared-shell changes.
- The three concepts show two exploration cards, a guided local-to-global representation, and a two-step mapping task. Each includes both definitions; they are alternatives rather than three consecutive lessons. Terrain points are schematic, and no coordinate values or precision claims are introduced before the reference system is defined.
- Mathematical reference surfaces are virtual models, not geological layers or a physical smoothing/flattening of terrain. Any globe wire mesh is illustrative geometry; the axes step introduces the coordinate framework. Detailed ellipsoid/geoid/heights and datum activities remain later in the lesson.


## 2026-10-11 — Topic-02 geodesy mockup alternatives

- Three static image concepts were requested for selection and later development with Claude Code. Only images and a handoff brief were created in `design/mockups/topic-02-geodesy/`; no lesson code was changed. Final deliverables use `-v2.png` filenames.
- The existing lesson shell, palette, typography and 1440px desktop target are the design reference. Alternative interactions within the reference-body block are authorized by the user's request. Sidebar omissions and generated typography/color deviations in the images are concept artifacts, not proposed changes to the shared shell or approved tokens.
- Measurements are invented pedagogical examples, not real location data. Surface separation is exaggerated. The globe cutaway represents virtual reference surfaces, not geological interior layers. The README defines correct h/H/N meanings and rendering rules; generated arrows were removed from concepts 1 and 3 to avoid misleading measurement endpoints.


## 2026-09-23 — Flow prompt package for topic-03/topic-04 onboarding

- The user requested production prompts, so the deliverable is `design/storyboards/2026-09-23-flow-onboarding-topics-03-04.md`; no lesson implementation or copy is changed. The four existing accordion topics per lesson define four endpoint images and three adjacent transitions.
- The reference to the realistic style in lessons 2–3 is interpreted as topic-02's rendered terrain/materials plus topic-03's warm realistic hook artwork. Topic-03's current onboarding itself is still schematic. Existing palette tokens are retained; no new tokens are proposed.
- New shots use a fixed oblique camera and a 16:9 master with key features concentrated centrally. The current player cover-crops images to an accordion-dependent box, so final crop fit must be checked during asset integration. Four-second source transitions are a production choice, distinct from the existing player's approximately 1.3-second adjacent transition pacing.
- Analytical overlays reveal information about fixed terrain. They do not physically create mountains, rivers or vegetation. Technical qualifications in the prompt package preserve the lesson topics without depicting universal vehicle slope limits, omnidirectional safety or guaranteed thermal concealment.

Visual details that were uncertain in the mockup and the assumption made while implementing.
Format: one bullet per assumption — what was unclear, what was assumed, where it's applied.

- **Progress source of truth (35% vs 4/12):** the mockup shows 35% but 4/12 = 33%. Implemented one source of truth: `percent = round(completed/12·100)`, so 4 completed ⇒ **33%**. Applied in `src/lib/course-progress.ts` / `ProgressCard`.
- **"Completed lessons" heuristic:** no real completion store exists — only the last-visit tracker (`src/lib/last-visit.ts`). Assumed `completed = lastVisit.topicNumber − 1` (lessons before the one currently visited). Fresh device ⇒ empty state: ring 0%, caption "עוד לא התחלת את הקורס", button "התחלת השיעור הראשון" → topic-01. The mockup's 35%/"4 מתוך 12" was a mid-course sample, not default content.
- **Hero primary CTA label:** stays "המשך ללמוד" always (exact mockup text, no hydration flicker); only the destination is dynamic — last-visited lesson, or topic-01 on a fresh device.
- **"סקירת הקורס" (secondary CTA):** no overview page is implied by the mockup; assumed it scrolls smoothly to the course-plan panel (`#syllabus`).
- **Progress-card button label vs destination:** mockup says "המשך לשיעור הבא" but the correct behavior (per last-visit semantics) is returning to the *last-visited* lesson; kept the mockup label with that destination.
- **Carousel behavior:** mockup shows 5 of 12 lessons with a single chevron at the inline-end (visual left). Implemented paging in windows of 5 (01–05 / 06–10 / 11–12); a back-chevron appears at the inline-start only after paging, so the default view stays pixel-identical. Forward chevron gets a disabled state on the last page.
- **"צפייה בכל השיעורים":** no all-lessons route exists; assumed the pill expands the panel in place to a 12-card grid (label toggles to "הצגה מצומצמת"). No routing added.
- **Lessons 06–12 cards:** no approved display strings in the mockup — titles use `shortTitle` from `src/lib/lessons.ts`, no subtitle. Mini-dioramas use the existing assets `lesson-{06..12}-{los,weather,logistics,chokepoints,urban,borders,gis-layers}.png`.
- **Header utility buttons:** mockup implies actionable buttons but no account/notification system exists. "התראות" opens a popover with an empty state; "החשבון שלי" opens a guest-profile popover with a working "איפוס התקדמות" action (clears last-visit after inline confirmation; hero/carousel/progress update live). Styled with approved tokens only.
- **Interactive-state styling (not in mockup):** hover = slight brightness/`paper-bright` fill lift, active = 1px press, keyboard focus = 2px `ember-soft` ring. Progress ring animates to its value (disabled under `prefers-reduced-motion`).
- **Interactive 3D hero terrain (`InteractiveHomeTerrainModel`):** the static `home-hero-terrain-mockup.png` render was replaced with a real Three.js/R3F model in the same isometric-papercut style (angle, composition, palette) — it's a stylized recreation, not a pixel-identical clone of the PNG (not achievable with real 3D geometry vs. a fixed raster crop). Colours are the approved "illustration palette" from `design/design-spec.md` §8 (terrain greens/river/edge-cream/base-rim) plus existing `ember`/token values. Two tones were deliberately derived (not new arbitrary hex) for legibility: the terrain's cream high-ground uses `--surface-card #F8F2E7` instead of the slab's own `#E8DCC4` so it doesn't camouflage against the rim it sits inside, and the river is a lerp of the documented river hex with deep sage (0.45) for a muted blue-green rather than bright blue. Falls back to the original static PNG before hydration, without WebGL, or on any runtime error (`HomeTerrainDiorama.tsx`).
- **Terrain relief rebuild (2026-07-07):** the terrain went from a flat textured plane to a real displaced/vertex-coloured mesh (`terrainField.ts`: gaussian hills → soft stacked terraces → a carved river trench → a sage/cream diagonal blend → contour-line intensity, all derived from one shared height field). The slab was rebuilt from bevelled `ExtrudeGeometry` cards instead of `<RoundedBox>` per thin layer — the RoundedBox radius (sized for a chunky single block) was far larger than each thin stacked layer's own thickness, which silently inflated into a degenerate rounded blob that visually swallowed the entire terrain mesh. Verified visually via a standalone Playwright script (the project's shared MCP browser session was locked by a concurrent session) before/after the fix.
- **Terrain rebuilt in Blender, not procedurally (2026-07-07, later same day):** a second rebuild pass (ridge/domain-warp/ridged-FBM relief, slope-adaptive carved terracing, a Catmull-Rom river channel, a two-card core+lip slab) kept surfacing the same class of bug — e.g. the terrace "groove" carving a notch at height 0 itself (there's no shelf below the ground floor to carve into), which sank the entire flat majority of the terrain below the slab's plateau and read as a flat grey/white wash in every screenshot. Rather than keep fighting hand-rolled displacement math, the same tuned design (ridge placement, terrace logic, river spline, composition anchors, palette) was ported to Python and built directly in Blender via the Blender MCP, then exported as a static `public/assets/models/home-hero-terrain.glb` (~0.75MB), loaded via drei's `useGLTF` in `InteractiveHomeTerrainModel.tsx`. `terrainField.ts` was deleted (fully superseded, no longer imported anywhere). Camera/lighting/OrbitControls/reduced-motion code is unchanged from the procedural version — only the geometry source changed.

## Phase 2 — systematizing the Home style across the site (no new HEX)

- **Semantic token remap:** the sitewide semantic tokens (`bg/fg/border/accent`) were re-pointed to the Home design-lock values that already exist in `tailwind.config.ts` — `bg` → paper.page cream, `fg` → olive ink scale, `border` → tanline scale, `accent` → ember scale, `shadow-elevated` → the Home card-soft shadow. Home components use only the `paper/olive/ember/pine/tanline` namespaces, so the Home render is unaffected.
- **Body canvas behind the Home sheet:** `body` background is now cream (`bg-bg` = paper.page), which would have hidden the Home sheet's 40px rounded corners. A fixed `paper-bright` backdrop layer was added behind the sheet in the Home `PageShell` (≈ the previous near-white canvas, existing token) to preserve the sheet-on-canvas read.
- **"White elevated cards" interpretation:** per the reference style, elevated cards stay pure white (`bg-card #FFFFFF`) on the cream page — slightly brighter than the mockup's `paper.card #F8F2E7` inner-panel cards. Hairlines are `tanline` at ~50–60% opacity; card radii keep their existing values (2xl/3xl — within the mockup's 18–24px family).
- **Decorative orange removed from backgrounds:** `TopoField` (hero-strip texture) was rebuilt in the Home contour language — tan `#C9A56B` flowing contour lines at ~0.22 opacity; the V2 sage islands and decorative orange "+" survey marks were dropped (orange = action/focus only).
- **`accent.deep` value shift:** the legacy "palest orange" token now maps to ember.soft `#D69051` (the lightest ember in the approved palette). It stays lighter than `accent.DEFAULT`, so the h1→h3 orange-lightening hierarchy is preserved, just warmer/deeper than the old `#F7CFA0`.

## Topic-01 levels scene — top card rebuilt as an interactive level selector (reference: `lesson1part3image1.png`, branch `redesign/topic01-history-stories`)

- **2026-09-03, `/reference-to-ui-exact`:** replaced `LevelsScene.tsx`'s top `surface-elevated` card (previously a static pyramid diagram + paragraph, then a 3×4 `ComparisonMatrix` table) with a two-column selector: `TOPIC01-LEVELS-DIORAMA.png` with 3 overlay buttons on the visual left, an active-level detail panel (crossfaded via `framer-motion`, `AnimatePresence mode="wait"`) on the visual right — first child in DOM per this codebase's RTL convention, matching `HistoricalCasesPanel.tsx`'s own pattern. Defaults to `strategic` on load.
- **Pyramid + paragraph deleted, not relocated:** user-confirmed it isn't in the reference and doesn't need to be preserved elsewhere. `SVGPyramidStatic` and `ComparisonMatrix` (the old table renderer) were both removed from `LevelsScene.tsx` after confirming via repo-wide grep that neither was imported/used anywhere else.
- **Single-color-active, deliberately diverging from this same file's tri-color identity:** the drag-and-drop practice section below (untouched, out of scope) still colors each level distinctly (`accent-intel` purple / `accent` orange / `terrain-sand` sand, via `LEVELS[level].text`/`.borderActive`/`.bgActive`). The new selector above it, per direct user correction against the reference, uses only ONE accent color (`accent`, i.e. orange/ember) for whichever level is currently active; the other two buttons stay a neutral dark treatment (`bg-fg/80 text-bg-elevated`, reusing the existing `bg-fg text-bg-elevated` "neutral selected" pattern already used elsewhere in this codebase, e.g. `AsymmetricScene.tsx`). This is intentional and should not be "fixed" back to tri-color without re-checking this decision — also noted in `docs/UI-CONSISTENCY-RECOMMENDATIONS.md`.
- **Right-panel content diverges from the reference's own layout, per explicit task correction:** `lesson1part3image1.png` shows all 3 levels stacked as a list in the right panel; the approved brief instead specifies the panel show *only* the active level's full info (label/english + all 4 `MATRIX_ROWS` rows as subheading/paragraph pairs), matching the "click a button → one detail panel crossfades" pattern already used by `HistoricalCasesPanel.tsx`. No copy was changed — all strings reused verbatim from the existing `LEVELS`/`MATRIX_ROWS` data.
- **Diorama aspect (`3 / 2`, not one of `IsometricAsset`'s four fixed options):** the asset is exactly 1536×1024 = 3:2, which sits between the `4/3` (1.33) and `16/9` (1.78) presets and isn't a close match to either — used a custom `style={{ aspectRatio: '3 / 2' }}` container with `IsometricAsset`'s `className="... [aspect-ratio:auto]"` override instead, the same technique `HistoricalCasesPanel.tsx` already uses for its own detail-panel map column. Result: the full asset renders with zero cropping.
- **Button placement tuned by eye against the rendered asset, not the reference photo:** `lesson1part3image1.png`'s photo has a different composition than the actual `TOPIC01-LEVELS-DIORAMA.png` (this project's own generated asset), so positions were picked by looking at the rendered diorama itself — top-left "war room" vignette for strategic, the mid-frame control-room-with-screens for operational, the bottom-right close-up vignette for tactical — via `insetInlineEnd`/`insetBlockStart` (distance from the visual left/top, expressed as logical properties so nothing needs mirroring), then refined over 2 iterations of Playwright screenshots at 1440px until each button sat on its own region. A named, remaining limitation: these are eyeballed percentages tuned against one render, not measured/pixel-exact — if the diorama asset is ever regenerated with a different composition, the button positions will need re-tuning.

## Topic-01 drag-exercise practice section — reference alignment (`lesson1part3image2.png`)

- **2026-09-03, `/reference-to-ui-exact`, 4 user-specified deltas fixed in `LevelZone`/`ScenarioChip` (`LevelsScene.tsx`):** (1) answer-card icon now renders on the visual LEFT — DOM order changed to text → result-icon → img, so the img (last child) lands at inline-end in RTL with no `left-`/`right-` literals; (2) answer-card icon size increased (pool `size-9`→`size-11`, compact in-bin `size-7`→`size-8`) to match the reference's ~62% icon-to-card-height ratio, measured from cropped reference regions (the reference PNG is a screenshot, not a clean 1:1 frame, so proportions were measured rather than read as literal CSS px); (3)/(4) each zone's icon+title+subtitle+drop-box block moved from `pt-[12%]` (~14% visual position) down to `top-[26%]`, matching the reference's ~26% icon-top / ~52% box-top proportions.
- **CSS gotcha found and fixed:** `padding-top` as a percentage resolves against the containing block's WIDTH per spec, not height — `pt-[X%]` on this tall/narrow zone column could never reach the intended vertical position no matter how large X was tuned (confirmed by measuring the actual rendered offset before/after — it tracked column width, not height). Switched to `top-[%]` on an absolutely-positioned child (which DOES resolve against height), which in turn required pinning the 3-column grid wrapper itself to the map's aspect-ratio box (`sm:absolute sm:inset-0`) — otherwise the grid had no explicit height left for its children to stretch into once their content left the document flow (children going `absolute` collapsed their old flow-content-driven parent to 0px height). Mobile (below `sm`) keeps the original in-flow `pt-[12%]` layout untouched, since the map container itself is `aspect-auto` there and still needs real content height to size itself.
- **Percentages tuned from reference-crop measurements, not exact math:** the reference PNG has no crop tool available, so sub-regions were isolated via a small Playwright script rendering the PNG as a `data:` URI and clipping specific pixel rectangles. The reference (1672×941) happens to match `TOPIC01-LEVELS-DRAG-BG.png`'s own pixel dimensions, which helped, but it's still a rendered screenshot of the app, not a clean design frame — percentages were derived from those crops, then verified by rendering the live page and re-measuring via `getBoundingClientRect()`.
- **Named, remaining limitation — pre-existing horizontal overflow, NOT fixed (out of requested scope):** `document.body.scrollWidth` ≈1560px vs `clientWidth` 1440px at the project's own 1440px target width, specifically in this drag-exercise section. Confirmed present *before* any of this session's edits, so it predates this work. The user explicitly asked to stay focused on the 4 listed items only, so it was left as-is; this session's own verification screenshots were taken at a 1600px viewport to route around the resulting clipping. Logged in `docs/UI-CONSISTENCY-RECOMMENDATIONS.md` under Open decisions for a future pass.

## Topic-01 asymmetric-actor scene — 3-actor cards rebuilt as banner-tab selector (reference: `lesson1part5image1.png`)

- **2026-09-06:** replaced `AsymmetricScene.tsx`'s "all 3 actors at once" static card grid (the `hidden md:grid md:grid-cols-3` subgrid + the `grid md:hidden` mobile stack, both mapping over `ACTORS_LIST` simultaneously) with a single new `ActorTypologySelector()` — 3 clickable photo banner-tabs (one per `ACTORS_LIST` entry, in existing array order, so `regular` lands at the visual right per this RTL page's inline-start convention) driving one crossfaded detail panel below that shows only the active actor's data. Pattern (state + `AnimatePresence mode="wait"` keyed on the active id + RTL DOM-order for the two-column panel: text first child/visual-right, photo second child/visual-left) copied from `HistoricalCasesPanel.tsx` and this same file's sibling `LevelsScene.tsx` level-selector, per the task brief's explicit precedent pointer.
- **Accent-only active-tab, following the levels-scene precedent one section up:** only the active banner tab gets an `accent` (orange) treatment — a solid bottom underline bar plus `text-accent` on its own label. The other two tabs stay fully neutral (`border-border`, `text-fg`, no accent anywhere). This directly follows the same rule already documented above under "Topic-01 levels scene": the reference screenshot's own active-tab color (an olive/green underline bar) belongs to a different, explicitly out-of-bounds palette (the landing-redesign mockup colors that `HistoricalCasesPanel.tsx` itself uses) — this scene's own `accent` token (`#D97E2B`, orange) was used instead, copying the reference's *pattern* (exactly one accent-colored cue, tied only to the active item) and not its literal hue.
- **Icon-vs-text order inside each of the 4 field cells, determined by pixel-cropping the reference, not guessed or copied from this file's other icon rows:** the reference's 2×2 icon grid places each field's icon toward the visual LEFT of its cell and the label+value block toward the visual RIGHT — confirmed by rendering the reference PNG in a throwaway Playwright page and clipping tight screenshots of the "זהות" and "מטרות" cells to inspect exact pixel positions, since the task brief didn't specify this sub-order explicitly. In RTL that means the label/value `<div>` must be the FIRST DOM child (renders at the visual right / inline-start) and the icon circle the SECOND DOM child (renders at the visual left / inline-end) — the opposite order from this same file's unrelated `FrontRow` component (Time Asymmetry table, icon-first), which was left untouched.
- **Omitted the reference's lightbulb "tip" callout box — confirmed intentional, not an oversight:** its Hebrew copy ("שימו לב לקשר בין המדינה, המטרות והמבנה.") has no backing field anywhere in `ActorMeta`/`ACTORS_LIST`, and this task's binding constraint was zero new/invented Hebrew copy. Left out entirely, per the task brief's explicit instruction to omit it.
- **Custom (non-preset) aspect ratio for the banner tabs — same override technique as the levels-scene diorama and `HistoricalCasesPanel`'s map column:** the `*-BANNER.png` assets are 2172×724px (3:1), which doesn't match any of `IsometricAsset`'s four fixed `aspect` presets (`16/9` / `21/9` / `1/1` / `4/3`). Rather than force a mismatched preset (which would letterbox or over-crop), each banner button gets an explicit fixed height (`h-20 sm:h-24`, width comes from the 3-column grid) and `IsometricAsset` is passed `className="absolute inset-0 size-full [aspect-ratio:auto]"`. **Mechanism correction (2026-09-06, final review):** this does NOT work via Tailwind class-conflict resolution — `[aspect-ratio:auto]` is a different tailwind-merge conflict group than `aspect-square`/etc., so merge order doesn't decide which "wins" either way, and the earlier version of this note was wrong to claim that. The real reason it works: `absolute inset-0 size-full` gives the image element a definite width AND height from its positioned parent, so the CSS `aspect-ratio` property has nothing left to compute from and is simply moot — it only ever matters for an element missing one of the two dimensions. This is the exact `[aspect-ratio:auto]` override string already used twice elsewhere in this codebase (`LevelsScene.tsx`'s diorama, `HistoricalCasesPanel.tsx`'s map column). The active-actor portrait column in the detail panel uses the same override (nominal `aspect="4/3"`, cover-fit; real source is closer to 4:5 portrait), letting the panel's own CSS-grid row height — set by the text column's natural content height — determine its real rendered height. The field-grid icons, by contrast, do NOT use this override (no `[aspect-ratio:auto]` in that call's className) — their `aspect="1/1"` is real and governs the box, matching the icon PNGs' true 1:1 square dimensions.
- **Portrait photo caption intentionally carries no accent underline, unlike the reference:** the reference draws a small orange line under every photo's caption regardless of which tab is active. Left out here: the "accent-only active state" rule above means the ONLY accent-colored element in this whole component must be tied to the currently-active tab — an unconditional accent line under every photo's caption (active or not) would add a second, always-on accent cue, which is exactly what that rule guards against.
- **Named, remaining limitation — pre-existing lesson-page mobile horizontal overflow, NOT introduced by this task and NOT fixed (out of scope):** while verifying this selector's mobile collapse (~390px viewport), `document.body.scrollWidth` measured ≈535–537px against a 390px viewport on the topic-01 lesson page. A DOM-level scan found zero elements inside `#scene-asymmetric` itself exceeding the viewport's own bounds, and the same ≈535px overflow is present on that lesson's default `#scene-hook` scene too (unrelated to this task) while being entirely absent on the site's home page (`/`) — so this is a pre-existing issue somewhere in the shared lesson-page chrome (`LessonShell.tsx` / `PagedLearn.tsx`), not in this component or any individual scene. Logged in `docs/UI-CONSISTENCY-RECOMMENDATIONS.md` under Open decisions for a future dedicated mobile pass.
- **Animation-behavior change, intentional consequence of making this section interactive (final whole-branch review, 2026-09-06):** the old static 3-cards-at-once grid gave each card its own per-card `whileInView` scroll-reveal (fade+rise as it entered the viewport). The new `ActorTypologySelector` doesn't animate on scroll at all — the detail panel only crossfades on tab click (or mounts instantly on first render). This is a deliberate consequence of the block becoming a single interactive control rather than 3 static cards revealed one-by-one while scrolling past them, not an oversight or a dropped requirement.
- **Named, remaining limitation — mobile banner crop, same class of limitation as the levels-scene precedent (final whole-branch review, 2026-09-06):** at narrow mobile tab widths, the ~3:1 `*-BANNER.png` source (cover-fit into a much-less-wide button) shows only roughly its middle third. This mirrors the already-accepted "eyeballed/approximate, tuned by eye against one render" limitation class documented under "Topic-01 levels scene" above (button placement tuned against one diorama render). Fixing it properly would need either a mobile-specific crop of each banner asset or a different mobile tab layout entirely (e.g. dropping the photo below a given width) — judged out of proportion to this task's scope.

## Topic-01 typology table restyle (reference: `lesson1part5image2.png`, from an unrelated app — visual language only)

- **2026-09-06, `/reference-to-ui-exact`:** restyled `TypologyTable()` in `AsymmetricScene.tsx` (the 3-actor guess-before-reveal comparison table) to match the reference's card look — a `TypologyTableHeader()` sub-component adds a photo strip under each actor column's label, the currently-un-revealed rows get a warm `bg-bg-accent/25` tint plus a `border-s-4 border-accent` bar on the table's outer/right edge (this project's RTL `inline-start` = visual right, confirmed by this same file's own comments elsewhere), and the attribute-label column/checkmark badges were bumped to bold to match the reference's weight. Task scope was explicitly "redesign only this table, don't touch anything around it, don't change any existing question/answer text, reuse the images already on the page" — no Hebrew copy in `COMPARE_ROWS`/`ACTORS_LIST` was touched.
- **Reused existing banner images, no new assets generated:** the reference's per-column header photo is filled with the same `TOPIC01-ASYM-ACTOR-{ID}-BANNER.png` files `ActorTypologySelector`'s own tabs already use higher up this same scene — exactly the "images should be like the images already on the site before this" instruction. No new `IsometricAsset` prompt/asset id was introduced.
- **Reversed 2026-09-06 (same day), after user feedback "זה עדיין נראה שונה" (still looks different):** the first pass kept the any-order answering model and rendered every un-revealed row as its own active riddle simultaneously — visually that reads as 5 stacked questions, nothing like the reference's calm one-active-row structure, and was the dominant reason the table still didn't read as a match. Adopted the reference's actual sequential-lock gating: `activeIndex = COMPARE_ROWS.findIndex(i => answers[i] === undefined)` — only that one row renders as an interactive riddle (tint + accent bar); earlier rows stay revealed; later rows render a third, new "locked" branch showing the row's existing label plus the reference's own "טרם הושלם" placeholder text in each data cell, no button/click affordance. This is a real interaction-model change (learner must now answer in order, not any order), traded in deliberately because it's what the reference's dominant visual signature actually depends on — matches the reference's own "not yet completed" copy verbatim, not invented text.
- **Kept the existing per-cell correct/wrong tint on reveal, rather than the reference's plain-text reveal:** the reference's two "done" rows just show plain text per column plus a checkmark next to the label, with no color-coding of which column was the right vs. guessed-wrong answer. This table already highlighted the true answer green (`bg-status-ok/10`) and a wrong guess red (`bg-status-danger/10`) before this restyle — kept as-is since it's existing pedagogical feedback, not a visual-only detail, and removing it would reduce functionality the task didn't ask to change.
- **Radius kept to this file's own small-radius convention, not copied from the reference:** the reference's buttons/cards use a larger, pill-ish corner radius belonging to a completely different app. Every other card/button in this file (and the rest of the topic-01 lesson experience) uses small `rounded-[3px]`/`rounded-[4px]` corners — the restyled choice buttons stay on that same `rounded-[4px]` convention rather than importing a foreign radius scale, so the table doesn't look inconsistent with the rest of the page it lives on.
- **Reversed again, 2026-09-07, direct user request:** the 2026-09-06 sequential-lock gating (single active row, `border-s-4 border-accent` highlight, "טרם הושלם" locked placeholder on later rows) was explicitly undone — every row is answerable at any time again, regardless of order. Also removed on request: the ✓/✗ badge next to the revealed row's attribute label (per-cell green/red tint on the answer/wrong-guess columns was kept — not asked to change), and the `shortDesc` secondary caption under each actor column's label in `TypologyTableHeader()`. This is a direct instruction, not a fidelity call — it intentionally supersedes the 2026-09-06 reference-matching rationale above.

## Topic-01 "five tactics" match exercise — drag replaced with one-at-a-time click flow (reference: `lesson1part5image5.png`)

- **2026-09-07, `/reference-to-ui-exact`:** `TacticMatchExercise()` in `AsymmetricScene.tsx` changed from a drag-and-drop (or select-then-click) exercise showing all 5 field-report vignettes and all 5 text-only tactic boxes at once, to a click-only, one-question-at-a-time flow, per explicit user instruction. `current = TRAITS.find(t => placement[t.id] == null)` (the earliest un-placed trait in TRAITS' fixed array order) is the single field report shown in a centered callout box; clicking one of the 5 tactic cards assigns it there and the next un-placed trait becomes `current` automatically — no separate step/index state needed. Clicking an already-assigned card un-assigns it (mirrors the old bin's unplace-by-click behavior, just without the drag half). `VignetteChip` (the draggable chip) was deleted; `TacticBin` was replaced by `TacticPhotoCard`.
- **No progress-dot indicator added, direct user instruction:** the reference shows a "דיווח 1 מתוך 5" + 5-dot progress indicator above the callout box. Explicitly told not to add it ("אל תוסיף את התפריט נקודות שמראה כמה שאלות יש") — omitted entirely, not an oversight.
- **Zero invented/changed Hebrew copy, direct user instruction ("אל תשנה בכלל את המלל"):** every existing string was kept verbatim — the intro paragraph (which still says "גררו (או הקישו עליו ואז על שם הטקטיקה)", i.e. still mentions dragging as if it were optional) was left untouched even though the drag option no longer exists in the new flow, because the instruction was literally "don't change the text at all," and the sentence's click-alternative half already describes the new flow accurately. The reference's own new heading ("לאיזו טקטיקה הדיווח מתאים?") was NOT added, following the same no-new-copy precedent already set above for this file (the omitted lightbulb-tip callout). The two buttons ("איפוס"/"בדוק תשובות") and their behavior were left completely unmodified, per explicit instruction to focus only on the report/tactic design — the bottom controls block required zero code changes.
- **Old drag-specific microcopy removed, not "text changed":** the empty-bin placeholder strings "גרור לכאן" / "שחרר כאן" / "הקש לשיבוץ כאן" (drag-here / drop-here / click-here-to-place) were mechanically tied to the old drag/hover states being removed (`isOver`, `onDragOver`/`onDragLeave`/`onDrop`, `draggable`) and no longer have any UI state to describe once photo cards replace text bins — treated as part of "the functionality changes," not the substantive copy the no-text-changes instruction was protecting.
- **Visual language kept to this file's own established tokens, not the reference's:** per the precedent already logged above for `TypologyTable` ("radius kept to this file's own small-radius convention, not copied from the reference"), the new callout box and photo cards use this file's existing `surface-elevated`, `rounded-[4px]`, `border-border`/`border-border-subtle`, `text-fg`/`text-fg-muted`, `bg-status-ok/10`-style tokens — not the reference mockup's larger radii/colors, which belong to a different app.
- **Photo-card grid sizing (`basis-[47%] sm:basis-[31%]`, no `max-w` cap):** reproduces the reference's "3 cards top row, 2 centered second row" via plain `flex flex-wrap justify-center` — percentage basis instead of a fixed pixel cap, because a `max-w-[220px]` cap (tried first) let a 4th card fit onto row 1 at the section's ~1088px content width (`max-w-6xl` minus padding) before wrapping. Verified at 1440px via headless Playwright: 3×337px row then 2×337px centered row, both sharing the same center x. Mobile (`basis-[47%]`, unaffected by the fix) stays 2+2+1.
- **New assets, reused verbatim from the lesson's own asset folder:** `TOPIC01-ASYM-TACTIC-{CONCEAL,EMBED,SILENCE,CHEAP,OPTICS}.png` (1774×887 photographs, one per `TRAITS` id) — already present in `public/assets/lessons/topic01/scene-asymmetric/` before this task, generated to match the reference's 5 tactic photos. Rendered via the same `IsometricAsset` + fixed-height-container + `[aspect-ratio:auto]` override pattern already used elsewhere in this file for non-1:1 photographic sources (the actor banners, the typology-table header strip).

## Topic-01 "three pillars" decision cards restyled to match the reference card art (reference: `lesson1part5image3.png`)

- **2026-09-07, `/reference-to-ui-exact`:** `PillarDecisionCard()` (the `PillarSimulator()` 3-up grid, "שלושה עמודי האסטרטגיה של השחקן הלא-סדיר") rebuilt to match the reference: each card now opens with the pillar's own numbered banner illustration (`TOPIC01-ASYM-PILLAR-{1,2,3}-BANNER.png`, `index + 1` — 1=persistence/tanks, 2=deterrence/shield+city, 3=attrition/clock, matching this file's existing `PILLAR_DECISIONS`/`PILLARS` array order and the already-correct RTL card order, no data reordering needed), a radio-style choice list with a circular indicator (empty ring / solid red "✗" on a wrong pick), a bordered pink callout box for the wrong-choice explanation, a bordered green checkmark callout for the solved feedback, and a shared mountain/pine-tree footer band under every card. A decorative hairline + 3-dot "step rail" (`aria-hidden`, no text) was added above the card row, matching the reference's connector line between the 3 numbered cards. No pedagogical copy (prompts, choice labels, feedback strings, `pillar.oneLiner`/`.detail`) was touched.
- **Reused existing assets only, nothing generated:** `TOPIC01-ASYM-PILLAR-1-BANNER.png` / `-2-BANNER.png` / `-3-BANNER.png` (1983×793) and `TOPIC01-ASYM-PILLAR.png` (1024×1536, the cream card-frame art with a mountain/pine band along its bottom edge) were already present in the lesson's asset folder before this task — the explicit instruction was "all the images you need are in this page's image folder." No new `IsometricAsset` id/prompt was introduced.
- **Dropped the old "עמוד N" text label — treated as UI chrome, not protected copy:** the previous card header rendered a plain `עמוד {index+1}` line above the (conditionally-shown) pillar title. The reference has no such text anywhere — the card number is baked into the new banner artwork instead. Removing it follows the same precedent already logged above ("old drag-specific microcopy removed, not text changed") for scaffolding labels that become redundant once a reference-matching visual element takes over their job; every actual lesson-content string was left untouched.
- **Solid-fill radio circles, a deliberate departure from this file's existing soft-tint badge convention:** `DragExercise`'s existing ✓/✗ badge (elsewhere in this same file) uses a pale tint (`bg-status-ok/15 text-status-ok`) — a *grading* badge. The reference's per-choice indicator reads as a *selection* control (an unfilled ring when neutral, a solid color-filled circle with a white glyph once picked), a different UI idiom, so the pillar cards' circles were built solid-filled (`bg-status-danger text-white` / `bg-status-ok text-white`) to match the reference's own look rather than reusing the softer badge style verbatim.
- **Mountain footer rebuilt as a fixed-height band, not a full-bleed absolute background — a fidelity fix found via render-and-compare, not a assumption:** the first pass rendered `TOPIC01-ASYM-PILLAR.png` as one absolute `inset-0` background per card (`fit="cover" position="bottom"`) so the card's own border+bg+landscape came from a single continuous image. Headless-Playwright screenshots of the "wrong choice" state (longest content: prompt + 2 options + a red feedback box) showed the last line of red feedback text visually overlapping the mountain artwork — because `object-fit: cover` scales that band as a fixed *proportion* of total card height, and this card's real content needed more than the ~75% of height the image's empty "sky" area provided. Fixed by rendering the landscape as a separate, normal-flow footer element sized off card *width* only (`aspect-[10/3]`, same `fit="cover" position="bottom"` crop trick used at a small fixed height) placed after the padded text column — so it can never grow into, or be grown into by, however much text sits above it. Re-verified with the same screenshot script: no overlap in either the neutral or the wrong-choice + solved combined state.
- **Radius/border kept to this file's own tokens (`.surface`'s `rounded-2xl` + `border-border/60`), not a new radius scale:** same precedent as the typology-table and tactic-match entries above — the reference's own card corner radius reads close enough to this file's already-larger `.surface` cards (unlike the smaller `rounded-[3px]/[4px]` scale those two other restyles deliberately kept) that no new radius token was needed here; the pillar cards already used `.surface` before this task.
- **Reversed the same day, direct user request:** the mountain/pine-tree footer band (the fixed-height `TOPIC01-ASYM-PILLAR.png` strip described in the bullet above) was removed entirely — the user explicitly asked to delete it. `TOPIC01-ASYM-PILLAR.png` is no longer referenced anywhere in this file; it stays on disk unused since deleting asset files wasn't asked for. This supersedes the "shared mountain/pine-tree footer band" and "Mountain footer rebuilt as a fixed-height band" bullets above — read them as the *first* pass's rationale, not the current state.
- **Card height fixed from first paint (`min-h-[30rem]` on the padded content column), also direct user request:** cards previously used CSS Grid's default row-stretch (all 3 cards match the tallest sibling's natural content height), so solving a card — or landing on a wrong choice, which adds a feedback box — grew that card's natural height and reflowed the whole row. The user wanted the footprint fixed up front so revealing more/less text never resizes the card. `30rem` (480px) was chosen by measuring the true worst case with headless Playwright: solving **all three** pillars simultaneously (the tallest realistic combination — title + green checkmark box + `oneLiner` + `detail` per card) renders at 621.95px total card height with 0px of scroll overflow on every card, confirmed via `el.scrollHeight - el.clientHeight`. The now-unused `mt-auto` that used to pin the unsolved choice buttons to the card's bottom edge was also dropped — with a fixed-height card and no footer image competing for space, top-anchored content (prompt directly followed by its choices, spare room falling below) reads better than a big pinned-to-bottom gap.

## Topic-01 "9 orgs" drag exercise — chips + bins restyled (reference: `lesson1part5image6.png`)

- **2026-09-07, `/reference-to-ui-exact`:** `OrgChip()` and `CategoryBin()` in `AsymmetricScene.tsx` (the final drag/click-to-classify exercise, "לאיזה סוג שייך כל ארגון?") restyled to match the reference — task scope was explicitly limited to these two pieces ("the army types you drag, and the armies you drag them into"), not the buttons or page background, and zero Hebrew copy was to change. Every existing string (`org.label`/`.subtitle`, `actor.label`, the "ריק · מחכה לסיווג"/"N סווגו כאן" caption, "גרור לכאן"/"שחרר כאן"/"הקש לסיווג כאן", the per-org wrong-answer feedback, score line, button labels) renders verbatim — nothing was deleted or reworded, only re-skinned.
- **`OrgChip` became a true pill (`rounded-full`), not a foreign import:** this codebase already has a `.chip` utility in `globals.css` (`rounded-full ... border`) for exactly this role, so the reference's pill shape is this project's own existing "chip" convention, not copied wholesale from an unrelated app (the concern that drove the *opposite* choice — keeping small `rounded-[3px]`/`[4px]` radii — in the `TypologyTable`/`TacticMatchExercise` entries above, where the reference's radius belonged to a different design system with no local equivalent). A new `grip` icon (six dots) was added to the shared `Icon.tsx` set and shown only in `state === 'pool'` (matching the reference: chips already sorted into a bin show no drag handle).
- **Subtitle (org's country/context) kept, not dropped, despite the reference chip showing a single line:** `org.subtitle` (e.g. "לבנון", "אפגניסטן · 2001–2021") is pedagogical content, not UI chrome — unlike this file's earlier-removed "עמוד N" pillar label or the old drag-specific placeholder strings (both logged above as chrome, not protected copy). Kept as a second line inside the same pill; `rounded-full` on a two-line chip still clamps to an oval "pill" look (the browser radius clamp is `min(radius, height/2)`), so the visual family still reads as a pill despite the extra line.
- **`CategoryBin` radius (`rounded-2xl`) reuses this file's own existing token, not the reference's:** `PillarDecisionCard`'s `.surface` cards earlier in this same file already use `rounded-2xl` for a photo-topped card — reused here rather than introducing a new radius scale, following the same "reuse what's already in this file" reasoning as the pill-chip decision above, just landing on the *larger* of this file's two already-established radii instead of the smaller one used by `TypologyTable`/`TacticMatchExercise`'s plain (non-photo) cards.
- **New `*-BIN.png` photos used exactly as pre-generated, no new prompts needed for the actual assets:** `TOPIC01-ASYM-ACTOR-{REGULAR,GUERRILLA,TERROR}-BIN.png` (1672×941, 16:9 — matches `IsometricAsset`'s `16/9` preset with no aspect override needed) were already present in the lesson's asset folder before this task, generated to match the reference's 3 bin photos (tank convoy / mountain tent camp / bombed urban street) 1:1. An `ACTOR_BIN_PROMPT` record was still added alongside the file's other `ACTOR_*_PROMPT` constants, purely as the `IsometricAsset` placeholder brief for the (already-satisfied) missing-asset case, consistent with every other photo call in this file.
- **Title overlay placement (top of photo, scrim + short accent rule underneath) copied from this file's own `ActorTypologySelector` caption pattern, not rebuilt from scratch:** reused `bg-gradient-to-b` scrim + absolutely-positioned text block, mirroring the already-existing `bg-gradient-to-t` scrim caption on the actor detail panel's photo column higher up this file — same mechanism, opposite direction (reference puts the title at the photo's top, not bottom).
- **Drop-zone "+" is the new shared `plus` icon, not literal `+` text:** added to `Icon.tsx` alongside `grip` for a crisp stroke-based glyph matching the rest of the icon set, rather than relying on a text glyph's font-dependent weight/centering.
- **Verified via headless Playwright at 1440px:** default (empty) state, mid-placement, all-9-placed, and post-"בדוק תשובות" graded state (✓/✗ tinted pills + per-org feedback + score line) all screenshot-checked against the reference and against each other — no regressions to the existing click-to-place/drag/grade/reset behavior, only the visual layer changed.
- **Named, pre-existing limitation confirmed NOT caused by this task:** at a 390px mobile viewport, `document.body.scrollWidth` measures ~537px against a 390px `clientWidth` — the same magnitude already logged above under "Topic-01 asymmetric-actor scene" as a pre-existing, page-chrome-level overflow unrelated to any one scene/component. Re-confirmed here by walking every element inside `#scene-asymmetric` for the widest offender: it's an unrelated dev-only debug badge, not anything in `OrgChip`/`CategoryBin`. Left unfixed, out of this task's scope.

## 2026-09-14 — Topic 02 scale-picker redesign (reference: `design/reference/lesson-02/lesson2part4image1.png`)

- **Scope limited to the interactive scale-picker (buttons + map + info sidebar) inside `ScaleScene.tsx`**, per the explicit request ("החלק של הקנה מידה"). The two intro comparison cards above it ("הכלל המנחה"/"ההיגיון ההפוך") and the `ProjectionCallout` section below it are pre-existing, unrelated content — left completely untouched, including their own copy, which reads differently from the reference's bottom "גדול או קטן?" bar. Zero Hebrew copy anywhere in the scene was changed, per explicit instruction — only `mapAsset` metadata (asset id/src/alt, not display text) was added to the `SCALES` data.
- **Map images matched to scale by each PNG's own baked-in scale bar**, not by filename: the three root-level `ChatGPT Image …png` drops were opened and their embedded scale bars read directly — `0/100/200/300 מ'` (≈300m extent, single village, individual buildings visible) → **1:10,000**; `0/0.5/1/1.5 ק"מ` (multi-village regional view) → **1:50,000**; `0/2.5/5/7.5 ק"מ` (wide area with full cities) → **1:250,000**. Copied into `public/assets/lessons/topic02/scene-scale/TOPIC02-SCALE-{10K,50K,250K}.png`, following this project's existing `public/assets/lessons/topic02/scene-<name>/` convention, and wired through `IsometricAsset` (same component every other lesson photo uses) rather than a plain `<img>`.
- **Custom `3/2` aspect via `[aspect-ratio:auto]` override**, not one of `IsometricAsset`'s four presets: the source PNGs are 1536×1024 (3:2), which matches neither `4/3` nor `16/9`. Used the same `absolute inset-0 size-full [aspect-ratio:auto]` technique already established in this codebase (topic-01 levels-scene diorama, `HistoricalCasesPanel`'s map column) instead of forcing a mismatched preset.
- **No zoom controls, no locate/compass affordances, no A–B distance-line overlay, no bottom-right inset map** — all explicit exclusions from the request. The reference's zoom +/− buttons and locate diamond were dropped entirely (only the 3 scale buttons switch the map). The reference's illustrative orange dashed A–B route with a "4 ס״מ במפה" label was also not reproduced: it would require inventing arbitrary geographic points on real photographs that don't have equivalent marked points, and the page's own existing "מחשבון מרחק" calculator already covers that exact cm→km relationship textually — adding a fabricated route risked misleading map annotation for no functional gain. The on-map ratio badge chip that existed in the *previous* implementation was also dropped (redundant with the now much more prominent scale-button row); nothing resembling the reference's bottom-right inset thumbnail was added.
- **Icons: placeholders only, per explicit instruction not to invent or hand-pick them.** Added a local `IconPlaceholder` (a plain dashed-border box, no glyph) everywhere the reference shows an icon that isn't already implemented: the 3 scale-button icons (replacing the previous implementation's own "L/M/S" letter badges, which were themselves a stand-in the user is now explicitly asking to replace with a blank slot), and small icon slots beside the "רזולוציה קרטוגרפית" / "משימה אופיינית" / calculator headings in the sidebar. Did **not** touch the pre-existing checkmark icon (`Icon name="check"`) on the detail bullets — that predates this task and isn't one of "the reference's icons" needing a placeholder. Skipped the reference's map compass/north-arrow glyph entirely rather than placeholder it, since it's purely decorative chrome with no existing equivalent and its absence doesn't affect comprehension.
- **Map ⇄ sidebar visual placement swapped to match the reference, via CSS `order`, not DOM order.** The previous implementation rendered the map at the visual right and the sidebar at the visual left (RTL grid auto-placement: first DOM child → first column → inline-start/right). The reference has it the other way — map at visual left (inline-end), info sidebar at visual right (inline-start). Fixed by keeping the map as the first DOM child (preserving the original mobile stacking order and tab order) and applying `lg:order-2`/`lg:order-1` so only the ≥1024px desktop grid placement flips; confirmed via a 390px-viewport screenshot that mobile still stacks map-then-sidebar exactly as before.
- **Sidebar restructured from two separate floating cards into one continuous panel merged with the map**, matching the reference's single bordered card with an internal vertical divider (`lg:border-e border-border-subtle` on the sidebar column) instead of two independent `surface`/`surface-elevated` boxes with a gap. Content order inside was changed to checklist → "משימה אופיינית" note → calculator (matching the reference's own top-to-bottom flow) instead of calculator-then-checklist; no wording changed, only which panel comes first.
- Verified interactively (headless Playwright, 1440px): clicking each of the 3 scale buttons swaps to the geographically-matching photo and recomputes the existing calculator's km output correctly (e.g. 1:250,000 at 4 cm ⇒ 10.00 km; 1:10,000 at 4 cm ⇒ 0.40 km) — confirms the map choice per scale lines up with this scene's own pre-existing pedagogical bullet text (e.g. the 1:250,000 detail bullet says "רואים ערים ככתם ורק כבישים ארציים" and its photo does show cities/national roads).
- Root-level source drops (`ChatGPT Image Sep 14, 2026, 01_08_*.png`) were removed after copying into `public/assets/lessons/topic02/scene-scale/` under their proper names, to avoid leaving duplicate multi-MB files at the repo root.

## 2026-09-14 — Topic-01 levels scene — selector rebuilt as a banner-tab interaction (matching `AsymmetricScene.tsx`'s `ActorTypologySelector`)

- **Explicit request: make the 3-level selector's interaction match `#scene-asymmetric`'s army-type selector.** Replaced `LevelsScene.tsx`'s old single-diorama-with-3-overlay-buttons selector with a new `LevelTypologySelector()` — 3 clickable photo banner-tabs (`LEVEL_ORDER` order, so `strategic` lands at the visual right per this page's RTL convention) driving one crossfaded detail panel below, structurally ported from `ActorTypologySelector` (same tab markup/classes, same `AnimatePresence mode="wait"` detail panel, same accent-only-active-tab rule, same two-column text-first/photo-second RTL layout). `LEVEL_BUTTON_POSITION` and the old `LevelButton` overlay-button component were removed; `TOPIC01-LEVELS-DIORAMA.png` is no longer referenced anywhere in this file — it stays on disk unused, per the same "don't delete unreferenced asset files unless asked" precedent already logged above for `TOPIC01-ASYM-PILLAR.png`.
- **Zero copy changed, direct instruction ("אל תשנה בכלל את המלל"):** every string rendered by the new selector — level labels/English names, and all four `MATRIX_ROWS` field values (who/zoom/time/example) — is read verbatim from the pre-existing `LEVELS`/`MATRIX_ROWS` data, unchanged from the old selector. Only the surrounding interaction/markup changed.
- **Source images were already routed correctly before this task started — verified, not re-copied:** the user had already placed `TOPIC01-LEVELS-{STRATEGIC,OPERATIONAL,TACTICAL}-BANNER.png` (2172×724, matching `ACTOR-*-BANNER.png`'s own 3:1 format exactly) at `public/assets/lessons/topic01/scene-levels/`, byte-identical (md5-verified) to duplicate copies left at the repo root. Per this file's own precedent one section down ("Root-level source drops … were removed after copying"), the root-level duplicates were deleted; nothing needed moving.
- **Detail-panel photo column reuses the same banner asset as the tab above it, not a separate portrait:** unlike `ActorTypologySelector` (which has a distinct wider-crop portrait per actor, `ACTOR-{id}.png`, separate from its `-BANNER.png` tab image), no second per-level photo asset exists or was supplied. Reusing the single banner image in both places — cover-cropped differently per box — follows this same file's own existing precedent of reusing banner assets in a second UI role (`TypologyTableHeader` reuses `ACTOR-*-BANNER.png` for its column-header photos rather than requesting new assets).
- **Banner image prompts authored fresh** (`LEVEL_BANNER_PROMPT`, matching each banner's actual rendered content — war room/world map for strategic, regional command screens for operational, hillside patrol for tactical) as the `IsometricAsset` placeholder-regen brief, consistent with every other photo call in this lesson file; purely a fallback since the real assets already exist and render.

## 2026-09-14 — Topic-01 levels scene — selector redesigned to match reference `lesson1part3image1new` exactly (`/reference-to-ui-exact`)

- **Reference routed to `design/reference/lesson-01/lesson1part3image1new.png`** (alongside the original `lesson1part3image1.png` this same scene was built against back on 2026-09-03), matching this project's own `design/reference/lesson-0N/` convention already established for topic-02.
- **Tab cards rebuilt to match the reference's split photo/label card** (photo ~55%, solid-color label area ~45%, gradient fade between them) with a full 2px rounded-border ring in `accent` orange on the active tab — replacing the previous pass's bottom-accent-bar treatment (itself copied from `AsymmetricScene.tsx`'s `ActorTypologySelector`, which uses a different active-state convention than this reference). This scene's tabs and `ActorTypologySelector`'s tabs are intentionally no longer visually identical; only their underlying interaction model (click a banner → crossfade a detail panel) still matches.
- **Detail panel rebuilt from a 2-column text/photo split to the reference's own single-column layout:** full-width banner photo on top (same asset reused a third time — tab, and now here; no separate portrait exists, as already noted in the earlier levels-scene entry above), then a headline + one-line tagline, then a 3-column `who`/`zoom`/`time` field row (icon at each field's visual left — same convention as `AsymmetricScene.tsx`'s `ACTOR_FIELD_ROWS`), then a divider and a full-width `example` row. All four field VALUES (`who`/`zoom`/`time`/`example`) and their LABELS are still read unchanged from the existing `LEVELS`/`MATRIX_ROWS` data — only their arrangement changed.
- **New `LEVEL_TAB_SUBTITLE` strings, transcribed verbatim from the reference:** all 3 tab subtitles ("כוח • משימה • שטח" / "זירה • תיאום • מערכה" / "מדינות • מדיניות • משאבים") are legible in the reference regardless of which tab is "active" there, so these were read directly off the image rather than reusing the pre-existing `LEVELS[level].dragSubtitle` field, whose wording differs (that field is untouched, still used only by the unrelated drag exercise further down the same file).
- **New `LEVEL_TAGLINE` strings — ⚠️ only the strategic one is sourced, the other two are authored and need review:** the reference only ever shows the strategic tab "open" (its detail panel is the only one visible), so only `"המבט הרחב: מטרות המלחמה והמשאבים להשגתן."` is transcribed verbatim from it. `operational`'s and `tactical`'s taglines (`"התיאום האזורי: סנכרון כוחות, ציוד ותנועה בין החזית לעורף."` / `"הפעולה בשטח: ההחלטה המיידית שמכריעה את הרגע."`) were written to match that one line's grammatical pattern, paraphrasing this scene's own existing `who`/`zoom`/`example` copy for each level. Unlike every other string touched in this pass, these two are new copy, not transcribed from any source — flagged here for the user to confirm or replace.
- **Footer hint transcribed verbatim:** `"לחצו על באנר אחר כדי לעבור לרמה הבאה"` is legible in the reference and reproduced exactly.
- **Field icons are the shared `Icon` glyph set, not photographic assets:** `people`/`globe`/`clock`/`target` (already used elsewhere in this codebase — `AsymmetricScene.tsx`'s `COMPARE_ROWS`/`PILLARS` icons) were matched by eye to the reference's own simple line-icon glyphs; no new icon asset was generated.

## 2026-09-14 — Topic-01 levels scene — tab-card proportions fixed ("not similar enough to the reference, and too tall" — direct user feedback)

- **Root cause:** the previous pass moved `LevelTypologySelector` outside its `max-w-6xl` wrapper expecting that to widen it to the reference's card proportions, but `max-w-6xl` (1152px) was never actually the binding constraint — `LevelsScene`'s own `<section className="px-4 sm:px-6 lg:px-8">` padding (32px/side at desktop) already narrowed its content box to ~1105px, tighter than max-w-6xl. So that move was a no-op: tab cards stayed ~360×180px (aspect ≈2.0) against the reference's own measured ~380×175px (aspect ≈2.17, measured by pixel-scanning `lesson1part3image1new.png` directly — its ~1402px design frame maps ≈1:1 to 1440px per this project's own stated convention).
- **Fix:** `LevelTypologySelector`'s root now carries `-mx-4 sm:-mx-6 lg:-mx-8`, a negative-margin breakout that cancels the section's own padding for this element only (same technique as any "full-bleed within a padded container" pattern), recovering the section's full ~1169px content box. Verified live via `getBoundingClientRect()`: tab cards now measure 381.6×175px — matching the reference to within a few px. Card height was also trimmed slightly (`h-[168px] sm:h-[180px]` → `h-[155px] sm:h-[175px]`) to land on the reference's measured 175px once the width fix was in.
- **Unrelated build break found and fixed while re-verifying:** partway through this pass, `LevelMeta`'s `borderActive`/`bgActive`/`text` fields (and their 3 per-level values) had been removed from this file by an edit outside this session — but `LevelZone` (the drag-exercise renderer further down, untouched by any of this task's work) still reads all three, so the file no longer type-checked. Restored the 3 fields with their original values (unrelated to this task otherwise) so the build works again; flagging here in case that removal was an in-progress change from elsewhere that this restore now conflicts with.

## 2026-09-14 — Topic 03 geology redesign

- User explicitly requested three separate screens and a futuristic visual treatment referencing Topic 01. The existing landing mockup is not a layout reference for these new lesson screens.
- Keep the existing `scene-geology` deep link for the opening concepts; add `scene-rocks` and `scene-geology-forces` to the existing lesson pager.
- Use existing cream, sage, olive and tan semantic tokens, shared SurfaceCard, SceneHeader and FrameCorners. No new color tokens. Schematic terrain uses existing illustration colors, grid and cutaway linework; it is not mirrored in RTL.
- Rock photos are to be created by the user. Use clearly labelled neutral photo slots, with no invented rock photograph; this locally scoped placeholder avoids exposing production instructions to learners. Slots switch to user-supplied images at the documented paths. This follows the user's explicit request to provide the photos later.
- Content keeps the source explanations. Correct two obvious typos (cooling, wind-formed dunes), shorten opening and summary for the separated screens. No geological fact-check was part of this visual task.
- Desktop target: 1440 × 1122. New illustration composition and spacing use existing Tailwind spacing and surface patterns; no mobile redesign.

## 2026-09-14 — Topic-01 levels scene — drag-exercise zone badges redesigned to match reference `design/concept-exploration/levels-drag/mockup-with-text-background.png`

- **Scope limited to the drag exercise** ("תרגול גרירה": the 3-zone map + event pool), per the explicit request. The level-selector banner-tabs above it (already redesigned in the two entries above this one) were not touched.
- **New per-zone badge icons wired in, exactly as supplied — nothing generated.** The user supplied 3 bronze-medallion coin icons at the repo root (globe+laurel, folded-map+flag, soldiers-in-crosshair) as the "new icons that need to be on the map." Copied verbatim into `public/assets/lessons/topic01/scene-levels/drag-exercise/TOPIC01-LEVELS-DRAG-BADGE-{STRATEGIC,OPERATIONAL,TACTICAL}.png`, replacing the old flat-colored `strategic-purple.png` / `operational-orange.png` / `tactical-gold.png` (now unreferenced, left on disk unused, same precedent as other superseded assets logged above). The 3 root source drops were themselves byte-identical to `design/concept-exploration/levels-drag/{strategic,operational,tactical}.png`, already archived there by other work on this same icon set — the root duplicates were deleted (2026-09-15), not re-archived. The reference mockup (byte-distinct from that folder's own `mockup-no-text-background.png` sibling — this one still has the opaque label plaques the sibling had removed) was moved into the same folder as `mockup-with-text-background.png`, since it wasn't archived anywhere yet.
- **Zone label color and drop-box border/text unified to one shared style across all 3 zones — a fidelity fix found via render-and-compare, not a cosmetic preference.** The old per-zone `LEVELS[level].text`/`.borderActive`/`.bgActive` fields (`accent-intel` purple / `accent` orange / `terrain-sand` tan) were removed from `LevelMeta` entirely. `terrain-sand` in particular nearly matched the tactical zone's own terrain artwork color, making that zone's "טקטית" label and its whole "גררו לכאן" drop-box (border + text + chevron) unreadable — confirmed by a cropped/zoomed screenshot before fixing. The reference itself uses one uniform dark-ink label color and one uniform accent-colored dashed box across all 3 zones, not a color per zone, so the fix (module-level `ZONE_LABEL_TEXT = 'text-fg'`, `ZONE_DASH_BORDER = 'border-accent'`, `ZONE_DASH_BG_ACTIVE = 'bg-accent/15'`, reusing this project's own existing tokens) both matches the reference and resolves the legibility bug in one change. Idle-state box opacity raised from `opacity-50` to `opacity-70` to keep the now-uniform orange border visibly dashed at rest, matching the reference's clearly-visible (not near-invisible) boxes.
- **`LevelMeta.fillClass` left untouched despite being unused in this file:** pre-existing dead field, out of this task's scope — not removed, to keep the diff limited to what this task actually changed.
- **Note: this file was being edited concurrently by another live session/editor during this task** (the `LevelTypologySelector` tab height and wrapper placement changed mid-task, unrelated to this entry). Only the drag-exercise edits described above are this task's own; unrelated concurrent changes elsewhere in the file were left as-is, not reviewed or reverted.

## 2026-09-14 — Topic 02 "אנטומיה של נ״צ" rebuilt as an interactive map (reference: `design/reference/lesson-02/lesson2part5image3.png`)

- **Scope limited to `DigitAnatomy`/`DigitGroup` inside `CoordinatesScene.tsx`**, per explicit instruction — `DatumShiftDemo` (deviation simulation), `GridReferenceExercise` (pinpoint drill), and `CoordinateAnatomy` (the separate closing "bottom line" block) were confirmed untouched.
- **Coordinate model:** one fixed anchor (east 178350 m / north 666750 m) derives all three precisions (178/666, 1783/6667, 17835/66675) via a single `splitDigits()` helper — matches the pre-existing `GRID_EAST_KM`/`GRID_NORTH_KM` worked example exactly, confirmed by direct calculation before implementation.
- **Dropped the mockup's per-axis blue/orange color split** (old code used `text-accent-cool` for Northing): the mockup itself uses one uniform olive/orange scheme for both axes — the mockup is the design source of truth, so the uniform scheme was adopted; `text-accent-cool` is untouched everywhere else it's used in this file.
- **No leader lines from the map to the digit numbers, and none from the km-square to the zoom inset** — deliberate simplification, not an oversight: the mockup's static dashed connectors don't generalize once the numbers are dynamic per precision level, and the interactive hover-sync (digit ↔ map highlight) communicates the same relationship more robustly. Mirrors this file's own prior precedent (the Topic-02 scale-picker entry above, which dropped a similarly-static illustrative route for the same class of reason).
- **One raster asset reused for both the main map and the zoom inset**, via CSS `background-position`/`background-size` on the same file (`terrain-map.png`) rather than a second cropped image — per explicit instruction. At the 10-digit precision the crop is ~10× beyond the source's native resolution (a 100 m window out of a 1254 px, 6 km-wide source), which reads as a soft/painterly close-up rather than crisp new detail — an inherent, accepted consequence of reusing one fixed-resolution demo asset at its deepest zoom, not a bug.
- **Zoom-inset desktop placement is a physical (non-logical) `top-3 right-3` overlay inside the map**, matching this same file's own established precedent comment on `GridSquare`'s overlay ("a diagram-alignment concern, not RTL text flow") — never flips under RTL. Mobile renders a separate, normal-flow stacked instance instead of trying to reposition the same absolutely-positioned box.
- **Task 2 verification (2026-09-14) found and fixed a real RTL `<text>` clipping bug in `AnatomyMap`'s grid-line axis labels ("175"–"181" / "663"–"669"), exactly the class of bug this project's own `CLAUDE.md` flags for inline SVG under RTL.** `textAnchor="start"` was already set explicitly, but that alone isn't enough: under the page's inherited `dir="rtl"`, `text-anchor="start"` anchors to the visual RIGHT and grows leftward instead of rightward, which silently pushed every one of the 14 axis-number labels off-position — the westmost easting ("175") and topmost northing ("669") were clipped to near-zero visibility, and the eastmost easting ("181") lost its last digit. Confirmed via `getBoundingClientRect()` against the container before/after, not just eyeballed. Fixed by adding an explicit `direction="ltr"` attribute to both `<text>` elements (matching how numerals elsewhere in this file get `dir="ltr"`, e.g. the `<bdi>` digit readouts), plus a boundary-only anchor flip (`textAnchor="end"`, label-below-line) for the single row/column that sits exactly on the viewBox edge, since a plain LTR fix alone would have pushed *that* one past the opposite edge.
- **Same pass also found and fixed two knock-on label-collision defects that the RTL clipping bug had been silently hiding** (invisible/clipped text can't visually overlap anything): (1) the origin corner's northing label ("663") and easting label ("175") both resolve to nearly the same on-screen position once un-clipped, since every easting label shares one row (`y = MAP_VB - 4`) that happens to coincide with `i === 0`'s default northing-label row — fixed by nudging that one northing label further up. (2) the topmost northing label ("669") lands inside the same top-left corner as the map's own `FrameCorners` decoration once un-clipped — fixed by nudging it down clear of the bracket. Both are small, targeted offsets for the one row/column each affects; the other 12 of 14 labels use the original unmodified formula.
- **Desktop (1440px), mobile (390px), and interaction/a11y verification (brief Steps 1–3) otherwise found no other material deltas against `lesson2part5image3.png` or the Global Constraints.** Digit-button `aria-label`s are all non-empty; the fine-digit button correctly shows a disabled `–` at 6-digit precision; both caption lines under each readout stay in the DOM/visible regardless of active state (no color-only distinction); a real keyboard Tab lands on the first digit button with a visible focus ring (`:focus-visible` true, box-shadow ring confirmed via computed style, not just class presence). Mobile reading order (heading → digit readouts → map → stacked zoom inset → precision selector) matches the brief exactly, the map stays square, and a DOM walk scoped to `DigitAnatomy` found zero elements wider than the viewport — the page's `body.scrollWidth` (~594px vs 390px) is the same pre-existing, page-chrome-level overflow already logged elsewhere in this file (topic-01 precedent), not attributable to this component.

## 2026-09-14 — Topic 02 pinpoint-drill exercise redesigned to match reference (`design/reference/lesson-02/lesson2part5image4.png`, `/reference-to-ui-exact`)

- **Scope limited to `GridReferenceExercise` (the "1. הדגמה" / "2. תרגול עצמאי" tabbed card)** inside `CoordinatesScene.tsx`, per the explicit request ("החלק של התרגול"). The `CoordinateAnatomy` closing "bottom line" band visible in the same reference crop (below the exercise card in the mockup) was left untouched — it reads as a separate, pre-existing component one section down, not part of "the practice part," and restyling it would have meant inventing new copy (the mockup's "דיוק מוביל לביטחון" 3-word vertical label has no equivalent anywhere in `CoordinateAnatomy`'s existing text).
- **New background art, processed from a user-supplied source, not generated by this session.** The user provided `ChatGPT Image Sep 14, 2026, 02_55_34 PM.png` (root-level, 1254×1254) showing the exact parchment grid-card + terrain-bleed + book/pen props seen in the reference. It had no real alpha — the "transparent" checkerboard was baked in as literal near-neutral-gray pixels (confirmed via `sharp`: background region `max(r,g,b)-min(r,g,b) ≤ 4` vs. ≥22 for every real content pixel sampled) — so it was chroma-keyed to true alpha (threshold: grayness ≤8 AND luminance 95–225, continuous — not two disjoint bands, which was tried first and left a visible mesh of un-keyed anti-aliased edge pixels), trimmed to its opaque bounding box (1206×1171), and re-encoded as WEBP (156 KB vs. 2.7 MB PNG). Saved to `public/assets/lessons/topic02/scene-coordinates/TOPIC02-COORDINATES-GRID-CARD.webp`, following this project's own `public/assets/lessons/topic02/scene-<name>/` convention (same as the scale-picker entry above) rather than the generic `public/reference-assets/` path a from-scratch pass would default to. The root-level source drop was deleted after copying, per the repeated precedent already logged above for `scene-scale`.
- **`GridSquare`'s hand-drawn SVG border/gridlines/0–9 axis digits were removed — the art now supplies them.** The interactive layer keeps only what has to stay dynamic (column/row highlight, target circle, guess marker) as a thin SVG positioned over the art via a measured `GRID_INSET`. Caption rows ("צפון (Northing) 666–667" / "מזרח (Easting) 178–179") stay separate HTML text outside the art, unchanged — the art's own baked ticks are generic 0–9, not these real km-square numbers.
- **Two real alignment bugs found and fixed via render-and-compare, not assumed correct from the math alone:**
  1. **RTL column-order flip:** the clickable 10×10 overlay (`grid grid-cols-10 grid-rows-10`) reverses column order under this page's `dir="rtl"` — confirmed empirically (eDigit=0's button rendered at the visual RIGHT, eDigit=9 at the visual LEFT, opposite of the art's printed 0→9 left-to-right ticks) via `getBoundingClientRect()` on labeled cells, not by inspection. This predates this task (`GridSquare` already used the same classes) but was silent before because the previous SVG-drawn digits were immune to it (SVG numeric coordinates ignore CSS `direction`) while the *click regions* were not — so it never visibly mismatched anything. Now that clicks must land on the art's own printed digits, it's load-bearing. Fixed with `dir="ltr"` on that one overlay div.
  2. **`<svg>` replaced-element sizing quirk:** positioning the highlight/target/guess SVG via `left/right/top/bottom` percentages (matching the overlay div) silently ignored `top`/`bottom` and forced the SVG back to its `viewBox`'s own 1:1 intrinsic ratio (confirmed via `getBoundingClientRect()`: the SVG box came out square and taller than the actual grid area, while the sibling overlay div — a non-replaced element, unaffected by this quirk — sized correctly from the same four insets). This is standard CSS behavior for replaced elements (SVG/IMG) with an intrinsic ratio when width/height are both auto, regardless of `preserveAspectRatio` (which only governs the viewBox→viewport *content* mapping, not the element's own CSS box). Fixed by expressing `GRID_INSET` as `left/top/width/height` (explicit width and height, neither `auto`) instead of `left/right/top/bottom`, which bypasses that algorithm entirely — verified both elements report byte-identical bounding boxes afterward.
  3. **`GRID_INSET`'s own first measurement was itself wrong**, discovered only by rendering red/blue reference gridlines over the source art and eyeballing them against the printed grid (the fix that exposed bug #2 above still looked misaligned by ~2.5 cells horizontally until this was also found): the initial pixel-scan for the card's left edge crossed a row that also intersected the art's own decorative dashed orange route line in the terrain background, returning that line's x-position instead of the true grid border. Re-measured using only scan-rows confirmed clear of both the route line and the book/pen props (a narrow safe band, y ≈ 55–76% of image height), landing on `left: 30.3%` instead of the original (wrong) `4.2%`. Re-verified by re-rendering the gridline overlay — now flush with the art's own printed lines and digits — and again live in-browser (`highlightCol`/target-marker screen position vs. the SVG box's own measured edges) before trusting it.
- **Tabs restyled to a solid dark-fill active state** (`bg-fg text-bg-elevated`, reusing this codebase's existing "neutral selected" pattern from `AsymmetricScene.tsx`) instead of the previous accent-tinted-outline style, matching the reference's dark-filled "1. הדגמה" pill. Inactive tab stays a plain bordered box, also per the reference.
- **New "01"/"02"/"03" step numeral reuses the existing `.outline-numeral` CSS class** (already defined in `globals.css`, already used identically for zero-padded numbers in `LessonCard.tsx`) rather than a new style — fed `step+1` / `index+1` (zero-padded), computed from state, not extracted from any existing string.
- **The demo-step heading text was left exactly as-is (`"1 · המשבצת המודפסת"`, etc.), including its own leading digit, even though the new big numeral now shows the same number redundantly** — per absolute text-preservation: stripping the "1 · " prefix to avoid the duplication would have been editing existing copy, which wasn't asked for.
- **Compass icon (top-right, decorative) uses the existing plain `compass` glyph from `Icon.tsx`, with no coordinate readout text added.** The reference shows a "33.2500° N / 35.5000° E"-style readout next to its compass rosette, but that's new content with no backing data anywhere in this app (no real GPS/location system) — inventing display coordinates was judged out of bounds for the same reason `ScaleScene.tsx`'s redesign (logged above) skipped the reference's compass/north-arrow glyph rather than fabricate one. No `IconPlaceholder`-style dashed box was needed for it since a real, thematically-correct icon already existed in the shared set.
- **"Practice done" state (all 3 targets solved) collapses to a single column** (the right-column text shows the `X/3` summary + "תרגלו שוב"; the left grid column renders nothing) rather than reusing the reference's own layout for that state, since no reference crop shows it — direct visual continuation of the same card, not a new design.
- **Verified end-to-end via headless Playwright at 1440px:** all 4 demo-walkthrough steps (highlight position, target marker, numeral, nav button disabled/enabled states); practice mode correct guess, incorrect guess (marker + retry), and full 3/3 completion + reset; a `getBoundingClientRect()`-based check that clicking the button labeled for a given (eDigit, nDigit) visually sits under that exact printed pair on the art, not just that the click *logic* agrees with itself.
- **Mid-task incident, disclosed for transparency:** partway through this pass, a concurrent live session/editor working on this same file's (unrelated) `DigitAnatomy` section committed its own work and, in the same commit, reverted this exercise redesign back to its pre-task state as "out-of-scope drill code" for *their* commit (see `d1dae84` in git log) — almost certainly an accidental side-effect of them cleaning their own diff, not a rejection of this design (their own note on the `DigitAnatomy` entry above confirms they intended `GridReferenceExercise` to stay untouched by their work). The processed asset survived (untracked binary file, unaffected by the code revert); the code was reapplied in full from this session's own verified state and re-verified against the live page afterward. Flagging in case the other session's author wants to know why `CoordinatesScene.tsx` changed again after their commit.

## 2026-09-15 — Topic-02 "הדמיה מבצעית" (DatumShiftDemo/ImpactMap) restyled with a real topo backdrop (reference: `design/reference/lesson-02/lesson2part5image2.png`)

- **Scope limited to the `ImpactMap` sub-component inside `CoordinatesScene.tsx`'s `DatumShiftDemo`** — the slider, the big "N מ׳ סטייה" numeral, the status pill, and the "השלכה מבצעית בשטח" consequence panel were left byte-for-byte untouched, per the explicit instruction not to change any text. Only the map graphic itself (previously a flat `fill-bg-elevated` rect with an abstract 11×11 tactical grid) was redesigned.
- **New background art, user-supplied, not generated by this session.** The user provided `ChatGPT Image Sep 15, 2026, 10_51_33 AM.png` (root-level, 1695×928) — a painterly topo map matching the reference's terrain style. Resized to 1400px wide and re-encoded as WEBP, following this project's own `public/assets/lessons/topic02/scene-<name>/` convention (same precedent as the grid-card asset logged above): `public/assets/lessons/topic02/scene-coordinates/TOPIC02-COORDINATES-DATUM-MAP.webp`. The root-level source drop was deleted after copying, per the repeated precedent already logged above.
- **The source art had its own baked-in axis labels ("0 m"–"500 m" on two edges) and a compass rosette in the top-right corner — cropped out before use, not left to be randomly clipped by `object-cover`.** A first pass used the full frame and, live in-browser, showed truncated label fragments ("00 m") bleeding in at the container edges — caught by rendering and looking, not assumed safe from the source image alone. Fixed by cropping the asset itself (`left:80, top:10, width:1180, height:700` off the resized 1400×766 image) to a clean terrain-only region before it ever reaches the page; `object-cover` now only ever crops plain terrain.
- **This app's own decorative compass reused instead of the source art's baked one** — same reused `Icon name="compass"` glyph and "no invented coordinate readout" rule already established for `GridReferenceExercise` (logged above): a small `bg-bg-elevated/80` circular chip, physically anchored `top-2.5 right-2.5` (not logical `start-`/`end-`) since a map-orientation glyph must not flip position under RTL any more than the terrain art itself — same reasoning already on record for this file's other physical map-overlay anchors (`AnatomyZoomInset`'s `lg:top-3 lg:right-3` overlay and its `bottom-1.5 right-1.5` scale legend). This project's `rtl-audit` script flags all three as bare `right-` usage; all three are accepted false positives for this exact reason, not oversights.
- **Target marker changed from a plain dot to a crosshair (circle + cross), and the static `r="6"` dashed ring around it now scales with the live deviation distance** (`Math.min(20, 4 + distance * 0.4)`, clamped so a shift of 100 — whose true offset distance is ~41 units — can't push the ring past the `100×56` viewBox's top/bottom edges), so the dashed ring visually grows toward the red impact dot as the slider moves, echoing the reference's own dashed circle (there, its radius exactly equals the "5 מ׳" distance to the dot). The clamp means the two don't match exactly at high shift values — a deliberate tradeoff over letting the ring blow out of frame, not an attempt at literal geometric accuracy.
- **No "N מ׳" distance tag was added along the dashed connector line, unlike the reference's "5 מ'" callout on that line.** The same number is already displayed prominently as the big numeral above the map ("`{shift}` מ׳ סטייה"), and adding a second, separate text node on the map would be new copy the instruction didn't ask for — skipped for the same absolute-text-preservation reason logged throughout this file.
- **No scale bar was added**, despite the reference showing one (0/50/100/200 מטר ticks in the bottom-right). This simulation's SVG units have no real fixed metres-per-unit ratio — `shift` only maps to a screen-space offset via `offsetX = min(38, shift*0.38)` / `offsetY = shift*0.15`, not a georeferenced scale — so a tick-marked scale bar would assert a precision this demo doesn't actually have. Same category of omission as the compass-readout skip above.
- **Verified live via headless Playwright at 1440px across the slider's range (0/20/50/90)**, confirming: the cropped art shows no stray label/compass fragments at any shift value; the crosshair, dashed ring, red impact dot, and dashed connector all render and animate correctly; the two pre-existing `<text>` labels ("מטרה מבוקשת" / "מיקום פגיעה בפועל") are pixel-identical in wording/position to before. `tsc --noEmit` passes with no new errors.
- **Follow-up (same day), user feedback via `/reference-to-ui-exact`: "still not similar enough — colors and some elements differ, also match the meter gauge and the demo's SVG."** Re-measured `design/reference/lesson-02/lesson2part5image2.png` at true 1672×941 resolution with pixel-level sampling (not eyeballed) and fixed four real mismatches:
  - **Target crosshair + "מטרה מבוקשת"**: was `accent-cool` (blue, `#5b9dd9`) — reference samples converge on dark olive ink (`#232305`–`#38432E` range), which is exactly this app's existing `fg.DEFAULT` token. Swapped to `stroke-fg`/`text-fg`; the earlier blue read as a WGS84/GPS color cue this file uses elsewhere, but it isn't actually in the reference art.
  - **Red impact dot + connector line + impact label**: was `accent-hot` (`#e2553a`, orange-red) — reference sampling (median of solid-fill regions, paper background excluded) converges on a darker, more muted brick-red for the dot (`#a8342a`) and an even darker maroon for the label ink (`#7a1a12`). Neither matches an existing token closely enough to reuse (`accent.hot` too orange, `status.danger #ef4444` too bright/pink), so these are new literal hex values, per this skill's explicit "sample exact colors rather than approximating with a close-enough default" rule — flagged in the audit, not silently invented.
  - **North indicator**: reference uses a bare solid dark-olive triangle + "N" letter directly on the map, top-left, no background chip — not a circular icon chip. The previous pass's circular `bg-bg-elevated/80` chip with the rosette `Icon name="compass"`, positioned top-right, was replaced with a small fixed-px HTML triangle+letter glyph at the map's physical left (matching the reference's own placement; not an RTL mirroring question — a north arrow's side is a map-design choice, independent of text direction, same principle as never mirroring the terrain art itself).
  - **Scale bar ("המד של המטרים")**: was missing entirely (deliberately omitted in the first pass, see the "no scale bar" bullet below). Added a hand-drawn tick bar, but calibrated its 3 tick values to **0/50/100** — the exact checkpoints this component's own slider caption row already establishes (`"0 מ׳"` / `"50 מ׳ (טווח רסיסים)"` / `"100 מ׳ (החטאה מלאה)"`) — instead of the reference's own 0/50/100/200 (this demo's `shift` never exceeds 100) or its "222050"-style coordinate readout underneath (still skipped, same no-backing-data reasoning as the compass-readout precedent above). Also added a small floating "`{shift} מ׳`" tag along the dashed connector line, matching the reference's own "5 מ'" callout — this only ever displays a number already shown as the section's own headline (`"{shift} מ׳ סטייה"`), so it isn't new invented content.
  - Also gave the connector line a small SVG `<marker>` arrowhead (present in the reference, absent before), and fixed a latent bug found while touching this code: the radial gradient's `stopColor="var(--accent-cool)"` referenced a CSS custom property that a repo-wide search found defined nowhere — an undefined `var()` on an SVG presentation attribute silently fails, so that stop never actually painted anything. Replaced with the literal `#38432E` hex instead of perpetuating the same dead pattern.
  - **Two new pixel-sampled colors** (`#a8342a` brick-red, `#7a1a12` maroon) don't correspond to existing tokens — flagged explicitly in the Phase 1 audit as required-by-reference rather than picked quietly, per this skill's measurement-rigor rule taking precedence over the softer "reuse existing tokens" convention when they genuinely conflict.
  - Re-verified live at shift 0/50/100: crosshair/label/scale-bar all read as dark olive ink, dot/line/label all read as the new brick-red/maroon, arrowhead visible on the connector line, "N" arrow renders top-left, scale bar's "מ׳" unit label confirmed via a zoomed crop (not just assumed from a small screenshot). `tsc --noEmit` and the RTL audit both re-run clean (the audit's one new flag, the N-glyph's `left-2`, is the same accepted physical-anchor exception already on record for this file's other map-overlay anchors).

- **Follow-up (same day), second `/reference-to-ui-exact` pass: "still not similar enough — the map is bigger, all the text is on the right with nothing above the map, the meter gauge is exactly the image's width and below the map, the font is a bit different."** Re-cropped the reference's own full-height vertical strip at the map/sidebar boundary (not the earlier low-res eyeball) and found the actual structure: inside the bordered card, the layout is a 2-column grid — **sidebar first (right): status badge → big number → consequence panel, stacked** — then **map (left), matched to the sidebar's full height, not a fixed 16:9 box** — and **below that whole grid**, still inside the card, the **main drag-slider spans the full card width**. My build had the title/badge/number/slider/legend all stacked *above* a much-narrower map+consequence-panel grid — which is what made the map look smaller, put text above it, and left the slider on the wrong side of the map.
  - Pixel-measured the reference's column ratio (edge-scanning, not eyeballing): map ≈1084px, sidebar ≈439px → **map:sidebar ≈ 2.47:1**, vs. this build's previous `1fr`/`1.6fr`.
  - Restructured `DatumShiftDemo` (`CoordinatesScene.tsx` ~line 164 on): sidebar column = `[status badge] → [eyebrow label + big number] → [consequence panel]`, `grid-cols-[1fr_2.4fr]` with `items-stretch`; map wrapper dropped `aspect-video` in favor of stretching to the sidebar's own height (`min-h-[260px] md:min-h-0` as a mobile fallback, since an all-absolutely-positioned map wrapper has zero intrinsic height once it's no longer a single-column grid row on small screens). The main slider + its 0/50/100 legend row moved from above the grid to below it, unchanged internally. Every string is still exactly the pre-existing text, just relocated in the DOM/layout — confirmed by diffing the JSX before/after this edit.
  - Concluded "המד...בדיוק ברוחב של התמונה ומתחת למפה" refers to this **main slider** (this file's own text already calls it "המד" — "גררו לשינוי הסטייה"), not the small in-map scale bar added in the previous round, which the reference itself shows correctly nested inside the map's own lower area (confirmed via the same vertical-strip crop) — that element didn't need to move.
  - **Font ("הפונט טיפה שונה") left unresolved, flagged rather than guessed at**: side-by-side letterform comparison didn't turn up clear evidence of a wrong font *family* (both read as geometric-sans Hebrew, consistent with this app's existing Rubik/Heebo) — noted as open rather than silently changed, since swapping fonts would need a new dependency this task wasn't authorized to add.
  - Hit an unrelated dev-server hiccup mid-verification (`__webpack_modules__[moduleId] is not a function`, a known Next.js HMR cache issue) — cleared `.next` and restarted the dev server (came back up on port 3000 instead of 3006) rather than debugging the app code, since `tsc --noEmit` was already clean before and after.
  - Re-verified live at shift 0/100 on the restarted server: map now visibly larger and full-height next to the sidebar, badge/number/consequence-text all confined to the right column, nothing above the map, slider full-width below. Noted (not fixed, out of scope) a pre-existing mobile-width (390px) layout gutter unrelated to this change — this project's own stated convention is desktop-first at 1440px, mobile as a separate later task.

- **Follow-up (same day), after `cartographic-reviewer` flagged it:** the two labels' original stroke-halo-over-SVG-`<text>` styling (`text-[2.8px]` + `paintOrder="stroke" stroke="#ffffff"`) — copied forward unchanged from the pre-existing code in the first pass above — is exactly the anti-pattern that reviewer's own rubric rejects (sub-4px viewBox-relative font size that shrinks further at the mobile single-column breakpoint, plus a halo hack instead of a real layout fix), and this file already has a clean precedent for the fix (`AnatomyZoomInset`'s solid-chip caption, logged in the 2026-09-14 digit-anatomy entry above). Converted both labels from in-SVG `<text>` to absolutely-positioned HTML chips (`bg-bg-elevated/90` pill, fixed `text-[10px]` CSS size, same `text-accent-cool`/`text-accent-hot` colors as before) — same wording, unchanged. The moving "מיקום פגיעה בפועל" chip's position is now driven by a `motion.div` animating `left`/`top` percentages derived from the same `offsetX`/`offsetY` the dot itself uses, converted from SVG-viewBox units (100×56) to container-relative `%`. Re-verified at shift 0/50/100: legible at every value, and the moving label keeps clear of the fixed compass chip even at shift=100 (the reviewer's theoretical worst case) — confirmed by direct screenshot, not just the coordinate math. `tsc --noEmit` still clean.

## 2026-09-15 — Topic-03 onboarding scene: style parity with topic-02's `OnboardingScene.tsx`

- **`HistoricalCasesPanel` initially NOT ported to topic-03** (superseded same day — see follow-up below). topic-02's `OnboardingScene.tsx` replaced its own historical-examples grid with the shared `HistoricalCasesPanel` component, but topic-03 originally kept its pre-existing `IntelCard`/`HISTORICAL` grid instead of swapping in the same panel. `HistoricalCasesPanel`'s `CASES` data shape requires `teaser`/`stat`/`why`/`mapBadge` fields that topic-03's four `HISTORICAL` entries (`headline`/`place`/`lesson`/`icon`/`accent`) don't carry, and populating them would mean writing new Hebrew copy for topic-03's own historical cases (בקעת הבכא 1973 / אפגניסטן 2008 / נורמנדי 1944 / דיאן ביאן פו 1954) — the panel's cards also expect a matching illustration/map-badge asset per case, none of which exist for these four topic-03 cases. Both were outside the original "no text/copy changes" constraint, so the swap was initially left undone.
- **Follow-up (same day): user flagged that the historical section still didn't match topic-02's design, and explicitly asked for the new copy to be written (images to be produced separately by the user).** Created `src/components/lessons/topic-03/HistoricalCasesPanel.tsx`, a topic-03-specific copy of topic-02's component (same structure/behavior — active-card grid, dot indicators, crossfading detail panel, same `paper/olive/ember/pine/tanline` tokens — no new tokens). `headline`/`place`/`lesson` for all 4 cases were moved byte-for-byte from the old `HISTORICAL` array (verified programmatically, zero diff). New fields — `teaser`, `stat`, `why`, `mapBadge` — were authored at the user's explicit request, each one derived only from that same case's own `lesson` sentence (no new facts introduced), and `mapBadge`/`why` reuse this lesson's own established vocabulary ("שטח שולט", "שטח מת") rather than inventing new terms. New asset ids/paths declared under `/assets/lessons/topic03/scene-onboarding/` (never inheriting topic-02's paths), with an `assetPrompt` generation brief per case for the user's own image production — see Asset manifest below. `OnboardingScene.tsx`'s old `HISTORICAL` array, `IntelCard` import, and the local `SoftDivider` (both definition and its one call site, now replaced by the panel's own title/subtitle) were removed as dead code once the panel took over. Verified live via Playwright at 1440px: panel renders, card-select interaction works, RTL layout correct (text right, image left), placeholders show the correct id/path/prompt for every missing asset, zero console/page errors.

  **Asset manifest** (all `EXISTS — wired: false`; placeholders show until the user produces and drops in these files):

  | Asset id | File to create | Destination folder | What it should show |
  |---|---|---|---|
  | `TOPIC03-ONB-HIST-PEAK` (+ `-PREVIEW`) | `TOPIC03-ONB-HIST-PEAK.png` / `-PREVIEW.png` | `public/assets/lessons/topic03/scene-onboarding/` | Isometric papercut map: a single peak with a commanding-position marker overlooking a valley full of tiny tank silhouettes. Full prompt in the component's `assetPrompt` field. |
  | `TOPIC03-ONB-HIST-WADI` (+ `-PREVIEW`) | `TOPIC03-ONB-HIST-WADI.png` / `-PREVIEW.png` | `public/assets/lessons/topic03/scene-onboarding/` | A narrow valley (wadi) with a small vehicle column, three fire-direction arrows converging from the ridgelines above. |
  | `TOPIC03-ONB-HIST-SADDLE` (+ `-PREVIEW`) | `TOPIC03-ONB-HIST-SADDLE.png` / `-PREVIEW.png` | `public/assets/lessons/topic03/scene-onboarding/` | Two peaks with a low saddle pass between them, a dashed route threading through it around a fortified peak. |
  | `TOPIC03-ONB-HIST-BOWL` (+ `-PREVIEW`) | `TOPIC03-ONB-HIST-BOWL.png` / `-PREVIEW.png` | `public/assets/lessons/topic03/scene-onboarding/` | A fortified position in the bottom of a bowl-shaped valley, encircled by higher ridgelines with marker dots on the high ground. |

  Each `-PREVIEW` variant is the same subject cropped/composed for the small 21:9 thumbnail in the card grid (see topic-02's own `-PREVIEW` assets for the established treatment). Background chrome (`TOPIC01-ONB-HIST-BG.png`, `TOPIC01-ONB-HIST-CARD-TEXTURE.png`) is reused from the existing shared namespace, same as topic-02 already does — no new chrome assets needed.

  **Findings:** the panel's own header title reuses the exact string that was topic-03's `SoftDivider` text ("כשלא קוראים נכון את ההר — המחיר עצום") — transported, not authored. The subtitle line ("כשגובה, שטח מת ושטח שולט קובעים מי מנצח") is new, patterned after topic-02's own subtitle structure and built only from terms already established elsewhere in this same file's `STEPS`/`TerrainStage`. No other findings — every other slot had a direct source.

## 2026-09-15 — Topic-01 MDO scene: "מה זה MDO?" explainer rebuilt as a two-panel card (reference: `design/reference/lesson-01/lesson1part4image1.png`, `/reference-to-ui-exact`)

- **Scope limited to the explainer block at the top of `#scene-mdo`** (`MDOScene.tsx`, the `<div>` right after `SceneHeader`), per explicit instruction. The interactive pentagon simulator (`SuperioritySphere`, inside `MapPaperPanel`), `RealWorldExamples`, and `ChokepointBand` further down the same file were confirmed untouched — they already had their own reference (`lesson1part4image2.png`, pre-existing in this same `design/reference/lesson-01/` folder before this task, unrelated to this pass).
- **Asset routing:** the user supplied the pentagon-diagram illustration directly (not generated by this session) and asked for both reference images to be renamed/routed. Pentagon diagram → `public/reference-assets/mdo-explainer-card/pentagon-diagram.png` (this project's own `/reference-to-ui-exact` convention, already in live use for `CoordinatesScene.tsx`'s `TERRAIN_MAP_SRC`, preferred here over the older `public/assets/lessons/topic01/scene-mdo/` convention this same file's other assets use, since this skill's own folder rule is what's actually load-bearing for this workflow). Full mockup screenshot (context/comparison only, never rendered in the app) → `design/reference/lesson-01/lesson1part4image1.png`, following this same folder's existing `lessonNpartPimageI.png` naming (topic-01's `SCENES` order confirms `mdo` is part 4: hook=1, onboarding=2, levels=3, mdo=4, asymmetric=5, recap=6).
- **Card layout:** two-panel `.surface-elevated` (existing `rounded-2xl` + `shadow-elevated` token, no new radius/shadow introduced) — text panel first in DOM (renders inline-start/visual right per this project's established RTL convention), illustration panel second (visual left), `grid sm:grid-cols-[7fr_3fr]` matching the reference's measured ≈70/30 panel-width split (pixel-scanned at `y=650` in the 1421×1107 reference: left panel 48–444px, right panel 444–1372px). Illustration rendered via the existing `IsometricAsset` component (`aspect="1/1"`, `fit="contain"` — the source PNG's real alpha-bounded content is 1106×1046 inside a 1254×1254 transparent canvas, confirmed via `sharp`, so `contain` reproduces the reference's "diagram floats on the cream panel, no visible image-box edge" look with no cropping).
- **Heading pulled out of the existing paragraph, not duplicated or rewritten:** the pre-existing `<strong className="text-fg">מה זה MDO?</strong>` lead-in was promoted to its own `<h3>` (matching this file's own `RealWorldExamples()` heading treatment, `font-display text-2xl font-bold ... sm:text-3xl`) with the same file's existing `h-1 w-10 rounded-full bg-accent` underline-bar pattern reused verbatim underneath it, mirroring the reference's short orange accent bar under "מה זה MDO?". The remaining sentence (`ראשי תיבות של Multi-Domain Operations...` through `...לא יכול לנצח היום.`) moved into a sibling `<p>`, verbatim, same characters/punctuation/order — confirmed by diffing the string content before/after this edit (only the wrapping tags changed: `<strong>` for the heading phrase became `<h3>`, the outer container went from a plain `<div className="text-sm leading-relaxed">` to `<p className="text-sm leading-relaxed text-fg-muted sm:text-base">`).
- **Two deliberate omissions vs. the reference, both user-confirmed (not silently guessed) before implementation:**
  1. The reference shows a caption "חמישה ממדים. מטרה אחת." under the pentagon illustration. This string exists nowhere in the codebase — adding it would have been new invented Hebrew copy, directly against the explicit "don't change the text on the site at all" instruction. Omitted; only the illustration renders in the left panel.
  2. The pre-existing decorative `<Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />` next to the old paragraph was removed — the reference's white card has no icon anywhere near the heading/body text. The same `spark` icon is still used elsewhere in this file (the "מה כובה" panel header a few lines down) and was **not** touched there.
- **`font-mono text-accent-cool` on the inline "Multi-Domain Operations" span deliberately kept as-is**, despite the reference rendering that term in plain (non-mono), ink-colored text: this exact class pair is an established sitewide convention for marking embedded English/technical terms, also used in `src/components/lessons/topic-06/PrinciplesScene.tsx` — changing it here alone would break that shared convention for a detail outside the requested "redesign the card's layout" scope, not a fidelity oversight.
- **Verified via headless Playwright at 1440px:** rendered card's cream/white panel split measured 30.1% (328px of 1089px total card width) against the reference's own pixel-scanned ≈29.9% — a near-exact proportional match despite the two frames having different absolute widths (this card lives inside the lesson page's existing `max-w-6xl` content column, ~1089px effective, vs. the reference mockup's own ~1324px full-bleed card — proportions were matched, not absolute px, since resizing this section's outer container was out of scope). No console errors, no layout overflow, no regression to the untouched `SuperioritySphere`/`RealWorldExamples`/`ChokepointBand` sections below it (pre-existing, unrelated `<motion.circle cx/cy>` console warnings inside `SuperioritySphere`'s spoke-pulse animation were confirmed present before this task and are not introduced by it). `tsc --noEmit` passes with no new errors.

### 2026-09-15 follow-up (same card, second `/reference-to-ui-exact` pass) — direct user feedback: "the text doesn't take up enough room, shrink the image and the card; there's a background around the image that doesn't match the image's color, drop it; change the blue text to green"

- **Root cause of the "mismatched background around the image", found by re-screenshotting and comparing, not assumed:** `IsometricAsset`'s wrapper div hard-codes `bg-bg` (`#F3E9DC`, the page-canvas cream) on its `aspect-square` box, visible through `pentagon-diagram.png`'s real alpha transparency as a faint but distinct-toned square against the card's own left-panel `bg-bg-accent` (`#F6EFE6`) — a different cream, off by one shade. Fixed by passing `bg-bg-accent` in the call's own `className`; `cn()` (tailwind-merge) resolves the conflicting `bg-*` utility class in favor of the later one, so the wrapper's fallback background now matches the panel exactly and the box disappears.
- **Illustration shrunk on direct instruction** (`max-w-[220px] sm:max-w-[260px]` → `max-w-[150px] sm:max-w-[180px]`), not a re-measurement against the reference — the reference's own 29.9% column-width proportion (already matched in the first pass) was left alone; only the image's own rendered size inside that column changed. Card height shrank as a direct consequence (nothing else was pinning it): 327px → 247px at the same 1089px card width, confirmed via before/after Playwright screenshots at 1440px.
- **"Multi-Domain Operations" color changed `text-accent-cool` (blue, `#5b9dd9`) → `text-brand-dark` (green, `#5B7C5C`)**, direct instruction — supersedes the first pass's "deliberately left unchanged, matches a sitewide blue-mono convention" note above. `text-brand-dark` is itself an established sitewide token for exactly this role (inline highlighted term/icon), already used in `topic-02`/`topic-03`/`topic-04` — not a new color, and `font-mono` was left untouched (only the color was in scope, per the instruction wording "את הכיתוב הכחול תחליף לירוק").
- Re-verified live at 1440px: no console errors beyond the same pre-existing, unrelated `SuperioritySphere` `<motion.circle cx/cy>` warnings logged in the first pass; no regression to any section below the card. `tsc --noEmit` clean.
- **Card chrome, panel content, grid ratio, and stable panel height brought in line with topic-02.** Container `max-w-6xl` → `max-w-lesson` (note: this Tailwind class is currently undefined in `tailwind.config.ts` — a pre-existing gap shared with topic-01/topic-02's own use of the same class, not introduced here; a follow-up should add `maxWidth.lesson` to the config so this actually constrains width). Accordion badge `size-9`→`size-11`, number text `text-sm`→`text-base`, check icon `16`→`18`, label `text-base md:text-lg`→`text-lg md:text-xl`, chevron `18`→`22`; removed a decorative active-bar element with no topic-02 equivalent. Step-panel content collapsed to a single heading + body (matching topic-02's own 2026-09-15 fix for the same duplicate-heading defect, logged in `design/docs/qa-checklist.md`) — this deletes the string "למה זה משנה" (a duplicate of `popupTitle`, user-approved in-session as the one exception to "no text changes"); `text-pretty` removed to match. Grid ratio `2fr_3fr` → `32fr_68fr` (verified via Playwright at 1440px: no label wraps). Panel `min-h` raised to `236px` (topic-03's own tallest panel content measures 233–236px — topic-02's `211px` doesn't fit topic-03's longer copy, so this deliberately diverges from topic-02's exact number while achieving the same goal: a constant-height card column across all 4 steps, re-verified at a constant 616px). Pre-`SoftDivider` gap increased via `pb-8` padding (not a margin, to avoid CSS margin-collapse against `SoftDivider`'s own `my-12`) to reach topic-02's ~80px rhythm — measured exactly 80px after the fix.

## 2026-09-15 — Topic-01 levels scene: click-to-reveal tab/banner selector replaced with a static table (direct user request: "לטבלה במקום 3 כרטיסיות")

- **Structural change, not a fidelity fix:** the previous `LevelTypologySelector` (3 clickable tab-cards + one crossfaded detail panel below, matching reference `lesson1part3image1new`) is gone. `LevelsTable` now renders all 3 levels at once as one shared-border table: a header row (title + the wide 2172x724/3:1 banner photo + tagline, one column per level) followed by one shared-label row per `MATRIX_ROWS` dimension (מי מחליט / זום מרחבי / אופק זמן / דוגמה מבצעית), each with one value cell per level. First pass (3 stacked `surface-elevated` cards, one per level) was rejected by the user as "still 3 cards, not a table" — the fix was one shared bordered container with `border-s` column dividers instead of 3 independently-elevated boxes.
- **Pattern reused, not invented:** this row-label + N-value-column shape is this lesson's own established table pattern — `TypologyTable`/`TypologyTableHeader` in `AsymmetricScene.tsx` (same file family) already builds it for the 4-actor comparison table. It also matches this scene's own `SceneHeader` intro copy, unchanged since before the tab-selector existed: "סרקו את המטריצה — בכל עמודה רמה אחרת, ובכל שורה ממד אחר."
- **Zero copy changed:** `LEVELS` (labels), `LEVEL_TAGLINE`, and `MATRIX_ROWS` (all 4 who/zoom/time/example values) are read verbatim from the pre-existing data, same as every prior pass on this section. Removed as dead code: `LEVEL_TAB_SUBTITLE` (was the small-card subtitle, no longer rendered) and `LEVEL_SELECTOR_HINT` ("לחצו על באנר אחר כדי לעבור לרמה הבאה" — no longer true, nothing toggles anymore).
- **RTL column order unchanged:** `LEVEL_ORDER` (`strategic, operational, tactical`) still maps first-item-rightmost, so strategic (broadest) stays the rightmost data column; the row-label column is `hidden sm:block` and sits even further right (mapped first in each row's DOM), matching `TypologyTableHeader`'s own row-label placement.
- **Verified live at 1440px** (`#scene-levels`, headless Playwright): all 3 header images render at their real 3:1 ratio inside `aspect-[3/1]` wrappers (no distortion/crop), tagline text renders under each image, and the row-label column aligns consistently between the header row and all 4 matrix rows below it. `tsc --noEmit` clean. Drag-exercise section further down `LevelsScene.tsx` untouched (out of scope, same precedent as every earlier pass on this file).

## 2026-09-15 — Topic-01 whole-lesson design-language unification (all 6 scenes + overview + shared shell/quiz)

- **Scope and method.** Every styled element of lesson 1 was audited against one written rule set (hierarchy tiers, color roles, buttons/hover, radii/shadows, width/rhythm, icon policy) sampled from the approved hook + onboarding scenes and `.claude/skills/checking-design-fidelity`. 20 audit slices, each adversarially verified by a second agent (373 findings → 368 actionable, 5 dropped), implemented as 18 isolated tasks with a per-task spec+quality review (18/18 clean), merged with zero conflicts, then a post-merge visual QA pass. Branch `design/topic-01-unify`.
- **Iron rules held and machine-checked on the merged diff:** zero Hebrew-string changes, zero image-attribute changes (`src`/`assetId`/`href`), zero `aria-*`/`alt`/`title`/`role` text changes, zero handler/state/drag/animation lines touched; 21/21 interaction smoke steps pass with no console errors; `tsc --noEmit` clean.
- **Supersedes earlier rationales in this file:** the "radius kept to this file's own small `rounded-[3px]`/`rounded-[4px]` convention" notes under *Topic-01 typology table restyle* and *Topic-01 "five tactics"* no longer apply — lesson 1 is now on the soft `.surface`/`rounded-2xl`/`rounded-xl` scale throughout. The `-mx-4 sm:-mx-6 lg:-mx-8` breakout justification under *Topic-01 levels scene* is superseded: the levels table now sits inside `max-w-lesson` like every other block. The note claiming `max-w-lesson` is undefined is wrong — it is defined in `tailwind.config.ts` (`maxWidth.lesson = 72rem`).
- **Controller rulings (full text: `design/docs/topic-01-design-rulings.md`; the rule set they apply: `design/docs/topic-01-design-language-brief.md`; every resulting change, numbered: `design/docs/topic-01-changelog.md`):**
  - Every scene root is `max-w-lesson mx-auto px-4 sm:px-6 lg:px-8` (1152px at 1440); the overview page is capped to the same width; the quiz/practice tabpanel is capped once in `LessonShell`. Measured after merge: all scene roots x=40 w=1152, no horizontal overflow at 1440.
  - Block rhythm is 48px (`mt-12`) between major blocks in every scene; SceneHeader→first block stays 32px.
  - All five SceneHeader calls pass `underline`; every T1 section title carries the `h-1 w-10 bg-accent` bar.
  - `onboarding-edit-mode.tsx` `SCENE_SCALE` 0.86 → 1. The approved onboarding scene had been rendering at 86% CSS zoom, so its text was ~16% smaller than every other scene copying its classes. Browser-verified: composition and line breaks are proportional and unchanged, sizes now match the rest of the lesson. One-constant revert if the user prefers the smaller look.
  - **Reverted 2026-09-16 per owner review (`f01eb6c`):** `SCENE_SCALE` restored to `0.86` — this is exactly the "one-constant revert if the user prefers the smaller look" contingency above, now exercised. The comment in `onboarding-edit-mode.tsx` was updated to state `0.86` as the permanent approved scale. Current value as of this date is `0.86`, not `1`; see `design/docs/topic-01-changelog.md` §2.1 and `design/docs/qa-checklist.md`'s topic-01 onboarding entry for the matching correction.
  - Exercise button pairs ("בדוק תשובות"/"איפוס") in all three exercises use `.btn-primary`/`.btn-secondary`.
  - Decorative code-drawn icons removed (`spark`, `shield`, domain glyphs as ornaments, lucide ornaments, recap blur blobs, MDO `TopoField`, overview `TopoField` + `bg-topo-fade`); functional glyphs kept (check, chevrons, arrows, grip, plus, the hook crosshair) plus the MDO on/off status dot (a state cue).
  - `HistoricalCasesPanel` key-fact line: the "עובדה מרכזית:" label stays accent, the stat sentence becomes T4 black (accent is never long text). Visible change to an approved block — flagged to the user.
  - `ReadyCallout` → `.surface-elevated` (shared by all 12 topics).
  - Onboarding viewfinder corner brackets (`CornerMark`) removed as decoration — visible change to an approved scene, single-hunk revert.
- **Kept on purpose (approved exceptions / closed):** `LessonShell` `bg-[#EBE9E4]` raw hex (matches the approved background tile; a token needs sign-off), `HistoricalCasesPanel` `md:gap-3.5` and its `paper-bright` opacity ladder, the CategoryBin scrim ink rule, `ScenarioChip` padding, `RecapBanner` accent border, pillar-card `min-h-[30rem]`, `text-brand-dark` passing score in the quiz.
- **Blast radius beyond lesson 1 (intended — these are shared components):** `HookSceneLayout` CTA (topic-01/02/03 covers, zero visual delta), `ReadyCallout` (12 topics), `RecapBanner` (12 topics), `PagedLearn` prev/next + TOC and `LessonShell` tabs/footer (12 lessons), overview page + `LessonStatsBar` (12 lessons), `Quiz` + `InteractionPlaceholder` (12 lessons). These now carry the same language on every lesson rather than lesson 1 alone.
- **Still open, deliberately not touched (iron rules):** 64 ambiguous text tiers parked for the user in `design/docs/text-hierarchy-review-topic-01.md`; framer scale-pops and non-standard easings (separate motion pass); copy issues the audit surfaced (missing spaces, drag-vs-click wording, singular/plural "לחץ"/"לחצו", CTA aria-label vs visible label, dead `step`/`eyebrow` props); the cream void beside the onboarding terrain video (any fix re-fits the user's video); dead code (`InsightCallout.tsx`, `SceneNavigation.tsx`, `CornerMark` remnants, unused data fields).

## 2026-09-16 — Topic-01 "כשהזמן משנה את מאזן הכוחות" (time-pressure map interaction, `#scene-asymmetric`) — Tasks 1–3

New component replacing the old `<TimeAsymmetry />` timeline scrubber (`src/components/lessons/topic-01/TimePressureContent.ts` + `TimePressureExperience.tsx`). This entry consolidates every "record in assumptions.md" item flagged across the plan's Tasks 1–2, plus Task 3's own audit findings — none of these required a code change during Task 3; the audit found the Task 1–2 implementation already correct and this section only documents the judgment calls, as the plan required.

- **Physical-coordinate RTL exception (map node anchors).** The 6 map node positions (`MAP_NODE_ANCHORS` in `TimePressureContent.ts`) are normalized fractions taken verbatim from `asset-manifest.json`'s `mapCoordinates.nodes`, defined as physical left-to-right/top-to-bottom coordinates, independent of reading direction. `PressureMap` renders every node's HTML label overlay with **physical inline `style={{ left: ..., top: ... }}`**, never a logical `start-`/`end-` Tailwind utility, and the SVG connector lines use the same fractions times the 1536×1024 viewBox directly. This is a deliberate, binding exception to this project's usual "logical properties only" RTL rule (`CLAUDE.md`): the node positions describe fixed locations on a raster photograph, so mirroring them under `dir="rtl"` would visually detach every label from the building/terrain feature it points at. `node scripts/qa/rtl-audit.mjs` does not flag this (it only scans Tailwind utility classes, not inline `style`), which is expected and should not be "fixed" by a future RTL pass.
- **New minimal UI-chrome strings authored (none are in `interaction-content.json` — all are interface state labels, not pedagogical content):**
  - `"טרם נפתח"` — always-visible caption under a locked round-stepper tab (not a `title` tooltip, so it doesn't depend on hover).
  - `"קווים מייצגים קשרי השפעה בין הזירות למוקד המרכזי, לא מסלולי תנועה"` — visually-hidden (`sr-only`) accessible description of the map's SVG connector lines, satisfying the spec's explicit requirement for an accessible description clarifying that the lines are influence relationships, not movement routes/operational axes.
  - `"בחרו זירה במפה לקבלת הסבר קצר"` — neutral prompt shown in the shared node-definition region before any node has been opened.
  - `"נחשף קודם"` / `"מוקד נוכחי"` — the two state chips on `previous`/`current` map nodes. Deliberately word-based, not color-only, per the spec's rule that color alone must not carry state.
  - Text choice note: the mockup's own on-image label for the current-state nodes ("לחץ נוסף" on the round-2 crop) was **not** copied — per this whole plan's binding rule and the handoff README's own warning that the mockup can contain generation-time text that isn't the source of truth (the documented example being "מצב 3 מתוך 3" vs. the correct "סבב 2 מתוך 3"). `נחשף קודם`/`מוקד נוכחי` are original, minimal UI-chrome coined for this task instead.
- **Irregular/takeaway strip aspect ratio and the arithmetic for zero side-cropping.** Both raster assets (`irregular-landscape.png`, `takeaway-landscape.png`) are 2172×724 px (native ratio 3.0:1). Both strips wrap them in a container fixed to **`aspect-[2172/300]`** (ratio ≈7.24:1), much flatter than the source, with `IsometricAsset`'s `fit="cover"`. For any `fit: cover` box the browser scales the source by `max(containerW/sourceW, containerH/sourceH)`. With container width `W`: scaling to cover width gives `scale = W / 2172`, so the rendered height becomes `724 × (W/2172) = W / 3.0`. The container's own height (from the fixed 2172/300 ratio) is `W / 7.24`. Since `W/3.0 > W/7.24` (3.0 < 7.24), the width-based scale always yields a rendered image taller than the container, so the cover algorithm always resolves via the width match with height overflowing — the only possible crop is vertical (top/bottom), never horizontal (left/right). The village — right-anchored in the irregular strip, left-anchored in the takeaway strip, per the manifest's `objectPosition` — therefore always stays fully inside frame regardless of container height. Verified both by this arithmetic and visually in Task 3's screenshots: the village silhouette is intact at the correct edge in both strips at 1440px.
- **Task 3 audit finding — mockup shows no visible line/tag for `previous`-state nodes; the written spec explicitly asks for one; the implementation follows the written spec.** In the approved mockup's round-2 crop, the previously-exposed military node has no connector line and no state tag drawn at all — visually it reads as fully neutral/absent. But `IMPLEMENTATION-SPEC.md`'s own map-drawing section is explicit that the `previous` state gets a **clearly visible** neutral line plus a "previously exposed" marker, only asking that it not visually compete with the new `current` highlight. This is exactly the "matches spec text but looks visually different from the mockup" case `CLAUDE.md` calls out for a documented judgment call rather than a silent pick: the implementation renders `previous` nodes with a clearly-visible muted line (`stroke-fg-muted`, opacity 0.85) plus the `נחשף קודם` chip — following the written behavioral spec (the actual acceptance-test source) rather than the mockup's flatter rendering. Not changed; flagged here per this project's own documented convention for this exact situation.
- **Task 3 audit method note (not a product issue): a bare `[role=tab]` / `button[aria-expanded]` DOM query is not safe on this lesson page.** While building the Task-3 Playwright audit, several checks initially failed because the query picked up *other* same-role elements elsewhere on the same rendered page — the page-shell's own tab/TOC components and other topic-01 scenes also render `role="tab"` groups and `aria-expanded` accordion buttons. Once the audit scoped every query to this component's own accessible names/labels, every check passed. Recorded here only so a future automated test against this page knows to scope queries the same way — nothing in `TimePressureExperience.tsx` itself changed because of this.
- **Task 3 audit method note: this lesson page defers non-default sub-topic scenes to client-side rendering; a static-export build check must inspect the compiled bundle/served assets, not grep the prerendered HTML.** The lesson's sub-topic navigation only server-renders the default-active sub-topic (the hook scene) into the static-export HTML shell; `#scene-asymmetric`'s content (and every other non-default sub-topic) mounts client-side once its nav item is clicked. This is a pre-existing, sitewide architecture choice, not specific to this task. Verified this task's build output is nonetheless fully correct by (1) confirming the map title string and image filename appear in the compiled route JS chunk, and (2) serving the real exported output directory over a plain local HTTP server and driving it with Playwright: clicking the asymmetric-combat nav item mounts `TimePressureExperience`, all 3 images load with HTTP 200 from the exported asset paths, a full round-1 predict→check interaction works, and there are zero console errors — the closest available approximation of an LMS/SCORM runtime for this repo.
- **Incident during Task 3, disclosed for transparency (not a source-code issue): running `npm run build` concurrently with the already-running dev server corrupted the dev server's shared `.next/` cache** (a stale webpack-runtime module reference after the build process overwrote chunks the dev server still held open) — both scripts write to the same `.next/` directory in this project, with no dev/build cache isolation. Fixed by stopping the dev server, deleting `.next/` (a regenerated build artifact, not a tracked file), and restarting `npm run dev` — confirmed working identically afterward via a fresh Playwright pass. No source file was affected. Flagged here as a reproducible gotcha for the next person who runs a build while a dev server from an earlier session is still up on this project.

## 2026-09-17 — Same interaction, owner revision pass: content restored from the pre-swap component, `PressureMap` visually reworked against the mockup

The owner reviewed the shipped Tasks 1–3 result and asked for two specific improvements, both scoped to this one component only: (1) the wording had drifted further from the pre-existing `TimeAsymmetry` copy than intended, and (2) the map read as "a photo in a card with labels," not an interactive pressure map, next to the approved mockup. Both are addressed in `TimePressureContent.ts` (content) and `TimePressureExperience.tsx`'s `PressureMap` (visual only — no state/logic change).

- **Content restored from `TimeAsymmetry`'s pre-swap copy (git commit `09fe406^`), re-worded to fit the new predict-then-check structure, not pasted verbatim.** `interaction-content.json` remains the base text; these specific fields were enriched with concrete details that existed in the old component and were dropped in the handoff rewrite, without reinstating the old component's own banned framing (see next bullet):
  - `ROUNDS[1].event` (`accumulation`): "ההוצאות גדלות, והמילואים נשארים מגויסים." → "ההוצאות מזנקות למיליארדי דולרים בשבוע, והמילואים נשארים מגויסים ונשחקים." — restores the old `TIME_STEPS`/`INTERNAL_FRONTS` treasury imagery ("מיליארדי דולרים בשבוע", "נשחקים").
  - `NODE_DEFINITIONS.public` — restores "תמונות מהזירה ולוויות חיילים" (front-line footage and soldiers' funerals) as the concrete driver of public-support erosion, verbatim from the old `INTERNAL_FRONTS` public-opinion entry, instead of the new copy's fully abstract "the public's assessment of cost and outcomes."
  - `NODE_DEFINITIONS.politics` — restores "ועדות חקירה, אופוזיציה ולחץ קואליציוני" (commissions of inquiry, opposition, coalition pressure) from the old politics-front entry, as concrete mechanisms rather than the new copy's abstract "internal political debate."
  - `NODE_DEFINITIONS.international` — restores "האו"ם, בעלות ברית... איום בסנקציות" (the UN, allies, the threat of sanctions) from the old international-front entry. Deliberately did **not** restore "האג" (the Hague) from the same original line — that names a specific international legal body/war-crimes-tribunal association, which is a more loaded and more specific claim than this illustrative scenario needs or than the other three restored mechanisms carry; left out as an editorial judgment call, not an oversight.
  - `IRREGULAR.body` — restores the old closing insight's *qualitative* core idea (a regular military typically must prevail in essentially every arena it's tested in, while an irregular actor may only need to survive and preserve capability) as a hedged, non-absolute sentence. This is a legitimate, independently well-established asymmetric-warfare concept (colloquially "the guerrilla wins if he does not lose; the conventional army loses if it does not win") — **not** the same thing as the old component's banned "5 fronts vs. 1" front-counting mechanic, which stays excluded per the original build's explicit constraint (no invented percentages/counts/probabilities, no guaranteed-outcome claims). `IRREGULAR.note` (already present: "הזמן אינו מבטיח לו ניצחון") is unchanged and still directly hedges this sentence.
  - `TAKEAWAY` was deliberately left unchanged — the restored "rules of the game" idea now lives in `IRREGULAR`, which is where it thematically belongs; `TAKEAWAY` stays the calm, already-correct final abstraction.
- **Flagged to the owner, not silently included or silently dropped: the old component's closing line "ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות."** This wasn't restored. It both (a) re-introduces a specific numeric front-count ("4 החזיתות") the original build explicitly banned, and (b) is a mono-causal historical claim that overstates a genuinely multi-causal, still-debated historical question (Tet Offensive's psychological/battlefield role in Vietnam; the Taliban's actual battlefield gains 2001–2021 are hard to square with "not because of battlefield losses"). If the owner wants a real-world anchor here, the defensible version would be hedged and multi-causal (e.g., "attributed *in part* to eroding domestic political/economic support over time, *alongside* other battlefield and strategic factors — not a single clean cause") and would still need to drop the specific front-count. Left out of the shipped copy pending an explicit decision; this bullet is that decision point, not a fix.
- **`PressureMap` visual rework — the map read as "a photo with labels," diagnosed as a legibility/composition problem, not a missing-feature problem.** Before this pass, connector lines were already drawn in code for every node at every state (`inactive`/`previous`/`current`), but the `inactive`/`previous` neutral lines (`stroke-border-strong` at 0.35 opacity, `stroke-fg-muted` at 0.85) were perceptually invisible against the photographic terrain in real screenshots at 1440px — confirmed by direct before/after comparison, not just reading the numbers. Fixed by inverting the line treatment to a white core over a dark casing (dashed for `inactive`, solid for `previous`, thick + glow for `current`), each with a small endpoint dot — traceable end-to-end over sky, rooftops, and vegetation alike. The repeated `נחשף קודם` text chip (previously shown on every `previous` node — up to 3 simultaneously by round 3) was replaced with a check-glyph inside the label pill plus `sr-only` text carrying the same words, so the state is still announced to assistive tech and still not color-only, without the repeated visual text clutter. The map card's own chrome was reduced (image now bleeds to the card's rounded edges; the title/subtitle moved to a semi-opaque overlay ribbon on the image itself instead of a separate header row; the node-definition disclosure collapsed to a slim idle footer that only grows once a node is opened). The center hub got a distinct larger two-line pill plus a physical double-ring marker at its anchor point, so it visually reads as the point everything converges on. All colors/shadows still resolve to existing tokens only (`bg/fg/border/accent/brand/status`, `.chip`, `shadow-glow`) — no new hex, no `paper/olive/ember/pine/tanline`. The pre-existing "animate once per round+submitted combination, never on revisit" memory mechanism and the physical `left`/`top` coordinate system for the 6 node anchors were both left untouched, as required.
- **Two remaining, reviewed-and-accepted deviations from the mockup, not fixed in this pass:** (1) the mockup's own `current`-state connectors are drawn as smooth curved sweeps into the hub, not straight lines; the shipped result keeps straight lines for every state (matching the mockup's own `inactive`-state lines, which *are* straight) — a visible but minor fidelity gap, left as a candidate for a future pass rather than adding new per-node curve-control-point logic in this one. (2) the `military`/`הזירה הצבאית` node sits almost directly above the hub, so its `current`-state straight connector passes visually behind that node's own pill and chip (the line reappears cleanly on both sides, so it doesn't read as broken, but it's a real cosmetic seam unique to that one node's geometry) — left as-is rather than nudging that one node's label position, since moving any label off its documented physical anchor was out of scope for a visual-only pass.

## 2026-09-17 — Topic-01 MDO scene (`#scene-mdo`): control-panel redesign + feedback/marker logic fix

`src/components/lessons/topic-01/MDOScene.tsx` — owner asked for a compact "monitoring panel" instead of
5 separately-bordered domain cards, per-domain (not generic) feedback for every count of disconnected
domains, and an investigation (not an assumed fix) of why disabling 3 domains made the field diagram read
as "completely dead."

- **Panel restructure.** `DomainRow`s no longer each carry their own `rounded-xl border ... bg-bg-elevated`
  — they're rows inside one continuous `rounded-2xl border border-border/60 bg-bg-elevated` surface,
  separated by `border-b border-border/40` (`last:border-b-0`). Every row now shows explicit `"פעיל"`/
  `"מנותק"` text in both states (previously only `"מנותק"` rendered, and only when off) plus a filled-vs-
  hollow dot shape, so state is never color-only. Added a 5-segment header strip (one small icon segment
  per domain, filled+lit when active / hollow when inactive) reading off the exact same `active` Set as the
  rows below — not a second, independently-tracked piece of state.
- **Root cause of "3 off looks dead," verified empirically (Playwright, all 32 on/off bitmask
  combinations scripted, not eyeballed) before touching any code.** The per-domain marker gate
  (`active.has(d.id)`) and per-edge gate (`active.has(idA) && active.has(idB)`) were already fully
  independent — no aggregate/numeric threshold existed anywhere. The actual cause: `EDGES` is a
  deliberately curated 7-of-10 subset (existing, intentional design — "chosen for teaching value rather
  than geometric completeness"), so several 2-domains-remaining combinations (e.g. only `air`+`sea`
  survive) have zero curated edge between them; combined with the marker ellipse being visually tiny
  (`rx=13`/`ry=9` in a 1448×1086 viewBox, a ~6.6px on-screen radius), a lone active domain with no
  surviving edge was easy to miss entirely. Fixed by making the marker itself far more prominent (halo +
  ring + tick marks + lit core, ~4× the old render size) — not by adding edges "to fill the screen" (still
  exactly 7, unchanged) and not by touching the `anchor` coordinate system.
- **`getFeedback` now renders one section per currently-inactive domain** (icon + label + that domain's
  own existing `weakness` string, reused verbatim — no paraphrasing) for every count from 1 through 5,
  instead of a single generic sentence for 2–4 missing. The all-5-off case shows both the general "כל
  הממדים כבויים" heading and all 5 domains' sections. No `line-clamp`/truncation anywhere; the panel grows
  to fit however many sections are showing.
- **Layout bug found and fixed during review, not anticipated in the original brief:** the 2-column grid
  (`grid-cols-[3fr_7fr] items-stretch`) force-stretched the shorter column's box to match the taller one's
  height without growing its actual content — in a tall multi-section feedback state (e.g. all 5 off), this
  left ~300–450px of empty beige canvas below the (aspect-locked) photo. Changed `items-stretch` →
  `items-start`; both columns now simply align to the top and end at their own natural height. Verified via
  live `getBoundingClientRect` measurement before/after (gap 418.7px → 0px) and confirmed the "השהה תנועה"
  button (already normal-flow, not `flex-1`-pinned, from this same redesign) still sits correctly under the
  photo.
- **Known minor, left as-is:** the 1-missing-domain feedback shows the domain's label twice in quick
  succession (once in the `"{label} נותק"` heading, once again as that single section's own sub-heading) —
  a small copy redundancy, not incorrect or confusing, judged not worth inventing a different heading shape
  for exactly the 1-domain case.

## 2026-09-17 — Topic-01 "9 orgs" drag exercise unified with the levels-scene drag exercise's visual language

- **Direct user request, explicitly superseding the 2026-09-07 pill-chip decision above ("Topic-01 '9 orgs' drag exercise — chips + bins restyled"):** the user asked for `#scene-asymmetric`'s "לאיזה סוג שייך כל ארגון?" classification exercise to visually match `#scene-levels`'s "תרגול גרירה" scenario-sort exercise, so the two drag exercises "speak a unified language" ("זה צריך לדבר בשפה אחידה"). The earlier reference (`lesson1part5image6.png`, an unrelated app) is no longer the binding source of truth for this component; `LevelsScene.tsx`'s own `ScenarioPool`/`ScenarioChip`/`LevelZone` are.
- **`OrgChip` changed from a `rounded-full` pill back to a rectangular `.surface` card**, matching `ScenarioChip`'s shape/border/radius/state classes verbatim (`surface` + `p-2.5`/`p-3`, `border-accent bg-accent/10 ring-2 ring-accent/40` when selected, `border-status-ok/50 bg-status-ok/10` / `border-status-danger/50 bg-status-danger/10` on graded correct/wrong, `hover:border-brand/30 hover:bg-brand/[0.03]` otherwise). The `grip` drag-handle icon and the separate filled ✓/✗ circular badge were both dropped — `ScenarioChip` signals draggability with cursor styling alone and marks only the correct case with a trailing `check` icon, relying on the border/bg tint for wrong. `org.label`/`org.subtitle` are still both rendered verbatim, stacked, since `Org` (unlike `Scenario`) has no single combined text field and no per-org icon asset exists to occupy `ScenarioChip`'s trailing-image slot — that slot is simply absent here rather than inventing a new icon asset per org.
- **Pool header row restyled to `ScenarioPool`'s exact structure:** `surface-elevated p-4` (was `p-5 sm:p-6`) wrapping a `flex items-center justify-between` row — a `text-fg` (was `text-fg-muted`) count label in the literal `"{label} · {count}"` format (was `"{label} ({count})"`), plus an inline instruction string on the same row ("גררו ארגון לאחת מ־3 הקטגוריות למטה (או בחרו ולחצו)"), mirroring `ScenarioPool`'s own "גררו משפט לאחת מ־3 הקטגוריות למטה (או בחרו ולחצו)". The flex-wrap chip layout itself (vs. `ScenarioPool`'s horizontal drag-to-pan strip) was kept as-is — that strip exists only to support `LevelsScene`'s custom pointer-based pan-vs-pick-up gesture, an interaction-model addition the user's request ("עיצוב") didn't ask for, not a visual-language gap.
- **`CategoryBin`'s empty drop-zone unified with `LevelZone`'s dashed-box language:** border/background now follow the same two-state mapping (`border-accent`/`bg-accent/20` only while actively hovered or drag-armed; `border-accent/60`/`bg-paper-card/90` idle — the old third `bg-accent/10` "selected-but-idle" state was dropped since `LevelZone` has no equivalent), and the circular `plus`-icon badge was replaced with a plain `chevrons-down` icon below the hint text — same icon, same position, same styling as `LevelZone`. Added the "הקש לשבץ כאן" tap-to-place hint text (shown when an org chip is selected and the bin is still empty) that `LevelZone` already had but this bin was missing; `CategoryBin` now computes `isEmpty`/`isWaitingForTap` the same way `LevelZone` does.

## 2026-09-17 — Warm-toned hook/background image swap (topic-02, topic-03, shared lesson background)

- **Shared background tile (`LESSON-SCENE-BG-TILE.png`) rebuilt locally, not used as generated:** the new AI-warmed source (`lesson-background-warm.png`, 768×2048) was requested with the "vertically reflected lower half" mirror construction the old 3072×8192 asset uses (`SiteBackground.tsx`'s own comment: source + flipped copy, so `bg-repeat-y` has no visible seam), but pixel-diffing rows around the vertical center showed it wasn't an exact mirror (avg diff ~1–2/255 a few rows off-center, vs. the old file's measured exact `0` at the same offsets) — style-transfer editing doesn't preserve pixel-exact symmetry. Fixed by extracting the generated image's top half (768×1024) and compositing it with its own `sharp().flip()` as the bottom half, guaranteeing byte-identical mirrored rows (re-verified: center-seam and wrap-seam row diffs both `{avg:0, max:0}` after the rebuild). Applied via a one-off Node/`sharp` script, not a new generated image.
- **Background resolution intentionally not upscaled to match the old 3072×8192 file — a real, accepted softness trade-off, not an oversight.** The new source is 768×2048 (same 3:8 ratio, 4× smaller per side, 16× fewer pixels); `SiteBackground.tsx` renders it at `bg-[length:100%_auto]` against a `fixed inset-0` (full viewport width, ~1440px), so the browser upscales ~1.9×. At native pixel inspection the paper-grain/contour linework is genuinely present and crisp (not AI-blurred); the ~1.9× CSS upscale does soften fine grain slightly versus the old file's native-resolution render, visible on close zoom of a live screenshot crop. Judged acceptable without regenerating: the design spec calls this layer "very low contrast" / "barely visible" by intent, and the task explicitly said not to artificially inflate resolution just to match the old file's dimensions.
- **Wrap-around seam (image bottom row → next `repeat-y` tile's top row) is mathematically guaranteed by the same mirror construction, but never actually reachable during normal use:** `LESSON_BG_PARALLAX_FACTOR = 1/8` means the background only scrolls at `pageScrollY / 8`; reaching the tile's own rendered height (~3840px at 1440px viewport width) would need `pageScrollY ≈ 30,720px`, far beyond any lesson page's real content height (~2000–2500px measured on topic-01/02/03). Fixed it anyway (rather than leaving it unverified) since it was in scope and the mirror rebuild makes both seams free simultaneously.
- **Hook images (`TOPIC02-HOOK-BG.png`, `TOPIC03-HOOK-BG.png`) kept their original 1672×941 resolution** (the warm re-generation didn't change dimensions), so no new upscale/sharpness trade-off was introduced there — `HookSceneLayout.tsx` renders them via `bg-cover` at a similar effective scale to before.
- **Verified live at 1440×1122** (topic-01 unchanged/reference, topic-02, topic-03): hook scene top-of-page, plus each lesson's first inner content scene reached via the hook's "לחץ כדי להתחיל" CTA, scrolled to mid- and end-of-content. Confirmed: warm tone reads consistently across all three topics, no mirrored terrain/map artwork, no layout shift, shared background shows no visible seam at any scroll position reached. Pre-existing files backed up to `output/imagegen/backups/pre-warm-2026-09-17/` (mirrors the `public/assets/lessons/...` target paths) before overwriting.

## 2026-09-17 — Shared lesson background swapped again, to the home-palette v2 source (green cast removed)

- **`LESSON-SCENE-BG-TILE.png` replaced a second time the same day**, from the warm-but-slightly-green `lesson-background-warm.png` (the entry directly above) to `lesson-background-home-palette-v2.png` — explicitly matched to the home page's own cream/tan contour-line palette, with no green tint. Only the shared tile changed; the topic-02/topic-03 hook images from the entry above were left as-is (out of scope for this pass).
- **Same seam fix applied again, for the same reason:** row-diffing `lesson-background-home-palette-v2.png` (768×2048) around its vertical center showed it isn't an exact top/bottom mirror either (avg diff ~1/255, max ~61/255 a few rows off-center) — expected, since it's a separately generated image, not a re-edit of the already-mirrored file. Rebuilt via the same one-off Node/`sharp` script (top half + `sharp().flip()` as the bottom half) before writing to the target path; re-verified center-seam and wrap-seam row diffs both `{avg:0, max:0}`, and a full row-by-row brightness scan of the final 2048-row file found no jump larger than ~1/255 anywhere (i.e. no residual banding from the source image itself either).
- **`SiteBackground.tsx` required no code change** — it already referenced `/assets/lessons/shared/scene-background/LESSON-SCENE-BG-TILE.png` (same filename convention, only the file bytes changed).
- **Verified live at 1440×1122** on topic-01/02/03: hook scene, then each lesson's first inner content scene via "לחץ כדי להתחיל", scrolled to ~50% and 100% of page height. Cream/tan tone reads consistently, text stayed legible over the background in every card/panel, no visible seam at any scroll position reached (page content height on all three topics stays well under the ~3840px-at-1440-width point where the tile would repeat).
- **Follow-up same day — source was too low-res and read visibly soft once `SiteBackground.tsx` stretched it, direct user feedback ("התמונה ממש מוגדלת ורואים שהאיכות לא משהו"):** `lesson-background-home-palette-v2.png` is 768×2048, but the fixed `bg-[length:100%_auto]` layer renders at the ~1440px viewport width (more on a 2×/3× retina screen), so the browser was upscaling the raw source ~1.9×+ at paint time — soft even though the source pixels themselves are clean at native size. Fixed by pre-upscaling the source 4× (to 3072×8192, `sharp.kernel.lanczos3`) in the same one-off script, *before* the top-half/flip mirror rebuild — matching the previously-shipped asset's own native resolution, so the browser now downscales (crisp) instead of upscales (soft) at every realistic viewport/DPR combination. Re-verified center-seam and wrap-seam row diffs both `{avg:0, max:0}` after the rebuild at the new resolution.
- **Deliberately skipped extra unsharp-mask sharpening after the upscale:** tried it (`sharpen({sigma:1.0,...})`) and it roughly doubled the PNG's compressed size (7.6MB → 9.8MB truecolor at 3072×8192) for no clearly visible gain — lanczos3 alone already preserves the thin contour-line edges well since the source content is smooth/low-frequency to begin with, not fine texture needing recovery. Shipped the unsharpened truecolor PNG (8.0MB) rather than trade meaningfully more page weight for an imperceptible difference. Also evaluated an 8-bit palette-quantized PNG (5.1MB, no visible banding on the smooth gradient in a zoomed crop) but kept full truecolor instead, since this project's color-fidelity rule (`design/docs/design-spec.md`'s pixel-sampled hex values) argues against any lossy re-quantization of a shipped visual asset without a specific need.
## 2026-09-20 — Lesson secondary nav moved from the top strip into the existing right-hand side nav

- **240px desktop side-nav width is a NEW measurement, introduced by this change and not derived from any
  mockup.** The user proposed it as a starting point and asked for it to be recorded as a design assumption
  and checked against the real screen. Verified at 1440px: the nav sits at x=1200..1440, and every
  sub-topic label in the course — the longest being `ממד אנכי ותת-קרקע` (topic-10), `טיפולוגיית גבולות`
  (topic-11) and `שכבות וסוגי נתונים` (topic-12) — renders on a single line with no clipping and no
  horizontal page scroll. Lesson titles likewise fit on one line at this width (they wrapped to two at the
  old 13vw≈187px). Labels are allowed to wrap rather than truncate, so a longer future label degrades to a
  second line instead of being cut. **Kept at 240px.**
- **Width and content offset now come from one source**, `--lesson-nav-w` / `--lesson-content-inset` in
  `globals.css`, replacing the two hand-synced `13vw` literals that previously lived in `PagedLearn.tsx`
  (`xl:ps-[calc(13vw+20px)]`) and `LessonShell.tsx` (`xl:ms-[13vw]`, whose comment still claimed `7vw`).
  Both variables are `0` below `xl` (1280px), which is what keeps the pre-existing sub-desktop layout —
  top mode strip + horizontal sub-topic pill strip — untouched without any extra media queries in the
  components.
- **Order, size and icons were revised after a first review — the mode rows now sit BELOW the table of
  contents, at the sub-topic rows' own size, with no icons.** The first pass put them directly under the
  lesson title as a larger, icon-led primary block; the user rejected that ("זה לא מספיק טוב") and asked
  for all three changes explicitly. Final column order: lesson identity → `תוכן השיעור` list → progress
  bar → rule → the three modes. Rows are `text-sm` / `px-3 py-2 rounded-md`, identical to the sub-topic
  rows, and carry no `lucide` icon (`LESSON_TABS` still exports `Icon` because the sub-desktop strip in
  `LessonShell` renders it).
- **Selection colour: sage green for the active MODE, a warm paper tint for the active SUB-TOPIC.** With
  the two lists now the same size and shape, colour is the only thing separating them, which is what the
  user asked for ("ועדיין בצבע ירוק"). The active mode is `bg-brand/10` + `text-brand-dark font-semibold`
  (green was already this shell's active-tab colour); the active sub-topic's surface changed from
  `bg-accent/15` (an orange wash, which read at the same level as a mode) to `bg-bg-accent` +
  `font-semibold`. The 3px green inline-start marker bar from the first pass was dropped — with no icons
  and matched sizes it was the one remaining ornament that made the rows read as a different tier.
  **No new colour tokens were added.** Orange stays on the lesson number, the sub-topic progress dots and
  the progress bar — i.e. only on identity/progress, per `globals.css`'s own rule.
- **Consequence, accepted by the user when asked:** because the sub-topic section is hidden on
  תרגול / בדיקת ידע, the three mode rows no longer hold a fixed y-coordinate across modes — they sit at
  y≈507 (topic-01, 6 sub-topics) or y≈544 (topic-04, 7 sub-topics) on לימוד and rise to y≈186 on the other
  two. This **supersedes the original brief's requirement 4** ("שלוש השורות נשארות באותו מקום בכל המצבים").
  The alternative — pinning the rows to the bottom of the nav column, which would have satisfied both —
  was presented side by side and explicitly declined in favour of keeping them tight under the table of
  contents.
- **The rule above the three mode rows is only drawn when the table of contents is above them.** On
  תרגול / בדיקת ידע the lesson header's own bottom rule already separates the header from the modes, so
  drawing a second one 16px below it would put two hairlines next to each other with nothing between.
- **`min-h-[calc(100dvh-var(--header-h)-5rem)]` on the hook scenes was deliberately left alone.** The
  `5rem` used to compensate for the removed top strip plus the content wrapper's padding; on desktop only
  ~3rem of that is still needed. Left as-is because the hook section is centred content over a
  `fixed inset-0` backdrop, so a slightly short section is invisible (it only removes a pre-existing ~4px
  vertical overflow), and correcting it properly would mean touching the nine older `HookScene.tsx` files
  that carry the same literal — out of scope for this pass.
- **Known pre-existing, not introduced here:** topic-08 and topic-12 hook backdrops log a framer-motion
  `offsetDistance` hydration warning from `BackdropSupplyLines` / `BackdropGrid`. Untouched by this change
  and reproducible on those scenes independently of the nav.

## 2026-09-20 — Topic-01 "כשהזמן משנה את מאזן הכוחות" rebuilt as a 5-station timeline (restores original title "למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?")

- **Replaced the 3-round predict/check + pressure-map interaction** (`TimePressureExperience.tsx`, previously implementing `design/handoff/asymmetric-time-v3/`) with a 5-station timeline (day 1 → week 2 → month 3 → year 1 → year 2), each station adding one "front" to a fixed 5-row comparison table (regular army vs. irregular player), per direct user brief. The old `PressureMap`, `LandscapeStrip` (irregular/takeaway bands), and their assets under `public/assets/lessons/topic01/scene-asymmetric/time-pressure/` are no longer referenced by this component — left on disk unused, per this project's existing precedent for superseded assets (see other entries in this file, e.g. "Pyramid + paragraph deleted, not relocated" / "`TOPIC01-ASYM-PILLAR.png` … stays on disk unused").
- **Panel-content state machine** (not fully spelled out in the brief as code, this is the implementer's documented reading of it): two state variables, `currentIndex` (time position, resets nothing else on change except `viewedFrontId`) and `viewedFrontId` (which front's detail is being "peeked" at, resets to `null` on every time-navigation). Default view (`viewedFrontId === null`) shows the current station's narrative `stationText`; clicking any reached front's name (current or previous) sets `viewedFrontId` and switches the panel to that front's `frontDetail`; only a *previous* front's detail additionally shows the "עיון בחזית: …" banner and "חזרה לחזית שנוספה" button, per the brief's explicit distinction.
- **Table cell status uses the existing `StatusChip` component** (`tone="accent"` for "נוספה", `tone="neutral"` for a previously-added front, `tone="dim"` for both "טרם נוספה" and "לא במודל" — distinguished by label text, not by a new tone), per `.agents/skills/checking-design-fidelity/SKILL.md` Table 3's "never build a pill by hand" rule.

## 2026-09-21 — Topic-01 MDO scene rebuilt ground-level, per `design/proposals/mdo-ground-level/claude-handoff.md`

- **Replaces the 2026-09-20 isometric-diorama build entirely** (`mdo-diorama-scene.png` + dim-mask "disconnected" state, curated 7-edge subset, per-domain single-card explanations) — the handoff explicitly supersedes that direction. `mdo-diorama-scene.png`, `mdo-field-domains.png`, `mdo-scene-background-{minimal-v4,vegetated-v3}.png` and `mdo-scene-background.png`/`.backup.png` are no longer referenced by `MDOScene.tsx` — left on disk unused, per this file's own established precedent for superseded assets.
- **Asset pipeline — composite-then-extract, not a direct "isolated cutout" request:** asking Higgsfield's `gpt_image_2_5` directly for "the vehicle/ship/jet/mast, isolated on transparent background, ground-level daylight lighting" reproduced the *reference photo's own dark studio vignette* almost verbatim, three prompt rewrites in a row (adding a second reference image, forbidding the vignette explicitly, naming the target lighting in detail) — the model stayed anchored to the reference's own photographic treatment regardless of instruction. What worked: asking for a *full-scene edit* — `mdo-scene-background-ground.png` (= the handoff's `03-clean-background.png`) as the primary reference, the original approved `mdo-object-*.png` product photo as the design reference, prompted to "add this object into this exact scene, matching its lighting" — which produced a properly ground-level-lit, coherent composite on the first try for all four objects. Each object layer (`mdo-{land,air,sea,cyber}-object.png`) was then produced by cropping tightly around the added object in that composite and running Higgsfield's background remover on the crop — not a pixel-diff against the clean plate (tried once, rejected: the regeneration isn't pixel-registered, so a diff against the real clean background lights up everywhere — different cloud shapes, different sea texture, different vegetation detail — not just around the added object). Confirmed via `sharp`-read alpha channel (not by eye — the Read tool's own image preview renders transparent pixels' RGB on a dark backdrop, which looks identical to an opaque black background at a glance).
- **Space domain unchanged:** `mdo-space-medallion.png` (the circular orbital-inset photo) was kept as-is — the handoff's own visual-execution section says space stays "בחלונית המחשה" (its own inset), never part of the shared terrain's perspective, so it didn't need re-lighting to the new ground-level scene the way the four terrain-anchored objects did.
- **Aircraft's contrail is redrawn as a short SVG streak, not the raster one:** the background remover stripped most of the soft/diffuse raster contrail along with the sky when isolating the jet crop (only the aircraft's own hard silhouette survived matting cleanly). Rather than fight the matting step, `MDOGroundScene` draws a short blurred `<line>` behind the aircraft layer, inside the SAME `active.has('air')` conditional — so it still disappears with the jet, satisfying the "trail unique to it disappears with it" rule.
- **Domain box/anchor coordinates are eyeballed against the rendered composite, not measured:** `DOMAIN_VISUALS[].box`/`.anchor`/`.avoidR` in `MDOScene.tsx` were picked by reading pixel positions off a local `sharp`-composited preview of the four extracted layers on the real background (not committed — a scratch verification step), then confirmed acceptable via the actual rendered page at 1440px (screenshots in `design/screenshots/mdo-ground-level/`). Named, remaining limitation: these are approximate, not pixel-measured — a future pass tightening object-to-background register would re-derive them from the live DOM (`getBoundingClientRect()`), following this same file's own precedent under "Topic-01 levels scene" for eyeballed-then-refined placement.
- **Control-strip order and the floating card's corner are the implementer's own choice, not the mockup's pixel order** — per the handoff's own explicit line, "המוקאפים אינם מקור אמת לסדר כפתורים/יישור טקסט" (mockups aren't the source of truth for control order/alignment). The mockup's bottom strip reads visually left→right as חלל/ים/יבשה/אוויר/סייבר/איפוס, which in RTL reading order would put "איפוס" (reset) *first* — backwards for a secondary/reset action. Implemented instead: the five domain toggles in the content JSON's own order (land, air, sea, space, cyber → DOM order, so `יבשה` reads first/rightmost), reset last (inline-end/left). The floating edge-explanation card is pinned to a fixed UI corner (`top-4`, `insetInlineEnd: 1rem` → physical top-left in RTL) via logical properties — unlike every domain/anchor/connection position in this file, which stays physical-`left`/`top` on purpose (see the file's own in-code comment) because the card is UI chrome, not a photo-anchored element, so it's exempt from the "never mirror the photo" rule.
- **Summary text is composed as three explicitly-labeled lines ("מה עדיין אפשר לשלב" / "קשרים שנותרו" / "מה חסר"), not as the handoff's own hand-written flowing-prose examples:** the two worked examples in `claude-handoff.md` (e.g. the 3/5 land+air+cyber paragraph) read as natural prose, but the handoff also says this is "הרכבה מנתונים קיימים ומוגדרים, לא יצירת טקסט במודל בזמן ריצה" (composition from existing, defined data — not runtime-generated text). Forcing the JSON's `contribution`/`missing` fields into grammatically-correct flowing Hebrew sentences at render time risked exactly the kind of ad-hoc text generation the handoff warns against (gendered verb conjugation per domain, etc.) — labeled sections concatenating the verbatim JSON strings were judged the safer literal reading. `composeSummary()` in `MDOScene.tsx` is a pure function of `activeIds`, not `activeIds.size`, per the handoff's explicit requirement.
- **Updated two nearby wordings that contradicted the new "no total collapse" message**, both still inside `MDOScene.tsx` (no unrelated scenes touched — `AsymmetricScene.tsx`'s "כל החוקים הישנים קורסים" and `TimePressureContent.ts`'s "קרסה ב-4 החזיתות" are about irregular-warfare doctrine and Vietnam/Afghanistan withdrawal respectively, unrelated to MDO domain disconnection, so left as-is per the explicit "don't rewrite unrelated historical examples" instruction): (1) the hero `intro` line described the *old* on-image-click interaction ("נתקו אותו ותראו איך כל הצבא שלכם מאבד כוח") — rewritten to describe the actual new interaction (toggle in the strip below the image) without the "whole army loses power" framing; (2) the closing `ChokepointBand` paragraph used the literal banned phrase "וכל הצבא קורס איתו" — rewritten to "היכולת המשולבת נחלשת" (the combined capability weakens), keeping the same weak-link pedagogical point without claiming total collapse.
- **Verified logically, not by clicking all 32 states by hand:** `composeSummary()`'s branching is by `active.size` (0/4/5 fixed strings, 1–3 composed) plus, for the n=4 case only, a lookup on the single missing domain's id — so correctness for the untested combinations follows from the same code path already exercised. Spot-verified via the live 1440px page (Playwright): 5/5, 4/5 with two different missing domains (air, land), 3/5, 2/5, 1/5 (confirms the "no connections" explicit line), 0/5, reset-from-0, edge-card open/close (mouse + keyboard Enter + Escape + focus-restore-to-opener), and auto-close-on-endpoint-off. Screenshots for all-active, each of the five single-disconnects, and all-off are in `design/screenshots/mdo-ground-level/`.

## 2026-09-21 — Topic-01 MDO scene — live background video status (not fabricated, per explicit instruction)

- **`public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.mp4` does not exist yet.** `MDOSceneBackdrop` in `MDOScene.tsx` already supports it fully (static-photo fallback via `onError`, motion-stop button, `prefers-reduced-motion` respected, pauses off-screen via the existing `IntersectionObserver`) — nothing in this codebase claims a video plays when none has been produced.
- **To produce it:** feed `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-ground.png` (the existing, already-clean background photo — no domain-tool objects baked in, those are separate composited layers) into Google Flow (or an equivalent single-reference-frame video tool) as the init/reference frame, using the prompt already written at `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.prompt.txt` (locked camera; waves/hillside-vegetation/cloud motion only; no vehicle/ship/jet/satellite/mast in frame; seamless loop; ~1536×1024 / 3:2; H.264 mp4).
- **Save the exported file to exactly:** `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.mp4`. No other filename or location — `SCENE_VIDEO_SRC` in `MDOScene.tsx` is a literal, non-configurable path.

## 2026-09-21 — Topic-01 MDO interaction upgrade — manual QA checklist (no Playwright used, per explicit instruction — verify visually)

At `http://localhost:3000/lessons/topic-01#scene-mdo`, 1440px width:

- Toggle domains through every active-count from 0 to 5 — the summary block's height and the row beneath it never move.
- Click each of the 5 objects on the image while active — 4% grow + thin white shape outline; click again to deselect. Select all 5, then deselect all.
- Select 1 object → its own contribution shows in the right column. Select 2 → the matching pair's mutual-contribution text (try a few pairs). Select 3+, including חלל+ים then חלל+ים+סייבר specifically → combined contributions + relevant connection labels, visibly different between the two.
- While 2+ are selected, their connecting line(s) read thicker/brighter than the rest.
- Turn off a domain that is currently selected via its toggle — it drops out of the selection and its highlight disappears.
- Click Reset — all domains re-activate, selection clears to the empty-state prompt, any open line-explanation card closes.
- Click several different connection lines — the existing bottom-left explanation card still opens correctly, at its existing position, and does **not** change the multi-select. No black/dark rectangle appears around a clicked line; the line itself thickens instead.
- Tab through the whole scene with the keyboard — toggle switches, the 5 new select buttons, every connection line, and Reset should all be reachable and operable with a visible focus ring, with no default black rectangle on the lines.
- Confirm the small light dot is gliding along active connection lines, and stops under OS-level "reduce motion" (or when the scene is scrolled off-screen).

Live-background-video status (separate from the above — see the entry directly above this one): not yet produced; source frame and Google-Flow prompt are ready; exact missing path is `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.mp4`.

## 2026-09-21 — Topic-01 time-pressure activity rebuilt as accordion + film, then simplified by direct request

- **Rebuilt `TimePressureExperience.tsx`** from the previous 5-station-timeline design (2026-09-20 entry above) onto the onboarding accordion's own visual/behavioral pattern (`OnboardingScene.tsx`), per `design/handoff/asymmetric-smooth-film-v3/CLAUDE-IMPLEMENTATION-FINAL.md`: an accordion of N sections (right, RTL) driving a native `<video>` (left) that plays the real transition footage between stations, instead of the old crossfaded single-panel + draggable-thumb timeline strip. Media identification, renaming and organization (4 transition clips + 5 station stills, extracted from the approved videos' own edge frames) is documented in `design/handoff/asymmetric-smooth-film-v3/MEDIA-MAP.md`.
- **`INTERACTION-ADDENDUM.md`'s boundary-question gating, the sand-timer hourglass, and the front-comparison table were implemented in full first** (four transcribed MCQ-style boundary questions gating first-time forward progress, a synced-to-video-progress SVG hourglass, the pre-existing comparison table kept per that doc's "שמור את הטבלה" instruction) — then **all three were removed again by the user's direct, explicit instruction later the same session** ("תמחק את הטבלה שיש מתחת לאינטראקציה ואת השעון חול" / "תמחק גם את השאלות"), which supersedes the design docs above wherever they conflict. This is a live-instruction override, not a misreading of the brief — anyone reading `CLAUDE-IMPLEMENTATION-FINAL.md`/`INTERACTION-ADDENDUM.md` after this date should know those two documents' question-flow and table-retention requirements no longer describe the shipped activity.
- **What survived:** the activity's title, all five stations' narrative text, `TIMELINE_NOTE`, and the three `INSIGHT_PARAGRAPHS` — none of these were named in the deletion request, and all are byte-identical to the original brief's copy throughout every revision. The "X חזיתות פעילות" summary chips row also survived (not literally "the table," and still meaningful on its own next to the accordion's own front labels).
- **What did not survive, and is not wired to anything:** `SandTimer.tsx` was deleted outright (no other consumer). `TRANSITION_QUESTIONS`/`QUESTION_HEADING`/`QUESTION_INSTRUCTION` and the table-only exports (`SOURCE_QUESTION`, `TABLE_HEADER`, `NOT_IN_MODEL_LABEL`, `NOT_YET_ADDED_LABEL`, `JUST_ADDED_LABEL`, `UI.viewingPrevious`, `UI.backToAdded`) were removed from `TimePressureContent.ts`. `Station.frontDetail` is now genuinely unused data (its only renderer was the deleted table's "peek" mechanic) — left in place rather than deleted, since the deletion request named UI features, not content fields; a future task could either restore its display somewhere or remove the field itself, but neither was requested.
- **Simplified navigation model, replacing the removed gating:** free navigation in both directions (click any accordion header, jump there immediately, matching `OnboardingScene.tsx`'s own accordion exactly) — only advancing to the *immediately next* station in sequence plays the real transition video; every other request (reviewing an earlier station, or skipping ahead by more than one) is a direct cut to that station's still image, no video, no gate, no forced order. This is a simpler behavior than either the original `INTERACTION-ADDENDUM.md` spec (sequential+gated) or the plan's mid-point state machine (ungated but with a "resolve to the next unvisited boundary" indirection that an independent review had just flagged a real desync bug in) — the desync bug's entire code path no longer exists in the simplified version.
- **No Playwright/browser-automation was used for this rebuild's later verification passes**, per direct user instruction mid-session (see `feedback-no-playwright-verification.md` in Claude's memory) — verification relies on `npx tsc --noEmit` / `npm run build` plus manual checks the user runs themselves.

## 2026-09-23 — Topics 4–12 hook-scene hero images, ported to the shared `HookSceneLayout` (topics 1–3's pattern)

- **Scope:** wired the pre-generated `output/imagegen/lesson-heroes-2026-09-23/topic-{04..12}-hero.png` backgrounds into each topic's `HookScene.tsx`, copying every one to `public/assets/lessons/topic{NN}/scene-hook/TOPIC{NN}-HOOK-BG.png` (matching topic01–03's existing convention) and replacing each topic's own bespoke inline-SVG backdrop with the shared `HookSceneLayout` component topics 1–3 already use. All existing title/body copy was carried over verbatim (diffed against the pre-edit files to confirm zero wording drift); only the button's existing `learn:next` dispatch behavior and copy were kept as-is.
- **Title accent-span class normalized to the already-established sibling convention, not a content change:** every `<span className="text-accent">…</span>` (the old bespoke-backdrop theme's accent token) became `<span className="text-ember">…</span>`, matching exactly how topics 1–3's own `HookScene.tsx` already mark the same accent role after their earlier migration to `HookSceneLayout`. Topic-06's title span additionally dropped a now-nonexistent `gradient-text` class for the same reason (not part of the `HookSceneLayout`/`ember` design language). Topic-11's body `<strong className="text-fg">…</strong>` had `text-fg` dropped (that class encoded the old theme's plain foreground color, not an accent) — the `<strong>` semantic emphasis itself was kept.
- **Real legibility bug found via the required 1440px render-and-compare pass, not a pre-emptive guess:** at this project's 1440×1122 target, `HookBackdrop` renders as a `position:fixed inset:0` full-viewport `bg-cover` image anchored `left center` — this crops a visibly *taller* slice than the hero assets' own 16:9 frame (cover-scale ≈1.19× at this viewport vs. the asset's native aspect), pushing each asset's "busy" left portion further across the screen than in the artist's own 16:9 preview. Topics 1–3's assets (and the new topics 06/07/12 heroes) happen to have their busy→calm transition early enough (≲35–38% of the asset's own width) to survive this crop with the fixed text column still landing on calm paper. Topics 04/05/08/09/10/11's heroes have that transition later (≈44–56%), which put real scene detail (crop rows, foliage, a ship hull, building rooftops, a border fence) directly behind the paragraph text, confirmed by cropped screenshots before any fix.
- **Fix: added an optional `bgPositionX` prop to `HookSceneLayout`/`HookBackdrop`** (defaults to `'left'`, so topics 1–3 and the unaffected new topics render pixel-identical to before — verified by direct screenshot comparison), then tuned a per-topic horizontal crop position empirically against 1440×1122 screenshots until the fixed text column cleared the busy scene content: topic-04 `50%`, topic-05 `40%`, topic-08 `35%`, topic-09 `35%`, topic-10 `70%`, topic-11 `40%`. This is the crop-adjustment the asset package's own `README.md` anticipates ("התאימו את החיתוך למיקום הטקסט בעת שילוב ברקע"/"adapt the crop to the text position when integrating into the background") — no image was regenerated, flipped, or stretched; only the CSS `background-position` used to display the existing PNG changed. Topic-10 needed the largest shift (its skyline's busy silhouette extends furthest right in-frame); all six were re-verified against the same criterion (title + full body paragraph resting on calm paper, illustration's main subject not cropped/cut off) before being applied to source.
- **Not touched:** topics 06, 07, 12 (already legible at the default `left` position — verified, not assumed) and topics 01–03 (untouched files, `bgPositionX` omitted so behavior is unchanged).

## 2026-09-23 — Topic-04 cover scene, "3 terrain shapes" section redesigned (reference: `design/mockups/topic-04-cover-terrain-atlas-v2.png`)

- **Scope limited to the `TERRAIN_FEATURES` block in `CoverScene.tsx`** (the "3 צורות שטח שמשנות את חוקי המשחק" section), per explicit instruction — the drag-and-drop cover/concealment exercise above it and everything else in the scene are untouched. Zero copy changed: every string in `TERRAIN_FEATURES` renders verbatim; only `tf.feature` moved from being the first `InsightCard`'s `title` prop to a standalone row heading (same string, new location, not a wording change).
- **Decorative mockup-only additions intentionally NOT reproduced**, per the explicit instruction "בלי הכיתובים הדקורטיביים שנוספו במוקאפ": the rotated sidebar tag ("שטח / בנה / יתרון"), the small kicker line ("שטח · הבנה · יתרון"), and the bottom footer caption ("הבנת השטח מובילה להחלטות טובות יותר") are all mockup-only invented copy with no backing field in `TERRAIN_FEATURES` — omitted entirely rather than inventing new Hebrew text.
- **Orange dashed connecting route + waypoint dots (mockup) also omitted** — it's a decorative graphic, not text, but its exact path is drawn against the *mockup's own* mountain artwork. The handoff doc for these assets explicitly says the generated PNGs are "reconstructed from the approved mockup without baked-in text… not pixel-identical crops," so there's no reliable peak/ridge coordinate to anchor waypoint dots to on the actual rendered assets. Reproducing it would mean inventing arbitrary anchor points, so it was left out rather than guessed.
- **01/02/03 kept, but as a plain bold numeral (not a colored badge chip):** re-examined the mockup closely — the numbers render as large bold ink-colored numerals inline with each feature title, not pill/chip badges. Implemented as `aria-hidden` numerals (`text-fg/70`) beside each `<h3>` — ordinal/structural list numbering, not narrative caption text, so it doesn't conflict with the "no decorative captions" instruction.
- **Layout: one `IsometricAsset` illustration per feature as a header-row thumbnail, not a full alternating hero layout.** The mockup's asymmetric full-bleed illustration-behind-text composition depends on exact mountain-silhouette positions in its own artwork; since the actual `chokepoint.png`/`summit.png`/`enclosed-valley.png` assets are regenerated illustrations with different exact silhouettes (per their own generation-prompts doc), a pixel-matched overlay layout isn't achievable. Instead each feature got a card with a header row (numeral + title + a `fit="contain"` illustration thumbnail, native aspect ratio preserved via `[aspect-ratio:auto]`, same technique used throughout this codebase for non-preset aspect ratios) above the existing unchanged 3-`InsightCard` grid (what / defender's edge / attacker's nightmare). This keeps the mockup's core idea — a distinct, identifiable illustration + numbered heading per terrain type — while staying inside the site's own card/token language (`bg-bg-elevated`, `shadow-elevated`, `topo-bg`, existing `InsightCard` tones) per "site palette" instruction.
- **`mountain-footer.png`** used as a very low-opacity (`opacity-[0.14]`), `aria-hidden`, `pointer-events-none` full-width strip behind the 3 feature cards (visible only in the `space-y-4` gaps between cards), echoing the mockup's continuous background terrain motif without claiming pixel alignment to any specific card.
- **Thumbnail images use `alt=""`** (decorative): each illustration is a visual echo of text that's already fully described in the adjacent `InsightCard` ("איך השטח נראה?" panel), so it's marked decorative for screen readers rather than duplicating content via alt text.
- Verification: rendered at 1440px via Playwright and compared against the mockup crop; see conversation/PR for the before/after screenshots.

## 2026-09-23 (later same day) — Topic-04 "3 terrain shapes" section rebuilt for maximum fidelity (reference: `design/mockups/topic-04-cover-terrain-atlas-v2.png`, `anthropic-skills:mockup-to-code`)

- **Supersedes the earlier same-day "3 terrain shapes" entry above.** That pass deliberately diverged from the mockup (card chrome, small thumbnails, no connector line, uniform layout per row) given an explicit no-decorative-captions instruction. This pass is a direct follow-up explicitly asking for maximum compositional fidelity instead, with only the bottom `mountain-footer.png` panorama excluded. Both entries are kept for history; this one describes the current code.
- **Measurement method:** no Python/PIL/sharp available in this environment. Built a throwaway Playwright script (`grid-mockup.mjs`, scratchpad-only, not committed) that renders the mockup PNG as a `data:` URI in an HTML page with a red/blue 50px coordinate-grid SVG overlay, screenshots it at native 1190x1322 resolution in 3 overlapping horizontal bands, and reads pixel coordinates off the gridded crops visually. All positions below are `(x/1190, y/1322)` percentages of that frame, not literal px, per the explicit instruction not to treat mockup pixels as CSS px.
- **Card chrome removed entirely**, per explicit instruction: no more `bg-bg-elevated`/`border`/`shadow-elevated` per-row cards. The whole block is one continuous relative container sitting directly on the page's existing cream background, with only a `topo-bg opacity-[0.12]` texture layer, reusing the sitewide "topographic feel" utility (`globals.css` `.topo-bg`, already used this way in `PrinciplesScene`/`CombatNavScene`/`MapPaperPanel`/`CoordinatesScene`) rather than hand-drawing the mockup's own organic contour-line artwork, which no equivalent asset exists for in this codebase.
- **Illustrations sized to their own real aspect ratio, not a fixed box:** each `TerrainFeatureRow` illustration column is `style={{ aspectRatio: asset.ratio }}` (real pixel ratio: chokepoint 1020:1541, summit 1774:887, valley 1536:1024) at a measured `widthPct` of the row (roughly 38-46%, from the mockup's illustration bounding boxes), so the art reads as a large, non-cropped, non-letterboxed compositional element instead of a thumbnail. The earlier same-day pass's fixed-height thumbnails are gone.
- **Alternating composition reproduced via DOM order, not CSS `order`/absolute positioning:** each row's illustration and text block are plain flex siblings; which one comes first in the (RTL) DOM decides which side it renders on, per this codebase's established RTL convention (no `order-*` needed). Row 1 (chokepoint) and row 3 (valley): DOM `[text, illustration]`, illustration lands at the physical left. Row 2 (summit): DOM `[illustration, text]`, illustration at the physical right. Matches the mockup's measured composition.
- **Number-vs-title sub-order also flips per row, discovered by close re-inspection of the mockup, not assumed:** the mockup always places the "0N" numeral at the OUTER edge of the text block (farthest from that row's illustration) and the feature title at the INNER edge (nearest the illustration). For row 1/3 (text at physical-right) that puts the numeral rightmost, DOM `[number, title]`. For row 2 (text at physical-left) the numeral must be LEFTMOST instead, DOM `[title, number]`. Implemented via `asset.side === 'end' ? [numberEl, titleEl] : [titleEl, numberEl]`. Verified against the live DOM's actual `getBoundingClientRect()`, not just by eye — a raster screenshot of two adjacent RTL text blocks is easy to misjudge by eye, confirmed by catching my own misreading mid-task and re-checking programmatically before trusting it.
- **Per-column label color scheme changed from "colored label text" to "dark label text + colored accent stroke only," per explicit instruction.** Built a new local `TerrainColumn` component (not `InsightCard`, which couples label color to its `tone` and is shared by other lessons) with a short colored dash (`bg-accent`/`bg-status-ok`/`bg-status-warn`, matching the mockup's per-column dash color: orange for "how it looks," green for "defender's edge," gold for "attacker's nightmare") plus a uniform dark (`text-fg`) label — the label text itself is no longer tinted per tone. Thin `md:border-e md:border-border/70` dividers reproduce the mockup's vertical column separators.
- **Waypoint connector (dashed orange line + dots) is now implemented** — the earlier same-day entry explicitly omitted this because the illustrations aren't pixel-identical crops of the mockup's own continuous painted terrain. This pass reproduces it anyway per explicit instruction, accepting that exact silhouette-anchoring isn't achievable: the connector is a single decorative SVG (`viewBox="0 0 1190 1322" preserveAspectRatio="none"`) that stretches non-uniformly to fill the block's real (content-driven, taller-than-mockup) height, using the same measured percentage coordinates as everything else. A deliberate technique split: the connecting line is one stretched SVG `<path>` (distortion is invisible on a thin curve), but the 4 waypoint dots are separate absolutely-positioned `<span>` circles (`top-[Y%]`, `insetInlineEnd: X%`) rather than SVG `<circle>` elements, because a `preserveAspectRatio="none"` stretch scales X and Y independently, which would turn true circles into visibly squashed ellipses. Both the path and the dots use the same underlying `(x/1190, y/1322)` percentages, so they stay aligned despite the different rendering mechanism.
- **`insetInlineEnd` (not `right`) used for the dots' horizontal position, reasoned explicitly, not copy-pasted from elsewhere:** the mockup's x-coordinates are physical (measured from its own left edge) and the intended visual position must not flip between LTR/RTL (project rule: never mirror illustrations/diagrams for RTL), but the project also bans literal `left-`/`right-` utilities. Since this page is always `dir="rtl"` (never also served LTR), `inset-inline-end` always resolves to "distance from the physical left edge" here, consistently, so it's the correct logical-property spelling of a fixed physical-left-anchored position, not a mirroring bug. `top-[Y%]` is used unchanged for the vertical axis (direction-agnostic).
- **Row heights are content-driven (auto), not matched to the mockup's own tighter proportions** — explicitly expected and allowed by the task's own instruction not to shrink text to compress content. The real `TERRAIN_FEATURES` copy is substantially longer than the mockup's placeholder-length text, so each row (and the connector's overall vertical span) renders taller than the mockup's own measured proportions. The connector's uniform vertical stretch is a reasonable approximation given this, not a pixel-exact anchor to each row's number position — verified by eye per-row after implementation and nudged (bezier control points only, not the measured waypoint coordinates) until visually smooth.
- **Main heading given an explicit `<br />` between "שטח" and "שמשנות," at the `md` breakpoint only:** natural greedy word-wrap at any tested container width either produced 3 lines or wrapped after "שמשנות" instead of before it — no width reproduced the mockup's exact "3 צורות שטח" / "שמשנות את חוקי המשחק" split via natural wrapping alone. The underlying string is unchanged (still one literal string in the JSX, no wording added/removed/reordered); only a presentational line break was added, matching this file's own established precedent that wrapping/line-break choices are presentational, not textual, changes. Mobile (`hidden md:block` on the `<br />`) keeps natural wrapping since only the 1440px desktop target was in scope this pass.
- **`mountain-footer.png` fully removed** (constant, import-adjacent usage, and the low-opacity bottom strip from the earlier same-day pass), the one explicit exception in this task's own instructions. `enclosed-valley.png` (the row-3 illustration) is unaffected and unrelated to that file.
- **Dev-server note, unrelated to this component:** mid-task, the shared Next.js dev server (already running on another port before this session started one of its own) hit a webpack module-loading error on `/lessons/[topicId]`, a transient HMR corruption, most likely from two concurrent `next dev` processes sharing the same `.next/` build directory in this repo. Fixed by killing this session's own dev-server PID (found via `netstat`, not a broad node-process kill, to avoid touching the other already-running server) and restarting `npm run dev` fresh. Not a code defect in `CoverScene.tsx`.
- Verified at 1440x1122 via Playwright (forced-scroll-through to defeat lazy-loading before the full-page screenshot, since an earlier capture attempt caught rows 2-3 mid-lazy-load and looked broken): `tsc --noEmit` clean, no horizontal overflow (`scrollWidth === clientWidth === 1440`), no console errors other than a pre-existing unrelated `icon.svg` 404 dev-server artifact.

## 2026-09-27 — Topic-02 contours scene (`#scene-contours`): Blender mountain "layer cake" + real 2D contour map

- **One mountain, built once, drives both views.** `scripts/blender/build_contour_mountain.py` (headless, same pattern as `build_vehicle.py`) sculpts the mountain from a height function, cuts it into 5 slices with exact booleans at 10/20/30/40/50 m, and extracts the contour lines from *the same triangles*. It writes the GLB (`public/assets/lessons/topic02/contour-mountain/`), a hillshade PNG, and the generated `contourMountain.data.ts`. The 2D map and the 3D lines both read that data file, so the two views cannot drift. Re-run the script after any shape change; never hand-edit the data file.
- **Shape is invented, chosen to teach:** a summit of ≈59 m (the spot height shown) with a steep WNW face and a long gentle ESE spur, so the same 40 m of climb spans ~24 m on the steep side vs ~96 m on the gentle side, a ~4× contour-density contrast. A spur (contours bulge downhill) and a gully (contours kink uphill) keep the lines from looking like ellipses. Heights of 10–50 m are kept from the previous version so the existing copy ("כל 10 מטרים", the glossary) stays true.
- **Vertical exaggeration ×1.4 in 3D** (1 unit = 50 m horizontally). Without it a 59 m hill on a 220 m base reads as a low bump, not a mountain. The map hillshade uses its own z-factor (1.8) for the same reason. Neither changes any labelled height.
- **Colours:** the map uses a hypsometric ramp (lowland greens → rock tans → pale summit) drawn from the illustration palette (design-spec §8) and terrain tokens, in `contourMountainStyle.ts`. No Tailwind tokens were added. *(Revised later the same day, see the next bullet: the 3D mountain no longer uses these bands.)*
- **Realism pass (same day, on request "very realistic"):** the 3D mountain is now textured, not band-coloured. Everything is procedural in the same script, with no external assets:
  - **Shape detail:** erosion ravines radiating from the summit, irregular limestone strata/ledges and crags on the steep face, domain-warped undulation.
  - **Textures:** a 2048² albedo baked from height, slope and aspect (olive grass, drier south faces, a scrub/maquis mosaic, limestone outcrops, scree, a foot trail up the spur, cavity darkening), plus a 1024² detail normal map. Both are embedded in the GLB as JPEG.
  - **Trees:** ~750 low-poly trees, each baked into the slice it stands on, so it lifts with that slice. No trees sit within 1.6 m above a contour level, so none poke out under a lifted slice.
  - **Cost:** the GLB grew to ~3.7 MB, ~100k triangles.
  - **Map:** stays cartographic (bands + hillshade). Its relief and contours pick up the new detail automatically. The mountain's form (steep WNW face, gentle ESE spur, 10 m contours, peak ≈59 m) is unchanged, so the copy stays true.
- **Draggable layers (sliced view):** a slice can be dragged up or down. The gap under it opens or closes, and every slice above rides along, like lifting a cake layer.
  - **Limits:** 1.1 units per gap, 2.4 units for all gaps together.
  - **Camera:** rises and pulls back with the stack, so the summit stays in frame. The learner's rotation angle is kept.
  - **Reset:** "סדר מחדש" appears once the stack has been changed; re-entering the view also resets it.
  - **Orbit:** layer drags never rotate the view; dragging the background or base still does.
- **Map light from the NW (cartographic convention); 3D key light from the front-left of the default camera.** The 3D view is seen from the SSE, and an NW key light left every visible face in shadow. The two views are deliberately lit differently.
- **Labels are white plates, not halos** (cartographic-reviewer rule). The olive bands fail ink-text contrast (~2.3:1), so contour numbers sit on the same white chip the 3D labels use.
- **Wheel-zoom removed from the 3D view** (it was on before). On a long scrolling lesson it hijacks page scroll. Drag-to-rotate stays, the three-step control sets the framing, and the hint copy changed accordingly. Auto-rotate was also dropped: motion is now driven by the learner's own clicks, and the height labels stay readable. *(Superseded 2026-09-28, see "Game-quality pass" below: wheel zoom is back on explicit request.)*
- **drei `<Html>` under RTL:** its absolutely-positioned inner box has no inline offset, so under `dir="rtl"` labels drift a full label-width sideways. `ContourCake3D` pins it with `style={{ left: 0 }}`, a screen-space anchor and not content alignment. The previous version of this diagram had the same latent offset.

## 2026-09-27 — MVP upgrade of lesson 2 & 6 interactions without a dedicated screen (copy unchanged)

Scope: every public sub-topic of topic-02 and topic-06 that has no reference screen in `design/reference/` (scale and coordinates do, and were not touched; hook/onboarding/recap were not touched). Zero copy changes — every Hebrew string of the pre-change files was verified verbatim by script. Illustration labels reuse only terms that already appear in the same scene, numbers or A/B letters. New illustration files sit beside each scene (`*Visuals.tsx`, `*Map.tsx`, `*Terrain.tsx`).

- **Shared across scenes:** controls `rounded-xl`, cards `rounded-2xl`, pills `rounded-full` (legacy `rounded-[3px]`/`[4px]` removed in the touched files). Decorative orange headings/eyebrows/icons were moved to ink/brand green; orange stays on active/selected/route/focus only. Correct-answer feedback uses brand greens instead of the neon `status-ok`. Active list items: orange in geology/land-cover/contours tabs, brand-dark green in the landforms/combat-nav accordions (unify later if wanted).
- **Relief & cover (`ReliefCoverTerrain.tsx`):** a small car was added on the road only so a side-view road reads as a road. In-illustration tags: "הקרקע החשופה" (cover layer off) and "שכבת תכסית". Relief labels sit inside the ground body to avoid colliding with cover objects. Clicking a selected feature again, or the sky, deselects (new behaviour).
- **SortQuiz (shared by relief-cover and land-cover):** answered buttons use `aria-disabled` (keeps keyboard focus); the header restart button hides once all items are answered because the completion banner carries the same button.
- **Landforms (`LandformsVisuals.tsx`):** diorama and contour map are generated from one height model; the diorama uses a ~32° turned view, so it's linked to the map by matching orange key-feature marks rather than x-alignment. Elevations (10 m interval, index contour 150) are illustrative.
- **Geology (`GeologyVisuals.tsx`):** schematic, not to scale; granite drawn as a body cooled at depth, basalt as cooled lava. Magma/lava/heat use illustrative warm reds (#E0662E / #C8452B), distinct from the UI orange. The metamorphic before→after sequence reads right-to-left (composed, not mirrored). Future rock-photo slots (`design/docs/topic03-rock-images.md`) are not implemented; the specimen corner card is where they'd go.
- **Land cover (`LandCoverMap.tsx`, `LandCoverVisuals.tsx`):** חורש stays green in summer (evergreen maquis, duller); terraces/fields follow the season; village roofs are light concrete so nothing reads as the orange accent. The height ladder is schematic — only the order and the three labelled thresholds carry meaning. Only the active category's map regions are keyboard-tabbable (tabs + chips are the full keyboard path).
- **Contours density section (`ContoursDensitySection.tsx`, `ContoursShapeMap.tsx`):** the three hills share a 10 m interval (heights 45/86/86 m) so line density is comparable; the cliff is a gentle slope toward A and a wall toward B, with ticks on the lowest merged line. Profile axis 0–90 m with vertical exaggeration. The GLBs in `scene-terrain-density/` are still unused. The top 3D/map section of this scene belongs to the concurrent contour-mountain work (see entry above) and was not changed by this pass.
- **Topography:** the carousel got a tab row reusing the existing view titles (numbered 01–03); the dots are mouse-only because the tabs are the accessible control.
- **Principles:** the azimuth slider runs left→right (0° at left) as an unrolled compass scale, not mirrored for RTL. Grid north drawn at 22° (was 14°) to make room for labels — angles illustrative. The +180° arc appears ~0.55 s after the needle settles to avoid flicker. The GPS-denied illustration flows right→left (cause → fallback). The `lesson-03-north-*.png` / `three-norths-map-bg.webp` assets referenced in code do not exist; SVG glyphs are used.
- **Planning (`PlanningRouteMap.tsx`):** legs 2–5 are drawn to true bearing/distance from the card text (23.5 m per SVG unit, north up); card 1's 070°/400 מ׳ is drawn as a departure arrow from נ.ה because card 2 already defines leg 1→2 as 035°/500 מ׳ (content conflict flagged to the owner). The footprint gauge under the pace slider grows toward inline-end (a UI gauge, not a map).
- **Combat nav (`CombatNavVisuals.tsx`):** each technique demo plays once on selection with a replay button (no endless loop). The friendly force is a blue puck in all three diagrams. In technique 2 the compass needle points north with the index/arc set to 62° (the old drawing pointed the needle along the bearing). The sticky board is capped at viewport−7rem; at 700 px viewport height the smallest label drops to ~11 px.

## 2026-09-27 — Contour-density realism (topic-02)

- Scope: only the three-state density illustration and its selector thumbnails. All lesson text, tab state/handlers, keyboard navigation, layout, model geometry, A–B crossings and profile animation remain unchanged. The preceding 3D mountain section is outside this change.
- Reference: topic-01 `TOPIC01-LEVELS-DIORAMA.png` for natural material detail and subdued olive/limestone tones; `mdo-scene-background-ground.png` for photographic texture. Existing semantic UI palette and surfaces are retained; no color token was added.
- Generated assets: `public/assets/lessons/topic02/contour-density/{gentle,steep,cliff}.webp` (1152 × 684), plus `limestone-section.webp` (1152 × 384). The terrain plates were generated from overhead relief guides sampled directly from the existing MODELS functions. The brief required fixed framing, summit and footprint, sparse dry scrub/limestone, and no baked-in text, contour lines or labels.
- Visual assumption: these generated plates are illustrative terrain/material, not surveyed imagery or a new elevation model. Exact contours, labels, construction lines and heights continue to come from the original mathematical model. The rock image is clipped to the animated original profile. An existing paper-color wash and olive line ink keep contours readable above the photographic detail.
- All three terrain images remain mounted and crossfade with the existing reduced-motion-aware transition, avoiding blank frames when switching quickly. Assets are local WebP files and honor NEXT_PUBLIC_BASE_PATH for static/SCORM export.
- Desktop review target: 1440 × 1122. Before/after evidence is in the ignored `qa-output/density-polish/` directory.

## 2026-09-27 — Density revision: physical Blender miniatures

- Supersedes the preceding background-image treatment after feedback that SVG lines on photographs still looked like an MVP. The panel now uses actual Cycles-rendered relief meshes and extruded geological sections with photo materials, fine scrub and physical soil edges. There are no contour paths drawn over background photographs.
- Exact 10 m curves are built into each Blender scene, follow its surface, receive lighting and become occluded behind the terrain. Sharp number/A–B labels remain a separate presentation layer, anchored using the Blender camera projection.
- The geometric source moved to `contourDensityGeometry.ts`. Natural radial erosion was added to the shapes; both mesh and contour/section calculations use this single source. The heights (45 / 86 / 86 m), contour interval and density ordering remain. Geometry is deliberately illustrative and uses the existing horizontal/vertical display scales.
- The existing two-column layout, text, tab selection and RTL keyboard behavior are preserved. Selection now crossfades complete rendered states instead of morphing flat SVG contour paths. Reduced-motion users get an immediate state change. This is a pre-rendered Blender presentation, not a new orbit/drag interaction.
- Three editable source scenes and regeneration instructions are under `design/blender/terrain-density/polished-v2/`. Six local WebP renders honor the existing base path; unrelated lesson sections are unchanged.

## 2026-09-27 — density map and isolated side view

Following the user's revision, the upper density illustration is a flat topographic map with brown 10 m contours, a heavier 50 m index, subtle grid and the existing A–B line. It uses the same exact height model as the rendered mountain. The lower view is now the complete mountain seen from a low side angle, cropped to its natural footprint: no surrounding grass tile or geological slab. Mountain surface materials retain the established realistic treatment. Camera scale is shared by all three states; west/east orientation is preserved. No lesson wording, selection behavior, layout or color tokens change.

Previous editable dioramas are preserved unchanged in `design/blender/terrain-density/archive-polished-v2/`; the same folder depth preserves relative texture paths. New side-view sources live in `design/blender/terrain-density/isolated-sides/`. Interpreted “what is above” as the upper plate of the density example, leaving the separate earlier contour simulator untouched.

## 2026-09-27 — readable contour density and realistic side illustrations

User feedback identified cluttered star-shaped contours and an artificial side view. Replaced the high-frequency angular wobble with slight broad asymmetry and a rounded slope profile. All three examples retain the same elevation interval, shared world scale and west/east orientation. Exact contour/height/density checks pass with the revised model.

Side illustrations now use a generated realistic appearance guided by the updated Blender silhouettes: fine limestone outcrops, olive scrub and directional lighting, without a surrounding terrain tile. PNG sources are preserved in `design/blender/terrain-density/isolated-sides/appearance/`; optimized `*-natural.webp` images are the live assets. The broad landform follows the model; surface details are illustrative, not exact surveyed geometry. Existing archived Blender dioramas remain untouched. No instructional copy, tabs, interaction handlers, layout or color tokens change.

## 2026-09-28 — Topic-02 contour mountain: game-quality pass ("4K, like GTA"), wheel zoom

Requested: a much more realistic, game-like mountain, and wheel zoom. The owner chose "maximum" quality (~25–30 MB budget) and direct wheel zoom.

- **Terrain rendering is now a game-style splat shader** (`contourMountainMaterials.ts`), not one baked texture.
  - **Layers:** four tiling CC0 photo materials from Poly Haven (https://polyhaven.com, CC0, no attribution required): grass `aerial_grass_rock`, dry ground `dry_ground_rocks`, rock `cliff_side` (desaturated to grey limestone), woodland floor `forest_leaves_02`. Each is 2K, re-encoded to JPEG.
  - **Blending:** layers are blended per pixel by a baked splat map, height-blended for natural ragged edges, and sampled triplanar in object space (steep faces don't stretch; textures stay glued to a lifted slice).
  - **Why "4K":** the detail comes from textures repeating every 4–10 m, which is far denser than any single 4K image stretched over 220 m.
- **Lighting:**
  - **Image-based lighting:** CC0 HDRI `drakensberg_solitary_mountain_puresky` (1K).
  - **Sun:** 4096² PCF shadows.
  - **Post:** N8AO ambient occlusion, ACES filmic tone mapping.
  - **Background:** the canvas is transparent so the card's white is not tone-mapped grey.
- **Geometry (Blender script):**
  - **Terrain:** a 320² grid (~0.69 m cells).
  - **Trees:** ~1,150 in three species (maquis shrub, oak, Aleppo-pine groves), built from leaf cards plus crown cores, with spherical crown normals.
  - **Ground detail:** boulders, and ~48k grass tufts that fade in within ~110 m of the camera.
  - **Slices:** everything is baked into the slice it stands on, so it lifts with it.
  - **Size:** GLB is Draco-compressed (~4.7 MB, ~594k triangles). The decoder is self-hosted in `public/draco/` so the static/LMS export works offline.
- **Assets total ≈ 23 MB**, loaded only when the diorama nears the viewport (progress bar shown). Frames render on demand only.
- **Performance:** measured 60 fps orbiting and zoomed in on an RTX A5000.
  - **Hit testing:** raycasting is BVH-accelerated (drei `<Bvh>`). Without it, hover/drag hit-testing all triangles on every pointer move capped the frame rate around 40 fps.
  - **Resolution:** drops temporarily while the camera moves (`AdaptiveDpr` + `regress`).
  - **Not measured:** a low-end or integrated GPU.
- **Navigation:**
  - **Zoom:** wheel zoom toward the cursor (`zoomToCursor`, 15 m minimum distance). Page scroll pauses while the pointer is over the model.
  - **Pan:** right-drag pans.
  - **Re-frame:** re-clicking the active view button re-frames the view.
  - **Fullscreen:** a new fullscreen button.
  - **Lifted stack:** the camera now follows a lifted stack relative to the learner's own zoom instead of overriding it.
- **Dev note:** two `next dev` servers sharing `.next/` corrupted it mid-task (500s on both). The QA server for this work ran with `NEXT_DIST_DIR=.next-contours` (already supported by `next.config.mjs` and gitignored).

## 2026-09-28 — Lessons 2 & 6: UI-language cleanup (21-pattern brief)

Rules: `design/docs/lessons-02-06-ui-cleanup-spec.md`. That spec extends the topic-01 brief and wins over it for these two lessons. Every learn-mode screen was cleaned except the two hooks, which use the shared `HookSceneLayout`. Each screen was checked against a 1440px baseline and a before/after diff of its rendered text.

### Wording

Wording is unchanged except for the removals the brief allows:
- **Eyebrow labels.** Examples: הכלי המנחה, למה מראש, השפה של הניווט, טכניקה 1–3, למה זה קריטי?.
- **English sub-lines.** Examples: rock names, landforms, north types, Relief / Land cover, technique names.
- **Kept inline (the lesson relies on these terms):** `(Azimuth)`, `(Dead Reckoning)`, `(Route Story)`, `(Pacing)`.
- **Uppercase dropped on English words.** EASTING now renders as Easting because the source text is mixed-case.

### Heading highlights

Kept: לימוד 2 "תבליט ותכסית" and לימוד 6 "סיפור דרך". All the others were unwrapped.

### Shared components

`ReadyCallout` / `IntelCard` gained an opt-in `signature` prop (default `true`), so other lessons are unaffected. Lessons 2 and 6 pass `false`.

### Option recipe on the textured page

Tints are painted on a `::before` layer, so the contour texture never shows through a hovered or selected option. See spec §1.

### User decisions (asked, then applied on the user's "תעשה את זה", 2026-09-28)

1. **`HistoricalCasesPanel` (lesson 2 onboarding) dark band.** Removed the contour background texture (2× `TOPIC01-ONB-HIST-BG`) and the paper grain behind the detail panel. `bg-pine-grad` became flat `bg-pine`. Lesson 1's own panel keeps them. This supersedes the earlier "shared chrome with lesson 1" decision *for lesson 2 only*.
2. **Coordinates.** Removed the kicker "אנטומיה של נ״צ: מה כל ספרה אומרת" above the T1 title.
3. **Landforms.** Removed the floating former-divider line "עוד שכבה: לא רק צורת ההר — גם צורת המדרון". The slope workspace opens with its own T1.
4. **CombatNav.** Removed the legend heading "מקרא".
5. **"דוגמה".** Removed in CombatNav too, matching Principles (pattern 4 names it). The scenario paragraph stands on its own.
6. **Lesson 6 onboarding historical cards.** The call site now uses local `.surface` info cards instead of the shared `IntelCard`, with the same content and order. The 8 other lessons that use `IntelCard` are unchanged.
7. **Scale.** Removed the three empty dashed icon slots. This supersedes the 2026-09-14 placeholder entry. A code comment marks where the zoom-level icon goes if the user supplies one.

### Pre-existing, not from this pass

- The lesson 2 onboarding map box height sometimes renders ~1053px instead of 617px (canvas aspect).
- SMIL / infinite pulses inside map SVGs (PlanningRouteMap, lesson 6 onboarding mission map) were kept as map content.

## 2026-09-28 — Topic-02 landforms (02.1): realistic terrain in the "במציאות" board

User request: keep the 3D demos and their style, but with fewer layers and a bit more realism. Rings belong mainly on the map. Remove the triangle.

- **"במציאות" is now a continuous terrain block.** The stacked contour sheets are gone. Each landform is drawn as a hill-shaded surface with a cream papercut cut-edge and a thin topsoil band. The tint runs sand plain → sage → olive, with the sun at front-left and a light hollow/crest shading. Everything is SVG from the same height field as the map, so the two boards still agree.
- **Displayed height is softly clamped** between the plain (100 m) and a ridge top (~172 m), so the spur and valley ramps fit the board. The map keeps the exact heights.
- **Gentle swell (±~1 m) is display-only**, well below the 10 m interval, so plains don't look machined.
- **The depression rim is now a smooth min instead of a crease.** The 150 m ring moved by less than 1 m on the map.
- **Build-up animation kept (user follow-up, same day).** The original papercut sheets still stack one contour level at a time, in the same camera and clipped to the block. After the last sheet lands, the realistic surface is mounted and fades in over them over 0.55 s, and then the sheets are unmounted. It reads as "contour layers → the real terrain". Reduced motion shows the final surface directly. Mounting the surface only after the stack keeps its ~150 ms mount out of the moving frames.
- **Build-up sheets removed (user, later the same day).** The user does not want the sliced stage while the board builds ("בשלב של הבניה אני לא רוצה שיהיה את החלק שזה ככה פרוס"). The sheet geometry and phase logic were removed from `LandformsVisuals.tsx`. This supersedes the line above.
- **Bottom-to-top build-up kept, as one continuous surface (user, same day).** The user still wants the build to rise from the bottom up ("אני עדיין רוצה שיהיה את האנימציה של הפריסה מלמטה למעלה"). Current sequence:
  - The block fades in flat and plain-coloured, as a thin slab (about 0.15 s).
  - The real surface then rises out of it to full relief over about 1 s. Its elevation tint and hill-shading develop with the height.
  - The key-feature marks fade in once it lands.
  
  Assumption: "bottom to top" means the relief growing upward (every height scaled from the block's lowest ground), not a level-by-level reveal. A flat cutting plane would read as slices again.
  
  Implementation: the moving frames are drawn with WebGL on a temporary canvas, which replaces the SVG surface only while the build runs. Thousands of quads per frame are too heavy for SVG or a 2D canvas (about 150 ms per frame measured). The canvas uses the same colours, per-vertex averaged so it has no streaks. The finished SVG board paints underneath before the canvas and its context are released. Reduced motion, or no WebGL, shows the finished board directly.
- **Switching landforms: shape to shape (user, later the same day).** The user wants the change between landforms to go "מצורה לצורה ולא מקרקע ללמעלה". This supersedes the bottom-to-top build-up *on a switch*.
  - The boards no longer remount on a switch. The ground on screen reshapes straight into the next form over 0.9 s (ease-in-out), with no flat stage. Tint and shading blend along with it.
  - The contour map changes with it. Every frame re-traces the contours of the height field part-way between the two forms, so rings can split, merge and bend into V's on the way. The block's contact shadow moves with its base.
  - Old marks, labels and elevation numbers go at the click. The new ones fade in once the form settles. The caption lines cross-fade.
  - A click mid-move carries on from the shape on screen.
  - Reduced motion (or no WebGL) swaps straight to the finished board.

  **Assumption:** the bottom-to-top build-up still runs once, when the board first appears (there is no previous shape to change from).

  Implementation: the WebGL canvas now blends any two poses vertex by vertex. Every landform shares one mesh layout, and the blend is again a height field seen from the same side, so the painter's order holds. The hidden SVG board keeps the previous form until the move lands, so its thousands of strips are rebuilt at rest, not in the click's frame.
- **Depression: no more green on green (user: "לא מספיק ברור בגלל שזה ירוק על ירוק").** Inside the closed pit (spill depth > 0) the ground is bare rock, as in a real makhtesh under a vegetated plateau. It is light rock just under the rim (`tanline.contour` mixed with paper edge), shading to a browner sandy floor (`tanline.badge` mixed with contour) with depth, and darkened with depth. The green → rock change starts at the rim crest, so the highlighted 150 m ring sits on the rock edge. The crest glow is suppressed along the rim. No new colour tokens; only existing illustration colours are mixed. The other four landforms have no closed pit and are unchanged. Tried and rejected: moving the plateau to ~150.5 m so the ring would sit exactly on the crest. The 150 contour then ran where the ground is almost flat and came out wobbly on the map.
- **Depression sharpened (user follow-up: "not clear enough").**
  - The profile is now `r^1.8` (was `r^1.25`), so steep walls surround a wide floor, like a makhtesh. The map rings crowd toward the rim, and the innermost ring is wider.
  - This form alone has a higher camera (`ky 0.52`, about 31° instead of about 24°) so the eye sees into the pit, plus more relief (`kz 0.3`).
  - Ground inside a closed pit darkens with its depth below the spill level (a priority-fill of the height field). Deep reads as dark, instead of the low-elevation sand tint making the floor look raised. Open forms have no spill depth, so the other four landforms are unchanged.
- **Rings on the diorama:** only the one contour that is also highlighted on the map, draped on the ground as a single orange line (hill top ring with a light orange tint; depression rim). The spur axis, drainage line, saddle ridge line and saddle point are also draped on the ground and hidden where terrain blocks them.
- **Triangle removed** from both landform boards: the hill summit and the two saddle peaks, in both "במציאות" and "במפה". **Assumption:** the crest triangle in the slope profile (02.1 slopes, next to the "פסגה" label) was left in place. The request was about the landforms demos, and there the triangle has a label.

## 2026-09-28 — Lesson 2 landforms: realistic slope side views + map-style plan view

User request: make the side view of the 4 slope types realistic, in the lesson-1 render style. Also make the "מלמעלה (קווי גובה)" board clearer and look like a real map.

### Side view ("מהצד")

- **What it is now:** one Cycles render per slope type (`scripts/blender/render_slope_profiles.py`, packaged by `package_slope_profiles.cjs` into `public/assets/lessons/topic02/slope-profiles/*.webp`, ~90 KB each).
- **How it looks:** a cut slab in the lesson-1 diorama style. The cut face shows a topsoil band over layered limestone. Scrub, grass and boulders sit on the surface, and bare rock takes over on steep stretches.
- **Textures:** reused the repo's existing CC0 sets (`contour-mountain/textures`, `limestone-section.webp`). Nothing was generated or downloaded.
- **Framing:** the orthographic camera frames the SVG viewBox (200 × 60) exactly, so the slab's cut edge *is* the profile curve. The script asserts that the crossings land within 0.05 units; the measured error is 0.
- **Switching types (user request: keep the old animation):** the profile morphs exactly as before. It is drawn on a canvas where each render is warped column by column onto the moving curve: the strip above ground shifts, and the cut face stretches down to the fixed slab underside. Only the new type's render is shown from the first frame (user: no blend of layers): it starts bent to the old shape and morphs into its own. One tween drives the curve, the dots and the drop lines, so they never drift apart. A mid-morph click carries on from the current shape.
- **Assumption:** vegetation, rocks and texture are illustrative. Only the cut-edge profile carries data.

### Plan view (now captioned "במפה")

- **Style:** the map language of `ContoursShapeMap` in the same lesson: paper plate, grid, brown contours, heavier index lines at 100/200, elevations written on the lines with a knock-out, and a dashed section line.
- **Assumption — line shape:** contours are drawn as one flank of a hill. Each line bows toward the low ground, as in the spur rule. All lines are the same curve shifted to its crossing, so spacing stays the only variable.
- **Assumption — relief shading:** added faint shading between lines, darker where the stretch is steeper. This repeats the density = steepness message in a second channel. It is a teaching aid, not a surveyed hillshade.
- **Zone brackets:** under the plate, brackets name each stretch: "צפוף = תלול", "מרווח = מתון", "מרווחים שווים = שיפוע אחיד". They replace the former static rule line.
- **Captions:** "מהצד · פרופיל השטח" is now "מהצד · חתך השטח". "מלמעלה · קווי גובה" is now "במפה · אותו מדרון בקווי גובה, מבט מלמעלה".

### Code

- The slope boards moved to their own file, `SlopeVisuals.tsx`, because another session was concurrently rewriting `LandformsVisuals.tsx` (the landform "במציאות" board).
- The old `SlopeProfile` / `SlopeContours` / `SlopeGlyph` / `SLOPE_GEO` code in `LandformsVisuals.tsx` is now unused.
- **Cleanup:** delete the old code from `LandformsVisuals.tsx` once that rewrite lands. `Summit` and `faceColor` there are only used by the old slope code.

## 2026-09-28 — Lesson 2 geology: realistic "3 סוגי הסלעים" dioramas (two variants under review)

Request: make the rock-type animation realistic, in the lesson-1 (archived) render style. The user asked for both candidate presentations, and will pick one after comparing them.

### What was built

- **Three Blender cut-away dioramas** (`scripts/blender/render_rock_films.py`), each a miniature slab on a cream tabletop. They share lesson 1's soft overhead-left studio light and tactile, matte Poly Haven rock:
  - **Igneous:** a magma chamber at depth feeds a conduit into a half-cut stratovolcano. Lava runs down the flank and cools to black basalt at the toe. A coarse-crystal granite body with its feeder dyke sits in the crust.
  - **Sediment:** a shore on the left slopes into a translucent sea. Grains and shells sink and settle, and three new layers (sandstone, then limestone, then fresh sand) build up over two older ones (limestone, marl). Fossils sit in both limestone layers.
  - **Metamorphic:** two crust blocks squeeze a layered rock from both sides, and magma heats it from below. The rock thickens and folds, and its beds turn from sedimentary tones to banded marble, quartzite and slate with a slight sheen. A flat-layered "before" sample stands to the right.
- **Variant A, "סרט מרונדר":** 60 WebP frames (4 s at 15 fps) drawn on one `<canvas>`. The film plays once when the board is on screen and holds the final frame. A "הפעלה חוזרת" button replays it.
- **Variant B, "תמונה + תנועה":** the final render (`still.webp`) plus light SVG motion that shows only the process: magma blobs climbing the conduit, a pulsing chamber glow, grains sinking in the water, pressure arrows pushing, and heat rising.
- **Shared by both variants:**
  - The Hebrew labels are the same terms as before.
  - The diagram arrows (time, pressure, transformation) are an SVG overlay on the renders' 560 × 360 viewBox.
  - Anchors are projected from the 3D scenes (`rockFilms.data.ts`, generated), so leaders land on the rendered features.
- **Rock swatches** in the tabs and the sample card are now rendered hand specimens (granite, layered sediment with an ammonite, folded gneiss/marble), replacing the vector tiles.

### Assumptions

- **Comparison toggle:** it lives only in development (`process.env.NODE_ENV !== 'production'`), above the rock tabs. It never ships in the static export. Once a variant is chosen, delete it along with the unused path in `RockVisuals.tsx`.
- **Sediment scene:** the shore was added so the viewer can see where the sand comes from. The previous vector version had only water over layers.
- **Metamorphic scene:** the rendered film shows the transformation itself. The flat "before" sample still stands beside the result, as in the old illustration, so the final frame and the still also carry the before → after comparison.
- **Granite:** the texture is procedural, with large interlocking crystals of pink feldspar, white quartz and black biotite. It shows slow cooling, and the Poly Haven granite photos were polished floor tiles with grout.
- **Textures:** CC0 Poly Haven diffuse maps plus the `studio_small_08` HDRI. They are git-ignored, about 29 MB, and re-fetched with `scripts/blender/fetch_rock_textures.cjs`. Only the rendered WebP files ship.
- **Payload:** each film is loaded only when its tab is opened. Reduced motion loads only the final frame (film) or the still (variant B).

### Update (same day): direction changed to cinematic photography

- The user clarified that "realistic like lesson 1" means lesson 1's **cinematic photographic images** (AI-generated stills and video), not 3D renders.
- The user will produce the media. Prompts and a production guide are in `design/handoff/rock-types-film/`: a start/end still pair and a fixed-camera time-lapse per rock type, plus three hand-specimen photos.
- The Blender dioramas stay on the page only as an interim until the media arrive, so the board keeps working.
- The interaction is kept exactly as it is: the film plays in view, labels fade in by progress, there is a replay button, and variant B (still + motion) remains.
- **Import:** `scripts/media/import-rock-films.cjs` extracts 12 fps WebP frames plus the still from each delivered film, and prepares the specimens.
- **Integration work still to do:** move the overlay viewBox from 14:9 (560 × 360) to 16:9 (640 × 360), and place label anchors by hand on the delivered images. Then retire the Blender pipeline (`render_rock_films.py`, `package_rock_films.cjs`, the generated anchors).

### Update 2: the process is animated in code on the delivered photos

- The user produced the six START/END photos and the three specimen photos. They rejected the generated videos because they reached the end state too quickly, and asked for the animation to be done in code.
- **Approach:** `RockVisuals.tsx` with `rockTimelapseGL.ts`. One WebGL1 fragment shader per rock blends the pixel-registered START/END pair and performs the process in stages at a readable pace (11–12 s):
  - **Igneous:** the lava glow breathes, then cools from the toe of the flow back to the vent. The front coordinate is the projection on the toe → vent axis, and the brightest cores cool last. The colour goes orange → dull red → the END photo's basalt in dusk light, and only then does morning light dissolve in, sky first.
  - **Sediment:** the plume drifts, a noise warp inside the plume region. The END photo is revealed from the bottom up, stopping at each measured bedding plane (`SED_STEPS`, shared by the shader and the time arrow). The freshly settled band is tinted as silt, and the water above it turns shallow.
  - **Metamorphic:** a vertical fold warp `fold(x)`, three Gaussians fitted by eye to the END folds. It bends START's flat beds into the fold while END starts "unfolded" and relaxes; the two are then cross-faded. Heat shimmer and a warm tint appear at the base.
- **Controls:** the film autoplays once when the board is in view. Below the photo there is a play/pause/replay button and a scrubber (native range, RTL-aware), outside the `role="img"` figure. Labels are pills on a 640 × 360 overlay and appear or leave with their stage. Where it helps, a label hands over at the same spot, e.g. "לבה" → "בזלת".
- **Fallbacks:** without WebGL, the page cross-fades the two photos by the same progress. Reduced motion opens on the END state with no autoplay, and scrubbing still works.
- **Removed:** the dev-only A/B toggle and variant B, which the code time-lapse supersedes. The Blender pipeline and the video import script are also removed.
- **Assumption — geometry fitted by eye:** the fold profile, the cooling axis and the bedding-plane stops were read off the photos, not measured automatically. If a photo is regenerated, re-fit `fold()`, `toe`/`vent` and `SED_STEPS`.


## 2026-09-28 — Lesson 2 topography (#scene-topography): one terrain, three representations

User request: show the map, all of its explanation and the pager on one screen, with the map large. Make the 3D model, the aerial photo and the topographic map depict exactly the same ground, with no pre-rendered images. Keep the copy verbatim. Animate the transitions, and add an "all together" view with hover linking between the layers.

- **Spec and plan:** `docs/superpowers/specs/2026-09-28-topography-scene-redesign-design.md` and `docs/superpowers/plans/2026-09-28-topography-scene-redesign.md`.
- **Previous version:** frozen at `/archive/topic-02/topography-v1/` (`TopographySceneV1.tsx`). Its three PNGs stay because of that.

### Terrain

- **One source.** One height field and one feature layout (`scripts/blender/build_topography_terrain.py`) produce `terrain.glb`, `albedo.jpg` and `topographyTerrain.data.ts`.
  - The map's contours are the exact iso-lines of the GLB's triangles.
  - The build fails if a contour vertex is more than 0.5 m off its level, and the measured error is 0.
  - In the browser, the camera projection of the summit and all six buildings lands within 0.84 px of the map sheet.
- **Composition follows the former map:** summit 412 m, a rocky spur running S by E, the footpath from the 2×2 cluster, the dirt road across the south, the SE pair of buildings, an orchard (SW), sparse woodland (E) and woodland (NW).
  - **Assumption:** where the former photo and map disagreed (the photo showed 4 groves, the map 3 areas), the map won.
- **Drainage is traced, not painted.** Ravines follow the steepest descent of the landform and tributaries bend into them. That's why the contours V upstream in the valleys and downstream on the spur.
- **Dropped:** the former map's unlabeled grey-green lines. They were not in the legend, and one ran through the summit.

### Map sheet

- **Grid:** true 1 km ITM lines (`202`, `203` E; `692` N) with 100 m ticks.
  - **Assumption:** this replaces 201–205 / 691–694, whose spacing (~330 m) contradicted the "0–300 מ׳" scale bar. The sheet is 1.4 × 1.05 km, 14 m per sheet unit.
- **Legend:** the former legend had its Hebrew reversed ("ישר הבוג וק"). It now reads "קו גובה ראשי" / "שביל".

### Relief and lighting

- **Vertical exaggeration:** ×2 in the 3D model only. As the camera rises to the aerial view, the relief settles to true height, so the photo and map show the ground as it is. This is also the "flattened" look the photo text describes.
- **Buildings:** sized as ~28 × 18 m farm buildings, so they stay visible at ~2 m per screen pixel.
- **No normal map.** The 2.5 m mesh resolves the relief at display scale, and the albedo carries the fine texture.
- **Sun:** high in the SW (≈56°), above the steepest exaggerated slope, so no face falls into a hard terminator shadow.

### Copy

- All existing copy is kept verbatim, including four missing spaces before quotes (`יכולים"לעוף"`, `ונראית"מעוכה"`, `מסננת"רעשי רקע"`, `את"שפת המפה"`). They are flagged to the user and not changed.
- **New UI microcopy:** "כל התצוגות יחד", "טוען שטח תלת־ממדי…", "התצוגה התלת־ממדית אינה זמינה בדפדפן זה", and elevation chips of the form "307 מ׳".

## 2026-09-29 — ITM / WGS84 comparison concept (mockup only)

- User requested a realistic replacement concept and an Opus handoff for the comparison block. The generated mockup and brief are proposals, not approved production changes.
- The concept is "one point, two coordinate readouts": a physical-looking map and GPS, an ITM/WGS84 selector, short supporting text and a shared pine insight band. Palette and fonts use existing site references; no new UI color tokens.
- The map is illustrative, not georeferenced. Generated map names, grid labels and marker placement must not be used as accurate cartography. Production should generate a text-free image and add meaningful overlays in code.
- Displayed ITM example values are approximate calculations for the WGS84 example. Opus must independently validate the coordinate pair and chosen transformation before publishing.
- The mockup shows the surrounding header/sidebar only for context. Keep the existing app shell and scene sequence. Only the comparison block is in scope; the datum-shift block below is separate.
- Detailed brief: `design/docs/2026-09-29-coordinates-opus-handoff.md`. Image and source prompt: `design/mockups/coordinates-2026-09-29/`.

## 2026-09-29 — Lesson 2 coordinates (#scene-coordinates): datum-shift demo restyled to match "נ״צ הוא לא מספר קסם"

- **Block anatomy copied from `DigitAnatomy`.** "הדמיה מבצעית: מה קורה כשהשפה לא תואמת" is promoted from a small in-card label to the block's T1 heading, placed above the card. The "איך זה קורה בפועל?" story moves from the sidebar into the intro paragraph under the heading, so it is read before the learner drags. The wording is unchanged.
- **Severity colours.** The `status-*` tokens are raw Tailwind hues, and amber `#fbbf24` is unreadable as text on cream. They now appear only as the status dot and the consequence inset's `/10` tint. All text is `text-fg` / `text-fg-muted`. The tokens themselves are unchanged, since changing them needs approval.
  - **Assumption:** the ✓ / ! / ✗ glyphs in the old status pill are dropped. The coloured dot is the single status cue.
- **Slider:** this is the topic-06 `PlanningScene` recipe (ember fill, white thumb with an orange ring, ticks at 0/50/100). The captions are unchanged.
- **Map:** the "{n} מ׳" distance chip now appears from 35 m instead of 5 m. Below that, the line's midpoint lies inside the crosshair and the chip covered the target. The sidebar readout carries the number.

## 2026-09-29 — Lesson 2 contours (#scene-contours): density profile is live again

- **The static Blender photos (`dioramas/*-natural.webp`) under the density map were replaced by a live SVG cross-section.** The user wanted the original dashed drop-lines from the map to the profile back, and a static image can't carry them.
- **One surface:** switching tabs tweens a weighted mix of the three height models (`blendTerrain` in `contourDensityGeometry.ts`). Every frame, the map rings, the A–B profile and each contour crossing come from that one mixed surface, so the drop-lines stay on the ground throughout the morph. At rest the output equals `GEOMETRY` exactly, to within 1e-7.
- **Look (assumption):** the slab reuses the slope boards' materials instead of new colours.
  - The cut face uses the same `limestone-section.webp` texture the slope renders use. Its strata are fixed in space, so the hill reads as carved from them.
  - Topsoil (contour brown) and grass (`#8A9163`) follow the ground. Scrub uses the §8 illustration greens.
  - Any stretch steeper than rise/run 2.2 is left as bare rock, so the cliff face shows no soil or scrub.
- The `*-natural.webp` renders and `contourDensityRenders.data.ts` are no longer used by the page. They are left in place.

## 2026-09-29 — Lesson 2 coordinates (#scene-coordinates): "אותה נקודה. שתי שפות." implemented

Replaces the white two-column ITM/WGS84 card with `CoordinateSystemsComparison.tsx`, built from the brief and mockup (`design/docs/2026-09-29-coordinates-opus-handoff.md`). The rest of the scene is unchanged.

- **Photographic assets are still missing.** The implementation session had no image-generation tool. Two interim visuals stand in, and neither is the approved look:
  - **Map:** the lesson's existing text-free terrain art (`terrain-map.png`).
  - **GPS device:** drawn in code.
  - Prompts, delivery path and swap steps are in `design/handoff/coordinates-itm-wgs84/README.md`.
- **Sample pair:** 31.7857° N, 35.2007° E ↔ ITM E 219102, N 632555.
  - Verified with proj4 2.22.0 and the epsg.io EPSG:2039 definition (7-param towgs84). Result: E 219102.03 / N 632555.49, rounded to the metre.
  - Four-decimal degrees are ≈ ±5 m, so the pair agrees within its written precision.
  - The old 3-param transform (-48, 55, 52) lands ≈ 10 m away.
  - Reproducible with `design/handoff/coordinates-itm-wgs84/verify-sample-point.mjs`.
- **Map grid is an overlay, not cartography.** The ITM km lines (217–220 E, 631–633 N) come from the verified point placed at 63% / 44% of the image and an illustrative scale of 4 km across the image. The map is labelled "מפת המחשה". The mockup's generated grid numbers and place names are not used.
  - **Assumption:** northing labels sit on the right edge rather than the left (mockup), because the GPS device occupies the lower left.
- **The GPS device is set to WGS84 in both states** (as in the mockup's ITM state). The point never moves: the same pixel box was measured in every state.
- **The two states differ in hierarchy and layers** (revised at the user's request, same day), not just a highlight:
  - **ITM — the map reads the point.**
    - The km grid is stronger, and the 219 / 632 reading lines are the strongest.
    - Two dashed orange guides run from the point to margin readings: E 219102 at the top, N 632555 at the right.
    - The device shrinks into its corner, and its screen dims.
  - **WGS84 — the device reads the point.**
    - The whole ITM layer is removed: grid, km labels, metre readings and guides.
    - The map recedes under a 60% paper veil.
    - The device grows ×1.3 (from ×0.78), and a dashed orange leader runs from its screen to the point.
    - A tag reads "המכשיר מוגדר ל־WGS84", so the device is not implied to show WGS84 only.
  - The E/N badges are shared across the explainer, the map readings and the device screen.
  - **Assumption:** the "אותה נקודה" tag moved to the marker's upper left, clear of both the guides and the leader.
  - Switching takes ≈ 200–300 ms: opacity plus one device transform. There is no continuous motion, and nothing moves under reduced motion.
- **Map column height:** the map stretches to the explainer's height (≈ 612 px at 1440), not the brief's ≈ 480. The image covers the column through CSS container units, so all overlays stay registered to it.
- **Details disclosure:** "יתרונות ומגבלות" opens as a full-width row under the workspace, not inside the right column. The map never rescales, and the page grows with natural scroll.
- **Title accent:** "שתי שפות." uses `ember.deep` (#C96714) instead of the mockup's `accent` orange. `accent` on the cream page is ≈ 2.5:1 contrast. `ember.deep` is ≈ 3.2:1, which passes AA for large text.
- **Omitted from the mockup:**
  - the eyebrow line, because `SceneHeader` no longer renders eyebrows;
  - the photo inside the pine band, which the brief allows omitting.
- **Tabs:** the Latin code sits at the visual left ("ITM · מטרים"), as in the mockup. DOM and reading order are code first.
- **Pros/cons rewritten:**
  - Dropped claims about IDF / NATO usage, "most accurate" and "every smartphone".
  - The new lines were fact-checked. ITM advantage 1 was reworded per axis ("הפרש של 100 בין ערכי E הוא כ־100 מטר…").

## Topic 02 — Topography: feature hover in "כל התצוגות יחד" (2026-09-29)

- **Feature hover:** in the stacked view, pointing at a map feature on either layer, or at its name in the legend row under the stack, outlines it in accent on the model and on the map. The chip then shows the feature's name instead of its height, and the contour line is hidden.
- **Assumption:** the dense woodland in the north-west corner has no label on the sheet. Its hover name is "חורש", next to the sheet's own "חורש דליל".
- **Scope:** this only works in the stacked view. The single views never show the model and the map together.

## Topic 02 — Geology: painted terrain for "כוחות פנימיים וחיצוניים בעיצוב הנוף" (2026-10-04)

- **Style:** both force illustrations are painted oblique terrain blocks (sculpted diorama, cut open on the front and left faces to show the beds), after `public/assets/scene-onboarding/topic-02/states/state-1…3`. Only the style is borrowed; no roads, buildings or other onboarding content.
- **Assumption — how the images were made:** there is no image-generation tool in this workflow, so the terrain is rendered procedurally by `scripts/media/render-geology-forces.cjs` (height fields, sun + sky light, cast shadows, hollows, painted materials, brush finish). This keeps every label and arrow exactly registered, and the uplift can still animate. If AI-generated paintings are preferred later, the SVG overlay can take new anchor points.
- **Labels and arrows** stay on the SVG layer above the image, in the same 560 × 360 viewBox. All texts, labels and aria-labels are unchanged; only their anchor points moved to the new terrain.
- **Endogenic motion:** the beds folding up into the ridge plays as a 10-frame flipbook (t = 0 → 1, cross-faded, 1.3 s after a 0.3 s delay). It starts only once all frames are decoded. Reduced motion shows the final frame.
- **Fix to existing motion:** the exogenic rain drops, wind streaks and tumbling block only faded before. Their translate/rotate keyframes never reached the DOM (framer-motion 11 SVG elements without an initial transform value). They now declare initial `x`/`y`/`rotate`, so they move as the code always intended.
- **Revision (same day) — continuous landscape:** the painted blocks were replaced by one continuous landscape per force, in a perspective oblique aerial view. It has a foreground, a middle ground and a hazy distance that dissolves into a painted sky; the frames are opaque, so the overlay no longer draws a sky wash or block shadow. A shallow cut along the near edge shows the beds; it is ≈15% of the height, no longer a "layer cake".
  - **Endogenic:** a fold belt of two parallel anticlines (the cut crosses the plunging nose of the main one), and a fault scarp across the whole land. The **west block is the dropped one**, so the scarp faces the viewer and the sun; the offset is still shown in the cut. A volcanic field (a large cone, a small one, and a cone in the cut fed by the magma chamber) sits beyond the fault.
  - **Exogenic:** a layered mesa with a two-tier cliff and a scree apron, a stream winding through a valley cut into the beds, and crescent dunes on the western plain.
  - Every label, arrow, relationship and animation is kept. Only their anchor points moved.
- **Version toggle:** a "גרסה קודמת" button (top-left of the figure, `aria-pressed`) switches the board back to the previous schematic illustrations, kept verbatim in `GeologyVisualsLegacy.tsx`. The choice holds across both tabs. **Assumption:** it is visible to everyone until the user decides which version to keep.

## Topic 02 — Geology: the volcano in "כוחות פנימיים" (2026-10-04)

- **Composition:** the main volcano moved from the right edge to fully inside the frame, a little forward on the plain. Its crater is at ≈ (464, 60) in the 560 × 360 viewBox, low enough for the plume to rise and fade inside the frame. It is larger than before (rim ≈ 112 above the plain, base radius 108; it was 106 and 82) but stays lower on screen and narrower than the fold ridge, which remains the dominant landform on the left.
- **Volume:** the cone has concave flanks scored by wandering radial gullies, and a raised crater rim with a burnt, shadowed hollow. Ash and scoria darken toward the summit and grade into the soil on the apron, with scoria blocks strewn there. A dark basalt flow runs from the rim down the sunlit (west) flank onto the plain. It meanders a little, pinches and swells, has a darker channel between lighter rubbly levées and a breakout lobe, and ends in a lobate toe. Light comes from the scene's existing sun. The volcano's cast shadow gets a wider penumbra (endogenic scene only, east of the fault), so it is soft and attached to the cone's foot rather than a hard-edged patch. The small cone in the cut (fed by the chamber) is kept. **Assumption:** the second small cinder cone moved from the far right edge to just in front of the volcano, to keep the field compact and in frame.
- **Activity (SVG overlay):** after the uplift settles (≈ 1.6 s), three things start one after another.
  - **≈ 1.7 s:** slow glowing pulses rise up the feeder conduit in the cut, one every ≈ 2.8 s, each taking 3.6 s.
  - **≈ 1.9 s:** a faint warm glow breathes in the crater (period 5.2 s, low amplitude).
  - **≈ 2.1 s:** a soft plume of steam and ash begins: warm-grey puffs leave the crater ash-darkened, rise, swell and drift downwind. They drift east, away from the ridge; the wind direction is an **assumption**, chosen so the plume never crosses the ridge or the labels. Puff edges are broken by a displacement filter, so the plume reads as painted rather than as cartoon clouds.
  - One rAF clock drives all of it. It stops while the figure is off screen or the tab is hidden.
- **Reduced motion:** the final frame with a still plume and a steady crater glow, at one fixed moment. There are no conduit pulses and nothing moves.
- **Labels:** strings unchanged. "הרי געש" now sits at (396, 32) with its leader pointing to the new crater's west lip (anchor `craterLip` from `--anchors`).

## 2026-10-04 — MVP upgrade of lesson 12 interactions (archived, copy unchanged)

Same method and conventions as the 2026-09-27 round for lessons 2 & 6 (see that entry). Scope: the three learn sub-topics of topic-12 (`basics`, `costsurface`, `network`); none has a reference screen in `design/reference/`. Hook, onboarding, recap and the shared `src/components/lesson/` were not touched. The lesson stays archived (`ARCHIVED_TOPIC_IDS`, `archivedScenes`, navigation and numbering unchanged).

**Copy.** All 200 strings of the three scene files at HEAD were snapshotted before work began. After the work, a script confirmed every one is still present verbatim in the scene file or its new sibling (`*Map.tsx` / `*Visuals.tsx` / `*Terrain.tsx`). That includes aria-labels, alt text, hints, the empty-state label, and the unrendered `desc`/`english` layer fields, which stay unrendered. The only new string is the replay button's aria-label "הפעלה חוזרת של ההדגמה", reused from the lesson 2/6 round. Labels inside illustrations reuse terms already present in the same scene, numbers, or A/B and node letters.

**Verification route.** A whole archived topic has no `/archive/topic-12/<sceneId>` page: that route only exists for entries in `archivedScenes`. QA used `/lessons/topic-12/#scene-<id>` behind the archive gate, at 1440 × 1122.

**Shared conventions applied.**
- **Corners:** `rounded-xl` for controls, `rounded-2xl` for cards, pills `rounded-full`. Every `rounded-[3px]`/`[4px]` in the three files is gone.
- **Orange:** decorative orange (eyebrows, card h3s, callout icons, "רשתי") is now ink or brand green. Orange is left only on active toggles, selections, routes and focus rings. The SceneHeader title highlights stay; they belong to the separate UI-cleanup round.
- **Feedback colours:** "connected", "safe" and "savings" chips moved from neon `status-ok` to brand greens.
- **Text size:** every text under 13px in these files (10–12px hints, legends, table heads, chips, the 9px mini table) is now 13px or more.
- **RTL:** `border-r-4` → `border-s-4`, `text-right` → `text-start`.
- **Motion:** no infinite SMIL/framer loops remain. Demos run once per change, with a replay button that is hidden under `prefers-reduced-motion`.
- **Toggles:** `aria-pressed` on every toggle.

### 12.1 basics — `BasicsMap.tsx`, `BasicsVisuals.tsx`

**Drawn: one area model from one height model.** The area is the orthophoto `valley-aerial.jpg` itself. The main road, the settlement ring road, the secondary roads, the dirt track, the wadi and 10 field polygons were re-traced on a coordinate grid laid over the photo. The road traces closely enough that the raster cells it crosses line up with the photo's road. The height model is invented, not surveyed: a hilltop under the settlement, a western hill, and a wadi floor along the field band. That one model feeds both the DTM layer (20 × 20 cells, hypsometric ramp) and the vector panel's contours (25 m interval, 100 m index). The model's valley dip follows the drawn wadi line point by point. The old hand-drawn ellipses are gone. Map labels are ink on white plates; only the observation site's marker is red. The site label sits west of the site so the dirt track stays visible.

**Layers.** The stack draws the four layers as transparent sheets ("שקף שקוף") in an oblique projection. The projection matrix has a positive determinant, so it is never a mirror. The composed map shows the same layers from straight above. Turning a layer off slides its sheet out of the stack, leaving only a dashed frame. The label stays in place and readable. The toggle buttons are the keyboard path, and the sheets are click-only.

**Raster vs vector.** Clicking a raster cell (or using the arrow keys, in map directions) selects one "pixel" and shows its single value: the mean colour of the cell, computed from the photo in the browser. Clicking the road or the observation site, by mouse or with Enter/Space, selects its row in the attribute table, and clicking a row selects the feature. The selected feature's raster cells are outlined on the photo, to show that the raster has no "road" object. Clicking a selection again, or empty map, clears it. The loupe picks the first spot beside the cell that stays in frame and clear of the chips and traced cells. A chip sitting over the picked cell fades to 20%.

**Small layout move.** The mini attribute table moved from an overlay on the vector map to the foot of the vector figure. At 13px it would have covered the fields, and the slot it moved into was empty.

**Query.** Isometric blocks for the four buildings in the table. Each block's height comes from the "גובה (מ׳)" column, exaggerated ×1.3 for legibility. Footprints and layout are illustrative. The query selects rows 2 and 4 and their blocks in orange (ink digit on a white disc, orange ring). Selected rows are ink text on an orange tint with an orange start border. A row (via its ID button, aria-label = type) or a block selects one building, and selecting it again or clicking the ground clears it. "✓ כן" moved from `status-warn` yellow to brand green so it doesn't read as a selection.

**Architecture.** A small static schematic in each card. Local: one workstation and a file. Network: one spatial DB serving two workstations that show the same layer.

### 12.2 costsurface — `CostSurfaceTerrain.tsx`

**Drawn.** One terrain on a 30 × 18 grid of square cells (the old 22 × 13 grid was stretched into a square). Slope is now the real gradient of a height model; the old version used hill height. Water is the river, built-up is the village, threat is a circle of radius 4.6 cells around the site. These factors use the original weighting (5/8/4/12). A road with a bridge was added (owner-approved). Road cells have a base cost of 0.3 instead of 1, slope ×0.4 and no water cost, which gives "כביש סלול" and "נדבק לדרך הקלה" from the copy something to stick to. The terrain is illustrative, but the computation is exact: what you see is the Dijkstra result on that surface.

**Tuned behaviour.** At the default weights the path leaves the road around the threat. At threat 0 it stays on the road the whole way. With built-up at 1 it goes around the village.

**Map.** Cost raster on a sequential olive ramp (light = cheap). The scale is absolute, not re-normalised per setting, so zero weights leave the map pale. Contours, river, road (with a bridge mark at the river), village (solid outline) and the threat ring are drawn over it. The path is orange; the straight line is dashed ink. A is a hollow ring (start) and B a filled disc in a target ring (goal), so they differ by shape as well as letter. The built-up factor uses the village's ink-grey in its thumbnail and slider value, not a second blue next to water.

**New behaviour.**
- **Factor thumbnails:** each slider has a thumbnail of its factor on the same grid, with opacity set by the weight, so the "sum of factors" is visible.
- **Sliders:** they run left→right (`dir="ltr"`) as an unrolled numeric scale.
- **Traveller:** it runs once, 0.4 s after the sliders settle, and again on replay. The old traveller looped forever and threw `cx undefined` errors.
- **Numbers:** each value takes its line's colour.
- **Queue:** Dijkstra now uses a binary heap, since it recomputes on every slider step.

### 12.3 network — `NetworkTerrain.tsx`

**Drawn.** One light relief under both maps. The relief and the ravine are schematic. Bridge E spans a short ravine that starts and ends inside the two road faces meeting at E (D·G·E and E·H·F). It therefore never crosses another road, and the given topology is unchanged. Roads are road symbols. The existing labels "בסיס עורף", "חזית I" and "גשר E" are shown for the first time; the other junctions show their letters.

**Network behaviour.**
- **Junctions:** keyboard buttons (`aria-pressed`, aria-label = existing label).
- **Blowing a junction:** its roads are cut one after another, ordered by angle (the domino, 0.16 s apart). Whatever is no longer reachable from A fades. An isolated front turns red.
- **Convoy:** it drives the BFS route once after each change, and on replay.
- **Reset:** uses `aria-disabled`, so keyboard focus stays on it.

**Buffer behaviour.**
- **Shared map:** the same terrain and roads (muted) under the rings, so "Network + Buffer" is one map. Junctions inside a Kill Box get a red ring.
- **Friendly force:** moves by click (existing hint), drag, or arrow keys (map directions). The marker and its focus ring are clamped inside the frame, and its label is clamped separately so it never hangs off an edge.
- **Threat cards:** each card is a toggle that emphasises its ring and dims the other. Clicking the map clears the pick.
- **Labels:** placed so none collide (S-400 above its site; the short-range label west of its site). "Kill Box" plates sit on the ring. A dimmed threat (another card picked) fades its ring and marker only; its labels turn ink and stay legible. The old inner dashed ring at 0.6 × range was removed: nothing on screen gave it a meaning.
- **Place names in the network map:** above A and I, and above-left of E, so no label sits on a road. The isolated front's red "I" is never faded. The base A is a square and the front I a diamond, so they differ by shape too.
- **Short-range site:** moved from y 50 to 47 so its whole ring stays inside the 56-unit-tall map.

### Content conflicts flagged to the owner (text unchanged)

1. **NetworkScene status chip.** `${path.length - 1} צמתי ביניים` counts roads, not junctions. A‑B‑D‑G‑I shows "4" although it has 3 intermediate junctions. The calculation was left as is.
2. **The intro and the Targeting card.** The intro says "גשר אחד יכול להפיל אוגדה שלמה" and the card says "נסה לפוצץ את גשר E או צומת C". In the given graph no single junction disconnects A from I: it takes two (B+C or G+H). "Critical" is drawn as "cuts the most roads at once" (E: 5, C: 4, shown as the domino). The graph was not changed.
3. **Ranges.** The intro says "סוללת טילים מאיימת על 50 ק"מ", while the card shows "SAM S-400 · טווח 18" with no unit, and a real S-400 reaches much further. The rings are schematic, with no scale bar.
4. **"חיסכון: X%".** It compares two different metrics. The straight line sums every cell including the start, with no diagonal factor. The least-cost path skips the start cell and weights diagonals ×1.414. The calculation was left as is.
5. **"משטח עלות חי · A ← B".** Bidi renders the arrow pointing at A, while the path runs A → B.
6. **"4 מבנים בגזרה".** The vector panel's settlement has 10 buildings. The query view draws only the table's 4 buildings, as their own sector.
7. **"רשת דרכים · בסיס (A) ← חזית (I)".** The arrow follows Hebrew reading order. On the map, which is not mirrored, A is on the left and I on the right, and the route runs left → right, so the arrow points against the drawn direction. Same family as item 5.
8. **Typo in the network hint "כדי"לפוצץ"".** The space before the quote is missing. Not fixed: zero copy changes this round.

### Review follow-ups not done this round

The visual-qa, rtl-qa and cartographic reviewers ran on all three scenes. Their in-scope findings are fixed above, and the fixes were re-checked at 1440. The remaining RTL findings are copy, flagged as items 5, 7 and 8 above. The following were left, because they need new copy or a shared component:
- **Legends:** entries for the straight line, river, road, village and threat ring in 12.2, a key for the "junction inside a Kill Box" red ring in 12.3, and a DTM ramp/contour key in 12.1. All of these need new strings.
- **Shared diagram kit:** `Plate`, `smoothPath`, marching squares, `useRunOnce` and `pointAlong` are duplicated across `BasicsMap`, `CostSurfaceTerrain` and `NetworkTerrain` (and a measured `Plate` exists in topic-10). A shared `src/components/diagram/` kit would be a new shared component, which is outside this round.
- **12.2 river:** it is not carved into the height model, so contours don't notch at it. Carving it would add slope cost along the banks and retune the paths.
- **Responsive:** the 13px floor holds at 1440 only. Mobile is a separate task per CLAUDE.md.
- **Cosmetic:** the 12.2 map card has ~55 px of empty band above and below the map (it centres against the taller controls column), and the native slider track renders near-black.

**Dev note.** With `output: 'export'`, `NEXT_DIST_DIR` only relocates the *export*; `next build` still compiles into the shared `.next`. A build in the main folder therefore races other sessions' dev servers and fails at prerender with `PageNotFoundError`. The verification build for this round ran in a temporary git worktree (HEAD + the 7 topic-12 files) and passed. The QA dev server used `NEXT_DIST_DIR=.next-t12` (dev only).

## 2026-10-04 — MVP upgrade of lesson 10 interactions (archived, copy unchanged)

Same method and conventions as the 2026-09-27 round for lessons 2 & 6. Scope: the three learn sub-topics of topic-10 (`urbanmorphology`, `threedim`, `civilian`); none has a reference screen in `design/reference/`. Hook, onboarding, recap, `SceneHeader.tsx`, `Topic10Lesson.tsx` and the shared `src/components/lesson/` are byte-identical to before. The lesson stays archived (`ARCHIVED_TOPIC_IDS`, `archivedScenes`, navigation and numbering untouched).

**Copy.** The pre-change topic-10 files were copied aside before work began. A script (TypeScript AST: every JSX text node + every Hebrew or capitalised-Latin string literal outside `className`/`cn()`/imports) confirmed all 190 strings of the three scene files are still present verbatim in the scene file or its new sibling. Strings that used to live inline in the old SVGs ("צלף בקצה הרחוב (Enfilade)", "— פני הקרקע —", the site letters H/M/S/W/U/P …) now sit in label constants in the scene file and are passed to the illustration, so every illustration file is copy-free. The only new strings: the replay button's aria-label, reused verbatim from lesson 6 ("הפעלה חוזרת של ההדגמה"); tablist aria-labels and the position chips' aria-label ("הכוח שלנו 1–3") reuse existing strings; in-illustration labels reuse terms already in the same scene ("צלף", "Enfilade", "ריצת עכברים", "פיר במרתף", "מטרה", "כוחותינו", "גובה הרחוב") or are numbers/units (scale bars "200 מ׳", "10 מ׳"; axis tick "+5 מ׳").

**Verification route.** As for lesson 12: a whole archived topic has no `/archive/topic-10/<sceneId>` page (that route serves only `archivedScenes` entries). QA used `/lessons/topic-10/#scene-<id>` behind the archive gate, 1440 × 1122, normal and reduced motion; an audit pass measured every rendered text node (SVG included) for < 13px and for SVG labels clipped by their frame — zero of each in all three scenes, every state.

**Shared conventions applied.**
- **Corners:** `rounded-xl` controls, `rounded-2xl` cards, `rounded-full` pills; every `rounded-[3px]`/`[4px]` in the three files is gone.
- **Orange:** decorative orange (eyebrows, card h3s, property icons, callout icons, the school's identity colour, the "street" dimension's identity colour) is now ink or brand green. Orange is left on active tabs/chips/toggles, the selected site/position, the rat-run route and focus. SceneHeader title highlights stay (UI-cleanup round).
- **Feedback colours:** the corridor toggle's active state, the corridor banner and the "advantages" box moved from neon `status-ok` to brand greens / the standard active treatment.
- **Text size:** everything under 13px in the three files (10–12px eyebrows, legends, English sub-labels, altitudes, examples) is now 13px — size only.
- **RTL:** `border-r-4` → `border-s-4`, `text-right` → `text-start`, the pattern bar's `rounded-l-full` → inset `rounded-full`. Tabs are `role="tab"` with arrow keys in visual order (ArrowLeft/ArrowDown = next). Signed axis labels ("-10 מ׳") get a render-time LRM (`bidiNum`) so the sign stays before the digits; the string itself is unchanged.
- **Labels:** white pill plates (`Plate`, measured, clamped inside the frame) instead of the old white stroke halos. `Plate`, `ForcePuck`, `ThreatMark` and the illustration palette are exported from `UrbanMorphologyMap.tsx` and reused by the other two files. The timeline engine (`useSequence`, `useSvgId`) is imported from topic-06 `CombatNavVisuals.tsx` — a cross-lesson dependency.
- **Dashes:** dashed = exposed / hostile only (fire lines, unseen threats, rat-run street crossings, the "360°" exposure ring). Protection rings, the UN compound wall, the 8 m reference ring and the free position marks are solid and faint.
- **Motion:** no infinite SMIL/framer loops remain. Demos play once per selection (or once on scroll for the two callout diagrams), with a replay button hidden under `prefers-reduced-motion`; reduced motion shows the end state.

### 10.1 urbanmorphology — `UrbanMorphologyMap.tsx`

**Drawn.** Two street models, each at its own scale because the scene's own numbers (an 800 m avenue vs. alleys under 8 m) cannot share one. The grid is 8 × 7 blocks split into houses, 1 unit = 6.4 m, with a double-width main avenue closed at its east end by one building — the sniper sits in its window. The casbah is a hand-drawn network of winding alley centre-lines (1 unit = 1 m) cut through an irregular roofscape, with two dead ends, a small square and one roofed passage. Each map has a scale bar.

**Precise vs. schematic.** Line of sight is computed, not drawn: the model is rasterised into a free-space mask and the lit area is a visibility polygon cast from the force (2048 rays, stop at the first wall). Every street cell outside it is hatched dead space; each threat switches between hollow (in dead space) and solid with a dashed fire line (mutually visible) by the same ray test. Grid position 1 is exactly 800 m (125 units) from the sniper, so "קו ראייה ארוך · 800 מ׳" is drawn only there, on a dimension line; position 2 (a junction) sees him at ≈447 m; position 3 (a parallel street) does not. In the casbah, position 1 sees 6.0 m at most, so "קו ראייה קצר מ-8 מ׳" and an 8 m ring are shown only there; position 2 meets the ambush at 5.5 m and position 3 the IED at 5.3 m around a bend; the hidden gunman in the dead end is never visible. Block sizes, house splits and alley widths are illustrative.

**Behaviour.** The two pattern buttons are tabs (the map is their panel). Three force-position chips (1–3) are the keyboard path; the numbered marks on the map are mouse targets. Re-clicking the selected position, or clicking empty map, clears the selection (plain map, no LOS). Switching pattern resets to position 1. The lit area spreads from the force once per selection. The legend's "איום פוטנציאלי" shows both threat states.

**Enfilade diagram.** A crop of the same grid model: the avenue swept end to end by fire from the sniper, then the rat-run ("ריצת עכברים") route through the houses of the row facing the avenue — solid (covered) inside buildings, dashed (exposed) across the cross streets, which the sniper cannot see. It plays once when scrolled into view.

### 10.2 threedim — `ThreeDimVisuals.tsx`

**Drawn.** One section model — ten buildings with floor bands, ground floors and basements; the main street with two soldiers, a tank and a parked car; a side alley; a tunnel network with a deep branch, two chambers and six shafts to basements or the street — feeds both the main section and the "עקרון השילוב" diagram.

**Precise vs. schematic.** The vertical axis is piecewise and says so: +5…+150 m compressed, the 0–5 m street band expanded (people and vehicles must read), 0…−30 m in between, with break symbols on the axis and a tint on the expanded band. The old tick labels were not to any scale (+150 and +50 nearly the same spacing) and were clipped off-frame under RTL; they now sit on the axis at their true positions in each band. Horizontal distances are illustrative. Each band's four threats are pinned 1–4 where the scene's list puts them (roof RPG, high-window ATGM onto the tank roof, window drop onto the street, rooftop OP; IED in a parked car, side-alley fire, the next street corner, face to face; a shaft behind the force, a booby-trapped basement opening, an abduction shaft, weapons moving under the street).

**Behaviour.** The three dimension buttons are tabs; the threat list is numbered with the same red discs, and hovering a list item rings its pin (and vice versa). Clicking a band selects it; clicking the active band again clears the selection and hides the details panel. Each band plays one demo on selection: above — observation fan, ATGM onto the tank roof, a drop from a window, the sniper's shot; street — fire converging from above, the side and below, then a 360° ring; below — a fighter travels the tunnel and surfaces behind the force. The combined diagram (same model, cropped) plays once on scroll: the sniper fires from a roof, drops through the building to the basement shaft, runs the tunnel and surfaces on a roof at the far end of the city while our force breaks into the now-empty building.

### 10.3 civilian — `CivilianMap.tsx`

**Drawn.** A schematic district plan (north up, no scale): a main E–W road, the main N–S road the corridor uses, a secondary grid, generated building footprints, a park. The six sites are drawn as their own buildings (hospital H-plan, walled UN compound, mosque with minaret, L-shaped school, water tanks, media tower) with a protection ring each; the target (מטרה) sits between the hospital and the mosque, as in the dilemma paragraph; our forces (כוחותינו) attack it from the east along the main road. Ring size is uniform — the copy gives no ranking to draw.

**Behaviour.** The six site buttons are tabs; clicking a site on the map selects it, clicking it again or empty map clears it (details panel hidden). The corridor toggle (`aria-pressed`) draws the corridor south→north along the N–S road and plays once: civilians move north, aid trucks come in, and the attack axis halts at the corridor with a stop bar for as long as it is open. The previous map drew the corridor west–east along the bottom edge.

### Content conflicts flagged (not fixed — copy unchanged)

1. **10.3 corridor direction.** "אזרחים יוצאים מאזורי לחימה דרום-צפון" — direction of movement vs. axis is ambiguous. Drawn as movement south → north.
2. **10.3 missing refugee camp.** The dilemma paragraph names "מחנה פליטים מאוכלס", but the map is "6 אתרים רגישים" and has none. Not added (it would make seven).
3. **10.3 visible backslash.** The dilemma paragraph renders "אמנת ז\'נווה" with a literal backslash (a `\'` escape inside JSX text). Fix = delete the backslash.
4. **10.1 "קו ראייה קצר מ-8 מ׳".** Reads as "from 8 m"; interpreted as "shorter than 8 m" and drawn only where the computed sight is < 8 m.
5. **10.2 GPS claim.** "אין קליטת GPS, כך שאי אפשר לאתר אותך מרחוק" — GPS is receive-only, so lack of reception does not prevent being located. Worth a fact check.
6. **10.2 escape from height.** Advantage "לברוח ולהיעלם דרך מעברים פנימיים בין בניינים" vs. weakness "קשה לו מאוד לברוח מהר ממגדל גבוה". Drawn as escape through a connected mid-rise building; the towers stand alone.
7. **10.2 axis not to scale.** Without new copy the piecewise axis can only be signalled graphically (break marks + band tint). A short note such as "קנה מידה משתנה" would need owner-approved copy.

**Dev note.** As the lesson-12 entry says, `NEXT_DIST_DIR` does not keep `next build` out of the shared `.next`. This round's verification build (exit 0) ran in the main folder and did write into `.next`; the shared dev server on :3000 returned 500 for a while and recovered on its own. QA used a private dev server (`NEXT_DIST_DIR=.next-t10`, port 3010). Use a temporary git worktree for future verification builds.

## 2026-10-04 — MVP upgrade of lesson 11 interactions (archived, copy unchanged)

Same method and conventions as the 2026-09-27 round for lessons 2 & 6 (see that entry). Scope: the three learn sub-topics of topic-11 (`depth`, `buffer`, `borders`); lesson 11 has no reference screens in `design/reference/`. Hook, onboarding, recap and the shared `src/components/lesson/` (including the `InsightCard` in 11.3) were not touched. The lesson stays archived (`ARCHIVED_TOPIC_IDS`, `archivedScenes`, navigation and numbering unchanged).

**Copy.** All 232 user-facing strings of the three scene files at HEAD (82 / 73 / 77) were snapshotted before work began. After the work, a script confirmed every one is still present verbatim in the scene file or its new sibling (`DepthVisuals.tsx`, `BufferVisuals.tsx`, `BordersMap.tsx`). That includes aria-labels, chip and tile labels, and the English sub-lines. The only new string is the replay button's aria-label "הפעלה חוזרת של ההדגמה", reused from the lesson 2/6 round. Labels inside the illustrations are the scenes' own terms (the old SVG labels, "חוזק" / "חולשה", "ק"מ") or numbers, and they are passed in from the scene files. The depth readouts now print thousands separators ("4,500" instead of "4500"), matching the ruler and the cards.

**Verification route.** As for lesson 12, `/archive/topic-11/<sceneId>` does not exist (that route only serves `archivedScenes`). QA ran at `/lessons/topic-11/#scene-<id>` behind the archive gate, at 1440 × 1122. A script checked that every visible text (HTML, and SVG after viewBox scaling) is at least 13px, that every SVG `<text>` sets `textAnchor`, and that no label spills or overlaps. It ran on the default states and on all six border types × {idle, חוזק, חולשה}. The depth and buffer demo states were checked by screenshot. The visual-qa, rtl-qa and cartographic reviewers ran on all three scenes, and their in-scope findings were fixed (see "Reviewer follow-ups").

**Shared conventions applied.**
- **Corners:** every `rounded-[3px]` / `[4px]` is gone. Controls use `rounded-xl`; cards fall back to `surface`'s `rounded-2xl`.
- **Orange:** decorative orange (eyebrows, dots, card h3s, icons) is now ink or brand green, and the per-type and per-doctrine category colours are removed. Orange remains only on:
  - selections: the picked preset, ruler row, tab and hotspot;
  - controls and values: the slider fill and thumb, the active doctrine zone, the depth bar;
  - demo marks: the buffer warning bracket and detection pulse, and the highlighted effects in the border demos;
  - focus rings.
- **Title highlights:** the SceneHeader highlight spans were recoloured brand-dark, not unwrapped. Unwrapping belongs to the UI-cleanup round.
- **Status colours:** "מה זה מאפשר" and "חוזק" moved from neon `status-ok` to brand greens. "חולשה" moved from amber `status-warn` to `status-danger`, pairing it with "מה זה לא מאפשר". `status-danger` also stays on the two alerts, "⚠ סכנה קיומית מיידית!" and "⚠ אין הגנה".
- **Text size:** every 10–12px label in these files is now 13px or more.
- **RTL:**
  - `text-right` → `text-start` and `sm:text-left` → `sm:text-end`;
  - `rounded-l-full` → `rounded-e-full` on the active-item bars;
  - the `right-0` bars and `style.right` ticks are now logical positions inside `dir="ltr"` scales.
- **Motion:**
  - The old infinite loops are gone: the looping attack arrow, the pulsing capital ring and the looping enemy dot.
  - Demos play once per selection, and only while on screen.
  - The replay button is hidden under `prefers-reduced-motion`, which shows the end states instead.

### 11.1 depth — `DepthVisuals.tsx`

**One log scale.** A single 10–4,500 km log scale is shared by the slider, the cross-section axis and the comparison ruler.
- **Slider:** an unrolled scale that runs left→right (10 km at the left) and is not mirrored for RTL. Its labels 10 / 500 / 2,000 / 4,500 now sit at their true positions with tick marks; they used to be evenly spaced.
- **Steps:** 1 km below 100, 10 km below 1,000, 50 km above. On the old linear track, 10–100 km was about 2% of the length and Israel's 14 km was off the step-10 grid; both are now reachable, by drag and by keyboard. Five notches mark the example countries.

**Cross-section.** A schematic papercut side cut:
- enemy land (brick) on the left, a border post, our land with towns, and the heartland at its log position;
- a log axis has no zero, so the border sits one step before the 10 km tick, behind an axis-break mark;
- axis ticks at 10 / 100 / 1,000 / 4,500 km, and an orange bar for the current depth;
- the four doctrine zones use the scene's thresholds (30 / 200 / 1,000 km), now shared constants. The 30 and 200 breaks carry ticks, the active zone is orange, and each zone's doctrine name is in an SVG `<title>`.

The doctrine chip and card are now ink and brand (user decision); risk reads from the zone band instead.

**Demo.** A settled selection starts the demo: a preset, a ruler row, or 450 ms after the slider stops.
- The attack arrow runs from the border to the heartland once.
- An elapsed-time chip counts up to the value in the "זמן עד הגעה לבירה" tile. It uses the same formula: 30 km/day with a half-day minimum.
- There is a replay button.

**Selection.**
- The preset buttons and the ruler rows share one "picked country" (`aria-pressed`). Clicking it again clears it, and so does dragging the slider. The picked country's card gets an orange ring.
- The ruler bars run left→right on the shared scale. The picked bar is orange, the others brand green, and an orange hairline marks the slider's current depth.

### 11.2 buffer — `BufferVisuals.tsx`

**Drawn.** A plan view of the approach to our line, at one scale: 12 SVG units per km, with a 0–5–10 km scale bar. Enemy land is on the left and our land (a town and groves) on the right. It is accurate to the scene's numbers and schematic otherwise:
- **Physical buffer:** a 4 km hatched strip. The text says "קילומטרים ספורים", and the DMZ example is ~4 km.
- **Fence:** a 1 km detection band.
- **Seismic sensors:** an 8 km band, with buried nodes drawn inside it.
- **Radar:** a sector from a mast 7.5 km behind our line. Its arc reaches 25 km in front of the line at the lane.

The footprints show the stated detection ranges, not sensor physics. The sensor blue and radar violet stay inside the SVG; their text labels use darker variants for contrast.

**Demo.** Every layer change starts the demo:
- An enemy unit advances from 29 km out at constant speed.
- It is drawn with a dashed outline while undetected, and turns solid with an orange pulse once it enters the outermost active footprint.
- An orange bracket then marks the warning distance to our line, labelled with the scene's warning-time text.
- With no collection layer, it is noticed only at the line ("מיידי בלבד"). With no layer at all, "⚠ אין הגנה" also shows.

**Layout.** On desktop the board is sticky (`lg:sticky lg:top-24`, `self-start`), so the map stays beside the open accordion items. It no longer stretches into a letterboxed SVG. The accordion stays the control (open = layer on), and Radix provides the keyboard path. The detection range now comes from one `LAYER_RANGE_KM` table; the results are the same as the old nested ternary.

**Examples.** Each card has a width gauge on a shared 0–10 km tape (left→right): 4 / 10 / 7 km. For Cyprus, 7 km is the maximum width.

### 11.3 borders — `BordersMap.tsx`

**Drawn.** One plan-view frame serves all six types: מדינה א' and מדינה ב', with the feature drawn as the border itself. The old drawings put a mountain glyph above two country strips. It is schematic, not to scale:
- **Mountain:** a ridge with two passes and guard posts.
- **River:** a meandering river as the boundary, one bridge, and a summer ford where it narrows.
- **Coast:** A's coast, open sea, and B's coast with a beach and a port.
- **Desert:** a sand belt with dunes, the border running through it, and B's observation and patrol posts.
- **Latitude:** a straight line through three villages, a hill and a river. A is to the north and B to the south, because the label says "קו רוחב".
- **Political:** a zigzag line on featureless ground, with the 1916 agreement stamp.

Labels are white pills (no stroke halos) and are drawn above the demos.

**Hotspots.** Each type has two, "חוזק" and "חולשה", placed where that strength or weakness lives. Each demo plays once:

| Type | חוזק | חולשה |
|---|---|---|
| Mountain | advances stopped at the guarded passes | the road between the two towns detours over the pass |
| River | the blown bridge stops the column | a crossing at the summer ford that fans out |
| Coast | invasion fleet plus air route | missile arc to the port |
| Desert | dust plume spotted from the post | smuggler paths between the posts |
| Latitude | the line drawn with a ruler | families crossing in the cut villages |
| Political | the stamp is pressed and the line recognised | the stamp cracks and escalation comes from both sides |

- A selected hotspot rings its matching card below and gets a replay button.
- It is a `role=button` with `aria-pressed`, and `aria-describedby` points at that card's text.
- Selecting it again, clicking the empty map, or switching type clears it.

**Keyboard.** The six cards are a tablist: roving tabindex, ArrowLeft = next in RTL, Home/End. Only the active type's two hotspots exist, so they are the only map stops in the Tab order. The focus ring shows only on keyboard focus.

**Line language** (after the cartographic review):
- State borders are dash-dot everywhere, in this map and in the buffer map.
- Plain dashes are kept for covert or indirect movement: smugglers, the missile arc, and the attempted direct road.
- Solid brick is an overt advance; the air route also carries a small aircraft.
- Ink is civilian or neutral movement.
- Orange is the selected effect or highlighted route. The mountain detour is the civilian trade route, not an enemy advance.

**Colours.** The per-type text colours are removed: the title is ink, and the icon and stat bars are brand-dark.

### Reviewer follow-ups

- **Not done, because they need new copy:**
  - a legend for the line language;
  - text labels for the doctrine zones, the port, the ford and the warship (glyphs and `<title>`s carry them for now).
- **Not done, out of this round's scope:**
  - Wide `tracking-*` on Hebrew labels ("מה זה מאפשר", "דוקטרינה כפויה", "תוצאה") belongs to the UI-cleanup round.
  - A shared diagram kit is a follow-up refactor. `useDemo`, the palette and small glyphs are duplicated across the three visuals files.

### Content conflicts flagged (text not changed)

Drawn per the reasonable interpretation:
1. **Depth · Israel.** The card says "≈ 11 שעות עד לב המדינה", but the computed tile and the demo show "12 שעות". The formula has a half-day minimum: 14 / 30 = 0.47 day → 0.5.
2. **Depth · USA.** The card says "לא רלוונטי — אוקיינוס חוצץ", with the doctrine "הגנה מעבר לים (Forward Defense)". At 4,500 km the slider computes "150 ימים" and shows the doctrine "ספיגה והתשה".
3. **Depth · Russia.** The card gives 4,000 km "מהגבול המערבי למוסקבה", yet the same card says that after losing "…ואפילו פאתי מוסקבה" there are "2,500 ק"מ של מרחב מאחור". Moscow is about 400–500 km from the western border. Drawn as given: the heartland is at 4,000 km.
4. **Depth · USA.** The card gives 4,500 km "מכל גבול ימי לוושינגטון", but Washington is near the Atlantic coast; 4,500 km is about the coast-to-coast width. Drawn as given.
5. **Buffer · physical strip.** The layer text says the distance itself delays the enemy, but with only that layer on, the chip reads "זיהוי 0 ק"מ · התרעה מיידי בלבד". Drawn per the chip: the unit crosses the strip undetected.
6. **Buffer · fence.** The text says "מתריעה רק כשנוגעים בה — כלומר לא מספקת עומק התרעתי", but the chip says "זיהוי 1 ק"מ". Drawn per the chip, as a 1 km band.

Facts for the content owner to verify (they do not affect the drawings):
- **Haifa:** about 35–40 km from the Lebanese border; the card says 60.
- **Kyiv:** about 250–300 km from the nearest Russian border; the card says 600. "תל אביב ללוקסור" is about 700 km.
- **"מלחמת יום הכיפורים (1974)":** the war was in 1973; the disengagement agreement was in 1974.
- **Himalayas:** the card says they "שמרו על שקט … במשך אלפי שנים", but the 1962 Sino-Indian war was fought there.
- **US–Mexico:** given as a latitude-line example; check it.
- **11.3 order:** the intro promises natural → artificial, "מהטבעיים והיציבים ביותר", but coast (5/5) comes after river (4/5).

**Dev note.** This confirms the lesson-12 note: a `next build` in the main folder compiles into the shared `.next`. One such build was started by mistake in this round and stopped after about 30 s. It had already written to `.next`; the shared dev servers on ports 3000 / 3001 / 3007 had been returning 500 since before it ran. The verification build ran in a temporary worktree (HEAD plus the 6 topic-11 files) and passed. That worktree is removed. The QA dev server used `NEXT_DIST_DIR=.next-t11` (dev only, port 3011); it is stopped, and its `tsconfig.json` include line and `.next-t11/` folder are removed.

## Topic 02 — Geology: rain and processes in "כוחות חיצוניים" (2026-10-04)

- **The cloud is now in the world.** It is a ray-marched cumulus (soft ellipsoids, a flat grey base, lit by the scene's sun) hovering ≈ 50–100 units above the mesa's front rim. It casts a soft shadow on the plateau behind and east of it. **Assumption:** the cloud hovers low, as in a diorama. With this steep camera, a cloud at a realistic height would sit above the frame.
- **Rain in space.**
  - Drops leave the cloud base and fall with one wind slant (west, the same wind as over the dunes) until they meet the land.
  - Near drops fall past the cliff face onto the scree. The middle bands land on the plateau just beyond the rim. The farthest band falls just behind a low knoll, which hides where those drops land; the rain sheet behind the knoll is cut by its crest.
  - There are four depth bands. Far drops are thinner, fainter and hazier than near ones.
  - Visibility is computed per point of each fall from the render's depth buffer and the cloud's on-screen opacity. The cloud hides the top of most drops, which emerge below its base. 40 of 132 drop paths have their lower part hidden by the knoll.
  - **Assumption (new relief):** a low, rounded knoll on the plateau, behind the rim and under the far half of the shower. It is ≈ 15 high and ≈ 72 × 32 across: a swell of the plateau surface itself (same soil, pavement and scrub; its sunlit face toned down so it does not read as a bright mound), long and gentle toward the viewer, steeper at its back. **Why:** nothing in the existing terrain stands between the camera and the shower's lower ends. Ground hidden from the camera exists only along the stream canyon's walls, a few dune lees and the mesa's far west flank. Moving the rain there would lose the cliff, scree and runoff story, or crowd the "ערוצי נחל" and "רוח" labels. Mapped in the Task 2 workspace: `t2/shots/hidden.png`. It changes no educational content.
- **Runoff.** **Assumption:** three shallow dry rills (wadi channels, ≈ 1–1.4 deep with a bed that only falls downstream) are carved from the scree apron under the shower, across the plain, into the stream. Without them the plain was flat with pits, and steepest descent stopped at the scree foot. They read as faint grooves in the painting. The animated rivulets follow D8 steepest descent on the height field from four points where drops land on the scree.
- **The stream** flows toward the viewer and out through the cut (**assumption:** there is no slope in the data). After the rain, the water below the junction swells: it turns silty, widens slightly and flows faster.
- **Sand.**
  - In each gust, grains hop up the windward (east) slopes of seven automatically chosen crests (spread out, clear of the dunes label), cross the crest and settle on the lee.
  - Spindrift wisps stream off the crests.
  - The grains are drawn sunlit over the shaded windward slopes, with small shadows below them, so the hops read at 1:1.
- **Rockfall.** The trajectories come from a small physics simulation (a block of radius 3, gravity, bounces, rolling resistance) on the height field, starting from the cap rock west of the shower. One block falls per cycle, and the three paths alternate. It comes to rest on the lower scree and fades before the next cycle, so blocks never pile up.
- **One 15 s cycle.** The stream's gentle flow runs throughout.

| Process | Timing |
|---|---|
| Rain | 0.3–5 s |
| Runoff | Wet front leaves at 1.2 s and reaches the stream ≈ 3.3 s. Water runs until ≈ 7 s; rills dry by 10 s. |
| Stream swell | 3.6–10.4 s |
| Gust over the dunes | 7.6–11.4 s |
| Rockfall | Loosens at 11.5 s, rests ≈ 13.2 s, fades 14.1–14.9 s |

- **Wind streaks.** **Assumption:** they stay faint (20 %) while the air is calm and sweep downwind with each gust.
- **Reduced motion.** One still moment, t = 3.4 s: rain at depth (some of it falling behind the knoll), the rivulets reaching the stream, static wind streaks, every label.
- **Labels.** The strings are unchanged.
  - "גשם" points to the rain under the cloud's west end.
  - "מצוקים" and "דרדרות" point to the cliff and scree east of the shower, which stay clear of rain. The rockfall happens west of the shower.
- **Code.**
  - The exogenic overlay lives in `ExogenicActivity.tsx`.
  - Its geometry is generated into `exogenicOverlay.data.ts` by `scripts/media/render-geology-forces.cjs` (`--only exo` or `--overlay`).
  - The shared process clock no longer steps backwards on its first frame: a rAF timestamp can precede the effect's start.

## Topic 02 — Geology: the rock player becomes an automatic illustration (2026-10-06)

- **No controls.** The play/pause button and the scrubber under the rock figure are gone; the film is an illustration inside the screen. Nothing else on the board changed.
- **One clock** (`RockDiorama`):
  - The process plays once when at least 35 % of the figure is in view, and holds its final state.
  - **Assumption:** "fully left the viewport" means no part of the figure is intersecting the viewport. Only then does the process reset, so the next view replays it from the start. Scrolling it partly out of view and back keeps the final state.
  - A tab switch remounts the figure, so it replays.
  - The clock stops while the figure is below 35 % or the document is hidden. A long hidden gap never skips ahead (each frame advances at most 100 ms).
  - Reduced motion: `p = 1`, final labels, no autoplay, no replay.
- **Fallback without WebGL** uses the same clock for the START to END cross-fade.
- **Films declare their images.** `FILMS[kind].images = { start, end, aux? }`. Igneous keeps its photographs and shader; sediment and metamorphic are painted scenes.
- **AUX texture API** (`createTimelapse(canvas, images, fragment)`):
  - The optional third image is bound as `uniform sampler2D uC` (texture unit 2, declared in `GLSL_PRELUDE`).
  - It is uploaded as RGBA with `LINEAR` filtering, `UNPACK_COLORSPACE_CONVERSION_WEBGL = NONE` and `UNPACK_PREMULTIPLY_ALPHA_WEBGL = false`, so data values arrive unaltered.
  - A film without AUX gets a 1 × 1 black texture on `uC`.

## Topic 02 — Geology: the sedimentary rock is a painted scene (2026-10-06)

- **What changed.** The "סלעי משקע" tab of the rock board no longer plays the photo time-lapse. It shows a painted terrain in the forces board's language: the same camera family, brush finish and paper grain.
  - The scene is painted by `scripts/media/render-geology-rocks.cjs` into `public/assets/lessons/topic02/scene-geology/rocks/` (`sediment-start.webp`, `sediment-end.webp`, `sediment-aux.png`, 250 KB together).
  - The old `sediment-start/end.webp` photos stay on disk, unreferenced.
- **Scene.**
  - Eroding hills across the back. A stream comes down a valley from the top left (clear of the specimen card) into a shallow bay.
  - The near edge is cut open over a third of the frame height.
  - **Assumption:** the cut shows the basin eroded into older, tilted, darker rock. Its walls step down along the tilted beds, with a bench part-way down, and its floor is uneven. The new horizontal beds lap onto those walls, so they read as new.
  - The water in the section is painted with horizontal strokes and soft mottling. It is darker toward the floor and beside the walls, with a soft light band under the surface.
  - **Assumption:** the limestone is two beds, the upper one full of fossils, under the one label "גיר". The order bottom → top stays גיר / אבן חול / חוואר, with a thin soil on the marl at the end.
- **Process.** 12 s; `p` windows live in `SED` in `RockVisuals.tsx`, geometry in the AUX map.

| Stage | p |
|---|---|
| The muddy plume reaches out from the stream mouth | 0–0.08, then a tongue out of the channel's tip at the delta front |
| Limestone settles (silt clouds the water in the cut, a few grains fall) | 0.10–0.21 |
| Limestone with fossils | 0.26–0.37 |
| Sandstone (sand-coloured silt) | 0.42–0.50 |
| Marl (grey-green mud); where the delta reaches the bay behind the cut, the water lens there fills with marl, never before 0.55 | 0.55–0.62 |
| Pauses at the bedding planes (clear water, a trickle of grains; the growth arrow holds while the bed below compacts) | 0.21–0.26, 0.37–0.42, 0.50–0.555 in every column of the cut |
| The delta grows from the mouth; the strip along the cut fills last and the sea is gone | 0.10–0.61 |
| Each bed compacts and cements once buried, youngest last | limestone 0.26–0.48, fossil limestone 0.42–0.62, sandstone 0.55–0.78, marl 0.66–0.94 |

- **The delta.**
  - The bay fills as a lobe from the mouth along the stream's channel. Its tongue runs toward the cut and it widens behind it, so the side shores fill later.
  - The waterline is crisp, with a narrow sandy shoal just ahead of it.
  - New land is bare silt at first: damp and dark at the waterline, then drying pale. The END plain and its scrub grow in after a lag, and by the old coast the new land joins the old land without a seam.
  - The AUX B channel stores the lobe size at which the delta covers each point (o = 1 − e^(−a / 170)). The shader inverts it, so the waterline, shoal and plume keep their width in world units.

- **Loose → rock.**
  - A freshly settled bed is 30 % thicker, paler, softer and grainy.
  - Once it is buried it thins back. Cement spreads up through it from its base, with a damp line marking the front, until it is the rock of the END painting.
  - Pore water rises as small pale specks through compacting beds.
  - **Assumption:** the deposit cannot rise above sea level before the bay has filled. The marl fills the room that compaction makes, so the land surface never bulges above the plain.
- **Water over the pile.** Silt clouds it while a bed settles, most near the surface and toward the delta's channel, in slow sinking wisps. A few muted grains in the bed's colour fall through it. **Assumption:** the cloudiness carries the effect rather than bright particles, which the style forbids.
- **Fossils.** The shells are painted as domed shells lit from the upper left, with soft growth ridges and a soft shadow, and no outline. They are larger and fewer than before.
- **Motion drawing.** The plume, the falling grains, the pore water, the stream's ripples and drifting silt are drawn by the shader in the one canvas. The SVG overlay only carries the growth arrow and the labels.
- **Labels and arrow.** Strings and staging are unchanged.
  - The bed labels sit on their beds at x = 320.
  - "מיליוני שנים" sits at the foot of the growth arrow (x = 190). The arrow rises from the basin floor, and its tip follows the deposit's top with the same stacking as the shader.
- **Assumption — size.** At a 1440 px viewport the rock figure renders about 579 px wide, not 830. Grains, specks and fossils were sized to read at 579 px.
- **Description.** Only the prefix changed: "צילום בהילוך מהיר:" → "איור:".
- **Code.**
  - The painting kit shared by both render scripts now lives in `scripts/media/lib/painted-terrain.cjs`, parameterised by frame and camera; `render-geology-forces.cjs` imports it.
  - The forces output is unchanged: re-rendering all eleven images and `exogenicOverlay.data.ts` gives byte-identical files (max pixel difference 0).
- **AUX map** (`sediment-aux.png`, 640 × 366, raw data):
  - R, G: the flow phase along the stream and the delta's axis.
  - B: the shoreline's order, o = 1 − e^(−a / 170), with a the delta's lobe size in world units. The strip along the cut stays below 0.98, so every point is land at the end.
  - A: the flow weight, never below 128 so no browser loses data to premultiplying.
  - Rows 361–365: the cut's final bed tops per column, as 16-bit values.

## Topic 02 — Geology: the metamorphic rock is a painted scene (2026-10-06)

- **What changed.** The "סלעים מותמרים" tab of the rock board no longer plays the photo time-lapse. It now shows a painted terrain from the same set as the sedimentary tab and the forces board: the same camera family, cut depth, brush finish and paper grain.
  - The scene is painted by `scripts/media/render-geology-rocks.cjs --only metamorphic` into `public/assets/lessons/topic02/scene-geology/rocks/`: `metamorphic-start.webp` (109 KB), `metamorphic-end.webp` (123 KB) and `metamorphic-aux.png` (18 KB), 250 KB together.
  - The old `metamorphic-start/end.webp` photos stay on disk, unreferenced.
- **Scene.**
  - A mountain belt seen obliquely. Its folded ridges run back from the viewer into a high range and plunge out onto a plateau that rests on flat beds. Flat-bedded ledges step across the plateau, and a dry wash runs down the middle valley.
  - The near edge is cut open over a third of the frame. The cut shows flat beds of limestone interbedded with dark, fissile shale. Two of the limestone beds are rich in fossils, drawn larger than in the sedimentary scene so that their flattening reads at the figure's size.
  - The limestone stands out in jointed ledges, and the shale weathers back into their shade.
  - The top-right corner, under the specimen card, holds only the distant range.
  - **Assumption:** the ridges sit over the anticlines of the cut, the eastern one larger. In the END painting they have grown out to the near edge: the deformation front of the belt has advanced onto the plateau's flat beds. The surface at the near edge rises about 6 units over the synclines, about 19 over the western anticline and about 24 over the eastern one.
- **The deformation** (`MET` in the script; `RockVisuals.tsx` copies XC, K, TH, WTOP, ZT and BASE).
  - The section shortens by 12 % toward its middle, thickens 5 % and folds. A rock point (X, Z) of the flat beds moves to x = XC + (X − XC)(1 − K·f) and z = Z(1 + TH·f) + f·Fd·(1 + (WTOP − 1)·Z / ZT).
  - Fd is the fold at depth in the point's final column, stored as an AUX table. The inverse is exact.
  - **The folds are not twins.** Two anticlines each have their own crest, height and limb widths: at x ≈ 168 (height 46) and x ≈ 472 (height 66). Both lean east, with a short steep east limb and a long west one. Their hinges are rounded. Small Z-shaped parasitic folds sit on the long west limb of the eastern anticline. Open synclines lie between and at the sides.
  - **Assumption:** the folds are strongest at depth, where the rock is hot and ductile, and gentle at the surface (WTOP 0.26).
  - **Assumption:** the anticlines grow up from the base and the synclines stay on it (Fd ≥ 0). So no rock that is in view ever moves below the frame, and its final place is always in the END painting.
  - The rock under the base that is lifted into the anticline cores continues the sequence downward: a limestone under the basal shale, and so on, repeating every 47 units. It is not a mirror image, so the cores show no stacked chevrons.
  - The rock beyond the frame's sides, which the shortening brings in, is the mirror image of the rock inside.
- **END painting.**
  - The marble has flowed into the hinges and thinned on the limbs, and each contact pinches and swells on its own, so the bands vary in thickness. Because of this, the bands in END differ from the START contacts by up to about 2 units, which shows only at the moment a grain changes.
  - The marble stands proud of the face: lit along its top and shaded underneath. The slate is recessed into the shade under the marble ledge above it. The marble/slate contrast is kept moderate, and each bed has its own shade.
  - Everything in the slate runs along its vertical cleavage. This includes the face's relief: the shared painting kit gained `flags.cleaved`, which turns the cut-face relief to follow the cleavage instead of the bedding. The forces and sediment outputs are unchanged by it.
  - **Assumption:** the cleavage, and the slight vertical drawing-out of the marble's grains, are vertical. That is perpendicular to the squeeze (axial-planar for these upright folds).
- **Process.** 11 s. The `p` windows live in `MET` in `RockVisuals.tsx`, the geometry in the script.

| Stage | p |
|---|---|
| Flat beds at rest ("סלעים קיימים") | 0–0.10 |
| The arrows press in. The beds shorten and fold, and the ridges and the cut's top rise. The arrow tips ride on the rock (x 78 → 107 and 562 → 533). Fold progress f = 1 − (1 − s)^2.2: it starts at once with the arrows, and is about a third done by 0.2. | s = seg(p, 0.10, 0.72) |
| A soft warm zone appears with its label as a faint band at the base (40 % strength, 0.12–0.16). It gains full strength only once the squeeze is under way (0.18–0.32). Its upper edge (the isotherm) climbs slowly to about 52 units in the middle (less toward the sides), with warmth drifting slowly upward through it. | 0.12 →, isotherm 0.12–0.50, holds, fades 0.82–0.97 |
| Well ahead of the front, and never before 0.16, the limestone is flattened: its grains and fossils are drawn out vertically, up to 3× their height, over about 0.2 p. | moves with the front |
| Just ahead of the front, the old grain fades and the new fabric (slate cleavage, marble grain) shows through. | moves with the front |
| The transformation front leaves the hot, squeezed base of the middle and spreads up and outward through the rock. It reaches the top of the middle at about 0.64 and the far top corners at about 0.83–0.88. Limestone turns into pale, sugary marble in patches (the fossils are gone). Shale turns into dark blue-grey slate in thin vertical slivers. | 0.30 → |
| The land takes on the END light over the rising ridges | 0.28–0.90 |
| "שיש וצפחה" | 0.84 → |

- **Labels.** Label staging is content and unchanged, so "חום" appears at 0.12. The warm zone it names appears at the same moment, faint, so the label never floats over nothing; it becomes strong only after the squeeze leads (full at 0.32).
- **No melting.** The heat is a dull, earthy tint mixed into the rock (at most 50 %) that keeps the rock's light and dark. It lightens nothing but the darkest slate, and that only by a few percent. It is never a glow and never liquid. The rock changes only in the solid state, grain by grain, while it keeps its folds.
- **Not a cross-fade.** The cut is re-drawn every frame from the rock's own coordinates: START is sampled where the rock was, END where it will be. The folding, the shortening, the flattening and the front are therefore movements of the rock itself.
  - The land is START lifted and END lowered to the ridges' current height (an image warp). END's light blends in over the window above.
  - p = 0 reproduces the START painting and p = 1 the END painting exactly. The one exception is the bottom 1.2 units of the cut at p = 0.
- **Label anchors.** Strings and staging are unchanged; the anchors moved into the cut:
  - "סלעים קיימים" at (320, 289)
  - "לחץ" under the arrows, at (58, 330) and (582, 330), clear of the specimen card
  - "שיש וצפחה" at (320, 266)
  - **Assumption:** "חום" sits on the warm base at (226, 342), beside the middle rather than over it, so it does not cover the spot where the change begins.
- **Reduced motion** shows p = 1: the END painting with "לחץ" ×2, the arrows and "שיש וצפחה". Without WebGL the existing START → END cross-fade runs.
- **Description.** Only the prefix changed: "צילום בהילוך מהיר:" → "איור:".
- **AUX map** (`metamorphic-aux.png`, 640 × 363, raw data):
  - R: the land's rise at f = 1 as a screen offset, 0.5 + d/64.
  - G: limestone or shale, in the flat-bed frame.
  - B: the middle of the bed / 128.
  - Rows 361–362: START's top of the cut per column and the fold at depth + 128 per final column, each 16-bit.
- **Code.**
  - `--only metamorphic` skips the sediment scene's slow precomputed fields.
  - Both scenes write their AUX maps through the shared `put16` / `writeAux` helpers.
  - Re-rendering gives byte-identical `sediment-*` files and byte-identical forces images and `exogenicOverlay.data.ts`.

## 2026-10-08 — Lesson 2 contours (#scene-contours): lighter mountain, the 2D map becomes a printed topographic map

- **Load weight 22.2 MB → 1.8 MB** (+0.25 MB Draco decoder), by request. All of it comes from `build_contour_mountain.py`; re-run the script, don't hand-edit assets.
  - **Vegetation dropped** (`PLANTS = False`). The trees, boulders and grass tufts were 4.3 MB of the 4.8 MB GLB, plus `leaves.png`/`grass.png`. The tree-shadow term in `macro.jpg` and the leaf litter in the splat go with them. The flag brings it all back.
  - **GLB without UVs or vertex colours:** every runtime shader works from object-space position. Result: 0.37 MB, ~229k triangles.
  - **Photo textures at 512²** (from 2048²). One tile is 4–10 m, so even the closest zoom at 1440 px stays sharp. WebP was tested: Blender's encoder saved only ~5% over JPEG, so JPEG was kept.
  - **Splat at 512²** (0.43 m/px), macro at 1024². PNGs now use Paeth filtering.
  - **Sky HDR at 256×128.** It only lights matte ground.
  - **`contourMountain.data.ts` is byte-identical:** the contours come from the same terrain triangles as before.
  - **3D views are otherwise unchanged,** including "מבט מלמעלה" (the realistic model seen from overhead). An interim version that turned the 3D top view into a flat map was reverted on request.
- **The 2D map (left column) is a printed topographic map, not a picture of a 3D hill** (request: no illusion of a 2D rendering of something 3D).
  - **Removed:** the hypsometric band fills and the shaded-relief overlay. The relief made the map read as a lit 3D surface. `hillshade.png`, its generator and `BAND_COLORS` are gone.
  - **Drawn in the lesson's existing map language** (`topographyTerrainStyle` `MAP`, as on the topography sheet; no new colours):
    - paper, a faint 50 m grid and an ink neatline;
    - brown contours, with the 50 m index contour heavier ("קו גובה ראשי", as defined in this scene's glossary);
    - contour numbers set into their lines on paper plates, in contour brown;
    - the summit as a spot height (ink triangle + 59);
    - a 0–50 m scale bar spanning exactly one grid square.
  - **Kept:** north arrow and the steep/gentle rulers.
  - **Hover:** still lights the band (accent @30% on paper) and the 3D slice.
- **Legend:** the band-colour legend (which also hovered slices) became a map key: "קו גובה · כל 10 מ׳", "קו גובה ראשי", "נקודת גובה".
  - "נקודת גובה" and the interval note are new strings; the terms are standard map vocabulary.
  - Swatch-hover was dropped with the bands. Hovering the map itself still links to the model.

## 2026-10-08 — Topic 06 principles: proposed interaction mockups

- User requested a comparison with lesson 2 and concepts to choose before developing with Claude. No live lesson components were changed.
- Review package: `design/mockups/topic-06-principles-2026-10-08/`. Four proposed stations inside the existing principles subsection; this new internal sequence is a proposal, not an approved product change.
- Built-in Imagegen mockups preserve the existing course palette and desktop frame direction. Generated images are conceptual and do not establish new tokens or exact geometry.
- Lesson 2's current local implementation is the visual reference. It has pre-existing uncommitted changes; those were preserved.
- The landscape is fictional. Final implementation must derive every view from one shared dataset; generated terrain arrangements and map rulers are not authoritative.
- Back-azimuth exercise assumes one horizontal straight segment: outbound 047 degrees / 500 m, return 227 degrees / 450 m leaves 50 m. Corrected return is 500 m.
- North-reference exercise defines magnetic north 8 degrees east of grid north, giving 047 grid / 039 magnetic. This is hypothetical, not local/current declination. True north must be explicitly defined before implementing the three-arrow diagram.
- GPS concept's generated 315-degree / 850-m readouts are illustrative only; scenario values must be authored and verified before development. No fabricated certainty score is proposed.
- Static mockups do not validate interactive behavior, numerical geometry, exact typography, AAA contrast or 3D performance. The review document specifies state behavior, keyboard alternatives and geometry requirements for future work.

### 2026-10-08 — מוקאפים לטכניקות ניווט בשיעור 6

- הבקשה היא להצעות ולמוקאפים בלבד, לפני בחירת פיתוח עם קלוד; קוד השיעורים לא שונה.
- התבליט, המיקומים והמספרים בחבילה החדשה סינתטיים. המפה והתבליט נגזרים משדה גבהים משותף; נכונות תרגילי האימות עוד דורשת תיקוף בהפקת המוצר.
- נבדק אזור תוכן ברוחב 1440px. בשילוב עתידי יש להתאים אותו לרוחב הפנוי לצד תוכן העניינים הקיים; לא נעשתה התאמת מובייל.
- ניווט עיוור ותחקור השגיאות מדגימים מצבים; התחקור כרגע מבוסס על דוגמה קבועה, לא על היסטוריית התנועה האישית במסך הקודם. חישובי המרחק הם במישור אופקי, ללא תיקון לאורך מסלול על מדרונות.
- שפת הממשק נשענת על הטוקנים הקיימים בלבד. הוחזר שימוש בחומר קרקע קיים, אך נוצר תבליט חדש ולא הועתק מודל או מסך משיעור 2.
- פירוט: `design/mockups/topic-06-combatnav-2026-10-08/brief.md`.

### 2026-10-08 — עדכון המוקאפים בעקבות משוב: הוראה מודרכת ובהירה

- המשתמש ביקש להפחית את החום ולהחליף בדיקת ידע והחלטות בליווי יד ביד. הגרסה בתיקיית topic-06-combatnav-2026-10-08 עודכנה בהתאם, כולל הבריף.
- נעשה שימוש בנייר בהיר ובמרווה קיימים; לא נוספו טוקנים. טקסטורת הקרקע משמשת לתבליט עדין ולא לצבע חום.
- ארבע ההמחשות הן דוגמאות פתורות עם צעדים שניתן לחזור אליהם. הן אינן שואלות תשובות או מעריכות ביצוע. נתוני התנועה סינתטיים.
- השינוי מוגבל למוקאפים ולמסמך ההנחות; קוד השיעור הקיים לא עודכן.

## 2026-10-08 — Topic 06 principles: location check without GPS (station 4, developed)

Brief: `design/mockups/topic-06-principles-2026-10-08/claude-location-check-prompt.md`; mockup `04-gps-denied.png`. Replaces the body of `GpsDeniedCard` in `PrinciplesScene.tsx`; the rest of the lesson is unchanged.

- **One world, one source.** `locationCheckScenario.ts` (points, polygons, road control points, readings) → `locationCheckTerrain.ts` (5 m height grid of the brief's H(E,N), 281 × 211, every cell split SW–NE; `heightAt` interpolates on those triangles; contours by marching triangles on the same triangles; trees, scrub and road centre-lines). The 3D mesh, the map's contours, tree symbols and roads, every label anchor and the pick test read these. The height field is the brief's, unmodified; contours lie on the mesh to ~1e-13 m (test).
- **The fork from the observation point.** Seen from P1, F sits on the skyline brow and the slope below it is seen at a ~2° grazing angle. A road arm shows only where it runs roughly toward the observer (its 8 m width then faces the eye); arms that traverse the slope collapse to hairlines (tried: a Y with a stem and two traverses — the traverses vanished). Final shape: the main road arrives at F from the south and the branch leaves west-south-west before turning north round the west shoulder — two tracks meeting at the crest; the main road's continuation crosses the crest and is hidden from P1. F, the end points and all measurements are unchanged; only intermediate control points were chosen. On the map the junction is a clear three-arm Y.
- **Vegetation is a world-level choice, documented:** grove trees 10.5–14.5 m with crowns 3.4–4.8 m (ellipsoids from ~3 m), so G1's crowns clear the low rise ~150 m in front of P1 that hides G1's ground (all 56 G1 crowns visible — test). Scrub (≤ 1.2 m) and near-field grass tufts (≤ 0.6 m) are ground detail below the map's threshold, deterministic, on `heightAt`; scrub is kept out of the 306°–336° sight corridor to G1 within 340 m so it does not hide those crowns.
- **Beyond the sheet** the 3D apron samples the same generator out to 7 km, under haze, for a horizon; it is not mapped. No vertical exaggeration (VE = 1); no plinth.
- **Camera:** fixed at P1, ground + 1.7 m; turn and zoom only (yaw −90°…+90°, pitch ±15°, HFOV 30°–100°); opens at yaw 0, pitch 0, HFOV 100°; vertical FOV from the frame aspect (680 : 264). "הצגת המזלג בתצפית" faces 043° at F's elevation and zooms to 45°.
- **Heading tape** shows view bearings; the view yaw is labelled "כיוון המבט" (not the reading). The compass reading is a marker "מזלג 043°" whose dashed line ends on F; after a check with a mismatched direction a second marker shows the hypothesis' predicted bearing (e.g. "צפוי מאזור 2 008°") dropping to the horizon.
- **Evaluation:** missing selections → a list of the missing steps (no verdict); all selections but an inactive evidence item → "חסר מידע להכרעה"; any contradiction (wrong grove pair, direction off by > 5°, distance outside 260–340 m) → "יש סימן שאינו מתאים להשערה"; success only for the G1↔G1 pair with both evidence items consistent. The candidate id is never compared directly. A changed selection voids the snapshot.
- **Colours (existing tokens only):** matched grove = `accent-cool` (as the mockup's blue, in both views); selected area and selections = `accent`; measured azimuth = `accent-hot` (as the compass above); success = `brand`. Map colours are lesson 2's `MAP` (`topographyTerrainStyle.ts`). Text in the lesson-content system: 16 px black body; map labels ≈ 12–16 px at 1440.
- **Ground textures:** the four Poly Haven CC0 photo materials of lesson 2's contour mountain (`aerial_grass_rock`, `dry_ground_rocks`, `cliff_side`, `forest_leaves_02`) copied to `public/assets/lessons/topic06/location-check/textures/` (lesson 2's files untouched). Their luminance gives detail; an explicit palette sets the colour (raw, they average to orange at eye-level grazing angles). Sun SSE, 33°; the shadow map is drawn once (static world).
- **No WebGL:** `observation-north.jpg` is rendered from the live canvas at the opening look by `scripts/qa/shot-location-check.mjs --capture-fallback`; regenerate it whenever the world changes. Lists, map, check and feedback work in full without WebGL.
- **Departures from the mockup (on purpose):** 315° / 850 m replaced by the scenario's 043° / 300 m; no station tabs (only station 4 is developed); the mockup's three evidence checkboxes became the step lists (grove matching is a selection) plus two evidence toggles; the compass dial in the reading card is replaced by the heading tape in the view; the photo is the live 3D view; the mockup's buildings and orchards are not in the scenario data, so they are not drawn.
- **GPS reasons:** the brief's three titles; descriptions reuse the lesson's existing approved text (the battery item reworded to "סוללה ריקה"). `GpsDeniedIllustration` in `PrinciplesVisuals.tsx` is now unused and left in place.
- ESLint is not configured in the repo (`next lint` asks for setup), so no lint gate ran.

### 2026-10-08 — Location check, redesign: one-screen decision task

Supersedes the layout of the entry above (world, map, measurements and thresholds unchanged).

- **Task:** a decision between two hypotheses — "איפה אתם נמצאים — באזור 1 או באזור 2?" with a "GPS לא זמין" tag. Three choices only (grove in the view, grove on the map, area). Both measurements (043° to the fork, ≈ 300 m paced) are always part of the check; the evidence checkboxes and the "insufficient" verdict are gone from the UI and from `locationCheckState`.
- **Layout (1440 × 1122, card aligned under the site header):** task + measurements on top; observation (right) and map (left) side by side at one height — the grid's column widths follow the two aspects (4:3 and the map frame's ≈ 1.32), so the map is never stretched; each view's choice under it; area choice, check and a fixed 140 px feedback box at the bottom. Measured: card 762 px (84–846), observation 496 × 372, map 492 × 374; no part outside the viewport, no overlaps, body text 16 px.
- **Opening view:** yaw −10°, pitch 0°, HFOV 78° (vertical FOV from the frame, ≈ 62.5° at 4:3). Both groves need ≈ 72° of width, so a 4:3 frame necessarily shows much sky and foreground; the fork (043°) is off-frame right, reached with "הצג את מזלג הדרך" (turns the camera only). "Left"/"right" name the groves as seen in the opening view and never change with the camera.
- **Foreground detail added to fill that frame honestly:** denser low garrigue within 140 m of the observer, loose stones within 90 m, denser grass tufts, and cumulus in the sky. All deterministic, on `heightAt`, below the map's threshold (no map symbol). Scrub in the sight corridor to the left grove is kept only where its top stays below the eye line (test).
- **Map frame:** thin collar (northings west, eastings south); scale bar and north arrow on plates in the SW and NE corners of the sheet; the legend moved to an on-demand popover ("מקרא"), including the check-result lines. Labels re-sized for the smaller sheet (≈ 13–16 px).
- **Feedback:** a verdict line, at most two lines of explanation, three evidence marks (חורשה / כיוון / מרחק), and "פירוט" on demand. All numbers come from the evaluation. The GPS reasons moved to a modal help dialog ("מדוע GPS לא זמין?").
- **Fallback:** `observation-north.jpg` regenerated from the live canvas at the new opening look, 992 × 744 (4:3, 2×).

### 2026-10-08 — Location check, simplified to one decision (lesson 6)

- The task is one choice: area 1 or area 2 (on the map, by the halo or the name plate, or with the buttons). The grove matching (picking in the 3D view, the grove buttons, the grove term in the evaluation and the feedback) is removed; the groves stay as landmarks in both views. `evaluate()` = direction fits ∧ distance fits, nothing else; coordinates and thresholds unchanged (both areas 300 m from the last known position; bearings 043° vs 008°, tolerance ±5°, range 260–340 m).
- Choosing an area draws, before any check and in plain ink only, the arrow from the last known position with its distance and the arrow from the area to the road split with its bearing (the same `directionCheck` / `distanceCheck` values the check uses). The check adds the measured bearing (dashed), the gap and the paced-distance band; changing the area removes them and shows the new area's neutral values with "הבחירה השתנתה — בדקו שוב".
- Assumed: the map tools (מקרא, מסך מלא) keep their row under the map; nothing replaces the removed grove rows, so the card height is unchanged (762 px at 1440 × 1122). Value plates are offset from their own line by the plate's size; once checked, the captioned "במפה" plate keeps the neutral plate's centre and rests on its line (as before).
- Wording: "התפצלות הדרך" everywhere; "מזלג" no longer appears in the activity (QA checks the DOM).

### 2026-10-08 — Compass concept mockups for selection (lesson 6)

- Deliverables and behavior brief: `design/mockups/compass-concepts/claude-code-brief.md`; current proposal images after latest user feedback: `01-instrument-realistic.png`, `02-linked-map-realistic.png`, `03-guided-practice-realistic.png`. The user found the flat version too simple and asked for realistic visual richness closer to the other illustrations. Current direction: matte olive instrument body, fine glass, physical material detail and restrained contact shadow, with precise live educational bearing overlays. Supersedes both flat and illustrative gold-bezel proposals; not final selection or desktop pixel-fidelity sign-off.
- Assumed scope: only the azimuth explorer board. Generated page chrome, breadcrumbs and title variations are contextual framing; keep the existing site shell and lesson header when implementing.
- Concept 2 map is fictional and north-up. Bearings are calculated from one coordinate system; changing bearing through controls retains target distance. Map scale must be computed from world units if shown; generated map artwork and scale are not geographic data.
- Concept 3 proposes a ±2° success tolerance, subject to selection-stage confirmation. Its depicted 312° against a 315° target is a hint state, not success. Revealing the 3° correction is tied to the hint action in implementation.
- No new color tokens. The existing lesson tokens are authoritative over sampled image colors. The compass direction pointer is an azimuth control, distinct from a magnetic north needle. Angle geometry and slider positions must be calculated, not traced from generated raster pixels.

### 2026-10-08 — Location check: the road split reads in 3D (lesson 6)

- Coordinates, road centre-lines, the shared 8 m road width and the height field are unchanged. What changed is how the road is drawn, which scrub stands in front of it, and the framing of "הראו את התפצלות הדרך".
- **Road material:** the 8 m surface is pale compacted limestone dust (even, little texture, nearly flat shading normal) instead of a dust tone close to the dry grass. Each side has a 2 m band of darker, denser growth (run-off from the track), the 3D counterpart of the map's road casing (8 + 4 m). It is drawn from a third mask channel (B) with the same centre-lines. The mask now gets the renderer's full anisotropic filtering, since the arms are seen obliquely.
- **Occlusion:** scrub clumps that would hide part of a road surface from the observation eye are left out (`hidesRoadFromEye`, pure sight-line geometry on `heightAt`). That removed 124 of 9443 clumps, all beside the roads.
- **Framing:** the split is 440 m away, and at the old 45° field of view the south arm was 1.4–1.8 px wide in the 496 px panel. The button now frames it at the narrowest field of view (30°), where both arms are ≥ 2 px for their first 100 m (unit test). In the rendered frame, each arm is 1.28–1.56× brighter than the ground beside it at all sample points (QA, real pixels, normal panel size).
- **Marker:** the measured-bearing drop line now stops at its ring instead of running into the junction.
- **Assumed / limit:** seen from the observation point, the main road's continuation beyond F drops behind the crest within about 25 m. The split therefore reads as two arms meeting at the marked point on the crest (Λ); the third arm cannot be shown without changing the geometry.
- `observation-north.jpg` (no-WebGL picture) regenerated from the same camera, 992 × 744.

### 2026-10-08 — "מצפן ומפה" implemented (lesson 6, AzimuthExplorer)

- Reference: `design/mockups/compass-concepts/02-linked-map-selected.png` + `claude-selected-compass-prompt.md`. One control (the 0–359° slider, LTR, opens at 47°); the compass and the map are passive. Removed: the draggable dial, bezel tags, wedge/±180° sweep, the "when to use" block, all blue (`accent-cool`) and red (`accent-hot`) marks.
- **Compass body** is a headless Blender render (`scripts/blender/build_compass_body.py` → `public/assets/lessons/topic06/compass/compass-body.webp`, 1024², alpha): knurled rim, domed matte-olive bezel (`fg` #38432E base, knurl `MAP.vegInk` #6E7A4E), metal inner ring, recessed ivory face (`bg-accent`), contact shadow. Every printed or moving mark (graduations every 2°/10°/30°, bezel numbers and N/E/S/W, cross-hair, pointers, glass glint, pivot) is live SVG on the body's ring radii (`COMPASS_RINGS` in `compassMapGeometry.ts` — keep in sync with the script). The render's shadow is feathered to zero by an SVG mask before the image edge. On screen the bezel samples ≈ #495040 (the mockup's image-gen olive is a little yellower, ≈ #4E4D33); the lesson tokens win.
- **Compass size:** ≈ 279 px in a 340 px column (mockup ≈ 318 px in its wider frame). The live degree labels sit outside the rim at every angle; at 090°/270° they would leave the card or hit the map with a larger dial. Measured: 16 px to the card edge at 090°, 11 px to the map at 270°.
- **Map:** fictional sheet 618 × 515 units, 10 m per unit, 500 m grid, scale bar 0–1,000 m computed from that (not traced). A fixed at the centre; B on a 188-unit circle; the back ray 150 units. The radius is the largest at which every label clears the sheet edge, the north arrow and the scale bar at every half-degree (unit test). Contours from a small height model in `border-strong` (#C9A56B, the site's topo-line tone); vegetation `MAP.vegFill`; water `terrain-sky` at low opacity. The mockup's full-screen button is not implemented (no extra controls).
- **Labels:** degree values sit beyond their line end; the A/B names sit beside the line on its clockwise side for every angle (they glide with the line instead of jumping). In the mockup they sit straight below the points (47° only).
- **Card title** "מהמצפן אל המפה" sits above the map at the inline end (visual left, `lg:text-end`) and the instruction above the compass, as in the mockup. Readouts: azimuth on the left, back azimuth on the right (`flex-row-reverse`), as in the mockup.
- **Copy (assumed, beyond the mockup):** the bottom explanation keeps the rule the equation follows — "…מתחת ל־180° מוסיפים 180°, ומ־180° ומעלה מפחיתים 180°." — because the equation's sign flips at 180°. Instruction text 18 px, explanation 18 px (mockup ≈ 20 px; lesson body 16 px).
- **Motion:** one damped spring (`useSmoothedAngle`, shortest way through north); pointers, map line, readouts and the equation all read that one angle. Reduced motion: jumps straight to the value. A polite live region announces the back azimuth after the slider rests 550 ms.
- QA: `node --experimental-strip-types --test scripts/qa/compass-map.test.mjs` (math + label layout at 720 angles) and `node scripts/qa/shot-compass-map.mjs` (browser, 1440 × 1122).

### 2026-10-08 — Scale: "קנה מידה 1/2" merged into one map lab (lesson 2)

- **Structure:** one scene `scale` ("קנה מידה"), one workspace (`scale/ScaleLab.tsx`) with ONE map and two modes, "חקירה" and "מדידה" (tabs at the top of the controls column). Sheet, representation and curtain position are shared and survive mode switches. Removed from the learning sequence: the opening prediction, the "מה אפשר לזהות" table, the guided/practice split with its identification gate and answer check, the three map-choice scenarios (ScaleChoose.tsx + `SCENARIOS` stay on disk, unreferenced, for a possible move to the practice area), the zoom-myth question set and the projections block (projections are taught in "קואורדינטות 2").
- **Explore:** readouts are only "שטח הדף" and "1 ס״מ על הדף מייצג …". Locate buttons (שיבלי, הדרך לפסגה, הכנרת, פסגת הר תבור) ring the place on the map with a name pill; outside the sheet a one-line message says to switch to a smaller scale. The pill sits above the ring, or below it when it would cover the extent label ("תחום …") or leave the sheet. "הגדלה לעומת פירוט" turns the same map into the 1:250,000 ×5 vs 1:50,000 curtain (opens at ×1.6 on Tavor, curtain 0.65) with one sentence and no question; "חזרה למפות" (or the toggle again) returns to the previous sheet and representation at full extent. Leaving explore closes it.
- **Measure (assumed rule):** the first click places א, the second ב, every later click moves the nearer of the two. Points are stored in WGS84, so a scale switch keeps them on the ground; a point outside the current sheet is not drawn and not moved, a one-line note names it, the ground distance still shows and the sheet length says it cannot be measured on this sheet. Keyboard: "הוספת נקודה במרכז המפה" places a point at the centre of the visible map (same rule); arrows move a focused point 1 mm on the sheet, Shift 1 cm. The ruler shows in every representation (on the photo too). The result: ground distance rounded to 1 mm on the sheet (= reading × denominator), "X ס״מ על הדף", one relation line; the conversion chain and notes are in a collapsed "פרטי החישוב". The distance is announced 700 ms after the points rest.
- **Representation label:** "מפה" → "מפה טופוגרפית" in the toggle and on the curtain chip (it fits beside the line at the default 0.65 at 1440 px; the chip-hiding rule covers narrow halves).
- **Still in force from the scale redesign (Tasks 1–9):** the "מפה" sheets are Israel Hiking Map renders (Hebrew tiles, © OpenStreetMap contributors, CC BY-NC-SA 3.0), mosaicked and cut to the same EPSG:3857 box as the photo; the "תצ״א" layer is Esri World Imagery (attribution `תצ״א: Esri, Vantor, Earthstar Geographics, GIS User Community`; Vantor/TerraColor imagery). Registration was checked on landmark crops (scripts/maps/check-scale-sheets.mjs). Sheet centimetres are true scale (ground distance on the ellipsoid ÷ denominator on a 24 cm sheet), never Web-Mercator screen lengths; the topographic rasters are native at ~1×, so they look slightly soft on 2× (retina) screens, and zooming within a sheet (k ≤ 3) only enlarges the same content — consistent with the enlargement-vs-detail message. The map is blank east of the Jordan (IHM coverage). The summit label on the 1:10,000 IHM render is garbled (source rendering, not ours). The Kinneret position is the Wikipedia coordinate (32°50′N 35°35′E). Map furniture inside the viewport (north arrow, scale bar, zoom buttons, curtain chips) uses physical left/right because maps are never mirrored.

### 2026-10-11 — Datum: three visual interaction concepts

- Scope: concept images only; no lesson code changed. Live desktop review covered onboarding, landforms, topography, contours and DatumFit at 1440 × 1122.
- Three designer proposals: guided 3D discovery; direct manipulation in a 2D cross-section; linked global/local comparison and prediction. These are alternatives for selection, not approved implementation choices.
- Images and handoff brief: design/mockups/datum-concepts/README.md. Image-generator output dimensions and typography are conceptual; existing tokens/components and a rendered 1440 × 1122 implementation govern exact values.
- Generated diagrams exaggerate differences. The cutaway reveals reference surfaces, not material layers. Geoid is not terrain; ellipsoid is not datum; residual differences remain. Qualitative feedback replaces claims of physical 100% fit. All new interaction behavior is specified in the handoff brief.
### 2026-10-11 — Three norths: concept mockups only

- Three alternative screen compositions are proposed in `design/mockups/north-concepts/README.md`. The user selected concept 2 (reference-angle lab); implementation is delegated to Claude Code through `design/mockups/north-concepts/claude-direction-lab-prompt.md`, with existing palette/layout and original learning copy preserved. No lesson implementation was changed in this task.
- Lesson 2's live scenes are the visual reference. Existing lesson semantic tokens remain authoritative; generated image colors and tiny text artifacts do not define new tokens.
- The reference-angle lab uses fictional teaching data: TN = 0°, GN = +2°, MN = −6°, target true bearing = 66°. These are not current geographic or magnetic measurements. The detailed geometry and copy in the brief override any approximate rendering in the images.


### 2026-10-11 — Selected guided 3D datum handoff

- User selected guided 3D and required the existing site palette/layout plus preservation of learning content and wording. Updated primary mockup: design/mockups/datum-concepts/01-guided-3d-site-palette.png. Original retained.
- Implementation prompt: design/mockups/datum-concepts/claude-guided-3d-prompt.md. It supersedes the preliminary README proposals: original educational copy and fit readout are retained; only necessary operational wording can change and must be reported.
- Palette mapping: cream/sage/olive/tan globe; existing accent.cool (#5B9DD9) confined to the geoid and its linked legend, consistent with the existing datum block; existing accent orange for action/manipulation. Generated material shading is illustrative; exact base-color values come from existing code tokens.
- No lesson implementation was performed in this handoff task.

### 2026-10-11 — "זיהוי תבליט ותכסית בשטח": realistic side-section (lesson 2)

- Request: keep the interaction exactly; redesign the papercut illustration in the more realistic style of the rest of lesson 2. The papercut version is archived unchanged at `/archive/topic-02/relief-cover-v1/` (`ReliefCoverIntroSceneV1.tsx` + `ReliefCoverTerrainV1.tsx`).
- **Style reference (assumed):** lesson 2's slope side-cuts ("ארבעה סוגי מדרונות"), not AI photography. They are the same subject (a terrain cut seen from the side), and a layered render is the only way to keep the layer toggles, per-object selection outlines and the exact overlay positions.
- **How it is built:** a Blender Cycles render (`scripts/blender/render_relief_cover.py` → `package_relief_cover.cjs` → `public/assets/lessons/topic02/relief-cover/*.webp`, ≈ 180 KB total). One orthographic camera is locked to the 640 × 390 viewBox, so the slab's cut edge is exactly `groundY(x)` (the script asserts < 0.05 units; measured 0.0002).
  - **Passes:** far ridge, bare relief slab, one pass per land-cover item, and one cast-shadow pass per item. The ground is a holdout in the item passes.
  - **Placement:** `reliefCoverRenders.data.ts` is generated by the packager.
  - **Textures:** the repo's existing CC0 sets only (`contour-mountain/textures`, `limestone-section.webp`). Leaf atlases are procedural. No network.
- **Unchanged:** all copy, the controls column, layer toggles, list ↔ illustration selection, relief pins and highlighted stretches, callouts, stage tags, the ghost line, motion and reduced motion. The hit areas are the papercut ones; houses get one box per house, because the images themselves are never hit targets.
- **Visual assumptions:**
  - The bare relief has no grass, because grass is land cover.
  - The cut face shows terra-rossa topsoil over limestone beds that bow gently (15 %) under the hills.
  - The far ridge keeps the papercut silhouette, at 55 % opacity for haze.
  - The grove reads as oak/terebinth. The orchard is four identical olive trees in one row. The shrubs are low garrigue clumps.
  - Houses: two stone-clad houses with tiled gable roofs, and a two-storey plastered house with a solar water heater, turned 12° to show depth.
  - The road leaves the slab through the cut face at x ≈ 506, where the papercut road started, and the car is in the right-hand lane.
  - The pylons' cross-arms are turned 35° so they read as pylons in a side view. On a real line they would be perpendicular to the conductors.
- **Drawing order:** each item's shadow dims with its item when another item is selected, and all shadows fade when either layer is off, as before. The papercut drop-shadow filter on objects is gone; the render's own shadows replace it.
- **Re-render:** `& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/render_relief_cover.py` (≈ 1.5 min on the RTX A5000), then `node scripts/blender/package_relief_cover.cjs`. Keep the geometry block in the script in sync with `ReliefCoverTerrain.tsx`.

### 2026-10-11 — "שלושה סוגי צפון": reference lab (lesson 6, `north-lab/`)

- **Scope:** `ThreeNorthsCard` and its dedicated helpers were removed from `PrinciplesScene.tsx` and replaced by `<NorthLab />` (`src/components/lessons/topic-06/north-lab/`: `NorthLab.tsx`, `NorthLabMap.tsx`, `northLabGeometry.ts`, `norths.ts`). The scene root, the `my-12` wrapper, `AzimuthExplorer`, the GPS block, the conclusion, the header and the sidebar are unchanged. Reference: `design/mockups/north-concepts/02-reference-lab.png`; prompt: `claude-direction-lab-prompt.md` (same folder).
- **Open questions answered by default (the user approved without answering; the prompt delegates routine choices to code + reference):** (1) the measuring ring reuses `compass-body.webp` (prompt: "העדף למחזר את הגוף"), its ivory face masked out in SVG so the map and grid show through; no new body was generated. (2) The north choices follow the mockup order, right → left: אמיתי · רשת · מגנטי (the same order as the comparison table). Both are local one-line changes (`RING`/mask in `NorthLabMap.tsx`, `NORTH_IDS` in `norths.ts`).
- **Copy:** `NORTHS[id].label/english/who/what/why`, the title and the intro moved verbatim into `norths.ts` / `NorthLab.tsx`. Only the second sentence of the "במעבר" note changed, to the wording given in prompt §3. The old diagram's static values 6.2° / 2.3° / "סה״כ 8.5°" are removed (prompt §6). New labels are only the ones the prompt lists, plus TN/GN/MN; the English names stay visible in the info-strip heading, in the scene's existing "אזימוט (Azimuth)" pattern.
- **Experiment data (fictional, prompt §6):** TN 0°, GN +2°, target true bearing 066°, declination −6° in −10…+10. Azimuth = normalize(66 − reference). Opening 066° / 064° / 072°.
- **Layout at 1440:** card inner 986 px → controls 304 px (mockup 300 × 1.013) + gap 28 + map 654 px. Map viewBox 654 × 628 = CSS px, equal to the controls column height. A (300, 386) = the mockup's A at 61.5 % of the height; ring rim radius 150 (mockup ≈ 150). B fixed at 330 px, 066°. Reset sits in the controls column (prompt control order), so the boxes are ≈ 50 px tighter than the mockup, which had reset under the map row. The info strip and the note are full width under both columns (prompt §4), so the card (≈ 1,085 px) runs past one 1122 viewport: the note's lines are below the fold when the card is aligned under the header. No font was shrunk to avoid this.
- **Instrument:** the bezel print is live SVG on the body's ring radii (`COMPASS_RINGS` × 1.5): white ticks every 5° / 10° and the numbers 90 / 180 / 270. "0" is not printed — it lies under the north arrows, and the TN arrow marks it. Arrows and AB cross the dark bezel, so they get a thin `MAP.paper` casing (lines only; no halo on text).
- **Labels:** TN/GN/MN labels sit in one row above the tips, spread by `spreadRow` (no overlap at any whole degree; unit-tested), with leader lines when a label moves off its tip. Equal angles (MN = TN at 0°, MN = GN at +2°) overlap honestly; both labels stay, MN first. The arc's single number sits just beyond the arc at its mid-angle on a paper plate, three digits ("072°", like the table) rather than the mockup's "72°".
- **Inset:** "הפרדה מוגדלת להמחשה", deviation from TN × 4 (side and order kept), labels print the source values, no target line and no arc.
- **Not drawn (prompt §3/§5/§8):** the mockup's page-level heading and subtitle, "נסו בעצמכם", the light-bulb takeaway box, the hand cursor, the scale bar, the "צ" corner north arrow (not in the closed list of new labels; TN is the north arrow), the river and the bronze palette. "הנתונים להמחשה בלבד" sits in the scale bar's place (bottom-left of the map).
- **Motion:** one spring on the declination (`useSmoothed`) drives MN, the magnetic row, the inset and, with magnetic chosen, the arc and the reading. A short offset sweep moves the arc start between norths on a choice change; at rest the arc starts exactly on the chosen arrow. Reduced motion: values jump. The live region announces the reading after 550 ms of rest, never on load.
- **Verification:** `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/north-lab.test.mjs` (14 tests) and `node scripts/qa/shot-north-lab.mjs` (behaviour + 8 screenshots in `design/screenshots/north-lab/`). Overlay/diff against the mockup in `design/screenshots/north-lab/compare/`: the map and ring register on A and the rim; the remaining differences are the computed geometry (AB at 66°, the mockup draws ≈ 61°), the palette and the omissions above.

### 2026-10-11 — "אליפסואיד, גיאואיד וגליות": measurement mission (lesson 2, `#scene-coordinates`)

- **Scope:** `ReferenceBodies` in `CoordinatesScene.tsx` keeps its heading, lead paragraph, `BODY_TABS` and the H/h/N definitions and formula. The former profile diagram and its point slider were replaced by the mission. Reference: `design/mockups/topic-02-geodesy/03-measurement-mission-v2.png`, for composition only; prompt: `claude-measurement-mission-prompt.md` in the same folder. A parallel session is rewriting the datum block of the same file (`datum/DatumGuided.tsx`); that work is not part of this entry.
- **User decisions (2026-10-11):** the terrain is built in the project's Blender pipeline (`scripts/blender/build_measurement_terrain.py`). The undulation view puts "גליות" and its body text above the task in the right column, with the H/h/N definitions as a key under the section. The slider's two strings are removed. Assets go to `public/reference-assets/measurement-mission/`. The mockup's 1/2/3 step row is not drawn. A/B/C stay as static markers in the three explanation views. "Material mismatch" means composition inside the activity card.
- **Copy:** 32 of the 34 original strings of the block are unchanged (scripted diff). The two removed ones are the slider's "הזיזו את הנקודה לאורך החתך" and its value text "מיקום הנקודה בחתך". The four section descriptions, the line names and "ללא קנה מידה · הגבהים מוגזמים" moved verbatim into `CoordinatesScene`/`MeasurementSection`. New text is operational only:
  - the station names and the "בחירת תחנה" group
  - "מהו הגובה מעל פני הים?"
  - the buttons and the feedback/hints
  - "בחרו תחנה בשטח והשלימו את המדידה"
  - "3/3 – כל התחנות נמדדו."
  - the landscape's accessible description
- **Typography:** the view title, body and `extra` now follow the lesson-scene tiers the prompt asked for: `font-display font-bold leading-tight text-black text-base md:text-lg` / `text-base leading-relaxed text-black`. Before, they were `text-xl text-fg` and a `text-fg-muted` extra. Control labels in the task use the slider label recipe (`text-sm font-display font-semibold text-fg-muted`).
- **Data (demo only):** A 18 / −12 → 30, B 148 / +28 → 120, C 220 / 0 → 220. The one data file is `measurementMission.data.ts`. H is never stored; it is always h − N. The terrain is shaped so the ground at each station stands exactly H m above the sea; the build asserts it to within 0.01 m, and the unit tests check it again.
- **Terrain assumptions:** the diorama is 2 × 1.3 km with VE 1.5, and the range peaks at ≈ 370 m. The sea is the existing #7FB4C6. The ground uses the topography diorama's palette plus `terrain.olive`/`ridge`/`sand` and `MAP.vegInk`. The cut edge is `CUT_COLOR` cream with `WALL_COLOR` soil and `tanline.contour` strata every 20 m. The receiver is cream/ink/`terrain.steel` geometry, oversized so it reads (prompt: "marginal size"), and stands 45 m east of the station so the pin above stays readable.
- **Camera:** fixed, at 15° east of south, 21° down, FOV 26°, fitted to the cut-edge rim and the summit. No orbit or zoom: the mockup has none, and the prompt only allows them. Pins and the dashed link are DOM/SVG placed by the same projection math (`measurementLayout.ts`).
- **Section (schematic, labelled "ללא קנה מידה · הגבהים מוגזמים"):**
  - Heights above the sea are drawn as 54 · ln(1 + H/35) px, so A's 30 m reads next to C's 220 m.
  - N is drawn at 1 px/m; sea depth at 0.5 px/m.
  - The horizontal axis is a monotone cubic through the stations' pin x, so the dashed link is vertical as in the mockup. Distances along it are therefore not uniform.
  - The relations the prompt requires hold, and are tested: h > H at B, H > h at A, the surfaces meet at C, and the sign of N matches the drawing. N between the stations is a smooth interpolation, so the wave is illustrative.
- **Layout at 1440:**
  - Card 1052 × 818 px, the site's `max-w-6xl` (mockup ≈ 1109 × 804), aligned at the mockup's card top (288 px).
  - Text column 308 px, illustration column 616 px (ratio 1 : 1.9, mockup ≈ 1 : 3): the original texts need the width.
  - Terrain box 616 × 300, section 200 px, then the cue and the key.
  - The card height is the same in all four views and every task state; this is asserted. Because of that, the three explanation views have empty space under their text.
  - The task sits ≈ 100 px lower than in the mockup because "גליות" and its body come first, and the data cards are single-row (46 px vs 72 px) to fit the frame.
- **Verification:** `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/measurement-mission.test.mjs` (8 tests). `node scripts/qa/shot-measurement-mission.mjs` runs behaviour, keyboard, reduced motion and no-WebGL checks, writes the screenshots and the overlay/diff, and puts everything in `design/screenshots/measurement-mission/`.

### 2026-10-11 — "זיהוי סוגי תכסית בשטח": realistic top-down map (lesson 2)

- Request: keep the interaction, copy and layout exactly, and redesign the papercut map in the realistic style of the relief/cover side-section. The papercut version is archived unchanged at `/archive/topic-02/landcover-v1/` (`LandCoverSceneV1.tsx` + `LandCoverMapV1.tsx`).
- **How it is built:** a Blender Cycles render (`scripts/blender/render_land_cover.py` → `package_land_cover.cjs` → `public/assets/lessons/topic02/land-cover/*.webp`, ≈ 500 KB total). One orthographic camera looks straight down and is locked to the 400 × 250 map tile at 3 px per unit (the script asserts the error is < 0.05 units; measured 0). The hulls, tag positions, outlines and hit areas are the papercut ones, unchanged.
  - **Passes:** bare land per season; one transparent pass per region (its floor and objects, with their shadows on each other baked in); one cast-shadow pass per raised region (grove, garrigue, planted forest, village, orchard, reservoir, power line, fence). Placement is in `landCoverRenders.data.ts`, generated by the packager.
  - **Seasons:** land, grove, garrigue, batha, terraces and fields render twice. The summer layer fades over the winter layer in 700 ms (the papercut's colour transition), and the winter layer is dropped only after that. Planted forest and orchard are evergreen, and the rest does not change.
  - **Textures:** the repo's existing CC0 sets only (`contour-mountain/textures`, the topic-04 trafficability `hard`/`mud`/`sand` maps). Leaf atlases are procedural (oak, scrub, citrus, pine). No network.
- **Unchanged:** all copy (including the caption "מבט מלמעלה על שטח לדוגמה · המחשה סכמטית…"), the tabs, pills, result card, season buttons, the tile's rounded frame and rim, hover/focus/selected outlines, name tags, the dimming of other categories (38 % + desaturate), and the tab and hit order. The hit areas are the transparent hulls in their original DOM order. The images are never hit targets.
- **Removed:** the papercut "lift" drop-shadow on regions in the active category, because the render's own cast shadows replace it (as in relief/cover).
- **Visual assumptions:**
  - Scale is about 1 unit ≈ 1 m. Sun from the north-west, about 48° up, so shadows fall down-right as the papercut ones did.
  - Land is terra-rossa soil with limestone and grass patches: green in winter, straw in summer.
  - Grove: irregular oak crowns over shrubs and litter. Garrigue: shrub clumps among rocks, greying in summer. Batha: low grey-green cushions and grass tufts on stony ground.
  - Planted forest: 20 identical pines on the papercut grid, needle litter, a dirt firebreak inside the edge. Orchard: 24 identical citrus trees on cultivated strips with a cover crop between them.
  - Terraces: 1.5 m steps with dry-stone walls, alternate bands slightly darker (the papercut's two tones).
  - Fields: rows in three directions. Winter: young crops. Summer: stubble, a ploughed middle plot and dry hay.
  - Village: flat concrete roofs with parapets, solar water heaters on every third house and black water tanks on others, paved lanes, a paved square with a tree.
  - Reservoir: earth embankment, a dark liner at the waterline, and the pipe to the fields.
  - Power line: lattice pylons with an east–west cross-arm, two conductors and an earth wire.
  - Fence: chain-link on posts with a top rail around the orchard, with a gate where the dirt track arrives.
- **Re-render:** `& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/render_land_cover.py` (≈ 4 min on the RTX A5000), then `node scripts/blender/package_land_cover.cjs`. Keep the geometry block in the script in sync with `LandCoverMap.tsx`. QA: `QA_PORT=3001 node scripts/qa/shot-landcover.mjs`.

### 2026-10-11 — Guided 3-D datum implemented (lesson 2, `#scene-coordinates`)

- **What changed:** `DatumFit` in `CoordinatesScene.tsx` was replaced by `<DatumGuided />` (`src/components/lessons/topic-02/datum/`). It has three stations in an Onboarding-style accordion: גוף הייחוס, מיקום וכיוון, עולמי ומקומי. Beside them sit a live R3F globe, the active-surface selector, the demo timeline, a linked gap close-up, the original fit readout across the card, and the two original explanation cards below. `IntroColumns`, `ReferenceBodies`, `DatumShiftDemo` and `Part1Summary` were not touched (`ReferenceBodies` was being rebuilt in parallel by another session).
- **Copy:** every original sentence is kept verbatim, in order (`node scripts/qa/datum-copy-check.mjs`). The lead paragraph is split by whole sentences:
  - sentence 1 stays above the card;
  - "נחשוב על הדאטום…" goes to station 1;
  - "המטרה…", "בתרשים…" and "הזיזו…" go to station 2;
  - `DATUM_MODES` goes to station 3.
  Added labels (approved): station titles, הפעלת ההדגמה / השהיה / המשך / נסו בעצמכם / חזרה להדגמה / החזרת המבט / מסך מלא, the accessible names המשטח הפעיל, התקדמות ההדגמה, and נקודת הבדיקה.
- **Geometry kept:** `Pose`, `START`, `RANGE`, `GEOID`, `LOCAL_ARC`, `REGION`, `fitError`, `bestFit`, `FIT_TOL`, `FIT_GOOD` moved verbatim to `datum/datumGeometry.ts`. Pinned by `scripts/qa/datum-guided.test.mjs`: best fits (4, −4, −9°, ×1.01) and (38, −28, −36°, ×0.75), and identical errors and scores.
  - **3-D mapping:** the section is the globe's plane z = 0 (x right, y up, rotation about Z). The ellipsoid radii are 170 : 135 : 170. The 3-D geoid passes through every original GEOID point in that plane, and the posed ellipsoid cuts it in exactly the posed 2-D ellipse (both tested).
- **Deviation from the reference — the cutaway is on the globe's right, not the left.** The marked local arc is fixed at the section's upper right (`LOCAL_ARC`). The brief requires it to stay clear "in 3-D and in the section", with sliders that never act reversed and the rotation about Z. Together these force the exercise wall to face the camera over the section's right half. With the reference's left-hand opening, that wall is seen almost edge-on (tried and rendered first). The brief's priority order (instructions above the mockup) decided it. Labels and close-up keep the reference's positions: surface label upper left, ellipsoid label right, close-up lower left. The geoid label moved to the right, beside the opening.
- **Surface vs. geoid:** the exercise's geoid is exaggerated (radius factor 0.91–1.17). A surface built on it would be a lumpy "potato", so the Earth's surface is a smooth oblate globe that encloses the geoid everywhere (≥ 1.2 % clearance, a gentle rise over the local bulge), plus low land relief. The globe is therefore oblate (135 : 170, as the exercise's ellipsoid), not round as in the reference. The cut faces show the geoid line inside the globe with a faint olive band above it, never as a solid layer.
- **Geography:** continents come from the existing Natural Earth 1:50m `WORLD_LAND` (topic 09), drawn at load (`datumEarth.ts`). East stays to the right (never mirrored). Africa and Europe face the default camera; the cutaway opens over Asia, so the marked arc lies at ≈ 31°–83° N on 150° E. No label names it: the region is schematic, not a real datum.
- **Palette:**
  - sea `border.subtle` (#ECE4D2 — the deeper cream token, so the lit globe reads on the white card);
  - land `brand` / `brand.dark`, relief lines `border.strong`, coast `fg.dim`;
  - cut faces `bg.accent`, with a `fg.dim` band at 20 %;
  - geoid `accent.cool`, only on the geoid, its line and its label;
  - ellipsoid `accent`.
  The readout's good state uses `brand/10` instead of `status-ok/10`.
- **Layout choices (user answers, 2026-10-11):**
  - assets in `public/assets/lessons/topic02/datum-guided/` (manifest inside);
  - the readout tray spans the card width;
  - the inspection point is dragged along the section or moved with ←/→ (global: the exposed half; local: the marked arc).
  In manual mode the sliders make station 2/3 taller than the stage, so at 1440 × 1122 the tray falls below the fold. The 3-D view and the close-up keep showing the gap, and the score is announced after each change.
- **Mockup elements deliberately not reproduced:**
  - the concept title "מהכדור אל מערכת הייחוס" and every concept sentence;
  - the ⓘ icon;
  - the "הפרש (מוגזם)" label;
  - the brown rim in the cut and the dense orange grid;
  - circular station badges and the sage-tinted open header (the site's accordion wins);
  - the controls row centred under the whole card (kept in the stage column so it never moves).
- **Fallback:** `datum-fallback.webp` is rendered from the live scene (`scripts/render-datum-fallback.mjs`). It shows under the canvas until the first frame, and beside the live SVG section when WebGL is unavailable. QA: `node scripts/qa/shot-datum.mjs` (all stations, demo, manual, local/global, camera, fullscreen, keyboard, reduced motion, no-WebGL, leave and return). Screenshots and overlay/diff are in `design/screenshots/datum-guided/`.

### 2026-10-11 — "תצורות הצומח וגובהן": realistic side view (lesson 2)

- Request: redesign the papercut vegetation ladder the same way as the land-cover map. The papercut ladder is archived unchanged as `VegetationLadderV1.tsx`. The archived scene `/archive/topic-02/landcover-v1/` now uses it, so the archive shows the whole pre-redesign "תכסית" scene.
- **How it is built:** a Blender Cycles render (`scripts/blender/render_vegetation_ladder.py` → `package_vegetation_ladder.cjs` → `public/assets/lessons/topic02/vegetation-ladder/*.webp`, ≈ 120 KB). It uses the relief/cover side-section language: an orthographic camera pitched 10°, a cut slab of bare soil over terra-rossa and limestone, the same warm front-left sun, and procedural leaf atlases.
  - **Alignment:** the camera is locked to the 500 × 206 viewBox. Every formation stands on the ladder's ground line (y = 184) in the middle of its column and reaches its schematic height (16 / 34 / 70 / 112 / 164). The script asserts this (measured error 0.0001 units), so the height lines and the planted frame fit unchanged.
  - **Passes:** the slab, one transparent pass per formation (the slab is a holdout), and one cast-shadow pass per formation. The shadow grows and dims with its column.
- **Unchanged:** the heading, labels, heights text, legend, height lines and their labels, the planted dashed frame, the hover columns (40 % dimming, label highlight) and the grow-in animation.
- **The papercut ground strip is now the rendered slab:** land behind the line rising to y ≈ 176, and the cut face below y = 194. The planted frame sits under the slab, which hides its foot as the papercut strip did.
- **Visual assumptions:**
  - Herbaceous: grass tufts with a few low herbs.
  - Batha: low grey-green cushions with grass tufts.
  - Garrigue: two multi-stemmed shrubs (≈ 70 and ≈ 46).
  - Grove: two oaks on the papercut crown layout, with understory shrubs.
  - Planted forest: three identical conifers with tiered crowns and bare lower trunks. They keep the papercut's conical silhouette, which is the planted cue together with identical spacing, not a claim about the species.
- **Re-render:** `& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/render_vegetation_ladder.py`, then `node scripts/blender/package_vegetation_ladder.cjs`. QA: `QA_PORT=3001 node scripts/qa/shot-landcover.mjs` (now also covers the ladder).

### 2026-10-11 — "תכסית טבעית / תכסית מלאכותית": realistic origin vignettes (lesson 2)

- Request: redesign the two papercut vignettes in the opening origin cards the same way. The originals are archived unchanged as `OriginVignettesV1.tsx`, and the archived scene `/archive/topic-02/landcover-v1/` uses them.
- **How it is built:** `scripts/blender/render_origin_vignettes.py` imports `render_land_cover.py` for its materials, crowns and sun, so the vignettes are crops of the same aerial world as the map. `package_origin_vignettes.cjs` writes `public/assets/lessons/topic02/origin-vignettes/{natural,planted}.webp` (≈ 28 KB).
- **Framing:** one straight-down orthographic camera covers the 88 × 60 box at 4 px per unit. The component keeps the same 88 × 60 CSS box and its names and props.
- **Kept from the papercut:** the crown positions and sizes, the natural patch outline and the planted parcel. Natural: irregular oak crowns of mixed size with a few understory shrubs on a ragged, feathered patch. Planted: 12 identical pines on the papercut grid inside a sharp-edged parcel with needle litter.
- **Dropped:** the papercut row strips under the planted crowns. The exact grid, the identical crowns and the hard parcel edge carry the cue, as in the map's planted forest.
- **Re-render:** `& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/render_origin_vignettes.py`, then `node scripts/blender/package_origin_vignettes.cjs`. QA: `scripts/qa/shot-landcover.mjs` now also checks that both vignettes load.

### 2026-10-11 — Guided datum: hologram refinement (lesson 2, `#scene-coordinates`)

- **Brief:** `design/mockups/datum-concepts/claude-hologram-refinement-prompt.md`. It lifts the earlier "matte only" and "1 : 1 display of 170 : 135 : 170" limits, and keeps the palette, copy and behaviour binding. "Before" screenshots: `design/screenshots/datum-guided/before-hologram/`. "After" screenshots are in the same folder; side-by-side pairs are in `before-after/`, and the reference overlay is in `compare-hologram/`.
- **Why the globe looked wide and low:** `bodyPoint`/`poseToWorld` drew the exercise's exaggerated flattening (135 : 170 = 0.79) 1 : 1, and the surface envelope inherited it. It was not CSS or canvas stretching: the camera aspect follows the canvas, and the lens shift does not scale.
- **Display mapping:** a view-only vertical factor (`DISPLAY_K` = 1.2, `datumGeometry.ts`) is applied once, as the parent transform of every body.
  - It is used by every anchor projection, both ray-casts (marker, ellipsoid drag), the occlusion test, the close-up and the no-WebGL section.
  - The displayed globe height/width = 0.95, tested.
  - `fitError`, `bestFit`, the score, `START`, `RANGE` and the pose are untouched (the pinned results still pass).
- **Framing:** a shared framing by bounds (`CameraRig`).
  - Each frame it projects the globe and the posed ellipsoid from the current direction at the default distance, so the learner's dolly is not fought.
  - It eases `camera.zoom` (≤ 1) and the lens shift to keep both on stage, preferring the reference's right-of-centre globe.
  - At START the view is wider (the displaced ellipsoid is whole, not cut at the corner). As the demo brings it in, the globe grows back. Reduced motion jumps.
- **Materials (`datum/datumHolo.ts`):** one small shader for every surface — a calm, low-alpha body, a soft fixed studio key, and a Fresnel rim in the object's own token colour with a little extra alpha at grazing angles. There is no additive blending or bloom, so the white card never washes out.
  - Earth: land 95–97 %, sea 72–82 % opaque, sage rim; its far side is faint.
  - Geoid: a whole, gently wavy translucent body with thin contour lines. It is always present (resting opacity 0.15), and choosing it strengthens body, rim and lines. Before, `geoidOpacity` was 0 unless chosen.
  - Ellipsoid: a smooth translucent body with an even cage (meridians every 30°, parallels 0°/±30°/±60°).
  - A 4 % glass over the open quarter keeps the globe's round silhouette.
- **Depth:** all passes run in the transparent queue in a fixed `renderOrder`. Each reference body gets a fresh depth (cleared in `onBeforeRender`, then the cut faces written back), a colour-less front pre-pass, its far-side lines with `depthFunc = Greater` at low alpha, and its near-side lines normally. Near lines read crisp and far lines faint; lines behind a cut face also dim. The Earth's near side is drawn last with a depth test, so a body in front of the globe (the START ellipsoid) stays in front. Nothing is drawn "on top of everything".
- **Cut faces:** cream glass at 34 % with thinner section lines. They no longer dominate; the curved bodies inside the opening carry the view.
- **Close-up:** drawn under the same display mapping. Its window always frames BOTH curves (it was capped before, so at START the arrow pointed to an ellipse outside the window).
- **Fixed on the way:** the surface's rise over the geoid bulge now fades out at the poles (it depended on λ there, which left a small seam at the north pole). This is tested.
- **Verification:** this round ran on an isolated worktree (HEAD + only the datum files, own dev server on :3005). On the shared server the topic-02 page was broken by another session's in-progress files: a `measurementLayout.ts` runtime error, and `LandCoverVisuals.tsx` importing a missing `vegetationLadderRenders.data`. `QA_BASE=http://localhost:3005 node scripts/qa/shot-datum.mjs` passes 44 checks with no console or page errors. Unit tests: 16/16. Copy check: unchanged. No learning copy changed in this round.

### 2026-10-11 — "שלושה סוגי צפון": map polish (lesson 6, `north-lab/`)

- **Brief:** `design/mockups/north-concepts/claude-map-polish-followup.md` — replace the terrain illustration under the lab; keep the compass, layout, copy, behaviour and geometry.
- **Asset route:** the brief asks for an image tool first. Both connected image services failed this session (Higgsfield "not connected"; Magnific 404 "server not found"), so the brief's fallback was used: a detailed SVG at `public/assets/lessons/topic06/north-lab/map-paper.svg`. It also guarantees the brief's hard constraints, which a raster could not: contours that never cross (one height field, marching squares with a consistent saddle rule), only `MAP` colours, no baked text/grid, exact 654 × 628 alignment.
- **Generator:** `scripts/maps/build-north-lab-map.mjs` (deterministic seeds). Landforms are smooth analytic functions — the ridge as a crest line x(y), the saddle as y(x), the valley as x(y), an elliptical hill — under a two-scale domain warp, plus flank-only noise for spurs and gullies, so gentle ground stays calm. Contours: 5 m interval, index every 25 m; 0.7 px at 50 % and 1.1 px at 64 % of `MAP.contour`. Vegetation: a patch field (terrain zones × break-up noise) gives three soft tint steps of `MAP.vegFill` and clusters of fine `MAP.vegInk` dots, a few small tree marks and crowns. Road: one narrow minor road (`MAP.roadCasing` / `MAP.roadFill`); five buildings of varied footprint set back on both sides (`MAP.building` at 68 %). Paper grain: `feTurbulence` in the contour ink at 7 % alpha.
- **Readable zones (moderate detail, never a hole):** vegetation thins smoothly around the ring face, along AB, around B, under the TN/GN/MN label row and arrow tips and under the bottom-left note; contours stay everywhere.
- **Component:** `NorthLabMap.tsx` lost the old code-drawn terrain (four Gaussian hills, blob patches, uniform dots, smooth road, identical squares) and its grain filter; the static sheet now draws terrain → grid → compass body and print, with the live layer above. Grid: angle, spacing and anchor unchanged; only opacity 0.8 → 0.66 and width 0.9 → 0.8 so it stays quieter than the arrows over the richer terrain.
- **Unchanged:** `compass-body.webp`, its mask, size, position, ticks and numbers; `northLabGeometry.ts`; every string; controls, table, slider, reset, keyboard, live region, reduced motion.
- **Verification:** while other sessions were editing shared lesson files, the shared :3000 dev server reloaded the page mid-run. Final QA therefore ran against a static export of HEAD + only this activity's files (temporary worktree, `next build` passed, served locally): `shot-north-lab.mjs` 51/51 (incl. new checks: terrain asset served and text-free, drawing order terrain → grid → ring, terrain node never re-created through choices and slider moves) and `shot-compass-map.mjs` all passed. Unit tests 23/23 with the repo resolver; the bare `node scripts/qa/north-lab.test.mjs` cannot resolve the extensionless TS import without `--import ./scripts/qa/ts-resolve.mjs` (existing convention, documented in the test header). Screenshots: `design/screenshots/north-lab-map-polish/` (baseline kept in `north-lab/`); comparisons in its `compare/` folder.

### 2026-10-11 (later) — measurement mission: visual pass (layout, terrain, section)

- **Root causes found:**
  - **Empty space:** all four view texts were stacked in one grid cell, so the text column always kept the task's height. The H/h/N key area was reserved with `invisible` in every view, and the divider stretched to the full height.
  - **Small, rigid model:** a planar-UV albedo on a non-eroded height field, with a wall of peaks along the back, and a camera fitted only by distance, so its frame was off-centre.
  - **Section:** a bent horizontal axis and a log vertical scale.
- **Layout:**
  - The surface, ellipsoid and geoid views show their text (unchanged) in a compact `max-w-3xl` block under the tabs. Under it is a full-width stage: diorama 986 × 448 and section 220 px. These three share one height because their texts share one cell (≈ 3 lines of difference). The card is 1006 px, which fits under the site header at 1440 × 1122.
  - The task view has two top-aligned columns (1 : 1.85) and a divider. It is 829 px and fits at the mockup's card top (288 px). Its height is the same through every task state (asserted).
  - "Next station" and the 3/3 line moved into the success feedback, and reset sits beside the check button. The feedback slot keeps a 92 px minimum.
- **Terrain (rebuilt, same pipeline):**
  - Domain-warped massifs and a spur for the large forms.
  - Stream-power erosion (implicit, D8, priority-flood pit filling, 40 iterations, K = 0.015, diffusion 0.05) for wadis, spurs and saddles; the main valleys are cut up to 45 m.
  - Micro-relief noise at the small scale.
  - Diorama 2.0 × 1.15 km at VE 1.4 (the vertical scale is intentional and labelled by the existing "ללא קנה מידה · הגבהים מוגזמים"). Range ≈ 375 m.
  - Stations run west → east: C (−690, 275) on the spur, B (−80, −40) on the hill, A (470, −150) on the plain. The exact-height corrections are under 9 m.
  - Ground: the contour scene's CC0 tiling textures (read-only) blended by a new splat map and macro AO, triplanar, with tiles 80–140 m and a two-scale anti-tiling read.
  - The cut edge is a plain CUT_COLOR base with a thin soil band; the stripes are gone.
  - The sea is a see-through #7FB4C6 surface on the geoid.
- **The model stands on the geoid:**
  - One N field, `undulationAt`: Gaussian RBF, exact at the stations, settling to −6 m away from them. Every vertex is lifted by N (× the model's vertical scale × 1.5), so the sea is the geoid.
  - The ellipsoid is a flat sheet below; geoid − ellipsoid = N everywhere (unit-tested). The section samples the same field.
  - In the explanation views the matching sheet appears (tint + 50 m grid + edge line, fading out beyond the footprint). The task view shows both, quieter.
- **Analytic layer:** shader contour lines every 20 m of H (index every 100 m), computed from the pre-lift height, so they follow true H. There is a soft ring at the selected station and a dashed transect on the ground. Emphasis transitions are short damped changes, and immediate under reduced motion. Colours are `fg`, `accent`, `brand.dark` and `tanline.badge` only.
- **Camera:** fixed per box aspect. Azimuth 0.12 rad east of south, elevation 0.5 rad, FOV 24°. The target is centred on the projected frame (cut-edge rim + plinth foot + summit), then the distance is fitted. There is no orbit or zoom, as before, so a station choice never moves the camera.
- **Lighting:** as the contour scene — HDR sky at 0.7, a soft hemisphere and one sun (lowered for raking light on the wadis), N8AO and ACES. A soft shadow sits 0.07 below the plinth, so the model hovers slightly.
- **Section:**
  - It is the transect from the west edge through C, B and A to the east edge, in the sea.
  - One horizontal scale, anchored so B (the station the task opens on) sits exactly under its pin, with the slope least-squares fitted to C and A. Perspective leaves C and A up to ≈ 30 px off their pins, so their links slant slightly.
  - One linear vertical scale for H, h and N; arrow lengths are proportional to the data (unit-tested). Because of that, A's arrows are short (H ≈ 18 px).
  - Quiet lines are dashed at 50 %, and their names stay at 55 %.
- **Not changed:** copy (32 / 34 original strings verbatim; the two removed are the slider's, as approved), the task logic, the data values, keyboard handling and the no-WebGL path.
- **Verification:** `scripts/qa/measurement-mission.test.mjs` (11 tests) and `scripts/qa/shot-measurement-mission.mjs`, which now checks for no empty band at the card's foot, a stage-to-text gap of 24 px or less, and a full-width stage. Before/after screenshots are in `design/screenshots/measurement-mission/before/`, `…/` and `…/compare/`.

### 2026-10-11 (later) — Guided datum: realism of the globe and the close-up (lesson 2, `#scene-coordinates`)

- **Brief:** `design/mockups/datum-concepts/claude-realism-and-inset-prompt.md`. "Before" is the end of the hologram round, re-rendered from that code in an isolated worktree with the same script and framing as "after". Screenshots: `design/screenshots/datum-guided/realism-refinement/`.
  - `before-*` / `after-*` show the full viewport at 1440 × 1122 for opening, geoid, ellipsoid, mid-demo and fitted.
  - `*-globe` and `*-inset` are separate close-ups rendered at 2×.
  - `compare-<state>-globe|inset.png` set before | after | mockup side by side.
- **Relief from real data, not noise:** the old canvas map drew procedural noise as "relief"; the brief asks not to present noise as elevation. The globe now uses four textures built by `scripts/build-datum-textures.mjs`:
  - **Sources:** NASA Earth Observatory / GEBCO land elevation (Blue Marble NG topography, public domain, credited) and Natural Earth 1:50m land + large lakes (public domain).
  - **Display relief:** a monotonic curve (elevation^0.6) plus a small coastal step, so land reads as a volume.
  - **Albedo:** tokens only. Tan (border.strong) appears on high ground and on ridges, measured against the land-only neighbourhood (otherwise every coast became a "ridge"); ice sheets are bg.accent.
  - **Maps:** normal, roughness and valley shading, the last on land only.
  - **Where they live:** `textures/` sits in the existing `public/assets/lessons/topic02/datum-guided/` folder, not in the brief's suggested `topic-02/…`, to keep the block's assets in one place. The runtime no longer imports the world-map outlines.
- **One studio light for everything** (`datumHolo.ts` `STUDIO_GLSL`). It is fixed to the view, so a turned globe stays lit, and the close-up uses the same chunk:
  - a broad key from the upper left with a wrapped, soft terminator;
  - a weak fill from the right and a warm ambient a little brighter from above;
  - GGX highlights driven by roughness and a gentle rim.
- **Earth:**
  - **Land:** relief comes from the normal map, on land only, so the sea stays one smooth ceramic surface; land is a mineral satin.
  - **Sea:** the bright ceramic with a soft sheen. It is now 86–93 % opaque (it was 72–82 %), so the sphere reads as a lit solid; the bodies still show faintly through it.
  - **Geometry:** displaced by the real relief, with its normals taken from the smooth envelope so relief light is not counted twice. Poles ease to one mean height (no spike).
- **The cut:**
  - **Lip:** a rounded lit lip runs along both cut meridians — the shell's thickness, legible from any side.
  - **Band:** the band of the Earth's material above the geoid on the cut faces (data: surface minus geoid) is a sand band with a lit lip and a shaded inner edge.
  - **Panes:** they get a soft darkening toward the axis where the two faces meet. No geological layers, core or mantle.
- **Reference bodies:**
  - **Geoid:** a lit, more present blue body. Opacity is 0.44 at rest and 0.6 when chosen (it was 0.15 / 0.3), and its inner side is darker so it reads as a volume.
  - **Ellipsoid cage, now in three depth classes:** crisp in front; softer when seen through the geoid (the geoid's front is written to depth with a polygon offset, then the cage is drawn again); faint on its own far side.
  - **Draw order:** the Earth's near side is now drawn between the ellipsoid's hidden and seen passes. A protruding ellipsoid is therefore drawn over the shell (no hole in the shell behind it), and the parts inside the globe are covered.
- **Close-up:**
  - **What it shows:** a small live 3-D scene (`DatumInset3D.tsx`), rendered by the globe's own renderer into the circle (a scissored viewport after the globe, one WebGL context). It is the local section of the wall around the inspection point: two lit tube-bands (blue geoid, orange ellipse), each with a lit crest, a 14 px illustrative depth and a soft shadow, on a cream ground with the Earth's side of the geoid a shade deeper. The camera is tilted 0.36 rad toward the outside of the section; the marked local arc shows as a translucent band.
  - **Geometry:** the view is pure TS (`datumInset.ts`, unit-tested) and is shared with the SVG arrow. The measured pair is exactly fitError's (geoid point, ellipse point on the ray from the ellipse centre). The window grows with the gap, so both points always stay ≥ 14 px inside the circle; no gap is faked, and none is drawn when they meet (< 3 units).
  - **Allocation:** buffers are allocated once and rewritten in place.
  - **Without WebGL** (and until the first 3-D frame), the SVG draws the same section with filled, edged and highlighted bands and a blurred shadow.
  - **Choices:** band widths and depth are fixed in screen pixels (illustration only). A slightly lighter gain on the bands (×1.14) keeps their small size readable. The bands and the arrow points are new drawing, not new text.
- **Not changed:** `DISPLAY_K`, the framing, `fitError` / `bestFit` / `START` / `RANGE` / the score, all controls, copy (copy check: every original sentence verbatim, no new strings this round), RTL, the palette (lighting varies tokens only).
- **Verification (isolated worktree):** this round again ran on an isolated worktree (HEAD + the datum files, :3005). On the shared server the lesson-2 page returned 500 because `MeasurementTerrain3D.tsx` was missing (another session's in-progress rework of the measurement mission).
  - **Browser QA:** `QA_BASE=http://localhost:3005 node scripts/qa/shot-datum.mjs` passes 51 checks with no console or page errors. New checks: both bands are drawn in the close-up; the arrow's points are inside it; the close-up changes with the pose; zero textures or buffers are created while the demo plays; leaving the lesson client-side releases the context, every buffer and every texture this block creates; the SVG close-up is drawn without WebGL.
  - **Unit, build, copy:** unit tests 20/20, including 4 new close-up tests. `next build` exit 0. Copy check unchanged.
- **Left versus the mockup:**
  - The mockup's opening is an opaque brown crust and a near-solid blue mass. Here the geoid stays translucent so the exercise wall's section stays readable, and the palette has no brown.
  - Its sea has a crackle pattern, which would be invented detail here.
  - Its close-up geoid is strongly wavy at the local scale. Here it is as wavy as the exercise's own geoid is at that point.
  - Its close-up has a "הפרש (מוגזם)" label; no text was added here.
 
### 2026-10-11 — Reference systems design alternatives, lesson 2

- Deliverables: `design/mockups/topic-02-reference-systems-2026-10-11/`; three generated image proposals and a Hebrew interaction brief for Claude Code. No lesson code changed.
- Scope: replace or redesign only `ReferenceSystemBlock` after UTM. Keep the existing course navigation and approved palette. User explicitly requested three alternative layouts and allowed new interactions.
- Teaching call: compare geographic WGS84 with WGS84 / UTM, rather than imply geographic coordinates are themselves a flat projection. For a projected reference system, datum + projection also needs axes, units and projection parameters.
- Cartography in generated proposals is illustrative. Raster grid ticks, scale bars and coordinate labels are not validated data; the implementation must replace these with a consistent coordinate transform or a clearly labelled schematic.
- Concept 3 requires an explicit source for the missing zone/hemisphere; this source must be added to the actual task. Its tentative ring is an unresolved state, not a plotted coordinate.
- The generated pictures are visual directions. Exact UI values, editable Hebrew labels, keyboard alternatives and reduced-motion states remain governed by project instructions and the accompanying brief.


### 2026-10-11 (third pass) — measurement mission: real landscape, a body per view, one screen

Prompt: user follow-up to `design/mockups/topic-02-geodesy/claude-measurement-mission-prompt.md`; mockup `03-measurement-mission-v2.png`.
Starting point: the user's screenshot, saved as `design/screenshots/measurement-mission/before-round3/user-start-screenshot.png`, plus the round-2 shots in the same folder.

**Why the asset was replaced, not tuned.** The procedural height field (noise + stream-power erosion) kept producing cones and a wall-like range, and the user ruled out more noise, erosion or shader work on it. The terrain is now **real**:
- SRTM 1″ heights of the Carmel's west flank around 32.71 N, 34.98 E: graded spurs, the wadis that cut them, a low escarpment, the coastal plain.
- A 4.5 × 2.3 km window; the crop ships in `scripts/blender/data/`.
- Heights are scaled ×0.8696, so the spur under B is exactly 120 m. They are drawn 2.5× high (the section's "הגבהים מוגזמים" note covers it).
- The sea and coastline are shaped in the script: a gentle curve, the sea widening toward the viewer.
- Stations sit on one straight survey line. Local corrections ≤ 4 m make the ground exactly H = h − N: C −4.0, B −0.8, A +1.8 m.
- The place is not named on the page: it is a "דגם נוף", and its N values are teaching values, not this place's geoid.

**Rendering choice.** A live R3F model at this quality (thousands of tree crowns, soft sun, contact shadows) was not reachable. The user allowed a high-quality render with live analytic layers:
- **The render:** Cycles, one fixed camera (55° down, 4° from the sea side, 70 mm), 1400 × 800, AgX Medium High Contrast.
  - Light: an even sky plus a single warm sun from the left. The repo's `sky.hdr` was dropped because its own sun fought the key light.
  - Layers: land, land-cut, geoid, geoid-cut, ellipsoid-cut, three tripods with their shadows. ≈ 525 KB WebP in all.
- **The page:** it projects everything live through the exported world→clip matrix:
  - pins (HTML buttons), the station ring and the dashed survey line (visible runs only, from ray casts in the render)
  - the cut face's three lines and their names, the surface view's place names
  - the section's horizontal registration
- **No rotation is offered on the landscape:** it does not exist. The ellipsoid does turn: it is SVG.

**Vegetation and ground.**
- Vegetation: ≈ 94 k instanced crowns (pine darker, oak olive), plus low shrubs in the open batha.
- Rock: limestone outcrops on steep ground and contour-parallel ledges.
- Plain: tilted field plots, hedges, orchard blocks and a coastal road.
- Textures: the contour scene's CC0 textures are used for **light and shade only** (`detail()` in the script). Their own hues — reddish sandstone, orange soil — were wrong for Mediterranean limestone.

**One vertical scale on the model too.** A first try drew N three times higher than H so the geoid's waves would show. The unit test caught that it put the ground at A *below* the ellipsoid (h would read as negative). N is now drawn at the land's own scale, so h = H + N holds on the model, as in the section. The geoid's waves are therefore subtle in 3D (≈ 5 px at B). They read in the section, where N is still 17 px.

**Views.**

| View | Stage | Section | Control |
| --- | --- | --- | --- |
| פני השטח | the bare landscape, place names from the view's own sentence (הרים · גיא · ים) | ground only, no reference sheet | station row; A/B/C on the land |
| אליפסואיד | an SVG 3D ellipsoid: graticule, axis, radius a, f against the sphere of radius a, the local area with a leader | ground + ellipsoid | drag / arrow keys; side and top buttons |
| גיאואיד | the landscape opened along the survey line (the cut opens by itself on entering) | geoid main, ellipsoid quiet | cut toggle |
| גליות וגובה | the landscape with the tripod at the picked station | all heights | the task panel |

- **Ellipsoid flattening:** drawn at 0.13, schematic and labelled "המחשה סכמטית · הפחיסות מוגזמת". No a or f value is invented or shown.
- **Geoid cut:** the slab in front of the line is removed. The face is plain ground tone with no strata, so the geoid is never a "layer". The sheets are a faint grid in the opened strip, the geoid continuing into the sea.

**Fits one screen.** Every view keeps the task view's split. Measured with the card at the mockup's card top (y = 288, the title and lead still above it):
- explanation views: 763 px, bottom at 1051
- task view: 829 px, bottom at 1117

The explanation section is 270 px and never drawn steeper than 5 : 1, so its peaks don't spike. The ellipsoid view lends 60 px of it to the stage.

**Text.** No lesson text changed.
- Added, all operational or naming:
  - `מהצד`, `מלמעלה`, `פתיחת חתך`, the group label `מבט על האליפסואיד`
  - the hint `גררו כדי לסובב`, the note `המחשה סכמטית · הפחיסות מוגזמת`
  - the place names `הרים`, `גיא`, `ים` (words from the surface text)
  - the ellipsoid's aria description
- The landscape's aria description (written in round 1) now describes the new model.

**Left as is.**
- The surface view's text column is short beside a tall stage.
- A's arrows in the task section stay short (H = 30 m at one linear scale: 15.6 px).

## 2026-10-11 — Topic 02 coordinates 2: "מערכות ייחוס" becomes "אותה נקודה, שתי שפות"

Brief: `design/mockups/topic-02-reference-systems-2026-10-11/claude-linked-comparison-prompt.md` · mockup `02-linked-comparison.png`.
Code: `ReferenceSystemsLinkedComparison.tsx` + `reference-systems/` (utm.ts, referenceSystems.data.ts, referenceSystemsGeometry.ts), wired in `CoordinatesPart2Scene.tsx` → `ReferenceSystemBlock`.

**Terrain is illustrated, registration is synthetic.** No existing asset fitted (printed labels or grids, no bridge, satellite look, 1254 px). A new base was generated in code: `scripts/maps/build-reference-systems-terrain.mjs` → `public/assets/lessons/topic02/reference-systems/linked-terrain-base.webp` (2000 × 2000, 1 px = 1 m), lossless master `design/assets/reference-systems/linked-terrain-base-master.png`. It is registered in WGS84 / UTM 36N on the extent E 700000–702000, N 3520000–3522000 (≈ 31.80° N, 35.12° E). This is a teaching registration, not a survey of that place, and the data file says so.
- **Palette:** only the brief's 11 tokens (bg, bg.elevated, bg.accent, border, border.subtle, border.strong, fg, fg.muted, fg.dim, brand, brand.dark), plus their mixes and transparency. The script checks each hex against `tailwind.config.ts` before it writes. The river is pale sage, not blue.
- **Symbols are larger than life,** as on any map: road 14 m, bridge deck 22 m, houses ≈ 34 × 24 m.

**Maths.** Krüger series to n⁶ (Karney 2011), no dependency. It matches proj4 2.22.0 to ≈ 2 nm across zone 36 (checked in a scratch folder; reference values are pinned in `scripts/qa/reference-systems.test.mjs`).
- Points store E/N in whole metres; ϕ/λ are always derived.
- Readings show 0.01″ (≈ 0.3 m) against whole metres, so ϕ/λ are at least as fine as E/N. The displayed DMS converts back to within 0.5 m of the stored E/N. (0.1″ ≈ 3 m was too coarse for the "same point" claim.)
- The graticule is drawn through toUtm, so it leans ≈ 1.12°. That is the real grid convergence 2.1° east of the central meridian. It is not decoration and not a projection-distortion demo.

**Layout decisions (the mockup is composition only).**
- Crop: one 5:4 window (VIEW y 150–1750 m of the 2000 m square) for both maps. It was moved 50 m down from centre so pin B clears the top label row.
- Map titles: the original column names (היטל גיאוגרפי / היטל UTM). Under each: the system code WGS84 / WGS84 / UTM 36N. Not the mockup's "מערכת גיאוגרפית".
- Readout labels: רוחב ϕ, אורך λ, מזרח E, צפון N (terms already in this scene), units מעלות / מטרים, and "פלח וחצי כדור" = 36N (the phrase "הפלח וחצי הכדור" comes from the original row).
- The table became three tabs. The two values of the active row sit under the maps' columns, each with its column name, so the table's header pairing survives.
- The TERMS formula (דאטום + היטל = מערכת ייחוס) moved, unchanged in text, to its own card under the comparison. Its title and body now use the Table 2 tiers (black, text-base/lg).
- **Not built:** the mockup's yes/no question and closing sentence (new teaching text), its marketing title, and the "הרשת / הדאטום" chips. The tabs are exactly the table's rows.
- **Scale bar on both maps:** it belongs to the shared base, not to either coordinate system. The geographic reading card itself shows no metres.

**Below the 1440 target only** (no new mobile design): when a map box is narrower than 400 px the pins shrink. Under 420 px every other meridian label steps aside. Under 340 px the edge labels are hidden. Checked clean at 390 / 480 / 640 / 768 / 1024 / 1280 / 1440 (no overlap, no clipped reading, no horizontal scroll).

**QA:** `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/reference-systems.test.mjs` (maths and data) and `… scripts/qa/shot-reference-systems.mjs` (browser: picking, hover, keyboard, modes, reset, registration, overlap, fallback, reduced motion, copy, palette). Screenshots: `design/screenshots/reference-systems/`.

## 2026-10-11 (evening) — Guided datum: material match (ivory, orange cage, blue geoid)

Brief: `design/mockups/datum-concepts/claude-material-match-prompt.md` · mockup `01-guided-3d-site-palette.png`. Code: `datum/DatumGlobe3D.tsx`, `datumHolo.ts`, `DatumInset3D.tsx`, `scripts/build-datum-textures.mjs`. Screenshots: `design/screenshots/datum-guided/material-match/` (before / after / mockup per state, `rounds/` per tuning round).

- **Ivory finish is decoration, not data.** The sea carries a seeded craquelure (a random partition of the sphere drawn as thin light lines) and a soft mottling, in its albedo and roughness only — never in the normals, the height or on the land. It means nothing geographic or geological. The ivory's shade turns toward border.strong in the shader (land excluded), not through a scene filter.
- **The shell is almost solid now** (land 1 / 0.99, sea 0.985 / 0.965): the earlier see-through sea turned the ivory grey-blue. The bodies inside show only through the opening.
- **The crust on the cut faces** is tan deepening to a breath of fg at the geoid, under a thin ivory skin at the surface — the reference's brown crust with existing tokens only. The lip tube is thinner (radius 3.3 → 2.1) and matte.
- **Cage density:** 10°, tuned against the reference's cells at full fit and the same globe size (the brief's 15° start gave cells about twice the reference's). Meridians run to ±60°, every third one to ±80° (the last parallel), so 36 lines never knot at the poles.
- **The geoid is near-solid** (0.88; 0.94 when chosen; 0.74 while the ellipsoid is chosen, so the body inside stays legible). This updates the earlier "highly transparent" direction, per the brief. Its waviness is shaded from its own data (normals from geoidW3 with the departure × 2.6, crest/trough shade from the same departure); positions, geoidAt, geoidW3 and every gap are unchanged. Blue grid: 3 parallels + 2 meridians at 0.12–0.18.
- **Seen through the geoid, the cage stays orange:** thinner (×0.75) but kept at 0.74–0.88 alpha. Orange alpha-blended half-way into blue turns grey, so "fainter" is expressed by width, not by transparency. For the same reason the ellipsoid's skin is thin (0.035 / 0.07) and its rim and soft highlights carry the surface; a thicker skin greyed the blue in the fit state (measured: trough (108,120,130) with the skin vs (95,120,143) without).
- **Far-side cage fix:** the far side of the cage was showing through the cut faces as a faint "ghost sphere" (a GreaterDepth test passes wherever a wall is in front). It is now tested against the walls and its own inner side (pushed back), and drawn under the geoid's surface.
- **Mockup angle:** the brief asks for a comparison at an angle similar to the reference. The `-angle` states turn the camera with the existing orbit drag (stage px (300, 170) → (230, 185)); opening state and geometry are unchanged. The reference's cutaway (orange half-body in front of the blue) is an illustration that the live geometry does not reproduce — at mid-demo the ellipsoid is inside the geoid.
- **Integrated page:** it broke mid-round (another session's `EllipsoidModel.tsx` imported a not-yet-written `./StageControls`, then repeated full reloads). The "before" set and rounds 1–3 were shot on the shared :3000; the final "after" set, QA, fallback and build ran in the isolated worktree `.claude/worktrees/datum-material` (HEAD + the datum folder, its own server on :3021 — :3005 and :3007 belong to other sessions).

### 2026-10-11 (fourth pass) — measurement mission: turnable models, a synced section, one screen at 1122 / 900 / 800

Brief: `design/mockups/topic-02-geodesy/claude-interaction-layout-followup.md`. Before / after: `design/screenshots/measurement-mission-interactive/{before,after}/h{1122,900,800}-*.png`, side by side in `compare/h*.png`; QA states in `qa/`.

**The landscape turns, and it is still the renders' landscape.**
- **Model:** `scripts/blender/export_measurement_model.py` imports the render script's own fields. It writes:
  - the ground H on a 10 m grid (`model-height.bin`)
  - the diorama rendered straight down with the same sun, sky and AgX look (`model-albedo.webp`)
- **Drawing:** `MeasurementLandscape3D.tsx` meshes the grid and drapes the image on it unlit. Light on diffuse ground does not depend on the viewing angle, so every angle shows the render's colours, rock, fields and tree shadows.
- **Trees are flat in the image.** At ≈ 6 m per screen pixel a crown is under a pixel; their volume is not modelled.
- **Walls:** the colours are sampled from `land-cut.png`, shaded once per side for the renders' sun.
- **One view state, `LandView {az, elev}`,** shared by the three landscape views.
  - `measurementView.landCamera()` re-runs the renders' camera solve for any angle and box. So the model stays centred and as large as the box allows, with square pixels. At the opening view in a 1400 × 800 box it is the renders' camera (unit-tested to 0.5 px). The renders stay as the loading view and the no-WebGL fallback.
  - The R3F camera and every HTML anchor (pins, names, the arrows' letters, the links to the section) are computed from that one camera.
- **Limits:**
  - **Round:** ±62°. Past side-on the model would be seen from behind, and the section below runs C → A left to right.
  - **Tilt:** 16°–84°, never under the ground.
  - **No wheel zoom,** so page scrolling is never captured.
  - **Drag:** becomes a drag only after 5 px. Only then is the pointer captured, so a drag that starts on a pin never picks it.
  - **Keys:** arrows turn the focused stage.
- **Hidden points:** `hiddenBy()` marches over the height grid toward the eye. A hidden station keeps its pin, dashed and faded and still pickable, and its link to the section turns quiet. A hidden place name fades out.

**Task view framing.** At the whole model's framing the arrows on the cut face are ≈ 20 px at B. The task view therefore glides (650 ms; at once under reduced motion) to a frame on the survey line, x −2.45 … 3.55 world units: the whole depth is kept, and the model's sides fade out.
- It also looks along the face more directly: `framedView()` maps 55° → 35°, keeping every angle in order.
- The camera moves only when entering or leaving that view, never when a station is picked.
- B's h is ≈ 60 px there.
- A's arrows stay small in 3D (h = 18 m at true scale); they read in the section.

**The cut and the heights are in the model.**
- **The slab:** opening the cut drops the slab in front of the survey line away below the table (clipped there), and its share of the contact shadow goes with it.
- **The sheets:** the geoid sheet (wavy, the land's scale) and the flat ellipsoid in the open strip are depth-tested surfaces with a world-space grid, so the land hides them.
- **The arrows:** h, N and H stand on the face. N and H are stacked on one upright, from the ellipsoid and then from the geoid; h is beside them. Each has a tick on the surface it starts from. Their lengths are the station data (unit-tested).
- **The receiver** stands beside the station, behind the cut edge.
- **Where the face's lines are named:** in the task view, over the wadi between C and B, clear of every station's arrows.

**The section does not turn.** It is data along the survey line. It answers the turning in three ways:
- the link from the picked station's pin, which follows the camera
- the picked station, which is the same everywhere (pin, station buttons, and now a click on the station's point in the section, pointer only)
- in the ellipsoid view, its focus

It registers with the opening view of the current framing (B under its pin). To keep A's H arrow ≥ 14 px at 800, C may now sit 16 px (was 28) from the plot's edge, and the task section is at least 184 px tall.

**The ellipsoid: one view state (`EllView`).**
- **Controls:** a drag, the arrow keys, "מהצד", "מלמעלה" and "מבט התחלתי" all move it.
  - The two buttons change the tilt only and keep the turn. A sideways drag after "מהצד" stays side-on, and the button stays pressed until the body tilts.
- **Marked area:** moved to longitude 52°, so the opening view is not already in focus. It carries the survey line and its three stations.
- **Callout:** `ellipsoidView.patchView()` places the area and the callout from its line's ends to the section's plot with the same transform as the body.
- **Focus:** a smoothstep of how squarely the area faces the reader, 0.55 → 0.93.
  - It sets the section's strength (40 % → 100 %) and the callout (dashed → solid).
  - From above, the area is seen at a slant and the section dims. From the side it is partly in focus.

**One screen.** The card fits under the site's fixed header (80 px) with 12 px above and below.
- **Shared height:** the illustration column takes what is left, between 520 and 695 px, and every view shares it.
  - Only the active view's text takes room, so inactive tabs no longer reserve space.
- **Text column:** widens on short screens (346 → 440 px). There the model is framed by the stage's height, so the width costs nothing.
  - From 420 px the answer field and both buttons share one row.
  - h and N sit side by side in every case.
- **Measured** (card top at header + 12):

| Screen | Card height | Card bottom | Fits |
| --- | --- | --- | --- |
| 1440 × 1122 | 831 | 923 | all four views and the completed task |
| 1440 × 900 | 796 | 888 | all four views and the completed task |
| 1440 × 800 | 696 | 788 | all four views and the completed task |

  No inner scroll anywhere.

**Text.** No lesson text changed.
- **Added:** "מבט התחלתי", the name the brief suggested.
- **Extended:** the turnable landscape's accessible description, with the ellipsoid's existing sentence "גררו או השתמשו בחצים כדי לסובב.". The renders, which do not turn, keep the plain description.

**Left as is.**
- **A in 3D:** its arrows are a few pixels long at true scale.
- **Label overlaps:** at some angles a place name or a face label sits near a pin; the pins stay on top.
- **QA renderer:** the browser QA drives WebGL through SwiftShader.

## 2026-10-11 — Topic 02 coordinates 1: the datum slider becomes a find-and-fix task ("הדמיה: מה קורה כשהדאטום לא תואם?")

Brief: `design/docs/datum-field-challenge-claude-prompt-2026-10-11.txt` · mockup (composition only): `design/mockups/topic-02-datum-shift-2026-10-11/mockup-field-challenge.png`.
Code: `src/components/lessons/topic-02/datum-field/` — `DatumFieldChallenge.tsx` (UI), `datumField.ts` (model + task reducer), `datumField.data.ts` (landmarks, shift, footprint), `datumFieldProjection.ts` (the one projection), generated `datumFieldTerrain.data.ts`. Wired in `CoordinatesScene.tsx` in place of `DatumShiftDemo` (removed with `ImpactMap`).

**Terrain: a new Cycles render.** No existing asset has a bridge, a crossroads and a summit in one terrain. `scripts/blender/render_datum_field.py` builds a procedural diorama around the three landmarks, in the reference-bodies landscape's render language (Cycles, the repo's CC0 textures for light and shade only, one fixed camera, pale cut base, contact shadow). Palette: the illustration colours of design-spec §3 / `referenceBodiesStyle.ts` and their mixes; contours #8A6F4D every 10 m, computed from the ground itself. `scripts/blender/package_datum_field.cjs` → `public/assets/lessons/topic02/datum-field-challenge/` (manifest there).

**Assumption — compact landmark coordinates.** The brief's suggested points (junction 1000/600, summit 1400/1000) spread 400 m. In the 668 × 374 px picture at 1440 the 60 m gap would then draw at ≈ 45 px. The bridge keeps 1200/800 (→ B 1164/752). The junction is 1090/760 (→ 1054/712) and the summit 1310/825 (→ 1274/777). The diorama is E 985–1425 × N 718–913 m, with the camera at 55° elevation and 4° azimuth (as the reference-bodies landscape). The gap draws 88 px (bridge), 79 px (junction) and 62 px (summit). The summit heads a ridge that runs north-east, so its displaced point stays on the crest and in view. The render asserts the summit is the model's highest point.

**Model.** B = A − (36, 48) for every point. The map reads numbers as B, so A's numbers land at P + (36, 48) and converted numbers land at P.
- The gap is metres of the plane, derived from the marker's position — never pixels.
- The source numbers are immutable; a conversion is applied once.
- A run id guards against stale arrivals: a landmark switch or reset mid-motion drops the motion.

**Layout decisions (the mockup is composition only).**
- Panel : picture stays 1 : 2.4 (`lg:grid-cols-[1fr_2.4fr]`, `p-6 lg:p-8`, `gap-6 lg:gap-10`). The card is 1052 × 759 px at 1440 and keeps that height in every state, hint included.
- Data rows: label and numbers on one line (the mockup stacks them; at 278 px only one of the two rows fit stacked consistently).
- The "דאטום במפה: B" row shows the numbers the map uses: A's numbers before the fix, the converted pair (with a check) after. That puts the converted pair beside the source.
- The gap readout keeps the old block's wording and thresholds (`readGap`), marked by shape (diamond / check), never by status colours. The number counts down with the marker; the wording switches when it arrives.
- The bottom band's neutral state is "משמעות הסטייה בהדמיה" with the consequence. After a check it carries the wrong feedback (bg-accent, x) or the success (brand tint, check); the success band appears only after the marker arrives.
- The hint shows in a one-line slot under the buttons and frames the A/B rows with `border-accent`.
- The thumbnails are 16:9 crops of the same render, shown 21:9 (`object-cover`) so the picker row stays short.
- Not built from the mockup: its panel title, row subtitles and icons, the pink map row, the success band's sentence and mini-diagram, the scale bar (in this perspective a bar is true along one line only), the card icons.

**Text.** The title, the first sentence, "(על ההיטל – בחלק הבא)." and the schematic note are unchanged. Only the slider instruction changed, to the brief's sentence. Added, all from the brief's operational list: the steps, the data labels, the question and the two answers, "בדיקת הבחירה" / "רמז" / "איפוס", the point names, the two feedback lines and the hint. Also added, not in the list:
- the steps list's label "שלבי המשימה" and the sr-only "(הושלם)";
- the picker's legend "בחירת נקודה";
- the picture's description;
- the failure line "לא ניתן לטעון את תמונת השטח." and its button "נסו שוב".

**Left as is.**
- The old backdrop `public/assets/lessons/topic02/scene-coordinates/TOPIC02-COORDINATES-DATUM-MAP.webp` is no longer used by this block. It stays in place.
- No mobile design (below `lg` the card stacks: panel, picture, picker, band).

**QA:** unit `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/datum-field-challenge.test.mjs` (model, task transitions, projection ↔ render data, assets, copy); browser `QA_BASE=<dev url> node scripts/qa/shot-datum-field-challenge.mjs` (states, motion sync, no double conversion, mid-motion switch, reset, keyboard, reduced motion, failed image + retry, no layout jump). Screenshots: `design/screenshots/datum-field-challenge/`.

## 2026-10-12 — Topic 02 coordinates 2: "מערכות ייחוס" follow-up (no tabs, explicit message)

Brief: `design/mockups/topic-02-reference-systems-2026-10-11/claude-linked-comparison-followup.md`. It supersedes the first brief's tab and verbatim-copy rules for this block only. Code: `ReferenceSystemBlock` in `CoordinatesPart2Scene.tsx` and `ReferenceSystemsLinkedComparison.tsx`.

**What changed**
- The three exploration tabs and "איפוס" are gone. The brief allows dropping the reset ("אם נשאר כפתור איפוס"), and the "A גשר" choice already returns to the opening state.
- The copy is the brief's wording: key sentence, lead, instruction, map titles and axis lines, units, zone meaning, feedback, fixed sentence, comparison table, conclusion and definitions. The "+ / =" formula was removed.
- Choices show the letter as a pin-style badge (filled orange = chosen, outlined = not) plus the feature name. The accessible name is "A גשר", without the middle dot so screen readers don't read "dot".
- The system code moved from the map header into a supporting line under the readings: `WGS84` and `WGS84 / UTM 36N`. On the UTM side, "פלח 36 · חצי הכדור הצפוני (N)" follows it. The "UTM 36N" chip on the map was removed, so there is one tag fewer over the terrain.
- φ (U+03C6) is used in the reading labels, as the brief writes it. The rest of the scene still uses ϕ (U+03D5); both are the same letter.

**Map hierarchy**
- Grid lines are `stroke-fg/40`, 1 px. Edge labels are medium weight on `bg-bg-elevated/75`, three per edge: the top band starts at 0.2, which drops the 35°07′00″ label next to the north arrow.
- Unselected pins are size-7 and outlined. The chosen pin is size-9, orange and filled. The feature ellipses (`ring` in the data) were replaced by a small anchor ring of about 13 px around the pin tip, so the bridge, ridge and village stay visible.
- The base image, crop, scale and coordinates are unchanged.

**Motion.** On a selection the new values and the feedback line fade in once from 0.25 opacity over 250 ms, and the chosen pin scales from 0.75. There is no loop. With reduced motion the update is instant.

**Fit at 1440 × 1122.** With the section heading 16 px under the site header:
| Element | Ends at |
| --- | --- |
| Maps | 831 px |
| Readings | 990 px |
| Feedback line | 1087 px |
| Fixed sentence | 1121 px |

The comparison, conclusion and definitions follow below the fold, which the brief allows.

**Out of scope, left as is (terminology conflicts with this block):**
- `SceneHeader` intro: "בשני ההיטלים המרכזיים: היטל גיאוגרפי והיטל UTM".
- The `ProjectionsBlock` closing line: "קיימים שני היטלים מרכזיים: היטל גיאוגרפי והיטל UTM".
- The `LatLonExplorer` section heading: "מערכת קואורדינטות גיאוגרפית – היטל GEO".
- `Part2Summary` items 2 ("היטל גיאוגרפי") and 4 ("מערכת ייחוס – השילוב בין הדאטום להיטל").

**QA:**
- Unit tests: `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/reference-systems.test.mjs`.
- Browser QA: `QA_BASE=… node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-reference-systems.mjs`.
- Shots are in `design/screenshots/reference-systems-2026-10-12/`; the `00-before-*` files show the version this replaced.

## 2026-10-12 — Guided datum: interaction and learning refinement

Brief: the user's message, with the detailed version in `design/mockups/datum-concepts/claude-interaction-and-learning-refinement-prompt.md`. Files: `topic-02/datum/` (DatumGuided, datumDemo, DatumGlobe3D, DatumInset3D, DatumSection, datumOverlays, `gapAt` added to datumGeometry). Nothing outside the datum block changed. `fitError`, `bestFit`, `START`, `RANGE`, `scoreFor` and `DISPLAY_K` are unchanged; the unit tests still pin them.

**What each station does now**
- **1 "גוף הייחוס":** the surface choice ("פני השטח" / "גיאואיד" / "אליפסואיד") appears only here. The bodies sit in one nested composition (`OVERVIEW`: the ellipsoid centred, at the geoid's mean size). A choice changes only the look (`LOOKS` in DatumGlobe3D):
  - surface: the shell solid, its relief raised (bump 1.4), the cut outlined; the bodies inside quiet;
  - geoid: the shell becomes a veil (sea 0.26, land 0.48), the blue body whole, with stronger waves and contour lines; the cage barely there;
  - ellipsoid: the shell a veil, the geoid opened to a quiet reference (0.58), the skin and cage in front.

  A choice never touches the pose, the fit, the check point or the camera. Choosing the active surface again does nothing; it no longer resets the view.
- **2 "מיקום וכיוון":**
  - **The demo button:** one button under the globe, in place of the round play button: "הפעלת ההדגמה" → "עצירת ההדגמה" → "המשך ההדגמה" → "הדגמה חוזרת". Beside it, a stepper of the phases "הזזה › סיבוב › קנה מידה".
  - **The demo:** from `DEMO_START` = (72, −52, 26°, ×0.80) to the computed global fit. Each phase changes only its own parameter (unit-tested).
  - **Temporary marks:** the dashed start outline and its track (shift); the body's axes against a fixed dashed vertical/horizontal (rotation); the outline at the size before the phase (scale).
  - **The experiment:** "נסו בעצמכם" opens it, closed by default, with "הזזה אופקית (X)", "הזזה אנכית (Y)", "סיבוב" and "קנה מידה", plus the schematic note. A focused parameter shows its own mark (an axis arrow, the axes, or the earlier outline) and names itself in the feedback. "איפוס" returns to `DEMO_START` without touching the camera. "הצגת התאמה" eases to the fit, with no score. "חזרה להדגמה" closes the sliders.
- **3 "עולמי ומקומי":** global / local only, applied at once (a 700 ms ease, instant under reduced motion). Two fixed check points ("באזור המסומן" / "מחוץ לאזור"), chosen under the globe or by clicking the quieter ring on the wall:
  - **inside:** t = −1.0, the middle of `LOCAL_ARC`;
  - **outside:** t = +1.0, its mirror below the equator.

  Measured gaps (section units), at the inside / outside point:
  - global fit: 10.3 / 3.9;
  - local fit: 0.4 / 40.6.

  The feedback words come from these numbers: < 3 "כמעט חופפים", < 8 "פער קטן", < 20 "פער", otherwise "פער גדול". The second sentence compares with the other fit at the same point. Nothing is hard-coded to favour local. The marked region is now also a 3-D band on the geoid with two end caps, since the whole blue body covers the wall drawing. The wall drawing gained the same caps.
- **Feedback:** a short strip in the globe's column, under its control, in normal flow. QA measures 10–110 px below the stage in every state, including the experiment, the tallest station. Announcements fire once things settle.
- **Removed:** the round play button, the scrubber, the 0–100 % meter, its "good" feedback, the score in every accessible text, "החזרת המבט", fullscreen, the demo copies inside stations 2 and 3, and the experiment in station 3. Camera turning is now limited to azimuth CAM.az ± 0.95 rad, so the opening stays toward the viewer; the polar and distance limits are unchanged. Wheel zoom still needs the stage to be engaged. Keyboard: stations, surface and check-point radios (←/→ in RTL), the four sliders, and the inspection marker (stations 1–2). There is no keyboard orbit, as before.
- **State:** stations keep separate state; leaving station 2 pauses its demo; coming back plays nothing.
- **Reduced motion:** the same button, one phase per click, labelled "לשלב הבא".
- **No WebGL:** the live SVG section now draws the surface (the smooth envelope — the relief needs the 3-D maps), the emphasis of the body in focus, the marked region's caps, the station-2 marks and both check points. Its `aria-label` is the stage description, with no score.

**Copy, before → after (only the brief's approved changes; `scripts/qa/datum-copy-check.mjs` enforces the list)**
| Where | Before | After |
| --- | --- | --- |
| Station 1 | "נחשוב על הדאטום כעל הגוף המתמטי שמתאר בצורה הטובה ביותר את כדור הארץ כולו, או חלק ממנו – ונזכיר כי בלתי אפשרי לתאר את כדור הארץ בצורה מתמטית, רק פיזיקלית." | "האליפסואיד הוא גוף ייחוס מתמטי. הדאטום מגדיר כיצד גוף הייחוס מעוגן ביחס לכדור הארץ." + the instruction "בחרו משטח כדי להבחין בינו לבין יתר הגופים." |
| Station 2 | "המטרה: שהדאטום יהיה כמה שיותר דומה וקרוב לפני השטח. בתרשים – כדור הארץ כפי שהוא מוגדר על ידי שילוב של גיאואיד (בכחול) ואליפסואיד (בכתום). הזיזו, סובבו ושנו…" | "בהמחשה נבחן כיצד הזזה, סיבוב וקנה מידה משנים את מיקום גוף הייחוס ביחס לכדור הארץ." The original "הזיזו, סובבו ושנו את קנה המידה של האליפסואיד כדי להלביש אותו על הגיאואיד." moved, verbatim, into the experiment. |
| Readout | "בהמחשה הדו־ממדית יש ארבעה פרמטרים בלבד: הזזה בשני צירים, סיבוב וקנה מידה." | In the experiment: "זהו ניסוי סכמטי בחתך דו־ממדי: שתי הזזות, סיבוב וקנה מידה. השינויים מוגזמים לצורך ההמחשה." |
| Sliders | "הזזה – ציר X" / "הזזה – ציר Y" | "הזזה אופקית (X)" / "הזזה אנכית (Y)" |
| Meter | "התאמה לכל כדור הארץ" / "התאמה לאזור המסומן", N %, and at ≥ 80 % "האליפסואיד מותאם מרחבית לכלל כדור הארץ – זהו דאטום עולמי." (and the local version) | removed; the feedback strip says "תחום ההתאמה: כלל כדור הארץ." / "תחום ההתאמה: האזור המסומן." plus the check-point sentence |
| Accessible text | "…התאמה: N אחוז." | removed |

New short feedback sentences (one per state, listed in the copy check's "added" list):
- **Surface notes:**
  - "המעטפת של כדור הארץ, עם התבליט של היבשות…"
  - "משטח גלי, המתאר בקירוב את פני הים הממוצעים…" (as the lesson's own BODY_TABS words it)
  - "גוף גאומטרי חלק, המתאר בקירוב את צורת כדור הארץ…"
- **The phase notes**, e.g. "רק המיקום של האליפסואיד משתנה; הכיוון והגודל נשמרים."
- **The parameter notes.**
- **The check-point sentences.**

These additions are mine, within the brief's "short, station-dependent feedback". The wording of the station 2 explanation comes from the detailed brief file; the pasted message did not repeat it.

**For a separate review (not changed here):** seven parameters are the common Helmert model for a transformation between reference frames, not a universal definition of creating a datum (PROJ, https://proj.org/en/stable/operations/transformations/helmert.html; NOAA NGS, https://www.ngs.noaa.gov/datums/index.shtml). The card below the block, "תהליך המעבר מאליפסואיד לדאטום נעשה בשבעה פרמטרים", may deserve a precision pass. The brief forbade rewriting the adjacent cards.

**Environment:** the shared :3000 server answered 500 (`__webpack_modules__[moduleId] is not a function`). Another session's `next dev` on :3001 runs from the main checkout and shares its `.next`; I did not stop it. "Before" shots were taken on :3000 before any edit. Everything else ran on an isolated worktree (`.claude/worktrees/datum-interaction`, HEAD + the datum files, `NEXT_DIST_DIR=.next-interaction`, :3041): the QA (117 checks, including leaving and re-entering the lesson), the "after" shots, the fallback re-render and `next build`. The worktree's `CoordinatesScene.tsx` is HEAD's; the main checkout's copy carries another session's uncommitted BODY_TABS wording, which is outside this block.

## 2026-10-12 — Topic 02 coordinates 2: terminology + true north (round 2)

- **Approved terminology fixes outside "מערכות ייחוס", inside CoordinatesPart2Scene only:** scene intro and the ProjectionsBlock closing line now compare "מערכת קואורדינטות גיאוגרפית" and "מערכת UTM" (the closing line adds that UTM uses a cylindrical projection and metres, so the sentence still connects to the projection choices above it); LatLonExplorer heading drops "– היטל GEO"; summary item 2 is "מערכת קואורדינטות גיאוגרפית"; summary item 4 uses the approved definition, and its old tail "בלעדיה אי אפשר לפרש…" was removed because the new definition already says it. "היטל" stays wherever it means a cartographic projection.
- **Left as is (not in the approved list, flagged for a decision):** the UtmBlock heading and summary item 3 still say "היטל UTM". Not contradictory (UTM does use a projection), but it differs from "מערכת UTM" used in the comparison above it.
- **ϕ:** the new readings use ϕ (U+03D5), as in the rest of the scene.
- **North arrow:** both maps share a UTM-registered base, so screen-up is grid north. The plain "N" arrow is now rotated to true north, computed by `trueNorthDeg()` (referenceSystemsGeometry.ts) from fromUtm/toUtm: the screen direction of a 1″ step north along the local meridian at the view centre = −1.120° (anticlockwise). Checks: matches γ = atan(tan Δλ · sin φ) within 0.01°, parallel to the drawn graticule meridian, varies < 0.01° across the view; the browser QA reads both rendered arrows (−1.12°) against the on-screen meridian. Only the arrow glyph turns; the letter, the base image and the grids are unchanged.
- **Dev servers:** :3000 (`next dev -p 3000`, since 2026-10-11) and :3001 (`npm run dev`, since 2026-10-12 09:52, bumped to 3001 because 3000 was taken) both run from the repo root without `NEXT_DIST_DIR`, so they share `.next/`. The .next trace shows the 3001 server cleaned and rebuilt `.next/` at 09:52; since then :3000 answers 500 `__webpack_modules__[moduleId] is not a function` (stale chunk map) and either server can break briefly when the other recompiles. Neither server was stopped. Fix when convenient: run only one dev server per `.next/`, or give the second one its own `NEXT_DIST_DIR` (next.config.mjs already supports it).

## 2026-10-12 — Topic 02 coordinates 1: the datum task becomes one map with three stages ("הדמיה: מה קורה כשהדאטום לא תואם?")

Brief: `design/docs/datum-field-challenge-followup-claude-2026-10-12.txt` (replaces the structure of the 2026-10-11 task above). Screen card: `design/docs/datum-field-challenge-screen-card-2026-10-12.md`.
Code: `src/components/lessons/topic-02/datum-field/` — `DatumFieldChallenge.tsx` (UI), `datumField.ts` (model + stages reducer), `datumField.data.ts` (world, places, cases, terrain), `datumFieldProjection.ts` (world → picture). The scene wiring is unchanged.

**The map.** One straight-down picture (`field-map.webp`, 1190 × 1435), built by `scripts/maps/build-datum-field-map.mjs` from the same world data as the live layers: a height grid shaded in 2D like a map's relief (no 3D model), sand and stone, garrigue, a stream in the lessons' water #7FB4C6, a bridge at E 1200 · N 800 and a crossroads at E 1090 · N 760. Manifest beside the picture.
- **Assumption — a portrait extent.** E 960–1300 × N 552–962 m (340 × 410 m) at 3.5 px/m. At 1440 the map box is 528 × 637 px (1.55 px/m: 60 m ≈ 93 px, 120 m ≈ 186 px). The extra north–south ground lets the map fill the row beside the panel. The card is 1052 × 821 px in every state and the way-on button never moves. With the title just under the site header the card ends at y ≈ 1105, so instruction, map, action and feedback are on screen together.
- Every position the activity can show is at least 25 m inside the frame. Labels lean inward near a side edge.
- The grid is every 100 m of the active datum. B's lines stand 36 m east and 48 m north of A's lines with the same values. With A on, E 1200 and N 800 cross on the bridge; on the B map, A's numbers land where the B grid reads E 1200 · N 800.
- Margin values sit outside the frame: N on the west, E on the south, 13 px bold (the spec's floor for dense instruments). Map labels are 14 px bold.
- The grid slides between the datums only in stage 1. Stage 2 shows the B grid, stage 3 the A grid.

**Layout.** Panel : map = 2fr : 3fr (≈ 40 : 60 of the card's 954 px after the gap), `p-6 lg:p-8`, `gap-6 lg:gap-8`.
- Surfaces follow `design/docs/lessons-02-06-ui-cleanup-spec.md`: one workspace (the card); data rows, the rule and feedback are borderless insets (the active datum's row tinted `bg-accent/15`); the experiments and options use the option recipe; no shadows on map labels; the legend is T6. Text tiers stay those of the scene's neighbours (DatumGuided, MeasurementPanel: Table 2, `text-black`).
- The stage row reuses the lesson's tab pattern (landforms tabs), at 44 px. It is free to move between: a demonstration is not a score, so no stage shows a completion check.
- The panel order is the brief's: question → source/target rows → action → feedback, with the way on in a fixed footer.
- In stage 2 the rows form the data's way: source (A, kept) → "מספרים ללא שינוי" / "המרה A→B" → the copy sent, with its label tag → "פירוש כ־B" → the map.

**Decisions inside the brief.**
- "שינוי הכיתוב בלבד" is a toggle; pressed again it reads "ביטול שינוי הכיתוב" and returns to the state the experiment started from — the raw copy, or the conversion if it was tried after the fix.
- "המרת הנתונים מ־A ל־B" stays available after the fix. It replays before → after from the true source (the re-runnable comparison) and never converts twice. The label experiment also stays open after the fix.
- The label experiment's helper is one line under both buttons, prefixed with the button's name, and is its `aria-describedby`.
- The rule ("בהמחשה הזאת: A→B מחסיר (36,48); B→A מוסיף (36,48).") and its left-to-right formula are shown in both practice cases, not only the second. Both cases keep the same layout, and case 1 gets no hint by omission.
- The brief's case names ("הדאטום כבר תואם", "כיוון ההמרה הפוך") are not shown: they would give the answer. The case line is "מקרה N מתוך 2 · <the place>".
- While the converted marker is on its way, the panel shows "המחשת המעבר" in place of the output numbers and the map shows no distance number; both appear when it arrives.
- Keyboard: the stage tabs and the A/B switch use the lesson's `useRovingKeys` (`scale/controls.tsx`): RTL arrows, Home/End, modified keys left to the browser. Focus never drops to the page: the copy hands it to the first experiment, a reset back to the copy, the way-on buttons to the new stage's heading; "בדיקת הנתונים" and the convert button use `aria-disabled` and keep focus.
- The next case opens after a right check. The summary ("סיכום התרגול", so it is not mistaken for the part's summary block right below) opens after both. "תרגול חוזר" restarts case 1; "חזרה להדגמה" restarts the whole activity from stage 1 in A, every stage clean.
- A failed map keeps the grid and markers (the activity still works) and shows a notice with "נסו שוב".

**Text.**
- Kept: the title and the first sentence with "(על ההיטל – בחלק הבא).".
- Replaced as the brief asks: the demonstration instruction after it (§10), and the schematic note, now the §4 wording, once, in the lead.
- All stage texts are the brief's.
- Added, not in the brief: the stage-1 line after switching back to A ("הגשר נשאר באותו מקום. בהמרה חזרה לדאטום A המספרים שמייצגים אותו חוזרים לערכים הקודמים."); the row names "מספרי הגשר בדאטום A/B"; the flow words "מספרים ללא שינוי", "המרה A→B", "פירוש כ־B"; "החזרת הכיתוב ל־A"; the case line; "נתוני המקור · דאטום B" and "מפת היעד · דאטום A" (the brief's pattern applied to the cases); the preview line "תצוגה מקדימה: הסימון מופיע N מטר מ…" / "…מופיע על …"; "למקרה הבא", "למקרה הקודם", "לסיכום התרגול" and the heading "סיכום התרגול"; the comparison cell names "כיתוב", "מספרים", "פער", "ללא שינוי"; the legend items "רשת דאטום A/B", "מרחק", "הגשר והצומת בשטח"; "איפוס"; the map's description; "לא ניתן לטעון את מפת השטח." and "נסו שוב"; the screen-reader names "שלבי הפעילות", "בחרו צמד מספרים", "כיתוב: דאטום A/B"; "ביטול שינוי הכיתוב". A Hebrew copy review checked these against the brief's terms (all fixed strings match the brief character for character).

**Removed:** the Cycles diorama, its three thumbnails, the point picker, the hint, the corner north glyph, `datumFieldTerrain.data.ts`, `scripts/blender/render_datum_field.py` and `package_datum_field.cjs` (all in git history at `e7f2e42`).

**QA:**
- Reviews: a Hebrew copy review (all fixed strings match the brief; its wording fixes to the added strings applied) and a code review (a randomized reducer run found no state violations; its keyboard, focus, grid-function, reset and undo findings fixed).
- Unit (model, the three stages, transform, terrain layout, picture, copy): `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/datum-field-challenge.test.mjs`.
- Browser, at 1440 × 1122: `QA_BASE=<dev url> node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-datum-field-challenge.mjs`. It covers every state, positions against the transform, constant card height, labels inside the map and apart, text sizes, motion and live region, keyboard, reduced motion, and a failed map with retry.
- Screenshots: `design/screenshots/datum-field-challenge/`.

## 2026-10-12 — UTM concept mockups

- Three image concepts only, with an interaction brief in design/mockups/utm-concepts-2026-10-12/README.md. No lesson implementation changes.
- Desktop target remains 1440 x 1122. Generated images express composition and states; existing design tokens, Hebrew text and geographic calculations govern implementation.
- The first two Coordinates 1 reference interactions were interpreted as ReferenceBodies and DatumGuided. The next reference-system comparison remains outside the proposed UTM block.
- Audience assumed to be beginners in map reading. Option 1 emphasizes projection, option 2 linked zone exploration, option 3 complete coordinate addressing. Further assumptions are recorded in the scoped brief.


## 2026-10-12 — Geographic coordinates mockup alternatives

- Requested scope: three image mockups for LatLonExplorer in CoordinatesPart2Scene, reviewed against Onboarding, Landforms, Topography, Contours, ReferenceBodies and DatumGuided at 1440 x 1122. No application code changes.
- Interpret the first two Coordinates 1 interactions as ReferenceBodies and DatumGuided. Audience assumed to be beginners in map reading.
- Three proposed interaction directions: globe exploration, synchronized angle lab, and atlas location task. These are alternative proposals for selection, not approved implementation changes.
- Keep existing palette and shell. Image-generated geography, labels and coordinate geometry are illustrative; implementation must use existing tokens, exact Hebrew copy and computed geographic positions.
- A paired side/polar view is a proposed explanatory aid. Geodetic latitude on an ellipsoid uses the surface normal; any spherical simplification must be explicitly labelled.
- Handoff and complete generation prompts: design/mockups/geographic-coordinates-2026-10-12/.

## 2026-10-12 — Base-60 format mockup alternatives

- Requested scope: three image alternatives for DmsFormats in CoordinatesPart2Scene. Reviewed the rendered Onboarding, Landforms, Topography, Contours, reference-body measurement and DatumGuided interactions at 1440 x 1122. No application code changes.
- Audience assumed to be beginners. The first two Coordinates 1 interactions were interpreted as reference-body measurement and DatumGuided. The three proposed directions are magnifying angular rulers, guided numerical decomposition and coordinate matching; implementation choice remains with the user.
- The images are 1421 x 1107 concept renders; browser implementation target remains 1440 x 1122. Keep the existing design tokens and compute ruler subdivisions, plot positions and conversions. Generated microcopy and tick geometry are not implementation source of truth.
- Preserve D/DM/DMS/S and both source axes via a controlled axis selector. Height is outside this angular conversion. Formatting changes preserve the source value and measurement accuracy.
- Source values, exact arithmetic, interaction states and generation prompts are saved in design/mockups/base60-concepts-2026-10-12/.

## 2026-10-12 — measurement mission, fifth pass: sides, reveal, profile, enlargement, two figures side by side

Brief: `design/mockups/topic-02-geodesy/claude-visual-clarity-followup-2026-10-12.md` (the "אליפסואיד, גיאואיד וגליות" block only). Its decisions override the earlier passes (stacked figures, arrows in the model, limited turning, the physically opened ground).

**Layout.** Tabs → the view's title and text across the card → two figures side by side (model at inline-start, section / enlargement at inline-end, about 1.08 : 1), each under a plain caption with its controls beside it → in the task, one strip under both. The figures' height is the window's height under the fixed header minus the active view's own chrome, clamped to 200–312 px (312: past it the profile only gains empty paper; 200: the section's shortest arrows stay readable). One caption line always sits under the model (empty where there is nothing to add), so the model keeps one size through the four views.

**The landscape.**
- Turning is free: az is never limited or folded (it is compared modulo 360; "מבט התחלתי" and the glides between views take the short way). Tilt 2°–84°.
- Opening angles per view: surface `{az 0, elev 5}` (the profile: square to the survey line), geoid `{−20, 21}` (the sheets read as surfaces), task `{0, 13}` (the receiver clear of the ground). Each view keeps the reader's angle when they come back. Each opening is a whole number of arrow-key steps from the profile; the fallback capture relies on that.
- The task view's zoom onto the survey line (and its side fade) is gone: without arrows in the model it is no longer needed, and one framing keeps the fallback simple.
- Sides: each side carries its top edge's strip of the same image down at the top's density (a 175 m strip folded back and forth, mirror-wrapped at the image border, drifting along the edge so no fold mirrors the one above), softened with depth and fully when seen edge-on (where any texture would average into horizontal bands), shaded per side (front 0.88, back 0.8, left 0.94, right 0.76) and a little darker toward the base. A visual treatment of the model's sides, not a claim about the subsurface.
- The table's contact shadow fades at low tilts (seen edge-on it read as a grey band).
- The see-through reveal: ground opacity 0.28 (the brief suggested 0.2–0.3; at 0.24 it read milky over the white card), nearest-surface only (depth pre-pass), the geoid sheet (fill 0.2, grid 0.7 every 375 m) and ellipsoid sheet (0.14 / 0.62, every 750 m), the two reference lines in the survey line's plane, and the block's outline. The view always opens on solid ground; leaving it puts the ground back.
- The station ring and the tripod's old place: the ring is gone (the orange pin marks the picked station in both figures); the tripod stands 0.44 units right of its station, scaled 1.4×, clear of the pin.

**The section.** It now runs over one fixed stretch of the survey line, `SURVEY_SPAN` = 900–4400 m (from the ridge's flank short of C into the sea), end to end in the plot, and no longer registers with the pins: side by side there is no shared x-axis to keep. The vertical cap went from 5× to 8× the horizontal scale, so A's arrows read as arrows (H 30 m, h 18 m, N −12 m); the caption already says the heights are exaggerated. Arrowheads are a fixed 7.5 px. One marker per station (a lettered pin on its ground point); line names as plain coloured text; the stretch's two ends as orange dots, the same as on the model and the ellipsoid.

**The ellipsoid.** The marked area is that same stretch at full depth, laid on the body in its own proportions (3500 × 2300 m) with the survey line where it crosses the landscape (`ellipsoidView.ts`). Opening view `{elev 16, az −28}` so the area is in sight. "הגדלת האזור": a frame flies from the area to the enlargement (620 ms), the enlargement grows in, and at 950 ms the section is linked (stations shown, the line firm, dashed orange drops from the line's ends to the section's ends). "חזרה למבט הכללי" cancels at any point. The enlargement is the area's own top-down image on a thin layer lifted over a curved, gridded piece of the ellipsoid, the two named apart. Reduced motion: straight to the linked state. The station dots on the body were dropped (too small to carry a role); the line's two end dots stay as its anchors.

**The task.** No arrows, numbers or legend on the model. The legend's three definitions now stand beside their own values (h, N) and beside the question (H); the legend's line "השוו בין חצי הגובה בחתך לבין נתוני התחנה שנבחרה." shows in the feedback slot until the first check. The station picker (with its "תחנת מדידה X" label) moved to the model's caption.

**Without WebGL.** Stills of the live model itself in the profile (`scripts/qa/capture-measurement-fallback.mjs`, headless Chrome / SwiftShader at 2×, frame 500 × 286): the ground, the see-through reveal, the receiver at A / B / C. Pins, place names and the line's ends are projected over them with `landCamera(LAND_START)`; the height grid still loads, so what the ground hides is known. No "מבט התחלתי" there. The 55° Cycles layers, their tripods and `measurementLandscapeLayers.data.ts` were deleted (they are in git history at `a5053ef`); `package_measurement_landscape.cjs` now only packages the ground image. `measurementLandscape.data.ts` still carries the old renders' camera matrix and visibility samples, unused by the page.

**Copy.** Added only the brief's labels and sentence ("חשיפת משטחי הייחוס", "החזרת פני השטח", "הקרקע שקופה כדי להציג את משטחי הייחוס שמתחתיה.", "הגדלת האזור", "חזרה למבט הכללי", "מודל תלת־ממדי", "חתך השטח"). Removed "גררו כדי לסובב" (the brief) and "פתיחת חתך" (replaced). The screen-reader descriptions keep "גררו או השתמשו בחצים כדי לסובב.".

**Environment.** The shared dev servers on :3000 / :3001 both served 500s (two servers on one `.next`), and another session's datum edits broke the shared page meanwhile. Verification ran in an isolated worktree (`.claude/worktrees/clarity`, HEAD + this block's files, `node_modules` / `public` as junctions, `NEXT_DIST_DIR=.next-clarity`, :3021).

## 2026-10-12 — Topic 02 "מערכות ייחוס": two screens, a method switch per map, reading lines (round 3)

Brief: `design/mockups/topic-02-reference-systems-2026-10-11/claude-linked-comparison-toggle-and-split.md`.

- **Split.** Screen 1 (`ReferenceSystemBlock`) = H3, the brief's lead, the activity card. Screen 2 (`ReadingCoordinatesBlock`, `data-screen="reading-coordinates"`) = H3 "כיצד מפרשים קואורדינטות?", the brief's sentence, the comparison table + conclusion in one card, the definitions in a second card (existing surfaces). Boundary = the same H3 + `my-10` rhythm every block in the scene uses; no extra divider or spacer. Screen 2 has no controls.
- **Switch per map.** Text buttons in the scene's existing CHOICE / choiceTone language with `aria-pressed` (as the DMS format choice), a muted "שיטה:" label (aria-hidden), group names "שיטת הקואורדינטות במפה הימנית / השמאלית"; side identity is the side, not the method. Opening: right geographic, left UTM, A.
- **Removed:** MousePointerClick, Layers, both Link2, the three concept glyphs (functions deleted — no other users), letter circles in the point buttons, the instruction line, the "אותה נקודה, שתי שפות" line, the old lead, the per-readout WGS84 / UTM 36N chips, the per-value unit lines, the feedback band and fixed sentence. WGS84 is stated once: "דאטום בשתי המפות: WGS84" (plain muted text, end of the point row).
- **Readout.** Header: "A · גשר" (feature name above the readings) + the unit once; two rows label ↔ value; UTM adds "פלח 36 · חצי הכדור הצפוני (N)" under its rows. DMS groups are joined by U+00A0 so they read apart and never wrap. Each row label carries a small orange key in the direction of its reading line (across = parallel / northing, up-down = meridian / easting) — a legend, not decoration; assumption: acceptable under "use the existing orange to tie values to lines".
- **Reading lines** (`readingLines()` in referenceSystemsGeometry.ts): UTM = constant-E / constant-N straight lines; geographic = the point's meridian and parallel sampled through toUtm (point is a vertex), so they lean −1.12° with the graticule. 2 px accent on a light casing; the grid dropped to `stroke-fg/30`. Fade 250 ms on a new point; reduced motion instant.
- **Frame labels.** The chosen values sit where the lines meet the top / right edges (orange border, semibold 14 px; the top one clamps clear of the north arrow). Each REPLACES every ordinary label it would touch, and at least the nearest one, so no edge carries more than three. Widths for that test are estimates at the 1440 target (`LABEL` in the component); the browser QA measures real boxes for overlap.
- **Projections line:** "…ומערכת UTM, המבוססת על היטל מרקטור רוחבי ומציינת מיקום במטרים." (brief §6).
- **Fit @1440×1122** (heading 16 px under the header): lead ends 200, switches 361, maps 751 (473 × 378, were 439 × 351), readouts 929, summary 994, card 1027.
- **Open (visual):** the geographic readout has ≈ 40 px of empty space under its rows, because the UTM readout carries the zone line and the two boxes share a row height; meridian labels are ≈ 93 px apart, so at A the chosen longitude replaces both neighbours and the geographic top edge shows one value only.

### 2026-10-12 — Datum activity: clarify A/B and remove dead space

- User requested direct copy/layout edits after the 2D implementation. A/B are explicitly described as two reference systems, not two physical points. The error feedback identifies the fixed circle (real bridge) and the diamond (location calculated from the copied numbers).
- The previous 40/60 split and fixed-height/fixed-footer goal are superseded: equal desktop columns, top alignment, content-sized feedback, and navigation directly after the explanation (16px gap). This uses existing spacing, surfaces and button variants; no palette or map geometry changes.
- Removed the visible reset button. Reversible label/conversion experiments, stage navigation and end-of-practice replay remain available.
- Verification captures: `design/screenshots/datum-field-clarity-2026-10-12/`. The existing full TypeScript check includes unrelated `qa-output/task8-scratch/data.orig.ts`, which has missing imports/implicit-any errors; verify app code separately without altering that scratch work.

### 2026-10-12 — Base-60: alternative 2 ("פירוק המספר, צעד אחר צעד") replaces DmsFormats

- Implemented: `src/components/lessons/topic-02/base60/` (`base60.ts` logic, `Base60Workbench.tsx` view), mounted in `CoordinatesPart2Scene` in place of `DmsFormats`. Brief: `design/mockups/base60-concepts-2026-10-12/claude-code-handoff.txt` (alternative 2) + `02-number-workbench.png`. Checks: `scripts/qa/base60-workbench.test.mjs` (unit), `scripts/qa/shot-base60-workbench.mjs` (browser, screenshots in `design/screenshots/base60-workbench/`).
- Arithmetic: values are integer counts of 1e-4 units (the deck's four decimals), so every writing is exact; no rounding, and no minute/second can carry to 60. Answers are accepted within half a unit of the answer's last digit; point or comma.
- Flow (assumed from the handoff): guided example on the longitude ("הצעד הבא", one step per click) → the learner completes the same longitude → "משימה נוספת: קו רוחב" (transfer) → closing question "איזה חלק היה לכם קשה לפרק?". Each axis keeps its own progress; the latitude opens as practice. A correct check moves to the next step (its card shows the explanation); a wrong one keeps the step and explains.
- In step 3 the split of the minutes (7′ kept | 0.404′) is shown when the step opens, as in the mockup; the learner converts only the minute's fraction.
- Deviations from the image, by the handoff's "use the existing patterns": the selected ×60/÷60 and writing buttons use the scene's selection tint (`border-accent bg-accent/10`), not a filled orange; the active step badge is filled `bg-accent` (datum activity's stage tabs); "× 60" on the track is black (content), only its arrow is orange. The mockup's inaccurate "בשבר דקה" caption is "דקות"; its converging bracket over the result row is replaced by each part's own dashed lane (35° and 7′ come down from where they were kept).
- Added beyond the image (requested): "איפוס" next to "חזור צעד"; a hint ladder (highlight → ×60 rule → worked calculation that leaves the sum to the learner); a mode line above the steps ("דוגמה מונחית…" / "תרגול…"). Writings open as the steps produce them (D at the start, DM after the minutes, DMS and S after the seconds); once decomposed, the note under the track explains the chosen writing (D shows the inverse 35 + 7/60 + 24.24/3600, S the total in seconds) and its nodes are marked.
- Removed with DmsFormats: the time/angle units table and the clock comparison in the lead (the handoff treats the clock as an analogy only); the lead is the mockup's line.
- Height is not shown (outside this conversion, per the handoff). The block's card grows slightly in the longest states (a feedback message in step 3, the latitude's closing question); the band moves down with it.

## 2026-10-12 — Topic 02 "מערכות ייחוס": one map, what the numbers mean (round 4)

Brief: `design/mockups/topic-02-reference-systems-2026-10-11/claude-reference-systems-single-map.md`.

- **Layout.** One map (538 × 430 at 1440) with the method switch above it and the three point buttons under it, on the right (DOM-first); a 26rem explanation panel beside it on the left. Lead as given in the brief. The datum line is gone from the activity (screen 2 still defines WGS84). Opening: geographic, A.
- **Geographic panel:** "A · גשר", the per-point sentence (derived from the stored E/N and the converted lat/lon, matching the brief's wording for A/B/C), then per reading: name, what it measures (brief's text), the value as four groups with captions מעלות / דקות / שניות / כיוון (16 px), and a fixed 0″–60″ bar headed by its shared "31° 48′" / "35° 07′" with the chosen point's letter on its seconds; once B or C is chosen, the bridge stays on the bar as a muted "A" reference (assumption: helps the comparison the brief asks for; no new colour). Then the minutes/seconds note and the "points are close" note.
- **UTM panel:** full values grouped by no-break spaces ("701 125", "3 521 095") + מטרים, the zone meaning, the brief's "why the numbers are large" text (it writes 500,000 with a comma — kept verbatim, though the values use spaces), and "השינוי ברשת ביחס לגשר" with the offset sentence computed from E/N (−695 / +385, −555 / −380).
- **Feature on the map:** a light dashed outline from the terrain's own geometry — a box round the bridge deck, the ridge crest around the summit, a ring round the village (r 150 m) — not a halo. Fades in with the lines (250 ms); reduced motion instant.
- **Less orange:** the small line keys are gone; the chosen frame labels lost their orange border (quiet dark edge). Orange = pin, anchor, reading lines, bar marker.
- **Fit @1440×1122:** geographic card ends 953, UTM 829 — the card is shorter in UTM, so screen 2 moves up ≈ 125 px on switching (open: equalise or accept).
- **Concurrency:** another session is adding `Base60Workbench` to the same `CoordinatesPart2Scene.tsx` (import + usage, untracked `topic-02/base60/`). The isolated build was run with their folder copied in read-only; both sessions' hunks are now in one file — commit with care.

## 2026-10-12 — Topic 02 "היטל UTM": אטלס הפלחים (חלופה 2)

Brief: `design/mockups/utm-concepts-2026-10-12/README.md` + mockup `02-zone-atlas.png`. Code: `src/components/lessons/topic-02/utm-atlas/` (new), wired by replacing only `UtmBlock` in `CoordinatesPart2Scene.tsx` (old task, slider and 200–800 km zone card removed). QA: `scripts/qa/utm-atlas.test.mjs` (logic + geometry vs PROJ), `scripts/qa/shot-utm-atlas.mjs` (browser, 1440 × 1122), screenshots `design/screenshots/utm-atlas-2026-10-12/`.

- **Shell.** The mockup's centred page title is the site shell; the block keeps the scene's own H3 + lead ("היטל UTM"), then two cards: the projection explainer, then the atlas. No extra header or sidebar.
- **One state.** One point `{lat, lon}` (WGS84). Zone, hemisphere, range, E/N, highlight, both pins and the explanation are derived from it (`readUtm`). E/N use the existing `reference-systems/utm.ts` (Karney/Krüger n⁶); tests match PROJ (proj4 2.22.0, computed in a scratch folder) to ≤ 1 mm for every offered point. Display: whole metres, no thousands separators — as in "מערכות ייחוס".
- **Free selection, whole world.** Exceptions handled: 56–64°N 3–12°E = zone 32; 72–84°N 0–42°E = 31/33/35/37 (32/34/36 absent). Coverage 80°S–84°N: a click outside is rejected (point stays, explanation names the limits; "מחוץ לתחום UTM" on the veil); a drag clamps to the limit. Hemisphere N for lat ≥ 0. MGRS band letters are not used anywhere.
- **Maps.** Both are lon/lat (equirectangular) windows, north up, `dir="ltr"`: the world locator stretched to a 3:2 frame (effective standard parallel ≈ 41°), the enlargement with its standard parallel at the window's centre latitude. Straight meridians keep zone boundaries vertical, as in the mockup. Captioned "מפת איתור, לא מפת UTM". Basemap: Natural Earth 1:50m (public domain) baked by `scripts/maps/build-utm-atlas-basemap.mjs` into a lazily imported module (~220 KB raw); without it everything but the land still works.
- **Enlargement window.** "פלחים": the zone ±1 neighbour (+1.5° margins); "מודדים במטרים": the same area zoomed to the zone ±1° with the zone's real grid (lines of constant E/N traced through `fromUtm`, every 100 km; 50/20 km where the zone is narrower than 380/190 km). A window crossing the equator draws both grids (N restarts at 10 000 000 m). The window stays put while the point is well inside it; it recentres (≈ 320 ms tween, none under reduced motion) after a zone change or near its edge, and only on release when dragging inside it.
- **Neighbour buttons** carry the point to the same latitude and the same offset from the new zone's central meridian, so E/N repeat — explained as "same numbers, another place". Where an exception makes that spot belong elsewhere: the middle of the target zone's range (32/34/36 above 72°N → 71.5°N). The row shows five zones, pages by five, and does not shift under the cursor.
- **Hemisphere switch** mirrors the latitude (same longitude), clamped to coverage; from the equator, S goes to 1°S.
- **"נסו נקודה אחרת"** walks seven checked places (ירושלים, איסטנבול, קייפטאון, מדריד, ריו דה ז׳ניירו, סינגפור, ברגן) and back to the opening; each ≥ 0.25° from a zone boundary and ≥ 1° from the equator. London was dropped (0.13° from Greenwich).
- **Opening point** is the brief's 33°E 32°N (Mediterranean, on zone 36's central meridian → E 500000, N 3540436), not the mockup's position over land.
- **Fourth cell** of the first data row (empty in the mockup) shows the point's lat/lon, to carry "a different notation is not a different place"; the grid view says so in its explanation.
- **Feedback tone.** Exploration explanations use the lesson's info inset (no glyph); ✓ / ✕ only on practice verdicts (DatumFieldChallenge convention) — the mockup's ✓ on exploration was not copied.
- **Selected zone** uses the lesson's choice style (accent border + tint) plus a dark underline, not the mockup's solid orange fill (orange is for action).
- **Explainer.** Tangent transverse cylinder (UTM's secant cylinder, k0 = 0.9996, is a deliberate simplification for beginners); the copy says the cylinder is only an illustration and the projection is a calculation. Step 3 is a real TM of zone 36's cylinder over ±40° — wider than a zone on purpose — with 400 km ground circles at 24°N labelled by measured relative map size (×1.04, ×1.18) and dashed reference circles.
- **Practice.** "מצאו את גריניץ׳" (answer 31; 30 → "ends at 0°", others → their range), then three transfer points (טוקיו 54N, בואנוס איירס 21S, ניירובי 37S) with coordinates given; zone numbers are hidden in the enlargement until solved; picks by the zone row or a map click. Practice keeps its own state; "חזרה לחקירה" returns to the exploration as it was. Leaving the sub-topic unmounts the block (opening state on return).
- **Accessibility kept as the lesson has it (flag for a project-wide decision):** orange focus rings and white-on-orange pins/step badges (≈ 3:1). New in this block: black top-label text over an orange bar, a shape mark on the selected zone, debounced announcements, a short `role="status"` verdict, focus moved to the next action when a check is solved.
- **Not run:** ESLint — the repo has no ESLint config (`next lint` opens its setup prompt).

## 2026-10-12 — measurement mission, sixth pass: a model that always resolves, one height mapping, the ellipsoid's turn, the geoid's surface, the task in two columns

Brief: the user's pasted message of 2026-10-12 (the "אליפסואיד, גיאואיד וגליות" block only; the datum untouched).

**Why the model "sometimes did not load" (reproduced, then fixed).** `MeasurementLandscape3D` registered a `webglcontextlost` listener in `onCreated` that called `onFail()`, which set the scene-level source to `renders` for good. r3f tears a canvas down by calling `gl.forceContextLoss()` 500 ms after unmounting it — so any remount of the canvas while the scene stayed mounted reported the old canvas's deliberate loss as a failure, and the model never came back until a full reload. Reproduced on the user's :3001 (the canvas remounted, the old context was lost with its canvas already detached, `live → renders` 49 ms later) and deterministically on an isolated server by appending a comment line to `MeasurementLandscape3D.tsx` (Fast Refresh remounts it). In this repo other sessions edit these files all day, and the reviewed page is a dev server watching the main checkout — hence "sometimes". Further holes, each reproduced with forced failures: an albedo error or stall and a heights stall left the stage in `loading` forever; the heights failure was silent; a failed model chunk (`ChunkLoadError`) had no boundary (dev reloaded the page; a build would hit the app's error screen); a real context loss was permanent, with no message and no retry; the WebGL probe leaked one context per visit (two under StrictMode). Not causes: tab switching during the load (it recovered), leaving and re-entering the sub-topic or the lesson (live every time on a healthy server).

**Fix.** One status (`pending · loading · live · lost · failed · no-webgl`, on the stage as `data-landscape-status` / `-failure`); every path ends in one of them. The context listeners live in a component inside the canvas and leave with it (a teardown is never a failure; a real loss shows the stills until the context returns). The image load has an error path; a late image is disposed. The heights fetch aborts on unmount and after 15 s. The model code is imported per attempt, and a failed chunk is reported, not thrown. A 20 s watchdog runs only while the landscape is on screen. "Ready" means a frame was drawn with the ground image on the ground. Coming back from the ellipsoid view draws a frame at once. The probe gives its context back and runs once per page. Under the stills: "המודל התלת־ממדי נטען…" (after 1.2 s), "התצוגה התלת־ממדית נקטעה…", "לא ניתן לטעון…", "הדפדפן אינו מציג תלת־ממד…", each ending with "מוצגת תמונה (קבועה) של הדגם."; "ניסיון נוסף" (the model again, on a fresh canvas) where a retry can help — not without WebGL. Nothing offers turning over a still.

**Dev servers (documented, not changed).** :3000 (`next dev -p 3000`, since 2026-10-11) and :3001 (`npm run dev`, since 2026-10-12 09:52) run from the main checkout on one `.next/`; :3000 has answered 500 `__webpack_modules__[moduleId] is not a function` since :3001 rebuilt `.next/` (also logged in the "terminology + true north" entry above). Neither was stopped. The lazily loaded model chunk is the part of this block most exposed to that kind of corruption; it now falls back to the stills with a retry instead of breaking the page. Verification ran on my own servers: the main checkout with `NEXT_DIST_DIR=.next-geoid` on :3051 (the integrated page), a worktree on :3052, the static export on :3053. Fix when convenient: one dev server per `.next/`, or `NEXT_DIST_DIR` for the second.

**One height mapping (`DISPLAY_VE` = 6, `measurementLayout.ts`).** The model drew heights 2.5× and the section up to 8×, so the relief stood about half as high in the model. Now both draw H, h and N at 6× their own horizontal scale, and the model's camera is registered with the section: the survey line's stretch (SURVEY_SPAN) is never longer on screen than the section's plot (`landCamera(view, size, spanPx)`); a box too small just fits the model. Measured at 1440 × 1122 (drawn extent of each figure): opening view model 192 / section 158 px (before 112 / 202); task view 195 / 157; C over A along the line within 8 % (unit test). Why 6: 4.5 matched exactly but shrank A's arrows to ≈ 13 / 8 / 5 px; 8 made the model's walls spiky and streaked (the top-down image stretches on steep slopes) and still gave A only ≈ 23 / 14 / 9 px against ≈ 17 / 10 / 7 px at 6. **Open:** A's arrows are short at any mapping the model can carry; a local magnifier at A could be a follow-up. The section draws flatter than 6× only if its frame is too short (not at the sizes checked). The geoid view's oblique opening (−20°, 25°) shows the top's depth and stands taller (237 / 152 px) — on purpose, so the sheets read as surfaces; not forced to match.

**Opening angles.** Surface 9° (was 5°): at 6× the dashed survey line hid behind the ridges at 5°. The other views keep a whole number of arrow steps from it: geoid {−20, 25}, task {0, 17}. The no-WebGL stills were taken again at 9° with the new mapping (`span` added to `measurementFallback.data.ts`). `shot-measurement-mission.mjs` and the unit tests were updated to the new contract.

**The ellipsoid.** Drag, arrows and "מהצד" / "מלמעלה" were already one state (`data-ell`); checked again: a level drag after "מהצד" stays side-on and turns in steady steps. Added: the gaps between the sphere of radius a and the body shaded at the poles; the polar radius drawn against a (side-ish views); the names "קו המשווה" and "ציר הקטבים" (it becomes "הקוטב" from above). The pressed view button: the station buttons' selected ring and a check. A click on the marked area enlarges it (the same handler as "הגדלת האזור", which stays as the keyboard way; a wider invisible edge makes it easy to hit; nothing to click while it is on the far side or already enlarged). The enlargement's terrain layer now has the area's orange frame. "חזרה למבט הכללי" keeps the reader's angle (checked). The flattening note stays.

**The geoid.** Text: the user's definition; the equipotential definition kept as "בניסוח מדויק יותר" (checked against NOAA NGS: "the equipotential surface of the Earth's gravity field which best fits, in a least squares sense, global mean sea level"); no "equal gravity" wording. The reveal: ground 0.22 (was 0.28); the geoid sheet firmer (fill 0.32, grid 0.95), the ellipsoid quieter (0.07 / 0.34); the geoid sweeps in once from the sea's edge inland (1.1 s; at once under reduced motion), and its line in the survey plane follows; the sea stays as a translucent blue surface, so the geoid is first seen as the sea's surface. Label on the model: "גיאואיד — משטח הייחוס לגובה" (at its edge on the front face, under the land). Stations are pickable in this view too (pins, section, compact buttons); the picked one shows H from the geoid — a blue line from the geoid up to the station, with its letter, in the model (see-through only; an HTML overlay, so it is on the stills too) and an H arrow in the section. No numbers, no new exercise.

**The task.** Two grid cells under the two figures: the readings (h and N with their meanings) at inline-start; the question, H's meaning, the formula, the field, its two actions and the feedback right under the field at inline-end. Reading and focus order follow. The feedback slot holds the tallest feedback (C right: the sum and N = 0), so no check moves the field or the card; to keep that at 1440 × 800, "3/3 – כל הגבהים חושבו." moved into the feedback's title row, where "לתחנה הבאה" stands until all three are done. Data, formula and answer checks unchanged.

**Verified** (1440 × 1122 unless noted): `scripts/qa/measurement-mission.test.mjs` 28/28; `scripts/qa/shot-measurement-mission.mjs` PASS and the new `scripts/qa/measurement-round6.mjs` PASS on the integrated page (:3051), the latter also on the static export; `shot-measurement-heights.mjs`: the card fits at 1122, 900, 800 and 1920 × 855 in every state; `next build` in the worktree. Before / after shots: `design/screenshots/measurement-mission-round6-2026-10-12/`.
**Not verified:** a real GPU (headless Chrome renders with SwiftShader); a browser's own "too many contexts" eviction (simulated with `WEBGL_lose_context`); the Fast Refresh remount check on the integrated page (it edits a shared file — run on my worktree server only); ESLint (no config in the repo; `tsc --noUnusedLocals` is clean for these files apart from an existing unused `useRef` in `MeasurementPanel.tsx`).

## 2026-10-12 — Topic 02 "מערכת קואורדינטות גיאוגרפית": גלובוס חוקר (alternative 1)

Reference: `design/mockups/geographic-coordinates-2026-10-12/01-globe-explorer.png` (brief: alternative 1 in `claude-handoff.txt`). Code: `src/components/lessons/topic-02/geo-globe/` (replaces `LatLonExplorer`, `Graticule`, `AxisCaption` and the now-unused `MapChip` in `CoordinatesPart2Scene.tsx`). Assets: `public/assets/lessons/topic02/geo-globe/ASSET-MANIFEST.md`. Tests: `scripts/qa/geo-globe.test.mjs`; screenshots / functional run: `scripts/qa/shot-geo-globe.mjs` → `design/screenshots/geo-globe/`.

- **The Earth.** WGS84 at true flattening (≈ 1 px on the screen globe — not exaggerated), placed by geodetic latitude. NASA Blue Marble NG (July 2004, 21600 px master → 4096 px) for colour; GEBCO relief as light only (no displacement). The existing datum textures were not reused: their albedo is the lesson palette (ivory sea), not a natural Earth. Only the water is re-toned toward the mockup's restrained steel blue (manifest).
- **One mapping.** Mesh uv = the plate carrée texture parameter; the 30° graticule, the equator / Greenwich and the selected parallel / meridian are drawn in the globe's shader from that same lat / lon (screen-pixel widths, hidden by the body on its far side). Marker and labels are HTML overlays projected per frame and hidden by the exact occlusion test (convex-surface normal test; ray–ellipsoid for the pole's "N").
- **Value labels.** The mockup's single "30°S · 90°E" chip became two chips, latitude on the parallel and longitude on the meridian, beside the point (brief: separate, clear labels; never silently reorder the deck's longitude-first pair). The deck's own notation (`(90E,30S)`, `(75E,15N)`) is kept in `LATLON_ITEMS` and not displayed. At 0° a value chip is hidden: the equator / Greenwich chip already names that line.
- **Opening view** `{lat −3°, lon 72°}` *(superseded: the camera opens on 0°, 0° — see 2026-10-27, "globe and scale-lab tests")*: the Indian Ocean centred (India top-centre, the example below centre, Australia right). The mockup's own geometry cannot hold Greenwich where it is drawn while 90°E is central, so Greenwich and its label sit nearer the left limb rather than being moved. Zoom is limited (distance 4.0–6.4, opening 5.25); no auto-rotation.
- **Practice start** 0°, 0° with the directions carried over from the example (S, E): reaching 15°N asks for a deliberate N. At 0° the direction choice shows outlined (the direction the number will grow toward), not filled — 0° claims no direction. 180° of longitude shows "180°" with no letter; ±180 normalise to one meridian; a pole matches any longitude.
- **Layout.** Mockup proportions at the real 1052 px card: panel : globe column 1 : 2 (`gap-5`, panel `pe-5` + hairline), card `p-6`, stage 660 px, globe ≈ 576 px across. The mode switch is first in the DOM and set in the globe column's upper corner as in the mockup. The panel title follows lesson Table 2's heading row (`text-base md:text-lg`, black), smaller than the mockup's ≈ 24 px — per the brief ("לפי כישור העיצוב"). Card height is the same in both modes (826 px; asserted by the QA script). The 30° grid follows the brief (the mockup draws a denser one).
- **Colours.** Tokens only: orange (`accent`) for the selected lines, the marker and the CTA; the equator / Greenwich in `brand` with a light core (the mockup's pale green); toggles / slider in `brand-dark`. The success strip takes a `brand` tint and green check; wrong answers use ink and an alert icon (no red); the explore strip is neutral, as in the mockup. The globe's limb rim and the sea's sheen are part of the natural rendering, not UI colours.
- **Copy.** Lead: the existing definitions kept, with "זוויתיים, במעלות" added (angular values) and the mockup's instruction ("שנו את הרוחב ואת האורך ובדקו היכן הקווים נפגשים."). The swap message is "הערכים הוחלפו ביניהם. בדקו איזה מספר מתאר את הרוחב ואיזה את האורך: …". "איפוס תצוגה" became "מבט התחלתי" (brief); "הצגת הנקודה" was added; a quiet note appears when the point is on the far side.
- **Fallback.** Without WebGL, or if the images fail, the same grid flat (plate carrée, Blue Marble underneath when it loads) with a one-line message; every control, the check and the feedback keep working.
- **RTL detail.** `tailwindcss-rtl` emits ancestor `[dir="rtl"] .x` / `[dir="ltr"] .x` rules, so inside a nested `dir="ltr"` box both sides apply (`start-0` became `left: 0; right: 0`). Inside the LTR overlay, number and slider rows positions are inline physical styles and the toggle divider is `border-r`.
- **Open.** The mockup's land reads a touch more saturated than Blue Marble July; left as the source's own colour. No loading still: a quiet disc of the globe's size shows until the first frame.

## 2026-10-12 — Ellipsoid / datum: three concept mockups for selection

- Scope: review of the requested Topic 02 scenes and three image concepts; no site code edits. Files: `design/mockups/ellipsoid-datum-options-2026-10-12/`.
- The live site was reviewed at 1440 × 1122. Built-in ImageGen returned each concept at 1421 × 1107, approximately the same aspect ratio; implementation must be checked at the project's actual 1440 × 1122 target.
- Each image depicts one state of a proposed interaction. The complete states, actions and feedback are described in the folder's README.md. The user has not yet selected a concept.
- The existing cream canvas, white card, tan borders, olive/sage illustration and orange action palette are the visual reference. Globe material colours are conceptual illustration details, not new approved UI tokens.
- Geometry is amplified for teaching. Centre labels must be projected from actual model centres; in concept 2 the generated B-centre arrow visually lands too far toward the shell and must not be copied literally. No mockup supplies real geodetic transformation parameters.
- The existing seven-parameter passage is interpreted as a reference-frame transformation method rather than a general definition of datum. The handoff separates this from ellipsoid shape and datum anchoring, with an Esri primary-source link.

## 2026-10-12 — Topic 02 "מערכת קואורדינטות גיאוגרפית": one flow, random practice checked on the globe

User request (same day): remove "הצגת הנקודה", "מבט התחלתי", "גררו לסיבוב" and the bottom feedback strip; give the practice feedback another way; the target must stop spelling out the answer; practice must not be fixed in advance and must check the point found on the map; no "חוקרים / מתרגלים" tabs. Code: `geo-globe/geoCoords.ts` (makeTask / judge / reducer), `GlobeExplorer.tsx`, `Globe3D.tsx`, `GlobeFlatMap.tsx`, `CoordinateControl.tsx` (`compact`). Tests: `scripts/qa/geo-globe.test.mjs`; run: `scripts/qa/shot-geo-globe.mjs`.

- **Flow.** The explorer opens as before; "לתרגול" turns the same panel into practice and "לחקירה" returns (an unfinished task resumes). No mode switch.
- **Two task kinds, random.** *find* — the coordinates are given and the learner marks the point on the globe (a click that is not a drag; keyboard: turn with the arrows, Space/Enter marks the middle of the view, shown by a crosshair while the globe has focus). *read* — a point is marked (ink ring) and the learner sets its coordinates with compact controls. Kind is random (≈60 % find), never "read" twice running. "Less obvious target" was read as: the answer is a place to find, not numbers to copy into the controls; and the target's parallel / meridian are never drawn before the task ends.
- **Adaptive levels (assumption).** 1: on the 30° grid lines (|lat| ≤ 60) · 2: every 15°, off the 30° lines · 3: every 5° (|lat| ≤ 70), off the 15° lines. Up after two first-try hits in a row; down when the answer had to be shown. Points never repeat the previous one and change quadrant when possible.
- **Check by place (assumption).** Per-axis tolerance in degrees: 6° / 5° / 4° by level; longitude compared the short way round; a pole matches any longitude. Three tries, then the answer is shown.
- **Feedback.** A short note beside the learner's point on the globe ("צפונה מדי", "דרומה ומזרחה מדי", "בחצי הכדור הלא נכון", "הרוחב והאורך התחלפו") plus one line in the panel under the question (aria-live), naming where the point lies relative to the target's own lines. Moving the mark hides the note and marks the line "בדיקה קודמת". Success: the target's lines in orange with the meeting-point emphasis.
- **Camera without buttons.** The explorer's point is kept in view as it moves (the camera turns only when the point nears the limb); a read task turns to its point, and after a miss to show the learner's point with it; a finished task turns to its answer. A find task never moves the camera before it ends.
- Card height is 710 px in every state (the bottom strip is gone).

## 2026-10-12 — Topic 02 projections: three selection mockups

- Scope: three new design/interaction alternatives for ProjectionsBlock only, explicitly requested by the user; no lesson code changes. Deliverables: design/mockups/projections-concepts-2026-10-12/.
- Reference review: live 1440×1122 browser views of onboarding, landforms, topography, contours, ReferenceBodies and DatumGuided. The projections route hit a runtime error in GlobeExplorer (activeCoord is not a function), so ProjectionsBlock was reviewed from its current source and the local part-B deck slides 3–5.
- The images crop the learning section and omit site navigation to make the alternatives easier to compare. Existing navigation remains part of any later implementation. Generated image dimensions are a design illustration, not an exact viewport screenshot.
- Cylinder/cone/plane examples use normal/polar aspects to teach surface ↔ map form. Illustrations are schematic and must not imply universal physical light-ray construction, universal whole-world coverage, or exact cartographic positions from generated pixels. The plane stays flat; its reveal is a change of view rather than unrolling.
- ImageGen colours and Hebrew typography are approximate visual references. Future implementation must use the existing exact semantic tokens and lesson typography; no new colour tokens are approved or introduced. The selected solid orange tab in mockup 1 should follow existing tab styling during implementation.
- Proposed learner actions: unfold/inspect (1), trace one shared point across maps (2), predict and match a surface (3). These are alternatives awaiting the user's selection, not approved implementation work.

## 2026-10-12 — Combat navigation mockup alternatives

- Request interpreted as three concepts for topic-06/#scene-combatnav, with the named topic-02 scenes as visual/interaction references. This interpretation was asked asynchronously and stated in commentary; not treated as confirmed.
- Concepts cover the two techniques currently in CombatNavScene.tsx, not the older third technique in content/topic-06.md or archived screenshots.
- Generated concept images illustrate proposed compositions and interaction states, not implemented UI or exact cartographic data. Existing site header/sidebar remain authoritative when developing; do not copy invented chrome, progress, or numeric/geometry inconsistencies from generated pixels.
- The local page temporarily showed a build error during inspection. Review combines live page observations, source files and saved screenshots; it does not certify all current interactions as working.
- Files: design/mockups/combatnav-concepts-2026-10-12/ (three mockups, original generation prompts, and a review/implementation handoff brief).

## 2026-10-12 — Ellipsoid / datum follow-up: six clearer concept screens

- User requested three alternatives for EACH of two distinct interactions: ellipsoid versus datum, and differences between datums. Six final PNGs, a teaching/interaction brief and complete built-in ImageGen prompts are in `design/mockups/ellipsoid-datum-six-2026-10-12/`. No site code was edited for these mockups.
- Each image depicts one activity state. The two activities may be selected from different concept families. All six PNGs are 1421 × 1107; live implementation target remains 1440 × 1122.
- The first family uses an explicitly fictional planar-grid example to show a fixed place receiving different numerical descriptions. It is a teaching analogy, not a complete datum definition or real coordinate transformation. Grid positions and values must be derived from one consistent model when implemented.
- The laboratory separates shape changes from anchoring changes, then compares same-ellipsoid/different-anchoring and different-ellipsoid examples. Centres and axes must be geometry-derived. The second comparison mockup received two targeted image corrections to reduce misleading centre labels.
- Local/global contrast is schematic and does not imply fitting a datum to individual mountains, or that a global datum is always more accurate. Copy corrections and interaction states are authoritative in the accompanying README, rather than generated image text.
- Existing site chrome, design tokens and live text remain authoritative. No new UI colour tokens are approved by these previews.
- **Update (same day): no free marking.** The user found clicking the exact spot on a turning globe nearly impossible and chose a pick among points instead. A *find* task now marks four lettered points (א–ד) on the globe: the answer plus up to two typical mistakes (north / south flipped, east / west flipped, both, latitude and longitude swapped) and points one grid step off (≥ 15°, so marks never crowd). The learner picks by clicking a letter on the globe or in the panel's letter row (radio group; arrows move and turn the globe to the letter). Two tries, since a third out of four would be elimination; a wrong letter is struck out with its note beside it on the globe. The task opens with the camera on the four points' mean direction, never on the answer. *Read* tasks unchanged. A new point never repeats any of the last 8.

## 2026-10-12 — Topic 06: new sub-topic „דגשים לתכנון ולניווט” (#scene-tips)

- Sequence is now hook → onboarding → **tips** → combatnav → principles → planning → recap (`Topic06Lesson.tsx` SCENES and `src/lib/lesson-scenes.ts`). Existing ids and hash links are unchanged; the new id is `tips` (`#scene-tips`, DOM root `scene-tips`). Scene: `PlanningTipsScene.tsx` — two screens (before leaving / while navigating) on one learning map, an application question, a closing transition.
- **Learning map:** `NavTipsMap.tsx` is a dedicated fictional map drawn in the route-story map's visual language (PlanningRouteMap's terrain primitives and palette, now exported for reuse — the planning map is pixel-identical apart from its looping pulse ring). It is not the route-story geometry: there, the straight line also crosses the ridge near the saddle, so it cannot show that the short line is not the suitable one. The landmark sequence (נ.ה → עיקול הנחל → אוכף → חציית דרך עפר → נ.ס, pines on rocky ground) matches the route story for continuity; leg distances (500/550/600/500 מ׳) differ from PlanningScene's (500/700/500/600). The board header on both screens says so: „דוגמה לימודית נפרדת מסיפור הדרך שבהמשך השיעור”. Leg bearings stay internal; no azimuth numbers are shown in this part (azimuth is taught later).
- Map highlights are discrete states (≈0.25 s fade; the position puck glides once, 0.45 s); nothing loops. Every highlight is described in the caption under the map, which is also the map's accessible name.
- Mismatch vignette (screen 2, tip 4): the navigator drifts north of leg 3, and after the leg's distance the dirt road has not appeared. Chosen so it does not pre-answer the closing junction question.
- **Terminology (revised same day):** „קיטוע” is not used until its professional definition is verified. A part of the route is „קטע דרך” and a point is „נקודה לבדיקת המיקום”. CombatNav's definition block now defines „קטע דרך” (ending in a „נקודה לבדיקת המיקום”), its legend reads „נקודה לבדיקת המיקום”, and its „מתי משתמשים” line speaks of objects that can serve as points for checking the position. Also replaced: PlanningScene „סיפור דרך · 5 נקודות · 4 קטעי דרך”, the topic-06 quiz rationale („כשרשרת סימני שטח”) and the lesson-6 objective in `src/lib/lessons.ts` („עם קטעי דרך”). The short map labels stay „קטע 1–4” and „הכיוון לקטע הבא” (a longer pill would cover checkpoint 2); the caption under the map says „לקטע הדרך הבא”. Only a code comment in `CombatNavVisuals.tsx` still says קיטוע (not shown to learners).
- Recap glossary reordered to the new sequence (techniques first); wording unchanged. Onboarding's closing sentence now leads to the new sub-topic.
- Tip titles use the lesson-content heading size `text-base md:text-lg` (checking-design-fidelity, Table 2).
- Copy restates OnboardingScene / PlanningScene / `content/topic-06.md`; checked by military-geo-editor and hebrew-copy-editor passes. Tip titles, the question stem and the closing transition are the client's wording.

## 2026-10-12 — Navigation lab selected; separate dead reckoning below

- User selected concept 1 for terrain navigation, requested a detailed Claude implementation prompt and three new dead-reckoning concepts. Terrain first and dead reckoning below in normal page flow override the original mockup's mutually exclusive method selectors.
- Live, high-quality, slightly stylized realistic 3D terrain with a large adjacent map is mandatory; the inset map and sparse text in the selected mockup are not implementation constraints. Existing approved teaching copy must remain visible.
- Prompts specify one shared terrain/landmark data source, metric registration, contours derived from geometry, and a distinction between learning aids and hidden-answer practice. Existing location-check activity is an architectural reference only.
- New dead-reckoning images are conceptual compositions; their pixels do not certify exact map/model geometry or approved transcription. Runtime terrain, map, bearings and copy must come from the reviewed sources/data.
- Dead-reckoning option 3 adds an explicitly separate bearing-deviation experiment; the approved original no-deviation demonstration is preserved. At equal 1200 m distances, a 62°/64° pair has 41.8858 m endpoint separation; the 64° endpoint is east and south of the 62° endpoint.
- Detailed prompts and assets are in design/mockups/combatnav-concepts-2026-10-12/ and design/mockups/dead-reckoning-concepts-2026-10-12/. No application source was changed for this request.
- **Update (same day):** "איפוס" now sets 0°, 0° (the equator meets Greenwich) instead of restoring the example; the direction toggles keep their last choice, shown outlined since 0° claims no direction. The page still opens on the deck's example (30°S 90°E). *(Superseded the same day: it opens on 0°, 0° — see 2026-10-27, "globe and scale-lab tests".)* "לתרגול" has no arrow; its label is centred.

## 2026-10-12 — Coordinates 1 opening: two illustrated definition cards (option 1)

- `IntroColumns` in `CoordinatesScene.tsx` was replaced by `topic-02/CoordinatesDefinitions.tsx`. Copy, alt text, labels and captions are verbatim from `design/docs/2026-10-12-coordinates-definitions-claude-prompt.txt`; nothing to click.
- Text is start-aligned (RTL right), not centred as in `design/mockups/coordinates-definitions-simple-2026-10-12/01-illustrated-definitions.png`. The prompt and AGENTS.md require start alignment; the mockup is a composition reference only.
- At ≥md each card is a CSS subgrid with the same five rows: heading, text, image, labels, caption. Headings, the 3:2 image frames and the caption hairlines line up across both cards. The geodesy card has no labels, so a band the height of the bodies card's label row stays empty under its photo. This is accepted in exchange for aligned captions, as in the mockup.
- The two body labels ("כדור הארץ" / "אליפסואיד — …") use the lesson sub-heading tier (`text-base font-display font-bold text-black`, Table 2). Each is centred under its object in its half of the artwork: Earth in the right half, the model in the left half. The image is not mirrored.
- The bodies image background is 254,254,254 against the white card (255), so no frame is drawn around it. The geodesy photo has `rounded-xl` corners and no border.


## 2026-10-12 — Topic 02 "היטלים: מכדור למפה": unfolding lab (alternative 1)

Brief: `design/mockups/projections-concepts-2026-10-12/claude-implementation-option-1.txt`; reference `01-unfolding-lab.png`. Code: `src/components/lessons/topic-02/projections/` (`projectionsModel.ts` — projections, sheets, camera, practice, copy; `earthRaster.ts`; `ProjectionMap.tsx`; `ProjectionStage3D.tsx`; `ProjectionStageFlat.tsx`; `SurfaceIcon.tsx`; `ProjectionsLab.tsx`), wired into `CoordinatesPart2Scene.tsx` in place of ProjectionsBlock / ProjectionArt. Tests: `scripts/qa/projections-lab.test.mjs`; run: `scripts/qa/shot-projections-lab.mjs` (env QA_REDUCED / QA_NOGL / QA_NOIMG); screenshots `design/screenshots/projections-lab/`.

- **One concrete projection per family** (flat x east, y north, R = 1). Cylindrical: equidistant cylindrical (Plate Carrée), tangent along the equator, central meridian 0°, shown 80°S–80°N (the poles, lines in this projection, are left out). Conic: equidistant conic with one standard parallel, the cone tangent along 45°N, n = sin 45°, ρ = cot φ0 + (φ0 − φ), θ = nλ; shown 10°N–80°N over all 360° of longitude, so the map is an annular sector of 2πn ≈ 254.6°; the pole (an arc in this projection) is not shown, and the paper between the apex and 80°N is drawn blank (the sheet's own development). Azimuthal: polar azimuthal equidistant, the plane tangent at the north pole, ρ = π/2 − φ, Greenwich at the bottom and east to the right (seen from above the north pole); shown 10°N–90°N.
- **Spherical equations on a WGS84 globe.** The equations use a sphere of radius a, fed the globe's geodetic latitude; the globe is the explorer's WGS84 mesh. A teaching approximation — no geodetic accuracy is claimed for the equations. Every surface stands 0.4 % outside the sphere of radius a (the WGS84 body lies inside it): no cut into the globe, no z-fighting at the line of contact; the sheet is a 1.004× copy of the map.
- **Unrolling.** Cylinder: the Greenwich line stays, curvature falls linearly to 0, the seam at 180° opens behind the globe, and the sheet ends as the plane tangent along Greenwich. Cone: the Greenwich generator and the apex stay, the half-angle opens linearly from 45° to 90°, ending in the plane tangent at 45°N on Greenwich. Plane: not unrolled; the view rises to straight above the pole and turns Greenwich to the bottom (label "מעבר למבט על"). Tested: contact at 0 %, no sheet point inside the unit sphere at any of 41 stages, distances on the sheet kept, no jumps.
- **The flat sheet ends in front of the globe** (assumption). A sheet flattened behind the globe would show its inner face — a mirrored map. In front, translucent, its outer face is the map the right way round and the globe stays visible behind it; the sheet grows a little more opaque as it flattens.
- **Camera.** Base view per method and progress (cylinder 13° above the equator facing 8°E; cone 13° → 32°; plane 22° → 90°), fitted every frame (perspective-exact, re-centred) so the globe and the whole sheet are never clipped. The globe is ≈ 265 px across at the opening and ≈ 120 px when the cylinder lies flat (2πR wide). Drag or arrow keys turn within ±70° / ±35°; "מבט התחלתי" resets the turn only, never the progress or answers.
- **Sample point and lines.** 31.8°N 35.2°E (Middle East, not named on screen) and its parallel in orange on globe, sheet and map; the line / point of contact in sage, dashed — never the sample parallel (≥ 13° apart in every method). A legend under the stage (DatumFieldChallenge's legend recipe, T6) names them. The sheet's own copy of the point appears from 72 % (before that it sat as a second dot beside the globe's).
- **Colour (illustration materials, no new UI tokens).** The sea is re-toned locally — globe shader and map raster — by the relief image's water weight and the shared colour image's own bathymetric brightness: globe albedo #2F6EA6 → #6FA9D2 (lit ≈ the reference's #2B679D, limb ≈ #224F75), maps #569AC9 → #8BC2E2 (reference map ≈ #67A9D2). Land is untouched, as the brief requires; the reference's land is lighter and more sage than NASA BMNG (July), so exposure was raised slightly instead of recolouring — deserts read close to the reference sand, forests stay darker than the reference. Shared assets and Globe3D are unchanged.
- **Proportions vs the reference.** Real content width is 1052 px (sidebar) against the reference's ~1340 px crop; lesson spacing (p-8, gap-6) is used. The stage is taller in proportion: a Plate Carrée cylinder to ±80° is 1.4× the globe's height, and the reference's cylinder (barely taller than its globe) together with its 1.8 : 1 map cannot both hold for one cylindrical projection. The map column keeps the reference's ≈ 54 %. The card is 926 px high in every state.
- **Selected tab** follows the lesson (border-accent + accent/10, aria-selected), not the reference's solid orange.
- **Slider.** Native range in an RTL box: 0 at the right ("עטיפה"), 1 at the left ("מפה שטוחה"); the done part fills from the right to the thumb (the reference's green runs from the left — read as an inconsistency of the generated image). Keys: ← / ↑ +5 %, → / ↓ −5 %, PageUp / PageDown ±25 %, Home 0, End 100 — tested in the browser.
- **Demonstration.** 5 s for the whole way, eased, from the current state; any hand on the slider stops it. Reduced motion: discrete key states (0 → 50 → 100 %, 0.75 s apart) with no tweening; camera moves are instant.
- **Practice.** First order cone → plane → cylinder; repeats cycle through orders that are never the tabs' order. The target map shows grid and outline only. Check only after a choice; the check shows the chosen surface on the globe and unrolls it with the same mechanism (3.4 s; reduced motion: at once); choosing again hides it until the next check. Each wrong pair has its own line: what the chosen surface makes, what the target grid shows — never the answer's name. One hint; "חזרה להדגמה" keeps the task and the attempt; three right answers (after corrections) open the summary manually; the summary replaces the stage with the three maps; "תרגול חוזר" resets the practice only.
- **Fallbacks.** No WebGL: the same model drawn flat (the Earth seen from the same view on a canvas, the sheet's lines through the same camera, hidden where the globe is in front), linked to the slider; the view does not turn. Images fail: Natural Earth 1:50m land (utm-atlas basemap) rasterised in plate carrée feeds both the 3-D globe and the maps, with a status line.
- **Not built:** dragging the seam as a shortcut for the slider (optional in the brief). The slider is the full control.
- **GlobeExplorer "activeCoord is not a function"** (earlier review): not reproduced — the identifier no longer exists in `src/`, and `scripts/qa/shot-geo-globe.mjs` ran its full flow on the same page without page errors.

## 2026-10-12 — Topic 06 "ניווט לפי השטח": navigation lab (alternative 1)

Brief: `design/mockups/combatnav-concepts-2026-10-12/claude-terrain-navigation-prompt.txt`; reference `01-navigation-lab.png`. Code: `src/components/lessons/topic-06/terrain-nav/` (`terrainNavScenario.ts` — the one data source; `terrainNavTerrain.ts` — generator, 5 m grid, contours, cover; `terrainNavMesh.ts`; `terrainNavGeometry.ts`; `terrainNavPractice.ts`; `terrainNavState.ts`; `terrainNavFeatures.ts`; `TerrainNav3D.tsx`, `TerrainNavModel.tsx`, `TerrainNavMap.tsx`, `TerrainAssociationActivity.tsx`), composed in `CombatNavScene.tsx`. Tests: `scripts/qa/terrain-nav.test.mjs`; browser QA: `scripts/qa/shot-terrain-nav.mjs` (`--capture-fallback` re-renders the no-WebGL pictures); screenshots `design/screenshots/terrain-nav/`. Approved copy inventory: `design/mockups/combatnav-concepts-2026-10-12/terrain-nav-copy-inventory.md`.

- **A fictional training area**, not a surveyed place: local grid, 1400 × 1750 m, E east, N north, one shared grid north for map and compass (no declination is modelled). Heights 297–425 m. Scenario values: contour interval 10 m, index 50 m, 6 m dirt roads, a 4 m stream.
- **One source.** The height generator is sampled every 5 m; the 3D mesh *is* that grid (SW–NE triangles), the contours are marching triangles on the same triangles (tested ±0.05 m on every vertex), and every tree, house, road, grove, field, the square and the water tower come from the same lists in both views. Isolated trees (group `lone`) and scrub/boulders/tufts are below the map's mapping threshold and have no map symbol, as on a printed sheet of this scale.
- **Domes with concave flanks.** The domes have a small rounded cap over concave flanks (not Gaussian bumps): from a summit at eye level (1.7 m) the slopes below are in view. Tested: every correct piece of evidence is ≥ 40 % visible from where the navigator stands (actual 60–100 %).
- **Water.** Each water course's bed is a fixed incision below the ground (stream 5 m, gullies 3 m) that never rises downstream; gullies take their bed from the ground as the stream cut it, so they drain into it.
- **No vertical exaggeration**; uniform 100 m per world unit. The opening view is from the south (north up, like the map); "מבט מלמעלה" aligns the model with the map.
- **Layout.** Model (inline start) ≈ 55 %, map ≈ 45 %, one height (488 px); the map sheet keeps its 0.81 aspect and is letterboxed inside its panel. The approved legend uses this map's own marks; the full symbol key is a popover ("מקרא המפה"), and "מפה במסך מלא" sits beside it so no control covers the sheet.
- **Mockup differences (by the brief):** no technique switcher at the top (both techniques stay in the scroll); the map is a full topographic sheet beside the model, not an inset; no thumbnails of domes as answers — the learner marks points on the map by letter (א׳–ד׳, display order fixed per leg so the answer's letter changes).
- **Practice.** Four legs (קטע דרך 1–4: כיפה 1–3, then the square). The navigator stands at the true end of the leg and only turns/zooms (no flight, no free camera). Candidates per leg: the true point + 2–3 look-alikes; each evidence statement is a geometric predicate (sector ± distance, across the stream, lower than you, houses around); tests require true statements to hold only at the true point and ≥ 6° inside their sector, and each false one to hold at a look-alike. Direction/distance "matches the plan" within ±8° and ±12 %.
- **Feedback wording.** The brief's partial-credit sentence is used verbatim ("המיקום שסימנתם מתאים. השלימו את בדיקת הסימנים והכיוון."). Terminology follows the lesson's current terms ("קטע דרך", "נקודה לבדיקת המיקום"), which the parallel copy pass introduced on the same day.
- **Intro sentence change (flagged):** the SceneHeader's last sentence described choosing in the accordion; it now reads "כל שיטה מוצגת בהמשך עם הסבר והמחשה." — an interface instruction only, no professional content changed.
- **Dead reckoning** keeps its approved text and its existing board, now as its own section below (no accordion); `DeadReckoningSection` in `CombatNavScene.tsx` marks where a chosen `DeadReckoningActivity` will replace the board.
- **Fallback (no WebGL):** the static pictures in `public/assets/lessons/topic06/terrain-nav/` are rendered from this model at the opening view and at each leg's opening look; the map and every action still work.
- **Shared code:** the ground textures are the lesson's existing Poly Haven set (`location-check/textures`), read-only; `smoothCurve`, `rng` and the measurement helpers are imported from the location-check modules unchanged.

## 2026-10-13 — Topic 02 opening relief/cover definitions

- The requested tighter title/subtitle spacing uses the existing `mt-1` (4 px), with both lines grouped beside the 138 × 60 px thumbnail. The beige explanation inset is removed, and the card height follows its remaining content.
- Follow-up: the user requested independent realistic imagery at the same size, rather than crops from the interactive terrain below. The two generated Mediterranean landscapes show exposed hills/valley for relief and woodland/orchard/field/houses/road for cover. Assets and the built-in generation prompts are stored in `public/assets/lessons/topic02/relief-cover-definitions/`.

## 2026-10-13 — Topic 02 "השוואה בין תבליט לתכסית": live 3D model + topographic map

Request: the "בשטח" board looked too much like the landforms (תבניות נוף) papercut block on the next page, its land cover was flat SVG, and the map should read like a real topographic map. Approved choices: a live model (not Blender stills) and a new terrain. Code: `reliefCoverCompare.data.ts` (one source), `reliefCoverMesh.ts`, `ReliefCover3D.tsx`, `ReliefCoverModel.tsx`, `ReliefCoverVisuals.tsx` (map + legend swatches), wired in `ReliefCoverCompare.tsx`. Tests: `scripts/qa/relief-cover-compare.test.mjs`; browser QA: `scripts/qa/shot-relief-cover.mjs`; stills: `scripts/qa/capture-relief-cover-fallback.mjs`. The flow, copy, cells and summary table are unchanged; `ReliefCoverIntroScene.tsx` was not touched.

- **A fictional sheet**, 480 × 320 m, local grid (numbers are metres from the sheet's SW corner). Heights 101–176 m: a main summit (176) with a south-east spur, a western summit (152) across a saddle, gullies, a south-west draining valley and the village plain east.
- **Contours every 5 m, index every 25 m** (a large-scale sheet; 10 m would leave ~7 lines on this hill). Index numbers sit on their line with the figures' tops uphill (the map convention), placed only where they read without turning the page over. Spot heights (dot + metres) on both summits.
- **Map symbols** follow the lesson's topographic sheet language (`MAP` in `topographyTerrainStyle.ts`): green tint + one open circle per tree for the grove, a dashed parcel with one dot per tree for the orchard, every building's footprint at its true size and turn, the quarry site in the existing pit-rock tone with ticks along its cut faces. The legend keys and their copy are unchanged; the disclaimer stays.
- **The quarry** is a hillside cut facing the camera: a 121 m floor and 10 m benches (treads 1 m off the contour levels, so no staircase contours), a curved back wall, sloping side walls, and an uncut yard below it that the map includes in the quarry area (as before). It takes the orchard's three western columns.
- **Vertical exaggeration 1.6× in the 3D model only** (the map keeps true heights). At true scale the 75 m hill on a 480 m sheet read almost flat from the oblique view, which works against a relief/cover lesson. Trees and houses keep their real size, placed on the exaggerated ground.
- **Object sizes** are at the upper end of real sizes (old oaks and pines, crowns up to ~13 m; houses 14–19 m), so they read at the board's ~1 px per metre.
- **Ground look:** the lesson-6 Poly Haven dry-ground and rock textures (read-only, `topic06/location-check/textures`), with straw tones on gentle ground and grey on steep ground; no green on bare ground (green = vegetation only, as in the spec). Quarry rock is the rock texture, desaturated to a pale limestone.
- **Camera:** opens from the south, north up like the map; drag rotates (±80°, no pan); zoom only by the buttons — the mouse wheel keeps scrolling the page. "מבט מלמעלה" aligns it with the map. A north arrow turns with the camera.
- **Fallback (no WebGL):** stills of the same model at its opening view, one per state, in `public/assets/lessons/topic02/relief-cover-compare/`.
- **Archive:** `ReliefCoverIntroSceneV1` (archive route) renders the same `ReliefCoverCompare`, so it shows the new boards too. The old papercut block code was in `ReliefCoverVisuals.tsx` (see git history); the shared engine (`terrainBlock*.ts`) is untouched and still drives the landforms page.

### Follow-up (same day): the "בשטח" model made realistic, like the coordinates globe

Request: the model should look much more realistic, like the site's other realistic examples (the Earth globe in #scene-coordinates-2). The globe is satellite imagery draped on a true shape, so the model now works the same way. Pipeline: `scripts/blender/export_relief_cover_model.mjs` (heights and objects from `reliefCoverCompare.data.ts`) → `render_relief_cover_model.py` (Cycles) → `package_relief_cover_model.mjs` → `public/assets/lessons/topic02/relief-cover-model/*.webp` (~0.6 MB in all). Regions: `DRAPE` in `reliefCoverMesh.ts`.

- **Ground:** straight-down renders draped unlit on the same live mesh. The whole ground to the horizon (4 m/px), a ring around the sheet (0.5 m/px), and the sheet per state (0.25 m/px), showing the shadows its land cover casts and, in state 4, the quarried ground. No green on bare ground (unchanged rule).
- **Objects are real 3D** (crowns, trunks, shrubs, houses with windows and roofs), built from the same data. Their tops wear one more render of the objects themselves, so crowns and roofs match the shadows on the ground. Walls are shaded by the renders' sun.
- **Ground textures:** Poly Haven CC0 `rocky_terrain_03`, `dry_ground_rocks`, `rock_face`, fetched into `qa-output/` by the render script (not committed). Over a 500 m sheet any photo tile repeated visibly as a grid, so the plain's colour and grain are procedural. The photos give the rock outcrops, soil patches and the quarry's fresh limestone.
- **Limestone ledges along the contours** on the slopes (broken bands, as on Judean hillsides). This is relief, not cover, and it echoes the map's contour lines. Assumption: acceptable as relief detail. It can be removed in the material if unwanted.
- **Sun 225° / 55°** (south-west, late morning), plus a shadowless sky fill. At the old 248° / 42°, slopes of the 1.6×-exaggerated hill fell into black self-shadow from straight above. The light is baked, so it does not turn with the camera (like imagery).
- **Changes:** the next state's ground sweeps in from the near (south) side along a ragged front. Objects grow out of the ground (or shrink away) as the front passes them, and the quarry morph is unchanged. Reduced motion: instant.
- **Fallback stills** were re-captured from the new model.

## 2026-10-13 — Topic 02 opening land-cover definitions

- User requested the same realistic image treatment for the natural/artificial cover definitions, removal of the two example lists in the attached crop, and removal of the dots beside those two headings. The original 88 × 60 px image size is retained. New independent landscape images distinguish irregular wild vegetation from houses/road/ordered orchard/field; image prompts and WebP exports live in `public/assets/lessons/topic02/land-cover-definitions/`.

### Follow-up — larger images and explanations beside them

- For the requested modest image enlargement, the relief/cover thumbnails increase from 138 × 60 to 184 × 80 px and natural/artificial cover from 88 × 60 to 132 × 90 px, preserving each asset's aspect ratio. In both cards, each heading and all its supporting text now form a column at inline-start (right), beside the image at inline-end. The land-cover definition sits 4 px below its heading (`mt-1`), independent of image height. The generated images are reused unchanged.

### Follow-up (same day): a cleaner block

On request, removed: the map key and the disclaimer, the "בשטח / במפה" captions above the boards, and the model's north arrow and view buttons. Drag still turns the model, but there is no zoom now. "המשך" now ends the state's cells at their bottom-left instead of a row of its own. The contour chip ("קווי הגובה: …") lost its caption line and now sits under the map, at its left. Its row keeps its height in every state, so the card never moves. The map-key and disclaimer strings remain in the scene's copy, unused.

### Follow-up (2026-10-19): opening instruction and the "contours changed" chip

Browser review at 1440 × 1122 (all four states, a wrong and a right prediction, revisit, reset). The board is clearly unlike the landforms page: open ground to the horizon and a real topographic sheet (grid, spot heights, scale) against the landforms page's papercut slab and abstract rings. Two gaps were fixed in `ReliefCoverCompare.tsx` only:

- **The opening state never said what the activity asks.** It now shows, under the model and until the first prediction: „הגבעה תשתנה שלב אחר שלב. לפני כל שינוי חזו מה ישתנה: התבליט, התכסית או שניהם.” This is interface copy only (no lesson content). It sits in the row that already held the chip, so no height changes and the laptop fit (`FIT_HEIGHT.compare`) still holds. Assumption: it lives as a constant in the component because `ReliefCoverIntroScene.tsx` (`COMPARE_COPY`) has another owner; it can move there later.
- **"קווי הגובה השתנו" looked the same as "ללא שינוי".** The changed chip now wears the relief key (sand dot and a sand tint), because the relief is what changed. Orange stays reserved for action.
- **Open (not changed):** the model's baked ground drape (`relief-cover-model/*.webp`) reads as a soft, hazy sepia with blotchy noise, not sharp imagery. The live model matches its renders, so this is the asset, not a loading fault. A sharper re-render is a separate Blender task. → Done below.

### Follow-up (2026-10-19): a more polished "בשטח" model (re-baked ground)

Request: make the 3D model look more polished. Only the bake changed (`render_relief_cover_model.py` → `package_relief_cover_model.mjs`), plus the matching sun in `ReliefCover3D.tsx`. The terrain data, the live mesh, the map, the objects and the interaction are unchanged.

- **Why it looked hazy:** the sky light (HDR, strength 0.6) plus a strong shadowless fill was as bright as the sun. Every slope came out nearly the same tone, so the relief barely read. Now: sky 0.12, fill 0.5, sun 4.5 at **42°** (was 55°), exposure −0.6. The shade stays open with no black self-shadow.
- **Drainage (new, `erosion_image`):** at 1 m over the `mid` region, the hill is roughened slightly, water is routed downhill (multiple-flow, weight = drop⁹) and each cell is cut by √area × slope (k 0.3, at most 4 m). The cut drives only the bake's bump and the soil colour in the beds. The live mesh and the map's contours keep the smooth hill, so the map ↔ model match is unchanged.
- **Ground material:** procedural throughout, because the 3.2 m soil photo tile aliased into a fine weave.
  - Terra-rossa soil, darker and warmer in hollows and gully beds.
  - Thinner, greyer soil on spurs and summits; pale stones.
  - Short, broken limestone ledges (a lip over a shaded riser).
  - No green and no grass on bare ground (unchanged rule).
  - The old continuous white contour bands are gone. **Assumption:** bands that follow every contour can read as drawn contour lines or as man-made terraces (land cover).
- **Quarry:** the fresh rock and yard palette is darker than before, because under the new light it glared white and the benches did not read.
- **Fallback stills** were re-captured from the new live model (`capture-relief-cover-fallback.mjs`).
- **Re-bake (model):** `& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/blender/render_relief_cover_model.py` (≈ 6 min on the RTX A5000), then `node scripts/blender/package_relief_cover_model.mjs`. Look-dev: the `look:<state>` pass and the `RCM_*` variables (`RCM_SUN_EL`, `RCM_EROSION`, `RCM_FLOW_P`, `RCM_BUMP` …).

### Follow-up (2026-10-19): one action panel under the boards (UX)

Request: the button was awkward, the question opened too low (the page had to scroll to answer), and the questions were unclear. At 1366 × 768 the answers were cut off at the viewport's bottom edge. `ReliefCoverCompare.tsx` only; the boards, stepper, map, model, cells and summary table are unchanged.

- **One panel, one place:** right under the boards, above the state's cells. It shows the next change and its question, then the feedback with "לשלב הבא: …", then the next question. Measured: at 1366 × 768 the answers end at 635 px and "לשלב הבא" is on screen after an answer, with no scroll (the same at 1536 × 864 and 1440 × 1122).
- **No extra click:** the first question is open from the start (`INITIAL_FLOW.asking = true`). The old "המשך" step before each question is gone; "לשלב הבא" after the feedback opens the next one.
- **Questions say what happens:** each one states the coming change before it asks. Answers carry their meaning: תבליט "צורת פני הקרקע", תכסית "מה שנמצא על פני הקרקע", שניהם "גם הצורה וגם מה שעליה".
  - **Assumption:** the scenarios only describe what happens to the hill, never which layer changes.
  - The quarry's scenario mentions that it spreads into the orchard, so "both" can be inferred and is not a trick.
- **Feedback states the verdict per layer** ("תבליט: לא השתנה · תכסית: השתנתה") and the learner's own choice ("בחרתם „שניהם”. התשובה הנכונה: תכסית"), then the existing explanation. While the boards change, the panel says "צפו בשינוי בדגם ובמפה…".
- **Revisit:** an earlier step shows its result and "חזרה לשלב N: …". The last step offers "לטבלת הסיכום", which scrolls to the summary and focuses it.
- **Copy:** the panel's interface strings are `TASK` in `ReliefCoverCompare.tsx`, because `ReliefCoverIntroScene.tsx` is owned elsewhere. Its `COMPARE_COPY.question` and `.next` are no longer shown.
- **Open for the fit owner:** the screen's opening height grew by the panel (≈ 90 px at 1440). `FIT_HEIGHT.compare` (819) in `ReliefCoverIntroScene.tsx` may want re-measuring. The panel itself stays on screen at laptop sizes either way, because it sits right under the boards.

## 2026-10-13 — Topic 02 vegetation ladder hover explanations

- The requested short explanations reuse the lesson's existing beige inset (`rounded-xl bg-bg-accent/60 p-4 min-h-[112px]`) below the vegetation names. The reserved height keeps the diagram and adjacent content stable when switching formations. Text follows the lesson body style (16 px, relaxed line height, black).
- Copy is condensed from `content/topic-04.md` §4.4 and the current land-cover descriptions. Hovering either a rendered formation or its label shows its identifying characteristics; keyboard focus on the label gives the same explanation and highlight. The diagram's orientation and assets stay unchanged.

## 2026-10-13 — Topic 02 "זיהוי סוגי תכסית בשטח": brighter map, topic tabs

- **Brighter, still realistic:** the rendered land gets a bright "development" in the SVG (`LandCoverMap.tsx`, filter `bright`). It lifts shadows and mid-tones and adds a little colour, like a lightened aerial photo, closer to the papercut version's lightness. Regions outside the active tab now fade to a pale, greyed wash (opacity 0.7 plus a lift toward white) instead of 38 % over the dark ground, which had read as a shadow over the whole map. The renders themselves are unchanged.
- **Topics vs. items:** the three topics are now a tab bar (text on a hairline, the active one underlined by a sliding accent line). The item buttons below keep the bordered option style, so a topic and a specific item no longer look alike.
- **No cross-fade:** the topic's content slides in from its tab's side (a later tab is to the left in RTL, so its content enters from the left). Reduced motion: instant.

## 2026-10-13 — Topic 02 datum: clearer copy and matching column heights

- User requested wording simplification and removal of the unused area below the right information column. Follow-up: the user rejected stretching the accordion because it creates a large empty space inside the open panel. Panels now keep their natural content height. Existing controls and feedback fill the right column beneath them; in the taller manual experiment those sit beneath the globe, keeping the full layout compact. The existing 32:68 columns and station behavior remain; the visual stage retains its 440 px minimum.
- Condensed duplicated experiment instructions and removed the bottle/cork analogy. Clarified ellipsoid versus datum, and corrected the seven-parameter text to describe a coordinate transformation between datums rather than a universal process for creating a datum. Reference: https://proj.org/en/stable/operations/transformations/helmert.html . The datum copy inventory records these user-authorized edits.

## 2026-10-13 — Topic 02 base-60 calculator placement

- The user asked to restore the calculator to its original state and defer the placement change until working from another computer. The original toggle above the diagram and the original floating calculator are restored; no calculator layout change remains.

## 2026-10-13 — Topic 02 "קנה מידה" laptop fit

- **One screen, one fit.** The part has one learning screen (the scene header plus the scale lab), so one `LessonViewportFit` wraps both. Reference: 1088 × 916 px, the section's content box and the composition's initial height at 1920 × 1080.
- **Bottom reserve is 12 px, not the measured space below.** The measured default counts PagedLearn's prev/next row and the section's bottom padding (≈156 px). That would shrink the 1920 × 1080 view to ≈0.84. At 1920 × 1080 the lab ends 13 px above the fold, so a 12 px reserve keeps that view at scale 1. On laptops it leaves a small gap at the viewport edge. The prev/next row stays below the fold, as before.
- **1440 × 1122 is now a uniform 0.967 shrink of the 1920 layout.** Before, the lab reflowed into the ≈1052 px column (map 587 px). Now it keeps the 1920 columns and line breaks (map 588 px on screen).
- **Taller states grow the page at the same scale.** Opening "פרטי החישוב" in measure mode makes the lab 132 px taller (reference px). The scale stays steady, and the page scrolls.
- **Small text on 1366 × 768.** The fit scale there is 0.659, so 14 px text renders at ≈9.2 px. This follows the requested uniform shrink. The legibility trade-off is open for review.

## 2026-10-13 — Topic 02 "תבליט ותכסית" laptop fit

- **Five compositions, one fit each.** Screen 1 is the part header (`SceneHeader`) with the two definitions. Screen 2 is the layered-terrain workspace. Screen 3 is the "same hill, three landscapes" comparison. Screen 4 is the sort quiz. Screen 5 is the "בהמשך השיעור" roadmap. Each fit holds its own section title, so the title shrinks with its screen. The 48 px gap between screens sits outside the fits and is not scaled. The page still scrolls from screen to screen.
- **Reference = 1920 × 1080.** Width 1088 px (the section's content column). Heights are each screen's initial height at that width: 405, 530, 732, 419 and 180 px.
- **Free height = viewport − 104 px − 24 px.** The 104 px is the 80 px fixed site header plus a 24 px gap. The 24 px is a gap at the bottom of the view. Each screen is fitted to the view under the header on its own, not to its distance from the top of the long page.
- **The comparison's summary row is not counted.** "סיכום ההשוואה" and its toggle follow the activity card and open into the full table at the end. Screen 3 is fitted on its title and the card only (732 px). The summary row is scaled with the card but may sit below the fold.
- **Scale stays steady per screen.** `fitTallerStates` is off. The comparison question, feedback, the open summary table and the quiz feedback grow the page at the same scale.
- **Resulting scales.** 1920 × 1080 and 1536 × 864: 1. 1440 × 1122: 0.967 for every screen (width-bound). 1366 × 768: 0.899 (width-bound), and 0.874 for the comparison (height-bound). A screen shrunk further than its neighbours keeps to the reading side (`align="start"`), so the titles and card edges stay aligned on the right; the 27 px it gives up shows on the left.
- **3D board.** The "בשטח" canvas measures its untransformed size (`LESSON_FIT_CANVAS_RESIZE`). A drag turns the model by the same angle per px of the shrunk board as at full size (`OrbitControls rotateSpeed` divided by the scale).

## 2026-10-13 — Topic 02 "משמעות מעשית" laptop fit

- **One screen, one fit.** The section holds a single learning screen: the four case cards and the detail panel below them (`HistoricalCasesPanel`). It is wrapped once in `LessonViewportFit` (`PracticalMeaningScene.tsx`). Switching cases changes the state of that screen; it does not open another screen.
- **Reference = 1920 × 1080 layout:** 1344 px wide (88 rem column minus 2 × 32 px padding) and 832 px tall, the tallest case state. Case 3 is 806 px. The page follows each state's own scaled height, so the prev/next row moves by the same ≈26 px × scale that it already moves at 1920.
- **Measured scales:** 1920 × 1080 → 1 (pixel-identical to before, all four states); 1440 × 1122 → 0.783 (width-limited: the column is 1052 px, so 1440 now shows the 1920 composition shrunk instead of re-flowing it); 1536 × 864 → 0.752; 1366 × 768 → 0.637 (body text renders at ≈10 px). The whole screen and the prev/next row fit without page scroll at every size.
- QA: `scripts/qa/shot-practice-fit.mjs`, output in `design/screenshots/practice-fit-before/` and `practice-fit-after/`.

## 2026-10-13 — Topic 06 "עקרונות הניווט" laptop fit

- **Three learning screens, one fit each** (`PrinciplesScene.tsx`): "מהמצפן אל המפה" (azimuth and back azimuth), "שלושה סוגי צפון" and the location check without GPS ("באיזה אזור אתם נמצאים?"). The part header with the two term definitions and the closing "עקרונות מרכזיים" card are text, not compositions, and stay unwrapped. The 48 px gaps between the screens sit outside the fits and are not scaled.
- **Reference = 1920 × 1080.** Width 1088 px (the section's content column). Free height = viewport − 104 px − 24 px: the 80 px fixed site header plus the section's 24 px top gap, and 24 px of air at the bottom. Each screen is fitted to the view under the header on its own, not to its distance from the top of the long page.
- **The three-norths lab is fitted as 952 px, not its full 1102 px.** At 1920 × 1080 it already ran past the fold. Fitting its full height would shrink the 1920 view to 0.864. Fitted as the 1080 px viewport's free height, 1920 × 1080 stays at scale 1 and a laptop shows the same part of the lab as 1920 does; the note under the info strip scrolls, as at 1920. The azimuth screen (776.5 px) and the location check (721.5 px) are fitted on their own measured height.
- **Scale stays steady per screen.** `fitTallerStates` is off; switching norths, moving the sliders and the location-check feedback do not change the screens' heights (the info strip reserves the tallest north).
- **Resulting scales.** 1920 × 1080: 1. 1536 × 864: 0.947 / 0.773 / 1. 1440 × 1122: 0.967 for every screen (width-bound: the column is 1052 px, so 1440 now shows the 1920 composition shrunk instead of re-flowing it). 1366 × 768: 0.824 / 0.672 / 0.888; in the three-norths lab 16 px text renders at ≈10.8 px. This follows the requested uniform shrink; legibility is open for review.
- **Sub-pixel shift at 1920.** The fit wrapper takes the composition's integer `offsetHeight` (776.5 → 777 px), so the content below the first screen moves down by ≤ 1 px. The azimuth screen is pixel-identical to before.
- **Pointer feel under the fit.** The 3D observation canvas measures its untransformed size (`LESSON_FIT_CANVAS_RESIZE`). Dragging the observation turns the view by the same angle per px of the shrunk frame as at full size (drag px divided by the scale).
- QA: `scripts/qa/probe-topic06-principles-fit.mjs` (geometry + screenshots) and `scripts/qa/states-topic06-principles-fit.mjs` (every azimuth/back-azimuth case, three norths × declination, location check, pointer mapping). Output in `design/screenshots/topic06-principles-fit/`.

## 2026-10-13 — Topic 02 "לפני שמתחילים" laptop fit

- **Two screens, one fit each** (`topic-02/OnboardingScene.tsx`). Screen 1 is the part header (`SceneHeader`) with the five-layer accordion and the map beside it. Switching layers and opening or closing a panel are states of that screen. Screen 2 is the closing "בהמשך השיעור" callout. The 80 px spacer between them sits outside the fits and is not scaled, so the page still scrolls from screen 1 to the callout and the prev/next row.
- **Reference = 1920 × 1080.** Width 1344 px (the 88 rem column minus 2 × 32 px padding). Screen 1 is 821 px tall there: header 151 px, its 32 px bottom margin and the 638 px grid. The 32:68 split (422 px accordion, 898 px map) and every line break are kept at all sizes.
- **Free height.** Screen 1 uses its measured position (104 px under the top of the page) and `reserveBottom` 0: it fits the view on its own, and the callout below it stays in the scroll flow. Screen 2 uses `reserveTop` 80 (the fixed site header). It is only 150 px tall, so it is always width-bound.
- **The callout's own `mt-8` is dropped inside its fit.** Unwrapped, it collapsed into the 80 px spacer above. Inside the fit box it would add 32 px to the gap, so the gap stays 80 px.
- **Map canvas resolution.** The topic-02 frame player now sizes its canvas buffer from the box's layout size (`offsetWidth/offsetHeight`) instead of the scaled bounding rect. A change of scale alone does not fire its `ResizeObserver`, so the old method could keep a stale buffer. The canvas's intrinsic aspect ratio also sets the map row height when every panel is closed, so the layout-size buffer keeps that height equal to the reference.
- **Resulting scales.** 1920 × 1080: 1 (geometry identical to before). 1536 × 864: 0.854. 1440 × 1122: 0.783. 1366 × 768: 0.728. All four sizes are width-bound, and screen 1 ends at 805, 747 and 701 px. At 1366 × 768 the 16 px panel text renders at ≈11.6 px. This follows the requested uniform shrink; legibility is open for review.
- QA: `scripts/qa/probe-topic02-onboarding-fit.mjs`. Output in `design/screenshots/topic02-onboarding-fit/` (`before-*` and `after-*`).

## 2026-10-13 — Topic 06 "תכנון ציר" laptop fit

- **Four screens, one fit each** (`PlanningScene.tsx`). Screen 1 is the part header (`SceneHeader`) with the two concept paragraphs. Screen 2 is the route-story builder: the five checkpoint cards, the step controls and the route map. Screen 3 is the pacing demo. Screen 4 is the closing "סיכום התכנון" card. The header and the summary are wrapped too, so their line breaks stay the same as at 1920 and they shrink with the screens around them.
- **Reference = 1920 × 1080.** Width 1088 px (the section's content column: `max-w-6xl` 1152 px minus 2 × 32 px padding). Heights are measured, not fixed: 292, 765, 600 and 138 px. The pacing demo's `my-12` sits inside its fit box (a flex item contains its children's margins), so the 48 px gaps around it scale with it. The gap after the header block (`mb-12`) is inside screen 1 for the same reason.
- **Free height = viewport − 104 px − 24 px** for screens 2–4: the 80 px fixed site header plus a 24 px gap at the top, and 24 px at the bottom. Each screen is fitted to the view under the header on its own, not to its distance from the top of the long page. Screen 1 uses its measured page position (104 px).
- **The builder is fitted as a whole.** At 1920 × 1080 it is 765 px tall and fits the 952 px of free height, so the 1920 view stays at scale 1. Its height does not change between steps.
- **Resulting scales.** 1920 × 1080: 1 for every screen. 1536 × 864: 1 / 0.962 / 1 / 1. 1440 × 1122: 0.967 for every screen (width-bound: the column is 1052 px, so 1440 now shows the 1920 composition shrunk instead of re-flowing it; the map is 531 × 489 instead of 529 × 487). 1366 × 768: 0.899 / 0.837 / 0.899 / 0.899. On 1366 × 768 the builder is height-bound, so it is 910 px wide while the screens around it are 978 px. Its 14 px card text renders at ≈11.7 px.
- **`SceneHeader` title uses `clamp(1.875rem, 3.8vw, 2.875rem)`.** That is a `vw` unit in a shared component. It reaches its cap from a 1211 px viewport, so the title is 46 px at every target size and the fit is not affected. The shared component is unchanged.
- **Sub-pixel shift at 1920.** The fit wrapper takes the composition's integer `offsetHeight`, so the content from the pacing demo down moves by ≤ 1 px and the page is 1 px taller (2033 instead of 2032 px). Screens 1 and 2 are visually identical to before; the pixel diff in the builder is anti-aliasing from a sub-pixel move.
- **Interaction and data under the fit.** The map's checkpoint markers are SVG click targets with no pointer math; a click at each marker's on-screen centre selects that checkpoint at every scale. The pacing slider is a native range input; a drag to 50 % of its on-screen width gives 1050 m and 700 double paces at every size. Distances, azimuths and the pace calculation do not depend on the scale.
- QA: `scripts/qa/probe-topic06-planning-fit.mjs` (geometry, screenshots, card/prev/next/keyboard steps, map clicks, slider drag and keyboard). Output in `design/screenshots/topic06-planning-fit/` (`before-*` and `after-*`).

## 2026-10-13 — Topic 02 "תבניות נוף" laptop fit

- **Two screens, one fit each** (`topic-02/LandformsScene.tsx`). Screen 1 is the part header (`SceneHeader`) with the landform board: four tabs, the terrain and its map side by side, and the description strip. Switching tabs and the valley/saddle switch are states of that screen. Screen 2 is the slope analyzer. The 48 px gap between them (the board's former `mb-12`) sits on the first fit's wrapper, outside the scaled composition, so the page still scrolls from screen 1 to screen 2 and the prev/next row.
- **Reference = 1920 × 1080.** Width 1088 px (max-w-6xl 1152 minus lg:px-8). Screen 1 is 700 px tall (header 151 px, its 32 px margin, the 517 px board) and screen 2 is 655 px, the same on every tab and on both forms of the valley/saddle tab. Both fit whole at 1920 × 1080, so it stays at scale 1.
- **Free height.** Screen 1 uses its measured position (104 px under the top of the page) and keeps 24 px clear below. Screen 2 reserves 104 px above (the 80 px fixed site header plus the same 24 px gap the first screen starts under) and 24 px below. Each screen is fitted to the view on its own, not to its distance from the top of the long page.
- **Two viewport-driven rules are frozen to their 1920 × 1080 result.** The views row used to narrow on short screens (`useViewsFit`, from `window.innerHeight`); at 1920 × 1080 it did not narrow, so it now always takes the full row (1038 px). The slope drawings used `min(72%, (100svh − 360px) × 1.6)`; at 1080 px that is 72%, so it is now `lg:basis-[72%]`. On short screens the fit shrinks the whole screen instead.
- **Resulting scales.** 1920 × 1080 and 1536 × 864: 1. 1440 × 1122: 0.967 (width-bound: the column is 1052 px, so 1440 now shows the 1920 composition shrunk instead of re-flowing it). 1366 × 768: 0.899 (width-bound); screen 1 ends at 733 px and screen 2 is 589 px under the header. 16 px text renders at ≈14.4 px.
- **Sub-pixel shift at 1920.** The fit wrapper takes the composition's integer `offsetHeight` (699.6 → 700 px), so screen 2 moves down by 0.4 px. Screen 1 is pixel-identical to before on every tab; screen 2 differs only in anti-aliasing.
- **Below lg.** The fit is not gated by width, as in the other wrapped topic-02 screens; mobile stays out of scope until desktop is signed off.
- QA: `scripts/qa/probe-landforms-fit.mjs` (geometry, overflow and every landform/slope tab per viewport). Output in `design/screenshots/topic02-landforms-fit/` (`before-*` and `after-*`).

## 2026-10-13 — Topic 06 "טכניקות ניווט" laptop fit

- **Three screens, three fits.** The opening (scene header, the two terms and the "בחלק זה" links), technique 1 (title, principle, the terrain lab and its two cards) and technique 2 with the closing principles card. Technique 2 and the closing card share one fit because at 1920 × 1080 they share one view (938 px together).
- **Reference = 1920 × 1080.** Width 1088 px (the section's content column). `reserveTop` 104 (the 80 px site header plus the section's 24 px top gap) and `reserveBottom` 24, the same values as the sibling principles part, so the height budget is 952 px.
- **Every screen fits against the 952 px budget, not its own height.** Technique 1 is ≈1410 px tall, so fitting its full height would shrink the 1920 view. With the budget the 1920 × 1080 view keeps scale 1, a laptop shows the same share of the lab as 1920 does, and all three screens share one scale, so the type does not jump between screens. Resulting scales: 1366 × 768 0.672, 1536 × 864 0.773, 1440 × 1122 0.967 (width-bound; the column there is 1052 px).
- **Board height cap frozen.** Technique 2's board was capped at `100vh − 7rem`. Inside the fit it is capped at that cap's 1080 px-tall result (968 px). The cap does not bind at 1920 × 1080 (the board is 720 px), so the reference view is unchanged.
- **Pointer feel under the fit.** The 3D model's canvas sizes itself from its untransformed box (`LESSON_FIT_CANVAS_RESIZE`). The navigator's-eye drag divides pointer deltas by the scale, and `OrbitControls` rotate/pan speeds are divided by it, so drags keep the reference feel. In full screen the scale is ignored there. The topographic map already reads clicks through `getScreenCTM()`, which includes the CSS scale.
- **Small text on 1366 × 768.** At 0.672, 16 px body text renders at ≈10.8 px. This follows the requested uniform shrink; legibility is open for review.

## 2026-10-13 — Topic 02 "קווי גובה" laptop fit

- **Two learning screens, one fit each.** Screen 1 is the part header (`SceneHeader`) with the 3D model + contour-map card. Screen 2 is the "הערכת תלילות לפי צפיפות קווי הגובה" title with the density tabs, explanation, glossary and map + A–B profile. The 48 px gap between them sits on screen 2's wrapper (`mt-12`), outside the scale; the card's old `mb-6` was dropped because it had collapsed into that gap.
- **Reference = 1920 × 1080.** Width 1088 px (the section's content column). Heights at that width: 852 px for screen 1 (the same in all three views) and 814 px for screen 2 (its tallest tab, "מצוק"; the other two are 788 px). `fitTallerStates` is off, so switching tabs never re-zooms.
- **Reserves.** Screen 1's top is measured (152 px at page top); screen 2 is read after scrolling it under the fixed header, so its top reserve is 80 + 24 px. Both keep 24 px below.
- **Resulting scales.** 1920 × 1080: 1 (layout pixel-identical to before). 1440 × 1122: 0.967 for both (width-bound). 1536 × 864: 0.808 and 0.904. 1366 × 768: 0.695 and 0.786 — 14 px captions render at ≈9.7 px on screen 1. This follows the requested uniform shrink; legibility is open for review.
- **3D model.** The canvas measures its untransformed size (`LESSON_FIT_CANVAS_RESIZE`); `OrbitControls` rotate/pan speeds are divided by the scale (1 in full screen). The layer drag maps the pointer through `getBoundingClientRect()` ratios, so it needed no change.

## 2026-10-14 — Topic 06 "דגשים לתכנון ולניווט" laptop fit

- **Three learning screens, one fit each.** Planning tips ("לפני שיוצאים"), navigation tips ("במהלך הניווט"), and the application question with its conclusion card. The part header (`SceneHeader`) is not a learning screen and stays unwrapped; its `vw` clamp is at its cap across 1366–1920. The 48 px gaps between screens stay outside the scale.
- **Reference = 1920 × 1080.** Width 1088 px (the section's content column). Heights are each screen's tallest state at that width: 721 px for the planning tips (every tip — the map board sets the height), 747 px for the navigation tips (tip 4 open), 690 px for the question (wrong-answer feedback plus the retry button). The scale therefore stays steady while tips switch or answers are chosen; `fitTallerStates` is on only as a guard.
- **Reserves.** 104 px top (80 px site header + 24 px) and 24 px bottom, the same as the other topic-06 parts, so each screen is fitted to the view under the header on its own.
- **Inline-start alignment.** A screen shrunk by height is narrower than the column; it keeps to the right edge (RTL start) so the three screens share one right edge.
- **Resulting scales.** 1920 × 1080: 1 for all (layout identical to before). 1536 × 864: 1 / 0.985 / 1. 1440 × 1122: 0.967 for all (width-bound). 1366 × 768: 0.888 / 0.857 / 0.899 — 16 px body text renders at ≈13.7 px at the smallest.

## 2026-10-14 — Topic 02 "טופוגרפיה" laptop fit

- **One screen, one fit** (`topic-02/TopographyScene.tsx`). The screen is the part header (`SceneHeader`), the four view tabs and the card with the explanation, the pager and the live viewer. The four views and "all together" are states of that screen. The section's 48 px gap to the prev/next row (the old `mb-12`) sits on the fit wrapper, outside the scaled composition.
- **Reference = 1920 × 1080.** Width 1088 px (max-w-6xl 1152 minus lg:px-8). The composition is 977 px tall in every view; at 1920 × 1080 it starts 104 px down and its card already ends on the fold (1081 px). It is therefore fitted against that view's height budget, not its own height: 1080 − 104 (measured top) − 24 px kept clear below = 952 px, the same 24 px as the sibling topic-02 screens. 1920 × 1080 stays at scale 1 and is pixel-identical to before.
- **Resulting scales.** 1536 × 864: 0.773. 1440 × 1122: 0.967 (width-bound; the column is 1052 px, so 1440 now shows the 1920 composition shrunk instead of re-flowing it). 1366 × 768: 0.672, the card ends at 761 px. Line breaks match 1920 on every screen. 16 px body text renders at ≈10.8 px on 1366 × 768; this follows the requested uniform shrink, and legibility is open for review.
- **3D viewer.** The canvas sizes itself from its untransformed box (`LESSON_FIT_CANVAS_RESIZE`), so its backing store keeps ≥ 1.5 device px per on-screen px. `OrbitControls` rotate speed is divided by the scale (1 in full screen). R3F hover/click and the drei layer labels needed no change: the photo-view registration error stays under 1 screen px and the stack hover reads the same spot at every scale. Full screen still fills the whole viewport.
- QA: `scripts/qa/shot-topography-laptop-fit.mjs` (geometry, line breaks, canvas density, registration, tabs/pager/dots/keys, orbit drag, stack hover and layer pick, full screen). Output in `design/screenshots/topography-laptop-fit/` (`before-*` and `after-*`).

## 2026-10-13 — Topic 02 "קואורדינטות 2" laptop fit

- **One fit per learning screen, nine screens.** Projections lab, geographic-coordinates globe, base-60 workbench, pros and cons, UTM heading with its projection explainer, UTM atlas, reference systems, reading coordinates, summary. The UTM block is split in two because the explainer and the atlas are separate tasks; both parts keep `data-block="utm"`, and the explainer's 24 px bottom margin stays the gap between them. The part header (`SceneHeader`) is not a learning screen and stays unwrapped; its `vw` clamp is already at its cap across 1366–1920.
- **Reference = 1920 × 1080.** Width 1088 px (the section's content column). Free height 968 px: the viewport less the 80 px site header (`--header-h` from `md`) and a 16 px margin above and below the screen. `reserveTop` is 96 and `reserveBottom` is 16, so each screen is fitted to the view under the header on its own, not to its distance from the top of the long page.
- **Screens taller than the reference view are fitted as 968 px.** At 1920 × 1080 the projections lab (1036 px) and the base-60 workbench (1090 px) already ran past the fold. Fitting their full height would shrink the 1920 view. They are fitted as 968 px instead, so 1920 × 1080 stays at scale 1 and a laptop shows the same share of them as 1920 does.
- **Scale stays steady per screen.** `referenceHeight` is each screen's initial height at 1920 × 1080 and `fitTallerStates` is off, so practice, hints and feedback grow the page at the same scale instead of re-zooming.
- **Resulting scales.** 1536 × 864: 0.78–1. 1440 × 1122: 0.967 for every screen (width-bound). 1366 × 768: 0.68–0.90; 16 px body text renders at ≈11 px on the two tallest screens. This follows the requested uniform shrink; legibility is open for review.
- **Pointer feel under the fit.** Dragging the projections globe and the geographic globe turns them by the same angle per px of the shrunk globe as at full size (drag px divided by the scale; `OrbitControls rotateSpeed` divided by the scale).

## 2026-10-14 — Topic 02 "קואורדינטות 1" laptop fit

- **Six learning screens, one fit each** (`topic-02/coordinates1Fit.tsx` → `FitScreen`, private to this part). The screens are: the geodesy / reference-bodies definitions; "אליפסואיד, גיאואיד וגליות" (four tabs and the H = h − N task); the guided datum stage; the two datum-parameter cards; the datum-mismatch activity (three stages); and the part summary. The datum block is split into two screens inside `DatumGuided`, because the stage and the parameter cards are 1053 px together at 1920 × 1080. The part's `SceneHeader` stays unwrapped, as in "קואורדינטות 2": its title is capped at 46 px and its intro at `max-w-2xl`, so it does not reflow across the laptop range.
- **Reference = 1920 × 1080.** Width 1088 px (the section's content column). `reserveTop` is 80 (the fixed site header) and `reserveBottom` is 0, the same values as the sibling "קואורדינטות 2" screens, so 1000 px are free. Each screen's `referenceHeight` is its tallest regular state at 1920 × 1080. Definitions: 750. Reference bodies: 917 (the "גליות וגובה" task; the other tabs are 698–730). Datum stage: 850 (station 3; stations 1–2 are 796 and 844). Parameter cards: 233. Datum activity: 902 (stage 2 after an action; the other states are 879). Summary: 310. Every screen fits at 1920 × 1080, so that view stays at scale 1. The scale holds steady while tabs and stages change.
- **One exception.** The optional "נסו בעצמכם" experiment in the datum stage is 996 px tall. That screen uses `fitTallerStates`, so on a laptop the experiment shrinks a little more (1366 × 768: 0.81 → 0.69) instead of running past the bottom of the view. At 1920 × 1080 it still fits at scale 1.
- **Viewport-driven figure height frozen.** The reference-bodies figures were sized from `window.innerHeight` (`useScreenFit`, 200–290 px). At 1920 × 1080 they were 290 px on every tab, so they are now always 290 px. On short screens the whole screen shrinks instead.
- **Pointer math under the fit.** Both 3-D canvases (the measurement landscape and the datum globe) measure their untransformed size (`LESSON_FIT_CANVAS_RESIZE`). The landscape/ellipsoid drag-turn (`viewControls.useDragTurn`) divides pointer deltas by the scale. The globe's `OrbitControls` rotate speed is divided by the scale. The globe's chip leaders and the ellipsoid enlargement's flight convert screen-rect offsets to the composition's own px. The marker drag and the R3F hit tests use rect ratios / offset coordinates and needed no change.
- **Resulting scales.** 1920 × 1080: 1 for all screens; positions differ by up to 1 px (the fit takes the integer `offsetHeight`). 1440 × 1122: 0.967 for all (width-bound; the column is 1052 px). 1536 × 864: 1 / 0.855 / 0.922 / 1 / 0.869 / 1. 1366 × 768: 0.899 / 0.750 / 0.809 / 0.899 / 0.763 / 0.899. At 0.75, 16 px body text renders at ≈12 px. This follows the requested uniform shrink; legibility is open for review.
- QA: `scripts/qa/probe-coordinates1-fit.mjs` (geometry per screen) and `scripts/qa/probe-coordinates1-states.mjs` (every tab, stage and feedback state, plus pointer readings). Output is in `design/screenshots/topic02-coordinates1-fit/` (`before-*`, `after-*`, `states-*`).

## 2026-10-19 — Topics 02 and 06: one content width for every sub-topic

- **Reference.** Lesson 2 "לפני שמתחילים" (`#scene-onboarding`): `max-w-lesson mx-auto px-4 sm:px-6 lg:px-8`, laid out at 1344 px and laptop-fitted. Measured content box: 1052 px (x 64–1116) at 1440 × 1122, where the lesson column is only 1116 px wide. At 1920 × 1080 it is 1344 px (x 158–1502).
- **What differed.** At 1440 × 1122 every sub-topic of both lessons already had the same bounds (x 64–1116), because `max-w-6xl` (1152) and `max-w-lesson` (1408) are both wider than that column. The difference was only at wider screens: the other sub-topics stopped at 1088 px (`max-w-6xl`), and their `LessonViewportFit` reference width was 1088.
- **Decision (user, 2026-10-19): unify fully.** Every sub-topic section in lessons 2 and 6 now uses `max-w-lesson`, and every `LessonViewportFit` reference width is 1344. The opening (`HookSceneLayout`) is a shared full-bleed cover, and lesson 6's "דגשים לתכנון ולניווט" (`PlanningTipsScene`) is being removed from the lesson by another session; neither was changed.
- **Consequence at 1440 × 1122.** The fitted screens are now laid out at 1344 and shrunk to 0.783, as the reference is, instead of 0.967. Their type renders about 19 % smaller than before; 16 px body text renders at about 12.5 px.
- **Reference heights.** All of them were re-measured at 1344 px, at 1920 × 1080, on 2026-10-19 (tallest states where the constant is a tallest state). A screen taller than the 1920 × 1080 view budget is fitted to that budget, so 1920 stays at scale 1 at the full 1344 px width and its foot scrolls. This applies to scale (1069 → 916), topography (977 → 952) and the first two screens of principles (990 / 1321 → 952). Short laptops (1366 × 768, 1536 × 864) still shrink the tall screens by height, so those are narrower than the column, as the practical-meaning screen already was.

## 2026-10-19 — Topic 02 "תבליט ותכסית", task 4: SortQuiz stage layout

- **Opt-in, not a replacement.** `SortQuiz` gained `layout?: 'grid' | 'stage'` (default `grid`). Only task 4 (`ReliefCoverIntroScene`) passes `layout="stage"`. Task 9 (`LandCoverScene`) and the archive V1 scenes still get the original card grid. To move task 9 to the new design, add `layout="stage"` to its `<SortQuiz>` and re-measure `FIT_HEIGHT_QUIZ` at 1344 px wide, 1920 × 1080 (the stage is about 21 px taller than the grid was in task 4).
- **Same items, explanations, scoring and free order.** A strip of item tokens replaces the progress bar. It also lets the learner move between items, so they can answer in any order and reread explanations after finishing. The tokens are a quieter fill than the white bordered choice buttons, so the strip reads as progress, not as the action. After an answer, focus moves to "next".
- **New interface strings (judgment call):** `פריט N מתוך M`, `לפריט הבא`, the completion helper `בחרו פריט בשורה שלמעלה כדי לקרוא שוב את ההסבר.` / `כל הפריטים סווגו נכון.`, and sr-only `נכון` / `לא נכון` on the tokens. No lesson wording changed.
- **The feedback slot reserves 88 px** under the choices so the stage doesn't jump between answered and unanswered items. The initial state therefore has some empty space under the choices.

## 2026-10-19 — Terrain classification mockup alternatives

- Scope: two image mockups only, in design/mockups/terrain-classification-2026-10-19; no lesson implementation changes. The user explicitly requested a redesigned exercise, so the alternatives intentionally vary its composition while preserving the site chrome, existing palette, eight items and classification explanations.
- Review: the public topic-02 page currently shows the grid quiz; local ReliefCoverIntroScene.tsx already selects layout=stage. The live topic-01 archive is password protected, so its exercises were reviewed in the available AsymmetricScene.tsx source (photo tactic matching and organization category bins), not through the protected page.
- Design calls: A uses one current image and two photo category choices. B uses a common landscape with eight hotspots and two category receptacles. Both preserve click/keyboard interaction; drag in B is optional. No new UI color tokens.
- Image-generated frames are concept references, not exact type/copy/geometry specifications. The handoff gives exact content and states. In particular, the final saddle asset must depict a low point on a ridge between two summits, not a valley. Site chrome must reuse the existing implementation rather than copying generator deviations.
- Intended desktop target: 1440x1122. Generated PNG dimensions are recorded by artifact verification; no page code was changed or browser rendering claimed for the redesigned concepts.

## 2026-10-19 — Terrain classification: quieter revision of concept 1

- User refinement: less complex imagery, retain the selected object's silhouette outline, preserve the current exercise layout.
- Current-layout interpretation: local SortQuizStage (top text-token navigation; current item on right; two side-by-side choices on left; feedback below choices). This interpretation was stated in commentary before generating.
- Revised image: design/mockups/terrain-classification-2026-10-19/03-clean-current-layout-v2.png. One isolated house on cream replaces the busy panorama; restrained single-object illustrations replace category landscape photos.
- Mockup only. Existing stage geometry, button dimensions, header/sidebar and authoritative source copy take precedence over image-generator deviations. CLAUDE-HANDOFF-V2.txt explicitly documents this, including keeping original h-14 choice controls and NEXT_STEPS copy.

## 2026-10-19 — Terrain classification: final no-counter mockup and production assets

- User requested removal of the entire "בהמשך השיעור" block, the item-position pill and score pill from the mockup, plus a complete Claude implementation prompt and all required production illustrations.
- Final reference: design/mockups/terrain-classification-2026-10-19/04-final-clean-no-counters.png (1421x1107); desktop implementation acceptance target remains 1440x1122.
- Production assets: public/assets/lessons/topic02/terrain-classification/. Eight item PNGs include orange feature contours; two category-choice PNGs have no outline. All ten are 1536x1024 RGBA. They were generated with built-in image_gen, visually reviewed on white in the handoff gallery, and checked for decodability and alpha (corner alpha maximum 1/255).
- Handoff: design/handoff/terrain-classification-2026-10-19/CLAUDE-IMPLEMENTATION-PROMPT.txt, asset-manifest.json, generation-prompts.json, asset-preview.html and ASSET-QA.json.
- Final prompt supersedes earlier handoffs. It specifies no numerical item/score displays even on completion, semantic completion text, source-order item navigation, one immutable first answer per item until reset, explicit next, preserved keyboard interaction and optional props scoped to this quiz so other SortQuiz consumers keep their defaults.
- Illustrated choice cards in the final mockup replace the old V2 suggestion to keep h-14 text controls. The two-column stage and top text-token row remain unchanged in composition. The prompt calls for measuring the actual final state and updating viewport-fit height.
- Only mockups, illustration files and handoff documentation were produced in this task. No lesson source code was implemented or tested as an implementation.


## 2026-10-19 — Terrain classification: final version implemented

- **Scope.** The quiz in `ReliefCoverIntroScene.tsx` now passes `visuals`, `showScore={false}`, `showPosition={false}`, `showFinalScore={false}`, `hint` and `doneText` to the existing `SortQuiz` stage. All of these are opt-in. The grid layout, task 9 (`LandCoverScene`) and the archive V1 scenes behave as before. The roadmap screen (`NEXT_STEPS`, `FIT_HEIGHT.roadmap`) is gone from this section only.
- **Assets are shipped as WebP siblings.** `scripts/media/package-terrain-classification.cjs` converts the ten handoff PNGs at full 1536×1024 size, keeping alpha, with no crop and no recolour. Total size drops from ~23 MB to ~2.6 MB. The PNG sources stay in place. The page loads the `.webp` files. After the item on stage loads, only the next unanswered item is prefetched.
- **Sizes follow the lesson fit, not the mockup's type scale.** The screen is laid out at the 1344 px reference width and shown at 0.7827 at 1440×1122. The mockup's type is larger than the site's scaled type. The existing section title, card title and body classes are kept unchanged. The handoff's final-px targets are met at 1440: choice cards ≈175 px tall (224 ref), choice art ≈117 px (150 ref), choice label ≈19 px (`text-2xl`), stage illustration ≈404×270 px (the 5fr column, 3:2, `object-contain`). Tokens are `h-14 text-lg`.
- **The stage keeps its 5fr / 7fr split.** The mockup shows a roughly 50/50 split. The handoff's own instruction to keep the stage ratios takes precedence. As a result, the illustrated choice cards are wider than in the mockup (≈278 px vs ≈235 px).
- **Restart is always in the header** when there is no final score (ghost button with the existing refresh icon). This holds from the opening state onwards, so the header never jumps.
- **Wrong-answer feedback in the stage now names the correct category:** "לא בדיוק. הסיווג הנכון: X." The stage has no other consumer. A filled check / x mark sits beside the feedback, the token and the chosen card, so the result reads without colour. The right/wrong shake and bounce on the item name were removed from the stage, leaving only a 0.25 s fade/rise on item change (none under reduced motion).
- **`FIT_HEIGHT.quiz` is 709**, re-measured at 1920×1080 (scale 1). The feedback slot (150 px ref) holds the longest explanation plus the completion line, so the screen height is the same in every state (555 px at 1440×1122 in all states).
- **Known stale QA step (not changed here):** the quiz step at the end of `scripts/qa/shot-relief-cover-fit.mjs --states` still targets the old grid (`ul > li`). The new acceptance run is `scripts/qa/terrain-classification.test.mjs`.

## 2026-10-19 — "אליפסואיד, גיאואיד וגליות": polishing pass (task, section labels)

Brief: the user's message of 2026-10-19. Review the existing interaction at 1440 × 1122 (every tab, control, the task and its feedback) and fix it in place, without rebuilding. Files: `MeasurementSection.tsx` and `MeasurementPanel.tsx` only. `CoordinatesScene.tsx` (tabs, view text, captions, aria descriptions), `CoordinatesDefinitions`, the datum and `coordinates1Fit` were not touched.

- **Station A in the section.** A's arrows are short (H ≈ 18, h ≈ 11, N ≈ 7 px at 1440). The h letter was pushed 22 px above N and floated away from its arrow, and the letters overlapped the level ticks. Now, when the h arrow is shorter than two letter heights, h and N stand one above the other (17 px apart) beside the stack, each tied to the middle of its own arrow by a 1 px leader in its own colour. B and C are drawn as before. The level ticks, in the task and the geoid view, now start just past H's arrow so they no longer run under its letter.
- **Task.** The readings are now headed "נתוני תחנה X", so the numbers say which station they belong to after "לתחנה הבאה". The N value shows what its sign means, in the section's terms: "הגיאואיד מעל האליפסואיד" / "מתחת לאליפסואיד" / "הגיאואיד והאליפסואיד נפגשים". This follows the data's convention (N > 0: the geoid above the ellipsoid). Data, formula, checks and hints are unchanged. Typo fixed: "השוו בין חצי הגובה" → "חיצי הגובה".
- **Heights unchanged.** The card is 781 px and the screen 917 px at 1920 × 1080, before and after. `FitScreen`'s 917 still holds.
- **Verified:** `measurement-mission.test.mjs` 28/28; `shot-measurement-mission.mjs` PASS on :3001. `measurement-round6.mjs` stopped at its "navigate home and back" step (a `load` timeout on the shared dev server). That step does not touch these files.
- **Open (needs a decision):**
  - A's arrows are still small at the one height mapping. A local magnifier at the picked station would fix it, but it is a new element.
  - Before the reveal, the geoid view's section shows H at the picked station while the model shows it only after the reveal.
  - The geoid view's instruction ("חשפו … ובחרו תחנה") ends a three-line paragraph, far from its button. It lives in `CoordinatesScene.tsx`.

## 2026-10-19 — Land-cover origin classification: mockup, assets and final handoff

- Reviewed the actual local bottom exercise at http://localhost:3000/lessons/topic-02/#scene-landcover and LandCoverScene.tsx. Current UI is a grid; this handoff applies the user's approved one-item stage workflow to natural/artificial classification.
- Eight source items and why texts are unchanged: grove, citrus orchard, garrigue, planted forest, terraces, batha, irrigation reservoir, wheat field. Correct mapping is 3 natural and 5 artificial, not 4/4.
- Active product assets: public/assets/lessons/topic02/landcover-origin-classification/ — ten 1536x1024 RGBA PNGs. Item assets include orange feature contours; category-choice assets have no contour. Grove is reused from the earlier terrain pack; the other nine current assets were generated for this pack.
- User refinement: natural/artificial choice illustrations were too similar. Final natural illustration uses an irregular tree, shrub and rock; artificial uses a stone house and orderly planting bed. Current files retain choice-natural.png and choice-artificial.png; superseded files are backed up in the handoff archive.
- Final mockup: design/mockups/landcover-origin-classification-2026-10-19/02-refined-choices-final.png. The older 01 mockup is superseded. No score or item-position counters; the existing lesson chrome remains.
- Complete Claude prompt, manifest, generation prompts, white-background gallery and alpha/decoding QA are in design/handoff/landcover-origin-classification-2026-10-19/.
- All ten active images passed decoding, dimension and alpha checks, and were reviewed on white in the browser. The final prompt contains the current mockup path, all ten image filenames, source explanations, independent per-quiz answer state, keyboard handling, feedback, completion and reset behavior.
- Scope: image assets, mockups and handoff documentation only. No lesson source changes or implementation-build claims.


## 2026-10-19 — Land-cover origin classification: implementation

- `LandCoverScene.tsx` now calls the shared illustrated `SortQuiz` stage (`layout="stage"`, `visuals`, no score / position / final score). It uses the same props as „סיווג מרכיבי השטח”. No new mechanism; each scene keeps its own `useState`, so the shared `q-grove` id never shares an answer.
- WebP siblings with alpha, made by `scripts/media/package-landcover-origin-classification.cjs` (same settings as the terrain pack). They total 3.6 MB; the PNG sources (26 MB) stay in place. The page loads the WebPs.
- **Wrong-answer copy.** The brief asks for „הסיווג הנכון: תכסית טבעית/מלאכותית.” The shared stage printed the option label („…: מלאכותית.”). `SortOption` got an optional `feedbackLabel` (default: `label`), so the shared component has no „תכסית” text and the sibling quiz is unchanged.
- **Followed the approved sibling instead of the mockup** in two small things: the name strip uses 8 equal columns (the mockup sizes tokens to their text), and the item title uses the stage's `text-4xl`. At 1440 (fit scale 0.783) the measured sizes are within the brief's ranges: illustration 404 px wide, choice cards 174 px tall, choice art 117 px, labels 19 px.
- `FIT_HEIGHT_QUIZ` 628 → 709, measured at 1344 px in every state. With the done line plus the longest wrong feedback, 28 px of the reserved slot is still free, so answering never changes the screen height.
- Verified: `scripts/qa/landcover-origin-classification.test.mjs` all checks pass (motion + reduced motion). `terrain-classification.test.mjs` still passes. `tsc` is clean for `src`. `next build` passes in a temporary worktree. Screenshots are in `design/screenshots/landcover-origin-classification/`.

## 2026-10-19 — Terrain classification: centered choices + auto-advance (user request)

- **Choices centered on the illustration.** The user picked "choice cards ↔ main illustration". With `centerChoices`, the stage becomes one three-row grid: name | illustration with the choice cards vertically centered on it | feedback under the choices. The illustration's frame and the choice group share the same vertical center (checked: Δ 0 px). `FIT_HEIGHT.quiz` is now 845 (re-measured at 1920×1080). The screen still fits at 1920×1080, 1536×864, 1440×1122 and 1366×768.
- **Auto-advance is immediate** (user's choice over a ~3 s delay). With `autoAdvance`, an answer moves straight to the next unanswered item, so the explanation is not on screen in that moment. The result shows as ✓/✗ on the strip. The explanation is one click away on the item's token, where the saved answer, the explanation and „לפריט הבא” still appear. The last unanswered item stays on stage with its feedback and the completion line.
- **Screen readers** hear a short result through an sr-only line in the existing live region: „X: נכון.” / „X: לא בדיוק. הסיווג הנכון: Y.”. Any manual move clears it.
- **Double-click guard.** Choice clicks within 450 ms after an auto-advance are ignored, so the second click of a double click can't answer the next item.
- **Both props are opt-in.** They are used only by this quiz. Task 9 (`LandCoverScene`, which another session moved to the illustrated stage the same day) keeps the top-aligned choices and the explicit „לפריט הבא”. To match this quiz, it can pass `centerChoices autoAdvance` and re-measure its fit height.

## 2026-10-19 — Task 9 („טבעית או מלאכותית?”): choices centered too (user request)

- `LandCoverScene` now passes `centerChoices`, like the relief/cover quiz. The choice cards are vertically centered on the item's illustration (Δ 0 px at 1920, 1536, 1440 and 1366), and the feedback sits below. Only centering was requested: task 9 keeps the explicit „לפריט הבא” (no `autoAdvance`).
- `FIT_HEIGHT_QUIZ` 709 → 845, measured at 1920×1080. Every wrong-answer explanation fits the reserved slot, including the longest one (מאגר מים) together with the completion line. The height is the same in all states, and the screen fits the viewport at all four sizes.

## 2026-10-19 — „אותה גבעה, שלושה נופים”: map ↔ model swap + axes marker (user request)

- **Boards swapped.** The map now sits at the start (right, RTL) and the 3D model beside it (left). The row underneath moved with them: the "same/changed contours" chip stays under the map (now start-aligned, at its outer edge), and the opening hint stays under the model.
- **X·Y·Z axes marker** (`AxisGizmo.tsx`) in the middle of the live model, as in 3D editors and games, so learners know the model turns. It shows once the model is ready and fades out on the first press on the board. Without WebGL (the still image) it isn't shown. The axes rock gently around the vertical; under reduced motion they stay still.
- **Colors are an assumption.** The spec has no gizmo colors, so the conventional ones are used inline: X `#D2453A` red, Y `#4E9A2F` green, Z `#2F6FD2` blue, on a white disc at 62% for legibility over the terrain. They aren't tokens because they're the universal axes convention, not part of the palette.
- The marker carries `data-overlay`, so `capture-relief-cover-fallback.mjs` keeps it out of the fallback stills.

## 2026-10-19 — One loading animation for every 3D model in lessons 2 and 6 (user request)

- **One component.** `src/components/lesson/ModelLoading.tsx` is now the only loader. The rule is in CLAUDE.md ("3D models (loading)"). It replaces four copies of the title + bar overlay (contour mountain, topography, globe, location-check observation), two text-only pills (relief-cover model, terrain-nav model) and the projections stage's pulsing disc. It is new on the datum globe and the measurement landscape, which showed a still with no indicator.
- **Text tier.** `font-display text-base font-bold text-black` is taken from the newest loader (lesson 6 observation). The older lesson-2 copies used `text-sm text-fg-muted`; the lessons have since moved to black body text.
- **Bar.** It always runs the site's existing loading sheen (`animate-asset-sheen`, as in `IsometricAsset`), which is static under reduced motion. drei counts whole files, so one big model file would otherwise hold a measured bar frozen at 0%. Where the loads are counted (drei `useProgress`, inside the 3D chunk, only while `active`), a solid fill grows over the sheen. The globe explorer keeps its staged 25% → 70%.
- **Lazy chunks.** The contour and topography `next/dynamic` placeholders now show the same loader in the model's frame. The contour placeholder's text changed from „טוען מודל תלת־ממדי…” to „טוען הר תלת־ממדי…”, so it doesn't switch wording when the chunk arrives. `shot-contours-fit.mjs` still waits for „טוען מודל”; it no longer matches anything, so it stops waiting early.
- **Placement.**
  - Centred on the frame, except on the measurement landscape (below).
  - On the datum globe it sits on a small card over the static render.
  - On the measurement landscape, whose stills stay interactive while the model loads, the card sits at the foot of the stage.
  - The projections disc stays as the globe's place-holder but no longer pulses: one animation at a time.
- **Location-check observation.** The loader now also covers the moment before the canvas is activated (formerly an empty `bg-bg-accent` frame).

## 2026-10-19 — Topic 02 "אטלס הפלחים": focus pass (user request)

Brief: the user's pasted message of 2026-10-19 (the UTM zone atlas only). Code: `utm-atlas/UtmZoneAtlas.tsx`, `AtlasMap.tsx` (optional top-label row), `atlasControls.tsx` (`ZoneStepper`); `FitScreen name="utm-atlas"` height 1010 → 816. QA: `scripts/qa/shot-utm-atlas.mjs` rewritten for the new structure (107 checks), screenshots and before/after in `design/screenshots/utm-atlas-2026-10-19/`.

- **The two existing views are the two goals.** "פלחים" (title: "באיזה פלח ובאיזה חצי כדור נמצאת הנקודה?") — the world map leads (800 × 533 at the 1344 px reference), the enlargement is small beside it (440 × 293); the card shows only the zone and the hemisphere. "מודדים במטרים" (title: "כיצד מתארים את הנקודה במטרים בתוך הפלח?") — the enlargement with its grid leads, the world map is a 304 px locator without labels; the card shows E and N with units, then the zone, the hemisphere and WGS84. The leading map is always at inline-start; both maps stay mounted, so the point, pins and windows carry over. Titles are the brief's two questions; one instruction line each.
- **Assumption: the "one primary action" of an exploration view is the map pick** (the instruction names it). "נסו נקודה אחרת" and "תרגול: מצאו את גריניץ׳" are secondary buttons under the small map; no orange button competes in exploration. Practice keeps its primary "בדיקת הבחירה", which becomes the way forward when solved (focus moves to it).
- **Moved / removed.** Zone range cell (the boundaries stay on the enlargement), lat/lon cell, the map titles, the world map's long caption (now "מפת איתור, לא מפת UTM. כל רצועה היא פלח."), the grid caption's E/N sentence (the axes say it), the world 84°N / 80°S chips, the zones-view scale bar. "0°" on the world map → "קו המשווה". Coverage, numbering from 180°W and the Norway / Svalbard exceptions → the closed "מידע נוסף על UTM" (shared Radix accordion, Table 2 classes). Feedback lines rewritten short, one per view, explaining the result or the last change.
- **Assumption: the exploration hemisphere switch was dropped.** The hemisphere changes by picking across the equator (both views) or a southern preset; the false-northing explanation now comes with that crossing in the metres view. The transfer practice keeps its own N/S choice. The five-zone row left the exploration: neighbour zones are the arrows around the zone in the metres card (`data-zone-step`), where "same E/N, another place" is the point.
- **Connectors** only while the world map leads; in the metres view the locator's window is a few px wide and lines would cross the readings — the frame, the pin "A" and the highlighted zone carry the link.
- **Fit.** 816 px tall at 1344 in both views (was 1010) — switching views does not move the page. 1440 × 1122: card 96–735 px. 1920 × 1080: 96–912 (before: past the bottom). 1536 × 730: the closed "מידע נוסף" row is below the fold (tall-screen policy). Labels keep 13 / 16 px; no inner scroll.

## Lessons 2 & 6 — one white card per activity (2026-10-19)

Every activity's title, lead/instructions, controls, visualisation and feedback now sit inside the activity's own `.surface-elevated` card (pattern: LandformsScene "ארבעה סוגי מדרונות": T1 h3 + lead at the top of the card). Chapter headers (SceneHeader) and general theory stay outside.

- **Moved into the card:** relief-cover (layers workspace, compare + its summary/table, practice title via `SortQuiz heading`), land cover (map workspace, ladder title, practice title), topography (view tabs), coordinates 1 (ellipsoid/geoid/undulation, datum, datum-field simulation), coordinates 2 (projections, geographic globe, base-60, UTM explainer, reference systems), contours (steepness tabs + kind text + glossary + map/profile → one card), both "לפני שמתחילים" screens (step list + illustration), lesson 6 techniques (each technique's title, principle, demo, "מתי משתמשים" and the demo walk-through → one card; the dead-reckoning board is an inset), route-story builder (title, instruction, five points and map).
- **Assumption: left outside on purpose** — they are chapter-level theory, not part of one interaction: the definition cards that open relief-cover / land cover / coordinates 1; the two datum-parameter cards ("הזזה, סיבוב וקנה מידה", "ההבדל בין הדאטומים השונים"); "הגורמים המשפיעים על הצומח" beside the vegetation ladder (explains vegetation, not how to read the ladder); "כיצד מפרשים קואורדינטות?" (a static comparison + definitions screen, its heading covers both boxes); the opening term pairs of lesson 6 techniques / principles / planning (used by every activity of the chapter); summary/conclusion cards.
- **Assumption: SceneHeader intros that also carry an instruction** (landforms, topography, contours, both onboarding screens) stay in the header — wording is frozen and the header is the screen title, so the sentence was not split.
- Insets replace inner cards where a former card now sits inside a workspace (contours kind text, terrain-nav "מתי משתמשים"/walk-through, dead-reckoning board); the relief-cover summary table keeps a plain hairline frame.

## 2026-10-26 — Datum mismatch activity ("הדמיה: מה קורה כשהדאטום לא תואם?"): clarity pass, task 16 (user request)

Code: `datum-field/DatumFieldChallenge.tsx`, `datumField.ts`, `datumField.data.ts`. QA: `scripts/qa/datum-field-challenge.test.mjs` (21 unit tests), `scripts/qa/shot-datum-field-challenge.mjs` (18 states at 1440 × 1122). Screenshots: `design/screenshots/datum-field-challenge/`. Screen card: the 26.10 section of `datum-field-challenge-screen-card-2026-10-12.md`.

- **The practice preview is gone.** This supersedes brief §7 ("בחירה מציגה תצוגה מקדימה אמיתית"). Choosing a pair moved the mark onto the place, which showed the answer before any decision. The user asked for a decision before the answer, so the map shows nothing of an answer until "בדיקת הנתונים".
- **Assumption: three decision steps** (datums match? → action → pair). The feedback has to say whether the mistake was in identifying the datums, in choosing the action or in the calculation, and a single choice of pair can't tell these apart. The verdict names the first step that went wrong.
- **Assumption: the calculation distractors.** "The two shifts swapped between E and N" and "only E converted" are invented slips. They are not from the brief.
- **Assumption: "שינוי הכיתוב בלבד" is offered only in case 2.** In case 1 both labels already say A, so the action would mean nothing.
- **Reset is back** ("התחלה מחדש": stage 2 to before the copy; practice: the case on screen). It was removed on 12.10 because the experiments are reversible. The current task asks to implement and verify a reset. The experiments stay reversible as before.
- **Assumption: the ring appears in the legend again,** now as "המקום האמיתי" (on 13.10 "הגשר בשטח" was removed as a repeat). The task asks that the real place and the mark obtained be told apart at every moment. The ring's chip on the map gives only the place's name, so the term is not repeated.
- **Assumption: the datum moved from the removed legend item "רשת דאטום A/B" into a map title** ("המפה · דאטום A", "מפת היעד · דאטום B"). One tag shape names every datum in the card.
- **A short gap (17 m) has no line.** The two markers are too close for one: the number sits beside the diamond, on the side away from the target, and the legend leaves the line out.
- **Height.** The 1344-px reference is now 1053 / 1077 (with the legend) / 1081 (case 2 after a check), up from 1033. `FitScreen name="datum-field"` in `CoordinatesScene.tsx` still says 1033, because another session is editing that file. Both values are clamped to 1000, so nothing changes.

## 2026-10-26 — Topic-02 contours, screen 1 (3D mountain + linked map): copy cleanup (task 23)

- **Scope:** only screen 1 of `#scene-contours` (`ContoursScene.tsx` above the density fit). `ContourCake3D.tsx`, the density section and its fit/wiring were not touched.
- **One home per message:** the SceneHeader intro keeps only the definition (contour = equal height; describes relief on a flat map). The slicing idea lives in the "פריסה לשכבות" caption, and the 10 m interval in the "הר שלם" caption and the legend. Each view has one caption (what it shows) and one action line (what to do in that view), so the duplicated "גררו שכבה…" instruction is gone.
- **Pan hint dropped:** "גררו בלחצן הימני להזזה" was removed from the action lines to keep them short. Panning still works, and re-clicking a view button re-frames.
- **No "בדיוק" in the top-view caption:** the 3D top view is a perspective camera, so the higher rings look slightly larger than on the orthographic map. The caption says the lines "look like" the map's.
- **Map column title** "מבט מלמעלה · קווי הגובה במפה" became "מפת קווי גובה", because it shared its name with view button 3. The model column title is now just "מודל תלת־ממדי".
- **Live link line (`LayerLink`)** replaces the static "העבירו את הסמן על המפה…" line in the same slot. Idle, it says hovering either side lights the layer in both. Lit, it names the layer ("השכבה שבין 30 ל־40 מ׳") and states that its lower boundary is the orange contour ("הגבול התחתון שלה הוא קו הגובה 30"). This matches the existing highlight: map band i spans line i → i+1 with line i orange, and model slice i sits on line i. A short orange line glyph marks it. The text stays `text-fg`, not orange, for contrast. No `aria-live`: it changes on every hover.
- QA: `scripts/qa/shot-contours-model.mjs` (all views, map→model and model→map, drag, link-line text) and `scripts/qa/shot-contours-model-loader.mjs` (GLB held via `page.route`). Shots are in `design/screenshots/contours-model-{before,after}/`.

## 2026-10-26 — Topic 02 base-60 calculator docked in the work area

- **Placement (completes the change deferred on 2026-10-13):** the floating calculator (fixed to the viewport's bottom-left, outside the card) is replaced by a docked one inside the activity's card, in its own row under the number track and its note. The toggle sits at the row's inline start (visual right, by the steps column). The calculator opens beside it as one low strip: display at inline start, keypad at inline end. The floating panel covered the track note and the D/DM/DMS/S writings at 1440 × 1122; the dock covers nothing.
- **Why this spot:** the empty areas inside the track itself are too small for the calculator (top right ≈ 190 × 310 px), or the final writing row fills them at the end (bottom left). Under the track the calculator is next to the work it serves: the track's numbers and the answer's field are above it, the active step and its feedback to its right. In practice mode the steps column is already 100–220 px taller than the track column, so the dock mostly uses existing free space.
- **No jump above it:** opening or closing never moves the steps, the track or its note (QA asserts this). Only the band below can move down. The open card is a constant 1286 reference px in every state, which is the existing tallest state (three hints shown). At 1440 × 1122 that is 1007 screen px, so the whole card fits under the site header with the calculator open. The band moves 133 screen px in the guided opening and ≈ 94 px in practice before feedback. It does not move when the step's feedback is already showing.
- **Keypad 5 × 4 instead of 4 × 5**, so the strip stays low (184 px of keys). Same keys and same behaviour (`calc.ts` unchanged). The bottom row keeps the old order `0 . ⌫ … =`, with `+` inserted.
- **Open, the toggle is the close button:** its icon becomes ✕, and it takes the pressed tone. The panel's separate ✕ was dropped, because the toggle sits at the strip's corner. Escape still closes and returns focus to the toggle. The panel is `role="group"` (labelled "מחשבון") rather than `dialog`, since it is in the page flow and not an overlay.
- **Keyboard:** in DOM order the dock comes right after the track. From the answer's field, Tab reaches the toggle, then the calculator's line. From the line, Shift+Tab twice returns to the field. No result-to-field copy was added: the learner still types the answer.
- **Kept as is:** the calculator keeps its open state and its expression through steps, axis switches, the end of the track and איפוס. That is the existing behaviour, and the calculator is the learner's own tool.
- **Header row:** with the toggle moved, the row above the track holds only the axis switch at inline end, as in the mockup (`02-number-workbench.png`). The closed guided opening is 42 px taller than before (1116 vs 1074 reference px), because the toggle now has its own row.
- **Shell:** `CoordinatesPart2Scene` fits the screen as `min(height, 704)`, so the larger card needs no fit change. To keep the `height` note accurate, the base60 screen's 1920 × 1080 opening height is now 1116 (was 1074).
- QA: `scripts/qa/shot-base60-workbench.mjs`, calculator block, screenshots 13–19 in `design/screenshots/base60-workbench/`. Before/after pairs are in `design/screenshots/base60-calculator/`.

## 2026-10-26 — Topic 02 datum: ellipsoid vs datum, and how datums differ (tasks 14–15)

Brief: the user's message (tasks 14–15). Goal: a beginner can explain what the datum adds to the choice of an ellipsoid, and tell the reference body from how it is anchored to the Earth. Files: `topic-02/datum/` (`DatumGuided`, `datumDemo`, `DatumGlobe3D`, `DatumInset3D`, `DatumSection`, `datumOverlays`) and the block's QA scripts (`datum-guided.test.mjs`, `datum-copy-check.mjs`, `shot-datum.mjs`). `CoordinatesScene.tsx` and `datum-field/` (task 16, another session) were not touched. `datumGeometry` is unchanged; its tests still pin `fitError`, `bestFit`, `START`, `RANGE` and `DISPLAY_K`.

**Screen card.** Lesson 2 ← קואורדינטות 1 ← the datum screen, after "אליפסואיד, גיאואיד וגליות" and before the datum-mismatch activity.
- **Goal:** the learner can say what changed between two datums: the ellipsoid, the anchoring, or both.
- **Message:** a datum = reference body (ellipsoid: size and shape) + anchoring (where its centre is, where its axes point).
- **Action:** pick an anchoring, a datum and a check point, then answer three "what changed?" pairs.
- **Boundary:** no coordinate-mismatch practice (task 16), and no geoid/undulation tabs (the previous screen).

**Stations (the same accordion, globe and white card):**
1. **"אותו אליפסואיד, עיגון אחר"** — `עיגון א׳` = geocentric (0, 0, 0°, ×1) / `עיגון ב׳` = (−18, 16, 10°, ×1), the same size.
   - The globe marks the Earth's centre and rotation axis (ink, fixed), the ellipsoid's own centre and axes (orange, they move), and the other anchoring as a dashed outline. A legend sits upper left, under the surface label.
   - Once B has been seen, the feedback adds the takeaway rows: "גוף הייחוס: אותו אליפסואיד" / "העיגון: שונה" / "אותו אליפסואיד בעיגון אחר הוא דאטום אחר."
2. **"דאטום עולמי ומקומי"** — the global datum is geocentric (0, 0, 0°, ×1). The local datum keeps the same ellipsoid, so only the anchoring differs: (22, −4, −6°, ×1). It is the best shift over the marked arc with the turn held at −6°; left free, the fit turned the body by −36°, which read as a tilted Earth.
   - The marked region shows in both datums, because the check points refer to it.
   - Check points: inside t = −0.8, outside t = 0.6 (both on the open wall). Gaps in section units, inside / outside: global 22.9 / 5.0, local 2.4 / 14.4. The feedback words come from these numbers, as before ("יש פער…", not "נשאר", since the gap can grow).
   - The close-up shows only here.
3. **"בדיקה: מה השתנה?"** — datum A is always the global datum (dashed); datum B changes:
   - the anchoring only: (20, −16, 12°, ×1);
   - the ellipsoid only: (0, 0, 0°, ×1.08), larger;
   - both: (−20, 12, −12°, ×0.88), smaller. One larger and one smaller, so that "another ellipsoid" never reads as "a smaller one".

   Each pair opens on datum A and moves to B (1.1 s; instant under reduced motion). "הצגת המעבר שוב" replays it.
   - A wrong answer says why and points at the mark to look at, without naming the answer, and can be changed.
   - A right answer locks and opens "לזוג הבא".
   - The end states the takeaway: "דאטומים יכולים להיבדל באליפסואיד, בעיגון או בשניהם." "מההתחלה" clears it. No score.

**Shortened or moved:**
- **Removed:** the shift → rotate → scale demo, its stepper, the four-slider experiment ("נסו בעצמכם", "איפוס", "הצגת התאמה") and the surface picker.
  - A visual fit to the geoid is the reason an anchoring is chosen, not what defines a datum.
  - The demo's scale phase resized the ellipsoid, which belongs to the ellipsoid, not to its anchoring.
  - The surface picker repeated the previous screen.
- **The two parameter cards → one closed card, "הרחבה: המרת קואורדינטות בין דאטומים"** (`FitScreen datum-conversion`, 244). It covers:
  - conversion is a separate operation from the datum;
  - the seven parameters, where scale "אינו משנה את האליפסואיד";
  - a and f enter when the ellipsoids differ;
  - the difference is not only a shift (local network distortions, correction grids);
  - anchoring is realised by an origin point (old local datums) or a station network (modern datums).
- **Title** "דאטום: התאמת האליפסואיד לכדור הארץ" → "דאטום: אליפסואיד ועיגון". The lead uses the course's definition (as in קואורדינטות 2 TERMS): "מגדיר את גוף הייחוס ואת עיגונו ביחס לכדור הארץ".

**Accuracy (fact-check and Hebrew review, both report-only):**
- A local datum is described by its origin ("מעוגן לנקודת מוצא באזור אחד, כך שהאליפסואיד מתאים היטב לגיאואיד שם"), not by the fit alone.
- The global datum is centred on the Earth's centre of mass.
- Exaggeration is stated in stations 2 and 3. Real centre offsets: "לרוב עד כמה מאות מטרים, לעומת רדיוס של כ־6,400 ק״מ". The reviewer recalled about 180 m for ED50, 700 m for OSGB36 and 850 m for Tokyo, from memory; not re-fetched.
- Dropped as overgeneral: "כך נבדלים לרוב דאטום מקומי ותיק ודאטום עולמי". Modern regional datums share GRS80 and differ mainly in anchoring.
- **Open:** the 14-parameter (epoch-dependent) Helmert and the stated accuracy of a transformation are not mentioned. They are left out as advanced; add them to the הרחבה if the course wants them.

**Layout:**
- Each station's feedback slot holds its tallest state (station 1: 200 px with the takeaway; station 3: 176 px), so no answer resizes the card, the stage or the globe.
- Card heights at 1344 px: station 1 778, station 2 886, station 3 927. `FitScreen datum` 818 → 927, and `fitTallerStates` was dropped (no taller optional state remains).
- At 1440 × 1122 the scale stays 0.783. At 1366 × 768 the tallest station ends at y = 759; at 1920 × 1080, at y = 1011 (scale 1).
- The legend appears with the first 3-D frame. Without WebGL it sits at the bottom, beside the close-up.
- 3-D: `Guides` now draws the reference marks. `region` replaces `mode` in the globe and the close-up. The drag handle of the removed experiment is gone, and so are the unused "geoid" / "ellipsoid" looks; "surface" stays for the fallback capture.

**Verification:**
- The shared :3000/:3001 servers kept full-reloading while other sessions saved files. QA therefore ran on an isolated worktree (`.claude/worktrees/datum-tasks-14-15`: HEAD + the 9 files above, `node_modules` junction, `NEXT_DIST_DIR=.next-datum1415`, :3071).
- `datum-guided.test.mjs` 21/21. `datum-copy-check.mjs` passes: every removed original sentence is listed with this reason.
- `QA_BASE=http://localhost:3071 node scripts/qa/shot-datum.mjs` passes 94 checks. It covers every station, choice and feedback, keyboard, the card height per station, no GPU allocation while the ellipsoid moves, the loader (textures held with `page.route`), reduced motion and no WebGL.
- `tsc --noEmit`: no errors in these files. `next build` (in the worktree) passes.
- Screenshots: `design/screenshots/datum-guided/tasks-14-15/` (before: `before/`).

## 2026-10-26 — Topic 02 "אטלס הפלחים", task 20: practice that asks before it tells (user request)

Brief: the user's pasted message of 2026-10-26 (UTM atlas only; continue from the 2026-10-19 focus pass, no rebuild). Code: `utm-atlas/UtmZoneAtlas.tsx`, `AtlasMap.tsx`, `atlasControls.tsx`; `CoordinatesPart2Scene.tsx` and shared components untouched. QA: `scripts/qa/shot-utm-atlas.mjs` (150 checks; its stale lead selector fixed), `scripts/qa/utm-atlas.test.mjs` unchanged (14/14). Screenshots: `design/screenshots/utm-atlas-2026-10-26/` (`before-*` = the 2026-10-19 state).

- **Kept as it was (already right):** the two views and their layout, one point across both maps and both views (switching keeps it), the zones card (zone + hemisphere only), the metres card (E, N, then zone / hemisphere / WGS84), coverage and exceptions in "מידע נוסף", the locator caption, the explainer.
- **Exploration, added:** the leading world map names "צפוני N" / "דרומי S" beside the equator at its east edge, the point's side in the accent chip, so the hemisphere is read on the map, not only in the card; the enlargement names the equator when it is in view; the enlargement's frame takes the locator box's orange while the connectors are drawn, and the caption ends "המסגרת הכתומה מוגדלת בתקריב"; the crossed boundary is named once (its label above the frame, underlined) — the duplicate "גבול …" chip inside the map was removed. Instruction: "לחצו במפה או גררו את A. הפלח שלה מודגש, וחצי הכדור מסומן ליד קו המשווה."
- **What gave answers away before (fixed):** Greenwich — the enlargement labelled 29 / 30 / 31 beside "גריניץ׳ 0°", and a choice tinted its zone and moved the enlargement to it before the check; transfer — the task gave "35.68°N" (the hemisphere letter), a map click picked the zone under the pointer and showed its number in the row (clicking B answered), and one wrong check stated the boundary ("מזרחית לגבול 138°E") and the hemisphere outright.
- **Before a check now:** pin, boundary longitudes above the enlargement, the 1 / 15 / 30 / 45 / 60 anchors on the world map, the equator and which side is N / S, Greenwich in task 1 — no zone numbers in the enlargement, no tint for the current choice, no map picking (maps are information only in practice), the task data "נקודה B · טוקיו · קו אורך 139.69°E" beside the controls (assumption: the hemisphere is read from the pin against the equator; the latitude appears after the check; screen-reader descriptions carry the full coordinates, the equivalent of the pin). The row opens on 28–32 for Greenwich (the answer is not the middle button) and on 29–33 for the new points (their zones are paged to).
- **Choice vs verified result:** the controls hold the choice; the maps and the feedback follow the LAST CHECK. ✓ / ✕ sit on the checked button / hemisphere only, and drop when the choice changes; a wrong zone is drawn in the pick tone (dark outline, its number above the world map and in the enlargement); the answer is drawn in the accent tone only once verified or shown. A part checked right locks (✓); "בדיקת הבחירה" is dimmed (`aria-disabled`, focus kept) until the choice differs from the one just checked.
- **Hints, per wrong part:** 1 — what to check: the checked zone's own span ("פלח 53 משתרע מ־132°E עד 138°E, ו־B אינה בתחום הזה…"), for 30 "גריניץ׳ הוא גבולו המזרחי"; the hemisphere rule with the equator highlighted, without saying which side. 2 — where and how to count: B's two boundaries marked on both maps without the number + "מספרי הפלחים עולים ב־1 בכל 6° מזרחה, ופלח 31 מתחיל בגריניץ׳ (0°)" (task 1 becomes the anchor of tasks 2–4); for Greenwich 0°–6°E marked; for the hemisphere, the side. After two failed checks "הצגת התשובה" (secondary) is offered — assumption: on request rather than automatic, so a learner may keep trying. Right: why the zone and the hemisphere fit the point, then its E / N in that zone (WGS84). Shown: "התשובה: …" in the info tone, the learner's last choice stays theirs with ✕.
- **End and reset:** the end card counts tasks solved without the answer; "תרגול מחדש" and re-entering practice start clean (no choice, verdict, hint or mark).
- **Open:** in practice the feedback still pushes the small enlargement down (≈ 40–135 px at 1440, as in the 2026-10-19 version); the card stays inside 1440 × 1122 (tallest state 96–919 px). No shell change needed: `FitScreen name="utm-atlas"` is ignored inside `LessonFitUniform`.

## 2026-10-26 — Topic 02 "אטלס הפלחים": the practice is done on the map (user request, second pass)

Brief: the user's pasted message of 2026-10-26, later the same day. The learner should find and understand the zone and the hemisphere through the map. The morning's practice relied on a row of zone-number buttons and counting from the longitude, and the map was inactive. Scope: the utm-atlas activity and its tests only. The lesson shell and other activities are untouched.

Code: `utm-atlas/UtmZoneAtlas.tsx`, `AtlasMap.tsx`, `atlasControls.tsx`, and `utmAtlas.ts` (new `cellAt`, `cellOutline`).

QA:
- `scripts/qa/shot-utm-atlas.mjs`: the practice section is rewritten. The label rows above the frames are now part of the overlap check, and the screen-reader verdict locator is scoped to the atlas, since another activity on the page now also uses `data-verdict`.
- `scripts/qa/utm-atlas.test.mjs`: two new tests, 16/16 pass.
- Screenshots: `design/screenshots/utm-atlas-map-practice-2026-10-26/`. The "before" images are `utm-atlas-2026-10-26/14–25`.

**How the choice works**
- **Choosing on the map.** A click or drag on either map chooses the zone under the pointer and the click's side of the equator. Together they form one cell, for example "54N".
  - Assumption: one click sets both parts. The hemisphere letter is exactly the side of the equator, and the chosen half of the strip is drawn, so the hemisphere reads as a place on the map, not a toggle.
  - A part already checked right stays as it is, and a click then changes only the other part.
  - Greenwich has no hemisphere part.
  - Clicking the pin chooses the point's own cell, read at the pin's tip (as in exploration).
- **What it replaced.** The zone-number row with five-zone paging, and the N/S switch. `ZoneRow` and the `Segmented` verdict/locked props had no other users and were removed.
- **The card.** It reads the choice back in the zones card's own cells: "הפלח שבחרתם" and "חצי הכדור שבחרתם", showing "—" until something is chosen. ✓ / ✕ appear on a cell only after a check.

**What the map shows** (this reverses the morning pass)
- Zone numbers stay in the enlargement before a check. The user asked: "אפשר לקרוא ולהבין את גבולות הפלחים ואת מספריהם במפה".
- Boundary longitudes stay above the enlargement.
- N / S labels sit beside the equator on the world map. They also appear in the enlargement when the equator is in view (Nairobi), and "קו המשווה" then moves to the enlargement's west edge.
- In the Greenwich task, which asks for the western boundary, the enlargement's edges are labelled "מערב" / "מזרח".
- The task line gives the place only ("נקודה B · טוקיו"). The coordinates appear in the right and shown feedback, and in the screen-reader descriptions.

**Tones**
- The learner's choice: a dark tint with a solid dark edge, on both maps. Zone boundaries are dashed and the answer is orange, so the three never look alike. The chosen zone's number chip and hemisphere chip get a dark border.
- Hover: a light dashed outline shows what a click would choose.
- Verified or shown: the accent tone. A verified cell is drawn as a half strip (54N).
- Once the answer is shown, a different last choice stays drawn as the learner's own.
- Above the world map, a choice within two zones of the shown answer keeps its number only in the enlargement and the card, so the two labels don't collide.

**Keyboard**
- In practice the world map frame takes focus (`role="application"`, with the same focus ring as DatumFieldChallenge's map).
- ← / → move to the zone to the west / east, in map order and never mirrored. ↑ / ↓ choose the northern / southern hemisphere.
- With nothing chosen yet, → starts at the zone on the enlargement's west edge and ← at its east edge, never at the point.
- Each choice is announced with the zone's longitudes ("בחרתם: פלח 53, בין 132°E ל־138°E, חצי הכדור הצפוני."). A locked part says so.
- Tab then reaches "בדיקת הבחירה".

**Hints point at the map**
- Zone, hint 1: the checked zone's boundaries, plus "בתקריב, בדקו בין אילו שני קווים מקווקווים נמצאת הסיכה B".
- Zone, hint 2: the point's two boundaries marked in orange on both maps, plus "קראו בתקריב את המספר שבראש הרצועה שביניהם". The number itself is never given.
- Hemisphere, hint 1: the equator highlighted, plus "בדקו במפה: B מעל הקו המודגש או מתחתיו?".
- Hemisphere, hint 2: "במפה הסיכה … נמצאת מעל / מתחת לקו המשווה, כלומר מצפון / מדרום לו".
- Greenwich: choosing 30 says Greenwich is its eastern edge, and that a western edge is the strip's left side on the map. Hint 2 points to the strip whose left line is Greenwich, with 0° marked.

**Right feedback**
It links the point, the zone's boundaries and the equator: "נכון: 54N. B ב־139.69°E, בין 138°E ל־144°E, שהם גבולות פלח 54, וב־35.68°N, מצפון לקו המשווה, ולכן בחצי הכדור הצפוני." The point's E / N in that zone (WGS84) follow.

**Layout**
The feedback moved from above the small enlargement to below it, in the same column. The maps, the choice and the buttons now never move during a task, which closes the morning pass's open point. The tallest state (Tokyo, two hints) spans 96 to ≈ 870 px at 1440 × 1122.

**Kept from the morning pass**
- Both exploration views.
- The order choose → check → "הצגת התשובה" (after two failed checks) → next.
- Locking a part checked right, and refusing to re-check the same choice.
- The end count, "תרגול מחדש", and returning to exploration with the point kept.

**Open**
- The pin makes "click the point" a working strategy. What the learner gains then rests on reading the choice back (its number and side) and on the right feedback. A harder step, such as a point given only by its coordinates, would be a new task type.
- At 1440 × 1122 the lesson's uniform fit scales everything by 0.78 (shell, `LessonFitUniform`). The 13 px map labels then render at ≈ 10 px and the 16 px body text at ≈ 12.5 px. This belongs to the shell, not this activity.
- Three `next dev` servers (3000, 3001, 3091) run from the same `.next`. Pages reload on their own now and then, so a long QA run may need a retry.

## 2026-10-26 — Topic 02 "כיצד מפרשים קואורדינטות?": a decomposed reading instead of the comparison table (task 22)

New component `src/components/lessons/topic-02/reading-coordinates/` (`ReadingCoordinates.tsx`, copy and logic in `readingModel.ts`). **Not wired:** `CoordinatesPart2Scene.tsx` belongs to another run. The swap is described in `design/docs/reading-coordinates-wiring-2026-10-26.md`. Until then, the lesson still shows `ReadingCoordinatesBlock`.

**Content:**
- The example is point A (the bridge) of the reference-systems map. The screen uses `READINGS.A` from `reference-systems/`, so its numbers always match the map: `31° 48′ 27.98″ N, 35° 07′ 28.83″ E` and `36N E 701125 N 3521095`, WGS84. The terrain is illustrated, with a synthetic registration in zone 36N; it is not a real place (see `referenceSystems.data.ts`).
- **Order.** Each example states its own order ("בדוגמה הזאת…") and tells the reader to identify values by their direction letter or label. No order is called a convention. The deck's own notation `(90E,30S)` (longitude first) is used in check question 1.
- The UTM reading writes E and N as labels before the numbers. The hemisphere N after the zone number is explained as a different N from the northing axis; check question 2 tests exactly this.
- **Units.** Metres are not written in a UTM reading. The key shows them as a dashed "מ׳" chip, meaning "implied by the system".
- **E and N.** E is described against the zone's middle line (E = 500000), as the UTM atlas teaches. N is described as the distance from the equator in the northern hemisphere. The southern 10000000 m appears only in the check's explanations.
- **Datum.** For a UTM message, the datum is counted as missing information, together with the zone and the hemisphere. This matches the atlas's closing line "הפלח, חצי הכדור והדאטום".
- The datum and the reference system get one short note, plus a pointer to the datum activity in קואורדינטות 1. That activity is not repeated here.
- **Left out on purpose:**
  - The definition of "היטל". It stays in the projections screen and in `Part2Summary`.
  - The table row "כיסוי ופלחים". UTM's 60 zones are in the zone row of the key, and the geographic system's global coverage is in GeoProsCons ("גלובלית").
  - "רוחב ואורך אינם היטל למישור". **Open:** add it back if the course wants this point on this screen.

**Interaction:**
- Each key row opens with the exact glyphs it explains. Hover, focus or a press on a row marks those glyphs in the written reading: orange tint and underline, while the rest fades to 40 %. A press keeps the mark. The WGS84 chip in the note marks the datum in both captions. Orange ties a part to its explanation, as it ties the selected point to its readings on the map screen before.
- **Check:** three questions, one at a time. A wrong answer gets an explanation first. Wrong picks get ✕, and the hints for options left out do not name them. "הצגת הפתרון" appears only after a check. Any new pick clears the verdict. After a right answer or a revealed solution, the options lock and "לשאלה הבאה" takes focus.
- The feedback sits beside the options, in a slot that explains the flow before the first answer. The card's height therefore stays the same in every state.

**Layout:**
- One white card for the whole screen. Geographic is at inline start (right) and UTM at inline end, in the maps' order on the screen before.
- Controls reuse `utm-atlas/atlasControls`: CHOICE, choiceTone, Feedback, HEADING, LABEL, BODY and VALUE. No new tokens, colours or fonts.
- The card is 1294 px tall at the 1344 px reference. At 1440 × 1122 in the lesson (scale 0.7827), it runs from y = 96 to y = 1108.

**Verification:**
- Unit tests: `scripts/qa/reading-coordinates.test.mjs`, 9/9.
- Browser QA: `scripts/qa/shot-reading-coordinates.mjs`, 13 shots. It covers layout and fit, RTL, the order of the LTR glyphs, every row's marks, press and release, the datum chip, keyboard (RTL arrows, focus ring, focus moved to the way forward), the full check flow, reduced motion, text of at least 16 px, and the console.
- It ran on the standalone page `/lab/reading-coordinates/` ("isolated") and on the lesson route in a worktree wired as in the wiring doc ("sandbox-lesson"). Both passed.
- Screenshots: `design/screenshots/reading-coordinates-2026-10-26/`.

## 2026-10-26 — "אליפסואיד, גיאואיד וגליות" (task 13, lesson 2): one link, readable heights at A, the reveal, actions beside controls, task feedback

Brief: the user's message of 2026-10-26, continuing the 2026-10-19 polish (its three open items are closed here). Files: `CoordinatesScene.tsx` (the `ReferenceBodies` block only), `MeasurementSection.tsx`, `MeasurementPanel.tsx`, `MeasurementIllustration.tsx`, `StageControls.tsx`, `measurementMission.ts`, `referenceBodiesStyle.ts`, one constant in `MeasurementLandscapeRenders.tsx`; QA `shot-measurement-mission.mjs`, `measurement-mission.test.mjs`, two label regexes in `measurement-round6.mjs` / `shot-measurement-heights.mjs`. Screenshots: `design/screenshots/geoid-undulation-2026-10-26/{before,after}/`.

- **Same station, same numbers everywhere.** In the task each arrow in the section carries a chip with the station's value — `h = 148`, `N = +28`, `H = ?` (→ `H = 120` once solved) — the activity's existing `DiagramChip` (the ellipsoid's a/f labels). The readings are headed "נתוני תחנה B" with the pin's orange letter, and the question names the station ("מהו הגובה מעל פני הים בתחנה B?"). A pick updates buttons, model pin, receiver, section and readings in the same frame (QA: within 100 ms).
- **Assumption: no units in the section's chips.** With "מ׳" the N chip at B covered station A's pin. The units stay in the readings, the answer field and the section's screen-reader description.
- **Station A: a close-up, not a different scale.** When any height arrow at the picked station is shorter than 16 px, or the geoid and ellipsoid lines are closer than that (so it is unclear which one an arrow starts from), the section opens a close-up. It is the framed stretch of the same drawing, an exact whole number of times larger in both directions ("תחנה A · תקריב פי 3"), so H, h and N keep their proportions. It uses the ellipsoid view's enlargement style: an orange frame round the station, dashed corners up to the box. The box sits at the section's top end, clear of B's pin and the ground (QA). Lines keep the section's stroke widths. Only A triggers it, in the task and in the geoid view after the reveal (H alone, no numbers). The main section still draws A's small arrows inside the frame; their labels move into the close-up.
- **The geoid view's reveal is one step that shows H in both figures.** Before the reveal the section draws the geoid and the quiet ellipsoid but no H, and the model none. After it, the model's H and the section's H (and A's close-up) fade in together after the geoid has swept in (`REVEAL_H_DELAY` 1 s, shared). "החזרת פני השטח" hides both at once. Reduced motion: at once.
- **One instruction beside its control (`ActionLine`).** The model caption's name "מודל תלת־ממדי" is replaced by the view's current instruction, followed by an orange arrow and the control it names. Surface: "בחרו תחנה והשוו בין המודל לחתך" + A/B/C. Ellipsoid: "בחנו את הפחיסות בקטבים" + מהצד/מלמעלה. Geoid: "לחצו כדי לראות מאיזה משטח נמדד H" + the reveal; after it, "בחרו תחנה וראו את H" + A/B/C. Task: "בחרו תחנה" + A/B/C, and in the panel "הציבו את נתוני תחנה B בנוסחה, וכתבו את H במטרים." Secondary controls ("מבט התחלתי", "החזרת פני השטח") sit at the caption's end. The instruction sentences left the view paragraphs. The paragraphs are otherwise unchanged, including the agreed geoid definition that `measurement-round6.mjs` checks. The card lead now states the goal and order.
- **Assumption: removed control.** In the geoid view before the reveal the station buttons are not shown, so the only control beside the instruction is the reveal. Pins on the model and the section still pick. After the reveal the toggle moves to the caption's end and keyboard focus follows it.
- **Feedback explains and fixes; never gives H.** New verdicts in `measurementMission.ts`: `reversed` (N − h) and `gave-n` (±N), besides `gave-h` and `added-n`. Every wrong answer says what was done instead and gives the station's numbers put into H = h − N (`substitution()`: "H = 148 − 28", "H = 18 − (−12)"), left to work out. At A, h + N (= 18 − 12) is explained by the sign: N is negative, the geoid is below the ellipsoid, so H is greater than h. A right answer shows the worked sum and what the sign of N did ("N חיובי, ולכן H קטן מ־h"; N = 0 → H = h). The N reading states its meaning with the number ("שלילי: הגיאואיד 12 מ׳ מתחת לאליפסואיד"). The formula, data and checking are unchanged.
- **Heights.** 1440 × 1122: card 513 / 538 / 559 / 705 px (surface / ellipsoid / geoid / task); the task is the same as before. 1920 × 1080: screen ≤ 868 px (`FitScreen` 917 unchanged).
- **Verified:** `measurement-mission.test.mjs` 28/28 (new verdict and substitution cases); `shot-measurement-mission.mjs` PASS on an isolated worktree server and on the shared :3000; `shot-measurement-heights.mjs` fits at 1122 / 900 / 800 in every state; `tsc` clean for these files; `next build` (static export) passes in the worktree.
- **Pre-existing, not changed:** `measurement-round6.mjs` fails only "surface: the model (197 px) and the section (156 px) differ in height", with identical numbers on plain HEAD. `shot-measurement-heights.mjs` reports the task card not fitting at 1920 × 855 (901 px), also identical on HEAD.

## 2026-10-26 — Topic 02 "מערכות ייחוס", task 21: the method switch shows what stays and what changes; spacing (user request)

Brief: the user's pasted message of 2026-10-26 (this activity only). Code: `ReferenceSystemsLinkedComparison.tsx`; `reference-systems/` data and geometry untouched (task 22 reads `READINGS` from it); `CoordinatesPart2Scene.tsx` (lead, `FitScreen`) untouched. QA: `scripts/qa/shot-reference-systems.mjs` (switch filmed frame by frame), screenshots `design/screenshots/reference-systems-2026-10-12/r5-*`.

- **What stays is never animated:** terrain and crop, the pins, the chosen point's anchor ring and feature outline, north arrow, scale bar, and the panel's name "A · גשר". Measured in every painted frame of a switch: map box, pin tip and name do not move.
- **What changes, one sequence:** the grid with its frame labels, the point's two lines, the frame values and the panel's reading fade out together (160 ms); the shown method swaps once, at 120 ms — before the fade ends, so framer's end-of-fade hand-off cannot flash the old layers; the new grid fades in, the point's two lines grow out of the unmoved point to the frame (clip reveal, 280 ms), and the frame values, the panel's numbers, the bar marks and the change sentence appear together from 160 ms after the swap. A pick replays the second half for the new point (the bar marks slide; that slide is the size of the change in seconds).
- **No in-between numbers:** values are swapped whole, never counted or cross-faded; each reading enters as one unit (all four DMS groups and the bar's "31° 48′" together) — a part such as "31° 48′ N" alone would be another place. Quick switching: each new click restarts the out phase; the swap goes to the last choice only (QA: five clicks 40 ms apart → shown geo → utm, no mixed frame).
- **Reduced motion:** the final state at once (no out phase, no reveal, no delay, bar marks jump). The still map and name, and the lead's "אותו מקום…", carry "the same point" without motion. A screen-reader line announces a switch: "שיטה UTM. נקודה B, רכס, נשארת במקומה."
- **Panel = the same slots in both methods:** name → reading box (white, bordered: geo ϕ/λ with bars, UTM E/N + zone) → "השינוי … ביחס לגשר" box → general explanation. Geo's box title is new: "השינוי בקריאה ביחס לגשר" (parallel to UTM's "השינוי ברשת ביחס לגשר"). Its sentence keeps two lines so a pick never resizes the panel.
- **Copy shortened:** A's geo sentence lost its instruction ("בחרו ברכס או ביישוב…", the lead already says it) and now parallels UTM: "הגשר הוא נקודת ההשוואה: אין שינוי ברוחב או באורך."; B/C lost "כאן השינוי מופיע ברכיב השניות." (the note under the readings says it once).
- **Spacing (assumption: start-aligned rows):** both control rows are labelled ("שיטה:" / "נקודה:"), set to the map's start (right) edge, 16 px (reference) from the map on each side; method buttons now h-11 like the point buttons. The panel starts level with the method row; in geographic it runs to the point row's foot, in UTM it is as tall as its content (no half-empty box). Card, method row, map and point row are identical in all six states, so screen 2 no longer moves on a switch (round 4's open point). At 1440 × 1122, heading 16 px under the header, the card ends at ≈ 829 px.
- **Open:** the lead (scene file, not this task) still says where the controls are ("בחרו שיטה מעל המפה, ובחרו נקודה במפה או בכפתורים שמתחתיה") although the rows are now labelled; a shorter lead is proposed in the task report.

## 2026-10-26 — Topic 02 "היטלים: מכדור למפה" polish and the geographic system's pros / cons (tasks 17, 19)

Brief: the user's pasted message of 2026-10-26 (tasks 17 and 19 only; tasks 13–16, the calculator and UTM run in parallel and were not touched). Code: `projections/` (`projectionsModel.ts`, `ProjectionsLab.tsx`, `ProjectionMap.tsx`, `ProjectionStage3D.tsx`, `ProjectionStageFlat.tsx`, `earthRaster.ts` cache key), new `GeoProsCons.tsx`, and in `CoordinatesPart2Scene.tsx` only the pros / cons block (moved out) and the two `FitScreen` heights. Tests: `scripts/qa/projections-lab.test.mjs` (22), `scripts/qa/shot-projections-lab.mjs` (WebGL, `QA_NOGL`, `QA_REDUCED`), new `scripts/qa/shot-geo-pros-cons.mjs`. Screenshots: `design/screenshots/projections-lab-2026-10-26/`, `design/screenshots/geo-pros-cons-2026-10-26/`.

**Task 17 — the projections lab**
- **Distortion made visible (was missing).** The sample parallel and point (31.8°N 35.2°E) are replaced by three equal circles (after Tissot), radius 8°, on 25°E at 20°, 45° and 70°N — the same three on the globe, on the sheet and on the map in every method, so a tab switch compares where each method keeps them true (20°N nearest the cylinder's equator, 45°N on the cone's contact, 70°N nearest the plane's pole). On the map each circle carries its size on the globe dashed (the UTM explainer's device) where the map stretches it ≥ 4 %. All three projections are equidistant along the meridians (scale 1), so every circle keeps its height and widens east–west by the parallel scale: cylinder ×1.06 / ×1.41 / ×2.92, cone ×1.08 / ×1.00 / ×1.17, plane ×1.30 / ×1.11 / ×1.02 (tested against the drawn circles to 3 %). Legend: "קו המגע / נקודת המגע", "עיגולים שווים על הכדור", "אותו עיגול בלי עיוות".
- **Surface → unrolling → map.** The map comes in as the surface unrolls (opacity 0.28 → 1, smoothstep of the progress); the circles appear on the sheet and the map once it is well open (from 45 %, whole at 85 %) — wrapped, the sheet's own circles would sit beside the globe's. An arrow between the two views points from the illustration to the map. The 3-D view's heading says "המחשה: משטח ההטלה"; the lead says that the projection is a mathematical calculation and the surface an illustration of the grid it makes and of where it distorts (as the UTM explainer does).
- **One idea and one action a phase** (`STEPS`): touching (start) → the cut-and-unroll, which does not stretch the surface — the distortion was made when the globe was carried onto it, so the step does not contradict content/topic-02.md's "אי אפשר לשטח… מבלי למתוח" (mid; the plane: nothing to unroll) → the distortion against the line / point of contact (end, "עברו לשיטה אחרת והשוו את העיגולים"). The cylinder's end gives the reason and the direction: on the cylinder every parallel is as long as the equator, so the circles stretch sideways (in Mercator, also cylindrical, they would grow both ways — the claim is about this example). Removed: the phase line under the slider (it repeated the slider's ends and the step; kept as the slider's `aria-valuetext`), `START_HINT` (merged into the action), the separate "רמז" button (its cue is now the first miss's feedback). "מבט התחלתי" left the controls row: it appears in the 3-D view's corner only after the view was turned (drag or arrow keys) and resets the turn only.
- **Comparing methods.** A tab switch keeps the progress (was reset to 0), so the same moment is compared across methods; "הדגמה חוזרת" or Home replays a method from the wrap.
- **Practice checks understanding before the answer.** Four tasks a round: all three methods and one again, never twice in a row, the repeat not always last — so the last task is never given by elimination (it was a permutation of three). One whole map a round; the rest are windows of the map (cylinder 20°W–70°E × 35°S–55°N, cone around 30°W–50°E × 30°–70°N, plane the pole ±50°) framed by a neat line, so the method is read from the grid — straight / arcs / closed circles — not recalled from the outline seen in the lab. Target maps draw the grid to be read (white under-stroke + ink). Feedback ladder: a first miss says what the chosen surface makes and where to look ("התבוננו בקווי הרוחב… ישרים, קשתות או מעגלים שלמים?") — never the target's grid or name (the old miss text described the target in the lab's own words for its surface); a second miss shows the answer, marks it, says why, and unrolls the answer's surface on the globe. The summary shows the three maps with their circles and contact, each with "עיוות קטן ליד …", and one line scoped to these examples ("בשלוש הדוגמאות כאן…"): a secant surface such as UTM's cylinder (k0 = 0.9996) is true on two lines, not at its centre. The maps' accessible names give each circle's stretch along its parallel against its meridian (on the cone and the plane the parallels are tilted at 25°E, so it is not "width / height" there).
- **Heights.** 1440 × 1122: the card is 784 px in every state (was 797). 1920 × 1080: 1002 px (`FitScreen` 1036 → 1002; inside `LessonFitUniform` the per-screen height is not used, so this only keeps the documented value true).
- **Fact-check** (read-only military-geo-editor pass, formulas recomputed): all numbers confirmed; six wording fixes taken — the summary line scoped, the accessible stretch wording, "זוג ערכים" without "אחד" (longitude is undefined at the poles), "לצדדים" on the cylinder, the mid step's "לא בפריסה", "רצועה מחצי הכדור הצפוני" for the cone map; "טריגונומטריה כדורית" (the standard term) instead of "גאומטריה כדורית". "שלוש שיטות ההטלה" stays: it is the deck's own term (slide 3).
- **Not changed:** the projections, sheets, camera, loading, fallbacks, colours and the 3-D globe; the three method names and the slider's ends.

**Task 19 — the geographic system's pros / cons**
- **Place.** Same place in the sequence — after the base-60 workbench (the units) and before UTM (the answer in metres) — as one card with the activity cards' envelope; nothing about it elsewhere in the part.
- **The deck's slogans said precisely** (deck ב׳ slide 12; content/topic-02.md "היטל קרטוגרפי"): "גלובלית" + "אינטואיטיבית" → one grid for the whole Earth, no zones (a pair of values — not "one pair": longitude is undefined at the poles and ±180° is one meridian), values read straight off the globe's lines (how far north / south of the equator, east / west of Greenwich); "יחידות זוויתיות ולא מטריות" → coordinates are angles, not metres; 1° of latitude ≈ 111 km everywhere, 1″ ≈ 31 m (ties to the base-60 screen); "פיזור לא אחיד" → a degree of longitude shrinks away from the equator because the meridians meet at the poles (the figure); "דורשת מתמטיקה גבוהה" → even the distance between two points needs spherical-trigonometry formulas ("טריגונומטריה כדורית"), not subtraction (on the ellipsoid those are themselves an approximation; not said, to keep the card focused). One bridging clause to UTM. The old green / red dots are gone (colour is not used for pro / con).
- **Figure.** An orthographic globe like the explorer's (20° above the equator, 30° grid offset 15°), the band between two meridians from the equator to the pole, the parallels 0°, 30°, 60° highlighted inside it, HTML chips with the WGS84 ground length of 1° of longitude: 111, 96, 56 km and 0 at the pole ("כל קווי האורך נפגשים"). The band is 30° wide so it can be seen; a caption says so — the segments keep the true ratio (cos φ). WGS84 values: a = 6378.137 km, e² = 0.00669438 → 111.32, 96.49, 55.80 km. Labels inside the dir="ltr" figure use inline physical offsets (the RTL plugin's logical utilities apply to both sides there).
- **Height.** 1920 × 1080: 636 px (`FitScreen` 216 → 636); 1440 × 1122: 498 px.

**Open / outside these tasks:** `base60` measures 1116 px at 1920 × 1080 against its `FitScreen` 1090 (the calculator run's screen). `reading-coordinates/ReadingCoordinates.tsx` (task 22) is still unwired; the swap is in `design/docs/reading-coordinates-wiring-2026-10-26.md` and was left to its owner.

## 2026-10-26 — Topic-02 contours, screen 1: keyboard access to the map ↔ model layers

- **Scope:** only `ContoursScene.tsx`, screen 1 (`ContoursAsMap`, `LayerLink`, new `MapKeys`). `ContourCake3D.tsx`, the density screen and the shared shell were not touched.
- **One tab stop, a slider.** The map frame is a single `role="slider"` (vertical, 0 = no layer lit, 1–5 = the bands from 10 m up). The 3D model gets no second stop: both views share `activeRing`, so one control lights the map band, its number, the model slice and its chip together. The card's tab order is now: full screen → three views → map (→ out to the density tabs).
- **Keyboard focus lights the lowest layer (10 m).** Focus therefore shows at once what the control does. ↑/↓ move one layer, and ↓ from 10 m clears (as the pointer does below the 10 m line). Home/End go to the 10 m / 50 m layer. Esc clears and keeps focus. With nothing lit, Esc is passed on (not swallowed). Tab/Shift+Tab leave normally and clear the highlight, like the pointer leaving.
- **Pointer focus is not keyboard focus.** A click on the map focuses it without the ring or the key line (`:focus-visible`), and the pointer keeps driving the highlight. A key press after a click switches to keyboard mode. Blur clears only the layer the keys lit, so a click that starts a slice drag in the model keeps its highlight.
- **Key line (`MapKeys`)** "↑ ↓ לשכבה גבוהה או נמוכה יותר · Esc לביטול ההדגשה" shows under the link line only while the map has keyboard focus. It uses the action-line style of the model column (`text-sm text-fg-muted`). The map column is shorter than the model column, so nothing moves and the card height is unchanged. Otherwise it is `sr-only`, and stays in the DOM as the slider's description (with the map's own `aria-label`). The slider's `aria-valuetext` is the same `layerText()` sentence the link line shows.
- **Ring:** the site's focus ring (`ring-2 ring-accent ring-offset-2 ring-offset-bg`). It is also applied from state, so it shows after a click-then-key, `rounded-md` to follow the map frame.
- QA: `scripts/qa/contours-map-keys.test.mjs` covers tab stops, focus, every key, the exit both ways, keys in all three views, mouse regression (hover both ways, click, rotate, slice drag + reset) and the 1440×1122 fit. Shots are in `design/screenshots/contours-map-keys/`.

## 2026-10-26 — Topic 02 task 22 wired: "כיצד מפרשים קואורדינטות?" in קואורדינטות 2 (and the task-21 lead)

Follows `design/docs/reading-coordinates-wiring-2026-10-26.md`. Supersedes the "Not wired" notes of the 2026-10-26 entries above.

- **Wired.** `CoordinatesPart2Scene.tsx`: `<FitScreen name="reading-coordinates" height={1294}><ReadingCoordinates /></FitScreen>`, right after the reference-systems map, before the summary. One heading (the card's `h3`). Removed: `ReadingCoordinatesBlock`, `SystemDifferences`, `TERMS`, `SYSTEM_DIFFERENCES`, `H3`, `LEAD`, the `cn` import and the old two-screen comment. Removed the unlinked review page `src/app/lab/reading-coordinates/` (it would ship in the static export).
- **Task-21 lead** (same file): "אותו מקום יכול להיכתב בשיטות קואורדינטות שונות. החליפו שיטה ובחרו נקודה: המקום נשאר, והרשת, היחידות והמספרים משתנים." Checked against the map: the switch is labelled "שיטה:", A stays on the bridge, the grid (graticule ↔ UTM grid), the units (° ′ ″ ↔ metres) and the numbers change. The map itself (`ReferenceSystemsLinkedComparison.tsx`) was not touched.
- **What the old screen held, and where it is now** (no duplicates):
  - units, lat/lon vs E/N + zone + hemisphere, 60 zones of 6° → the two decomposed examples (key rows);
  - "the whole Earth in one grid" → `GeoProsCons` (task 19);
  - the conclusion "same point, different numbers; you must know the reference system" → the task-21 lead + the note's reference-system sentence + `DONE_TEXT`;
  - datum (WGS84 in both, body + anchoring, see קואורדינטות 1) and reference system (datum, axes, units, in UTM also the projection) → the note "מה עוד צריך לדעת";
  - **"latitude and longitude are geographic coordinates, not a projection"** — it was only in the old definitions, nowhere else in the lesson. Added to the note, after "וב־UTM גם ההיטל…": "רוחב ואורך אינם היטל: הם זוויות על גוף הייחוס." (pinned by the unit test).
- **Copy for a learner on the site.** Q1 opened with "במצגת השיעור נכתבה נקודה כך" — the learner has no deck, and the globe shows lat / lon as separate values, never "(90E,30S)". Now: "במקור אחר נכתבה נקודה כך: (90E,30S)…", which also ties to the example's note ("יש מקורות ומכשירים שכותבים קודם את האורך").
- **Fit at 1440 × 1122, every state.** The wiring doc's 1294 missed the tallest feedback: Q3 with both wrong options and none of the right ones gives five notes, and the card ended at 1164 px. The added projection sentence also put the note on a third line. Copy tightened, nothing dropped:
  - note: the קואורדינטות 1 pointer folded into the datum sentence ("…מצביעים על מקום אחר, כמו בהדמיה שבקואורדינטות 1."), "את כל מה שצריך כדי לפרש את המספרים" → "את כל הדרוש לפירוש המספרים" — two lines;
  - Q3 "סדר המספרים" why → "כל מספר בהודעה מסומן במילה, מזרח או צפון, ולכן הסדר לא משנה." (one line);
  - Q3 hemisphere hint → "חסר פרט שקובע מאיפה נמדד ערך הצפון: בקו המשווה הוא 0 או 10000000 מ׳." (one line, still does not name the option).
  - Measured (scale 0.7827, card top 95.5): opening / Q1 / Q2 1108, Q3 worst 1103, Q3 solution 1088, done 1011. Tallest = 1294 at reference, the `FitScreen` value.
- **Assumption — number format.** The screen writes the reading as a written coordinate ("36N E 701125 N 3521095", no digit grouping, like the radio message in Q3); the map panel groups thousands for legibility ("701 125"). Same digits; the lesson QA compares them stripped of spaces.
- **QA.** `reading-coordinates.test.mjs` 10/10 (new: no deck in the copy; the note keeps datum / reference system / not-a-projection). `shot-reading-coordinates.mjs` now runs on the lesson only: sequence (after the map, before the summary), one heading, readings = the map's bridge (A) in both methods, fit in every check state incl. the five-note one, restart; PASS — 15 shots (`design/screenshots/reading-coordinates-2026-10-26/lesson-*.png`, `task21-lead-*.png`). `shot-reference-systems.mjs`: the screen-2 check no longer demands a static screen ("screen 2: separate, after the card, still names the datum (WGS84)"), the lead constant follows the new lead, shot `r5-07-screen2-reading-coordinates.png`; all checks pass.
- **Open.** `ReferenceSystemsLinkedComparison.tsx` header comment still says screen 2 holds "the table, conclusion and definitions — static" (not edited: the task-21 illustration is another run's).

## 2026-10-26 — Topic 06 "באיזה אזור אתם נמצאים?" (task 30): the decision row and the result panel

Only `LocationCheckActivity.tsx` changed. The model, the map, the geometry, the data and the check rules are unchanged. Logic findings: `design/docs/location-check-logic-findings-2026-10-26.md`.

- **One sequence.** Under the observation, in reading order: "בחרו אזור" [אזור 1][אזור 2] → "בדקו את הבחירה" → "איפוס". The row sits level with the map tools under the map; the tools row was raised to the same 48 px (`h-12`, centred) so the two rows share a centre line. The result panel spans both views under that row (fixed 150 px). It can't push the controls or move the views.
- **The result.**
  - Title: the checked area with ✓/✗.
  - Two aligned rows, direction and distance, each with "במפה X" | "נמדד בשטח Y" | "מתאים / אינו מתאים: reason" (35° gap with 5° allowed; within 260–340 מ׳). The captions are the map plates' own words ("במפה", "נמדד בשטח", "פער").
  - One closing line.
  - Removed as repeats: the reason sentence, the ✓/✗ chips and the "פירוט" popover.
- **Wrong answer.** It says which measurement to match again ("בדקו במפה מאיזה אזור הכיוון להתפצלות הדרך קרוב ל־043°"), and that the distance fits both areas. It never names the other area.
- **Success, worded to the evidence.** "אזור 1 מתאים לשתי המדידות", then "המרחק מתאים לשני האזורים, ולכן הכיוון הוא שמכריע. במצב אמיתי ממשיכים לבדוק את ההתאמה לאורך הדרך." The last sentence is the brief's own transfer line (§8).
- **Not checked yet.** A chosen area that hasn't been checked is named as such: "אזור 2 נבחר — עדיין לא נבדק". After a change it reads "הבחירה השתנתה — אזור 1 עדיין לא נבדק" plus which area the previous result was for. No ✓/✗ rows show, and the map drops the result layers (as before). The chosen area's map values moved from a second sr-only live region into this panel, so a choice is announced once.
- **Assumption — bearings' typeface.** In the result, bearings use the body face with tabular figures, not `font-mono`, to match the map's value plates and the "300 מ׳" beside them.
- **Assumption — button labels at 15 px.** "בדקו את הבחירה" / "איפוס" stay `Button size="md"` (`text-[15px]`, Table 3). The ≥ 16 px check covers body text, not design-system button labels, as before.
- **Measured at 1440 × 1122** (scale 0.7827): the card takes 150–802 px in every state (opening, no choice, each area chosen, wrong, change, success, change after success, reset, no WebGL). The card is 833 reference px tall, up from 818. Nothing moves between states, and the panel's content never overflows. Keyboard: radios (arrows) → Tab "בדקו את הבחירה" (Enter) → Tab "איפוס" (Space).

### 2026-10-26 — Lesson 6 "לפני שמתחילים", screen 2: why navigation skills matter (task 26)

- **Scope.** Only screen 2 of `topic-06/OnboardingScene.tsx`. The old `HISTORICAL` array, h3 and 2×2 card grid were replaced by `<NavigationExamplesPanel />` (new `topic-06/NavigationExamplesPanel.tsx` + figures in `topic-06/NavigationExampleVisuals.tsx`). Screen 1, the four navigation stages and the video work (task 25, user) are untouched. A screenshot of screen 1 at 1440 × 1122 is pixel-identical before/after. The figures import the `Pine`/`Bush`/`Rock` glyphs and palette from `PlanningRouteMap.tsx` (already exported for `NavTipsMap.tsx`); nothing shared was changed.
- **Parallel screen.** Lesson 2's examples screen (`topic-02/HistoricalCasesPanel.tsx`, now in "משמעות מעשית" before the recap, not in lesson 2's opening any more). Kept from it: pine band, centred title + subtitle, four cards (number, headline, meta line, preview), one detail panel (text column right, figure column left with a badge). Dropped on purpose: the card teaser and the "עיקרון מרכזי"/"המשמעות לתכנון" pair, which restate each other. Each example now has three non-overlapping parts: **ההקשר**, **מה זה ממחיש**, **הלקח לניווט**, plus a source line.
- **Assumption: drawn figures, not AI stills.** Lesson 2 uses generated photographs. Here each figure is a schematic map in lesson 6's own illustrated-map language (cream paper, tan contours, ember route), because a figure has to show the navigation point (a star's fixed rising point, a numbered marker at a firebreak crossing, the device's wrong position vs. the azimuth from the last verified point, two look-alike junctions plus distance, bridge and hill). Route semantics follow lesson 6: walked = solid orange, planned = dashed orange. Figures are never mirrored. Callouts are HTML pills in the figure's 4:3 frame.
- **Interaction.** The cards are an ARIA tablist (click; ←/→ with the row read right-to-left, so ← = next; Home/End; Tab moves into the panel). All four panels share one grid cell, so the band keeps the tallest panel's height and nothing moves between examples (measured: band, detail grid and callout identical for all four).
- **Facts and sources (checked 2026-10-26; full citations in the file's header comment):**
  - *Stars.* The old source (Varisco 1995, terpconnect.umd.edu) covers star calendars and wind directions. It does not cover direction-finding on journeys, and no authoritative source was found for desert/Bedouin pole-star travel. The example is reframed to the documented Arab maritime practice: a 32-point horizon defined by star rising and setting points, with the earliest written sources (Ibn Mājid, Sulaymān al-Mahrī) from the late 15th and early 16th c. Source: J. L. Berggren's review of Constable & Facey (eds.), *The Principles of Arab Navigation* (2013), *Aestimatio* 2014.
  - *Hürtgen.* MacDonald, *The Siegfried Line Campaign* (US Army CMH, 1963), ch. XIV, author's narration: with a map, position from numbered survey markers at firebreak intersections; without one, a compass. NPS: dense, rugged terrain, 19 Sep – 19 Dec 1944. army.mil: closely spaced 100-ft firs, dramatic elevation changes, only narrow unimproved roads and trails. No claim about the battle's outcome.
  - *GNSS.* EASA SIB 2022-02, 17 Mar 2022, to aviation authorities and operators: "spoofing and/or jamming has intensified in geographical areas surrounding the conflict zone".
  - *Junctions.* An invented example. It is flagged on the card, the panel meta, the figure badge and the note ("דוגמה מומצאת לצורכי הוראה…"), and the subtitle says "שלוש דוגמאות אמיתיות ודוגמה אחת להמחשה". Its distances (1.2 / 2.4 km) and the marker number 47 in the forest figure are schematic.
- **Callout fix.** "בהמשך השיעור" pointed to "דגשים לתכנון ולניווט", a part no longer in the lesson. It now points to טכניקות ניווט, then אזימוט and תכנון ציר.
- **Fit.** At 1440 × 1122 (scale 0.7827) the band runs from 166 to 867 and the callout ends at 988, so the whole screen fits with no inner scroll. At 1920 × 1080, 1536 × 864 and 1366 × 768 the band (the whole activity) fits, but the "בהמשך השיעור" callout below it needs a scroll. `FIT_HEIGHT_CASES` = 1050 (band + callout at 1920). QA: `scripts/qa/shot-topic06-examples.mjs`; shots in `design/screenshots/topic06-examples/`.

### 2026-10-26 — "שלושה סוגי צפון": cleanup for beginners (lesson 6, task 29, `north-lab/`)

- **Brief:** focus the existing lab without adding content. Map, compass, geometry, behaviour, palette and the `PrinciplesScene` wrapper are unchanged.
- **One place per explanation:**
  - The chosen north's definition, use and caveat now sit in a tab panel right under the tabs. Before, they were in a full-width strip below the map.
  - The declination term ("ההפרש בין צפון מגנטי לצפון אמיתי נקרא נטייה מגנטית") and "משתנה לפי המקום והזמן" moved under the slider as its description.
  - "במעבר בין מפה למצפן" is kept once, as the card's last line, without its second sentence.
  - "להמחשה בלבד" is marked by the slider label ("לדוגמה"), the map's own note and "בדוגמה," in the relation line. The inset's title already says that its separation is enlarged.
- **Removed as duplicates:** the intro's "בחרו בכל סוג כדי לראות את ההגדרה…", "שנו את נקודת הייחוס" (A does not move, so "נקודת ייחוס" also misled), "הזיזו את המחוון וצפו בשינוי המדידה", the "צפון רשת +2°" readout (the GN label shows it), the grid north's "במעבר בין המפה למצפן…" (the closing line says it), the inset's values (the main map shows them), and the extra selection cues (the ring on the selected tab, the side bar on the table row), per the lessons 2 & 6 cleanup spec.
- **Assumption — relation line under the reading.** A short computed line, for example "בדוגמה, הצפון המגנטי נוטה 6° מערבה מהצפון האמיתי, ולכן האזימוט גדול ב־6°.", says why the value differs from the true azimuth. It names the side: west is larger and east is smaller, so it follows the slider and is never an "always add / subtract" rule. For true north it says the arrow angles are measured from it. It is the only new sentence type. It replaces the generic slider instruction and is unit-tested against the computed azimuths at every step.
- **Assumption — Hebrew arrow labels.** TN / GN / MN became "אמיתי / רשת / מגנטי", the tab names' last word, so tab, arrow and table row share one name. The English names stay in the panel heading ("צפון מגנטי (Magnetic North)"). Label plate 44 → 48 units (measured text ≤ 40.1). Inset labels show the name only, at 13 units. The inset arrows went from 70 to 96 units long, to fill the space the values left. Gain, sides and order are unchanged.
- **Caveats:**
  - Each panel has one "דגש לשימוש", the original field minus what moved elsewhere. Magnetic: metals; true: "מצפן מגנטי אינו מורה בהכרח לכיוון זה."; grid: "עשוי להיות שונה מצפון אמיתי ומצפון מגנטי.".
  - All three panels are 7 lines. The reserved height therefore leaves no blank, and the reading never moves when switching.
- **Fit at 1440 × 1122 (scale 0.7827):** the card is 869 px (≈ 1,110 reference px; it was 1,034 px, foot at the screen edge). It runs 82–952 under the header in every state. The controls column ends with the map (893 = 893). No text was shrunk. The smallest HTML text is the slider's scale marks and the shared Button's sm label, both 14 px.
- **Open:**
  - The bezel print (90 / 180 / 270) is graduated from true north, as briefed. With grid or magnetic chosen, the reading is measured from that arrow, not from the printed 0.
  - `PrinciplesScene.tsx`'s comment still cites the lab's old height (1321 px). It sits outside the NorthLab wrapper, so it was left alone.
  - There is no conversion exercise, and none was added.
- **Verification:** `north-lab.test.mjs` 15/15; `shot-north-lab.mjs` 108/108 (copy and removals, each explanation once, relation line per state, Hebrew labels on their plates, fit per state, Tab order, reset, reduced motion). Screenshots are in `design/screenshots/north-lab-task29/` (`before/`, `after/`, side by side in `compare/`).

## 2026-10-26 — Topic 06 "דגשים לתכנון ולניווט": learner review, task 27

Code: `topic-06/PlanningTipsScene.tsx`, `topic-06/NavTipsMap.tsx`. The part is archived (`/archive/topic-06/tips/`, behind the archive gate), not in the public lesson-6 sequence; it was reviewed and tested there. Tests: `scripts/qa/planning-tips.test.mjs` (12 behavioural tests, needs a dev server; `QA_BASE` picks it). Shots: `scripts/qa/shot-planning-tips.mjs` → `design/screenshots/planning-tips/` (`before-*` / `after-*`). `shot-topic06-tips-fit.mjs` now opens the archive route.

- **Nav tip 4 ("בודקים אי־התאמה לפני שממשיכים") shows the mismatch only.** The destination halo, its "מאמתים את ההגעה ליעד" label and the sentences about confirming arrival were removed. They competed with the mismatch on one map, and arrival is already taught in plan tip 1 ("ובסוף הדרך לאשר שמגיעים ליעד עצמו") and in OnboardingScene ("קרבה ליעד אינה מספיקה…"). The tip now says what to check (the terrain against the map, direction and distance from the last identified point). The caption says what does not match (no road after ~600 m) and what the walked line shows (the direction drifted).
- **Captions describe the map; they don't repeat the action text.** Plan tip 1 drops its repeated "אלה הסימנים…" sentence. Plan tip 4's action no longer lists the three landmarks, because the map labels and the caption already do. Plan tip 3's action now promises only direction and distance, which is what its map shows. The landmarks belong to tip 4. Every caption keeps two lines of room (`min-h-[3.25rem]`), so a screen's height does not change between tips.
- **Colour = state, consistently.** In nav tip 3 the distance tag is sage, like "כיוון" and "סימן: אוכף", because all three are data that were checked and match. The navigation legend gains "נקודה מזוהה" (the ✓ marker), so the planned route (dashed), the walked way (solid sage), identified points (✓) and the current position (blue) each have a key.
- **"אותה מפה" appears once in each place it is needed.** It stays in the part's intro and on the navigation board ("אותה מפה, עם המיקום הנוכחי"). It was removed from the navigation intro. The "דוגמה לימודית נפרדת…" note stays only on the planning board. The planning board label is now just "מפת התכנון", because "לפני היציאה" repeated the screen title.
- **Application question: 4 answers, 2 "כן" + 2 "לא".** Before, the only "לא" answer was the right one, so the wording gave the answer away. **Assumption:** a new distractor, "לא. ממשיכים בכיוון המתוכנן עד הסימן הבא.", targets the "it will sort itself out further on" misconception. It breaks the principle in nav tip 4. The right answer lost its hedge "בשלב זה". Wrong-answer feedback explains why that choice fails and does not quote the right answer. The right-answer feedback says what the mismatch suggests (a similar junction) and what to compare before confirming. The stem, the tip titles and the closing card are the client's wording and were not changed.
- **No jumps in the question.** Switching answers swaps the feedback in place instead of collapsing and reopening it. The reset button opens with the feedback, outside the live region. Its label is "ניסיון נוסף" after a wrong answer and "התחלה מחדש" after the right one. Reset returns keyboard focus to the first answer, because the button removes itself.
- **One white card per activity** (the 2026-10-19 rule, skipped here then because the part was being archived). Each tips screen is one `.surface-elevated p-6 lg:p-8` card: the title, the instruction, the accordion, and the map board as a `bg-bg-accent/60` inset.
- **Fit heights re-measured** at the 1088-px reference: plan 752 and nav 730 for every tip, and the question 750 (a wrong answer with its button). Scale: 1 at 1920 × 1080 and at 1440 × 1122. At 1366 × 768 it is 0.851 / 0.877 / 0.853.
- Map furniture: the scale-bar figures and "צ" grew from 1.8–1.9 to 2.2 units (≈ 9.6 → 11.7 px on screen), and the group's opacity went from 0.75 to 0.85.

## 2026-10-26 — "אליפסואיד, גיאואיד וגליות" (task 13, follow-up): A's H readable on the model; the relief check

Brief: the user's message of 2026-10-26 (task 13's remaining readability item: A's H on the 3D model, and the reported model/section relief mismatch). Files: `measurementView.ts` (`heightLens`, `HEIGHT_LENS`), `MeasurementLandscape.tsx`, `MeasurementLandscapeRenders.tsx` (`GeoidHeight`, `HeightLensView`), `MeasurementLandscape3D.tsx` (`LensPass`). QA: `measurement-mission.test.mjs`, `shot-measurement-mission.mjs`, `measurement-round6.mjs`. Screenshots: `design/screenshots/geoid-model-closeup-2026-10-26/{before,after}/` and `compare-*.png`. The section, the panel, `CoordinatesScene.tsx` and the shared shell are unchanged.

- **The problem, measured.** At 1440 × 1122 the geoid view's opening angle draws A's H 15.5 px long on the model (page px; ≈ 12 px on screen under the laptop fit). The ellipsoid lies between the geoid and the ground there (N = −12) and crosses H 6 px above its foot. The picked pin's foot covers its top. So it was unclear which surface H leaves from. B (66 px) and C (129 px) read as they are.
- **A close-up on the model: the section's own.** Where H on the model is shorter than 16 px, or the ellipsoid crosses it closer than that to either end, the model gets the close-up the section already has (the section's `LENS_BELOW` threshold):
  - an orange frame round the station, with dashed corners up to a box at the stage's top corner on the station's side;
  - a title, "תחנה A · תקריב פי 3".
  - **Inside it is the model itself, drawn again by its own renderer.** The same camera, cropped to the frame (`setViewOffset`), is drawn into the box's viewport after the main frame (`useFrame` priority 1, as `DatumInset3D`'s `InsetPass`). The result is an exact whole-number enlargement in both directions, so H, h and N keep their proportions. Fat lines keep their pixel width: their resolution is the box's for that pass.
  - Over it, H is drawn again, k times longer (QA: exactly k × the model's line), with the station's orange ground dot and its letter, as in the section's close-up. The main model keeps its short H inside the frame; its letter moves into the box.
  - Only A triggers it, only in the geoid view after the reveal. The task draws nothing on the model, as before.
- **Assumption: the close-up names H's two ends.** "פני השטח" at the top and "גיאואיד" at the foot, in the section's words and colours. The model's sheets carry grid lines in the same colours as the two reference lines, so without names the line H leaves from still had to be inferred. The section's close-up is unchanged: its lines are named at the section's left end.
- **Placement.** The box is 168 × 92 at the stage's top right, above A's pin and right of B's. k = 3 at 1440 (H 46 px in the box).
  - It is drawn only where it covers neither its own frame nor any pin, with the frame inside the stage. Otherwise it tries the other top corner; failing that, there is none. From an angle the reader turned to, the box can sit in the other corner, with longer leaders.
  - Zoomed in with the wheel until H reads on the model (≥ 16 px), there is none.
- **H still never shows before the reveal.** The close-up is part of H's overlay (`GeoidHeight`):
  - before the reveal there is neither;
  - with the reveal it comes in with H, after the geoid's sweep (`REVEAL_H_DELAY`), its WebGL content eased in from under a paper veil on the same fade;
  - a later pick of A shows it at once;
  - "החזרת פני השטח" removes it at once;
  - reduced motion: at once.
- **Without WebGL** the see-through still itself is enlarged (×2; the stills are 2× images), in the same frame and box.
- **The relief "mismatch" was the check's assumption, not the illustration.** `measurement-round6.mjs` compared the two figures' whole pixel heights (model 197 vs section 156 px), but they draw different things:
  - **What the model's figure adds:** land off the survey line and outside the section's span (up to 278 m at the model's left edge, against 220 m at C), the top seen from 9° above (≈ 45 px of depth), and the base.
  - **Along the survey line they agree.** The dashed line's WebGL pixels against the section's ground line give relief / length 0.416 vs 0.416 (surface view) and 0.413 vs 0.416 (task view). From the pins, C over A against C to A, the model is ×1.003 / ×1.005 of the section (the task's 17° tilt allowed).
  - **Why the model draws smaller.** It is 86–92 % of the section's size overall. Its stage (651 × 264 page px) is too small to draw the line at the section's length. The 2026-10-12 rule applies: the line is never longer than in the section, and a box too small just fits the model.
  - **The new check.** It judges the exaggeration along the line (± 6 %) and that the line is no longer than the section's; the whole-figure heights are reported, not judged. The unit test checks the same contract at the real layout (± 3 %, view tilt allowed). The old 2.5× / 6× mismatch would read ×0.42 and fail both.
- **Verified** (1440 × 1122; on my own dev server :3063, because the shared :3000 timed out under the peers' load):
  - `measurement-mission.test.mjs`: 29/29, including the new close-up test and the relief contract at the real layout.
  - `shot-measurement-mission.mjs`: PASS, with the new model close-up checks (none before the reveal, A after it, none at B/C or in the task, reduced motion, the no-WebGL still). Its no-WebGL still check now counts the stills' own layer: the close-up shows the same still, enlarged.
  - `measurement-round6.mjs`: PASS (along the line ×1.000 / ×0.991). One earlier run had a single dev-server reload error ("Unexpected end of JSON input", during peers' rebuilds) that did not recur.
  - `shot-measurement-heights.mjs`: card heights unchanged (513 / 538 / 559 / 705), and every state fits at 1122, 900 and 800.
  - `tsc` clean for these files. The project has no ESLint config, so lint was not run.
  - In the browser: A/B/C before and after the reveal, and the task with wrong and right answers at A and B; before / after in the screenshots folder.
- **Open:**
  - The model draws the line ≈ 10 % shorter than the section at 1440 (the stage is too small). Drawing them the same size would mean a layout change.
  - The model's close-up is smaller than the section's (168 × 92 against 184 × 126, the room above A's pin), so it enlarges ×3 (×2 on the stills).
  - The section's close-up does not name the surfaces as the model's now does.
  - Without WebGL, the geoid's label on the see-through still sits on the note line under it. That placement was there before and is unchanged.
  - The task card still does not fit at 1920 × 855 (901 px), unchanged since HEAD.

## 2026-10-26 — Topic 06 "טכניקות ניווט" (task 28): terrain association finished, dead reckoning made an activity

Brief: the user's message of 2026-10-26 (task 28). Files: `CombatNavScene.tsx`, `terrain-nav/` (`TerrainAssociationActivity.tsx`, `terrainNavState.ts`, `TerrainNavMap.tsx` measure label, new `RadioRow.tsx`), new `dead-reckoning/` (`deadReckoningModel.ts`, `DeadReckoningActivity.tsx`, `DeadReckoningMap.tsx`, `DeadReckoningField.tsx`). `CombatNavVisuals.tsx` is unchanged (topic 10 imports it). Not touched: planning tips, the location-check activity, north types, route planning. QA: `scripts/qa/dead-reckoning.test.mjs` (11), `terrain-nav.test.mjs` (20), `shot-dead-reckoning.mjs` (115, includes the fit sweep of both cards), `shot-terrain-nav.mjs` (66). Screenshots: `design/screenshots/combatnav-task28/`.

**Terrain association (kept: the domes-and-village scenario, the model, the map, learn / practice)**
- **Fit.** Before the change the card overflowed 1440 × 1122 by 50 px (learn), 56 px (practice) and 233 px (partial feedback). Now the tallest state (any leg, wrong point or partial, plus hint 2) ends at 1114 px.
  - How:
    - the route legend moved into a 200 px column inside the map panel, at its outer (left) side, with the map key and the full-screen button; the caption stays under the views;
    - views 55/45 → 52/48 (the sheet keeps its 488 px height);
    - the check / next button moved to the strip's top row, over the feedback;
    - the hint shows inside the feedback box;
    - false statements are marked ✕ in the evidence list, so the feedback only says why;
    - the summary is one row of four legs;
    - spacing trimmed (header 24→20, views 20→16, strip 16→12, footer 24→20, footer insets p-5→p-4).
  - **Assumption:** a legend column beside the map is the least visible change that buys the height. It also keeps the key next to the sheet it explains.
- **A decision before moving on.** "הצגת הסבר" is disabled until the leg's first check (reducer: `reveal` needs `attempts > 0`). An empty check counts as a check.
- **Order of the signs.**
  - The practice instruction now says to compare direction and distance *from the previous sign*.
  - A wrong point's feedback gives the route order: "לפי סדר הציר, הסימן הבא אחרי … נמצא ב־… ; אל נקודה …: …".
  - The summary names the three things that told look-alike places apart: the order, direction and distance from the previous sign, and the signs beside each point.
- **Reset in practice.** "התחלה מחדש" sits beside the learn/practice switch: back to leg 1, still practising. The summary keeps its own.
- **Map measure label** (pre-existing clipping): the direction-and-distance plate prefers the side of the line that stays on the sheet, and is clamped inside the neatline. Open: on leg 1, point א׳, the plate lands west of the line and partly covers the 396 spot height near ג׳.
- **QA script fixes in `shot-terrain-nav.mjs`** (stale since the laptop fit):
  - the model-label registration multiplies the canvas probe by the fit scale (it compared unscaled px with scaled screen boxes);
  - the map `svg` selector is now `svg[data-map-mode]`;
  - the restart is scoped to the terrain card;
  - the explanation is reached after a check.

**Dead reckoning (the animated board became a three-step activity in one card)**
- **Layout:** the same envelope as technique 1. Title + principle head the card, then the lab, then the "when to use" and example insets. The approved METHODS text is unchanged.
- **Views:**
  - "בשטח" (inline start): a north-up, top-down window around the navigator, 2.4 units/m. It is fully hazed beyond 30 m, using the old board's paper / storm language.
  - Planning map (left): metres, north up, never mirrored, never hazed.
  - Both draw one dataset: A at a road junction, B = A + 1200 m @ 62°, a dry wadi crossing the line at 450 m, and a hill with an antenna 160 m @ 315° from B.
  - One animated distance drives the map estimate and the field view.
- **Steps:**
  1. **Pace pairs.** The options are 800 / 1,200 / 1,600 / 1,800. Each wrong one names its mistake: metres, single steps, multiplied. The right answer adds that a 1.6 m pace gives 750.
  2. **Set the compass to 62°.** Use the dial (drag, click, arrows ±1, PageUp/Down ±10, Home) or the ±1/±10 buttons. The map arrow from A follows the setting.
     - A wrong setting is refused with the turn needed and where that heading would end: 2·1200·sin(Δ/2).
     - It also names three causes: counter-clockwise (298°), measured from east (28°), and back azimuth (242°).
     - Then the learner counts in hundreds. At 300 pairs the wadi is a check on the distance.
  3. **The count is complete: what does it prove?**
     - "הגענו ל־B" and "keep walking until you see B" are wrong, each explained.
     - "an estimate; verify" opens the 3° example drawn to scale (≈31 m apart at 600 m, ≈63 m at 1,200 m), the 1.4 m pace (80 m short), and the hill to verify against.
     - The task ends at "נדרש אימות", never at an arrival.
- **Assumptions:**
  - The scenario's features (roads, wadi, hill) and the 30 m visibility are invented for the exercise.
  - The 3° and 1.4 m errors are labelled examples, not error ranges.
  - The walk itself has no deviation, as the approved example says.
  - `SUPPORT.dead` changes, which the activity requires:
    - the caption's last clause "ואינו מציג שגיאות כיוון או ספירה" became "ההליכה מוצגת ללא סטייה; בשלב האימות מוצגת השפעה של סטייה בכיוון";
    - legend "מנווט — מצפן וספירת צעדים" → "מנווט; במפה — אומדן לפי הספירה";
    - legend "סופת חול — ראות מוגבלת" → "סופת חול — ראות של כ־30 מ׳, בשטח בלבד".
- **Copy review:** two read-only reviewers (domain, Hebrew) were applied. Changes:
  - first person plural in the decision options;
  - "הספירה מעריכה כמה הלכתם";
  - the wadi confirms distance along the line, not drift to the side;
  - the back azimuth is named;
  - at the end of the count: stop at the estimate and verify against a landmark.
- **Fit:** the card is 1188–1272 reference px in every step (ends at 1027–1092 px at 1440 × 1122).
- **Open:**
  - The map and field labels are 13–15 reference px, as in the terrain map, so about 11 px on screen at 1440.
  - Without JavaScript the activity is not usable. It is SVG-only, so it needs no WebGL fallback.

## 2026-10-26 — Lesson 2, tasks 13–24: combined fit-to-screen check at 1440 × 1122 (user request)

**Rule (user, 2026-10-26):** every activity must fit whole on screen in its tallest state. Uniform width does not justify scrolling inside an activity or cutting off its foot, and an older check that tolerates scrolling does not override this. Target: desktop 1440 × 1122 only.

**Method.** Integrated working tree after the other runs (tasks 13, 20, 22, the datum-field lead and the contours keyboard work) finished, on a private dev server. Each screen's fitted box is placed 16 px under the 80 px header (y = 96) and must end at ≤ 1122. The title, lead, illustration, main controls and feedback were measured in every state. 178 states were checked, including calculator open, הרחבה, hints, wrong and right answers, shown answers and summaries. The scale is 0.7827 on every screen (width-bound).

**Result: every state fits, so no layout or shell change was made.** Tallest state per activity (screen px, bottom):

| Activity | Tallest state | Height | Bottom |
|---|---|---|---|
| Ellipsoid, geoid and heights (13) | the task | 705 | 801 |
| Datum (14–15) | station 3 | 726 | 822 |
| Datum: הרחבה | open | 191 | 287 |
| Datum mismatch (16) | case 2, right answer | 873 | 968 |
| Projections (17) | all states | 784 | 880 |
| Base 60 + calculator (18) | a hint or the calculator open | 1007 | 1102 |
| Pros and cons (19) | static | 498 | 594 |
| UTM explainer (20) | all steps | 499 | 595 |
| UTM atlas (20) | Tokyo, wrong + hint | 775 | 871 |
| Reference systems (21) | all six states | 759 | 856 |
| Reading coordinates (22) | opening / Q1–Q2 | 1013 | 1108 |
| Contours model (23) | all states | 485 | 581 |
| Contour density (24) | all tabs | 720 | 940 |

- **Base 60.** The calculator overlaps nothing in any of 8 calculator-open states. A hint, a wrong answer or opening the calculator pushes the band below the steps (coordinate, D/DM/DMS/S) down by 72–133 px. The band stays on screen.
- **Reference systems.** Map, pins and both control rows stay to the pixel across all six states and through a filmed switch. The panel keeps its top and title, and only its foot moves (geographic 614 px, UTM 373 px). No text is clipped or overlapping.
- **Datum mismatch.** Feedback grows the card by 18–28 px and moves the activity's bottom navigation down by 12–22 px. The main controls do not move.
- **UTM practice** is answered on the maps: click the zone strip, and the side of the equator, on either map. By design (the owner, per the user's request), the close-up shows the zone numbers before a check. Correctness appears only after "בדיקת הבחירה".
- **Not covered:** other viewports. On short laptop views the uniform fit still lets tall screens' feet scroll (`LESSON_FIT_MAX_HEIGHT`). For example, the heights task does not fit at 1920 × 855 (pre-existing). Screenshots: `design/screenshots/fit-pass-2026-10-26/`.

## 2026-10-27 — User-directed restoration and shared navigation examples

- The user clarified that task 27 was not meant to be archived. Restored tips after onboarding in Topic06Lesson and lessonScenes; removed its archive listing and updated the onboarding callout and QA routes.
- The user requested lesson 6 historical cards identical to lesson 2, with only text and images differing. HistoricalCasesPanel now accepts data and copy with its original defaults; NavigationExamplesPanel uses that same component, with no independent layout.
- Generated eight illustrative images with ChatGPT (four main images and four banners), integrated under topic06/navigation-examples. Images are labeled as reconstructions/illustrations, not historical photographs. Prompts and sources: topic06-navigation-images-2026-10-27.md.
- Stars copy now qualifies rise/set directions by latitude; removed the universal claim that a star always rises/sets at the same points everywhere.
- User explicitly approved showing the field distance before the location choice. Added a compact line with the observed bearing and distance, using READINGS, without changing the scenario or verdict rules.
- Task 25 videos remain open and user-owned. Task 28 answer leakage, task 30 map precision and repeatable QA, and existing typecheck configuration failures remain open. See codex-review-2026-10-27.md and the follow-up prompts.

## 2026-10-27 — Topic 06 "באיזה אזור אתם נמצאים?": task 30 follow-up (map precision, state, QA)

Files: `LocationCheckMap.tsx`, `LocationCheckActivity.tsx`, `locationCheckState.ts`, `scripts/qa/location-check.test.mjs`, `scripts/qa/shot-location-check.mjs`. The scenario, the geometry, the 3D model, the field readings line (Codex, user-approved) and the verdict rules are unchanged. Details: `location-check-logic-findings-2026-10-26.md`, update of 2026-10-27.

- **An area, not a point.** After success the map's mark is "נקודת התצפית בתרחיש", not "מיקום הצופה". It is literally the point the 3D view is rendered from (OBSERVER = area 1's centre). The map key separates it from the supported area: "אזור שמתאים לשתי המדידות" / "נקודת התצפית בתרחיש (להמחשה)". The success line adds "המדידות תומכות באזור, לא בנקודה מדויקת בתוכו." before "במצב אמיתי ממשיכים לבדוק…". It still fits on one line in the 150 px panel.
- **Assumption — keep the mark and the wedge.** Dropping the mark would leave the field-of-view wedge without an apex. The wedge is what ties the 3D view to the map, so the mark stays, with the label and the key saying what it is.
- **Stale after a check with no area** is now handled in `view()` instead of only in the activity's display.
- **QA:** `shot-location-check.mjs` checks the opening with both field readings, a check with no area, area 2 wrong, the change to area 1, success, a change after success, reset, keyboard, loading, reduced motion and no WebGL. In every state it checks fit and stability at 1440 × 1122. Measured: the card spans 125.3–802 px in every state and every run, and the result never overflows. Screenshots: `design/screenshots/location-check-task30/followup/`.

## 2026-10-27 — Topic 06 "תכנון ציר: בניית סיפור דרך" (task 31): points vs legs, write leg ד׳, pacing

- **One source of data.** `route-story/routeStoryModel.ts` holds the five points, the four legs (azimuth, distance, what you pass, which sign ends them), the map geometry and the question. The map draws each leg from its azimuth and distance, and the list, panel, tag and live text print the same numbers. `scripts/qa/route-story.test.mjs` checks the drawing against the text: bearings and lengths, the stream crossed about 100 m from point 2, the road through point 4, the grove on the left in the middle of leg ד׳, and the pines and rocks at נ.ס.
- **Points vs legs.** The old list had five checkpoint cards. Cards 1 and 2 both carried 035° / 500 מ׳, card 1 as the departure and card 2 as the arrival. The list now alternates נ.ה, leg א׳, point 2, … נ.ס: nine stops.
  - A selected point shows the leg that LEAVES it. On the map it is dashed, and its tag names the leg's letter. The panel calls it „הקטע היוצא”, and at נ.ה it says the numbers belong to the leg that starts there.
  - A selected leg is solid and rings what it passes and its end sign.
  - Map marker 5 now reads 5, not B, as in the list.
- **Application step (assumption: the simplest fit for this screen).** Leg ד׳ is the learner's to complete from the map: azimuth, distance and the sign at its end, three choices each.
  - Each wrong option is a named mistake: the reverse bearing, the angle measured counter-clockwise, half or double the length, the sign at the start of the leg, and the sign on the way.
  - Feedback explains each part under its own control and never names the value to pick. Changing an answer clears only its own feedback.
  - Until the leg is done, its numbers show „?” in the list and the tag, its rings stay off, and נ.ס does not name its sign. The scale bar is outlined as the tool to use.
  - Once done, the list, tag and rings fill in, and „איפוס” starts over.
- **Panel height.** Another session changed the panel's min-height from 288 to 140 px (2026-10-27 10:23). Every point and leg view shares that height. Only the question view is taller, and it grows the card downward from the same top. Kept as found.
- **Choice control.** The question and the pace lengths use lesson 6's shared `terrain-nav/RadioRow` (untracked, another session's file; imported, not changed). Its selected chip carries a ✓ badge even when the answer is wrong; the feedback box below says ✗. Left as the shared control behaves (same in ניווט עיוור).
- **Map legibility (cartographic review).** Changes:
  - Tags are offset from their box size, so they never cover their own leg; their text is a size larger.
  - Arrows are 1.4× larger and sit 6.5 units before the leg end.
  - The stream bend and crossing are pins with leaders; rings hid behind marker 2.
  - The road is drawn cased, not dashed; dashes mean route state only.
  - The saddle label has a leader to the col.
  - Label pills were moved clear of markers and pines, and one grove pine was moved clear of the „צ” tick.
  - The scale bar sits 2.5 units in from the edge, so its hint outline does not clip „500 מ׳”.
  - The outgoing dashed leg no longer uses framer-motion's `pathLength`, which overwrote its dash array.
- **Pacing demo.** It now shows the three quantities: distance (מ׳), steps (one foot to the other) and double steps (same foot to same foot — the counted one). A schematic shows both lengths, and „אורך הצעד הכפול שלכם” (1.4 / 1.5 / 1.6 מ׳) shows how the count depends on the personal measurement.
  - A note says the count is not proof of arrival; the sign at the end of the leg is.
  - It stays a demo with no question, so it does not repeat the ניווט עיוור activity (pace-count question, what a finished count proves).
- **Fit.** At 1440 × 1122 (scale 0.7827) the builder spans y 104–832 in every point and leg view and 104–948 in the question's tallest state (feedback under all three answers, or done), inside 1122. The pacing card fits too.
  - Open: at 1536 × 864 and 1366 × 768 the builder (795 / 677 px) is taller than the room under the header (736 / 640 px), so its foot scrolls there.
- **Copy** went through a hebrew-copy-editor pass: one verb („משלימים”) for the question, „אורנים בקרקע סלעית” everywhere, 3-digit azimuths in feedback, and the formula line set `dir="ltr"`.
- **QA:**
  - `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/route-story.test.mjs` (model, 18 tests).
  - `node --test scripts/qa/route-story.e2e.test.mjs` (browser, 11 tests, on the main lesson page; `SHOTS=<dir>` saves screenshots).
  - `scripts/qa/probe-topic06-planning-fit.mjs` uses the new prev/next labels.
  - Screenshots: `design/screenshots/route-story-builder/before/` and `…/after/`.


## 2026-10-27 — Lesson 2 "הדמיה: מה קורה כשהדאטום לא תואם?": dead space in the card (layout only)

Brief: `design/docs/claude-datum-layout-2026-10-27.md`. Changed only `datum-field/DatumFieldChallenge.tsx` and its browser QA (`scripts/qa/shot-datum-field-challenge.mjs`); model, data, geometry, map picture, lead text and the lesson's fit are untouched.

- **Columns.** The 50/50 grid with both columns stretched (and the way on pushed to the map's foot with `lg:mt-auto`) is replaced by a fixed map column (`MAP_BOX_W` = 430 reference px + the 48 px N margin) and the panel taking the rest (768). The map keeps its whole extent and its 340 : 410 proportions; at 1440 × 1122 the box is 337 × 406 (was 450 × 543). Assumption: 430 balances the stages — the map stands between stage 1's panel (493) and practice's (691) — and every map label still passes the QA's inside / no-overlap / ≥ 13–14 px checks.
- **Gap label at the smaller scale.** A 60 m or 48 m line is now ~60–76 px long, too short for its number beside its middle without touching the ring; below 120 px the number goes next to the diamond (the placement that already existed for markers too close for a line). Presentation only.
- **Feedback room.** Each stage keeps room for its tallest feedback (compare 142, error 168, practice 108 reference px), stage 2's action row keeps the experiments' height, practice step 3 keeps the rule + pairs, the footer keeps a button's height (its rule hidden while empty), and stages 2–3 keep the legend's line. So within a stage the map, the controls and the way on never move and the card keeps one height (905 / 928 / 1017 / summary 928 reference px). Assumption: a blank of at most one feedback's height before it appears is the "reasonable room" the brief asks for — 136 px (stage 1 before the first switch), 164 px (stage 2 before the copy), 106 px (practice before the check) on screen.
- **Practice at the wider panel.** The four actions sit in one row (each label on one line), the three pairs on one line each (`formatEN`, as every pair elsewhere in the activity), and the case's source and target rows side by side. Same choices, order and wording.
- **Lead.** Its width is the panel's column (768, its former max-w-3xl), so it still breaks into the same 5 lines and ends where the panel ends.
- **The summary (user's choice, 2026-10-27).** Its panel (heading, closing note, two buttons) was 201 reference px against the 603 px map column, ~314 px blank under it at 1440. Offered three options; the user chose a recap of both cases (`CaseRecap`): per case one inset with the place, the source's and the target map's datum tags, the right action (`rightAction`) and the numbers it sends (`convert`) — the two marks the summary map shows, which carry no labels. Only existing data and labels, no new prose; it exists only in the summary (QA checks it is absent before). Blank under the panel now ~180 px; the card's height is unchanged.
- **QA.** `QA_BASE=http://localhost:3000 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-datum-field-challenge.mjs` — new layout checks replace "both columns the same height / navigation level with the map". Before/after: `design/screenshots/datum-layout-2026-10-27/`.

## 2026-10-27 — Lesson 6: copy cleanup (less repeated text, information beside its use)

Brief: `design/docs/claude-topic06-copy-cleanup-2026-10-27.md`, which overrides "Wording is frozen" for shortening, merging and moving text. Map: `topic06-content-audit-2026-10-27.md`. Started after the task 28, 30 and 31 runs had finished (their notes above; no topic-06 file changed after 10:42). Text and local presentation only. Geometry, numbers, right answers, scoring, images, the shared shell, the lesson width, lesson 2 and other lessons are unchanged.

- **Four stages** (`OnboardingScene`): the intro is one question and one instruction. Each stage keeps an action sentence and a reason sentence; the „הפעולה בשלב זה” / „חשיבות הפעולה” labels are gone. The exit stage no longer defines azimuth or gives the 5° / 1 km / 90 m example (azimuth is defined at the techniques and the compass; drift is shown in ניווט עיוור, step 3). „המסלול הקצר ביותר אינו בהכרח המתאים” stays here, the general rule; the tips keep only the map's own comparison. The transition to the tips is one line.
- **Assumption — „8 ק״מ · לילה” removed** from the task line („משימה: מנקודה A לנקודה B” stays). Nothing in the illustration reads it, and there is no topic-06 video yet (task 25). If those videos use a night, 8 km scenario, the line can return with them.
- **Examples** (`NavigationExamplesPanel` data only; `HistoricalCasesPanel` and lesson 2 untouched): a short context, one principle and an application that does not restate it. The sources (US Army history, EASA 2022, the navigation manuals), the stars' latitude qualifier and the 32 directions stay. The invented example is still marked on its card, in the detail line and on its image badge. The paragraph and the application no longer say it a third and fourth time.
- **Tips** (`PlanningTipsScene`): all eight states keep an action and a reason (labels removed). Map captions say only what the map shows in that state; the saddle keeps a short definition where the route chooses it. The scene intro no longer says „אותה מפה לימודית”; the board note says it once. The closing card is one message sentence plus the transition, with no heading.
- **Techniques** (`CombatNavScene`, `terrain-nav/TerrainAssociationActivity`, `dead-reckoning/DeadReckoningActivity`):
  - Opening: no "each method is shown later" or "we'll practise later" sentences. Azimuth and road leg are one sentence each.
  - Terrain association: a shorter principle ending with when the method fits (the three „מתי משתמשים” bullets as one sentence). The handrail is „תוואי רציף… יכול לשמש ״מעקה״”, one case of the method. The walk-through under the lab, which repeated the caption, is gone, and so are the „מסימן לסימן בשטח” tag and the caption's repeated principle. One instruction per mode; how to turn and zoom stays on the model. The waiting line in practice says only what is still missing („נשאר להשלים: …”), or that the check is ready.
  - **Assumption — feature list**: the five route features (A, כיפה 1–3, the square) show first and the other ten sit behind „עוד 10 עצמים בשטח” (`aria-expanded`). A feature picked in the model or on the map opens the list, so its button is pressed and in view. Every feature stays a button in the tab order once the list is open.
  - Dead reckoning: the principle is shorter and ends with when it fits. It no longer says „השלמת הספירה אינה כשלעצמה אישור”, which is step 3's answer; step 3's feedback and the done line carry it. The example under the activity, which repeated 62° and 1.2 km, is gone with its count-free twin, so no fixed text carries 800 now. The caption tells the field (about 30 m) from the planning map and keeps „ההליכה מוצגת ללא סטייה”; it no longer announces step 3. The legend names the symbols (the bearing's value is on the map). The plan step's waiting line no longer repeats the field note. The closing card is one sentence, with no heading.
- **Principles** (`PrinciplesScene`, `LocationCheckActivity`, `north-lab/`): the two opening columns are gone. The azimuth definition sits under the compass's slider, in the column's free space, and the back azimuth stays in the band below. The GPS sentence opens the location check's instruction. „כאן תופיע תוצאת הבדיקה” is gone; the result panel keeps its fixed 150 px. North types: each „שימוש עיקרי” line is folded into its definition (the audit's gentle option). The table, the sign and difference explanation, declination and the caveats are unchanged. The closing card is one sentence.
- **Route planning** (`PlanningScene`, `route-story/`): the intro and the two concept columns are one definition of סיפור דרך. The builder intro no longer repeats it, and the two reminders printed under every leg are gone. Task 31's activity is unchanged otherwise: five points, four legs, incoming and outgoing, the signs, leg ד׳. Pacing: one line on personal measurement and conditions, and the method („איך מודדים?”) in a native `<details>`. Step vs double step, the formula and „הספירה אינה הוכחת הגעה” stay in view. The part's closing card, which repeated the definition and that note, is gone.
- **Recap**: the completion banner and its second big heading are merged into the intro. All ten terms stay. The first is „ניווט לפי השטח (טופוגרפיה)”, the lesson's name with the quiz's, and its definition keeps the handrail as one case.
- **Not changed, open:**
  - Quiz q4 (`src/lib/quizzes.ts`) still asks „מהו ניווט לפי טופוגרפיה ("לאורך מעקה")?”. Its stem and rationale frame the whole method as the handrail. The quiz is outside this cleanup, which may not touch answers or scoring.
  - `content/topic-06.md` still has the longer wording.
  - `FIT_HEIGHT_*` / `referenceHeight` constants were not retuned. Inside `LessonFitUniform` the lesson ignores them, and the width task re-measures.
- **Copy** went through a hebrew-copy-editor pass, which fixed one agreement error and an ambiguous „שלא בסדר”, restored „מחשבתי” and „ברכס” where shortening had lost meaning, and lightened the punctuation. Not taken: a pointer back to „נתרגל בהמשך”, which the audit flagged; „תשלימו” for task 31's chosen „משלימים”; and „לפי הסדר” before the checkpoints caption, which would break the „במפה: ” caption rule that `planning-tips.test.mjs` checks.
- **Found while checking, fixed (dead reckoning):** on arrival the first pace option, 800 (the right answer), had keyboard focus and a focus ring. The step-focus effect skipped its first run with a flag, but StrictMode re-runs the mount effect. It now compares with the last step key, so arrival moves no focus and step changes still do. Still open: 800 is the first of the four options, so a restart (or Tab into the group) lands on it.
- **QA (1440 × 1122, shared :3000):**
  - `tsc --noEmit`: 0 errors.
  - Unit tests: terrain-nav 20/20, dead-reckoning 13/13, route-story 18/18, north-lab 15/15, location-check 31/31.
  - `route-story.e2e` 11/11.
  - `planning-tips.test` 11/12. Test 6 fails on the tips' scale, 0.9669 rather than 1, the 1088 px width the audit already measured. That belongs to the width task.
  - `shot-terrain-nav` 69/69, `shot-dead-reckoning` 152/152, `shot-north-lab` 108/108, `shot-location-check` 67/67.
  - New `scripts/qa/shot-topic06-copy-cleanup.mjs` 135/135. It covers every stage, example and tip state, the question (wrong, right, reset), terrain learn and practice with the waiting line, focus on arrival, compass, location check, route builder, pacing closed and open with the keyboard, recap, and reduced motion.
  - The approved-copy lists in the activities' suites hold the new wording.
  - Screenshots in `design/screenshots/topic06-copy-cleanup/`: `before/` and `after/` (each screen under the header), `compare/` (side by side), `states/` (the sweep).

## 2026-10-27 — Lesson 6: one frame and one interface size for every activity (widths pass)

Brief: `design/docs/claude-interaction-widths-2026-10-27.md`. Started after the lesson-6 copy cleanup reported done (11:38); layout only. No text, geometry, data, answers, images or colour meanings changed; lesson 2, `LessonViewportFit` and the shared shell are untouched.

- **Measured, not assumed (1440 × 1122).** Every card already spanned x 64–1116. The deviations were inside: the tips sub-topic was laid out at 1088 px (`max-w-6xl`) and shrunk by 0.967, the rest of lessons 2 and 6 at 1344 px and 0.7827, so its body text and buttons showed at 15.5 px against 12.5 px and its titles at 29 px against 23.5 px. The tips and principles part headers and the principles closing line sat outside every fit (46 px / 16 px unscaled). The location check had 24 px padding and a `text-2xl` title, the route story a `text-xl` title and a `text-sm` lead, the four-stage card 24 px padding, and the step-counting card a scaled 38 px gap above it where every other gap is 48 px.
- **One rule, not per-screen tuning:** every lesson-6 composition is laid out at the lesson's 1344 px reference and shrinks with the lesson's one scale (`LessonFitUniform`), as in lesson 2. Activity cards use lesson 2's tiers: 32 px padding (`p-6 lg:p-8`), title `font-display text-2xl font-bold leading-tight text-fg sm:text-3xl`, lead/body `text-base`.
  - Tips: section `max-w-lesson`, `FIT_WIDTH` 1344; its header in its own fit. The board keeps the 1 : 1.35 split, so the map is the same size on screen as before (≈ 533 px wide); only the text got the lesson's size. Its accordion headers match the four-stage accordion of the opening (number tile `size-11`, `text-lg md:text-xl`, 20 px chevron), so the two accordions of the lesson look the same. `FIT_HEIGHT` (used only outside `LessonFitUniform`) re-measured at 1344: plan 863, nav 841, question 532.
  - Tips question: „שאלת יישום” is the card title (it was a 14 px eyebrow); the question is its `h4` sub-heading and still labels the answer group. The four answers sit two per row across the card instead of a `max-w-3xl` column that left ~400 px empty beside them; order and wording are unchanged (reading order: right, left, next row). The feedback spans the card's width.
  - Principles: the part header in its own fit; the closing line shares the location check's fit (`mt-6`), as the techniques sub-topic does.
  - Location check: `p-6 lg:p-8`; the title takes the lesson's title tier and `text-fg` like every other card title (it was `text-black`).
  - Route story: the title and lead move to the lesson's tiers; they stay in the list column beside the map (task 31's composition). The card height is unchanged (728 px on screen): the map column is the taller one.
  - Four stages: `p-6 lg:p-8`, so its content edges line up with the cards that follow; `data-activity="nav-stages"` for QA.
  - Step counting: the 48 px gap above it sits on the unscaled wrapper (`mt-12`), as everywhere else in the lesson.
- **Result:** in all five sub-topics, header → intro 12 px, intro → first card 25 px, card → card 48 px, card → closing line 19 px, last block → page navigation 48 px.
- **Justified exceptions (not changed):**
  - Compass + map: the title above the map at the inline end and the 18 px instruction follow the selected mockup (`02-linked-map-selected.png`, entry above).
  - Lesson 2 itself mixes part headers inside fits (36 px) and outside them (46 px), and its onboarding twin keeps 24 px padding. Lesson 2 was out of scope, so it was left as it is; lesson 6 now uses the inside-fit form throughout.
  - The recap's term cards stay unwrapped, as in lesson 2. The hook is not wrapped. The examples panel is lesson 2's `HistoricalCasesPanel`, unchanged. The `ReadyCallout` keeps its shared 24 px padding.
  - Accordion beside an aspect-locked map (tips): the accordion column ends ~180 px above the board, because the map keeps its size and isn't stretched to fill the column.
  - Small labels (13 px tips legend and pacing ticks → 10.2 px; 12 px technique legends → 9.4 px) are unchanged reference sizes at the lesson scale.
- **Not from this pass:** `/archive/topic-06/tips/` now answers 500 on the dev server, because `tips` left `archivedScenes` when the sub-topic returned to the lesson (task 27). The page map still imports `PlanningTipsScene`.
- **QA (1440 × 1122, shared :3000):** new `scripts/qa/topic06-layout.mjs` 149/149 (lesson-2 reference measured in the same run; scale, 1344 reference, edges, padding, title and type sizes per card, no text outside a fit, no nested fit, tallest states under the header: every stage, example, tip, answer + reset, compass slider ends, every north, every route stop, every pace). `planning-tips.test` 12/12, after updating its stale "scale 1 at 1440" check to the lesson's scale. `route-story.e2e` 11/11, `shot-topic06-copy-cleanup` 135/135, `shot-location-check` 67/67, `shot-north-lab` 108/108, `shot-compass-map` 22/22, `shot-topic06-examples` PASS, `shot-dead-reckoning` 152/152 (includes the terrain tallest-state sweep and keyboard), `shot-terrain-nav` 69/69, `tsc --noEmit` 0 errors. Lesson 2: every fit and card of all ten scenes measured identical to the morning baseline. Screenshots: `design/screenshots/topic06-layout/` (`before/`, `after/`, `compare/`, `after/states/`, `lesson2-after/`).

## 2026-10-27 — Lesson 6 › תרגול: the resection practice in the main lesson, and neutral selection

Brief: `design/docs/claude-topic06-simulator-integration-2026-10-27.md`. Handoff: `design/docs/navigation-sim-integration-2026-10-27.md`.

- **The practice card takes the lesson's fit.** The practice tab sits outside the learn tab's `LessonFitUniform`, so `NavigationSim` wraps its own card in `LessonFitUniform` + one `LessonViewportFit` (reference 1344). At 1440 × 1122 it shrinks by the lesson's 0.7827, like every other lesson-6 activity; one fit only, nothing hand-shrunk. Card tiers follow the widths pass: `p-6 lg:p-8`, title `text-2xl … sm:text-3xl text-fg`, body `text-base`. The map stays the same size on screen (≈ 618 × 464 px), so its labels are unchanged (≥ 14.4 px).
- **The "תרגול" eyebrow above the title was dropped:** it repeated the tab's name, and no other lesson-6 activity card has one. The same-north note under the map went from `text-sm` to `text-base` (12.5 px on screen), since it states an assumption the whole exercise rests on.
- **Selection is neutral.** `RadioRow`, the location check's area choice and the practice's object buttons drop the ✓ badge on the chosen option: a choice is shown by a thicker orange border, a tint and bold, and right/wrong only by the feedback after a check. Their focus ring now stands off the border (`ring-offset-2`), so a focused option (e.g. 800, the first and right pace option) never looks chosen. The terrain activity's evidence list is a checkbox list whose box keeps its tick (checkbox convention, outside this brief).
- **Mark tolerance in the text.** A mark is accepted up to 60 m from the crossing (≈ 15 px). Within 10 m (the mark's centre dot) the feedback says it is in the crossing; farther it gives the distance, rounded to 5 m. The verification and the close say the third line passes through the crossing, never "through your mark".

## 2026-10-27 — Lesson 2 „תבליט ותכסית”: classification feedback, comparison fit, axes marker, model gate (audit א2, ב2, ב3, ג9)

- **Classification quiz.** `autoAdvance` is gone from the relief/cover quiz (it reverses the 2026-10-19 opt-in): an answer keeps the item on stage with „נכון.” or „לא בדיוק. הסיווג הנכון: …” and the existing explanation, and only „לפריט הבא” moves on — the same loop as „סיווג התכסית לפי מקור”. `SortQuiz` is unchanged; its `autoAdvance` option now has no caller.
- **The open table replaces the state's cells.** While the summary table is open, the state's cells block closes and the table takes its place; the table's cells for the state on show are marked (`bg-accent/[0.08]`, text in `text-fg` instead of `text-fg-muted`). Assumption: the mark is the existing current-step orange at a lighter tint, so the table still says which cells belong to the state after the block that listed them has gone. Table text and order are unchanged.
- **Auto-open kept, delayed.** The table still opens itself at the quarry, but once the quarry's feedback lands (0.95 s; at once under reduced motion), not while the model plays the cut. „לטבלת הסיכום” reopens it if the learner closed it, and scrolls to it once it has opened.
- **No axes marker.** The X·Y·Z disc (`AxisGizmo.tsx`, deleted — this was its only use) no longer sits over the model. The existing „גררו לסיבוב” tag in the corner is the cue; it now shows once the model is drawn, not over the loader.
- **The question waits for the model.** The three answers are `disabled` until the „בשטח” board shows the hill: the live model's first frame, or — without WebGL — the still once loaded or failed. Interface copy „אפשר לענות כשהדגם יוצג” sits on the task's label line while waiting (same line, so the panel keeps its height). Loader label „טוען שטח תלת־ממדי…” (the shared pattern).
- Handoff: `design/docs/topic02-relief-feedback-layout-handoff-2026-10-27.md`.

## 2026-10-27 — Lesson 2 › קווי גובה (map labels) and קנה מידה (zoom hint)

Brief: `design/docs/claude-topic02-map-readability-2026-10-27.md`. Handoff: `design/docs/topic02-map-readability-handoff-2026-10-27.md`.

- **The contour map grows instead of its labels.** The first contours card's map goes from 340 to 460 reference px (266 → 360 px at 1440 × 1122), so its 3.4-unit numbers read 12.24 px without changing their size relative to the contours; only the scale-bar text (2.8 → 3.4) and "צ" (3.2 → 3.4) grow in units. The map is now taller than the 3D model's frame (340), and its column sets the card's height (619 → 684 reference px, still under the 704 laptop cap). The hidden key line under the map keeps its slot, so keyboard focus still moves nothing.
- **"מ׳" joins the scale bar's numbers** on their line, to the right of "50", rather than sitting at bar level after the bar's end (where it collided with "50").
- **Zoom hint → accent on + / −.** In the scale lab the hint chip leaves at the first action on the map and never shows while the map takes picks (measure mode). Until the first zoom, the + / − buttons wear the chip's accent outline on their own footprint, the cue that is left without covering a point or the ruler. The sr-only hint text stays the map's description until then.
- **Left as is:** the legend and the explanation lines under the map (HTML, 10.2–11 px on screen at the lesson's scale) are the lesson's standard small text, not data labels. The "מתון" plate covering a stretch of the 10 m contour predates this change.

## 2026-10-27 — Lesson 2: globe and scale-lab tests brought in line with the current behaviour

Brief: `design/docs/claude-followup-test-consistency-2026-10-27.md`. Handoff: `design/docs/topic02-test-consistency-handoff-2026-10-27.md`.

- **The globe opens on 0°, 0°.** The explorer's point (`EXPLORE_START`) and the camera (`VIEW_START`) both open where the equator meets Greenwich, at the user's request of 2026-10-12 (the same request that added the shared 3D loader: "שנקודת ההתחלה תהיה 0,0"). This supersedes, in the 2026-10-12 globe entries above, "Opening view `{lat −3°, lon 72°}`" and "The page still opens on the deck's example (30°S 90°E)". The deck's points stay in `LATLON_ITEMS`; from the opening camera 30°S 90°E is past the limb, and a task on it turns the camera to it.
- **Scale-lab QA measures in two units.** `data-view` (k, x, y) and the component's constants (`CHIP_GAP` = 8) are local px; boxes on screen are those × the lesson's uniform fit (0.7827 at 1440 × 1122). `scripts/qa/shot-scale.mjs` converts between them instead of comparing screen px against local constants. No component value changed.
- **Two pre-existing touches on the contour map stay listed, capped,** in `scripts/qa/contours-legibility.mjs` (`KNOWN_LINE_HITS`): the "מתון" plate over the 10 m contour (39 samples ≈ 7.8 viewBox units) and the 59 plate touching the 50 m contour (1 sample). Any other touch, or either one growing, fails; `--strict` fails on them too.

## 2026-10-27 — Lesson 2 › תרגול: „קוראים את המפה” (cartography-practice)

Brief: `design/docs/claude-topic02-integrated-practice-2026-10-27.md`. Handoff: `design/docs/topic02-cartography-practice-handoff-2026-10-27.md`.

- **A new fictional map, not an existing asset.** No lesson-2 map serves all four tasks from one data source, so the practice draws a schematic sheet in the lessons' map language (`MAP` of `topographyTerrainStyle.ts`, imported, not edited): one height model per scenario → contours, spot heights, slope segments, the ruler and the UTM grid. Marked once: „מפה בדיונית לתרגול”.
- **Two scales.** Scenario A 1:10,000 (10 m interval, 500 m grid), B 1:20,000 (20 m, 1,000 m), so a wrong-scale answer is a real mistake in the second run. UTM numbers lie in a valid zone-36 range; the place is fictional.
- **The ruler is laid by a button** from א towards ב and reads sheet cm (the SVG is drawn in sheet mm), like the scale lab's "ס״מ של דף מודפס". Tolerance = 2 mm on the ruler (±20 / ±40 m), said as „כ־”.
- **Map marks are pointer-only;** the panel's buttons are the keyboard / screen-reader path, and a hidden per-step text gives the map's data (symbols, heights, segment lengths, grid values) without the answer words.
- **One shared-component change:** `LessonShell` listens for `lesson:open-scene` ({ id }) and opens that sub-topic in the learn tab — the summary's review links. Nothing else in the shell changed.
