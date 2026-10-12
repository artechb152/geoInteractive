# Asset manifest — measurement mission

Screen: topic-02 `#scene-coordinates` → "אליפסואיד, גיאואיד וגליות" (the four views and the measurement task).
Reference: `design/mockups/topic-02-geodesy/03-measurement-mission-v2.png` (design language and landscape quality; site palette). Layout per `claude-visual-clarity-followup-2026-10-12.md` in the same folder.
One landscape, from `scripts/blender/render_measurement_landscape.py`'s fields, in two forms:

- **The turnable model** (WebGL, `MeasurementLandscape3D.tsx`): the height grid `model-height.bin` meshed every 10 m, wearing `model-albedo.webp` — the diorama rendered straight down with the renders' sun, sky and look — unlit. The model's four sides carry the same image down from each top edge. The page builds the rest itself: the see-through reveal, the reference sheets, the lines and the receiver. The files hold heights at 2.5×; since 2026-10-12 (sixth pass) the page draws every height at `DISPLAY_VE` = 6× (`measurementLayout.ts`), the same mapping as the section beside it — the data are unchanged. The no-WebGL stills were taken again at that mapping, in the 9° profile, with the survey line registered to the section (`span` in `measurementFallback.data.ts`).
- **The stills** (`MeasurementLandscapeRenders.tsx`): shown while the model loads and wherever there is no WebGL. They are photographs of the live model in the surface view's profile, so they are its opening view; `measurementView.landCamera(LAND_START, frame)` places the pins over them.

| File | What it depicts | Size (px) | Format | Fit | Shown in | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `model-height.bin` | The model's ground H (m) on a 10 m grid, 451 × 231 (every 2nd node of the renders' 5 m field, the stations' corrections included). Int16 decimetres, row 0 = the front edge. | 451 × 231 samples | bin | — | every landscape view (live; without WebGL for what the ground hides) | present |
| `model-albedo.webp` | The diorama straight down (orthographic, Cycles): ground, rock, fields, trees and their shadows, beach, sea. Covers the footprint exactly (2 m per px). Also the enlarged area's image in the ellipsoid view. | 2250 × 1150 | webp | draped on the grid | every landscape view (live), the ellipsoid's enlargement | present |
| `fallback-land.webp` | The model in profile: the ground, its sides, the dashed survey line | 1000 × 572 (frame 500 × 286 at 2×) | webp (alpha) | contain, centred | פני השטח, גיאואיד (solid) — without WebGL | present |
| `fallback-clear.webp` | The same, the ground see-through: the geoid and the ellipsoid inside it, their lines along the survey line | 1000 × 572 | webp (alpha) | contain | גיאואיד (revealed) — without WebGL | present |
| `fallback-task-A.webp`, `-B`, `-C` | The same as `fallback-land`, with the receiver on its tripod beside the station | 1000 × 572 | webp (alpha) | contain | גליות וגובה — without WebGL | present |

The model ≈ 645 KB (image) + 204 KB (grid); the stills ≈ 175 KB together.

Source data and textures, not in this folder:
- `scripts/blender/data/measurement-dem.i16` + `.json`
  - SRTM 1″ heights, 145 × 253 samples around 32.71 N, 34.98 E.
  - Public domain (NASA/USGS), via the AWS Terrain Tiles skadi set.
  - The model scales them ×0.8696 and draws them 2.5× high. It shapes the coast and sea, and corrects the ground ≤ 4 m at the three stations.
- From `public/assets/lessons/topic02/contour-mountain/textures/`, read-only:
  - `{grass,dry,rock,forest}_diff.jpg`
  - Only their light and shade are used; the colours are set in the render script.

Produced by:

```
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/blender/render_measurement_landscape.py -- none
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/blender/export_measurement_model.py
node scripts/blender/package_measurement_landscape.cjs
QA_BASE=http://localhost:<port> node scripts/qa/capture-measurement-fallback.mjs
```

The render script writes `src/components/lessons/topic-02/measurementLandscape.data.ts` (the stations, the N field, the samples along the survey line, the anchors for the place names; also its own camera matrix, which the page no longer uses). It reads the station JSON block in `measurementMission.data.ts`, so any change to a station's h, N or position needs a re-run of all four steps. `scripts/qa/measurement-mission.test.mjs` fails if the landscape's data and the station data disagree.

The export script imports the render script's fields, materials and geometry, so the model and the landscape data cannot drift apart. It also writes `src/components/lessons/topic-02/measurementModel.data.ts` (grid size, files, and the points the camera frames). The package script turns the ground image into WebP. The capture script photographs the live model through the page's own controls and writes `measurementFallback.data.ts` (the frame).

The 55° layered renders of the earlier passes (`land`, `land-cut`, `geoid`, `geoid-cut`, `ellipsoid-cut`, `tripod-A/B/C`) were retired on 2026-10-12; they are in git history at `a5053ef`.

Built live on the page, not files:
- in the model (WebGL): the sides' treatment, the see-through reveal, the geoid and ellipsoid sheets with their grid, their two lines in the survey line's plane, the block's outline, the dashed survey line, the receiver on its tripod
- over the model (HTML, projected with the model's camera): the A/B/C pins (buttons; drawn as hidden when the ground hides the station), the place names, the survey line's two end dots
- the ellipsoid (SVG, turnable) with its marked area, and the enlargement of that area (SVG over the section)
- the section (`MeasurementSection.tsx`, SVG)

Icons come from `src/components/Icon.tsx` (`check`, `x`).
