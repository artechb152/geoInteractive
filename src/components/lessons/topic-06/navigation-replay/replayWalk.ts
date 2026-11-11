/**
 * The accelerated, ground-level walk between two stops — the camera moves
 * along the TRUE segment (replayRoute) while the map's estimate moves along
 * the plan by the same distance counted, so view and map advance together.
 *
 * Phases: preparing (the 3D world of the segment is being built) → walking →
 * arrived. The activity owns what happens on arrival; Skip jumps there.
 */
import { STOPS } from './replayScenario';
import type { StopId } from './replayRoute';
import { bearingW, polyline, turnDeg, type Polyline, type W2 } from './replayWorld';
import type { Look } from './replayViewStore';

export type WalkPlan = { from: StopId; to: StopId; route: Polyline; durationMs: number };

/** ~22 ms per metre, 2.8–7 s: quick, but the ground is still read on the way. */
export const walkDuration = (m: number) => Math.max(2800, Math.min(7000, m * 22));

export function walkPlan(from: StopId, to: StopId, pts: W2[]): WalkPlan {
  const route = polyline(pts);
  return { from, to, route, durationMs: walkDuration(route.length) };
}

function atDistance(route: Polyline, distance: number) {
  for (let i = 1; i < route.pts.length; i++) {
    if (distance <= route.cum[i] || i === route.pts.length - 1) {
      const a = route.pts[i - 1];
      const b = route.pts[i];
      const t = Math.max(0, Math.min(1, (distance - route.cum[i - 1]) / (route.cum[i] - route.cum[i - 1] || 1)));
      return { at: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, s: distance };
    }
  }
  return { at: route.pts[0], s: 0 };
}

/** The walking heading at a distance: looks a few metres ahead, so the weave between trees turns smoothly. */
function headingAt(route: Polyline, s: number) {
  const a = atDistance(route, Math.max(0, s - 3)).at;
  const b = atDistance(route, Math.min(route.length, s + 9)).at;
  return bearingW(a, b);
}

export const sampleWalk = (plan: WalkPlan, progress: number) => {
  const p = atDistance(plan.route, plan.route.length * Math.max(0, Math.min(1, progress)));
  return { at: p.at, yawDeg: headingAt(plan.route, p.s) };
};
const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

export type WalkState = { id: number; phase: 'idle' | 'preparing' | 'walking' | 'arrived'; plan: WalkPlan | null; progress: number; startLook: Look };
export type WalkStore = ReturnType<typeof createWalkStore>;

export function createWalkStore() {
  let state: WalkState = { id: 0, phase: 'idle', plan: null, progress: 0, startLook: { yawDeg: 0, pitchDeg: 8, vfovDeg: 54 } };
  let elapsed = 0;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((fn) => fn());
  return {
    get: () => state,
    phase: () => state.phase,
    target: () => state.plan?.to ?? null,
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
    start(plan: WalkPlan, look: { yawDeg: number; pitchDeg: number; vfovDeg?: number }) {
      elapsed = 0;
      state = { id: state.id + 1, phase: 'preparing', plan, progress: 0, startLook: { vfovDeg: 54, ...look } };
      emit();
    },
    ready(id = state.id) {
      if (id !== state.id || state.phase !== 'preparing') return;
      state = { ...state, phase: 'walking' };
      emit();
    },
    step(dtMs: number) {
      if (state.phase !== 'walking' || !state.plan) return;
      elapsed += Math.max(0, Math.min(50, dtMs));
      const progress = Math.min(1, elapsed / state.plan.durationMs);
      state = { ...state, progress, phase: progress >= 1 ? 'arrived' : 'walking' };
      emit();
    },
    /** Where the eye is now (smooth start and stop; the heading eases from the start look and into the stop's opening look). */
    pose() {
      if (!state.plan) return null;
      const t = smooth(state.progress);
      const p = sampleWalk(state.plan, t);
      const end = STOPS[state.plan.to].view;
      const enter = smooth(state.progress / 0.16);
      const exit = smooth((state.progress - 0.82) / 0.18);
      const yaw = state.startLook.yawDeg + turnDeg(state.startLook.yawDeg, p.yawDeg) * enter;
      return {
        at: p.at,
        /** metres walked along the segment */
        s: state.plan.route.length * t,
        yawDeg: yaw + turnDeg(yaw, end.yawDeg) * exit,
        pitchDeg: state.startLook.pitchDeg + (end.pitchDeg - state.startLook.pitchDeg) * t,
        vfovDeg: state.startLook.vfovDeg + (54 - state.startLook.vfovDeg) * enter,
      };
    },
    skip() {
      if (!state.plan || state.phase === 'idle' || state.phase === 'arrived') return;
      state = { ...state, progress: 1, phase: 'arrived' };
      emit();
    },
    cancel() {
      state = { ...state, id: state.id + 1, phase: 'idle', plan: null, progress: 0 };
      emit();
    },
  };
}
