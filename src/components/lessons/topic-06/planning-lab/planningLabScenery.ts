import * as THREE from 'three';
import { WORLD3D } from './planningLabView';

/**
 * The made things and the air of the planning lab's model: the stone house at
 * A, its tiled roof, the annex's concrete roof, the water tank, the stream's
 * water and the sky. Geometry is PlanningLab3D's, unchanged; these only shade it.
 *
 *   walls  coursed limestone blocks of a few sizes, each its own shade, with
 *          mortar joints, stone frames round the windows, a darker plinth and
 *          the dust and damp the ground leaves on the lowest course
 *   roof   rows of terracotta tiles, each a little different, weathered darker
 *          towards the eaves
 *   tank   a concrete drum with rust and rain streaks, darker underneath
 *   water  a dark, slightly turbid stream that mirrors the sky at a glancing
 *          angle, rippled along its flow, its edges fading into the wet bank
 *   sky    the sky photograph (Poly Haven, CC0; the lab's copy of the replay's), turned so its sun
 *          stands over the scene's own; below the haze line it is the fog's colour
 */

const S = WORLD3D.metresPerUnit;

const NOISE = /* glsl */ `
float scHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float scNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(scHash(i), scHash(i + vec2(1.0, 0.0)), u.x), mix(scHash(i + vec2(0.0, 1.0)), scHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

/** Local unit-box position, its size in metres (instance scale), its face normal: for the box-instanced walls and roof. */
const BOX_VERT = /* glsl */ `
vScLocal = position;
vScNormal = normal;
#ifdef USE_INSTANCING
  vScSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)) * ${S.toFixed(1)};
#else
  vScSize = vec3(1.0);
#endif`;
const BOX_VARYINGS = 'varying vec3 vScLocal;\nvarying vec3 vScSize;\nvarying vec3 vScNormal;';

