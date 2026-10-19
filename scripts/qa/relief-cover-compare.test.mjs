// Geometry, cover, map, model, flow and content tests for topic-02 screen 3 „אותה גבעה, שלושה נופים”
// (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5; boards redone 2026-10-13:
// a live 3D model and a topographic map from one terrain).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/relief-cover-compare.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANSWERS, CHIP, CORRECT, COVER, GRID_STEP, GROVE, GROVE_AREA, HILL, HOUSES, INDEX_EVERY, INITIAL_FLOW, INTERVAL, LEGEND, ORCHARD,
  QUARRIED, QUARRY, QUARRY_SITE, SHEET, SHRUBS, SPOTS, STATES, STATE_CELLS,
  contourLabels, contoursFor, flowReducer, houseCorners, isComplete, onSheetEdge, quarryMask, splitExamples,
} from '../../src/components/lessons/topic-02/reliefCoverCompare.data.ts';
import { VEX, groundMesh, toWorld } from '../../src/components/lessons/topic-02/reliefCoverMesh.ts';

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} ≉ ${b}`);
const key = ([x, y]) => `${x.toFixed(9)},${y.toFixed(9)}`;
const points = (c, L) => (c.levels.find((l) => l.level === L)?.lines ?? []).flatMap((l) => l.pts);
const vertexSet = (c, L) => new Set(points(c, L).map(key));
const LEVELS_PRESENT = contoursFor('bare').levels.map((l) => l.level);
/** The two grid nodes (every GRID_STEP m) at the ends of the grid edge a marching-squares vertex lies on. */
function edgeNodes([x, y]) {
  const on = (v) => Math.abs(v / GRID_STEP - Math.round(v / GRID_STEP)) < 1e-9;
  const r = (v) => Math.round(v / GRID_STEP) * GRID_STEP;
  const lo = (v) => Math.floor(v / GRID_STEP) * GRID_STEP;
  const hi = (v) => Math.ceil(v / GRID_STEP) * GRID_STEP;
  if (on(x) && on(y)) return [[r(x), r(y)], [r(x), r(y)]];
  return on(x) ? [[r(x), lo(y)], [r(x), hi(y)]] : [[lo(x), r(y)], [hi(x), r(y)]];
}
const changed = ([x, y]) => HILL(x, y) !== QUARRIED(x, y);

test('states 1–3 share one contour set; the quarry has its own; 5 m interval, index every 25 m', () => {
  assert.equal(contoursFor('grove'), contoursFor('bare'));
  assert.equal(contoursFor('built'), contoursFor('bare'));
  assert.notEqual(contoursFor('quarry'), contoursFor('built'));
  assert.equal(INTERVAL, 5);
  assert.equal(INDEX_EVERY, 25);
  assert.ok(LEVELS_PRESENT.length >= 12, `a real hill's worth of contours (${LEVELS_PRESENT.length})`);
  for (const lv of contoursFor('bare').levels) {
    assert.equal(lv.level % INTERVAL, 0);
    assert.equal(lv.index, lv.level % INDEX_EVERY === 0, `${lv.level} m index flag`);
    for (const l of lv.lines) {
      if (l.closed) assert.ok(!l.pts.some(onSheetEdge), `${lv.level} m: a closed line stays inside the sheet`);
      else {
        assert.ok(onSheetEdge(l.pts[0]) && onSheetEdge(l.pts[l.pts.length - 1]), `${lv.level} m: an open line ends on the sheet edge`);
        assert.ok(!l.pts.slice(1, -1).some(onSheetEdge), `${lv.level} m: no line runs along the sheet edge`);
      }
    }
  }
});

