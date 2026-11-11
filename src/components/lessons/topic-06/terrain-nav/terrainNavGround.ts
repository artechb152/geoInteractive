import * as THREE from 'three';
import { ROAD_WIDTH_M, WORLD_BOUNDS } from './terrainNavScenario';
import { WORLD3D } from './terrainNavGeometry';
import { GRID, boulders, heightField, heightGrid, houseCorners, houses, insideSheet, roads, shrubs, trees } from './terrainNavTerrain';
import { buildGroundMasks } from './terrainNavMaterials';
import { pointInPolygon } from '../locationCheckGeometry';
import { AIR, AIR_GLSL, HAZE, addLight } from './terrainNavAir';

export { HAZE };

/**
 * The ground of the terrain-association model: six CC0 photo scans (Poly Haven,
 * public/assets/lessons/topic06/terrain-nav/ground, see ATTRIBUTIONS.md there)
 * splatted over the real mesh and shaded with what the height grid itself says
 * about the land. Nothing here moves a vertex: the mesh is the 5 m grid the
 * contours are drawn from, and every land-cover colour still comes from the
 * masks drawn with the map's own centre-lines and polygons.
 *
 *   layers   grass, dry grass with stones, limestone, pine litter, the gravel of
 *            the tracks, ploughed soil — texture arrays, each sampled at two
 *            scales and rotations mixed by a noise fixed in space (no repeat
 *            grid), graded to the model's palette, height-blended at the edges
 *            (stones poke through the grass, grass fills the hollows)
 *   relief   baked from the grid (and the same generator 200 m beyond it): the
 *            ground against its near and wider surroundings (crests paler and
 *            drier, hollows greener and darker), its open sky (ambient
 *            occlusion in the gullies and valley floors) and where the water
 *            would run (damp lines down the slopes, no new course)
 *   contact  the shade under every tree, shrub, boulder and house, and the two
 *            wheel ruts of each track
 *
 * The highlight is the planning lab's: a smooth mask edged with an antialiased rim.
 */

const SHEET_W = WORLD_BOUNDS.maxE - WORLD_BOUNDS.minE;
const SHEET_H = WORLD_BOUNDS.maxN - WORLD_BOUNDS.minN;

/** Ground layers in the texture arrays, and each scan's tile (its real size, metres). */
export const GROUND_LAYERS = ['grass', 'dry', 'rock', 'forest', 'road', 'soil'] as const;
const TILE_M = [2.0, 1.4, 3.2, 2.0, 2.0, 2.0];

// ---------------------------------------------------------------- texture arrays

/** Stacks same-size images into one RGBA texture array (repeat, mipmapped). */
export function textureArray(images: readonly CanvasImageSource[], size: number, srgb: boolean, anisotropy: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const data = new Uint8Array(size * size * 4 * images.length);
  images.forEach((img, k) => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    data.set(ctx.getImageData(0, 0, size, size).data, k * size * size * 4);
  });
  const t = new THREE.DataArrayTexture(data, size, size, images.length);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------- the relief bake

/** The relief bake's grid: 5 m, the sheet's own samples plus a 200 m margin of the same generator. */
const MARGIN_M = 200;
const RB = { step: GRID.stepM, minE: WORLD_BOUNDS.minE - MARGIN_M, minN: WORLD_BOUNDS.minN - MARGIN_M, nE: (SHEET_W + 2 * MARGIN_M) / GRID.stepM + 1, nN: (SHEET_H + 2 * MARGIN_M) / GRID.stepM + 1 } as const;
/** Where the relief texture lies, metres (texel centres on the samples). */
export const RELIEF_RECT = { minE: RB.minE - RB.step / 2, minN: RB.minN - RB.step / 2, sizeE: RB.nE * RB.step, sizeN: RB.nN * RB.step } as const;

/** The heights of the bake grid: the sheet's grid as is; the margin from the generator every 10 m, interpolated. */
function bakeHeights(): Float32Array {
  const g = heightGrid();
  const { nE, nN } = RB;
  const H = new Float32Array(nE * nN);
  // coarse 10 m lattice over the margin
  const cE = (nE - 1) / 2 + 1;
  const cN = (nN - 1) / 2 + 1;
  const C = new Float32Array(cE * cN);
  for (let j = 0; j < cN; j++) {
    for (let i = 0; i < cE; i++) {
      const E = RB.minE + i * 10;
      const N = RB.minN + j * 10;
      C[j * cE + i] = insideSheet(E, N) ? g[Math.round(N / GRID.stepM) * GRID.nE + Math.round(E / GRID.stepM)] : heightField(E, N);
    }
  }
  for (let j = 0; j < nN; j++) {
    for (let i = 0; i < nE; i++) {
      const E = RB.minE + i * RB.step;
      const N = RB.minN + j * RB.step;
      if (insideSheet(E, N)) {
        H[j * nE + i] = g[Math.round(N / GRID.stepM) * GRID.nE + Math.round(E / GRID.stepM)];
        continue;
      }
      const fi = i / 2;
      const fj = j / 2;
      const i0 = Math.min(cE - 2, Math.floor(fi));
      const j0 = Math.min(cN - 2, Math.floor(fj));
      const u = fi - i0;
      const v = fj - j0;
      const a = C[j0 * cE + i0];
      const b = C[j0 * cE + i0 + 1];
      const c = C[(j0 + 1) * cE + i0];
      const d = C[(j0 + 1) * cE + i0 + 1];
      H[j * nE + i] = a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
  }
  return H;
}

/** Box blur, radius r texels, both axes, edges clamped. */
function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let j = 0; j < h; j++) {
    const row = j * w;
    let s = 0;
    for (let k = -r; k <= r; k++) s += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let i = 0; i < w; i++) {
      tmp[row + i] = s / n;
      s += src[row + Math.min(w - 1, i + r + 1)] - src[row + Math.max(0, i - r)];
    }
  }
  for (let i = 0; i < w; i++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += tmp[Math.min(h - 1, Math.max(0, k)) * w + i];
    for (let j = 0; j < h; j++) {
      out[j * w + i] = s / n;
      s += tmp[Math.min(h - 1, j + r + 1) * w + i] - tmp[Math.max(0, j - r) * w + i];
    }
  }
  return out;
}

