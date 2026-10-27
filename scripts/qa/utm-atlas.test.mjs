// Unit tests for the topic-02 UTM zone atlas ("אטלס הפלחים", utm-atlas/utmAtlas.ts + atlasGeometry.ts).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/utm-atlas.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPENING, PRESETS, TRANSFER, GREENWICH_ZONE, SOUTH_LIMIT, NORTH_LIMIT,
  normLon, wrapZone, zoneWest, zoneEast, regularZone, utmZoneOf, exceptionAt, zoneBands, zoneRangeAt, zoneOutline,
  zoneBoundarySegments, readUtm, moveToZone, moveToHemisphere, fmtLon, fmtLat, fmtRange, zoneStep, hemisphereOf, inCoverage,
  cellAt, cellOutline,
} from '../../src/components/lessons/topic-02/utm-atlas/utmAtlas.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);

/* PROJ via proj4 2.22.0, '+proj=utm +zone=Z [+south] +datum=WGS84' from EPSG:4326
   (computed 2026-10-12 in a scratch folder; proj4 is not a project dependency). */
const PROJ = {
  start: { lat: 32, lon: 33, zone: 36, hemisphere: 'N', e: 500000.0, n: 3540435.6933 },
  'start-south': { lat: -32, lon: 33, zone: 36, hemisphere: 'S', e: 500000.0, n: 6459564.3067 },
  jerusalem: { lat: 31.78, lon: 35.22, zone: 36, hemisphere: 'N', e: 710213.6053, n: 3518196.2586 },
  istanbul: { lat: 41.01, lon: 28.98, zone: 35, hemisphere: 'N', e: 666500.5289, n: 4541755.3725 },
  'cape-town': { lat: -33.92, lon: 18.42, zone: 34, hemisphere: 'S', e: 261488.8264, n: 6243716.333 },
  madrid: { lat: 40.42, lon: -3.7, zone: 30, hemisphere: 'N', e: 440615.6618, n: 4474610.02 },
  rio: { lat: -22.91, lon: -43.17, zone: 23, hemisphere: 'S', e: 687687.6925, n: 7465276.069 },
  singapore: { lat: 1.29, lon: 103.85, zone: 48, hemisphere: 'N', e: 372057.3682, n: 142612.9105 },
  bergen: { lat: 60.39, lon: 5.32, zone: 32, hemisphere: 'N', e: 297230.2202, n: 6700510.1753 },
  tokyo: { lat: 35.68, lon: 139.69, zone: 54, hemisphere: 'N', e: 381454.3458, n: 3949247.2365 },
  'buenos-aires': { lat: -34.6, lon: -58.38, zone: 21, hemisphere: 'S', e: 373458.6072, n: 6170448.5113 },
  nairobi: { lat: -1.29, lon: 36.82, zone: 37, hemisphere: 'S', e: 257422.7797, n: 9857312.0679 },
  longyearbyen: { lat: 78.22, lon: 15.65, zone: 33, hemisphere: 'N', e: 514813.5273, n: 8683004.1533 },
  'zone37-edge': { lat: 32, lon: 36, zone: 37, hemisphere: 'N', e: 216576.7735, n: 3544369.9095 },
  'zone36-near-edge': { lat: 32, lon: 35.999, zone: 36, hemisphere: 'N', e: 783328.714, n: 3544367.2852 },
  'south-limit': { lat: -80, lon: 33, zone: 36, hemisphere: 'S', e: 500000.0, n: 1118414.184 },
};

test('zone, hemisphere and E/N match PROJ for every point the page offers (≤ 1 mm)', () => {
  for (const [k, p] of Object.entries(PROJ)) {
    const r = readUtm({ lat: p.lat, lon: p.lon });
    assert.equal(r.zone, p.zone, `${k} zone`);
    assert.equal(r.hemisphere, p.hemisphere, `${k} hemisphere`);
    close(r.e, p.e, 0.001, `${k} E`);
    close(r.n, p.n, 0.001, `${k} N`);
    assert.equal(r.eText, String(Math.round(p.e)), `${k} E text`);
    assert.equal(r.nText, String(Math.round(p.n)), `${k} N text`);
  }
  for (const p of [...PRESETS, ...TRANSFER]) assert.ok(PROJ[p.id], `${p.id} has a PROJ reference`);
});

