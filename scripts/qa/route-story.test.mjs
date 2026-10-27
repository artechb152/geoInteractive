// Numeric and logic tests for lesson 6 „תכנון ציר: בניית סיפור דרך” (task 31):
// the route-story model that PlanningScene's list, panel and PlanningRouteMap all read.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/route-story.test.mjs
// Browser checks of the same screen: scripts/qa/route-story.e2e.test.mjs (needs a dev server).
import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../../src/components/lessons/topic-06/route-story/routeStoryModel.ts');

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const run = (actions, s = M.INITIAL_STATE) => actions.reduce(M.reducer, s);
const STREAM = M.samplePath(M.STREAM);
const ROAD = M.samplePath(M.ROAD);
const toM = (units) => units * M.M_PER_UNIT;
/** Where q falls along leg i (0 = its start, 1 = its end) and how far to its side; side < 0 = left of the walking direction. */
function onLeg(i, q) {
  const a = M.legFrom(i);
  const b = M.legTo(i);
  const L = M.dist(a, b);
  const d = { x: (b.x - a.x) / L, y: (b.y - a.y) / L };
  const v = { x: q.x - a.x, y: q.y - a.y };
  return { t: (v.x * d.x + v.y * d.y) / L, side: d.x * v.y - d.y * v.x };
}
/** Crossings strictly inside a leg (its two end points excluded). */
const inner = (i, line) => M.crossings(M.legFrom(i), M.legTo(i), line).filter((c) => c.t > 0.02 && c.t < 0.98);

// ---------------------------------------------------------------- five points, four legs

test('five points joined by four legs; each leg leaves one point and reaches the next', () => {
  assert.equal(M.POINTS.length, 5);
  assert.equal(M.LEGS.length, 4);
  M.LEGS.forEach((leg, i) => {
    assert.equal(leg.from, i);
    assert.equal(leg.to, i + 1);
  });
  assert.deepEqual(M.LEGS.map((l) => l.letter), ['א׳', 'ב׳', 'ג׳', 'ד׳']);
  assert.equal(M.POINTS[0].abbr, 'נ.ה');
  assert.equal(M.POINTS[4].abbr, 'נ.ס');
});

test('no two legs share their numbers (the old list gave נ.ה and point 2 the same 035°/500)', () => {
  const keys = M.LEGS.map((l) => `${l.az}/${l.m}`);
  assert.equal(new Set(keys).size, keys.length, keys.join(' '));
});

test('the stops alternate point, leg, point … : 9 stops from נ.ה to נ.ס', () => {
  assert.equal(M.STOPS.length, 9);
  M.STOPS.forEach((s, k) => {
    assert.equal(s.kind, k % 2 === 0 ? 'point' : 'leg');
    assert.equal(s.i, Math.floor(k / 2));
  });
  assert.equal(M.stopIndex('leg', 3), 7);
  assert.equal(M.stopIndex('point', 4), 8);
});

// ---------------------------------------------------------------- the map is drawn from the numbers

test('every leg on the map has the azimuth and length of its data (north up, scale 23.5 m per unit)', () => {
  M.LEGS.forEach((leg, i) => {
    const a = M.legFrom(i);
    const b = M.legTo(i);
    close(M.bearing(a, b), leg.az, 0.2, `leg ${leg.letter} bearing`);
    close(toM(M.dist(a, b)), leg.m, 4, `leg ${leg.letter} length`);
  });
  assert.deepEqual(M.POINT_XY[0], M.START);
});

test('all points sit on the sheet; the route runs north-east, so nothing is mirrored', () => {
  for (const p of M.POINT_XY) {
    assert.ok(p.x > 3 && p.x < M.VIEW_W - 3 && p.y > 3 && p.y < M.VIEW_H - 3, JSON.stringify(p));
  }
  for (let i = 1; i < M.POINT_XY.length; i++) {
    assert.ok(M.POINT_XY[i].x > M.POINT_XY[i - 1].x, 'each point is east of the one before');
    assert.ok(M.POINT_XY[i].y < M.POINT_XY[i - 1].y, 'and north of it');
  }
});

