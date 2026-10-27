// Numeric and behavioural tests for the lesson-6 practice: resection ("חיתוך לאחור").
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/navigation-sim.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../../src/components/lessons/topic-06/navigation-sim/navigationSimModel.ts');
const G = await import('../../src/components/lessons/topic-06/locationCheckGeometry.ts');

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const run = (actions, s = M.INITIAL_STATE) => actions.reduce(M.reducer, s);
const angd = (a, b) => G.angularDifference(a, b);
const ids = M.OBJECT_IDS;
const PAIRS = [['tower', 'antenna'], ['tower', 'summit'], ['antenna', 'summit']];

// ---------------------------------------------------------------- back azimuth, across 0°/360°

test('back azimuth: +180° under 180°, −180° from 180° up, always in [0, 360)', () => {
  const cases = [[0, 180], [56, 236], [179, 359], [180, 0], [181, 1], [190, 10], [238, 58], [284, 104], [304, 124], [337, 157], [359, 179], [360, 180], [-10, 170], [540, 0]];
  for (const [a, b] of cases) assert.equal(M.backAzimuth(a), b, `${a}°`);
  for (let a = 0; a < 360; a++) {
    const b = M.backAzimuth(a);
    assert.ok(b >= 0 && b < 360);
    assert.equal(M.backAzimuth(b), a, `twice reversed is the original (${a}°)`);
    assert.equal(angd(a, b), 180);
  }
});

test('the working shown to the learner: add under 180°, subtract from 180° up, three-digit readings', () => {
  assert.equal(M.backAzimuthWorking(56), '056° + 180° = 236°');
  assert.equal(M.backAzimuthWorking(13), '013° + 180° = 193°');
  assert.equal(M.backAzimuthWorking(190), '190° − 180° = 010°');
  assert.equal(M.backAzimuthWorking(180), '180° − 180° = 000°');
  assert.equal(M.backAzimuthWorking(337), '337° − 180° = 157°');
  assert.equal(M.fmtDeg(0), '000°');
  assert.equal(M.fmtDeg(360), '000°');
  assert.equal(M.fmtDeg(359.6), '000°');
});

test('typed azimuths: digits only, 360 is north (0), above 360 waits for −360°', () => {
  assert.equal(M.parseAzimuth(''), null);
  assert.equal(M.parseAzimuth(undefined), null);
  assert.equal(M.parseAzimuth('10'), 10);
  assert.equal(M.parseAzimuth('010'), 10);
  assert.equal(M.parseAzimuth('0'), 0);
  assert.equal(M.parseAzimuth('360'), 0);
  assert.equal(M.parseAzimuth('370'), 'over');
  assert.equal(M.parseAzimuth('474'), 'over');
  assert.equal(M.sanitizeAzimuth('2a3-6°7'), '236');
  assert.equal(M.sanitizeAzimuth('٣'), '');
});

// ---------------------------------------------------------------- one geometric model

test('every reading is the bearing from the position to the object (A, B exact; C within 0.02°)', () => {
  for (const sc of M.SCENARIOS) {
    for (const id of ids) {
      const b = G.bearing(sc.position, M.OBJECTS[id].pos);
      const eps = sc.id === 'c' ? 0.02 : 1e-9;
      assert.ok(angd(b, sc.readings[id]) <= eps, `${sc.id}/${id}: bearing ${b} vs reading ${sc.readings[id]}`);
      assert.ok(Number.isInteger(sc.readings[id]) && sc.readings[id] >= 0 && sc.readings[id] < 360);
    }
  }
});

test('the line from each object at its back azimuth passes through the position, and any two cross there', () => {
  for (const sc of M.SCENARIOS) {
    for (const id of ids) {
      const [a, b] = M.lineSegment(id, M.backAzimuth(sc.readings[id]));
      const miss = M.distanceToSegment(sc.position, a, b);
      assert.ok(miss <= 0.5, `${sc.id}/${id}: the line misses the position by ${miss.toFixed(3)} m`);
      // and the position lies on the ray, not behind the object
      close(G.bearing(M.OBJECTS[id].pos, sc.position), M.backAzimuth(sc.readings[id]), sc.id === 'c' ? 0.02 : 1e-9, `${sc.id}/${id} back bearing`);
    }
    for (const [p, q] of PAIRS) {
      const X = M.crossing(M.OBJECTS[p].pos, M.backAzimuth(sc.readings[p]), M.OBJECTS[q].pos, M.backAzimuth(sc.readings[q]));
      assert.ok(G.distance(X, sc.position) <= 1, `${sc.id}: ${p}×${q} cross ${G.distance(X, sc.position).toFixed(3)} m from the position`);
    }
  }
});

