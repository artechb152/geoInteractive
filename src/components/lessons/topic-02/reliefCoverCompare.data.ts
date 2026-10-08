/**
 * „אותה גבעה, שלושה נופים” — the one terrain behind screen 3 of ReliefCoverIntroScene
 * (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5–§7).
 * The hill, the quarry cut into it, the land cover of every state and the
 * predict → reveal flow. States 1–3 share ONE height function, so their block and
 * contours are literally the same objects; the quarry is a second height function
 * that differs only where the quarry mask is > 0.
 * Pure TS, no React: scripts/qa/relief-cover-compare.test.mjs imports it.
 */
import {
  BASE, C, PIT_FLOOR, PIT_ROCK, buildContours, buildTerrain, mix,
  type Contours, type HeightFn, type Terrain, type TerrainLook, type TerrainSpec,
} from './terrainBlockGeometry';

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
  asking: boolean; // the next prediction is open ("המשך" pressed)
};
export type FlowAction =
  | { type: 'continue' }
  | { type: 'predict'; answer: Answer }
  | { type: 'view'; index: number }
  | { type: 'reset' };

export const INITIAL_FLOW: Flow = { reached: 0, view: 0, answers: {}, asking: false };
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

/* ── The hill and the quarry ─────────────────────────────────────────────── */

const E = Math.exp;

/** One rounded hill (~166 m) west of centre; the eastern strip stays plain for the village. */
export const HILL: HeightFn = (x, y) => {
  const dx = (x - 40) / 20;
  const dy = (y - 24) / 12;
  const th = Math.atan2(dy, dx);
  const r2 = (dx * dx + dy * dy) * (1 + 0.07 * Math.sin(2 * th + 0.9) + 0.04 * Math.cos(3 * th - 0.3));
  return BASE + 66 * E(-0.85 * r2);
};

/** The quarry: a notch in the hill's south flank (the side facing the camera), open downhill.
 *  x0–x1 × y0–y1 is the mask's outer edge; `band` is the soft transition just inside it.
 *  The floor sits 1 m above the 120 m contour level, not on it: a flat floor exactly on a level
 *  snaps that contour to the grid nodes, and the map shows it as a staircase. */
export const QUARRY = { x0: 44, x1: 56, y0: 28.5, y1: 46, band: 1.5, floor: 121 } as const;

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** 1 inside the cut, 0 outside, easing over QUARRY.band map units just inside its edge. */
export function quarryMask(x: number, y: number): number {
  const { x0, x1, y0, y1, band } = QUARRY;
  const e = (d: number) => smooth(d / band);
  return e(x - x0) * e(x1 - x) * e(y - y0) * e(y1 - y);
}

/** The same hill after quarrying: inside the mask, ground above the floor level is cut down to it. */
export const QUARRIED: HeightFn = (x, y) => {
  const h = HILL(x, y);
  return h - quarryMask(x, y) * Math.max(0, h - QUARRY.floor);
};

/* ── Land cover ──────────────────────────────────────────────────────────── */

export type Tree = { id: string; x: number; y: number; r: number; tone?: 0 | 1 | 2 }; // r: crown radius, screen units
export type House = { id: string; x: number; y: number; w: number; d: number; tall: number }; // tall: screen units
export type Cover = { grove: Tree[]; orchard: Tree[]; houses: House[] };

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

/** Natural grove: clumps of crowns of mixed size at irregular spacing, on the hill's slopes. */
const CLUMPS: [number, number, number][] = [
  // centre x, centre y, trees
  [29, 19, 6], [45, 15, 5], [27, 31, 5], [39, 33, 6], [53, 26, 5], [36, 10, 4], [19, 24, 3],
];
export const GROVE: Tree[] = (() => {
  const rand = rng(11);
  const out: Tree[] = [];
  for (const [cx, cy, n] of CLUMPS) {
    let placed = 0;
    for (let tries = 0; placed < n && tries < 400; tries++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 4.2;
      const x = cx + Math.cos(a) * d * 1.3; // a little wider E–W, like the hill
      const y = cy + Math.sin(a) * d * 0.8;
      if (out.some((t) => Math.hypot(t.x - x, t.y - y) < 1.9)) continue;
      // crowns ≥ 2.5 screen units across: ≥ 10 px on the 1440 board (≈ 4.2 px per unit)
      out.push({ id: `g${out.length}`, x, y, r: 1.25 + rand() * 0.75, tone: Math.floor(rand() * 3) as 0 | 1 | 2 });
      placed++;
    }
  }
  return out;
})();

/** Orchard: identical trees in straight rows at a fixed 3-unit spacing, on the lower south flank
 *  and its foot. The two western columns stand where the quarry will be cut. */