// ---------------------------------------------------------------- the signs are where the text says, in that order

test('leg א׳: open ground, the stream draws nearer and is not crossed; it ends at the stream bend (point 2)', () => {
  assert.equal(inner(0, STREAM).length, 0);
  assert.equal(inner(0, ROAD).length, 0);
  assert.ok(M.distToLine(M.legFrom(0), STREAM) > M.distToLine(M.legTo(0), STREAM) + 10, 'the stream is nearer at the end');
  assert.ok(toM(M.dist(M.POINT_XY[1], M.STREAM_BEND)) < 120, 'point 2 is at the bend');
  // „העיקול ממש לפניכם”: arriving on leg א׳, the bend lies ahead (within 45° of the walking direction)
  const ahead = Math.abs(((M.bearing(M.POINT_XY[1], M.STREAM_BEND) - M.LEGS[0].az + 540) % 360) - 180);
  assert.ok(ahead < 45, 'bend is ahead of the walker: ' + ahead);
  assert.equal(M.POINTS[1].feature, 'stream-bend');
});

test('the stream really bends south at point 2 (south-east before, about south after)', () => {
  const before = M.bearing({ x: 22.5, y: 56 }, M.STREAM_BEND);
  const after = M.bearing(M.STREAM_BEND, { x: 33.2, y: 70 });
  assert.ok(before > 100 && before < 135, `before ${before}`);
  assert.ok(after > 155 && after < 200, `after ${after}`);
});

test('leg ב׳: crosses the stream once, about 100 m from point 2, then reaches the saddle between two summits', () => {
  const c = inner(1, STREAM);
  assert.equal(c.length, 1);
  close(toM(c[0].t * M.dist(M.legFrom(1), M.legTo(1))), 100, 40, 'crossing distance from point 2');
  close(c[0].at.x, M.STREAM_CROSSING.x, 0.02);
  close(c[0].at.y, M.STREAM_CROSSING.y, 0.02);
  assert.equal(inner(1, ROAD).length, 0);
  // the summits sit either side of the route at point 3, so it threads the col
  const r = (M.SADDLE_ROTATE * Math.PI) / 180;
  const axis = { x: Math.cos(r), y: Math.sin(r) };
  const summits = [-1, 1].map((k) => ({ x: M.POINT_XY[2].x + k * M.SUMMIT_OFFSET * axis.x, y: M.POINT_XY[2].y + k * M.SUMMIT_OFFSET * axis.y }));
  const sides = summits.map((s) => Math.sign(onLeg(1, s).side));
  assert.deepEqual(sides.sort(), [-1, 1]);
});

test('leg ג׳: crosses neither stream nor road on the way, and ends where the road crosses the route (point 4)', () => {
  assert.equal(inner(2, STREAM).length, 0);
  assert.equal(inner(2, ROAD).length, 0);
  assert.ok(M.distToLine(M.POINT_XY[3], ROAD) < 0.3, 'point 4 is on the road');
  // the road crosses the route rather than running along it
  const i = ROAD.findIndex((p) => M.dist(p, M.POINT_XY[3]) < 0.3);
  const roadAz = M.bearing(ROAD[i - 4], ROAD[i + 4]);
  const diff = Math.abs(((roadAz - M.LEGS[2].az + 540) % 360) - 180);
  assert.ok(diff > 45 && diff < 135, `road ${roadAz}° vs leg ${M.LEGS[2].az}°`);
});

