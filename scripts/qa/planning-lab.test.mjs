// Geometric and behavioural tests for the lesson-6 planning lab („לפני שיוצאים: מה צריך לתכנן?”,
// src/components/lessons/topic-06/planning-lab). They prove the world, the measurements and the
// editing on the modules themselves — screenshots are not a substitute for them.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/planning-lab.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const base = '../../src/components/lessons/topic-06/planning-lab/';
const W = await import(base + 'planningLabWorld.ts');
const T = await import(base + 'planningLabTerrain.ts');
const P = await import(base + 'planningLabPlan.ts');
const S = await import(base + 'planningLabState.ts');
const V = await import(base + 'planningLabView.ts');

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const pts = (nodes) => nodes.map((n) => ({ E: n.E, N: n.N }));
const run = (actions, s = S.INITIAL_STATE) => actions.reduce(S.reducer, s);

// ---------------------------------------------------------------- the world

test('the ridge: two summits, the saddle lower than both and the highest point across the crest', () => {
  const w = T.summitOf('peak-west');
  const e = T.summitOf('peak-east');
  const sd = T.saddle();
  assert.ok(w.heightM > e.heightM + 10, 'the western summit is the higher one');
  assert.ok(sd.heightM < e.heightM - 30, `the saddle is clearly lower than the lower summit (${sd.heightM} vs ${e.heightM})`);
  // the saddle lies between the summits
  const t = ((sd.E - w.E) * (e.E - w.E) + (sd.N - w.N) * (e.N - w.N)) / ((e.E - w.E) ** 2 + (e.N - w.N) ** 2);
  assert.ok(t > 0.3 && t < 0.8, `saddle between the summits (t = ${t})`);
  // highest across the crest: the ground falls to both sides
  const ux = (e.E - w.E) / Math.hypot(e.E - w.E, e.N - w.N);
  const uy = (e.N - w.N) / Math.hypot(e.E - w.E, e.N - w.N);
  for (const side of [-1, 1]) assert.ok(T.heightAt(sd.E - uy * 80 * side, sd.N + ux * 80 * side) < sd.heightM - 5, 'falls across the crest');
  // lowest along it: the ground rises toward both summits
  for (const toward of [w, e]) {
    const d = Math.hypot(toward.E - sd.E, toward.N - sd.N);
    assert.ok(T.heightAt(sd.E + ((toward.E - sd.E) * 60) / d, sd.N + ((toward.N - sd.N) * 60) / d) > sd.heightM, 'rises along the crest');
  }
});

test('the straight line A → B passes over the western summit', () => {
  const w = T.summitOf('peak-west');
  const c = P.closestOnPath(w, [W.START, W.DEST]);
  assert.ok(c.d < 40, `the line passes ${c.d.toFixed(1)} m from the summit`);
  assert.equal(P.directLine().assessment.crossing, 'peak-west');
});

test('real height differences: more than 90 m from the valleys to the western summit', () => {
  const w = T.summitOf('peak-west');
  assert.ok(w.heightM - T.heightAt(W.START.E, W.START.N) > 90);
  assert.ok(w.heightM - T.heightAt(W.DEST.E, W.DEST.N) > 80);
});

test('water lies in its valley: the beds never rise downstream, the stream is below its banks', () => {
  const { stream, ravine } = T.waterCourses();
  for (const c of [stream, ravine]) for (let i = 1; i < c.bed.length; i++) assert.ok(c.bed[i] <= c.bed[i - 1] + 1e-9, `${c.id} bed rises at ${i}`);
  for (let i = 10; i < stream.pts.length - 10; i += 25) {
    const [E, N] = stream.pts[i];
    const h = T.heightAt(E, N);
    assert.ok(T.heightAt(E, N + 60) > h + 1 && T.heightAt(E, N - 60) > h + 1, `stream at ${E.toFixed(0)},${N.toFixed(0)} lies in a valley`);
  }
  // the ravine climbs from the stream to the saddle
  assert.ok(ravine.bed[0] > ravine.bed[ravine.bed.length - 1] + 40, 'the ravine falls toward the stream');
  const head = ravine.pts[0];
  assert.ok(Math.hypot(head[0] - T.saddle().E, head[1] - T.saddle().N) < 70, 'the ravine starts under the saddle');
});

