/**
 * State of the replay — one reducer, one record per moment, so an answer or a
 * debrief never leaks into another moment and viewing a later moment never
 * marks an earlier one done.
 *
 * Per moment:
 *   viewing   nothing chosen yet (the decision buttons are open)
 *   decided   a choice was made and explained: a retry (wrong choice) or a
 *             request for the evidence / the reason (right choice)
 *   evidence  an evidence option was picked (right / partial / wrong);
 *             a non-right pick can be changed
 *   done      the moment is complete (its outcome shown, the timeline marks it)
 *
 * The camera is not part of this state: looking around never changes an answer.
 */
import { MOMENTS, MOMENT_IDS, momentById, type Choice, type MomentId } from './replayScenario';

export type MomentState = {
  phase: 'viewing' | 'decided' | 'evidence' | 'done';
  choice: Choice | null;
  evidence: string | null;
  /** How many decisions were made at this moment (retries included). */
  tries: number;
};

export type ReplayState = {
  active: MomentId;
  moments: Record<MomentId, MomentState>;
  /** The closing summary is open (after moment 4 is done). */
  summary: boolean;
};

export type ReplayAction =
  | { type: 'goto'; id: MomentId }
  | { type: 'step'; dir: 1 | -1 }
  | { type: 'decide'; choice: Choice }
  | { type: 'retry' }
  | { type: 'evidence'; option: string }
  | { type: 'complete' }
  | { type: 'summary'; open: boolean }
  | { type: 'reset' };

const fresh = (): MomentState => ({ phase: 'viewing', choice: null, evidence: null, tries: 0 });

export function initialReplayState(): ReplayState {
  return {
    active: 'depart',
    moments: Object.fromEntries(MOMENT_IDS.map((id) => [id, fresh()])) as Record<MomentId, MomentState>,
    summary: false,
  };
}

const patch = (s: ReplayState, id: MomentId, p: Partial<MomentState>): ReplayState => ({
  ...s,
  moments: { ...s.moments, [id]: { ...s.moments[id], ...p } },
});

export function replayReducer(s: ReplayState, a: ReplayAction): ReplayState {
  const m = momentById(s.active);
  const ms = s.moments[s.active];
  switch (a.type) {
    case 'goto':
      return a.id === s.active && !s.summary ? s : { ...s, active: a.id, summary: false };
    case 'step': {
      const i = MOMENT_IDS.indexOf(s.active) + a.dir;
      if (i < 0 || i >= MOMENT_IDS.length) return s;
      return { ...s, active: MOMENT_IDS[i], summary: false };
    }
    case 'decide': {
      if (m.kind !== 'decision' || ms.phase !== 'viewing' || !m.onChoice) return s;
      const fb = m.onChoice[a.choice];
      return patch(s, s.active, {
        phase: fb.next === 'done' ? 'done' : 'decided',
        choice: a.choice,
        evidence: null,
        tries: ms.tries + 1,
      });
    }
    case 'retry':
      // only a choice that asked for another try goes back to the buttons
      if (ms.phase !== 'decided' || !ms.choice || m.onChoice?.[ms.choice].next !== 'retry') return s;
      return patch(s, s.active, { phase: 'viewing', choice: null });
    case 'evidence': {
      if (!m.evidence || (ms.phase !== 'decided' && ms.phase !== 'evidence')) return s;
      if (!ms.choice || m.onChoice?.[ms.choice].next !== 'evidence') return s;
      // a right pick is final; partial / wrong picks stay open for another
      const current = m.evidence.options.find((o) => o.id === ms.evidence);
      if (current?.verdict === 'right') return s;
      const opt = m.evidence.options.find((o) => o.id === a.option);
      if (!opt) return s;
      return patch(s, s.active, { phase: opt.verdict === 'right' ? 'done' : 'evidence', evidence: opt.id });
    }
    case 'complete':
      // the guided opening: one action starts moving
      if (m.kind !== 'guided' || ms.phase === 'done') return s;
      return patch(s, s.active, { phase: 'done' });
    case 'summary':
      if (a.open && s.moments.after.phase !== 'done') return s;
      return { ...s, summary: a.open };
    case 'reset':
      return initialReplayState();
  }
}

/** The moment's state is "settled": its outcome may be shown and the map may reveal what was verified. */
export const isDone = (s: ReplayState, id: MomentId) => s.moments[id].phase === 'done';
export const allDone = (s: ReplayState) => MOMENTS.every((m) => isDone(s, m.id));
