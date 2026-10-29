/**
 * Editing state of the planning lab: the route, the tool, the selection and the
 * undo history. A pure reducer (no React) — scripts/qa/planning-lab.test.mjs
 * drives it directly.
 *
 *   route      A, the learner's route points, B — in order along the route.
 *              A and B are identified places and stay put. A route point is
 *              either a plain geometry handle ('way') or a checkpoint ('check'):
 *              a route point tied to an identified feature where the position is
 *              checked. Adding a checkpoint inserts a point where the route
 *              already passes the feature, so the path does not move.
 *   tools      change what a click on the map or the model does — edit the
 *              route, add checkpoints, identify features — never a stage. Every
 *              tool is open from the start; switching keeps the route and the
 *              selection.
 *   history    every completed edit (add, a whole drag, a run of arrow-key
 *              nudges on one point, delete, checkpoint, example, reset) can be
 *              undone. Reset returns to the opening route and can be undone too.
 */
import { DEST, OPENING_WAYPOINT, START, type Point } from './planningLabWorld';
import { clampToSheet, closestOnSegment, distance, featureOf, passOf, type FeatureId } from './planningLabPlan';
import { roadOf, saddle, waterCourses } from './planningLabTerrain';

export type Tool = 'route' | 'checks' | 'identify';
export type NodeKind = 'start' | 'end' | 'way' | 'check';
export type RouteNode = { readonly id: string; readonly E: number; readonly N: number; readonly kind: NodeKind; readonly feature?: FeatureId };
export type Selection = { readonly kind: 'node'; readonly id: string } | { readonly kind: 'leg'; readonly from: string } | { readonly kind: 'feature'; readonly id: FeatureId } | null;

export type NoticeKind = 'not-on-route' | 'already' | 'is-end' | 'limit' | 'too-close' | 'reset' | 'example' | 'undo' | 'check-added' | 'check-removed' | 'removed';
export type Notice = { readonly kind: NoticeKind; readonly feature?: FeatureId; readonly seq: number } | null;

export type State = {
  readonly nodes: readonly RouteNode[];
  readonly past: readonly (readonly RouteNode[])[];
  readonly tool: Tool;
  readonly selection: Selection;
  readonly showDirect: boolean;
  readonly notice: Notice;
  readonly nextId: number;
  /** The point being dragged (its history entry was pushed when the drag began). */
  readonly dragging: string | null;
  /** The point last moved with the keyboard — a run of nudges is one undo step. */
  readonly nudging: string | null;
};

/** Route points the learner may add between A and B. */
export const MAX_POINTS = 12;
/** Two route points closer than this are one point. */
export const MIN_GAP_M = 8;
const HISTORY = 60;

export const OPENING_NODES: readonly RouteNode[] = [
  { id: 'A', ...START, kind: 'start' },
  { id: 'p1', ...OPENING_WAYPOINT, kind: 'way' },
  { id: 'B', ...DEST, kind: 'end' },
];

export const INITIAL_STATE: State = { nodes: OPENING_NODES, past: [], tool: 'route', selection: null, showDirect: false, notice: null, nextId: 2, dragging: null, nudging: null };

export type Action =
  | { type: 'tool'; tool: Tool }
  | { type: 'select'; selection: Selection }
  | { type: 'add'; at: Point }
  | { type: 'insertInLeg'; from: string }
  | { type: 'dragStart'; id: string }
  /** Press the route line and drag: a new route point there, dragged at once (one undo step). */
  | { type: 'grab'; at: Point }
  /** Moves the point being dragged. */
  | { type: 'drag'; id?: string; at: Point }
  | { type: 'dragEnd' }
  | { type: 'nudge'; id: string; dE: number; dN: number }
  | { type: 'remove'; id: string }
  | { type: 'addCheck'; feature: FeatureId }
  | { type: 'unCheck'; id: string }
  | { type: 'toggleDirect' }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'example' };

export const routePoints = (nodes: readonly RouteNode[]): Point[] => nodes.map((n) => ({ E: n.E, N: n.N }));
export const editable = (n: RouteNode) => n.kind === 'way' || n.kind === 'check';

let noticeSeq = 0;
const notice = (kind: NoticeKind, feature?: FeatureId): Notice => ({ kind, feature, seq: ++noticeSeq });

function remember(s: State): readonly (readonly RouteNode[])[] {
  return [...s.past, s.nodes].slice(-HISTORY);
}

/** Where a new point joins the route: the leg whose detour through it is shortest. */
export function insertIndex(nodes: readonly RouteNode[], p: Point): number {
  let best = 1;
  let cost = Infinity;
  for (let k = 0; k < nodes.length - 1; k++) {
    const c = distance(nodes[k], p) + distance(p, nodes[k + 1]) - distance(nodes[k], nodes[k + 1]);
    if (c < cost - 1e-9) {
      cost = c;
      best = k + 1;
    }
  }
  return best;
}