test('heightAt interpolates on the mesh triangles: exact at the grid samples', () => {
  const g = T.heightGrid();
  for (const [i, j] of [[0, 0], [37, 91], [120, 140], [200, 240]]) close(T.heightAt(i * 5, j * 5), g[j * T.GRID.nE + i], 1e-9);
  // inside a cell it lies on the SW–NE split: the diagonal midpoint is the mean of the two diagonal corners
  const i = 60;
  const j = 70;
  close(T.heightAt(i * 5 + 2.5, j * 5 + 2.5), (g[j * T.GRID.nE + i] + g[(j + 1) * T.GRID.nE + i + 1]) / 2, 1e-9);
});

test('contours are the mesh iso-lines: every vertex lies on a mesh edge at its level', () => {
  const levels = T.contours();
  assert.ok(levels.length >= 10, 'a 10 m interval over the relief');
  for (const lv of levels) {
    for (const line of lv.lines) {
      for (let k = 0; k < line.pts.length; k += 7) {
        const [E, N] = line.pts[k];
        close(T.heightAt(E, N), lv.heightM, 1e-6, `level ${lv.heightM}`);
      }
    }
  }
  assert.ok(levels.every((l) => l.index === (l.heightM % W.INDEX_INTERVAL_M === 0)));
});

test('the mesh vertices on the sheet are the grid samples', () => {
  const M = T.terrainMeshArrays((E, N, h) => [E, h, N]);
  const g = T.heightGrid();
  let checked = 0;
  for (let j = 0; j < M.ny; j += 13) {
    for (let i = 0; i < M.nx; i += 11) {
      const E = M.xs[i];
      const N = M.ns[j];
      if (!T.insideSheet(E, N)) continue;
      close(M.positions[(j * M.nx + i) * 3 + 1], g[Math.round(N / 5) * T.GRID.nE + Math.round(E / 5)], 1e-3);
      checked++;
    }
  }
  assert.ok(checked > 100);
});

test('cover: A by the building, B in the grove on the rocks, trees on their ground', () => {
  assert.ok(Math.hypot(W.START.E - W.BUILDING.E, W.START.N - W.BUILDING.N) < 60, 'A is beside the building');
  assert.ok(P.passOf('grove', [W.DEST, W.DEST]) !== null || P.standsOn('grove', W.DEST), 'B is in the grove');
  assert.ok(P.standsOn('rocks', W.DEST), 'B is on the rocks');
  const trees = T.trees();
  // a planted grove: ≥ 100 trees per hectare inside its ring, several times the open woodland's density
  const area = (ring) => Math.abs(ring.reduce((s, p, i) => s + (ring[(i + ring.length - 1) % ring.length][0] + p[0]) * (ring[(i + ring.length - 1) % ring.length][1] - p[1]), 0) / 2);
  const groveHa = trees.filter((t) => t.group === 'grove').length / (area(W.GROVE) / 1e4);
  const woodHa = trees.filter((t) => t.group === 'woodland').length / (W.WOODLAND.reduce((s, w) => s + area(w.ring), 0) / 1e4);
  assert.ok(groveHa >= 100 && groveHa > woodHa * 3, `a dense grove (${groveHa.toFixed(0)} vs woodland ${woodHa.toFixed(0)} per ha)`);
  for (const t of trees.slice(0, 400)) close(t.baseM, T.heightAt(t.E, t.N), 1e-9);
  assert.ok(T.boulders().filter((b) => b.atB).length > 10, 'the rocks at B');
  // deterministic: the same lists every time
  assert.equal(T.trees(), T.trees());
});

// ---------------------------------------------------------------- measurements

