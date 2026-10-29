// Numeric and behavioural tests for the lesson-6 dead-reckoning activity ("ניווט עיוור", the sandstorm walk).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/dead-reckoning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import('../../src/components/lessons/topic-06/dead-reckoning/deadReckoningModel.ts');
const T = await import('../../src/components/lessons/topic-06/dead-reckoning/deadReckoningTerrain.ts');
const D = await import('../../src/components/lessons/topic-06/dead-reckoning/deadReckoningMaterials.ts');
const G = await import('../../src/components/lessons/topic-06/locationCheckGeometry.ts');

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const run = (actions, s = M.INITIAL_STATE) => actions.reduce(M.reducer, s);
const walkTo = (pairs, s) => {
  while (s.pairs < pairs) {
    s = M.reducer(s, { type: 'advance' });
    s = M.reducer(s, { type: 'arrive' });
    if (s.pairs === M.WADI_STOP_PAIRS && pairs > M.WADI_STOP_PAIRS) s = run([{ type: 'chooseSign', value: 'wadi' }, { type: 'checkSign' }], s);
  }
  return s;
};
const departed = () => run([{ type: 'setCount', value: 800 }, { type: 'checkCount' }, { type: 'setHeading', value: 62 }, { type: 'depart' }]);

// ---------------------------------------------------------------- the leg and its numbers

test('B is 1,200 m from A at 62° (E = A + 1200·sin62°, N = A + 1200·cos62°), inside the sheet', () => {
  close(M.TARGET.E - M.START.E, 1200 * Math.sin((62 * Math.PI) / 180), 1e-9, 'ΔE');
  close(M.TARGET.N - M.START.N, 1200 * Math.cos((62 * Math.PI) / 180), 1e-9, 'ΔN');
  close(G.bearing(M.START, M.TARGET), 62, 1e-9, 'bearing A→B');
  close(G.distance(M.START, M.TARGET), 1200, 1e-9, 'distance A→B');
  for (const p of [M.START, M.TARGET, M.HILL.center]) assert.ok(p.E > 0 && p.E < M.SHEET.width && p.N > 0 && p.N < M.SHEET.height, 'on the sheet');
  assert.ok(M.TARGET.E > M.START.E && M.TARGET.N > M.START.N, 'B lies east and north of A: no RTL flip of the drawing');
});

test('the pace count: 1.5 m per pace pair → 800 pairs; segments of 100 = 150 m; 400 = 600 m', () => {
  assert.equal(M.PLANNED_PAIRS, 800);
  assert.equal(M.SEGMENT_M, 150);
  assert.equal(M.pairsToMetres(400), 600);
  assert.equal(M.pairsToMetres(800), 1200);
  assert.deepEqual(M.STOPS, [0, 100, 200, 300, 400, 500, 600, 700, 800]);
  assert.equal(M.DISTANCE_M / M.OTHER_PACE_M, 750, 'another navigator, another count');
  assert.equal(M.evaluateCount(800), 'right');
  assert.equal(M.evaluateCount(1200), 'metres');
  assert.equal(M.evaluateCount(1600), 'single-steps');
  assert.equal(M.evaluateCount(1800), 'multiplied');
  assert.equal(M.evaluateCount(750), 'other');
});

