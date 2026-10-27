// Tests for the projections lab model (topic-02 #scene-coordinates-2 — "היטלים: מכדור למפה",
// projections/projectionsModel.ts): the three projections and their inverses, the surfaces in 3-D
// (contact, no cut into the globe, continuous unrolling, isometry), the camera fit, the slider's
// keys, the equal circles (the distortion), the copy (one idea + one action a phase), and the practice:
// rounds, windows, check, the first miss (where to look), the second (the answer shown), summary, repeat.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/projections-lab.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  METHODS, SURFACE_SCALE, CYL_LAT_MAX, CONE_PHI0, CONE_N, CONE_RHO0, CONE_RHO_OUT, CONE_THETA_MAX, CONE_APEX_Y, AZ_RHO_MAX, CONTACT_LAT, COVERAGE,
  project, unproject, inCoverage, MAP_BOX, gridLines, outlineOf, sheetMesh, sheetPoint, sheetOutline, baseView, viewBasis, framePoints, fitCamera, FLOOR_Y,
  CIRCLES, CIRCLE_R, smallCircle, circleOnMap, parallelScale, regionBox, mapOpacity, circlesOn,
  phaseOf, sliderKey, demoDuration, ENDS, PHASE_LABEL, STEPS, TAB_NAME, SURFACE_NAME,
  ROUNDS, WINDOW, MAX_MISSES, initialPractice, practiceReducer, targetOf, isPart, isOver, feedbackOf, RIGHT, SHOWN, MADE, LOOK, PICK_PROMPT, SUMMARY,
} from '../../src/components/lessons/topic-02/projections/projectionsModel.ts';
import { geodeticToScene, B } from '../../src/components/lessons/topic-02/geo-globe/geoCoords.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const D = Math.PI / 180;
const len = (p) => Math.hypot(p[0], p[1], p[2]);
const run = (s, ...as) => as.reduce(practiceReducer, s);

/* ── the projections ── */

test('each map is its projection: forward and inverse agree over the coverage', () => {
  for (const m of METHODS) {
    const { latMin, latMax } = COVERAGE[m];
    for (let lat = latMin; lat <= latMax; lat += 2.5)
      for (let lon = -177.5; lon <= 177.5; lon += 5) {
        const [x, y] = project(m, lat, lon);
        const g = unproject(m, x, y);
        assert.ok(g, `${m} ${lat},${lon} falls outside its own map`);
        close(g.lat, lat, 1e-9, `${m} lat`);
        if (!(m === 'az' && lat === 90)) close(g.lon, lon, 1e-9, `${m} lon`);
      }
  }
});

test('cylinder: Plate Carrée tangent at the equator — straight, evenly spaced, right-angled grid', () => {
  // meridians are vertical lines, parallels horizontal lines, both evenly spaced
  for (const lon of [-150, -30, 0, 45]) {
    const xs = [-60, 0, 60].map((lat) => project('cyl', lat, lon)[0]);
    assert.ok(xs.every((x) => Math.abs(x - xs[0]) < 1e-12), 'a meridian is a vertical line');
  }
  close(project('cyl', 30, 0)[1] - project('cyl', 15, 0)[1], project('cyl', 15, 0)[1] - project('cyl', 0, 0)[1], 1e-12);
  close(MAP_BOX.cyl.x1 - MAP_BOX.cyl.x0, 2 * Math.PI, 1e-12, 'the equator is true length: 2πR');
  close(project('cyl', 0, 179.9)[0] - project('cyl', 0, -179.9)[0], 2 * Math.PI * (359.8 / 360), 1e-12);
  assert.equal(unproject('cyl', 0, (CYL_LAT_MAX + 1) * D), null, 'beyond the shown latitudes');
});

