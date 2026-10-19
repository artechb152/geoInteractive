/**
 * „אותה גבעה, שלושה נופים” — the one terrain behind screen 3 of ReliefCoverIntroScene
 * (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5; terrain and boards
 * redone 2026-10-13: a live 3D model and a topographic map).
 * The ground (in metres), the quarry cut into it, the land cover of every state, the map's
 * contours, spot heights and areas, and the predict → reveal flow. States 1–3 share ONE height
 * function, so their model and contours are literally the same objects; the quarry is a second
 * height function that differs only where the quarry mask is > 0.
 * Pure TS, no React: scripts/qa/relief-cover-compare.test.mjs imports it.
 */

/* ── States and the predict → reveal flow ─────────────────────────────────── */

export const STATES = ['bare', 'grove', 'built', 'quarry'] as const;
export type StateId = (typeof STATES)[number];
export type Answer = 'relief' | 'cover' | 'both';
export const ANSWERS: Answer[] = ['relief', 'cover', 'both'];
/** What really changes on the way INTO each state. */
export const CORRECT: Record<Exclude<StateId, 'bare'>, Answer> = { grove: 'cover', built: 'cover', quarry: 'both' };

export type Flow = {
  reached: number; // furthest state index reached
  view: number; // state index on screen
  answers: Partial<Record<StateId, Answer>>; // the prediction that led INTO each state
  asking: boolean; // the next prediction is open (at the start, and after "לשלב הבא")
};
export type FlowAction =
  | { type: 'continue' }
  | { type: 'predict'; answer: Answer }
  | { type: 'view'; index: number }
  | { type: 'reset' };

/** The first question is open from the start: the bare hill is on show, the grove is next. */
export const INITIAL_FLOW: Flow = { reached: 0, view: 0, answers: {}, asking: true };
const LAST = STATES.length - 1;

export function flowReducer(s: Flow, a: FlowAction): Flow {
  switch (a.type) {
    case 'continue':
      return s.view === s.reached && s.reached < LAST && !s.asking ? { ...s, asking: true } : s;
    case 'predict': {
      if (!s.asking || s.view !== s.reached || s.reached >= LAST) return s;
      const next = s.reached + 1;
      return { reached: next, view: next, answers: { ...s.answers, [STATES[next]]: a.answer }, asking: false };
    }
    case 'view':
      return Number.isInteger(a.index) && a.index >= 0 && a.index <= s.reached && a.index !== s.view
        ? { ...s, view: a.index, asking: false }
        : s;
    case 'reset':
      return INITIAL_FLOW;
  }
}

export const isComplete = (s: Flow) => s.reached === LAST;

/* ── Which comparison cells each state card shows (spec §5) ──────────────── */

export type CellRef = { row: string; layer: 'relief' | 'cover'; part?: 0 | 1 };
/** Row labels are COMPARE_ROWS' own labels (ReliefCoverIntroScene); part = half of the split "דוגמאות" cell. */
export const STATE_CELLS: Record<StateId, CellRef[]> = {
  bare: [
    { row: 'הגדרה', layer: 'relief' },
    { row: 'דוגמאות', layer: 'relief' },
    { row: 'אופן הסיווג', layer: 'relief' },
    { row: 'הייצוג במפה', layer: 'relief' },
  ],
  grove: [
    { row: 'הגדרה', layer: 'cover' },
    { row: 'הייצוג במפה', layer: 'cover' },
    { row: 'דוגמאות', layer: 'cover', part: 0 },
  ],
  built: [
    { row: 'דוגמאות', layer: 'cover', part: 1 },
    { row: 'אופן הסיווג', layer: 'cover' },
    { row: 'קצב השינוי', layer: 'cover' },
  ],
  quarry: [{ row: 'קצב השינוי', layer: 'relief' }],
};

/** Display-only split of the cover "דוגמאות" cell at its own " · " (natural part, artificial part). */
export function splitExamples(cell: string): [string, string] {
  const i = cell.indexOf(' · ');
  if (i < 0 || cell.indexOf(' · ', i + 3) >= 0) throw new Error(`splitExamples: expected exactly one " · " in "${cell}"`);
  return [cell.slice(0, i), cell.slice(i + 3)];
}


/* ── The sheet and the ground ────────────────────────────────────────────── */

export type Pt = [number, number];
export type HeightFn = (x: number, y: number) => number;

