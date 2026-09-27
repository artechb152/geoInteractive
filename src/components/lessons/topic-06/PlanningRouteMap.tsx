'use client';
/**
 * PlanningRouteMap — the illustrated route-story map for PlanningScene (topic-06).
 *
 * The map is drawn to scale from the checkpoint data: every leg is a straight
 * azimuth line whose bearing and length come from the numbers in the
 * checkpoint text (legs[i].az / legs[i].m). North is always up — the SVG is
 * never mirrored for RTL.
 *
 * Step semantics (activeStep = index of the active checkpoint card):
 *   - step 0  → standing at נ.ה; the departure bearing of card 1 is shown.
 *   - step k  → the leg (k-1 → k) is the current leg: drawn solid orange with
 *               its azimuth arc at the leg start and an "az° / m מ׳" tag.
 *   - legs before the current one are muted-solid (done), later ones dashed.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export type RouteLeg = { az: number; m: number };
type Pt = { x: number; y: number };
type Deco = { x: number; y: number; s?: number };
type Side = 'nw' | 'se';

// ——— Geometry ———
const VB_W = 100;
const VB_H = 92;
/** map scale — metres per SVG unit (the 500 מ׳ scale bar is drawn from it) */
const M_PER_UNIT = 23.5;
const START: Pt = { x: 14, y: 80 };
/** per step: which side of the leg its tag sits on, how far out, and how far
 *  along the leg it slides (chosen to keep clear of terrain, markers and labels) */
const TAG_SIDE: Side[] = ['se', 'se', 'nw', 'se', 'se'];
const TAG_OFFSET = [7, 6.6, 6.6, 6.6, 6.6];
const TAG_SHIFT = [2, 0, 0, 0, 0];

// ——— Palette (design tokens mirrored as hex for SVG paint) ———
const ORANGE = '#D97E2B'; // accent
const ORANGE_DEEP = '#C96714'; // ember-deep
const SAGE = '#749C75'; // brand
const SAGE_DARK = '#5B7C5C'; // brand-dark
const INK = '#38432E'; // fg
const PAPER = '#FFFDF9';
const HAIR = '#DCCDB2'; // tanline
const FONT = { fontFamily: 'var(--font-rubik), system-ui, sans-serif' };
const EASE = [0.22, 1, 0.36, 1] as const;

const fx = (n: number) => Math.round(n * 100) / 100;
function polar(p: Pt, az: number, dist: number): Pt {
  const r = (az * Math.PI) / 180;
  return { x: fx(p.x + dist * Math.sin(r)), y: fx(p.y - dist * Math.cos(r)) };
}
function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: fx(a.x + (b.x - a.x) * t), y: fx(a.y + (b.y - a.y) * t) };
}
/** unit normal pointing to the given side of a leg with bearing `az` */
function sideNormal(az: number, side: Side): Pt {
  const r = (az * Math.PI) / 180;
  const k = side === 'se' ? 1 : -1;
  return { x: k * Math.cos(r), y: k * Math.sin(r) };
}
const pad3 = (n: number) => String(n).padStart(3, '0');

// ——— Terrain objects ———
function Pine({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.25 * s} rx={1.5 * s} ry={0.4 * s} fill="#566b46" opacity={0.16} />
      <rect x={-0.22 * s} y={-0.5 * s} width={0.44 * s} height={1.1 * s} rx={0.15 * s} fill="#8a6a45" />
      <path d={`M0 ${-3.4 * s} L ${1.4 * s} ${-0.9 * s} L ${-1.4 * s} ${-0.9 * s} Z`} fill="#55613C" />
      <path d={`M0 ${-4.2 * s} L ${1.1 * s} ${-2 * s} L ${-1.1 * s} ${-2 * s} Z`} fill="#6E7A4E" />
      <path d={`M0 ${-4.8 * s} L ${0.82 * s} ${-3.05 * s} L ${-0.82 * s} ${-3.05 * s} Z`} fill="#8A9163" />
    </g>
  );
}

function Bush({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.15 * s} rx={1.3 * s} ry={0.3 * s} fill="#566b46" opacity={0.14} />
      <circle cx={-0.55 * s} cy={-0.4 * s} r={0.8 * s} fill="#55613C" />
      <circle cx={0.55 * s} cy={-0.35 * s} r={0.7 * s} fill="#6E7A4E" />
      <circle cx={0} cy={-0.8 * s} r={0.85 * s} fill="#8A9163" />
    </g>
  );
}

