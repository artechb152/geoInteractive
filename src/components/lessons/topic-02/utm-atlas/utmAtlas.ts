/* ─────────── אטלס הפלחים — UTM zones, coverage, exceptions: pure logic ───────────
   Brief: design/mockups/utm-concepts-2026-10-12/README.md (חלופה 2).

   ONE state drives the whole atlas: a point { lat, lon } (WGS84, degrees).
   Everything the page shows — the zone, the hemisphere, the zone's longitude
   range, E/N — is derived here from that point. E/N come from toUtm()
   (reference-systems/utm.ts: Karney / Krüger n⁶, the algorithm behind PROJ's
   `+proj=utm`), with the zone and hemisphere this file assigns.

   Zone rules (PROJ "utm" docs; NGA, "The Universal Grids"):
   - 60 zones of 6° of longitude, numbered eastward from 180°; a point on a
     boundary belongs to the zone east of it (the usual floor rule).
   - Latitude 80°S – 84°N. Outside it UTM is not used (UPS covers the poles),
     so the atlas never computes E/N there.
   - Hemisphere N for lat ≥ 0 (false northing 0), S below it (10 000 000 m).
     This is NOT the MGRS latitude band letter (C…X).
   - Exceptions: 56°N – 64°N, 3°E – 12°E is zone 32 (south-west Norway);
     72°N – 84°N, 0° – 42°E is zones 31 / 33 / 35 / 37 (Svalbard), where 32,
     34 and 36 do not exist. */

import { centralMeridian, toUtm, type LatLon } from '../reference-systems/utm';

export { centralMeridian };
export type { LatLon };
export type Hemisphere = 'N' | 'S';

export const ZONE_COUNT = 60;
export const ZONE_WIDTH = 6;
export const SOUTH_LIMIT = -80;
export const NORTH_LIMIT = 84;
export const DATUM = 'WGS84';

/** Longitude into [−180, 180). */
export const normLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
/** Zone numbers wrap: east of 60 is 1, west of 1 is 60. */
export const wrapZone = (z: number) => ((((z - 1) % ZONE_COUNT) + ZONE_COUNT) % ZONE_COUNT) + 1;
export const zoneWest = (zone: number) => -180 + ZONE_WIDTH * (zone - 1);
export const zoneEast = (zone: number) => zoneWest(zone) + ZONE_WIDTH;
/** The zone by longitude alone (no exceptions). */
export const regularZone = (lon: number) => Math.min(ZONE_COUNT, Math.floor((normLon(lon) + 180) / ZONE_WIDTH) + 1);

export const inCoverage = (lat: number) => lat >= SOUTH_LIMIT && lat <= NORTH_LIMIT;
export const clampLat = (lat: number) => Math.max(SOUTH_LIMIT, Math.min(NORTH_LIMIT, lat));
export const hemisphereOf = (lat: number): Hemisphere => (lat >= 0 ? 'N' : 'S');

const inNorway = (lat: number, lon: number) => lat >= 56 && lat < 64 && lon >= 0 && lon < 12;
const inSvalbard = (lat: number, lon: number) => lat >= 72 && lat <= 84 && lon >= 0 && lon < 42;

/** UTM zone of a point, with the Norway and Svalbard exceptions. Caller keeps lat inside coverage. */
export function utmZoneOf({ lat, lon }: LatLon): number {
  const l = normLon(lon);
  if (inNorway(lat, l)) return l < 3 ? 31 : 32;
  if (inSvalbard(lat, l)) return l < 9 ? 31 : l < 21 ? 33 : l < 33 ? 35 : 37;
  return regularZone(l);
}

export type Exception = 'norway' | 'svalbard' | null;
/** Which exception area the point is in — whether or not it changed this point's zone. */
export function exceptionAt({ lat, lon }: LatLon): Exception {
  const l = normLon(lon);
  return inNorway(lat, l) ? 'norway' : inSvalbard(lat, l) ? 'svalbard' : null;
}

/* ── Zone shapes ─────────────────────────────────────────────────────────── */

export type Band = { s: number; n: number; w: number; e: number };

/** Latitude bands where a zone's longitude range is constant, south → north (merged). */
export function zoneBands(zone: number): Band[] {
  const w = zoneWest(zone);
  const e = w + ZONE_WIDTH;
  const raw: (Band | null)[] = [
    { s: SOUTH_LIMIT, n: 56, w, e },
    zone === 31 ? { s: 56, n: 64, w, e: 3 } : zone === 32 ? { s: 56, n: 64, w: 3, e } : { s: 56, n: 64, w, e },
    { s: 64, n: 72, w, e },
  ];
  const X: Record<number, [number, number] | null> = { 31: [0, 9], 32: null, 33: [9, 21], 34: null, 35: [21, 33], 36: null, 37: [33, 42] };
  if (zone in X) raw.push(X[zone] ? { s: 72, n: NORTH_LIMIT, w: X[zone]![0], e: X[zone]![1] } : null);
  else raw.push({ s: 72, n: NORTH_LIMIT, w, e });

  const out: Band[] = [];
  for (const b of raw) {
    if (!b) continue;
    const last = out.at(-1);
    if (last && last.w === b.w && last.e === b.e && last.n === b.s) last.n = b.n;
    else out.push({ ...b });
  }
  return out;
}

