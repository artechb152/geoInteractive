// Geometry for the topic-02 scale scenes: WGS84 ↔ Web Mercator ↔ sheet units, true horizontal
// distances, and the reading-precision rules of the design spec (§5).
// Pure module with NO imports — it is loaded by Next and by Node scripts/tests
// (`node --experimental-strip-types`), so keep it free of runtime-only TS syntax (no enums).

export type LatLon = { lat: number; lon: number };
/** Point on a sheet: 0..1000 on both axes, origin at the north-west corner, y grows south. */
export type SheetPoint = { x: number; y: number };
/** EPSG:3857 box [minX, minY, maxX, maxY] in metres. */
export type Box3857 = [number, number, number, number];
export type SheetGeometry = {
  denominator: number;
  center: LatLon;
  groundWidthM: number;
  /** Side of the virtual printed sheet in cm (24 for every sheet). */
  sheetCm: number;
  bbox3857: Box3857;
};

const A = 6378137; // WGS84 semi-major axis = Web Mercator sphere radius
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const RAD = Math.PI / 180;

export const SHEET_UNITS = 1000;

export function toMerc(p: LatLon): [number, number] {
  return [A * p.lon * RAD, A * Math.log(Math.tan(Math.PI / 4 + (p.lat * RAD) / 2))];
}

export function fromMerc(x: number, y: number): LatLon {
  return { lat: (2 * Math.atan(Math.exp(y / A)) - Math.PI / 2) / RAD, lon: x / A / RAD };
}

/** Meridian (M) and prime-vertical (N) radii of curvature on WGS84. */
function radii(latDeg: number) {
  const s = Math.sin(latDeg * RAD);
  const w = 1 - E2 * s * s;
  return { M: (A * (1 - E2)) / Math.pow(w, 1.5), N: A / Math.sqrt(w) };
}

/** Square EPSG:3857 box centred on `center`, east–west ground width `groundWidthM` at the centre latitude. */
export function sheetBox(center: LatLon, groundWidthM: number): Box3857 {
  const { N } = radii(center.lat);
  const half = ((groundWidthM / (N * Math.cos(center.lat * RAD))) * A) / 2;
  const [cx, cy] = toMerc(center);
  return [cx - half, cy - half, cx + half, cy + half];
}

export function lonLatToSheet(sheet: { bbox3857: Box3857 }, p: LatLon): SheetPoint {
  const [x0, y0, x1, y1] = sheet.bbox3857;
  const [mx, my] = toMerc(p);
  return { x: ((mx - x0) / (x1 - x0)) * SHEET_UNITS, y: ((y1 - my) / (y1 - y0)) * SHEET_UNITS };
}

export function sheetToLonLat(sheet: { bbox3857: Box3857 }, q: SheetPoint): LatLon {
  const [x0, y0, x1, y1] = sheet.bbox3857;
  return fromMerc(x0 + (q.x / SHEET_UNITS) * (x1 - x0), y1 - (q.y / SHEET_UNITS) * (y1 - y0));
}

export function insideSheet(q: SheetPoint): boolean {
  return q.x >= 0 && q.x <= SHEET_UNITS && q.y >= 0 && q.y <= SHEET_UNITS;
}

/** Horizontal distance on the WGS84 ellipsoid, local radii at the mid-latitude (error < 1 m below 100 km). */
export function groundDistanceM(a: LatLon, b: LatLon): number {
  const mid = (a.lat + b.lat) / 2;
  const { M, N } = radii(mid);
  const dN = (b.lat - a.lat) * RAD * M;
  const dE = (b.lon - a.lon) * RAD * N * Math.cos(mid * RAD);
  return Math.hypot(dN, dE);
}

/** True when `p` lies within `radiusM` (ground metres) of at least one of `centers`. */
export function nearAny(p: LatLon, centers: readonly LatLon[], radiusM: number): boolean {
  return centers.some((c) => groundDistanceM(p, c) <= radiusM);
}

/** Length on the printed sheet (true scale), in cm. */
export function sheetCm(groundM: number, denominator: number): number {
  return (groundM / denominator) * 100;
}

