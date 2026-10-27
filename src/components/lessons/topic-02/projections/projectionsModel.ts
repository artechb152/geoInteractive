/* ─────────── היטלים: מכדור למפה — the one model behind the projections lab ───────────
   Pure TypeScript (no three, no React, no DOM) so the node tests can run it
   (scripts/qa/projections-lab.test.mjs). Reference:
   design/mockups/projections-concepts-2026-10-12/01-unfolding-lab.png, brief
   claude-implementation-option-1.txt there.

   One mapping per family, used by the globe's lines, the projection surface in 3-D,
   its unrolled form and the flat map (design/docs/assumptions.md, 2026-10-12 היטלים):
   - cylindrical: equidistant cylindrical (Plate Carrée), tangent along the equator,
     central meridian Greenwich, shown 80°S–80°N;
   - conic: equidistant conic with ONE standard parallel — the cone tangent along
     45°N, apex above the north pole, central meridian Greenwich, shown 10°N–80°N;
   - azimuthal: polar azimuthal equidistant — the plane tangent at the north pole,
     Greenwich toward the bottom, shown down to 10°N.
   Spherical equations (R = a = 1 scene unit), fed the globe's geodetic latitude: a
   teaching approximation — the globe itself is WGS84 (geo-globe/geoCoords.ts), the
   equations are not a geodetic projection and claim no geodetic accuracy.

   The "flat" coordinates of a method are at once the map's plane (x east, y north)
   and the development of its surface: the sheet in 3-D is that plane, rolled up
   (cylinder, cone) or laid on the pole (plane). Unrolling keeps every distance on
   the sheet, so a point keeps its flat coordinates the whole way. */

export type Method = 'cyl' | 'cone' | 'az';
export const METHODS: readonly Method[] = ['cyl', 'cone', 'az'];
export type Vec3 = [number, number, number];
export type XY = [number, number];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/* ───────────────────────── parameters ───────────────────────── */

/** The surface stands 0.4 % outside the sphere it touches (radius a = 1): the WGS84 body
    lies inside that sphere, so the surface never cuts it and never z-fights it. */
export const SURFACE_SCALE = 1.004;
export const CYL_LAT_MAX = 80;
export const CONE_PHI0 = 45;
export const CONE_LAT_MIN = 10;
export const CONE_LAT_MAX = 80;
export const AZ_LAT_MIN = 10;
/** One graticule for the globe, every surface and every map. */
export const GRID_STEP = 15;
/** Equal circles on the globe (after Tissot's indicatrix): one radius, one meridian, three
    latitudes — 20°N near the cylinder's line of contact, 45°N on the cone's, 70°N near the
    plane's point. Every surface and map draws the same three, so switching methods compares
    where each keeps them true. Inside every map's coverage, radius included. */
export const CIRCLE_R = 8;
export const CIRCLES: readonly { lat: number; lon: number }[] = [
  { lat: 20, lon: 25 },
  { lat: 45, lon: 25 },
  { lat: 70, lon: 25 },
];

const PHI0 = CONE_PHI0 * D2R;
/** Cone constant n = sin φ0: the developed cone is a sector of 2π·n. */
export const CONE_N = Math.sin(PHI0);
/** cot φ0: slant distance from the apex to the line of contact. */
export const CONE_RHO0 = 1 / Math.tan(PHI0);
/** Equidistant conic: distance from the apex of the parallel `lat` (true along meridians). */
export const coneRho = (lat: number) => CONE_RHO0 + PHI0 - lat * D2R;
export const CONE_RHO_IN = coneRho(CONE_LAT_MAX);
export const CONE_RHO_OUT = coneRho(CONE_LAT_MIN);
/** Half the developed sector's angle (radians). */
export const CONE_THETA_MAX = Math.PI * CONE_N;
/** Height of the apex above the centre (scene units). */
export const CONE_APEX_Y = SURFACE_SCALE / Math.sin(PHI0);
export const CYL_Y_MAX = CYL_LAT_MAX * D2R;
export const AZ_RHO_MAX = (90 - AZ_LAT_MIN) * D2R;

/** Where each surface touches the globe: a parallel (cylinder, cone) or the pole (plane). */
export const CONTACT_LAT: Record<Method, number> = { cyl: 0, cone: CONE_PHI0, az: 90 };

/** The latitude range each map shows. */
export const COVERAGE: Record<Method, { latMin: number; latMax: number }> = {
  cyl: { latMin: -CYL_LAT_MAX, latMax: CYL_LAT_MAX },
  cone: { latMin: CONE_LAT_MIN, latMax: CONE_LAT_MAX },
  az: { latMin: AZ_LAT_MIN, latMax: 90 },
};

/** Longitude into (−180, 180]. */
export function normLon(lon: number): number {
  let v = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (v === -180) v = 180;
  return Object.is(v, -0) ? 0 : v;
}

export const inCoverage = (m: Method, lat: number) => lat >= COVERAGE[m].latMin - 1e-9 && lat <= COVERAGE[m].latMax + 1e-9;

