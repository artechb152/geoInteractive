/**
 * The one terrain of the location-check activity, and everything derived from it.
 *
 *   height grid   the generator H(E,N) of the brief (§6) sampled every 5 m:
 *                 281 × 211 samples over 0 ≤ E ≤ 1400, 0 ≤ N ≤ 1050.
 *   triangles     every grid cell is split along its SW–NE diagonal, always.
 *                 The 3D mesh (LocationCheckTerrain3D) uses exactly these
 *                 triangles, and heightAt() interpolates on them — so a tree,
 *                 a highlight or a label placed with heightAt() sits on the
 *                 surface that is drawn.
 *   contours      marching triangles over the same triangles, every 10 m
 *                 (index line every 50 m). A contour vertex lies on a mesh edge
 *                 at the contour height; scripts/qa/location-check.test.mjs
 *                 checks it (±0.1 m) on the unrounded values.
 *   cover         grove trees (deterministic Poisson-disk inside each grove
 *                 polygon), low scrub, and the dirt roads (smooth curves
 *                 through the scenario's control points). The map draws the
 *                 same tree positions and road centre-lines the model uses.
 *
 * Everything is computed once, on first use, and memoised. No three.js here,
 * so the SVG map and plain Node can use it.
 */
import {
  EYE_HEIGHT_M,
  FORK,
  GROVES,
  HEIGHT_DATUM_M,
  LAST_KNOWN,
  CANDIDATES,
  OBSERVER,
  ROAD_CONTROL_POINTS,
  ROAD_WIDTH_M,
  WORLD_BOUNDS,
  type GroveId,
  type Point,
  type XY,
} from './locationCheckScenario';
import {
  angularDifference,
  bearing,
  distance,
  distanceToPolyline,
  grovePolygon,
  pointInPolygon,
} from './locationCheckGeometry';

// ---------------------------------------------------------------- height field

export const GRID = { stepM: 5, nE: 281, nN: 211 } as const;
/** Contour interval and index interval, metres. */
export const CONTOUR_INTERVAL_M = 10;
export const INDEX_INTERVAL_M = 50;

/**
 * The brief's deterministic generator, in metres. Fictional data, not a
 * geological model. Defined everywhere, so the 3D apron beyond the mapped
 * sheet continues the same ground.
 */
export function heightField(E: number, N: number): number {
  return (
    HEIGHT_DATUM_M +
    100 * Math.exp(-(((E - 1000) / 260) ** 2) - ((N - 800) / 240) ** 2) +
    30 * Math.exp(-(((E - 160) / 180) ** 2) - ((N - 880) / 140) ** 2) +
    8 * Math.sin(E / 180) * Math.sin(N / 220)
  );
}

let gridCache: Float64Array | null = null;

/** Heights at the grid samples, row-major from the south: index j·281 + i ↔ (E = 5i, N = 5j). */
export function heightGrid(): Float64Array {
  if (!gridCache) {
    const g = new Float64Array(GRID.nE * GRID.nN);
    for (let j = 0; j < GRID.nN; j++) for (let i = 0; i < GRID.nE; i++) g[j * GRID.nE + i] = heightField(i * GRID.stepM, j * GRID.stepM);
    gridCache = g;
  }
  return gridCache;
}

export function insideSheet(E: number, N: number): boolean {
  return E >= WORLD_BOUNDS.minE && E <= WORLD_BOUNDS.maxE && N >= WORLD_BOUNDS.minN && N <= WORLD_BOUNDS.maxN;
}

/**
 * Ground height at (E, N), interpolated on the mesh triangle that contains the
 * point (cell split SW–NE). Outside the sheet the apron mesh samples the
 * generator directly, so this does too.
 */
export function heightAt(E: number, N: number): number {
  if (!insideSheet(E, N)) return heightField(E, N);
  const g = heightGrid();
  const fi = E / GRID.stepM;
  const fj = N / GRID.stepM;
  const i = Math.min(Math.floor(fi), GRID.nE - 2);
  const j = Math.min(Math.floor(fj), GRID.nN - 2);
  const u = fi - i;
  const v = fj - j;
  const a = g[j * GRID.nE + i]; // SW
  const b = g[j * GRID.nE + i + 1]; // SE
  const c = g[(j + 1) * GRID.nE + i + 1]; // NE
  const d = g[(j + 1) * GRID.nE + i]; // NW
  return u >= v ? a + u * (b - a) + v * (c - b) : a + v * (d - a) + u * (c - d);
}

