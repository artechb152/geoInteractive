'use client';

import { memo, useState } from 'react';
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion';
import { MAP } from '../../topic-02/topographyTerrainStyle';
import { WATER } from '../terrain-nav/TerrainNavMap';
import {
  AZIMUTH_DEG,
  DEBRIEF_END,
  DEVIATION_DEG,
  DISTANCE_M,
  HILL,
  PACE_M,
  PLANNED_PAIRS,
  ROADS,
  ROAD_WIDTH_M,
  SHEET,
  START,
  SHORT_PACE_M,
  STEP_PAIRS,
  TARGET,
  VISIBILITY_M,
  WADI,
  along,
  deviationGap,
  pairsToMetres,
  shortPaceShortfall,
  type DebriefCase,
  type Point,
  type XY,
} from './deadReckoningModel';

/**
 * The planning map of the dead-reckoning activity — north up, never mirrored,
 * 1 viewBox unit = 1 m (x = E, y = sheet height − N). The storm does not touch
 * it: A, B, the planned line, the roads, the wadi and the hill stay readable at
 * every step; limited visibility belongs to the field view only.
 *
 * Marks: blue dot = A (known start), red ring = B, dashed orange = the planned
 * azimuth with a tick every 100 pace pairs (150 m) — drawn only once the learner
 * has computed the count, since the ticks spell it out — solid orange = the distance
 * counted so far, white-and-blue puck = the position the count gives (an
 * estimate, not a checked one), dark arrow = where the compass points now.
 * In the debrief, one error case drawn to scale: the same count walked 3° off,
 * or with a 1.4 m pace — where it really ends, against B and the 30 m of sight.
 */

const H = SHEET.height;
const m = (p: Point) => ({ x: p.E, y: H - p.N });
const r1 = (v: number) => Math.round(v * 10) / 10;
const pathOf = (pts: readonly XY[]) => pts.map(([E, N], k) => `${k ? 'L' : 'M'}${r1(E)} ${r1(H - N)}`).join('');

/** Type sizes in viewBox units (≈ 0.4 px per unit in the activity's 556 px map column: 33 ≈ 13 px, 36 ≈ 14.3 px). */
const FS = { label: 36, small: 33, letter: 42 } as const;

/** Unit vectors of the planned line, in map space. */
const RAD = (AZIMUTH_DEG * Math.PI) / 180;
const DIR = { x: Math.sin(RAD), y: -Math.cos(RAD) };
/** Normal pointing down-right of the line (south-east side), map space. */
const SE = { x: Math.cos(RAD), y: Math.sin(RAD) };
const TICKS = Array.from({ length: PLANNED_PAIRS / STEP_PAIRS - 1 }, (_, k) => (k + 1) * pairsToMetres(STEP_PAIRS));

/** A Hebrew label on a paper plate. anchor 'start' = right edge at x (RTL), 'end' = left edge at x. */
function Plate({ x, y, size = FS.label, weight = 700, anchor = 'middle', fill = MAP.ink, children }: { x: number; y: number; size?: number; weight?: number; anchor?: 'middle' | 'start' | 'end'; fill?: string; children: string }) {
  const w = children.length * size * 0.54 + size * 0.9;
  const h = size * 1.36;
  const pad = size * 0.45;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x - w + pad : x - pad;
  return (
    <g pointerEvents="none">
      <rect x={r1(left)} y={r1(y - h / 2)} width={r1(w)} height={r1(h)} rx={size * 0.25} fill={MAP.paper} fillOpacity={0.95} />
      <text x={r1(x)} y={r1(y)} textAnchor={anchor} dominantBaseline="central" direction="rtl" fontSize={size} fontWeight={weight} fill={fill} className="font-display">
        {children}
      </text>
    </g>
  );
}

