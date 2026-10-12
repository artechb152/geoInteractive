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
/** The demonstration point, in the Middle East — inside all three maps. Its parallel is the
    highlighted line; it is NOT a line of contact of any surface. */
export const DEMO = { lat: 31.8, lon: 35.2 } as const;

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

export type Box = { x0: number; x1: number; y0: number; y1: number };

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
export const SHAPE_NAME: Record<Method, string> = { cyl: 'מלבן', cone: 'מניפה', az: 'מפה עגולה בדוגמה הקוטבית' };

/** The slider's two ends: [at 0 (right), at 1 (left)]. */
export const ENDS: Record<Method, [string, string]> = {
  cyl: ['עטיפה', 'מפה שטוחה'],
  cone: ['עטיפה', 'מפה שטוחה'],
  az: ['מישור משיק', 'מבט על'],
};

export const PHASE_LABEL: Record<Method, Record<Phase, string>> = {
  cyl: { start: 'משטח סביב הכדור', mid: 'פתיחת המשטח', end: 'מפה שטוחה' },
  cone: { start: 'משטח סביב הכדור', mid: 'פתיחת המשטח', end: 'מפה שטוחה' },
  az: { start: 'מישור משיק', mid: 'מעבר למבט על', end: 'מבט על' },
};

export const START_HINT: Record<Method, string> = {
  cyl: 'הזיזו את המחוון או הפעילו את ההדגמה כדי לפתוח את המשטח.',
  cone: 'הזיזו את המחוון או הפעילו את ההדגמה כדי לפתוח את המשטח.',
  az: 'הזיזו את המחוון או הפעילו את ההדגמה כדי לעבור למבט על.',
};

/** The explanation line, by method and phase (the instruction joins the opening one). */
export const EXPLAIN: Record<Method, Record<Phase, string>> = {
  cyl: {
    start: 'גליל עוטף את הכדור ונוגע בו לאורך קו המשווה.',
    mid: 'הגליל נחתך לאורך קו אחד ונפרש. קווי הרשת שעליו נשארים ישרים.',
    end: 'גליל נפתח למלבן. בדוגמה הזו מתקבלת רשת של קווים ישרים.',
  },
  cone: {
    start: 'חרוט מונח על הכדור ונוגע בו לאורך קו הרוחב 45° צפון. הקודקוד שלו מעל הקוטב.',
    mid: 'החרוט נחתך לאורך קו אחד ונפרש. קווי האורך יוצאים מהקודקוד.',
    end: 'חרוט נפתח למניפה. קווי הרוחב מקושתים וקווי האורך מתכנסים.',
  },
  az: {
    start: 'מישור נוגע בכדור בנקודה אחת: הקוטב הצפוני.',
    mid: 'המישור כבר שטוח, ולכן אין מה לפרוס. המבט עולה אל מעל הקוטב.',
    end: 'המישור כבר שטוח. במבט על מתקבלת רשת מעגלית סביב מרכז ההיטל.',
  },
};

export const CONTACT_LEGEND: Record<Method, string> = { cyl: 'קו המגע', cone: 'קו המגע', az: 'נקודת המגע' };

/** What the 3-D view shows, for its accessible description. */
export function stageDescription(m: Method | null, p: number): string {
  if (!m) return 'כדור הארץ התלת־ממדי עם רשת קווי אורך ורוחב כל 15 מעלות. עדיין לא נבחר משטח הטלה.';
  const pct = Math.round(p * 100);
  const point = 'קו רוחב לדוגמה ונקודה לדוגמה במזרח התיכון מסומנים בכתום, על הכדור ועל המשטח.';
  if (m === 'cyl') return `כדור הארץ התלת־ממדי וגליל שקוף למחצה שנוגע בו לאורך קו המשווה. הגליל פתוח ב־${pct}%: ${phaseOf(p) === 'end' ? 'הוא נפרש למלבן שטוח.' : phaseOf(p) === 'start' ? 'הוא עוטף את הכדור.' : 'התפר שלו נפתח והוא נפרש.'} ${point}`;
  if (m === 'cone') return `כדור הארץ התלת־ממדי וחרוט שקוף למחצה שנוגע בו לאורך קו הרוחב 45° צפון, וקודקודו מעל הקוטב. החרוט פתוח ב־${pct}%: ${phaseOf(p) === 'end' ? 'הוא נפרש למניפה שטוחה.' : phaseOf(p) === 'start' ? 'הוא מונח על הכדור.' : 'התפר שלו נפתח והוא נפרש.'} ${point}`;
  return `כדור הארץ התלת־ממדי ומישור שקוף למחצה שנוגע בו בקוטב הצפוני. ${phaseOf(p) === 'end' ? 'מבט מלמעלה על המישור.' : phaseOf(p) === 'start' ? 'מבט מהצד.' : `המבט עולה מעל הקוטב (${pct}%).`} ${point}`;
}