test('the wadi crosses the planned line once, 615 m from A: 15 m ahead of the 400-pair stop, out of sight from every other stop', () => {
  const p = M.along(M.WADI_CROSSING_M);
  close(G.distanceToPolyline(p, M.WADI), 0, 1e-9, 'the crossing point is on the wadi');
  assert.equal(M.WADI_STOP_PAIRS, 400);
  const ahead = M.WADI_CROSSING_M - M.pairsToMetres(M.WADI_STOP_PAIRS);
  assert.ok(ahead > M.WADI_WIDTH_M / 2 && ahead < M.VISIBILITY_M, `from the 400 stop its centre is ${ahead} m ahead — past its near bank, inside the sight`);
  // one sign change of the side of the wadi along the line (the wadi runs north–south across the sheet)
  const side = (d) => {
    const q = M.along(d);
    for (let k = 0; k < M.WADI.length - 1; k++) {
      const [e1, n1] = M.WADI[k];
      const [e2, n2] = M.WADI[k + 1];
      if ((q.N <= n1 && q.N >= n2) || (q.N >= n1 && q.N <= n2)) return Math.sign(q.E - (e1 + ((e2 - e1) * (q.N - n1)) / (n2 - n1)));
    }
    return 0;
  };
  let changes = 0;
  let prev = side(0);
  for (let d = 5; d <= 1200; d += 5) {
    const s = side(d);
    if (s !== 0 && prev !== 0 && s !== prev) changes++;
    if (s !== 0) prev = s;
  }
  assert.equal(changes, 1);
  for (const pairs of M.STOPS) {
    const bank = G.distanceToPolyline(M.along(M.pairsToMetres(pairs)), M.WADI) - M.WADI_WIDTH_M / 2;
    if (pairs === M.WADI_STOP_PAIRS) assert.ok(bank < 10, `stop ${pairs}: the near bank ${bank.toFixed(1)} m away`);
    else assert.ok(bank > 4 * M.VISIBILITY_M, `stop ${pairs}: ${bank.toFixed(1)} m from the wadi bank`);
  }
});

test('the two roads meet at A and leave it away from the 62° line; none is in sight after the first stop', () => {
  for (const r of M.ROADS) close(G.distanceToPolyline(M.START, r.pts), 0, 1e-9, r.id);
  for (let k = 1; k <= 8; k++) for (const r of M.ROADS) assert.ok(G.distanceToPolyline(M.along(k * 150), r.pts) > M.VISIBILITY_M + M.ROAD_WIDTH_M, `${r.id} at stop ${k}`);
});

test('the hill with the antenna: 160 m north-west of B, off the line, never within sight on the walk', () => {
  close(G.distance(M.TARGET, M.HILL.center), 160, 1e-9);
  close(G.bearing(M.TARGET, M.HILL.center), 315, 1e-9);
  for (const pairs of M.STOPS) assert.ok(G.distance(M.along(M.pairsToMetres(pairs)), M.HILL.center) - M.HILL.radiusM > 2 * M.VISIBILITY_M, `stop ${pairs}`);
  assert.ok(G.distanceToPolyline(M.HILL.center, [M.START, M.TARGET]) > M.HILL.radiusM, 'the leg does not cross the hill');
});

test('the debrief: 3° off is ≈63 m from B after 1,200 m; a 1.4 m pace stops 80 m short; both beyond sight', () => {
  close(M.deviationGap(1200), 62.82, 0.01);
  close(G.distance(M.DEBRIEF_END.deviation, M.TARGET), M.deviationGap(1200), 1e-9);
  close(G.distance(M.START, M.DEBRIEF_END.deviation), 1200, 1e-9, 'the deviated walk is still 1,200 m long');
  close(M.shortPaceShortfall(), 80, 1e-9);
  close(G.distance(M.DEBRIEF_END['short-pace'], M.TARGET), 80, 1e-9);
  for (const c of M.DEBRIEF_CASES) assert.ok(G.distance(M.DEBRIEF_END[c], M.TARGET) > 2 * M.VISIBILITY_M, `${c}: B is not in sight from there`);
});

test('heading feedback: only 62° departs; the turn and the end gap are computed', () => {
  assert.deepEqual(M.evaluateHeading(62), { kind: 'right' });
  const a = M.evaluateHeading(50);
  assert.equal(a.turnDeg, 12);
  close(a.endGapM, 2 * 1200 * Math.sin((6 * Math.PI) / 180), 1e-9);
  assert.equal(M.evaluateHeading(298).cause, 'counter-clockwise');
  assert.equal(M.evaluateHeading(28).cause, 'from-east');
  assert.equal(M.evaluateHeading(242).cause, 'reverse');
  assert.equal(M.evaluateHeading(359).turnDeg, 63);
});

