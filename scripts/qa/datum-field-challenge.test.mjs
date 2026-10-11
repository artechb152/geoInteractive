// Unit tests for the datum field challenge (topic-02 #scene-coordinates → "הדמיה: מה קורה כשהדאטום
// לא תואם?", design/docs/datum-field-challenge-claude-prompt-2026-10-11.txt §8–§11): the schematic
// shift, the task's state machine, the one projection shared by the picture and the overlay, the
// rendered terrain's agreement with the landmark data, the delivered assets, and the lesson copy.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/datum-field-challenge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  DATUM_SHIFT, FIELD_FRAME, FIRST_LANDMARK, LANDMARKS, LANDMARK_IDS,
} from '../../src/components/lessons/topic-02/datum-field/datumField.data.ts';
import {
  toDatumB, groundOfMapNumbers, distanceM, mapNumbers, requestedAt, displayedAt, gapAt, formatEN, readGap,
  initialField, fieldReducer, isConverted, isOpen, restingT, stepStatuses, CORRECT_ANSWER,
} from '../../src/components/lessons/topic-02/datum-field/datumField.ts';
import {
  project, pathZ, displayedPx, requestedPx, gapLine, northAt, TERRAIN_ASPECT,
} from '../../src/components/lessons/topic-02/datum-field/datumFieldProjection.ts';
import { DATUM_FIELD_TERRAIN as T } from '../../src/components/lessons/topic-02/datum-field/datumFieldTerrain.data.ts';

const run = (s, ...actions) => actions.reduce(fieldReducer, s);
const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);

// ---------------------------------------------------------------- the schematic model

test('one shift for every landmark: B = A − (36, 48), a 60 m gap unconverted', () => {
  assert.deepEqual(DATUM_SHIFT, { e: 36, n: 48 });
  assert.equal(Math.hypot(DATUM_SHIFT.e, DATUM_SHIFT.n), 60);
  assert.deepEqual(toDatumB(LANDMARKS.bridge.a), { e: 1164, n: 752 });
  assert.deepEqual(LANDMARKS.bridge.a, { e: 1200, n: 800 }, 'the bridge keeps the brief’s numbers');
  for (const id of LANDMARK_IDS) {
    const a = LANDMARKS[id].a;
    const b = toDatumB(a);
    assert.deepEqual({ e: a.e - b.e, n: a.n - b.n }, DATUM_SHIFT, id);
    // the map reads numbers as B: A's numbers land at P + shift, B's numbers land at P
    assert.deepEqual(groundOfMapNumbers(a), { e: a.e + 36, n: a.n + 48 }, id);
    assert.deepEqual(groundOfMapNumbers(b), a, id);
    assert.equal(gapAt(id, 0), 60, id);
    assert.equal(gapAt(id, 1), 0, id);
    assert.deepEqual(displayedAt(id, 1), requestedAt(id), id);
    assert.deepEqual(mapNumbers(id, false), a, id);
    assert.deepEqual(mapNumbers(id, true), b, id);
  }
  assert.equal(FIRST_LANDMARK, 'bridge');
  assert.deepEqual(LANDMARK_IDS, ['bridge', 'junction', 'summit']);
  assert.deepEqual(LANDMARK_IDS.map((id) => LANDMARKS[id].name), ['גשר', 'צומת', 'פסגה']);
});

test('the gap is derived from the marker and shrinks linearly in metres', () => {
  for (const id of LANDMARK_IDS) {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) close(gapAt(id, t), 60 * (1 - t), 1e-9, `${id} t=${t}`);
    close(distanceM(displayedAt(id, 0.5), requestedAt(id)), 30, 1e-9, id);
  }
});

test('the source numbers never change', () => {
  const before = JSON.stringify(LANDMARKS);
  for (const id of LANDMARK_IDS) {
    toDatumB(LANDMARKS[id].a);
    mapNumbers(id, true);
    displayedAt(id, 0.4);
  }
  let s = initialField();
  s = run(s, { type: 'selectAnswer', answer: 'convert' }, { type: 'check' }, { type: 'arrive', run: s.run + 1 });
  assert.equal(JSON.stringify(LANDMARKS), before);
});

test('numbers read left to right', () => {
  assert.equal(formatEN(LANDMARKS.bridge.a), 'E 1200 · N 800');
  assert.equal(formatEN(toDatumB(LANDMARKS.bridge.a)), 'E 1164 · N 752');
});

