# Topic 02 · Scale section (`#scene-scale`) — "explore, measure, choose a map"

**Status:** design, awaiting user review · **Date:** 2026-10-08
**Scope:** the scale section of lesson 2 only. `ScaleScene.tsx` is rewritten; new files live in `src/components/lessons/topic-02/scale/`; two one-line edits register a second scene (§9). Everything else in lesson 2 is reference only.

## 1. Problem

- The three maps (`TOPIC02-SCALE-{10K,50K,250K}.webp`) are AI images. They don't show the same place, don't share a reference point and don't nest: "הר א׳" sits at a different distance from "יישוב א׳" in each one. The section cannot show "the same ground at three scales".
- Nothing is measured on a map. The calculator is a number input beside a picture, and its hint ("מחלקים ב־2") is fixed to 1:50,000.
- There is no orthophoto/map comparison, no zoom, and no feedback. The scale buttons lack `type`, `role` and `aria-pressed`.
- The strong scenes (Landforms, Topography, Contours) derive every view from one geometric source, change the view from what is on screen instead of swapping it, and tie each action to the image and the text together. Scale does none of this.

## 2. Goals / non-goals

**Goals.** The learner can
1. explain why a smaller denominator means a larger scale;
2. compare the area a map covers with the detail it can show;
3. convert a distance on the map into a horizontal ground distance;
4. choose a map for a task and say why;
5. tell enlarging a map apart from gaining detail.

Every interaction serves one of these goals. Depth comes from exploring plus explanatory feedback; text supports it briefly.