/** A move is valid when the point stays on the sheet and apart from its neighbours. */
function placeable(nodes: readonly RouteNode[], i: number, p: Point): boolean {
  const prev = nodes[i - 1];
  const next = nodes[i + 1];
  return (!prev || distance(prev, p) >= MIN_GAP_M) && (!next || distance(next, p) >= MIN_GAP_M);
}

const pointCount = (nodes: readonly RouteNode[]) => nodes.filter(editable).length;

/**
 * Inserts a checkpoint for `feature` where the route passes it. When a route
 * point already stands there it becomes the checkpoint; otherwise a new point
 * splits the leg at the pass, on the leg itself — the path keeps its shape.
 */
export function withCheckpoint(s: State, feature: FeatureId): State {
  const f = featureOf(feature);
  if (!f.checkpoint) return { ...s, notice: notice('is-end', feature), selection: { kind: 'feature', id: feature } };
  const have = s.nodes.find((n) => n.kind === 'check' && n.feature === feature);
  if (have) return { ...s, notice: notice('already', feature), selection: { kind: 'node', id: have.id } };
  const pass = passOf(feature, s.nodes);
  if (!pass) return { ...s, notice: notice('not-on-route', feature), selection: { kind: 'feature', id: feature } };
  // an existing route point at the pass (not A or B) becomes the checkpoint
  const at = s.nodes.findIndex((n) => editable(n) && n.kind === 'way' && distance(n, pass.at) <= MIN_GAP_M);
  if (at >= 0) {
    const nodes = s.nodes.map((n, i) => (i === at ? { ...n, kind: 'check' as const, feature } : n));
    return { ...s, nodes, past: remember(s), selection: { kind: 'node', id: nodes[at].id }, notice: notice('check-added', feature), nudging: null };
  }
  if (pointCount(s.nodes) >= MAX_POINTS) return { ...s, notice: notice('limit') };
  // the leg that holds the pass
  let seg = 0;
  let best = Infinity;
  for (let k = 0; k < s.nodes.length - 1; k++) {
    const d = closestOnSegment(pass.at, s.nodes[k], s.nodes[k + 1]).d;
    if (d < best) {
      best = d;
      seg = k;
    }
  }
  // too close to an end of that leg (A or B): there is nothing to split
  if (distance(s.nodes[seg], pass.at) < MIN_GAP_M || distance(s.nodes[seg + 1], pass.at) < MIN_GAP_M) return { ...s, notice: notice('too-close', feature) };
  const id = `p${s.nextId}`;
  const node: RouteNode = { id, E: pass.at.E, N: pass.at.N, kind: 'check', feature };
  const nodes = [...s.nodes.slice(0, seg + 1), node, ...s.nodes.slice(seg + 1)];
  return { ...s, nodes, past: remember(s), nextId: s.nextId + 1, selection: { kind: 'node', id }, notice: notice('check-added', feature), nudging: null };
}

/** The example plan: across the stream, up the ravine to the saddle, down to the road and into the grove — with three checkpoints. */
export function exampleNodes(): RouteNode[] {
  const sd = saddle();
  const ravine = waterCourses().ravine.pts;
  const up = (t: number) => {
    const p = ravine[Math.round((ravine.length - 1) * t)];
    return { E: p[0] - 9, N: p[1] };
  };
  const road = roadOf('road').pts;
  const pts: Point[] = [up(0.82), up(0.5), up(0.12), { E: sd.E, N: sd.N }, { E: 505, N: 805 }, { E: road[Math.round(road.length * 0.63)][0], N: road[Math.round(road.length * 0.63)][1] - 40 }];
  let s: State = { ...INITIAL_STATE, nodes: [OPENING_NODES[0], ...pts.map((p, k) => ({ id: `e${k + 1}`, ...p, kind: 'way' as const })), OPENING_NODES[2]], nextId: 100 };
  for (const f of ['stream', 'saddle', 'road'] as FeatureId[]) s = withCheckpoint(s, f);
  return [...s.nodes];
}

