/* ─────────────── דאטום — guided-demo state (pure) ───────────────
   One source of truth for the guided 3-D datum block, kept per station so
   that no station overwrites another (brief:
   design/mockups/datum-concepts/claude-interaction-and-learning-refinement-prompt.md):
   - station 1 "גוף הייחוס": which surface is in focus. The bodies sit in one
     fixed, nested composition (OVERVIEW); choosing a surface changes how they
     are drawn, never the pose;
   - station 2 "מיקום וכיוון": one pose for the demo and the optional
     experiment. The demo runs once, DEMO_START → shift → rotate → scale →
     the global fit, and stops at the result (no loop, no auto-advance). One
     button plays, stops, resumes and replays it; the experiment's four
     parameters stop it before they apply;
   - station 3 "עולמי ומקומי": global or local — the computed fit of that
     choice, applied at once — and which of two fixed check points the
     close-up shows. The same two points serve both fits.
   The view shows the active station's pose. Opening another station stops
   the demo and eases the view from the pose on screen to that station's
   (instant under reduced motion); coming back finds the station as it was
   left. The camera is not in here. */

import { snapPose, clampInspect, INSPECT_DEFAULT, type BestFits, type DatumMode, type Pose } from './datumGeometry';

export type Step = 0 | 1 | 2;
export type Surface = 'surface' | 'geoid' | 'ellipsoid';
export type Interaction = 'demo' | 'manual';
export type Playback = 'idle' | 'playing' | 'paused' | 'ended';
export type Phase = 'shift' | 'rotate' | 'scale';
export type Probe = 'inside' | 'outside';

/** A short eased move to a target pose ("הצגת התאמה"). */
export type Tween = { from: Pose; to: Pose; t: number };

/** Station 2: the demo and the experiment share this one pose. */
export type LabState = {
  interaction: Interaction;
  playback: Playback;
  /** 0–1 along the demo. */
  progress: number;
  pose: Pose;
  tween: Tween | null;
};

export type DatumState = {
  step: Step;
  /** station 1 */
  surface: Surface;
  /** station 2 */
  lab: LabState;
  /** station 3 */
  mode: DatumMode;
  probe: Probe;
  /** Section angle of the close-up's inspection point in stations 1–2 (station 3 uses PROBES). */
  inspect: number;
  /** The view easing from the pose that was on screen to the active station's own. */
  view: { from: Pose; t: number } | null;
};

export const DEMO_MS = 7000;
export const TWEEN_MS = 900;
export const VIEW_MS = 700;

/** Station 1: the three bodies nested — the reference ellipsoid centred, at the geoid's mean size. */
export const OVERVIEW: Pose = { dx: 0, dy: 0, rot: 0, s: 1 };
/** Station 2's opening (also the experiment's reset): offset, turned and smaller than the fit, well
    inside the slider ranges and on their steps — clear differences, not a small body adrift. The
    exercise's own START (datumGeometry) is unchanged; the score tests still pin it. */
export const DEMO_START: Pose = { dx: 72, dy: -52, rot: 26, s: 0.8 };

/** Station 3's two check points (section angles on the open wall): the middle of the marked
    region, and its mirror below the equator — outside it. Both fits are measured at both. */
export const PROBES: Record<Probe, number> = { inside: -1.0, outside: 1.0 };

/* Demo phases on the 0–1 timeline: hold the opening pose, shift, rotate,
   scale, then hold the result. The phase ends are also the reduced-motion
   stops (one click per phase). */
export const PHASES = { hold: 0.12, shift: 0.42, rotate: 0.66, scale: 0.9 } as const;
export const REDUCED_STOPS = [PHASES.shift, PHASES.rotate, 1] as const;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const seg = (p: number, a: number, b: number) => ease((p - a) / (b - a));
export const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
  dx: lerp(a.dx, b.dx, k),
  dy: lerp(a.dy, b.dy, k),
  rot: lerp(a.rot, b.rot, k),
  s: lerp(a.s, b.s, k),
});

