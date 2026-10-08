import * as THREE from 'three';

/**
 * Runtime materials for contour-mountain.glb (see
 * scripts/blender/build_contour_mountain.py for the node/material contract).
 *
 * The terrain is shaded like a game terrain rather than with one unique
 * texture: four tiling CC0 photo materials from Poly Haven (grass, dry
 * ground, rock, woodland floor) are blended per pixel by a baked splat map,
 * then modulated by a baked macro map (cavity AO). Every layer
 * is sampled triplanar in the slice's OBJECT space, so steep faces don't
 * stretch and textures stay glued to a slice while it is lifted. Detail
 * normals use the UDN triplanar blend and are converted straight to view
 * space (slices only ever translate, never rotate or scale).
 *
 * Kept out of ContourCake3D.tsx so that file stays about interaction.
 */

export type TerrainTextures = {
  splat: THREE.Texture;
  macro: THREE.Texture;
  grassD: THREE.Texture;
  grassN: THREE.Texture;
  dryD: THREE.Texture;
  dryN: THREE.Texture;
  rockD: THREE.Texture;
  rockN: THREE.Texture;
  forestD: THREE.Texture;
  forestN: THREE.Texture;
};

/** Metres per texture repeat, per layer: grass, dry ground, rock, woodland floor. */
const TILE_M = [7, 4.5, 10, 4] as const;
/** Photo → Mediterranean-hill grade, per layer (linear-space multipliers). */
const TINT: [number, number, number][] = [
  [0.8, 0.94, 0.66], // grass: pull the photo's yellow toward Mediterranean olive-green
  [0.84, 0.8, 0.7], // dry ground
  [0.86, 0.86, 0.84], // rock (after desaturation → grey limestone)
  [0.9, 0.95, 0.82], // woodland floor
];
const SATURATION = [0.9, 0.8, 0.15, 0.85] as const;

const TRIPLANAR_GLSL = /* glsl */ `
  float cmLum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  vec3 cmTriBlend(vec3 n) {
    vec3 b = pow(abs(n), vec3(4.0));
    return b / (b.x + b.y + b.z);
  }
  vec3 cmTriColor(sampler2D t, vec3 p, vec3 bw) {
    return texture2D(t, p.zy).rgb * bw.x + texture2D(t, p.xz).rgb * bw.y + texture2D(t, p.xy).rgb * bw.z;
  }
  // UDN triplanar normal blend (Ben Golus), result in object space.
  vec3 cmTriNormal(sampler2D t, vec3 p, vec3 n, vec3 bw, float strength) {
    vec3 tx = texture2D(t, p.zy).xyz * 2.0 - 1.0;
    vec3 ty = texture2D(t, p.xz).xyz * 2.0 - 1.0;
    vec3 tz = texture2D(t, p.xy).xyz * 2.0 - 1.0;
    tx.xy *= strength; ty.xy *= strength; tz.xy *= strength;
    vec3 nx = vec3(tx.xy + n.zy, n.x);
    vec3 ny = vec3(ty.xy + n.xz, n.y);
    vec3 nz = vec3(tz.xy + n.xy, n.z);
    return normalize(nx.zyx * bw.x + ny.xzy * bw.y + nz.xyz * bw.z);
  }
`;

/** Adds object-space position/normal varyings to a built-in material. */
function injectObjectSpace(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vCmPos;\nvarying vec3 vCmNormal;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCmPos = transformed;\nvCmNormal = objectNormal;');
}

