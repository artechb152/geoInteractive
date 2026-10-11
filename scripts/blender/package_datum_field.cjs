// Web delivery for the datum field challenge terrain (render_datum_field.py).
// The render is one frame from one fixed camera: terrain-base.webp is that frame at 2000 × 1120
// (25:14), downsampled from the supersampled master when there is one. The three thumbnails are
// crops of the SAME render around each landmark's projected anchor (qa-output/datum-field/frame.json),
// 16:9, never separate renders and never altered — the page draws names and selection in HTML.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'qa-output/datum-field');
const out = path.join(root, 'public/assets/lessons/topic02/datum-field-challenge');
const W = 2000;
const H = 1120;
/** Thumbnail window in frame px (16:9) and its delivered size. */
const CROP_W = 520;
const CROP_H = Math.round((CROP_W * 9) / 16);
const THUMB = { w: 640, h: 360 };
/** Where transparency is flattened in a thumbnail: the card's bg-accent (#F6EFE6). */
const MATTE = { r: 0xf6, g: 0xef, b: 0xe6 };
const THUMBS = { bridge: 'thumb-bridge', junction: 'thumb-junction', summit: 'thumb-summit' };

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const master = path.join(source, 'terrain-base.png');
  const meta = await sharp(master).metadata();
  const ss = meta.width / W;
  if (Math.abs(meta.height / H - ss) > 1e-6 || ss < 1) throw new Error(`${master}: ${meta.width}×${meta.height} is not the ${W}×${H} frame or a multiple of it`);
  const frame = JSON.parse(fs.readFileSync(path.join(source, 'frame.json'), 'utf8'));
  if (frame.frame[0] !== W || frame.frame[1] !== H) throw new Error('frame.json is for another frame size');

  const base = path.join(out, 'terrain-base.webp');
  await sharp(master).resize(W, H, { kernel: 'lanczos3' }).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(base);
  let total = fs.statSync(base).size;
  console.log(`terrain-base.webp  ${W}×${H}  ${(fs.statSync(base).size / 1024).toFixed(0)} KB`);

  for (const [id, name] of Object.entries(THUMBS)) {
    const [ax, ay] = frame.landmarks[id].anchor;
    const left = Math.round(Math.min(W - CROP_W, Math.max(0, ax - CROP_W / 2)));
    const top = Math.round(Math.min(H - CROP_H, Math.max(0, ay - CROP_H / 2)));
    const file = path.join(out, `${name}.webp`);
    await sharp(master)
      .extract({ left: Math.round(left * ss), top: Math.round(top * ss), width: Math.round(CROP_W * ss), height: Math.round(CROP_H * ss) })
      .resize(THUMB.w, THUMB.h, { kernel: 'lanczos3' })
      .flatten({ background: MATTE })
      .webp({ quality: 84, effort: 6 })
      .toFile(file);
    total += fs.statSync(file).size;
    console.log(`${name}.webp  ${THUMB.w}×${THUMB.h}  crop ${CROP_W}×${CROP_H} at ${left},${top}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
  console.log(`total ${(total / 1024).toFixed(0)} KB`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