/* ───────────────────────── the projections ───────────────────────── */

/** (lat, lon) degrees → the method's flat coordinates (x east, y north; R = 1). */
export function project(m: Method, lat: number, lon: number): XY {
  // −180 stays the map's west edge (normLon would fold it onto +180, the east edge)
  const l = (lon >= -180 && lon <= 180 ? lon : normLon(lon)) * D2R;
  if (m === 'cyl') return [l, lat * D2R];
  if (m === 'cone') {
    const r = coneRho(lat);
    const t = CONE_N * l;
    return [r * Math.sin(t), -r * Math.cos(t)];
  }
  const r = (90 - lat) * D2R;
  return [r * Math.sin(l), -r * Math.cos(l)];
}

/** Flat coordinates → (lat, lon) degrees; null outside the map (its coverage, or the cone's
    seam). The cone's sheet also holds paper between the apex and 80°N that is not map. */
export function unproject(m: Method, x: number, y: number): { lat: number; lon: number } | null {
  if (m === 'cyl') {
    if (Math.abs(x) > Math.PI + 1e-9) return null;
    const lat = y * R2D;
    return Math.abs(lat) <= CYL_LAT_MAX + 1e-9 ? { lat, lon: x * R2D } : null;
  }
  const r = Math.hypot(x, y);
  if (m === 'cone') {
    const t = Math.atan2(x, -y);
    if (Math.abs(t) > CONE_THETA_MAX + 1e-9) return null;
    const lat = (CONE_RHO0 + PHI0 - r) * R2D;
    return lat >= CONE_LAT_MIN - 1e-9 && lat <= CONE_LAT_MAX + 1e-9 ? { lat, lon: (t / CONE_N) * R2D } : null;
  }
  const lat = 90 - r * R2D;
  if (lat < AZ_LAT_MIN - 1e-9) return null;
  return { lat, lon: r < 1e-12 ? 0 : Math.atan2(x, -y) * R2D };
}

/** Points of the circle of angular radius `r` (degrees) about (lat, lon) on the sphere. */
export function smallCircle(lat: number, lon: number, r: number, n = 72): { lat: number; lon: number }[] {
  const p1 = lat * D2R;
  const d = r * D2R;
  const out: { lat: number; lon: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const b = (2 * Math.PI * k) / n;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    const l2 = lon * D2R + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    out.push({ lat: p2 * R2D, lon: l2 * R2D });
  }
  return out;
}

/** An equal circle as drawn on a method's map (flat coordinates). */
export const circleOnMap = (m: Method, c: { lat: number; lon: number }, r = CIRCLE_R): XY[] => smallCircle(c.lat, c.lon, r).map((q) => project(m, q.lat, q.lon));

/** The map's scale along a parallel at `lat` (east–west stretch). Along the meridians all three
    maps are true (scale 1), so a circle's width on the map is this many times its height. */
export function parallelScale(m: Method, lat: number): number {
  const phi = lat * D2R;
  if (m === 'cyl') return 1 / Math.cos(phi);
  if (m === 'cone') return (CONE_N * coneRho(lat)) / Math.cos(phi);
  const c = (90 - lat) * D2R;
  return c < 1e-9 ? 1 : c / Math.sin(c);
}

export type Box = { x0: number; x1: number; y0: number; y1: number };

/** The flat box around a lat / lon region of a method's map. */
export function regionBox(m: Method, latMin: number, latMax: number, lonMin: number, lonMax: number): Box {
  const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (let i = 0; i <= 24; i++)
    for (let j = 0; j <= 24; j++) {
      const [x, y] = project(m, latMin + ((latMax - latMin) * i) / 24, lonMin + ((lonMax - lonMin) * j) / 24);
      b.x0 = Math.min(b.x0, x);
      b.x1 = Math.max(b.x1, x);
      b.y0 = Math.min(b.y0, y);
      b.y1 = Math.max(b.y1, y);
    }
  return b;
}

/** The flat extent of each map (and of the cone's paper up to its apex). */
export const MAP_BOX: Record<Method, Box> = {
  cyl: { x0: -Math.PI, x1: Math.PI, y0: -CYL_Y_MAX, y1: CYL_Y_MAX },
  cone: {
    x0: -(CONE_THETA_MAX >= Math.PI / 2 ? CONE_RHO_OUT : CONE_RHO_OUT * Math.sin(CONE_THETA_MAX)),
    x1: CONE_THETA_MAX >= Math.PI / 2 ? CONE_RHO_OUT : CONE_RHO_OUT * Math.sin(CONE_THETA_MAX),
    y0: -CONE_RHO_OUT,
    y1: Math.max(0, -CONE_RHO_OUT * Math.cos(CONE_THETA_MAX)),
  },
  az: { x0: -AZ_RHO_MAX, x1: AZ_RHO_MAX, y0: -AZ_RHO_MAX, y1: AZ_RHO_MAX },
};