export function createTerrainMaterial(tex: TerrainTextures, halfUnits: number, metersPerUnit: number) {
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.93,
    metalness: 0,
    // Contour lines drawn exactly on the surface must win the depth test.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const uniforms = {
    uSplat: { value: tex.splat },
    uMacro: { value: tex.macro },
    uD0: { value: tex.grassD },
    uN0: { value: tex.grassN },
    uD1: { value: tex.dryD },
    uN1: { value: tex.dryN },
    uD2: { value: tex.rockD },
    uN2: { value: tex.rockN },
    uD3: { value: tex.forestD },
    uN3: { value: tex.forestN },
    uInvSpan: { value: 1 / (2 * halfUnits) },
    uTile: { value: new THREE.Vector4(...TILE_M.map((m) => metersPerUnit / m)) },
    uTint0: { value: new THREE.Vector3(...TINT[0]) },
    uTint1: { value: new THREE.Vector3(...TINT[1]) },
    uTint2: { value: new THREE.Vector3(...TINT[2]) },
    uTint3: { value: new THREE.Vector3(...TINT[3]) },
    uSat: { value: new THREE.Vector4(...SATURATION) },
  };
  mat.customProgramCacheKey = () => 'contour-mountain-terrain';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    injectObjectSpace(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vCmPos;
        varying vec3 vCmNormal;
        uniform sampler2D uSplat, uMacro, uD0, uN0, uD1, uN1, uD2, uN2, uD3, uN3;
        uniform float uInvSpan;
        uniform vec4 uTile, uSat;
        uniform vec3 uTint0, uTint1, uTint2, uTint3;
        ${TRIPLANAR_GLSL}
        vec3 cmGrade(vec3 c, vec3 tint, float sat) { return mix(vec3(cmLum(c)), c, sat) * tint; }`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec3 cmN = normalize(vCmNormal);
        vec3 cmBw = cmTriBlend(cmN);
        vec2 cmUv = vec2(vCmPos.x * uInvSpan + 0.5, 0.5 - vCmPos.z * uInvSpan);
        vec4 cmW = texture2D(uSplat, cmUv);
        vec3 cmP0 = vCmPos * uTile.x, cmP1 = vCmPos * uTile.y, cmP2 = vCmPos * uTile.z, cmP3 = vCmPos * uTile.w;
        vec3 cmC0 = cmGrade(cmTriColor(uD0, cmP0, cmBw), uTint0, uSat.x);
        vec3 cmC1 = cmGrade(cmTriColor(uD1, cmP1, cmBw), uTint1, uSat.y);
        vec3 cmC2 = cmGrade(cmTriColor(uD2, cmP2, cmBw), uTint2, uSat.z);
        vec3 cmC3 = cmGrade(cmTriColor(uD3, cmP3, cmBw), uTint3, uSat.w);
        // Height-aware blend: brighter texels (stones, crests) push through
        // their neighbours, giving the ragged edges of real ground cover.
        vec4 cmH = vec4(cmLum(cmC0), cmLum(cmC1), cmLum(cmC2), cmLum(cmC3));
        vec4 cmHw = max(cmW + (cmH - 0.3) * 0.35 * cmW, 0.0);
        cmHw = cmHw * cmHw * cmHw;
        cmHw /= max(dot(cmHw, vec4(1.0)), 1e-4);
        float cmMacro = texture2D(uMacro, cmUv).r * 2.0;
        diffuseColor.rgb *= (cmC0 * cmHw.x + cmC1 * cmHw.y + cmC2 * cmHw.z + cmC3 * cmHw.w) * cmMacro;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        vec3 cmNo = normalize(
          cmTriNormal(uN0, cmP0, cmN, cmBw, 1.0) * cmHw.x +
          cmTriNormal(uN1, cmP1, cmN, cmBw, 1.0) * cmHw.y +
          cmTriNormal(uN2, cmP2, cmN, cmBw, 1.3) * cmHw.z +
          cmTriNormal(uN3, cmP3, cmN, cmBw, 1.0) * cmHw.w);
        normal = normalize((viewMatrix * vec4(cmNo, 0.0)).xyz);`,
      );
  };
  return mat;
}

/** Single-texture triplanar material (diorama walls). */
export function createTriplanarMaterial(
  diffuse: THREE.Texture,
  normalMap: THREE.Texture,
  opts: { tileMeters: number; metersPerUnit: number; tint: [number, number, number]; saturation: number; vertexColors?: boolean; key: string },
) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, vertexColors: !!opts.vertexColors });
  const uniforms = {
    uTD: { value: diffuse },
    uTN: { value: normalMap },
    uTTile: { value: opts.metersPerUnit / opts.tileMeters },
    uTTint: { value: new THREE.Vector3(...opts.tint) },
    uTSat: { value: opts.saturation },
  };
  mat.customProgramCacheKey = () => `contour-mountain-${opts.key}`;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    injectObjectSpace(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vCmPos;
        varying vec3 vCmNormal;
        uniform sampler2D uTD, uTN;
        uniform float uTTile, uTSat;
        uniform vec3 uTTint;
        ${TRIPLANAR_GLSL}`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec3 cmN = normalize(vCmNormal);
        vec3 cmBw = cmTriBlend(cmN);
        vec3 cmP = vCmPos * uTTile;
        vec3 cmC = cmTriColor(uTD, cmP, cmBw);
        diffuseColor.rgb *= mix(vec3(cmLum(cmC)), cmC, uTSat) * uTTint;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `normal = normalize((viewMatrix * vec4(cmTriNormal(uTN, cmP, cmN, cmBw, 1.2), 0.0)).xyz);`,
      );
  };
  return mat;
}
