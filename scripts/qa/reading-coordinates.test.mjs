// Unit tests for topic-02 "כיצד מפרשים קואורדינטות?" (reading-coordinates/readingModel.ts).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/reading-coordinates.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GEO, GEO_TOKENS, UTM, UTM_TOKENS, REFERENCE, QUESTIONS, DONE_TEXT,
  judge, solution, checkReducer, initialCheck, closed, canReveal,
} from '../../src/components/lessons/topic-02/reading-coordinates/readingModel.ts';
import { READINGS } from '../../src/components/lessons/topic-02/reference-systems/referenceSystemsGeometry.ts';
import { DATUM, ZONE } from '../../src/components/lessons/topic-02/reference-systems/referenceSystems.data.ts';

const written = (tokens) => tokens.map((t) => (t.gap ? ` ${t.text}` : t.text)).join('');
const glyphsOf = (tokens, part) => tokens.filter((t) => t.parts.includes(part)).map((t) => t.text);
const NB = ' ';

test('the examples are point A of the reference-systems map, as that screen shows it', () => {
  const A = READINGS.A;
  // the map shows "31° 48′ 27.98″ N" with no-break spaces; the decomposition writes plain spaces
  assert.equal(written(GEO_TOKENS), `${A.latShown}, ${A.lonShown}`.replaceAll(NB, ' '));
  assert.equal(written(GEO_TOKENS), '31° 48′ 27.98″ N, 35° 07′ 28.83″ E');
  assert.equal(written(UTM_TOKENS), `${ZONE.zone}${ZONE.hemisphere} E ${A.eText} N ${A.nText}`);
  assert.equal(written(UTM_TOKENS), '36N E 701125 N 3521095');
  assert.equal(REFERENCE.datum, DATUM);
});

test('every key row marks glyphs that exist in its reading, and every glyph run belongs to a row', () => {
  for (const [ex, tokens] of [[GEO, GEO_TOKENS], [UTM, UTM_TOKENS]]) {
    const ids = ex.rows.map((r) => r.id);
    for (const id of ids) assert.ok(glyphsOf(tokens, id).length > 0, `${id} marks nothing`);
    for (const t of tokens) if (t.text !== ',') assert.ok(t.parts.some((p) => ids.includes(p)), `"${t.text}" belongs to no row`);
  }
  // the parts the brief names
  assert.deepEqual(GEO.rows.map((r) => r.id), ['lat', 'lon', 'dir', 'units']);
  assert.deepEqual(UTM.rows.map((r) => r.id), ['zone', 'hemi', 'east', 'north', 'metres']);
  assert.deepEqual(glyphsOf(GEO_TOKENS, 'dir'), ['N', 'E']);
  assert.deepEqual(glyphsOf(GEO_TOKENS, 'units'), ['°', '′', '″', '°', '′', '″']);
  assert.deepEqual(glyphsOf(UTM_TOKENS, 'hemi'), ['N']);
  assert.deepEqual(glyphsOf(UTM_TOKENS, 'metres'), ['701125', '3521095']);
});

test('excerpts in the key are the glyphs of the reading', () => {
  const geo = written(GEO_TOKENS);
  for (const r of GEO.rows) for (const run of r.excerpt.runs) assert.ok(geo.includes(run.replaceAll(NB, ' ')), `${r.id}: ${run}`);
  const utm = written(UTM_TOKENS);
  for (const r of UTM.rows) if ('runs' in r.excerpt) for (const run of r.excerpt.runs) assert.ok(utm.includes(run.replaceAll(NB, ' ')), `${r.id}: ${run}`);
  assert.ok('implied' in UTM.rows.find((r) => r.id === 'metres').excerpt, 'metres are not written in the reading');
});

test('derived distances in the UTM key follow the data', () => {
  const east = UTM.rows.find((r) => r.id === 'east').body;
  const north = UTM.rows.find((r) => r.id === 'north').body;
  assert.match(east, /כ־201 ק״מ מזרחית/);
  assert.match(north, /כ־3521 ק״מ/);
});

test('no order is stated as a universal rule; each example states its own order', () => {
  for (const s of [GEO.orderNote, UTM.orderNote]) {
    assert.match(s, /בדוגמה הזאת/);
    assert.doesNotMatch(s, /תמיד|אף פעם/);
  }
  assert.match(GEO.orderNote, /לפי אות הכיוון/);
  assert.match(UTM.orderNote, /לפי התווית/);
});

test('in the lesson: no deck the learner lacks; the note keeps what the old screen defined', () => {
  const all = [
    REFERENCE.body, DONE_TEXT, GEO.orderNote, UTM.orderNote,
    ...QUESTIONS.flatMap((q) => [q.ask, q.hint ?? '', q.explain, ...q.options.flatMap((o) => [o.label, o.why]), ...Object.values(q.missing ?? {})]),
  ];
  for (const c of all) assert.doesNotMatch(c, /מצגת/, c);
  // the datum (same in both readings, WGS84), what a reference system holds, and that
  // latitude / longitude are geographic coordinates, not a projection — UTM is the one with a projection
  assert.match(REFERENCE.body, /שתי הקריאות נכתבו בדאטום \[\[WGS84\]\]/);
  assert.match(REFERENCE.body, /הדאטום, הצירים והיחידות, וב־\[\[UTM\]\] גם ההיטל/);
  assert.match(REFERENCE.body, /רוחב ואורך אינם היטל/);
  assert.match(REFERENCE.body, /קואורדינטות 1/);
});

