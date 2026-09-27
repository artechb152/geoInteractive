'use client';

import { useId, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * LandCoverMap — מבט-על מאויר (papercut) על שטח לדוגמה לתת-הנושא „תכסית”.
 *
 * הרמז הלימודי המרכזי מוצפן בציור עצמו: צומח טבעי = כתמים אורגניים ולא סדורים,
 * צומח שהאדם נטע = שורות ישרות, מרווחים קבועים וגבולות חלקה חדים.
 * קטגוריה פעילה מודגשת (מורמת), השאר דהויות; עונה משנה את הצבעים (חורף ירוק → קיץ קש),
 * וירוקי־עד (יער נטוע, מטע) נשארים ירוקים.
 *
 * המפה לא משוקפת ב-RTL. כל <text> עם textAnchor מפורש.
 */

export type CoverCat = 'vegetation' | 'human' | 'infra';
export type CoverSeason = 'winter' | 'summer';
export type CoverMapFeature = { id: string; label: string; cat: CoverCat };

const W = 400;
const H = 250;
const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────── deterministic randomness ───────────────────────── */

/** mulberry32 — natural vegetation must look irregular, yet SSR and client must match. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

type Blob = { x: number; y: number; r: number };
type Crown = Blob & { lobes: Blob[] };

/** Irregular (non-grid) scatter inside an ellipse, with a loose min spacing. */
function scatterBlobs(o: {
  n: number; cx: number; cy: number; rx: number; ry: number;
  rMin: number; rMax: number; seed: number; spacing: number;
}): Blob[] {
  const r = rng(o.seed);
  const out: Blob[] = [];
  for (let tries = 0; out.length < o.n && tries < o.n * 80; tries++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = o.cx + Math.cos(a) * d * o.rx;
    const y = o.cy + Math.sin(a) * d * o.ry;
    const rad = o.rMin + r() * (o.rMax - o.rMin);
    if (out.some((b) => Math.hypot(b.x - x, b.y - y) < (b.r + rad) * o.spacing)) continue;
    out.push({ x: r1(x), y: r1(y), r: r1(rad) });
  }
  return out;
}

/** Patchy clusters (garrigue): several dense clumps with bare ground between them. */
function clusterBlobs(o: {
  centers: [number, number][]; per: number; spread: number;
  rMin: number; rMax: number; seed: number; spacing: number;
}): Blob[] {
  const r = rng(o.seed);
  const out: Blob[] = [];
  for (const [cx, cy] of o.centers) {
    let placed = 0;
    for (let tries = 0; placed < o.per && tries < o.per * 60; tries++) {
      const gx = (r() + r() + r() - 1.5) * o.spread;
      const gy = (r() + r() + r() - 1.5) * o.spread * 0.8;
      const rad = o.rMin + r() * (o.rMax - o.rMin);
      const x = cx + gx;
      const y = cy + gy;
      if (out.some((b) => Math.hypot(b.x - x, b.y - y) < (b.r + rad) * o.spacing)) continue;
      out.push({ x: r1(x), y: r1(y), r: r1(rad) });
      placed++;
    }
  }
  return out;
}

/** Lumpy, uneven crowns — each natural crown gets two random side lobes. */
function withLobes(blobs: Blob[], seed: number): Crown[] {
  const r = rng(seed);
  return blobs.map((b) => ({
    ...b,
    lobes: [0, 1].map(() => {
      const a = r() * Math.PI * 2;
      const d = b.r * (0.35 + r() * 0.25);
      return { x: r1(b.x + Math.cos(a) * d), y: r1(b.y + Math.sin(a) * d), r: r1(b.r * (0.5 + r() * 0.2)) };
    }),
  }));
}

/* ───────────────────────────── palette ───────────────────────────── */

type Pal = {
  ground: string;
  groundPatch: string;
  understory: string;
  grove: string;
  groveHi: string;
  shrub: string;
  shrubHi: string;
  bathaPatch: string;
  tuft: string;
  field: [string, string, string];
  stripe: [string, string, string];
  terrace: [string, string];
};

/** Winter: grass, batha and fields green, shrubs dark green. Summer: straw/soil, shrubs grey. */
const PAL: Record<CoverSeason, Pal> = {
  winter: {
    ground: '#E7E3C8',
    groundPatch: '#D6D6AE',
    understory: '#C2C68F',
    grove: '#5A6A3F',
    groveHi: '#7A8A55',
    shrub: '#55613C',
    shrubHi: '#6E7A4E',
    bathaPatch: '#C6CC98',
    tuft: '#7E8A55',
    field: ['#8E9D57', '#A7B06B', '#B5BC82'],
    stripe: ['#788845', '#8F9A58', '#9CA469'],
    terrace: ['#CDCA9C', '#C1BE8C'],
  },
  summer: {
    ground: '#EFE0C1',
    groundPatch: '#E5D0A6',
    understory: '#DDC894',
    grove: '#646E47',
    groveHi: '#838A5E',
    shrub: '#8B8C73',
    shrubHi: '#A6A78E',
    bathaPatch: '#E5CF9A',
    tuft: '#BFA266',
    field: ['#DABD76', '#E6D29B', '#C8A673'],
    stripe: ['#C4A15B', '#D1B97E', '#A68756'],
    terrace: ['#DCC698', '#D0B988'],
  },
};

/** Season-independent illustration tones (planted/evergreen stays green). */
const C = {
  rim: '#C9B892',
  edge: '#D3C4A3',
  speck: '#A99B72',
  shade: '#3E3018',
  pine: '#4A5A36',
  pineHi: '#687852',
  pineCore: '#39472A',
  plantedFloor: '#D3CAA3',
  firebreak: '#EEE6CF',
  orchard: '#557838',
  orchardHi: '#789852',
  orchardFloor: '#DDD6B3',
  orchardRow: '#CEC69D',
  roofs: ['#F4EFE4', '#E6DDCA', '#DAD0BA', '#CEC1A7'],
  roofEdge: '#B1A385',
  yard: '#E4DAC2',
  lane: '#F1EADB',
  laneEdge: '#D8CBAF',
  square: '#F6F1E6',
  yardTree: '#6E7A4E',
  asphalt: '#5F6459',
  shoulder: '#EAE1CC',
  centre: '#F3E9DC',
  dirt: '#D5BF8F',
  dirtEdge: '#BFA676',
  rut: '#AD9463',
  waterHi: '#9CC8D6',
  water: '#7FB4C6',
  waterDeep: '#5E9AAF',
  ripple: '#D6EBF1',
  bankOuter: '#C9B892',
  bankInner: '#DCCFAE',
  steel: '#565B4F',
  cable: '#6A6F63',
  fence: '#5F6353',
  wall: '#9A8966',
  wallHi: '#F2EADA',
  pipe: '#7B878B',
} as const;

const TF = 'transition-colors duration-700 ease-snap motion-reduce:transition-none';

/* ───────────────────────────── geometry ───────────────────────────── */

const HULL = {
  grove:
    'M14,20 C22,6 48,3 66,8 C84,3 110,5 122,15 C132,28 129,46 125,58 C129,72 117,88 97,86 C78,90 58,84 40,88 C22,90 7,78 10,62 C4,48 8,32 14,20 Z',
  garrigue:
    'M12,124 C30,113 60,117 80,115 C100,111 124,116 128,130 C132,146 124,164 104,166 C84,170 60,164 40,168 C20,170 8,158 10,144 C8,136 8,128 12,124 Z',
  terraces:
    'M12,186 C40,173 96,172 127,182 C134,200 133,226 125,245 C90,251 40,251 12,245 C5,226 5,204 12,186 Z',
  batha:
    'M270,212 C290,202 330,206 356,204 C378,202 394,210 394,222 C396,236 386,246 366,246 C340,248 300,246 280,244 C266,240 262,222 270,212 Z',
  planted: 'M150,10 H236 V86 H150 Z',
  fields: 'M147,115 H241 V183 H147 Z',
  reservoir: 'M160,193 H226 Q237,193 237,204 V232 Q237,243 226,243 H160 Q149,243 149,232 V204 Q149,193 160,193 Z',
  village:
    'M268,8 C300,3 360,3 389,9 C397,30 397,62 391,85 C356,92 300,92 266,87 C259,62 259,30 268,8 Z',
  orchard: 'M270,126 H388 V196 H270 Z',
} as const;

const ROAD = 'M-6,108 C80,97 160,113 250,102 S362,90 406,94';
const TRACK = 'M249,103 C247,132 251,150 249,172 S247,222 249,256 M249,160 H268';
const POWER_X = 139;
const POWER = `M${POWER_X},-4 V${H + 4}`;
const FENCE = 'M268,156 V124 H390 V198 H268 V164';

type Shape = { kind: 'area'; d: string } | { kind: 'line'; d: string; w: number };

const SHAPES: Record<string, Shape> = {
  grove: { kind: 'area', d: HULL.grove },
  garrigue: { kind: 'area', d: HULL.garrigue },
  batha: { kind: 'area', d: HULL.batha },
  planted: { kind: 'area', d: HULL.planted },
  terraces: { kind: 'area', d: HULL.terraces },
  fields: { kind: 'area', d: HULL.fields },
  village: { kind: 'area', d: HULL.village },
  orchard: { kind: 'area', d: HULL.orchard },
  reservoir: { kind: 'area', d: HULL.reservoir },
  road: { kind: 'line', d: ROAD, w: 13 },
  track: { kind: 'line', d: TRACK, w: 10 },
  power: { kind: 'line', d: POWER, w: 12 },
  fence: { kind: 'line', d: FENCE, w: 8 },
};

/** Where each region's name tag sits (map units). */
const TAG_AT: Record<string, [number, number]> = {
  grove: [68, 47],
  garrigue: [70, 141],
  batha: [332, 226],
  planted: [193, 48],
  terraces: [69, 213],
  fields: [194, 149],
  village: [326, 44],
  orchard: [329, 160],
  reservoir: [193, 218],
  road: [196, 108],
  track: [249, 133],
  power: [POWER_X, 148],
  fence: [329, 124],
};

/* ── vegetation ── */
const GROVE = withLobes(
  scatterBlobs({ n: 30, cx: 68, cy: 46, rx: 54, ry: 35, rMin: 5, rMax: 9.5, seed: 11, spacing: 0.72 }),
  12,
);
const GROVE_SHRUBS = scatterBlobs({ n: 22, cx: 68, cy: 47, rx: 56, ry: 37, rMin: 1.8, rMax: 3.2, seed: 29, spacing: 1.1 });
const GARRIGUE = withLobes(
  clusterBlobs({
    centers: [[26, 131], [53, 143], [86, 128], [110, 148], [33, 157], [76, 158], [113, 126], [58, 124]],
    per: 7,
    spread: 8,
    rMin: 2.2,
    rMax: 4,
    seed: 7,
    spacing: 0.8,
  }),
  8,
);
const BATHA_TUFTS = scatterBlobs({ n: 90, cx: 331, cy: 225, rx: 58, ry: 17, rMin: 0.8, rMax: 1.5, seed: 5, spacing: 1.3 });
const BATHA_DWARF = scatterBlobs({ n: 12, cx: 331, cy: 225, rx: 54, ry: 15, rMin: 1.9, rMax: 2.6, seed: 17, spacing: 2.2 });

/** Planted forest — identical crowns on an exact grid: the "planted by man" cue. */
const PLANTED = Array.from({ length: 20 }, (_, i) => ({ x: 160 + (i % 5) * 16.5, y: 20.5 + Math.floor(i / 5) * 18.5 }));
const ORCHARD_ROWS = [139, 156, 173, 189];
const ORCHARD = ORCHARD_ROWS.flatMap((y) => Array.from({ length: 6 }, (_, i) => ({ x: 283 + i * 19.4, y })));

/* ── ground texture ── */
const SPECKS = (() => {
  const r = rng(91);
  return Array.from({ length: 170 }, () => ({ x: r1(r() * W), y: r1(r() * H), r: r1(0.4 + r() * 0.7) }));
})();
const GROUND_PATCHES = [
  [52, 104, 46, 7], [196, 98, 30, 6], [320, 104, 60, 7],
  [200, 250, 70, 8], [60, 172, 40, 4],
] as const;

/* ── village ── */
const HOUSES: [number, number, number, number][] = [
  [271, 13, 11, 8], [286, 11, 10, 9], [301, 14, 12, 8], [318, 10, 10, 8], [333, 12, 11, 9], [349, 10, 12, 8], [366, 14, 10, 9], [379, 24, 9, 10],
  [268, 29, 10, 10], [283, 31, 11, 8], [270, 49, 10, 9], [285, 51, 12, 9], [268, 67, 12, 9], [285, 69, 10, 8],
  [357, 29, 11, 9], [373, 33, 11, 8], [358, 50, 10, 10], [374, 52, 11, 9], [356, 69, 12, 8], [373, 70, 10, 9],
  [297, 65, 11, 9], [310, 71, 10, 8], [338, 70, 10, 8],
];
const YARD_TREES: [number, number, number][] = [
  [281, 24, 2.2], [297, 26, 2], [345, 24, 2.3], [365, 45, 2], [281, 62, 2.2], [300, 80, 2], [352, 82, 2.1], [384, 64, 2.2], [277, 83, 1.9],
];

/* ───────────────────────────── art pieces ───────────────────────────── */

function CrownSet({ crowns, fill, hi, sh }: { crowns: Crown[]; fill: string; hi: string; sh: number }) {
  return (
    <>
      <g fill={C.shade} opacity={0.22}>
        {crowns.map((c, i) => (
          <g key={i}>
            {[c, ...c.lobes].map((b, j) => (
              <circle key={j} cx={b.x + sh} cy={b.y + sh * 1.25} r={b.r} />
            ))}
          </g>
        ))}
      </g>
      <g style={{ fill }} className={TF}>
        {crowns.map((c, i) => (
          <g key={i}>
            {[c, ...c.lobes].map((b, j) => (
              <circle key={j} cx={b.x} cy={b.y} r={b.r} />
            ))}
          </g>
        ))}
      </g>
      <g style={{ fill: hi }} className={TF} opacity={0.8}>
        {crowns.map((c, i) => (
          <circle key={i} cx={r1(c.x - c.r * 0.28)} cy={r1(c.y - c.r * 0.3)} r={r1(c.r * 0.5)} />
        ))}
      </g>
    </>
  );
}

function GroveArt({ p }: { p: Pal }) {
  return (
    <>
      <path d={HULL.grove} style={{ fill: p.understory }} className={TF} />
      <g fill={C.shade} opacity={0.18}>
        {GROVE_SHRUBS.map((s, i) => (
          <circle key={i} cx={s.x + 0.8} cy={s.y + 1} r={s.r} />
        ))}
      </g>
      <g style={{ fill: p.shrub }} className={TF}>
        {GROVE_SHRUBS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} />
        ))}
      </g>
      <CrownSet crowns={GROVE} fill={p.grove} hi={p.groveHi} sh={1.8} />
    </>
  );
}

