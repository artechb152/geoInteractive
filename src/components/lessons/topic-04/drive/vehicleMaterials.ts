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
  PaintedMetal: 0.85,
  Rim: 0.7,
  BareMetal: 1.1,
  Mirror: 1.2,
  Glass: 1.4,
  LightLens: 1.0,
  TailLight: 0.9,
  Tire: 0.3,
  TireTread: 0.22,
  Canvas: 0.25,
};

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
      // Sorted transparent glass must not occlude the cabin behind it.
      if (mat.transparent) mat.depthWrite = false;
    }
  });
}
