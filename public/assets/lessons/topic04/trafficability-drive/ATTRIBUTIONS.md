# Asset sources & licenses — trafficability driving lab

## Terrain PBR textures (`textures/<hard|soft|sand|mud>/{diffuse,normal,roughness}.webp`)

Source: [Poly Haven](https://polyhaven.com) — **CC0 1.0 Universal (public domain)**.
No attribution legally required; credited here for traceability.

| Soil in the lab | Poly Haven asset | URL |
|---|---|---|
| Hard rocky ground | Rocky Terrain 03 | https://polyhaven.com/a/rocky_terrain_03 |
| Soft rocky ground | Dry Ground 01 | https://polyhaven.com/a/dry_ground_01 |
| Sand & dunes | Aerial Sand | https://polyhaven.com/a/aerial_sand |
| Mud / loess | Muddy Tracks | https://polyhaven.com/a/muddy_tracks |

Downloaded at 1K resolution (diffuse/nor_gl/rough, jpg) via the public Poly Haven API
(`api.polyhaven.com`, no key required), then re-encoded to WebP locally
(`ffmpeg`, already a project devDependency) to cut payload size (~10.9MB → ~2.1MB
across all four terrains combined). `thumb.webp` (picker card) and `poster.webp`
(pre-drive hero image) are cropped/scaled from the same `diffuse.webp` — the
preview images are genuinely the ground you drive on, not a separate mockup.

## Vehicle model (`models/vehicle.glb`)

Self-authored, procedurally built from primitive geometry (boxes/cylinders +
bevel modifiers) via a headless Blender Python script —
`scripts/blender/build_vehicle.py`. No textures, no external mesh source, no
license obligations. Materials are flat PBR (base color/roughness/metallic
only). Regenerate with:

```
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender/build_vehicle.py
```

## Everything else

Terrain relief (heightfield), the vehicle controller, lighting and all UI are
original code — no external assets.
