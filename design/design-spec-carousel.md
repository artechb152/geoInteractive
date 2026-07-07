# Design Spec — Course Plan Carousel ("פרקי הקורס")

Source: `design/carouselMockUpHomePage.png`. This mockup shows a **standalone/expanded view of the course-plan carousel** — likely a larger or dedicated-section variant of the `CoursePlanPanel` / `LessonCard` components already partially specified in `design/design-spec.md` §7 (Components list) and §5 (Course-plan panel spacing). Treat this file as the detailed spec for that carousel component specifically; it does not replace the full-page spec.

Style family: **isometric papercut**, same visual language as the master mockup (warm cream canvas, soft terrain dioramas, orange accent for active/progress state).

---

## 1. Overall layout structure

Single rounded "sheet" panel (not the full page — a self-contained section/card), RTL, containing:

```
┌──────────────────────────────────────────────────────────────────┐
│                                          [◆ divider]  פרקי הקורס  │  header, right-aligned
│                                    המשיזדות בדרך להבנת השטח       │  subtitle, right-aligned
│                                                                    │
│  [07]  [06]  [05]  [04]  [03]  [02*active*]  [01, partially clipped] │  7-up lesson-card row
│                                                                    │
│              ‹  ───────●──────────────────  ›                    │  scrubber / progress bar with drag handle
│                                                                    │
│         גררו ימינה או שמאלה לצפייה בעוד שיעורים  ↔🖱️              │  helper hint, centered
│                                                                    │
│              [ 👁  צפייה בכל השיעורים ]                          │  ghost pill button, centered
└──────────────────────────────────────────────────────────────────┘
```

- Cards read **right→left** in numeric order: 07, 06, 05, 04, 03, **02 (active, highlighted)**, 01 (cut off at the left edge of the viewport, signaling horizontal overflow/scroll).
- The card row is a **horizontally scrollable/draggable carousel** — the drag-hint row (chevron cursor icon + copy) directly below confirms this, plus the scrubber track above it acts as a mini-map / manual scrub control.
- Overall panel corner radius is large (~24–28px), matching the `CoursePlanPanel` radius already defined in the main spec.
- Panel appears to float on the same cream page background (visible as a slightly darker cream margin around the panel edge in the screenshot, ~12–16px).

## 2. Exact visual hierarchy

1. **Active lesson card "02"** — the only saturated/outlined element in the row; orange border, orange "02" number, orange progress fill, "פעיל" (active) badge — strongest visual pull despite not being first in reading order.
2. **Section title "פרקי הקורס"** — largest, boldest text, top-right, anchors the whole panel.
3. **Lesson card numbers ("07"…"01")** — bold, dark, large digits; second-strongest text weight after the title.
4. **Terrain diorama illustrations** — largest visual mass per card, one unique isometric scene per lesson topic.
5. **Lesson titles** (e.g. "קרטוגרפיה קריאת מפות") — bold, medium size, under each diorama.
6. **Progress scrubber bar** — thin but full-width, dark filled segment (~1/3) draws the eye as a secondary progress indicator for the whole course.
7. **Section subtitle** ("המשיזדות בדרך להבנת השטח") — smaller, muted, under the title.
8. **Drag-hint microcopy + cursor icon** — small, muted, supporting/instructional only.
9. **"צפייה בכל השיעורים" ghost button** — outlined pill, lowest-emphasis CTA, bottom center.
10. **Per-card 0% progress bars** (inactive cards) — quietest element, barely visible thin tan tracks.

Accent orange is used exclusively for: active-card border/glow, active-card number "02", "פעיל" badge fill, active-card progress-bar fill, and the small diamond/star bullet in the header divider. Everywhere else stays in the ink/olive/tan/cream palette — consistent with the "orange = action/active only" rule from the master spec.

## 3. Colors (hex, sampled/estimated — reuse existing tokens from `design-spec.md` where they match)

