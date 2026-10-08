// Numeric and behavioural acceptance tests for the lesson-6 location-check
// activity (design/mockups/topic-06-principles-2026-10-08/claude-location-check-prompt.md §11).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/location-check.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDIDATES, FORK, GROVES, LAST_KNOWN, OBSERVER, READINGS, ROAD_CONTROL_POINTS, ROAD_WIDTH_M, WORLD_BOUNDS,
} from '../../src/components/lessons/topic-06/locationCheckScenario.ts';
import {
  MAP_SHEET, WORLD3D, angularDifference, bearing, bearingOfWorldDirection, distance, fromWorld3, grovePolygon,
  mapToWorld, metresToMap, normalizeDegrees, pointInPolygon, toWorld3, verticalFov, viewDirection, worldToMap, formatBearing, formatMetres, projectToView,
} from '../../src/components/lessons/topic-06/locationCheckGeometry.ts';
import {
  GRID, contours, groveTrees, heightAt, heightField, heightGrid, observerEye, roads, shrubs, spotHeights, terrainClear,
  contourLabels, meshAxis, crownShape, SHRUB_SIGHT_CORRIDOR, hidesRoadFromEye,
} from '../../src/components/lessons/topic-06/locationCheckTerrain.ts';
import {
  EMPTY_SELECTIONS, INITIAL_STATE, directionCheck, distanceCheck, evaluate, reducer, view,
} from '../../src/components/lessons/topic-06/locationCheckState.ts';
import { INITIAL_LOOK, LOOK_LIMITS } from '../../src/components/lessons/topic-06/locationCheckViewStore.ts';

const close = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const P1 = CANDIDATES.find((c) => c.id === 'area-1').center;
const P2 = CANDIDATES.find((c) => c.id === 'area-2').center;
const G1 = GROVES.find((g) => g.id === 'G1').center;
const G2 = GROVES.find((g) => g.id === 'G2').center;

// ---------------------------------------------------------------- §4 anchors

test('anchor distances and bearings (brief §4)', () => {
  close(distance(LAST_KNOWN, P1), 300, 1e-12);
  close(distance(LAST_KNOWN, P2), 300, 1e-12);
  close(bearing(P1, FORK), 43.152389734, 1e-8);
  close(bearing(P2, FORK), 7.765166018, 1e-8);
  close(distance(P1, FORK), 438.634243989, 1e-8);
  close(distance(P2, FORK), 444.072066223, 1e-8);
  close(bearing(P1, G1), 321.842773413, 1e-8);
  close(bearing(P2, G2), 321.842773413, 1e-8);
  close(distance(P1, G1), 356.089876295, 1e-8);
  close(distance(P2, G2), 356.089876295, 1e-8);
  assert.deepEqual(OBSERVER, P1);
});

test('cardinal bearings, normalisation and the short way round', () => {
  const o = { E: 100, N: 100 };
  assert.equal(bearing(o, { E: 100, N: 200 }), 0);
  assert.equal(bearing(o, { E: 200, N: 100 }), 90);
  assert.equal(bearing(o, { E: 100, N: 0 }), 180);
  assert.equal(bearing(o, { E: 0, N: 100 }), 270);
  assert.equal(normalizeDegrees(360), 0);
  assert.equal(normalizeDegrees(-90), 270);
  assert.equal(normalizeDegrees(725), 5);
  assert.ok(normalizeDegrees(-1e-14) >= 0 && normalizeDegrees(-1e-14) < 360);
  assert.equal(angularDifference(359, 1), 2);
  assert.equal(angularDifference(1, 359), 2);
  assert.equal(angularDifference(10, 350), 20);
  assert.equal(angularDifference(0, 180), 180);
  assert.equal(formatBearing(7.765166018), '008°');
  assert.equal(formatBearing(359.7), '000°');
});

