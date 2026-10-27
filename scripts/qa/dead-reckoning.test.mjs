// Numeric and behavioural tests for the lesson-6 dead-reckoning activity ("ניווט עיוור").
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/dead-reckoning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import('../../src/components/lessons/topic-06/dead-reckoning/deadReckoningModel.ts');
const G = await import('../../src/components/lessons/topic-06/locationCheckGeometry.ts');

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const run = (actions, s = M.INITIAL_STATE) => actions.reduce(M.reducer, s);

// ---------------------------------------------------------------- the leg and its numbers

test('B is 1,200 m from A at 62° (E = A + 1200·sin62°, N = A + 1200·cos62°), inside the sheet', () => {
  close(M.TARGET.E - M.START.E, 1200 * Math.sin((62 * Math.PI) / 180), 1e-9, 'ΔE');
  close(M.TARGET.N - M.START.N, 1200 * Math.cos((62 * Math.PI) / 180), 1e-9, 'ΔN');
  close(G.bearing(M.START, M.TARGET), 62, 1e-9, 'bearing A→B');
  close(G.distance(M.START, M.TARGET), 1200, 1e-9, 'distance A→B');
  for (const p of [M.START, M.TARGET, M.HILL.center]) {
    assert.ok(p.E > 0 && p.E < M.SHEET.width && p.N > 0 && p.N < M.SHEET.height, 'on the sheet');
  }
  // B lies east and north of A (62° is between north and east): no RTL flip of the drawing.
  assert.ok(M.TARGET.E > M.START.E && M.TARGET.N > M.START.N);
});

test('the pace count: 1.5 m per pace pair → 800 pairs; 100 = 150 m, 300 = 450 m, 600 = 900 m', () => {
  assert.equal(M.PLANNED_PAIRS, 800);
  assert.equal(M.pairsToMetres(100), 150);
  assert.equal(M.pairsToMetres(300), 450);
  assert.equal(M.pairsToMetres(600), 900);
  assert.equal(M.pairsToMetres(800), 1200);
  // another navigator's pace gives another count
  assert.equal(M.DISTANCE_M / M.OTHER_PACE_M, 750);
  // each wrong option is the arithmetic mistake it names
  assert.equal(M.DISTANCE_M, 1200); // 'metres'
  assert.equal(M.PLANNED_PAIRS * 2, 1600); // 'single-steps'
  assert.equal(M.DISTANCE_M * M.PACE_M, 1800); // 'multiplied'
  assert.deepEqual(Object.keys(M.PACE_ERROR).map(Number).sort(), [1200, 1600, 1800]);
});

