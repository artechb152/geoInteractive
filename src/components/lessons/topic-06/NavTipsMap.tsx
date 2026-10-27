'use client';
/**
 * NavTipsMap — the one learning map of PlanningTipsScene (topic-06,
 * „דגשים לתכנון ולניווט”). Both screens of the scene draw the same terrain and
 * the same route, so planning and navigating read as one story:
 *   - plan focuses     — what is prepared before leaving
 *   - navigate focuses — the same route, now with the current position on it
 *
 * Drawn in the route-story map's visual language (PlanningRouteMap): paper
 * base, faint contours, a stream, a two-summit ridge with its saddle, a dirt
 * road, the same terrain objects and checkpoint markers. North is up; the map
 * is never mirrored for RTL. Every leg is a straight line built from a bearing
 * and a distance, so the map is to scale. The bearings stay internal: this
 * part of the lesson shows direction as an arrow, not as a number (azimuth is
 * taught later in the lesson).
 *
 * Highlights are discrete states — a selection changes them once, with a short
 * fade; nothing loops. Each state highlights only what its tip's text is about.
 *
 * `data-*` hooks (focus, halo, marker state, layers, walked lines, position)
 * are read by scripts/qa/planning-tips.test.mjs.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import {
  Bush,
  Cairn,
  EASE,
  FONT,
  HAIR,
  INK,
  ORANGE,
  ORANGE_DEEP,
  PAPER,
  Pine,
  Rock,
  SAGE,
  SAGE_DARK,
  type Deco,
} from './PlanningRouteMap';
import { PaperHouse, UnitPuck, useSvgId } from './CombatNavVisuals';

export type PlanFocus = 'ends' | 'route' | 'legs' | 'checkpoints';
export type NavFocus = 'verify' | 'compare' | 'combine' | 'mismatch';
export type MapFocus = PlanFocus | NavFocus;

type Pt = { x: number; y: number };

// ——— Geometry ———
const VB_W = 100;
const VB_H = 75;
/** map scale — metres per SVG unit (the 500 מ׳ scale bar is drawn from it) */
const M_PER_UNIT = 25;
const START: Pt = { x: 86, y: 62 };

/**
 * The planned route, leg by leg: נ.ה → 1 עיקול הנחל → 2 אוכף → 3 חציית דרך
 * עפר → נ.ס. `m` is the distance the scene quotes; `az` only places the leg.
 */
export const TIP_LEGS = [
  { az: 275, m: 500 },
  { az: 298, m: 550 },
  { az: 322, m: 600 },
  { az: 292, m: 500 },
] as const;

/** The navigator who drifts in the "mismatch" state walks leg 3's distance on this bearing. */
const DRIFT_AZ = 340;

