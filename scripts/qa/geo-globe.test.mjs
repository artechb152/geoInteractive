// Tests for the "גלובוס חוקר" model (topic-02 #scene-coordinates-2 — מערכת קואורדינטות גיאוגרפית):
// geodesy on WGS84, the coordinate state and its normalisation, the random practice
// tasks, the check by place and its feedback, occlusion, label placement, and the textures' geography.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/geo-globe.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import {
  A, B, E2, WGS84, LATLON_ITEMS, EXAMPLE, TARGET, geodeticToScene, surfaceNormal, sceneToGeodetic, geoToUv, ellipsoidMesh,
  normalizeLon, toSigned, fromSigned, samePlace, fmtLat, fmtLon, latCaption, lonCaption, LEVELS, makeTask, judge, missNote,
  missMessage, TASK_INTRO, RECENT, EXPLORE_START, initialGeoState, geoReducer, isStale, messageOf, globeViewOf,
  MAX_TRIES,
  facing, segmentHitsEllipsoid, pickLabel, VIEW_START, CAM_DIST, CAM_MIN, CAM_MAX, viewDir,
} from '../../src/components/lessons/topic-02/geo-globe/geoCoords.ts';
import * as geo from '../../src/components/lessons/topic-02/geo-globe/geoCoords.ts';

// the practice's check guard and the read task's words for a screen reader (audit א1 / ג1)
const { checkBlocked, RECHECK_HINT, gridPlace, globeDescription } = geo;

const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const run = (s, ...actions) => actions.reduce(geoReducer, s);
const D = Math.PI / 180;

/* ── geodesy ── */

test('the body is WGS84 at true flattening, semi-major axis 1', () => {
  close(B, 1 - 1 / 298.257223563, 1e-15);
  close(E2, 0.0066943799901413165, 1e-15);
  // ≈ 0.34 % — a pixel or two on the screen globe, never exaggerated
  close((A - B) / A, 0.003352810664747, 1e-12);
  close(WGS84.a * (1 - B), 21384.685754, 1e-3, 'polar flattening in metres');
});

test('scene axes: lon 0 at +x, north +y, east −z (right-handed, not mirrored)', () => {
  const p0 = geodeticToScene(0, 0);
  close(p0[0], 1, 1e-15);
  close(p0[1], 0, 1e-15);
  close(p0[2], 0, 1e-15);
  const pe = geodeticToScene(0, 90);
  close(pe[2], -1, 1e-15, 'lon 90E');
  const pn = geodeticToScene(90, 0);
  close(pn[1], B, 1e-15, 'north pole at the semi-minor axis');
  // seen from outside at (0,0), east lies to the right of north: (east × north) points at the viewer
  const n = surfaceNormal(0, 0);
  const east = [Math.sin(0) * -1, 0, -Math.cos(0)];
  const north = [0, 1, 0];
  const cross = [east[1] * north[2] - east[2] * north[1], east[2] * north[0] - east[0] * north[2], east[0] * north[1] - east[1] * north[0]];
  close(cross[0], n[0], 1e-15);
});

test('points are placed by geodetic latitude, not by the radius angle', () => {
  for (const lat of [-75, -45, -30, 15, 45, 60]) {
    const p = geodeticToScene(lat, 37);
    const geocentric = Math.atan2(p[1], Math.hypot(p[0], p[2])) / D;
    // the radius angle is smaller in magnitude (by up to ≈ 0.19° at 45°) …
    assert.ok(Math.abs(geocentric) < Math.abs(lat), `geocentric ${geocentric} vs ${lat}`);
    // … while the surface normal's elevation is the latitude itself
    const n = surfaceNormal(lat, 37);
    close(Math.asin(n[1]) / D, lat, 1e-12);
    // and the normal really is normal to the surface (⊥ to the meridian's tangent)
    const q1 = geodeticToScene(lat + 1e-4, 37);
    const q0 = geodeticToScene(lat - 1e-4, 37);
    const t = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]];
    const tl = Math.hypot(...t);
    close((n[0] * t[0] + n[1] * t[1] + n[2] * t[2]) / tl, 0, 1e-9, 'cos(n, tangent)');
  }
  const p45 = geodeticToScene(45, 0);
  close(45 - Math.atan2(p45[1], p45[0]) / D, 0.1924, 1e-3, 'geodetic − geocentric at 45°');
});

test('geodetic ↔ scene round trip (with height)', () => {
  for (const [lat, lon, h] of [[-30, 90, 0], [15, 75, 0], [0, 0, 0], [89.5, -120, 0.01], [-60, 179.9, 0.002]]) {
    const g = sceneToGeodetic(geodeticToScene(lat, lon, h));
    close(g.lat, lat, 1e-9, 'lat');
    close(normalizeLon(g.lon), normalizeLon(lon), 1e-9, 'lon');
    close(g.h, h, 1e-9, 'h');
  }
});

test('mesh: every vertex is the geodetic point its uv names, normals geodetic', () => {
  const m = ellipsoidMesh(18, 36);
  assert.equal(m.position.length, 19 * 37 * 3);
  for (let k = 0; k < m.uv.length / 2; k++) {
    const lon = m.uv[k * 2] * 360 - 180;
    const lat = m.uv[k * 2 + 1] * 180 - 90;
    const p = geodeticToScene(lat, lon);
    const n = surfaceNormal(lat, lon);
    for (let c = 0; c < 3; c++) {
      close(m.position[k * 3 + c], p[c], 1e-6);
      close(m.normal[k * 3 + c], n[c], 1e-6);
    }
  }
  // the shader's own read-back: lat = (v − 0.5)·180, lon = (u − 0.5)·360
  for (const [lat, lon] of [[-30, 90], [15, 75], [0, 0], [60, -150]]) {
    const [u, v] = geoToUv(lat, lon);
    close((v - 0.5) * 180, lat, 1e-12);
    close((u - 0.5) * 360, lon, 1e-12);
  }
  // triangles wind counter-clockwise seen from outside (front faces)
  const i0 = m.index.slice(0, 3);
  const P = (i) => [m.position[i * 3], m.position[i * 3 + 1], m.position[i * 3 + 2]];
  const [a, b, c] = [...i0].map(P);
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  assert.ok(nrm[0] * a[0] + nrm[1] * a[1] + nrm[2] * a[2] > 0, 'outward winding');
});

/* ── coordinates ── */