test('every pair of lines crosses at ≥ 45° (a readable fix), every object is ≥ 500 m away', () => {
  for (const sc of M.SCENARIOS) {
    for (const [p, q] of PAIRS) {
      const d = angd(sc.readings[p], sc.readings[q]);
      const cut = Math.min(d, 180 - d);
      assert.ok(cut >= 43.5, `${sc.id}: ${p}/${q} cross at ${cut.toFixed(1)}°`);
    }
    for (const id of ids) assert.ok(G.distance(sc.position, M.OBJECTS[id].pos) >= 450, `${sc.id}/${id} distance`);
  }
});

test('objects, positions and lines lie on the sheet; the scenarios are different places with different readings', () => {
  const inside = (p, m = 0) => p.E >= m && p.E <= M.SHEET.width - m && p.N >= m && p.N <= M.SHEET.height - m;
  for (const id of ids) assert.ok(inside(M.OBJECTS[id].pos, 200), `${id} at least 200 m inside the sheet`);
  for (const sc of M.SCENARIOS) assert.ok(inside(sc.position, 300), `${sc.id} at least 300 m inside`);
  for (let i = 0; i < M.SCENARIOS.length; i++)
    for (let j = i + 1; j < M.SCENARIOS.length; j++) {
      const a = M.SCENARIOS[i];
      const b = M.SCENARIOS[j];
      assert.ok(G.distance(a.position, b.position) >= 600, `${a.id}–${b.id} are ${G.distance(a.position, b.position).toFixed(0)} m apart`);
      for (const id of ids) assert.ok(angd(a.readings[id], b.readings[id]) >= 10, `${a.id}/${b.id} ${id} readings differ`);
    }
  // the ray end is on the sheet's edge
  for (const id of ids)
    for (let deg = 0; deg < 360; deg += 7) {
      const e = M.rayEnd(M.OBJECTS[id].pos, deg);
      const onEdge = Math.min(Math.abs(e.E), Math.abs(e.E - M.SHEET.width), Math.abs(e.N), Math.abs(e.N - M.SHEET.height));
      assert.ok(onEdge < 1e-6 && inside(e, -1e-6), `${id} @ ${deg}°`);
      close(G.bearing(M.OBJECTS[id].pos, e), deg, 1e-9, `ray direction ${id} @ ${deg}`);
    }
});

test('the data exercise both sides of 0°/360°: A needs 190° → 010°; every scenario mixes adding and subtracting', () => {
  assert.equal(M.backAzimuth(M.SCENARIOS[0].readings.summit), 10);
  for (const sc of M.SCENARIOS) {
    const r = ids.map((id) => sc.readings[id]);
    assert.ok(r.some((x) => x < 180) && r.some((x) => x >= 180), `${sc.id} has readings under and over 180°`);
  }
  // In one scenario, every wrong answer the feedback names is a different number from the right ones.
  for (const sc of M.SCENARIOS) {
    const vals = ids.flatMap((id) => [sc.readings[id], M.backAzimuth(sc.readings[id])]);
    assert.equal(new Set(vals).size, vals.length, `${sc.id}: no reading equals another's back azimuth`);
  }
});