test('cone: equidistant conic, one standard parallel 45°N — arcs about the apex, meridians converge', () => {
  close(CONE_N, Math.sin(45 * D), 1e-15);
  // the parallel of contact is true length: its arc length = the globe's 45°N circumference
  const r45 = Math.hypot(...project('cone', 45, 0));
  close(r45, CONE_RHO0, 1e-12, 'contact parallel at cot φ0 from the apex');
  close(r45 * 2 * CONE_THETA_MAX, 2 * Math.PI * Math.cos(45 * D), 1e-12, 'true length along the contact');
  // a parallel is an arc about the apex (0, 0): every point at one radius
  const rs = [-170, -60, 0, 90, 175].map((lon) => Math.hypot(...project('cone', 30, lon)));
  assert.ok(rs.every((r) => Math.abs(r - rs[0]) < 1e-12), 'a parallel is a circle arc about the apex');
  // meridians are straight lines through the apex
  for (const lon of [-120, 15, 100]) {
    const [x1, y1] = project('cone', 20, lon);
    const [x2, y2] = project('cone', 70, lon);
    close(x1 * y2 - x2 * y1, 0, 1e-12, 'a meridian passes through the apex');
  }
  // the sector is 2π·n wide, short of a full circle: a fan, not a disc
  assert.ok(2 * CONE_THETA_MAX < 2 * Math.PI);
  // equidistant along meridians
  close(Math.hypot(...project('cone', 20, 10)) - Math.hypot(...project('cone', 35, 10)), 15 * D, 1e-12);
  // the pole is not part of this map (it would be an arc, not a point)
  assert.equal(unproject('cone', 0, -0.2), null);
  assert.equal(inCoverage('cone', 90), false);
});

test('plane: polar azimuthal equidistant — circles about the pole, radial meridians, Greenwich down, east right', () => {
  const [x0, y0] = project('az', 90, 0);
  close(x0, 0, 1e-12);
  close(y0, 0, 1e-12);
  const [xg, yg] = project('az', 45, 0);
  close(xg, 0, 1e-12);
  assert.ok(yg < 0, 'Greenwich toward the bottom');
  const [xe] = project('az', 45, 90);
  assert.ok(xe > 0, '90°E to the right — seen from above the north pole, not mirrored');
  close(Math.hypot(...project('az', 30, 77)), 60 * D, 1e-12, 'distance from the pole is true');
  close(AZ_RHO_MAX, 80 * D, 1e-15);
});

/* ── the equal circles: the distortion ── */

test('the equal circles are true circles on the sphere, whole inside every map', () => {
  const ang = (a, b) =>
    Math.acos(Math.min(1, Math.sin(a.lat * D) * Math.sin(b.lat * D) + Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.cos((a.lon - b.lon) * D))) / D;
  for (const c of CIRCLES) {
    for (const q of smallCircle(c.lat, c.lon, CIRCLE_R)) close(ang(c, q), CIRCLE_R, 1e-9, 'on the circle');
    for (const m of METHODS) {
      assert.ok(inCoverage(m, c.lat - CIRCLE_R) && inCoverage(m, c.lat + CIRCLE_R), `${m}: the ${c.lat}° circle leaves the map`);
      for (const [x, y] of circleOnMap(m, c)) assert.ok(unproject(m, x, y), `${m}: a point of the ${c.lat}° circle is off the map`);
    }
  }
});

test('on the map a circle keeps its height and stretches east–west by the parallel scale', () => {
  for (const m of METHODS)
    for (const c of CIRCLES) {
      const pts = circleOnMap(m, c);
      const [cx, cy] = project(m, c.lat, c.lon);
      // the local east and north directions on the map, at the centre
      const [ex, ey] = project(m, c.lat, c.lon + 0.01);
      const [nx, ny] = project(m, c.lat + 0.01, c.lon);
      const e = [ex - cx, ey - cy].map((v) => v / Math.hypot(ex - cx, ey - cy));
      const n = [nx - cx, ny - cy].map((v) => v / Math.hypot(nx - cx, ny - cy));
      let w = 0;
      let h = 0;
      for (const [x, y] of pts) {
        w = Math.max(w, Math.abs((x - cx) * e[0] + (y - cy) * e[1]));
        h = Math.max(h, Math.abs((x - cx) * n[0] + (y - cy) * n[1]));
      }
      close(h, CIRCLE_R * D, CIRCLE_R * D * 0.01, `${m} ${c.lat}°: meridians are true`);
      close(w / h, parallelScale(m, c.lat), 0.03 * parallelScale(m, c.lat), `${m} ${c.lat}°: width / height`);
    }
  // each method keeps a different circle true: the one at (or nearest) its contact
  const best = (m) => CIRCLES.reduce((a, c) => (parallelScale(m, c.lat) < parallelScale(m, a.lat) ? c : a)).lat;
  assert.deepEqual(METHODS.map(best), [20, 45, 70]);
  close(parallelScale('cone', CONE_PHI0), 1, 1e-12, 'the cone is true along its contact');
  close(parallelScale('cyl', 0), 1, 1e-12);
  close(parallelScale('az', 90), 1, 1e-12);
  // and the stretch grows away from it: the cylinder ×2.9 at 70°N, the plane ×1.3 at 20°N
  close(parallelScale('cyl', 70), 2.92, 0.01);
  close(parallelScale('cone', 70), 1.17, 0.01);
  close(parallelScale('az', 20), 1.30, 0.01);
  for (const m of METHODS) for (const c of CIRCLES) assert.ok(parallelScale(m, c.lat) >= 1 - 1e-12, `${m}: equidistant maps never shrink a circle`);
});