test('the deck points are kept, in its own notation', () => {
  assert.deepEqual(LATLON_ITEMS.map((x) => x.ref), ['(90E,30S)', '(75E,15N)']);
  assert.deepEqual([EXAMPLE.lat, EXAMPLE.lon, TARGET.lat, TARGET.lon], [-30, 90, 15, 75]);
});

test('magnitude + direction → signed, normalised', () => {
  assert.deepEqual(toSigned({ latMag: 30, latDir: 'S', lonMag: 90, lonDir: 'E' }), { lat: -30, lon: 90 });
  assert.deepEqual(toSigned({ latMag: 15, latDir: 'N', lonMag: 75, lonDir: 'W' }), { lat: 15, lon: -75 });
  // 0 has no direction (no −0), 180°W is 180°E
  const z = toSigned({ latMag: 0, latDir: 'S', lonMag: 0, lonDir: 'W' });
  assert.ok(Object.is(z.lat, 0) && Object.is(z.lon, 0));
  assert.equal(toSigned({ latMag: 10, latDir: 'N', lonMag: 180, lonDir: 'W' }).lon, 180);
  assert.equal(toSigned({ latMag: 10, latDir: 'N', lonMag: 180, lonDir: 'E' }).lon, 180);
  // out of range and fractions are clamped to whole degrees
  assert.deepEqual(toSigned({ latMag: 95.4, latDir: 'N', lonMag: 200, lonDir: 'E' }), { lat: 90, lon: 180 });
  assert.deepEqual(toSigned({ latMag: 14.6, latDir: 'N', lonMag: -3, lonDir: 'E' }), { lat: 15, lon: 0 });
  for (const [x, y] of [[180, 180], [-180, 180], [190, -170], [-190, 170], [540, 180], [0, 0], [-0, 0], [359, -1]]) assert.equal(normalizeLon(x), y, `normalizeLon(${x})`);
  assert.deepEqual(fromSigned({ lat: -30, lon: 90 }), { latMag: 30, latDir: 'S', lonMag: 90, lonDir: 'E' });
  assert.deepEqual(fromSigned({ lat: 0, lon: -180 }, { latDir: 'S', lonDir: 'W' }), { latMag: 0, latDir: 'S', lonMag: 180, lonDir: 'W' });
  assert.ok(samePlace({ lat: 90, lon: 10 }, { lat: 90, lon: -170 }), 'one pole, any longitude');
  assert.ok(samePlace({ lat: 5, lon: 180 }, { lat: 5, lon: -180 }));
  assert.ok(!samePlace({ lat: 5, lon: 179 }, { lat: 5, lon: -179 }));
});

test('formatting and captions claim no direction at 0° (or at 180° of longitude)', () => {
  assert.equal(fmtLat(-30), '30°S');
  assert.equal(fmtLat(15), '15°N');
  assert.equal(fmtLat(0), '0°');
  assert.equal(fmtLon(90), '90°E');
  assert.equal(fmtLon(-75), '75°W');
  assert.equal(fmtLon(0), '0°');
  assert.equal(fmtLon(180), '180°');
  assert.equal(fmtLon(-180), '180°');
  assert.equal(latCaption(-30), 'דרומה מקו המשווה');
  assert.equal(latCaption(15), 'צפונה מקו המשווה');
  assert.equal(latCaption(0), 'על קו המשווה');
  assert.match(latCaption(90), /בקוטב הצפוני/);
  assert.equal(lonCaption(90, -30), 'מזרחה מגריניץ׳');
  assert.equal(lonCaption(-75, 15), 'מערבה מגריניץ׳');
  assert.equal(lonCaption(0, 15), 'על קו האורך של גריניץ׳');
  assert.match(lonCaption(180, 10), /מזרח ומערב נפגשים/);
  assert.match(lonCaption(40, -90), /כל קווי האורך נפגשים/);
});

/* ── practice: random tasks ── */

test('tasks are random but seeded, on the level grid, never repeating the previous point', () => {
  const a = makeTask(0, 123, null);
  const b = makeTask(0, 123, null);
  assert.deepEqual(a, b, 'same seed, same task');
  const seen = new Set();
  for (let lvl = 0; lvl < LEVELS.length; lvl++) {
    const L = LEVELS[lvl];
    let prev = null;
    let seed = 7 + lvl;
    for (let i = 0; i < 300; i++) {
      const { task, seed: next } = makeTask(lvl, seed, prev);
      seed = next;
      assert.ok(task.lat % L.step === 0 && task.lon % L.step === 0, `on the grid: ${task.lat},${task.lon} @${lvl}`);
      assert.ok(Math.abs(task.lat) <= L.latMax);
      assert.ok(task.lon > -180 && task.lon <= 180);
      assert.ok(!(task.lat === 0 && task.lon === 0));
      if (lvl > 0) {
        const below = LEVELS[lvl - 1].step;
        assert.ok(task.lat % below !== 0 || task.lon % below !== 0, `new at level ${lvl}: ${task.lat},${task.lon}`);
      }
      if (prev) {
        assert.ok(!samePlace(task, prev), 'not the previous point');
        assert.ok(!(prev.kind === 'read' && task.kind === 'read'), 'never "read" twice running');
      }
      seen.add(`${lvl}:${task.lat},${task.lon}`);
      prev = task;
    }
  }
  assert.ok(seen.size > 60, `varied: ${seen.size} distinct points`);
});

test('the check is by place, within the level tolerance, the short way round', () => {
  const t = { lat: 15, lon: 75 };
  assert.deepEqual(judge({ lat: 15, lon: 75 }, t, 5), { hit: true });
  assert.deepEqual(judge({ lat: 18.6, lon: 71.2 }, t, 5), { hit: true });
  assert.equal(judge({ lat: 21, lon: 75 }, t, 5).hit, false);
  assert.deepEqual(judge({ lat: 10, lon: -179 }, { lat: 10, lon: 178 }, 5), { hit: true }, 'across 180°');
  assert.deepEqual(judge({ lat: 88, lon: 20 }, { lat: 90, lon: -100 }, 4), { hit: true }, 'a pole has any longitude');
  const n = judge({ lat: 30, lon: 75 }, t, 5);
  assert.equal(n.lat, 'north');
  assert.equal(n.lon, 'ok');
  assert.equal(n.flipLat, false);
  const w = judge({ lat: 15, lon: 60 }, t, 5);
  assert.equal(w.lon, 'west');
  assert.equal(judge({ lat: 15, lon: -170 }, { lat: 15, lon: 170 }, 5).lon, 'east', 'east across 180°');
});

