// Acceptance tests for the guided 3-D datum block (topic-02 #scene-coordinates,
// design/mockups/datum-concepts/claude-guided-3d-prompt.md §9, §11.3).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/datum-guided.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  START, GEOID, REGION, LOCAL_ARC, GC, ELL, fitError, computeBest, scoreFor, geoidW, geoidW3, bodyPoint,
  svgToPlane, planeToWorld, posedEllipse, ellipsoidQ, ellipsoidSectionX0, poseToWorld, ellipsePointToward, geoidAt,
  DISPLAY_K, surfaceEnvelopeW, svgDisplay, toDisplay, fromDisplay,
} from '../../src/components/lessons/topic-02/datum/datumGeometry.ts';
import { datumReducer, initialDatumState, demoPose, DEMO_MS, isAnimating } from '../../src/components/lessons/topic-02/datum/datumDemo.ts';
import {
  insetView, insetPx, toPlane, curveRun, tubeFill, geoidPlane, ellipsePlane, ellipsePhiAt, ellipseCentrePlane, GAP_MIN,
} from '../../src/components/lessons/topic-02/datum/datumInset.ts';
import { RANGE } from '../../src/components/lessons/topic-02/datum/datumGeometry.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const best = computeBest();
const run = (s, ...actions) => actions.reduce((st, a) => datumReducer(st, a, best), s);

// Values produced by the ORIGINAL DatumFit code in CoordinatesScene.tsx (git
// blob 6eb1e4f, lines 437–536) before the extraction — the exercise must give
// exactly these results.
test('geometry and score are unchanged by the extraction', () => {
  assert.deepEqual(best.global.pose, { dx: 4, dy: -4, rot: -9, s: 1.01 });
  assert.deepEqual(best.local.pose, { dx: 38, dy: -28, rot: -36, s: 0.75 });
  close(best.global.err, 6.284039715558082, 1e-12, 'global best err');
  close(best.local.err, 2.2255341920648624, 1e-12, 'local best err');
  assert.equal(GEOID.length, 180);
  assert.equal(REGION.local.length, 26);
  const probes = [
    [START, 160.68823886416274, 31.98341409362263, 0, 0],
    [best.global.pose, 6.284039715558082, 6.201724485213695, 100, 60],
    [best.local.pose, 46.13631600404745, 2.2255341920648624, 0, 100],
    [{ dx: 0, dy: 0, rot: 0, s: 1 }, 7.126661852874971, 14.528614459148399, 92, 0],
  ];
  for (const [p, eg, el, sg, sl] of probes) {
    close(fitError(p, REGION.global), eg, 1e-9, 'global err');
    close(fitError(p, REGION.local), el, 1e-9, 'local err');
    assert.equal(scoreFor(p, 'global', best), sg);
    assert.equal(scoreFor(p, 'local', best), sl);
  }
});

test('the continuous geoid W(t) reproduces every original GEOID point', () => {
  for (const q of GEOID) {
    const g = geoidAt(q.t);
    close(g.x, q.x, 1e-9, `x at t=${q.t}`);
    close(g.y, q.y, 1e-9, `y at t=${q.t}`);
  }
});

test('the 3-D geoid cuts the exercise plane exactly in the original section', () => {
  for (const q of GEOID) {
    const { u, v } = svgToPlane(q.x, q.y);
    // u ≥ 0 half lies at λ = 0 (β = −t); u < 0 half at λ = π (β = t − π).
    const front = Math.cos(q.t) >= 0;
    const beta = front ? -q.t : q.t - Math.PI;
    const lam = front ? 0 : Math.PI;
    const p3 = bodyPoint(geoidW3(beta, lam), beta, lam);
    const want = planeToWorld(u, v);
    for (let k = 0; k < 3; k++) close(p3[k], want[k], 1e-9, `axis ${k} at t=${q.t}`);
  }
  // …and the poles agree from every azimuth (no seam).
  for (const lam of [0, 0.7, 1.9, -2.4]) {
    close(geoidW3(Math.PI / 2, lam), geoidW(-Math.PI / 2), 1e-12, 'north pole');
    close(geoidW3(-Math.PI / 2, lam), geoidW(Math.PI / 2), 1e-12, 'south pole');
  }
});

