# Route workbench terrain

The displayed asset is `public/assets/lessons/topic06/route-story/workbench-terrain-realistic.webp` (1502 × 1047 px, 928,352 bytes). It is a generated, illustrative Mediterranean terrain map, not a surveyed orthophoto. The north-up extent is x = −16…116 and y = 0…92. The tiny aspect-ratio rounding difference is fitted to that exact extent; route and measurement coordinates remain isotropic in SVG.

## Provenance

Created on 2026-11-01 with the built-in image-generation tool in image-edit mode. First reference: the deterministic geometry guide `public/assets/lessons/topic06/route-story/workbench-terrain.webp`, produced by `scripts/maps/build-route-workbench.mjs` from `routeStoryModel.ts`. Second reference: the user-approved workbench mockup, used for realism only. Source output: `C:/Users/idog2/.codex/generated_images/01a19617-9e9a-7452-88fe-2ae9fe3e120c/exec-7c6dfb8d-bb56-4d09-b519-db165f192d96.png`. Packaged as WebP at quality 93 with Sharp, without changing terrain contents.

Generation brief: preserve the first reference's exact north-up geographic layout and terrain-only framing; replace procedural vegetation, rocks and soil with realistic overhead Mediterranean pine canopies, limestone outcrops, dry grasses, earth and gravel. Preserve the diagonal dirt road, stream bend, paired hills and saddle, intermediate grove and separate rocky-pine destination. Use the approved mockup's photographic detail and natural lighting. Keep fine contour lines and summit labels 456/449. No route, checkpoints, compass, ruler, UI, buildings, new roads or rivers.

Explicit positional constraints supplied: road enters 38% across top, passes 65% across/39.5% down and exits right at 75%; stream enters left at 51%, bends 35% across/65% down and exits right at 88%; summits at 49%/46% and 56%/62%, saddle at 52.4%/54.3%; grove at 67%/25%; rocky pines at 79%/17%.

## Accuracy and limits

All five checkpoints, four legs, distances, bearings, ruler and protractor remain live deterministic geometry from the lesson model. The illustration contains no baked route answers. Contours are illustrative; their generated detail is not an elevation dataset and is not used for calculation. Full-resolution inspection places point 3 at the col between the two summits, point 4 on the dirt-road corridor, point 5 in the rocky-pine patch and the stream-bend hotspot within approximately one map unit of the visible bend. The existing point-2 approach position before the bend remains unchanged.

The procedural guide remains available for future edits and is not the production display asset. Re-running its generator does not overwrite the photographic illustration.

## Displayed views (2026-11-01)

The workbench now shows two derived files, both rebuilt by `scripts/maps/build-route-workbench-layers.mjs` in the same x = −16…116, y = 0…92 frame:

- `workbench-ortho.webp` — this photo with its faint baked 10-unit grid painted out (the live 100 m grid replaces it). The source photo above is not modified.
- `workbench-topo.webp` — the topographic map of the same ground: contours of `scripts/maps/route-workbench-relief.mjs` (the surface the guide, and so the photo, was made from), the lesson's stream and road, and woodland / trees / rocky ground mapped from the photo's own canopy and limestone density.
