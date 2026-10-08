// Unit tests for the scale scene geometry (spec §5).
// Run: node --experimental-strip-types --test scripts/qa/scale-geo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toMerc, fromMerc, sheetBox, lonLatToSheet, sheetToLonLat, insideSheet, groundDistanceM,
  sheetCm, readCm, readingPrecisionM, metersPerSheetCm, formatNumber, formatRatio, formatDistance,
  parseKm, classifyAnswer, sheetsNeeded, niceScaleBar, nearAny,
} from '../../src/components/lessons/topic-02/scale/geo.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const TAVOR = { lat: 32.687, lon: 35.39 };
const sheet = (D, W) => ({ denominator: D, center: TAVOR, groundWidthM: W, sheetCm: 24, bbox3857: sheetBox(TAVOR, W) });
const S10 = sheet(10000, 2400);
const S50 = sheet(50000, 12000);
const S250 = sheet(250000, 60000);
const PAIRS = {
  basilicaShibli: [{ lat: 32.68626, lon: 35.39242 }, { lat: 32.69372, lon: 35.396 }],
  summitReservoir: [{ lat: 32.68711, lon: 35.38962 }, { lat: 32.66323, lon: 35.38019 }],
  afulaTiberias: [{ lat: 32.60756, lon: 35.28909 }, { lat: 32.79385, lon: 35.53286 }],
};

test('mercator round-trip', () => {
  const p = fromMerc(...toMerc({ lat: 32.6871, lon: 35.38962 }));
  close(p.lat, 32.6871, 1e-9);
  close(p.lon, 35.38962, 1e-9);
});

// Reference: the standard WGS84 series for the length of one degree.
const degLat = (phi) => 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi);
const degLon = (phi) => 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi);

test('ground distance matches WGS84 degree lengths', () => {
  const phi = (32.7 * Math.PI) / 180;
  close(groundDistanceM({ lat: 32.2, lon: 35 }, { lat: 33.2, lon: 35 }), degLat(phi), 2, 'lat');
  close(groundDistanceM({ lat: 32.7, lon: 35 }, { lat: 32.7, lon: 36 }), degLon(phi), 2, 'lon');
});

test('sheet east-west width equals the nominal ground width; centre maps to 500,500', () => {
  for (const s of [S10, S50, S250]) {
    const w = sheetToLonLat(s, { x: 0, y: 500 });
    const e = sheetToLonLat(s, { x: 1000, y: 500 });
    close(groundDistanceM({ lat: TAVOR.lat, lon: w.lon }, { lat: TAVOR.lat, lon: e.lon }), s.groundWidthM, s.groundWidthM * 0.001);
    const c = lonLatToSheet(s, TAVOR);
    close(c.x, 500, 1e-6);
    close(c.y, 500, 1e-6);
  }
});

test('each sheet is exactly 1/5 of the next', () => {
  const q = lonLatToSheet(S50, sheetToLonLat(S10, { x: 0, y: 0 }));
  close(q.x, 400, 1e-6);
  close(q.y, 400, 1e-6);
  const r = lonLatToSheet(S250, sheetToLonLat(S50, { x: 1000, y: 1000 }));
  close(r.x, 600, 1e-6);
  close(r.y, 600, 1e-6);
});

test('insideSheet', () => {
  assert.equal(insideSheet({ x: 0, y: 1000 }), true);
  assert.equal(insideSheet({ x: -0.1, y: 10 }), false);
  assert.equal(insideSheet({ x: 10, y: 1000.1 }), false);
});

test('the Mercator picture stays within 1% of true scale (so the drawn ruler is honest)', () => {
  for (const [name, [a, b]] of Object.entries(PAIRS)) {
    for (const s of [S10, S50, S250]) {
      const pa = lonLatToSheet(s, a);
      const pb = lonLatToSheet(s, b);
      const viaPicture = (Math.hypot(pb.x - pa.x, pb.y - pa.y) / 1000) * s.groundWidthM;
      const truth = groundDistanceM(a, b);
      assert.ok(Math.abs(viaPicture - truth) / truth < 0.01, `${name} on 1:${s.denominator}: ${viaPicture} vs ${truth}`);
    }
  }
});

test('ground distance is the same whichever sheet the points are read from', () => {
  const [a, b] = PAIRS.basilicaShibli;
  const d = [S10, S50, S250].map((s) =>
    groundDistanceM(sheetToLonLat(s, lonLatToSheet(s, a)), sheetToLonLat(s, lonLatToSheet(s, b))),
  );
  close(d[0], d[1], 1e-6);
  close(d[1], d[2], 1e-6);
});

