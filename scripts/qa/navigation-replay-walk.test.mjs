// Walking and world preparation of the navigation decision exercise: the eye follows each fixed segment by arc
// length and arrives exactly at the next stop; preparation is bounded, deduplicated and cancellable; both worlds
// detail every walked path, and the ground under the eye is the rendered surface all along.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/navigation-replay-walk.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
const base = '../../src/components/lessons/topic-06/navigation-replay/';
const W = await import(base + 'replayWorld.ts');
const R = await import(base + 'replayRoute.ts');
const S = await import(base + 'replayScenario.ts');
const M = await import(base + 'replayWalk.ts');
const C = await import(base + 'replayBuildCache.ts');
const SC = await import(base + 'replayScatter.ts');
const TM = await import(base + 'scene/terrainMesh.ts');
const T = await import(base + 'replayTerrain.ts');
const P = await import(base + 'replayPreparation.ts');
const THREE = await import('three');

const plan = (key) => {
  const [a, b] = key.split('>');
  return M.walkPlan(a, b, R.SEGMENTS[key]);
};

test('every walk follows its segment by arc length and arrives at the exact next stop', () => {
  for (const key of Object.keys(R.SEGMENTS)) {
    const p = plan(key);
    const [a, b] = key.split('>');
    assert.ok(W.distW(M.sampleWalk(p, 0).at, R.STOP_AT[a]) < 1e-8, `${key} start`);
    assert.ok(W.distW(M.sampleWalk(p, 1).at, R.STOP_AT[b]) < 1e-8, `${key} end`);
    let length = 0;
    let last = M.sampleWalk(p, 0).at;
    for (let i = 1; i <= 1000; i++) {
      const at = M.sampleWalk(p, i / 1000).at;
      length += W.distW(last, at);
      last = at;
    }
    assert.ok(Math.abs(length - p.route.length) < 0.2, `${key} length`);
    assert.ok(p.durationMs >= 2800 && p.durationMs <= 7000);
  }
});

test('the walking heading turns smoothly through the woodland weave', () => {
  const p = plan('saddle>woods');
  let worst = 0;
  let prev = M.sampleWalk(p, 0).yawDeg;
  for (let i = 1; i <= 400; i++) {
    const y = M.sampleWalk(p, i / 400).yawDeg;
    worst = Math.max(worst, Math.abs(W.turnDeg(prev, y)));
    prev = y;
  }
  assert.ok(worst < 12, `a ${worst.toFixed(1)}° jerk between frames`);
});

test('walking clock pauses during preparation, clamps background-tab gaps and can be cancelled', () => {
  const s = M.createWalkStore();
  s.start(plan('enroute>saddle'), S.STOPS.enroute.view);
  s.step(1000);
  assert.equal(s.get().progress, 0);
  s.ready();
  s.step(1000);
  assert.ok(s.get().progress < 0.03, 'a hidden tab cannot teleport the eye');
  s.cancel();
  s.step(1000);
  assert.equal(s.get().phase, 'idle');
});

test('skip arrives once; late preparation cannot resurrect a cancelled walk; the arrival look is the stop’s', () => {
  const s = M.createWalkStore();
  s.start(plan('stream>enroute'), S.STOPS.stream.view);
  const id = s.get().id;
  s.skip();
  assert.equal(s.get().phase, 'arrived');
  const pose = s.pose();
  assert.ok(Math.abs(W.turnDeg(pose.yawDeg, S.STOPS.enroute.view.yawDeg)) < 1e-6);
  s.cancel();
  s.ready(id);
  assert.equal(s.get().phase, 'idle');
});

test('preparation deduplicates concurrent requests and disposes late results after unmount', async () => {
  let builds = 0;
  let disposed = 0;
  let release;
  const c = C.createBuildCache(async (key, signal) => {
    builds++;
    await new Promise((r) => (release = r));
    return { key, signal };
  }, () => disposed++);
  const a = c.get('legB');
  const b = c.get('legB');
  assert.equal(a, b);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(builds, 1);
  c.dispose();
  release();
  await assert.rejects(a);
  assert.equal(disposed, 1);
});

test('only the three worlds can be cached, regardless of repeated visits', async () => {
  let disposed = 0;
  const c = C.createBuildCache(async (key) => ({ key }), () => disposed++);
  for (let i = 0; i < 10; i++) for (const key of ['start', 'legA', 'legB']) await c.get(key);
  assert.equal(c.size, 3);
  await assert.rejects(c.get('approach'));
  c.dispose();
  assert.equal(disposed, 3);
});

test('every stop belongs to a world that covers it; the saddle is inside both', () => {
  for (const [id, at] of Object.entries(R.STOP_AT)) {
    const b = P.worldBounds(R.worldOfStop(id));
    assert.ok(W.distW(b.center, at) < b.radius, `${id} outside its world`);
  }
  const b = P.worldBounds('legB');
  assert.ok(W.distW(b.center, R.STOP_AT.saddle) < b.radius - 30, 'the walk leaves the saddle inside leg B’s world');
});