function GarrigueArt({ p }: { p: Pal }) {
  return (
    <>
      <path d={HULL.garrigue} style={{ fill: p.understory }} className={TF} opacity={0.55} />
      <CrownSet crowns={GARRIGUE} fill={p.shrub} hi={p.shrubHi} sh={0.9} />
    </>
  );
}

function BathaArt({ p }: { p: Pal }) {
  return (
    <>
      <path d={HULL.batha} style={{ fill: p.bathaPatch }} className={TF} />
      <g style={{ fill: p.tuft }} className={TF}>
        {BATHA_TUFTS.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={t.r} />
        ))}
      </g>
      <g fill={C.shade} opacity={0.16}>
        {BATHA_DWARF.map((t, i) => (
          <circle key={i} cx={t.x + 0.7} cy={t.y + 0.9} r={t.r} />
        ))}
      </g>
      <g style={{ fill: p.shrubHi }} className={TF}>
        {BATHA_DWARF.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={t.r} />
        ))}
      </g>
    </>
  );
}

function PlantedArt() {
  return (
    <>
      <rect x={150} y={10} width={86} height={76} rx={1} fill={C.plantedFloor} />
      <rect x={151} y={11} width={84} height={74} rx={1} fill="none" stroke={C.firebreak} strokeWidth={1.6} />
      <g fill={C.shade} opacity={0.24}>
        {PLANTED.map((t, i) => (
          <circle key={i} cx={t.x + 1.7} cy={t.y + 2.1} r={6.6} />
        ))}
      </g>
      <g fill={C.pine}>
        {PLANTED.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={6.6} />
        ))}
      </g>
      <g fill={C.pineHi} opacity={0.85}>
        {PLANTED.map((t, i) => (
          <circle key={i} cx={t.x - 1.8} cy={t.y - 1.9} r={3.4} />
        ))}
      </g>
      <g fill={C.pineCore}>
        {PLANTED.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={1.1} />
        ))}
      </g>
    </>
  );
}

