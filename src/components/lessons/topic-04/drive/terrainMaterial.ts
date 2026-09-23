import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { CALM_BLEND_RADIUS, CALM_START_RADIUS, TILE_HALF_SIZE } from './terrainConfigs';

/**
 * Layered terrain material for the trafficability driving lab.
 *
 * Instead of one photo texture tiled edge to edge, every fragment is built
 * from four layers, each masked by data the texture tiling knows nothing
 * about:
 *
 *   soil  — the calm base. Colour comes from a small warm palette; the photo
 *           texture only contributes low-contrast grain + normal detail.
 *   rock  — exposed stone on steep faces, convex ridges and a few noise-picked
 *           outcrop clusters. Uses the rock texture's luminance as a height
 *           signal, so a weak mask reveals only the largest stones (partially
 *           buried) and a strong mask reveals a full rock face.
 *   moss  — sparse vegetation clumps on gentle ground, biased toward hollows
 *           or crests per soil, plus in the crevices between exposed stones.
 *   wet   — darker, glossier, flatter ground collected in hollows/ruts.
 *
 * Detail is deliberately uneven: ground grain strength varies by patch and
 * fades with camera distance, the spawn disc is kept calm, and each texture is
 * sampled twice at unrelated scales/rotations to hide tiling.
 */

type Hex = string;

export type TerrainTextureLayer = {
  /** Folder holding `diffuse.webp` + `normal.webp`. */
  dir: string;
  /** World size (m) of one texture tile for the primary sampling. */
  scale: number;
  /** Strength of the luminance detail relative to the palette (per std-dev of the texture). */
  contrast: number;
  /** Multiplier on the tangent-space normal XY. */
  normalStrength: number;
};

export type TerrainMaterialProfile = {
  textures: {
    ground: TerrainTextureLayer;
    /** Omit when the soil has no exposed stone — the ground set is bound instead and never shown. */
    rock?: TerrainTextureLayer;
  };
  palette: {
    soilLight: Hex;
    soilDark: Hex;
    /** Second soil hue that appears in large soft patches (e.g. terra rossa under limestone). */
    soilAlt: Hex;
    rockLight: Hex;
    rockDark: Hex;
    moss: Hex;
    mossDark: Hex;
  };
  soil: {
    /** Amplitude of the broad (~20m) tonal drift. */
    variation: number;
    /** 0..1 — how strongly the `soilAlt` patches show. */
    altAmount: number;
    /** Crests lighter / hollows darker. */
    ridgeLight: number;
  };
  rock: {
    amount: number;
    /** Slope (1 − normal.y) range over which steep faces turn to rock. */
    slope: [number, number];
    /** Weight of convex ridges/boulders. */
    ridge: number;
    /** Weight of noise-picked outcrop clusters on otherwise gentle ground. */
    cluster: number;
    /** Higher = fewer, smaller outcrop clusters (fbm value, ~0.5 median). */
    clusterThreshold: number;
    /** Moss/soil filling the gaps between stones inside rocky areas. */
    creviceMoss: number;
  };
  moss: {
    amount: number;
    /** −1 avoids hollows … +1 prefers hollows. */
    hollowBias: number;
    /** −1 prefers low ground … +1 prefers high ground. */
    heightBias: number;
  };
  wet: {
    amount: number;
    /** Albedo multiplier for wet ground. */
    darken: number;
  };
  roughness: { soil: number; rock: number; moss: number; wet: number };
};

// ── Per-vertex masks ────────────────────────────────────────────────────────

/** Index of the last grid line ≤ v (clamped so i+1 is always valid). */
function lowerIndex(lines: Float32Array, v: number): number {
  let lo = 0;
  let hi = lines.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid] <= v) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Bakes a `terrainMask` vec2 attribute from the finished height grid:
 *   x — fine curvature (±0.9m Laplacian): + concave (ruts, riser bases), − convex (boulders, ledge lips)
 *   y — broad hollowness (vs. a 3.2m ring): + basins/puddles/troughs,   − crests
 * Heights are read back from the mesh itself (bilinear on its tensor grid —
 * row-major, x along columns, z along rows, spacing may be non-uniform), so
 * it needs no extra height-function calls and never touches positions/normals.
 * Also stores the playable tile's height range in `userData.terrainHeightRange`.
 */
