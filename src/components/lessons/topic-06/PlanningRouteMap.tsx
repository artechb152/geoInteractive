'use client';
/**
 * PlanningRouteMap — the illustrated route-story map for PlanningScene (topic-06).
 *
 * Every number and place comes from route-story/routeStoryModel: each leg is
 * a straight azimuth line whose bearing and length are the leg's data, the
 * stream, road, saddle and pines are the signs the story names, at the places
 * it names them. North is always up — the SVG is never mirrored for RTL.
 *
 * What is drawn for the selected stop (a point or a leg):
 *   - a selected leg   → solid orange with its azimuth arc at the leg start,
 *                        an arrow and a tag „letter · az° · m מ׳”; its end
 *                        point gets an orange ring, the signs it passes and
 *                        the sign at its end get dashed / solid rings.
 *   - a selected point → its marker in orange and its own sign ringed; the
 *                        leg LEAVING it is drawn dashed orange with the same
 *                        tag, so the numbers read as the outgoing leg's.
 *   - legs before the selection are muted solid (walked), later ones dashed.
 *   - leg ד׳ is the learner's to write: until it is done its tag shows „?”,
 *     its rings stay off and the scale bar is outlined as the tool to use.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  FEATURES,
  GROVE_PINES,
  LEGS,
  M_PER_UNIT,
  POINTS,
  POINT_XY,
  ROAD,
  STOPS,
  STREAM,
  SADDLE_ROTATE,
  SUMMIT_OFFSET,
  TARGET_PINES,
  TARGET_ROCKS,
  VIEW_H,
  VIEW_W,
  deg,
  halos as halosOf,
  isHidden,
  legStates,
  lerp,
  pathD,
  pointStates,
  polar,
  shownLeg,
  stopIndex,
  type Deco,
  type Pt,
  type Stop,
} from './route-story/routeStoryModel';

export type { Deco };

// ——— Palette (design tokens mirrored as hex for SVG paint) ———
export const ORANGE = '#D97E2B'; // accent
export const ORANGE_DEEP = '#C96714'; // ember-deep
export const SAGE = '#749C75'; // brand
export const SAGE_DARK = '#5B7C5C'; // brand-dark
export const INK = '#38432E'; // fg
export const PAPER = '#FFFDF9';
export const HAIR = '#DCCDB2'; // tanline
export const FONT = { fontFamily: 'var(--font-rubik), system-ui, sans-serif' };
export const EASE = [0.22, 1, 0.36, 1] as const;

const fx = (n: number) => Math.round(n * 100) / 100;

// ——— Terrain objects ———
export function Pine({ x, y, s = 1 }: Deco) {
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

export function Bush({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.15 * s} rx={1.3 * s} ry={0.3 * s} fill="#566b46" opacity={0.14} />
      <circle cx={-0.55 * s} cy={-0.4 * s} r={0.8 * s} fill="#55613C" />
      <circle cx={0.55 * s} cy={-0.35 * s} r={0.7 * s} fill="#6E7A4E" />
      <circle cx={0} cy={-0.8 * s} r={0.85 * s} fill="#8A9163" />
    </g>
  );
}

export function Rock({ x, y, s = 1 }: Deco) {
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

export function Cairn({ x, y, s = 1 }: Deco) {
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
  // on the two summits flanking the saddle (point 3)
  { x: 46.6, y: 43.2, s: 0.85 },
  { x: 50.1, y: 41.6, s: 0.95 },
  { x: 60.2, y: 58.4, s: 0.85 },
  // the grove leg ד׳ passes, and the pine cluster on rocky ground at נ.ס (model data)
  ...GROVE_PINES,
  ...TARGET_PINES,
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

const ROCKS: Deco[] = [{ x: 9, y: 61, s: 0.7 }, { x: 37.5, y: 65.5, s: 0.7 }, { x: 66, y: 62, s: 0.7 }, ...TARGET_ROCKS];

const CAIRNS: Deco[] = [
  { x: 41.5, y: 60.8, s: 0.8 },
  { x: 74.6, y: 37.6, s: 0.8 },
];

/** Per leg: which side of the leg its tag sits on (1 = right of the walking direction) and how far along it slides, clear of terrain, markers and labels. */
const TAG_PLACE: { side: 1 | -1; along: number }[] = [
  { side: 1, along: 0 },
  { side: -1, along: 0 },
  { side: 1, along: 2 },
  { side: 1, along: 0 },
];
const TAG_W = 15.6;
const TAG_H = 8.4;
/** Gap between the leg and the nearest edge of its tag. */
const TAG_GAP = 2.2;

