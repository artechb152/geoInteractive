/**
 * Measurement mission — pure logic (no React), unit-tested in
 * scripts/qa/measurement-mission.test.mjs.
 */
import { STATIONS, STATION_ORDER, type StationId } from './measurementMission.data';

/** Orthometric height: the only place the answer is derived — H = h − N. */
export function orthometric(id: StationId): number {
  const { h, N } = STATIONS[id];
  return h - N;
}

/** "−12", "+28", "0" — signed, with a real minus sign. */
export function signed(n: number): string {
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/** The worked subtraction: "148 − 28 = 120", "18 − (−12) = 30", "220 − 0 = 220". */
export function workedSum(id: StationId): string {
  const { h, N } = STATIONS[id];
  const n = N < 0 ? `(−${Math.abs(N)})` : `${N}`;
  return `${h} − ${n} = ${orthometric(id)}`;
}

export type Parsed = { ok: true; value: number } | { ok: false; reason: 'empty' | 'invalid' };

/**
 * Reads the H field. Spaces (incl. no-break / thin) are dropped, a Unicode
 * minus or dash counts as "-", a decimal comma as ".". Empty is NOT zero.
 */
export function parseHeight(raw: string): Parsed {
  const s = raw
    .replace(/[\s    ‎‏]/g, '')
    .replace(/[−‒–—﹣－]/g, '-')
    .replace(/,/g, '.');
  if (s === '') return { ok: false, reason: 'empty' };
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return { ok: false, reason: 'invalid' };
  const value = Number(s);
  if (!Number.isFinite(value)) return { ok: false, reason: 'invalid' };
  return { ok: true, value };
}

export type Verdict =
  | 'empty' // nothing typed — not an attempt
  | 'invalid' // not a number — not an attempt
  | 'correct'
  | 'gave-h' // typed h: read from the wrong reference surface
  | 'added-n' // typed h + N: the sign of the operation
  | 'wrong';

/** Exact comparison: every value here is a whole number, so 120.0 passes and 119.9 does not. */
export function evaluate(id: StationId, raw: string): Verdict {
  const p = parseHeight(raw);
  if (!p.ok) return p.reason;
  const { h, N } = STATIONS[id];
  const H = h - N;
  if (p.value === H) return 'correct';
  if (p.value === h) return 'gave-h';
  if (p.value === h + N) return 'added-n';
  return 'wrong';
}

/** Whether a verdict counts as an attempt (empty / non-numeric input does not). */
export const isAttempt = (v: Verdict) => v !== 'empty' && v !== 'invalid';

/** The next unsolved station after `current` in B → A → C order, or null when all are solved. */
export function nextStation(current: StationId, solved: ReadonlySet<StationId>): StationId | null {
  const start = STATION_ORDER.indexOf(current);
  for (let k = 1; k <= STATION_ORDER.length; k++) {
    const id = STATION_ORDER[(start + k) % STATION_ORDER.length];
    if (!solved.has(id)) return id;
  }
  return null;
}

// ---------------------------------------------------------------- per-station state

export type StationState = {
  /** What is in the H field for this station. */
  draft: string;
  /** Feedback of the last check (null = not checked since the last edit of the station). */
  verdict: Verdict | null;
  attempts: number;
  solved: boolean;
};

export type MissionState = {
  station: StationId;
  byStation: Record<StationId, StationState>;
};

const blank = (): StationState => ({ draft: '', verdict: null, attempts: 0, solved: false });

export function initialMission(first: StationId): MissionState {
  return { station: first, byStation: { A: blank(), B: blank(), C: blank() } };
}

export type MissionAction =
  | { type: 'select'; id: StationId }
  | { type: 'edit'; value: string }
  | { type: 'check' }
  | { type: 'reset'; first: StationId };

export function missionReducer(state: MissionState, action: MissionAction): MissionState {
  const cur = state.byStation[state.station];
  const put = (s: StationState): MissionState => ({ ...state, byStation: { ...state.byStation, [state.station]: s } });
  switch (action.type) {
    case 'select':
      return action.id === state.station ? state : { ...state, station: action.id };
    case 'edit':
      if (cur.solved) return state;
      return put({ ...cur, draft: action.value });
    case 'check': {
      if (cur.solved) return state;
      const verdict = evaluate(state.station, cur.draft);
      return put({ ...cur, verdict, attempts: cur.attempts + (isAttempt(verdict) ? 1 : 0), solved: verdict === 'correct' });
    }
    case 'reset':
      return initialMission(action.first);
  }
}

export const solvedSet = (s: MissionState) =>
  new Set((Object.keys(s.byStation) as StationId[]).filter((id) => s.byStation[id].solved));
