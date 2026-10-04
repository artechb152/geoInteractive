'use client';
/**
 * BordersMap — copy-free illustration kit for BordersScene (11.3).
 *
 * One plan-view map frame for all six border types: מדינה א' and מדינה ב'
 * on either side, and the border feature drawn AS the border (it really
 * separates the two). Each type carries two hotspots — חוזק / חולשה — placed
 * where that strength or weakness lives on the ground (a guarded pass, a
 * blown bridge, a port in missile range …). Selecting a hotspot plays its
 * demo once (replay control in the scene); selecting it again, or clicking
 * the empty map, clears it. Under prefers-reduced-motion demos show their
 * end state. Only the active type's hotspots exist, so Tab never reaches
 * hidden ones; the six tabs are the full keyboard path between types.
 *
 * Schematic, not to scale; never mirrored for RTL. Illustration hues
 * (water, sand, enemy brick) live in SVG only; orange marks the selected
 * hotspot and the demo's highlighted route/effect.
 *
 * All Hebrew labels are passed in from BordersScene.tsx (copy stays in one place).
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { animate, motion, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';

export type BorderKind = 'mountain' | 'river' | 'coast' | 'desert' | 'latitude' | 'political';
export type Spot = 'strength' | 'weakness';

export type BordersMapLabels = {
  countryA: string;
  countryB: string;
  mountain: string;
  bridge: string;
  river: string;
  sea: string;
  dunes: string;
  desertSpan: string;
  latLine: string;
  latCut: string;
  pact: string;
  pactYear: string;
  sykes: string;
  paper: string;
  strength: string;
  weakness: string;
};

/* ── Palette (illustration only, inside SVG) ─────────────────────────── */
const INK = '#38432E';
const LAND_A = '#EFE5D2';
const LAND_B = '#DCE1C3';
const PAPER = { cream: '#E8DCC4', rim: '#C9B892', g1: '#8A9163', g2: '#6E7A4E', g3: '#55613C', snow: '#F6F1E6' } as const;
const WATER = '#7FB4C6';
const SEA = '#AFD2DD';
const SEA_INK = '#2F5E70';
const SAND = '#E9D6A8';
const DUNE = '#C9A86A';
const ENEMY = '#9B3F33';
const ROAD = '#F8F2E7';
/** State borders are dash-dot everywhere; plain dashes are reserved for covert / indirect movement. */
const BORDER_DASH = '16 6 4 6';

/* ── Geometry helpers ────────────────────────────────────────────────── */
const W = 1000;
const H = 420;
type P = readonly [number, number];
/** Where the political-agreement stamp sits. */
const STAMP_AT: P = [690, 140];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Local 0…1 progress of a phase [a, b] of the demo timeline. */
const phase = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const textW = (s: string, size: number) => s.length * size * 0.56;

/** Quadratic Bézier sampled into a polyline. */
function bez(a: P, c: P, b: P, n = 28): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

/** First `t` (0…1) of a polyline by length, plus the heading at its end. */
function partial(pts: readonly P[], t: number) {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((s, v) => s + v, 0);
  let left = clamp01(t) * total;
  const out: P[] = [pts[0]];
  let ang = 0;
  for (let i = 0; i < seg.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (left >= seg[i]) {
      out.push(b);
      left -= seg[i];
    } else {
      const f = seg[i] ? left / seg[i] : 0;
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      break;
    }
  }
  return { pts: out, end: out[out.length - 1], ang };
}