test('leg ד׳: the grove is on the left, around the middle; the pine cluster on rocks is at the end (נ.ס)', () => {
  assert.equal(inner(3, STREAM).length, 0);
  assert.equal(inner(3, ROAD).length, 0, 'leg ד׳ leaves the road and does not meet it again');
  for (const p of M.GROVE_PINES) {
    const o = onLeg(3, p);
    assert.ok(o.side < -2, `grove pine ${p.x},${p.y} is left of the route (${o.side})`);
    assert.ok(o.t > 0.2 && o.t < 0.8, `grove pine along ${o.t}`);
  }
  const end = M.POINT_XY[4];
  for (const p of [...M.TARGET_PINES, ...M.TARGET_ROCKS]) {
    assert.ok(toM(M.dist(p, end)) < 250, `target object ${p.x},${p.y} near נ.ס`);
  }
  // the grove is clearly before the end, so stopping there would be short
  const gc = M.FEATURES.grove.at;
  assert.ok(toM(M.dist(gc, end)) > 200);
});

test('every leg names its end sign as the point it reaches, and every ring sits where its sign is drawn', () => {
  M.LEGS.forEach((leg) => assert.equal(M.legEnd(leg), M.POINTS[leg.to]));
  assert.deepEqual(M.FEATURES.road.at, M.POINT_XY[3]);
  assert.deepEqual(M.FEATURES.saddle.at, M.POINT_XY[2]);
  assert.deepEqual(M.FEATURES['stream-crossing'].at, M.STREAM_CROSSING);
  assert.ok(M.dist(M.FEATURES['stream-bend'].at, M.STREAM_BEND) < 0.01);
  for (const p of M.GROVE_PINES) assert.ok(M.dist(p, M.FEATURES.grove.at) < M.FEATURES.grove.rx + 1);
  for (const p of M.TARGET_PINES) assert.ok(M.dist(p, M.FEATURES['pines-rocks'].at) < M.FEATURES['pines-rocks'].rx + 1);
});

// ---------------------------------------------------------------- what is drawn for each stop

test('a selected point shows its OUTGOING leg; a selected leg shows itself; נ.ס shows none', () => {
  assert.equal(M.shownLeg({ kind: 'point', i: 0 }), 0);
  assert.equal(M.shownLeg({ kind: 'point', i: 1 }), 1);
  assert.equal(M.shownLeg({ kind: 'point', i: 4 }), null);
  assert.equal(M.shownLeg({ kind: 'leg', i: 2 }), 2);
  assert.deepEqual(M.legStates({ kind: 'point', i: 0 }), ['next', 'ahead', 'ahead', 'ahead']);
  assert.deepEqual(M.legStates({ kind: 'point', i: 2 }), ['walked', 'walked', 'next', 'ahead']);
  assert.deepEqual(M.legStates({ kind: 'leg', i: 1 }), ['walked', 'focus', 'ahead', 'ahead']);
  assert.deepEqual(M.pointStates({ kind: 'leg', i: 1 }), ['passed', 'from', 'to', 'ahead', 'ahead']);
  assert.deepEqual(M.pointStates({ kind: 'point', i: 4 }), ['passed', 'passed', 'passed', 'passed', 'focus']);
  // נ.ה and leg א׳ are told apart in words, not only by which marker glows
  assert.match(M.describe({ kind: 'point', i: 0 }, false), /^נקודה 1: .*הקטע היוצא: קטע א׳, 035°/);
  assert.match(M.describe({ kind: 'leg', i: 0 }, false), /^קטע א׳, מנקודה 1 אל נקודה 2: אזימוט 035°/);
});

test('rings: a leg rings what it passes and its end sign; leg ד׳ and נ.ס ring nothing until the learner writes them', () => {
  assert.deepEqual(M.halos({ kind: 'leg', i: 1 }, false), [
    { feature: 'stream-crossing', role: 'along' },
    { feature: 'saddle', role: 'end' },
  ]);
  assert.deepEqual(M.halos({ kind: 'point', i: 0 }, false), []);
  assert.deepEqual(M.halos({ kind: 'leg', i: 3 }, false), []);
  assert.deepEqual(M.halos({ kind: 'point', i: 4 }, false), []);
  assert.deepEqual(M.halos({ kind: 'leg', i: 3 }, true), [
    { feature: 'grove', role: 'along' },
    { feature: 'pines-rocks', role: 'end' },
  ]);
  assert.deepEqual(M.halos({ kind: 'point', i: 4 }, true), [{ feature: 'pines-rocks', role: 'point' }]);
  assert.match(M.describe({ kind: 'leg', i: 3 }, false), /להשלמה/);
  assert.doesNotMatch(M.describe({ kind: 'point', i: 3 }, false), /040|600/);
});