/**
 * Mesh axis for the 3D terrain: exactly the 5 m sheet samples, then spacing
 * that grows geometrically outward to `extentM` beyond the sheet (the apron
 * that carries the ground to the hazy horizon). A rectilinear grid, so the
 * apron joins the sheet without cracks.
 */
export function meshAxis(min: number, max: number, extentM: number, growth = 1.22): number[] {
  const n = Math.round((max - min) / GRID.stepM);
  const inner = Array.from({ length: n + 1 }, (_, k) => min + k * GRID.stepM);
  const before: number[] = [];
  const after: number[] = [];
  let s = GRID.stepM;
  let lo = min;
  let hi = max;
  while (lo > min - extentM) {
    s *= growth;
    lo -= s;
    hi += s;
    before.unshift(lo);
    after.push(hi);
  }
  return [...before, ...inner, ...after];
}

// ---------------------------------------------------------------- contours

export type ContourLine = { readonly pts: readonly XY[]; readonly closed: boolean };
export type ContourLevel = { readonly heightM: number; readonly index: boolean; readonly lines: readonly ContourLine[] };

// Mesh edges, numbered: horizontal (i,j)–(i+1,j), vertical (i,j)–(i,j+1),
// diagonal (i,j)–(i+1,j+1). Cell (i,j) = SW a, SE b, NE c, NW d; triangles
// (a,b,c) and (a,c,d) — the SW–NE split.
const H_EDGES = (GRID.nE - 1) * GRID.nN;
const V_EDGES = GRID.nE * (GRID.nN - 1);
const N_EDGES = H_EDGES + V_EDGES + (GRID.nE - 1) * (GRID.nN - 1);
const hEdge = (i: number, j: number) => j * (GRID.nE - 1) + i;
const vEdge = (i: number, j: number) => H_EDGES + j * GRID.nE + i;
const dEdge = (i: number, j: number) => H_EDGES + V_EDGES + j * (GRID.nE - 1) + i;

/** Per-edge scratch, shared by every level (contours() runs once). */
let scratch: { ptE: Float64Array; ptN: Float64Array; seg0: Int32Array; seg1: Int32Array } | null = null;

function extractLevel(g: Float64Array, level: number): ContourLine[] {
  const nE = GRID.nE;
  scratch ??= { ptE: new Float64Array(N_EDGES), ptN: new Float64Array(N_EDGES), seg0: new Int32Array(N_EDGES), seg1: new Int32Array(N_EDGES) };
  const { ptE, ptN, seg0, seg1 } = scratch;
  seg0.fill(-1);
  seg1.fill(-1);
  const segA: number[] = [];
  const segB: number[] = [];
  // Vertex classification: strictly above the level vs not — every triangle
  // then has 0 or 2 crossing edges, and a shared edge yields one shared point.
  const cross = (edge: number, p: number, q: number) => {
    const hp = g[p];
    const hq = g[q];
    if (hp > level === hq > level) return -1;
    if (seg0[edge] === -1) {
      const t = (level - hp) / (hq - hp);
      const Ep = (p % nE) * GRID.stepM;
      const Np = ((p - (p % nE)) / nE) * GRID.stepM;
      const Eq = (q % nE) * GRID.stepM;
      const Nq = ((q - (q % nE)) / nE) * GRID.stepM;
      ptE[edge] = Ep + t * (Eq - Ep);
      ptN[edge] = Np + t * (Nq - Np);
    }
    return edge;
  };
  const link = (e: number, s: number) => {
    if (seg0[e] === -1) seg0[e] = s;
    else seg1[e] = s;
  };
  const tri = (e1: number, e2: number, e3: number) => {
    // Exactly two of the three are ≥ 0 when the triangle is crossed.
    const x = e1 >= 0 ? e1 : e2;
    const y = e1 >= 0 ? (e2 >= 0 ? e2 : e3) : e3;
    if (x < 0 || y < 0) return;
    const s = segA.length;
    segA.push(x);
    segB.push(y);
    link(x, s);
    link(y, s);
  };
  for (let j = 0; j < GRID.nN - 1; j++) {
    for (let i = 0; i < nE - 1; i++) {
      const a = j * nE + i;
      const b = a + 1;
      const c = a + nE + 1;
      const d = a + nE;
      // A cell whose four corners are all on one side of the level has no crossing.
      const above = (g[a] > level ? 1 : 0) + (g[b] > level ? 1 : 0) + (g[c] > level ? 1 : 0) + (g[d] > level ? 1 : 0);
      if (above === 0 || above === 4) continue;
      const ac = cross(dEdge(i, j), a, c);
      tri(cross(hEdge(i, j), a, b), cross(vEdge(i + 1, j), b, c), ac);
      tri(ac, cross(hEdge(i, j + 1), d, c), cross(vEdge(i, j), a, d));
    }
  }

  const used = new Uint8Array(segA.length);
  const walk = (start: number, fromSeg: number, out: number[]) => {
    let cur = start;
    let prev = fromSeg;
    for (;;) {
      const s0 = seg0[cur];
      const s1 = seg1[cur];
      const next = s0 !== prev && s0 >= 0 && !used[s0] ? s0 : s1 !== prev && s1 >= 0 && !used[s1] ? s1 : -1;
      if (next < 0) return;
      used[next] = 1;
      const other = segA[next] === cur ? segB[next] : segA[next];
      out.push(other);
      cur = other;
      prev = next;
    }
  };
  const lines: ContourLine[] = [];
  for (let s = 0; s < segA.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const fwd: number[] = [segA[s], segB[s]];
    walk(segB[s], s, fwd);
    const closed = fwd.length > 2 && fwd[0] === fwd[fwd.length - 1];
    let keys = fwd;
    if (closed) keys = fwd.slice(0, -1);
    else {
      const back: number[] = [];
      walk(segA[s], s, back);
      keys = [...back.reverse(), ...fwd];
    }
    lines.push({ pts: keys.map((k) => [ptE[k], ptN[k]] as XY), closed });
  }
  return lines;
}

