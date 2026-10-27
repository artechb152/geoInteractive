/* ─────────── מערכת קואורדינטות גיאוגרפית — the one model behind the globe ───────────
   Pure TypeScript (no three, no React) so the node tests can run it
   (scripts/qa/geo-globe.test.mjs). Everything the learner sees on the globe
   comes from here, from one coordinate state:
   - the Earth is the WGS84 ellipsoid at true flattening (1 / 298.257…), semi-major
     axis = 1 scene unit. A point is placed by GEODETIC latitude (the angle of the
     surface normal), never by the angle of the radius from the centre;
   - the mesh, the texture (plate carrée in geodetic lat / lon), the graticule and
     the selected parallel / meridian (both drawn in the globe's shader from the
     same lat / lon), the marker and every label anchor use these functions;
   - scene axes: x = ECEF X (lon 0 on the equator), y = ECEF Z (north),
     z = −ECEF Y — right-handed, so seen from outside east is to the right of
     north: the globe is never mirrored, whatever the page direction.
   The learner's state keeps a magnitude and a direction per coordinate
   (0–90 N/S, 0–180 E/W); the signed values (north and east positive) are what
   the globe and the answer check use. */

/* ───────────────────────── the deck's two points ───────────────────────── */

/** The deck's own points (מבוא לגיאודזיה ב׳, slides 6–9): the example, then the
    exercise "ומה הנ״צ הבא?". `ref` is the deck's notation — longitude first. The
    screen shows latitude and longitude as separate labelled values instead
    (design/docs/assumptions.md, 2026-10-12 גלובוס חוקר). */
export const LATLON_ITEMS = [
  { lat: -30, lon: 90, ref: '(90E,30S)' },
  { lat: 15, lon: 75, ref: '(75E,15N)' },
] as const;
export const EXAMPLE = LATLON_ITEMS[0];
export const TARGET = LATLON_ITEMS[1];

/* ───────────────────────── WGS84 ───────────────────────── */

export const WGS84 = { a: 6378137, f: 1 / 298.257223563 } as const;
/** Semi-major axis in scene units. */
export const A = 1;
/** Semi-minor axis in scene units. */
export const B = A * (1 - WGS84.f);
/** First eccentricity squared. */
export const E2 = WGS84.f * (2 - WGS84.f);

export type Vec3 = [number, number, number];
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** Geodetic latitude / longitude (degrees) and height (scene units) → scene point. */
export function geodeticToScene(latDeg: number, lonDeg: number, h = 0): Vec3 {
  const phi = latDeg * D2R;
  const lam = lonDeg * D2R;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const N = A / Math.sqrt(1 - E2 * s * s);
  const X = (N + h) * c * Math.cos(lam);
  const Y = (N + h) * c * Math.sin(lam);
  const Z = (N * (1 - E2) + h) * s;
  return [X, Z, -Y];
}

/** The ellipsoid's outward unit normal at a geodetic point — its elevation angle IS the latitude. */
export function surfaceNormal(latDeg: number, lonDeg: number): Vec3 {
  const phi = latDeg * D2R;
  const lam = lonDeg * D2R;
  const c = Math.cos(phi);
  return [c * Math.cos(lam), Math.sin(phi), -c * Math.sin(lam)];
}

/** Scene point → geodetic latitude / longitude (degrees) and height (Bowring, then iterated). */
export function sceneToGeodetic(p: Vec3): { lat: number; lon: number; h: number } {
  const X = p[0];
  const Y = -p[2];
  const Z = p[1];
  const rho = Math.hypot(X, Y);
  const lon = Math.atan2(Y, X) * R2D;
  if (rho < 1e-12) return { lat: Z >= 0 ? 90 : -90, lon: 0, h: Math.abs(Z) - B };
  let phi = Math.atan2(Z, rho * (1 - E2));
  for (let i = 0; i < 6; i++) {
    const s = Math.sin(phi);
    const N = A / Math.sqrt(1 - E2 * s * s);
    phi = Math.atan2(Z + E2 * N * s, rho);
  }
  const s = Math.sin(phi);
  const N = A / Math.sqrt(1 - E2 * s * s);
  const h = Math.abs(Math.cos(phi)) > 1e-9 ? rho / Math.cos(phi) - N : Math.abs(Z) - B;
  return { lat: phi * R2D, lon, h };
}

/** Texture / mesh parameter of a geodetic point — the shader reads lat / lon back from it. */
export const geoToUv = (latDeg: number, lonDeg: number): [number, number] => [(normalizeLon(lonDeg) + 180) / 360, (latDeg + 90) / 180];

/** The ellipsoid mesh: a (lat, lon) grid in geodetic coordinates, uv = the plate carrée
    texture's own parameter, normals = the ellipsoid's geodetic normals. The u = 0 and
    u = 1 columns are separate vertices (the texture's seam at 180°). */
