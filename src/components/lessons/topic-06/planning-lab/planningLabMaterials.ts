import * as THREE from 'three';
import { GROVE, ORCHARD, ROAD_WIDTH_M, ROCKS, BUILDING, STREAM, WOODLAND, WORLD, type XY } from './planningLabWorld';
import { GRID, TONE, bedStones, blockCorners, boulders, buildings, heightGrid, ringPoints, roads, saddle, shrubs, summits, toneGrid, trees, understory, waterCourses } from './planningLabTerrain';
import type { FeatureId } from './planningLabPlan';
import { ANALYSIS, terrainAnalysis } from './planningLabAnalysis';
import { pointInPolygon } from '../locationCheckGeometry';

/**
 * The masks and maps the planning lab's ground shader (planningLabGround)
 * reads, drawn from this lab's own centre-lines, polygons and cover lists — the
 * same ones the map draws — so a road, the grove floor or the shade under a
 * tree is exactly where the map and the model put it. The shader colours the
 * real mesh; it never moves it.
 *
 *   lines  1 m/px — distance fields of the roads, the stream and the ravine
 *   areas  2 m/px — the grove, the woodland and the orchard
 *   shade  1 m/px — the contact shade of every tree, shrub, boulder and
 *          building (1 = open sky)
 *
 * All three cover the tone map's ground (TONE_RECT: the sheet and 300 m around it).
 */

const SHEET_W = WORLD.maxE - WORLD.minE;
const SHEET_H = WORLD.maxN - WORLD.minN;

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

/** Metres of distance the line field encodes (0 on a centre-line … 1 at LINE_REACH_M or more). */
export const LINE_REACH_M = 24;

/** A road continued past its drawn end (the map's sheet stops there; the land around the model goes on): reach and how fast it narrows away. */
const ROAD_RUN_ON_M = 260;

/**
 * The lines on the ground as distance fields, 1 m/px over the tone map's ground
 * (TONE_RECT), rows from the south — the distance in metres from the nearest
 * centre-line, LINE_REACH_M and beyond = 1:
 *
 *   R  the roads (both); past the drawn ends they run on beyond the sheet and
 *      narrow away (their distance grows), so no road stops on a line
 *   G  the stream
 *   B  the ravine
 *
 * Read with linear filtering, a distance field keeps sub-metre edges at 1 m per
 * texel, so the shader draws wheel ruts, banks and verges crisply from it.
 */
