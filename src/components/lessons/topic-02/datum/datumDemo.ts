/* ─────────────── דאטום — guided-demo state (pure) ───────────────
   One source of truth for the guided 3-D datum block: the step, the active
   surface, global/local, demo vs. manual, the playback and THE pose. The
   3-D view, the gap close-up and the sliders all read this pose; nothing
   keeps a second copy. The camera is deliberately not in here.

   Rules (from the approved brief, design/mockups/datum-concepts/claude-guided-3d-prompt.md §8):
   - the demo runs once, START → shift → rotate → scale → the selected
     mode's fit, and stays at the end (no loop, no auto-advance);
   - pause stops in place, resume continues from there, scrubbing moves the
     pose and the close-up together;
   - any learner change during an animation stops it before applying;
   - switching global/local stops the demo and keeps the pose; only an
     explicit "show fit" or "play" brings the new fit. */

import { START, snapPose, clampInspect, INSPECT_DEFAULT, type BestFits, type DatumMode, type Pose } from './datumGeometry';

export type Step = 0 | 1 | 2;
export type Surface = 'surface' | 'geoid' | 'ellipsoid';
export type Interaction = 'demo' | 'manual';
export type Playback = 'idle' | 'playing' | 'paused' | 'ended';

/** A short eased move to a target pose ("הצגת התאמה"). */
export type Tween = { from: Pose; to: Pose; t: number };

export type DatumState = {
  step: Step;
  surface: Surface;
  mode: DatumMode;
  interaction: Interaction;
  playback: Playback;
  /** 0–1 along the demo. */
  progress: number;
  pose: Pose;
  /** Section angle of the close-up's inspection point. */
  inspect: number;
  tween: Tween | null;
};

export const DEMO_MS = 7000;
export const TWEEN_MS = 900;

/* Demo phases on the 0–1 timeline: hold the displaced pose, shift, rotate,
   scale, then hold the fit. The phase ends are also the reduced-motion
   stops (one click per phase). */
export const PHASES = { hold: 0.12, shift: 0.42, rotate: 0.66, scale: 0.9 } as const;
export const REDUCED_STOPS = [PHASES.shift, PHASES.rotate, 1] as const;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const seg = (p: number, a: number, b: number) => ease((p - a) / (b - a));

/** Pose along the demo for progress p, from START to `to`. */
export function demoPose(p: number, to: Pose, from: Pose = START): Pose {
  const kShift = seg(p, PHASES.hold, PHASES.shift);
  const kRot = seg(p, PHASES.shift, PHASES.rotate);
  const kScale = seg(p, PHASES.rotate, PHASES.scale);
  return {
    dx: lerp(from.dx, to.dx, kShift),
    dy: lerp(from.dy, to.dy, kShift),
    rot: lerp(from.rot, to.rot, kRot),
    s: lerp(from.s, to.s, kScale),
  };
}

export const tweenPose = (tw: Tween): Pose => {
  const k = ease(tw.t);
  return {
    dx: lerp(tw.from.dx, tw.to.dx, k),
    dy: lerp(tw.from.dy, tw.to.dy, k),
    rot: lerp(tw.from.rot, tw.to.rot, k),
    s: lerp(tw.from.s, tw.to.s, k),
  };
};

export const initialDatumState = (): DatumState => ({
  step: 0,
  surface: 'surface',
  mode: 'global',
  interaction: 'demo',
  playback: 'idle',
  progress: 0,
  pose: START,
  inspect: INSPECT_DEFAULT.global,
  tween: null,
});

export type DatumAction =
  | { type: 'openStep'; step: Step }
  | { type: 'selectSurface'; surface: Surface }
  | { type: 'setMode'; mode: DatumMode }
  | { type: 'play' }
  | { type: 'togglePlay' }
  | { type: 'stepReduced' }
  | { type: 'tick'; dt: number }
  | { type: 'scrub'; progress: number }
  | { type: 'tryYourself' }
  | { type: 'backToDemo' }
  | { type: 'setPose'; key: keyof Pose; value: number }
  | { type: 'movePose'; pose: Pose }
  | { type: 'reset' }
  | { type: 'showFit'; instant?: boolean }
  | { type: 'setInspect'; t: number }
  | { type: 'pause' };

