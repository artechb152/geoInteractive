/* ─────────────── דאטום — the linked close-up, as data ───────────────
   The close-up is a local section of the exercise wall around the
   inspection point: the geoid and the posed ellipse there, built as two
   lit bands (DatumInset3D) or, without WebGL, drawn in SVG (GapInset). Both
   — and the gap arrow over them — use the view computed here, so the arrow
   always sits on the two measured points.

   Plane coordinates are the globe's display coordinates of the wall
   (section units, y up, the vertical stretched by DISPLAY_K) — the close-up
   shows the wall exactly as the globe does. The measured pair is the one
   fitError uses: a geoid point and the posed-ellipse point on the ray from
   the ellipse centre through it; the display map is affine, so that ray
   stays a straight segment. The window grows with the gap so both points are
   always inside; the bands' width and depth are illustration only (a fixed
   size on screen) and never move the measured points.

   Pure TS (no three, no React): shared by the 3-D pass, the SVG and the tests. */

import { DISPLAY_K, ELL, GC, ellipsePointToward, geoidAt, type Pose, type Vec3 } from './datumGeometry';

export type V2 = { x: number; y: number };

/** SVG section point → the wall's display plane (y up). */
export const toPlane = (q: V2): V2 => ({ x: q.x - GC.x, y: -(q.y - GC.y) * DISPLAY_K });

/** Look of the close-up, in screen pixels (illustration only). */
export const INSET_BAND = {
  /** Half-width of each band across the curve. */
  half: { geoid: 6.4, ellipsoid: 5.8 },
  /** Depth of each band behind the section (its illustrative thickness). */
  depth: 14,
  /** The soft shadow: offset away from the key light, extra spread. */
  shadow: { dx: 4.6, dy: -6.2, spread: 6 },
  /** The marked local arc: half-width of its underlay (it shows around the band, which with its depth spans ≈ 6 + 5 px). */
  arc: 15,
  /** Camera tilt toward the outside of the curve (radians): shows a sliver of each band's surface going back. */
  tilt: 0.36,
} as const;

/** Below this gap (plane units) the two surfaces meet: no arrow is drawn. */
export const GAP_MIN = 3;

export type InsetView = {
  size: number;
  /** window centre and half-size (plane units), pixels per plane unit */
  c: V2;
  rho: number;
  ppu: number;
  /** the measured pair (plane units) and the gap between them */
  q: V2;
  e: V2;
  gap: number;
  /** camera axes (plane coordinates, z toward the viewer) */
  right: Vec3;
  up: Vec3;
  dir: Vec3;
};

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function insetView(pose: Pose, inspect: number, size: number): InsetView {
  const q0 = geoidAt(inspect);
  const q = toPlane(q0);
  const e = toPlane(ellipsePointToward(pose, q0));
  const gap = Math.hypot(q.x - e.x, q.y - e.y);
  // both points inside, with a margin that grows with the gap
  const rho = Math.max(18, gap / 2 + Math.max(15, 0.28 * (gap / 2)));
  const c = { x: (q.x + e.x) / 2, y: (q.y + e.y) / 2 };
  // tilt toward the outside of the section at the inspection point (radially, from the centre)
  const nl = Math.hypot(q.x, q.y) || 1;
  const t = INSET_BAND.tilt;
  const dir = norm([(Math.sin(t) * q.x) / nl, (Math.sin(t) * q.y) / nl, Math.cos(t)]);
  const right = norm(cross([0, 1, 0], dir));
  const up = cross(dir, right);
  return { size, c, rho, ppu: size / 2 / rho, q, e, gap, right, up, dir };
}

/** A plane point (z toward the viewer) → close-up pixels (x right, y down). */
export function insetPx(v: InsetView, p: Vec3): V2 {
  const d: Vec3 = [p[0] - v.c.x, p[1] - v.c.y, p[2]];
  return {
    x: v.size / 2 + v.ppu * (d[0] * v.right[0] + d[1] * v.right[1] + d[2] * v.right[2]),
    y: v.size / 2 - v.ppu * (d[0] * v.up[0] + d[1] * v.up[1] + d[2] * v.up[2]),
  };
}

/* ─────────────── the two curves around the window ─────────────── */

/** The geoid on the wall, by section angle t. */
export const geoidPlane = (t: number) => toPlane(geoidAt(t));

