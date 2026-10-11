// Builds the guided datum globe's surface textures
//   public/assets/lessons/topic02/datum-guided/textures/
//     earth-albedo.webp   2048×1024  colour, no lighting baked in
//     earth-normal.png    2048×1024  tangent-space normals (R east, G north, B up)
//     earth-surface.png   2048×1024  R land mask · G roughness · B cavity (valley) shading
//     earth-height.png    1024×512   display relief 0…1 (geometry + occlusion, read on the CPU)
// All four are plate carrée (u = (lon + 180) / 360, north at the top), the
// same projection and UVs the globe already uses.
//
// Sources (both public domain, credited in ASSET-MANIFEST.md):
//   - land elevation: NASA Earth Observatory, Blue Marble Next Generation
//     "Topography" (gebco_08_rev_elev_5400x2700.tif — 0…6400 m as 0…255;
//     imagery by Jesse Allen, NASA's Earth Observatory, using data from the
//     General Bathymetric Chart of the Oceans (GEBCO), British Oceanographic
//     Data Centre);
//   - coastlines and lakes: Natural Earth 1:50m land / lakes (naturalearthdata.com).
// Nothing procedural is presented as elevation: every slope comes from the
// elevation data; the only stylisation is a small raised step at the coast
// (so the land reads as a volume) and a monotonic display curve on height.
// The ivory (sea) carries a seeded decorative finish — a soft mottling and a
// thin engraved craquelure in its colour and roughness only: a glaze, not data.
//
//   node scripts/build-datum-textures.mjs [--gebco file.tif] [--land file.geojson] [--lakes file.geojson] [--out dir]
// Missing inputs are downloaded into the OS temp folder first.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
// sharp ships with next (not a direct dependency) — resolved the same way as scripts/maps/build-scale-sheets.mjs
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const SRC = {
  gebco: 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.tif',
  land: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson',
  lakes: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson',
};

const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : null;
};
const OUT = arg('out') || 'public/assets/lessons/topic02/datum-guided/textures';
async function input(k) {
  const given = arg(k);
  if (given) return given;
  const dir = join(tmpdir(), 'datum-textures-src');
  await mkdir(dir, { recursive: true });
  const file = join(dir, SRC[k].split('/').pop());
  try {
    await access(file);
  } catch {
    console.log(`download ${SRC[k]}`);
    const res = await fetch(SRC[k]);
    if (!res.ok) throw new Error(`${SRC[k]}: ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

const W = 2048;
const H = 1024;

/* ── palette: lesson tokens only (tailwind.config.ts) ── */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const T = {
  sea: hex('#F3E9DC'), // bg — ceramic sea
  seaDeep: hex('#ECE4D2'), // border.subtle — the sea away from the coast, a touch deeper
  low: hex('#749C75'), // brand — lowland
  mid: hex('#5B7C5C'), // brand.dark — upland
  high: hex('#C9A56B'), // border.strong — high relief (the relief-line tan)
  ice: hex('#F6EFE6'), // bg.accent — ice sheets
  coast: hex('#5B7C5C'),
};

/* ── 1. land mask: Natural Earth land minus lakes, rasterised at 2× then box-filtered ── */
function ringsToPath(geom, sx, sy) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  let d = '';
  for (const poly of polys) {
    for (const ring of poly) {
      ring.forEach(([lon, lat], i) => {
        d += `${i ? 'L' : 'M'}${((lon + 180) * sx).toFixed(2)},${((90 - lat) * sy).toFixed(2)}`;
      });
      d += 'Z';
    }
  }
  return d;
}
async function landMask() {
  const SS = 2;
  const w = W * SS;
  const h = H * SS;
  const sx = w / 360;
  const sy = h / 180;
  const land = JSON.parse(await readFile(await input('land'), 'utf8'));
  const lakes = JSON.parse(await readFile(await input('lakes'), 'utf8'));
  const paths = (fc, fill) => fc.features.map((f) => `<path fill="${fill}" fill-rule="evenodd" d="${ringsToPath(f.geometry, sx, sy)}"/>`).join('');
  // lakes: only the larger ones (scalerank ≤ 4) — the rest are below a texel or two
  const bigLakes = { ...lakes, features: lakes.features.filter((f) => (f.properties.scalerank ?? 9) <= 4) };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#000"/>${paths(land, '#fff')}${paths(bigLakes, '#000')}</svg>`;
  const { data } = await sharp(Buffer.from(svg), { limitInputPixels: false }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) s += data[(y * SS + j) * w + x * SS + i];
      out[y * W + x] = s / (SS * SS * 255);
    }
  return out;
}

/* ── 2. elevation: GEBCO 5400×2700 → 2048×1024 metres (area-averaged, float) ── */
async function elevation() {
  const { data, info } = await sharp(await input('gebco'), { limitInputPixels: false }).raw().toBuffer({ resolveWithObject: true });
  const sw = info.width;
  const sh = info.height;
  const ch = info.channels;
  const fx = sw / W;
  const fy = sh / H;
  const out = new Float32Array(W * H);
  const N = 4; // taps per axis inside each output texel
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const px = Math.min(sw - 1, Math.floor((x + (i + 0.5) / N) * fx));
          const py = Math.min(sh - 1, Math.floor((y + (j + 0.5) / N) * fy));
          s += data[(py * sw + px) * ch];
        }
      out[y * W + x] = (s / (N * N) / 255) * 6400;
    }
  return out;
}

