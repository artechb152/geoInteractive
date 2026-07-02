#!/usr/bin/env node
/**
 * Regenerate the Lesson 09 world map geometry
 * (src/components/lessons/topic-09/worldMapGeometry.ts).
 *
 * Fetches Natural Earth 1:50m coastlines, projects them with an equal-scale
 * equirectangular (plate-carrée) projection into the scene's 0 0 100 56
 * viewBox, Douglas–Peucker simplifies, drops Antarctica + sub-threshold
 * islands (Japan / Madagascar / GB / NZ are force-kept), and smooths the
 * shipping lanes / water channels through the true projected chokepoints.
 *
 * The output is baked as string constants so nothing map-related ships at
 * runtime. Re-run after changing the projection, chokepoints, or routes:
 *   node scripts/gen-world-map.mjs
 *
 * Requires network access (raw.githubusercontent.com).
 */
import { writeFileSync } from 'node:fs';

// ── Projection ─────────────────────────────────────────────────────────────
const KX = 0.3;          // viewBox units per degree of longitude
const KY = 0.3;          // …and per degree of latitude (equal → no squish)
const CX = 50;           // Greenwich meridian at x=50 (west→left, east→right)
let   CY = 32.2;         // recomputed to vertically centre the content
const project = ([lon, lat]) => [CX + KX * lon, CY - KY * lat];

