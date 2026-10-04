'use client';
/**
 * ThreeDimVisuals — the urban cross-section for ThreeDimScene (10.2).
 *
 *   - ONE section model (buildings, street, basements, shafts, tunnels) feeds
 *     both the main interactive section and the "עקרון השילוב" demo below it.
 *   - Vertical axis is piecewise-linear, marked with break symbols on the
 *     axis: +5…+150 m compressed, the 0–5 m street band expanded (people and
 *     vehicles must be readable), 0…−30 m in between. Schematic, not to
 *     scale; horizontal distances are illustrative.
 *   - Each band's four threats are numbered 1–4 on the drawing in the same
 *     order as the scene's threat list (the numbers are the link).
 *   - Each band's demo plays once when the band is selected; `run` replays.
 *     Reduced motion → end state.
 *   - Copy-free: Hebrew labels come from ThreeDimScene.tsx.
 *
 * Not mirrored for RTL: a section keeps its geometry.
 */
import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { motion, useInView, useTransform, type MotionValue } from 'framer-motion';
import { useSequence, useSvgId } from '@/components/lessons/topic-06/CombatNavVisuals';
import { Icon } from '@/components/Icon';
import { ForcePuck, Plate, URBAN_PALETTE as P, bidiNum } from './UrbanMorphologyMap';

export type Dim = 'above' | 'street' | 'below';
type Pt = { x: number; y: number };

/* ── Model ───────────────────────────────────────────────────────────── */

const VB_W = 160;
const VB_H = 84;
const AXIS_X = 14.5;
const Y_150 = 3;
const Y_5 = 38;
const Y_0 = 50;
const Y_M30 = 81;

/** Metres (above/below ground) → section y. Piecewise: see header. */
export function yOf(m: number) {
  if (m >= 5) return Y_5 - ((m - 5) * (Y_5 - Y_150)) / 145;
  if (m >= 0) return Y_0 - (m * (Y_0 - Y_5)) / 5;
  return Y_0 + (-m * (Y_M30 - Y_0)) / 30;
}

const S = {
  sky: ['#F7F2E8', '#EEE5D4'],
  earth: ['#C3AC84', '#8B7454'],
  strata: '#7A6548',
  facade: ['#DCCCAB', '#D3C29E', '#E2D4B6', '#CFBD97'],
  facadeEdge: '#A88F66',
  window: '#B4A07B',
  door: '#8E7A57',
  basement: '#6E5F48',
  tunnel: '#3B3127',
  lining: '#8A7352',
  asphalt: '#7D7466',
  tank: '#6E7A4E',
  tankDark: '#55613C',
  car: '#9C9A90',
  dim: '#FBF8F2',
} as const;

type Bldg = { x: number; w: number; h: number; basement?: boolean };
const BUILDINGS: Bldg[] = [
  { x: 15.5, w: 10, h: 66 },
  { x: 25.5, w: 9.5, h: 24 },
  { x: 35, w: 9, h: 30, basement: true }, // the sniper's building (combined demo)
  // alley 44–46.5 · main street 46.5–78
  { x: 78, w: 13, h: 120, basement: true }, // tower: rooftop OP, ATGM window
  { x: 91, w: 9, h: 18 },
  { x: 100, w: 11, h: 42, basement: true },
  { x: 111, w: 8, h: 27 },
  // side alley 119–122.5
  { x: 122.5, w: 10.5, h: 21 },
  { x: 133, w: 13.5, h: 100 },
  { x: 146.5, w: 13.5, h: 36, basement: true }, // far end of the city (combined demo)
];
const STREET = { x0: 46.5, x1: 78 };
const BASEMENT_M = -4;