test('bearing between coincident points is undefined, not 0°', () => {
  assert.equal(bearing(FORK, { ...FORK }), null);
  assert.equal(bearingOfWorldDirection(0, 0), null);
});

// ---------------------------------------------------------------- §5 map and world contracts

test('map transform: four corners, F/G1/G2, round trip, north up', () => {
  assert.deepEqual(worldToMap({ E: 0, N: 0 }), { x: 0, y: 1050 });
  assert.deepEqual(worldToMap({ E: 1400, N: 0 }), { x: 1400, y: 1050 });
  assert.deepEqual(worldToMap({ E: 0, N: 1050 }), { x: 0, y: 0 });
  assert.deepEqual(worldToMap({ E: 1400, N: 1050 }), { x: 1400, y: 0 });
  for (const p of [FORK, G1, G2, LAST_KNOWN, P1, P2]) {
    for (const [w, h] of [[MAP_SHEET.width, MAP_SHEET.height], [680, 510], [643.2, 482.4]]) {
      const m = worldToMap(p, w, h);
      const back = mapToWorld(m.x, m.y, w, h);
      close(back.E, p.E, 1e-9);
      close(back.N, p.N, 1e-9);
    }
  }
  // Same scale on both axes: the sheet is 4:3.
  close(MAP_SHEET.width / MAP_SHEET.height, 4 / 3, 1e-12);
  // North up: a point further north is higher on the sheet.
  assert.ok(worldToMap(FORK).y < worldToMap(LAST_KNOWN).y);
  assert.ok(worldToMap(FORK).x > worldToMap(G1).x);
});

test('scale bar length matches the transform', () => {
  for (const w of [MAP_SHEET.width, 680, 1440]) {
    const a = worldToMap({ E: 100, N: 50 }, w, (w * 3) / 4);
    const b = worldToMap({ E: 400, N: 50 }, w, (w * 3) / 4);
    close(b.x - a.x, metresToMap(300, w), 1e-9);
  }
});

test('3D transform: corners, round trip, north = −z, no vertical exaggeration', () => {
  assert.equal(WORLD3D.metresPerUnit, 350);
  assert.equal(WORLD3D.verticalExaggeration, 1);
  assert.deepEqual(toWorld3(0, 0, 280), [-2, 0, 1.5]);
  assert.deepEqual(toWorld3(1400, 1050, 280), [2, 0, -1.5]);
  assert.deepEqual(toWorld3(0, 1050, 280), [-2, 0, -1.5]);
  assert.deepEqual(toWorld3(1400, 0, 280), [2, 0, 1.5]);
  close(toWorld3(0, 0, 630)[1], 1, 1e-12);
  for (const p of [FORK, G1, G2, P1, P2, LAST_KNOWN]) {
    const h = heightAt(p.E, p.N);
    const back = fromWorld3(...toWorld3(p.E, p.N, h));
    close(back.E, p.E, 1e-9);
    close(back.N, p.N, 1e-9);
    close(back.heightM, h, 1e-9);
  }
  // yaw 0 looks north (−z), yaw 90 east (+x); the camera bearing to F matches the map bearing.
  const n = viewDirection(0);
  close(n[0], 0, 1e-12);
  close(n[2], -1, 1e-12);
  const e = viewDirection(90);
  close(e[0], 1, 1e-12);
  close(e[2], 0, 1e-12);
  const a = toWorld3(P1.E, P1.N, 0);
  const f = toWorld3(FORK.E, FORK.N, 0);
  close(bearingOfWorldDirection(f[0] - a[0], f[2] - a[2]), bearing(P1, FORK), 1e-9);
  const d = viewDirection(bearing(P1, FORK));
  close(bearingOfWorldDirection(d[0], d[2]), bearing(P1, FORK), 1e-9);
});

test('vertical FOV follows the frame aspect', () => {
  for (const aspect of [2.4, 680 / 280, 16 / 9]) {
    const v = verticalFov(100, aspect);
    close(Math.tan((v / 2) * (Math.PI / 180)) * aspect, Math.tan((50 * Math.PI) / 180), 1e-12);
  }
});

