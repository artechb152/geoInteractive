# Asset manifest — topic 02 · guided 3-D datum (`#scene-coordinates`)

Block: `src/components/lessons/topic-02/datum/DatumGuided.tsx` (replaces the 2-D `DatumFit`).
Reference: `design/mockups/datum-concepts/01-guided-3d-site-palette.png` · briefs: `design/mockups/datum-concepts/claude-guided-3d-prompt.md`, `claude-hologram-refinement-prompt.md`, `claude-realism-and-inset-prompt.md`, `claude-material-match-prompt.md`.

| File | Purpose | Size | Format | Source / licence | Status |
| --- | --- | --- | --- | --- | --- |
| `datum-fallback.webp` | Static image of the same globe, same camera, no text. Shown under the canvas until the first 3-D frame, and beside the live SVG section when WebGL is unavailable. | 1308 × 880 (the 654 × 440 stage @2×) | WebP with alpha | Rendered from this project's own live scene by `node scripts/render-datum-fallback.mjs` (`?datum-capture` hides the ellipsoid and every overlay). | present |
| `textures/earth-albedo.webp` | The globe's colour: land shaded by elevation (sage → brand.dark → border.strong tan on high ground and ridges), ice sheets bg.accent, the sea a warm ivory (bg / border.subtle) with a decorative glaze — a soft mottling and a thin, light engraved craquelure (a white surround, a core a shade toward border.strong). No lighting, labels or frame baked in. | 2048 × 1024 | WebP q92 | Built by `node scripts/build-datum-textures.mjs` from the two sources below. Colours are the lesson tokens only. | present |
| `textures/earth-normal.png` | Relief normals, tangent space (R east, G north, B up), true spherical texel spacing, faded to flat near the poles; a small raised step at the coast. | 2048 × 1024 | PNG RGB | Same script, from the elevation data. | present |
| `textures/earth-surface.png` | R land mask (Natural Earth land minus large lakes, anti-aliased) · G roughness (sea a satin glaze 0.39–0.53 with the mottling, its engraved lines matte up to 0.66; land 0.66–0.84 by ruggedness) · B valley/cavity shading (land only). | 2048 × 1024 | PNG RGB | Same script. | present |
| `textures/earth-height.png` | Display relief 0…1 (elevation^0.6 on land + the coast step), read on the CPU for the globe's geometry, the cut faces and the label occlusion test. | 1024 × 512 | PNG grey | Same script. | present |

All four textures are plate carrée (u = (lon + 180) / 360, north at the top), the projection and UVs the globe uses.

## Sources

- **Land elevation** — NASA Earth Observatory, *Blue Marble Next Generation: Topography* (`gebco_08_rev_elev_5400x2700.tif`, 0–6400 m as 0–255), <https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/topography-bathymetry-maps>. Credit: "Imagery by Jesse Allen, NASA's Earth Observatory, using data from the General Bathymetric Chart of the Oceans (GEBCO) produced by the British Oceanographic Data Centre." NASA imagery is not copyrighted (NASA media usage guidelines); the GEBCO grid is in the public domain and asks for this attribution. SHA-256 of the file used: `1a4d9f6774d80b19eb0c37efd8fb3b9a36a974417c24a52e559c6645accb5965`.
- **Coastlines and lakes** — Natural Earth 1:50m `ne_50m_land` and `ne_50m_lakes` (scalerank ≤ 4), <https://github.com/nvkelso/natural-earth-vector> (public domain). The same dataset the course already uses for its world map (`topic-09/worldMapGeometry.ts`).

Nothing procedural stands in for elevation: every slope, ridge and valley in the maps comes from the elevation file. The only stylisation is the monotonic display curve on height and the small coastal step, which makes the land read as a volume instead of a decal.

The ivory's glaze is the one procedural element, and it is a material finish, not data: a seeded random partition of the sphere (2 200 cells, a little wavy, a fifth of the edges left out) drawn as thin light lines, plus a soft two-octave mottling — in the sea's colour and roughness only (never in the normals or the height, never on the land), the same on every build. It carries no geographic or geological meaning.

## Not files, by design

- **Geoid, ellipsoid, cut faces, labels and the close-up** are built in code: geometry, canvas drawing for the cut faces, a small live 3-D close-up (`datum/DatumInset3D.tsx`) and HTML/SVG overlays. Nothing about them is baked into an image.
- No GLB: every body is built in code, so each surface stays separate and movable.

Re-run `scripts/build-datum-textures.mjs` after changing the palette or the relief curve. Re-render `datum-fallback.webp` after changing the camera, the materials or the cutaway.