/** The zone's longitude range at a latitude, or null where the zone does not exist (32X, 34X, 36X). */
export function zoneRangeAt(zone: number, lat: number): { w: number; e: number } | null {
  const b = zoneBands(zone).find((x) => lat >= x.s && (lat < x.n || (x.n === NORTH_LIMIT && lat <= x.n)));
  return b ? { w: b.w, e: b.e } : null;
}

const outlineOf = (bands: Band[]): [number, number][] => {
  const west: [number, number][] = bands.flatMap((b) => [[b.w, b.s] as [number, number], [b.w, b.n] as [number, number]]);
  const east: [number, number][] = [...bands].reverse().flatMap((b) => [[b.e, b.n] as [number, number], [b.e, b.s] as [number, number]]);
  return [...west, ...east];
};

/** Outline polygon [lon, lat][] of a zone over its whole coverage (stepped where an exception applies). */
export const zoneOutline = (zone: number) => outlineOf(zoneBands(zone));

/** Outline of a zone on one side of the equator — the part a hemisphere letter names ("54N");
    the whole zone without a hemisphere. */
export function cellOutline(zone: number, hemisphere: Hemisphere | null): [number, number][] {
  if (!hemisphere) return zoneOutline(zone);
  const bands = zoneBands(zone).flatMap((b) => {
    const s = hemisphere === 'N' ? Math.max(b.s, 0) : b.s;
    const n = hemisphere === 'S' ? Math.min(b.n, 0) : b.n;
    return s < n ? [{ ...b, s, n }] : [];
  });
  return outlineOf(bands);
}

export type Segment = [[number, number], [number, number]];

let boundaryCache: Segment[] | null = null;
/** Every zone boundary inside coverage, derived from utmZoneOf() itself so the lines and the
    lookup can never disagree: vertical segments where the zone changes across a meridian,
    horizontal steps where it changes across a band edge (56°, 64°, 72°N). */
export function zoneBoundarySegments(): Segment[] {
  if (boundaryCache) return boundaryCache;
  const segs: Segment[] = [];
  const bandEdges = [SOUTH_LIMIT, 56, 64, 72, NORTH_LIMIT];
  for (let b = 0; b < bandEdges.length - 1; b++) {
    const s = bandEdges[b];
    const n = bandEdges[b + 1];
    const mid = (s + n) / 2;
    for (let lon = -179; lon <= 179; lon++) {
      if (utmZoneOf({ lat: mid, lon: lon - 0.5 }) !== utmZoneOf({ lat: mid, lon: lon + 0.5 })) {
        const prev = segs.find((g) => g[0][0] === lon && g[1][0] === lon && g[1][1] === s);
        if (prev) prev[1][1] = n;
        else segs.push([[lon, s], [lon, n]]);
      }
    }
  }
  for (const t of [56, 64, 72]) {
    let start: number | null = null;
    for (let lon = -180; lon <= 180; lon++) {
      const differs = lon < 180 && utmZoneOf({ lat: t - 0.5, lon: lon + 0.5 }) !== utmZoneOf({ lat: t + 0.5, lon: lon + 0.5 });
      if (differs && start === null) start = lon;
      if (!differs && start !== null) {
        segs.push([[start, t], [lon, t]]);
        start = null;
      }
    }
  }
  boundaryCache = segs;
  return segs;
}

/* ── Reading a point ─────────────────────────────────────────────────────── */

export type UtmReading = {
  lat: number;
  lon: number;
  zone: number;
  hemisphere: Hemisphere;
  /** Metres, unrounded. */
  e: number;
  n: number;
  /** Whole metres, as displayed. */
  eText: string;
  nText: string;
  /** The zone's longitude range at this latitude. */
  range: { w: number; e: number };
  exception: Exception;
};

/** The single derivation every view reads. Lat must be inside coverage. */
export function readUtm(p: LatLon): UtmReading {
  const lon = normLon(p.lon);
  const zone = utmZoneOf({ lat: p.lat, lon });
  const hemisphere = hemisphereOf(p.lat);
  const { e, n } = toUtm({ lat: p.lat, lon }, { zone, hemisphere });
  return {
    lat: p.lat,
    lon,
    zone,
    hemisphere,
    e,
    n,
    eText: String(Math.round(e)),
    nText: String(Math.round(n)),
    range: zoneRangeAt(zone, p.lat)!,
    exception: exceptionAt({ lat: p.lat, lon }),
  };
}