/** The mapped area in metres: x east, y SOUTH (map / SVG orientation, north up). The 3D model
 *  shows the same ground, unexaggerated, and runs on past the sheet to the horizon. */
export const SHEET = { w: 480, h: 320 } as const;
export const INTERVAL = 5; // contour interval (m) — a large-scale sheet
export const INDEX_EVERY = 25; // every 5th line is an index contour
export const LEVELS = Array.from({ length: 19 }, (_, i) => 100 + i * INTERVAL); // 100 … 190
export const insideSheet = (x: number, y: number) => x >= 0 && x <= SHEET.w && y >= 0 && y <= SHEET.h;

const E = Math.exp;
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** An elliptical dome: a metres high at (cx, cy), radii sx × sy, long axis turned deg from east. */
function dome(x: number, y: number, cx: number, cy: number, sx: number, sy: number, deg: number, a: number) {
  const t = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const u = (dx * Math.cos(t) + dy * Math.sin(t)) / sx;
  const v = (-dx * Math.sin(t) + dy * Math.cos(t)) / sy;
  return a * E(-0.5 * (u * u + v * v));
}

/** A spur: a crest from A (a0 m high) falling to B (a1 m), rounded across (half-width s). */
function spur(x: number, y: number, ax: number, ay: number, bx: number, by: number, s: number, a0: number, a1: number) {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  const d2 = (x - ax - t * vx) ** 2 + (y - ay - t * vy) ** 2;
  return (a0 + (a1 - a0) * smooth(t)) * E(-0.5 * d2 / (s * s));
}

/** Landforms merge by a p-norm, not a sum: two neighbours meet in a saddle a little above
 *  either flank, and a spur never stacks on top of its summit. */
function merge(v: number[], p = 4) {
  let s = 0;
  for (const a of v) s += a ** p;
  return s ** (1 / p);
}

/** Small ground undulation (≤ ±1.6 m) so plains and flanks read as ground, not a machined surface. */
const swell = (x: number, y: number) =>
  0.7 * Math.sin(0.045 * x + 0.031 * y + 1.1) +
  0.45 * Math.sin(-0.038 * x + 0.052 * y + 0.3) +
  0.28 * Math.sin(0.09 * x - 0.07 * y + 2.0) +
  0.16 * Math.sin(0.13 * x + 0.11 * y + 0.6);

/** Hills beyond the sheet — the model's horizon. Their tails reach the sheet as part of the same ground. */
const far = (x: number, y: number) =>
  merge([
    dome(x, y, 180, -470, 420, 150, 4, 74),
    dome(x, y, 760, -260, 170, 130, -20, 46),
    dome(x, y, -400, 90, 150, 210, 10, 58),
    dome(x, y, 980, 260, 220, 160, 0, 30),
    dome(x, y, 260, 760, 380, 130, 0, 34),
  ]);

/** The hill: a main summit with a south-east spur, a lower summit to the west across a saddle,
 *  and between their southern spurs a valley that drains south-west. The village plain lies east. */
export const HILL: HeightFn = (x, y) => {
  const plain = 100.8 + 4.5 * (1 - x / SHEET.w) + 0.012 * y * (1 - x / SHEET.w);
  const landforms = merge([
    dome(x, y, 208, 126, 64, 50, -15, 70), // main summit
    dome(x, y, 86, 94, 40, 36, 20, 45), // western summit
    spur(x, y, 228, 146, 336, 232, 30, 50, 12), // south-east spur
    spur(x, y, 196, 150, 168, 268, 25, 42, 9), // south-west spur
    spur(x, y, 84, 112, 52, 238, 23, 30, 7), // the western summit's southern spur
    spur(x, y, 214, 108, 286, 36, 26, 36, 10), // a short northern spur
  ]);
  // gullies cut into the flanks: the contours bend upstream into them, as on any real hillside
  const gullies =
    spur(x, y, 262, 132, 336, 150, 12, 8, 4) + // east flank, between the northern and south-east spurs
    spur(x, y, 172, 84, 150, 26, 11, 7, 3) + // north flank
    spur(x, y, 122, 150, 112, 300, 16, 7, 3) + // the valley between the southern spurs
    spur(x, y, 52, 70, 6, 40, 10, 5, 2); // the western summit's north-west flank
  const relief = Math.max(0, landforms - gullies);
  return plain + merge([relief, far(x, y)], 6) + swell(x, y);
};

