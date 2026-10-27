// Numeric and behavioural acceptance tests for the lesson-6 terrain-association activity
// ("ניווט לפי השטח", design/mockups/combatnav-concepts-2026-10-12/claude-terrain-navigation-prompt.txt §6–§10).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/terrain-nav.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = '../../src/components/lessons/topic-06/terrain-nav/';
const S = await import(base + 'terrainNavScenario.ts');
const G = await import(base + 'terrainNavGeometry.ts');
const T = await import(base + 'terrainNavTerrain.ts');
const M = await import(base + 'terrainNavMesh.ts');
const P = await import(base + 'terrainNavPractice.ts');
const ST = await import(base + 'terrainNavState.ts');
const F = await import(base + 'terrainNavFeatures.ts');

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);

// ---------------------------------------------------------------- measurements and transforms

test('bearing and distance: cardinal directions, clockwise from north, no RTL flip', () => {
  const o = { E: 500, N: 500 };
  assert.equal(G.bearing(o, { E: 500, N: 600 }), 0);
  assert.equal(G.bearing(o, { E: 600, N: 500 }), 90);
  assert.equal(G.bearing(o, { E: 500, N: 400 }), 180);
  assert.equal(G.bearing(o, { E: 400, N: 500 }), 270);
  close(G.bearing(o, { E: 600, N: 600 }), 45, 1e-12);
  close(G.distance(o, { E: 530, N: 540 }), 50, 1e-12);
  assert.equal(G.bearing(o, { ...o }), null);
  assert.equal(G.normalizeDegrees(-90), 270);
  assert.equal(G.compassPoint(0), 'N');
  assert.equal(G.compassPoint(90), 'E');
  assert.equal(G.compassPoint(225), 'SW');
  assert.equal(G.compassPoint(337.6), 'N');
});

test('map transform: north up, east right, 1 unit = 1 m, round trip', () => {
  assert.deepEqual(G.worldToMap({ E: 0, N: 0 }), { x: 0, y: 1750 });
  assert.deepEqual(G.worldToMap({ E: 1400, N: 1750 }), { x: 1400, y: 0 });
  const p = { E: 733.25, N: 1021.5 };
  const m = G.worldToMap(p);
  const back = G.mapToWorld(m.x, m.y);
  close(back.E, p.E, 1e-9);
  close(back.N, p.N, 1e-9);
  // a point further north is higher on the sheet
  assert.ok(G.worldToMap({ E: 700, N: 900 }).y < G.worldToMap({ E: 700, N: 800 }).y);
});

test('3D transform: x = E, y = height, z = −N, one uniform scale, no vertical exaggeration', () => {
  assert.equal(G.WORLD3D.verticalExaggeration, 1);
  const a = G.toWorld3(800, 900, 400);
  const b = G.toWorld3(900, 900, 400);
  const c = G.toWorld3(800, 1000, 400);
  const d = G.toWorld3(800, 900, 500);
  close(b[0] - a[0], 100 / G.WORLD3D.metresPerUnit, 1e-12, 'east → +x');
  close(c[2] - a[2], -100 / G.WORLD3D.metresPerUnit, 1e-12, 'north → −z');
  close(d[1] - a[1], 100 / G.WORLD3D.metresPerUnit, 1e-12, 'up → +y, same scale');
  const back = G.fromWorld3(...a);
  close(back.E, 800, 1e-9);
  close(back.N, 900, 1e-9);
  close(back.heightM, 400, 1e-9);
  // a camera looking at yaw 0 looks north on the map; yaw 90 east
  const [x0, , z0] = G.viewDirection(0);
  assert.ok(Math.abs(x0) < 1e-12 && z0 < 0);
  close(G.bearingOfWorldDirection(...[G.viewDirection(90)[0], G.viewDirection(90)[2]]), 90, 1e-9);
});

// ---------------------------------------------------------------- terrain, mesh and contours