function TerracesArt({ p, clipId }: { p: Pal; clipId: string }) {
  const tops = [178, 189, 200, 211, 222, 233, 244];
  const curve = (y: number) => `M0,${y} Q70,${y - 11} 140,${y}`;
  return (
    <g clipPath={`url(#${clipId})`}>
      {tops.slice(0, -1).map((y, k) => (
        <path
          key={y}
          d={`M0,${y} Q70,${y - 11} 140,${y} L140,${tops[k + 1]} Q70,${tops[k + 1] - 11} 0,${tops[k + 1]} Z`}
          style={{ fill: p.terrace[k % 2] }}
          className={TF}
        />
      ))}
      {tops.slice(1, -1).map((y) => (
        <g key={y}>
          <path d={curve(y + 0.9)} fill="none" stroke={C.wallHi} strokeWidth={0.8} />
          <path d={curve(y)} fill="none" stroke={C.wall} strokeWidth={1.5} strokeDasharray="2.2 0.8" />
        </g>
      ))}
    </g>
  );
}

function FieldsArt({ p, clipId }: { p: Pal; clipId: string }) {
  return (
    <>
      <rect x={148} y={116} width={45} height={66} style={{ fill: p.field[0] }} className={TF} />
      <rect x={196} y={116} width={44} height={31} style={{ fill: p.field[1] }} className={TF} />
      <rect x={196} y={150} width={44} height={32} style={{ fill: p.field[2] }} className={TF} />
      <g style={{ stroke: p.stripe[0] }} className={TF} strokeWidth={1.2}>
        {Array.from({ length: 12 }, (_, k) => 150.5 + k * 3.7).map((x) => (
          <line key={x} x1={x} y1={117.5} x2={x} y2={180.5} />
        ))}
      </g>
      <g style={{ stroke: p.stripe[1] }} className={TF} strokeWidth={1.1}>
        {Array.from({ length: 9 }, (_, k) => 118.5 + k * 3.3).map((y) => (
          <line key={y} x1={197.5} y1={y} x2={238.5} y2={y} />
        ))}
      </g>
      <g clipPath={`url(#${clipId})`} style={{ stroke: p.stripe[2] }} className={TF} strokeWidth={1.2}>
        {Array.from({ length: 17 }, (_, k) => 198 + k * 5).map((x) => (
          <line key={x} x1={x} y1={150} x2={x - 32} y2={182} />
        ))}
      </g>
      <g fill="none" stroke={C.firebreak} strokeWidth={1.4}>
        <rect x={148} y={116} width={45} height={66} />
        <rect x={196} y={116} width={44} height={31} />
        <rect x={196} y={150} width={44} height={32} />
      </g>
    </>
  );
}

