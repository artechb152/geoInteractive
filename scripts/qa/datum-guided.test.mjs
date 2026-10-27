// Acceptance tests for the guided 3-D datum block (topic-02 #scene-coordinates,
// design/mockups/datum-concepts/claude-guided-3d-prompt.md §9, §11.3; the stations
// as lesson 2 tasks 14–15 redefine them, 2026-10-26: ellipsoid vs anchoring, global
// vs local, and the "מה השתנה?" check).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/datum-guided.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  START, GEOID, REGION, LOCAL_ARC, GC, ELL, fitError, computeBest, scoreFor, geoidW, geoidW3, bodyPoint,
  svgToPlane, planeToWorld, posedEllipse, ellipsoidQ, ellipsoidSectionX0, poseToWorld, ellipsePointToward, geoidAt,
  DISPLAY_K, surfaceEnvelopeW, svgDisplay, toDisplay, fromDisplay, gapAt, RANGE,
} from '../../src/components/lessons/topic-02/datum/datumGeometry.ts';
import {
  datumReducer, initialDatumState, VIEW_MS, CHANGE_MS, isAnimating, PROBES, lookOf, viewPose, stationPose, otherPose, inspectOf, solved, checkComplete,
  GLOBAL_POSE, LOCAL_POSE, DATUM_POSE, ANCHOR_POSE, CHECK,
} from '../../src/components/lessons/topic-02/datum/datumDemo.ts';
import {
  insetView, insetPx, toPlane, curveRun, tubeFill, geoidPlane, ellipsePlane, ellipsePhiAt, ellipseCentrePlane, GAP_MIN,
} from '../../src/components/lessons/topic-02/datum/datumInset.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const best = computeBest();
const run = (s, ...actions) => actions.reduce((st, a) => datumReducer(st, a), s);

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

/* ─────────────── the stations (datumDemo.ts) — lesson 2 tasks 14–15 ─────────────── */

const atStep = (step) => run(initialDatumState(), { type: 'openStep', step, instant: true });
const anchoringDiffers = (a, b) => a.dx !== b.dx || a.dy !== b.dy || a.rot !== b.rot;
/** How far the posed ellipse reaches beyond the Earth's surface in the section (radial factor; < 0: inside). */
function beyondSurface(p) {
  let m = -Infinity;
  for (const q of posedEllipse(p, 360)) {
    const { u, v } = svgToPlane(q.x, q.y);
    const beta = Math.atan2(v / ELL.ry, Math.abs(u) / ELL.rx);
    m = Math.max(m, Math.hypot(u / ELL.rx, v / ELL.ry) - surfaceEnvelopeW(beta, u >= 0 ? 0 : Math.PI));
  }
  return m;
}

test('the datums: the global one is geocentric; the local one keeps the same ellipsoid and is not a mere shift', () => {
  assert.deepEqual(GLOBAL_POSE, { dx: 0, dy: 0, rot: 0, s: 1 });
  assert.deepEqual(DATUM_POSE, { global: GLOBAL_POSE, local: LOCAL_POSE });
  assert.equal(LOCAL_POSE.s, GLOBAL_POSE.s, 'same ellipsoid: only the anchoring differs');
  assert.ok(LOCAL_POSE.dx !== 0 || LOCAL_POSE.dy !== 0, 'the local centre is off the Earth’s centre');
  assert.notEqual(LOCAL_POSE.rot, 0, 'and turned — not a simple shift');
  // the local anchoring fits the marked region better, the global one the whole Earth
  assert.ok(fitError(LOCAL_POSE, REGION.local) < fitError(GLOBAL_POSE, REGION.local));
  assert.ok(fitError(GLOBAL_POSE, REGION.global) < fitError(LOCAL_POSE, REGION.global));
  // the exercise's own START is untouched (the score tests above pin it)
  assert.deepEqual(START, { dx: 170, dy: -120, rot: 25, s: 0.55 });
});

