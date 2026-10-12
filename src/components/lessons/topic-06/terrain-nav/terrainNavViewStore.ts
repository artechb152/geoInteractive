/**
 * The model's camera, shared without re-rendering the activity.
 *
 *   orbit  learn mode: the model turns and zooms about a target on the sheet
 *          (OrbitControls); `orbitCommand` asks the canvas to go to the opening
 *          view or straight down (north up, like the map), or to zoom.
 *   eye    practice: the navigator's eye, ground + 1.7 m at a point. It only
 *          turns (yaw / pitch) and zooms (field of view) — it never moves or
 *          flies, so the view cannot give away where it stands. `walk` moves
 *          it along a leg after a verified check, at eye level.
 *
 * The canvas publishes the live heading (`liveYawDeg`), which the compass and
 * the heading tape read. Turning the view changes nothing else: not the map's
 * north, not a bearing, not an object.
 */
import type { Point } from './terrainNavScenario';

export type EyeLook = { readonly yawDeg: number; readonly pitchDeg: number; readonly hfovDeg: number };
export const EYE_LIMITS = { pitchMin: -24, pitchMax: 14, hfovMin: 22, hfovMax: 80 } as const;
export const EYE_DEFAULT_HFOV = 64;

export type OrbitCommand = { readonly kind: 'home' | 'top' | 'zoom-in' | 'zoom-out' | 'focus'; readonly at?: Point; readonly seq: number };

export type ViewState = {
  readonly mode: 'orbit' | 'eye';
  /** Practice: where the eye stands (ground point). */
  readonly eyeAt: Point | null;
  readonly look: EyeLook;
  /** Practice: a walk along these ground points (ending at eyeAt), started at `startedAt` (ms). */
  readonly walk: { readonly path: readonly Point[]; readonly startedAt: number; readonly durationMs: number } | null;
  readonly orbitCommand: OrbitCommand | null;
  /** Heading of the camera right now (degrees clockwise from grid north), published by the canvas. */
  readonly liveYawDeg: number;
  /** Learn: the orbit camera looks straight down (north up). */
  readonly liveTopDown: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (d: number) => ((d % 360) + 360) % 360;

export function createViewStore() {
  let state: ViewState = {
    mode: 'orbit',
    eyeAt: null,
    look: { yawDeg: 0, pitchDeg: -4, hfovDeg: EYE_DEFAULT_HFOV },
    walk: null,
    orbitCommand: null,
    liveYawDeg: 0,
    liveTopDown: false,
  };
  let seq = 0;
  const subs = new Set<() => void>();
  const set = (next: Partial<ViewState>) => {
    state = { ...state, ...next };
    subs.forEach((f) => f());
  };
  return {
    get: () => state,
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
    orbit(kind: OrbitCommand['kind'], at?: Point) {
      set({ mode: 'orbit', walk: null, orbitCommand: { kind, at, seq: ++seq } });
    },
    /** Back to the overview as it was left (a cut, no camera command). */
    resumeOrbit() {
      if (state.mode !== 'orbit') set({ mode: 'orbit', walk: null });
    },
    /** Stand at a point facing yawDeg — a cut, not a flight. */
    standAt(at: Point, yawDeg: number) {
      set({ mode: 'eye', eyeAt: at, walk: null, look: { yawDeg: wrap(yawDeg), pitchDeg: -4, hfovDeg: EYE_DEFAULT_HFOV } });
    },
    /** Walk at eye level through `path` (ground points), ending there facing yawDeg. */
    walkTo(path: readonly Point[], yawDeg: number, durationMs: number) {
      const at = path[path.length - 1];
      set({ mode: 'eye', eyeAt: at, walk: durationMs > 0 ? { path, startedAt: performance.now(), durationMs } : null, look: { yawDeg: wrap(yawDeg), pitchDeg: -4, hfovDeg: state.look.hfovDeg } });
    },
    look(d: Partial<EyeLook>) {
      const l = { ...state.look, ...d };
      set({ look: { yawDeg: wrap(l.yawDeg), pitchDeg: clamp(l.pitchDeg, EYE_LIMITS.pitchMin, EYE_LIMITS.pitchMax), hfovDeg: clamp(l.hfovDeg, EYE_LIMITS.hfovMin, EYE_LIMITS.hfovMax) } });
    },
    endWalk() {
      if (state.walk) set({ walk: null });
    },
    publishLive(yawDeg: number, topDown: boolean) {
      const y = wrap(yawDeg);
      if (Math.abs(y - state.liveYawDeg) < 0.05 && topDown === state.liveTopDown) return;
      set({ liveYawDeg: y, liveTopDown: topDown });
    },
  };
}

export type ViewStore = ReturnType<typeof createViewStore>;