/* ── The quarry ──────────────────────────────────────────────────────────── */

/** A hillside quarry on the main summit's south flank, facing the camera: benches climb north into
 *  the hill from a floor that opens downhill onto a yard. x0–x1 × y0–y1 is the mask's outer edge;
 *  `band` the soft transition just inside it. The floor and bench tops (121, 131, … m) sit 1 m off the 5 m contour levels:
 *  a flat floor exactly on a level snaps that contour to the grid nodes (a staircase on the map). */
export const QUARRY = { x0: 176, x1: 262, y0: 150, y1: 284, band: 8, floor: 121, faceY: 194, benchH: 10, benchW: 7, curve: 16 } as const;

/** 1 inside the cut, 0 outside, easing over QUARRY.band metres just inside its edge. The back wall
 *  curves (deepest in the middle), as a face worked into a hill does. */
export function quarryMask(x: number, y: number): number {
  const { x0, x1, y0, y1, band, curve } = QUARRY;
  const e = (d: number) => smooth(d / band);
  const u = (2 * x - x0 - x1) / (x1 - x0); // −1 … 1 across the cut
  const back = y0 + curve * u * u;
  return e(x - x0) * e(x1 - x) * e(y - back) * e(y1 - y);
}

/** The excavation surface: the floor south of faceY, then benches (flat tread, steep riser) climbing north. */
function benches(y: number): number {
  const { floor, faceY, benchH, benchW } = QUARRY;
  const d = faceY - y;
  if (d <= 0) return floor;
  const k = d / benchW;
  const n = Math.floor(k);
  return floor + benchH * (n + smooth((k - n - 0.55) / 0.45));
}

/** The same hill after quarrying: inside the mask, ground above the excavation surface is cut down to it. */
export const QUARRIED: HeightFn = (x, y) => {
  const h = HILL(x, y);
  const m = quarryMask(x, y);
  if (m <= 0) return h;
  return h - m * Math.max(0, h - benches(y));
};

/** How much of the quarry's look a point takes: fresh rock wherever ground was cut, and the
 *  open yard (mask ≥ 0.5) — the line the map draws as the quarry area. 0…1. */
export function quarryRock(x: number, y: number): number {
  const m = quarryMask(x, y);
  if (m <= 0) return 0;
  const cut = HILL(x, y) - QUARRIED(x, y);
  // the uncut yard only dusty (0.3), the cut itself fully rock
  return Math.max(0.3 * smooth((m - 0.35) / 0.3), smooth((cut - 0.3) / 1.2));
}

/* ── Land cover ──────────────────────────────────────────────────────────── */

export type TreeKind = 'pine' | 'oak' | 'olive';
/** r: crown radius (m) · tall: tree height (m) · tone 0…1 · spin (rad) */
export type Tree = { id: string; x: number; y: number; r: number; tall: number; kind: TreeKind; tone: number; spin: number };
export type Shrub = { id: string; x: number; y: number; r: number; tone: number; spin: number };
/** w × d footprint (m) turned `angle` degrees; floors of 3.2 m; flat (parapet) or tiled hip roof. */
export type House = { id: string; x: number; y: number; w: number; d: number; angle: number; floors: 1 | 2; roof: 'flat' | 'tile'; tone: number };
export type Cover = { grove: Tree[]; shrubs: Shrub[]; orchard: Tree[]; houses: House[] };

/** Deterministic PRNG (mulberry32): the grove is irregular, but the same on every load. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Natural grove (חורש): clumps of pines and oaks of mixed size at irregular spacing on the
 *  summits, the saddle and the upper flanks, with shrubs scattered between them. */
