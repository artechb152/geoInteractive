// Builds the base map of the topic-02 datum activity ("הדמיה: מה קורה כשהדאטום לא תואם?"):
//   public/assets/lessons/topic02/datum-field-challenge/field-map.webp   (MAP extent × MAP.ppm)
//
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/maps/build-datum-field-map.mjs
//      DF_PREVIEW=<file.png>  also writes a lossless copy for inspection.
//
// An ILLUSTRATED 2D map, not a real place, seen straight down (orthographic, north up, east
// right, never mirrored): a low valley with a meandering stream, one bridge where the main road
// crosses it, a crossroads to the west, gentle hills with a soft cartographic hillshade. Terrain
// only — no grid, labels, numbers, markers, north arrow or scale (all live layers in
// DatumFieldChallenge.tsx). No 3D model: a height grid is shaded in 2D, the way a map's relief
// shading is made.
//
// The world comes from datumField.data.ts (MAP, TERRAIN, PLACES): the bridge and the junction
// are drawn at the exercise's numbers, through the same E/N → picture transform as the live
// layers (x = (E − e0)·ppm, y = (n1 − N)·ppm, one scale on both axes).
//
// Colours: only the site's tokens (tailwind.config.ts) and the lesson's approved illustration
// palette (design/docs/design-spec.md: terrain greens, river, papercut cream, base rim), their
// mixes and transparency — checked before anything is written. Water is the lessons' #7FB4C6,
// with darker/lighter steps at the same hue and saturation. Deterministic.
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { MAP, PLACES, TERRAIN } from '../../src/components/lessons/topic-02/datum-field/datumField.data.ts';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const OUT = 'public/assets/lessons/topic02/datum-field-challenge/field-map.webp';
const PREVIEW = process.env.DF_PREVIEW;

const PPM = MAP.ppm;
const W = Math.round((MAP.e1 - MAP.e0) * PPM);
const H = Math.round((MAP.n1 - MAP.n0) * PPM);
const X = (e) => (e - MAP.e0) * PPM;
const Y = (n) => (MAP.n1 - n) * PPM;