test('in the lab the map comes in as the surface unrolls, and the circles once it is well open', () => {
  assert.ok(mapOpacity(0) > 0.2 && mapOpacity(0) < 0.35, 'a faint preview at the start');
  close(mapOpacity(1), 1, 1e-12);
  assert.ok(mapOpacity(0.5) > mapOpacity(0.2));
  assert.equal(circlesOn(0), 0);
  assert.equal(circlesOn(0.4), 0);
  close(circlesOn(1), 1, 1e-12);
});

test('grid lines are the graticule every 15°, inside each map', () => {
  for (const m of METHODS) {
    const g = gridLines(m);
    assert.ok(g.parallels.length >= 4 && g.meridians.length >= 23, m);
    for (const line of [...g.parallels, ...g.meridians]) for (const [x, y] of line) assert.ok(unproject(m, x, y), `${m}: a grid point off the map`);
  }
  assert.equal(gridLines('cyl').meridians.length, 23, 'cylinder: −165°…180°, the map edge is the outline');
  // a parallel runs from the west edge to the east edge without a jump across the map (the cone's mouth)
  for (const m of METHODS) {
    const line = gridLines(m).parallels[0];
    let jump = 0;
    for (let k = 1; k < line.length; k++) jump = Math.max(jump, Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]));
    assert.ok(jump < 0.2, `${m}: a parallel jumps ${jump}`);
  }
  assert.ok(outlineOf('cone').length > 100);
});

/* ── the surfaces ── */

test('at 0 % each surface touches the globe along its contact, and only there', () => {
  // cylinder: the sheet at (x = λ, y = 0) is on the equator at radius SURFACE_SCALE
  const o = sheetPoint('cyl', 0, 35 * D, 0);
  const q = geodeticToScene(0, 35);
  close(o.p[0], q[0] * SURFACE_SCALE, 1e-12);
  close(o.p[2], q[2] * SURFACE_SCALE, 1e-12);
  // cone: the parallel of contact rolls onto the 45°N circle of the sphere
  for (const lon of [-150, 0, 35, 120]) {
    const [x, y] = project('cone', CONE_PHI0, lon);
    const c = sheetPoint('cone', 0, x, y);
    const s = [Math.cos(45 * D) * Math.cos(lon * D), Math.sin(45 * D), -Math.cos(45 * D) * Math.sin(lon * D)].map((v) => v * SURFACE_SCALE);
    close(c.p[0], s[0], 1e-12, `cone x ${lon}`);
    close(c.p[1], s[1], 1e-12, `cone y ${lon}`);
    close(c.p[2], s[2], 1e-12, `cone z ${lon}`);
  }
  // the apex is above the north pole
  const apex = sheetPoint('cone', 0, 0, 0);
  close(apex.p[0], 0, 1e-12);
  close(apex.p[1], CONE_APEX_Y, 1e-12);
  // the plane lies just above the pole
  assert.ok(sheetPoint('az', 0, 0, 0).p[1] > B);
  // on the sheet, a meridian rolls onto the same meridian of the globe (same azimuth)
  for (const lon of [-90, 35.2, 160]) {
    const [x, y] = project('cyl', 40, lon);
    const p = sheetPoint('cyl', 0, x, y).p;
    close(Math.atan2(-p[2], p[0]) / D, lon, 1e-9, 'cylinder meridian');
    const [cx, cy] = project('cone', 30, lon);
    const pc = sheetPoint('cone', 0, cx, cy).p;
    close(Math.atan2(-pc[2], pc[0]) / D, lon, 1e-9, 'cone meridian');
  }
});

