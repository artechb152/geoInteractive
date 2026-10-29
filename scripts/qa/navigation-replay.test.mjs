// Numeric and behavioural tests for the lesson-6 navigation replay („מתי עוצרים לבדוק?”,
// src/components/lessons/topic-06/navigation-replay/): one geography for map and view,
// estimate vs truth, fairness of moment 4, contours from the height field, the state machine.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/navigation-replay.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const base = '../../src/components/lessons/topic-06/';
const G = await import(base + 'navTipsGeometry.ts');
const W = await import(base + 'navigation-replay/replayWorld.ts');
const T = await import(base + 'navigation-replay/replayTerrain.ts');
const C = await import(base + 'navigation-replay/replayContours.ts');
const S = await import(base + 'navigation-replay/replayScenario.ts');
const ST = await import(base + 'navigation-replay/replayState.ts');
const SC = await import(base + 'navigation-replay/replayScatter.ts');
const VS = await import(base + 'navigation-replay/replayViewStore.ts');

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const H = (p) => {
  const w = W.toWorld(p);
  return T.heightAt(w.x, w.z);
};

// ───────────────────────────────────────────── shared geography

test('the planning geometry is unchanged: legs 500 / 550 / 600 / 500 m, the same points', () => {
  assert.deepEqual(G.TIP_LEGS.map((l) => l.m), [500, 550, 600, 500]);
  // the planning map's points, as NavTipsMap drew them before the extraction
  assert.deepEqual(G.START, { x: 86, y: 62 });
  assert.deepEqual(G.P1, { x: 66.08, y: 60.26 });
  assert.deepEqual(G.P2, { x: 46.66, y: 49.93 });
  assert.deepEqual(G.P3, { x: 31.88, y: 31.02 });
  for (let k = 0; k < 4; k++) {
    const a = G.POINTS[k];
    const b = G.POINTS[k + 1];
    close(Math.hypot(b.x - a.x, b.y - a.y) * G.M_PER_UNIT, G.TIP_LEGS[k].m, 2, `leg ${k + 1}`);
  }
});

test('map ↔ world: metres, north up (−z), east +x, bearings clockwise, round trip', () => {
  const o = { x: 0, z: 0 };
  assert.equal(W.bearingW(o, { x: 0, z: -10 }), 0);
  assert.equal(W.bearingW(o, { x: 10, z: 0 }), 90);
  assert.equal(W.bearingW(o, { x: 0, z: 10 }), 180);
  assert.equal(W.bearingW(o, { x: -10, z: 0 }), 270);
  const p = { x: 37.4, y: 12.9 };
  const back = W.toMap(W.toWorld(p));
  close(back.x, p.x, 1e-9);
  close(back.y, p.y, 1e-9);
  // one map unit is 25 m, never mirrored
  close(W.toWorld({ x: 51, y: 37.5 }).x - W.toWorld({ x: 50, y: 37.5 }).x, 25, 1e-9, 'east');
  close(W.toWorld({ x: 50, y: 36.5 }).z - W.toWorld({ x: 50, y: 37.5 }).z, -25, 1e-9, 'north');
  // the planned legs' bearings come back from the world positions
  for (let k = 0; k < 4; k++) close(W.bearingW(W.toWorld(G.POINTS[k]), W.toWorld(G.POINTS[k + 1])), G.TIP_LEGS[k].az, 0.3, `leg ${k + 1} bearing`);
  close(W.turnDeg(350, 10), 20, 1e-9);
  close(W.turnDeg(10, 350), -20, 1e-9);
});

test('the stream bends at checkpoint 1 and the road is crossed at checkpoint 3', () => {
  const sp = T.surfaceAt(W.toWorld(G.P1).x, W.toWorld(G.P1).z);
  assert.ok(sp.streamD < 15, `stream ${sp.streamD.toFixed(1)} m from checkpoint 1`);
  const rp = T.surfaceAt(W.toWorld(G.P3).x, W.toWorld(G.P3).z);
  assert.ok(rp.roadD < 1, `road ${rp.roadD.toFixed(2)} m from checkpoint 3`);
});

// ───────────────────────────────────────────── the height field