/** Stops whatever is moving — the demo or a "show fit" tween — in place. */
const halt = (s: DatumState): DatumState => ({
  ...s,
  playback: s.playback === 'playing' ? 'paused' : s.playback,
  tween: null,
});

export function datumReducer(s: DatumState, a: DatumAction, best: BestFits): DatumState {
  switch (a.type) {
    case 'openStep': {
      const next = halt(s);
      // The second station puts the ellipsoid (the body that moves) in focus.
      return { ...next, step: a.step, surface: a.step === 1 ? 'ellipsoid' : next.surface };
    }
    case 'selectSurface':
      return { ...s, surface: a.surface };
    case 'setMode': {
      if (a.mode === s.mode) return s;
      // Stop, keep the pose; the timeline restarts so play/scrub follow the new fit.
      const next = halt(s);
      return {
        ...next,
        mode: a.mode,
        playback: next.interaction === 'demo' ? 'idle' : next.playback,
        progress: next.interaction === 'demo' ? 0 : next.progress,
        inspect: clampInspect(a.mode === 'local' ? INSPECT_DEFAULT.local : s.inspect, a.mode),
      };
    }
    case 'play':
      return { ...s, interaction: 'demo', playback: 'playing', progress: 0, pose: START, tween: null };
    case 'togglePlay': {
      if (s.playback === 'playing') return { ...s, playback: 'paused' };
      if (s.playback === 'ended' || s.interaction === 'manual')
        return { ...s, interaction: 'demo', playback: 'playing', progress: 0, pose: START, tween: null };
      return { ...s, playback: 'playing', tween: null, pose: demoPose(s.progress, best[s.mode].pose) };
    }
    case 'stepReduced': {
      // Reduced motion: no animation — each click shows the next phase's end state.
      const from = s.interaction === 'manual' || s.playback === 'ended' ? 0 : s.progress;
      const stop = REDUCED_STOPS.find((p) => p > from + 1e-6) ?? 1;
      return {
        ...s,
        interaction: 'demo',
        tween: null,
        progress: stop,
        playback: stop >= 1 ? 'ended' : 'paused',
        pose: demoPose(stop, best[s.mode].pose),
      };
    }
    case 'tick': {
      if (s.tween) {
        const t = Math.min(1, s.tween.t + a.dt / TWEEN_MS);
        const tw = { ...s.tween, t };
        return { ...s, pose: t >= 1 ? tw.to : tweenPose(tw), tween: t >= 1 ? null : tw };
      }
      if (s.playback !== 'playing') return s;
      const progress = Math.min(1, s.progress + a.dt / DEMO_MS);
      return {
        ...s,
        progress,
        playback: progress >= 1 ? 'ended' : 'playing',
        pose: demoPose(progress, best[s.mode].pose),
      };
    }
    case 'scrub': {
      const progress = Math.min(1, Math.max(0, a.progress));
      return {
        ...s,
        interaction: 'demo',
        tween: null,
        progress,
        playback: progress >= 1 ? 'ended' : 'paused',
        pose: demoPose(progress, best[s.mode].pose),
      };
    }
    case 'pause':
      return halt(s);
    case 'tryYourself': {
      const next = halt(s);
      return { ...next, interaction: 'manual', playback: next.playback === 'paused' || next.playback === 'playing' ? 'paused' : next.playback, pose: snapPose(next.pose) };
    }
    case 'backToDemo':
      return { ...s, interaction: 'demo', playback: 'idle', progress: 0, pose: START, tween: null };
    case 'setPose': {
      // A learner action during an animation stops it first, then applies.
      const next = halt(s);
      return { ...next, interaction: 'manual', pose: { ...next.pose, [a.key]: a.value } };
    }
    case 'movePose': {
      const next = halt(s);
      return { ...next, interaction: 'manual', pose: snapPose(a.pose) };
    }
    case 'reset':
      return { ...s, tween: null, playback: s.interaction === 'demo' ? 'idle' : s.playback, progress: 0, pose: START };
    case 'showFit': {
      const to = best[s.mode].pose;
      const next = halt(s);
      if (a.instant) return { ...next, pose: to };
      return { ...next, tween: { from: next.pose, to, t: 0 } };
    }
    case 'setInspect':
      return { ...s, inspect: clampInspect(a.t, s.mode) };
  }
}

/** Something is moving and needs animation frames. */
export const isAnimating = (s: DatumState) => s.playback === 'playing' || s.tween !== null;