const fx = (n: number) => Math.round(n * 100) / 100;
function polar(p: Pt, az: number, dist: number): Pt {
  const r = (az * Math.PI) / 180;
  return { x: fx(p.x + dist * Math.sin(r)), y: fx(p.y - dist * Math.cos(r)) };
}
function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: fx(a.x + (b.x - a.x) * t), y: fx(a.y + (b.y - a.y) * t) };
}
const bearing = (a: Pt, b: Pt) => (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;

/** נ.ה, the three checkpoints, נ.ס */
const POINTS: Pt[] = TIP_LEGS.reduce<Pt[]>((pts, leg) => [...pts, polar(pts[pts.length - 1], leg.az, leg.m / M_PER_UNIT)], [START]);
const [, P1, P2, P3, END] = POINTS;

// The ridge lies across the straight line נ.ה → נ.ס: that line climbs over its
// northern summit, the planned route crosses at the saddle (P2) between them.
const DIRECT_LEN = Math.hypot(END.x - START.x, END.y - START.y);
const RIDGE_AXIS: Pt = { x: -(END.y - START.y) / DIRECT_LEN, y: (END.x - START.x) / DIRECT_LEN };
const RIDGE_ROT = fx((Math.atan2(RIDGE_AXIS.y, RIDGE_AXIS.x) * 180) / Math.PI);
const SUMMIT_N: Pt = { x: fx(P2.x + 8.9 * RIDGE_AXIS.x), y: fx(P2.y + 8.9 * RIDGE_AXIS.y) };
const SUMMIT_S: Pt = { x: fx(P2.x - 8.9 * RIDGE_AXIS.x), y: fx(P2.y - 8.9 * RIDGE_AXIS.y) };

/** Where the drifting navigator stands after leg 3's distance — short of the road. */
const DRIFT_END = polar(P2, DRIFT_AZ, TIP_LEGS[2].m / M_PER_UNIT);
/** Current position per navigate focus. */
const POSITION: Record<NavFocus, Pt> = {
  verify: P1,
  compare: lerp(P1, P2, 0.55),
  combine: P2,
  mismatch: DRIFT_END,
};

// Paths are tuned to the points above: the stream bends at P1, the road is crossed at P3.
const STREAM =
  'M74 -2 C 73 10, 70 20, 71 30 C 72 40, 73 50, 69.5 56.5 C 67.5 60, 64 62, 59 64.5 C 52 68, 44 69, 36 70.5 C 26 72.5, 14 71.5, -2 74';
const ROAD = 'M37 -2 C 35 8, 33 20, 31.9 31 C 30.8 42, 28 52, 24 62 C 21 69, 19 73, 17 77';
const CONTOURS = [
  'M-4 13 C 14 8, 30 15, 48 9 S 84 13, 104 7',
  'M56 25 C 64 21, 80 27, 104 22',
  'M-4 44 C 6 40, 14 46, 22 43',
  'M58 73 C 70 69, 84 73, 104 70',
];

// Terrain objects — kept clear of the route, the markers and every label.
const PINES: Deco[] = [
  // the destination: a group of pines on rocky ground
  { x: 9.2, y: 19.6, s: 0.85 },
  { x: 12.6, y: 17.6, s: 1 },
  { x: 16.8, y: 18.8, s: 0.85 },
  { x: 7.2, y: 24.4, s: 0.75 },
  // scattered
  { x: 60, y: 17, s: 0.8 },
  { x: 65.5, y: 13.5, s: 0.75 },
  { x: 41, y: 14, s: 0.8 },
];
const ROCKS: Deco[] = [
  { x: 18.6, y: 23.2, s: 0.8 },
  { x: 10.6, y: 22.6, s: 0.7 },
  { x: 19.6, y: 27.2, s: 0.7 },
  { x: 63, y: 40, s: 0.7 },
  { x: 37, y: 61.5, s: 0.7 },
];
const BUSHES: Deco[] = [
  { x: 79, y: 43, s: 0.8 },
  { x: 90, y: 33, s: 0.75 },
  { x: 22, y: 50, s: 0.75 },
  { x: 6, y: 61, s: 0.8 },
  { x: 52, y: 73.5, s: 0.7 },
  { x: 94, y: 71, s: 0.7 },
];
const CAIRNS: Deco[] = [{ x: 76, y: 29, s: 0.8 }];
/** the prominent building beside נ.ה */
const BUILDING: Pt = { x: 89.4, y: 55.6 };

// ——— Map furniture ———
const LABEL_SIZE = 2.4;

/**
 * A paper pill label (the route-story map's label style — no stroke halo).
 * The pill is sized to the rendered text once the font is ready.
 */
function Callout({ at, children, tone = 'ink', dashed = false }: { at: Pt; children: ReactNode; tone?: 'ink' | 'orange' | 'sage'; dashed?: boolean }) {
  const ref = useRef<SVGTextElement>(null);
  const [w, setW] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const t = ref.current;
      if (t) setW(fx(t.getComputedTextLength()));
    };
    measure();
    document.fonts?.ready.then(measure);
  }, [children]);
  const width = fx((w ?? 12) + 2.6);
  const stroke = tone === 'orange' ? ORANGE : tone === 'sage' ? SAGE_DARK : HAIR;
  const fill = tone === 'orange' ? ORANGE_DEEP : tone === 'sage' ? SAGE_DARK : INK;
  return (
    <g>
      <rect x={fx(at.x - width / 2)} y={fx(at.y - 2.1)} width={width} height={4.2} rx={2.1} fill={PAPER} stroke={stroke} strokeWidth={0.22} strokeDasharray={dashed ? '0.9 0.6' : undefined} />
      <text ref={ref} x={at.x} y={fx(at.y + 0.85)} textAnchor="middle" fontSize={LABEL_SIZE} fontWeight={700} fill={fill} style={FONT}>
        {children}
      </text>
    </g>
  );
}