/** Separable Gaussian blur, wrapping in longitude, clamped at the poles. */
function gauss(src, w, h, sigma) {
  const r = Math.ceil(sigma * 3);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const ks = k.reduce((a, b) => a + b, 0);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += src[y * w + ((x + i + w) % w)] * k[i + r];
      tmp[y * w + x] = s / ks;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r];
      out[y * w + x] = s / ks;
    }
  return out;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const mask = await landMask();
const elev = await elevation();
const maskSoft = gauss(mask, W, H, 1.1);

/* ── 3. display relief: a monotonic curve on the elevation, plus a small raised
       step at the coast so the land reads as a volume, not a decal ── */
const COAST_STEP = 0.045;
const relief = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const hc = Math.pow(Math.min(1, elev[i] / 6400), 0.6);
  relief[i] = maskSoft[i] * (COAST_STEP + (1 - COAST_STEP) * hc);
}
const reliefS = gauss(relief, W, H, 0.8); // removes the 8-bit source's terracing
// the elevation alone (no coast step): ridges and valleys for colour and cavity
const elevC = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) elevC[i] = maskSoft[i] * Math.pow(Math.min(1, elev[i] / 6400), 0.6);
const elevS = gauss(elevC, W, H, 0.8);

/* ── 4. normals from the relief (true spherical texel spacing), faded at the poles ── */
const BUMP = 0.045;
const normal = Buffer.alloc(W * H * 3);
const slopeMag = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  const lat = 90 - ((y + 0.5) / H) * 180;
  const cosl = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const pole = 1 - smooth(78, 86, Math.abs(lat));
  const dx = ((2 * Math.PI) / W) * cosl;
  const dy = Math.PI / H;
  for (let x = 0; x < W; x++) {
    const e = reliefS[y * W + ((x + 1) % W)] - reliefS[y * W + ((x - 1 + W) % W)];
    const n = reliefS[Math.max(0, y - 1) * W + x] - reliefS[Math.min(H - 1, y + 1) * W + x];
    const se = ((e * BUMP) / (2 * dx)) * pole;
    const sn = ((n * BUMP) / (2 * dy)) * pole;
    const l = Math.hypot(se, sn, 1);
    const i = (y * W + x) * 3;
    normal[i] = Math.round(((-se / l) * 0.5 + 0.5) * 255);
    normal[i + 1] = Math.round(((-sn / l) * 0.5 + 0.5) * 255);
    normal[i + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
    slopeMag[y * W + x] = Math.hypot(se, sn);
  }
}