type Shaft = { x: number; fromBasement: boolean; toM: number };
const SHAFTS: Shaft[] = [
  { x: 39.5, fromBasement: true, toM: -14 },
  { x: 48, fromBasement: false, toM: -12 },
  { x: 58.8, fromBasement: false, toM: -12 },
  { x: 84.5, fromBasement: true, toM: -17 },
  { x: 106, fromBasement: true, toM: -13 },
  { x: 153, fromBasement: true, toM: -20 },
];
/** Tunnel network (x, depth m). */
const TUNNEL_MAIN: [number, number][] = [[14.5, -14], [39.5, -14], [44, -12], [58.8, -12], [62, -17], [98, -17], [102, -13], [128, -13], [136, -20], [160, -20]];
const TUNNEL_DEEP: [number, number][] = [[62, -17], [66, -25], [96, -25]];
const CHAMBERS = [
  { x: 90, w: 10, m0: -23.4, m1: -26.6 },
  { x: 118, w: 10, m0: -11.4, m1: -14.6 },
];

const toPts = (a: [number, number][]) => a.map(([x, m]) => ({ x, y: yOf(m) }));
const dOf = (pts: Pt[]) => `M${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('L')}`;

const FORCE: Pt[] = [{ x: 51.8, y: Y_0 - 1.5 }, { x: 54.6, y: Y_0 - 1.5 }];
const TANK = { x0: 61.5, x1: 72.5 };
const CAR = { x0: 73.5, x1: 77.8 };

/** Four threat spots per band — same order as the scene's threat lists. */
export const THREAT_SPOTS: Record<Dim, Pt[]> = {
  above: [
    { x: 40.5, y: yOf(30) - 1.8 }, // roof sniper (RPG / small arms)
    { x: 79.7, y: yOf(40) }, // ATGM from a high window → tank roof
    { x: 79.4, y: yOf(12) }, // charges / grenades from a window
    { x: 80.2, y: yOf(120) - 1.8 }, // rooftop observation post
  ],
  street: [
    { x: 75.6, y: yOf(2.2) }, // IED in a parked car
    { x: 45.2, y: Y_0 - 2 }, // point-blank fire from a side alley
    { x: 120.75, y: Y_0 - 2.2 }, // ambush at the next street corner (side alley)
    { x: 49.4, y: Y_0 - 5.2 }, // face to face, metres away
  ],
  below: [
    { x: 48, y: Y_0 - 1.9 }, // emerging behind the force
    { x: 106, y: yOf(BASEMENT_M) - 1.7 }, // booby-trapped tunnel opening
    { x: 58.8, y: Y_0 - 1.9 }, // abduction shaft
    { x: 80, y: yOf(-17) }, // moving weapons under the army
  ],
};

const BANDS: Record<Dim, { y0: number; y1: number }> = {
  above: { y0: 0, y1: Y_5 },
  street: { y0: Y_5, y1: Y_0 },
  below: { y0: Y_0, y1: VB_H },
};

/* ── Path helper (constant speed along a polyline) ───────────────────── */

function pathSampler(pts: Pt[]) {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = seg.reduce((a, b) => a + b, 0);
  return (s: number): Pt => {
    let d = Math.max(0, Math.min(1, s)) * total;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) {
        const k = seg[i] ? Math.min(1, d / seg[i]) : 0;
        return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
      }
      d -= seg[i];
    }
    return pts[pts.length - 1];
  };
}

function useMover(t: MotionValue<number>, pts: Pt[], t0: number, t1: number) {
  const at = useMemo(() => pathSampler(pts), [pts]);
  const s = useTransform(t, [t0, t1], [0, 1], { clamp: true });
  const x = useTransform(s, (v) => at(v).x);
  const y = useTransform(s, (v) => at(v).y);
  return { s, x, y };
}

/* ── Static section drawing ──────────────────────────────────────────── */

