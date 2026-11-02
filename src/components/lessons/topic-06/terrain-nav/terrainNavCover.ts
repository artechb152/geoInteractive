import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WORLD3D } from './terrainNavGeometry';
import type { Tree } from './terrainNavTerrain';
import { addLight } from './terrainNavAir';

/**
 * Materials and small geometry of the cover in the terrain-association model
 * (the trees and shrubs are terrainNavTrees', the grass terrainNavGrass'). Only
 * the look is made here — every instance is placed by TerrainNav3D from the
 * same lists the map draws, so nothing moves and nothing grows into a new
 * landmark.
 *
 *   rocks    the scanned stones as weathered, pitted limestone
 *   houses   walls of dressed stone or plaster with a darker plinth, framed
 *            windows (glass, curtains, shutters), sills and doors; flat roofs
 *            with a parapet and the odd solar heater; tiled hip roofs (photo
 *            scans, see ATTRIBUTIONS.md)
 *   tower    the water tower's cast concrete and its steel
 */

const S = WORLD3D.metresPerUnit;

const NOISE3 = /* glsl */ `
  float fo3Hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float fo3Noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(fo3Hash(i), fo3Hash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(fo3Hash(i + vec3(0.0, 1.0, 0.0)), fo3Hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(fo3Hash(i + vec3(0.0, 0.0, 1.0)), fo3Hash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(fo3Hash(i + vec3(0.0, 1.0, 1.0)), fo3Hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }
  // Bump mapping from a height in view units, by screen derivatives (no tangents needed).
  vec3 foBump(vec3 pos, vec3 n, float h) {
    vec3 dpdx = dFdx(pos);
    vec3 dpdy = dFdy(pos);
    vec3 r1 = cross(dpdy, n);
    vec3 r2 = cross(n, dpdx);
    float det = dot(dpdx, r1);
    vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
    return normalize(abs(det) * n - grad);
  }
`;

// ---------------------------------------------------------------- crowns

/** Crown tones (sRGB): the dark green of Aleppo and stone pine, the greens of oak and carob, grey-green olive. */
export const CROWN2: Record<Tree['kind'], [THREE.Color, THREE.Color]> = {
  pine: [new THREE.Color('#29391F'), new THREE.Color('#3F5530')],
  oak: [new THREE.Color('#36481E'), new THREE.Color('#5A6C2E')],
  olive: [new THREE.Color('#5B6748'), new THREE.Color('#7E8866')],
};

// ---------------------------------------------------------------- rocks

/**
 * A scanned stone's material (Poly Haven Sand Rocks Small 01, shared with the
 * dead-reckoning scene) graded to the grey-white limestone of these hills, with
 * soil and lichen settled on the faces that look up (the ground's contact shade
 * darkens its foot).
 */