export const ORCHARD: Tree[] = Array.from({ length: 9 * 5 }, (_, i) => {
  const col = i % 9;
  const row = Math.floor(i / 9);
  return { id: `o${row}-${col}`, x: 50 + col * 3, y: 33 + row * 3, r: 1.25 };
});
/** The orchard's parcel on the map (plan units). */
export const ORCHARD_PARCEL = { x0: 48.5, y0: 31.5, x1: 75.5, y1: 46.5 } as const;
/** …after the quarry (state 4): the quarry site (mask ≥ 0.5, east edge at x1 − band / 2) has taken
 *  its western part — every tree there is gone — so the parcel starts where the site ends. */
export const ORCHARD_PARCEL_CUT = { ...ORCHARD_PARCEL, x0: QUARRY.x1 - QUARRY.band / 2 } as const;

/** Village: small flat-roofed houses on the eastern plain. */
export const HOUSES: House[] = [
  { id: 'h1', x: 80, y: 13, w: 3.2, d: 2.6, tall: 2.4 },
  { id: 'h2', x: 86.5, y: 11, w: 2.8, d: 2.4, tall: 2.0 },
  { id: 'h3', x: 93, y: 14, w: 3.4, d: 2.8, tall: 2.6 },
  { id: 'h4', x: 82, y: 21, w: 2.8, d: 2.4, tall: 2.2 },
  { id: 'h5', x: 89, y: 22, w: 3.2, d: 2.6, tall: 2.8 },
  { id: 'h6', x: 95, y: 27, w: 2.6, d: 2.2, tall: 2.0 },
  { id: 'h7', x: 84, y: 29, w: 3.0, d: 2.4, tall: 2.4 },
];

export const COVER: Record<StateId, Cover> = {
  bare: { grove: [], orchard: [], houses: [] },
  grove: { grove: GROVE, orchard: [], houses: [] },
  built: { grove: [], orchard: ORCHARD, houses: HOUSES },
  // the cut takes every orchard tree in the quarry area (its transition band included)
  quarry: { grove: [], orchard: ORCHARD.filter((t) => quarryMask(t.x, t.y) === 0), houses: HOUSES },
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

/* ── The block's look and the per-state terrain / contours ───────────────── */

// Bare earth — mixes of the existing illustration palette only, no green: inside
// this illustration green always means vegetation (spec §6).
const EARTH_RAMP: [number, string][] = [
  [0, mix(C.rim, C.paperEdge, 0.45)],
  [0.5, mix(C.rim, C.paperEdge, 0.15)],
  [1, mix(C.contour, C.rim, 0.5)],
];
// The band along the top of the block's cut edges: soil, not the landforms' vegetated topsoil.
const EARTH_TOPSOIL = mix(C.contourIndex, C.rim, 0.4);
// The quarry site in the engine's bare-rock tones: the cut floor and the open yard pale (fresh
// rock), the cut faces a darker rock, so the notch reads as a cut and not as a soft dip.
const QUARRY_FLOOR = mix(PIT_ROCK, C.paper, 0.65);
const QUARRY_FACE = PIT_FLOOR;
const quarryTint: NonNullable<TerrainLook['tint']> = (col, q) => {
  const w = quarryMask(q.x, q.y);
  if (w <= 0) return col;
  // a crisp edge: rock wherever ground was cut (from the faces' top rim down), and on the uncut
  // yard from mask 0.5 — the line the map draws as the quarry area
  const cut = HILL(q.x, q.y) - q.raw; // metres removed here
  const site = Math.max(smooth((w - 0.35) / 0.3), smooth((cut - 0.5) / 1.5));
  const face = smooth((q.raw - QUARRY.floor) / 6); // 0 on the floor and yard, 1 up the faces
  return mix(col, mix(QUARRY_FLOOR, QUARRY_FACE, face), 0.9 * site);
};
const KZ = 0.28; // the landforms hill's vertical exaggeration
export const HILL_SPEC: TerrainSpec = { h: HILL, kz: KZ, look: { ramp: EARTH_RAMP, topsoil: EARTH_TOPSOIL } };
export const QUARRY_SPEC: TerrainSpec = { h: QUARRIED, kz: KZ, look: { ramp: EARTH_RAMP, tint: quarryTint, topsoil: EARTH_TOPSOIL } };

export const terrainFor = (s: StateId): Terrain => buildTerrain(s === 'quarry' ? QUARRY_SPEC : HILL_SPEC);
export const contoursFor = (s: StateId): Contours => buildContours(s === 'quarry' ? QUARRIED : HILL);
