# Asset sources & licenses — lesson 6, navigation replay („מתי עוצרים לבדוק?”)

Built by `scripts/build-navigation-replay-assets.mjs` (ground, sky, shrub atlases) and
`scripts/blender/build_navigation_replay_models.py` (headless Blender 5.2: rocks, shrub renders), which
download the 1K files from the public Poly Haven API (`api.polyhaven.com`, no key, no cost). The downloads
are cached in the OS temp folder and not committed. Re-run both to rebuild.

## Source assets — Poly Haven, CC0 1.0 Universal (public domain)

No attribution is legally required; credited here for traceability.

| Used as | Poly Haven asset | URL |
|---|---|---|
| Ground layer `grass` (dry, pale grass with small stones) | Grass Path 3 | https://polyhaven.com/a/grass_path_3 |
| Ground layer `soil` (brown stony soil) | Rocks Ground 08 | https://polyhaven.com/a/rocks_ground_08 |
| Ground layer `limestone` (pale rock through the soil) | Rocks Ground 06 | https://polyhaven.com/a/rocks_ground_06 |
| Ground layer `gravel` (dirt road, dry stream bed) | Rocks Ground 01 | https://polyhaven.com/a/rocks_ground_01 |
| Sky dome `sky.webp` | Kloofendal 48d Partly Cloudy (Pure Sky), tone-mapped JPG | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |
| Leaf cards and far shrubs (`shrub_leaves.webp`, `shrub_far.webp`) | Searsia Lucida (rendered, not shipped as a model) | https://polyhaven.com/a/searsia_lucida |
| Rocks in `rocks.glb` (`rock_rock_*`) | Rock Moss Set 02 | https://polyhaven.com/a/rock_moss_set_02 |
| Rocks in `rocks.glb` (`rock_namaqualand_*`) | Namaqualand Rocks 01 | https://polyhaven.com/a/namaqualand_rocks_01 |
| Stones and stream cobbles in `rocks.glb` (`stone_namaqualand_*`) | Namaqualand Stones 01 | https://polyhaven.com/a/namaqualand_stones_01 |

## What was done to them

- `ground/<layer>_albedo.webp` — diffuse map in RGB, displacement (stretched to 0–1) in A for height
  blending; WebP q84, 1024 px.
- `ground/<layer>_normal.webp` — OpenGL normal X / Y in RG, roughness in B; WebP q90, 1024 px.
- `sky.webp` — Poly Haven's tone-mapped JPG, 4096 px wide, upper 5/8 of the equirect; the sun sits at u = 0.588,
  ~50° up (the scene's sun is aligned to it).
- `shrub_leaves.webp` — 8 Cycles renders of canopy close-ups of the scanned shrub (sky light only), each
  faded to an irregular round edge and graded towards dark Mediterranean maquis; 4 × 2 cells of 512 px.
- `shrub_far.webp` — 4 dense bush silhouettes composed from those close-ups; 2 × 2 cells of 512 px.
- `rocks.glb` — every scan as its own node, decimated (rocks ~700, stones ~180 triangles), origin at the
  base, textures 512 px WebP; a single-channel roughness texture the exporter could not pack is dropped.
  In the scene each piece is normalised to 1 m across and graded towards pale limestone in the shader.

## Everything else

The height field (stream valley, two summits and the saddle, the road's valley, the spur and the gully),
the scatter of shrubs, cushions, grass, stones and rocks, the grass tufts, the leaf-card shrubs, lighting,
haze and the UI are original code (`src/components/lessons/topic-06/navigation-replay/`).

`fallback/m<moment>-<quarter>.webp` are photographs of the live model from the four stations (quarter 0 =
the opening look, then a quarter turn clockwise each), taken by
`scripts/qa/capture-navigation-replay-fallback.mjs`. Re-run it whenever the ground, the vegetation, the
lighting or a station changes.

No runtime network access: every file is served from this folder (paths honour `NEXT_PUBLIC_BASE_PATH`),
so the static export and the SCORM package carry them.