test('distance is horizontal; bearing is clockwise from the map north', () => {
  const o = { E: 500, N: 500 };
  close(P.distance(o, { E: 530, N: 540 }), 50, 1e-12);
  assert.equal(P.bearing(o, { E: 500, N: 600 }), 0);
  assert.equal(P.bearing(o, { E: 600, N: 500 }), 90);
  assert.equal(P.bearing(o, { E: 400, N: 500 }), 270);
  assert.equal(P.bearing(o, o), null);
  // a leg's distance ignores the climb: the map measure
  const legs = P.legsOf([W.START, T.summitOf('peak-west')]);
  close(legs[0].distanceM, Math.hypot(T.summitOf('peak-west').E - W.START.E, T.summitOf('peak-west').N - W.START.N), 1e-9);
  assert.ok(legs[0].toH - legs[0].fromH > 90, 'the height change is reported separately');
});

test('the profile: horizontal length equals the map length; climb and descent from the ground', () => {
  const route = [W.START, T.saddle(), W.DEST];
  const pr = P.profile(route);
  close(pr.lengthM, P.pathLength(route), 1e-9);
  close(pr.samples[0].h, T.heightAt(W.START.E, W.START.N), 1e-9);
  close(pr.samples.at(-1).h, T.heightAt(W.DEST.E, W.DEST.N), 1e-9);
  // climb − descent = end height − start height
  close(pr.climbM - pr.descentM, pr.samples.at(-1).h - pr.samples[0].h, 1e-6);
  assert.ok(pr.samples.every((s, i) => i === 0 || s.s - pr.samples[i - 1].s <= 5 + 1e-9));
});

test('via the saddle vs over the summit: longer, lower, less climb — read from the ground', () => {
  const direct = P.directLine().assessment;
  const via = P.assess([W.START, T.saddle(), W.DEST]);
  assert.equal(via.crossing, 'saddle');
  assert.ok(via.profile.lengthM > direct.profile.lengthM, 'the saddle route is longer');
  assert.ok(via.profile.maxH < direct.profile.maxH - 40, 'and its highest point is much lower');
  assert.ok(via.profile.climbM < direct.profile.climbM - 30, 'with less climb');
});

test('the assessment follows the geometry, not a button: moving the point off the saddle changes it', () => {
  const sd = T.saddle();
  assert.equal(P.assess([W.START, sd, W.DEST]).crossing, 'saddle');
  // up the eastern summit
  assert.equal(P.assess([W.START, T.summitOf('peak-east'), W.DEST]).crossing, 'peak-east');
  // 150 m up the flank of the western summit from the saddle: over the crest, not at the saddle
  const w = T.summitOf('peak-west');
  const d = Math.hypot(w.E - sd.E, w.N - sd.N);
  const flank = { E: sd.E + ((w.E - sd.E) * 120) / d, N: sd.N + ((w.N - sd.N) * 120) / d };
  const a = P.assess([W.START, flank, W.DEST]);
  assert.notEqual(a.crossing, 'saddle');
  assert.ok(a.profile.maxH > sd.heightM + 4);
  // far east, around the ridge's end
  assert.equal(P.assess([W.START, { E: 985, N: 300 }, { E: 985, N: 1000 }, W.DEST]).crossing !== 'saddle', true);
});

test('pass detection: crossings in order along the route, areas where they are entered', () => {
  const route = [W.START, T.saddle(), W.DEST];
  const stream = P.passOf('stream', route);
  const road = P.passOf('road', route);
  assert.ok(stream && road && stream.s < road.s, 'the stream comes before the road');
  assert.ok(P.standsOn('stream', stream.at) && P.standsOn('road', road.at));
  assert.equal(P.passOf('peak-east', route), null);
  assert.equal(P.passOf('orchard', route), null);
  const grove = P.passOf('grove', route);
  assert.ok(grove && grove.s > road.s, 'the grove is entered after the road');
});

test('picking: a click on a feature picks it; the empty slope picks nothing', () => {
  assert.equal(P.pickFeature(T.saddle()), 'saddle');
  assert.equal(P.pickFeature(T.summitOf('peak-east')), 'peak-east');
  assert.equal(P.pickFeature(W.DEST), 'rocks');
  const r = T.roadOf('road').pts[200];
  assert.equal(P.pickFeature({ E: r[0], N: r[1] }), 'road');
  assert.equal(P.pickFeature({ E: 560, N: 470 }), null);
});

// ---------------------------------------------------------------- editing

