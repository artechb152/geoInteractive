import * as THREE from 'three';
import type { SoilConfig } from './terrainConfigs';
import { TILE_HALF_SIZE } from './terrainConfigs';
import { createLandformHeight } from './landforms';

/**
 * World-space height sampler for a soil type. Shared by the render geometry,
 * the vehicle controller's per-wheel contact sampling, the chase camera and
 * the contact shadow, so what you see is exactly what you drive on.
 *
 * The shape itself is authored in landforms.ts (large landforms → medium
 * soil structure → small detail, with the shared route network cut in).
 * Near the spawn point only the medium/small detail is calmed. The large
 * forms stay, so the first view already has real hills in it (the brief's
 * "feel the terrain first, then its unique features").
 */
export function createHeightSampler(soil: SoilConfig) {
  return createLandformHeight(soil.height);
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

/** Playable-tile grid resolution per side: ~0.25 m spacing, fine enough for
 * ledge risers, boulders and wheel ruts to render as they're felt. */
const SEGMENTS = 176;

/** Visual-only ground beyond the playable tile (m, half-size) — carries the
 * terrain out into the fog so the chase camera never sees a hard world edge.
 * The vehicle's soft boundary push still keeps it inside TILE_HALF_SIZE. */
export const APRON_HALF_SIZE = 72;
const APRON_FIRST_STEP = 0.6;
const APRON_GROWTH = 1.18;

/**
 * Grid-line coordinates along one axis: the playable tile keeps its original
 * uniform density, then spacing grows geometrically out to the apron edge
 * (distant ground is fogged, so it doesn't need the detail). A tensor grid of
 * these lines has no T-junctions, so there are no cracks at the tile edge.
 */
function axisLines(): number[] {
  const inner: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) inner.push(-TILE_HALF_SIZE + (i / SEGMENTS) * TILE_HALF_SIZE * 2);
  const outer: number[] = [];
  let step = APRON_FIRST_STEP;
  let at = TILE_HALF_SIZE;
  while (at < APRON_HALF_SIZE) {
    at = Math.min(APRON_HALF_SIZE, at + step);
    outer.push(at);
    step *= APRON_GROWTH;
  }
  return [...outer.map((v) => -v).reverse(), ...inner, ...outer];
}

export function buildTerrainGeometry(heightAt: HeightSampler): THREE.BufferGeometry {
  const size = TILE_HALF_SIZE * 2;
  const lines = axisLines();
  const n = lines.length;
  const positions = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = lines[i];
      const z = lines[j];
      const k = j * n + i;
      positions[k * 3] = x;
      positions[k * 3 + 1] = heightAt(x, z);
      positions[k * 3 + 2] = z;
      // Same UV mapping the original tile-sized PlaneGeometry had, extended
      // past 0..1 — RepeatWrapping keeps texel density identical everywhere.
      uvs[k * 2] = x / size + 0.5;
      uvs[k * 2 + 1] = 0.5 - z / size;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