test('station 1: one ellipsoid, two anchorings — only the centre and the axes differ', () => {
  assert.deepEqual(ANCHOR_POSE.a, GLOBAL_POSE);
  assert.equal(ANCHOR_POSE.b.s, ANCHOR_POSE.a.s, 'the same size and shape');
  assert.ok(ANCHOR_POSE.b.dx !== 0 && ANCHOR_POSE.b.dy !== 0 && ANCHOR_POSE.b.rot !== 0, 'shifted and turned');
  let s = initialDatumState();
  assert.equal(s.step, 0);
  assert.equal(lookOf(s), 'motion');
  assert.deepEqual(viewPose(s), ANCHOR_POSE.a);
  assert.deepEqual(otherPose(s), ANCHOR_POSE.b, 'the dashed outline is the other anchoring');
  assert.equal(s.seenB, false);
  s = run(s, { type: 'setAnchor', anchor: 'b' });
  assert.deepEqual(stationPose(s), ANCHOR_POSE.b);
  assert.deepEqual(otherPose(s), ANCHOR_POSE.a);
  assert.ok(s.view, 'an eased move from A to B');
  s = run(s, { type: 'tick', dt: VIEW_MS + 10 });
  assert.ok(!isAnimating(s));
  assert.deepEqual(viewPose(s), ANCHOR_POSE.b);
  s = run(s, { type: 'setAnchor', anchor: 'a', instant: true });
  assert.equal(s.view, null, 'reduced motion: instant');
  assert.equal(s.seenB, true, 'once both are seen, the comparison stays');
});

test('station 2: global / local applies at once and eases; the dashed outline is the other datum', () => {
  let s = atStep(1);
  assert.equal(lookOf(s), 'compare');
  assert.deepEqual(stationPose(s), GLOBAL_POSE);
  assert.deepEqual(otherPose(s), LOCAL_POSE);
  s = run(s, { type: 'setMode', mode: 'local' });
  assert.deepEqual(stationPose(s), LOCAL_POSE, 'the new datum at once — no stale pose');
  assert.deepEqual(otherPose(s), GLOBAL_POSE);
  assert.ok(s.view, 'a short eased move');
  s = run(s, { type: 'tick', dt: VIEW_MS + 10 });
  assert.equal(s.view, null);
  assert.deepEqual(viewPose(s), LOCAL_POSE);
});

test('station 2: the two check points are fixed, used by both datums, and the gaps say what the feedback says', () => {
  let s = atStep(1);
  assert.equal(inspectOf(s), PROBES.inside);
  s = run(s, { type: 'setProbe', probe: 'outside' });
  assert.equal(inspectOf(s), PROBES.outside);
  s = run(s, { type: 'setMode', mode: 'local', instant: true });
  assert.equal(inspectOf(s), PROBES.outside, 'the point does not move with the datum');
  // the inside point lies in the marked region, the outside one on the open wall outside it
  assert.ok(PROBES.inside >= LOCAL_ARC.from && PROBES.inside <= LOCAL_ARC.to);
  assert.ok(PROBES.outside > LOCAL_ARC.to && PROBES.outside <= 1.45);
  // measured, not assumed: the local datum is the closer one inside the region, the global one outside
  const g = (mode, probe) => gapAt(DATUM_POSE[mode], PROBES[probe]);
  assert.ok(g('local', 'inside') < 3 && g('global', 'inside') >= 20, `inside: local ${g('local', 'inside')}, global ${g('global', 'inside')}`);
  assert.ok(g('global', 'outside') < 8 && g('local', 'outside') >= 8, `outside: global ${g('global', 'outside')}, local ${g('local', 'outside')}`);
  // and gapAt is fitError's own term
  close(gapAt(best.global.pose, 0.3), fitError(best.global.pose, [geoidAt(0.3)]), 1e-9);
});

test('station 3: each pair changes what its answer says — and "another ellipsoid" is once larger, once smaller', () => {
  assert.equal(CHECK.length, 3);
  assert.deepEqual(CHECK.map((c) => c.answer).sort(), ['anchor', 'both', 'ellipsoid']);
  for (const { b, answer } of CHECK) {
    const size = b.s !== GLOBAL_POSE.s;
    const anchoring = anchoringDiffers(b, GLOBAL_POSE);
    assert.equal(answer, size && anchoring ? 'both' : size ? 'ellipsoid' : 'anchor', JSON.stringify(b));
  }
  const sizes = CHECK.filter((c) => c.b.s !== 1).map((c) => c.b.s);
  assert.ok(sizes.some((x) => x > 1) && sizes.some((x) => x < 1));
});