test('opening: A, one route point on the straight line, B — editable from the start', () => {
  const s = S.INITIAL_STATE;
  assert.deepEqual(s.nodes.map((n) => n.kind), ['start', 'way', 'end']);
  assert.equal(s.tool, 'route');
  close(P.closestOnSegment(s.nodes[1], W.START, W.DEST).d, 0, 1e-9);
  assert.equal(P.assess(pts(s.nodes)).crossing, 'peak-west');
});

test('a click adds a route point into the leg it detours least; the route stays A … B', () => {
  let s = run([{ type: 'add', at: { E: 720, N: 380 } }]);
  assert.deepEqual(s.nodes.map((n) => n.kind), ['start', 'way', 'way', 'end']);
  assert.equal(s.nodes[1].E, 720, 'between A and the old point');
  s = run([{ type: 'add', at: { E: 260, N: 960 } }], s);
  assert.equal(s.nodes.at(-2).E, 260, 'between the old point and B');
  assert.equal(s.nodes[0].id, 'A');
  assert.equal(s.nodes.at(-1).id, 'B');
  assert.deepEqual(s.selection, { kind: 'node', id: s.nodes.at(-2).id }, 'the new point is selected');
});

test('dragging moves one point and changes the measurements; A and B do not move; one undo step per drag', () => {
  const before = P.pathLength(pts(S.INITIAL_STATE.nodes));
  const sd = T.saddle();
  let s = run([{ type: 'dragStart', id: 'p1' }, { type: 'drag', id: 'p1', at: { E: 600, N: 600 } }, { type: 'drag', id: 'p1', at: { E: sd.E, N: sd.N } }, { type: 'dragEnd' }]);
  assert.equal(s.past.length, 1, 'one undo step for the whole drag');
  assert.ok(P.pathLength(pts(s.nodes)) > before);
  assert.equal(P.assess(pts(s.nodes)).crossing, 'saddle');
  s = run([{ type: 'dragStart', id: 'A' }, { type: 'drag', id: 'A', at: { E: 100, N: 100 } }, { type: 'dragEnd' }], s);
  assert.deepEqual(pts([s.nodes[0]]), [W.START], 'A is an identified place: it stays');
  s = run([{ type: 'undo' }], s);
  assert.deepEqual(pts(s.nodes), pts(S.INITIAL_STATE.nodes));
  // a press without a move leaves no undo step
  const t = run([{ type: 'dragStart', id: 'p1' }, { type: 'dragEnd' }]);
  assert.equal(t.past.length, 0);
});

test('points stay on the sheet and apart from their neighbours', () => {
  const s = run([{ type: 'dragStart', id: 'p1' }, { type: 'drag', id: 'p1', at: { E: -500, N: 5000 } }, { type: 'dragEnd' }]);
  const p = s.nodes[1];
  assert.ok(p.E >= W.WORLD.minE && p.N <= W.WORLD.maxN);
  const t = run([{ type: 'dragStart', id: 'p1' }, { type: 'drag', id: 'p1', at: { E: W.START.E + 2, N: W.START.N + 2 } }, { type: 'dragEnd' }]);
  assert.ok(P.distance(t.nodes[1], W.START) >= S.MIN_GAP_M, 'a point never lands on its neighbour');
});

test('keyboard nudges: 10 m steps in map directions, a run of them is one undo step', () => {
  const s = run([
    { type: 'nudge', id: 'p1', dE: 10, dN: 0 },
    { type: 'nudge', id: 'p1', dE: 10, dN: 0 },
    { type: 'nudge', id: 'p1', dE: 0, dN: -10 },
  ]);
  close(s.nodes[1].E, W.OPENING_WAYPOINT.E + 20, 1e-9);
  close(s.nodes[1].N, W.OPENING_WAYPOINT.N - 10, 1e-9);
  assert.equal(s.past.length, 1);
  assert.deepEqual(pts(run([{ type: 'undo' }], s).nodes), pts(S.INITIAL_STATE.nodes));
});

