import * as THREE from 'three';

/**
 * The drive lab's route network: a graded dirt track shaped like the Greek
 * letter θ. A ring road loops around the tile, and a straight-ish spine
 * crosses it straight through the spawn point. The spine is aligned with
 * the vehicle's spawn heading (+Z), so the first thing the driver sees is
 * the track running ahead to a junction with the ring. The layout is the same
 * on every soil, so runs across terrains stay comparable. Only how deeply the
 * track is cut into the ground changes per soil (terrainConfigs.ts →
 * `height.route`).
 *
 * Coordinates are world (x, z) metres. The vehicle spawns at the origin
 * driving toward +Z; seen from the spawn view, +X is on the left.
 */

/** Half-width (m) of the drivable track bed — vehicle track 1.55 m + margin. */
export const ROUTE_HALF_WIDTH = 2.3;
/** Width (m) of the shoulder over which the graded bed blends back into natural ground. */
export const ROUTE_SHOULDER = 3.4;
/** Lateral offset (m) of the two wheel ruts from the centreline (= TRACK / 2). */
export const ROUTE_RUT_OFFSET = 0.78;
/** Max inward/outward wander (m) of the shoulder edge, so cut banks aren't ruler-straight. */
export const ROUTE_EDGE_WOBBLE = 0.5;

// Deliberately irregular (it bulges out on the left and ahead-right, and
// pinches in behind-right), so the loop reads as a track that found its way
// around the landforms, not as a stamped circle.
const RING: Array<[number, number]> = [
  [0, 15.5],
  [7.5, 15.5],
  [13.5, 11],
  [16.8, 3],
  [14.2, -5.5],
  [9.5, -11.5],
  [0, -15],
  [-6.5, -15.8],
  [-11.5, -10.5],
  [-12.5, -3],
  [-16.5, 4],
  [-13, 11.5],
  [-6.5, 15],
];

// Ends exactly on ring control points so the T-junctions meet cleanly; the
// short straight through (0, ±3) keeps the track aligned with the spawn heading.
const SPINE: Array<[number, number]> = [
  [0, -15],
  [0.5, -9.5],
  [0, -3],
  [0, 3],
  [-1.8, 9.5],
  [0, 15.5],
];

const SAMPLE_SPACING = 0.5;
const GRID_CELL = 2;
const GRID_HALF = 26;

type Polyline = { xs: Float32Array; zs: Float32Array };

function samplePolyline(points: Array<[number, number]>, closed: boolean): Polyline {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    closed,
    'centripetal',
  );
  const segments = Math.max(8, Math.round(curve.getLength() / SAMPLE_SPACING));
  const pts = curve.getSpacedPoints(segments);
  const xs = new Float32Array(pts.length);
  const zs = new Float32Array(pts.length);
  pts.forEach((p, i) => {
    xs[i] = p.x;
    zs[i] = p.z;
  });
  return { xs, zs };
}

/** Nearest point on one polyline; reused between queries to keep the hot path allocation-free. */
export type RouteHit = { dist: number; line: number; seg: number; t: number };

/** A per-polyline-vertex scalar (e.g. graded bed height), interpolated by `RouteNetwork.interpolate`. */
export type RouteProfile = Float32Array[];

/**
 * Polyline network with a uniform-grid acceleration structure: each grid
 * cell lists only the segments that can be within `influence` of it, so a
 * query costs a handful of segment tests instead of scanning the whole route.
 */
export class RouteNetwork {
  readonly lines: Polyline[];
  readonly influence: number;
  private readonly cells: Int32Array[];
  private readonly gridN: number;

