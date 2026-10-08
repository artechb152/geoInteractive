# Relief vs. land cover — "same hill, three landscapes" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static comparison table on screen 3 of `ReliefCoverIntroScene` ("השוואה בין תבליט לתכסית") with an interactive "same hill" illustration.
- The hill is shown as a terrain block plus a contour map, derived from one height function, in four states.
- Before each transition the learner predicts what will change.
- The original table closes the activity, unchanged.

**Architecture:**
1. **Extract the engine.** The terrain-block engine is pulled out of `LandformsVisuals.tsx` into two modules:
   - a pure-TS geometry module (height grids, marching squares, block build, morph mesh);
   - a React module (WebGL morph view, contour-morph hook, map sheet).

   The landforms scene must render **pixel-identically** after the extraction.
2. **Build the new activity.** It has three parts:
   - a pure data module (hill, quarry cut, cover per state, flow reducer), covered by `node:test`;
   - a visuals file (block objects, map symbols);
   - a flow component (stepper, prediction, feedback, state card, summary) that gets all copy from the scene.

**Tech Stack:** Next.js 15 (static export), React 19, framer-motion 11, Tailwind 3, WebGL 1 (raw), Node 22 `node:test` with `--experimental-strip-types`, Playwright (Chrome channel).

**Spec:** `docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md` (approved 2026-10-08; committed in `1984b5f`). Read it before starting. Every requirement below argues from it.

## Global Constraints

**Content and copy**
- **Content lock (spec §3).** The ten `COMPARE_ROWS` cells, their five row labels, the heading "השוואה בין תבליט לתכסית" and the summary table are verbatim, character for character.
  - The cover "דוגמאות" cell may be *displayed* in two parts, split at its own " · ".
  - The orchard sentence "מטע נחשב לתכסית מלאכותית משום שנוצר בידי אדם." is reused verbatim.
- **New copy (spec §4).** Use exactly the strings in Task 6 Step 2 (`COMPARE_COPY`). They are supportive feedback and chrome only.
  - Cover-only feedback says "במעבר הזה…", never "התבליט לא משתנה".
  - The quarry feedback never describes the contour geometry.

**Other sessions' work**
- **Concurrent sessions.** Other sessions edit this repo at the same time.
  - Never stage, commit, stash, revert or reformat files you did not create or change in this plan.
  - Commit only with explicit pathspecs: `git add -- <files> && git commit -m "…" -- <files>`.
  - **Never** `git add -A`, `git add .` or `git commit -a`. The staged deletions under `public/assets/lessons/topic02/contour-mountain/` belong to another session and must stay staged and uncommitted.
- **Files you must not touch:**
  - `ContourCake3D.tsx`, `ContoursScene.tsx`, `TopographyScene.tsx`, `TopographyTerrain3D.tsx`
  - `contourMountain*.ts`, `scripts/blender/*`, `public/assets/lessons/topic02/contour-mountain/**`
  - anything under `topic-06/`
- **Freshness gates.** Before editing a file, re-read it. If any of these fail, stop and report instead of editing:
  - `LandformsVisuals.tsx` must be unchanged since `3f9a2e0`: `git diff --quiet 3f9a2e0 -- src/components/lessons/topic-02/LandformsVisuals.tsx`.
  - `ReliefCoverIntroScene.tsx` must be unchanged since `1984b5f`.
- **Line numbers** quoted for `LandformsVisuals.tsx` refer to its content at `3f9a2e0`. The file is 1,727 lines, and line 477 is `function getTerrain(form: LandformId): Terrain {`.

**Dev server and build**
- **Own dev server.** Never use the shared `:3000`, and never build into `.next/`.
  - Start: `NEXT_DIST_DIR=.next-relief npx next dev -p 3100` (Bash, `run_in_background: true`). QA scripts get `QA_PORT=3100`.
  - Next adds `".next-relief/types/**/*.ts"` to `tsconfig.json` `include`. Remove that line when the server is stopped for good (Task 9).
- **No `next build` in the main folder.** Verification builds run only in a temporary git worktree (Task 9).

**Checks**
- **Type check:** `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "terrainBlock|LandformsVisuals|LandformsScene|ReliefCover|reliefCover" || echo CLEAN` must print `CLEAN`. Other sessions' files may have unrelated errors, so ignore those.
- **Unit tests:** `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/relief-cover-compare.test.mjs`.
- **Pure TS modules** (`terrainBlockGeometry.ts`, `reliefCoverCompare.data.ts`) are imported by Node directly:
  - no React or framer imports;
  - every type-only import uses the `type` keyword (`import { buildTerrain, type Terrain } …`);
  - no `enum`, `namespace` or parameter properties.

**Design rules (CLAUDE.md, spec §6)**
- **RTL:** logical utilities only (`ms-/me-/start-/end-`); no `left-/right-` and no `text-left/right`.
  - Boards are never mirrored. Every SVG `<text>` sets `textAnchor`.
- **Colours:** existing palette values and the engine's existing mixes of them only; no new tokens.
  - Inside the new illustration, green means vegetation only: the ground ramp and the map's height tint are not green.
  - The landforms look must not change.
- **QA artifacts** go to `qa-output/` (gitignored). Never commit PNGs.

## Spec refinements made while planning (flag in the hand-off, not silent)

1. **Visuals file split.** The boards live in a new `ReliefCoverVisuals.tsx`, following the repo's `LandformsVisuals`/`LandCoverVisuals` pattern. `ReliefCoverCompare.tsx` holds the flow UI, which keeps each file focused.
2. **`ContourMapSheet` gets a `layerTint` prop.** Landforms keep the green default. The new map passes the tan `C.contour`, so the map obeys "green = vegetation".
3. **Restart label is "התחלה מחדש".** That is the label `SortQuiz` already uses on screen 4 of the same scene; spec §4 said "התחילו מחדש". Confirm with the user; it is a one-string change.
4. **New accessibility string:** the stepper's `aria-label` is "שלבי ההמחשה".
5. **QA hook:** `ContourMapSheet` puts `data-contour={L}` on contour paths. This changes no pixels.
6. **Quarry map area = mask ≥ 0.5.** This is the quarry site, including its open yard. It matches exactly the orchard trees that are removed: every removed tree has mask ≥ 0.5, which is tested.
7. **Prediction options don't use `aria-pressed`** (spec §9 said they would). Picking an option advances immediately and removes the options, so there is never a pressed state to expose. The choice is announced through the `role="status"` feedback, and the question group is labelled by the question.

## File Structure

| File | Responsibility |
|---|---|
| `src/components/lessons/topic-02/terrainBlockGeometry.ts` **(new)** | Pure engine: tile and camera constants, palette `C`, `mix`, contouring, `buildContours`, `buildTerrain(spec)`, `getMorphMesh`, `isVisible`, `drape`, path helpers |
| `src/components/lessons/topic-02/terrainBlock.tsx` **(new)** | React engine: `morphRenderer` (WebGL), `TerrainBlockView`, `useContourMorph`, `ContourMapSheet`, `MapLabel`, `useIdlePrefetch` |
| `src/components/lessons/topic-02/LandformsVisuals.tsx` | Landform specs, look, overlays, map labels and slopes. Thin `LandformReality`/`LandformMap` wrappers |
| `src/components/lessons/topic-02/LandformsScene.tsx` | `export` added to `BoardView` only |
| `src/components/lessons/topic-02/reliefCoverCompare.data.ts` **(new)** | Hill, quarry mask and cut, cover per state, legend/chip per state, state cells, flow reducer, `splitExamples` |
| `src/components/lessons/topic-02/ReliefCoverVisuals.tsx` **(new)** | `ReliefCoverBlock` (objects on the block), `ReliefCoverMap` (symbols, ghost contours, numbers), `LegendSwatch` |
| `src/components/lessons/topic-02/ReliefCoverCompare.tsx` **(new)** | Stepper, boards row, chip, legend, state card (feedback, cells, prediction), summary (`CompareTable`) |
| `src/components/lessons/topic-02/ReliefCoverIntroScene.tsx` | Screen 3: `<ReliefCoverCompare rows={COMPARE_ROWS} copy={COMPARE_COPY} />`. `COMPARE_COPY` added; `CompareHead` moved out |
| `scripts/qa/shot-landforms-baseline.mjs` **(new)** | Captures the 5 landform boards; `--compare` gives a pixel diff (the extraction gate) |
| `scripts/qa/relief-cover-compare.test.mjs` **(new)** | Geometry, cover, flow and content-lock tests |
| `scripts/qa/shot-relief-cover.mjs` **(new)** | DOM content-lock, flow walk-through and screenshots |
| `design/docs/assumptions.md` | Appended entry (Task 9) |

---

### Task 1: Preflight and landforms baseline

**Files:**
- Create: `scripts/qa/shot-landforms-baseline.mjs`

**Interfaces:**
- Produces: `qa-output/landforms-extraction/before/{motion,reduced}-{1..5}.png` (+ `.html` DOM dumps), the reference for Tasks 2, 3 and 9. Also produces the CLI `node scripts/qa/shot-landforms-baseline.mjs <outDir>` | `--compare <dirA> <dirB>` (exit 1 on any pixel difference).

- [ ] **Step 1: Freshness gates and snapshot**

```bash
cd "C:/Users/idog2/Desktop/Programming/Artech/geoInteractive"
git diff --quiet 3f9a2e0 -- src/components/lessons/topic-02/LandformsVisuals.tsx && echo LV-OK
git diff --quiet 1984b5f -- src/components/lessons/topic-02/ReliefCoverIntroScene.tsx src/components/lessons/topic-02/LandformsScene.tsx && echo SCENES-OK
SNAP="$TEMP/relief-cover-snapshot" && mkdir -p "$SNAP" && cp src/components/lessons/topic-02/{LandformsVisuals,LandformsScene,ReliefCoverIntroScene}.tsx "$SNAP/"
git diff --cached --name-status   # record: the other session's staged deletions — must look the same at the end
```
Expected: `LV-OK`, `SCENES-OK`, and three staged `D` lines under `contour-mountain/`. If either OK is missing, stop and report.

- [ ] **Step 2: Start the private dev server**

Run (Bash, `run_in_background: true`): `NEXT_DIST_DIR=.next-relief npx next dev -p 3100`
Then poll until ready: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/lessons/topic-02/`. Expected: `200` (the first compile can take about a minute).

- [ ] **Step 3: Write the capture/compare script**

```js
// Extraction gate for the terrain-block engine (docs/superpowers/plans/2026-10-08-relief-cover-compare.md).
// Captures the five landform boards ([data-qa="forms-board"]) once settled, with motion and with
// reduced motion, plus a normalized DOM dump; --compare diffs two capture folders pixel by pixel.
//
//   QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/before
//   node scripts/qa/shot-landforms-baseline.mjs --compare qa-output/landforms-extraction/before qa-output/landforms-extraction/after
//
// Exit 1 on any page error, or (compare) on any differing pixel.
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const FORMS = ['כיפה', 'שלוחה', 'גיא', 'אוכף', 'מכתש'];
const args = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });

if (args[0] === '--compare') {
  const [a, b] = args.slice(1);
  const page = await (await browser.newContext()).newPage();
  let bad = 0;
  for (const f of (await readdir(a)).filter((n) => n.endsWith('.png')).sort()) {
    const [pa, pb] = await Promise.all([readFile(`${a}/${f}`), readFile(`${b}/${f}`)]);
    if (pa.equals(pb)) {
      console.log(`same  ${f}`);
      continue;
    }
    const d = await page.evaluate(async ([x, y]) => {
      const load = (b64) =>
        new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.src = `data:image/png;base64,${b64}`;
        });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { count: -1, size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
      const px = (img) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const da = px(ia);
      const db = px(ib);
      let count = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) count++;
      }
      return { count, size: `${ia.width}x${ia.height}` };
    }, [pa.toString('base64'), pb.toString('base64')]);
    if (d.count === 0) console.log(`same  ${f} (pixels equal, encoding differs)`);
    else {
      console.log(`DIFF  ${f}: ${d.count < 0 ? 'size ' + d.size : d.count + ' px'}`);
      bad++;
    }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
}

const outDir = args[0] ?? 'qa-output/landforms-extraction/before';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-landforms`;
await mkdir(outDir, { recursive: true });
let failed = false;
// useId strings differ between builds; data-contour is a QA hook added in Task 3 — neither paints anything
const normalize = (html) =>
  html.replace(/\b[A-Za-z0-9]+-(sky|soft|smooth|tile)\b/g, 'ID-$1').replace(/ data-contour="\d+"/g, '');

for (const reduced of [false, true]) {
  const tag = reduced ? 'reduced' : 'motion';
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1122 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  const board = page.locator('[data-qa="forms-board"]');
  await board.waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await board.scrollIntoViewIfNeeded();
  for (const [i, name] of FORMS.entries()) {
    await page.getByRole('tab', { name: new RegExp(name) }).first().click();
    // settled = the moving canvas is gone; then the marks' fade (0.45 s delay + 0.3 s)
    await page.waitForFunction(() => !document.querySelector('[data-qa="forms-board"] canvas'), null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    await board.screenshot({ path: `${outDir}/${tag}-${i + 1}.png`, animations: 'disabled' });
    const html = await board.locator('svg').evaluateAll((svgs) => svgs.map((s) => s.outerHTML).join('\n'));
    await writeFile(`${outDir}/${tag}-${i + 1}.html`, normalize(html));
  }
  if (errors.length) {
    console.error(`${tag}: page errors`, errors.slice(0, 3));
    failed = true;
  }
  await ctx.close();
}
await browser.close();
console.log(`captured → ${outDir}`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: Capture the baseline and prove the gate is stable**

```bash
QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/before
QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/before-again
node scripts/qa/shot-landforms-baseline.mjs --compare qa-output/landforms-extraction/before qa-output/landforms-extraction/before-again
```
Expected:
- 10 `same` lines and exit 0. Two captures of unchanged code must be identical; otherwise the gate is meaningless.
- If a file differs, raise the settle wait in the script (1200 → 2000 ms) and repeat until two runs agree.
- Then open `before/motion-1.png` and check that it shows the settled hill block and map.

- [ ] **Step 5: Commit the script**

```bash
git add -- scripts/qa/shot-landforms-baseline.mjs
git commit -m "test(topic-02): landforms pixel gate for the terrain-engine extraction

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- scripts/qa/shot-landforms-baseline.mjs
```

---

### Task 2: Extract the pure engine into `terrainBlockGeometry.ts`

**Files:**
- Create: `src/components/lessons/topic-02/terrainBlockGeometry.ts`
- Modify: `src/components/lessons/topic-02/LandformsVisuals.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces (all `export`ed from `terrainBlockGeometry.ts`; later tasks use exactly these names):
  - types `Pt`, `HeightFn`, `Grid`, `Contours = { grid: Grid; rings: Map<number, Pt[][]>; levels: number[] }`, `Shape`, `Terrain`, `MorphMesh`, `TerrainLook`, `TerrainSpec`
  - constants `TW`, `TH`, `BASE`, `LEVELS`, `INDEX_LEVEL`, `VB_X`, `VB_W`, `MAP_Y`, `MAP_H`, `VIEW`, `REAL_X`, `REAL_W`, `REAL_H`, `C`, `PIT_ROCK`, `PIT_FLOOR`
  - functions `mix(a, b, t)`, `sampleGrid(f)`, `contourRings(g, L)`, `onBorder(p)`, `isInterior(ring)`, `buildContours(h): Contours`, `f2(n)`, `identity(p)`, `ringsPath(rings, proj)`, `polyPath(pts)`, `pointsAttr(xy)`, `buildTerrain(spec: TerrainSpec): Terrain`, `lerpArr(a, b, s)`, `getMorphMesh(t): MorphMesh`, `isVisible(t, x, y)`, `drape(t, pts, closed?)`, `nearestOnLevel(c: Pick<Contours, 'rings'>, level, at): Pt | null`

