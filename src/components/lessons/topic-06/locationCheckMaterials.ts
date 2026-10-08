import * as THREE from 'three';

/**
 * Runtime materials for the location-check observation (LocationCheckTerrain3D).
 *
 * Ground: three tiling CC0 Poly Haven photo materials (aerial_grass_rock,
 * dry_ground_rocks, cliff_side — the set lesson 2's contour mountain uses,
 * copied to public/assets/lessons/topic06/location-check/textures) plus its
 * forest floor, blended per pixel. Weights come from the slope of the mesh and
 * from value noise evaluated on the ground position in metres — fixed in
 * space, so nothing shimmers or changes between frames. Each texture is
 * sampled at two scales to break the tiling. Roads, their vegetated edges and
 * grove floors come from the shared mask (R, B, G) drawn from the scenario's
 * centre-lines and polygons. The road is pale compacted limestone dust between
 * darker edges, so an arm a few pixels wide still reads from the eye.
 *
 * Geometry is never altered here: the shader only colours and perturbs the
 * shading normal of the real mesh.
 */

export type GroundTextures = {
  grassD: THREE.Texture;
  grassN: THREE.Texture;
  dryD: THREE.Texture;
  dryN: THREE.Texture;
  rockD: THREE.Texture;
  rockN: THREE.Texture;
  forestD: THREE.Texture;
  mask: THREE.Texture;
};

/** South-south-east, mid-morning: glancing light on the slopes that face the observer, shadows falling away to the north-north-west. */
const SUN_AZIMUTH_DEG = 150;
const SUN_ELEVATION_DEG = 33;
const az = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG);
const el = THREE.MathUtils.degToRad(SUN_ELEVATION_DEG);

export const SKY = {
  /** Haze at the horizon — also the fog colour, so the far ground melts into the sky. */
  horizon: new THREE.Color('#E2E3DA'),
  zenith: new THREE.Color('#86A8C6'),
  sunColor: new THREE.Color('#FFE9C8'),
  /** Toward the sun, world axes (x east, y up, z south). */
  sunDirection: new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize(),
  /** FogExp2 density per world unit (350 m): ≈ 1 % haze at the fork, ≈ 45 % at 3 km. */
  fogDensity: 0.09,
} as const;

const NOISE_GLSL = /* glsl */ `
  float lcHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float lcNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(lcHash(i), lcHash(i + vec2(1.0, 0.0)), u.x), mix(lcHash(i + vec2(0.0, 1.0)), lcHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float lcFbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int k = 0; k < 4; k++) {
      s += a * lcNoise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      a *= 0.5;
    }
    return s;
  }
`;