let contourCache: ContourLevel[] | null = null;

/** Every contour level of the sheet, from the mesh triangles. */
export function contours(): readonly ContourLevel[] {
  if (!contourCache) {
    const g = heightGrid();
    let lo = Infinity;
    let hi = -Infinity;
    for (const h of g) {
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    const out: ContourLevel[] = [];
    for (let h = Math.ceil(lo / CONTOUR_INTERVAL_M) * CONTOUR_INTERVAL_M; h <= hi; h += CONTOUR_INTERVAL_M) {
      out.push({ heightM: h, index: h % INDEX_INTERVAL_M === 0, lines: extractLevel(g, h) });
    }
    scratch = null;
    contourCache = out;
  }
  return contourCache;
}

// ---------------------------------------------------------------- spot heights

export type SpotHeight = { readonly E: number; readonly N: number; readonly heightM: number };

/** Highest grid sample inside a box. */
function peakIn(minE: number, maxE: number, minN: number, maxN: number): SpotHeight {
  const g = heightGrid();
  let best: SpotHeight = { E: 0, N: 0, heightM: -Infinity };
  for (let j = Math.ceil(minN / GRID.stepM); j <= Math.floor(maxN / GRID.stepM); j++) {
    for (let i = Math.ceil(minE / GRID.stepM); i <= Math.floor(maxE / GRID.stepM); i++) {
      const h = g[j * GRID.nE + i];
      if (h > best.heightM) best = { E: i * GRID.stepM, N: j * GRID.stepM, heightM: h };
    }
  }
  return best;
}

let spotCache: { summit: SpotHeight; westHill: SpotHeight } | null = null;
/** The main summit and the low hill in the north-west — the sheet's two spot heights. */
export function spotHeights() {
  if (!spotCache) spotCache = { summit: peakIn(800, 1200, 600, 1000), westHill: peakIn(0, 400, 700, 1050) };
  return spotCache;
}

// ---------------------------------------------------------------- roads

export type RoadId = 'main' | 'branch';
export type Road = { readonly id: RoadId; readonly pts: readonly XY[] };

/**
 * Centripetal Catmull-Rom through every control point, sampled about every
 * `stepM`. Control points are emitted verbatim, so FORK lies on the curve
 * exactly.
 */
export function smoothCurve(ctrl: readonly XY[], stepM = 2): XY[] {
  const n = ctrl.length;
  const P: XY[] = [
    [2 * ctrl[0][0] - ctrl[1][0], 2 * ctrl[0][1] - ctrl[1][1]],
    ...ctrl,
    [2 * ctrl[n - 1][0] - ctrl[n - 2][0], 2 * ctrl[n - 1][1] - ctrl[n - 2][1]],
  ];
  const lerp = (a: XY, b: XY, ta: number, tb: number, t: number): XY => {
    const w = tb === ta ? 0 : (t - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  };
  const knot = (a: XY, b: XY) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]));
  const out: XY[] = [];
  for (let s = 0; s < n - 1; s++) {
    const [p0, p1, p2, p3] = [P[s], P[s + 1], P[s + 2], P[s + 3]];
    const t0 = 0;
    const t1 = t0 + knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    const steps = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / stepM));
    out.push(ctrl[s]);
    for (let k = 1; k < steps; k++) {
      const t = t1 + ((t2 - t1) * k) / steps;
      const a1 = lerp(p0, p1, t0, t1, t);
      const a2 = lerp(p1, p2, t1, t2, t);
      const a3 = lerp(p2, p3, t2, t3, t);
      const b1 = lerp(a1, a2, t0, t2, t);
      const b2 = lerp(a2, a3, t1, t3, t);
      out.push(lerp(b1, b2, t1, t2, t));
    }
  }
  out.push(ctrl[n - 1]);
  return out;
}