// ─────────────────────────────────────────────────────────────────────────────
// Palette — site tokens + the approved illustration palette, nothing else
// ─────────────────────────────────────────────────────────────────────────────
const TOKENS = {
  paper: '#F3E9DC', //   bg.DEFAULT
  white: '#FFFFFF', //   bg.elevated
  panel: '#F6EFE6', //   bg.accent
  tan: '#DCCDB2', //     border.DEFAULT
  subtle: '#ECE4D2', //  border.subtle
  strong: '#C9A56B', //  border.strong
  ink: '#38432E', //     fg.DEFAULT
  muted: '#4A5240', //   fg.muted
  dim: '#8A8873', //     fg.dim
};
const ILLUSTRATION = {
  oliveL: '#8A9163', // terrain greens
  olive: '#6E7A4E',
  oliveD: '#55613C',
  water: '#7FB4C6', //  river
  cream: '#E8DCC4', //  papercut edge cream
  rim: '#C9B892', //    base rim
};
{
  const cfg = (await readFile('tailwind.config.ts', 'utf8')).toUpperCase();
  for (const [k, hex] of Object.entries(TOKENS)) if (!cfg.includes(`'${hex.toUpperCase()}'`)) throw new Error(`palette ${k} ${hex} is not a token in tailwind.config.ts`);
  const spec = (await readFile('design/docs/design-spec.md', 'utf8')).toUpperCase();
  for (const [k, hex] of Object.entries(ILLUSTRATION)) if (!spec.includes(hex.toUpperCase())) throw new Error(`palette ${k} ${hex} is not in the design-spec illustration palette`);
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const C = Object.fromEntries(Object.entries({ ...TOKENS, ...ILLUSTRATION }).map(([k, v]) => [k, rgb(v)]));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** The water's hue and saturation, at another lightness (the same tone, deeper or paler). */
function waterAt(lightness) {
  const [r, g, b] = C.water.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === b ? 60 * ((r - g) / d + 4) : max === g ? 60 * ((b - r) / d + 2) : 60 * (((g - b) / d) % 6);
  const c2 = (1 - Math.abs(2 * lightness - 1)) * s;
  const x2 = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c2 / 2;
  const [r1, g1, b1] = h < 60 ? [c2, x2, 0] : h < 120 ? [x2, c2, 0] : h < 180 ? [0, c2, x2] : h < 240 ? [0, x2, c2] : h < 300 ? [x2, 0, c2] : [c2, 0, x2];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}
const WATER = C.water;
const WATER_DEEP = waterAt(0.56);
const WATER_PALE = waterAt(0.74);

// ─────────────────────────────────────────────────────────────────────────────
// Seeded noise
// ─────────────────────────────────────────────────────────────────────────────
function rng(seed) {
  let s = seed % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function perlin(seed) {
  const rand = rng(seed);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const GX = new Float64Array(16);
  const GY = new Float64Array(16);
  for (let i = 0; i < 16; i++) {
    GX[i] = Math.cos((i * Math.PI) / 8);
    GY[i] = Math.sin((i * Math.PI) / 8);
  }
  return (x, y) => {
    const Xf = Math.floor(x);
    const Yf = Math.floor(y);
    const xf = x - Xf;
    const yf = y - Yf;
    const xi = Xf & 255;
    const yi = Yf & 255;
    const aa = p[p[xi] + yi] & 15;
    const ab = p[p[xi] + yi + 1] & 15;
    const ba = p[p[xi + 1] + yi] & 15;
    const bb = p[p[xi + 1] + yi + 1] & 15;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const d00 = GX[aa] * xf + GY[aa] * yf;
    const d10 = GX[ba] * (xf - 1) + GY[ba] * yf;
    const d01 = GX[ab] * xf + GY[ab] * (yf - 1);
    const d11 = GX[bb] * (xf - 1) + GY[bb] * (yf - 1);
    const x1 = d00 + u * (d10 - d00);
    const x2 = d01 + u * (d11 - d01);
    return x1 + v * (x2 - x1);
  };
}
const nA = perlin(5101);
const nB = perlin(3307);
const nC = perlin(8819);
const nD = perlin(2203);
const nE = perlin(6607);
const nF = perlin(4441);
const nG = perlin(9973);
function fbm(n, x, y, oct = 4) {
  let a = 1;
  let f = 1;
  let s = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    s += a * n(x * f, y * f);
    norm += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / norm;
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (e0, e1, v) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const hash = (i, j, k = 0) => {
  let h = (i * 374761393 + j * 668265263 + k * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature geometry, in ground metres (E, N)
// ─────────────────────────────────────────────────────────────────────────────
function catmull(pts, seg = 12) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        [0, 1].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)),
      );
    }
  }
  out.push([...pts.at(-1)]);
  return out;
}
const stream = catmull(TERRAIN.stream, 14);
const roads = TERRAIN.roads.map((r) => ({ id: r.id, width: r.width, path: catmull(r.path, 12) }));
const BRIDGE = { e: TERRAIN.bridge.at[0], n: TERRAIN.bridge.at[1] };
const JUNCTION = PLACES.junction.ground;
if (BRIDGE.e !== PLACES.bridge.ground.e || BRIDGE.n !== PLACES.bridge.ground.n) throw new Error('the bridge must stand on the exercise numbers');