test('find: a wrong side and a swap are told apart from plain distance (the coordinates are the question)', () => {
  const t = { lat: 15, lon: 75 };
  const s = judge({ lat: -15, lon: 75 }, t, 5);
  assert.equal(s.flipLat, true);
  assert.equal(missNote(s), 'בחצי הכדור הלא נכון');
  const m = missMessage(s, t, 'find');
  assert.match(m.body, /15°N הוא רוחב צפוני – מצפון לקו המשווה/);
  assert.match(m.body, /^האורך מתאים\./);
  const e = judge({ lat: 15, lon: -75 }, t, 5);
  assert.equal(e.flipLon, true);
  assert.match(missMessage(e, t, 'find').body, /75°E הוא אורך מזרחי – ממזרח לגריניץ׳/);
  const sw = judge({ lat: 75, lon: 15 }, t, 5);
  assert.equal(sw.swap, true);
  assert.equal(missMessage(sw, t, 'find').title, 'הרוחב והאורך התחלפו.');
  // no swap when the two values are alike
  assert.equal(judge({ lat: 30, lon: 30 }, { lat: 35, lon: 40 }, 4).swap, false);
  // plain distance: where the point lies, relative to the target's own lines (given in the question)
  const d = judge({ lat: 30, lon: 90 }, t, 5);
  assert.equal(missNote(d), 'צפונה ומזרחה מדי');
  assert.equal(missMessage(d, t, 'find').body, 'הנקודה שלכם מצפון לקו הרוחב 15°N וממזרח לקו האורך 75°E.');
  assert.equal(missMessage(judge({ lat: -10, lon: 5 }, { lat: 0, lon: 0 }, 5), { lat: 0, lon: 0 }, 'find').body, 'האורך מתאים. הנקודה שלכם מדרום לקו המשווה.');
  assert.equal(missMessage(judge({ lat: 0, lon: 20 }, { lat: 0, lon: 0 }, 5), { lat: 0, lon: 0 }, 'find').body, 'הרוחב מתאים. הנקודה שלכם ממזרח לגריניץ׳.');
});

/** A state on a given task (the generator's own choice replaced). */
const onTask = (task, extra = {}) => ({ ...run(initialGeoState(), { type: 'start', seed: 5 }), task: { choices: [], ...task }, ...extra });
/** 30°N 60°E with its choices: [the answer, south of the equator, west of Greenwich, swapped] */
const FIND = { kind: 'find', lat: 30, lon: 60, choices: [{ lat: 30, lon: 60 }, { lat: -30, lon: 60 }, { lat: 30, lon: -60 }, { lat: 60, lon: 30 }] };

/* ── read: the marked point is the question — a miss never names it (audit א1) ── */

/** Every read task the generator makes at a level (seeded), up to `count`. */
function readTasks(level, count, seed = 900 + level) {
  const out = [];
  let prev = null;
  for (let k = 0; out.length < count && k < 4000; k++) {
    const r = makeTask(level, seed, prev);
    seed = r.seed;
    // keep the kinds alternating as in a session, but collect only the read tasks
    prev = r.task;
    if (r.task.kind === 'read' && !out.some((t) => samePlace(t, r.task))) out.push(r.task);
  }
  return out;
}
/** The typical wrong answers to a marked point t: the start, each side flipped, the swap, a
    grid step off on each axis, and one axis right with the other off. */
function wrongAnswers(t, level) {
  const off = LEVELS[level].step;
  const lon = normalizeLon;
  return [
    { lat: 0, lon: 0 },
    { lat: -t.lat, lon: t.lon },
    { lat: t.lat, lon: -t.lon },
    { lat: -t.lat, lon: -t.lon },
    { lat: t.lon, lon: t.lat },
    { lat: t.lat + off, lon: t.lon },
    { lat: t.lat - off, lon: t.lon },
    { lat: t.lat, lon: lon(t.lon + off) },
    { lat: t.lat, lon: lon(t.lon - off) },
    { lat: t.lat + off, lon: lon(t.lon + 2 * off) },
    { lat: t.lat - 2 * off, lon: lon(t.lon - off) },
  ].filter((a) => Math.abs(a.lat) <= 90 && !judge(a, t, LEVELS[level].tol).hit);
}
const DIGIT = /\d/;

test('read: a miss never names the marked point — any level, any mistake, panel and globe', () => {
  let n = 0;
  for (let level = 0; level < LEVELS.length; level++) {
    for (const t of readTasks(level, 25)) {
      for (const at of wrongAnswers(t, level)) {
        let s = onTask({ kind: 'read', lat: t.lat, lon: t.lon }, { level });
        s = { ...s, answer: fromSigned(at) };
        s = run(s, { type: 'check' });
        assert.equal(s.misses, 1, `a miss: ${JSON.stringify(at)} for ${t.lat},${t.lon}`);
        const { message } = messageOf(s);
        const said = `${message.title} ${message.body}`;
        // no number at all: neither the point's values nor any line that would give them away
        assert.ok(!DIGIT.test(said), `level ${level}, ${t.lat},${t.lon}, answer ${JSON.stringify(at)}: "${said}"`);
        const v = globeViewOf(s);
        assert.ok(!DIGIT.test(v.note.text), `the globe's note: ${v.note.text}`);
        assert.deepEqual(v.sel, toSigned(s.answer), 'the lines drawn are the learner’s own');
        assert.deepEqual(v.target, { lat: t.lat, lon: t.lon }, 'the point stays marked');
        n++;
      }
    }
  }
  assert.ok(n > 600, `${n} misses checked`);
});

