import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Tree } from './planningLabTerrain';
import { WORLD3D } from './planningLabView';

/**
 * Trees, maquis and rocks of the planning lab's model — the shapes and the
 * shading; where each one stands is planningLabTerrain's (trees(), shrubs(),
 * boulders()), unchanged.
 *
 *   crowns   several shapes per kind, built from many small lobes so no two
 *            silhouettes repeat: the Aleppo pine an open, flat-topped umbrella
 *            of clumps; the oak a dense rounded dome; the olive a low, ragged
 *            silvery crown. Each instance is a unit crown scaled to its own
 *            radius and height.
 *   foliage  the leaf clumps drawn by the shader: a 3-D cell pattern over the
 *            crown in metres — each clump a little sphere of its own shade,
 *            turned to the sun on its own, dark gaps between them — fading to
 *            the crown's plain shading once a clump is under a pixel. With
 *            distance the albedo pales a little toward the haze, and small
 *            cover shrinks into the ground, whose own scrub tone carries it.
 *   rocks    scanned rocks (the lab's copy of the replay's rocks.glb), graded
 *            pale, dusted on their upper faces; the small ones shrink away far off.
 */

const S = WORLD3D.metresPerUnit;
const u = (m: number) => (m / S).toFixed(4);

/** A seeded 0…1 generator. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** A lobe: centre x, y, z, radius, and how flat it is (its height over its width, 1 = round). */
type Lobe = [number, number, number, number] | [number, number, number, number, number];

/**
 * Lobes merged into one clump: icospheres, flattened per lobe, jittered along their normals. Each lobe
 * shades as its own rounded tuft, bent partly towards the clump's centre so the whole reads as one
 * mass (`bend`); a baked self-shade in the vertex colours — darker underneath and inside — and each
 * lobe a shade of its own.
 */
export function clumpGeometry(seed: number, lobes: Lobe[], detail: number, jitter: number, bend = 0.45) {
  const rand = rng(seed);
  const parts = lobes.map(([x, y, z, r, sy = 1]) => new THREE.IcosahedronGeometry(r, detail).scale(1, sy, 1).translate(x, y, z));
  const counts = parts.map((g) => g.getAttribute('position').count);
  const geo = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const nrm = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const o = new THREE.Vector3();
  let lobe = 0;
  let left = counts[0];
  let lobeShade = 0.9 + rand() * 0.16;
  for (let i = 0; i < pos.count; i++) {
    if (left-- <= 0) {
      lobe++;
      left = counts[lobe] - 1;
      lobeShade = 0.88 + rand() * 0.2;
    }
    const [x, y, z, r, sy = 1] = lobes[lobe];
    v.fromBufferAttribute(pos, i);
    // the lobe's own outward direction (its flattening undone), jittered
    n.set((v.x - x) / r, (v.y - y) / (r * sy), (v.z - z) / r).normalize();
    v.addScaledVector(n, (rand() - 0.5) * jitter * r);
    pos.setXYZ(i, v.x, v.y, v.z);
    o.copy(v).normalize();
    n.lerp(o, bend).normalize();
    nrm.set([n.x, n.y, n.z], i * 3);
    const radial = THREE.MathUtils.smoothstep(v.length(), 0.3, 0.95);
    const ao = THREE.MathUtils.lerp(0.42, 1, THREE.MathUtils.smoothstep(v.y, -0.85, 0.8)) * THREE.MathUtils.lerp(0.68, 1, radial) * lobeShade;
    colors.set([ao, ao, ao], i * 3);
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * A unit crown (−1…1 across and up — the envelope crownShape() gives, which the map's tree symbol
 * draws) for one tree kind and variant. The lobes fill that envelope, so the crowns of the grove meet
 * as a canopy, as they do in a planted pine wood.
 *   pine   Aleppo pine: an irregular, flat-topped umbrella of tufts, a broken lower tier, a few
 *          branch tufts under it, the whole leaning a little one way
 *   oak    kermes oak: a dense dome of rounded clumps that comes down low round the trunk
 *   olive  a low, ragged, open crown
 */
export function crownGeometry(kind: Tree['kind'], variant: number) {
  const rand = rng(0x9e3779b9 ^ (variant * 0x85ebca6b) ^ (kind === 'pine' ? 0x1111 : kind === 'oak' ? 0x2222 : 0x3333));
  const lobes: Lobe[] = [];
  if (kind === 'pine') {
    const lean = rand() * Math.PI * 2;
    const lx = Math.cos(lean) * 0.07;
    const lz = Math.sin(lean) * 0.07;
    lobes.push([lx, 0.62, lz, 0.44, 0.78]);
    const n = 7 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.5;
      const d = 0.4 + rand() * 0.26;
      const r = 0.3 + rand() * 0.1;
      lobes.push([Math.cos(a) * d + lx, 0.36 + rand() * 0.2 - d * 0.1, Math.sin(a) * d + lz, r, 0.72 + rand() * 0.14]);
    }
    const m = 4 + Math.floor(rand() * 3);
    for (let k = 0; k < m; k++) {
      const a = rand() * Math.PI * 2;
      const d = 0.42 + rand() * 0.28;
      lobes.push([Math.cos(a) * d, -0.12 + rand() * 0.22, Math.sin(a) * d, 0.24 + rand() * 0.09, 0.78]);
    }
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const d = 0.2 + rand() * 0.28;
      lobes.push([Math.cos(a) * d, -0.55 + rand() * 0.16, Math.sin(a) * d, 0.17 + rand() * 0.06, 0.8]);
    }
    return clumpGeometry(0x2f1ac81d ^ (variant * 977) ^ lobes.length, lobes, 1, 0.1, 0.35);
  }
  if (kind === 'oak') {
    lobes.push([0, 0.08, 0, 0.6, 0.92]);
    const n = 10 + Math.floor(rand() * 2);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.45;
      const y = -0.42 + rand() * 0.8;
      const d = (0.5 + rand() * 0.16) * (1 - Math.max(0, y) * 0.4);
      lobes.push([Math.cos(a) * d, y, Math.sin(a) * d, 0.31 + rand() * 0.11, 0.86]);
    }
    lobes.push([(rand() - 0.5) * 0.3, 0.56, (rand() - 0.5) * 0.3, 0.36, 0.82]);
    return clumpGeometry(0x2f1ac81d ^ (variant * 977) ^ lobes.length, lobes, 1, 0.1, 0.4);
  }
  lobes.push([0, -0.1, 0, 0.45]);
  const n = 8 + Math.floor(rand() * 3);
  for (let k = 0; k < n; k++) {
    const a = rand() * Math.PI * 2;
    const d = 0.4 + rand() * 0.38;
    lobes.push([Math.cos(a) * d, rand() * 0.75 - 0.3, Math.sin(a) * d, 0.24 + rand() * 0.16]);
  }
  return clumpGeometry(0x2f1ac81d ^ (variant * 977) ^ lobes.length, lobes, 1, 0.07);
}

