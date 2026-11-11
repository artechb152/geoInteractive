/**
 * The two prepared 3D worlds of the exercise (replayRoute.WorldKey): leg A's
 * corridor (חציית הנחל → האוכף) and leg B's (האוכף → the woodland → every
 * branch to the road and the crossing). Each is one terrain mesh with fine
 * rings over its corridor and the detailed vegetation, stones and grass along
 * all of its walked paths — whatever the learner decides, the eye only ever
 * stands and walks where its world is detailed.
 */
import type { BufferGeometry } from 'three';
import { StationTerrain, buildGrid, type TerrainGrid } from './replayTerrain';
import { scatterAsync, type Ground, type Instance } from './replayScatter';
import { buildTerrainGeometryAsync } from './scene/terrainMesh';
import { createBuildCache, type WorldKey } from './replayBuildCache';
import { LEG_A_PATHS, LEG_B_PATHS, STOP_AT } from './replayRoute';
import { distW, type W2 } from './replayWorld';

export type PreparedWorld = {
  key: WorldKey;
  anchor: W2;
  shadowRadius: number;
  terrain: StationTerrain;
  geometry: BufferGeometry;
  shrubsNear: Instance[];
  shrubsFar: Instance[];
  grass: Instance[];
  cushions: Instance[];
  stones: Instance[];
  rocks: Instance[];
};

export const WORLD_PATHS: Record<WorldKey, W2[][]> = { start: [[STOP_AT.stream]], legA: LEG_A_PATHS, legB: LEG_B_PATHS };
/** The start's world is a station: detail all round the eye, not along a corridor. */
const STATION_R = 320;

/** The circle around every walked path of a world, plus a margin. */
export function worldBounds(key: WorldKey) {
  const pts = WORLD_PATHS[key].flat();
  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
  return { center, radius: Math.max(...pts.map((p) => distW(center, p))) + 35 };
}

/**
 * The paths as one connected line for the scatter's corridor (each branch
 * joined at a shared stop, so no stretch between branches is invented).
 */
export function corridorLine(key: Exclude<WorldKey, 'start'> | 'all'): W2[] {
  const paths = key === 'all' ? [...WORLD_PATHS.legA, ...WORLD_PATHS.legB] : WORLD_PATHS[key];
  const out: W2[] = [...paths[0]];
  const left = paths.slice(1).map((p) => [...p]);
  while (left.length) {
    const end = out[out.length - 1];
    let best = 0;
    let rev = false;
    let d = Infinity;
    left.forEach((p, i) => {
      const a = distW(end, p[0]);
      const b = distW(end, p[p.length - 1]);
      if (a < d) [d, best, rev] = [a, i, false];
      if (b < d) [d, best, rev] = [b, i, true];
    });
    const next = left.splice(best, 1)[0];
    out.push(...(rev ? next.reverse() : next));
  }
  return out;
}

/** Douglas–Peucker: the corridor needs its shape, not every 3 m sample of the weave. */
export function simplify(pts: W2[], tol = 1.2): W2[] {
  if (pts.length < 3) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const L = distW(a, b) || 1;
  let worst = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((b.x - a.x) * (a.z - pts[i].z) - (a.x - pts[i].x) * (b.z - a.z)) / L;
    if (d > worst) [worst, at] = [d, i];
  }
  if (worst <= tol) return [a, b];
  return [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}

/** Every walked path of the exercise, for the scatter's clearance (the same in both worlds). */
export const CLEARANCE = simplify(corridorLine('all'));

export function createReplayPreparation() {
  let shared: Promise<{ core: TerrainGrid; coarse: TerrainGrid }> | null = null;
  return createBuildCache<PreparedWorld>(
    async (key, signal) => {
      shared ??= (async () => ({ coarse: await buildGrid(0, 0, 17000, 140, false, signal), core: await buildGrid(0, 0, 1650, 8, true, signal) }))();
      const station = key === 'start';
      const bounds = worldBounds(key);
      const anchor = bounds.center;
      const { core, coarse } = await shared;
      const local = await buildGrid(anchor.x, anchor.z, station ? STATION_R : Math.ceil((bounds.radius + 320) / 2) * 2, 2, true, signal);
      const terrain = new StationTerrain([local, core, coarse]);
      const ground: Ground = { height: (x, z) => terrain.height(x, z), road: (x, z) => terrain.road(x, z), stream: (x, z) => terrain.stream(x, z) };
      const geometry = await buildTerrainGeometryAsync(terrain, anchor.x, anchor.z, station ? 0 : bounds.radius, signal);
      const path = station ? undefined : simplify(corridorLine(key));
      // one clearance for both worlds: a shrub keeps its size when the world under the eye is swapped at the saddle
      const clearancePath = CLEARANCE;
      const build = (kind: Parameters<typeof scatterAsync>[0], band = {}) => scatterAsync(kind, anchor.x, anchor.z, ground, { ...band, path, clearancePath }, signal);
      try {
        const shrubsNear = await build('shrub', { far: 240 });
        const shrubsFar = await build('shrub', { near: 240, far: 1500, stride: 2 });
        // grass is only read within ~25 m of the eye; leg B has five branches, so its strip stays narrow
        const grass = await build('grass', { far: 24 });
        const cushions = await build('cushion');
        const stones = [...(await build('stone')), ...(await build('cobble'))];
        const rocks = [...(await build('rock')), ...(await build('rockNear'))];
        signal.throwIfAborted();
        return { key, anchor, shadowRadius: station ? 165 : bounds.radius + 165, terrain, geometry, shrubsNear, shrubsFar, grass, cushions, stones, rocks };
      } catch (error) {
        geometry.dispose();
        throw error;
      }
    },
    (world) => world.geometry.dispose(),
  );
}