function VillageArt() {
  return (
    <>
      <path d={HULL.village} fill={C.yard} />
      {/* lanes */}
      <g fill="none" strokeLinecap="round">
        <g stroke={C.laneEdge} strokeWidth={5}>
          <path d="M326,58 L327,97" />
          <path d="M262,44 H304" />
          <path d="M348,44 H396" />
          <rect x={300} y={28} width={52} height={32} rx={6} />
        </g>
        <g stroke={C.lane} strokeWidth={3.6}>
          <path d="M326,58 L327,97" />
          <path d="M262,44 H304" />
          <path d="M348,44 H396" />
          <rect x={300} y={28} width={52} height={32} rx={6} />
        </g>
      </g>
      {/* central square */}
      <rect x={305} y={33} width={42} height={22} rx={3} fill={C.square} stroke={C.laneEdge} strokeWidth={0.6} />
      <circle cx={326} cy={44} r={3.2} fill={C.shade} opacity={0.2} transform="translate(0.9 1.1)" />
      <circle cx={326} cy={44} r={3.2} fill={C.yardTree} />
      {/* houses — flat roofs with cast shadows */}
      <g fill={C.shade} opacity={0.26}>
        {HOUSES.map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x + 1.6} y={y + 1.9} width={w} height={h} rx={0.6} />
        ))}
      </g>
      {HOUSES.map(([x, y, w, h], i) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={w} height={h} rx={0.6} fill={C.roofs[i % 4]} stroke={C.roofEdge} strokeWidth={0.5} />
          {i % 3 === 0 && <rect x={x + w - 3.6} y={y + 1.2} width={2.4} height={1.8} fill={C.roofEdge} />}
        </g>
      ))}
      {YARD_TREES.map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x + 0.8} cy={y + 1} r={r} fill={C.shade} opacity={0.2} />
          <circle cx={x} cy={y} r={r} fill={C.yardTree} />
        </g>
      ))}
    </>
  );
}