test('the demonstration: from every probe on the reversed ray the tower reads 080°; on the un-reversed ray it reads 260°', () => {
  const T = M.OBJECTS[M.DEMO.object].pos;
  const back = M.backAzimuth(M.DEMO.reading);
  assert.equal(back, 260);
  for (const d of M.DEMO.rightProbesM) {
    const p = M.along(T, back, d);
    close(G.bearing(p, T), M.DEMO.reading, 1e-9, `probe ${d}`);
    assert.ok(G.distance(p, M.rayEnd(T, back)) > 100, 'probe on the sheet');
  }
  for (const d of M.DEMO.wrongProbesM) {
    const p = M.along(T, M.DEMO.reading, d);
    close(G.bearing(p, T), back, 1e-9, `wrong probe ${d}`);
    assert.ok(d < G.distance(T, M.rayEnd(T, M.DEMO.reading)) - 60, 'wrong probe on the sheet');
  }
  // The demonstration's line does not give away a practice position (≥ 150 m from each, ≥ 15° off its bearing).
  for (const sc of M.SCENARIOS) {
    assert.ok(M.distanceToSegment(sc.position, T, M.rayEnd(T, back)) >= 150, `${sc.id} away from the demo line`);
    assert.ok(angd(G.bearing(T, sc.position), back) >= 15, `${sc.id} bearing from the tower`);
    assert.notEqual(sc.readings.tower, M.DEMO.reading);
  }
});

test('the positions are not on a mapped feature (a road, the wadi, a hill)', () => {
  for (const sc of M.SCENARIOS) {
    for (const r of M.ROADS) assert.ok(G.distanceToPolyline(sc.position, r.pts) >= 150, `${sc.id} vs road ${r.id}`);
    assert.ok(G.distanceToPolyline(sc.position, M.WADI) >= 150, `${sc.id} vs wadi`);
    for (const h of M.HILLS) assert.ok(G.distance(sc.position, h.center) - h.rings[0] >= 150, `${sc.id} vs ${h.id}`);
  }
});

// ---------------------------------------------------------------- the checks

test('a line: right, the un-reversed measurement, another object’s measurement, or off — with the turn', () => {
  const r = M.SCENARIOS[0].readings; // tower 56, antenna 284, summit 190
  const two = ['tower', 'antenna'];
  assert.deepEqual(M.evaluateLine(r, 'tower', 236, two), { kind: 'right' });
  assert.deepEqual(M.evaluateLine(r, 'tower', 596, two), { kind: 'right' });
  assert.deepEqual(M.evaluateLine(r, 'tower', 56, two), { kind: 'reverse' });
  assert.deepEqual(M.evaluateLine(r, 'tower', 104, two), { kind: 'other-object', other: 'antenna', reversed: true });
  assert.deepEqual(M.evaluateLine(r, 'tower', 284, two), { kind: 'other-object', other: 'antenna', reversed: false });
  // The summit's measurement is not known in the lines step (not chosen): 10 is just off.
  assert.deepEqual(M.evaluateLine(r, 'tower', 10, two), { kind: 'off', turn: -134 });
  assert.deepEqual(M.evaluateLine(r, 'summit', 10, ids), { kind: 'right' });
  assert.deepEqual(M.evaluateLine(r, 'summit', 190, ids), { kind: 'reverse' });
  assert.deepEqual(M.evaluateLine(r, 'summit', 236, ids), { kind: 'other-object', other: 'tower', reversed: true });
  // across north: 350 → 10 is a 20° clockwise turn, 30 → 10 is 20° counter-clockwise
  assert.deepEqual(M.evaluateLine(r, 'summit', 350, ids), { kind: 'off', turn: 20 });
  assert.deepEqual(M.evaluateLine(r, 'summit', 30, ids), { kind: 'off', turn: -20 });
  assert.deepEqual(M.evaluateLine(r, 'antenna', 103, two), { kind: 'off', turn: 1 });
});

test('a mark: right within 60 m; on one line; near both; on neither', () => {
  const sc = M.SCENARIOS[0];
  const pair = ['tower', 'antenna'];
  const P = sc.position;
  assert.equal(M.evaluateMark(sc, pair, P).kind, 'right');
  assert.equal(M.evaluateMark(sc, pair, { E: P.E + 42, N: P.N - 42 }).kind, 'right');
  // 400 m along the tower's line, away from the antenna's
  const onTower = M.along(M.OBJECTS.tower.pos, 236, G.distance(M.OBJECTS.tower.pos, P) - 400);
  assert.deepEqual(M.evaluateMark(sc, pair, onTower), { kind: 'one-line', on: 'tower', off: 'antenna' });
  const onAntenna = M.along(M.OBJECTS.antenna.pos, 104, G.distance(M.OBJECTS.antenna.pos, P) + 300);
  assert.deepEqual(M.evaluateMark(sc, pair, onAntenna), { kind: 'one-line', on: 'antenna', off: 'tower' });
  assert.equal(M.evaluateMark(sc, pair, { E: 300, N: 300 }).kind, 'no-line');
  // Behind the object, on the line's backward extension: that is not the drawn line.
  const behind = M.along(M.OBJECTS.tower.pos, 56, 200);
  assert.equal(M.evaluateMark(sc, pair, behind).kind, 'no-line');
});