/** Highlight ring around the feature a tip is about. Dashed = expected, not (yet) seen. */
function Halo({ p, r, dashed = false, name }: { p: Pt; r: number; dashed?: boolean; name: string }) {
  return (
    <circle
      data-halo={name}
      data-expected={dashed || undefined}
      cx={p.x}
      cy={p.y}
      r={r}
      fill={ORANGE}
      fillOpacity={dashed ? 0.05 : 0.12}
      stroke={ORANGE}
      strokeWidth={0.35}
      strokeDasharray={dashed ? '1 0.8' : undefined}
    />
  );
}

function Arrowhead({ at, az, fill = ORANGE_DEEP, s = 1 }: { at: Pt; az: number; fill?: string; s?: number }) {
  return <path d="M0 -1.35 L 1.05 0.85 L 0 0.35 L -1.05 0.85 Z" transform={`translate(${at.x} ${at.y}) rotate(${fx(az)}) scale(${s})`} fill={fill} />;
}

/**
 * "קטע n · כ־… מ׳" — the leg tag (the route-story map's tag, with a leg number
 * instead of a bearing). Sage = a distance that has been checked and matches.
 */
function LegTag({ at, anchor, title, meters, tone = 'orange' }: { at: Pt; anchor: Pt; title: string; meters: number; tone?: 'orange' | 'sage' }) {
  const line = tone === 'sage' ? SAGE_DARK : ORANGE;
  const ink = tone === 'sage' ? SAGE_DARK : ORANGE_DEEP;
  return (
    <g data-tone={tone}>
      <line x1={anchor.x} y1={anchor.y} x2={at.x} y2={at.y} stroke={line} strokeWidth={0.28} strokeDasharray="0.7 0.55" strokeLinecap="round" />
      <circle cx={anchor.x} cy={anchor.y} r={0.55} fill={line} />
      <g transform={`translate(${at.x} ${at.y})`}>
        <rect x={-6} y={-3.6} width={12} height={8} rx={1.9} fill="#566b46" opacity={0.12} transform="translate(0 0.45)" />
        <rect x={-6} y={-4} width={12} height={8} rx={1.9} fill={PAPER} stroke={line} strokeWidth={0.32} />
        <text y={-0.7} textAnchor="middle" fontSize={2.4} fontWeight={800} fill={ink} style={FONT}>
          {title}
        </text>
        <text y={2.6} textAnchor="middle" fontSize={2.3} fontWeight={600} fill={INK} style={FONT}>
          {`כ־${meters} מ׳`}
        </text>
      </g>
    </g>
  );
}

type MarkerState = 'idle' | 'active' | 'passed';