/** Practice: what a click on the map chooses — the zone at that place and its side of the equator. */
export function cellAt(p: LatLon): { zone: number; hemisphere: Hemisphere } {
  return { zone: utmZoneOf({ lat: p.lat, lon: normLon(p.lon) }), hemisphere: hemisphereOf(p.lat) };
}

/** The demo point carried into another zone: same latitude, same offset from the central
    meridian (so E/N repeat — the same numbers in a different zone are a different place).
    Where an exception makes that spot belong elsewhere, the middle of the zone's range there. */
export function moveToZone(p: LatLon, target: number): LatLon {
  const zone = wrapZone(target);
  const cur = utmZoneOf(p);
  let lat = p.lat;
  let lon = normLon(centralMeridian(zone) + (p.lon - centralMeridian(cur)));
  if (utmZoneOf({ lat, lon }) !== zone) {
    let range = zoneRangeAt(zone, lat);
    if (!range) {
      lat = 71.5; // 32 / 34 / 36 stop at 72°N
      range = zoneRangeAt(zone, lat)!;
    }
    lon = (range.w + range.e) / 2;
  }
  return { lat, lon };
}

/** The demo point carried across the equator: the mirror latitude, same longitude, kept in coverage. */
export function moveToHemisphere(p: LatLon, target: Hemisphere): LatLon {
  if (hemisphereOf(p.lat) === target) return p;
  let lat = -p.lat;
  if (target === 'S' && lat >= 0) lat = -1;
  return { lat: clampLat(lat), lon: p.lon };
}

/* ── Text ────────────────────────────────────────────────────────────────── */

const trim = (v: number, digits: number) => {
  const s = Math.abs(v).toFixed(digits);
  return digits ? s.replace(/\.?0+$/, '') : s;
};
/** "30°E", "6°W", "0°", "180°". */
export const fmtLon = (v: number, digits = 0) => {
  const l = Math.abs(v) >= 180 ? 180 : v;
  const t = trim(l, digits);
  return t === '0' || t === '180' ? `${t}°` : `${t}°${l > 0 ? 'E' : 'W'}`;
};
/** "32°N", "33.9°S", "0°". */
export const fmtLat = (v: number, digits = 0) => {
  const t = trim(v, digits);
  return t === '0' ? '0°' : `${t}°${v > 0 ? 'N' : 'S'}`;
};
export const fmtRange = (r: { w: number; e: number }) => `${fmtLon(r.w)} – ${fmtLon(r.e)}`;
export const HEMI_NAME: Record<Hemisphere, string> = { N: 'צפוני', S: 'דרומי' };

/* ── The points the page offers ──────────────────────────────────────────── */

export type Place = { id: string; name: string; lat: number; lon: number };

/** Opening state (brief): 33°E, 32°N — zone 36 (30°E–36°E), north, on the central meridian. */
export const OPENING: Place = { id: 'start', name: 'בים התיכון', lat: 32, lon: 33 };

/** "נסו נקודה אחרת" walks this list, then back to the opening. Each changes something that
    matters — same zone, next zone, the south, west of Greenwich, the far west, the
    equator, an exception. Every point is checked in scripts/qa/utm-atlas.test.mjs against PROJ. */
export const PRESETS: readonly Place[] = [
  { id: 'jerusalem', name: 'ירושלים', lat: 31.78, lon: 35.22 },
  { id: 'istanbul', name: 'איסטנבול', lat: 41.01, lon: 28.98 },
  { id: 'cape-town', name: 'קייפטאון', lat: -33.92, lon: 18.42 },
  { id: 'madrid', name: 'מדריד', lat: 40.42, lon: -3.7 },
  { id: 'rio', name: 'ריו דה ז׳ניירו', lat: -22.91, lon: -43.17 },
  { id: 'singapore', name: 'סינגפור', lat: 1.29, lon: 103.85 },
  { id: 'bergen', name: 'ברגן, נורווגיה', lat: 60.39, lon: 5.32 },
];

/** "מצאו את גריניץ׳": the zone whose WESTERN boundary is 0°. */
export const GREENWICH_ZONE = 31;

/** Transfer practice: new points; the learner picks zone and hemisphere before the reveal. */
export const TRANSFER: readonly Place[] = [
  { id: 'tokyo', name: 'טוקיו', lat: 35.68, lon: 139.69 },
  { id: 'buenos-aires', name: 'בואנוס איירס', lat: -34.6, lon: -58.38 },
  { id: 'nairobi', name: 'ניירובי', lat: -1.29, lon: 36.82 },
];

/** Signed step from zone a to zone b the short way round (−30…30). */
export function zoneStep(a: number, b: number) {
  let d = (b - a) % ZONE_COUNT;
  if (d > ZONE_COUNT / 2) d -= ZONE_COUNT;
  if (d < -ZONE_COUNT / 2) d += ZONE_COUNT;
  return d;
}