| Token | Hex | Usage |
|---|---|---|
| `--bg-page` | `#F1E7D8` | outer page margin visible around the panel |
| `--surface-panel` | `#F6EFE6` | main carousel panel background |
| `--surface-card` | `#F9F4EA` | individual lesson card fill (inactive) |
| `--surface-card-active` | `#FBF3E4` | active card fill — very slightly warmer/lighter than inactive cards |
| `--ink-900` | `#333D2B` | lesson numbers, section title, lesson titles |
| `--ink-muted` | `#9C9A85` | subtitle, drag-hint copy, "0%" labels, compass-icon glyph in card corner |
| `--accent-orange` | `#D97E2B` | active card border, "02" digit, active progress fill, badge fill, header divider dot |
| `--accent-orange-soft` | `#E3A15C` | active card border (softer variant), active-card outer glow |
| `--badge-text-on-orange` | `#FFF8ED` | "פעיל" badge label text |
| `--border-tan` | `#E3D6C0` | card hairline borders (inactive cards), divider lines either side of header dot |
| `--track-tan` | `#E7DCC9` | inactive per-card progress track, scrubber unfilled track |
| `--track-filled-dark` | `#3A4530` | scrubber filled segment (dark olive-green, ~⅓ from the right) |
| `--track-filled-orange` | `#D97E2B` | active card's own progress-bar fill (60%) |
| `--icon-muted` | `#B7B49C` | small compass/star glyph top-right corner of each card |
| `--button-border` | `#DCCDB2` | ghost pill button border |
| `--nav-arrow-bg` | `#F6EFE6` | prev/next circular arrow buttons, same as panel bg, subtle shadow to lift off track |

Illustration palette (terrain dioramas, per card — for asset briefs): sage/olive greens `#7C8A5C / #5E6B44`, cream cliff-face `#EDE3CE`, muted blue-grey water/cloud (`07` card) `#B9C3C2`, warm tan base `#C9B892`, small orange flag/marker accents on `02` and `04` cards.

## 4. Typography

Hebrew geometric sans, consistent with master spec — **Heebo** (fallback `"Noto Sans Hebrew", Assistant, sans-serif`).

| Element | Size | Weight | Line-height | Color |
|---|---|---|---|---|
| Section title "פרקי הקורס" | 26px | 800 | 1.2 | `--ink-900` |
| Section subtitle "המשיזדות בדרך להבנת השטח" | 15px | 500 | 1.4 | `--ink-muted` |
| Lesson number ("01"–"07") | 34px | 800 | 1 | `--ink-900`; active: `--accent-orange` |
| Lesson title (e.g. "קרטוגרפיה קריאת מפות") | 16px | 700 | 1.3 | `--ink-900`; active: `--accent-orange` |
| "פעיל" badge | 12px | 700 | 1 | `--badge-text-on-orange` on `--accent-orange` fill |
| "התקדמות" label (active card) | 12px | 600 | 1 | `--ink-muted` / brownish |
| "60%" (active card progress) | 13px | 700 | 1 | `--accent-orange` |
| "0%" (inactive cards) | 12px | 500 | 1 | `--ink-muted` |
| Drag-hint copy "גררו ימינה או שמאלה..." | 15px | 500 | 1.4 | `--ink-muted` |
| Ghost button label "צפייה בכל השיעורים" | 16px | 700 | 1 | `--ink-900` |

## 5. Spacing