function Rock({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.18 * s} rx={1.1 * s} ry={0.28 * s} fill="#4a5663" opacity={0.16} />
      <path
        d={`M${-1.05 * s} ${0.25 * s} Q ${-1.2 * s} ${-0.7 * s} ${-0.35 * s} ${-1 * s} Q ${0.6 * s} ${-1.2 * s} ${1 * s} ${-0.45 * s} Q ${1.25 * s} ${0.1 * s} ${0.9 * s} ${0.3 * s} Z`}
        fill="#a9a595"
      />
      <path d={`M${-0.35 * s} ${-1 * s} Q ${0.6 * s} ${-1.2 * s} ${1 * s} ${-0.45 * s} L ${0.15 * s} ${-0.5 * s} Z`} fill="#c9c4b3" />
    </g>
  );
}

function Cairn({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.1 * s} rx={1 * s} ry={0.25 * s} fill="#4a5663" opacity={0.16} />
      <ellipse cx={0} cy={-0.2 * s} rx={0.95 * s} ry={0.5 * s} fill="#a7884f" />
      <ellipse cx={0.08 * s} cy={-0.95 * s} rx={0.7 * s} ry={0.42 * s} fill="#c2a26b" />
      <ellipse cx={-0.05 * s} cy={-1.5 * s} rx={0.48 * s} ry={0.32 * s} fill="#d8c08a" />
    </g>
  );
}

// Positions are placed clear of every leg, marker, label and leg tag.
const PINES: Deco[] = [
  // on the two summits flanking the saddle (checkpoint 3)
  { x: 46.6, y: 43.2, s: 0.85 },
  { x: 50.1, y: 41.6, s: 0.95 },
  { x: 60.2, y: 58.4, s: 0.85 },
  // the grove the last leg walks through (checkpoint 4 → 5)
  { x: 71.6, y: 27.4, s: 0.8 },
  { x: 75.6, y: 22.6, s: 0.9 },
  { x: 68.8, y: 22.2, s: 0.75 },
  // prominent pine cluster on the rocky target ground (checkpoint 5)
  { x: 80.6, y: 12.6, s: 0.85 },
  { x: 84.4, y: 9.8, s: 1 },
  { x: 89.8, y: 10.8, s: 0.9 },
  { x: 93.8, y: 14.6, s: 0.8 },
  // scattered cover
  { x: 33.5, y: 40.5, s: 0.8 },
  { x: 21, y: 45, s: 0.75 },
  { x: 64.6, y: 26.8, s: 0.75 },
];

const BUSHES: Deco[] = [
  { x: 6, y: 73, s: 0.85 },
  { x: 7.5, y: 88.5, s: 0.75 },
  { x: 17.5, y: 58.5, s: 0.8 },
  { x: 35.5, y: 86.5, s: 0.8 },
  { x: 41.5, y: 82.5, s: 0.7 },
  { x: 48, y: 67.5, s: 0.8 },
  { x: 64.5, y: 69.5, s: 0.75 },
  { x: 88.5, y: 44, s: 0.8 },
  { x: 95, y: 36, s: 0.7 },
];

const ROCKS: Deco[] = [
  { x: 9, y: 61, s: 0.7 },
  { x: 37.5, y: 65.5, s: 0.7 },
  { x: 66, y: 62, s: 0.7 },
  // rocky ground at the target
  { x: 93.6, y: 21.2, s: 0.95 },
  { x: 95.2, y: 26, s: 0.75 },
  { x: 80.4, y: 17.4, s: 0.7 },
];

const CAIRNS: Deco[] = [
  { x: 41.5, y: 60.8, s: 0.8 },
  { x: 74.6, y: 37.6, s: 0.8 },
];