export function bakeTerrainMasks(geometry: THREE.BufferGeometry) {
  const pos = geometry.attributes.position;
  const n = Math.round(Math.sqrt(pos.count));
  const xs = new Float32Array(n);
  const zs = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = pos.getX(i);
    zs[i] = pos.getZ(i * n);
  }
  const heightOnGrid = (x: number, z: number) => {
    const i = lowerIndex(xs, x);
    const j = lowerIndex(zs, z);
    const tx = THREE.MathUtils.clamp((x - xs[i]) / (xs[i + 1] - xs[i]), 0, 1);
    const tz = THREE.MathUtils.clamp((z - zs[j]) / (zs[j + 1] - zs[j]), 0, 1);
    const k = j * n + i;
    const a = pos.getY(k) + (pos.getY(k + 1) - pos.getY(k)) * tx;
    const b = pos.getY(k + n) + (pos.getY(k + n + 1) - pos.getY(k + n)) * tx;
    return a + (b - a) * tz;
  };

  const FINE = 0.9;
  const RING = 3.2;
  const DIAG = RING * Math.SQRT1_2;
  const masks = new Float32Array(pos.count * 2);
  let minY = Infinity;
  let maxY = -Infinity;

  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k);
    const z = pos.getZ(k);
    const c = pos.getY(k);
    const h = (dx: number, dz: number) => heightOnGrid(x + dx, z + dz);
    const fine = (h(-FINE, 0) + h(FINE, 0) + h(0, -FINE) + h(0, FINE)) / 4 - c;
    const ring =
      (h(-RING, 0) + h(RING, 0) + h(0, -RING) + h(0, RING) +
        h(-DIAG, -DIAG) + h(DIAG, -DIAG) + h(-DIAG, DIAG) + h(DIAG, DIAG)) / 8 - c;
    masks[k * 2] = THREE.MathUtils.clamp(fine / 0.06, -1, 1);
    masks[k * 2 + 1] = THREE.MathUtils.clamp(ring / 0.15, -1, 1);
    if (Math.abs(x) <= TILE_HALF_SIZE && Math.abs(z) <= TILE_HALF_SIZE) {
      minY = Math.min(minY, c);
      maxY = Math.max(maxY, c);
    }
  }
  geometry.setAttribute('terrainMask', new THREE.BufferAttribute(masks, 2));
  geometry.userData.terrainHeightRange = Number.isFinite(minY) ? [minY, maxY] : [0, 1];
}

// ── Texture helpers ─────────────────────────────────────────────────────────

const statsCache = new WeakMap<THREE.Texture, [number, number]>();

/**
 * Mean / std-dev of the texture's luminance (raw sRGB-encoded values — the
 * same space the shader samples in, since these textures stay NoColorSpace).
 * Lets the shader treat any photo texture as a normalised detail signal, so
 * profile `contrast` values mean the same thing for every texture.
 */
function luminanceStats(texture: THREE.Texture): [number, number] {
  const cached = statsCache.get(texture);
  if (cached) return cached;
  let stats: [number, number] = [0.4, 0.1];
  try {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx && texture.image) {
      ctx.drawImage(texture.image as CanvasImageSource, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let sum = 0;
      let sumSq = 0;
      const n = size * size;
      for (let i = 0; i < data.length; i += 4) {
        const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        sum += l;
        sumSq += l * l;
      }
      const mean = sum / n;
      stats = [mean, Math.max(Math.sqrt(Math.max(sumSq / n - mean * mean, 0)), 0.01)];
    }
  } catch {
    // Canvas read blocked — fall back to neutral stats rather than failing the scene.
  }
  statsCache.set(texture, stats);
  return stats;
}

function prepareTiledTexture(texture: THREE.Texture) {
  if (texture.wrapS !== THREE.RepeatWrapping || texture.anisotropy !== 8) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }
}

export function terrainTextureUrls(profile: TerrainMaterialProfile): [string, string, string, string] {
  const { ground, rock = ground } = profile.textures;
  return [`${ground.dir}/diffuse.webp`, `${ground.dir}/normal.webp`, `${rock.dir}/diffuse.webp`, `${rock.dir}/normal.webp`];
}

export function preloadTerrainMaterial(profile: TerrainMaterialProfile) {
  for (const url of new Set(terrainTextureUrls(profile))) useTexture.preload(url);
}

// ── Shader ──────────────────────────────────────────────────────────────────

const VERTEX_PARS = /* glsl */ `
attribute vec2 terrainMask;
varying vec3 vTgWorldPos;
varying vec3 vTgWorldNormal;
varying vec2 vTgMask;
`;

const VERTEX_MAIN = /* glsl */ `
vTgWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vTgWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
vTgMask = terrainMask;
`;

