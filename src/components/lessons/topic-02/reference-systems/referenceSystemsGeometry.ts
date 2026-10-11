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
  EXTENT, VIEW, ZONE, POINTS, UTM_STEP_M, GRATICULE_STEP_SEC, localX, localY,
  type PointId, type TeachingPoint,
} from './referenceSystems.data';

/** Seconds of arc shown on readings: 0.01″ ≈ 0.3 m, so ϕ/λ describe the point at least as
    finely as the whole-metre E/N beside them (0.1″ would be ≈ 3 m). */
export const SEC_DECIMALS = 2;

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

/** Graticule label: whole seconds, no hemisphere letter (the readings carry it). */
export const graticuleLabel = (sec: number, axis: 'lat' | 'lon') => formatDms(toDms(sec / 3600, axis, 0), 0, false);

export const polylinePoints = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/* ── Edge labels: which ones fit ──────────────────────────────────────────
   Labels sit on the top edge (eastings / meridians) and the right edge
   (northings / parallels). The north arrow owns the top-left corner, the
   scale bar the bottom-left and the zone tag the bottom-right, so labels
   whose centre falls in those bands are dropped rather than overlapped. */
export const LABEL_BANDS = {
  top: { from: 0.14, to: 0.9 },
  right: { from: 0.1, to: 0.86 },
} as const;

export const topLabelFits = (x: number) => fx(x) >= LABEL_BANDS.top.from && fx(x) <= LABEL_BANDS.top.to;
export const rightLabelFits = (y: number) => fy(y) >= LABEL_BANDS.right.from && fy(y) <= LABEL_BANDS.right.to;