/**
 * A unit maquis clump (base at y = 0, up to 1 tall, ~1 in radius — the listed footprint): two or three
 * bushes of different sizes side by side, each a rounded mound a little sunk into the ground, so a
 * listed shrub of several metres reads as a thicket of separate bushes, not one dome. ~80 triangles
 * a bush.
 */
export function shrubGeometry(variant: number) {
  const rand = rng(0x510e527f ^ (variant * 0x27d4eb2f));
  const n = 2 + (variant % 2);
  const parts: THREE.BufferGeometry[] = [];
  const turn = rand() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.9;
    const d = k === 0 ? 0.12 + rand() * 0.12 : 0.36 + rand() * 0.2;
    const r = k === 0 ? 0.56 + rand() * 0.1 : 0.36 + rand() * 0.14;
    const h = (k === 0 ? 0.88 : 0.55 + rand() * 0.3) / 2;
    const g = clumpGeometry(0x6c8e9cf5 ^ (variant * 131) ^ (k * 7919), [[0, 0, 0, 1, 1]], 1, 0.22, 0.2);
    g.scale(r, h, r).translate(Math.cos(a) * d, h * 0.72, Math.sin(a) * d);
    parts.push(g);
  }
  const geo = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  geo.computeBoundingSphere();
  return geo;
}

/** Lifts a clump's baked self-shade (its vertex colours) to `floor`, so a crown keeps its round form without going black. */
export function liftShade<G extends THREE.BufferGeometry>(geo: G, floor: number): G {
  const col = geo.getAttribute('color');
  for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) col.setComponent(i, c, floor + (1 - floor) * col.getComponent(i, c));
  col.needsUpdate = true;
  return geo;
}

/**
 * A unit trunk (base at y = 0, top at 1, radius 1 at the root flare): a tapered, slightly bent
 * octagonal stem, its root flare wider; the instance scales it to the tree.
 */
export function trunkGeometry(variant: number) {
  const rand = rng(0x3c6ef372 ^ (variant * 0x1b873593));
  const g = new THREE.CylinderGeometry(0.45, 1, 1, 8, 6, true).translate(0, 0.5, 0);
  const p = g.getAttribute('position');
  const bx = (rand() - 0.5) * 0.9;
  const bz = (rand() - 0.5) * 0.9;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    // the root flare, and a gentle bend
    const flare = 1 + 0.35 * Math.max(0, 1 - y / 0.08);
    p.setXYZ(i, p.getX(i) * flare + bx * y * y, y, p.getZ(i) * flare + bz * y * y);
  }
  g.computeVertexNormals();
  return g;
}