/** Unsigned distance from (e, n) to a polyline, and the polyline's direction there. */
function nearest(poly, e, n) {
  let best = 1e9;
  let dir = [1, 0];
  for (let k = 1; k < poly.length; k++) {
    const ax = poly[k - 1][0];
    const ay = poly[k - 1][1];
    const dx = poly[k][0] - ax;
    const dy = poly[k][1] - ay;
    const L2 = dx * dx + dy * dy || 1;
    const t = clamp01(((e - ax) * dx + (n - ay) * dy) / L2);
    const d = Math.hypot(e - ax - t * dx, n - ay - t * dy);
    if (d < best) {
      best = d;
      const L = Math.sqrt(L2);
      dir = [dx / L, dy / L];
    }
  }
  return { d: best, dir };
}

/** A distance field on a 1 m grid, bilinear in between. */
function field(polys) {
  const G = { w: MAP.e1 - MAP.e0 + 3, h: MAP.n1 - MAP.n0 + 3 };
  const a = new Float32Array(G.w * G.h);
  for (let j = 0; j < G.h; j++) {
    for (let i = 0; i < G.w; i++) {
      let best = 1e9;
      for (const p of polys) best = Math.min(best, nearest(p, MAP.e0 - 1 + i, MAP.n0 - 1 + j).d);
      a[j * G.w + i] = best;
    }
  }
  return (e, n) => {
    const u = Math.min(G.w - 1.001, Math.max(0, e - MAP.e0 + 1));
    const v = Math.min(G.h - 1.001, Math.max(0, n - MAP.n0 + 1));
    const i = Math.floor(u);
    const j = Math.floor(v);
    const fu = u - i;
    const fv = v - j;
    const p = a[j * G.w + i];
    const q = a[j * G.w + i + 1];
    const r = a[(j + 1) * G.w + i];
    const s = a[(j + 1) * G.w + i + 1];
    return (p + (q - p) * fu) * (1 - fv) + (r + (s - r) * fu) * fv;
  };
}
console.time('distance fields');
const dStream = field([stream]);
const dRoad = field(roads.map((r) => r.path));
console.timeEnd('distance fields');

// ─────────────────────────────────────────────────────────────────────────────
// Height (m) on a 1 m grid → slope and a soft cartographic hillshade
// ─────────────────────────────────────────────────────────────────────────────
function height(e, n) {
  let h = 9 + 5 * fbm(nA, e / 260, n / 260, 3);
  for (const hill of TERRAIN.hills) {
    const r = hill.r * (1 + 0.22 * fbm(nB, e / 170, n / 170, 2));
    const d = Math.hypot(e - hill.at[0], n - hill.at[1]);
    h += hill.height * Math.exp(-((d / r) ** 2));
  }
  // gullies running down the slopes: soft ridged noise, only where the ground falls
  const g = 1 - Math.abs(fbm(nC, e / 46, n / 46, 3));
  h -= 0.45 * g ** 6;
  // the valley: a flat floor along the stream, gentle walls
  const ds = dStream(e, n);
  const floor = 3 + 0.8 * fbm(nD, e / 200, n / 200, 2);
  h = floor + (h - floor) * smoothstep(6, 78, ds);
  // the channel
  h -= 1.4 * (1 - smoothstep(TERRAIN.streamWidth / 2, TERRAIN.bedWidth / 2 + 3, ds));
  // micro relief (the texture itself comes from cover, not from noise)
  h += 0.3 * fbm(nE, e / 24, n / 24, 2);
  return h;
}
const GW = MAP.e1 - MAP.e0 + 3;
const GH = MAP.n1 - MAP.n0 + 3;
console.time('height');
const HG = new Float32Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) HG[j * GW + i] = height(MAP.e0 - 1 + i, MAP.n0 - 1 + j);
console.timeEnd('height');
let hMin = Infinity;
let hMax = -Infinity;
for (const v of HG) {
  hMin = Math.min(hMin, v);
  hMax = Math.max(hMax, v);
}
const ALT = (42 * Math.PI) / 180;
const LIGHTS = [
  [315, 0.6],
  [350, 0.22],
  [280, 0.18],
].map(([az, w]) => {
  const a = (az * Math.PI) / 180;
  // grid axes: x east, y NORTH → the vector toward the light
  return [Math.cos(ALT) * Math.sin(a) * w, Math.cos(ALT) * Math.cos(a) * w, Math.sin(ALT) * w];
});
const FLAT = Math.sin(ALT);
const Z = 1.9; // vertical exaggeration for the shading only
const SHADE = new Float32Array(GW * GH);
const SLOPE = new Float32Array(GW * GH);
for (let j = 1; j < GH - 1; j++) {
  for (let i = 1; i < GW - 1; i++) {
    const gx = (HG[j * GW + i + 1] - HG[j * GW + i - 1]) / 2;
    const gy = (HG[(j + 1) * GW + i] - HG[(j - 1) * GW + i]) / 2;
    const nx = -gx * Z;
    const ny = -gy * Z;
    const nl = Math.hypot(nx, ny, 1);
    let s = 0;
    for (const L of LIGHTS) s += Math.max(0, nx * L[0] + ny * L[1] + L[2]) / nl;
    SHADE[j * GW + i] = s;
    SLOPE[j * GW + i] = Math.hypot(gx, gy);
  }
}
const sampleGrid = (A) => (e, n) => {
  const u = Math.min(GW - 2.001, Math.max(1, e - MAP.e0 + 1));
  const v = Math.min(GH - 2.001, Math.max(1, n - MAP.n0 + 1));
  const i = Math.floor(u);
  const j = Math.floor(v);
  const fu = u - i;
  const fv = v - j;
  const p = A[j * GW + i];
  const q = A[j * GW + i + 1];
  const r = A[(j + 1) * GW + i];
  const s = A[(j + 1) * GW + i + 1];
  return (p + (q - p) * fu) * (1 - fv) + (r + (s - r) * fu) * fv;
};
const shadeAt = sampleGrid(SHADE);
const slopeAt = sampleGrid(SLOPE);
const heightAt = sampleGrid(HG);

