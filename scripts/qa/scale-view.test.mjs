// Unit tests for the sheet viewport's zoom/pan math.
// Run: node --experimental-strip-types --test scripts/qa/scale-view.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITY, clampView, zoomAt, panView, screenToUnits } from '../../src/components/lessons/topic-02/scale/viewMath.ts';

const S = 600;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('clamp keeps k in range and never shows empty space', () => {
  assert.deepEqual(clampView({ k: 0.5, x: 10, y: 10 }, S, 1, 3), { k: 1, x: 0, y: 0 });
  const v = clampView({ k: 2, x: -5000, y: 50 }, S, 1, 3);
  assert.deepEqual(v, { k: 2, x: S - S * 2, y: 0 });
});

test('zoomAt keeps the anchor point fixed', () => {
  const before = screenToUnits(IDENTITY, 150, 420, S);
  const v = zoomAt(IDENTITY, 2, 150, 420, S, 1, 3);
  const after = screenToUnits(v, 150, 420, S);
  close(after.x, before.x);
  close(after.y, before.y);
  assert.equal(v.k, 2);
});

test('panning at k=1 is a no-op; at k=2 it moves and clamps', () => {
  assert.deepEqual(panView(IDENTITY, 40, -40, S, 1, 3), IDENTITY);
  const v = panView({ k: 2, x: -300, y: -300 }, 40, -40, S, 1, 3);
  assert.deepEqual(v, { k: 2, x: -260, y: -340 });
});

test('screenToUnits maps the centre to 500,500 at identity', () => {
  assert.deepEqual(screenToUnits(IDENTITY, 300, 300, S), { x: 500, y: 500 });
});

test('nestIn keeps a smaller rect in sight, then holds the view inside it', async () => {
  const { nestIn } = await import('../../src/components/lessons/topic-02/scale/viewMath.ts');
  const R = [400, 400, 600, 600];
  const units = (v) => ({ ...screenToUnits(v, 0, 0, S), w: 1000 / v.k });
  // k = 4 (250-unit view) showing 450..700 on both axes: the rect's left/top edge is cut off.
  const a = units(nestIn({ k: 4, x: (-450 / 1000) * S * 4, y: (-450 / 1000) * S * 4 }, R, S));
  close(a.x, 400);
  close(a.y, 400);
  // k = 6 (167-unit view) at x 300 (outside) and y 420 (inside): only x moves.
  const b = units(nestIn({ k: 6, x: (-300 / 1000) * S * 6, y: (-420 / 1000) * S * 6 }, R, S));
  close(b.x, 400);
  close(b.y, 420);
  // Already nested: untouched.
  const v = { k: 2, x: (-300 / 1000) * S * 2, y: (-300 / 1000) * S * 2 };
  assert.deepEqual(nestIn(v, R, S), v);
});
