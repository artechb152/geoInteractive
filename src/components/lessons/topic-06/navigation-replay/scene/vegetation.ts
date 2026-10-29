/**
 * Vegetation of the replay — built once, instanced many times.
 *
 *   shrubs   Mediterranean maquis: a dome of leaf cards cut from renders of a
 *            scanned shrub (shrub_leaves.webp, 4 × 2 close-ups). Normals point
 *            out of the dome, so a shrub shades as one soft mass; the base and
 *            the core are darker (vertex colour). Four shapes.
 *   far      beyond ~240 m each shrub is one camera-facing card from
 *            shrub_far.webp (2 × 2 composed silhouettes), lit the same way.
 *   grass    dry tufts of thin curved blades, straw at the tips.
 *
 * All sizes are metres for a unit instance (scaled per instance).
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  ShaderChunk,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type Texture,
} from 'three';
import { hash01 } from '../replayScatter';

/** One maquis shrub, ~1 m tall and ~1.3 m wide, base at y = 0. */
export function buildShrubGeometry(variant: number): BufferGeometry {
  const cards = 120;
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  // dome proportions per variant: round, wide-low, tall, lopsided
  const shapes = [
    { rx: 0.66, ry: 0.52, rz: 0.62, cy: 0.5 },
    { rx: 0.82, ry: 0.4, rz: 0.72, cy: 0.4 },
    { rx: 0.52, ry: 0.62, rz: 0.5, cy: 0.6 },
    { rx: 0.7, ry: 0.5, rz: 0.55, cy: 0.48 },
  ];
  const sh = shapes[variant % shapes.length];
  const up = new Vector3(0, 1, 0);
  for (let c = 0; c < cards; c++) {
    const h = (k: number) => hash01(variant * 977 + c, k, 41);
    // a point in the dome's outer shell (a few deeper ones fill the core)
    const theta = h(1) * Math.PI * 2;
    const phi = Math.acos(1 - 1.6 * h(2)); // mostly the upper part
    const depth = c < 16 ? 0.4 + 0.35 * h(3) : 0.8 + 0.22 * h(3);
    const dir = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    const center = new Vector3(dir.x * sh.rx * depth, sh.cy + dir.y * sh.ry * depth, dir.z * sh.rz * depth);
    if (center.y < 0.12) center.y = 0.12 + 0.1 * h(4);
    const size = 0.34 + 0.2 * h(5);
    // the card faces outwards, turned and tipped at random
    const n = dir.clone().add(new Vector3(h(6) - 0.5, (h(7) - 0.5) * 0.6, h(8) - 0.5).multiplyScalar(0.9)).normalize();
    const t1 = new Vector3().crossVectors(up, n);
    if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
    t1.normalize();
    const t2 = new Vector3().crossVectors(n, t1).normalize();
    const spin = h(9) * Math.PI * 2;
    const ax = t1.clone().multiplyScalar(Math.cos(spin)).add(t2.clone().multiplyScalar(Math.sin(spin)));
    const ay = t2.clone().multiplyScalar(Math.cos(spin)).sub(t1.clone().multiplyScalar(Math.sin(spin)));
    const cell = Math.floor(h(10) * 8);
    const u0 = (cell % 4) / 4;
    const v0 = 1 - Math.floor(cell / 4) / 2 - 0.5;
    const base = pos.length / 3;
    for (const [sx, sy, su, sv] of [
      [-1, -1, 0, 0],
      [1, -1, 1, 0],
      [1, 1, 1, 1],
      [-1, 1, 0, 1],
    ]) {
      const p = center.clone().addScaledVector(ax, (sx * size) / 2).addScaledVector(ay, (sy * size) / 2);
      if (p.y < 0.02) p.y = 0.02;
      pos.push(p.x, p.y, p.z);
      // dome normal: from the centre of the shrub out through this corner
      const dn = new Vector3(p.x / sh.rx, (p.y - sh.cy * 0.7) / sh.ry, p.z / sh.rz).normalize();
      nor.push(dn.x, dn.y, dn.z);
      uv.push(u0 + su / 4, v0 + sv / 2);
      // occlusion: darker at the base and towards the core
      const radial = Math.min(1, Math.hypot(p.x / sh.rx, (p.y - sh.cy) / sh.ry, p.z / sh.rz));
      const ao = Math.min(1, 0.38 + 0.42 * Math.min(1, p.y / (sh.cy + sh.ry)) + 0.3 * radial);
      col.push(ao, ao, ao);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Leaf cards: alpha-cut, double-sided, normals kept outward on both faces, a little light through the leaves. */
export function createShrubMaterial(leaves: Texture) {
  const m = new MeshStandardMaterial({
    map: leaves,
    alphaTest: 0.42,
    alphaToCoverage: true,
    side: DoubleSide,
    vertexColors: true,
    roughness: 0.78,
    metalness: 0,
    color: new Color(1, 1, 1),
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <normal_fragment_begin>', ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''))
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
// leaves glow faintly where the sun shines through them
reflectedLight.indirectDiffuse += diffuseColor.rgb * 0.08;`,
      );
  };
  m.customProgramCacheKey = () => 'navigation-replay-shrub-v1';
  return m;
}

/** A dry grass tuft: 14 curved blades, ~0.35 m tall, base at y = 0. */
export function buildGrassGeometry(variant: number): BufferGeometry {
  const blades = 18;
  const segs = 3;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const base = new Color(0.1, 0.1, 0.05);
  const tips = [new Color(0.46, 0.38, 0.21), new Color(0.38, 0.36, 0.22), new Color(0.3, 0.33, 0.19), new Color(0.5, 0.42, 0.25)];
  for (let b = 0; b < blades; b++) {
    const h = (k: number) => hash01(variant * 131 + b, k, 77);
    const ang = h(1) * Math.PI * 2;
    const r0 = 0.06 * h(2);
    const height = 0.14 + 0.3 * h(3) * h(3);
    const lean = 0.2 + 0.5 * h(4);
    const w = 0.012 + 0.008 * h(5);
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    // blade plane faces sideways to its lean
    const sx = -dz;
    const sz = dx;
    const tip = tips[Math.floor(h(6) * tips.length)];
    const start = pos.length / 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const y = height * t;
      const off = r0 + lean * height * t * t;
      const width = w * (1 - t * 0.85);
      const cx = dx * off;
      const cz = dz * off;
      pos.push(cx - sx * width, y, cz - sz * width, cx + sx * width, y, cz + sz * width);
      // normals lean towards the sky so tufts light like the ground around them
      const ny = 0.75;
      nor.push(dx * 0.4, ny, dz * 0.4, dx * 0.4, ny, dz * 0.4);
      const c = base.clone().lerp(tip, Math.pow(t, 0.7));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    for (let s = 0; s < segs; s++) {
      const a = start + s * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.normalizeNormals();
  g.computeBoundingSphere();
  return g;
}

export function createGrassMaterial() {
  const m = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
  };
  m.customProgramCacheKey = () => 'navigation-replay-grass-v1';
  return m;
}

/** A unit quad standing on y = 0 (x −0.5…0.5, y 0…1). */
export function buildBillboardGeometry(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/**
 * Far shrubs: each instance is a card turned to face the camera about its
 * vertical axis, sampling one of the 2 × 2 silhouettes; shaded with the sun and
 * sky as a soft dome; fogged like the ground.
 */
export function createBillboardMaterial(atlas: Texture, sunDir: Vector3, sun: Color, sky: Color, ground: Color) {
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uAtlas: { value: atlas },
        uSunDir: { value: sunDir },
        uSun: { value: sun },
        uSky: { value: sky },
        uGround: { value: ground },
      },
    ]),
    fog: true,
    alphaToCoverage: true,
    vertexShader: /* glsl */ `
      attribute float aVariant;
      attribute vec3 aTint;
      varying vec2 vUv;
      varying vec3 vTint;
      varying vec3 vDomeN;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sx = length(instanceMatrix[0].xyz);
        float sy = length(instanceMatrix[1].xyz);
        vec3 toCam = cameraPosition - base.xyz;
        vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x));
        vec3 world = base.xyz + right * position.x * sx * 1.35 + vec3(0.0, position.y * sy * 1.05, 0.0);
        float v = aVariant;
        vUv = (uv + vec2(mod(v, 2.0), floor(v / 2.0))) * 0.5;
        vTint = aTint;
        vec3 face = normalize(vec3(toCam.x, 0.0, toCam.z));
        vDomeN = normalize(face * 0.55 + right * (position.x * 1.6) + vec3(0.0, position.y * 1.2 + 0.2, 0.0));
        vec4 mvPosition = viewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      uniform vec3 uSunDir;
      uniform vec3 uSun;
      uniform vec3 uSky;
      uniform vec3 uGround;
      varying vec2 vUv;
      varying vec3 vTint;
      varying vec3 vDomeN;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec4 t = texture2D(uAtlas, vUv);
        if (t.a < 0.45) discard;
        vec3 albedo = t.rgb * vTint;
        vec3 n = normalize(vDomeN);
        float lambert = max(dot(n, uSunDir), 0.0);
        vec3 ambient = mix(uGround, uSky, n.y * 0.5 + 0.5);
        vec3 col = albedo * (uSun * lambert * 0.9 + ambient);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