// ─────────────────────────────────────────────────────────────────────────────
// Cover: sand and stone, patchy garrigue, denser growth along the stream
// ─────────────────────────────────────────────────────────────────────────────
const BED_HALF = TERRAIN.bedWidth / 2;
const nearBridge = (e, n) => Math.hypot(e - BRIDGE.e, n - BRIDGE.n);
const roadClear = (e, n) => dRoad(e, n) - 3.6; // > 0 off the road and its verge

/** Shrub density 0…1: patchy, thicker on the cooler north-facing slopes and on the valley floor. */
function density(e, n) {
  const patches = fbm(nF, e / 64, n / 64, 3);
  const ds = dStream(e, n);
  const riparian = smoothstep(BED_HALF + 18, BED_HALF + 3, ds) * smoothstep(BED_HALF - 1, BED_HALF + 2, ds);
  const rel = clamp01((heightAt(e, n) - hMin) / (hMax - hMin));
  return clamp01(0.4 + 1.1 * patches - 0.12 * rel + 0.8 * riparian);
}

/**
 * Plants as individual soft spots on a jittered grid: each its own size and shade, a little
 * shadow to the south-east (light from the north-west). `cell` sets the spacing in metres.
 */
function plants(e, n, cell, rMin, rMax, seed, keep) {
  const ci = Math.floor(e / cell);
  const cj = Math.floor(n / cell);
  let cover = 0;
  let shadow = 0;
  let tone = 0;
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const i = ci + di;
      const j = cj + dj;
      const px = (i + 0.15 + 0.7 * hash(i, j, seed)) * cell;
      const py = (j + 0.15 + 0.7 * hash(i, j, seed + 1)) * cell;
      if (hash(i, j, seed + 2) > keep(px, py)) continue;
      const r = rMin + (rMax - rMin) * hash(i, j, seed + 3);
      const d = Math.hypot(e - px, n - py);
      const c = 1 - smoothstep(r * 0.72, r, d);
      if (c > cover) {
        cover = c;
        tone = hash(i, j, seed + 4);
      }
      const sd = Math.hypot(e - (px + r * 0.42), n - (py - r * 0.42));
      shadow = Math.max(shadow, (1 - smoothstep(r * 0.65, r * 1.08, sd)) * 0.9);
    }
  }
  return { cover, shadow: shadow * (1 - cover), tone };
}

