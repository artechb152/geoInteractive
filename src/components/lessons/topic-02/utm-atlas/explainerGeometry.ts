/* ─────────── "מהכדור למפה" — geometry of the projection explainer ───────────
   Steps 1–2 draw an orthographic globe (land clipped at the horizon) centred
   on zone 36's central meridian, so that meridian — where the transverse
   cylinder touches the globe — is the globe's vertical diameter. The cylinder
   itself is schematic (an oblique sketch, like the lesson's other projection
   art). Step 3 is a REAL transverse Mercator map: the same land through
   toUtm() for zone 36, over a region far wider than one zone, so the growth
   of the scale away from the central meridian shows. Equal ground circles
   (400 km) are drawn at their projected size: TM is conformal, so each stays
   a circle and only its size changes. Nothing is "peeled" or flattened
   without distortion. */

import { toUtm } from '../reference-systems/utm';
import { centralMeridian } from './utmAtlas';

const RAD = Math.PI / 180;

export const EXPLAINER_ZONE = 36;
export const CM = centralMeridian(EXPLAINER_ZONE); // 33°E

/* ── Orthographic globe ───────────────────────────────────────────────────── */

export const GLOBE = { lat0: 22, lon0: CM } as const;
type V3 = [number, number, number];

/** Unit sphere in the view frame: x east (at the centre), y north, z toward the viewer. */
export function ortho(lat: number, lon: number, o: { lat0: number; lon0: number } = GLOBE): V3 {
  const p = lat * RAD;
  const l = (lon - o.lon0) * RAD;
  const p0 = o.lat0 * RAD;
  return [Math.cos(p) * Math.sin(l), Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l), Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l)];
}

type Clipped = { x: number; y: number; horizon: boolean };

/** Sutherland–Hodgman against the plane z = 0; crossings are pushed onto the horizon circle and
    consecutive exit → entry crossings are joined along the horizon (the shorter arc). */
export function clipToFront(ring: [number, number][]): [number, number][] | null {
  const pts = ring.map(([lon, lat]) => ortho(lat, lon));
  const out: Clipped[] = [];
  for (let i = 0; i < pts.length; i++) {
    const P = pts[(i + pts.length - 1) % pts.length];
    const Q = pts[i];
    const pin = P[2] >= 0;
    const qin = Q[2] >= 0;
    const cross = () => {
      const t = P[2] / (P[2] - Q[2]);
      const x = P[0] + t * (Q[0] - P[0]);
      const y = P[1] + t * (Q[1] - P[1]);
      const r = Math.hypot(x, y) || 1;
      out.push({ x: x / r, y: y / r, horizon: true });
    };
    if (pin && qin) out.push({ x: Q[0], y: Q[1], horizon: false });
    else if (pin && !qin) cross();
    else if (!pin && qin) {
      cross();
      out.push({ x: Q[0], y: Q[1], horizon: false });
    }
  }
  if (out.length < 3) return null;
  const res: [number, number][] = [];
  for (let i = 0; i < out.length; i++) {
    const a = out[i];
    res.push([a.x, a.y]);
    const b = out[(i + 1) % out.length];
    if (a.horizon && b.horizon) {
      const t0 = Math.atan2(a.y, a.x);
      let d = Math.atan2(b.y, b.x) - t0;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      const n = Math.ceil(Math.abs(d) / (4 * RAD));
      for (let k = 1; k < n; k++) res.push([Math.cos(t0 + (d * k) / n), Math.sin(t0 + (d * k) / n)]);
    }
  }
  return res;
}

