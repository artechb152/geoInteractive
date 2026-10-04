'use client';
/**
 * DepthVisuals — copy-free illustration kit for DepthScene (11.1).
 *
 * One log scale (10–4,500 km) drives everything that shows depth:
 *   - DepthScale — the slider, unrolled left→right like any instrument
 *     scale (never mirrored for RTL); ticks sit at their true positions.
 *   - DepthCrossSection — side cut from enemy land (left) across the border
 *     to the heartland, placed at its true log position, over a depth axis
 *     with the same ticks and the four doctrine zones.
 *   - depthToFrac — shared with the comparison ruler in DepthScene.
 *
 * The attack demo plays once per selection (the scene debounces it) and on
 * the replay control, only while the board is on screen. Under
 * prefers-reduced-motion it shows the end state.
 *
 * All Hebrew labels are passed in from DepthScene.tsx (copy stays in one place).
 */
import { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'framer-motion';
import { cn } from '@/lib/utils';

/* ── Scale ───────────────────────────────────────────────────────────── */
export const DEPTH_MIN = 10;
export const DEPTH_MAX = 4500;
/** Doctrine zone edges (km) — the same thresholds DepthScene uses. */
export const ZONE_BREAKS = [30, 200, 1000] as const;

const LOG_SPAN = Math.log(DEPTH_MAX / DEPTH_MIN);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 0…1 position of `km` on the shared log scale. */
export function depthToFrac(km: number) {
  return clamp(Math.log(km / DEPTH_MIN) / LOG_SPAN, 0, 1);
}

/** Readable step at a given depth: 1 km below 100, 10 km below 1,000, then 50. */
const stepAt = (km: number) => (km < 100 ? 1 : km < 1000 ? 10 : 50);

/** Inverse of depthToFrac, rounded to a readable step. */
export function fracToDepth(f: number) {
  const km = DEPTH_MIN * Math.exp(clamp(f, 0, 1) * LOG_SPAN);
  const step = stepAt(km);
  return clamp(Math.round(km / step) * step, DEPTH_MIN, DEPTH_MAX);
}

/* ── Palette (illustration only, inside SVG) ─────────────────────────── */
const INK = '#38432E';
const PAPER = { cream: '#E8DCC4', rim: '#C9B892', g1: '#8A9163', g2: '#6E7A4E', g3: '#55613C' } as const;
/** Enemy land / advance — brick reds, kept well away from the UI orange. */
const ENEMY = { wash: '#EAD5CB', ground: '#B4806C', face: '#D9BCAD', arrow: '#9B3F33', ink: '#8A3A2E' } as const;

/* ── Demo engine ─────────────────────────────────────────────────────── */
/**
 * Progress 0→1 of the attack demo. Plays once per `run` value, as soon as
 * the board is on screen; stays at 1 (end state) otherwise and under
 * reduced motion. `hit` bumps when the advance reaches the heartland.
 */
function useDemo(run: number, duration: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = !!useReducedMotion();
  const [p, setP] = useState(1);
  const [hit, setHit] = useState(0);
  const played = useRef<number | null>(null);
  const ctl = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    if (reduce) {
      ctl.current?.stop();
      played.current = run;
      setP(1);
      return;
    }
    if (!inView || played.current === run) return;
    played.current = run;
    ctl.current?.stop();
    setP(0);
    ctl.current = animate(0, 1, {
      duration,
      ease: [0.45, 0, 0.3, 1],
      onUpdate: setP,
      onComplete: () => setHit((h) => h + 1),
    });
  }, [run, inView, reduce, duration]);

  useEffect(() => () => ctl.current?.stop(), []);
  return { ref, p, hit, reduce };
}

/* ── Cross-section ───────────────────────────────────────────────────── */
const W = 560;
const H = 292;
const BORDER_X = 84;
/** Depth axis: 10 km … 4,500 km. Zero has no place on a log axis, so the
 *  border sits one step before the 10 km tick (schematic, documented). */
const AX0 = 98;
const AX1 = 540;
const SLAB_BOTTOM = 192;
const AXIS_Y = 222;
const LANE_Y = 104;
const FONT = 14;

const kmToX = (km: number) => AX0 + depthToFrac(km) * (AX1 - AX0);

/** Ground profile — calm on the enemy side, rolling hills on ours. */
function groundY(x: number) {
  const amp = x < BORDER_X ? 0.25 : 1;
  return 166 - amp * (7 * Math.sin(x * 0.034 + 0.6) + 5 * Math.sin(x * 0.083 + 1.3));
}

function profile(x0: number, x1: number, dy = 0) {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 4) pts.push(`${x},${(groundY(x) + dy).toFixed(1)}`);
  pts.push(`${x1},${(groundY(x1) + dy).toFixed(1)}`);
  return pts;
}