console.time('ground');
const ground = Buffer.alloc(W * H * 3);
const SAND = mix(C.cream, C.tan, 0.3);
const DRY = mix(C.subtle, C.cream, 0.4);
const STONE = mix(C.subtle, C.dim, 0.26);
const GRASS = mix(C.oliveL, C.cream, 0.55);
const SHRUB = [mix(C.olive, C.oliveL, 0.35), C.olive, mix(C.olive, C.oliveD, 0.55)];
const SHADOW = mix(C.muted, C.ink, 0.5);
for (let y = 0; y < H; y++) {
  const n = MAP.n1 - (y + 0.5) / PPM;
  for (let x = 0; x < W; x++) {
    const e = MAP.e0 + (x + 0.5) / PPM;
    const ds = dStream(e, n);
    const slope = slopeAt(e, n);
    const rel = clamp01((heightAt(e, n) - hMin) / (hMax - hMin));

    // sand and pale soil, in broad soft patches
    let c = mix(SAND, DRY, smoothstep(-0.25, 0.35, fbm(nG, e / 80, n / 80, 3)));
    c = mix(c, C.tan, 0.18 * smoothstep(0.0, 0.4, fbm(nA, e / 34, n / 34, 2)));
    // stone: outcrops up the hills, with darker joints
    const rock = smoothstep(0.66, 0.9, rel + 0.3 * fbm(nB, e / 26, n / 26, 3)) * smoothstep(0.03, 0.09, slope);
    c = mix(c, STONE, 0.6 * rock);
    c = mix(c, mix(STONE, C.white, 0.3), 0.3 * rock * smoothstep(0.1, 0.5, fbm(nD, e / 11, n / 11, 2)));
    // a dry grass tint where the garrigue grows
    const dens = density(e, n);
    c = mix(c, GRASS, 0.5 * smoothstep(0.3, 0.85, dens) * (0.7 + 0.3 * fbm(nE, e / 18, n / 18, 2)));
    // the gravel bed of the stream
    const bed = smoothstep(BED_HALF + 2.5, BED_HALF - 1.5, ds);
    if (bed > 0) {
      let g = mix(C.panel, C.cream, 0.45 + 0.3 * fbm(nC, e / 6, n / 6, 2));
      g = mix(g, C.rim, 0.35 * smoothstep(0.55, 0.85, hash(Math.floor(e * 2.2), Math.floor(n * 2.2), 7)));
      c = mix(c, g, bed);
    }

    // plants: low shrubs everywhere the density allows, larger bushes along the stream
    const clear = smoothstep(0, 2.2, roadClear(e, n)) * smoothstep(BED_HALF - 1, BED_HALF + 1.5, ds) * smoothstep(14, 22, nearBridge(e, n));
    if (clear > 0) {
      const small = plants(e, n, 3.0, 0.5, 1.45, 11, (pe, pn) => 0.92 * smoothstep(0.32, 0.8, density(pe, pn)));
      const big = plants(e, n, 7.5, 1.6, 2.9, 23, (pe, pn) => {
        const d = dStream(pe, pn);
        return 0.85 * smoothstep(BED_HALF + 15, BED_HALF + 4, d) * smoothstep(BED_HALF + 0.5, BED_HALF + 3, d) + 0.05 * density(pe, pn);
      });
      c = mix(c, SHADOW, 0.32 * Math.max(small.shadow, big.shadow) * clear);
      const pick = (t) => SHRUB[Math.min(2, Math.floor(t * 3))];
      if (small.cover > 0) c = mix(c, pick(small.tone), 0.9 * small.cover * clear);
      if (big.cover > 0) {
        // a lit crown: paler toward the north-west
        const crown = mix(pick(big.tone), C.oliveL, 0.18);
        c = mix(c, crown, 0.95 * big.cover * clear);
      }
    }

    // the relief: a soft multi-directional hillshade
    const delta = shadeAt(e, n) - FLAT;
    c = delta < 0 ? mix(c, C.ink, Math.min(0.28, -delta * 0.85)) : mix(c, C.white, Math.min(0.2, delta * 0.65));
    // paper grain
    const grain = (hash(x, y, 3) - 0.5) * 5;
    const k = (y * W + x) * 3;
    ground[k] = Math.max(0, Math.min(255, c[0] + grain));
    ground[k + 1] = Math.max(0, Math.min(255, c[1] + grain));
    ground[k + 2] = Math.max(0, Math.min(255, c[2] + grain));
  }
}
console.timeEnd('ground');