function SectionBase({ id }: { id: string }) {
  return (
    <g pointerEvents="none">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={S.sky[0]} />
          <stop offset="100%" stopColor={S.sky[1]} />
        </linearGradient>
        <linearGradient id={`${id}-earth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={S.earth[0]} />
          <stop offset="100%" stopColor={S.earth[1]} />
        </linearGradient>
      </defs>
      <rect x={AXIS_X} y={0} width={VB_W - AXIS_X} height={Y_0} fill={`url(#${id}-sky)`} />
      <rect x={AXIS_X} y={Y_0} width={VB_W - AXIS_X} height={VB_H - Y_0} fill={`url(#${id}-earth)`} />
      {[56, 63.5, 71, 77.5].map((y, i) => (
        <path
          key={y}
          d={`M${AXIS_X} ${y}C${40 + i * 6} ${y - 1.2} ${90 - i * 4} ${y + 1.4} ${VB_W} ${y - 0.4}`}
          fill="none"
          stroke={S.strata}
          strokeOpacity={0.35}
          strokeWidth={0.25}
          strokeDasharray={i % 2 ? '2 1.2' : undefined}
        />
      ))}

      {/* Tunnels: lining, void; shafts; chambers */}
      {[TUNNEL_MAIN, TUNNEL_DEEP].map((t, i) => (
        <path key={`l${i}`} d={dOf(toPts(t))} fill="none" stroke={S.lining} strokeWidth={3.1} strokeLinejoin="round" />
      ))}
      {CHAMBERS.map((c) => (
        <rect key={`cl${c.x}`} x={c.x - 0.4} y={yOf(c.m0) - 0.4} width={c.w + 0.8} height={yOf(c.m1) - yOf(c.m0) + 0.8} rx={0.8} fill={S.lining} />
      ))}
      {SHAFTS.map((s) => {
        const top = s.fromBasement ? yOf(BASEMENT_M) : Y_0;
        return <rect key={`sl${s.x}`} x={s.x - 1.05} y={top} width={2.1} height={yOf(s.toM) - top} fill={S.lining} />;
      })}
      {[TUNNEL_MAIN, TUNNEL_DEEP].map((t, i) => (
        <path key={`v${i}`} d={dOf(toPts(t))} fill="none" stroke={S.tunnel} strokeWidth={2.3} strokeLinejoin="round" />
      ))}
      {CHAMBERS.map((c) => (
        <rect key={`cv${c.x}`} x={c.x} y={yOf(c.m0)} width={c.w} height={yOf(c.m1) - yOf(c.m0)} rx={0.6} fill={S.tunnel} />
      ))}
      {SHAFTS.map((s) => {
        const top = s.fromBasement ? yOf(BASEMENT_M) : Y_0;
        return <rect key={`sv${s.x}`} x={s.x - 0.6} y={top} width={1.2} height={yOf(s.toM) - top} fill={S.tunnel} />;
      })}

      {/* Buildings: basement, facade, window rows, ground floor, roof */}
      {BUILDINGS.map((b, i) => {
        const top = yOf(b.h);
        const rows: number[] = [];
        for (let m = 8; m < b.h - 2; m += 6) rows.push(yOf(m));
        return (
          <g key={b.x}>
            {b.basement && <rect x={b.x + 0.4} y={Y_0} width={b.w - 0.8} height={yOf(BASEMENT_M) - Y_0} fill={S.basement} stroke={S.strata} strokeWidth={0.2} />}
            <rect x={b.x} y={top} width={b.w} height={Y_0 - top} fill={S.facade[i % S.facade.length]} stroke={S.facadeEdge} strokeWidth={0.22} />
            {rows.map((y) => (
              <rect key={y} x={b.x + 0.8} y={y - 0.28} width={b.w - 1.6} height={0.5} fill={S.window} />
            ))}
            {/* ground floor (expanded band): shopfront + door */}
            <line x1={b.x} y1={Y_5} x2={b.x + b.w} y2={Y_5} stroke={S.facadeEdge} strokeWidth={0.2} />
            <rect x={b.x + 0.9} y={yOf(3.6)} width={b.w * 0.45} height={yOf(1.2) - yOf(3.6)} fill={S.window} fillOpacity={0.7} />
            <rect x={b.x + b.w * 0.62} y={yOf(2.6)} width={Math.min(2.2, b.w * 0.22)} height={Y_0 - yOf(2.6)} fill={S.door} />
            <rect x={b.x - 0.2} y={top - 0.6} width={b.w + 0.4} height={0.6} fill={S.facadeEdge} />
            {b.h > 30 && <rect x={b.x + b.w * 0.2} y={top - 1.5} width={1.6} height={0.9} fill={S.facadeEdge} />}
          </g>
        );
      })}

      {/* Street surface + vehicles */}
      <rect x={AXIS_X} y={Y_0 - 0.3} width={VB_W - AXIS_X} height={0.6} fill={S.asphalt} />
      <g>
        <rect x={CAR.x0} y={yOf(1.5)} width={CAR.x1 - CAR.x0} height={yOf(0.45) - yOf(1.5)} rx={0.7} fill={S.car} />
        <rect x={CAR.x0 + 1} y={yOf(2.1)} width={CAR.x1 - CAR.x0 - 2.2} height={yOf(1.5) - yOf(2.1)} rx={0.5} fill={S.car} />
        <circle cx={CAR.x0 + 1} cy={Y_0 - 0.9} r={0.75} fill={S.tunnel} />
        <circle cx={CAR.x1 - 1} cy={Y_0 - 0.9} r={0.75} fill={S.tunnel} />
      </g>
      <Tank />
    </g>
  );
}

function Tank() {
  const { x0, x1 } = TANK;
  return (
    <g>
      <rect x={x0} y={yOf(1.1)} width={x1 - x0} height={Y_0 - 0.3 - yOf(1.1)} rx={1.2} fill={S.tankDark} />
      <rect x={x0 + 0.4} y={yOf(1.9)} width={x1 - x0 - 0.8} height={yOf(1.1) - yOf(1.9)} fill={S.tank} />
      <rect x={x0 + 3} y={yOf(2.5)} width={5} height={yOf(1.9) - yOf(2.5)} rx={0.6} fill={S.tank} />
      <rect x={x0 + 8} y={yOf(2.3) - 0.3} width={6} height={0.6} fill={S.tankDark} />
      {[1.4, 3.4, 5.4, 7.4, 9.4].map((d) => (
        <circle key={d} cx={x0 + d} cy={yOf(0.55)} r={0.8} fill={S.tankDark} stroke={S.tank} strokeWidth={0.2} />
      ))}
    </g>
  );
}

/* ── Marks ───────────────────────────────────────────────────────────── */

function ThreatPin({ p, n, hot, onHover }: { p: Pt; n: number; hot: boolean; onHover: (n: number | null) => void }) {
  return (
    <g onMouseEnter={() => onHover(n)} onMouseLeave={() => onHover(null)} style={{ cursor: 'default' }}>
      <circle cx={p.x} cy={p.y} r={2.6} fill="transparent" />
      {hot && <circle cx={p.x} cy={p.y} r={2.6} fill="none" stroke={P.select} strokeWidth={0.45} />}
      <circle cx={p.x} cy={p.y} r={1.75} fill={P.threat} stroke="#FFFFFF" strokeWidth={0.35} />
      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={2.2} fontWeight={800} fill="#FFFFFF" className="font-display" pointerEvents="none">
        {n}
      </text>
    </g>
  );
}

/** Same disc as the drawing — used beside each list item in the scene. */
export function ThreatBadge({ n, hot }: { n: number; hot?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="size-6 shrink-0" aria-hidden>
      {hot && <circle cx={10} cy={10} r={9.3} fill="none" stroke={P.select} strokeWidth={1.4} />}
      <circle cx={10} cy={10} r={7.6} fill={P.threat} />
      <text x={10} y={10.5} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={800} fill="#FFFFFF" className="font-display">
        {n}
      </text>
    </svg>
  );
}

/** Measured tick label, right edge on the axis (works in either direction). */
function AxisLabel({ y, text }: { y: number; text: string }) {
  const ref = useRef<SVGTextElement>(null);
  const [w, setW] = useState(text.length * 1.1);
  useLayoutEffect(() => {
    if (ref.current) setW(ref.current.getComputedTextLength());
  }, [text]);
  return (
    <text ref={ref} x={AXIS_X - 1.4 - w / 2} y={y} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={2.2} fontWeight={700} fill={P.ink} className="font-display">
      {bidiNum(text)}
    </text>
  );
}

function Axis({ ticks }: { ticks: readonly { m: number; label: string }[] }) {
  const brk = (y: number) => `M${AXIS_X - 1.1} ${y + 0.9}L${AXIS_X + 1.1} ${y - 0.1}M${AXIS_X - 1.1} ${y + 1.8}L${AXIS_X + 1.1} ${y + 0.8}`;
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={AXIS_X} height={VB_H} fill="#FFFFFF" />
      {/* The expanded 0–5 m band, marked on the axis itself (scale differs there) */}
      <rect x={AXIS_X - 2.2} y={Y_5} width={2.2} height={Y_0 - Y_5} fill={P.ink} fillOpacity={0.1} />
      <line x1={AXIS_X} y1={1.5} x2={AXIS_X} y2={VB_H - 1.5} stroke={P.ink} strokeWidth={0.3} />
      {ticks.map((t) => (
        <g key={t.m}>
          <line x1={AXIS_X - 0.8} y1={yOf(t.m)} x2={AXIS_X} y2={yOf(t.m)} stroke={P.ink} strokeWidth={0.3} />
          <AxisLabel y={yOf(t.m)} text={t.label} />
        </g>
      ))}
      {/* scale breaks: the street band is drawn at a different scale */}
      {[Y_5 + 1.2, Y_0 + 1.4].map((y) => (
        <g key={y}>
          <rect x={AXIS_X - 1.2} y={y - 0.3} width={2.4} height={2.3} fill="#FFFFFF" />
          <path d={brk(y)} fill="none" stroke={P.ink} strokeWidth={0.28} />
        </g>
      ))}
    </g>
  );
}

/* ── Demos (one per band; mount = play once) ─────────────────────────── */

const RED = P.threat;
/** A charge dropped from the window (above #3) onto the street. */
const DROP_PATH: Pt[] = [THREAT_SPOTS.above[2], { x: 77, y: yOf(10) }, { x: 75.6, y: yOf(2.2) }];

function AboveDemo({ run }: { run: number }) {
  const { t } = useSequence(2.6, true, run);
  const [sn, atgm, , op] = THREAT_SPOTS.above;
  const fan = useTransform(t, [0, 0.6], [0, 0.13]);
  const atgmLen = useTransform(t, [0.5, 1.3], [0, 1], { clamp: true });
  const burst = useTransform(t, [1.3, 1.45, 2.1], [0, 1, 0.55]);
  const g = useMover(t, DROP_PATH, 1.0, 1.8);
  const gOp = useTransform(t, [0.95, 1.0, 1.8, 1.9], [0, 1, 1, 0]);
  const shot = useTransform(t, [1.7, 2.1], [0, 1], { clamp: true });
  return (
    <g pointerEvents="none">
      <motion.path d={`M${op.x - 0.6} ${op.y}L${STREET.x0} ${Y_0 - 0.3}L${STREET.x1 - 0.4} ${Y_0 - 0.3}Z`} fill={RED} style={{ fillOpacity: fan }} />
      <motion.line x1={atgm.x} y1={atgm.y} x2={67} y2={yOf(2.5)} stroke={RED} strokeWidth={0.5} style={{ pathLength: atgmLen }} />
      <motion.circle cx={67} cy={yOf(2.5)} r={1.6} fill="none" stroke={RED} strokeWidth={0.5} style={{ opacity: burst }} />
      <motion.circle r={0.6} fill={RED} style={{ x: g.x, y: g.y, opacity: gOp }} />
      <motion.line x1={sn.x} y1={sn.y} x2={FORCE[0].x} y2={FORCE[0].y} stroke={RED} strokeWidth={0.4} strokeDasharray="1.2 0.8" style={{ opacity: shot }} />
    </g>
  );
}

function StreetDemo({ run }: { run: number }) {
  const { t } = useSequence(2.6, true, run);
  const target = { x: (FORCE[0].x + FORCE[1].x) / 2, y: FORCE[0].y };
  const from = [
    { p: { x: 79.7, y: yOf(25) }, t0: 0.1 }, // from above (window)
    { p: THREAT_SPOTS.street[1], t0: 0.6 }, // from the side (alley)
    { p: { x: 58.8, y: yOf(-6) }, t0: 1.1 }, // from below (shaft)
  ];
  const ring = useTransform(t, [1.7, 2.0, 2.6], [0, 1, 0.8]);
  return (
    <g pointerEvents="none">
      {from.map((f, i) => (
        <Arrow key={i} t={t} a={f.p} b={target} t0={f.t0} />
      ))}
      <motion.circle cx={target.x} cy={target.y} r={5.2} fill="none" stroke={RED} strokeWidth={0.4} strokeDasharray="1 0.7" style={{ opacity: ring }} />
    </g>
  );
}

function Arrow({ t, a, b, t0 }: { t: MotionValue<number>; a: Pt; b: Pt; t0: number }) {
  const len = useTransform(t, [t0, t0 + 0.55], [0, 1], { clamp: true });
  const head = useTransform(t, [t0 + 0.5, t0 + 0.55], [0, 1]);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const end = { x: a.x + ((b.x - a.x) * (L - 2.6)) / L, y: a.y + ((b.y - a.y) * (L - 2.6)) / L };
  return (
    <g>
      <motion.line x1={a.x} y1={a.y} x2={end.x} y2={end.y} stroke={RED} strokeWidth={0.5} style={{ pathLength: len }} />
      <motion.path d="M-1.1 -1.1L0.9 0L-1.1 1.1Z" fill={RED} transform={`translate(${end.x} ${end.y}) rotate(${ang})`} style={{ opacity: head }} />
    </g>
  );
}

const BELOW_ROUTE: Pt[] = [
  { x: 123, y: yOf(-13) },
  { x: 102, y: yOf(-13) },
  { x: 98, y: yOf(-17) },
  { x: 62, y: yOf(-17) },
  { x: 58.8, y: yOf(-12) },
  { x: 48, y: yOf(-12) },
  { x: 48, y: Y_0 - 1.9 },
];

function BelowDemo({ run }: { run: number }) {
  const { t } = useSequence(3.8, true, run);
  const m = useMover(t, BELOW_ROUTE, 0.2, 3.4);
  const pop = useTransform(t, [3.4, 3.55, 3.8], [0, 1, 0.6]);
  return (
    <g pointerEvents="none">
      <motion.path d={dOf(BELOW_ROUTE)} fill="none" stroke={RED} strokeWidth={0.45} strokeOpacity={0.75} strokeLinejoin="round" style={{ pathLength: m.s }} />
      <motion.circle r={0.85} fill={RED} stroke="#FFFFFF" strokeWidth={0.25} style={{ x: m.x, y: m.y }} />
      <motion.circle cx={48} cy={Y_0 - 1.9} r={2.8} fill="none" stroke={RED} strokeWidth={0.45} style={{ opacity: pop }} />
    </g>
  );
}

/* ── Main section ────────────────────────────────────────────────────── */

export type SectionLabels = {
  bands: Record<Dim, string>;
  ground: string;
  sniper: string;
  ied: string;
  tunnels: string;
  ticks: readonly { m: number; label: string }[];
};

/**
 * Interactive section. Clicking a band selects it; clicking the active band
 * again clears it (`onBand(null)`). Band hit areas and threat pins are mouse
 * targets — the scene's tabs and list are the keyboard path.
 */
export function UrbanSection({
  active,
  onBand,
  hover,
  onHover,
  run,
  labels,
}: {
  active: Dim | null;
  onBand: (d: Dim | null) => void;
  hover: number | null;
  onHover: (n: number | null) => void;
  run: number;
  labels: SectionLabels;
}) {
  const id = useSvgId('sect');
  const [peek, setPeek] = useState<Dim | null>(null);
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block w-full h-full select-none" aria-hidden>
      <SectionBase id={id} />

      {/* Inactive bands are washed back so the active one reads first */}
      {active &&
        (Object.keys(BANDS) as Dim[])
          .filter((d) => d !== active)
          .map((d) => (
            <rect key={d} x={AXIS_X} y={BANDS[d].y0} width={VB_W - AXIS_X} height={BANDS[d].y1 - BANDS[d].y0} fill={S.dim} fillOpacity={0.55} pointerEvents="none" />
          ))}
      {peek && peek !== active && (
        <rect x={AXIS_X} y={BANDS[peek].y0} width={VB_W - AXIS_X} height={BANDS[peek].y1 - BANDS[peek].y0} fill={P.select} fillOpacity={0.06} pointerEvents="none" />
      )}

      {/* Band hit areas (mouse) */}
      {(Object.keys(BANDS) as Dim[]).map((d) => (
        <rect
          key={d}
          x={AXIS_X}
          y={BANDS[d].y0}
          width={VB_W - AXIS_X}
          height={BANDS[d].y1 - BANDS[d].y0}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={() => onBand(active === d ? null : d)}
          onMouseEnter={() => setPeek(d)}
          onMouseLeave={() => setPeek(null)}
        />
      ))}

      <g pointerEvents="none">
        {FORCE.map((f, i) => (
          <ForcePuck key={i} x={f.x} y={f.y} r={1.25} />
        ))}
      </g>

      {active === 'above' && <AboveDemo key={`a${run}`} run={run} />}
      {active === 'street' && <StreetDemo key={`s${run}`} run={run} />}
      {active === 'below' && <BelowDemo key={`b${run}`} run={run} />}

      {active &&
        THREAT_SPOTS[active].map((p, i) => <ThreatPin key={`${active}${i}`} p={p} n={i + 1} hot={hover === i + 1} onHover={onHover} />)}

      {/* Labels */}
      <Plate x={147} y={5.5} text={labels.bands.above} tone={active === 'above' ? P.ink : '#8A8873'} />
      <Plate x={140} y={41.2} text={labels.bands.street} tone={active === 'street' ? P.ink : '#8A8873'} />
      <Plate x={128} y={Y_0 + 2.6} text={labels.ground} size={2.1} />
      {active === 'below' ? (
        <Plate x={130} y={80.2} text={labels.tunnels} tone={P.ink} />
      ) : (
        <Plate x={147} y={79.5} text={labels.bands.below} tone={active === null ? P.ink : '#8A8873'} />
      )}
      {active === 'above' && <Plate x={34.5} y={yOf(30) - 5.6} text={labels.sniper} tone={P.threat} />}
      {active === 'street' && <Plate x={75.6} y={yOf(2.2) - 4.4} text={labels.ied} tone={P.threat} />}

      <Axis ticks={labels.ticks} />
    </svg>
  );
}

