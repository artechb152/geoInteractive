/* ─────────────── דאטום — guided-stations state (pure) ───────────────
   One source of truth for the guided 3-D datum block (tasks 14–15, 2026-10-26:
   what the datum adds to the ellipsoid, and how datums differ). Kept per
   station, so that no station overwrites another:
   - station 1 "אותו אליפסואיד, עיגון אחר": one ellipsoid, two anchorings
     (ANCHOR_POSE). Only the centre and the axes move; the size and the shape
     never do — the ellipsoid is the reference body, the anchoring is what the
     datum adds;
   - station 2 "דאטום עולמי ומקומי": the global datum (geocentric) and a local
     one that keeps the SAME ellipsoid, so that only the anchoring differs,
     read at two fixed check points with the close-up;
   - station 3 "בדיקה: מה השתנה?": three pairs. Datum A is always the global
     datum; datum B changes the anchoring, the ellipsoid, or both. The learner
     names the change and gets an explanation; a wrong answer can be changed,
     a right one opens the next pair.
   Every station also shows the pose it is compared with (otherPose, the
   dashed outline on the globe). Opening another station eases the view from
   the pose on screen to that station's (instant under reduced motion); a new
   pair starts at datum A and moves to datum B, so the change is seen as it
   happens. The camera is not in here. */

import type { DatumMode, Pose } from './datumGeometry';

export type Step = 0 | 1 | 2;
/** The bodies the globe labels (the chips). */
export type Surface = 'surface' | 'geoid' | 'ellipsoid';
export type Anchor = 'a' | 'b';
export type Probe = 'inside' | 'outside';
/** Station 3: what changed between datum A and datum B. */
export type Change = 'anchor' | 'ellipsoid' | 'both';

/** The global datum: geocentric — the ellipsoid centred on the Earth's centre, its short axis on the
    rotation axis. Also the nested composition the fallback picture shows. */
export const GLOBAL_POSE: Pose = { dx: 0, dy: 0, rot: 0, s: 1 };
/** The local datum: the same ellipsoid (s = 1), shifted and turned to fit the marked region — the best
    shift over REGION.local with the turn held at −6° (left free, the fit turns the body by −36°, which
    reads as a tilted Earth rather than a datum). Gaps at the check points (section units), inside /
    outside: global 22.9 / 5.0, local 2.4 / 14.4. */
export const LOCAL_POSE: Pose = { dx: 22, dy: -4, rot: -6, s: 1 };
export const DATUM_POSE: Record<DatumMode, Pose> = { global: GLOBAL_POSE, local: LOCAL_POSE };

/** Station 1: one ellipsoid, two anchorings — A geocentric, B shifted and turned (not a fit to anything:
    it isolates the anchoring). */
export const ANCHOR_POSE: Record<Anchor, Pose> = { a: GLOBAL_POSE, b: { dx: -18, dy: 16, rot: 10, s: 1 } };

/** Station 3's pairs. A is GLOBAL_POSE; B changes one thing or both. The ellipsoid change is a size
    change (the illustration keeps one flattening); one pair makes it smaller, the other larger, so that
    "another ellipsoid" never reads as "a smaller one". */
export const CHECK: { b: Pose; answer: Change }[] = [
  { b: { dx: 20, dy: -16, rot: 12, s: 1 }, answer: 'anchor' },
  { b: { dx: 0, dy: 0, rot: 0, s: 1.08 }, answer: 'ellipsoid' },
  { b: { dx: -20, dy: 12, rot: -12, s: 0.88 }, answer: 'both' },
];

/** Station 2's two check points (section angles on the open wall): inside the marked region, near its
    middle, and below the equator — outside it. Both datums are measured at both. */
export const PROBES: Record<Probe, number> = { inside: -0.8, outside: 0.6 };

export type DatumState = {
  step: Step;
  /** station 1 */
  anchor: Anchor;
  /** station 1: anchoring B has been seen (the comparison is then complete) */
  seenB: boolean;
  /** station 2 */
  mode: DatumMode;
  probe: Probe;
  /** station 3: the pair on screen, and the last answer given for each pair */
  pair: number;
  picks: (Change | null)[];
  /** The view easing from a pose to the active station's own (t < 0 holds `from` first). */
  view: { from: Pose; t: number; ms: number } | null;
};

export const VIEW_MS = 700;
/** A pair's move from datum A to datum B: slow enough to see what moves, turns or grows. */
export const CHANGE_MS = 1100;
/** …after holding datum A for a moment (a share of CHANGE_MS). */
const CHANGE_HOLD = -0.3;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
  dx: lerp(a.dx, b.dx, k),
  dy: lerp(a.dy, b.dy, k),
  rot: lerp(a.rot, b.rot, k),
  s: lerp(a.s, b.s, k),
});

