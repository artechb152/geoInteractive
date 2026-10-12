// Unit tests for the base-60 decomposition (topic-02 #scene-coordinates-2 → "חלוקה ב־60: אותה
// נקודה, כמה דרכי כתיבה", design/mockups/base60-concepts-2026-10-12/claude-code-handoff.txt,
// alternative 2): the arithmetic, the four writings, judging attempts, hints and the activity.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/base60-workbench.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOURCE, breakdown, dec, formatValue, formatOpen, newestFormat, splitFraction, parseNumber, judge,
  hintText, wrongText, successText, formatNote, stepDone, plain, BLANK, HINTS,
  initialState, reducer, activeStep,
} from '../../src/components/lessons/topic-02/base60/base60.ts';

const run = (s, ...actions) => actions.reduce(reducer, s);
const at = (patch) => ({ ...BLANK, ...patch });
const U = 10_000;

// ---------------------------------------------------------------- the arithmetic (handoff: דיוק לימודי)

test('the handoff’s equalities, both axes, every writing', () => {
  assert.equal(formatValue(SOURCE.lon, 'D'), '35.1234°');
  assert.equal(formatValue(SOURCE.lon, 'DM'), '35°07.404′');
  assert.equal(formatValue(SOURCE.lon, 'DMS'), '35°07′24.24″');
  assert.equal(formatValue(SOURCE.lon, 'S'), '126444.24″');
  assert.equal(formatValue(SOURCE.lat, 'D'), '33.5678°');
  assert.equal(formatValue(SOURCE.lat, 'DM'), '33°34.068′');
  assert.equal(formatValue(SOURCE.lat, 'DMS'), '33°34′04.08″');
  assert.equal(formatValue(SOURCE.lat, 'S'), '120844.08″');
});

test('the steps: 0.1234 × 60 = 7.404′, 0.404 × 60 = 24.24″; whole parts kept', () => {
  const b = breakdown(SOURCE.lon);
  assert.equal(b.deg, 35);
  assert.equal(dec(b.degFrac), '0.1234');
  assert.equal(dec(b.minAll), '7.404');
  assert.equal(b.min, 7);
  assert.equal(dec(b.minFrac), '0.404');
  assert.equal(dec(b.sec), '24.24');
  const l = breakdown(SOURCE.lat);
  assert.deepEqual([l.deg, dec(l.degFrac), dec(l.minAll), l.min, dec(l.minFrac), dec(l.sec)], [33, '0.5678', '34.068', 34, '0.068', '4.08']);
});

test('the inverse and S come back exactly to the source (no rounding, no carry)', () => {
  for (const units of Object.values(SOURCE)) {
    const b = breakdown(units);
    // D = deg + min/60 + sec/3600, in 1e-4 second: exact
    assert.equal(b.total % 3600, 0);
    assert.equal(b.total / 3600, units);
    assert.equal(b.total, b.deg * 3600 * U + b.min * 60 * U + b.sec);
    assert.ok(b.min < 60 && b.sec < 60 * U, 'minutes and seconds stay under 60');
    assert.ok(Number.isInteger(b.minAll) && Number.isInteger(b.sec));
  }
});

test('writings open as the steps produce them', () => {
  assert.deepEqual(['D', 'DM', 'DMS', 'S'].map((f) => formatOpen(f, 0)), [true, false, false, false]);
  assert.deepEqual(['D', 'DM', 'DMS', 'S'].map((f) => formatOpen(f, 2)), [true, true, false, false]);
  assert.deepEqual(['D', 'DM', 'DMS', 'S'].map((f) => formatOpen(f, 3)), [true, true, true, true]);
  assert.deepEqual([0, 1, 2, 3].map(newestFormat), ['D', 'D', 'DM', 'DMS']);
});