/* ── "עקרון השילוב" — same model, one combined escape ────────────────── */

const COMBO_Y0 = 22;
const COMBO_ROUTE: Pt[] = [
  { x: 40.5, y: yOf(30) - 1.8 },
  { x: 39.5, y: yOf(28) },
  { x: 39.5, y: yOf(BASEMENT_M) },
  ...toPts([[39.5, -14], [44, -12], [58.8, -12], [62, -17], [98, -17], [102, -13], [128, -13], [136, -20], [153, -20]]),
  { x: 153, y: yOf(BASEMENT_M) },
  { x: 153, y: yOf(36) - 1.8 },
];
const COMBO_T = { shot: 0.7, go: 0.9, arrive: 6.2, breach0: 4.4, breach1: 5.4, end: 6.8 };
/** Our force crosses the street into the sniper's building. */
const COMBO_FORCE: Pt[] = [{ x: 56, y: Y_0 - 1.5 }, { x: 46.5, y: Y_0 - 1.5 }, { x: 43.2, y: Y_0 - 1.5 }];

export function CombineDiagram({ labels }: { labels: { sniper: string; shaft: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [run, setRun] = useState(0);
  const { t } = useSequence(COMBO_T.end, inView, run);
  const id = useSvgId('combo');
  const start = COMBO_ROUTE[0];
  const end = COMBO_ROUTE[COMBO_ROUTE.length - 1];
  // The shot is fired at the force where it stands, then fades once the sniper has gone.
  const shot = useTransform(t, [0, 0.15, COMBO_T.go + 0.6, COMBO_T.go + 1.2], [0, 1, 1, 0]);
  const m = useMover(t, COMBO_ROUTE, COMBO_T.go, COMBO_T.arrive);
  const force = useMover(t, COMBO_FORCE, COMBO_T.breach0, COMBO_T.breach1);
  const empty = useTransform(t, [COMBO_T.breach1, COMBO_T.breach1 + 0.2], [0, 1]);
  const pop = useTransform(t, [COMBO_T.arrive, COMBO_T.arrive + 0.15, COMBO_T.end], [0, 1, 0.7]);
  const b3 = BUILDINGS[2];
  return (
    <div ref={ref} className="relative mt-5 rounded-2xl overflow-hidden border border-border-subtle bg-bg-elevated">
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        aria-label="הפעלה חוזרת של ההדגמה"
        className="motion-reduce:hidden absolute top-2.5 end-2.5 z-10 size-8 rounded-xl border border-border bg-bg-elevated/95 text-fg-muted hover:text-fg hover:border-brand/30 transition-colors inline-flex items-center justify-center"
      >
        <Icon name="refresh" size={15} />
      </button>
      <svg viewBox={`${AXIS_X} ${COMBO_Y0} ${VB_W - AXIS_X} ${VB_H - COMBO_Y0}`} className="block w-full h-auto" aria-hidden>
        <SectionBase id={id} />
        <motion.line x1={start.x} y1={start.y} x2={COMBO_FORCE[0].x} y2={COMBO_FORCE[0].y} stroke={RED} strokeWidth={0.4} strokeDasharray="1.2 0.8" style={{ opacity: shot }} />
        <motion.path d={dOf(COMBO_ROUTE)} fill="none" stroke={RED} strokeWidth={0.5} strokeOpacity={0.8} strokeLinejoin="round" style={{ pathLength: m.s }} />
        <motion.circle r={0.95} fill={RED} stroke="#FFFFFF" strokeWidth={0.3} style={{ x: m.x, y: m.y }} />
        <motion.circle cx={end.x} cy={end.y} r={3} fill="none" stroke={RED} strokeWidth={0.45} style={{ opacity: pop }} />
        {/* The force breaks into the building — empty by then */}
        <motion.rect
          x={b3.x - 0.6}
          y={yOf(b3.h) - 1.2}
          width={b3.w + 1.2}
          height={Y_0 - yOf(b3.h) + 1.2}
          fill="none"
          stroke={P.select}
          strokeWidth={0.4}
          style={{ opacity: empty }}
        />
        <motion.g style={{ x: force.x, y: force.y }}>
          <ForcePuck x={0} y={0} r={1.25} />
        </motion.g>
        <Plate x={start.x - 6} y={start.y - 2.6} text={labels.sniper} tone={P.threat} />
        <Plate x={29} y={yOf(-9)} text={labels.shaft} />
      </svg>
    </div>
  );
}
