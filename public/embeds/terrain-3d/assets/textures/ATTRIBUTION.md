# Visual asset provenance

All external visual assets in this folder were downloaded from [Poly Haven](https://polyhaven.com/) in 1K JPG format.
Poly Haven publishes its assets under the [CC0 license](https://polyhaven.com/license), so attribution is not legally required; the sources are recorded here for provenance and future maintenance.

## Terrain

- Asset: [Rocks Ground 02](https://polyhaven.com/a/rocks_ground_02)
- Files used: albedo, OpenGL normal, roughness
- Local folder: `terrain/`

## Trail

- Asset: [Rocky Trail 02](https://polyhaven.com/a/rocky_trail_02)
- Files used: albedo, OpenGL normal, roughness
- Local folder: `trail/`

## Pine vegetation

- Asset: [Pine Tree 01](https://polyhaven.com/a/pine_tree_01)
- Files used by the current renderer: bark albedo/normal/roughness only
- Local folder: `pine/`

The twig maps (albedo/mask/normal/roughness, 1.82 MB) were deleted on 2026-08-11 as dead weight,
restored on 2026-08-13 when the crowns moved to alpha cards, and **removed again on 2026-08-16**.
The reason is that `twig-albedo.jpg` is an *atlas*: one small sprig in a corner surrounded by cones,
bark and straw. A foliage card that samples it across the full 0–1 UV range therefore shows the whole
atlas — roughly 8 % alpha coverage scattered over a mostly transparent quad, with a pine cone floating
in mid-air. No `alphaTest` value could fix that, which is why the trees read as sticks.

Foliage cards are now drawn procedurally in `src/engine/render/foliage.ts` (pine sprig, broadleaf
sprig, grass tuft, shrub mass, wildflowers and two far-distance crown impostors). That gives full
control over the alpha channel — including colour dilation into the transparent region, so mip
reduction no longer produces a dark halo — and costs nothing in the packaged bundle.

Each kind is an **atlas of variants**, not a single card: nine different sprigs per tree species,
four per grass/shrub/impostor kind. One drawing per species would have appeared roughly 120 000 times
across the sector (31 cards per crown × 4306 trees), and the eye reads that instantly as "one piece,
copied". Every card in a crown takes a different tile (`aCardTile`), and every tree rotates its whole
assignment by an offset derived from its instance position, so neighbouring trees sharing one
geometry never show the same arrangement.

GPU cost of the atlases is 38.9 MB, against 9.8 MB for the seven single cards they replace. Tile
resolution is chosen per kind: 512 px for anything seen close (sprigs, grass, shrubs), 256 px for the
crown impostors — which are only used past 180 m, where a whole tree covers under 40 pixels — and for
wildflowers.

## Ground cover, rock and cloud textures

None. Grass, shrubs, flowers, boulders and clouds are generated in code: the boulders are noise
displaced icosahedra with a world-space triplanar projection of the terrain albedo, and the clouds
are an fBm field in the sky shader.

Downloaded on 2026-07-19.