let roadCache: Road[] | null = null;
export function roads(): readonly Road[] {
  if (!roadCache) {
    roadCache = [
      { id: 'main', pts: smoothCurve(ROAD_CONTROL_POINTS.main) },
      { id: 'branch', pts: smoothCurve(ROAD_CONTROL_POINTS.branch) },
    ];
  }
  return roadCache;
}

export function distanceToRoads(p: Point): number {
  return Math.min(...roads().map((r) => distanceToPolyline(p, r.pts)));
}

/** Spatial hash of the road samples (≈ 2 m apart) for fast "near a road?" tests. */
const ROAD_HASH_CELL = 20;
let roadHash: Map<number, XY[]> | null = null;
/** Road samples in the hash cells within radiusM of p (a superset; callers measure). */
function roadSamplesNear(p: Point, radiusM: number): XY[] {
  if (!roadHash) {
    roadHash = new Map();
    for (const r of roads()) {
      for (const q of r.pts) {
        const k = Math.floor(q[0] / ROAD_HASH_CELL) * 1000 + Math.floor(q[1] / ROAD_HASH_CELL);
        const list = roadHash.get(k);
        if (list) list.push(q);
        else roadHash.set(k, [q]);
      }
    }
  }
  const reach = Math.ceil(radiusM / ROAD_HASH_CELL);
  const ci = Math.floor(p.E / ROAD_HASH_CELL);
  const cj = Math.floor(p.N / ROAD_HASH_CELL);
  const out: XY[] = [];
  for (let di = -reach; di <= reach; di++) {
    for (let dj = -reach; dj <= reach; dj++) out.push(...(roadHash.get((ci + di) * 1000 + cj + dj) ?? []));
  }
  return out;
}
function nearRoad(p: Point, radiusM: number): boolean {
  // Samples are ≤ 2 m apart, so a sample within radius + 1 m covers the curve.
  const r2 = (radiusM + 1) ** 2;
  return roadSamplesNear(p, radiusM).some((q) => (q[0] - p.E) ** 2 + (q[1] - p.N) ** 2 <= r2);
}

/**
 * The darker vegetated edge either side of a road surface, metres — the 3D
 * counterpart of the map's road casing (ROAD_WIDTH_M + 4 there). Ground cover
 * only: the road surface stays the shared ROAD_WIDTH_M.
 */
export const ROAD_VERGE_M = 2;
/** How far behind a clump a road can still be hidden by it, metres (the near slopes are steep from the eye). */
const ROAD_SHADOW_M = 90;

/**
 * Whether a clump at p (top at topM, radius radiusM) hides part of a road from
 * the observation eye: some road sample behind it, within its width, is seen
 * along a sight line that passes below the clump's top. Pure geometry on
 * heightAt(); used to keep the road arms continuous in the eye-level view.
 */