export function buildGroundLines() {
  const w = Math.round(TONE_RECT.sizeE);
  const h = Math.round(TONE_RECT.sizeN);
  const R = LINE_REACH_M;
  const field = [new Float32Array(w * h).fill(R), new Float32Array(w * h).fill(R), new Float32Array(w * h).fill(R)];
  /** Distance to segment a→b (plus extra metres) into channel c, for texels within reach. */
  const segment = (c: number, ax: number, ay: number, bx: number, by: number, extraA: number, extraB: number) => {
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - TONE_RECT.minE - R));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) - TONE_RECT.minE + R));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - TONE_RECT.minN - R));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) - TONE_RECT.minN + R));
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const f = field[c];
    for (let y = y0; y <= y1; y++) {
      const N = TONE_RECT.minN + y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const E = TONE_RECT.minE + x + 0.5;
        const t = Math.min(1, Math.max(0, ((E - ax) * dx + (N - ay) * dy) / len2));
        const d = Math.hypot(E - (ax + t * dx), N - (ay + t * dy)) + extraA + (extraB - extraA) * t;
        if (d < f[y * w + x]) f[y * w + x] = d;
      }
    }
  };
  const polyline = (c: number, pts: readonly XY[], extra?: (k: number) => number) => {
    for (let k = 0; k < pts.length - 1; k++) segment(c, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], extra?.(k) ?? 0, extra?.(k + 1) ?? 0);
  };
  for (const r of roads()) {
    polyline(0, r.pts);
    // run on past both ends: along the last direction, bending gently, the distance growing (the road narrows to a trace)
    for (const end of [0, 1]) {
      const p = end ? r.pts[r.pts.length - 1] : r.pts[0];
      const q = end ? r.pts[r.pts.length - 6] : r.pts[5];
      let a = Math.atan2(p[1] - q[1], p[0] - q[0]);
      const run: XY[] = [p];
      for (let s = 4; s <= ROAD_RUN_ON_M; s += 4) {
        a += Math.sin(s / 47 + end * 2.1) * 0.012;
        const last = run[run.length - 1];
        run.push([last[0] + Math.cos(a) * 4, last[1] + Math.sin(a) * 4]);
      }
      polyline(0, run, (k) => Math.max(0, (k * 4 - 40) / (ROAD_RUN_ON_M - 40)) ** 1.4 * 5);
    }
  }
  const wc = waterCourses();
  polyline(1, wc.stream.pts);
  polyline(2, wc.ravine.pts);
  const data = new Uint8Array(w * h * 4);
  for (let k = 0; k < w * h; k++) {
    data[k * 4] = Math.round((field[0][k] / R) * 255);
    data[k * 4 + 1] = Math.round((field[1][k] / R) * 255);
    data[k * 4 + 2] = Math.round((field[2][k] / R) * 255);
    data[k * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Metres per texel of the area masks. */
const AREA_STEP_M = 2;

/**
 * The areas on the ground, 2 m/px over the tone map's ground (TONE_RECT), rows
 * from the south, softened by a few metres: R the pine grove, G the natural
 * woodland, B the olive orchard. (One texture for the three keeps the ground
 * shader within WebGL's texture units.)
 */
export function buildGroundAreas() {
  const w = Math.round(TONE_RECT.sizeE / AREA_STEP_M);
  const h = Math.round(TONE_RECT.sizeN / AREA_STEP_M);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  const ring = (pts: readonly XY[]) => {
    ctx.beginPath();
    pts.forEach(([E, N], i) => {
      const x = (E - TONE_RECT.minE) / AREA_STEP_M;
      const y = (TONE_RECT.minN + TONE_RECT.sizeN - N) / AREA_STEP_M;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
  };
  ctx.filter = 'blur(2.5px)';
  ctx.fillStyle = 'rgb(255,0,0)';
  ring(GROVE);
  ctx.fill();
  ctx.fillStyle = 'rgb(0,255,0)';
  for (const wd of WOODLAND) {
    ring(wd.ring);
    ctx.fill();
  }
  ctx.filter = 'blur(1.5px)';
  ctx.fillStyle = 'rgb(0,0,255)';
  ring(ORCHARD.ring);
  ctx.fill();
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    const src = (h - 1 - j) * w;
    for (let i = 0; i < w; i++) {
      const k = (src + i) * 4;
      const o = (j * w + i) * 4;
      data[o] = rgba[k];
      data[o + 1] = rgba[k + 1];
      data[o + 2] = rgba[k + 2];
      data[o + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
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

/**
 * The terrain analysis (planningLabAnalysis) as one texture over its grid, rows from the south:
 * R the sky the ground sees, G where water gathers, B how wet the ground stays, A where the rock breaks through.
 */
export function buildAnalysisTexture() {
  const { sky, drain, wet, rock } = terrainAnalysis();
  const n = ANALYSIS.nE * ANALYSIS.nN;
  const data = new Uint8Array(n * 4);
  for (let k = 0; k < n; k++) {
    data[k * 4] = Math.round(sky[k] * 255);
    data[k * 4 + 1] = Math.round(drain[k] * 255);
    data[k * 4 + 2] = Math.round(wet[k] * 255);
    data[k * 4 + 3] = Math.round(rock[k] * 255);
  }
  const t = new THREE.DataTexture(data, ANALYSIS.nE, ANALYSIS.nN, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** Metres per texel of the contact-shade map. */
const SHADE_STEP_M = 1;

/**
 * The contact shade of the cover: under every tree crown, shrub and boulder,
 * and around the building's walls, the ground sees less of the sky — a soft
 * dark disc a little wider than the thing itself (the sun's shadow map draws
 * the cast shadows; this is the ambient light they leave out). Single channel,
 * 1 = open ground, over the tone map's ground (TONE_RECT), rows from the south.
 */
export function buildShadeTexture() {
  const w = Math.round(TONE_RECT.sizeE / SHADE_STEP_M);
  const h = Math.round(TONE_RECT.sizeN / SHADE_STEP_M);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  // one soft disc, stamped at every size (falls off as the light under a canopy does: dark core, long rim)
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  {
    const g = sprite.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.45, 'rgba(0,0,0,0.75)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  const x = (E: number) => (E - TONE_RECT.minE) / SHADE_STEP_M;
  const y = (N: number) => (TONE_RECT.minN + TONE_RECT.sizeN - N) / SHADE_STEP_M;
  const stamp = (E: number, N: number, rM: number, a: number) => {
    const r = rM / SHADE_STEP_M;
    ctx.globalAlpha = a;
    ctx.drawImage(sprite, x(E) - r, y(N) - r, 2 * r, 2 * r);
  };
  for (const t of trees()) stamp(t.E, t.N, t.crownR * 1.35, t.kind === 'pine' ? 0.5 : 0.58);
  for (const s of shrubs()) stamp(s.E, s.N, s.radiusM * 1.25, 0.5);
  for (const s of understory()) stamp(s.E, s.N, s.radiusM * 1.25, 0.45);
  for (const b of boulders()) stamp(b.E, b.N, b.sizeM * (b.atB ? 0.95 : 0.85), 0.55);
  for (const b of bedStones()) stamp(b.E, b.N, b.sizeM * 0.85, 0.5);
  ctx.globalAlpha = 0.5;
  ctx.filter = 'blur(1.6px)';
  ctx.fillStyle = '#000';
  for (const b of buildings()) {
    ctx.beginPath();
    blockCorners({ ...b, lenM: b.lenM + 2.4, widM: b.widM + 2.4 }).forEach((q, i) => (i ? ctx.lineTo(x(q.E), y(q.N)) : ctx.moveTo(x(q.E), y(q.N))));
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  const rgba = ctx.getImageData(0, 0, w, h).data;
  // flipped into rows from the south, like the tone map
  const data = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    const src = (h - 1 - j) * w;
    for (let i = 0; i < w; i++) data[j * w + i] = rgba[(src + i) * 4];
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}
