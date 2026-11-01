/** Accelerated, ground-level replay of the known approach. The hidden drift
 * is deliberately a time cut: an animated westward turn would give it away. */
import { LEG_PATHS } from './replayGeography';
import { momentById, type MomentId } from './replayScenario';
import { bearingW, distW, nearestOn, polyline, toWorld, turnDeg, type Polyline, type W2 } from './replayWorld';
import type { Look } from './replayViewStore';
export type WalkPlan = {
    from: MomentId;
    to: MomentId;
    route: Polyline;
    durationMs: number;
};
const approach = polyline(LEG_PATHS[1].map(toWorld));
export const APPROACH_POINTS = [toWorld(momentById('depart').truth.at), ...approach.pts.slice(1)];
function atDistance(route: Polyline, distance: number) {
    for (let i = 1; i < route.pts.length; i++) {
        if (distance <= route.cum[i] || i === route.pts.length - 1) {
            const a = route.pts[i - 1], b = route.pts[i];
            const t = Math.max(0, Math.min(1, (distance - route.cum[i - 1]) / (route.cum[i] - route.cum[i - 1] || 1)));
            return { at: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, yawDeg: bearingW(a, b) };
        }
    }
    return { at: route.pts[0], yawDeg: 0 };
}
export function walkPlan(from: MomentId, to: MomentId): WalkPlan | null {
    if (!(from === 'depart' && to === 'enroute') && !(from === 'enroute' && to === 'saddle'))
        return null;
    const a = toWorld(momentById(from).truth.at), b = toWorld(momentById(to).truth.at);
    const start = nearestOn(approach, a).s, end = nearestOn(approach, b).s;
    const points = [a, ...approach.pts.filter((_, i) => approach.cum[i] > start + 1e-6 && approach.cum[i] < end - 1e-6), b];
    const route = polyline(points);
    return { from, to, route, durationMs: Math.max(2800, Math.min(6500, route.length * 22)) };
}
export const sampleWalk = (plan: WalkPlan, progress: number) => atDistance(plan.route, plan.route.length * Math.max(0, Math.min(1, progress)));
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
export type WalkState = {
    id: number;
    phase: 'idle' | 'preparing' | 'walking' | 'arrived';
    plan: WalkPlan | null;
    progress: number;
    startLook: Look;
};
export type WalkStore = ReturnType<typeof createWalkStore>;
export function createWalkStore() {
    let state: WalkState = { id: 0, phase: 'idle', plan: null, progress: 0, startLook: { yawDeg: 0, pitchDeg: 8, vfovDeg: 54 } };
    let elapsed = 0;
    const subs = new Set<() => void>();
    const emit = () => subs.forEach(fn => fn());
    return {
        get: () => state,
        phase: () => state.phase,
        target: () => state.plan?.to ?? null,
        subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; },
        start(from: MomentId, to: MomentId, look: {
            yawDeg: number;
            pitchDeg: number;
            vfovDeg?: number;
        }) {
            const plan = walkPlan(from, to);
            if (!plan)
                return false;
            elapsed = 0;
            state = { id: state.id + 1, phase: 'preparing', plan, progress: 0, startLook: { vfovDeg: 54, ...look } };
            emit();
            return true;
        },
        ready(id = state.id) {
            if (id !== state.id || state.phase !== 'preparing')
                return;
            state = { ...state, phase: 'walking' };
            emit();
        },
        step(dtMs: number) {
            if (state.phase !== 'walking' || !state.plan)
                return;
            elapsed += Math.max(0, Math.min(50, dtMs));
            const progress = Math.min(1, elapsed / state.plan.durationMs);
            state = { ...state, progress, phase: progress >= 1 ? 'arrived' : 'walking' };
            emit();
        },
        pose() {
            if (!state.plan)
                return null;
            // Smooth acceleration/deceleration; sampling remains by path arc length.
            const t = smooth(state.progress), p = sampleWalk(state.plan, t);
            const end = momentById(state.plan.to).view;
            const enter = smooth(state.progress / .16), exit = smooth((state.progress - .82) / .18);
            const yaw = state.startLook.yawDeg + turnDeg(state.startLook.yawDeg, p.yawDeg) * enter;
            return { at: p.at, yawDeg: yaw + turnDeg(yaw, end.yawDeg) * exit, pitchDeg: state.startLook.pitchDeg + (end.pitchDeg - state.startLook.pitchDeg) * t, vfovDeg: state.startLook.vfovDeg + (54 - state.startLook.vfovDeg) * enter };
        },
        skip() { if (!state.plan || state.phase === 'idle' || state.phase === 'arrived')
            return; state = { ...state, progress: 1, phase: 'arrived' }; emit(); },
        cancel() { state = { ...state, id: state.id + 1, phase: 'idle', plan: null, progress: 0 }; emit(); },
    };
}
export function approachBounds() {
    const xs = APPROACH_POINTS.map(p => p.x), zs = APPROACH_POINTS.map(p => p.z);
    const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
    return { center, radius: Math.max(...APPROACH_POINTS.map(p => distW(center, p))) + 35 };
}