// ─────────────────────────────────────────────────────────────────────────────
// Vector layer: water, roads, the junction, the bridge (SVG → sharp)
// ─────────────────────────────────────────────────────────────────────────────
const P = (p) => `${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`;
const pathD = (pts) => 'M' + pts.map(P).join(' L');
/** A polyline offset sideways by `o` metres (left of the direction of travel). */
const offset = (pts, o) =>
  pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / L) * o, p[1] + (dx / L) * o];
  });
const m = (v) => (v * PPM).toFixed(2);

const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
svg.push(`<defs>
<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${m(0.9)}"/></filter>
<filter id="softer" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${m(1.8)}"/></filter>
</defs>`);

// the stream: a damp margin, a thin wet edge, the water, a deeper thread, a pale glint
const SW = TERRAIN.streamWidth;
svg.push(`<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="${pathD(stream)}" stroke="${hex(mix(C.rim, C.dim, 0.35))}" stroke-width="${m(SW + 3.2)}" stroke-opacity="0.38" filter="url(#soft)"/>
<path d="${pathD(stream)}" stroke="${hex(mix(C.dim, C.muted, 0.4))}" stroke-width="${m(SW + 0.9)}" stroke-opacity="0.55"/>
<path d="${pathD(stream)}" stroke="${hex(WATER)}" stroke-width="${m(SW)}"/>
<path d="${pathD(stream)}" stroke="${hex(WATER_DEEP)}" stroke-width="${m(SW * 0.34)}" stroke-opacity="0.4" filter="url(#soft)"/>
<path d="${pathD(offset(stream, SW * 0.22))}" stroke="${hex(WATER_PALE)}" stroke-width="${m(0.7)}" stroke-opacity="0.8" stroke-dasharray="${m(9)} ${m(14)} ${m(4)} ${m(19)}"/>
</g>`);

// roads: a darker verge, the pale dirt surface, two faint wheel ruts
const ROAD = mix(C.panel, C.subtle, 0.45);
const RUT = mix(C.tan, C.rim, 0.4);
svg.push(`<g fill="none" stroke-linecap="round" stroke-linejoin="round">`);
for (const r of roads) svg.push(`<path d="${pathD(r.path)}" stroke="${hex(C.rim)}" stroke-width="${m(r.width + 1.6)}" stroke-opacity="0.9"/>`);
// the crossroads: a small packed apron so the junction reads as one place
svg.push(`<circle cx="${X(JUNCTION.e).toFixed(1)}" cy="${Y(JUNCTION.n).toFixed(1)}" r="${m(5.6)}" fill="${hex(C.rim)}" fill-opacity="0.9"/>`);
for (const r of roads) svg.push(`<path d="${pathD(r.path)}" stroke="${hex(ROAD)}" stroke-width="${m(r.width)}"/>`);
svg.push(`<circle cx="${X(JUNCTION.e).toFixed(1)}" cy="${Y(JUNCTION.n).toFixed(1)}" r="${m(4.8)}" fill="${hex(ROAD)}"/>`);
for (const r of roads) {
  for (const o of [-r.width * 0.24, r.width * 0.24]) {
    svg.push(`<path d="${pathD(offset(r.path, o))}" stroke="${hex(RUT)}" stroke-width="${m(0.45)}" stroke-opacity="0.55"/>`);
  }
}
svg.push(`</g>`);

