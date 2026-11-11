/**
 * Where the navigator of „במהלך הניווט” really walks — the ground truth of
 * the decision exercise, in world metres (replayWorld: x east, z south).
 *
 * The planned route is the planning lab's example (replayGeography):
 *   leg A  חציית הנחל (P1) → האוכף (P2), ~400 m
 *   leg B  האוכף (P2) → חציית דרך העפר (P3), ~450 m, through the oak woodland
 *          (W-north) that lies across the valley north of the saddle.
 *
 * Stops are the places where the learner decides. Which ones are visited
 * depends on the decisions, but every one of them, and every walked segment
 * between them, is fixed here — so the 3D world can be prepared for exactly
 * these paths and the tests can check them.
 *
 * The scenario event: inside the woodland the line is lost (the navigator
 * weaves between oaks) and leaves its northern edge right of the plan,
 * walking down the fall line. Nothing the learner does causes it; what the
 * learner decides there only changes WHEN it is found and what that costs:
 *   - a check right after the woodland finds ~55 m and corrects to the crossing;
 *   - going on reaches the road early, ~140 m east of the crossing;
 *   - going on again crosses the road towards the destination, until the
 *     pines are clearly in the wrong place — then a check is required.
 */
import { LEG_PATHS, P1, P2, P3, END, SUMMIT_N, SUMMIT_S, pointOnLeg, type Pt } from './replayGeography';
import { ROAD_LINE, STREAM_LINE, heightAt } from './replayTerrain';
import { replayTrees } from './replayLandmarks';
import { along, bearingW, distW, nearestOn, polyline, toMap, toWorld, type Polyline, type W2 } from './replayWorld';

export type StopId = 'stream' | 'enroute' | 'saddle' | 'woods' | 'road' | 'beyond' | 'crossing';
export type SignId = 'saddle' | 'summitW' | 'summitE' | 'stream' | 'road' | 'woodland' | 'pines';

// ───────────────────────────────────────────── the plan

export const PLAN_A: W2[] = LEG_PATHS[1].map(toWorld);
export const PLAN_B: W2[] = LEG_PATHS[2].map(toWorld);
/** The leg after the crossing (to the pines), only for the walk past the road. */
export const PLAN_C: W2[] = LEG_PATHS[3].map(toWorld);
export const PLAN_A_LINE = polyline(PLAN_A);
export const PLAN_B_LINE = polyline(PLAN_B);