test('format notes: D shows the inverse, S the total in seconds', () => {
  assert.equal(plain(formatNote('lon', 'D')), 'D — הכול במעלות: 35 + 7/60 + 24.24/3600 = 35.1234°');
  assert.equal(plain(formatNote('lon', 'S')), 'S — הכול בשניות: 35 × 3600 + 7 × 60 + 24.24 = 126444.24″');
  assert.equal(plain(formatNote('lat', 'S')), 'S — הכול בשניות: 33 × 3600 + 34 × 60 + 4.08 = 120844.08″');
});

// ---------------------------------------------------------------- judging

test('a point or a comma; unit marks ignored; not-a-number refused', () => {
  assert.deepEqual(parseNumber('7.404'), { value: 7.404, dp: 3 });
  assert.deepEqual(parseNumber('7,404'), { value: 7.404, dp: 3 });
  assert.deepEqual(parseNumber(' 24.24″ '), { value: 24.24, dp: 2 });
  assert.equal(parseNumber('7.4.4'), null);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber(''), null);
});

test('step 1: keep the whole degrees', () => {
  assert.equal(judge('lon', 1, at({ pick: 'whole' })), 'right');
  assert.equal(judge('lon', 1, at({ pick: 'frac' })), 'pickFrac');
  assert.equal(judge('lon', 1, at({ pick: 'all' })), 'pickAll');
  assert.equal(judge('lon', 1, at({})), 'noPick');
});

test('steps 2–3: right answers, either separator', () => {
  assert.equal(judge('lon', 2, at({ op: 'mul', value: '7.404' })), 'right');
  assert.equal(judge('lon', 2, at({ op: 'mul', value: '7,404' })), 'right');
  assert.equal(judge('lon', 3, at({ op: 'mul', value: '24.24' })), 'right');
  assert.equal(judge('lat', 2, at({ op: 'mul', value: '34.068' })), 'right');
  assert.equal(judge('lat', 3, at({ op: 'mul', value: '4.08' })), 'right');
  assert.equal(judge('lat', 3, at({ op: 'mul', value: '04,08' })), 'right');
});

test('each mistake has its reason', () => {
  assert.equal(judge('lon', 2, at({ value: '7.404' })), 'noOp');
  assert.equal(judge('lon', 2, at({ op: 'mul' })), 'empty');
  assert.equal(judge('lon', 2, at({ op: 'mul', value: 'x' })), 'nan');
  assert.equal(judge('lon', 2, at({ op: 'div', value: '7.404' })), 'div');
  assert.equal(judge('lon', 2, at({ op: 'mul', value: '2107.404' })), 'whole'); // 35.1234 × 60
  assert.equal(judge('lon', 3, at({ op: 'mul', value: '444.24' })), 'whole'); // 7.404 × 60
  assert.equal(judge('lon', 2, at({ op: 'mul', value: '12.34' })), 'shift'); // the fraction's digits as minutes
  assert.equal(judge('lon', 3, at({ op: 'mul', value: '40.4' })), 'shift');
  assert.equal(judge('lon', 2, at({ op: 'mul', value: '7.4' })), 'rounded');
  assert.equal(judge('lon', 3, at({ op: 'mul', value: '24' })), 'rounded');
  assert.equal(judge('lon', 2, at({ op: 'mul', value: '74.04' })), 'range');
  assert.equal(judge('lon', 2, at({ op: 'mul', value: '6.5' })), 'off');
  assert.equal(plain(wrongText('lon', 2, 'whole')), '35 המעלות נשמרות. כופלים רק את 0.1234.');
  assert.equal(plain(wrongText('lon', 2, 'div')), 'כדי לעבור ליחידה קטנה יותר כופלים ב־60. נסו שוב עם שבר המעלה.');
  assert.equal(plain(wrongText('lon', 3, 'div')), 'כדי לעבור ליחידה קטנה יותר כופלים ב־60. נסו שוב עם שבר הדקה.');
});