test('read: the miss says what to check — direction from the learner’s point, the equator / Greenwich, the side, a swap', () => {
  const said = (t, at, level = 0) => {
    const m = missMessage(judge(at, t, LEVELS[level].tol), t, 'read');
    return `${m.title} | ${m.body}`;
  };
  // the audit's case: 60°S 90°W, the answer left at 0°, 0°
  assert.equal(
    said({ lat: -60, lon: -90 }, { lat: 0, lon: 0 }),
    'עוד לא: צפונה ומזרחה מדי. | הנקודה שלכם מצפון וממזרח לנקודה המסומנת. ספרו את קווי הרוחב מקו המשווה ואת קווי האורך מגריניץ׳.',
  );
  // one value right: said, without the other
  assert.equal(said({ lat: 30, lon: 60 }, { lat: 30, lon: 90 }), 'עוד לא: מזרחה מדי. | הרוחב מתאים. הנקודה שלכם ממזרח לנקודה המסומנת. ספרו את קווי האורך מגריניץ׳.');
  assert.equal(said({ lat: 0, lon: 90 }, { lat: -20, lon: 90 }), 'עוד לא: דרומה מדי. | האורך מתאים. הנקודה שלכם מדרום לנקודה המסומנת. ספרו את קווי הרוחב מקו המשווה.');
  // the wrong side of the equator / of Greenwich: which line to look at, not where the point is
  assert.equal(
    said({ lat: -45, lon: -120 }, { lat: 45, lon: -120 }, 1),
    'עוד לא: בחצי הכדור הלא נכון. | האורך מתאים. הנקודה המסומנת בצד השני של קו המשווה: בדקו את כיוון הרוחב, צפון או דרום.',
  );
  assert.equal(
    said({ lat: 15, lon: 75 }, { lat: 15, lon: -75 }, 1),
    'עוד לא: בחצי הכדור הלא נכון. | הרוחב מתאים. הנקודה המסומנת בצד השני של גריניץ׳: בדקו את כיוון האורך, מזרח או מערב.',
  );
  // both sides at once
  assert.match(said({ lat: 30, lon: 60 }, { lat: -30, lon: -60 }), /בצד השני של קו המשווה.*בצד השני של גריניץ׳/);
  // a side flipped and the other value off
  assert.equal(
    said({ lat: 60, lon: 30 }, { lat: -60, lon: 90 }),
    'עוד לא: בחצי הכדור הלא נכון. | הנקודה המסומנת בצד השני של קו המשווה: בדקו את כיוון הרוחב, צפון או דרום. הנקודה שלכם ממזרח לנקודה המסומנת. ספרו את קווי האורך מגריניץ׳.',
  );
  // latitude and longitude swapped
  assert.equal(said({ lat: 15, lon: 75 }, { lat: 75, lon: 15 }, 1), 'הרוחב והאורך התחלפו. | הרוחב נמדד מקו המשווה צפונה או דרומה, והאורך מגריניץ׳ מזרחה או מערבה.');
  // across 180°: the short way round, from the learner's point
  assert.equal(said({ lat: 0, lon: 180 }, { lat: 0, lon: -170 }), 'עוד לא: מזרחה מדי. | הרוחב מתאים. הנקודה שלכם ממזרח לנקודה המסומנת. ספרו את קווי האורך מגריניץ׳.');
  assert.equal(said({ lat: 0, lon: 180 }, { lat: 0, lon: 170 }), 'עוד לא: מערבה מדי. | הרוחב מתאים. הנקודה שלכם ממערב לנקודה המסומנת. ספרו את קווי האורך מגריניץ׳.');
  // a point on the equator / on Greenwich is not given away as "0°"
  assert.ok(!DIGIT.test(said({ lat: 0, lon: 120 }, { lat: 30, lon: 120 })));
  assert.ok(!DIGIT.test(said({ lat: 45, lon: 0 }, { lat: 45, lon: 30 })));
});

test('read: once over, the full reading is said (a hit, or the answer shown)', () => {
  let s = onTask({ kind: 'read', lat: -60, lon: -90 });
  s = { ...s, answer: fromSigned({ lat: -60, lon: -90 }) };
  s = run(s, { type: 'check' });
  assert.equal(s.outcome, 'hit');
  assert.equal(messageOf(s).message.body, 'רוחב 60°S ואורך 90°W.');
  let r = onTask({ kind: 'read', lat: -60, lon: -90 });
  for (const at of [{ lat: 0, lon: 0 }, { lat: 30, lon: 0 }, { lat: 60, lon: 0 }]) r = run({ ...r, answer: fromSigned(at) }, { type: 'check' });
  assert.equal(r.outcome, 'reveal');
  assert.match(messageOf(r).message.body, /רוחב 60°S ואורך 90°W/);
});

test('read: the screen reader is told where the point is on the grid — never its values', () => {
  assert.equal(gridPlace({ lat: -60, lon: -90 }), 'ברוחב: על קו הרוחב השני מדרום לקו המשווה. באורך: על קו האורך השלישי ממערב לגריניץ׳.');
  assert.equal(gridPlace({ lat: -45, lon: -120 }), 'ברוחב: בין קו הרוחב הראשון לשני מדרום לקו המשווה, באמצע הדרך ביניהם. באורך: על קו האורך הרביעי ממערב לגריניץ׳.');
  assert.equal(
    gridPlace({ lat: 10, lon: 5 }),
    'ברוחב: בין קו המשווה לקו הרוחב הראשון מצפון לו, שליש מהדרך מקו המשווה. באורך: בין גריניץ׳ לקו האורך הראשון ממזרח לו, שישית מהדרך מגריניץ׳.',
  );
  assert.equal(
    gridPlace({ lat: 70, lon: -175 }),
    'ברוחב: בין קו הרוחב השני מצפון לקו המשווה לקוטב הצפוני, שליש מהדרך מהקו השני. באורך: בין קו האורך החמישי ממערב לגריניץ׳ לקו האורך שמול גריניץ׳, חמש שישיות מהדרך מהקו החמישי.',
  );
  assert.equal(gridPlace({ lat: 0, lon: 180 }), 'ברוחב: על קו המשווה. באורך: על קו האורך שמול גריניץ׳.');
  assert.equal(gridPlace({ lat: -20, lon: 0 }), 'ברוחב: בין קו המשווה לקו הרוחב הראשון מדרום לו, שני שלישים מהדרך מקו המשווה. באורך: על גריניץ׳.');
  // every point a task can ask (all three levels) is told apart, with no number in it
  const seen = new Map();
  for (let lat = -70; lat <= 70; lat += 5)
    for (let lon = -175; lon <= 180; lon += 5) {
      const d = gridPlace({ lat, lon });
      assert.ok(!DIGIT.test(d) && !d.includes('°'), d);
      assert.ok(!seen.has(d), `${lat},${lon} and ${seen.get(d)} read the same: ${d}`);
      seen.set(d, `${lat},${lon}`);
    }
  // in the read task's globe description and nowhere else; the find task's question keeps its values
  const r = onTask({ kind: 'read', lat: -45, lon: -120 }, { level: 1 });
  assert.ok(globeDescription(r).includes(gridPlace({ lat: -45, lon: -120 })));
  assert.ok(!globeDescription(r).includes('45°') && !globeDescription(r).includes('120°'));
  const f = onTask(FIND);
  assert.match(globeDescription(f), /ברוחב 30°N ובאורך 60°E/);
  assert.ok(!globeDescription(f).includes('ברוחב: '));
  assert.match(globeDescription(initialGeoState()), /מסומנים קו הרוחב 0° וקו האורך 0°/);
});

