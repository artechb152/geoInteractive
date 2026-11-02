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
 * The second generation (v2/, the live view since 2026-11-01): see the v2 section below.
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
    // One channel, and no removeAlpha() on the diffuse: sharp runs removeAlpha after joinChannel whatever the call order,
    // which silently dropped the displacement (the albedos shipped without it until 2026-11-01).
    const d = await sharp(disp).greyscale().normalise().extractChannel(0).raw().toBuffer({ resolveWithObject: true });
    const albedo = await sharp(diff)
      .joinChannel(d.data, { raw: { width: d.info.width, height: d.info.height, channels: 1 } })
      .webp({ quality: 84, alphaQuality: 90, exact: true })
      .toFile(path.join(OUT, 'ground', `${layer}_albedo.webp`));

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

// ═════════════════════════════════════════════════════════════ v2 (2026-11-01 graphics pass)
//
// The second generation of the replay's assets, written to navigation-replay/v2/ next to the first
// (whose names an older build still loads): ground scans at their real size, the scanned plants,
// trees and limestone rocks the Blender step (scripts/blender/build_navigation_replay_v2.py) reduces.
// Order (the Blender step between the node steps):
//   node   … --only=v2-fetch     download every v2 source (textures 2K, models 1K glTF + cut-out masks) into <tmp>/geo-navigation-replay-src
//   node   … --only=v2-ground    the ground layers → v2/ground/<layer>_albedo.jpg, <layer>_normal.jpg
//   blender … build_navigation_replay_v2.py -- all   rocks.glb, leaf-cluster and far-shrub renders, plants.glb, pines.glb
//   node   … --only=v2-plants    the scans' own atlases (wood, grass blades) and each rock's maps → v2/plants, v2/rocks
//   node   … --only=v2-clusters  the leaf-cluster atlases, the far-shrub atlas and the barks → v2/plants

const OUT2 = path.join(OUT, 'v2');
/**
 * Ground layers v2, with the scan's real width (Poly Haven's dimensions) — the shader tiles each at
 * that size, so a pebble is as big as it was in the photograph.
 */
export const GROUND2 = {
  cover: { id: 'grass_ground', m: 2.5 }, // dry turf: dead grass, roots and soil — the hillside cover
  soil: { id: 'rocks_ground_02', m: 2.0 }, // brown earth with stones and broken rock — bare patches
  karst: { id: 'rocks_ground_05', m: 3.0 }, // pale limestone knobs breaking through the soil
  gravel: { id: 'rocks_ground_09', m: 3.0 }, // pale broken stone and grit — the dirt road and the stream bed
};
const TEX2_KEYS = ['Diffuse', 'nor_gl', 'Displacement', 'AO'];
/** glTF models (1K) for the Blender step. */
export const MODELS2 = [
  'searsia_burchellii', // dense, dark evergreen — lentisk and Phillyrea of the maquis
  'searsia_lucida', // a looser, lighter evergreen shrub
  'wild_rooibos_bush', // wiry, dry dwarf shrub — thorny burnet / dry sage in autumn
  'grass_medium_02', // a dry, brown grass clump — the autumn tufts
  'island_tree_01', // gnarled trunk, dense rounded crown — the oaks (and, greyer, the olives)
  'island_tree_02',
  'pine_sapling_small', // pine twigs and bark for the Aleppo pines
  'moon_rock_01', 'moon_rock_02', 'moon_rock_03', 'moon_rock_04', 'moon_rock_05', 'moon_rock_06', 'moon_rock_07', // pale weathered limestone
  'boulder_01', // a karst boulder, pitted and lichened
  'namaqualand_boulder_05', // a rounded, flat outcrop slab
];

