# Terrain Density Models — "זיהוי תנאי שטח לפי צפיפות"

Three procedural terrain dioramas built in Blender for the topic-02 (topography / contour reading) interaction. Each model demonstrates how landform shape controls contour-line spacing: gentle hill → sparse lines, steep mountain → dense lines, cliff → very dense lines concentrated at the rim.

## Files

| File | Purpose |
|---|---|
| `terrain-models.blend` | Editable source — all 3 models, procedural build history retained via the original contour curve objects |
| `../../public/assets/lessons/topic02/scene-terrain-density/terrain-gentle.glb` | Gentle hill, web-ready |
| `../../public/assets/lessons/topic02/scene-terrain-density/terrain-steep.glb` | Steep mountain, web-ready |
| `../../public/assets/lessons/topic02/scene-terrain-density/terrain-cliff.glb` | Cliff / mesa, web-ready |
| `terrain-*-diagonal-contours.png` | Diagonal view, with contour lines (per model) |
| `terrain-*-diagonal-no-contours.png` | Diagonal view, without contour lines (per model) |
| `terrain-*-top-contours.png` | Orthographic top-down view, with contour lines (per model) |
| `terrain-comparison.png` | All three models side by side on cream `#F3E9DC` background |

All PNG renders are 1600×1600 (individual) / 2400×1000 (comparison), transparent background except the comparison image.

## Shared scale (fair comparison)

- Base footprint: **200 × 200 m**, identical for all three models, units = meters, 1 Blender unit = 1 m.
- Horizontal/vertical axes are not exaggerated — same scale on X, Y and Z across all models.
- Surface reference (surrounding flat ground) = **Z = 0**, shared by all three.
- Diorama walls + bottom cap: uniform **8 m** depth below Z = 0.
- Contour interval: uniform **10 m** vertical spacing on all three models.
- Shared origin: each model's own object origin sits at its base center, Z = 0. All three share the same axis convention (Blender Z-up in the source file; glTF export converts to Y-up per the glTF spec — standard for Three.js).
- Same camera (see below) and same triangle-budget approach used for all three — no per-model scale-up to "fill the frame."

## Heights

| Model | Feature | Peak / plateau height |
|---|---|---|
| Gentle hill | rounded dome | ≈ 39.5 m (target ~40 m) |
| Steep mountain | distinct summit | ≈ 81 m (target ~80 m) |
| Cliff | plateau top | ≈ 60.5 m (target ~60 m) |

Contour levels generated automatically at every 10 m strictly below the model's actual peak (so the apex itself, a single point, never gets a degenerate ring):

- Gentle: 10, 20, 30 m (3 lines)
- Steep: 10–70 m (7 lines)
- Cliff: 10–50 m (5 lines, compressed into the narrow rim band)

## Contour-line generation

Lines are **not** decorative rings — each level is produced by an exact horizontal-plane bisect (`bmesh.ops.bisect_plane`) of the real surface mesh at `z = level`, so every line traces the actual cross-section of the terrain at that elevation. The resulting edge loops are converted to `POLY`-type curves (linear interpolation, no resampling) to preserve exact bisect accuracy, even in the cliff's tightly-packed band, then beveled into thin tubes and converted to mesh for export.

Line thickness was deliberately exaggerated (tube radius 0.35 m, 0.55 m on every 5th/50 m-multiple line) — a geometrically "correct" 4.5 cm line was tested first and proved sub-pixel and invisible at the size these models are shown on the site. The tubes sit centered on the exact bisect height, so they read as engraved into the surface rather than floating, without z-fighting.

**Source curves are preserved**, per-object, inside each `*_contour_curves_source` sub-collection (hidden from render) — these are the original editable `POLY` curves the exported tube mesh was generated from. The exported `*_Contours` object is a separate, lightweight mesh conversion.

## Object / collection structure

```
terrain_gentle/
  Gentle_Surface            — heightfield mesh, flat-shaded
  Gentle_DioramaBase        — walls + bottom cap, one object
  Gentle_Contours           — merged tube mesh, exported to GLB
  Gentle_contour_curves_source/   — per-level POLY curve objects (source, not exported)
terrain_steep/   (Steep_* — same structure)
terrain_cliff/   (Cliff_* — same structure)
```