test('delete removes a route point (not A or B); undo brings it back', () => {
  let s = run([{ type: 'remove', id: 'p1' }]);
  assert.deepEqual(s.nodes.map((n) => n.id), ['A', 'B']);
  s = run([{ type: 'remove', id: 'A' }], s);
  assert.deepEqual(s.nodes.map((n) => n.id), ['A', 'B']);
  s = run([{ type: 'undo' }], s);
  assert.deepEqual(s.nodes.map((n) => n.id), ['A', 'p1', 'B']);
});

test('a checkpoint splits a leg where the route already passes the feature: the path does not move', () => {
  const sd = T.saddle();
  let s = run([{ type: 'dragStart', id: 'p1' }, { type: 'drag', id: 'p1', at: { E: sd.E, N: sd.N } }, { type: 'dragEnd' }]);
  const route = pts(s.nodes);
  const len = P.pathLength(route);
  s = run([{ type: 'addCheck', feature: 'road' }], s);
  const check = s.nodes.find((n) => n.kind === 'check');
  assert.ok(check && check.feature === 'road');
  close(P.pathLength(pts(s.nodes)), len, 1e-6, 'same length');
  close(P.closestOnPath(check, route).d, 0, 1e-6, 'the checkpoint lies on the old route');
  // the same path: every point along the new route is the old route's point at that distance
  for (let d = 0; d <= len; d += 37) {
    const a = P.pointAt(route, d);
    const b = P.pointAt(pts(s.nodes), d);
    close(P.distance(a, b), 0, 1e-6, `at ${d} m`);
  }
  // the route point already at the saddle becomes the saddle checkpoint (no new point)
  const n = s.nodes.length;
  s = run([{ type: 'addCheck', feature: 'saddle' }], s);
  assert.equal(s.nodes.length, n);
  assert.equal(s.nodes.find((x) => x.id === 'p1').kind, 'check');
});

test('checkpoints are numbered by their place along the route, not by the order they were added', () => {
  const sd = T.saddle();
  let s = run([{ type: 'dragStart', id: 'p1' }, { type: 'drag', id: 'p1', at: { E: sd.E, N: sd.N } }, { type: 'dragEnd' }]);
  s = run([{ type: 'addCheck', feature: 'road' }, { type: 'addCheck', feature: 'stream' }], s);
  const order = S.checkpointsInOrder(s.nodes).map((c) => c.node.feature);
  assert.deepEqual(order, ['stream', 'road']);
});

test('a feature the route does not pass gives a reason, not a checkpoint; A and B are already identified', () => {
  let s = run([{ type: 'addCheck', feature: 'peak-east' }]);
  assert.equal(s.notice.kind, 'not-on-route');
  assert.equal(s.nodes.length, 3);
  s = run([{ type: 'addCheck', feature: 'building' }], s);
  assert.equal(s.notice.kind, 'is-end');
  s = run([{ type: 'addCheck', feature: 'stream' }, { type: 'addCheck', feature: 'stream' }], s);
  assert.equal(s.notice.kind, 'already');
  assert.equal(s.nodes.filter((n) => n.kind === 'check').length, 1);
});

test('removing a checkpoint keeps the path: a point that only split a leg goes, one that bends it stays', () => {
  let s = run([{ type: 'addCheck', feature: 'stream' }]);
  const id = s.nodes.find((n) => n.kind === 'check').id;
  const len = P.pathLength(pts(s.nodes));
  s = run([{ type: 'unCheck', id }], s);
  assert.equal(s.nodes.length, 3, 'the split point goes');
  close(P.pathLength(pts(s.nodes)), len, 1e-6);
  const sd = T.saddle();
  s = run([{ type: 'dragStart', id: 'p1' }, { type: 'drag', id: 'p1', at: { E: sd.E, N: sd.N } }, { type: 'dragEnd' }, { type: 'addCheck', feature: 'saddle' }, { type: 'unCheck', id: 'p1' }]);
  assert.equal(s.nodes.find((n) => n.id === 'p1').kind, 'way', 'the bend stays as a route point');
});

