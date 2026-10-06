'use strict';
/**
 * Painted scenes for the rock board "3 סוגי הסלעים" (RockVisuals.tsx →
 * RockDiorama), in the language of the forces board: one sculpted, painted
 * landscape seen obliquely from above, with the near edge cut open — here
 * deeper (≈ a third of the frame) so the section can carry the process.
 * The painting kit is shared with render-geology-forces.cjs
 * (scripts/media/lib/painted-terrain.cjs).
 *
 *   node scripts/media/render-geology-rocks.cjs [--only sediment|metamorphic] [--preview <dir>]
 *        [--out <dir>] [--anchors] [--fast]
 *
 *   rocks/sediment-start.webp      a stream brings sand and silt down a valley into a
 *                                  shallow bay; the cut shows the water over the basin
 *   rocks/sediment-end.webp        the bay has filled: limestone with fossils,
 *                                  sandstone and marl in the cut, a plain on top
 *   rocks/sediment-aux.png         data for the shader (layout below)
 *   rocks/metamorphic-start.webp   a mountain belt whose ridges plunge out onto a plateau;
 *                                  the cut shows flat beds of limestone with fossils and shale
 *   rocks/metamorphic-end.webp     the same beds folded and recrystallised — banded marble
 *                                  and slate — and the ridges grown out to the near edge
 *   rocks/metamorphic-aux.png      data for the shader (layout below)
 *
 * The frame matches the rock overlay's 640 × 360 viewBox (2 px per unit when
 * delivered). The shader in RockVisuals.tsx performs the process between START
 * and END from the AUX data; the timings live there, the geometry here.
 * --anchors prints the overlay points and constants RockVisuals.tsx copies (the
 * sediment arrow's column and label points; the metamorphic deformation).
 * --fast renders at half resolution (previews). Nothing is ever mirrored for RTL.
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));
const T = require('./lib/painted-terrain.cjs');

const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const OUT = path.resolve(opt('out', path.join(root, 'public/assets/lessons/topic02/scene-geology/rocks')));
const ONLY = opt('only', 'all');
const PREVIEW = opt('preview', null);
const ANCHORS_ONLY = args.includes('--anchors');
const FAST = args.includes('--fast');

const { clamp, ss, mix, mix3, mul3, hex, smin, makeNoise, fbm, ridged, POLY, distToPolyline, meander } = T;
const { SOIL, SOIL_DK, DRYGRASS, GRAVEL, SHRUBS, RIPARIAN, STONES, SAND, SAND_LT, WATER, WATER_LT } = T;
const { flags, soilColor, rockColor, bedRock, soilHorizon } = T;

// ── frame & camera ──────────────────────────────────────────────────────────
// The rock overlay's 640 × 360 viewBox. The camera is the forces camera (same
// lens, ≈38° down, 703 units above the plain); the block is shallower (330
// units deep) and its near edge sits higher in the frame, so the cut below it
// takes ≈ 34 % of the frame height. On the near edge one world unit is one
// viewBox unit: viewBox x = world x − 180, viewBox y = 358 − z.
const P = T.painter({ VB_W: 640, VB_H: 360, S: FAST ? 2 : 4, OUT_S: 2, LX: 1000, LY: 330, CAM: { x: 500, y: -900, z: 831 }, F: 900, Y0: 358, out: OUT, preview: PREVIEW, root, kuwahara: FAST ? 1 : 3 });
const { S, IW, IH, VB_W, VB_H, vb, Field, lighting, Scatter, render, finish, save } = P;
const NEAR_X0 = 180; // world x at the viewBox's left edge on the near edge

/** Integer hash → 0…1. */
function hash2(i, j, s = 0) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Distance to a polyline and the position along it, sampled on a grid (cs world units) for speed. */
function polyField(pts, cs) {
  const d = new Field(cs);
  const at = new Field(cs);
  for (let j = 0; j < d.ny; j++)
    for (let i = 0; i < d.nx; i++) {
      const k = j * d.nx + i;
      d.a[k] = distToPolyline(i * cs, j * cs, pts);
      at.a[k] = POLY.at;
    }
  return { d, at, len: POLY.len };
}

// ════════════════════════════════════════════════════════════════════════════
// SEDIMENT — eroding hills in the distance; a stream carries sand and silt down
// a valley into a shallow bay. Under the bay the cut shows the basin, eroded
// into older, tilted rock, which the beds fill: limestone (two beds, the upper
// one full of fossils), sandstone, marl. In the end the bay is land.
// ════════════════════════════════════════════════════════════════════════════
const SED = {
  SEA: 120, // sea level
  LAND: 128, // the coastal plain around the bay
  TOP: 121, // the filled bay (END)
  DEPTH: 100, // the basin under the bay at its deepest
  // final (compacted) tops of the beds at the basin centre, base → top: limestone,
  // limestone with fossils, sandstone; the marl above them reaches the surface
  BEDS: [40, 62, 90],
  BED_COLORS: ['#D0C8B3', '#DCD4C0', '#BDA585', '#A8AB93'].map(hex),
  // the older rock: tilted beds, darker and greyer than the fill
  OLD: ['#8C8274', '#76706A', '#9A8E7D', '#81786E', '#958B80'].map(hex),
  // the shallow bay seen from above: sandy shallows → open water
  SHALLOW: hex('#A9C2B1'),
  MID: hex('#7FAAAE'),
  DEEP: hex('#5B8E9B'),
  WET_SAND: hex('#B49E7C'),
  SILT: hex('#B7A27D'),
};
const sN = { a: makeNoise(2101), b: makeNoise(2202), c: makeNoise(2303), d: makeNoise(2404), e: makeNoise(2505), f: makeNoise(2606), g: makeNoise(2707), m: makeNoise(2808), r: makeNoise(2909), s: makeNoise(3010), w: makeNoise(3111) };

/** A smooth curve through the points (Catmull-Rom), sampled every ≈1.5 world units. */
function spline(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 1.5));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// The stream from the far hills (top left) down its valley to its mouth at the back
// of the bay, and the channel it keeps across the filled bay to the near edge (END
// only), beside the faint scars of channels it has abandoned.
const MOUTH = [446, 175];
const STREAM = meander(spline([[150, 334], [196, 304], [248, 276], [300, 250], [352, 226], [396, 204], [428, 188], MOUTH]), 2.2, 64, 1);
const CHANNEL = meander(spline([MOUTH, [452, 150], [468, 122], [492, 94], [520, 66], [546, 40], [564, 16], [572, -4]]), 4.5, 110, 2);
const OLD_CHANNELS = [
  meander(spline([MOUTH, [426, 148], [404, 116], [386, 82], [372, 46], [364, 10], [362, -4]]), 6, 90, 3),
  meander(spline([MOUTH, [488, 160], [540, 140], [596, 118], [650, 94], [690, 70]]), 6, 90, 4),
];
// the sediment scene's precomputed fields are slow (≈ 1.5 min): only when that scene is rendered
const SED_ON = ONLY === 'all' || ONLY === 'sediment';
const sF = SED_ON ? polyField(STREAM, 0.5) : null;
const cF = SED_ON ? polyField(CHANNEL, 0.5) : null;
const oF = SED_ON ? OLD_CHANNELS.map((c) => polyField(c, 1)) : null;
const streamLevel = (s) => SED.SEA + 0.3 + 44 * Math.pow(1 - clamp(s / sF.len, 0, 1), 1.35);
const streamW = (s) => mix(3, 4.6, clamp(s / sF.len, 0, 1));
const CH_LEVEL = SED.TOP - 0.7;
const CH_W = 4;