const CLUMPS: [number, number, number, number][] = [
  // centre x, centre y, spread (m), trees
  [86, 92, 30, 16], [146, 104, 20, 7], [196, 116, 34, 18], [238, 98, 22, 8], [62, 150, 18, 6],
  [178, 170, 18, 6], [118, 64, 16, 5], [262, 150, 16, 5], [226, 196, 16, 5],
];
export const { GROVE, SHRUBS } = (() => {
  const rand = rng(11);
  const trees: Tree[] = [];
  for (const [cx, cy, spread, n] of CLUMPS) {
    let placed = 0;
    for (let tries = 0; placed < n && tries < 600; tries++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * spread;
      const x = cx + Math.cos(a) * d * 1.2;
      const y = cy + Math.sin(a) * d * 0.85;
      if (!insideSheet(x, y) || trees.some((t) => Math.hypot(t.x - x, t.y - y) < 9.5)) continue;
      const pine = rand() < 0.45;
      const r = pine ? 3.4 + rand() * 1.6 : 4 + rand() * 2.4;
      trees.push({ id: `g${trees.length}`, x, y, r, tall: pine ? 10 + rand() * 4 : 7 + rand() * 3, kind: pine ? 'pine' : 'oak', tone: rand(), spin: rand() * 6.28 });
      placed++;
    }
  }
  const shrubs: Shrub[] = [];
  for (let tries = 0; shrubs.length < 90 && tries < 4000; tries++) {
    const [cx, cy, spread] = CLUMPS[Math.floor(rand() * CLUMPS.length)];
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * spread * 1.5;
    const x = cx + Math.cos(a) * d * 1.2;
    const y = cy + Math.sin(a) * d * 0.85;
    if (!insideSheet(x, y) || trees.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + 2) || shrubs.some((s) => Math.hypot(s.x - x, s.y - y) < 4.5)) continue;
    shrubs.push({ id: `s${shrubs.length}`, x, y, r: 1.5 + rand() * 1.1, tone: rand(), spin: rand() * 6.28 });
  }
  return { GROVE: trees, SHRUBS: shrubs };
})();

/** Orchard (מטע): identical olive trees in straight rows at a fixed 9 m spacing, on the south-east
 *  foot. Its three western columns stand where the quarry will be cut. */
export const ORCHARD_GRID = { x: 240, y: 222, dx: 11, dy: 11, cols: 14, rows: 6 } as const;
export const ORCHARD: Tree[] = Array.from({ length: ORCHARD_GRID.cols * ORCHARD_GRID.rows }, (_, i) => {
  const col = i % ORCHARD_GRID.cols;
  const row = Math.floor(i / ORCHARD_GRID.cols);
  const r = rng(1000 + i);
  return {
    id: `o${row}-${col}`,
    x: ORCHARD_GRID.x + col * ORCHARD_GRID.dx,
    y: ORCHARD_GRID.y + row * ORCHARD_GRID.dy,
    r: 3,
    tall: 5,
    kind: 'olive' as const,
    tone: r() * 0.25,
    spin: r() * 6.28,
  };
});
const half = { x: ORCHARD_GRID.dx / 2, y: ORCHARD_GRID.dy / 2 };
/** The orchard's parcel on the map. */
export const ORCHARD_PARCEL = {
  x0: ORCHARD_GRID.x - half.x,
  y0: ORCHARD_GRID.y - half.y,
  x1: ORCHARD_GRID.x + (ORCHARD_GRID.cols - 1) * ORCHARD_GRID.dx + half.x,
  y1: ORCHARD_GRID.y + (ORCHARD_GRID.rows - 1) * ORCHARD_GRID.dy + half.y,
} as const;
/** …after the quarry (state 4): the quarry site (mask ≥ 0.5, east edge at x1 − band / 2) has taken
 *  its western part — every tree there is gone — so the parcel starts where the site ends. */
export const ORCHARD_PARCEL_CUT = { ...ORCHARD_PARCEL, x0: QUARRY.x1 - QUARRY.band / 2 } as const;

/** Village: flat-roofed and a few tiled houses on the eastern plain, loosely along two lanes. */
export const HOUSES: House[] = (
  [
    [394, 58, 17, 13, 8, 2, 'flat'], [424, 64, 14, 12, 8, 1, 'tile'], [454, 56, 16, 12, 5, 2, 'flat'],
    [392, 98, 15, 12, -6, 1, 'flat'], [425, 104, 19, 13, -4, 2, 'flat'], [457, 102, 14, 12, 10, 1, 'tile'],
    [390, 142, 16, 12, 14, 1, 'tile'], [423, 144, 14, 13, 6, 2, 'flat'], [456, 148, 16, 12, -8, 1, 'flat'],
    [404, 184, 15, 11, 4, 1, 'flat'], [440, 188, 18, 13, 0, 2, 'flat'],
  ] as const
).map(([x, y, w, d, angle, floors, roof], i) => ({ id: `h${i + 1}`, x, y, w, d, angle, floors, roof, tone: (i * 0.37) % 1 }));