/* ── 5. the ivory's finish (the sea only — a material texture, never data):
       a soft mineral/paper mottling, and a thin, light decorative engraving —
       an irregular craquelure of cells (edges of a seeded random partition of
       the sphere, a little wavy, some left out), like the glaze of a ceramic
       globe. Built on the sphere itself, so cells keep their size up to the
       poles. Seeded: the same textures on every build. ── */
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash3 = (x, y, z) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Smooth value noise in 3-D, 0…1. */
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash3(ix + i, iy + j, iz + k);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const ENGRAVE = { seeds: 2200, half: 0.0032, keep: 0.8, warp: 0.014 };
const rnd = mulberry32(0x5eed);
const seeds = Array.from({ length: ENGRAVE.seeds }, () => {
  const z = 2 * rnd() - 1;
  const phi = 2 * Math.PI * rnd();
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(phi), z, r * Math.sin(phi)];
});
const GC = 0.1; // acceleration grid cell (unit-sphere chord units)
const GN = 22;
const cellOf = (v) => Math.min(GN - 1, Math.max(0, Math.floor((v + 1.1) / GC)));
const grid = new Map();
seeds.forEach((s, i) => {
  const k = (cellOf(s[0]) * GN + cellOf(s[1])) * GN + cellOf(s[2]);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(i);
});
const engrave = new Float32Array(W * H); // line core 0…1
const halo = new Float32Array(W * H); // its light surround 0…1
const mottle = new Float32Array(W * H); // −1…1
for (let y = 0; y < H; y++) {
  const lat = ((90 - ((y + 0.5) / H) * 180) * Math.PI) / 180;
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const lon = (((x + 0.5) / W) * 360 - 180) * (Math.PI / 180);
    const px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
    mottle[i] = (vnoise(px * 5 + 11, py * 5, pz * 5) * 0.65 + vnoise(px * 15, py * 15 + 7, pz * 15) * 0.35) * 2 - 1;
    if (mask[i] > 0.6) continue; // the engraving lives on the ivory only
    // a little wavy, as if cut by hand
    const qx = px + ENGRAVE.warp * (vnoise(px * 22, py * 22, pz * 22) - 0.5) * 2;
    const qy = py + ENGRAVE.warp * (vnoise(px * 22 + 31, py * 22, pz * 22) - 0.5) * 2;
    const qz = pz + ENGRAVE.warp * (vnoise(px * 22, py * 22 + 17, pz * 22) - 0.5) * 2;
    let d1 = Infinity, d2 = Infinity, s1 = -1, s2 = -1;
    const cx = cellOf(qx), cy = cellOf(qy), cz = cellOf(qz);
    for (let a = -2; a <= 2; a++)
      for (let b = -2; b <= 2; b++)
        for (let c = -2; c <= 2; c++) {
          const list = grid.get(((cx + a) * GN + (cy + b)) * GN + (cz + c));
          if (!list) continue;
          for (const si of list) {
            const s = seeds[si];
            const d = (s[0] - qx) ** 2 + (s[1] - qy) ** 2 + (s[2] - qz) ** 2;
            if (d < d1) {
              d2 = d1; s2 = s1; d1 = d; s1 = si;
            } else if (d < d2) {
              d2 = d; s2 = si;
            }
          }
        }
    if (s2 < 0) continue;
    // distance to the bisector of the two nearest cells = distance to their shared edge
    const a = seeds[s1], b = seeds[s2];
    const e = (d2 - d1) / (2 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    const pair = hash3(Math.min(s1, s2), Math.max(s1, s2), 7);
    if (pair > ENGRAVE.keep) continue; // some edges left out: a craquelure, not a net
    const strength = 0.6 + 0.4 * hash3(Math.min(s1, s2), Math.max(s1, s2), 13);
    engrave[i] = strength * (1 - smooth(ENGRAVE.half * 0.4, ENGRAVE.half * 1.4, e));
    halo[i] = strength * (1 - smooth(ENGRAVE.half, ENGRAVE.half * 3.2, e));
  }
}

/* ── 6. surface data: land mask, roughness (satin land, rougher where rugged;
       softer sheen on the sea), cavity (valleys a little darker) ── */