/** Signed distance into the bay (positive inside, ≈ world units): a rounded bay opening to the near edge, its coast warped into coves and a headland. */
function bayD(x, y) {
  const wx = x + 16 * fbm(sN.a, x / 70, y / 70, 3);
  const wy = y + 12 * fbm(sN.a, x / 70 + 5, y / 70 + 5, 3);
  let d = (1 - Math.hypot((wx - 500) / 262, (wy - 18) / 158)) * 150;
  d -= 30 * Math.exp(-(((x - 712) / 42) ** 2 + ((y - 104) / 30) ** 2));
  d += 16 * Math.exp(-(((x - 300) / 50) ** 2 + ((y - 118) / 40) ** 2));
  return d;
}
/** Water depth over the basin floor (START), before erosion detail: deep in the middle, shallowing toward the mouth. */
function bayDepth(x, y, d) {
  // a bench part-way down the walls, which wander in and out
  const e = d + 7 * fbm(sN.f, x / 26, y / 26, 2) + 22 * fbm(sN.r, x / 70 + 4, y / 60, 3);
  return SED.DEPTH * (0.42 * ss(0, 20, e) + 0.58 * ss(34, 64, e)) * (1 - 0.6 * ss(70, 176, y));
}
/** The tilted older beds: 11 units thick, dipping toward +x (the same frame oldRock paints). */
const oldBedZ = (x, z) => z + 0.17 * x + 2.2 * fbm(sN.f, x / 30, z / 12, 2);
/**
 * The basin floor: eroded into the tilted older beds, so its walls step along their
 * bedding (ledges on the bed tops, risers through the beds) and its floor is uneven,
 * with shallow hollows and a low rib or two.
 */
function basinFloor(x, y, d) {
  const z0 = SED.SEA + 0.6 - 0.6 * ss(0, 6, d) - bayDepth(x, y, d);
  const tz = oldBedZ(x, z0);
  const k = Math.floor(tz / 22);
  const stepped = z0 + 22 * (k + ss(0.5, 0.95, tz / 22 - k)) - tz;
  const wall = ss(1, 6, SED.SEA - z0) * (1 - ss(SED.DEPTH * 0.7, SED.DEPTH * 0.92, SED.SEA - z0));
  const floor = ss(SED.DEPTH * 0.6, SED.DEPTH * 0.9, SED.SEA - z0);
  return mix(z0, stepped, wall) + floor * (6 * fbm(sN.d, x / 34, y / 30, 3) + 4 * ridged(sN.g, x / 60 + 3, y / 45, 2) - 2);
}

/**
 * The hills: two ranges across the back (a nearer one and a higher one behind),
 * dissected into spurs and gullies down their flanks, with a saddle where the
 * stream's valley crosses them.
 */
const RANGES = [
  { y: 276, amp: 44, w: 34, seed: 0 },
  { y: 324, amp: 44, w: 40, seed: 5 },
];
const valleyX = (y) => 150 + (334 - y) * 1.62; // where the stream crosses the ranges (≈ its course)
function hillsZ(x, y) {
  let z = 0;
  const warp = 14 * fbm(sN.e, x / 50, y / 50, 2);
  for (const R of RANGES) {
    const yc = R.y + 14 * Math.sin(x / 110 + R.seed) + 9 * fbm(sN.e, x / 70 + R.seed, 4.4, 2);
    const dy = y - yc;
    const prof = Math.exp(-Math.pow(Math.abs(dy) / R.w, 1.4));
    if (prof < 0.002) continue;
    // summits and saddles along the range; a gap where the valley crosses
    const A = R.amp * clamp(0.75 + 0.75 * fbm(sN.e, x / 95 + R.seed, 7.7, 3), 0.25, 1.35) * (1 - 0.65 * Math.exp(-(((x - valleyX(y)) / 80) ** 2)));
    // big spurs down the flanks with valleys between them, finer gullies within
    const spur = ridged(sN.c, (dy + warp) / 110 + R.seed, (x + warp) / 78, 3);
    const gully = ridged(sN.g, (dy + 2 * warp) / 40 + R.seed, x / 24, 2);
    const flank = Math.sqrt(prof) * (1 - prof);
    z += A * prof + 0.75 * A * flank * (spur - 0.45) - 0.1 * A * flank * gully * gully + 2.5 * prof * fbm(sN.d, x / 15, y / 15, 3) + 3 * prof * prof * (ridged(sN.g, x / 26, y / 26, 2) - 0.5);
  }
  return z;
}
function landZ(x, y) {
  return SED.LAND + 2.2 * fbm(sN.b, x / 30, y / 30, 3) + 3.5 * fbm(sN.d, x / 95 + 5, y / 95, 3) + hillsZ(x, y);
}
/** The stream's valley carved into the land (water surface where d < width). */
function carveStream(x, y, z) {
  const d = sF.d.at(x, y);
  if (d > 90) return z;
  const s = sF.at.at(x, y);
  const zw = streamLevel(s);
  const w = streamW(s);
  if (d < w) return zw;
  const e = d - w;
  return smin(z, zw + 0.5 + 0.35 * e + 0.012 * e * e, 3);
}
/** The ground of the START scene: land, beaches, the basin floor under the bay. */
function groundZ(x, y) {
  const d = bayD(x, y);
  let z = landZ(x, y);
  if (d > -40) {
    // the land slopes down to a beach at the water's edge
    const beach = SED.SEA + 0.6 + (z - SED.SEA - 0.6) * ss(0, 40, -d);
    z = d > 0 ? basinFloor(x, y, d) : beach;
  }
  return carveStream(x, y, z);
}
const G = SED_ON ? new Field().fill(groundZ) : null;
/** START: water over the bay. */
const startZ = (x, y) => Math.max(G.at(x, y), SED.SEA);
/** END: the bay filled to a plain, with the stream's channel across it. */
function endZ(x, y) {
  const g = G.at(x, y);
  const d = bayD(x, y);
  if (d < -44) return Math.max(g, SED.SEA);
  let z = Math.max(g, SED.TOP + 0.35 * fbm(sN.m, x / 18, y / 18, 3));
  const dc = cF.d.at(x, y);
  if (dc < 26 && d > -30) {
    const bed = dc < CH_W ? CH_LEVEL : CH_LEVEL + 0.4 + 0.12 * (dc - CH_W) + 0.006 * (dc - CH_W) ** 2;
    z = smin(z, bed, 0.8);
  }
  return z;
}

// near-edge section geometry (world x)
const floorAt = (x) => G.at(x, 0); // the basin floor (top of the older rock) where < SEA
const inBasin = (x) => floorAt(x) < SED.SEA - 0.05;
const wander = (i, x) => 1.4 * Math.sin(x / 53 + i * 1.7) + 0.9 * fbm(sN.f, x / 40 + i * 7, 3.1, 2);
/** Final tops of the beds at the near edge: [base, limestone, limestone with fossils, sandstone, marl (surface)]. */
function bedTops(x, hsEnd) {
  const zb = floorAt(x);
  if (zb >= SED.SEA - 0.05) return [hsEnd, hsEnd, hsEnd, hsEnd, hsEnd];
  return [zb, ...SED.BEDS.map((b, i) => clamp(b + wander(i, x), zb, hsEnd)), hsEnd];
}

/** The older rock: tilted beds, with a weathered skin under the unconformity. */
function oldRock(x, z, zTop) {
  const zz = oldBedZ(x, z);
  const k = Math.floor(zz / 11);
  let c = bedRock(SED.OLD[((k % 5) + 5) % 5], x, z, zz / 11 - k, sN.c);
  if (zTop !== null) {
    const q = zTop - z;
    if (q < 0.8) c = mul3(c, 0.66);
    else if (q < 3) c = mix3(c, hex('#8A6A55'), 0.3 * (1 - (q - 0.8) / 2.2));
  }
  return c;
}

/**
 * Fossil shells lying in the limestone, painted as shells rather than outlines: a domed
 * shell lit from the upper left like the face (light above-left, shade below-right), soft
 * growth ridges (an ammonite's coil, a bivalve's ribs) and a soft shadow on the rock below
 * it (multiplier on the rock colour).
 */
