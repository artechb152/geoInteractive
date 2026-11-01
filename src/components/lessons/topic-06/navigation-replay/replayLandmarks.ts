/** Stable, metric landmark positions shared with the planning lab. */
import { trees, crownShape } from '../planning-lab/planningLabTerrain';
export const replayTrees = () => trees().map(t => ({
    ...t, x: t.E - 500, z: 600 - t.N, crown: crownShape(t),
}));