/** Visible runs of a lon/lat polyline on the globe (unit-disc coordinates, y up). */
export function frontRuns(line: [number, number][]): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  for (const [lon, lat] of line) {
    const [x, y, z] = ortho(lat, lon);
    if (z >= 0) run.push([x, y]);
    else if (run.length) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

export const meridian = (lon: number, s = -80, n = 84): [number, number][] =>
  Array.from({ length: 49 }, (_, i) => [lon, s + ((n - s) * i) / 48] as [number, number]);
export const parallel = (lat: number, w = -180, e = 180): [number, number][] =>
  Array.from({ length: 121 }, (_, i) => [w + ((e - w) * i) / 120, lat] as [number, number]);

/** Path data for unit-disc runs/rings scaled to radius r around (cx, cy); y flips to screen-down. */
export function discPath(rings: [number, number][][], cx: number, cy: number, r: number, close: boolean) {
  return rings
    .map((ring) => ring.map(([x, y], i) => `${i ? 'L' : 'M'}${(cx + x * r).toFixed(1)},${(cy - y * r).toFixed(1)}`).join('') + (close ? 'Z' : ''))
    .join('');
}

/* ── Transverse Mercator map (zone 36's cylinder) ─────────────────────────── */

/** The region shown in step 3: ±40° of longitude around the central meridian. */
export const TM_REGION = { w: CM - 40, e: CM + 40, s: -12, n: 52 } as const;

const tm = (lat: number, lon: number) => toUtm({ lat, lon }, { zone: EXPLAINER_ZONE, hemisphere: 'N' });

/** Clip a lon/lat ring to the TM region (rectangle in lon/lat), densifying along the cut. */
export function clipToRegion(ring: [number, number][]): [number, number][] | null {
  type P = [number, number];
  const planes: [(p: P) => boolean, (a: P, b: P) => P][] = [
    [(p) => p[0] >= TM_REGION.w, (a, b) => lerpAt(a, b, 0, TM_REGION.w)],
    [(p) => p[0] <= TM_REGION.e, (a, b) => lerpAt(a, b, 0, TM_REGION.e)],
    [(p) => p[1] >= TM_REGION.s, (a, b) => lerpAt(a, b, 1, TM_REGION.s)],
    [(p) => p[1] <= TM_REGION.n, (a, b) => lerpAt(a, b, 1, TM_REGION.n)],
  ];
  let pts: P[] = ring;
  for (const [inside, cut] of planes) {
    if (!pts.length) return null;
    const next: P[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length];
      const b = pts[i];
      if (inside(b)) {
        if (!inside(a)) next.push(cut(a, b));
        next.push(b);
      } else if (inside(a)) next.push(cut(a, b));
    }
    pts = next;
  }
  if (pts.length < 3) return null;
  // densify long straight cuts so they bend like the region's edges in TM
  const dense: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    dense.push(a);
    const n = Math.floor(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 0.5);
    for (let k = 1; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return dense;
}

function lerpAt(a: [number, number], b: [number, number], axis: 0 | 1, v: number): [number, number] {
  const t = (v - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

/** Metres → a frame of width W, height H with padding; returns the mapping and the scale. */
export function tmFrame(W: number, H: number, pad: number) {
  const corners = [
    tm(TM_REGION.s, TM_REGION.w),
    tm(TM_REGION.n, TM_REGION.w),
    tm(TM_REGION.s, TM_REGION.e),
    tm(TM_REGION.n, TM_REGION.e),
    tm(0, TM_REGION.w),
    tm(0, TM_REGION.e),
  ];
  const eMin = Math.min(...corners.map((c) => c.e));
  const eMax = Math.max(...corners.map((c) => c.e));
  const nMin = Math.min(...corners.map((c) => c.n));
  const nMax = Math.max(...corners.map((c) => c.n));
  const k = Math.min((W - 2 * pad) / (eMax - eMin), (H - 2 * pad) / (nMax - nMin));
  const ox = W / 2 - ((eMin + eMax) / 2) * k;
  const oy = H / 2 + ((nMin + nMax) / 2) * k;
  const xy = (lat: number, lon: number): [number, number] => {
    const { e, n } = tm(lat, lon);
    return [ox + e * k, oy - n * k];
  };
  return { xy, k, ox, oy };
}

export const pathOf = (pts: [number, number][], close: boolean) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + (close ? 'Z' : '');

/** Projected radius of a 400 km ground circle at (lat, lon) — measured, not assumed. */
export function groundCircle(frame: ReturnType<typeof tmFrame>, lat: number, lon: number, km = 400) {
  const [x, y] = frame.xy(lat, lon);
  const dLat = km / 111.2;
  const [x2, y2] = frame.xy(lat + dLat, lon);
  return { x, y, r: Math.hypot(x2 - x, y2 - y), scale: Math.hypot(x2 - x, y2 - y) / (km * 1000 * frame.k) };
}
