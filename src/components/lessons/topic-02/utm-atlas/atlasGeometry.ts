/* ─────────── אטלס הפלחים — map windows, the zone grid, basemap decoding ───────────
   Pure functions shared by the page (UtmZoneAtlas.tsx and its maps) and
   scripts/qa/utm-atlas.test.mjs.

   Both maps are EQUIRECTANGULAR windows in degrees, north up, east right —
   never mirrored for RTL. A window has a centre (lon0, lat0) and a size in
   degrees (w, h). Its frame has a fixed aspect, so h = w · cos(lat0) / aspect:
   the standard parallel is the window's own centre line, and shapes there are
   true. The world locator map is the same projection over the whole globe
   (standard parallel set by its frame's aspect). It is a map for FINDING a
   zone — not a UTM map of the world.

   The local grid is the real UTM grid of one zone: each line of constant E or
   N is traced back to lat/lon with fromUtm(), so it bends and converges as the
   true grid does on this kind of map. */

import { fromUtm, toUtm } from '../reference-systems/utm';
import { NORTH_LIMIT, SOUTH_LIMIT, centralMeridian, normLon, zoneRangeAt, type Hemisphere } from './utmAtlas';

const RAD = Math.PI / 180;

/** Width / height of both map frames. */
export const FRAME_ASPECT = 1.5;

export type View = { lon0: number; lat0: number; w: number; h: number };

export const WORLD_VIEW: View = { lon0: 0, lat0: 0, w: 360, h: 180 };

/** A window w degrees wide centred on (lon0, lat), shifted so it never runs past a pole. */
export function regionView(lon0: number, lat: number, w: number, aspect = FRAME_ASPECT): View {
  let lat0 = lat;
  let h = (w * Math.cos(lat0 * RAD)) / aspect;
  for (let i = 0; i < 6; i++) {
    lat0 = Math.max(-90 + h / 2, Math.min(90 - h / 2, lat));
    h = (w * Math.cos(lat0 * RAD)) / aspect;
  }
  return { lon0: normLon(lon0), lat0, w, h };
}

/** The enlargement around a zone at a latitude: 'zones' shows it with both neighbours,
    'grid' just the zone (+1° each side) so 100 km grid squares are large enough to read. */
export function zoneWindow(range: { w: number; e: number }, lat: number, kind: 'zones' | 'grid'): View {
  const width = range.e - range.w;
  return regionView((range.w + range.e) / 2, lat, kind === 'zones' ? 3 * width + 3 : width + 2);
}

export const viewTop = (v: View) => v.lat0 + v.h / 2;
export const viewBottom = (v: View) => v.lat0 - v.h / 2;

/** Fraction 0→1 across the frame (west→east), longitude unwrapped toward the centre. */
export const fracX = (v: View, lon: number) => (normLon(lon - v.lon0) + v.w / 2) / v.w;
/** Fraction 0→1 down the frame (north→south). */
export const fracY = (v: View, lat: number) => (viewTop(v) - lat) / v.h;
export const lonAt = (v: View, fx: number) => normLon(v.lon0 - v.w / 2 + fx * v.w);
export const latAt = (v: View, fy: number) => viewTop(v) - fy * v.h;

/** SVG viewBox in degrees (y = −lat), for paths drawn in degrees. */
export const viewBox = (v: View) => `${v.lon0 - v.w / 2} ${-viewTop(v)} ${v.w} ${v.h}`;

/** Offsets (0, ±360) at which the world must be repeated to fill a window that crosses 180°. */
export function wrapCopies(v: View): number[] {
  const west = v.lon0 - v.w / 2;
  const east = v.lon0 + v.w / 2;
  const out = [0];
  if (west < -180) out.push(-360);
  if (east > 180) out.push(360);
  return out;
}

/** Kilometres per degree of latitude (mean) — for scale bars only. */
export const KM_PER_DEG = 111.2;

/** A round scale-bar length (km) near a quarter of the frame's width. */
export function scaleBarKm(v: View) {
  const frameKm = v.w * KM_PER_DEG * Math.cos(v.lat0 * RAD);
  const target = frameKm / 4;
  const steps = [10, 20, 25, 50, 100, 150, 200, 250, 300, 500, 750, 1000];
  return steps.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
}

/* ── The zone's own grid ─────────────────────────────────────────────────── */

export type GridLine = { kind: 'e' | 'n'; value: number; hemisphere: Hemisphere; runs: [number, number][][] };

/** Grid spacing for a zone window: 100 km where the zone is wide, finer toward the poles. */
export function gridStep(v: View) {
  const zoneKm = 6 * KM_PER_DEG * Math.cos(v.lat0 * RAD);
  return zoneKm >= 380 ? 100000 : zoneKm >= 190 ? 50000 : 20000;
}

const insideZone = (zone: number, lat: number, lon: number) => {
  const r = zoneRangeAt(zone, lat);
  if (!r) return false;
  const l = normLon(lon);
  return l >= r.w - 1e-9 && l <= r.e + 1e-9;
};

/** The latitudes of a window that lie in one hemisphere and in coverage, or null. */
function hemisphereSpan(v: View, h: Hemisphere): [number, number] | null {
  const s = Math.max(viewBottom(v), SOUTH_LIMIT, h === 'N' ? 0 : -90);
  const n = Math.min(viewTop(v), NORTH_LIMIT, h === 'S' ? 0 : 90);
  return s < n ? [s, n] : null;
}