test('sheet centimetres, reading and precision', () => {
  close(sheetCm(890, 10000), 8.9, 1e-12);
  close(sheetCm(1000, 250000), 0.4, 1e-12);
  assert.equal(readCm(8.94), 8.9);
  assert.equal(readCm(0.36), 0.4);
  assert.equal(readingPrecisionM(10000), 10);
  assert.equal(readingPrecisionM(50000), 50);
  assert.equal(readingPrecisionM(250000), 250);
  assert.equal(metersPerSheetCm(50000), 500);
});

test('formatting', () => {
  assert.equal(formatNumber(89000), '89,000');
  assert.equal(formatNumber(5.76, 2), '5.76');
  assert.equal(formatNumber(2.4, 1), '2.4');
  assert.equal(formatRatio(250000), '1:250,000');
  assert.equal(formatDistance(894.3, 10), '890 מ׳');
  assert.equal(formatDistance(2812, 50), '2.8 ק״מ');
  assert.equal(formatDistance(2750, 50), '2.75 ק״מ');
  assert.equal(formatDistance(60000), '60 ק״מ');
  assert.equal(formatDistance(1000, 250), '1 ק״מ');
  assert.equal(formatDistance(500), '500 מ׳');
});

test('parseKm', () => {
  assert.equal(parseKm(' 2.8 '), 2.8);
  assert.equal(parseKm('2,8'), 2.8);
  assert.equal(parseKm('abc'), null);
  assert.equal(parseKm(''), null);
});

test('classifyAnswer branches', () => {
  const D = 50000;
  const others = [10000, 50000, 250000];
  const exp = 2800;
  assert.equal(classifyAnswer('2.8', exp, D, others).kind, 'correct');
  assert.equal(classifyAnswer('2.75', exp, D, others).kind, 'correct');
  assert.equal(classifyAnswer('2.81', exp, D, others).kind, 'over-precise');
  const ten = classifyAnswer('28', exp, D, others);
  assert.equal(ten.kind, 'unit');
  assert.equal(ten.factor, 10);
  assert.equal(classifyAnswer('0.28', exp, D, others).kind, 'unit');
  const den = classifyAnswer('0.56', exp, D, others);
  assert.equal(den.kind, 'denominator');
  assert.equal(den.otherDenominator, 10000);
  assert.equal(classifyAnswer('14', exp, D, others).otherDenominator, 250000);
  assert.equal(classifyAnswer('5', exp, D, others).kind, 'off');
  assert.equal(classifyAnswer('x', exp, D, others).kind, 'invalid');
});

test('classifyAnswer: zero and tiny answers are "off", not a unit slip', () => {
  const D = 50000;
  const others = [10000, 50000, 250000];
  // ÷100 and ÷1000 targets (28 m, 2.8 m) are finer than 1 mm on the sheet (50 m): no unit claim there.
  assert.equal(classifyAnswer('0', 2800, D, others).kind, 'off');
  assert.equal(classifyAnswer('0.0', 2800, D, others).kind, 'off');
  assert.equal(classifyAnswer('0.01', 2800, D, others).kind, 'off');
  assert.equal(classifyAnswer('0.003', 2800, D, others).kind, 'off');
  // ÷10 is still a unit slip (280 m ≥ 50 m).
  const tenth = classifyAnswer('0.28', 2800, D, others);
  assert.equal(tenth.kind, 'unit');
  assert.equal(tenth.factor, 0.1);
  // On 1:10,000 (precision 10 m) a ÷100 slip of 8.9 km is 89 m, still a unit slip.
  assert.equal(classifyAnswer('0.089', 8900, 10000, others).kind, 'unit');
});

test('nearAny: within the radius of any centre', () => {
  const a = { lat: 32.66323, lon: 35.38019 };
  const b = { lat: 32.65929, lon: 35.38078 };
  assert.equal(nearAny(a, [a], 0), true);
  assert.equal(nearAny(b, [a], 250), false);
  assert.equal(nearAny(b, [a, b], 250), true);
  assert.equal(nearAny(a, [], 1e6), false);
  const east = { lat: a.lat, lon: a.lon + 0.0024 }; // ≈ 225 m east
  assert.equal(nearAny(east, [a], 250), true);
  assert.equal(nearAny(east, [a], 200), false);
});

test('sheetsNeeded', () => {
  const einDor = { lat: 32.65625, lon: 35.41704 };
  const summit = { lat: 32.68711, lon: 35.38962 };
  assert.equal(sheetsNeeded([einDor, summit], 2400), 4);
  assert.equal(sheetsNeeded([einDor, summit], 12000), 1);
  assert.equal(sheetsNeeded(PAIRS.afulaTiberias, 12000), 4);
});

test('niceScaleBar picks a round length near the target', () => {
  const r = niceScaleBar(4, 110);
  assert.equal(r.meters, 500);
  close(r.px, 125, 1e-9);
});
