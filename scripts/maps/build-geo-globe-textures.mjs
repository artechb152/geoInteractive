// Builds the surface textures of the "גלובוס חוקר" globe (topic-02,
// מערכת קואורדינטות גיאוגרפית — src/components/lessons/topic-02/geo-globe/):
//   public/assets/lessons/topic02/geo-globe/
//     earth-color.webp   4096×2048  natural colour, NASA Blue Marble Next Generation
//                                   (July 2004, with topography and bathymetry), the
//                                   water toned to a restrained blue (below)
//     earth-relief.png   2048×1024  R/G tangent-space relief normal as 128 + 127·n (R east,
//                                   G north; the up component is rebuilt in the shader) ·
//                                   B water (255 = water)
// Both are plate carrée in geodetic latitude / longitude on WGS84
// (u = (lon + 180) / 360, north at the top) — the parameterisation of the
// globe's mesh, its graticule and its marker (geoCoords.ts), so the three
// can never drift apart.
//
// Sources (public domain, credited in the folder's ASSET-MANIFEST.md):
//   - colour: NASA Earth Observatory, Blue Marble Next Generation w/ Topography
//     and Bathymetry, July 2004, 21600×10800 (Reto Stöckli, NASA Earth Observatory);
//   - land elevation: NASA Earth Observatory, BMNG "Topography"
//     (gebco_08_rev_elev_5400x2700.tif — GEBCO, British Oceanographic Data Centre);
//   - coastlines and lakes: Natural Earth 1:50m land / lakes.
// The only display adjustment is the water's tone curve (the source's deep
// ocean is close to black navy; the mockup's sea is a restrained steel blue)
// and the relief normals' exaggeration. Land colour is the source's own.
//
//   node scripts/maps/build-geo-globe-textures.mjs [--bmng file.jpg] [--gebco file.tif] [--land file.geojson] [--lakes file.geojson] [--out dir] [--preview dir]
// Missing inputs are downloaded into the OS temp folder first.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
// sharp ships with next (not a direct dependency) — resolved the same way as build-scale-sheets.mjs
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const SRC = {
  bmng: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/world.topo.bathy.200407.3x21600x10800.jpg',
  gebco: 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.tif',
  land: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson',
  lakes: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson',
};

const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : null;
};
const OUT = arg('out') || 'public/assets/lessons/topic02/geo-globe';
const PREVIEW = arg('preview');

