#!/usr/bin/env node
/**
 * Bakes the basemap of the topic-02 UTM zone atlas
 * (src/components/lessons/topic-02/utm-atlas/utmAtlasBasemap.data.ts).
 *
 * Source: Natural Earth 1:50m (public domain) — land, the larger lakes, and the
 * land boundaries between countries. Coordinates are kept geographic, in units
 * of 0.01° (x = lon, y = −lat), so ONE path serves every view: the world
 * locator map, the regional enlargement and the globe of the projection
 * explainer each project or crop it themselves. Douglas–Peucker at 0.02°
 * (≈ 2 km, under a pixel at the enlargement's widest zoom), relative path
 * commands, integers only — nothing map-related is fetched at runtime.
 *
 *   node scripts/maps/build-utm-atlas-basemap.mjs [--src <dir with the three .geojson>]
 *
 * Without --src it downloads the files from raw.githubusercontent.com
 * (nvkelso/natural-earth-vector, the same source as scripts/gen-world-map.mjs).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'src/components/lessons/topic-02/utm-atlas/utmAtlasBasemap.data.ts';
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const FILES = { land: 'ne_50m_land.geojson', lakes: 'ne_50m_lakes.geojson', borders: 'ne_50m_admin_0_boundary_lines_land.geojson' };

const UNIT = 100; // integer units per degree
const TOL = 2; // Douglas–Peucker tolerance, in units (0.02°)
const MIN_RING_AREA = 1.5 * UNIT * UNIT * 0.01; // 0.015 deg² ≈ 150 km² at the equator — keeps Malta, Cyprus, Bahrain
const MIN_LAKE_AREA = 1 * UNIT * UNIT; // 1 deg²: Victoria, the Great Lakes, Baikal, Ladoga, Balkhash… (no reservoirs, no dry Lake Eyre)

const srcArg = process.argv.indexOf('--src');
const srcDir = srcArg > 0 ? process.argv[srcArg + 1] : null;

async function load(name) {
  if (srcDir) return JSON.parse(await readFile(join(srcDir, name), 'utf8'));
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

const q = ([lon, lat]) => [Math.round(lon * UNIT), Math.round(-lat * UNIT)];

function perp(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Iterative Douglas–Peucker (rings here run to ~10⁴ vertices; recursion is fine but this is safer). */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let idx = -1;
    let max = 0;
    for (let i = s + 1; i < e; i++) {
      const d = perp(pts[i], pts[s], pts[e]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > eps && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const dedupe = (pts) => pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);

function area(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return Math.abs(a / 2);
}

/** A closed ring: split at its two farthest-apart vertices so DP keeps the ring's shape. */
function simplifyRing(ring) {
  const pts = dedupe(ring.map(q));
  if (pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
  if (pts.length < 4) return pts;
  let far = 0;
  let best = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const a = rdp(pts.slice(0, far + 1), TOL);
  const b = rdp([...pts.slice(far), pts[0]], TOL);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/** "M x y l dx dy …" in integer units; `close` adds z. */
function encode(pts, close) {
  let s = `M${pts[0][0]} ${pts[0][1]}`;
  if (pts.length > 1) {
    s += 'l';
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      s += (i > 1 && dx >= 0 ? ' ' : '') + dx + (dy >= 0 ? ' ' : '') + dy;
    }
  }
  return close ? s + 'z' : s;
}

const polygons = (fc) =>
  fc.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []));
const lines = (fc) =>
  fc.features.flatMap((f) => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : []));

function ringsOf(polys, minArea) {
  const out = [];
  let dropped = 0;
  for (const poly of polys) {
    poly.forEach((ring, k) => {
      const s = simplifyRing(ring);
      // holes (k > 0) are inland water inside land — keep the large ones only
      if (s.length < 3 || area(s) < (k === 0 ? minArea : Math.max(minArea, MIN_LAKE_AREA))) {
        dropped++;
        return;
      }
      out.push(s);
    });
  }
  return { out, dropped };
}

const [landFc, lakesFc, bordersFc] = await Promise.all([load(FILES.land), load(FILES.lakes), load(FILES.borders)]);

const land = ringsOf(polygons(landFc), MIN_RING_AREA);
const lakes = ringsOf(polygons(lakesFc), MIN_LAKE_AREA);
const borders = lines(bordersFc)
  .map((l) => rdp(dedupe(l.map(q)), TOL))
  .filter((l) => l.length > 1);

const LAND_D = land.out.map((r) => encode(r, true)).join('');
const LAKES_D = lakes.out.map((r) => encode(r, true)).join('');
const BORDERS_D = borders.map((l) => encode(l, false)).join('');

const count = (rs) => rs.reduce((n, r) => n + r.length, 0);
const ts = `// AUTO-GENERATED by scripts/maps/build-utm-atlas-basemap.mjs — do not hand-edit.
//
// Natural Earth 1:50m (public domain, naturalearthdata.com): land, lakes ≥ 1 deg²,
// land boundaries between countries. Geographic coordinates in units of 0.01°:
// x = lon × 100, y = −lat × 100 (north up, east right — never mirrored for RTL).
// Draw inside <g transform="scale(0.01)"> to work in degrees.
// Douglas–Peucker ${TOL / UNIT}°; land rings under ${MIN_RING_AREA / UNIT / UNIT} deg² dropped.
// ${land.out.length} land rings (${count(land.out)} vertices), ${lakes.out.length} lakes, ${borders.length} boundary lines (${count(borders)} vertices).

/** Integer units per degree of the paths below. */
export const BASEMAP_UNIT = ${UNIT};

/** Land, one closed ring per landmass or island (fill-rule evenodd cuts the large inland holes). */
export const LAND_D =
  '${LAND_D}';

/** Large lakes, drawn over the land in the water colour. */
export const LAKES_D =
  '${LAKES_D}';

/** Land boundaries between countries (open lines). */
export const BORDERS_D =
  '${BORDERS_D}';
`;

await writeFile(OUT, ts);
console.log(
  `${OUT}: ${(ts.length / 1024).toFixed(0)} KB — land ${land.out.length} rings / ${count(land.out)} pts (dropped ${land.dropped}), lakes ${lakes.out.length}, borders ${borders.length} lines / ${count(borders)} pts`,
);
