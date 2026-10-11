# Asset manifest — datum field challenge

Screen: topic-02 `#scene-coordinates` → "הדמיה: מה קורה כשהדאטום לא תואם?" (the find-and-fix task).
Brief: `design/docs/datum-field-challenge-claude-prompt-2026-10-11.txt` · mockup (composition only): `design/mockups/topic-02-datum-shift-2026-10-11/mockup-field-challenge.png`.
Code: `src/components/lessons/topic-02/datum-field/DatumFieldChallenge.tsx` loads these files from `${NEXT_PUBLIC_BASE_PATH}/assets/lessons/topic02/datum-field-challenge/`.

One Cycles render, one fixed camera (55° elevation, 4° azimuth), 25:14. Nothing is burnt in: every marker, line, label and selection is live HTML/SVG, placed through `datumFieldProjection.ts` with the camera matrix the render wrote to `datumFieldTerrain.data.ts`.

| File | What it depicts | Size (px) | Format | Shown in |
| --- | --- | --- | --- | --- |
| `terrain-base.webp` | The whole diorama: pale limestone hills under sparse garrigue, a wadi with a narrow stream, a small stone bridge over it (centre), a dirt-road crossroads on a terrace (left), a rocky summit at the head of a ridge (right), thin brown contours every 10 m that follow the ground, a pale cut base and a contact shadow | 2000 × 1120 | webp (alpha) | the picture box (scaled uniformly) |
| `thumb-bridge.webp` | Crop of the same render: the bridge, its stretch of stream and the road across it | 640 × 360 | webp | the "גשר" card |
| `thumb-junction.webp` | Crop: the crossroads and its four arms | 640 × 360 | webp | the "צומת" card |
| `thumb-summit.webp` | Crop: the summit, its slope and contours | 640 × 360 | webp | the "פסגה" card |

Total ≈ 350 KB. The thumbnails are 520 × 293 windows of the frame around each landmark's projected anchor (from the 2× master), never separate renders; there is no "after the fix" image, because the ground does not change.

Palette (illustration only, `design/docs/design-spec.md` §3 / `referenceBodiesStyle.ts`): olive #6E7A4E / #55613C / #8A9163, water #7FB4C6 (the stream only), base #E8DCC4 / #C9B892, contours #8A6F4D — and natural mixes of them. Textures from `public/assets/lessons/topic02/contour-mountain/textures/` (light and shade only, read-only).

Produced by:

```
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/blender/render_datum_field.py   # DF_SS=2 for the 2× master
node scripts/blender/package_datum_field.cjs
```

The render script reads the JSON block in `datumField.data.ts` (landmarks, shift, footprint) and builds the ground so each landmark stands exactly at its datum-A coordinates. It also writes `datumFieldTerrain.data.ts`: the camera matrix and, per landmark, the ground (or deck) height along the path from its displaced point to the landmark, with what the camera sees of it. It fails if the summit is not the model's highest point or if the camera cannot see a landmark or its displaced point. Any change to the landmarks or the shift needs a re-render; `scripts/qa/datum-field-challenge.test.mjs` fails when the render's data and the landmark data disagree.
