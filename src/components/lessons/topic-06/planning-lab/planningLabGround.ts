import * as THREE from 'three';
import { BUILDING, ORCHARD, ROCKS, WORLD } from './planningLabWorld';
import { WORLD3D } from './planningLabView';
import { LINE_REACH_M, TONE_RECT } from './planningLabMaterials';
import { ANALYSIS } from './planningLabAnalysis';
import { waterCourses } from './planningLabTerrain';

/**
 * The planning lab's ground: a MeshStandardMaterial (sun, sky light, shadows,
 * fog and tone mapping stay three.js') whose colour, normal and roughness are
 * composed in two separate scales.
 *
 * The land (tens to hundreds of metres) — where each kind of ground lies — is
 * read from the lab's own data only: the slope and the sunny or shaded side of
 * the drawn mesh, the relief and the maquis cover (tone map), how much sky a
 * point sees, where water gathers and how wet the ground stays (planningLabAnalysis),
 * the distance to the roads, the stream and the ravine, and the grove,
 * woodland and orchard (planningLabMaterials). A Mediterranean hillside in the
 * dry season, then: straw grass on the open slopes and the sunny faces, low
 * green herbs in the hollows, along the drainage lines and on the shaded
 * faces, brown stony soil in the pockets, pale limestone breaking through on
 * the crests and steep faces and in broken ledges along the contours, pebbles
 * in the beds, packed dirt on the roads with their wheel ruts and verges, pine
 * needles under the grove, ploughed soil between the orchard's rows.
 *
 * The surface (centimetres to metres) is eight scanned CC0 layers (Poly Haven,
 * see ATTRIBUTIONS.md) at their true size, from two texture arrays: only the
 * three strongest layers of a pixel are sampled, each at two scales and turns,
 * with no visible tiling, and blended by their own height maps — soil fills
 * the hollows of the grass, rock breaks through both. Once a pixel covers
 * metres a layer is its own mean colour, so the far ground is calm and cheap;
 * every noise fades to its mean before it could alias.
 *
 * Highlight: a smooth mask (R ≥ 0.5 = lit), tinted and edged with an
 * antialiased rim in the accent colour — the 3D counterpart of the map's highlight.
 */

/** The layers of the texture arrays (scripts/build-planning-lab-assets.mjs). */
export const LAYERS = ['grass', 'herbs', 'soil', 'rubble', 'bedrock', 'pebbles', 'trail', 'needles'] as const;
/** Metres per tile: each scan at about the size it was photographed. */
const TILE_M = [2.2, 2.0, 3.2, 2.8, 3.0, 1.8, 2.4, 1.6] as const;
/**
 * Each scan graded to one local palette: partly desaturated (the scans come
 * from other lands and are warmer), then scaled so its mean lands on the
 * albedo of that ground here in the dry season (linear) — straw grass, grey-
 * olive herbs, red-brown terra rossa, pale limestone, dusty roads. The scan's
 * own detail rides on that mean unchanged.
 */
const TARGET: readonly [number, number, number][] = [
  [0.29, 0.255, 0.175],
  [0.14, 0.15, 0.09],
  [0.2, 0.148, 0.104],
  [0.235, 0.226, 0.204],
  [0.34, 0.328, 0.296],
  [0.3, 0.285, 0.252],
  [0.4, 0.355, 0.285],
  [0.15, 0.108, 0.07],
];
/** How much of each scan's own saturation is kept. */
const SATURATION = [0.6, 0.5, 0.48, 0.6, 0.45, 0.55, 0.6, 0.7] as const;
const LUMA = [0.2126, 0.7152, 0.0722] as const;
/** Roughness of each layer. */
const ROUGH = [0.96, 0.92, 0.94, 0.86, 0.82, 0.78, 0.9, 0.97] as const;

export type LabGroundTextures = {
  /** the eight layers' albedo (sRGB) */
  albedo: THREE.DataArrayTexture;
  /** the same layers: OpenGL normal X / Y in RG, displacement in B */
  normal: THREE.DataArrayTexture;
  /** each layer's mean albedo (linear) — its colour once a pixel spans metres */
  means: readonly THREE.Vector3[];
};