test('switching tools and the straight line keep the route and the selection', () => {
  let s = run([{ type: 'add', at: { E: 700, N: 400 } }]);
  const nodes = s.nodes;
  const sel = s.selection;
  s = run([{ type: 'tool', tool: 'checks' }, { type: 'toggleDirect' }, { type: 'tool', tool: 'identify' }, { type: 'tool', tool: 'route' }], s);
  assert.equal(s.nodes, nodes);
  assert.deepEqual(s.selection, sel);
  assert.equal(s.showDirect, true);
});

test('the example plan crosses at the saddle with three checkpoints in order; undo returns the learner’s route', () => {
  let s = run([{ type: 'add', at: { E: 300, N: 900 } }]);
  const mine = pts(s.nodes);
  s = run([{ type: 'example' }], s);
  assert.equal(P.assess(pts(s.nodes)).crossing, 'saddle');
  assert.deepEqual(S.checkpointsInOrder(s.nodes).map((c) => c.node.feature), ['stream', 'saddle', 'road']);
  for (const c of S.checkpointsInOrder(s.nodes)) assert.ok(P.standsOn(c.node.feature, c.node), `${c.node.feature} stands on its feature`);
  s = run([{ type: 'undo' }], s);
  assert.deepEqual(pts(s.nodes), mine);
});

test('reset returns to the opening route and can itself be undone', () => {
  let s = run([{ type: 'add', at: { E: 700, N: 400 } }, { type: 'toggleDirect' }, { type: 'reset' }]);
  assert.deepEqual(pts(s.nodes), pts(S.OPENING_NODES));
  assert.equal(s.selection, null);
  s = run([{ type: 'undo' }], s);
  assert.equal(s.nodes.length, 4);
});

// ---------------------------------------------------------------- 3D frame

test('3D frame: x = E, y = height, z = −N, one scale, no vertical exaggeration', () => {
  const a = V.toWorld3(500, 600, 400);
  const b = V.toWorld3(600, 600, 400);
  const c = V.toWorld3(500, 700, 400);
  const d = V.toWorld3(500, 600, 500);
  close(b[0] - a[0], 100 / V.WORLD3D.metresPerUnit, 1e-12);
  close(c[2] - a[2], -100 / V.WORLD3D.metresPerUnit, 1e-12);
  close(d[1] - a[1], 100 / V.WORLD3D.metresPerUnit, 1e-12);
  const back = V.fromWorld3(...a);
  close(back.E, 500, 1e-9);
  close(back.N, 600, 1e-9);
  close(back.heightM, 400, 1e-9);
});

test('map frame: north up, 1 unit = 1 m, round trip', () => {
  assert.deepEqual(V.worldToMap({ E: 0, N: 0 }), { x: 0, y: W.WORLD.maxN });
  const p = { E: 333.3, N: 777.7 };
  const m = V.worldToMap(p);
  const q = V.mapToWorld(m.x, m.y);
  close(q.E, p.E, 1e-9);
  close(q.N, p.N, 1e-9);
});

// ---------------------------------------------------------------- the model's polish: hidden points, ground tone, highlight edge

test('a route point behind the ridge is hidden from a low eye; the same point from above, or on the near slope, is not', () => {
  const w = T.summitOf('peak-west');
  const eye = { E: 300, N: 205, heightM: 455 }; // low, south-west of the western summit
  const behind = { E: 430, N: 860 };
  assert.ok(T.behindGround(eye, behind.E, behind.N, T.heightAt(behind.E, behind.N) + 2.4), 'north of the summit: hidden');
  // the sight line really passes under the summit's top
  const t = (w.N - eye.N) / (behind.N - eye.N);
  assert.ok(eye.heightM + (T.heightAt(behind.E, behind.N) - eye.heightM) * t < w.heightM, 'the summit stands in the way');
  const high = { E: 430, N: 200, heightM: 2400 };
  assert.ok(!T.behindGround(high, behind.E, behind.N, T.heightAt(behind.E, behind.N) + 2.4), 'from high above: in sight');
  const near = { E: 420, N: 470 };
  assert.ok(!T.behindGround(eye, near.E, near.N, T.heightAt(near.E, near.N) + 2.4), 'on the near slope: in sight');
  // straight down onto a point, and a point on its own steep slope, are never hidden by that slope
  assert.ok(!T.behindGround({ E: w.E, N: w.N - 3, heightM: w.heightM + 1500 }, w.E, w.N - 3, w.heightM));
  for (const [E, N] of [[445, 560], [445, 760], [360, 655], [540, 655]]) {
    const h = T.heightAt(E, N) + 2.4;
    assert.ok(!T.behindGround({ E: E + 0.5, N: N + 0.5, heightM: h + 900 }, E, N, h), `from above at (${E}, ${N})`);
  }
});