// ---------------------------------------------------------------- the flow

const choose = (a, b) => [{ type: 'toggle', id: a }, { type: 'toggle', id: b }, { type: 'measure' }];
const enter = (id, v) => ({ type: 'setEntry', id, text: String(v) });

test('demo → choose → lines → mark → verify → done, then another scenario and a reset', () => {
  let s = run([{ type: 'next' }]);
  assert.equal(s.step, 'demo-2');
  s = run([{ type: 'next' }], s);
  assert.equal(s.step, 'choose');
  assert.equal(M.view(s).stepNumber, 2);
  s = run([{ type: 'measure' }], s);
  assert.equal(s.step, 'choose', 'two objects are needed');
  s = run(choose('tower', 'summit'), s);
  assert.equal(s.step, 'lines');
  assert.equal(M.view(s).third, 'antenna');
  s = run([enter('tower', 236)], s);
  assert.equal(run([{ type: 'checkLines' }], s), s, 'no check before both lines have a value');
  s = run([enter('summit', 10), { type: 'checkLines' }, { type: 'toMark' }], s);
  assert.equal(s.step, 'mark');
  assert.equal(run([{ type: 'checkMark' }], s), s, 'no check before a mark');
  s = run([{ type: 'place', at: { E: 1420, N: 1100 } }, { type: 'checkMark' }], s);
  assert.equal(M.view(s).mark.kind, 'right');
  s = run([{ type: 'toVerify' }], s);
  assert.equal(s.step, 'verify');
  s = run([enter('antenna', 104), { type: 'checkVerify' }], s);
  assert.equal(s.step, 'done');
  assert.ok(M.view(s).done);
  assert.equal(s.help.lines.wrong + s.help.mark.wrong + s.help.verify.wrong, 0);
  // another scenario: B, from the choice, nothing carried over
  const b = run([{ type: 'nextScenario' }], s);
  assert.equal(b.scenario, 1);
  assert.equal(b.step, 'choose');
  assert.deepEqual([b.chosen, b.entries, b.judged, b.marker], [[], {}, {}, null]);
  assert.equal(run([{ type: 'nextScenario' }, { type: 'nextScenario' }], b).scenario, 0, 'the scenarios cycle');
  // reset: same scenario, back to the choice
  const r = run([{ type: 'reset' }], s);
  assert.deepEqual([r.scenario, r.step, r.chosen, r.marker], [0, 'choose', [], null]);
});

test('choosing: a third choice replaces the earliest; clicking a chosen one clears it', () => {
  const s = run([{ type: 'next' }, { type: 'next' }, { type: 'toggle', id: 'tower' }, { type: 'toggle', id: 'antenna' }, { type: 'toggle', id: 'summit' }]);
  assert.deepEqual(s.chosen, ['antenna', 'summit']);
  assert.deepEqual(run([{ type: 'toggle', id: 'antenna' }], s).chosen, ['summit']);
});

test('lines: a verdict only after a check; a changed value clears it; a right line locks', () => {
  let s = run([{ type: 'next' }, { type: 'next' }, ...choose('tower', 'antenna'), enter('tower', 56), enter('antenna', 104)]);
  assert.equal(M.view(s).verdict('tower'), null, 'typing is neutral');
  s = run([{ type: 'checkLines' }], s);
  assert.equal(M.view(s).verdict('tower').kind, 'reverse');
  assert.equal(M.view(s).verdict('antenna').kind, 'right');
  assert.equal(s.help.lines.wrong, 1);
  assert.equal(run([{ type: 'checkLines' }], s), s, 'the same values are not judged twice');
  assert.equal(run([{ type: 'toMark' }], s), s, 'no way on with a wrong line');
  // the right line is locked
  assert.equal(run([enter('antenna', 5)], s), s);
  assert.equal(run([{ type: 'nudge', id: 'antenna', by: 1 }], s), s);
  // a change clears the verdict of that line only
  s = run([enter('tower', 57)], s);
  assert.equal(M.view(s).verdict('tower'), null);
  assert.equal(M.view(s).verdict('antenna').kind, 'right');
  s = run([enter('tower', 236), { type: 'checkLines' }], s);
  assert.ok(M.view(s).linesRight);
});