test('hints: highlight → ×60 rule → a worked calculation that leaves the sum to the learner', () => {
  assert.deepEqual(HINTS, { 1: 2, 2: 3, 3: 3 });
  assert.deepEqual(splitFraction(1234), [1000, 234]);
  assert.deepEqual(splitFraction(680), [600, 80]);
  assert.equal(plain(hintText('lon', 2, 3)), 'חישוב בחלקים: 0.1 × 60 = 6, וגם 0.0234 × 60 = 1.404. חברו את שתי התוצאות.');
  assert.equal(plain(hintText('lon', 3, 3)), 'חישוב בחלקים: 0.4 × 60 = 24, וגם 0.004 × 60 = 0.24. חברו את שתי התוצאות.');
  assert.equal(plain(hintText('lat', 3, 3)), 'חישוב בחלקים: 0.06 × 60 = 3.6, וגם 0.008 × 60 = 0.48. חברו את שתי התוצאות.');
  for (const axis of ['lon', 'lat'])
    for (const step of [2, 3]) {
      const answer = step === 2 ? dec(breakdown(SOURCE[axis]).minAll) : dec(breakdown(SOURCE[axis]).sec);
      for (let level = 1; level <= 3; level++) assert.ok(!plain(hintText(axis, step, level)).includes(`= ${answer}`), `${axis} ${step} ${level} gives the answer`);
    }
});

test('the handoff’s exact success line', () => {
  assert.equal(plain(successText('lon', 'practice')), 'נכון — 35 מעלות, 7 דקות ו־24.24 שניות מתארות את אותו ערך.');
  assert.equal(stepDone('lon', 2).eq, '0.1234 × 60 = 7.404′');
  assert.equal(stepDone('lon', 3).eq, '0.404 × 60 = 24.24″');
});

// ---------------------------------------------------------------- the activity

test('opening: the longitude, guided, nothing decomposed, D shown; the latitude waits as practice', () => {
  const s = initialState();
  assert.equal(s.axis, 'lon');
  assert.equal(s.lon.mode, 'guided');
  assert.equal(s.lon.done, 0);
  assert.equal(s.lon.fmt, 'D');
  assert.equal(s.lat.mode, 'practice');
});

test('guided: three "next" decompose the value; DM then DMS become the shown writing', () => {
  let s = run(initialState(), { type: 'next' });
  assert.equal(s.lon.done, 1);
  assert.equal(s.lon.fmt, 'D');
  s = run(s, { type: 'next' });
  assert.equal(s.lon.fmt, 'DM');
  s = run(s, { type: 'next' });
  assert.equal(activeStep(s.lon), null);
  assert.equal(s.lon.fmt, 'DMS');
  assert.equal(run(s, { type: 'next' }), s, 'nothing past the end');
  // practice actions do nothing in the guided example
  assert.equal(run(initialState(), { type: 'check' }).lon.done, 0);
});

test('practice: a wrong check explains and keeps the step; a right one moves on', () => {
  let s = run(initialState(), { type: 'next' }, { type: 'next' }, { type: 'next' }, { type: 'practice' });
  assert.equal(s.lon.mode, 'practice');
  assert.equal(s.lon.done, 0);
  s = run(s, { type: 'pick', pick: 'all' }, { type: 'check' });
  assert.equal(s.lon.done, 0);
  assert.deepEqual(s.lon.attempt.msg, { kind: 'wrong', why: 'pickAll' });
  s = run(s, { type: 'pick', pick: 'whole' }, { type: 'check' });
  assert.equal(s.lon.done, 1);
  assert.deepEqual(s.lon.attempt, BLANK);
  s = run(s, { type: 'op', op: 'div' }, { type: 'input', value: '7.404' }, { type: 'check' });
  assert.equal(s.lon.attempt.msg.why, 'div');
  s = run(s, { type: 'op', op: 'mul' }, { type: 'check' });
  assert.equal(s.lon.done, 2);
  assert.equal(s.lon.fmt, 'DM');
  s = run(s, { type: 'op', op: 'mul' }, { type: 'input', value: '24,24' }, { type: 'check' });
  assert.equal(s.lon.done, 3);
  assert.match(s.say.text, /^נכון\. .*נכון — 35 מעלות, 7 דקות ו־24\.24 שניות/);
});

