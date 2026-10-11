// Unit tests for the measurement mission (#scene-coordinates → "אליפסואיד, גיאואיד וגליות"):
// answer checking, per-station state, station order, and that the rendered
// landscape's data, the section and the pins all agree with the one station data file.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/measurement-mission.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, STATION_ORDER, FIRST_STATION } from '../../src/components/lessons/topic-02/measurementMission.data.ts';
import {
  orthometric, signed, workedSum, parseHeight, evaluate, isAttempt, nextStation,
  initialMission, missionReducer, solvedSet,
} from '../../src/components/lessons/topic-02/measurementMission.ts';
import { existsSync } from 'node:fs';
import { MEASUREMENT_LANDSCAPE as L } from '../../src/components/lessons/topic-02/measurementLandscape.data.ts';
import { LANDSCAPE_LAYERS } from '../../src/components/lessons/topic-02/measurementLandscapeLayers.data.ts';
import {
  project, stationPins, stationWorld, sectionGeometry, undulationAt, groundZ, geoidZ, LANDSCAPE_ASPECT, SECTION_MAX_VE,
} from '../../src/components/lessons/topic-02/measurementLayout.ts';

test('H = h − N: B 148/28 → 120, A 18/−12 → 30, C 220/0 → 220', () => {
  assert.equal(orthometric('B'), 120);
  assert.equal(orthometric('A'), 30);
  assert.equal(orthometric('C'), 220);
  assert.equal(workedSum('B'), '148 − 28 = 120');
  assert.equal(workedSum('A'), '18 − (−12) = 30');
  assert.equal(workedSum('C'), '220 − 0 = 220');
  assert.equal(signed(28), '+28');
  assert.equal(signed(-12), '−12');
  assert.equal(signed(0), '0');
});

test('parsing: spaces, Unicode minus, decimal comma; empty is not zero', () => {
  assert.deepEqual(parseHeight(''), { ok: false, reason: 'empty' });
  assert.deepEqual(parseHeight('   '), { ok: false, reason: 'empty' });
  assert.deepEqual(parseHeight(' 1 2 0 '), { ok: true, value: 120 });
  assert.deepEqual(parseHeight('120.0'), { ok: true, value: 120 });
  assert.deepEqual(parseHeight('120,0'), { ok: true, value: 120 });
  assert.deepEqual(parseHeight('−12'), { ok: true, value: -12 });
  assert.deepEqual(parseHeight('+30'), { ok: true, value: 30 });
  for (const bad of ['abc', '12a', '1e3', 'Infinity', 'NaN', '--5', '1.2.3', '120 מ׳', '.']) {
    assert.deepEqual(parseHeight(bad), { ok: false, reason: 'invalid' }, bad);
  }
});

test('evaluate: exact answers only, with the h and h+N hints', () => {
  assert.equal(evaluate('B', '120'), 'correct');
  assert.equal(evaluate('B', '120.0'), 'correct');
  assert.equal(evaluate('B', '119.9'), 'wrong');
  assert.equal(evaluate('B', '148'), 'gave-h');
  assert.equal(evaluate('B', '176'), 'added-n');
  assert.equal(evaluate('B', ''), 'empty');
  assert.equal(evaluate('B', 'x'), 'invalid');
  assert.equal(evaluate('A', '30'), 'correct');
  assert.equal(evaluate('A', '18'), 'gave-h');
  assert.equal(evaluate('A', '6'), 'added-n');
  assert.equal(evaluate('C', '220'), 'correct');
  assert.equal(isAttempt('empty'), false);
  assert.equal(isAttempt('invalid'), false);
  assert.equal(isAttempt('wrong'), true);
});

test('next station: B → A → C, skipping solved ones', () => {
  assert.deepEqual(STATION_ORDER, ['B', 'A', 'C']);
  assert.equal(FIRST_STATION, 'B');
  assert.equal(nextStation('B', new Set(['B'])), 'A');
  assert.equal(nextStation('A', new Set(['B', 'A'])), 'C');
  assert.equal(nextStation('B', new Set(['B', 'A'])), 'C');
  assert.equal(nextStation('C', new Set(['C'])), 'B');
  assert.equal(nextStation('C', new Set(['A', 'B', 'C'])), null);
});

