/* Geometry for the "אותה נקודה, שתי שפות" maps — pure functions, shared by the
   page (ReferenceSystemsLinkedComparison.tsx), the terrain build script and
   scripts/qa/reference-systems.test.mjs.

   Both maps draw in ONE coordinate system: local metres of the base image
   (x east from EXTENT.eMin, y south from EXTENT.nMax), cropped to VIEW. The
   UTM grid is straight in it by construction (the image is registered in UTM);
   the graticule is the same lat/lon lines pushed through toUtm(), so its
   slight tilt is the real grid convergence of this spot in zone 36. */

import { fromUtm, toUtm, toDms, formatDms, type Dms } from './utm';
import {
  EXTENT, VIEW, ZONE, POINTS, TERRAIN, START_POINT, UTM_STEP_M, GRATICULE_STEP_SEC, localX, localY,
  type PointId, type TeachingPoint,
} from './referenceSystems.data';

/** Seconds of arc shown on readings: 0.01″ ≈ 0.3 m, so ϕ/λ describe the point at least as
    finely as the whole-metre E/N beside them (0.1″ would be ≈ 3 m). */
export const SEC_DECIMALS = 2;

/** DMS split into its groups — "31°", "48′", "27.98″", "N" — with formatDms()'s padding. Shown
    joined by no-break spaces, so each group reads on its own and the value never wraps. */
export function dmsParts(d: Dms, secDecimals = SEC_DECIMALS, withHemi = true) {
  const sec = d.sec.toFixed(secDecimals).padStart(secDecimals ? 3 + secDecimals : 2, '0');
  const parts = [`${d.deg}°`, `${String(d.min).padStart(2, '0')}′`, `${sec}″`];
  if (withHemi) parts.push(d.hemi);
  return parts;
}

export const NBSP = ' ';
export const spacedDms = (d: Dms, secDecimals = SEC_DECIMALS, withHemi = true) => dmsParts(d, secDecimals, withHemi).join(NBSP);

export type Reading = {
  point: TeachingPoint;
  x: number;
  y: number;
  lat: number;
  lon: number;
  latDms: Dms;
  lonDms: Dms;
  latText: string;
  lonText: string;
  /** Display form: "31° 48′ 27.98″ N" (no-break spaces between the groups). */
  latShown: string;
  lonShown: string;
  eText: string;
  nText: string;
  zoneText: string;
};

export const zoneText = `${ZONE.zone}${ZONE.hemisphere}`;

export function reading(point: TeachingPoint): Reading {
  const { lat, lon } = fromUtm({ e: point.e, n: point.n }, ZONE);
  const latDms = toDms(lat, 'lat', SEC_DECIMALS);
  const lonDms = toDms(lon, 'lon', SEC_DECIMALS);
  return {
    point,
    x: localX(point.e),
    y: localY(point.n),
    lat,
    lon,
    latDms,
    lonDms,
    latText: formatDms(latDms, SEC_DECIMALS),
    lonText: formatDms(lonDms, SEC_DECIMALS),
    latShown: spacedDms(latDms),
    lonShown: spacedDms(lonDms),
    eText: String(point.e),
    nText: String(point.n),
    zoneText,
  };
}

export const READINGS = Object.fromEntries(POINTS.map((p) => [p.id, reading(p)])) as Record<PointId, Reading>;

/** Fractions (0→1, left→right / top→bottom) of the visible window, for HTML overlays. */
export const fx = (x: number) => (x - VIEW.x) / VIEW.w;
export const fy = (y: number) => (y - VIEW.y) / VIEW.h;
export const pct = (f: number) => `${(f * 100).toFixed(3)}%`;

/* ── UTM grid ─────────────────────────────────────────────────────────── */

export type GridLine = { value: number; at: number };

/** Easting lines (x) and northing lines (y) strictly inside the view. */
export function utmGrid(step = UTM_STEP_M) {
  const eFrom = EXTENT.eMin + VIEW.x;
  const eTo = eFrom + VIEW.w;
  const nTop = EXTENT.nMax - VIEW.y;
  const nBottom = nTop - VIEW.h;
  const eastings: GridLine[] = [];
  for (let e = Math.ceil(eFrom / step) * step; e <= eTo; e += step) if (e > eFrom && e < eTo) eastings.push({ value: e, at: localX(e) });
  const northings: GridLine[] = [];
  for (let n = Math.ceil(nBottom / step) * step; n <= nTop; n += step) if (n > nBottom && n < nTop) northings.push({ value: n, at: localY(n) });
  return { eastings, northings };
}

/* ── Geographic graticule ─────────────────────────────────────────────── */

