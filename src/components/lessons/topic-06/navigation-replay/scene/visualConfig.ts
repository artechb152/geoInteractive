/**
 * The replay's look in one place: the sun and the sky, the haze, the light
 * levels and every asset URL the live view loads. Everything visual reads
 * these, so the ground, the plants, the rocks and the sky stay one world.
 *
 * Assets: v2/ (2026-11-01) — the scanned plants, limestone rocks and ground
 * layers at their real size (scripts/build-navigation-replay-assets.mjs
 * --only=v2-*, scripts/blender/build_navigation_replay_v2.py). The sky
 * photograph and the far-shrub atlas are the first generation's.
 */
import { Color, SRGBColorSpace, Vector3 } from 'three';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const REPLAY_ASSETS = `${BASE}/assets/lessons/topic06/navigation-replay`;
const V2 = `${REPLAY_ASSETS}/v2`;

/** Ground layers, in the shader's order, and the width of ground each scan covers (m, Poly Haven's dimensions). */
export const GROUND_LAYERS = ['cover', 'soil', 'karst', 'gravel'] as const;
export const GROUND_TILE_M = [2.5, 2.0, 3.0, 3.0] as const;
export const GROUND_URLS = [...GROUND_LAYERS.map((l) => `${V2}/ground/${l}_albedo.jpg`), ...GROUND_LAYERS.map((l) => `${V2}/ground/${l}_normal.jpg`)];

export const SKY_URL = `${REPLAY_ASSETS}/sky.webp`;
/** Far maquis billboards: four whole scanned shrubs seen from the side, 2 × 2. */
export const FAR_SHRUB_URL = `${V2}/plants/far_shrubs.webp`;

export const PLANTS_URL = `${V2}/plants.glb`;
export const PINES_URL = `${V2}/pines.glb`;
export const ROCKS_URL = `${V2}/rocks.glb`;
/**
 * Plant textures, in this order: the scans' own atlases (their bark and twigs; the grass blades),
 * the leaf-cluster atlases the crowns are built from, and two barks.
 */
export const PLANT_TEXTURE_URLS = [
  ...['burchellii', 'lucida', 'rooibos', 'grass'].map((s) => `${V2}/plants/${s}_albedo.webp`),
  ...['maquis', 'lucida', 'dwarf', 'pine'].map((s) => `${V2}/plants/${s}_clusters.webp`),
  `${V2}/plants/oak_bark.jpg`,
  `${V2}/plants/pine_bark.jpg`,
];
export const PT = { burchellii: 0, lucida: 1, rooibos: 2, grass: 3, cMaquis: 4, cLucida: 5, cDwarf: 6, cPine: 7, oakBark: 8, pineBark: 9 } as const;
export const ROCK_COUNT = 9;
export const ROCK_TEXTURE_URLS = [
  ...Array.from({ length: ROCK_COUNT }, (_, k) => `${V2}/rocks/rock_${k}_albedo.jpg`),
  ...Array.from({ length: ROCK_COUNT }, (_, k) => `${V2}/rocks/rock_${k}_normal.jpg`),
];

/** Afternoon sun from the south-west, 50° up — where the sky photograph has it. */
export const SUN_AZ = 235;
export const SUN_EL = 50;
export const D2R = Math.PI / 180;
export const SUN_DIR = new Vector3(Math.sin(SUN_AZ * D2R) * Math.cos(SUN_EL * D2R), Math.sin(SUN_EL * D2R), -Math.cos(SUN_AZ * D2R) * Math.cos(SUN_EL * D2R));
/** The sky photo's sun sits at u = 0.588 of its width. */
export const SKY_U_OFFSET = 0.588 - SUN_AZ / 360;
/** Horizon haze (sRGB) — the sky's own colour just above the horizon. */
export const HAZE = new Color().setStyle('#bfc8d2', SRGBColorSpace);
/** Haze in the sun's direction: the forward glow of the afternoon air. */
export const HAZE_SUN = new Color().setStyle('#e2dccd', SRGBColorSpace);
export const FOG_DENSITY = 0.0001;
export const SUN_COLOR = new Color(1, 0.94, 0.86);
export const SUN_INTENSITY = 3.6;
/** Image-based sky light (the sky photograph above, sunlit ground below) — scene.environmentIntensity. */
export const ENV_INTENSITY = 0.95;
/** Ground bounce colour for the lower half of the environment (sRGB). */
export const ENV_GROUND = new Color().setStyle('#8f7f66', SRGBColorSpace);
export const EXPOSURE = 0.86;
