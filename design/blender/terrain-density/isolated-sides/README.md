# Isolated terrain side views

Current density lesson: plan-view topographic map above a low oblique 3D view of the same mountain. The mesh ends at its natural zero-elevation footprint. There is no surrounding grass tile, rectangular base, foliage card layer, or geological slab. West remains left and east remains right in both views.

The broad height model now uses gently asymmetric rounded shoulders instead of high-frequency radial spurs. This produces readable, nested teaching contours and a rounded summit/foot instead of a straight-sided cone. All three Blender shape guides retain a shared camera and scale. Fine mesh relief stays small relative to the 10 m contour interval.

The live `*-natural.webp` illustrations use an AI-generated realistic surface finish guided by the Blender renders, preserving their broad silhouette, left/right orientation and image margins. Surface rocks and vegetation are illustrative, not a point-for-point surveyed elevation model. Source PNGs are preserved in `appearance/`. The map itself remains mathematically exact against `contourDensityGeometry.ts`. No live WebGL dependency is added.

Regenerate from the repository root:

```powershell
node scripts/blender/export_density_geometry.cjs
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --threads 8 --python scripts/blender/render_density_sides.py
node scripts/blender/package_density_appearance.cjs
node scripts/qa/check-density-model.cjs
```

Editable `*-side.blend` files have relative material paths into the existing project textures. The previous complete diorama models are preserved in `../archive-polished-v2/`.

`package_density_renders.cjs` still packages the unretouched Cycles guides for comparison; the component uses the separate `*-natural.webp` filenames. Regenerating guides does not overwrite the generated appearance sources. If changing the macroform again, regenerate the appearance from the new guides before publishing.
