// Numeric and behavioural tests for the lesson-6 navigation decision exercise („במהלך הניווט: מה צריך לבדוק?”,
// src/components/lessons/topic-06/navigation-replay/): one geography for map and view, the walked route and
// its woodland event, what each stop can see, check geometry (loci → fix), decisions and their consequences,
// knowledge kept apart from truth, and a debrief built from the actions taken.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/navigation-replay.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const base = '../../src/components/lessons/topic-06/';
const G = await import(base + 'navigation-replay/replayGeography.ts');
const W = await import(base + 'navigation-replay/replayWorld.ts');
const T = await import(base + 'navigation-replay/replayTerrain.ts');
const C = await import(base + 'navigation-replay/replayContours.ts');
const R = await import(base + 'navigation-replay/replayRoute.ts');
const K = await import(base + 'navigation-replay/replayCheck.ts');
const RUN = await import(base + 'navigation-replay/replayRun.ts');
const S = await import(base + 'navigation-replay/replayScenario.ts');
const SC = await import(base + 'navigation-replay/replayScatter.ts');
const VS = await import(base + 'navigation-replay/replayViewStore.ts');
const L = await import(base + 'navigation-replay/replayLandmarks.ts');

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const H = (p) => {
  const w = W.toWorld(p);
  return T.heightAt(w.x, w.z);
};
const go = (s, ...acts) => acts.reduce((st, a) => RUN.runReducer(st, typeof a === 'string' ? { type: a } : a), s);
const view = (sign) => ({ type: 'pick-view', sign });
const list = (sign) => ({ type: 'pick-view', sign, from: 'list' });
const map = (sign) => ({ type: 'pick-map', sign });
const walk = (s) => go(s, 'continue', 'arrive');
const guided = () => go(RUN.initialRun(), view('saddle'), map('saddle'), view('stream'), map('stream'), 'commit');
const stop = (s) => RUN.current(s).stop;

// ───────────────────────────────────────────── shared geography