test('the gap keeps the block’s original wording and thresholds', () => {
  assert.deepEqual(readGap(60), { status: 'סטייה גדולה בהדמיה', consequence: 'המיקום המוצג נמצא באזור אחר של המפה ביחס לנקודה המבוקשת.' });
  assert.deepEqual(readGap(0), { status: 'ללא סטייה', consequence: 'שתי הנקודות קרובות זו לזו. בערך אפס הן חופפות.' });
  assert.deepEqual(readGap(10), { status: 'סטייה קטנה בהדמיה', consequence: 'שתי הנקודות קרובות זו לזו. בערך אפס הן חופפות.' });
  assert.deepEqual(readGap(30), { status: 'סטייה בינונית בהדמיה', consequence: 'המרחק בין המיקום המבוקש למיקום המוצג גדל.' });
  assert.deepEqual(readGap(80), { status: 'סטייה גדולה בהדמיה', consequence: 'הפער בין הנקודות בהדמיה גדול.' });
});

// ---------------------------------------------------------------- the task

test('opening: the bridge, A read as B, 60 m, no answer, no success', () => {
  const s = initialField();
  assert.deepEqual(s, { landmark: 'bridge', answer: null, phase: 'inspect', hint: false, run: 0 });
  assert.equal(isConverted(s), false);
  assert.equal(isOpen(s), true);
  assert.equal(restingT(s), 0);
  assert.deepEqual(stepStatuses(s), ['done', 'active', 'upcoming']);
  assert.equal(run(s, { type: 'check' }), s, 'nothing to check without an answer');
});

test('picking an answer judges nothing and moves nothing', () => {
  const s = run(initialField(), { type: 'selectAnswer', answer: 'label' });
  assert.equal(s.phase, 'inspect');
  assert.equal(restingT(s), 0);
  assert.equal(isConverted(s), false);
  assert.deepEqual(stepStatuses(s), ['done', 'done', 'active']);
  const t = run(s, { type: 'selectAnswer', answer: CORRECT_ANSWER });
  assert.equal(t.phase, 'inspect');
  assert.equal(restingT(t), 0);
});

test('label only: feedback, and no change to the numbers, the place or the gap; try again', () => {
  const s = run(initialField(), { type: 'selectAnswer', answer: 'label' }, { type: 'check' });
  assert.equal(s.phase, 'wrong');
  assert.equal(isConverted(s), false);
  assert.equal(restingT(s), 0);
  assert.deepEqual(mapNumbers(s.landmark, isConverted(s)), LANDMARKS.bridge.a);
  assert.equal(gapAt(s.landmark, restingT(s)), 60);
  assert.deepEqual(stepStatuses(s), ['done', 'done', 'active']);
  // checking it again changes nothing; picking the other answer clears the feedback without judging it
  assert.equal(run(s, { type: 'check' }).phase, 'wrong');
  const t = run(s, { type: 'selectAnswer', answer: 'convert' });
  assert.equal(t.phase, 'inspect');
  assert.equal(t.answer, 'convert');
});

test('convert: the numbers become B, the marker arrives on the landmark, gap 0; no double conversion', () => {
  let s = run(initialField(), { type: 'selectAnswer', answer: 'label' }, { type: 'check' }, { type: 'selectAnswer', answer: 'convert' }, { type: 'check' });
  assert.equal(s.phase, 'converting');
  assert.equal(isConverted(s), true);
  assert.deepEqual(mapNumbers(s.landmark, true), { e: 1164, n: 752 });
  assert.deepEqual(stepStatuses(s), ['done', 'done', 'active'], 'not complete before the marker arrives');
  // a second check while converting, or once done, converts nothing again
  assert.equal(run(s, { type: 'check' }), s);
  assert.equal(run(s, { type: 'selectAnswer', answer: 'label' }), s);
  assert.equal(run(s, { type: 'arrive', run: s.run - 1 }), s, 'a stale arrival is ignored');
  s = run(s, { type: 'arrive', run: s.run });
  assert.equal(s.phase, 'done');
  assert.equal(restingT(s), 1);
  assert.equal(gapAt(s.landmark, restingT(s)), 0);
  assert.deepEqual(stepStatuses(s), ['done', 'done', 'done']);
  assert.equal(run(s, { type: 'check' }), s);
  assert.equal(run(s, { type: 'arrive', run: s.run }), s);
  assert.equal(run(s, { type: 'toggleHint' }), s);
  // the conversion is applied once, to the source numbers: B is still A − shift, never A − 2·shift
  assert.deepEqual(mapNumbers(s.landmark, isConverted(s)), toDatumB(LANDMARKS.bridge.a));
});