test('height grid = generator at every sample; heightAt interpolates on the SW–NE triangles', () => {
  const g = T.heightGrid();
  assert.equal(g.length, T.GRID.nE * T.GRID.nN);
  for (const [i, j] of [[0, 0], [17, 33], [140, 175], [280, 350], [201, 9]]) {
    assert.equal(g[j * T.GRID.nE + i], T.heightField(i * 5, j * 5));
    assert.equal(T.heightAt(i * 5, j * 5), g[j * T.GRID.nE + i]);
  }
  // inside a cell, on the diagonal: the mean of SW and NE
  const i = 100;
  const j = 120;
  const sw = g[j * T.GRID.nE + i];
  const ne = g[(j + 1) * T.GRID.nE + i + 1];
  close(T.heightAt(i * 5 + 2.5, j * 5 + 2.5), (sw + ne) / 2, 1e-9);
});

test('the 3D mesh is the height grid: every sheet vertex at its sample height, apron joins without a crack', () => {
  const { positions, nx, ny, xs, ns } = M.terrainMeshArrays();
  const g = T.heightGrid();
  let checked = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const E = xs[i];
      const N = ns[j];
      const o = (j * nx + i) * 3;
      const w = G.fromWorld3(positions[o], positions[o + 1], positions[o + 2]);
      close(w.E, E, 0.01);
      close(w.N, N, 0.01);
      if (T.insideSheet(E, N)) {
        // Float32 storage: centimetre tolerance
        close(w.heightM, g[Math.round(N / 5) * T.GRID.nE + Math.round(E / 5)], 0.01, `vertex ${E},${N}`);
        checked++;
      } else close(w.heightM, T.heightField(E, N), 0.01);
    }
  }
  assert.equal(checked, T.GRID.nE * T.GRID.nN);
});

test('contours lie on the mesh: every vertex on a triangle edge at its level (±0.05 m), interval 10 m, index 50 m', () => {
  const levels = T.contours();
  assert.ok(levels.length >= 10);
  let n = 0;
  for (const lv of levels) {
    assert.equal(lv.heightM % S.CONTOUR_INTERVAL_M, 0);
    assert.equal(lv.index, lv.heightM % S.INDEX_INTERVAL_M === 0);
    assert.ok(lv.lines.length > 0);
    for (const line of lv.lines) {
      for (const [E, N] of line.pts) {
        const onH = Math.abs(N / 5 - Math.round(N / 5)) < 1e-6;
        const onV = Math.abs(E / 5 - Math.round(E / 5)) < 1e-6;
        const onD = Math.abs((E - N) / 5 - Math.round((E - N) / 5)) < 1e-6;
        assert.ok(onH || onV || onD, `vertex ${E},${N} not on a mesh edge`);
        close(T.heightAt(E, N), lv.heightM, 0.05, `contour ${lv.heightM} at ${E.toFixed(2)},${N.toFixed(2)}`);
        n++;
      }
    }
  }
  assert.ok(n > 5000);
});

test('the stream bed falls the whole way, and the water is carved into the ground', () => {
  const w = T.waterCourses();
  for (let k = 1; k < w.stream.bed.length; k++) assert.ok(w.stream.bed[k] <= w.stream.bed[k - 1] + 1e-9, `bed rises at ${k}`);
  for (const gl of w.gullies) for (let k = 1; k < gl.bed.length; k++) assert.ok(gl.bed[k] <= gl.bed[k - 1] + 1e-9);
  // along the stream, the ground at the water is lower than 30 m to either side
  for (let k = 50; k < w.stream.pts.length - 50; k += 120) {
    const [E, N] = w.stream.pts[k];
    if (!T.insideSheet(E, N)) continue;
    const [E2, N2] = w.stream.pts[k + 1];
    const len = Math.hypot(E2 - E, N2 - N);
    const nx = -(N2 - N) / len;
    const ny = (E2 - E) / len;
    const h = T.heightAt(E, N);
    assert.ok(T.heightAt(E + nx * 30, N + ny * 30) > h && T.heightAt(E - nx * 30, N - ny * 30) > h, `not a valley at sample ${k}`);
  }
});