/* ── state ── */

// The opening is 0°, 0° — the equator meets Greenwich (user request, 2026-10-12: "שנקודת ההתחלה תהיה 0,0").
test('the explorer opens on 0°, 0° and "איפוס" brings it back there', () => {
  const s0 = initialGeoState();
  assert.equal(s0.stage, 'explore');
  assert.deepEqual(globeViewOf(s0).sel, { lat: 0, lon: 0 });
  assert.equal(messageOf(s0), null, 'no message strip in the explorer');
  assert.deepEqual(EXPLORE_START, { latMag: 0, latDir: 'N', lonMag: 0, lonDir: 'E' });
  const s1 = run(s0, { type: 'latMag', v: 40 }, { type: 'latDir', dir: 'S' }, { type: 'lonStep', d: 1 }, { type: 'lonDir', dir: 'W' });
  assert.deepEqual(toSigned(s1.explore), { lat: -40, lon: -1 });
  const z = run(s1, { type: 'resetExplore' });
  assert.deepEqual(toSigned(z.explore), toSigned(EXPLORE_START));
  assert.deepEqual(globeViewOf(z).sel, globeViewOf(s0).sel, 'back on the opening point');
  assert.deepEqual([z.explore.latDir, z.explore.lonDir], ['S', 'W'], 'the directions are kept; at 0° they claim nothing');
  assert.equal(z.stage, 'explore');
  const top = run(s0, { type: 'latMag', v: 90 }, { type: 'latStep', d: 1 }, { type: 'lonMag', v: 0 }, { type: 'lonStep', d: -1 });
  assert.deepEqual([top.explore.latMag, top.explore.lonMag], [90, 0]);
  // checks, marks and "next" do nothing in the explorer
  assert.equal(run(s0, { type: 'check' }, { type: 'pin', at: { lat: 1, lon: 1 } }, { type: 'next' }), s0);
});

test('no point comes back within the last few tasks', () => {
  let s = run(initialGeoState(), { type: 'start', seed: 11 });
  const seen = [s.task];
  for (let k = 0; k < 40; k++) {
    s = run({ ...s, outcome: 'reveal' }, { type: 'next' });
    for (const p of seen.slice(-RECENT)) assert.ok(!samePlace(p, s.task), `${s.task.lat},${s.task.lon} came back within ${RECENT}`);
    seen.push(s.task);
  }
});

test('find: four lettered choices — the answer and the typical mistakes, all distinct', () => {
  for (let lvl = 0; lvl < LEVELS.length; lvl++) {
    let seed = 40 + lvl;
    let prev = null;
    for (let k = 0; k < 200; k++) {
      const { task, seed: next } = makeTask(lvl, seed, prev);
      seed = next;
      prev = task;
      if (task.kind === 'read') {
        assert.deepEqual(task.choices, []);
        continue;
      }
      const cs = task.choices;
      assert.equal(cs.length, 4, `${task.lat},${task.lon}`);
      assert.equal(cs.filter((c) => samePlace(c, task)).length, 1, 'the answer once');
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(!samePlace(cs[i], cs[j]), 'distinct');
      for (const c of cs) assert.ok(Math.abs(c.lat) <= 80 && c.lon > -180 && c.lon <= 180);
      // at least one distractor is a typical mistake (a flip or the swap) whenever one exists
      const t = { lat: task.lat, lon: task.lon };
      const typical = cs.filter((c) => !samePlace(c, t)).filter((c) => {
        const j = judge(c, t, 0.5);
        return !j.hit && (j.flipLat || j.flipLon || j.swap || (Math.sign(c.lat) === -Math.sign(t.lat) && Math.sign(c.lon) === -Math.sign(t.lon)));
      });
      if (t.lat !== 0 || (t.lon !== 0 && t.lon !== 180)) assert.ok(typical.length >= 1, `typical mistake among ${JSON.stringify(cs)}`);
    }
  }
  // the answer's position is shuffled
  const at = new Set();
  let seed = 3;
  for (let k = 0; k < 60; k++) {
    const r = makeTask(0, seed, null);
    seed = r.seed;
    if (r.task.kind === 'find') at.add(r.task.choices.findIndex((c) => samePlace(c, r.task)));
  }
  assert.ok(at.size >= 3, `answer seen at ${[...at]}`);
});

test('find: the target is never drawn before the task is over; a miss is said at the choice', () => {
  let s = onTask(FIND);
  assert.equal(s.stage, 'task');
  assert.deepEqual(messageOf(s).message, TASK_INTRO.find);
  let v = globeViewOf(s);
  assert.equal(v.sel, null);
  assert.equal(v.choices.length, 4);
  assert.equal(v.answer, null, 'the answer is not marked');
  // nothing chosen: nothing to check; the coordinate controls do not touch a find task
  assert.equal(run(s, { type: 'check' }), s);
  assert.equal(run(s, { type: 'latMag', v: 30 }), s);
  assert.equal(run(s, { type: 'pick', i: 9 }), s, 'no such choice');
  s = run(s, { type: 'pick', i: 1 }, { type: 'check' });
  assert.equal(s.misses, 1);
  assert.deepEqual(s.ruled, [1]);
  v = globeViewOf(s);
  assert.equal(v.sel, null, 'still no target lines after a miss');
  assert.deepEqual(v.note, { at: { lat: -30, lon: 60 }, text: 'בחצי הכדור הלא נכון' });
  assert.match(messageOf(s).message.body, /30°N הוא רוחב צפוני/);
  // a ruled-out choice cannot be picked again
  assert.equal(run(s, { type: 'pick', i: 1 }), s);
  // another choice: the note goes, the panel marks its message as the previous check
  s = run(s, { type: 'pick', i: 0 });
  assert.equal(isStale(s), true);
  assert.equal(globeViewOf(s).note, null);
  s = run(s, { type: 'check' });
  assert.equal(s.outcome, 'hit');
  v = globeViewOf(s);
  assert.deepEqual(v.sel, { lat: 30, lon: 60 }, 'the answer drawn once found');
  assert.equal(v.answer, 0);
  assert.equal(v.win, true);
  assert.equal(run(s, { type: 'pick', i: 2 }), s, 'a finished task takes no more picks');
});

