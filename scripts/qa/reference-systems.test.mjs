// Unit tests for the topic-02 "מערכות ייחוס — אותה נקודה, שתי שפות" comparison
// (reference-systems/utm.ts, referenceSystems.data.ts, referenceSystemsGeometry.ts).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/reference-systems.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { toUtm, fromUtm, toDms, dmsToDecimal, formatDms, centralMeridian } from '../../src/components/lessons/topic-02/reference-systems/utm.ts';
import {
  EXTENT, VIEW, ZONE, POINTS, TERRAIN, UTM_STEP_M, GRATICULE_STEP_SEC, START_POINT, localX, localY, eastOf, northOf,
} from '../../src/components/lessons/topic-02/reference-systems/referenceSystems.data.ts';
import {
  READINGS, SEC_DECIMALS, utmGrid, graticule, graticuleLabel, fx, fy, topLabelFits, rightLabelFits,
} from '../../src/components/lessons/topic-02/reference-systems/referenceSystemsGeometry.ts';

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const M_PER_DEG_LAT = 110900; // ≈ at 31.8°N — only used to turn degree tolerances into metres

/* Reference values: PROJ via proj4 2.22.0, '+proj=utm +zone=36 +datum=WGS84' ⇄ EPSG:4326
   (computed 2026-10-11 in a scratch folder; proj4 is not a project dependency). */
const PROJ = {
  A: { e: 701125, n: 3521095, lat: 31.8077714837, lon: 35.1246737343 },
  B: { e: 700430, n: 3521480, lat: 31.8113649222, lon: 35.1174152967 },
  C: { e: 700570, n: 3520715, lat: 31.8044431525, lon: 35.1187359456 },
  SW: { e: 700000, n: 3520000, lat: 31.7980968115, lon: 35.1125714719 },
  NE: { e: 702000, n: 3522000, lat: 31.8157761894, lon: 35.1340994076 },
};
const PROJ_FORWARD = { lat: 31.8, lon: 35.125, e: 701172.7408, n: 3520233.955 };

test('UTM 36N on WGS84 matches PROJ, both directions (≤ 1 mm)', () => {
  for (const [k, p] of Object.entries(PROJ)) {
    const g = fromUtm({ e: p.e, n: p.n }, ZONE);
    close(g.lat, p.lat, 1e-8, `${k} lat`); // 1e-8° ≈ 1 mm
    close(g.lon, p.lon, 1e-8, `${k} lon`);
    const u = toUtm({ lat: p.lat, lon: p.lon }, ZONE);
    close(u.e, p.e, 0.001, `${k} E`);
    close(u.n, p.n, 0.001, `${k} N`);
  }
  const u = toUtm({ lat: PROJ_FORWARD.lat, lon: PROJ_FORWARD.lon }, ZONE);
  close(u.e, PROJ_FORWARD.e, 0.001, 'forward E');
  close(u.n, PROJ_FORWARD.n, 0.001, 'forward N');
});

test('round trip E/N → lat/lon → E/N returns the same point (≤ 1 µm)', () => {
  for (let e = EXTENT.eMin; e <= EXTENT.eMax; e += 250) {
    for (let n = EXTENT.nMin; n <= EXTENT.nMax; n += 250) {
      const back = toUtm(fromUtm({ e, n }, ZONE), ZONE);
      close(back.e, e, 1e-6, 'E');
      close(back.n, n, 1e-6, 'N');
    }
  }
});

test('the displayed φ/λ (0.01″) and the displayed E/N describe the same point (≤ 0.5 m)', () => {
  for (const p of POINTS) {
    const r = READINGS[p.id];
    const lat = dmsToDecimal(r.latDms);
    const lon = dmsToDecimal(r.lonDms);
    const u = toUtm({ lat, lon }, ZONE);
    assert.ok(Math.hypot(u.e - p.e, u.n - p.n) <= 0.5, `${p.id}: ${Math.hypot(u.e - p.e, u.n - p.n).toFixed(2)} m`);
    assert.equal(r.eText, String(p.e));
    assert.equal(r.nText, String(p.n));
    assert.equal(SEC_DECIMALS, 2);
  }
});

test('DMS: rounding carries 60″ → 1′ → 1°, and the text is the expected form', () => {
  assert.deepEqual(toDms(31.999999, 'lat', 1), { deg: 32, min: 0, sec: 0, hemi: 'N' });
  assert.deepEqual(toDms(-0.5, 'lon', 0), { deg: 0, min: 30, sec: 0, hemi: 'W' });
  assert.equal(formatDms(toDms(35 + 7 / 60 + 28.84 / 3600, 'lon', 1), 1), '35°07′28.8″E');
  assert.equal(formatDms(toDms(31 + 48 / 60 + 5.04 / 3600, 'lat', 1), 1), '31°48′05.0″N');
  assert.equal(formatDms(toDms(31 + 48 / 60 + 5.004 / 3600, 'lat', 2), 2), '31°48′05.00″N');
  assert.equal(READINGS.A.latText, '31°48′27.98″N');
  assert.equal(READINGS.A.lonText, '35°07′28.83″E');
});