/** A point `m` metres along a polyline (clamped to its ends). */
export function pointAlong(pl: Polyline, m: number): W2 {
  const d = Math.max(0, Math.min(pl.length, m));
  for (let i = 1; i < pl.pts.length; i++) {
    if (d <= pl.cum[i] || i === pl.pts.length - 1) {
      const a = pl.pts[i - 1];
      const b = pl.pts[i];
      const t = (d - pl.cum[i - 1]) / (pl.cum[i] - pl.cum[i - 1] || 1);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
  }
  return pl.pts[0];
}

/** The part of a polyline from `a` to `b` metres along it. */
export function slice(pl: Polyline, a: number, b: number): W2[] {
  const out = [pointAlong(pl, a)];
  for (let i = 0; i < pl.pts.length; i++) if (pl.cum[i] > a + 0.5 && pl.cum[i] < b - 0.5) out.push(pl.pts[i]);
  out.push(pointAlong(pl, b));
  return out;
}

// ───────────────────────────────────────────── trees the walk must pass between

/** The oaks of the woodland belt north of the saddle (W-north), with their crown radius. */
export const WOODLAND_OAKS = replayTrees()
  .filter((t) => t.group === 'woodland' && t.z < -120 && t.z > -300 && t.x > -230 && t.x < 240)
  .map((t) => ({ x: t.x, z: t.z, r: t.crownR }));

/** Clearance between the eye's path and a crown's edge, m (the crowns start ~1.6 m up). */
const CROWN_CLEAR = 1.1;

/** Smallest gap between a point and any woodland crown's edge (negative inside a crown). */
export function crownGap(p: W2): number {
  let best = Infinity;
  for (const t of WOODLAND_OAKS) best = Math.min(best, Math.hypot(p.x - t.x, p.z - t.z) - t.r);
  return best;
}

/**
 * The easiest way between two points through the woodland: A* on a 1 m grid,
 * crowns (plus clearance) blocked, cost rising near them, then smoothed — a
 * path that weaves between the trees the way a walker does.
 */
function weave(a: W2, b: W2): W2[] {
  const pad = 40;
  const x0 = Math.floor(Math.min(a.x, b.x) - pad);
  const z0 = Math.floor(Math.min(a.z, b.z) - pad);
  const nx = Math.ceil(Math.max(a.x, b.x) + pad) - x0;
  const nz = Math.ceil(Math.max(a.z, b.z) + pad) - z0;
  const cost = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const g = crownGap({ x: x0 + i, z: z0 + j });
      cost[j * nx + i] = g < CROWN_CLEAR ? Infinity : 1 + 2.4 / Math.max(0.6, g);
    }
  const idx = (p: W2) => Math.round(p.z - z0) * nx + Math.round(p.x - x0);
  const start = idx(a);
  const goal = idx(b);
  const g = new Float32Array(nx * nz).fill(Infinity);
  const from = new Int32Array(nx * nz).fill(-1);
  const open: number[] = [start];
  const f = new Float32Array(nx * nz).fill(Infinity);
  g[start] = 0;
  const hx = (k: number) => Math.hypot((k % nx) - (goal % nx), Math.floor(k / nx) - Math.floor(goal / nx));
  f[start] = hx(start);
  const closed = new Uint8Array(nx * nz);
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % nx;
    const cj = Math.floor(cur / nx);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
        const n = nj * nx + ni;
        if (closed[n] || cost[n] === Infinity) continue;
        const step = Math.hypot(di, dj) * (cost[n] + cost[cur]) * 0.5;
        if (g[cur] + step < g[n]) {
          g[n] = g[cur] + step;
          from[n] = cur;
          f[n] = g[n] + hx(n);
          open.push(n);
        }
      }
  }
  if (from[goal] < 0) throw new Error('no way through the woodland');
  const raw: W2[] = [];
  for (let k = goal; k >= 0; k = from[k]) raw.push({ x: x0 + (k % nx), z: z0 + Math.floor(k / nx) });
  raw.reverse();
  raw[0] = a;
  raw[raw.length - 1] = b;
  // smooth (moving average) without pulling the path into a crown
  let pts = raw;
  for (let pass = 0; pass < 6; pass++) {
    pts = pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return p;
      const q = { x: (pts[i - 1].x + p.x * 2 + pts[i + 1].x) / 4, z: (pts[i - 1].z + p.z * 2 + pts[i + 1].z) / 4 };
      return crownGap(q) >= CROWN_CLEAR ? q : p;
    });
  }
  // every ~3 m is enough for the walk and the map
  const pl = polyline(pts);
  const out: W2[] = [];
  for (let m = 0; m < pl.length; m += 3) out.push(pointAlong(pl, m));
  out.push(b);
  return out;
}

// ───────────────────────────────────────────── stops and segments

/** Metres along leg B's plan where it enters the woodland (the true path follows the plan to here). */
const WOODS_IN_M = 112;
/** Where the navigator leaves the woodland: past its northern edge, right of the plan. */
const WOODS_OUT: W2 = { x: -30, z: -291 };
/** The heading walked after the woodland when nobody checks: down the fall line. */
export const FALL_LINE_AZ = 340;
/** Where the en-route stop stands on leg A, m — low enough that both summits and the notch between them are in sight. */
const ENROUTE_M = 95;
/** How far the walk goes on past the road when the learner goes on there. */
const PAST_ROAD_M = 90;