test('opening state (brief): 33°E 32°N → zone 36, N, 30°E–36°E, on the central meridian', () => {
  assert.deepEqual([OPENING.lat, OPENING.lon], [32, 33]);
  const r = readUtm(OPENING);
  assert.equal(r.zone, 36);
  assert.equal(r.hemisphere, 'N');
  assert.deepEqual(r.range, { w: 30, e: 36 });
  assert.equal(fmtRange(r.range), '30°E – 36°E');
  assert.equal(r.eText, '500000');
  assert.equal(r.nText, '3540436');
  assert.equal(r.exception, null);
});

test('zone numbering: 60 × 6° eastward from 180°, a boundary belongs to the zone east of it', () => {
  assert.equal(regularZone(-180), 1);
  assert.equal(regularZone(179.999), 60);
  assert.equal(regularZone(180), 1); // 180° is −180°
  assert.equal(regularZone(-0.0001), 30);
  assert.equal(regularZone(0), 31);
  assert.equal(zoneWest(GREENWICH_ZONE), 0);
  assert.equal(zoneEast(30), 0);
  assert.deepEqual([zoneWest(35), zoneEast(35)], [24, 30]);
  assert.deepEqual([zoneWest(36), zoneEast(36)], [30, 36]);
  assert.deepEqual([zoneWest(37), zoneEast(37)], [36, 42]);
  for (let z = 1; z <= 60; z++) {
    assert.equal(regularZone(zoneWest(z)), z);
    assert.equal(regularZone(zoneWest(z) + 5.999), z);
  }
  assert.equal(wrapZone(61), 1);
  assert.equal(wrapZone(0), 60);
  assert.equal(zoneStep(60, 1), 1);
  assert.equal(zoneStep(1, 60), -1);
  assert.equal(zoneStep(36, 31), -5);
  assert.equal(normLon(181), -179);
  assert.equal(normLon(-180), -180);
});

test('exceptions: south-west Norway (32V) and Svalbard (31X/33X/35X/37X)', () => {
  const z = (lat, lon) => utmZoneOf({ lat, lon });
  assert.equal(z(60, 4), 32);
  assert.equal(z(60, 2.99), 31);
  assert.equal(z(60, 12), 33);
  assert.equal(z(55.99, 4), 31);
  assert.equal(z(64, 4), 31);
  assert.equal(z(71.99, 10), 32);
  assert.equal(z(72, 8.99), 31);
  assert.equal(z(72, 9), 33);
  assert.equal(z(78, 20.99), 33);
  assert.equal(z(78, 21), 35);
  assert.equal(z(78, 32.99), 35);
  assert.equal(z(78, 33), 37);
  assert.equal(z(84, 41.99), 37);
  assert.equal(z(78, 42), 38);
  assert.equal(z(78, -1), 30);
  assert.equal(exceptionAt({ lat: 60.39, lon: 5.32 }), 'norway');
  assert.equal(exceptionAt({ lat: 78.22, lon: 15.65 }), 'svalbard');
  assert.equal(exceptionAt(OPENING), null);
  // regular zones elsewhere at the same latitudes
  assert.equal(z(60, -100), regularZone(-100));
  assert.equal(z(78, 100), regularZone(100));
});

test('zone shapes: bands, ranges and outlines follow the exceptions', () => {
  assert.deepEqual(zoneBands(36), [{ s: SOUTH_LIMIT, n: 72, w: 30, e: 36 }]);
  assert.deepEqual(zoneBands(33), [{ s: SOUTH_LIMIT, n: 72, w: 12, e: 18 }, { s: 72, n: NORTH_LIMIT, w: 9, e: 21 }]);
  assert.deepEqual(zoneRangeAt(32, 60), { w: 3, e: 12 });
  assert.deepEqual(zoneRangeAt(31, 60), { w: 0, e: 3 });
  assert.deepEqual(zoneRangeAt(31, 84), { w: 0, e: 9 });
  assert.equal(zoneRangeAt(36, 75), null);
  assert.deepEqual(zoneRangeAt(1, 84), { w: -180, e: -174 });
  // every point of every zone's range is that zone
  for (let z = 30; z <= 38; z++) {
    for (const b of zoneBands(z)) {
      for (const lat of [b.s + 0.01, (b.s + b.n) / 2, b.n - 0.01]) {
        for (const f of [0.001, 0.5, 0.999]) assert.equal(utmZoneOf({ lat, lon: b.w + f * (b.e - b.w) }), z, `zone ${z} at ${lat}`);
      }
    }
  }
  const o = zoneOutline(32);
  assert.deepEqual(o[0], [6, SOUTH_LIMIT]);
  assert.ok(o.some(([lon, lat]) => lon === 3 && lat === 64), 'zone 32 outline steps west to 3°E');
  assert.ok(!o.some(([, lat]) => lat > 72), 'zone 32 stops at 72°N');
});

