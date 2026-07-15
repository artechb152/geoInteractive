# Design Spec — Topic 03 (ניווטים), Scenes 1–5

Source images: `design-references/topic-03/scene-{hook,onboarding,principles,planning,combatnav}.png`.
Token source of truth: `tailwind.config.ts` (NOT `docs/palette.md` / `VISUAL_IDENTITY.md`, which are stale — see research brief). Resolved palette used below:

| token | hex | role |
|---|---|---|
| `bg` | `#F3E9DC` | page canvas |
| `bg-elevated`/`bg-card` | `#FFFFFF` | cards |
| `bg-accent` | `#F6EFE6` | subtle tint (chips, hover, grid tiles) |
| `border` | `#DCCDB2` | hairline |
| `border-subtle` | `#ECE4D2` | faint hairline |
| `border-strong` | `#C9A56B` | stronger tan line (map grid, contours) |
| `fg` | `#38432E` | ink (headings, body) |
| `fg-muted` | `#4A5240` | secondary text |
| `fg-dim` | `#8A8873` | tertiary / labels |
| `accent` | `#D97E2B` | orange — action + active only |
| `accent-hover` | `#E08A38` | orange lighter |
| `brand` / `brand-dark` | `#749C75` / `#5B7C5C` | sage — secondary emphasis, safe/passed states |
| `status-danger` | `#ef4444` | exposed/risk cue |
| `status-ok` | `#4ade80` | passed/complete cue |
| shadow `elevated` | `0 6px 18px rgba(90,70,40,.07)` | card shadow (very soft, matches "צללים רכים מאוד") |

Locked across all 5 scenes (never touch, confirmed present identically in every mockup crop): main header (compass logo + "גיאוגרפיה צבאית" + tagline, bell + person icons), right-side scene sidebar (TOC pills, orange dot + orange text = active), page canvas cream color, RTL reading order. These are rendered by `PagedLearn.tsx` / the app shell — out of scope for all 5 scene files.

---

## 1. HookScene → `scene-hook.png`

**Layout**: Full-bleed cartographic field, not a centered hero card. A real topographic/grid map fills the *entire* viewport behind the content — visible coordinate ticks (`232000…237000` top, `7421000…7424000` left, in small mono-ish tan numerals), faint contour hachures across the whole canvas (not just a soft vignette blob like current `BackdropTerrain`).

**Hierarchy**:
1. Giant pale "03" numeral, top-right of the map area (currently top-left/center in code) — huge (~140px), low-contrast sage/tan `fg-dim`-ish tone, sits behind/beside content, not literally behind the title.
2. Large compass rose (full 360° tick ring with N/E/S/W-style tick marks + degree labels 0/30/60…330, cardinal cross lines) at left-center — a real navigational instrument, bigger and more detailed than the current 4-contour-ring backdrop.
3. H1, 2 lines, right-aligned (not centered!): "להגיע ליעד בדיוק מושלם," / "גם כשהטכנולוגיה מפסיקה לעבוד." — dark olive ink, bold, ~44–48px.
4. A short horizontal divider rule with a small 4-point star/compass glyph centered on it, between H1 and the sub paragraph.
5. Sub paragraph, 2 lines, right-aligned, muted ink, ~17–18px — exact existing copy.
6. Primary CTA button, solid orange, rounded (~10–12px radius), left-aligned under the text block (not centered) with a leading arrow glyph "→" before the label: "לחץ כדי להתחיל".
7. A dashed orange route (hand-drawn wavy line, not straight) runs diagonally from a small dot near bottom-left up to a "bullseye" concentric-ring target marker near top-right, with an arrowhead at the end. This is a large, prominent map furniture element — much bigger/more central than current code's small subtle line.
8. Bottom-right: a small "N" arrow compass indicator + a horizontal scale bar ("0 250 500 750 1000 מ'"), i.e. real map-legend furniture, bottom-right corner.

**Typography**: title/body match current code's copy (H1 uses `gradient-text`/`text-accent` for 2nd line in code — **mockup shows BOTH lines in the same dark ink color, no orange gradient on line 2**). Flag this delta explicitly.

**Colors**: everything on the cream `bg` field; ink `fg` for text; orange `accent` used ONLY for the CTA button, the route dashes, and the target bullseye — not for any heading text.

**Spacing**: content column sits right-of-center, roughly the right ~45% of the viewport; map furniture (grid ticks, coordinates, compass, "03") occupies the left/full width.

