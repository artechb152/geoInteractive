// Web delivery for the „סיווג מרכיבי השטח” quiz illustrations (topic-02, 2026-10-19 handoff).
//
//   node scripts/media/package-terrain-classification.cjs
//
// The ten 1536 × 1024 RGBA PNGs in public/assets/lessons/topic02/terrain-classification/ are the
// sources (≈23 MB together) and stay in place. Each one gets a WebP sibling with the same name,
// the same size and its alpha kept — never resized, cropped, recoloured or flattened; the soft
// halo and the baked-in orange outline are part of the art.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const dir = path.resolve(__dirname, '../../public/assets/lessons/topic02/terrain-classification');
const NAMES = [
  'item-hill', 'item-grove', 'item-house', 'item-valley', 'item-road',
  'item-slope', 'item-olive-orchard', 'item-saddle', 'choice-relief', 'choice-cover',
];

(async () => {
  let total = 0;
  for (const name of NAMES) {
    const src = path.join(dir, name + '.png');
    const meta = await sharp(src).metadata();
    if (meta.width !== 1536 || meta.height !== 1024) throw new Error(`${name}: ${meta.width}×${meta.height}, expected 1536×1024`);
    if (!meta.hasAlpha) throw new Error(`${name}: no alpha channel`);
    const file = path.join(dir, name + '.webp');
    await sharp(src).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(file);
    const out = await sharp(file).metadata();
    if (!out.hasAlpha) throw new Error(`${name}.webp lost its alpha channel`);
    const kb = Math.round(fs.statSync(file).size / 1024);
    total += kb;
    console.log(name.padEnd(20), `${kb} KB`);
  }
  console.log('total'.padEnd(20), `${total} KB`);
})();
