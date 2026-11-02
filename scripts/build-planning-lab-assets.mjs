// The planning lab's own ground, sky and rocks (lesson 6, „לפני שיוצאים: מה צריך לתכנן?”).
//
//   terrain/albedo.webp  eight scanned CC0 ground layers from Poly Haven, 512 px each, stacked top to
//                        bottom in one 512 × 4096 strip (RGB, sRGB) — the shader reads it as one
//                        texture array, layer k = rows 512·k…512·k + 511
//   terrain/normal.webp  the same layers: OpenGL normal X / Y in RG, displacement (stretched to 0–1)
//                        in B — RGB only, so no pixel is lost under a zero alpha
//   sky.webp, rocks.glb  copies of the navigation replay's (see ATTRIBUTIONS.md), kept as copied
//
// Each layer is flipped vertically before it is stacked: the strip's first row is v = 0 of its layer,
// as an OpenGL normal map expects (WebGL uploads a texture array without flipping it).
// Downloads are cached in <os tmp>/geo-planning-lab-src. Run:   node scripts/build-planning-lab-assets.mjs
import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPLAY = path.join(ROOT, 'public/assets/lessons/topic06/navigation-replay');
const OUT = path.join(ROOT, 'public/assets/lessons/topic06/planning-lab');
const SRC = path.join(tmpdir(), 'geo-planning-lab-src');
const SIZE = 512;

/** The layers, in the order of the strip (planningLabGround LAYERS): our name → Poly Haven id. */
const LAYERS = [
  ['grass', 'withered_grass'], // dry, pale grass — the open hillside
  ['herbs', 'sparse_grass'], // low green herbs on soil — hollows, drainage lines, north faces
  ['soil', 'dry_ground_rocks'], // brown stony soil — bare patches, pockets between the rock
  ['rubble', 'rocks_ground_05'], // pale limestone rubble in soil — below the ledges, rocky slopes
  ['bedrock', 'worn_rock_natural_01'], // weathered pale limestone — the outcrops and ledges
  ['pebbles', 'dry_river_pebbles'], // rounded pebbles — the beds of the stream and the ravine
  ['trail', 'rocky_trail'], // packed stony dirt — the dirt roads and the building's yard
  ['needles', 'forest_leaves_04'], // pine needles and cones — the grove floor
];

const exists = (p) => access(p).then(() => true, () => false);

async function download(url, file) {
  if (await exists(file)) return file;
  await mkdir(path.dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log('  ↓', path.basename(file));
  return file;
}

async function files(id) {
  const res = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!res.ok) throw new Error(`${res.status} files/${id}`);
  return res.json();
}

/** One map of one layer as SIZE² raw pixels, flipped, `channels` wide. */
async function raw(file, channels) {
  let s = sharp(file).resize(SIZE, SIZE, { kernel: 'lanczos3' }).flip();
  s = channels === 1 ? s.greyscale() : s.removeAlpha();
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== channels) throw new Error(`${file}: ${info.channels} channels`);
  return data;
}

async function buildTerrain() {
  await mkdir(path.join(OUT, 'terrain'), { recursive: true });
  const albedo = Buffer.alloc(SIZE * SIZE * 3 * LAYERS.length);
  const normal = Buffer.alloc(SIZE * SIZE * 3 * LAYERS.length);
  for (let k = 0; k < LAYERS.length; k++) {
    const [name, id] = LAYERS[k];
    const f = await files(id);
    const get = (key) => download(f[key]['1k'].jpg.url, path.join(SRC, id, `${id}_${key}_1k.jpg`));
    const [diff, nor, disp] = await Promise.all([get('Diffuse'), get('nor_gl'), get('Displacement')]);
    const a = await raw(diff, 3);
    const n = await raw(nor, 3);
    const d = await raw(disp, 1);
    let lo = 255;
    let hi = 0;
    for (const v of d) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const o = k * SIZE * SIZE * 3;
    a.copy(albedo, o);
    for (let i = 0; i < SIZE * SIZE; i++) {
      normal[o + i * 3] = n[i * 3];
      normal[o + i * 3 + 1] = n[i * 3 + 1];
      normal[o + i * 3 + 2] = Math.round(((d[i] - lo) / Math.max(1, hi - lo)) * 255);
    }
    console.log(`layer ${k} ${name} ← ${id}`);
  }
  const strip = { raw: { width: SIZE, height: SIZE * LAYERS.length, channels: 3 } };
  const A = await sharp(albedo, strip).webp({ quality: 90, smartSubsample: true }).toFile(path.join(OUT, 'terrain', 'albedo.webp'));
  const N = await sharp(normal, strip).webp({ quality: 92 }).toFile(path.join(OUT, 'terrain', 'normal.webp'));
  console.log(`terrain/albedo.webp ${(A.size / 1024) | 0} KB, terrain/normal.webp ${(N.size / 1024) | 0} KB`);
}

await buildTerrain();
// sky.webp and rocks.glb were copied once from the navigation replay (2026-11-01); --copy-replay copies them again
if (process.argv.includes('--copy-replay')) {
  await copyFile(path.join(REPLAY, 'sky.webp'), path.join(OUT, 'sky.webp'));
  await copyFile(path.join(REPLAY, 'rocks.glb'), path.join(OUT, 'rocks.glb'));
}
console.log('planning-lab assets written to', OUT);