test('zone boundary lines agree with the lookup, exceptions included', () => {
  const segs = zoneBoundarySegments();
  const vert = (lon, s, n) => segs.some(([[x1, y1], [x2, y2]]) => x1 === lon && x2 === lon && y1 <= s && y2 >= n);
  const horiz = (lat, w, e) => segs.some(([[x1, y1], [x2, y2]]) => y1 === lat && y2 === lat && x1 <= w && x2 >= e);
  assert.ok(vert(30, SOUTH_LIMIT, 72), '30°E');
  assert.ok(vert(36, SOUTH_LIMIT, 72), '36°E');
  assert.ok(vert(6, SOUTH_LIMIT, 56) && vert(6, 64, 72), '6°E outside 32V');
  assert.ok(!vert(6, 57, 63), 'no 6°E inside 32V');
  assert.ok(vert(3, 56, 64), '3°E bounds 32V');
  assert.ok(vert(9, 72, NORTH_LIMIT) && vert(21, 72, NORTH_LIMIT) && vert(33, 72, NORTH_LIMIT), 'Svalbard boundaries');
  assert.ok(!vert(12, 73, 83) && !vert(30, 73, 83), 'no 12°E / 30°E in the Svalbard band');
  assert.ok(vert(-174, SOUTH_LIMIT, NORTH_LIMIT), 'a regular boundary runs pole-ward to 84°N');
  assert.ok(horiz(56, 3, 6) && horiz(64, 3, 6), '32V steps');
  assert.ok(horiz(72, 6, 12) && horiz(72, 18, 24) && horiz(72, 30, 36), 'Svalbard steps');
  assert.ok(!horiz(72, 12.5, 17.5), 'zone 33 is continuous at 72°N');
});

test('practice: a map click chooses the cell at that place — its zone and its side of the equator', () => {
  // every practice point: clicking on it chooses its own zone and hemisphere
  for (const p of TRANSFER) {
    const r = readUtm(p);
    assert.deepEqual(cellAt(p), { zone: r.zone, hemisphere: r.hemisphere }, p.id);
  }
  assert.deepEqual(cellAt({ lat: 51.48, lon: -0.01 }), { zone: 30, hemisphere: 'N' }, 'just west of Greenwich: 30');
  assert.deepEqual(cellAt({ lat: 51.48, lon: 0 }), { zone: GREENWICH_ZONE, hemisphere: 'N' }, 'on Greenwich: 31 (a boundary belongs to the zone east of it)');
  assert.deepEqual(cellAt({ lat: 0, lon: 36.82 }), { zone: 37, hemisphere: 'N' }, 'on the equator: N');
  assert.deepEqual(cellAt({ lat: -0.01, lon: 36.82 }), { zone: 37, hemisphere: 'S' });
  assert.deepEqual(cellAt({ lat: 20, lon: 181 }), { zone: 1, hemisphere: 'N' }, 'longitude wraps');
  assert.equal(cellAt({ lat: 60, lon: 4 }).zone, 32, 'exceptions apply (south-west Norway)');
});

test('practice: a cell is the zone on one side of the equator; without a hemisphere, the whole zone', () => {
  assert.deepEqual(cellOutline(54, null), zoneOutline(54));
  const lats = (o) => o.map(([, lat]) => lat);
  const n = cellOutline(54, 'N');
  const s = cellOutline(54, 'S');
  assert.ok(lats(n).every((l) => l >= 0 && l <= NORTH_LIMIT) && Math.min(...lats(n)) === 0 && Math.max(...lats(n)) === NORTH_LIMIT, '54N: equator to 84°N');
  assert.ok(lats(s).every((l) => l <= 0 && l >= SOUTH_LIMIT) && Math.max(...lats(s)) === 0 && Math.min(...lats(s)) === SOUTH_LIMIT, '54S: 80°S to the equator');
  for (const o of [n, s]) assert.ok(o.every(([lon]) => lon === 138 || lon === 144), 'both halves keep the zone boundaries 138°E / 144°E');
  // an exception zone keeps its steps in the northern half only
  const n32 = cellOutline(32, 'N');
  assert.ok(n32.some(([lon, lat]) => lon === 3 && lat === 64) && !n32.some(([, lat]) => lat > 72), '32N steps west to 3°E and stops at 72°N');
  assert.ok(cellOutline(32, 'S').every(([lon]) => lon === 6 || lon === 12), '32S is a plain 6°–12°E strip');
});

