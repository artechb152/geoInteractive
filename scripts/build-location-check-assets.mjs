/**
 * Builds the vegetation cards of the lesson-6 location check („באיזה אזור אתם נמצאים?”)
 * from Poly Haven CC0 scans:
 *   public/assets/lessons/topic06/location-check/vegetation/
 *     atlas_albedo.webp  — base colour × baked ambient occlusion (sRGB) in RGB, coverage in A
 *     atlas_normal.webp  — the card's tangent-space normal (x right, y up, z towards the eye)
 *   src/components/lessons/topic-06/locationCheckSpriteAtlas.ts — each cell's place in the atlas,
 *     the plant's root inside it and its size in metres (generated; do not edit)
 *
 * Steps:
 *   1. --only=models  download the glTF sources to <os tmp>/geo-location-check-src/models (reused when present)
 *   2. Blender        scripts/blender/build_location_check_sprites.py renders every plant to
 *                     <tmp>/geo-location-check-src/sprites (albedo + normal PNGs and cells.json)
 *   3. --only=atlas   packs those renders into the two atlases (colour bled into the transparent
 *                     margin so mip levels keep no dark fringe) and writes the TS module
 *
 * Run: node scripts/build-location-check-assets.mjs [--only=models|atlas]
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// sharp ships with next (its image optimiser); resolve it from there, it is not a direct dependency.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/lessons/topic06/location-check/vegetation');
const TS_OUT = path.join(ROOT, 'src/components/lessons/topic-06/locationCheckSpriteAtlas.ts');
export const SRC = path.join(tmpdir(), 'geo-location-check-src');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

/** glTF models the Blender step renders: the grove trees, the maquis shrubs and a grass tussock. */
export const MODELS = ['island_tree_01', 'island_tree_02', 'searsia_burchellii', 'searsia_lucida', 'grass_medium_02'];
/**
 * Mean sRGB luminance of a cell's covered pixels after packing, per kind: the scans differ a lot
 * (Searsia burchellii's leaves are nearly black, lucida's mid green), the scene grades them as one.
 */
const TARGET_LUMA = { tree: 0.3, shrub: 0.38, grass: 0.55 };
/** Cell size in the atlas, px, and the transparent border inside it (so far mip levels never reach the next cell). */
const CELL = 512;
const PAD = 16;
const INNER = CELL - 2 * PAD;

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

async function fetchModels() {
  for (const id of MODELS) {
    const res = await fetch(`https://api.polyhaven.com/files/${id}`);
    if (!res.ok) throw new Error(`${res.status} files/${id}`);
    const g = (await res.json()).gltf['1k'].gltf;
    const dir = path.join(SRC, 'models', id);
    await download(g.url, path.join(dir, path.basename(new URL(g.url).pathname)));
    for (const [rel, inc] of Object.entries(g.include ?? {})) await download(inc.url, path.join(dir, rel));
  }
  console.log('models →', path.join(SRC, 'models'));
}

/**
 * Colour into the transparent margin: repeated 3 × 3 averaging of the covered neighbours, so the
 * mip levels (where coverage blurs) average leaf colour with leaf colour, never with black.
 */
function bleed(rgba, w, h, fallback) {
  const n = w * h;
  const filled = new Uint8Array(n);
  for (let i = 0; i < n; i++) filled[i] = rgba[i * 4 + 3] > 8 ? 1 : 0;
  for (let pass = 0; pass < 24; pass++) {
    const add = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (filled[i]) continue;
        let r = 0, g = 0, b = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const j = yy * w + xx;
            if (!filled[j]) continue;
            r += rgba[j * 4]; g += rgba[j * 4 + 1]; b += rgba[j * 4 + 2]; c++;
          }
        if (c) add.push(i, r / c, g / c, b / c);
      }
    if (!add.length) break;
    for (let k = 0; k < add.length; k += 4) {
      const i = add[k];
      rgba[i * 4] = add[k + 1]; rgba[i * 4 + 1] = add[k + 2]; rgba[i * 4 + 2] = add[k + 3];
      filled[i] = 1;
    }
  }
  for (let i = 0; i < n; i++)
    if (!filled[i]) [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]] = fallback;
}

