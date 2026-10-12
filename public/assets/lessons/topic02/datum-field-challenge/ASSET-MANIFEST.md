# Asset manifest — datum field activity

Screen: topic-02 `#scene-coordinates` → "הדמיה: מה קורה כשהדאטום לא תואם?" (three stages on one map).
Brief: `design/docs/datum-field-challenge-followup-claude-2026-10-12.txt` (replaces the diorama task of 2026-10-11) · screen card: `design/docs/datum-field-challenge-screen-card-2026-10-12.md`.
Code: `src/components/lessons/topic-02/datum-field/DatumFieldChallenge.tsx` loads `field-map.webp` from `${NEXT_PUBLIC_BASE_PATH}/assets/lessons/topic02/datum-field-challenge/`.

| File | What it depicts | Size (px) | Format | Shown in |
| --- | --- | --- | --- | --- |
| `field-map.webp` | A straight-down illustrated map of E 960–1300 × N 552–962 m (ground metres = datum A), 3.5 px per metre on both axes, north up: a low valley with a stream meandering north → south and its pale gravel bed, bushes along the banks, garrigue on gentle slopes, pale stone on the hill tops, a soft hillshade lit from the north-west; the main dirt road west → east over a bridge at E 1200 · N 800 and through a crossroads at E 1090 · N 760 (tracks to the north and the south) | 1190 × 1435 | webp | the map box, scaled uniformly |

Nothing is burnt in: the grid, its margin values, the markers, the distance line, every label and number are live HTML/SVG, placed by `datumFieldProjection.ts` (x = (E − 960) / 340, y = (962 − N) / 410 of the box).

Palette: the site's tokens (`tailwind.config.ts`) and the approved illustration palette (`design/docs/design-spec.md` §3): olive #8A9163 / #6E7A4E / #55613C, papercut cream #E8DCC4, base rim #C9B892, and the lessons' water #7FB4C6 only (with deeper and paler steps at the same hue and saturation), plus mixes. The build checks every colour against those two files.

Produced by (deterministic, a 2D height grid shaded like a map's relief — no 3D model):

```
node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/maps/build-datum-field-map.mjs
```

The script reads `MAP`, `TERRAIN` and `PLACES` from `datumField.data.ts`, so the bridge and the crossroads are drawn on the exercise's own numbers. Any change to `MAP` or `TERRAIN` needs a rebuild; `scripts/qa/datum-field-challenge.test.mjs` checks the picture's size against `MAP` and that the stream and the road pass through the bridge and the roads through the junction.

Removed with this version (in git history, `e7f2e42`): the Cycles diorama `terrain-base.webp`, its three thumbnails, `datumFieldTerrain.data.ts`, `scripts/blender/render_datum_field.py` and `scripts/blender/package_datum_field.cjs`.
