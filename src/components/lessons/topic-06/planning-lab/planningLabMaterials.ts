import * as THREE from 'three';
import { GROVE, ORCHARD, ROAD_WIDTH_M, ROCKS, BUILDING, STREAM, WOODLAND, WORLD, type XY } from './planningLabWorld';
import { GRID, TONE, heightGrid, ringPoints, roads, saddle, summits, toneGrid, waterCourses } from './planningLabTerrain';
import { WORLD3D } from './planningLabView';
import type { FeatureId } from './planningLabPlan';
import type { GroundFrame } from '../terrain-nav/terrainNavMaterials';
import { pointInPolygon } from '../locationCheckGeometry';

/**
 * The masks and the feature-id map that the shared ground shader
 * (terrain-nav createGroundMaterial) reads, drawn from this lab's own
 * centre-lines and polygons — the same ones the map draws — so a road, the
 * grove floor or the rocks at B are exactly where the map shows them. The
 * shader colours the real mesh; it never moves it.
 *
 * Channel meanings are the shader's:
 *   lines  1 m/px — R road surface, G road verge, B water-course bed
 *   cover  2 m/px — B pale bare ground (the rocks at B, the yard of the building)
 *   veg    2 m/px — R grove / woodland floor, B orchard floor
 */

const SHEET_W = WORLD.maxE - WORLD.minE;
const SHEET_H = WORLD.maxN - WORLD.minN;

export const GROUND_FRAME: GroundFrame = { sheetW: SHEET_W, sheetH: SHEET_H, world: WORLD3D, rockHighM: [492, 530], rockMix: 0.3, key: 'planning-lab-ground' };

/** Feature ids in the id map (0 = none). */
export const FEATURE_INDEX: Record<FeatureId, number> = {
  building: 1,
  stream: 2,
  ravine: 3,
  saddle: 4,
  'peak-west': 5,
  'peak-east': 6,
  road: 7,
  track: 8,
  orchard: 9,
  grove: 10,
  rocks: 11,
};

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return { c, ctx };
}

function maskTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  return t;
}

export function buildGroundMasks() {
  const lines = canvas2d(SHEET_W, SHEET_H);
  {
    const { ctx } = lines;
    const px = (E: number, N: number): [number, number] => [E - WORLD.minE, WORLD.maxN - N];
    const stroke = (pts: readonly XY[], color: string, widthM: number, blur: number) => {
      ctx.filter = `blur(${blur}px)`;
      ctx.strokeStyle = color;
      ctx.lineWidth = widthM;
      ctx.beginPath();
      pts.forEach(([E, N], i) => (i ? ctx.lineTo(...px(E, N)) : ctx.moveTo(...px(E, N))));
      ctx.stroke();
    };
    for (const r of roads()) stroke(r.pts, 'rgb(0,255,0)', ROAD_WIDTH_M + 4, 1.5);
    for (const r of roads()) stroke(r.pts, 'rgb(255,0,0)', ROAD_WIDTH_M, 0.8);
    const w = waterCourses();
    stroke(w.stream.pts, 'rgb(0,0,255)', 13, 2);
    stroke(w.ravine.pts, 'rgb(0,0,210)', 7, 1.5);
  }

  const S = 2;
  const ring = (ctx: CanvasRenderingContext2D, pts: readonly XY[]) => {
    ctx.beginPath();
    pts.forEach(([E, N], i) => (i ? ctx.lineTo((E - WORLD.minE) / S, (WORLD.maxN - N) / S) : ctx.moveTo((E - WORLD.minE) / S, (WORLD.maxN - N) / S)));
    ctx.closePath();
  };
  const disc = (ctx: CanvasRenderingContext2D, E: number, N: number, rM: number) => {
    ctx.beginPath();
    ctx.arc((E - WORLD.minE) / S, (WORLD.maxN - N) / S, rM / S, 0, Math.PI * 2);
  };

  const cover = canvas2d(SHEET_W / S, SHEET_H / S);
  {
    const { ctx } = cover;
    ctx.filter = 'blur(4px)';
    ctx.fillStyle = 'rgb(0,0,235)';
    disc(ctx, ROCKS.E, ROCKS.N, ROCKS.rM);
    ctx.fill();
    ctx.fillStyle = 'rgb(0,0,200)';
    disc(ctx, BUILDING.E - 4, BUILDING.N + 4, 22);
    ctx.fill();
  }

  const veg = canvas2d(SHEET_W / S, SHEET_H / S);
  {
    const { ctx } = veg;
    ctx.filter = 'blur(3px)';
    ctx.fillStyle = 'rgb(255,0,0)';
    ring(ctx, GROVE);
    ctx.fill();
    ctx.fillStyle = 'rgb(90,0,0)';
    for (const wd of WOODLAND) {
      ring(ctx, wd.ring);
      ctx.fill();
    }
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = 'rgb(0,0,255)';
    ring(ctx, ORCHARD.ring);
    ctx.fill();
  }

  return { lines: maskTexture(lines.c), cover: maskTexture(cover.c), veg: maskTexture(veg.c) };
}