test('nudging wraps across north: 359 → 0 → 359, and an empty field starts from 0', () => {
  let s = run([{ type: 'next' }, { type: 'next' }, ...choose('tower', 'summit')]);
  s = run([{ type: 'nudge', id: 'summit', by: -1 }], s);
  assert.equal(s.entries.summit, '359');
  s = run([{ type: 'nudge', id: 'summit', by: 1 }], s);
  assert.equal(s.entries.summit, '0');
  s = run([{ type: 'nudge', id: 'summit', by: 10 }, { type: 'nudge', id: 'summit', by: -20 }], s);
  assert.equal(s.entries.summit, '350');
  s = run([enter('summit', '370')], s);
  assert.equal(M.view(s).value('summit'), null, 'over 360 has no value until it is brought into 0–359');
});

test('hints are graded and the solution waits for an attempt; the solution fills the right values', () => {
  let s = run([{ type: 'next' }, { type: 'next' }, ...choose('tower', 'antenna')]);
  assert.deepEqual(M.helpOffer(s, 'lines'), { hint: false, solve: false, show: false }, 'nothing before an attempt');
  assert.equal(run([{ type: 'solve', stage: 'lines' }], s), s);
  s = run([enter('tower', 104), enter('antenna', 284), { type: 'checkLines' }], s);
  assert.equal(M.view(s).verdict('tower').kind, 'other-object');
  assert.deepEqual(M.helpOffer(s, 'lines'), { hint: true, solve: false, show: false });
  s = run([{ type: 'hint', stage: 'lines' }], s);
  assert.deepEqual(M.helpOffer(s, 'lines'), { hint: true, solve: true, show: true });
  s = run([{ type: 'hint', stage: 'lines' }], s);
  assert.equal(s.help.lines.hint, 2);
  assert.deepEqual(M.helpOffer(s, 'lines'), { hint: false, solve: true, show: true });
  s = run([{ type: 'solve', stage: 'lines' }], s);
  assert.deepEqual([s.entries.tower, s.entries.antenna], ['236', '104']);
  assert.ok(M.view(s).linesRight && s.help.lines.solved);
  assert.deepEqual(M.helpOffer(s, 'lines'), { hint: false, solve: false, show: false }, 'no help once solved');
  // a second wrong check alone also offers the solution
  let t = run([{ type: 'next' }, { type: 'next' }, ...choose('tower', 'antenna'), enter('tower', 1), enter('antenna', 2), { type: 'checkLines' }, enter('tower', 3), { type: 'checkLines' }]);
  assert.deepEqual(M.helpOffer(t, 'lines'), { hint: true, solve: true, show: false });
  // a hint opened, then the lines put right by the learner: the hints close
  t = run([{ type: 'hint', stage: 'lines' }, enter('tower', 236), enter('antenna', 104)], t);
  assert.equal(M.helpOffer(t, 'lines').show, true, 'hints stay while the learner works');
  t = run([{ type: 'checkLines' }], t);
  assert.deepEqual(M.helpOffer(t, 'lines'), { hint: false, solve: false, show: false }, 'no help once right');
  assert.equal(run([{ type: 'hint', stage: 'lines' }], t), t);
  assert.equal(run([{ type: 'solve', stage: 'lines' }], t), t);
});

