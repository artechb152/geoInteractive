# Topic 02 · Topography scene — "one terrain, three representations" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `#scene-topography` so that four things are visible on one screen: a large live map viewer, the full explanation, the tabs and the pager. The 3D model, the aerial photo and the topographic map are rendered from one generated terrain. The viewer animates between the three views and offers an exploded "all together" stack.

**Architecture:**

- **Terrain build.** A headless Blender/numpy script generates one heightfield and one feature layout, and writes three outputs from them:
  - a Draco GLB (terrain, plinth, trees, buildings);
  - a ground albedo JPG;
  - a generated TS data module (contours, road, path, buildings, vegetation, label anchors).
- **Map sheet.** An SVG component draws the map sheet from that data module.
- **Viewer.** An R3F viewer renders the GLB, animates a goal-based camera rig across the views (3d, photo, topo, stack), and overlays the SVG sheet.
- **Registration.** The canvas and the SVG overlay are registered through one pure layout module (`sheetRect`).

**Tech Stack:** Next.js 15, React 19, Tailwind (existing tokens only), framer-motion 11, three 0.184, @react-three/fiber 9, @react-three/drei 10, Blender 5.2 (headless, numpy), Playwright (installed Chrome channel), Node 22 (`--experimental-strip-types` for the pure-module test).

**Spec:** `docs/superpowers/specs/2026-09-28-topography-scene-redesign-design.md` (approved by the user 2026-09-28).

## Global Constraints

- **Copy lock (verbatim, character for character).** Every string in the current `VIEWS` array must survive unchanged: `label`, `whatItIs`, `pros[]`, `cons[]`, `whyItMatters`. The same holds for:
  - the `SceneHeader` props (step `02.1`, eyebrow `טופוגרפיה`, title, intro);
  - the headings `במילים פשוטות` / `מה היתרון` / `מה הבעיה` / `למה זה חשוב`;
  - the aria-labels `ניווט בין תצוגות` / `התצוגה הקודמת` / `התצוגה הבאה`;
  - the three former image alts (these become the viewer `aria-label` per view).

  Existing whitespace typos (`יכולים"לעוף"`, `ונראית"מעוכה"`, `מסננת"רעשי רקע"`, `את"שפת המפה"`) stay as they are.
- **New microcopy is limited to these strings:**
  - `כל התצוגות יחד` (the stack toggle);
  - `טוען שטח תלת־ממדי…` (loading);
  - `מסך מלא` / `יציאה ממסך מלא` (fullscreen);
  - `התצוגה התלת־ממדית אינה זמינה בדפדפן זה` (no-WebGL note).
- **Map-sheet text (preserved from the old map):**
  - `מטע`, `חורש דליל`, `שביל רגלי`, `דרך עפר`;
  - contour labels `300` / `350` / `400`, the summit `412`, and the north label `צ`;
  - the legend `קו גובה ראשי` and `שביל`;
  - the scale bar `0` `100` `200` `300` `מ׳`;
  - grid numbers (1 km lines only: `202`, `203`, `692`).
- **Colours:**
  - UI uses existing Tailwind tokens only (`text-fg`, `text-fg-muted`, `bg-bg-elevated`, `border-border`, `accent`, `bg-bg-accent`, …).
  - Map symbology uses the lesson's map language: paper `#F8F2E7`, hairline `#DCCDB2`, contour brown `#8A6F4D`, ink `#38432E`, muted `#8A8873`. The two vegetation greens `#D5E0C4` (area fill) and `#6E7A4E` (symbol ink) come from the design-spec illustration palette.
  - No new UI tokens.
- **RTL and SVG rules:**
  - Use logical utilities only (`ms-/me-/start-/end-`) for UI chrome.
  - Maps and dioramas are never mirrored.
  - Every SVG `<text>` sets `textAnchor` explicitly, plus `direction="rtl"` for Hebrew. The map SVG styles with presentation attributes only, no `className` styling inside the art, because it is also rasterized to a texture.
- **Motion:** easing `[0.22, 1, 0.36, 1]`. With `prefers-reduced-motion`, every transition is an instant cut (camera `k = 1`, framer durations `0`).
- **File ownership (concurrent sessions):**
  - Do **not** touch `ContourCake3D.tsx`, `ContoursScene.tsx`, `contourMountain*.ts`, `scripts/blender/build_contour_mountain.py` or `public/assets/lessons/topic02/contour-mountain/**`.
  - `TopographySceneV1.tsx` (archived snapshot) is frozen.
  - `design/docs/assumptions.md` is append-only.
  - The only existing source file this plan edits is `src/components/lessons/topic-02/TopographyScene.tsx`. Re-read it right before editing.
- **Git:** no commits unless the user asks. Other sessions commit concurrently, so never stage files you don't own and never use `git add -A`.
- **Asset budget:** `topography-terrain/` ≤ 4 MB total. The GLB must be ≤ 2.5 MB and `albedo.jpg` ≤ 1.5 MB. The build script prints sizes and raises if over.
- **Fit targets (1440 px wide):** the interactive block (tablist top → card bottom) is ≤ 760 px tall. At 1440×1122 the whole scene including `SceneHeader` is visible without scrolling.

## Coordinate conventions (used by every task)

| Space | Axes | Extent |
|---|---|---|
| **metres** (build) | X east, Y north, origin = sheet centre | X ∈ [-700, 700], Y ∈ [-525, 525] |
| **sheet** (data + SVG) | x east, y **south** (down the page), origin = NW corner | x ∈ [0, 100], y ∈ [0, 75]; 1 sheet unit = 14 m |
| **world** (three.js) | x east, y up, z **south** | x ∈ [-2, 2], z ∈ [-1.5, 1.5]; 1 unit = 350 m horizontally |
| **height** (three.js y) | `(h_m − 280) × VE / 350`, VE = 2.0 | ground ≈ 0.05, summit ≈ 0.75 |

