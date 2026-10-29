/**
 * The ground's material: MeshStandardMaterial (sun, sky light, shadows, fog
 * and tone mapping stay three.js') whose colour, normal and roughness come
 * from four CC0 photo layers splatted per pixel:
 *   grass      dry, pale grass with small stones — the hillside cover
 *   soil       brown stony soil — bare patches
 *   limestone  pale rock breaking through — where `rockiness` is high and on slopes
 *   gravel     the dirt road's bed and the dry stream bed
 * Layers are height-blended (each albedo's alpha is its displacement), every
 * layer is sampled at two scales to hide tiling, and the whole ground is
 * varied by large-scale tints. Far away the texture fades to each layer's
 * average colour, darkened where the maquis is thick, so nothing shimmers.
 */
import { MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, NoColorSpace, Vector3, type Texture } from 'three';

export type GroundTextures = {
  albedo: [Texture, Texture, Texture, Texture];
  normal: [Texture, Texture, Texture, Texture];
};

/** Average colours (linear) of the four albedo maps, for the far fade. */
const FAR = {
  grass: new Vector3(0.36, 0.3, 0.19),
  soil: new Vector3(0.24, 0.17, 0.11),
  limestone: new Vector3(0.48, 0.45, 0.4),
  gravel: new Vector3(0.43, 0.38, 0.31),
};

export function prepareGroundTextures(t: GroundTextures, anisotropy: number) {
  t.albedo.forEach((x) => {
    x.colorSpace = SRGBColorSpace;
    x.wrapS = x.wrapT = RepeatWrapping;
    x.anisotropy = anisotropy;
    x.needsUpdate = true;
  });
  t.normal.forEach((x) => {
    x.colorSpace = NoColorSpace;
    x.wrapS = x.wrapT = RepeatWrapping;
    x.anisotropy = anisotropy;
    x.needsUpdate = true;
  });
}

const GLSL_NOISE = /* glsl */ `
float nrHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float nrNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(nrHash(i), nrHash(i + vec2(1.0, 0.0)), u.x), mix(nrHash(i + vec2(0.0, 1.0)), nrHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float nrFbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * nrNoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

export function createTerrainMaterial(t: GroundTextures, station: { x: number; z: number }) {
  const m = new MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const uniforms = {
    uAlb0: { value: t.albedo[0] },
    uAlb1: { value: t.albedo[1] },
    uAlb2: { value: t.albedo[2] },
    uAlb3: { value: t.albedo[3] },
    uNor0: { value: t.normal[0] },
    uNor1: { value: t.normal[1] },
    uNor2: { value: t.normal[2] },
    uNor3: { value: t.normal[3] },
    /** metres per tile: grass, soil, limestone, gravel */
    uTile: { value: [3.4, 2.9, 4.6, 2.3] },
    uFar0: { value: FAR.grass },
    uFar1: { value: FAR.soil },
    uFar2: { value: FAR.limestone },
    uFar3: { value: FAR.gravel },
    uStation: { value: new Vector3(station.x, 0, station.z) },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aRoad;
attribute float aStream;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vRoad;
varying float vStream;`,
      )
      .replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
vNormalW = normalize(mat3(modelMatrix) * objectNormal);
vRoad = aRoad;
vStream = aStream;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uAlb0; uniform sampler2D uAlb1; uniform sampler2D uAlb2; uniform sampler2D uAlb3;
uniform sampler2D uNor0; uniform sampler2D uNor1; uniform sampler2D uNor2; uniform sampler2D uNor3;
uniform float uTile[4];
uniform vec3 uFar0; uniform vec3 uFar1; uniform vec3 uFar2; uniform vec3 uFar3;
uniform vec3 uStation;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vRoad;
varying float vStream;
${GLSL_NOISE}
// two scales of one layer, blended by a noise mask: no visible repeat
vec4 nrAlb(sampler2D t, vec2 xz, float tile, float mixer) {
  vec4 a = texture2D(t, xz / tile);
  vec4 b = texture2D(t, xz / (tile * 2.71) + vec2(0.37, 0.71));
  return mix(a, b, mixer);
}
vec3 nrNor(sampler2D t, vec2 xz, float tile, float mixer) {
  vec3 a = texture2D(t, xz / tile).rgb;
  vec3 b = texture2D(t, xz / (tile * 2.71) + vec2(0.37, 0.71)).rgb;
  return mix(a, b, mixer);
}`,
      )
      .replace(
        '#include <map_fragment>',
        `
vec2 xz = vWorld.xz;
float camDist = distance(vWorld, cameraPosition);
vec3 nW = normalize(vNormalW);
float slope = 1.0 - nW.y;
float n1 = nrNoise(xz / 3.1);
float n2 = nrFbm(xz / 23.0);
float n3 = nrFbm(xz / 140.0 + 7.3);
float mixer = smoothstep(0.25, 0.75, nrNoise(xz / 9.0 + 3.7));