test('no surface ever cuts into the globe, at any stage of the unrolling', () => {
  for (const m of METHODS) {
    const mesh = sheetMesh(m, 72, 24);
    let min = Infinity;
    for (let e = 0; e <= 1.0001; e += 0.025)
      for (let k = 0; k < mesh.count; k++) {
        const r = len(sheetPoint(m, e, mesh.flat[k * 2], mesh.flat[k * 2 + 1]).p);
        min = Math.min(min, r);
      }
    // the WGS84 body lies inside the unit sphere; the surfaces stay outside it
    assert.ok(min >= 1 - 1e-9, `${m}: closest approach ${min}`);
  }
});

test('unrolling is continuous and keeps distances on the sheet (no stretching)', () => {
  for (const m of ['cyl', 'cone']) {
    const mesh = sheetMesh(m, 60, 16);
    for (let e = 0; e < 1; e += 0.01) {
      let jump = 0;
      for (let k = 0; k < mesh.count; k++) {
        const a = sheetPoint(m, e, mesh.flat[k * 2], mesh.flat[k * 2 + 1]).p;
        const b = sheetPoint(m, e + 0.01, mesh.flat[k * 2], mesh.flat[k * 2 + 1]).p;
        jump = Math.max(jump, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
      assert.ok(jump < 0.15, `${m} at ${e.toFixed(2)}: a step of 1 % moved a point by ${jump}`);
    }
    // isometry: neighbouring vertices keep their flat distance (× the surface scale)
    for (const e of [0, 0.3, 0.7, 1]) {
      for (let k = 0; k + 1 < mesh.count; k += 7) {
        const [x1, y1, x2, y2] = [mesh.flat[k * 2], mesh.flat[k * 2 + 1], mesh.flat[k * 2 + 2], mesh.flat[k * 2 + 3]];
        const d0 = Math.hypot(x2 - x1, y2 - y1) * SURFACE_SCALE;
        if (d0 > 0.2 || d0 < 1e-6) continue;
        const a = sheetPoint(m, e, x1, y1).p;
        const b = sheetPoint(m, e, x2, y2).p;
        close(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), d0, d0 * 0.01, `${m} chord at ${e}`);
      }
    }
  }
});

test('at 100 % the sheet IS the map: a plane, outer face to the viewer, east to the right', () => {
  // cylinder: the plane x = SURFACE_SCALE, tangent along Greenwich; flat x → −z (east), y → y
  for (const [x, y] of [[-3, 1], [0.6, 0.55], [3.1, -1.3]]) {
    const o = sheetPoint('cyl', 1, x, y);
    close(o.p[0], SURFACE_SCALE, 1e-9);
    close(-o.p[2], x * SURFACE_SCALE, 1e-9);
    close(o.p[1], y * SURFACE_SCALE, 1e-9);
    close(o.n[0], 1, 1e-9);
  }
  // cone: the plane tangent at 45°N on Greenwich, normal = that point's up
  const nrm = [Math.cos(45 * D), Math.sin(45 * D), 0];
  const ref = sheetPoint('cone', 1, 0, 0).p;
  for (const [x, y] of [[0.4, -1.2], [-1.3, 0.3], [1.5, 0.5]]) {
    const o = sheetPoint('cone', 1, x, y);
    close((o.p[0] - ref[0]) * nrm[0] + (o.p[1] - ref[1]) * nrm[1], 0, 1e-9, 'in the plane');
    close(o.n[0], nrm[0], 1e-9);
    close(o.n[1], nrm[1], 1e-9);
  }
  // the developed sector keeps its flat geometry: distance from the apex = ρ
  const [cx, cy] = project('cone', 31.8, 35.2);
  const pc = sheetPoint('cone', 1, cx, cy).p;
  close(Math.hypot(pc[0] - ref[0], pc[1] - ref[1], pc[2] - ref[2]), Math.hypot(cx, cy) * SURFACE_SCALE, 1e-9);
});

/* ── the camera ── */

test('the camera keeps the globe and the whole sheet in frame at every stage', () => {
  const aspect = 0.95;
  const tanV = Math.tan((24 * D) / 2);
  for (const m of [null, ...METHODS]) {
    for (let p = 0; p <= 1.0001; p += 0.1) {
      const { el, az } = baseView(m, p);
      const pts = framePoints(m, p, el, az);
      const cam = fitCamera(pts, el, az, aspect);
      const pos = cam.target.map((t, i) => t + cam.d[i] * cam.dist);
      const { right, up, d } = viewBasis(el, az);
      for (const q of pts) {
        const rel = q.map((v, i) => v - pos[i]);
        const depth = -(rel[0] * d[0] + rel[1] * d[1] + rel[2] * d[2]);
        assert.ok(depth > 0.1, 'in front of the camera');
        const sx = (rel[0] * right[0] + rel[1] * right[1] + rel[2] * right[2]) / depth / (tanV * aspect);
        const sy = (rel[0] * up[0] + rel[1] * up[1] + rel[2] * up[2]) / depth / tanV;
        assert.ok(Math.abs(sx) <= 0.9 + 1e-6 && Math.abs(sy) <= 0.9 + 1e-6, `${m} at ${p.toFixed(1)}: (${sx.toFixed(3)}, ${sy.toFixed(3)})`);
      }
    }
  }
});

test('the plane is seen from straight above at the end, Greenwich at the bottom', () => {
  const v = baseView('az', 1);
  close(v.el, 90, 1e-12);
  close(v.az, 0, 1e-12);
  const { up, right } = viewBasis(90, 0);
  // screen-up points away from Greenwich (−x), screen-right is east (−z)
  close(up[0], -1, 1e-12);
  close(right[2], -1, 1e-12);
  // the opening view faces Africa / Europe / the Middle East, north up
  const o = baseView('cyl', 0);
  assert.ok(o.az > 0 && o.az < 20 && o.el > 5 && o.el < 30);
  assert.ok(FLOOR_Y < -1);
});

/* ── the process and the slider ── */

test('phases and the slider keys: ← and ↑ advance (toward "מפה שטוחה"), → and ↓ go back, Home / End', () => {
  assert.equal(phaseOf(0), 'start');
  assert.equal(phaseOf(0.5), 'mid');
  assert.equal(phaseOf(1), 'end');
  assert.equal(sliderKey('ArrowLeft', 0.5), 0.55);
  assert.equal(sliderKey('ArrowUp', 0.5), 0.55);
  assert.equal(sliderKey('ArrowRight', 0.5), 0.45);
  assert.equal(sliderKey('ArrowDown', 0.02), 0);
  assert.equal(sliderKey('ArrowLeft', 0.98), 1);
  assert.equal(sliderKey('Home', 0.7), 0);
  assert.equal(sliderKey('End', 0.1), 1);
  assert.equal(sliderKey('a', 0.1), null);
  assert.deepEqual(ENDS.cyl, ['עטיפה', 'מפה שטוחה']);
  assert.deepEqual(ENDS.az, ['מישור משיק', 'מבט על']);
  assert.equal(PHASE_LABEL.az.mid, 'מעבר למבט על');
  close(demoDuration(0), 5, 1e-12);
  assert.ok(demoDuration(0.9) >= 0.5 && demoDuration(0.9) < 1);
  assert.deepEqual(METHODS.map((m) => TAB_NAME[m]), ['גלילי', 'חרוטי', 'אזימוטלי']);
});

/* ── the copy: one idea and one action a phase ── */

test('every phase says one idea and one short action; the end asks to compare', () => {
  const sentences = (t) => t.split(/[.:](?:\s|$)/).filter((x) => x.trim()).length;
  for (const m of METHODS)
    for (const ph of ['start', 'mid', 'end']) {
      const { idea, act } = STEPS[m][ph];
      assert.ok(idea && act, `${m} ${ph}`);
      assert.ok(sentences(idea) <= 2, `${m} ${ph}: one idea, at most two sentences — ${idea}`);
      assert.ok(act.split(/\s+/).length <= 7, `${m} ${ph}: a short action — ${act}`);
      assert.ok(act.endsWith('.'), act);
    }
  // the unrolling never stretches (cylinder, cone) — the distortion comes from carrying the globe onto
  // the surface, so the step does not contradict "a sphere cannot be flattened without stretching";
  // the plane has nothing to unroll
  for (const m of ['cyl', 'cone']) assert.ok(STEPS[m].mid.idea.includes('בלי להימתח') && STEPS[m].mid.idea.includes('לא בפריסה'), m);
  assert.ok(STEPS.az.mid.idea.includes('אין מה לפרוס'));
  // the end names the distortion against the contact, and asks for the comparison
  for (const m of METHODS) {
    assert.ok(STEPS[m].end.idea.includes('נמתחים'), m);
    assert.ok(STEPS[m].end.act.includes('השוו'), m);
  }
  assert.ok(STEPS.cyl.end.idea.includes('קו המשווה'));
  assert.ok(STEPS.cone.end.idea.includes('45°'));
  assert.ok(STEPS.az.end.idea.includes('הקוטב'));
});

/* ── practice ── */

test('practice: four tasks a round — all three methods, one again, never twice in a row; mostly windows', () => {
  assert.equal(initialPractice().order.length, 4);
  assert.notEqual(targetOf(initialPractice()), 'cyl', 'the first task is not the opening tab');
  for (const r of ROUNDS) {
    assert.equal(r.length, 4);
    assert.deepEqual([...new Set(r.map((t) => t.m))].sort(), ['az', 'cone', 'cyl']);
    for (let i = 1; i < r.length; i++) assert.notEqual(r[i].m, r[i - 1].m, 'no method twice in a row');
    assert.equal(r.filter((t) => !t.part).length, 1, 'one whole map a round');
  }
  // the repeated method is not always the last task: elimination never gives it away
  const lastRepeats = ROUNDS.map((r) => r.slice(0, 3).some((t) => t.m === r[3].m));
  assert.ok(lastRepeats.includes(false) && lastRepeats.includes(true));
});

test('practice: each window is inside its map, smaller than it, and hides the outline', () => {
  for (const m of METHODS) {
    const w = WINDOW[m];
    const b = MAP_BOX[m];
    assert.ok(w.x1 - w.x0 < b.x1 - b.x0 || w.y1 - w.y0 < b.y1 - b.y0, `${m}: a window, not the whole map`);
    for (let i = 0; i <= 20; i++)
      for (let j = 0; j <= 20; j++) {
        const x = w.x0 + ((w.x1 - w.x0) * i) / 20;
        const y = w.y0 + ((w.y1 - w.y0) * j) / 20;
        assert.ok(unproject(m, x, y), `${m}: the window shows paper outside the map at ${x.toFixed(2)}, ${y.toFixed(2)}`);
      }
  }
  // the plane's window keeps the parallels 45°–75°N whole (closed circles round the pole)
  assert.ok(WINDOW.az.x1 > project('az', 45, 90)[0] && WINDOW.az.y0 < project('az', 45, 0)[1]);
  // regionBox bounds the region it is given
  const r = regionBox('cone', 25, 70, -30, 60);
  const [x, y] = project('cone', 40, 10);
  assert.ok(x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
});

test('practice: a choice is marked but not checked; check only with a choice', () => {
  let s = initialPractice();
  assert.equal(targetOf(s), 'cone');
  assert.equal(isPart(s), false);
  assert.deepEqual(feedbackOf(s), { tone: 'info', text: PICK_PROMPT });
  s = run(s, { type: 'check' });
  assert.equal(s.misses, 0, 'no check without a choice');
  s = run(s, { type: 'pick', m: 'cyl' });
  assert.equal(s.pick, 'cyl');
  assert.equal(s.checked, null, 'a choice alone is not checked');
  assert.equal(run(s, { type: 'next' }).index, 0, 'next is closed while the task is open');
});

test('practice: a first miss says what the choice makes and where to look — never the answer', () => {
  let s = run(initialPractice(), { type: 'pick', m: 'cyl' }, { type: 'check' });
  assert.equal(s.checked, 'cyl');
  assert.equal(s.misses, 1);
  assert.equal(isOver(s), false);
  const f = feedbackOf(s);
  assert.equal(f.tone, 'wrong');
  assert.equal(f.text, `${MADE.cyl} ${LOOK}`);
  for (const t of METHODS)
    for (const c of METHODS) {
      if (c === t) continue;
      const w = feedbackOf({ ...initialPractice(), order: [{ m: t, part: true }, ...initialPractice().order.slice(1)], pick: c, checked: c, misses: 1 }).text;
      assert.ok(!w.includes(SURFACE_NAME[t]), `${c}→${t} names the answer: ${w}`);
      assert.ok(w.includes(LOOK), w);
    }
  // checking the same choice again does nothing
  assert.equal(run(s, { type: 'check' }).misses, 1);
  // another choice clears the old check (its surface goes too); the cue stays on screen
  s = run(s, { type: 'pick', m: 'az' });
  assert.equal(s.checked, null);
  assert.deepEqual(feedbackOf(s), { tone: 'info', text: LOOK });
  // right on the second try: answered
  s = run(s, { type: 'pick', m: 'cone' }, { type: 'check' });
  assert.equal(s.outcome[0], 'right');
  assert.deepEqual(feedbackOf(s), { tone: 'right', text: RIGHT.cone });
  // over: choices are frozen
  assert.equal(run(s, { type: 'pick', m: 'az' }).pick, 'cone');
});

test('practice: a second miss shows the answer and why; the task is then over', () => {
  assert.equal(MAX_MISSES, 2);
  let s = run(initialPractice(), { type: 'pick', m: 'cyl' }, { type: 'check' }, { type: 'pick', m: 'az' }, { type: 'check' });
  assert.equal(s.misses, 2);
  assert.equal(s.outcome[0], 'shown');
  assert.equal(isOver(s), true);
  assert.deepEqual(feedbackOf(s), { tone: 'shown', text: SHOWN.cone });
  for (const m of METHODS) assert.ok(SHOWN[m].startsWith(`התשובה: ${SURFACE_NAME[m]}.`), SHOWN[m]);
  s = run(s, { type: 'next' });
  assert.equal(s.index, 1);
  assert.equal(s.misses, 0);
  assert.equal(s.pick, null);
});

test('practice: four tasks over (answered or shown) reach the summary; repeat resets only practice', () => {
  let s = initialPractice();
  for (const [i, t] of initialPractice().order.entries()) {
    if (i === 1) s = run(s, { type: 'pick', m: t.m === 'cyl' ? 'az' : 'cyl' }, { type: 'check' }); // one miss on the way
    if (i === 2) {
      const wrong = METHODS.filter((m) => m !== t.m);
      s = run(s, { type: 'pick', m: wrong[0] }, { type: 'check' }, { type: 'pick', m: wrong[1] }, { type: 'check' }); // shown
    } else s = run(s, { type: 'pick', m: t.m }, { type: 'check' });
    assert.ok(isOver(s));
    if (i < 3) s = run(s, { type: 'next' });
  }
  assert.deepEqual(s.outcome, ['right', 'right', 'shown', 'right']);
  assert.equal(s.done, false, 'no automatic move to the summary');
  s = run(s, { type: 'finish' });
  assert.equal(s.done, true);
  assert.equal(feedbackOf(s), null);
  assert.deepEqual(SUMMARY.map((x) => `${x.surface}→${x.shape}`), ['גליל→מלבן', 'חרוט→מניפה', 'מישור→מפה עגולה בדוגמה הקוטבית']);
  assert.ok(SUMMARY.every((x) => x.near.startsWith('עיוות קטן ליד')));
  const again = run(s, { type: 'restart' });
  assert.equal(again.done, false);
  assert.equal(again.index, 0);
  assert.deepEqual(again.outcome, [null, null, null, null]);
  assert.deepEqual(again.order, ROUNDS[1]);
  assert.equal(again.round, 1);
  // finishing early is refused
  assert.equal(run(initialPractice(), { type: 'finish' }).done, false);
});
