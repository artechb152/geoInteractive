// Consistency tests for the scale scenes' content against the generated sheets (spec §4.3).
// Run: node --experimental-strip-types --test scripts/qa/scale-content.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEETS, SHEET_IDS } from '../../src/components/lessons/topic-02/scale/scaleSheets.data.ts';
import { LANDMARKS, LOCATE, EXAMPLE_PAIR, SCENARIOS } from '../../src/components/lessons/topic-02/scale/scaleContent.data.ts';
import { evaluateChoice } from '../../src/components/lessons/topic-02/scale/choose.ts';
import * as geo from '../../src/components/lessons/topic-02/scale/geo.ts';

const { groundDistanceM, insideSheet, lonLatToSheet, sheetBox } = geo;
const inside = (id, lm) => insideSheet(lonLatToSheet(SHEETS[id], lm));

test('generated bounds match the geometry module', () => {
  for (const id of SHEET_IDS) {
    const s = SHEETS[id];
    sheetBox(s.center, s.groundWidthM).forEach((v, i) => assert.ok(Math.abs(v - s.bbox3857[i]) < 0.01, `${id}[${i}]`));
  }
});

test('locate buttons: known landmarks, each inside at least one sheet; the Kinneret only on 1:250,000', () => {
  for (const l of LOCATE) {
    assert.ok(l.id in LANDMARKS, l.id);
    assert.ok(SHEET_IDS.some((id) => inside(id, LANDMARKS[l.id])), `${l.id} inside no sheet`);
  }
  assert.ok(LOCATE.some((l) => l.id === 'kinneret'));
  assert.deepEqual(SHEET_IDS.filter((id) => inside(id, LANDMARKS.kinneret)), ['250k']);
  for (const id of ['shibli', 'road7266']) for (const s of SHEET_IDS) assert.ok(inside(s, LANDMARKS[id]), `${id} on ${s}`);
});

test('the example pair lies inside all three sheets and reads 8.9 cm on 1:10,000', () => {
  for (const id of SHEET_IDS) for (const lm of EXAMPLE_PAIR) assert.ok(inside(id, LANDMARKS[lm]), `${lm} on ${id}`);
  const g = groundDistanceM(LANDMARKS[EXAMPLE_PAIR[0]], LANDMARKS[EXAMPLE_PAIR[1]]);
  assert.equal(geo.readCm(geo.sheetCm(g, 10000)), 8.9);
});

test('each scenario: the target sheet covers the task and shows every need; every other sheet has a reason', () => {
  for (const s of SCENARIOS) {
    const t = evaluateChoice(s, SHEETS[s.target], LANDMARKS, geo);
    assert.ok(t.correct && t.covered && t.missing.length === 0, `${s.id} target`);
    for (const id of SHEET_IDS) {
      if (id === s.target) continue;
      const e = evaluateChoice(s, SHEETS[id], LANDMARKS, geo);
      assert.ok(!e.correct && (!e.covered || e.missing.length > 0), `${s.id} on ${id} has no reason`);
    }
  }
});

test('need spots (Need.at) are known landmarks inside the target sheet', () => {
  for (const s of SCENARIOS) {
    for (const n of s.needs) {
      for (const id of n.at ?? []) {
        assert.ok(id in LANDMARKS, `${s.id} / ${n.label}: unknown landmark ${id}`);
        assert.ok(inside(s.target, LANDMARKS[id]), `${s.id} / ${n.label}: ${id} outside the target sheet ${s.target}`);
      }
    }
  }
  // A wrong choice that lacks a need with spots rings them (screen C): every such need has at least one.
  const springs = SCENARIOS.find((s) => s.id === 'navigation').needs.find((n) => n.label.includes('מעיינות'));
  assert.ok((springs.at ?? []).length > 0, 'the springs need names a spot');
});