test('the posed 3-D ellipsoid cuts the exercise plane in the posed 2-D ellipse (same pose)', () => {
  for (const p of [START, best.global.pose, best.local.pose, { dx: -120, dy: 90, rot: 40, s: 1.3 }]) {
    for (const q of posedEllipse(p, 48)) {
      const { u, v } = svgToPlane(q.x, q.y);
      close(ellipsoidQ(p, planeToWorld(u, v)), 1, 1e-9, `pose ${JSON.stringify(p)}`);
    }
    // the up direction is preserved: slider +Y (SVG dy < 0) moves the body up (+world y)
    const up = poseToWorld({ ...p, dy: p.dy - 10 }).center[1] - poseToWorld(p).center[1];
    assert.ok(up > 0, 'dy − 10 must move the body up');
  }
});

test('the second cutaway wall shows the true x = 0 section of the posed ellipsoid', () => {
  for (const p of [best.global.pose, best.local.pose, { dx: -60, dy: 40, rot: -30, s: 1.1 }]) {
    const sec = ellipsoidSectionX0(p);
    assert.ok(sec, 'section exists');
    for (const q of sec) close(ellipsoidQ(p, [0, q.y, q.z]), 1, 1e-9, 'on the quadric');
  }
  // far to the right it misses the plane entirely
  assert.equal(ellipsoidSectionX0({ dx: 200, dy: 0, rot: 0, s: 0.5 }), null);
});

test('slider directions survive the 3-D mapping: +X right, +Y up, rotation turns as in 2-D', () => {
  const base = { dx: 0, dy: 0, rot: 0, s: 1 };
  assert.ok(poseToWorld({ ...base, dx: 10 }).center[0] > 0, '+dx moves toward world +x (screen right)');
  assert.ok(poseToWorld({ ...base, dy: -10 }).center[1] > 0, 'slider +Y (dy < 0) moves toward world +y (up)');
  // the SVG ellipse's rotated +x tip lies on the 3-D body, below the centre line (clockwise)
  const p = { ...base, rot: 20 };
  const tip = posedEllipse(p, 4)[0];
  const { u, v } = svgToPlane(tip.x, tip.y);
  close(ellipsoidQ(p, planeToWorld(u, v)), 1, 1e-9);
  assert.ok(v < 0, 'clockwise: the +x tip dips below the centre line');
});

test('the close-up measures the same radial gap as fitError', () => {
  const p = best.global.pose;
  let sum = 0;
  for (const q of REGION.global) {
    const e = ellipsePointToward(p, q);
    sum += Math.hypot(q.x - e.x, q.y - e.y);
  }
  close(sum / REGION.global.length, fitError(p, REGION.global), 1e-9);
});

test('demo: START → shift → rotate → scale → the mode fit, once, and it stays at the end', () => {
  let s = run(initialDatumState(), { type: 'openStep', step: 1 }, { type: 'play' });
  assert.equal(s.playback, 'playing');
  assert.deepEqual(s.pose, START);
  assert.ok(isAnimating(s));
  s = run(s, { type: 'tick', dt: DEMO_MS * 0.5 });
  assert.equal(s.playback, 'playing');
  // mid-demo the shift is done but the scale is not
  close(s.pose.dx, best.global.pose.dx, 1e-9);
  assert.notEqual(s.pose.s, best.global.pose.s);
  s = run(s, { type: 'tick', dt: DEMO_MS }, { type: 'tick', dt: DEMO_MS });
  assert.equal(s.playback, 'ended');
  assert.equal(s.progress, 1);
  assert.deepEqual(s.pose, best.global.pose);
  assert.equal(scoreFor(s.pose, 'global', best), 100);
  assert.equal(s.step, 1, 'no auto-advance to the next station');
  assert.ok(!isAnimating(s));
});