const toPath = (pts: readonly P[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

/** Arrow drawn on along `pts` up to `t`; the head rides the tip. */
function Arrow({
  pts,
  t,
  color = ENEMY,
  width = 6,
  dashed = false,
  head = true,
  className,
}: {
  pts: readonly P[];
  t: number;
  color?: string;
  width?: number;
  dashed?: boolean;
  /** false → a plain drawn-on line (borders have no direction). */
  head?: boolean;
  className?: string;
}) {
  if (t <= 0) return null;
  const { pts: shown, end, ang } = partial(pts, t);
  const s = width * 2.1;
  const headPts = [
    [s, 0],
    [-s * 0.6, -s * 0.75],
    [-s * 0.6, s * 0.75],
  ]
    .map(([x, y]) => [end[0] + x * Math.cos(ang) - y * Math.sin(ang), end[1] + x * Math.sin(ang) + y * Math.cos(ang)])
    .map((p) => p.map((v) => v.toFixed(1)).join(','))
    .join(' ');
  const strokeProps = className ? { className } : { stroke: color };
  const fillProps = className ? { className: className.replace(/stroke-/g, 'fill-') } : { fill: color };
  return (
    <g>
      <path d={toPath(shown)} fill="none" {...strokeProps} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${width * 1.6} ${width * 1.4}` : undefined} />
      {head && <polygon points={headPts} {...fillProps} />}
    </g>
  );
}

/** One expanding ring — plays once when `show` turns on (keyed by caller). */
function Pulse({ x, y, show, color, className }: { x: number; y: number; show: boolean; color?: string; className?: string }) {
  const reduce = !!useReducedMotion();
  if (!show || reduce) return null;
  return (
    <motion.circle
      cx={x}
      cy={y}
      fill="none"
      {...(className ? { className } : { stroke: color ?? ENEMY })}
      strokeWidth={3}
      initial={{ r: 8, opacity: 1 }}
      animate={{ r: 34, opacity: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    />
  );
}

/** Thick bar across an axis of advance — "stopped here". */
const Block = ({ x, y, len = 32, o = 1 }: { x: number; y: number; len?: number; o?: number }) => (
  <line x1={x} y1={y - len / 2} x2={x} y2={y + len / 2} stroke={INK} strokeWidth={7} strokeLinecap="round" opacity={o} />
);

function Town({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const blocks: [number, number, number, number][] = [
    [-14, -8, 10, 10],
    [-2, -12, 10, 14],
    [10, -6, 9, 9],
    [-8, 4, 12, 8],
    [6, 5, 9, 8],
  ];
  return (
    <g fill={INK} fillOpacity={0.7}>
      {blocks.map(([dx, dy, w, h], i) => (
        <rect key={i} x={x + dx * s} y={y + dy * s} width={w * s} height={h * s} rx={1.5} />
      ))}
    </g>
  );
}

function Post({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 7} y={y - 7} width={14} height={14} rx={2} fill={PAPER.cream} stroke={INK} strokeWidth={2} />
      <rect x={x - 3} y={y - 3} width={6} height={6} fill={INK} />
    </g>
  );
}

function Peak({ x, y, s = 24, snow = false }: { x: number; y: number; s?: number; snow?: boolean }) {
  return (
    <g>
      <ellipse cx={x + 3} cy={y + s * 0.5} rx={s * 0.95} ry={s * 0.2} fill={INK} fillOpacity={0.12} />
      <polygon points={`${x - s},${y + s * 0.5} ${x},${y - s} ${x},${y + s * 0.5}`} fill={PAPER.g1} />
      <polygon points={`${x},${y - s} ${x + s},${y + s * 0.5} ${x},${y + s * 0.5}`} fill={PAPER.g3} />
      {snow && <polygon points={`${x - s * 0.28},${y - s * 0.44} ${x},${y - s} ${x + s * 0.28},${y - s * 0.44} ${x},${y - s * 0.56}`} fill={PAPER.snow} />}
    </g>
  );
}

function Ship({ x, y, s = 1, fill = INK }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -16 0 L 16 0 L 11 7 L -12 7 Z" fill={fill} />
      <rect x={-5} y={-7} width={10} height={7} rx={1} fill={fill} />
    </g>
  );
}

/** Air approach: a thin solid track with a small aircraft at its tip. */
function AirRoute({ pts, t }: { pts: readonly P[]; t: number }) {
  if (t <= 0) return null;
  const { pts: shown, end, ang } = partial(pts, t);
  return (
    <g>
      <path d={toPath(shown)} fill="none" stroke={ENEMY} strokeWidth={2.5} strokeLinecap="round" />
      <g transform={`translate(${end[0].toFixed(1)} ${end[1].toFixed(1)}) rotate(${((ang * 180) / Math.PI).toFixed(1)})`}>
        <path d="M 12 0 L -10 -2.5 L -10 2.5 Z" fill={ENEMY} />
        <path d="M 3 0 L -4 -11 L -8 -11 L -3 0 L -8 11 L -4 11 Z" fill={ENEMY} />
        <path d="M -8 0 L -12 -5 L -14 -5 L -12 0 L -14 5 L -12 5 Z" fill={ENEMY} />
      </g>
    </g>
  );
}

function Unit({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-13} y={-8} width={26} height={16} rx={3} fill={ENEMY} stroke="#FFFFFF" strokeWidth={1.5} />
      <path d="M -5 -4 L 3 0 L -5 4" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** White pill label — keeps text legible on any fill without stroke halos. */
function Pill({ x, y, text, size = 15, color = INK }: { x: number; y: number; text: string; size?: number; color?: string }) {
  const w = textW(text, size) + 24;
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - size} width={w} height={size * 2} rx={size} fill="#FFFFFF" fillOpacity={0.94} stroke={INK} strokeOpacity={0.15} />
      <text x={x} y={y + size * 0.36} textAnchor="middle" fill={color} className="font-display font-bold" fontSize={size}>
        {text}
      </text>
    </g>
  );
}

/* ── Demo engine ─────────────────────────────────────────────────────── */
function useDemo(key: string | null, run: number, duration: number) {
  const reduce = !!useReducedMotion();
  const [t, setT] = useState(1);
  const ctl = useRef<AnimationPlaybackControls | null>(null);
  useEffect(() => {
    ctl.current?.stop();
    if (!key || reduce) {
      setT(1);
      return;
    }
    setT(0);
    ctl.current = animate(0, 1, { duration, ease: 'linear', onUpdate: setT });
    return () => ctl.current?.stop();
  }, [key, run, reduce, duration]);
  return { t, reduce };
}

/* ── Per-type scenes ─────────────────────────────────────────────────── */
type SpotDef = { kind: Spot; x: number; y: number; demo: (t: number) => ReactNode };
/** base = terrain · labels = names drawn ABOVE the demo layer · spots = hotspots. */
type KindDef = { base: ReactNode; labels: ReactNode; spots: SpotDef[] };

function landSplit(xAt: (y: number) => number) {
  const edge: P[] = [];
  for (let y = 0; y <= H; y += 10) edge.push([xAt(y), y]);
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} fill={LAND_B} />
      <polygon points={[[0, 0] as P, ...edge, [0, H] as P].map((p) => p.join(',')).join(' ')} fill={LAND_A} />
    </g>
  );
}

function countryLabels(L: BordersMapLabels, a: P = [150, 44], b: P = [850, 44]) {
  return (
    <g>
      <text x={a[0]} y={a[1]} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={18}>
        {L.countryA}
      </text>
      <text x={b[0]} y={b[1]} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={18}>
        {L.countryB}
      </text>
    </g>
  );
}

function mountainDef(L: BordersMapLabels): KindDef {
  const PASS = [110, 320];
  const peaks: { x: number; y: number; snow: boolean }[] = [];
  for (let y = 80, r = 0; y <= 400; y += 30, r++) {
    if (PASS.some((p) => Math.abs(y - p) < 22)) continue;
    [452, 500, 548].forEach((x, i) => peaks.push({ x: x + (r % 2 ? 14 : -10), y, snow: (r + i) % 3 === 1 }));
  }
  const aTown: P = [290, 215];
  const bTown: P = [710, 215];
  const viaPass = (py: number): P[] => [
    ...bez(aTown, [380, py], [440, py], 16),
    ...bez([440, py], [500, py], [560, py], 6).slice(1),
    ...bez([560, py], [620, py], bTown, 16).slice(1),
  ];
  const road = (py: number) => (
    <g key={py}>
      <path d={toPath(viaPass(py))} fill="none" stroke={INK} strokeOpacity={0.35} strokeWidth={8} strokeLinecap="round" />
      <path d={toPath(viaPass(py))} fill="none" stroke={ROAD} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
  const threats: P[][] = [bez([70, 80], [250, 70], [416, 106]), bez([70, 215], [270, 200], [416, 316]), bez([70, 350], [250, 360], [416, 324])];
  return {
    base: (
      <g>
        {landSplit(() => 500)}
        {PASS.map(road)}
        {peaks.map((p, i) => (
          <Peak key={i} {...p} />
        ))}
        <Town x={aTown[0]} y={aTown[1]} />
        <Town x={bTown[0]} y={bTown[1]} />
        <Post x={590} y={PASS[0]} />
        <Post x={590} y={PASS[1]} />
      </g>
    ),
    labels: (
      <g>
        {countryLabels(L)}
        <Pill x={500} y={34} text={L.mountain} />
      </g>
    ),
    spots: [
      {
        kind: 'strength',
        x: 500,
        y: PASS[0],
        demo: (t) => (
          <g>
            {threats.map((pts, i) => (
              <Arrow key={i} pts={pts} t={phase(t, i * 0.08, 0.7 + i * 0.08)} />
            ))}
            <Block x={432} y={PASS[0]} o={phase(t, 0.8, 0.9)} />
            <Block x={432} y={PASS[1]} o={phase(t, 0.8, 0.9)} />
            <Pulse x={590} y={PASS[0]} show={t >= 0.8} className="stroke-accent" />
            <Pulse x={590} y={PASS[1]} show={t >= 0.8} className="stroke-accent" />
          </g>
        ),
      },
      {
        kind: 'weakness',
        x: 500,
        y: 215,
        demo: (t) => (
          <g>
            <Arrow pts={[aTown, [398, 215]]} t={phase(t, 0, 0.35)} color={INK} width={3} dashed />
            {t >= 0.38 && (
              <g stroke={ENEMY} strokeWidth={5} strokeLinecap="round" opacity={phase(t, 0.38, 0.45)}>
                <line x1={402} y1={203} x2={426} y2={227} />
                <line x1={426} y1={203} x2={402} y2={227} />
              </g>
            )}
            <Arrow pts={viaPass(PASS[0])} t={phase(t, 0.45, 1)} width={4} className="stroke-accent" />
          </g>
        ),
      },
    ],
  };
}

function riverDef(L: BordersMapLabels): KindDef {
  const xr = (y: number) => 500 + 26 * Math.sin(y * 0.018);
  const half = (y: number) => 18 - 11 * Math.exp(-(((y - 340) / 26) ** 2));
  const left: P[] = [];
  const right: P[] = [];
  for (let y = 0; y <= H; y += 6) {
    left.push([xr(y) - half(y), y]);
    right.push([xr(y) + half(y), y]);
  }
  const water = [...left, ...right.reverse()].map((p) => p.join(',')).join(' ');
  const by = 200;
  const bx = xr(by);
  const fy = 340;
  const fx = xr(fy);
  return {
    base: (
      <g>
        {landSplit(xr)}
        <path d={`M 40 ${by} L ${bx - 30} ${by} M ${bx + 30} ${by} L 960 ${by}`} stroke={INK} strokeOpacity={0.35} strokeWidth={9} strokeLinecap="round" />
        <path d={`M 40 ${by} L ${bx - 30} ${by} M ${bx + 30} ${by} L 960 ${by}`} stroke={ROAD} strokeWidth={6} strokeLinecap="round" />
        <polygon points={water} fill={WATER} />
        <ellipse cx={fx - 10} cy={fy - 12} rx={12} ry={5} fill={SAND} />
        <ellipse cx={fx + 8} cy={fy + 14} rx={14} ry={5} fill={SAND} />
        <rect x={bx - 32} y={by - 7} width={64} height={14} rx={2} fill={PAPER.cream} stroke={INK} strokeWidth={2} />
      </g>
    ),
    labels: (
      <g>
        {countryLabels(L)}
        <Pill x={xr(70) + 48} y={70} text={L.river} />
        <Pill x={bx} y={by - 32} text={L.bridge} />
      </g>
    ),
    spots: [
      {
        kind: 'strength',
        x: bx,
        y: by + 46,
        demo: (t) => (
          <g>
            <Arrow pts={[[90, by], [bx - 46, by]]} t={phase(t, 0, 0.6)} />
            {t >= 0.62 && (
              <g opacity={phase(t, 0.62, 0.7)}>
                <rect x={bx - 14} y={by - 10} width={28} height={20} fill={WATER} />
                <line x1={bx - 14} y1={by - 7} x2={bx - 14} y2={by + 7} stroke={INK} strokeWidth={2} />
                <line x1={bx + 14} y1={by - 7} x2={bx + 14} y2={by + 7} stroke={INK} strokeWidth={2} />
                {[-16, 14, -4].map((d, i) => (
                  <rect key={i} x={bx + d} y={by + 10 + i * 4} width={5} height={4} fill={INK} opacity={0.6} transform={`rotate(${20 * (i - 1)} ${bx + d} ${by + 12})`} />
                ))}
              </g>
            )}
            <Block x={bx - 44} y={by} o={phase(t, 0.7, 0.8)} />
            <Pulse x={bx} y={by} show={t >= 0.62} className="stroke-accent" />
          </g>
        ),
      },
      {
        kind: 'weakness',
        x: fx,
        y: fy + 44,
        demo: (t) => (
          <g>
            <Arrow pts={[[90, fy], [fx, fy], [650, fy]]} t={phase(t, 0, 0.62)} />
            <Arrow pts={bez([650, fy], [740, fy - 20], [860, 270])} t={phase(t, 0.62, 1)} width={5} />
            <Arrow pts={bez([650, fy], [740, fy + 10], [860, 396])} t={phase(t, 0.66, 1)} width={5} />
            <Pulse x={fx} y={fy} show={t >= 0.3} className="stroke-accent" />
          </g>
        ),
      },
    ],
  };
}

function coastDef(L: BordersMapLabels): KindDef {
  const ca = (y: number) => 220 + 14 * Math.sin(y * 0.03);
  const cb = (y: number) => 740 + 16 * Math.sin(y * 0.025 + 1);
  const edge = (f: (y: number) => number) => {
    const pts: P[] = [];
    for (let y = 0; y <= H; y += 10) pts.push([f(y), y]);
    return pts;
  };
  const landA = [[0, 0] as P, ...edge(ca), [0, H] as P].map((p) => p.join(',')).join(' ');
  const landB = [[W, 0] as P, ...edge(cb), [W, H] as P].map((p) => p.join(',')).join(' ');
  const beach = edge(cb).filter(([, y]) => y >= 110 && y <= 200);
  const port: P = [cb(300) + 24, 300];
  const ships: { from: P; to: P }[] = [0, 1, 2, 3].map((i) => ({ from: [ca(110 + i * 40) + 30, 110 + i * 40], to: [cb(130 + i * 22) - 26, 130 + i * 22] }));
  const warship: P = [560, 320];
  return {
    base: (
      <g>
        <rect x={0} y={0} width={W} height={H} fill={SEA} />
        {Array.from({ length: 14 }, (_, i) => [300 + (i % 4) * 110 + (i % 2) * 40, 60 + Math.floor(i / 4) * 92 + (i % 3) * 12] as P).map(([x, y], i) => (
          <path key={i} d={`M ${x} ${y} q 8 -6 16 0 t 16 0`} fill="none" stroke={WATER} strokeWidth={2} />
        ))}
        <polygon points={landA} fill={LAND_A} />
        <polygon points={landB} fill={LAND_B} />
        <polyline points={beach.map((p) => `${p[0] + 4},${p[1]}`).join(' ')} fill="none" stroke={SAND} strokeWidth={10} strokeLinecap="round" />
        <Town x={port[0] + 18} y={port[1]} />
        <path d={`M ${port[0] - 6} ${port[1] - 10} L ${port[0] - 30} ${port[1] - 10} M ${port[0] - 6} ${port[1] + 10} L ${port[0] - 30} ${port[1] + 10}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </g>
    ),
    labels: (
      <g>
        {countryLabels(L, [110, 44], [880, 44])}
        <text x={480} y={398} textAnchor="middle" fill={SEA_INK} className="font-display font-bold" fontSize={16}>
          {L.sea}
        </text>
      </g>
    ),
    spots: [
      {
        kind: 'strength',
        x: 820,
        y: 150,
        demo: (t) => (
          <g>
            <AirRoute pts={bez([150, 330], [450, 20], [790, 120])} t={phase(t, 0.2, 0.9)} />
            {ships.map((s, i) => {
              const k = phase(t, i * 0.06, 0.8 + i * 0.05);
              const x = s.from[0] + (s.to[0] - s.from[0]) * k;
              const y = s.from[1] + (s.to[1] - s.from[1]) * k;
              return (
                <g key={i}>
                  <line x1={s.from[0]} y1={s.from[1] + 4} x2={x} y2={y + 4} stroke={ENEMY} strokeWidth={2} opacity={0.55} />
                  <Ship x={x} y={y} fill={ENEMY} />
                </g>
              );
            })}
          </g>
        ),
      },
      {
        kind: 'weakness',
        x: 900,
        y: 300,
        demo: (t) => (
          <g>
            <g opacity={phase(t, 0, 0.15)}>
              <Ship x={warship[0]} y={warship[1]} s={1.2} fill={ENEMY} />
            </g>
            <Arrow pts={bez([warship[0], warship[1] - 10], [660, 200], [port[0] + 10, port[1] - 4])} t={phase(t, 0.2, 0.8)} width={3} dashed />
            <Pulse x={port[0] + 18} y={port[1]} show={t >= 0.8} className="stroke-accent" />
          </g>
        ),
      },
    ],
  };
}

function desertDef(L: BordersMapLabels): KindDef {
  const dunes: P[] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) dunes.push([330 + c * 80 + (r % 2) * 36, 90 + r * 62]);
  const post: P = [735, 215];
  const patrol: P[] = [[728, 120], [728, 330]];
  const paths: P[][] = [bez([300, 140], [520, 120], [720, 166]), bez([300, 250], [520, 280], [720, 272]), bez([300, 320], [520, 360], [720, 384])];
  return {
    base: (
      <g>
        <rect x={0} y={0} width={W} height={H} fill={LAND_B} />
        <rect x={0} y={0} width={500} height={H} fill={LAND_A} />
        <path d={`M 300 0 C 280 140, 320 280, 300 ${H} L 700 ${H} C 720 280, 680 140, 700 0 Z`} fill={SAND} />
        {dunes.map(([x, y], i) => (
          <path key={i} d={`M ${x - 22} ${y + 6} Q ${x} ${y - 12} ${x + 22} ${y + 6}`} fill="none" stroke={DUNE} strokeWidth={2.5} strokeLinecap="round" />
        ))}
        <line x1={500} y1={0} x2={500} y2={H} stroke={INK} strokeWidth={2.5} strokeDasharray={BORDER_DASH} />
        <Post x={post[0]} y={post[1]} />
        {patrol.map(([x, y]) => (
          <Post key={y} x={x} y={y} />
        ))}
      </g>
    ),
    labels: (
      <g>
        {countryLabels(L)}
        <Pill x={500} y={70} text={L.dunes} />
        <g stroke={INK} strokeWidth={2} strokeOpacity={0.6}>
          <line x1={312} y1={392} x2={688} y2={392} />
          <polyline points="322,385 312,392 322,399" fill="none" />
          <polyline points="678,385 688,392 678,399" fill="none" />
        </g>
        <Pill x={500} y={392} text={L.desertSpan} size={14} />
      </g>
    ),
    spots: [
      {
        kind: 'strength',
        x: 812,
        y: 215,
        demo: (t) => {
          const k = phase(t, 0, 0.8);
          const head = 90 + 240 * k;
          return (
            <g>
              {[0, 1, 2].map((i) => {
                const x = head - i * 36;
                if (x < 70) return null;
                return (
                  <g key={i}>
                    {[1, 2, 3].map((j) => (
                      <circle key={j} cx={x - 14 - j * 12} cy={215 - 6 - j * 4} r={6 + j * 4} fill={DUNE} opacity={0.32 - j * 0.07} />
                    ))}
                    <Unit x={x} y={215} />
                  </g>
                );
              })}
              {t >= 0.35 && (
                <line x1={post[0] - 10} y1={post[1]} x2={head + 14} y2={215} className="stroke-accent" strokeWidth={2.5} strokeDasharray="8 6" opacity={phase(t, 0.35, 0.45)} />
              )}
              <Pulse x={head} y={215} show={t >= 0.4} className="stroke-accent" />
            </g>
          );
        },
      },
      {
        kind: 'weakness',
        x: 500,
        y: 170,
        demo: (t) => (
          <g>
            {paths.map((pts, i) => (
              <Arrow key={i} pts={pts} t={phase(t, i * 0.12, 0.75 + i * 0.08)} width={3} dashed />
            ))}
          </g>
        ),
      },
    ],
  };
}

