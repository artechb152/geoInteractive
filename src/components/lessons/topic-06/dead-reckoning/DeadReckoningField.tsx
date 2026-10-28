'use client';

import { memo, useState } from 'react';
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion';
import { MAP } from '../../topic-02/topographyTerrainStyle';
import { HALO, PAPER, useSvgId } from '../CombatNavVisuals';
import { AZIMUTH_DEG, HILL, PACE_M, ROADS, ROAD_WIDTH_M, START, VISIBILITY_M, WADI, WADI_WIDTH_M, type XY } from './deadReckoningModel';

/**
 * The field view of the dead-reckoning activity: the ground around the
 * navigator, north up, centred on them — the same roads, wadi and hill as the
 * planning map, at a larger scale. The sandstorm leaves only VISIBILITY_M
 * clear; everything beyond it is still there (the map shows it) but not seen.
 * The navigator walks the planned azimuth exactly (the base demo has no
 * deviation), driven by the same distance value as the map's estimate.
 */

/**
 * The frame, 1 unit = 1 reference px: the view's column in the activity (FIELD_W wide) at the map's
 * height beside it, so the 14–15 px labels keep their size at scale 1.
 */
const W = 344;
const H = 358;
export const FIELD_W = W;
/** The pace counter's box (bottom, physical left); the field note on the HTML layer stays clear of it. */
const COUNT = { x: 14, w: 136 } as const;
export const FIELD_COUNTER_END = COUNT.x + COUNT.w;
/** Units per metre: the 30 m of sight are a 72-unit radius. */
const S = 2.4;
const SIGHT = VISIBILITY_M * S;
const RAD = (AZIMUTH_DEG * Math.PI) / 180;

const r1 = (v: number) => Math.round(v * 10) / 10;
const pathOf = (pts: readonly XY[]) => pts.map(([E, N], k) => `${k ? 'L' : 'M'}${r1(E * S)} ${r1(-N * S)}`).join('');

/** Dune ripples along the leg's corridor — one path, generated once (fixed seed, so every render is the same ground). */
const RIPPLES = (() => {
  let seed = 0x2f6b9d;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let d = '';
  for (let t = -140; t <= 1340; t += 24) {
    for (let o = -190; o <= 190; o += 22) {
      const E = START.E + t * Math.sin(RAD) + o * Math.cos(RAD) + (rnd() - 0.5) * 12;
      const N = START.N + t * Math.cos(RAD) - o * Math.sin(RAD) + (rnd() - 0.5) * 12;
      const w = 7 + rnd() * 5;
      d += `M${r1(E * S)} ${r1(-N * S)}q${r1(w * 0.5)} ${r1(-w * 0.32)} ${r1(w)} 0t${r1(w)} 0`;
    }
  }
  return d;
})();

/** Sand streaks blown across the view (drawn for a 560 × 440 frame, scaled to this one; inside the haze only). */
const STREAKS: readonly [number, number, number, number][] = [
  [20, 70, 150, 52], [210, 40, 360, 22], [380, 96, 540, 74], [30, 190, 120, 178],
  [420, 210, 548, 192], [40, 300, 170, 282], [360, 330, 500, 310], [150, 410, 300, 392],
];