export type LabGroundMaps = {
  /** distance fields: R roads, G stream, B ravine (planningLabMaterials.buildGroundLines) */
  lines: THREE.Texture;
  /** R grove, G woodland, B orchard (buildGroundAreas) */
  areas: THREE.Texture;
  /** R relief, G scrub (buildToneTexture) */
  tone: THREE.Texture;
  /** R sky view, G drainage, B wetness (planningLabAnalysis) */
  analysis: THREE.Texture;
  /** contact shade (buildShadeTexture) */
  shade: THREE.Texture;
  hlMask: THREE.Texture;
};

const f = (v: number) => v.toFixed(3);

/** Lattice cells across the noise texture (each 8 px), so it repeats every NOISE_CELLS lattice units. */
const NOISE_CELLS = 32;

/**
 * A tileable four-octave value noise, 256² px, four independent channels — the
 * shader's fbm, read in one fetch. Octaves of 1, ½, ¼ and ⅛ of a cell, weighted
 * ½, ¼, ⅛, 1⁄16 (mean ≈ 0.47).
 */
function createNoiseTexture() {
  const SIZE = 256;
  let seed = 0x3c6ef372;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const octave = (cells: number) => {
    const v = Float32Array.from({ length: cells * cells }, rnd);
    const px = SIZE / cells;
    return (x: number, y: number) => {
      const fx = x / px;
      const fy = y / px;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = smooth(fx - x0);
      const ty = smooth(fy - y0);
      const c = (dx: number, dy: number) => v[((y0 + dy) % cells) * cells + ((x0 + dx) % cells)];
      return c(0, 0) + (c(1, 0) - c(0, 0)) * tx + (c(0, 1) - c(0, 0)) * ty + (c(0, 0) - c(1, 0) - c(0, 1) + c(1, 1)) * tx * ty;
    };
  };
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let ch = 0; ch < 4; ch++) {
    const os = [NOISE_CELLS, NOISE_CELLS * 2, NOISE_CELLS * 4, NOISE_CELLS * 8].map(octave);
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) data[(y * SIZE + x) * 4 + ch] = Math.round(255 * (0.5 * os[0](x, y) + 0.25 * os[1](x, y) + 0.125 * os[2](x, y) + 0.0625 * os[3](x, y)));
  }
  const t = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

const GLSL = /* glsl */ `
varying vec3 vPlM;
varying vec3 vPlN;
varying vec3 vPlW;
uniform highp sampler2DArray uAlb;
uniform highp sampler2DArray uNor;
uniform sampler2D uLines, uAreas, uTone, uAnalysis, uShade, uHlMask, uNoise;
uniform vec3 uMean[8];
uniform vec3 uGrade[8];
uniform float uPxAngle;

const float PL_TILE[8] = float[8](${TILE_M.map(f).join(', ')});
const float PL_SAT[8] = float[8](${SATURATION.map(f).join(', ')});
const float PL_ROUGH[8] = float[8](${ROUGH.map(f).join(', ')});

float plHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float plNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(plHash(i), plHash(i + vec2(1.0, 0.0)), u.x), mix(plHash(i + vec2(0.0, 1.0)), plHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// four-octave value noise, lattice 1 (p in lattice units), from the noise texture — four independent channels
vec4 plFbm4(vec2 p) { return texture2D(uNoise, p / ${NOISE_CELLS.toFixed(1)}); }
vec2 plRot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// a layer's colour graded to the local palette (TARGET)
vec3 plGrade(vec3 c, int L) { return mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, PL_SAT[L]) * uGrade[L]; }
// a noise of feature size sizeM, faded to its mean once a pixel spans a third of a feature
float plCalm(float n, float sizeM, float px, float mean) { return mix(n, mean, smoothstep(0.18, 0.4, px / sizeM)); }

const float PL_TURN = 0.61;
const float PL_SCALE = 2.37;
// One layer at two scales and turns, mixed by a noise; the first scale without a lattice of repeats
// (a smooth noise over the tiles picks one of eight shifted copies, blended across the seams — after
// Quilez, "texture repetition"; the shared gradients keep the filtering sharp).
vec4 plLayer(sampler2DArray t, float layer, vec2 m, float tile, float mixer, float idx) {
  vec2 uv = m / tile;
  float l = idx * 7.0;
  float fr = fract(l);
  float ia = floor(l);
  vec2 dx = dFdx(uv);
  vec2 dy = dFdy(uv);
  vec4 ca = textureGrad(t, vec3(uv + sin(vec2(3.0, 7.0) * ia), layer), dx, dy);
  vec4 cb = textureGrad(t, vec3(uv + sin(vec2(3.0, 7.0) * (ia + 1.0)), layer), dx, dy);
  vec4 a = mix(ca, cb, smoothstep(0.25, 0.75, fr));
  vec4 b = texture(t, vec3(plRot(m, PL_TURN) / (tile * PL_SCALE) + vec2(0.37, 0.71), layer));
  return mix(a, b, mixer);
}
`;