/** Lines of the graticule inside a map, as flat polylines: parallels and meridians every
    GRID_STEP, then the map's outline. Sampled densely enough to read as curves. */
export function gridLines(m: Method): { parallels: XY[][]; meridians: XY[][]; outline: XY[] } {
  const { latMin, latMax } = COVERAGE[m];
  const parallels: XY[][] = [];
  const meridians: XY[][] = [];
  for (let lat = -90 + GRID_STEP; lat < 90; lat += GRID_STEP) {
    if (lat <= latMin + 1e-9 || lat >= latMax - 1e-9) continue;
    parallels.push(parallelLine(m, lat));
  }
  // meridians: in the azimuthal map they meet at the pole, so they stop one step short of it
  // (they all reach the centre, but drawn to it they would blot it); the pole itself is the contact point
  const top = m === 'az' ? 90 - GRID_STEP / 3 : latMax;
  for (let lon = -180; lon < 180; lon += GRID_STEP) {
    if (m === 'cyl' && lon === -180) continue; // the map's own edge
    if (m === 'cone' && lon === -180) continue; // the seam: the sector's straight edges
    meridians.push(meridianLine(m, lon, latMin, top));
  }
  return { parallels, meridians, outline: outlineOf(m) };
}

export function parallelLine(m: Method, lat: number): XY[] {
  const pts: XY[] = [];
  for (let k = 0; k <= 144; k++) pts.push(project(m, lat, -180 + (360 * k) / 144));
  return pts;
}

export function meridianLine(m: Method, lon: number, lat0: number, lat1: number): XY[] {
  const pts: XY[] = [];
  const n = 48;
  for (let k = 0; k <= n; k++) pts.push(project(m, lat0 + ((lat1 - lat0) * k) / n, lon));
  return pts;
}

/** The map's closed outline. */
export function outlineOf(m: Method): XY[] {
  const { latMin, latMax } = COVERAGE[m];
  if (m === 'az') return parallelLine('az', latMin);
  if (m === 'cyl') {
    // sampled along every edge: on the rolled sheet the edges are curves, not chords
    const { x0, x1, y0, y1 } = MAP_BOX.cyl;
    const edge = (ax: number, ay: number, bx: number, by: number, k: number): XY[] => Array.from({ length: k }, (_, i) => [ax + ((bx - ax) * i) / k, ay + ((by - ay) * i) / k]);
    return [...edge(x0, y0, x1, y0, 96), ...edge(x1, y0, x1, y1, 24), ...edge(x1, y1, x0, y1, 96), ...edge(x0, y1, x0, y0, 24), [x0, y0]];
  }
  // the cone: outer arc west → east, the east seam inward, inner arc east → west, the west seam outward
  const outer = parallelLine('cone', latMin);
  const inner = parallelLine('cone', latMax).reverse();
  return [...outer, ...inner, outer[0]];
}

/* ───────────────────────── the surface in 3-D ───────────────────────── */

/** The sheet's mesh: a grid in the development's own parameters, its flat coordinates per
    vertex (the shader reads lat / lon back from them), and triangles. `u` runs along the
    long direction (around the axis), `v` across it. */
export function sheetMesh(m: Method, nu: number, nv: number) {
  const count = (nu + 1) * (nv + 1);
  const flat = new Float32Array(count * 2);
  let k = 0;
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      let x: number;
      let y: number;
      if (m === 'cyl') {
        x = -Math.PI + 2 * Math.PI * u;
        y = -CYL_Y_MAX + 2 * CYL_Y_MAX * v;
      } else {
        const t = (m === 'cone' ? -CONE_THETA_MAX : -Math.PI) + 2 * (m === 'cone' ? CONE_THETA_MAX : Math.PI) * u;
        const r = (m === 'cone' ? CONE_RHO_OUT : AZ_RHO_MAX) * v;
        x = r * Math.sin(t);
        y = -r * Math.cos(t);
      }
      flat[k * 2] = x;
      flat[k * 2 + 1] = y;
      k++;
    }
  }
  const index = new Uint32Array(nu * nv * 6);
  let n = 0;
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const d = c + 1;
      index.set([a, b, c, b, d, c], n);
      n += 6;
    }
  return { flat, index, count };
}

/** A point of the sheet (flat x, y) in the scene at unroll amount e (0 = wrapped around the
    globe, 1 = flat), with the sheet's outward normal there. Scene axes as geoCoords:
    x = toward lon 0 on the equator, y = north, z = toward lon 90°W (east is −z).
    - cylinder: the line along Greenwich stays where it touches; the rest keeps its arc length
      on a circle whose curvature falls linearly to 0 — the seam at 180° opens behind the globe
      and the sheet ends in the plane tangent along Greenwich, outer face to the viewer.
    - cone: the generator along Greenwich stays fixed (apex included); the half-angle opens from
      φ0 to 90°, linearly in e — the sheet ends in the plane tangent at 45°N on Greenwich.
    - plane: already flat; e does not move it (the view changes instead). */
