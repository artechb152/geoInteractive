// Unit tests for the measurement mission (#scene-coordinates → "אליפסואיד, גיאואיד וגליות"):
// answer checking, per-station state and station order; that the landscape's data, the section
// and the model's view math agree with the one station data file; and the 2026-10-12 contract —
// turning all the way round (angles across 0/360), the profile the surface view opens in, what
// hides a station from any side and nothing once the ground is see-through, and one marked area
// with one survey line shared by the ellipsoid, its enlargement and the section.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/measurement-mission.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { STATIONS, STATION_ORDER, FIRST_STATION } from '../../src/components/lessons/topic-02/measurementMission.data.ts';
import {
  orthometric, signed, workedSum, parseHeight, evaluate, isAttempt, nextStation,
  initialMission, missionReducer, solvedSet,
} from '../../src/components/lessons/topic-02/measurementMission.ts';
import { MEASUREMENT_LANDSCAPE as L } from '../../src/components/lessons/topic-02/measurementLandscape.data.ts';
import { MEASUREMENT_MODEL as MODEL } from '../../src/components/lessons/topic-02/measurementModel.data.ts';
import { MEASUREMENT_FALLBACK as FB } from '../../src/components/lessons/topic-02/measurementFallback.data.ts';
import {
  sectionGeometry, undulationAt, groundZ, geoidZ, stationWorld, SECTION, SECTION_MAX_VE, SURVEY_SPAN, spanAt, DISPLAY_VE, Z_SCALE, Z_PER_M, displayed,
} from '../../src/components/lessons/topic-02/measurementLayout.ts';
import {
  LAND_START, LAND_STARTS, LAND_ELEV, landCamera, projectWith, livePins, heightGrid, groundAt, hiddenBy,
  clampLand, sameView, nearView, wrapAz, surveyLine3D, surveyPlaneLines, FIT,
} from '../../src/components/lessons/topic-02/measurementView.ts';
import {
  ELL_START, ELL_SIDE, ELL_TOP, PATCH, FLAT, SPAN_U, LINE_V, ellipsoidFrame, footprintAt, patchView, zoomGeometry,
} from '../../src/components/lessons/topic-02/ellipsoidView.ts';

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


test('the landscape agrees with the station data (ground at each station = h − N, on the survey line)', () => {
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
    assert.ok(st.s > SURVEY_SPAN.s0 && st.s < SURVEY_SPAN.s1, `${id} inside the section's span`);
  }
  assert.ok(L.stations.C.s < L.stations.B.s && L.stations.B.s < L.stations.A.s, 'C → B → A along the line');
  assert.ok(L.line.H.at(-1) < 0, 'the line ends in the sea');
  assert.ok(L.line.H[Math.round(SURVEY_SPAN.s1 / L.line.step)] < 0, 'the span ends in the sea');
  assert.equal(L.line.H.length, L.line.N.length);
});

test('the N field is exact at the stations, and the model stands on it', () => {
  assert.equal(L.nx, 1, 'N is drawn on the land’s own vertical scale');
  for (const id of ['A', 'B', 'C']) {
    assert.ok(Math.abs(undulationAt(STATIONS[id].x, STATIONS[id].y) - STATIONS[id].N) < 1e-6, `${id} N`);
    // the ground stands H above the geoid, which stands N above the flat ellipsoid (z = 0) — drawn DISPLAY_VE×
    const z = stationWorld(id)[2];
    assert.ok(Math.abs(z - groundZ(L.stations[id].heightM, STATIONS[id].N)) < 1e-3, `${id} ground z`);
    assert.ok(Math.abs(geoidZ(STATIONS[id].N) - STATIONS[id].N * (DISPLAY_VE / L.mPerUnit) * L.nx) < 1e-12, `${id} geoid z`);
    // one vertical scale for H, h and N on the model: the ground stands h above the ellipsoid
    assert.ok(Math.abs(z - STATIONS[id].h * Z_PER_M) < 1e-12, `${id}: ground − ellipsoid = h`);
    // the landscape data (rendered at L.ve) and the model agree once drawn at the display scale
    assert.ok(Math.abs(displayed([0, 0, L.stations[id].z])[2] - z) < 1e-3, `${id}: the data's height, displayed`);
  }
  // the line's N samples are the same field
  const i = Math.round(L.stations.B.s / L.line.step);
  assert.ok(Math.abs(L.line.N[i] - undulationAt(STATIONS.B.x, STATIONS.B.y)) < 0.05, 'line N = field');
});