test('find: the swap is named', () => {
  const s = run(onTask(FIND), { type: 'pick', i: 3 }, { type: 'check' });
  assert.equal(globeViewOf(s).note.text, 'הרוחב והאורך התחלפו');
});

test('read: the point is marked, the learner sets its coordinates, lines show once checked', () => {
  let s = onTask({ kind: 'read', lat: -45, lon: -120 }, { level: 1 });
  let v = globeViewOf(s);
  assert.deepEqual(v.target, { lat: -45, lon: -120 });
  assert.equal(v.sel, null);
  assert.deepEqual(v.choices, []);
  s = run(s, { type: 'latMag', v: 45 }, { type: 'lonMag', v: 120 }, { type: 'lonDir', dir: 'W' });
  assert.deepEqual(toSigned(s.answer), { lat: 45, lon: -120 });
  assert.deepEqual(s.explore, EXPLORE_START, 'the explorer untouched');
  s = run(s, { type: 'check' });
  assert.equal(s.last.j.flipLat, true);
  v = globeViewOf(s);
  assert.deepEqual(v.sel, { lat: 45, lon: -120 }, 'the learner’s own lines');
  assert.equal(v.note.text, 'בחצי הכדור הלא נכון');
  s = run(s, { type: 'latDir', dir: 'S' }, { type: 'check' });
  assert.equal(s.outcome, 'hit');
  assert.equal(globeViewOf(s).target, null);
  assert.deepEqual(globeViewOf(s).sel, { lat: -45, lon: -120 });
});

test('tries run out (two picks, three readings); the level adapts both ways', () => {
  let s = onTask(FIND, { level: 1 });
  s = run(s, { type: 'pick', i: 1 }, { type: 'check' }, { type: 'pick', i: 2 }, { type: 'check' });
  assert.equal(s.outcome, 'reveal');
  assert.equal(s.level, 0, 'one level back');
  assert.deepEqual(globeViewOf(s).sel, { lat: 30, lon: 60 });
  assert.equal(globeViewOf(s).answer, 0);
  assert.equal(messageOf(s).message.tone, 'reveal');
  // three readings, each a different answer (the same one again is no new try)
  let r = onTask({ kind: 'read', lat: 30, lon: 60 });
  r = run(r, { type: 'check' }, { type: 'latStep', d: 1 }, { type: 'check' });
  assert.equal(r.outcome, null);
  assert.equal(r.misses, 2);
  r = run(r, { type: 'lonStep', d: 1 }, { type: 'check' });
  assert.equal(r.outcome, 'reveal');
  // two first-try hits in a row → up a level
  let u = run(onTask(FIND), { type: 'pick', i: 0 }, { type: 'check' });
  assert.equal(u.level, 0);
  assert.equal(u.streak, 1);
  u = run(u, { type: 'next' });
  assert.equal(u.outcome, null);
  assert.equal(u.pick, null);
  assert.deepEqual(u.ruled, []);
  u = { ...u, task: FIND };
  u = run(u, { type: 'pick', i: 0 }, { type: 'check' });
  assert.equal(u.level, 1);
  assert.equal(u.leveled, true);
  assert.match(messageOf(u).message.body, /עוברים לרמה הבאה: בין קווי הרשת/);
  // a hit after a miss keeps the level and restarts the streak
  let w = onTask(FIND, { streak: 1 });
  w = run(w, { type: 'pick', i: 3 }, { type: 'check' }, { type: 'pick', i: 0 }, { type: 'check' });
  assert.equal(w.outcome, 'hit');
  assert.equal(w.streak, 0);
  assert.equal(w.level, 0);
});

/* ── "בדיקה" again on the same answer is not a new try (audit ג1) ── */

test('read: the same answer checked again takes no try and changes nothing', () => {
  let s = onTask({ kind: 'read', lat: -60, lon: -90 });
  s = run(s, { type: 'check' });
  assert.equal(s.misses, 1);
  // by click or by key, once or many times: the very same state
  assert.equal(run(s, { type: 'check' }).misses, 1, 'a repeated check took a try');
  assert.equal(run(s, { type: 'check' }, { type: 'check' }).outcome, null, 'repeated checks ended the task');
  assert.equal(run(s, { type: 'check' }), s);
  assert.equal(run(s, { type: 'check' }, { type: 'check' }, { type: 'check' }), s);
  assert.equal(checkBlocked(onTask({ kind: 'read', lat: -60, lon: -90 })), null, 'a fresh task can be checked (0°, 0° is an answer)');
  assert.equal(checkBlocked(s), 'same');
  // no change of value at 0° (or at 180° of longitude): a direction there claims nothing
  assert.equal(checkBlocked(run(s, { type: 'latDir', dir: 'S' })), 'same');
  assert.equal(run(s, { type: 'latDir', dir: 'S' }, { type: 'lonDir', dir: 'W' }, { type: 'check' }).misses, 1);
  let e = run(onTask({ kind: 'read', lat: 30, lon: 90 }), { type: 'lonMag', v: 180 }, { type: 'check' });
  assert.equal(e.misses, 1);
  e = run(e, { type: 'lonDir', dir: 'W' });
  assert.equal(checkBlocked(e), 'same', '180°E and 180°W are one meridian');
  assert.equal(run(e, { type: 'check' }).misses, 1);
  // a real change: checkable again, the old result marked as the previous check (not about this answer)
  s = run(s, { type: 'lonStep', d: 1 });
  assert.equal(checkBlocked(s), null);
  assert.equal(isStale(s), true);
  assert.equal(messageOf(s).stale, true);
  assert.equal(globeViewOf(s).note, null, 'the note leaves the old point');
  assert.equal(globeViewOf(s).sel, null, 'the old lines go too');
  // back to the answer already checked: closed again, and its own result is current again
  const back = run(s, { type: 'lonStep', d: -1 });
  assert.equal(checkBlocked(back), 'same');
  assert.equal(messageOf(back).stale, false);
  assert.equal(run(back, { type: 'check' }), back);
  s = run(s, { type: 'check' });
  assert.equal(s.misses, 2);
  assert.equal(isStale(s), false);
  // an answer checked before the last one is no new try either
  const earlier = run(s, { type: 'lonStep', d: -1 });
  assert.equal(checkBlocked(earlier), 'same');
  assert.equal(run(earlier, { type: 'check' }).misses, 2);
  // the tries still run out — on three different answers
  s = run(s, { type: 'latMag', v: 30 }, { type: 'check' });
  assert.equal(s.misses, 3);
  assert.equal(s.outcome, 'reveal');
  assert.equal(checkBlocked(s), null, 'nothing to block once the task is over');
});