/** Papercut slab between x0 and x1: grass/top layer over a cut face. */
function Slab({ x0, x1, top, face }: { x0: number; x1: number; top: string; face: string }) {
  const surface = profile(x0, x1);
  const under = profile(x0, x1, 7).reverse();
  return (
    <g>
      <polygon points={[...surface, `${x1},${SLAB_BOTTOM}`, `${x0},${SLAB_BOTTOM}`].join(' ')} fill={face} />
      <line x1={x0} y1={180} x2={x1} y2={180} stroke={PAPER.cream} strokeWidth={1} opacity={0.7} />
      <line x1={x0} y1={186} x2={x1} y2={186} stroke={PAPER.cream} strokeWidth={1} opacity={0.5} />
      <polygon points={[...surface, ...under].join(' ')} fill={top} />
      <polyline points={surface.join(' ')} fill="none" stroke={PAPER.cream} strokeWidth={1.2} opacity={0.8} />
    </g>
  );
}

function Tree({ x }: { x: number }) {
  const y = groundY(x);
  return (
    <g>
      <rect x={x - 0.8} y={y - 6} width={1.6} height={6} fill={PAPER.g3} />
      <circle cx={x} cy={y - 9} r={5} fill={PAPER.g2} />
      <circle cx={x + 1.6} cy={y - 11} r={3.2} fill={PAPER.g1} />
    </g>
  );
}

function Town({ x, big = false }: { x: number; big?: boolean }) {
  const y = groundY(x) + 1;
  const s = big ? 2 : 1;
  const blocks = [
    { dx: -6, w: 4, h: 7 },
    { dx: -2, w: 4.5, h: 11 },
    { dx: 2.5, w: 4, h: 6 },
  ];
  return (
    <g fill={big ? INK : '#7C7A66'}>
      {blocks.map((b, i) => (
        <rect key={i} x={x + b.dx * s} y={y - b.h * s} width={b.w * s} height={b.h * s} rx={0.6} />
      ))}
      {big && <path d={`M ${x - 1.5} ${y - 11 * s} a 3.6 3.6 0 0 1 7.2 0 Z`} transform={`translate(${-2 * s + 1.5} 0)`} />}
    </g>
  );
}

/** Text width estimate for centring/clamping SVG labels (Rubik bold ≈ 0.56em). */
const textW = (s: string, size = FONT) => s.length * size * 0.56;

export type CrossSectionLabels = {
  enemy: string;
  border: string;
  heart: string;
  attack: string;
  alert: string;
  depth: string;
};

