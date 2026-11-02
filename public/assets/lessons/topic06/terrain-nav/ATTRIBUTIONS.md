# Asset sources & licenses — lesson 6, terrain association (ניווט לפי השטח)

`ground/`, `village/` and `tree/` are packed by `scripts/build-terrain-nav-textures.mjs` from the 1K files
of the public Poly Haven API (`dl.polyhaven.org`, no key, no cost). The downloads are not committed.

## Source assets — Poly Haven, CC0 1.0 Universal (public domain)

No attribution is legally required; credited here for traceability.

| Used as | Poly Haven asset | URL |
|---|---|---|
| Ground layer `grass` (olive grass with litter) | Forest Ground 01 | https://polyhaven.com/a/forrest_ground_01 |
| Ground layer `dry` (dry grass with stones) | Grass Path 2 | https://polyhaven.com/a/grass_path_2 |
| Ground layer `rock` (limestone breaking through) | Rock Boulder Dry | https://polyhaven.com/a/rock_boulder_dry |
| Ground layer `forest` (pine litter of the groves) | Forest Ground 03 | https://polyhaven.com/a/forrest_ground_03 |
| Ground layer `road` (gravel of the tracks, yards, beds) | Rocky Trail 02 | https://polyhaven.com/a/rocky_trail_02 |
| Ground layer `soil` (fields, orchard floor) | Farm Soil | https://polyhaven.com/a/farm_soil |
| Village walls (plaster and dressed stone) | Grey Plaster 03 | https://polyhaven.com/a/grey_plaster_03 |
| Village roofs (ceramic tiles) | Ceramic Roof 01 | https://polyhaven.com/a/ceramic_roof_01 |
| Bark of the Aleppo pines (`tree/bark_pine`) | Pine Bark | https://polyhaven.com/a/pine_bark |
| Bark of the oaks (`tree/bark_oak`) | Bark Brown 02 | https://polyhaven.com/a/bark_brown_02 |
| Bark of the olives (`tree/bark_olive`) | Bark Willow 02 | https://polyhaven.com/a/bark_willow_02 |

The boulders and loose stones reuse the dead-reckoning scene's scanned `../dead-reckoning/rounded-rocks.glb`
(Sand Rocks Small 01, CC0 — see `../dead-reckoning/ATTRIBUTIONS.md`), graded to limestone in the shader.

## What was done to them

- `<layer>_albedo.webp` — the diffuse map, unchanged pixels, WebP q82, 1024 px (the bark 512 px).
- `<layer>_normal.webp` — the OpenGL normal map in RG and the displacement map (stretched to the full
  0–1 range) in B, WebP q76, 1024 px. The ground shader height-blends the layers with it.

In the model each scan is graded towards the model's own palette (the colours that match the map's land
cover), sampled at two scales with shifted copies per patch (no repeat grid), and calmed with distance —
in the shader (`src/components/lessons/topic-06/terrain-nav/terrainNavGround.ts`), not in the files.

## Everything else

The terrain, the relief / open-sky / drainage bake, the contact shade, the trees and shrubs (grown in
code by space colonisation, their leaves painted into a canvas atlas at load), the grass, the houses' windows,
doors and shutters, the solar heaters, the water tower, the sky, the air and the lighting are original code
(`terrainNavGround.ts`, `terrainNavTrees.ts`, `terrainNavGrass.ts`, `terrainNavCover.ts`, `terrainNavAir.ts`,
`TerrainNav3D.tsx`). `overview.jpg` and `leg-1…4.jpg` (the no-WebGL pictures) are photographed from the live
model by `scripts/qa/shot-terrain-nav.mjs --capture-fallback`.
No runtime network access: every file is served from this folder.