// ── Douglas–Peucker ─────────────────────────────────────────────────────────
function perp(p, a, b) {
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}
function rdp(points, eps) {
  if (points.length < 3) return points;
  let idx = 0, max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perp(points[i], points[0], points[points.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max > eps) {
    return rdp(points.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(points.slice(idx), eps));
  }
  return [points[0], points[points.length - 1]];
}
function ringArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length, j = n - 1; i < n; j = i++) {
    a += (pts[j][0] * pts[i][1]) - (pts[i][0] * pts[j][1]);
  }
  return Math.abs(a / 2);
}
const wraps = (ring) => ring.some((p, i) => i > 0 && Math.abs(p[0] - ring[i - 1][0]) > 180);
function ringContains(ringLL, [lon, lat]) {
  let inside = false;
  for (let i = 0, j = ringLL.length - 1; i < ringLL.length; j = i++) {
    const xi = ringLL[i][0], yi = ringLL[i][1], xj = ringLL[j][0], yj = ringLL[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// ── Fetch geometry (50m for a crisp coastline, 110m fallback) ───────────────
async function loadLand() {
  const urls = [
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson',
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson',
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) { console.error('  skip', url, r.status); continue; }
      console.error('  loaded', url.split('/').pop());
      return r.json();
    } catch (e) { console.error('  err', url, e.message); }
  }
  throw new Error('no land geometry available');
}
function polygonsOf(gj) {
  const out = [];
  for (const f of gj.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') out.push(g.coordinates);
    else if (g.type === 'MultiPolygon') for (const poly of g.coordinates) out.push(poly);
  }
  return out;
}

const gj = await loadLand();
const polys = polygonsOf(gj);
console.error('  polygons:', polys.length);

// Pass 1 — centre non-Antarctica land vertically inside [0,56].
{
  let minY = Infinity, maxY = -Infinity;
  for (const poly of polys) {
    const ring = poly[0];
    if (Math.max(...ring.map((c) => c[1])) < -60) continue;
    for (const c of ring) {
      if (c[1] < -60) continue;
      const y = -KY * c[1];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  CY = (56 - (minY + maxY)) / 2;
  console.error('  computed CY =', CY.toFixed(3));
}

// Pass 2 — project + simplify + filter.
const EPS = 0.16, MIN_AREA = 0.9;
const KEEP_POINTS = [[141, 38], [47, -19], [-2, 54], [174, -41]]; // Japan, Madagascar, GB, NZ
const land = [];
let dropped = 0;
for (const poly of polys) {
  const outerLL = poly[0];
  if (Math.max(...outerLL.map((c) => c[1])) < -60) { dropped++; continue; } // Antarctica
  if (wraps(outerLL)) continue;
  const subpaths = [];
  let kept = false;
  poly.forEach((ringLL, ri) => {
    if (wraps(ringLL)) return;
    const proj = ringLL.map(project);
    const area = ringArea(proj);
    if (ri === 0) {
      const wanted = KEEP_POINTS.some((pt) => ringContains(outerLL, pt));
      if (area < MIN_AREA && !wanted) { dropped++; return; }
    } else if (area < 1.2) return;
    const simp = rdp(proj, ri === 0 ? EPS : EPS * 1.4);
    if (simp.length < 4) { if (ri === 0) dropped++; return; }
    subpaths.push(simp.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join('') + 'Z');
    if (ri === 0) kept = true;
  });
  if (kept && subpaths.length) land.push(subpaths.join(''));
}
land.sort((a, b) => a.localeCompare(b));
console.error('  land paths:', land.length, ' vertices:', land.reduce((s, d) => s + (d.match(/[ML]/g) || []).length, 0));

// ── Chokepoints (true lon/lat) + shipping-lane waypoints ────────────────────
const CP_LL = {
  panama: [-79.68, 9.10], suez: [32.35, 30.55], 'bab-el-mandeb': [43.32, 12.60],
  hormuz: [56.40, 26.55], malacca: [100.60, 3.10],
};
const WP_LL = {
  gibraltar: [-5.6, 35.9], medCentral: [16, 35.5], redSeaMid: [39, 18], aden: [48, 12.6],
  arabianSea: [62, 15], hormuzOut: [60, 24], gulfInner: [51, 28], sriLanka: [80.5, 5.8],
  bayBengal: [88, 9], southChinaSea: [113, 13], eastChina: [122, 30], japanS: [136, 34],
  caribbean: [-74, 13.5], usEast: [-73, 36], panamaPac: [-83, 6], pacificUS: [-118, 30],
};
const proj2 = (ll) => { const [x, y] = project(ll); return { x: +x.toFixed(2), y: +y.toFixed(2) }; };
const chokepoints = Object.fromEntries(Object.entries(CP_LL).map(([k, ll]) => [k, proj2(ll)]));

const graticule = {
  meridians: [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => +(CX + KX * lon).toFixed(2)),
  parallels: [60, 40, 20, 0, -20, -40].map((lat) => +(CY - KY * lat).toFixed(2)),
};

// Catmull-Rom → cubic bezier through waypoints.
function smooth(ptsLL) {
  const P = ptsLL.map(project);
  const f = (n) => +n.toFixed(2);
  let d = `M${f(P[0][0])},${f(P[0][1])}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}
const cp = (k) => CP_LL[k], wp = (k) => WP_LL[k];
const routes = {
  mega: smooth([wp('gibraltar'), wp('medCentral'), cp('suez'), wp('redSeaMid'), cp('bab-el-mandeb'),
    wp('aden'), wp('arabianSea'), wp('sriLanka'), wp('bayBengal'), cp('malacca'),
    wp('southChinaSea'), wp('eastChina'), wp('japanS')]),
  gulf: smooth([wp('gulfInner'), cp('hormuz'), wp('hormuzOut'), wp('arabianSea')]),
  panama: smooth([wp('usEast'), wp('caribbean'), cp('panama'), wp('panamaPac'), wp('pacificUS')]),
};
const channels = {
  med: smooth([wp('gibraltar'), wp('medCentral'), cp('suez')]),
  redSea: smooth([cp('suez'), wp('redSeaMid'), cp('bab-el-mandeb')]),
  gulf: smooth([[50.5, 29.5], [53, 27.5], cp('hormuz')]),
  malacca: smooth([[98.5, 5.6], cp('malacca'), [103.4, 0.9]]),
};

// ── Emit the TS module ──────────────────────────────────────────────────────
const q = (s) => `'${s}'`;
const out = `// AUTO-GENERATED by scripts/gen-world-map.mjs — do not hand-edit.
//
// A recognizable world map for Lesson 09 (maritime chokepoints), built from
// Natural Earth 1:50m coastline data projected with an equal-scale
// equirectangular (plate-carrée) projection into the scene's 0 0 100 56
// viewBox, then Douglas–Peucker simplified. Antarctica and sub-threshold
// islands are dropped; Japan / Madagascar / Great Britain / New Zealand are
// force-kept for orientation.
//
// Projection (west→left, east→right — never mirrored in RTL):
//   x = ${CX} + ${KX} * lon
//   y = ${CY.toFixed(3)} - ${KY} * lat
// Every marker, route and channel below sits at its TRUE projected position.
// To regenerate: node scripts/gen-world-map.mjs

/** Projection constants — exported so chokepoint markers stay in sync. */
export const MAP_PROJECTION = {
  kx: ${KX},
  ky: ${KY},
  cx: ${CX},
  cy: ${CY.toFixed(3)},
  /** Project a [lon, lat] pair into viewBox units. */
  project(lon: number, lat: number): { x: number; y: number } {
    return { x: this.cx + this.kx * lon, y: this.cy - this.ky * lat };
  },
} as const;

/** Beige land silhouette — one entry per landmass (fill-rule: evenodd cuts
 *  inland seas such as the Caspian). */
export const WORLD_LAND: string[] = [
${land.map((d) => `  ${q(d)},`).join('\n')}
];

/** Graticule (meridian / parallel) x- and y- positions, in viewBox units. */
export const GRATICULE = {
  meridians: [${graticule.meridians.join(', ')}],
  parallels: [${graticule.parallels.join(', ')}],
} as const;

/** Major shipping lanes (SOLID = active/safe route, per the course legend).
 *  \`mega\` threads Suez → Bab el-Mandeb → Malacca; \`gulf\` feeds oil out of
 *  Hormuz; \`panama\` links Atlantic ↔ Pacific. */
export const SHIPPING_ROUTES = {
  mega: ${q(routes.mega)},
  gulf: ${q(routes.gulf)},
  panama: ${q(routes.panama)},
} as const;

/** Faint water passages that show WHY each strait is a bottleneck. */
export const WATER_CHANNELS = {
  med: ${q(channels.med)},
  redSea: ${q(channels.redSea)},
  gulf: ${q(channels.gulf)},
  malacca: ${q(channels.malacca)},
} as const;

/** Projected positions of the five chokepoints (kept for reference / tests;
 *  the scene's CHOKEPOINTS array carries the live copies). */
export const CHOKEPOINT_POSITIONS = {
  panama: { x: ${chokepoints.panama.x}, y: ${chokepoints.panama.y} },
  suez: { x: ${chokepoints.suez.x}, y: ${chokepoints.suez.y} },
  'bab-el-mandeb': { x: ${chokepoints['bab-el-mandeb'].x}, y: ${chokepoints['bab-el-mandeb'].y} },
  hormuz: { x: ${chokepoints.hormuz.x}, y: ${chokepoints.hormuz.y} },
  malacca: { x: ${chokepoints.malacca.x}, y: ${chokepoints.malacca.y} },
} as const;
`;

const target = new URL('../src/components/lessons/topic-09/worldMapGeometry.ts', import.meta.url);
writeFileSync(target, out);
console.error('\nWROTE', target.pathname, `(${out.length} bytes)`);
console.error('chokepoints:', JSON.stringify(chokepoints));