function latitudeDef(L: BordersMapLabels): KindDef {
  const LY = 210;
  const villages = [200, 560, 790];
  const house = (x: number, y: number, i: number) => <rect key={i} x={x} y={y} width={11} height={11} rx={1.5} fill={INK} fillOpacity={0.7} />;
  const river = bez([680, 0], [560, 210], [760, H]);
  return {
    base: (
      <g>
        <rect x={0} y={0} width={W} height={LY} fill={LAND_A} />
        <rect x={0} y={LY} width={W} height={H - LY} fill={LAND_B} />
        {[90, 62, 34].map((rx, i) => (
          <ellipse key={rx} cx={420} cy={LY} rx={rx} ry={[56, 38, 20][i]} fill="none" stroke={PAPER.g2} strokeWidth={2} strokeOpacity={0.7} />
        ))}
        <path d={toPath(river)} fill="none" stroke={WATER} strokeWidth={10} strokeLinecap="round" />
        {villages.map((vx) => (
          <g key={vx}>
            {[
              [-20, -26],
              [-4, -34],
              [10, -22],
              [-14, 8],
              [2, 16],
              [16, 6],
            ].map(([dx, dy], i) => house(vx + dx, LY + dy, i))}
          </g>
        ))}
        <line x1={20} y1={LY} x2={980} y2={LY} stroke={INK} strokeWidth={3} strokeDasharray={BORDER_DASH} />
      </g>
    ),
    labels: (
      <g>
        {countryLabels(L, [110, 44], [110, 398])}
        <Pill x={420} y={150} text={L.latLine} />
        <Pill x={790} y={256} text={L.latCut} />
      </g>
    ),
    spots: [
      {
        kind: 'strength',
        x: 80,
        y: 250,
        demo: (t) => (
          <g>
            <g opacity={phase(t, 0, 0.12)}>
              <rect x={20} y={LY - 12} width={960} height={9} rx={2} fill={PAPER.cream} stroke={INK} strokeWidth={1.2} />
              {Array.from({ length: 48 }, (_, i) => (
                <line key={i} x1={30 + i * 20} y1={LY - 12} x2={30 + i * 20} y2={LY - (i % 5 ? 8 : 5)} stroke={INK} strokeWidth={1} />
              ))}
            </g>
            <Arrow pts={[[20, LY], [980, LY]]} t={phase(t, 0.15, 0.95)} width={4} head={false} className="stroke-accent" />
          </g>
        ),
      },
      {
        kind: 'weakness',
        x: 200,
        y: 284,
        demo: (t) => (
          <g>
            {villages.flatMap((vx, i) => [
              <Arrow key={`d${vx}`} pts={[[vx - 10, LY - 36], [vx - 10, LY + 30]]} t={phase(t, i * 0.15, 0.45 + i * 0.15)} width={3} color={INK} />,
              <Arrow key={`u${vx}`} pts={[[vx + 12, LY + 36], [vx + 12, LY - 30]]} t={phase(t, 0.1 + i * 0.15, 0.55 + i * 0.15)} width={3} color={INK} />,
            ])}
            {villages.map((vx) => (
              <Pulse key={vx} x={vx} y={LY} show={t >= 0.9} className="stroke-accent" />
            ))}
          </g>
        ),
      },
    ],
  };
}