/** The map, for its accessible name. */
export const MAP_DESCRIPTION: Record<Method, string> = {
  cyl: 'מפת עולם מלבנית, מקו רוחב 80° דרום עד 80° צפון. קווי האורך והרוחב ישרים ונחתכים בניצב, כל 15 מעלות.',
  cone: 'מפה בצורת מניפה של חצי הכדור הצפוני, מקו רוחב 10° עד 80° צפון. קווי הרוחב הם קשתות, וקווי האורך מתכנסים לעבר הקודקוד.',
  az: 'מפה עגולה סביב הקוטב הצפוני, עד קו רוחב 10° צפון. קווי הרוחב הם מעגלים, וקווי האורך יוצאים מהמרכז כמו קרניים.',
};

/* ───────────────────────── practice ───────────────────────── */

/** First round: not the tabs' order. Later rounds: other orders, none of them the tabs'. */
export const FIRST_ORDER: Method[] = ['cone', 'az', 'cyl'];
export const REPEAT_ORDERS: Method[][] = [
  ['az', 'cyl', 'cone'],
  ['cyl', 'az', 'cone'],
  ['az', 'cone', 'cyl'],
  ['cone', 'cyl', 'az'],
];

export type PracticeState = {
  order: Method[];
  index: number;
  /** the surface chosen now (not yet checked, or checked) */
  pick: Method | null;
  /** the surface the last check was about; cleared when the pick changes */
  checked: Method | null;
  /** per task: answered right (after any number of tries) */
  solved: boolean[];
  /** checks made on this task */
  tries: number;
  hint: boolean;
  /** the summary has been reached */
  done: boolean;
  round: number;
};

export const initialPractice = (): PracticeState => ({ order: [...FIRST_ORDER], index: 0, pick: null, checked: null, solved: [false, false, false], tries: 0, hint: false, done: false, round: 0 });

export type PracticeAction = { type: 'pick'; m: Method } | { type: 'check' } | { type: 'hint' } | { type: 'next' } | { type: 'finish' } | { type: 'restart' };

export const targetOf = (s: PracticeState): Method => s.order[s.index];
export const isSolved = (s: PracticeState) => s.solved[s.index];

export function practiceReducer(s: PracticeState, a: PracticeAction): PracticeState {
  switch (a.type) {
    case 'pick':
      if (s.done || isSolved(s) || s.pick === a.m) return s;
      return { ...s, pick: a.m, checked: s.checked === a.m ? s.checked : null };
    case 'check': {
      if (s.done || isSolved(s) || !s.pick || s.checked === s.pick) return s;
      const right = s.pick === targetOf(s);
      const solved = right ? s.solved.map((v, i) => (i === s.index ? true : v)) : s.solved;
      return { ...s, checked: s.pick, tries: s.tries + 1, solved };
    }
    case 'hint':
      return s.done || isSolved(s) || s.hint ? s : { ...s, hint: true };
    case 'next':
      if (!isSolved(s) || s.index >= s.order.length - 1) return s;
      return { ...s, index: s.index + 1, pick: null, checked: null, tries: 0, hint: false };
    case 'finish':
      return s.solved.every(Boolean) ? { ...s, done: true } : s;
    case 'restart': {
      const order = REPEAT_ORDERS[s.round % REPEAT_ORDERS.length];
      return { ...initialPractice(), order: [...order], round: s.round + 1 };
    }
    default:
      return s;
  }
}