function OrchardArt() {
  return (
    <>
      <rect x={270} y={126} width={118} height={70} fill={C.orchardFloor} />
      <g fill={C.orchardRow}>
        {ORCHARD_ROWS.map((y) => (
          <rect key={y} x={273} y={y - 5.5} width={112} height={11} rx={5.5} />
        ))}
      </g>
      <g fill={C.shade} opacity={0.24}>
        {ORCHARD.map((t, i) => (
          <circle key={i} cx={t.x + 1.3} cy={t.y + 1.6} r={5} />
        ))}
      </g>
      <g fill={C.orchard}>
        {ORCHARD.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={5} />
        ))}
      </g>
      <g fill={C.orchardHi} opacity={0.85}>
        {ORCHARD.map((t, i) => (
          <circle key={i} cx={t.x - 1.4} cy={t.y - 1.5} r={2.5} />
        ))}
      </g>
    </>
  );
}

function ReservoirArt({ gradId }: { gradId: string }) {
  return (
    <>
      {/* pipe to the fields — part of the water system */}
      <path d="M170,193 V184" stroke={C.pipe} strokeWidth={1.2} strokeDasharray="1.6 1.2" />
      <path d={HULL.reservoir} fill={C.bankOuter} />
      <rect x={153} y={197} width={80} height={42} rx={8} fill={C.bankInner} />
      <rect x={157} y={201} width={72} height={34} rx={5.5} fill={`url(#${gradId})`} />
      <g fill="none" stroke={C.ripple} strokeWidth={0.8} strokeLinecap="round" opacity={0.9}>
        <path d="M170,210 q5,-2.5 10,0" />
        <path d="M198,222 q5,-2.5 10,0" />
        <path d="M212,208 q4,-2 8,0" />
        <path d="M178,226 q4,-2 8,0" />
      </g>
    </>
  );
}

