// Unit tests for the topography viewer's pure layout math.
// Run: node --experimental-strip-types --test scripts/qa/topography-layout.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIEWBOX, COLLAR, sheetToWorld, heightToY, sheetRect, goalFor, radiusFor,
} from '../../src/components/lessons/topic-02/topographyLayout.ts';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('sheet corners map to world corners, north = -z', () => {
  assert.deepEqual(sheetToWorld(0, 0), [-2, -1.5]);
  assert.deepEqual(sheetToWorld(100, 75), [2, 1.5]);
  assert.deepEqual(sheetToWorld(50, 37.5), [0, 0]);
});

test('height uses datum 280 m and VE 2 at 350 m/unit', () => {
  close(heightToY(280), 0);
  close(heightToY(412), (132 * 2) / 350);
});

test('sheetRect keeps 4:3 and sits inside the container (width-bound)', () => {
  const r = sheetRect(620, 650);
  close(r.w / r.h, 4 / 3, 1e-9);
  assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 620 && r.y + r.h <= 650);
  close(r.scale, 620 / VIEWBOX.w);
  close(r.x, COLLAR * r.scale); // width-bound → no horizontal letterbox
});

test('sheetRect centres the whole viewBox when height-bound', () => {
  const r = sheetRect(1400, 500);
  close(r.scale, 500 / VIEWBOX.h);
  const left = (1400 - VIEWBOX.w * r.scale) / 2;
  close(r.x, left + COLLAR * r.scale);
});

test('top-down goal frames the neatline exactly', () => {
  const W = 620;
  const H = 650;
  const r = sheetRect(W, H);
  const g = goalFor('photo', W, H, 0.05);
  // Visible world height at the ground is 2·frameHalf; the neatline is 3 world units tall.
  close(2 * g.frameHalf * (r.h / H), 3, 1e-9);
  // The sheet centre must project onto the neatline centre.
  const wpp = (2 * g.frameHalf) / H;
  close(-g.target[0] / wpp, r.x + r.w / 2 - W / 2, 1e-6);
  close(-g.target[2] / wpp, r.y + r.h / 2 - H / 2, 1e-6);
  assert.ok(g.phi < 0.001 && g.fov <= 5);
});

test('radiusFor is frameHalf / tan(fov/2)', () => {
  close(radiusFor({ fov: 30, frameHalf: 2 }), 2 / Math.tan((15 * Math.PI) / 180));
});

test('3d goal looks from the south-south-east, perspective', () => {
  const g = goalFor('3d', 620, 650, 0.05);
  assert.ok(g.phi > 0.8 && g.phi < 1.2);
  assert.ok(g.theta > 0 && g.theta < 0.5);
  assert.equal(g.fov, 30);
});