export function hidesRoadFromEye(p: Point, topM: number, radiusM: number): boolean {
  const eye = observerEye();
  const vE = p.E - eye.E;
  const vN = p.N - eye.N;
  const dP = Math.hypot(vE, vN);
  if (dP < 1) return false;
  for (const q of roadSamplesNear(p, ROAD_SHADOW_M)) {
    const wE = q[0] - eye.E;
    const wN = q[1] - eye.N;
    const dQ = Math.hypot(wE, wN);
    if (dQ <= dP || dQ - dP > ROAD_SHADOW_M) continue;
    // Sideways offset of the sight line to q, at the clump's range.
    const lateral = (Math.abs(vE * wN - vN * wE) / (dP * dQ)) * dP;
    if (lateral > radiusM + ((ROAD_WIDTH_M / 2 + ROAD_VERGE_M) * dP) / dQ) continue;
    const rayM = eye.heightM + ((heightAt(q[0], q[1]) - eye.heightM) * dP) / dQ;
    if (topM > rayM) return true;
  }
  return false;
}

// ---------------------------------------------------------------- vegetation

/** Deterministic PRNG (mulberry32) — same trees on every render and in every view. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Tree = {
  readonly grove: GroveId;
  readonly E: number;
  readonly N: number;
  /** Ground height under the trunk (heightAt). */
  readonly baseM: number;
  readonly heightM: number;
  readonly crownR: number;
  readonly spin: number;
  /** 0–1 colour variation. */
  readonly tone: number;
};

const TREE_SPACING_M = 8.5;
const TREE_EDGE_MARGIN_M = 2.5;

/** Bridson Poisson-disk sampling inside a ring. */
function poissonInRing(ring: readonly Point[], minDist: number, margin: number, rand: () => number): Point[] {
  const xs = ring.map((p) => p.E);
  const ys = ring.map((p) => p.N);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const cell = minDist / Math.SQRT2;
  const gw = Math.ceil((x1 - x0) / cell) + 1;
  const gh = Math.ceil((y1 - y0) / cell) + 1;
  const grid = new Int32Array(gw * gh).fill(-1);
  const pts: Point[] = [];
  const ok = (p: Point) => {
    if (!pointInPolygon(p, ring) || distanceToPolyline(p, ring, true) < margin) return false;
    const gx = Math.floor((p.E - x0) / cell);
    const gy = Math.floor((p.N - y0) / cell);
    for (let y = Math.max(0, gy - 2); y <= Math.min(gh - 1, gy + 2); y++) {
      for (let x = Math.max(0, gx - 2); x <= Math.min(gw - 1, gx + 2); x++) {
        const k = grid[y * gw + x];
        if (k >= 0 && distance(pts[k], p) < minDist) return false;
      }
    }
    return true;
  };
  const add = (p: Point) => {
    grid[Math.floor((p.N - y0) / cell) * gw + Math.floor((p.E - x0) / cell)] = pts.length;
    pts.push(p);
  };
  const cE = xs.reduce((s, v) => s + v, 0) / xs.length;
  const cN = ys.reduce((s, v) => s + v, 0) / ys.length;
  add({ E: cE, N: cN });
  const active = [0];
  while (active.length) {
    const ai = Math.floor(rand() * active.length);
    const base = pts[active[ai]];
    let placed = false;
    for (let k = 0; k < 30; k++) {
      const r = minDist * (1 + rand());
      const a = rand() * Math.PI * 2;
      const p = { E: base.E + Math.cos(a) * r, N: base.N + Math.sin(a) * r };
      if (ok(p)) {
        add(p);
        active.push(pts.length - 1);
        placed = true;
        break;
      }
    }
    if (!placed) active.splice(ai, 1);
  }
  return pts;
}

let treeCache: Tree[] | null = null;
/** The grove trees — the same list feeds the 3D instances and the map's tree symbols. */
export function groveTrees(): readonly Tree[] {
  if (!treeCache) {
    treeCache = GROVES.flatMap((g) => {
      const rand = rng(g.treeSeed);
      return poissonInRing(grovePolygon(g.center), TREE_SPACING_M, TREE_EDGE_MARGIN_M, rand).map((p) => ({
        grove: g.id,
        E: p.E,
        N: p.N,
        baseM: heightAt(p.E, p.N),
        heightM: 10.5 + rand() * 4,
        crownR: 3.4 + rand() * 1.4,
        spin: rand() * Math.PI * 2,
        tone: rand(),
      }));
    });
  }
  return treeCache;
}