export function limestoneMaterial(src: THREE.MeshStandardMaterial, key: string) {
  const m = src.clone();
  m.metalness = 0;
  m.roughness = 1;
  m.envMapIntensity = 0;
  m.customProgramCacheKey = () => `tn-limestone-${key}`;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLsUp;\nvarying float vLsY;\nvarying vec3 vLsP;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
        {
          vec3 n = objectNormal;
          #ifdef USE_INSTANCING
            n = mat3(instanceMatrix) * n;
          #endif
          vLsUp = normalize(mat3(modelMatrix) * n);
          vLsY = position.y;
          vLsP = position;
        }`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLsUp;\nvarying float vLsY;\nvarying vec3 vLsP;\n${NOISE3}\nfloat lsPit;\nfloat lsGrain;`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
        {
          float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          // weathered grey limestone (an albedo of ~0.3–0.4), keeping the scan's own light and dark
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum) * vec3(1.1, 1.05, 0.96) * 1.25, 0.8);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          float up = smoothstep(0.35, 0.95, normalize(vLsUp).y);
          float lichen = smoothstep(0.55, 0.75, fo3Noise(vLsP * 9.0) * 0.6 + fo3Noise(vLsP * 31.0) * 0.4);
          // soil and dust settled on the faces that look up, dark lichen in blotches
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.17, 0.12), up * 0.3);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.12, 0.1), lichen * 0.35);
          // karst limestone: dissolution pits and fine grain, paler and darker patches of weathering
          lsPit = smoothstep(0.62, 0.8, fo3Noise(vLsP * 23.0) * 0.7 + fo3Noise(vLsP * 61.0) * 0.3);
          lsGrain = fo3Noise(vLsP * 9.0) * 0.5 + fo3Noise(vLsP * 27.0) * 0.3 + fo3Noise(vLsP * 83.0) * 0.2;
          diffuseColor.rgb *= (0.8 + 0.34 * lsGrain) * (1.0 - 0.35 * lsPit);
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        normal = foBump(-vViewPosition, normal, (lsGrain - lsPit * 0.6) * ${(0.02 / S).toFixed(6)});`,
      );
    addLight(shader);
  };
  return m;
}

// ---------------------------------------------------------------- village

/**
 * Plaster walls: the scan's plaster (metric UVs from the box's own size), a
 * darker plinth and rain streaks, two floors of recessed windows with pale
 * sills on every face, a door on the ground floor of the long faces.
 */
export function plasterWallMaterial(albedo: THREE.Texture, normal: THREE.Texture) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  mat.customProgramCacheKey = () => 'tn-walls';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPlA = { value: albedo };
    shader.uniforms.uPlN = { value: normal };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHLocal;\nvarying vec3 vHSize;\nvarying vec3 vHNormal;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
        vHLocal = position;
        vHNormal = normal;
        #ifdef USE_INSTANCING
          vHSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)) * ${S.toFixed(1)};
        #else
          vHSize = vec3(1.0);
        #endif`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vHLocal;\nvarying vec3 vHSize;\nvarying vec3 vHNormal;\nuniform sampler2D uPlA, uPlN;\n${NOISE3}\nfloat whWin;\nfloat whJoint;\nfloat whGlass;\nvec2 whUv;`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        {
          bool side = abs(vHNormal.y) < 0.5;
          bool alongZ = abs(vHNormal.x) > 0.5;
          float along = alongZ ? (vHLocal.z + 0.5) * vHSize.z : (vHLocal.x + 0.5) * vHSize.x;
          float up = vHLocal.y * vHSize.y;
          whUv = side ? vec2(along, up) / 2.0 : (vHLocal.xz + 0.5) * vHSize.xz / 2.0;
          vec3 pl = texture2D(uPlA, whUv).rgb;
          float plL = dot(pl, vec3(0.2126, 0.7152, 0.0722));
          // a house of dressed stone or of plaster (picked by its own size: the shared list carries no material)
          float hs = fract(sin(dot(vHSize.xz, vec2(12.9898, 78.233))) * 43758.5453);
          whWin = 0.0;
          whJoint = 0.0;
          whGlass = 0.0;
          if (hs > 0.45 && side) {
            // courses of 0.32 m, blocks of ~0.7 m staggered course to course, each block its own shade
            float course = floor(up / 0.32);
            float bl = along / 0.72 + fract(course * 0.618);
            float bi = floor(bl);
            float bx = fract(bl);
            float by = fract(up / 0.32);
            float dj = min(min(bx, 1.0 - bx) * 0.72, min(by, 1.0 - by) * 0.32);
            whJoint = 1.0 - smoothstep(0.004, 0.02, dj);
            float shade = fract(sin(dot(vec2(bi, course), vec2(27.1, 61.7))) * 43758.5);
            diffuseColor.rgb *= mix(0.84, 1.08, shade) * vec3(1.03, 1.0, 0.9) * (0.9 + 0.2 * plL);
            diffuseColor.rgb *= 1.0 - 0.3 * whJoint;
          } else {
            diffuseColor.rgb *= mix(vec3(1.0), pl / max(plL, 1e-3), 0.25) * (0.82 + 0.36 * plL);
          }
          if (side) {
            float fromTop = vHSize.y - up;
            float span = alongZ ? vHSize.z : vHSize.x;
            // the plinth and the dust splashed up from the ground; streaks from the roof
            diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(0.35, 0.75, up));
            diffuseColor.rgb *= 1.0 - 0.12 * smoothstep(0.55, 0.9, fo3Noise(vec3(along * 1.7, up * 0.12, vHSize.x))) * smoothstep(0.0, 1.6, fromTop + 0.4);
            // windows: one per 3.4 m bay, two floors (no openings on the gables of narrow houses)
            float bay = fract(along / 3.4);
            float bayI = floor(along / 3.4);
            float floorY = mod(fromTop, 3.1);
            float floorI = floor(fromTop / 3.1);
            float rowOk = step(1.2, fromTop) * step(fromTop, vHSize.y - 0.6) * step(4.0, span);
            float inX = step(0.32, bay) * step(bay, 0.68);
            float inY = step(0.9, floorY) * step(floorY, 2.2) * rowOk;
            float win = inX * inY;
            float sill = step(0.29, bay) * step(bay, 0.71) * step(2.2, floorY) * step(floorY, 2.34) * rowOk;
            // a door in the middle bay of the long faces, ground floor
            float mid = abs(along - span * 0.5);
            float lowest = floor((vHSize.y - 1.0) / 3.1);
            float door = (alongZ ? 1.0 : 0.0) * step(mid, 0.55) * step(9.0, span) * step(lowest, floorI) * step(0.9, floorY);
            win *= 1.0 - door;
            float wh = fract(sin(dot(vec3(bayI, floorI, hs * 17.0), vec3(12.9, 78.2, 37.7))) * 43758.5);
            // the window: a frame (aluminium or wood), the glass — the sky in its upper part, the dark room
            // below, a curtain in some — and its reveal, the top and one side of the opening in shade
            vec2 w = vec2((bay - 0.5) / 0.18, (floorY - 1.55) / 0.65);
            float frame = win * step(0.84, max(abs(w.x), abs(w.y)) + step(abs(w.x), 0.05) * 0.2);
            float glass = win * (1.0 - frame);
            vec3 g = mix(vec3(0.03, 0.035, 0.04), vec3(0.15, 0.19, 0.24), smoothstep(-0.5, 0.95, -w.y) * 0.85);
            g = mix(g, vec3(0.3, 0.27, 0.22), step(0.74, wh) * smoothstep(0.25, 0.65, abs(w.x)) * 0.7);
            g *= 1.0 - 0.5 * clamp(smoothstep(0.5, 0.78, -w.y) + smoothstep(0.55, 0.8, -w.x) * 0.6, 0.0, 1.0);
            vec3 frameCol = wh < 0.55 ? vec3(0.58, 0.57, 0.53) : vec3(0.26, 0.17, 0.1);
            // shutters folded back beside some windows (green, brown or blue-grey slats)
            float shX = step(0.155, bay) * step(bay, 0.31) + step(0.69, bay) * step(bay, 0.845);
            float shut = shX * inY * step(0.58, wh) * (1.0 - door);
            vec3 shCol = (wh > 0.86 ? vec3(0.07, 0.13, 0.08) : wh > 0.72 ? vec3(0.16, 0.1, 0.055) : vec3(0.11, 0.14, 0.16)) * (0.91 + 0.09 * sin(floorY * 69.0) * (1.0 - smoothstep(0.03, 0.09, fwidth(floorY))));
            diffuseColor.rgb = mix(diffuseColor.rgb, shCol, shut);
            diffuseColor.rgb = mix(diffuseColor.rgb, g, glass);
            diffuseColor.rgb = mix(diffuseColor.rgb, frameCol, frame);
            // the door: panels of painted metal or wood in a frame
            vec2 dd = vec2((along - span * 0.5) / 0.55, (floorY - 0.9) / 2.2);
            float dFrame = door * step(0.88, abs(dd.x));
            float dPanel = door * (1.0 - dFrame);
            vec3 doorCol = (wh > 0.5 ? vec3(0.09, 0.13, 0.16) : vec3(0.2, 0.12, 0.06)) * (0.85 + 0.15 * step(0.08, abs(fract(dd.y * 3.0) - 0.5)));
            diffuseColor.rgb = mix(diffuseColor.rgb, doorCol, dPanel);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.43, 0.39), dFrame);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.7, 0.67, 0.6), sill * (1.0 - win));
            whWin = max(win, door);
            whGlass = glass;
            // corners a touch darker
            float edge = min(along, span - along);
            diffuseColor.rgb *= mix(0.86, 1.0, smoothstep(0.0, 0.5, edge));
          }
        }`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.92, 0.12, whGlass);')
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        {
          vec2 pn = texture2D(uPlN, whUv).rg * 2.0 - 1.0;
          normal = foBump(-vViewPosition, normal, (pn.x + pn.y) * ${(0.004 / S).toFixed(6)} - whWin * ${(0.12 / S).toFixed(5)} - whJoint * ${(0.012 / S).toFixed(6)});
        }`,
      );
    addLight(shader);
  };
  return mat;
}

/** Tiled hip roofs: the scan's ceramic tiles in courses running down the slope, a shade of moss and dust. */
export function tileRoofMaterial(albedo: THREE.Texture, normal: THREE.Texture) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0 });
  mat.customProgramCacheKey = () => 'tn-tiles';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRfA = { value: albedo };
    shader.uniforms.uRfN = { value: normal };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRfP;\nvarying vec3 vRfN;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
        {
          vec4 wp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          vRfP = (modelMatrix * wp).xyz * ${S.toFixed(1)};
          vec3 n = objectNormal;
          #ifdef USE_INSTANCING
            n = mat3(instanceMatrix) * n;
          #endif
          vRfN = normalize(mat3(modelMatrix) * n);
        }`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vRfP;\nvarying vec3 vRfN;\nuniform sampler2D uRfA, uRfN;\n${NOISE3}\nvec2 rfUv;`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        {
          // tile courses run down the slope: u across it, v along the fall line
          vec3 n = normalize(vRfN);
          vec2 fall = normalize(n.xz + vec2(1e-4));
          vec2 across = vec2(-fall.y, fall.x);
          rfUv = vec2(dot(vRfP.xz, across), dot(vRfP.xz, fall) / max(n.y, 0.3)) / 3.5;
          vec3 t = texture2D(uRfA, rfUv).rgb;
          float tl = dot(t, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb *= mix(vec3(1.0), t / max(tl, 1e-3), 0.35) * (0.62 + 0.9 * tl);
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        {
          vec2 tn = texture2D(uRfN, rfUv).rg * 2.0 - 1.0;
          normal = foBump(-vViewPosition, normal, (tn.y * 0.7 + tn.x * 0.3) * ${(0.03 / S).toFixed(5)});
        }`,
      );
    addLight(shader);
  };
  return mat;
}