// ---------------------------------------------------------------- §6 one terrain

test('height grid: 281 × 211 samples every 5 m of the generator', () => {
  assert.equal(GRID.nE, 281);
  assert.equal(GRID.nN, 211);
  const g = heightGrid();
  assert.equal(g.length, 281 * 211);
  for (const [i, j] of [[0, 0], [280, 210], [200, 160], [130, 84]]) assert.equal(g[j * 281 + i], heightField(i * 5, j * 5));
  // The brief's generator dips below the 280 m datum.
  assert.ok(Math.min(...g) < 280);
  // heightAt reproduces the samples and stays linear on each triangle.
  close(heightAt(650, 420), g[84 * 281 + 130], 1e-12);
  const mesh = meshAxis(0, 1400, 6000);
  assert.ok(mesh.includes(0) && mesh.includes(1400) && mesh.includes(5) && mesh.includes(1395));
  assert.equal(mesh.filter((v) => v >= 0 && v <= 1400).length, 281);
});

test('main summit is near (1000, 800); its height comes from the field', () => {
  const { summit } = spotHeights();
  assert.ok(Math.hypot(summit.E - 1000, summit.N - 800) < 15, JSON.stringify(summit));
  assert.equal(summit.heightM, heightField(summit.E, summit.N));
});

test('contours lie on the mesh triangles (±0.1 m, unrounded)', () => {
  let worst = 0;
  let n = 0;
  for (const lv of contours()) {
    for (const line of lv.lines) {
      const P = line.pts;
      for (let k = 0; k < P.length; k++) {
        const [E, N] = P[k];
        assert.ok(E >= WORLD_BOUNDS.minE && E <= WORLD_BOUNDS.maxE && N >= WORLD_BOUNDS.minN && N <= WORLD_BOUNDS.maxN);
        worst = Math.max(worst, Math.abs(heightAt(E, N) - lv.heightM));
        const q = P[(k + 1) % P.length];
        if (k + 1 < P.length || line.closed) {
          // The midpoint of a contour segment lies inside one triangle, where the surface is linear.
          worst = Math.max(worst, Math.abs(heightAt((E + q[0]) / 2, (N + q[1]) / 2) - lv.heightM));
        }
        n++;
      }
    }
  }
  assert.ok(n > 1000);
  assert.ok(worst <= 0.1, `worst ${worst} m`);
  assert.ok(worst < 1e-6, `contours should be exact on the triangles, worst ${worst} m`);
  const levels = contours().map((c) => c.heightM);
  assert.deepEqual(levels.filter((h) => h % 50 === 0), contours().filter((c) => c.index).map((c) => c.heightM));
  assert.ok(levels.every((h, i) => i === 0 || h - levels[i - 1] === 10));
});

test('contours never cross each other', () => {
  const segs = [];
  for (const lv of contours()) for (const line of lv.lines) {
    const P = line.pts;
    const m = line.closed ? P.length : P.length - 1;
    for (let k = 0; k < m; k++) segs.push([P[k], P[(k + 1) % P.length], lv.heightM]);
  }
  const cell = 10;
  const hash = new Map();
  segs.forEach((s, idx) => {
    const x0 = Math.floor(Math.min(s[0][0], s[1][0]) / cell);
    const x1 = Math.floor(Math.max(s[0][0], s[1][0]) / cell);
    const y0 = Math.floor(Math.min(s[0][1], s[1][1]) / cell);
    const y1 = Math.floor(Math.max(s[0][1], s[1][1]) / cell);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const k = x * 1000 + y;
      if (!hash.has(k)) hash.set(k, []);
      hash.get(k).push(idx);
    }
  });
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const properCross = (s, t) => {
    const d1 = orient(s[0], s[1], t[0]);
    const d2 = orient(s[0], s[1], t[1]);
    const d3 = orient(t[0], t[1], s[0]);
    const d4 = orient(t[0], t[1], s[1]);
    return d1 * d2 < -1e-12 && d3 * d4 < -1e-12;
  };
  let crossings = 0;
  for (const list of hash.values()) {
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const s = segs[list[a]];
      const t = segs[list[b]];
      if (properCross(s, t)) crossings++;
    }
  }
  assert.equal(crossings, 0);
});

