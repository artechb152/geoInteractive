// Builds the shared terrain base of the topic-02 "מערכות ייחוס — אותה נקודה, שתי שפות" maps:
//   public/assets/lessons/topic02/reference-systems/linked-terrain-base.webp   (2000 × 2000, 1 px = 1 m)
//   design/assets/reference-systems/linked-terrain-base-master.png             (lossless master)
//
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/maps/build-reference-systems-terrain.mjs
//
// An ILLUSTRATED map, not a real place: a ridge in the west (summit = point B), a
// winding river with one bridge (point A), a small village (point C) and the road
// joining them, fields on the eastern plain. Orthographic, north up, east right.
// Terrain only — no grid, labels, numbers, markers, north arrow or scale bar
// (those are live layers in ReferenceSystemsLinkedComparison.tsx).
//
// Every anchor comes from referenceSystems.data.ts, so the page's markers sit on
// the very bridge, summit and village drawn here. Colours: only the palette of the
// brief (bg / bg.elevated / bg.accent / border / border.subtle / border.strong /
// fg / fg.muted / fg.dim / brand / brand.dark), their mixes and transparency —
// checked against tailwind.config.ts before anything is written. Deterministic.
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { TERRAIN, IMAGE_PX, EXTENT_W, POINTS, localX, localY } from '../../src/components/lessons/topic-02/reference-systems/referenceSystems.data.ts';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const OUT_WEBP = 'public/assets/lessons/topic02/reference-systems/linked-terrain-base.webp';
const OUT_MASTER = 'design/assets/reference-systems/linked-terrain-base-master.png';
const PREVIEW = process.env.RS_PREVIEW; // optional: also write a 1000 px preview here

const S = IMAGE_PX;
const M_PER_PX = EXTENT_W / S;
if (M_PER_PX !== 1) throw new Error('the build assumes 1 px = 1 m');

// ─────────────────────────────────────────────────────────────────────────────
// Palette — tokens only (tailwind.config.ts)
// ─────────────────────────────────────────────────────────────────────────────
const TOKENS = {
  bg: '#F3E9DC', //          bg.DEFAULT
  white: '#FFFFFF', //       bg.elevated / bg.card
  panel: '#F6EFE6', //       bg.accent
  border: '#DCCDB2', //      border.DEFAULT
  subtle: '#ECE4D2', //      border.subtle
  strong: '#C9A56B', //      border.strong
  fg: '#38432E', //          fg.DEFAULT
  muted: '#4A5240', //       fg.muted
  dim: '#8A8873', //         fg.dim
  brand: '#749C75', //       brand.DEFAULT
  brandDark: '#5B7C5C', //   brand.dark
};
{
  const cfg = (await readFile('tailwind.config.ts', 'utf8')).toUpperCase();
  for (const [k, hex] of Object.entries(TOKENS)) if (!cfg.includes(`'${hex.toUpperCase()}'`)) throw new Error(`palette ${k} ${hex} is not a token in tailwind.config.ts`);
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const C = Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [k, rgb(v)]));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

// ─────────────────────────────────────────────────────────────────────────────
// Seeded noise (same Perlin as scripts/maps/build-north-lab-map.mjs)
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
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const xf = x - X;
    const yf = y - Y;
    const xi = X & 255;
    const yi = Y & 255;
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
const nA = perlin(4111);
const nB = perlin(2903);
const nC = perlin(7717);
const nD = perlin(1319);
const nE = perlin(9001);
const nF = perlin(5153);
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
  let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature geometry (local metres = px)