function moved(nodes: readonly RouteNode[], id: string, at: Point): readonly RouteNode[] | null {
  const i = nodes.findIndex((n) => n.id === id);
  if (i < 0 || !editable(nodes[i])) return null;
  const p = clampToSheet(at);
  if (!placeable(nodes, i, p)) return null;
  return nodes.map((n, k) => (k === i ? { ...n, E: p.E, N: p.N } : n));
}

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'tool':
      return { ...s, tool: a.tool, notice: null, nudging: null };
    case 'select':
      return { ...s, selection: a.selection, nudging: null };
    case 'add': {
      if (pointCount(s.nodes) >= MAX_POINTS) return { ...s, notice: notice('limit') };
      const p = clampToSheet(a.at);
      const i = insertIndex(s.nodes, p);
      if (!placeable(s.nodes, i, p) || s.nodes.some((n) => distance(n, p) < MIN_GAP_M)) return { ...s, notice: notice('too-close') };
      const id = `p${s.nextId}`;
      const nodes = [...s.nodes.slice(0, i), { id, E: p.E, N: p.N, kind: 'way' as const }, ...s.nodes.slice(i)];
      return { ...s, nodes, past: remember(s), nextId: s.nextId + 1, selection: { kind: 'node', id }, notice: null, nudging: null };
    }
    case 'insertInLeg': {
      const i = s.nodes.findIndex((n) => n.id === a.from);
      if (i < 0 || i >= s.nodes.length - 1) return s;
      if (pointCount(s.nodes) >= MAX_POINTS) return { ...s, notice: notice('limit') };
      const p = { E: (s.nodes[i].E + s.nodes[i + 1].E) / 2, N: (s.nodes[i].N + s.nodes[i + 1].N) / 2 };
      if (distance(s.nodes[i], p) < MIN_GAP_M) return { ...s, notice: notice('too-close') };
      const id = `p${s.nextId}`;
      const nodes = [...s.nodes.slice(0, i + 1), { id, ...p, kind: 'way' as const }, ...s.nodes.slice(i + 1)];
      return { ...s, nodes, past: remember(s), nextId: s.nextId + 1, selection: { kind: 'node', id }, notice: null, nudging: null };
    }
    case 'dragStart': {
      const n = s.nodes.find((x) => x.id === a.id);
      if (!n || !editable(n)) return { ...s, selection: n ? { kind: 'node', id: n.id } : s.selection };
      return { ...s, past: remember(s), dragging: a.id, selection: { kind: 'node', id: a.id }, notice: null, nudging: null };
    }
    case 'grab': {
      const t = reducer(s, { type: 'add', at: a.at });
      return t.nodes === s.nodes ? t : { ...t, dragging: (t.selection as { id: string }).id };
    }
    case 'drag': {
      if (!s.dragging || (a.id && a.id !== s.dragging)) return s;
      const nodes = moved(s.nodes, s.dragging, a.at);
      return nodes ? { ...s, nodes } : s;
    }
    case 'dragEnd': {
      if (!s.dragging) return s;
      // a press without a move leaves no undo step
      const before = s.past[s.past.length - 1];
      const same = before && before.length === s.nodes.length && before.every((n, i) => n.E === s.nodes[i].E && n.N === s.nodes[i].N && n.id === s.nodes[i].id);
      return { ...s, dragging: null, past: same ? s.past.slice(0, -1) : s.past };
    }
    case 'nudge': {
      const n = s.nodes.find((x) => x.id === a.id);
      if (!n) return s;
      const nodes = moved(s.nodes, a.id, { E: n.E + a.dE, N: n.N + a.dN });
      if (!nodes) return s;
      return { ...s, nodes, past: s.nudging === a.id ? s.past : remember(s), nudging: a.id, selection: { kind: 'node', id: a.id }, notice: null };
    }
    case 'remove': {
      const i = s.nodes.findIndex((n) => n.id === a.id);
      if (i < 0 || !editable(s.nodes[i])) return s;
      const nodes = s.nodes.filter((_, k) => k !== i);
      return { ...s, nodes, past: remember(s), selection: null, notice: notice('removed', s.nodes[i].feature), nudging: null };
    }
    case 'addCheck':
      return withCheckpoint({ ...s, nudging: null }, a.feature);
    case 'unCheck': {
      const i = s.nodes.findIndex((n) => n.id === a.id);
      const n = s.nodes[i];
      if (!n || n.kind !== 'check') return s;
      // A point that only split a straight leg goes away; one that bends the route stays as a plain route point.
      const straight = closestOnSegment(n, s.nodes[i - 1], s.nodes[i + 1]).d < 0.5;
      const nodes = straight ? s.nodes.filter((_, k) => k !== i) : s.nodes.map((x, k) => (k === i ? { id: x.id, E: x.E, N: x.N, kind: 'way' as const } : x));
      return { ...s, nodes, past: remember(s), selection: straight ? null : { kind: 'node', id: n.id }, notice: notice('check-removed', n.feature), nudging: null };
    }
    case 'toggleDirect':
      return { ...s, showDirect: !s.showDirect };
    case 'undo': {
      if (!s.past.length) return s;
      const nodes = s.past[s.past.length - 1];
      const sel = s.selection;
      const keep = sel?.kind === 'feature' || (sel?.kind === 'node' && nodes.some((n) => n.id === sel.id)) || (sel?.kind === 'leg' && nodes.slice(0, -1).some((n) => n.id === sel.from));
      return { ...s, nodes, past: s.past.slice(0, -1), selection: keep ? sel : null, notice: notice('undo'), dragging: null, nudging: null };
    }
    case 'reset':
      return { ...s, nodes: OPENING_NODES, past: remember(s), selection: null, notice: notice('reset'), dragging: null, nudging: null, nextId: Math.max(s.nextId, 2) };
    case 'example':
      return { ...s, nodes: exampleNodes(), past: remember(s), selection: null, notice: notice('example'), dragging: null, nudging: null };
  }
}

/** Checkpoints in route order, numbered 1… by their place along the route (not by when they were added). */
export function checkpointsInOrder(nodes: readonly RouteNode[]): { node: RouteNode; n: number }[] {
  return nodes.filter((x) => x.kind === 'check').map((node, k) => ({ node, n: k + 1 }));
}
