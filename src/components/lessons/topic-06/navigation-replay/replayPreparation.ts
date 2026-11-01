import type { BufferGeometry } from 'three';
import { StationTerrain, buildGrid, type TerrainGrid } from './replayTerrain';
import { scatterAsync, type Ground, type Instance } from './replayScatter';
import { buildTerrainGeometryAsync } from './scene/terrainMesh';
import { createBuildCache, type WorldKey } from './replayBuildCache';
import { APPROACH_POINTS, approachBounds } from './replayWalk';
import { momentById } from './replayScenario';
import { toWorld, type W2 } from './replayWorld';
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
export function createReplayPreparation() {
    let shared: Promise<{
        core: TerrainGrid;
        coarse: TerrainGrid;
    }> | null = null;
    return createBuildCache<PreparedWorld>(async (key, signal) => {
        shared ??= (async () => ({ coarse: await buildGrid(0, 0, 17000, 140, false, signal), core: await buildGrid(0, 0, 1650, 8, true, signal) }))();
        const corridor = key === 'approach';
        const bounds = approachBounds();
        const anchor = corridor ? bounds.center : toWorld(momentById(key === 'after' ? 'after' : 'depart').truth.at);
        const { core, coarse } = await shared;
        const local = await buildGrid(anchor.x, anchor.z, corridor ? Math.ceil((bounds.radius + 320) / 2) * 2 : 320, 2, true, signal);
        const terrain = new StationTerrain([local, core, coarse]);
        const ground: Ground = { height: (x, z) => terrain.height(x, z), road: (x, z) => terrain.road(x, z), stream: (x, z) => terrain.stream(x, z) };
        const geometry = await buildTerrainGeometryAsync(terrain, anchor.x, anchor.z, corridor ? bounds.radius : 0, signal);
        const path = corridor ? APPROACH_POINTS : undefined;
        const clearancePath = key === 'after' ? undefined : APPROACH_POINTS;
        const build = (kind: Parameters<typeof scatterAsync>[0], band = {}) => scatterAsync(kind, anchor.x, anchor.z, ground, { ...band, path, clearancePath }, signal);
        try {
            const shrubsNear = await build('shrub', { far: 240 });
            const shrubsFar = await build('shrub', { near: 240, far: 1500, stride: 2 });
            const grass = await build('grass'), cushions = await build('cushion');
            const stones = [...await build('stone'), ...await build('cobble')];
            const rocks = [...await build('rock'), ...await build('rockNear')];
            signal.throwIfAborted();
            return { key, anchor, shadowRadius: corridor ? bounds.radius + 165 : 165, terrain, geometry, shrubsNear, shrubsFar, grass, cushions, stones, rocks };
        }
        catch (error) {
            geometry.dispose();
            throw error;
        }
    }, world => world.geometry.dispose());
}
