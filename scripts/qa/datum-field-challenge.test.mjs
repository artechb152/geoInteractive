// Unit tests for the datum field activity (topic-02 #scene-coordinates → "הדמיה: מה קורה כשהדאטום
// לא תואם?", design/docs/datum-field-challenge-followup-claude-2026-10-12.txt §4–§7, §11): the
// schematic model, the three stages' logic, the one world → picture transform, the base map and the
// activity's copy.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/datum-field-challenge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { CASES, GRID_STEP, MAP, PLACES, SHIFT, TERRAIN } from '../../src/components/lessons/topic-02/datum-field/datumField.data.ts';
import {
  convert, interpret, distance, formatEN, numbersOf, gapOf, gridOf, gridLines,
  ERROR_SOURCE, ERROR_MAP, ERROR_BEFORE, sentCopy, errorResult,
  caseSource, caseTarget, calcPair, calcOptions, datumsMatch, rightAction, answerComplete, sentOf, diagnose, checkedDiagnosis, EMPTY_ANSWER,
  initialActivity, activityReducer,
} from '../../src/components/lessons/topic-02/datum-field/datumField.ts';
import { MAP_ASPECT, MAP_PX, toPicture, insideMap } from '../../src/components/lessons/topic-02/datum-field/datumFieldProjection.ts';

const run = (s, ...actions) => actions.reduce(activityReducer, s);
const at = (mode) => run(initialActivity(), { type: 'setMode', mode });
const EN = (e, n) => ({ e, n });

// ---------------------------------------------------------------- the schematic model (§4)

test('the brief’s numbers: A→B subtracts (36, 48), B→A adds it, 60 m apart', () => {
  assert.deepEqual(SHIFT, EN(36, 48));
  assert.equal(Math.hypot(SHIFT.e, SHIFT.n), 60);
  assert.deepEqual(numbersOf('bridge', 'A'), EN(1200, 800));
  assert.deepEqual(numbersOf('bridge', 'B'), EN(1164, 752));
  assert.deepEqual(numbersOf('junction', 'A'), EN(1090, 760));
  assert.deepEqual(numbersOf('junction', 'B'), EN(1054, 712));
  assert.deepEqual(convert(EN(1200, 800), 'A', 'B'), EN(1164, 752));
  assert.deepEqual(convert(EN(1054, 712), 'B', 'A'), EN(1090, 760));
  assert.deepEqual(convert(EN(1200, 800), 'A', 'A'), EN(1200, 800));
  assert.deepEqual(convert(EN(1200, 800), 'B', 'B'), EN(1200, 800));
});

test('one rule places every pair: read as A it stays, read as B it moves by (36, 48)', () => {
  assert.deepEqual(interpret(EN(1200, 800), 'A'), EN(1200, 800));
  // the brief’s example: (1200, 800) read as B → (1236, 848), 60 m from the bridge
  assert.deepEqual(interpret(EN(1200, 800), 'B'), EN(1236, 848));
  assert.equal(gapOf(EN(1200, 800), 'B', PLACES.bridge.ground), 60);
  // (1164, 752) read as B stands on the bridge
  assert.deepEqual(interpret(EN(1164, 752), 'B'), PLACES.bridge.ground);
  // converting changes the numbers and keeps the place, in both directions, for every place
  for (const id of Object.keys(PLACES)) {
    for (const d of ['A', 'B']) {
      assert.deepEqual(interpret(numbersOf(id, d), d), PLACES[id].ground, `${id} in ${d}`);
      for (const to of ['A', 'B']) assert.deepEqual(interpret(convert(numbersOf(id, d), d, to), to), PLACES[id].ground, `${id} ${d}→${to}`);
    }
  }
  assert.equal(distance(EN(0, 0), EN(36, 48)), 60);
});

test('numbers read left to right', () => {
  assert.equal(formatEN(EN(1200, 800)), 'E 1200 · N 800');
});

// ---------------------------------------------------------------- stage 1: the same bridge, two descriptions

