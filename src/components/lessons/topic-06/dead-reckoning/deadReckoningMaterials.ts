import * as THREE from 'three';
import { VISIBILITY_M } from './deadReckoningModel';
import { WIND_DEG, azimuthToScene } from './deadReckoningTerrain';

/**
 * Materials of the dead-reckoning sandstorm. Every surface — ground, rocks,
 * bushes, dust grains and the sky — goes through one dust function in linear
 * light, before tone mapping, so a far stone, the far ground and the sky
 * reach exactly the same colour and no horizon or chunk edge can show.
 *
 * The storm. Transmittance T(d) = exp(−(d / L)^p · ρ), with L and p chosen so
 * that at the activity's VISIBILITY_M (30 m) about a sixth of a surface's
 * contrast is left — a recognition limit, not a wall: ~85 % at 5 m, ~50 % at
 * 15 m, ~2 % at 50 m, nothing by 80 m. ρ is a slowly drifting 3-D noise sampled along the
 * view ray, so denser and thinner banks of dust move past with the wind (a
 * fraction of that motion under reduced motion).
 *
 * The colours were sampled from the approved mockup (sRGB: sky #d4bca1, haze
 * at the horizon #c1a484, haze over the ground #ae8e6d) and are given here in
 * linear light; the renderer uses Neutral tone mapping, which leaves values
 * this low unchanged, so they land on screen as sampled.
 */

const lin = (hex: string) => new THREE.Color(hex); // THREE.Color converts sRGB hex to the linear working space

/** L and p of the transmittance (see above). */
export const DUST_RANGE_M = 20;
export const DUST_POWER = 1.45;
/** Transmittance at a distance with the mean dust density — the same curve the shaders use. */
export const dustTransmittance = (d: number, density = 1) => Math.exp(-Math.pow(d / DUST_RANGE_M, DUST_POWER) * density);
void VISIBILITY_M;

/** Wind in the scene's xz, metres per second (the dust banks drift with it). */
const [wx, wz] = azimuthToScene(WIND_DEG);
const WIND_SPEED = 3.2;

/** Uniforms shared by every material (one object, so one update reaches all of them). */
export const DUST = {
  uTime: { value: 0 },
  uDustZenith: { value: lin('#ead8c0') },
  uDustHorizon: { value: lin('#c5a888') },
  uDustLow: { value: lin('#b39475') },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunTint: { value: lin('#3a2c1c') },
  uDustRange: { value: DUST_RANGE_M },
  uDustPower: { value: DUST_POWER },
  uWind: { value: new THREE.Vector2(wx * WIND_SPEED, wz * WIND_SPEED) },
  uDustNoise: { value: null as THREE.Data3DTexture | null },
};

/** A tileable 3-D value-noise texture (32³, two octaves) for the drifting density. */
export function createDustNoise(): THREE.Data3DTexture {
  const S = 32;
  let seed = 0x2b7e15;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const lattice = (p: number) => {
    const v = new Float32Array(p * p * p);
    for (let k = 0; k < v.length; k++) v[k] = rnd();
    return (x: number, y: number, z: number) => v[((z % p) * p + (y % p)) * p + (x % p)];
  };
  const octave = (p: number) => {
    const L = lattice(p);
    const f = S / p;
    const s = (t: number) => t * t * (3 - 2 * t);
    return (x: number, y: number, z: number) => {
      const fx = x / f;
      const fy = y / f;
      const fz = z / f;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const z0 = Math.floor(fz);
      const tx = s(fx - x0);
      const ty = s(fy - y0);
      const tz = s(fz - z0);
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const c = (dx: number, dy: number, dz: number) => L(x0 + dx, y0 + dy, z0 + dz);
      return lerp(
        lerp(lerp(c(0, 0, 0), c(1, 0, 0), tx), lerp(c(0, 1, 0), c(1, 1, 0), tx), ty),
        lerp(lerp(c(0, 0, 1), c(1, 0, 1), tx), lerp(c(0, 1, 1), c(1, 1, 1), tx), ty),
        tz,
      );
    };
  };
  const o1 = octave(4);
  const o2 = octave(8);
  const data = new Uint8Array(S * S * S);
  for (let z = 0; z < S; z++)
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) data[(z * S + y) * S + x] = Math.round(255 * (0.68 * o1(x, y, z) + 0.32 * o2(x, y, z)));
  const t = new THREE.Data3DTexture(data, S, S, S);
  t.format = THREE.RedFormat;
  t.type = THREE.UnsignedByteType;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