test('neighbour buttons carry the point: same latitude, same offset ⇒ same E/N, different place', () => {
  const r0 = readUtm(OPENING);
  for (const target of [35, 37, 34, 38]) {
    const p = moveToZone(OPENING, target);
    const r = readUtm(p);
    assert.equal(r.zone, target);
    assert.equal(p.lat, OPENING.lat);
    close(p.lon, OPENING.lon + 6 * (target - 36), 1e-9, 'lon');
    close(r.e, r0.e, 1e-6, 'E repeats');
    close(r.n, r0.n, 1e-6, 'N repeats');
  }
  const j = readUtm(PRESETS[0]); // Jerusalem, east of zone 36's central meridian
  const jj = readUtm(moveToZone(PRESETS[0], 37));
  close(jj.e, j.e, 1e-6, 'off-centre E repeats too');
  assert.equal(readUtm(moveToZone({ lat: 10, lon: 178 }, 1)).zone, 1, 'wraps 60 → 1');
  assert.equal(readUtm(moveToZone({ lat: 10, lon: -178 }, 60)).zone, 60, 'wraps 1 → 60');
  // exceptions: the result always lands in the requested zone
  for (const start of [{ lat: 60, lon: 4 }, { lat: 78, lon: 15 }, { lat: 78, lon: 25 }]) {
    for (const target of [30, 31, 32, 33, 34, 35, 36, 37, 38]) {
      const p = moveToZone(start, target);
      assert.ok(inCoverage(p.lat));
      assert.equal(utmZoneOf(p), target, `from ${JSON.stringify(start)} to ${target}`);
    }
  }
});

test('hemisphere switch moves the point across the equator; N is computed, not relabelled', () => {
  const s = moveToHemisphere(OPENING, 'S');
  assert.deepEqual(s, { lat: -32, lon: 33 });
  const rn = readUtm(OPENING);
  const rs = readUtm(s);
  assert.equal(rs.hemisphere, 'S');
  close(rs.n, PROJ['start-south'].n, 0.001, 'S northing');
  close(rs.n, 10000000 - rn.n, 0.001, 'mirror symmetry of TM');
  assert.notEqual(rs.nText, rn.nText);
  assert.deepEqual(moveToHemisphere(s, 'N'), { lat: 32, lon: 33 });
  assert.equal(moveToHemisphere(OPENING, 'N'), OPENING);
  assert.deepEqual(moveToHemisphere({ lat: 0, lon: 10 }, 'S'), { lat: -1, lon: 10 });
  assert.deepEqual(moveToHemisphere({ lat: 83, lon: 100 }, 'S'), { lat: -80, lon: 100 }, 'kept in coverage');
  assert.equal(hemisphereOf(0), 'N');
});

test('offered points: in coverage, clear of zone boundaries and the equator, each one a meaningful change', () => {
  const all = [OPENING, ...PRESETS, ...TRANSFER];
  for (const p of all) {
    assert.ok(inCoverage(p.lat), p.id);
    const r = readUtm(p);
    const margin = Math.min(p.lon - r.range.w, r.range.e - p.lon);
    assert.ok(margin >= 0.25, `${p.id}: ${margin.toFixed(2)}° from a zone boundary`);
    assert.ok(Math.abs(p.lat) >= 1, `${p.id}: clear of the equator`);
  }
  const seq = [OPENING, ...PRESETS];
  for (let i = 1; i < seq.length; i++) {
    const a = readUtm(seq[i - 1]);
    const b = readUtm(seq[i]);
    assert.ok(a.zone !== b.zone || a.hemisphere !== b.hemisphere || Math.hypot(a.e - b.e, a.n - b.n) > 100000, `${seq[i].id} changes something`);
  }
  assert.equal(new Set(TRANSFER.map((p) => readUtm(p).zone)).size, TRANSFER.length, 'transfer zones differ');
  assert.ok(TRANSFER.some((p) => p.lat < 0) && TRANSFER.some((p) => p.lat > 0), 'both hemispheres practised');
  assert.equal(PRESETS.filter((p) => readUtm(p).exception).length, 1, 'one exception example');
  assert.equal(readUtm(PRESETS.find((p) => p.id === 'bergen')).zone, 32);
  assert.equal(regularZone(PRESETS.find((p) => p.id === 'bergen').lon), 31, 'Bergen would be 31 without the exception');
});