test('the three route domes are real summits of a continuous relief (local maxima, saddles between them)', () => {
  for (const id of ['H1', 'H2', 'H3', 'D1', 'D2', 'D3', 'D4']) {
    const s = T.summitOf(id);
    const spec = S.DOMES.find((d) => d.id === id);
    assert.ok(Math.hypot(s.E - spec.E, s.N - spec.N) < 60, `${id} summit drifted`);
    for (const [dE, dN] of [[5, 0], [-5, 0], [0, 5], [0, -5], [5, 5], [-5, -5], [5, -5], [-5, 5]]) assert.ok(T.heightAt(s.E + dE, s.N + dN) <= s.heightM, `${id} not a local maximum`);
  }
  // between consecutive route domes the ground dips (a saddle) but stays well above the valley floor
  const pairs = [['H1', 'H2'], ['H2', 'H3']];
  for (const [a, b] of pairs) {
    const p = T.summitOf(a);
    const q = T.summitOf(b);
    let low = Infinity;
    for (let t = 0.05; t < 0.95; t += 0.01) low = Math.min(low, T.heightAt(p.E + (q.E - p.E) * t, p.N + (q.N - p.N) * t));
    assert.ok(low < Math.min(p.heightM, q.heightM) - 8, `${a}–${b}: no saddle`);
  }
});

// ---------------------------------------------------------------- one source for map and model

test('A, B, the summits, the square and the roads are one set of coordinates', () => {
  const pts = T.routePoints();
  assert.deepEqual(pts[0], S.START);
  assert.deepEqual(pts[4], S.SQUARE_CENTER);
  for (const [k, id] of ['H1', 'H2', 'H3'].entries()) {
    const s = T.summitOf(id);
    assert.deepEqual(pts[k + 1], { E: s.E, N: s.N });
    // the feature catalogue (labels in both views, picking) anchors the same point
    assert.deepEqual(F.featureInfo().get(id).anchor, { E: s.E, N: s.N });
    assert.equal(F.pickFeature({ E: s.E, N: s.N }), id);
  }
  assert.ok(T.inRing(S.SQUARE_CENTER, S.SQUARE_RING), 'B is inside the paved square');
  assert.equal(F.pickFeature(S.SQUARE_CENTER), 'square');
  assert.equal(F.pickFeature(S.START), 'A');
  assert.equal(F.pickFeature(S.WATER_TOWER), 'tower');
  // every road passes exactly through its control points
  for (const r of T.roads()) {
    for (const [E, N] of S.ROAD_CONTROL_POINTS[r.id]) assert.ok(r.pts.some(([e, n]) => e === E && n === N), `${r.id} misses ${E},${N}`);
    const mid = r.pts[Math.floor(r.pts.length / 2)];
    if (r.id !== 'lane-village' && T.insideSheet(mid[0], mid[1])) {
      const f = F.pickFeature({ E: mid[0], N: mid[1] });
      assert.ok(f === r.id || f === 'village' || f === 'square', `${r.id} picks as ${f}`);
    }
  }
});

test('cover respects the roads, the water and the village; houses do not overlap or float', () => {
  for (const t of T.trees()) assert.ok(!T.nearLine({ E: t.E, N: t.N }, S.ROAD_WIDTH_M / 2 + 2, ['road']), 'tree on a road');
  for (const h of T.houses()) {
    const c = T.houseCorners(h);
    for (const q of c) {
      assert.ok(T.inRing(q, S.VILLAGE_RING), 'house outside the village');
      assert.ok(!T.nearLine(q, S.ROAD_WIDTH_M / 2 + 1, ['road']), 'house on a road');
    }
    assert.ok(h.baseM <= Math.min(...c.map((q) => T.heightAt(q.E, q.N))), 'house floats above the slope');
  }
  assert.ok(T.houses().length > 60);
  // groves are wholly on one bank of the stream
  for (const g of S.GROVES) {
    const s = T.waterCourses().stream.pts;
    for (const [E, N] of g.ring) assert.ok(!T.nearLine({ E, N }, 9, ['stream']), `${g.id} touches the stream`);
    void s;
  }
});