- [ ] **Step 1: Re-check freshness**

Run: `git diff --quiet 3f9a2e0 -- src/components/lessons/topic-02/LandformsVisuals.tsx && echo LV-OK`. Expected: `LV-OK`.

- [ ] **Step 2: Create `terrainBlockGeometry.ts` from moved code**

Build the file in this order. "Move" means cut from `LandformsVisuals.tsx`, paste here and add `export` where listed. Code bodies stay byte-identical except for the edits shown.

1. **Header:**
```ts
/**
 * terrainBlockGeometry — the pure (React-free) half of the course's terrain-block
 * engine, extracted from LandformsVisuals so other scenes can reuse it
 * (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §8).
 *
 * One height field h(x, y) over a 100 × 50 tile drives both boards:
 *   - "בשטח": the axonometric papercut block (buildTerrain → SVG strips, plus a
 *     morph mesh for the WebGL frames in terrainBlock.tsx);
 *   - "במפה": contour rings by marching squares, 10 m interval (buildContours).
 * Node's test runner imports this file directly (scripts/qa/*.test.mjs): keep it
 * free of React, and import types with `type`.
 */
```
2. **Lines 28–29** (`Pt`, `HeightFn`): prefix with `export`.
3. **Lines 31–41** (`TW`, `TH`, `BASE`, `LEVELS`, `INDEX_LEVEL`, the map window comment, `VB_X`, `VB_W`, `MAP_Y`, `MAP_H`): `export` every `const`.
4. **Lines 43–55** (the camera comment, `ROT` … `BASE_SLAB`): `export` only `VIEW`, `REAL_X`, `REAL_W`, `REAL_H`.
5. **Lines 57–73** (`C`): `export const C = { … };`
6. **Lines 77–87** (`mix`): `export function mix…`
7. **Lines 109–120** (`SUN_EL` … `PIT_FLOOR`): `export` only `PIT_ROCK` and `PIT_FLOOR`.
8. **New, replacing `groundColor` (lines 122–130),** which stays deleted from LandformsVisuals:
```ts
/** How a block is coloured. Landforms tint by elevation; other scenes bring their own ramp. */
export type TerrainLook = {
  /** Ground colour by relative height t (0 = base plain, 1 = CEIL − 6), as [t, #rrggbb] stops. */
  ramp: [number, string][];
  /** Extra tint for one surface quad (centre x, y; mean raw height): after the pit tint, before curvature and sun. */
  tint?: (col: string, quad: { x: number; y: number; raw: number }) => string;
};

export type TerrainSpec = {
  h: HeightFn;
  kz: number; // oblique: screen-y per metre of elevation (vertical exaggeration)
  ky?: number; // camera: foreshortening of the ground plane (default KY)
  look: TerrainLook;
};

function rampColor(ramp: [number, string][], t: number): string {
  const k = Math.min(1, Math.max(0, t));
  for (let i = 1; i < ramp.length; i++) {
    const [t1, c1] = ramp[i];
    const [t0, c0] = ramp[i - 1];
    if (k <= t1) return mix(c0, c1, (k - t0) / (t1 - t0));
  }
  return ramp[ramp.length - 1][1];
}
```
9. **Lines 218–338** (the contouring header comment, `Grid`, `STEP`, `PAD`, `sampleGrid`, `contourRings`, `onBorder`, `isInterior`): `export` `Grid`, `sampleGrid`, `contourRings`, `onBorder`, `isInterior`.
10. **New:**
```ts
export type Contours = {
  grid: Grid; // the sampled height field (a map's morph blends these)
  rings: Map<number, Pt[][]>; // level → rings of the region h ≥ level
  levels: number[]; // levels actually present on this tile
};

const contourCache = new WeakMap<HeightFn, Contours>();

export function buildContours(h: HeightFn): Contours {
  const hit = contourCache.get(h);
  if (hit) return hit;
  const grid = sampleGrid(h);
  const rings = new Map<number, Pt[][]>();
  const levels: number[] = [];
  for (const L of LEVELS) {
    const r = contourRings(grid, L);
    if (r.length) {
      rings.set(L, r);
      levels.push(L);
    }
  }
  const c: Contours = { grid, rings, levels };
  contourCache.set(h, c);
  return c;
}
```
11. **Lines 368–379** (`f2`, `id`, `ringsPath`, `polyPath`): `export` all four, and **rename `id` → `identity`**: `export const identity = (p: Pt) => p;`.
12. **Lines 429–475** (the block comment, `CEIL`, `softplus`, `shownHeight`, `swell`, `MESH`, `Shape`, `Growth`, `Terrain`, `pointsAttr`, `terrainCache`):
    - `export` `Shape`, `Terrain`, `pointsAttr`.
    - In `Growth`, add a field after `fills`: `plain: string; // flat (pre-relief) ground colour for the build-up`.
    - Replace the `terrainCache` line with `const terrainCache = new WeakMap<TerrainSpec, Terrain>();`.
13. **Lines 477–651** (`getTerrain`), renamed and generalized. Apply exactly these edits; everything else stays as is:
```ts
export function buildTerrain(spec: TerrainSpec): Terrain {
  const hit = terrainCache.get(spec);
  if (hit) return hit;
  const { h, kz, ky = KY, look } = spec;
```
    - In `quad()`, replace `let col = groundColor(` with `let col = rampColor(look.ramp, `, keeping the argument.
    - Delete the `if (form === 'hill' && highlight !== undefined) { … }` block (lines 563–566).
    - Directly after `const cy = (j + 0.5) * MESH;` insert:
```ts
    if (look.tint) {
      const rm = (raw[j * nx + i] + raw[j * nx + i + 1] + raw[(j + 1) * nx + i] + raw[(j + 1) * nx + i + 1]) / 4;
      col = look.tint(col, { x: cx, y: cy, raw: rm });
    }
```
    - In the `growth` literal, after `fills,` add `plain: look.ramp[0][1],`.
    - Replace `terrainCache.set(form, t);` with `terrainCache.set(spec, t);`.
14. **Lines 662–667** (`lerpArr`, with its comment): `export`.
15. **Lines 669–752** (the morph-mesh comment, `MorphMesh`, `hexRgb`, `morphMeshes`, `getMorphMesh`):
    - `export` `MorphMesh` and `getMorphMesh`.
    - In `getMorphMesh`, add `plain` to the destructuring of `t.growth`, and replace `const plain = hexRgb(GROUND_RAMP[0][1]);` with `const plainRgb = hexRgb(plain);`.
    - Inside `vertex`, change `const c = ground ? plain : col;` to `const c = ground ? plainRgb : col;`.
16. **Lines 1019–1054** (`isVisible`, `drape`, with comments): `export` both.
17. **Lines 1163–1177** (`nearestOnLevel`): `export`, and change its first parameter to `c: Pick<Contours, 'rings'>`, with `lf.rings` → `c.rings` in the body.

- [ ] **Step 3: Rewire `LandformsVisuals.tsx`**

1. Delete everything moved in Step 2 from this file. Keep `const E = Math.exp;` (line 75): `SPECS` still uses it.
2. Add after the framer import:
```ts
import {
  BASE, C, INDEX_LEVEL, LEVELS, MAP_H, MAP_Y, REAL_H, REAL_W, REAL_X, TH, TW, VB_W, VB_X,
  buildContours, buildTerrain, contourRings, drape, f2, getMorphMesh, identity, isInterior, isVisible, lerpArr, mix,
  nearestOnLevel, pointsAttr, ringsPath,
  type Contours, type Grid, type HeightFn, type Pt, type Terrain, type TerrainLook, type TerrainSpec,
} from './terrainBlockGeometry';
```
3. Rename every remaining use of `id` as the identity projection to `identity`. There are three call sites: `ringsPath(lf.rings.get(L) ?? [], id)`, `ringsPath(contourRings(g, L), id)` and `ringsPath(highlightRings, id)`.
4. Replace the old `Landform` type, `cache` and `getLandform` (lines 340–366) with:
```ts
type Landform = Contours & { spec: Spec };

const cache = new Map<LandformId, Landform>();

function getLandform(id: LandformId): Landform {
  const hit = cache.get(id);
  if (hit) return hit;
  const lf: Landform = { spec: SPECS[id], ...buildContours(SPECS[id].h) };
  cache.set(id, lf);
  return lf;
}
```
5. Directly after `SPECS` add the landform look and `getTerrain`:
```ts
// The landforms' look: the elevation ramp above, and on the hill its key summit
// ring tinted toward the accent (the same ring is highlighted on the map).
const LANDFORM_LOOK: TerrainLook = { ramp: GROUND_RAMP };
const HILL_LOOK: TerrainLook = {
  ramp: GROUND_RAMP,
  tint: (col, q) => (q.raw >= (SPECS.hill.highlight as number) ? mix(col, C.accent, 0.32) : col),
};
const TERRAIN_SPECS = Object.fromEntries(
  (Object.keys(SPECS) as LandformId[]).map((f) => {
    const { h, kz, ky } = SPECS[f];
    return [f, { h, kz, ky, look: f === 'hill' ? HILL_LOOK : LANDFORM_LOOK } satisfies TerrainSpec];
  }),
) as Record<LandformId, TerrainSpec>;

const getTerrain = (form: LandformId): Terrain => buildTerrain(TERRAIN_SPECS[form]);
```
6. In `LandformReality`'s idle-prefetch effect, replace the `queue` line (it referenced the moved `terrainCache`) with:
```ts
    const queue = Object.keys(SPECS) as LandformId[]; // cached getters make repeats free
```
7. `nearestOnLevel(lf, …)` call sites stay as they are: `Landform` satisfies `Pick<Contours, 'rings'>`.

- [ ] **Step 4: Type-check**

Run the Global Constraints type check. Expected: `CLEAN`.

- [ ] **Step 5: Pixel gate**

```bash
QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/after-2
node scripts/qa/shot-landforms-baseline.mjs --compare qa-output/landforms-extraction/before qa-output/landforms-extraction/after-2
```
Expected: 10 `same`, exit 0.

If anything differs:
- Run `diff qa-output/landforms-extraction/before/motion-1.html qa-output/landforms-extraction/after-2/motion-1.html` (and the other differing files) to locate the drift. Usual causes are a changed operation order in `quad()` or the hill tint threshold.
- Fix it until the diff is 0.
- Do not move on with a non-zero diff.

- [ ] **Step 6: Commit**

```bash
git add -- src/components/lessons/topic-02/terrainBlockGeometry.ts src/components/lessons/topic-02/LandformsVisuals.tsx
git commit -m "refactor(topic-02): extract pure terrain-block geometry from LandformsVisuals

Pixel-identical landforms (qa-output gate, 10/10 same).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/lessons/topic-02/terrainBlockGeometry.ts src/components/lessons/topic-02/LandformsVisuals.tsx
```

---

### Task 3: Extract the React engine into `terrainBlock.tsx`; export `BoardView`

**Files:**
- Create: `src/components/lessons/topic-02/terrainBlock.tsx`
- Modify: `src/components/lessons/topic-02/LandformsVisuals.tsx`, `src/components/lessons/topic-02/LandformsScene.tsx` (one word)

**Interfaces:**
- Consumes: Task 2 exports.
- Produces:
  - `TerrainBlockView({ terrain: Terrain; ariaLabel: string; marks?: ReactNode; objects?: ReactNode })`
  - `useContourMorph(c: Contours): { paths: string[]; still: boolean; switched: boolean }` (`paths[i]` belongs to `LEVELS[i]`)
  - `ContourMapSheet({ ariaLabel: string; paths: string[]; layerTint?: string | null; behind?: ReactNode; inClip?: ReactNode; children?: ReactNode })`
  - `MapLabel({ at, text, fill, size?, bg?, charW? })` (unchanged signature)
  - `useIdlePrefetch(tasks: readonly (() => void)[])`
  - `export function BoardView` in `LandformsScene.tsx`

- [ ] **Step 1: Create `terrainBlock.tsx`**

```tsx
'use client';

/**
 * terrainBlock — the React half of the terrain-block engine (geometry lives in
 * terrainBlockGeometry.ts). Extracted from LandformsVisuals so any scene can show
 * a height field as the papercut block ("בשטח") and its contour map ("במפה"):
 *   - TerrainBlockView: the block; a change of height field morphs on the GPU;
 *   - useContourMorph + ContourMapSheet: the contour map; contours re-trace
 *     every frame while the height field changes.
 * Diagrams — never mirrored for RTL; every <text> sets textAnchor.
 */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { animate, cubicBezier, motion, useReducedMotion } from 'framer-motion';
import {
  C, INDEX_LEVEL, LEVELS, MAP_H, MAP_Y, REAL_H, REAL_W, REAL_X, TH, TW, VB_W, VB_X,
  contourRings, f2, getMorphMesh, identity, lerpArr, pointsAttr, ringsPath,
  type Contours, type Grid, type Pt, type Terrain,
} from './terrainBlockGeometry';
```
Then, in order:

1. **Move from `LandformsVisuals.tsx` lines 653–660** verbatim: the build-up and switching comments, `BUILD_S`, `BUILD_FADE`, `BUILD_HOLD`, `MORPH_S` and `MOVE_EASE`.
2. **Move lines 754–825** verbatim: `MORPH_VS`, `MORPH_FS` and `morphRenderer`.
3. **Add `TerrainBlockView`.** This is `LandformReality`'s body with the form replaced by the terrain itself, plus the `objects` layer:
```tsx
export function TerrainBlockView({
  terrain,
  ariaLabel,
  marks,
  objects,
}: {
  terrain: Terrain;
  ariaLabel: string;
  /** Lines draped on the ground (feature marks): fade in each time the block lands. */
  marks?: ReactNode;
  /** Things standing on the ground: an SVG layer above the moving canvas, from the block's first landing on. */
  objects?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // The moving frames are drawn on a canvas over the board; the finished board
  // is painted underneath before the canvas goes.
  //  - First showing — build-up, bottom to top: the block lands flat, then the
  //    ground rises out of it to full relief, one continuous surface the whole
  //    way (user decision 2026-09-28: no stacked contour sheets).
  //  - Switching terrains — shape to shape: the ground on screen reshapes
  //    straight into the next one, without going flat again (user decision
  //    2026-09-28). A click mid-move carries on from the shape on screen.
  const layerRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<SVGPolygonElement>(null);
  // what the canvas shows: pose `from` blended toward `to` by s (and the shadow with it)
  const shownRef = useRef<{ from: Float32Array; to: Float32Array; foot: [number[], number[]]; s: number } | null>(null);
  const [stage, setStage] = useState<{ terrain: Terrain; step: 'landed' | 'done' } | null>(null);
  // a new terrain is moving until its own run lands
  const step = stage?.terrain === terrain ? stage.step : 'moving';
  const built = step !== 'moving';
  // run by the landing: drops the canvas once the finished board has painted
  const releaseRef = useRef<() => void>(() => {});

  // A layout effect: the canvas takes over in the same paint as the click, so
  // the old shape never blinks out.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const mesh = getMorphMesh(terrain);
    const prev = shownRef.current;
    const build = !prev;
    const run = {
      from: prev ? lerpArr(prev.from, prev.to, prev.s) : mesh.flat,
      to: mesh.pose,
      foot: [prev ? Array.from(lerpArr(prev.foot[0], prev.foot[1], prev.s)) : terrain.footprint, terrain.footprint] as [
        number[],
        number[],
      ],
      s: 0,
    };
    shownRef.current = run;
    // a fresh canvas per run: a context once released can't be drawn on again
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `display:block;width:100%;height:100%;opacity:${build ? 0 : 1}`;
    layer?.appendChild(canvas);
    const gl = !reduce && layer ? morphRenderer(canvas, mesh.index, run.from, run.to) : null;
    if (!gl) {
      canvas.remove();
      run.s = 1;
      setStage({ terrain, step: 'done' });
      return;
    }
    const frame = (p: number) => {
      if (build) canvas.style.opacity = String(Math.min(1, p / BUILD_FADE));
      run.s = MOVE_EASE(build ? Math.max(0, (p - BUILD_HOLD) / (1 - BUILD_HOLD)) : p);
      gl.draw(run.s);
      footRef.current?.setAttribute('points', pointsAttr(lerpArr(run.foot[0], run.foot[1], run.s)));
    };
    frame(0);
    const controls = animate(0, 1, {
      duration: build ? BUILD_S : MORPH_S,
      ease: 'linear',
      onUpdate: frame,
      onComplete: () => {
        run.s = 1;
        releaseRef.current = () => {
          gl.dispose();
          setStage({ terrain, step: 'done' });
        };
        setStage({ terrain, step: 'landed' });
      },
    });
    return () => {
      controls.stop();
      gl.dispose();
      canvas.remove();
      // stopped before anything rose (or re-run by Strict Mode): build up afresh
      if (build && run.s === 0) shownRef.current = null;
    };
  }, [reduce, terrain]);

  // Landed: the finished board is committed under the canvas's last frame. Two
  // frames later it has painted, and the canvas goes.
  useEffect(() => {
    if (step !== 'landed') return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => releaseRef.current());
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // While the ground moves, the hidden board keeps the last settled terrain: the
  // next one's thousands of strips are laid in under the canvas once it lands,
  // not in the frame of the click.
  const boardTerrain = built || !stage ? terrain : stage.terrain;
  const board = useMemo(
    () => (
      <>
        {/* each strip is stroked in its own colour to close hairline seams */}
        <g strokeWidth={0.32} strokeLinejoin="round" filter={`url(#${uid}-smooth)`}>
          {boardTerrain.surface.map((s, i) => (
            <path key={i} d={s.d} fill={s.fill} stroke={s.fill} />
          ))}
        </g>
        {boardTerrain.walls.map((w, i) => (
          <path key={i} d={w.d} fill={w.fill} stroke={w.fill} strokeWidth={0.1} strokeLinejoin="round" />
        ))}
      </>
    ),
    [boardTerrain, uid],
  );

  return (
    <div className="relative">
      {/* [paste LandformReality's <svg> … </svg> (lines 965–1012) verbatim, with ONE change:
          the overlay group's children `{overlays}` become `{marks}`] */}
      {/* the moving frames (canvas added by the effect above) */}
      {step !== 'done' && <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0" />}
      {/* standing objects stay visible over the moving ground */}
      {objects !== undefined && stage && (
        <svg
          viewBox={`${f2(REAL_X)} 0 ${f2(REAL_W)} ${REAL_H}`}
          aria-hidden
          className="pointer-events-none absolute inset-0 block h-full w-full"
        >
          {objects}
        </svg>
      )}
    </div>
  );
}
```
   The bracketed comment is an instruction, not code. Replace it with the exact `<svg …>` element from `LandformReality` (lines 965–1012). Inside it, `{overlays}` becomes `{marks}`; nothing else changes.
4. **Add `useContourMorph`:**
```tsx
/** The map's contours for a height field; when the field changes, every frame
 *  traces it part way from the shown one to the next (every level, so rings can
 *  appear, split and merge on the way). */
export function useContourMorph(c: Contours): { paths: string[]; still: boolean; switched: boolean } {
  const reduce = useReducedMotion();
  const settledPaths = useMemo(() => LEVELS.map((L) => ringsPath(c.rings.get(L) ?? [], identity)), [c]);
  const [moving, setMoving] = useState<string[] | null>(null);
  const [switched, setSwitched] = useState(false);
  const shownRef = useRef<{ from: ArrayLike<number>; to: ArrayLike<number>; s: number }>({
    from: c.grid.v,
    to: c.grid.v,
    s: 1,
  });
  useLayoutEffect(() => {
    const prev = shownRef.current;
    const to = c.grid.v;
    if (prev.to === to && prev.s === 1) return;
    const run = { from: lerpArr(prev.from, prev.to, prev.s), to, s: 0 };
    shownRef.current = run;
    if (reduce) {
      run.s = 1;
      setMoving(null);
      return;
    }
    setSwitched(true);
    const trace = () => {
      const g: Grid = { ...c.grid, v: lerpArr(run.from, run.to, run.s) };
      setMoving(LEVELS.map((L) => ringsPath(contourRings(g, L), identity)));
    };
    trace();
    const controls = animate(0, 1, {
      duration: MORPH_S,
      ease: 'linear',
      onUpdate: (p) => {
        run.s = MOVE_EASE(p);
        trace();
      },
      onComplete: () => {
        run.s = 1;
        setMoving(null);
      },
    });
    return () => controls.stop();
  }, [c, reduce]);
  return { paths: moving ?? settledPaths, still: moving === null, switched };
}
```
5. **Add `ContourMapSheet`.** This is `LandformMap`'s sheet, lines 1266–1323, with three slots and a tint option:
```tsx
/** The map sheet: paper, grid, contours (clipped to the tile) and the tile border.
 *  behind = under the height tint and contours; inClip = over the contours;
 *  children = over the border (labels, marks). */
export function ContourMapSheet({
  ariaLabel,
  paths,
  layerTint = C.greenLight,
  behind,
  inClip,
  children,
}: {
  ariaLabel: string;
  /** one path per LEVELS entry (useContourMorph().paths) */
  paths: string[];
  /** faint per-level height tint — deeper = higher ground; null = none */
  layerTint?: string | null;
  behind?: ReactNode;
  inClip?: ReactNode;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg
      viewBox={`${VB_X} ${MAP_Y} ${VB_W} ${MAP_H}`}
      className="block w-full h-auto"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={`${uid}-tile`}>
          <rect x={0.2} y={0.2} width={TW - 0.4} height={TH - 0.4} />
        </clipPath>
      </defs>
      <rect x={VB_X} y={MAP_Y} width={VB_W} height={MAP_H} fill={C.paper} />
      <rect x={0} y={0} width={TW} height={TH} fill="#FFFFFF" />
      {/* map grid */}
      <g stroke={C.hairlineSoft} strokeWidth={0.18}>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={'x' + i} x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={TH} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={'y' + i} x1={0} y1={(i + 1) * 10} x2={TW} y2={(i + 1) * 10} />
        ))}
      </g>

      <motion.g
        clipPath={`url(#${uid}-tile)`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.1 }}
      >
        {behind}
        {/* faint layer tint — deeper tint = higher ground, like the diorama */}
        {layerTint &&
          LEVELS.map((L, i) => (
            <path key={'t' + L} d={paths[i]} fillRule="evenodd" fill={layerTint} fillOpacity={0.045} />
          ))}
        {LEVELS.map((L, i) => (
          <path
            key={L}
            data-contour={L}
            d={paths[i]}
            fill="none"
            stroke={L === INDEX_LEVEL ? C.contourIndex : C.contour}
            strokeWidth={L === INDEX_LEVEL ? 0.55 : 0.32}
            strokeLinejoin="round"
          />
        ))}
        {inClip}
      </motion.g>
      <rect x={0} y={0} width={TW} height={TH} fill="none" stroke={C.hairline} strokeWidth={0.35} />
      {children}
    </svg>
  );
}
```
6. **Move `MapLabel` (lines 1129–1161)** verbatim and `export` it.
7. **Add `useIdlePrefetch`:**
```tsx
/** Runs each task once, one per idle slot, after mount — warms caches so a later switch is quick. */
export function useIdlePrefetch(tasks: readonly (() => void)[]) {
  useEffect(() => {
    let alive = true;
    const queue = [...tasks];
    const next = () => {
      const task = queue.shift();
      if (!alive || !task) return;
      task();
      schedule();
    };
    // Safari has no requestIdleCallback
    const idle = window.requestIdleCallback as ((cb: () => void) => number) | undefined;
    const schedule = () => (idle ? idle.call(window, next) : window.setTimeout(next, 120));
    schedule();
    return () => {
      alive = false;
    };
  }, [tasks]);
}
```
   `MapLabel` uses `Pt`, so keep it in the import.

- [ ] **Step 2: Shrink `LandformReality` and `LandformMap` to wrappers**

In `LandformsVisuals.tsx`:
1. Delete what moved in Step 1, i.e. lines 653–660, 754–825 and 1129–1161 (by original numbering), and the bodies being replaced below.
2. Replace `LandformReality` (lines 827–1017) with:
```tsx
const PREFETCH = (Object.keys(SPECS) as LandformId[]).map((f) => () => {
  getMorphMesh(getTerrain(f));
  getLandform(f);
});

export function LandformReality({ form, ariaLabel }: { form: LandformId; ariaLabel: string }) {
  const terrain = getTerrain(form);
  // key feature, draped on the ground once the block is in place
  const marks = useMemo(() => realityOverlays(form, getLandform(form), terrain), [form, terrain]);
  // Prepare the other landforms while the reader is idle, so switching is quick.
  useIdlePrefetch(PREFETCH);
  return <TerrainBlockView terrain={terrain} ariaLabel={ariaLabel} marks={marks} />;
}
```
3. Replace `LandformMap`'s body (lines 1210–1413) as follows:
   - Keep the signature.
   - Inside the `<ContourMapSheet>` children, keep **verbatim** the blocks from the original:
     - "key contour" (lines 1325–1339);
     - "elevation numbers" (lines 1341–1351);
     - "key feature" (lines 1353–1411).
```tsx
  const reduce = useReducedMotion();
  const lf = getLandform(form);
  const feat = FEATURES[form];
  const highlightRings = lf.spec.highlight ? (lf.rings.get(lf.spec.highlight) ?? []).filter(isInterior) : [];

  // Switching landforms: the contours reshape with the ground (useContourMorph).
  // The labels and key-feature marks wait until the new form has settled.
  const { paths, still, switched } = useContourMorph(lf);
  // first showing: the marks follow the contours' fade-in; after a switch they come right away
  const marks = { duration: reduce ? 0 : 0.3, delay: reduce || switched ? 0 : 0.45 };
  const marksIn = reduce ? false : { opacity: 0 };

  return (
    <ContourMapSheet
      ariaLabel={ariaLabel}
      paths={paths}
      inClip={
        still &&
        form === 'depression' && (
          <motion.path
            key={`hach-${form}`}
            initial={switched ? marksIn : false}
            animate={{ opacity: 1 }}
            transition={marks}
            d={lf.levels.map((L) => hachures(lf, L)).join('')}
            fill="none"
            stroke={C.contourIndex}
            strokeWidth={0.28}
            strokeLinecap="round"
          />
        )
      }
    >
      {/* original lines 1325–1411, verbatim */}
    </ContourMapSheet>
  );