test('state is kept per station; empty input is not an attempt; reset clears everything', () => {
  let s = initialMission('B');
  s = missionReducer(s, { type: 'check' });
  assert.equal(s.byStation.B.verdict, 'empty');
  assert.equal(s.byStation.B.attempts, 0);
  s = missionReducer(s, { type: 'edit', value: '148' });
  s = missionReducer(s, { type: 'check' });
  assert.equal(s.byStation.B.verdict, 'gave-h');
  assert.equal(s.byStation.B.attempts, 1);
  s = missionReducer(s, { type: 'select', id: 'A' });
  assert.equal(s.byStation.A.draft, '');
  assert.equal(s.byStation.A.verdict, null);
  s = missionReducer(s, { type: 'select', id: 'B' });
  assert.equal(s.byStation.B.draft, '148', 'the draft survives a trip to another station');
  s = missionReducer(s, { type: 'edit', value: '120' });
  s = missionReducer(s, { type: 'check' });
  assert.equal(s.byStation.B.solved, true);
  const frozen = missionReducer(s, { type: 'edit', value: '7' });
  assert.equal(frozen.byStation.B.draft, '120', 'a solved station keeps its answer');
  for (const [id, v] of [['A', '30'], ['C', '220']]) {
    s = missionReducer(s, { type: 'select', id });
    s = missionReducer(s, { type: 'edit', value: v });
    s = missionReducer(s, { type: 'check' });
  }
  assert.equal(solvedSet(s).size, 3);
  s = missionReducer(s, { type: 'reset', first: 'B' });
  assert.equal(s.station, 'B');
  assert.equal(solvedSet(s).size, 0);
  assert.equal(s.byStation.B.draft, '');
});

test('rendered landscape agrees with the station data (ground at each station = h − N, on the survey line)', () => {
  for (const id of ['A', 'B', 'C']) {
    const st = L.stations[id];
    assert.ok(Math.abs(st.heightM - orthometric(id)) < 1e-3, `${id} H ${st.heightM}`);
    assert.ok(Math.abs(st.x - STATIONS[id].x / L.mPerUnit) < 1e-9, `${id} x`);
    assert.ok(Math.abs(st.y - STATIONS[id].y / L.mPerUnit) < 1e-9, `${id} y`);
    assert.equal(st.y, L.lineY, `${id} stands on the survey line`);
    assert.ok(Math.abs(st.s - (STATIONS[id].x + (L.width / 2) * L.mPerUnit)) < 1e-6, `${id} s`);
    // the line samples pass through the station's height
    const i = Math.round(st.s / L.line.step);
    assert.ok(Math.abs(L.line.H[i] - st.heightM) < 1.5, `${id} line ${L.line.H[i]} vs ${st.heightM}`);
    assert.equal(L.line.visible[i], '1', `${id}: the camera sees the station`);
  }
  assert.ok(L.stations.C.s < L.stations.B.s && L.stations.B.s < L.stations.A.s, 'C → B → A along the line');
  assert.ok(L.line.H.at(-1) < 0, 'the line ends in the sea');
  assert.equal(L.line.H.length, L.line.N.length);
  assert.equal(L.line.H.length, L.line.visible.length);
});

test('the N field is exact at the stations, and the model stands on it', () => {
  assert.equal(L.nx, 1, 'N is drawn on the land’s own vertical scale');
  for (const id of ['A', 'B', 'C']) {
    assert.ok(Math.abs(undulationAt(STATIONS[id].x, STATIONS[id].y) - STATIONS[id].N) < 1e-6, `${id} N`);
    // the ground stands H above the geoid, which stands N above the flat ellipsoid (z = 0)
    assert.ok(Math.abs(L.stations[id].z - groundZ(L.stations[id].heightM, STATIONS[id].N)) < 1e-4, `${id} ground z`);
    assert.ok(Math.abs(geoidZ(STATIONS[id].N) - STATIONS[id].N * (L.ve / L.mPerUnit) * L.nx) < 1e-12, `${id} geoid z`);
    // one vertical scale for H, h and N on the model: the ground stands h above the ellipsoid
    assert.ok(Math.abs(L.stations[id].z - STATIONS[id].h * (L.ve / L.mPerUnit)) < 1e-4, `${id}: ground − ellipsoid = h`);
  }
  // the line's N samples are the same field
  const i = Math.round(L.stations.B.s / L.line.step);
  assert.ok(Math.abs(L.line.N[i] - undulationAt(STATIONS.B.x, STATIONS.B.y)) < 0.05, 'line N = field');
});