// ——— Leg tag (azimuth + distance, reusing the numbers from the card text) ———
function LegTag({ at, anchor, az, m, reduce }: { at: Pt; anchor: Pt; az: number; m: number; reduce: boolean }) {
  return (
    <g>
      <line
        x1={anchor.x}
        y1={anchor.y}
        x2={at.x}
        y2={at.y}
        stroke={ORANGE}
        strokeWidth={0.28}
        strokeDasharray="0.7 0.55"
        strokeLinecap="round"
      />
      <circle cx={anchor.x} cy={anchor.y} r={0.55} fill={ORANGE} />
      <g transform={`translate(${at.x} ${at.y})`}>
        <motion.g
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE, delay: reduce ? 0 : 0.25 }}
        >
          <rect x={-5.5} y={-3.55} width={11} height={7.9} rx={1.9} fill="#566b46" opacity={0.12} transform="translate(0 0.45)" />
          <rect x={-5.5} y={-3.95} width={11} height={7.9} rx={1.9} fill={PAPER} stroke={ORANGE} strokeWidth={0.32} />
          <text y={-0.6} textAnchor="middle" fontSize={2.8} fontWeight={800} fill={ORANGE_DEEP} style={FONT}>
            {pad3(az)}°
          </text>
          <text y={2.55} textAnchor="middle" fontSize={2.1} fontWeight={600} fill={INK} style={FONT}>
            {`${m} מ׳`}
          </text>
        </motion.g>
      </g>
    </g>
  );
}

// Azimuth = angle measured clockwise from north: a north tick + an arc to the leg's bearing.
function AzimuthArc({ p, az }: { p: Pt; az: number }) {
  const r = 6;
  const a0 = { x: p.x, y: fx(p.y - r) };
  const a1 = polar(p, az, r);
  return (
    <g>
      <line x1={p.x} y1={fx(p.y - 3.7)} x2={p.x} y2={fx(p.y - 9.2)} stroke={SAGE_DARK} strokeWidth={0.3} strokeDasharray="0.7 0.5" />
      <text x={p.x} y={fx(p.y - 9.9)} textAnchor="middle" fontSize={1.7} fontWeight={700} fill={SAGE_DARK} style={FONT}>
        צ
      </text>
      <path d={`M ${a0.x} ${a0.y} A ${r} ${r} 0 0 1 ${a1.x} ${a1.y}`} fill="none" stroke={ORANGE_DEEP} strokeWidth={0.36} strokeLinecap="round" />
    </g>
  );
}

function Arrowhead({ at, az, fill }: { at: Pt; az: number; fill: string }) {
  return (
    <path d="M0 -1.35 L 1.05 0.85 L 0 0.35 L -1.05 0.85 Z" transform={`translate(${at.x} ${at.y}) rotate(${az})`} fill={fill} />
  );
}