const Base = memo(function Base() {
  const a = m(START);
  const hill = m(HILL.center);
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={SHEET.width} height={H} fill={MAP.paper} />
      {/* 200 m grid */}
      <g stroke={MAP.grid} strokeWidth={2} strokeOpacity={0.7}>
        {Array.from({ length: Math.floor(SHEET.width / 200) }, (_, k) => (k + 1) * 200).map((E) => (
          <path key={`e${E}`} d={`M${E} 0V${H}`} />
        ))}
        {Array.from({ length: Math.floor(H / 200) }, (_, k) => (k + 1) * 200).map((N) => (
          <path key={`n${N}`} d={`M0 ${H - N}H${SHEET.width}`} />
        ))}
      </g>
      {/* The hill: three contour rings and the antenna mast on its top */}
      <g fill="none" stroke={MAP.contour} strokeWidth={3.4}>
        {[HILL.radiusM, HILL.radiusM * 0.68, HILL.radiusM * 0.36].map((r) => (
          <circle key={r} cx={r1(hill.x)} cy={r1(hill.y)} r={r1(r)} />
        ))}
      </g>
      <g data-map="antenna">
        <path d={`M${r1(hill.x)} ${r1(hill.y)}v-34`} stroke={MAP.ink} strokeWidth={4} />
        <path d={`M${r1(hill.x - 11)} ${r1(hill.y - 34)}h22`} stroke={MAP.ink} strokeWidth={4} strokeLinecap="round" />
        <circle cx={r1(hill.x)} cy={r1(hill.y)} r={8} fill={MAP.paper} stroke={MAP.ink} strokeWidth={3.4} />
      </g>
      <Plate x={hill.x - HILL.radiusM - 14} y={hill.y} anchor="start">
        גבעה עם אנטנה
      </Plate>
      {/* The dry wadi */}
      <path d={pathOf(WADI)} fill="none" stroke={WATER.line} strokeWidth={6} strokeDasharray="20 12" strokeLinecap="round" strokeLinejoin="round" />
      <Plate x={682} y={H - 700} anchor="start">
        ערוץ יבש
      </Plate>
      {/* Dirt roads, cased */}
      {ROADS.map((r) => (
        <path key={`c-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadCasing} strokeWidth={ROAD_WIDTH_M + 6} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {ROADS.map((r) => (
        <path key={`f-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadFill} strokeWidth={ROAD_WIDTH_M + 1} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {/* The azimuth at A: grid north, and the angle measured clockwise from it */}
      <g data-map="azimuth">
        <path d={`M${a.x} ${a.y}V${a.y - 250}`} stroke={MAP.ink} strokeWidth={2.6} strokeDasharray="10 8" />
        <path d={`M${a.x} ${a.y - 250}l-9 20h18z`} fill={MAP.ink} />
        <path
          d={`M${a.x} ${a.y - 120}A120 120 0 0 1 ${r1(a.x + 120 * DIR.x)} ${r1(a.y + 120 * DIR.y)}`}
          fill="none"
          className="stroke-accent"
          strokeWidth={4}
        />
      </g>
      {/* North arrow and scale */}
      <g data-map="north">
        <rect x={20} y={18} width={84} height={150} rx={12} fill={MAP.paper} fillOpacity={0.95} />
        <text x={62} y={48} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display">
          צפון
        </text>
        <path d="M62 72l19 84l-19 -21l-19 21z" fill={MAP.ink} />
      </g>
      <g data-map="scale">
        <rect x={806} y={792} width={578} height={94} rx={12} fill={MAP.paper} fillOpacity={0.95} />
        {[0, 1, 2, 3, 4].map((k) => (
          <rect key={k} x={832 + k * 100} y={852} width={100} height={14} fill={k % 2 === 0 ? MAP.ink : '#FFFFFF'} stroke={MAP.ink} strokeWidth={2} />
        ))}
        {[0, 250, 500].map((v) => (
          <text key={v} x={832 + v} y={826} textAnchor="middle" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
            {v}
          </text>
        ))}
        <text x={1374} y={859} textAnchor="start" direction="rtl" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display">
          מ׳
        </text>
      </g>
      <rect x={0} y={0} width={SHEET.width} height={H} fill="none" stroke={MAP.ink} strokeWidth={4} />
    </g>
  );
});

/** Whole tick count reached by an animated distance (lights the ticks as the puck passes them). */
function useReached(distM: MotionValue<number>) {
  const count = (d: number) => Math.floor((d + 0.5) / pairsToMetres(STEP_PAIRS));
  const [n, setN] = useState(() => count(distM.get()));
  useMotionValueEvent(distM, 'change', (d) => setN((p) => (p === count(d) ? p : count(d))));
  return n;
}

export function DeadReckoningMap({
  distM,
  heading,
  showTicks,
  showHeading,
  debrief,
  className,
}: {
  /** Metres counted along the planned line (animated) — drives the estimate. */
  distM: MotionValue<number>;
  /** Current compass setting. */
  heading: number;
  /** Draw the 100-pair ticks (once the count is known). */
  showTicks: boolean;
  /** Draw the compass direction from A (while setting it). */
  showHeading: boolean;
  /** The error case drawn after the verify step. */
  debrief: DebriefCase | null;
  className?: string;
}) {
  const a = m(START);
  const b = m(TARGET);
  const ex = useTransform(distM, (d) => a.x + d * DIR.x);
  const ey = useTransform(distM, (d) => a.y + d * DIR.y);
  const reached = useReached(distM);
  const walked = reached * pairsToMetres(STEP_PAIRS);
  const hr = (heading * Math.PI) / 180;
  const hEnd = { x: a.x + 330 * Math.sin(hr), y: a.y - 330 * Math.cos(hr) };
  // The distance label sits on the second half of the line, clear of the wadi crossing.
  const mid = m(along(DISTANCE_M * 0.71));
  return (
    <svg
      viewBox={`0 0 ${SHEET.width} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={`מפת התכנון, צפון למעלה: נקודת המוצא A בצומת דרכי עפר, היעד B באזימוט ${AZIMUTH_DEG}° ובמרחק ${DISTANCE_M.toLocaleString('en-US')} מ׳, ערוץ יבש שחוצה את הציר וגבעה עם אנטנה ליד B. הסמן הוא אומדן המיקום לפי הספירה.`}
      data-map-walked={walked}
    >
      <Base />

      {/* The planned line: dashed, with a tick every 100 pace pairs */}
      <g data-map="plan">
        <path d={`M${a.x} ${a.y}L${r1(b.x)} ${r1(b.y)}`} fill="none" className="stroke-accent" strokeWidth={5} strokeDasharray="20 13" strokeLinecap="round" />
        {showTicks && TICKS.map((d, k) => {
          const p = m(along(d));
          const on = d <= walked + 0.5;
          return (
            <path
              key={d}
              d={`M${r1(p.x - SE.x * 15)} ${r1(p.y - SE.y * 15)}L${r1(p.x + SE.x * 15)} ${r1(p.y + SE.y * 15)}`}
              className={on ? 'stroke-accent' : 'stroke-fg-dim'}
              strokeWidth={k === 3 ? 5 : 3.6}
              strokeLinecap="round"
              data-tick={k + 1}
              data-on={on || undefined}
            />
          );
        })}
        <Plate x={mid.x - SE.x * 46} y={mid.y - SE.y * 46}>
          {`${DISTANCE_M.toLocaleString('en-US')} מ׳`}
        </Plate>
      </g>
      {/* The distance counted so far */}
      <motion.line x1={a.x} y1={a.y} x2={ex} y2={ey} className="stroke-accent" strokeWidth={7} strokeLinecap="round" />

      {/* The 3° example: the same 1,200 m walked at 65° — the gap grows with the distance */}
      {debrief === 'deviation' && (
        <g data-map="deviation">
          {(() => {
            const end = m(DEBRIEF_END.deviation);
            const half = m(along(DISTANCE_M / 2, AZIMUTH_DEG + DEVIATION_DEG));
            const halfPlan = m(along(DISTANCE_M / 2));
            const gap = (d: number) => `${Math.round(deviationGap(d))} מ׳`;
            return (
              <>
                <path d={`M${a.x} ${a.y}L${r1(end.x)} ${r1(end.y)}`} fill="none" className="stroke-fg" strokeWidth={4} strokeDasharray="9 9" strokeLinecap="round" />
                <path d={`M${r1(halfPlan.x)} ${r1(halfPlan.y)}L${r1(half.x)} ${r1(half.y)}`} className="stroke-accent-hot" strokeWidth={4} strokeLinecap="round" />
                <path d={`M${r1(b.x)} ${r1(b.y)}L${r1(end.x)} ${r1(end.y)}`} className="stroke-accent-hot" strokeWidth={4} strokeLinecap="round" />
                <circle cx={r1(end.x)} cy={r1(end.y)} r={VISIBILITY_M} fill="none" className="stroke-fg" strokeWidth={2.6} strokeDasharray="6 6" />
                <circle cx={r1(end.x)} cy={r1(end.y)} r={10} fill="#FFFFFF" className="stroke-fg" strokeWidth={3.5} />
                <Plate x={half.x + SE.x * 44} y={half.y + SE.y * 44}>
                  {gap(DISTANCE_M / 2)}
                </Plate>
                <Plate x={end.x + SE.x * 30 - 6} y={end.y + SE.y * 44}>
                  {gap(DISTANCE_M)}
                </Plate>
                <Plate x={m(along(860, AZIMUTH_DEG + DEVIATION_DEG)).x + SE.x * 70} y={m(along(860, AZIMUTH_DEG + DEVIATION_DEG)).y + SE.y * 70} size={FS.small}>
                  {`סטייה של ${DEVIATION_DEG}°`}
                </Plate>
              </>
            );
          })()}
        </g>
      )}

      {/* The short pace: the full count with 1.4 m pairs stops 80 m short of B, on the line */}
      {debrief === 'short-pace' && (
        <g data-map="short-pace">
          {(() => {
            const end = m(DEBRIEF_END['short-pace']);
            return (
              <>
                <path d={`M${r1(end.x)} ${r1(end.y)}L${r1(b.x)} ${r1(b.y)}`} className="stroke-accent-hot" strokeWidth={6} strokeLinecap="round" />
                <circle cx={r1(end.x)} cy={r1(end.y)} r={VISIBILITY_M} fill="none" className="stroke-fg" strokeWidth={2.6} strokeDasharray="6 6" />
                <circle cx={r1(end.x)} cy={r1(end.y)} r={10} fill="#FFFFFF" className="stroke-fg" strokeWidth={3.5} />
                <Plate x={end.x + SE.x * 58} y={end.y + SE.y * 58}>
                  {`${Math.round(shortPaceShortfall())} מ׳ לפני B`}
                </Plate>
                <Plate x={end.x + SE.x * 58} y={end.y + SE.y * 58 + 46} size={FS.small} weight={600}>
                  {`צעד ${SHORT_PACE_M} במקום ${PACE_M} מ׳`}
                </Plate>
              </>
            );
          })()}
        </g>
      )}

      {/* Where the compass points now */}
      {showHeading && (
        <g data-map="heading" data-heading={heading}>
          <path d={`M${a.x} ${a.y}L${r1(hEnd.x)} ${r1(hEnd.y)}`} className="stroke-fg" strokeWidth={6} strokeLinecap="round" />
          <polygon points="-16,-13 14,0 -16,13" className="fill-fg" transform={`translate(${r1(hEnd.x)} ${r1(hEnd.y)}) rotate(${r1(heading - 90)})`} />
          <Plate x={hEnd.x + 52 * Math.sin(hr)} y={hEnd.y - 52 * Math.cos(hr)} size={FS.letter} weight={800}>
            {`${heading}°`}
          </Plate>
        </g>
      )}
      {/* The planned azimuth's value — above the compass arrow, so turning it never hides the number */}
      <text x={r1(a.x + 168 * Math.sin(RAD / 2))} y={r1(a.y - 168 * Math.cos(RAD / 2))} textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={FS.letter} fontWeight={800} className="fill-accent font-display tabular-nums" paintOrder="stroke" stroke={MAP.paper} strokeWidth={7} strokeLinejoin="round" data-map="azimuth-value">
        {`${AZIMUTH_DEG}°`}
      </text>

      {/* A and B */}
      <circle cx={a.x} cy={a.y} r={12} className="fill-accent-cool" stroke="#FFFFFF" strokeWidth={3.5} />
      <Plate x={a.x} y={a.y + 52} size={FS.label}>
        A · נקודת מוצא
      </Plate>
      <g data-map="target">
        <circle cx={r1(b.x)} cy={r1(b.y)} r={22} fill="#FFFFFF" fillOpacity={0.6} className="stroke-accent-hot" strokeWidth={4} />
        <circle cx={r1(b.x)} cy={r1(b.y)} r={11} className="fill-accent-hot" stroke="#FFFFFF" strokeWidth={3} />
        <text x={r1(b.x + 30)} y={r1(b.y - 34)} textAnchor="middle" dominantBaseline="central" fontSize={FS.letter} fontWeight={800} className="fill-accent-hot font-display" paintOrder="stroke" stroke="#FFFFFF" strokeWidth={6} strokeLinejoin="round">
          B
        </text>
      </g>

      {/* The estimate: where the count puts you, with the storm's sight radius around it */}
      <motion.g style={{ x: ex, y: ey }} data-map="estimate">
        <circle r={VISIBILITY_M} fill="none" className="stroke-fg-muted" strokeWidth={2.4} strokeDasharray="6 6" />
        <ellipse cx={3} cy={8} rx={13} ry={8} className="fill-fg" fillOpacity={0.22} />
        <circle r={13} fill="#FFFFFF" className="stroke-accent-cool" strokeWidth={4} />
        <circle r={6} className="fill-accent-cool" />
      </motion.g>
      {/* Under way the label rides south-east of the line; at the end it moves north-west of B, clear of the 3° example. */}
      {walked > 0 && walked < DISTANCE_M && (
        <motion.g style={{ x: ex, y: ey }}>
          <Plate x={SE.x * 62 + 70} y={SE.y * 62 + 18} size={FS.small} weight={800}>
            {`אומדן: ${walked.toLocaleString('en-US')} מ׳`}
          </Plate>
        </motion.g>
      )}
      {walked >= DISTANCE_M && (
        <Plate x={b.x - SE.x * 58 - 34} y={b.y - SE.y * 58 + 4} size={FS.small} weight={800}>
          אומדן
        </Plate>
      )}
    </svg>
  );
}