// ---------------------------------------------------------------- the practice data

test('every leg: the plan is the map geometry, the real point matches it, no look-alike does', () => {
  for (const leg of P.LEGS) {
    const a = P.legStart(leg);
    const b = T.checkpoint(leg.to);
    const plan = P.plannedLeg(leg);
    close(plan.bearingDeg, G.bearing(a, b), 1e-12);
    close(plan.distanceM, G.distance(a, b), 1e-12);
    assert.ok(P.matchesPlan(leg, leg.answer));
    for (const c of leg.candidates) if (c !== leg.answer) assert.ok(!P.matchesPlan(leg, c), `leg ${leg.index + 1}: ${c} matches the plan`);
    assert.ok(leg.candidates.includes(leg.answer));
    assert.equal(new Set(leg.candidates).size, leg.candidates.length);
  }
  assert.deepEqual(P.LEGS.map((l) => l.to), ['H1', 'H2', 'H3', 'B']);
  assert.deepEqual(P.LEGS.map((l) => l.from), ['A', 'H1', 'H2', 'H3']);
});

test('the answer letter changes from leg to leg (the order says nothing about the answer)', () => {
  const letters = P.LEGS.map((l) => P.candidateLetters(l)[l.answer]);
  assert.equal(new Set(letters).size, letters.length, `answer letters ${letters.join(' ')}`);
});

test('evidence: two true statements, distinguishing; false statements plausible (true at a look-alike)', () => {
  for (const leg of P.LEGS) {
    assert.equal(leg.evidence.length, 4);
    assert.equal(leg.correctEvidence.length, 2);
    const here = P.candidatePoint(leg.answer);
    const others = leg.candidates.filter((c) => c !== leg.answer).map((c) => P.candidatePoint(c));
    for (const e of leg.evidence) {
      const atAnswer = P.evidenceHolds(e, here);
      if (leg.correctEvidence.includes(e.id)) {
        assert.ok(atAnswer, `leg ${leg.index + 1}: ${e.id} false at the real point`);
        for (const o of others) assert.ok(!P.evidenceHolds(e, o), `leg ${leg.index + 1}: ${e.id} also true at a look-alike — not distinguishing`);
      } else {
        assert.ok(!atAnswer, `leg ${leg.index + 1}: distractor ${e.id} true at the real point`);
        assert.ok(others.some((o) => P.evidenceHolds(e, o)), `leg ${leg.index + 1}: distractor ${e.id} true nowhere`);
      }
    }
  }
});

test('evidence directions are clear: a true statement is at least 6° inside its compass sector', () => {
  for (const leg of P.LEGS) {
    const here = P.candidatePoint(leg.answer);
    for (const id of leg.correctEvidence) {
      const e = leg.evidence.find((x) => x.id === id);
      const d = P.featureDirection(e, here);
      if (!d) continue;
      const centre = Math.round(d.bearingDeg / 45) * 45;
      assert.ok(Math.abs(G.signedTurn(centre, d.bearingDeg)) <= 22.5 - 6, `leg ${leg.index + 1}: ${id} at ${d.bearingDeg.toFixed(1)}° is near a sector edge`);
    }
  }
});