function fossils(x, z, density) {
  const cx = 22;
  const cz = 10;
  const i = Math.floor(x / cx);
  const j = Math.floor(z / cz);
  let k = 1;
  for (let dj = -1; dj <= 1; dj++)
    for (let di = -1; di <= 1; di++) {
      const ii = i + di;
      const jj = j + dj;
      if (hash2(ii, jj, 7) > density) continue;
      const r = 4.6 + 2.2 * hash2(ii, jj, 3);
      const fx = (ii + 0.3 + 0.4 * hash2(ii, jj, 1)) * cx;
      const fz = (jj + 0.35 + 0.3 * hash2(ii, jj, 2)) * cz;
      const dx = x - fx;
      const dz = z - fz;
      const d = Math.hypot(dx, dz);
      // the shadow it casts on the rock, below-right
      const sd = Math.hypot(dx - 0.5, dz + 0.7);
      if (d > r) {
        k *= 1 - 0.22 * (1 - ss(r * 0.75, r * 1.2, sd));
        continue;
      }
      const amm = hash2(ii, jj, 4) < 0.55;
      if (!amm && dz < -0.3 * r) continue;
      const a = Math.atan2(dz, dx);
      const nx = dx / r;
      const nz = dz / r;
      const lit = (-0.6 * nx + 0.8 * nz) * Math.sqrt(Math.max(0, 1 - (d / r) ** 2) + 0.15);
      const ridges = amm ? Math.cos(2 * Math.PI * ((d / r) * 1.3 - a / (2 * Math.PI) + hash2(ii, jj, 5))) * ss(0.15, 0.4, d / r) : Math.cos(a * 11) * ss(0.25, 0.6, d / r);
      const shell = 1.1 + 0.32 * lit + 0.15 * ridges;
      k *= mix(1, shell, 1 - ss(0.86, 1, d / r));
    }
  return k;
}

/** Sandstone: cross-bedded sets of inclined laminae. */
function crossBeds(x, z) {
  const set = Math.floor(z / 8 + 0.3 * sN.r(x / 40, 1.1));
  const dir = hash2(set, 3, 11) < 0.5 ? 1 : -1;
  const lam = (x * 0.45 * dir - (z - set * 8) * 1.1 + 4 * hash2(set, 1, 12)) / 3.2;
  const f = lam - Math.floor(lam);
  return 1 + 0.12 * (f < 0.2 ? -1 : 0.2) + 0.03 * sN.s(x / 1.2, z / 1.2) - (z - set * 8 < 0.6 ? 0.08 : 0);
}

function sedFace(filled, He) {
  return (x, z, hs) => {
    const zb = floorAt(x);
    if (!inBasin(x) || z < zb) {
      // the older rock (and on the shores the soil over it)
      const soil = !inBasin(x) && soilHorizon(x, z, hs);
      return soil || oldRock(x, z, inBasin(x) ? zb : null);
    }
    if (!filled) {
      // the bay's water in section: lighter under the surface, deeper blue-green below
      // painted with long horizontal strokes and soft mottling, darker toward the floor and
      // in the lee of the walls; a soft light band under the surface
      flags.emit = true;
      const dep = SED.SEA - z;
      let c = mix3(hex('#8DB5B4'), hex('#4F7F8C'), ss(0, 85, dep));
      c = mul3(c, 1 + 0.05 * T.STROKE(x / 18, z / 2.6) + 0.03 * T.STROKE(x / 6 + 20, z / 1.2) + 0.045 * fbm(sN.w, x / 46, z / 9, 3));
      c = mul3(c, 0.86 + 0.14 * ss(0, 12, z - zb));
      const wallNear = Math.max(ss(-3, 8, floorAt(x - 6) - z), ss(-3, 8, floorAt(x + 6) - z));
      c = mul3(c, 1 - 0.09 * wallNear);
      return mix3(c, hex('#AECBC4'), 0.4 * (1 - ss(0, 3, dep)));
    }
    const tops = bedTops(x, He.at(x, 0));
    let i = 0;
    while (i < 3 && z >= tops[i + 1]) i++;
    const lo = tops[i];
    const hi = tops[i + 1];
    const frac = (z - lo) / Math.max(0.5, hi - lo);
    let c = bedRock(SED.BED_COLORS[i], x, z, frac, sN.c);
    if (i <= 1) c = mul3(c, fossils(x, z, i === 1 ? 0.42 : 0.1));
    if (i === 2) c = mul3(c, crossBeds(x, z));
    if (i === 3) {
      // marl: soft, finely laminated
      c = mul3(c, 1 + 0.07 * Math.sin(z * 2.2 + 1.2 * fbm(sN.r, x / 26, z / 8, 2)));
      const soil = soilHorizon(x, z, hs);
      if (soil) return soil;
    }
    return c;
  };
}

function sedAlbedo(filled) {
  return (x, y, z, sl, cav) => {
    // the stream
    const ds = sF.d.at(x, y);
    if (ds < 8) {
      const s = sF.at.at(x, y);
      if (ds < streamW(s) - 0.2) {
        flags.flat = true;
        const rip = sN.s(x / 1.6, y / 0.9);
        return mix3(mix3(WATER, WATER_LT, clamp(0.35 + rip * 1.1, 0, 1)), SED.SILT, 0.45);
      }
    }
    const d = bayD(x, y);
    const g = G.at(x, y);
    if (!filled && g < SED.SEA - 0.02) {
      // the bay from above: sandy shallows by the beaches, blue-green open water
      flags.flat = true;
      const dep = SED.SEA - g;
      let c = mix3(SED.SHALLOW, SED.MID, ss(0.5, 26, dep));
      c = mix3(c, SED.DEEP, ss(26, 90, dep));
      // painted swell: long strokes across the bay, foreshortened
      const st = T.STROKE(x / 7, y / 1.3) + 0.5 * T.STROKE(x / 2.6 + 30, y / 0.7);
      c = mul3(c, 1 + 0.035 * st + 0.03 * fbm(sN.w, x / 60, y / 40, 2));
      return mix3(c, SED.WET_SAND, 0.55 * (1 - ss(0, 1.6, dep)));
    }
    let c = soilColor(sN.m, x, y);
    if (filled && d > -36 && z < SED.TOP + 0.9) {
      // the plain built by the stream over the old bay: sandy silt, damp along the
      // channel, with pale sand bars and the scars of abandoned channels
      const dc = cF.d.at(x, y);
      if (dc < CH_W - 0.2) {
        flags.flat = true;
        const rip = sN.s(x / 1.6, y / 0.9);
        return mix3(mix3(WATER, WATER_LT, clamp(0.35 + rip * 1.1, 0, 1)), SED.SILT, 0.3);
      }
      let p = mix3(mix3(SAND, SOIL, 0.45), DRYGRASS, clamp(0.25 + 0.8 * fbm(sN.m, x / 26, y / 26, 3), 0, 0.6));
      p = mix3(p, SOIL_DK, 0.35 * (1 - ss(CH_W, 22, dc)));
      p = mix3(p, SAND_LT, 0.55 * (1 - ss(CH_W + 1, CH_W + 7, dc)) * ss(-0.1, 0.25, sN.s(x / 9, y / 9)));
      // abandoned channels: faint, damper and a little greener
      for (const o of oF) p = mix3(p, mix3(mul3(p, 0.9), DRYGRASS, 0.3), 0.5 * (1 - ss(2, 5.5, o.d.at(x, y))));
      c = mix3(c, p, ss(-36, -6, d));
    } else if (!filled && d > -44 && g < SED.SEA + 1.6) {
      // wet sand at the water's edge
      c = mix3(c, mix3(SED.WET_SAND, SAND, ss(0.4, 1.6, g - SED.SEA)), 1 - ss(0.6, 1.6, g - SED.SEA));
    }
    // the hills: the older rock bared on steep, eroding slopes, its tilted beds showing
    const steep = ss(0.3, 0.56, sl + 0.15 * fbm(sN.r, x / 8, y / 8, 3));
    if (steep > 0) {
      const old = mix3(oldRock(x + y * 0.4, z, null), rockColor(sN.r, x, y, cav), 0.35);
      c = mix3(c, mul3(old, 1.08), 0.75 * steep * (1 - ss(0.5, 3, cav)));
    }
    // pale scree and wash at the foot of the slopes
    const wash = ss(0.08, 0.2, sl) * (1 - ss(0.26, 0.4, sl)) * ss(0.5, 2.5, cav) * ss(150, 200, y);
    if (wash > 0) c = mix3(c, mix3(GRAVEL, SOIL, 0.4), wash * 0.6);
    // stream banks: gravel bars and damp ground
    if (ds < 12) c = mix3(mul3(c, mix(0.86, 1, ss(4, 12, ds))), GRAVEL, (1 - ss(4, 8, ds)) * 0.3 * ss(-0.2, 0.3, sN.s(x / 6, y / 6)));
    return mul3(c, 1 + 0.08 * sN.f(x / 1.4, y / 1.4));
  };
}

