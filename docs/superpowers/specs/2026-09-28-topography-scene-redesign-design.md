# Topic 02 · Topography scene (`#scene-topography`) — "one terrain, three representations"

**Status:** design, awaiting user review · **Date:** 2026-09-28
**Scope file:** `src/components/lessons/topic-02/TopographyScene.tsx` (only existing file that changes) + new files listed in §7.

## 1. Problem

- At 1440 px the scene shows one tall image per view. The explanation, pros and cons, "why it matters" block and the ‹ › pager sit below the fold, so the learner never sees the map and its explanation together.
- The three images (`TOPIC02-TOPO-3D/PHOTO/MAP.png`) are separate AI renders. They do **not** depict the same ground: the ridge, road and buildings in the photo don't sit on the map's contours. The map PNG also has reversed Hebrew in its legend ("ישר הבוג וק"). The scene's whole message is "the same mountain, three ways", and the pictures contradict it.

## 2. Goals / non-goals

**Goals**
1. **One screen.** The view switcher, a large map viewer, the full explanation and the pager are all visible at once. Target: the interactive block (tabs → card bottom) is ≤ 760 px tall at 1440 px width. It then fits under the site nav at 1440×900. At 1440×1122 (project target) the whole scene, including `SceneHeader`, fits without scrolling.
2. **The map is the hero.** The viewer takes ≈ 62 % of the card width and the card's full height (≈ 620 × 620 px at 1440). There is a fullscreen button, using the same pattern as `ContourCake3D`.
3. **One terrain, three renderings.** The 3D model, the aerial photo and the topographic map are generated from a single terrain source, so they are the same ground by construction. No pre-rendered pictures.
4. **Motion that teaches.** Switching views morphs one live canvas. There is no image swap.
5. **"All together" mode.** An exploded stack of the three layers (user's choice, 2026-09-28).
6. **Zero copy change** (§3).

**Non-goals:** mobile polish beyond "stacks and doesn't break" (desktop first per `CLAUDE.md`); new pedagogical content; touching the contour-mountain files owned by a concurrent session (`ContourCake3D.tsx`, `contourMountain*.ts`, `build_contour_mountain.py`, `public/assets/lessons/topic02/contour-mountain/`).

## 3. Content lock

These must appear **verbatim, character for character**:

- The `SceneHeader` props: step, eyebrow, title and intro.
- For every entry in `VIEWS`: `label`, `whatItIs`, each `pros` item, each `cons` item and `whyItMatters`.
- The headings "במילים פשוטות", "מה היתרון", "מה הבעיה" and "למה זה חשוב".
- The aria-labels "ניווט בין תצוגות", "התצוגה הקודמת" and "התצוגה הבאה".
- The three current `alt` strings. They move to the viewer's `aria-label`, one per view.

**Existing typos are preserved, not fixed.** Four strings are missing a space before a quote: `יכולים"לעוף"`, `ונראית"מעוכה"`, `מסננת"רעשי רקע"`, `את"שפת המפה"`. They are flagged for the user and changed only on their say-so.

**New UI microcopy.** This is chrome only, no lesson content:

- The toggle label **"כל התצוגות יחד"**.
- The loading label "טוען שטח תלת־ממדי…".
- The fullscreen strings "מסך מלא" / "יציאה ממסך מלא". These already exist in `ContourCake3D`.

**Map-sheet labels.** The cartographic text inside the current map is preserved:

- Place labels: "מטע", "חורש דליל", "שביל רגלי", "דרך עפר".
- Contour values 300 / 350 / 400, the summit spot height 412 and the north label "צ".
- Legend entries "קו גובה ראשי" and "שביל", which were previously reversed and are now fixed.
- The scale bar "0 100 200 300 מ׳" and the grid numbers (see §5.4).

## 4. Layout (desktop, ≥ lg)

```
SceneHeader (unchanged)
[03 מפה טופוגרפית] [02 תצ״א] [01 מודל תלת־ממדי]     ← existing tablist, unchanged
┌ surface-elevated card ─────────────────────────────────────────────┐
│ ┌ viewer ≈62% ──────────────────────┐  ┌ text column ≈38% ───────┐ │
│ │ [⛶]              [⧉ כל התצוגות יחד]│  │ <view label>            │ │
│ │                                   │  │ במילים פשוטות …         │ │
│ │      live canvas (+ SVG overlay)  │  │ ✓ מה היתרון …           │ │
│ │                                   │  │ ✕ מה הבעיה …            │ │
│ │                                   │  │ ┌ למה זה חשוב …… ┐      │ │
│ │                                   │  │ ▶    ● ━ ●    ◀         │ │
│ └───────────────────────────────────┘  └─────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

- **DOM order:** the text column comes first, so it lands on the visual right in RTL (reading start). The viewer comes second and lands on the left. No `order-*` utilities and no mirroring.
- **Text column:**
  - The same typography as today (`text-base leading-relaxed`, `font-display` headings).
  - Pros and cons **stack** (one column) instead of the current 2-col grid, because the column is narrow.
  - The pager (prev / dots / next, the same component markup) sits at the bottom, so reading ends at "next". The column content cross-fades per view, as it does today.
- **Viewer:**
  - It stretches to the text column's height, with `min-h` ≈ 560 px.
  - Its overlay buttons use the `ContourCake3D` chrome style (`rounded-[3px] border bg-bg-elevated/95`):
    - the fullscreen toggle at `top-2 start-2`;
    - the "all together" toggle at `top-2 end-2`, as an `aria-pressed` button.
- **Below lg:** the card stacks, viewer first and then the text. It is not tuned further (non-goal).

## 5. The terrain ("the same map, rebuilt properly")

### 5.1 Composition (source of truth = today's topographic map)

The map is 4:3, north up, in sheet coordinates of 0–100 × 0–75.

- **Summit:** 412 m at ≈ (55, 28) of the sheet, with a spot-height triangle.
- **Slopes:**
  - The W and SW flanks are broad and gentle; the footpath climbs there.
  - To the E/SE a rocky ridge spur descends. Ravines are cut into its flank (the rocky striations in today's photo and 3D render).
  - The contour pattern follows today's map: tighter on the E side near the top, wider to the W.
- **Base:** the plain sits at ≈ 290–300 m. The 300 m index contour encloses most of the hill. The road runs just outside it on the southern plain.
- **Dirt road (דרך עפר):** crosses W→E across the south of the sheet with a gentle sag, as today. It is also slightly carved into the mesh.
- **Footpath (שביל רגלי):** runs from the 4-building cluster (SW, by the road) up to the summit.
- **Buildings:** a 2×2 cluster of four in the SW; two more in the SE along the road.
- **Vegetation:**
  - Orchard (מטע, dotted rows) in the SW, west of the cluster.
  - Sparse woodland (חורש דליל) in the E.
  - Woodland in the NW (unlabeled, as today).
- **Where the old photo and map disagree** (e.g. the photo shows 4 groves, the map 3 vegetation areas), **the map wins** and the new photo follows it.
- **Dropped:** the unlabeled grey-green lines on today's map. They are not in the legend and one runs through the summit, which makes no sense as a stream. This is logged as an assumption.

### 5.2 Numbers

- **Contour interval:** 10 m. Index contours every 50 m (300, 350, 400) are thicker and labeled; the summit is labeled 412.
- **Sheet size:** ≈ 1.4 km × 1.05 km. This makes the existing "0–300 מ׳" scale bar a sensible ~¼ of the width. The size is tuned in the build.
- **Vertical exaggeration:** ≈ 1.5–2× in the 3D view **only**, so the hill reads as a hill in a small diorama. The photo and map are unaffected, and the exact value is logged in `assumptions.md`.

### 5.3 Build pipeline (offline, deterministic)

**Script:** `scripts/blender/build_topography_terrain.py`. It runs headless in Blender 5.2 with numpy and follows the conventions of `build_contour_mountain.py`, but is fully independent (its own Poly Haven cache dir, its own outputs).

The script turns **one heightfield plus one feature layout** into the following outputs.

**3D and texture assets:** `public/assets/lessons/topic02/topography-terrain/`

- `terrain.glb` (Draco): a diorama tile with these nodes:
  - `Terrain`: the heightfield mesh.
  - `Walls`: an earth cross-section plinth.
  - `Trees`: low-poly olive, pine and shrub crowns with per-item `COLOR_0`.
  - `Buildings`: flat-roofed rural blocks.
  - Node origins sit at the world origin.
- `albedo.jpg`: ground colour from CC0 Poly Haven photo textures (grass, dry ground, rock), blended by slope, elevation and feature masks. The road and path are worn in, and cavity AO is baked. Shadows are **not** baked; they are live.
- `normal.jpg`: detail normals.

**Map data:** `src/components/lessons/topic-02/topographyTerrain.data.ts` (**generated**). Everything is in sheet coordinates, taken from the *same* arrays that built the mesh and albedo:

- the contour rings (marching squares on the heightfield);
- index-label anchors and the summit;
- the road and path polylines;
- the building footprints;
- the vegetation polygons;
- the guide anchors for the stack view (summit, both building groups).

**Self-checks (the build fails if any is off):**

- Contour vertices re-sampled on the mesh are within ±0.5 m of their level.
- Building footprints sit on the terrain.
- The path ends within 5 m of the summit and at the cluster.
- The summit height is 412 ± 0.5 m.

**Asset budget:** ≤ 6 MB total (GLB ≤ 2.5 MB, each JPG ≤ 1.5 MB). Nothing loads until the viewer nears the viewport.

### 5.4 Grid, scale and north (open assumption)

Today's grid numbers (201–205 E, 691–694 N at ~330 m spacing) contradict today's scale bar, because 1-km labels can't be 330 m apart.

**Default:** true 1 km grid lines with the same 3-digit km labels, which means 1–2 lines cross a 1.4 km sheet. Add 100 m ticks on the neatline, and keep the scale bar "0 100 200 300 מ׳".

This choice is logged in `assumptions.md`. The user can pick another.

## 6. Viewer behaviour

The viewer has one R3F canvas and one SVG map sheet overlaid on it. The state is `view: '3d' | 'photo' | 'topo'` plus `stacked: boolean`.

| State | Camera | What shows |
|---|---|---|
| **3d** | Perspective, oblique from the S/SSE (~35° up), looking north with the ridge on the right, like today's 3D render. Drag to orbit, wheel to zoom, re-frames on view change. | Realistic diorama: live sun shadows, AO and filmic tone mapping, transparent over the white card. This is the "דגם מוקטן" the copy describes. |
| **photo** | Rises to straight down (nadir) with a **dolly-zoom**: FOV narrows from ~30° to ~5° while distance grows, ending near-orthographic. No orbit. | The same scene seen from above. The plinth walls vanish and the relief visibly "flattens", which demonstrates the "מעוכה" con. The neatline frames exactly the map sheet's rectangle. |
| **topo** | Same as photo. | The SVG map sheet reveals over the canvas while the canvas fades to paper, in this order: paper and collar → contours **draw on**, low to high → vegetation, road, path and buildings → labels, legend, scale and north. The black building squares land exactly on the 3D roofs that were just visible. |
| **stacked** | Elevated three-quarter view. | Three layers pull apart vertically: the live 3D diorama on top, then a photo slab, then a map slab. Dashed vertical guides run through the summit and both building groups on every layer. Each layer is labelled with its existing tab label and number. The selected view's layer gets an accent outline, and clicking a layer selects that view (the text column updates). Turning the toggle off merges the layers back into the selected view. |

**Implementation notes**

- **Registration:** a single `sheetRect(viewerW, viewerH)` function drives both the photo/topo camera framing and the SVG overlay box, so photo↔map registration can't drift. QA asserts ≤ 2 px error at the corners and the summit.
- **Photo slab texture:** a one-off render-to-texture of the nadir view, taken after the terrain loads (2048×1536). It is literally the same image as the photo view.
- **Map slab texture:** the mounted map-sheet SVG, serialized without `<text>` and rasterized to a `CanvasTexture`. There is one map renderer, not two.
- **3d → topo directly:** the camera rise and the map reveal run in sequence.
- **Mid-transition clicks:** they retarget smoothly. The rig is goal-based with exponential damping, like `ContourCake3D`'s `CameraRig`.
- **Motion:** camera moves take ≈ 1 s; the map reveal takes ≈ 1.2 s in total; easing uses the design-system snap curve.
  - With `prefers-reduced-motion`, every change is an instant cut: no travel, no draw-on, and the stack appears already assembled.
- **Performance:** `next/dynamic` with `ssr:false`, IntersectionObserver lazy mount, `frameloop="demand"` (`never` when off-screen), `dpr [1,2]` and `AdaptiveDpr`.
- **No WebGL:** the viewer shows the static SVG map sheet with a short note. The page never breaks.
- **Accessibility:**
  - The canvas is `aria-hidden`.
  - The viewer is `role="img"`, labelled with the active view's existing alt text.
  - Tablist semantics, roving tabindex and ←/→ keys are unchanged.
  - The toggle is a real button with `aria-pressed`.
  - Layer clicks are a pointer shortcut; the tabs are the keyboard equivalent.
  - All SVG `<text>` sets `textAnchor` explicitly and uses `direction: rtl`. The map is never mirrored.

## 7. Files

**New**
- `scripts/blender/build_topography_terrain.py` — the terrain build (§5.3).
- `public/assets/lessons/topic02/topography-terrain/{terrain.glb, albedo.jpg, normal.jpg}` — generated.
- `src/components/lessons/topic-02/topographyTerrain.data.ts` — generated map data.
- `src/components/lessons/topic-02/topographyTerrainStyle.ts` — map symbology colours and shared constants.
  - It is three.js-free.
  - Colours come from the design-spec illustration palette and the existing lesson map language (`ContoursShapeMap`, `contourMountainStyle` values copied, not imported). There are no new UI tokens.
- `src/components/lessons/topic-02/TopographyMapSheet.tsx` — the SVG map sheet. It takes `reveal` and `labels` props and doubles as the no-WebGL fallback.
- `src/components/lessons/topic-02/TopographyTerrain3D.tsx` — the canvas: terrain, camera rig, stack layers and slab textures.

**Changed**
- `src/components/lessons/topic-02/TopographyScene.tsx` — the new layout. The `VIEWS` copy, tablist, pager and keyboard handling are kept.

**Archived (done 2026-09-28, user request)**
- The pre-redesign scene is frozen as `src/components/lessons/topic-02/TopographySceneV1.tsx`.
- It is registered in `archivedScenes` as `topic-02/topography-v1` and served at `/archive/topic-02/topography-v1/` for side-by-side comparison.
- Its three PNGs (`public/assets/lessons/topic02/scene-topography/TOPIC02-TOPO-{3D,PHOTO,MAP}.png`) are therefore **kept**. Delete them only if the archived snapshot is retired.

**Appended**
- `design/docs/assumptions.md` — grid/scale, vertical exaggeration, dropped lines, map-over-photo conflicts.

## 8. Verification

1. The build script's self-checks pass (§5.3).
2. `npx tsc --noEmit` and `next lint` are clean; `scripts/qa/rtl-audit.mjs` is clean for the touched files.
3. Playwright screenshots (installed Chrome channel, own dev server if the shared one is flaky — see project memory):
   - At 1440×900 and at 1440×1122, capture each of 3d, photo, topo and stacked, plus mid-transition frames (3d→photo, photo→topo).
   - Check that the interactive block is ≤ 760 px tall and that the text and pager are fully visible without scrolling.
4. Registration check: the photo↔topo overlay difference is ≤ 2 px at the corners, the summit and the buildings.
5. The reduced-motion pass shows instant cuts, and the no-WebGL fallback renders.
6. Reviewer agents: `visual-qa-reviewer`, `cartographic-reviewer`, `rtl-qa-reviewer` and `frontend-reviewer`.

## 8a. Changes during implementation (2026-09-28)

- **User request mid-build.** The user asked for:
  - **A sharper 3D model.** The mesh went from 5 m to 2.5 m cells (~470k terrain triangles), the albedo went from 2048 to 3072 px, the canvas renders at ≥ 1.5× DPR, the tone mapping is Neutral, and a vertex-colour export bug was fixed (trees and plinth had rendered white).
  - **Hover linking in the stacked view.** Pointing at any layer puts a probe on all three layers: a dot, a vertical line and an elevation chip "N מ׳". The contour through that point lights on every layer, draped on the 3D model. Raycasting runs through a lazily built BVH on the terrain only.
- **Relief.** The photo and map views ease the relief to true height (the ×2 exaggeration applies to the 3D model only). This removes the hard terminator shadows from the aerial view and makes the "flattened photo" point visible.
- **No normal map** (§5.3). The 2.5 m mesh resolves the relief at display scale.
- **Stack geometry.** The gap between layers grew to 1.6 world units, and the camera now looks from higher. Each layer hides only a sliver of the one below, so every layer can be pointed at. The layer labels sit on the right, which is the RTL reading start.
- **"כל התצוגות יחד" toggle** lives inside the viewer (not the scene), so it also works in fullscreen.
- **User review, second round:**
  - **"All together" holds only the 3D model and the map.** The photo slab and its render-to-texture were removed, and the model floats 2.2 units above the map.
  - **The map now fades in as one piece** over the ground it describes (1.6 s, symmetric ease). It no longer draws itself on contour by contour, because the half-way blend (the map lying on the photo) is what shows it is the same terrain.
  - **Choosing any view leaves the stack.** That covers a tab, the pager, a dot, an arrow key, or a layer or its label, and only the chosen view is shown.

## 9. Risks

- **Concurrent sessions:** all new files; the only edited file is `TopographyScene.tsx`. Snapshot it before editing, and append to `assumptions.md` rather than rewriting it.
- **Photo realism from above:** this depends on the albedo compositing and tree crowns. If the nadir view reads as "game" rather than "aerial photo", add a light photographic grade in the photo state only (slight desaturation and haze). This is a tuning step, not a redesign.
- **Asset weight:** the budget in §5.3 is enforced by the build script, which prints sizes and fails if over.
