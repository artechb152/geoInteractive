'use client';
/**
 * CivilianMap — district plan for CivilianScene (10.3).
 *
 *   - One street model: two main roads (E–W and the N–S road the corridor
 *     runs on) and a secondary grid; every block is filled with generated
 *     building footprints except the six sensitive sites, the target, and
 *     a park. Schematic — no scale, north up.
 *   - The six sites are drawn as their own buildings with a protection ring;
 *     the target (מטרה) sits between the hospital and the mosque, as in the
 *     scene's dilemma paragraph, and our forces attack it from the east.
 *   - Humanitarian corridor: on the N–S main road, civilians moving south →
 *     north and aid trucks moving in (scene copy: "דרום-צפון"). It plays once
 *     when switched on (`run` replays); while it is on, the attack axis
 *     stops at the corridor. Reduced motion → end state.
 *   - Copy-free: labels and site letters come from CivilianScene.tsx.
 */
import { useMemo } from 'react';
import { motion, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { useSequence, useSvgId } from '@/components/lessons/topic-06/CombatNavVisuals';
import { ForcePuck, Plate, URBAN_PALETTE as P } from './UrbanMorphologyMap';

type Pt = { x: number; y: number };
type R = { x: number; y: number; w: number; h: number };

const VB_W = 160;
const VB_H = 90;

const M = {
  street: '#F2EADB',
  ground: '#E7DCC5',
  roof: ['#D6C5A1', '#CFBC95', '#DCCCAB', '#C9B68E'],
  roofLine: '#A88F66',
  shadow: '#4F4128',
  site: '#EFE5D0',
  park: '#B9BE8F',
  tree: '#8A9163',
  water: '#9CC3CF',
  ink: '#38432E',
} as const;

/* ── Street model ────────────────────────────────────────────────────── */

/** Road centre-lines and widths. x=106 is the N–S main road (corridor). */
const ROADS_V = [{ c: 22, w: 2.2 }, { c: 46, w: 2.2 }, { c: 70, w: 2.2 }, { c: 88, w: 2.2 }, { c: 106, w: 4.2 }, { c: 128, w: 2.2 }, { c: 146, w: 2.2 }];
const ROADS_H = [{ c: 18, w: 2.2 }, { c: 40, w: 3.6 }, { c: 60, w: 2.2 }, { c: 76, w: 2.2 }];
const CORRIDOR_X = 106;
const MAIN_EW_Y = 40;

const edges = (roads: { c: number; w: number }[], max: number) => {
  const out: [number, number][] = [];
  let from = 0;
  for (const r of roads) {
    out.push([from, r.c - r.w / 2]);
    from = r.c + r.w / 2;
  }
  out.push([from, max]);
  return out;
};
const COLS = edges(ROADS_V, VB_W);
const ROWS = edges(ROADS_H, VB_H);
const BLOCKS: R[] = COLS.flatMap(([x0, x1]) => ROWS.map(([y0, y1]) => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 })));

/** Which block a point falls in (site/target/park blocks get no filler). */
const blockAt = (p: Pt) => BLOCKS.findIndex((b) => p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h);

export type SiteKind = 'hospital' | 'mosque' | 'school' | 'water' | 'un' | 'media';

