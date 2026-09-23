import type { ElevationGridData, Point, TerrainArea } from '../../../data/types';

/**
 * elevation.ts — פענוח רשת הגבהים ודגימה לאורך קו.
 *
 * הקושי הקוגניטיבי המרכזי בקווי גובה הוא התרגום מדו-ממד לתלת-ממד: הלומד רואה
 * טבעות ולא יודע אם הן עולות או יורדות. חתך גובה פותר את זה ישירות — הוא
 * מציג בדיוק את מה שהעין לא רואה במפה.
 */

export interface ElevationGrid {
  size: number;
  min: number;
  max: number;
  groundWidthM: number;
  /** גובה במטרים בנקודה במרחב ה-viewBox (0..1000), עם אינטרפולציה בילינארית. */
  at(x: number, y: number): number;
}

function decode(payload: ElevationGridData): ElevationGrid {
  const { size, min, span, groundWidthM } = payload;
  const bytes = base64ToBytes(payload.data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const values = new Float32Array(size * size);
  for (let i = 0; i < values.length; i++) {
    values[i] = min + (view.getUint16(i * 2, true) / 65535) * span;
  }

  const clamp = (v: number) => Math.max(0, Math.min(size - 1, v));
  return {
    size,
    min,
    max: min + span,
    groundWidthM,
    /* אינטרפולציה ולא "התא הקרוב": דגימה לפי התא הקרוב מייצרת גרף מדורג
       שנראה כמו מדרגות בשטח — ארטיפקט של הרשת, לא של הקרקע. */
    at(x, y) {
      const fx = clamp((x / 1000) * (size - 1));
      const fy = clamp((y / 1000) * (size - 1));
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(size - 1, x0 + 1);
      const y1 = Math.min(size - 1, y0 + 1);
      const tx = fx - x0;
      const ty = fy - y0;
      return (
        values[y0 * size + x0] * (1 - tx) * (1 - ty) +
        values[y0 * size + x1] * tx * (1 - ty) +
        values[y1 * size + x0] * (1 - tx) * ty +
        values[y1 * size + x1] * tx * ty
      );
    },
  };
}

/** מפענח base64 ידנית — `atob` אינו קיים בכל סביבת SSR, ו-`Buffer` אינו קיים בדפדפן. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const clean = b64.replace(/=+$/, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (const ch of clean) {
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

const cache = new Map<string, Promise<ElevationGrid | null>>();

/**
 * טעינה עצלה של רשת האזור.
 * מחזיר `null` כשאין רשת — כלי החתך פשוט לא יוצע, במקום להפיל את הרכיב.
 */
export function loadElevation(areaId: string): Promise<ElevationGrid | null> {
  let hit = cache.get(areaId);
  if (!hit) {
    hit = import(`../../../data/elevation/${areaId}.ts`)
      .then((m: { default: ElevationGridData }) => decode(m.default))
      .catch(() => null);
    cache.set(areaId, hit);
  }
  return hit;
}

export interface ProfileSample {
  /** מרחק מתחילת החתך, במטרים. */
  d: number;
  elev: number;
  /** הנקודה במרחב ה-viewBox — לקישור דו-כיווני בין הגרף למפה. */
  at: Point;
}

export interface ProfileResult {
  samples: ProfileSample[];
  lengthM: number;
  min: number;
  max: number;
}

/** דוגם את הגובה לאורך הקו a→b. */
export function sampleLine(grid: ElevationGrid, a: Point, b: Point, steps = 160): ProfileResult {
  const lengthM = (Math.hypot(b.x - a.x, b.y - a.y) / 1000) * grid.groundWidthM;
  const samples: ProfileSample[] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const at = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const elev = grid.at(at.x, at.y);
    if (elev < min) min = elev;
    if (elev > max) max = elev;
    samples.push({ d: t * lengthM, elev, at });
  }
  return { samples, lengthM, min, max };
}

/**
 * החתך האופייני של צורה: קו שחוצה אותה בניצב לציר שלה.
 *
 * הכיוון נגזר מהגאומטריה של הצורה עצמה — קו שנחתך לאורך רכס מראה גב שטוח
 * ולא מלמד דבר, בעוד שהחתך **בניצב** לרכס הוא בדיוק הצורה שהלומד צריך
 * לזהות. הציר מוערך מפיזור נקודות ה-`hitPath`.
 */
export function typicalCut(hitPath: string, center: Point, halfSpan = 110): [Point, Point] {
  const pts = parsePoints(hitPath);
  if (pts.length < 3) {
    return [
      { x: center.x - halfSpan, y: center.y },
      { x: center.x + halfSpan, y: center.y },
    ];
  }
  // ציר עיקרי לפי מטריצת השונות — הכיוון שבו הצורה מוארכת
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pts) {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  // הניצב לציר העיקרי
  const nx = -Math.sin(theta);
  const ny = Math.cos(theta);
  const clamp = (v: number) => Math.max(10, Math.min(990, v));
  return [
    { x: clamp(center.x - nx * halfSpan), y: clamp(center.y - ny * halfSpan) },
    { x: clamp(center.x + nx * halfSpan), y: clamp(center.y + ny * halfSpan) },
  ];
}

/** מחלץ את הקואורדינטות מנתיב SVG. די בהן להערכת הציר — אין צורך בפענוח מלא. */
function parsePoints(d: string): Point[] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return [];
  const out: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
  }
  return out;
}

/** מרכז הצורה לפי נקודות הנתיב, לצורך מיקום החתך האופייני. */
export function pathCenter(hitPath: string, fallback: Point): Point {
  const pts = parsePoints(hitPath);
  if (!pts.length) return fallback;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  return { x: sx / pts.length, y: sy / pts.length };
}

/** קנה המידה האנכי של הגרף. תבליט של 2 מ׳ ותבליט של 500 מ׳ צריכים שניהם למלא. */
export function niceRange(min: number, max: number): [number, number] {
  const span = Math.max(1, max - min);
  const pad = span * 0.12;
  const step = span > 200 ? 50 : span > 60 ? 20 : span > 20 ? 5 : span > 6 ? 2 : 0.5;
  return [Math.floor((min - pad) / step) * step, Math.ceil((max + pad) / step) * step];
}

export function areaHasElevation(area: TerrainArea): boolean {
  return Boolean(area.groundWidthM);
}