// ---------------------------------------------------------------- flows

test('preparing: each wrong count is named and can be fixed; the compass waits for the right count; reset hides the count again', () => {
  let s = run([{ type: 'setHeading', value: 62 }]);
  assert.equal(s.heading, 0, 'the compass waits for the count');
  for (const [value, verdict] of [[1800, 'multiplied'], [1600, 'single-steps'], [1200, 'metres'], [42, 'other']]) {
    s = run([{ type: 'setCount', value }, { type: 'checkCount' }], s);
    assert.equal(M.view(s).count, verdict);
    assert.equal(M.view(s).countKnown, false, `not known after ${value}`);
    assert.equal(M.view(s).phase, 'count');
  }
  s = M.reducer(s, { type: 'setCount', value: 800 });
  assert.equal(M.view(s).count, null, 'a changed answer clears the verdict');
  assert.equal(M.view(s).countKnown, false, 'typed but unchecked: still unknown');
  s = M.reducer(s, { type: 'checkCount' });
  assert.equal(M.view(s).count, 'right');
  assert.ok(M.view(s).countKnown && M.view(s).phase === 'compass');
  assert.equal(M.reducer(s, { type: 'setCount', value: 900 }), s, 'a right count stays');
  assert.equal(M.view(M.reducer(s, { type: 'restart' })).countKnown, false);
  for (const bad of [1.5, -3, null, 1e9]) assert.equal(run([{ type: 'setCount', value: bad }]).count, null, `${bad} is not a count`);
});

test('the compass: a wrong setting is refused with its cause; 062° departs', () => {
  let s = run([{ type: 'setCount', value: 800 }, { type: 'checkCount' }, { type: 'turn', by: -10 }]);
  assert.equal(s.heading, 350);
  s = run([{ type: 'setHeading', value: 298 }, { type: 'depart' }], s);
  assert.equal(s.step, 'plan');
  assert.equal(M.view(s).heading.cause, 'counter-clockwise');
  s = run([{ type: 'setHeading', value: 60 }], s);
  assert.equal(M.view(s).heading, null, 'turning clears the verdict');
  s = run([{ type: 'turn', by: 1 }, { type: 'turn', by: 1 }, { type: 'depart' }], s);
  assert.equal(s.step, 'walk');
  assert.equal(M.reducer(s, { type: 'turn', by: 10 }), s, 'the compass is fixed under way');
});

test('walking: one segment per press — presses while it runs are ignored; the wadi must be identified before walking on', () => {
  let s = departed();
  s = M.reducer(s, { type: 'advance' });
  assert.ok(s.moving);
  assert.equal(M.reducer(s, { type: 'advance' }), s, 'a second press while walking does nothing');
  s = M.reducer(s, { type: 'arrive' });
  assert.equal(s.pairs, 100);
  assert.equal(M.reducer(s, { type: 'arrive' }), s, 'no arrival without a segment');
  s = walkTo(400, s);
  assert.equal(s.pairs, 400);
  assert.ok(M.view(s).atWadi);
  assert.equal(M.view(s).canAdvance, false);
  assert.equal(M.reducer(s, { type: 'advance' }), s, 'not past the wadi before it is identified');
  s = run([{ type: 'chooseSign', value: 'road' }, { type: 'checkSign' }], s);
  assert.equal(M.view(s).sign, 'wrong');
  assert.equal(M.view(s).wadiKnown, false);
  s = run([{ type: 'chooseSign', value: 'wadi' }, { type: 'checkSign' }], s);
  assert.ok(M.view(s).wadiKnown && M.view(s).canAdvance);
  s = run([{ type: 'advance' }, { type: 'arrive' }], s);
  assert.equal(s.pairs, 500);
  assert.equal(M.view(s).atWadi, false, '150 m later the wadi is no longer the one in sight');
  s = walkTo(800, s);
  assert.equal(s.step, 'verify', 'the count completes into a question, not an arrival');
  assert.ok(M.view(s).counted && !M.view(s).done);
  assert.equal(M.reducer(s, { type: 'advance' }), s);
});