test('every rendered layer is on disk and inside the frame', () => {
  for (const [id, r] of Object.entries(LANDSCAPE_LAYERS)) {
    assert.ok(existsSync(`public/reference-assets/measurement-mission/${r.file}`), `${id} file`);
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= L.image.w && r.y + r.h <= L.image.h, `${id} placement`);
  }
});

for (const w of [612, 560]) {
  const size = { w, h: Math.round(w / LANDSCAPE_ASPECT) };

  test(`pins (${w} px): C, B, A left to right, inside the box with room for their heads`, () => {
    const pins = stationPins(size);
    assert.ok(pins.C.x < pins.B.x && pins.B.x < pins.A.x, 'left to right: C, B, A');
    for (const id of ['A', 'B', 'C']) {
      const p = pins[id];
      assert.ok(p.x > 20 && p.x < size.w - 20 && p.y > 44 && p.y < size.h - 10, `${id} at ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
    }
    // project() scales: the same point in a box twice as wide lands twice as far
    const q = project(stationWorld('B'), { w: size.w * 2, h: size.h * 2 });
    assert.ok(Math.abs(q.x - pins.B.x * 2) < 1e-6 && Math.abs(q.y - pins.B.y * 2) < 1e-6, 'uniform scaling');
  });

  for (const height of [210, 270]) {
    test(`section (${w} × ${height}): one scale each way; B under its pin; every arrow end follows the data`, () => {
      const pins = stationPins(size);
      const geo = sectionGeometry(size.w, height, { A: pins.A.x, B: pins.B.x, C: pins.C.x });
      assert.ok(Math.abs(geo.stations.B.x - pins.B.x) < 1e-6, 'B exactly below its pin');
      assert.ok(Math.abs(geo.stations.C.x - pins.C.x) < 40 && Math.abs(geo.stations.A.x - pins.A.x) < 40, 'C and A near their pins');
      const kH = (geo.stations.A.x - geo.stations.C.x) / (L.stations.A.s - L.stations.C.s);
      assert.ok(Math.abs(geo.stations.B.x - (geo.stations.C.x + (L.stations.B.s - L.stations.C.s) * kH)) < 1e-6, 'uniform horizontal scale');
      assert.ok(geo.kV <= geo.kH * SECTION_MAX_VE + 1e-9, 'never steeper than the cap');
      for (const id of ['A', 'B', 'C']) {
        const st = geo.stations[id];
        assert.ok(st.ground > 8 && st.ground < height, `${id} ground inside the section`);
        assert.ok(Math.abs(st.geoid - st.ground - geo.kV * L.stations[id].heightM) < 1e-6, `${id} H arrow`);
        assert.ok(Math.abs(st.ellipsoid - st.ground - geo.kV * STATIONS[id].h) < 1e-6, `${id} h arrow`);
        assert.equal(Math.sign(st.ellipsoid - st.geoid), Math.sign(STATIONS[id].N), `${id} N sign`);
      }
      const { A, B, C } = geo.stations;
      assert.ok(B.ellipsoid - B.ground > B.geoid - B.ground, 'B: h longer than H');
      assert.ok(A.geoid - A.ground > A.ellipsoid - A.ground, 'A: H longer than h');
      assert.ok(Math.abs(C.geoid - C.ellipsoid) < 1e-9, 'C: the surfaces meet');
      assert.ok(A.geoid - A.ground >= 14, `A's H arrow is long enough to read (${(A.geoid - A.ground).toFixed(1)} px)`);
    });
  }
}

// ================================================================ the turnable model (round 4)
// One view state per body drives the 3-D camera, the pins over it and the links to the section;
// the section is data along the survey line and never turns. These pin that contract down.
import { readFileSync } from 'node:fs';
import { MEASUREMENT_MODEL as MODEL } from '../../src/components/lessons/topic-02/measurementModel.data.ts';
import {
  LAND_START, LAND_LIMITS, landCamera, projectWith, livePins, heightGrid, groundAt, hiddenBy, framedView, stationArrows, clampLand,
} from '../../src/components/lessons/topic-02/measurementView.ts';
import { ELL_START, ELL_SIDE, ELL_TOP, PATCH, FLAT, ellipsoidFrame, patchView } from '../../src/components/lessons/topic-02/ellipsoidView.ts';
import { illustrationSplit, Z_PER_M, SECTION_H } from '../../src/components/lessons/topic-02/measurementLayout.ts';

const GRID = (() => {
  const b = readFileSync('public/reference-assets/measurement-mission/model-height.bin');
  return heightGrid(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
})();
const IDS = ['A', 'B', 'C'];
const VIEWS = [
  LAND_START,
  { az: -40, elev: 30 },
  { az: 35, elev: 70 },
  { az: LAND_LIMITS.az[0], elev: LAND_LIMITS.elev[0] },
  { az: LAND_LIMITS.az[1], elev: LAND_LIMITS.elev[1] },
  { az: LAND_LIMITS.az[1], elev: LAND_LIMITS.elev[0] },
];

test('the live camera at the opening view is the renders’ camera (the no-WebGL fallback registers with it)', () => {
  const size = { w: L.image.w, h: L.image.h };
  const cam = landCamera(LAND_START, size);
  for (const r of [0, 1, 3]) for (let c = 0; c < 4; c++) assert.ok(Math.abs(cam.matrix[r][c] - L.camera[r][c]) < 2e-3, `matrix[${r}][${c}]`);
  for (const id of IDS) {
    const a = projectWith(cam.matrix, stationWorld(id), size);
    const b = project(stationWorld(id), size);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.5, `${id}: ${a.x.toFixed(1)},${a.y.toFixed(1)} vs ${b.x.toFixed(1)},${b.y.toFixed(1)}`);
  }
});

test('the model’s height grid is the renders’ ground', () => {
  assert.equal(GRID.cols, MODEL.heights.cols);
  for (const id of IDS) assert.ok(Math.abs(groundAt(GRID, STATIONS[id].x, STATIONS[id].y) - L.stations[id].heightM) < 0.1, `${id} ground`);
  // the survey line's samples (10 m) are the grid's own row
  let worst = 0;
  L.line.H.forEach((H, i) => {
    worst = Math.max(worst, Math.abs(groundAt(GRID, (-L.width / 2) * L.mPerUnit + i * L.line.step, L.lineY * L.mPerUnit) - H));
  });
  assert.ok(worst < 0.06, `line vs grid ${worst.toFixed(3)} m`);
});

for (const size of [{ w: 614, h: 361 }, { w: 607, h: 392 }, { w: 520, h: 250 }]) {
  test(`turning (${size.w} × ${size.h}): the pins move with the model; the model stays whole, centred and large; nothing is stretched`, () => {
    const start = livePins(landCamera(LAND_START, size), size, null, false);
    for (const view of VIEWS) {
      for (const framing of [0, 1]) {
        const cam = landCamera(view, size, framing);
        const pins = livePins(cam, size, null, false);
        if (view !== LAND_START && framing === 0) {
          assert.ok(IDS.some((id) => Math.hypot(pins[id].x - start[id].x, pins[id].y - start[id].y) > 5), `${JSON.stringify(view)}: the anchors move`);
        }
        for (const id of IDS) {
          assert.ok(
            pins[id].x > 10 && pins[id].x < size.w - 10 && pins[id].y > 40 && pins[id].y < size.h - 6,
            `${JSON.stringify(view)}/${framing}: ${id} at ${pins[id].x.toFixed(0)},${pins[id].y.toFixed(0)}`,
          );
        }
        if (framing === 0) {
          // the whole model in frame, centred, filling the box one way
          const pts = MODEL.fit.map((p) => projectWith(cam.matrix, p, size));
          const x0 = Math.min(...pts.map((p) => p.x));
          const x1 = Math.max(...pts.map((p) => p.x));
          const y0 = Math.min(...pts.map((p) => p.y));
          const y1 = Math.max(...pts.map((p) => p.y));
          assert.ok(x0 >= -0.5 && x1 <= size.w + 0.5 && y0 >= -0.5 && y1 <= size.h + 0.5, `${JSON.stringify(view)}: in frame`);
          assert.ok(Math.abs((x0 + x1) / 2 - size.w / 2) < size.w * 0.02, `${JSON.stringify(view)}: centred`);
          assert.ok((x1 - x0) / size.w > 0.9 || (y1 - y0) / size.h > 0.85, `${JSON.stringify(view)}: fills the box`);
        }
        // one pixel scale across and up the screen at the target: the box's proportions never stretch the model
        const q = cam.target;
        const r = [cam.matrix[0][0], cam.matrix[0][1], cam.matrix[0][2]];
        const n = Math.hypot(...r);
        const u = [cam.matrix[1][0], cam.matrix[1][1], cam.matrix[1][2]];
        const m = Math.hypot(...u);
        const e = 1e-3;
        const a = projectWith(cam.matrix, q, size);
        const bx = projectWith(cam.matrix, [q[0] + (r[0] / n) * e, q[1] + (r[1] / n) * e, q[2] + (r[2] / n) * e], size);
        const by = projectWith(cam.matrix, [q[0] + (u[0] / m) * e, q[1] + (u[1] / m) * e, q[2] + (u[2] / m) * e], size);
        assert.ok(Math.abs(Math.hypot(bx.x - a.x, bx.y - a.y) / Math.hypot(by.x - a.x, by.y - a.y) - 1) < 1e-3, 'square pixels');
      }
    }
  });
}

test('turning never changes the data: station values, the section, the heights drawn in the model', () => {
  const before = JSON.stringify(STATIONS);
  const size = { w: 614, h: 361 };
  const startPins = livePins(landCamera(LAND_START, size), size, null, false);
  const at = { A: startPins.A.x, B: startPins.B.x, C: startPins.C.x };
  const geo0 = JSON.stringify(sectionGeometry(size.w, 214, at));
  for (const view of VIEWS) landCamera(view, size, 0.5);
  assert.equal(JSON.stringify(STATIONS), before, 'stations untouched');
  assert.equal(JSON.stringify(sectionGeometry(size.w, 214, at)), geo0, 'section untouched');
  for (const id of IDS) {
    const a = stationArrows(id);
    const len = (s) => (s[1][2] - s[0][2]) / Z_PER_M;
    assert.ok(Math.abs(len(a.h) - STATIONS[id].h) < 1e-3, `${id} h on the face`);
    assert.ok(Math.abs(len(a.N) - STATIONS[id].N) < 1e-3, `${id} N on the face`);
    assert.ok(Math.abs(len(a.H) - orthometric(id)) < 1e-3, `${id} H on the face`);
    assert.equal(a.N[0][2], 0, `${id}: N starts on the ellipsoid`);
    assert.equal(a.h[0][2], 0, `${id}: h starts on the ellipsoid`);
    assert.equal(a.H[0][2], a.N[1][2], `${id}: H starts on the geoid`);
  }
});

test('the limits: round to side-on at most, tilt never under the ground; the task framing keeps every angle in order', () => {
  const v = clampLand({ az: 500, elev: -40 });
  assert.equal(v.az, LAND_LIMITS.az[1]);
  assert.equal(v.elev, LAND_LIMITS.elev[0]);
  assert.ok(LAND_LIMITS.az[1] < 90 && LAND_LIMITS.az[0] > -90, 'never from behind (the section runs C → A left to right)');
  assert.ok(LAND_LIMITS.elev[0] > 0, 'never from below');
  let prev = -Infinity;
  for (let e = LAND_LIMITS.elev[0]; e <= LAND_LIMITS.elev[1]; e += 2) {
    const f = framedView({ az: 0, elev: e }, 1).elev;
    assert.ok(f >= LAND_LIMITS.elev[0] - 1e-9 && f <= e + 1e-9 && f > prev, `elev ${e} → ${f}`);
    prev = f;
  }
  assert.ok(Math.abs(framedView(LAND_START, 0).elev - LAND_START.elev) < 1e-12, 'no tilt outside the task view');
});

test('the task view frames the survey line: the stations spread wider, all in frame', () => {
  const size = { w: 614, h: 361 };
  const span = (f) => {
    const p = livePins(landCamera(LAND_START, size, f), size, null, false);
    return p.A.x - p.C.x;
  };
  assert.ok(span(1) > span(0) * 1.25, `${span(0).toFixed(0)} → ${span(1).toFixed(0)} px`);
});

test('what the ground hides: nothing from the opening view; the ridge from low angles; never a station on the open cut seen from the front', () => {
  const size = { w: 614, h: 361 };
  const eyeOf = (view, f = 0) => landCamera(view, size, f).eye;
  for (const id of IDS) assert.equal(hiddenBy(GRID, stationWorld(id), eyeOf(LAND_START), false), false, `${id} seen from the start`);
  let hidden = 0;
  for (let az = LAND_LIMITS.az[0]; az <= LAND_LIMITS.az[1]; az += 8) {
    for (const elev of [LAND_LIMITS.elev[0], 22]) {
      const eye = eyeOf({ az, elev });
      for (const id of IDS) {
        if (hiddenBy(GRID, stationWorld(id), eye, false)) hidden++;
        if (eye[1] < L.lineY) assert.equal(hiddenBy(GRID, stationWorld(id), eye, true), false, `${id} on the open cut from ${az}/${elev}`);
      }
    }
  }
  assert.ok(hidden > 0, 'some low angle puts a station behind the ground');
});

test('the ellipsoid: one transform for the body, the marked area and the callout to the section', () => {
  const W = 614;
  const Hh = 421;
  const side = ellipsoidFrame({ elev: ELL_SIDE, az: 0 }, W, Hh);
  const top = ellipsoidFrame({ elev: ELL_TOP, az: 0 }, W, Hh);
  assert.ok(Math.abs(side.ry - side.a * (1 - FLAT)) < 1e-9, 'side-on: the meridian ellipse, flattening shows');
  assert.ok(Math.abs(top.ry - top.a) < 1e-9, 'from above: a circle, no flattening');
  for (const view of [ELL_START, { elev: 40, az: -30 }, { elev: 75, az: 120 }]) {
    const F = ellipsoidFrame(view, W, Hh);
    const pv = patchView(view, W, Hh);
    const l0 = F.at(PATCH.lat, PATCH.lon - PATCH.half * 0.9);
    const l1 = F.at(PATCH.lat, PATCH.lon + PATCH.half * 0.9);
    assert.ok(Math.hypot(pv.line[0].x - l0.x, pv.line[0].y - l0.y) < 1e-9 && Math.hypot(pv.line[1].x - l1.x, pv.line[1].y - l1.y) < 1e-9, 'the callout leaves from the body’s own points');
  }
  const a = patchView(ELL_START, W, Hh);
  const b = patchView({ elev: ELL_START.elev, az: ELL_START.az - 30 }, W, Hh);
  assert.ok(Math.hypot(a.line[0].x - b.line[0].x, a.line[0].y - b.line[0].y) > 10, 'turning moves the area and the callout');
  assert.ok(a.focus < 0.3, `opening view: the area is off to the side (focus ${a.focus.toFixed(2)})`);
  const centred = patchView({ elev: 36, az: -PATCH.lon }, W, Hh);
  const F = ellipsoidFrame({ elev: 36, az: -PATCH.lon }, W, Hh);
  const mid = (centred.line[0].x + centred.line[1].x) / 2;
  assert.ok(centred.focus > 0.97 && Math.abs(mid - F.cx) < 0.05 * F.a, `turned to the middle: in focus (${centred.focus.toFixed(2)})`);
  const away = patchView({ elev: 16, az: 180 - PATCH.lon }, W, Hh);
  assert.ok(!away.front && away.focus === 0, 'round the back: hidden, out of focus');
  assert.ok(
    patchView({ elev: ELL_TOP, az: -PATCH.lon }, W, Hh).focus < patchView({ elev: 36, az: -PATCH.lon }, W, Hh).focus,
    'from straight above the area is seen at a slant',
  );
});

// the screen-fitted column at 1440 × 1122 / 900 / 800: header 80, card chrome 136, 12 px above and below
for (const [screen, width] of [
  [1122, 614],
  [900, 607],
  [800, 520],
]) {
  test(`one screen (1440 × ${screen}): every view's stage and section stay readable`, () => {
    const ill = Math.min(695, screen - 80 - 24 - 136);
    for (const mission of [false, true]) {
      const sp = illustrationSplit(ill, mission, 112);
      assert.ok(sp.stage >= 240, `stage ${sp.stage}`);
      assert.ok(sp.section >= (mission ? SECTION_H.mission[0] : SECTION_H.explain[0]), `section ${sp.section}`);
      const box = { w: width, h: sp.stage };
      const pins = livePins(landCamera(LAND_START, box, mission ? 1 : 0), box, null, false);
      const geo = sectionGeometry(width, sp.section, { A: pins.A.x, B: pins.B.x, C: pins.C.x });
      const { A, B } = geo.stations;
      assert.ok(Math.abs(B.x - pins.B.x) < 1e-6, 'B under its pin');
      assert.ok(A.geoid - A.ground >= 14, `A's H arrow ${(A.geoid - A.ground).toFixed(1)} px`);
      assert.ok(B.ellipsoid - B.geoid >= 12, `B's N arrow ${(B.ellipsoid - B.geoid).toFixed(1)} px`);
    }
  });
}