// ——— Leg tag: the leg's letter, azimuth and distance (the numbers of the list) ———
function LegTag({ legIdx, hidden, dashed, reduce }: { legIdx: number; hidden: boolean; dashed: boolean; reduce: boolean }) {
  const leg = LEGS[legIdx];
  const a = POINT_XY[leg.from];
  const b = POINT_XY[leg.to];
  const mid = lerp(a, b, 0.5);
  const place = TAG_PLACE[legIdx];
  const r = (leg.az * Math.PI) / 180;
  // out = how far the box reaches along the leg's normal + a gap, so the tag never covers its own leg
  const out = (TAG_W / 2) * Math.abs(Math.cos(r)) + (TAG_H / 2) * Math.abs(Math.sin(r)) + TAG_GAP;
  const at = {
    x: fx(mid.x + place.side * Math.cos(r) * out + Math.sin(r) * place.along),
    y: fx(mid.y + place.side * Math.sin(r) * out - Math.cos(r) * place.along),
  };
  return (
    <g data-tag-leg={legIdx} data-hidden={hidden || undefined} pointerEvents="none">
      <line x1={mid.x} y1={mid.y} x2={at.x} y2={at.y} stroke={ORANGE} strokeWidth={0.28} strokeDasharray="0.7 0.55" strokeLinecap="round" />
      <circle cx={mid.x} cy={mid.y} r={0.7} fill={ORANGE_DEEP} />
      <g transform={`translate(${at.x} ${at.y})`}>
        <motion.g
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE, delay: reduce ? 0 : 0.25 }}
        >
          <rect x={-TAG_W / 2} y={-TAG_H / 2 + 0.4} width={TAG_W} height={TAG_H} rx={1.9} fill="#566b46" opacity={0.12} />
          <rect
            x={-TAG_W / 2}
            y={-TAG_H / 2}
            width={TAG_W}
            height={TAG_H}
            rx={1.9}
            fill={PAPER}
            stroke={ORANGE}
            strokeWidth={0.32}
            strokeDasharray={dashed ? '1.1 0.7' : undefined}
          />
          {/* the leg's letter first, on the right (Hebrew reading order); the drawing itself is not mirrored */}
          <circle cx={TAG_W / 2 - 3.1} cy={0} r={2.3} fill={ORANGE_DEEP} />
          <text x={TAG_W / 2 - 3.1} y={0.05} textAnchor="middle" dominantBaseline="central" fontSize={2.5} fontWeight={800} fill="#FFFFFF" style={FONT}>
            {leg.letter}
          </text>
          <text x={-1.9} y={-0.55} textAnchor="middle" fontSize={3} fontWeight={800} fill={ORANGE_DEEP} style={FONT} direction="ltr">
            {hidden ? '?°' : deg(leg.az)}
          </text>
          <text x={-1.9} y={2.95} textAnchor="middle" fontSize={2.4} fontWeight={700} fill={INK} style={FONT}>
            {hidden ? '? מ׳' : `${leg.m} מ׳`}
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
    <g data-arc>
      <line x1={p.x} y1={fx(p.y - 3.7)} x2={p.x} y2={fx(p.y - 9.2)} stroke={SAGE_DARK} strokeWidth={0.3} strokeDasharray="0.7 0.5" />
      <text x={p.x} y={fx(p.y - 9.9)} textAnchor="middle" fontSize={2.2} fontWeight={700} fill={SAGE_DARK} style={FONT}>
        צ
      </text>
      <path d={`M ${a0.x} ${a0.y} A ${r} ${r} 0 0 1 ${a1.x} ${a1.y}`} fill="none" stroke={ORANGE_DEEP} strokeWidth={0.36} strokeLinecap="round" />
    </g>
  );
}

function Arrowhead({ at, az, fill }: { at: Pt; az: number; fill: string }) {
  return <path d="M0 -1.9 L 1.5 1.2 L 0 0.5 L -1.5 1.2 Z" transform={`translate(${at.x} ${at.y}) rotate(${az})`} fill={fill} />;
}

/** The arrow sits a fixed distance before the leg's end (not a fraction of it), clear of the end marker and the tag. */
function arrowAt(a: Pt, b: Pt): Pt {
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  return lerp(a, b, Math.max(0.5, (L - 6.5) / L));
}

