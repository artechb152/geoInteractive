import * as THREE from 'three';
import {
  FIELDS,
  GROVES,
  ORCHARDS,
  ROAD_WIDTH_M,
  SQUARE_RING,
  START,
  STREAM,
  VILLAGE_RING,
  WATER_TOWER,
  WOODLAND,
  WORLD_BOUNDS,
  type XY,
} from './terrainNavScenario';
import { WORLD3D } from './terrainNavGeometry';
import { GRID, domeFootprints, ringPoints, roads, waterCourses } from './terrainNavTerrain';
import { pointInPolygon } from '../locationCheckGeometry';
import type { FeatureId } from './terrainNavPractice';

/**
 * Ground material of the terrain-association model and the masks it reads.
 *
 * Ground: the CC0 Poly Haven photo materials lesson 6 already ships
 * (public/assets/lessons/topic06/location-check/textures) blended per pixel by
 * slope, height and value noise fixed in space; each sampled at two scales.
 * Every land-cover colour comes from a mask drawn with the scenario's own
 * centre-lines and polygons — the same ones the map draws — so a road, a field
 * or the square is exactly where the map shows it. Geometry is never altered
 * here: the shader only colours and perturbs the shading normal of the real mesh.
 *
 * Feature highlight: a feature-id map (nearest filtering) says which feature
 * each ground pixel belongs to; up to three ids are tinted and outlined in the
 * accent colour, the 3D counterpart of the map's highlight.
 */

export type GroundTextures = {
  grassD: THREE.Texture;
  grassN: THREE.Texture;
  dryD: THREE.Texture;
  dryN: THREE.Texture;
  rockD: THREE.Texture;
  rockN: THREE.Texture;
  forestD: THREE.Texture;
};

/** Feature ids in the id map (0 = none). */
export const FEATURE_INDEX: Record<FeatureId, number> = {
  A: 1,
  H1: 2,
  H2: 3,
  H3: 4,
  D1: 5,
  D2: 6,
  D3: 7,
  D4: 8,
  G1: 9,
  G2: 10,
  G3: 11,
  village: 12,
  square: 13,
  tower: 14,
  stream: 15,
  'gully-north': 16,
  'track-east': 17,
  'road-west': 18,
  'road-north': 19,
  'lane-village': 12,
  B: 13,
};

const SHEET_W = WORLD_BOUNDS.maxE - WORLD_BOUNDS.minE;
const SHEET_H = WORLD_BOUNDS.maxN - WORLD_BOUNDS.minN;

// ---------------------------------------------------------------- masks

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

/**
 * Three masks over the sheet (north at the top of each canvas):
 *   lines  1 m/px — R road surface (ROAD_WIDTH_M), G road verge (+2 m each side), B water-course bed
 *   cover  2 m/px — R field, G the field's crop band (strips along its stripDeg), B village yards
 *   veg    2 m/px — R grove and woodland floor, G square paving, B orchard floor
 */