  constructor(lines: Polyline[], influence: number) {
    this.lines = lines;
    this.influence = influence;
    this.gridN = Math.ceil((GRID_HALF * 2) / GRID_CELL);
    const buckets: number[][] = Array.from({ length: this.gridN * this.gridN }, () => []);
    const reach = influence + GRID_CELL * Math.SQRT1_2;

    lines.forEach((line, li) => {
      for (let s = 0; s < line.xs.length - 1; s++) {
        const ax = line.xs[s];
        const az = line.zs[s];
        const bx = line.xs[s + 1];
        const bz = line.zs[s + 1];
        const i0 = this.cellIndex(Math.min(ax, bx) - reach);
        const i1 = this.cellIndex(Math.max(ax, bx) + reach);
        const j0 = this.cellIndex(Math.min(az, bz) - reach);
        const j1 = this.cellIndex(Math.max(az, bz) + reach);
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const cx = -GRID_HALF + (i + 0.5) * GRID_CELL;
            const cz = -GRID_HALF + (j + 0.5) * GRID_CELL;
            if (segmentDistance(cx, cz, ax, az, bx, bz).dist <= reach) buckets[j * this.gridN + i].push(li, s);
          }
        }
      }
    });
    this.cells = buckets.map((b) => Int32Array.from(b));
  }

  private cellIndex(v: number): number {
    return THREE.MathUtils.clamp(Math.floor((v + GRID_HALF) / GRID_CELL), 0, this.gridN - 1);
  }

  /** One reusable hit slot per polyline, for `query`. */
  createHits(): RouteHit[] {
    return this.lines.map((_, line) => ({ dist: Infinity, line, seg: 0, t: 0 }));
  }

  /**
   * Nearest centreline point on each polyline within `influence` (lines out
   * of range get `dist = Infinity`). Returns the index of the overall nearest
   * line, or -1 when the point is off-route. Per-line results let callers
   * blend where lines meet instead of switching abruptly between them.
   */
  query(x: number, z: number, hits: RouteHit[]): number {
    for (const h of hits) h.dist = Infinity;
    if (Math.abs(x) >= GRID_HALF || Math.abs(z) >= GRID_HALF) return -1;
    const cell = this.cells[this.cellIndex(z) * this.gridN + this.cellIndex(x)];
    let nearest = -1;
    for (let k = 0; k < cell.length; k += 2) {
      const li = cell[k];
      const s = cell[k + 1];
      const line = this.lines[li];
      const r = segmentDistance(x, z, line.xs[s], line.zs[s], line.xs[s + 1], line.zs[s + 1]);
      const hit = hits[li];
      if (r.dist < this.influence && r.dist < hit.dist) {
        hit.dist = r.dist;
        hit.seg = s;
        hit.t = r.t;
        if (nearest < 0 || r.dist < hits[nearest].dist) nearest = li;
      }
    }
    return nearest;
  }

  /** Evaluates `fn` at every centreline vertex (e.g. a soil's smoothed bed height). */
  sampleAlong(fn: (x: number, z: number) => number): RouteProfile {
    return this.lines.map((line) => Float32Array.from(line.xs, (x, i) => fn(x, line.zs[i])));
  }

  interpolate(profile: RouteProfile, hit: RouteHit): number {
    const p = profile[hit.line];
    return p[hit.seg] + (p[hit.seg + 1] - p[hit.seg]) * hit.t;
  }
}

const _seg = { dist: 0, t: 0 };

function segmentDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? THREE.MathUtils.clamp(((px - ax) * dx + (pz - az) * dz) / len2, 0, 1) : 0;
  const ex = ax + dx * t - px;
  const ez = az + dz * t - pz;
  _seg.dist = Math.sqrt(ex * ex + ez * ez);
  _seg.t = t;
  return _seg;
}

/** Shared by every soil — built once at module load. */
export const DRIVE_ROUTE = new RouteNetwork(
  [samplePolyline(RING, true), samplePolyline(SPINE, false)],
  ROUTE_HALF_WIDTH + ROUTE_SHOULDER + ROUTE_EDGE_WOBBLE,
);

/** 1 on the track bed, easing to 0 across the shoulder. Exposed for later material/decal passes. */
export function routeMaskFromDistance(dist: number): number {
  const t = (dist - ROUTE_HALF_WIDTH) / ROUTE_SHOULDER;
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  return 1 - t * t * (3 - 2 * t);
}
