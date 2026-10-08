// Unit tests for the lesson-6 "מצפן ומפה" geometry (compassMapGeometry.ts).
// Run: node --experimental-strip-types --test scripts/qa/compass-map.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AZIMUTH_START, normDeg, backAzimuth, formatDeg, backEquation, shortestTurn, polar,
  compassLayout, COMPASS_RINGS, COMPASS_VIEW, mapLayout, MAP_A, MAP_R, MAP_W, MAP_H, MAP_MARGIN,
  MAP_NORTH_BOX, MAP_SCALE_BOX, MAP_LABEL, boxesOverlap, segmentHitsBox, metresToUnits,
} from '../../src/components/lessons/topic-06/compassMapGeometry.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const SWEEP = Array.from({ length: 720 }, (_, i) => i / 2); // every half degree

test('opening state: 047°, back 227°, equation 047° + 180° = 227°', () => {
  assert.equal(AZIMUTH_START, 47);
  assert.equal(formatDeg(AZIMUTH_START), '047°');
  assert.equal(formatDeg(backAzimuth(AZIMUTH_START)), '227°');
  assert.deepEqual(backEquation(47), { azimuth: 47, op: '+', back: 227 });
});

test('back azimuth = (a + 180) % 360 at the cardinal points and the wrap', () => {
  for (const [a, b] of [[0, 180], [90, 270], [180, 0], [270, 90], [359, 179], [1, 181], [179, 359]]) {
    assert.equal(backAzimuth(a), b, `back(${a})`);
  }
  for (let a = 0; a < 360; a++) assert.equal(backAzimuth(a), (a + 180) % 360);
});

test('equation: +180° below 180°, −180° from 180° up; result always 0–359', () => {
  for (let a = 0; a < 360; a++) {
    const e = backEquation(a);
    assert.equal(e.op, a < 180 ? '+' : '−', `op at ${a}`);
    assert.equal(e.back, backAzimuth(a), `result at ${a}`);
    assert.ok(e.back >= 0 && e.back <= 359);
  }
  assert.deepEqual(backEquation(180), { azimuth: 180, op: '−', back: 0 });
  assert.deepEqual(backEquation(0), { azimuth: 0, op: '+', back: 180 });
});

test('formatting: three digits, wraps 359.6 → 000°', () => {
  assert.equal(formatDeg(0), '000°');
  assert.equal(formatDeg(9), '009°');
  assert.equal(formatDeg(359), '359°');
  assert.equal(formatDeg(359.6), '000°');
  assert.equal(formatDeg(-1), '359°');
  assert.equal(normDeg(-90), 270);
});

test('shortest turn crosses north the short way (359° → 0° is +1°)', () => {
  assert.equal(shortestTurn(359, 0), 1);
  assert.equal(shortestTurn(0, 359), -1);
  assert.equal(shortestTurn(350, 10), 20);
  assert.equal(shortestTurn(10, 190), 180);
});

test('screen polar: north up, east right, 047° slope = tan 47°', () => {
  const c = { x: 0, y: 0 };
  const n = polar(c, 10, 0), e = polar(c, 10, 90), s = polar(c, 10, 180), w = polar(c, 10, 270);
  close(n.x, 0, 1e-9); close(n.y, -10, 1e-9);
  close(e.x, 10, 1e-9); close(e.y, 0, 1e-9);
  close(s.x, 0, 1e-9); close(s.y, 10, 1e-9);
  close(w.x, -10, 1e-9); close(w.y, 0, 1e-9);
  const b = mapLayout(47).B;
  close((b.x - MAP_A.x) / -(b.y - MAP_A.y), Math.tan((47 * Math.PI) / 180), 1e-9, 'Δx/(−Δy)');
  close(Math.hypot(b.x - MAP_A.x, b.y - MAP_A.y), MAP_R, 1e-9, '|AB|');
});

test('map: B and every label stay on the sheet and clear of each other at every angle', () => {
  const inside = (bx) =>
    bx.x >= MAP_MARGIN && bx.y >= MAP_MARGIN && bx.x + bx.w <= MAP_W - MAP_MARGIN && bx.y + bx.h <= MAP_H - MAP_MARGIN;
  const dotBox = (p) => ({ x: p.x - MAP_LABEL.dotR - 2, y: p.y - MAP_LABEL.dotR - 2, w: 2 * MAP_LABEL.dotR + 4, h: 2 * MAP_LABEL.dotR + 4 });
  for (const a of SWEEP) {
    const L = mapLayout(a);
    const labels = { fwd: L.fwdLabel, back: L.backLabel, b: L.bLabel, a: L.aLabel };
    for (const [k, bx] of Object.entries(labels)) {
      assert.ok(inside(bx), `${k} label off the sheet at ${a}°: ${JSON.stringify(bx)}`);
      assert.ok(!boxesOverlap(bx, MAP_NORTH_BOX, 2), `${k} label on the north arrow at ${a}°`);
      assert.ok(!boxesOverlap(bx, MAP_SCALE_BOX, 2), `${k} label on the scale bar at ${a}°`);
      assert.ok(!segmentHitsBox(L.A, L.B, bx, 1), `${k} label crosses A→B at ${a}°`);
      assert.ok(!segmentHitsBox(L.A, L.backTip, bx, 1), `${k} label crosses the back ray at ${a}°`);
      assert.ok(!boxesOverlap(bx, dotBox(L.A)), `${k} label on dot A at ${a}°`);
      assert.ok(!boxesOverlap(bx, dotBox(L.B)), `${k} label on dot B at ${a}°`);
    }
    const keys = Object.keys(labels);
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++)
        assert.ok(!boxesOverlap(labels[keys[i]], labels[keys[j]], 2), `${keys[i]} × ${keys[j]} overlap at ${a}°`);
    for (const p of [L.B, L.backTip]) {
      assert.ok(p.x > MAP_MARGIN && p.x < MAP_W - MAP_MARGIN && p.y > MAP_MARGIN && p.y < MAP_H - MAP_MARGIN, `point off the sheet at ${a}°`);
      assert.ok(!segmentHitsBox(L.A, p, MAP_NORTH_BOX, 2) && !segmentHitsBox(L.A, p, MAP_SCALE_BOX, 2), `ray hits sheet furniture at ${a}°`);
    }
  }
});

test('compass: both degree labels sit outside the rim, inside the square vertically', () => {
  for (const a of SWEEP) {
    const L = compassLayout(a);
    for (const [k, bx] of [['fwd', L.fwdLabel], ['back', L.backLabel]]) {
      // nearest point of the box to the centre is beyond the rim
      const nx = Math.max(bx.x, Math.min(0, bx.x + bx.w));
      const ny = Math.max(bx.y, Math.min(0, bx.y + bx.h));
      assert.ok(Math.hypot(nx, ny) >= COMPASS_RINGS.rim + 3, `${k} label touches the rim at ${a}°`);
      assert.ok(bx.y >= -COMPASS_VIEW && bx.y + bx.h <= COMPASS_VIEW, `${k} label leaves the square vertically at ${a}°`);
      // sideways it may reach into the card padding / column gap, by at most 12 units (≈ 17 px)
      assert.ok(bx.x >= -COMPASS_VIEW - 12 && bx.x + bx.w <= COMPASS_VIEW + 12, `${k} label too far sideways at ${a}°`);
    }
    assert.ok(!boxesOverlap(L.fwdLabel, L.backLabel), `labels overlap at ${a}°`);
  }
});

test('scale bar: 1,000 m = 100 units on the 10 m/unit sheet', () => {
  assert.equal(metresToUnits(1000), 100);
  assert.equal(metresToUnits(500), 50);
});
