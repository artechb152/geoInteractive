/** The replay follows the planning lab's fixed example. Free edits in the lab
 * remain free edits; they never silently change this narrated reconstruction. */
import { exampleNodes } from '../planning-lab/planningLabState';
import { roadOf, summitOf, waterCourses } from '../planning-lab/planningLabTerrain';
import { DEST, START as LAB_START, type Point } from '../planning-lab/planningLabWorld';
export type Pt = {
    x: number;
    y: number;
};
export const M_PER_UNIT = 25;
export const VB_W = 100, VB_H = 75;
/** Includes the full stream fix ring and its label, at the map panel aspect. */
export const REPLAY_MAP_VIEW = { x: 24.5, y: 19, w: 60, h: 34 } as const;
export const fromLab = (p: Point): Pt => ({ x: 30 + p.E / M_PER_UNIT, y: 61.5 - p.N / M_PER_UNIT });
export const toLab = (p: Pt): Point => ({ E: (p.x - 30) * M_PER_UNIT, N: (61.5 - p.y) * M_PER_UNIT });
export const fx = (n: number) => Math.round(n * 100) / 100;
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const bearing = (a: Pt, b: Pt) => (Math.atan2(b.x - a.x, a.y - b.y) * 180 / Math.PI + 360) % 360;
export const EXAMPLE_NODES = exampleNodes();
const checkpoint = (feature: string) => EXAMPLE_NODES.find(n => n.feature === feature)!;
export const START = fromLab(LAB_START), END = fromLab(DEST);
export const P1 = fromLab(checkpoint('stream')), P2 = fromLab(checkpoint('saddle')), P3 = fromLab(checkpoint('road'));
export const POINTS = [START, P1, P2, P3, END];
const indices = [0, ...['stream', 'saddle', 'road'].map(f => EXAMPLE_NODES.indexOf(checkpoint(f))), EXAMPLE_NODES.length - 1];
export const LEG_PATHS = indices.slice(0, -1).map((i, k) => EXAMPLE_NODES.slice(i, indices[k + 1] + 1).map(fromLab));
export const pathLength = (ps: readonly Pt[]) => ps.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - ps[i].x, p.y - ps[i].y) * M_PER_UNIT, 0);
export const TIP_LEGS = LEG_PATHS.map(ps => ({ az: bearing(ps[0], ps.at(-1)!), m: Math.round(pathLength(ps) / 50) * 50, lengthM: pathLength(ps) }));
export function pointOnLeg(k: number, t: number): Pt {
    const ps = LEG_PATHS[k];
    let remaining = TIP_LEGS[k].lengthM * Math.max(0, Math.min(1, t));
    for (let i = 1; i < ps.length; i++) {
        const d = pathLength([ps[i - 1], ps[i]]);
        if (remaining <= d)
            return lerp(ps[i - 1], ps[i], remaining / d);
        remaining -= d;
    }
    return ps.at(-1)!;
}
const mapLine = (pts: readonly (readonly number[])[]) => pts.map(([E, N]) => fromLab({ E, N }));
export const STREAM_POINTS = mapLine(waterCourses().stream.pts);
export const RAVINE_POINTS = mapLine(waterCourses().ravine.pts);
export const ROAD_POINTS = mapLine(roadOf('road').pts);
export const pathD = (ps: readonly Pt[]) => ps.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
export const STREAM = pathD(STREAM_POINTS), ROAD = pathD(ROAD_POINTS), RAVINE = pathD(RAVINE_POINTS);
export const SUMMIT_N = fromLab(summitOf('peak-east')), SUMMIT_S = fromLab(summitOf('peak-west'));
export function summitLook(at: Pt): number {
    const a = bearing(at, SUMMIT_S), b = bearing(at, SUMMIT_N);
    return (a + ((b - a + 540) % 360 - 180) / 2 + 360) % 360;
}