/**
 * RGBA, 5 m per texel, rows from the south:
 *   R  relief — 0.5 even ground, higher on crests, spurs and summits, lower in hollows and valley floors
 *   G  scrub — how much of the ground the low shrubs of shrubs() cover
 *   B  open sky — 1 in the open, lower where the land around rises above the horizon (gullies, the stream valley)
 *   A  drainage — where the water of the slopes gathers (0 dry … 1 a well-fed runnel)
 */
let reliefCache: Uint8Array | null = null;
export function buildReliefTexture() {
  const { nE: w, nN: h } = RB;
  reliefCache ??= bakeRelief(w, h);
  const t = new THREE.DataTexture(reliefCache, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

/** The bake itself, once per page (the textures made from it are disposed with the model). */
function bakeRelief(w: number, h: number): Uint8Array {
  const H = bakeHeights();
  const near = blur(blur(H, w, h, 3), w, h, 3);
  const wide = blur(blur(H, w, h, 11), w, h, 11);

  // open sky: the highest horizon in 8 directions out to 160 m
  const DIRS = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
  const STEPS = [1, 2, 3, 5, 8, 13, 21, 32];
  const sky = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const h0 = H[j * w + i];
      let occ = 0;
      for (const [dx, dy] of DIRS) {
        let best = 0;
        for (const s of STEPS) {
          const x = Math.round(i + dx * s);
          const y = Math.round(j + dy * s);
          if (x < 0 || y < 0 || x >= w || y >= h) break;
          const t = (H[y * w + x] - h0) / (s * RB.step);
          if (t > best) best = t;
        }
        occ += best / Math.sqrt(1 + best * best);
      }
      sky[j * w + i] = 1 - occ / DIRS.length;
    }
  }

  // drainage: D8 flow accumulation, every cell giving its rain to its steepest lower neighbour
  const order = Array.from({ length: w * h }, (_, k) => k).sort((a, b) => H[b] - H[a]);
  const acc = new Float32Array(w * h).fill(1);
  for (const k of order) {
    const i = k % w;
    const j = (k - i) / w;
    let to = -1;
    let drop = 0;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const x = i + di;
        const y = j + dj;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const d = (H[k] - H[y * w + x]) / Math.hypot(di, dj);
        if (d > drop) {
          drop = d;
          to = y * w + x;
        }
      }
    }
    if (to >= 0) acc[to] += acc[k];
  }

  // scrub: the shrubs' own footprints, smoothed
  const scrub = new Float32Array(w * h);
  for (const s of shrubs()) {
    const i = Math.round((s.E - RB.minE) / RB.step);
    const j = Math.round((s.N - RB.minN) / RB.step);
    if (i >= 0 && j >= 0 && i < w && j < h) scrub[j * w + i] += (Math.PI * s.radiusM * s.radiusM) / (RB.step * RB.step);
  }
  const scrubS = blur(blur(scrub, w, h, 2), w, h, 2);

  // drainage as a smooth field (the D8 lines are one cell wide: interpolated raw they would show the grid)
  const ln = (v: number) => Math.log(v);
  const wet = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const t = Math.min(1, Math.max(0, (ln(acc[k]) - ln(14)) / (ln(1600) - ln(14))));
    wet[k] = t * t * (3 - 2 * t);
  }
  const wetS = blur(blur(wet, w, h, 1), w, h, 1);
  const data = new Uint8Array(w * h * 4);
  for (let k = 0; k < w * h; k++) {
    const relief = Math.tanh((H[k] - near[k]) * 0.2 + (H[k] - wide[k]) * 0.035);
    data[k * 4] = Math.round((0.5 + 0.5 * relief) * 255);
    data[k * 4 + 1] = Math.round(Math.min(1, scrubS[k] * 2.2) * 255);
    data[k * 4 + 2] = Math.round(Math.min(1, Math.max(0, sky[k])) * 255);
    data[k * 4 + 3] = Math.round(Math.min(1, wetS[k] * 1.6) * 255);
  }
  return data;
}

// ---------------------------------------------------------------- masks with their extra channel

/** A canvas mask's pixels as a DataTexture (rows from the south) with `alpha` as its fourth channel. */
function withAlpha(src: THREE.Texture, alpha: Uint8Array): Packed {
  const c = src.image as HTMLCanvasElement;
  const { width: w, height: h } = c;
  const px = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h * 4);
  for (let r = 0; r < h; r++) {
    const from = r * w * 4;
    const to = (h - 1 - r) * w * 4;
    for (let i = 0; i < w; i++) {
      data[to + i * 4] = px[from + i * 4];
      data[to + i * 4 + 1] = px[from + i * 4 + 1];
      data[to + i * 4 + 2] = px[from + i * 4 + 2];
      data[to + i * 4 + 3] = alpha[r * w + i];
    }
  }
  return { data, w, h };
}

