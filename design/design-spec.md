# Design Spec — Landing Page "גיאוגרפיה צבאית"

Source: `design/mockup.png` (1402 × 1122 px → treat as desktop design frame at ~1400px; measurements map ≈1:1 to CSS px).
Style family: **isometric papercut** (matches approved visual direction). Colors below were pixel-sampled from the mockup.

---

## 1. Overall layout structure

Single-viewport landing page, full RTL, on a warm cream canvas with faint topographic contour-line texture. The whole page reads as one rounded "sheet" (page container has ~40px rounded corners against the browser canvas).

Vertical stack of 4 bands:

```
┌────────────────────────────────────────────────────────────┐
│ ① HEADER   [utility icon-buttons]……………………[brand: title+logo]│  y ≈ 30–135
│                                                            │
│ ② HERO     [isometric terrain diorama]   [badge]           │  y ≈ 140–560
│            (left ~55% width)             [H1 ×2 lines]     │
│                                          [sub ×2 lines]    │
│                                          [CTA primary]     │
│                                          [CTA secondary]   │
│                                                            │
│ ③ FEATURES  [card][card][card][card]  (4-up, equal width)  │  y ≈ 570–745
│                                                            │
│ ④ BOTTOM    [course-plan panel ~66%]   [progress card ~28%]│  y ≈ 785–1122
│             (lesson carousel 05…01)    (dark, sticky-feel) │
└────────────────────────────────────────────────────────────┘
```

- Content gutters: ~48–65px from page edge; effective content width ≈ 1290px, centered.
- Bottom band is a 2-column grid: course-plan panel ≈ 940px, progress card ≈ 370px, gap ≈ 16px. In RTL the **progress card sits at the inline-start (right)?** — No: in the mockup the progress card is on the **right** side of the frame (x ≈ 985–1355) and the course-plan panel on the left. Since the page is RTL, the progress card is the *first* (inline-start) column.
- Hero is a 2-column arrangement: text column right (inline-start, x ≈ 1010–1330), illustration left (x ≈ 80–770), overlapping the free background — the diorama is not boxed.

## 2. Visual hierarchy (exact reading order)

1. **H1** "הבנה מרחבית. יתרון מבצעי." — largest, darkest element; two stacked lines, right-aligned.
2. **Isometric terrain diorama** — largest visual mass, balances the H1.
3. **Primary CTA** (solid orange "המשך ללמוד") — only saturated fill on the cream field.
4. Hero sub-headline (2 lines) → secondary CTA.
5. Progress card (dark green block — strongest value contrast below the fold line) with the 35% ring as focal point.
6. Feature cards row (4 equal peers, icon-led).
7. Course-plan carousel; **lesson 01 is visually promoted** (orange border + orange text) over lessons 02–05.
8. Header brand (top-right) and utility buttons (top-left) — quietest layer.

Accents: orange is used *only* for action/active (CTAs, flag, active lesson, "01", route dashes, next-lesson border). Never decorative elsewhere.

## 3. Colors (sampled hex)

| Token | Hex | Usage |
|---|---|---|
| `--bg-page` | `#F3E9DC` | page canvas (slightly lighter `#F4E9DC` top → `#F0E5D6` bottom) |
| `--bg-contour` | `#C9A56B` @ 18–25% opacity | faint topo contour lines + dashed route on canvas |
| `--surface-card` | `#F8F2E7` | feature cards, lesson cards, secondary button, pill buttons |
| `--surface-panel` | `#F6EFE6` | course-plan panel (barely darker than cards inside it — cards read lighter) |
| `--ink-900` | `#38432E` | H1, titles, primary text (samples `#2F392B`–`#43513A`) |
| `--ink-700` | `#4A5240` | hero sub-headline, button labels on light |
| `--ink-muted` | `#8A8873` | card subtitles, lesson subtitles, header sub-line |
| `--accent-orange` | `#D97E2B` | primary accent; CTA fill is a subtle vertical gradient `#E08A38 → #C96714` |
| `--accent-orange-deep` | `#C96714` | CTA bottom edge, chevrons |
| `--accent-orange-soft` | `#D69051` | active-lesson border, outlined-button border on dark |
| `--dark-card` | `#2E3826` | progress card; gradient `#374133` (top-left) → `#283223` (bottom-right) |
| `--ring-arc` | `#A3A832` | progress arc (olive-lime) |
| `--ring-track` | `rgba(255,255,255,0.16)` | progress ring track |
| `--border-tan` | `#DCCDB2` | 1px borders: badge, secondary button, card hairlines |
| `--text-on-dark` | `#FDFBF3` | white-cream text on dark card |
| `--badge-text` | `#8A6F4D` | badge chip label (warm brown) |

Illustration palette (for asset briefs, not UI): terrain greens `#6E7A4E / #55613C / #8A9163`, river `#7FB4C6`, papercut edge cream `#E8DCC4`, base rim `#C9B892`.

## 4. Typography