```
   The trailing comment is an instruction. Paste the three blocks there.
4. Add the import, and remove now-unused React/framer imports such as `animate`, `cubicBezier`, `useLayoutEffect`, `useRef` and `useState`. `SlopeProfile` still needs `useId`, `motion` and `useReducedMotion`.
```ts
import { ContourMapSheet, MapLabel, TerrainBlockView, useContourMorph, useIdlePrefetch } from './terrainBlock';
```
5. Drop from the geometry import whatever is now unused, e.g. `REAL_*`, `pointsAttr`, `lerpArr`, `contourRings`, `Grid`, `ringsPath` and `identity`, if `highlightRings` still uses `ringsPath`/`identity`, keep those two. Let `tsc` confirm.

- [ ] **Step 3: Export `BoardView`**

In `LandformsScene.tsx` change `function BoardView({` to `export function BoardView({`. Make no other change.

- [ ] **Step 4: Type-check and pixel gate**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "terrainBlock|LandformsVisuals|LandformsScene|ReliefCover|reliefCover" || echo CLEAN
QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/after-3
node scripts/qa/shot-landforms-baseline.mjs --compare qa-output/landforms-extraction/before qa-output/landforms-extraction/after-3
```
Expected: `CLEAN`; 10 `same`, exit 0.
- The `.html` dumps normalize away `useId` strings and `data-contour`. Any other HTML difference is a regression even if pixels match, so diff them and fix it.
- Also click through the slope tabs on `#scene-landforms` once. They use `SlopeVisuals.tsx`, which is untouched, but the page must have no console errors.

- [ ] **Step 5: Commit**

```bash
git add -- src/components/lessons/topic-02/terrainBlock.tsx src/components/lessons/topic-02/LandformsVisuals.tsx src/components/lessons/topic-02/LandformsScene.tsx
git commit -m "refactor(topic-02): extract terrain-block view, contour morph and map sheet

LandformReality/LandformMap become thin wrappers; BoardView exported.
Pixel-identical landforms (10/10 same).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/lessons/topic-02/terrainBlock.tsx src/components/lessons/topic-02/LandformsVisuals.tsx src/components/lessons/topic-02/LandformsScene.tsx
```

---

### Task 4: Data module — hill, quarry, cover, flow (TDD)

**Files:**
- Create: `scripts/qa/relief-cover-compare.test.mjs`
- Create: `src/components/lessons/topic-02/reliefCoverCompare.data.ts`

**Interfaces:**
- Consumes: `BASE, C, PIT_ROCK, buildContours, buildTerrain, mix, type Contours, type HeightFn, type Terrain, type TerrainLook, type TerrainSpec` from `./terrainBlockGeometry`.
- Produces (exact names used by Tasks 5–7):
  - **States and answers:** `STATES` (`readonly ['bare','grove','built','quarry']`), `StateId`, `Answer = 'relief' | 'cover' | 'both'`, `ANSWERS: Answer[]`, `CORRECT: Record<'grove'|'built'|'quarry', Answer>`
  - **Flow:** `Flow`, `FlowAction`, `INITIAL_FLOW`, `flowReducer(s, a): Flow`, `isComplete(s): boolean`
  - **Cover types:** `Tree = { id; x; y; r; tone?: 0|1|2 }`, `House = { id; x; y; w; d; tall }`, `Cover = { grove: Tree[]; orchard: Tree[]; houses: House[] }`
  - **Geometry and cover:** `HILL`, `QUARRIED`, `QUARRY`, `quarryMask(x, y)`, `GROVE`, `ORCHARD`, `ORCHARD_PARCEL`, `HOUSES`, `COVER: Record<StateId, Cover>`
  - **Legend and chip:** `LegendKey`, `LEGEND: Record<StateId, LegendKey[]>`, `CHIP: Record<StateId, 'same' | 'changed' | null>`
  - **State cells:** `CellRef = { row: string; layer: 'relief' | 'cover'; part?: 0 | 1 }`, `STATE_CELLS: Record<StateId, CellRef[]>`, `splitExamples(cell): [string, string]`
  - **Lookups:** `terrainFor(s): Terrain`, `contoursFor(s): Contours`

- [ ] **Step 1: Write the failing tests**

`scripts/qa/relief-cover-compare.test.mjs`:
```js
// Geometry, cover, flow and content tests for topic-02 screen 3 „אותה גבעה, שלושה נופים”
// (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5, §7, §10.2).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/relief-cover-compare.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, TH, TW, isVisible, onBorder } from '../../src/components/lessons/topic-02/terrainBlockGeometry.ts';
import {
  ANSWERS, CHIP, CORRECT, COVER, GROVE, HILL, HOUSES, INITIAL_FLOW, LEGEND, ORCHARD, QUARRIED, QUARRY, STATES, STATE_CELLS,
  contoursFor, flowReducer, isComplete, quarryMask, splitExamples, terrainFor,
} from '../../src/components/lessons/topic-02/reliefCoverCompare.data.ts';

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} ≉ ${b}`);
const key = ([x, y]) => `${x.toFixed(9)},${y.toFixed(9)}`;
const vertexSet = (c, L) => new Set((c.rings.get(L) ?? []).flat().map(key));
/** The two grid nodes (STEP = 1) at the ends of the grid edge a marching-squares vertex lies on. */
function edgeNodes([x, y]) {
  const ix = Math.abs(x - Math.round(x)) < 1e-9;
  const iy = Math.abs(y - Math.round(y)) < 1e-9;
  if (ix && iy) return [[Math.round(x), Math.round(y)], [Math.round(x), Math.round(y)]];
  return ix
    ? [[Math.round(x), Math.floor(y)], [Math.round(x), Math.ceil(y)]]
    : [[Math.floor(x), Math.round(y)], [Math.ceil(x), Math.round(y)]];
}
const changed = ([x, y]) => HILL(x, y) !== QUARRIED(x, y);

test('states 1–3 share one terrain and one contour set; the quarry has its own', () => {
  assert.equal(contoursFor('grove'), contoursFor('bare'));
  assert.equal(contoursFor('built'), contoursFor('bare'));
  assert.equal(terrainFor('grove'), terrainFor('bare'));
  assert.equal(terrainFor('built'), terrainFor('bare'));
  assert.notEqual(contoursFor('quarry'), contoursFor('built'));
  assert.notEqual(terrainFor('quarry'), terrainFor('built'));
  for (const L of LEVELS) {
    const rings = contoursFor('bare').rings.get(L) ?? [];
    assert.ok(rings.length > 0, `the hill has a ${L} m contour`);
    assert.ok(rings.flat().every((p) => !onBorder(p)), `the ${L} m contour closes inside the tile`);
  }
});

test('quarrying changes heights only where the mask is > 0 — its transition band included', () => {
  let inside = 0;
  let band = 0;
  for (let x = 0; x <= TW; x += 0.25) {
    for (let y = 0; y <= TH; y += 0.25) {
      const w = quarryMask(x, y);
      const d = HILL(x, y) - QUARRIED(x, y);
      assert.ok(d >= 0, `quarrying never raises ground (${x}, ${y})`);
      if (w === 0) assert.equal(d, 0, `ground outside the mask unchanged at (${x}, ${y})`);
      else if (d > 1e-9) {
        inside++;
        if (w < 1) band++;
      }
    }
  }
  assert.ok(inside > 100, `the cut lowers a real area (${inside} samples)`);
  assert.ok(band > 0, `the transition band changes height too (${band} samples)`);
  for (const [x, y] of [[50, 30], [47, 32], [52, 34]]) {
    assert.equal(quarryMask(x, y), 1, `(${x}, ${y}) fully inside the mask`);
    assert.ok(HILL(x, y) > QUARRY.floor, `(${x}, ${y}) was above the floor level`);
    close(QUARRIED(x, y), QUARRY.floor, 1e-9, `(${x}, ${y}) is cut down to the floor`);
  }
});

test('contours change only on grid edges that touch changed ground inside the mask', () => {
  const a = contoursFor('built');
  const b = contoursFor('quarry');
  let moved = 0;
  for (const L of LEVELS) {
    for (const [from, other] of [[a, vertexSet(b, L)], [b, vertexSet(a, L)]]) {
      for (const p of (from.rings.get(L) ?? []).flat()) {
        if (onBorder(p) || other.has(key(p))) continue;
        moved++;
        const nodes = edgeNodes(p);
        assert.ok(nodes.some(changed), `${L} m vertex (${p}) moved although its grid edge kept its heights`);
        assert.ok(nodes.some(([x, y]) => quarryMask(x, y) > 0), `${L} m vertex (${p}) moved outside the quarry mask`);
      }
    }
  }
  assert.ok(moved > 0, 'at least one contour changed');
});

test('quarry contours are traced from the quarried surface', () => {
  let worst = 0;
  for (const L of LEVELS) {
    for (const p of (contoursFor('quarry').rings.get(L) ?? []).flat()) {
      if (onBorder(p)) continue;
      const [n1, n2] = edgeNodes(p);
      const v1 = QUARRIED(n1[0], n1[1]);
      const v2 = QUARRIED(n2[0], n2[1]);
      assert.ok(Math.min(v1, v2) <= L && L <= Math.max(v1, v2), `${L} m vertex (${p}) sits on an edge the quarried surface crosses`);
      worst = Math.max(worst, Math.abs(QUARRIED(p[0], p[1]) - L));
    }
  }
  assert.ok(worst <= 5, `interpolation error under half a contour interval (worst ${worst.toFixed(2)} m)`);
});

test('the cut faces the camera: most of its floor is visible on the block', () => {
  const t = terrainFor('quarry');
  let n = 0;
  let seen = 0;
  for (let x = QUARRY.x0 + 2; x <= QUARRY.x1 - 2; x += 0.5) {
    for (let y = QUARRY.y0 + 2; y <= QUARRY.y1 - 2; y += 0.5) {
      if (HILL(x, y) - QUARRY.floor < 2) continue; // floor = where ground was really cut down
      n++;
      if (isVisible(t, x, y)) seen++;
    }
  }
  assert.ok(n > 20 && seen / n >= 0.6, `visible cut floor ${seen}/${n}`);
});

test('objects outside the cut keep their ground; the cut takes orchard trees with it', () => {
  const tb = terrainFor('built');
  const tq = terrainFor('quarry');
  const pts = [
    ...COVER.quarry.orchard.map((t) => [t.x, t.y]),
    ...COVER.quarry.houses.flatMap((h) => [
      [h.x - h.w / 2, h.y - h.d / 2], [h.x + h.w / 2, h.y - h.d / 2], [h.x + h.w / 2, h.y + h.d / 2], [h.x - h.w / 2, h.y + h.d / 2],
    ]),
  ];
  for (const [x, y] of pts) {
    assert.equal(QUARRIED(x, y), HILL(x, y), `ground under (${x}, ${y}) unchanged`);
    assert.deepEqual(tq.at(x, y), tb.at(x, y), `(${x}, ${y}) stays put on screen through the morph`);
  }
  const removed = ORCHARD.filter((t) => !COVER.quarry.orchard.includes(t));
  assert.ok(removed.length >= 4, `the quarry removes orchard trees (${removed.length})`);
  for (const t of removed) assert.ok(quarryMask(t.x, t.y) >= 0.5, `removed tree ${t.id} lies inside the mapped quarry area`);
  for (const t of COVER.quarry.orchard) assert.equal(quarryMask(t.x, t.y), 0, `kept tree ${t.id} is outside the cut`);
  assert.equal(COVER.quarry.houses, COVER.built.houses);
});

test('cover per state: bare → natural grove → buildings and orchard → quarry', () => {
  assert.deepEqual(COVER.bare, { grove: [], orchard: [], houses: [] });
  assert.ok(COVER.grove.grove.length >= 20 && !COVER.grove.orchard.length && !COVER.grove.houses.length);
  assert.ok(!COVER.built.grove.length && COVER.built.orchard === ORCHARD && COVER.built.houses === HOUSES);
  assert.ok(!COVER.quarry.grove.length);
  for (const t of GROVE) {
    assert.ok(t.x > 1 && t.x < TW - 1 && t.y > 1 && t.y < TH - 1, `grove tree ${t.id} on the tile`);
    assert.ok(HILL(t.x, t.y) >= 105, `grove tree ${t.id} grows on the hill (${HILL(t.x, t.y).toFixed(1)} m)`);
  }
  for (const h of HOUSES) assert.ok(HILL(h.x, h.y) < 103, `house ${h.id} stands on the plain`);
  for (const h of HOUSES) for (const t of ORCHARD) assert.ok(Math.hypot(h.x - t.x, h.y - t.y) > 3, `house ${h.id} clear of ${t.id}`);
  // natural = irregular, planted = orderly (spec §6)
  const gaps = (ts) => ts.map((a) => Math.min(...ts.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
  const spread = (v) => Math.max(...v) - Math.min(...v);
  assert.ok(spread(gaps(ORCHARD)) < 1e-9, 'orchard trees sit at one fixed spacing');
  assert.ok(spread(gaps(GROVE)) > 0.5, 'grove spacing varies');
  assert.ok(new Set(GROVE.map((t) => t.r.toFixed(2))).size > 5, 'grove crowns vary in size');
  assert.equal(new Set(ORCHARD.map((t) => t.r)).size, 1, 'orchard crowns match');
});

test('legend and chip follow the state', () => {
  assert.deepEqual(CHIP, { bare: null, grove: 'same', built: 'same', quarry: 'changed' });
  for (const s of STATES) {
    const k = LEGEND[s];
    assert.ok(k.includes('contour') && k.includes('index'), `${s}: contour entries always`);
    assert.equal(k.includes('grove'), COVER[s].grove.length > 0, `${s}: grove entry iff grove`);
    assert.equal(k.includes('orchard'), COVER[s].orchard.length > 0, `${s}: orchard entry iff orchard`);
    assert.equal(k.includes('houses'), COVER[s].houses.length > 0, `${s}: houses entry iff houses`);
    assert.equal(k.includes('quarry'), s === 'quarry');
    assert.equal(k.includes('before'), s === 'quarry');
  }
});

test('answers: grove and buildings change land cover only; the quarry changes both', () => {
  assert.deepEqual(ANSWERS, ['relief', 'cover', 'both']);
  assert.deepEqual(CORRECT, { grove: 'cover', built: 'cover', quarry: 'both' });
});

test('flow: forward only through a prediction; wrong answers advance; revisit; reset', () => {
  let s = INITIAL_FLOW;
  assert.equal(flowReducer(s, { type: 'predict', answer: 'cover' }), s, 'no prediction before "המשך"');
  assert.equal(flowReducer(s, { type: 'view', index: 1 }), s, 'an unreached state is locked');
  s = flowReducer(s, { type: 'continue' });
  assert.equal(s.asking, true);
  s = flowReducer(s, { type: 'predict', answer: 'relief' }); // wrong on purpose
  assert.deepEqual(s, { reached: 1, view: 1, answers: { grove: 'relief' }, asking: false });
  s = flowReducer(flowReducer(s, { type: 'continue' }), { type: 'predict', answer: 'cover' });
  s = flowReducer(flowReducer(s, { type: 'continue' }), { type: 'predict', answer: 'both' });
  assert.equal(isComplete(s), true);
  assert.equal(flowReducer(s, { type: 'continue' }), s, 'nothing after the last state');
  const back = flowReducer(s, { type: 'view', index: 1 });
  assert.equal(back.view, 1);
  assert.equal(back.answers.grove, 'relief', 'a revisited state keeps its prediction');
  assert.equal(flowReducer(back, { type: 'continue' }), back, 'no question away from the frontier');
  assert.equal(flowReducer(back, { type: 'view', index: 1 }), back, 'same view is a no-op');
  assert.deepEqual(flowReducer(back, { type: 'reset' }), INITIAL_FLOW);
});

test('state cards: every comparison cell shows once; cover "דוגמאות" in two parts', () => {
  const LABELS = ['הגדרה', 'דוגמאות', 'אופן הסיווג', 'קצב השינוי', 'הייצוג במפה'];
  const seen = STATES.flatMap((s) => STATE_CELLS[s]).map((c) => `${c.row}|${c.layer}|${c.part ?? '-'}`);
  const expected = LABELS.flatMap((l) =>
    ['relief', 'cover'].flatMap((layer) =>
      l === 'דוגמאות' && layer === 'cover' ? [`${l}|${layer}|0`, `${l}|${layer}|1`] : [`${l}|${layer}|-`],
    ),
  );
  assert.deepEqual([...seen].sort(), [...expected].sort());
  assert.deepEqual(STATE_CELLS.quarry, [{ row: 'קצב השינוי', layer: 'relief' }], 'the relief rate-of-change caveat lands with the quarry');
});

test('splitExamples splits at the one " · " and joins back exactly', () => {
  const cell = 'עצים, שיחים ועשב · בתים, כבישים, שדות, מטעים, גדרות וקווי חשמל.';
  const [a, b] = splitExamples(cell);
  assert.equal(a, 'עצים, שיחים ועשב');
  assert.equal(b, 'בתים, כבישים, שדות, מטעים, גדרות וקווי חשמל.');
  assert.equal(`${a} · ${b}`, cell);
  assert.throws(() => splitExamples('ללא מפריד'));
  assert.throws(() => splitExamples('א · ב · ג'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/relief-cover-compare.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `reliefCoverCompare.data.ts`.

- [ ] **Step 3: Implement `reliefCoverCompare.data.ts`**

```ts
/**
 * „אותה גבעה, שלושה נופים” — the one terrain behind screen 3 of ReliefCoverIntroScene
 * (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5–§7).
 * The hill, the quarry cut into it, the land cover of every state and the
 * predict → reveal flow. States 1–3 share ONE height function, so their block and
 * contours are literally the same objects; the quarry is a second height function
 * that differs only where the quarry mask is > 0.
 * Pure TS, no React: scripts/qa/relief-cover-compare.test.mjs imports it.
 */
import {
  BASE, C, PIT_ROCK, buildContours, buildTerrain, mix,
  type Contours, type HeightFn, type Terrain, type TerrainLook, type TerrainSpec,
} from './terrainBlockGeometry';

/* ── States and the predict → reveal flow ─────────────────────────────────── */

export const STATES = ['bare', 'grove', 'built', 'quarry'] as const;
export type StateId = (typeof STATES)[number];
export type Answer = 'relief' | 'cover' | 'both';
export const ANSWERS: Answer[] = ['relief', 'cover', 'both'];
/** What really changes on the way INTO each state. */
export const CORRECT: Record<Exclude<StateId, 'bare'>, Answer> = { grove: 'cover', built: 'cover', quarry: 'both' };

export type Flow = {
  reached: number; // furthest state index reached
  view: number; // state index on screen
  answers: Partial<Record<StateId, Answer>>; // the prediction that led INTO each state
  asking: boolean; // the next prediction is open ("המשך" pressed)
};
export type FlowAction =
  | { type: 'continue' }
  | { type: 'predict'; answer: Answer }
  | { type: 'view'; index: number }
  | { type: 'reset' };

export const INITIAL_FLOW: Flow = { reached: 0, view: 0, answers: {}, asking: false };
const LAST = STATES.length - 1;

export function flowReducer(s: Flow, a: FlowAction): Flow {
  switch (a.type) {
    case 'continue':
      return s.view === s.reached && s.reached < LAST && !s.asking ? { ...s, asking: true } : s;
    case 'predict': {
      if (!s.asking || s.view !== s.reached || s.reached >= LAST) return s;
      const next = s.reached + 1;
      return { reached: next, view: next, answers: { ...s.answers, [STATES[next]]: a.answer }, asking: false };
    }
    case 'view':
      return Number.isInteger(a.index) && a.index >= 0 && a.index <= s.reached && a.index !== s.view
        ? { ...s, view: a.index, asking: false }
        : s;
    case 'reset':
      return INITIAL_FLOW;
  }
}

export const isComplete = (s: Flow) => s.reached === LAST;

/* ── Which comparison cells each state card shows (spec §5) ──────────────── */

export type CellRef = { row: string; layer: 'relief' | 'cover'; part?: 0 | 1 };
/** Row labels are COMPARE_ROWS' own labels (ReliefCoverIntroScene); part = half of the split "דוגמאות" cell. */
export const STATE_CELLS: Record<StateId, CellRef[]> = {
  bare: [
    { row: 'הגדרה', layer: 'relief' },
    { row: 'דוגמאות', layer: 'relief' },
    { row: 'אופן הסיווג', layer: 'relief' },
    { row: 'הייצוג במפה', layer: 'relief' },
  ],
  grove: [
    { row: 'הגדרה', layer: 'cover' },
    { row: 'הייצוג במפה', layer: 'cover' },
    { row: 'דוגמאות', layer: 'cover', part: 0 },
  ],
  built: [
    { row: 'דוגמאות', layer: 'cover', part: 1 },
    { row: 'אופן הסיווג', layer: 'cover' },
    { row: 'קצב השינוי', layer: 'cover' },
  ],
  quarry: [{ row: 'קצב השינוי', layer: 'relief' }],
};

/** Display-only split of the cover "דוגמאות" cell at its own " · " (natural part, artificial part). */
export function splitExamples(cell: string): [string, string] {
  const i = cell.indexOf(' · ');
  if (i < 0 || cell.indexOf(' · ', i + 3) >= 0) throw new Error(`splitExamples: expected exactly one " · " in "${cell}"`);
  return [cell.slice(0, i), cell.slice(i + 3)];
}

/* ── The hill and the quarry ─────────────────────────────────────────────── */

const E = Math.exp;

/** One rounded hill (~166 m) west of centre; the eastern strip stays plain for the village. */
export const HILL: HeightFn = (x, y) => {
  const dx = (x - 40) / 20;
  const dy = (y - 24) / 12;
  const th = Math.atan2(dy, dx);
  const r2 = (dx * dx + dy * dy) * (1 + 0.07 * Math.sin(2 * th + 0.9) + 0.04 * Math.cos(3 * th - 0.3));
  return BASE + 66 * E(-0.85 * r2);
};

/** The quarry: a notch in the hill's south flank (the side facing the camera), open downhill.
 *  x0–x1 × y0–y1 is the mask's outer edge; `band` is the soft transition just inside it. */
export const QUARRY = { x0: 44, x1: 56, y0: 28.5, y1: 46, band: 1.5, floor: 120 } as const;

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** 1 inside the cut, 0 outside, easing over QUARRY.band map units just inside its edge. */
export function quarryMask(x: number, y: number): number {
  const { x0, x1, y0, y1, band } = QUARRY;
  const e = (d: number) => smooth(d / band);
  return e(x - x0) * e(x1 - x) * e(y - y0) * e(y1 - y);
}

/** The same hill after quarrying: inside the mask, ground above the floor level is cut down to it. */
export const QUARRIED: HeightFn = (x, y) => {
  const h = HILL(x, y);
  return h - quarryMask(x, y) * Math.max(0, h - QUARRY.floor);
};

/* ── Land cover ──────────────────────────────────────────────────────────── */

export type Tree = { id: string; x: number; y: number; r: number; tone?: 0 | 1 | 2 }; // r: crown radius, screen units
export type House = { id: string; x: number; y: number; w: number; d: number; tall: number }; // tall: screen units
export type Cover = { grove: Tree[]; orchard: Tree[]; houses: House[] };

/** Deterministic PRNG (mulberry32): the grove is irregular, but the same on every load. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Natural grove: clumps of crowns of mixed size at irregular spacing, on the hill's slopes. */
const CLUMPS: [number, number, number][] = [
  // centre x, centre y, trees
  [29, 19, 6], [45, 15, 5], [27, 31, 5], [39, 33, 6], [53, 26, 5], [36, 10, 4], [19, 24, 3],
];
export const GROVE: Tree[] = (() => {
  const rand = rng(11);
  const out: Tree[] = [];
  for (const [cx, cy, n] of CLUMPS) {
    let placed = 0;
    for (let tries = 0; placed < n && tries < 400; tries++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 4.2;
      const x = cx + Math.cos(a) * d * 1.3; // a little wider E–W, like the hill
      const y = cy + Math.sin(a) * d * 0.8;
      if (out.some((t) => Math.hypot(t.x - x, t.y - y) < 1.9)) continue;
      out.push({ id: `g${out.length}`, x, y, r: 1.1 + rand() * 0.8, tone: Math.floor(rand() * 3) as 0 | 1 | 2 });
      placed++;
    }
  }
  return out;
})();

/** Orchard: identical trees in straight rows at a fixed 3-unit spacing, on the lower south flank
 *  and its foot. The two western columns stand where the quarry will be cut. */
export const ORCHARD: Tree[] = Array.from({ length: 9 * 5 }, (_, i) => {
  const col = i % 9;
  const row = Math.floor(i / 9);
  return { id: `o${row}-${col}`, x: 50 + col * 3, y: 33 + row * 3, r: 1.05 };
});
/** The orchard's parcel on the map (plan units). */
export const ORCHARD_PARCEL = { x0: 48.5, y0: 31.5, x1: 75.5, y1: 46.5 } as const;

/** Village: small flat-roofed houses on the eastern plain. */
export const HOUSES: House[] = [
  { id: 'h1', x: 80, y: 13, w: 3.2, d: 2.6, tall: 2.4 },
  { id: 'h2', x: 86.5, y: 11, w: 2.8, d: 2.4, tall: 2.0 },
  { id: 'h3', x: 93, y: 14, w: 3.4, d: 2.8, tall: 2.6 },
  { id: 'h4', x: 82, y: 21, w: 2.8, d: 2.4, tall: 2.2 },
  { id: 'h5', x: 89, y: 22, w: 3.2, d: 2.6, tall: 2.8 },
  { id: 'h6', x: 95, y: 27, w: 2.6, d: 2.2, tall: 2.0 },
  { id: 'h7', x: 84, y: 29, w: 3.0, d: 2.4, tall: 2.4 },
];

export const COVER: Record<StateId, Cover> = {
  bare: { grove: [], orchard: [], houses: [] },
  grove: { grove: GROVE, orchard: [], houses: [] },
  built: { grove: [], orchard: ORCHARD, houses: HOUSES },
  // the cut takes every orchard tree in the quarry area (its transition band included)
  quarry: { grove: [], orchard: ORCHARD.filter((t) => quarryMask(t.x, t.y) === 0), houses: HOUSES },
};

/* ── Map key and contour chip ────────────────────────────────────────────── */

export type LegendKey = 'contour' | 'index' | 'grove' | 'orchard' | 'houses' | 'quarry' | 'before';
export const LEGEND: Record<StateId, LegendKey[]> = {
  bare: ['contour', 'index'],
  grove: ['contour', 'index', 'grove'],
  built: ['contour', 'index', 'orchard', 'houses'],
  quarry: ['contour', 'index', 'orchard', 'houses', 'quarry', 'before'],
};
/** The chip on the map: did the contours change on the way into this state? */
export const CHIP: Record<StateId, 'same' | 'changed' | null> = { bare: null, grove: 'same', built: 'same', quarry: 'changed' };

/* ── The block's look and the per-state terrain / contours ───────────────── */

// Bare earth — mixes of the existing illustration palette only, no green: inside
// this illustration green always means vegetation (spec §6).
const EARTH_RAMP: [number, string][] = [
  [0, mix(C.rim, C.paperEdge, 0.45)],
  [0.5, mix(C.rim, C.paperEdge, 0.15)],
  [1, mix(C.contour, C.rim, 0.5)],
];
// The quarry site (cut faces, floor and yard) in the engine's bare-rock tone.
const quarryTint: NonNullable<TerrainLook['tint']> = (col, q) => {
  const w = quarryMask(q.x, q.y);
  return w > 0 ? mix(col, PIT_ROCK, 0.85 * w) : col;
};
const KZ = 0.28; // the landforms hill's vertical exaggeration
export const HILL_SPEC: TerrainSpec = { h: HILL, kz: KZ, look: { ramp: EARTH_RAMP } };
export const QUARRY_SPEC: TerrainSpec = { h: QUARRIED, kz: KZ, look: { ramp: EARTH_RAMP, tint: quarryTint } };

export const terrainFor = (s: StateId): Terrain => buildTerrain(s === 'quarry' ? QUARRY_SPEC : HILL_SPEC);
export const contoursFor = (s: StateId): Contours => buildContours(s === 'quarry' ? QUARRIED : HILL);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/relief-cover-compare.test.mjs`
Expected: all 12 tests pass.

If a geometry test fails, tune the **data**, never the assertion:
- **"visible cut floor":** move `QUARRY.x0`/`x1` west by 1–3 units together.
- **"grove on the hill":** pull the offending `CLUMPS` centre toward (40, 24).
- **"removed tree inside the mapped area":** shift `ORCHARD`'s first column (`50`) so the removed trees sit ≥ 1 unit inside the mask edge.
- Record any change for the Task 9 assumptions entry.

- [ ] **Step 5: Type-check and commit**

Run the Global Constraints type check. Expected: `CLEAN`.
```bash
git add -- src/components/lessons/topic-02/reliefCoverCompare.data.ts scripts/qa/relief-cover-compare.test.mjs
git commit -m "feat(topic-02): relief/cover comparison data — hill, quarry cut, cover per state, flow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/lessons/topic-02/reliefCoverCompare.data.ts scripts/qa/relief-cover-compare.test.mjs
```

---

### Task 5: The two boards — `ReliefCoverVisuals.tsx`

**Files:**
- Create: `src/components/lessons/topic-02/ReliefCoverVisuals.tsx`

**Interfaces:**
- Consumes: Tasks 2–4 exports.
- Produces:
  - `ReliefCoverBlock({ state: StateId; ariaLabel: string })`
  - `ReliefCoverMap({ state: StateId; ariaLabel: string })`
  - `LegendSwatch({ k: LegendKey })`

- [ ] **Step 1: Write the component file**

```tsx
'use client';

/**
 * ReliefCoverVisuals — the two boards of „אותה גבעה, שלושה נופים” (screen 3 of
 * ReliefCoverIntroScene; spec §6). Both come from reliefCoverCompare.data:
 *   - ReliefCoverBlock: the papercut block; trees and houses stand on the ground
 *     (terrain.at), painted back to front, hidden behind the hill (isVisible). On a
 *     cover change only the objects move; on the quarry the ground itself morphs.
 *   - ReliefCoverMap: the same tile from above; contours from the same height
 *     function, cover as schematic symbols, the pre-quarry contours dashed.
 * Inside this illustration green = vegetation only. Never mirrored for RTL; every
 * <text> sets textAnchor (MapLabel does).
 */

import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  C, LEVELS, PIT_ROCK, contourRings, f2, getMorphMesh, identity, isVisible, mix, nearestOnLevel, ringsPath, sampleGrid,
  type Pt, type Terrain,
} from './terrainBlockGeometry';
import { ContourMapSheet, MapLabel, TerrainBlockView, useContourMorph, useIdlePrefetch } from './terrainBlock';
import {
  COVER, HILL, ORCHARD_PARCEL, QUARRY, contoursFor, quarryMask, terrainFor,
  type House, type LegendKey, type StateId, type Tree,
} from './reliefCoverCompare.data';

const EASE = [0.22, 1, 0.36, 1] as const;
const CROWNS = [C.greenDeep, C.greenMid, C.greenLight] as const;

/* ── "בשטח" — objects on the block ───────────────────────────────────────── */

const TRUNK = 0.8; // screen units

function TreeArt({ base, r, fill }: { base: Pt; r: number; fill: string }) {
  const [x, y] = base;
  const cy = y - TRUNK - r * 0.85;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r * 0.8} ry={r * 0.28} fill={C.ink} opacity={0.18} />
      <line x1={x} y1={y} x2={x} y2={cy} stroke={C.contourIndex} strokeWidth={0.32} strokeLinecap="round" />
      <circle cx={x} cy={cy} r={r} fill={fill} />
      {/* lit from the front-left, like the block's hill-shading */}
      <circle cx={x - r * 0.3} cy={cy - r * 0.3} r={r * 0.45} fill={mix(fill, '#FFFFFF', 0.22)} />
    </g>
  );
}

/** A flat-roofed papercut box: lit south wall, shaded east wall, roof on top. */
function HouseArt({ t, h }: { t: Terrain; h: House }) {
  const { x, y, w, d, tall } = h;
  const sw = t.at(x - w / 2, y + d / 2);
  const se = t.at(x + w / 2, y + d / 2);
  const ne = t.at(x + w / 2, y - d / 2);
  const nw = t.at(x - w / 2, y - d / 2);
  const up = (p: Pt): Pt => [p[0], p[1] - tall];
  const pts = (ps: Pt[]) => ps.map(([a, b]) => `${f2(a)},${f2(b)}`).join(' ');
  return (
    <g strokeLinejoin="round">
      <polygon points={pts([sw, se, up(se), up(sw)])} fill={C.paper} stroke={C.paperEdge} strokeWidth={0.12} />
      <polygon points={pts([se, ne, up(ne), up(se)])} fill={C.paperEdge} stroke={C.paperEdge} strokeWidth={0.12} />
      <polygon points={pts([up(sw), up(se), up(ne), up(nw)])} fill={C.contourIndex} />
    </g>
  );
}

type Placed = { key: string; y: number; node: ReactNode };

function placeCover(t: Terrain, state: StateId): Placed[] {
  const c = COVER[state];
  const out: Placed[] = [];
  const tree = (tr: Tree, fill: string) => {
    if (!isVisible(t, tr.x, tr.y)) return;
    const base = t.at(tr.x, tr.y);
    out.push({ key: tr.id, y: base[1], node: <TreeArt base={base} r={tr.r} fill={fill} /> });
  };
  for (const tr of c.grove) tree(tr, CROWNS[tr.tone ?? 0]);
  for (const tr of c.orchard) tree(tr, C.greenMid);
  for (const h of c.houses) {
    if (!isVisible(t, h.x, h.y)) continue;
    out.push({ key: h.id, y: t.at(h.x, h.y + h.d / 2)[1], node: <HouseArt t={t} h={h} /> });
  }
  return out.sort((a, b) => a.y - b.y); // painter's order: far → near
}

// Ready the quarry's morph mesh and contours while the reader is idle.
const PREFETCH = [() => void getMorphMesh(terrainFor('quarry')), () => void contoursFor('quarry')];

export function ReliefCoverBlock({ state, ariaLabel }: { state: StateId; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const terrain = terrainFor(state);
  const placed = useMemo(() => placeCover(terrain, state), [terrain, state]);
  useIdlePrefetch(PREFETCH);
  return (
    <TerrainBlockView
      terrain={terrain}
      ariaLabel={ariaLabel}
      objects={
        <AnimatePresence initial={false}>
          {placed.map((p, i) => (
            <motion.g
              key={p.key}
              initial={reduce ? false : { opacity: 0, scale: 0.3 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: reduce ? 0 : 0.45, ease: EASE, delay: reduce ? 0 : Math.min(0.5, i * 0.012) },
              }}
              exit={{ opacity: 0, y: reduce ? 0 : 1.2, transition: { duration: reduce ? 0 : 0.35, ease: EASE } }}
              style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
            >
              {p.node}
            </motion.g>
          ))}
        </AnimatePresence>
      }
    />
  );
}

/* ── "במפה" — contours and schematic land-cover symbols ──────────────────── */

const MAP_NUMBERS: { level: number; at: Pt }[] = [
  { level: 150, at: [27, 18] },
  { level: 110, at: [11, 26] },
];

// The pre-quarry contours, drawn dashed under the quarry state's lines.
const BEFORE_PATHS = LEVELS.map((L) => ringsPath(contoursFor('bare').rings.get(L) ?? [], identity));

// Quarry site on the map = mask ≥ 0.5; short ticks along its cut faces, pointing into the cut.
const QUARRY_AREA = (() => {
  const rings = contourRings(sampleGrid(quarryMask), 0.5);
  const ticks: string[] = [];
  for (const ring of rings) {
    let acc = 0;
    for (let i = 1; i <= ring.length; i++) {
      const a = ring[i - 1];
      const b = ring[i % ring.length];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc < 1.6) continue;
      acc = 0;
      if (HILL(b[0], b[1]) - QUARRY.floor < 3) continue; // faces only, not the open front
      const e = 0.3;
      const gx = (quarryMask(b[0] + e, b[1]) - quarryMask(b[0] - e, b[1])) / (2 * e);
      const gy = (quarryMask(b[0], b[1] + e) - quarryMask(b[0], b[1] - e)) / (2 * e);
      const g = Math.hypot(gx, gy) || 1;
      ticks.push(`M${f2(b[0])},${f2(b[1])}L${f2(b[0] + (gx / g) * 1.1)},${f2(b[1] + (gy / g) * 1.1)}`);
    }
  }
  return { d: ringsPath(rings, identity), ticks: ticks.join('') };
})();

export function ReliefCoverMap({ state, ariaLabel }: { state: StateId; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const contours = contoursFor(state);
  const { paths, still } = useContourMorph(contours);
  const c = COVER[state];
  const quarry = state === 'quarry';
  const fade = {
    initial: reduce ? false : { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduce ? 0 : 0.4, ease: EASE },
  } as const;
  const P = ORCHARD_PARCEL;

  return (
    <ContourMapSheet
      ariaLabel={ariaLabel}
      paths={paths}
      layerTint={C.contour}
      behind={
        <AnimatePresence initial={false}>
          {c.grove.length > 0 && (
            <motion.g key="grove-tint" {...fade}>
              <g opacity={0.3} fill={C.greenLight}>
                {c.grove.map((t) => (
                  <circle key={t.id} cx={t.x} cy={t.y} r={2.3} />
                ))}
              </g>
            </motion.g>
          )}
          {c.orchard.length > 0 && (
            <motion.rect
              key="orchard-parcel"
              {...fade}
              x={P.x0}
              y={P.y0}
              width={P.x1 - P.x0}
              height={P.y1 - P.y0}
              fill={C.greenLight}
              fillOpacity={0.22}
              stroke={C.greenMid}
              strokeOpacity={0.5}
              strokeWidth={0.2}
            />
          )}
          {quarry && (
            <motion.g key="quarry" {...fade}>
              <path d={QUARRY_AREA.d} fill={PIT_ROCK} fillOpacity={0.55} />
              {/* the previous state's contours — dashed; hidden wherever the new line lies on them */}
              <g fill="none" stroke={C.contourIndex} strokeOpacity={0.6} strokeWidth={0.3} strokeDasharray="0.8 0.6">
                {BEFORE_PATHS.map((d, i) => (
                  <path key={LEVELS[i]} d={d} />
                ))}
              </g>
            </motion.g>
          )}
        </AnimatePresence>
      }
      inClip={
        <AnimatePresence initial={false}>
          {c.grove.map((t) => (
            <motion.circle key={'g' + t.id} {...fade} cx={t.x} cy={t.y} r={0.6} fill={C.greenDeep} />
          ))}
          {c.orchard.map((t) => (
            <motion.circle key={'o' + t.id} {...fade} cx={t.x} cy={t.y} r={0.5} fill={C.greenDeep} />
          ))}
          {c.houses.map((h) => (
            <motion.rect key={'h' + h.id} {...fade} x={h.x - h.w / 2} y={h.y - h.d / 2} width={h.w} height={h.d} fill={C.ink} />
          ))}
          {quarry && (
            <motion.path
              key="quarry-ticks"
              {...fade}
              d={QUARRY_AREA.ticks}
              fill="none"
              stroke={C.contourIndex}
              strokeWidth={0.3}
              strokeLinecap="round"
            />
          )}
        </AnimatePresence>
      }
    >
      {/* elevation numbers on the lines (metres), once the contours have settled */}
      {still &&
        MAP_NUMBERS.map(({ level, at }) => {
          const p = nearestOnLevel(contours, level, at);
          return p ? <MapLabel key={level} at={p} text={String(level)} fill={C.contourIndex} size={2.3} charW={0.62} /> : null;
        })}
    </ContourMapSheet>
  );
}

/* ── Legend swatches (HTML legend in ReliefCoverCompare) ─────────────────── */

const ARC = 'M1,7 C5,2 11,2 15,7';

export function LegendSwatch({ k }: { k: LegendKey }) {
  return (
    <svg viewBox="0 0 16 10" className="h-3 w-5 shrink-0" aria-hidden>
      {k === 'contour' && <path d={ARC} fill="none" stroke={C.contour} strokeWidth={1.1} />}
      {k === 'index' && <path d={ARC} fill="none" stroke={C.contourIndex} strokeWidth={1.8} />}
      {k === 'before' && (
        <path d={ARC} fill="none" stroke={C.contourIndex} strokeOpacity={0.6} strokeWidth={1.1} strokeDasharray="2 1.5" />
      )}
      {k === 'grove' && (
        <>
          <g opacity={0.3} fill={C.greenLight}>
            <circle cx={6} cy={5} r={4} />
            <circle cx={11} cy={4.5} r={3.6} />
          </g>
          <g fill={C.greenDeep}>
            <circle cx={4.5} cy={4} r={1} />
            <circle cx={8.2} cy={6.4} r={1} />
            <circle cx={12} cy={3.6} r={1} />
          </g>
        </>
      )}
      {k === 'orchard' && (
        <>
          <rect x={1} y={1} width={14} height={8} fill={C.greenLight} fillOpacity={0.22} stroke={C.greenMid} strokeOpacity={0.5} strokeWidth={0.5} />
          <g fill={C.greenDeep}>
            {[4, 8, 12].flatMap((x) => [3.5, 6.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} />))}
          </g>
        </>
      )}
      {k === 'houses' && <rect x={5} y={2.5} width={6} height={5} fill={C.ink} />}
      {k === 'quarry' && (
        <>
          <rect x={1} y={2} width={14} height={6} fill={PIT_ROCK} fillOpacity={0.55} />
          <path d="M3,2 V4 M6,2 V4 M9,2 V4 M12,2 V4" stroke={C.contourIndex} strokeWidth={0.8} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
```

- [ ] **Step 2: Type-check and run the tests**

Run the type check (expected: `CLEAN`) and the unit tests (expected: all pass).

- [ ] **Step 3: Commit**

```bash
git add -- src/components/lessons/topic-02/ReliefCoverVisuals.tsx
git commit -m "feat(topic-02): relief/cover boards — objects on the block, symbols on the map

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/lessons/topic-02/ReliefCoverVisuals.tsx
```

---

### Task 6: The flow component and the screen-3 swap

**Files:**
- Create: `src/components/lessons/topic-02/ReliefCoverCompare.tsx`
- Modify: `src/components/lessons/topic-02/ReliefCoverIntroScene.tsx`. Screen 3 is lines 269–285; `CompareHead` is lines 361–368. Also add the `COMPARE_COPY` constant and an import.
- Modify: `scripts/qa/relief-cover-compare.test.mjs` (content-lock tests)

**Interfaces:**
- Consumes: Tasks 3–5 exports; `BoardView` from `./LandformsScene`; `Icon` from `@/components/Icon` (names `check`, `x`, `refresh`).
- Produces: `ReliefCoverCompare({ rows: CompareRow[]; copy: ReliefCoverCopy })`, plus the exported types `CompareRow` and `ReliefCoverCopy`. It also sets these DOM hooks for Task 7: `data-qa` = `relief-cover-compare`, `rc-block`, `rc-map`, `rc-chip`, `rc-legend`, `rc-state-card`, `rc-feedback`, `rc-cell`, `rc-question`, `rc-summary`.

- [ ] **Step 1: Add the failing content-lock tests**

Append to `scripts/qa/relief-cover-compare.test.mjs`:
```js
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SCENE = 'src/components/lessons/topic-02/ReliefCoverIntroScene.tsx';
function compareRows(src) {
  const start = src.indexOf('const COMPARE_ROWS');
  const block = src.slice(start, src.indexOf('];', start));
  return [...block.matchAll(/\{\s*label:\s*'([^']*)',\s*relief:\s*'([^']*)',\s*cover:\s*'([^']*)'\s*\}/g)].map((m) => ({
    label: m[1],
    relief: m[2],
    cover: m[3],
  }));
}

test('COMPARE_ROWS is unchanged since the approved spec (1984b5f)', () => {
  const now = compareRows(readFileSync(SCENE, 'utf8'));
  const then = compareRows(execFileSync('git', ['show', `1984b5f:${SCENE}`], { encoding: 'utf8' }));
  assert.equal(then.length, 5);
  assert.deepEqual(now, then);
  const ex = now.find((r) => r.label === 'דוגמאות').cover;
  assert.equal(splitExamples(ex).join(' · '), ex, 'the cover "דוגמאות" cell splits and re-joins exactly');
  for (const s of STATES) for (const c of STATE_CELLS[s]) assert.ok(now.some((r) => r.label === c.row), `row "${c.row}" exists`);
});

test('the screen renders the component, and the reused orchard sentence is quoted verbatim', () => {
  const src = readFileSync(SCENE, 'utf8');
  assert.ok(src.includes('<ReliefCoverCompare rows={COMPARE_ROWS}'), 'screen 3 renders ReliefCoverCompare from COMPARE_ROWS');
  assert.ok(src.includes('<h3 className={SECTION_TITLE}>השוואה בין תבליט לתכסית</h3>'), 'section heading kept');
  const sentence = 'מטע נחשב לתכסית מלאכותית משום שנוצר בידי אדם.';
  assert.equal(src.split(sentence).length - 1, 2, 'once in FEATURES.orchard.desc, once in the 2→3 feedback');
});
```
Run the tests. Expected: the first new test passes; the second FAILS with "screen 3 renders ReliefCoverCompare".

- [ ] **Step 2: Create `ReliefCoverCompare.tsx`**

```tsx
'use client';

/**
 * ReliefCoverCompare — screen 3 of ReliefCoverIntroScene, „אותה גבעה, שלושה נופים”
 * (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5).
 * One hill in four states — bare → natural grove → buildings and orchard → quarry.
 * Before every transition the learner predicts what will change (relief, land
 * cover or both); the boards play the change, then supportive feedback and the
 * comparison cells for that state. The full original table closes the activity.
 * All copy comes from the scene (single source); the table cells stay verbatim.
 */

import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { BoardView } from './LandformsScene';
import { LegendSwatch, ReliefCoverBlock, ReliefCoverMap } from './ReliefCoverVisuals';
import {
  ANSWERS, CHIP, CORRECT, INITIAL_FLOW, LEGEND, STATES, STATE_CELLS, flowReducer, isComplete, splitExamples,
  type Answer, type CellRef, type LegendKey, type StateId,
} from './reliefCoverCompare.data';

type Layer = 'relief' | 'cover';
export type CompareRow = { label: string; relief: string; cover: string };
export type ReliefCoverCopy = {
  states: Record<StateId, string>;
  stepsLabel: string;
  question: string;
  answers: Record<Answer, string>;
  correct: string;
  wrong: string;
  feedback: { grove: string; built: string; quarry: { lead: string; relief: string; cover: string } };
  chips: { same: string; changed: string };
  legendTitle: string;
  legend: Record<LegendKey, string>;
  disclaimer: string;
  boards: { real: string; map: string };
  layers: Record<Layer, string>;
  next: string;
  restart: string;
  summary: { title: string; show: string; hide: string };
};

const EASE = [0.22, 1, 0.36, 1] as const;
/** Layer dot — the same legend key as the scene's LAYER_SWATCH (sand = relief, sage = cover). */
const LAYER_DOT: Record<Layer, string> = { relief: 'bg-terrain-sand', cover: 'bg-brand' };

export function ReliefCoverCompare({ rows, copy }: { rows: CompareRow[]; copy: ReliefCoverCopy }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [flow, dispatch] = useReducer(flowReducer, INITIAL_FLOW);
  const state = STATES[flow.view];
  const done = isComplete(flow);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // the full table opens on its own once the quarry is reached
  useEffect(() => {
    if (done) setSummaryOpen(true);
  }, [done]);

  const cardRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const focusSoon = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());

  const cellText = (ref: CellRef) => {
    const row = rows.find((r) => r.label === ref.row);
    if (!row) throw new Error(`ReliefCoverCompare: no comparison row "${ref.row}"`);
    const text = row[ref.layer];
    return ref.part === undefined ? text : splitExamples(text)[ref.part];
  };

  const frontier = flow.view === flow.reached;
  const last = flow.view === STATES.length - 1;
  const answer = state === 'bare' ? undefined : flow.answers[state];
  const chip = CHIP[state];
  // feedback waits for the boards' transition (cover objects ≈ 0.5 s, quarry morph 0.9 s)
  const settle = reduce ? 0 : state === 'quarry' ? 0.95 : 0.6;

  return (
    <>
      <div data-qa="relief-cover-compare" className="surface-elevated p-5 sm:p-6">
        {/* stepper: reached states re-open; later ones wait for a prediction */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <ol aria-label={copy.stepsLabel} className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            {STATES.map((s, i) => {
              const isView = i === flow.view;
              const reached = i <= flow.reached;
              return (
                <li key={s}>
                  <button
                    type="button"
                    disabled={!reached}
                    aria-current={isView ? 'step' : undefined}
                    onClick={() => dispatch({ type: 'view', index: i })}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition-colors duration-200 ease-snap',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated',
                      isView
                        ? 'border-accent bg-accent/10'
                        : reached
                          ? 'cursor-pointer border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]'
                          : 'cursor-not-allowed border-border/60 bg-bg-elevated opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold transition-colors duration-200',
                        isView ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="font-display text-base font-bold leading-tight text-fg">{copy.states[s]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {flow.reached > 0 && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'reset' });
                setSummaryOpen(false);
              }}
              className="btn-secondary cursor-pointer px-3 py-1.5 text-sm focus-visible:ring-offset-bg-elevated"
            >
              <Icon name="refresh" size={15} />
              {copy.restart}
            </button>
          )}
        </div>

        {/* the two boards; row 2 = the map key, under the map */}
        <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
          <BoardView caption={{ kind: 'real', sub: copy.states[state] }}>
            <div data-qa="rc-block">
              <ReliefCoverBlock state={state} ariaLabel={`${copy.states[state]} — ${copy.boards.real}`} />
            </div>
          </BoardView>
          <BoardView caption={{ kind: 'map', sub: copy.states[state] }} frameClassName="bg-paper-bright">
            <div data-qa="rc-map" className="relative">
              <ReliefCoverMap state={state} ariaLabel={`${copy.states[state]} — ${copy.boards.map}`} />
              <AnimatePresence initial={false}>
                {chip && (
                  <motion.span
                    key={chip}
                    data-qa="rc-chip"
                    initial={reduce ? false : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.3, ease: EASE, delay: frontier ? settle : 0 } }}
                    exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}
                    className="absolute end-2 top-2 rounded-full bg-white/90 px-2.5 py-1 font-display text-sm font-semibold text-fg shadow-sm"
                  >
                    {copy.chips[chip]}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </BoardView>
          <div aria-hidden className="hidden md:block" />
          <div data-qa="rc-legend" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-fg-muted">
            <span className="font-display font-bold text-fg">{copy.legendTitle}</span>
            {LEGEND[state].map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <LegendSwatch k={k} />
                {copy.legend[k]}
              </span>
            ))}
            <span className="basis-full">{copy.disclaimer}</span>
          </div>
        </div>

        {/* state card: feedback (if arrived by prediction) · the state's cells · the next prediction */}
        <div
          ref={cardRef}
          tabIndex={-1}
          data-qa="rc-state-card"
          className="mt-5 rounded-xl bg-bg-accent/60 p-4 focus-visible:outline-none sm:p-5"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            >
              {state !== 'bare' && answer && (
                <motion.div
                  data-qa="rc-feedback"
                  role="status"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE, delay: frontier ? settle : 0 }}
                >
                  <Feedback state={state} answer={answer} copy={copy} />
                </motion.div>
              )}

              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {STATE_CELLS[state].map((ref) => (
                  <div key={`${ref.row}-${ref.layer}-${ref.part ?? ''}`} data-qa="rc-cell">
                    <dt className="flex items-center gap-1.5 font-display text-sm font-semibold text-fg-muted">
                      <span aria-hidden className={cn('size-2 rounded-full', LAYER_DOT[ref.layer])} />
                      {ref.row} · {copy.layers[ref.layer]}
                    </dt>
                    <dd className="mt-1 text-base leading-relaxed text-fg">{cellText(ref)}</dd>
                  </div>
                ))}
              </dl>

              {frontier && !last && (
                <div className="mt-5 border-t border-border-subtle pt-4">
                  {!flow.asking ? (
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'continue' });
                        focusSoon(() => questionRef.current?.querySelector('button'));
                      }}
                      className="btn-primary cursor-pointer px-5 text-sm"
                    >
                      {copy.next}
                    </button>
                  ) : (
                    <div ref={questionRef} data-qa="rc-question">
                      <p id={`${uid}-q`} className="font-display text-lg font-bold text-fg">
                        {copy.question}
                      </p>
                      <p className="mt-1 text-sm text-fg-muted">
                        {copy.states[state]} ← {copy.states[STATES[flow.view + 1]]}
                      </p>
                      <div role="group" aria-labelledby={`${uid}-q`} className="mt-3 grid max-w-md grid-cols-3 gap-2">
                        {ANSWERS.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => {
                              dispatch({ type: 'predict', answer: a });
                              focusSoon(() => cardRef.current);
                            }}
                            className={cn(
                              'cursor-pointer rounded-xl border border-border bg-bg-elevated px-3 py-2.5 font-display text-base font-semibold text-fg',
                              'transition-colors duration-200 ease-snap hover:border-brand/30 hover:bg-brand/[0.03] focus-visible:ring-offset-bg-elevated',
                            )}
                          >
                            {copy.answers[a]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* summary: always here (a learner who skips can still open it); opens itself at the quarry */}
      <section data-qa="rc-summary" aria-labelledby={`${uid}-sum`} className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 id={`${uid}-sum`} className="font-display text-xl font-bold leading-tight text-fg">
            {copy.summary.title}
          </h4>
          <button
            type="button"
            aria-expanded={summaryOpen}
            aria-controls={`${uid}-table`}
            onClick={() => setSummaryOpen((o) => !o)}
            className="btn-secondary cursor-pointer px-4 py-2 text-sm"
          >
            {summaryOpen ? copy.summary.hide : copy.summary.show}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {summaryOpen && (
            <motion.div
              key="table"
              id={`${uid}-table`}
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, height: 0 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                <CompareTable rows={rows} layers={copy.layers} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}

function Feedback({ state, answer, copy }: { state: Exclude<StateId, 'bare'>; answer: Answer; copy: ReliefCoverCopy }) {
  const right = answer === CORRECT[state];
  return (
    <div className={cn('mb-5 rounded-lg p-3.5', right ? 'bg-brand/10' : 'bg-status-danger/[0.06]')}>
      <p className={cn('flex items-center gap-1.5 font-display text-base font-bold', right ? 'text-brand-dark' : 'text-status-danger')}>
        <Icon name={right ? 'check' : 'x'} size={15} strokeWidth={2.6} />
        {right ? copy.correct : `${copy.wrong} ${copy.answers[CORRECT[state]]}`}
      </p>
      {state === 'quarry' ? (
        <div className="mt-2 space-y-1.5 text-base leading-relaxed text-fg">
          <p>{copy.feedback.quarry.lead}</p>
          {(['relief', 'cover'] as Layer[]).map((l) => (
            <p key={l} className="flex items-start gap-2">
              <span aria-hidden className={cn('mt-2 size-2 shrink-0 rounded-full', LAYER_DOT[l])} />
              <span>
                <strong className="font-display">{copy.layers[l]}</strong> — {copy.feedback.quarry[l]}
              </span>
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-base leading-relaxed text-fg">{copy.feedback[state]}</p>
      )}
    </div>
  );
}

/** The original comparison table, unchanged (moved from ReliefCoverIntroScene screen 3). */
function CompareTable({ rows, layers }: { rows: CompareRow[]; layers: Record<Layer, string> }) {
  return (
    <div className="surface overflow-hidden">
      <div className="grid grid-cols-[minmax(7rem,0.6fr)_1fr_1fr] text-sm">
        <div className="p-3.5 bg-bg-accent/60 border-b border-border-subtle" />
        <CompareHead layer="relief">{layers.relief}</CompareHead>
        <CompareHead layer="cover">{layers.cover}</CompareHead>
        {rows.map((row, i) => (
          <div key={row.label} className="contents">
            <div className={cn('px-4 py-3.5 font-display font-semibold text-fg', i > 0 && 'border-t border-border-subtle')}>{row.label}</div>
            <div className={cn('px-4 py-3.5 text-fg-muted leading-relaxed', i > 0 && 'border-t border-border-subtle')}>{row.relief}</div>
            <div className={cn('px-4 py-3.5 text-fg-muted leading-relaxed', i > 0 && 'border-t border-border-subtle')}>{row.cover}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareHead({ layer, children }: { layer: Layer; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3.5 bg-bg-accent/60 border-b border-border-subtle font-display font-bold text-base text-fg flex items-center gap-2">
      <span aria-hidden className={cn('size-2.5 rounded-full', LAYER_DOT[layer])} />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Swap screen 3 in the scene**

In `ReliefCoverIntroScene.tsx`. Re-read the file first and check `git diff --quiet 1984b5f -- <file>`.

1. Add the import after the `ReliefCoverTerrain` import:
```ts
import { ReliefCoverCompare, type ReliefCoverCopy } from './ReliefCoverCompare';
```
2. After `COMPARE_ROWS`, add:
```ts
/** Screen 3 — „אותה גבעה, שלושה נופים” (ReliefCoverCompare): UI chrome and supportive
 *  feedback only. The lesson content is COMPARE_ROWS above, shown verbatim. */
const COMPARE_COPY: ReliefCoverCopy = {
  states: { bare: 'שטח חשוף', grove: 'חורש טבעי', built: 'מבנים ומטע', quarry: 'חציבה' },
  stepsLabel: 'שלבי ההמחשה',
  question: 'מה ישתנה במעבר מהמצב הנוכחי למצב הבא?',
  answers: { relief: 'תבליט', cover: 'תכסית', both: 'שניהם' },
  correct: 'נכון',
  wrong: 'התשובה הנכונה:',
  feedback: {
    grove: 'צורת הגבעה לא השתנתה, ולכן קווי הגובה במפה נשארו זהים. על פני הקרקע נוסף חורש — תכסית טבעית — ובמפה הוא מסומן בסמל משלו.',
    built: 'במעבר הזה התבליט לא השתנה, וקווי הגובה נשארו במקומם. התכסית הטבעית הוחלפה בתכסית מלאכותית: מבנים ומטע. מטע נחשב לתכסית מלאכותית משום שנוצר בידי אדם.',
    quarry: {
      lead: 'החציבה שינתה את צורת הקרקע, ולכן גם קווי הגובה המתארים אותה השתנו.',
      relief: 'חציבת הקרקע שינתה את צורת הגבעה.',
      cover: 'עצי המטע שעמדו באזור החציבה הוסרו.',
    },
  },
  chips: { same: 'קווי הגובה: ללא שינוי', changed: 'קווי הגובה השתנו' },
  legendTitle: 'מקרא',
  legend: {
    contour: 'קו גובה',
    index: 'קו גובה ראשי',
    grove: 'חורש',
    orchard: 'מטע',
    houses: 'מבנים',
    quarry: 'אזור חציבה',
    before: 'קווי הגובה לפני החציבה',
  },
  disclaimer: 'המחשה סכמטית — הסמלים אינם מקרא רשמי',
  boards: { real: 'בשטח', map: 'במפה' },
  layers: LAYER_LABEL,
  next: 'המשך',
  restart: 'התחלה מחדש',
  summary: { title: 'סיכום ההשוואה', show: 'הצגת ההשוואה המלאה', hide: 'הסתרת ההשוואה המלאה' },
};
```
3. Replace screen 3 (the comment, the `<h3>` and the `surface` table, lines 269–285) with:
```tsx
      {/* ── Screen 3: same hill, three landscapes — predict, then see (ReliefCoverCompare);
           the original table closes it as the summary ── */}
      <h3 className={SECTION_TITLE}>השוואה בין תבליט לתכסית</h3>

      <ReliefCoverCompare rows={COMPARE_ROWS} copy={COMPARE_COPY} />
```
4. Delete the now-unused `CompareHead` function (lines 361–368). Keep `LAYER_SWATCH`: it is still used by screen 2 and `DefinitionCard`.

- [ ] **Step 4: Type-check, run the tests and the landforms gate**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "terrainBlock|LandformsVisuals|LandformsScene|ReliefCover|reliefCover" || echo CLEAN
node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/relief-cover-compare.test.mjs
QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/after-6
node scripts/qa/shot-landforms-baseline.mjs --compare qa-output/landforms-extraction/before qa-output/landforms-extraction/after-6
```
Expected: `CLEAN`; all 14 tests pass; 10 `same`.

- [ ] **Step 5: First look in the browser**

Open `http://localhost:3100/lessons/topic-02/#scene-relief-cover` at 1440 × 1122. Use the Playwright MCP: `browser_resize`, then `browser_navigate`, scroll to screen 3, then `browser_take_screenshot`. Click "המשך", then an answer, three times. Confirm:
- the hill is bare-earth coloured;
- the grove appears on the hill and the map;
- buildings and orchard replace the grove;
- the quarry notch is visible and the map's contours change;
- the summary opens.

Write down every visual delta for Task 7. There are no fixes in this step.

- [ ] **Step 6: Commit**

```bash
git add -- src/components/lessons/topic-02/ReliefCoverCompare.tsx src/components/lessons/topic-02/ReliefCoverIntroScene.tsx scripts/qa/relief-cover-compare.test.mjs
git commit -m "feat(topic-02): screen 3 becomes 'same hill, three landscapes' with predict-then-see

COMPARE_ROWS unchanged; the original table closes the activity as the summary.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/lessons/topic-02/ReliefCoverCompare.tsx src/components/lessons/topic-02/ReliefCoverIntroScene.tsx scripts/qa/relief-cover-compare.test.mjs
```

---

### Task 7: Browser QA script and the visual-fidelity loop

**Files:**
- Create: `scripts/qa/shot-relief-cover.mjs`
- Modify (fixes only, as the loop finds them): `ReliefCoverVisuals.tsx`, `ReliefCoverCompare.tsx`, `reliefCoverCompare.data.ts`

**Interfaces:**
- Consumes: the `data-qa` hooks (Task 6); `data-contour` (Task 3); `LEGEND`, `STATE_CELLS`, `splitExamples` (Task 4).
- Produces: `QA_PORT=3100 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-relief-cover.mjs [outDir]`, which exits 1 on any failed check; screenshots go in `qa-output/relief-cover-compare/`.

- [ ] **Step 1: Write the script**

```js
// QA for topic-02 screen 3 „אותה גבעה, שלושה נופים”
// (docs/superpowers/plans/2026-10-08-relief-cover-compare.md, Task 7).
//
//   QA_PORT=3100 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-relief-cover.mjs [outDir]
//
// Checks (exit 1 on any failure), with motion and with reduced motion:
//   content  each state card shows exactly its cells (spec §5), verbatim from COMPARE_ROWS;
//            the summary opens itself at the quarry and shows every cell verbatim
//   flow     later states locked until predicted; "המשך" opens the question; a wrong answer
//            advances and is corrected; a revisit keeps its result and asks nothing; reset
//   map      contour paths identical in states 1–3 and different in state 4; chip and
//            legend per state; disclaimer always
//   page     no console errors; no horizontal scroll at 1440
// Screenshots: every state at 1440 × 1122, plus the open summary.
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { LEGEND, STATE_CELLS, splitExamples } from '../../src/components/lessons/topic-02/reliefCoverCompare.data.ts';

const outDir = process.argv[2] ?? 'qa-output/relief-cover-compare';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-relief-cover`;
await mkdir(outDir, { recursive: true });
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};

// the source of truth for the cells: COMPARE_ROWS in the scene file
const src = await readFile('src/components/lessons/topic-02/ReliefCoverIntroScene.tsx', 'utf8');
const start = src.indexOf('const COMPARE_ROWS');
const ROWS = [...src.slice(start, src.indexOf('];', start)).matchAll(/\{\s*label:\s*'([^']*)',\s*relief:\s*'([^']*)',\s*cover:\s*'([^']*)'\s*\}/g)].map(
  (m) => ({ label: m[1], relief: m[2], cover: m[3] }),
);
check(ROWS.length === 5, `parsed ${ROWS.length} COMPARE_ROWS (expected 5)`);
const cellText = (c) => {
  const t = ROWS.find((r) => r.label === c.row)[c.layer];
  return c.part === undefined ? t : splitExamples(t)[c.part];
};
const COPY = {
  next: 'המשך',
  question: 'מה ישתנה במעבר מהמצב הנוכחי למצב הבא?',
  answers: { relief: 'תבליט', cover: 'תכסית', both: 'שניהם' },
  correct: 'נכון',
  wrong: 'התשובה הנכונה:',
  chipSame: 'קווי הגובה: ללא שינוי',
  chipChanged: 'קווי הגובה השתנו',
  disclaimer: 'המחשה סכמטית — הסמלים אינם מקרא רשמי',
  legend: { contour: 'קו גובה', index: 'קו גובה ראשי', grove: 'חורש', orchard: 'מטע', houses: 'מבנים', quarry: 'אזור חציבה', before: 'קווי הגובה לפני החציבה' },
  restart: 'התחלה מחדש',
};

const browser = await chromium.launch({ channel: 'chrome' });

async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('[data-qa="rc-block"] canvas'), null, { timeout: 15000 });
  await page.waitForTimeout(1300); // object fades + delayed feedback
}

async function walk(reduced) {
  const tag = reduced ? 'reduced' : 'motion';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  const root = page.locator('[data-qa="relief-cover-compare"]');
  await root.waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await root.scrollIntoViewIfNeeded();
  await settle(page);

  const steps = root.locator('ol[aria-label] button');
  const contours = {};
  const expectCells = async (s) => {
    const got = await root.locator('[data-qa="rc-cell"] dd').allInnerTexts();
    const want = STATE_CELLS[s].map(cellText);
    check(JSON.stringify(got) === JSON.stringify(want), `${tag} ${s}: state-card cells\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  };
  const expectMap = async (s, chip) => {
    const legend = await root.locator('[data-qa="rc-legend"]').innerText();
    for (const k of LEGEND[s]) check(legend.includes(COPY.legend[k]), `${tag} ${s}: legend lists "${COPY.legend[k]}"`);
    check(legend.includes(COPY.disclaimer), `${tag} ${s}: disclaimer shown`);
    const chipEl = root.locator('[data-qa="rc-chip"]');
    if (chip) check((await chipEl.count()) === 1 && (await chipEl.innerText()).trim() === chip, `${tag} ${s}: chip "${chip}"`);
    else check((await chipEl.count()) === 0, `${tag} ${s}: no chip`);
    contours[s] = await root.locator('[data-qa="rc-map"] path[data-contour]').evaluateAll((ps) => ps.map((p) => p.getAttribute('d')).join('|'));
  };
  const predict = async (answer) => {
    await root.getByRole('button', { name: COPY.next, exact: true }).click();
    check(await root.getByText(COPY.question).isVisible(), `${tag}: the question opens after "המשך"`);
    await root.getByRole('button', { name: COPY.answers[answer], exact: true }).click();
    await settle(page);
  };
  const feedback = () => root.locator('[data-qa="rc-feedback"]').innerText();

  check((await steps.count()) === 4, `${tag}: stepper has 4 states`);
  for (const i of [1, 2, 3]) check(await steps.nth(i).isDisabled(), `${tag}: state ${i + 1} locked at start`);
  await expectCells('bare');
  await expectMap('bare', null);
  await page.screenshot({ path: `${outDir}/${tag}-1-bare.png` });

  await predict('relief'); // wrong on purpose
  check((await feedback()).includes(`${COPY.wrong} ${COPY.answers.cover}`), `${tag} grove: wrong answer corrected`);
  await expectCells('grove');
  await expectMap('grove', COPY.chipSame);
  await page.screenshot({ path: `${outDir}/${tag}-2-grove.png` });

  await predict('cover');
  check((await feedback()).includes(COPY.correct), `${tag} built: right answer confirmed`);
  await expectCells('built');
  await expectMap('built', COPY.chipSame);
  await page.screenshot({ path: `${outDir}/${tag}-3-built.png` });

  await predict('both');
  check((await feedback()).includes(COPY.correct), `${tag} quarry: right answer confirmed`);
  await expectCells('quarry');
  await expectMap('quarry', COPY.chipChanged);
  await page.screenshot({ path: `${outDir}/${tag}-4-quarry.png` });

  check(contours.bare === contours.grove && contours.grove === contours.built, `${tag}: contours identical in states 1–3`);
  check(contours.quarry !== contours.built, `${tag}: contours change in state 4`);

  const summary = page.locator('[data-qa="rc-summary"]');
  await page.waitForTimeout(500);
  const sum = await summary.innerText();
  for (const r of ROWS) for (const t of [r.label, r.relief, r.cover]) check(sum.includes(t), `${tag}: summary shows "${t.slice(0, 40)}…"`);
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/${tag}-5-summary.png` });

  await root.scrollIntoViewIfNeeded();
  await steps.nth(1).click();
  await settle(page);
  await expectCells('grove');
  check((await feedback()).includes(COPY.wrong), `${tag}: a revisit keeps the stored result`);
  check((await root.getByRole('button', { name: COPY.next, exact: true }).count()) === 0, `${tag}: no question on a revisited state`);

  await root.getByRole('button', { name: COPY.restart }).click();
  await settle(page);
  await expectCells('bare');
  for (const i of [1, 2, 3]) check(await steps.nth(i).isDisabled(), `${tag}: state ${i + 1} locked after reset`);

  const hScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(hScroll <= 0, `${tag}: horizontal scroll ${hScroll}px`);
  check(errors.length === 0, `${tag}: console errors — ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

await walk(false);
await walk(true);
await browser.close();
if (failures.length) {
  console.error(`relief-cover QA: ${failures.length} failure(s)\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`relief-cover QA: all checks passed → ${outDir}`);
```

- [ ] **Step 2: Run it**

Run: `QA_PORT=3100 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-relief-cover.mjs`
Expected: `all checks passed`. Any failure is a bug in Tasks 4–6: fix the component, never the check, then re-run.

- [ ] **Step 3: The visual-fidelity loop (CLAUDE.md)**

Open the ten screenshots. For each, check the list below and write down concrete deltas, in px and with the exact element:
- **Block:**
  - The ground is bare earth with no green.
  - The grove is clumpy and irregular; the orchard is clearly in rows.
  - The houses read as boxes, not specks.
  - Tree crowns are ≥ 10 px across at 1440.
  - The quarry notch and its pale floor are visible, and no object floats over the cut.
- **Map:**
  - Contours are brown.
  - Grove patches are irregular and the orchard parcel is gridded.
  - Houses are dark squares.
  - The quarry area is pale, with ticks along the faces only.
  - In state 4 the dashed pre-quarry lines show **only** around the cut.
  - The chip does not cover a symbol or a contour label.
  - The elevation labels (150, 110) are legible and not inside the cut.
- **Layout:**
  - Both boards are the same height.
  - The legend sits under the map.
  - The state card has no orphan line breaks.
  - The prediction buttons fit on one row.
  - Nothing is clipped at 1440.

Fix the deltas, in the data module for positions and sizes and in the visuals for drawing. After each round:
- re-run the unit tests, the QA script and the landforms pixel gate;
- re-shoot, and repeat until the list is clean.

Each geometry change goes into the Task 9 assumptions entry.

- [ ] **Step 4: Commit**

```bash
git add -- scripts/qa/shot-relief-cover.mjs src/components/lessons/topic-02/ReliefCoverVisuals.tsx src/components/lessons/topic-02/ReliefCoverCompare.tsx src/components/lessons/topic-02/reliefCoverCompare.data.ts
git commit -m "test(topic-02): browser QA for screen 3 + visual fixes from the 1440 render loop

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- scripts/qa/shot-relief-cover.mjs src/components/lessons/topic-02/ReliefCoverVisuals.tsx src/components/lessons/topic-02/ReliefCoverCompare.tsx src/components/lessons/topic-02/reliefCoverCompare.data.ts
```
Only list the files that actually changed.

---

### Task 8: Specialist reviews and fixes

**Files:**
- Modify (fixes only): the five `ReliefCover*`/`reliefCover*` files; `COMPARE_COPY` in `ReliefCoverIntroScene.tsx`.

- [ ] **Step 1: Dispatch the reviewers in parallel**

Dispatch them as a single message with several Agent calls. Each gets the spec path, the plan path and the screenshot folder `qa-output/relief-cover-compare/`, and reports findings without editing.

| Agent | Scope and question |
|---|---|
| `hebrew-copy-editor` | **Read-only for this pass:** report, don't edit. Only the strings in `COMPARE_COPY` (spec §4). Check grammar, tone, punctuation and quote marks. **`COMPARE_ROWS` and the FEATURES sentence are locked: do not propose changes to them.** Also: should "התחלה מחדש" stay (it matches `SortQuiz`)? |
| `military-geo-editor` | Is the quarry depiction (cut face, floor at 120 m, contours re-derived) and the quarry feedback factually sound? Is it right to call the quarry both a relief and a land-cover change? Are the map-symbol wording and the disclaimer adequate? |
| `cartographic-reviewer` | `ReliefCoverVisuals.tsx`. Check label sizes, symbol legibility, the dashed "before" contours vs. the solid ones, chip placement, no mirroring, and `textAnchor`. |
| `visual-qa-reviewer` | Render screen 3 at 1440 (all four states and the summary). Check overlap, clipping, floating objects and board alignment. |
| `rtl-qa-reviewer` | `ReliefCoverCompare.tsx` and `ReliefCoverVisuals.tsx`. Check logical properties only, the chip's `end-2`, and the "←" pair order. |
| `frontend-reviewer` | All new and changed files. Check React/TS quality, token use, duplicated logic, and that `terrainBlock*` is a clean, reusable boundary. |

- [ ] **Step 2: Triage and fix**

- **Content lock.** Any finding that would change a locked cell, or would rewrite approved §4 copy beyond a typo or punctuation fix, is **not applied**. List it for the user instead.
- **Apply the rest.** After the fixes, re-run the unit tests, the QA script and the landforms pixel gate. All must pass.

- [ ] **Step 3: Commit**

```bash
git add -- <only the files changed in Step 2>
git commit -m "fix(topic-02): screen 3 review fixes (copy, cartography, RTL, code)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- <the same files>
```

---

### Task 9: Final gate, worktree build and record

**Files:**
- Modify: `design/docs/assumptions.md` (append only)
- Modify: `docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md` (status line only, plus §4 if the restart label was confirmed)
- Modify: `tsconfig.json` (remove only the `.next-relief` include line that Next added)

- [ ] **Step 1: Every gate, once more**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "terrainBlock|LandformsVisuals|LandformsScene|ReliefCover|reliefCover" || echo CLEAN
node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/relief-cover-compare.test.mjs
QA_PORT=3100 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-relief-cover.mjs
QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/final
node scripts/qa/shot-landforms-baseline.mjs --compare qa-output/landforms-extraction/before qa-output/landforms-extraction/final
node scripts/qa/rtl-audit.mjs 2>&1 | grep -E "ReliefCover|terrainBlock" || echo RTL-CLEAN
```
Expected: `CLEAN`; all tests pass; `all checks passed`; 10 `same`; `RTL-CLEAN`.

- [ ] **Step 2: Verification build in a temporary worktree**

```bash
WT="$TEMP/geo-relief-build"
git worktree add --detach "$WT" HEAD
cmd //c mklink /J "$(cygpath -w "$WT")\\node_modules" "$(cygpath -w "$PWD")\\node_modules"
(cd "$WT" && npx next build) 2>&1 | tail -25
git worktree remove --force "$WT"
git worktree prune
```
Expected:
- `next build` exits 0, with the static export of `/lessons/topic-02` included.
- The main folder's `.next/` is untouched, and so is the shared `:3000` server.

If the junction route fails, record the error and run `npx tsc --noEmit` inside the worktree instead. Report it to the user. **Never** fall back to building in the main folder.

- [ ] **Step 3: Stop the dev server and restore `tsconfig.json`**

Stop the background `next dev` on :3100. Then:
- `git diff -- tsconfig.json` should show only the added `".next-relief/types/**/*.ts"` include. Remove that line so the diff is empty.
- If the diff shows anything else, it is another session's: leave it.

- [ ] **Step 4: Append the assumptions entry**

Append to `design/docs/assumptions.md` (never rewrite earlier entries):
```markdown
## 2026-10-08 — Topic 02 screen 3: "same hill, three landscapes" (relief vs. land cover)

Spec `docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md`; plan `docs/superpowers/plans/2026-10-08-relief-cover-compare.md`.

- **One height field.** States 1–3 share `HILL` (one rounded hill, ≈166 m, centre (40, 24), tile 100 × 50), so their block and contours are the same objects.
  - The quarry is `QUARRIED = HILL − w·max(0, HILL − 120)`, with mask `w` 1 inside x 44–56 × y 28.5–46 and a 1.5-unit smoothstep band just inside the edge.
  - Heights, and therefore contours, differ only where w > 0 (tested).
  - [Record any values changed in Tasks 4/7.]
- **Quarry = relief and land cover.** The cut lowers the ground (contours re-derived) and removes every orchard tree with w > 0. On the map the quarry site is the w ≥ 0.5 area; every removed tree lies inside it (tested).
- **Map symbols are schematic, not an official legend.** This is stated on screen next to the legend: "המחשה סכמטית — הסמלים אינם מקרא רשמי".
- **Colours:** existing palette only.
  - Inside this illustration green = vegetation, so the block uses a bare-earth ramp (rim/paper-edge/contour mixes) and the map's per-level height tint is the tan contour colour.
  - The landforms scene keeps its green look: the engine extraction was pixel-identical (10/10 boards, motion and reduced motion).
- **Engine extraction:**
  - `terrainBlockGeometry.ts` (pure) and `terrainBlock.tsx` (React) now hold the block/contour engine formerly inside `LandformsVisuals.tsx`.
  - `TerrainSpec.look` carries the ground ramp and an optional per-quad tint.
  - `TerrainBlockView` gained an `objects` layer that stays visible over the WebGL morph.
- **Content lock:** `COMPARE_ROWS` is byte-identical to `1984b5f` (test). The cover "דוגמאות" cell is shown in two parts at its own " · ", and the summary shows it whole.
- **Restart label** "התחלה מחדש" matches screen 4's `SortQuiz`. [State the user's decision.]
- **Verification build** ran in a temporary git worktree; QA used a private dev server (`NEXT_DIST_DIR=.next-relief`, :3100).
```
Replace the bracketed lines with the actual values and decision before committing.

- [ ] **Step 5: Mark the spec implemented**

In the spec, change the status line to:
`**Status:** implemented (plan docs/superpowers/plans/2026-10-08-relief-cover-compare.md) · **Date:** 2026-10-08`.
If the user confirmed "התחלה מחדש", update that string in §4 too.

- [ ] **Step 6: Final commit and integrity check**

```bash
git add -- design/docs/assumptions.md docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md
git commit -m "docs(topic-02): record screen-3 relief/cover comparison assumptions; spec implemented

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- design/docs/assumptions.md docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md
git diff --cached --name-status
git log --oneline -10
```
Expected:
- `git diff --cached` still shows exactly the other session's three staged `D` lines from Task 1 Step 1.
- The log shows this plan's commits and no foreign files in them. Check with `git show --stat` on each commit.