const FRAGMENT_PARS = /* glsl */ `
varying vec3 vTgWorldPos;
varying vec3 vTgWorldNormal;
varying vec2 vTgMask;

uniform sampler2D tgGroundMap;
uniform sampler2D tgGroundNormal;
uniform sampler2D tgRockMap;
uniform sampler2D tgRockNormal;
uniform vec4 tgGroundTex;   // scale, contrast, normalStrength, -
uniform vec4 tgRockTex;     // scale, contrast, normalStrength, -
uniform vec2 tgGroundStats; // luminance mean, std
uniform vec2 tgRockStats;
uniform vec3 tgSoilLight;
uniform vec3 tgSoilDark;
uniform vec3 tgSoilAlt;
uniform vec3 tgRockLight;
uniform vec3 tgRockDark;
uniform vec3 tgMoss;
uniform vec3 tgMossDark;
uniform vec3 tgSoilParams;  // variation, altAmount, ridgeLight
uniform vec4 tgRockParams;  // amount, slopeLo, slopeHi, ridge
uniform vec3 tgRockParams2; // cluster, clusterThreshold, creviceMoss
uniform vec3 tgMossParams;  // amount, hollowBias, heightBias
uniform vec2 tgWetParams;   // amount, darken
uniform vec4 tgRough;       // soil, rock, moss, wet
uniform vec2 tgHeightRange;
uniform vec2 tgCalm;        // calm-disc start/end radius

float tgHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float tgNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tgHash(i), tgHash(i + vec2(1.0, 0.0)), u.x),
             mix(tgHash(i + vec2(0.0, 1.0)), tgHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float tgFbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * tgNoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    a *= 0.5;
  }
  return s / 0.875;
}
vec2 tgRot(vec2 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}
float tgLum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

// Replaces <map_fragment>: computes every layer once; later chunks reuse the locals.
const FRAGMENT_LAYERS = /* glsl */ `
// Planar coords matching the old PlaneGeometry UV orientation (u = +x, v = −z).
vec2 tgP = vec2(vTgWorldPos.x, -vTgWorldPos.z);
vec3 tgN = normalize(vTgWorldNormal);
float tgSlope = 1.0 - clamp(tgN.y, 0.0, 1.0);
float tgH = clamp((vTgWorldPos.y - tgHeightRange.x) / max(tgHeightRange.y - tgHeightRange.x, 0.001), 0.0, 1.0);
float tgCurv = vTgMask.x;
float tgHollow = vTgMask.y;
float tgFar = smoothstep(10.0, 38.0, length(vTgWorldPos - cameraPosition));

float tgMacro = tgFbm(tgP * 0.045);
float tgPatch = tgFbm(tgP * 0.16 + 17.3);
float tgCluster = tgFbm(tgP * 0.11 + 63.1);
float tgMixField = tgFbm(tgP * 0.08 + 41.0);
float tgFine = tgNoise(tgP * 1.9 + 5.7);
float tgCalmW = 1.0 - smoothstep(tgCalm.x, tgCalm.y, length(vTgWorldPos.xz) + (tgPatch - 0.5) * 5.0);

// Ground detail — two decorrelated samplings blended by noise to hide tiling.
float tgMixG = smoothstep(0.3, 0.7, tgMixField);
vec2 tgUvGA = tgP / tgGroundTex.x;
vec2 tgUvGB = tgRot(tgP, 0.61) / (tgGroundTex.x * 1.73) + 0.37;
float tgGL = mix(tgLum(texture2D(tgGroundMap, tgUvGA).rgb), tgLum(texture2D(tgGroundMap, tgUvGB).rgb), tgMixG);
float tgGZ = clamp((tgGL - tgGroundStats.x) / tgGroundStats.y, -2.5, 2.5);
vec3 tgGNA = texture2D(tgGroundNormal, tgUvGA).xyz * 2.0 - 1.0;
vec3 tgGNB = texture2D(tgGroundNormal, tgUvGB).xyz * 2.0 - 1.0;
tgGNB.xy = tgRot(tgGNB.xy, -0.61);
vec3 tgGN = mix(tgGNA, tgGNB, tgMixG);

// Rock detail — same trick, different scale/rotation.
float tgMixR = smoothstep(0.35, 0.65, 1.0 - tgMixField);
vec2 tgUvRA = tgP / tgRockTex.x;
vec2 tgUvRB = tgRot(tgP, 2.1) / (tgRockTex.x * 1.41) + 0.71;
float tgRL = mix(tgLum(texture2D(tgRockMap, tgUvRA).rgb), tgLum(texture2D(tgRockMap, tgUvRB).rgb), tgMixR);
float tgRZ = clamp((tgRL - tgRockStats.x) / tgRockStats.y, -2.5, 2.5);
vec3 tgRNA = texture2D(tgRockNormal, tgUvRA).xyz * 2.0 - 1.0;
vec3 tgRNB = texture2D(tgRockNormal, tgUvRB).xyz * 2.0 - 1.0;
tgRNB.xy = tgRot(tgRNB.xy, -2.1);
vec3 tgRN = mix(tgRNA, tgRNB, tgMixR);
float tgRockH = clamp(0.5 + tgRZ * 0.22, 0.0, 1.0);