/** Lines of constant E and constant N of `zone`, inside the zone and the window. A window that
    crosses the equator gets both grids: N restarts at 10 000 000 m south of it. */
export function zoneGrid(zone: number, v: View, step = gridStep(v)): GridLine[] {
  const out: GridLine[] = [];
  const cm = centralMeridian(zone);
  for (const hemisphere of ['N', 'S'] as const) {
    const span = hemisphereSpan(v, hemisphere);
    if (!span) continue;
    const z = { zone, hemisphere };
    const [s, n] = span;
    const lats = [s, n, (s + n) / 2];
    const ranges = lats.map((lat) => zoneRangeAt(zone, lat)).filter(Boolean) as { w: number; e: number }[];
    if (!ranges.length) continue;
    const lonW = Math.min(...ranges.map((r) => r.w));
    const lonE = Math.max(...ranges.map((r) => r.e));
    const corners = lats.flatMap((lat) => [lonW, cm, lonE].map((lon) => toUtm({ lat, lon }, z)));
    const eMin = Math.min(...corners.map((c) => c.e));
    const eMax = Math.max(...corners.map((c) => c.e));
    const nMin = Math.min(...corners.map((c) => c.n));
    const nMax = Math.max(...corners.map((c) => c.n));

    const trace = (samples: { e: number; n: number }[]) => {
      const runs: [number, number][][] = [];
      let run: [number, number][] = [];
      for (const en of samples) {
        const { lat, lon } = fromUtm(en, z);
        if (lat >= s - 1e-9 && lat <= n + 1e-9 && insideZone(zone, lat, lon)) run.push([normLon(lon - cm) + cm, lat]);
        else if (run.length) {
          if (run.length > 1) runs.push(run);
          run = [];
        }
      }
      if (run.length > 1) runs.push(run);
      return runs;
    };

    const SAMPLES = 48;
    for (let e = Math.ceil(eMin / step) * step; e <= eMax; e += step) {
      const samples = Array.from({ length: SAMPLES + 1 }, (_, i) => ({ e, n: nMin + ((nMax - nMin) * i) / SAMPLES }));
      const runs = trace(samples);
      if (runs.length) out.push({ kind: 'e', value: e, hemisphere, runs });
    }
    for (let nn = Math.ceil(nMin / step) * step; nn <= nMax; nn += step) {
      const samples = Array.from({ length: SAMPLES + 1 }, (_, i) => ({ e: eMin + ((eMax - eMin) * i) / SAMPLES, n: nn }));
      const runs = trace(samples);
      if (runs.length) out.push({ kind: 'n', value: nn, hemisphere, runs });
    }
  }
  return out;
}

/** Longitude where the line E = e of `zone` crosses latitude `lat` (bisection; E grows eastward). */
export function lonForE(zone: number, hemisphere: Hemisphere, e: number, lat: number) {
  const cm = centralMeridian(zone);
  let lo = cm - 15;
  let hi = cm + 15;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (toUtm({ lat, lon: mid }, { zone, hemisphere }).e < e) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Latitude where the line N = n of `zone` crosses longitude `lon` (bisection; N grows northward). */
export function latForN(zone: number, hemisphere: Hemisphere, n: number, lon: number) {
  let lo = hemisphere === 'N' ? 0 : -90;
  let hi = hemisphere === 'N' ? 90 : 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (toUtm({ lat: mid, lon }, { zone, hemisphere }).n < n) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The point's two reading lines in its own zone: up its line of constant E to the window's top
    edge, and west along its line of constant N to the zone's western boundary. */
export function readingLines(zone: number, hemisphere: Hemisphere, e: number, n: number, v: View) {
  const z = { zone, hemisphere };
  const top = Math.min(viewTop(v), hemisphere === 'S' ? 0 : NORTH_LIMIT);
  const nTop = toUtm({ lat: top, lon: lonForE(zone, hemisphere, e, top) }, z).n;
  const up: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const p = fromUtm({ e, n: n + ((nTop - n) * i) / 24 }, z);
    up.push([p.lon, p.lat]);
  }
  const p0 = fromUtm({ e, n }, z);
  const west = zoneRangeAt(zone, p0.lat)?.w ?? centralMeridian(zone) - 3;
  const eWest = toUtm({ lat: latForN(zone, hemisphere, n, west), lon: west }, z).e;
  const across: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const p = fromUtm({ e: e + ((eWest - e) * i) / 24, n }, z);
    across.push([p.lon, p.lat]);
  }
  return { up, across, westLon: west };
}

/* ── Basemap paths ───────────────────────────────────────────────────────── */

/** Rings of a basemap path ("M x y l dx dy … z", integer units) as [lon, lat] in degrees. */
export function decodeRings(d: string, unit = 100): [number, number][][] {
  const rings: [number, number][][] = [];
  const re = /M(-?\d+) (-?\d+)(?:l([-\d ]+))?z?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    let x = Number(m[1]);
    let y = Number(m[2]);
    const ring: [number, number][] = [[x / unit, -y / unit]];
    if (m[3]) {
      const nums = m[3].match(/-?\d+/g)!.map(Number);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        x += nums[i];
        y += nums[i + 1];
        ring.push([x / unit, -y / unit]);
      }
    }
    rings.push(ring);
  }
  return rings;
}

/** Polyline points attribute in degrees (y = −lat) for a [lon, lat][] run. */
export const svgPoints = (run: [number, number][]) => run.map(([lon, lat]) => `${lon.toFixed(4)},${(-lat).toFixed(4)}`).join(' ');
