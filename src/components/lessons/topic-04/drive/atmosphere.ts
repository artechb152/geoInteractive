import * as THREE from 'three';
import type { SoilConfig, SoilId } from './terrainConfigs';

/**
 * Lighting + atmosphere for the trafficability driving lab.
 *
 * One fixed late-afternoon sun is shared by every terrain, so shadows always
 * fall the same way and switching soils compares ground, not weather. Each
 * soil only shifts the *mood* (haze density, sky tint, sun warmth) inside
 * the site's palette family — cream haze, warm earth bounce, sage sky,
 * muted-orange sunlight. Never cinematic-dark: shadow side stays ~40% of the
 * lit side so every surface remains readable.
 */

/** Sun elevation above the horizon (deg) — low enough that hills and
 * depressions cast long, readable shadows; high enough to stay daylight. */
const SUN_ELEVATION_DEG = 26;
/** Sun azimuth (deg) measured from +Z (the spawn driving direction) toward
 * +X (screen-left of the spawn chase camera). 105° = raking side light from
 * slightly behind-left. The chase camera sits off the vehicle's left
 * (chaseCamera.ts `lateral`), so the flank it sees is fully sunlit and the
 * tailgate still catches some sun. Hills cast their shadows across the view
 * (to the right and slightly ahead), which reveals the relief in full
 * length. A front light would leave camera-facing slopes and the vehicle's
 * rear in shade. The sun's glow comes into view when driving toward it. */
const SUN_AZIMUTH_DEG = 105;

/** Unit vector pointing TOWARD the sun (world space). */
export const SUN_DIRECTION = (() => {
  const el = THREE.MathUtils.degToRad(SUN_ELEVATION_DEG);
  const az = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
})();

type AtmosphereLighting = {
  /** Direct sunlight intensity (three.js physical units). */
  sunIntensity: number;
  /** Strength of the forward-scatter glow around the sun in the sky. */
  glow: number;
  /** FogExp2 density — higher = hazier; background loses contrast sooner. */
  haze: number;
  /** Sky (IBL) fill strength — softens shadows without flattening form. */
  skyFill: number;
};

/** Per-soil light levels. All four stay in one warm late-afternoon family;
 * mud is the humid, hazier, softer-shadowed day after rain — muted, never
 * gloomy. On flat ground the shadow side is ≈40% of the lit side (mud
 * ≈55%, softer under humid haze).
 *
 * Haze: ground is ~25% fogged at 20 m, ~65% at 45 m and ~94% at 70 m, so the
 * visual apron's far edge (heightfield APRON_HALF_SIZE, 72 m) is mostly gone
 * even when the camera stands at the tile edge. */
const LIGHTING: Record<SoilId, AtmosphereLighting> = {
  hard: { sunIntensity: 3.4, glow: 0.55, haze: 0.024, skyFill: 0.7 },
  soft: { sunIntensity: 3.3, glow: 0.6, haze: 0.025, skyFill: 0.72 },
  // Pale sand already reflects a lot — slightly less sun keeps it off white.
  sand: { sunIntensity: 3.0, glow: 0.7, haze: 0.023, skyFill: 0.64 },
  mud: { sunIntensity: 2.5, glow: 0.4, haze: 0.031, skyFill: 0.9 },
};

export type AtmosphereMood = AtmosphereLighting & {
  /** Sky colour straight up. */
  zenith: string;
  /** Horizon haze. Also the fog colour (and HorizonBackdrop's base colour),
   * so distant terrain dissolves into the sky with no visible seam. */
  horizon: string;
  /** Lower hemisphere of the sky dome — only seen by the baked IBL, where it
   * acts as warm ground-bounce fill on undersides (vehicle, overhangs). */
  ground: string;
  /** Direct sunlight colour. */
  sun: string;
};

/** Colours come from the soil's `visual` palette (shared with
 * HorizonBackdrop's ridge tints); light levels from the table above. */
export function getAtmosphere(soil: SoilConfig): AtmosphereMood {
  const { fog, sky, ambient, sun } = soil.visual;
  return { ...LIGHTING[soil.id], zenith: sky, horizon: fog, ground: ambient, sun };
}

/** Warm umber used for ambient occlusion + the vehicle contact shadow, so
 * crevices read as shaded earth rather than grey/black. */
export const OCCLUSION_TINT = '#3d2f20';

/** Directional-light shadow coverage: a square (m) centred ahead of the chase
 * camera, following it. The terrain casts too (hill shadows), so the box
 * reaches ~41 m ahead, where the haze is already ~65%, and a hill's shadow
 * doesn't visibly stop at the box edge. 52m / 2048px ≈ 2.5cm texels, still
 * crisp under the vehicle. */
export const SHADOW_HALF_EXTENT = 26;
export const SHADOW_MAP_SIZE = 2048;
/** How far ahead of the camera (m, horizontal) the shadow box is centred. */
export const SHADOW_FOCUS_AHEAD = 15;

/** Sky dome radius (m). The dome follows the camera, so it only has to sit
 * inside the camera's far plane (170, DriveCanvas) and outside the farthest
 * HorizonBackdrop ridge as seen from anywhere on the tile (~146). */
export const SKY_RADIUS = 160;
