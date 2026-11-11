import * as THREE from 'three';
import { WORLD3D } from './terrainNavGeometry';

/**
 * The light every surface of the terrain-association model shares, patched into
 * each material (addLight) so the ground, the trees, the rocks, the houses and
 * the sky meet in one air:
 *
 *   air     aerial perspective before tone mapping: a surface's colour fades
 *           with distance into the haze of the sky at the horizon in the same
 *           direction (paler and warmer towards the sun), thicker low in the
 *           valleys than over the crests — a far hill and the sky behind it
 *           reach the same colour, with no seam
 *   shadow  two maps of the one sun: a sharp one in a box that follows the
 *           navigator's eye (a few centimetres a texel: tufts, stones and trunks
 *           cast real shadows at their feet) and a static one of the whole sheet
 *           (groves and houses far away still stand on their shadows); each
 *           fragment reads the sharp one inside its box, fading to the other at
 *           its rim. The second light gives no light of its own.
 */

const S = WORLD3D.metresPerUnit;

/** The haze at the horizon (sRGB): the sky's colour there, which far ground fades into. */
export const HAZE = '#C9D3D6';

export const AIR = {
  uAirSun: { value: new THREE.Vector3(0, 1, 0) },
  uAirHaze: { value: new THREE.Color(HAZE) },
  /** Metres of air at the datum that leave 1/e of a surface's own colour. */
  uAirRange: { value: 24000 },
};

export const AIR_GLSL = /* glsl */ `
  uniform vec3 uAirSun;
  uniform vec3 uAirHaze;
  uniform float uAirRange;
  /** The sky at the horizon in this direction: the haze, brighter and warmer towards the sun. */
  vec3 tnAirColor(vec3 dir) {
    float s = max(dot(dir, uAirSun), 0.0);
    return uAirHaze + vec3(1.0, 0.93, 0.8) * (pow(s, 40.0) * 0.14 + pow(s, 5.0) * 0.07 + s * s * 0.03);
  }
  vec3 tnAir(vec3 col, vec3 wp) {
    vec3 ray = wp - cameraPosition;
    float len = length(ray);
    vec3 dir = ray / max(len, 1e-6);
    // the haze thins with height (mean height of the ray above the datum, metres)
    float hM = (cameraPosition.y + wp.y) * ${(S / 2).toFixed(1)};
    float dens = exp(-clamp(hM, -300.0, 4000.0) / 1400.0);
    float T = exp(-len * ${S.toFixed(1)} * dens / uAirRange);
    return mix(tnAirColor(dir), col, T);
  }
`;

const SHADOW_LINE = /directLight\.color \*= \( directLight\.visible && receiveShadow \) \? getShadow\( directionalShadowMap\[ i \][^;]*;/;

/** lights_fragment_begin with the sun's shadow read from both maps (light 0: the eye's box, light 1: the sheet). */
const LIGHTS_BEGIN = (() => {
  const chunk = THREE.ShaderChunk.lights_fragment_begin;
  const m = chunk.match(SHADOW_LINE);
  if (!m) return chunk;
  return chunk.replace(
    SHADOW_LINE,
    `#if ( UNROLLED_LOOP_INDEX == 0 ) && ( NUM_DIR_LIGHT_SHADOWS > 1 )
		directLight.color *= ( directLight.visible && receiveShadow ) ? tnSunShadow() : 1.0;
		#elif ( UNROLLED_LOOP_INDEX == 1 )
		directLight.color *= 0.0;
		#else
		${m[0]}
		#endif`,
  );
})();

const SUN_SHADOW_FN = /* glsl */ `
  #if defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 1 )
  float tnSunShadow() {
    DirectionalLightShadow sN = directionalLightShadows[ 0 ];
    DirectionalLightShadow sF = directionalLightShadows[ 1 ];
    vec3 c = vDirectionalShadowCoord[ 0 ].xyz / vDirectionalShadowCoord[ 0 ].w;
    vec2 e = min(c.xy, 1.0 - c.xy);
    float inNear = smoothstep(0.0, 0.1, min(e.x, e.y)) * step(c.z, 1.0);
    float far = getShadow( directionalShadowMap[ 1 ], sF.shadowMapSize, sF.shadowIntensity, sF.shadowBias, sF.shadowRadius, vDirectionalShadowCoord[ 1 ] );
    #ifdef TN_SOFT_SHADOW
      // leaf cards: the soft map only (in the sharp one each card shades itself and its rim reads lit)
      return far;
    #endif
    if (inNear <= 0.0) return far;
    float near = getShadow( directionalShadowMap[ 0 ], sN.shadowMapSize, sN.shadowIntensity, sN.shadowBias, sN.shadowRadius, vDirectionalShadowCoord[ 0 ] );
    return mix(far, near, inNear);
  }
  #endif
`;

/**
 * Patches a lit material's shader (inside its onBeforeCompile, after its own
 * replacements) with the shared air and the sun's two shadow maps (`soft`: the
 * whole sheet's soft map only).
 */
export function addLight(shader: THREE.WebGLProgramParametersWithUniforms, { soft = false }: { soft?: boolean } = {}) {
  Object.assign(shader.uniforms, AIR);
  if (soft) shader.fragmentShader = '#define TN_SOFT_SHADOW\n' + shader.fragmentShader;
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAirW;').replace(
    '#include <worldpos_vertex>',
    /* glsl */ `#include <worldpos_vertex>
    {
      vec4 aw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        aw = instanceMatrix * aw;
      #endif
      vAirW = (modelMatrix * aw).xyz;
    }`,
  );
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nvarying vec3 vAirW;\n${AIR_GLSL}`)
    .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>\n${SUN_SHADOW_FN}`)
    .replace('#include <lights_fragment_begin>', LIGHTS_BEGIN)
    .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = tnAir(gl_FragColor.rgb, vAirW);\n#include <tonemapping_fragment>')
    .replace('#include <fog_fragment>', '');
}

/** A plain standard material with the shared light (for the simple parts: roof caps, tanks, the tower). */
export function litStandard(params: THREE.MeshStandardMaterialParameters, key: string) {
  const m = new THREE.MeshStandardMaterial(params);
  m.customProgramCacheKey = () => `tn-lit-${key}`;
  m.onBeforeCompile = (shader) => addLight(shader);
  return m;
}
