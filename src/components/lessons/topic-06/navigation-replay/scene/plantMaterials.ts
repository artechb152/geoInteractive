/**
 * Materials of the scanned plants and rocks (MeshStandardMaterial, so the sun,
 * the sky light, both shadow maps, fog and tone mapping stay three.js'):
 *
 *   foliage  the scans' leaf / blade / twig cards, cut out by their mask with
 *            alpha-to-coverage (MSAA resolves the edge: no stair-steps, no halo —
 *            the atlases are colour-dilated under the mask), the mask's coverage
 *            kept up as the texture minifies so a far crown doesn't thin out; normals
 *            bent to the crown's dome (plantModels.ts) and never flipped on the back
 *            face, so a shrub shades as one soft mass; a little sun through the
 *            leaves; vertex occlusion darkens the core and the base
 *   wood     stems and branches, from the same atlas, opaque
 *   rock     each scan's albedo and normal map, graded to the region's pale
 *            limestone: dark lichen and a warm stain here and there (world-space
 *            noise, so no two rocks match), dust on the faces that look up, and the
 *            soil the rock sits in staining its foot
 *
 * All of them take the instance field's dither (instanceField.ts) and the
 * near / far sun shadow (lighting.ts).
 */
import { Color, DoubleSide, MeshStandardMaterial, ShaderChunk, type Texture, type WebGLProgramParametersWithUniforms } from 'three';
import { FIELD_FRAG_PARS, FIELD_VERT, FIELD_VERT_PARS } from './instanceField';
import { patchLights } from './lighting';

function addField(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${FIELD_VERT_PARS}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${FIELD_VERT}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FIELD_FRAG_PARS}`)
    .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfieldDither();');
}

export type FoliageLook = {
  /** multiplies the albedo (after desaturation) */
  tint: Color;
  /** 0…1 towards grey */
  desat: number;
  /** sun through the leaves, seen against the light */
  translucency: number;
  /** sky light scattered into the mass */
  fill: number;
  /** how much the mask's coverage is kept up per mip level (a far crown should stay a crown) */
  coverage?: number;
  key: string;
};

export function createFoliageMaterial(map: Texture, look: FoliageLook) {
  const m = new MeshStandardMaterial({
    map,
    alphaTest: 0.42,
    alphaToCoverage: true,
    side: DoubleSide,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.75,
  });
  const uniforms = {
    uTint: { value: look.tint },
    uDesat: { value: look.desat },
    uTrans: { value: look.translucency },
    uFill: { value: look.fill },
    uMapSize: { value: (map.image as { width?: number } | undefined)?.width ?? 1024 },
    uCoverage: { value: look.coverage ?? 0.22 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    addField(shader);
    patchLights(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTint;\nuniform float uDesat;\nuniform float uTrans;\nuniform float uFill;\nuniform float uMapSize;\nuniform float uCoverage;')
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
vec4 leafTexel = texture2D(map, vMapUv);
// keep the mask's coverage as the texture minifies (the mip average of a leaf's edge sinks below the cut)
vec2 leafTexels = vMapUv * uMapSize;
float leafMip = max(0.0, 0.5 * log2(max(dot(dFdx(leafTexels), dFdx(leafTexels)), dot(dFdy(leafTexels), dFdy(leafTexels)))));
leafTexel.a *= 1.0 + leafMip * uCoverage;
// a card seen edge-on is a hard sliver, not foliage: let it go (its true facing, from the screen derivatives)
vec3 cardN = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
leafTexel.a *= smoothstep(0.16, 0.42, abs(dot(cardN, normalize(vViewPosition))));
float leafLum = dot(leafTexel.rgb, vec3(0.2126, 0.7152, 0.0722));
leafTexel.rgb = mix(leafTexel.rgb, vec3(leafLum), uDesat) * uTint;
diffuseColor *= leafTexel;`,
      )
      .replace('#include <normal_fragment_begin>', ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '').replace('normal = normal * faceDirection;', ''))
      .replace(
        '#include <lights_fragment_end>',
        /* glsl */ `#include <lights_fragment_end>
// sky light scattered through the mass, more in the open outer leaves
reflectedLight.indirectDiffuse += diffuseColor.rgb * uFill * vColor.r;
#if NUM_DIR_LIGHTS > 0
{
  // the sun behind the leaves, as seen from the eye: a soft glow, only where the leaves are open (occlusion)
  vec3 L = directionalLights[0].direction;
  float back = pow(max(0.0, dot(-normalize(vViewPosition), L)), 4.0);
  float wrapN = max(0.0, dot(normal, L) * 0.5 + 0.5);
  reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[0].color * (uTrans * back + 0.04 * wrapN) * vColor.r * vColor.r;
}
#endif`,
      );
  };
  m.customProgramCacheKey = () => `nr-foliage-v2-${look.key}`;
  return m;
}

export function createWoodMaterial(map: Texture, tint: Color, key: string) {
  // both sides: a decimated scan's thin twigs leave the odd gap a back face would show through
  const m = new MeshStandardMaterial({ map, side: DoubleSide, vertexColors: true, roughness: 0.95, metalness: 0, color: tint, envMapIntensity: 0.7 });
  m.onBeforeCompile = (shader) => {
    addField(shader);
    patchLights(shader);
  };
  m.customProgramCacheKey = () => `nr-wood-v1-${key}`;
  return m;
}