**Non-goals**
- Mobile beyond "stacks and doesn't break" (desktop 1440 first, per `CLAUDE.md`).
- A map legend for the source map's symbols.
- Route length along roads, and slope correction. These get one explicit sentence of explanation only (§6.2).
- Changing other lesson-2 scenes.
- Fixing the prototype embed 404 (diagnosed separately: the dev server doesn't serve `public/embeds/terrain-overlay/index.html` for the directory URL).

## 3. Decisions (user, 2026-10-08)

| Topic | Decision |
|---|---|
| Topographic layer | **Israel Hiking Map** Hebrew tiles. Licence CC BY-NC-SA 3.0: non-commercial use, attribution, share-alike. |
| Orthophoto | Esri World Imagery, same as the prototype; attribution shown. |
| Structure | **Two scenes**, like Coordinates 1/2. `scale` → TOC "קנה מידה 1" (screens A + B). New `scale-2` → TOC "קנה מידה 2" (screens C + D + projections). |
| Projections block | `ProjectionCallout` moves verbatim to the end of `scale-2`. Its overlap with Coordinates 2 is left for a later task. |
| Anchor area | Mount Tavor, 32.687 N 35.39 E. It reads as a distinct dome at all three scales. |

## 4. Map sheets (data)

### 4.1 Definition

The three map extracts ("sheets") are **24 × 24 cm squares at their nominal scale**, all centred on the anchor:

| id | Scale | Ground width (E–W at centre latitude) | Area | 1 cm on the sheet | 1 km on the ground | Topographic source |
|---|---|---|---|---|---|---|
| `10k` | 1:10,000 | 2.4 km | 5.76 km² | 100 m | 10 cm | IHM zoom 15 |
| `50k` | 1:50,000 | 12 km | 144 km² | 500 m | 2 cm | IHM zoom 13 |
| `250k` | 1:250,000 | 60 km | 3,600 km² | 2.5 km | 0.4 cm | IHM zoom 11 |

- Each sheet is exactly 1/5 the width of the next, so its extent can be drawn as a rectangle inside the wider sheet.
- Each sheet uses the source zoom level whose ground resolution matches a ~600 px display (≈ 4 / 16 / 64 m per px). The level of detail therefore comes from the source's own simplification at that level, never from enlarging an image.

### 4.2 Generation

`scripts/maps/build-scale-sheets.mjs` (Node, `sharp` resolved through `next` like `scripts/media/*.cjs`):
1. **Bounding box.** For each sheet, compute the EPSG:3857 box centred on the anchor, sized so that its WGS84 ground width at the centre latitude equals the table value.
2. **Orthophoto.** One Esri `MapServer/export` request per sheet (`bbox`, `bboxSR=imageSR=3857`, 1600 × 1600).
3. **Topographic map.** Fetch the IHM tiles covering the box at the zoom in the table, stitch them, and crop to the exact box. That gives 597 / 746 / 933 px; no resampling beyond the crop.
4. **Output.**
   - Images: WebP to `public/assets/lessons/topic02/scene-scale/sheets/{id}-{ortho|map}.webp`.
   - `src/components/lessons/topic-02/scale/scaleSheets.data.ts`, generated: per sheet id, denominator, centre, `bbox3857`, WGS84 corners, ground width, `sheetCm = 24`, raster sizes, source and zoom, attribution and generation date.
   - The raw tile cache goes to the OS temp dir, not the repo.
5. **Old images.** `TOPIC02-SCALE-*.webp` lose their only reference. They stay on disk; deleting them is the user's call.

Both layers of a sheet come from the same box, so they align by construction. The check is in §10.

### 4.3 Overlay content

`scale/scaleContent.data.ts` holds every learner-facing feature as WGS84 lat/lon plus its source:
- landmarks (summit monastery, Shibli, Route 65, Kinneret, the screen-B task features);
- table rows and their per-sheet state;
- screen-C task geometry;
- screen-D answer set.

Coordinates come from OpenStreetMap (Nominatim/Overpass). Each one is checked by eye on both layers before use. The "shown / too small" state of every feature on every sheet is read from the actual rasters, never assumed.

## 5. Geometry and accuracy rules (`scale/geo.ts`)

**Functions**
- `toMerc` / `fromMerc` — WGS84 ↔ EPSG:3857.
- `lonLatToSheet(sheet, p)` → `{x, y}` in sheet units 0..1000 (north up), and its inverse.
- `groundDistanceM(a, b)` — horizontal distance on the WGS84 ellipsoid, using local meridian and prime-vertical radii at the mid-latitude. Error ≪ 1 m below 100 km. Raw Web Mercator distances are **never** shown: at Tavor's latitude they run ~19 % long.
- `sheetCm(sheet, a, b)` — distance on the 24 cm sheet, computed in the sheet's own (Mercator) plane.
- `readingPrecisionM(D) = 0.001 m × D` — 1 mm on the sheet: 10 / 50 / 250 m.
- `formatDistance(m, precisionM)` — Hebrew units (מ׳ / ק״מ), rounded to the precision.
- `classifyAnswer(input, trueM, sheet)` — see §6.2.

**Rules**
- **Screen centimetres are never sheet centimetres.** Every "ס״מ" in the UI means centimetres on the 24 cm sheet, drawn as a ruler in sheet space that zooms with the map.
- The **scale bar** is in screen space and updates with zoom. The sheet's nominal scale (1:50,000) never changes when zooming. The UI says this in one T6 line: "סרגל המרחק מתעדכן כשמתקרבים; קנה המידה של הדף נשאר 1:50,000".
- The ground distance between two fixed points is computed once from lat/lon. It is identical across scales and layers by construction.
- **Tolerance.** sheet-cm × D differs from the ground distance by < 1 % (Web Mercator over a 60 km box). Answers are accepted within max(1 mm on the sheet × D, 1 % of the distance).
- **No precision beyond 1 mm on the sheet.** Results are rounded to `readingPrecisionM`, and finer answers get the "over-precise" feedback.

## 6. Screens

All four screens share the `SheetViewport` (§7). Each screen is one T1 block with a single `surface-elevated` workspace. The workspace grid is `lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`: text and controls at inline-start (right), map square at inline-end (left), ~600 px. Each workspace fits under the nav at 1440 × 1122. The map is the hero; two separate controls sit beside it: **scale** (sheet) and **representation** (`מפה` / `תצ״א` / `השוואה` = curtain).

### 6.1 Screen A — "אותו מקום, שלושה קני מידה" (scene `scale`)

- **Location:** lesson 2 ← קנה מידה 1 ← screen 1.
- **Goal:** the learner explains why 1:10,000 is a larger scale than 1:250,000 and describes the area-vs-detail trade-off.
- **Message:** on the same sheet, a smaller denominator gives each ground kilometre more room on paper, so the sheet shows less ground in more detail.
- **What's seen**
  - The map square showing the active sheet. The extent of the next more detailed sheet is a dashed rectangle; clicking it zooms in.
  - Beside the map:
    - Three sheet thumbnails as the scale picker (each with the inner rectangle).
    - Readouts: area shown, "1 ס״מ על הדף = …", and a **1 km ground bar drawn at its true sheet length** (10 / 2 / 0.4 cm).
    - The "מה אפשר לזהות?" table.
- **What's done**
  1. **Prediction first:** "באיזו מפה הר תבור ייראה גדול יותר?" (1:10,000 / 1:250,000 / באותו גודל).
  2. Switch sheets. The switch is an animated zoom about the shared centre: the outgoing sheet scales by the width ratio (×5 or ×1/5) while the incoming one fades in. This is not a swap.
  3. Switch representation.
  4. Click a table row to locate that feature (pulse marker).
- **States and feedback**
  - The prediction collapses to one feedback line that cites the 1 km bar.
  - The table rows (summit monastery, winding summit road, Shibli, Route 65, Kinneret) fill in per visited sheet with three states:
    - ✓ מוצג
    - ✗ קטן מכדי להופיע
    - ○ מחוץ לקטע (computed from bounds)

    Together they show both failure modes: detailed but not covering, and covering but not showing.
- **Sequence:** after Topography (the learner has seen a map sheet with a scale bar), before Screen B.
- **Boundary:** no measuring here.
- **Copy (draft)**
  - T1 intro: "שלושה קטעי מפה בגודל דף זהה, 24×24 ס״מ, וכולם סביב הר תבור. עברו ביניהם ובדקו כמה שטח נכנס לדף ומה עדיין אפשר לזהות."
  - Prediction feedback: "ב־1:10,000 כל ק״מ בשטח תופס 10 ס״מ על הדף; ב־1:250,000 רק 0.4 ס״מ. מכנה קטן יותר פירושו שבר גדול יותר, כלומר קנה מידה גדול יותר."
- The existing two intro text columns are removed; their two messages live in this screen.

### 6.2 Screen B — "מודדים על המפה" (scene `scale`)

- **Location:** lesson 2 ← קנה מידה 1 ← screen 2.
- **Goal:** the learner converts a map distance into a horizontal ground distance.
- **Message:** ground distance = sheet distance × denominator. The ground distance between two fixed points does not change when the map changes.
- **What's seen**
  - A–B segment on the map with a **sheet-cm ruler** along it: cm and ½ cm ticks, plus mm ticks when the zoom makes them ≥ 5 px.
  - The live reading "על הדף: 10.4 ס״מ".
  - A conversion chain, highlighted step by step: ס״מ על הדף → ס״מ בשטח → מ׳ → ק״מ.
- **What's done**
  1. **Guided example:** A = summit monastery, B = Shibli. The learner switches sheets. The sheet length shrinks ×5 per step while the ground distance stays the same. On 1:250,000 the monastery is no longer identifiable, only the mountain.
  2. **Independent task**, on 1:50,000:
     - In `תצ״א`, click two named features clearly visible in the photo. A click is checked against the feature's position; a miss says where to look.
     - Switch to `מפה`; the points stay put.
     - Read the ruler and type the ground distance.
     - The two features are chosen during implementation from candidates visible in both layers (summit, a reservoir, Kfar Tavor), and recorded in `scaleContent.data.ts`.
  - **Moving endpoints:**
    - Drag.
    - Or focus a handle and use the arrow keys: 1 mm on the sheet; Shift = 1 cm.
    - Or pick an endpoint from a list of named points.
- **`classifyAnswer` feedback**

  | Result | Feedback |
  |---|---|
  | correct | "נכון. {cm} ס״מ × {D} = {m}." |
  | ×10 / ×100 / ×1000 | unit-conversion hint (1 מ׳ = 100 ס״מ, 1 ק״מ = 1,000 מ׳) |
  | other sheet's denominator | "חישבתם לפי 1:{other}; כאן 1:{D}." |
  | over-precise (right value, finer than the reading precision) | accepted, plus "מ״מ אחד על הדף הוא {prec} בשטח; עגלו ל־{rounded}." |
  | off | re-check the ruler reading and the multiplication |

  After feedback the true distance and the full chain appear, with the note: "זהו מרחק אופקי בקו ישר. אורך דרך מתפתלת, או הליכה במעלה מדרון, ארוכים ממנו."
- **Sequence:** Scale 2 asks the learner to use both skills.

### 6.3 Screen C — "איזו מפה מתאימה למשימה?" (scene `scale-2`)

- **Location:** lesson 2 ← קנה מידה 2 ← screen 1.
- **Goal:** the learner chooses a map for a task and justifies the choice by area covered and detail needed.
- **Message:** use the largest scale that still covers the whole task area and shows what the task needs.
- **What's seen:** the task area or points drawn on whichever sheet is active, with a coverage readout ("האזור כולו בתוך הקטע" / "חורג מהקטע").
- **What's done:** three scenarios, one at a time, each through a pager. Their facts are checked by `military-geo-editor`.

  | Scenario | Task | Target |
  |---|---|---|
  | Local planning | movement between the buildings of the summit compound | 1:10,000 |
  | Navigation | on foot from Kfar Tavor to the summit | 1:50,000 |
  | Regional planning | moving a force from Afula to Tiberias | 1:250,000 |

  The learner previews all three sheets (scale control), then commits a choice.
- **Feedback:** per scenario × sheet, built from coverage (computed) and needed features (curated):
  - Too detailed: "הציר חורג מהקטע; כדי לכסות אותו נדרשים {n} קטעים כאלה." `n` is computed from the task box.
  - Not detailed enough: "כל האזור נכנס, אבל {feature} אינם מוצגים."

  The gap is highlighted on the map.
- Points or areas only. **No hand-drawn routes on the real map**, because inventing a route that doesn't follow a real road would mislead.

### 6.4 Screen D — "טעות נפוצה: אם אגדיל, אראה יותר" (scene `scale-2`)

- **Location:** lesson 2 ← קנה מידה 2 ← screen 2.
- **Goal:** the learner tells enlarging the display apart from a change in detail.
- **Message:** enlarging a map changes how big it looks, not what it contains. More detail comes only from a larger-scale map.
- **What's seen:**
  - A curtain over the same 12 km extent.
  - One side: the 1:250,000 map enlarged ×5. It is the same raster with a CSS transform, honestly blurred.
  - The other side: the real 1:50,000 sheet.
  - Each side is labelled with a chip.
  - The scale bars are identical, which makes the point.
  - The ×5 is a fixed extra transform on the 1:250,000 layer about the sheet centre. The learner's own zoom/pan (k ∈ [1, 3]) applies to both sides together, as in every other screen.
- **What's done:**
  - Drag the curtain (or its slider).
  - Answer "מה מופיע רק במפה 1:50,000?" by multi-select; the answer set is verified on the rasters.
  - A closing quick check: "1:250,000 — המספר גדול יותר. האם קנה המידה גדול יותר?"
- **Feedback:** the missing items are pointed out on the map. The quick check answer recalls the 1 km bar from screen A.
- Then `ProjectionCallout`, unchanged.

## 7. Shared components (`src/components/lessons/topic-02/scale/`)

| File | Responsibility |
|---|---|
| `geo.ts` | §5 math. Pure, no React. |
| `scaleSheets.data.ts` | Generated sheet metadata (§4.2). |
| `scaleContent.data.ts` | Features, table states, tasks, answer sets, with sources (§4.3). |
| `useMapView.ts` | Port of the prototype's `useZoomPan` (§8). |
| `SheetViewport.tsx` | Square viewport containing: layer stack (map / ortho), curtain, overlay slot (SVG 0..1000), scale bar, north arrow, attribution, zoom buttons, keyboard. Layers are plain `<img>` elements, with no canvas or WebGL. |
| `MeasureOverlay.tsx` | A–B handles, sheet ruler and live reading. |
| `ScaleExplore.tsx`, `ScaleMeasure.tsx`, `ScaleChoose.tsx`, `ScaleZoomMyth.tsx` | Screens A–D. |
| `ScaleScene.tsx` (existing path) | Scene `scale`: `SceneHeader` (current title and intro, verbatim), A, B. |
| `Scale2Scene.tsx` | Scene `scale-2`: `SceneHeader`, C, D, `ProjectionCallout`. |

**Shared building blocks:**
- `SceneHeader`, the option recipes `OPTION_BASE` / `OPTION_ACTIVE` / `OPTION_IDLE`, `useTabKeys`-style RTL arrow handling.
- Readout inset `rounded-xl bg-bg-accent/60`.
- Feedback inset `bg-status-*/10` + `aria-live`.
- Pager from Topography.
- Text tiers T1–T6 from `lessons-02-06-ui-cleanup-spec.md`.

**Colours:** no new colour tokens. Map overlay colours come from the existing map palette, with accent orange only for the active measurement or task.

## 8. Interaction details

- **Zoom/pan.** One CSS transform `translate(x,y) scale(k)` shared by every layer and the overlay, with k ∈ [1, 3]. Markers are counter-scaled; strokes are non-scaling.
  - Wheel zooms; at the zoom limits it passes the event through so the page still scrolls.
  - Pointer drag pans, with pointer capture.
  - `+` / `−` / `0` and the arrow keys work while the viewport has focus.
  - Animated zoom is 320 ms and is instant under `prefers-reduced-motion`.
- **Switching representation** keeps the view (centre, k, pan) and every overlay pixel-identical.
- **Switching scale** goes to a different sheet, so the view resets to k = 1. It uses the centred ×5 morph (0.6 s, `ease-snap`); reduced motion makes it instant.
- **Curtain.**
  - The clip is applied outside the transform, so the line stays fixed while the map pans under it.
  - The handle is pointer-draggable. Its keyboard equivalent is a `dir="ltr"` range input, so the value and the line move the same way. This fixes the prototype's RTL inversion.
  - Labelled chips mark each side.
  - The map is never mirrored. Overlay anchors use physical positions, which is an accepted map exception already logged in `assumptions.md`.
- **Accessibility.**
  - The scale and representation controls use the tab/radio pattern (`aria-selected` / `aria-checked`, roving focus).
  - The viewport is a labelled focusable group with a keyboard hint in `aria-describedby`.
  - Measurement handles are focusable with descriptive labels.
  - Readings and feedback use `aria-live="polite"`.
  - Every drag has a keyboard or list alternative.
- **Loading.** Images load when a workspace is near the viewport. A sheet's two layers are preloaded together so a layer switch never flashes.

## 9. Lesson integration

- `Topic02Lesson.tsx`: the `scale` label becomes "קנה מידה 1", and `{ id: 'scale-2', label: 'קנה מידה 2', Comp: Scale2Scene }` is inserted after it.
- `src/lib/lesson-scenes.ts:29`: the same two changes (the static SSR copy).
- The deep link `#scene-scale` keeps working. The order topography → scale 1 → scale 2 → coordinates 1 is preserved.

## 10. Verification

1. **Unit tests**, `node --experimental-strip-types --test scripts/qa/scale-geo.test.mjs`, written before `geo.ts`:
   - Mercator round-trip.
   - Sheet widths are 2.4 / 12 / 60 km within 0.1 %, and the centre maps to (500, 500).
   - The meridian arc for 1° at 32.7° matches the WGS84 reference to < 1 m.
   - sheet-cm × D is within 1 % of the ground distance.
   - Every `classifyAnswer` branch, and `formatDistance` rounding.
2. **Asset registration**, `scripts/maps/check-scale-sheets.mjs`:
   - Raster sizes and bounds match the data file.
   - Side-by-side ×4 crops of both layers at ≥ 4 landmarks per sheet go to `design/screenshots/scale-redesign/registration/` and are reviewed by eye.
3. **Browser QA**, `scripts/qa/shot-scale.mjs` at 1440 × 1122, with exit code 1 on failure:
   - Every screen and state is captured.
   - Each workspace fits under the nav.
   - Overlay marker centres match to ≤ 0.5 px before and after a layer switch and in curtain mode, and the view transform is unchanged.
   - The ground distance text is identical across all three sheets.
   - Keyboard: handle arrows update the reading.
   - Reduced motion makes the scale switch instant.
   - No console errors and no horizontal scroll.
4. **Reviews:** `cartographic-reviewer`, `rtl-qa-reviewer`, `a11y-qa-reviewer`, `hebrew-copy-editor` (all new copy), `military-geo-editor` (scenarios and terms).
5. Screen by screen: implement → screenshot → compare → fix, before the next screen.

## 11. Assumptions to log in `design/docs/assumptions.md`

- The sheets are web-map renders (IHM zoom 15 / 13 / 11) whose resolution matches a 24 cm sheet at 1:10,000 / 1:50,000 / 1:250,000. They are not official series sheets, and the simplification is IHM's own.
- On 2× screens the topographic rasters are shown upscaled, so they look a little soft. Zooming within a sheet enlarges the same content, which is consistent with screen D's message.
- Web Mercator is not exactly conformal on the ellipsoid. Over 60 km the error is < 1 %, absorbed by the tolerance.
- Esri imagery capture date varies by area and is not shown.
- IHM is licensed CC BY-NC-SA 3.0. It was chosen by the user on 2026-10-08 for non-commercial course use. Attribution is shown in the map corner at ≥ 13 px.

## 12. Risks

- The IHM tile service or its terms could change. Mitigation: the rasters are generated once and committed, so nothing is fetched at runtime.
- Feature visibility on the rasters may not support every planned table row or answer. Mitigation: rows are chosen from what the rasters actually show (§4.3) before any copy is written.
- Concurrent sessions edit lesson-2 files. Mitigation: only the files in §7 and §9 change, and shared files are diffed immediately before each edit.