test('1) switching A/B changes the numbers and the grid, never the bridge', () => {
  let s = initialActivity();
  assert.equal(s.mode, 'compare');
  assert.equal(s.compare.datum, 'A');
  const ground = { ...PLACES.bridge.ground };
  s = run(s, { type: 'setDatum', datum: 'B' });
  assert.equal(s.compare.datum, 'B');
  assert.ok(s.compare.switched);
  assert.deepEqual(numbersOf('bridge', s.compare.datum), EN(1164, 752));
  assert.deepEqual(PLACES.bridge.ground, ground, 'the bridge stays where it is');
  // the grid: same values and spacing, B's lines stand (36, 48) east and north of A's
  const A = gridOf('A');
  const B = gridOf('B');
  for (const l of [...A.e, ...A.n]) assert.equal(l.ground, l.value);
  for (const l of B.e) assert.equal(l.ground - l.value, SHIFT.e);
  for (const l of B.n) assert.equal(l.ground - l.value, SHIFT.n);
  for (const g of [A, B]) {
    for (const ax of ['e', 'n']) {
      assert.ok(g[ax].length >= 2 && g[ax].length <= 4, `few lines: ${g[ax].length}`);
      g[ax].forEach((l, i) => i && assert.equal(l.value - g[ax][i - 1].value, GRID_STEP));
    }
    for (const l of g.e) assert.ok(l.ground >= MAP.e0 && l.ground <= MAP.e1);
    for (const l of g.n) assert.ok(l.ground >= MAP.n0 && l.ground <= MAP.n1);
  }
  // reading the bridge off either grid gives that datum's numbers
  const readOff = (g, p) => ({ e: g.e[0].value + (p.e - g.e[0].ground), n: g.n[0].value + (p.n - g.n[0].ground) });
  assert.deepEqual(readOff(A, PLACES.bridge.ground), EN(1200, 800));
  assert.deepEqual(readOff(B, PLACES.bridge.ground), EN(1164, 752));
  // a demonstration, not a score: switching back is a switch too, nothing is "solved"
  s = run(s, { type: 'setDatum', datum: 'A' });
  assert.deepEqual(numbersOf('bridge', s.compare.datum), EN(1200, 800));
  assert.ok(s.practice.solved.every((v) => !v));
});

// ---------------------------------------------------------------- stage 2: the error and what fixes it

test('2) copying A’s numbers to the B map unconverted puts the marker 60 m from the bridge', () => {
  let s = at('error');
  assert.equal(s.error.phase, 'ready');
  assert.equal(sentCopy(s.error.phase), null, 'nothing sent: only the bridge');
  assert.equal(errorResult(s.error.phase), null);
  assert.deepEqual(ERROR_SOURCE, { datum: 'A', numbers: EN(1200, 800) });
  assert.equal(ERROR_MAP, 'B');
  s = run(s, { type: 'copyRaw' });
  assert.equal(s.error.phase, 'raw');
  assert.deepEqual(sentCopy(s.error.phase), { label: 'A', numbers: EN(1200, 800), converted: false });
  assert.deepEqual(errorResult(s.error.phase), EN(1236, 848));
  assert.equal(distance(errorResult(s.error.phase), PLACES.bridge.ground), 60);
});

test('3) changing only the label changes the label: same numbers, place and gap; it can be undone', () => {
  let s = run(at('error'), { type: 'copyRaw' });
  const before = { sent: sentCopy(s.error.phase), at: errorResult(s.error.phase) };
  s = run(s, { type: 'toggleLabel' });
  assert.equal(s.error.phase, 'relabeled');
  const after = sentCopy(s.error.phase);
  assert.equal(before.sent.label, 'A');
  assert.equal(after.label, 'B', 'the copy’s label changed');
  assert.deepEqual(after.numbers, before.sent.numbers, 'the numbers did not');
  assert.deepEqual(errorResult(s.error.phase), before.at, 'the marker did not move');
  assert.equal(distance(errorResult(s.error.phase), PLACES.bridge.ground), 60);
  assert.deepEqual(ERROR_SOURCE.numbers, EN(1200, 800), 'the source is kept, still in A');
  // back to the state before the experiment, without resetting the activity
  s = run(s, { type: 'toggleLabel' });
  assert.equal(s.error.phase, 'raw');
  assert.deepEqual(sentCopy(s.error.phase), before.sent);
});