test('LTR runs are balanced in all copy', () => {
  const copy = [
    ...GEO.rows.flatMap((r) => [r.name, r.body]), ...UTM.rows.flatMap((r) => [r.name, r.body]),
    REFERENCE.body, DONE_TEXT,
    ...QUESTIONS.flatMap((q) => [q.ask, q.explain, ...q.options.flatMap((o) => [o.label, o.why]), ...Object.values(q.missing ?? {})]),
  ];
  for (const c of copy) {
    assert.equal((c.match(/\[\[/g) ?? []).length, (c.match(/\]\]/g) ?? []).length, c);
    // Latin letters and digits with symbols sit inside a run, never loose in Hebrew
    const loose = c.replace(/\[\[.*?\]\]/g, '');
    assert.doesNotMatch(loose, /[A-Za-z°′″ϕλ=]/, `loose LTR in: ${c}`);
  }
});

test('judge: one right answer per single question; the full set for the many question', () => {
  const [order, hemi, missing] = QUESTIONS;
  assert.deepEqual(solution(order), ['lat']);
  assert.deepEqual(solution(hemi), ['hemi']);
  assert.deepEqual(solution(missing).sort(), ['datum', 'hemi', 'zone']);
  assert.equal(judge(order, ['lat']).right, true);
  assert.deepEqual(judge(order, ['lon']).notes, [order.options[1].why]);
  assert.equal(judge(missing, ['zone', 'hemi', 'datum']).right, true);
  assert.equal(judge(missing, ['datum', 'zone', 'hemi']).right, true, 'order of picks does not matter');
});

test('judge: wrong feedback explains each extra pick and hints at each missing one, without naming the answer', () => {
  const missing = QUESTIONS[2];
  const v = judge(missing, ['zone', 'units']);
  assert.equal(v.right, false);
  assert.deepEqual(v.notes, [missing.options.find((o) => o.id === 'units').why, missing.missing.hemi, missing.missing.datum]);
  // the hints lead to the answer, but never spell its option labels
  for (const id of ['zone', 'hemi', 'datum']) {
    const label = missing.options.find((o) => o.id === id).label;
    assert.ok(!missing.missing[id].includes(label), `hint for ${id} names "${label}"`);
  }
  // single-choice explanations do not quote the right option's label
  for (const q of QUESTIONS.filter((x) => x.kind === 'one')) {
    const right = q.options.find((o) => o.right).label;
    for (const o of q.options.filter((x) => !x.right)) assert.ok(!o.why.includes(right), `${q.id}/${o.id} gives the answer away`);
  }
});

test('flow: feedback comes before the solution; any change clears the verdict; next only when closed', () => {
  let s = initialCheck;
  assert.equal(canReveal(s), false, 'no solution before a first check');
  s = checkReducer(s, { type: 'check' });
  assert.equal(s.tries, 0, 'nothing to check without a pick');
  s = checkReducer(s, { type: 'pick', id: 'lon' });
  s = checkReducer(s, { type: 'next' });
  assert.equal(s.index, 0, 'cannot skip an open question');
  s = checkReducer(s, { type: 'check' });
  assert.equal(s.verdict.right, false);
  assert.equal(canReveal(s), true, 'solution offered after the explaining feedback');
  s = checkReducer(s, { type: 'pick', id: 'zone' });
  assert.equal(s.verdict, null, 'a new pick clears the old verdict');
  assert.equal(canReveal(s), true, 'the offer stays once a check was made');
  s = checkReducer(s, { type: 'reveal' });
  assert.equal(s.revealed, true);
  assert.deepEqual(s.pick, ['lat'], 'the solution shows the right option');
  assert.equal(closed(s), true);
  const locked = checkReducer(s, { type: 'pick', id: 'lon' });
  assert.equal(locked, s, 'a closed question ignores picks');
  s = checkReducer(s, { type: 'next' });
  assert.deepEqual([s.index, s.pick, s.tries, s.revealed], [1, [], 0, false]);
  s = checkReducer(checkReducer(s, { type: 'pick', id: 'hemi' }), { type: 'check' });
  assert.equal(s.verdict.right, true);
  assert.equal(canReveal(s), false, 'no solution button after a right answer');
  s = checkReducer(s, { type: 'next' });
  // many: toggles
  s = checkReducer(s, { type: 'pick', id: 'zone' });
  s = checkReducer(s, { type: 'pick', id: 'units' });
  s = checkReducer(s, { type: 'pick', id: 'units' });
  assert.deepEqual(s.pick, ['zone']);
  for (const id of ['hemi', 'datum']) s = checkReducer(s, { type: 'pick', id });
  s = checkReducer(s, { type: 'check' });
  assert.equal(s.verdict.right, true);
  s = checkReducer(s, { type: 'next' });
  assert.equal(s.done, true);
  s = checkReducer(s, { type: 'restart' });
  assert.deepEqual(s, initialCheck);
});