/** A flat roof's parapet: a rim 0.3 m thick round a unit footprint (scaled per house), its top at y = 1. */
export function parapetGeometry() {
  const t = 0.035;
  const parts = [
    new THREE.BoxGeometry(1, 1, t).translate(0, 0.5, 0.5 - t / 2),
    new THREE.BoxGeometry(1, 1, t).translate(0, 0.5, -0.5 + t / 2),
    new THREE.BoxGeometry(t, 1, 1 - 2 * t).translate(0.5 - t / 2, 0.5, 0),
    new THREE.BoxGeometry(t, 1, 1 - 2 * t).translate(-0.5 + t / 2, 0.5, 0),
  ];
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

/** A rooftop solar water heater, in metres: a panel tilted to the south (+z) and the white tank above its north edge (base at y = 0). */
export function solarHeaterGeometry() {
  const panel = new THREE.BoxGeometry(1.0, 0.06, 1.9).rotateX(0.75).translate(0, 0.62, 0.05);
  const legs = new THREE.BoxGeometry(0.9, 0.5, 0.06).translate(0, 0.25, -0.6);
  const tank = new THREE.CylinderGeometry(0.28, 0.28, 1.1, 10).rotateZ(Math.PI / 2).translate(0, 1.25, -0.62);
  const colour = (g: THREE.BufferGeometry, c: number) => g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.getAttribute('position').count * 3).fill(c), 3));
  colour(panel, 0.12);
  colour(legs, 0.45);
  colour(tank, 0.92);
  const g = mergeGeometries([panel.toNonIndexed(), legs.toNonIndexed(), tank.toNonIndexed()]);
  [panel, legs, tank].forEach((p) => p.dispose());
  return g;
}