/** Site buildings (footprints) and marker spot, per kind. */
const SITE_SHAPES: Record<SiteKind, { at: Pt; rects: R[]; circles?: { x: number; y: number; r: number; water?: boolean }[] }> = {
  hospital: { at: { x: 58.5, y: 28.5 }, rects: [{ x: 49, y: 21, w: 6, h: 15 }, { x: 62, y: 21, w: 6, h: 15 }, { x: 55, y: 26, w: 7, h: 5 }] },
  un: { at: { x: 79, y: 9.5 }, rects: [{ x: 73, y: 3.5, w: 6.5, h: 5 }, { x: 80.5, y: 10, w: 5, h: 5 }] },
  mosque: { at: { x: 96.5, y: 50 }, rects: [{ x: 91.5, y: 45, w: 10, h: 10 }], circles: [{ x: 101, y: 44.6, r: 1.1 }] },
  school: { at: { x: 119, y: 69 }, rects: [{ x: 109.5, y: 62.5, w: 15.5, h: 4 }, { x: 109.5, y: 62.5, w: 4.2, h: 11 }] },
  water: { at: { x: 35, y: 68 }, rects: [{ x: 39, y: 63, w: 4.6, h: 9 }], circles: [{ x: 27.5, y: 65.5, r: 2.4, water: true }, { x: 33, y: 65.5, r: 2.4, water: true }, { x: 30.2, y: 71.2, r: 2.4, water: true }] },
  media: { at: { x: 136.5, y: 28.5 }, rects: [{ x: 131.5, y: 21.5, w: 10, h: 14 }] },
};
const UN_WALL: R = { x: 71.9, y: 1.8, w: 14.2, h: 14.2 };
const TARGET: Pt = { x: 77.5, y: 49 };
const TARGET_RECT: R = { x: 73, y: 44.5, w: 9, h: 9 };
const PARK_BLOCK = blockAt({ x: 137, y: 68 });
const FORCE_AT: Pt = { x: 152.5, y: MAIN_EW_Y };
/** Attack axis: along the E–W main road, then into the target block. */
const ATTACK_PATH: Pt[] = [{ x: 149.5, y: MAIN_EW_Y }, { x: 90, y: MAIN_EW_Y }, { x: 83.6, y: 45.4 }];
/** Where the attack halts while the corridor is open (east kerb of the corridor). */
const ATTACK_HALT_X = CORRIDOR_X + 4.6;
const RING_R = 7;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Filler buildings: lots of ~6 units with random setbacks, some left open. */
const FILLER: { r: R; tone: string }[] = (() => {
  const reserved = new Set<number>([
    ...Object.values(SITE_SHAPES).map((s) => blockAt(s.at)),
    blockAt(TARGET),
    PARK_BLOCK,
  ]);
  const rnd = rng(31);
  const out: { r: R; tone: string }[] = [];
  BLOCKS.forEach((b, i) => {
    if (reserved.has(i)) return;
    const m = 0.9;
    const nx = Math.max(1, Math.round((b.w - 2 * m) / 6));
    const ny = Math.max(1, Math.round((b.h - 2 * m) / 6));
    const lw = (b.w - 2 * m) / nx;
    const lh = (b.h - 2 * m) / ny;
    for (let i2 = 0; i2 < nx; i2++)
      for (let j = 0; j < ny; j++) {
        if (rnd() < 0.12) continue;
        const ix = 0.25 + rnd() * 0.7;
        const iy = 0.25 + rnd() * 0.7;
        out.push({
          r: { x: b.x + m + i2 * lw + ix, y: b.y + m + j * lh + iy, w: lw - ix - 0.3 - rnd() * 0.6, h: lh - iy - 0.3 - rnd() * 0.6 },
          tone: M.roof[Math.floor(rnd() * M.roof.length)],
        });
      }
  });
  return out;
})();

const TREES: Pt[] = (() => {
  const b = BLOCKS[PARK_BLOCK];
  const rnd = rng(5);
  return Array.from({ length: 14 }, () => ({ x: b.x + 1.8 + rnd() * (b.w - 3.6), y: b.y + 1.8 + rnd() * (b.h - 3.6) }));
})();

/* ── Base map (static) ───────────────────────────────────────────────── */