test('evidence is visible from where the navigator stands (terrain sight lines, ≥ 40 % of the feature)', () => {
  for (const leg of P.LEGS) {
    const at = P.candidatePoint(leg.answer);
    const eye = T.eyeAt(at);
    for (const id of leg.correctEvidence) {
      const e = leg.evidence.find((x) => x.id === id);
      const q = e.predicate;
      let pts = [];
      if (e.feature.startsWith('G')) pts = T.trees().filter((t) => t.group === e.feature).map((t) => { const c = T.crownShape(t); return { E: t.E, N: t.N, heightM: c.centerM + c.halfHeightM * 0.8 }; });
      else if (q.kind === 'direction' && 'road' in q.target) pts = T.roads().find((r) => r.id === q.target.road).pts.filter(([E, N]) => Math.hypot(E - at.E, N - at.N) <= q.maxM + 60).map(([E, N]) => ({ E, N, heightM: T.heightAt(E, N) + 0.3 }));
      else if (e.feature === 'village') pts = T.houses().map((h) => ({ E: h.E, N: h.N, heightM: h.floorM + h.floors * 3.2 }));
      else if (e.feature === 'tower') pts = [{ E: S.WATER_TOWER.E, N: S.WATER_TOWER.N, heightM: T.heightAt(S.WATER_TOWER.E, S.WATER_TOWER.N) + 23 }];
      else continue; // houses around the square: you stand among them
      const seen = pts.filter((p) => T.terrainClear(eye, p, 1.5)).length;
      assert.ok(seen / pts.length >= 0.4, `leg ${leg.index + 1}: ${id} — ${seen}/${pts.length} visible`);
    }
  }
});

// ---------------------------------------------------------------- the state machine

const legSel = (leg, over = {}) => ({ candidate: leg.answer, evidence: [...leg.correctEvidence], comparison: 'match', ...over });
const run = (actions, s = { ...ST.INITIAL_STATE, mode: 'practice' }) => actions.reduce(ST.reducer, s);
const select = (sel) => [
  { type: 'selectCandidate', id: sel.candidate },
  ...sel.evidence.map((id) => ({ type: 'toggleEvidence', id })),
  ...(sel.comparison ? [{ type: 'setComparison', value: sel.comparison }] : []),
];

test('check: missing, wrong point, wrong point with the right comparison, partial and verified', () => {
  const leg = P.LEGS[0];
  let s = run([{ type: 'check' }]);
  assert.equal(ST.view(s).result.kind, 'missing');
  const wrong = leg.candidates.find((c) => c !== leg.answer);
  s = run([...select({ candidate: wrong, evidence: [], comparison: 'mismatch' }), { type: 'check' }]);
  assert.deepEqual(ST.view(s).result, { kind: 'wrong-location', candidate: wrong, comparisonRight: true });
  s = run([...select({ candidate: wrong, evidence: [], comparison: 'match' }), { type: 'check' }]);
  assert.equal(ST.view(s).result.comparisonRight, false);
  // the right point alone is not full credit
  s = run([{ type: 'selectCandidate', id: leg.answer }, { type: 'check' }]);
  assert.deepEqual(ST.view(s).result, { kind: 'partial', candidate: leg.answer, wrongEvidence: [], evidenceMissing: 2, comparison: 'missing' });
  assert.equal(s.outcomes[0], null);
  const distractor = leg.evidence.find((e) => !leg.correctEvidence.includes(e.id)).id;
  s = run([...select(legSel(leg, { evidence: [leg.correctEvidence[0], distractor], comparison: 'mismatch' })), { type: 'check' }]);
  assert.deepEqual(ST.view(s).result, { kind: 'partial', candidate: leg.answer, wrongEvidence: [distractor], evidenceMissing: 1, comparison: 'wrong' });
  s = run([...select(legSel(leg)), { type: 'check' }]);
  assert.equal(ST.view(s).result.kind, 'verified');
  assert.equal(s.outcomes[0], 'verified');
  assert.ok(ST.view(s).closed);
});

test('at most two pieces of evidence; a changed answer makes the last result stale; a wrong check does not reset the task', () => {
  const leg = P.LEGS[1];
  let s = run(leg.evidence.map((e) => ({ type: 'toggleEvidence', id: e.id })), { ...ST.INITIAL_STATE, mode: 'practice', leg: 1 });
  assert.equal(s.sel.evidence.length, 2);
  s = run([...select({ candidate: leg.candidates.find((c) => c !== leg.answer), evidence: [], comparison: null }), { type: 'check' }], { ...ST.INITIAL_STATE, mode: 'practice', leg: 1 });
  const before = s.sel;
  assert.equal(ST.view(s).result.kind, 'wrong-location');
  assert.deepEqual(s.sel, before, 'a check keeps the selections');
  s = ST.reducer(s, { type: 'selectCandidate', id: leg.answer });
  assert.ok(ST.view(s).stale);
  assert.equal(ST.view(s).result, null);
});