Hebrew geometric sans; letterforms are angular with flat terminals — best match **Heebo** (fallback: `"Noto Sans Hebrew", Assistant, sans-serif`). One family, weight-driven hierarchy.

| Element | Size | Weight | Line-height | Color |
|---|---|---|---|---|
| H1 hero (×2 lines) | 60px | 800–900 | 1.12 | `--ink-900` |
| Hero sub (×2 lines) | 24px | 600 | 1.4 | `--ink-700` |
| Brand title "גיאוגרפיה צבאית" | 28px | 800 | 1.2 | `--ink-900` |
| Brand sub "למי שמבינים מרחב מנצחים" | 15px | 500 | 1.3 | `--ink-muted` |
| Badge chip | 14px | 600 | 1 | `--badge-text` |
| Buttons (all) | 18px | 700 | 1 | white on orange / `--ink-900` on light / cream on dark |
| Feature card title | 19px | 700 | 1.3 | `--ink-900` |
| Feature card subtitle | 14.5px | 400 | 1.45 | `--ink-muted` |
| Section title "תכנית הקורס" | 22px | 700 | 1.2 | `--ink-900` |
| Lesson number "01…05" | 24px | 700 | 1 | `--ink-900`; active: `--accent-orange` |
| Lesson title | 16px | 700 | 1.3 | `--ink-900`; active: `--accent-orange` |
| Lesson subtitle | 13px | 400 | 1.4 | `--ink-muted` |
| Progress title "התקדמות שלך" | 22px | 700 | 1.2 | `--text-on-dark` |
| "35%" | 46px (the "%" ~24px) | 800 | 1 | white |
| "הושלם" / "סיימת 4 מתוך 12 שיעורים" | 16px / 17px | 500 | 1.4 | `--text-on-dark` @ ~90% |
| Utility pill labels | 14px | 600 | 1 | `--ink-900` |

## 5. Spacing

- Page padding: 48px inline / 30px top.
- Header → hero: ~24px. Hero → features: ~40px. Features → bottom band: ~40px. Bottom band → page end: ~0 (panel bleeds to bottom rounding).
- **Hero text column** (width ≈ 320px, right-aligned): badge → H1 gap 20px; H1 → sub 24px; sub → primary CTA 44px; primary → secondary CTA 16px. CTAs are full column width (~315px), heights 50px / 48px.
- **Feature cards**: 4 equal columns, gap 14px; card ≈ 305 × 175px; internal padding 24px; icon (≈72px tall) → title 12px → subtitle 6px; content centered.
- **Course-plan panel**: padding 24px; header row (title + book icon, centered) → cards 20px; lesson cards gap 14px, each ≈ 150 × 215px (active card ≈ 150 × 250px, taller); cards → "view all" button 20px. Carousel prev-chevron vertically centered at the panel's inline-end (left edge).
- **Lesson card** internal: number top 12px, icon ≈ 90px, title, subtitle; padding 12px; centered.
- **Progress card**: padding 28px; title → ring 24px; ring Ø ≈ 170px, stroke ≈ 10px; ring → caption 20px; caption → button 20px; button full width, height 44px.
- Utility buttons (header left): ≈ 92 × 98px each, gap 12px; icon 24px above 14px label, 10px apart.

## 6. Radius, shadows, borders

| Element | Radius | Border | Shadow |
|---|---|---|---|
| Page sheet | 40px | none | none (sits on browser bg) |
| Feature / lesson cards | 18–20px | none (hairline `--border-tan` @40% optional) | `0 6px 18px rgba(90,70,40,0.07)` |
| Course-plan panel | 24px | none | `0 8px 24px rgba(90,70,40,0.06)` |
| Progress card | 24px | none | `0 10px 28px rgba(40,50,35,0.25)` |
| Primary CTA | 12px | none | `0 6px 16px rgba(201,103,20,0.30)` |
| Secondary CTA | 12px | 1px `--border-tan` | very soft or none |
| Badge chip | 9999px (pill) | 1px `--border-tan` | none |
| Utility icon-buttons | 24px | none | `0 4px 12px rgba(90,70,40,0.08)` |
| Active lesson card | 16px | **2px `--accent-orange-soft`** | same as cards |
| "המשך לשיעור הבא" (on dark) | 10px | 1.5px `--accent-orange-soft`, transparent fill | none |
| "צפייה בכל השיעורים" | 9999px (pill) | 1px `--border-tan` | subtle |
| Progress ring | — | 10px stroke, rounded linecap | none |

## 7. Components list