export type Shrub = { readonly E: number; readonly N: number; readonly baseM: number; readonly heightM: number; readonly radiusM: number; readonly tone: number };

/**
 * Low scrub (≤ 1.2 m) — ground detail below the map's mapping threshold, so it
 * has no map symbol (as on any printed map at this scale). Kept off the roads,
 * out of the groves, away from the observer's feet, and — documented layout
 * choices — out of the low rise in the sight line to the left grove, and out
 * of every sight line from the eye to a road surface (hidesRoadFromEye), so
 * scrub hides neither the crowns nor the road arms at the split.
 */
export const SHRUB_SIGHT_CORRIDOR = { fromDeg: 306, toDeg: 336, maxDistanceM: 340 } as const;
/** Radius of the denser near-field garrigue and stones around the observer. */
const NEAR_RADIUS_M = 140;

let shrubCache: Shrub[] | null = null;
export function shrubs(): readonly Shrub[] {
  if (!shrubCache) {
    const rand = rng(0x3c6ef372);
    const out: Shrub[] = [];
    const rings = GROVES.map((g) => grovePolygon(g.center));
    const STEP = 8.5;
    const midBearing = (SHRUB_SIGHT_CORRIDOR.fromDeg + SHRUB_SIGHT_CORRIDOR.toDeg) / 2;
    const halfWidth = (SHRUB_SIGHT_CORRIDOR.toDeg - SHRUB_SIGHT_CORRIDOR.fromDeg) / 2;
    const eyeM = heightAt(OBSERVER.E, OBSERVER.N) + EYE_HEIGHT_M;
    // In the sight corridor to the left grove, a clump stays only if its top is
    // below the eye line (it then cannot hide crowns that stand above the horizon).
    const blocksLeftGrove = (p: Point, heightM: number, dObs: number) => {
      const b = bearing(OBSERVER, p);
      if (b === null || dObs >= SHRUB_SIGHT_CORRIDOR.maxDistanceM || angularDifference(b, midBearing) > halfWidth) return false;
      return heightAt(p.E, p.N) + heightM > eyeM - 0.3;
    };
    for (let N = STEP / 2; N < WORLD_BOUNDS.maxN; N += STEP) {
      for (let E = STEP / 2; E < WORLD_BOUNDS.maxE; E += STEP) {
        const p = { E: E + (rand() - 0.5) * STEP * 0.9, N: N + (rand() - 0.5) * STEP * 0.9 };
        const keep = rand();
        const size = rand();
        const tone = rand();
        // Patchy cover: denser on the slopes and in hollows, thin on the plain.
        const patch = 0.5 + 0.5 * Math.sin(p.E / 37 + Math.sin(p.N / 53) * 2.1) * Math.sin(p.N / 41 + 0.7);
        if (keep > 0.18 + patch * 0.5) continue;
        if (!insideSheet(p.E, p.N)) continue;
        const dObs = distance(OBSERVER, p);
        if (dObs < 7) continue;
        if (blocksLeftGrove(p, 0.35 + size * 0.85, dObs)) continue;
        if (nearRoad(p, ROAD_WIDTH_M / 2 + 3)) continue;
        if (rings.some((r) => pointInPolygon(p, r) || distanceToPolyline(p, r, true) < 6)) continue;
        const baseM = heightAt(p.E, p.N);
        if (hidesRoadFromEye(p, baseM + 0.35 + size * 0.85, 0.6 + size * 1.1)) continue;
        out.push({ E: p.E, N: p.N, baseM, heightM: 0.35 + size * 0.85, radiusM: 0.6 + size * 1.1, tone });
      }
    }
    // Around the observer the low garrigue is denser (the foreground of the
    // eye-level view): smaller clumps, same exclusions.
    const NEAR_STEP = 3.6;
    for (let dN = -NEAR_RADIUS_M; dN <= NEAR_RADIUS_M; dN += NEAR_STEP) {
      for (let dE = -NEAR_RADIUS_M; dE <= NEAR_RADIUS_M; dE += NEAR_STEP) {
        const p = { E: OBSERVER.E + dE + (rand() - 0.5) * NEAR_STEP, N: OBSERVER.N + dN + (rand() - 0.5) * NEAR_STEP };
        const keep = rand();
        const size = rand();
        const tone = rand();
        const dObs = distance(OBSERVER, p);
        if (dObs > NEAR_RADIUS_M || dObs < 4) continue;
        const patch = 0.5 + 0.5 * Math.sin(p.E / 13 + Math.sin(p.N / 9) * 1.9) * Math.cos(p.N / 17 - p.E / 23);
        if (keep > 0.08 + patch * 0.32) continue;
        if (blocksLeftGrove(p, 0.3 + size * 0.7, dObs)) continue;
        if (nearRoad(p, ROAD_WIDTH_M / 2 + 3) || rings.some((r) => pointInPolygon(p, r) || distanceToPolyline(p, r, true) < 6)) continue;
        out.push({ E: p.E, N: p.N, baseM: heightAt(p.E, p.N), heightM: 0.3 + size * 0.7, radiusM: 0.45 + size * 0.7, tone });
      }
    }
    shrubCache = out;
  }
  return shrubCache;
}