test('find: the same letter checked again takes no try and does not show the answer', () => {
  let s = run(onTask(FIND), { type: 'pick', i: 1 }, { type: 'check' });
  assert.equal(s.misses, 1);
  assert.deepEqual(s.ruled, [1]);
  const again = run(s, { type: 'check' }, { type: 'check' });
  assert.equal(again.outcome, null, 'a repeated check of the ruled-out letter showed the answer');
  assert.equal(again, s, 'no new try, no reveal');
  assert.equal(globeViewOf(again).answer, null, 'the answer stays unmarked');
  assert.equal(checkBlocked(s), 'same');
  // another letter: checkable again; the old result is the previous check
  s = run(s, { type: 'pick', i: 2 });
  assert.equal(checkBlocked(s), null);
  assert.equal(messageOf(s).stale, true);
  s = run(s, { type: 'check' });
  assert.equal(s.misses, 2);
  assert.equal(s.outcome, 'reveal', 'two different wrong letters still end the task');
  assert.deepEqual(s.ruled, [1, 2]);
  // nothing chosen yet: nothing to check
  assert.equal(checkBlocked(onTask(FIND)), 'pick');
  assert.equal(MAX_TRIES.find, 2);
});

test('the reason "בדיקה" is closed is said in words', () => {
  assert.equal(RECHECK_HINT.read, 'כדי לבדוק שוב, שנו את הרוחב או את האורך.');
  assert.equal(RECHECK_HINT.find, 'כדי לבדוק שוב, בחרו אות אחרת.');
});

test('a choice or a setting not yet checked is never a success', () => {
  // the right letter, picked but not checked
  let f = run(onTask(FIND), { type: 'pick', i: 0 });
  assert.equal(f.outcome, null);
  assert.equal(globeViewOf(f).win, false);
  assert.equal(globeViewOf(f).answer, null);
  assert.equal(messageOf(f).message.tone, 'info');
  // after a miss, the right letter picked: the old miss, marked as the previous check — no success yet
  f = run(onTask(FIND), { type: 'pick', i: 3 }, { type: 'check' }, { type: 'pick', i: 0 });
  assert.deepEqual([messageOf(f).message.tone, messageOf(f).stale, globeViewOf(f).win], ['retry', true, false]);
  // the right reading, set but not checked
  let r = { ...onTask({ kind: 'read', lat: -60, lon: -90 }), answer: fromSigned({ lat: -60, lon: -90 }) };
  assert.equal(r.outcome, null);
  assert.equal(messageOf(r).message.tone, 'info');
  assert.equal(globeViewOf(r).win, false);
  r = run({ ...onTask({ kind: 'read', lat: -60, lon: -90 }) }, { type: 'check' }, { type: 'latMag', v: 60 }, { type: 'latDir', dir: 'S' }, { type: 'lonMag', v: 90 }, { type: 'lonDir', dir: 'W' });
  assert.deepEqual([messageOf(r).message.tone, messageOf(r).stale, globeViewOf(r).win, r.outcome], ['retry', true, false, null]);
});

test('a new task, or coming back to an unfinished one, keeps the checked answers right', () => {
  let s = run(onTask({ kind: 'read', lat: -60, lon: -90 }), { type: 'check' });
  // away to the explorer and back: the same task, the same answer still checked
  s = run(s, { type: 'explore' }, { type: 'resetExplore' }, { type: 'start', seed: 77 });
  assert.equal(s.misses, 1);
  assert.equal(run(s, { type: 'check' }), s, 'still the answer already checked');
  assert.equal(checkBlocked(s), 'same');
  // over, then the next task: nothing checked yet
  s = run(s, { type: 'latMag', v: 60 }, { type: 'latDir', dir: 'S' }, { type: 'lonMag', v: 90 }, { type: 'lonDir', dir: 'W' }, { type: 'check' });
  assert.equal(s.outcome, 'hit');
  s = run(s, { type: 'next' });
  assert.equal(s.outcome, null);
  assert.equal(s.misses, 0);
  assert.equal(s.last, null);
  assert.deepEqual(s.tried, []);
  assert.equal(checkBlocked(s), s.task.kind === 'find' ? 'pick' : null);
});

test('leaving for the explorer and coming back resumes an unfinished task', () => {
  let s = onTask(FIND);
  s = run(s, { type: 'pick', i: 2 }, { type: 'explore' });
  assert.equal(s.stage, 'explore');
  assert.deepEqual(globeViewOf(s).sel, toSigned(EXPLORE_START), 'the explorer’s own point, not the task’s');
  assert.deepEqual(globeViewOf(s).choices, []);
  s = run(s, { type: 'start', seed: 99 });
  assert.deepEqual(s.task, FIND);
  assert.equal(s.pick, 2);
});