- Panel outer padding: ~40px inline, ~32px top/bottom.
- Header block (title + subtitle) → card row: ~48px gap.
- Header title and subtitle are stacked with a small ornamental divider (short line – diamond dot – short line) between them, ~8px above the subtitle, ~4px below the title.
- Card row: 7 cards visible (1 partially clipped at inline-end edge, signaling scroll), gap between cards ≈ 14–16px.
- Each **inactive** lesson card: ≈ 168 × 340px; **active** card: ≈ 232 × 380px (taller and wider — it also carries the "פעיל" badge + progress bar, which inactive cards don't have).
- Card internal padding: ~20px all sides.
- Card internal stack: number (top-left within card, opposite the small compass icon top-right) → diorama image (~140px tall) gap ~16px → title gap ~14px → (active only: progress label + bar, gap ~16px above, ~10px between label and bar) → inactive: thin 0% track pinned near card bottom, gap ~16px above it.
- Card row → scrubber bar: ~32px.
- Scrubber track: full panel content width, flanked by circular prev/next arrow buttons just outside its ends (~16px gap track-to-arrow).
- Scrubber → drag-hint copy: ~28px.
- Drag-hint copy → ghost button: ~28px.
- Ghost button internal padding: ~18px inline / ~14px block.

## 6. Border radius, shadows, borders

| Element | Radius | Border | Shadow |
|---|---|---|---|
| Outer panel | 28px | none | `0 8px 24px rgba(90,70,40,0.06)` |
| Lesson card (inactive) | 18px | 1px `--border-tan` (very subtle) | `0 4px 12px rgba(90,70,40,0.05)` |
| Lesson card (active) | 20px | 2px `--accent-orange` (crisp) + soft outer glow in `--accent-orange-soft` | `0 8px 20px rgba(217,126,43,0.18)` |
| "פעיל" badge | 9999px (pill), top-right corner of active card | none | none |
| Scrubber track | 9999px (pill/rounded line) | none | none |
| Scrubber drag handle (dark dot) | circle, full radius | none | `0 2px 6px rgba(40,50,35,0.25)` |
| Prev/next arrow buttons | full circle | 1px `--border-tan` | `0 4px 10px rgba(90,70,40,0.08)` |
| Ghost pill button | 9999px | 1px `--border-tan` | none/very soft |
| Per-card progress track (inactive, 0%) | 9999px | none | none |
| Active-card progress track/fill | 9999px | none | none |

## 7. Components list

1. **CarouselPanel** — outer container (title block + card row + controls + CTA).
2. **CarouselHeader** — title "פרקי הקורס" + ornamental divider (line–diamond–line) + subtitle.
3. **LessonCard** (×7, reused/extended from master spec's `LessonCard`):
   - Corner glyph icon (compass/star, top-end corner, muted)
   - Number ("01"–"07")
   - Isometric terrain-diorama illustration (topic-specific scene)
   - Title (1–2 lines)
   - Progress indicator: **inactive** = thin 0% track; **active** = "התקדמות" label + percentage value + filled bar
   - `active` variant adds: orange border/glow, "פעיל" badge (pill, top-end corner overlapping card edge)
4. **CarouselScrubber** — full-width thin progress/scrub track with a dark filled segment + circular drag handle, flanked by circular **PrevArrowButton** / **NextArrowButton**.
5. **DragHintRow** — muted instructional copy + small hand/drag-cursor icon with a horizontal double-arrow glyph.
6. **GhostPillButton** ("צפייה בכל השיעורים") — outlined pill with eye icon, centered, bottom of panel.

Topics identified (right→left, 07→01): 07 "אקלים ומזג אוויר" (climate/weather — cloud+peak diorama) · 06 "קווי ראייה" (line of sight — single peaked hill diorama) · 05 "ניידות ותמרון" (mobility/maneuver — winding road/river diorama) · 04 "טופוגרפיה ומורפולוגית שטח" (topography/terrain morphology — split terrain-block diorama) · 03 "ניווטים" (navigation — trees + flag diorama) · 02 "קרטוגרפיה קריאת מפות" (cartography/map reading — active, rounded contour mound + ruler diorama) · 01 "מבוא" (introduction — clipped/partially visible flat terrain-block diorama).

⚠️ Content flags (possible mockup typos to confirm before shipping, consistent with the master spec's flag list): "המשיזדות" is not a standard Hebrew word — likely intended as "המשימות" (the missions/tasks); "טופוגרפיה ומורפולוגית שטח" — "מורפולוגית" likely should be "מורפולוגיית" (matches the same flag already noted in `design-spec.md`); confirm "ניווטים" vs. "ניוטים" against the master spec (same lesson, spelled "ניוטים" there — pick one spelling and reconcile both docs).

## 8. Assets / icons / images needed

**Illustration assets (papercut isometric dioramas, ~7 total, ~150–180px @2x each, transparent background):**
- 07 climate/weather: layered terrain block topped with cloud + human figure silhouette.
- 06 line of sight: single conical hill with visible sightline/shadow wedge.
- 05 mobility/maneuver: terrain block with winding tan road/river path.
- 04 topography/morphology: split two-piece terrain block (valley cross-section) with small orange marker.
- 03 navigation: terrain block with small trees + orange flag marker.
- 02 cartography (active): rounded contour-line mound + dark ruler/scale bar overlay.
- 01 introduction: flat multi-layer terrain block (partially visible in mockup, needs full crop confirmed).

**Vector/UI icons (SVG, stroke, `--ink-muted`/`--ink-900`):** small compass/star corner-glyph (repeated per card, top-end corner), eye icon (ghost button), left/right chevron (prev/next arrows — note RTL: visual "‹" = previous/older, visual "›" = next/newer, or vice versa per existing carousel direction rule in master spec), drag/hand cursor icon with horizontal double-arrow (drag-hint row).

**No new color tokens required** — all colors map to existing/adjacent tokens from `design-spec.md`'s approved palette (paper/olive/ember/tanline family); confirm exact hex reconciliation during implementation via pixel sampling of this specific PNG.

## 9. Responsive behavior (assumptions — not shown in mockup)

- **≥1280px:** as specced — 7 cards visible per viewport width, active card taller/wider, overflow via drag/scroll plus scrubber.
- **1024–1279px:** reduce visible cards to ~5–6 by scaling card width down slightly (~150px) rather than changing card count logic; scrubber and drag-hint remain.
- **768–1023px:** ~3–4 cards visible, horizontal scroll-snap; consider hiding the scrubber drag handle in favor of simple momentum scroll, keep prev/next arrows.
- **<768px:** ~1.5–2 cards visible (peek pattern) in a horizontal snap scroller; ghost button and drag-hint copy remain full-width/centered; active card still visually distinct via orange border.
- Terrain dioramas scale proportionally with card size; never crop the number or title text.

## 10. RTL requirements

- Whole component `dir="rtl"`. Reading order right→left: numbers descend 07→01 as you move visually rightward→leftward, meaning **lesson 01 is chronologically first but sits at the visual-left/far end**, while the highest numbers sit at inline-start (visual right) — confirm this matches (or intentionally reverses) the master spec's carousel note ("01 at inline-start (visual right), 05 at far left"); here it's 01 at the *far left* (clipped) and 07 at inline-start (visual right), i.e. **descending left→right is reversed from ascending numbering** — reconcile which lesson should sit at inline-start against the full course's lesson order (master spec only defines 01–05; this mockup shows 01–07, so the course may have grown to 7 lessons — flag for content team).
- Use logical properties only (`margin-inline-*`, `inset-inline-*`, `text-align: start`) — no `left-`/`right-` absolutes, per project rule.
- "פעיל" badge sits at the card's inline-end corner (visual top-left in this RTL layout) based on the mockup — verify exact corner during implementation.
- Prev/next arrow buttons: the chevron pointing left (visual) = "further into the list" (RTL forward), consistent with master spec's chevron convention; do not mirror.
- Numbers ("01"–"07", "60%") render as LTR digit strings inside RTL text — standard Unicode bidi handles this automatically.
- Diorama illustrations must not be mirrored for RTL (project rule: never mirror maps/terrain).
- Any inline SVG `<text>` (e.g. within the compass-glyph icon or scrubber) must set `text-anchor` explicitly per the project's known RTL clipping bug.
