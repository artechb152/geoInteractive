/**
 * The 3D terrain mesh as plain arrays (no three.js), so scripts/qa/terrain-nav.test.mjs
 * checks the very vertices the model draws against the contours.
 *
 * Inside the mapped sheet the vertices are exactly the 5 m height-grid samples
 * (the contours' source); outside, an apron of the same generator whose spacing
 * grows to the hazy horizon. Every cell is split along its SW–NE diagonal, the
 * split heightAt() interpolates on.
 */
import { WORLD_BOUNDS } from './terrainNavScenario';
import { toWorld3 } from './terrainNavGeometry';
import { GRID, heightField, heightGrid, insideSheet, meshAxis } from './terrainNavTerrain';

/** How far the apron reaches beyond the sheet, metres. */
export const APRON_M = 9000;

export function terrainMeshArrays() {
  const xs = meshAxis(WORLD_BOUNDS.minE, WORLD_BOUNDS.maxE, APRON_M);
  const ns = meshAxis(WORLD_BOUNDS.minN, WORLD_BOUNDS.maxN, APRON_M);
  const nx = xs.length;
  const ny = ns.length;
  const g = heightGrid();
  const positions = new Float32Array(nx * ny * 3);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const E = xs[i];
      const N = ns[j];
      const h = insideSheet(E, N) ? g[Math.round(N / GRID.stepM) * GRID.nE + Math.round(E / GRID.stepM)] : heightField(E, N);
      positions.set(toWorld3(E, N, h), (j * nx + i) * 3);
    }
  }
  const index = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let k = 0;
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i; // SW
      const b = a + 1; // SE
      const c = a + nx + 1; // NE
      const d = a + nx; // NW
      index.set([a, b, c, a, c, d], k);
      k += 6;
    }
  }
  return { positions, index, nx, ny, xs, ns };
}