test('4) converting A→B brings the marker to the bridge — from the true source, also after the label experiment', () => {
  for (const path of [[{ type: 'copyRaw' }], [{ type: 'copyRaw' }, { type: 'toggleLabel' }]]) {
    let s = run(at('error'), ...path);
    const r0 = s.run;
    s = run(s, { type: 'convert' });
    assert.equal(s.error.phase, 'converting', 'the motion first');
    assert.ok(s.run > r0);
    // a motion end from an older run is ignored
    assert.equal(run(s, { type: 'arrive', run: r0 }).error.phase, 'converting');
    s = run(s, { type: 'arrive', run: s.run });
    assert.equal(s.error.phase, 'converted');
    assert.deepEqual(sentCopy(s.error.phase), { label: 'B', numbers: EN(1164, 752), converted: true });
    assert.deepEqual(errorResult(s.error.phase), PLACES.bridge.ground);
    assert.equal(distance(errorResult(s.error.phase), PLACES.bridge.ground), 0);
    // again (a replay of before → after): still 1164 · 752, never converted twice
    s = run(s, { type: 'convert' });
    assert.equal(s.error.phase, 'converting');
    s = run(s, { type: 'arrive', run: s.run });
    assert.deepEqual(sentCopy(s.error.phase).numbers, EN(1164, 752));
  }
  // the motion always starts where the unconverted numbers land
  assert.deepEqual(ERROR_BEFORE, EN(1236, 848));
});

test('the label experiment stays open after the fix, and a reset starts the stage clean', () => {
  let s = run(at('error'), { type: 'copyRaw' }, { type: 'convert' });
  s = run(s, { type: 'arrive', run: s.run });
  s = run(s, { type: 'toggleLabel' });
  assert.equal(s.error.phase, 'relabeled');
  assert.deepEqual(sentCopy(s.error.phase), { label: 'B', numbers: EN(1200, 800), converted: false }, 'the raw numbers with only the label changed');
  assert.equal(distance(errorResult(s.error.phase), PLACES.bridge.ground), 60);
  // undoing the experiment returns to the state it started from: the fix, not the raw copy
  s = run(s, { type: 'toggleLabel' });
  assert.equal(s.error.phase, 'converted');
  assert.deepEqual(errorResult(s.error.phase), PLACES.bridge.ground);
  s = run(s, { type: 'resetError' });
  assert.equal(s.error.phase, 'ready');
  // nothing to relabel or convert before the numbers are sent
  assert.equal(run(s, { type: 'toggleLabel' }).error.phase, 'ready');
  assert.equal(run(s, { type: 'convert' }).error.phase, 'ready');
});

test('leaving a stage mid-motion cancels it; the late end cannot overwrite the new state', () => {
  let s = run(at('error'), { type: 'copyRaw' }, { type: 'convert' });
  const motion = s.run;
  s = run(s, { type: 'setMode', mode: 'practice' });
  assert.equal(s.mode, 'practice');
  assert.equal(s.error.phase, 'converted', 'the conversion settles where it was going');
  assert.ok(s.run > motion);
  const after = run(s, { type: 'arrive', run: motion });
  assert.deepEqual(after, s);
  // the same through the label: a toggle during the motion cancels it
  let t = run(at('error'), { type: 'copyRaw' }, { type: 'convert' });
  const m2 = t.run;
  t = run(t, { type: 'toggleLabel' });
  assert.equal(t.error.phase, 'relabeled');
  assert.equal(run(t, { type: 'arrive', run: m2 }).error.phase, 'relabeled');
});

// ---------------------------------------------------------------- stage 3: practice (three decisions, then a check)