export function ellipsoidMesh(nLat: number, nLon: number) {
  const count = (nLat + 1) * (nLon + 1);
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let k = 0;
  for (let i = 0; i <= nLat; i++) {
    const v = i / nLat;
    const lat = v * 180 - 90;
    for (let j = 0; j <= nLon; j++) {
      const u = j / nLon;
      const lon = u * 360 - 180;
      position.set(geodeticToScene(lat, lon), k * 3);
      normal.set(surfaceNormal(lat, lon), k * 3);
      uv[k * 2] = u;
      uv[k * 2 + 1] = v;
      k++;
    }
  }
  const index = new Uint32Array(nLat * nLon * 6);
  let n = 0;
  for (let i = 0; i < nLat; i++)
    for (let j = 0; j < nLon; j++) {
      const a = i * (nLon + 1) + j;
      const b = a + 1;
      const c = a + nLon + 1;
      const d = c + 1;
      // counter-clockwise seen from outside: (east × north) points outward
      index.set([a, b, c, b, d, c], n);
      n += 6;
    }
  return { position, normal, uv, index };
}

/* ───────────────────────── the learner's coordinates ───────────────────────── */

export type LatDir = 'N' | 'S';
export type LonDir = 'E' | 'W';
export type Coord = { latMag: number; latDir: LatDir; lonMag: number; lonDir: LonDir };
export type Signed = { lat: number; lon: number };

export const LAT_MAX = 90;
export const LON_MAX = 180;
/** One degree per step in this activity. */
export const STEP = 1;

const zero = (v: number) => (Object.is(v, -0) ? 0 : v);
const clampInt = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)));

/** Longitude into (−180, 180]: 180°W and 180°E are one meridian, kept as +180. */
export function normalizeLon(lon: number): number {
  let v = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (v === -180) v = 180;
  return zero(v);
}

/** Magnitudes + directions → signed degrees (north / east positive), normalised. */
export function toSigned(c: Coord): Signed {
  const lat = clampInt(c.latMag, LAT_MAX) * (c.latDir === 'N' ? 1 : -1);
  const lon = clampInt(c.lonMag, LON_MAX) * (c.lonDir === 'E' ? 1 : -1);
  return { lat: zero(lat), lon: normalizeLon(lon) };
}

/** Signed degrees → magnitudes + directions. At 0 (and at 180° of longitude) the
    direction carries no meaning; the previous choice is kept for the control. */
export function fromSigned(s: Signed, prev?: Pick<Coord, 'latDir' | 'lonDir'>): Coord {
  const lat = Math.max(-LAT_MAX, Math.min(LAT_MAX, Math.round(s.lat)));
  const lon = normalizeLon(Math.round(s.lon));
  return {
    latMag: Math.abs(lat),
    latDir: lat > 0 ? 'N' : lat < 0 ? 'S' : (prev?.latDir ?? 'N'),
    lonMag: Math.abs(lon),
    lonDir: lon > 0 && lon < 180 ? 'E' : lon < 0 ? 'W' : (prev?.lonDir ?? 'E'),
  };
}

/** Same place? The poles are one point whatever the longitude. */
export function samePlace(a: Signed, b: Signed): boolean {
  if (a.lat !== b.lat) return false;
  if (Math.abs(a.lat) === 90) return true;
  return normalizeLon(a.lon) === normalizeLon(b.lon);
}