/**
 * The feature-id map, 2 m per texel, rows from the south (DataTexture, nearest),
 * painted in rising priority: summit tops (the ground within 20 m of each
 * summit, connected to it), the grove, the orchard, the saddle, the water, the
 * roads, the rocks and the building.
 */
export function buildFeatureIdTexture() {
  const S = 2;
  const w = SHEET_W / S;
  const h = SHEET_H / S;
  const data = new Uint8Array(w * h);
  const set = (i: number, j: number, v: number) => {
    if (i >= 0 && j >= 0 && i < w && j < h) data[j * w + i] = v;
  };
  const g = heightGrid();
  for (const s of summits()) {
    const v = FEATURE_INDEX[s.id];
    const floor = s.heightM - 20;
    const seen = new Uint8Array(GRID.nE * GRID.nN);
    const stack = [Math.round(s.N / GRID.stepM) * GRID.nE + Math.round(s.E / GRID.stepM)];
    while (stack.length) {
      const k = stack.pop()!;
      if (seen[k] || g[k] < floor) continue;
      seen[k] = 1;
      const ci = k % GRID.nE;
      const cj = (k - ci) / GRID.nE;
      for (let j = Math.floor((cj * GRID.stepM - 2.5) / S); j < Math.ceil((cj * GRID.stepM + 2.5) / S); j++) for (let i = Math.floor((ci * GRID.stepM - 2.5) / S); i < Math.ceil((ci * GRID.stepM + 2.5) / S); i++) set(i, j, v);
      if (ci > 0) stack.push(k - 1);
      if (ci < GRID.nE - 1) stack.push(k + 1);
      if (cj > 0) stack.push(k - GRID.nE);
      if (cj < GRID.nN - 1) stack.push(k + GRID.nE);
    }
  }
  const fillRing = (pts: readonly XY[], v: number) => {
    const ringP = ringPoints(pts);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    for (let j = Math.floor(Math.min(...ys) / S); j <= Math.ceil(Math.max(...ys) / S); j++) {
      for (let i = Math.floor(Math.min(...xs) / S); i <= Math.ceil(Math.max(...xs) / S); i++) {
        if (pointInPolygon({ E: (i + 0.5) * S, N: (j + 0.5) * S }, ringP)) set(i, j, v);
      }
    }
  };
  const stamp = (E: number, N: number, rM: number, v: number) => {
    const r = Math.ceil(rM / S);
    const ci = Math.floor(E / S);
    const cj = Math.floor(N / S);
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if ((di * S) ** 2 + (dj * S) ** 2 <= rM * rM) set(ci + di, cj + dj, v);
  };
  const strokeLine = (pts: readonly XY[], rM: number, v: number) => {
    for (const [E, N] of pts) stamp(E, N, rM, v);
  };
  fillRing(GROVE, FEATURE_INDEX.grove);
  fillRing(ORCHARD.ring, FEATURE_INDEX.orchard);
  const sd = saddle();
  stamp(sd.E, sd.N, 48, FEATURE_INDEX.saddle);
  const wc = waterCourses();
  strokeLine(wc.stream.pts, STREAM.waterWidthM / 2 + 7, FEATURE_INDEX.stream);
  strokeLine(wc.ravine.pts, 6, FEATURE_INDEX.ravine);
  for (const r of roads()) strokeLine(r.pts, ROAD_WIDTH_M / 2 + 2, FEATURE_INDEX[r.id]);
  stamp(ROCKS.E, ROCKS.N, ROCKS.rM + 4, FEATURE_INDEX.rocks);
  stamp(BUILDING.E, BUILDING.N, 26, FEATURE_INDEX.building);
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

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

/** The tone map's ground (planningLabTerrain TONE), metres. */
export const TONE_RECT = { minE: TONE.minE, minN: TONE.minN, sizeE: TONE.nE * TONE.stepM, sizeN: TONE.nN * TONE.stepM } as const;

/** Box blur of a w × h grid, radius r texels, both axes, edges clamped. */
function blurGrid(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[j * w + Math.min(w - 1, Math.max(0, i + k))];
      tmp[j * w + i] = s / n;
    }
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[Math.min(h - 1, Math.max(0, j + k)) * w + i];
      out[j * w + i] = s / n;
    }
  }
  return out;
}

/**
 * The ground's tone, from the shared height grid and cover (never a picture):
 *   R  relief — the ground against its near (≈ 70 m) and wider (≈ 190 m)
 *      surroundings: above 0.5 on crests, summits and spurs, below in the
 *      hollows, the ravine and the stream valley;
 *   G  scrub — scrubCover(), the very chance shrubs() draws from.
 */
export function buildToneTexture() {
  const w = TONE.nE;
  const h = TONE.nN;
  const { height: H, scrub } = toneGrid();
  const near = blurGrid(blurGrid(H, w, h, 2), w, h, 2);
  const wide = blurGrid(blurGrid(H, w, h, 5), w, h, 5);
  const data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const relief = Math.tanh((H[k] - near[k]) * 0.12 + (H[k] - wide[k]) * 0.022);
      data[k * 4] = Math.round((0.5 + 0.5 * relief) * 255);
      data[k * 4 + 1] = Math.round(scrub[k] * 255);
      data[k * 4 + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}