function politicalDef(L: BordersMapLabels): KindDef {
  const zig: P[] = [
    [480, 20],
    [530, 90],
    [470, 160],
    [540, 230],
    [480, 300],
    [520, 400],
  ];
  const xAt = (y: number) => {
    for (let i = 0; i < zig.length - 1; i++) {
      const [x0, y0] = zig[i];
      const [x1, y1] = zig[i + 1];
      if (y >= y0 && y <= y1) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    }
    return y < zig[0][1] ? zig[0][0] : zig[zig.length - 1][0];
  };
  // The stamp itself is drawn by BordersMap (PoliticalStamp) so the demos can press / crack it.
  const stamp = STAMP_AT;
  return {
    base: (
      <g>
        {landSplit(xAt)}
        <path d={toPath(zig)} fill="none" stroke={INK} strokeWidth={3} strokeDasharray={BORDER_DASH} />
      </g>
    ),
    labels: (
      <g>
        {countryLabels(L)}
        <Pill x={610} y={34} text={L.sykes} />
        <Pill x={300} y={392} text={L.paper} size={14} />
      </g>
    ),
    spots: [
      {
        kind: 'strength',
        x: stamp[0],
        y: stamp[1] + 64,
        demo: (t) => (
          <g>
            <Arrow pts={zig} t={phase(t, 0.4, 1)} width={4} head={false} className="stroke-accent" />
          </g>
        ),
      },
      {
        kind: 'weakness',
        x: 390,
        y: 300,
        demo: (t) => (
          <g>
            {t >= 0.1 && <path d={`M ${stamp[0] - 30} ${stamp[1] - 26} L ${stamp[0] - 4} ${stamp[1] + 2} L ${stamp[0] + 6} ${stamp[1] - 8} L ${stamp[0] + 30} ${stamp[1] + 26}`} fill="none" stroke={ENEMY} strokeWidth={3} strokeLinecap="round" opacity={phase(t, 0.1, 0.25)} />}
            <Arrow pts={bez([290, 110], [460, 100], [622, 108])} t={phase(t, 0.3, 0.7)} />
            <Arrow pts={bez([720, 250], [540, 260], [360, 248])} t={phase(t, 0.42, 0.82)} />
            <Arrow pts={bez([290, 350], [470, 340], [660, 352])} t={phase(t, 0.54, 0.94)} />
          </g>
        ),
      },
    ],
  };
}