/** Coursed limestone walls with windows. The instance colour is the stone's (and the highlight). */
export function stoneWallMaterial() {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  mat.customProgramCacheKey = () => 'planning-lab-wall-v2';
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${BOX_VARYINGS}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${BOX_VERT}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${BOX_VARYINGS}\n${NOISE}`).replace(
      '#include <map_fragment>',
      /* glsl */ `#include <map_fragment>
      if (abs(vScNormal.y) < 0.5) {
        float along = abs(vScNormal.x) > 0.5 ? (vScLocal.z + 0.5) * vScSize.z : (vScLocal.x + 0.5) * vScSize.x;
        float face = abs(vScNormal.x) > 0.5 ? sign(vScNormal.x) : 2.0 * sign(vScNormal.z);
        float up = vScLocal.y * vScSize.y;
        float fromTop = vScSize.y - up;
        // courses ~0.42 m high; in each, blocks 0.7–1.2 m long, the joints staggered course to course
        float course = floor(up / 0.42);
        float inCourse = fract(up / 0.42);
        float shift = scHash(vec2(course, face)) * 1.3;
        float blockLen = 0.75 + 0.4 * scHash(vec2(course, face + 7.0));
        float bx = (along + shift) / blockLen;
        float block = floor(bx);
        float inBlock = fract(bx);
        float tone = scHash(vec2(block, course + face * 31.0));
        vec3 stone = vec3(1.0) * (0.84 + 0.22 * tone) * vec3(1.0, 0.985 - 0.03 * tone, 0.96 - 0.05 * tone);
        // the tooled face of each block, a little rough
        stone *= 0.94 + 0.1 * scNoise(vec2(along, up) * 9.0 + tone * 13.0);
        // mortar: thin, set back, darker
        float jx = min(inBlock, 1.0 - inBlock) * blockLen;
        float jy = min(inCourse, 1.0 - inCourse) * 0.42;
        float joint = 1.0 - smoothstep(0.012, 0.03, min(jx, jy));
        stone *= mix(1.0, 0.68, joint);
        // windows (as before: 3.4 m bays, a storey every 3.1 m), framed in paler dressed stone
        float wx = fract(along / 3.4);
        float floorY = mod(fromTop, 3.1);
        float inWall = step(1.2, fromTop) * step(fromTop, vScSize.y - 0.6);
        float win = step(0.32, wx) * step(wx, 0.68) * step(0.9, floorY) * step(floorY, 2.2) * inWall;
        float frame = step(0.29, wx) * step(wx, 0.71) * step(0.78, floorY) * step(floorY, 2.32) * inWall * (1.0 - win);
        stone = mix(stone, vec3(1.08, 1.06, 1.0), frame);
        // the shutters: dark wood, a slat every 6 cm
        vec3 shutter = vec3(0.2, 0.17, 0.14) * (0.85 + 0.15 * step(0.5, fract(floorY / 0.06)));
        stone = mix(stone, shutter, win);
        // rain streaks under each sill
        float streak = step(0.36, wx) * step(wx, 0.64) * smoothstep(0.9, 0.2, floorY) * inWall * (0.5 + 0.5 * scNoise(vec2(along * 14.0, 0.5)));
        stone *= 1.0 - 0.12 * streak * (1.0 - win);
        // a darker plinth, and the dust and damp the ground leaves on the lowest course
        stone *= mix(0.8, 1.0, smoothstep(0.55, 0.62, up));
        stone *= mix(vec3(0.72, 0.66, 0.58), vec3(1.0), smoothstep(0.0, 1.1, up + 0.35 * scNoise(vec2(along * 3.0, 0.0))));
        diffuseColor.rgb *= stone;
      }`,
    );
  };
  return mat;
}

/** Terracotta tiles on the hip roof (a unit roof, ridge along z, scaled per instance). The instance colour is the tile's. */
export function tileRoofMaterial() {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });
  mat.customProgramCacheKey = () => 'planning-lab-roof-v2';
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${BOX_VARYINGS}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${BOX_VERT}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${BOX_VARYINGS}\n${NOISE}`).replace(
      '#include <map_fragment>',
      /* glsl */ `#include <map_fragment>
      {
        // the roof faces: the long sides look along ±x, the hips along ±z
        bool side = abs(vScNormal.x) > abs(vScNormal.z);
        float across = side ? vScLocal.z * vScSize.z : vScLocal.x * vScSize.x;
        float fromEave = side ? (0.5 - abs(vScLocal.x)) * vScSize.x : (0.5 - abs(vScLocal.z)) * vScSize.z;
        // rows of tiles 0.32 m up the slope, channels 0.24 m across
        float row = floor(fromEave / 0.32);
        float inRow = fract(fromEave / 0.32);
        float col = across / 0.24 + 0.5 * mod(row, 2.0);
        float tileId = scHash(vec2(floor(col), row + (side ? 0.0 : 50.0)));
        // each tile a half-cylinder: lit on its crown, shaded in the channels
        float barrel = 0.72 + 0.28 * sin(fract(col) * 3.14159);
        // the next row's lip throws a dark line
        float lip = mix(0.7, 1.0, smoothstep(0.0, 0.14, inRow));
        vec3 tile = vec3(1.0) * barrel * lip * (0.84 + 0.3 * tileId) * vec3(1.0, 0.96 + 0.06 * tileId, 0.94 + 0.08 * tileId);
        // weathered: darker, browner towards the eaves, a few lichen spots
        tile *= mix(0.78, 1.0, smoothstep(0.0, 1.6, fromEave));
        float lichen = smoothstep(0.72, 0.86, scNoise(vec2(across, fromEave) * 2.3));
        tile = mix(tile, vec3(0.95, 0.9, 0.62), lichen * 0.35);
        diffuseColor.rgb *= tile;
      }`,
    );
  };
  return mat;
}

/**
 * Concrete (the annex's flat roof, the tank's drum): stains in the mesh's own
 * metres; `streaks` runs rust and rain down the upright faces from the rim (the
 * mesh's top, `topM` above its origin) and darkens the underside.
 */