type Packed = { data: Uint8Array; w: number; h: number };
function packedTexture({ data, w, h }: Packed) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function grey(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return { c, ctx };
}

/**
 * The shared masks (terrainNavMaterials buildGroundMasks), each with one more channel:
 *   lines.A  1 m/px — the two wheel ruts of every track (the map's own centre-lines)
 *   cover.A  2 m/px — contact shade: under every tree crown, shrub, boulder and around every house
 * veg is passed on unchanged.
 */
let detailCache: { lines: Packed; cover: Packed; veg: HTMLCanvasElement } | null = null;
export function buildGroundDetail() {
  detailCache ??= bakeDetail();
  const veg = new THREE.CanvasTexture(detailCache.veg);
  veg.colorSpace = THREE.NoColorSpace;
  veg.wrapS = veg.wrapT = THREE.ClampToEdgeWrapping;
  veg.anisotropy = 8;
  return { lines: packedTexture(detailCache.lines), cover: packedTexture(detailCache.cover), veg };
}

function bakeDetail() {
  const masks = buildGroundMasks();

  const ruts = grey(SHEET_W, SHEET_H);
  {
    const { ctx } = ruts;
    const px = (E: number, N: number): [number, number] => [E - WORLD_BOUNDS.minE, WORLD_BOUNDS.maxN - N];
    const stroke = (pts: readonly (readonly [number, number])[], color: string, widthM: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = widthM;
      ctx.beginPath();
      pts.forEach(([E, N], i) => (i ? ctx.lineTo(...px(E, N)) : ctx.moveTo(...px(E, N))));
      ctx.stroke();
    };
    ctx.filter = 'blur(0.45px)';
    for (const r of roads()) stroke(r.pts, '#fff', ROAD_WIDTH_M * 0.5);
    for (const r of roads()) stroke(r.pts, '#000', ROAD_WIDTH_M * 0.25);
  }

  // contact shade, splatted straight into an array (canvas rows: north first): a soft disc under each
  // crown, shrub and boulder, a band around each house
  const S = 2;
  const cw = SHEET_W / S;
  const ch = SHEET_H / S;
  const shade = new Float32Array(cw * ch);
  const blob = (E: number, N: number, rM: number, v: number) => {
    const x = (E - WORLD_BOUNDS.minE) / S;
    const y = (WORLD_BOUNDS.maxN - N) / S;
    const r = rM / S;
    for (let j = Math.max(0, Math.floor(y - r)); j <= Math.min(ch - 1, Math.ceil(y + r)); j++) {
      for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(cw - 1, Math.ceil(x + r)); i++) {
        const d = Math.hypot(i + 0.5 - x, j + 0.5 - y) / r;
        if (d < 1) shade[j * cw + i] += v * (1 - d * d) ** 1.5;
      }
    }
  };
  for (const t of trees()) blob(t.E, t.N, t.crownR * 1.15, t.kind === 'pine' ? 0.5 : 0.6);
  for (const sh of shrubs()) blob(sh.E, sh.N, sh.radiusM * 1.3, 0.38);
  for (const bo of boulders()) blob(bo.E, bo.N, Math.max(1.2, bo.sizeM), 0.45);
  for (const h of houses()) {
    const ring = houseCorners({ ...h, lenM: h.lenM + 3, widM: h.widM + 3 });
    const xs = ring.map((q) => q.E);
    const ys = ring.map((q) => q.N);
    for (let N = Math.min(...ys); N <= Math.max(...ys); N += S) {
      for (let E = Math.min(...xs); E <= Math.max(...xs); E += S) {
        if (!pointInPolygon({ E, N }, ring)) continue;
        const i = Math.floor((E - WORLD_BOUNDS.minE) / S);
        const j = Math.floor((WORLD_BOUNDS.maxN - N) / S);
        if (i >= 0 && j >= 0 && i < cw && j < ch) shade[j * cw + i] += 0.6;
      }
    }
  }
  const contact = new Uint8Array(cw * ch);
  shade.forEach((v, k) => (contact[k] = Math.round(Math.min(1, v) * 255)));

  const rutPx = ruts.ctx.getImageData(0, 0, SHEET_W, SHEET_H).data;
  const rutA = new Uint8Array(SHEET_W * SHEET_H);
  for (let k = 0; k < rutA.length; k++) rutA[k] = rutPx[k * 4];
  const lines = withAlpha(masks.lines, rutA);
  const cover = withAlpha(masks.cover, contact);
  for (const m of Object.values(masks)) m.dispose();
  return { lines, cover, veg: masks.veg.image as HTMLCanvasElement };
}

// ---------------------------------------------------------------- the highlight

/* (The planning lab's, copied here so the two models change independently.) */
/**
 * The highlight as a smooth mask over the id map's texels: 1 where the texel is
 * a lit feature, softened by two 3-texel box passes and read with linear
 * filtering. Its 0.5 line runs along the id map's own boundary (the blur is
 * symmetric), so the shader can draw an antialiased edge there without the
 * staircase of nearest texels and without spilling onto the ground next to it.
 * `update` repaints it in place when the selection changes.
 */