/**
 * `detail`: the ground's limestone scan (albedo; normal X / Y in RG), laid over every rock from
 * three sides (triplanar, ~0.7 m) — pits and crusts as sharp as the ground's up close, where a
 * single 512 px scan would blur, and the rocks and the outcrops in the ground of one stone.
 */
export function createRockMaterial(map: Texture, normalMap: Texture, key: string, detail: { albedo: Texture; normal: Texture }) {
  const m = new MeshStandardMaterial({ map, normalMap, roughness: 0.92, metalness: 0, envMapIntensity: 0.85 });
  m.normalScale.set(1.0, 1.0);
  const uniforms = { uDetailAlb: { value: detail.albedo }, uDetailNor: { value: detail.normal } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    addField(shader);
    patchLights(shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vRelY;\nvarying vec3 vUpN;\nvarying vec3 vRockW;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vRelY = position.y;
{
  vec3 n = objectNormal;
  vec4 w = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    n = mat3(instanceMatrix) * n;
    w = instanceMatrix * w;
  #endif
  vUpN = normalize(mat3(modelMatrix) * n);
  vRockW = (modelMatrix * w).xyz;
}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
varying float vRelY;
varying vec3 vUpN;
varying vec3 vRockW;
uniform sampler2D uDetailAlb;
uniform sampler2D uDetailNor;
vec3 rkTriW(vec3 n) { vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z); }
float rkHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rkNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rkHash(i), rkHash(i + vec3(1, 0, 0)), f.x), mix(rkHash(i + vec3(0, 1, 0)), rkHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(rkHash(i + vec3(0, 0, 1)), rkHash(i + vec3(1, 0, 1)), f.x), mix(rkHash(i + vec3(0, 1, 1)), rkHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
{
  // pale limestone: the scans' detail kept, their colour pulled towards a warm light grey
  float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 lime = vec3(lum) * vec3(1.08, 1.0, 0.88);
  diffuseColor.rgb = mix(diffuseColor.rgb, lime, 0.75);
  diffuseColor.rgb = diffuseColor.rgb / (0.25 + lum) * (0.25 + mix(lum, 0.4, 0.55));
  // the ground's limestone, from three sides: its light and dark speckle over the scan
  vec3 tw = rkTriW(normalize(vUpN));
  vec3 q = vRockW / 0.7;
  vec3 dA = texture2D(uDetailAlb, q.zy).rgb * tw.x + texture2D(uDetailAlb, q.xz).rgb * tw.y + texture2D(uDetailAlb, q.xy).rgb * tw.z;
  float dl = dot(dA, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb *= clamp(0.55 + 0.9 * dl / 0.32, 0.6, 1.35);
  // lichen: dark grey crusts and the odd orange spot, in patches
  float n1 = rkNoise(vRockW * 3.1);
  float n2 = rkNoise(vRockW * 11.0 + 7.0);
  float crust = smoothstep(0.58, 0.75, n1 * 0.7 + n2 * 0.3);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.42, 0.42, 0.4), crust * 0.6);
  float spot = smoothstep(0.8, 0.9, rkNoise(vRockW * 6.3 + 3.0)) * smoothstep(0.5, 0.7, n2);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.25, 0.08), spot * 0.45);
}`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
{
  // each piece its own shade (instance colour); the soil stains the foot; dust settles on top
  float foot = smoothstep(0.1, 0.0, vRelY);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.58, 0.48, 0.36), foot * 0.8);
  float coat = smoothstep(0.55, 0.95, normalize(vUpN).y) * (1.0 - foot);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.31, 0.24), coat * 0.25);
}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
{
  // the detail's relief: each side's normal X / Y tilts the world normal in its own plane
  vec3 tw2 = rkTriW(normalize(vUpN));
  vec3 q2 = vRockW / 0.7;
  vec2 nx = texture2D(uDetailNor, q2.zy).rg * 2.0 - 1.0;
  vec2 ny = texture2D(uDetailNor, q2.xz).rg * 2.0 - 1.0;
  vec2 nz = texture2D(uDetailNor, q2.xy).rg * 2.0 - 1.0;
  vec3 dW = (vec3(0.0, nx.y, nx.x) * tw2.x + vec3(ny.x, 0.0, ny.y) * tw2.y + vec3(nz.x, nz.y, 0.0) * tw2.z) * 0.9;
  normal = normalize(normal + (viewMatrix * vec4(dW, 0.0)).xyz);
}`,
      )
      .replace(
        '#include <aomap_fragment>',
        /* glsl */ `#include <aomap_fragment>
{
  // the ground's occlusion climbs a little way up the rock
  float contactAO = mix(0.55, 1.0, smoothstep(0.0, 0.16, vRelY));
  reflectedLight.indirectDiffuse *= contactAO;
  reflectedLight.directDiffuse *= mix(1.0, contactAO, 0.4);
}`,
      );
  };
  m.customProgramCacheKey = () => `nr-rock-v2-${key}`;
  return m;
}