// ================================================================ the turnable model

const GRID = (() => {
  const b = readFileSync('public/reference-assets/measurement-mission/model-height.bin');
  return heightGrid(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
})();
const IDS = ['A', 'B', 'C'];
const sameMatrix = (a, b, eps = 1e-9) => a.every((row, r) => row.every((v, c) => Math.abs(v - b[r][c]) < eps));
/** Round the whole circle and past it, low to high, from the front, the sides and behind. */
const VIEWS = [];
for (const az of [0, 30, 90, 135, 180, 225, 270, 330, 405, -90, -200]) for (const elev of [LAND_ELEV[0], 5, 21, 55, LAND_ELEV[1]]) VIEWS.push({ az, elev });

test('the model’s height grid is the landscape’s ground', () => {
  assert.equal(GRID.cols, MODEL.heights.cols);
  for (const id of IDS) assert.ok(Math.abs(groundAt(GRID, STATIONS[id].x, STATIONS[id].y) - L.stations[id].heightM) < 0.1, `${id} ground`);
  // the survey line's samples (10 m) are the grid's own row
  let worst = 0;
  L.line.H.forEach((H, i) => {
    worst = Math.max(worst, Math.abs(groundAt(GRID, (-L.width / 2) * L.mPerUnit + i * L.line.step, L.lineY * L.mPerUnit) - H));
  });
  assert.ok(worst < 0.06, `line vs grid ${worst.toFixed(3)} m`);
});

test('turning is free all the way round: round is never limited or folded, tilt stays over the horizon', () => {
  assert.deepEqual(clampLand({ az: 500, elev: -40 }), { az: 500, elev: LAND_ELEV[0] });
  assert.deepEqual(clampLand({ az: -725, elev: 120 }), { az: -725, elev: LAND_ELEV[1] });
  assert.ok(LAND_ELEV[0] > 0, 'never from below');
  assert.ok(LAND_ELEV[0] <= LAND_START.elev, 'the profile is inside the tilt range');
  const size = { w: 500, h: 286 };
  // a whole turn in arrow-key steps (10°) from the profile, then on past 360
  let v = LAND_START;
  const first = landCamera(v, size);
  for (let k = 1; k <= 36; k++) {
    v = clampLand({ az: v.az - 10, elev: v.elev });
    const cam = landCamera(v, size);
    assert.ok(cam.matrix.flat().every(Number.isFinite), `step ${k}: a finite camera`);
  }
  assert.equal(v.az, LAND_START.az - 360, 'a full turn, not folded back');
  assert.ok(sameMatrix(landCamera(v, size).matrix, first.matrix), 'a full turn is the same camera');
  for (const view of [{ az: 30, elev: 21 }, { az: 200, elev: 9 }]) {
    assert.ok(sameMatrix(landCamera({ az: view.az + 720, elev: view.elev }, size).matrix, landCamera(view, size).matrix), `${view.az} + 720`);
  }
});

test('angles across 0/360: the same view on any turn, and a glide back takes the short way', () => {
  assert.ok(sameView({ az: 359.98, elev: 5 }, { az: 0.01, elev: 5 }));
  assert.ok(sameView({ az: 360, elev: 21 }, { az: 0, elev: 21 }));
  assert.ok(sameView({ az: 725, elev: 9 }, { az: 5, elev: 9 }));
  assert.ok(sameView({ az: -350, elev: 9 }, { az: 10, elev: 9 }));
  assert.ok(!sameView({ az: 180, elev: 5 }, { az: 0, elev: 5 }));
  assert.equal(wrapAz(350), -10);
  assert.equal(wrapAz(-190), 170);
  assert.equal(nearView({ az: 350, elev: 30 }, { az: 0, elev: 5 }).az, 360);
  assert.equal(nearView({ az: 10, elev: 30 }, { az: 350, elev: 5 }).az, -10);
  assert.deepEqual(nearView({ az: 725, elev: 40 }, LAND_START), { az: 720, elev: LAND_START.elev });
  for (let from = -900; from <= 900; from += 37) {
    for (const to of Object.values(LAND_STARTS)) {
      const g = nearView({ az: from, elev: 30 }, to);
      assert.ok(Math.abs(g.az - from) <= 180 + 1e-9, `${from} → ${to.az}: ${g.az}`);
      assert.ok(sameView(g, to), `${from} → ${to.az}: the same view`);
    }
  }
});

test('the surface view opens in profile: square to the survey line, a few degrees over the horizon', () => {
  assert.equal(LAND_STARTS.surface, LAND_START);
  // low enough to read like the section, high enough for the survey line to show on the ground
  assert.ok(LAND_START.elev > 0 && LAND_START.elev <= 10, `elev ${LAND_START.elev}`);
  const size = { w: 500, h: 286 };
  const cam = landCamera(LAND_START, size);
  const d = [cam.target[0] - cam.eye[0], cam.target[1] - cam.eye[1], cam.target[2] - cam.eye[2]];
  const n = Math.hypot(...d);
  assert.ok(Math.abs(d[0] / n) < 1e-9, 'it looks square to the survey line (the line runs along x)');
  assert.ok(d[1] > 0, 'from the front');
  assert.ok(Math.abs((Math.asin(-d[2] / n) * 180) / Math.PI - LAND_START.elev) < 1e-9, 'its tilt');
  const pins = livePins(cam, size, GRID);
  assert.ok(pins.C.x < pins.B.x && pins.B.x < pins.A.x, 'C, B, A left to right, as in the section');
  for (const id of IDS) assert.equal(pins[id].hidden, false, `${id} in sight`);
  // the scale does not jump between the profile and a raised view: the model fills the same width
  const width = (view) => {
    const c = landCamera(view, size);
    const xs = FIT.map((p) => projectWith(c.matrix, p, size).x);
    return Math.max(...xs) - Math.min(...xs);
  };
  for (const view of [LAND_STARTS.geoid, LAND_STARTS.undulation, { az: 0, elev: 55 }]) {
    assert.ok(Math.abs(width(view) / width(LAND_START) - 1) < 0.08, `${JSON.stringify(view)}: ${width(view).toFixed(0)} vs ${width(LAND_START).toFixed(0)} px`);
  }
});

test('each landscape view opens a whole number of arrow-key steps from the profile (the stills are taken that way)', () => {
  for (const [tab, v] of Object.entries(LAND_STARTS)) {
    assert.ok(Math.abs((v.az - LAND_START.az) % 10) < 1e-9, `${tab} round`);
    assert.ok(Math.abs((v.elev - LAND_START.elev) % 8) < 1e-9, `${tab} tilt`);
    assert.ok(v.elev >= LAND_ELEV[0] && v.elev <= LAND_ELEV[1], `${tab} inside the tilt range`);
  }
});

for (const size of [{ w: 500, h: 286 }, { w: 500, h: 186 }, { w: 458, h: 174 }]) {
  test(`turning (${size.w} × ${size.h}): the pins move with the model; the model stays whole, centred and large; nothing is stretched`, () => {
    const start = livePins(landCamera(LAND_START, size), size, null);
    for (const view of VIEWS) {
      const cam = landCamera(view, size);
      const pins = livePins(cam, size, null);
      const tag = `${view.az}/${view.elev}`;
      // a real turn (not a nudge of a few degrees) moves the anchors on screen
      if (Math.abs(wrapAz(view.az - LAND_START.az)) >= 20 || Math.abs(view.elev - LAND_START.elev) >= 15) {
        assert.ok(IDS.some((id) => Math.hypot(pins[id].x - start[id].x, pins[id].y - start[id].y) > 5), `${tag}: the anchors move`);
      }
      for (const id of IDS) assert.ok(pins[id].x > 4 && pins[id].x < size.w - 4 && pins[id].y > 0 && pins[id].y < size.h, `${tag}: ${id} at ${pins[id].x.toFixed(0)},${pins[id].y.toFixed(0)}`);
      // the whole model in frame, centred, filling the box one way
      const pts = FIT.map((p) => projectWith(cam.matrix, p, size));
      const x0 = Math.min(...pts.map((p) => p.x));
      const x1 = Math.max(...pts.map((p) => p.x));
      const y0 = Math.min(...pts.map((p) => p.y));
      const y1 = Math.max(...pts.map((p) => p.y));
      assert.ok(x0 >= -0.5 && x1 <= size.w + 0.5 && y0 >= -0.5 && y1 <= size.h + 0.5, `${tag}: in frame`);
      assert.ok(Math.abs((x0 + x1) / 2 - size.w / 2) < size.w * 0.02, `${tag}: centred`);
      assert.ok((x1 - x0) / size.w > 0.9 || (y1 - y0) / size.h > 0.85, `${tag}: fills the box`);
      // one pixel scale across and up the screen at the target: the box's proportions never stretch the model
      const q = cam.target;
      const r = [cam.matrix[0][0], cam.matrix[0][1], cam.matrix[0][2]];
      const u = [cam.matrix[1][0], cam.matrix[1][1], cam.matrix[1][2]];
      const e = 1e-3;
      const a = projectWith(cam.matrix, q, size);
      const bx = projectWith(cam.matrix, q.map((c, i) => c + (r[i] / Math.hypot(...r)) * e), size);
      const by = projectWith(cam.matrix, q.map((c, i) => c + (u[i] / Math.hypot(...u)) * e), size);
      assert.ok(Math.abs(Math.hypot(bx.x - a.x, bx.y - a.y) / Math.hypot(by.x - a.x, by.y - a.y) - 1) < 1e-3, `${tag}: square pixels`);
    }
  });
}

test('what hides a station, from any side: nothing in the profile, the ground from behind, nothing once the ground is see-through', () => {
  const size = { w: 500, h: 286 };
  for (const id of IDS) assert.equal(hiddenBy(GRID, stationWorld(id), landCamera(LAND_START, size).eye), false, `${id} seen in the profile`);
  let behind = 0;
  for (let az = 150; az <= 210; az += 15) {
    for (const elev of [5, 13, 21]) {
      const cam = landCamera({ az, elev }, size);
      behind += IDS.filter((id) => hiddenBy(GRID, stationWorld(id), cam.eye)).length;
    }
  }
  assert.ok(behind > 0, 'seen from behind, the ridge hides some station');
  for (const view of VIEWS) {
    const cam = landCamera(view, size);
    const clear = livePins(cam, size, GRID, true);
    for (const id of IDS) assert.equal(clear[id].hidden, false, `${view.az}/${view.elev}: ${id} with the ground see-through`);
  }
  const top = landCamera({ az: 200, elev: LAND_ELEV[1] }, size);
  for (const id of IDS) assert.equal(hiddenBy(GRID, stationWorld(id), top.eye), false, `${id} from almost straight down`);
});

test('turning never changes the data: the station values and the section stay as they are', () => {
  const before = JSON.stringify(STATIONS);
  const geo0 = JSON.stringify(sectionGeometry(462, 214));
  for (const view of VIEWS) livePins(landCamera(view, { w: 500, h: 286 }), { w: 500, h: 286 }, GRID);
  for (const view of [ELL_START, { elev: 40, az: 390 }]) patchView(view, 500, 286);
  assert.equal(JSON.stringify(STATIONS), before, 'stations untouched');
  assert.equal(JSON.stringify(sectionGeometry(462, 214)), geo0, 'section untouched');
});

for (const width of [462, 500]) {
  for (const height of [200, 214, 312]) {
    test(`section (${width} × ${height}): the survey span end to end, one scale each way; every arrow end follows the data`, () => {
      const geo = sectionGeometry(width, height);
      const left = SECTION.plotLeft;
      const right = width - SECTION.padRight;
      assert.ok(Math.abs(geo.spanEnds[0].x - left) < 0.75 && Math.abs(geo.spanEnds[1].x - right) < 0.75, 'the span fills the plot');
      for (const id of IDS) {
        const st = geo.stations[id];
        assert.ok(Math.abs(st.x - (left + spanAt(L.stations[id].s) * (right - left))) < 1e-6, `${id}: one horizontal scale`);
        assert.ok(st.ground > SECTION.padTop - 6 && st.ground < height, `${id} ground inside the section, room for its pin`);
        assert.ok(Math.abs(st.geoid - st.ground - geo.kV * L.stations[id].heightM) < 1e-6, `${id} H arrow`);
        assert.ok(Math.abs(st.ellipsoid - st.ground - geo.kV * STATIONS[id].h) < 1e-6, `${id} h arrow`);
        assert.equal(Math.sign(st.ellipsoid - st.geoid), Math.sign(STATIONS[id].N), `${id} N sign`);
      }
      assert.ok(geo.kV <= geo.kH * SECTION_MAX_VE + 1e-9, 'never steeper than the cap');
      const { A, B, C } = geo.stations;
      assert.ok(C.x < B.x && B.x < A.x, 'C → B → A left to right');
      assert.ok(B.ellipsoid - B.ground > B.geoid - B.ground, 'B: h longer than H');
      assert.ok(A.geoid - A.ground > A.ellipsoid - A.ground, 'A: H longer than h');
      assert.ok(Math.abs(C.geoid - C.ellipsoid) < 1e-9, 'C: the surfaces meet');
      assert.ok(A.geoid - A.ground >= 14, `A's H arrow is long enough to read (${(A.geoid - A.ground).toFixed(1)} px)`);
      assert.ok(B.ellipsoid - B.geoid >= 12, `B's N arrow is long enough to read (${(B.ellipsoid - B.geoid).toFixed(1)} px)`);
      assert.ok(A.ellipsoid - A.ground >= 9, `A's h arrow is long enough to read (${(A.ellipsoid - A.ground).toFixed(1)} px)`);
    });
  }
}

test('one display mapping: model and section draw heights DISPLAY_VE×, the line as long, the relief as high (the opening views)', () => {
  // the layout at 1440 × 1122: model stage 500 × 286, section 462 × 312
  const box = { w: 500, h: 286 };
  const geo = sectionGeometry(462, 312);
  const spanPx = 462 - SECTION.plotLeft - SECTION.padRight;
  assert.ok(Math.abs(geo.kV / geo.kH - DISPLAY_VE) < 1e-9, `the section draws ${(geo.kV / geo.kH).toFixed(2)}×`);
  assert.ok(Math.abs(Z_SCALE - DISPLAY_VE / L.ve) < 1e-12 && Math.abs(Z_PER_M - DISPLAY_VE / L.mPerUnit) < 1e-12, 'the model draws DISPLAY_VE× too');
  for (const view of Object.values(LAND_STARTS)) {
    const cam = landCamera(view, box, spanPx);
    const tag = `${view.az}/${view.elev}`;
    const ends = [SURVEY_SPAN.s0, SURVEY_SPAN.s1].map((s) => projectWith(cam.matrix, [s / L.mPerUnit - L.width / 2, L.lineY, 0], box));
    const len = Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y);
    assert.ok(len <= spanPx * 1.01, `${tag}: the line no longer than in the section (${len.toFixed(0)} vs ${spanPx} px)`);
    // the whole model still in frame
    const pts = FIT.map((p) => projectWith(cam.matrix, p, box));
    assert.ok(pts.every((p) => p.x >= -0.5 && p.x <= box.w + 0.5 && p.y >= -0.5 && p.y <= box.h + 0.5), `${tag}: in frame`);
  }
  // in the profile the line is exactly as long, and C stands as high over A as in the section
  const cam = landCamera(LAND_START, box, spanPx);
  const pins = livePins(cam, box, null);
  const ends = [SURVEY_SPAN.s0, SURVEY_SPAN.s1].map((s) => projectWith(cam.matrix, [s / L.mPerUnit - L.width / 2, L.lineY, 0], box));
  assert.ok(Math.abs(ends[1].x - ends[0].x - spanPx) / spanPx < 0.02, `profile: the line ${(ends[1].x - ends[0].x).toFixed(0)} px, the section's ${spanPx} px`);
  const model = pins.A.y - pins.C.y;
  const section = geo.stations.A.ground - geo.stations.C.ground;
  assert.ok(Math.abs(model / section - 1) < 0.08, `profile: C over A ${model.toFixed(0)} px in the model, ${section.toFixed(0)} px in the section`);
  // without the section beside it (no registration) the model just fits its box
  const free = landCamera(LAND_START, box);
  const fx = FIT.map((p) => projectWith(free.matrix, p, box).x);
  assert.ok(Math.max(...fx) - Math.min(...fx) >= box.w * 0.9, 'unregistered: it fills the box');
});