export function sheetPoint(m: Method, e: number, x: number, y: number, out: { p: Vec3; n: Vec3 } = { p: [0, 0, 0], n: [0, 0, 0] }) {
  const S = SURFACE_SCALE;
  const t = Math.min(1, Math.max(0, e));
  if (m === 'cyl') {
    const s = x * S;
    const k = (1 - t) / S; // curvature
    const th = k * s;
    const X = k > 1e-7 ? Math.sin(th) / k : s - (k * k * s * s * s) / 6;
    const Z = k > 1e-7 ? S - (1 - Math.cos(th)) / k : S - (k * s * s) / 2;
    out.p[0] = Z;
    out.p[1] = y * S;
    out.p[2] = -X;
    out.n[0] = Math.cos(th);
    out.n[1] = 0;
    out.n[2] = -Math.sin(th);
    return out;
  }
  if (m === 'cone') {
    const r = Math.hypot(x, y);
    const th = Math.atan2(x, -y);
    const al = PHI0 + (Math.PI / 2 - PHI0) * t; // the half-angle, φ0 → 90°
    const sa = Math.sin(al);
    const ca = Math.cos(al);
    const beta = th / sa;
    const g = PHI0 - al;
    // axis a (apex → base) and e1 rotate in the meridian plane of Greenwich; e2 = east at Greenwich
    const ax = Math.sin(g);
    const ay = -Math.cos(g);
    const e1x = Math.cos(g);
    const e1y = Math.sin(g);
    const cb = Math.cos(beta);
    const sb = Math.sin(beta);
    // radial direction around the axis: cos β·e1 + sin β·e2, e2 = (0, 0, −1)
    const rx = cb * e1x;
    const ry = cb * e1y;
    const rz = -sb;
    out.p[0] = S * r * (ca * ax + sa * rx);
    out.p[1] = CONE_APEX_Y + S * r * (ca * ay + sa * ry);
    out.p[2] = S * r * (sa * rz);
    out.n[0] = ca * rx - sa * ax;
    out.n[1] = ca * ry - sa * ay;
    out.n[2] = ca * rz;
    return out;
  }
  out.p[0] = -y * S;
  out.p[1] = S;
  out.p[2] = -x * S;
  out.n[0] = 0;
  out.n[1] = 1;
  out.n[2] = 0;
  return out;
}

/** The sheet's boundary as flat points (the outline the camera must keep in frame). */
export function sheetOutline(m: Method, n = 48): XY[] {
  const pts: XY[] = [];
  if (m === 'cyl') {
    for (let k = 0; k <= n; k++) {
      const x = -Math.PI + (2 * Math.PI * k) / n;
      pts.push([x, -CYL_Y_MAX], [x, CYL_Y_MAX]);
    }
    return pts;
  }
  const rMax = m === 'cone' ? CONE_RHO_OUT : AZ_RHO_MAX;
  const tMax = m === 'cone' ? CONE_THETA_MAX : Math.PI;
  for (let k = 0; k <= n; k++) {
    const t = -tMax + (2 * tMax * k) / n;
    pts.push([rMax * Math.sin(t), -rMax * Math.cos(t)]);
  }
  pts.push([0, 0]);
  return pts;
}

/* ───────────────────────── the camera ───────────────────────── */

/** The floor the soft contact shadow lies on: just under the cylinder's lower edge. */
export const FLOOR_Y = -CYL_Y_MAX * SURFACE_SCALE - 0.03;
export const CAM_FOV = 24;
/** Drag limits around the base view (degrees) — never so far the illustration is lost. */
export const OFFSET_AZ_MAX = 70;
export const OFFSET_EL_MIN = -35;
export const OFFSET_EL_MAX = 35;
export const EL_MIN = -20;
export const EL_MAX = 90;

export const smooth01 = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** The view each method opens on, and how it moves with progress (degrees: elevation above the
    equator, azimuth = the longitude faced). Africa, Europe and the Middle East in front. The
    plane's view rises to straight above the pole, turning so Greenwich ends at the bottom. */
export function baseView(m: Method | null, p: number): { el: number; az: number } {
  const s = smooth01(p);
  if (m === 'cone') return { el: 13 + 19 * s, az: 8 };
  if (m === 'az') return { el: 22 + 68 * s, az: 8 * (1 - s) };
  return { el: 13, az: 8 };
}

/** Unit direction from the target toward the camera, and the camera's up (toward the north
    side of the view; above the pole: away from the faced longitude). */
export function viewBasis(elDeg: number, azDeg: number) {
  const el = elDeg * D2R;
  const az = azDeg * D2R;
  const d: Vec3 = [Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az)];
  const up: Vec3 = [-Math.sin(el) * Math.cos(az), Math.cos(el), Math.sin(el) * Math.sin(az)];
  // right = up × d (east at the centre of the view)
  const right: Vec3 = [up[1] * d[2] - up[2] * d[1], up[2] * d[0] - up[0] * d[2], up[0] * d[1] - up[1] * d[0]];
  return { d, up, right };
}