/** The posed ellipse on the wall, by its parametric angle. */
export function ellipsePlane(p: Pose, phi: number): V2 {
  const a = (p.rot * Math.PI) / 180;
  const lx = ELL.rx * p.s * Math.cos(phi);
  const ly = ELL.ry * p.s * Math.sin(phi);
  return toPlane({ x: GC.x + p.dx + lx * Math.cos(a) - ly * Math.sin(a), y: GC.y + p.dy + lx * Math.sin(a) + ly * Math.cos(a) });
}

/** Parametric angle of the measured ellipse point (where the band is centred). */
export function ellipsePhiAt(p: Pose, inspect: number) {
  const e = ellipsePointToward(p, geoidAt(inspect));
  const a = (p.rot * Math.PI) / 180;
  const vx = e.x - (GC.x + p.dx);
  const vy = e.y - (GC.y + p.dy);
  const lx = vx * Math.cos(a) + vy * Math.sin(a);
  const ly = -vx * Math.sin(a) + vy * Math.cos(a);
  return Math.atan2(ly / (ELL.ry * p.s), lx / (ELL.rx * p.s));
}

/** Plane centre of the posed ellipse (its bands' outward side faces away from it). */
export const ellipseCentrePlane = (p: Pose) => toPlane({ x: GC.x + p.dx, y: GC.y + p.dy });

/**
 * The part of a closed curve f(s) that crosses the window, as `n` samples
 * (x, y, nx, ny) with outward unit normals: walk from s0 both ways until
 * the curve leaves a circle of 1.3·rho around the window centre (or the
 * whole loop is taken), then sample evenly in s.
 */
export function curveRun(f: (s: number) => V2, s0: number, centre: V2, v: InsetView, n: number, out: Float32Array) {
  const R = 1.3 * v.rho;
  const inside = (s: number) => {
    const p = f(s);
    return Math.hypot(p.x - v.c.x, p.y - v.c.y) <= R;
  };
  const ds = 0.004;
  let lo = s0;
  let hi = s0;
  while (lo > s0 - Math.PI && inside(lo)) lo -= ds;
  while (hi < s0 + Math.PI && inside(hi)) hi += ds;
  lo = Math.max(lo - ds, s0 - Math.PI);
  hi = Math.min(hi + ds, s0 + Math.PI);
  const h = 1e-4;
  for (let i = 0; i < n; i++) {
    const s = lo + ((hi - lo) * i) / (n - 1);
    const p = f(s);
    const a = f(s - h);
    const b = f(s + h);
    let nx = b.y - a.y;
    let ny = -(b.x - a.x);
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if (nx * (p.x - centre.x) + ny * (p.y - centre.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    out[i * 4] = p.x;
    out[i * 4 + 1] = p.y;
    out[i * 4 + 2] = nx;
    out[i * 4 + 3] = ny;
  }
  return out;
}

/**
 * A band along a run: an elliptical tube (half-width `half` across the
 * curve, `depth` behind the section) whose front crest lies exactly on the
 * curve in the section plane (z = 0). Writes positions and normals for
 * n × ring vertices.
 */
export function tubeFill(run: Float32Array, n: number, ring: number, half: number, depth: number, pos: Float32Array, nrm: Float32Array) {
  const b = depth / 2;
  for (let i = 0; i < n; i++) {
    const x = run[i * 4];
    const y = run[i * 4 + 1];
    const nx = run[i * 4 + 2];
    const ny = run[i * 4 + 3];
    for (let j = 0; j < ring; j++) {
      const phi = (j / ring) * Math.PI * 2;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const k = (i * ring + j) * 3;
      pos[k] = x + half * c * nx;
      pos[k + 1] = y + half * c * ny;
      pos[k + 2] = -b + b * s;
      const gx = (c / half) * nx;
      const gy = (c / half) * ny;
      const gz = s / b;
      const l = Math.hypot(gx, gy, gz) || 1;
      nrm[k] = gx / l;
      nrm[k + 1] = gy / l;
      nrm[k + 2] = gz / l;
    }
  }
}

/** A flat ribbon along a run (two vertices per sample, at ±half), at depth z, shifted by (dx, dy). */
export function ribbonFill(run: Float32Array, n: number, half: number, z: number, dx: number, dy: number, pos: Float32Array) {
  for (let i = 0; i < n; i++) {
    const x = run[i * 4] + dx;
    const y = run[i * 4 + 1] + dy;
    const nx = run[i * 4 + 2];
    const ny = run[i * 4 + 3];
    const k = i * 6;
    pos[k] = x - half * nx;
    pos[k + 1] = y - half * ny;
    pos[k + 2] = z;
    pos[k + 3] = x + half * nx;
    pos[k + 4] = y + half * ny;
    pos[k + 5] = z;
  }
}
