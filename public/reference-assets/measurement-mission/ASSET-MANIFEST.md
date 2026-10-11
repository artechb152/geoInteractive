# Asset manifest — measurement mission

Screen: topic-02 `#scene-coordinates` → "אליפסואיד, גיאואיד וגליות" (the four views and the measurement task).
Reference: `design/mockups/topic-02-geodesy/03-measurement-mission-v2.png` (composition and landscape quality; site palette).
Two forms of one landscape, both from `scripts/blender/render_measurement_landscape.py`'s fields:

- **The turnable model** (WebGL, `MeasurementLandscape3D.tsx`): the height grid `model-height.bin` meshed every 10 m, wearing `model-albedo.webp` — the diorama rendered straight down with the renders' sun, sky and look — unlit. The page builds the walls, the slab that opens along the survey line, the reference sheets, the lines, the arrows and the receiver itself.
- **The layered renders** (`MeasurementLandscapeRenders.tsx`): shown while the model loads and wherever there is no WebGL. They are the model's opening view: `measurementView.landCamera(LAND_START)` solves the renders' own camera, so pins and section register with both.

All layers come from one Cycles render with one fixed camera, at 1400 × 800 px (aspect 1.75). On the page the renders keep that aspect, centred in the stage.

Each layer is cropped to its own alpha box. Its placement in the frame is written to `src/components/lessons/topic-02/measurementLandscapeLayers.data.ts`.

| File | What it depicts | Size (px) | Format | Fit | Shown in | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `land.webp` | The whole diorama:<br>• real terrain (SRTM, Carmel west flank) under maquis and pine<br>• limestone outcrops, a coastal plain with fields and a road, a beach and the sea<br>• a thin cut edge in the site's ground tone, and a contact shadow | 1382 × 800 | webp (alpha) | placed 1:1 in the frame | פני השטח, גליות וגובה, גיאואיד (closed) | present |
| `land-cut.webp` | The same diorama with the slab in front of the survey line taken away. Its cut face is the section along the line. | 1400 × 800 | webp (alpha) | 1:1 | גיאואיד (open) | present |
| `geoid.webp` | The geoid sheet wherever no land covers it — over the sea. Faint fill, analytic grid. | 208 × 541 | webp (alpha) | 1:1 | גיאואיד (closed) | present |
| `geoid-cut.webp` | The geoid sheet with the slab open: in the opened strip and over the sea | 1320 × 541 | webp (alpha) | 1:1 | גיאואיד (open) | present |
| `ellipsoid-cut.webp` | The flat ellipsoid sheet in the opened strip (sparser grid, fainter) | 1322 × 198 | webp (alpha) | 1:1 | גיאואיד (open) | present |
| `model-height.bin` | The model's ground H (m) on a 10 m grid, 451 × 231 (every 2nd node of the renders' 5 m field, the stations' corrections included). Int16 decimetres, row 0 = the front edge. | 451 × 231 samples | bin | — | every landscape view (live) | present |
| `model-albedo.webp` | The diorama straight down (orthographic, Cycles): ground, rock, fields, trees and their shadows, beach, sea. Covers the footprint exactly (2 m per px). | 2250 × 1150 | webp | draped on the grid | every landscape view (live) | present |
| `tripod-A.webp`, `tripod-B.webp`, `tripod-C.webp` | The GNSS receiver on its tripod beside each station, with its cast shadow | ≈ 160–185 × 115–130 | webp (alpha) | 1:1 | גליות וגובה (the picked station) | present |

Renders ≈ 525 KB; the model ≈ 645 KB (image) + 204 KB (grid).

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
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/blender/render_measurement_landscape.py
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/blender/export_measurement_model.py
node scripts/blender/package_measurement_landscape.cjs
```

The export script imports the render script's fields, materials and geometry, so the model and the renders cannot drift apart. It also writes `src/components/lessons/topic-02/measurementModel.data.ts` (grid size, files, and the points the camera frames).

The render script also writes `src/components/lessons/topic-02/measurementLandscape.data.ts`:
- the camera matrix
- the stations
- the N field
- the samples along the survey line, with what the camera sees of it
- the anchors for the place names

It reads the station JSON block in `measurementMission.data.ts`. Any change to a station's h, N or position needs a re-render. `scripts/qa/measurement-mission.test.mjs` fails if the renders' data and the station data disagree.

Built live on the page, not files:
- in the model (WebGL): the cut base and walls, the slab that drops away, the geoid and ellipsoid sheets with their grid, the dashed survey line, the station ring, the three lines on the cut face, the h / N / H arrows, the receiver on its tripod
- over the model (HTML, projected with the model's camera): the A/B/C pins (buttons; drawn as hidden when the ground hides the station), the place names, the names on the cut face, the arrows' letters, "מבט התחלתי" and the drag hint
- the ellipsoid (SVG, turnable) and the callout from its marked area to the section
- the section (`MeasurementSection.tsx`, SVG)

Icons come from `src/components/Icon.tsx` (`check`, `x`).