export const initialDatumState = (): DatumState => ({
  step: 0,
  anchor: 'a',
  seenB: false,
  mode: 'global',
  probe: 'inside',
  pair: 0,
  picks: CHECK.map(() => null),
  view: null,
});

/** The pose the active station shows (before the view's ease). */
export function stationPose(s: DatumState): Pose {
  if (s.step === 0) return ANCHOR_POSE[s.anchor];
  if (s.step === 1) return DATUM_POSE[s.mode];
  return CHECK[s.pair].b;
}

/** The pose it is compared with — the dashed outline: the other anchoring, the other datum, datum A. */
export function otherPose(s: DatumState): Pose {
  if (s.step === 0) return ANCHOR_POSE[s.anchor === 'a' ? 'b' : 'a'];
  if (s.step === 1) return DATUM_POSE[s.mode === 'global' ? 'local' : 'global'];
  return GLOBAL_POSE;
}

/** The pose on screen: the station's, reached through the view's ease. */
export function viewPose(s: DatumState): Pose {
  const to = stationPose(s);
  return s.view ? lerpPose(s.view.from, to, ease(s.view.t)) : to;
}

/** The close-up's check point (station 2 only shows it). */
export const inspectOf = (s: DatumState) => PROBES[s.probe];

export const solved = (s: DatumState, i: number) => s.picks[i] === CHECK[i].answer;
export const checkComplete = (s: DatumState) => CHECK.every((_, i) => solved(s, i));

/** How the globe draws the bodies: the moving ellipsoid in front (stations 1 and 3), or both bodies
    readable against each other (station 2). */
export type Look = 'surface' | 'motion' | 'compare';
export const lookOf = (s: DatumState): Look => (s.step === 1 ? 'compare' : 'motion');

/** Reference marks on the globe: the Earth's centre and rotation axis (fixed), the ellipsoid's own centre
    and axes (they move with it), and the dashed outline of the pose it is compared with. */
export type Guide = { other: Pose };

export type DatumAction =
  | { type: 'openStep'; step: Step; instant?: boolean }
  | { type: 'setAnchor'; anchor: Anchor; instant?: boolean }
  | { type: 'setMode'; mode: DatumMode; instant?: boolean }
  | { type: 'setProbe'; probe: Probe }
  | { type: 'pick'; change: Change }
  | { type: 'nextPair'; instant?: boolean }
  | { type: 'restartCheck'; instant?: boolean }
  /** station 3: datum A → datum B again */
  | { type: 'replay'; instant?: boolean }
  | { type: 'tick'; dt: number };

/** Ease the view from what is on screen now to the (new) station pose. */
const easeFrom = (s: DatumState, instant?: boolean): DatumState['view'] => (instant ? null : { from: viewPose(s), t: 0, ms: VIEW_MS });
/** A pair's change: datum A held for a moment, then the move to datum B. */
const fromA = (instant?: boolean): DatumState['view'] => (instant ? null : { from: GLOBAL_POSE, t: CHANGE_HOLD, ms: CHANGE_MS });

export function datumReducer(s: DatumState, a: DatumAction): DatumState {
  switch (a.type) {
    case 'openStep': {
      if (a.step === s.step) return s;
      // the check opens on its pair's change, from datum A
      return { ...s, step: a.step, view: a.step === 2 ? fromA(a.instant) : easeFrom(s, a.instant) };
    }
    case 'setAnchor': {
      if (a.anchor === s.anchor) return s;
      return { ...s, anchor: a.anchor, seenB: s.seenB || a.anchor === 'b', view: s.step === 0 ? easeFrom(s, a.instant) : s.view };
    }
    case 'setMode': {
      if (a.mode === s.mode) return s;
      return { ...s, mode: a.mode, view: s.step === 1 ? easeFrom(s, a.instant) : s.view };
    }
    case 'setProbe':
      return s.probe === a.probe ? s : { ...s, probe: a.probe };
    case 'pick': {
      // a right answer stays (the pair is done); a wrong one can be changed
      if (s.step !== 2 || solved(s, s.pair) || s.picks[s.pair] === a.change) return s;
      const picks = s.picks.slice();
      picks[s.pair] = a.change;
      return { ...s, picks };
    }
    case 'nextPair': {
      if (!solved(s, s.pair) || s.pair >= CHECK.length - 1) return s;
      return { ...s, pair: s.pair + 1, view: fromA(a.instant) };
    }
    case 'restartCheck':
      return { ...s, pair: 0, picks: CHECK.map(() => null), view: fromA(a.instant) };
    case 'replay':
      return s.step === 2 ? { ...s, view: fromA(a.instant) } : s;
    case 'tick': {
      if (!s.view) return s;
      const t = Math.min(1, s.view.t + a.dt / s.view.ms);
      return { ...s, view: t >= 1 ? null : { ...s.view, t } };
    }
  }
}

/** Something is moving and needs animation frames. */
export const isAnimating = (s: DatumState) => s.view !== null;