test('replay follows all checkpoints and intervening bends of the lab example', () => {
  for (let k = 0; k < 4; k++) {
    assert.deepEqual(G.LEG_PATHS[k][0], G.POINTS[k]);
    assert.deepEqual(G.LEG_PATHS[k].at(-1), G.POINTS[k + 1]);
    close(G.pathLength(G.LEG_PATHS[k]), G.TIP_LEGS[k].lengthM, 1e-9);
    assert.ok(Math.abs(G.TIP_LEGS[k].m - G.TIP_LEGS[k].lengthM) <= 25);
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
  close(W.toWorld({ x: 51, y: 37.5 }).x - W.toWorld({ x: 50, y: 37.5 }).x, 25, 1e-9, 'east');
  close(W.toWorld({ x: 50, y: 36.5 }).z - W.toWorld({ x: 50, y: 37.5 }).z, -25, 1e-9, 'north');
  for (let k = 0; k < 4; k++) close(W.bearingW(W.toWorld(G.POINTS[k]), W.toWorld(G.POINTS[k + 1])), G.TIP_LEGS[k].az, 0.3, `leg ${k + 1} bearing`);
});

test('the stream bends at checkpoint 1 and the road is crossed at checkpoint 3', () => {
  assert.ok(T.surfaceAt(W.toWorld(G.P1).x, W.toWorld(G.P1).z).streamD < 15);
  assert.ok(T.surfaceAt(W.toWorld(G.P3).x, W.toWorld(G.P3).z).roadD < 1);
});

test('the lab has two summits above its saddle and descends to its road', () => {
  const col = H(G.P2);
  assert.ok(H(G.SUMMIT_N) > col + 15 && H(G.SUMMIT_S) > col + 15);
  assert.ok(H(G.P1) < col - 30);
  assert.ok(H(G.P3) < col - 15);
});

test('contours are traced from the height field: every vertex sits on its level', () => {
  const { lines } = C.contourLines({ x: 30, y: 30, w: 30, h: 25 }, { step: 0.4, interval: 5 });
  assert.ok(lines.length > 20);
  let worst = 0;
  for (const l of lines) for (let i = 0; i < l.pts.length; i += 3) worst = Math.max(worst, Math.abs(H(l.pts[i]) - l.level));
  assert.ok(worst < 2.5, `worst contour error ${worst.toFixed(2)} m`);
});

test('eye height: every stop’s grid reproduces the ground within 25 cm, the eye 1.7 m above it', async () => {
  for (const [id, s] of Object.entries(R.STOP_AT)) {
    const t = new T.StationTerrain([await T.buildGrid(s.x, s.z, 60, 2, true)]);
    for (const [dx, dz] of [[0, 0], [7, 3], [-13, 21], [33, -17]]) close(t.height(s.x + dx, s.z + dz), T.groundAt(s.x + dx, s.z + dz), 0.25, `${id} ground`);
  }
  assert.equal(VS.EYE_HEIGHT_M, 1.7);
});

// ───────────────────────────────────────────── the walked route and its event

test('every segment starts and ends at its stops, and the stops are the planned checkpoints where planned', () => {
  for (const [key, pts] of Object.entries(R.SEGMENTS)) {
    const [a, b] = key.split('>');
    close(W.distW(pts[0], R.STOP_AT[a]), 0, 1e-6, `${key} start`);
    close(W.distW(pts.at(-1), R.STOP_AT[b]), 0, 1e-6, `${key} end`);
    // no detour and no invented stretch: the walked length stays close to the straight distance
    const len = W.polyline(pts).length;
    assert.ok(len < W.distW(pts[0], pts.at(-1)) * 1.3 + 15, `${key}: ${len.toFixed(0)} m walked for ${W.distW(pts[0], pts.at(-1)).toFixed(0)} m`);
  }
  close(W.distW(R.STOP_AT.saddle, W.toWorld(G.P2)), 0, 1e-6, 'the saddle stop is the saddle');
  close(W.distW(R.STOP_AT.crossing, W.toWorld(G.P3)), 0, 1e-6, 'the crossing stop is the crossing');
  assert.ok(W.distW(R.STOP_AT.stream, W.toWorld(G.P1)) < 10);
  assert.ok(T.surfaceAt(R.STOP_AT.road.x, R.STOP_AT.road.z).roadD < 2, 'the road stop stands on the road');
});

test('the walk through the woodland passes between the oaks, never under a crown', () => {
  assert.ok(R.WOODLAND_OAKS.length > 100);
  for (const [key, pts] of Object.entries(R.SEGMENTS)) for (const p of pts) assert.ok(R.crownGap(p) > 1.0, `${key}: ${R.crownGap(p).toFixed(2)} m from a crown`);
  // and it really is inside the woodland for a stretch
  assert.ok(R.WOODLAND_WALK.filter((p) => R.crownGap(p) < 6).length > 10);
});

test('the woodland event pulls the walk right of the plan whatever is decided; continuing reaches the road early and east of the crossing', () => {
  const offWoods = W.nearestOn(R.PLAN_B_LINE, R.STOP_AT.woods).d;
  assert.ok(offWoods > 40 && offWoods < 75, `${offWoods.toFixed(0)} m off the plan at the woodland's edge`);
  const counted = W.distW(R.STOP_AT.saddle, R.STOP_AT.woods) + W.distW(R.STOP_AT.woods, R.STOP_AT.road);
  assert.ok(counted < R.PLAN_B_LINE.length - 70, `the road after ${counted.toFixed(0)} of ${R.PLAN_B_LINE.length.toFixed(0)} m`);
  const east = R.STOP_AT.road.x - R.STOP_AT.crossing.x;
  assert.ok(east > 100 && east < 180, `${east.toFixed(0)} m east of the crossing`);
  // the corrected walks end at the crossing; the walk past the road leaves it
  assert.ok(T.surfaceAt(R.STOP_AT.beyond.x, R.STOP_AT.beyond.z).roadD > 50);
});

// ───────────────────────────────────────────── what each stop can see

const crowns = L.replayTrees().map((t) => ({ x: t.x, z: t.z, y: t.crown.centerM, r: Math.max(t.crown.radiusM, t.crown.halfHeightM) * 0.92, kind: t.kind }));
function seen(eye, p, kind) {
  const ey = T.heightAt(eye.x, eye.z) + 1.7;
  const d = W.distW(eye, p);
  for (let s = 2; s < d - 3; s += 1.5) {
    const t = s / d;
    if (ey + (p.y - ey) * t < T.heightAt(eye.x + (p.x - eye.x) * t, eye.z + (p.z - eye.z) * t) + 0.2) return false;
  }
  const [dx, dy, dz] = [p.x - eye.x, p.y - ey, p.z - eye.z];
  const len = Math.hypot(dx, dy, dz);
  for (const c of crowns) {
    if (c.kind === kind) continue;
    const ox = c.x - eye.x, oy = c.y - ey, oz = c.z - eye.z;
    const tc = (ox * dx + oy * dy + oz * dz) / len;
    if (tc < 0 || tc > len - c.r - 1) continue;
    if (ox * ox + oy * oy + oz * oz - tc * tc < c.r * c.r) return false;
  }
  return true;
}
function share(stopId, sign) {
  const eye = R.STOP_AT[stopId];
  const s = R.SIGNS[sign];
  let pts = [];
  if (sign === 'summitW' || sign === 'summitE') {
    const d = W.distW(eye, s.at);
    for (const back of [0, 20, 40, 60, 80]) for (const side of [-40, 0, 40]) {
      const ux = (eye.x - s.at.x) / d, uz = (eye.z - s.at.z) / d;
      const x = s.at.x + ux * back - uz * side, z = s.at.z + uz * back + ux * side;
      pts.push({ x, z, y: T.heightAt(x, z) + 1 });
    }
  } else if (sign === 'pines') pts = s.members.slice(0, 60).map((m) => ({ ...m, y: T.heightAt(m.x, m.z) + 9 }));
  else if (sign === 'road' || sign === 'stream') {
    const n = W.nearestOn(s.line, eye);
    for (let k = -10; k <= 10; k++) {
      const p = R.pointAlong(s.line, n.s + k * 12);
      pts.push({ ...p, y: T.heightAt(p.x, p.z) + 0.3 });
    }
  } else return null;
  return pts.filter((p) => seen(eye, p, sign === 'pines' ? 'pine' : null)).length / pts.length;
}

test('the sign each stop’s check relies on is really in sight (terrain and tree crowns), and the list matches', () => {
  const needs = { stream: ['summitW', 'stream'], road: ['summitW', 'road', 'pines'], beyond: ['summitW', 'pines'], crossing: ['road', 'pines', 'summitW'], woods: ['pines', 'road'] };
  for (const [id, signs] of Object.entries(needs))
    for (const sign of signs) {
      const f = share(id, sign);
      assert.ok(f >= 0.3, `${sign} from ${id}: ${(f * 100).toFixed(0)}% in sight`);
      assert.ok(R.STOP_SEES[id].includes(sign), `${sign} missing from the list at ${id}`);
    }
  // from the woodland's edge both summits are hidden — they must not be offered there
  for (const sign of ['summitW', 'summitE']) {
    assert.ok(share('woods', sign) < 0.1, `${sign} visible from the woods?`);
    assert.ok(!R.STOP_SEES.woods.includes(sign));
  }
  // every hint points to a sign in sight
  for (const [id, t] of Object.entries(S.STOPS)) for (const h of t.hint) assert.ok(R.STOP_SEES[id].includes(h), `hint ${h} at ${id}`);
});

// ───────────────────────────────────────────── check geometry

test('one locus is never a position; two crossing loci are — within ~15 m of where the eye stands', () => {
  const eye = R.STOP_AT.enroute;
  const line = K.locusOf('saddle', eye);
  assert.equal(line.kind, 'sight');
  assert.equal(K.evaluate([line], eye).kind, 'partial');
  const arc = { kind: 'arc', centre: R.STOP_AT.stream, r: W.distW(R.STOP_AT.stream, eye) };
  assert.equal(K.evaluate([arc], eye).kind, 'partial');
  const v = K.evaluate([line, arc], { x: eye.x + 30, z: eye.z });
  assert.equal(v.kind, 'fix');
  assert.ok(W.distW(v.at, eye) < 15, `fix ${W.distW(v.at, eye).toFixed(1)} m from the eye`);
  // the sighting carries a reading error: a check is evidence, not the true position
  assert.ok(W.distW(v.at, eye) > 0.5);
});

test('signs: a line only when stood on, an area never; the saddle is a place when stood in', () => {
  assert.equal(K.locusOf('road', R.STOP_AT.crossing).kind, 'on');
  assert.equal(K.locusOf('road', R.STOP_AT.woods), null);
  assert.equal(K.noLocusReason('road', R.STOP_AT.woods), 'far-line');
  assert.equal(K.noLocusReason('woodland', R.STOP_AT.woods), 'area');
  assert.equal(K.locusOf('saddle', R.STOP_AT.saddle).kind, 'stand');
  assert.equal(K.locusOf('saddle', R.STOP_AT.enroute).kind, 'sight');
});

test('map clicks: points before lines before areas; nothing on empty ground', () => {
  assert.equal(K.signFromMap(R.SIGNS.summitW.at), 'summitW');
  assert.equal(K.signFromMap({ x: R.SIGNS.saddle.at.x + 20, z: R.SIGNS.saddle.at.z }), 'saddle');
  assert.equal(K.signFromMap(R.STOP_AT.crossing), 'road');
  assert.equal(K.signFromMap(R.WOODLAND_OAKS[40]), 'woodland');
  assert.equal(K.signFromMap({ x: 600, z: 150 }), null);
});

test('view clicks: a point sign is recognised by direction even when the ray passes over its hidden top', () => {
  const eye = { ...R.STOP_AT.enroute, y: T.heightAt(R.STOP_AT.enroute.x, R.STOP_AT.enroute.z) + 1.7 };
  const at = R.SIGNS.saddle.at;
  const v = { x: at.x - eye.x, y: T.heightAt(at.x, at.z) + 2 - eye.y, z: at.z - eye.z };
  const n = Math.hypot(v.x, v.y, v.z);
  const dir = { x: v.x / n, y: v.y / n, z: v.z / n };
  // the ray lands far beyond the saddle
  assert.equal(K.signFromView({ eye, dir, hit: { x: at.x + dir.x * 400, y: 380, z: at.z + dir.z * 400 } }), 'saddle');
  // a click on the near ground below it is not the saddle
  assert.notEqual(K.signFromView({ eye, dir: { x: dir.x, y: -0.3, z: dir.z }, hit: { x: eye.x + dir.x * 12, y: eye.y - 2, z: eye.z + dir.z * 12 } }), 'saddle');
  assert.equal(K.signFromView({ eye, dir, hit: null, tree: 'pine' }), 'pines');
});

// ───────────────────────────────────────────── decisions and their consequences

test('the opening is a guided check: nothing moves until the position is fixed', () => {
  let s = RUN.initialRun();
  assert.equal(s.phase, 'check');
  assert.equal(RUN.nextStop(s), null);
  assert.equal(go(s, 'continue').phase, 'check', 'continuing is not available yet');
  s = go(s, view('saddle'), map('saddle'), 'commit');
  assert.equal(RUN.current(s).check.verdict.kind, 'partial', 'one line is not a fix');
  s = go(s, view('stream'), map('stream'), 'commit');
  assert.ok(RUN.current(s).fix);
  assert.equal(RUN.nextStop(s), 'enroute');
});

test('"check" by itself verifies nothing; a wrong map pick is caught and named', () => {
  let s = walk(guided());
  const before = s.know;
  s = go(s, 'check');
  assert.equal(s.know, before, 'opening a check changes nothing that is known');
  s = go(s, view(null));
  assert.equal(RUN.current(s).check.msg.kind, 'view-none');
  s = go(s, view('saddle'), map('summitE'));
  assert.deepEqual(RUN.current(s).check.msg, { kind: 'map-wrong', picked: 'summitE', want: 'saddle' });
  assert.equal(RUN.current(s).check.matched.length, 0);
  s = go(s, 'cancel-check');
  assert.equal(s.phase, 'decide');
  assert.equal(RUN.current(s).fix, null);
  // from the list, a sign that cannot be seen from here is refused
  s = go(s, 'check', list('pines'));
  assert.equal(RUN.current(s).check.msg.kind, 'view-hidden');
});

test('continuing moves the estimate by the distance counted and widens its uncertainty; the fix stays', () => {
  const a = walk(guided());
  const b = walk(a);
  assert.equal(stop(b), 'saddle');
  assert.equal(b.know.fix.stop, 'stream');
  assert.ok(b.know.counted > a.know.counted + 150);
  assert.ok(b.know.uncertainty > a.know.uncertainty);
  assert.ok(W.distW(b.know.estimate, R.STOP_AT.saddle) < 25, 'on leg A the estimate follows the truth');
  assert.match(S.arrivalText(a.know, b.know), /האומדן התקדם/);
});

test('an extra check when everything matches agrees with the estimate and is not penalised', () => {
  const s = go(walk(guided()), 'check', view('saddle'), map('saddle'), 'add-distance', 'commit');
  const v = RUN.current(s);
  assert.ok(v.fix && v.agrees, `offset ${v.offsetM}`);
  assert.equal(RUN.nextStop(s), 'saddle');
  const d = RUN.debriefOf(go(walk(walk(walk(s))), 'continue'));
  assert.ok(d.fixes.includes('enroute'));
});

test('at the saddle: stood in + distance verifies; a summit line + distance cross too shallow to fix', () => {
  const at = walk(walk(guided()));
  assert.equal(RUN.current(go(at, 'check', view('saddle'), map('saddle'), 'commit')).check.verdict.why, 'one-stand');
  const ok = go(at, 'check', view('saddle'), map('saddle'), 'add-distance', 'commit');
  assert.ok(RUN.current(ok).fix && RUN.current(ok).agrees);
  assert.equal(ok.know.fix.stop, 'saddle');
});

const atWoods = (checkSaddle = true) => {
  let s = walk(walk(guided()));
  if (checkSaddle) s = go(s, 'check', view('saddle'), map('saddle'), 'add-distance', 'commit');
  return walk(s);
};

test('a full check after the woodland finds the drift (~50 m) and corrects towards the crossing', () => {
  const s = go(atWoods(), 'check', view('pines'), map('pines'), 'add-distance', 'commit');
  const v = RUN.current(s);
  assert.ok(v.fix && !v.agrees);
  assert.ok(v.offsetM > 30 && v.offsetM < 80, `${v.offsetM}`);
  assert.ok(W.distW(v.fix.at, R.STOP_AT.woods) < 15, 'the fix is where the eye stands, within reading error');
  assert.equal(RUN.nextStop(s), 'crossing');
  assert.equal(s.know.plan.length, 2 + R.PLAN_C.length - 1, 'the new leg runs straight from the fix to the crossing');
  const done = go(walk(s), 'check', view('road'), map('road'), 'add-distance', 'commit', 'continue');
  const d = RUN.debriefOf(done);
  assert.equal(d.driftFoundAt, 'woods');
  assert.ok(d.walkedM - d.plannedM < 45);
});

test('a partial check after the woodland does not correct anything: the walk still reaches the road early', () => {
  let s = go(atWoods(), 'check', view('pines'), map('pines'), 'commit');
  assert.equal(RUN.current(s).check.verdict.kind, 'partial');
  assert.equal(RUN.nextStop(s), 'road');
  s = walk(s);
  assert.equal(stop(s), 'road');
  assert.ok(W.distW(s.know.estimate, R.STOP_AT.road) > 60, 'the estimate is far from the truth at the road');
});

test('continuing despite the mismatch: a short, limited walk past the road, then a check is required', () => {
  let s = walk(atWoods());
  assert.equal(stop(s), 'road');
  s = walk(s);
  assert.equal(stop(s), 'beyond');
  assert.equal(RUN.nextStop(s), null);
  assert.equal(RUN.canContinue(s), false);
  assert.equal(go(s, 'continue').phase, s.phase, 'no further walking from an unknown point');
  s = go(s, 'check', view('summitW'), map('summitW'), view('pines'), map('pines'), 'commit');
  assert.ok(RUN.current(s).fix && !RUN.current(s).agrees);
  assert.equal(RUN.nextStop(s), 'crossing');
  const d = RUN.debriefOf(go(walk(s), 'continue'));
  assert.equal(d.driftFoundAt, 'beyond');
  assert.ok(d.walkedM - d.plannedM > 90);
  assert.ok(!d.crossingVerified);
});

test('checking at the road finds where on the road the navigator is, then the road leads to the crossing', () => {
  const s = go(walk(atWoods()), 'check', view('summitW'), map('summitW'), view('road'), map('road'), 'commit');
  const v = RUN.current(s);
  assert.ok(v.fix && !v.agrees && v.offsetM > 60);
  assert.ok(W.distW(v.fix.at, R.STOP_AT.road) < 15);
  const d = RUN.debriefOf(go(walk(s), 'continue'));
  assert.equal(d.driftFoundAt, 'road');
  assert.ok(d.walkedM > RUN.debriefOf(go(walk(go(atWoods(), 'check', view('pines'), map('pines'), 'add-distance', 'commit')), 'continue')).walkedM, 'finding it later costs more walking');
});

test('skipping the saddle check leaves the fix behind: the woodland check measures from the stream crossing', () => {
  const s = atWoods(false);
  assert.equal(s.know.fix.stop, 'stream');
  assert.ok(s.know.uncertainty > 50);
  const c = go(s, 'check', view('pines'), map('pines'), 'add-distance', 'commit');
  assert.ok(RUN.current(c).fix);
  assert.ok(!RUN.debriefOf(go(walk(c), 'continue')).saddleVerified);
});

test('the review is read-only and cannot mark a decision that was not taken', () => {
  const s = walk(walk(guided()));
  const r = go(s, { type: 'review', index: 1 });
  assert.equal(r.review, 1);
  assert.equal(go(r, 'check'), r);
  assert.equal(go(r, 'continue'), r);
  assert.equal(go(r, { type: 'review', index: null }).review, null);
  assert.equal(RUN.current(r).decision, null, 'reviewing did not decide at the current stop');
});

// ───────────────────────────────────────────── knowledge vs truth, words

test('before the debrief, nothing tells where the navigator really is (texts and map description)', () => {
  const s = walk(atWoods());
  const words = JSON.stringify({ ...S.STOPS.road, expect: S.STOPS.road.expect(s.know) }) + S.STOPS.woods.expect(s.know);
  assert.doesNotMatch(words, /מזרחה|סטייה|בפועל/);
  for (const t of Object.values(S.STOPS)) assert.doesNotMatch(t.question + t.viewText, /בפועל|סטית/);
});

test('every check message and verdict has Hebrew feedback; the debrief differs with what was done', () => {
  for (const m of [{ kind: 'view-none' }, { kind: 'view-area', sign: 'woodland' }, { kind: 'view-far-line', sign: 'road' }, { kind: 'view-ok', sign: 'saddle' }, { kind: 'view-dup', sign: 'saddle' }, { kind: 'view-hidden', sign: 'pines' }, { kind: 'map-first' }, { kind: 'map-none' }, { kind: 'map-wrong', picked: 'summitE', want: 'summitW' }, { kind: 'map-ok', sign: 'road', locus: 'on' }, { kind: 'distance-ok' }])
    assert.match(S.msgText(m).text, /[א-ת]/);
  const early = go(walk(go(atWoods(), 'check', view('pines'), map('pines'), 'add-distance', 'commit')), 'continue');
  const late = go(walk(go(walk(walk(atWoods())), 'check', view('summitW'), map('summitW'), view('pines'), map('pines'), 'commit')), 'continue');
  assert.notEqual(S.debriefHeadline(RUN.debriefOf(early)), S.debriefHeadline(RUN.debriefOf(late)));
  assert.equal(RUN.debriefOf(early).unchecked.length, 2, 'the en-route stop and the final crossing were passed without a check');
});

// ───────────────────────────────────────────── the view and the scatter

test('the view only turns and zooms, and never changes the run', () => {
  const v = VS.createViewStore({ yawDeg: 342, pitchDeg: -3 });
  v.turn(30, 100);
  assert.equal(v.get().yawDeg, 12);
  assert.equal(v.get().pitchDeg, VS.LOOK_LIMITS.pitchMax);
  v.zoom(0.01);
  assert.equal(v.get().vfovDeg, VS.LOOK_LIMITS.vfovMin);
  v.goTo('home', true);
  assert.deepEqual(v.get(), { yawDeg: 342, pitchDeg: -3, vfovDeg: VS.DEFAULT_VFOV });
  assert.ok(!('look' in RUN.initialRun()));
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
  assert.ok(shared > 50);
  for (const i of a) assert.ok(T.surfaceAt(i.x, i.z).roadD >= 4.5, 'a shrub on the road');
});