export function buildGroundMasks() {
  const lines = canvas2d(SHEET_W, SHEET_H);
  {
    const { ctx } = lines;
    const px = (E: number, N: number): [number, number] => [E - WORLD_BOUNDS.minE, WORLD_BOUNDS.maxN - N];
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
    stroke(w.stream.pts, 'rgb(0,0,255)', 14, 2);
    for (const g of w.gullies) stroke(g.pts, 'rgb(0,0,200)', 5, 1.5);
  }

  const S = 2; // metres per pixel
  const cover = canvas2d(SHEET_W / S, SHEET_H / S);
  {
    const { ctx } = cover;
    const px = (E: number, N: number): [number, number] => [(E - WORLD_BOUNDS.minE) / S, (WORLD_BOUNDS.maxN - N) / S];
    const ring = (pts: readonly XY[]) => {
      ctx.beginPath();
      pts.forEach(([E, N], i) => (i ? ctx.lineTo(...px(E, N)) : ctx.moveTo(...px(E, N))));
      ctx.closePath();
    };
    for (const f of FIELDS) {
      ctx.save();
      ring(f.ring);
      ctx.clip();
      ctx.filter = 'blur(0.6px)';
      ctx.fillStyle = 'rgb(255,0,0)';
      ctx.fill();
      // crop strips: bands of 7–11 m across the strip direction, a band value per strip
      const xs = f.ring.map((p) => p[0]);
      const ys = f.ring.map((p) => p[1]);
      const cE = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cN = (Math.min(...ys) + Math.max(...ys)) / 2;
      const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const a = (f.stripDeg * Math.PI) / 180;
      const [cx, cy] = px(cE, cN);
      ctx.translate(cx, cy);
      ctx.rotate(a);
      let x = -R / S;
      let k = 0;
      while (x < R / S) {
        const wM = 7 + ((k * 37 + f.crop * 11) % 5);
        const v = 40 + ((f.crop * 3 + k) % 3) * 90 + (k % 2) * 25;
        ctx.fillStyle = `rgb(0,${v},0)`;
        ctx.fillRect(x, -R / S, wM / S, (2 * R) / S);
        x += wM / S;
        k++;
      }
      ctx.restore();
    }
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = 'rgb(0,0,255)';
    ring(VILLAGE_RING);
    ctx.fill();
  }

  const veg = canvas2d(SHEET_W / S, SHEET_H / S);
  {
    const { ctx } = veg;
    const px = (E: number, N: number): [number, number] => [(E - WORLD_BOUNDS.minE) / S, (WORLD_BOUNDS.maxN - N) / S];
    const ring = (pts: readonly XY[]) => {
      ctx.beginPath();
      pts.forEach(([E, N], i) => (i ? ctx.lineTo(...px(E, N)) : ctx.moveTo(...px(E, N))));
      ctx.closePath();
    };
    ctx.filter = 'blur(3px)';
    ctx.fillStyle = 'rgb(255,0,0)';
    for (const g of GROVES) {
      ring(g.ring);
      ctx.fill();
    }
    ctx.fillStyle = 'rgb(110,0,0)';
    for (const wd of WOODLAND) {
      ring(wd.ring);
      ctx.fill();
    }
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = 'rgb(0,0,255)';
    for (const o of ORCHARDS) {
      ring(o.ring);
      ctx.fill();
    }
    ctx.filter = 'blur(0.5px)';
    ctx.fillStyle = 'rgb(0,255,0)';
    ring(SQUARE_RING);
    ctx.fill();
  }

  return { lines: maskTexture(lines.c), cover: maskTexture(cover.c), veg: maskTexture(veg.c) };
}

/**
 * The feature-id map, 2 m per texel, rows from the south (DataTexture, nearest).
 * Painted in increasing priority: dome tops, groves, the village, the water,
 * the roads, the square, A and the water tower.
 */