- Sheet → world: `x_w = (x_s / 100 − 0.5) × 4`, `z_w = (y_s / 75 − 0.5) × 3`.
- Blender is z-up with y north, and is exported with `export_yup`. Blender `(x, y, z)` maps to glTF `(x, z, −y)`, so Blender north (+y) becomes three.js −z = north.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/components/lessons/topic-02/topographyLayout.ts` | create | Pure math, no imports: sheet↔world, the SVG viewBox and `sheetRect()`, camera goals per mode. |
| `scripts/qa/topography-layout.test.mjs` | create | `node --test` unit tests for `topographyLayout.ts`. |
| `scripts/blender/build_topography_terrain.py` | create | Heightfield, features, self-checks, GLB, albedo and the data module. |
| `public/assets/lessons/topic02/topography-terrain/terrain.glb` | generated | Nodes `Terrain`, `Walls`, `Trees`, `Buildings`. |
| `public/assets/lessons/topic02/topography-terrain/albedo.jpg` | generated | Ground colour, 2048×1536, row 0 = north. |
| `src/components/lessons/topic-02/topographyTerrain.data.ts` | generated | `TOPO` constant: contours, features and anchors in sheet units. |
| `src/components/lessons/topic-02/topographyTerrainStyle.ts` | create | Map symbology colours and stroke widths, three-free. |
| `src/components/lessons/topic-02/TopographyMapSheet.tsx` | create | SVG sheet: paper, grid, vegetation, contours, road, path, buildings, labels, bottom collar with legend, north arrow and scale. Takes `reveal`, `labels` and `animated`. |
| `src/components/lessons/topic-02/TopographyTerrain3D.tsx` | create | Default export `TopographyTerrain3D`: container, canvas, rig, overlay, stack, loading, fullscreen and fallback. |
| `src/components/lessons/topic-02/TopographyScene.tsx` | modify | New card layout: text column + viewer, the tablist kept, the pager inside the card. |
| `scripts/qa/shot-topography.mjs` | create | Playwright QA: fit measurements, registration probe, screenshots per state. |
| `design/docs/assumptions.md` | append | Grid and scale, VE, dropped lines, no normal map, feature conflicts. |

---

### Task 1: Pure layout module (sheet ↔ world ↔ screen, camera goals)

**Files:**
- Create: `src/components/lessons/topic-02/topographyLayout.ts`
- Test: `scripts/qa/topography-layout.test.mjs`

**Interfaces:**
- Produces:
  - `SHEET = { w: 100, h: 75, metres: 14 }`, `WORLD = { w: 4, h: 3, mPerUnit: 350, ve: 2, datumM: 280 }`
  - `VIEWBOX = { x, y, w, h }` (sheet units incl. collar); `COLLAR = 3.2`; `LEGEND_H = 11`
  - `sheetToWorld(x: number, y: number): [number, number]` → `[xw, zw]`
  - `heightToY(m: number): number`
  - `sheetRect(viewW: number, viewH: number): { x: number; y: number; w: number; h: number; scale: number }` (neatline in container px)
  - `type Mode = '3d' | 'photo' | 'topo' | 'stack'`
  - `type CameraGoal = { phi: number; theta: number; fov: number; frameHalf: number; target: [number, number, number] }`
  - `goalFor(mode: Mode, viewW: number, viewH: number, groundY: number): CameraGoal`
  - `radiusFor(g: Pick<CameraGoal, 'fov' | 'frameHalf'>): number`
  - `STACK_GAP = 0.9` (world units between stacked layers)

- [ ] **Step 1: Write the failing test**

```js
// scripts/qa/topography-layout.test.mjs
// Run: node --experimental-strip-types --test scripts/qa/topography-layout.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHEET, WORLD, VIEWBOX, COLLAR, sheetToWorld, heightToY, sheetRect, goalFor, radiusFor,
} from '../../src/components/lessons/topic-02/topographyLayout.ts';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('sheet corners map to world corners, north = -z', () => {
  assert.deepEqual(sheetToWorld(0, 0), [-2, -1.5]);
  assert.deepEqual(sheetToWorld(100, 75), [2, 1.5]);
  assert.deepEqual(sheetToWorld(50, 37.5), [0, 0]);
});

test('height uses datum 280 m and VE 2 at 350 m/unit', () => {
  close(heightToY(280), 0);
  close(heightToY(412), (132 * 2) / 350);
});

test('sheetRect keeps 4:3 and sits inside the container (width-bound)', () => {
  const r = sheetRect(620, 650);
  close(r.w / r.h, 4 / 3, 1e-9);
  assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 620 && r.y + r.h <= 650);
  close(r.scale, 620 / VIEWBOX.w);
  close(r.x, COLLAR * r.scale);           // width-bound → no horizontal letterbox
});

test('sheetRect centres the whole viewBox when height-bound', () => {
  const r = sheetRect(1400, 500);
  close(r.scale, 500 / VIEWBOX.h);
  const left = (1400 - VIEWBOX.w * r.scale) / 2;
  close(r.x, left + COLLAR * r.scale);
});

test('top-down goal frames the neatline exactly', () => {
  const W = 620, H = 650, r = sheetRect(W, H);
  const g = goalFor('photo', W, H, 0.05);
  // visible world height at the ground = 2*frameHalf; neatline is 3 world units tall
  close((2 * g.frameHalf) * (r.h / H), 3, 1e-9);
  // sheet centre must project to the neatline centre: target offset in world units
  const wpp = (2 * g.frameHalf) / H;
  close(-g.target[0] / wpp, r.x + r.w / 2 - W / 2, 1e-6);
  close(-g.target[2] / wpp, r.y + r.h / 2 - H / 2, 1e-6);
  assert.ok(g.phi < 0.001 && g.fov <= 5);
});

test('radiusFor is frameHalf / tan(fov/2)', () => {
  close(radiusFor({ fov: 30, frameHalf: 2 }), 2 / Math.tan((15 * Math.PI) / 180));
});