test('hints step up to the step’s last level and stay there', () => {
  let s = run(initialState(), { type: 'axis', axis: 'lat' }, { type: 'hint' });
  assert.deepEqual(s.lat.attempt.msg, { kind: 'hint', level: 1 });
  s = run(s, { type: 'hint' }, { type: 'hint' });
  assert.equal(s.lat.attempt.hints, 2, 'step 1 has two levels');
  s = run(s, { type: 'pick', pick: 'whole' }, { type: 'check' }, { type: 'hint' }, { type: 'hint' }, { type: 'hint' }, { type: 'hint' });
  assert.equal(s.lat.attempt.hints, 3);
  assert.equal(s.lat.attempt.value, '', 'a hint never fills the answer');
});

test('back undoes one step and closes writings that step opened; reset restarts the axis', () => {
  let s = run(initialState(), { type: 'next' }, { type: 'next' }, { type: 'next' }, { type: 'format', fmt: 'S' });
  assert.equal(s.lon.fmt, 'S');
  s = run(s, { type: 'back' });
  assert.equal(s.lon.done, 2);
  assert.equal(s.lon.fmt, 'DM');
  s = run(s, { type: 'back' }, { type: 'back' });
  assert.equal(s.lon.done, 0);
  assert.equal(s.lon.fmt, 'D');
  assert.equal(run(s, { type: 'back' }), s, 'nothing before the start');
  s = run(initialState(), { type: 'next' }, { type: 'next' }, { type: 'next' }, { type: 'practice' }, { type: 'pick', pick: 'whole' }, { type: 'check' }, { type: 'reset' });
  assert.deepEqual(s.lon, initialState().lon, 'reset returns to the guided opening');
});

test('switching axes keeps each axis’s own progress and never changes the source', () => {
  let s = run(initialState(), { type: 'next' }, { type: 'next' }, { type: 'axis', axis: 'lat' });
  assert.equal(s.axis, 'lat');
  assert.equal(s.lat.done, 0);
  s = run(s, { type: 'pick', pick: 'whole' }, { type: 'check' }, { type: 'axis', axis: 'lon' });
  assert.equal(s.lon.done, 2);
  assert.equal(s.lat.done, 1);
  assert.deepEqual(SOURCE, { lon: 351234, lat: 335678 });
});

test('a closed writing cannot be chosen', () => {
  const s = initialState();
  assert.equal(run(s, { type: 'format', fmt: 'DMS' }), s);
});

test('every change of state says one line', () => {
  let s = initialState();
  for (const a of [{ type: 'next' }, { type: 'next' }, { type: 'format', fmt: 'D' }, { type: 'back' }, { type: 'axis', axis: 'lat' }, { type: 'hint' }, { type: 'check' }]) {
    const n = s.say.n;
    s = reducer(s, a);
    assert.equal(s.say.n, n + 1, a.type);
    assert.ok(s.say.text.length > 0 && !s.say.text.includes('[['), a.type);
  }
});

// ---------------------------------------------------------------- the calculator (calc.ts)

test('the calculator: the steps’ arithmetic, precedence, brackets, and what it refuses', async () => {
  const { evaluate, showNumber } = await import('../../src/components/lessons/topic-02/base60/calc.ts');
  const show = (e) => { const v = evaluate(e); return v === null ? null : showNumber(v); };
  assert.equal(show('0.1234 × 60'), '7.404');
  assert.equal(show('0.404×60'), '24.24');
  assert.equal(show('35 × 3600 + 7 × 60 + 24.24'), '126444.24');
  assert.equal(show('24.24 ÷ 60'), '0.404');
  assert.equal(show('0,5*4'), '2');
  assert.equal(show('2 + 3 × 4'), '14');
  assert.equal(show('(2 + 3) × 4'), '20');
  assert.equal(show('−3 + 3'), '0');
  assert.equal(show('.5 + .5'), '1');
  for (const bad of ['', '3 ×', '(2 + 3', '2 ÷ 0', '1..2', '× 3'])
    assert.equal(evaluate(bad), null, bad);
});