/** An answer: do the datums match, the action, and the kind of pair chosen (its slot in the case's order). */
const ans = (c, match, action, kind = null) => ({ match, action, calc: kind ? c.calcOrder.indexOf(kind) : null });
const isConv = (a) => a === 'AtoB' || a === 'BtoA';

test('5) the datums already match: sending the numbers as they are is right; a conversion is an action error with a gap', () => {
  const c = CASES.find((x) => x.id === 'same');
  assert.equal(c.place, 'bridge');
  assert.equal(c.source, 'A');
  assert.equal(c.target, 'A');
  assert.deepEqual(caseSource(c), EN(1200, 800));
  assert.ok(datumsMatch(c));
  assert.equal(rightAction(c), 'keep');
  assert.ok(!c.actions.includes('relabel'), 'no label to change when both already say A');
  const right = diagnose(c, ans(c, true, 'keep'));
  assert.deepEqual(right, { verdict: 'right', sent: { label: 'A', numbers: EN(1200, 800) }, at: EN(1200, 800), gap: 0, calc: null });
  // converting when nothing needs converting: the action is wrong, whatever the arithmetic
  for (const a of ['AtoB', 'BtoA']) {
    for (const k of c.calcOrder) {
      const d = diagnose(c, ans(c, true, a, k));
      assert.equal(d.verdict, 'action', `${a} ${k}`);
      assert.ok(d.gap > 30, `${a} ${k} moves the mark (${d.gap})`);
    }
  }
  assert.equal(diagnose(c, ans(c, true, 'AtoB', 'right')).gap, 60);
  // calling the datums different is an identification error — named even when the numbers land right
  assert.deepEqual(['verdict', 'gap'].map((k) => diagnose(c, ans(c, false, 'keep'))[k]), ['identify', 0]);
  assert.deepEqual(['verdict', 'gap'].map((k) => diagnose(c, ans(c, false, 'BtoA', 'right'))[k]), ['identify', 60]);
});

test('6) the junction, B → A: each step’s mistake is named, with the gap it makes', () => {
  const c = CASES.find((x) => x.id === 'reverse');
  assert.equal(c.place, 'junction');
  assert.equal(c.source, 'B');
  assert.equal(c.target, 'A');
  assert.deepEqual(caseSource(c), EN(1054, 712));
  assert.deepEqual(caseTarget(c), EN(1090, 760));
  assert.ok(!datumsMatch(c));
  assert.equal(rightAction(c), 'BtoA');
  const v = (...a) => diagnose(c, ans(c, ...a));
  const vg = (...a) => [v(...a).verdict, Math.round(v(...a).gap)];
  // right: B→A, the conversion's own pair
  assert.deepEqual(v(false, 'BtoA', 'right'), { verdict: 'right', sent: { label: 'A', numbers: EN(1090, 760) }, at: EN(1090, 760), gap: 0, calc: 'right' });
  assert.deepEqual(calcPair(c, 'BtoA', 'right'), convert(caseSource(c), 'B', 'A'));
  // identification: "the same datum" → sent as is, 60 m
  assert.deepEqual(vg(true, 'keep'), ['identify', 60]);
  // the action: unchanged 60, the label only 60 (label A, numbers B's), the reverse direction 120
  assert.deepEqual(vg(false, 'keep'), ['action', 60]);
  const relabel = v(false, 'relabel');
  assert.deepEqual([relabel.verdict, relabel.gap, relabel.sent.label], ['action', 60, 'A']);
  assert.deepEqual(relabel.sent.numbers, caseSource(c), 'a new label, the same numbers');
  assert.deepEqual(vg(false, 'AtoB', 'right'), ['action', 120]);
  // the calculation: the right direction, the shifts swapped (17 m) or only E converted (48 m)
  assert.deepEqual(calcPair(c, 'BtoA', 'swapped'), EN(1102, 748));
  assert.deepEqual(calcPair(c, 'BtoA', 'partial'), EN(1090, 712));
  assert.deepEqual(vg(false, 'BtoA', 'swapped'), ['calc', 17]);
  assert.deepEqual(vg(false, 'BtoA', 'partial'), ['calc', 48]);
});