/**
 * Cast concrete (the water tower): light grey, the lines of the formwork lifts every 1.2 m, rain streaks
 * running down from the ledges, a darker, splashed foot. `base`: the tower's foot (world units).
 */
export function concreteMaterial(base: THREE.Vector3, key: string) {
  const mat = new THREE.MeshStandardMaterial({ color: '#BDB9AF', roughness: 0.9, metalness: 0 });
  mat.customProgramCacheKey = () => `tn-concrete-${key}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCcBase = { value: base };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uCcBase;\nvarying vec3 vCcP;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvCcP = ((modelMatrix * vec4(transformed, 1.0)).xyz - uCcBase) * ${S.toFixed(1)};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vCcP;\n${NOISE3}\nfloat ccLift;`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          float ang = atan(vCcP.z, vCcP.x);
          float h = vCcP.y;
          ccLift = smoothstep(0.465, 0.49, abs(fract(h / 1.2) - 0.5));
          float streak = fo3Noise(vec3(ang * 7.0, h * 0.05, 3.1)) * 0.6 + fo3Noise(vec3(ang * 23.0, h * 0.2, 1.7)) * 0.4;
          diffuseColor.rgb *= 1.0 - 0.24 * smoothstep(0.55, 0.85, streak) - 0.1 * ccLift;
          diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(0.0, 2.5, h));
          diffuseColor.rgb *= 0.9 + 0.14 * fo3Noise(vCcP * 3.1);
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\nnormal = foBump(-vViewPosition, normal, -ccLift * ${(0.012 / S).toFixed(6)} + fo3Noise(vCcP * 9.0) * ${(0.002 / S).toFixed(6)});`,
      );
    addLight(shader);
  };
  return mat;
}

/** The tower's steel (metres, base at its foot): the ladder up the shaft's south side, the railing round the tank's roof, the down-pipe. */
export function towerSteelGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  // ladder: two rails standing off the shaft, a rung every 30 cm
  for (const x of [-0.22, 0.22]) parts.push(new THREE.BoxGeometry(0.05, 16.6, 0.05).translate(x, 8.3, 2.05));
  for (let y = 0.4; y < 16.4; y += 0.3) parts.push(new THREE.BoxGeometry(0.44, 0.03, 0.03).translate(0, y, 2.05));
  // the railing round the tank's roof edge
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    parts.push(new THREE.BoxGeometry(0.045, 1.0, 0.045).translate(Math.cos(a) * 4.45, 22.75, Math.sin(a) * 4.45));
  }
  parts.push(new THREE.TorusGeometry(4.45, 0.035, 5, 64).rotateX(Math.PI / 2).translate(0, 23.25, 0));
  parts.push(new THREE.TorusGeometry(4.45, 0.025, 5, 64).rotateX(Math.PI / 2).translate(0, 22.75, 0));
  // the down-pipe on the north side
  parts.push(new THREE.CylinderGeometry(0.11, 0.11, 16.4, 8).translate(0, 8.2, -1.95));
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  return g;
}