test('text: longitudes, latitudes and ranges', () => {
  assert.equal(fmtLon(30), '30°E');
  assert.equal(fmtLon(-6), '6°W');
  assert.equal(fmtLon(0), '0°');
  assert.equal(fmtLon(180), '180°');
  assert.equal(fmtLon(-180), '180°');
  assert.equal(fmtLon(139.69, 2), '139.69°E');
  assert.equal(fmtLon(-58.38, 1), '58.4°W');
  assert.equal(fmtLat(32), '32°N');
  assert.equal(fmtLat(-33.92, 2), '33.92°S');
  assert.equal(fmtLat(0), '0°');
  assert.equal(fmtLat(-1.29, 1), '1.3°S');
  assert.equal(fmtRange({ w: 0, e: 6 }), '0° – 6°E');
  assert.equal(fmtRange({ w: -6, e: 0 }), '6°W – 0°');
});

/* ── geometry (atlasGeometry.ts, explainerGeometry.ts) ─────────────────── */
import {
  FRAME_ASPECT, regionView, zoneWindow, fracX, fracY, lonAt, latAt, viewTop, viewBottom, wrapCopies, zoneGrid, gridStep, lonForE, latForN,
  readingLines, decodeRings, scaleBarKm,
} from '../../src/components/lessons/topic-02/utm-atlas/atlasGeometry.ts';
import { toUtm as toUtmRaw } from '../../src/components/lessons/topic-02/reference-systems/utm.ts';
import { CM, tmFrame, groundCircle, clipToFront, ortho } from '../../src/components/lessons/topic-02/utm-atlas/explainerGeometry.ts';
import { LAND_D, BORDERS_D, BASEMAP_UNIT } from '../../src/components/lessons/topic-02/utm-atlas/utmAtlasBasemap.data.ts';

test('windows: equirectangular with the standard parallel at the centre, never past a pole', () => {
  const v = zoneWindow({ w: 30, e: 36 }, 32, 'zones');
  assert.deepEqual([v.lon0, v.w], [33, 21]);
  close(v.h, (21 * Math.cos((32 * Math.PI) / 180)) / FRAME_ASPECT, 1e-9, 'h');
  close(fracX(v, 33), 0.5, 1e-12);
  close(fracY(v, 32), 0.5, 1e-12);
  close(lonAt(v, fracX(v, 30)), 30, 1e-9);
  close(latAt(v, fracY(v, 30)), 30, 1e-9);
  const g = zoneWindow({ w: 30, e: 36 }, 32, 'grid');
  assert.equal(g.w, 8);
  for (const lat of [84, 83.9, -80, 89]) {
    const p = regionView(10, lat, 21);
    assert.ok(viewTop(p) <= 90 + 1e-9 && viewBottom(p) >= -90 - 1e-9, `window at ${lat} stays on the globe`);
  }
  const w1 = zoneWindow({ w: -180, e: -174 }, 10, 'zones');
  assert.deepEqual(wrapCopies(w1).sort(), [-360, 0].sort(), 'zone 1 repeats the world west of 180°');
  close(fracX(w1, 179), (normLon(179 - w1.lon0) + w1.w / 2) / w1.w, 1e-12);
  assert.ok(fracX(w1, 179) > 0 && fracX(w1, 179) < 0.5, '179°E sits west of zone 1 in its window');
  assert.ok(scaleBarKm(v) > 0);
});

