# Homepage map-table art — sources

All images are original renders made for this page (Blender Cycles + generated print art),
rebuilt with:

```
node scripts/blender/fetch_home_map_table_sources.mjs      # sources below -> qa-output/home-map-table/src
node scripts/blender/home_map_table_maps.cjs               # printed art: card maps 02 / 03
node scripts/blender/home_map_table_sheet_ink.cjs          # the sheet's topographic print -> maps/sheet-ink-*.png
blender --background --python scripts/blender/render_home_map_table.py -- felt sheet-a sheet-b sheet-c sheet-d terrain cardstock
node scripts/blender/home_nav_compass_print.cjs            # card 03: the compass's ivory dial print
blender --background --python scripts/blender/render_home_nav_compass.py   # card 03: the 3D compass + contact shadow
node scripts/blender/package_home_map_table.cjs            # -> this folder (WebP)
```

| File | Content | Third-party source |
| --- | --- | --- |
| `felt.webp` | green felt desk, full-bleed | Poly Haven **Caban** wool scan (recoloured), CC0 — https://polyhaven.com/a/caban |
| `sheet-a.webp` … `sheet-d.webp` | the folded map sheet + contact shadow, one per window shape (`scripts/blender/home_map_table_sheets.json`); neatline, graduated border and faded contours in the quiet areas only | procedural |
| `chapter-terrain.webp` | Mount Hermon massif, aerial view | Terrarium elevation tiles (AWS Open Data / Mapzen; SRTM-derived, NASA/USGS, public domain) — https://registry.opendata.aws/terrain-tiles/ |
| `chapter-cartography.webp` | topographic sheet (spot heights 784 / 720) | generated in `home_map_table_maps.cjs` |
| `chapter-navigation.webp` | route map + an olive-painted pocket compass, lid laid open | procedural: the compass is modelled and rendered in Cycles (`render_home_nav_compass.py`; dial print from `home_nav_compass_print.cjs`). Its reflections come from Poly Haven **Studio Small 08** HDRI, CC0 — https://polyhaven.com/a/studio_small_08. The map is in the site's map symbology, generated in `home_map_table_maps.cjs` |

No interface text, chapter numbers or controls are baked into any image; every card keeps its
number + title zone (`scripts/blender/home_map_table_card_zones.json`) blank card stock.
