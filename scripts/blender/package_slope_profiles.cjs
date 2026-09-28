// Web delivery for the Blender slope side views (render_slope_profiles.py).
// The renders are already framed 1:1 on SlopeProfile's 200 × 60 viewBox, so
// packaging is a straight WebP conversion — never crop or resize them.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'qa-output/slope-blender');
const out = path.join(root, 'public/assets/lessons/topic02/slope-profiles');
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const kind of ['even', 'convex', 'concave', 'shoulder']) {
    const file = path.join(out, kind + '.webp');
    await sharp(path.join(source, kind + '.png')).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(file);
    console.log(kind, Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
})();