test('pause stops in place, resume continues from there, scrub moves the pose', () => {
  let s = run(initialDatumState(), { type: 'play' }, { type: 'tick', dt: 2000 }, { type: 'togglePlay' });
  assert.equal(s.playback, 'paused');
  const held = s.pose;
  s = run(s, { type: 'tick', dt: 3000 });
  assert.deepEqual(s.pose, held, 'paused pose does not move');
  s = run(s, { type: 'togglePlay' }, { type: 'tick', dt: 500 });
  close(s.progress, 2500 / DEMO_MS, 1e-9, 'resumed from where it stopped');
  s = run(s, { type: 'scrub', progress: 0.8 });
  assert.equal(s.playback, 'paused');
  assert.deepEqual(s.pose, demoPose(0.8, best.global.pose));
});

test('a manual action during the demo stops it before applying', () => {
  let s = run(initialDatumState(), { type: 'play' }, { type: 'tick', dt: 3000 });
  const before = s.pose;
  s = run(s, { type: 'setPose', key: 'rot', value: 10 });
  assert.equal(s.playback, 'paused');
  assert.equal(s.interaction, 'manual');
  assert.equal(s.pose.rot, 10);
  assert.equal(s.pose.dx, before.dx);
  s = run(s, { type: 'tick', dt: 3000 });
  assert.equal(s.pose.rot, 10, 'no frame overwrites the manual value');
});

test('"נסו בעצמכם" switches to manual at the current place (snapped to the sliders)', () => {
  const s = run(initialDatumState(), { type: 'play' }, { type: 'tick', dt: 3333 }, { type: 'tryYourself' });
  assert.equal(s.interaction, 'manual');
  assert.notEqual(s.playback, 'playing');
  assert.equal(s.pose.dx % 2, 0);
  assert.equal(Math.round(s.pose.rot), s.pose.rot);
});

test('reset, show fit and back-to-demo', () => {
  let s = run(initialDatumState(), { type: 'tryYourself' }, { type: 'setPose', key: 'dx', value: 0 }, { type: 'showFit' });
  assert.ok(s.tween, 'show fit animates');
  s = run(s, { type: 'tick', dt: 2000 });
  assert.deepEqual(s.pose, best.global.pose);
  s = run(s, { type: 'showFit' }, { type: 'tick', dt: 100 }, { type: 'reset' });
  assert.equal(s.tween, null, 'reset stops the movement');
  assert.deepEqual(s.pose, START);
  s = run(s, { type: 'backToDemo' });
  assert.equal(s.interaction, 'demo');
  assert.equal(s.playback, 'idle');
  assert.equal(s.progress, 0);
});

test('global ↔ local stops the demo, keeps the pose; only an explicit action brings the new fit', () => {
  let s = run(initialDatumState(), { type: 'play' }, { type: 'tick', dt: DEMO_MS + 10 });
  assert.deepEqual(s.pose, best.global.pose);
  s = run(s, { type: 'setMode', mode: 'local' });
  assert.equal(s.mode, 'local');
  assert.deepEqual(s.pose, best.global.pose, 'pose kept');
  assert.notEqual(s.playback, 'playing');
  assert.equal(scoreFor(s.pose, 'local', best), 60, 'the global fit scores 60 % over the marked arc');
  s = run(s, { type: 'showFit', instant: true });
  assert.deepEqual(s.pose, best.local.pose);
  // the close-up moves into the marked arc
  assert.ok(s.inspect >= LOCAL_ARC.from && s.inspect <= LOCAL_ARC.to);
  // manual pose is kept across a mode switch too
  s = run(s, { type: 'tryYourself' }, { type: 'setPose', key: 'dx', value: 20 }, { type: 'setMode', mode: 'global' });
  assert.equal(s.pose.dx, 20);
  assert.equal(s.interaction, 'manual');
});