test('index-contour labels sit on their line and clear of F and the groves', () => {
  const labels = contourLabels();
  assert.ok(labels.length >= 2);
  for (const l of labels) {
    close(heightAt(l.E, l.N), l.heightM, 1e-6);
    for (const p of [FORK, G1, G2]) assert.ok(distance(p, l) > 90, `label ${l.heightM} too close to a feature`);
  }
});

test('trees: deterministic, inside their grove, on the ground (heightAt)', () => {
  const trees = groveTrees();
  assert.equal(trees, groveTrees(), 'memoised');
  const g1 = trees.filter((t) => t.grove === 'G1');
  const g2 = trees.filter((t) => t.grove === 'G2');
  assert.ok(g1.length > 30 && g2.length > 30);
  assert.ok(Math.abs(g1.length - g2.length) <= 0.25 * g1.length, 'groves of similar density');
  for (const t of trees) {
    const ring = grovePolygon(GROVES.find((g) => g.id === t.grove).center);
    assert.ok(pointInPolygon(t, ring));
    assert.equal(t.baseM, heightAt(t.E, t.N));
  }
  for (const s of shrubs().slice(0, 500)) assert.equal(s.baseM, heightAt(s.E, s.N));
});

test('roads: one fork at F, brief end points, shared 8 m width', () => {
  assert.equal(ROAD_WIDTH_M, 8);
  const [main, branch] = roads();
  assert.ok(main.pts.some(([E, N]) => E === FORK.E && N === FORK.N));
  assert.deepEqual(branch.pts[0], [FORK.E, FORK.N]);
  assert.deepEqual(main.pts[0], [1080, 350]);
  assert.deepEqual(main.pts.at(-1), [1190, 990]);
  assert.deepEqual(branch.pts.at(-1), [780, 960]);
  assert.deepEqual(ROAD_CONTROL_POINTS.main[0], [1080, 350]);
  for (const r of roads()) for (let k = 1; k < r.pts.length; k++) {
    const step = Math.hypot(r.pts[k][0] - r.pts[k - 1][0], r.pts[k][1] - r.pts[k - 1][1]);
    assert.ok(step > 0 && step <= 2.5, `${r.id} sample spacing ${step}`);
  }
});

// ---------------------------------------------------------------- §7 the observation

test('from the eye: the fork and the left grove are visible over the terrain', () => {
  const eye = observerEye();
  close(eye.heightM, heightAt(OBSERVER.E, OBSERVER.N) + 1.7, 1e-12);
  // F (a little above the road surface) is not hidden by the ground.
  assert.ok(terrainClear(eye, { E: FORK.E, N: FORK.N, heightM: heightAt(FORK.E, FORK.N) + 0.3 }));
  // G1's crowns clear the low rise in front of them.
  const g1 = groveTrees().filter((t) => t.grove === 'G1');
  const tops = g1.filter((t) => terrainClear(eye, { E: t.E, N: t.N, heightM: t.baseM + t.heightM })).length;
  assert.ok(tops / g1.length > 0.8, `${tops}/${g1.length} crowns visible`);
  // The measured 043° is the direction to F from the observation point, to the degree.
  assert.equal(Math.round(bearing(OBSERVER, FORK)), READINGS.forkBearingDeg);
});