/** Route-story checkpoint marker: white = ahead, orange = in focus, sage ✓ = verified. */
function Marker({ p, kind, n, state }: { p: Pt; kind: 'start' | 'cp' | 'end'; n?: number; state: MarkerState }) {
  const r = kind === 'cp' ? 2.3 : 2.5;
  let fill = '#FFFFFF';
  let ring = SAGE_DARK;
  let ink = SAGE_DARK;
  if (state === 'active') {
    fill = ORANGE;
    ring = ORANGE_DEEP;
    ink = '#FFFFFF';
  } else if (state === 'passed') {
    fill = SAGE;
    ring = SAGE_DARK;
    ink = '#FFFFFF';
  } else if (kind === 'end') {
    ring = ORANGE;
    ink = ORANGE_DEEP;
  }
  const endLabel = kind === 'start' ? 'נ.ה' : kind === 'end' ? 'נ.ס' : null;
  return (
    <g data-marker={kind === 'cp' ? n : kind} data-state={state} data-x={p.x} data-y={p.y}>
      <ellipse cx={p.x} cy={fx(p.y + r + 0.55)} rx={r * 0.9} ry={r * 0.3} fill="#4A5240" opacity="0.14" />
      <circle cx={p.x} cy={p.y} r={r + 0.85} fill={PAPER} stroke={HAIR} strokeWidth="0.15" />
      <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={ring} strokeWidth={state === 'idle' ? 0.45 : 0.3} />
      {state === 'passed' ? (
        <path d={`M${fx(p.x - 1.05)} ${fx(p.y + 0.05)} L${fx(p.x - 0.3)} ${fx(p.y + 0.8)} L${fx(p.x + 1.1)} ${fx(p.y - 0.8)}`} fill="none" stroke="#FFFFFF" strokeWidth={0.55} strokeLinecap="round" strokeLinejoin="round" />
      ) : kind === 'cp' ? (
        <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={2.5} fontWeight={800} fill={ink} style={FONT}>
          {n}
        </text>
      ) : (
        <circle cx={p.x} cy={p.y} r={0.85} fill={ink} />
      )}
      {endLabel && (
        <g>
          <rect x={fx(p.x - 3.7)} y={fx(p.y + 4)} width={7.4} height={3.8} rx={1.9} fill={PAPER} stroke={kind === 'end' ? ORANGE : SAGE_DARK} strokeWidth="0.22" />
          <text x={p.x} y={fx(p.y + 6.75)} textAnchor="middle" fontSize={2.3} fontWeight={700} fill={kind === 'end' ? ORANGE_DEEP : SAGE_DARK} style={FONT}>
            {endLabel}
          </text>
        </g>
      )}
    </g>
  );
}

