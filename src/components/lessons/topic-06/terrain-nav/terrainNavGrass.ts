import * as THREE from 'three';
import { ROAD_WIDTH_M, type Point } from './terrainNavScenario';
import { WORLD3D } from './terrainNavGeometry';
import { checkpoint, heightAt, nearLine, rng } from './terrainNavTerrain';
import { addLight } from './terrainNavAir';

/**
 * The grass of the navigator's foreground: clumps of curved blades round the
 * three hilltops the practice stands on (far below any mapping threshold — no
 * map symbol, no landmark), densest within ~15 m of the eye and thinning out to
 * ~75 m, where the ground's own texture carries on. Blades are drawn only near
 * the eye (they fade into the ground beyond ~60 m) and only round the hill the
 * eye is on, so they cost nothing in the overview.
 */

const S = WORLD3D.metresPerUnit;

export const GRASS_HILLS = ['H1', 'H2', 'H3'] as const;
/** Where the grass ends round a hilltop, metres. */
export const GRASS_REACH_M = 75;

export type GrassClump = { readonly E: number; readonly N: number; readonly baseM: number; readonly heightM: number; readonly spin: number; readonly dry: number };

const patchCache = new Map<string, { centre: Point; clumps: GrassClump[]; carpet: GrassClump[] }>();

/** The clumps round one hilltop (a jittered 0.6 m grid, thinned with distance; none at the eye's feet or on a track). */
export function grassPatch(hill: (typeof GRASS_HILLS)[number]) {
  let p = patchCache.get(hill);
  if (p) return p;
  const centre = checkpoint(hill);
  const rand = rng(0x2d358dcc ^ hill.charCodeAt(1) * 0x01000193);
  const summitH = heightAt(centre.E, centre.N);
  const clumps: GrassClump[] = [];
  const STEP = 0.6;
  for (let dN = -GRASS_REACH_M; dN <= GRASS_REACH_M; dN += STEP) {
    for (let dE = -GRASS_REACH_M; dE <= GRASS_REACH_M; dE += STEP) {
      const E = centre.E + dE + (rand() - 0.5) * STEP;
      const N = centre.N + dN + (rand() - 0.5) * STEP;
      const d = Math.hypot(E - centre.E, N - centre.N);
      const keep = rand();
      const size = rand();
      const spin = rand() * Math.PI * 2;
      const jitter = rand();
      if (d > GRASS_REACH_M || d < 1.4) continue;
      if (keep > Math.max(0.05, d < 15 ? 0.92 : 0.92 * Math.exp(-(d - 15) / 15))) continue;
      if (nearLine({ E, N }, ROAD_WIDTH_M / 2 + 1, ['road'])) continue;
      const baseM = heightAt(E, N);
      // drier towards the crest, greener down the slopes and in the folds
      const dry = THREE.MathUtils.clamp((baseM - (summitH - 22)) / 22 + (jitter - 0.5) * 0.7, 0, 1);
      clumps.push({ E, N, baseM, heightM: 0.18 + size * size * size * 0.55, spin, dry });
    }
  }
  // the short sward between the tussocks, close round the eye only (a 0.38 m grid out to ~28 m)
  const carpet: GrassClump[] = [];
  const NEAR = 28;
  for (let dN = -NEAR; dN <= NEAR; dN += 0.38) {
    for (let dE = -NEAR; dE <= NEAR; dE += 0.38) {
      const E = centre.E + dE + (rand() - 0.5) * 0.38;
      const N = centre.N + dN + (rand() - 0.5) * 0.38;
      const d = Math.hypot(E - centre.E, N - centre.N);
      const keep = rand();
      const size = rand();
      const spin = rand() * Math.PI * 2;
      const jitter = rand();
      if (d > NEAR || d < 0.9) continue;
      // patchy: thicker in the folds, thin on the bare crest
      const patch = 0.5 + 0.5 * Math.sin(E * 0.37 + Math.sin(N * 0.23) * 2.1) * Math.sin(N * 0.31 - Math.sin(E * 0.19) * 1.7);
      if (keep > (d < 10 ? 0.95 : 0.95 * Math.exp(-(d - 10) / 7)) * (0.6 + 0.4 * patch)) continue;
      if (nearLine({ E, N }, ROAD_WIDTH_M / 2 + 0.5, ['road'])) continue;
      const baseM = heightAt(E, N);
      const dry = THREE.MathUtils.clamp((baseM - (summitH - 22)) / 22 + (jitter - 0.5) * 0.8, 0, 1);
      carpet.push({ E, N, baseM, heightM: 0.08 + size * 0.17, spin, dry });
    }
  }
  p = { centre, clumps, carpet };
  patchCache.set(hill, p);
  return p;
}