test('the model draws the section’s line, and while see-through its two reference lines, over the same span', () => {
  const x = (s) => s / L.mPerUnit - L.width / 2;
  const line = surveyLine3D();
  assert.ok(Math.abs(line[0][0] - x(SURVEY_SPAN.s0)) < 1e-9 && Math.abs(line.at(-1)[0] - x(SURVEY_SPAN.s1)) < 1e-9, 'the dashed line spans the section');
  assert.ok(line.every((p) => p[1] === L.lineY), 'along the survey line');
  const plane = surveyPlaneLines();
  assert.equal(plane.geoid.length, line.length);
  plane.geoid.forEach((p, k) => {
    const i = Math.round((SURVEY_SPAN.s0 + k * L.line.step) / L.line.step);
    assert.ok(Math.abs(p[2] - geoidZ(L.line.N[i])) < 1e-12, 'geoid z = N');
  });
  assert.ok(plane.ellipsoid.every((p) => p[2] === 0), 'the flat ellipsoid');
});

// ================================================================ the ellipsoid and its marked area

test('the ellipsoid: side-on the flattening shows, from above it does not', () => {
  const side = ellipsoidFrame({ elev: ELL_SIDE, az: 0 }, 500, 286);
  const top = ellipsoidFrame({ elev: ELL_TOP, az: 0 }, 500, 286);
  assert.ok(Math.abs(side.ry - side.a * (1 - FLAT)) < 1e-9, 'side-on: the meridian ellipse');
  assert.ok(Math.abs(top.ry - top.a) < 1e-9, 'from above: a circle');
});