const DISTANCE_VERT = (paleM: [number, number], shrinkM?: [number, number], keepAboveM = Infinity) => /* glsl */ `
  #ifdef USE_INSTANCING
    float coverD = distance((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, cameraPosition);
  #else
    float coverD = distance((modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, cameraPosition);
  #endif
  vCoverFar = smoothstep(${u(paleM[0])}, ${u(paleM[1])}, coverD);${
    shrinkM
      ? `
  #ifdef USE_INSTANCING
    float coverSmall = ${Number.isFinite(keepAboveM) ? `1.0 - step(${u(keepAboveM)}, length(instanceMatrix[0].xyz))` : '1.0'};
    transformed *= 1.0 - coverSmall * smoothstep(${u(shrinkM[0])}, ${u(shrinkM[1])}, coverD);
  #endif`
      : ''
  }`;

const CLUMPS_GLSL = /* glsl */ `
varying vec3 vLeafP;
varying vec3 vLeafSeed;
varying float vCoverFar;
float lfF1;
vec3 lfOff;
float lfId;
vec3 lfHash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
// the nearest clump centre of a jittered 3-D lattice: distance, offset out of the clump, the clump's own
// number. Each centre stays in the middle half of its cell, so the nearest is among the 2 × 2 × 2 cells
// around p — 8 lookups instead of 27.
void lfClumps(vec3 p) {
  vec3 i = floor(p - 0.5);
  lfF1 = 8.0;
  for (int z = 0; z <= 1; z++)
    for (int y = 0; y <= 1; y++)
      for (int x = 0; x <= 1; x++) {
        vec3 g = i + vec3(float(x), float(y), float(z));
        vec3 h = lfHash3(g);
        vec3 r = g + 0.25 + h * 0.5 - p;
        float d = dot(r, r);
        if (d < lfF1) {
          lfF1 = d;
          lfOff = -r;
          lfId = h.y;
        }
      }
  lfF1 = sqrt(lfF1);
}
`;

/**
 * Foliage (and its fallback, a plain clump): vertex colours carry the crown's
 * baked shade, the instance colour its tone. `clumpM` is the leaf clumps' size.
 */
export function foliageMaterial(key: string, { clumpM, paleM = [700, 2600], pale = 0.28, shrinkM, keepAboveM, gap = 0.5, translucent = 0.06 }: { clumpM: number; paleM?: [number, number]; pale?: number; shrinkM?: [number, number]; keepAboveM?: number; gap?: number; translucent?: number }) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
  mat.customProgramCacheKey = () => `planning-lab-foliage-v2-${key}`;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLeafP;\nvarying vec3 vLeafSeed;\nvarying float vCoverFar;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      #ifdef USE_INSTANCING
        // metres from the crown's own origin, turned with it; the origin seeds its clumps
        vLeafP = mat3(instanceMatrix) * transformed * ${S.toFixed(1)};
        vLeafSeed = instanceMatrix[3].xyz * ${S.toFixed(1)};
      #else
        vLeafP = transformed * ${S.toFixed(1)};
        vLeafSeed = vec3(0.0);
      #endif
      ${DISTANCE_VERT(paleM, shrinkM, keepAboveM)}`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CLUMPS_GLSL}`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        lfClumps(vLeafP / ${clumpM.toFixed(2)} + vLeafSeed * 0.37);
        // 1 while a clump covers a few pixels, 0 once it is under one
        float lfNear = 1.0 - smoothstep(0.3, 0.9, length(fwidth(vLeafP)) / ${clumpM.toFixed(2)});
        float lfGap = smoothstep(0.3, 0.88, lfF1);
        diffuseColor.rgb *= mix(1.0 - ${(gap * 0.3).toFixed(3)}, (1.0 - ${gap.toFixed(2)} * lfGap) * (0.86 + 0.28 * lfId), lfNear);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.22, 0.16), vCoverFar * ${pale.toFixed(2)});`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        // each clump turns to the light on its own
        normal = normalize(mix(normal, normalize((viewMatrix * vec4(normalize(lfOff), 0.0)).xyz), 0.42 * lfNear));`,
      )
      .replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
        // a little light through the leaves
        reflectedLight.indirectDiffuse += diffuseColor.rgb * ${translucent.toFixed(3)};`,
      );
  };
  return mat;
}

/**
 * A scanned rock's material: graded to the pale local limestone (the scans are
 * from other lands), a little dust and dry lichen on its upper faces; small
 * rocks shrink away in the distance like the maquis. The instance colour
 * multiplies the result (the highlight).
 */
export function rockMaterial(src: THREE.MeshStandardMaterial, key: string, { shrinkM, keepAboveM }: { shrinkM?: [number, number]; keepAboveM?: number }) {
  const m = src.clone();
  m.metalness = 0;
  m.envMapIntensity = 0;
  m.customProgramCacheKey = () => `planning-lab-rock-v2-${key}`;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vUpN;\nvarying float vCoverFar;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      {
        vec3 n = objectNormal;
        #ifdef USE_INSTANCING
          n = mat3(instanceMatrix) * n;
        #endif
        vUpN = normalize(n);
      }
      ${DISTANCE_VERT([900, 2600], shrinkM, keepAboveM)}`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vUpN;\nvarying float vCoverFar;')
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
        {
          // limestone: lifted and desaturated (moss and red sandstone → pale grey), the scan's detail kept
          float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
          diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.12) * vec3(1.42, 1.39, 1.3) + 0.02;
          float up = smoothstep(0.35, 0.95, normalize(vUpN).y);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.38, 0.3), up * 0.25);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.35, 0.3), vCoverFar * 0.15);
        }`,
      );
  };
  return m;
}