/**
 * A clump of unit height: `blades` thin curved blades leaning out from a tight
 * base, three segments each, dark at the foot, light at the tip; `dryShare` of
 * them straw-coloured. Normals lean towards the sky (lit like the ground they
 * grow from), the material draws both faces.
 */
export function grassClumpGeometry(seed: number, blades: number, dryShare: number) {
  const rand = rng(seed);
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const green0 = new THREE.Color(0.018, 0.026, 0.009);
  const green1 = new THREE.Color(0.1, 0.13, 0.045);
  const straw0 = new THREE.Color(0.05, 0.04, 0.022);
  const straw1 = new THREE.Color(0.34, 0.285, 0.16);
  const c = new THREE.Color();
  for (let b = 0; b < blades; b++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.13;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    const out = a + (rand() - 0.5) * 0.9;
    const ox = Math.cos(out);
    const oz = Math.sin(out);
    const h = 0.5 + rand() * 0.5;
    const lean = 0.12 + rand() * 0.5;
    const w = 0.011 + rand() * 0.009;
    const twist = (rand() - 0.5) * 1.2;
    const dry = rand() < dryShare;
    const lo = dry ? straw0 : green0;
    const hi = dry ? straw1 : green1;
    const tone = 0.8 + rand() * 0.4;
    const base = pos.length / 3;
    const SEG = 3;
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      // the blade's flat side turns a little as it rises
      const sa = out + Math.PI / 2 + twist * t;
      const sx = Math.cos(sa);
      const sz = Math.sin(sa);
      const px = bx + ox * lean * h * t * t;
      const py = h * (t - 0.18 * lean * t * t);
      const pz = bz + oz * lean * h * t * t;
      const ww = w * (1 - t * 0.9);
      pos.push(px - sx * ww, py, pz - sz * ww, px + sx * ww, py, pz + sz * ww);
      // the sky's normal, tipped a little along the blade's lean
      const n = new THREE.Vector3(ox * 0.35, 1, oz * 0.35).normalize();
      nor.push(n.x, n.y, n.z, n.x, n.y, n.z);
      c.copy(lo).lerp(hi, Math.pow(t, 0.7)).multiplyScalar(tone);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (s) {
        const o = base + (s - 1) * 2;
        idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Clump variants by dryness — tussocks: mostly green, mixed, mostly straw; the sward: green, dry. */
export function grassVariants() {
  const tall = [0.15, 0.45, 0.8].map((dry, k) => grassClumpGeometry(0x13198a2e ^ k, 12, dry));
  const sward = [0.2, 0.7].map((dry, k) => grassClumpGeometry(0x7a2b5c11 ^ k, 18, dry).scale(1.7, 1, 1.7));
  return { tall, sward };
}

const NO_FLIP_NORMAL = THREE.ShaderChunk.normal_fragment_begin.replace(/normal\s*\*=\s*faceDirection;/g, '');

/**
 * The blades' material: vertex colours, both faces lit alike, the sun through the
 * blades seen against it; every blade shrinks into the ground between `fade` metres
 * from the eye (and right at its feet), so the grass fades into the ground's texture.
 */
export function grassMaterial(sunDir: THREE.Vector3, fade: [number, number], key: string) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  mat.customProgramCacheKey = () => `tn-grass-${key}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassSun = { value: sunDir };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vGrassT;').replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float d = distance(c, cameraPosition) * ${S.toFixed(1)};
        float keep = (1.0 - smoothstep(${fade[0].toFixed(1)}, ${fade[1].toFixed(1)}, d)) * smoothstep(0.6, 1.4, d);
        transformed.y *= keep;
        transformed.xz *= mix(0.3, 1.0, keep);
        vGrassT = clamp(position.y, 0.0, 1.0);
      }`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uGrassSun;\nvarying float vGrassT;')
      .replace('#include <normal_fragment_begin>', NO_FLIP_NORMAL)
      .replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
        {
          vec3 L = normalize((viewMatrix * vec4(uGrassSun, 0.0)).xyz);
          vec3 V = normalize(vViewPosition);
          float back = pow(clamp(dot(-V, L), 0.0, 1.0), 4.0);
          reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1.0, 0.95, 0.7) * back * 0.9 * vGrassT;
        }`,
      );
    addLight(shader);
  };
  return mat;
}
