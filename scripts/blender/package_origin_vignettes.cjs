// Web delivery for the origin vignettes (render_origin_vignettes.py): each 352 × 240 render
// is the whole 88 × 60 vignette box (4 px per unit), shipped as is — never resized or cropped.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'qa-output/origin-vignettes-blender');
const out = path.join(root, 'public/assets/lessons/topic02/origin-vignettes');
fs.mkdirSync(out, { recursive: true });

(async () => {
  for (const name of ['natural', 'planted']) {
    const src = path.join(source, name + '.png');
    const { width, height } = await sharp(src).metadata();
    if (width !== 352 || height !== 240) throw new Error(`${name}: ${width}×${height}, expected 352×240`);
    const file = path.join(out, name + '.webp');
    await sharp(src).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(file);
    console.log(name.padEnd(8), Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
})();