test('deciding: "proof" and "keep walking" are wrong, "an estimate, verify" ends it and opens the debrief; reset clears all', () => {
  let s = walkTo(800, departed());
  assert.equal(M.reducer(s, { type: 'setDebrief', value: 'short-pace' }), s, 'no debrief before the decision');
  s = run([{ type: 'checkVerify' }], s);
  assert.equal(M.view(s).verify, null, 'nothing to check without a choice');
  for (const v of ['proof', 'keep-walking']) {
    s = run([{ type: 'chooseVerify', value: v }, { type: 'checkVerify' }], s);
    assert.equal(M.view(s).verify, 'wrong', v);
  }
  s = run([{ type: 'chooseVerify', value: 'estimate' }, { type: 'checkVerify' }], s);
  assert.ok(M.view(s).done);
  s = M.reducer(s, { type: 'setDebrief', value: 'short-pace' });
  assert.equal(s.debrief, 'short-pace');
  assert.equal(M.reducer(s, { type: 'chooseVerify', value: 'proof' }), s);
  assert.deepEqual(M.reducer(s, { type: 'restart' }), M.INITIAL_STATE);
  // reset in the middle of a segment, too
  const mid = M.reducer(departed(), { type: 'advance' });
  assert.deepEqual(M.reducer(mid, { type: 'restart' }), M.INITIAL_STATE);
});

// ---------------------------------------------------------------- the terrain the camera walks

test('the wadi is a real channel where the map puts it: ~1.8 m deep, plain on both sides', () => {
  const at = (m) => {
    const p = M.along(m);
    return T.heightAt(p.E, p.N);
  };
  const bed = Math.min(...[612, 614, 615, 616, 618].map(at));
  const plain = (at(585) + at(645)) / 2;
  assert.ok(plain - bed > 1.4 && plain - bed < 2.4, `depth ${(plain - bed).toFixed(2)} m`);
  // no channel anywhere else on the walk
  for (let m = 0; m <= 1200; m += 2) {
    if (m > 595 && m < 635) continue;
    assert.equal(T.surfaceAt(M.along(m).E, M.along(m).N).bank, 0, `no bank at ${m} m`);
  }
});

test('the eye: 1.7 m over the ground at every stop; the walk has no steps outside the wadi', () => {
  for (const pairs of M.STOPS) {
    const p = M.along(M.pairsToMetres(pairs));
    close(T.eyeHeightAt(p.E, p.N) - T.groundUnder(p.E, p.N), T.EYE_HEIGHT_M, 1e-9);
    assert.ok(Math.abs(T.groundUnder(p.E, p.N) - T.heightAt(p.E, p.N)) < 0.15, `stop ${pairs}: feet on the ground`);
  }
  for (let m = 0; m < 1200; m += 1) {
    if (m > 600 && m < 630) continue;
    const a = M.along(m);
    const b = M.along(m + 1);
    assert.ok(Math.abs(T.eyeHeightAt(a.E, a.N) - T.eyeHeightAt(b.E, b.N)) < 0.35, `${m} m`);
  }
});

test('E/N to the scene: A at the origin, north is −z, 62° points along (sin, 0, −cos)', () => {
  assert.deepEqual(T.toScene(M.START.E, M.START.N, 0), [0, 0, -0]);
  const [x, , z] = T.toScene(M.TARGET.E, M.TARGET.N, 0);
  close(x, 1200 * Math.sin((62 * Math.PI) / 180), 1e-9);
  close(z, -1200 * Math.cos((62 * Math.PI) / 180), 1e-9);
  const [dx, dz] = T.azimuthToScene(62);
  close(dx * 1200, x, 1e-9);
  close(dz * 1200, z, 1e-9);
  const p = T.legToEN(600, 0);
  close(p.E, M.along(600).E, 1e-9);
});