test('facing / occlusion are geometric, not tuned to one camera angle', () => {
  const at = (lat, lon, d = CAM_DIST) => viewDir(lat, lon).map((c) => c * d);
  const GRID = [];
  for (let la = -60; la <= 60; la += 30) for (let lo = -150; lo <= 180; lo += 30) GRID.push([la, lo]);

  // 1. The opening camera: centred on 0°, 0°, north up, not mirrored
  const cam = at(VIEW_START.lat, VIEW_START.lon);
  assert.deepEqual(VIEW_START, { lat: 0, lon: 0 }, 'the camera opens on the point the explorer opens on');
  assert.ok(facing(0, 0, cam) > 0.99, 'the equator meets Greenwich at the centre of the opening view');
  for (const [la, lo] of GRID) if (la || lo) assert.ok(facing(la, lo, cam) < facing(0, 0, cam), `${la},${lo} is off-centre`);
  const [n, s, e, w] = [[30, 0], [-30, 0], [0, 30], [0, -30]].map(([la, lo]) => facing(la, lo, cam));
  for (const f of [n, s, e, w]) assert.ok(f > 0.6, 'the neighbouring 30° lines face the opening camera');
  assert.ok(Math.abs(n - s) < 1e-9 && Math.abs(e - w) < 1e-9, 'N = S and E = W of the centre — no tilt, no turn');
  assert.ok(Math.abs(n - e) < 0.01, 'N vs E differ only by the flattening');
  // Greenwich's label needs facing > 0.08 (Globe3D): it has it along the visible meridian
  for (const la of [-60, -30, 30, 60]) assert.ok(facing(la, 0, cam) > 0.08, `Greenwich at ${la}° is on the visible side`);
  assert.ok(facing(-30, 90, cam) < 0, 'the deck’s example (30°S 90°E) is past the limb at the opening');
  assert.ok(facing(0, 180, cam) < -0.99, 'the antimeridian faces straight away');
  // the pole's label above the north pole: seen at the opening, hidden when the camera looks from below the south
  const tip = [0, B + 0.09, 0];
  assert.equal(segmentHitsEllipsoid(cam, tip), false);
  assert.equal(segmentHitsEllipsoid([0, -5, 0.2], tip), true);
  // a surface point seen from the far side is occluded by the body itself
  const p0 = geodeticToScene(0, 0, 0.001);
  assert.equal(segmentHitsEllipsoid(cam, p0), false);
  assert.equal(segmentHitsEllipsoid(cam.map((c) => -c), p0), true);

  // 2. A camera turned to the Indian Ocean (as a task on 30°S 90°E turns it): the same thresholds hold there
  const io = at(-3, 72);
  assert.ok(facing(-30, 90, io) > 0.4, 'the example point faces it');
  assert.ok(facing(15, 75, io) > 0.6, 'the target faces it too');
  assert.ok(facing(0, 0, io) > 0.08, 'Greenwich on the equator is on the visible side');
  assert.ok(facing(15, 75, io) > facing(0, 0, io), 'that view is centred on the Indian Ocean, not on Greenwich');
  assert.ok(facing(-30, -90, io) < 0, 'the far side faces away');
  const p = geodeticToScene(-30, 90, 0.001);
  assert.equal(segmentHitsEllipsoid(io, p), false);
  assert.equal(segmentHitsEllipsoid(io.map((c) => -c), p), true);

  // 3. From any direction and zoom, the facing sign IS the ray test against the body (convex surface)
  let compared = 0;
  for (const d of [CAM_MIN, CAM_DIST, CAM_MAX]) {
    for (let cl = -80; cl <= 80; cl += 20) {
      for (let co = -180; co < 180; co += 45) {
        const c = at(cl, co, d);
        for (const [la, lo] of GRID) {
          const f = facing(la, lo, c);
          if (Math.abs(f) < 0.02) continue; // grazing the limb: either answer is a pixel
          // 1e-5 above the surface: its horizon dips √(2h) ≈ 0.0045 past the tangent plane, inside the band skipped above
          assert.equal(segmentHitsEllipsoid(c, geodeticToScene(la, lo, 1e-5)), f < 0, `cam ${cl},${co}@${d} → ${la},${lo} (facing ${f.toFixed(3)})`);
          compared++;
        }
      }
    }
  }
  assert.ok(compared > 5000, `compared ${compared} camera / point pairs`);
  assert.ok(CAM_MIN > 1.5 && CAM_MIN < CAM_DIST && CAM_MAX > CAM_DIST, 'limited zoom, never inside the body');
});

/* ── label placement ── */

test('labels: cheapest clear candidate inside the stage, else hidden', () => {
  const stage = { w: 600, h: 600, pad: 6 };
  const size = { w: 80, h: 26 };
  const cands = [
    { x: 300, y: 300, facing: 0.9, cost: 0 }, // under the marker
    { x: 380, y: 300, facing: 0.9, cost: 1 },
    { x: 590, y: 300, facing: 0.9, cost: 0.5 }, // off the stage
    { x: 200, y: 300, facing: 0.1, cost: 0.2 }, // too close to the limb
  ];
  const marker = { x: 300, y: 300, w: 22, h: 22 };
  assert.deepEqual(pickLabel(cands, size, [marker], stage, 0.3), { x: 380, y: 300, w: 80, h: 26 });
  assert.equal(pickLabel(cands, size, [marker, { x: 380, y: 300, w: 80, h: 26 }], stage, 0.3), null);
});

/* ── the textures' geography (the built files, read back) ── */

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));
const DIR = 'public/assets/lessons/topic02/geo-globe';
async function sampler(file) {
  const { data, info } = await sharp(`${DIR}/${file}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return (lat, lon) => {
    const [u, v] = geoToUv(lat, lon);
    const x = Math.min(info.width - 1, Math.floor(u * info.width));
    const y = Math.min(info.height - 1, Math.floor((1 - v) * info.height));
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
}

test('30°S 90°E is open southern Indian Ocean; 15°N 75°E is land in southern India', async () => {
  const relief = await sampler('earth-relief.png');
  const color = await sampler('earth-color.webp');
  const water = (lat, lon) => relief(lat, lon)[2] / 255;
  assert.ok(water(-30, 90) > 0.95, 'example point is water');
  for (const [la, lo] of [[-28, 88], [-32, 92], [-30, 85], [-30, 95]]) assert.ok(water(la, lo) > 0.95, `open ocean around the example ${la},${lo}`);
  assert.ok(water(15, 75) < 0.05, 'target is land');
  for (const [la, lo] of [[14, 76], [16, 76], [13, 77.5]]) assert.ok(water(la, lo) < 0.05, `peninsular India ${la},${lo}`);
  const [r, g, b] = color(-30, 90);
  assert.ok(b > r && b > 0.8 * g, `ocean colour at the example: ${r},${g},${b}`);
  const [lr, lg, lb] = color(15, 75);
  assert.ok(lr > lb && lg > lb, `land colour at the target: ${lr},${lg},${lb}`);
});

test('texture orientation: north up, east to the right, Greenwich at u = 0.5', async () => {
  const relief = await sampler('earth-relief.png');
  const water = (lat, lon) => relief(lat, lon)[2] / 255;
  // land / sea checkpoints on all sides of the map (a mirrored or shifted texture fails these)
  const land = [[51.5, -0.1], [25, 45], [-25, 135], [40, -100], [-10, -55], [64, -45], [-80, 0], [0, 20], [35, 105]];
  const sea = [[0, 0], [30, -40], [-40, -20], [-50, 160], [20, -150], [10, 65], [35, 18], [-5, 112]];
  for (const [la, lo] of land) assert.ok(water(la, lo) < 0.2, `land expected at ${la},${lo}`);
  for (const [la, lo] of sea) assert.ok(water(la, lo) > 0.8, `sea expected at ${la},${lo}`);
});