// ---------------------------------------------------------------- the application step

test('the options are the named mistakes around leg ד׳’s real numbers', () => {
  assert.deepEqual([...M.AZ_OPTIONS], [40, 220, 320]);
  assert.equal(M.AZ_OPTIONS[1], (M.LEGS[3].az + 180) % 360, 'reverse bearing');
  assert.equal(M.AZ_OPTIONS[2], 360 - M.LEGS[3].az, 'measured counter-clockwise');
  assert.deepEqual([...M.M_OPTIONS], [300, 600, 1200]);
  assert.deepEqual(M.CORRECT, { az: 40, m: 600, end: 'pines-rocks' });
  // the wrong signs are the one at the start of the leg and the one on the way
  assert.equal(M.POINTS[M.LEGS[3].from].feature, 'road');
  assert.ok(M.LEGS[3].alongFeatures.includes('grove'));
});

test('wrong-answer feedback explains the mismatch without naming the value to pick', () => {
  for (const az of M.AZ_OPTIONS.filter((v) => v !== M.CORRECT.az)) {
    assert.doesNotMatch(M.FEEDBACK.az[az], /040|\b40°/, `az ${az}`);
  }
  for (const m of M.M_OPTIONS.filter((v) => v !== M.CORRECT.m)) {
    assert.doesNotMatch(M.FEEDBACK.m[m], /600/, `m ${m}`);
  }
  for (const e of M.END_OPTIONS.filter((v) => v !== M.CORRECT.end)) {
    assert.doesNotMatch(M.FEEDBACK.end[e], /אורנים|סלע/, `end ${e}`);
  }
  for (const f of ['az', 'm', 'end']) {
    const right = M.FEEDBACK[f][M.CORRECT[f]];
    assert.match(right, /^נכון/);
  }
});

test('check: needs all three; wrong fields keep their verdict until changed; correction finishes; reset clears', () => {
  const sel = { type: 'select', stop: M.stopIndex('leg', 3) };
  let s = run([sel, { type: 'choose', field: 'az', value: 220 }, { type: 'check' }]);
  assert.equal(s.attempts, 0, 'no check with blanks');
  s = run([{ type: 'choose', field: 'm', value: 600 }, { type: 'choose', field: 'end', value: 'grove' }, { type: 'check' }], s);
  assert.equal(s.attempts, 1);
  assert.equal(s.done, false);
  assert.equal(M.verdict(s, 'az'), 'wrong');
  assert.equal(M.verdict(s, 'm'), 'right');
  assert.equal(M.verdict(s, 'end'), 'wrong');
  // changing a field clears only its verdict — the others stay
  s = run([{ type: 'choose', field: 'az', value: 40 }], s);
  assert.equal(M.verdict(s, 'az'), null);
  assert.equal(M.verdict(s, 'end'), 'wrong');
  s = run([{ type: 'choose', field: 'end', value: 'pines-rocks' }, { type: 'check' }], s);
  assert.equal(s.done, true);
  assert.equal(s.attempts, 2);
  for (const f of ['az', 'm', 'end']) assert.equal(M.verdict(s, f), 'right');
  // locked once done
  assert.equal(run([{ type: 'choose', field: 'az', value: 320 }], s), s);
  const r = run([{ type: 'reset' }], s);
  assert.deepEqual(r, { ...M.INITIAL_STATE, stop: s.stop });
  assert.equal(M.verdict(r, 'az'), null);
});

test('select clamps to the nine stops', () => {
  assert.equal(run([{ type: 'select', stop: -3 }]).stop, 0);
  assert.equal(run([{ type: 'select', stop: 42 }]).stop, 8);
});

test('the whole route is 2,300 m', () => {
  assert.equal(M.TOTAL_M, 2300);
});
