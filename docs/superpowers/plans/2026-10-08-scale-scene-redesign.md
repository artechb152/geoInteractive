# Topic 02 · Scale scenes ("explore, measure, choose a map") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace lesson 2's scale section with two scenes — "קנה מידה 1" (explore + measure) and "קנה מידה 2" (choose a map + the zoom myth) — built on three real, co-registered orthophoto + topographic map sheets nested around Mount Tavor.

**Architecture:** A one-off Node script fetches three nested 24 cm "sheets" (1:10,000 / 1:50,000 / 1:250,000) for the same EPSG:3857 box per sheet (Esri orthophoto + Israel Hiking Map tiles) and writes their bounds to a generated data file. All geometry lives in one pure module (`geo.ts`, tested with `node:test`). One shared React viewport (`SheetViewport`) stacks the two layers under a single CSS transform (zoom/pan ported from the terrain-overlay prototype), with a curtain cut outside the transform and an SVG overlay in sheet units 0..1000. Four screen components compose that viewport with their own state.

**Tech Stack:** Next.js 15 / React 19 / TypeScript, Tailwind (project tokens), framer-motion 11, lucide-react, `sharp` (resolved through `next`), Playwright (QA), Node 22 `--experimental-strip-types` for tests and scripts.

**Spec:** `docs/superpowers/specs/2026-10-08-scale-scene-redesign-design.md` (approved 2026-10-08). Read it before starting any task.

## Global Constraints

- Hebrew, full RTL. Logical utilities (`ms-/me-/ps-/pe-/start-/end-`, `text-start`) for all UI. **Map furniture inside the viewport (north arrow, scale bar, zoom buttons, curtain chips) uses physical `left-/right-`** because maps are never mirrored — the accepted exception already on record in `design/docs/assumptions.md`.
- Every SVG `<text>` sets `textAnchor` explicitly.
- No new colour tokens. UI uses existing Tailwind tokens (`fg`, `fg-muted`, `fg-dim`, `accent`, `brand-dark`, `bg-accent`, `bg-elevated`, `border`, `status-ok`, `status-warn`, `paper-card`). Inside SVG only these hex values: accent `#D97E2B`, ink `#38432E`, paper `#FFFDF8`, hairline `#DCCDB2`.
- Text tiers from `design/docs/lessons-02-06-ui-cleanup-spec.md`: T1 `font-display text-2xl font-bold leading-tight text-fg sm:text-3xl`; T1-intro `mt-2 text-base leading-relaxed text-fg-muted`; T3 `text-base font-display font-bold text-fg`; T5 `text-sm font-display font-semibold text-fg-muted`; T6 `text-sm text-fg-muted leading-snug`. Minimum HTML text 13 px. Selected state = `border-accent bg-accent/10` and nothing else. One `surface-elevated` workspace per screen; insets `rounded-xl bg-bg-accent/60`.
- Every "ס״מ" in the UI is a centimetre on the 24 cm sheet. Sheet distance is defined as `groundDistance / denominator` (true scale); the reading is rounded to 1 mm (`readCm`). Never show raw Web Mercator distances.
- Every drag has a keyboard or list alternative; `prefers-reduced-motion` makes every animation instant.
- Desktop target 1440 × 1122. Each screen's workspace must fit under the 88 px nav at 1440 × 1122.
- Files: only those listed in this plan. `Topic02Lesson.tsx` and `src/lib/lesson-scenes.ts` are shared with concurrent sessions — run `git diff` on them immediately before editing and edit only the lines named here.
- **No commits** unless the user asks (repo rule). Each task ends with a checkpoint instead. Never run `next build` in the main tree (concurrent sessions); the dev server on :3000 is the test target (`pnpm dev` if it is not running).
- New Hebrew copy is written exactly as given here; Task 9 sends it through `hebrew-copy-editor` and `military-geo-editor`.

---

## File map

| File | Responsibility |
|---|---|
| `src/components/lessons/topic-02/scale/geo.ts` | Pure geometry, formatting, answer classification. No imports. |
| `src/components/lessons/topic-02/scale/viewMath.ts` | Pure zoom/pan math. No imports. |
| `src/components/lessons/topic-02/scale/choose.ts` | Pure evaluation of a map choice for a scenario. Type imports only. |
| `src/components/lessons/topic-02/scale/scaleSheets.data.ts` | **Generated** sheet metadata (bounds, rasters, attribution). |
| `src/components/lessons/topic-02/scale/scaleContent.data.ts` | Landmarks, table rows, practice targets, scenarios, myth options (with sources). |
| `src/components/lessons/topic-02/scale/useMapView.ts` | Zoom/pan hook (wheel, drag, keys, animation). |
| `src/components/lessons/topic-02/scale/SheetViewport.tsx` | The square map: layers, curtain, overlay slot, scale bar, north arrow, zoom buttons, scale morph. |
| `src/components/lessons/topic-02/scale/overlayParts.tsx` | SVG overlay primitives (Marker, Label, Pulse, colours). |
| `src/components/lessons/topic-02/scale/controls.tsx` | Text-tier classes, option recipes, roving keys, `ViewModeToggle`, `SheetPicker`. |
| `src/components/lessons/topic-02/scale/layers.ts` | `asset()`, `layersFor()`, `preloadFor()`, curtain labels. |
| `src/components/lessons/topic-02/scale/MeasureOverlay.tsx` | A–B handles, sheet ruler, reading chip. |
| `src/components/lessons/topic-02/scale/ScaleExplore.tsx` | Screen A. |
| `src/components/lessons/topic-02/scale/ScaleMeasure.tsx` | Screen B. |
| `src/components/lessons/topic-02/scale/ScaleChoose.tsx` | Screen C. |
| `src/components/lessons/topic-02/scale/ScaleZoomMyth.tsx` | Screen D. |
| `src/components/lessons/topic-02/scale/ProjectionCallout.tsx` | Verbatim move of the existing projections block. |
| `src/components/lessons/topic-02/ScaleScene.tsx` | Rewrite: scene `scale` = header + A + B. |
| `src/components/lessons/topic-02/Scale2Scene.tsx` | New scene `scale-2` = header + C + D + projections. |
| `src/components/lessons/topic-02/Topic02Lesson.tsx` | Register `scale-2`, relabel `scale`. |
| `src/lib/lesson-scenes.ts` | Same, static copy. |
| `scripts/maps/build-scale-sheets.mjs` | Fetch + crop + write rasters and the data file. |
| `scripts/maps/check-scale-sheets.mjs` | Bounds/size checks + registration and visibility crops. |
| `scripts/qa/scale-geo.test.mjs`, `scripts/qa/scale-view.test.mjs`, `scripts/qa/scale-content.test.mjs` | Unit tests. |
| `scripts/qa/shot-scale.mjs` | Browser QA at 1440 × 1122. |
| `public/assets/lessons/topic02/scene-scale/sheets/*.webp` | Generated rasters (6 files). |
| `design/docs/assumptions.md` | Append the §11 assumptions. |

Run every test/script from the repo root `C:\Users\idog2\Desktop\Programming\Artech\geoInteractive`.

---

### Task 1: Geometry module (`geo.ts`) — TDD

**Files:**
- Create: `src/components/lessons/topic-02/scale/geo.ts`
- Test: `scripts/qa/scale-geo.test.mjs`

**Interfaces:**
- Produces (exact exports, used by every later task):
  - types `LatLon = { lat: number; lon: number }`, `SheetPoint = { x: number; y: number }`, `Box3857 = [number, number, number, number]`, `SheetGeometry = { denominator: number; center: LatLon; groundWidthM: number; sheetCm: number; bbox3857: Box3857 }`, `AnswerKind`, `AnswerResult`
  - `SHEET_UNITS = 1000`
  - `toMerc(p: LatLon): [number, number]`, `fromMerc(x: number, y: number): LatLon`
  - `sheetBox(center: LatLon, groundWidthM: number): Box3857`
  - `lonLatToSheet(sheet: { bbox3857: Box3857 }, p: LatLon): SheetPoint`, `sheetToLonLat(sheet: { bbox3857: Box3857 }, q: SheetPoint): LatLon`, `insideSheet(q: SheetPoint): boolean`
  - `groundDistanceM(a: LatLon, b: LatLon): number`
  - `sheetCm(groundM: number, denominator: number): number`, `readCm(cm: number): number`, `readingPrecisionM(denominator: number): number`, `metersPerSheetCm(denominator: number): number`
  - `formatNumber(n: number, digits?: number): string`, `formatRatio(denominator: number): string`, `formatDistance(m: number, precisionM?: number): string`
  - `parseKm(text: string): number | null`, `classifyAnswer(text: string, expectedM: number, denominator: number, others: readonly number[]): AnswerResult`
  - `sheetsNeeded(points: readonly LatLon[], groundWidthM: number): number`
  - `niceScaleBar(metersPerPx: number, targetPx: number): { meters: number; px: number }`

- [ ] **Step 1: Write the failing test**

Create `scripts/qa/scale-geo.test.mjs`:

```js
// Unit tests for the scale scene geometry (spec §5).
// Run: node --experimental-strip-types --test scripts/qa/scale-geo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toMerc, fromMerc, sheetBox, lonLatToSheet, sheetToLonLat, insideSheet, groundDistanceM,
  sheetCm, readCm, readingPrecisionM, metersPerSheetCm, formatNumber, formatRatio, formatDistance,
  parseKm, classifyAnswer, sheetsNeeded, niceScaleBar,
} from '../../src/components/lessons/topic-02/scale/geo.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const TAVOR = { lat: 32.687, lon: 35.39 };
const sheet = (D, W) => ({ denominator: D, center: TAVOR, groundWidthM: W, sheetCm: 24, bbox3857: sheetBox(TAVOR, W) });
const S10 = sheet(10000, 2400);
const S50 = sheet(50000, 12000);
const S250 = sheet(250000, 60000);
const PAIRS = {
  basilicaShibli: [{ lat: 32.68626, lon: 35.39242 }, { lat: 32.69372, lon: 35.396 }],
  summitReservoir: [{ lat: 32.68711, lon: 35.38962 }, { lat: 32.66323, lon: 35.38019 }],
  afulaTiberias: [{ lat: 32.60756, lon: 35.28909 }, { lat: 32.79385, lon: 35.53286 }],
};

test('mercator round-trip', () => {
  const p = fromMerc(...toMerc({ lat: 32.6871, lon: 35.38962 }));
  close(p.lat, 32.6871, 1e-9);
  close(p.lon, 35.38962, 1e-9);
});

// Reference: the standard WGS84 series for the length of one degree.
const degLat = (phi) => 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi);
const degLon = (phi) => 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi);

test('ground distance matches WGS84 degree lengths', () => {
  const phi = (32.7 * Math.PI) / 180;
  close(groundDistanceM({ lat: 32.2, lon: 35 }, { lat: 33.2, lon: 35 }), degLat(phi), 2, 'lat');
  close(groundDistanceM({ lat: 32.7, lon: 35 }, { lat: 32.7, lon: 36 }), degLon(phi), 2, 'lon');
});

test('sheet east-west width equals the nominal ground width; centre maps to 500,500', () => {
  for (const s of [S10, S50, S250]) {
    const w = sheetToLonLat(s, { x: 0, y: 500 });
    const e = sheetToLonLat(s, { x: 1000, y: 500 });
    close(groundDistanceM({ lat: TAVOR.lat, lon: w.lon }, { lat: TAVOR.lat, lon: e.lon }), s.groundWidthM, s.groundWidthM * 0.001);
    const c = lonLatToSheet(s, TAVOR);
    close(c.x, 500, 1e-6);
    close(c.y, 500, 1e-6);
  }
});

test('each sheet is exactly 1/5 of the next', () => {
  const q = lonLatToSheet(S50, sheetToLonLat(S10, { x: 0, y: 0 }));
  close(q.x, 400, 1e-6);
  close(q.y, 400, 1e-6);
  const r = lonLatToSheet(S250, sheetToLonLat(S50, { x: 1000, y: 1000 }));
  close(r.x, 600, 1e-6);
  close(r.y, 600, 1e-6);
});

test('insideSheet', () => {
  assert.equal(insideSheet({ x: 0, y: 1000 }), true);
  assert.equal(insideSheet({ x: -0.1, y: 10 }), false);
  assert.equal(insideSheet({ x: 10, y: 1000.1 }), false);
});

test('the Mercator picture stays within 1% of true scale (so the drawn ruler is honest)', () => {
  for (const [name, [a, b]] of Object.entries(PAIRS)) {
    for (const s of [S10, S50, S250]) {
      const pa = lonLatToSheet(s, a);
      const pb = lonLatToSheet(s, b);
      const viaPicture = (Math.hypot(pb.x - pa.x, pb.y - pa.y) / 1000) * s.groundWidthM;
      const truth = groundDistanceM(a, b);
      assert.ok(Math.abs(viaPicture - truth) / truth < 0.01, `${name} on 1:${s.denominator}: ${viaPicture} vs ${truth}`);
    }
  }
});

test('ground distance is the same whichever sheet the points are read from', () => {
  const [a, b] = PAIRS.basilicaShibli;
  const d = [S10, S50, S250].map((s) =>
    groundDistanceM(sheetToLonLat(s, lonLatToSheet(s, a)), sheetToLonLat(s, lonLatToSheet(s, b))),
  );
  close(d[0], d[1], 1e-6);
  close(d[1], d[2], 1e-6);
});

test('sheet centimetres, reading and precision', () => {
  close(sheetCm(890, 10000), 8.9, 1e-12);
  close(sheetCm(1000, 250000), 0.4, 1e-12);
  assert.equal(readCm(8.94), 8.9);
  assert.equal(readCm(0.36), 0.4);
  assert.equal(readingPrecisionM(10000), 10);
  assert.equal(readingPrecisionM(50000), 50);
  assert.equal(readingPrecisionM(250000), 250);
  assert.equal(metersPerSheetCm(50000), 500);
});

test('formatting', () => {
  assert.equal(formatNumber(89000), '89,000');
  assert.equal(formatNumber(5.76, 2), '5.76');
  assert.equal(formatNumber(2.4, 1), '2.4');
  assert.equal(formatRatio(250000), '1:250,000');
  assert.equal(formatDistance(894.3, 10), '890 מ׳');
  assert.equal(formatDistance(2812, 50), '2.8 ק״מ');
  assert.equal(formatDistance(2750, 50), '2.75 ק״מ');
  assert.equal(formatDistance(60000), '60 ק״מ');
  assert.equal(formatDistance(1000, 250), '1 ק״מ');
  assert.equal(formatDistance(500), '500 מ׳');
});

test('parseKm', () => {
  assert.equal(parseKm(' 2.8 '), 2.8);
  assert.equal(parseKm('2,8'), 2.8);
  assert.equal(parseKm('abc'), null);
  assert.equal(parseKm(''), null);
});

test('classifyAnswer branches', () => {
  const D = 50000;
  const others = [10000, 50000, 250000];
  const exp = 2800;
  assert.equal(classifyAnswer('2.8', exp, D, others).kind, 'correct');
  assert.equal(classifyAnswer('2.75', exp, D, others).kind, 'correct');
  assert.equal(classifyAnswer('2.81', exp, D, others).kind, 'over-precise');
  const ten = classifyAnswer('28', exp, D, others);
  assert.equal(ten.kind, 'unit');
  assert.equal(ten.factor, 10);
  assert.equal(classifyAnswer('0.28', exp, D, others).kind, 'unit');
  const den = classifyAnswer('0.56', exp, D, others);
  assert.equal(den.kind, 'denominator');
  assert.equal(den.otherDenominator, 10000);
  assert.equal(classifyAnswer('14', exp, D, others).otherDenominator, 250000);
  assert.equal(classifyAnswer('5', exp, D, others).kind, 'off');
  assert.equal(classifyAnswer('x', exp, D, others).kind, 'invalid');
});

test('sheetsNeeded', () => {
  const einDor = { lat: 32.65625, lon: 35.41704 };
  const summit = { lat: 32.68711, lon: 35.38962 };
  assert.equal(sheetsNeeded([einDor, summit], 2400), 4);
  assert.equal(sheetsNeeded([einDor, summit], 12000), 1);
  assert.equal(sheetsNeeded(PAIRS.afulaTiberias, 12000), 4);
});

test('niceScaleBar picks a round length near the target', () => {
  const r = niceScaleBar(4, 110);
  assert.equal(r.meters, 500);
  close(r.px, 125, 1e-9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test scripts/qa/scale-geo.test.mjs`
Expected: FAIL — `Cannot find module ... scale/geo.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/components/lessons/topic-02/scale/geo.ts`:

```ts
// Geometry for the topic-02 scale scenes: WGS84 ↔ Web Mercator ↔ sheet units, true horizontal
// distances, and the reading-precision rules of the design spec (§5).
// Pure module with NO imports — it is loaded by Next and by Node scripts/tests
// (`node --experimental-strip-types`), so keep it free of runtime-only TS syntax (no enums).

export type LatLon = { lat: number; lon: number };
/** Point on a sheet: 0..1000 on both axes, origin at the north-west corner, y grows south. */
export type SheetPoint = { x: number; y: number };
/** EPSG:3857 box [minX, minY, maxX, maxY] in metres. */
export type Box3857 = [number, number, number, number];
export type SheetGeometry = {
  denominator: number;
  center: LatLon;
  groundWidthM: number;
  /** Side of the virtual printed sheet in cm (24 for every sheet). */
  sheetCm: number;
  bbox3857: Box3857;
};

const A = 6378137; // WGS84 semi-major axis = Web Mercator sphere radius
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const RAD = Math.PI / 180;

export const SHEET_UNITS = 1000;

export function toMerc(p: LatLon): [number, number] {
  return [A * p.lon * RAD, A * Math.log(Math.tan(Math.PI / 4 + (p.lat * RAD) / 2))];
}

export function fromMerc(x: number, y: number): LatLon {
  return { lat: (2 * Math.atan(Math.exp(y / A)) - Math.PI / 2) / RAD, lon: x / A / RAD };
}

/** Meridian (M) and prime-vertical (N) radii of curvature on WGS84. */
function radii(latDeg: number) {
  const s = Math.sin(latDeg * RAD);
  const w = 1 - E2 * s * s;
  return { M: (A * (1 - E2)) / Math.pow(w, 1.5), N: A / Math.sqrt(w) };
}

/** Square EPSG:3857 box centred on `center`, east–west ground width `groundWidthM` at the centre latitude. */
export function sheetBox(center: LatLon, groundWidthM: number): Box3857 {
  const { N } = radii(center.lat);
  const half = ((groundWidthM / (N * Math.cos(center.lat * RAD))) * A) / 2;
  const [cx, cy] = toMerc(center);
  return [cx - half, cy - half, cx + half, cy + half];
}

export function lonLatToSheet(sheet: { bbox3857: Box3857 }, p: LatLon): SheetPoint {
  const [x0, y0, x1, y1] = sheet.bbox3857;
  const [mx, my] = toMerc(p);
  return { x: ((mx - x0) / (x1 - x0)) * SHEET_UNITS, y: ((y1 - my) / (y1 - y0)) * SHEET_UNITS };
}

export function sheetToLonLat(sheet: { bbox3857: Box3857 }, q: SheetPoint): LatLon {
  const [x0, y0, x1, y1] = sheet.bbox3857;
  return fromMerc(x0 + (q.x / SHEET_UNITS) * (x1 - x0), y1 - (q.y / SHEET_UNITS) * (y1 - y0));
}

export function insideSheet(q: SheetPoint): boolean {
  return q.x >= 0 && q.x <= SHEET_UNITS && q.y >= 0 && q.y <= SHEET_UNITS;
}

/** Horizontal distance on the WGS84 ellipsoid, local radii at the mid-latitude (error < 1 m below 100 km). */
export function groundDistanceM(a: LatLon, b: LatLon): number {
  const mid = (a.lat + b.lat) / 2;
  const { M, N } = radii(mid);
  const dN = (b.lat - a.lat) * RAD * M;
  const dE = (b.lon - a.lon) * RAD * N * Math.cos(mid * RAD);
  return Math.hypot(dN, dE);
}

/** Length on the printed sheet (true scale), in cm. */
export function sheetCm(groundM: number, denominator: number): number {
  return (groundM / denominator) * 100;
}

/** What a careful reader gets from a ruler with millimetre marks. */
export function readCm(cm: number): number {
  return Math.round(cm * 10) / 10;
}

/** One millimetre on the sheet, on the ground. */
export function readingPrecisionM(denominator: number): number {
  return 0.001 * denominator;
}

export function metersPerSheetCm(denominator: number): number {
  return denominator / 100;
}

const nf = (digits: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits });

export function formatNumber(n: number, digits = 0): string {
  return nf(digits).format(n);
}

export function formatRatio(denominator: number): string {
  return `1:${formatNumber(denominator)}`;
}

/** "890 מ׳", "2.8 ק״מ" — rounded to `precisionM` first. */
export function formatDistance(m: number, precisionM = 1): string {
  const r = Math.round(m / precisionM) * precisionM;
  return r >= 1000 ? `${nf(3).format(r / 1000)} ק״מ` : `${nf(0).format(r)} מ׳`;
}

/** Parses a kilometre answer. Accepts "2.8", "2,8" (comma as decimal mark) and surrounding spaces. */
export function parseKm(text: string): number | null {
  const t = text.trim().replace(/\s+/g, '');
  if (!t) return null;
  const n = t.includes('.') ? t.replace(/,/g, '') : t.replace(',', '.');
  if (!/^\d*\.?\d+$/.test(n)) return null;
  return Number(n);
}

export type AnswerKind = 'correct' | 'over-precise' | 'unit' | 'denominator' | 'off' | 'invalid';
export type AnswerResult = { kind: AnswerKind; valueM?: number; factor?: number; otherDenominator?: number };

/**
 * Classifies a typed km answer against `expectedM` (reading × denominator).
 * Tolerance: max(1 mm on the sheet, 1 % of the target). A right value that is not a multiple of the
 * reading precision is accepted as "over-precise" (spec §5: no precision beyond 1 mm on the sheet).
 */
export function classifyAnswer(text: string, expectedM: number, denominator: number, others: readonly number[]): AnswerResult {
  const km = parseKm(text);
  if (km === null) return { kind: 'invalid' };
  const valueM = km * 1000;
  const precision = readingPrecisionM(denominator);
  const near = (target: number) => Math.abs(valueM - target) <= Math.max(precision, 0.01 * target);
  if (near(expectedM)) {
    const steps = valueM / precision;
    return { kind: Math.abs(steps - Math.round(steps)) < 1e-6 ? 'correct' : 'over-precise', valueM };
  }
  for (const factor of [10, 100, 1000, 0.1, 0.01, 0.001]) {
    if (near(expectedM * factor)) return { kind: 'unit', valueM, factor };
  }
  for (const other of others) {
    if (other !== denominator && near((expectedM * other) / denominator)) {
      return { kind: 'denominator', valueM, otherDenominator: other };
    }
  }
  return { kind: 'off', valueM };
}

/** Minimum number of sheets of `groundWidthM` that a box around `points` needs (grid aligned to the box). */
export function sheetsNeeded(points: readonly LatLon[], groundWidthM: number): number {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const lat0 = Math.min(...lats);
  const lat1 = Math.max(...lats);
  const mid = (lat0 + lat1) / 2;
  const w = groundDistanceM({ lat: mid, lon: Math.min(...lons) }, { lat: mid, lon: Math.max(...lons) });
  const h = groundDistanceM({ lat: lat0, lon: lons[0] }, { lat: lat1, lon: lons[0] });
  return Math.max(1, Math.ceil(w / groundWidthM)) * Math.max(1, Math.ceil(h / groundWidthM));
}

const NICE = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000];

/** Round scale-bar length closest (in ratio) to `targetPx` on screen. */
export function niceScaleBar(metersPerPx: number, targetPx: number): { meters: number; px: number } {
  const target = metersPerPx * targetPx;
  const meters = NICE.reduce((a, b) => (Math.abs(Math.log(b / target)) < Math.abs(Math.log(a / target)) ? b : a));
  return { meters, px: meters / metersPerPx };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test scripts/qa/scale-geo.test.mjs`
Expected: all tests PASS (12 tests, 0 failures).

- [ ] **Step 5: Checkpoint**

Run: `git status --short src/components/lessons/topic-02/scale scripts/qa/scale-geo.test.mjs`
Expected: exactly these two new files. No commit.

---

### Task 2: Generate the three map sheets

**Files:**
- Create: `scripts/maps/build-scale-sheets.mjs`
- Generated: `public/assets/lessons/topic02/scene-scale/sheets/{10k,50k,250k}-{ortho,map}.webp`, `src/components/lessons/topic-02/scale/scaleSheets.data.ts`

**Interfaces:**
- Consumes: `sheetBox`, `fromMerc` from `geo.ts` (Task 1).
- Produces (generated file exports): `type SheetId = '10k' | '50k' | '250k'`, `type SheetMeta = SheetGeometry & { id: SheetId; corners: { sw: LatLon; ne: LatLon }; ortho: { src: string; px: number }; map: { src: string; px: number; zoom: number } }`, `SHEET_IDS: readonly SheetId[]` (order `10k, 50k, 250k`), `SHEETS: Record<SheetId, SheetMeta>`, `ATTRIBUTION: { ortho: string; map: string }`. `src` values are root-relative (`/assets/...`) — prefix with `asset()` (Task 4) when rendering.

- [ ] **Step 1: Write the script**

Create `scripts/maps/build-scale-sheets.mjs`:

```js
#!/usr/bin/env node
// Builds the three nested map sheets for the topic-02 scale scenes
// (docs/superpowers/specs/2026-10-08-scale-scene-redesign-design.md §4).
// Each sheet = one EPSG:3857 square box; the orthophoto and the topographic map are cut to the SAME box,
// so they register by construction.
// Run: node --experimental-strip-types scripts/maps/build-scale-sheets.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fromMerc, sheetBox } from '../../src/components/lessons/topic-02/scale/geo.ts';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const CENTER = { lat: 32.687, lon: 35.39 }; // Mount Tavor (spec §3)
const SHEETS = [
  { id: '10k', denominator: 10000, groundWidthM: 2400, zoom: 15 },
  { id: '50k', denominator: 50000, groundWidthM: 12000, zoom: 13 },
  { id: '250k', denominator: 250000, groundWidthM: 60000, zoom: 11 },
];
const ORTHO_PX = 1600;
const ORIGIN = 20037508.342789244;
const OUT_DIR = 'public/assets/lessons/topic02/scene-scale/sheets';
const PUBLIC_PREFIX = '/assets/lessons/topic02/scene-scale/sheets';
const DATA_FILE = 'src/components/lessons/topic-02/scale/scaleSheets.data.ts';
const CACHE = join(tmpdir(), 'geo-scale-sheets-cache');
const UA = 'geoInteractive-course/1.0 (educational map sheets)';
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';
const IHM = (z, x, y) => `https://israelhiking.osm.org.il/Hebrew/Tiles/${z}/${x}/${y}.png`;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(CACHE, { recursive: true });

async function fetchCached(url, file) {
  if (existsSync(file)) return readFileSync(file);
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer()); // 204 → empty buffer (no tile)
      writeFileSync(file, buf);
      return buf;
    }
    if (attempt === 3) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function buildOrtho(s, box) {
  const url = `${ESRI}?bbox=${box.join(',')}&bboxSR=3857&imageSR=3857&size=${ORTHO_PX},${ORTHO_PX}&format=jpg&f=image`;
  const buf = await fetchCached(url, join(CACHE, `esri-${s.id}.jpg`));
  const meta = await sharp(buf).metadata();
  if (meta.width !== ORTHO_PX || meta.height !== ORTHO_PX) throw new Error(`esri ${s.id}: ${meta.width}x${meta.height}`);
  await sharp(buf).webp({ quality: 82 }).toFile(join(OUT_DIR, `${s.id}-ortho.webp`));
  return ORTHO_PX;
}

async function buildMap(s, box) {
  const res = (2 * ORIGIN) / (256 * 2 ** s.zoom);
  const px0 = (box[0] + ORIGIN) / res;
  const px1 = (box[2] + ORIGIN) / res;
  const py0 = (ORIGIN - box[3]) / res;
  const tx0 = Math.floor(px0 / 256);
  const tx1 = Math.floor(px1 / 256);
  const ty0 = Math.floor(py0 / 256);
  const ty1 = Math.floor((ORIGIN - box[1]) / res / 256);
  const tiles = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const buf = await fetchCached(IHM(s.zoom, tx, ty), join(CACHE, `ihm-${s.zoom}-${tx}-${ty}.png`));
      if (!buf.length) continue;
      tiles.push({ input: await sharp(buf).png().toBuffer(), left: (tx - tx0) * 256, top: (ty - ty0) * 256 });
      await new Promise((r) => setTimeout(r, 60)); // be polite to the tile server
    }
  }
  const mosaic = await sharp({
    create: { width: (tx1 - tx0 + 1) * 256, height: (ty1 - ty0 + 1) * 256, channels: 4, background: '#ffffff' },
  }).composite(tiles).png().toBuffer();
  const side = Math.round(px1 - px0);
  await sharp(mosaic)
    .extract({ left: Math.round(px0 - tx0 * 256), top: Math.round(py0 - ty0 * 256), width: side, height: side })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 90 })
    .toFile(join(OUT_DIR, `${s.id}-map.webp`));
  return side;
}

const entries = [];
for (const s of SHEETS) {
  const box = sheetBox(CENTER, s.groundWidthM);
  const orthoPx = await buildOrtho(s, box);
  const mapPx = await buildMap(s, box);
  const sw = fromMerc(box[0], box[1]);
  const ne = fromMerc(box[2], box[3]);
  console.log(`[sheet] ${s.id}: ortho ${orthoPx}px, map ${mapPx}px (IHM z${s.zoom})`);
  entries.push(`  '${s.id}': {
    id: '${s.id}',
    denominator: ${s.denominator},
    center: { lat: ${CENTER.lat}, lon: ${CENTER.lon} },
    groundWidthM: ${s.groundWidthM},
    sheetCm: 24,
    bbox3857: [${box.map((v) => v.toFixed(3)).join(', ')}],
    corners: { sw: { lat: ${sw.lat.toFixed(6)}, lon: ${sw.lon.toFixed(6)} }, ne: { lat: ${ne.lat.toFixed(6)}, lon: ${ne.lon.toFixed(6)} } },
    ortho: { src: '${PUBLIC_PREFIX}/${s.id}-ortho.webp', px: ${orthoPx} },
    map: { src: '${PUBLIC_PREFIX}/${s.id}-map.webp', px: ${mapPx}, zoom: ${s.zoom} },
  },`);
}

const date = new Date().toISOString().slice(0, 10);
writeFileSync(DATA_FILE, `// GENERATED by scripts/maps/build-scale-sheets.mjs on ${date} — do not edit by hand.
// Orthophoto: Esri World Imagery (MapServer/export, EPSG:3857). Map: Israel Hiking Map Hebrew tiles
// (CC BY-NC-SA 3.0), mosaicked and cut to the same EPSG:3857 box. Sheets are 24 × 24 cm at their scale.
import type { LatLon, SheetGeometry } from './geo';

export type SheetId = '10k' | '50k' | '250k';
export type SheetMeta = SheetGeometry & {
  id: SheetId;
  corners: { sw: LatLon; ne: LatLon };
  ortho: { src: string; px: number };
  map: { src: string; px: number; zoom: number };
};

export const SHEET_IDS: readonly SheetId[] = ['10k', '50k', '250k'];

export const SHEETS: Record<SheetId, SheetMeta> = {
${entries.join('\n')}
};

export const ATTRIBUTION = {
  ortho: 'תצ״א: Esri, Maxar, Earthstar Geographics',
  map: 'מפה: Israel Hiking Map · © תורמי OpenStreetMap · CC BY-NC-SA 3.0',
} as const;
`);
console.log(`[data] ${DATA_FILE}`);
```

- [ ] **Step 2: Run it**

Run: `node --experimental-strip-types scripts/maps/build-scale-sheets.mjs`
Expected output (pixel counts may differ by ±1):
```
[sheet] 10k: ortho 1600px, map 597px (IHM z15)
[sheet] 50k: ortho 1600px, map 746px (IHM z13)
[sheet] 250k: ortho 1600px, map 933px (IHM z11)
[data] src/components/lessons/topic-02/scale/scaleSheets.data.ts
```
If a request fails with 429/5xx after 3 attempts, wait one minute and re-run — completed tiles are cached in the OS temp dir.

- [ ] **Step 3: Look at the six rasters**

Open each `public/assets/lessons/topic02/scene-scale/sheets/*.webp` with the Read tool. Expected: 10k shows Mount Tavor filling the frame with the summit buildings and the hairpin road; 50k shows the mountain mid-frame with Shibli, Daburia and Kfar Tavor; 250k shows the Kinneret at upper right. Map and photo of the same sheet show the same ground. If not, stop and debug the crop arithmetic before continuing.

- [ ] **Step 4: Type-check the generated file**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "topic-02/scale/"`
Expected: no output.

- [ ] **Step 5: Checkpoint**

Run: `git status --short scripts/maps public/assets/lessons/topic02/scene-scale/sheets src/components/lessons/topic-02/scale`
Expected: the script, 6 webp files, `scaleSheets.data.ts` (plus Task 1 files). No commit.

---

### Task 3: Content data, choice evaluation, and verification crops — TDD

**Files:**
- Create: `src/components/lessons/topic-02/scale/scaleContent.data.ts`
- Create: `src/components/lessons/topic-02/scale/choose.ts`
- Create: `scripts/maps/check-scale-sheets.mjs`
- Test: `scripts/qa/scale-content.test.mjs`

**Interfaces:**
- Consumes: `geo.ts` (Task 1), `scaleSheets.data.ts` (Task 2).
- Produces:
  - `type Landmark = LatLon & { name: string; source: string }`, `LANDMARKS` (ids: `summit, basilica, shibli, road7266, route65, kinneret, reservoir, einDor, einKishyon, kfarTavor, afula, tiberias`), `type LandmarkId`
  - `type SpotRow = { id: LandmarkId; label: string; shownOn: readonly SheetId[] }`, `SPOT_ROWS`
  - `GUIDED_PAIR: readonly [LandmarkId, LandmarkId]`
  - `type PracticeTarget = { id: LandmarkId; radiusM: number; prompt: string; hint: string }`, `PRACTICE: { sheet: SheetId; targets: readonly [PracticeTarget, PracticeTarget]; choices: readonly LandmarkId[] }`
  - `type ScenarioId = 'local' | 'navigation' | 'regional'`, `type Need = { label: string; shownOn: readonly SheetId[] }`, `type Scenario = { id: ScenarioId; title: string; task: string; points: readonly LandmarkId[]; area?: readonly [LatLon, LatLon]; needs: readonly Need[]; target: SheetId; success: string }`, `SCENARIOS`
  - `type MythId = 'village' | 'road' | 'spring' | 'route65'`, `type MythOption = { id: MythId; label: string; at: LandmarkId; onlyDetailed: boolean }`, `MYTH_OPTIONS`
  - `choose.ts`: `type ChoiceEval = { covered: boolean; sheetsNeeded: number; missing: string[]; correct: boolean }`, `type ChooseGeo = { lonLatToSheet; insideSheet; sheetsNeeded }`, `scenarioPoints(s: Scenario, landmarks: Record<LandmarkId, Landmark>): LatLon[]`, `evaluateChoice(s: Scenario, sheet: SheetMeta, landmarks: Record<LandmarkId, Landmark>, geo: ChooseGeo): ChoiceEval` — callers pass `import * as geo from './geo'`. (`choose.ts` has only *type* imports: Node's type stripping cannot resolve extensionless value imports, and Next/tsc reject `.ts` specifiers, so the geometry is injected.)

- [ ] **Step 1: Write the failing test**

Create `scripts/qa/scale-content.test.mjs`:

```js
// Consistency tests for the scale scenes' content against the generated sheets (spec §4.3).
// Run: node --experimental-strip-types --test scripts/qa/scale-content.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEETS, SHEET_IDS } from '../../src/components/lessons/topic-02/scale/scaleSheets.data.ts';
import {
  LANDMARKS, SPOT_ROWS, GUIDED_PAIR, PRACTICE, SCENARIOS, MYTH_OPTIONS,
} from '../../src/components/lessons/topic-02/scale/scaleContent.data.ts';
import { evaluateChoice } from '../../src/components/lessons/topic-02/scale/choose.ts';
import * as geo from '../../src/components/lessons/topic-02/scale/geo.ts';

const { groundDistanceM, insideSheet, lonLatToSheet, sheetBox } = geo;
const inside = (id, lm) => insideSheet(lonLatToSheet(SHEETS[id], lm));

test('generated bounds match the geometry module', () => {
  for (const id of SHEET_IDS) {
    const s = SHEETS[id];
    sheetBox(s.center, s.groundWidthM).forEach((v, i) => assert.ok(Math.abs(v - s.bbox3857[i]) < 0.01, `${id}[${i}]`));
  }
});

test('every "shown" flag sits inside that sheet', () => {
  for (const row of SPOT_ROWS) for (const id of row.shownOn) assert.ok(inside(id, LANDMARKS[row.id]), `${row.id} on ${id}`);
});

test('the table teaches both failure modes: each column has a shown, and some cell is hidden and some outside', () => {
  const states = [];
  for (const row of SPOT_ROWS) for (const id of SHEET_IDS) {
    states.push(!inside(id, LANDMARKS[row.id]) ? 'outside' : row.shownOn.includes(id) ? 'shown' : 'hidden');
  }
  for (const id of SHEET_IDS) assert.ok(SPOT_ROWS.some((r) => r.shownOn.includes(id)), `nothing shown on ${id}`);
  assert.ok(states.includes('hidden'));
  assert.ok(states.includes('outside'));
});

test('guided pair lies inside all three sheets', () => {
  for (const id of SHEET_IDS) for (const lm of GUIDED_PAIR) assert.ok(inside(id, LANDMARKS[lm]), `${lm} on ${id}`);
});

test('practice targets lie inside the practice sheet and are > 2 km apart', () => {
  const [a, b] = PRACTICE.targets;
  assert.ok(inside(PRACTICE.sheet, LANDMARKS[a.id]) && inside(PRACTICE.sheet, LANDMARKS[b.id]));
  assert.ok(groundDistanceM(LANDMARKS[a.id], LANDMARKS[b.id]) > 2000);
  for (const id of PRACTICE.choices) assert.ok(inside(PRACTICE.sheet, LANDMARKS[id]), `choice ${id}`);
});

test('each scenario: the target sheet covers the task and shows every need; every other sheet has a reason', () => {
  for (const s of SCENARIOS) {
    const t = evaluateChoice(s, SHEETS[s.target], LANDMARKS, geo);
    assert.ok(t.correct && t.covered && t.missing.length === 0, `${s.id} target`);
    for (const id of SHEET_IDS) {
      if (id === s.target) continue;
      const e = evaluateChoice(s, SHEETS[id], LANDMARKS, geo);
      assert.ok(!e.correct && (!e.covered || e.missing.length > 0), `${s.id} on ${id} has no reason`);
    }
  }
});

test('myth options sit inside the 1:50,000 sheet; at least one is a distractor', () => {
  for (const o of MYTH_OPTIONS) assert.ok(inside('50k', LANDMARKS[o.at]), o.id);
  assert.ok(MYTH_OPTIONS.some((o) => !o.onlyDetailed));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test scripts/qa/scale-content.test.mjs`
Expected: FAIL — `Cannot find module ... scaleContent.data.ts`.

- [ ] **Step 3: Write the content data**

Create `src/components/lessons/topic-02/scale/scaleContent.data.ts`:

```ts
// Learner-facing content of the scale scenes, in WGS84. Every coordinate names its source; every
// "shownOn" flag was checked on the generated rasters (scripts/maps/check-scale-sheets.mjs crops).
import type { LatLon } from './geo';
import type { SheetId } from './scaleSheets.data';

export type Landmark = LatLon & { name: string; source: string };

export const LANDMARKS = {
  summit: { lat: 32.68711, lon: 35.38962, name: 'פסגת הר תבור', source: 'OSM node 3663541539 (natural=peak, ele=557)' },
  basilica: { lat: 32.68626, lon: 35.39242, name: 'כנסיית ההשתנות', source: 'OSM way 255793567 (centre)' },
  shibli: { lat: 32.69372, lon: 35.396, name: 'שיבלי', source: 'OSM node 278476277 (place=village)' },
  road7266: { lat: 32.68983, lon: 35.38154, name: 'הדרך המתפתלת לפסגה', source: 'OSM way 202703846 (ref=7266, midpoint)' },
  route65: { lat: 32.69027, lon: 35.4189, name: 'כביש 65', source: 'OSM way 220996075 (ref=65, midpoint)' },
  kinneret: { lat: 32.8333, lon: 35.5833, name: 'הכנרת', source: 'Sea of Galilee 32°50′N 35°35′E (Wikipedia)' },
  reservoir: { lat: 32.66323, lon: 35.38019, name: 'המאגר שמדרום להר', source: 'OSM way 80859302 (natural=water)' },
  einDor: { lat: 32.65625, lon: 35.41704, name: 'עין דור', source: 'OSM node 278474123 (place=village)' },
  einKishyon: { lat: 32.66174, lon: 35.39567, name: 'עין קישיון', source: 'OSM node 7875569985 (natural=spring)' },
  kfarTavor: { lat: 32.68781, lon: 35.42042, name: 'כפר תבור', source: 'OSM node 278473207 (place=village)' },
  afula: { lat: 32.60756, lon: 35.28909, name: 'עפולה', source: 'OSM node 278477139 (place=town)' },
  tiberias: { lat: 32.79385, lon: 35.53286, name: 'טבריה', source: 'OSM node 278473513 (place=town)' },
} satisfies Record<string, Landmark>;

export type LandmarkId = keyof typeof LANDMARKS;

/** Screen A — "what can you identify on the map?" Outside-the-sheet is computed, not stored. */
export type SpotRow = { id: LandmarkId; label: string; shownOn: readonly SheetId[] };
export const SPOT_ROWS: readonly SpotRow[] = [
  { id: 'basilica', label: 'מבנים בודדים בפסגה', shownOn: ['10k'] },
  { id: 'road7266', label: 'הדרך המתפתלת לפסגה', shownOn: ['10k', '50k'] },
  { id: 'shibli', label: 'הכפר שיבלי', shownOn: ['10k', '50k'] },
  { id: 'route65', label: 'כביש 65', shownOn: ['50k', '250k'] },
  { id: 'kinneret', label: 'הכנרת', shownOn: ['250k'] },
];