const DEFS: Record<BorderKind, (L: BordersMapLabels) => KindDef> = {
  mountain: mountainDef,
  river: riverDef,
  coast: coastDef,
  desert: desertDef,
  latitude: latitudeDef,
  political: politicalDef,
};

/* ── Hotspot tag ─────────────────────────────────────────────────────── */
function SpotTag({
  x,
  y,
  label,
  selected,
  describedBy,
  onToggle,
}: {
  x: number;
  y: number;
  label: string;
  selected: boolean;
  describedBy?: string;
  onToggle: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const size = 15;
  const w = textW(label, size) + 40;
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={onKey}
      onFocus={(e) => setFocused(e.currentTarget.matches(':focus-visible'))}
      onBlur={() => setFocused(false)}
      className="cursor-pointer outline-none"
    >
      {focused && <rect x={x - w / 2 - 5} y={y - 20} width={w + 10} height={40} rx={20} fill="none" className="stroke-accent" strokeWidth={2.5} strokeOpacity={0.6} />}
      <rect
        x={x - w / 2}
        y={y - 15}
        width={w}
        height={30}
        rx={15}
        className={selected ? 'fill-accent' : 'fill-bg-elevated'}
        stroke={selected ? 'none' : INK}
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      <circle cx={x + w / 2 - 14} cy={y} r={4} className={selected ? 'fill-bg-elevated' : 'fill-accent'} />
      <text x={x - 6} y={y + 5.5} textAnchor="middle" className={selected ? 'fill-bg-elevated font-display font-bold' : 'fill-fg font-display font-bold'} fontSize={size}>
        {label}
      </text>
    </g>
  );
}