// Soil — palette-driven, grain strength varies by patch and fades with distance.
float tgDetailVis = mix(0.5, 1.15, tgPatch) * (1.0 - tgFar * 0.6);
float tgTone = 0.55 + (tgMacro - 0.5) * tgSoilParams.x - tgHollow * tgSoilParams.z * 0.5
  + tgGZ * tgGroundTex.y * tgDetailVis;
vec3 tgSoil = mix(tgSoilDark, tgSoilLight, clamp(tgTone, 0.0, 1.0));
tgSoil = mix(tgSoil, tgSoilAlt, smoothstep(0.5, 0.75, 1.0 - tgCluster) * tgSoilParams.y);

// Rock — steep faces + convex ridges + a few outcrop clusters, height-blended.
float tgRockMask = smoothstep(tgRockParams.y, tgRockParams.z, tgSlope)
  + smoothstep(0.05, 0.7, -tgCurv) * tgRockParams.w
  + smoothstep(tgRockParams2.y, tgRockParams2.y + 0.14, tgCluster) * tgRockParams2.x;
tgRockMask = clamp(tgRockMask, 0.0, 1.0) * tgRockParams.x * (1.0 - tgCalmW * 0.85);
float tgRockEdge = tgRockMask - (1.0 - tgRockH) * 0.9;
float tgRockW = smoothstep(0.0, 0.1, tgRockEdge);
float tgRT = clamp(0.5 + tgRZ * 0.3 * tgRockTex.y + (tgMacro - 0.5) * tgSoilParams.x * 0.6, 0.0, 1.0);
vec3 tgRockCol = mix(tgRockDark, tgRockLight, tgRT);
tgRockCol *= mix(0.8, 1.0, smoothstep(0.0, 0.35, tgRockEdge));       // stones darken where they meet the ground
tgSoil *= 1.0 - 0.12 * smoothstep(-0.18, 0.0, tgRockEdge) * step(0.001, tgRockMask); // contact shade on soil

// Moss / sparse vegetation — clumped, only on gentle ground, never uniform.
float tgMossMask = tgMossParams.x
  * (1.0 - smoothstep(0.12, 0.38, tgSlope))
  * clamp(1.0 + tgMossParams.y * tgHollow, 0.0, 1.6)
  * clamp(1.0 + tgMossParams.z * (tgH - 0.5) * 2.0, 0.0, 1.6)
  * smoothstep(0.4, 0.7, tgPatch)
  * (1.0 - tgCalmW * 0.7);
tgMossMask = max(tgMossMask, tgRockParams2.z * tgRockMask * (1.0 - smoothstep(0.3, 0.6, tgSlope)));
float tgClump = clamp(tgFine * 0.65 + (0.5 + tgGZ * 0.18) * 0.35, 0.0, 1.0);
float tgMossW = smoothstep(0.0, 0.12, tgMossMask - (1.0 - tgClump) * 0.85) * (1.0 - tgRockW);
vec3 tgMossCol = mix(tgMossDark, tgMoss, clamp(tgClump * 1.2 - 0.1 + (tgMacro - 0.5) * 0.4, 0.0, 1.0));

// Wet ground collects in hollows and ruts.
float tgWetW = tgWetParams.x * smoothstep(0.2, 0.75, max(tgHollow, tgCurv * 0.8))
  * mix(0.75, 1.0, tgFine) * (1.0 - tgRockW);

vec3 tgAlbedo = mix(tgSoil, tgMossCol, tgMossW);
tgAlbedo = mix(tgAlbedo, tgRockCol, tgRockW);
tgAlbedo = mix(tgAlbedo, tgAlbedo * tgWetParams.y, tgWetW);
diffuseColor.rgb *= tgAlbedo;

float tgRoughness = mix(mix(mix(tgRough.x, tgRough.z, tgMossW), tgRough.y, tgRockW), tgRough.w, tgWetW);