**Components**: needs a much richer `BackdropTerrain` SVG (full coordinate-grid map with axis tick labels, larger compass rose with degree ticks, dashed route with target bullseye, N-arrow + scale bar) — all decorative/`aria-hidden`, all `fill`/`stroke` from existing tokens (tan/sand/olive), no new hex.

**Interaction states**: CTA hover → `accent-hover`; CTA still fires `learn:next` — unchanged.

**RTL**: text stays right-aligned (current code centers it — mockup is right-aligned to match the 2-column feel of the rest of the course). Coordinate ticks/compass must not mirror.

**Locked**: header, single CTA → `learn:next`, exact copy.

**Assets required**: none — all can be hand-drawn SVG matching existing terrain/contour drawing patterns already used elsewhere in the codebase (`OnboardingScene`'s hill/palm illustrations, `PlanningScene`'s `RouteMap`).

**Viewport**: mockup crop is ~16:9 (1560×1000-ish), near-fullscreen, matches `LESSON_STRUCTURE_GUIDE.md`'s `min-h-[88vh]` Hook convention — keep existing `min-h-[calc(100dvh-var(--header-h)-5rem)]`.

---

## 2. OnboardingScene → `scene-onboarding.png`

**Layout**: Long single column, `max-w` centered, matches current `max-w-6xl mx-auto` wrapper. Sections top→bottom: SceneHeader (eyebrow+H1+intro) → 2-column module (steps list ~40% | map/stage ~60%) → divider with centered text → 2×2 grid of historical example cards → bottom "ready" callout band → (prev/next handled by `PagedLearn`, out of scope).