/** What must stay in frame: the globe (its rim seen from the view), the sheet's boundary at
    this progress and the shadow under the globe. */
export function framePoints(m: Method | null, e: number, elDeg: number, azDeg: number): Vec3[] {
  const { up, right } = viewBasis(elDeg, azDeg);
  const pts: Vec3[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * 2 * Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pts.push([c * right[0] + s * up[0], c * right[1] + s * up[1], c * right[2] + s * up[2]]);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    pts.push([0.7 * Math.cos(a), FLOOR_Y, 0.7 * Math.sin(a)]);
  }
  if (m) {
    const o = { p: [0, 0, 0] as Vec3, n: [0, 0, 0] as Vec3 };
    for (const [x, y] of sheetOutline(m)) {
      sheetPoint(m, e, x, y, o);
      pts.push([o.p[0], o.p[1], o.p[2]]);
    }
  }
  return pts;
}

/** Camera that keeps every point in frame (perspective, exact per point): the target is the
    centre of the points across the view, the distance the least that fits them all. */
export function fitCamera(pts: Vec3[], elDeg: number, azDeg: number, aspect: number, fovDeg = CAM_FOV, margin = 0.9) {
  const { d, up, right } = viewBasis(elDeg, azDeg);
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let r0 = Infinity;
  let r1 = -Infinity;
  let u0 = Infinity;
  let u1 = -Infinity;
  for (const p of pts) {
    const r = dot(p, right);
    const u = dot(p, up);
    r0 = Math.min(r0, r);
    r1 = Math.max(r1, r);
    u0 = Math.min(u0, u);
    u1 = Math.max(u1, u);
  }
  let rc = (r0 + r1) / 2;
  let uc = (u0 + u1) / 2;
  const tanV = Math.tan((fovDeg * D2R) / 2) * margin;
  const tanH = tanV * aspect;
  const distFor = () => {
    let dd = 0;
    for (const p of pts) {
      const z = dot(p, d);
      dd = Math.max(dd, z + Math.abs(dot(p, right) - rc) / tanH, z + Math.abs(dot(p, up) - uc) / tanV);
    }
    return dd;
  };
  let dist = distFor();
  // perspective makes the near side loom: centre the projected extent (not the flat one), then refit
  for (let it = 0; it < 4; it++) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of pts) {
      const depth = dist - dot(p, d);
      const sx = (dot(p, right) - rc) / depth;
      const sy = (dot(p, up) - uc) / depth;
      x0 = Math.min(x0, sx);
      x1 = Math.max(x1, sx);
      y0 = Math.min(y0, sy);
      y1 = Math.max(y1, sy);
    }
    rc += ((x0 + x1) / 2) * dist;
    uc += ((y0 + y1) / 2) * dist;
    dist = distFor();
  }
  const target: Vec3 = [rc * right[0] + uc * up[0], rc * right[1] + uc * up[1], rc * right[2] + uc * up[2]];
  return { target, dist, d, up };
}

/* ───────────────────────── the process ───────────────────────── */

export type Phase = 'start' | 'mid' | 'end';
export const phaseOf = (p: number): Phase => (p <= 0.005 ? 'start' : p >= 0.995 ? 'end' : 'mid');

/** The slider is the process 0–1 laid right (0, "עטיפה") to left (1, "מפה שטוחה"), the
    reading direction: ← and ↑ advance, → and ↓ go back, Home / End the two ends. */
export function sliderKey(key: string, value: number, step = 0.05): number | null {
  const clamp = (v: number) => Math.min(1, Math.max(0, Math.round(v * 1000) / 1000));
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      return clamp(value + step);
    case 'ArrowRight':
    case 'ArrowDown':
      return clamp(value - step);
    case 'PageUp':
      return clamp(value + 0.25);
    case 'PageDown':
      return clamp(value - 0.25);
    case 'Home':
      return 0;
    case 'End':
      return 1;
    default:
      return null;
  }
}

/** The demonstration: from where it is to the end, ≈ 5 s for the whole way. */
export const DEMO_SECONDS = 5;
export const demoDuration = (from: number) => Math.max(0.6, DEMO_SECONDS * (1 - from));
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/* ───────────────────────── the words ───────────────────────── */

export const TAB_NAME: Record<Method, string> = { cyl: 'גלילי', cone: 'חרוטי', az: 'אזימוטלי' };
export const SURFACE_NAME: Record<Method, string> = { cyl: 'גליל', cone: 'חרוט', az: 'מישור' };

/** The slider's two ends: [at 0 (right), at 1 (left)]. */
export const ENDS: Record<Method, [string, string]> = {
  cyl: ['עטיפה', 'מפה שטוחה'],
  cone: ['עטיפה', 'מפה שטוחה'],
  az: ['מישור משיק', 'מבט על'],
};