async function fetchV2() {
  for (const { id } of Object.values(GROUND2)) {
    const f = await files(id);
    for (const key of TEX2_KEYS) await download(f[key]['2k'].jpg.url, path.join(SRC, 'ground2k', `${id}_${key}.jpg`));
  }
  for (const id of MODELS2) {
    const f = await files(id);
    const g = f.gltf['1k'].gltf;
    const dir = path.join(SRC, 'models', id);
    await download(g.url, path.join(dir, path.basename(new URL(g.url).pathname)));
    for (const [rel, inc] of Object.entries(g.include ?? {})) await download(inc.url, path.join(dir, rel));
    // the glTF's JPEGs carry no alpha: the cut-out masks (and the grass's dried diffuse) come separately
    for (const key of ['Alpha', 'leaves_alpha', 'twig_alpha', 'dry_diff']) {
      const jpg = f[key]?.['1k']?.jpg ?? f[key]?.['1k']?.png;
      if (jpg) await download(jpg.url, path.join(dir, 'textures', `${id}_${key}_1k.${jpg.url.split('.').pop()}`));
    }
  }
  console.log('v2 sources →', SRC);
}

/**
 * v2/ground/<layer>_albedo.jpg — the diffuse map (sRGB); 2048 px for the hillside cover the eye sees
 *                                 closest, 1536 px for the others
 * v2/ground/<layer>_normal.jpg — OpenGL normal X / Y in RG, the displacement (stretched to 0–1) in B,
 *                                 1024 px; JPEG 4:4:4, so X and Y keep their full resolution (lossy WebP
 *                                 halves the chroma) and the height stays out of an expensive alpha channel
 */
async function buildGroundV2() {
  await mkdir(path.join(OUT2, 'ground'), { recursive: true });
  for (const [layer, { id }] of Object.entries(GROUND2)) {
    const src = (key) => path.join(SRC, 'ground2k', `${id}_${key}.jpg`);
    const albedoSize = layer === 'cover' ? 2048 : 1536;
    const albedo = await sharp(src('Diffuse')).resize(albedoSize, albedoSize, { kernel: 'lanczos3' }).removeAlpha().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT2, 'ground', `${layer}_albedo.jpg`));
    const size = 1024;
    const n = await sharp(src('nor_gl')).resize(size, size, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const d = await sharp(src('Displacement')).resize(size, size).greyscale().normalise().extractChannel(0).raw().toBuffer();
    const packed = Buffer.alloc(size * size * 3);
    for (let j = 0; j < size * size; j++) {
      packed[j * 3] = n.data[j * n.info.channels];
      packed[j * 3 + 1] = n.data[j * n.info.channels + 1];
      packed[j * 3 + 2] = d[j];
    }
    const normal = await sharp(packed, { raw: { width: size, height: size, channels: 3 } })
      .jpeg({ quality: 84, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(path.join(OUT2, 'ground', `${layer}_normal.jpg`));
    console.log(`v2/ground/${layer} ← ${id}: albedo ${(albedo.size / 1024) | 0} KB, normal ${(normal.size / 1024) | 0} KB`);
  }
}

if (only === 'v2-fetch') await fetchV2();
if (only === 'v2-ground') await buildGroundV2();

/**
 * Colour of the transparent texels pulled out from the opaque ones (a few texels per pass), so a
 * leaf's edge filters and mip-maps towards its own colour, never towards the black of the scan's
 * background — no dark or pale outline round a leaf at any distance.
 */
function dilate(rgba, w, h, passes = 24, solidAlpha = 96) {
  const solid = new Uint8Array(w * h);
  for (let j = 0; j < w * h; j++) solid[j] = rgba[j * 4 + 3] >= solidAlpha ? 1 : 0;
  let sum = [0, 0, 0];
  let n = 0;
  for (let j = 0; j < w * h; j++)
    if (solid[j]) {
      sum[0] += rgba[j * 4];
      sum[1] += rgba[j * 4 + 1];
      sum[2] += rgba[j * 4 + 2];
      n++;
    }
  for (let pass = 0; pass < passes; pass++) {
    const next = solid.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const j = y * w + x;
        if (solid[j]) continue;
        let r = 0, g = 0, b = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const k = yy * w + xx;
            if (!solid[k]) continue;
            r += rgba[k * 4];
            g += rgba[k * 4 + 1];
            b += rgba[k * 4 + 2];
            c++;
          }
        if (c) {
          rgba[j * 4] = r / c;
          rgba[j * 4 + 1] = g / c;
          rgba[j * 4 + 2] = b / c;
          next[j] = 1;
        }
      }
    solid.set(next);
  }
  for (let j = 0; j < w * h; j++)
    if (!solid[j]) {
      rgba[j * 4] = sum[0] / n;
      rgba[j * 4 + 1] = sum[1] / n;
      rgba[j * 4 + 2] = sum[2] / n;
    }
}

