# Location check (lesson 6, עקרונות הניווט) — assets

- `textures/` — CC0 photo materials from Poly Haven (https://polyhaven.com, no attribution required), the same set lesson 2's contour mountain uses: `aerial_grass_rock` (grass), `dry_ground_rocks` (dry), `cliff_side` (rock), `forest_leaves_02` (forest floor); 512², `_nor` = OpenGL normal maps. Copied, not shared, so lesson 2 can change its own files freely.
- `observation-north.jpg` — the static view shown when WebGL is unavailable: rendered from the live canvas (same world, same camera: yaw 0°, pitch 0°, HFOV 100°, frame 680 × 264 at 2×) by
  `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-location-check.mjs --base=http://localhost:3000 --capture-fallback`.
  Regenerate it whenever the terrain, vegetation, lighting or camera contract changes.
- `vegetation/atlas_albedo.webp`, `vegetation/atlas_normal.webp` — the cards of the grove trees, the maquis shrubs and the grass tufts. The observation's camera never moves, so each plant is a card turned towards the eye that shows a render of a scanned plant, lit by the scene's own sun and sky through the render's normals. Built from Poly Haven CC0 scans (https://polyhaven.com/license):
  [Island Tree 01](https://polyhaven.com/a/island_tree_01), [Island Tree 02](https://polyhaven.com/a/island_tree_02) (grove trees),
  [Searsia Burchellii](https://polyhaven.com/a/searsia_burchellii), [Searsia Lucida](https://polyhaven.com/a/searsia_lucida) (shrubs — whole bushes and their crowns alone, "mounds"),
  [Grass Medium 02](https://polyhaven.com/a/grass_medium_02) (tufts, graded to straw in the shader).
  Rebuild: `node scripts/build-location-check-assets.mjs --only=models` (downloads to the OS temp folder), then
  `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P scripts/blender/build_location_check_sprites.py` (set `LC_CPU=1` where Blender's GPU probe crashes; `LC_ONLY=shrub,grass` re-renders only those kinds), then
  `node scripts/build-location-check-assets.mjs --only=atlas`, which also writes `src/components/lessons/topic-06/locationCheckSpriteAtlas.ts`.
- `rocks.glb` — a copy of the dead-reckoning activity's weathered stones (`../dead-reckoning/rounded-rocks.glb`, from Poly Haven [Sand Rocks Small 01](https://polyhaven.com/a/sand_rocks_small_01) and [Rock 07](https://polyhaven.com/a/rock_07), CC0), graded to pale limestone in the shader. Copied, not shared.