export type Stone = { readonly E: number; readonly N: number; readonly baseM: number; readonly sizeM: number; readonly spin: number; readonly tone: number };

/**
 * Loose limestone stones (≤ 0.6 m) near the observer — foreground ground
 * detail of the eye-level view, below any mapping threshold, on heightAt().
 */
let stoneCache: Stone[] | null = null;
export function groundStones(): readonly Stone[] {
  if (!stoneCache) {
    const rand = rng(0x5be0cd19);
    const out: Stone[] = [];
    const STEP = 2.6;
    const R = 90;
    for (let dN = -R; dN <= R; dN += STEP) {
      for (let dE = -R; dE <= R; dE += STEP) {
        const E = OBSERVER.E + dE + (rand() - 0.5) * STEP;
        const N = OBSERVER.N + dN + (rand() - 0.5) * STEP;
        const keep = rand();
        const size = rand();
        const spin = rand() * Math.PI * 2;
        const tone = rand();
        const d = Math.hypot(E - OBSERVER.E, N - OBSERVER.N);
        if (d > R || d < 2.5) continue;
        const patch = 0.5 + 0.5 * Math.sin(E / 7.1 - Math.cos(N / 5.3) * 1.3) * Math.sin(N / 8.9 + E / 15);
        if (keep > 0.04 + patch * 0.2) continue;
        out.push({ E, N, baseM: heightAt(E, N), sizeM: 0.12 + size * size * 0.5, spin, tone });
      }
    }
    stoneCache = out;
  }
  return stoneCache;
}

export type Tuft = { readonly E: number; readonly N: number; readonly baseM: number; readonly heightM: number; readonly spin: number; readonly tone: number };

/**
 * Dry grass tufts (≤ 0.6 m) close to the observer only — foreground ground
 * texture of the eye-level view, far below any mapping threshold. Same
 * heightAt() ground as everything else.
 */
export const TUFT_RADIUS_M = 110;
let tuftCache: Tuft[] | null = null;
export function groundTufts(): readonly Tuft[] {
  if (!tuftCache) {
    const rand = rng(0xa54ff53a);
    const out: Tuft[] = [];
    const STEP = 1.35;
    for (let dN = -TUFT_RADIUS_M; dN <= TUFT_RADIUS_M; dN += STEP) {
      for (let dE = -TUFT_RADIUS_M; dE <= TUFT_RADIUS_M; dE += STEP) {
        const E = OBSERVER.E + dE + (rand() - 0.5) * STEP;
        const N = OBSERVER.N + dN + (rand() - 0.5) * STEP;
        const keep = rand();
        const h = rand();
        const spin = rand() * Math.PI * 2;
        const tone = rand();
        const d = Math.hypot(E - OBSERVER.E, N - OBSERVER.N);
        if (d > TUFT_RADIUS_M || d < 1.2) continue;
        // Patchy: dense in some places, bare in others; thinning with distance.
        const patch = 0.5 + 0.5 * Math.sin(E / 6.3 + Math.sin(N / 4.1) * 1.7) * Math.cos(N / 7.7 - E / 11);
        if (keep > patch * (1 - (d / TUFT_RADIUS_M) * 0.6)) continue;
        out.push({ E, N, baseM: heightAt(E, N), heightM: 0.22 + h * 0.4, spin, tone });
      }
    }
    tuftCache = out;
  }
  return tuftCache;
}

// ---------------------------------------------------------------- sight lines