export type GraticuleLine = {
  /** Whole seconds of arc (signed: + N / E). */
  sec: number;
  /** Polyline in local metres, running past the view on both sides. */
  points: [number, number][];
  /** Where it leaves the view: x at the top edge (meridians) or y at the right edge (parallels). */
  edge: number;
};

const toLocal = (lat: number, lon: number): [number, number] => {
  const { e, n } = toUtm({ lat, lon }, ZONE);
  return [localX(e), localY(n)];
};

/** lat/lon range covered by the view (its corners — the view is far smaller than the zone). */
function viewLatLonRange() {
  const corners = [
    [VIEW.x, VIEW.y],
    [VIEW.x + VIEW.w, VIEW.y],
    [VIEW.x, VIEW.y + VIEW.h],
    [VIEW.x + VIEW.w, VIEW.y + VIEW.h],
  ].map(([x, y]) => fromUtm({ e: EXTENT.eMin + x, n: EXTENT.nMax - y }, ZONE));
  return {
    latMin: Math.min(...corners.map((c) => c.lat)),
    latMax: Math.max(...corners.map((c) => c.lat)),
    lonMin: Math.min(...corners.map((c) => c.lon)),
    lonMax: Math.max(...corners.map((c) => c.lon)),
  };
}

/** Crossing of a polyline with x = c (axis 0) or y = c (axis 1); null if it never crosses. */
function crossing(points: [number, number][], axis: 0 | 1, c: number) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if ((a[axis] - c) * (b[axis] - c) <= 0 && a[axis] !== b[axis]) {
      const t = (c - a[axis]) / (b[axis] - a[axis]);
      return a[1 - axis] + t * (b[1 - axis] - a[1 - axis]);
    }
  }
  return null;
}

export function graticule(stepSec = GRATICULE_STEP_SEC, samples = 24) {
  const r = viewLatLonRange();
  const pad = (stepSec / 3600) * 2;
  const meridians: GraticuleLine[] = [];
  const parallels: GraticuleLine[] = [];

  for (let s = Math.ceil((r.lonMin * 3600) / stepSec) * stepSec; s <= r.lonMax * 3600; s += stepSec) {
    const lon = s / 3600;
    const points = Array.from({ length: samples + 1 }, (_, i) => toLocal(r.latMin - pad + ((r.latMax - r.latMin + 2 * pad) * i) / samples, lon));
    const edge = crossing(points, 1, VIEW.y);
    const bottom = crossing(points, 1, VIEW.y + VIEW.h);
    // keep it only if it runs through the view (top or bottom inside the frame)
    if ((edge !== null && edge > VIEW.x && edge < VIEW.x + VIEW.w) || (bottom !== null && bottom > VIEW.x && bottom < VIEW.x + VIEW.w)) {
      meridians.push({ sec: s, points, edge: edge ?? NaN });
    }
  }
  for (let s = Math.ceil((r.latMin * 3600) / stepSec) * stepSec; s <= r.latMax * 3600; s += stepSec) {
    const lat = s / 3600;
    const points = Array.from({ length: samples + 1 }, (_, i) => toLocal(lat, r.lonMin - pad + ((r.lonMax - r.lonMin + 2 * pad) * i) / samples));
    const edge = crossing(points, 0, VIEW.x + VIEW.w);
    const west = crossing(points, 0, VIEW.x);
    if ((edge !== null && edge > VIEW.y && edge < VIEW.y + VIEW.h) || (west !== null && west > VIEW.y && west < VIEW.y + VIEW.h)) {
      parallels.push({ sec: s, points, edge: edge ?? NaN });
    }
  }
  return { meridians, parallels };
}

/* ── North arrow ──────────────────────────────────────────────────────────
   Both maps sit on the same UTM-registered base, where "up" is grid north. The
   arrow is marked plain "N", so it shows TRUE north: the on-screen direction of
   a short step north along the local meridian, i.e. the same lean as the
   graticule (≈ −1.1° here, east of the 33°E central meridian). Measured at the
   view centre; across the 2 × 1.6 km view it changes by < 0.01°. */
export function trueNorthDeg(x = VIEW.x + VIEW.w / 2, y = VIEW.y + VIEW.h / 2) {
  const { lat, lon } = fromUtm({ e: EXTENT.eMin + x, n: EXTENT.nMax - y }, ZONE);
  const [nx, ny] = toLocal(lat + 1 / 3600, lon); // 1″ north ≈ 31 m
  // clockwise from screen-up (CSS rotate); y grows downward
  return (Math.atan2(nx - x, y - ny) * 180) / Math.PI;
}

export const TRUE_NORTH_DEG = trueNorthDeg();

/** Graticule label: whole seconds, no hemisphere letter (the readings carry it). */
export const graticuleLabel = (sec: number, axis: 'lat' | 'lon') => spacedDms(toDms(sec / 3600, axis, 0), 0, false);

