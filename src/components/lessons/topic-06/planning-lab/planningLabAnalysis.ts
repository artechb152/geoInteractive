/**
 * What the shape of the land says about its ground — read off the lab's one
 * height grid, so the model's ground follows the relief the map draws:
 *
 *   sky      how much of the sky a point sees (sky-view factor, 12 directions
 *            out to ~300 m): ~1 on crests and summits, less in the hollows,
 *            the ravine and the stream valley — their ambient light
 *   drain    where water gathers: multiple-flow accumulation down the grid,
 *            on a log scale — the dendritic lines of rills and gullies
 *   wet      the wetness index ln(area / slope): high in hollows and on gentle
 *            ground below long slopes, low on crests and steep faces
 *   rock     where the limestone breaks through: the outcrop noise boulders()
 *            draws its boulders from (and only the steepest slopes besides),
 *            so the ground's rock lies under the model's stones
 *
 * One grid over the tone map's ground (the sheet and 300 m around it), every
 * 5 m: exactly the height grid on the sheet, the tone grid's heights (10 m)
 * around it. No three.js; the result is memoised.
 */
import { GRID, TONE, heightGrid, insideSheet, toneGrid } from './planningLabTerrain';
import { WORLD } from './planningLabWorld';
import { valueNoise } from '../terrain-nav/terrainNavTerrain';

/** The analysis grid: samples at E = minE + 5·i, N = minN + 5·j (i ≤ nE − 1, j ≤ nN − 1), aligned with the height grid. */
export const ANALYSIS = { minE: TONE.minE, minN: TONE.minN, stepM: 5, nE: (TONE.nE * TONE.stepM) / 5 + 1, nN: (TONE.nN * TONE.stepM) / 5 + 1 } as const;

export type TerrainAnalysis = { readonly sky: Float32Array; readonly drain: Float32Array; readonly wet: Float32Array; readonly rock: Float32Array };

