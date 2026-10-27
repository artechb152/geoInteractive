// Unit tests for the lesson-6 "שלושה סוגי צפון" reference lab (north-lab/northLabGeometry.ts).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/north-lab.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRUE_NORTH_ANGLE, GRID_NORTH_ANGLE, TARGET_TRUE_BEARING, DECLINATION_START, DECLINATION_MIN, DECLINATION_MAX,
  normalize, northAngles, referenceAngle, azimuthFrom, bearings, clampDeclination, formatSigned, declinationText, relationText,
  clockwiseSweep, arcPath, wedgePath, arcLabelBox, ARC_R, spreadRow, arrowLabels, insetLabels, insetAngles,
  LAB_W, LAB_H, LAB_MARGIN, LAB_A, LAB_B, B_RADIUS, POINT_R, ARROW_LEN, RING, RING_NUMBER_R, ARC_LABEL, INSET,
  INSET_GAIN, INSET_ORIGIN, INSET_ARROW_LEN, NOTE_POS,
} from '../../src/components/lessons/topic-06/north-lab/northLabGeometry.ts';
import { formatDeg, polar, boxesOverlap, segmentHitsBox } from '../../src/components/lessons/topic-06/compassMapGeometry.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const STEPS = Array.from({ length: DECLINATION_MAX - DECLINATION_MIN + 1 }, (_, i) => DECLINATION_MIN + i);
const inside = (box, outer, pad = 0) =>
  box.x >= outer.x + pad && box.y >= outer.y + pad && box.x + box.w <= outer.x + outer.w - pad && box.y + box.h <= outer.y + outer.h - pad;
const SHEET = { x: 0, y: 0, w: LAB_W, h: LAB_H };

test('experiment constants: TN 0°, GN +2°, target 066°, declination −6° in −10…+10', () => {
  assert.equal(TRUE_NORTH_ANGLE, 0);
  assert.equal(GRID_NORTH_ANGLE, 2);
  assert.equal(TARGET_TRUE_BEARING, 66);
  assert.equal(DECLINATION_START, -6);
  assert.deepEqual([DECLINATION_MIN, DECLINATION_MAX], [-10, 10]);
});

test('normalize wraps through 0° both ways', () => {
  for (const [x, n] of [[0, 0], [360, 0], [-6, 354], [-366, 354], [726, 6], [359.5, 359.5], [-0.5, 359.5]]) {
    close(normalize(x), n, 1e-9, `normalize(${x})`);
  }
});

test('azimuth = normalize(66 − reference), including across 0°', () => {
  assert.equal(azimuthFrom(0), 66);
  assert.equal(azimuthFrom(66), 0);
  assert.equal(azimuthFrom(70), 356); // reference past the target → wraps, never negative
  assert.equal(azimuthFrom(-300), 6);
});

test('acceptance table: true 066° / grid 064° / magnetic per declination', () => {
  const table = [
    [-10, '066°', '064°', '076°'],
    [-6, '066°', '064°', '072°'],
    [0, '066°', '064°', '066°'],
    [2, '066°', '064°', '064°'],
    [10, '066°', '064°', '056°'],
  ];
  for (const [d, t, g, m] of table) {
    const b = bearings(d);
    assert.deepEqual([formatDeg(b.true), formatDeg(b.grid), formatDeg(b.magnetic)], [t, g, m], `declination ${d}`);
  }
  for (const d of STEPS) {
    assert.equal(bearings(d).magnetic, 66 - d);
    assert.equal(referenceAngle('magnetic', d), d);
    assert.equal(referenceAngle('true', d), 0);
    assert.equal(referenceAngle('grid', d), 2);
  }
});

test('opening state reads 066° / 064° / 072°', () => {
  const b = bearings(DECLINATION_START);
  assert.deepEqual([formatDeg(b.true), formatDeg(b.grid), formatDeg(b.magnetic)], ['066°', '064°', '072°']);
});

