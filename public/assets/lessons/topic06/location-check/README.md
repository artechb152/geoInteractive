# Location check (lesson 6, עקרונות הניווט) — assets

- `textures/` — CC0 photo materials from Poly Haven (https://polyhaven.com, no attribution required), the same set lesson 2's contour mountain uses: `aerial_grass_rock` (grass), `dry_ground_rocks` (dry), `cliff_side` (rock), `forest_leaves_02` (forest floor); 512², `_nor` = OpenGL normal maps. Copied, not shared, so lesson 2 can change its own files freely.
- `observation-north.jpg` — the static view shown when WebGL is unavailable: rendered from the live canvas (same world, same camera: yaw 0°, pitch 0°, HFOV 100°, frame 680 × 264 at 2×) by
  `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-location-check.mjs --base=http://localhost:3000 --capture-fallback`.
  Regenerate it whenever the terrain, vegetation, lighting or camera contract changes.