function sedScatters(L, filled) {
  const water = (x, y) => (!filled && G.at(x, y) < SED.SEA + 0.3) || sF.d.at(x, y) < streamW(sF.at.at(x, y)) + 0.8;
  return [
    new Scatter({
      seed: 41,
      spacing: 2.4,
      size: (r) => 0.6 + r() * 0.8,
      palette: SHRUBS,
      density: (x, y) => {
        if (water(x, y)) return 0;
        const sl = L.slope.at(x, y);
        const cv = L.cav.at(x, y);
        let d = 0.32 * ss(0, 0.35, fbm(sN.g, x / 18, y / 18, 3)) + clamp(cv * 0.6, -0.3, 0.6);
        d *= (1 - ss(0.3, 0.55, sl) * 0.85) * (1 - 0.55 * ss(190, 270, y));
        // the new plain over the old bay is still sparse
        if (filled && bayD(x, y) > -6) {
          // scrub has spread over the new plain, thicker in the swales of old channels and by the channel
          const swale = Math.max(...oF.map((o) => 1 - ss(2, 7, o.d.at(x, y))));
          const dc = cF.d.at(x, y);
          d = (0.2 * ss(0, 0.4, fbm(sN.g, x / 22, y / 22, 3) + 0.2) + 0.35 * swale) * ss(CH_W + 0.5, CH_W + 2, dc) + 0.5 * (1 - ss(CH_W + 2, 9, dc)) * ss(CH_W + 0.5, CH_W + 1.5, dc);
        }
        return clamp(d, 0, 0.7);
      },
    }),
    new Scatter({
      seed: 42,
      spacing: 2.2,
      size: (r) => 0.8 + r() * 0.8,
      palette: RIPARIAN,
      density: (x, y) => {
        const ds = sF.d.at(x, y);
        if (water(x, y)) return 0;
        const s = streamW(sF.at.at(x, y));
        return ds > s + 0.8 && ds < s + 7 ? 0.55 : 0;
      },
    }),
    // stones and blocks shed by the eroding hills
    new Scatter({
      seed: 43,
      spacing: 1.8,
      size: (r) => 0.45 + r() * 0.9,
      palette: STONES,
      shadow: 0.5,
      sharp: 0.14,
      light: 0.42,
      density: (x, y) => {
        if (water(x, y)) return 0;
        const sl = L.slope.at(x, y);
        return 0.3 * ss(0.12, 0.3, sl) * (1 - ss(0.4, 0.55, sl)) * ss(170, 220, y);
      },
    }),
  ];
}

function sedScene(filled) {
  const H = new Field().fill(filled ? endZ : startZ);
  const L = lighting(H);
  return { H, L, filled, world: !filled, scatters: sedScatters(L, filled), albedo: sedAlbedo(filled), face: null };
}

// ── AUX: what the shader needs ──────────────────────────────────────────────
/**
 * sediment-aux.png, 640 × 366, raw data (no colour profile; read with LINEAR
 * filtering):
 *   rows 0…359 — one texel per viewBox unit of the frame:
 *     R, G  flow phase: 0.5 + 0.5·(cos φ, sin φ), φ = 2π · (distance downstream) / FLOW_TURN,
 *           along the stream and on across the bay along the delta's axis (the plume);
 *           a unit vector, so the phase survives filtering and 8 bits (0.5, 0.5 where w = 0).
 *     B     the shoreline's order across the bay (START water): 0 = never water,
 *           ≈0 by the mouth and the inner beaches … 1 at the near edge, which fills last
 *           (the delta front, lobe-shaped around its axis from the mouth).
 *           Copied down into the cut's rows from the surface above (unused there).
 *     A     flow weight w as 128 + 127·w: 1 on the stream, the plume's lobe in the bay, 0
 *           elsewhere (never below 128, so no browser can lose R, G, B to premultiplying).
 *   row 360 — a copy of row 359 (keeps the frame's bottom row clear of the table)
 *   rows 361…365 — per viewBox column, the near-edge section: the final (compacted) tops
 *     Z0…Z4 = basin floor, limestone, limestone with fossils, sandstone, marl (surface),
 *     as 16-bit z (R = whole units, G = 1/256 units). Columns outside the basin: all equal.
 */
const FLOW_TURN = 64;
const AUX_H = 366;
// the delta's axis: from the mouth toward where its channel leaves the near edge
const AXIS = (() => {
  const e = CHANNEL[CHANNEL.length - 1];
  const len = Math.hypot(e[0] - MOUTH[0], e[1] - MOUTH[1]);
  return { dx: (e[0] - MOUTH[0]) / len, dy: (e[1] - MOUTH[1]) / len, len };
})();
/** Position in the delta's frame: u along the axis from the mouth, v across it. */
function deltaUV(x, y) {
  const rx = x - MOUTH[0];
  const ry = y - MOUTH[1];
  return [rx * AXIS.dx + ry * AXIS.dy, ry * AXIS.dx - rx * AXIS.dy];
}
/**
 * The delta at "size" a: a lobe from the mouth along its axis, a long and 0.55·a + 24
 * wide (behind the mouth it reaches only a / 1.8). The size at which it covers (u, v).
 */
function lobeSize(u, v) {
  const ue = u >= 0 ? u : -u * 1.8;
  let lo = 0;
  let hi = 2000;
  for (let n = 0; n < 40; n++) {
    const a = (lo + hi) / 2;
    if ((ue / a) ** 2 + (v / (0.55 * a + 24)) ** 2 > 1) lo = a;
    else hi = a;
  }
  return hi;
}
// max = 1, and the strip by the cut stays below 0.98, so the front (o = 1 at the end of the shore window) passes every point
const ORDER = { max: 1, scale: 170 };
function orderAt(x, y) {
  // the delta grows as a lobe from the mouth along its channel: its tongue runs ahead
  // toward the near edge and it widens behind it, so the side shores fill later; the
  // band along the cut fills last, from the delta's axis out to the corners; the
  // waterline wanders in small lobes
  const [u, v] = deltaUV(x, y);
  const a = lobeSize(u, v) * (1 + 0.16 * fbm(sN.s, x / 40, y / 40, 3) + 0.06 * fbm(sN.s, x / 13 + 7, y / 13, 2));
  // o = ORDER.max · (1 − e^(−a / ORDER.scale)): RockVisuals.tsx inverts it to the delta's size in
  // world units, in which it draws the waterline, the shoal and the plume
  const o = Math.max(ORDER.max * (1 - Math.exp(-a / ORDER.scale)), (1 - ss(0, 40, y)) * (0.9 + 0.08 * Math.min(1, Math.abs(v) / 230)));
  return clamp(o, 0.02, 0.99);
}
function flowAt(x, y, bay) {
  const ds = sF.d.at(x, y);
  const s = sF.at.at(x, y);
  const w = streamW(s);
  if (ds < w + 1.5 && s < sF.len - 0.5) return [(2 * Math.PI * s) / FLOW_TURN, 1 - ss(w - 0.6, w + 1.5, ds)];
  if (!bay) return [0, 0];
  // the plume: carried on from the mouth along the delta's axis, fanning out
  const [u, v] = deltaUV(x, y);
  const uu = Math.max(0, u);
  return [(2 * Math.PI * (sF.len + uu)) / FLOW_TURN, Math.exp(-((v / (40 + 0.8 * uu)) ** 2))];
}
// ── AUX maps: shared writing (both scenes) ──────────────────────────────────
/** A 16-bit table value (R = whole units, G = 1/256, B 0, A 255) at a row, one texel per viewBox column. */
function put16(buf, row, ax, v) {
  const q = clamp(Math.round(v * 256), 0, 65535);
  const k = (row * VB_W + ax) * 4;
  buf[k] = q >> 8;
  buf[k + 1] = q & 255;
  buf[k + 2] = 0;
  buf[k + 3] = 255;
}
/**
 * Saves an AUX map (VB_W × height, raw RGBA, no colour profile): row VB_H becomes a copy of the
 * frame's last row (keeps the frame clear of the tables below it under LINEAR filtering). With
 * --preview also a picture of the frame rows' data, vis(k) → [r, g, b] for texel k.
 */