test('declination helpers: clamp, signed format, words for the side', () => {
  assert.equal(clampDeclination(-14), -10);
  assert.equal(clampDeclination(12), 10);
  assert.equal(clampDeclination(-5.6), -6);
  assert.deepEqual([formatSigned(-6), formatSigned(0), formatSigned(2), formatSigned(10), formatSigned(-0.2)], ['−6°', '0°', '+2°', '+10°', '0°']);
  assert.equal(declinationText(-6), '6 מעלות מערבה');
  assert.equal(declinationText(2), '2 מעלות מזרחה');
  assert.equal(declinationText(0), '0 מעלות');
  assert.equal(declinationText(-1), 'מעלה אחת מערבה');
});

test('arc goes clockwise from the chosen north to AB, wrapping through 0°', () => {
  assert.equal(clockwiseSweep(-6, 66), 72);
  assert.equal(clockwiseSweep(350, 10), 20);
  assert.equal(clockwiseSweep(10, 350), 340);
  // sweep flag 1 (clockwise on screen); large-arc only past 180°
  assert.match(arcPath(LAB_A, 50, -6, 66), / 0 0 1 /);
  assert.match(arcPath(LAB_A, 50, 10, 350), / 0 1 1 /);
  assert.match(wedgePath(LAB_A, 50, 0, 66), /^M300 386L.*Z$/);
  for (const d of STEPS) {
    for (const id of ['true', 'grid', 'magnetic']) {
      const from = referenceAngle(id, d);
      assert.equal(clockwiseSweep(from, TARGET_TRUE_BEARING), azimuthFrom(from), `${id} @ ${d}`);
      assert.ok(clockwiseSweep(from, TARGET_TRUE_BEARING) < 180, 'no arc over 180° in range');
    }
  }
  // the arc's end lands on AB
  const end = arcPath(LAB_A, 50, -6, 66).split(' ').slice(-2).map(Number);
  const onAB = polar(LAB_A, 50, 66);
  close(end[0], onAB.x, 0.01);
  close(end[1], onAB.y, 0.01);
});

test('geometry: TN straight up, GN 2° east, MN at the slider, B fixed at 066°', () => {
  const tn = polar(LAB_A, ARROW_LEN, 0);
  close(tn.x, LAB_A.x, 1e-9, 'TN x');
  assert.ok(tn.y < LAB_A.y);
  const gn = polar(LAB_A, ARROW_LEN, 2);
  close(Math.atan2(gn.x - LAB_A.x, LAB_A.y - gn.y) * 180 / Math.PI, 2, 1e-9, 'GN bearing');
  const mn = polar(LAB_A, ARROW_LEN, -6);
  assert.ok(mn.x < LAB_A.x, 'MN at −6° leans west');
  close(Math.hypot(LAB_B.x - LAB_A.x, LAB_B.y - LAB_A.y), B_RADIUS, 1e-9, 'AB length');
  close(Math.atan2(LAB_B.x - LAB_A.x, LAB_A.y - LAB_B.y) * 180 / Math.PI, 66, 1e-9, 'AB bearing');
  // 24° above the right-hand horizon
  close(Math.atan2(LAB_A.y - LAB_B.y, LAB_B.x - LAB_A.x) * 180 / Math.PI, 24, 1e-9, 'AB elevation');
});

test('sheet furniture: ring, B, number print and note stay inside the sheet', () => {
  const ringBox = { x: LAB_A.x - RING.image, y: LAB_A.y - RING.image, w: 2 * RING.image, h: 2 * RING.image };
  assert.ok(inside(ringBox, SHEET, 0), 'ring image inside sheet');
  const bBox = { x: LAB_B.x - POINT_R.b - 3, y: LAB_B.y - POINT_R.b - 3, w: 2 * POINT_R.b + 6, h: 2 * POINT_R.b + 6 };
  assert.ok(inside(bBox, SHEET, LAB_MARGIN), 'B inside sheet');
  assert.ok(!boxesOverlap(bBox, INSET, 8), 'B clear of the inset');
  assert.ok(RING_NUMBER_R > RING.bezelIn + 10 && RING_NUMBER_R < RING.knurlIn - 5, 'numbers on the bezel');
  assert.ok(!boxesOverlap(ringBox, INSET, 0) || Math.hypot(INSET.x + INSET.w - LAB_A.x, INSET.y + INSET.h - LAB_A.y) > RING.image, 'ring clear of the inset');
  assert.ok(inside(INSET, SHEET, LAB_MARGIN), 'inset inside sheet');
  assert.ok(NOTE_POS.x >= LAB_MARGIN && NOTE_POS.y <= LAB_H - LAB_MARGIN, 'note inside');
  assert.ok(LAB_A.x - RING.image > NOTE_POS.x + 150 || NOTE_POS.y - 14 > LAB_A.y + RING.image, 'note clear of the ring');
});