export const polylinePoints = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/* ── Reading lines ───────────────────────────────────────────────────────
   The two coordinate lines through the chosen point, in the map's local metres:
   UTM — the constant-easting and constant-northing lines (straight: the base is
   registered in UTM); geographic — the meridian and the parallel of the point,
   pushed through toUtm() like the graticule, so they lean exactly as it does.
   The point itself is a vertex of both. `top` / `right` are where the first
   line leaves the top edge and the second the right edge — where the frame
   carries the chosen value. */

export type ReadingLines = {
  /** Constant longitude (geo) / constant easting (UTM): runs top → bottom. */
  along: [number, number][];
  /** Constant latitude (geo) / constant northing (UTM): runs left → right. */
  across: [number, number][];
  top: number;
  right: number;
};

export function readingLines(id: PointId, kind: 'geo' | 'utm', half = 24): ReadingLines {
  const r = READINGS[id];
  if (kind === 'utm') {
    const along: [number, number][] = [[r.x, VIEW.y - 50], [r.x, r.y], [r.x, VIEW.y + VIEW.h + 50]];
    const across: [number, number][] = [[VIEW.x - 50, r.y], [r.x, r.y], [VIEW.x + VIEW.w + 50, r.y]];
    return { along, across, top: r.x, right: r.y };
  }
  // samples symmetric about the point (k = 0 is the point), reaching 1.2 view spans each way
  const span = viewLatLonRange();
  const dLat = (span.latMax - span.latMin) / 20;
  const dLon = (span.lonMax - span.lonMin) / 20;
  const ks = Array.from({ length: 2 * half + 1 }, (_, i) => i - half);
  const along = ks.map((k) => toLocal(r.lat + k * dLat, r.lon));
  const across = ks.map((k) => toLocal(r.lat, r.lon + k * dLon));
  return { along, across, top: crossing(along, 1, VIEW.y) ?? r.x, right: crossing(across, 0, VIEW.x + VIEW.w) ?? r.y };
}

/* ── What the explanation panel shows ──────────────────────────────────── */

/** Full UTM values, grouped by thousands with no-break spaces: 3521095 → "3 521 095". */
export const groupThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

/** Grid difference of a point from the reference point (the bridge), from the stored E/N. */
export function gridOffset(id: PointId, from: PointId = START_POINT) {
  const a = READINGS[from].point;
  const b = READINGS[id].point;
  return { dE: b.e - a.e, dN: b.n - a.n };
}

/** Seconds as a fraction of the 0″–60″ bar. */
export const secondsFraction = (d: Dms) => d.sec / 60;

/** A light outline of the feature a point marks, drawn from the terrain's own geometry
    (local metres): the bridge deck, the ridge crest around the summit, the village. */
export type FeatureOutline = { kind: 'line'; points: [number, number][]; closed: boolean } | { kind: 'ring'; cx: number; cy: number; r: number };

export function featureOutline(id: PointId): FeatureOutline {
  if (id === 'A') {
    const [[x1, y1], [x2, y2]] = [TERRAIN.bridge.from, TERRAIN.bridge.to];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const u = [(x2 - x1) / len, (y2 - y1) / len];
    const n = [-u[1], u[0]];
    const [cx, cy] = [(x1 + x2) / 2, (y1 + y2) / 2];
    const L = len / 2 + 22;
    const W = TERRAIN.bridge.width / 2 + 20;
    const corner = (a: number, b: number): [number, number] => [cx + u[0] * L * a + n[0] * W * b, cy + u[1] * L * a + n[1] * W * b];
    return { kind: 'line', points: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], closed: true };
  }
  if (id === 'B') return { kind: 'line', points: TERRAIN.ridge.crest.slice(1, 4) as [number, number][], closed: false };
  const [cx, cy] = TERRAIN.village.center;
  return { kind: 'ring', cx, cy, r: 150 };
}

/* ── Edge labels: which ones fit ──────────────────────────────────────────
   Labels sit on the top edge (eastings / meridians) and the right edge
   (northings / parallels). The north arrow owns the top-left corner and the
   scale bar the bottom-left, so labels whose centre falls in those bands are
   dropped rather than overlapped. The top band starts at 0.2 so each edge
   carries three labels at most — the exact values are in the readings. */
export const LABEL_BANDS = {
  top: { from: 0.2, to: 0.9 },
  right: { from: 0.1, to: 0.86 },
} as const;

export const topLabelFits = (x: number) => fx(x) >= LABEL_BANDS.top.from && fx(x) <= LABEL_BANDS.top.to;
export const rightLabelFits = (y: number) => fy(y) >= LABEL_BANDS.right.from && fy(y) <= LABEL_BANDS.right.to;