export function createLabGroundMaterial(tex: LabGroundTextures, maps: LabGroundMaps) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const uniforms = {
    uAlb: { value: tex.albedo },
    uNor: { value: tex.normal },
    uMean: { value: tex.means },
    uGrade: {
      value: tex.means.map((m, k) => {
        const l = m.x * LUMA[0] + m.y * LUMA[1] + m.z * LUMA[2];
        const sat = SATURATION[k];
        const d = new THREE.Vector3(l + (m.x - l) * sat, l + (m.y - l) * sat, l + (m.z - l) * sat);
        return new THREE.Vector3(TARGET[k][0] / Math.max(d.x, 1e-3), TARGET[k][1] / Math.max(d.y, 1e-3), TARGET[k][2] / Math.max(d.z, 1e-3));
      }),
    },
    uLines: { value: maps.lines },
    uAreas: { value: maps.areas },
    uTone: { value: maps.tone },
    uAnalysis: { value: maps.analysis },
    uShade: { value: maps.shade },
    uHlMask: { value: maps.hlMask },
    uNoise: { value: createNoiseTexture() },
    /** The angle one drawn pixel spans (radians): 2·tan(fov / 2) / drawing-buffer height, set each frame. */
    uPxAngle: { value: 0.001 },
  };
  const w = WORLD3D;
  const s = w.metresPerUnit;
  const sheetW = WORLD.maxE - WORLD.minE;
  const sheetH = WORLD.maxN - WORLD.minN;
  const T = TONE_RECT;
  const A = ANALYSIS;
  const rowA = (ORCHARD.rowDeg * Math.PI) / 180;
  const rvBed = waterCourses().ravine.bed;
  const rvLow = Math.min(rvBed[0], rvBed[rvBed.length - 1]);
  const rvHigh = Math.max(rvBed[0], rvBed[rvBed.length - 1]);
  mat.customProgramCacheKey = () => 'planning-lab-ground-v3';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPlM;\nvarying vec3 vPlN;\nvarying vec3 vPlW;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      // ground position in sheet metres: (E, height, N)
      vPlM = vec3(transformed.x * ${f(s)} + ${f(w.originE)}, transformed.y * ${f(s)} + ${f(w.datumM)}, ${f(w.originN)} - transformed.z * ${f(s)});
      vPlN = objectNormal;
      vPlW = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL}\n// the ravine's bed, its lower and upper end (m)\nconst float RV_LOW = ${f(rvLow)};\nconst float RV_HIGH = ${f(rvHigh)};`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec2 plM = vPlM.xz;
        float plH = vPlM.y;
        vec3 plN0 = normalize(vPlN);
        // the mesh's slope (rise over run), the way down it, the sunny (south, three's +z) and shaded faces
        float plTan = sqrt(max(0.0, 1.0 - plN0.y * plN0.y)) / max(plN0.y, 0.08);
        vec2 plDown = vec2(plN0.x, -plN0.z);
        plDown /= max(length(plDown), 1e-4);
        float plSteep = smoothstep(0.04, 0.2, plTan);
        float plSouth = clamp(plN0.z * 3.0, -1.0, 1.0) * plSteep;
        // metres per pixel, from the distance (smooth over the whole mesh, unlike screen derivatives, which
        // jump at the far apron's long triangles)
        float plPx = distance(vPlW, cameraPosition) * ${f(s)} * uPxAngle;
        float plNear = 1.0 - smoothstep(1.6, 3.4, plPx);

        // ---- the land: maps (each faded out at its rim)
        vec2 plTUv = (plM - vec2(${f(T.minE)}, ${f(T.minN)})) / vec2(${f(T.sizeE)}, ${f(T.sizeN)});
        vec2 plTEdge = min(plTUv, 1.0 - plTUv);
        float plTIn = smoothstep(0.0, 0.06, min(plTEdge.x, plTEdge.y));
        vec2 plTC = clamp(plTUv, 0.0, 1.0);
        vec4 plTone = texture2D(uTone, plTC);
        float plRelief = (plTone.r - 0.5) * 2.0 * plTIn;
        float plScrub = plTone.g * plTIn;
        vec2 plAUv = ((plM - vec2(${f(A.minE)}, ${f(A.minN)})) / ${f(A.stepM)} + 0.5) / vec2(${f(A.nE)}, ${f(A.nN)});
        vec4 plAn = texture2D(uAnalysis, clamp(plAUv, 0.0, 1.0));
        float plSky = mix(1.0, smoothstep(0.8, 1.0, plAn.r), plTIn);
        float plDrain = plAn.g * plTIn;
        float plWet = mix(0.35, plAn.b, plTIn);
        // the boulders' outcrops (their density is ~0.1–0.5 where they cluster)
        float plOutcrop = smoothstep(0.08, 0.45, plAn.a) * plTIn;
        vec4 plLn = texture2D(uLines, plTC) * ${f(LINE_REACH_M)};
        float plIn = step(0.0, min(plTEdge.x, plTEdge.y));
        float plDRoad = mix(${f(LINE_REACH_M)}, plLn.r, plIn);
        float plDStream = mix(${f(LINE_REACH_M)}, plLn.g, plIn);
        float plDRavine = mix(${f(LINE_REACH_M)}, plLn.b, plIn);
        vec4 plAr = texture2D(uAreas, plTC) * plIn;
        // (blurred with distance: where the far shrubs have shrunk away, their shade becomes the scrub's tone, not dots)
        float plShade = mix(1.0, textureLod(uShade, plTC, clamp(log2(max(plPx, 1e-3)) + 1.0, 0.0, 6.0)).r, plTIn);

        // ---- noise at the scales of the land, each calmed before it could alias
        vec4 plNA = plFbm4(plM / 360.0);
        vec4 plNB = plFbm4(plRot(plM, 1.3) / 95.0 + 7.0);
        vec4 plNC = plFbm4(plRot(plM, 2.4) / 26.0 + 3.0);
        vec4 plND = plFbm4(plRot(plM, 0.7) / 6.5 + 11.0);
        float plN360 = plNA.r;
        float plN95 = plCalm(plNB.g, 95.0, plPx, 0.47);
        float plN26 = plCalm(plNC.b, 26.0, plPx, 0.47);
        float plN26b = plCalm(plNC.r, 26.0, plPx, 0.47);
        float plN6 = plCalm(plND.a, 6.5, plPx, 0.47);
        float plN6b = plCalm(plND.g, 6.5, plPx, 0.47);
        float plN1 = plCalm(plNoise(plM / 1.1 + 1.3), 1.1, plPx, 0.5);

        // ---- limestone ledges along the contours: a pale rock band (the riser) every ~5.5 m of height on
        // the steeper ground, broken along its length, with soil and greener grass in the pocket at its foot;
        // gone where the bands would come closer than a few pixels
        float plLedgeH = (plH + (plN26b - 0.47) * 7.0 + (plN6 - 0.47) * 1.6) / 5.5;
        float plLf = fract(plLedgeH);
        float plLedgeOn = smoothstep(0.16, 0.3, plTan) * smoothstep(0.56, 0.7, plN95 * 0.55 + plN26 * 0.5 + (plN6b - 0.47) * 0.5) * plTIn
          * smoothstep(6.0, 10.0, (5.5 / max(plTan, 0.05)) / max(plPx, 1e-3));
        float plRiser = plLedgeOn * smoothstep(0.0, 0.04, plLf) * (1.0 - smoothstep(0.11, 0.19, plLf));
        float plPocket = plLedgeOn * smoothstep(0.8, 0.98, plLf) * 0.7;

        // ---- the lines and areas, their edges frayed
        float plFray = (plN1 - 0.5) * 0.6 + (plN6 - 0.47) * 0.9;
        float plDR = plDRoad + plFray;
        float plRoad = 1.0 - smoothstep(2.15, 2.85, plDR);
        float plVerge = smoothstep(2.2, 3.0, plDR) * (1.0 - smoothstep(4.0, 7.0, plDR));
        float plRut = plRoad * smoothstep(0.42, 0.62, plDRoad) * (1.0 - smoothstep(1.2, 1.45, plDRoad)) * (1.0 - smoothstep(0.3, 0.75, plPx));
        float plHump = plRoad * (1.0 - smoothstep(0.25, 0.5, plDRoad)) * smoothstep(0.35, 0.65, plN6b) * (1.0 - smoothstep(0.3, 0.75, plPx));
        float plDS = plDStream + plFray * 1.4;
        float plStreamW = 2.3 + 1.6 * smoothstep(0.3, 0.7, plN26b);
        float plStreamBed = 1.0 - smoothstep(plStreamW, plStreamW + 1.1, plDS);
        float plStreamWet = 1.0 - smoothstep(2.2, 3.2, plDStream + plFray * 0.6);
        float plStreamBank = smoothstep(plStreamW, plStreamW + 1.1, plDS) * (1.0 - smoothstep(10.0, 17.0, plDS));
        float plDV = plDRavine + plFray * 1.2;
        // (wider downstream: from ~1 m under the saddle to ~3 m at the stream, its bed's heights)
        // — and pinched and spread along its course, the stones lying in broken stretches
        float plRvW = mix(1.8, 0.6, smoothstep(RV_LOW, RV_HIGH, plH)) * (0.6 + 0.8 * plN26);
        float plRavineBed = (1.0 - smoothstep(plRvW, plRvW + 1.0, plDV)) * mix(1.0, smoothstep(0.35, 0.6, plN6b + 0.1), 0.8);
        float plRavineBank = smoothstep(plRvW, plRvW + 1.0, plDV) * (1.0 - smoothstep(plRvW + 4.0, plRvW + 9.0, plDV));
        float plBed = max(plStreamBed, plRavineBed);
        float plBank = max(plStreamBank, plRavineBank * 0.9);
        float plLine = max(plRoad, plBed);
        float plGrove = smoothstep(0.3, 0.75, plAr.r + plFray * 0.35) * step(0.01, plAr.r);
        float plWood = smoothstep(0.2, 0.8, plAr.g + plFray * 0.3) * (0.35 + 0.65 * smoothstep(0.4, 0.62, plN26));
        float plOrchard = smoothstep(0.35, 0.7, plAr.b + plFray * 0.15);
        float plYard = 1.0 - smoothstep(7.0, 16.0, distance(plM, vec2(${f(BUILDING.E - 4)}, ${f(BUILDING.N + 4)})) + (plN6 - 0.47) * 14.0);
        float plRocksB = 1.0 - smoothstep(${f(ROCKS.rM * 0.45)}, ${f(ROCKS.rM + 10)}, distance(plM, vec2(${f(ROCKS.E)}, ${f(ROCKS.N)})) + (plN6 - 0.47) * 16.0);

        // ---- where each layer wants to be
        // moisture: hollows, drainage lines, shaded faces, the banks — and less on the sunny faces
        float plMoist = clamp(plWet * 0.4 + plDrain * 0.7 - plRelief * 0.55 - plSouth * 0.6 + plScrub * 0.3 + plBank * 0.9 + plPocket * 0.5 + (plN95 - 0.47) * 0.8 + (plN26 - 0.47) * 0.5 - 0.15, 0.0, 1.0);
        // rock: crests, spurs and steep faces, where the ground is dry
        float plRock = plOutcrop * 0.6 + plRelief * 0.35 + plTan * 0.55 - plWet * 0.5 - plDrain * 0.5 + (plN95 - 0.47) * 0.9 + (plN26b - 0.47) * 0.9 + (plN6b - 0.47) * 0.45 - plScrub * 0.25 - 0.14;
        float plOpen = (1.0 - plLine) * (1.0 - plYard * 0.85);
        float plW[8];
        plW[0] = (0.75 + plSouth * 0.25 - plMoist * 0.35) * plOpen;
        plW[1] = smoothstep(0.45, 1.0, plMoist) * 1.05 * plOpen + plHump * 0.8 + plVerge * 0.35 * (1.0 - plRoad);
        plW[2] = (smoothstep(0.5, 0.72, plN26 * 0.6 + plN6 * 0.5 - plRelief * 0.3) * 0.9 + plDrain * 0.5 + plPocket * 0.9 + plScrub * 0.35 + plBank * 0.45 + plOrchard * 1.6) * plOpen + plYard * 0.85;
        plW[3] = (smoothstep(0.45, 0.9, plRock) * 0.85 + plRiser * 0.4) * plOpen * (1.0 - plOrchard) + plRavineBed * 0.75 + plVerge * 0.25;
        plW[4] = (smoothstep(0.75, 1.1, plRock) * smoothstep(0.16, 0.34, plTan) * 1.1 + plRiser * 1.5 + plRocksB * smoothstep(0.35, 0.6, plN6 + 0.1) * 1.3) * plOpen * (1.0 - plOrchard * 0.9);
        plW[5] = plBed * 1.6;
        plW[6] = plRoad * 1.7 * (1.0 - plRut * 0.15) + plYard * 0.75;
        plW[7] = (plGrove * 1.35 + plWood * 0.75) * plOpen * (1.0 - plRocksB * 0.35);

        // the three strongest layers
        int plI0 = 0, plI1 = 1, plI2 = 2;
        float plV0 = -1.0, plV1 = -1.0, plV2 = -1.0;
        for (int k = 0; k < 8; k++) {
          float v = plW[k];
          if (v > plV0) { plV2 = plV1; plI2 = plI1; plV1 = plV0; plI1 = plI0; plV0 = v; plI0 = k; }
          else if (v > plV1) { plV2 = plV1; plI2 = plI1; plV1 = v; plI1 = k; }
          else if (v > plV2) { plV2 = v; plI2 = k; }
        }
        int plIdx[3] = int[3](plI0, plI1, plI2);
        float plWv[3] = float[3](max(plV0, 0.0), max(plV1, 0.0), max(plV2, 0.0));

        // ---- the surface: the three layers, height-blended
        vec3 plAlb[3];
        vec3 plNor[3];
        float plHt[3];
        float plMixer = smoothstep(0.3, 0.7, plCalm(plNoise(plM / 7.0 + 3.7), 7.0, plPx, 0.5));
        float plIdxN = plNoise(plM * 0.55 + 9.1);
        float plDepth = mix(0.36, 0.95, smoothstep(0.4, 2.5, plPx));
        for (int k = 0; k < 3; k++) {
          int L = plIdx[k];
          // a layer that cannot reach the blend even at its highest point next to the strongest at its
          // lowest is not sampled at all (most ground has one or two layers)
          bool plUse = k == 0 || (plWv[k] > 0.001 && plWv[k] * 1.5 + 0.6 > plWv[0] * 1.5 - plDepth);
          if (plNear > 0.0 && plUse) {
            float tile = PL_TILE[L];
            vec4 a = plLayer(uAlb, float(L), plM, tile, plMixer, plIdxN);
            vec4 n = plLayer(uNor, float(L), plM, tile, plMixer, plIdxN);
            plAlb[k] = mix(uMean[L], a.rgb, plNear);
            // (the second scale's normal is turned with its sample; the mix of the two is close enough at this blend)
            plNor[k] = vec3((n.rg * 2.0 - 1.0) * plNear, n.b);
            plHt[k] = mix(0.5, n.b, plNear);
          } else {
            plAlb[k] = uMean[L];
            plNor[k] = vec3(0.0, 0.0, 0.5);
            plHt[k] = plUse ? 0.5 : 0.0;
          }
        }
        float plSc0 = plWv[0] * 1.5 + plHt[0] * 0.6;
        float plSc1 = plWv[1] * 1.5 + plHt[1] * 0.6;
        float plSc2 = plWv[2] * 1.5 + plHt[2] * 0.6;
        float plTop = max(plSc0, max(plSc1, plSc2));
        vec3 plB = max(vec3(plSc0, plSc1, plSc2) - (plTop - plDepth), 0.0) * step(vec3(0.001), vec3(plWv[0], plWv[1], plWv[2]));
        plB /= max(plB.x + plB.y + plB.z, 1e-4);

        // ---- colour: each layer graded, then the land's own variation
        vec3 plCol = vec3(0.0);
        vec3 plNxy = vec3(0.0);
        float plRough = 0.0;
        float plCav = 0.0;
        for (int k = 0; k < 3; k++) {
          int L = plIdx[k];
          vec3 c = plGrade(plAlb[k], L);
          if (L == 0) {
            // paler straw where it is driest, a grey-olive tinge where the ground keeps a little water
            c *= mix(vec3(1.06, 1.03, 0.96), vec3(0.84, 0.9, 0.74), smoothstep(0.3, 0.9, plMoist));
          } else if (L == 2) {
            // terra rossa in the hollows and pockets, paler brown on the open slopes
            c *= mix(vec3(1.0), vec3(1.07, 0.91, 0.82), clamp(-plRelief * 1.5 + plPocket + plOrchard * 0.6, 0.0, 1.0));
          } else if (L == 4) {
            // grey lichen and dark weathering pits on the limestone
            c *= mix(1.0, 0.72, smoothstep(0.55, 0.8, plN1) * plNear);
          } else if (L == 5) {
            c *= mix(1.0, 0.6, plStreamWet);
          } else if (L == 6) {
            // the wheel ruts: darker, browner, smoother
            c *= mix(vec3(1.0), vec3(0.82, 0.76, 0.68), plRut);
          }
          plCol += c * plB[k];
          plNxy += plNor[k] * plB[k];
          plRough += PL_ROUGH[L] * plB[k];
          plCav += plHt[k] * plB[k];
        }
        // the orchard: ploughed furrows along its rows, a grass strip under each row of trees
        {
          vec2 plRowDir = vec2(${f(Math.sin(rowA))}, ${f(Math.cos(rowA))});
          float plQ = dot(plM, vec2(-plRowDir.y, plRowDir.x)) / ${f(ORCHARD.spacingM)};
          float plFur = 0.5 + 0.5 * cos(plQ * 6.2832 * 4.0);
          float plUnder = 1.0 - smoothstep(0.08, 0.2, abs(fract(plQ + 0.5) - 0.5));
          float plOrchNear = plOrchard * (1.0 - smoothstep(0.25, 0.6, plPx * 4.0 / ${f(ORCHARD.spacingM)}));
          plCol *= mix(1.0, 0.86 + 0.16 * plFur, plOrchNear);
          plCol = mix(plCol, plGrade(uMean[0], 0) * 0.9, plUnder * plOrchard * 0.55);
        }
        // the ledge's foot: a damp pocket, darker; the riser itself a little paler
        plCol *= mix(1.0, 0.86, plPocket * 0.8);
        plCol *= mix(1.0, 1.04, plRiser);
        // the verge: taller, darker grass where the road sheds its water
        plCol *= mix(1.0, 0.82, plVerge * smoothstep(3.0, 3.6, plDR) * (1.0 - smoothstep(4.6, 6.0, plDR)));
        // the stream's banks: a band of greener, darker riparian growth (oleander, reeds, bramble); the ravine's thinner
        plCol = mix(plCol, plCol * vec3(0.62, 0.74, 0.5), max(plStreamBank, plRavineBank * 0.6) * smoothstep(0.35, 0.65, plN6b + 0.2) * 0.7);
        // the open grass: denser and thinner swards, a few metres to tens of metres across
        plCol *= mix(1.0, 0.88 + 0.22 * plN26b, plB.x * step(float(plIdx[0]), 0.5)) * mix(1.0, 0.9 + 0.2 * plN6, plNear * 0.6);
        // under the grove the needles darken in the canopy's shade
        plCol *= mix(1.0, 0.78, plGrove * 0.8);
        // the scrub: the ground under and between the maquis is darker and greener, read from afar
        plCol = mix(plCol, plCol * vec3(0.72, 0.78, 0.6), plScrub * 0.45 * smoothstep(0.3, 2.5, plPx) * plOpen);
        // past the cover (the sheet and 260 m round it) there are no shrubs: the ground carries their pattern
        // instead — thickets in patches tens of metres across, a speckle of single bushes near — out to the horizon
        {
          vec2 plBeyond = max(vec2(${f(WORLD.minE)} - plM.x, ${f(WORLD.minN)} - plM.y), vec2(plM.x - ${f(WORLD.maxE)}, plM.y - ${f(WORLD.maxN)}));
          float plOut = smoothstep(120.0, 270.0, max(plBeyond.x, plBeyond.y));
          // (about a fifth of the ground darkened on average, as the maquis covers it inside)
          float plThicket = smoothstep(0.42, 0.64, plN95 * 0.55 + plNC.a * 0.6);
          float plDots = mix(0.55, smoothstep(0.45, 0.75, plCalm(plNoise(plM / 3.2 + 7.7), 3.2, plPx, 0.5)), 1.0 - smoothstep(0.6, 1.4, plPx));
          plCol = mix(plCol, plCol * vec3(0.46, 0.54, 0.36), plOut * plThicket * plDots * 0.85 * plOpen);
        }
        // large variation: lighter and darker hillsides, warmer and cooler patches; crests catch the light
        plCol *= (0.84 + 0.32 * plN360) * mix(0.9, 1.1, plN95) * (1.0 + plRelief * 0.12);
        plCol *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), smoothstep(0.4, 0.62, plNB.a));

        // highlight: tint the selected features and edge them with a rim a few pixels wide, both
        // antialiased on the smooth mask's 0.5 line (the id map's own boundary, so nothing spills over)
        vec2 plUv = plM / vec2(${f(sheetW)}, ${f(sheetH)});
        float plSheet = step(0.0, plUv.x) * step(plUv.x, 1.0) * step(0.0, plUv.y) * step(plUv.y, 1.0);
        float plMask = texture2D(uHlMask, plUv).r * plSheet;
        float plAa = max(fwidth(plMask), 1e-4);
        float plFill = smoothstep(0.5 - plAa, 0.5 + plAa, plMask);
        float plRimW = clamp(plAa * 2.6, 0.07, 0.34);
        float plRim = plFill * (1.0 - smoothstep(0.5 + plRimW - plAa, 0.5 + plRimW + plAa, plMask));
        const vec3 kAccent = vec3(0.693, 0.205, 0.024);
        plCol = mix(plCol, kAccent, 0.32 * plFill);
        plCol = mix(plCol, kAccent * 1.25, 0.9 * plRim);
        diffuseColor.rgb *= plCol;

        float plRoughF = mix(plRough, 0.5, plStreamWet * plStreamBed);
        // the scans' relief, calmed with distance; the ledge's riser turned down the slope, the road's crown
        vec2 plNt = plNxy.xy * mix(1.0, 0.15, smoothstep(0.6, 2.6, plPx)) * (1.0 - plRut * 0.6);
        // ambient light: the sky the point sees, the contact shade, the crevices of the scanned relief
        float plAO = plShade * mix(0.42, 1.0, pow(plSky, 1.3)) * mix(mix(0.72, 1.06, plCav), 1.0, smoothstep(0.6, 2.6, plPx)) * mix(1.0, 0.8, plPocket);`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = plRoughF;')
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `{
        // world-aligned tangent frame (x east, −z north), perturbed by the layers' normals
        vec3 plTE = normalize(vec3(1.0, 0.0, 0.0) - plN0 * plN0.x);
        vec3 plTN = normalize(cross(plN0, plTE));
        vec3 plBase = plN0;
        // the riser faces down the slope, steeper than the ground; the bench above it lies flatter
        vec3 plDown3 = normalize(vec3(plDown.x, 0.0, -plDown.y));
        plBase = normalize(plBase + plDown3 * plRiser * 0.45);
        plBase = normalize(mix(plBase, vec3(0.0, 1.0, 0.0), plLedgeOn * smoothstep(0.2, 0.35, plLf) * (1.0 - smoothstep(0.5, 0.7, plLf)) * 0.2));
        vec3 plPn = normalize(plTE * plNt.x + plTN * plNt.y + plBase * sqrt(max(0.05, 1.0 - dot(plNt, plNt))));
        normal = normalize((viewMatrix * vec4(plPn, 0.0)).xyz);
      }`,
      )
      .replace(
        '#include <aomap_fragment>',
        /* glsl */ `{
        reflectedLight.indirectDiffuse *= plAO;
        reflectedLight.directDiffuse *= mix(1.0, plShade * mix(0.8, 1.0, plCav), 0.4);
      }`,
      );
  };
  mat.userData.uniforms = uniforms;
  // the noise texture is the material's own: freed with it
  mat.addEventListener('dispose', () => uniforms.uNoise.value.dispose());
  return mat;
}

/**
 * A texture array from a vertical strip of square layers (the asset strips),
 * and each layer's mean colour — read through a 2D canvas: the strips are RGB
 * only, so no pixel is premultiplied away.
 */
export function stripToArray(img: HTMLImageElement | ImageBitmap, layers: number, srgb: boolean) {
  const w = img.width;
  const h = img.height;
  const size = w;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(px.buffer.slice(0));
  const means: THREE.Vector3[] = [];
  const lin = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const LUT = Float32Array.from({ length: 256 }, (_, v) => (srgb ? lin(v) : v / 255));
  for (let k = 0; k < layers; k++) {
    let r = 0;
    let g = 0;
    let b = 0;
    const o = k * size * size * 4;
    for (let i = 0; i < size * size; i += 3) {
      r += LUT[data[o + i * 4]];
      g += LUT[data[o + i * 4 + 1]];
      b += LUT[data[o + i * 4 + 2]];
    }
    const n = Math.ceil((size * size) / 3);
    means.push(new THREE.Vector3(r / n, g / n, b / n));
  }
  const t = new THREE.DataArrayTexture(data, size, size, layers);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return { texture: t, means };
}