/**
 * v2/plants/<species>_albedo.webp — diffuse in RGB (dilated under the transparent texels), the cut-out mask in A
 * v2/rocks/rock_<k>_albedo.jpg, rock_<k>_normal.jpg — each scanned rock's own maps
 */
const PLANT_TEX = {
  burchellii: { id: 'searsia_burchellii', diff: 'diff_1k.jpg', alpha: 'Alpha_1k.jpg', size: 1024 },
  lucida: { id: 'searsia_lucida', diff: 'diff_1k.jpg', alpha: 'Alpha_1k.jpg', size: 1024 },
  rooibos: { id: 'wild_rooibos_bush', diff: 'diff_1k.jpg', alpha: 'Alpha_1k.jpg', size: 1024 },
  grass: { id: 'grass_medium_02', diff: 'dry_diff_1k.jpg', alpha: 'Alpha_1k.jpg', size: 1024 },
};
const ROCK_TEX = ['moon_rock_01', 'moon_rock_02', 'moon_rock_03', 'moon_rock_04', 'moon_rock_05', 'moon_rock_06', 'moon_rock_07', 'boulder_01', 'namaqualand_boulder_05'];

async function buildPlantTexturesV2() {
  await mkdir(path.join(OUT2, 'plants'), { recursive: true });
  await mkdir(path.join(OUT2, 'rocks'), { recursive: true });
  for (const [name, t] of Object.entries(PLANT_TEX)) {
    const dir = path.join(SRC, 'models', t.id, 'textures');
    const { data, info } = await sharp(path.join(dir, `${t.id}_${t.diff}`)).resize(t.size, t.size).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const a = await sharp(path.join(dir, `${t.id}_${t.alpha}`)).resize(t.size, t.size).greyscale().extractChannel(0).raw().toBuffer();
    const rgba = Buffer.alloc(t.size * t.size * 4);
    for (let j = 0; j < t.size * t.size; j++) {
      rgba[j * 4] = data[j * info.channels];
      rgba[j * 4 + 1] = data[j * info.channels + 1];
      rgba[j * 4 + 2] = data[j * info.channels + 2];
      rgba[j * 4 + 3] = a[j];
    }
    dilate(rgba, t.size, t.size);
    const albedo = await sharp(rgba, { raw: { width: t.size, height: t.size, channels: 4 } })
      .webp({ quality: 86, alphaQuality: 100, smartSubsample: true, exact: true })
      .toFile(path.join(OUT2, 'plants', `${name}_albedo.webp`));
    console.log(`v2/plants/${name}: albedo ${(albedo.size / 1024) | 0} KB`);
  }
  for (const [k, id] of ROCK_TEX.entries()) {
    const dir = path.join(SRC, 'models', id, 'textures');
    const size = id.startsWith('moon') ? 512 : 1024;
    const albedo = await sharp(path.join(dir, `${id}_diff_1k.jpg`)).resize(size, size).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT2, 'rocks', `rock_${k}_albedo.jpg`));
    const normal = await sharp(path.join(dir, `${id}_nor_gl_1k.jpg`)).resize(size, size).jpeg({ quality: 84, chromaSubsampling: '4:4:4', mozjpeg: true }).toFile(path.join(OUT2, 'rocks', `rock_${k}_normal.jpg`));
    console.log(`v2/rocks/rock_${k} ← ${id}: albedo ${(albedo.size / 1024) | 0} KB, normal ${(normal.size / 1024) | 0} KB`);
  }
}

if (only === 'v2-plants') await buildPlantTexturesV2();