test('corridor scatter reaches every part of every walk and yields to input', async () => {
  let turns = 0;
  const clock = setInterval(() => turns++, 0);
  const ground = { height: () => 100, road: () => 100, stream: () => 100 };
  try {
    for (const key of ['legA', 'legB']) {
      const center = P.worldBounds(key).center;
      const path = P.simplify(P.corridorLine(key));
      const list = await SC.scatterAsync('grass', center.x, center.z, ground, { far: 24, path, clearancePath: P.CLEARANCE });
      for (const pts of P.WORLD_PATHS[key])
        for (let t = 0; t <= 1; t += 0.1) {
          const at = R.pointAlong(W.polyline(pts), W.polyline(pts).length * t);
          assert.ok(list.some((p) => W.distW(p, at) < 12), `${key}: no grass near ${at.x.toFixed(0)},${at.z.toFixed(0)}`);
        }
      assert.ok(list.length < 90000, `${key}: corridor is bounded (${list.length})`);
    }
    assert.ok(turns > 0, 'background work yields');
  } finally {
    clearInterval(clock);
  }
});

test('nearby vegetation keeps its place and size when the world is swapped at the start and at the saddle', () => {
  const ground0 = { height: T.groundAt, road: (x, z) => T.surfaceAt(x, z).roadD, stream: (x, z) => T.surfaceAt(x, z).streamD };
  const s = R.STOP_AT.stream;
  const first = SC.scatter('shrub', s.x, s.z, ground0, { far: 240, clearancePath: P.CLEARANCE }).filter((p) => W.distW(s, p) < 120);
  const ca = P.worldBounds('legA').center;
  const corridor = new Map(SC.scatter('shrub', ca.x, ca.z, ground0, { far: 240, path: P.simplify(P.corridorLine('legA')), clearancePath: P.CLEARANCE }).map((p) => [`${p.x},${p.z}`, p]));
  for (const p of first) {
    const q = corridor.get(`${p.x},${p.z}`);
    assert.ok(q, `shrub ${p.x},${p.z} near the start disappears with the swap`);
    assert.equal(p.scale, q.scale);
  }
  const at = R.STOP_AT.saddle;
  const ground = { height: T.groundAt, road: (x, z) => T.surfaceAt(x, z).roadD, stream: (x, z) => T.surfaceAt(x, z).streamD };
  const key = (p) => `${p.x},${p.z}`;
  const inWorld = (k) => {
    const c = P.worldBounds(k).center;
    return new Map(SC.scatter('shrub', c.x, c.z, ground, { far: 240, path: P.simplify(P.corridorLine(k)), clearancePath: P.CLEARANCE }).map((p) => [key(p), p]));
  };
  const a = inWorld('legA');
  const b = inWorld('legB');
  let compared = 0;
  for (const [k, p] of a) {
    if (W.distW(at, p) > 60) continue;
    const q = b.get(k);
    assert.ok(q, `shrub ${k} near the saddle disappears with the swap`);
    assert.equal(p.scale, q.scale, 'same shrub, same size');
    compared++;
  }
  assert.ok(compared > 20, `${compared} shrubs compared`);
});

test('walking terrain covers the full horizon and keeps fine detail over leg B’s corridor; cancels cleanly', async () => {
  const { center, radius } = P.worldBounds('legB');
  const ground = { height: (x, z) => 100 + 0.01 * x + 0.02 * z, road: () => 100, stream: () => 100 };
  const g = await TM.buildTerrainGeometryAsync(ground, center.x, center.z, radius);
  assert.ok(g.index.count / 3 < 1600000, 'bounded mesh budget');
  const pos = g.attributes.position;
  let near = 0;
  let max = 0;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    if (r < radius) near++;
    max = Math.max(max, r);
  }
  assert.ok(near > 70000);
  assert.ok(max > 15999);
  g.dispose();
  const ac = new AbortController();
  ac.abort();
  await assert.rejects(TM.buildTerrainGeometryAsync(ground, 0, 0, 100, ac.signal));
});

test('the rendered surface stays under the eye along every walk of both worlds', async () => {
  const cache = P.createReplayPreparation();
  const material = new THREE.MeshBasicMaterial();
  try {
    for (const k of ['legA', 'legB']) {
      const world = await cache.get(k);
      const mesh = new THREE.Mesh(world.geometry, material);
      mesh.position.set(world.anchor.x, 0, world.anchor.z);
      mesh.updateMatrixWorld();
      for (const key of Object.keys(R.SEGMENTS).filter((s) => R.worldOfStop(s.split('>')[1]) === k)) {
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const at = M.sampleWalk(plan(key), t).at;
          const ground = world.terrain.height(at.x, at.z);
          const hit = new THREE.Raycaster(new THREE.Vector3(at.x, ground + 50, at.z), new THREE.Vector3(0, -1, 0), 0, 100).intersectObject(mesh)[0];
          assert.ok(hit, `${key}: no ground at ${t}`);
          assert.ok(Math.abs(hit.point.y - ground) < 0.35, `${key}: surface/eye mismatch ${(hit.point.y - ground).toFixed(2)} m at ${t}`);
        }
      }
    }
  } finally {
    material.dispose();
    cache.dispose();
  }
});