test('right comes from the data, not from a slot; every answer lands inside the map', () => {
  for (const c of CASES) {
    const all = [];
    for (const match of [true, false]) {
      for (const a of c.actions) {
        for (const k of isConv(a) ? c.calcOrder : [null]) all.push(diagnose(c, ans(c, match, a, k)));
      }
    }
    // one way to be right: every step right — and only it puts the mark on the place itself
    const rights = all.filter((d) => d.verdict === 'right');
    assert.equal(rights.length, 1, c.id);
    assert.ok(rights[0].gap < 1e-9, c.id);
    for (const d of all) assert.ok(insideMap(d.at, 25), `${c.id} ${formatEN(d.sent.numbers)} lands inside the map`);
    // every pair of a conversion is different
    for (const a of ['AtoB', 'BtoA']) assert.equal(new Set(calcOptions(c, a).map(formatEN)).size, 3, `${c.id} ${a}`);
  }
  assert.equal(new Set(CASES.map((c) => c.calcOrder.indexOf('right'))).size, CASES.length, 'the right pair changes slot between cases');
  assert.ok(insideMap(ERROR_BEFORE, 25));
  for (const id of Object.keys(PLACES)) assert.ok(insideMap(PLACES[id].ground, 60), id);
});

test('practice: nothing is judged or drawn before a check; any change clears the verdict; a reset starts the case again', () => {
  const c = CASES[1];
  let s = run(at('practice'), { type: 'goCase', index: 1 });
  s = run(s, { type: 'check' });
  assert.equal(s.practice.checked, false, 'nothing to check before the answers');
  s = run(s, { type: 'setMatch', match: false }, { type: 'setAction', action: 'BtoA' });
  assert.ok(!answerComplete(c, s.practice.answer), 'a conversion needs its pair');
  assert.equal(sentOf(c, s.practice.answer), null);
  assert.equal(run(s, { type: 'check' }).practice.checked, false);
  s = run(s, { type: 'setCalc', option: c.calcOrder.indexOf('swapped') });
  assert.equal(checkedDiagnosis(s.practice), null, 'a choice is not a verdict');
  s = run(s, { type: 'check' });
  assert.equal(checkedDiagnosis(s.practice).verdict, 'calc');
  assert.ok(!s.practice.solved[1]);
  assert.deepEqual(run(s, { type: 'check' }), s, 'checked once until something changes');
  // correcting the pair clears the verdict; the next check judges again
  s = run(s, { type: 'setCalc', option: c.calcOrder.indexOf('right') });
  assert.equal(s.practice.checked, false);
  s = run(s, { type: 'check' });
  assert.equal(checkedDiagnosis(s.practice).verdict, 'right');
  assert.ok(s.practice.solved[1]);
  // another action drops the old pair
  s = run(s, { type: 'setAction', action: 'AtoB' });
  assert.equal(s.practice.answer.calc, null);
  assert.equal(s.practice.checked, false);
  // what the case does not offer is ignored
  assert.equal(run(at('practice'), { type: 'setAction', action: 'relabel' }).practice.answer.action, null);
  assert.equal(run(at('practice'), { type: 'setCalc', option: 0 }).practice.answer.calc, null, 'no pair without a conversion');
  assert.equal(run(at('practice'), { type: 'setAction', action: 'keep' }, { type: 'setCalc', option: 0 }).practice.answer.calc, null);
  // reset: the case from its start; solved once stays solved
  s = run(s, { type: 'resetCase' });
  assert.deepEqual(s.practice.answer, EMPTY_ANSWER);
  assert.equal(s.practice.checked, false);
  assert.ok(s.practice.solved[1]);
});