test('scrub never rises into the sight line to the left grove', () => {
  const eye = observerEye();
  const mid = (SHRUB_SIGHT_CORRIDOR.fromDeg + SHRUB_SIGHT_CORRIDOR.toDeg) / 2;
  const half = (SHRUB_SIGHT_CORRIDOR.toDeg - SHRUB_SIGHT_CORRIDOR.fromDeg) / 2;
  for (const s of shrubs()) {
    const d = distance(OBSERVER, s);
    const b = bearing(OBSERVER, s);
    if (b === null || d >= SHRUB_SIGHT_CORRIDOR.maxDistanceM || angularDifference(b, mid) > half) continue;
    assert.ok(s.baseM + s.heightM <= eye.heightM - 0.3 + 1e-9, `shrub at ${s.E.toFixed(0)},${s.N.toFixed(0)} tops the eye line`);
  }
});

const crownPoints = (id) => groveTrees().filter((t) => t.grove === id).map((t) => crownShape(t).center);

test('opening view (4:3): both grove landmarks are whole in the frame', () => {
  const eye = observerEye();
  const aspect = 4 / 3;
  // The vertical FOV follows the frame: tan(v/2)·aspect = tan(h/2) (HFOV 78° → ≈ 62.5° at 4:3).
  const v = verticalFov(INITIAL_LOOK.hfovDeg, aspect);
  close(Math.tan((v / 2) * (Math.PI / 180)) * aspect, Math.tan((INITIAL_LOOK.hfovDeg / 2) * (Math.PI / 180)), 1e-12);
  const xs = (id) => crownPoints(id).map((p) => projectToView(INITIAL_LOOK, aspect, eye, p));
  const g1 = xs('G1');
  const g2 = xs('G2');
  for (const p of [...g1, ...g2]) assert.ok(p.inFront && p.x > 0.01 && p.x < 0.99 && p.y > 0.08 && p.y < 0.9, `crown at ${p.x.toFixed(3)},${p.y.toFixed(3)}`);
  // "Left" and "right" in the opening view: every G1 crown left of every G2 crown.
  assert.ok(Math.max(...g1.map((p) => p.x)) < Math.min(...g2.map((p) => p.x)));
  // The road split is off-frame to the right of the opening view; "הראו את התפצלות הדרך" brings it in.
  const fork = { E: FORK.E, N: FORK.N, heightM: heightAt(FORK.E, FORK.N) };
  assert.ok(projectToView(INITIAL_LOOK, aspect, eye, fork).x > 1);
  const elev = (Math.atan2(fork.heightM - eye.heightM, distance(OBSERVER, FORK)) * 180) / Math.PI;
  const f = projectToView(roadSplitLook(), aspect, eye, fork);
  assert.ok(f.inFront && Math.abs(f.x - 0.5) < 0.05 && f.y > 0.2 && f.y < 0.6, `fork view ${f.x.toFixed(3)},${f.y.toFixed(3)}`);
});

test('the fork reads from the eye: both near-slope arms are visible up to F', () => {
  const eye = observerEye();
  const visibleRun = (pts, fromIdx, step) => {
    let run = 0;
    for (let k = fromIdx + step; k >= 0 && k < pts.length; k += step) {
      const [E, N] = pts[k];
      if (!terrainClear(eye, { E, N, heightM: heightAt(E, N) + 0.3 })) break;
      run += Math.hypot(E - pts[k - step][0], N - pts[k - step][1]);
    }
    return run;
  };
  const [main, branch] = roads();
  const fi = main.pts.findIndex(([E, N]) => E === FORK.E && N === FORK.N);
  // Main road arriving from the south, and the branch leaving west-south-west:
  // each stays in sight for a good stretch from F.
  assert.ok(visibleRun(main.pts, fi, -1) > 150, 'main road (south arm) visible from F');
  assert.ok(visibleRun(branch.pts, 0, 1) > 150, 'branch visible from F');
  // The main road's continuation crosses the crest right after F (documented).
  assert.ok(visibleRun(main.pts, fi, 1) < 40);
});