export function buildFeatureIdTexture() {
  const S = 2;
  const w = SHEET_W / S;
  const h = SHEET_H / S;
  const data = new Uint8Array(w * h);
  const set = (i: number, j: number, v: number) => {
    if (i >= 0 && j >= 0 && i < w && j < h) data[j * w + i] = v;
  };
  // dome tops (5 m grid cells)
  for (const [id, mask] of domeFootprints()) {
    const v = FEATURE_INDEX[id];
    for (let k = 0; k < mask.length; k++) {
      if (!mask[k]) continue;
      const ci = k % GRID.nE;
      const cj = (k - ci) / GRID.nE;
      const E0 = ci * GRID.stepM - GRID.stepM / 2;
      const N0 = cj * GRID.stepM - GRID.stepM / 2;
      for (let j = Math.floor(N0 / S); j < Math.ceil((N0 + GRID.stepM) / S); j++) for (let i = Math.floor(E0 / S); i < Math.ceil((E0 + GRID.stepM) / S); i++) set(i, j, v);
    }
  }
  const fillRing = (pts: readonly XY[], v: number) => {
    const ring = ringPoints(pts);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    for (let j = Math.floor(Math.min(...ys) / S); j <= Math.ceil(Math.max(...ys) / S); j++) {
      for (let i = Math.floor(Math.min(...xs) / S); i <= Math.ceil(Math.max(...xs) / S); i++) {
        if (pointInPolygon({ E: (i + 0.5) * S, N: (j + 0.5) * S }, ring)) set(i, j, v);
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
  for (const g of GROVES) fillRing(g.ring, FEATURE_INDEX[g.id]);
  fillRing(VILLAGE_RING, FEATURE_INDEX.village);
  const wc = waterCourses();
  strokeLine(wc.stream.pts, STREAM.waterWidthM / 2 + 6, FEATURE_INDEX.stream);
  strokeLine(wc.gullies.find((g) => g.id === 'gully-north')!.pts, 5, FEATURE_INDEX['gully-north']);
  for (const r of roads()) strokeLine(r.pts, ROAD_WIDTH_M / 2 + 2, FEATURE_INDEX[r.id]);
  fillRing(SQUARE_RING, FEATURE_INDEX.square);
  stamp(START.E, START.N, 22, FEATURE_INDEX.A);
  stamp(WATER_TOWER.E, WATER_TOWER.N, 16, FEATURE_INDEX.tower);
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------- the ground shader

const NOISE_GLSL = /* glsl */ `
  float tnHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float tnNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(tnHash(i), tnHash(i + vec2(1.0, 0.0)), u.x), mix(tnHash(i + vec2(0.0, 1.0)), tnHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float tnFbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int k = 0; k < 4; k++) {
      s += a * tnNoise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      a *= 0.5;
    }
    return s;
  }
`;

/**
 * The refinements' helpers: how far the photo detail is calmed (0 near, set per
 * pixel), and a photo sampled without visible repeats — a smooth noise over the
 * tiles picks one of eight shifted copies, blended across the patch seams (after
 * Quilez, "texture repetition"); the shared gradients keep the filtering sharp.
 */
const REFINE_GLSL = /* glsl */ `
  float tnFar;
  vec3 tnNoTile(sampler2D t, vec2 uv) {
    float l = tnNoise(uv * 0.9 + 3.7) * 7.0;
    float f = fract(l);
    float ia = floor(l);
    vec2 dx = dFdx(uv);
    vec2 dy = dFdy(uv);
    vec3 ca = textureGrad(t, uv + sin(vec2(3.0, 7.0) * ia), dx, dy).rgb;
    vec3 cb = textureGrad(t, uv + sin(vec2(3.0, 7.0) * (ia + 1.0)), dx, dy).rgb;
    vec3 dd = ca - cb;
    return mix(ca, cb, smoothstep(0.2, 0.8, f - 0.1 * (dd.x + dd.y + dd.z)));
  }
`;

export type GroundUniforms = {
  uHl: { value: THREE.Vector3 };
};

/**
 * Where a ground material sits: the mapped sheet (from E = 0, N = 0, metres), the
 * 3D transform of the model, the heights over which limestone starts to break
 * through the tops, and how much of the rock photo shows (its strata read as
 * stripes on steep, planar-mapped ground: a steeper world shows less of it).
 * The default is this activity's; the planning lab passes its own.
 */
export type GroundFrame = {
  readonly sheetW: number;
  readonly sheetH: number;
  readonly world: { readonly metresPerUnit: number; readonly originE: number; readonly originN: number; readonly datumM: number };
  readonly rockHighM: readonly [number, number];
  /** Scales the rock blend (1 = this activity's). */
  readonly rockMix?: number;
  readonly key: string;
  /** Opt-in refinements (the planning lab); without them the shader is this activity's, unchanged. */
  readonly refine?: GroundRefine;
};

/**
 * Refinements for a model seen whole, from far and near:
 *   photo detail  each photo sampled with a shifted copy per patch (no lattice of
 *                 repeats), and its contrast calmed once a pixel covers metres;
 *   tone          a map over `toneRect` (metres): R relief (0.5 = even ground,
 *                 higher on crests and spurs, lower in hollows), G scrub cover —
 *                 drier, paler crests and greener hollows, the ground under the
 *                 maquis darker, so the land reads from afar as it does near;
 *   highlight     a smooth mask (R ≥ 0.5 = lit, linear filter) in place of the
 *                 id map's nearest texels, edged with an antialiased rim.
 */
export type GroundRefine = {
  readonly tone: THREE.Texture;
  readonly toneRect: { readonly minE: number; readonly minN: number; readonly sizeE: number; readonly sizeN: number };
  readonly hlMask: THREE.Texture;
};
const TERRAIN_NAV_FRAME: GroundFrame = { sheetW: SHEET_W, sheetH: SHEET_H, world: WORLD3D, rockHighM: [380, 420], key: 'terrain-nav-ground' };

export function createGroundMaterial(tex: GroundTextures, masks: { lines: THREE.Texture; cover: THREE.Texture; veg: THREE.Texture }, ids: THREE.Texture, frame: GroundFrame = TERRAIN_NAV_FRAME) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const uniforms = {
    uGrassD: { value: tex.grassD },
    uGrassN: { value: tex.grassN },
    uDryD: { value: tex.dryD },
    uDryN: { value: tex.dryN },
    uRockD: { value: tex.rockD },
    uRockN: { value: tex.rockN },
    uForestD: { value: tex.forestD },
    uLines: { value: masks.lines },
    uCover: { value: masks.cover },
    uVeg: { value: masks.veg },
    uIds: { value: ids },
    uIdSize: { value: new THREE.Vector2(frame.sheetW / 2, frame.sheetH / 2) },
    uHl: { value: new THREE.Vector3(0, 0, 0) },
    ...(frame.refine && { uTone: { value: frame.refine.tone }, uHlMask: { value: frame.refine.hlMask } }),
  };
  const R = frame.refine;
  const w = frame.world;
  const s = w.metresPerUnit;
  mat.customProgramCacheKey = () => frame.key;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTnM;\nvarying vec3 vTnN;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        // Ground position in scenario metres: (E, height, N).
        vTnM = vec3(transformed.x * ${s.toFixed(1)} + ${w.originE.toFixed(1)}, transformed.y * ${s.toFixed(1)} + ${w.datumM.toFixed(1)}, ${w.originN.toFixed(1)} - transformed.z * ${s.toFixed(1)});
        vTnN = objectNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vTnM;
        varying vec3 vTnN;
        uniform sampler2D uGrassD, uGrassN, uDryD, uDryN, uRockD, uRockN, uForestD, uLines, uCover, uVeg, uIds;
        uniform vec2 uIdSize;
        uniform vec3 uHl;${R ? '\n        uniform sampler2D uTone, uHlMask;' : ''}
        ${NOISE_GLSL}${R ? REFINE_GLSL : ''}
        vec3 tnTex(sampler2D t, vec2 m, float a, float b) {
          return ${R ? 'mix(tnNoTile(t, m / a), tnNoTile(t, m / b + 0.37), 0.42)' : 'mix(texture2D(t, m / a).rgb, texture2D(t, m / b + 0.37).rgb, 0.42)'};
        }
        float tnDetail(sampler2D t, vec2 m, float a, float b, float contrast) {
          float l = dot(tnTex(t, m, a, b), vec3(0.299, 0.587, 0.114));
          float mean = dot(textureLod(t, vec2(0.5), 12.0).rgb, vec3(0.299, 0.587, 0.114));
          return ${R ? 'mix(clamp(pow(l / max(mean, 1e-3), contrast), 0.3, 2.2), 1.0, tnFar)' : 'clamp(pow(l / max(mean, 1e-3), contrast), 0.3, 2.2)'};
        }
        vec3 tnNrm(sampler2D t, vec2 m, float a) {
          return ${R ? 'tnNoTile(t, m / a)' : 'texture2D(t, m / a).xyz'} * 2.0 - 1.0;
        }
        float tnId(vec2 uv) {
          return floor(texture2D(uIds, uv).r * 255.0 + 0.5);
        }
        bool tnLit(float id) {
          return id > 0.5 && (abs(id - uHl.x) < 0.5 || abs(id - uHl.y) < 0.5 || abs(id - uHl.z) < 0.5);
        }
        float tnWDry, tnWRock, tnWRoad, tnWVerge, tnWBed;`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec2 tnM = vTnM.xz;
        vec3 tnN0 = normalize(vTnN);
        float tnSlope = clamp(1.0 - tnN0.y, 0.0, 1.0);
        float tnMacro = tnFbm(tnM / 300.0);
        float tnMeso = tnFbm(tnM / 48.0 + 11.0);
        float tnFine = tnFbm(tnM / 10.0 + 5.0);${
          R
            ? /* glsl */ `
        // metres per pixel: the photo detail calms once a pixel covers more than ~half a metre
        tnFar = smoothstep(0.45, 3.0, length(fwidth(tnM))) * 0.7;`
            : ''
        }
        // Palette (linear): spring olive grass, sun-dried grass and earth, pale
        // limestone, road dust and its greener edge, grove litter, crops, yards, paving.
        const vec3 kGreen = vec3(0.075, 0.125, 0.03);
        const vec3 kOlive = vec3(0.135, 0.16, 0.05);
        const vec3 kDry = vec3(0.34, 0.28, 0.15);
        const vec3 kSoil = vec3(0.25, 0.17, 0.1);
        const vec3 kStone = vec3(0.36, 0.335, 0.28);
        const vec3 kDust = vec3(0.68, 0.6, 0.45);
        const vec3 kVerge = vec3(0.1, 0.13, 0.045);
        const vec3 kLitter = vec3(0.12, 0.1, 0.055);
        const vec3 kCropGreen = vec3(0.13, 0.25, 0.05);
        const vec3 kCropGold = vec3(0.58, 0.45, 0.19);
        const vec3 kCropSoil = vec3(0.3, 0.19, 0.11);
        const vec3 kYard = vec3(0.5, 0.44, 0.33);
        const vec3 kPave = vec3(0.6, 0.56, 0.48);
        const vec3 kBed = vec3(0.3, 0.29, 0.24);
        float dG = tnDetail(uGrassD, tnM, 6.0, 23.0, 1.1);
        float dD = tnDetail(uDryD, tnM, 5.0, 19.0, 1.0);
        float dR = tnDetail(uRockD, tnM, 8.0, 29.0, 1.2);
        float dF = tnDetail(uForestD, tnM, 4.0, 14.0, 1.0);
        // Open ground: olive grass, drier and earthier on the steep, sunny faces and in patches;
        // limestone breaking through on the steepest slopes and the tops.
        tnWDry = smoothstep(0.56, 0.86, tnMacro * 0.55 + tnMeso * 0.45 + tnFine * 0.15 + tnSlope * 0.9);${
          R
            ? /* glsl */ `
        // the tone map, faded out at its rim: crests and sunny (south) faces dry, hollows and scrub stay green
        vec2 tnTUv = (tnM - vec2(${R.toneRect.minE.toFixed(1)}, ${R.toneRect.minN.toFixed(1)})) / vec2(${R.toneRect.sizeE.toFixed(1)}, ${R.toneRect.sizeN.toFixed(1)});
        vec2 tnTEdge = min(tnTUv, 1.0 - tnTUv);
        float tnTIn = smoothstep(0.0, 0.08, min(tnTEdge.x, tnTEdge.y));
        vec4 tnTone = texture2D(uTone, clamp(tnTUv, 0.0, 1.0));
        float tnRelief = (tnTone.r - 0.5) * 2.0 * tnTIn;
        float tnScrub = tnTone.g * tnTIn;
        // softer dry patches than the default (no hard-edged blots on the far plain)
        tnWDry = smoothstep(0.45, 1.0, tnMacro * 0.5 + tnMeso * 0.4 + tnFine * 0.12 + tnSlope * 0.9);
        tnWDry = mix(tnWDry, 0.3, smoothstep(1.0, 6.0, length(fwidth(tnM))) * 0.75);
        tnWDry = clamp(tnWDry + tnRelief * 0.5 + clamp(tnN0.z, 0.0, 1.0) * tnSlope * 1.2 - tnScrub * 0.3, 0.0, 1.0);`
            : ''
        }
        vec3 cG = mix(kGreen, kOlive, smoothstep(0.3, 0.7, tnMeso)) * dG;
        vec3 cD = mix(kDry, kSoil, smoothstep(0.45, 0.7, tnFine)) * mix(dD, dG, 0.35);
        float tnHigh = smoothstep(${frame.rockHighM[0].toFixed(1)}, ${frame.rockHighM[1].toFixed(1)}, vTnM.y);
        tnWRock = smoothstep(0.7, 0.92, tnMeso * 0.45 + tnFine * 0.55 + tnSlope * 2.0 + tnHigh * 0.08) * ${(0.75 * (frame.rockMix ?? 1)).toFixed(3)};
        vec2 tnUv = vec2(tnM.x / ${frame.sheetW.toFixed(1)}, tnM.y / ${frame.sheetH.toFixed(1)});
        float tnIn = step(0.0, tnUv.x) * step(tnUv.x, 1.0) * step(0.0, tnUv.y) * step(tnUv.y, 1.0);
        vec4 tnL = texture2D(uLines, tnUv) * tnIn;
        vec4 tnC = texture2D(uCover, tnUv) * tnIn;
        vec4 tnV = texture2D(uVeg, tnUv) * tnIn;
        tnWRoad = smoothstep(0.2, 0.62, tnL.r);
        tnWVerge = smoothstep(0.15, 0.55, tnL.g) * (1.0 - tnWRoad);
        tnWBed = smoothstep(0.2, 0.7, tnL.b);
        vec3 tnCol = mix(cG, cD, tnWDry);
        tnCol = mix(tnCol, kStone * dR, tnWRock);
        float tnVar = (0.88 + 0.24 * tnMacro) * mix(0.84, 1.08, tnMeso);
        tnCol *= tnVar;${
          R
            ? /* glsl */ `
        // crests catch the light, hollows keep their own shade; the ground under the maquis is darker and greener
        tnCol *= 1.0 + tnRelief * 0.24;
        tnCol = mix(tnCol, kVerge * mix(dG, 1.0, 0.5), tnScrub * 0.5);`
            : ''
        }
        // grove and woodland floor, orchard floor (ploughed between the rows)
        tnCol = mix(tnCol, kLitter * dF, tnV.r * 0.8);
        tnCol = mix(tnCol, mix(kSoil, kDry, 0.4) * dD, tnV.b * 0.75);
        // fields: one crop per strip (band value), along the field's strip direction
        float tnBand = tnC.g;
        vec3 tnCrop = tnBand < 0.33 ? kCropGreen * dG : tnBand < 0.62 ? kCropGold * mix(dD, 1.0, 0.4) : kCropSoil * dD;
        float tnRows = 0.9 + 0.1 * sin(dot(tnM, vec2(0.7, 0.7)) * 1.9);
        tnCol = mix(tnCol, tnCrop * tnRows * mix(0.92, 1.06, tnFine), smoothstep(0.3, 0.7, tnC.r));
        // village yards: packed pale earth
        tnCol = mix(tnCol, kYard * mix(dD, 1.0, 0.6), smoothstep(0.25, 0.7, tnC.b) * 0.85);
        // water-course beds: damp gravel; road edges, then the road dust itself
        tnCol = mix(tnCol, kBed * mix(dR, 1.0, 0.4), tnWBed * 0.9);
        tnCol = mix(tnCol, kVerge * dG, tnWVerge * 0.75);
        tnCol = mix(tnCol, kDust * mix(dD, 1.0, 0.75) * mix(tnVar, 1.0, 0.7), tnWRoad);
        // the square: paving with joints
        vec2 tnTile = abs(fract(tnM / 0.9) - 0.5);
        float tnJoint = smoothstep(0.42, 0.48, max(tnTile.x, tnTile.y));
        tnCol = mix(tnCol, kPave * (0.94 + 0.12 * tnFine) * (1.0 - 0.07 * tnJoint), smoothstep(0.3, 0.7, tnV.g));${
          R
            ? /* glsl */ `
        // highlight: tint the selected features and edge them with a rim a few pixels wide, both
        // antialiased on the smooth mask's 0.5 line (the id map's own boundary, so nothing spills over)
        float tnMask = texture2D(uHlMask, tnUv).r * tnIn;
        float tnAa = max(fwidth(tnMask), 1e-4);
        float tnFill = smoothstep(0.5 - tnAa, 0.5 + tnAa, tnMask);
        float tnRimW = clamp(tnAa * 2.6, 0.07, 0.34);
        float tnRim = tnFill * (1.0 - smoothstep(0.5 + tnRimW - tnAa, 0.5 + tnRimW + tnAa, tnMask));
        const vec3 kAccent = vec3(0.693, 0.205, 0.024);
        tnCol = mix(tnCol, kAccent, 0.32 * tnFill);
        tnCol = mix(tnCol, kAccent * 1.25, 0.9 * tnRim);`
            : /* glsl */ `
        // highlight: tint and outline the selected features (id map, nearest texels)
        vec2 tnIdUv = tnUv;
        float tnHere = tnId(tnIdUv);
        vec2 tnPx = 1.0 / uIdSize;
        bool tnOn = tnLit(tnHere) && tnIn > 0.5;
        float tnEdge = 0.0;
        if (tnOn) {
          float n1 = tnId(tnIdUv + vec2(tnPx.x * 1.5, 0.0));
          float n2 = tnId(tnIdUv - vec2(tnPx.x * 1.5, 0.0));
          float n3 = tnId(tnIdUv + vec2(0.0, tnPx.y * 1.5));
          float n4 = tnId(tnIdUv - vec2(0.0, tnPx.y * 1.5));
          tnEdge = (abs(n1 - tnHere) > 0.5 || abs(n2 - tnHere) > 0.5 || abs(n3 - tnHere) > 0.5 || abs(n4 - tnHere) > 0.5) ? 1.0 : 0.0;
          const vec3 kAccent = vec3(0.693, 0.205, 0.024);
          tnCol = mix(tnCol, kAccent, 0.32);
          tnCol = mix(tnCol, kAccent * 1.25, tnEdge * 0.9);
        }`
        }
        diffuseColor.rgb *= tnCol;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        vec3 tnT = normalize(vec3(1.0, 0.0, 0.0) - tnN0 * tnN0.x);
        vec3 tnB = cross(tnN0, tnT);
        vec3 tnTn = tnNrm(uGrassN, tnM, 6.0) * (1.0 - tnWDry) + tnNrm(uDryN, tnM, 5.0) * tnWDry;
        tnTn = mix(tnTn, tnNrm(uRockN, tnM, 8.0), tnWRock);
        tnTn = mix(tnTn, tnNrm(uDryN, tnM, 3.0) * 0.15, max(tnWRoad, tnWBed * 0.6));
        vec3 tnNw = normalize(tnN0 + (tnT * tnTn.x + tnB * tnTn.y) * 0.8);
        normal = normalize((viewMatrix * vec4(tnNw, 0.0)).xyz);`,
      );
  };
  return { material: mat, uniforms };
}