test('7) cases start clean; summary only after both; practise again and back to the demonstration', () => {
  const solve = (st) => {
    const c = CASES[st.practice.index];
    const a = rightAction(c);
    let t = run(st, { type: 'setMatch', match: datumsMatch(c) }, { type: 'setAction', action: a });
    if (isConv(a)) t = run(t, { type: 'setCalc', option: c.calcOrder.indexOf('right') });
    return run(t, { type: 'check' });
  };
  let s = run(at('practice'), { type: 'setMatch', match: false });
  s = run(s, { type: 'goCase', index: 1 });
  assert.equal(s.practice.index, 1);
  assert.deepEqual(s.practice.answer, EMPTY_ANSWER);
  assert.equal(s.practice.checked, false);
  assert.deepEqual(run(s, { type: 'showSummary' }).practice.summary, false, 'no summary before both are right');
  s = solve(s);
  s = solve(run(s, { type: 'goCase', index: 0 }));
  s = run(s, { type: 'showSummary' });
  assert.ok(s.practice.summary);
  assert.deepEqual(run(s, { type: 'setMatch', match: true }), s, 'the summary takes no answers');
  const again = run(s, { type: 'restartPractice' });
  assert.deepEqual(again.practice, initialActivity().practice);
  const demo = run(s, { type: 'setDatum', datum: 'B' }, { type: 'backToDemo' });
  assert.equal(demo.mode, 'compare');
  assert.deepEqual(demo.compare, { datum: 'A', switched: false });
  assert.deepEqual(demo.practice, initialActivity().practice, 'practice starts clean again');
  assert.equal(demo.error.phase, 'ready', 'so does the error stage');
});

test('every stage keeps its own state when the learner moves between stages', () => {
  let s = run(initialActivity(), { type: 'setDatum', datum: 'B' }, { type: 'setMode', mode: 'error' }, { type: 'copyRaw' });
  s = run(s, { type: 'setMode', mode: 'compare' });
  assert.equal(s.compare.datum, 'B');
  s = run(s, { type: 'setMode', mode: 'error' });
  assert.equal(s.error.phase, 'raw');
  // actions of another stage do nothing
  assert.deepEqual(run(s, { type: 'setDatum', datum: 'A' }), s);
  assert.deepEqual(run(s, { type: 'setMatch', match: true }), s);
  assert.deepEqual(run(s, { type: 'resetCase' }), s);
});

// ---------------------------------------------------------------- the world → picture transform

test('one transform, uniform scale, north up and east right', () => {
  assert.deepEqual(toPicture(EN(MAP.e0, MAP.n1)), { x: 0, y: 0 });
  assert.deepEqual(toPicture(EN(MAP.e1, MAP.n0)), { x: 1, y: 1 });
  assert.equal(MAP_PX.w / MAP_PX.h, MAP_ASPECT);
  assert.equal(MAP_PX.w, (MAP.e1 - MAP.e0) * MAP.ppm);
  assert.equal(MAP_PX.h, (MAP.n1 - MAP.n0) * MAP.ppm);
  // 60 m east and 60 m north are the same length in the picture
  const o = toPicture(EN(1100, 700));
  const e = toPicture(EN(1160, 700));
  const n = toPicture(EN(1100, 760));
  const px = (a, b) => Math.hypot((b.x - a.x) * MAP_PX.w, (b.y - a.y) * MAP_PX.h);
  assert.ok(Math.abs(px(o, e) - px(o, n)) < 1e-9);
  assert.ok(e.x > o.x && n.y < o.y);
  // the converted marker lands exactly on the bridge in the picture
  assert.deepEqual(toPicture(interpret(numbersOf('bridge', 'B'), 'B')), toPicture(PLACES.bridge.ground));
});

