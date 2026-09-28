// Imports the approved rock-type photographs (design/handoff/rock-types-film/incoming)
// for the photographic time-lapses in RockVisuals.tsx.
//
//   node scripts/media/import-rock-photos.cjs
//
//   IGN|SED|MET-START.png, -END.png → public/…/scene-geology/<kind>-start.webp / -end.webp (1600 × 900)
//   SPEC-IGN|SED|MET.png            → public/…/scene-geology/specimens/<kind>.webp          (480 × 480)
//
// START and END of each pair come from the same camera; they are only resized
// (never cropped, shifted or mirrored), so the shader can blend them pixel for pixel.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const src = path.join(root, 'design/handoff/rock-types-film/incoming');
const out = path.join(root, 'public/assets/lessons/topic02/scene-geology');
const KINDS = { IGN: 'igneous', SED: 'sediment', MET: 'metamorphic' };

(async () => {
  fs.mkdirSync(path.join(out, 'specimens'), { recursive: true });
  for (const [code, kind] of Object.entries(KINDS)) {
    for (const which of ['start', 'end']) {
      const file = path.join(out, `${kind}-${which}.webp`);
      await sharp(path.join(src, `${code}-${which.toUpperCase()}.png`))
        .resize(1600, 900, { fit: 'fill' })
        .webp({ quality: 84, effort: 6 })
        .toFile(file);
      console.log(path.relative(root, file), Math.round(fs.statSync(file).size / 1024) + ' KB');
    }
    const spec = path.join(out, 'specimens', `${kind}.webp`);
    await sharp(path.join(src, `SPEC-${code}.png`)).resize(480, 480, { fit: 'cover' }).webp({ quality: 86, effort: 6 }).toFile(spec);
    console.log(path.relative(root, spec), Math.round(fs.statSync(spec).size / 1024) + ' KB');
  }
})();