/** The look "הראו את התפצלות הדרך" sets (LocationCheckObservation.roadSplitLook). */
function roadSplitLook() {
  const eye = observerEye();
  const elev = (Math.atan2(heightAt(FORK.E, FORK.N) - eye.heightM, distance(OBSERVER, FORK)) * 180) / Math.PI;
  return { yawDeg: READINGS.forkBearingDeg, pitchDeg: elev - 3, hfovDeg: LOOK_LIMITS.hfovMin };
}

test('no scrub clump hides a road surface from the eye', () => {
  const hiding = shrubs().filter((sh) => hidesRoadFromEye(sh, sh.baseM + sh.heightM, sh.radiusM));
  assert.equal(hiding.length, 0, `${hiding.length} clumps in a sight line to a road`);
});

test('the road-split view: both arms in the frame and wider than 2 px at the panel\'s normal size', () => {
  // The observation panel is 496 × 372 px at 1440 × 1122 (measured by scripts/qa/shot-location-check.mjs).
  const W = 496;
  const H = 372;
  const eye = observerEye();
  const look = roadSplitLook();
  const [main, branch] = roads();
  const fi = main.pts.findIndex(([E, N]) => E === FORK.E && N === FORK.N);
  const arms = { south: main.pts.slice(0, fi + 1).reverse(), branch: branch.pts };
  for (const [name, pts] of Object.entries(arms)) {
    let along = 0;
    for (let k = 1; k < pts.length - 1 && along < 100; k++) {
      along += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      if (along < 8) continue;
      const [E, N] = pts[k];
      const tE = pts[k + 1][0] - E;
      const tN = pts[k + 1][1] - N;
      const tl = Math.hypot(tE, tN);
      const at = (o) => {
        const e = E - (tN / tl) * o;
        const n = N + (tE / tl) * o;
        return projectToView(look, W / H, eye, { E: e, N: n, heightM: heightAt(e, n) });
      };
      const c = at(0);
      const next = projectToView(look, W / H, eye, { E: pts[k + 1][0], N: pts[k + 1][1], heightM: heightAt(pts[k + 1][0], pts[k + 1][1]) });
      assert.ok(c.inFront && c.x > 0 && c.x < 1 && c.y > 0 && c.y < 1, `${name} at ${along.toFixed(0)} m is out of the frame`);
      // Width of the 8 m surface across its own screen direction.
      const dx = (next.x - c.x) * W;
      const dy = (next.y - c.y) * H;
      const dl = Math.hypot(dx, dy);
      const a = at(ROAD_WIDTH_M / 2);
      const b = at(-ROAD_WIDTH_M / 2);
      const width = Math.abs(((a.x - b.x) * W * -dy) / dl + ((a.y - b.y) * H * dx) / dl);
      assert.ok(width >= 2, `${name} at ${along.toFixed(0)} m is ${width.toFixed(2)} px wide`);
    }
  }
});

// ---------------------------------------------------------------- §8 evaluation and behaviour

const AREAS = ['area-1', 'area-2'];

test('the task has one choice — the area; the groves are not part of the check', () => {
  assert.deepEqual(Object.keys(EMPTY_SELECTIONS), ['candidateId']);
  const r = evaluate({ candidateId: 'area-1' });
  assert.deepEqual(Object.keys(r).sort(), ['candidateId', 'direction', 'distance', 'kind']);
});

test('no verdict without an area — only the missing choice is reported', () => {
  assert.deepEqual(evaluate(EMPTY_SELECTIONS), { kind: 'missing' });
  const s = reducer(INITIAL_STATE, { type: 'check' });
  assert.equal(view(s).result.kind, 'missing');
  assert.equal(view(s).solved, false);
});

