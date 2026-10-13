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
  caseSource, caseTarget, optionKind, optionGap, isRight, feedbackFor, checkedResult,
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

// ---------------------------------------------------------------- stage 3: practice

test('5) when the datums already match, the original numbers are right and any change makes a gap', () => {
  const c = CASES.find((x) => x.id === 'same');
  assert.equal(c.place, 'bridge');
  assert.equal(c.source, 'A');
  assert.equal(c.target, 'A');
  assert.deepEqual(caseSource(c), EN(1200, 800));
  assert.deepEqual(c.options, [EN(1164, 752), EN(1200, 800), EN(1236, 848)]);
  assert.deepEqual(c.options.map((p) => optionGap(c, p)), [60, 0, 60]);
  assert.deepEqual(c.options.map((p) => isRight(c, p)), [false, true, false]);
  assert.deepEqual(c.options.map((p) => optionKind(c, p)), ['minus', 'kept', 'plus']);
  assert.equal(feedbackFor(c, c.options[1]), c.feedback.right);
  assert.equal(feedbackFor(c, c.options[0]), c.feedback.wrong);
  assert.equal(feedbackFor(c, c.options[2]), c.feedback.wrong);
  assert.match(c.feedback.wrong, /60 מטר/);
});

test('6) the junction, B → A: gaps 0 / 60 / 120 m, and each mistake gets its own explanation', () => {
  const c = CASES.find((x) => x.id === 'reverse');
  assert.equal(c.place, 'junction');
  assert.equal(c.source, 'B');
  assert.equal(c.target, 'A');
  assert.deepEqual(caseSource(c), EN(1054, 712));
  assert.deepEqual(caseTarget(c), EN(1090, 760));
  assert.deepEqual(c.options, [EN(1090, 760), EN(1054, 712), EN(1018, 664)]);
  assert.deepEqual(c.options.map((p) => optionGap(c, p)), [0, 60, 120]);
  assert.deepEqual(c.options.map((p) => optionKind(c, p)), ['plus', 'kept', 'minus']);
  assert.deepEqual(c.options[0], convert(caseSource(c), 'B', 'A'), 'the right pair is the B→A conversion');
  const texts = c.options.map((p) => feedbackFor(c, p));
  assert.equal(texts[0], c.feedback.right);
  assert.equal(texts[1], c.feedback.kept);
  assert.equal(texts[2], c.feedback.minus);
  assert.notEqual(texts[1], texts[2]);
  assert.match(texts[1], /60 מטר/);
  assert.match(texts[2], /120 מטר/);
});

test('right comes from the data, not from a slot; every option has an explanation and stays on the map', () => {
  const slots = CASES.map((c) => c.options.findIndex((p) => isRight(c, p)));
  assert.equal(new Set(slots).size, CASES.length, `the right pair moves between cases: ${slots}`);
  for (const c of CASES) {
    assert.equal(c.options.filter((p) => isRight(c, p)).length, 1, c.id);
    for (const p of c.options) {
      assert.ok(typeof feedbackFor(c, p) === 'string' && feedbackFor(c, p).length > 10, `${c.id} ${formatEN(p)}`);
      assert.ok(insideMap(interpret(p, c.target), 25), `${c.id} ${formatEN(p)} lands inside the map`);
    }
  }
  assert.ok(insideMap(ERROR_BEFORE, 25));
  for (const id of Object.keys(PLACES)) assert.ok(insideMap(PLACES[id].ground, 60), id);
});

test('choosing previews, checking judges; a wrong answer stays open to correction', () => {
  let s = at('practice');
  const c = CASES[0];
  const wrong = c.options.findIndex((p) => !isRight(c, p));
  const right = c.options.findIndex((p) => isRight(c, p));
  s = run(s, { type: 'check' });
  assert.equal(s.practice.checked, null, 'nothing to check before a choice');
  s = run(s, { type: 'choose', option: wrong });
  assert.equal(s.practice.choice, wrong);
  assert.equal(s.practice.checked, null, 'a choice is only a preview');
  assert.ok(!s.practice.solved[0]);
  s = run(s, { type: 'check' });
  assert.deepEqual(checkedResult(s.practice), { option: wrong, right: false });
  assert.ok(!s.practice.solved[0]);
  s = run(s, { type: 'choose', option: right });
  assert.equal(s.practice.checked, null, 'a new choice clears the old verdict');
  s = run(s, { type: 'check' });
  assert.deepEqual(checkedResult(s.practice), { option: right, right: true });
  assert.ok(s.practice.solved[0]);
  // after success: compare another option, and come back
  s = run(s, { type: 'choose', option: wrong }, { type: 'check' });
  assert.equal(checkedResult(s.practice).right, false);
  assert.ok(s.practice.solved[0], 'solving once is kept');
});