test('the terrain is laid out from the exercise: the bridge on the stream and the road, the junction on the roads', () => {
  const near = (poly, p) => Math.min(...poly.slice(1).map((q, i) => {
    const [ax, ay] = poly[i];
    const [bx, by] = q;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((p.e - ax) * dx + (p.n - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.e - ax - t * dx, p.n - ay - t * dy);
  }));
  assert.deepEqual(TERRAIN.bridge.at, [PLACES.bridge.ground.e, PLACES.bridge.ground.n]);
  assert.ok(near(TERRAIN.stream, PLACES.bridge.ground) < 0.5, 'the stream passes under the bridge');
  const main = TERRAIN.roads.find((r) => r.id === 'main').path;
  assert.ok(near(main, PLACES.bridge.ground) < 0.5, 'the road crosses the bridge');
  for (const r of TERRAIN.roads) assert.ok(near(r.path, PLACES.junction.ground) < 0.5, `${r.id} meets at the junction`);
});

test('the base map: one picture at the extent’s size; the diorama and its thumbnails are gone', async () => {
  const require = createRequire(import.meta.url);
  const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));
  const dir = 'public/assets/lessons/topic02/datum-field-challenge';
  const m = await sharp(`${dir}/field-map.webp`).metadata();
  assert.equal(m.width, MAP_PX.w);
  assert.equal(m.height, MAP_PX.h);
  for (const old of ['terrain-base.webp', 'thumb-bridge.webp', 'thumb-junction.webp', 'thumb-summit.webp']) {
    assert.ok(!existsSync(`${dir}/${old}`), `${old} removed`);
  }
});

// ---------------------------------------------------------------- the copy (§5–§7, §10; clarity pass 2026-10-26)

test('the activity’s copy: source wording kept, datums and the real place vs the mark obtained distinguished', () => {
  const src = readFileSync('src/components/lessons/topic-02/datum-field/DatumFieldChallenge.tsx', 'utf8');
  const required = [
    // kept
    'הדמיה: מה קורה כשהדאטום לא תואם?',
    // the lead (2026-10-26): the datum always, the projection only for a planar system — as קואורדינטות 2 defines מערכת ייחוס
    'כדי לפרש מספרי קואורדינטות, צריך לדעת באיזו מערכת ייחוס ובאיזה דאטום הם נכתבו.',
    'במערכת מישורית, כמו מזרח וצפון במטרים, נדרשים גם ההיטל והפרמטרים שלו (על ההיטל – בחלק הבא).',
    'מפות ממקורות שונים עשויות להשתמש בדאטומים שונים: החלפת שם הדאטום אינה ממירה את המספרים, והמרה מתאימה מחשבת אותם מחדש, כך שיתארו את אותו מקום.',
    // §4: the schematic model, said once
    'A ו־B הם דאטומים בדיוניים; ההבדל ביניהם מוצג כאן כהזזה קבועה לצורך ההמחשה בלבד.',
    // stages
    'משווים', 'בודקים את הטעות', 'מתרגלים',
    // stage 1
    'גשר אחד, קואורדינטות בשני דאטומים',
    'עברו בין A ל־B ובדקו מה משתנה: המספרים או המקום בשטח?',
    'הדאטום שבו מתארים את הגשר', 'דאטום A', 'דאטום B',
    'המספרים השתנו, הגשר לא זז',
    'המפה מציגה עכשיו את רשת B. הגשר נשאר במקומו, ולכן נקרא בה במספרים אחרים.',
    'מה קורה בלי המרה?',
    // stage 2
    'אותם מספרים נקראים בדאטום אחר',
    'נתוני המקור', 'מפת היעד', 'העותק שנשלח למפה',
    'העתיקו את מספרי המקור למפת היעד בלי המרה ובדקו היכן יופיע הסימון.',
    'המפה קוראת כ־B',
    'העתקת המספרים ללא המרה',
    'שינוי הכיתוב בלבד', 'רק האות בכותרת העותק משתנה',
    'המרת המספרים מ־A ל־B', 'E ו־N מחושבים מחדש לדאטום B',
    'מספרי A נקראו כאילו נמדדו ב־B. הגשר לא זז; רק הסימון במפה.',
    'הכיתוב השתנה, הסימון לא זז',
    'המספרים עדיין של A, והמפה ממשיכה לקרוא אותם כ־B. שינוי הכיתוב אינו המרה.',
    'הסימון תואם למיקום הגשר',
    'ההמרה חישבה את המספרים מחדש, כך שבדאטום B הם מתארים את אותו גשר. השתנו המספרים, לא המקום.',
    'המחשת המעבר', 'התחלה מחדש', 'נסו על נתונים נוספים',
    // the map
    'המקום האמיתי', 'הסימון שהתקבל',
    // stage 3: three decisions, a check, the step that went wrong
    'איזה צמד מספרים צריך לשלוח למפת היעד כדי לשמור על אותו מקום?',
    'האם הדאטומים תואמים?', 'מה עושים עם המספרים?', 'אילו מספרים נשלחים למפה?',
    'כלל ההמחשה בלבד, לא שיטת המרה כללית:',
    'בדיקת הנתונים',
    'הטעות בזיהוי הדאטומים', 'הטעות בבחירת הפעולה', 'הטעות בחישוב',
    'לפני שימוש בקואורדינטות בודקים באיזה דאטום נמסרו הנתונים ובאיזה דאטום משתמשת המפה. כשנדרשת המרה, משנים את המספרים באופן ששומר על אותו מקום בשטח.',
    'תרגול חוזר', 'חזרה להדגמה',
  ];
  for (const s of required) assert.ok(src.includes(s), `missing: ${s}`);
  // §1, §9: gone — the north glyph, the hint, the picker and its thumbnails, the old diorama and wording;
  // 2026-10-26: the general datum explanation (the previous activity's) and the preview that gave the answer away
  for (const s of [
    'רמז', 'בחירת נקודה', 'thumb-', 'terrain-base', 'פסגה', 'מיקום מבוקש', 'זוהי המחשה סכמטית', 'ההדמיה ממחישה זאת', 'הגשר בשטח', 'רשת דאטום',
    'שתי מערכות ייחוס למדידת מיקום', 'תצוגה מקדימה', 'המעוין',
  ]) {
    assert.ok(!src.includes(s), `still there: ${s}`);
  }
  assert.ok(!/>\s*N\s*</.test(src), 'no N glyph');
  // §4, §10: phrasing to avoid; the old lead tied every coordinate to a projection (latitude/longitude have none)
  for (const s of ['הנקודה זזה בשטח', 'תמיד גורם לסטייה', 'בטוח', 'מסוכן', 'מהו הדאטום ומהו ההיטל שלה']) assert.ok(!src.includes(s), `avoid: ${s}`);
  // the cases' right answers say why that action, for that pair of datums
  assert.match(CASES.find((c) => c.id === 'same').right, /באותו דאטום/);
  assert.match(CASES.find((c) => c.id === 'reverse').right, /ממירים B→A/);
});

