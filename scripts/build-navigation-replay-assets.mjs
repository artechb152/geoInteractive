/**
 * Builds the photo materials and the sky of the lesson-6 navigation replay
 * („מתי עוצרים לבדוק?”) from Poly Haven CC0 sources:
 *   public/assets/lessons/topic06/navigation-replay/
 *     ground/<layer>_albedo.webp  — diffuse (sRGB) in RGB, displacement in A (height blending)
 *     ground/<layer>_normal.webp  — OpenGL normal X/Y in RG, roughness in B (Z is rebuilt in the shader)
 *     sky.webp                    — the sky dome (equirect, upper 5/8 of Poly Haven's tone-mapped JPG)
 * Models and sprites come from scripts/blender/build_navigation_replay_models.py,
 * which reads the glTF sources this script downloads (step 1).
 *
 * Downloads go to <os tmp>/geo-navigation-replay-src (reused when present).
 * Run: node scripts/build-navigation-replay-assets.mjs [--only=ground|sky|models]
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// sharp ships with next (its image optimiser); resolve it from there, it is not a direct dependency.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/lessons/topic06/navigation-replay');
export const SRC = path.join(tmpdir(), 'geo-navigation-replay-src');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

/** Ground layers: Poly Haven id → our layer name. */
const GROUND = {
  grass: 'grass_path_3', // dry, pale grass with small stones — the hillside cover
  soil: 'rocks_ground_08', // brown stony soil
  limestone: 'rocks_ground_06', // pale limestone breaking through the soil
  gravel: 'rocks_ground_01', // light gravel — the dirt road and the stream bed
};
const SKY = 'kloofendal_48d_partly_cloudy_puresky';
/** glTF models the Blender step reads. */
export const MODELS = ['searsia_lucida', 'rock_moss_set_02', 'namaqualand_stones_01', 'namaqualand_rocks_01'];

const exists = (p) => access(p).then(() => true, () => false);

async function download(url, file) {
  if (await exists(file)) return file;
  await mkdir(path.dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log('  ↓', path.relative(SRC, file));
  return file;
}

async function files(id) {
  const res = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!res.ok) throw new Error(`${res.status} files/${id}`);
  return res.json();
}

async function buildGround() {
  await mkdir(path.join(OUT, 'ground'), { recursive: true });
  for (const [layer, id] of Object.entries(GROUND)) {
    const f = await files(id);
    const get = (key) => download(f[key]['1k'].jpg.url, path.join(SRC, 'ground', `${id}_${key}.jpg`));
    const [diff, nor, rough, disp] = await Promise.all([get('Diffuse'), get('nor_gl'), get('Rough'), get('Displacement')]);

    // Displacement stretched to the full 0–1 range, so every layer blends on the same scale.
    const d = await sharp(disp).greyscale().normalise().raw().toBuffer({ resolveWithObject: true });
    const albedo = await sharp(diff).removeAlpha().joinChannel(d.data, { raw: d.info }).webp({ quality: 84, alphaQuality: 90 }).toFile(path.join(OUT, 'ground', `${layer}_albedo.webp`));

    const n = await sharp(nor).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const r = await sharp(rough).greyscale().raw().toBuffer();
    const packed = Buffer.alloc(n.info.width * n.info.height * 3);
    for (let i = 0, j = 0; i < packed.length; i += 3, j++) {
      packed[i] = n.data[j * n.info.channels];
      packed[i + 1] = n.data[j * n.info.channels + 1];
      packed[i + 2] = r[j];
    }
    const normal = await sharp(packed, { raw: { width: n.info.width, height: n.info.height, channels: 3 } })
      .webp({ quality: 90 })
      .toFile(path.join(OUT, 'ground', `${layer}_normal.webp`));
    console.log(`ground/${layer} ← ${id}: albedo ${(albedo.size / 1024) | 0} KB, normal ${(normal.size / 1024) | 0} KB`);
  }
}

async function buildSky() {
  const f = await files(SKY);
  const jpg = await download(f.tonemapped.url, path.join(SRC, `${SKY}_tonemapped.jpg`));
  const W = 4096;
  const H = 2048;
  // The upper 5/8 of the equirect: the sky and a band below the horizon the terrain always hides.
  const keep = Math.round(H * 0.625);
  const out = await sharp(jpg, { limitInputPixels: false })
    .resize(W, H, { kernel: 'lanczos3' })
    .extract({ left: 0, top: 0, width: W, height: keep })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, 'sky.webp'));
  console.log(`sky.webp ← ${SKY}: ${W}×${keep}, ${(out.size / 1024) | 0} KB`);
}

async function fetchModels() {
  for (const id of MODELS) {
    const f = await files(id);
    const g = f.gltf['1k'].gltf;
    const dir = path.join(SRC, 'models', id);
    await download(g.url, path.join(dir, path.basename(new URL(g.url).pathname)));
    for (const [rel, inc] of Object.entries(g.include ?? {})) await download(inc.url, path.join(dir, rel));
  }
  console.log('models →', path.join(SRC, 'models'));
}

await mkdir(OUT, { recursive: true });
if (!only || only === 'ground') await buildGround();
if (!only || only === 'sky') await buildSky();
if (!only || only === 'models') await fetchModels();