test('reduced motion steps through the phases without animating', () => {
  let s = run(initialDatumState(), { type: 'stepReduced' });
  assert.equal(s.playback, 'paused');
  assert.ok(!isAnimating(s));
  s = run(s, { type: 'stepReduced' }, { type: 'stepReduced' });
  assert.equal(s.playback, 'ended');
  assert.deepEqual(s.pose, best.global.pose);
});

test('display mapping: the globe reads almost round, the exercise numbers do not move', () => {
  // height / width of the displayed Earth surface (before perspective and the cutaway)
  let width = 0;
  for (let i = 0; i < 360; i++) width = Math.max(width, surfaceEnvelopeW(0, (i / 360) * 2 * Math.PI) * ELL.rx);
  const height = Math.max(surfaceEnvelopeW(Math.PI / 2, 0), surfaceEnvelopeW(-Math.PI / 2, 0)) * ELL.ry * DISPLAY_K;
  const ratio = height / width;
  assert.ok(ratio >= 0.92 && ratio <= 1.0, `display height/width ${ratio.toFixed(3)} in [0.92, 1]`);
  // the surface always encloses the geoid, and the poles are single points (no seam)
  for (let i = 0; i <= 90; i++) for (let j = 0; j < 180; j++) {
    const b = -Math.PI / 2 + (i / 90) * Math.PI;
    const l = (j / 180) * 2 * Math.PI;
    assert.ok(surfaceEnvelopeW(b, l) >= geoidW3(b, l) + 0.0119, 'surface above the geoid');
  }
  for (const l of [0, 1, 2.5, 4]) {
    close(surfaceEnvelopeW(Math.PI / 2, l), surfaceEnvelopeW(Math.PI / 2, 0), 1e-12, 'north pole');
    close(surfaceEnvelopeW(-Math.PI / 2, l), surfaceEnvelopeW(-Math.PI / 2, 0), 1e-12, 'south pole');
  }
  // the mapping is a pure view transform: it round-trips and never touches the score
  const p = [12, -34, 56];
  assert.deepEqual(fromDisplay(toDisplay(p)).map((x) => +x.toFixed(9)), p);
  close(svgDisplay({ x: 10, y: GC.y }).y, GC.y, 1e-12, 'section centre fixed');
  assert.equal(scoreFor(best.global.pose, 'global', best), 100);
});

test('section constants stay as the exercise defines them', () => {
  assert.deepEqual(GC, { x: 300, y: 205 });
  assert.deepEqual(ELL, { rx: 170, ry: 135 });
});

/* ─────────────── the linked close-up (datumInset.ts) ─────────────── */

// deterministic poses across the slider ranges, plus START and both fits
const POSES = (() => {
  let x = 12345;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const lerp = (r) => r[0] + (r[1] - r[0]) * rnd();
  const out = [START, best.global.pose, best.local.pose];
  for (let i = 0; i < 60; i++) out.push({ dx: lerp(RANGE.dx), dy: lerp(RANGE.dy), rot: lerp(RANGE.rot), s: lerp(RANGE.s) });
  return out;
})();
const INSPECTS = [-1.45, -1, -0.7, -0.3, 0, 0.3, 0.6, 1, 1.45];

test('close-up: the measured pair is the one fitError measures, and the gap is that radial distance', () => {
  for (const p of POSES) for (const t of INSPECTS) {
    const q0 = geoidAt(t);
    const e0 = ellipsePointToward(p, q0);
    const v = insetView(p, t, 188);
    close(v.q.x, toPlane(q0).x, 1e-9);
    close(v.q.y, toPlane(q0).y, 1e-9);
    close(v.e.x, toPlane(e0).x, 1e-9);
    close(v.e.y, toPlane(e0).y, 1e-9);
    // in section units, |q − e| is exactly fitError's term for that one geoid point
    close(Math.hypot(q0.x - e0.x, q0.y - e0.y), fitError(p, [q0]), 1e-9, 'radial gap');
  }
});