// the land's own surroundings (a land-only average: the sea's zeros would make every coast a "ridge")
const broadSum = gauss(elevS, W, H, 5);
const broadW = gauss(mask, W, H, 5);
const broad = broadSum.map((v, i) => (broadW[i] > 0.05 ? v / broadW[i] : elevS[i]));
const surface = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  const m = mask[i];
  const rugged = Math.min(1, slopeMag[i] * 0.6);
  // the sea: a satin glaze with small variations, its engraved lines matte
  const seaRough = 0.46 + 0.07 * mottle[i] + 0.2 * engrave[i];
  const rough = (1 - m) * seaRough + m * (0.66 + 0.18 * rugged);
  const cavity = 1 - m * Math.min(0.45, Math.max(0, (broad[i] - elevS[i]) * 5)); // valleys, on land only
  surface[i * 3] = Math.round(m * 255);
  surface[i * 3 + 1] = Math.round(rough * 255);
  surface[i * 3 + 2] = Math.round(cavity * 255);
}

/* ── 7. albedo: tokens only; land shades by elevation, ice sheets cream; a thin
       darker coast; the sea a touch deeper away from the coast, with the
       ivory's finish ── */
const nearCoast = gauss(mask, W, H, 6);
const WHITE = [255, 255, 255];
const albedo = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  const lat = 90 - ((y + 0.5) / H) * 180;
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const hc = Math.pow(Math.min(1, elev[i] / 6400), 0.6);
    // sage lowlands, a deeper green on the uplands, tan on the high ground and
    // along ridges (relief above its surroundings — from the elevation, not noise)
    const ridge = Math.max(0, elevS[i] - broad[i]);
    let land = mixc(T.low, T.mid, 0.55 * smooth(0.2, 0.55, hc));
    land = mixc(land, T.high, Math.min(0.75, 0.7 * smooth(0.5, 0.85, hc) + 3.2 * ridge));
    const ice = lat < -60 ? 1 : smooth(58, 66, lat) * smooth(0.28, 0.45, hc);
    land = mixc(land, T.ice, ice);
    let sea = mixc(T.seaDeep, T.sea, Math.min(1, nearCoast[i] * 2.2));
    // mottling between the two creams and a breath of white; then the engraving:
    // a light surround and a thin core a shade toward the relief tan
    sea = mottle[i] > 0 ? mixc(sea, WHITE, 0.22 * mottle[i]) : mixc(sea, T.seaDeep, -0.7 * mottle[i]);
    sea = mixc(sea, WHITE, 0.45 * halo[i]);
    sea = mixc(sea, T.high, 0.5 * engrave[i]);
    const m = mask[i];
    let c = mixc(sea, land, m);
    const edge = m > 0.04 && m < 0.96 ? 1 - Math.abs(m - 0.5) * 2 : 0;
    c = mixc(c, T.coast, 0.5 * edge * (1 - ice));
    albedo.set(c.map((v) => Math.round(v)), i * 3);
  }
}

/* ── 8. CPU height (geometry + occlusion), half resolution ── */
const HW = 1024;
const HH = 512;
const height = Buffer.alloc(HW * HH);
for (let y = 0; y < HH; y++)
  for (let x = 0; x < HW; x++) {
    const a = reliefS[2 * y * W + 2 * x] + reliefS[2 * y * W + 2 * x + 1] + reliefS[(2 * y + 1) * W + 2 * x] + reliefS[(2 * y + 1) * W + 2 * x + 1];
    height[y * HW + x] = Math.round((a / 4) * 255);
  }

await mkdir(OUT, { recursive: true });
const raw = (buf, w, h, c) => sharp(buf, { raw: { width: w, height: h, channels: c } });
await raw(albedo, W, H, 3).webp({ quality: 92, smartSubsample: true }).toFile(`${OUT}/earth-albedo.webp`);
await raw(normal, W, H, 3).png({ compressionLevel: 9 }).toFile(`${OUT}/earth-normal.png`);
await raw(surface, W, H, 3).png({ compressionLevel: 9 }).toFile(`${OUT}/earth-surface.png`);
await raw(height, HW, HH, 1).png({ compressionLevel: 9 }).toFile(`${OUT}/earth-height.png`);
console.log(`wrote ${OUT}/earth-{albedo.webp,normal.png,surface.png,height.png}`);