test('7) cases start clean; summary only after both; practise again and back to the demonstration', () => {
  let s = run(at('practice'), { type: 'choose', option: 2 });
  s = run(s, { type: 'goCase', index: 1 });
  assert.equal(s.practice.index, 1);
  assert.equal(s.practice.choice, null);
  assert.equal(s.practice.checked, null);
  assert.deepEqual(run(s, { type: 'showSummary' }).practice.summary, false, 'no summary before both are right');
  const solve = (st) => {
    const c = CASES[st.practice.index];
    return run(st, { type: 'choose', option: c.options.findIndex((p) => isRight(c, p)) }, { type: 'check' });
  };
  s = solve(s);
  s = solve(run(s, { type: 'goCase', index: 0 }));
  s = run(s, { type: 'showSummary' });
  assert.ok(s.practice.summary);
  assert.equal(run(s, { type: 'choose', option: 0 }).practice.choice, s.practice.choice, 'the summary takes no answers');
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
  assert.deepEqual(run(s, { type: 'choose', option: 1 }), s);
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

// ---------------------------------------------------------------- the copy (§5–§7, §10)

test('the activity’s copy: source wording kept, datums and physical locations distinguished', () => {
  const src = readFileSync('src/components/lessons/topic-02/datum-field/DatumFieldChallenge.tsx', 'utf8');
  const required = [
    // kept
    'הדמיה: מה קורה כשהדאטום לא תואם?',
    'לא ניתן לדבר על קואורדינטות של נקודה בלי שנדע מהו הדאטום ומהו ההיטל שלה',
    '(על ההיטל – בחלק הבא).',
    // §10 and §4
    'מפות ממקורות שונים עשויות להשתמש בדאטומים שונים.',
    'A ו־B הם דאטומים בדיוניים; ההבדל ביניהם מוצג כאן כהזזה קבועה לצורך ההמחשה בלבד.',
    // stages
    'משווים', 'בודקים את הטעות', 'מתרגלים',
    // §5
    'גשר אחד, קואורדינטות בשני דאטומים',
    'שתי מערכות ייחוס למדידת מיקום. כל אחת נותנת לאותו גשר מספרי קואורדינטות שונים.',
    'דאטום A', 'דאטום B', 'בחרו באיזה דאטום להציג את קואורדינטות הגשר',
    'הגשר נשאר באותו מקום. בהמרה לדאטום B המספרים שמייצגים אותו משתנים.',
    'מה קורה בלי המרה?',
    // §6
    'אותם מספרים נקראים בדאטום אחר',
    'נתוני המקור · דאטום',
    'המפה מפרשת את הנתונים בדאטום B',
    'קיבלנו את המספרים בדאטום A, אבל המפה קוראת אותם כ־B.',
    'העתקת המספרים ללא המרה',
    'המספרים שנשלחו למפה',
    'המיקום לפי המספרים',
    'העיגול מסמן את הגשר הקבוע.',
    'העתיקו ללא המרה: המעוין יראה לאן המפה מפנה אותנו.',
    'המעוין נמצא 60 מטר מהגשר: מספרי A נקראו כ־B ללא המרה. הגשר לא זז — הסימון שגוי.',
    'שינוי הכיתוב בלבד',
    'מחליפים את האות בכותרת של עותק הנתונים; המספרים אינם משתנים.',
    'החלפנו את הכיתוב מ־A ל־B, אבל המספרים לא השתנו. לכן המעוין נשאר 60 מטר מהגשר. כדי לתקן צריך להמיר את המספרים.',
    'המרת הנתונים מ־A ל־B',
    'ההמרה שינתה את המספרים לייצוג בדאטום B, ולכן המעוין חזר לגשר. הגשר עצמו נשאר במקומו.',
    'הסימון תואם למיקום הגשר',
    'המחשת המעבר',
    'נסו על נתונים נוספים',
    // §7
    'איזה צמד מספרים צריך לשלוח למפת היעד כדי לשמור על אותו מקום?',
    'תצוגה מקדימה',
    'בדיקת הנתונים',
    'בהמחשה הזאת: A→B מחסיר (36,48); B→A מוסיף (36,48).',
    'לפני שימוש בקואורדינטות בודקים באיזה דאטום נמסרו הנתונים ובאיזה דאטום משתמשת המפה. כשנדרשת המרה, משנים את המספרים באופן ששומר על אותו מקום בשטח.',
    'תרגול חוזר', 'חזרה להדגמה',
  ];
  for (const s of required) assert.ok(src.includes(s), `missing: ${s}`);
  // §1, §9: gone — the north glyph, the hint, the picker and its thumbnails, the old diorama and wording
  for (const s of ['רמז', 'בחירת נקודה', 'thumb-', 'terrain-base', 'פסגה', 'מיקום מבוקש', 'זוהי המחשה סכמטית', 'ההדמיה ממחישה זאת', 'הגשר בשטח', 'רשת דאטום']) {
    assert.ok(!src.includes(s), `still there: ${s}`);
  }
  assert.ok(!/>\s*N\s*</.test(src), 'no N glyph');
  // §4, §10: phrasing to avoid
  for (const s of ['הנקודה זזה בשטח', 'תמיד גורם לסטייה', 'בטוח', 'מסוכן']) assert.ok(!src.includes(s), `avoid: ${s}`);
  // the cases’ texts are the brief’s
  const all = CASES.flatMap((c) => Object.values(c.feedback));
  for (const s of [
    'המקור והמפה משתמשים כאן באותו דאטום. אין צורך בהמרה; המספרים המקוריים כבר מצביעים על הגשר.',
    'שיניתם מספרים אף שהדאטום כבר תואם. בהדגמה הזאת השינוי מזיז את הסימון 60 מטר מהגשר.',
    'כאן המקור הוא B והיעד הוא A, ולכן כיוון ההמרה הפוך מהדוגמה הקודמת. המספרים השתנו והסימון נשאר בצומת.',
    'הועתקו מספרי B למפה שקוראת אותם כ־A. הפער נשאר 60 מטר.',
    'הופעלה המרה בכיוון A→B אף שהנתונים כבר ב־B. בהמחשה הזאת הפער גדל ל־120 מטר.',
  ]) assert.ok(all.includes(s), `case feedback: ${s}`);
});

test('the rule shown to the learner is the model’s shift, and the map draws the tested grid', () => {
  const src = readFileSync('src/components/lessons/topic-02/datum-field/DatumFieldChallenge.tsx', 'utf8');
  const rule = src.match(/A→B מחסיר \((\d+),(\d+)\); B→A מוסיף \((\d+),(\d+)\)/);
  assert.ok(rule, 'the rule sentence is there');
  assert.deepEqual(rule.slice(1).map(Number), [SHIFT.e, SHIFT.n, SHIFT.e, SHIFT.n]);
  assert.ok(/gridLines\(/.test(src), 'the map draws gridLines(), the function tested above');
  // the slide in stage 1 moves every line by the same fraction of the shift
  const half = gridLines(0.5);
  for (const l of half.e) assert.equal(l.ground - l.value, SHIFT.e / 2);
  for (const l of half.n) assert.equal(l.ground - l.value, SHIFT.n / 2);
});

test('the lesson around it is untouched: same place in the scene, before the part summary', () => {
  const scene = readFileSync('src/components/lessons/topic-02/CoordinatesScene.tsx', 'utf8');
  assert.ok(/<DatumGuided \/>\s*<DatumFieldChallenge \/>\s*<Part1Summary \/>/.test(scene), 'DatumGuided → the activity → the part summary');
});