function hitRoad(from: W2, az: number): W2 {
  // walk the heading until the road's centre line is crossed
  let prev = from;
  for (let m = 2; m < 400; m += 2) {
    const p = along(from, az, m);
    if (nearestOn(ROAD_LINE, p).d < 1.2) return p;
    if (p.z < -330 && nearestOn(ROAD_LINE, p).d > nearestOn(ROAD_LINE, prev).d) return prev;
    prev = p;
  }
  throw new Error('the fall line never reaches the road');
}

const ROAD_HIT = hitRoad(WOODS_OUT, FALL_LINE_AZ);
const PAST_ROAD = along(ROAD_HIT, PLAN_C.length > 1 ? bearingW(PLAN_C[0], PLAN_C[PLAN_C.length - 1]) : 315, PAST_ROAD_M);

/** The true place of every stop, where the eye stands. */
export const STOP_AT: Record<StopId, W2> = {
  stream: toWorld(pointOnLeg(1, 0.015)),
  enroute: pointAlong(PLAN_A_LINE, ENROUTE_M),
  saddle: toWorld(P2),
  woods: WOODS_OUT,
  road: ROAD_HIT,
  beyond: PAST_ROAD,
  crossing: toWorld(P3),
};

/** The road between two of its points (the handrail walked to the crossing). */
function alongRoad(a: W2, b: W2): W2[] {
  const sa = nearestOn(ROAD_LINE, a).s;
  const sb = nearestOn(ROAD_LINE, b).s;
  const pts = sa <= sb ? slice(ROAD_LINE, sa, sb) : slice(ROAD_LINE, sb, sa).reverse();
  pts[0] = a;
  pts[pts.length - 1] = b;
  return pts;
}

const straight = (a: W2, b: W2): W2[] => {
  const n = Math.max(2, Math.ceil(distW(a, b) / 6));
  return Array.from({ length: n + 1 }, (_, k) => ({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n }));
};

const woodsIn = pointAlong(PLAN_B_LINE, WOODS_IN_M);
/** The woodland part of the walk, for the event line shown while it is walked. */
export const WOODLAND_WALK = weave(woodsIn, WOODS_OUT);

export type SegmentKey = `${StopId}>${StopId}`;

/** Every walk the exercise can make. */
export const SEGMENTS: Partial<Record<SegmentKey, W2[]>> = {
  'stream>enroute': [STOP_AT.stream, ...slice(PLAN_A_LINE, nearestOn(PLAN_A_LINE, STOP_AT.stream).s, ENROUTE_M).slice(1)],
  'enroute>saddle': slice(PLAN_A_LINE, ENROUTE_M, PLAN_A_LINE.length),
  'saddle>woods': [...slice(PLAN_B_LINE, 0, WOODS_IN_M), ...WOODLAND_WALK.slice(1)],
  'woods>road': straight(WOODS_OUT, ROAD_HIT),
  'road>beyond': straight(ROAD_HIT, PAST_ROAD),
  'woods>crossing': straight(WOODS_OUT, STOP_AT.crossing),
  'road>crossing': alongRoad(ROAD_HIT, STOP_AT.crossing),
  'beyond>crossing': straight(PAST_ROAD, STOP_AT.crossing),
};

export const segmentOf = (from: StopId, to: StopId) => SEGMENTS[`${from}>${to}`] ?? null;

/** All walked paths of leg A / leg B (the 3D world details the ground along them). */
export const LEG_A_PATHS: W2[][] = [SEGMENTS['stream>enroute']!, SEGMENTS['enroute>saddle']!];
export const LEG_B_PATHS: W2[][] = (['saddle>woods', 'woods>road', 'road>beyond', 'woods>crossing', 'road>crossing', 'beyond>crossing'] as const).map((k) => SEGMENTS[k]!);

/**
 * Which prepared 3D world shows a stop: a light one around the start (drawn first, quickly), leg A's
 * corridor, and leg B's (which also covers the saddle, where its walks begin).
 */