Materials (English names, vertex-color driven, glTF-compatible Principled BSDF, matte — roughness 0.92–0.95, metallic 0, low specular):

- `{Model}_Surface_Mat` — reads the `ElevationColor` vertex-color attribute (blends the spec's olive greens `#6E7A4E/#55613C/#8A9163` with sand/rock `#C9B892/#E8DCC4` by slope + height)
- `{Model}_DioramaBase_Mat` — reads `DepthColor` (rock/soil banding by depth below Z=0)
- `Mat_ContourLine` — flat `#38432E`, shared by all three models' contour tubes

No image textures were needed or baked — per-vertex color carries all the shading variation, which kept every GLB well under the 5 MB target with zero texture-related risk.

## Procedural parameters (editable in the .blend)

Each terrain's height field is a Python function (kept in the file's build history / reproducible from the parameters below) of the form: radial falloff profile → height, layered Perlin noise (`mathutils.noise`) for natural asymmetry, and a square-boundary taper (falloff starts at 90 m, reaches exactly 0 at the 100 m edge) so every model's diorama wall is a clean flat rim.

- **Gentle**: peak 40 m, falloff radius ≈ 76–78 m, mild elliptical/noise asymmetry (not a cone).
- **Steep**: peak 80 m, tighter falloff radius ≈ 57 m, mid-slope noise "shoulders" (weighted to fade out at both the summit and the base so the peak stays clean and the rim stays flat).
- **Cliff**: plateau height 60 m, low ground ≈ 4 m, plateau rim radius ≈ 27 m with ≈ 4 m of noise-driven irregularity (natural, non-circular outline), transition band ≈ 6.5–10 m wide (slope ≈ 80–84°, "almost vertical" without any overhang — pure heightfield, geometrically impossible to overhang).

## Camera / lighting (used for every render)

- Orthographic camera, azimuth −45°, elevation 35° above horizon (diagonal shots); straight down for top views.
- Same `ortho_scale` per shot type across all three models (340 diagonal / 235 top / 820 for the 3-up comparison) — nothing is scaled to "fill the frame" individually.
- Two suns (soft key + weak fill from the opposite side) plus flat world ambient, `angle` widened on the key sun for soft penumbra shadows. All materials matte (see above) — no glossy surfaces.
- Renders use the **Standard** view transform (not AgX) so on-screen colors match the spec's hex palette faithfully — AgX's highlight rolloff was measurably graying/desaturating the cream background and pale rock tones in testing.

## Triangle counts & file sizes

| Model | Surface | Diorama base | Contours | **Total tris** | GLB size |
|---|---|---|---|---|---|
| Gentle | 32,768 | 1,026 | 7,152 | **40,946** | 1.82 MB |
| Steep | 32,768 | 1,026 | 15,432 | **49,226** | 1.70 MB |
| Cliff | 32,768 | 1,026 | 14,760 | **48,554** | 2.90 MB |

All three are under the ~50,000-triangle target and the 5 MB target, confirmed by round-trip re-import (see below). The cliff's contour tubes cost more triangles than the other two because its rim sits at a larger average radius (longer loop perimeter per level) — traded off here in favor of keeping the mesa's rim fully steep and readable rather than trimming line thickness.

## Known stylistic note

The cliff's near-vertical wall has a pronounced vertical "fluted" texture from the combination of grid resolution and the angular-noise-perturbed rim (kept deliberately for a natural, non-cylindrical outline per the brief). It reads as rock ribbing/erosion channels rather than a smooth wall — flag if a smoother wall is preferred; the noise frequency/amplitude are isolated, easily-tunable parameters in the build code.

## Export verification

Each GLB was round-trip verified: re-imported into a scratch scene, confirmed exactly 3 objects per file (`*_Surface`, `*_DioramaBase`, `*_Contours` — no leftover curve/camera/light data), and triangle counts matched the source `.blend` exactly (see table above). **Browser/Three.js testing was not performed** — that should be a separate check once these are wired into a scene.