test('the grid is the real UTM grid of the zone: every vertex has the line’s E or N', () => {
  for (const [range, lat] of [[{ w: 30, e: 36 }, 32], [{ w: 36, e: 42 }, -1.3], [{ w: 3, e: 12 }, 60.4], [{ w: 9, e: 21 }, 78.2]]) {
    const v = zoneWindow(range, lat, 'grid');
    const zone = utmZoneOf({ lat, lon: (range.w + range.e) / 2 });
    const lines = zoneGrid(zone, v);
    assert.ok(lines.length >= 4, `zone ${zone}: ${lines.length} lines`);
    const step = gridStep(v);
    for (const g of lines) {
      assert.equal(g.value % step, 0);
      for (const run of g.runs)
        for (const [lon, la] of run) {
          const en = toUtmRaw({ lat: la, lon }, { zone, hemisphere: g.hemisphere });
          close(g.kind === 'e' ? en.e : en.n, g.value, 1e-3, `zone ${zone} ${g.kind}=${g.value}`);
          const r = zoneRangeAt(zone, la);
          assert.ok(r && normLon(lon) >= r.w - 1e-6 && normLon(lon) <= r.e + 1e-6, 'inside the zone');
        }
    }
    if (lat < 0 && viewTop(v) > 0) assert.ok(lines.some((l) => l.hemisphere === 'N') && lines.some((l) => l.hemisphere === 'S'), 'both grids across the equator');
  }
  // the central meridian is the line E = 500000
  const v = zoneWindow({ w: 30, e: 36 }, 32, 'grid');
  const cmLine = zoneGrid(36, v).find((l) => l.kind === 'e' && l.value === 500000);
  assert.ok(cmLine.runs.flat().every(([lon]) => Math.abs(lon - 33) < 1e-7), 'E = 500000 runs along 33°E');
});

test('reading lines: up the point’s E to the frame, west along its N to the zone boundary', () => {
  const r = readUtm(OPENING);
  const v = zoneWindow(r.range, r.lat, 'grid');
  const { up, across, westLon } = readingLines(r.zone, r.hemisphere, r.e, r.n, v);
  assert.equal(westLon, 30);
  close(up[0][0], 33, 1e-7);
  close(up[0][1], 32, 1e-7);
  close(up.at(-1)[1], viewTop(v), 1e-6, 'reaches the top edge');
  for (const [lon, lat] of up) close(toUtmRaw({ lat, lon }, { zone: 36, hemisphere: 'N' }).e, r.e, 1e-3, 'up: constant E');
  for (const [lon, lat] of across) close(toUtmRaw({ lat, lon }, { zone: 36, hemisphere: 'N' }).n, r.n, 1e-3, 'across: constant N');
  close(across.at(-1)[0], 30, 1e-6, 'reaches 30°E');
  close(toUtmRaw({ lat: 32, lon: lonForE(36, 'N', 400000, 32) }, { zone: 36, hemisphere: 'N' }).e, 400000, 1e-3, 'lonForE');
  close(toUtmRaw({ lat: latForN(36, 'N', 3500000, 31), lon: 31 }, { zone: 36, hemisphere: 'N' }).n, 3500000, 1e-3, 'latForN');
});

test('basemap decodes to the baked rings; explainer geometry is the real projection', () => {
  const rings = decodeRings(LAND_D, BASEMAP_UNIT);
  assert.equal(rings.length, (LAND_D.match(/M/g) || []).length);
  assert.ok(rings.every((r) => r.every(([lon, lat]) => lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90)), 'in range');
  const cyprus = rings.find((r) => r.some(([lon, lat]) => Math.abs(lon - 33.3) < 1 && Math.abs(lat - 35.1) < 0.6));
  assert.ok(cyprus, 'Cyprus is on the map');
  assert.ok(decodeRings(BORDERS_D, BASEMAP_UNIT).length > 100);
  const f = tmFrame(600, 340, 18);
  const [x1] = f.xy(-10, CM);
  const [x2] = f.xy(50, CM);
  close(x1, x2, 1e-6, 'the central meridian is straight in TM');
  const c = [-36, -18, 0, 18, 36].map((d) => groundCircle(f, 24, CM + d).scale);
  assert.ok(c[0] > c[1] && c[1] > c[2] && c[4] > c[3] && c[3] > c[2], 'scale grows away from the central meridian');
  close(c[0] / c[2], c[4] / c[2], 1e-6, 'symmetric');
  const B = Math.cos((24 * Math.PI) / 180) * Math.sin((36 * Math.PI) / 180);
  close(c[4] / c[2], 1 / Math.sqrt(1 - B * B), 0.01, 'k ≈ 1/√(1−B²) (spherical check)');
  assert.ok(ortho(22, CM)[2] > 0.99, 'the globe faces the central meridian');
  assert.equal(clipToFront([[CM + 170, 0], [CM + 175, 5], [CM + 178, -5]]), null, 'the far side is clipped away');
});
