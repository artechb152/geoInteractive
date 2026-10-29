/**
 * One coordinate system for the navigation replay: map units (navTipsGeometry,
 * north up, x east, y south, 25 m per unit) ↔ metres ↔ the three.js world.
 *
 *   World: x = east (m), z = south (m), y = height above sea level (m).
 *   Origin: the centre of the map sheet (map 50, 37.5).
 *   A heading (bearing) is degrees clockwise from north; its unit vector in the
 *   world is (sin az, 0, −cos az).
 *
 * The map is never mirrored: map x grows east, world x grows east.
 */
import { M_PER_UNIT, VB_H, VB_W, type Pt } from '../navTipsGeometry';

export type W2 = { x: number; z: number };

export const MAP_ORIGIN: Pt = { x: VB_W / 2, y: VB_H / 2 };

export const toWorld = (p: Pt): W2 => ({ x: (p.x - MAP_ORIGIN.x) * M_PER_UNIT, z: (p.y - MAP_ORIGIN.y) * M_PER_UNIT });
export const toMap = (w: W2): Pt => ({ x: w.x / M_PER_UNIT + MAP_ORIGIN.x, y: w.z / M_PER_UNIT + MAP_ORIGIN.y });

export const wrapDeg = (d: number) => ((d % 360) + 360) % 360;
/** Bearing a → b in the world, degrees clockwise from north, 0…360. */
export const bearingW = (a: W2, b: W2) => wrapDeg((Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI);
export const distW = (a: W2, b: W2) => Math.hypot(b.x - a.x, b.z - a.z);
export const headingVec = (az: number): W2 => ({ x: Math.sin((az * Math.PI) / 180), z: -Math.cos((az * Math.PI) / 180) });
export const along = (p: W2, az: number, m: number): W2 => {
  const v = headingVec(az);
  return { x: p.x + v.x * m, z: p.z + v.z * m };
};
/** Smallest signed turn from heading a to heading b, degrees (−180…180, + = clockwise). */
export const turnDeg = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

/**
 * Samples an SVG path made of `M` and cubic `C` commands (the form
 * navTipsGeometry uses for the stream and the road) into a polyline.
 */
export function samplePath(d: string, perCurve = 24): Pt[] {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  if (!/^\s*M/.test(d) || (nums.length - 2) % 6 !== 0) throw new Error(`unsupported path: ${d}`);
  const pts: Pt[] = [{ x: nums[0], y: nums[1] }];
  for (let i = 2; i < nums.length; i += 6) {
    const p0 = pts[pts.length - 1];
    const [x1, y1, x2, y2, x3, y3] = nums.slice(i, i + 6);
    for (let k = 1; k <= perCurve; k++) {
      const t = k / perCurve;
      const u = 1 - t;
      pts.push({
        x: u * u * u * p0.x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        y: u * u * u * p0.y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      });
    }
  }
  return pts;
}

/** A polyline in world metres with its cumulative length, for distance and arc-length queries. */
export type Polyline = { pts: W2[]; cum: number[]; length: number };

export function polyline(pts: W2[]): Polyline {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + distW(pts[i - 1], pts[i]));
  return { pts, cum, length: cum[cum.length - 1] };
}

/** Continues a polyline straight past both ends by `m` metres (paths leave the sheet, the ground does not). */
export function extendEnds(pl: W2[], m: number): W2[] {
  const n = pl.length;
  const a = pl[0];
  const a1 = pl[Math.min(3, n - 1)];
  const b = pl[n - 1];
  const b1 = pl[Math.max(0, n - 4)];
  const da = distW(a, a1) || 1;
  const db = distW(b, b1) || 1;
  const steps = Math.ceil(m / 60);
  const head: W2[] = [];
  const tail: W2[] = [];
  for (let k = steps; k >= 1; k--) head.push({ x: a.x + ((a.x - a1.x) / da) * (m * k) / steps, z: a.z + ((a.z - a1.z) / da) * (m * k) / steps });
  for (let k = 1; k <= steps; k++) tail.push({ x: b.x + ((b.x - b1.x) / db) * (m * k) / steps, z: b.z + ((b.z - b1.z) / db) * (m * k) / steps });
  return [...head, ...pl, ...tail];
}

/** Closest point of a polyline: distance (m), arc length at it (m). Brute force — use PolyIndex for many queries. */
export function nearestOn(pl: Polyline, p: W2, segs?: Iterable<number>): { d: number; s: number } {
  let best = Infinity;
  let bestS = 0;
  const check = (i: number) => {
    const a = pl.pts[i];
    const b = pl.pts[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const L2 = vx * vx + vz * vz || 1;
    let t = ((p.x - a.x) * vx + (p.z - a.z) * vz) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = a.x + vx * t - p.x;
    const dz = a.z + vz * t - p.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) {
      best = d2;
      bestS = pl.cum[i] + t * (pl.cum[i + 1] - pl.cum[i]);
    }
  };
  if (segs) for (const i of segs) check(i);
  else for (let i = 0; i < pl.pts.length - 1; i++) check(i);
  return { d: Math.sqrt(best), s: bestS };
}

/**
 * A bucket grid over a polyline's segments, so distance queries within
 * `radius` only test the few segments nearby. Beyond `radius` it answers
 * `{ d: radius }` (callers treat that as "far").
 */
export class PolyIndex {
  private cells = new Map<number, number[]>();
  readonly pl: Polyline;
  readonly radius: number;
  private readonly cell: number;
  constructor(pl: Polyline, radius: number, cell = 64) {
    this.pl = pl;
    this.radius = radius;
    this.cell = cell;
    for (let i = 0; i < pl.pts.length - 1; i++) {
      const a = pl.pts[i];
      const b = pl.pts[i + 1];
      const x0 = Math.floor((Math.min(a.x, b.x) - radius) / cell);
      const x1 = Math.floor((Math.max(a.x, b.x) + radius) / cell);
      const z0 = Math.floor((Math.min(a.z, b.z) - radius) / cell);
      const z1 = Math.floor((Math.max(a.z, b.z) + radius) / cell);
      for (let cx = x0; cx <= x1; cx++)
        for (let cz = z0; cz <= z1; cz++) {
          const k = cx * 100003 + cz;
          const list = this.cells.get(k);
          if (list) list.push(i);
          else this.cells.set(k, [i]);
        }
    }
  }
  query(p: W2): { d: number; s: number } {
    const list = this.cells.get(Math.floor(p.x / this.cell) * 100003 + Math.floor(p.z / this.cell));
    if (!list) return { d: this.radius, s: 0 };
    const r = nearestOn(this.pl, p, list);
    return r.d > this.radius ? { d: this.radius, s: r.s } : r;
  }
}
