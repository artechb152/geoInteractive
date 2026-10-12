# Asset manifest — topic 02 · "גלובוס חוקר" (`#scene-coordinates-2`, מערכת קואורדינטות גיאוגרפית)

Block: `src/components/lessons/topic-02/geo-globe/GlobeExplorer.tsx` (replaces `LatLonExplorer` in `CoordinatesPart2Scene.tsx`).
Reference: `design/mockups/geographic-coordinates-2026-10-12/01-globe-explorer.png` (alternative 1 in `claude-handoff.txt` there).
Built by: `node scripts/maps/build-geo-globe-textures.mjs` (inputs are downloaded to the OS temp folder when missing).

| File | Purpose | Size | Format | Source / licence |
| --- | --- | --- | --- | --- |
| `earth-color.webp` | The globe's colour, and the flat map shown without WebGL. Land is the source's own colour; only water is re-toned (below). No lighting, labels or grid baked in beyond the source's own relief shading. | 4096 × 2048 (968 KB) | WebP q90 | NASA Earth Observatory, *Blue Marble Next Generation w/ Topography and Bathymetry*, July 2004, `world.topo.bathy.200407.3x21600x10800.jpg` (<https://visibleearth.nasa.gov/images/73751>), Lanczos-downsampled. Credit: Reto Stöckli, NASA Earth Observatory. NASA imagery is not copyrighted (NASA media usage guidelines). SHA-256 of the file used: `d225f1f35a6448a4d1d8f6de6e48f3433e470085b70a35800e64f384f269a7b0`. |
| `earth-relief.png` | R / G: tangent-space relief normal (R east, G north), stored as 128 + 127·n so a flat texel is exactly 0; the shader rebuilds the up component. B: water weight (255 = water) for the sea's soft sheen. | 2048 × 1024 (831 KB) | PNG RGB | Relief: NASA Earth Observatory, BMNG *Topography* `gebco_08_rev_elev_5400x2700.tif` (GEBCO, British Oceanographic Data Centre; public domain, attribution as in `../datum-guided/ASSET-MANIFEST.md`), SHA-256 `1a4d9f6774d80b19eb0c37efd8fb3b9a36a974417c24a52e559c6645accb5965`. Water weight: from the colour image itself, with Natural Earth 1:50m land / lakes (public domain) as a prior. |

Both are plate carrée in **geodetic** latitude / longitude on WGS84 (u = (lon + 180) / 360, north at the top) — exactly the parameter of the globe's mesh, so the texture, the mesh, the graticule and the marker share one mapping (`geoCoords.ts`; checked by `scripts/qa/geo-globe.test.mjs`, which reads these files back: 30°S 90°E is open ocean, 15°N 75°E is land in peninsular India, and 17 land / sea checkpoints on every side of the map hold).

## Display adjustments (documented, monotonic, no invented geography)

- **Water tone.** The source's deep ocean is near-black navy; the mockup's sea is a restrained steel blue (`#2f5c6c` lit). Water pixels are re-toned through four tones sampled from the mockup (deep `#2A5466`, ridges `#34677A`, shelf `#4F8796`, banks `#679DA4`), driven by the source's own bathymetric brightness — every ridge, trench and shelf stays where the data puts it, only quieter. Sea ice and ice shelves (bright, nearly grey) are never re-toned.
- **What counts as water** is decided by the image's own colour (blue-dominant, or dark and blue-leaning for lake shores), with Natural Earth only shifting the threshold: islands that Natural Earth 1:50m omits stay land, lakes and coasts its coarser outline misses become water.
- **Relief normals** are exaggerated 9× in slope so relief reads at globe scale (light only — the mesh is never displaced; the silhouette is the true WGS84 ellipsoid) and ease to flat above 80° where meridians converge.

## Runtime budget

GPU: colour ≈ 43 MB with mipmaps, relief ≈ 11 MB. The canvas mounts only within ~320 px of the viewport and unmounts (textures, geometry, material and the WebGL context disposed) beyond it; the decoded images stay cached for the page.
