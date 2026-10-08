/**
 * The observation's look direction, shared without re-rendering the activity:
 * the buttons and drag set a *target*, the 3D view eases its camera toward it
 * and publishes the *live* value, which the heading readout (and, once the
 * check succeeds, the map's field-of-view wedge) subscribe to.
 *
 * The eye never moves — only yaw, pitch and the horizontal field of view.
 */
export type LookState = {
  /** Degrees clockwise from local grid north (0 = north). */
  readonly yawDeg: number;
  /** Degrees above the horizon. */
  readonly pitchDeg: number;
  /** Horizontal field of view; the vertical one follows the frame's aspect. */
  readonly hfovDeg: number;
};

export const LOOK_LIMITS = { yawMin: -90, yawMax: 90, pitchMin: -15, pitchMax: 15, hfovMin: 30, hfovMax: 100 } as const;
/**
 * The opening view ("מבט הפתיחה"): a little west of north, wide enough that both
 * groves sit fully in the 4:3 frame — the one on the left and the one on the
 * right — with the ridge beyond (landmarks). The road split lies off-frame to
 * the right; "הראו את התפצלות הדרך" turns the view to it. The vertical field of view follows
 * the frame (verticalFov), so a 4:3 frame shows ±31° about the horizon.
 */
export const INITIAL_LOOK: LookState = { yawDeg: -10, pitchDeg: 0, hfovDeg: 78 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampLook(l: LookState): LookState {
  return {
    yawDeg: clamp(l.yawDeg, LOOK_LIMITS.yawMin, LOOK_LIMITS.yawMax),
    pitchDeg: clamp(l.pitchDeg, LOOK_LIMITS.pitchMin, LOOK_LIMITS.pitchMax),
    hfovDeg: clamp(l.hfovDeg, LOOK_LIMITS.hfovMin, LOOK_LIMITS.hfovMax),
  };
}

export type LookStore = ReturnType<typeof createLookStore>;

export function createLookStore() {
  let target: LookState = INITIAL_LOOK;
  let live: LookState = INITIAL_LOOK;
  /** Whether the view can turn at all (false for the static picture without WebGL). */
  let interactive = false;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  return {
    getTarget: () => target,
    getLive: () => live,
    getInteractive: () => interactive,
    setInteractive(next: boolean) {
      if (next === interactive) return;
      interactive = next;
      emit();
    },
    setTarget(next: Partial<LookState>) {
      target = clampLook({ ...target, ...next });
      emit();
    },
    /** Called by the 3D view as its camera eases; also used without WebGL (then live = target). */
    setLive(next: LookState) {
      live = next;
      emit();
    },
    reset() {
      target = INITIAL_LOOK;
      emit();
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}