/** The slider's state in words — its accessible value only; on screen the ends and the step say it. */
export const PHASE_LABEL: Record<Method, Record<Phase, string>> = {
  cyl: { start: 'משטח סביב הכדור', mid: 'פתיחת המשטח', end: 'מפה שטוחה' },
  cone: { start: 'משטח סביב הכדור', mid: 'פתיחת המשטח', end: 'מפה שטוחה' },
  az: { start: 'מישור משיק', mid: 'מעבר למבט על', end: 'מבט על' },
};

/** One step of the process on screen: one idea and one short action. */
export type Step = { idea: string; act: string };
const UNROLL_ACT = 'גררו את המחוון כדי לפרוס אותו.';
const ON_ACT = 'המשיכו עד למפה השטוחה.';
const COMPARE_ACT = 'עברו לשיטה אחרת והשוו את העיגולים.';

/** By method and phase. The process: the surface touches the globe → it unrolls without
    stretching — the distortion was made when the globe was carried onto it (the plane needs no
    unrolling) → the map, where equal circles show the distortion. */
export const STEPS: Record<Method, Record<Phase, Step>> = {
  cyl: {
    start: { idea: 'הגליל עוטף את הכדור ונוגע בו לאורך קו המשווה.', act: UNROLL_ACT },
    mid: { idea: 'הגליל נחתך ונפרש למישור בלי להימתח. העיוות נוצר כשמעבירים אליו את הכדור, לא בפריסה.', act: ON_ACT },
    end: { idea: 'על הגליל כל קו רוחב ארוך כמו קו המשווה, ולכן במפה העיגולים נמתחים לצדדים ככל שמתרחקים ממנו.', act: COMPARE_ACT },
  },
  cone: {
    start: { idea: 'החרוט נוגע בכדור לאורך קו הרוחב 45° צפון, וקודקודו מעל הקוטב.', act: UNROLL_ACT },
    mid: { idea: 'החרוט נחתך ונפרש למניפה בלי להימתח. העיוות נוצר כשמעבירים אליו את הכדור, לא בפריסה.', act: ON_ACT },
    end: { idea: 'ליד קו הרוחב 45° העיגול כמעט אינו משתנה. ככל שמתרחקים מקו המגע, העיגולים נמתחים.', act: COMPARE_ACT },
  },
  az: {
    start: { idea: 'המישור נוגע בכדור בנקודה אחת: הקוטב הצפוני.', act: 'גררו את המחוון כדי להביט עליו מלמעלה.' },
    mid: { idea: 'המישור כבר שטוח, ולכן אין מה לפרוס. רק המבט עולה מעל הקוטב.', act: 'המשיכו עד למבט מלמעלה.' },
    end: { idea: 'ליד הקוטב העיגול כמעט אינו משתנה. ככל שמתרחקים מנקודת המגע, העיגולים נמתחים.', act: COMPARE_ACT },
  },
};

export const CONTACT_LEGEND: Record<Method, string> = { cyl: 'קו המגע', cone: 'קו המגע', az: 'נקודת המגע' };
export const CIRCLE_LEGEND = 'עיגולים שווים על הכדור';
export const TRUE_LEGEND = 'אותו עיגול בלי עיוות';

/** How many times longer along its parallel than along its meridian an equal circle is on a
    method's map ("1.41") — its width only where the parallels run straight across (cylinder). */
export const stretchText = (m: Method, lat: number) => parallelScale(m, lat).toFixed(2);

/* ── the map's sheet in learning: it comes in as the surface unrolls ── */

/** The map's opacity at progress p: a faint preview of what the surface will give, whole when flat. */
export const mapOpacity = (p: number) => 0.28 + 0.72 * smooth01(p);
/** The equal circles on the unrolling sheet and on the map: once the sheet is well open. */
export const circlesOn = (p: number) => smooth01((p - 0.45) / 0.4);

/** What the 3-D view shows, for its accessible description. */
export function stageDescription(m: Method | null, p: number): string {
  if (!m) return 'כדור הארץ התלת־ממדי עם רשת קווי אורך ורוחב כל 15 מעלות. עדיין לא נבחר משטח הטלה.';
  const pct = Math.round(p * 100);
  const circles = `על הכדור שלושה עיגולים שווים בכתום, ב־20°, ב־45° וב־70° צפון${circlesOn(p) > 0.5 ? '; על המשטח הם נמתחים ככל שמתרחקים מ' + (m === 'az' ? 'נקודת המגע.' : 'קו המגע.') : '.'}`;
  if (m === 'cyl') return `כדור הארץ התלת־ממדי וגליל שקוף למחצה שנוגע בו לאורך קו המשווה. הגליל פתוח ב־${pct}%: ${phaseOf(p) === 'end' ? 'הוא נפרש למלבן שטוח.' : phaseOf(p) === 'start' ? 'הוא עוטף את הכדור.' : 'התפר שלו נפתח והוא נפרש.'} ${circles}`;
  if (m === 'cone') return `כדור הארץ התלת־ממדי וחרוט שקוף למחצה שנוגע בו לאורך קו הרוחב 45° צפון, וקודקודו מעל הקוטב. החרוט פתוח ב־${pct}%: ${phaseOf(p) === 'end' ? 'הוא נפרש למניפה שטוחה.' : phaseOf(p) === 'start' ? 'הוא מונח על הכדור.' : 'התפר שלו נפתח והוא נפרש.'} ${circles}`;
  return `כדור הארץ התלת־ממדי ומישור שקוף למחצה שנוגע בו בקוטב הצפוני. ${phaseOf(p) === 'end' ? 'מבט מלמעלה על המישור.' : phaseOf(p) === 'start' ? 'מבט מהצד.' : `המבט עולה מעל הקוטב (${pct}%).`} ${circles}`;
}

