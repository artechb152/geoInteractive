/**
 * Light of the replay: one sun, two shadow maps, and the sky as image-based light.
 *
 *   far shadow   the sun's own map over the whole prepared world (the station's
 *                ground, or the walking corridor), drawn once per world
 *   near shadow  a second, black directional light that only carries a fine map
 *                (±NEAR_SHADOW_M around the eye, ~3 cm a texel), redrawn when the
 *                eye has moved a few metres; grass, stones and leaves throw real
 *                shadows at the feet
 *   sky light    the sky photograph above the horizon and the sunlit ground below,
 *                prefiltered (PMREM) into scene.environment, so every surface is
 *                lit from the sky's actual brightness and colour
 *
 * Every replay material swaps three's directional-light loop for DUAL_SHADOW_LIGHTS
 * (patchLights): the sun is shaded by the near map inside its box, by the far one
 * outside, blended over the box's rim, and the black light adds nothing. Only the
 * replay's materials are patched — the other scenes of the page keep three's chunk.
 */
import {
  BackSide,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderChunk,
  ShaderMaterial,
  SphereGeometry,
  type Texture,
  type WebGLProgramParametersWithUniforms,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { ENV_GROUND, HAZE, SKY_U_OFFSET } from './visualConfig';

/** Half-size of the near shadow box, m, and its map size. */
export const NEAR_SHADOW_M = 34;
export const NEAR_SHADOW_MAP = 2048;
/** The near map is redrawn once the eye has moved this far from its centre. */
export const NEAR_SHADOW_STEP_M = 5;


function dualShadowChunk(): string {
  const src = ShaderChunk.lights_fragment_begin;
  const a = src.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
  const b = src.indexOf('#pragma unroll_loop_end', a);
  if (a < 0 || b < 0 || !src.slice(a, b).includes('directionalLights[ i ]')) return src; // a future three: keep its own loop
  const end = b + '#pragma unroll_loop_end'.length;
  const replacement = /* glsl */ `#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif

	// light 0: the sun. light 1 (black) only carries the near shadow map.
	directionalLight = directionalLights[ 0 ];
	getDirectionalLightInfo( directionalLight, directLight );
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 1
	if ( directLight.visible && receiveShadow ) {
		directionalLightShadow = directionalLightShadows[ 0 ];
		float shFar = getShadow( directionalShadowMap[ 0 ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ 0 ] );
		directionalLightShadow = directionalLightShadows[ 1 ];
		float shNear = getShadow( directionalShadowMap[ 1 ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ 1 ] );
		vec3 nearUv = vDirectionalShadowCoord[ 1 ].xyz / vDirectionalShadowCoord[ 1 ].w;
		vec2 rim = smoothstep( vec2( 0.0 ), vec2( 0.12 ), nearUv.xy ) * smoothstep( vec2( 1.0 ), vec2( 0.88 ), nearUv.xy );
		directLight.color *= mix( shFar, shNear, rim.x * rim.y );
	}
	#elif defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	directionalLightShadow = directionalLightShadows[ 0 ];
	directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ 0 ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ 0 ] ) : 1.0;
	#endif
	RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );`;
  return src.slice(0, a) + replacement + src.slice(end);
}

export const DUAL_SHADOW_LIGHTS = dualShadowChunk();

/** For an onBeforeCompile: the sun with the near / far shadow maps (see above). */
export function patchLights(shader: WebGLProgramParametersWithUniforms) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', DUAL_SHADOW_LIGHTS);
}

/**
 * The sky light: the sky photograph above the horizon (aligned with the sun, as
 * the visible dome), the horizon haze, and below it the colour of the sunlit
 * ground — prefiltered for MeshStandardMaterial's image-based light.
 */
export function createSkyEnvironment(gl: WebGLRenderer, sky: Texture): WebGLRenderTarget {
  const material = new ShaderMaterial({
    uniforms: { uSky: { value: sky }, uOffset: { value: SKY_U_OFFSET }, uHaze: { value: HAZE }, uGround: { value: ENV_GROUND } },
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSky; uniform float uOffset; uniform vec3 uHaze; uniform vec3 uGround;
      varying vec3 vDir;
      #include <common>
      void main() {
        vec3 d = normalize(vDir);
        float az = atan(d.x, -d.z);
        float u = fract(az / (2.0 * PI) + uOffset);
        float el = asin(clamp(d.y, -1.0, 1.0));
        float vImg = (0.5 - el / PI) / 0.625;
        vec3 c = texture2D(uSky, vec2(u, 1.0 - clamp(vImg, 0.0, 0.995))).rgb;
        c = mix(c, uHaze, smoothstep(0.1, 0.0, d.y));
        // below the horizon: the ground's own bounce, darker straight down (the eye's own shade)
        c = mix(c, uGround * (0.75 + 0.25 * smoothstep(-1.0, -0.1, d.y)), smoothstep(0.0, -0.06, d.y));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const scene = new Scene();
  const geo = new SphereGeometry(10, 48, 24);
  scene.add(new Mesh(geo, material));
  const pmrem = new PMREMGenerator(gl);
  const rt = pmrem.fromScene(scene, 0.02, 0.1, 100);
  pmrem.dispose();
  geo.dispose();
  material.dispose();
  return rt;
}