// layer weights before height blending
float wGrass = 1.0;
float wSoil = smoothstep(0.36, 0.66, nrFbm(xz / 11.0 - 4.1)) * 1.2 + 0.25 * smoothstep(0.2, 0.45, slope);
float rocky = smoothstep(0.38, 0.72, nrFbm(xz / 26.0 + 2.9) + 0.18 * nrNoise(xz / 120.0));
float wLime = rocky * 1.25 + smoothstep(0.18, 0.42, slope) * 0.9;
// dirt road: two wheel tracks with a grassy strip between them, soft verges
float track = 1.0 - smoothstep(0.35, 0.8, abs(vRoad - 1.05) + (n1 - 0.5) * 0.35);
float roadBed = 1.0 - smoothstep(1.9, 2.9, vRoad + (n1 - 0.5) * 0.7);
float bed = 1.0 - smoothstep(2.6, 5.4, vStream + (n2 - 0.5) * 1.6);
float wGravel = max(max(track, roadBed * 0.85), bed * 1.15);
wGrass *= (1.0 - roadBed * 0.9) * (1.0 - bed);
wSoil *= (1.0 - track * 0.7);
wLime = max(wLime * (1.0 - roadBed), bed * (0.45 + 0.5 * n1));

vec4 a0 = nrAlb(uAlb0, xz, uTile[0], mixer);
vec4 a1 = nrAlb(uAlb1, xz, uTile[1], mixer);
vec4 a2 = nrAlb(uAlb2, xz, uTile[2], mixer);
vec4 a3 = nrAlb(uAlb3, xz, uTile[3], mixer);
vec4 hw = vec4(a0.a + wGrass * 1.4, a1.a + wSoil * 1.4, a2.a + wLime * 1.4, a3.a + wGravel * 1.6) * step(0.001, vec4(wGrass, wSoil, wLime, wGravel));
float hmax = max(max(hw.x, hw.y), max(hw.z, hw.w));
vec4 bw = max(hw - (hmax - 0.28), 0.0);
bw /= (bw.x + bw.y + bw.z + bw.w + 1e-4);

vec3 col = a0.rgb * bw.x + a1.rgb * bw.y + a2.rgb * bw.z + a3.rgb * bw.w;
vec3 farCol = uFar0 * bw.x + uFar1 * bw.y + uFar2 * bw.z + uFar3 * bw.w;
float far = smoothstep(90.0, 700.0, camDist);
col = mix(col, farCol, far);
// large-scale tints: dry straw ↔ olive ↔ red-brown soil, and light / dark ground
col *= mix(vec3(0.97, 0.94, 0.78), vec3(0.82, 0.92, 0.74), n3);
col = mix(col, col * vec3(1.08, 0.86, 0.72), smoothstep(0.55, 0.8, nrFbm(xz / 60.0 + 3.0)) * 0.6);
col *= 0.8 + 0.32 * n2;
// low green herbs mottling the dry cover
col = mix(col, col * vec3(0.7, 0.88, 0.58), smoothstep(0.46, 0.76, nrFbm(xz / 6.5 + 1.7)) * 0.65 * bw.x);
// thick maquis reads as darker ground where single shrubs are too small to draw
float cover = smoothstep(0.45, 0.8, nrFbm(xz / 75.0 + 11.0)) * smoothstep(300.0, 1400.0, camDist);
col *= 1.0 - 0.38 * cover;
diffuseColor.rgb = col;

vec3 tn = nrNor(uNor0, xz, uTile[0], mixer) * bw.x + nrNor(uNor1, xz, uTile[1], mixer) * bw.y + nrNor(uNor2, xz, uTile[2], mixer) * bw.z + nrNor(uNor3, xz, uTile[3], mixer) * bw.w;
float splatRough = clamp(tn.b * 0.55 + 0.5, 0.55, 1.0);
vec2 nxy = (tn.rg * 2.0 - 1.0) * (1.0 - far) * 1.15;
`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = splatRough;')
      .replace(
        '#include <normal_fragment_maps>',
        `{
  // world-aligned tangent frame (x east, z south), perturbed by the splat normal
  vec3 T = normalize(vec3(1.0, 0.0, 0.0) - nW * nW.x);
  vec3 B = normalize(cross(T, nW));
  vec3 pn = normalize(T * nxy.x + B * nxy.y + nW * sqrt(max(0.05, 1.0 - dot(nxy, nxy))));
  normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);
}`,
      );
  };
  m.customProgramCacheKey = () => 'navigation-replay-terrain-v1';
  return { material: m, uniforms };
}
