/**
 * onboardingTerrainField.ts — pure math describing the topic-01 onboarding
 * diorama's relief.
 *
 * Mirrors the pattern used by `landing/home/terrainField.ts`: a small set of
 * hand-placed gaussian "hills" combined into a continuous height field, then
 * re-expressed as soft stacked terraces (the project's "cut paper" look).
 * A river carves a straight cross-board trench; a travel corridor around the
 * centreline (x≈0) stays protected from ridge intrusion so the route, the
 * force markers and the low camera POVs never sit inside sculpted terrain.
 *
 * Kept side-effect free (no THREE/R3F imports) so terrain shape, path
 * heights and prop placement can all sample the same source of truth
 * (TerrainCanvas.tsx).
 */

export type FeatureBlends = {
  mountain: number;
  river: number;
  narrow: number;
};

export type FieldSample = {
  /** Final displaced height (terraces minus the river trench). */
  height: number;
  /** 0..1, 1 at the river centreline, falling off across the banks. */
  river: number;
  /** 0..1 raw normalised elevation, for height-based colour shading. */
  shade: number;
  /** 0..1, 1 directly on a terrace edge (contour line). */
  contour: number;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function smoothstep(x: number, edge0: number, edge1: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** 0 within the protected travel corridor, ramping to 1 once fully exposed. */
function corridorOpen(x: number, halfWidth: number, feather: number) {
  return smoothstep(Math.abs(x), halfWidth, halfWidth + feather);
}

/** Confines a feature's influence to a z-band so features don't bleed into each other. */
function zBand(z: number, center: number, half: number, feather: number) {
  return 1 - smoothstep(Math.abs(z - center), half, half + feather);
}

type Hill = { cx: number; cz: number; rx: number; rz: number; h: number };

function hillHeight(x: number, z: number, hill: Hill) {
  const dx = (x - hill.cx) / hill.rx;
  const dz = (z - hill.cz) / hill.rz;
  const d2 = dx * dx + dz * dz;
  return hill.h * Math.exp(-d2 * 2.6);
}

/**
 * Two cheap octaves of a "ridged" sine field — breaks up perfectly smooth
 * gaussian mounds into believable ridgelines/creases. Returns ~0..1.
 * Deliberately restrained (not multi-octave fBm) so terrain stays readable
 * and clean rather than photorealistic/noisy.
 */
function ridgeDetail(x: number, z: number) {
  const a = Math.sin(x * 2.3 + z * 1.1) * Math.cos(z * 1.7 - x * 0.9);
  const b = Math.sin(x * 4.7 - z * 3.2) * Math.cos(z * 3.9 + x * 2.3);
  return (1 - Math.abs(a)) * 0.62 + (1 - Math.abs(b)) * 0.38;
}

// Mountain (step 2) — a flanking west shoulder + a taller, tighter dominant
// east peak with a small sharp summit spike riding on top. Each side is a
// main mass plus secondary bumps so the silhouette reads as a real ridge
// with a defined crest, not one soft symmetric mound.
const MOUNTAIN_HILLS: Hill[] = [
  { cx: -1.05, cz: -0.35, rx: 1.0, rz: 1.3, h: 1.3 },
  { cx: -1.55, cz: 0.35, rx: 0.55, rz: 0.7, h: 0.68 },
  { cx: 1.2, cz: 0.55, rx: 1.1, rz: 1.4, h: 1.95 },
  { cx: 1.8, cz: -0.1, rx: 0.6, rz: 0.8, h: 0.78 },
  { cx: 1.05, cz: 0.65, rx: 0.3, rz: 0.35, h: 0.55 },
];
const MOUNTAIN_CORRIDOR_HALF = 0.4;
const MOUNTAIN_CORRIDOR_FEATHER = 0.6;

// Narrow (step 4) — two flanking ridge masses, deliberately asymmetric
// (different height/radius, plus a small inner spur each) so they read as
// irregular enclosing terrain, not repeated/mirrored geometry, and
// elongated along Z so they feel like walls, not peaks.
const NARROW_HILLS: Hill[] = [
  { cx: -1.15, cz: -2.15, rx: 0.7, rz: 1.6, h: 1.55 },
  { cx: -1.65, cz: -2.75, rx: 0.48, rz: 0.85, h: 0.75 },
  { cx: -0.85, cz: -1.6, rx: 0.4, rz: 0.55, h: 0.5 },
  { cx: 1.05, cz: -2.3, rx: 0.65, rz: 1.5, h: 1.75 },
  { cx: 1.55, cz: -1.7, rx: 0.4, rz: 0.6, h: 0.65 },
  { cx: 0.8, cz: -2.85, rx: 0.35, rz: 0.5, h: 0.55 },
];
const NARROW_CORRIDOR_HALF = 0.38;
const NARROW_CORRIDOR_FEATHER = 0.5;
const NARROW_Z_CENTER = -2.3;
const NARROW_Z_HALF = 1.05;
const NARROW_Z_FEATHER = 0.6;

export const RIVER_Z = 1.9;
const RIVER_HALF = 1.05;
const RIVER_BANK = 0.4;
const RIVER_TRENCH_DEPTH = 0.26;

function baseUndulation(x: number, z: number) {
  return Math.sin(x * 0.85 + 0.6) * 0.022 + Math.sin(z * 0.65 - 0.4) * 0.018;
}

const LAYER_HEIGHT = 0.19;
const TERRACE_SOFTNESS = 0.3;
export const TERRAIN_MAX_HEIGHT = 2.6;

function terrace(h: number) {
  const scaled = h / LAYER_HEIGHT;
  const i = Math.floor(scaled);
  const f = scaled - i;
  let shaped: number;
  if (f < TERRACE_SOFTNESS) shaped = 0;
  else if (f > 1 - TERRACE_SOFTNESS) shaped = 1;
  else shaped = (f - TERRACE_SOFTNESS) / (1 - 2 * TERRACE_SOFTNESS);
  const eased = shaped * shaped * (3 - 2 * shaped);
  return (i + eased) * LAYER_HEIGHT;
}

function contourIntensity(rawHeight: number, river: number) {
  const t = rawHeight / LAYER_HEIGHT;
  const frac = t - Math.floor(t);
  const distToBoundary = Math.min(frac, 1 - frac);
  const line = 1 - smoothstep(distToBoundary, 0, 0.07);
  return line * (1 - river);
}

export function sampleOnboardingField(x: number, z: number, blends: FeatureBlends): FieldSample {
  // Ridge/crease modulation — scales EXISTING elevation by ±detail so bare
  // sand stays perfectly flat/smooth while raised terrain gets a sculpted,
  // less-uniformly-round silhouette.
  const detail = 0.72 + 0.36 * ridgeDetail(x * 1.3, z * 1.3);

  const corridorMtn = corridorOpen(x, MOUNTAIN_CORRIDOR_HALF, MOUNTAIN_CORRIDOR_FEATHER);
  let mtnRaw = 0;
  for (const hill of MOUNTAIN_HILLS) mtnRaw += hillHeight(x, z, hill);
  mtnRaw *= detail * blends.mountain * corridorMtn;

  const corridorNarrow = corridorOpen(x, NARROW_CORRIDOR_HALF, NARROW_CORRIDOR_FEATHER);
  const narrowZMask = zBand(z, NARROW_Z_CENTER, NARROW_Z_HALF, NARROW_Z_FEATHER);
  let narrowRaw = 0;
  for (const hill of NARROW_HILLS) narrowRaw += hillHeight(x, z, hill);
  narrowRaw *= detail * blends.narrow * corridorNarrow * narrowZMask;

  const rawHeight = Math.max(0, baseUndulation(x, z) + mtnRaw + narrowRaw);
  const terraced = terrace(rawHeight);

  const riverZMask = zBand(z, RIVER_Z, RIVER_HALF, RIVER_BANK);
  const river = blends.river * riverZMask;
  const height = terraced - river * RIVER_TRENCH_DEPTH;

  const shade = clamp01(terraced / TERRAIN_MAX_HEIGHT);
  const contour = contourIntensity(rawHeight, river);

  return { height, river, shade, contour };
}