async function input(k) {
  const given = arg(k);
  if (given) return given;
  // the datum textures' cache already holds GEBCO and Natural Earth
  for (const dir of [join(tmpdir(), 'geo-globe-src'), join(tmpdir(), 'datum-textures-src')]) {
    const file = join(dir, SRC[k].split('/').pop());
    try {
      await access(file);
      return file;
    } catch {}
  }
  const dir = join(tmpdir(), 'geo-globe-src');
  await mkdir(dir, { recursive: true });
  const file = join(dir, SRC[k].split('/').pop());
  console.log(`download ${SRC[k]}`);
  const res = await fetch(SRC[k]);
  if (!res.ok) throw new Error(`${SRC[k]}: ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

const CW = 4096; // colour
const CH = 2048;
const RW = 2048; // relief
const RH = 1024;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/* ── water tone: sampled from the mockup's sea (design/mockups/geographic-coordinates-2026-10-12/
   01-globe-explorer.png — lit open ocean #2f5c6c, its darker limb #264c5b, the
   shelves a lighter teal) and set as albedo, i.e. a little above the lit values.
   The source's own bathymetric shading drives the mix, so ridges, trenches and
   shelves stay where the data puts them — only quieter. ── */
const SEA = {
  deep: hex('#2A5466'), // open ocean
  mid: hex('#34677A'), // ridges, rises
  shelf: hex('#4F8796'), // continental shelf
  shallow: hex('#679DA4'), // reefs, banks
};

/* ── 1. Natural Earth water mask: ocean ∪ larger lakes, rasterised at 2× then box-filtered ── */
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
async function waterMaskNE(W, H) {
  const SS = 2;
  const w = W * SS;
  const h = H * SS;
  const sx = w / 360;
  const sy = h / 180;
  const land = JSON.parse(await readFile(await input('land'), 'utf8'));
  const lakes = JSON.parse(await readFile(await input('lakes'), 'utf8'));
  const paths = (fc, fill) => fc.features.map((f) => `<path fill="${fill}" fill-rule="evenodd" d="${ringsToPath(f.geometry, sx, sy)}"/>`).join('');
  const bigLakes = { ...lakes, features: lakes.features.filter((f) => (f.properties.scalerank ?? 9) <= 4) };
  // white = water
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/>${paths(land, '#000')}${paths(bigLakes, '#fff')}</svg>`;
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

/* ── 2. colour: Blue Marble, Lanczos-downsampled, the water re-toned ── */
async function colour() {
  const src = await input('bmng');
  const { data } = await sharp(src, { limitInputPixels: false })
    .resize(CW, CH, { kernel: 'lanczos3', fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ne = await waterMaskNE(CW, CH);
  // The image's own colour decides what is water — its coasts, islands and lakes
  // are the ones drawn — with Natural Earth as a prior on how blue a pixel must
  // be: in NE's sea anything not clearly land-coloured is water (islands NE 1:50m
  // leaves out stay land); on NE's land only a clearly blue pixel is (lakes NE
  // leaves out, coasts its coarser outline overruns).
  const prior = gauss(ne, CW, CH, 1.6);
  const water = new Float32Array(CW * CH);
  const out = Buffer.alloc(CW * CH * 3);
  for (let i = 0; i < CW * CH; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const blue = b - Math.max(r, g); // the source's water is blue-dominant; land, ice and snow are not
    const p = prior[i];
    let w = smooth(10 - 24 * p, 24 - 26 * p, blue);
    const lum0 = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    // the source draws lakes and their shores near-black navy: dark and leaning blue is
    // water too (dark forest leans green)
    if (b >= r && b >= g - 3) w = Math.max(w, smooth(0.17, 0.09, lum0));
    // sea ice and ice shelves: bright and nearly grey — never re-toned as water
    if (lum0 > 0.55) w *= 1 - smooth(55, 25, Math.max(r, g, b) - Math.min(r, g, b));
    water[i] = w;
    if (w <= 0) {
      out[i * 3] = r;
      out[i * 3 + 1] = g;
      out[i * 3 + 2] = b;
      continue;
    }
    // the source's bathymetric brightness (deep ≈ 0.07, shelves ≈ 0.4–0.6) → the four tones
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const t = clamp01((lum - 0.05) / 0.55);
    const tone = t < 0.12
      ? SEA.deep.map((c, k) => c + (SEA.mid[k] - c) * (t / 0.12))
      : t < 0.5
        ? SEA.mid.map((c, k) => c + (SEA.shelf[k] - c) * ((t - 0.12) / 0.38))
        : SEA.shelf.map((c, k) => c + (SEA.shallow[k] - c) * ((t - 0.5) / 0.5));
    // keep a breath of the source's own fine bathymetric texture inside the deep tones
    const fine = 1 + (lum - 0.08) * 0.6;
    for (let k = 0; k < 3; k++) {
      const v = tone[k] * (t < 0.12 ? fine : 1);
      out[i * 3 + k] = Math.round(Math.min(255, Math.max(0, [r, g, b][k] * (1 - w) + v * w)));
    }
  }
  return { out, water };
}

/* ── 3. elevation: GEBCO 5400×2700 → RW×RH metres (area-averaged, float) ── */
async function elevation() {
  const { data, info } = await sharp(await input('gebco'), { limitInputPixels: false }).raw().toBuffer({ resolveWithObject: true });
  const sw = info.width;
  const sh = info.height;
  const ch = info.channels;
  const fx = sw / RW;
  const fy = sh / RH;
  const out = new Float32Array(RW * RH);
  const N = 4;
  for (let y = 0; y < RH; y++)
    for (let x = 0; x < RW; x++) {
      let s = 0;
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const px = Math.min(sw - 1, Math.floor((x + (i + 0.5) / N) * fx));
          const py = Math.min(sh - 1, Math.floor((y + (j + 0.5) / N) * fy));
          s += data[(py * sw + px) * ch];
        }
      out[y * RW + x] = (s / (N * N) / 255) * 6400;
    }
  return out;
}

/** Relief normals (R east, G north) from the elevation in metres, with true
    spherical texel spacing; exaggerated so relief reads at globe scale, and
    eased to flat near the poles where meridians converge. */
function reliefNormals(h, water) {
  const R = 6371000;
  const E = 9; // display exaggeration of slopes (geometry is never displaced)
  const dLon = ((2 * Math.PI) / RW);
  const dLat = Math.PI / RH;
  const hs = gauss(h, RW, RH, 0.7);
  const out = Buffer.alloc(RW * RH * 3);
  for (let y = 0; y < RH; y++) {
    const lat = Math.PI / 2 - (y + 0.5) * dLat;
    const cos = Math.max(0.05, Math.cos(lat));
    const polar = 1 - smooth(80, 88, Math.abs((lat * 180) / Math.PI));
    const yn = Math.max(0, y - 1);
    const ys = Math.min(RH - 1, y + 1);
    for (let x = 0; x < RW; x++) {
      const xe = (x + 1) % RW;
      const xw = (x - 1 + RW) % RW;
      const dzdx = (hs[y * RW + xe] - hs[y * RW + xw]) / (2 * R * cos * dLon);
      const dzdy = (hs[yn * RW + x] - hs[ys * RW + x]) / ((ys - yn) * R * dLat);
      let nx = -E * dzdx * polar;
      let ny = -E * dzdy * polar;
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      const i = y * RW + x;
      // 128 + 127·n: a flat texel decodes to exactly 0 (the shader reads (c·255 − 128) / 127)
      out[i * 3] = Math.round(128 + 127 * nx);
      out[i * 3 + 1] = Math.round(128 + 127 * ny);
      out[i * 3 + 2] = Math.round(water[i] * 255);
    }
  }
  return out;
}

/** Box-downsample a float field by an integer factor. */
function down(src, w, h, f) {
  const W = w / f;
  const H = h / f;
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) s += src[(y * f + j) * w + x * f + i];
      out[y * W + x] = s / (f * f);
    }
  return out;
}

await mkdir(OUT, { recursive: true });
console.log('colour …');
const { out: col, water } = await colour();
await sharp(col, { raw: { width: CW, height: CH, channels: 3 } })
  .webp({ quality: 90, smartSubsample: true, effort: 6 })
  .toFile(join(OUT, 'earth-color.webp'));
console.log('relief …');
const h = await elevation();
const rel = reliefNormals(h, down(water, CW, CH, CW / RW));
await sharp(rel, { raw: { width: RW, height: RH, channels: 3 } }).png({ compressionLevel: 9 }).toFile(join(OUT, 'earth-relief.png'));

if (PREVIEW) {
  await mkdir(PREVIEW, { recursive: true });
  const crop = async (name, lon0, lat1, lon1, lat0) => {
    const left = Math.round(((lon0 + 180) / 360) * CW);
    const top = Math.round(((90 - lat1) / 180) * CH);
    const width = Math.round(((lon1 - lon0) / 360) * CW);
    const height = Math.round(((lat1 - lat0) / 180) * CH);
    await sharp(join(OUT, 'earth-color.webp')).extract({ left, top, width, height }).toFile(join(PREVIEW, `${name}.png`));
  };
  await crop('indian-ocean', -10, 45, 160, -50);
  await crop('india', 60, 30, 95, 0);
  await crop('coast-detail', 90, 15, 125, -10);
  await sharp(join(OUT, 'earth-relief.png')).extract({ left: 1100, top: 250, width: 500, height: 300 }).toFile(join(PREVIEW, 'relief-asia.png'));
}
console.log('done');