/** What a careful reader gets from a ruler with millimetre marks. */
export function readCm(cm: number): number {
  return Math.round(cm * 10) / 10;
}

/** One millimetre on the sheet, on the ground. */
export function readingPrecisionM(denominator: number): number {
  return 0.001 * denominator;
}

export function metersPerSheetCm(denominator: number): number {
  return denominator / 100;
}

const nf = (digits: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits });

export function formatNumber(n: number, digits = 0): string {
  return nf(digits).format(n);
}

export function formatRatio(denominator: number): string {
  return `1:${formatNumber(denominator)}`;
}

/** "890 מ׳", "2.8 ק״מ" — rounded to `precisionM` first. */
export function formatDistance(m: number, precisionM = 1): string {
  const r = Math.round(m / precisionM) * precisionM;
  return r >= 1000 ? `${nf(3).format(r / 1000)} ק״מ` : `${nf(0).format(r)} מ׳`;
}

/** Parses a kilometre answer. Accepts "2.8", "2,8" (comma as decimal mark) and surrounding spaces. */
export function parseKm(text: string): number | null {
  const t = text.trim().replace(/\s+/g, '');
  if (!t) return null;
  const n = t.includes('.') ? t.replace(/,/g, '') : t.replace(',', '.');
  if (!/^\d*\.?\d+$/.test(n)) return null;
  return Number(n);
}

export type AnswerKind = 'correct' | 'over-precise' | 'unit' | 'denominator' | 'off' | 'invalid';
export type AnswerResult = { kind: AnswerKind; valueM?: number; factor?: number; otherDenominator?: number };

/**
 * Classifies a typed km answer against `expectedM` (reading × denominator).
 * Tolerance: max(1 mm on the sheet, 1 % of the target). A right value that is not a multiple of the
 * reading precision is accepted as "over-precise" (spec §5: no precision beyond 1 mm on the sheet).
 */
export function classifyAnswer(text: string, expectedM: number, denominator: number, others: readonly number[]): AnswerResult {
  const km = parseKm(text);
  if (km === null) return { kind: 'invalid' };
  const valueM = km * 1000;
  if (km <= 0) return { kind: 'off', valueM };
  const precision = readingPrecisionM(denominator);
  const near = (target: number) => Math.abs(valueM - target) <= Math.max(precision, 0.01 * target);
  if (near(expectedM)) {
    const steps = valueM / precision;
    return { kind: Math.abs(steps - Math.round(steps)) < 1e-6 ? 'correct' : 'over-precise', valueM };
  }
  for (const factor of [10, 100, 1000, 0.1, 0.01, 0.001]) {
    // A slip target finer than 1 mm on the sheet would be swamped by the tolerance (0 → "check units").
    if (expectedM * factor < precision) continue;
    if (near(expectedM * factor)) return { kind: 'unit', valueM, factor };
  }
  for (const other of others) {
    if (other !== denominator && near((expectedM * other) / denominator)) {
      return { kind: 'denominator', valueM, otherDenominator: other };
    }
  }
  return { kind: 'off', valueM };
}

/** Minimum number of sheets of `groundWidthM` that a box around `points` needs (grid aligned to the box). */
export function sheetsNeeded(points: readonly LatLon[], groundWidthM: number): number {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const lat0 = Math.min(...lats);
  const lat1 = Math.max(...lats);
  const mid = (lat0 + lat1) / 2;
  const w = groundDistanceM({ lat: mid, lon: Math.min(...lons) }, { lat: mid, lon: Math.max(...lons) });
  const h = groundDistanceM({ lat: lat0, lon: lons[0] }, { lat: lat1, lon: lons[0] });
  return Math.max(1, Math.ceil(w / groundWidthM)) * Math.max(1, Math.ceil(h / groundWidthM));
}

const NICE = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000];

/** Round scale-bar length closest (in ratio) to `targetPx` on screen. */
export function niceScaleBar(metersPerPx: number, targetPx: number): { meters: number; px: number } {
  const target = metersPerPx * targetPx;
  const meters = NICE.reduce((a, b) => (Math.abs(Math.log(b / target)) < Math.abs(Math.log(a / target)) ? b : a));
  return { meters, px: meters / metersPerPx };
}