function BaseMap({ onBackground }: { onBackground: () => void }) {
  return (
    <g>
      <rect x={0} y={0} width={VB_W} height={VB_H} fill={M.street} onClick={onBackground} />
      <g pointerEvents="none">
        {BLOCKS.map((b, i) => (
          <rect key={i} x={b.x + 0.35} y={b.y + 0.35} width={b.w - 0.7} height={b.h - 0.7} rx={0.6} fill={i === PARK_BLOCK ? M.park : M.ground} />
        ))}
        {TREES.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={1.2} fill={M.tree} />
        ))}
        {FILLER.map(({ r, tone }, i) => (
          <g key={i}>
            <rect x={r.x + 0.35} y={r.y + 0.45} width={r.w} height={r.h} fill={M.shadow} fillOpacity={0.16} />
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={tone} stroke={M.roofLine} strokeWidth={0.14} />
          </g>
        ))}
        {/* Main roads: centre dashes */}
        <line x1={0} y1={MAIN_EW_Y} x2={VB_W} y2={MAIN_EW_Y} stroke="#FFFFFF" strokeWidth={0.25} strokeDasharray="1.6 1.2" />
        <line x1={CORRIDOR_X} y1={0} x2={CORRIDOR_X} y2={VB_H} stroke="#FFFFFF" strokeWidth={0.25} strokeDasharray="1.6 1.2" />
        {/* Target building */}
        <rect x={TARGET_RECT.x + 0.35} y={TARGET_RECT.y + 0.45} width={TARGET_RECT.w} height={TARGET_RECT.h} fill={M.shadow} fillOpacity={0.16} />
        <rect x={TARGET_RECT.x} y={TARGET_RECT.y} width={TARGET_RECT.w} height={TARGET_RECT.h} fill={M.roof[3]} stroke={M.roofLine} strokeWidth={0.14} />
      </g>
    </g>
  );
}

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none" transform={`translate(${x} ${y})`}>
      <circle r={3.4} fill="#FFFFFF" fillOpacity={0.94} stroke={P.plateEdge} strokeWidth={0.18} />
      <path d="M0 -2.5L1.3 1.8L0 0.9Z" fill={M.ink} />
      <path d="M0 -2.5L-1.3 1.8L0 0.9Z" fill="#FFFFFF" stroke={M.ink} strokeWidth={0.2} />
    </g>
  );
}

/* ── Sites ───────────────────────────────────────────────────────────── */

export type CivilianSite = { id: string; kind: SiteKind; label: string };

function Site({
  site,
  letter,
  selected,
  playKey,
  reduce,
  onPick,
}: {
  site: CivilianSite;
  letter: string;
  selected: boolean;
  playKey: string;
  reduce: boolean;
  onPick: () => void;
}) {
  const s = SITE_SHAPES[site.kind];
  const { x, y } = s.at;
  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Hit area + selected wash under the buildings */}
      <circle cx={x} cy={y} r={RING_R} fill={selected ? P.select : 'transparent'} fillOpacity={selected ? 0.07 : 0} />
      {selected && !reduce && (
        <motion.circle
          key={playKey}
          cx={x}
          cy={y}
          fill="none"
          stroke={P.select}
          strokeWidth={0.4}
          initial={{ r: 2.4, opacity: 0.9 }}
          animate={{ r: RING_R + 3, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      )}
      {/* Buildings */}
      {site.kind === 'un' && <rect x={UN_WALL.x} y={UN_WALL.y} width={UN_WALL.w} height={UN_WALL.h} fill="none" stroke={M.ink} strokeOpacity={0.55} strokeWidth={0.3} />}
      {s.rects.map((r, i) => (
        <g key={i}>
          <rect x={r.x + 0.35} y={r.y + 0.45} width={r.w} height={r.h} fill={M.shadow} fillOpacity={0.16} />
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={M.site} stroke={selected ? P.select : M.ink} strokeWidth={selected ? 0.5 : 0.25} />
        </g>
      ))}
      {s.circles?.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={c.water ? M.water : M.site} stroke={selected ? P.select : M.ink} strokeWidth={selected ? 0.5 : 0.25} />
      ))}
      {/* Protection ring — over the buildings so it reads on large sites */}
      <circle cx={x} cy={y} r={RING_R} fill="none" stroke={selected ? P.select : M.ink} strokeOpacity={selected ? 1 : 0.35} strokeWidth={selected ? 0.45 : 0.3} pointerEvents="none" />
      {/* Marker */}
      <circle cx={x} cy={y} r={selected ? 2.2 : 1.85} fill={selected ? P.select : M.ink} stroke="#FFFFFF" strokeWidth={0.4} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={2.2} fontWeight={800} fill="#FFFFFF" className="font-display" pointerEvents="none">
        {letter}
      </text>
    </g>
  );
}

