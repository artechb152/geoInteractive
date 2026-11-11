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

## Second generation — `v2/` (2026-11-01 graphics pass)

The live view now loads `v2/` (the first-generation files above stay for older builds; `sky.webp`
is still shared). Built by `scripts/build-navigation-replay-assets.mjs --only=v2-*` and
`scripts/blender/build_navigation_replay_v2.py` (headless Blender 5.2, CPU) from the public
Poly Haven API — the order is in the script's v2 section. All sources CC0 1.0 (public domain).

| Used as | Poly Haven asset | URL |
|---|---|---|
| Ground layer `cover` (dry turf, dead grass and roots; tiled at its 2.5 m) | Grass Ground | https://polyhaven.com/a/grass_ground |
| Ground layer `soil` (brown earth with stones; 2 m) | Rocks Ground 02 | https://polyhaven.com/a/rocks_ground_02 |
| Ground layer `karst` (limestone knobs through the soil; 3 m) — also the rocks' triplanar detail | Rocks Ground 05 | https://polyhaven.com/a/rocks_ground_05 |
| Ground layer `gravel` (road bed, stream bed; 3 m) | Rocks Ground 09 | https://polyhaven.com/a/rocks_ground_09 |
| Maquis `maquis_0/1/3`, leaf clusters `maquis_clusters`, far shrubs | Searsia Burchellii | https://polyhaven.com/a/searsia_burchellii |
| Maquis `maquis_2`, leaf clusters `lucida_clusters` (also the olives' and sage's foliage) | Searsia Lucida | https://polyhaven.com/a/searsia_lucida |
| Dwarf shrubs `dwarf_0…3`, leaf clusters `dwarf_clusters` | Wild Rooibos Bush | https://polyhaven.com/a/wild_rooibos_bush |
| Grass clumps `grass_0…2` (the dried diffuse) | Grass Medium 02 | https://polyhaven.com/a/grass_medium_02 |
| Oaks / olives `oak_0` (trunk and branching), `oak_bark` | Island Tree 02 | https://polyhaven.com/a/island_tree_02 |
| Oaks `oak_1` (trunk and branching), `oak_bark` | Island Tree 01 | https://polyhaven.com/a/island_tree_01 |
| Pine needle clusters `pine_clusters`, `pine_bark` | Pine Sapling Small | https://polyhaven.com/a/pine_sapling_small |
| Rocks `rock_0…6` | Moon Rock 01–07 | https://polyhaven.com/a/moon_rock_01 (… _07) |
| Rock `rock_7` (karst boulder) | Boulder 01 | https://polyhaven.com/a/boulder_01 |
| Rock `rock_8` (rounded slab) | Namaqualand Boulder 05 | https://polyhaven.com/a/namaqualand_boulder_05 |

What was done to them:

- `v2/ground/<layer>_albedo.jpg` — the diffuse map, 2048 px (`cover`) / 1536 px, JPEG q82.
  `<layer>_normal.jpg` — OpenGL normal X / Y in RG, the displacement (stretched to 0–1) in B, 1024 px,
  JPEG 4:4:4 q84. The shader tiles each at the scan's real width and height-blends the four.
- `v2/rocks.glb` — each rock scan normalised to 1 m across, origin at its base, welded and decimated
  to two levels (`rock_<k>_lod0` ~2.4–4.2k, `_lod1` ~0.4–0.9k triangles); geometry only.
  `v2/rocks/rock_<k>_albedo.jpg`, `_normal.jpg` — the scans' maps, 512 px (moon rocks) / 1024 px.
  In the scene they are graded towards pale limestone, with lichen, dust and soil stains, in the shader.
- `v2/plants.glb` — geometry only, two levels each (`<variant>_lod0|lod1_leaf|wood`). The scans'
  thousands of single-leaf cards are replaced by cluster cards (below) placed at a random subset of the
  scans' own leaf positions; the twigs and stems are kept, small pieces dropped, decimated. Grass
  clumps keep their own blade cards (thinned for lod1). Maquis normalised to 1 m tall, dwarf shrubs
  0.5 m, grass 0.35 m; trees keep their metres and are fitted to each map tree's crown in the scene.
- `v2/pines.glb` — Aleppo pines built in the script (a tall bent bole, branches, an open crown of
  needle-tuft cards); only the needle clusters and the bark come from the scan.
- `v2/plants/<atlas>_clusters.webp` — 8 Cycles renders (sky light only, transparent film) of a patch
  of each scan's outer foliage with its cut-out mask, 4 × 2 cells of 512 px, each faded to a lobed
  round edge; `far_shrubs.webp` — four whole shrubs seen from the side, 2 × 2. The colour under every
  not-fully-opaque texel is dilated from the leaves, so edges filter to leaf colour, never to the
  background.
- `v2/plants/<species>_albedo.webp` — the scans' own diffuse with their cut-out mask in A (dilated),
  1024 px: the wood of the shrubs and the grass blades. `oak_bark.jpg`, `pine_bark.jpg` — 512 px.
