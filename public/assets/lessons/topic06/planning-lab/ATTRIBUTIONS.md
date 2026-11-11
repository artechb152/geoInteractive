# Asset sources & licenses — lesson 6, planning lab („לפני שיוצאים: מה צריך לתכנן?”)

The live 3D model's ground is built by `scripts/build-planning-lab-assets.mjs`, which downloads the 1K
files from the public Poly Haven API (`api.polyhaven.com`, no key, no cost) and packs them. The sky and
the rocks are the planning lab's own copies of the navigation replay's files (`../navigation-replay/`,
see its ATTRIBUTIONS.md), so that a later change to either activity's files leaves the other unchanged
(`--copy-replay` copies them again).

## Source assets — Poly Haven, CC0 1.0 Universal (public domain)

No attribution is legally required; credited here for traceability.

| Layer in `terrain/` (strip order) | Used as | Poly Haven asset | URL |
|---|---|---|---|
| 0 grass | dry grass — the open hillside | Withered Grass | https://polyhaven.com/a/withered_grass |
| 1 herbs | low green herbs — hollows, drainage lines, shaded faces | Sparse Grass | https://polyhaven.com/a/sparse_grass |
| 2 soil | brown stony soil, terra rossa in the pockets | Dry Ground Rocks | https://polyhaven.com/a/dry_ground_rocks |
| 3 rubble | limestone rubble in soil — rocky slopes, under the ledges | Rocks Ground 05 | https://polyhaven.com/a/rocks_ground_05 |
| 4 bedrock | weathered limestone — outcrops and ledges, the rocks at B | Worn Rock Natural 01 | https://polyhaven.com/a/worn_rock_natural_01 |
| 5 pebbles | the beds of the stream and the ravine | Dry River Pebbles | https://polyhaven.com/a/dry_river_pebbles |
| 6 trail | the dirt roads and the building's yard | Rocky Trail | https://polyhaven.com/a/rocky_trail |
| 7 needles | the grove's floor | Forest Leaves 04 | https://polyhaven.com/a/forest_leaves_04 |

| File | Poly Haven asset | URL |
|---|---|---|
| `sky.webp` | Kloofendal 48d Partly Cloudy (Pure Sky) | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |
| `rocks.glb` | Rock Moss Set 02, Namaqualand Rocks 01, Namaqualand Stones 01 | https://polyhaven.com/a/rock_moss_set_02 · https://polyhaven.com/a/namaqualand_rocks_01 · https://polyhaven.com/a/namaqualand_stones_01 |

## What was done to them

- `terrain/albedo.webp` — each layer's diffuse map, 512 px, flipped vertically, stacked top to bottom in
  one 512 × 4096 strip (RGB, WebP q90). The model reads it as one texture array (layer k = rows 512·k …).
- `terrain/normal.webp` — the same layers: OpenGL normal X / Y in RG, the displacement (stretched to
  0–1) in B; RGB only, so no pixel is lost under a zero alpha.
- `sky.webp`, `rocks.glb` — copied unchanged.

Where each layer lies, the colour grading (each scan's mean taken to a local dry-season albedo), the
tiling, the rocks' limestone grade and every shape of the trees, maquis and buildings are done in code
(`src/components/lessons/topic-06/planning-lab/planningLabGround.ts`, `planningLabAnalysis.ts`,
`planningLabCover.ts`, `planningLabScenery.ts`). `overview.jpg` is a photograph of the live model for
browsers without WebGL (`scripts/qa/shot-planning-lab.mjs --still`).
