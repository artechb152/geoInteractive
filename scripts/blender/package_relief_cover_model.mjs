// Packs render_relief_cover_model.py's renders for the live "בשטח" model (ReliefCover3D.tsx).
//
//   node scripts/blender/package_relief_cover_model.mjs
//
// qa-output/relief-cover-model/renders/{outer,mid,bare,grove,built,quarry,objects}.png
//   → public/assets/lessons/topic02/relief-cover-model/*.webp
// `objects` (RGBA: crowns and roofs on a cut-out ground) is flattened to RGB with its colours bled
// outward into the empty ground, so a 3D crown a little wider than its render still samples foliage.
import { createRequire } from 'node:module';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const SRC = 'qa-output/relief-cover-model/renders';
const OUT = 'public/assets/lessons/topic02/relief-cover-model';
// the far ground is seen through haze and from afar: it takes a lower quality than the sheet
const PASSES = { outer: 72, mid: 78, bare: 80, grove: 80, built: 80, quarry: 80, objects: 82 };

/** RGBA → RGB: opaque pixels keep their colour; the rest take the nearest colour (ever wider
 *  premultiplied blurs, the first one with enough coverage wins). */
async function bleed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  // colour and coverage blurred as separate images (a 4th channel would be treated as alpha)
  const pre = Buffer.alloc(n * 3);
  const cov = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) pre[i * 3 + c] = Math.round(data[i * 4 + c] * a);
    cov[i] = data[i * 4 + 3];
  }
  const levels = [];
  for (const sigma of [1.5, 4, 10, 28, 80]) {
    const C = await sharp(pre, { raw: { width: w, height: h, channels: 3 } }).blur(sigma).raw().toBuffer();
    const A = await sharp(cov, { raw: { width: w, height: h, channels: 1 } }).blur(sigma).raw().toBuffer();
    levels.push([C, A]);
  }
  const out = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    let r = 0, g = 0, b = 0;
    if (a >= 250) {
      [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    } else {
      let fill = null;
      for (const [C, A] of levels) {
        if (A[i] >= 24) {
          const k = 255 / A[i];
          fill = [C[i * 3] * k, C[i * 3 + 1] * k, C[i * 3 + 2] * k];
          break;
        }
      }
      fill ??= [70, 80, 50];
      // partly covered pixels: the render's own colour over the fill
      const t = a / 255;
      [r, g, b] = [0, 1, 2].map((c) => (t > 0 ? data[i * 4 + c] : 0) * t + fill[c] * (1 - t));
    }
    out[i * 3] = Math.min(255, Math.round(r));
    out[i * 3 + 1] = Math.min(255, Math.round(g));
    out[i * 3 + 2] = Math.min(255, Math.round(b));
  }
  return sharp(out, { raw: { width: w, height: h, channels: 3 } });
}

await mkdir(OUT, { recursive: true });
for (const [name, quality] of Object.entries(PASSES)) {
  const file = `${OUT}/${name}.webp`;
  const src = `${SRC}/${name}.png`;
  const img = name === 'objects' ? await bleed(src) : sharp(src);
  const info = await img.webp({ quality, effort: 6 }).toFile(file);
  console.log(`${file}  ${info.width} × ${info.height}  ${((await stat(file)).size / 1024).toFixed(0)} KB`);
}