/** Heights on the analysis grid. */
function analysisHeights(): Float32Array {
  const { nE, nN, stepM, minE, minN } = ANALYSIS;
  const g = heightGrid();
  const tone = toneGrid().height;
  const out = new Float32Array(nE * nN);
  const toneAt = (E: number, N: number) => {
    // the tone samples sit at cell centres (+5 m)
    const fx = Math.min(TONE.nE - 1.001, Math.max(0, (E - TONE.minE) / TONE.stepM - 0.5));
    const fy = Math.min(TONE.nN - 1.001, Math.max(0, (N - TONE.minN) / TONE.stepM - 0.5));
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = fx - i;
    const v = fy - j;
    const a = tone[j * TONE.nE + i];
    const b = tone[j * TONE.nE + i + 1];
    const c = tone[(j + 1) * TONE.nE + i];
    const d = tone[(j + 1) * TONE.nE + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  for (let j = 0; j < nN; j++) {
    for (let i = 0; i < nE; i++) {
      const E = minE + i * stepM;
      const N = minN + j * stepM;
      out[j * nE + i] = insideSheet(E, N) ? g[Math.round(N / GRID.stepM) * GRID.nE + Math.round(E / GRID.stepM)] : toneAt(E, N);
    }
  }
  // Around the sheet the 10 m tone heights are bilinear patches whose kinks would print as a grid of
  // false slopes and pools: smoothed there (two 3 × 3 box passes), eased into the sheet's exact grid over 30 m.
  const blur = Float32Array.from(out);
  const tmp = new Float32Array(out.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < nN; j++)
      for (let i = 0; i < nE; i++) tmp[j * nE + i] = (blur[j * nE + Math.max(0, i - 1)] + blur[j * nE + i] + blur[j * nE + Math.min(nE - 1, i + 1)]) / 3;
    for (let j = 0; j < nN; j++)
      for (let i = 0; i < nE; i++) blur[j * nE + i] = (tmp[Math.max(0, j - 1) * nE + i] + tmp[j * nE + i] + tmp[Math.min(nN - 1, j + 1) * nE + i]) / 3;
  }
  for (let j = 0; j < nN; j++) {
    for (let i = 0; i < nE; i++) {
      const E = minE + i * stepM;
      const N = minN + j * stepM;
      const inside = Math.min(E - WORLD.minE, WORLD.maxE - E, N - WORLD.minN, WORLD.maxN - N);
      const k = Math.min(1, Math.max(0, inside / 30));
      out[j * nE + i] = blur[j * nE + i] + (out[j * nE + i] - blur[j * nE + i]) * k;
    }
  }
  return out;
}

/** Sky-view factor on every second sample (10 m), filled in between. */
function skyView(h: Float32Array): Float32Array {
  const { nE, nN, stepM } = ANALYSIS;
  const DIRS = 12;
  const radii: number[] = [];
  for (let r = 7.5; r < 320; r *= 1.38) radii.push(r / stepM);
  const dirs = Array.from({ length: DIRS }, (_, k) => [Math.cos(((k + 0.5) / DIRS) * Math.PI * 2), Math.sin(((k + 0.5) / DIRS) * Math.PI * 2)]);
  const at = (x: number, y: number) => {
    const fx = Math.min(nE - 1.001, Math.max(0, x));
    const fy = Math.min(nN - 1.001, Math.max(0, y));
    const i = fx | 0;
    const j = fy | 0;
    const u = fx - i;
    const v = fy - j;
    const k = j * nE + i;
    const a = h[k];
    const b = h[k + 1];
    const c = h[k + nE];
    const d = h[k + nE + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const out = new Float32Array(nE * nN);
  for (let j = 0; j < nN; j += 2) {
    for (let i = 0; i < nE; i += 2) {
      const h0 = h[j * nE + i];
      let open = 0;
      for (const [dx, dy] of dirs) {
        // the steepest elevation angle of the ground along this direction
        let best = 0;
        for (const r of radii) {
          const t = (at(i + dx * r, j + dy * r) - h0) / (r * stepM);
          if (t > best) best = t;
        }
        // the sky above that horizon, cosine-weighted: 1 − sin²(angle)
        open += 1 / (1 + best * best);
      }
      out[j * nE + i] = open / DIRS;
    }
  }
  // the odd samples: the mean of their even neighbours
  for (let j = 0; j < nN; j++) {
    for (let i = 0; i < nE; i++) {
      if (i % 2 === 0 && j % 2 === 0) continue;
      const i0 = i - (i % 2);
      const j0 = j - (j % 2);
      const i1 = Math.min(nE - 1 - ((nE - 1) % 2), i0 + 2);
      const j1 = Math.min(nN - 1 - ((nN - 1) % 2), j0 + 2);
      const u = i % 2 ? 0.5 : 0;
      const v = j % 2 ? 0.5 : 0;
      const a = out[j0 * nE + i0];
      const b = out[j0 * nE + i1];
      const c = out[j1 * nE + i0];
      const d = out[j1 * nE + i1];
      out[j * nE + i] = a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
  }
  return out;
}

/** Multiple-flow accumulation (Freeman: to every lower neighbour, weighted by slope³), in samples of upslope area. */
function flow(h: Float32Array): Float32Array {
  const { nE, nN, stepM } = ANALYSIS;
  const n = nE * nN;
  const order = new Uint32Array(n);
  for (let k = 0; k < n; k++) order[k] = k;
  order.sort((a, b) => h[b] - h[a]);
  const acc = new Float32Array(n).fill(1);
  const NB = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];
  const w = new Float32Array(8);
  for (let o = 0; o < n; o++) {
    const k = order[o];
    const i = k % nE;
    const j = (k - i) / nE;
    let sum = 0;
    for (let q = 0; q < 8; q++) {
      const ii = i + NB[q][0];
      const jj = j + NB[q][1];
      w[q] = 0;
      if (ii < 0 || jj < 0 || ii >= nE || jj >= nN) continue;
      const drop = (h[k] - h[jj * nE + ii]) / (NB[q][2] * stepM);
      if (drop > 0) {
        w[q] = drop * drop * drop;
        sum += w[q];
      }
    }
    if (sum <= 0) continue;
    for (let q = 0; q < 8; q++) if (w[q] > 0) acc[(j + NB[q][1]) * nE + i + NB[q][0]] += (acc[k] * w[q]) / sum;
  }
  return acc;
}

let cache: TerrainAnalysis | null = null;
export function terrainAnalysis(): TerrainAnalysis {
  if (!cache) {
    const { nE, nN, stepM } = ANALYSIS;
    const h = analysisHeights();
    const sky = skyView(h);
    const acc = flow(h);
    const drain = new Float32Array(nE * nN);
    const wet = new Float32Array(nE * nN);
    const rock = new Float32Array(nE * nN);
    const lo = Math.log(25);
    const hi = Math.log(4000);
    for (let j = 0; j < nN; j++) {
      for (let i = 0; i < nE; i++) {
        const k = j * nE + i;
        const a = acc[k];
        drain[k] = Math.min(1, Math.max(0, (Math.log(a) - lo) / (hi - lo)));
        const hx = (h[j * nE + Math.min(nE - 1, i + 1)] - h[j * nE + Math.max(0, i - 1)]) / (2 * stepM);
        const hy = (h[Math.min(nN - 1, j + 1) * nE + i] - h[Math.max(0, j - 1) * nE + i]) / (2 * stepM);
        const tanB = Math.max(0.02, Math.hypot(hx, hy));
        // ln(a · cell / tan β): ~2 on crests and steep faces … ~10 in the valley floors
        wet[k] = Math.min(1, Math.max(0, (Math.log((a * stepM) / tanB) - 4) / 6));
        // boulders()' outcrop noise (its boulders cluster where it passes 0.55), and the steepest faces
        const E = ANALYSIS.minE + i * stepM;
        const N = ANALYSIS.minN + j * stepM;
        const outcrop = 0.5 + 0.5 * valueNoise(E / 30 - 4.1, N / 30 + 2.6);
        rock[k] = Math.min(1, Math.max(0, outcrop - 0.55) * 2.4 + Math.max(0, tanB - 0.32) * 1.2);
      }
    }
    cache = { sky, drain, wet, rock };
  }
  return cache;
}