**Header block** (delta vs current shared `SceneHeader`): mockup shows, in order: small muted eyebrow "לפני שמתחילים" (centered, `fg-dim`, ~14px, plain — not letter-spaced caps), then bold dark H1 "ניווט מבצעי: הרבה מעבר לקריאת מפה" (2 lines, ~34px), then intro paragraph (matches code's `intro` text exactly). **Current shared `SceneHeader.tsx` no longer renders `eyebrow`/`step` at all** (see comment at `src/components/lesson/SceneHeader.tsx:9-10`) — this is the single biggest structural delta across all 4 content scenes. Since that file is a shared cross-topic component, do not edit it; build a local topic-03 header (see implementation-plan.md).

**Steps module** (left column in mockup = right-aligned first in RTL): 4 numbered step rows exactly as coded (`STEPS` array) — mockup shows them as a **flat vertical list with chevron-expand affordance**, each row: circular numbered badge, label, chevron. First row ("1 תכנון: המלחמה על המפה") is expanded showing body copy — matches current accordion behavior closely. Keep accordion mechanics unchanged.

**Map/stage module** (right column): mockup shows a proper illustrated topo map (grid, elevation contour rings, a hill icon labeled, orange dashed direct-route + solid safe-route, A/B markers) inside a bordered card with visible map furniture (compass rose N-indicator bottom-right, scale bar bottom). Current `MissionStage` SVG is close in spirit (hill + palm landmarks, A/B points, phase overlays) — mostly a styling/border/chrome pass, not a rebuild. Card needs a visible border + corner radius matching `surface-elevated`.

**Divider**: "ניווט גרוע = חיים בסכנה" centered on a horizontal rule with small diamond/star glyphs each side — matches current `SoftDivider` in spirit; mockup adds a small ornament glyph, current code is plain rule — minor addition.

**Historical example cards (2×2 grid)** — **major structural delta**. Mockup card anatomy, per the user brief and visual read of all 4 cards:
- Top-left: small muted subtitle line = place/date (e.g. "נגב · אלפי שנים") — **not at the bottom** as current `IntelCard` puts it.
- Top-right: a monoline icon (star/pine-trees/satellite-x/pin-burst — matches each card's theme), no colored background chip behind it, just the glyph in ink/muted tone.
- Middle: bold headline, 2 lines (e.g. "לנווט עם החושים: סוד המדבר").
- Short horizontal orange rule under the headline (current `IntelCard` uses a **sage** rule, not orange — delta).
- Bottom: full body paragraph, regular weight, `fg`/`fg-muted`.
- Surface: same card-surface color as the rest (`bg-elevated`/white), thin sand (`border`) hairline all around, very soft `shadow-elevated` — current `IntelCard` (`variant="editorial"`) is intentionally borderless/shadowless (a shared, deliberate site-wide pattern for other topics) → this is a shared-component conflict, must build a **local** topic-03 card, not edit `IntelCard.tsx`.

Card order/content unchanged: סוד המדבר (נגב), יער הוורטגן (גרמניה 1944), המלחמה המודרנית (אוקראינה 2022+), ניווט תחת אש (דרום לבנון 1997).

**Bottom "ready" band**: mockup shows a full-width, softly-tinted band (slightly darker/warmer than page bg — reads as `bg-accent` `#F6EFE6` or similar, NOT white) with: bold title "עכשיו אתם מוכנים" top-left of the band's text column, 4-line bullet-style body copy, and a circular badge/shield-check icon docked at the band's inline-end (right, since RTL). Current shared `ReadyCallout` is a **white `bg-elevated`** card with no icon — delta on background tint + icon. Same shared-component conflict as `IntelCard`: build local topic-03 variant, don't edit `ReadyCallout.tsx`.

**Colors**: eyebrow `fg-dim`; H1 `fg`; step numbers active = `accent`/`brand-dark` (keep current); example-card icons `fg-muted`; orange rule `accent`; band background `bg-accent` (#F6EFE6).

**Interaction states preserved exactly**: 4-step accordion (click toggles expand + sets active phase; map/stage reacts to `phase`), all copy verbatim.

**RTL**: first grid column (steps) sits at the visual right; example-card icon top-right = inline-start in RTL (correct, matches "chevrons point left" convention — icon at visual-right = text/logical-start side, needs `Icon` positioned with `start-`/`ms-` not `right-`).

**Assets required**: none — icons come from existing `Icon`/`IconName` set (star, compass/pine substitute, satellite, crosshair — already used in `HISTORICAL` array).

**Responsive assumption**: steps-list/map stack to single column below `md`, example cards go 1-up below `sm` — consistent with existing `grid md:grid-cols-[2fr_3fr]` / `grid sm:grid-cols-2` already in code.

**Locked**: exact STEPS/HISTORICAL copy, accordion mechanics, phase→map sync, `ReadyCallout` title text.

---

## 3. PrinciplesScene → `scene-principles.png`

**Layout**: same `max-w-6xl` column. Top→bottom: SceneHeader (eyebrow "עקרונות הניווט" in **orange**, small-caps tracked — delta vs onboarding's muted eyebrow, confirms eyebrow color is NOT uniform across scenes, it's contextual) → H1 → intro → a 2-column "GPS-Denied vs Azimuth" definition strip (icon+text pairs, no card border, just a vertical divider between the two — lighter treatment than current's two heavy `surface-elevated` boxes) → **AzimuthExplorer module** (big bordered panel: left = live readout+slider+back-azimuth, center = large compass dial, right = small info callout "מתי משתמשים באזימוט חוזר") → **ThreeNorths module** (3 stacked selector rows on the left, small diagram top-right, explanation panel below the diagram) → **GPS-Denied module** (single continuous explanatory strip: intro paragraph left, 3 icon+text items right — user brief explicitly wants this as "one continuous system," not 3 generic cards) → conclusion card.

**AzimuthExplorer delta**: current code splits it `lg:grid-cols-[1.2fr_1fr]` (readout column | dial column). Mockup shows 3 zones: readout+slider (left, ~35%), big compass dial (center, ~40%), a boxed callout card (right, ~25%, orange-tinted border, info-icon header "מתי משתמשים באזימוט חוזר?"). Whole module sits inside one continuous bordered board (title "מחקר אזימוט" + target/crosshair icon at top), not the current split of "surface-elevated (readout)" + separate small "surface" tip card below it. Needs restructuring into 3-column board layout ≥lg, single board chrome instead of 2 separate surfaces.

**ThreeNorths delta**: mockup's 3 north-type selectors are stacked **vertically** as full-width rows (icon-in-box left + Hebrew/English label pair), not the current 3-up horizontal `sm:grid-cols-3` mini-cards. Diagram (3 arrows from one origin with angle arcs + labels "6.2°", "2.3°", "סה״כ 8.5°") sits top-right; explanation text panel (colored by active selection) sits to the diagram's right in mockup — current code puts the explanation panel to the *left* of the diagram, selectors below — needs re-layout to: selectors (right column, stacked) | diagram+explanation (left column) per mockup's visual grouping. Keep exact selection mechanics (click → updates active + diagram + explanation).

**GPS-Denied delta**: mockup = one wide strip, intro copy on the right (~40%), 3 icon-over-text mini-columns on the left (not stacked cards with colored icon-chip boxes like current `GpsDeniedCard`'s `size-10 rounded-xl bg-status-danger/10` icon chips) — icons plain monoline in a row above each short title+desc, no colored background box behind icons (matches user's explicit requirement: "ללא רקע צבעוני מאחורי האייקון" — wait, that line was specified for Onboarding's example cards; for GPS-Denied the brief just says "רצועת הסבר רחבה אחת" — one wide strip, not 3 generic cards. Current code already avoids being "3 generic cards" by using a shared bordered container with 2-col grid inside — mostly compliant already; the main fix is layout proportions + icon treatment lightening, not a rebuild).

**AzimuthExplorer / dial**: keep `CompassDial`, `CompassNeedles`, smoothed-angle spring mechanism, 47°/227° defaults, real-time slider — 100% unchanged logic, only the surrounding chrome/grid layout changes.

**Colors**: eyebrow = `accent`; dial forward needle = `accent` solid, back needle = `accent-cool`/dashed (unchanged); north-selector active border = per-north color already coded (`accent-hot`/`accent`/`accent-cool`) — keep.

**RTL**: angle-arc diagram labels need `textAnchor` verified explicit (already is, per `paintOrder` halo pattern in code).

**Assets**: none.

**Locked**: azimuth default 47°, back-azimuth formula/227°, 3-north data (declination 6.2°/2.3°/8.5°), GPS-Denied 3 reasons, all copy.

---

## 4. PlanningScene → `scene-planning.png`

**Layout**: `max-w-6xl` column. Top→bottom: SceneHeader (eyebrow "תכנון ציר ותנועה", orange) → H1 → intro → 2-col concept strip (Route Story / "בחושך, המוח עובד פחות") **as a lighter icon+text pair strip**, same delta pattern as Principles' top strip (mockup is NOT two heavy bordered boxes — it's a light 2-column strip with a small illustrative glyph left of each, divider between) → **RouteStoryBuilder module title band** "בנו את סיפור הדרך שלכם (Route Story Builder)" with a small cursor/click icon, centered, ABOVE the map+checkpoint-list module (current code has no such title band — delta: add one) → RouteStoryBuilder (checkpoint list right ~35% | big illustrated topo map left ~65%, inside one bordered board with legend box bottom-left-of-map) → **PacingDemo module**, restyled to mockup's centered-title + 2-column (slider+readout left | big equation-card right showing "500 ÷ 1.5 = 333") layout, plus a 2-row info strip below (כיוונון מראש / התאמה לשטח, each with icon left) → "למה זה חשוב?" closing strip (icon-led, 2-line copy) → (ConclusionCard in code may fold into this "why it matters" strip — verify against mockup wording, likely same content different framing — keep exact copy either way).

**RouteStoryBuilder delta**: current `feature` string per checkpoint (e.g. "אזימוט 070° (מזרח)...") is one dense paragraph blob. Mockup shows checkpoint rows with the **azimuth+distance pulled out as a compact leading line** ("070° | כ-400 מ'") and the descriptive text as a second, shorter line — a visual restructuring of the *same* string, not new data. Since `feature` is a single string in code (locked data), format it visually as: number badge, title line, then the same string as body text (current behavior) — acceptable to keep as one paragraph if splitting cleanly isn't safe without inventing parsing; document as an assumption if the exact split can't be derived losslessly from the existing single string. Map itself: keep `RouteMap` hand-drawn SVG (river/wadi, saddle, dirt road, pine grove, orange route reveal tied to `activeStep`) — it already matches the mockup's terrain content closely; needs legend box (mockup shows a small boxed legend bottom-left: dashed-red "מסלול ישיר" / solid-green "מסלול עוקף" style — **note**: PlanningScene's own legend content differs, `RouteMap` doesn't currently render an in-SVG legend box at all — this is present in the *Onboarding* mission-stage mockup's route-comparison, not necessarily required here; re ‌verify against the actual `scene-planning.png` legend, which reads "מסלול ישיר וקצר (חשוף)" dashed-orange / "מסלול עוקף ומוגן (מוגן)" solid-dark-green — **this legend belongs to the mockup's OWN illustrative "concept" map at the top of the page (the 2-route A→B diagram), which the current PlanningScene code does not render as a separate concept visual at all** — flag as a possible missing top-of-page illustration; see assumptions.md.

Re-reading the mockup layout carefully: `scene-planning.png` top region (below intro) shows a **first illustrated map** (A→B with both a short direct dashed-red route AND a long protected solid-green route, legend box bottom-left) — this is the "route story" *concept illustration*, separate from the interactive 5-checkpoint `RouteStoryBuilder` map below it. Current code's `RouteStoryBuilder` is the ONLY map in the scene. Treat the top concept illustration as new decorative content to add (matches `COURSE_DNA`'s "concept: what/why" pattern already established — the 2-col strip below the header IS the what/why text; mockup pairs it with a small illustrative crop, not a full board). Keep scope conservative: enhance the existing 2-col concept strip with a compact illustrative glyph/mini-diagram rather than building a second full interactive map, to avoid inventing new interactive surface area beyond what's asked. Document this scoping choice in assumptions.md.

**PacingDemo delta**: current layout = slider+readout (left) | result-box (right), 2×2 info grid below. Mockup: same 2-column split but the right "result" box shows the full equation "500 ÷ 1.5 = 333 זוגות צעדים" prominently (current code shows just the big number "333" + smaller equation caption below) — promote the equation to be visually primary alongside/above the big number, still same computed values, unchanged math. Below-slider info tiles (מראש/שטח) match already (icon + short copy, 2-up grid) — light styling delta only (mockup icons sit above text in a small vertical stack per tile vs current's icon-left row — verify on screenshot, low-priority delta).

**Colors/typography**: identical token usage throughout — orange accent for active/route, sage for "safe/protected" cues, olive ink text.

**RTL**: `PacingDemo`'s slider tick labels already positioned via `right:` percentage math tied to RTL — keep as-is (already correct, don't "fix" into a bug).

**Locked**: all 5 checkpoint azimuth/distance values, `stepLength=1.5`, default `distance=500` → `333` pairs, all copy strings verbatim.

**Assets**: none required if the top concept illustration is scoped as a compact SVG glyph (buildable inline, matches existing hand-drawn SVG conventions) rather than a full second map.

**Viewport**: this is the longest page in the lesson — full-page screenshot required, no 16:9 cropping per project rules.

---

## 5. CombatNavScene → `scene-combatnav.png`

**Layout**: `max-w-6xl` column, but here the module is `lg:grid-cols-[1fr_1.7fr]`, board on the **right** (inline-end / visual-left in RTL — wait, verify: mockup shows the accordion methods list on the **right** side (visual right = RTL start) and the explanation board on the **left** — matches current code's `grid lg:grid-cols-[1fr_1.7fr]` where accordion is the first grid child (→ right in RTL) and board is second (→ left) — **layout already correct**, this scene is the closest match to the mockup of all 5.

**Header**: eyebrow "ניווט קרבי" sits as a plain, small, centered line ABOVE and OUTSIDE the normal H1 flow, more like a page-context label than the orange tracked-caps eyebrow style seen in Principles/Planning — re-verify exact weight/color on first screenshot; current shared `SceneHeader` renders neither eyebrow nor step regardless, so this is part of the same header-restoration work as scene 2–4.

**Accordion list delta**: mockup's **first row (טכניקה 1, "Handrailing / הליכה לאורך מעקה") is OPEN by default** showing full body (matches code default `useState<Method>('handrail')` ✓ already correct) — but mockup shows an explicit **chevron-up caret** at the far right of the open row (current code has no chevron on `CombatNavScene`'s accordion rows at all — it only shows the numbered badge + label, no expand/collapse indicator). Add a rotating chevron matching the `OnboardingScene`/`PrinciplesScene` accordion pattern already established elsewhere in this same topic, for visual + `aria-expanded` consistency.

Closed rows (2, 3) mockup shows: number badge, English/Hebrew label pair, small inline icon-preview (clock+arrow for Dead Reckoning, wavy-path for Pace&Path) to the *left* of the text — current code has no such mini-icon on collapsed rows. This is a nice-to-have visual enrichment; keep in scope only if it doesn't risk the "one method open at a time" mechanic — purely decorative addition, safe.

**Board delta**: mockup board header shows a plain "1" numeral badge + title, no "הסבר חזותי" kicker line and no "טכניקה 1" chip visible in the same place as current code's chip — layout is close but chip placement/kicker wording needs a screenshot-driven comparison pass (low risk, cosmetic).

**Diagram delta**: mockup's Handrailing diagram is a full painterly topo-terrain illustration (contour hachures, A/B pins, dashed-red exposed line, solid route with directional arrows, a callout box "דוגמה נוכחית" describing the scenario) — current `HandrailVisual` is a lighter abstract diagram (ridge band + route + labels, no terrain hachures, no callout box). **Missing element**: mockup has a dedicated "דוגמה נוכחית" (current example) callout box in the accordion panel body/board — verify whether this maps to the existing `example` field already in `METHODS[].example` (it does — `example: 'אנו צועדים...'`) which current code DOES render inside the accordion's expanded panel ("דוגמה" heading + `m.example` text) — so content-wise this is already present, just needs the board-side visual callout treatment the mockup shows (a highlighted box, not the current plain paragraph under "דוגמה" heading in the accordion — or possibly it's fine as-is in the accordion and the mockup's board callout is a duplicate emphasis; treat as a styling enhancement to the existing accordion "דוגמה" block: give it a highlighted `surface`/tinted-background treatment instead of plain text, matching mockup's boxed look).

**Legend**: mockup's map-legend box (bottom-left of the diagram) lists: dashed-red "קו ישר (חשוף)", solid-orange "מסלול בטוח לאורך מעקה", dashed-black "פנייה קצרה ליעד", plus terrain glyphs "רכס / קו רכס" and arrow "כיוון תנועה" — this maps directly onto the existing `SUPPORT.handrail.legend` array already coded with equivalent items — content match confirmed, only visual box/grid styling to align (mockup groups legend in a bordered box overlaid bottom-left ON the map; current code renders legend as a plain list below the diagram, inside the board's lower text area) — this is a genuine layout delta: mockup's legend is a compact overlay box docked in a map corner; current is a full-width list under the caption. Redesign the legend presentation as a compact corner box for closer match while keeping exact same legend data/order.

**Colors**: matches existing `status-danger` (exposed/red dashed), `accent` (safe/orange route), `brand`/`terrain-ridge` (ridge/handrail), all already used correctly in code.

**Locked**: 3 METHODS data verbatim, `SUPPORT` legend data verbatim, single-open accordion mechanic, per-method diagram swap, conclusion text.

**Assets**: none — enhance existing hand-drawn SVGs (`HandrailVisual`, `DeadReckoningVisual`, `PaceControlVisual`) with terrain hachure texture + corner legend box; no new raster/vector asset files needed.

**Viewport**: mockup crop is roughly 16:9/slightly taller — matches project's "16:9 or a bit taller if needed" instruction for this scene.

---

## Cross-cutting structural finding: SceneHeader eyebrow

All 4 content-scene mockups (Onboarding/Principles/Planning/CombatNav) render an eyebrow-style label above the H1 that the current **shared** `src/components/lesson/SceneHeader.tsx` explicitly stopped rendering (`step`/`eyebrow` props kept only for backward-compat, per its own doc comment). This file is shared across every topic in the course and is off-limits to edit per the task's locked-files list. Per the task's shared-change protocol: build a **local** header component inside `topic-03/` (new file, e.g. `topic-03/SceneEyebrowHeader.tsx`, or repurpose `topic-03/SceneHeader.tsx` — currently just a 1-line re-export of the shared component and therefore itself a "local file intended only for these five scenes") — and document the shared-component conflict in `shared-component-candidates.md`.

## Cross-cutting structural finding: IntelCard / ReadyCallout

Both are shared components (`src/components/lesson/IntelCard.tsx`, `.../ReadyCallout.tsx`) explicitly documented in their own source comments as deliberately-borderless/iconless patterns "every other lesson's OnboardingScene relies on." Topic 03's mockup wants a bordered, icon-bearing, differently-ordered card. Do not edit the shared files — build local topic-03-only replacements (precedent: `topic-01/HistoricalStoryCard.tsx`, an unmerged sibling doing the same thing for the same reason). Document in `shared-component-candidates.md`.

## Assumptions requiring sign-off

See `assumptions.md` for the running list (PlanningScene's top concept-illustration scoping, CombatNavScene board-chip wording, exact eyebrow color per scene, checkpoint-string visual splitting).