export type Eye = { readonly E: number; readonly N: number; readonly heightM: number };

export function observerEye(): Eye {
  return { E: OBSERVER.E, N: OBSERVER.N, heightM: heightAt(OBSERVER.E, OBSERVER.N) + EYE_HEIGHT_M };
}

/**
 * Whether the ground hides `target` from `eye` (terrain only — vegetation is
 * checked separately where it matters). Samples heightAt every `stepM` along
 * the horizontal segment.
 */
export function terrainClear(eye: Eye, target: Eye, stepM = 2): boolean {
  const d = Math.hypot(target.E - eye.E, target.N - eye.N);
  for (let s = stepM; s < d - stepM; s += stepM) {
    const t = s / d;
    const ground = heightAt(eye.E + (target.E - eye.E) * t, eye.N + (target.N - eye.N) * t);
    if (ground > eye.heightM + (target.heightM - eye.heightM) * t) return false;
  }
  return true;
}

/**
 * A tree's crown as drawn: an ellipsoid from a short bare trunk (≈ 3 m) up to
 * the tree's height, crownR across. The grove reads as one canopy.
 */
export function crownShape(t: Tree): { center: Eye; radiusM: number; halfHeightM: number } {
  const bottom = 2.6 + t.tone * 0.8;
  const halfHeightM = (t.heightM - bottom) / 2;
  return { center: { E: t.E, N: t.N, heightM: t.baseM + bottom + halfHeightM }, radiusM: t.crownR, halfHeightM };
}

export function crownCenter(t: Tree): Eye {
  return crownShape(t).center;
}

// ---------------------------------------------------------------- map label placement

export type ContourLabel = { readonly heightM: number; readonly E: number; readonly N: number; /** Screen rotation on the north-up map, degrees (SVG, y down). */ readonly angleDeg: number };

let labelCache: ContourLabel[] | null = null;
/**
 * Where the index-contour heights are printed: on straight-ish stretches of
 * each index line, as far as possible from the exercise's points and roads and
 * from the sheet edge, at most two per level.
 */
export function contourLabels(): readonly ContourLabel[] {
  if (!labelCache) {
    const avoid: Point[] = [FORK, LAST_KNOWN, OBSERVER, ...CANDIDATES.map((c) => c.center), ...GROVES.map((g) => g.center), spotHeights().summit, spotHeights().westHill];
    const out: ContourLabel[] = [];
    for (const lv of contours().filter((c) => c.index)) {
      const picks: (ContourLabel & { score: number })[] = [];
      for (const line of lv.lines) {
        const P = line.pts;
        if (P.length < 30) continue;
        for (let k = 8; k < P.length - 8; k += 4) {
          const [E, N] = P[k];
          const edge = Math.min(E - WORLD_BOUNDS.minE, WORLD_BOUNDS.maxE - E, N - WORLD_BOUNDS.minN, WORLD_BOUNDS.maxN - N);
          if (edge < 70) continue;
          const p = { E, N };
          const clear = Math.min(...avoid.map((a) => distance(a, p)), distanceToRoads(p) + 40);
          const [Ea, Na] = P[k - 6];
          const [Eb, Nb] = P[k + 6];
          // straightness: chord vs the polyline length between the two
          let len = 0;
          for (let q = k - 6; q < k + 6; q++) len += Math.hypot(P[q + 1][0] - P[q][0], P[q + 1][1] - P[q][1]);
          const straight = Math.hypot(Eb - Ea, Nb - Na) / len;
          if (straight < 0.93) continue;
          picks.push({ heightM: lv.heightM, E, N, angleDeg: (Math.atan2(-(Nb - Na), Eb - Ea) * 180) / Math.PI, score: clear + edge * 0.3 });
        }
      }
      picks.sort((a, b) => b.score - a.score);
      const chosen: ContourLabel[] = [];
      for (const p of picks) {
        if (chosen.length === 2) break;
        if (chosen.some((c) => Math.hypot(c.E - p.E, c.N - p.N) < 380)) continue;
        if (out.some((c) => Math.hypot(c.E - p.E, c.N - p.N) < 120)) continue;
        chosen.push({ heightM: p.heightM, E: p.E, N: p.N, angleDeg: p.angleDeg });
      }
      out.push(...chosen);
    }
    labelCache = out;
  }
  return labelCache;
}