test('spreadRow keeps order, spacing and bounds', () => {
  assert.deepEqual(spreadRow([10, 100, 200], 20, 4, 0, 300), [10, 100, 200]);
  const s = spreadRow([100, 100, 100], 20, 4, 0, 300);
  assert.deepEqual(s, [76, 100, 124]);
  const c = spreadRow([5, 6], 20, 4, 0, 300);
  assert.ok(c[0] - 10 >= 0 && c[1] - c[0] >= 24);
});

test('arrow labels: no overlap, inside the sheet, clear of the inset, at every slider step', () => {
  for (const d of STEPS) {
    const labels = arrowLabels(d);
    assert.equal(labels.length, 3);
    for (let i = 0; i < labels.length; i++) {
      const L = labels[i];
      assert.ok(inside(L.box, SHEET, LAB_MARGIN), `${L.id} @ ${d} inside`);
      assert.ok(!boxesOverlap(L.box, INSET, 6), `${L.id} @ ${d} clear of inset`);
      assert.ok(L.box.y + L.box.h < L.tip.y, `${L.id} @ ${d} above its tip`);
      for (let j = i + 1; j < labels.length; j++) assert.ok(!boxesOverlap(L.box, labels[j].box, 2), `${L.id}/${labels[j].id} @ ${d}`);
      // no label sits on any arrow shaft or on AB
      for (const M of labels) assert.ok(!segmentHitsBox(LAB_A, M.tip, L.box, 0), `${L.id} on ${M.id} shaft @ ${d}`);
      assert.ok(!segmentHitsBox(LAB_A, LAB_B, L.box, 4), `${L.id} on AB @ ${d}`);
    }
    // labels read west → east in angle order
    const xs = labels.map((l) => l.box.x);
    assert.deepEqual([...xs].sort((a, b) => a - b), xs);
  }
});

test('overlap is honest: MN = TN at 0°, MN = GN at +2°, both labels shown', () => {
  const at0 = Object.fromEntries(arrowLabels(0).map((l) => [l.id, l]));
  assert.deepEqual(at0.magnetic.tip, at0.true.tip);
  assert.ok(at0.magnetic.leader || at0.true.leader, 'a leader line marks the shared tip');
  const at2 = Object.fromEntries(arrowLabels(2).map((l) => [l.id, l]));
  assert.deepEqual(at2.magnetic.tip, at2.grid.tip);
});

test('measurement number: inside the face, off every line, for every choice and step', () => {
  for (const d of STEPS) {
    for (const id of ['true', 'grid', 'magnetic']) {
      const from = referenceAngle(id, d);
      const box = arcLabelBox(from);
      const corners = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]];
      for (const [x, y] of corners) assert.ok(Math.hypot(x - LAB_A.x, y - LAB_A.y) < RING.cut - 1, `${id} @ ${d} corner in the face`);
      // its nearest point stays beyond the arc stroke (the number sits just outside the arc)
      const near = { x: Math.max(box.x, Math.min(LAB_A.x, box.x + box.w)), y: Math.max(box.y, Math.min(LAB_A.y, box.y + box.h)) };
      assert.ok(Math.hypot(near.x - LAB_A.x, near.y - LAB_A.y) > ARC_R + 1, `${id} @ ${d} clear of the arc`);
      for (const [n, ang] of Object.entries(northAngles(d))) {
        assert.ok(!segmentHitsBox(LAB_A, polar(LAB_A, ARROW_LEN, ang), box, 1), `${id} @ ${d} on ${n}`);
      }
      assert.ok(!segmentHitsBox(LAB_A, LAB_B, box, 1), `${id} @ ${d} on AB`);
      assert.ok(!boxesOverlap(box, { x: LAB_A.x - POINT_R.a, y: LAB_A.y - POINT_R.a, w: 2 * POINT_R.a, h: 2 * POINT_R.a }, 2));
    }
  }
  assert.ok(ARC_LABEL.r - ARC_LABEL.w / 2 > 0, "number beyond the arc");
});