float tgGStr = tgGroundTex.z * mix(1.0, 0.45, tgMossW) * (1.0 - tgFar * 0.5);
vec3 tgTN = mix(vec3(tgGN.xy * tgGStr, tgGN.z), vec3(tgRN.xy * tgRockTex.z, tgRN.z), tgRockW);
tgTN.xy *= 1.0 - tgWetW * 0.85;
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
float roughnessFactor = tgRoughness;
`;

// Planar tangent frame: T follows +x, B follows the texture's v (= −z).
const FRAGMENT_NORMAL = /* glsl */ `
{
  vec3 tgT = normalize(vec3(1.0, 0.0, 0.0) - tgN * tgN.x);
  vec3 tgB = cross(tgN, tgT);
  vec3 tgNW = normalize(tgT * tgTN.x + tgB * tgTN.y + tgN * max(tgTN.z, 0.05));
  normal = normalize((viewMatrix * vec4(tgNW, 0.0)).xyz);
}
`;

type TerrainTextures = [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];

function createTerrainMaterial(
  profile: TerrainMaterialProfile,
  [groundMap, groundNormal, rockMap, rockNormal]: TerrainTextures,
  heightRange: [number, number],
) {
  const ground = profile.textures.ground;
  const rockTex = profile.textures.rock ?? ground;
  const { palette, soil, rock, moss, wet, roughness } = profile;
  for (const t of [groundMap, groundNormal, rockMap, rockNormal]) prepareTiledTexture(t);

  const color = (hex: Hex) => new THREE.Color(hex); // sRGB hex → linear working space
  const uniforms: Record<string, THREE.IUniform> = {
    tgGroundMap: { value: groundMap },
    tgGroundNormal: { value: groundNormal },
    tgRockMap: { value: rockMap },
    tgRockNormal: { value: rockNormal },
    tgGroundTex: { value: new THREE.Vector4(ground.scale, ground.contrast, ground.normalStrength, 0) },
    tgRockTex: { value: new THREE.Vector4(rockTex.scale, rockTex.contrast, rockTex.normalStrength, 0) },
    tgGroundStats: { value: new THREE.Vector2(...luminanceStats(groundMap)) },
    tgRockStats: { value: new THREE.Vector2(...luminanceStats(rockMap)) },
    tgSoilLight: { value: color(palette.soilLight) },
    tgSoilDark: { value: color(palette.soilDark) },
    tgSoilAlt: { value: color(palette.soilAlt) },
    tgRockLight: { value: color(palette.rockLight) },
    tgRockDark: { value: color(palette.rockDark) },
    tgMoss: { value: color(palette.moss) },
    tgMossDark: { value: color(palette.mossDark) },
    tgSoilParams: { value: new THREE.Vector3(soil.variation, soil.altAmount, soil.ridgeLight) },
    tgRockParams: { value: new THREE.Vector4(profile.textures.rock ? rock.amount : 0, rock.slope[0], rock.slope[1], rock.ridge) },
    tgRockParams2: { value: new THREE.Vector3(rock.cluster, rock.clusterThreshold, rock.creviceMoss) },
    tgMossParams: { value: new THREE.Vector3(moss.amount, moss.hollowBias, moss.heightBias) },
    tgWetParams: { value: new THREE.Vector2(wet.amount, wet.darken) },
    tgRough: { value: new THREE.Vector4(roughness.soil, roughness.rock, roughness.moss, roughness.wet) },
    tgHeightRange: { value: new THREE.Vector2(...heightRange) },
    tgCalm: { value: new THREE.Vector2(CALM_START_RADIUS * 0.6, CALM_BLEND_RADIUS) },
  };

  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
  // The terrain casts its own hill shadows. three's default shadow pass draws
  // only back faces, which on a heightfield are just the steep lee slopes, so
  // most ridges would cast nothing.
  material.shadowSide = THREE.FrontSide;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', FRAGMENT_LAYERS)
      .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS)
      .replace('#include <normal_fragment_maps>', FRAGMENT_NORMAL);
  };
  // All soils share one compiled program; only uniform values differ.
  material.customProgramCacheKey = () => 'geo-terrain-layers-v1';
  return material;
}

/**
 * Loads a profile's textures (suspends) and returns a disposable layered
 * terrain material. `geometry` must have been through `bakeTerrainMasks`.
 */
export function useTerrainMaterial(profile: TerrainMaterialProfile, geometry: THREE.BufferGeometry) {
  const textures = useTexture(terrainTextureUrls(profile)) as TerrainTextures;
  const [t0, t1, t2, t3] = textures;

  const material = useMemo(() => {
    const range = (geometry.userData.terrainHeightRange as [number, number] | undefined) ?? [0, 1];
    return createTerrainMaterial(profile, [t0, t1, t2, t3], range);
  }, [profile, geometry, t0, t1, t2, t3]);

  useEffect(() => () => material.dispose(), [material]);
  return material;
}
