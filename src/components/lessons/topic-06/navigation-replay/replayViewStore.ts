/**
 * Where the replay's eye looks — shared by the canvas, the heading ribbon and
 * the view controls without re-rendering the activity.
 *
 * The eye never moves: it stands at the moment's station, ground + 1.7 m, and
 * only turns (yaw), tilts (pitch) and zooms (vertical field of view). There is
 * no free flight and no view from above, so the view cannot answer the
 * question by itself. The look is not part of the activity's state: turning
 * the view never changes an answer.
 */
export type Look = { yawDeg: number; pitchDeg: number; vfovDeg: number };

export const LOOK_LIMITS = { pitchMin: -22, pitchMax: 14, vfovMin: 16, vfovMax: 54 } as const;
/** Opening field of view: ≈ 80° across the 1.55 : 1 frame. */
export const DEFAULT_VFOV = 54;
export const EYE_HEIGHT_M = 1.7;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (d: number) => ((d % 360) + 360) % 360;

export type ViewStore = ReturnType<typeof createViewStore>;

export function createViewStore(initial: { yawDeg: number; pitchDeg: number }) {
  let home: Look = { ...initial, vfovDeg: DEFAULT_VFOV };
  let look: Look = home;
  /** A short animated turn towards a look (null when idle or under reduced motion). */
  let tween: { from: Look; to: Look; start: number; ms: number } | null = null;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  const norm = (l: Look): Look => ({
    yawDeg: wrap(l.yawDeg),
    pitchDeg: clamp(l.pitchDeg, LOOK_LIMITS.pitchMin, LOOK_LIMITS.pitchMax),
    vfovDeg: clamp(l.vfovDeg, LOOK_LIMITS.vfovMin, LOOK_LIMITS.vfovMax),
  });
  return {
    get: () => look,
    home: () => home,
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    set(l: Partial<Look>) {
      tween = null;
      look = norm({ ...look, ...l });
      emit();
    },
    turn(dYaw: number, dPitch: number) {
      tween = null;
      look = norm({ ...look, yawDeg: look.yawDeg + dYaw, pitchDeg: look.pitchDeg + dPitch });
      emit();
    },
    zoom(factor: number) {
      tween = null;
      look = norm({ ...look, vfovDeg: look.vfovDeg * factor });
      emit();
    },
    /** A new station: its opening look becomes home; jump there. */
    setHome(l: { yawDeg: number; pitchDeg: number }) {
      home = norm({ ...l, vfovDeg: DEFAULT_VFOV });
      tween = null;
      look = home;
      emit();
    },
    /** Back to the opening look — or towards any look — animated unless `instant`. */
    goTo(to: Look | 'home', instant: boolean) {
      const target = norm(to === 'home' ? home : to);
      if (instant) {
        tween = null;
        look = target;
      } else {
        // the short way round
        const dy = ((((target.yawDeg - look.yawDeg) % 360) + 540) % 360) - 180;
        tween = { from: look, to: { ...target, yawDeg: look.yawDeg + dy }, start: performance.now(), ms: 520 };
      }
      emit();
    },
    /** Advance an animated turn; returns true while it runs (the canvas keeps drawing). */
    step(nowMs: number) {
      if (!tween) return false;
      const t = Math.min(1, (nowMs - tween.start) / tween.ms);
      const e = 1 - Math.pow(1 - t, 3);
      const { from, to } = tween;
      look = norm({
        yawDeg: from.yawDeg + (to.yawDeg - from.yawDeg) * e,
        pitchDeg: from.pitchDeg + (to.pitchDeg - from.pitchDeg) * e,
        vfovDeg: from.vfovDeg + (to.vfovDeg - from.vfovDeg) * e,
      });
      if (t >= 1) tween = null;
      emit();
      return tween !== null;
    },
  };
}