test('the hint shows and hides; it never answers, converts or reveals success', () => {
  let s = run(initialField(), { type: 'toggleHint' });
  assert.equal(s.hint, true);
  assert.equal(s.answer, null);
  assert.equal(s.phase, 'inspect');
  assert.equal(isConverted(s), false);
  s = run(s, { type: 'toggleHint' });
  assert.equal(s.hint, false);
  s = run(s, { type: 'toggleHint' }, { type: 'selectAnswer', answer: 'convert' }, { type: 'check' });
  assert.equal(s.hint, false, 'the hint closes once the conversion runs');
});

test('another landmark: its own numbers, back to checking, no stale answer, hint or feedback', () => {
  let s = run(initialField(), { type: 'toggleHint' }, { type: 'selectAnswer', answer: 'label' }, { type: 'check' });
  s = run(s, { type: 'selectLandmark', id: 'junction' });
  assert.deepEqual({ ...s, run: 0 }, { landmark: 'junction', answer: null, phase: 'inspect', hint: false, run: 0 });
  assert.deepEqual(mapNumbers(s.landmark, isConverted(s)), LANDMARKS.junction.a);
  assert.equal(run(s, { type: 'selectLandmark', id: 'junction' }), s, 'the selected landmark again changes nothing');
  // switching during the motion drops it: its arrival no longer counts
  let m = run(s, { type: 'selectAnswer', answer: 'convert' }, { type: 'check' });
  const runInFlight = m.run;
  m = run(m, { type: 'selectLandmark', id: 'summit' });
  assert.equal(m.phase, 'inspect');
  assert.equal(run(m, { type: 'arrive', run: runInFlight }), m);
  m = run(m, { type: 'selectAnswer', answer: 'convert' }, { type: 'check' });
  assert.equal(run(m, { type: 'arrive', run: runInFlight }).phase, 'converting', 'an old run cannot finish the new one');
  assert.equal(run(m, { type: 'arrive', run: m.run }).phase, 'done');
});

test('reset: back to the bridge, the source numbers, 60 m, checking, nothing chosen', () => {
  for (const s of [
    run(initialField(), { type: 'selectLandmark', id: 'summit' }, { type: 'toggleHint' }, { type: 'selectAnswer', answer: 'label' }, { type: 'check' }),
    run(initialField(), { type: 'selectAnswer', answer: 'convert' }, { type: 'check' }),
    run(initialField(), { type: 'selectAnswer', answer: 'convert' }, { type: 'check' }, { type: 'arrive', run: 1 }),
  ]) {
    const r = run(s, { type: 'reset' });
    assert.deepEqual({ ...r, run: 0 }, initialField());
    assert.ok(r.run > s.run, 'a motion under way cannot finish after a reset');
    assert.equal(gapAt(r.landmark, restingT(r)), 60);
    assert.deepEqual(stepStatuses(r), ['done', 'active', 'upcoming']);
  }
});

// ---------------------------------------------------------------- the picture and its projection

test('the rendered terrain was built from this data', () => {
  assert.deepEqual(T.shift, DATUM_SHIFT, 're-render after changing the shift');
  assert.equal(T.image.w / T.image.h, 25 / 14);
  close(TERRAIN_ASPECT, 25 / 14, 1e-12);
  for (const id of LANDMARK_IDS) {
    const p = T.paths[id];
    assert.equal(p.z.length, 25, id);
    assert.equal(p.visible.length, 25, id);
    assert.equal(p.visible[0], '1', `${id}: the camera sees the displayed point`);
    assert.equal(p.visible[24], '1', `${id}: the camera sees the landmark`);
  }
});

test('landmarks and their displaced points stand inside the diorama, clear of its edges', () => {
  for (const id of LANDMARK_IDS) {
    for (const p of [requestedAt(id), displayedAt(id, 0)]) {
      assert.ok(p.e - FIELD_FRAME.e0 >= 30 && FIELD_FRAME.e1 - p.e >= 30, `${id} e ${p.e}`);
      assert.ok(p.n - FIELD_FRAME.n0 >= 30 && FIELD_FRAME.n1 - p.n >= 30, `${id} n ${p.n}`);
    }
  }
});

test('one projection: the converted marker lands exactly on the landmark, inside the picture', () => {
  for (const id of LANDMARK_IDS) {
    const req = requestedPx(id);
    const at1 = displayedPx(id, 1);
    close(at1.x, req.x, 1e-12, id);
    close(at1.y, req.y, 1e-12, id);
    for (const q of [req, displayedPx(id, 0)]) {
      assert.ok(q.x > 0.03 && q.x < 0.97 && q.y > 0.08 && q.y < 0.92, `${id} ${JSON.stringify(q)}`);
    }
    // the draped line runs from the marker to the landmark through the sampled ground
    const line = gapLine(id, 0);
    assert.equal(line.length, 25);
    assert.deepEqual(line[0], displayedPx(id, 0));
    close(line.at(-1).x, req.x, 1e-12);
    assert.equal(gapLine(id, 1).length, 1, 'no line once the gap is closed');
    assert.equal(gapLine(id, 0.5).length, 13);
  }
});