export const QUESTION = 'איזה משטח יוצר את הרשת הזו?';
export const HINT = 'התבוננו בצורה של קווי הרוחב ובכיוון של קווי האורך: האם הם ישרים, מקושתים או סוגרים מעגל?';
export const PICK_PROMPT = 'בחרו משטח ולחצו על ״בדיקת תשובה״.';

export const RIGHT: Record<Method, string> = {
  cone: 'נכון. החרוט נפתח למניפה: קווי הרוחב מקושתים וקווי האורך מתכנסים.',
  az: 'נכון. בדוגמה הזו המישור יוצר מפה עגולה סביב מרכז ההיטל, עם קווים רדיאליים ומעגליים.',
  cyl: 'נכון. הגליל נפתח למלבן, וברשת הזו קווי האורך והרוחב ישרים.',
};

/** What the chosen surface makes — said first in a miss. */
const MADE: Record<Method, Record<Method, string>> = {
  // [chosen][target]
  cyl: { cyl: '', cone: 'הגליל נפתח למלבן.', az: 'הגליל נפתח למלבן, עם קווים ישרים.' },
  cone: { cyl: 'החרוט נפתח למניפה, עם קווי רוחב מקושתים.', cone: '', az: 'החרוט נפתח למניפה: קווי הרוחב שלה אינם נסגרים למעגל.' },
  az: { cyl: 'המישור יוצר כאן מפה עגולה, עם קווי רוחב מעגליים.', cone: 'המישור יוצר כאן מפה עגולה: קווי הרוחב שלה הם מעגלים שלמים סביב מרכז ההיטל.', az: '' },
};
/** What the target map shows — the gap to look at, never the surface's name. */
const TARGET_GRID: Record<Method, Record<Method, string>> = {
  // [target][chosen]
  cyl: { cyl: '', cone: 'במפת היעד קווי האורך והרוחב ישרים ונחתכים בניצב', az: 'במפת היעד קווי האורך והרוחב ישרים ונחתכים בניצב' },
  cone: { cyl: 'במפת היעד קווי הרוחב מקושתים וקווי האורך מתכנסים', cone: '', az: 'במפת היעד קווי הרוחב הם קשתות בלבד, וקווי האורך מתכנסים לנקודה מחוץ למפה' },
  az: { cyl: 'במפת היעד קווי הרוחב הם מעגלים שלמים סביב נקודת מרכז, וקווי האורך יוצאים ממנה', cone: 'במפת היעד קווי הרוחב הם מעגלים שלמים סביב נקודת מרכז, וקווי האורך יוצאים ממנה', az: '' },
};

export function wrongMessage(chosen: Method, target: Method): string {
  return `${MADE[chosen][target]} ${TARGET_GRID[target][chosen]} — בדקו איזה משטח יכול ליצור את הרשת הזו.`;
}

export type Feedback = { tone: 'info' | 'right' | 'wrong'; text: string; hint: string | null };

/** The practice's feedback line now (null: the summary). */
export function feedbackOf(s: PracticeState): Feedback | null {
  if (s.done) return null;
  const target = targetOf(s);
  const hint = s.hint && !isSolved(s) ? HINT : null;
  if (s.checked) return s.checked === target ? { tone: 'right', text: RIGHT[target], hint: null } : { tone: 'wrong', text: wrongMessage(s.checked, target), hint };
  return { tone: 'info', text: PICK_PROMPT, hint };
}

export const SUMMARY_TITLE = 'זיהיתם את שלוש שיטות ההטלה';
export const SUMMARY: { m: Method; surface: string; shape: string }[] = [
  { m: 'cyl', surface: 'גליל', shape: 'מלבן' },
  { m: 'cone', surface: 'חרוט', shape: 'מניפה' },
  { m: 'az', surface: 'מישור', shape: 'מפה עגולה בדוגמה הקוטבית' },
];