test('inset: enlarged ×4 angles keep side and order; name-only labels sit in the inset, apart', () => {
  assert.equal(INSET_GAIN, 4);
  for (const d of STEPS) {
    const a = insetAngles(d);
    assert.deepEqual(a, { true: 0, grid: 8, magnetic: 4 * d });
    assert.equal(Math.sign(a.magnetic), Math.sign(d));
    const labels = insetLabels(d);
    for (let i = 0; i < labels.length; i++) {
      const L = labels[i];
      assert.equal(L.value, northAngles(d)[L.id], 'label keeps the source value (printed on the main map only)');
      assert.ok(inside(L.box, INSET, 4), `${L.id} @ ${d} inside inset`);
      assert.ok(L.box.y > INSET.y + 22, `${L.id} @ ${d} under the inset title`);
      for (let j = i + 1; j < labels.length; j++) assert.ok(!boxesOverlap(L.box, labels[j].box, 1), `inset ${L.id}/${labels[j].id} @ ${d}`);
    }
    const tipY = Math.max(...labels.map((l) => l.tip.y));
    assert.ok(INSET_ORIGIN.y + 6 < INSET.y + INSET.h && tipY < INSET_ORIGIN.y, 'arrows inside');
    close(Math.hypot(labels[0].tip.x - INSET_ORIGIN.x, labels[0].tip.y - INSET_ORIGIN.y), INSET_ARROW_LEN, 1e-9);
  }
});

test('relation line: names the side, agrees with the computed azimuths, never a blanket rule', () => {
  assert.equal(relationText('true', -6), 'זה הבסיס להשוואה: הזוויות שעל החצים במפה נמדדות ממנו.');
  assert.equal(relationText('true', 7), relationText('true', -6), 'true north does not follow the slider');
  assert.equal(relationText('grid', -6), 'בדוגמה, צפון הרשת נוטה 2° מזרחה מהצפון האמיתי, ולכן האזימוט קטן ב־2°.');
  assert.equal(relationText('grid', 9), relationText('grid', -6), 'grid north does not follow the slider');
  assert.equal(relationText('magnetic', -6), 'בדוגמה, הצפון המגנטי נוטה 6° מערבה מהצפון האמיתי, ולכן האזימוט גדול ב־6°.');
  assert.equal(relationText('magnetic', 0), 'בדוגמה, הצפון המגנטי חופף לצפון האמיתי, ולכן האזימוט זהה.');
  assert.equal(relationText('magnetic', 10), 'בדוגמה, הצפון המגנטי נוטה 10° מזרחה מהצפון האמיתי, ולכן האזימוט קטן ב־10°.');
  assert.equal(relationText('magnetic', -5.6), relationText('magnetic', -6), 'whole degrees, like the readouts');
  for (const d of STEPS) {
    for (const id of ['grid', 'magnetic']) {
      const t = relationText(id, d);
      const diff = bearings(d)[id] - bearings(d).true; // > 0: larger than the true azimuth
      assert.ok(t.startsWith('בדוגמה, '), `${id} @ ${d}: marked as example data`);
      assert.ok(!/תמיד|מוסיפים|מחסירים/.test(t), `${id} @ ${d}: no blanket rule`);
      if (diff === 0) assert.match(t, /חופף.*זהה/);
      else {
        assert.ok(t.includes(`${Math.abs(diff)}°`), `${id} @ ${d}: the difference ${diff}° is named`);
        assert.equal(t.includes('מערבה'), diff > 0, `${id} @ ${d}: west ↔ larger`);
        assert.equal(t.includes('גדול'), diff > 0, `${id} @ ${d}: larger only when west`);
        assert.equal(t.includes('קטן'), diff < 0, `${id} @ ${d}: smaller only when east`);
      }
    }
  }
});
