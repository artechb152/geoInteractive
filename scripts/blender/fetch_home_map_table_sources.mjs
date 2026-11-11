// CC0 sources for the homepage map-table renders (render_home_map_table.py):
//   - Poly Haven "Caban" wool scan  -> the green felt desk (recoloured in the shader)
// Downloads into qa-output/home-map-table/src (git-ignored). Run once:
//   node scripts/blender/fetch_home_map_table_sources.mjs
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'qa-output/home-map-table/src');
const CDN = 'https://dl.polyhaven.org/file/ph-assets';
const FILES = {
  'caban/caban_diff_4k.jpg': `${CDN}/Textures/jpg/4k/caban/caban_diff_4k.jpg`,
  'caban/caban_nor_gl_4k.jpg': `${CDN}/Textures/jpg/4k/caban/caban_nor_gl_4k.jpg`,
  'caban/caban_rough_4k.jpg': `${CDN}/Textures/jpg/4k/caban/caban_rough_4k.jpg`,
};

for (const [rel, url] of Object.entries(FILES)) {
  const file = path.join(out, rel);
  try { await access(file); continue; } catch { /* download */ }
  await mkdir(path.dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log('fetched', rel);
}
console.log('sources ready in', path.relative(root, out));

// Chapter 01 relief: Mount Hermon from the public Terrarium elevation tiles (AWS Open Data,
// SRTM-derived; attribution in public/assets/home/map-table/ATTRIBUTIONS.md). Zoom 13 (~16 m/px),
// tiles x 4908..4919, y 3281..3294 -> one float32 heightfield (metres, row 0 = north).
{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json', { paths: [root] }))] }));
  const X0 = 4908, X1 = 4919, Y0 = 3281, Y1 = 3294, T = 256;
  const W = (X1 - X0 + 1) * T, H = (Y1 - Y0 + 1) * T;
  const target = path.join(out, `dem/hermon13-${W}x${H}.f32`);
  try { await access(target); } catch {
    await mkdir(path.dirname(target), { recursive: true });
    const field = new Float32Array(W * H);
    for (let ty = Y0; ty <= Y1; ty++) for (let tx = X0; tx <= X1; tx++) {
      const tile = path.join(out, `dem/h13-${tx}-${ty}.png`);
      try { await access(tile); } catch {
        const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/${tx}/${ty}.png`);
        if (!res.ok) throw new Error(`terrarium ${tx}/${ty}: ${res.status}`);
        await writeFile(tile, Buffer.from(await res.arrayBuffer()));
      }
      const { data } = await sharp(tile).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const i = (y * T + x) * 3;
        field[((ty - Y0) * T + y) * W + (tx - X0) * T + x] = data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
      }
    }
    await writeFile(target, Buffer.from(field.buffer));
    console.log('stitched', path.relative(root, target));
  }
}