test('close-up: both measured points are always inside the circle, whatever the gap', () => {
  for (const p of POSES) for (const t of INSPECTS) {
    const v = insetView(p, t, 188);
    for (const pt of [v.q, v.e]) {
      const px = insetPx(v, [pt.x, pt.y, 0]);
      const r = Math.hypot(px.x - 94, px.y - 94);
      assert.ok(r <= 94 - 14, `point at ${r.toFixed(1)} px from the centre (pose ${JSON.stringify(p)}, t ${t})`);
    }
    // the gap on screen is the plane gap times one scale (no faked distance)
    const a = insetPx(v, [v.q.x, v.q.y, 0]);
    const b = insetPx(v, [v.e.x, v.e.y, 0]);
    const along = Math.hypot(a.x - b.x, a.y - b.y);
    assert.ok(along <= v.gap * v.ppu + 1e-9 && along >= v.gap * v.ppu * Math.cos(0.4) - 1e-9, 'one scale, only the small tilt foreshortens');
  }
});

test('close-up: the bands run through the measured points, their crests in the section plane', () => {
  const N = 220;
  const RING = 20;
  for (const p of POSES.slice(0, 20)) for (const t of [-0.7, 0.6]) {
    const v = insetView(p, t, 188);
    const g = curveRun(geoidPlane, t, { x: 0, y: 0 }, v, N, new Float32Array(N * 4));
    const e = curveRun((sv) => ellipsePlane(p, sv), ellipsePhiAt(p, t), ellipseCentrePlane(p), v, N, new Float32Array(N * 4));
    const near = (run, pt) => {
      let d = Infinity;
      for (let i = 0; i < N - 1; i++) {
        const ax = run[i * 4], ay = run[i * 4 + 1], bx = run[i * 4 + 4], by = run[i * 4 + 5];
        const L = Math.hypot(bx - ax, by - ay) || 1;
        const u = Math.max(0, Math.min(1, ((pt.x - ax) * (bx - ax) + (pt.y - ay) * (by - ay)) / (L * L)));
        d = Math.min(d, Math.hypot(ax + u * (bx - ax) - pt.x, ay + u * (by - ay) - pt.y));
      }
      return d;
    };
    assert.ok(near(g, v.q) < 0.02 * v.rho, `geoid band through q (${near(g, v.q)})`);
    assert.ok(near(e, v.e) < 0.02 * v.rho, `ellipse band through e (${near(e, v.e)})`);
    const pos = new Float32Array(N * RING * 3);
    const nrm = new Float32Array(N * RING * 3);
    tubeFill(g, N, RING, 2, 4, pos, nrm);
    for (let i = 0; i < N; i += 17) {
      const k = (i * RING + RING / 4) * 3; // φ = π/2: the crest
      close(pos[k], g[i * 4], 1e-4);
      close(pos[k + 1], g[i * 4 + 1], 1e-4);
      close(pos[k + 2], 0, 1e-4, 'crest in the section plane');
      for (let j = 0; j < RING; j++) assert.ok(pos[(i * RING + j) * 3 + 2] <= 1e-6, 'the band lies behind the section');
    }
  }
});

test('close-up: when the surfaces meet there is no gap to draw', () => {
  // the fitted ellipse crosses the geoid: find an inspection point where they meet
  let found = false;
  for (let t = -1.45; t <= 1.45; t += 0.005) {
    const v = insetView(best.global.pose, t, 188);
    if (v.gap < GAP_MIN) {
      found = true;
      assert.ok(fitError(best.global.pose, [geoidAt(t)]) < GAP_MIN / 1, 'a small display gap is a small exercise gap');
      break;
    }
  }
  assert.ok(found, 'the fitted ellipse meets the geoid somewhere on the exposed half');
});