test('pixels never feed the distance: the same 60 m, a different length on screen', () => {
  const box = { w: 668, h: 374 };   // the picture at 1440 px
  const onScreen = LANDMARK_IDS.map((id) => {
    const a = displayedPx(id, 0);
    const b = requestedPx(id);
    return Math.hypot((a.x - b.x) * box.w, (a.y - b.y) * box.h);
  });
  for (const [i, id] of LANDMARK_IDS.entries()) {
    assert.ok(onScreen[i] >= 60, `${id}: the 60 m gap must read on screen (${onScreen[i].toFixed(1)} px)`);
    assert.equal(gapAt(id, 0), 60);
  }
  assert.ok(new Set(onScreen.map((v) => v.toFixed(0))).size === 3, 'perspective draws each gap at its own length');
  // a larger box scales every point alike — the fractions do not change
  const id = 'summit';
  assert.deepEqual(displayedPx(id, 0.3), displayedPx(id, 0.3));
  close(pathZ(id, 0.5), (T.paths[id].z[12]), 1e-12);
});

test('north points up the picture (the camera looks north)', () => {
  const n = northAt('bridge');
  assert.ok(n.y < -0.95, JSON.stringify(n));
  assert.ok(Math.abs(n.x) < 0.3, JSON.stringify(n));
});

test('the delivered assets: the 25:14 terrain and three 16:9 crops of it', async () => {
  const require = createRequire(import.meta.url);
  const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));
  const dir = 'public/assets/lessons/topic02/datum-field-challenge';
  const base = await sharp(`${dir}/terrain-base.webp`).metadata();
  assert.ok(base.width >= 2000 && base.height >= 1120, `${base.width}×${base.height}`);
  assert.equal(base.width * 14, base.height * 25);
  for (const name of ['thumb-bridge', 'thumb-junction', 'thumb-summit']) {
    const m = await sharp(`${dir}/${name}.webp`).metadata();
    assert.ok(m.width >= 480 && m.height >= 270, `${name} ${m.width}×${m.height}`);
    assert.equal(m.width * 9, m.height * 16, name);
  }
});

// ---------------------------------------------------------------- the lesson copy

test('the lesson copy is kept word for word; only the slider instruction changed', () => {
  const file = 'src/components/lessons/topic-02/datum-field/DatumFieldChallenge.tsx';
  assert.ok(existsSync(file), file);
  const src = readFileSync(file, 'utf8');
  const kept = [
    'הדמיה: מה קורה כשהדאטום לא תואם?',
    'לא ניתן לדבר על קואורדינטות של נקודה בלי שנדע מהו הדאטום ומהו ההיטל שלה',
    '(על ההיטל – בחלק הבא).',
    'זוהי המחשה סכמטית: ערכי הסטייה נבחרים לצורך ההדגמה בלבד.',
    'ההדמיה ממחישה זאת: בחרו נקודה, בחנו את הפער בין המיקום המבוקש למיקום המוצג ובחרו כיצד לתקן אותו.',
    'מיקום מבוקש',
    'מיקום מוצג',
    'מ׳ סטייה',
    'משמעות הסטייה בהדמיה',
    'קבלו נקודה', 'בדקו את המיקום', 'תקנו את הטעות',
    'דאטום מקור:', 'דאטום במפה:',
    'איך מתקנים את המיקום המוצג?',
    'שינוי התווית בלבד', 'המרת הקואורדינטות',
    'בדיקת הבחירה', 'רמז', 'איפוס',
    'שינוי התווית בלבד אינו ממיר את הקואורדינטות.',
    'ההמרה משנה את הקואורדינטות ושומרת על המיקום המבוקש.',
    'השוו בין דאטום המקור לדאטום במפה.',
  ];
  for (const s of kept) assert.ok(src.includes(s), `missing: ${s}`);
  assert.ok(!src.includes('הזיזו את המחוון'), 'the slider instruction is replaced');
  const scene = readFileSync('src/components/lessons/topic-02/CoordinatesScene.tsx', 'utf8');
  assert.ok(!scene.includes('function DatumShiftDemo'), 'the slider demo is gone from the scene');
  assert.ok(/<DatumGuided \/>\s*<DatumFieldChallenge \/>\s*<Part1Summary \/>/.test(scene) || /<DatumFit \/>\s*<DatumFieldChallenge \/>\s*<Part1Summary \/>/.test(scene),
    'the challenge sits where the slider demo was, before the part summary');
});