/** A tileable 2-D noise (256², fbm) for the ground's large colour variation. */
export function createMacroNoise(): THREE.DataTexture {
  const S = 256;
  let seed = 0x91e10d;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const octave = (p: number) => {
    const v = new Float32Array(p * p).map(() => rnd());
    const f = S / p;
    const s = (t: number) => t * t * (3 - 2 * t);
    return (x: number, y: number) => {
      const fx = x / f;
      const fy = y / f;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = s(fx - x0);
      const ty = s(fy - y0);
      const c = (dx: number, dy: number) => v[((y0 + dy) % p) * p + ((x0 + dx) % p)];
      return c(0, 0) + (c(1, 0) - c(0, 0)) * tx + (c(0, 1) - c(0, 0)) * ty + (c(0, 0) - c(1, 0) - c(0, 1) + c(1, 1)) * tx * ty;
    };
  };
  const os = [octave(4), octave(8), octave(16), octave(32)];
  const w = [0.45, 0.28, 0.17, 0.1];
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let n = 0;
      for (let k = 0; k < 4; k++) n += w[k] * os[k](x, y);
      const k4 = (y * S + x) * 4;
      // R: the fbm; G: a second, shifted copy for the scale mix
      data[k4] = Math.round(255 * n);
      data[k4 + 1] = Math.round(255 * (0.6 * os[1]((x + 97) % S, (y + 41) % S) + 0.4 * os[3]((x + 13) % S, (y + 201) % S)));
      data[k4 + 2] = 0;
      data[k4 + 3] = 255;
    }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------- the shared GLSL

const DUST_PARS = /* glsl */ `
uniform float uTime;
uniform vec3 uDustZenith;
uniform vec3 uDustHorizon;
uniform vec3 uDustLow;
uniform vec3 uSunDir;
uniform vec3 uSunTint;
uniform float uDustRange;
uniform float uDustPower;
uniform vec2 uWind;
uniform highp sampler3D uDustNoise;

vec3 dustSky(vec3 dir) {
  float up = dir.y;
  vec3 c = mix(uDustHorizon, uDustZenith, smoothstep(0.0, 0.45, up));
  c = mix(c, uDustLow, smoothstep(0.0, -0.3, up));
  float sun = max(dot(dir, uSunDir), 0.0);
  c += uSunTint * (pow(sun, 10.0) * 0.55 + sun * sun * 0.3 + sun * 0.08);
  // Slow billows in the dust overhead, the same for the sky and for far surfaces.
  vec3 q = dir * 1.7 + vec3(uWind.x, 0.0, uWind.y) * (uTime * 0.0035);
  float n = texture(uDustNoise, q).r;
  float n2 = texture(uDustNoise, dir * vec3(4.2, 7.0, 4.2) + vec3(0.31, 0.12, 0.71) + vec3(uWind.x, 0.0, uWind.y) * (uTime * 0.006)).r;
  // (Smoothed value noise hardly strays from 0.5: stretched, so the billows show.)
  return c * (0.925 + 0.11 * smoothstep(0.3, 0.7, n) + 0.04 * smoothstep(0.3, 0.7, n2));
}

float dustDensity(vec3 p) {
  vec3 m = p - vec3(uWind.x, 0.0, uWind.y) * uTime;
  vec3 q = m * vec3(1.0 / 36.0, 1.0 / 14.0, 1.0 / 36.0);
  float a = texture(uDustNoise, q).r;
  // Wisps: the same noise stretched along the wind, low over the ground.
  vec2 wd = normalize(uWind);
  vec3 r = vec3(dot(m.xz, wd) / 70.0, m.y / 5.0, dot(m.xz, vec2(-wd.y, wd.x)) / 9.0);
  float b = texture(uDustNoise, r + vec3(0.31, 0.17, 0.53)).r;
  // Between 0.6 (a thin gap) and 1.2 (a dense bank), stretched so both occur, ~0.9 on average (the noise's
  // mean is ~0.55): about a sixth of a surface's contrast still reaches the eye from 30 m, as above.
  return 0.6 + 0.6 * smoothstep(0.33, 0.77, a * 0.55 + b * 0.45);
}

/** Mean dust density along a ray from the eye, sampled out to m metres (72 m and beyond: the same for every far point). */
float dustAlong(vec3 dir, float m) {
  return (dustDensity(cameraPosition + dir * (m * 0.25)) + dustDensity(cameraPosition + dir * (m * 0.6)) + dustDensity(cameraPosition + dir * (m * 0.92))) / 3.0;
}

/** The light the dust scatters towards the eye: thicker banks glow a little brighter — the veils drifting past. */
vec3 dustGlow(vec3 dir, float rho) {
  return dustSky(dir) * (1.0 + 0.16 * (rho - 1.0));
}

vec3 applyDust(vec3 col, vec3 wp) {
  vec3 ray = wp - cameraPosition;
  float d = length(ray);
  vec3 dir = ray / max(d, 1e-4);
  float rho = dustAlong(dir, min(d, 72.0));
  float T = exp(-pow(d / uDustRange, uDustPower) * rho);
  return mix(dustGlow(dir, rho), col, T);
}
`;