export function RouteMap({
  legs,
  activeStep,
  onSelect,
  ariaLabel,
}: {
  legs: RouteLeg[];
  activeStep: number;
  onSelect: (i: number) => void;
  ariaLabel: string;
}) {
  const reduce = !!useReducedMotion();

  // checkpoints, derived from the leg bearings/distances (leg 0 = departure bearing)
  const points: Pt[] = [START];
  for (let i = 1; i < legs.length; i++) points.push(polar(points[i - 1], legs[i].az, legs[i].m / M_PER_UNIT));

  const step = activeStep;
  const cur = legs[step];
  // current leg geometry: from checkpoint (step-1) to checkpoint step; step 0 = departure bearing from נ.ה
  const legFrom = step === 0 ? polar(points[0], cur.az, 3.9) : points[step - 1];
  const legTo = step === 0 ? polar(points[0], cur.az, 10.5) : points[step];
  const legMid = lerp(legFrom, legTo, 0.5);
  const n = sideNormal(cur.az, TAG_SIDE[step]);
  const u = polar({ x: 0, y: 0 }, cur.az, 1);
  const tagAt = {
    x: fx(legMid.x + n.x * TAG_OFFSET[step] + u.x * TAG_SHIFT[step]),
    y: fx(legMid.y + n.y * TAG_OFFSET[step] + u.y * TAG_SHIFT[step]),
  };
  const arcAt = step === 0 ? points[0] : points[step - 1];
  const scaleLen = fx(500 / M_PER_UNIT);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="block w-full h-auto select-none"
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="pl6-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="55%" stopColor="#FBF3E4" />
          <stop offset="100%" stopColor="#F3E7D2" />
        </linearGradient>
        <radialGradient id="pl6-sun" cx="0.85" cy="0" r="1">
          <stop offset="0%" stopColor="#FFDCB5" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#FFDCB5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pl6-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="70%" stopColor="#6b5a38" stopOpacity="0" />
          <stop offset="100%" stopColor="#6b5a38" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient id="pl6-hill" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0%" stopColor="#d9cfa6" />
          <stop offset="100%" stopColor="#b7bd92" />
        </radialGradient>
      </defs>

      {/* Paper base + warm sun wash */}
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#pl6-paper)" />
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#pl6-sun)" />

      {/* Fine map grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={'gx' + i} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2={VB_H} className="stroke-border-subtle" strokeWidth="0.08" />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={'gy' + i} x1="0" y1={(i + 1) * 10} x2={VB_W} y2={(i + 1) * 10} className="stroke-border-subtle" strokeWidth="0.08" />
      ))}

      {/* Broad topographic contour lines */}
      {[
        'M-4 20 C 18 14, 36 24, 56 18 S 90 24, 104 18',
        'M-4 34 C 16 28, 30 40, 50 34 S 86 40, 104 33',
        'M-4 70 C 14 64, 26 72, 44 68 S 84 72, 104 68',
        'M-4 88 C 18 84, 36 91, 58 86 S 88 92, 104 87',
      ].map((d, i) => (
        <path key={'c' + i} d={d} fill="none" stroke="#C9A56B" strokeWidth="0.2" opacity="0.4" strokeLinecap="round" />
      ))}

      {/* Stream — bends right at checkpoint 2 and is crossed just after it */}
      {(() => {
        const d =
          'M-3 47 C 7 48.5, 16 52.5, 22.5 56 C 26.5 58, 29.6 58.6, 30.8 61.6 C 32 65, 33.2 70, 39 73 C 47 77, 60 76.5, 72 78.5 C 84 80.5, 94 79, 103 80.5';
        return (
          <g>
            <path d={d} fill="none" stroke="#7FB4C6" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
            <path d={d} fill="none" stroke="#4f8397" strokeWidth="0.45" strokeLinecap="round" opacity="0.55" />
          </g>
        );
      })()}

      {/* Ridge saddle — two summits with the low pass (col) the route threads at checkpoint 3 */}
      <g transform={`translate(${points[2].x} ${points[2].y}) rotate(56.7)`}>
        <path
          d="M -15.5 0 C -15.5 -8, -5 -8.6, 0 -3.4 C 5 -8.6, 15.5 -8, 15.5 0 C 15.5 8, 5 8.6, 0 3.4 C -5 8.6, -15.5 8, -15.5 0 Z"
          fill="url(#pl6-hill)"
          opacity="0.6"
        />
        <path
          d="M -15.5 0 C -15.5 -8, -5 -8.6, 0 -3.4 C 5 -8.6, 15.5 -8, 15.5 0 C 15.5 8, 5 8.6, 0 3.4 C -5 8.6, -15.5 8, -15.5 0 Z"
          fill="none"
          stroke="#7a8a5a"
          strokeWidth="0.2"
          opacity="0.55"
        />
        {[-8.9, 8.9].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy={0} rx={5.2} ry={4.9} fill="none" stroke="#7a8a5a" strokeWidth="0.18" opacity="0.6" />
            <ellipse cx={cx} cy={0} rx={3.3} ry={3.1} fill="#c9c79b" opacity="0.45" stroke="#7a8a5a" strokeWidth="0.16" />
            <ellipse cx={cx} cy={0} rx={1.5} ry={1.4} fill="none" stroke="#7a8a5a" strokeWidth="0.14" opacity="0.6" />
          </g>
        ))}
      </g>

      {/* Wide dirt road the route crosses at checkpoint 4 */}
      <g>
        <path d="M49 15.5 C 57 23, 63 30, 69.5 36.3 C 76 42.6, 83 50, 92 57.5 C 96 61, 100 63, 104 64" fill="none" stroke="#C9A56B" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
        <path
          d="M49 15.5 C 57 23, 63 30, 69.5 36.3 C 76 42.6, 83 50, 92 57.5 C 96 61, 100 63, 104 64"
          fill="none"
          stroke="#9c7e48"
          strokeWidth="0.3"
          strokeDasharray="1.4 1"
          strokeLinecap="round"
          opacity="0.6"
        />
      </g>

      {/* Terrain objects (all kept clear of the route) */}
      <g>
        {ROCKS.map((r, i) => (
          <Rock key={'r' + i} {...r} />
        ))}
        {BUSHES.map((b, i) => (
          <Bush key={'b' + i} {...b} />
        ))}
        {CAIRNS.map((c, i) => (
          <Cairn key={'k' + i} {...c} />
        ))}
        {PINES.map((p, i) => (
          <Pine key={'p' + i} {...p} />
        ))}
      </g>

      {/* saddle name — beside the pass, clear of the route and the leg tags */}
      <g>
        <rect x={43.4} y={56.3} width={7.4} height={3.5} rx={1.75} fill={PAPER} opacity={0.92} stroke={HAIR} strokeWidth={0.15} />
        <text x={47.1} y={58.9} textAnchor="middle" fontSize="2.3" fontWeight={700} fill={SAGE_DARK} style={FONT}>
          אוכף
        </text>
      </g>

      {/* ——— Route ——— */}
      {/* dirt trail bed under every leg */}
      {points.slice(1).map((b, k) => (
        <line key={'bed' + k} x1={points[k].x} y1={points[k].y} x2={b.x} y2={b.y} stroke="#cdba90" strokeWidth="2.3" strokeLinecap="round" opacity="0.5" />
      ))}
      {/* leg k+1 connects checkpoint k → k+1; done = muted solid, current = orange, later = dashed */}
      {points.slice(1).map((b, k) => {
        const legIdx = k + 1;
        const a = points[k];
        if (legIdx < step) {
          return <line key={'leg' + legIdx} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={SAGE_DARK} strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />;
        }
        if (legIdx > step) {
          return (
            <line
              key={'leg' + legIdx}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={ORANGE}
              strokeWidth="0.55"
              strokeLinecap="round"
              strokeDasharray="1.3 1.1"
              opacity="0.6"
            />
          );
        }
        return null;
      })}

      {/* current leg (or the departure bearing at step 0) */}
      <g key={'cur' + step}>
        <AzimuthArc p={arcAt} az={cur.az} />
        <line x1={legFrom.x} y1={legFrom.y} x2={legTo.x} y2={legTo.y} stroke={ORANGE} strokeWidth="2.2" strokeLinecap="round" opacity="0.2" />
        <motion.path
          d={`M ${legFrom.x} ${legFrom.y} L ${legTo.x} ${legTo.y}`}
          fill="none"
          stroke={ORANGE}
          strokeWidth="1.05"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.55, ease: EASE }}
        />
        <motion.g
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: reduce ? 0 : 0.4 }}
        >
          <Arrowhead at={step === 0 ? legTo : lerp(legFrom, legTo, 0.64)} az={cur.az} fill={ORANGE_DEEP} />
        </motion.g>
      </g>

      {/* ——— Checkpoint markers (click = select that checkpoint) ——— */}
      {points.map((p, i) => {
        const isTarget = i === points.length - 1;
        const isActive = i === step;
        const isPassed = i < step;
        let fill = '#FFFFFF';
        let ring = SAGE_DARK;
        let numFill = SAGE_DARK;
        if (isActive) {
          fill = ORANGE;
          ring = ORANGE_DEEP;
          numFill = '#FFFFFF';
        } else if (isPassed) {
          fill = SAGE;
          ring = SAGE_DARK;
          numFill = '#FFFFFF';
        } else if (isTarget) {
          ring = ORANGE;
          numFill = ORANGE_DEEP;
        }
        const r = isActive ? 2.75 : isTarget ? 2.6 : 2.3;
        const endLabel = i === 0 ? 'נ.ה' : isTarget ? 'נ.ס' : null;
        // end-point label pill: fixed offset (doesn't jump with the active radius); target's nudged east, clear of the arriving leg
        const lx = isTarget ? fx(p.x + 1.6) : p.x;
        return (
          <g key={i} className="group cursor-pointer" onClick={() => onSelect(i)}>
            <circle cx={p.x} cy={p.y} r={4.6} fill="transparent" />
            <ellipse cx={p.x} cy={fx(p.y + r + 0.55)} rx={r * 0.9} ry={r * 0.3} fill="#4A5240" opacity="0.14" />
            <circle cx={p.x} cy={p.y} r={r + 0.85} fill={PAPER} stroke={HAIR} strokeWidth="0.15" />
            <circle
              cx={p.x}
              cy={p.y}
              r={r + 1.5}
              fill="none"
              stroke={ORANGE}
              strokeWidth="0.3"
              className="opacity-0 transition-opacity duration-150 group-hover:opacity-70"
            />
            {isActive && !reduce && (
              <circle cx={p.x} cy={p.y} r={r + 0.5} fill="none" stroke={ORANGE} strokeWidth="0.4">
                <animate attributeName="r" values={`${r + 0.5};${r + 3.4};${r + 0.5}`} dur="1.9s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.75;0;0.75" dur="1.9s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={ring} strokeWidth={isActive || isPassed ? 0.3 : 0.45} />
            {(isActive || isPassed) && <ellipse cx={p.x} cy={fx(p.y - r * 0.4)} rx={r * 0.58} ry={r * 0.28} fill="#FFFFFF" opacity="0.2" />}
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isTarget ? 2.6 : 2.4}
              fontWeight={800}
              fill={numFill}
              style={FONT}
            >
              {isTarget ? 'B' : i + 1}
            </text>
            {endLabel && (
              <g>
                <rect
                  x={fx(lx - 3.4)}
                  y={fx(p.y + 4.05)}
                  width={6.8}
                  height={3.4}
                  rx={1.7}
                  fill={PAPER}
                  stroke={isTarget ? ORANGE : SAGE_DARK}
                  strokeWidth="0.22"
                />
                <text
                  x={lx}
                  y={fx(p.y + 6.52)}
                  textAnchor="middle"
                  fontSize="2.1"
                  fontWeight={700}
                  fill={isTarget ? ORANGE_DEEP : SAGE_DARK}
                  style={FONT}
                >
                  {endLabel}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* azimuth / distance tag of the current leg */}
      <AnimatePresence mode="wait">
        <motion.g
          key={'tag' + step}
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.15 } }}
        >
          <LegTag at={tagAt} anchor={legMid} az={cur.az} m={cur.m} reduce={reduce} />
        </motion.g>
      </AnimatePresence>

      {/* ——— Map furniture ——— */}
      <g transform="translate(9.5 10.5)" opacity="0.75">
        <circle r="3.4" fill={PAPER} opacity="0.8" />
        <circle r="3.4" fill="none" className="stroke-border-strong" strokeWidth="0.2" />
        <circle r="2.6" fill="none" className="stroke-border-strong" strokeWidth="0.12" />
        {[
          [0, -3.4, 0, -2.7],
          [0, 3.4, 0, 2.7],
          [-3.4, 0, -2.7, 0],
          [3.4, 0, 2.7, 0],
        ].map((t, i) => (
          <line key={'t' + i} x1={t[0]} y1={t[1]} x2={t[2]} y2={t[3]} stroke="#8a7c5c" strokeWidth="0.15" />
        ))}
        <path d="M0 -2.3 L 0.7 0 L 0 0.5 L -0.7 0 Z" className="fill-accent" />
        <path d="M0 2.3 L 0.7 0 L 0 -0.5 L -0.7 0 Z" fill="#9aa1a8" />
        <text x="0" y="-3.85" textAnchor="middle" fontSize="1.7" fontWeight={700} className="fill-brand-dark" style={FONT}>
          צ
        </text>
      </g>
      <g transform={`translate(${fx(93 - scaleLen)} 87.2)`} opacity="0.75">
        <rect x="0" y="0" width={scaleLen} height="0.9" fill="#FFFFFF" className="stroke-border-strong" strokeWidth="0.12" />
        <rect x="0" y="0" width={fx(scaleLen / 4)} height="0.9" className="fill-terrain-ridge" />
        <rect x={fx(scaleLen / 2)} y="0" width={fx(scaleLen / 4)} height="0.9" className="fill-terrain-ridge" />
        <text x="0" y="-0.7" textAnchor="middle" fontSize="1.6" className="fill-fg-dim" style={FONT}>
          0
        </text>
        <text x={scaleLen} y="-0.7" textAnchor="middle" fontSize="1.6" className="fill-fg-dim" style={FONT}>
          500מ׳
        </text>
      </g>

      {/* edge vignette for depth */}
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#pl6-vignette)" pointerEvents="none" />
    </svg>
  );
}