/** "30°S", "15°N", "0°" — no direction claimed at the equator. */
export const fmtLat = (lat: number) => (lat === 0 ? '0°' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`);
/** "90°E", "75°W", "0°", "180°" — neither east nor west on Greenwich or on its antimeridian. */
export const fmtLon = (lon: number) => {
  const v = normalizeLon(lon);
  return v === 0 || v === 180 ? `${Math.abs(v)}°` : `${Math.abs(v)}°${v > 0 ? 'E' : 'W'}`;
};

/** Where the latitude is measured to, in words (under the latitude control). */
export function latCaption(lat: number): string {
  if (lat === 90) return 'צפונה מקו המשווה, בקוטב הצפוני';
  if (lat === -90) return 'דרומה מקו המשווה, בקוטב הדרומי';
  if (lat > 0) return 'צפונה מקו המשווה';
  if (lat < 0) return 'דרומה מקו המשווה';
  return 'על קו המשווה';
}

/** Where the longitude is measured to, in words (under the longitude control). */
export function lonCaption(lon: number, lat: number): string {
  if (Math.abs(lat) === 90) return 'בקוטב כל קווי האורך נפגשים';
  const v = normalizeLon(lon);
  if (v === 180) return 'מול גריניץ׳, שם מזרח ומערב נפגשים';
  if (v > 0) return 'מזרחה מגריניץ׳';
  if (v < 0) return 'מערבה מגריניץ׳';
  return 'על קו האורך של גריניץ׳';
}

/* ───────────────────────── practice: random tasks, checked by place ───────────────────────── */

/* No fixed exercise: each task is drawn at random (seeded, so the reducer stays pure
   and the tests repeatable) and checked by WHERE the answer lies.
   - find: the coordinates are given; the globe marks four lettered points and the
     learner picks the one they name. The other three are the typical mistakes —
     the wrong side of the equator or of Greenwich, latitude and longitude swapped —
     topped up with points one grid step off. No free click: precision on a turning
     globe is not what is taught.
   - read: a point is marked; the learner sets its latitude and longitude (checked
     within the level's tolerance).
   The level adapts: two first-try hits in a row → the next level; a task whose
   answer had to be shown → one level back.
   A try is a check of an answer not checked before on this task (checkBlocked); a "read"
   task's miss says where the learner's point lies relative to the marked one, never the
   marked one's values — those come only with the hit or the answer shown. */

export type TaskKind = 'find' | 'read';
export type Task = { kind: TaskKind; lat: number; lon: number; /** find: four points, the answer among them */ choices: Signed[] };

/** The choices' names on the globe and in the panel. */
export const CHOICE_NAMES = ['א', 'ב', 'ג', 'ד'] as const;

/** On the 30° grid lines · between them (every 15°) · every 5°. `tol`: degrees off allowed per axis. */
export const LEVELS = [
  { step: 30, latMax: 60, tol: 6, name: 'על קווי הרשת' },
  { step: 15, latMax: 60, tol: 5, name: 'בין קווי הרשת' },
  { step: 5, latMax: 70, tol: 4, name: 'כל 5 מעלות' },
] as const;
/** Tries before the answer is shown: two of four choices (a third would be elimination), three readings. */
export const MAX_TRIES: Record<TaskKind, number> = { find: 2, read: 3 };
/** A choice is right only on the point itself (choices are whole grid points). */
const CHOICE_TOL = 0.5;

/** mulberry32: [a number in [0, 1), the next seed]. */
export function rand(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

const quadrant = (p: Signed) => `${Math.sign(p.lat)}${Math.sign(normalizeLon(p.lon))}`;

/** How many recent points a new task avoids. */
export const RECENT = 8;

/** A new task at this level: a point on the level's grid that the level before could not
    have asked, none of the recent points, and (when possible) in another quadrant than the
    previous one. The kind is random, never "read" twice running. */
export function makeTask(level: number, seed: number, prev: Task | null, recent: Signed[] = []): { task: Task; seed: number } {
  const L = LEVELS[level];
  const below = level > 0 ? LEVELS[level - 1].step : 0;
  let s = seed;
  const next = () => {
    const [r, n] = rand(s);
    s = n;
    return r;
  };
  const nLat = Math.floor(L.latMax / L.step);
  const nLon = 360 / L.step;
  let p: Signed = { lat: L.step, lon: L.step };
  for (let i = 0; i < 60; i++) {
    const lat = zero((Math.floor(next() * (2 * nLat + 1)) - nLat) * L.step);
    const lon = normalizeLon((Math.floor(next() * nLon) - nLon / 2 + 1) * L.step);
    const c = { lat, lon };
    if (lat === 0 && lon === 0) continue;
    if (below && lat % below === 0 && lon % below === 0) continue;
    if (prev && (samePlace(c, prev) || (i < 40 && quadrant(c) === quadrant(prev)))) continue;
    if (i < 50 && recent.some((r) => samePlace(r, c))) continue;
    p = c;
    break;
  }
  const kind: TaskKind = prev?.kind === 'read' ? 'find' : next() < 0.6 ? 'find' : 'read';
  return { task: { kind, ...p, choices: kind === 'find' ? choicesFor(p, level, next) : [] }, seed: s };
}

const CHOICE_LAT_MAX = 80;

/** The answer and three distractors, shuffled: up to two of the typical mistakes (north /
    south flipped, east / west flipped, both, latitude and longitude swapped), the rest one
    grid step (at least 15°, so no two marks crowd) north, south, east or west of it. */
export function choicesFor(p: Signed, level: number, next: () => number): Signed[] {
  const off = Math.max(LEVELS[level].step, 15);
  const shuffle = <T,>(xs: T[]) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const ok = (c: Signed) => Math.abs(c.lat) <= CHOICE_LAT_MAX;
  const fix = (c: Signed): Signed => ({ lat: zero(c.lat), lon: normalizeLon(c.lon) });
  const mistakes = shuffle([
    { lat: -p.lat, lon: p.lon },
    { lat: p.lat, lon: -p.lon },
    { lat: -p.lat, lon: -p.lon },
    { lat: p.lon, lon: p.lat },
  ]);
  const steps = shuffle([
    { lat: p.lat + off, lon: p.lon },
    { lat: p.lat - off, lon: p.lon },
    { lat: p.lat, lon: p.lon + off },
    { lat: p.lat, lon: p.lon - off },
  ]);
  const out: Signed[] = [p];
  const add = (c: Signed, cap: number) => {
    const f = fix(c);
    if (out.length < cap && ok(f) && !out.some((o) => samePlace(o, f))) out.push(f);
  };
  for (const c of mistakes) add(c, 3);
  for (const c of [...steps, ...mistakes]) add(c, 4);
  return shuffle(out);
}

/* ── the check ── */

export type LatOff = 'ok' | 'north' | 'south';
export type LonOff = 'ok' | 'east' | 'west';
export type Judgement =
  | { hit: true }
  | { hit: false; swap: boolean; lat: LatOff; lon: LonOff; flipLat: boolean; flipLon: boolean };

/** Signed east−west difference, the short way round (−180, 180]. */
export const lonDiff = (a: number, b: number) => -normalizeLon(b - a);

/** Where the attempt lies relative to the target, axis by axis, within `tol` degrees.
    flip: the right distance from the equator / Greenwich on the wrong side of it.
    swap: the latitude's number where the longitude's belongs and back. */
export function judge(at: Signed, t: Signed, tol: number): Judgement {
  const dLat = at.lat - t.lat;
  const dLon = Math.abs(t.lat) >= 89.5 ? 0 : lonDiff(at.lon, t.lon);
  const latOk = Math.abs(dLat) <= tol;
  const lonOk = Math.abs(dLon) <= tol;
  if (latOk && lonOk) return { hit: true };
  const near = (a: number, b: number) => Math.abs(Math.abs(a) - Math.abs(b)) <= tol;
  const aLon = normalizeLon(at.lon);
  const tLon = normalizeLon(t.lon);
  const flipLat = !latOk && Math.abs(t.lat) > tol && Math.sign(at.lat) === -Math.sign(t.lat) && near(at.lat, t.lat);
  const flipLon = !lonOk && Math.abs(tLon) > tol && Math.abs(tLon) < 180 - tol && Math.sign(aLon) === -Math.sign(tLon) && near(aLon, tLon);
  const swap = Math.abs(Math.abs(t.lat) - Math.abs(tLon)) > 2 * tol && near(at.lat, tLon) && near(aLon, t.lat);
  return {
    hit: false,
    swap,
    lat: latOk ? 'ok' : dLat > 0 ? 'north' : 'south',
    lon: lonOk ? 'ok' : dLon > 0 ? 'east' : 'west',
    flipLat,
    flipLon,
  };
}

/* ── the words ── */

/** note: the explorer · info: a task · ok: a hit · retry: a miss · reveal: the answer shown */
export type Message = { tone: 'info' | 'ok' | 'retry' | 'reveal'; title: string; body: string };

const latWord = (t: number) => (t > 0 ? { adj: 'צפוני', to: 'מצפון לקו המשווה' } : { adj: 'דרומי', to: 'מדרום לקו המשווה' });
const lonWord = (t: number) => (t > 0 ? { adj: 'מזרחי', to: 'ממזרח לגריניץ׳' } : { adj: 'מערבי', to: 'ממערב לגריניץ׳' });

/** The short note set beside the learner's point on the globe. */
export function missNote(j: Judgement): string {
  if (j.hit) return 'נכון';
  if (j.swap) return 'הרוחב והאורך התחלפו';
  if (j.flipLat || j.flipLon) return 'בחצי הכדור הלא נכון';
  const parts = [j.lat === 'north' ? 'צפונה' : j.lat === 'south' ? 'דרומה' : '', j.lon === 'east' ? 'מזרחה' : j.lon === 'west' ? 'מערבה' : ''].filter(Boolean);
  return `${parts.join(' ו')} מדי`;
}

const latLine = (t: number) => (t === 0 ? 'לקו המשווה' : `לקו הרוחב ${fmtLat(t)}`);
const lonLine = (t: number) => (normalizeLon(t) === 0 ? 'לגריניץ׳' : `לקו האורך ${fmtLon(t)}`);

/** The panel's sentence for a miss — distinct for a swap, a wrong side, and plain distance.
    find: the coordinates are the question, so the target's own lines may be named.
    read: the marked point IS the question — no value of it is ever said (not even "0°"); the
    sentence says where the learner's point lies relative to it and what to count from. */
export function missMessage(j: Judgement, t: Signed, kind: TaskKind): Message {
  if (j.hit) return hitMessage(t);
  if (j.swap)
    return {
      tone: 'retry',
      title: 'הרוחב והאורך התחלפו.',
      body: 'הרוחב נמדד מקו המשווה צפונה או דרומה, והאורך מגריניץ׳ מזרחה או מערבה.',
    };
  const read = kind === 'read';
  const said: string[] = [];
  if (j.flipLat)
    said.push(read ? 'הנקודה המסומנת בצד השני של קו המשווה: בדקו את כיוון הרוחב, צפון או דרום.' : `${fmtLat(t.lat)} הוא רוחב ${latWord(t.lat).adj} – ${latWord(t.lat).to}.`);
  if (j.flipLon)
    said.push(read ? 'הנקודה המסומנת בצד השני של גריניץ׳: בדקו את כיוון האורך, מזרח או מערב.' : `${fmtLon(t.lon)} הוא אורך ${lonWord(t.lon).adj} – ${lonWord(t.lon).to}.`);
  const offLat = j.lat !== 'ok' && !j.flipLat;
  const offLon = j.lon !== 'ok' && !j.flipLon;
  const latSide = j.lat === 'north' ? 'מצפון' : 'מדרום';
  const lonSide = j.lon === 'east' ? 'ממזרח' : 'ממערב';
  if (read && (offLat || offLon)) {
    const where = [offLat && latSide, offLon && lonSide].filter(Boolean).join(' ו');
    const count = [offLat && 'את קווי הרוחב מקו המשווה', offLon && 'את קווי האורך מגריניץ׳'].filter(Boolean).join(' ו');
    said.push(`הנקודה שלכם ${where} לנקודה המסומנת. ספרו ${count}.`);
  } else if (offLat || offLon) {
    const where = [offLat && `${latSide} ${latLine(t.lat)}`, offLon && `${lonSide} ${lonLine(t.lon)}`].filter(Boolean).join(' ו');
    said.push(`הנקודה שלכם ${where}.`);
  }
  if (j.lat === 'ok') said.unshift('הרוחב מתאים.');
  else if (j.lon === 'ok') said.unshift('האורך מתאים.');
  return { tone: 'retry', title: `עוד לא: ${missNote(j)}.`, body: said.join(' ') };
}

/* ── a read task, in words: where the marked point lies on the grid, never its values ── */

const GRID = 30;
const ORD = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
/** The part of a 30° gap that a 5° step is, from the line nearer the equator / Greenwich. */
const PART: Record<number, string> = { 5: 'שישית', 10: 'שליש', 15: 'חצי', 20: 'שני שלישים', 25: 'חמש שישיות' };

/** One coordinate as a sighted learner reads it: on which grid line, or between which two and
    how far along — counted from the equator (Greenwich), the 30° lines numbered outward. */
function axisPlace(v: number, axis: 'lat' | 'lon'): string {
  const lat = axis === 'lat';
  const m = Math.abs(lat ? v : normalizeLon(v));
  const n = Math.floor(m / GRID);
  const r = Math.round(m - n * GRID);
  const base = lat ? 'קו המשווה' : 'גריניץ׳';
  const kind = lat ? 'קו הרוחב' : 'קו האורך';
  const side = lat ? (v > 0 ? 'מצפון' : 'מדרום') : v > 0 ? 'ממזרח' : 'ממערב';
  const sideTo = `${side} ל${base}`;
  const last = lat ? `קוטב ה${v > 0 ? 'צפוני' : 'דרומי'}` : null;
  // the outermost line: the pole, or the meridian facing Greenwich
  const outer = (k: number) => k * GRID === (lat ? LAT_MAX : LON_MAX);
  if (r === 0 || r === GRID) {
    const k = r === GRID ? n + 1 : n;
    if (k === 0) return `על ${base}`;
    if (outer(k)) return lat ? `ב${last}` : 'על קו האורך שמול גריניץ׳';
    return `על ${kind} ה${ORD[k]} ${sideTo}`;
  }
  const between =
    n === 0
      ? `בין ${base} ל${kind} ה${ORD[1]} ${side} לו`
      : outer(n + 1)
        ? `בין ${kind} ה${ORD[n]} ${sideTo} ל${lat ? last : 'קו האורך שמול גריניץ׳'}`
        : `בין ${kind} ה${ORD[n]} ל${ORD[n + 1]} ${sideTo}`;
  const step = Math.min(25, Math.max(5, Math.round(r / 5) * 5));
  const along = step === 15 ? 'באמצע הדרך ביניהם' : `${PART[step]} מהדרך מ${n === 0 ? base : `הקו ה${ORD[n]}`}`;
  return `${between}, ${along}`;
}

/** A read task's point for a screen reader: what the eye takes from the globe — the grid lines
    around it — so it can be solved without sight, with the same counting and no value given. */
export const gridPlace = (t: Signed): string => `ברוחב: ${axisPlace(t.lat, 'lat')}. באורך: ${axisPlace(t.lon, 'lon')}.`;

export function hitMessage(t: Signed, levelUp?: string): Message {
  return {
    tone: 'ok',
    title: 'נכון!',
    body: `רוחב ${fmtLat(t.lat)} ואורך ${fmtLon(t.lon)}.${levelUp ? ` עוברים לרמה הבאה: ${levelUp}.` : ''}`,
  };
}

export const revealMessage = (t: Signed): Message => ({
  tone: 'reveal',
  title: 'זו הנקודה.',
  body: `רוחב ${fmtLat(t.lat)} ואורך ${fmtLon(t.lon)} – במפגש הקווים הכתומים.`,
});

export const TASK_INTRO: Record<TaskKind, Message> = {
  find: { tone: 'info', title: 'איזו מהנקודות על הגלובוס?', body: 'סובבו את הגלובוס ובחרו אות – על הגלובוס או כאן. היעזרו בקווי הרשת: כל קו מסמן 30 מעלות.' },
  read: { tone: 'info', title: 'היעזרו בקווי הרשת.', body: 'כל קו מסמן 30 מעלות. קבעו לרוחב ולאורך מספר וכיוון.' },
};

/* ───────────────────────── state ───────────────────────── */

export type Stage = 'explore' | 'task';
export type Check = { at: Signed; j: Judgement };
export type GeoState = {
  stage: Stage;
  explore: Coord;
  task: Task | null;
  /** find: the chosen point (an index into task.choices) */
  pick: number | null;
  /** find: choices already checked and wrong */
  ruled: number[];
  /** read: the learner's coordinates */
  answer: Coord;
  /** misses on this task */
  misses: number;
  last: Check | null;
  /** every attempt checked on this task — the same one again is no new try */
  tried: Signed[];
  outcome: null | 'hit' | 'reveal';
  level: number;
  streak: number;
  found: number;
  /** the level this task's hit moved up to (for the message) */
  leveled: boolean;
  /** the last tasks' points, newest first (not asked again soon) */
  recent: Signed[];
  seed: number;
};

export const EXPLORE_START: Coord = { latMag: 0, latDir: 'N', lonMag: 0, lonDir: 'E' };
export const ANSWER_START: Coord = { latMag: 0, latDir: 'N', lonMag: 0, lonDir: 'E' };

export const initialGeoState = (): GeoState => ({
  stage: 'explore',
  explore: { ...EXPLORE_START },
  task: null,
  pick: null,
  ruled: [],
  answer: { ...ANSWER_START },
  misses: 0,
  last: null,
  tried: [],
  outcome: null,
  level: 0,
  streak: 0,
  found: 0,
  leveled: false,
  recent: [],
  seed: 1,
});

export type GeoAction =
  | { type: 'latMag'; v: number }
  | { type: 'lonMag'; v: number }
  | { type: 'latStep'; d: number }
  | { type: 'lonStep'; d: number }
  | { type: 'latDir'; dir: LatDir }
  | { type: 'lonDir'; dir: LonDir }
  | { type: 'resetExplore' }
  /** into practice; `seed` from the event (the reducer itself draws no randomness) */
  | { type: 'start'; seed: number }
  | { type: 'explore' }
  | { type: 'pick'; i: number }
  | { type: 'check' }
  | { type: 'next' };

const sameCoord = (a: Coord, b: Coord) => a.latMag === b.latMag && a.latDir === b.latDir && a.lonMag === b.lonMag && a.lonDir === b.lonDir;
const sameSigned = (a: Signed | null, b: Signed | null) => !!a && !!b && a.lat === b.lat && a.lon === b.lon;

function edit(c: Coord, a: GeoAction): Coord {
  switch (a.type) {
    case 'latMag':
      return { ...c, latMag: clampInt(a.v, LAT_MAX) };
    case 'lonMag':
      return { ...c, lonMag: clampInt(a.v, LON_MAX) };
    case 'latStep':
      return { ...c, latMag: clampInt(c.latMag + a.d * STEP, LAT_MAX) };
    case 'lonStep':
      return { ...c, lonMag: clampInt(c.lonMag + a.d * STEP, LON_MAX) };
    case 'latDir':
      return { ...c, latDir: a.dir };
    case 'lonDir':
      return { ...c, lonDir: a.dir };
    default:
      return c;
  }
}

function withTask(s: GeoState, seed: number): GeoState {
  const { task, seed: next } = makeTask(s.level, seed, s.task, s.recent);
  const recent = [{ lat: task.lat, lon: task.lon }, ...s.recent].slice(0, RECENT);
  return { ...s, stage: 'task', task, recent, pick: null, ruled: [], answer: { ...ANSWER_START }, misses: 0, last: null, tried: [], outcome: null, leveled: false, seed: next };
}

/** The attempt now: the chosen point (find) or the coordinates set (read). */
export function attemptOf(s: GeoState): Signed | null {
  if (!s.task) return null;
  if (s.task.kind === 'read') return toSigned(s.answer);
  return s.pick === null ? null : s.task.choices[s.pick];
}

export function geoReducer(s: GeoState, a: GeoAction): GeoState {
  switch (a.type) {
    case 'resetExplore':
      // 0°, 0°: the directions are kept — at 0 they claim nothing, only where the number grows
      return { ...s, explore: { ...s.explore, latMag: 0, lonMag: 0 } };
    case 'start':
      // back into a task left unfinished; otherwise a new one
      return s.task && !s.outcome ? { ...s, stage: 'task' } : withTask(s, a.seed);
    case 'explore':
      return s.stage === 'explore' ? s : { ...s, stage: 'explore' };
    case 'next':
      return s.stage === 'task' && s.outcome ? withTask(s, s.seed) : s;
    case 'pick': {
      if (s.stage !== 'task' || s.task?.kind !== 'find' || s.outcome || s.pick === a.i) return s;
      if (!(a.i >= 0 && a.i < s.task.choices.length) || s.ruled.includes(a.i)) return s;
      return { ...s, pick: a.i };
    }
    case 'check': {
      const at = attemptOf(s);
      if (s.stage !== 'task' || !s.task || s.outcome || !at || checkBlocked(s)) return s;
      const find = s.task.kind === 'find';
      const j = judge(at, s.task, find ? CHOICE_TOL : LEVELS[s.level].tol);
      const last = { at, j };
      const tried = [...s.tried, at];
      if (j.hit) {
        const streak = s.misses === 0 ? s.streak + 1 : 0;
        const up = streak >= 2 && s.level < LEVELS.length - 1;
        return { ...s, last, tried, outcome: 'hit', found: s.found + 1, streak: up ? 0 : streak, level: up ? s.level + 1 : s.level, leveled: up };
      }
      const misses = s.misses + 1;
      const ruled = find && s.pick !== null ? [...s.ruled, s.pick] : s.ruled;
      if (misses >= MAX_TRIES[s.task.kind]) return { ...s, last, tried, misses, ruled, outcome: 'reveal', streak: 0, level: Math.max(0, s.level - 1) };
      return { ...s, last, tried, misses, ruled };
    }
    default: {
      // a change to the coordinates: the explorer's, or the answer to a "read" task
      if (s.stage === 'explore') {
        const next = edit(s.explore, a);
        return sameCoord(next, s.explore) ? s : { ...s, explore: next };
      }
      if (s.task?.kind !== 'read' || s.outcome) return s;
      const next = edit(s.answer, a);
      return sameCoord(next, s.answer) ? s : { ...s, answer: next };
    }
  }
}

/** The latest check no longer describes the attempt (another choice, a value changed). */
export const isStale = (s: GeoState) => !!s.last && !s.outcome && !sameSigned(s.last.at, attemptOf(s));

/** Why "בדיקה" cannot run now, in an open task: 'pick' — no letter chosen yet; 'same' — this
    very answer was checked already on this task (the same values: a direction at 0°, or east /
    west at 180°, is no change). null: it can. A blocked check is no try and changes nothing. */
export function checkBlocked(s: GeoState): null | 'pick' | 'same' {
  if (s.stage !== 'task' || !s.task || s.outcome) return null;
  const at = attemptOf(s);
  if (!at) return 'pick';
  return s.tried.some((p) => sameSigned(p, at)) ? 'same' : null;
}

/** Said by "בדיקה" while the answer is one already checked. */
export const RECHECK_HINT: Record<TaskKind, string> = {
  find: 'כדי לבדוק שוב, בחרו אות אחרת.',
  read: 'כדי לבדוק שוב, שנו את הרוחב או את האורך.',
};

/** What the panel says in a task (null in the explorer). */
export function messageOf(s: GeoState): { message: Message; stale: boolean } | null {
  if (s.stage !== 'task' || !s.task) return null;
  if (s.outcome === 'hit') return { message: hitMessage(s.task, s.leveled ? LEVELS[s.level].name : undefined), stale: false };
  if (s.outcome === 'reveal') return { message: revealMessage(s.task), stale: false };
  if (s.last) return { message: missMessage(s.last.j, s.task, s.task.kind), stale: isStale(s) };
  return { message: TASK_INTRO[s.task.kind], stale: false };
}

/** The globe's description for a screen reader. find: the coordinates asked are the question;
    read: where the marked point lies on the grid (gridPlace), never its values. */
export function globeDescription(s: GeoState): string {
  const grid = 'גלובוס תלת־ממדי עם רשת קווי רוחב ואורך כל 30 מעלות.';
  const task = s.stage === 'task' ? s.task : null;
  if (!task) {
    const e = toSigned(s.explore);
    return `${grid} מסומנים קו הרוחב ${fmtLat(e.lat)} וקו האורך ${fmtLon(e.lon)}, ונקודת המפגש שלהם.`;
  }
  if (task.kind === 'find')
    return `${grid.slice(0, -1)}, ועליו ארבע נקודות מסומנות באותיות ${CHOICE_NAMES.join(', ')}. איזו מהן נמצאת ברוחב ${fmtLat(task.lat)} ובאורך ${fmtLon(task.lon)}? בחרו אות בפאנל.`;
  return `${grid} נקודה מסומנת בעיגול – ${gridPlace(task)} קבעו את הרוחב והאורך שלה.`;
}

/** What the globe draws. The target's lines are never drawn before the task is over.
    sel: the parallel, meridian, point and value chips · choices: a "find" task's lettered
    points (picked, ruled out, and the answer once over) · target: the marked point of a
    "read" task · note: a miss, beside where it was made. */
export type GlobeView = {
  sel: Signed | null;
  win: boolean;
  choices: Signed[];
  picked: number | null;
  ruled: number[];
  answer: number | null;
  target: Signed | null;
  note: { at: Signed; text: string } | null;
};
const NO_CHOICES = { choices: [] as Signed[], picked: null, ruled: [] as number[], answer: null };

export function globeViewOf(s: GeoState): GlobeView {
  if (s.stage === 'explore' || !s.task) return { sel: toSigned(s.explore), win: false, ...NO_CHOICES, target: null, note: null };
  const t = { lat: s.task.lat, lon: s.task.lon };
  const over = !!s.outcome;
  const fresh = s.last && !isStale(s) && !over ? s.last : null;
  const note = fresh ? { at: fresh.at, text: missNote(fresh.j) } : null;
  if (s.task.kind === 'find') {
    const answer = s.task.choices.findIndex((c) => samePlace(c, t));
    return { sel: over ? t : null, win: s.outcome === 'hit', choices: s.task.choices, picked: s.pick, ruled: s.ruled, answer: over ? answer : null, target: null, note };
  }
  // read: the point is the question; the learner's own lines show once checked
  return { sel: over ? t : fresh ? fresh.at : null, win: s.outcome === 'hit', ...NO_CHOICES, target: over ? null : t, note };
}

/* ───────────────────────── seeing a point: occlusion ───────────────────────── */

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** cos of the angle between a surface point's normal and the direction to the
    camera: > 0 on the visible side of the convex ellipsoid, 0 on its limb. */
export function facing(latDeg: number, lonDeg: number, cam: Vec3): number {
  const p = geodeticToScene(latDeg, lonDeg);
  return dot(surfaceNormal(latDeg, lonDeg), norm(sub(cam, p)));
}

/** Does the straight segment from `from` to `to` pass through the ellipsoid?
    (Exact: the ellipsoid scaled to the unit sphere along y.) For a label anchored
    above the surface — the pole's "N" — this is the occlusion test. */
export function segmentHitsEllipsoid(from: Vec3, to: Vec3, eps = 1e-6): boolean {
  const o: Vec3 = [from[0] / A, from[1] / B, from[2] / A];
  const t: Vec3 = [to[0] / A, to[1] / B, to[2] / A];
  const d = sub(t, o);
  const a = dot(d, d);
  const b = 2 * dot(o, d);
  const c = dot(o, o) - 1;
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a === 0) return false;
  const r = Math.sqrt(disc);
  const s0 = (-b - r) / (2 * a);
  const s1 = (-b + r) / (2 * a);
  return (s0 > eps && s0 < 1 - eps) || (s1 > eps && s1 < 1 - eps);
}

/* ───────────────────────── label placement (screen space) ───────────────────────── */

export type Rect = { x: number; y: number; w: number; h: number }; // centre and full size, px
export type Cand = { x: number; y: number; facing: number; cost: number };

const overlaps = (a: Rect, b: Rect, gap: number) => Math.abs(a.x - b.x) * 2 < a.w + b.w + gap * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + gap * 2;

/** The cheapest candidate anchor on a line whose label box stays inside the
    stage, clear of the boxes placed before it, on a part of the surface that
    faces the camera well enough to be read. null: hide the label. */
export function pickLabel(
  cands: Cand[],
  size: { w: number; h: number },
  avoid: Rect[],
  stage: { w: number; h: number; pad: number },
  minFacing: number,
  gap = 4,
): Rect | null {
  let best: Rect | null = null;
  let bestCost = Infinity;
  for (const c of cands) {
    if (c.facing < minFacing || c.cost >= bestCost) continue;
    const r: Rect = { x: c.x, y: c.y, w: size.w, h: size.h };
    if (r.x - r.w / 2 < stage.pad || r.x + r.w / 2 > stage.w - stage.pad || r.y - r.h / 2 < stage.pad || r.y + r.h / 2 > stage.h - stage.pad) continue;
    if (avoid.some((o) => overlaps(r, o, gap))) continue;
    best = r;
    bestCost = c.cost;
  }
  return best;
}

/* ───────────────────────── camera ───────────────────────── */

/** Opening view: centred on 0°, 0°, where the equator meets Greenwich (the explorer's
    opening point, EXPLORE_START), north up. User request 2026-10-12. */
export const VIEW_START = { lat: 0, lon: 0 } as const;
/** Camera distance for the opening view (scene units from the centre): the globe
    ≈ 576 px across in the explorer's 660 px stage, as in the reference. */
export const CAM_DIST = 5.25;
export const CAM_FOV = 25;
/** Limited zoom: never inside the body, never so far the globe stops filling its stage. */
export const CAM_MIN = 4;
export const CAM_MAX = 6.4;

/** Unit direction from the centre toward the camera for a view centred on (lat, lon). */
export const viewDir = (latDeg: number, lonDeg: number): Vec3 => surfaceNormal(latDeg, lonDeg);