const VERT_WORLD = /* glsl */ `
{
  vec4 dw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    dw = instanceMatrix * dw;
  #endif
  dw = modelMatrix * dw;
  vDustWorld = dw.xyz;
}
`;

function addDust(shader: THREE.WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, DUST);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vDustWorld;')
    .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${VERT_WORLD}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nvarying vec3 vDustWorld;\n${DUST_PARS}`)
    .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = applyDust(gl_FragColor.rgb, vDustWorld);\n#include <tonemapping_fragment>');
}

// ---------------------------------------------------------------- the ground

export type GroundTextures = {
  albedo: [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];
  normal: [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];
  roughness: THREE.Texture;
};

/** Tile of the ground textures, metres (the scans cover ~2–2.5 m). */
const TILE_M = 1.9;

/**
 * The ground: four scanned layers — base desert soil, stony ground, bank soil,
 * wind-blown sand — splatted by the terrain's masks and blended by their own
 * height maps (stones poke through sand, sand fills the hollows), each sampled
 * at two scales and rotations mixed by a large noise so no tile repeats, with
 * a large colour variation on top. Normals and roughness from the same
 * layers; the vertex AO darkens hollows and rock contacts.
 */
export function createGroundMaterial(tex: GroundTextures, macro: THREE.Texture) {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const uniforms = {
    uAlb0: { value: tex.albedo[0] },
    uAlb1: { value: tex.albedo[1] },
    uAlb2: { value: tex.albedo[2] },
    uAlb3: { value: tex.albedo[3] },
    uNor0: { value: tex.normal[0] },
    uNor1: { value: tex.normal[1] },
    uNor2: { value: tex.normal[2] },
    uNor3: { value: tex.normal[3] },
    uRough: { value: tex.roughness },
    uMacro: { value: macro },
    uTile: { value: TILE_M },
  };
  m.onBeforeCompile = (shader) => {
    addDust(shader);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 aLayers;
attribute float aAO;
varying vec4 vLayers;
varying float vAO;
varying vec3 vGeoN;`,
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLayers = aLayers;\nvAO = aAO;\nvGeoN = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uAlb0; uniform sampler2D uAlb1; uniform sampler2D uAlb2; uniform sampler2D uAlb3;
uniform sampler2D uNor0; uniform sampler2D uNor1; uniform sampler2D uNor2; uniform sampler2D uNor3;
uniform sampler2D uRough; uniform sampler2D uMacro; uniform float uTile;
varying vec4 vLayers;
varying float vAO;
varying vec3 vGeoN;
const float ROT = 0.61;
vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
vec2 wuv = vec2(vDustWorld.x, -vDustWorld.z);
vec2 uvA = wuv / uTile;
vec2 uvB = rot2(wuv, ROT) / (uTile * 2.71) + vec2(0.37, 0.71);
vec4 macro = texture2D(uMacro, wuv / 47.0);
vec4 macro2 = texture2D(uMacro, wuv / 11.0 + 0.5);
float sB = smoothstep(0.32, 0.68, macro2.g);

vec3 nA0 = texture2D(uNor0, uvA).rgb, nB0 = texture2D(uNor0, uvB).rgb;
vec3 nA1 = texture2D(uNor1, uvA).rgb, nB1 = texture2D(uNor1, uvB).rgb;
vec3 nA2 = texture2D(uNor2, uvA).rgb, nB2 = texture2D(uNor2, uvB).rgb;
vec3 nA3 = texture2D(uNor3, uvA).rgb, nB3 = texture2D(uNor3, uvB).rgb;
vec4 hgt = vec4(mix(nA0.b, nB0.b, sB), mix(nA1.b, nB1.b, sB), mix(nA2.b, nB2.b, sB), mix(nA3.b, nB3.b, sB));