test('the verdict is exactly "direction fits and distance fits" — nothing else', () => {
  for (const id of AREAS) {
    const r = evaluate({ candidateId: id });
    const expected = directionCheck(id).consistent && distanceCheck(id).consistent ? 'supported' : 'contradicted';
    assert.equal(r.kind, expected, id);
    assert.deepEqual(r.direction, directionCheck(id));
    assert.deepEqual(r.distance, distanceCheck(id));
  }
});

test('area 1 — supported, numbers from the coordinates', () => {
  const r = evaluate({ candidateId: 'area-1' });
  assert.equal(r.kind, 'supported');
  assert.ok(r.direction.consistent && r.distance.consistent);
  close(r.direction.predictedDeg, bearing(P1, FORK), 1e-12);
  close(r.distance.predictedM, 300, 1e-12);
});

test('the distance fits both areas, so on its own it cannot decide', () => {
  for (const id of AREAS) {
    const d = distanceCheck(id);
    assert.ok(d.consistent);
    assert.equal(d.fitsCandidates, 2);
  }
});

test('area 2 — a clear direction failure although the distance fits', () => {
  const r = evaluate({ candidateId: 'area-2' });
  assert.equal(r.kind, 'contradicted');
  assert.equal(r.direction.consistent, false);
  assert.ok(r.distance.consistent);
  close(r.direction.predictedDeg, 7.765166018, 1e-8);
  close(r.direction.differenceDeg, 43 - 7.765166018, 1e-8);
  assert.equal(formatBearing(r.direction.predictedDeg), '008°');
});

test('the map values shown before the check: the distance alike, the direction apart', () => {
  // What the map labels for a chosen area (the same functions the check uses).
  const shown = (id) => ({ dir: formatBearing(directionCheck(id).predictedDeg), dist: formatMetres(distanceCheck(id).predictedM) });
  assert.deepEqual(shown('area-1'), { dir: '043°', dist: '300 מ׳' });
  assert.deepEqual(shown('area-2'), { dir: '008°', dist: '300 מ׳' });
  assert.equal(formatBearing(READINGS.forkBearingDeg), '043°');
});

test('choosing an area shows nothing as a verdict until the check', () => {
  const s = reducer(INITIAL_STATE, { type: 'selectCandidate', id: 'area-1' });
  assert.equal(s.attempt, null);
  assert.equal(view(s).result, null);
  assert.equal(view(s).solved, false);
});

test('changing the area after a check voids the old result', () => {
  let s = reducer(INITIAL_STATE, { type: 'selectCandidate', id: 'area-1' });
  s = reducer(s, { type: 'check' });
  assert.equal(view(s).solved, true);
  s = reducer(s, { type: 'selectCandidate', id: 'area-2' });
  assert.equal(view(s).stale, true);
  assert.equal(view(s).result, null);
  assert.equal(view(s).solved, false);
  // Choosing the checked area again makes the snapshot current again.
  s = reducer(s, { type: 'selectCandidate', id: 'area-1' });
  assert.equal(view(s).stale, false);
  assert.equal(view(s).solved, true);
  // And from a failed check too.
  s = reducer(reducer(s, { type: 'selectCandidate', id: 'area-2' }), { type: 'check' });
  assert.equal(view(s).result.kind, 'contradicted');
  s = reducer(s, { type: 'selectCandidate', id: 'area-1' });
  assert.equal(view(s).stale, true);
  assert.equal(view(s).result, null);
});

test('reset returns the whole activity to its opening state', () => {
  let s = reducer(INITIAL_STATE, { type: 'selectCandidate', id: 'area-2' });
  s = reducer(s, { type: 'setGpsReason', id: 'battery' });
  s = reducer(s, { type: 'check' });
  const r = reducer(s, { type: 'reset' });
  assert.deepEqual({ ...r, resetToken: 0 }, INITIAL_STATE);
  assert.equal(r.resetToken, s.resetToken + 1);
  assert.equal(r.gpsStatus, 'unavailable');
});
