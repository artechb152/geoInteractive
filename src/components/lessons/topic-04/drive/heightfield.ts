import * as THREE from 'three';
import type { SoilConfig } from './terrainConfigs';
import { CALM_BLEND_RADIUS, CALM_START_RADIUS, TILE_HALF_SIZE } from './terrainConfigs';

/**
 * Self-contained deterministic value-noise (no external noise dependency —
 * keeps this lab's JS payload small). Good enough for stylized terrain
 * relief; not meant to be a general-purpose noise library.
 */
function hash(ix: number, iz: number, seed: number): number {
  let h = ix * 374761393 + iz * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise2D(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const z1 = z0 + 1;
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);
  const v00 = hash(x0, z0, seed);
  const v10 = hash(x1, z0, seed);
  const v01 = hash(x0, z1, seed);
  const v11 = hash(x1, z1, seed);
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * tz; // 0..1
}

function fbm(x: number, z: number, seed: number, octaves: number, lacunarity = 2, gain = 0.5): number {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(x * frequency, z * frequency, seed + i * 101) * amplitude;
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / norm; // 0..1
}

/** Fixed shallow depressions ("puddles") for the mud terrain — deterministic positions. */
const PUDDLES: Array<[number, number, number]> = [
  [5, -6, 3.2],
  [-8, 4, 2.6],
  [3, 10, 2.2],
  [-4, -12, 2.8],
  [11, 3, 2.0],
];

function terrainFeatureHeight(soil: SoilConfig, x: number, z: number): number {
  const { style, macroAmplitude, macroFrequency, detailAmplitude } = soil.height;
  const seed = style === 'ledges' ? 11 : style === 'terraces' ? 22 : style === 'dunes' ? 33 : 44;

  const macro = fbm(x * macroFrequency, z * macroFrequency, seed, 4) * 2 - 1; // -1..1
  const detail = (fbm(x * 0.9, z * 0.9, seed + 500, 2) * 2 - 1) * detailAmplitude;

  if (style === 'ledges') {
    // Hard rock: quantize the macro shape into stepped ledges + sharp sparse boulders.
    const raw = macro * macroAmplitude;
    const stepSize = 0.45;
    const stepped = Math.round(raw / stepSize) * stepSize;
    const boulder = Math.max(0, fbm(x * 0.35, z * 0.35, 900, 2) - 0.72) * 3.2;
    return stepped * 0.7 + raw * 0.3 + detail + boulder;
  }

  if (style === 'terraces') {
    const raw = macro * macroAmplitude;
    const bandSize = 0.32;
    const terrace = Math.round(raw / bandSize) * bandSize;
    return terrace * 0.55 + raw * 0.45 + detail;
  }

  if (style === 'dunes') {
    const ridge = Math.sin(x * 0.11 + Math.sin(z * 0.05) * 1.4) * macroAmplitude * 0.6;
    const ripple = Math.sin(x * 0.9 + z * 0.35) * 0.04;
    return macro * macroAmplitude * 0.6 + ridge + detail + ripple;
  }

  // ruts (mud/loess): mostly flat, shallow puddle depressions + two tire-rut grooves.
  let h = macro * macroAmplitude * 0.4 + detail * 0.6;
  for (const [px, pz, pr] of PUDDLES) {
    const d = Math.hypot(x - px, z - pz);
    if (d < pr) h -= (1 - smoothstep(d / pr)) * 0.22;
  }
  const rutOffset = 1.3;
  for (const rx of [-rutOffset, rutOffset]) {
    const d = Math.abs(x - rx - Math.sin(z * 0.08) * 1.5);
    if (d < 0.5) h -= (1 - smoothstep(d / 0.5)) * 0.14;
  }
  return h;
}

/**
 * World-space height sampler for a soil type. Shared by both the render
 * geometry and the vehicle controller's per-wheel contact sampling, so what
 * you see is exactly what you drive on.
 *
 * A calm, near-flat disc around the spawn point blends into the terrain's
 * full character further out, per the brief's "feel the terrain first, then
 * its unique features" requirement.
 */
export function createHeightSampler(soil: SoilConfig) {
  return function heightAt(x: number, z: number): number {
    const dist = Math.hypot(x, z);
    const full = terrainFeatureHeight(soil, x, z);
    if (dist <= CALM_START_RADIUS) return full * 0.08;
    if (dist >= CALM_BLEND_RADIUS) return full;
    const t = smoothstep((dist - CALM_START_RADIUS) / (CALM_BLEND_RADIUS - CALM_START_RADIUS));
    return full * (0.08 + t * 0.92);
  };
}

export type HeightSampler = ReturnType<typeof createHeightSampler>;

/** Central difference surface normal, used for suspension pitch/roll and slope-based slip. */
export function sampleNormal(heightAt: HeightSampler, x: number, z: number, eps = 0.35): THREE.Vector3 {
  const hL = heightAt(x - eps, z);
  const hR = heightAt(x + eps, z);
  const hD = heightAt(x, z - eps);
  const hU = heightAt(x, z + eps);
  const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
  return normal;
}

const SEGMENTS = 96;

export function buildTerrainGeometry(heightAt: HeightSampler): THREE.BufferGeometry {
  const size = TILE_HALF_SIZE * 2;
  const geometry = new THREE.PlaneGeometry(size, size, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