/** The four corners of a house's footprint (map metres). */
export function houseCorners(h: House): Pt[] {
  const t = (h.angle * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([u, v]) => {
    const a = (u * h.w) / 2;
    const b = (v * h.d) / 2;
    return [h.x + a * c - b * s, h.y + a * s + b * c] as Pt;
  });
}

const NONE: Cover = { grove: [], shrubs: [], orchard: [], houses: [] };
export const COVER: Record<StateId, Cover> = {
  bare: NONE,
  grove: { ...NONE, grove: GROVE, shrubs: SHRUBS },
  built: { ...NONE, orchard: ORCHARD, houses: HOUSES },
  // the cut takes every orchard tree in the quarry area (its transition band included)
  quarry: { ...NONE, orchard: ORCHARD.filter((t) => quarryMask(t.x, t.y) === 0), houses: HOUSES },
};

/* ── Map key and contour chip ────────────────────────────────────────────── */

export type LegendKey = 'contour' | 'index' | 'grove' | 'orchard' | 'houses' | 'quarry' | 'before';
export const LEGEND: Record<StateId, LegendKey[]> = {
  bare: ['contour', 'index'],
  grove: ['contour', 'index', 'grove'],
  built: ['contour', 'index', 'orchard', 'houses'],
  quarry: ['contour', 'index', 'orchard', 'houses', 'quarry', 'before'],
};
/** The chip on the map: did the contours change on the way into this state? */
export const CHIP: Record<StateId, 'same' | 'changed' | null> = { bare: null, grove: 'same', built: 'same', quarry: 'changed' };

/* ── Contours (marching squares on a 2 m grid of the sheet) ──────────────── */

export const GRID_STEP = 2;
export type Grid = { PX: number; PY: number; xs: Float64Array; ys: Float64Array; v: Float64Array };
const PAD = -1e9;

/** f sampled every `step` m over the sheet, with one padding ring far below every level so each
 *  level yields closed rings (the map then opens them where they run along the sheet edge). */
export function sampleSheet(f: HeightFn, step = GRID_STEP): Grid {
  const nx = Math.round(SHEET.w / step) + 1;
  const ny = Math.round(SHEET.h / step) + 1;
  const PX = nx + 2;
  const PY = ny + 2;
  const xs = new Float64Array(PX);
  const ys = new Float64Array(PY);
  for (let i = 0; i < PX; i++) xs[i] = i === 0 ? -1e-3 : i === PX - 1 ? SHEET.w + 1e-3 : (i - 1) * step;
  for (let j = 0; j < PY; j++) ys[j] = j === 0 ? -1e-3 : j === PY - 1 ? SHEET.h + 1e-3 : (j - 1) * step;
  const v = new Float64Array(PX * PY);
  for (let j = 0; j < PY; j++)
    for (let i = 0; i < PX; i++) v[j * PX + i] = i === 0 || j === 0 || i === PX - 1 || j === PY - 1 ? PAD : f(xs[i], ys[j]);
  return { PX, PY, xs, ys, v };
}