export function concreteMaterial(color: string, key: string, { streaks = false, topM = 0 }: { streaks?: boolean; topM?: number } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
  mat.customProgramCacheKey = () => `planning-lab-concrete-v2-${key}`;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vScL;\nvarying vec3 vScN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvScL = transformed * ${S.toFixed(1)};\nvScN = objectNormal;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vScL;\nvarying vec3 vScN;\n${NOISE}`).replace(
      '#include <map_fragment>',
      /* glsl */ `#include <map_fragment>
      {
        vec2 q = abs(vScN.y) > 0.5 ? vScL.xz : vec2(atan(vScN.x, vScN.z) * 2.4, vScL.y);
        float blot = scNoise(q * 0.9) * 0.6 + scNoise(q * 3.7) * 0.4;
        vec3 c = vec3(0.9 + 0.16 * blot);
        ${
          streaks
            ? `// rust and rain run down the sides from the rim; darker underneath and at the foot
        float run = scNoise(vec2(q.x * 7.0, 0.3)) * smoothstep(2.6, 0.0, ${topM.toFixed(2)} - vScL.y);
        c *= mix(vec3(1.0), vec3(0.78, 0.68, 0.58), smoothstep(0.55, 0.85, run) * 0.7);
        c *= mix(0.72, 1.0, smoothstep(-0.2, 0.6, vScN.y + 0.4));
        c *= mix(0.82, 1.0, smoothstep(0.0, 0.5, vScL.y + ${topM.toFixed(2)}));`
            : ''
        }
        diffuseColor.rgb *= c;
      }`,
    );
  };
  return mat;
}

/**
 * The stream's water: dark and a little turbid, rippled along its course, the
 * sky mirrored at a glancing angle; `aAcross` (0 on one bank, 1 on the other)
 * fades its edges into the wet bank, so it lies in its bed, not on it.
 */
export function waterMaterial(sky: THREE.Color) {
  const mat = new THREE.MeshStandardMaterial({ color: '#29332D', roughness: 0.22, metalness: 0, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const uniforms = { uSkyRefl: { value: sky } };
  mat.customProgramCacheKey = () => 'planning-lab-water-v3';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAcross;\nvarying float vAcross;\nvarying vec3 vScW;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvAcross = aAcross;\nvScW = (modelMatrix * vec4(transformed, 1.0)).xyz * ${S.toFixed(1)};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec3 uSkyRefl;\nvarying float vAcross;\nvarying vec3 vScW;\n${NOISE}`)
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        {
          // ripples: two noises drifting apart, as a gradient on the level surface
          vec2 q = vScW.xz;
          float e = 0.35;
          float h0 = scNoise(q * 1.7) + 0.5 * scNoise(q * 4.3 + 7.0);
          float hx = scNoise((q + vec2(e, 0.0)) * 1.7) + 0.5 * scNoise((q + vec2(e, 0.0)) * 4.3 + 7.0);
          float hz = scNoise((q + vec2(0.0, e)) * 1.7) + 0.5 * scNoise((q + vec2(0.0, e)) * 4.3 + 7.0);
          vec3 nw = normalize(vec3(-(hx - h0) * 0.22, 1.0, -(hz - h0) * 0.22));
          normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `{
          // Schlick, in view space (vViewPosition runs from the surface to the eye)
          float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 5.0);
          // dark, a little turbid; it mirrors the sky in patches as the ripples tilt — brighter where they face
          // the eye, darker in the still pools — so from any height it reads as moving water
          float sheen = scNoise(vScW.xz * vec2(0.9, 0.35)) * 0.6 + scNoise(vScW.xz * 2.1 + 5.0) * 0.4;
          outgoingLight = mix(outgoingLight, uSkyRefl * (0.62 + 0.5 * sheen), clamp(fres * 0.8 + 0.16 + 0.22 * smoothstep(0.55, 0.85, sheen), 0.0, 0.62));
          // a ragged waterline: wider in the pools, narrow over the riffles, never a ruled edge
          float along = scNoise(vScW.xz * 0.11) * 0.7 + scNoise(vScW.xz * 0.45 + 3.0) * 0.3;
          float edge = min(vAcross, 1.0 - vAcross) - (0.62 - along) * 0.32;
          diffuseColor.a = smoothstep(0.0, 0.16, edge) * 0.94;
        }
        #include <opaque_fragment>`,
      );
  };
  return mat;
}

/** The sky photograph's sun sits at u = 0.588 of its width (see public/assets/lessons/topic06/planning-lab/ATTRIBUTIONS.md). */
const SKY_SUN_U = 0.588;

/** The sky dome: the photograph above, the haze (the fog's own colour) towards and below the horizon. */
export function skyMaterial(texture: THREE.Texture, sunAzDeg: number, haze: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: { uSky: { value: texture }, uOffset: { value: SKY_SUN_U - sunAzDeg / 360 }, uHaze: { value: haze }, uExposure: { value: 1.08 } },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSky;
      uniform float uOffset;
      uniform vec3 uHaze;
      uniform float uExposure;
      varying vec3 vDir;
      #include <common>
      void main() {
        vec3 d = normalize(vDir);
        float az = atan(d.x, -d.z);
        float u = fract(az / (2.0 * PI) + uOffset);
        float el = asin(clamp(d.y, -1.0, 1.0));
        float vImg = (0.5 - el / PI) / 0.625;
        vec3 c = texture2D(uSky, vec2(u, 1.0 - clamp(vImg, 0.0, 0.995))).rgb * uExposure;
        // haze over the horizon, the colour the fog gives the far ground
        c = mix(c, uHaze, smoothstep(0.16, -0.01, d.y));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