test('quarrying changes heights only where the mask is > 0, and cuts benches into the hill', () => {
  let inside = 0;
  let band = 0;
  for (let x = 0; x <= SHEET.w; x += 1) {
    for (let y = 0; y <= SHEET.h; y += 1) {
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
  assert.ok(inside > 1500, `the cut lowers a real area (${inside} m²)`);
  assert.ok(band > 0, `the transition band changes height too (${band} samples)`);
  // treads: the flat steps of the cut, 1 m off every contour level (no staircase contours on the map)
  const mid = (QUARRY.x0 + QUARRY.x1) / 2;
  const treads = new Set();
  for (let y = QUARRY.y0 + 6; y <= QUARRY.faceY + 10; y += 0.25) {
    const h = QUARRIED(mid, y);
    if (HILL(mid, y) - h > 2 && Math.abs(QUARRIED(mid, y + 0.25) - h) < 1e-6) treads.add(h.toFixed(3));
  }
  assert.ok(treads.size >= 3, `a floor and at least two benches (${[...treads].join(', ')})`);
  for (const t of treads) close(Number(t) % INTERVAL, 1, 1e-6, `tread ${t} m sits 1 m off a contour level`);
});

test('contours change only on grid edges that touch changed ground inside the mask', () => {
  const a = contoursFor('built');
  const b = contoursFor('quarry');
  let moved = 0;
  for (const L of LEVELS_PRESENT) {
    for (const [from, other] of [[a, vertexSet(b, L)], [b, vertexSet(a, L)]]) {
      for (const p of points(from, L)) {
        if (onSheetEdge(p) || other.has(key(p))) continue;
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
  for (const L of LEVELS_PRESENT) {
    for (const p of points(contoursFor('quarry'), L)) {
      if (onSheetEdge(p)) continue;
      const [n1, n2] = edgeNodes(p);
      const v1 = QUARRIED(n1[0], n1[1]);
      const v2 = QUARRIED(n2[0], n2[1]);
      assert.ok(Math.min(v1, v2) <= L && L <= Math.max(v1, v2), `${L} m vertex (${p}) sits on an edge the quarried surface crosses`);
      worst = Math.max(worst, Math.abs(QUARRIED(p[0], p[1]) - L));
    }
  }
  assert.ok(worst <= INTERVAL / 2, `interpolation error under half a contour interval (worst ${worst.toFixed(2)} m)`);
});

test('the model and the map show one ground: mesh heights are the height functions (× VEX)', () => {
  const m = groundMesh();
  const [P0, P1] = m.pose;
  const inMorph = new Set(m.morph);
  let onSheet = 0;
  for (let k = 0; k < m.plan.length / 2; k++) {
    const x = m.plan[k * 2];
    const y = m.plan[k * 2 + 1];
    if (x < 0 || x > SHEET.w || y < 0 || y > SHEET.h) continue;
    onSheet++;
    const w0 = toWorld(x, y, HILL(x, y));
    const w1 = toWorld(x, y, QUARRIED(x, y));
    close(P0[k * 3 + 1], w0[1], 1e-3, `hill pose at (${x}, ${y})`);
    close(P1[k * 3 + 1], w1[1], 1e-3, `quarried pose at (${x}, ${y})`);
    close(P0[k * 3], w0[0], 1e-3, 'x');
    close(P0[k * 3 + 2], w0[2], 1e-3, 'z');
    if (HILL(x, y) !== QUARRIED(x, y)) assert.ok(inMorph.has(k), `changed vertex (${x}, ${y}) morphs`);
    if (inMorph.has(k)) assert.ok(quarryMask(x, y) > 0, `a morphing vertex (${x}, ${y}) lies in the quarry`);
  }
  assert.ok(onSheet >= 241 * 161, `the sheet is meshed every 2 m (${onSheet} vertices)`);
  assert.ok(VEX >= 1 && VEX <= 2, 'a mild vertical exaggeration only');
  // north is up the screen, east to the right (never mirrored): +x → +X, +y (south) → +Z
  assert.ok(toWorld(10, 0, 100)[0] > toWorld(0, 0, 100)[0] && toWorld(0, 10, 100)[2] > toWorld(0, 0, 100)[2]);
});

test('objects outside the cut keep their ground; the cut takes orchard trees with it', () => {
  const pts = [...COVER.quarry.orchard.map((t) => [t.x, t.y]), ...COVER.quarry.houses.flatMap((h) => houseCorners(h))];
  for (const [x, y] of pts) assert.equal(QUARRIED(x, y), HILL(x, y), `ground under (${x}, ${y}) unchanged`);
  const removed = ORCHARD.filter((t) => !COVER.quarry.orchard.includes(t));
  assert.ok(removed.length >= 6, `the quarry removes orchard trees (${removed.length})`);
  for (const t of removed) assert.ok(quarryMask(t.x, t.y) >= 0.5, `removed tree ${t.id} lies inside the mapped quarry area`);
  for (const t of COVER.quarry.orchard) assert.equal(quarryMask(t.x, t.y), 0, `kept tree ${t.id} is outside the cut`);
  assert.equal(COVER.quarry.houses, COVER.built.houses);
});

test('cover per state: bare → natural grove → buildings and orchard → quarry', () => {
  assert.deepEqual(COVER.bare, { grove: [], shrubs: [], orchard: [], houses: [] });
  assert.ok(COVER.grove.grove.length >= 40 && COVER.grove.shrubs === SHRUBS && !COVER.grove.orchard.length && !COVER.grove.houses.length);
  assert.ok(!COVER.built.grove.length && !COVER.built.shrubs.length && COVER.built.orchard === ORCHARD && COVER.built.houses === HOUSES);
  assert.ok(!COVER.quarry.grove.length && !COVER.quarry.shrubs.length);
  for (const t of GROVE) {
    assert.ok(t.x > 1 && t.x < SHEET.w - 1 && t.y > 1 && t.y < SHEET.h - 1, `grove tree ${t.id} on the sheet`);
    assert.ok(HILL(t.x, t.y) >= 112, `grove tree ${t.id} grows on the hill (${HILL(t.x, t.y).toFixed(1)} m)`);
  }
  for (const h of HOUSES) {
    assert.ok(HILL(h.x, h.y) < 106, `house ${h.id} stands on the plain`);
    assert.ok(houseCorners(h).every(([x, y]) => x > 0 && x < SHEET.w && y > 0 && y < SHEET.h), `house ${h.id} on the sheet`);
    for (const t of ORCHARD) assert.ok(Math.hypot(h.x - t.x, h.y - t.y) > 12, `house ${h.id} clear of ${t.id}`);
  }
  for (let i = 0; i < HOUSES.length; i++)
    for (let j = i + 1; j < HOUSES.length; j++)
      assert.ok(Math.hypot(HOUSES[i].x - HOUSES[j].x, HOUSES[i].y - HOUSES[j].y) > 22, `houses ${HOUSES[i].id} and ${HOUSES[j].id} apart`);
  // natural = irregular, planted = orderly
  const gaps = (ts) => ts.map((a) => Math.min(...ts.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
  const spread = (v) => Math.max(...v) - Math.min(...v);
  assert.ok(spread(gaps(ORCHARD)) < 1e-9, 'orchard trees sit at one fixed spacing');
  assert.ok(spread(gaps(GROVE)) > 0.5, 'grove spacing varies');
  assert.ok(new Set(GROVE.map((t) => t.r.toFixed(2))).size > 5, 'grove crowns vary in size');
  assert.equal(new Set(ORCHARD.map((t) => t.r)).size, 1, 'orchard crowns match');
});

test('map annotation: spot heights on the summits, contour numbers on their line facing uphill', () => {
  for (const s of SPOTS) {
    const h = HILL(s.x, s.y);
    assert.equal(s.h, Math.round(h));
    for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) assert.ok(HILL(s.x + dx, s.y + dy) < h, `spot ${s.id} is a top`);
  }
  assert.deepEqual(SPOTS.map((s) => s.h).sort(), [152, 176]);
  for (const [state, f] of [['bare', HILL], ['quarry', QUARRIED]]) {
    const labels = contourLabels(contoursFor(state), f);
    assert.ok(labels.length >= 4, `${state}: contour numbers`);
    for (const l of labels) {
      assert.equal(l.level % INDEX_EVERY, 0, `${state}: ${l.level} is an index contour`);
      close(f(l.x, l.y), l.level, 0.6, `${state}: label ${l.level} sits on its line`);
      // the figures' "up" (0, −1) turned by deg must point uphill
      const t = (l.deg * Math.PI) / 180;
      const up = [Math.sin(t), -Math.cos(t)];
      const e = 0.5;
      const g = [(f(l.x + e, l.y) - f(l.x - e, l.y)) / (2 * e), (f(l.x, l.y + e) - f(l.x, l.y - e)) / (2 * e)];
      const n = Math.hypot(...g);
      assert.ok((up[0] * g[0] + up[1] * g[1]) / n > 0.99, `${state}: label ${l.level} faces uphill`);
      assert.ok(Math.abs(l.deg) < 100, `${state}: label ${l.level} reads without turning the page over (${l.deg.toFixed(0)}°)`);
    }
  }
});

test('map areas: the grove tint holds every grove tree; the quarry site is the mask ≥ 0.5', () => {
  const inside = (p, ring) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (const t of GROVE) assert.ok(GROVE_AREA.some((r) => inside([t.x, t.y], r)), `grove tree ${t.id} inside the tint`);
  assert.equal(QUARRY_SITE.rings.length, 1);
  for (const [x, y] of QUARRY_SITE.rings[0]) close(quarryMask(x, y), 0.5, 0.05, `site edge (${x.toFixed(1)}, ${y.toFixed(1)})`);
  assert.ok(QUARRY_SITE.ticks.length >= 8, 'ticks along the cut faces');
  // ticks only along cut faces (the back wall and the side walls), never along the open front
  for (const [, b] of QUARRY_SITE.ticks) assert.ok(HILL(b[0], b[1]) - QUARRIED(b[0], b[1]) >= 3, `tick at (${b[0].toFixed(0)}, ${b[1].toFixed(0)}) points into a cut ≥ 3 m deep`);
  assert.ok(QUARRY_SITE.ticks.every(([a]) => a[1] < QUARRY.y1 - 10), 'no tick along the front edge');
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
  assert.equal(s.asking, true, 'the first question is open from the start');
  assert.equal(flowReducer(s, { type: 'continue' }), s, '"next" changes nothing while asking');
  assert.equal(flowReducer(s, { type: 'view', index: 1 }), s, 'an unreached state is locked');
  s = flowReducer(s, { type: 'predict', answer: 'relief' }); // wrong on purpose
  assert.deepEqual(s, { reached: 1, view: 1, answers: { grove: 'relief' }, asking: false });
  assert.equal(flowReducer(s, { type: 'predict', answer: 'cover' }), s, 'no prediction before "לשלב הבא"');
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

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SCENE = 'src/components/lessons/topic-02/ReliefCoverIntroScene.tsx';
function compareRows(src) {
  const start = src.indexOf('const COMPARE_ROWS');
  const block = src.slice(start, src.indexOf('];', start));
  return [...block.matchAll(/\{\s*label:\s*'([^']*)',\s*relief:\s*'([^']*)',\s*cover:\s*'([^']*)'\s*\}/g)].map((m) => ({
    label: m[1],
    relief: m[2],
    cover: m[3],
  }));
}

test('COMPARE_ROWS is unchanged since the approved spec (1984b5f)', () => {
  const now = compareRows(readFileSync(SCENE, 'utf8'));
  const then = compareRows(execFileSync('git', ['show', `1984b5f:${SCENE}`], { encoding: 'utf8' }));
  assert.equal(then.length, 5);
  assert.deepEqual(now, then);
  const ex = now.find((r) => r.label === 'דוגמאות').cover;
  assert.equal(splitExamples(ex).join(' · '), ex, 'the cover "דוגמאות" cell splits and re-joins exactly');
  for (const s of STATES) for (const c of STATE_CELLS[s]) assert.ok(now.some((r) => r.label === c.row), `row "${c.row}" exists`);
});

test('the screen renders the component, and the reused orchard sentence is quoted verbatim', () => {
  const src = readFileSync(SCENE, 'utf8');
  assert.ok(src.includes('<ReliefCoverCompare rows={COMPARE_ROWS}'), 'screen 3 renders ReliefCoverCompare from COMPARE_ROWS');
  assert.ok(src.includes('<h3 className={SECTION_TITLE}>השוואה בין תבליט לתכסית</h3>'), 'section heading kept');
  const sentence = 'מטע נחשב לתכסית מלאכותית משום שנוצר בידי אדם.';
  assert.equal(src.split(sentence).length - 1, 2, 'once in FEATURES.orchard.desc, once in the 2→3 feedback');
});