test('one marked area and one line: the body, the enlargement and the section share the survey span', () => {
  const D = L.depth * L.mPerUnit;
  assert.deepEqual(SPAN_U, [SURVEY_SPAN.s0 / (L.width * L.mPerUnit), SURVEY_SPAN.s1 / (L.width * L.mPerUnit)]);
  assert.ok(Math.abs(LINE_V - (L.lineY + L.depth / 2) / L.depth) < 1e-12, 'the line crosses the area where it crosses the landscape');
  const aspect = (PATCH.halfLon * Math.cos((PATCH.lat * Math.PI) / 180)) / PATCH.halfLat;
  assert.ok(Math.abs(aspect / ((SURVEY_SPAN.s1 - SURVEY_SPAN.s0) / D) - 1) < 0.01, `the area keeps its proportions on the body (${aspect.toFixed(3)})`);
  // on the body: the line's ends are the area's own points, from any angle
  for (const view of [ELL_START, { elev: 40, az: -30 }, { elev: 75, az: 480 }]) {
    const F = ellipsoidFrame(view, 500, 286);
    const pv = patchView(view, 500, 286);
    [0, 1].forEach((i) => {
      const p = footprintAt(F, SPAN_U[i], LINE_V);
      assert.ok(Math.hypot(pv.line[i].x - p.x, pv.line[i].y - p.y) < 1e-9, `${JSON.stringify(view)}: line end ${i}`);
    });
  }
  const open = patchView(ELL_START, 500, 286);
  assert.ok(open.front && open.facing > 0.3, `the area is in sight at the opening view (facing ${open.facing.toFixed(2)})`);
  assert.ok(open.line[0].x < open.line[1].x, 'C’s end on the left, as in the section');
  assert.ok(!patchView({ elev: 16, az: 180 - PATCH.lon }, 500, 286).front, 'round the back it is out of sight');
  // the enlargement over the section: the line's ends right above the section's ends, the stations at the same places
  // — from every angle of the body: the enlargement takes the body's angle
  const VIEWS = [ELL_START, { elev: ELL_SIDE, az: -28 }, { elev: ELL_TOP, az: 300 }, { elev: 16, az: 0 }, { elev: 16, az: -70 }, { elev: 16, az: 180 - PATCH.lon }, { elev: 45, az: 90 }];
  for (const width of [462, 500]) {
    for (const z of [118, 137, 200]) for (const view of VIEWS) {
      const plot = { left: SECTION.plotLeft, right: width - SECTION.padRight };
      const zoom = zoomGeometry(z, plot, view);
      const geo = sectionGeometry(width, 180);
      assert.equal(zoom.line[0].y, zoom.line[1].y, 'the line runs straight across');
      [0, 1].forEach((i) => assert.ok(Math.abs(zoom.line[i].x - geo.spanEnds[i].x) < 0.75, `${width}/${z}: end ${i} over the section's end`));
      for (const id of IDS) assert.ok(Math.abs(zoom.stations[id].x - geo.stations[id].x) < 1, `${width}/${z}: ${id} over its place in the section`);
      assert.ok(zoom.box.x >= 0 && zoom.box.x + zoom.box.w <= width && zoom.box.y >= 0 && zoom.box.y + zoom.box.h <= z, `${width}/${z}: inside its box`);
      const under = zoom.patch(SPAN_U[0], 0);
      assert.ok(under.y > zoom.terrain(SPAN_U[0], 0).y, 'the ellipsoid sheet lies under the ground layer');
    }
  }
  // turning the body moves the area and the angle the enlargement shows it from; the section does not turn
  const a = patchView(ELL_START, 500, 286);
  const b = patchView({ elev: ELL_START.elev, az: ELL_START.az - 30 }, 500, 286);
  assert.ok(Math.hypot(a.line[0].x - b.line[0].x, a.line[0].y - b.line[0].y) > 10, 'turning moves the marked area on the body');
  const plot = { left: SECTION.plotLeft, right: 500 - SECTION.padRight };
  const depth = (view) => zoomGeometry(137, plot, view).box.h;
  assert.equal(zoomGeometry(137, plot).box.h, depth(ELL_START), 'the opening view is the default');
  assert.ok(depth({ elev: 16, az: -60 }) > depth(ELL_START) + 2, 'faced more squarely, the layer opens');
  assert.ok(depth({ elev: 16, az: 10 }) < depth(ELL_START) - 4, 'turned towards edge-on, it flattens');
  const lean = (view) => zoomGeometry(137, plot, view).terrain(SPAN_U[0], 1).x - zoomGeometry(137, plot, view).terrain(SPAN_U[0], 0).x;
  assert.ok(lean(ELL_START) < 0 && Math.abs(lean({ elev: ELL_TOP, az: -28 })) < 1e-6, 'the back edge leans left at the opening view, not at all from straight above');
});

// ================================================================ without WebGL

test('the no-WebGL stills: on disk, one frame, registered with the profile camera', () => {
  for (const file of Object.values(FB.files)) assert.ok(existsSync(`public/reference-assets/measurement-mission/${file}`), file);
  assert.deepEqual(Object.keys(FB.files).sort(), ['clear', 'land', 'task-A', 'task-B', 'task-C']);
  const cam = landCamera(LAND_START, FB.frame);
  const pins = livePins(cam, FB.frame, GRID);
  for (const id of IDS) {
    assert.ok(pins[id].x > 0 && pins[id].x < FB.frame.w && pins[id].y > 0 && pins[id].y < FB.frame.h, `${id} inside the still`);
    assert.equal(pins[id].hidden, false, `${id} in sight`);
  }
  // the stills scale: the same camera in a box twice as large puts every pin twice as far
  const big = { w: FB.frame.w * 2, h: FB.frame.h * 2 };
  const p2 = livePins(landCamera(LAND_START, big), big, null);
  for (const id of IDS) assert.ok(Math.abs(p2[id].x - pins[id].x * 2) < 1e-6 && Math.abs(p2[id].y - pins[id].y * 2) < 1e-6, `${id} scales`);
});