/** Screen B — guided example. */
export const GUIDED_PAIR: readonly [LandmarkId, LandmarkId] = ['basilica', 'shibli'];

/** Screen B — practice on 1:50,000: identify both in the orthophoto, then measure on the map. */
export type PracticeTarget = { id: LandmarkId; radiusM: number; prompt: string; hint: string };
export const PRACTICE: { sheet: SheetId; targets: readonly [PracticeTarget, PracticeTarget]; choices: readonly LandmarkId[] } = {
  sheet: '50k',
  targets: [
    { id: 'summit', radiusM: 400, prompt: 'פסגת הר תבור', hint: 'חפשו את ראש ההר המיוער שבמרכז המפה.' },
    { id: 'reservoir', radiusM: 250, prompt: 'המאגר שמדרום להר', hint: 'חפשו בריכות מים כהות בין השדות, דרומית להר.' },
  ],
  choices: ['summit', 'reservoir', 'shibli', 'kfarTavor', 'einDor'],
};

/** Screen C — which map fits the task? */
export type ScenarioId = 'local' | 'navigation' | 'regional';
export type Need = { label: string; shownOn: readonly SheetId[] };
export type Scenario = {
  id: ScenarioId;
  title: string;
  task: string;
  points: readonly LandmarkId[];
  area?: readonly [LatLon, LatLon];
  needs: readonly Need[];
  target: SheetId;
  success: string;
};
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'local',
    title: 'תכנון מקומי',
    task: 'מתכננים תנועה רגלית בין המבנים במתחם הפסגה של הר תבור.',
    points: ['basilica'],
    area: [{ lat: 32.6855, lon: 35.388 }, { lat: 32.689, lon: 35.3935 }],
    needs: [{ label: 'המבנים הבודדים', shownOn: ['10k'] }],
    target: '10k',
    success: 'רק במפה 1:10,000 מצויר כל מבנה במתחם, והמתחם כולו נכנס בקטע אחד. זו המפה לתכנון תנועה בין מבנים.',
  },
  {
    id: 'navigation',
    title: 'ניווט',
    task: 'ניווט רגלי מעין דור אל פסגת הר תבור, בדרכי עפר ובשבילים.',
    points: ['einDor', 'summit'],
    needs: [
      { label: 'דרכי העפר', shownOn: ['10k', '50k'] },
      { label: 'המעיינות שבדרך', shownOn: ['10k', '50k'] },
    ],
    target: '50k',
    success: 'מפה 1:50,000 מכסה את כל הציר בקטע אחד, ומציגה את דרכי העפר והמעיינות שהנווט צריך.',
  },
  {
    id: 'regional',
    title: 'תכנון אזורי',
    task: 'מתכננים תנועה של כוח מעפולה לטבריה.',
    points: ['afula', 'tiberias'],
    needs: [{ label: 'הכבישים הראשיים', shownOn: ['10k', '50k', '250k'] }],
    target: '250k',
    success: 'רק מפה 1:250,000 מכילה את כל האזור בקטע אחד, והכבישים הראשיים שצריך לתכנון מוצגים בה.',
  },
];

/** Screen D — what appears only on the real 1:50,000 (vs 1:250,000 enlarged ×5)? */
export type MythId = 'village' | 'road' | 'spring' | 'route65';
export type MythOption = { id: MythId; label: string; at: LandmarkId; onlyDetailed: boolean };
export const MYTH_OPTIONS: readonly MythOption[] = [
  { id: 'village', label: 'שמות של כפרים קטנים, כמו שיבלי', at: 'shibli', onlyDetailed: true },
  { id: 'road', label: 'הדרך המתפתלת לפסגת ההר', at: 'road7266', onlyDetailed: true },
  { id: 'spring', label: 'מעיינות, כמו עין קישיון', at: 'einKishyon', onlyDetailed: true },
  { id: 'route65', label: 'כביש 65', at: 'route65', onlyDetailed: false },
];
```

- [ ] **Step 4: Write the evaluation module**

Create `src/components/lessons/topic-02/scale/choose.ts`. It has **type imports only**: Node's type stripping cannot resolve extensionless value imports (`'./geo'`), and Next/tsc reject `.ts` specifiers — so the geometry functions are passed in (components pass `import * as geo from './geo'`; the test passes the `geo.ts` namespace).

```ts
// Evaluates a map choice for a screen-C scenario. Pure; the geometry is injected so Node tests can run it.
import type { LatLon, SheetPoint } from './geo';
import type { Landmark, LandmarkId, Scenario } from './scaleContent.data';
import type { SheetMeta } from './scaleSheets.data';

export type ChoiceEval = { covered: boolean; sheetsNeeded: number; missing: string[]; correct: boolean };
export type ChooseGeo = {
  lonLatToSheet: (sheet: SheetMeta, p: LatLon) => SheetPoint;
  insideSheet: (q: SheetPoint) => boolean;
  sheetsNeeded: (points: readonly LatLon[], groundWidthM: number) => number;
};

export function scenarioPoints(s: Scenario, landmarks: Record<LandmarkId, Landmark>): LatLon[] {
  return [...s.points.map((id) => landmarks[id]), ...(s.area ?? [])];
}

export function evaluateChoice(
  s: Scenario,
  sheet: SheetMeta,
  landmarks: Record<LandmarkId, Landmark>,
  geo: ChooseGeo,
): ChoiceEval {
  const pts = scenarioPoints(s, landmarks);
  const covered = pts.every((p) => geo.insideSheet(geo.lonLatToSheet(sheet, p)));
  const missing = s.needs.filter((n) => !n.shownOn.includes(sheet.id)).map((n) => n.label);
  return { covered, sheetsNeeded: geo.sheetsNeeded(pts, sheet.groundWidthM), missing, correct: sheet.id === s.target };
}
```

- [ ] **Step 5: Run the content tests**

Run: `node --experimental-strip-types --test scripts/qa/scale-content.test.mjs`
Expected: 7 tests PASS. If "the target sheet covers the task" fails for `local`, check the `area` corners against the 10k sheet's `corners` in `scaleSheets.data.ts`.

- [ ] **Step 6: Write the verification-crop script**

Create `scripts/maps/check-scale-sheets.mjs`:

```js
// Checks the generated sheets against their data (spec §10.2) and writes crops for eye review:
//  - registration/<sheet>-<landmark>.png : orthophoto | map, same window, crosshair on the landmark
//  - registration/myth-250k-x5.png vs myth-50k.png : screen D's two sides at the same size
// Run: node --experimental-strip-types scripts/maps/check-scale-sheets.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SHEETS, SHEET_IDS } from '../../src/components/lessons/topic-02/scale/scaleSheets.data.ts';
import { LANDMARKS } from '../../src/components/lessons/topic-02/scale/scaleContent.data.ts';
import { insideSheet, lonLatToSheet, sheetBox } from '../../src/components/lessons/topic-02/scale/geo.ts';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));
const OUT = 'design/screenshots/scale-redesign/registration';
mkdirSync(OUT, { recursive: true });
const N = 1200;
const WIN = 220;
let failures = 0;
const fail = (m) => { failures++; console.log(`FAIL ${m}`); };

for (const id of SHEET_IDS) {
  const s = SHEETS[id];
  sheetBox(s.center, s.groundWidthM).forEach((v, i) => { if (Math.abs(v - s.bbox3857[i]) > 0.01) fail(`${id} bbox[${i}]`); });
  const imgs = {};
  for (const [k, layer] of [['ortho', s.ortho], ['map', s.map]]) {
    const f = join('public', layer.src);
    if (!existsSync(f)) { fail(`${id} missing ${f}`); continue; }
    const meta = await sharp(f).metadata();
    if (meta.width !== layer.px || meta.height !== layer.px) fail(`${id} ${k} ${meta.width}x${meta.height} ≠ ${layer.px}`);
    imgs[k] = await sharp(f).resize(N, N).png().toBuffer();
  }
  if (!imgs.ortho || !imgs.map) continue;
  for (const [name, lm] of Object.entries(LANDMARKS)) {
    const q = lonLatToSheet(s, lm);
    if (!insideSheet(q)) continue;
    const cx = Math.round((q.x / 1000) * N);
    const cy = Math.round((q.y / 1000) * N);
    const left = Math.min(N - WIN, Math.max(0, cx - WIN / 2));
    const top = Math.min(N - WIN, Math.max(0, cy - WIN / 2));
    const x = cx - left;
    const y = cy - top;
    const mark = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIN}" height="${WIN}"><g stroke="#ff00ff" stroke-width="2" fill="none"><circle cx="${x}" cy="${y}" r="10"/><line x1="${x - 18}" y1="${y}" x2="${x + 18}" y2="${y}"/><line x1="${x}" y1="${y - 18}" x2="${x}" y2="${y + 18}"/></g></svg>`);
    const crop = (buf) => sharp(buf).extract({ left, top, width: WIN, height: WIN }).composite([{ input: mark }]).png().toBuffer();
    await sharp({ create: { width: WIN * 2 + 8, height: WIN, channels: 3, background: '#F3E9DC' } })
      .composite([{ input: await crop(imgs.ortho), left: 0, top: 0 }, { input: await crop(imgs.map), left: WIN + 8, top: 0 }])
      .png()
      .toFile(join(OUT, `${id}-${name}.png`));
  }
}

// Screen D: the central fifth of the 1:250,000 map enlarged ×5, next to the real 1:50,000 map.
const m250 = join('public', SHEETS['250k'].map.src);
const m50 = join('public', SHEETS['50k'].map.src);
const px250 = SHEETS['250k'].map.px;
const fifth = Math.round(px250 / 5);
await sharp(m250).extract({ left: Math.round((px250 - fifth) / 2), top: Math.round((px250 - fifth) / 2), width: fifth, height: fifth })
  .resize(N, N, { kernel: 'cubic' }).png().toFile(join(OUT, 'myth-250k-x5.png'));
await sharp(m50).resize(N, N).png().toFile(join(OUT, 'myth-50k.png'));

console.log(failures ? `${failures} failure(s)` : 'sheets OK');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 7: Run it and review the crops**

Run: `node --experimental-strip-types scripts/maps/check-scale-sheets.mjs`
Expected: `sheets OK`, and PNGs in `design/screenshots/scale-redesign/registration/`.

Open with the Read tool, at minimum: `10k-basilica`, `10k-shibli`, `10k-road7266`, `50k-summit`, `50k-reservoir`, `50k-shibli`, `50k-route65`, `50k-einKishyon`, `250k-shibli`, `250k-road7266`, `250k-route65`, `250k-kinneret`, `250k-afula`, `250k-tiberias`, `myth-250k-x5`, `myth-50k`.

Confirm, and record the result in your task report:
1. **Registration:** in every pair the crosshair sits on the same ground feature in both halves (offset ≤ ~2 px at this size).
2. **SPOT_ROWS flags:** basilica buildings drawn on 10k only; road 7266 drawn on 10k and 50k, absent on 250k; "שיבלי" labelled on 10k and 50k, not on 250k; Route 65 drawn on 50k and 250k; Kinneret on 250k.
3. **Scenario needs:** dirt roads and springs (e.g. עין קישיון) visible on the 50k map, absent on the 250k map (open the full `250k-map.webp` too); main roads visible on all three.
4. **MYTH_OPTIONS:** in `myth-50k` vs `myth-250k-x5`, Shibli's name, the summit road and the spring appear only in the 1:50,000; Route 65 appears in both.

If a flag is wrong, change the flag in `scaleContent.data.ts` (never the image), re-run Step 5 and note the change for the assumptions log (Task 9). If a MYTH option turns out to appear in both, swap its `onlyDetailed` to `false` only if at least one `true` option remains; otherwise replace the option with another landmark that the crops show only on 1:50,000.

- [ ] **Step 8: Checkpoint**

Run: `node --experimental-strip-types --test scripts/qa/scale-geo.test.mjs scripts/qa/scale-content.test.mjs` → all PASS. `git status --short` shows only this plan's files. No commit.

---

### Task 4: Shared viewport — view math (TDD), hook, overlay parts, controls, layers, `SheetViewport`

**Files:**
- Create: `src/components/lessons/topic-02/scale/viewMath.ts`
- Create: `src/components/lessons/topic-02/scale/useMapView.ts`
- Create: `src/components/lessons/topic-02/scale/overlayParts.tsx`
- Create: `src/components/lessons/topic-02/scale/controls.tsx`
- Create: `src/components/lessons/topic-02/scale/layers.ts`
- Create: `src/components/lessons/topic-02/scale/SheetViewport.tsx`
- Test: `scripts/qa/scale-view.test.mjs`

**Interfaces:**
- Consumes: `geo.ts`, `scaleSheets.data.ts`.
- Produces:
  - `viewMath.ts`: `type View = { k: number; x: number; y: number }`, `IDENTITY`, `clampView(v, size, min, max)`, `zoomAt(v, factor, sx, sy, size, min, max)`, `panView(v, dx, dy, size, min, max)`, `screenToUnits(v, sx, sy, size): SheetPoint`
  - `useMapView.ts`: `MIN_K = 1`, `MAX_K = 3`, `useMapView(ref)` → `{ view, size, zoomBy(factor), panBy(dx, dy), reset(), resetNow(), toUnits(clientX, clientY): SheetPoint, wasDragged(): boolean, handlers }`
  - `overlayParts.tsx`: `ACCENT`, `INK`, `PAPER`, `HAIRLINE`, `Marker({ p, ppu, qa? })`, `Label({ p, ppu, text, dy?, qa? })`, `Pulse({ p, ppu })`
  - `controls.tsx`: `T1`, `T1_INTRO`, `T3`, `T5`, `T6`, `INSET`, `OPTION_BASE`, `OPTION_ACTIVE`, `OPTION_IDLE`, `FOCUS_RING`, `useRovingKeys(ids, value, onSelect)`, `type ViewMode = 'map' | 'ortho' | 'compare'`, `ViewModeToggle({ value, onChange })`, `SheetPicker({ value, onChange, controls?, done? })`, `NumberBadge({ n, active })`
  - `layers.ts`: `asset(src)`, `layersFor(sheet, mode) → { base: LayerSpec; top: LayerSpec; display: 'base' | 'top' | 'curtain'; attribution: string }`, `preloadFor(ids) → string[]`, `CURTAIN_LABELS = { left: 'תצ״א', right: 'מפה' }`
  - `SheetViewport.tsx`: `type LayerSpec = { key: string; src: string; magnify?: number }`, `type OverlayContext = { k: number; ppu: number; toUnits: (clientX: number, clientY: number) => SheetPoint }`, `type CurtainProps = { value: number; onChange: (v: number) => void; leftLabel: string; rightLabel: string }`, `SheetViewport(props)` with props `{ id?, label, sheetKey, groundWidthM, base, top, display, curtain?, attribution, preload?, onPick?, overlay?, note? }`. DOM hooks for QA: `data-qa="sheet-viewport"`, `data-view="k,x,y"`, ghost `data-qa="morph-ghost"`.

- [ ] **Step 1: Write the failing view-math test**

Create `scripts/qa/scale-view.test.mjs`:

```js
// Unit tests for the sheet viewport's zoom/pan math.
// Run: node --experimental-strip-types --test scripts/qa/scale-view.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITY, clampView, zoomAt, panView, screenToUnits } from '../../src/components/lessons/topic-02/scale/viewMath.ts';

const S = 600;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('clamp keeps k in range and never shows empty space', () => {
  assert.deepEqual(clampView({ k: 0.5, x: 10, y: 10 }, S, 1, 3), { k: 1, x: 0, y: 0 });
  const v = clampView({ k: 2, x: -5000, y: 50 }, S, 1, 3);
  assert.deepEqual(v, { k: 2, x: S - S * 2, y: 0 });
});

test('zoomAt keeps the anchor point fixed', () => {
  const before = screenToUnits(IDENTITY, 150, 420, S);
  const v = zoomAt(IDENTITY, 2, 150, 420, S, 1, 3);
  const after = screenToUnits(v, 150, 420, S);
  close(after.x, before.x);
  close(after.y, before.y);
  assert.equal(v.k, 2);
});

test('panning at k=1 is a no-op; at k=2 it moves and clamps', () => {
  assert.deepEqual(panView(IDENTITY, 40, -40, S, 1, 3), IDENTITY);
  const v = panView({ k: 2, x: -300, y: -300 }, 40, -40, S, 1, 3);
  assert.deepEqual(v, { k: 2, x: -260, y: -340 });
});

test('screenToUnits maps the centre to 500,500 at identity', () => {
  assert.deepEqual(screenToUnits(IDENTITY, 300, 300, S), { x: 500, y: 500 });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --experimental-strip-types --test scripts/qa/scale-view.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `viewMath.ts`**

```ts
// Zoom/pan math for the square sheet viewport, ported from the terrain-overlay prototype's useZoomPan.
// One transform `translate(x, y) scale(k)`, origin 0 0, is applied to every layer and to the overlay:
//   screen = (unit / 1000) * size * k + offset
// Pure module with no imports (Node tests load it directly).

export type View = { k: number; x: number; y: number };
export const IDENTITY: View = { k: 1, x: 0, y: 0 };

/** The world must cover the square at all times. */
export function clampView(v: View, size: number, min: number, max: number): View {
  const k = Math.min(max, Math.max(min, v.k));
  const lo = size - size * k;
  return { k, x: Math.min(0, Math.max(lo, v.x)), y: Math.min(0, Math.max(lo, v.y)) };
}

/** Zoom by `factor` keeping the screen point (sx, sy) fixed. */
export function zoomAt(v: View, factor: number, sx: number, sy: number, size: number, min: number, max: number): View {
  const k = Math.min(max, Math.max(min, v.k * factor));
  const r = k / v.k;
  return clampView({ k, x: sx - (sx - v.x) * r, y: sy - (sy - v.y) * r }, size, min, max);
}

export function panView(v: View, dx: number, dy: number, size: number, min: number, max: number): View {
  return clampView({ k: v.k, x: v.x + dx, y: v.y + dy }, size, min, max);
}

/** Screen px relative to the viewport's top-left → sheet units (0..1000). */
export function screenToUnits(v: View, sx: number, sy: number, size: number): { x: number; y: number } {
  return { x: ((sx - v.x) / (size * v.k)) * 1000, y: ((sy - v.y) / (size * v.k)) * 1000 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test scripts/qa/scale-view.test.mjs`
Expected: 4 tests PASS.

- [ ] **Step 5: Implement `useMapView.ts`**

```ts
'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { SheetPoint } from './geo';
import { IDENTITY, clampView, panView, screenToUnits, zoomAt, type View } from './viewMath';

export const MIN_K = 1;
export const MAX_K = 3;
const ZOOM_MS = 320;

/**
 * Zoom/pan state for one square viewport. Changes of layer never touch it (spec §8); the owner calls
 * `resetNow()` when the sheet changes. Wheel zoom passes through at the limits so the page still scrolls.
 */
export function useMapView(ref: RefObject<HTMLElement | null>) {
  const reduce = !!useReducedMotion();
  const [view, setView] = useState<View>(IDENTITY);
  const [size, setSize] = useState(1);
  const viewRef = useRef(view);
  viewRef.current = view;
  const raf = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const s = el.clientWidth || 1;
      setSize(s);
      setView((v) => clampView(v, s, MIN_K, MAX_K));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  const animateTo = useCallback(
    (goal: View) => {
      cancelAnimationFrame(raf.current);
      if (reduce) {
        setView(goal);
        return;
      }
      const from = viewRef.current;
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / ZOOM_MS);
        const e = 1 - (1 - t) ** 3;
        setView({ k: from.k + (goal.k - from.k) * e, x: from.x + (goal.x - from.x) * e, y: from.y + (goal.y - from.y) * e });
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [reduce],
  );
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const zoomBy = useCallback(
    (factor: number) => animateTo(zoomAt(viewRef.current, factor, size / 2, size / 2, size, MIN_K, MAX_K)),
    [animateTo, size],
  );
  const panBy = useCallback((dx: number, dy: number) => setView((v) => panView(v, dx, dy, size, MIN_K, MAX_K)), [size]);
  const reset = useCallback(() => animateTo(IDENTITY), [animateTo]);
  const resetNow = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setView(IDENTITY);
  }, []);

  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    dragged.current = false;
  }, []);
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      if (!d.moved) {
        d.moved = true;
        dragged.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      d.x = e.clientX;
      d.y = e.clientY;
      if (viewRef.current.k > MIN_K) panBy(dx, dy);
    },
    [panBy],
  );
  const endPointer = useCallback((e: PointerEvent<HTMLElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const k = viewRef.current.k;
      if (e.deltaY === 0 || (e.deltaY < 0 && k >= MAX_K) || (e.deltaY > 0 && k <= MIN_K)) return;
      e.preventDefault();
      cancelAnimationFrame(raf.current);
      const r = el.getBoundingClientRect();
      setView(zoomAt(viewRef.current, Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top, el.clientWidth || 1, MIN_K, MAX_K));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return; // handles and buttons inside manage their own keys
      const step = size * 0.1;
      switch (e.key) {
        case '+':
        case '=':
          zoomBy(1.5);
          break;
        case '-':
        case '_':
          zoomBy(1 / 1.5);
          break;
        case '0':
          reset();
          break;
        case 'ArrowLeft':
          panBy(step, 0);
          break;
        case 'ArrowRight':
          panBy(-step, 0);
          break;
        case 'ArrowUp':
          panBy(0, step);
          break;
        case 'ArrowDown':
          panBy(0, -step);
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [panBy, reset, size, zoomBy],
  );

  const toUnits = useCallback(
    (clientX: number, clientY: number): SheetPoint => {
      const el = ref.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return screenToUnits(viewRef.current, clientX - r.left, clientY - r.top, el.clientWidth || 1);
    },
    [ref],
  );

  return {
    view,
    size,
    zoomBy,
    panBy,
    reset,
    resetNow,
    toUnits,
    wasDragged: () => dragged.current,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer, onKeyDown },
  };
}
```

- [ ] **Step 6: Implement `overlayParts.tsx`**

```tsx
'use client';

import type { SheetPoint } from './geo';

// SVG-only colours (spec: map palette; no new tokens).
export const ACCENT = '#D97E2B';
export const INK = '#38432E';
export const PAPER = '#FFFDF8';
export const HAIRLINE = '#DCCDB2';

/** `ppu` = screen px per sheet unit; sizes are given in screen px and divided by it, so they stay constant while zooming. */
export function Marker({ p, ppu, qa }: { p: SheetPoint; ppu: number; qa?: string }) {
  return (
    <circle data-qa={qa} cx={p.x} cy={p.y} r={7 / ppu} fill={ACCENT} stroke={PAPER} strokeWidth={2} vectorEffect="non-scaling-stroke" />
  );
}

/** Pill label (no text halo). Width is estimated: ~0.6 em per character at weight 700. */
export function Label({ p, ppu, text, dy = -18, qa }: { p: SheetPoint; ppu: number; text: string; dy?: number; qa?: string }) {
  const fs = 13 / ppu;
  const h = 22 / ppu;
  const w = text.length * fs * 0.6 + 14 / ppu;
  const cy = p.y + dy / ppu;
  return (
    <g data-qa={qa} aria-hidden>
      <rect x={p.x - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2} fill={PAPER} stroke={HAIRLINE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <text x={p.x} y={cy} fontSize={fs} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill={INK} direction="rtl">
        {text}
      </text>
    </g>
  );
}

/** Locate ring. The ping animation is CSS and stops under prefers-reduced-motion. */
export function Pulse({ p, ppu }: { p: SheetPoint; ppu: number }) {
  return (
    <g aria-hidden>
      <circle cx={p.x} cy={p.y} r={16 / ppu} fill="none" stroke={ACCENT} strokeWidth={2.5} vectorEffect="non-scaling-stroke"
        className="animate-ping motion-reduce:animate-none" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      <circle cx={p.x} cy={p.y} r={6 / ppu} fill={ACCENT} stroke={PAPER} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </g>
  );
}
```

- [ ] **Step 7: Implement `controls.tsx`**

```tsx
'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatRatio } from './geo';
import { SHEETS, SHEET_IDS, type SheetId } from './scaleSheets.data';
import { asset } from './layers';

// Text tiers (design/docs/lessons-02-06-ui-cleanup-spec.md §3).
export const T1 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl';
export const T1_INTRO = 'mt-2 text-base leading-relaxed text-fg-muted';
export const T3 = 'text-base font-display font-bold text-fg';
export const T5 = 'text-sm font-display font-semibold text-fg-muted';
export const T6 = 'text-sm text-fg-muted leading-snug';
export const INSET = 'rounded-xl bg-bg-accent/60 p-4';

// Option recipe (GeologyScene.tsx): tint on a ::before layer over a solid base.
export const OPTION_BASE =
  'relative isolate rounded-xl border bg-bg-elevated text-start cursor-pointer transition-colors duration-200 ease-snap before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap';
export const OPTION_ACTIVE = 'border-accent before:bg-accent/10';
export const OPTION_IDLE = 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]';
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated';

/** Roving focus for a row of options (copied from GeologyScene's useTabKeys; RTL-aware ←/→). */
export function useRovingKeys<T extends string>(ids: readonly T[], value: T, onSelect: (id: T) => void) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ids.indexOf(value);
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    let next: number;
    switch (e.key) {
      case 'ArrowLeft':
        next = i + (rtl ? 1 : -1);
        break;
      case 'ArrowRight':
        next = i + (rtl ? -1 : 1);
        break;
      case 'ArrowDown':
        next = i + 1;
        break;
      case 'ArrowUp':
        next = i - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = ids.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const id = ids[(next + ids.length) % ids.length];
    onSelect(id);
    refs.current.get(id)?.focus();
  };
  const register = (id: T) => (el: HTMLButtonElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  };
  return { onKeyDown, register };
}

export type ViewMode = 'map' | 'ortho' | 'compare';
const MODES: { id: ViewMode; label: string }[] = [
  { id: 'map', label: 'מפה' },
  { id: 'ortho', label: 'תצ״א' },
  { id: 'compare', label: 'השוואה' },
];
const MODE_IDS = MODES.map((m) => m.id);