function RoadArt() {
  return (
    <>
      <path d={ROAD} fill="none" stroke={C.shade} strokeOpacity={0.14} strokeWidth={10} transform="translate(0.8 1.4)" />
      <path d={ROAD} fill="none" stroke={C.shoulder} strokeWidth={9.4} />
      <path d={ROAD} fill="none" stroke={C.asphalt} strokeWidth={7} />
      <path d={ROAD} fill="none" stroke={C.centre} strokeWidth={0.7} strokeDasharray="5 4" />
    </>
  );
}

function TrackArt() {
  return (
    <>
      <path d={TRACK} fill="none" stroke={C.dirtEdge} strokeWidth={5.4} strokeLinecap="round" />
      <path d={TRACK} fill="none" stroke={C.dirt} strokeWidth={4.2} strokeLinecap="round" />
      <path d={TRACK} fill="none" stroke={C.rut} strokeWidth={0.6} strokeDasharray="2.4 2" />
    </>
  );
}

function PowerArt() {
  const pylons = [22, 72, 122, 172, 222];
  return (
    <>
      <g stroke={C.cable} strokeWidth={0.45}>
        {[-3.5, 0, 3.5].map((dx) => (
          <line key={dx} x1={POWER_X + dx} y1={-4} x2={POWER_X + dx} y2={H + 4} />
        ))}
      </g>
      {pylons.map((y) => (
        <g key={y}>
          <path d={`M${POWER_X},${y} l9,7`} stroke={C.shade} strokeOpacity={0.18} strokeWidth={3} strokeLinecap="round" />
          <rect x={POWER_X - 3} y={y - 3} width={6} height={6} fill={C.shoulder} stroke={C.steel} strokeWidth={0.8} />
          <path
            d={`M${POWER_X - 3},${y - 3} L${POWER_X + 3},${y + 3} M${POWER_X + 3},${y - 3} L${POWER_X - 3},${y + 3}`}
            stroke={C.steel}
            strokeWidth={0.6}
          />
          <line x1={POWER_X - 6.5} y1={y} x2={POWER_X + 6.5} y2={y} stroke={C.steel} strokeWidth={1.2} strokeLinecap="round" />
        </g>
      ))}
    </>
  );
}