test('the whole extent is inside zone 36, northern hemisphere', () => {
  assert.deepEqual(ZONE, { zone: 36, hemisphere: 'N' });
  assert.equal(centralMeridian(36), 33);
  for (const e of [EXTENT.eMin, EXTENT.eMax]) {
    for (const n of [EXTENT.nMin, EXTENT.nMax]) {
      const { lat, lon } = fromUtm({ e, n }, ZONE);
      assert.ok(lon > 30 && lon < 36, `lon ${lon}`);
      assert.ok(lat > 0, `lat ${lat}`);
    }
  }
});

test('points: integer E/N, inside the visible window, A on the bridge, B the summit, C the village', () => {
  for (const p of POINTS) {
    assert.ok(Number.isInteger(p.e) && Number.isInteger(p.n), `${p.id} integers`);
    const x = localX(p.e);
    const y = localY(p.n);
    assert.ok(fx(x) > 0.08 && fx(x) < 0.92 && fy(y) > 0.15 && fy(y) < 0.9, `${p.id} inside the view (${fx(x)}, ${fy(y)})`);
  }
  assert.equal(START_POINT, 'A');
  const A = { x: localX(POINTS[0].e), y: localY(POINTS[0].n) };
  const [b1, b2] = [TERRAIN.bridge.from, TERRAIN.bridge.to];
  close((b1[0] + b2[0]) / 2, A.x, 1, 'bridge centre x');
  close((b1[1] + b2[1]) / 2, A.y, 1, 'bridge centre y');
  assert.deepEqual(TERRAIN.ridge.summit, [localX(POINTS[1].e), localY(POINTS[1].n)]);
  assert.deepEqual(TERRAIN.village.center, [localX(POINTS[2].e), localY(POINTS[2].n)]);
});

test('axes: east grows to the right, north grows upward; local ⇄ UTM is exact', () => {
  assert.ok(localX(701000) > localX(700500));
  assert.ok(localY(3521500) < localY(3521000)); // larger N = higher on the map
  for (const v of [0, 123, 1999]) {
    assert.equal(localX(eastOf(v)), v);
    assert.equal(localY(northOf(v)), v);
  }
  assert.deepEqual([VIEW.w / VIEW.h], [5 / 4]);
});

test('UTM grid: straight lines every 500 m, strictly inside the view', () => {
  const { eastings, northings } = utmGrid();
  assert.deepEqual(eastings.map((l) => l.value), [700500, 701000, 701500]);
  assert.deepEqual(northings.map((l) => l.value), [3520500, 3521000, 3521500]);
  for (const l of eastings) assert.ok(l.value % UTM_STEP_M === 0 && fx(l.at) > 0 && fx(l.at) < 1);
  for (const l of northings) assert.ok(l.value % UTM_STEP_M === 0 && fy(l.at) > 0 && fy(l.at) < 1);
});

test('graticule: lines every 15″, drawn through toUtm, tilted by the real grid convergence', () => {
  const { meridians, parallels } = graticule();
  assert.ok(meridians.length >= 4 && parallels.length >= 3);
  for (const l of [...meridians, ...parallels]) assert.equal(l.sec % GRATICULE_STEP_SEC, 0);
  // every vertex is exactly on its line of longitude / latitude
  for (const m of meridians) for (const [x, y] of m.points) close(fromUtm({ e: eastOf(x), n: northOf(y) }, ZONE).lon * 3600, m.sec, 1e-6, 'meridian vertex');
  for (const p of parallels) for (const [x, y] of p.points) close(fromUtm({ e: eastOf(x), n: northOf(y) }, ZONE).lat * 3600, p.sec, 1e-6, 'parallel vertex');
  // convergence γ ≈ atan(tan Δλ · sin φ); a meridian leans toward the central meridian (west) going north
  const m = meridians[1];
  const [south, north] = [m.points[0], m.points.at(-1)];
  const lean = (Math.atan2(south[0] - north[0], south[1] - north[1]) * 180) / Math.PI;
  const { lat, lon } = fromUtm({ e: eastOf(south[0]), n: northOf(south[1]) }, ZONE);
  const gamma = (Math.atan(Math.tan(((lon - 33) * Math.PI) / 180) * Math.sin((lat * Math.PI) / 180)) * 180) / Math.PI;
  close(lean, gamma, 0.02, 'convergence (deg)');
  assert.ok(lean > 1 && lean < 1.25, `lean ${lean}`);
});

test('edge labels: whole seconds, no clash with the corner furniture', () => {
  assert.equal(graticuleLabel(126450, 'lon'), '35°07′30″');
  assert.equal(graticuleLabel(114510, 'lat'), '31°48′30″');
  const { meridians, parallels } = graticule();
  const { eastings, northings } = utmGrid();
  assert.ok(meridians.filter((l) => topLabelFits(l.edge)).length >= 3);
  assert.ok(parallels.filter((l) => rightLabelFits(l.edge)).length >= 2);
  assert.equal(eastings.filter((l) => topLabelFits(l.at)).length, 3);
  assert.equal(northings.filter((l) => rightLabelFits(l.at)).length, 3);
});

test('degree / metre sanity: 15″ of latitude ≈ 462 m here', () => {
  const p = (15 / 3600) * M_PER_DEG_LAT;
  const a = toUtm({ lat: 31.8, lon: 35.12 }, ZONE);
  const b = toUtm({ lat: 31.8 + 15 / 3600, lon: 35.12 }, ZONE);
  close(Math.hypot(b.e - a.e, b.n - a.n), p, 3);
});