/** The map, for its accessible name. */
export const MAP_DESCRIPTION: Record<Method, string> = {
  cyl: 'מפת עולם מלבנית, מקו רוחב 80° דרום עד 80° צפון. קווי האורך והרוחב ישרים ונחתכים בניצב, כל 15 מעלות.',
  cone: 'מפה בצורת מניפה של רצועה מחצי הכדור הצפוני, מקו רוחב 10° עד 80° צפון. קווי הרוחב הם קשתות, וקווי האורך מתכנסים לעבר הקודקוד.',
  az: 'מפה עגולה סביב הקוטב הצפוני, עד קו רוחב 10° צפון. קווי הרוחב הם מעגלים, וקווי האורך יוצאים מהמרכז כמו קרניים.',
};

/** The map's name with the equal circles' stretch on it (along the parallel, against the meridian). */
const stretchSaid = (m: Method, lat: number) => (stretchText(m, lat) === '1.00' ? `ב־${lat}° ללא שינוי` : `ב־${lat}° פי ${stretchText(m, lat)}`);
export const mapLabelWithCircles = (m: Method) =>
  `${MAP_DESCRIPTION[m]} שלושת העיגולים השווים נמתחים במפה לאורך קו הרוחב, ביחס לאורכם לאורך קו האורך: ${[20, 45, 70].map((lat) => stretchSaid(m, lat)).join(', ')}.`;

/* ───────────────────────── practice ───────────────────────── */

/** A practice task: a method's map, whole — or a window of it (`part`), so the method is read
    from the grid itself and not recalled from the outline seen in the lab. */
export type Target = { m: Method; part: boolean };

/** The windows, in flat coordinates, clear of every outline: cylinder 20°W–70°E × 35°S–55°N;
    cone around 30°W–50°E × 30°–70°N; plane the pole ±50° (the parallels 45°–75°N whole). */
export const WINDOW: Record<Method, Box> = {
  cyl: { x0: -20 * D2R, x1: 70 * D2R, y0: -35 * D2R, y1: 55 * D2R },
  cone: regionBox('cone', 30, 70, -30, 50),
  az: { x0: -50 * D2R, x1: 50 * D2R, y0: -50 * D2R, y1: 50 * D2R },
};

const T = (m: Method, part: boolean): Target => ({ m, part });
/** Four tasks a round: all three methods and one of them again, never twice in a row, so no task
    can be answered by elimination. Each round has one whole map; the rest are windows. */
export const ROUNDS: Target[][] = [
  [T('cone', false), T('az', true), T('cyl', true), T('cone', true)],
  [T('az', false), T('cyl', true), T('az', true), T('cone', true)],
  [T('cyl', true), T('cone', false), T('az', true), T('cyl', true)],
  [T('az', true), T('cone', true), T('cyl', false), T('cone', true)],
];
/** A second wrong check shows the answer. */
export const MAX_MISSES = 2;

export type Outcome = 'right' | 'shown';
export type PracticeState = {
  order: Target[];
  index: number;
  /** the surface chosen now (not yet checked, or checked) */
  pick: Method | null;
  /** the surface the last check was about; cleared when the pick changes */
  checked: Method | null;
  /** wrong checks on this task */
  misses: number;
  /** per task: answered right (after any tries) or shown after the second miss; null while open */
  outcome: (Outcome | null)[];
  /** the summary has been reached */
  done: boolean;
  round: number;
};

export const initialPractice = (): PracticeState => ({
  order: ROUNDS[0].map((t) => ({ ...t })),
  index: 0,
  pick: null,
  checked: null,
  misses: 0,
  outcome: ROUNDS[0].map(() => null),
  done: false,
  round: 0,
});

export type PracticeAction = { type: 'pick'; m: Method } | { type: 'check' } | { type: 'next' } | { type: 'finish' } | { type: 'restart' };

export const targetOf = (s: PracticeState): Method => s.order[s.index].m;
export const isPart = (s: PracticeState): boolean => s.order[s.index].part;
/** The task is over: answered right, or its answer shown. */
export const isOver = (s: PracticeState) => s.outcome[s.index] !== null;