export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  const keys = useRovingKeys(MODE_IDS, value, onChange);
  return (
    <div role="radiogroup" aria-label="סוג הייצוג" onKeyDown={keys.onKeyDown} className="inline-flex gap-1 rounded-xl border border-border bg-bg-elevated p-1">
      {MODES.map((m) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            ref={keys.register(m.id)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(m.id)}
            className={cn(
              'h-9 rounded-lg border px-3.5 text-sm font-display font-bold transition-colors duration-200 ease-snap',
              FOCUS_RING,
              on ? 'border-accent bg-accent/10 text-fg' : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/** Scale picker: three sheet thumbnails, each outlining the next more detailed sheet. */
export function SheetPicker({
  value,
  onChange,
  controls,
  done,
}: {
  value: SheetId;
  onChange: (id: SheetId) => void;
  controls?: string;
  done?: ReadonlySet<SheetId>;
}) {
  const keys = useRovingKeys(SHEET_IDS, value, onChange);
  return (
    <div role="tablist" aria-label="קנה מידה" onKeyDown={keys.onKeyDown} className="grid grid-cols-3 gap-2">
      {SHEET_IDS.map((id, i) => {
        const s = SHEETS[id];
        const on = id === value;
        const km = formatNumber(s.groundWidthM / 1000, 1);
        const child = i > 0 ? SHEETS[SHEET_IDS[i - 1]] : null;
        const inset = child ? ((1 - child.groundWidthM / s.groundWidthM) / 2) * 100 : 0;
        return (
          <button
            key={id}
            ref={keys.register(id)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={controls}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'flex flex-col items-center gap-1.5 p-2.5 text-center')}
          >
            <span className="relative block size-16 overflow-hidden rounded-lg border border-border-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of a georeferenced raster */}
              <img src={asset(s.map.src)} alt="" draggable={false} className="size-full" />
              {child && <span aria-hidden className="absolute border-2 border-dashed border-accent" style={{ inset: `${inset}%` }} />}
              {done?.has(id) && (
                <span className="absolute -end-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-white">
                  <Check size={12} strokeWidth={3} aria-hidden />
                </span>
              )}
            </span>
            <span className="font-display text-base font-bold tabular-nums text-fg">{formatRatio(s.denominator)}</span>
            <span className="text-[13px] leading-tight text-fg-muted">{`${km} × ${km} ק״מ`}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Square number badge (LandformsScene.tsx convention). */
export function NumberBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold', active ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted')}>
      {n}
    </span>
  );
}
```

- [ ] **Step 8: Implement `layers.ts`**

```ts
import { ATTRIBUTION, SHEETS, type SheetId, type SheetMeta } from './scaleSheets.data';
import type { ViewMode } from './controls';
import type { LayerSpec } from './SheetViewport';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Public asset URL with the static-export basePath. */
export const asset = (src: string) => `${BASE}${src}`;

export const CURTAIN_LABELS = { left: 'תצ״א', right: 'מפה' } as const;

/** Orthophoto is the base layer, the map is on top; the representation decides what shows. */
export function layersFor(sheet: SheetMeta, mode: ViewMode): {
  base: LayerSpec;
  top: LayerSpec;
  display: 'base' | 'top' | 'curtain';
  attribution: string;
} {
  return {
    base: { key: `${sheet.id}-ortho`, src: asset(sheet.ortho.src) },
    top: { key: `${sheet.id}-map`, src: asset(sheet.map.src) },
    display: mode === 'map' ? 'top' : mode === 'ortho' ? 'base' : 'curtain',
    attribution: mode === 'map' ? ATTRIBUTION.map : mode === 'ortho' ? ATTRIBUTION.ortho : `${ATTRIBUTION.map} · ${ATTRIBUTION.ortho}`,
  };
}

export function preloadFor(ids: readonly SheetId[]): string[] {
  return ids.flatMap((id) => [asset(SHEETS[id].ortho.src), asset(SHEETS[id].map.src)]);
}
```

- [ ] **Step 9: Implement `SheetViewport.tsx`**

```tsx
'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistance, niceScaleBar, SHEET_UNITS, type SheetPoint } from './geo';
import { MAX_K, MIN_K, useMapView } from './useMapView';

const EASE = [0.22, 1, 0.36, 1] as const;
const MORPH_S = 0.6;

export type LayerSpec = { key: string; src: string; /** Extra magnification about the sheet centre (screen D). */ magnify?: number };
export type OverlayContext = { k: number; ppu: number; toUnits: (clientX: number, clientY: number) => SheetPoint };
export type CurtainProps = { value: number; onChange: (v: number) => void; leftLabel: string; rightLabel: string };

type Props = {
  id?: string;
  label: string;
  /** Changing it = a different sheet: plays the centred scale morph and resets zoom/pan. */
  sheetKey: string;
  groundWidthM: number;
  base: LayerSpec;
  top: LayerSpec;
  display: 'base' | 'top' | 'curtain';
  curtain?: CurtainProps;
  attribution: string;
  preload?: string[];
  onPick?: (p: SheetPoint) => void;
  overlay?: (ctx: OverlayContext) => ReactNode;
  /** One T6 line under the map. */
  note?: ReactNode;
};

/**
 * The square map of the scale scenes. Every layer and the SVG overlay sit under ONE transform
 * (zoom/pan), so markers stay on the ground in every representation. The curtain clips outside that
 * transform, so its line stays put while the map pans under it. Map furniture uses physical
 * left/right on purpose — maps are never mirrored (accepted exception, design/docs/assumptions.md).
 */
export function SheetViewport({ id, label, sheetKey, groundWidthM, base, top, display, curtain, attribution, preload, onPick, overlay, note }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const reduce = !!useReducedMotion();
  const map = useMapView(ref);
  const { view, size } = map;
  const inView = useInView(ref, { margin: '300px', once: true });
  const preloadKey = (preload ?? []).join('|');

  useEffect(() => {
    if (!inView || !preloadKey) return;
    for (const src of preloadKey.split('|')) {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    }
  }, [inView, preloadKey]);

  // Scale morph (spec §6.1): the outgoing picture scales by the width ratio and fades while the incoming
  // one grows from 1/ratio to 1 — both about the shared centre, so the ground lines up throughout.
  const shownSrc = display === 'base' ? base.src : top.src;
  const last = useRef({ key: sheetKey, w: groundWidthM, src: shownSrc });
  const changed = last.current.key !== sheetKey;
  const enterRatio = changed ? last.current.w / groundWidthM : 1;
  const [ghost, setGhost] = useState<{ id: string; src: string; ratio: number } | null>(null);
  const { resetNow } = map;
  useLayoutEffect(() => {
    const prev = last.current;
    if (prev.key !== sheetKey) {
      resetNow();
      setGhost(reduce ? null : { id: `${prev.key}->${sheetKey}`, src: prev.src, ratio: prev.w / groundWidthM });
    }
    last.current = { key: sheetKey, w: groundWidthM, src: shownSrc };
  }, [sheetKey, groundWidthM, shownSrc, reduce, resetNow]);

  const world = { transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: '0 0' };
  const ppu = (size * view.k) / SHEET_UNITS;
  const bar = niceScaleBar(groundWidthM / (size * view.k), size * 0.2);
  const cut = (curtain?.value ?? 0.5) * 100;
  const topStyle =
    display === 'base' ? { opacity: 0 } : display === 'top' ? { opacity: 1 } : { opacity: 1, clipPath: `inset(0 0 0 ${cut}%)` };

  return (
    <div>
      <div
        ref={ref}
        id={id}
        role="group"
        aria-roledescription="מפה"
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={0}
        data-qa="sheet-viewport"
        data-view={`${view.k.toFixed(3)},${view.x.toFixed(1)},${view.y.toFixed(1)}`}
        className={cn(
          'relative aspect-square w-full touch-none select-none overflow-hidden rounded-xl bg-paper-card',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated',
          view.k > MIN_K ? 'cursor-grab active:cursor-grabbing' : onPick ? 'cursor-crosshair' : 'cursor-default',
        )}
        {...map.handlers}
        onClick={(e) => {
          if (!onPick || map.wasDragged()) return;
          onPick(map.toUnits(e.clientX, e.clientY));
        }}
      >
        <motion.div
          key={sheetKey}
          className="absolute inset-0"
          style={{ transformOrigin: '50% 50%' }}
          initial={changed && !reduce ? { scale: 1 / enterRatio, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: MORPH_S, ease: EASE }}
        >
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={world}>
              <LayerImg layer={base} />
            </div>
          </div>
          <div className="absolute inset-0 transition-opacity duration-200 ease-snap motion-reduce:transition-none" style={topStyle}>
            <div className="absolute inset-0" style={world}>
              <LayerImg layer={top} />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0" style={world}>
            <svg viewBox="0 0 1000 1000" className="absolute inset-0 size-full overflow-visible">
              {overlay?.({ k: view.k, ppu, toUnits: map.toUnits })}
            </svg>
          </div>
        </motion.div>

        {ghost && (
          // eslint-disable-next-line @next/next/no-img-element -- transient morph frame of a georeferenced raster
          <motion.img
            key={ghost.id}
            data-qa="morph-ghost"
            src={ghost.src}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full"
            style={{ transformOrigin: '50% 50%' }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: ghost.ratio, opacity: 0 }}
            transition={{ duration: MORPH_S, ease: EASE }}
            onAnimationComplete={() => setGhost(null)}
          />
        )}

        {display === 'curtain' && curtain && <CurtainLine {...curtain} frame={ref} />}
        <NorthArrow />
        <ScaleBar meters={bar.meters} px={bar.px} />
        <ZoomButtons k={view.k} onIn={() => map.zoomBy(1.5)} onOut={() => map.zoomBy(1 / 1.5)} onReset={map.reset} />
      </div>

      {display === 'curtain' && curtain && <CurtainSlider {...curtain} />}
      {note && <p className="mt-2 text-sm leading-snug text-fg-muted">{note}</p>}
      <p className="mt-1 text-[13px] leading-snug text-fg-dim">{attribution}</p>
      <p id={hintId} className="sr-only">
        מקשי + ו־− לתקריב, חיצים להזזה כשהמפה מוגדלת, 0 לאיפוס.
      </p>
    </div>
  );
}

function LayerImg({ layer }: { layer: LayerSpec }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- georeferenced raster inside a CSS-transformed stack; next/image would break the 1:1 sheet mapping
    <img
      src={layer.src}
      alt=""
      draggable={false}
      decoding="async"
      className="absolute inset-0 size-full select-none"
      style={layer.magnify ? { transform: `scale(${layer.magnify})`, transformOrigin: '50% 50%' } : undefined}
    />
  );
}

function ScaleBar({ meters, px }: { meters: number; px: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-bg-elevated/90 px-2.5 pb-2 pt-1.5 shadow-sm">
      <div className="mb-1 text-[13px] font-display font-semibold leading-none text-fg tabular-nums">{formatDistance(meters)}</div>
      <div className="flex h-1.5 border border-fg" style={{ width: px }}>
        <span className="h-full w-1/2 bg-fg" />
      </div>
    </div>
  );
}

function NorthArrow() {
  return (
    <div aria-hidden className="pointer-events-none absolute left-3 top-3 flex flex-col items-center gap-0.5 rounded-lg bg-bg-elevated/90 px-1.5 py-1 shadow-sm">
      <span className="text-[13px] font-display font-bold leading-none text-fg">צ</span>
      <svg width="12" height="16" viewBox="0 0 12 16">
        <path d="M6 0 L12 16 L6 12 L0 16 Z" fill="#38432E" />
      </svg>
    </div>
  );
}

function ZoomButtons({ k, onIn, onOut, onReset }: { k: number; onIn: () => void; onOut: () => void; onReset: () => void }) {
  const btn =
    'flex size-9 items-center justify-center rounded-lg border border-border bg-bg-elevated/95 text-fg shadow-sm transition-colors duration-200 ease-snap hover:border-brand/30 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1.5" onPointerDown={stop} onClick={stop} onKeyDown={stop}>
      <button type="button" className={btn} aria-label="התקרבות" disabled={k >= MAX_K - 1e-3} onClick={onIn}>
        <Plus size={18} aria-hidden />
      </button>
      <button type="button" className={btn} aria-label="התרחקות" disabled={k <= MIN_K + 1e-3} onClick={onOut}>
        <Minus size={18} aria-hidden />
      </button>
      <button type="button" className={btn} aria-label="איפוס התצוגה" disabled={k <= MIN_K + 1e-3} onClick={onReset}>
        <RotateCcw size={16} aria-hidden />
      </button>
    </div>
  );
}

function CurtainLine({ value, onChange, leftLabel, rightLabel, frame }: CurtainProps & { frame: RefObject<HTMLDivElement | null> }) {
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    onChange(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };
  const chip = 'pointer-events-none absolute top-3 rounded-full border border-border bg-bg-elevated/95 px-2.5 py-1 text-[13px] font-display font-bold text-fg';
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(56,67,46,0.35)]" style={{ left: `${value * 100}%` }} />
      <div
        aria-hidden
        data-qa="curtain-handle"
        className="absolute top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full border-2 border-accent bg-bg-elevated shadow-elevated"
        style={{ left: `${value * 100}%` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="18" height="12" viewBox="0 0 18 12">
          <path d="M6 1 L1 6 L6 11 M12 1 L17 6 L12 11" fill="none" stroke="#38432E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span aria-hidden className={cn(chip, 'left-14')}>{leftLabel}</span>
      <span aria-hidden className={cn(chip, 'right-3')}>{rightLabel}</span>
    </>
  );
}

function CurtainSlider({ value, onChange, leftLabel, rightLabel }: CurtainProps) {
  return (
    <label className="mt-3 flex items-center gap-3">
      <span className="shrink-0 text-sm font-display font-semibold text-fg-muted">מיקום הווילון</span>
      <input
        type="range"
        dir="ltr"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-valuetext={`${leftLabel} משמאל לקו, ${rightLabel} מימין לקו`}
        className="w-full accent-accent"
      />
    </label>
  );
}
```

- [ ] **Step 10: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "topic-02/scale/"`
Expected: no output. (A circular *type-only* import between `controls.tsx`, `layers.ts` and `SheetViewport.tsx` is fine.)

- [ ] **Step 11: Checkpoint**

Run: `node --experimental-strip-types --test scripts/qa/scale-geo.test.mjs scripts/qa/scale-view.test.mjs scripts/qa/scale-content.test.mjs` → all PASS. No commit. (The viewport is exercised in the browser by Task 5.)

---

### Task 5: Screen A, scene wiring, and the QA script

**Files:**
- Create: `src/components/lessons/topic-02/scale/ScaleExplore.tsx`
- Create: `src/components/lessons/topic-02/scale/ProjectionCallout.tsx`
- Create: `src/components/lessons/topic-02/Scale2Scene.tsx`
- Modify: `src/components/lessons/topic-02/ScaleScene.tsx` (full rewrite)
- Modify: `src/components/lessons/topic-02/Topic02Lesson.tsx:9,26` (import + scene list)
- Modify: `src/lib/lesson-scenes.ts:29`
- Create: `scripts/qa/shot-scale.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: `ScaleExplore()`, `ProjectionCallout()`, `Scale2Scene()`; `ScaleScene()` renders `<ScaleExplore />` then `<ScaleMeasure />` (Task 6 adds `ScaleMeasure`; until then the scene renders only `ScaleExplore`); `Scale2Scene()` renders `ScaleChoose` and `ScaleZoomMyth` once Tasks 7–8 exist (until then only `ProjectionCallout`). QA script CLI: `node --experimental-strip-types scripts/qa/shot-scale.mjs [--screen=a|b|c|d|all] [outDir]`.

- [ ] **Step 1: Move the projections block verbatim**

Create `src/components/lessons/topic-02/scale/ProjectionCallout.tsx` by copying `ProjectionCallout` and `ProjectionTile` **character for character** from the current `src/components/lessons/topic-02/ScaleScene.tsx` (lines 248–284), adding only the header and `export`:

```tsx
'use client';

// Moved verbatim from ScaleScene.tsx (spec §3: the projections block stays unchanged, now at the end of "קנה מידה 2").
export function ProjectionCallout() {
```

followed by the original lines 249–284 of `ScaleScene.tsx` unchanged (the rest of `ProjectionCallout`'s body and the whole `ProjectionTile`). The new file is therefore: line 1 `'use client';`, line 2 blank, line 3 the comment, line 4 `export function ProjectionCallout() {`, lines 5–40 = original 249–284.

Verify (Git Bash; uses `HEAD`, so it works even after Step 3 rewrites `ScaleScene.tsx`):
Run: `diff <(git show HEAD:src/components/lessons/topic-02/ScaleScene.tsx | sed -n '249,284p') <(sed -n '5,40p' src/components/lessons/topic-02/scale/ProjectionCallout.tsx) && echo IDENTICAL`
Expected: `IDENTICAL`.

- [ ] **Step 2: Write Screen A**

Create `src/components/lessons/topic-02/scale/ScaleExplore.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Check, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistance, formatNumber, formatRatio, insideSheet, lonLatToSheet, metersPerSheetCm } from './geo';
import { SHEETS, SHEET_IDS, type SheetId } from './scaleSheets.data';
import { LANDMARKS, SPOT_ROWS, type LandmarkId, type SpotRow } from './scaleContent.data';
import { SheetViewport } from './SheetViewport';
import { FOCUS_RING, INSET, OPTION_BASE, OPTION_IDLE, SheetPicker, T1, T1_INTRO, T3, T5, T6, ViewModeToggle, type ViewMode } from './controls';
import { CURTAIN_LABELS, layersFor, preloadFor } from './layers';
import { ACCENT, Label, Pulse } from './overlayParts';

type Prediction = '10k' | '250k' | 'same';
const PREDICTIONS: { id: Prediction; label: string }[] = [
  { id: '10k', label: '1:10,000' },
  { id: '250k', label: '1:250,000' },
  { id: 'same', label: 'באותו גודל בשתיהן' },
];

type Spot = 'shown' | 'hidden' | 'outside';
const SPOT_TEXT: Record<Spot, string> = { shown: 'מוצג', hidden: 'קטן מכדי להופיע', outside: 'מחוץ לקטע' };

function spotState(row: SpotRow, id: SheetId): Spot {
  if (!insideSheet(lonLatToSheet(SHEETS[id], LANDMARKS[row.id]))) return 'outside';
  return row.shownOn.includes(id) ? 'shown' : 'hidden';
}

/** Screen A — "אותו מקום, שלושה קני מידה" (spec §6.1). */
export function ScaleExplore() {
  const [sheetId, setSheetId] = useState<SheetId>('50k');
  const [mode, setMode] = useState<ViewMode>('map');
  const [curtain, setCurtain] = useState(0.5);
  const [visited, setVisited] = useState<ReadonlySet<SheetId>>(() => new Set<SheetId>(['50k']));
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [locate, setLocate] = useState<LandmarkId | null>(null);
  const preload = useMemo(() => preloadFor(SHEET_IDS), []);

  const sheet = SHEETS[sheetId];
  const D = sheet.denominator;
  const km = sheet.groundWidthM / 1000;
  const cmPerKm = 100000 / D;
  const idx = SHEET_IDS.indexOf(sheetId);
  const child = idx > 0 ? SHEETS[SHEET_IDS[idx - 1]] : null;
  const layers = layersFor(sheet, mode);
  const located = locate ? lonLatToSheet(sheet, LANDMARKS[locate]) : null;
  const locatedInside = located !== null && insideSheet(located);

  const select = (id: SheetId) => {
    setSheetId(id);
    setVisited((v) => new Set(v).add(id));
  };

  return (
    <section data-qa="scale-explore" aria-labelledby="scale-explore-title" className="mb-14">
      <h3 id="scale-explore-title" className={T1}>אותו מקום, שלושה קני מידה</h3>
      <p className={T1_INTRO}>
        שלושה קטעי מפה בגודל דף זהה, 24×24 ס״מ, וכולם סביב הר תבור. עברו ביניהם ובדקו כמה שטח נכנס לדף ומה עדיין אפשר לזהות.
      </p>

      <div className="surface-elevated mt-5 grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-5">
          <div>
            <div className={cn(T5, 'mb-2')}>קנה מידה</div>
            <SheetPicker value={sheetId} onChange={select} controls="scale-explore-map" />
          </div>

          <PredictionBlock value={prediction} onAnswer={setPrediction} />

          <dl className={cn(INSET, 'grid gap-2.5')} aria-live="polite">
            <ReadoutRow term="שטח מוצג" value={`${formatNumber(km, 1)} × ${formatNumber(km, 1)} ק״מ · ${formatNumber(km * km, 2)} קמ״ר`} />
            <ReadoutRow term="1 ס״מ על הדף" value={`${formatDistance(metersPerSheetCm(D))} בשטח`} />
            <div>
              <dt className={T6}>1 ק״מ בשטח</dt>
              <dd className="mt-1.5 flex items-center gap-3">
                <span
                  aria-hidden
                  className="block h-2 rounded-full bg-accent transition-[width] duration-500 ease-snap motion-reduce:transition-none"
                  style={{ width: `${cmPerKm * 16}px` }}
                />
                <span className="font-display font-bold tabular-nums text-fg">{`${formatNumber(cmPerKm, 1)} ס״מ על הדף`}</span>
              </dd>
            </div>
          </dl>

          <SpotTable sheetId={sheetId} visited={visited} locate={locate} onLocate={setLocate} />
          <p className={T6} aria-live="polite">
            {locate && !locatedInside ? `${LANDMARKS[locate].name}: מחוץ לקטע הזה. עברו לקנה מידה קטן יותר כדי לראות אותו.` : ''}
          </p>
        </div>

        <div>
          <div className="mb-3">
            <ViewModeToggle value={mode} onChange={setMode} />
          </div>
          <SheetViewport
            id="scale-explore-map"
            label={`קטע מפה בקנה מידה ${formatRatio(D)} סביב הר תבור, ${formatNumber(km, 1)} על ${formatNumber(km, 1)} ק״מ`}
            sheetKey={sheetId}
            groundWidthM={sheet.groundWidthM}
            base={layers.base}
            top={layers.top}
            display={layers.display}
            curtain={{ value: curtain, onChange: setCurtain, leftLabel: CURTAIN_LABELS.left, rightLabel: CURTAIN_LABELS.right }}
            attribution={layers.attribution}
            preload={preload}
            note={`סרגל המרחק מתעדכן כשמתקרבים; קנה המידה של הדף נשאר ${formatRatio(D)}.`}
            overlay={({ ppu }) => (
              <>
                {child && (
                  <ChildExtent ratio={child.groundWidthM / sheet.groundWidthM} ppu={ppu} label={formatRatio(child.denominator)} onOpen={() => select(child.id)} />
                )}
                {located && locatedInside && locate && (
                  <>
                    <Pulse p={located} ppu={ppu} />
                    <Label p={located} ppu={ppu} text={LANDMARKS[locate].name} dy={-24} />
                  </>
                )}
              </>
            )}
          />
        </div>
      </div>
    </section>
  );
}

function ChildExtent({ ratio, ppu, label, onOpen }: { ratio: number; ppu: number; label: string; onOpen: () => void }) {
  const side = ratio * 1000;
  const o = (1000 - side) / 2;
  return (
    <g data-qa="child-extent">
      <rect x={o} y={o} width={side} height={side} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="7 5" vectorEffect="non-scaling-stroke" />
      <rect
        x={o}
        y={o}
        width={side}
        height={side}
        fill="transparent"
        aria-hidden
        style={{ pointerEvents: 'auto', cursor: 'zoom-in' }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      />
      <Label p={{ x: 500, y: o }} ppu={ppu} text={label} dy={-14} />
    </g>
  );
}

function PredictionBlock({ value, onAnswer }: { value: Prediction | null; onAnswer: (p: Prediction) => void }) {
  const correct = value === '10k';
  return (
    <div>
      <div className={T3}>לפני שמתחילים: באיזו מפה הר תבור ייראה גדול יותר?</div>
      <div aria-live="polite">
        {value === null ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {PREDICTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onAnswer(p.id)}
                className={cn(OPTION_BASE, OPTION_IDLE, FOCUS_RING, 'px-3.5 py-2 text-sm font-display font-bold tabular-nums')}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <p data-qa="prediction-feedback" className={cn('mt-2 rounded-xl p-3.5 text-sm leading-relaxed text-fg', correct ? 'bg-status-ok/10' : 'bg-status-warn/10')}>
            <strong>{correct ? 'נכון.' : 'דווקא ב־1:10,000.'}</strong> ב־1:10,000 כל ק״מ בשטח תופס 10 ס״מ על הדף, וב־1:250,000 רק 0.4 ס״מ. מכנה קטן
            יותר פירושו שבר גדול יותר, כלומר קנה מידה גדול יותר.
          </p>
        )}
      </div>
    </div>
  );
}

function ReadoutRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={T6}>{term}</dt>
      <dd className="font-display font-bold tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function SpotTable({
  sheetId,
  visited,
  locate,
  onLocate,
}: {
  sheetId: SheetId;
  visited: ReadonlySet<SheetId>;
  locate: LandmarkId | null;
  onLocate: (id: LandmarkId | null) => void;
}) {
  return (
    <div>
      <table className="w-full border-separate border-spacing-0 text-sm" data-qa="spot-table">
        <caption className={cn(T3, 'mb-2 text-start')}>מה אפשר לזהות במפה?</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">פריט</th>
            {SHEET_IDS.map((id) => (
              <th key={id} scope="col" className={cn('pb-1.5 text-center text-[13px] font-display font-bold tabular-nums', id === sheetId ? 'text-accent' : 'text-fg-muted')}>
                {formatRatio(SHEETS[id].denominator)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SPOT_ROWS.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="py-0.5 text-start font-normal">
                <button
                  type="button"
                  aria-pressed={locate === row.id}
                  onClick={() => onLocate(locate === row.id ? null : row.id)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-start text-sm text-fg transition-colors duration-200 ease-snap hover:bg-brand/[0.04]',
                    FOCUS_RING,
                    locate === row.id && 'bg-accent/10',
                  )}
                >
                  {row.label}
                </button>
              </th>
              {SHEET_IDS.map((id) => (
                <td key={id} className={cn('text-center', id === sheetId && 'bg-accent/[0.06]')}>
                  {visited.has(id) ? (
                    <SpotIcon state={spotState(row, id)} />
                  ) : (
                    <span className="font-display text-fg-dim">
                      <span aria-hidden>?</span>
                      <span className="sr-only">עוד לא נבדק</span>
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={cn(T6, 'mt-2 flex flex-wrap gap-x-3 gap-y-1')} aria-hidden>
        {(['shown', 'hidden', 'outside'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <SpotIcon state={s} decorative /> {SPOT_TEXT[s]}
          </span>
        ))}
      </p>
    </div>
  );
}

function SpotIcon({ state, decorative = false }: { state: Spot; decorative?: boolean }) {
  const Icon = state === 'shown' ? Check : state === 'hidden' ? X : Circle;
  return (
    <span className="inline-flex items-center justify-center">
      <Icon size={16} strokeWidth={2.5} aria-hidden className={state === 'shown' ? 'text-brand-dark' : 'text-fg-dim'} />
      {!decorative && <span className="sr-only">{SPOT_TEXT[state]}</span>}
    </span>
  );
}
```

- [ ] **Step 3: Rewrite `ScaleScene.tsx` and add `Scale2Scene.tsx`**

Replace the whole content of `src/components/lessons/topic-02/ScaleScene.tsx` with (title and intro copied verbatim from the current file):

```tsx
'use client';

import { SceneHeader } from './SceneHeader';
import { ScaleExplore } from './scale/ScaleExplore';

/** "קנה מידה 1" — explore and measure (docs/superpowers/specs/2026-10-08-scale-scene-redesign-design.md). */
export function ScaleScene() {
  return (
    <section id="scene-scale" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.2"
        eyebrow="קנה מידה"
        title={<>קנה מידה: הקשר בין המרחק במפה למרחק בשטח</>}
        intro={`קנה מידה הוא היחס בין מרחק במפה למרחק האופקי המקביל בשטח, באותן יחידות מידה. למשל, במפה בקנה מידה 1:50,000, ס״מ אחד מייצג 50,000 ס״מ בשטח, שהם 500 מטר.`}
      />
      <ScaleExplore />
    </section>
  );
}
```

Create `src/components/lessons/topic-02/Scale2Scene.tsx`:

```tsx
'use client';

import { SceneHeader } from './SceneHeader';
import { ProjectionCallout } from './scale/ProjectionCallout';

/** "קנה מידה 2" — choose a map and the zoom myth, then the (unchanged) projections block. */
export function Scale2Scene() {
  return (
    <section id="scene-scale-2" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        title={<>קנה מידה 2: איזו מפה מתאימה למשימה?</>}
        intro="כל מפה היא פשרה בין היקף השטח לבין רמת הפירוט. בחרו מפה לכל משימה, ובדקו מה קורה כשמגדילים מפה במקום להחליף אותה."
      />
      <ProjectionCallout />
    </section>
  );
}
```

- [ ] **Step 4: Register the scene (shared files — diff first)**

Run: `git diff -- src/components/lessons/topic-02/Topic02Lesson.tsx src/lib/lesson-scenes.ts`
If either file has uncommitted changes from another session, keep them and edit only the lines below.

In `Topic02Lesson.tsx`, after `import { ScaleScene } from './ScaleScene';` add:

```tsx
import { Scale2Scene } from './Scale2Scene';
```

and replace the line `  { id: 'scale',       label: 'קנה מידה',      Comp: ScaleScene },` with:

```tsx
  { id: 'scale',       label: 'קנה מידה 1',    Comp: ScaleScene },
  { id: 'scale-2',     label: 'קנה מידה 2',    Comp: Scale2Scene },
```

In `src/lib/lesson-scenes.ts`, replace `    { id: 'scale', label: 'קנה מידה' },` with:

```ts
    { id: 'scale', label: 'קנה מידה 1' },
    { id: 'scale-2', label: 'קנה מידה 2' },
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "topic-02/(scale/|ScaleScene|Scale2Scene|Topic02Lesson)|lesson-scenes"`
Expected: no output.

- [ ] **Step 6: Write the QA script (screen A part)**

Create `scripts/qa/shot-scale.mjs`:

```js
// Browser QA for the topic-02 scale scenes (spec §10.3).
// Usage (dev server on :3000):
//   node --experimental-strip-types scripts/qa/shot-scale.mjs [--screen=a|b|c|d|all] [outDir]
// Exit code 1 on any failure. Screenshots go to outDir (default design/screenshots/scale-redesign/qa).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { SHEETS } from '../../src/components/lessons/topic-02/scale/scaleSheets.data.ts';
import { LANDMARKS, PRACTICE } from '../../src/components/lessons/topic-02/scale/scaleContent.data.ts';
import { lonLatToSheet } from '../../src/components/lessons/topic-02/scale/geo.ts';

const args = process.argv.slice(2);
const SCREEN = (args.find((a) => a.startsWith('--screen=')) ?? '--screen=all').split('=')[1];
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/scale-redesign/qa';
const BASE = 'http://localhost:3000/lessons/topic-02/';
const NAV = 88;
const H = 1122;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log(`FAIL ${m}`);
};
const ok = (cond, m) => (cond ? console.log(`ok   ${m}`) : fail(m));
const browser = await chromium.launch({ channel: 'chrome' });

async function open(hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: H }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(BASE + hash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return { ctx, page, errors };
}

const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });
const block = (page, qa) => page.locator(`[data-qa="${qa}"]`);
const viewport = (page, qa) => block(page, qa).locator('[data-qa="sheet-viewport"]');

async function scrollTo(page, qa) {
  await page.evaluate(([q, off]) => {
    const el = document.querySelector(`[data-qa="${q}"]`);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
  }, [qa, NAV]);
  await page.waitForTimeout(500);
}

async function fits(page, qa) {
  const r = await block(page, qa).locator('.surface-elevated').first().boundingBox();
  ok(r && r.height <= H - NAV - 16, `${qa}: workspace ${Math.round(r?.height ?? -1)}px fits under the nav`);
}

async function noHScroll(page, label) {
  const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(d <= 0, `${label}: no horizontal scroll (${d})`);
}

const rectOf = async (loc) => {
  const r = await loc.boundingBox();
  return r ? [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 2) / 2) : null;
};
const sameRect = (a, b) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= 0.5);

/** Screen px of a lat/lon on the given sheet, for the viewport at identity zoom. */
async function screenOf(page, qa, sheetId, lm) {
  const r = await viewport(page, qa).boundingBox();
  const q = lonLatToSheet(SHEETS[sheetId], lm);
  return { x: r.x + (q.x / 1000) * r.width, y: r.y + (q.y / 1000) * r.height };
}

async function checkA() {
  const { ctx, page, errors } = await open('#scene-scale');
  await scrollTo(page, 'scale-explore');
  await shot(page, 'a-initial');
  await fits(page, 'scale-explore');

  const vp = viewport(page, 'scale-explore');
  const extent = block(page, 'scale-explore').locator('[data-qa="child-extent"]');
  const radio = (name) => block(page, 'scale-explore').getByRole('radio', { name });
  const tab = (re) => block(page, 'scale-explore').getByRole('tab', { name: re });

  // Layer switch keeps the view and the overlay pixel-identical (spec §8).
  const r0 = await rectOf(extent);
  const v0 = await vp.getAttribute('data-view');
  for (const name of ['תצ״א', 'השוואה', 'מפה']) {
    await radio(name).click();
    await page.waitForTimeout(350);
    ok(sameRect(r0, await rectOf(extent)), `A: overlay stays put after switching to ${name}`);
    ok(v0 === (await vp.getAttribute('data-view')), `A: view unchanged after switching to ${name}`);
  }
  await radio('השוואה').click();
  await page.waitForTimeout(350);
  await shot(page, 'a-compare');

  // Zoom + pan, then switch layers again.
  await vp.focus();
  await page.keyboard.press('+');
  await page.waitForTimeout(450);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  const vz = await vp.getAttribute('data-view');
  ok(Number(vz.split(',')[0]) > 1.4, `A: keyboard zoom (${vz})`);
  const rz = await rectOf(extent);
  await radio('מפה').click();
  await page.waitForTimeout(350);
  ok(vz === (await vp.getAttribute('data-view')), 'A: zoomed view survives a layer switch');
  ok(sameRect(rz, await rectOf(extent)), 'A: overlay stays put while zoomed');
  await shot(page, 'a-zoomed');

  // Scale switch: morph frame, then reset to identity.
  await tab(/1:10,000/).click();
  await page.waitForTimeout(200);
  ok((await page.locator('[data-qa="morph-ghost"]').count()) === 1, 'A: morph ghost present mid-transition');
  await shot(page, 'a-morph-mid');
  await page.waitForTimeout(900);
  ok((await vp.getAttribute('data-view')) === '1.000,0.0,0.0', 'A: scale switch resets the view');
  await shot(page, 'a-10k');
  await tab(/1:250,000/).click();
  await page.waitForTimeout(900);
  await shot(page, 'a-250k');
  ok((await block(page, 'spot-table').getByText('עוד לא נבדק').count()) === 0, 'A: table filled after visiting all sheets');

  await block(page, 'scale-explore').getByRole('button', { name: '1:250,000' }).click();
  ok((await block(page, 'prediction-feedback').innerText()).includes('דווקא'), 'A: wrong prediction gets the corrective feedback');
  await block(page, 'scale-explore').getByRole('button', { name: 'הכנרת' }).click();
  await page.waitForTimeout(300);
  await shot(page, 'a-locate-kinneret');

  await noHScroll(page, 'A');
  ok(errors.length === 0, `A: no console errors ${errors.join(' | ')}`);
  await ctx.close();

  // Reduced motion: no ghost frame.
  const rm = await open('#scene-scale', { reducedMotion: 'reduce' });
  await scrollTo(rm.page, 'scale-explore');
  await block(rm.page, 'scale-explore').getByRole('tab', { name: /1:10,000/ }).click();
  await rm.page.waitForTimeout(100);
  ok((await rm.page.locator('[data-qa="morph-ghost"]').count()) === 0, 'A: reduced motion has no morph');
  await rm.ctx.close();
}

const SCREENS = { a: checkA };

for (const [key, fn] of Object.entries(SCREENS)) {
  if (SCREEN === 'all' || SCREEN === key) await fn();
}
await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
```

(`screenOf`, `PRACTICE`, `LANDMARKS` are used by the screen-B checks added in Task 6.)

- [ ] **Step 7: Run QA for screen A and look at the screenshots**

Run: `node --experimental-strip-types scripts/qa/shot-scale.mjs --screen=a`
Expected: every line `ok`, final `all checks passed`.

Open `a-initial.png`, `a-compare.png`, `a-zoomed.png`, `a-morph-mid.png`, `a-10k.png`, `a-250k.png`, `a-locate-kinneret.png` with the Read tool. Check against spec §6.1 and the Global Constraints: map column ~600 px square at inline-end (left), text column at right; dashed 1:10,000 extent centred on 1:50,000; thumbnails show the inner rectangle; readouts change per sheet (2.4 → 12 → 60 km; 10 → 2 → 0.4 cm bar); table icons; curtain chips "תצ״א" left / "מפה" right; scale bar bottom-left, zoom buttons bottom-right, north arrow top-left; no clipped Hebrew, no overlap. List concrete deltas (px, colour, weight) and fix them before Step 8.

Also open `http://localhost:3000/lessons/topic-02/#scene-scale-2` once (Playwright screenshot or browser) and confirm the projections block renders and the lesson TOC shows "קנה מידה 1" and "קנה מידה 2" between טופוגרפיה and קואורדינטות 1.

- [ ] **Step 8: Checkpoint**

Unit tests all PASS; `--screen=a` passes; type-check clean. No commit.

---

### Task 6: Measuring tool and Screen B

**Files:**
- Create: `src/components/lessons/topic-02/scale/MeasureOverlay.tsx`
- Create: `src/components/lessons/topic-02/scale/ScaleMeasure.tsx`
- Modify: `src/components/lessons/topic-02/ScaleScene.tsx` (render `<ScaleMeasure />` after `<ScaleExplore />`)
- Modify: `scripts/qa/shot-scale.mjs` (add `checkB`)

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: `MeasureOverlay({ a, b, cm, reading, ctx, letters, onMove?, names? })`; `ScaleMeasure()`. DOM hooks: `data-qa="scale-measure"`, `data-qa="guided-chain"`, `data-qa="ground-truth"`, `data-qa="handle-0"`, `data-qa="handle-1"`, `data-qa="reading-chip"`, `data-qa="target-status-0"`, `data-qa="target-status-1"`, `data-qa="answer-feedback"`.

- [ ] **Step 1: Write `MeasureOverlay.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { formatNumber, type SheetPoint } from './geo';
import type { OverlayContext } from './SheetViewport';
import { ACCENT, INK, Label, PAPER } from './overlayParts';

const MM_UNITS = 1000 / 240; // 1 mm on a 24 cm sheet, in sheet units
const clamp = (q: SheetPoint): SheetPoint => ({ x: Math.min(1000, Math.max(0, q.x)), y: Math.min(1000, Math.max(0, q.y)) });

type Props = {
  a: SheetPoint | null;
  b: SheetPoint | null;
  /** Exact sheet length of a→b in cm (ground distance / denominator), so ruler and reading agree. */
  cm: number | null;
  /** Reading shown on the chip (rounded to 1 mm); null hides the ruler and the chip. */
  reading: number | null;
  ctx: OverlayContext;
  letters: readonly [string, string];
  onMove?: (which: 0 | 1, p: SheetPoint) => void;
  names?: readonly [string, string];
};

export function MeasureOverlay({ a, b, cm, reading, ctx, letters, onMove, names }: Props) {
  const { ppu } = ctx;
  const both = a !== null && b !== null;
  return (
    <g data-qa="measure">
      {both && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ACCENT} strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {both && cm !== null && reading !== null && <Ruler a={a} b={b} cm={cm} ppu={ppu} />}
      {both && reading !== null && (
        <Label p={{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }} ppu={ppu} text={`${formatNumber(reading, 1)} ס״מ`} dy={-24} qa="reading-chip" />
      )}
      {[a, b].map((p, i) =>
        p ? <Handle key={i} which={i as 0 | 1} p={p} ctx={ctx} letter={letters[i]} onMove={onMove} name={names?.[i]} /> : null,
      )}
    </g>
  );
}

/** Ticks every ½ cm (cm ticks longer); millimetre ticks once they are ≥ 5 px apart. */
function Ruler({ a, b, cm, ppu }: { a: SheetPoint; b: SheetPoint; cm: number; ppu: number }) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1e-6 || cm <= 0) return null;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const nx = -uy;
  const ny = ux;
  const unitsPerCm = len / cm;
  const showMm = (unitsPerCm / 10) * ppu >= 5;
  const step = showMm ? unitsPerCm / 10 : unitsPerCm / 2;
  const perCm = showMm ? 10 : 2;
  const ticks = [];
  for (let i = 0; i * step <= len + 1e-6 && i < 3000; i++) {
    const major = i % perCm === 0;
    const half = !major && i % (perCm / 2) === 0;
    const lengthPx = major ? 10 : half ? 7 : 4;
    const t = lengthPx / ppu;
    const x = a.x + ux * i * step;
    const y = a.y + uy * i * step;
    ticks.push(
      <line key={i} x1={x} y1={y} x2={x + nx * t} y2={y + ny * t} stroke={INK} strokeWidth={major ? 1.6 : 1} vectorEffect="non-scaling-stroke" />,
    );
  }
  return <g aria-hidden>{ticks}</g>;
}

function Handle({
  which,
  p,
  ctx,
  letter,
  onMove,
  name,
}: {
  which: 0 | 1;
  p: SheetPoint;
  ctx: OverlayContext;
  letter: string;
  onMove?: (which: 0 | 1, p: SheetPoint) => void;
  name?: string;
}) {
  const [focused, setFocused] = useState(false);
  const editable = !!onMove;
  const r = 11 / ctx.ppu;
  return (
    <g
      data-qa={`handle-${which}`}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? name : undefined}
      aria-roledescription={editable ? 'נקודת מדידה ניתנת להזזה' : undefined}
      style={{ pointerEvents: editable ? 'auto' : 'none', cursor: editable ? 'grab' : 'default', outline: 'none' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPointerDown={(e) => {
        if (!editable) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!editable || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
        onMove(which, clamp(ctx.toUnits(e.clientX, e.clientY)));
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (!editable) return;
        const s = e.shiftKey ? MM_UNITS * 10 : MM_UNITS;
        const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
        const v = d[e.key];
        if (!v) return;
        e.preventDefault();
        e.stopPropagation();
        onMove(which, clamp({ x: p.x + v[0], y: p.y + v[1] }));
      }}
    >
      {focused && (
        <circle cx={p.x} cy={p.y} r={r + 5 / ctx.ppu} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      )}
      <circle cx={p.x} cy={p.y} r={r} fill={PAPER} stroke={ACCENT} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      <text x={p.x} y={p.y} fontSize={13 / ctx.ppu} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill={INK}>
        {letter}
      </text>
    </g>
  );
}
```

- [ ] **Step 2: Write `ScaleMeasure.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  classifyAnswer, formatDistance, formatNumber, formatRatio, groundDistanceM, lonLatToSheet, readCm, readingPrecisionM,
  sheetCm, sheetToLonLat, type AnswerResult, type SheetPoint,
} from './geo';
import { SHEETS, SHEET_IDS, type SheetId } from './scaleSheets.data';
import { GUIDED_PAIR, LANDMARKS, PRACTICE, type LandmarkId, type PracticeTarget } from './scaleContent.data';
import { SheetViewport } from './SheetViewport';
import { MeasureOverlay } from './MeasureOverlay';
import { FOCUS_RING, INSET, NumberBadge, OPTION_ACTIVE, OPTION_BASE, OPTION_IDLE, SheetPicker, T1, T1_INTRO, T3, T5, T6, ViewModeToggle, useRovingKeys, type ViewMode } from './controls';
import { CURTAIN_LABELS, layersFor, preloadFor } from './layers';

type Step = 'guided' | 'practice';
const STEPS: { id: Step; label: string }[] = [
  { id: 'guided', label: 'דוגמה מודרכת' },
  { id: 'practice', label: 'תרגול' },
];
const STEP_IDS = STEPS.map((s) => s.id);
const DENOMINATORS = SHEET_IDS.map((id) => SHEETS[id].denominator);
const HORIZONTAL_NOTE = 'זהו מרחק אופקי בקו ישר. אורך דרך מתפתלת, או הליכה במעלה מדרון, ארוכים ממנו.';

/** Screen B — "מודדים על המפה" (spec §6.2). */
export function ScaleMeasure() {
  const [step, setStep] = useState<Step>('guided');
  const keys = useRovingKeys(STEP_IDS, step, setStep);
  return (
    <section data-qa="scale-measure" aria-labelledby="scale-measure-title">
      <h3 id="scale-measure-title" className={T1}>מודדים על המפה</h3>
      <p className={T1_INTRO}>מודדים את המרחק על דף המפה וכופלים במכנה. התוצאה היא המרחק האופקי בשטח.</p>
      <div className="surface-elevated mt-5 p-5 sm:p-6">
        <div role="tablist" aria-label="שלבי התרגול" onKeyDown={keys.onKeyDown} className="mb-5 flex gap-2">
          {STEPS.map((s, i) => {
            const on = s.id === step;
            return (
              <button
                key={s.id}
                ref={keys.register(s.id)}
                type="button"
                role="tab"
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => setStep(s.id)}
                className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'flex items-center gap-2.5 px-3 py-2 font-display text-sm font-bold text-fg')}
              >
                <NumberBadge n={i + 1} active={on} />
                {s.label}
              </button>
            );
          })}
        </div>
        {step === 'guided' ? <GuidedMeasure /> : <PracticeMeasure />}
      </div>
    </section>
  );
}

function GuidedMeasure() {
  const [sheetId, setSheetId] = useState<SheetId>('10k');
  const [mode, setMode] = useState<ViewMode>('map');
  const [curtain, setCurtain] = useState(0.5);
  const preload = useMemo(() => preloadFor(SHEET_IDS), []);
  const sheet = SHEETS[sheetId];
  const D = sheet.denominator;
  const [aId, bId] = GUIDED_PAIR;
  const a = lonLatToSheet(sheet, LANDMARKS[aId]);
  const b = lonLatToSheet(sheet, LANDMARKS[bId]);
  const truth = groundDistanceM(LANDMARKS[aId], LANDMARKS[bId]);
  const exact = sheetCm(truth, D);
  const reading = readCm(exact);
  const precision = readingPrecisionM(D);
  const layers = layersFor(sheet, mode);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col gap-5">
        <p className="text-base leading-relaxed text-fg">
          מודדים מ{LANDMARKS[aId].name} (א) אל הכפר {LANDMARKS[bId].name} (ב). עברו בין קני המידה ועקבו אחרי החישוב.
        </p>
        <div>
          <div className={cn(T5, 'mb-2')}>קנה מידה</div>
          <SheetPicker value={sheetId} onChange={setSheetId} controls="scale-guided-map" />
        </div>
        <ol className={cn(INSET, 'grid gap-2.5')} aria-live="polite" data-qa="guided-chain">
          <ChainRow n={1} term="על הדף" value={`${formatNumber(reading, 1)} ס״מ`} />
          <ChainRow n={2} term="כפול המכנה" value={`${formatNumber(reading, 1)} × ${formatNumber(D)} = ${formatNumber(reading * D)} ס״מ`} />
          <ChainRow n={3} term="בשטח" value={`${formatDistance((reading * D) / 100, precision)} (±${formatDistance(precision)})`} />
        </ol>
        <p className="text-sm leading-relaxed text-fg">
          <strong data-qa="ground-truth">המרחק בשטח לא השתנה: כ־{formatDistance(truth, 10)}.</strong> השתנה האורך על הדף, ואיתו הדיוק: מילימטר
          אחד על הדף הוא {formatDistance(precision)} בשטח.
          {sheetId === '250k' && ' ב־1:250,000 כבר אי אפשר לזהות את הכנסייה עצמה, רק את ההר.'}
        </p>
      </div>
      <div>
        <div className="mb-3">
          <ViewModeToggle value={mode} onChange={setMode} />
        </div>
        <SheetViewport
          id="scale-guided-map"
          label={`מדידה בין ${LANDMARKS[aId].name} לבין ${LANDMARKS[bId].name} במפה ${formatRatio(D)}: ${formatNumber(reading, 1)} ס״מ על הדף`}
          sheetKey={sheetId}
          groundWidthM={sheet.groundWidthM}
          base={layers.base}
          top={layers.top}
          display={layers.display}
          curtain={{ value: curtain, onChange: setCurtain, leftLabel: CURTAIN_LABELS.left, rightLabel: CURTAIN_LABELS.right }}
          attribution={layers.attribution}
          preload={preload}
          overlay={(ctx) => <MeasureOverlay a={a} b={b} cm={exact} reading={reading} ctx={ctx} letters={['א', 'ב']} />}
        />
      </div>
    </div>
  );
}

function ChainRow({ n, term, value }: { n: number; term: string; value: string }) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="font-display text-sm font-bold text-fg-dim tabular-nums">{n}</span>
      <span className={cn(T6, 'w-24 shrink-0')}>{term}</span>
      <span className="font-display font-bold tabular-nums text-fg">{value}</span>
    </li>
  );
}

const isHit = (sheetMeta: (typeof SHEETS)[SheetId], p: SheetPoint, t: PracticeTarget) =>
  groundDistanceM(sheetToLonLat(sheetMeta, p), LANDMARKS[t.id]) <= t.radiusM;

function PracticeMeasure() {
  const sheet = SHEETS[PRACTICE.sheet];
  const D = sheet.denominator;
  const precision = readingPrecisionM(D);
  const [mode, setMode] = useState<ViewMode>('ortho');
  const [curtain, setCurtain] = useState(0.5);
  const [pts, setPts] = useState<[SheetPoint | null, SheetPoint | null]>([null, null]);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [miss, setMiss] = useState<string | null>(null);
  const preload = useMemo(() => preloadFor([PRACTICE.sheet]), []);

  const hits = [0, 1].map((i) => pts[i] !== null && isHit(sheet, pts[i]!, PRACTICE.targets[i]));
  const both = hits[0] && hits[1];
  const next: 0 | 1 | null = pts[0] === null ? 0 : pts[1] === null ? 1 : null;
  const groundM = pts[0] && pts[1] ? groundDistanceM(sheetToLonLat(sheet, pts[0]), sheetToLonLat(sheet, pts[1])) : null;
  const exact = groundM !== null ? sheetCm(groundM, D) : null;
  const reading = exact !== null ? readCm(exact) : null;
  const onMap = mode !== 'ortho';
  const layers = layersFor(sheet, mode);

  const place = (i: 0 | 1, p: SheetPoint) => {
    setPts((cur) => (i === 0 ? [p, cur[1]] : [cur[0], p]));
    setResult(null);
    const t = PRACTICE.targets[i];
    setMiss(isHit(sheet, p, t) ? null : `הנקודה רחוקה מ${t.prompt}. ${t.hint}`);
  };
  const pickFromList = (id: LandmarkId) => {
    const i = next ?? 1;
    place(i, lonLatToSheet(sheet, LANDMARKS[id]));
  };
  const check = () => {
    if (reading === null) return;
    setResult(classifyAnswer(answer, (reading * D) / 100, D, DENOMINATORS));
  };
  const restart = () => {
    setPts([null, null]);
    setAnswer('');
    setResult(null);
    setMiss(null);
    setMode('ortho');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col gap-4">
        <div>
          <div className={T3}>1. מזהים בתצ״א</div>
          <p className="mt-1 text-sm leading-relaxed text-fg">לחצו על המפה כדי לסמן את שתי הנקודות:</p>
          <ul className="mt-2 grid gap-1.5">
            {PRACTICE.targets.map((t, i) => (
              <li key={t.id} data-qa={`target-status-${i}`} className="flex items-center gap-2 text-sm text-fg">
                {hits[i] ? <Check size={16} strokeWidth={2.5} className="text-brand-dark" aria-hidden /> : <Circle size={16} className="text-fg-dim" aria-hidden />}
                <span>
                  {i === 0 ? 'א' : 'ב'}: {t.prompt}
                </span>
                <span className="sr-only">{hits[i] ? 'זוהה' : 'עוד לא זוהה'}</span>
              </li>
            ))}
          </ul>
          <label className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
            <span>או בחרו מרשימה:</span>
            <select
              value=""
              onChange={(e) => e.target.value && pickFromList(e.target.value as LandmarkId)}
              className={cn('rounded-lg border border-border bg-bg-elevated px-2 py-1 text-sm text-fg', FOCUS_RING)}
            >
              <option value="">נקודה {next === 1 ? 'ב' : 'א'}…</option>
              {PRACTICE.choices.map((id) => (
                <option key={id} value={id}>
                  {LANDMARKS[id].name}
                </option>
              ))}
            </select>
          </label>
          <p className={cn(T6, 'mt-1.5 min-h-5')} aria-live="polite">
            {miss ?? ''}
          </p>
        </div>

        <div className={cn(!both && 'opacity-50')}>
          <div className={T3}>2. קוראים על המפה</div>
          <p className="mt-1 text-sm leading-relaxed text-fg">
            {both
              ? onMap
                ? `על הדף: ${formatNumber(reading ?? 0, 1)} ס״מ, בקנה מידה ${formatRatio(D)}.`
                : 'עברו ל"מפה". הנקודות יישארו במקומן, והסרגל יופיע.'
              : 'אחרי ששתי הנקודות זוהו.'}
          </p>
          {both && !onMap && (
            <button type="button" onClick={() => setMode('map')} className="btn-secondary mt-2 h-10 px-4 text-sm">
              מעבר למפה
            </button>
          )}
        </div>

        <div className={cn(!(both && onMap) && 'opacity-50')}>
          <label htmlFor="scale-answer" className={T3}>
            3. כמה זה בשטח?
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="scale-answer"
              inputMode="decimal"
              dir="ltr"
              value={answer}
              disabled={!(both && onMap)}
              onChange={(e) => {
                setAnswer(e.target.value);
                setResult(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && check()}
              className="w-28 rounded-xl border border-border bg-bg-elevated px-3 py-2 font-display text-lg font-medium tabular-nums outline-none transition-colors duration-200 ease-snap hover:border-brand/30 focus:border-accent"
            />
            <span className="text-sm text-fg-muted">ק״מ</span>
            <button type="button" onClick={check} disabled={!(both && onMap) || !answer} className="btn-primary h-10 px-4 text-sm disabled:opacity-50">
              בדיקה
            </button>
          </div>
          <div aria-live="polite">
            {result && reading !== null && groundM !== null && (
              <Feedback result={result} reading={reading} D={D} precision={precision} groundM={groundM} />
            )}
          </div>
        </div>

        <button type="button" onClick={restart} className={cn('self-start text-sm text-fg-muted underline underline-offset-4 hover:text-fg', FOCUS_RING)}>
          התחלה מחדש
        </button>
      </div>

      <div>
        <div className="mb-3">
          <ViewModeToggle value={mode} onChange={setMode} />
        </div>
        <SheetViewport
          label={`תרגול מדידה במפה ${formatRatio(D)} סביב הר תבור`}
          sheetKey={PRACTICE.sheet}
          groundWidthM={sheet.groundWidthM}
          base={layers.base}
          top={layers.top}
          display={layers.display}
          curtain={{ value: curtain, onChange: setCurtain, leftLabel: CURTAIN_LABELS.left, rightLabel: CURTAIN_LABELS.right }}
          attribution={layers.attribution}
          preload={preload}
          onPick={next !== null ? (p) => place(next, p) : undefined}
          overlay={(ctx) => (
            <MeasureOverlay
              a={pts[0]}
              b={pts[1]}
              cm={exact}
              reading={both && onMap ? reading : null}
              ctx={ctx}
              letters={['א', 'ב']}
              onMove={place}
              names={[`נקודה א, ${PRACTICE.targets[0].prompt}. חיצים להזזה במילימטר, Shift לסנטימטר`, `נקודה ב, ${PRACTICE.targets[1].prompt}. חיצים להזזה במילימטר, Shift לסנטימטר`]}
            />
          )}
        />
      </div>
    </div>
  );
}

function Feedback({ result, reading, D, precision, groundM }: { result: AnswerResult; reading: number; D: number; precision: number; groundM: number }) {
  const expected = (reading * D) / 100;
  const good = result.kind === 'correct' || result.kind === 'over-precise';
  let text: string;
  switch (result.kind) {
    case 'correct':
      text = `נכון. ${formatNumber(reading, 1)} ס״מ × ${formatNumber(D)} = ${formatNumber(reading * D)} ס״מ = ${formatDistance(expected, precision)}.`;
      break;
    case 'over-precise':
      text = `החישוב נכון, אבל מילימטר אחד על הדף הוא ${formatDistance(precision)} בשטח, ולכן אין טעם לדייק יותר. עגלו ל־${formatDistance(expected, precision)}.`;
      break;
    case 'unit': {
      const f = result.factor ?? 1;
      text = `בדקו את המרת היחידות: 1 מ׳ = 100 ס״מ, ו־1 ק״מ = 1,000 מ׳. התשובה ${f > 1 ? 'גדולה' : 'קטנה'} פי ${formatNumber(f > 1 ? f : 1 / f)} מהנכון.`;
      break;
    }
    case 'denominator':
      text = `חישבתם לפי ${formatRatio(result.otherDenominator ?? D)}. קנה המידה של המפה הזו הוא ${formatRatio(D)}.`;
      break;
    case 'invalid':
      text = 'הקלידו מספר בקילומטרים, למשל 2.5.';
      break;
    default:
      text = `התוצאה רחוקה מהמרחק. קראו שוב את הסרגל (${formatNumber(reading, 1)} ס״מ) וכפלו במכנה ${formatNumber(D)}.`;
  }
  return (
    <div data-qa="answer-feedback" className={cn('mt-3 rounded-xl p-4 text-sm leading-relaxed text-fg', good ? 'bg-status-ok/10' : 'bg-status-warn/10')}>
      <p>{text}</p>
      {good && (
        <p className="mt-2 text-fg-muted">
          המרחק המחושב מהקואורדינטות: {formatDistance(groundM, 10)}. {HORIZONTAL_NOTE}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add Screen B to the scene**

In `src/components/lessons/topic-02/ScaleScene.tsx` add `import { ScaleMeasure } from './scale/ScaleMeasure';` and render `<ScaleMeasure />` right after `<ScaleExplore />`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "topic-02/(scale/|ScaleScene)"`
Expected: no output.

- [ ] **Step 5: Add `checkB` to the QA script**

In `scripts/qa/shot-scale.mjs`, add before `const SCREENS`:

```js
async function checkB() {
  const { ctx, page, errors } = await open('#scene-scale');
  await scrollTo(page, 'scale-measure');
  await shot(page, 'b-guided-10k');
  await fits(page, 'scale-measure');
  const B = block(page, 'scale-measure');

  // Guided: ground truth identical on every sheet; the chain changes.
  const truths = [];
  const chains = [];
  for (const re of [/1:10,000/, /1:50,000/, /1:250,000/]) {
    await B.getByRole('tab', { name: re }).click();
    await page.waitForTimeout(900);
    truths.push(await block(page, 'ground-truth').innerText());
    chains.push(await block(page, 'guided-chain').innerText());
    await shot(page, `b-guided-${String(re).match(/1:([\d,]+)/)[1].replace(/,/g, '')}`);
  }
  ok(truths.every((t) => t === truths[0]), `B: ground distance constant across sheets (${truths[0]})`);
  ok(new Set(chains).size === 3, 'B: the sheet reading changes with the scale');

  // Handles stay put across representations.
  const h0 = B.locator('[data-qa="handle-0"]');
  const r0 = await rectOf(h0);
  for (const name of ['תצ״א', 'השוואה', 'מפה']) {
    await B.getByRole('radio', { name }).click();
    await page.waitForTimeout(350);
    ok(sameRect(r0, await rectOf(h0)), `B: handle A stays put on ${name}`);
  }

  // Practice: identify in the orthophoto, measure on the map, answer.
  await B.getByRole('tab', { name: /תרגול/ }).click();
  await page.waitForTimeout(600);
  for (const [i, t] of PRACTICE.targets.entries()) {
    const p = await screenOf(page, 'scale-measure', PRACTICE.sheet, LANDMARKS[t.id]);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(250);
    ok((await block(page, `target-status-${i}`).getByText('זוהה', { exact: true }).count()) === 1, `B: target ${i} identified`);
  }
  await shot(page, 'b-practice-ortho');
  await B.getByRole('button', { name: 'מעבר למפה' }).click();
  await page.waitForTimeout(400);
  const chip = await block(page, 'reading-chip').innerText();
  const cm = Number(chip.replace(/[^\d.]/g, ''));
  ok(cm > 0, `B: reading chip shows ${chip}`);
  await shot(page, 'b-practice-map');

  const input = B.locator('#scale-answer');
  const km = (cm * 50000) / 100000; // reading × denominator, in km
  await input.fill((km * 10).toFixed(2));
  await B.getByRole('button', { name: 'בדיקה' }).click();
  ok((await block(page, 'answer-feedback').innerText()).includes('המרת היחידות'), 'B: ×10 answer gets the unit feedback');
  await input.fill(km.toFixed(3));
  await B.getByRole('button', { name: 'בדיקה' }).click();
  ok((await block(page, 'answer-feedback').innerText()).startsWith('נכון'), 'B: correct answer accepted');
  await shot(page, 'b-practice-correct');

  // Keyboard: move handle B by 5 mm.
  const hb = B.locator('[data-qa="handle-1"]');
  const before = await rectOf(hb);
  await hb.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const after = await rectOf(hb);
  const vpw = (await viewport(page, 'scale-measure').boundingBox()).width;
  ok(Math.abs(after[0] - before[0] - (5 * vpw) / 240) < 1.5, 'B: arrow keys move a handle 1 mm per press');

  await noHScroll(page, 'B');
  ok(errors.length === 0, `B: no console errors ${errors.join(' | ')}`);
  await ctx.close();
}
```

and change `const SCREENS = { a: checkA };` to `const SCREENS = { a: checkA, b: checkB };`.

- [ ] **Step 6: Run QA for screen B and review**

Run: `node --experimental-strip-types scripts/qa/shot-scale.mjs --screen=b`
Expected: all `ok`.

Open the `b-*.png` screenshots. Check: the ruler ticks follow the segment and the chip reads e.g. "8.9 ס״מ" on 1:10,000, "1.8 ס״מ" on 1:50,000, "0.4 ס״מ" on 1:250,000; the chain shows 890 / 900 / 1 ק״מ with ±10 / ±50 / ±250 מ׳; "המרחק בשטח לא השתנה: כ־890 מ׳" on all three; practice ortho shows א/ב handles on the summit and the dark ponds; map view shows the ruler. Fix any deltas, then re-run `--screen=a` too (shared components).

- [ ] **Step 7: Checkpoint**

`--screen=a` and `--screen=b` pass; unit tests pass; type-check clean. No commit.

---

### Task 7: Screen C — choose a map

**Files:**
- Create: `src/components/lessons/topic-02/scale/ScaleChoose.tsx`
- Modify: `src/components/lessons/topic-02/Scale2Scene.tsx` (render `<ScaleChoose />` before `<ProjectionCallout />`)
- Modify: `scripts/qa/shot-scale.mjs` (add `checkC`)

**Interfaces:**
- Consumes: Tasks 1–6 (`evaluateChoice(s, sheet, LANDMARKS, geo)`, `scenarioPoints`).
- Produces: `ScaleChoose()`. DOM hooks: `data-qa="scale-choose"`, `data-qa="coverage"`, `data-qa="choice-feedback"`.

- [ ] **Step 1: Write `ScaleChoose.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as geo from './geo';
import { formatNumber, formatRatio, lonLatToSheet } from './geo';
import { SHEETS, SHEET_IDS, type SheetId } from './scaleSheets.data';
import { LANDMARKS, SCENARIOS, type ScenarioId } from './scaleContent.data';
import { evaluateChoice } from './choose';
import { SheetViewport } from './SheetViewport';
import { FOCUS_RING, INSET, NumberBadge, OPTION_ACTIVE, OPTION_BASE, OPTION_IDLE, SheetPicker, T1, T1_INTRO, T3, T5, ViewModeToggle, useRovingKeys, type ViewMode } from './controls';
import { CURTAIN_LABELS, layersFor, preloadFor } from './layers';
import { ACCENT, Label, Marker, Pulse } from './overlayParts';

const SCENARIO_IDS = SCENARIOS.map((s) => s.id);

/** Screen C — "איזו מפה מתאימה למשימה?" (spec §6.3). */
export function ScaleChoose() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('local');
  const [sheetId, setSheetId] = useState<SheetId>('50k');
  const [mode, setMode] = useState<ViewMode>('map');
  const [curtain, setCurtain] = useState(0.5);
  const [choices, setChoices] = useState<Partial<Record<ScenarioId, SheetId>>>({});
  const preload = useMemo(() => preloadFor(SHEET_IDS), []);
  const keys = useRovingKeys(SCENARIO_IDS, scenarioId, setScenarioId);

  const idx = SCENARIO_IDS.indexOf(scenarioId);
  const sc = SCENARIOS[idx];
  const sheet = SHEETS[sheetId];
  const preview = evaluateChoice(sc, sheet, LANDMARKS, geo);
  const chosen = choices[sc.id];
  const fb = chosen ? evaluateChoice(sc, SHEETS[chosen], LANDMARKS, geo) : null;
  const layers = layersFor(sheet, mode);
  const solved = (id: ScenarioId) => choices[id] === SCENARIOS.find((s) => s.id === id)?.target;

  const feedbackText = (): string => {
    if (!fb || !chosen) return '';
    if (fb.correct) return sc.success;
    const ratio = formatRatio(SHEETS[chosen].denominator);
    const parts: string[] = [];
    if (!fb.covered) parts.push(`אזור המשימה חורג מקטע המפה. כדי לכסות אותו נדרשים לפחות ${formatNumber(fb.sheetsNeeded)} קטעים בקנה מידה ${ratio}.`);
    if (fb.missing.length) parts.push(`${fb.covered ? 'האזור כולו נכנס בקטע, אבל ' : ''}במפה הזו לא מוצגים: ${fb.missing.join(', ')}.`);
    return parts.join(' ');
  };

  return (
    <section data-qa="scale-choose" aria-labelledby="scale-choose-title" className="mb-14">
      <h3 id="scale-choose-title" className={T1}>איזו מפה מתאימה למשימה?</h3>
      <p className={T1_INTRO}>בחנו את שלוש המפות, ובחרו את זו שמכסה את כל אזור המשימה ומציגה את מה שהמשימה דורשת.</p>
      <div className="surface-elevated mt-5 p-5 sm:p-6">
        <div role="tablist" aria-label="תרחישים" onKeyDown={keys.onKeyDown} className="mb-5 grid grid-cols-3 gap-2">
          {SCENARIOS.map((s, i) => {
            const on = s.id === scenarioId;
            return (
              <button
                key={s.id}
                ref={keys.register(s.id)}
                type="button"
                role="tab"
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => setScenarioId(s.id)}
                className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'flex items-center gap-2.5 px-3 py-2 font-display text-sm font-bold text-fg')}
              >
                <NumberBadge n={i + 1} active={on} />
                {s.title}
                {solved(s.id) && <Check size={16} strokeWidth={2.5} className="ms-auto text-brand-dark" aria-label="נפתר" />}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-5">
            <div className={INSET}>
              <div className={T3}>המשימה</div>
              <p className="mt-1 text-base leading-relaxed text-fg">{sc.task}</p>
            </div>
            <div>
              <div className={cn(T5, 'mb-2')}>בחנו את המפות</div>
              <SheetPicker value={sheetId} onChange={setSheetId} controls="scale-choose-map" />
            </div>
            <p data-qa="coverage" className="text-sm leading-snug text-fg" aria-live="polite">
              {preview.covered
                ? `במפה ${formatRatio(sheet.denominator)}: כל אזור המשימה בתוך הקטע.`
                : `במפה ${formatRatio(sheet.denominator)}: אזור המשימה חורג מהקטע (נדרשים לפחות ${formatNumber(preview.sheetsNeeded)} קטעים).`}
            </p>
            <button type="button" onClick={() => setChoices((c) => ({ ...c, [sc.id]: sheetId }))} className="btn-primary h-11 self-start px-5 text-base">
              בחירה במפה {formatRatio(sheet.denominator)}
            </button>
            <div aria-live="polite">
              {fb && (
                <div data-qa="choice-feedback" className={cn('rounded-xl p-4 text-sm leading-relaxed text-fg', fb.correct ? 'bg-status-ok/10' : 'bg-status-warn/10')}>
                  <p>{feedbackText()}</p>
                  {fb.correct && idx < SCENARIOS.length - 1 && (
                    <button type="button" onClick={() => setScenarioId(SCENARIOS[idx + 1].id)} className="btn-secondary mt-3 h-10 px-4 text-sm">
                      לתרחיש הבא
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3">
              <ViewModeToggle value={mode} onChange={setMode} />
            </div>
            <SheetViewport
              id="scale-choose-map"
              label={`${sc.title}: ${sc.task} מוצגת מפה ${formatRatio(sheet.denominator)}.`}
              sheetKey={sheetId}
              groundWidthM={sheet.groundWidthM}
              base={layers.base}
              top={layers.top}
              display={layers.display}
              curtain={{ value: curtain, onChange: setCurtain, leftLabel: CURTAIN_LABELS.left, rightLabel: CURTAIN_LABELS.right }}
              attribution={layers.attribution}
              preload={preload}
              overlay={({ ppu }) => {
                const pts = sc.points.map((id) => ({ id, p: lonLatToSheet(sheet, LANDMARKS[id]) }));
                const area = sc.area?.map((c) => lonLatToSheet(sheet, c));
                const highlight = fb && !fb.correct && chosen === sheetId;
                return (
                  <g>
                    {area && (
                      <rect
                        x={Math.min(area[0].x, area[1].x)}
                        y={Math.min(area[0].y, area[1].y)}
                        width={Math.abs(area[1].x - area[0].x)}
                        height={Math.abs(area[1].y - area[0].y)}
                        fill={ACCENT}
                        fillOpacity={0.12}
                        stroke={ACCENT}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    {pts.map(({ id, p }) =>
                      highlight ? <Pulse key={`pulse-${id}`} p={p} ppu={ppu} /> : <Marker key={id} p={p} ppu={ppu} />,
                    )}
                    {pts.map(({ id, p }) => (
                      <Label key={`label-${id}`} p={p} ppu={ppu} text={LANDMARKS[id].name} />
                    ))}
                  </g>
                );
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
```

(The overlay draws the task's points and area only — no line between points, because on a map a dashed line reads as a route and spec §6.3 forbids invented routes.)

- [ ] **Step 2: Render it**

In `Scale2Scene.tsx` add `import { ScaleChoose } from './scale/ScaleChoose';` and render `<ScaleChoose />` before `<ProjectionCallout />`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "topic-02/(scale/|Scale2Scene)"` → no output.

- [ ] **Step 4: Add `checkC` to the QA script**

```js
async function checkC() {
  const { ctx, page, errors } = await open('#scene-scale-2');
  await scrollTo(page, 'scale-choose');
  await shot(page, 'c-initial');
  await fits(page, 'scale-choose');
  const C = block(page, 'scale-choose');
  const expect = { 'תכנון מקומי': '1:10,000', 'ניווט': '1:50,000', 'תכנון אזורי': '1:250,000' };
  for (const [title, target] of Object.entries(expect)) {
    await C.getByRole('tab', { name: new RegExp(title) }).click();
    await page.waitForTimeout(300);
    for (const ratio of ['1:10,000', '1:50,000', '1:250,000']) {
      await C.getByRole('tab', { name: new RegExp(ratio) }).click();
      await page.waitForTimeout(800);
      await C.getByRole('button', { name: `בחירה במפה ${ratio}` }).click();
      await page.waitForTimeout(200);
      const cls = await block(page, 'choice-feedback').getAttribute('class');
      const good = cls.includes('status-ok');
      ok(good === (ratio === target), `C: ${title} on ${ratio} → ${good ? 'correct' : 'explained'}`);
      if (ratio !== target) ok((await block(page, 'choice-feedback').innerText()).length > 20, `C: ${title} on ${ratio} has a reason`);
    }
    await C.getByRole('tab', { name: new RegExp(target) }).click();
    await page.waitForTimeout(800);
    await C.getByRole('button', { name: `בחירה במפה ${target}` }).click();
    await page.waitForTimeout(200);
    await shot(page, `c-${title.replace(/\s/g, '-')}`);
  }
  await noHScroll(page, 'C');
  ok(errors.length === 0, `C: no console errors ${errors.join(' | ')}`);
  await ctx.close();
}
```

and register `c: checkC` in `SCREENS`.

- [ ] **Step 5: Run QA for screen C and review**

Run: `node --experimental-strip-types scripts/qa/shot-scale.mjs --screen=c` → all `ok`.
Open the `c-*.png`. Check: task markers with Hebrew pills, the summit-compound rectangle on 1:10,000, the coverage line, green-tinted success, amber-tinted explanation with the sheet count. Fix deltas.

- [ ] **Step 6: Checkpoint**

Screens a–c pass. No commit.

---

### Task 8: Screen D — "zooming in doesn't add detail"

**Files:**
- Create: `src/components/lessons/topic-02/scale/ScaleZoomMyth.tsx`
- Modify: `src/components/lessons/topic-02/Scale2Scene.tsx` (render `<ScaleZoomMyth />` after `<ScaleChoose />`)
- Modify: `scripts/qa/shot-scale.mjs` (add `checkD`)

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: `ScaleZoomMyth()`. DOM hooks: `data-qa="scale-myth"`, `data-qa="myth-summary"`, `data-qa="quick-feedback"`.

- [ ] **Step 1: Write `ScaleZoomMyth.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRatio, lonLatToSheet } from './geo';
import { ATTRIBUTION, SHEETS } from './scaleSheets.data';
import { LANDMARKS, MYTH_OPTIONS, type MythId } from './scaleContent.data';
import { SheetViewport } from './SheetViewport';
import { FOCUS_RING, OPTION_ACTIVE, OPTION_BASE, OPTION_IDLE, T1, T1_INTRO, T3 } from './controls';
import { asset } from './layers';
import { Label, Pulse } from './overlayParts';

const S50 = SHEETS['50k'];
const S250 = SHEETS['250k'];
const MAGNIFY = S250.groundWidthM / S50.groundWidthM; // 5
const LEFT = `${formatRatio(S250.denominator)} מוגדלת פי ${MAGNIFY}`;
const RIGHT = formatRatio(S50.denominator);

/** Screen D — "טעות נפוצה: אם אגדיל, אראה יותר" (spec §6.4). */
export function ScaleZoomMyth() {
  const [curtain, setCurtain] = useState(0.5);
  const [picked, setPicked] = useState<ReadonlySet<MythId>>(() => new Set());
  const [checked, setChecked] = useState(false);
  const [quick, setQuick] = useState<'yes' | 'no' | null>(null);
  const preload = useMemo(() => [asset(S50.map.src), asset(S250.map.src)], []);

  const toggle = (id: MythId) => {
    setChecked(false);
    setPicked((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const allRight = MYTH_OPTIONS.every((o) => o.onlyDetailed === picked.has(o.id));

  return (
    <section data-qa="scale-myth" aria-labelledby="scale-myth-title">
      <h3 id="scale-myth-title" className={T1}>טעות נפוצה: „אם אגדיל, אראה יותר”</h3>
      <p className={T1_INTRO}>
        משמאל: מפת {formatRatio(S250.denominator)} מוגדלת פי {MAGNIFY}. מימין: מפת {formatRatio(S50.denominator)} של אותו תחום. גררו את הווילון והשוו.
      </p>
      <div className="surface-elevated mt-5 grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className={T3}>מה מופיע רק במפה {formatRatio(S50.denominator)}?</legend>
            <p className="mt-1 text-sm text-fg-muted">בחרו את כל מה שמתאים.</p>
            <div className="mt-3 grid gap-2">
              {MYTH_OPTIONS.map((o) => {
                const on = picked.has(o.id);
                const right = o.onlyDetailed === on;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(o.id)}
                    className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm text-fg')}
                  >
                    <span>{o.label}</span>
                    {checked && (right ? <Check size={16} strokeWidth={2.5} className="text-brand-dark" aria-label="נכון" /> : <X size={16} strokeWidth={2.5} className="text-fg-dim" aria-label="לא נכון" />)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <button type="button" onClick={() => setChecked(true)} disabled={picked.size === 0} className="btn-primary h-11 self-start px-5 text-base disabled:opacity-50">
            בדיקה
          </button>
          <div aria-live="polite">
            {checked && (
              <p data-qa="myth-summary" className={cn('rounded-xl p-4 text-sm leading-relaxed text-fg', allRight ? 'bg-status-ok/10' : 'bg-status-warn/10')}>
                {allRight ? 'נכון. ' : 'כמעט. הסימנים ליד כל פריט מראים מה נכון. '}
                ההגדלה הפכה את הקטע לגדול על המסך, אבל לא הוסיפה אף פרט: מה שלא צויר במפה {formatRatio(S250.denominator)} לא יופיע בה בשום הגדלה.
                סרגל המרחק זהה בשני הצדדים; רמת הפירוט לא.
              </p>
            )}
          </div>

          {checked && (
            <div>
              <div className={T3}>{formatRatio(S250.denominator)}: המספר גדול יותר. האם קנה המידה גדול יותר?</div>
              <div className="mt-2 flex gap-2">
                {(['yes', 'no'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={quick === v}
                    onClick={() => setQuick(v)}
                    className={cn(OPTION_BASE, FOCUS_RING, quick === v ? OPTION_ACTIVE : OPTION_IDLE, 'px-4 py-2 font-display text-sm font-bold')}
                  >
                    {v === 'yes' ? 'כן' : 'לא'}
                  </button>
                ))}
              </div>
              <div aria-live="polite">
                {quick && (
                  <p data-qa="quick-feedback" className={cn('mt-2 rounded-xl p-3.5 text-sm leading-relaxed text-fg', quick === 'no' ? 'bg-status-ok/10' : 'bg-status-warn/10')}>
                    {quick === 'no' ? 'נכון. ' : 'לא. '}
                    קנה מידה הוא שבר: 1/250,000 קטן מ־1/50,000. לכן כל ק״מ בשטח תופס על הדף 0.4 ס״מ בלבד, לעומת 2 ס״מ ב־1:50,000.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <SheetViewport
            label={`השוואה: מפת ${formatRatio(S250.denominator)} מוגדלת פי ${MAGNIFY} מול מפת ${formatRatio(S50.denominator)} של אותו תחום`}
            sheetKey="myth"
            groundWidthM={S50.groundWidthM}
            base={{ key: '250k-map-x5', src: asset(S250.map.src), magnify: MAGNIFY }}
            top={{ key: '50k-map', src: asset(S50.map.src) }}
            display="curtain"
            curtain={{ value: curtain, onChange: setCurtain, leftLabel: LEFT, rightLabel: RIGHT }}
            attribution={ATTRIBUTION.map}
            preload={preload}
            overlay={({ ppu }) =>
              checked ? (
                <g>
                  {MYTH_OPTIONS.filter((o) => o.onlyDetailed).map((o) => {
                    const p = lonLatToSheet(S50, LANDMARKS[o.at]);
                    return (
                      <g key={o.id}>
                        <Pulse p={p} ppu={ppu} />
                        <Label p={p} ppu={ppu} text={LANDMARKS[o.at].name} dy={-24} />
                      </g>
                    );
                  })}
                </g>
              ) : null
            }
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Render it**

In `Scale2Scene.tsx` add `import { ScaleZoomMyth } from './scale/ScaleZoomMyth';` and render `<ScaleZoomMyth />` after `<ScaleChoose />`, before `<ProjectionCallout />`.

- [ ] **Step 3: Type-check** — `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "topic-02/(scale/|Scale2Scene)"` → no output.

- [ ] **Step 4: Add `checkD` to the QA script**

```js
async function checkD() {
  const { ctx, page, errors } = await open('#scene-scale-2');
  await scrollTo(page, 'scale-myth');
  await shot(page, 'd-initial');
  await fits(page, 'scale-myth');
  const D = block(page, 'scale-myth');
  const handle = D.locator('[data-qa="curtain-handle"]');
  const vp = await viewport(page, 'scale-myth').boundingBox();
  const h = await handle.boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.x + vp.width * 0.25, h.y + h.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const after = await handle.boundingBox();
  ok(Math.abs(after.x + after.width / 2 - (vp.x + vp.width * 0.25)) < 3, 'D: curtain handle drags');
  await shot(page, 'd-curtain-25');
  for (const label of ['שמות של כפרים קטנים, כמו שיבלי', 'הדרך המתפתלת לפסגת ההר', 'מעיינות, כמו עין קישיון']) {
    await D.getByRole('button', { name: label }).click();
  }
  await D.getByRole('button', { name: 'בדיקה' }).click();
  ok((await block(page, 'myth-summary').innerText()).startsWith('נכון'), 'D: correct selection confirmed');
  await D.getByRole('button', { name: 'לא', exact: true }).click();
  ok((await block(page, 'quick-feedback').innerText()).startsWith('נכון'), 'D: quick check feedback');
  await shot(page, 'd-checked');
  await noHScroll(page, 'D');
  ok(errors.length === 0, `D: no console errors ${errors.join(' | ')}`);
  await ctx.close();
}
```

and register `d: checkD`.

- [ ] **Step 5: Run QA for screen D and review**

Run: `node --experimental-strip-types scripts/qa/shot-scale.mjs --screen=d` → all `ok`.
Open `d-*.png`. Check: left side is visibly blurred and sparse, right side crisp with village names, springs and the summit road; chips "1:250,000 מוגדלת פי 5" (left) and "1:50,000" (right) do not collide with the north arrow; pulses appear after "בדיקה". Fix deltas.

- [ ] **Step 6: Checkpoint**

Run: `node --experimental-strip-types scripts/qa/shot-scale.mjs` (all screens) → `all checks passed`. No commit.

---

### Task 9: Assumptions, specialist reviews, final verification

**Files:**
- Modify: `design/docs/assumptions.md` (append at the end)
- Any fixes the reviews require, limited to the files of this plan

- [ ] **Step 1: Append the assumptions entry**

Append to `design/docs/assumptions.md` (re-read the file's last lines first — concurrent sessions append too):

```md

## 2026-10-08 — Topic 02 scale scenes rebuilt (spec `docs/superpowers/specs/2026-10-08-scale-scene-redesign-design.md`)

- **Sheets are web-map renders, not official series sheets.** Each "1:10,000 / 1:50,000 / 1:250,000" sheet is a 24 × 24 cm extract whose topographic layer is Israel Hiking Map at zoom 15 / 13 / 11 — the zoom whose ground resolution (≈ 4 / 16 / 64 m per px) matches a ~600 px display of that sheet. The level of detail is IHM's own generalisation at that zoom; nothing is enlarged to fake detail.
- **Registration by construction.** Orthophoto (Esri World Imagery export) and map (IHM tiles, mosaicked) are cut to the same EPSG:3857 box per sheet (`scripts/maps/build-scale-sheets.mjs`); bounds live in `scale/scaleSheets.data.ts`. Crop rounding ≤ 0.5 native px. Verified by eye on landmark crops (`design/screenshots/scale-redesign/registration/`).
- **Sheet centimetres are true scale.** A "ס״מ על הדף" is ground distance ÷ denominator; Web Mercator's ~0.5 % north–south stretch on the ellipsoid is not taught, and stays within 1 % of the drawn picture (unit test). Readings are rounded to 1 mm; answers are accepted within max(1 mm on the sheet, 1 %).
- **2× screens:** the topographic rasters are native at ~1× and look slightly soft on retina displays; zooming within a sheet (k ≤ 3) only enlarges the same content — consistent with screen D's message.
- **Esri imagery capture dates vary** and are not shown.
- **Licence:** IHM tiles are CC BY-NC-SA 3.0, chosen by the user on 2026-10-08 for non-commercial course use; attribution is shown under every map (13 px).
- **Map furniture uses physical left/right** (north arrow and curtain chip top-left, scale bar bottom-left, zoom buttons bottom-right): maps are never mirrored — same accepted rtl-audit exception as the coordinates scene.
- **Old AI scale images** `public/assets/lessons/topic02/scene-scale/TOPIC02-SCALE-{10K,50K,250K}.webp` are no longer referenced; left on disk pending the user's decision.
- **Scene structure:** "קנה מידה" split into "קנה מידה 1" (explore, measure) and "קנה מידה 2" (choose, zoom myth, projections block moved verbatim). The two intro text columns of the old scene were removed; their messages are taught in screen A.
```

Add one bullet per flag changed in Task 3 Step 7, if any.

- [ ] **Step 2: Dispatch the specialist reviews (in parallel)**

Dispatch with the Agent tool, one message, five agents, each given the spec path, the list of `scale/*` files, and the QA screenshot folder `design/screenshots/scale-redesign/qa/`:
- `cartographic-reviewer` — map legibility, label sizes, arrow/line semantics, no mirroring, no halo hacks.
- `rtl-qa-reviewer` — logical properties; confirm the physical map-furniture exceptions are the only `left-/right-`.
- `a11y-qa-reviewer` — keyboard paths for every drag, ARIA roles (tablist/radiogroup/group), live regions, contrast.
- `hebrew-copy-editor` — every new Hebrew string in `scale/*.tsx`, `scaleContent.data.ts`, `Scale2Scene.tsx` (not the verbatim `ProjectionCallout` or the `ScaleScene` header).
- `military-geo-editor` — scenario facts and terms in `SCENARIOS`, the 1:50,000 navigation claim, landmark names.

Apply the findings that are correct; for copy changes keep `data-qa` strings in sync with `scripts/qa/shot-scale.mjs` (button labels used by `getByRole`).

- [ ] **Step 3: Final verification**

Run, in order:
1. `node --experimental-strip-types --test scripts/qa/scale-geo.test.mjs scripts/qa/scale-view.test.mjs scripts/qa/scale-content.test.mjs` → all PASS
2. `node --experimental-strip-types scripts/maps/check-scale-sheets.mjs` → `sheets OK`
3. `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "topic-02/(scale/|ScaleScene|Scale2Scene|Topic02Lesson)|lesson-scenes"` → no output
4. `node scripts/qa/rtl-audit.mjs` → only the documented map-furniture exceptions in `scale/SheetViewport.tsx`
5. `node --experimental-strip-types scripts/qa/shot-scale.mjs` → `all checks passed`

Open every final screenshot and compare against spec §6 once more.

- [ ] **Step 4: Checkpoint and report**

Run `git status --short` and confirm only this plan's files changed. Report to the user: what was built, QA results (paste the summary lines), the screenshots folder, open items (old images, licence). Do not commit unless asked.
```