function FenceArt() {
  const posts: [number, number][] = [];
  for (let y = 126; y <= 196; y += 10) posts.push([390, y]);
  for (let x = 278; x <= 380; x += 10) {
    posts.push([x, 124]);
    posts.push([x, 198]);
  }
  for (let y = 134; y <= 188; y += 10) if (y < 154 || y > 166) posts.push([268, y]);
  return (
    <>
      <path d={FENCE} fill="none" stroke={C.fence} strokeWidth={0.8} strokeLinejoin="round" />
      <g fill={C.fence}>
        {posts.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 0.8} y={y - 0.8} width={1.6} height={1.6} />
        ))}
        {/* gate posts */}
        <rect x={266.4} y={154.4} width={3.2} height={3.2} />
        <rect x={266.4} y={162.4} width={3.2} height={3.2} />
      </g>
    </>
  );
}

/* ───────────────────────────── overlays ───────────────────────────── */

function Outline({ shape, mode }: { shape: Shape; mode: 'selected' | 'hover' | 'focus' }) {
  if (shape.kind === 'line') {
    if (mode === 'selected')
      return (
        <>
          <path d={shape.d} fill="none" stroke="#D97E2B" strokeOpacity={0.28} strokeWidth={shape.w} strokeLinecap="round" strokeLinejoin="round" />
          <path d={shape.d} fill="none" stroke="#D97E2B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    return (
      <path
        d={shape.d}
        fill="none"
        stroke={mode === 'focus' ? '#D97E2B' : '#38432E'}
        strokeOpacity={mode === 'focus' ? 0.35 : 0.14}
        strokeWidth={shape.w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (mode === 'selected')
    return (
      <>
        <path d={shape.d} fill="#D97E2B" fillOpacity={0.08} stroke="#D97E2B" strokeOpacity={0.25} strokeWidth={6} strokeLinejoin="round" />
        <path d={shape.d} fill="none" stroke="#D97E2B" strokeWidth={1.8} strokeLinejoin="round" />
      </>
    );
  return (
    <>
      <path d={shape.d} fill="#FFFFFF" fillOpacity={0.12} stroke="#FFFFFF" strokeWidth={3} strokeLinejoin="round" />
      <path
        d={shape.d}
        fill="none"
        stroke={mode === 'focus' ? '#D97E2B' : '#38432E'}
        strokeWidth={mode === 'focus' ? 1.6 : 1.1}
        strokeDasharray="3.5 2.5"
        strokeLinejoin="round"
      />
    </>
  );
}

function Tag({ x, y, label, selected }: { x: number; y: number; label: string; selected: boolean }) {
  const w = label.length * 4.7 + 13;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2 + 0.6} y={-6.3} width={w} height={14} rx={7} fill={C.shade} opacity={0.14} />
      <rect
        x={-w / 2}
        y={-7.5}
        width={w}
        height={14}
        rx={7}
        fill={selected ? '#D97E2B' : '#FFFFFF'}
        fillOpacity={selected ? 1 : 0.95}
        stroke={selected ? '#C96714' : '#DCCDB2'}
        strokeWidth={0.7}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="middle"
        direction="rtl"
        fontSize={8.4}
        fontWeight={700}
        fill={selected ? '#FFFFFF' : '#38432E'}
      >
        {label}
      </text>
    </g>
  );
}

/* ───────────────────────────── the map ───────────────────────────── */

export function LandCoverMap({
  features,
  cat,
  selectedId,
  season,
  onSelect,
  ariaLabel,
}: {
  features: CoverMapFeature[];
  cat: CoverCat;
  selectedId: string | null;
  season: CoverSeason;
  onSelect: (id: string) => void;
  ariaLabel: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const reduce = useReducedMotion();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const p = PAL[season];

  const featureOf = (id: string) => features.find((f) => f.id === id)!;
  const ids = {
    tile: `${uid}-tile`,
    terr: `${uid}-terr`,
    fieldC: `${uid}-fieldc`,
    water: `${uid}-water`,
    dim: `${uid}-dim`,
    lift: `${uid}-lift`,
  };

  const region = (id: string, art: ReactNode) => {
    const f = featureOf(id);
    const inCat = f.cat === cat;
    const lit = inCat || selectedId === id;
    const shape = SHAPES[id];
    return (
      <g
        key={id}
        data-region={id}
        role="button"
        tabIndex={inCat ? 0 : -1}
        aria-label={f.label}
        aria-pressed={selectedId === id}
        onClick={() => onSelect(id)}
        onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(id);
          }
        }}
        onMouseEnter={() => setHoverId(id)}
        onMouseLeave={() => setHoverId((h) => (h === id ? null : h))}
        onFocus={(e: FocusEvent<SVGGElement>) => {
          if (e.currentTarget.matches(':focus-visible')) setFocusId(id);
        }}
        onBlur={() => setFocusId((h) => (h === id ? null : h))}
        className="cursor-pointer outline-none transition-opacity duration-300 ease-snap motion-reduce:transition-none"
        style={{ opacity: lit ? 1 : 0.38 }}
        filter={lit ? `url(#${ids.lift})` : `url(#${ids.dim})`}
      >
        {art}
        {shape.kind === 'area' ? (
          <path d={shape.d} fill="transparent" />
        ) : (
          <path d={shape.d} fill="none" stroke="transparent" strokeWidth={shape.w} pointerEvents="stroke" />
        )}
      </g>
    );
  };

  const hotId = focusId ?? hoverId;
  const tagIds = features
    .filter((f) => f.cat === cat || f.id === hotId || f.id === selectedId)
    .map((f) => f.id);

  return (
    <svg
      viewBox={`-6 -6 ${W + 12} ${H + 14}`}
      className="w-full h-auto select-none"
      role="group"
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={ids.tile}>
          <rect x={0} y={0} width={W} height={H} rx={10} />
        </clipPath>
        <clipPath id={ids.terr}>
          <path d={HULL.terraces} />
        </clipPath>
        <clipPath id={ids.fieldC}>
          <rect x={196} y={150} width={44} height={32} />
        </clipPath>
        <linearGradient id={ids.water} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={C.waterHi} />
          <stop offset="0.45" stopColor={C.water} />
          <stop offset="1" stopColor={C.waterDeep} />
        </linearGradient>
        <filter id={ids.dim}>
          <feColorMatrix type="saturate" values="0.15" />
        </filter>
        <filter id={ids.lift} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#4A3A1E" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* paper tile: rim + ground */}
      <rect x={0} y={3} width={W} height={H} rx={10} fill={C.rim} />
      <g clipPath={`url(#${ids.tile})`}>
        <rect x={0} y={0} width={W} height={H} style={{ fill: p.ground }} className={TF} />
        <g style={{ fill: p.groundPatch }} className={TF} opacity={0.7}>
          {GROUND_PATCHES.map(([x, y, rx, ry]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} />
          ))}
        </g>
        <g fill={C.speck} opacity={0.35}>
          {SPECKS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} />
          ))}
        </g>

        {/* areas */}
        {region('grove', <GroveArt p={p} />)}
        {region('garrigue', <GarrigueArt p={p} />)}
        {region('batha', <BathaArt p={p} />)}
        {region('planted', <PlantedArt />)}
        {region('terraces', <TerracesArt p={p} clipId={ids.terr} />)}
        {region('fields', <FieldsArt p={p} clipId={ids.fieldC} />)}
        {region('village', <VillageArt />)}
        {region('orchard', <OrchardArt />)}
        {region('reservoir', <ReservoirArt gradId={ids.water} />)}
        {/* lines on top */}
        {region('track', <TrackArt />)}
        {region('road', <RoadArt />)}
        {region('power', <PowerArt />)}
        {region('fence', <FenceArt />)}

        {/* overlays — never intercept the pointer */}
        <g pointerEvents="none" aria-hidden>
          {hotId && hotId !== selectedId && <Outline shape={SHAPES[hotId]} mode={focusId ? 'focus' : 'hover'} />}
          <AnimatePresence>
            {selectedId && SHAPES[selectedId] && (
              <motion.g
                key={selectedId}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
              >
                <Outline shape={SHAPES[selectedId]} mode="selected" />
              </motion.g>
            )}
          </AnimatePresence>
          {tagIds.map((id) => (
            <Tag key={id} x={TAG_AT[id][0]} y={TAG_AT[id][1]} label={featureOf(id).label} selected={id === selectedId} />
          ))}
        </g>
      </g>
      <rect x={0.4} y={0.4} width={W - 0.8} height={H - 0.8} rx={9.6} fill="none" stroke={C.edge} strokeWidth={0.8} pointerEvents="none" />
    </svg>
  );
}