test('ground tone: the scrub under the model is the chance the shrubs are drawn from; relief is high on summits, low in the hollows', async () => {
  const g = T.toneGrid();
  const at = (E, N) => (Math.floor((N - T.TONE.minN) / T.TONE.stepM) * T.TONE.nE + Math.floor((E - T.TONE.minE) / T.TONE.stepM));
  for (const k of [0, 1234, 9876, 20000]) {
    const i = k % T.TONE.nE;
    const j = Math.floor(k / T.TONE.nE);
    const p = { E: T.TONE.minE + (i + 0.5) * T.TONE.stepM, N: T.TONE.minN + (j + 0.5) * T.TONE.stepM };
    close(g.scrub[k], T.scrubCover(p), 1e-6, 'scrub sample');
    close(g.height[k], T.heightAt(p.E, p.N), 1e-3, 'height sample');
  }
  // the shrubs stand where the scrub tone is dense: their mean cover is well above the sheet's
  const sh = T.shrubs().filter((s) => T.insideSheet(s.E, s.N));
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const underShrubs = mean(sh.map((s) => g.scrub[at(s.E, s.N)]));
  const sheet = [];
  for (let N = 5; N < 1200; N += 10) for (let E = 5; E < 1000; E += 10) sheet.push(g.scrub[at(E, N)]);
  assert.ok(underShrubs > mean(sheet) + 0.08, `shrubs where the tone is scrub (${underShrubs.toFixed(2)} vs ${mean(sheet).toFixed(2)})`);
  // no scrub tone in the grove (its own floor) or the orchard
  assert.equal(T.scrubCover(W.DEST), 0);
  // relief in the tone map: the summits read as crests, the saddle well below them
  const M = await import(base + 'planningLabMaterials.ts');
  const { data, width } = M.buildToneTexture().image;
  assert.equal(width, T.TONE.nE);
  const relief = (E, N) => data[at(E, N) * 4] / 255 - 0.5;
  for (const s of T.summits()) assert.ok(relief(s.E, s.N) > 0.3, `${s.id} reads as a crest`);
  const sd = T.saddle();
  assert.ok(relief(sd.E, sd.N) < relief(T.summitOf('peak-east').E, T.summitOf('peak-east').N), 'the saddle lower in tone than the summits');
});

test('highlight edge: the smooth mask keeps to the id map — its 0.5 line never strays more than one texel (2 m) from the feature', async () => {
  const M = await import(base + 'planningLabMaterials.ts');
  const ids = M.buildFeatureIdTexture();
  const { data: id, width: w, height: h } = ids.image;
  const hl = M.createHighlightMask(ids);
  const mask = hl.texture.image.data;
  assert.ok(mask.every((v) => v === 0), 'nothing lit: an empty mask');
  for (const f of ['saddle', 'grove', 'stream', 'road']) {
    const v = M.FEATURE_INDEX[f];
    hl.update([v]);
    let inside = 0;
    let lost = 0;
    let spill = 0;
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const k = j * w + i;
        const near = (d) => [-d, 0, d].some((dj) => [-d, 0, d].some((di) => id[k + dj * w + di] === v));
        const all = (d) => [-d, 0, d].every((dj) => [-d, 0, d].every((di) => id[k + dj * w + di] === v));
        if (mask[k] >= 128 && !near(1)) spill++;
        if (id[k] === v && all(1)) {
          inside++;
          if (mask[k] < 128) lost++;
        }
      }
    }
    assert.ok(inside > 20, `${f}: has an inside`);
    assert.equal(spill, 0, `${f}: the lit edge spills onto the ground next to it`);
    assert.equal(lost, 0, `${f}: the feature's inside is lit`);
  }
});