export function DepthCrossSection({
  depth,
  days,
  zone,
  zoneTitles,
  showAlert,
  labels,
  formatTime,
  run,
  ariaLabel,
}: {
  depth: number;
  /** Days for the advance to reach the heartland (same formula as the tile). */
  days: number;
  /** Active doctrine zone 0…3. */
  zone: number;
  zoneTitles: readonly string[];
  showAlert: boolean;
  labels: CrossSectionLabels;
  formatTime: (days: number) => string;
  run: number;
  ariaLabel: string;
}) {
  const { ref, p, hit, reduce } = useDemo(run, 2.6);

  const capX = kmToX(depth);
  const capY = groundY(capX);
  const span = capX - BORDER_X;
  const towns = span > 120 ? [0.3, 0.6, 0.85].map((f) => BORDER_X + span * f) : [];
  const trees = [126, 168, 212, 256, 298, 342, 386, 428, 472, 514].filter(
    (x) => Math.abs(x - capX) > 18 && towns.every((t) => Math.abs(x - t) > 12),
  );

  // Advance: tail fixed in enemy land, tip runs from the border to the heartland.
  const tipEnd = Math.max(BORDER_X + 6, capX - 12);
  const tip = BORDER_X + 6 + (tipEnd - BORDER_X - 6) * p;
  const tail = 22;
  const arrow = [
    `${tail},${LANE_Y - 4}`,
    `${tip - 12},${LANE_Y - 4}`,
    `${tip - 12},${LANE_Y - 10}`,
    `${tip},${LANE_Y}`,
    `${tip - 12},${LANE_Y + 10}`,
    `${tip - 12},${LANE_Y + 4}`,
    `${tail},${LANE_Y + 4}`,
  ].join(' ');

  const time = formatTime(days * p);
  const chipW = textW(time) + 20;
  // Rides above the tip, but never over the border post (short depths).
  const chipX = clamp(tip - 6, BORDER_X + chipW / 2 + 12, W - chipW / 2 - 4);

  const heartW = textW(labels.heart);
  const heartX = clamp(capX, heartW / 2 + 4, W - heartW / 2 - 4);
  const depthW = textW(labels.depth);
  const depthX = clamp((BORDER_X + capX) / 2, depthW / 2 + 4, W - depthW / 2 - 4);

  const edges = [BORDER_X, ...ZONE_BREAKS.map(kmToX), AX1];
  const zoneOpacity = [0.16, 0.28, 0.4, 0.52];

  return (
    <div ref={ref} className="relative w-full h-full min-h-[240px] rounded-xl overflow-hidden bg-bg-accent">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full" role="img" aria-label={ariaLabel}>
        {/* Enemy land wash */}
        <rect x={0} y={0} width={BORDER_X} height={SLAB_BOTTOM} fill={ENEMY.wash} opacity={0.6} />
        <text x={BORDER_X / 2} y={28} textAnchor="middle" fill={ENEMY.ink} className="font-display font-bold" fontSize={FONT}>
          {labels.enemy}
        </text>

        {showAlert && (
          <text x={(BORDER_X + W) / 2} y={28} textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize={15}>
            {labels.alert}
          </text>
        )}

        {/* Back ridge, then the two slabs */}
        <polygon
          points={[...profile(BORDER_X, W, -14).map((pt) => {
            const [x, y] = pt.split(',').map(Number);
            return `${x},${(y - 8 * Math.sin(x * 0.021 + 2)).toFixed(1)}`;
          }), `${W},${SLAB_BOTTOM}`, `${BORDER_X},${SLAB_BOTTOM}`].join(' ')}
          fill={PAPER.g1}
          opacity={0.45}
        />
        <Slab x0={0} x1={BORDER_X} top={ENEMY.ground} face={ENEMY.face} />
        <Slab x0={BORDER_X} x1={W} top={PAPER.g2} face={PAPER.rim} />
        <line x1={0} y1={SLAB_BOTTOM} x2={W} y2={SLAB_BOTTOM} stroke={INK} strokeOpacity={0.18} strokeWidth={1} />

        {trees.map((x) => (
          <Tree key={x} x={x} />
        ))}
        {towns.map((x) => (
          <Town key={x} x={x} />
        ))}

        {/* Heartland */}
        <Town x={capX} big />
        {hit > 0 && !reduce && (
          <motion.circle
            key={hit}
            cx={capX}
            cy={capY - 8}
            fill="none"
            stroke={ENEMY.arrow}
            strokeWidth={2}
            initial={{ r: 10, opacity: 0.9 }}
            animate={{ r: 30, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
        <text x={heartX} y={capY - 33} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={FONT}>
          {labels.heart}
        </text>

        {/* Border post */}
        <line x1={BORDER_X} y1={58} x2={BORDER_X} y2={groundY(BORDER_X) + 2} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <rect x={BORDER_X - 7} y={60} width={14} height={8} rx={1.5} fill={PAPER.cream} stroke={INK} strokeWidth={1.2} />
        <line x1={BORDER_X - 3} y1={60} x2={BORDER_X + 1} y2={68} stroke={INK} strokeWidth={1.2} />
        <text x={BORDER_X} y={50} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={FONT}>
          {labels.border}
        </text>

        {/* Advance arrow + elapsed time */}
        <polygon points={arrow} fill={ENEMY.arrow} stroke="#F6EFE6" strokeWidth={1.2} strokeLinejoin="round" />
        <text x={46} y={132} textAnchor="middle" fill={ENEMY.ink} className="font-display font-bold" fontSize={FONT}>
          {labels.attack}
        </text>
        <g>
          <rect x={chipX - chipW / 2} y={64} width={chipW} height={24} rx={12} fill="#FFFFFF" stroke={INK} strokeOpacity={0.2} />
          <text x={chipX} y={81} textAnchor="middle" fill={INK} className="font-display font-bold tabular-nums" fontSize={FONT}>
            {time}
          </text>
        </g>

        {/* Depth axis — same log scale as the slider */}
        <line x1={BORDER_X} y1={AXIS_Y} x2={AX1} y2={AXIS_Y} stroke={INK} strokeOpacity={0.35} strokeWidth={1.5} />
        {[10, 100, 1000, 4500].map((km) => (
          <g key={km}>
            <line x1={kmToX(km)} y1={AXIS_Y} x2={kmToX(km)} y2={AXIS_Y + 6} stroke={INK} strokeOpacity={0.45} strokeWidth={1.2} />
            <text x={kmToX(km)} y={AXIS_Y + 22} textAnchor="middle" fill={INK} fillOpacity={0.7} className="font-display font-medium tabular-nums" fontSize={14}>
              {km.toLocaleString('en-US')}
            </text>
          </g>
        ))}
        <line x1={BORDER_X} y1={AXIS_Y} x2={capX} y2={AXIS_Y} className="stroke-accent" strokeWidth={4} strokeLinecap="round" />
        {/* Axis break: a log axis has no zero, so the stretch border → 10 km is cut */}
        <rect x={BORDER_X + 5} y={AXIS_Y - 6} width={5} height={12} className="fill-bg-accent" />
        <line x1={BORDER_X + 3} y1={AXIS_Y + 6} x2={BORDER_X + 7} y2={AXIS_Y - 6} stroke={INK} strokeWidth={1.4} />
        <line x1={BORDER_X + 8} y1={AXIS_Y + 6} x2={BORDER_X + 12} y2={AXIS_Y - 6} stroke={INK} strokeWidth={1.4} />
        <circle cx={capX} cy={AXIS_Y} r={5} className="fill-accent" stroke="#FFFFFF" strokeWidth={1.5} />
        <text x={depthX} y={AXIS_Y - 10} textAnchor="middle" fill={INK} className="font-display font-bold tabular-nums" fontSize={FONT}>
          {labels.depth}
        </text>

        {/* Doctrine zones along the axis — the active one in orange */}
        {zoneTitles.map((title, i) => (
          <rect
            key={i}
            x={edges[i] + (i ? 1.5 : 0)}
            y={AXIS_Y + 32}
            width={Math.max(2, edges[i + 1] - edges[i] - (i ? 1.5 : 0))}
            height={8}
            rx={4}
            className={i === zone ? 'fill-accent' : 'fill-brand'}
            fillOpacity={i === zone ? 1 : zoneOpacity[i]}
          >
            <title>{title}</title>
          </rect>
        ))}
        {/* The two zone edges that aren't axis ticks already (1,000 is) */}
        {ZONE_BREAKS.slice(0, 2).map((km) => (
          <g key={km}>
            <line x1={kmToX(km)} y1={AXIS_Y + 42} x2={kmToX(km)} y2={AXIS_Y + 47} stroke={INK} strokeOpacity={0.45} strokeWidth={1.2} />
            <text x={kmToX(km)} y={AXIS_Y + 62} textAnchor="middle" fill={INK} fillOpacity={0.7} className="font-display font-medium tabular-nums" fontSize={14}>
              {km}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ── Slider ──────────────────────────────────────────────────────────── */
const STEPS = 240;
const THUMB_PX = 24;
const tapePos = (f: number) => `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${f})`;

/**
 * The depth slider — a log tape that runs left→right (10 km at the left),
 * so Israel and Lebanon get real track instead of 2% of it. Notches mark
 * the five example countries; scale labels sit at their true positions.
 */
export function DepthScale({
  value,
  onChange,
  ariaLabel,
  valueText,
  ticks,
  marks,
}: {
  value: number;
  onChange: (km: number) => void;
  ariaLabel: string;
  valueText: string;
  ticks: readonly { km: number; text: string }[];
  marks: readonly { km: number; active: boolean }[];
}) {
  const f = depthToFrac(value);
  const pos = Math.round(f * STEPS);
  const handle = (next: number) => {
    let km = fracToDepth(next / STEPS);
    // At the low end one track step is < 1 km, so rounding would snap back to
    // the same value and the keyboard would get stuck — always move one step.
    if (km === value && next !== pos) {
      const dir = Math.sign(next - pos);
      km = clamp(value + dir * stepAt(dir > 0 ? value : value - 1), DEPTH_MIN, DEPTH_MAX);
    }
    onChange(km);
  };
  return (
    <div dir="ltr" className="relative">
      <div className="relative h-6">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
        <div aria-hidden className="absolute start-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent" style={{ width: tapePos(f) }} />
        {marks.map((m) => (
          <span
            key={m.km}
            aria-hidden
            className="absolute top-1/2 flex w-0 -translate-y-1/2 justify-center"
            style={{ insetInlineStart: tapePos(depthToFrac(m.km)) }}
          >
            <span className={cn('block h-3.5 w-0.5 shrink-0 rounded-full', m.active ? 'bg-accent' : 'bg-fg-dim/60')} />
          </span>
        ))}
        <input
          type="range"
          min={0}
          max={STEPS}
          step={1}
          value={pos}
          onChange={(e) => handle(Number(e.target.value))}
          aria-label={ariaLabel}
          aria-valuetext={valueText}
          className={cn(
            'absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            '[&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
            // pseudo-elements don't get preflight's `border-style: solid`, so set it explicitly
            '[&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-bg-elevated',
            '[&::-webkit-slider-thumb]:shadow-elevated',
            '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-bg-elevated',
            '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_theme(colors.accent.DEFAULT_/_45%)]',
            '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_theme(colors.accent.DEFAULT_/_45%)]',
          )}
        />
      </div>
      <div aria-hidden className="relative mt-1 h-7 text-[13px] leading-5 font-display font-medium text-fg-dim tabular-nums">
        {ticks.map((t) => (
          <span key={t.km} className="absolute top-0 flex w-0 flex-col items-center" style={{ insetInlineStart: tapePos(depthToFrac(t.km)) }}>
            <span className="block h-1.5 w-px shrink-0 bg-fg-dim/60" />
            <span className="whitespace-nowrap">{t.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