/** Closed rings of the region f ≥ L (marching squares, saddle cells resolved by the cell centre). */
export function contourRings(g: Grid, L: number): Pt[][] {
  const { PX, PY, xs, ys, v } = g;
  const cache = new Map<number, Pt>();
  const pt = (key: number): Pt => {
    const hit = cache.get(key);
    if (hit) return hit;
    const base = key >> 1;
    const vert = key & 1;
    const i = base % PX;
    const j = (base - i) / PX;
    const i2 = vert ? i : i + 1;
    const j2 = vert ? j + 1 : j;
    const a = v[j * PX + i];
    const b = v[j2 * PX + i2];
    const t = (L - a) / (b - a);
    const p: Pt = [xs[i] + t * (xs[i2] - xs[i]), ys[j] + t * (ys[j2] - ys[j])];
    cache.set(key, p);
    return p;
  };
  const segs: number[] = [];
  for (let j = 0; j < PY - 1; j++) {
    for (let i = 0; i < PX - 1; i++) {
      const vtl = v[j * PX + i];
      const vtr = v[j * PX + i + 1];
      const vbr = v[(j + 1) * PX + i + 1];
      const vbl = v[(j + 1) * PX + i];
      const c = (vtl >= L ? 8 : 0) | (vtr >= L ? 4 : 0) | (vbr >= L ? 2 : 0) | (vbl >= L ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const T = (j * PX + i) * 2;
      const B = ((j + 1) * PX + i) * 2;
      const Lf = (j * PX + i) * 2 + 1;
      const R = (j * PX + i + 1) * 2 + 1;
      const centerIn = (vtl + vtr + vbr + vbl) / 4 >= L;
      switch (c) {
        case 1: case 14: segs.push(Lf, B); break;
        case 2: case 13: segs.push(B, R); break;
        case 3: case 12: segs.push(Lf, R); break;
        case 4: case 11: segs.push(T, R); break;
        case 6: case 9: segs.push(T, B); break;
        case 7: case 8: segs.push(T, Lf); break;
        case 5: if (centerIn) segs.push(T, Lf, B, R); else segs.push(Lf, B, T, R); break;
        case 10: if (centerIn) segs.push(T, R, Lf, B); else segs.push(T, Lf, B, R); break;
      }
    }
  }
  const nSeg = segs.length / 2;
  const adj = new Map<number, number[]>();
  for (let s = 0; s < nSeg; s++)
    for (const k of [segs[2 * s], segs[2 * s + 1]]) {
      const list = adj.get(k);
      if (list) list.push(s);
      else adj.set(k, [s]);
    }
  const used = new Uint8Array(nSeg);
  const rings: Pt[][] = [];
  for (let s0 = 0; s0 < nSeg; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const startKey = segs[2 * s0];
    let key = segs[2 * s0 + 1];
    const ring: Pt[] = [pt(startKey), pt(key)];
    let prev = s0;
    for (;;) {
      if (key === startKey) break;
      const list = adj.get(key) ?? [];
      const next = list[0] === prev ? list[1] : list[0];
      if (next === undefined || used[next]) break;
      used[next] = 1;
      key = segs[2 * next] === key ? segs[2 * next + 1] : segs[2 * next];
      if (key !== startKey) ring.push(pt(key));
      prev = next;
    }
    if (ring.length > 2) rings.push(ring);
  }
  return rings;
}

const EDGE = 0.01;
export const onSheetEdge = ([x, y]: Pt) => x < EDGE || y < EDGE || x > SHEET.w - EDGE || y > SHEET.h - EDGE;

/** A contour line on the map: a closed ring inside the sheet, or an open run between two edge points. */
export type ContourLine = { pts: Pt[]; closed: boolean };
/** Opens a ring wherever it runs along the sheet edge: only the stretches inside the sheet are drawn. */
export function ringToLines(ring: Pt[]): ContourLine[] {
  const n = ring.length;
  const k0 = ring.findIndex(onSheetEdge);
  if (k0 < 0) return [{ pts: ring, closed: true }];
  const out: ContourLine[] = [];
  let run: Pt[] = [];
  for (let s = 1; s <= n; s++) {
    const p = ring[(k0 + s) % n];
    if (onSheetEdge(p)) {
      if (run.length) out.push({ pts: [ring[(k0 + s - run.length - 1 + n) % n], ...run, p], closed: false });
      run = [];
    } else run.push(p);
  }
  return out;
}

export type Contours = { grid: Grid; levels: { level: number; index: boolean; lines: ContourLine[] }[] };
const contourCache = new WeakMap<HeightFn, Contours>();
export function buildContours(h: HeightFn): Contours {
  const hit = contourCache.get(h);
  if (hit) return hit;
  const grid = sampleSheet(h);
  const levels = LEVELS.map((level) => ({
    level,
    index: level % INDEX_EVERY === 0,
    lines: contourRings(grid, level).flatMap(ringToLines),
  })).filter((l) => l.lines.length > 0);
  const c = { grid, levels };
  contourCache.set(h, c);
  return c;
}
/** States 1–3 share one contour set (the same object); the quarry has its own. */
export const contoursFor = (s: StateId): Contours => buildContours(s === 'quarry' ? QUARRIED : HILL);

/* ── Map annotation: spot heights and contour numbers ───────────────────── */

/** Climbs from a seed to the local top on the 1 m lattice. */
function climb(f: HeightFn, x: number, y: number): Pt {
  let p: Pt = [Math.round(x), Math.round(y)];
  for (let it = 0; it < 400; it++) {
    let best = p;
    let bh = f(p[0], p[1]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]])
      if (f(p[0] + dx, p[1] + dy) > bh) {
        bh = f(p[0] + dx, p[1] + dy);
        best = [p[0] + dx, p[1] + dy];
      }
    if (best === p) break;
    p = best;
  }
  return p;
}