test('two summits, a true saddle between them, a descent to the road crossing', () => {
  const sn = H(G.SUMMIT_N);
  const ss = H(G.SUMMIT_S);
  const col = H(G.P2);
  assert.ok(sn > ss && ss > col + 15, `summits ${sn.toFixed(0)} / ${ss.toFixed(0)}, saddle ${col.toFixed(0)}`);
  const at = (u, v) => {
    const w = W.toWorld(G.P2);
    const ax = { x: G.RIDGE_AXIS.x, z: G.RIDGE_AXIS.y };
    return T.heightAt(w.x + ax.x * u - ax.z * v, w.z + ax.z * u + ax.x * v);
  };
  // along the ridge it rises both ways, across it (along the route) it falls both ways
  for (const d of [60, 120]) {
    assert.ok(at(d, 0) > col && at(-d, 0) > col, `ridge rises ±${d} m`);
    assert.ok(at(0, d) < col && at(0, -d) < col, `route falls ±${d} m`);
  }
  assert.ok(H(G.P3) < col - 15, 'leg 3 goes down to the road');
  assert.ok(H(G.P1) < col - 30, 'leg 2 climbs from the stream bend');
});

test('the stream bed descends downstream; the ground is continuous and finite to the horizon', () => {
  const pts = T.STREAM_LINE.pts;
  let prev = Infinity;
  for (let i = 0; i < pts.length; i += 12) {
    const h = T.heightAt(pts[i].x, pts[i].z);
    assert.ok(h < prev + 2.5, `stream bed rises at sample ${i}`);
    prev = Math.min(prev, h);
  }
  for (const r of [3000, 8000, 15000])
    for (let a = 0; a < 360; a += 45) {
      const h = T.heightAt(Math.sin((a * Math.PI) / 180) * r, -Math.cos((a * Math.PI) / 180) * r);
      assert.ok(Number.isFinite(h) && h > 250 && h < 650, `horizon height ${h} at ${r} m, ${a}°`);
    }
  // continuity: no step over 1.5 m between points 1 m apart
  for (let i = 0; i < 400; i++) {
    const x = -1200 + ((i * 37) % 2400);
    const z = -900 + ((i * 53) % 1800);
    assert.ok(Math.abs(T.heightAt(x, z) - T.heightAt(x + 1, z)) < 1.5, `step at ${x},${z}`);
  }
  // micro relief stays below a contour interval
  for (let i = 0; i < 2000; i++) assert.ok(Math.abs(T.microRelief(i * 3.7, -i * 2.9)) < 0.6);
});

test('contours are traced from the height field: every vertex sits on its level', () => {
  const box = { x: 30, y: 30, w: 30, h: 25 };
  const { lines } = C.contourLines(box, { step: 0.4, interval: 5 });
  assert.ok(lines.length > 20, `${lines.length} contour lines`);
  let worst = 0;
  for (const l of lines)
    for (let i = 0; i < l.pts.length; i += 3) {
      const e = Math.abs(H(l.pts[i]) - l.level);
      worst = Math.max(worst, e);
    }
  assert.ok(worst < 2.5, `worst contour error ${worst.toFixed(2)} m (5 m interval)`);
  // the summit is ringed by its highest contours
  const top = Math.floor(H(G.SUMMIT_N) / 5) * 5;
  assert.ok(lines.some((l) => l.level === top), `a ${top} m contour around the summit`);
});

test('eye height: the station grid reproduces the ground within 25 cm, the eye 1.7 m above it', async () => {
  for (const m of S.MOMENTS) {
    const s = W.toWorld(m.truth.at);
    const grid = await T.buildGrid(s.x, s.z, 60, 2, true);
    const t = new T.StationTerrain([grid]);
    for (const [dx, dz] of [[0, 0], [7, 3], [-13, 21], [33, -17]]) close(t.height(s.x + dx, s.z + dz), T.groundAt(s.x + dx, s.z + dz), 0.25, `${m.id} ground`);
    assert.equal(VS.EYE_HEIGHT_M, 1.7);
  }
});

// ───────────────────────────────────────────── the scenario: known vs true