/* ── Corridor + attack axis ──────────────────────────────────────────── */

const CORRIDOR = { x0: CORRIDOR_X - 2.6, x1: CORRIDOR_X + 2.6 };
const CIVILIANS = 7;
const TRUCKS = 3;
const CORRIDOR_T = { reveal: 0.8, end: 6.4 };

function Corridor({ run, label }: { run: number; label: string }) {
  const { t } = useSequence(CORRIDOR_T.end, true, run);
  const id = useSvgId('corr');
  const h = useTransform(t, [0, CORRIDOR_T.reveal], [0, VB_H], { clamp: true });
  const y = useTransform(h, (v) => VB_H - v);
  return (
    <g pointerEvents="none">
      <defs>
        <clipPath id={`${id}-reveal`}>
          <motion.rect x={CORRIDOR.x0 - 1} y={y} width={CORRIDOR.x1 - CORRIDOR.x0 + 2} height={h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-reveal)`}>
        <rect x={CORRIDOR.x0} y={0} width={CORRIDOR.x1 - CORRIDOR.x0} height={VB_H} className="fill-brand" fillOpacity={0.3} />
        <line x1={CORRIDOR.x0} y1={0} x2={CORRIDOR.x0} y2={VB_H} className="stroke-brand-dark" strokeWidth={0.35} />
        <line x1={CORRIDOR.x1} y1={0} x2={CORRIDOR.x1} y2={VB_H} className="stroke-brand-dark" strokeWidth={0.35} />
        {Array.from({ length: 10 }, (_, i) => 6 + i * 8.6).map((cy) => (
          <path key={cy} d={`M${CORRIDOR_X - 1.4} ${cy + 0.9}L${CORRIDOR_X} ${cy - 0.5}L${CORRIDOR_X + 1.4} ${cy + 0.9}`} fill="none" className="stroke-brand-dark" strokeWidth={0.4} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
      {Array.from({ length: CIVILIANS }, (_, i) => (
        <Mover key={`c${i}`} t={t} t0={0.6 + i * 0.32} dur={3.4} x={CORRIDOR_X - 1.1} y0={VB_H + 2} y1={3.5 + i * 3.6} kind="civilian" />
      ))}
      {Array.from({ length: TRUCKS }, (_, i) => (
        <Mover key={`a${i}`} t={t} t0={1.4 + i * 0.75} dur={3} x={CORRIDOR_X + 1.15} y0={-3} y1={64 - i * 4.4} kind="truck" />
      ))}
      <Plate x={CORRIDOR_X} y={86.3} text={label} tone="#5B7C5C" />
    </g>
  );
}

function Mover({ t, t0, dur, x, y0, y1, kind }: { t: MotionValue<number>; t0: number; dur: number; x: number; y0: number; y1: number; kind: 'civilian' | 'truck' }) {
  const y = useTransform(t, [t0, t0 + dur], [y0, y1], { clamp: true });
  return (
    <motion.g style={{ x, y }}>
      {kind === 'civilian' ? (
        <circle r={1} fill="#FFFFFF" stroke={M.ink} strokeWidth={0.35} />
      ) : (
        <rect x={-0.85} y={-1.4} width={1.7} height={2.8} rx={0.3} fill="#FFFFFF" className="stroke-brand-dark" strokeWidth={0.35} />
      )}
    </motion.g>
  );
}

function AttackAxis({ halted }: { halted: boolean }) {
  const pts = halted ? [ATTACK_PATH[0], { x: ATTACK_HALT_X, y: MAIN_EW_Y }] : ATTACK_PATH;
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const ang = (Math.atan2(end.y - prev.y, end.x - prev.x) * 180) / Math.PI;
  return (
    <g pointerEvents="none">
      <path d={`M${pts.map((p) => `${p.x} ${p.y}`).join('L')}`} fill="none" className="stroke-accent-cool" strokeWidth={0.7} strokeLinejoin="round" />
      {halted ? (
        <line x1={end.x} y1={end.y - 2.2} x2={end.x} y2={end.y + 2.2} stroke={M.ink} strokeWidth={0.7} strokeLinecap="round" />
      ) : (
        <path d="M-1.4 -1.3L1.2 0L-1.4 1.3Z" className="fill-accent-cool" transform={`translate(${end.x} ${end.y}) rotate(${ang})`} />
      )}
    </g>
  );
}

/* ── Map ─────────────────────────────────────────────────────────────── */

export type CivilianMapLabels = { corridor: string; target: string; force: string };

/**
 * `active` null = no site selected. Site marks are mouse targets; the
 * scene's type tabs are the keyboard path. Clicking the selected site again,
 * or empty map, clears the selection.
 */
export function CivilianMap({
  sites,
  letters,
  active,
  onSelect,
  corridor,
  corridorRun,
  labels,
}: {
  sites: CivilianSite[];
  letters: Record<SiteKind, string>;
  active: SiteKind | null;
  onSelect: (k: SiteKind | null) => void;
  corridor: boolean;
  corridorRun: number;
  labels: CivilianMapLabels;
}) {
  const reduce = !!useReducedMotion();
  const ordered = useMemo(
    // Selected site drawn last so its ring sits on top.
    () => [...sites].sort((a, b) => Number(a.kind === active) - Number(b.kind === active)),
    [sites, active],
  );
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block w-full h-full select-none" aria-hidden>
      <BaseMap onBackground={() => onSelect(null)} />
      {corridor && <Corridor key={corridorRun} run={corridorRun} label={labels.corridor} />}

      {/* Target + our forces */}
      <g pointerEvents="none">
        <circle cx={TARGET.x} cy={TARGET.y} r={2.6} fill="none" stroke={P.threat} strokeWidth={0.45} />
        <path d={`M${TARGET.x - 3.6} ${TARGET.y}H${TARGET.x - 1.4}M${TARGET.x + 1.4} ${TARGET.y}H${TARGET.x + 3.6}M${TARGET.x} ${TARGET.y - 3.6}V${TARGET.y - 1.4}M${TARGET.x} ${TARGET.y + 1.4}V${TARGET.y + 3.6}`} stroke={P.threat} strokeWidth={0.45} />
        <circle cx={TARGET.x} cy={TARGET.y} r={0.6} fill={P.threat} />
      </g>
      <AttackAxis halted={corridor} />
      <ForcePuck x={FORCE_AT.x} y={FORCE_AT.y} r={1.8} />

      {ordered.map((s) => (
        <Site
          key={s.id}
          site={s}
          letter={letters[s.kind]}
          selected={active === s.kind}
          playKey={`${s.kind}-${active}`}
          reduce={reduce}
          onPick={() => onSelect(active === s.kind ? null : s.kind)}
        />
      ))}

      {/* Labels */}
      {sites.map((s) => {
        const at = SITE_SHAPES[s.kind].at;
        const below = s.kind === 'un';
        return <Plate key={s.id} x={at.x} y={below ? at.y + RING_R + 1.4 : at.y - RING_R - 0.4} text={s.label} tone={active === s.kind ? '#C96714' : M.ink} />;
      })}
      <Plate x={TARGET.x} y={TARGET.y + 6.8} text={labels.target} tone={P.threat} />
      <Plate x={FORCE_AT.x - 1} y={FORCE_AT.y - 4.6} text={labels.force} />
      <NorthArrow x={6} y={6} />
    </svg>
  );
}