test('mark: wrong, then moved and right; the solution places the mark on the position; keys move it', () => {
  const sc = M.SCENARIOS[0];
  let s = run([{ type: 'next' }, { type: 'next' }, ...choose('tower', 'antenna'), enter('tower', 236), enter('antenna', 104), { type: 'checkLines' }, { type: 'toMark' }]);
  // keys: the first press puts the mark at the sheet's centre, later presses move it (E right, N up — never mirrored)
  s = run([{ type: 'move', dE: 20, dN: 0 }], s);
  assert.deepEqual(s.marker, { E: 1200, N: 900 });
  s = run([{ type: 'move', dE: 20, dN: 0 }, { type: 'move', dE: 0, dN: -100 }], s);
  assert.deepEqual(s.marker, { E: 1220, N: 800 });
  s = run([{ type: 'checkMark' }], s);
  assert.notEqual(M.view(s).mark.kind, 'right');
  assert.equal(s.help.mark.wrong, 1);
  assert.equal(run([{ type: 'toVerify' }], s), s);
  s = run([{ type: 'place', at: { E: sc.position.E + 30, N: sc.position.N } }], s);
  assert.equal(M.view(s).mark, null, 'a moved mark has no verdict until checked');
  s = run([{ type: 'checkMark' }], s);
  assert.equal(M.view(s).mark.kind, 'right');
  assert.equal(run([{ type: 'place', at: { E: 0, N: 0 } }], s), s, 'a right mark stays');
  // the clamp keeps the mark on the sheet
  let c = run([{ type: 'next' }, { type: 'next' }, ...choose('tower', 'antenna'), enter('tower', 236), enter('antenna', 104), { type: 'checkLines' }, { type: 'toMark' }, { type: 'place', at: { E: -50, N: 5000 } }]);
  assert.deepEqual(c.marker, { E: 0, N: M.SHEET.height });
  c = run([{ type: 'checkMark' }, { type: 'hint', stage: 'mark' }, { type: 'solve', stage: 'mark' }], c);
  assert.deepEqual(c.marker, sc.position);
  assert.equal(M.view(c).mark.kind, 'right');
  assert.equal(run([{ type: 'toVerify' }], c).step, 'verify');
});

test('verify: the third object’s line — reversed, then right; the other objects are now known', () => {
  let s = run([{ type: 'next' }, { type: 'next' }, ...choose('tower', 'antenna'), enter('tower', 236), enter('antenna', 104), { type: 'checkLines' }, { type: 'toMark' }]);
  s = run([{ type: 'place', at: M.SCENARIOS[0].position }, { type: 'checkMark' }, { type: 'toVerify' }], s);
  s = run([enter('summit', 190), { type: 'checkVerify' }], s);
  assert.equal(s.step, 'verify');
  assert.equal(M.view(s).verdict('summit').kind, 'reverse');
  s = run([enter('summit', 236), { type: 'checkVerify' }], s);
  assert.deepEqual(M.view(s).verdict('summit'), { kind: 'other-object', other: 'tower', reversed: true });
  assert.equal(s.help.verify.wrong, 2);
  s = run([{ type: 'solve', stage: 'verify' }], s);
  assert.equal(s.step, 'done');
  assert.equal(s.entries.summit, '10');
});

test('every scenario can be finished with each pair of objects, from the readings alone', () => {
  for (let k = 0; k < M.SCENARIOS.length; k++) {
    const sc = M.SCENARIOS[k];
    for (const [p, q] of PAIRS) {
      let s = { ...M.INITIAL_STATE, scenario: k, step: 'choose' };
      const third = ids.find((id) => id !== p && id !== q);
      s = run([...choose(p, q), enter(p, M.backAzimuth(sc.readings[p])), enter(q, M.backAzimuth(sc.readings[q])), { type: 'checkLines' }, { type: 'toMark' }], s);
      // mark where the learner's own two lines cross
      const X = M.crossing(M.OBJECTS[p].pos, M.backAzimuth(sc.readings[p]), M.OBJECTS[q].pos, M.backAzimuth(sc.readings[q]));
      s = run([{ type: 'place', at: { E: Math.round(X.E), N: Math.round(X.N) } }, { type: 'checkMark' }, { type: 'toVerify' }, enter(third, M.backAzimuth(sc.readings[third])), { type: 'checkVerify' }], s);
      assert.equal(s.step, 'done', `${sc.id} with ${p}+${q}`);
    }
  }
});

test('the state never holds the position before the learner marks it or asks for the solution', () => {
  const s = run([{ type: 'next' }, { type: 'next' }, ...choose('tower', 'antenna'), enter('tower', 236), enter('antenna', 104), { type: 'checkLines' }, { type: 'toMark' }]);
  const text = JSON.stringify(s);
  for (const sc of M.SCENARIOS) assert.ok(!text.includes(String(sc.position.E)) && !text.includes(String(sc.position.N)), `${sc.id} position not in the state`);
});