async function writeAux(buf, height, name, vis) {
  buf.copy(buf, VB_H * VB_W * 4, (VB_H - 1) * VB_W * 4, VB_H * VB_W * 4);
  const file = path.join(OUT, `${name}-aux.png`);
  await sharp(buf, { raw: { width: VB_W, height, channels: 4 } }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(file);
  console.log(path.relative(root, file), Math.round(fs.statSync(file).size / 1024) + ' KB');
  if (!PREVIEW) return;
  fs.mkdirSync(PREVIEW, { recursive: true });
  const pic = Buffer.alloc(VB_W * VB_H * 3);
  for (let k = 0; k < VB_W * VB_H; k++) pic.set(vis(k), k * 3);
  await sharp(pic, { raw: { width: VB_W, height: VB_H, channels: 3 } }).png().toFile(path.join(PREVIEW, `${name}-aux-vis.png`));
}

async function sedAux(img, He, name) {
  const AW = VB_W;
  const buf = Buffer.alloc(AW * AUX_H * 4);
  const set = (ax, ay, r, g, b, w) => {
    const k = (ay * AW + ax) * 4;
    buf[k] = clamp(Math.round(r * 255), 0, 255);
    buf[k + 1] = clamp(Math.round(g * 255), 0, 255);
    buf[k + 2] = clamp(Math.round(b * 255), 0, 255);
    buf[k + 3] = 128 + clamp(Math.round(w * 127), 0, 127);
  };
  const W = img.world;
  for (let ax = 0; ax < AW; ax++) {
    let above = 0;
    for (let ay = 0; ay < VB_H; ay++) {
      const px = Math.min(IW - 1, Math.round((ax + 0.5) * S));
      const py = Math.min(IH - 1, Math.round((ay + 0.5) * S));
      const k = py * IW + px;
      let fx = 0.5;
      let fy = 0.5;
      let fw = 0;
      let o = 0;
      if (img.id[k] === 1) {
        const x = W.x[k];
        const y = W.y[k];
        const bay = G.at(x, y) < SED.SEA - 0.02;
        if (bay) o = orderAt(x, y);
        const [ph, w] = flowAt(x, y, bay);
        if (w > 0.004) {
          fx = 0.5 + 0.5 * Math.cos(ph);
          fy = 0.5 + 0.5 * Math.sin(ph);
          fw = w;
        }
        above = o;
      } else if (img.id[k] === 2) o = above;
      set(ax, ay, fx, fy, o, fw);
    }
  }
  const tops = [];
  for (let ax = 0; ax < AW; ax++) {
    const x = NEAR_X0 + ax + 0.5;
    const t = bedTops(x, He.at(x, 0));
    tops.push(t);
    t.forEach((z, i) => put16(buf, VB_H + 1 + i, ax, z));
  }
  // the preview: flow phase as hue-ish, order as blue
  await writeAux(buf, AUX_H, name, (k) => [buf[k * 4], buf[k * 4 + 1], buf[k * 4 + 2]]);
  return tops;
}

function sedAnchors(tops) {
  const r = (v) => Math.round(v * 10) / 10;
  const col = (X) => tops[Math.floor(X)].map(r);
  const ov = (p) => p.map(r);
  return {
    // per viewBox column: final tops Z0…Z4 (z; viewBox y = 358 − z)
    // o: the shoreline order of the bay just behind the cut in that column (when the water over it is gone)
    arrow: { x: 190, z: col(190), o: Math.round(orderAt(NEAR_X0 + 190.5, 1) * 1000) / 1000 },
    labels: { x: 320, z: col(320) },
    mouth: ov(vb(MOUTH[0], MOUTH[1], SED.SEA)),
    channelOut: ov(vb(CHANNEL[CHANNEL.length - 2][0], 0, SED.TOP)),
    basin: (() => {
      let a = -1;
      let b = -1;
      for (let X = 0; X < VB_W; X++)
        if (tops[X][0] < SED.SEA - 0.05) {
          if (a < 0) a = X;
          b = X;
        }
      return [a, b];
    })(),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// METAMORPHIC — a mountain belt seen obliquely: its folded ridges run back from
// the viewer into a high range and plunge out onto a plateau that rests on flat
// beds of limestone (with fossils) and dark shale, open in the cut. The squeeze
// from both sides folds the beds in the cut and lifts the ridges out to the
// near edge (END); there the limestone has become marble and the shale slate.
// ════════════════════════════════════════════════════════════════════════════
const MET = {
  PLAIN: 118, // the plateau over the flat beds
  // The deformation of the cut (RockVisuals.tsx MET copies XC, K, TH, WTOP, ZT, BASE): a point (X, Z) of
  // the flat beds is, at fold progress f, at x = XC + (X − XC)(1 − K·f) and
  // z = Z(1 + TH·f) + f·Fd·(1 + (WTOP − 1)·Z / ZT), Fd = the fold at depth in its final column
  // (XC + (X − XC)(1 − K)). The section shortens by K, thickens a little, and folds — most at
  // depth, gently at the surface, which rises over the anticlines.
  XC: 320,
  K: 0.12,
  TH: 0.05,
  WTOP: 0.26,
  ZT: 120,
  // the folds at f = 1 (final columns), each its own: c its crest, a its height at depth, wW / wE
  // the widths of its west / east limbs — both lean east (the east limb steeper), the eastern one
  // larger; open synclines between them and at the sides
  FOLDS: [
    { c: 168, a: 46, wW: 112, wE: 70 },
    { c: 472, a: 66, wW: 150, wE: 84 },
  ],
  // small parasitic folds on the long west limb of the eastern anticline (z-shaped, leaning east)
  PARASITIC: { x0: 356, x1: 446, wl: 30, a: 3 },
  // the rock under the base, lifted into the anticlines' cores, continues the sequence downward:
  // below BASE.at it is the rock BASE.repeat units higher (a limestone under the basal shale)
  BASE: { at: 1.2, repeat: 47 },
  // the beds, base → top: [material top z, 1 = limestone / 0 = shale, fossil density]
  BEDS: [
    [12, 0, 0],
    [30, 1, 0.5],
    [36, 0, 0],
    [47, 1, 0.12],
    [59, 0, 0],
    [79, 1, 0.48],
    [86, 0, 0],
    [93, 1, 0.08],
    [99, 0, 0],
    [110, 1, 0.1],
    [1e9, 0, 0],
  ],
  FOSSIL_SCALE: 1.45,
  LIME: hex('#CBC2AA'),
  SHALE: hex('#878072'),
  MARBLE: hex('#D4D0C6'),
  SLATE: hex('#676E78'),
  VEIL: hex('#B4B3AE'),
  // the ridges of the belt (anticlines, axes along y), plunging out toward the viewer; the two in
  // the middle sit over the cut's anticlines (world x = viewBox x + 180)
  RIDGES: [
    { x: 48, w: 50, h: 64, y0: 90, y1: 290, s: 0 },
    { x: 348, w: 44, h: 68, y0: 52, y1: 272, s: 2 },
    { x: 652, w: 52, h: 82, y0: 44, y1: 266, s: 4 },
    { x: 952, w: 50, h: 66, y0: 90, y1: 290, s: 6 },
  ],
};
const mN = { b: makeNoise(5202), c: makeNoise(5303), d: makeNoise(5404), e: makeNoise(5505), f: makeNoise(5606), g: makeNoise(5707), m: makeNoise(5808), r: makeNoise(5909), s: makeNoise(6010), v: makeNoise(6111) };
const smax = (a, b, k) => -smin(-a, -b, k);

// ── the deformation (the shader in RockVisuals.tsx performs the same) ──────
/** Material beyond the frame's sides is the mirror image of the material inside. */
const mirrorX = (X) => (X < 0 ? -X : X > VB_W ? 2 * VB_W - X : X);
/** Material below the base continues the sequence downward (RockVisuals.tsx baseZ() is the same). */
const baseZ = (Z) => (Z < MET.BASE.at ? MET.BASE.at + ((((Z - MET.BASE.at) % MET.BASE.repeat) + MET.BASE.repeat) % MET.BASE.repeat) : Z);
const unfoldX = (x, f) => MET.XC + (x - MET.XC) / (1 - MET.K * f);
const foldZ = (Z, Fd, f) => Z * (1 + MET.TH * f) + f * Fd * (1 + ((MET.WTOP - 1) * Z) / MET.ZT);
const unfoldZ = (z, Fd, f) => (z - f * Fd) / (1 + MET.TH * f + (f * Fd * (MET.WTOP - 1)) / MET.ZT);
/**
 * The fold at depth (Z = 0) at f = 1, per final viewBox column: two anticlines of their own size,
 * rounded at the crest and leaning east (a short steep east limb, a long west one), parasitic folds
 * on one limb. Never negative — the anticlines grow up from the base, the synclines stay on it — so
 * no rock that is in view ever moves below the frame (its final place is always in the END painting).
 */
function foldAt(x1) {
  const P = MET.PARASITIC;
  let fd = mainFold(x1);
  if (x1 > P.x0 && x1 < P.x1) {
    const ph = (2 * Math.PI * (x1 - P.x0)) / P.wl;
    fd += P.a * Math.sin(Math.PI * ((x1 - P.x0) / (P.x1 - P.x0))) ** 2 * Math.sin(ph + 0.3 * Math.sin(ph));
  }
  return fd;
}
/** The two anticlines and the synclines between them, without the parasitic folds. */
function mainFold(x1) {
  let fd = 4;
  for (const F of MET.FOLDS) {
    const u = (x1 - F.c) / (x1 < F.c ? F.wW : F.wE);
    fd += F.a * Math.exp(-1.35 * u * u - 0.12 * u * u * u * u);
  }
  return fd;
}
/** How much a final column lies in a hinge of the main folds (1, crest or trough) rather than on a limb (0). */
const hingeAt = (x1) => 1 - ss(0.1, 0.4, Math.abs(mainFold(x1 + 1) - mainFold(x1 - 1)) / 2);

// ── the beds ────────────────────────────────────────────────────────────────
// the contacts wander and the beds pinch and swell a little (each contact on its own)
const mWander = (i, X) => 1.6 * Math.sin(X / 57 + i * 2.1) + 1.5 * fbm(mN.f, X / 34 + i * 7, 5.3, 3);
/**
 * The bed at material point (X, Z ≥ 0): lithology (1 limestone, 0 shale), fossil density, position
 * in the bed. shift(i, lime) (optional) moves the top of bed i — the END painting's pinch and swell.
 */
function bedAt(X, Z, shift = null) {
  let lo = 0;
  for (let i = 0; i < MET.BEDS.length; i++) {
    const [b, lime, fos] = MET.BEDS[i];
    const top = i < MET.BEDS.length - 1 ? Math.max(lo + 0.8, b + mWander(i, X) + (shift ? shift(i, lime) : 0)) : b;
    if (Z < top) return { i, lime, fos, frac: (Z - lo) / Math.min(40, top - lo), mid: (lo + Math.min(top, lo + 40)) / 2 };
    lo = top;
  }
  return null;
}
/**
 * Limestone breaks into blocks along joints across its bed: each block a little lighter or darker,
 * lit on its left side, its right side turning into the shade of the joint.
 */
function blocks(X, Z, i, frac) {
  const u = (X + 9 * fbm(mN.s, Z / 7 + i, X / 40, 2)) / (19 + 12 * hash2(i, 0, 41)) + hash2(i, 1, 42);
  const k = Math.floor(u);
  const fu = u - k;
  // some blocks jut out (a bright lip along the top), others have weathered back
  const lip = 0.02 + 0.1 * hash2(k, i, 44);
  return (1 + 0.06 * (hash2(k, i, 43) - 0.5)) * (1 + 0.05 * (1 - ss(0, 0.08, fu)) - 0.1 * ss(0.9, 1, fu)) * (1 + lip * ss(0.8, 0.98, frac));
}
/** START: the flat beds as they were laid down — limestone with fossils, dark fissile shale. */
function flatBeds(X, Z) {
  const b = bedAt(X, Z);
  // the hard limestone stands out in ledges, lit along their tops; the soft shale weathers back
  // into the shade under the ledge above it
  if (b.lime) {
    // the shells larger than in the sedimentary scene (the shared fossils(), drawn at FOSSIL_SCALE),
    // so their flattening reads at the figure's size
    const c = mul3(bedRock(MET.LIME, X, Z, b.frac, mN.c), fossils(X / MET.FOSSIL_SCALE, Z / MET.FOSSIL_SCALE, b.fos) * blocks(X, Z, b.i, b.frac));
    return mul3(c, 1 - 0.07 * (1 - ss(0, 0.22, b.frac)));
  }
  let c = mul3(MET.SHALE, 1 + 0.07 * fbm(mN.c, X / 9, Z / 2.5, 3) + 0.05 * Math.sin(Z * 2.9 + 1.4 * fbm(mN.r, X / 30, Z / 6, 2)));
  // crumbly chips and thin partings
  c = mul3(c, 1 + 0.09 * (ridged(mN.v, X / 2.4, Z / 1.2, 2) - 0.5));
  if (Math.abs(mN.s(X / 14, Z / 0.9)) < 0.03) c = mul3(c, 0.9);
  return mul3(c, 1 - 0.17 * ss(0.5, 1, b.frac) + 0.05 * (1 - ss(0, 0.3, b.frac)));
}
/**
 * A mosaic of grains (cells sx × sz, jittered): each grain a facet lit from the upper left, a
 * little lighter or darker than its neighbours — light and shade, no rims.
 */
function grains(x, z, sx, sz, seed) {
  const i0 = Math.floor(x / sx);
  const j0 = Math.floor(z / sz);
  let best = Infinity;
  let bi = 0;
  let bj = 0;
  let bx = 0;
  let bz = 0;
  for (let dj = -1; dj <= 1; dj++)
    for (let di = -1; di <= 1; di++) {
      const i = i0 + di;
      const j = j0 + dj;
      const cx = (i + 0.15 + 0.7 * hash2(i, j, seed)) * sx;
      const cz = (j + 0.15 + 0.7 * hash2(i, j, seed + 1)) * sz;
      const d = ((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2;
      if (d < best) {
        best = d;
        bi = i;
        bj = j;
        bx = (x - cx) / sx;
        bz = (z - cz) / sz;
      }
    }
  const tilt = (hash2(bi, bj, seed + 2) - 0.5) * 2;
  return 1 + 0.07 * (hash2(bi, bj, seed + 3) - 0.5) + 0.045 * tilt * (-0.6 * bx + 0.8 * bz);
}
/** Slate: split along fine cleavage planes perpendicular to the squeeze (vertical) — each sliver lit on its left edge. */
function cleavage(x, z) {
  const u = x / 3.3 + 0.5 * fbm(mN.s, x / 26, z / 14, 2);
  const k = Math.floor(u);
  const fu = u - k;
  // each sliver changes only slowly along its length (no steps across it)
  const w = 0.7 + 0.6 * clamp(0.5 + 1.4 * fbm(mN.v, k * 1.37, z / 30, 2), 0, 1);
  return 1 + 0.08 * w * (0.5 - fu) * 2 * (1 - 0.7 * ss(0.85, 1, fu)) + 0.06 * fbm(mN.r, k * 2.11 + 7, z / 24, 2);
}
/** END: the beds folded and recrystallised — banded marble and slate; (x, z) final, (X, Z) material. */
function metaBeds(x, z, X, Z) {
  // the marble has flowed into the hinges and thinned on the limbs (most at depth, where the folds
  // are tight), and each contact pinches and swells on its own
  const sw = (2.4 * hingeAt(x) - 1.1) * (1 + ((MET.WTOP - 1) * Z) / MET.ZT);
  const b = bedAt(X, Z, (i, lime) => (lime ? sw : -sw) + 3.2 * fbm(mN.v, x / 70 + i * 5.3, 2.2, 2));
  // relict bedding: faint bands that follow the folded beds
  const band = 1 + 0.05 * Math.sin(Z * 1.6 + 2 * fbm(mN.r, X / 25, Z / 5, 2));
  if (b.lime) {
    // marble: pale and sugary, grains a little drawn out along the cleavage, faint grey veils, each
    // bed its own shade; it stands proud — lit along its top, shaded underneath
    let c = mul3(MET.MARBLE, (0.94 + 0.08 * hash2(b.i, 0, 51)) * band * grains(x, z, 2.6, 3.5, 31) * (1 + 0.04 * fbm(mN.c, x / 12, z / 6, 3)));
    c = mix3(c, MET.VEIL, 0.2 * hash2(b.i, 1, 52) + 0.3 * ss(0.12, 0.42, fbm(mN.g, X / 40, Z / 2.6, 3)));
    return mul3(c, 1 + 0.13 * ss(0.8, 0.98, b.frac) - 0.13 * (1 - ss(0, 0.22, b.frac)));
  }
  // slate: everything in it runs along the cleavage — its texture and the face's relief (no fine
  // banding across it, which would weave a grid); recessed into the shade under the marble ledge
  // above it, a little light at its foot
  flags.cleaved = true;
  const c = mul3(MET.SLATE, (0.92 + 0.12 * hash2(b.i, 0, 53)) * cleavage(x, z) * (1 + 0.05 * fbm(mN.c, x / 8, z / 22, 3)) * (1 + 0.03 * mN.v(x / 1.1, z / 9)));
  return mul3(c, 1 - 0.16 * ss(0.5, 1, b.frac) + 0.05 * (1 - ss(0, 0.3, b.frac)));
}
function metFace(final) {
  return (x, z, hs) => {
    const soil = soilHorizon(x, z, hs);
    if (soil) return soil;
    const xv = x - NEAR_X0;
    if (!final) return flatBeds(xv, z);
    const Z = unfoldZ(z, foldAt(xv), 1);
    return metaBeds(xv, z, mirrorX(unfoldX(xv, 1)), baseZ(Z));
  };
}

// ── the land ────────────────────────────────────────────────────────────────
/** The belt's anticlinal ridges (smooth form, for the bedding on their flanks) and the full relief. */
function ridgeForm(x, y, R) {
  const xc = R.x + 10 * fbm(mN.e, y / 95 + R.s, 2.7, 2);
  const along = ss(R.y0, R.y1, y + 16 * fbm(mN.e, x / 70 + R.s, y / 70, 2));
  // summits and saddles along the crest
  return { dx: x - xc, A: R.h * along * clamp(0.72 + 0.9 * fbm(mN.e, y / 46 + R.s, 9.1, 3), 0.35, 1.25) };
}
function beltZ(x, y) {
  const warp = 12 * fbm(mN.e, x / 50, y / 50, 2);
  let z = 0;
  for (const R of MET.RIDGES) {
    const { dx, A } = ridgeForm(x, y, R);
    if (A <= 0 || Math.abs(dx) > R.w * 4) continue;
    const prof = Math.exp(-Math.pow(Math.abs(dx) / R.w, 1.45));
    // spurs and gullies down both flanks (across the ridge), finer rills within
    const spur = ridged(mN.c, (Math.abs(dx) + warp) / 105 + R.s, (y + warp) / 60, 3);
    const rill = ridged(mN.g, (Math.abs(dx) + 2 * warp) / 36 + R.s, y / 21, 2);
    const flank = Math.sqrt(prof) * (1 - prof) * (1 - ss(2.6 * R.w, 3.8 * R.w, Math.abs(dx)));
    z += A * prof + 0.7 * A * flank * (spur - 0.45) - 0.1 * A * flank * rill * rill + 2.4 * prof * fbm(mN.d, x / 15, y / 15, 3) + 3 * prof * prof * (ridged(mN.g, x / 26, y / 26, 2) - 0.5);
  }
  // the high range across the back, where the ridges rise into the belt's core
  const yc = 318 + 9 * Math.sin(x / 120 + 1) + 8 * fbm(mN.e, x / 80, 3.3, 2);
  const dy = y - yc;
  const prof = Math.exp(-Math.pow(Math.abs(dy) / 46, 1.4));
  const A = 70 * clamp(0.72 + 0.9 * fbm(mN.e, x / 70, 7.7, 3), 0.3, 1.25);
  const spur = ridged(mN.c, (dy + warp) / 100 + 9, (x + warp) / 66, 3);
  const flank = Math.sqrt(prof) * (1 - prof);
  const range = A * prof + 0.75 * A * flank * (spur - 0.45) + 3 * prof * prof * (ridged(mN.g, x / 24, y / 24, 2) - 0.5);
  return smax(z, range, 12);
}
/** The bedding the land is carved from: flat under the plateau, arched in the ridges (height of a bed surface). */
function structureZ(x, y) {
  let s = 0;
  for (const R of MET.RIDGES) {
    const { dx, A } = ridgeForm(x, y, R);
    if (A > 0) s += 0.72 * A * Math.exp(-((dx / (R.w * 1.35)) ** 2));
  }
  return s;
}
/** A dry wash down the middle valley (over the syncline), its course and the carving. */
const washX = (y) => 500 + 12 * Math.sin(y / 53 + 0.8) + 6 * Math.sin(y / 21 + 2.1);
function metGroundZ(x, y) {
  // the plateau, weathered into low steps along its flat beds: a ledge of rock, then a gentle bench
  const r = 1.6 * fbm(mN.b, x / 30, y / 30, 3) + 7 * fbm(mN.d, x / 120 + 5, y / 110, 3);
  const k = Math.floor(r / 3.2);
  const stepped = 3.2 * (k + ss(0.55, 0.92, r / 3.2 - k));
  let z = MET.PLAIN + mix(r, stepped, 0.85 * ss(10, 40, y)) + beltZ(x, y);
  const dw = Math.abs(x - washX(y)) + 1.5 * fbm(mN.r, y / 9, 2.2, 2);
  if (dw < 40) z -= 3.2 * (1 - ss(6, 22, dw)) * (1 - 0.5 * ss(140, 280, y));
  return z;
}
const M0 = ONLY === 'all' || ONLY === 'metamorphic' ? new Field().fill(metGroundZ) : null;
/** START's top at a material column (beyond the frame: mirrored, like the material). */
const metTop0 = (X) => M0.at(mirrorX(X) + NEAR_X0, 0);
/** The near edge's top at f = 1 in final column xv: the top of the material stack, folded. */
const metTop1 = (xv) => foldZ(metTop0(unfoldX(xv, 1)), foldAt(xv), 1);
/**
 * END's land: the ridges have grown out to the near edge. U = the rise of the cut's top line at
 * the near edge (exactly, so the cut and the land meet), fading over the plateau toward the
 * plunging ridges behind.
 */
function metRise(x, y) {
  const xv = clamp(x - NEAR_X0, 0, VB_W);
  const r = metTop1(xv) - M0.at(xv + NEAR_X0, 0);
  return r * (1 - ss(18, 180, y + 22 * fbm(mN.e, x / 60 + 3, y / 60, 2) * ss(0, 30, y)));
}

const M_LIME_FIELD = hex('#D2CCBE');
const M_SHALE_FIELD = hex('#7E776B');
function metAlbedo(x, y, z, sl, cav) {
  let c = soilColor(mN.m, x, y);
  // the dry wash: a pale gravel bed with darker banks
  const dw = Math.abs(x - washX(y)) + 1.5 * fbm(mN.r, y / 9, 2.2, 2);
  if (dw < 18) c = mix3(mix3(c, SOIL_DK, 0.25 * (1 - ss(6, 18, dw))), mix3(GRAVEL, SOIL, 0.35), (1 - ss(3, 6.5, dw + 2 * mN.s(x / 5, y / 7))) * (0.55 + 0.3 * ss(-0.2, 0.3, mN.s(x / 3, y / 3))));
  // bare rock on steep slopes, the beds showing: flat under the plateau, arched in the ridges
  const steep = ss(0.15, 0.36, sl + 0.15 * fbm(mN.r, x / 8, y / 8, 3));
  if (steep > 0) {
    const zb = z - structureZ(x, y);
    const b = bedAt(x - NEAR_X0, ((zb % 110) + 110) % 110);
    const rock = mix3(rockColor(mN.r, x, y, cav), b.lime ? M_LIME_FIELD : M_SHALE_FIELD, 0.6);
    c = mix3(c, mul3(rock, 1.04), 0.85 * steep * (1 - ss(0.5, 3, cav)));
  }
  // pale scree and wash at the foot of the slopes
  const wash = ss(0.08, 0.2, sl) * (1 - ss(0.26, 0.4, sl)) * ss(0.5, 2.5, cav);
  if (wash > 0) c = mix3(c, mix3(GRAVEL, SOIL, 0.4), wash * 0.55);
  return mul3(c, 1 + 0.08 * mN.f(x / 1.4, y / 1.4));
}
/** Scatters placed once from START's terrain, so the same shrubs and stones stand in both paintings. */
function metScatters(L) {
  return [
    new Scatter({
      seed: 61,
      spacing: 2.4,
      size: (r) => 0.6 + r() * 0.8,
      palette: SHRUBS,
      density: (x, y) => {
        const sl = L.slope.at(x, y);
        const cv = L.cav.at(x, y);
        let d = 0.3 * ss(0, 0.35, fbm(mN.g, x / 18, y / 18, 3)) + clamp(cv * 0.6, -0.3, 0.6);
        d *= (1 - ss(0.3, 0.55, sl) * 0.85) * (1 - 0.5 * ss(190, 300, y));
        const dw = Math.abs(x - washX(y));
        if (dw < 5) d = 0;
        else if (dw < 11) d += 0.25;
        return clamp(d, 0, 0.7);
      },
    }),
    new Scatter({
      seed: 63,
      spacing: 1.8,
      size: (r) => 0.45 + r() * 0.9,
      palette: STONES,
      shadow: 0.5,
      sharp: 0.14,
      light: 0.42,
      density: (x, y) => {
        const sl = L.slope.at(x, y);
        return 0.3 * ss(0.12, 0.3, sl) * (1 - ss(0.4, 0.55, sl)) * ss(120, 200, y) + (Math.abs(x - washX(y)) < 4 ? 0.12 : 0);
      },
    }),
  ];
}
function metScenes() {
  const H0 = M0;
  const L0 = lighting(H0);
  const scatters = metScatters(L0);
  const H1 = new Field().fill((x, y) => H0.at(x, y) + metRise(x, y));
  const L1 = lighting(H1);
  return {
    start: { H: H0, L: L0, world: true, scatters, albedo: metAlbedo, face: metFace(false) },
    end: { H: H1, L: L1, world: false, scatters, albedo: metAlbedo, face: metFace(true) },
  };
}

// ── AUX ─────────────────────────────────────────────────────────────────────
/**
 * metamorphic-aux.png, 640 × 363, raw data (no colour profile; read with LINEAR filtering):
 *   rows 0…359 — one texel per viewBox unit of the frame:
 *     R  the land's rise at f = 1 as a screen offset d (viewBox units, up), 0.5 + d / 64 — on the
 *        land; copied down into the cut's rows from the land above (unused there)
 *     G  limestone (1) or shale (0) — in the cut (START, i.e. the material frame); copied up into
 *        the land's rows from the cut's top
 *     B  the middle of the bed (material z / 128) — in the cut; copied up like G
 *     A  255
 *   row 360 — a copy of row 359 (keeps the frame's bottom row clear of the table)
 *   row 361 — per viewBox column x: START's top of the cut (z), 16-bit (R = whole units, G = 1/256)
 *   row 362 — per final column x: the fold at depth Fd(x) + 128, 16-bit
 */
const M_AUX_H = 363;
async function metAux(img, name) {
  const AW = VB_W;
  const buf = Buffer.alloc(AW * M_AUX_H * 4);
  const W = img.world;
  for (let ax = 0; ax < AW; ax++) {
    const px = Math.min(IW - 1, Math.round((ax + 0.5) * S));
    let land = 0.5;
    let top = -1;
    const lime = new Float32Array(VB_H).fill(-1);
    const mid = new Float32Array(VB_H);
    for (let ay = 0; ay < VB_H; ay++) {
      const py = Math.min(IH - 1, Math.round((ay + 0.5) * S));
      const k = py * IW + px;
      if (img.id[k] === 1) {
        const x = W.x[k];
        const y = W.y[k];
        land = 0.5 + (900 * metRise(x, y)) / (y + 900) / 64;
      } else if (img.id[k] === 2) {
        const b = bedAt(W.x[k] - NEAR_X0, Math.max(0, W.z[k]));
        lime[ay] = b.lime;
        mid[ay] = b.mid;
        if (top < 0) top = ay;
      }
      const o = (ay * AW + ax) * 4;
      buf[o] = clamp(Math.round(land * 255), 0, 255);
      buf[o + 3] = 255;
    }
    for (let ay = 0; ay < VB_H; ay++) {
      const a = lime[ay] >= 0 ? ay : top;
      buf[(ay * AW + ax) * 4 + 1] = Math.round(255 * Math.max(0, lime[a]));
      buf[(ay * AW + ax) * 4 + 2] = clamp(Math.round((mid[a] / 128) * 255), 0, 255);
    }
    put16(buf, VB_H + 1, ax, metTop0(ax + 0.5));
    put16(buf, VB_H + 2, ax, foldAt(ax + 0.5) + 128);
  }
  // the preview: the land's rise (red, exaggerated), limestone (green)
  await writeAux(buf, M_AUX_H, name, (k) => [clamp((buf[k * 4] - 128) * 8 + 128, 0, 255), buf[k * 4 + 1], 0]);
}

function metAnchors() {
  const r = (v) => Math.round(v * 10) / 10;
  return {
    // the constants RockVisuals.tsx MET copies
    deformation: { XC: MET.XC, K: MET.K, TH: MET.TH, WTOP: MET.WTOP, ZT: MET.ZT, BASE: MET.BASE },
    // the cut's top at the start and at the end, every 40 columns
    top0: Array.from({ length: 17 }, (_, i) => r(metTop0(Math.min(639.5, i * 40)))),
    top1: Array.from({ length: 17 }, (_, i) => r(metTop1(Math.min(639.5, i * 40)))),
    // the hinges of the fold at depth, [final column, Fd]: anticlines the maxima, synclines the minima
    crests: (() => {
      const out = [];
      for (let x = 1; x < VB_W - 1; x++) {
        const a = foldAt(x - 1);
        const b = foldAt(x);
        const c = foldAt(x + 1);
        if ((b > a && b >= c) || (b < a && b <= c)) out.push([x, r(b)]);
      }
      return out;
    })(),
  };
}

// ── main ────────────────────────────────────────────────────────────────────
if (require.main === module) (async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const anchors = {};
  if (ONLY === 'all' || ONLY === 'sediment') {
    const end = sedScene(true);
    end.face = sedFace(true, end.H);
    if (ANCHORS_ONLY) {
      const tops = [];
      for (let ax = 0; ax < VB_W; ax++) tops.push(bedTops(NEAR_X0 + ax + 0.5, end.H.at(NEAR_X0 + ax + 0.5, 0)));
      anchors.sediment = sedAnchors(tops);
    } else {
      const start = sedScene(false);
      start.face = sedFace(false, end.H);
      const sImg = render(start);
      const tops = await sedAux(sImg, end.H, 'sediment');
      await save(finish(sImg), 'sediment-start');
      console.log(`  start  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      await save(finish(render(end)), 'sediment-end');
      console.log(`  end  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      anchors.sediment = sedAnchors(tops);
    }
  }
  if (ONLY === 'all' || ONLY === 'metamorphic') {
    if (!ANCHORS_ONLY) {
      const { start, end } = metScenes();
      console.log(`  metamorphic fields  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      const sImg = render(start);
      await metAux(sImg, 'metamorphic');
      await save(finish(sImg), 'metamorphic-start');
      console.log(`  start  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      await save(finish(render(end)), 'metamorphic-end');
      console.log(`  end  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    anchors.metamorphic = metAnchors();
  }
  console.log(JSON.stringify(anchors, null, 1));
})();