test('hints: two grades, then nothing more; only "הצגת הסבר" reveals the answer, and only after a first check', () => {
  let s = run([{ type: 'hint' }]);
  assert.equal(s.hint, 1);
  assert.equal(s.sel.candidate, null);
  s = run([{ type: 'hint' }, { type: 'hint' }, { type: 'hint' }]);
  assert.equal(s.hint, 2);
  assert.equal(s.sel.candidate, null);
  assert.equal(ST.reducer(s, { type: 'reveal' }), s, 'no explanation before a first check');
  s = ST.reducer(s, { type: 'check' });
  s = ST.reducer(s, { type: 'reveal' });
  assert.ok(s.revealed);
  assert.deepEqual(s.sel, legSel(P.LEGS[0]));
  assert.equal(s.outcomes[0], 'explained');
  // a closed leg ignores further answers
  const locked = ST.reducer(s, { type: 'selectCandidate', id: P.LEGS[0].candidates[0] });
  assert.equal(locked, s);
});

test('four legs to the square, the summary, and an explicit restart', () => {
  let s = { ...ST.INITIAL_STATE, mode: 'practice' };
  assert.equal(ST.reducer(s, { type: 'next' }), s, 'cannot skip an unchecked leg');
  for (const leg of P.LEGS) {
    s = run([...select(legSel(leg)), { type: 'check' }, { type: 'next' }], s);
  }
  assert.ok(ST.view(s).finished);
  assert.deepEqual(s.outcomes, ['verified', 'verified', 'verified', 'verified']);
  // switching modes keeps the progress
  s = ST.reducer(ST.reducer(s, { type: 'setMode', mode: 'learn' }), { type: 'setMode', mode: 'practice' });
  assert.ok(ST.view(s).finished);
  s = ST.reducer(s, { type: 'restart' });
  assert.equal(s.leg, 0);
  assert.deepEqual(s.outcomes, [null, null, null, null]);
});

// ---------------------------------------------------------------- the approved copy

// Shortened 2026-10-27 (lesson-6 copy cleanup): the principle ends with when the method fits,
// and the walk-through under the lab, which repeated the caption, is gone.
test('the approved copy is in the scene, and nothing folds it away', () => {
  const src = readFileSync(new URL('../../src/components/lessons/topic-06/CombatNavScene.tsx', import.meta.url), 'utf8');
  const approved = [
    'בוחרים סימנים שאפשר לזהות במפה ובשטח: תבליט (כמו כיפה או ערוץ) ותכסית (כמו כפר או חורשה), ובודקים את המיקום ביחס אליהם, יחד עם כיוון ומרחק. תוואי רציף לאורך המסלול, כמו דרך או ערוץ, יכול לשמש ״מעקה״. השיטה מתאימה כשיש סימנים בולטים לאורך הדרך והראות מאפשרת להשוות אותם למפה.',
    'הציר עובר בשלוש כיפות ומסתיים בכיכר המרכזית בכפר (B).',
    'ניווט עיוור מתבסס על נקודת מוצא ידועה ועל אזימוט ומרחק שנקבעו מראש.',
  ];
  for (const t of approved) assert.ok(src.includes(t), `missing: ${t.slice(0, 40)}…`);
  for (const gone of ['בהמחשה, המסלול עובר בשלוש כיפות', 'מתי משתמשים בשיטה']) assert.ok(!src.includes(gone), `repeated copy is back: ${gone}`);
  // a handrail is one case of the method, not its name
  assert.ok(src.includes("label: 'ניווט לפי השטח'"), 'the method keeps its name');
  assert.ok(!src.includes('aria-expanded'), 'an accordion is back');
  assert.ok(src.indexOf('<TerrainSection') < src.indexOf('<DeadReckoningSection'), 'terrain association first');
});