const Ground = memo(function Ground() {
  const hill = HILL.center;
  return (
    <g pointerEvents="none">
      <rect x={-600} y={-2400} width={4600} height={3000} fill={PAPER.cream} />
      <path d={RIPPLES} fill="none" stroke={PAPER.rim} strokeWidth={1.6} strokeLinecap="round" />
      {/* The hill with the antenna — real, 160 m from B, never within sight in the storm */}
      <g>
        {[1, 0.68, 0.36].map((k, i) => (
          <circle key={k} cx={r1(hill.E * S)} cy={r1(-hill.N * S)} r={r1(HILL.radiusM * S * k)} className={i === 0 ? undefined : 'fill-tanline-badge'} fill={i === 0 ? PAPER.rim : undefined} fillOpacity={i === 0 ? 0.7 : 0.22} />
        ))}
        <path d={`M${r1(hill.E * S)} ${r1(-hill.N * S)}v-46`} className="stroke-fg" strokeWidth={3} />
      </g>
      {/* The dry wadi: a sunken sandy bed */}
      <path d={pathOf(WADI)} fill="none" stroke={PAPER.rim} strokeWidth={WADI_WIDTH_M * S} strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathOf(WADI)} fill="none" className="stroke-tanline-badge" strokeOpacity={0.45} strokeWidth={WADI_WIDTH_M * S * 0.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 7" />
      {/* Dirt roads */}
      {ROADS.map((r) => (
        <path key={`c-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadCasing} strokeOpacity={0.55} strokeWidth={ROAD_WIDTH_M * S + 4} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {ROADS.map((r) => (
        <path key={`f-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadFill} strokeWidth={ROAD_WIDTH_M * S} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </g>
  );
});

/** Live pace-pair count read from the walked distance ("300 / 800"). */
function useCount(distM: MotionValue<number>) {
  const of = (d: number) => Math.round(d / PACE_M);
  const [n, setN] = useState(() => of(distM.get()));
  useMotionValueEvent(distM, 'change', (d) => setN((p) => (p === of(d) ? p : of(d))));
  return n;
}

export function DeadReckoningField({
  distM,
  heading,
  target,
  label,
  className,
}: {
  /** Metres walked from A along the planned azimuth (animated). */
  distM: MotionValue<number>;
  /** The compass setting: the navigator's facing (none before the compass is set). */
  heading: number | null;
  /** The planned count, once the learner has computed it; until then the counter waits ("0 / ?"). */
  target: number | null;
  /** Accessible description of what is in sight now. */
  label: string;
  className?: string;
}) {
  const id = useSvgId('drf');
  const x = useTransform(distM, (d) => W / 2 - (START.E + d * Math.sin(RAD)) * S);
  const y = useTransform(distM, (d) => H / 2 + (START.N + d * Math.cos(RAD)) * S);
  const pairs = useCount(distM);
  const metres = Math.round(pairs * PACE_M);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={label} data-field-pairs={pairs}>
      <defs>
        <radialGradient id={`${id}-hole`}>
          <stop offset="0%" stopColor="#000" />
          <stop offset="80%" stopColor="#000" />
          <stop offset="100%" stopColor="#fff" />
        </radialGradient>
        <mask id={`${id}-haze`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect x="0" y="0" width={W} height={H} fill="#fff" />
          <circle cx={W / 2} cy={H / 2} r={SIGHT / 0.8} fill={`url(#${id}-hole)`} />
        </mask>
      </defs>

      <motion.g style={{ x, y }}>
        <Ground />
      </motion.g>

      {/* The storm: the ground beyond the sight radius is there, but hidden */}
      <g mask={`url(#${id}-haze)`} pointerEvents="none">
        <rect x="0" y="0" width={W} height={H} className="fill-tanline-contour" />
        <g stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round">
          {STREAKS.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={r1((x1 * W) / 560)} y1={r1((y1 * H) / 440)} x2={r1((x2 * W) / 560)} y2={r1((y2 * H) / 440)} />
          ))}
        </g>
      </g>
      <circle cx={W / 2} cy={H / 2} r={SIGHT} fill="none" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={2} strokeDasharray="7 6" />
      <text x={W / 2} y={H / 2 - SIGHT - 14} textAnchor="middle" fontSize={15} fontWeight={700} className="fill-fg font-display" direction="rtl" {...HALO} strokeWidth={3}>
        {`ראות כ־${VISIBILITY_M} מ׳`}
      </text>

      {/* The navigator, facing the compass setting */}
      <g transform={`translate(${W / 2} ${H / 2})`} data-field="navigator">
        {heading !== null && (
          <g transform={`rotate(${heading})`}>
            <polygon points="0,-36 9,-19 -9,-19" className="fill-accent" stroke="#FFFFFF" strokeWidth={2} />
          </g>
        )}
        <ellipse cx={2} cy={5} rx={11} ry={6} className="fill-fg" fillOpacity={0.25} />
        <circle r={11} fill="#FFFFFF" className="stroke-accent-cool" strokeWidth={3.2} />
        <circle r={5} className="fill-accent-cool" />
      </g>

      {/* North */}
      <g data-field="north">
        <rect x={14} y={14} width={46} height={62} rx={9} className="fill-paper-bright" fillOpacity={0.95} />
        <text x={37} y={32} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} className="fill-fg font-display">
          צ
        </text>
        <path d="M37 44l9 24l-9 -6l-9 6z" className="fill-fg" />
      </g>

      {/* The pace count the navigator keeps — its target is the learner's own answer to step 1 */}
      <g data-field="count">
        <rect x={COUNT.x} y={H - 86} width={COUNT.w} height={72} rx={10} className="fill-paper-bright stroke-tanline" strokeWidth={1.2} />
        <text x={COUNT.x + COUNT.w / 2} y={H - 70} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700} className="fill-fg-muted font-display" direction="rtl">
          צעדים כפולים
        </text>
        <text x={COUNT.x + COUNT.w / 2} y={H - 46} textAnchor="middle" dominantBaseline="central" direction="ltr" className="font-display font-bold tabular-nums">
          <tspan className={target === null ? 'fill-fg-muted' : 'fill-accent'} fontSize={24}>
            {pairs}
          </tspan>
          <tspan className="fill-fg-muted" fontSize={15} dx={5}>
            {`/ ${target ?? '?'}`}
          </tspan>
        </text>
        <text x={COUNT.x + COUNT.w / 2} y={H - 25} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={600} className="fill-fg font-display" direction="rtl">
          {`כ־${metres.toLocaleString('en-US')} מ׳ מ־A`}
        </text>
      </g>
    </svg>
  );
}