// Layer weights: base, stony, bank (the mask, or any steep face), drift sand.
float slope = 1.0 - clamp(vGeoN.y, 0.0, 1.0);
float wS = vLayers.x;
float wBk = max(vLayers.y * 0.85, smoothstep(0.22, 0.5, slope));
float wD = vLayers.z * (1.0 - wBk);
float wG = max(0.0, 1.0 - max(max(wS, wBk), wD)) + 0.08;
vec4 score = vec4(wG, wS, wBk, wD) * 1.15 + hgt * vec4(0.35, 0.6, 0.4, 0.25);
float top = max(max(score.x, score.y), max(score.z, score.w));
vec4 w = max(score - (top - 0.3), 0.0);
w /= (w.x + w.y + w.z + w.w);

// Each scan nudged to one palette: the grey gravel warmed, the sand a touch darker.
vec3 alb =
  w.x * mix(texture2D(uAlb0, uvA).rgb, texture2D(uAlb0, uvB).rgb, sB) +
  w.y * mix(texture2D(uAlb1, uvA).rgb, texture2D(uAlb1, uvB).rgb, sB) * vec3(1.16, 1.0, 0.82) +
  w.z * mix(texture2D(uAlb2, uvA).rgb, texture2D(uAlb2, uvB).rgb, sB) * vec3(1.0, 0.97, 0.98) +
  w.w * mix(texture2D(uAlb3, uvA).rgb, texture2D(uAlb3, uvB).rgb, sB) * vec3(1.0, 0.95, 0.86);
// Compacted road: lighter, finer.
float road = vLayers.w;
alb = mix(alb, alb * vec3(1.1, 1.07, 1.03) + vec3(0.012, 0.009, 0.006), road * 0.8);
// Large variation: lighter and darker, a little warmer and cooler.
float mv = macro.r - 0.5;
alb *= vec3(1.0 + mv * 0.5, 1.0 + mv * 0.42, 1.0 + mv * 0.3);
alb *= 0.93 + 0.14 * macro2.r;
// Metre-scale mottling — worn and crusted patches, finer and coarser grain — that still reads where the
// scans' own detail has blurred into its average, a few tens of metres out.
float mottle = texture2D(uMacro, rot2(wuv, 1.1) / 4.1 + 0.21).g;
alb *= 0.9 + 0.2 * mottle;
// Graded towards the local soil (the scans are from other deserts): less orange, a little greyer.
float aLum = dot(alb, vec3(0.2126, 0.7152, 0.0722));
alb = mix(alb, aLum * vec3(1.2, 1.0, 0.83), 0.68) * 0.8;
// More local contrast than the scans carry: under the storm's flat light their pebbles and crusts would wash out.
alb *= pow(max(dot(alb, vec3(0.2126, 0.7152, 0.0722)), 1e-3) / 0.15, 0.3);
diffuseColor.rgb *= alb;
`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
vec4 rgh = texture2D(uRough, uvA);
float roughnessFactor = clamp(dot(rgh, w) * 1.04 + 0.02, 0.55, 1.0);
`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
{
  vec2 nA = w.x * (nA0.rg * 2.0 - 1.0) + w.y * (nA1.rg * 2.0 - 1.0) + w.z * (nA2.rg * 2.0 - 1.0) + w.w * (nA3.rg * 2.0 - 1.0);
  vec2 nB = w.x * (nB0.rg * 2.0 - 1.0) + w.y * (nB1.rg * 2.0 - 1.0) + w.z * (nB2.rg * 2.0 - 1.0) + w.w * (nB3.rg * 2.0 - 1.0);
  vec2 nxy = mix(nA, rot2(nB, -ROT), sB) * (1.9 - 1.0 * road);
  vec3 nt = vec3(nxy, sqrt(max(0.0, 1.0 - dot(nxy, nxy))));
  vec3 N = normalize(vGeoN);
  vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
  vec3 B = cross(N, T);
  vec3 nw = normalize(T * nt.x + B * nt.y + N * nt.z);
  normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
}
`,
      )
      .replace(
        '#include <aomap_fragment>',
        /* glsl */ `
{
  // Hollows and rock contacts: the vertex AO, deepened in the low parts of the scanned relief.
  // Crevices of the scanned relief darker: the local contrast of a close, rough surface.
  float ambientOcclusion = clamp(vAO * (0.6 + 0.56 * dot(hgt, w)), 0.0, 1.0);
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  reflectedLight.directDiffuse *= mix(1.0, ambientOcclusion, 0.55);
}
`,
      );
  };
  m.customProgramCacheKey = () => 'dr-ground-v2';
  return m;
}

// ---------------------------------------------------------------- rocks and bushes

/**
 * A scanned rock's material, patched: dust settled on the faces that look up,
 * the colour pulled a little towards the local stone (the scans are from
 * another desert), and the storm.
 */
export function patchRockMaterial(src: THREE.MeshStandardMaterial, tint: THREE.Color, key: string) {
  const m = src.clone();
  m.metalness = 0;
  m.envMapIntensity = 0;
  const uniforms = { uTint: { value: tint }, uDustCoat: { value: lin('#b08d68') } };
  m.onBeforeCompile = (shader) => {
    addDust(shader);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vUpN;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
{
  vec3 n = objectNormal;
  #ifdef USE_INSTANCING
    n = mat3(instanceMatrix) * n;
  #endif
  vUpN = normalize(mat3(modelMatrix) * n);
}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTint;\nuniform vec3 uDustCoat;\nvarying vec3 vUpN;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum) * uTint * 2.2, 0.55);
}`,
      )
      // The piece's own shade (instance colour) first, then the dust on its upper faces, the same on every piece.
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float coat = smoothstep(0.45, 0.95, normalize(vUpN).y);
  diffuseColor.rgb = mix(diffuseColor.rgb, uDustCoat, coat * 0.3);
}`,
      );
  };
  m.customProgramCacheKey = () => `dr-rock-v2-${key}`;
  return m;
}

/** A bush's material: alpha-tested cards instead of blending (no sorting), dried towards grey-brown, the storm. */
export function patchShrubMaterial(src: THREE.MeshStandardMaterial, key: string) {
  const m = src.clone();
  m.transparent = false;
  m.depthWrite = true;
  if (src.alphaMap || src.map) m.alphaTest = 0.45;
  m.side = THREE.DoubleSide;
  m.metalness = 0;
  m.envMapIntensity = 0;
  m.onBeforeCompile = (shader) => {
    addDust(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
{
  float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  // Dry desert scrub: grey-brown twigs and leaves, a little dust on them.
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.2, 0.14) * (0.7 + 3.0 * lum), 0.86);
}`,
    );
  };
  m.customProgramCacheKey = () => `dr-shrub-v2-${key}`;
  return m;
}

