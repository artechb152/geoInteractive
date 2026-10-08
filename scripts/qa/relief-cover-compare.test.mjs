// Geometry, cover, flow and content tests for topic-02 screen 3 „אותה גבעה, שלושה נופים”
// (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5, §7, §10.2).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/relief-cover-compare.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, TH, TW, isVisible, onBorder } from '../../src/components/lessons/topic-02/terrainBlockGeometry.ts';
import {
  ANSWERS, CHIP, CORRECT, COVER, GROVE, HILL, HOUSES, INITIAL_FLOW, LEGEND, ORCHARD, QUARRIED, QUARRY, STATES, STATE_CELLS,
  contoursFor, flowReducer, isComplete, quarryMask, splitExamples, terrainFor,
} from '../../src/components/lessons/topic-02/reliefCoverCompare.data.ts';

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} ≉ ${b}`);
const key = ([x, y]) => `${x.toFixed(9)},${y.toFixed(9)}`;
const vertexSet = (c, L) => new Set((c.rings.get(L) ?? []).flat().map(key));
/** The two grid nodes (STEP = 1) at the ends of the grid edge a marching-squares vertex lies on. */
function edgeNodes([x, y]) {
  const ix = Math.abs(x - Math.round(x)) < 1e-9;
  const iy = Math.abs(y - Math.round(y)) < 1e-9;
  if (ix && iy) return [[Math.round(x), Math.round(y)], [Math.round(x), Math.round(y)]];
  return ix
    ? [[Math.round(x), Math.floor(y)], [Math.round(x), Math.ceil(y)]]
    : [[Math.floor(x), Math.round(y)], [Math.ceil(x), Math.round(y)]];
}
const changed = ([x, y]) => HILL(x, y) !== QUARRIED(x, y);

test('states 1–3 share one terrain and one contour set; the quarry has its own', () => {
  assert.equal(contoursFor('grove'), contoursFor('bare'));
  assert.equal(contoursFor('built'), contoursFor('bare'));
  assert.equal(terrainFor('grove'), terrainFor('bare'));
  assert.equal(terrainFor('built'), terrainFor('bare'));
  assert.notEqual(contoursFor('quarry'), contoursFor('built'));
  assert.notEqual(terrainFor('quarry'), terrainFor('built'));
  for (const L of LEVELS) {
    const rings = contoursFor('bare').rings.get(L) ?? [];
    assert.ok(rings.length > 0, `the hill has a ${L} m contour`);
    assert.ok(rings.flat().every((p) => !onBorder(p)), `the ${L} m contour closes inside the tile`);
  }
});

test('quarrying changes heights only where the mask is > 0 — its transition band included', () => {
  let inside = 0;
  let band = 0;
  for (let x = 0; x <= TW; x += 0.25) {
    for (let y = 0; y <= TH; y += 0.25) {
      const w = quarryMask(x, y);
      const d = HILL(x, y) - QUARRIED(x, y);
      assert.ok(d >= 0, `quarrying never raises ground (${x}, ${y})`);
      if (w === 0) assert.equal(d, 0, `ground outside the mask unchanged at (${x}, ${y})`);
      else if (d > 1e-9) {
        inside++;
        if (w < 1) band++;
      }
    }
  }
  assert.ok(inside > 100, `the cut lowers a real area (${inside} samples)`);
  assert.ok(band > 0, `the transition band changes height too (${band} samples)`);
  for (const [x, y] of [[50, 30], [47, 32], [52, 34]]) {
    assert.equal(quarryMask(x, y), 1, `(${x}, ${y}) fully inside the mask`);
    assert.ok(HILL(x, y) > QUARRY.floor, `(${x}, ${y}) was above the floor level`);
    close(QUARRIED(x, y), QUARRY.floor, 1e-9, `(${x}, ${y}) is cut down to the floor`);
  }
});

test('contours change only on grid edges that touch changed ground inside the mask', () => {
  const a = contoursFor('built');
  const b = contoursFor('quarry');
  let moved = 0;
  for (const L of LEVELS) {
    for (const [from, other] of [[a, vertexSet(b, L)], [b, vertexSet(a, L)]]) {
      for (const p of (from.rings.get(L) ?? []).flat()) {
        if (onBorder(p) || other.has(key(p))) continue;
        moved++;
        const nodes = edgeNodes(p);
        assert.ok(nodes.some(changed), `${L} m vertex (${p}) moved although its grid edge kept its heights`);
        assert.ok(nodes.some(([x, y]) => quarryMask(x, y) > 0), `${L} m vertex (${p}) moved outside the quarry mask`);
      }
    }
  }
  assert.ok(moved > 0, 'at least one contour changed');
});

test('quarry contours are traced from the quarried surface', () => {
  let worst = 0;
  for (const L of LEVELS) {
    for (const p of (contoursFor('quarry').rings.get(L) ?? []).flat()) {
      if (onBorder(p)) continue;
      const [n1, n2] = edgeNodes(p);
      const v1 = QUARRIED(n1[0], n1[1]);
      const v2 = QUARRIED(n2[0], n2[1]);
      assert.ok(Math.min(v1, v2) <= L && L <= Math.max(v1, v2), `${L} m vertex (${p}) sits on an edge the quarried surface crosses`);
      worst = Math.max(worst, Math.abs(QUARRIED(p[0], p[1]) - L));
    }
  }
  assert.ok(worst <= 5, `interpolation error under half a contour interval (worst ${worst.toFixed(2)} m)`);
});

test('the cut faces the camera: most of its floor is visible on the block', () => {
  const t = terrainFor('quarry');
  let n = 0;
  let seen = 0;
  for (let x = QUARRY.x0 + 2; x <= QUARRY.x1 - 2; x += 0.5) {
    for (let y = QUARRY.y0 + 2; y <= QUARRY.y1 - 2; y += 0.5) {
      if (HILL(x, y) - QUARRY.floor < 2) continue; // floor = where ground was really cut down
      n++;
      if (isVisible(t, x, y)) seen++;
    }
  }
  assert.ok(n > 20 && seen / n >= 0.6, `visible cut floor ${seen}/${n}`);
});

test('objects outside the cut keep their ground; the cut takes orchard trees with it', () => {
  const tb = terrainFor('built');
  const tq = terrainFor('quarry');
  const pts = [
    ...COVER.quarry.orchard.map((t) => [t.x, t.y]),
    ...COVER.quarry.houses.flatMap((h) => [
      [h.x - h.w / 2, h.y - h.d / 2], [h.x + h.w / 2, h.y - h.d / 2], [h.x + h.w / 2, h.y + h.d / 2], [h.x - h.w / 2, h.y + h.d / 2],
    ]),
  ];
  for (const [x, y] of pts) {
    assert.equal(QUARRIED(x, y), HILL(x, y), `ground under (${x}, ${y}) unchanged`);
    assert.deepEqual(tq.at(x, y), tb.at(x, y), `(${x}, ${y}) stays put on screen through the morph`);
  }
  const removed = ORCHARD.filter((t) => !COVER.quarry.orchard.includes(t));
  assert.ok(removed.length >= 4, `the quarry removes orchard trees (${removed.length})`);
  for (const t of removed) assert.ok(quarryMask(t.x, t.y) >= 0.5, `removed tree ${t.id} lies inside the mapped quarry area`);
  for (const t of COVER.quarry.orchard) assert.equal(quarryMask(t.x, t.y), 0, `kept tree ${t.id} is outside the cut`);
  assert.equal(COVER.quarry.houses, COVER.built.houses);
});

test('cover per state: bare → natural grove → buildings and orchard → quarry', () => {
  assert.deepEqual(COVER.bare, { grove: [], orchard: [], houses: [] });
  assert.ok(COVER.grove.grove.length >= 20 && !COVER.grove.orchard.length && !COVER.grove.houses.length);
  assert.ok(!COVER.built.grove.length && COVER.built.orchard === ORCHARD && COVER.built.houses === HOUSES);
  assert.ok(!COVER.quarry.grove.length);
  for (const t of GROVE) {
    assert.ok(t.x > 1 && t.x < TW - 1 && t.y > 1 && t.y < TH - 1, `grove tree ${t.id} on the tile`);
    assert.ok(HILL(t.x, t.y) >= 105, `grove tree ${t.id} grows on the hill (${HILL(t.x, t.y).toFixed(1)} m)`);
  }
  for (const h of HOUSES) assert.ok(HILL(h.x, h.y) < 103, `house ${h.id} stands on the plain`);
  for (const h of HOUSES) for (const t of ORCHARD) assert.ok(Math.hypot(h.x - t.x, h.y - t.y) > 3, `house ${h.id} clear of ${t.id}`);
  // natural = irregular, planted = orderly (spec §6)
  const gaps = (ts) => ts.map((a) => Math.min(...ts.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
  const spread = (v) => Math.max(...v) - Math.min(...v);
  assert.ok(spread(gaps(ORCHARD)) < 1e-9, 'orchard trees sit at one fixed spacing');
  assert.ok(spread(gaps(GROVE)) > 0.5, 'grove spacing varies');
  assert.ok(new Set(GROVE.map((t) => t.r.toFixed(2))).size > 5, 'grove crowns vary in size');
  assert.equal(new Set(ORCHARD.map((t) => t.r)).size, 1, 'orchard crowns match');
});

test('legend and chip follow the state', () => {
  assert.deepEqual(CHIP, { bare: null, grove: 'same', built: 'same', quarry: 'changed' });
  for (const s of STATES) {
    const k = LEGEND[s];
    assert.ok(k.includes('contour') && k.includes('index'), `${s}: contour entries always`);
    assert.equal(k.includes('grove'), COVER[s].grove.length > 0, `${s}: grove entry iff grove`);
    assert.equal(k.includes('orchard'), COVER[s].orchard.length > 0, `${s}: orchard entry iff orchard`);
    assert.equal(k.includes('houses'), COVER[s].houses.length > 0, `${s}: houses entry iff houses`);
    assert.equal(k.includes('quarry'), s === 'quarry');
    assert.equal(k.includes('before'), s === 'quarry');
  }
});

test('answers: grove and buildings change land cover only; the quarry changes both', () => {
  assert.deepEqual(ANSWERS, ['relief', 'cover', 'both']);
  assert.deepEqual(CORRECT, { grove: 'cover', built: 'cover', quarry: 'both' });
});

test('flow: forward only through a prediction; wrong answers advance; revisit; reset', () => {
  let s = INITIAL_FLOW;
  assert.equal(flowReducer(s, { type: 'predict', answer: 'cover' }), s, 'no prediction before "המשך"');
  assert.equal(flowReducer(s, { type: 'view', index: 1 }), s, 'an unreached state is locked');
  s = flowReducer(s, { type: 'continue' });
  assert.equal(s.asking, true);
  s = flowReducer(s, { type: 'predict', answer: 'relief' }); // wrong on purpose
  assert.deepEqual(s, { reached: 1, view: 1, answers: { grove: 'relief' }, asking: false });
  s = flowReducer(flowReducer(s, { type: 'continue' }), { type: 'predict', answer: 'cover' });
  s = flowReducer(flowReducer(s, { type: 'continue' }), { type: 'predict', answer: 'both' });
  assert.equal(isComplete(s), true);
  assert.equal(flowReducer(s, { type: 'continue' }), s, 'nothing after the last state');
  const back = flowReducer(s, { type: 'view', index: 1 });
  assert.equal(back.view, 1);
  assert.equal(back.answers.grove, 'relief', 'a revisited state keeps its prediction');
  assert.equal(flowReducer(back, { type: 'continue' }), back, 'no question away from the frontier');
  assert.equal(flowReducer(back, { type: 'view', index: 1 }), back, 'same view is a no-op');
  assert.deepEqual(flowReducer(back, { type: 'reset' }), INITIAL_FLOW);
});

test('state cards: every comparison cell shows once; cover "דוגמאות" in two parts', () => {
  const LABELS = ['הגדרה', 'דוגמאות', 'אופן הסיווג', 'קצב השינוי', 'הייצוג במפה'];
  const seen = STATES.flatMap((s) => STATE_CELLS[s]).map((c) => `${c.row}|${c.layer}|${c.part ?? '-'}`);
  const expected = LABELS.flatMap((l) =>
    ['relief', 'cover'].flatMap((layer) =>
      l === 'דוגמאות' && layer === 'cover' ? [`${l}|${layer}|0`, `${l}|${layer}|1`] : [`${l}|${layer}|-`],
    ),
  );
  assert.deepEqual([...seen].sort(), [...expected].sort());
  assert.deepEqual(STATE_CELLS.quarry, [{ row: 'קצב השינוי', layer: 'relief' }], 'the relief rate-of-change caveat lands with the quarry');
});

test('splitExamples splits at the one " · " and joins back exactly', () => {
  const cell = 'עצים, שיחים ועשב · בתים, כבישים, שדות, מטעים, גדרות וקווי חשמל.';
  const [a, b] = splitExamples(cell);
  assert.equal(a, 'עצים, שיחים ועשב');
  assert.equal(b, 'בתים, כבישים, שדות, מטעים, גדרות וקווי חשמל.');
  assert.equal(`${a} · ${b}`, cell);
  assert.throws(() => splitExamples('ללא מפריד'));
  assert.throws(() => splitExamples('א · ב · ג'));
});
