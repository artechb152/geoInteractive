// Packs the CC0 Poly Haven scans of the terrain-association model ("ניווט לפי השטח", lesson 6)
// into public/assets/lessons/topic06/terrain-nav/{ground,village,tree}. See ATTRIBUTIONS.md there.
//
//   node scripts/build-terrain-nav-textures.mjs <downloadDir>
//
// <downloadDir>/<asset>/{diff,nor_gl,disp}.jpg are the 1K JPEGs of each asset from
// https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<asset>/<asset>_<map>_1k.jpg
// (the downloads are not committed). Per layer it writes:
//   <name>_albedo.webp  the diffuse map, unchanged pixels, WebP q82, 1024 px (the bark 512 px);
//   <name>_normal.webp  the OpenGL normal in RG and the displacement, stretched to 0–1, in B (WebP q76).
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next')] }));

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/build-terrain-nav-textures.mjs <downloadDir>');
const OUT = 'public/assets/lessons/topic06/terrain-nav';
const LAYERS = [
  ['ground', 'grass', 'forrest_ground_01'],
  ['ground', 'dry', 'grass_path_2'],
  ['ground', 'rock', 'rock_boulder_dry'],
  ['ground', 'forest', 'forrest_ground_03'],
  ['ground', 'road', 'rocky_trail_02'],
  ['ground', 'soil', 'farm_soil'],
  ['village', 'plaster', 'grey_plaster_03'],
  ['village', 'roof', 'ceramic_roof_01'],
  // bark of the trees' trunks and limbs (a trunk is a few tens of centimetres across: half the size is plenty)
  ['tree', 'bark_pine', 'pine_bark', 512],
  ['tree', 'bark_oak', 'bark_brown_02', 512],
  ['tree', 'bark_olive', 'bark_willow_02', 512],
];

for (const [dir, name, asset, S = 1024] of LAYERS) {
  await mkdir(`${OUT}/${dir}`, { recursive: true });
  await sharp(`${src}/${asset}/diff.jpg`).resize(S, S).webp({ quality: 82 }).toFile(`${OUT}/${dir}/${name}_albedo.webp`);
  const nor = await sharp(`${src}/${asset}/nor_gl.jpg`).resize(S, S).removeAlpha().raw().toBuffer();
  const disp = await sharp(`${src}/${asset}/disp.jpg`).resize(S, S).greyscale().raw().toBuffer();
  let lo = 255;
  let hi = 0;
  for (const v of disp) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const out = Buffer.alloc(S * S * 3);
  for (let k = 0; k < S * S; k++) {
    out[k * 3] = nor[k * 3];
    out[k * 3 + 1] = nor[k * 3 + 1];
    out[k * 3 + 2] = Math.round(((disp[k] - lo) / Math.max(1, hi - lo)) * 255);
  }
  await sharp(out, { raw: { width: S, height: S, channels: 3 } }).webp({ quality: 76 }).toFile(`${OUT}/${dir}/${name}_normal.webp`);
  console.log(`${dir}/${name} ← ${asset}`);
}