/* ── Map ─────────────────────────────────────────────────────────────── */
export function BordersMap({
  kind,
  spot,
  onSpot,
  run,
  labels,
  ariaLabel,
  describedBy,
}: {
  kind: BorderKind;
  spot: Spot | null;
  onSpot: (s: Spot | null) => void;
  run: number;
  labels: BordersMapLabels;
  ariaLabel: string;
  /** Ids of the חוזק / חולשה paragraphs, read out with each hotspot. */
  describedBy: Record<Spot, string>;
}) {
  const def = DEFS[kind](labels);
  const { t } = useDemo(spot ? `${kind}:${spot}` : null, run, 3.2);
  const active = def.spots.find((s) => s.kind === spot);

  // Political: the stamp is pressed (strength) or cracked/faded (weakness).
  let stamp: ReactNode = null;
  if (kind === 'political') {
    const s = spot === 'strength' ? 1 + 0.5 * (1 - phase(t, 0, 0.35)) : 1;
    const o = spot === 'weakness' ? 1 - 0.7 * phase(t, 0, 0.3) : spot === 'strength' ? phase(t, 0, 0.2) : 1;
    stamp = <PoliticalStamp labels={labels} s={s} o={o} />;
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-bg-accent">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="group" aria-label={ariaLabel}>
        {/* Background click clears the hotspot */}
        <g onClick={() => onSpot(null)}>{def.base}</g>
        {stamp}
        <g pointerEvents="none">{active && active.demo(t)}</g>
        <g pointerEvents="none">{def.labels}</g>
        {def.spots.map((s) => (
          <SpotTag
            key={s.kind}
            x={s.x}
            y={s.y}
            label={s.kind === 'strength' ? labels.strength : labels.weakness}
            selected={spot === s.kind}
            describedBy={describedBy[s.kind]}
            onToggle={() => onSpot(spot === s.kind ? null : s.kind)}
          />
        ))}
      </svg>
    </div>
  );
}

function PoliticalStamp({ labels, s, o }: { labels: BordersMapLabels; s: number; o: number }) {
  const [x, y] = STAMP_AT;
  return (
    <g pointerEvents="none" opacity={o} transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r={36} fill="#FFFFFF" fillOpacity={0.7} stroke={INK} strokeWidth={2.5} />
      <circle r={30} fill="none" stroke={INK} strokeWidth={1} />
      <text x={0} y={-2} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={15}>
        {labels.pact}
      </text>
      <text x={0} y={17} textAnchor="middle" fill={INK} className="font-display font-bold tabular-nums" fontSize={14}>
        {labels.pactYear}
      </text>
    </g>
  );
}