export function createHighlightMask(ids: THREE.DataTexture) {
  const src = ids.image.data as Uint8Array;
  const w = ids.image.width;
  const h = ids.image.height;
  const data = new Uint8Array(w * h);
  const a = new Float32Array(w * h);
  const b = new Float32Array(w * h);
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const boxX = (from: Float32Array, to: Float32Array) => {
    for (let j = 0; j < h; j++) {
      const r = j * w;
      for (let i = 0; i < w; i++) to[r + i] = (from[r + Math.max(0, i - 1)] + from[r + i] + from[r + Math.min(w - 1, i + 1)]) / 3;
    }
  };
  const boxY = (from: Float32Array, to: Float32Array) => {
    for (let j = 0; j < h; j++) {
      const up = Math.max(0, j - 1) * w;
      const r = j * w;
      const dn = Math.min(h - 1, j + 1) * w;
      for (let i = 0; i < w; i++) to[r + i] = (from[up + i] + from[r + i] + from[dn + i]) / 3;
    }
  };
  const update = (lit: readonly number[]) => {
    const on = lit.filter((v) => v > 0);
    for (let k = 0; k < src.length; k++) a[k] = on.includes(src[k]) ? 1 : 0;
    if (on.length) {
      boxX(a, b);
      boxY(b, a);
      boxX(a, b);
      boxY(b, a);
    }
    for (let k = 0; k < data.length; k++) data[k] = Math.round(a[k] * 255);
    t.needsUpdate = true;
  };
  update([]);
  return { texture: t, update };
}

// ---------------------------------------------------------------- the shader

const NOISE_GLSL = /* glsl */ `
  float tgHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float tgNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(tgHash(i), tgHash(i + vec2(1.0, 0.0)), u.x), mix(tgHash(i + vec2(0.0, 1.0)), tgHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float tgFbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int k = 0; k < 4; k++) {
      s += a * tgNoise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      a *= 0.5;
    }
    return s;
  }
  vec2 tgRot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
`;

export type TerrainGround = {
  material: THREE.MeshStandardMaterial;
  uniforms: { uHl: { value: THREE.Vector3 } };
};

/**
 * The ground material. `albedo` and `normal` are the GROUND_LAYERS arrays (normal: RG the
 * OpenGL normal, B the scan's height); `hlMask` the smooth highlight mask.
 */
