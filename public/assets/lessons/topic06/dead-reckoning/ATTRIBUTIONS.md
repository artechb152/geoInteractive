# Asset sources & licenses — lesson 6, dead reckoning in a sandstorm (ניווט עיוור)

Everything here is built by `scripts/blender/build_dead_reckoning_assets.py` (headless Blender 5.2),
which downloads the 1K files from the public Poly Haven API (`api.polyhaven.com`, no key, no cost)
and packs them. Re-run it to rebuild; the downloads are not committed.

## Source assets — Poly Haven, CC0 1.0 Universal (public domain)

No attribution is legally required; credited here for traceability.

| Used as | Poly Haven asset | URL |
|---|---|---|
| Ground layer "ground" (base desert soil) | Gravelly Sand | https://polyhaven.com/a/gravelly_sand |
| Ground layer "stony" (gravel patches, wadi bed) | Rocky Trail | https://polyhaven.com/a/rocky_trail |
| Ground layer "bank" (eroded wadi banks, steep faces) | Excavated Soil Wall | https://polyhaven.com/a/excavated_soil_wall |
| Ground layer "drift" (wind-blown sand) | Dense Sand | https://polyhaven.com/a/dense_sand |
| Small stones `stone_a`–`stone_e` | Namaqualand Stones 01 | https://polyhaven.com/a/namaqualand_stones_01 |
| Rocks `rock_a`–`rock_d` | Namaqualand Rocks 01 | https://polyhaven.com/a/namaqualand_rocks_01 |
| Rock `rock07_a` | Rock 07 | https://polyhaven.com/a/rock_07 |
| Boulder `boulder_a` | Namaqualand Boulder 05 | https://polyhaven.com/a/namaqualand_boulder_05 |
| Dry bushes `shrub_b`–`shrub_e` | Wild Rooibos Bush | https://polyhaven.com/a/wild_rooibos_bush |

## What was done to them

- `ground/<layer>_albedo.webp` — the diffuse map, unchanged pixels, WebP q80, 1024 px.
- `ground/<layer>_normal.webp` — the OpenGL normal map in RG and the displacement map (stretched to
  the full 0–1 range) in B, WebP q84, 1024 px. The scene height-blends the layers with it.
- `ground/roughness.webp` — the four layers' roughness maps, one per channel (R ground, G stony,
  B bank, A drift), 512 px.
- `rocks.glb` — each scanned piece separated, decimated (stones 220, rocks 900, boulder 2,600
  triangles), origin moved to the centre of its base, textures re-encoded (512 px; the boulder 1024).
- `shrubs.glb` — four of the five bushes (the largest, 13k triangles, is left out), origin at the
  root, textures 512 px.

In the scene the colours are graded towards one local palette (the scans come from other deserts),
rocks get a dust coat on their upward faces and the bushes are dried towards grey-brown — in the
shaders, not in the files.

## Everything else

The terrain (height field, wadi, roads, drifts), the scatter of rocks and bushes, the sandstorm
(dust function, sky, airborne grains), the lighting and the UI are original code. The compass body
image is the lesson's own (`../compass/compass-body.webp`, `scripts/blender/build_compass_body.py`).
No runtime network access: every file is served from this folder, so the static export and the
SCORM package carry them.

## Weathered stone silhouettes (2026-11-01)

The live scene now loads `rounded-rocks.glb`, built by
`scripts/blender/build_dead_reckoning_rounded_rocks.py` from
[Sand Rocks Small 01](https://polyhaven.com/a/sand_rocks_small_01), by Rob Tuytel
and Rico Cilliers, [CC0](https://polyhaven.com/license).

Ten exposed, naturally weathered stone islands are extracted from the scan by
cutting its connecting sandy base at 6.5 cm. The buried cut surfaces are capped;
the original exposed UVs and scan textures are retained. Each piece is reduced
to about 260 triangles (small stones), 850 (medium rocks) or 2,600 (the boulder), with shared 512px
textures. Their names, radius/height bounds and base origins follow the existing
scatter contract. `rock07_a` from the original `rocks.glb` remains
as an occasional more fractured piece. The original asset is retained as a build
input; the browser downloads only the replacement asset.

Rebuild (the source glTF and its textures are downloaded once into the cache):

```text
blender --background --factory-startup --python scripts/blender/build_dead_reckoning_rounded_rocks.py -- --src <download-cache> --out public/assets/lessons/topic06/dead-reckoning
```