test('the rule shown to the learner is the model’s shift, scoped to the illustration; the map draws the tested grid', () => {
  const src = readFileSync('src/components/lessons/topic-02/datum-field/DatumFieldChallenge.tsx', 'utf8');
  // the formula is written from SHIFT and the chosen direction, never typed in
  assert.ok(src.includes('`${from}→${to}: E ${sign} ${SHIFT.e}, N ${sign} ${SHIFT.n}`'), 'the rule comes from SHIFT');
  assert.ok(/P_RULE = 'כלל ההמחשה בלבד, לא שיטת המרה כללית:'/.test(src), 'the rule is scoped');
  assert.ok(/gridLines\(/.test(src), 'the map draws gridLines(), the function tested above');
  // the slide in stage 1 moves every line by the same fraction of the shift
  const half = gridLines(0.5);
  for (const l of half.e) assert.equal(l.ground - l.value, SHIFT.e / 2);
  for (const l of half.n) assert.equal(l.ground - l.value, SHIFT.n / 2);
});

test('the lesson around it is untouched: same place in the scene, before the part summary', () => {
  const scene = readFileSync('src/components/lessons/topic-02/CoordinatesScene.tsx', 'utf8');
  // each in its own laptop-fit screen (FitScreen), in this order
  assert.ok(
    /<DatumGuided \/>\s*<FitScreen name="datum-field"[^>]*>\s*<DatumFieldChallenge \/>\s*<\/FitScreen>\s*<FitScreen name="summary"[^>]*>\s*<Part1Summary \/>/.test(scene),
    'DatumGuided → the activity → the part summary',
  );
});
