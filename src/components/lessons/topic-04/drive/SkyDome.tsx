'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SKY_RADIUS, SUN_DIRECTION, type AtmosphereMood } from './atmosphere';

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform float uGlow;
uniform float uDisc;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;

  // Wide pale haze band at the horizon rising into a soft sage zenith.
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
  // Below the horizon: haze first (what the camera can actually glimpse past
  // distant ridges), then warm ground bounce — mostly seen by the baked IBL.
  sky = mix(sky, uGround, smoothstep(-0.04, -0.35, h));

  // Forward-scatter glow around the sun. Faded out right at the horizon line
  // so the fogged terrain (fog colour = uHorizon) meets the sky with no seam.
  float mu = max(dot(d, uSunDir), 0.0);
  float horizonMask = smoothstep(-0.01, 0.1, h);
  float halo = pow(mu, 6.0) * 0.28 + pow(mu, 48.0) * 0.55;
  sky += uSun * halo * uGlow * horizonMask;
  // Soft sun disc — bright enough to catch a little bloom.
  sky += uSun * smoothstep(0.99955, 0.99985, mu) * 5.0 * uDisc;

  gl_FragColor = vec4(sky, 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * Gradient sky tuned to the site palette (cream haze → sage zenith, warm sun
 * glow). Used twice: inside <Environment> to bake image-based sky light
 * (`disc={false}` — the directional light already provides the sun's
 * specular), and as the visible backdrop (`followCamera`), kept centred on the
 * camera so the horizon never shifts with parallax.
 */
export function SkyDome({ mood, disc = true, followCamera = false }: { mood: AtmosphereMood; disc?: boolean; followCamera?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uZenith: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uGround: { value: new THREE.Color() },
          uSun: { value: new THREE.Color() },
          uSunDir: { value: SUN_DIRECTION.clone() },
          uGlow: { value: 0 },
          uDisc: { value: 0 },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );

  useEffect(() => {
    const u = material.uniforms;
    (u.uZenith.value as THREE.Color).set(mood.zenith);
    (u.uHorizon.value as THREE.Color).set(mood.horizon);
    (u.uGround.value as THREE.Color).set(mood.ground);
    (u.uSun.value as THREE.Color).set(mood.sun);
    u.uGlow.value = mood.glow;
    u.uDisc.value = disc ? 1 : 0;
  }, [material, mood, disc]);

  useEffect(() => () => material.dispose(), [material]);

  // After the chase camera moved this frame (see DriveAtmosphere's SunLight).
  useFrame(({ camera }) => {
    if (followCamera && meshRef.current) meshRef.current.position.copy(camera.position);
  }, 0.5);

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[SKY_RADIUS, 48, 24]} />
    </mesh>
  );
}