1. **PageShell** — cream canvas + contour-line background layer (SVG/CSS, non-interactive, `aria-hidden`).
2. **Header** — Brand block (compass-rose logo + title + tagline, inline-start) · 2 × UtilityButton ("החשבון שלי" person icon, "התראות" bell icon, inline-end).
3. **Hero** — BadgeChip ("קורס דיגיטלי אינטראקטיבי") · H1 · SubHeadline · PrimaryButton ("המשך ללמוד" + chevron + small glyph icon) · SecondaryButton ("סקירת הקורס" + document icon) · TerrainDiorama illustration + dashed route with X-marker overlay.
4. **FeatureCard × 4** (icon, title, 2-line subtitle):
   - "שכבות מידע — שילוב נתונים מרובים לתמונה מלאה" (stacked layers icon)
   - "חשיבה מבצעית — הבנת המרחב כמנוף להחלטות" (binoculars icon)
   - "מיומנויות בשטח — כלים מעשיים לניווט, תצפית וניתוח מרחב" (compass icon)
   - "מפות אינטראקטיביות — מפות אינטראקטיביות שמתגבות לפעולות שלך" (folded map + flag icon)
5. **CoursePlanPanel** — SectionHeader ("תכנית הקורס" + open-book icon) · LessonCarousel (5 × LessonCard + prev chevron) · GhostPillButton ("צפייה בכל השיעורים").
6. **LessonCard** (number, isometric mini-diorama, title, subtitle; `active` variant): 01 מבוא — מרחב, כוח, אסטרטגיה (active) · 02 קרטוגרפיה וקריאת מפות · 03 ניוטים — אזימוט ותכנון ציר · 04 טופוגרפיה ומורפולוגית שטח · 05 ניידות ותמרון — עבירות, כיסוי, תכסית.
7. **ProgressCard** (dark) — title "התקדמות שלך" · ProgressRing (35%, center "35% / הושלם") · caption "סיימת 4 מתוך 12 שיעורים" · OutlinedButton ("המשך לשיעור הבא" + orange chevron) · blended background photo (soldier with map, low opacity, inline-end).

⚠️ Content flags (mockup likely contains AI-render typos — confirm before shipping): "ניוטים" → probably "ניווטים"; "מורפולוגית" → "מורפולוגיית"; "שמתגבות" → probably "שמגיבות"; 4/12 lessons = 33%, ring says 35% — pick one source of truth.

## 8. Assets / icons / images needed

**Illustration assets (papercut renders, PNG w/ transparency or pre-cut):**
- Hero terrain diorama (layered topo tile, river, 3 trees, orange target-flag) — ~700 × 500px @2x.
- 5 lesson mini-dioramas: (01) topo tile + flag, (02) flat map + survey poles/flags, (03) compass on map tile, (04) mountain ridge tile, (05) vehicle on terrain tile — ~140px @2x each.
- 4 feature icons (dimensional, same style): stacked map layers, binoculars, lensatic compass, folded map with flag — ~100px @2x each.
- Progress-card background photo: soldier crouched reading a map, duotone/blend-into-dark-green treatment.

**Vector/UI icons (SVG, stroke style, `--ink-900`):** compass-rose logo (gold/olive detail), person, bell, open book, document/report (has a small green accent), chevron-left (used for "forward" in RTL — appears in both CTAs, next-lesson button, carousel prev), small CTA glyph.

**Background:** seamless contour-line texture (SVG preferred) + one dashed orange route path with an ✕ waypoint marker between diorama and CTA area.

## 9. Responsive behavior (assumptions — not shown in mockup)

- **≥1280px:** as specced; content max-width 1290px centered.
- **1024–1279px:** hero columns compress (illustration scales down ~80%); feature cards 4-up with tighter gap; bottom band keeps 2 columns.
- **768–1023px:** hero stacks — text block first (top), diorama below at ~70% scale; feature cards 2×2; bottom band stacks: course-plan panel full-width, progress card full-width below (or above — recommend above, since it's the user's status); lesson carousel becomes swipeable overflow-x with scroll-snap.
- **<768px:** single column; H1 drops to ~38px, hero sub 18px; CTAs full-width; feature cards 1-up (or 2-up at ≥480px); lesson cards fixed ~150px in a horizontal snap scroller; utility buttons collapse to icon-only in a top row; page-sheet radius drops to 24px; page padding 20px.
- Progress ring and dioramas scale proportionally; never crop text.

## 10. RTL requirements

- Whole document `dir="rtl"` `lang="he"` — all text is Hebrew.
- Use **logical properties only** (`margin-inline-start`, `padding-inline-end`, `inset-inline-*`, `text-align: start`) — project rule; no `left/right` utilities.
- Reading order: brand at inline-start (visual right), utilities at inline-end (visual left). Hero text column is inline-start; illustration inline-end.
- **Chevrons point left (◀) for "forward/next"** everywhere — this is correct RTL affordance, keep as-is; do not auto-flip icon fonts that already point left in the mockup.
- Lesson carousel runs right→left: 01 at inline-start (visual right), 05 at far left; prev/next controls follow RTL (the visible ‹ chevron at the visual-left edge advances deeper into the list).
- Numbers ("01", "35%", "4 מתוך 12") stay LTR-rendered digits inside RTL text — default Unicode bidi handles this; verify "35%" renders percent-after-digits as in mockup.
- Illustrations/dioramas must **not be mirrored** by RTL transforms (project rule: no mirrored maps).
- SVG `<text>` inside any inline SVG must set `text-anchor` explicitly (known project RTL clipping bug).