export function createTerrainMaterial(tex: GroundTextures) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0 });
  const uniforms = {
    uGrassD: { value: tex.grassD },
    uGrassN: { value: tex.grassN },
    uDryD: { value: tex.dryD },
    uDryN: { value: tex.dryN },
    uRockD: { value: tex.rockD },
    uRockN: { value: tex.rockN },
    uForestD: { value: tex.forestD },
    uMask: { value: tex.mask },
  };
  mat.customProgramCacheKey = () => 'location-check-ground';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLcM;\nvarying vec3 vLcN;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        // Ground position in scenario metres: (E, height, N).
        vLcM = vec3(transformed.x * 350.0 + 700.0, transformed.y * 350.0 + 280.0, 525.0 - transformed.z * 350.0);
        vLcN = objectNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vLcM;
        varying vec3 vLcN;
        uniform sampler2D uGrassD, uGrassN, uDryD, uDryN, uRockD, uRockN, uForestD, uMask;
        ${NOISE_GLSL}
        vec3 lcTex(sampler2D t, vec2 m, float a, float b) {
          return mix(texture2D(t, m / a).rgb, texture2D(t, m / b + 0.37).rgb, 0.42);
        }
        // Photo detail as luminance around 1 (relative to the texture's own mean,
        // its last mip level), so the palette below sets the colour.
        float lcDetail(sampler2D t, vec2 m, float a, float b, float contrast) {
          float l = dot(lcTex(t, m, a, b), vec3(0.299, 0.587, 0.114));
          float mean = dot(textureLod(t, vec2(0.5), 12.0).rgb, vec3(0.299, 0.587, 0.114));
          return clamp(pow(l / max(mean, 1e-3), contrast), 0.3, 2.2);
        }
        vec3 lcNrm(sampler2D t, vec2 m, float a) {
          return texture2D(t, m / a).xyz * 2.0 - 1.0;
        }
        float lcLum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
        float lcWDry, lcWRock, lcWRoad, lcWVerge;`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec2 lcM = vLcM.xz;
        vec3 lcN0 = normalize(vLcN);
        float lcSlope = clamp(1.0 - lcN0.y, 0.0, 1.0);
        float lcMacro = lcFbm(lcM / 320.0);
        float lcMeso = lcFbm(lcM / 52.0 + 11.0);
        float lcFine = lcFbm(lcM / 11.0 + 5.0);
        // Palette (linear): olive grass, sun-dried grass, pale limestone, road dust,
        // road-edge growth, grove litter.
        const vec3 kGreen = vec3(0.205, 0.215, 0.082);
        const vec3 kOlive = vec3(0.285, 0.265, 0.115);
        const vec3 kDry = vec3(0.47, 0.375, 0.19);
        const vec3 kStone = vec3(0.4, 0.375, 0.31);
        const vec3 kDust = vec3(0.78, 0.73, 0.6);
        const vec3 kVerge = vec3(0.15, 0.155, 0.065);
        const vec3 kLitter = vec3(0.13, 0.115, 0.06);
        float dG = lcDetail(uGrassD, lcM, 7.0, 26.0, 1.15);
        float dD = lcDetail(uDryD, lcM, 5.5, 21.0, 1.0);
        float dR = lcDetail(uRockD, lcM, 9.0, 31.0, 1.2);
        float dF = lcDetail(uForestD, lcM, 4.0, 14.0, 1.0);
        // Open ground: sun-dried grass with greener, darker scrubby hollows;
        // pale limestone breaking through in patches, more of it up the hill.
        lcWDry = smoothstep(0.32, 0.7, lcMacro * 0.55 + lcMeso * 0.45 + lcFine * 0.2 + lcSlope * 1.5);
        vec3 cG = mix(kGreen, kOlive, smoothstep(0.35, 0.65, lcMeso)) * dG;
        vec3 cD = kDry * mix(dD, dG, 0.4);
        float lcHigh = smoothstep(320.0, 370.0, vLcM.y);
        lcWRock = smoothstep(0.66, 0.86, lcMeso * 0.5 + lcFine * 0.5 + lcSlope * 3.0 + lcHigh * 0.14) * 0.85;
        vec2 lcUv = vec2(lcM.x / 1400.0, lcM.y / 1050.0);
        float lcIn = step(0.0, lcUv.x) * step(lcUv.x, 1.0) * step(0.0, lcUv.y) * step(lcUv.y, 1.0);
        vec4 lcMask = texture2D(uMask, lcUv) * lcIn;
        lcWRoad = smoothstep(0.18, 0.62, lcMask.r);
        lcWVerge = smoothstep(0.15, 0.55, lcMask.b) * (1.0 - lcWRoad);
        vec3 lcCol = mix(cG, cD, lcWDry);
        lcCol = mix(lcCol, kStone * dR, lcWRock);
        lcCol = mix(lcCol, kLitter * dF, lcMask.g * 0.85);
        // Denser growth along the edges (run-off from the track), then the compacted
        // pale limestone dust of the track itself — even, with little texture.
        lcCol = mix(lcCol, kVerge * dG, lcWVerge * 0.8);
        float lcVar = (0.9 + 0.2 * lcMacro) * mix(0.82, 1.08, lcMeso);
        lcCol *= lcVar;
        lcCol = mix(lcCol, kDust * mix(dD, 1.0, 0.8) * mix(lcVar, 1.0, 0.7), lcWRoad);
        diffuseColor.rgb *= lcCol;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        // Detail normals in a planar (E, N) frame on the real surface normal.
        vec3 lcT = normalize(vec3(1.0, 0.0, 0.0) - lcN0 * lcN0.x);
        vec3 lcB = cross(lcN0, lcT);
        vec3 lcTn = lcNrm(uGrassN, lcM, 7.0) * (1.0 - lcWDry) + lcNrm(uDryN, lcM, 5.5) * lcWDry;
        lcTn = mix(lcTn, lcNrm(uRockN, lcM, 9.0), lcWRock);
        lcTn = mix(lcTn, lcNrm(uDryN, lcM, 3.2) * 0.15, lcWRoad);
        vec3 lcNw = normalize(lcN0 + (lcT * lcTn.x + lcB * lcTn.y) * 0.85);
        normal = normalize((viewMatrix * vec4(lcNw, 0.0)).xyz);`,
      );
  };
  return mat;
}

export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHorizon: { value: SKY.horizon },
      uZenith: { value: SKY.zenith },
      uSunDir: { value: SKY.sunDirection },
      uSunColor: { value: SKY.sunColor },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHorizon, uZenith, uSunDir, uSunColor;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
        // a slightly warmer haze band right above the horizon
        col = mix(col, uHorizon * vec3(1.02, 1.0, 0.96), (1.0 - smoothstep(0.0, 0.1, h)) * 0.55);
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunColor * (pow(s, 1200.0) * 2.5 + pow(s, 48.0) * 0.16 + pow(s, 6.0) * 0.05);
        if (h > 0.0) {
          // Fair-weather cumulus on a cloud deck: flat grey bases, bright sunlit tops.
          vec2 p = d.xz / (h + 0.12) * 1.1;
          float c = lcFbm(p + vec2(4.1, 1.7)) + 0.35 * lcFbm(p * 2.7 + vec2(9.3, 2.2)) - 0.12;
          float cover = smoothstep(0.42, 0.66, c) * smoothstep(0.015, 0.16, h) * (1.0 - smoothstep(0.6, 0.98, h));
          float lit = smoothstep(0.45, 0.85, c) * (0.6 + 0.4 * max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0));
          vec3 cloud = mix(vec3(0.66, 0.69, 0.73), vec3(1.0, 0.99, 0.95), lit);
          col = mix(col, cloud, cover * 0.88);
        } else {
          col = uHorizon;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
}