export type WorldKey = 'start' | 'legA' | 'legB';
export const worldOfStop = (id: StopId): WorldKey => (id === 'stream' ? 'start' : id === 'enroute' || id === 'saddle' ? 'legA' : 'legB');

// ───────────────────────────────────────────── signs: what can be identified in the view and on the map

/**
 * kind:
 *   point  a feature at one place (summit, saddle) — seen from afar it gives
 *          a direction line; stood in, it is the place itself
 *   line   a linear feature (road, stream) — stood on, it gives a line of places
 *   area   a feature too big to mark a place (the woodland, the pine grove's
 *          spread) — recognised, but it cannot fix a position by itself…
 *          except the pine grove, small enough to sight on from the road
 */
export type Sign = {
  id: SignId;
  name: string;
  /** with the definite article, for sentences */
  the: string;
  kind: 'point' | 'line' | 'area';
  at?: W2;
  line?: Polyline;
  /** for an area: the points it is made of */
  members?: W2[];
};

const PINES = replayTrees().filter((t) => t.kind === 'pine').map((t) => ({ x: t.x, z: t.z }));
const pinesCentre = toWorld(END);

export const SIGNS: Record<SignId, Sign> = {
  saddle: { id: 'saddle', name: 'האוכף', the: 'האוכף', kind: 'point', at: toWorld(P2) },
  summitW: { id: 'summitW', name: 'הפסגה המערבית', the: 'הפסגה המערבית', kind: 'point', at: toWorld(SUMMIT_S) },
  summitE: { id: 'summitE', name: 'הפסגה המזרחית', the: 'הפסגה המזרחית', kind: 'point', at: toWorld(SUMMIT_N) },
  stream: { id: 'stream', name: 'ערוץ הנחל', the: 'ערוץ הנחל', kind: 'line', line: STREAM_LINE },
  road: { id: 'road', name: 'דרך העפר', the: 'דרך העפר', kind: 'line', line: ROAD_LINE },
  woodland: { id: 'woodland', name: 'החורש', the: 'החורש', kind: 'area', members: WOODLAND_OAKS },
  pines: { id: 'pines', name: 'חורשת האורנים', the: 'חורשת האורנים', kind: 'point', at: pinesCentre, members: PINES },
};

/** Is the eye standing in a point sign (the saddle)? */
export const STAND_IN_M = 40;

/**
 * The signs that can be made out from each stop — sight lines over the terrain and through the tree
 * crowns (the tests recompute them); for choosing a sign from the list. From the woodland's edge both
 * summits are hidden behind the slope and the oaks: the pine grove is the sign there.
 */
export const STOP_SEES: Record<StopId, SignId[]> = {
  stream: ['saddle', 'summitW', 'summitE', 'stream'],
  enroute: ['saddle', 'summitW', 'summitE', 'stream'],
  saddle: ['saddle', 'summitW', 'summitE', 'woodland', 'road'],
  woods: ['pines', 'road', 'woodland'],
  road: ['summitW', 'summitE', 'road', 'pines', 'woodland'],
  beyond: ['summitW', 'summitE', 'pines', 'woodland'],
  crossing: ['road', 'pines', 'summitW', 'woodland'],
};

/** Where a sign is drawn when it is chosen from the list: its point, or the nearest part of a line. */
export function signAnchor(id: SignId, eye: W2): W2 | null {
  const s = SIGNS[id];
  if (s.at) return s.at;
  if (s.line) {
    const n = nearestOn(s.line, eye);
    return pointAlong(s.line, n.s);
  }
  return null;
}

/** Map units of a world point (for the SVG map). */
export const mapOf = (w: W2): Pt => toMap(w);

/** Eye height over the analytic ground (the tests' line-of-sight checks). */
export const eyeH = (p: W2) => heightAt(p.x, p.z) + 1.7;

/** The planned checkpoints in world metres. */
export const PLAN_POINTS = { stream: toWorld(P1), saddle: toWorld(P2), crossing: toWorld(P3), pines: pinesCentre };
