# Archived — contour density terrain miniatures

These editable Blender scenes replace the photographic background treatment in topic-02's density section. Each scene contains the actual terrain mesh, 10 m contour curves, surface-following A–B marks, alpha-card scrub, physical soil sides, camera and lights.

- `gentle-relief.blend`: broad 45 m hill.
- `steep-relief.blend`: compact 86 m mountain with eroded spurs and gullies.
- `cliff-relief.blend`: 86 m cuesta, gentle western backslope and steep eastern wall.

This version is archived at the user's request. The live lesson now uses a flat topographic map above an isolated 3D side view of the mountain, without the surrounding grass tile. The original editable scenes are preserved here unchanged; the folder stays at the same depth so their relative texture paths remain valid. Current side-view sources are in `../isolated-sides/`.

The archived version used six optimized WebP Cycles renders (three reliefs and three solid geological sections). Its previews remain in `public/assets/lessons/topic02/contour-density/dioramas/` as `*-relief.webp` and `*-section.webp`; they are no longer displayed in the lesson.

## Regenerate

Run from the repository root (Node 24+, Blender 5.2):

```powershell
node scripts/blender/export_density_geometry.cjs
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --threads 8 --python scripts/blender/render_density_dioramas.py
node scripts/blender/package_density_renders.cjs --archive
node scripts/qa/check-density-model.cjs
```

Optional terrain IDs after `--` restrict rendering to those states. Render intermediates live under the ignored `qa-output/density-blender/`; editable relief scenes are saved here. The archive packaging command regenerates historical label data; run the current side-view packaging command afterward before running the current lesson.

The single geometric source is `contourDensityGeometry.ts`. Surface meshes, contour positions and A–B sections are sampled from the same functions. Secondary radial erosion adds natural shape variation without changing the 10 m contour interval or the intended gentle/steep/cliff distinction. All terrain states use the same world scale and camera; the same section camera is used across all three sections.

Materials reuse the existing project's Poly Haven CC0 grass/limestone photo textures and leaf atlas in `public/assets/lessons/topic02/contour-mountain/textures/`. The section uses the generated limestone material from the preceding art pass. Texture paths inside the Blend files are relative to the repository; retain those asset folders when moving a scene.

Geometry QA checks monotonic height rays, contour elevation residuals, section intersections and density ordering. Desktop visual evidence for every state is saved under `qa-output/density-blender/*-browser-1440.png`.
