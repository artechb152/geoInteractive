# Assets — coordinates 1 opening definitions
Created: 2026-10-12. Selected design: option 1, two always-visible illustrated definition cards.

## Location and use
Runtime folder: `public/assets/lessons/topic02/scene-coordinates/definitions/`.
Intended use: `CoordinatesScene.tsx` → `IntroColumns`. Assets are prepared; lesson code has not been changed by this task.

| Runtime image | PNG master | Dimensions | Bytes (WebP) | Use |
|---|---|---|---:|---|
| `geodesy-field.webp` | `geodesy-field.png` | 1536×1024 | 625444 | Geodesy: field surveying instrument, natural terrain and illustrative map |
| `earth-reference-body.webp` | `earth-reference-body.png` | 1536×1024 | 143230 | Spatial reference bodies: Earth on visual right, mathematical ellipsoid illustration on visual left |

Web URLs:
- `/assets/lessons/topic02/scene-coordinates/definitions/geodesy-field.webp`
- `/assets/lessons/topic02/scene-coordinates/definitions/earth-reference-body.webp`

Both images are opaque. The bodies image has a white background. Use 3:2 aspect ratio and contain; do not stretch, crop or mirror. Labels, definitions and captions belong in HTML.

## Creation and sources
Created with the built-in ImageGen tool. PNG masters copied without modification; WebP versions encoded at quality 92, without resizing or geometric changes.

- Field image: photographic educational illustration, based on the site's terrain material reference `public/assets/lessons/topic02/scene-topography/TOPIC02-TOPO-PHOTO.png`. The instrument and terrain are synthetic. The map sheet is a general mapping cue, not a surveyed cartographic product or a location-accurate depiction of this fictional view.
- Earth/reference image: created using `public/assets/lessons/topic02/geo-globe/earth-color.webp` as the geography/colour reference, and `datum-guided/datum-fallback.webp` for site rendering context. The final image has no cutaway, geoid layer, labels or numbers.
- The source Earth texture is based on NASA Blue Marble imagery (Reto Stöckli, NASA Earth Observatory); source detail and credit are in `public/assets/lessons/topic02/geo-globe/ASSET-MANIFEST.md`. The new generated illustration is a conceptual representation, not a direct data-driven render.
- The near-round abstract body avoids the severely exaggerated flattening of the earlier mockup. No quantitative polar/equatorial comparison should be inferred from the artwork. It illustrates an ellipsoid as ONE mathematical reference-body example, not every reference body.

## Text and implementation
Full Hebrew copy, labels, alt text, design rules and implementation instructions:
`design/docs/2026-10-12-coordinates-definitions-claude-prompt.txt`.

Generation prompts including refinements:
`design/docs/2026-10-12-coordinates-definitions-image-prompts.txt`.

Layout reference:
`design/mockups/coordinates-definitions-simple-2026-10-12/01-illustrated-definitions.png`.
Use its two-card structure; use the new assets and fuller copy rather than reproducing old exaggerated shape/text.

## Content checks
Source deck: `מבוא לגיאודזיה חלק א (1)-2.pptx`, slides 3–4, 6–7 and 11–12. The expanded wording was checked against official educational sources:
- [NOAA/NGS: geodesy scope](https://geodesy.noaa.gov/INFO/facts/geodesist.shtml).
- [NOAA: geodesy and positioning](https://oceanservice.noaa.gov/education/tutorial_geodesy/geo01_intro.html).
- [NOAA: ellipsoid and geoid](https://oceanservice.noaa.gov/education/tutorial_geodesy/geo03_figure.html).
- [NOAA: geoid as elevation reference](https://oceanservice.noaa.gov/facts/geoid.html).

The copy preserves the lesson's mapping focus, adds Earth measurement/shape/gravity context, and removes categorical claims that calculations on terrain are impossible or that all reference surfaces are simple mathematical ellipsoids.

## Verification
Both final WebP files were decoded and visually inspected after encoding. Equipment anatomy, readable subject, absence of baked text, Earth on the right/abstract model on the left, modest model shape, 3:2 proportions and white integration were checked. This is asset/copy preparation only; live-page rendering and build validation remain part of Claude's implementation.