/** A ring around a sign the story names (a pin for a point on the stream); solid = the sign to check, dashed = one passed on the way. */
function Halo({ feature, role, reduce }: { feature: keyof typeof FEATURES; role: 'point' | 'along' | 'end'; reduce: boolean }) {
  const f = FEATURES[feature];
  return (
    <motion.g
      data-halo={feature}
      data-role={role}
      pointerEvents="none"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: reduce ? 0 : 0.3 }}
    >
      {f.pin ? (
        <circle cx={f.at.x} cy={f.at.y} r={f.rx} fill={PAPER} stroke={ORANGE_DEEP} strokeWidth={0.45} strokeDasharray={role === 'along' ? '0.8 0.5' : undefined} />
      ) : (
      <ellipse
        cx={f.at.x}
        cy={f.at.y}
        rx={f.rx}
        ry={f.ry}
        transform={f.rotate ? `rotate(${f.rotate} ${f.at.x} ${f.at.y})` : undefined}
        fill={ORANGE}
        fillOpacity={role === 'along' ? 0.04 : 0.08}
        stroke={ORANGE_DEEP}
        strokeWidth={role === 'along' ? 0.3 : 0.4}
        strokeDasharray={role === 'along' ? '1 0.8' : undefined}
      />
      )}
    </motion.g>
  );
}

function HaloLabel({ feature, role }: { feature: keyof typeof FEATURES; role: 'point' | 'along' | 'end' }) {
  const f = FEATURES[feature];
  if (!f.labelAt) return null;
  const w = fx(f.label.length * 1.4 + 2.8);
  const h = 4;
  return (
    <g data-halo-label={feature} pointerEvents="none">
      {/* a pin's label stands off the stream, so a dotted leader ties it to the pin */}
      {f.pin && <line x1={f.at.x} y1={f.at.y} x2={f.labelAt.x} y2={f.labelAt.y} stroke={ORANGE_DEEP} strokeWidth={0.25} strokeDasharray="0.5 0.45" />}
      <rect
        x={fx(f.labelAt.x - w / 2)}
        y={fx(f.labelAt.y - h / 2)}
        width={w}
        height={h}
        rx={h / 2}
        fill={PAPER}
        stroke={ORANGE_DEEP}
        strokeWidth={0.22}
        strokeDasharray={role === 'along' ? '0.9 0.6' : undefined}
      />
      <text x={f.labelAt.x} y={fx(f.labelAt.y + 0.05)} textAnchor="middle" dominantBaseline="central" fontSize={2.4} fontWeight={700} fill={ORANGE_DEEP} style={FONT}>
        {f.label}
      </text>
    </g>
  );
}