/**
 * Shrub atlases from the Blender sprites (scripts/blender/build_navigation_replay_models.py -- sprites):
 *   shrub_leaves.webp — 4 × 2 canopy close-ups, each faded to an irregular round edge (leaf cards)
 *   shrub_far.webp    — 4 dense bush silhouettes composed from the close-ups (far billboards)
 * The leaves are graded towards the dark, glossy olive of Mediterranean maquis (lentisk, Phillyrea).
 */
const CLUSTERS = ['cluster_0_0', 'cluster_0_1', 'cluster_2_0', 'cluster_2_1', 'cluster_3_1', 'cluster_1_0', 'cluster_3_0', 'cluster_4_1'];

function hash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** RGBA buffer of a cluster sprite, alpha × an irregular round mask, colour-graded. */
async function maskedCluster(name, size, seed) {
  const { data, info } = await sharp(path.join(SRC, 'sprites', `${name}.png`)).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - c) / c;
      const dy = (y - c) / c;
      const a = Math.atan2(dy, dx);
      // lobed radius so the card's outline is never a circle
      const r = 0.78 + 0.1 * Math.sin(a * 3 + seed * 5) + 0.06 * Math.sin(a * 7 + seed * 11);
      const d = Math.hypot(dx, dy) / r;
      const m = Math.min(1, Math.max(0, (1 - d) / 0.18));
      const i = (y * size + x) * 4;
      // grade: towards dark olive, a little more saturated
      const R = out[i], G = out[i + 1], B = out[i + 2];
      const l = 0.3 * R + 0.59 * G + 0.11 * B;
      out[i] = Math.min(255, (l + (R - l) * 1.15) * 0.62);
      out[i + 1] = Math.min(255, (l + (G - l) * 1.25) * 0.7);
      out[i + 2] = Math.min(255, (l + (B - l) * 1.1) * 0.5);
      out[i + 3] = Math.round(out[i + 3] * m);
    }
  }
  return { data: out, info: { width: size, height: size, channels: 4 } };
}

async function buildSprites() {
  const cell = 512;
  const leaves = [];
  for (let k = 0; k < CLUSTERS.length; k++) {
    const m = await maskedCluster(CLUSTERS[k], cell, k + 1);
    leaves.push({ input: await sharp(m.data, { raw: m.info }).png().toBuffer(), left: (k % 4) * cell, top: Math.floor(k / 4) * cell });
  }
  const a = await sharp({ create: { width: cell * 4, height: cell * 2, channels: 4, background: { r: 40, g: 48, b: 30, alpha: 0 } } })
    .composite(leaves)
    .webp({ quality: 86, alphaQuality: 92 })
    .toFile(path.join(OUT, 'shrub_leaves.webp'));
  console.log(`shrub_leaves.webp: ${(a.size / 1024) | 0} KB`);

  // far billboards: a dome of clusters, darker and smaller towards the base and the core
  const far = 512;
  const tiles = [];
  for (let v = 0; v < 4; v++) {
    const parts = [];
    const n = 34;
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const ang = Math.PI * (0.05 + 0.9 * hash(v * 97 + j));
      const rad = 0.25 + 0.75 * Math.sqrt(hash(v * 31 + j * 7));
      const w = 0.62 + 0.18 * hash(v * 13 + j);
      const cx = 0.5 + Math.cos(ang) * rad * 0.42 * w;
      const cy = 0.98 - Math.sin(ang) * rad * (0.62 + 0.12 * hash(v + j * 3)) ;
      const s = Math.round(far * (0.3 + 0.16 * hash(v * 5 + j * 11)) * (0.75 + 0.25 * t));
      const m = await maskedCluster(CLUSTERS[(j + v) % CLUSTERS.length], s, j + v * 10);
      // shade the lower clusters
      const shade = 0.6 + 0.4 * Math.min(1, (1 - cy) * 1.6);
      for (let i = 0; i < m.data.length; i += 4) {
        m.data[i] *= shade;
        m.data[i + 1] *= shade;
        m.data[i + 2] *= shade;
      }
      parts.push({ input: await sharp(m.data, { raw: m.info }).png().toBuffer(), left: Math.round(cx * far - s / 2), top: Math.round(cy * far - s * 0.9) });
    }
    const tile = await sharp({ create: { width: far, height: far, channels: 4, background: { r: 40, g: 48, b: 30, alpha: 0 } } })
      .composite(parts.map((p) => ({ ...p, left: Math.max(-p.left, 0) ? 0 : p.left, top: Math.max(0, p.top) })))
      .png()
      .toBuffer();
    tiles.push({ input: tile, left: (v % 2) * far, top: Math.floor(v / 2) * far });
  }
  const b = await sharp({ create: { width: far * 2, height: far * 2, channels: 4, background: { r: 40, g: 48, b: 30, alpha: 0 } } })
    .composite(tiles)
    .webp({ quality: 86, alphaQuality: 92 })
    .toFile(path.join(OUT, 'shrub_far.webp'));
  console.log(`shrub_far.webp: ${(b.size / 1024) | 0} KB`);
}

if (only === 'sprites') await buildSprites();