export function practiceReducer(s: PracticeState, a: PracticeAction): PracticeState {
  switch (a.type) {
    case 'pick':
      if (s.done || isOver(s) || s.pick === a.m) return s;
      return { ...s, pick: a.m, checked: s.checked === a.m ? s.checked : null };
    case 'check': {
      if (s.done || isOver(s) || !s.pick || s.checked === s.pick) return s;
      const right = s.pick === targetOf(s);
      const misses = right ? s.misses : s.misses + 1;
      const o: Outcome | null = right ? 'right' : misses >= MAX_MISSES ? 'shown' : null;
      return { ...s, checked: s.pick, misses, outcome: o ? s.outcome.map((v, i) => (i === s.index ? o : v)) : s.outcome };
    }
    case 'next':
      if (!isOver(s) || s.index >= s.order.length - 1) return s;
      return { ...s, index: s.index + 1, pick: null, checked: null, misses: 0 };
    case 'finish':
      return s.outcome.every((o) => o !== null) ? { ...s, done: true } : s;
    case 'restart': {
      const round = s.round + 1;
      const order = ROUNDS[round % ROUNDS.length];
      return { ...initialPractice(), order: order.map((t) => ({ ...t })), outcome: order.map(() => null), round };
    }
    default:
      return s;
  }
}

export const QUESTION = 'איזה משטח יוצר את הרשת הזו?';
export const PICK_PROMPT = 'בחרו משטח ולחצו על ״בדיקת תשובה״.';
/** After a miss: where to look — the grid's parallels — never what the target shows. */
export const LOOK = 'התבוננו בקווי הרוחב במפת היעד: האם הם ישרים, קשתות או מעגלים שלמים?';

/** What the chosen surface makes — said first in a miss (it is about the choice, not the target). */
export const MADE: Record<Method, string> = {
  cyl: 'גליל נפרש למלבן, וקווי הרוחב בו ישרים.',
  cone: 'חרוט נפרש למניפה, וקווי הרוחב בו קשתות.',
  az: 'מישור שנוגע בקוטב יוצר קווי רוחב שהם מעגלים שלמים.',
};

export const RIGHT: Record<Method, string> = {
  cone: 'נכון. החרוט נפרש למניפה: קווי הרוחב הם קשתות, וקווי האורך מתכנסים לקודקוד.',
  az: 'נכון. במישור קווי הרוחב הם מעגלים שלמים סביב נקודת המגע, וקווי האורך יוצאים ממנה.',
  cyl: 'נכון. בגליל שנפרש קווי הרוחב והאורך ישרים ונחתכים בניצב.',
};

/** The answer, after the second miss: the surface and the grid that gives it away. */
export const SHOWN: Record<Method, string> = {
  cyl: 'התשובה: גליל. במפה קווי הרוחב והאורך ישרים ונחתכים בניצב, כמו בגליל שנפרש למלבן.',
  cone: 'התשובה: חרוט. במפה קווי הרוחב הם קשתות, וקווי האורך מתכנסים לנקודה שמחוץ למפה: קודקוד החרוט.',
  az: 'התשובה: מישור. במפה קווי הרוחב הם מעגלים שלמים סביב הקוטב, וקווי האורך יוצאים ממנו.',
};

export type Feedback = { tone: 'info' | 'right' | 'wrong' | 'shown'; text: string };

/** The practice's feedback line now (null: the summary). */
export function feedbackOf(s: PracticeState): Feedback | null {
  if (s.done) return null;
  const target = targetOf(s);
  const o = s.outcome[s.index];
  if (o === 'right') return { tone: 'right', text: RIGHT[target] };
  if (o === 'shown') return { tone: 'shown', text: SHOWN[target] };
  if (s.checked) return { tone: 'wrong', text: `${MADE[s.checked]} ${LOOK}` };
  return { tone: 'info', text: s.misses ? LOOK : PICK_PROMPT };
}

export const SUMMARY_TITLE = 'סיכום: שלוש שיטות ההטלה';
/** The summary: each surface, the shape it unrolls into, and where its map is least distorted. */
export const SUMMARY: { m: Method; surface: string; shape: string; near: string }[] = [
  { m: 'cyl', surface: 'גליל', shape: 'מלבן', near: 'עיוות קטן ליד קו המשווה' },
  { m: 'cone', surface: 'חרוט', shape: 'מניפה', near: 'עיוות קטן ליד קו הרוחב 45°' },
  { m: 'az', surface: 'מישור', shape: 'מפה עגולה בדוגמה הקוטבית', near: 'עיוות קטן ליד הקוטב' },
];
/** Said of these three examples only: a secant surface (UTM's cylinder) is true on two lines, not one. */
export const SUMMARY_LINE = 'בשלוש הדוגמאות כאן העיוות קטן ליד המקום שבו המשטח נוגע בכדור, וגדל ככל שמתרחקים ממנו.';