export function RouteMap({
  stop: stopIdx,
  done,
  onSelect,
  ariaLabel,
}: {
  /** Index into STOPS. */
  stop: number;
  /** Whether the learner has written leg ד׳. */
  done: boolean;
  onSelect: (stopIdx: number) => void;
  ariaLabel: string;
}) {
  const reduce = !!useReducedMotion();
  const stop: Stop = STOPS[stopIdx];
  const legsState = legStates(stop);
  const pointsState = pointStates(stop);
  const shown = shownLeg(stop);
  const shownHidden = shown !== null && isHidden(shown, done);
  const rings = halosOf(stop, done);
  const points = POINT_XY;
  const scaleLen = fx(500 / M_PER_UNIT);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="block w-full h-auto select-none"
      style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      role="img"
      aria-label={ariaLabel}
      data-stop={`${stop.kind}:${stop.i}`}
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
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#pl6-paper)" />
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#pl6-sun)" />

      {/* Fine map grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={'gx' + i} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2={VIEW_H} className="stroke-border-subtle" strokeWidth="0.08" />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={'gy' + i} x1="0" y1={(i + 1) * 10} x2={VIEW_W} y2={(i + 1) * 10} className="stroke-border-subtle" strokeWidth="0.08" />
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

      {/* Stream — bends south at point 2; leg ב׳ crosses it just after */}
      <g>
        <path d={pathD(STREAM)} fill="none" stroke="#7FB4C6" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
        <path d={pathD(STREAM)} fill="none" stroke="#4f8397" strokeWidth="0.45" strokeLinecap="round" opacity="0.55" />
      </g>

      {/* Ridge saddle — two summits with the low pass (col) the route threads at point 3 */}
      <g transform={`translate(${points[2].x} ${points[2].y}) rotate(${SADDLE_ROTATE})`}>
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
        {[-SUMMIT_OFFSET, SUMMIT_OFFSET].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy={0} rx={5.2} ry={4.9} fill="none" stroke="#7a8a5a" strokeWidth="0.18" opacity="0.6" />
            <ellipse cx={cx} cy={0} rx={3.3} ry={3.1} fill="#c9c79b" opacity="0.45" stroke="#7a8a5a" strokeWidth="0.16" />
            <ellipse cx={cx} cy={0} rx={1.5} ry={1.4} fill="none" stroke="#7a8a5a" strokeWidth="0.14" opacity="0.6" />
          </g>
        ))}
      </g>

      {/* Wide dirt road the route crosses at point 4 */}
      <g>
        <path d={pathD(ROAD)} fill="none" stroke="#9c7e48" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        <path d={pathD(ROAD)} fill="none" stroke="#EADBB5" strokeWidth="1.45" strokeLinecap="round" />
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

      {/* rings on the signs of the selection (under the route, so lines and markers stay crisp) */}
      <g key={'rings' + stopIdx + String(done)}>
        {rings.map((h) => (
          <Halo key={h.feature} feature={h.feature} role={h.role} reduce={reduce} />
        ))}
      </g>

      {/* saddle name — beside the pass, clear of the route and the leg tags */}
      <g pointerEvents="none">
        <line x1={49.6} y1={56.4} x2={fx(points[2].x - 1.9)} y2={fx(points[2].y + 2.9)} stroke={SAGE_DARK} strokeWidth={0.22} strokeDasharray="0.5 0.45" />
        <rect x={43.4} y={56.3} width={7.4} height={3.5} rx={1.75} fill={PAPER} opacity={0.92} stroke={HAIR} strokeWidth={0.15} />
        <text x={47.1} y={58.9} textAnchor="middle" fontSize="2.3" fontWeight={700} fill={SAGE_DARK} style={FONT}>
          אוכף
        </text>
      </g>

      {/* ——— Route ——— */}
      {/* dirt trail bed under every leg */}
      {LEGS.map((leg, j) => (
        <line
          key={'bed' + j}
          x1={points[leg.from].x}
          y1={points[leg.from].y}
          x2={points[leg.to].x}
          y2={points[leg.to].y}
          stroke="#cdba90"
          strokeWidth="2.3"
          strokeLinecap="round"
          opacity="0.5"
        />
      ))}
      {/* walked = muted solid, ahead = dashed; the shown leg is drawn below */}
      {LEGS.map((leg, j) => {
        const a = points[leg.from];
        const b = points[leg.to];
        const st = legsState[j];
        return (
          <g key={'leg' + j} data-leg={j} data-state={st} data-az={leg.az} data-m={leg.m} data-from={leg.from} data-to={leg.to}>
            {st === 'walked' && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={SAGE_DARK} strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />}
            {st === 'ahead' && (
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ORANGE} strokeWidth="0.55" strokeLinecap="round" strokeDasharray="1.3 1.1" opacity="0.6" />
            )}
          </g>
        );
      })}

      {/* the shown leg: the selected one (solid) or the one leaving the selected point (dashed) */}
      {shown !== null && (
        <g key={'cur' + stopIdx} data-shown-leg={shown}>
          <AzimuthArc p={points[LEGS[shown].from]} az={LEGS[shown].az} />
          <line
            x1={points[LEGS[shown].from].x}
            y1={points[LEGS[shown].from].y}
            x2={points[LEGS[shown].to].x}
            y2={points[LEGS[shown].to].y}
            stroke={ORANGE}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity={stop.kind === 'leg' ? 0.2 : 0.12}
          />
          {stop.kind === 'leg' ? (
            <motion.path
              d={`M ${points[LEGS[shown].from].x} ${points[LEGS[shown].from].y} L ${points[LEGS[shown].to].x} ${points[LEGS[shown].to].y}`}
              fill="none"
              stroke={ORANGE}
              strokeWidth={1.05}
              strokeLinecap="round"
              data-line="solid"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.55, ease: EASE }}
            />
          ) : (
            <motion.path
              d={`M ${points[LEGS[shown].from].x} ${points[LEGS[shown].from].y} L ${points[LEGS[shown].to].x} ${points[LEGS[shown].to].y}`}
              fill="none"
              stroke={ORANGE}
              strokeWidth={0.9}
              strokeLinecap="butt"
              strokeDasharray="1.7 1.3"
              data-line="dashed"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: EASE }}
            />
          )}
          <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: reduce ? 0 : 0.4 }}>
            <Arrowhead at={arrowAt(points[LEGS[shown].from], points[LEGS[shown].to])} az={LEGS[shown].az} fill={ORANGE_DEEP} />
          </motion.g>
        </g>
      )}

      {/* leg hit lines — click a leg to select it (under the markers) */}
      {LEGS.map((leg, j) => (
        <line
          key={'hit' + j}
          data-leg-hit={j}
          x1={points[leg.from].x}
          y1={points[leg.from].y}
          x2={points[leg.to].x}
          y2={points[leg.to].y}
          stroke="transparent"
          strokeWidth="3.4"
          className="cursor-pointer"
          onClick={() => onSelect(stopIndex('leg', j))}
        />
      ))}

      {rings.map((h) => (
        <HaloLabel key={'hl' + h.feature} feature={h.feature} role={h.role} />
      ))}

      {/* ——— Points (click = select that point) ——— */}
      {points.map((p, i) => {
        const isTarget = i === points.length - 1;
        const st = pointsState[i];
        const isActive = st === 'focus';
        const isPassed = st === 'passed' || st === 'from';
        const isTo = st === 'to';
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
        } else if (isTo || isTarget) {
          ring = ORANGE;
          numFill = ORANGE_DEEP;
        }
        const r = isActive ? 2.75 : isTarget || isTo ? 2.6 : 2.3;
        const endLabel = POINTS[i].abbr ?? null;
        // end-point label pill: fixed offset (doesn't jump with the active radius); target's nudged east, clear of the arriving leg
        const lx = isTarget ? fx(p.x + 1.6) : p.x;
        return (
          <g
            key={i}
            className="group cursor-pointer"
            onClick={() => onSelect(stopIndex('point', i))}
            data-marker={i}
            data-state={st}
            data-x={p.x}
            data-y={p.y}
          >
            <circle cx={p.x} cy={p.y} r={4.6} fill="transparent" />
            <ellipse cx={p.x} cy={fx(p.y + r + 0.55)} rx={r * 0.9} ry={r * 0.3} fill="#4A5240" opacity="0.14" />
            <circle cx={p.x} cy={p.y} r={r + 0.85} fill={PAPER} stroke={isTo ? ORANGE : HAIR} strokeWidth={isTo ? 0.35 : 0.15} />
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
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={isTarget ? 2.6 : 2.4} fontWeight={800} fill={numFill} style={FONT}>
              {POINTS[i].n}
            </text>
            {endLabel && (
              <g>
                <rect
                  x={fx(lx - 3.7)}
                  y={fx(p.y + 4.05)}
                  width={7.4}
                  height={3.7}
                  rx={1.85}
                  fill={PAPER}
                  stroke={isTarget ? ORANGE : SAGE_DARK}
                  strokeWidth="0.22"
                />
                <text x={lx} y={fx(p.y + 6.75)} textAnchor="middle" fontSize="2.3" fontWeight={700} fill={isTarget ? ORANGE_DEEP : SAGE_DARK} style={FONT}>
                  {endLabel}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* azimuth / distance tag of the shown leg */}
      <AnimatePresence mode="wait">
        {shown !== null && (
          <motion.g
            key={'tag' + stopIdx + String(done)}
            initial={{ opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.15 } }}
          >
            <LegTag legIdx={shown} hidden={shownHidden} dashed={stop.kind === 'point'} reduce={reduce} />
          </motion.g>
        )}
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
        <text x="0" y="-4.1" textAnchor="middle" fontSize="2.2" fontWeight={700} className="fill-brand-dark" style={FONT}>
          צ
        </text>
      </g>
      {/* scale bar — outlined while leg ד׳ is to be measured against it */}
      <g transform={`translate(${fx(90.5 - scaleLen)} 87.2)`} data-scale-bar data-hint={shownHidden || undefined}>
        {shownHidden && (
          <rect x={-3.8} y={-3.8} width={fx(scaleLen + 8.4)} height={5.8} rx={1.6} fill={PAPER} fillOpacity={0.85} stroke={ORANGE_DEEP} strokeWidth={0.3} strokeDasharray="1 0.7" />
        )}
        <g opacity={shownHidden ? 1 : 0.8}>
          <rect x="0" y="0" width={scaleLen} height="0.9" fill="#FFFFFF" className="stroke-border-strong" strokeWidth="0.12" />
          <rect x="0" y="0" width={fx(scaleLen / 4)} height="0.9" className="fill-terrain-ridge" />
          <rect x={fx(scaleLen / 2)} y="0" width={fx(scaleLen / 4)} height="0.9" className="fill-terrain-ridge" />
          <text x="0" y="-0.9" textAnchor="middle" fontSize="2.2" className="fill-fg-muted" style={FONT}>
            0
          </text>
          <text x={scaleLen} y="-0.9" textAnchor="middle" fontSize="2.2" className="fill-fg-muted" style={FONT}>
            500 מ׳
          </text>
        </g>
      </g>

      {/* edge vignette for depth */}
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#pl6-vignette)" pointerEvents="none" />
    </svg>
  );
}