test('estimates are fixed scenario values taken from the planned geometry', () => {
  const [m1, m2, m3, m4] = S.MOMENTS;
  assert.equal(m1.estimate, null);
  close(S.mapDistM(G.P1, m2.estimate.at), m2.estimate.meters, 30, 'moment 2: ~250 m along leg 2');
  assert.equal(m2.estimate.meters, 250);
  close(S.mapDistM(G.P1, m3.estimate.at), 550, 3, 'moment 3: at the saddle');
  assert.equal(m3.estimate.meters, 550);
  close(S.mapDistM(G.P2, m4.estimate.at), 600, 3, 'moment 4: at the planned crossing');
  assert.equal(m4.estimate.meters, 600);
  // the copy quotes the same numbers
  assert.match(m2.field, /250/);
  assert.match(m3.story, /550/);
  assert.match(m4.story, /600/);
  assert.match(m4.field, /600/);
  // moments 2–3: the truth is the estimate; moment 4: the same distance, another heading
  assert.deepEqual(m2.truth.at, m2.estimate.at);
  assert.deepEqual(m3.truth.at, m3.estimate.at);
  close(S.mapDistM(G.P2, m4.truth.at), 600, 3, 'moment 4 walked leg 3’s distance');
  close(S.mapBearing(G.P2, m4.truth.at) - G.TIP_LEGS[2].az, S.DRIFT_TURN_DEG, 0.5, 'drifted heading');
});

test('moment 4 is fair: no road near the station in any direction, and none visible close by', () => {
  const d = W.toWorld(S.DRIFT_END);
  assert.ok(T.surfaceAt(d.x, d.z).roadD > 150, 'the road is not nearby');
  assert.ok(S.DRIFT_FROM_CROSSING_M > 150, 'not at the planned crossing');
  const eye = T.groundAt(d.x, d.z) + 1.7;
  const visible = (p) => {
    const dist = Math.hypot(p.x - d.x, p.z - d.z);
    const target = T.groundAt(p.x, p.z) + 0.3;
    for (let t = 0.02; t < 0.98; t += 0.01) {
      const x = d.x + (p.x - d.x) * t;
      const z = d.z + (p.z - d.z) * t;
      if (T.groundAt(x, z) > eye + (target - eye) * t) return false;
    }
    return dist > 0;
  };
  let nearestSeen = Infinity;
  for (const p of T.ROAD_LINE.pts) {
    const dist = Math.hypot(p.x - d.x, p.z - d.z);
    if (dist < 600 && visible(p)) nearestSeen = Math.min(nearestSeen, dist);
  }
  assert.ok(nearestSeen > 350, `nearest visible stretch of road ${nearestSeen.toFixed(0)} m away (the spur hides the near road)`);
});

test('before the decision nothing gives the answer away (copy, accessible map text)', () => {
  const m4 = S.MOMENTS[3];
  const before = [m4.story, m4.field, m4.viewText, S.mapDescription({ moment: m4, saddleFixed: true, revealTruth: false })].join(' ');
  for (const w of ['סטה', 'סטייה', 'בפועל', 'שלוחה', 'ערוץ', 'ממזרח', 'צפונה', 'טעות']) assert.ok(!before.includes(w), `"${w}" before the decision`);
  const after = S.mapDescription({ moment: m4, saddleFixed: true, revealTruth: true });
  assert.match(after, /בפועל/);
  assert.match(m4.debrief, /בשטח לא יודעים זאת מראש/);
  // every moment's choices: one fits; a cautious check in moment 2 is not blamed
  assert.equal(S.MOMENTS[1].onChoice.check.next, 'done');
  assert.match(S.MOMENTS[1].onChoice.check.lead, /אינה טעות/);
  for (const m of S.MOMENTS.slice(1)) {
    const right = m.evidence.options.filter((o) => o.verdict === 'right');
    assert.equal(right.length, 1, `${m.id}: one right reason`);
  }
});

// ───────────────────────────────────────────── the state machine