/** Legend glyphs for the board under the map — drawn like the map's own marks. */
export function TipsLegendGlyph({ kind }: { kind: 'route' | 'ahead' | 'walked' | 'checkpoint' | 'verified' | 'position' }) {
  return (
    <svg viewBox="0 0 20 12" className="h-3.5 w-6 shrink-0 overflow-visible" aria-hidden>
      {kind === 'route' && <line x1="1.5" y1="6" x2="18.5" y2="6" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" />}
      {kind === 'ahead' && <line x1="1.5" y1="6" x2="18.5" y2="6" stroke={ORANGE} strokeWidth="1.6" strokeDasharray="3 2.4" strokeLinecap="round" />}
      {kind === 'walked' && <line x1="1.5" y1="6" x2="18.5" y2="6" stroke={SAGE_DARK} strokeWidth="1.8" strokeLinecap="round" />}
      {kind === 'checkpoint' && (
        <g>
          <circle cx="10" cy="6" r="4.6" fill="#FFFFFF" stroke={SAGE_DARK} strokeWidth="1" />
          <text x="10" y="6" textAnchor="middle" dominantBaseline="central" fontSize="6" fontWeight={800} fill={SAGE_DARK} style={FONT}>
            1
          </text>
        </g>
      )}
      {kind === 'verified' && (
        <g>
          <circle cx="10" cy="6" r="4.6" fill={SAGE} stroke={SAGE_DARK} strokeWidth="0.8" />
          <path d="M7.9 6.1 L9.4 7.6 L12.2 4.6" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {kind === 'position' && (
        <g>
          <circle cx="10" cy="6" r="4.4" fill="#ffffff" className="stroke-accent-cool" strokeWidth="1.3" />
          <circle cx="10" cy="6" r="2" className="fill-accent-cool" />
        </g>
      )}
    </svg>
  );
}

const NAV_FOCUSES: readonly NavFocus[] = ['verify', 'compare', 'combine', 'mismatch'];
const isNav = (f: MapFocus): f is NavFocus => (NAV_FOCUSES as readonly string[]).includes(f);

/** How far along the route the navigator has walked in a navigate focus (legs fully walked). */
const WALKED_LEGS: Record<NavFocus, number> = { verify: 1, compare: 1, combine: 2, mismatch: 2 };

export function NavTipsMap({ focus, ariaLabel }: { focus: MapFocus; ariaLabel: string }) {
  const reduce = !!useReducedMotion();
  const id = useSvgId('navtips');
  const nav = isNav(focus) ? focus : null;

  // The current position glides to its new spot when the tip changes (once — no loop).
  const target = nav ? POSITION[nav] : START;
  const px = useMotionValue(target.x);
  const py = useMotionValue(target.y);
  useEffect(() => {
    if (reduce) {
      px.jump(target.x);
      py.jump(target.y);
      return;
    }
    const a = animate(px, target.x, { duration: 0.45, ease: EASE });
    const b = animate(py, target.y, { duration: 0.45, ease: EASE });
    return () => {
      a.stop();
      b.stop();
    };
  }, [target.x, target.y, reduce, px, py]);

  const walked = nav ? WALKED_LEGS[nav] : 0;
  /** Plan screen: the planned route is solid orange — full weight when the tip is about it. */
  const planStrong = focus === 'route' || focus === 'legs';

  const markerState = (i: number): MarkerState => {
    if (nav) {
      if (nav === 'verify') return i <= 1 ? 'passed' : 'idle';
      if (nav === 'compare') return i <= 1 ? 'passed' : i === 2 ? 'active' : 'idle';
      if (nav === 'combine') return i <= 2 ? 'passed' : 'idle';
      // mismatch: the saddle is the last verified point; the road crossing is expected and missing
      return i <= 2 ? 'passed' : i === 3 ? 'active' : 'idle';
    }
    if (focus === 'ends') return i === 0 || i === 4 ? 'active' : 'idle';
    if (focus === 'checkpoints') return i >= 1 && i <= 3 ? 'active' : 'idle';
    return 'idle';
  };

  const fade = {
    initial: reduce ? false : ({ opacity: 0 } as const),
    animate: { opacity: 1 },
    exit: reduce ? undefined : { opacity: 0, transition: { duration: 0.12 } },
    transition: { duration: 0.25, ease: EASE },
  };

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="block w-full h-auto select-none"
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
      role="img"
      aria-label={ariaLabel}
      data-focus={focus}
    >
      <defs>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="55%" stopColor="#FBF3E4" />
          <stop offset="100%" stopColor="#F3E7D2" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.85" cy="0" r="1">
          <stop offset="0%" stopColor="#FFDCB5" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#FFDCB5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-vignette`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="70%" stopColor="#6b5a38" stopOpacity="0" />
          <stop offset="100%" stopColor="#6b5a38" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient id={`${id}-hill`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0%" stopColor="#d9cfa6" />
          <stop offset="100%" stopColor="#b7bd92" />
        </radialGradient>
      </defs>

      {/* Paper base + warm sun wash */}
      <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${id}-paper)`} />
      <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${id}-sun)`} />

      {/* Fine map grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={'gx' + i} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2={VB_H} className="stroke-border-subtle" strokeWidth="0.08" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={'gy' + i} x1="0" y1={(i + 1) * 10} x2={VB_W} y2={(i + 1) * 10} className="stroke-border-subtle" strokeWidth="0.08" />
      ))}

      {/* Broad topographic contour lines */}
      {CONTOURS.map((d, i) => (
        <path key={'c' + i} d={d} fill="none" stroke="#C9A56B" strokeWidth="0.2" opacity="0.4" strokeLinecap="round" />
      ))}

      {/* Stream — bends at checkpoint 1 */}
      <path d={STREAM} fill="none" stroke="#7FB4C6" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
      <path d={STREAM} fill="none" stroke="#4f8397" strokeWidth="0.45" strokeLinecap="round" opacity="0.55" />

      {/* Ridge — two summits and the saddle (checkpoint 2) between them */}
      <g transform={`translate(${P2.x} ${P2.y}) rotate(${RIDGE_ROT})`}>
        <path
          d="M -15.5 0 C -15.5 -8, -5 -8.6, 0 -3.4 C 5 -8.6, 15.5 -8, 15.5 0 C 15.5 8, 5 8.6, 0 3.4 C -5 8.6, -15.5 8, -15.5 0 Z"
          fill={`url(#${id}-hill)`}
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

      {/* Dirt road — crossed at checkpoint 3 */}
      <path d={ROAD} fill="none" stroke="#C9A56B" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
      <path d={ROAD} fill="none" stroke="#9c7e48" strokeWidth="0.3" strokeDasharray="1.4 1" strokeLinecap="round" opacity="0.6" />

      {/* Terrain objects */}
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
        <PaperHouse x={BUILDING.x - 1.8} y={BUILDING.y - 1.4} w={3.6} h={2.8} />
      </g>

      {/* ——— Halos under the route (the features a tip is about) ——— */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.g key={'halo-' + focus} data-layer="halos" {...fade}>
          <FocusHalos focus={focus} />
        </motion.g>
      </AnimatePresence>

      {/* ——— Route ——— */}
      {POINTS.slice(1).map((b, k) => (
        <line key={'bed' + k} x1={POINTS[k].x} y1={POINTS[k].y} x2={b.x} y2={b.y} stroke="#cdba90" strokeWidth="2.3" strokeLinecap="round" opacity="0.5" />
      ))}
      {focus === 'route' && (
        <line x1={START.x} y1={START.y} x2={END.x} y2={END.y} stroke={INK} strokeOpacity={0.6} strokeWidth="0.5" strokeDasharray="1.1 1.1" strokeLinecap="round" />
      )}
      {POINTS.slice(1).map((b, k) => {
        const a = POINTS[k];
        if (k < walked) {
          return <line key={'leg' + k} data-walked="leg" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={SAGE_DARK} strokeWidth="0.85" strokeLinecap="round" opacity="0.8" />;
        }
        if (!nav) {
          return (
            <line key={'leg' + k} data-planned="leg" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ORANGE} strokeWidth={planStrong ? 1.05 : 0.7} strokeLinecap="round" opacity={planStrong ? 1 : 0.7} />
          );
        }
        // navigate: the rest of the plan is still ahead — dashed, as in the route-story map
        return <line key={'leg' + k} data-ahead="leg" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ORANGE} strokeWidth="0.55" strokeLinecap="round" strokeDasharray="1.3 1.1" opacity="0.7" />;
      })}
      {/* the part of a leg walked so far (compare) or walked off the plan (mismatch) */}
      {nav === 'compare' && <line data-walked="part" x1={P1.x} y1={P1.y} x2={POSITION.compare.x} y2={POSITION.compare.y} stroke={SAGE_DARK} strokeWidth="0.85" strokeLinecap="round" opacity="0.8" />}
      {nav === 'mismatch' && <line data-walked="drift" x1={P2.x} y1={P2.y} x2={DRIFT_END.x} y2={DRIFT_END.y} stroke={SAGE_DARK} strokeWidth="0.85" strokeLinecap="round" opacity="0.8" />}

      {/* ——— Overlays on the route (arrows, tags) ——— */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.g key={'over-' + focus} data-layer="marks" {...fade}>
          <FocusRouteMarks focus={focus} />
        </motion.g>
      </AnimatePresence>

      {/* ——— Markers ——— */}
      {POINTS.map((p, i) => (
        <Marker key={i} p={p} kind={i === 0 ? 'start' : i === POINTS.length - 1 ? 'end' : 'cp'} n={i} state={markerState(i)} />
      ))}

      {/* ——— Current position (navigate screen only) ——— */}
      {nav && (
        <g data-position={nav} data-x={POSITION[nav].x} data-y={POSITION[nav].y}>
          <UnitPuck x={px} y={py} r={2} />
        </g>
      )}

      {/* ——— Labels on top ——— */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.g key={'labels-' + focus} data-layer="labels" {...fade}>
          <FocusLabels focus={focus} />
        </motion.g>
      </AnimatePresence>

      {/* ——— Map furniture: north arrow + scale bar ——— */}
      <g transform="translate(93.5 9)" opacity="0.85">
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
        <text x="0" y="-3.85" textAnchor="middle" fontSize="2.2" fontWeight={700} className="fill-brand-dark" style={FONT}>
          צ
        </text>
      </g>
      <g transform={`translate(${fx(86 - 500 / M_PER_UNIT)} 7.4)`} opacity="0.85">
        <rect x="0" y="0" width={fx(500 / M_PER_UNIT)} height="0.9" fill="#FFFFFF" className="stroke-border-strong" strokeWidth="0.12" />
        <rect x="0" y="0" width={fx(500 / M_PER_UNIT / 4)} height="0.9" className="fill-terrain-ridge" />
        <rect x={fx(500 / M_PER_UNIT / 2)} y="0" width={fx(500 / M_PER_UNIT / 4)} height="0.9" className="fill-terrain-ridge" />
        <text x="0" y="-0.8" textAnchor="middle" fontSize="2.2" className="fill-fg-dim" style={FONT}>
          0
        </text>
        <text x={fx(500 / M_PER_UNIT)} y="-0.8" textAnchor="middle" fontSize="2.2" className="fill-fg-dim" style={FONT}>
          500 מ׳
        </text>
      </g>

      {/* edge vignette for depth */}
      <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${id}-vignette)`} pointerEvents="none" />
    </svg>
  );
}

function FocusHalos({ focus }: { focus: MapFocus }) {
  switch (focus) {
    case 'ends':
      return (
        <>
          <Halo name="start" p={{ x: 87.6, y: 59 }} r={6.2} />
          <Halo name="end" p={{ x: 13, y: 21.4 }} r={8.2} />
        </>
      );
    case 'route':
      return (
        <>
          <Halo name="summit-n" p={SUMMIT_N} r={5.6} />
          <Halo name="cp2" p={P2} r={4.4} />
        </>
      );
    case 'checkpoints':
      return (
        <>
          {[P1, P2, P3].map((p, i) => (
            <Halo key={i} name={`cp${i + 1}`} p={p} r={4.4} />
          ))}
        </>
      );
    case 'verify':
      return <Halo name="cp1" p={P1} r={4.6} />;
    case 'compare':
      return (
        <>
          <Halo name="summit-n" p={SUMMIT_N} r={5} />
          <Halo name="summit-s" p={SUMMIT_S} r={5} />
          <Halo name="cp2" p={P2} r={4.2} dashed />
        </>
      );
    case 'combine':
      return <Halo name="cp2" p={P2} r={4.6} />;
    case 'mismatch':
      // only the mismatch: the road crossing that was expected and has not appeared
      return <Halo name="cp3" p={P3} r={4.6} dashed />;
    default:
      return null;
  }
}

/** Leg midpoint offsets for the four leg tags (side of the leg, clear of terrain and markers). */
const LEG_TAG_AT: Pt[] = [
  { x: 74, y: 67.6 },
  { x: 62.2, y: 51.2 },
  { x: 36.2, y: 47 },
  { x: 25, y: 21.2 },
];
const LEG_TAG_ANCHOR = [0.5, 0.35, 0.35, 0.5];

function FocusRouteMarks({ focus }: { focus: MapFocus }) {
  switch (focus) {
    case 'legs':
      return (
        <>
          {POINTS.slice(1).map((b, k) => {
            const a = POINTS[k];
            return <Arrowhead key={'ah' + k} at={lerp(a, b, 0.66)} az={bearing(a, b)} />;
          })}
          {POINTS.slice(1).map((b, k) => (
            <LegTag key={'tag' + k} at={LEG_TAG_AT[k]} anchor={lerp(POINTS[k], b, LEG_TAG_ANCHOR[k])} title={`קטע ${k + 1}`} meters={TIP_LEGS[k].m} />
          ))}
        </>
      );
    case 'route':
      return (
        <>
          {POINTS.slice(1).map((b, k) => {
            const a = POINTS[k];
            return <Arrowhead key={'ah' + k} at={lerp(a, b, 0.6)} az={bearing(a, b)} />;
          })}
        </>
      );
    case 'verify': {
      // the direction to the next leg, drawn out of the verified point
      const tip = lerp(P1, P2, 0.42);
      return (
        <>
          <line x1={P1.x} y1={P1.y} x2={tip.x} y2={tip.y} stroke={ORANGE} strokeWidth="2.2" strokeLinecap="round" opacity="0.2" />
          <line x1={P1.x} y1={P1.y} x2={tip.x} y2={tip.y} stroke={ORANGE} strokeWidth="1.05" strokeLinecap="round" />
          <Arrowhead at={tip} az={bearing(P1, P2)} s={1.3} />
        </>
      );
    }
    case 'combine':
      return (
        <>
          <Arrowhead at={lerp(P1, P2, 0.66)} az={bearing(P1, P2)} fill={SAGE_DARK} s={1.2} />
          <LegTag at={LEG_TAG_AT[1]} anchor={lerp(P1, P2, LEG_TAG_ANCHOR[1])} title="מרחק" meters={TIP_LEGS[1].m} tone="sage" />
        </>
      );
    default:
      return null;
  }
}

function FocusLabels({ focus }: { focus: MapFocus }) {
  switch (focus) {
    case 'ends':
      return (
        <>
          <Callout at={{ x: 87.2, y: 50.6 }}>מבנה בולט</Callout>
          <Callout at={{ x: 18.5, y: 9.4 }}>אורנים על קרקע סלעית</Callout>
        </>
      );
    case 'route':
      return (
        <>
          <Callout at={{ x: 57.8, y: 32.6 }}>הקו הישיר: מעל הפסגה</Callout>
          <Callout at={{ x: 55.4, y: 50.3 }}>אוכף</Callout>
        </>
      );
    case 'checkpoints':
      return (
        <>
          <Callout at={{ x: 66, y: 66.6 }}>1 · עיקול הנחל</Callout>
          <Callout at={{ x: 55.4, y: 50.3 }}>2 · אוכף</Callout>
          <Callout at={{ x: 43.4, y: 27.8 }}>3 · חציית דרך עפר</Callout>
          <Callout at={{ x: 18.5, y: 9.4 }}>נ.ס · אורנים על קרקע סלעית</Callout>
        </>
      );
    case 'verify':
      return (
        <>
          <Callout at={{ x: 66, y: 66.8 }} tone="sage">
            מיקום מזוהה: עיקול הנחל
          </Callout>
          <Callout at={{ x: 61.4, y: 50.4 }} tone="orange">
            הכיוון לקטע הבא
          </Callout>
        </>
      );
    case 'compare':
      return (
        <>
          <Callout at={{ x: SUMMIT_N.x, y: fx(SUMMIT_N.y - 7.4) }}>פסגה</Callout>
          <Callout at={{ x: fx(SUMMIT_S.x - 1), y: fx(SUMMIT_S.y + 7.6) }}>פסגה</Callout>
          <Callout at={{ x: 35.6, y: 49.6 }} tone="orange" dashed>
            צפוי: אוכף
          </Callout>
        </>
      );
    case 'combine':
      return (
        <>
          <Callout at={{ x: 53.4, y: 58.6 }} tone="sage">
            כיוון
          </Callout>
          <Callout at={{ x: 35.6, y: 49.6 }} tone="sage">
            סימן: אוכף
          </Callout>
        </>
      );
    case 'mismatch':
      return (
        <>
          <Callout at={{ x: 21.6, y: 37.4 }} tone="orange" dashed>
            צפוי: חציית דרך עפר
          </Callout>
          <Callout at={{ x: 40.5, y: 20.6 }}>{`כ־${TIP_LEGS[2].m} מ׳: דרך העפר לא הופיעה`}</Callout>
        </>
      );
    default:
      return null;
  }
}