test('the wadi crosses the planned line once, 450 m (300 pairs) from A', () => {
  const p = M.along(M.WADI_CROSSING_M);
  assert.equal(M.WADI_CROSSING_M, M.pairsToMetres(300));
  close(G.distanceToPolyline(p, M.WADI), 0, 1e-9, 'the crossing point is on the wadi');
  // sample the planned line: exactly one sign change of the side of the wadi
  const side = (d) => {
    const q = M.along(d);
    // the wadi runs north–south: compare with its E at that N (linear between vertices)
    const w = M.WADI;
    for (let k = 0; k < w.length - 1; k++) {
      const [e1, n1] = w[k];
      const [e2, n2] = w[k + 1];
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
  // the other 100-pair stops are well away from it: the wadi is seen only at 300 (visibility 30 m)
  for (let k = 0; k <= 8; k++) {
    const d = G.distanceToPolyline(M.along(k * 150), M.WADI) - M.WADI_WIDTH_M / 2;
    if (k === 3) assert.ok(d <= 0);
    else assert.ok(d > M.VISIBILITY_M, `stop ${k * 100}: ${d.toFixed(1)} m from the wadi bank`);
  }
});

test('the two roads meet at A and leave it away from the 62° line; none is in sight after the first stop', () => {
  for (const r of M.ROADS) close(G.distanceToPolyline(M.START, r.pts), 0, 1e-9, r.id);
  for (let k = 1; k <= 8; k++) {
    for (const r of M.ROADS) assert.ok(G.distanceToPolyline(M.along(k * 150), r.pts) > M.VISIBILITY_M + M.ROAD_WIDTH_M, `${r.id} at stop ${k}`);
  }
});

test('the hill with the antenna: 160 m from B at 315° (north-west), out of sight from B and off the line', () => {
  close(G.distance(M.TARGET, M.HILL.center), 160, 1e-9);
  close(G.bearing(M.TARGET, M.HILL.center), 315, 1e-9);
  assert.ok(G.distance(M.TARGET, M.HILL.center) - M.HILL.radiusM > M.VISIBILITY_M, 'not visible from B in the storm');
  assert.ok(G.distanceToPolyline(M.HILL.center, [M.START, M.TARGET]) > M.HILL.radiusM, 'the leg does not cross the hill');
});

test('a 3° compass error: ≈31 m apart after 600 m and ≈63 m after 1,200 m; the 65° end lies east and south of B', () => {
  close(M.deviationGap(600), 31.41, 0.01);
  close(M.deviationGap(1200), 62.82, 0.01);
  // the gap is the real distance between the two end points on the map
  close(G.distance(M.along(1200, 65), M.TARGET), M.deviationGap(1200), 1e-9);
  close(G.distance(M.along(600, 65), M.along(600)), M.deviationGap(600), 1e-9);
  const end = M.along(1200, 65);
  assert.ok(end.E > M.TARGET.E && end.N < M.TARGET.N);
  // every point of the deviated walk is still 1,200 m from A
  close(G.distance(M.START, end), 1200, 1e-9);
  // more than the visibility: from the deviated end, B is not in sight
  assert.ok(M.deviationGap(1200) > 2 * M.VISIBILITY_M);
  // a 1.4 m pace stops 80 m short
  close(M.shortPaceShortfall(), 80, 1e-9);
});

// ---------------------------------------------------------------- compass feedback

test('heading feedback: only 62° departs; the turn and the end gap are computed', () => {
  assert.deepEqual(M.evaluateHeading(62), { kind: 'right' });
  const a = M.evaluateHeading(50);
  assert.equal(a.kind, 'off');
  assert.equal(a.turnDeg, 12);
  close(a.endGapM, 2 * 1200 * Math.sin((6 * Math.PI) / 180), 1e-9);
  assert.equal(a.cause, null);
  assert.equal(M.evaluateHeading(70).turnDeg, -8);
  assert.equal(M.evaluateHeading(298).cause, 'counter-clockwise');
  assert.equal(M.evaluateHeading(28).cause, 'from-east');
  assert.equal(M.evaluateHeading(242).cause, 'reverse');
  assert.equal(M.evaluateHeading(0).turnDeg, 62);
  assert.equal(M.evaluateHeading(359).turnDeg, 63);
});

// ---------------------------------------------------------------- flows

test('step 1: a wrong count is explained and can be fixed; the walk cannot start before 800', () => {
  let s = run([{ type: 'choosePace', value: 1800 }, { type: 'checkPace' }]);
  assert.equal(M.view(s).pace, 'multiplied');
  assert.equal(M.reducer(s, { type: 'toHeading' }), s, 'no way on with a wrong count');
  s = M.reducer(s, { type: 'choosePace', value: 1600 });
  assert.equal(M.view(s).pace, null, 'a changed answer clears the verdict');
  s = run([{ type: 'checkPace' }], s);
  assert.equal(M.view(s).pace, 'single-steps');
  s = run([{ type: 'choosePace', value: 1200 }, { type: 'checkPace' }], s);
  assert.equal(M.view(s).pace, 'metres');
  s = run([{ type: 'choosePace', value: 800 }, { type: 'checkPace' }], s);
  assert.equal(M.view(s).pace, 'right');
  assert.equal(M.reducer(s, { type: 'choosePace', value: 1200 }), s, 'a right answer stays');
  s = M.reducer(s, { type: 'toHeading' });
  assert.equal(s.step, 'heading');
});

test('step 1 asks for the count, so it stays unknown until a right check; restart hides it again', () => {
  assert.equal(M.view(M.INITIAL_STATE).countKnown, false, 'not at the opening');
  let s = run([{ type: 'choosePace', value: 800 }]);
  assert.equal(M.view(s).countKnown, false, 'not for a chosen, unchecked answer');
  for (const value of [1800, 1600, 1200]) {
    s = run([{ type: 'choosePace', value }, { type: 'checkPace' }], s);
    assert.equal(M.view(s).countKnown, false, `not after a wrong check (${value})`);
  }
  s = run([{ type: 'choosePace', value: 800 }], s);
  assert.equal(M.view(s).countKnown, false, 'not when the right answer is chosen but not yet checked');
  s = run([{ type: 'checkPace' }], s);
  assert.equal(M.view(s).countKnown, true, 'the right check reveals it, still in step 1');
  assert.equal(M.view(M.reducer(s, { type: 'restart' })).countKnown, false, 'restart in step 1 hides it again');
  s = run([{ type: 'toHeading' }, { type: 'setHeading', value: 62 }, { type: 'depart' }, { type: 'advance' }], s);
  assert.equal(M.view(s).countKnown, true, 'it stays known on the way');
  assert.equal(M.view(M.reducer(s, { type: 'restart' })).countKnown, false, 'restart under way hides it again');
});

test('step 2: a wrong compass setting is refused with feedback; 62° departs; each press counts 100 pairs', () => {
  let s = run([{ type: 'choosePace', value: 800 }, { type: 'checkPace' }, { type: 'toHeading' }]);
  assert.equal(M.reducer(s, { type: 'advance' }), s, 'no counting before departure');
  s = run([{ type: 'turn', by: -10 }], s);
  assert.equal(s.heading, 350);
  s = run([{ type: 'setHeading', value: 298 }, { type: 'depart' }], s);
  assert.equal(s.step, 'heading');
  assert.equal(M.view(s).heading.cause, 'counter-clockwise');
  s = run([{ type: 'setHeading', value: 60 }], s);
  assert.equal(M.view(s).heading, null, 'turning clears the old verdict');
  s = run([{ type: 'turn', by: 1 }, { type: 'turn', by: 1 }, { type: 'depart' }], s);
  assert.equal(s.step, 'walk');
  assert.equal(M.reducer(s, { type: 'turn', by: 10 }), s, 'the compass is fixed once under way');
  for (let k = 1; k <= 3; k++) s = M.reducer(s, { type: 'advance' });
  assert.equal(s.pairs, 300);
  assert.equal(M.view(s).metres, 450);
  assert.ok(M.view(s).atWadi);
  for (let k = 4; k <= 8; k++) s = M.reducer(s, { type: 'advance' });
  assert.equal(s.pairs, 800);
  assert.equal(s.step, 'verify', 'the count completes into a question, not an arrival');
  assert.ok(M.view(s).counted && !M.view(s).done);
  assert.equal(M.reducer(s, { type: 'advance' }).pairs, 800);
});

test('step 3: "the count proves it" and "keep walking" are wrong; "an estimate, verify" ends the activity; restart clears all', () => {
  let s = run([
    { type: 'choosePace', value: 800 },
    { type: 'checkPace' },
    { type: 'toHeading' },
    { type: 'setHeading', value: 62 },
    { type: 'depart' },
    ...Array.from({ length: 8 }, () => ({ type: 'advance' })),
  ]);
  s = run([{ type: 'checkVerify' }], s);
  assert.equal(M.view(s).verify, null, 'nothing to check without a choice');
  s = run([{ type: 'chooseVerify', value: 'proof' }, { type: 'checkVerify' }], s);
  assert.equal(M.view(s).verify, 'wrong');
  s = run([{ type: 'chooseVerify', value: 'keep-walking' }, { type: 'checkVerify' }], s);
  assert.equal(M.view(s).verify, 'wrong');
  s = run([{ type: 'chooseVerify', value: 'estimate' }, { type: 'checkVerify' }], s);
  assert.ok(M.view(s).done);
  assert.equal(M.reducer(s, { type: 'chooseVerify', value: 'proof' }), s);
  s = M.reducer(s, { type: 'restart' });
  assert.deepEqual(s, M.INITIAL_STATE);
});

// ---------------------------------------------------------------- the approved copy

test('the approved copy of the technique is in the scene', () => {
  const src = readFileSync(new URL('../../src/components/lessons/topic-06/CombatNavScene.tsx', import.meta.url), 'utf8');
  // Shortened 2026-10-27 (lesson-6 copy cleanup): the example under the activity repeated 62° and 1.2 km and is gone;
  // "the count is not proof" is the answer and the feedback of step 3.
  for (const t of [
    'ניווט עיוור מתבסס על נקודת מוצא ידועה ועל אזימוט ומרחק שנקבעו מראש. את המרחק מעריכים בספירת צעדים כפולים, לפי מדידה אישית. שגיאות בכיוון ובספירה מצטברות, ולכן בודקים את המיקום מול סימני שטח בכל הזדמנות. השיטה מתאימה כשהראות מוגבלת או שיש מעט סימנים מובחנים, ובתנאי שנקודת המוצא ידועה.',
    'במפת התכנון רואים את כל הדרך, ובשטח רק כ־30 מ׳ סביבכם. ההליכה מוצגת ללא סטייה.',
  ]) {
    assert.ok(src.includes(t), t.slice(0, 40));
  }
  assert.ok(src.includes("label: 'מרחק — 1.2 ק״מ, כ־800 צעדים כפולים'"), 'the approved legend line is kept for after the check');
});

test('until the count is checked, the copy gives the distance and the pace but withholds the count', () => {
  const src = readFileSync(new URL('../../src/components/lessons/topic-06/CombatNavScene.tsx', import.meta.url), 'utf8');
  const legend = src.match(/labelBeforeCount: '([^']+)'/)?.[1];
  // the approved text with the count left out, word for word — nothing new is written
  assert.equal(legend, 'מרחק — 1.2 ק״מ');
  // no fixed text of the technique carries the count
  assert.doesNotMatch(src.replace(/label: 'מרחק — 1\.2 ק״מ, כ־800 צעדים כפולים'/, ''), /(?<![\d,.])800(?!\d)/, 'the count only in the after-check legend line');
  // the activity never draws the count unguarded (the field counter, the map's 100-pair ticks)
  const field = readFileSync(new URL('../../src/components/lessons/topic-06/dead-reckoning/DeadReckoningField.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(field, /PLANNED_PAIRS/, 'the field counter takes its target from the activity, once known');
});