test('3d goal looks from the south-south-east, perspective', () => {
  const g = goalFor('3d', 620, 650, 0.05);
  assert.ok(g.phi > 0.8 && g.phi < 1.2);
  assert.ok(g.theta > 0 && g.theta < 0.5);
  assert.equal(g.fov, 30);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test scripts/qa/topography-layout.test.mjs`
Expected: FAIL, `Cannot find module …/topographyLayout.ts`.

- [ ] **Step 3: Implement**

```ts
// src/components/lessons/topic-02/topographyLayout.ts
/**
 * Pure layout math for the topography viewer (no imports — unit-tested with
 * node --experimental-strip-types). One source for how the map sheet sits in
 * the viewer, so the camera's top-down framing and the SVG overlay can never
 * drift apart. Conventions: docs/superpowers/plans/2026-09-28-topography-scene-redesign.md.
 */
export const SHEET = { w: 100, h: 75, metres: 14 } as const;
export const WORLD = { w: 4, h: 3, mPerUnit: 350, ve: 2, datumM: 280 } as const;

/** Grid-label margin around the neatline and the legend strip under it (sheet units). */
export const COLLAR = 3.2;
export const LEGEND_H = 11;
export const VIEWBOX = { x: -COLLAR, y: -COLLAR, w: SHEET.w + 2 * COLLAR, h: SHEET.h + 2 * COLLAR + LEGEND_H } as const;

/** Vertical distance between stacked layers in the "all together" view (world units). */
export const STACK_GAP = 0.9;

export type Mode = '3d' | 'photo' | 'topo' | 'stack';
export type CameraGoal = { phi: number; theta: number; fov: number; frameHalf: number; target: [number, number, number] };

export function sheetToWorld(x: number, y: number): [number, number] {
  return [(x / SHEET.w - 0.5) * WORLD.w, (y / SHEET.h - 0.5) * WORLD.h];
}

export function heightToY(m: number): number {
  return ((m - WORLD.datumM) * WORLD.ve) / WORLD.mPerUnit;
}

/** The neatline (sheet 0–100 × 0–75) in container px, for an SVG with this VIEWBOX and preserveAspectRatio="xMidYMid meet". */
export function sheetRect(viewW: number, viewH: number) {
  const scale = Math.min(viewW / VIEWBOX.w, viewH / VIEWBOX.h);
  const left = (viewW - VIEWBOX.w * scale) / 2;
  const top = (viewH - VIEWBOX.h * scale) / 2;
  return { x: left + COLLAR * scale, y: top + COLLAR * scale, w: SHEET.w * scale, h: SHEET.h * scale, scale };
}

export function radiusFor(g: Pick<CameraGoal, 'fov' | 'frameHalf'>): number {
  return g.frameHalf / Math.tan(((g.fov / 2) * Math.PI) / 180);
}

const TOP_FOV = 4;         // near-orthographic: relief shifts < 1 px at the neatline
const PERSP_FOV = 30;

export function goalFor(mode: Mode, viewW: number, viewH: number, groundY: number): CameraGoal {
  const aspect = viewW / viewH;
  if (mode === 'photo' || mode === 'topo') {
    const r = sheetRect(viewW, viewH);
    const frameHalf = (WORLD.h * viewH) / r.h / 2;       // visible half-height at ground
    const wpp = (2 * frameHalf) / viewH;                   // world units per px
    const ox = r.x + r.w / 2 - viewW / 2;
    const oy = r.y + r.h / 2 - viewH / 2;
    return { phi: 0.0001, theta: 0, fov: TOP_FOV, frameHalf, target: [-ox * wpp, groundY, -oy * wpp] };
  }
  const fit = Math.min(1, aspect);                         // portrait viewers need more room
  if (mode === 'stack') {
    return { phi: 1.08, theta: 0.32, fov: PERSP_FOV, frameHalf: 2.55 / fit, target: [0, STACK_GAP * 0.95, 0] };
  }
  return { phi: 0.98, theta: 0.22, fov: PERSP_FOV, frameHalf: 1.72 / fit, target: [0, groundY + 0.12, 0.05] };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --experimental-strip-types --test scripts/qa/topography-layout.test.mjs`
Expected: all 7 tests PASS. Also run `npx tsc --noEmit -p .` and expect 0 errors.

---

### Task 2: Terrain build script (heightfield → GLB + albedo + data module)

**Files:**
- Create: `scripts/blender/build_topography_terrain.py`
- Generates: `public/assets/lessons/topic02/topography-terrain/{terrain.glb, albedo.jpg}` and `src/components/lessons/topic-02/topographyTerrain.data.ts`

**Interfaces:**
- Consumes: the coordinate conventions above. These constants must equal Task 1: `SHEET_W_M=1400`, `SHEET_H_M=1050`, `M_PER_UNIT=350`, `VE=2.0`, `DATUM_M=280`.
- Produces: `topographyTerrain.data.ts` exporting:

```ts
export type SheetPoint = readonly [number, number];
export type Contour = { readonly heightM: number; readonly index: boolean; readonly rings: readonly (readonly SheetPoint[])[];
                        readonly label: { readonly x: number; readonly y: number; readonly angle: number } | null };
export type Building = { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly angle: number; readonly heightM: number };
export type VegArea = { readonly kind: 'woodland' | 'orchard' | 'sparse'; readonly ring: readonly SheetPoint[];
                        readonly label: { readonly text: string; readonly x: number; readonly y: number } | null };
export const TOPO: {
  readonly groundY: number;                 // three.js y of the 300 m plain level used for framing
  readonly summit: { readonly x: number; readonly y: number; readonly heightM: number; readonly yUnits: number };
  readonly contours: readonly Contour[];    // 290…410 every 10 m that exist on the sheet
  readonly road: readonly SheetPoint[];     readonly roadLabel: { x: number; y: number; angle: number };
  readonly path: readonly SheetPoint[];     readonly pathLabel: { x: number; y: number; angle: number };
  readonly buildings: readonly Building[];
  readonly vegetation: readonly VegArea[];
  readonly grid: { readonly e: readonly { x: number; label: string }[]; readonly n: readonly { y: number; label: string }[] };
  readonly guides: readonly { readonly x: number; readonly y: number; readonly heightM: number }[]; // summit, SW cluster, SE pair
};
```

Tree geometry does not go into the data module; trees exist in the GLB only.

**Script layout.** Reuse these helpers verbatim from `git show HEAD:scripts/blender/build_contour_mountain.py`:

- `Perlin`, `fbm`, `ridged`, `smoothstep`, `_window`;
- `write_png`, `u8`, `save_jpeg_from_array`;
- `_ico`, `_subdivide`, `vertex_normals`, `Deco` (with its own `MATS`);
- `extract_contour`, `douglas_peucker`, `simplify_closed`, `fmt`.

Copy them from **HEAD**, never from the working tree, because another session edits that file. Keep the copied code identical except that `MATS`/`MI` become:

```python
MATS = ['Terrain', 'Wall', 'Leaves', 'Bark', 'Roof', 'BuildingWall']
MI = {n: i for i, n in enumerate(MATS)}
```

**Feature layout (sheet units, from the old map; spec §5.1):**

```python
SUMMIT_S = (55.9, 28.4)          # 412 m
ROAD_S = [(-2, 64.0), (12, 64.4), (26, 64.6), (40, 65.0), (55, 64.4), (68, 62.8), (80, 60.4), (92, 58.6), (102, 57.6)]
PATH_S = [(26.2, 59.4), (31.0, 54.2), (36.4, 49.0), (41.2, 44.1), (45.9, 39.4), (50.4, 34.3), (53.8, 30.6), (55.6, 28.9)]
BUILDINGS_S = [  # centre x, y, footprint w × h (sheet units, 1 u = 14 m), yaw deg
    (19.0, 55.6, 2.0, 1.3, -4), (24.2, 55.2, 2.0, 1.3, -4), (19.4, 59.2, 2.0, 1.3, -4), (24.6, 58.8, 2.0, 1.3, -4),
    (80.6, 57.2, 2.1, 1.35, -9), (86.0, 55.9, 2.1, 1.35, -9),
]
WOODLAND_S = [(2.0, 4.5), (9, 2.4), (18, 3.0), (24.5, 7.5), (25.5, 13.5), (21, 18.8), (12, 20.2), (4, 17.5), (1.2, 11)]
ORCHARD_S = [(1.8, 46.5), (15.8, 46.0), (16.4, 60.2), (2.2, 60.6)]
SPARSE_S = [(78.5, 41.0), (90, 38.8), (98.8, 42.5), (99.0, 53.0), (90.5, 54.4), (80.0, 53.2), (77.2, 47.0)]
LABELS = {'orchard': ('מטע', 8.8, 53.4), 'sparse': ('חורש דליל', 88.6, 47.0), 'woodland': None}
```

**Heightfield (metres) — `terrain(X, Y) -> (H, rock)`:**

- **Macro dome.** Use an anisotropic radial profile around the summit. The direction-dependent radius `R(θ)` interpolates the 300 m ring extents measured on the old map:
  - W 714 m, E 465 m, N 347 m, S 618 m, cosine-blended between them;
  - profile `h = 288 + 124·(0.52·exp(−(ρ/0.16)^1.45) + 0.48·exp(−(ρ/0.78)^2.1))` with `ρ = r / R(θ)`.
  - Tune the two amplitudes so that the ring checks below pass.
- **Ridge spur.** It runs from the summit toward bearing 170° (S by E) with a Gaussian ridge of 18 m amplitude, 60 m wide, windowed 40–520 m from the summit.
  - Its east flank is steepened: subtract `12·smoothstep` beyond +40 m cross-distance.
  - Carve 7 ravines down the east flank (reuse the ravine idea from the contour-mountain `ravine_carve`, angles 60–120° off the spur axis, depth 4–8 m).
- **Path corridor.** Smooth the terrain along `PATH_S`: blend 70 % toward a 25 m-blurred height within 4 m of the path, so the trail reads as a worn line.
- **Road.** Flatten the cross-slope along `ROAD_S` within 5 m (blend to a 40 m along-road smoothed height) and carve 0.4 m.
- **Building pads.** Flatten to the local mean within 1.2× the footprint.
- **Micro undulation:** `+1.5·fbm(X/90, Y/90, 3) + 0.6·fbm(X/22, Y/22, 2)`.
- **Rock mask:** `smoothstep(0.55, 0.9, slope)` plus the east-flank ridged-noise outcrops.

**Self-checks.** These run before anything is written, and raise `RuntimeError` on failure:

1. The max height is 412 ± 0.5 m, at sheet `(55.9, 28.4)` ± 1.5.
2. The 300 m contour is exactly one closed ring. It stays ≥ 1.0 sheet units from every edge, and its bbox is within ±4 of `(x: 5–89, y: 4–72.5)`.
3. The 350 m ring bbox centre is within ±4 of `(53, 34)`, with a width of 18–32.
4. The 400 m ring exists and contains the summit.
5. Every `PATH_S` vertex's height increases monotonically from the start (within −1 m tolerance). The last vertex is within 5 m of the summit, measured horizontally.
6. Each building pad's height varies by < 0.6 m across its footprint.
7. Every contour vertex re-sampled on the mesh (barycentric) is within ±0.5 m of its level.
8. `terrain.glb` ≤ 2.5 MB, `albedo.jpg` ≤ 1.5 MB, total ≤ 4 MB.

**Mesh:**

- The grid is 281 × 211 vertices (5 m cells), with the same alternating-diagonal triangulation as the contour mountain's `surface_triangles`.
- The plinth (`Walls`) drops from the border to y = −0.12 units, with vertex-colour strata: topsoil `#6B5A40` for the top 18 %, then `#8A7353`.
- Planar UV: `u = (X + 700) / 1400`, `v = (Y + 525) / 1050`. The glTF export flips v, so the runtime loads the albedo with `flipY = false`.

**Trees (`Trees` node):**

| Area | Placement | Species | Crown |
|---|---|---|---|
| Woodland | Poisson-ish grid with 11 m spacing and 3 m jitter, inside `WOODLAND_S` | 70 % pine, 30 % oak | 6–9 m |
| Orchard | 7.5 m × 7.5 m rows aligned to the polygon's long edge, 0.6 m jitter | olive | 4–5 m |
| Sparse | spacing 26 m, jitter 9 m, 35 % skipped | 60 % oak, 40 % shrub | oak 5–7 m, shrub 2.5–4 m |
| Scattered | ~40 shrubs on the N-facing gullies of the spur | shrub | — |

- Crowns are 2–4 squashed `ICO2` lumps (80 tris each at level-2 subdivision) with vertex colour, and trunks are 5-sided prisms. There are no leaf cards: at 2 m per screen px they are invisible, so they aren't worth the triangles.
- Target ≤ 1,600 trees and ≤ 260 k tris total.

**Buildings (`Buildings` node):** a box of footprint × 5 m high with a 0.4 m parapet and a flat roof. Walls are `#D8D1C2` and the roof is `#BDB4A3`, as vertex colours, with material names `BuildingWall` / `Roof`.

**Albedo (2048 × 1536, sRGB, row 0 = north).** Build it in numpy from the same fields. The palette is sampled from the old `TOPIC02-TOPO-PHOTO.png` in Step 1:

- Base grass: blend olive → dry by elevation, aspect (south-facing drier) and a large-scale fbm field mosaic, plus 2–4 m speckle.
- Rock: pale grey-beige, with downslope striations (anisotropic ridged noise stretched along the gradient).
- Gullies (the cavity field): greener and darker.
- Garrigue shrub dots: small dark-olive blobs of 1.5–3 px, denser on N-facing slopes. This is the key "aerial photo" cue.
- Woodland floor: darker litter. Orchard: plowed brown soil strips between the rows. Yards: pale around the buildings.
- Road: compacted pale dirt, 6 m wide, with slightly darker wheel ruts. Path: a 1.5 m pale line.
- Multiply by a cavity AO term `clip(1 − 0.08·cav, 0.8, 1.05)`. **No baked sun shadows** (they are live).

**Data module.** Contours come from `extract_contour` on the same triangles for levels 290…410 step 10:

- Drop loops shorter than 12 points. Convert to sheet units and simplify with `simplify_closed(…, 0.04)`.
- `index = heightM % 50 == 0`.
- Label anchors for 300 / 350 / 400: the ring point nearest a preferred sheet position (300 → `(12, 60)`, 350 → `(44, 44)`, 400 → `(52, 30.5)`), with the angle of the local ring tangent, normalized to (−90°, 90°].
- `roadLabel`: along `ROAD_S` at x≈64, offset 2.4 units south. `pathLabel`: the midpoint of `PATH_S`, offset 2 units west. Angles follow the local tangent.
- `grid`: the sheet SW corner is at ITM E 201,700 / N 691,300. That gives E lines at 202,000 → x = 300/14 = 21.43 and 203,000 → 92.86 (labels `202`, `203`), and the N line 692,000 → y = 75 − 700/14 = 25.0 (label `692`).
- `guides`: the summit, the SW cluster centre `(21.8, 57.2)` and the SE pair centre `(83.3, 56.6)`, each with its terrain height.
- `groundY = heightToY(300)`.

- [ ] **Step 1: Sample the palette from the old photo.** Run a throwaway Blender snippet (`blender --background --python-expr …`) that loads `public/assets/lessons/topic02/scene-topography/TOPIC02-TOPO-PHOTO.png` and prints the mean sRGB of these 40×40 px patches:
  - plain `(700, 1000)`;
  - W slope `(560, 560)`;
  - rocky ridge `(900, 420)`;
  - road `(700, 975)`;
  - grove `(220, 170)`;
  - shrub dots `(1250, 640)`;
  - roof `(376, 740)`.

  Paste the hex values into the `PALETTE` dict at the top of the script.
- [ ] **Step 2: Write the script's self-check block first**, with the checks listed above as functions `check_heights(H)`, `check_contours(levels)`, `check_path(H)`, `check_pads(H)`, `check_resample(levels, …)` and `check_budget()`. Then write `main()` so that it calls `terrain()`. Stub `terrain()` to return a flat 290 m.
- [ ] **Step 3: Run it and verify it fails.**
  Run: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python scripts/blender/build_topography_terrain.py`
  Expected: `RuntimeError: max height 290.0 ≠ 412`.
- [ ] **Step 4: Implement `terrain()`, the features, the mesh, trees, buildings, albedo and export**, as specified above.
- [ ] **Step 5: Run it until every self-check passes.** Tune the amplitudes and radii, not the checks.
  Expected output ends with `SELF-CHECKS OK`, followed by the `WROTE_GLB`, `WROTE_ALBEDO` and `WROTE_DATA` size lines.
- [ ] **Step 6: Visual check.**
  - Read `albedo.jpg` with the image viewer. It must look like an aerial photo of the same composition as the old photo: road in the south, the 2×2 cluster in the SW, the orchard west of it, woodland in the NW, sparse woodland in the E, and a rocky east flank on a S-running spur.
  - Run `npx tsc --noEmit -p .` and expect 0 errors (the generated TS type-checks).

---

### Task 3: Map symbology + `TopographyMapSheet` (SVG, reveal choreography)

**Files:**
- Create: `src/components/lessons/topic-02/topographyTerrainStyle.ts`
- Create: `src/components/lessons/topic-02/TopographyMapSheet.tsx`

**Interfaces:**
- Consumes: `TOPO` (Task 2), `VIEWBOX`, `COLLAR`, `LEGEND_H` (Task 1).
- Produces:
  - `export function TopographyMapSheet(props: { reveal: boolean; labels?: boolean; animated?: boolean; className?: string; svgRef?: React.Ref<SVGSVGElement> }): JSX.Element`
  - The SVG uses `viewBox={\`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}\`}` and `preserveAspectRatio="xMidYMid meet"`. **This must match `sheetRect()`**, because it is the registration contract.

`topographyTerrainStyle.ts`:

```ts
/** Map symbology for the topography sheet — the lesson's map language (ContoursShapeMap) + illustration greens. Three-free. */
export const MAP = {
  paper: '#F8F2E7', collar: '#FFFFFF', hairline: '#DCCDB2', ink: '#38432E', muted: '#8A8873',
  contour: '#8A6F4D', contourW: 0.16, indexW: 0.34,
  vegFill: '#D5E0C4', vegInk: '#6E7A4E', orchardDot: '#6E7A4E',
  roadCasing: '#8A6F4D', roadFill: '#E3C996', roadW: 1.05,
  path: '#38432E', pathW: 0.28, pathDash: '1.1 0.8',
  building: '#2B2F28', grid: '#DCCDB2', gridW: 0.12,
} as const;
export const EASE = [0.22, 1, 0.36, 1] as const;
```

**Sheet composition (draw order):**

1. Collar background (white), across the whole viewBox.
2. Clip-path to the neatline, then inside it:
   - paper;
   - vegetation fills, with patterns:
     - woodland = a small tree-glyph pattern, 3.2 units;
     - orchard = a dot grid at 1.6 units;
     - sparse = a scattered tree-glyph pattern at 5 units;
   - grid lines (1 km, from `TOPO.grid`);
   - contours: thin, with index lines heavier;
   - road (casing + fill, two strokes);
   - path (dashed ink);
   - buildings (rotated rects, `MAP.building`);
   - the summit triangle (a filled ink triangle 1.6 wide).
3. The neatline frame (`MAP.ink`, 0.22).
4. Grid labels in the collar: E labels above and below the neatline, N labels left and right.
5. The bottom collar (y from 75 + COLLAR to the end), laid out in RTL reading order:
   - legend at inline-start (visual right): `קו גובה ראשי` with a heavy brown line swatch, and `שביל` with a dashed swatch;
   - north arrow `צ` in the middle;
   - scale bar at the visual left: `0` `100` `200` `300` `מ׳`, 300 m = 21.43 units, alternating ink/white segments at 100 m.
6. Labels inside the neatline (only when `labels`):
   - contour values on knockout rects (`MAP.paper` fill), in `MAP.contour`, 2.3 units, weight 700, rotated to `label.angle`;
   - `412` next to the summit triangle (2.6 units, weight 800, ink);
   - vegetation labels (ink, 2.4);
   - `דרך עפר` and `שביל רגלי` (ink, 2.1), rotated to their angles.

   All text uses `fontFamily="Heebo, 'Noto Sans Hebrew', sans-serif"`, explicit `textAnchor`, `direction="rtl"` for Hebrew, and `dominantBaseline="central"`.

**Reveal choreography** (`animated` = true). Each layer is a `motion.g` with `initial={false}` and `animate={reveal ? 'on' : 'off'}`. Durations are 0 when `useReducedMotion()`.

| Layer | on: delay / duration | off |
|---|---|---|
| collar + paper + grid | 0 / 0.35 | 0.25 fade |
| vegetation | 0.3 / 0.4 | 0.2 |
| contours (`motion.path`, `pathLength` 0→1) | 0.3 + 0.045·levelIndex / 0.55 | pathLength instantly 0 with the group opacity 0 |
| road, path, buildings, summit | 0.75 / 0.35 | 0.2 |
| labels, legend, north, scale | 0.95 / 0.35 | 0.2 |

With `animated={false}`, render plain `<g>` and `<path>` elements at full opacity. This static version is the one rasterized into the stack-slab texture.

- [ ] **Step 1:** Write `topographyTerrainStyle.ts` (code above).
- [ ] **Step 2:** Write `TopographyMapSheet.tsx`. Use the helpers `ringPath(ring: readonly SheetPoint[]): string` (closed `M…L…Z`) and `linePath(pts): string` (smoothed with a Catmull-Rom → cubic Bézier conversion for the road and path).
- [ ] **Step 3: Static render check.** Temporarily mount `<TopographyMapSheet reveal labels animated={false} />` in place of `ViewTopo` inside the live `TopographyScene.tsx`. Run the Playwright shot from the scratchpad, then revert that one-line swap.
  Expected checks:
  - the contours don't cross the road label;
  - the Hebrew labels read correctly (not reversed);
  - the legend is at the visual right of the bottom collar;
  - the scale bar is at the visual left;
  - the text inside the collar isn't clipped.
- [ ] **Step 4:** `npx tsc --noEmit -p .` reports 0 errors, and `npm run qa:rtl` is clean for the new file.

---

### Task 4: Viewer (`TopographyTerrain3D`) + new scene layout — 3d / photo / topo

**Files:**
- Create: `src/components/lessons/topic-02/TopographyTerrain3D.tsx`
- Modify: `src/components/lessons/topic-02/TopographyScene.tsx`

**Interfaces:**
- Consumes: `goalFor`, `radiusFor`, `sheetRect`, `sheetToWorld`, `heightToY`, `STACK_GAP`, `type Mode` (Task 1); `TOPO` (Task 2); `TopographyMapSheet` (Task 3).
- Produces:

```ts
export type TopoView = '3d' | 'photo' | 'topo';
export default function TopographyTerrain3D(props: {
  view: TopoView;
  stacked: boolean;
  onSelectView: (v: TopoView) => void;   // stack-layer click (Task 5)
  ariaLabel: string;                     // active view's former image alt
}): JSX.Element;
```

- The dev-only probe `window.__topoProbe?: (x: number, y: number, heightM: number) => [number, number]` returns container-relative px. It is attached only when `process.env.NODE_ENV !== 'production'`.

**Viewer container:**

- `relative h-full min-h-[560px] w-full overflow-hidden rounded-xl bg-bg-elevated` with `role="img"` and `aria-label={ariaLabel}`.
- A `ResizeObserver` tracks `{w, h}`.
- It lazy-mounts on an `IntersectionObserver` with `rootMargin: '300px'`, as in `ContourCake3D`.
- `frameloop={inView ? 'demand' : 'never'}`.

**Canvas:**

- `<Canvas shadows={{ type: THREE.PCFSoftShadowMap }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ fov: 30, near: 0.05, far: 120, position: [0, 3, 5] }} fallback={<Fallback/>} aria-hidden>`.
- It uses R3F's default ACES tone mapping; there is no postprocessing composer. The photo slab relies on this, as explained in Task 5.

**Lights:**

- `hemisphereLight` with sky `#FFF4E0`, ground `#6B6A45`, intensity 0.55.
- A `directionalLight` from the SW-high at `[-3.2, 5.5, 2.4]`, intensity 2.3, colour `#FFF1DC`, castShadow. Shadow map 4096, ortho bounds ±2.8, bias −0.0003, normalBias 0.01.

**Terrain:**

- Load it with `useGLTF(MODEL, '/draco/')`, respecting `NEXT_PUBLIC_BASE_PATH` for both paths.
- `Terrain` gets `MeshStandardMaterial({ map: albedo, roughness: 0.95 })`. Set `albedo.flipY = false`, `colorSpace = SRGBColorSpace`, and anisotropy to the maximum.
- `Walls`, `Trees` and `Buildings` get `MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })`.
- Everything casts and receives shadows.
- A `shadowMaterial` ground plane under the plinth has opacity 0.12, as in `ContourCake3D`.

**Camera rig.** This is a goal-based rig with its own state; OrbitControls is used only for user orbit in 3d.

- State: a `{phi, theta, fov, frameHalf, target}` ref. Each frame, damp every field toward `goalFor(mode, w, h, TOPO.groundY)` with `k = reduce ? 1 : 1 − exp(−4.2·dt)`.
  - Theta takes the shortest way round.
  - `fov` and `frameHalf` damp independently, and `radius = radiusFor(state)`, so the framing stays nearly constant through the dolly-zoom.
- Apply: `camera.fov = fov; camera.updateProjectionMatrix(); position = target + spherical(radius, phi, theta); lookAt(target)`.
- It is settled when all deltas are below 1e-4. Keep calling `invalidate()` while it is not settled.
- **3d:** `OrbitControls` is enabled (rotate + zoom, no pan), with `minDistance` = 0.5 × goal radius, `maxDistance` = 1.6 ×, and `maxPolarAngle` = π/2.1. On the `start` event, the rig stops animating (the learner owns the camera) until the view or mode changes.
- **photo / topo:** controls disabled; the rig owns the camera.
- `mode = stacked ? 'stack' : view`.

**Overlay.** Render `<TopographyMapSheet reveal={mode === 'topo' && settledNearTop} labels />` absolutely positioned over the canvas (`absolute inset-0 size-full pointer-events-none`).

- `settledNearTop` becomes true once `phi < 0.02 && fov < 6`. The rig sets this through a callback with `setState` (throttled: only on change). This way the map reveal starts after the camera arrives when going 3d → topo, and immediately when going photo → topo.
- When `stacked`, `reveal = false`.

**Loading and fallback:**

- The loading overlay copies `ContourCake3D`'s `LoadingOverlay` with the text `טוען שטח תלת־ממדי…`.
- The canvas fallback is `<TopographyMapSheet reveal labels animated={false} />` plus a `text-sm text-fg-muted` note `התצוגה התלת־ממדית אינה זמינה בדפדפן זה`.

**Fullscreen button.** Same markup and strings as `ContourCake3D` (`top-2 start-2`).

**Scene layout (`TopographyScene.tsx`).** Rewrite only the part below `SceneHeader`.

Keep, verbatim:

- the `VIEWS` array;
- `onKeyDown`;
- the tablist markup (the classes may stay);
- the pager buttons and dots markup.

Changes:

- Delete `View3D`, `ViewPhoto` and `ViewTopo`, and the `IsometricAsset` import.
- Add a `TopographyTerrain3D` import via `next/dynamic(() => import('./TopographyTerrain3D'), { ssr: false, loading: () => <div className="h-full min-h-[560px] w-full rounded-xl bg-bg-accent/40" /> })`.
- Add state `const [stacked, setStacked] = useState(false);`.
- Add `const ALTS: Record<View, string>`, holding the three former alt strings verbatim:
  - '3d': `איור איזומטרי: מודל תלת-ממדי של הר, מציג את פני השטח כמו דגם מוקטן`
  - 'photo': `תצלום אווירי של שטח, מבט ישר מלמעלה`
  - 'topo': `מפה טופוגרפית עם קווי גובה המתארים שטח תלת-ממדי על גבי דף שטוח`

Card markup:

```tsx
<div role="tabpanel" id={panelId} aria-labelledby={tabId(idx)} className="surface-elevated p-5 sm:p-6">
  <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
    {/* Text column — first in DOM → visual right (RTL reading start). All three
        views are stacked in one grid cell so the column (and therefore the
        viewer beside it) keeps the height of the tallest view: no layout jump. */}
    <div className="flex min-w-0 flex-col">
      <div className="grid [&>*]:[grid-area:1/1]">
        {VIEWS.map((v, i) => (
          <motion.div key={v.id} aria-hidden={i !== idx} initial={false}
            animate={{ opacity: i === idx ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn('space-y-5', i !== idx && 'pointer-events-none invisible')}
            style={{ visibility: i === idx ? 'visible' : 'hidden' }}>
            <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{v.label}</div>
            {/* במילים פשוטות / מה היתרון / מה הבעיה / למה זה חשוב — same markup as before,
                pros and cons stacked (no sm:grid-cols-2) */}
          </motion.div>
        ))}
      </div>
      {/* pager (moved from below the card) */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">…existing pager markup…</div>
    </div>
    {/* Viewer — second in DOM → visual left */}
    <div className="relative min-h-[560px]">
      <TopographyTerrain3D view={meta.id} stacked={stacked} onSelectView={(v) => setIdx(VIEWS.findIndex((x) => x.id === v))} ariaLabel={ALTS[meta.id]} />
    </div>
  </div>
</div>
```

The `visibility` style drives the hidden state, delayed until after the fade: use framer's `transitionEnd: { visibility: 'hidden' }` on the off state, and set it to `'visible'` immediately on the on state.

- [ ] **Step 1:** Snapshot `TopographyScene.tsx` to the scratchpad. Re-read it and confirm it is unchanged since `TopographySceneV1.tsx` was copied (`diff` shows only the header comment and the function name).
- [ ] **Step 2:** Write `TopographyTerrain3D.tsx` without the stack pieces. `stacked` is accepted and only switches the camera goal.
- [ ] **Step 3:** Rewrite the card section of `TopographyScene.tsx` as above.
- [ ] **Step 4: Copy-lock check.** Write `node scripts/qa/…` inline: extract every Hebrew string literal from `TopographySceneV1.tsx`'s `VIEWS` and headings, and assert that each still appears verbatim in `TopographyScene.tsx`.
  Run it with `node -e` using a `readFileSync` + regex over the `'…'` literals.
  Expected: `copy-lock OK (N strings)`.
- [ ] **Step 5: Screenshot at 1440×900 and 1440×1122** for 3d, photo and topo, waiting 2.5 s after each tab click, via `scripts/qa/shot-topography.mjs` (Task 6 creates the full version; start it here with the shots only).
  Expected checks:
  - the text column and pager are fully inside the viewport at 900 once the card top is scrolled to 80 px below the nav;
  - the 3D diorama is centred;
  - photo fills the neatline;
  - topo shows the sheet with legend and scale;
  - no console errors.
- [ ] **Step 6: Registration probe.** In the QA script, after the photo view settles, call `window.__topoProbe(x, y, h)` for the summit and all six building centres. Compare each with the `sheetRect()` expectation `(r.x + x/100·r.w, r.y + y/75·r.h)`.
  Expected: max error ≤ 2 px.
- [ ] **Step 7:** `npx tsc --noEmit -p .` reports 0 errors; `npm run lint` shows no new warnings in the touched files.

---

### Task 5: "All together" stack mode

**Files:**
- Modify: `src/components/lessons/topic-02/TopographyTerrain3D.tsx`
- Modify: `src/components/lessons/topic-02/TopographyScene.tsx` (the toggle button only)

**Interfaces:**
- Consumes: `STACK_GAP`, `sheetToWorld`, `heightToY` (Task 1); `TOPO.guides` (Task 2); `TopographyMapSheet` with `animated={false}`, `labels={false}` and `svgRef` (Task 3).
- Produces: no new exports. The toggle lives in `TopographyScene` and passes `stacked` / `setStacked`.

**Layers (world y):**

| Layer | y | Contents |
|---|---|---|
| Top | `2·STACK_GAP` | The live diorama group. The terrain group is lifted; its y is damped toward the goal. |
| Middle | `STACK_GAP` | Photo slab: a `BoxGeometry(4, 0.035, 3)`. The top face uses `MeshBasicMaterial({ map: photoRT.texture })` with `toneMapped` left at its default (true). The other faces use `#E8DCC4` (papercut edge cream). |
| Bottom | `0` | Map slab: the same box, with the top face `MeshBasicMaterial({ map: mapTexture, toneMapped: false })`. |

In non-stack modes, the slabs are at the diorama's y, scaled to 0 and hidden. Entering the stack damps the terrain lift to `2·GAP` and the slab lifts to `GAP` / `0`, with a stagger of 120 ms. Leaving reverses it.

**Photo slab texture (render-to-texture, once, after the GLB loads):**

- `new THREE.WebGLRenderTarget(2048, 1536, { samples: 4 })`.
- `OrthographicCamera(-2, 2, 1.5, -1.5, 0.1, 20)` at `(0, 10, 0)`, looking down with `up = (0, 0, -1)`.
- Hide the slabs, guides and labels. Then run `gl.setRenderTarget(rt); gl.render(scene, cam); gl.setRenderTarget(null)` and restore visibility.
- Three.js leaves render-target output linear and un-tone-mapped. The slab material's tone mapping applies ACES at display, so the slab matches the live photo view.

**Map slab texture:**

- A hidden `<TopographyMapSheet reveal labels={false} animated={false} svgRef={ref} />` renders inside a `position:absolute; width:2048px; height:1536px; visibility:hidden` div.
- Serialize it with `new XMLSerializer().serializeToString(ref.current)` and wrap it in a Blob with type `image/svg+xml`, then load it into an `Image`.
- Draw the neatline region onto a 2048×1536 canvas, cropping the viewBox so that the sheet 0–100 × 0–75 fills the canvas: `ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 2048, 1536)`, with the source rect computed from `VIEWBOX`/`COLLAR` at the image's natural size.
- The result is a `CanvasTexture` with `colorSpace = SRGBColorSpace`.

**Guides:**

- For each of `TOPO.guides`, draw a vertical drei `<Line dashed dashSize={0.05} gapSize={0.035} color="#38432E" opacity={0.7} transparent lineWidth={1.4}>`. It runs from the map slab (y 0.02) to the top diorama point `2·GAP + heightToY(heightM) + 0.03`.
- Add a small ink dot (`sphereGeometry` r 0.018) where each guide crosses each slab.

**Labels:**

- Each slab gets a drei `<Html position={[-2.25, y + 0.05, 0]} center style={{ left: 0 }}>` whose child is a real `<button>`. Its content is the existing number badge (`01`/`02`/`03`) plus `VIEWS[i].label`, in the same classes as the tablist buttons, with the active state `border-accent before:bg-accent/10`. `onClick` calls `onSelectView(id)`.
- The `left: 0` comment explains the same drei RTL anchoring issue as in `ContourCake3D`.
- The active layer gets an accent outline: a drei `Line` rectangle around the slab's top edge, `#D97E2B`, lineWidth 2.
- Pointer: clicking a slab mesh or the top diorama calls `onSelectView`. The cursor is `pointer` over layers.

**Toggle button** (in `TopographyScene`, rendered inside the viewer wrapper at `absolute top-2 end-2 z-10`):

```tsx
<button type="button" aria-pressed={stacked} onClick={() => setStacked((s) => !s)}
  className={cn('rounded-[3px] border bg-bg-elevated/95 px-2.5 py-1 text-xs font-display font-bold transition-colors cursor-pointer',
    stacked ? 'border-accent text-fg' : 'border-border text-fg-muted hover:border-accent/50 hover:text-fg')}>
  כל התצוגות יחד
</button>
```

Tabs, pager and arrow keys keep working while stacked: they change the highlighted layer and the text, and stay in stack mode.

- [ ] **Step 1:** Implement the slab meshes and the lift damping.
- [ ] **Step 2:** Implement the photo RTT and the map-SVG texture.
- [ ] **Step 3:** Implement the guides, the Html layer buttons and the active outline, and add the toggle in `TopographyScene`.
- [ ] **Step 4: Screenshots at 1440×900** of stacked with 01/02/03 active, plus a mid-transition frame 400 ms after toggling.
  Expected checks:
  - three layers are clearly separated;
  - the dashed guides pass through the summit, the SW cluster and the SE pair on all three layers;
  - the photo slab matches the photo view's colours;
  - the map slab shows contours without text;
  - the layer label buttons don't overlap the geometry;
  - the stack fits the viewer without clipping.
- [ ] **Step 5: Reduced-motion run** (Playwright `reducedMotion: 'reduce'`): toggling shows the assembled stack in the first frame after the click. `npx tsc --noEmit -p .` reports 0 errors.

---

### Task 6: QA script, reviews and assumptions

**Files:**
- Create: `scripts/qa/shot-topography.mjs`
- Append: `design/docs/assumptions.md`

**Interfaces:** Consumes everything above. Produces the screenshots under `design/screenshots/topography-redesign/` and a JSON report printed to stdout.

- [ ] **Step 1: Finish `shot-topography.mjs`.** Use `chromium.launch({ channel: 'chrome' })` and `http://localhost:3000/lessons/topic-02/#scene-topography`, at viewports 1440×900 and 1440×1122. It covers:
  - the fit report: the tablist top and card bottom (`getBoundingClientRect`), with the assertion `cardBottom − tablistTop ≤ 760`;
  - at 1122, `cardBottom ≤ innerHeight` with the page scrolled to top;
  - at 900, the whole block fits after `scrollIntoView` of the tablist with an 88 px top offset;
  - the registration probe (Task 4 Step 6);
  - shots for 3d, photo, topo, stacked ×3, and the mid-transitions 3d→photo (+500 ms) and photo→topo (+600 ms);
  - reduced-motion shots;
  - console errors, collected and printed.

  Exit non-zero if any assertion fails.
- [ ] **Step 2: Run it** and read every screenshot. Fix any delta, then re-run until it exits 0.
- [ ] **Step 3: Dispatch the reviewers** in parallel, read-only, on the new/changed files and screenshots: `visual-qa-reviewer`, `cartographic-reviewer`, `rtl-qa-reviewer` and `frontend-reviewer`. Fix the confirmed findings and re-run Step 2.
- [ ] **Step 4: Append to `design/docs/assumptions.md`** a `## 2026-09-28 — Lesson 2 topography: one terrain, three representations` section. Its bullets:
  - the grid is true 1 km lines (`202`/`203`/`692`), replacing 201–205/691–694, because the old labels contradicted the scale bar;
  - vertical exaggeration is 2× in the 3D view only;
  - the unlabeled grey-green lines were dropped;
  - where photo and map conflicted, the map won (3 vegetation areas);
  - buildings are sized as ~28 × 18 m farm buildings, so they stay visible at 2 m per screen px;
  - there is no normal map, because the 5 m mesh resolves the relief at display scale;
  - the typos kept verbatim per the copy lock.
- [ ] **Step 5: Final gates.**
  - `node --experimental-strip-types --test scripts/qa/topography-layout.test.mjs` passes.
  - `npx tsc --noEmit -p .` reports 0 errors.
  - `npm run lint` is clean for the touched files and `npm run qa:rtl` is clean.
  - `node scripts/qa/shot-topography.mjs` exits 0.
  - `git status` shows only files this plan owns, plus other sessions' files untouched.
  - Report to the user in Hebrew, with the archive link for comparison (`/archive/topic-02/topography-v1/`).