test('every pose the block shows stays inside the Earth, or within 2 % of its surface', () => {
  for (const p of [GLOBAL_POSE, LOCAL_POSE, ANCHOR_POSE.b, ...CHECK.map((c) => c.b)]) {
    assert.ok(beyondSurface(p) <= 0.02, `${JSON.stringify(p)} reaches ${beyondSurface(p).toFixed(3)} past the surface`);
  }
});

test('station 3: a wrong answer can be changed, a right one stays; the next pair opens on its change from datum A', () => {
  let s = atStep(2);
  assert.equal(lookOf(s), 'motion');
  assert.deepEqual(stationPose(s), CHECK[0].b);
  assert.deepEqual(otherPose(s), GLOBAL_POSE, 'datum A is the dashed outline');
  s = run(initialDatumState(), { type: 'openStep', step: 2 });
  assert.deepEqual(viewPose(s), GLOBAL_POSE, 'the check opens on datum A…');
  s = run(s, { type: 'tick', dt: CHANGE_MS * 2 });
  assert.deepEqual(viewPose(s), CHECK[0].b, '…and moves to datum B');
  s = run(s, { type: 'nextPair' });
  assert.equal(s.pair, 0, 'no next pair before the right answer');
  s = run(s, { type: 'pick', change: 'ellipsoid' });
  assert.equal(s.picks[0], 'ellipsoid');
  assert.ok(!solved(s, 0));
  s = run(s, { type: 'pick', change: 'anchor' });
  assert.ok(solved(s, 0), 'the answer can be changed');
  s = run(s, { type: 'pick', change: 'both' });
  assert.equal(s.picks[0], 'anchor', 'a right answer stays');
  s = run(s, { type: 'nextPair' });
  assert.equal(s.pair, 1);
  assert.deepEqual(viewPose(s), GLOBAL_POSE, 'each pair starts at datum A');
  s = run(s, { type: 'tick', dt: CHANGE_MS * 2 });
  assert.deepEqual(viewPose(s), CHECK[1].b);
  s = run(s, { type: 'replay', instant: true });
  assert.equal(s.view, null, 'reduced motion: the replay is instant');
  s = run(s, { type: 'replay' });
  assert.deepEqual(viewPose(s), GLOBAL_POSE, 'the replay shows the change again from A');
  s = run(s, { type: 'tick', dt: CHANGE_MS * 2 }, { type: 'pick', change: 'ellipsoid' }, { type: 'nextPair' }, { type: 'pick', change: 'both' });
  assert.ok(checkComplete(s));
  s = run(s, { type: 'nextPair' });
  assert.equal(s.pair, 2, 'no pair after the last');
  s = run(s, { type: 'restartCheck', instant: true });
  assert.equal(s.pair, 0);
  assert.deepEqual(s.picks, [null, null, null]);
  // answers only count in station 3
  assert.deepEqual(run(atStep(1), { type: 'pick', change: 'anchor' }).picks, [null, null, null]);
});

test('stations keep their own state: 1 → 2 → 3 → 1 finds each as it was left', () => {
  let s = run(initialDatumState(), { type: 'setAnchor', anchor: 'b', instant: true });
  s = run(s, { type: 'openStep', step: 1, instant: true }, { type: 'setMode', mode: 'local', instant: true }, { type: 'setProbe', probe: 'outside' });
  s = run(s, { type: 'openStep', step: 2, instant: true }, { type: 'pick', change: 'anchor' });
  s = run(s, { type: 'openStep', step: 0 });
  assert.equal(s.anchor, 'b');
  assert.ok(s.view, 'the view eases from the pose on screen to the station’s');
  s = run(s, { type: 'tick', dt: VIEW_MS + 10 });
  assert.deepEqual(viewPose(s), ANCHOR_POSE.b);
  assert.ok(!isAnimating(s));
  assert.equal(s.mode, 'local');
  assert.equal(s.probe, 'outside');
  assert.equal(s.picks[0], 'anchor');
  assert.deepEqual(stationPose(run(s, { type: 'openStep', step: 1, instant: true })), LOCAL_POSE);
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
