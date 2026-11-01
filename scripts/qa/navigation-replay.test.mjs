// Numeric and behavioural tests for the lesson-6 navigation replay („מתי עוצרים לבדוק?”,
// src/components/lessons/topic-06/navigation-replay/): one geography for map and view,
// estimate vs truth, fairness of moment 4, contours from the height field, the state machine.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/navigation-replay.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const base = '../../src/components/lessons/topic-06/';
const G = await import(base + 'navigation-replay/replayGeography.ts');
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

test('replay follows all checkpoints and intervening bends of the lab example', () => {
  for(let k=0;k<4;k++){
    assert.deepEqual(G.LEG_PATHS[k][0],G.POINTS[k]);
    assert.deepEqual(G.LEG_PATHS[k].at(-1),G.POINTS[k+1]);
    close(G.pathLength(G.LEG_PATHS[k]),G.TIP_LEGS[k].lengthM,1e-9);
    assert.ok(Math.abs(G.TIP_LEGS[k].m-G.TIP_LEGS[k].lengthM)<=25);
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

test('the lab has two summits above its saddle and descends to its road', () => {
  const col=H(G.P2);
  assert.ok(H(G.SUMMIT_N)>col+15 && H(G.SUMMIT_S)>col+15);
  assert.ok(H(G.P1)<col-30);
  assert.ok(H(G.P3)<col-15);
});

test('shared ground is continuous and finite to the horizon, microrelief stays sub-contour', () => {
  for(const r of [3000,8000,15000]) for(let a=0;a<360;a+=45){
    const h=T.heightAt(Math.sin(a*Math.PI/180)*r,-Math.cos(a*Math.PI/180)*r);
    assert.ok(Number.isFinite(h)&&h>100&&h<1000);
  }
  for(let i=0;i<400;i++){const x=-600+(i*37)%1200,z=-700+(i*53)%1400;assert.ok(Math.abs(T.heightAt(x,z)-T.heightAt(x+1,z))<2);}
  for(let i=0;i<2000;i++)assert.ok(Math.abs(T.microRelief(i*3.7,-i*2.9))<0.6);
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

test('estimates quote the shared example leg distances, while the drift remains hidden', () => {
  const [m1,m2,m3,m4]=S.MOMENTS;
  assert.equal(m1.estimate,null);
  assert.equal(m2.estimate.meters,S.LEG2_SO_FAR_M);
  assert.equal(m3.estimate.meters,G.TIP_LEGS[1].m);
  assert.equal(m4.estimate.meters,G.TIP_LEGS[2].m);
  assert.ok(m3.story.includes(String(G.TIP_LEGS[1].m)));
  assert.ok(m4.field.includes(String(G.TIP_LEGS[2].m)));
  assert.deepEqual(m2.truth.at,m2.estimate.at);
  assert.deepEqual(m3.truth.at,m3.estimate.at);
  close(S.mapDistM(G.P2,m4.truth.at),G.TIP_LEGS[2].lengthM,0.01);
  close(W.turnDeg(G.TIP_LEGS[2].az,S.mapBearing(G.P2,m4.truth.at)),S.DRIFT_TURN_DEG,0.01);
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
  for (const w of ['סטה', 'סטייה', 'בפועל', 'שלוחה', 'ממזרח', 'טעות']) assert.ok(!before.includes(w), `"${w}" before the decision`);
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