test('chunks meet without seams, and the scatter is the same every time — clear of the walker’s path', () => {
  const a = T.buildChunk(10, 0);
  const b = T.buildChunk(11, 0);
  const n = Math.round(T.CHUNK_M / T.chunkStep(0)) + 1;
  for (let r = 0; r < n; r += 7) {
    const ka = r * n + (n - 1);
    const kb = r * n;
    close(a.position[ka * 3 + 1], b.position[kb * 3 + 1], 1e-5, `row ${r}`);
    close(a.normal[ka * 3 + 1], b.normal[kb * 3 + 1], 1e-4, `normal row ${r}`);
  }
  assert.deepEqual(T.scatterChunk(25, -1), T.scatterChunk(25, -1));
  for (let i = -2; i < 52; i += 3)
    for (const j of [-1, 0]) {
      for (const r of [...T.scatterChunk(i, j).rocks, ...T.scatterChunk(i, j).shrubs]) {
        if (r.shape.startsWith('stone')) continue;
        const u = r.x * T.LEG.aE + -r.z * T.LEG.aN;
        const v = r.x * T.LEG.rE + -r.z * T.LEG.rN;
        assert.ok(Math.abs(v) > 1.3 || u < -2, `${r.shape} at ${u.toFixed(1)}, ${v.toFixed(1)} stands on the path`);
      }
    }
});

test('the storm: about half the contrast at 15 m, a sixth at 30 m, nothing recognisable at 50 m and beyond', () => {
  close(D.dustTransmittance(15), 0.52, 0.04);
  close(D.dustTransmittance(M.VISIBILITY_M), 0.16, 0.03);
  assert.ok(D.dustTransmittance(50) < 0.03);
  assert.ok(D.dustTransmittance(80) < 0.001);
  // The nearest feature hidden from each stop (roads, the wadi away from its stop, the hill, B) — even through
  // the thinnest drifting dust (density 0.6) at most ~2 % of its contrast reaches the eye.
  for (const pairs of M.STOPS.filter((p) => p > 0)) {
    const at = M.along(M.pairsToMetres(pairs));
    const d = Math.min(
      ...M.ROADS.map((r) => G.distanceToPolyline(at, r.pts) - M.ROAD_WIDTH_M / 2),
      pairs === M.WADI_STOP_PAIRS ? Infinity : G.distanceToPolyline(at, M.WADI) - M.WADI_WIDTH_M / 2,
      G.distance(at, M.HILL.center) - M.HILL.radiusM,
      pairs === M.PLANNED_PAIRS ? Infinity : G.distance(at, M.TARGET),
    );
    assert.ok(D.dustTransmittance(d, 0.6) < 0.02, `stop ${pairs}: nearest hidden feature ${d.toFixed(0)} m away`);
  }
});

// ---------------------------------------------------------------- the copy

test('the approved principle stays in the scene, and no fixed text of the technique gives the count', () => {
  const src = readFileSync(new URL('../../src/components/lessons/topic-06/CombatNavScene.tsx', import.meta.url), 'utf8');
  assert.ok(
    src.includes('ניווט עיוור מתבסס על נקודת מוצא ידועה ועל אזימוט ומרחק שנקבעו מראש. את המרחק מעריכים בספירת צעדים כפולים, לפי מדידה אישית. שגיאות בכיוון ובספירה מצטברות, ולכן בודקים את המיקום מול סימני שטח בכל הזדמנות. השיטה מתאימה כשהראות מוגבלת או שיש מעט סימנים מובחנים, ובתנאי שנקודת המוצא ידועה.'),
  );
  assert.doesNotMatch(src, /(?<![\d,.])800(?!\d)/, 'the scene never states the count');
  const field = readFileSync(new URL('../../src/components/lessons/topic-06/dead-reckoning/DeadReckoningField.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(field, /PLANNED_PAIRS/, 'the stand-in view takes the count from the activity, once known');
});