// ─────────────────────────────────────────────────────────────────────────────
function catmull(pts, seg = 14) {
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

const river = catmull(TERRAIN.river, 16);
const ridge = catmull(TERRAIN.ridge.crest, 16);
const roads = TERRAIN.roads.map((r) => ({ width: r.width, path: catmull(r.path, 10) }));
const track = catmull(TERRAIN.track.path, 10);
const POINT_A = POINTS.find((p) => p.id === 'A');
const [AX, AY] = [localX(POINT_A.e), localY(POINT_A.n)];
const B = TERRAIN.ridge.summit;
const VC = TERRAIN.village.center;

function cumulative(poly) {
  const acc = [0];
  for (let i = 1; i < poly.length; i++) acc.push(acc[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  return acc;
}

/** Distance (and arc-length fraction of the closest point) from a grid of nodes to polylines. */
function distanceGrid(polys, cell) {
  const G = Math.ceil(S / cell) + 1;
  const dist = new Float32Array(G * G).fill(1e9);
  const along = new Float32Array(G * G);
  for (const poly of polys) {
    const acc = cumulative(poly);
    const total = acc.at(-1);
    for (let gj = 0; gj < G; gj++) {
      const y = gj * cell;
      for (let gi = 0; gi < G; gi++) {
        const x = gi * cell;
        let best = dist[gj * G + gi];
        let bestS = along[gj * G + gi];
        for (let k = 1; k < poly.length; k++) {
          const ax = poly[k - 1][0];
          const ay = poly[k - 1][1];
          const dx = poly[k][0] - ax;
          const dy = poly[k][1] - ay;
          const L2 = dx * dx + dy * dy || 1;
          const t = clamp01(((x - ax) * dx + (y - ay) * dy) / L2);
          const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
          if (d < best) {
            best = d;
            bestS = (acc[k - 1] + t * Math.sqrt(L2)) / total;
          }
        }
        dist[gj * G + gi] = best;
        along[gj * G + gi] = bestS;
      }
    }
  }
  const sample = (arr) => (x, y) => {
    const u = Math.min(G - 1.001, Math.max(0, x / cell));
    const v = Math.min(G - 1.001, Math.max(0, y / cell));
    const i = Math.floor(u);
    const j = Math.floor(v);
    const fu = u - i;
    const fv = v - j;
    const a = arr[j * G + i];
    const b = arr[j * G + i + 1];
    const c = arr[(j + 1) * G + i];
    const d = arr[(j + 1) * G + i + 1];
    return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
  };
  return { d: sample(dist), s: sample(along) };
}

console.time('distance fields');
const riverField = distanceGrid([river], 4);
const ridgeField = distanceGrid([ridge], 4);
const roadField = distanceGrid([...roads.map((r) => r.path), track], 4);
console.timeEnd('distance fields');

// summit's arc-length fraction along the crest
const ridgeAcc = cumulative(ridge);
const summitS = (() => {
  let best = 1e9;
  let s = 0;
  ridge.forEach((p, i) => {
    const d = Math.hypot(p[0] - B[0], p[1] - B[1]);
    if (d < best) {
      best = d;
      s = ridgeAcc[i] / ridgeAcc.at(-1);
    }
  });
  return s;
})();

// ─────────────────────────────────────────────────────────────────────────────
// Height field
// ─────────────────────────────────────────────────────────────────────────────
const RIVER_W = TERRAIN.riverWidth;
const RIDGE_LEN = ridgeAcc.at(-1);
const RIDGE_H = TERRAIN.ridge.height;
function height(x, y) {
  // gently higher in the west, rolling
  let h = 10 + 14 * (1 - x / S) + 6 * fbm(nC, x / 700, y / 700, 3);

  // the ridge: crest profile along its length × a rounded cross-section
  const dR = ridgeField.d(x, y);
  const sR = ridgeField.s(x, y);
  const w = 215 + 60 * fbm(nA, x / 520, y / 520, 2);
  const crest = RIDGE_H * smoothstep(0, 0.2, sR) * smoothstep(1, 0.74, sR) * (0.56 + 0.44 * Math.exp(-(((sR - summitS) / 0.26) ** 2)));
  const cross = Math.exp(-((dR / w) ** 2));
  h += crest * cross;
  // spurs and gullies that run DOWN the flanks: noise stretched across the crest
  const flank = cross * (1 - cross) * 4 * (crest / RIDGE_H);
  const along = (sR * RIDGE_LEN) / 92 + 0.9 * fbm(nB, x / 260, y / 260, 2);
  const across = dR / 360 + 0.5 * fbm(nB, (x + 500) / 180, (y + 300) / 180, 2);
  const g = fbm(nD, along, across, 3);
  const g2 = fbm(nA, along * 2.1 + 7, across * 1.7, 2);
  h -= (9 * Math.pow(1 - Math.abs(g), 6) + 3 * Math.pow(1 - Math.abs(g2), 6)) * flank;
  h += 8 * g * flank;

  // north-east hills: broad, lumpy domes
  for (const hill of TERRAIN.hills) {
    const r = hill.r * (1 + 0.22 * fbm(nE, x / 380, y / 380, 2));
    const d = Math.hypot(x - hill.at[0], y - hill.at[1]);
    const bump = Math.exp(-((d / r) ** 2));
    h += hill.height * bump;
    h += 6 * fbm(nF, x / 120, y / 120, 3) * bump * (1 - bump) * 4;
  }

  // valley floor and channel
  const dRv = riverField.d(x, y);
  const floor = 6 + 2 * fbm(nC, x / 220, y / 220, 2);
  h = h + (floor + 0.04 * h - h) * smoothstep(340, 90, dRv);
  h -= 4 * smoothstep(RIVER_W / 2 + 12, RIVER_W / 2 - 6, dRv);

  // micro relief (kept low: texture comes from vegetation, not from noise)
  h += 0.9 * fbm(nE, x / 60, y / 60, 2);
  return h;
}

console.time('height');
const H = new Float32Array(S * S);
let hMax = -1e9;
let hMin = 1e9;
for (let j = 0; j < S; j++) {
  for (let i = 0; i < S; i++) {
    const v = height(i + 0.5, j + 0.5);
    H[j * S + i] = v;
    if (v > hMax) hMax = v;
    if (v < hMin) hMin = v;
  }
}
console.timeEnd('height');

/** Separable box blur, `passes` times (≈ Gaussian). */
function blur(src, r, passes = 2) {
  let a = Float32Array.from(src);
  let b = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < S; j++) {
      let acc = 0;
      const row = j * S;
      for (let i = -r; i <= r; i++) acc += a[row + Math.min(S - 1, Math.max(0, i))];
      for (let i = 0; i < S; i++) {
        b[row + i] = acc / (2 * r + 1);
        acc += a[row + Math.min(S - 1, i + r + 1)] - a[row + Math.max(0, i - r)];
      }
    }
    for (let i = 0; i < S; i++) {
      let acc = 0;
      for (let j = -r; j <= r; j++) acc += b[Math.min(S - 1, Math.max(0, j)) * S + i];
      for (let j = 0; j < S; j++) {
        a[j * S + i] = acc / (2 * r + 1);
        acc += b[Math.min(S - 1, j + r + 1) * S + i] - b[Math.max(0, j - r) * S + i];
      }
    }
  }
  return a;
}
console.time('ao');
const Hblur = blur(H, 28, 2);
console.timeEnd('ao');

// ─────────────────────────────────────────────────────────────────────────────
// Fields: two rotated blocks of plots (east plain, south of the village).
// Plots are a rotated grid with every other plot split in two and about a
// quarter left as meadow, so the pattern never reads as a checkerboard.
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_BLOCKS = [
  { ox: 1400, oy: 930, rot: (-14 * Math.PI) / 180, cw: 168, ch: 112, seed: 3 },
  { ox: 40, oy: 1450, rot: (9 * Math.PI) / 180, cw: 150, ch: 104, seed: 7 },
];
const FIELD_KIND = [
  [mix(C.subtle, C.bg, 0.35), 0.34], // fallow, pale
  [mix(C.strong, C.bg, 0.66), 0.24], // ripe / sand
  [mix(C.border, C.strong, 0.22), 0.14], // ploughed tan
  [mix(C.brand, C.bg, 0.6), 0.2], // green crop
  [mix(mix(C.brand, C.brandDark, 0.25), C.bg, 0.4), 0.08], // dense crop
];
const pickKind = (r) => {
  let acc = 0;
  for (let i = 0; i < FIELD_KIND.length; i++) if (r < (acc += FIELD_KIND[i][1])) return i;
  return 0;
};

function fieldAt(x, y) {
  for (let b = 0; b < FIELD_BLOCKS.length; b++) {
    const F = FIELD_BLOCKS[b];
    const dx = x - F.ox;
    const dy = y - F.oy;
    const u = dx * Math.cos(F.rot) + dy * Math.sin(F.rot);
    const v = -dx * Math.sin(F.rot) + dy * Math.cos(F.rot);
    if (u < 0 || v < 0) continue;
    const ci = Math.floor(u / F.cw);
    const cj = Math.floor(v / F.ch);
    let fu = u / F.cw - ci;
    let fv = v / F.ch - cj;
    let sub = 0;
    let cw = F.cw;
    let ch = F.ch;
    // split some plots lengthwise
    if (hash(ci, cj, F.seed + 2) < 0.5) {
      const cut = 0.38 + 0.24 * hash(ci, cj, F.seed + 4);
      if (fu < cut) {
        fu /= cut;
        cw *= cut;
      } else {
        fu = (fu - cut) / (1 - cut);
        cw *= 1 - cut;
        sub = 1;
      }
    }
    if (hash(ci, cj, F.seed + sub * 17) < 0.24) continue; // meadow
    const kind = pickKind(hash(ci, cj, F.seed + 11 + sub * 3));
    const edge = Math.min(Math.min(fu, 1 - fu) * cw, Math.min(fv, 1 - fv) * ch);
    const along = hash(ci, cj, F.seed + 5) < 0.5 ? u : v;
    return { kind, edge, along, block: b, ci, cj, sub };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ground colour × hillshade
// ─────────────────────────────────────────────────────────────────────────────
// soft multi-directional hillshade, dominated by the cartographic NW light
const ALT = (45 * Math.PI) / 180;
const LIGHTS = [
  [315, 0.55],
  [345, 0.25],
  [270, 0.2],
].map(([az, w]) => {
  const a = (az * Math.PI) / 180;
  // image axes: x east, y south → vector pointing to the light
  return [Math.cos(ALT) * Math.sin(a) * w, -Math.cos(ALT) * Math.cos(a) * w, Math.sin(ALT) * w];
});
const LIGHT = LIGHTS.reduce((s, l) => [s[0] + l[0], s[1] + l[1], s[2] + l[2]], [0, 0, 0]);
const FLAT = Math.sin(ALT);
const Z_EXAG = 1.45;

/** Groves: patches, more of them up the slopes. Shared by the ground tint and the trees. */
const groveAt = (x, y, veg) => smoothstep(0.12, 0.34, fbm(nF, x / 200, y / 200, 3) + 0.75 * (veg - 0.5));

/** Vegetation cover 0…1: greener with height, patchy, thinner on the steepest ground. */
function vegetation(x, y, h, slope) {
  const rel = clamp01((h - 20) / (hMax - 20));
  return clamp01(0.12 + 1.05 * rel + 0.55 * fbm(nB, x / 260, y / 260, 3) - 0.3 * smoothstep(0.7, 1.3, slope));
}

console.time('ground');
const ground = new Float32Array(S * S * 3);
const VEG = new Float32Array(S * S);
const PLOT = new Uint8Array(S * S); // 1 = inside a plot (no trees there)
const MEADOW = mix(C.brand, C.bg, 0.66);
const SLOPE_GREEN = mix(C.brand, C.bg, 0.22);
const WOOD_GREEN = mix(C.brand, C.brandDark, 0.3);
const DRY = mix(C.border, C.strong, 0.3);
for (let j = 0; j < S; j++) {
  for (let i = 0; i < S; i++) {
    const k = j * S + i;
    const x = i + 0.5;
    const y = j + 0.5;
    const h = H[k];
    const gx = (H[j * S + Math.min(S - 1, i + 1)] - H[j * S + Math.max(0, i - 1)]) / 2;
    const gy = (H[Math.min(S - 1, j + 1) * S + i] - H[Math.max(0, j - 1) * S + i]) / 2;
    const nx = -gx * Z_EXAG;
    const ny = -gy * Z_EXAG;
    const nl = Math.hypot(nx, ny, 1);
    let shade = 0;
    for (const L of LIGHTS) shade += Math.max(0, nx * L[0] + ny * L[1] + L[2]) / nl;
    const slope = Math.hypot(gx, gy);

    // cream lowland, meadow tint everywhere, sage up the slopes, dry tan on bare steep ground
    let c = mix(C.bg, C.subtle, 0.3 + 0.3 * fbm(nE, x / 180, y / 180, 2));
    c = mix(c, MEADOW, 0.55 + 0.25 * fbm(nC, x / 140, y / 140, 3));
    const veg = vegetation(x, y, h, slope);
    VEG[k] = veg;
    c = mix(c, SLOPE_GREEN, smoothstep(0.2, 0.8, veg) * 0.88);
    c = mix(c, WOOD_GREEN, smoothstep(0.7, 1, veg) * 0.5);
    c = mix(c, DRY, smoothstep(0.55, 1.1, slope) * 0.35 * (0.6 + 0.4 * fbm(nF, x / 90, y / 90, 2)));
    // woodland floor under the groves, so gaps between crowns read as shade, not as paper
    const grove = groveAt(x, y, veg);
    c = mix(c, mix(C.brandDark, C.fg, 0.25), 0.55 * smoothstep(0.35, 0.9, grove));

    // plots on the plains
    const dRv = riverField.d(x, y);
    const f = slope < 0.3 && dRv > RIVER_W / 2 + 70 ? fieldAt(x, y) : null;
    if (f && Math.hypot(x - VC[0], y - VC[1]) > 190) {
      PLOT[k] = 1;
      let fc = FIELD_KIND[f.kind][0];
      fc = mix(fc, C.bg, 0.15 * (0.5 + fbm(nC, x / 70, y / 70, 2)));
      fc = mix(fc, C.fg, 0.03 * (0.5 + 0.5 * Math.sin(f.along / 2.4))); // furrows
      c = mix(c, fc, 0.78 * smoothstep(3, 7, f.edge));
      c = mix(c, C.dim, 0.2 * (1 - smoothstep(0.8, 2.6, f.edge))); // field bank
    }

    // village ground: packed earth
    const dv = Math.hypot(x - VC[0], y - VC[1]);
    c = mix(c, mix(C.border, C.subtle, 0.45), 0.5 * smoothstep(185, 80, dv) * (0.75 + 0.25 * fbm(nF, x / 30, y / 30, 2)));

    // river banks: sand
    c = mix(c, mix(C.strong, C.bg, 0.4), 0.7 * smoothstep(RIVER_W / 2 + 28, RIVER_W / 2 + 4, dRv));

    // hillshade + soft ambient occlusion
    const delta = shade - FLAT;
    c = delta < 0 ? mix(c, C.fg, Math.min(0.46, -delta * 1.2)) : mix(c, C.white, Math.min(0.36, delta * 0.95));
    const ao = (h - Hblur[k]) / 8;
    c = ao < 0 ? mix(c, C.muted, Math.min(0.2, -ao * 0.16)) : mix(c, C.white, Math.min(0.08, ao * 0.05));

    ground[k * 3] = c[0];
    ground[k * 3 + 1] = c[1];
    ground[k * 3 + 2] = c[2];
  }
}
console.timeEnd('ground');

// ─────────────────────────────────────────────────────────────────────────────
// Vector layer: river, roads, bridge, houses, trees (SVG → sharp)
// ─────────────────────────────────────────────────────────────────────────────
const poly = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const pathD = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

const WATER = hex(mix(C.brand, C.panel, 0.5));
const WATER_DEEP = hex(mix(C.brand, C.brandDark, 0.4));
const ROAD = hex(mix(C.white, C.subtle, 0.45));

const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`);
svg.push(`<defs>
<filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="softer" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="7"/></filter>
${[
  ['crownL', mix(C.brand, C.white, 0.3), C.brand, mix(C.brand, C.brandDark, 0.6)],
  ['crownM', mix(C.brand, C.white, 0.18), mix(C.brand, C.brandDark, 0.35), C.brandDark],
  ['crownD', mix(C.brand, C.white, 0.08), C.brandDark, mix(C.brandDark, C.fg, 0.45)],
]
  .map(
    ([id, a, b, c]) =>
      `<radialGradient id="${id}" cx="0.36" cy="0.32" r="0.75"><stop offset="0" stop-color="${hex(a)}"/><stop offset="0.55" stop-color="${hex(b)}"/><stop offset="1" stop-color="${hex(c)}"/></radialGradient>`,
  )
  .join('\n')}
</defs>`);

// river: soft wet margin, bank edge, water, deeper thread, sheen
svg.push(`<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="${pathD(river)}" stroke="${hex(mix(C.brand, C.bg, 0.55))}" stroke-width="${RIVER_W + 22}" stroke-opacity="0.45" filter="url(#soft)"/>
<path d="${pathD(river)}" stroke="${TOKENS.fg}" stroke-width="${RIVER_W + 3}" stroke-opacity="0.32"/>
<path d="${pathD(river)}" stroke="${WATER}" stroke-width="${RIVER_W}"/>
<path d="${pathD(river)}" stroke="${WATER_DEEP}" stroke-width="${RIVER_W * 0.42}" stroke-opacity="0.42" filter="url(#softer)"/>
<path d="${pathD(river.map(([x, y]) => [x - 9, y - 7]))}" stroke="${TOKENS.white}" stroke-width="4" stroke-opacity="0.32" stroke-dasharray="90 70 30 110" filter="url(#soft)"/>
</g>`);

// roads: olive edge + pale surface; the track as a sand dash
svg.push(`<g fill="none" stroke-linecap="round" stroke-linejoin="round">`);
for (const r of roads) svg.push(`<path d="${pathD(r.path)}" stroke="${TOKENS.dim}" stroke-width="${r.width + 4}" stroke-opacity="0.75"/>`);
for (const r of roads) svg.push(`<path d="${pathD(r.path)}" stroke="${ROAD}" stroke-width="${r.width}"/>`);
svg.push(`<path d="${pathD(track)}" stroke="${TOKENS.subtle}" stroke-width="${TERRAIN.track.width + 5}" stroke-opacity="0.55"/>`);
svg.push(`<path d="${pathD(track)}" stroke="${TOKENS.strong}" stroke-width="${TERRAIN.track.width}" stroke-dasharray="20 11"/>`);
svg.push(`</g>`);

// bridge: shadow on the water, piers, abutments, deck, rails
{
  const [x1, y1] = TERRAIN.bridge.from;
  const [x2, y2] = TERRAIN.bridge.to;
  const L = Math.hypot(x2 - x1, y2 - y1);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const W = TERRAIN.bridge.width;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  svg.push(`<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${ang.toFixed(2)})">
<rect x="${-L / 2 + 6}" y="${-W / 2 + 10}" width="${L - 12}" height="${W}" fill="${TOKENS.fg}" fill-opacity="0.42" filter="url(#soft)"/>
${[-0.22, 0, 0.22].map((t) => `<ellipse cx="${(t * L).toFixed(1)}" cy="${(W / 2 + 4).toFixed(1)}" rx="6" ry="9" fill="${TOKENS.muted}" fill-opacity="0.55"/>`).join('')}
<rect x="${-L / 2 - 10}" y="${-W / 2 - 5}" width="22" height="${W + 10}" rx="3" fill="${hex(mix(C.border, C.strong, 0.4))}" stroke="${TOKENS.fg}" stroke-opacity="0.55" stroke-width="1.5"/>
<rect x="${L / 2 - 12}" y="${-W / 2 - 5}" width="22" height="${W + 10}" rx="3" fill="${hex(mix(C.border, C.strong, 0.4))}" stroke="${TOKENS.fg}" stroke-opacity="0.55" stroke-width="1.5"/>
<rect x="${-L / 2}" y="${-W / 2}" width="${L}" height="${W}" rx="2" fill="${hex(mix(C.white, C.panel, 0.4))}" stroke="${TOKENS.fg}" stroke-opacity="0.8" stroke-width="2"/>
<line x1="${-L / 2 + 4}" y1="${-W / 2 + 3.5}" x2="${L / 2 - 4}" y2="${-W / 2 + 3.5}" stroke="${TOKENS.muted}" stroke-width="2" stroke-opacity="0.75"/>
<line x1="${-L / 2 + 4}" y1="${W / 2 - 3.5}" x2="${L / 2 - 4}" y2="${W / 2 - 3.5}" stroke="${TOKENS.muted}" stroke-width="2" stroke-opacity="0.75"/>
${Array.from({ length: 9 }, (_, i) => -L / 2 + 12 + (i * (L - 24)) / 8)
  .map((x) => `<line x1="${x.toFixed(1)}" y1="${-W / 2 + 3.5}" x2="${x.toFixed(1)}" y2="${-W / 2 + 0.5}" stroke="${TOKENS.muted}" stroke-width="1.5" stroke-opacity="0.6"/>`)
  .join('')}
</g>`);
}

// houses: along the village streets (+ a farmstead on the east road)
const houses = [];
{
  const rand = rng(8821);
  const near = (x, y) => houses.some((h) => Math.hypot(h.x - x, h.y - y) < 44);
  const along = (pts, every, side, offset, maxFromCenter, center = VC) => {
    const acc = cumulative(pts);
    for (let s = 0; s < acc.at(-1); s += every * (0.85 + 0.3 * rand())) {
      let k = acc.findIndex((a) => a >= s);
      if (k < 1) k = 1;
      const t = (s - acc[k - 1]) / (acc[k] - acc[k - 1] || 1);
      const px = pts[k - 1][0] + t * (pts[k][0] - pts[k - 1][0]);
      const py = pts[k - 1][1] + t * (pts[k][1] - pts[k - 1][1]);
      const dx = pts[k][0] - pts[k - 1][0];
      const dy = pts[k][1] - pts[k - 1][1];
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      const x = px + nx * side * (offset + 6 * rand());
      const y = py + ny * side * (offset + 6 * rand());
      if (Math.hypot(x - center[0], y - center[1]) > maxFromCenter) continue;
      if (riverField.d(x, y) < RIVER_W / 2 + 40) continue;
      if (roadField.d(x, y) < 17) continue;
      if (Math.hypot(x - VC[0], y - VC[1]) < 30) continue; // the point C itself stays readable
      if (near(x, y)) continue;
      houses.push({ x, y, ang: (Math.atan2(dy, dx) * 180) / Math.PI + (rand() - 0.5) * 8, w: 30 + 9 * rand(), d: 21 + 5 * rand() });
    }
  };
  const main = roads[0].path;
  const street = roads[3].path;
  for (const side of [1, -1]) {
    along(main, 50, side, 28, 210);
    along(street, 48, side, 26, 230);
  }
  // farmstead
  const east = roads[2].path;
  along(east, 60, -1, 30, 75, [1462, 1250]);
}

for (const h of houses) {
  svg.push(`<g transform="translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.ang.toFixed(1)})">
<rect x="${(-h.w / 2 + 6).toFixed(1)}" y="${(-h.d / 2 + 8).toFixed(1)}" width="${h.w.toFixed(1)}" height="${h.d.toFixed(1)}" fill="${TOKENS.fg}" fill-opacity="0.38" filter="url(#soft)"/>
<rect x="${(-h.w / 2).toFixed(1)}" y="${(-h.d / 2).toFixed(1)}" width="${h.w.toFixed(1)}" height="${(h.d / 2).toFixed(1)}" fill="${hex(mix(C.white, C.panel, 0.5))}"/>
<rect x="${(-h.w / 2).toFixed(1)}" y="0" width="${h.w.toFixed(1)}" height="${(h.d / 2).toFixed(1)}" fill="${hex(mix(C.border, C.strong, 0.45))}"/>
<rect x="${(-h.w / 2).toFixed(1)}" y="${(-h.d / 2).toFixed(1)}" width="${h.w.toFixed(1)}" height="${h.d.toFixed(1)}" fill="none" stroke="${TOKENS.fg}" stroke-opacity="0.72" stroke-width="1.6"/>
<line x1="${(-h.w / 2).toFixed(1)}" y1="0" x2="${(h.w / 2).toFixed(1)}" y2="0" stroke="${TOKENS.fg}" stroke-opacity="0.5" stroke-width="1.2"/>
</g>`);
}

// trees: riparian rows, ridge woodland, scattered field-edge trees, village gardens
const trees = [];
{
  const rand = rng(31337);
  const clearOf = (x, y, r) =>
    roadField.d(x, y) > 12 + r &&
    riverField.d(x, y) > RIVER_W / 2 + 6 + r &&
    Math.hypot(x - B[0], y - B[1]) > 46 &&
    Math.hypot(x - AX, y - AY) > 95 &&
    !houses.some((h) => Math.hypot(h.x - x, h.y - y) < h.w / 2 + r + 4);
  // riparian: both banks
  const acc = cumulative(river);
  for (let s = 0; s < acc.at(-1); s += 13) {
    let k = acc.findIndex((a) => a >= s);
    if (k < 1) k = 1;
    const p = river[k];
    const q = river[k - 1];
    const L = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1;
    const nx = -(p[1] - q[1]) / L;
    const ny = (p[0] - q[0]) / L;
    for (const side of [1, -1]) {
      if (rand() < 0.3) continue;
      const off = RIVER_W / 2 + 13 + 16 * rand();
      const r = 7 + 5 * rand();
      const x = p[0] + nx * side * off + (rand() - 0.5) * 8;
      const y = p[1] + ny * side * off + (rand() - 0.5) * 8;
      if (x < -20 || y < -20 || x > S + 20 || y > S + 20 || !clearOf(x, y, r * 0.5)) continue;
      trees.push({ x, y, r, g: rand() < 0.5 ? 'crownM' : 'crownD' });
    }
  }
  // groves (more of them up the slopes), rare single trees on the meadows, none in the plots
  const CELL = 8;
  for (let gy = 0; gy < S / CELL; gy++) {
    for (let gx = 0; gx < S / CELL; gx++) {
      const x = (gx + 0.1 + 0.8 * rand()) * CELL;
      const y = (gy + 0.1 + 0.8 * rand()) * CELL;
      const k = Math.min(S - 1, Math.floor(y)) * S + Math.min(S - 1, Math.floor(x));
      const veg = VEG[k];
      const grove = groveAt(x, y, veg);
      const p = PLOT[k] ? 0 : Math.max(grove * 0.93, 0.005);
      if (rand() > p) continue;
      const r = grove > 0.5 ? 4.6 + 3.4 * rand() : 4.2 + 3 * rand();
      if (!clearOf(x, y, r)) continue;
      trees.push({ x, y, r, g: grove > 0.6 ? (rand() < 0.55 ? 'crownD' : 'crownM') : rand() < 0.5 ? 'crownL' : 'crownM' });
    }
  }
  // village gardens
  for (const h of houses) {
    for (let t = 0; t < 2; t++) {
      if (rand() < 0.35) continue;
      const a = rand() * Math.PI * 2;
      const x = h.x + Math.cos(a) * (h.w / 2 + 12);
      const y = h.y + Math.sin(a) * (h.w / 2 + 12);
      const r = 6 + 4 * rand();
      if (clearOf(x, y, r)) trees.push({ x, y, r, g: 'crownL' });
    }
  }
}
// shadows first (one blurred group), then crowns
svg.push(`<g fill="${TOKENS.fg}" fill-opacity="0.4" filter="url(#soft)">${trees.map((t) => `<circle cx="${(t.x + t.r * 0.45).toFixed(1)}" cy="${(t.y + t.r * 0.6).toFixed(1)}" r="${(t.r * 0.95).toFixed(1)}"/>`).join('')}</g>`);
svg.push(`<g>${trees.map((t) => `<circle cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" r="${t.r.toFixed(1)}" fill="url(#${t.g})"/>`).join('')}</g>`);
svg.push(`</svg>`);

console.log(`houses ${houses.length}, trees ${trees.length}`);

// ─────────────────────────────────────────────────────────────────────────────
// Compose, add paper grain, write
// ─────────────────────────────────────────────────────────────────────────────
console.time('compose');
const groundBuf = Buffer.alloc(S * S * 3);
for (let k = 0; k < S * S * 3; k++) groundBuf[k] = Math.max(0, Math.min(255, Math.round(ground[k])));
const overlay = await sharp(Buffer.from(svg.join('\n'))).png().toBuffer();
const composed = await sharp(groundBuf, { raw: { width: S, height: S, channels: 3 } })
  .composite([{ input: overlay }])
  .removeAlpha()
  .raw()
  .toBuffer();

// paper: fine grain + faint fibres + a very light cream wash so it sits on the page
const out = Buffer.alloc(S * S * 3);
const paperTone = C.panel;
for (let j = 0; j < S; j++) {
  for (let i = 0; i < S; i++) {
    const k = j * S + i;
    const grain = (hash(i, j, 99) - 0.5) * 0.05 + 0.03 * nA(i / 2.2, j / 2.2) + 0.025 * fbm(nB, i / 18, j / 90, 2);
    for (let c = 0; c < 3; c++) {
      let v = composed[k * 3 + c];
      v = v + (paperTone[c] - v) * 0.04; // wash
      v = v * (1 + grain);
      out[k * 3 + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
}
console.timeEnd('compose');

await mkdir(dirname(OUT_WEBP), { recursive: true });
await mkdir(dirname(OUT_MASTER), { recursive: true });
const img = sharp(out, { raw: { width: S, height: S, channels: 3 } });
await img.clone().png({ compressionLevel: 9 }).toFile(OUT_MASTER);
const info = await img.clone().webp({ quality: 86, effort: 6 }).toFile(OUT_WEBP);
console.log(`wrote ${OUT_WEBP} (${(info.size / 1024).toFixed(0)} KB) and ${OUT_MASTER}`);
if (PREVIEW) await img.clone().resize(1000).png().toFile(PREVIEW);