export function createTerrainGround(albedo: THREE.DataArrayTexture, normal: THREE.DataArrayTexture, relief: THREE.Texture, detail: ReturnType<typeof buildGroundDetail>, hlMask: THREE.Texture): TerrainGround {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const uniforms = {
    uAlb: { value: albedo },
    uNor: { value: normal },
    uRelief: { value: relief },
    uLines: { value: detail.lines },
    uCover: { value: detail.cover },
    uVeg: { value: detail.veg },
    uHlMask: { value: hlMask },
    uHl: { value: new THREE.Vector3(0, 0, 0) },
  };
  const w = WORLD3D;
  const s = w.metresPerUnit;
  const f = (v: number) => v.toFixed(2);
  const RR = RELIEF_RECT;
  mat.customProgramCacheKey = () => 'terrain-nav-ground-v2';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTgM;\nvarying vec3 vTgN;\nvarying float vTgD;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        // ground position in scenario metres: (E, height, N); distance to the eye, metres
        vTgM = vec3(transformed.x * ${f(s)} + ${f(w.originE)}, transformed.y * ${f(s)} + ${f(w.datumM)}, ${f(w.originN)} - transformed.z * ${f(s)});
        vTgN = objectNormal;
        vTgD = distance((modelMatrix * vec4(transformed, 1.0)).xyz, cameraPosition) * ${f(s)};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vTgM;
        varying vec3 vTgN;
        varying float vTgD;
        uniform highp sampler2DArray uAlb, uNor;
        uniform sampler2D uRelief, uLines, uCover, uVeg, uHlMask;
        uniform vec3 uHl;
        ${NOISE_GLSL}
        const float TILE[6] = float[6](${TILE_M.map(f).join(', ')});
        // Each layer at two scales and rotations, mixed by a noise fixed in space: no repeat grid shows.
        float tgMixB;
        float tgCalm;
        // one scale of a layer without a repeat grid: a noise picks one of eight shifted copies per patch,
        // blended across the seams (after Quilez, "texture repetition"); shared gradients keep it sharp
        vec4 tgNoTile(highp sampler2DArray t, vec2 uv, float layer) {
          float l = tgNoise(uv * 0.55 + 3.7) * 7.0;
          float ia = floor(l);
          float f = fract(l);
          vec2 dx = dFdx(uv);
          vec2 dy = dFdy(uv);
          vec4 ca = textureGrad(t, vec3(uv + sin(vec2(3.0, 7.0) * ia), layer), dx, dy);
          vec4 cb = textureGrad(t, vec3(uv + sin(vec2(3.0, 7.0) * (ia + 1.0)), layer), dx, dy);
          return mix(ca, cb, smoothstep(0.2, 0.8, f - 0.1 * (ca.r + ca.g + ca.b - cb.r - cb.g - cb.b)));
        }
        // each layer at two scales and rotations, mixed by a noise fixed in space
        vec4 tgSample(highp sampler2DArray t, vec2 m, int layer) {
          vec2 a = m / TILE[layer];
          vec2 b = tgRot(m, 0.61) / (TILE[layer] * 2.71) + vec2(0.37, 0.71);
          return mix(tgNoTile(t, a, float(layer)), tgNoTile(t, b, float(layer)), tgMixB);
        }
        vec2 tgNormal(vec2 m, int layer) {
          vec2 a = m / TILE[layer];
          vec2 b = tgRot(m, 0.61) / (TILE[layer] * 2.71) + vec2(0.37, 0.71);
          vec2 na = tgNoTile(uNor, a, float(layer)).rg * 2.0 - 1.0;
          vec2 nb = tgRot(tgNoTile(uNor, b, float(layer)).rg * 2.0 - 1.0, -0.61);
          return mix(na, nb, tgMixB);
        }
        // A scan's colour as detail around the model's own palette tone (its mean, from the last mip).
        vec3 tgGrade(vec3 alb, int layer, vec3 tone, float keep) {
          vec3 mean = textureLod(uAlb, vec3(0.5, 0.5, float(layer)), 10.0).rgb;
          float l = dot(alb, vec3(0.2126, 0.7152, 0.0722)) / max(dot(mean, vec3(0.2126, 0.7152, 0.0722)), 1e-3);
          vec3 c = alb / max(mean, vec3(1e-3));
          // past a few centimetres a pixel the scan only flickers: its detail calms into the tone
          return tone * mix(mix(vec3(l), c, keep), vec3(1.0), tgCalm);
        }
        float tgW[6];
        float tgH[6];
        float tgWet, tgCrest, tgOpen, tgContact, tgRoad;`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec2 tgM = vTgM.xz;
        vec3 tgN0 = normalize(vTgN);
        float tgSlope = clamp(1.0 - tgN0.y, 0.0, 1.0);
        float tgMacro = tgFbm(tgM / 320.0);
        float tgMeso = tgFbm(tgM / 52.0 + 11.0);
        float tgFine = tgFbm(tgM / 9.0 + 5.0);
        float tgGrain = tgNoise(tgM / 2.3 + 1.7);
        tgMixB = smoothstep(0.3, 0.7, tgNoise(tgM / 11.0 + 3.3));
        // how far the photo detail has blurred into its mean: past ~1 m a pixel, the palette and the bake carry the ground
        float tgFar = smoothstep(0.6, 4.0, length(fwidth(tgM)));
        tgCalm = smoothstep(0.04, 0.6, length(fwidth(tgM))) * 0.8;

        // ---- the bake (faded out at its rim, beyond the sheet)
        vec2 tgRUv = (tgM - vec2(${f(RR.minE)}, ${f(RR.minN)})) / vec2(${f(RR.sizeE)}, ${f(RR.sizeN)});
        vec2 tgREdge = min(tgRUv, 1.0 - tgRUv);
        float tgRIn = smoothstep(0.0, 0.06, min(tgREdge.x, tgREdge.y));
        vec4 tgRel = texture2D(uRelief, clamp(tgRUv, 0.0, 1.0));
        float tgRelief = (tgRel.r - 0.5) * 2.0 * tgRIn;
        float tgScrub = tgRel.g * tgRIn;
        tgOpen = mix(1.0, tgRel.b, tgRIn);
        tgWet = tgRel.a * tgRIn * (1.0 - smoothstep(0.35, 0.8, tgSlope));
        tgCrest = clamp(tgRelief, 0.0, 1.0);

        // ---- the masks (inside the sheet only), read through a small warp: the edges of the tracks, beds and
        // fields wander by a metre or so (no ruled edges), the centre-lines stay where the map draws them
        vec2 tgWarp = (vec2(tgNoise(tgM / 3.1 + 9.1), tgNoise(tgM / 3.1 - 4.3)) - 0.5) * 2.2 + (vec2(tgNoise(tgM / 0.9 + 2.0), tgNoise(tgM / 0.9 - 7.0)) - 0.5) * 0.7;
        vec2 tgUv = vec2(tgM.x / ${f(SHEET_W)}, tgM.y / ${f(SHEET_H)});
        vec2 tgUvW = tgUv + tgWarp / vec2(${f(SHEET_W)}, ${f(SHEET_H)});
        float tgIn = step(0.0, tgUv.x) * step(tgUv.x, 1.0) * step(0.0, tgUv.y) * step(tgUv.y, 1.0);
        vec4 tgL = texture2D(uLines, tgUvW) * tgIn;
        // the same masks blurred by their mips: what lies within ~8 m (the banks' green, the verges' wear, a field's margin)
        vec4 tgLw = textureLod(uLines, tgUv, 3.2) * tgIn;
        vec4 tgC = texture2D(uCover, tgUvW) * tgIn;
        vec4 tgCw = textureLod(uCover, tgUv, 1.6) * tgIn;
        vec4 tgV = texture2D(uVeg, tgUvW) * tgIn;
        tgContact = texture2D(uCover, tgUv).a * tgIn;
        tgRoad = smoothstep(0.32, 0.68, tgL.r + (tgGrain - 0.5) * 0.3 + (tgFine - 0.5) * 0.2);
        float tgWear = smoothstep(0.08, 0.55, tgLw.r) * (1.0 - tgRoad);
        float tgBed = smoothstep(0.3, 0.72, tgL.b + (tgGrain - 0.5) * 0.4 + (tgFine - 0.5) * 0.3);
        float tgBank = smoothstep(0.03, 0.42, tgLw.b) * (1.0 - tgBed);
        float tgField = smoothstep(0.3, 0.7, tgC.r);
        float tgFieldIn = smoothstep(0.72, 0.97, tgCw.r);
        tgWet = max(tgWet, tgBank * 0.8);

        // ---- the natural ground: grass, dry grass with stones, limestone. Dryness follows the land — sunny
        // south faces and crests first, hollows, north faces, the banks and the scrub stay green — broken up at
        // the scale of a few metres (no large blotches), the scans height-blended at every edge
        float tgSouth = clamp(tgN0.z, 0.0, 1.0);
        float tgNorth = clamp(-tgN0.z, 0.0, 1.0);
        float tgDry = tgMacro * 0.42 + tgMeso * 0.14 + tgFine * 0.34 + tgGrain * 0.2 - 0.12 + tgSlope * 1.2 + tgCrest * 0.42 + tgSouth * tgSlope * 1.8 - tgNorth * tgSlope * 0.9 - tgScrub * 0.3 - tgWet * 0.5;
        float wDry = smoothstep(0.4, 0.98, tgDry);
        // limestone breaks through in small, ragged patches on the steeper faces and crests, never as a bald sheet
        float wRock = smoothstep(0.82, 1.04, tgMeso * 0.22 + tgFine * 0.4 + tgGrain * 0.3 + tgSlope * 2.4 + tgCrest * 0.16) * 0.85 * (1.0 - tgWet);
        vec4 aG = tgSample(uAlb, tgM, 0);
        vec4 aD = tgSample(uAlb, tgM, 1);
        vec4 aR = tgSample(uAlb, tgM, 2);
        tgH[0] = tgSample(uNor, tgM, 0).b;
        tgH[1] = tgSample(uNor, tgM, 1).b;
        tgH[2] = tgSample(uNor, tgM, 2).b;
        // height blend: at an edge, whichever surface stands higher there shows (stones through the grass)
        float sG = (1.0 - wDry) * (1.0 - wRock) * 1.2 + tgH[0] * 0.5;
        float sD = wDry * (1.0 - wRock) * 1.2 + tgH[1] * 0.5;
        float sR = wRock * 1.2 + tgH[2] * 0.6;
        float top = max(max(sG, sD), sR) - 0.28;
        vec3 wn = max(vec3(sG, sD, sR) - top, 0.0);
        wn /= (wn.x + wn.y + wn.z);
        // Palette (linear): spring grass, olive grass, sun-dried grass over earth, terra rossa, grey limestone.
        const vec3 kGreen = vec3(0.074, 0.114, 0.033);
        const vec3 kOlive = vec3(0.12, 0.136, 0.05);
        const vec3 kDry = vec3(0.265, 0.232, 0.13);
        const vec3 kSoil = vec3(0.2, 0.142, 0.088);
        const vec3 kStone = vec3(0.36, 0.345, 0.302);
        // the colour grades continuously with the dryness (no hard-edged blotches); the scans' height blend
        // above only decides which pattern shows — blades, or dry stalks over earth and stones
        vec3 tG = mix(kGreen, kOlive, smoothstep(0.25, 0.75, tgFine * 0.6 + tgMacro * 0.4 + tgSouth * 0.3));
        vec3 tD = mix(kDry, kSoil, smoothstep(0.58, 0.82, tgFine + tgGrain * 0.2) * 0.5);
        vec3 tGD = mix(tG, tD, smoothstep(0.25, 1.15, tgDry));
        vec3 tgCol = wn.x * tgGrade(aG.rgb, 0, mix(tGD, tG, 0.35), 0.55) + wn.y * tgGrade(aD.rgb, 1, mix(tGD, tD, 0.35), 0.72) + wn.z * tgGrade(aR.rgb, 2, kStone, 0.4);
        tgW[0] = wn.x; tgW[1] = wn.y; tgW[2] = wn.z; tgW[3] = 0.0; tgW[4] = 0.0; tgW[5] = 0.0;
        // the large variation, and the relief: crests catch the light and dry out, hollows keep their shade and green
        float tgVar = (0.9 + 0.2 * tgMacro) * mix(0.95, 1.04, tgMeso) * mix(0.93, 1.05, tgFine);
        tgCol *= tgVar * (1.0 + tgRelief * 0.2);
        vec3 tgGreenScan = kGreen * mix(vec3(1.0), aG.rgb / max(textureLod(uAlb, vec3(0.5, 0.5, 0.0), 10.0).rgb, vec3(1e-3)), 0.45);
        tgCol = mix(tgCol, tgGreenScan * 0.95, tgWet * 0.4);
        // the ground under the maquis: darker and greener
        const vec3 kVerge = vec3(0.09, 0.112, 0.042);
        tgCol = mix(tgCol, kVerge * mix(vec3(1.0), aG.rgb / max(textureLod(uAlb, vec3(0.5, 0.5, 0.0), 10.0).rgb, vec3(1e-3)), 0.5), tgScrub * 0.4);

        // beyond the sheet there are no plants to draw: the maquis and its shade as mottling of the far hills
        {
          float out_ = 1.0 - tgIn;
          float clumps = smoothstep(0.55, 0.78, tgNoise(tgM / 7.0 + 3.0) * 0.55 + tgNoise(tgM / 2.6 - 8.0) * 0.45 + (tgMeso - 0.5) * 0.6 + tgNorth * 0.2 - tgCrest * 0.2);
          tgCol = mix(tgCol, kVerge * 0.62 * mix(0.8, 1.15, tgFine), clumps * out_ * 0.85);
        }

        // ---- grove and woodland floor (pine litter), orchard floor (ploughed soil)
        float wForest = tgV.r * 0.85;
        if (wForest > 0.002) {
          vec4 aF = tgSample(uAlb, tgM, 3);
          tgCol = mix(tgCol, tgGrade(aF.rgb, 3, vec3(0.105, 0.083, 0.05) * mix(0.85, 1.12, tgFine), 0.6), wForest);
          tgW[3] = wForest;
        }
        float wOrch = tgV.b * 0.75;
        if (wOrch + tgField > 0.002) {
          vec4 aS = tgSample(uAlb, tgM, 5);
          vec3 soil = tgGrade(aS.rgb, 5, mix(kSoil, kDry, 0.35), 0.55);
          tgCol = mix(tgCol, soil, wOrch);
          // fields: one crop per strip (band value) along the field's strips, muted as seen from a hill,
          // each strip a little uneven; round the edge a margin of grass and weeds
          float tgBand = tgC.g;
          const vec3 kCropGreen = vec3(0.098, 0.152, 0.046);
          const vec3 kCropGold = vec3(0.3, 0.25, 0.115);
          const vec3 kCropSoil = vec3(0.19, 0.136, 0.085);
          vec3 crop = tgBand < 0.33 ? tgGrade(aG.rgb, 0, kCropGreen, 0.6) : tgBand < 0.62 ? tgGrade(aD.rgb, 1, kCropGold, 0.5) : tgGrade(aS.rgb, 5, kCropSoil, 0.7);
          crop *= mix(0.9, 1.07, tgFine) * mix(0.96, 1.03, tgGrain);
          tgCol = mix(tgCol, crop, tgField * mix(0.45, 1.0, tgFieldIn));
          tgW[5] = max(wOrch, tgField * step(0.62, tgBand));
        }

        // ---- village yards (packed earth and gravel), water-course beds (pebbles, damp earth), the tracks
        const vec3 kYard = vec3(0.34, 0.31, 0.25);
        const vec3 kBed = vec3(0.21, 0.198, 0.168);
        const vec3 kMud = vec3(0.11, 0.088, 0.062);
        const vec3 kDust = vec3(0.43, 0.38, 0.292);
        float wYard = smoothstep(0.25, 0.7, tgC.b) * 0.85;
        if (wYard + tgBed + tgRoad + tgWear > 0.002) {
          vec4 aT = tgSample(uAlb, tgM, 4);
          // inside the village: trodden earth and gravel round the houses, gardens between them — grass,
          // a dug bed, a patch of weeds — so the built-up area isn't one bare yard
          float garden = smoothstep(0.45, 0.7, tgNoise(tgM / 13.0 + 21.0) * 0.6 + tgNoise(tgM / 4.5 - 3.0) * 0.4) * (1.0 - smoothstep(0.05, 0.35, tgContact));
          vec3 yard = tgGrade(aT.rgb, 4, kYard * mix(0.86, 1.1, tgFine), 0.5);
          vec3 plot = mix(tgGrade(aG.rgb, 0, kOlive * 1.05, 0.55), tgGrade(aD.rgb, 1, kSoil * 1.1, 0.6), smoothstep(0.55, 0.75, tgNoise(tgM / 6.0 + 4.0)));
          tgCol = mix(tgCol, mix(yard, plot, garden * 0.85), wYard);
          // a bed: pebbles in damp earth, darker where the water stood last
          vec3 bed = mix(tgGrade(mix(aT.rgb, aR.rgb, 0.45), 4, kBed, 0.75), tgGrade(aT.rgb, 4, kMud, 0.6), smoothstep(0.3, 0.7, tgFine + tgGrain * 0.3) * 0.65);
          // the dry bed of a gully grows grass and rushes but along its thread of pebbles
          float thread = smoothstep(0.7, 0.95, tgL.b + (tgGrain - 0.5) * 0.3);
          bed = mix(mix(tgGreenScan * 0.85, bed, 0.45), bed, thread);
          tgCol = mix(tgCol, bed, tgBed * 0.92);
          // beside a track: trodden, dustier, sparser grass
          tgCol = mix(tgCol, mix(tgCol, tgGrade(aD.rgb, 1, kDry * 1.05, 0.6), 0.55), tgWear * 0.45);
          // the track: dust and gravel, two darker wheel ruts and a ragged strip of grass between them
          float rut = tgL.a * tgRoad;
          float median = tgRoad * (1.0 - smoothstep(0.0, 0.35, tgL.a)) * smoothstep(0.75, 1.0, tgL.r) * smoothstep(0.35, 0.7, tgFine + tgGrain * 0.4);
          vec3 dust = tgGrade(aT.rgb, 4, kDust, 0.55) * mix(tgVar, 1.0, 0.6);
          dust *= 1.0 - 0.22 * rut;
          dust = mix(dust, tgGrade(aG.rgb, 0, kOlive * 1.15, 0.55), median * 0.55);
          tgCol = mix(tgCol, dust, tgRoad);
          tgW[4] = max(tgRoad, max(wYard, tgBed));
        }
        // the square: limestone slabs laid in running bond, each its own shade, worn and dusty where people
        // walk, the joints dark with dirt (they fade with distance rather than shimmer)
        float wSq = smoothstep(0.3, 0.7, tgV.g);
        if (wSq > 0.002) {
          const vec3 kPave = vec3(0.4, 0.375, 0.33);
          vec2 sq = tgM / vec2(0.6, 0.4);
          float row = floor(sq.y);
          sq.x += mod(row, 2.0) * 0.5;
          vec2 cell = floor(sq);
          vec2 fr = fract(sq);
          float dj = min(min(fr.x, 1.0 - fr.x) * 0.6, min(fr.y, 1.0 - fr.y) * 0.4);
          float joint = (1.0 - smoothstep(0.004, 0.018, dj)) * (1.0 - smoothstep(0.02, 0.08, length(fwidth(tgM))));
          float stone = 0.84 + 0.24 * tgHash(cell);
          vec3 slab = kPave * stone * mix(vec3(1.0), vec3(1.04, 1.0, 0.92), tgHash(cell + 7.0)) * mix(0.86, 1.06, tgFine) * mix(0.94, 1.04, tgGrain);
          vec4 aP = tgSample(uAlb, tgM, 4);
          slab = mix(slab, tgGrade(aP.rgb, 4, slab, 0.35), 0.5);
          tgCol = mix(tgCol, slab * (1.0 - 0.4 * joint), wSq);
          tgW[4] = max(tgW[4], wSq * 0.4);
        }
        // contact: the litter and shade right under the crowns, shrubs and walls
        tgCol *= 1.0 - 0.18 * tgContact;

        // ---- highlight: the selected features tinted and edged with an antialiased rim on the smooth mask
        float tgMask = texture2D(uHlMask, tgUv).r * tgIn;
        float tgAa = max(fwidth(tgMask), 1e-4);
        float tgFill = smoothstep(0.5 - tgAa, 0.5 + tgAa, tgMask);
        float tgRimW = clamp(tgAa * 2.6, 0.07, 0.34);
        float tgRim = tgFill * (1.0 - smoothstep(0.5 + tgRimW - tgAa, 0.5 + tgRimW + tgAa, tgMask));
        const vec3 kAccent = vec3(0.693, 0.205, 0.024);
        tgCol = mix(tgCol, kAccent, 0.32 * tgFill);
        tgCol = mix(tgCol, kAccent * 1.25, 0.9 * tgRim);
        diffuseColor.rgb *= tgCol;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `float roughnessFactor = mix(0.97, 0.86, tgW[2] * 0.8 + tgRoad * 0.5);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        {
          vec2 nxy = tgNormal(tgM, 0) * tgW[0] + tgNormal(tgM, 1) * tgW[1] + tgNormal(tgM, 2) * tgW[2];
          if (tgW[3] > 0.002) nxy = mix(nxy, tgNormal(tgM, 3), tgW[3]);
          if (tgW[4] > 0.002) nxy = mix(nxy, tgNormal(tgM, 4), tgW[4]);
          if (tgW[5] > 0.002) nxy = mix(nxy, tgNormal(tgM, 5), tgW[5]);
          // the scans' relief, calmed with distance (its average is flat), and a metre-scale unevenness of the ground
          nxy *= mix(1.25, 0.45, tgFar);
          vec2 e = vec2(0.6, 0.0);
          float g0 = tgFbm(tgM / 3.1);
          vec2 meso = vec2(tgFbm((tgM + e.xy) / 3.1) - g0, tgFbm((tgM + e.yx) / 3.1) - g0) / 0.6;
          nxy -= meso * 0.55 * (1.0 - tgRoad * 0.7) * (1.0 - tgFar * 0.6);
          vec3 T = normalize(vec3(1.0, 0.0, 0.0) - tgN0 * tgN0.x);
          vec3 B = cross(tgN0, T);
          // tangent space: T east, B = N × T north (the world's −z), as the textures' u and v
          vec3 nw = normalize(tgN0 + T * nxy.x + B * nxy.y);
          normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
        }`,
      )
      .replace(
        '#include <aomap_fragment>',
        /* glsl */ `
        {
          // open sky of the land around, the shade under the cover, the scans' own crevices
          float crev = 0.75 + 0.5 * (tgH[0] * tgW[0] + tgH[1] * tgW[1] + tgH[2] * tgW[2] + 0.5 * (tgW[3] + tgW[4] + tgW[5]));
          float ambientOcclusion = clamp(pow(tgOpen, 1.6) * (1.0 - 0.55 * tgContact) * mix(crev, 1.0, tgFar), 0.0, 1.0);
          reflectedLight.indirectDiffuse *= ambientOcclusion;
          reflectedLight.directDiffuse *= mix(1.0, ambientOcclusion, 0.3);
        }`,
      );
    addLight(shader);
  };
  return { material: mat, uniforms };
}

// ---------------------------------------------------------------- sky and air


/**
 * A clear midday sky over the hills: deep blue overhead, paling through a milky
 * haze to HAZE at the horizon, the sun's glow, a few thin high clouds. Below the
 * horizon it is HAZE, the colour the apron fades into.
 */
export function createDaySky(sunDir: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...AIR,
      uZenith: { value: new THREE.Color('#5C8EC6') },
      uMid: { value: new THREE.Color('#9DBBD8') },
      uSun: { value: sunDir.clone().normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uMid, uSun;
      varying vec3 vDir;
      ${NOISE_GLSL}
      ${AIR_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 col = mix(uMid, uZenith, smoothstep(0.08, 0.75, h));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0, 0.93, 0.8) * (pow(s, 40.0) * 0.14 + pow(s, 5.0) * 0.07 + s * s * 0.03);
        // at the horizon the sky is the air the far ground fades into (terrainNavAir: one colour, no seam)
        col = mix(tnAirColor(d), col, smoothstep(0.0, 0.16, h));
        col += vec3(1.0, 0.93, 0.8) * pow(s, 900.0) * 3.0;
        if (d.y > 0.0) {
          // thin high cloud: streaks, faint toward the horizon
          vec2 p = d.xz / (h + 0.18);
          float c = tgFbm(p * vec2(1.4, 3.2) + vec2(4.1, 1.7)) + 0.4 * tgFbm(p * 5.0 + 9.3) - 0.62;
          col = mix(col, vec3(0.97, 0.98, 1.0), smoothstep(0.0, 0.35, c) * smoothstep(0.05, 0.3, h) * 0.45);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
}