/** Pose along the demo for progress p: each phase moves only its own parameter. */
export function demoPose(p: number, to: Pose, from: Pose = DEMO_START): Pose {
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

/** The phase a demo position belongs to (null while the opening pose holds). The end hold
    belongs to the last phase: the demo stops there, on its result. */
export const phaseAt = (p: number): Phase | null =>
  p <= PHASES.hold ? null : p <= PHASES.shift ? 'shift' : p <= PHASES.rotate ? 'rotate' : 'scale';

/** Where the phase began (its pose before it moved), for the temporary reference marks. */
export const phaseStart = (phase: Phase, to: Pose): Pose =>
  demoPose(phase === 'shift' ? PHASES.hold : phase === 'rotate' ? PHASES.shift : PHASES.rotate, to);

export const tweenPose = (tw: Tween): Pose => lerpPose(tw.from, tw.to, ease(tw.t));

export const initialDatumState = (): DatumState => ({
  step: 0,
  surface: 'surface',
  lab: { interaction: 'demo', playback: 'idle', progress: 0, pose: DEMO_START, tween: null },
  mode: 'global',
  probe: 'inside',
  inspect: INSPECT_DEFAULT.global,
  view: null,
});

/** The pose the active station shows (before the view's ease). Station 2's demo target is the
    global fit; station 3 shows the fit of its own choice. */
export function stationPose(s: DatumState, best: BestFits): Pose {
  if (s.step === 0) return OVERVIEW;
  if (s.step === 1) return s.lab.pose;
  return best[s.mode].pose;
}

/** The pose on screen: the station's, reached through the view's ease. */
export function viewPose(s: DatumState, best: BestFits): Pose {
  const to = stationPose(s, best);
  return s.view ? lerpPose(s.view.from, to, ease(s.view.t)) : to;
}

/** The close-up's inspection point on screen. */
export const inspectOf = (s: DatumState) => (s.step === 2 ? PROBES[s.probe] : s.inspect);

/** How the globe draws the bodies: the surface in focus (station 1), or the station's own view. */
export type Look = Surface | 'motion' | 'compare';
export const lookOf = (s: DatumState): Look => (s.step === 0 ? s.surface : s.step === 1 ? 'motion' : 'compare');

/** Temporary reference marks on the globe — what one phase or one parameter changes:
    - shift: the outline the body left and its track to where the phase ends;
    - axis: the outline it left and the one axis it slides along (the X or Y parameter);
    - rotate: the body's own axes against a fixed vertical;
    - scale: the outline at the size it started from. */
export type Guide =
  | { kind: 'shift'; from: Pose; to: Pose }
  | { kind: 'axis'; axis: 'x' | 'y'; from: Pose }
  | { kind: 'rotate' }
  | { kind: 'scale'; from: Pose };

export type DatumAction =
  | { type: 'openStep'; step: Step; instant?: boolean }
  | { type: 'selectSurface'; surface: Surface }
  | { type: 'setMode'; mode: DatumMode; instant?: boolean }
  | { type: 'setProbe'; probe: Probe }
  /** the one demo button: play / stop / resume / replay */
  | { type: 'demo'; instant?: boolean }
  /** the same button under reduced motion: the next phase's end state */
  | { type: 'demoStep' }
  | { type: 'tick'; dt: number }
  | { type: 'pause' }
  | { type: 'tryYourself' }
  | { type: 'backToDemo'; instant?: boolean }
  | { type: 'setPose'; key: keyof Pose; value: number }
  | { type: 'movePose'; pose: Pose }
  | { type: 'reset'; instant?: boolean }
  | { type: 'showFit'; instant?: boolean }
  | { type: 'setInspect'; t: number };

/** Stops whatever moves in station 2 — the demo or a "show fit" tween — in place. */
const haltLab = (l: LabState): LabState => ({
  ...l,
  pose: l.tween ? tweenPose(l.tween) : l.pose,
  playback: l.playback === 'playing' ? 'paused' : l.playback,
  tween: null,
});

/** Ease the view from what is on screen now to the (new) station pose. */
const easeFrom = (s: DatumState, best: BestFits, instant?: boolean) => (instant ? null : { from: viewPose(s, best), t: 0 });

export function datumReducer(s: DatumState, a: DatumAction, best: BestFits): DatumState {
  const fit = best.global.pose;
  switch (a.type) {
    case 'openStep': {
      if (a.step === s.step) return s;
      return { ...s, step: a.step, lab: haltLab(s.lab), view: easeFrom(s, best, a.instant) };
    }
    case 'selectSurface':
      return s.surface === a.surface ? s : { ...s, surface: a.surface };
    case 'setMode': {
      if (a.mode === s.mode) return s;
      return { ...s, mode: a.mode, view: s.step === 2 ? easeFrom(s, best, a.instant) : s.view };
    }
    case 'setProbe':
      return s.probe === a.probe ? s : { ...s, probe: a.probe };
    case 'demo': {
      const l = s.lab;
      if (l.playback === 'playing') return { ...s, lab: { ...l, playback: 'paused' } };
      if (l.interaction === 'demo' && l.playback === 'paused') return { ...s, lab: { ...l, playback: 'playing', tween: null } };
      // play from the opening (first time, after the end, or out of the experiment); the view
      // eases back to the opening pose during the opening hold
      return {
        ...s,
        lab: { interaction: 'demo', playback: 'playing', progress: 0, pose: DEMO_START, tween: null },
        view: easeFrom(s, best, a.instant),
      };
    }
    case 'demoStep': {
      // Reduced motion: no animation — each click shows the next phase's end state.
      const l = s.lab;
      const from = l.interaction === 'manual' || l.playback === 'ended' ? 0 : l.progress;
      const stop = REDUCED_STOPS.find((p) => p > from + 1e-6) ?? 1;
      return {
        ...s,
        view: null,
        lab: { interaction: 'demo', tween: null, progress: stop, playback: stop >= 1 ? 'ended' : 'paused', pose: demoPose(stop, fit) },
      };
    }
    case 'tick': {
      let next = s;
      if (s.view) {
        const t = Math.min(1, s.view.t + a.dt / VIEW_MS);
        next = { ...next, view: t >= 1 ? null : { ...s.view, t } };
      }
      const l = s.lab;
      if (l.tween) {
        const t = Math.min(1, l.tween.t + a.dt / TWEEN_MS);
        const tw = { ...l.tween, t };
        next = { ...next, lab: { ...l, pose: t >= 1 ? tw.to : tweenPose(tw), tween: t >= 1 ? null : tw } };
      } else if (l.playback === 'playing') {
        const progress = Math.min(1, l.progress + a.dt / DEMO_MS);
        next = { ...next, lab: { ...l, progress, playback: progress >= 1 ? 'ended' : 'playing', pose: demoPose(progress, fit) } };
      }
      return next;
    }
    case 'pause':
      return s.lab.playback === 'playing' || s.lab.tween ? { ...s, lab: haltLab(s.lab) } : s;
    case 'tryYourself': {
      // the experiment opens where the demo is (snapped to the sliders' steps)
      const l = haltLab(s.lab);
      return { ...s, lab: { ...l, interaction: 'manual', pose: snapPose(l.pose) } };
    }
    case 'backToDemo':
      return {
        ...s,
        lab: { interaction: 'demo', playback: 'idle', progress: 0, pose: DEMO_START, tween: null },
        view: easeFrom(s, best, a.instant),
      };
    case 'setPose': {
      // a learner's change during an animation stops it first, then applies
      const l = haltLab(s.lab);
      return { ...s, lab: { ...l, interaction: 'manual', pose: { ...l.pose, [a.key]: a.value } } };
    }
    case 'movePose': {
      const l = haltLab(s.lab);
      return { ...s, lab: { ...l, interaction: 'manual', pose: snapPose(a.pose) } };
    }
    case 'reset': {
      // the experiment back to its defined opening (the camera is not touched)
      return { ...s, lab: { ...s.lab, tween: null, pose: DEMO_START }, view: easeFrom(s, best, a.instant) };
    }
    case 'showFit': {
      const l = haltLab(s.lab);
      if (a.instant) return { ...s, lab: { ...l, pose: fit } };
      return { ...s, lab: { ...l, tween: { from: l.pose, to: fit, t: 0 } } };
    }
    case 'setInspect':
      return { ...s, inspect: clampInspect(a.t, 'global') };
  }
}

/** Something is moving and needs animation frames. */
export const isAnimating = (s: DatumState) => s.view !== null || s.lab.playback === 'playing' || s.lab.tween !== null;