async function buildAtlas() {
  const dir = path.join(SRC, 'sprites');
  const cells = JSON.parse(await readFile(path.join(dir, 'cells.json'), 'utf8'));
  const cols = Math.ceil(Math.sqrt(cells.length));
  const rows = Math.ceil(cells.length / cols);
  const W = cols * CELL, H = rows * CELL;
  const albedo = Buffer.alloc(W * H * 4);
  const normal = Buffer.alloc(W * H * 4);
  const out = [];
  for (const [k, c] of cells.entries()) {
    const cx = (k % cols) * CELL, cy = Math.floor(k / cols) * CELL;
    const inset = (file) =>
      sharp(path.join(dir, file)).resize(INNER, INNER).ensureAlpha().extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().toBuffer();
    const a = await inset(c.albedo);
    let sum = 0, cnt = 0;
    for (let i = 0; i < a.length; i += 4)
      if (a[i + 3] > 128) {
        sum += (0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2]) / 255;
        cnt++;
      }
    const gain = Math.min(3, Math.max(0.75, TARGET_LUMA[c.kind] / Math.max(sum / Math.max(cnt, 1), 1e-3)));
    for (let i = 0; i < a.length; i += 4) for (let k = 0; k < 3; k++) a[i + k] = Math.min(255, a[i + k] * gain);
    const nm = await inset(c.normal);
    for (let y = 0; y < CELL; y++) {
      a.copy(albedo, ((cy + y) * W + cx) * 4, y * CELL * 4, (y + 1) * CELL * 4);
      for (let x = 0; x < CELL; x++) {
        const s = (y * CELL + x) * 4, d = ((cy + y) * W + cx + x) * 4;
        normal[d] = nm[s]; normal[d + 1] = nm[s + 1]; normal[d + 2] = nm[s + 2];
        normal[d + 3] = a[s + 3]; // the normal pass has the same coverage as the colour pass
      }
    }
    // UV of the cell: three.js flips images (flipY), so v runs up from the atlas' bottom edge.
    out.push({
      kind: c.kind,
      model: c.model,
      u0: cx / W,
      v0: 1 - (cy + CELL) / H,
      du: CELL / W,
      dv: CELL / H,
      rootU: (PAD + c.rootU * INNER) / CELL,
      rootV: (PAD + c.rootV * INNER) / CELL,
      cellM: (c.cellM * CELL) / INNER,
      widthM: c.widthM,
      heightM: c.heightM,
    });
  }
  bleed(albedo, W, H, [70, 72, 40]);
  bleed(normal, W, H, [128, 128, 255]);
  for (let i = 3; i < normal.length; i += 4) normal[i] = 255;
  await mkdir(OUT, { recursive: true });
  const ai = await sharp(albedo, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(OUT, 'atlas_albedo.webp'));
  const ni = await sharp(normal, { raw: { width: W, height: H, channels: 4 } }).removeAlpha().webp({ quality: 90 }).toFile(path.join(OUT, 'atlas_normal.webp'));
  console.log(`atlas ${W}×${H}: albedo ${(ai.size / 1024) | 0} KB, normal ${(ni.size / 1024) | 0} KB`);

  const r = (v) => Math.round(v * 1e4) / 1e4;
  const lines = out.map(
    (c) =>
      `  { kind: '${c.kind}', model: '${c.model}', u0: ${r(c.u0)}, v0: ${r(c.v0)}, du: ${r(c.du)}, dv: ${r(c.dv)}, rootU: ${r(c.rootU)}, rootV: ${r(c.rootV)}, cellM: ${r(c.cellM)}, widthM: ${r(c.widthM)}, heightM: ${r(c.heightM)} },`,
  );
  await writeFile(
    TS_OUT,
    `// Generated by scripts/build-location-check-assets.mjs — do not edit.
/**
 * The vegetation cards of the location-check observation: one cell per render of a scanned
 * plant. u0/v0/du/dv place the cell in the atlas (three.js UVs, v up); rootU/rootV is where the
 * plant meets the ground inside the cell (0–1, v up); cellM is the cell's side in the scan's
 * metres and widthM/heightM the plant's own extent in the render.
 */
export type SpriteCell = {
  readonly kind: 'tree' | 'shrub' | 'grass';
  readonly model: string;
  readonly u0: number;
  readonly v0: number;
  readonly du: number;
  readonly dv: number;
  readonly rootU: number;
  readonly rootV: number;
  readonly cellM: number;
  readonly widthM: number;
  readonly heightM: number;
};

export const SPRITE_CELLS: readonly SpriteCell[] = [
${lines.join('\n')}
];
`,
  );
  console.log('cells →', path.relative(ROOT, TS_OUT));
}

if (!only || only === 'models') await fetchModels();
if (only === 'atlas') await buildAtlas();
