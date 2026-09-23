import * as THREE from 'three';

/**
 * Per-material look-dev for vehicle.glb, keyed by the Blender material names
 * in scripts/blender/build_vehicle.py. The baked sky Environment is shared by
 * the whole scene, so each surface family gets its own reflection strength
 * here: satin paint stays muted (a full-strength sky reflection washes the
 * olive out toward pale sage), bare metal / mirror / glass get a crisp sky
 * glint, rubber and canvas stay nearly non-reflective.
 */
const ENV_INTENSITY: Record<string, number> = {
  PaintBody: 0.6,
  PaintChassis: 0.5,
  PaintedMetal: 0.7,
  Rim: 0.6,
  BareMetal: 1.1,
  Mirror: 1.2,
  Glass: 1.4,
  LightLens: 1.0,
  TailLight: 0.9,
  Tire: 0.3,
  TireTread: 0.22,
  Canvas: 0.25,
};

/**
 * Surface wear, texture-free: the model ships flat PBR values, which read as
 * clean plastic. Each family gets low-frequency object-space noise on value
 * (`tint`) and roughness (`rough`), plus a dust film (`dust`) that fades in
 * toward the ground. Mesh-local space is used so the pattern sticks to the
 * body and turns with the wheels. Body-local y is height above the ground
 * contact plane; wheel meshes are centred on the axle, so wheels read as
 * evenly dusty. Keep the amounts restrained — this is weathering, not grime.
 */
type Wear = { tint: number; rough: number; dust: number };

const WEAR: Record<string, Wear> = {
  PaintBody: { tint: 0.06, rough: 0.12, dust: 0.22 },
  PaintChassis: { tint: 0.05, rough: 0.08, dust: 0.3 },
  PaintedMetal: { tint: 0.05, rough: 0.14, dust: 0.18 },
  Rim: { tint: 0.05, rough: 0.1, dust: 0.22 },
  Tire: { tint: 0.04, rough: 0.05, dust: 0.16 },
  TireTread: { tint: 0.04, rough: 0.04, dust: 0.2 },
  Canvas: { tint: 0.07, rough: 0.05, dust: 0.08 },
};

/** Dry sand/soil dust, in linear space (diffuseColor is linear in the shader). */
const DUST = new THREE.Color('#9E8B69');

const glsl = (n: number) => n.toFixed(4);

function applyWear(mat: THREE.MeshStandardMaterial, wear: Wear) {
  if (mat.userData.wearApplied) return;
  mat.userData.wearApplied = true;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWearPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWearPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWearPos;
float wearHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float wearNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(wearHash(i), wearHash(i + vec3(1, 0, 0)), f.x),
        mix(wearHash(i + vec3(0, 1, 0)), wearHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(wearHash(i + vec3(0, 0, 1)), wearHash(i + vec3(1, 0, 1)), f.x),
        mix(wearHash(i + vec3(0, 1, 1)), wearHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float wearN = wearNoise(vWearPos * 2.3) * 0.65 + wearNoise(vWearPos * 9.0) * 0.35;
float wearDust = ${glsl(wear.dust)} * (1.0 - smoothstep(0.35, 0.95, vWearPos.y)) * (0.55 + 0.45 * wearN);
diffuseColor.rgb *= 1.0 + ${glsl(wear.tint)} * (wearN - 0.5) * 2.0;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${glsl(DUST.r)}, ${glsl(DUST.g)}, ${glsl(DUST.b)}), wearDust);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + ${glsl(wear.rough)} * (wearN - 0.5) * 2.0 + wearDust * 0.35, 0.04, 1.0);`,
      );
  };
  mat.customProgramCacheKey = () => `vehicle-wear-${mat.name}`;
  // The GLB may already have rendered with the stock program.
  mat.needsUpdate = true;
}

/** Transparent materials cast a fully opaque shadow in three.js — keep the
 * windshield from stamping a solid block onto the seats and ground. */
const NON_SHADOW_CASTERS = new Set(['Glass']);

export function tuneVehicleMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats: THREE.Material[] = Array.isArray(child.material) ? child.material : [child.material];
    child.castShadow = !mats.some((m) => NON_SHADOW_CASTERS.has(m.name));
    child.receiveShadow = true;
    for (const mat of mats) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      mat.envMapIntensity = ENV_INTENSITY[mat.name] ?? 0.8;
      const wear = WEAR[mat.name];
      if (wear) applyWear(mat, wear);
      // Sorted transparent glass must not occlude the cabin behind it.
      if (mat.transparent) mat.depthWrite = false;
    }
  });
}