test('state: guided opening, decisions, retry, evidence, per-moment answers, reset', () => {
  let s = ST.initialReplayState();
  const r = (a) => (s = ST.replayReducer(s, a));
  assert.equal(s.active, 'depart');
  // deciding is ignored at the guided opening; one action completes it
  r({ type: 'decide', choice: 'check' });
  assert.equal(s.moments.depart.phase, 'viewing');
  r({ type: 'complete' });
  assert.equal(s.moments.depart.phase, 'done');
  // viewing a later moment does not complete earlier ones
  r({ type: 'goto', id: 'after' });
  assert.equal(s.moments.enroute.phase, 'viewing');
  assert.equal(s.moments.saddle.phase, 'viewing');
  // moment 4: continue → retry; evidence is refused until the choice asks for it
  r({ type: 'evidence', option: 'missing' });
  assert.equal(s.moments.after.evidence, null);
  r({ type: 'decide', choice: 'continue' });
  assert.equal(s.moments.after.phase, 'decided');
  r({ type: 'decide', choice: 'check' }); // a second choice needs a retry first
  assert.equal(s.moments.after.choice, 'continue');
  r({ type: 'retry' });
  assert.equal(s.moments.after.phase, 'viewing');
  r({ type: 'decide', choice: 'check' });
  r({ type: 'evidence', option: 'proof' });
  assert.equal(s.moments.after.phase, 'evidence');
  r({ type: 'evidence', option: 'routine' });
  assert.equal(s.moments.after.evidence, 'routine');
  r({ type: 'evidence', option: 'missing' });
  assert.equal(s.moments.after.phase, 'done');
  r({ type: 'evidence', option: 'proof' }); // a right reason is final
  assert.equal(s.moments.after.evidence, 'missing');
  assert.equal(s.moments.after.tries, 2);
  // the other moments kept their own (empty) answers
  assert.equal(s.moments.saddle.choice, null);
  // moment 2: a cautious check is explained and completes the moment
  r({ type: 'step', dir: -1 });
  r({ type: 'step', dir: -1 });
  assert.equal(s.active, 'enroute');
  r({ type: 'decide', choice: 'check' });
  assert.equal(s.moments.enroute.phase, 'done');
  // summary only after moment 4
  r({ type: 'summary', open: true });
  assert.equal(s.summary, true);
  r({ type: 'goto', id: 'saddle' });
  assert.equal(s.summary, false);
  assert.ok(!ST.allDone(s));
  r({ type: 'reset' });
  assert.deepEqual(s, ST.initialReplayState());
  r({ type: 'summary', open: true });
  assert.equal(s.summary, false, 'no summary before moment 4 is done');
  // steps stay inside the four moments
  r({ type: 'step', dir: -1 });
  assert.equal(s.active, 'depart');
});

test('the view only turns and zooms, and never changes the activity state', () => {
  const v = VS.createViewStore({ yawDeg: 342, pitchDeg: -3 });
  v.turn(30, 100);
  assert.equal(v.get().yawDeg, 12);
  assert.equal(v.get().pitchDeg, VS.LOOK_LIMITS.pitchMax);
  v.zoom(0.01);
  assert.equal(v.get().vfovDeg, VS.LOOK_LIMITS.vfovMin);
  v.goTo('home', true);
  assert.deepEqual(v.get(), { yawDeg: 342, pitchDeg: -3, vfovDeg: VS.DEFAULT_VFOV });
  assert.ok(!('look' in ST.initialReplayState()));
});

test('scatter is deterministic and anchored to the ground, whichever station looks', () => {
  const g = { height: (x, z) => T.groundAt(x, z), road: (x, z) => T.surfaceAt(x, z).roadD, stream: (x, z) => T.surfaceAt(x, z).streamD };
  const a = SC.scatter('shrub', 0, 0, g, { far: 120 });
  const b = SC.scatter('shrub', 40, 30, g, { far: 120 });
  const key = (i) => `${i.x.toFixed(3)},${i.z.toFixed(3)}`;
  const inA = new Map(a.map((i) => [key(i), i]));
  let shared = 0;
  for (const i of b) {
    const j = inA.get(key(i));
    if (!j) continue;
    shared++;
    assert.equal(i.variant, j.variant);
    assert.equal(i.y, j.y);
  }
  assert.ok(shared > 50, `${shared} shrubs seen from both stations, identical`);
  // nothing on the road bed or in the channel, nothing tall at the eye
  for (const i of a) {
    assert.ok(T.surfaceAt(i.x, i.z).roadD >= 4.5, 'a shrub on the road');
    if (i.dist < 18) assert.ok(i.scale <= 0.9 + 1e-9, 'a tall shrub at the eye');
  }
});