// ---------------------------------------------------------------- sky and grains

/** The dome behind everything: the storm's own colour in every direction (exactly the far colour of every surface). */
export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: DUST,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    vertexShader: /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = (modelMatrix * vec4(position, 0.0)).xyz;
  vec4 p = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position, 1.0)).xyz, 1.0);
  gl_Position = p.xyww;
}`,
    fragmentShader: /* glsl */ `
${DUST_PARS}
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  gl_FragColor = vec4(dustGlow(dir, dustAlong(dir, 72.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
}

/**
 * Airborne grains: a box of points that wraps around the eye and streams with
 * the wind — the nearest layer of the storm. Positions are computed in the
 * vertex shader, so the CPU never touches them.
 */
export function createGrainMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...DUST, uBox: { value: new THREE.Vector3(36, 9, 36) }, uSize: { value: 1 }, uMotion: { value: 1 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
uniform vec3 uBox;
uniform float uSize;
uniform float uMotion;
uniform float uTime;
uniform vec2 uWind;
attribute float aSeed;
varying float vAlpha;
varying vec3 vWp;
void main() {
  vec3 drift = vec3(uWind.x, -0.15, uWind.y) * (uTime * uMotion * (1.6 + aSeed * 1.4));
  // Gusts: a small swirl per grain.
  drift += vec3(sin(uTime * uMotion * 1.3 + aSeed * 40.0), cos(uTime * uMotion * 0.9 + aSeed * 23.0) * 0.4, cos(uTime * uMotion * 1.1 + aSeed * 31.0)) * 0.6;
  vec3 local = mod(position + drift - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 wp = cameraPosition + local;
  vWp = wp;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  float d = -mv.z;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.7 + aSeed * 1.3) * 3.2 / max(d, 0.5);
  // Fade at the box edges and very close to the eye.
  vec3 e = abs(local) / (uBox * 0.5);
  vAlpha = (1.0 - smoothstep(0.7, 1.0, max(max(e.x, e.y), e.z))) * smoothstep(0.6, 2.2, d);
}`,
    fragmentShader: /* glsl */ `
${DUST_PARS}
varying float vAlpha;
varying vec3 vWp;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = dot(c, c);
  if (r > 1.0) discard;
  vec3 col = applyDust(uDustZenith * 1.12, vWp);
  gl_FragColor = vec4(col, vAlpha * (1.0 - r * r) * 0.5);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
}