export type Spot = { id: string; x: number; y: number; h: number };
/** Spot heights on the two summits (the quarry never reaches either). */
export const SPOTS: Spot[] = (
  [
    ['main', 208, 126],
    ['west', 86, 94],
  ] as const
).map(([id, sx, sy]) => {
  const [x, y] = climb(HILL, sx, sy);
  return { id, x, y, h: Math.round(HILL(x, y)) };
});

/** Uphill unit vector of f at (x, y). */
function uphill(f: HeightFn, x: number, y: number): Pt {
  const e = 0.5;
  const gx = (f(x + e, y) - f(x - e, y)) / (2 * e);
  const gy = (f(x, y + e) - f(x, y - e)) / (2 * e);
  const g = Math.hypot(gx, gy) || 1;
  return [gx / g, gy / g];
}

export type ContourLabel = { level: number; x: number; y: number; deg: number };
/** Where each contour number sits: on its line nearest `near`, turned so the figures' tops face
 *  uphill (the map convention: a number tells which way the ground rises). */
const LABEL_AT: [number, Pt][] = [
  [150, [150, 182]],
  [150, [285, 170]],
  [125, [40, 200]],
  [125, [330, 196]],
];
export function contourLabels(c: Contours, f: HeightFn): ContourLabel[] {
  const out: ContourLabel[] = [];
  for (const [level, near] of LABEL_AT) {
    const lv = c.levels.find((l) => l.level === level);
    if (!lv) continue;
    let best: Pt | null = null;
    let bd = Infinity;
    for (const line of lv.lines)
      for (const p of line.pts) {
        const d = (p[0] - near[0]) ** 2 + (p[1] - near[1]) ** 2;
        if (d < bd && !onSheetEdge(p)) {
          bd = d;
          best = p;
        }
      }
    if (!best) continue;
    const [ux, uy] = uphill(f, best[0], best[1]);
    out.push({ level, x: best[0], y: best[1], deg: (Math.atan2(ux, -uy) * 180) / Math.PI });
  }
  return out;
}

/* ── Map areas: the grove's extent and the quarry site ───────────────────── */

/** The grove's extent: where the crowns stand close (a smoothed tree density ≥ 0.5). */
export const GROVE_AREA: Pt[][] = (() => {
  const s = 9;
  const density: HeightFn = (x, y) => {
    let v = 0;
    for (const t of GROVE) {
      const d2 = (t.x - x) ** 2 + (t.y - y) ** 2;
      if (d2 < 900) v += E(-0.5 * d2 / (s * s));
    }
    return v;
  };
  return contourRings(sampleSheet(density, 3), 0.5);
})();

/** The quarry site on the map (mask ≥ 0.5), and short ticks along its cut faces, pointing into the cut. */
export const QUARRY_SITE = (() => {
  const rings = contourRings(sampleSheet(quarryMask, 1), 0.5);
  const ticks: [Pt, Pt][] = [];
  for (const ring of rings) {
    let acc = 0;
    for (let i = 1; i <= ring.length; i++) {
      const a = ring[i - 1];
      const b = ring[i % ring.length];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc < 6) continue;
      acc = 0;
      // faces only (where the cut is deep), not the open front
      const inward: Pt = (() => {
        const e = 0.5;
        const gx = (quarryMask(b[0] + e, b[1]) - quarryMask(b[0] - e, b[1])) / (2 * e);
        const gy = (quarryMask(b[0], b[1] + e) - quarryMask(b[0], b[1] - e)) / (2 * e);
        const g = Math.hypot(gx, gy) || 1;
        return [gx / g, gy / g];
      })();
      const probe: Pt = [b[0] + inward[0] * 5, b[1] + inward[1] * 5];
      if (HILL(probe[0], probe[1]) - QUARRIED(probe[0], probe[1]) < 3) continue;
      ticks.push([b, [b[0] + inward[0] * 5, b[1] + inward[1] * 5]]);
    }
  }
  return { rings, ticks };
})();