// the bridge: along the main road where it crosses the stream
const main = roads.find((r) => r.id === 'main').path;
const { dir } = nearest(main, BRIDGE.e, BRIDGE.n);
const angle = (Math.atan2(-dir[1], dir[0]) * 180) / Math.PI; // picture y runs south
const BL = TERRAIN.bridge.length;
const BW = TERRAIN.bridge.width;
const DECK = mix(C.subtle, C.tan, 0.25);
const PARAPET = mix(C.dim, C.muted, 0.45);
svg.push(`<g transform="translate(${X(BRIDGE.e).toFixed(1)} ${Y(BRIDGE.n).toFixed(1)}) rotate(${angle.toFixed(2)})">
<rect x="${m(-BL / 2 + 0.6)}" y="${m(-BW / 2 + 0.6)}" width="${m(BL)}" height="${m(BW)}" fill="${hex(C.ink)}" fill-opacity="0.26" filter="url(#soft)" transform="translate(${m(0.9)} ${m(1.3)})"/>
<rect x="${m(-BL / 2 - 1.2)}" y="${m(-BW / 2 - 0.4)}" width="${m(2.4)}" height="${m(BW + 0.8)}" rx="${m(0.3)}" fill="${hex(C.rim)}"/>
<rect x="${m(BL / 2 - 1.2)}" y="${m(-BW / 2 - 0.4)}" width="${m(2.4)}" height="${m(BW + 0.8)}" rx="${m(0.3)}" fill="${hex(C.rim)}"/>
<rect x="${m(-BL / 2)}" y="${m(-BW / 2)}" width="${m(BL)}" height="${m(BW)}" rx="${m(0.25)}" fill="${hex(DECK)}" stroke="${hex(C.dim)}" stroke-width="${m(0.25)}"/>
<rect x="${m(-BL / 2)}" y="${m(-BW / 2)}" width="${m(BL)}" height="${m(1)}" fill="${hex(PARAPET)}"/>
<rect x="${m(-BL / 2)}" y="${m(BW / 2 - 1)}" width="${m(BL)}" height="${m(1)}" fill="${hex(PARAPET)}"/>
<rect x="${m(-BL / 2)}" y="${m(-BW / 2 + 1)}" width="${m(BL)}" height="${m(0.5)}" fill="${hex(C.white)}" fill-opacity="0.55"/>
${[-0.25, 0.25].map((f) => `<rect x="${m(BL * f - 0.25)}" y="${m(-BW / 2 + 1)}" width="${m(0.5)}" height="${m(BW - 2)}" fill="${hex(C.rim)}" fill-opacity="0.7"/>`).join('')}
</g>`);
svg.push('</svg>');

console.time('compose');
const base = sharp(ground, { raw: { width: W, height: H, channels: 3 } });
const vector = await sharp(Buffer.from(svg.join('\n'))).png().toBuffer();
const composed = await base.composite([{ input: vector }]).png().toBuffer();
await sharp(composed).webp({ quality: 84, effort: 6 }).toFile(OUT);
if (PREVIEW) await writeFile(PREVIEW, composed);
console.timeEnd('compose');
const meta = await sharp(OUT).metadata();
console.log(`${OUT}: ${meta.width}×${meta.height}`, `bridge at picture (${X(BRIDGE.e).toFixed(1)}, ${Y(BRIDGE.n).toFixed(1)}) px, deck ${angle.toFixed(1)}°`);