/**
 * v2/plants/<name>_clusters.webp — the leaf clusters the crowns are built from (the Blender step's
 * renders of each scan's outer foliage, `-- clusters`), 4 × 2 cells of 512 px, each faded to an
 * irregular round edge (a card never shows its square), colour-dilated under the mask.
 * v2/plants/oak_bark.jpg, pine_bark.jpg — the trunks' bark.
 */
async function buildClustersV2() {
  const SPR = path.join(SRC, 'v2sprites');
  const cell = 512;
  for (const name of ['maquis', 'lucida', 'dwarf', 'pine']) {
    const atlas = Buffer.alloc(cell * 4 * cell * 2 * 4);
    for (let k = 0; k < 8; k++) {
      const { data } = await sharp(path.join(SPR, `${name}_${k}.png`)).resize(cell, cell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const c = cell / 2;
      for (let y = 0; y < cell; y++)
        for (let x = 0; x < cell; x++) {
          const dx = (x - c) / c;
          const dy = (y - c) / c;
          const a = Math.atan2(dy, dx);
          // lobed radius, so no two cards share one outline and none is a circle
          const r = 0.86 + 0.07 * Math.sin(a * 3 + k * 1.7) + 0.05 * Math.sin(a * 5 + k * 2.9);
          const m = Math.min(1, Math.max(0, (r - Math.hypot(dx, dy)) / 0.16));
          const i = (y * cell + x) * 4;
          data[i + 3] = Math.round(data[i + 3] * m);
        }
      const ox = (k % 4) * cell;
      const oy = Math.floor(k / 4) * cell;
      for (let y = 0; y < cell; y++) data.copy(atlas, ((oy + y) * cell * 4 + ox) * 4, y * cell * 4, (y + 1) * cell * 4);
    }
    // the renders' antialiased rims carry the white sky's light: recolour everything not fully opaque
    dilate(atlas, cell * 4, cell * 2, 16, 230);
    const out = await sharp(atlas, { raw: { width: cell * 4, height: cell * 2, channels: 4 } })
      .webp({ quality: 86, alphaQuality: 100, smartSubsample: true, exact: true })
      .toFile(path.join(OUT2, 'plants', `${name}_clusters.webp`));
    console.log(`v2/plants/${name}_clusters.webp: ${(out.size / 1024) | 0} KB`);
  }
  // far billboards: the four whole-shrub renders, 2 × 2 cells of 512 px
  {
    const far = Buffer.alloc(cell * 2 * cell * 2 * 4);
    for (let k = 0; k < 4; k++) {
      const { data } = await sharp(path.join(SPR, `far_${k}.png`)).resize(cell, cell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const ox = (k % 2) * cell;
      const oy = Math.floor(k / 2) * cell;
      for (let y = 0; y < cell; y++) data.copy(far, ((oy + y) * cell * 2 + ox) * 4, y * cell * 4, (y + 1) * cell * 4);
    }
    dilate(far, cell * 2, cell * 2, 16, 230);
    const out = await sharp(far, { raw: { width: cell * 2, height: cell * 2, channels: 4 } })
      .webp({ quality: 86, alphaQuality: 100, smartSubsample: true, exact: true })
      .toFile(path.join(OUT2, 'plants', 'far_shrubs.webp'));
    console.log(`v2/plants/far_shrubs.webp: ${(out.size / 1024) | 0} KB`);
  }
  const bark = [
    ['oak_bark', path.join(SRC, 'models', 'island_tree_01', 'textures', 'island_tree_01_diff_1k.jpg')],
    ['pine_bark', path.join(SRC, 'models', 'pine_sapling_small', 'textures', 'pine_sapling_small_bark_diff_1k.jpg')],
  ];
  for (const [name, file] of bark) {
    const out = await sharp(file).resize(512, 512).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT2, 'plants', `${name}.jpg`));
    console.log(`v2/plants/${name}.jpg: ${(out.size / 1024) | 0} KB`);
  }
}

if (only === 'v2-clusters') await buildClustersV2();
