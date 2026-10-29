'use client';
/**
 * „מפת התכנון” of the replay — a topographic map of the same ground the 3D
 * view stands on: contours traced from the height field, the maquis where the
 * 3D scatter grows it, the stream and the dirt road from navTipsGeometry, north
 * up, never mirrored.
 *
 * What it shows is what the navigator KNOWS: the planned route, the last
 * identified point, the way verified so far, the next checkpoint and the
 * dead-reckoned estimate (always a dashed ring, labelled as an estimate). The
 * true track and position appear only in moment 4's debrief, after the
 * decision and its reason.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FONT, HAIR, INK, ORANGE, ORANGE_DEEP, PAPER, SAGE, SAGE_DARK } from '../PlanningRouteMap';
import { useSvgId } from '../CombatNavVisuals';
import { M_PER_UNIT, P1, P2, P3, ROAD, START, STREAM, SUMMIT_N, SUMMIT_S, bearing, fx, lerp, type Pt } from '../navTipsGeometry';
import { contourLines, toPath, type Box } from './replayContours';
import { heightAt, surfaceAt } from './replayTerrain';
import { shrubDensity, hash01 } from './replayScatter';
import { toWorld } from './replayWorld';
import { DRIFT_END, mapDescription, type MapState } from './replayScenario';

/** The crop of the planning sheet this map shows (map units): stream bend to road crossing. */
export const MAP_VIEW: Box = { x: 17.6, y: 18.6, w: 63, h: 46.88 };


const STREAM_BLUE = '#4f8fb0';
const CONTOUR = '#C9A56B';
const CONTOUR_INDEX = '#A9844B';
const TRUE_TRACK = '#2b3a4a';

// ——— static layers, computed once from the model ———
let cache: { contours: { d: string; index: boolean; level: number }[]; maquis: string; peaks: { at: Pt; h: number }[] } | null = null;
function staticLayers() {
  if (cache) return cache;
  const { lines } = contourLines(MAP_VIEW, { step: 0.4, interval: 5, indexEvery: 25 });
  const contours = lines.map((l) => ({ d: toPath(l.pts), index: l.index, level: l.level }));
  // maquis: a dot wherever the 3D scatter's density is high (the same function)
  let maquis = '';
  const step = 0.95;
  for (let y = MAP_VIEW.y; y < MAP_VIEW.y + MAP_VIEW.h; y += step)
    for (let x = MAP_VIEW.x; x < MAP_VIEW.x + MAP_VIEW.w; x += step) {
      const i = Math.round(x * 10);
      const j = Math.round(y * 10);
      const px = x + (hash01(i, j, 3) - 0.5) * step * 0.8;
      const py = y + (hash01(i, j, 4) - 0.5) * step * 0.8;
      const w = toWorld({ x: px, y: py });
      const s = surfaceAt(w.x, w.z);
      if (shrubDensity(w.x, w.z, s.roadD, s.streamD) < 0.5) continue;
      const r = 0.2 + 0.12 * hash01(i, j, 5);
      maquis += `M${fx(px - r)} ${fx(py)}a${fx(r)} ${fx(r)} 0 1 0 ${fx(2 * r)} 0a${fx(r)} ${fx(r)} 0 1 0 ${fx(-2 * r)} 0`;
    }
  const peaks = [SUMMIT_N, SUMMIT_S].map((p) => {
    const w = toWorld(p);
    return { at: p, h: Math.round(heightAt(w.x, w.z)) };
  });
  cache = { contours, maquis, peaks };
  return cache;
}

const LABEL = 1.75;

/** A paper pill label, sized to its rendered text once the font is ready (no stroke halo). */
function Callout({ at, children, tone = 'ink', dashed = false, data }: { at: Pt; children: string; tone?: 'ink' | 'orange' | 'sage' | 'truth'; dashed?: boolean; data?: string }) {
  const ref = useRef<SVGTextElement>(null);
  const [tw, setTw] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const t = ref.current;
      if (t) setTw(fx(t.getComputedTextLength()));
    };
    measure();
    document.fonts?.ready.then(measure);
  }, [children]);
  const w = fx((tw ?? children.length * 0.86) + 2.2);
  const stroke = tone === 'orange' ? ORANGE : tone === 'sage' ? SAGE_DARK : tone === 'truth' ? TRUE_TRACK : HAIR;
  const fill = tone === 'orange' ? ORANGE_DEEP : tone === 'sage' ? SAGE_DARK : tone === 'truth' ? TRUE_TRACK : INK;
  return (
    <g data-label={data}>
      <rect x={fx(at.x - w / 2)} y={fx(at.y - 1.6)} width={w} height={3.2} rx={1.6} fill={PAPER} stroke={stroke} strokeWidth={0.18} strokeDasharray={dashed ? '0.8 0.5' : undefined} />
      <text ref={ref} x={at.x} y={fx(at.y + 0.62)} textAnchor="middle" fontSize={LABEL} fontWeight={700} fill={fill} style={FONT}>
        {children}
      </text>
    </g>
  );
}

function Arrowhead({ at, az, fill = ORANGE_DEEP, s = 1 }: { at: Pt; az: number; fill?: string; s?: number }) {
  return <path d="M0 -1.35 L 1.05 0.85 L 0 0.35 L -1.05 0.85 Z" transform={`translate(${at.x} ${at.y}) rotate(${fx(az)}) scale(${s})`} fill={fill} />;
}

/** Verified point: sage disc with a tick. */
function FixMarker({ p, name }: { p: Pt; name: string }) {
  return (
    <g data-marker="fix" data-name={name} data-x={p.x} data-y={p.y}>
      <circle cx={p.x} cy={p.y} r={2.1} fill={PAPER} stroke={HAIR} strokeWidth={0.12} />
      <circle cx={p.x} cy={p.y} r={1.5} fill={SAGE} stroke={SAGE_DARK} strokeWidth={0.25} />
      <path d={`M${fx(p.x - 0.7)} ${fx(p.y + 0.04)} L${fx(p.x - 0.2)} ${fx(p.y + 0.55)} L${fx(p.x + 0.75)} ${fx(p.y - 0.55)}`} fill="none" stroke="#FFFFFF" strokeWidth={0.4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** Planned checkpoint ahead: an open ring. */
function PlanMarker({ p, name }: { p: Pt; name: string }) {
  return (
    <g data-marker="plan" data-name={name} data-x={p.x} data-y={p.y}>
      <circle cx={p.x} cy={p.y} r={1.15} fill="#FFFFFF" stroke={INK} strokeWidth={0.36} />
    </g>
  );
}

/** Dead-reckoned position: a dashed orange ring (an estimate, not a fix). */
function EstimateRing({ p }: { p: Pt }) {
  return (
    <g data-marker="estimate" data-x={p.x} data-y={p.y}>
      <circle cx={p.x} cy={p.y} r={2.5} fill={ORANGE} fillOpacity={0.08} stroke={ORANGE} strokeWidth={0.26} strokeDasharray="0.9 0.6" />
      <circle cx={p.x} cy={p.y} r={0.4} fill={ORANGE} />
    </g>
  );
}

function TruthPuck({ p }: { p: Pt }) {
  return (
    <g data-marker="truth" data-x={p.x} data-y={p.y}>
      <ellipse cx={fx(p.x + 0.25)} cy={fx(p.y + 0.65)} rx={1.45} ry={0.85} className="fill-fg" fillOpacity={0.2} />
      <circle cx={p.x} cy={p.y} r={1.45} fill="#ffffff" className="stroke-accent-cool" strokeWidth={0.45} />
      <circle cx={p.x} cy={p.y} r={0.65} className="fill-accent-cool" />
    </g>
  );
}

const line = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('');

export function ReplayMap({ state }: { state: MapState }) {
  const reduce = !!useReducedMotion();
  const id = useSvgId('replaymap');
  const L = useMemo(staticLayers, []);
  const { moment: m, saddleFixed, revealTruth } = state;
  const stateKey = `${m.id}-${saddleFixed ? 'f' : ''}${revealTruth ? 't' : ''}`;

  // what is known in this state
  const fixAt = m.id === 'after' || (m.id === 'saddle' && saddleFixed) ? P2 : P1;
  const fixName = fixAt === P2 ? 'האוכף' : 'עיקול הנחל';
  const walked: Pt[] = fixAt === P2 ? [START, P1, P2] : [START, P1];
  const ahead: Pt[] = fixAt === P2 ? [P2, P3] : [P1, P2, P3];
  const fade = {
    initial: reduce ? false : ({ opacity: 0 } as const),
    animate: { opacity: 1 },
    exit: reduce ? undefined : { opacity: 0, transition: { duration: 0.12 } },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  };
  const vb = `${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.w} ${MAP_VIEW.h}`;
  const scaleM = 500;
  const scaleU = scaleM / M_PER_UNIT;
  const sb = { x: MAP_VIEW.x + 2.6, y: MAP_VIEW.y + MAP_VIEW.h - 2.4 };

  return (
    <svg
      viewBox={vb}
      className="block h-full w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={mapDescription(state)}
      data-map-state={stateKey}
    >
      <defs>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFBF3" />
          <stop offset="100%" stopColor="#F6EBD8" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x={MAP_VIEW.x} y={MAP_VIEW.y} width={MAP_VIEW.w} height={MAP_VIEW.h} />
        </clipPath>
      </defs>
      <rect x={MAP_VIEW.x} y={MAP_VIEW.y} width={MAP_VIEW.w} height={MAP_VIEW.h} fill={`url(#${id}-paper)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* maquis */}
        <path d={L.maquis} fill="#7E9F64" fillOpacity={0.42} data-layer="maquis" />
        {/* contours from the height field */}
        <g data-layer="contours" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {L.contours.map((c, i) => (
            <path key={i} d={c.d} stroke={c.index ? CONTOUR_INDEX : CONTOUR} strokeWidth={c.index ? 0.24 : 0.12} opacity={c.index ? 0.95 : 0.8} data-level={c.level} />
          ))}
        </g>
        {/* seasonal stream: dashed blue */}
        <path d={STREAM} fill="none" stroke="#A9CFE0" strokeWidth={1.1} strokeLinecap="round" opacity={0.6} />
        <path d={STREAM} fill="none" stroke={STREAM_BLUE} strokeWidth={0.34} strokeDasharray="1.5 0.7" strokeLinecap="round" data-layer="stream" />
        {/* dirt road: double line */}
        <path d={ROAD} fill="none" stroke="#8f6d3a" strokeWidth={1.25} strokeLinecap="round" />
        <path d={ROAD} fill="none" stroke="#F6E7C8" strokeWidth={0.7} strokeLinecap="round" data-layer="road" />
        {/* spot heights */}
        {L.peaks.map((p) => (
          <g key={p.h}>
            <circle cx={p.at.x} cy={p.at.y} r={0.32} fill={INK} />
            <text x={p.at.x} y={fx(p.at.y - 0.8)} textAnchor="middle" fontSize={1.7} fontWeight={600} fill="#7a6440" style={FONT}>
              {p.h}
            </text>
          </g>
        ))}

        {/* ——— what the navigator knows ——— */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.g key={stateKey} {...fade} data-layer="route">
            <path d={line(walked)} fill="none" stroke={SAGE_DARK} strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" data-walked={walked.length - 1} />
            <path d={line(ahead)} fill="none" stroke={ORANGE} strokeWidth={0.5} strokeDasharray="1.1 0.85" strokeLinecap="round" strokeLinejoin="round" data-ahead={ahead.length - 1} />
            {m.id === 'depart' && <DepartArrow />}
            {revealTruth && m.id === 'after' && (
              <path d={line([P2, DRIFT_END])} fill="none" stroke={TRUE_TRACK} strokeWidth={0.6} strokeLinecap="round" data-truth="track" />
            )}
            {/* checkpoints */}
            <FixMarker p={fixAt} name={fixName} />
            {fixAt === P1 && <PlanMarker p={P2} name="אוכף" />}
            <PlanMarker p={P3} name="חציית דרך עפר" />
            {m.estimate && !(m.id === 'saddle' && saddleFixed) && <EstimateRing p={m.estimate.at} />}
            {revealTruth && m.id === 'after' && <TruthPuck p={DRIFT_END} />}
            <Labels state={state} fixAt={fixAt} />
          </motion.g>
        </AnimatePresence>
      </g>

      {/* north arrow (top-left) and scale bar (bottom-left) */}
      <g transform={`translate(${MAP_VIEW.x + 3.6} ${MAP_VIEW.y + 4.4})`}>
        <rect x={-2.2} y={-3.4} width={4.4} height={6.6} rx={0.8} fill={PAPER} opacity={0.9} stroke={HAIR} strokeWidth={0.15} />
        <text x={0} y={-0.9} textAnchor="middle" fontSize={2} fontWeight={700} fill={INK} style={FONT}>
          צ
        </text>
        <path d="M0 -0.1 L1.15 2.6 L0 2.0 L-1.15 2.6 Z" fill={INK} />
      </g>
      <g transform={`translate(${sb.x} ${sb.y})`} data-scale-m={scaleM}>
        <rect x={-1.2} y={-2.7} width={fx(scaleU + 2.6)} height={3.8} rx={0.7} fill={PAPER} opacity={0.9} />
        <rect x={0} y={0} width={fx(scaleU)} height={0.55} fill="#FFFFFF" stroke={INK} strokeWidth={0.12} />
        <rect x={0} y={0} width={fx(scaleU / 2)} height={0.55} fill={INK} />
        {[0, scaleU / 2, scaleU].map((x, i) => (
          <text key={i} x={fx(x)} y={-0.6} textAnchor="middle" fontSize={1.55} fill={INK} style={FONT}>
            {i === 0 ? '0' : i === 1 ? '250' : '500 מ׳'}
          </text>
        ))}
      </g>
    </svg>
  );
}

/** Moment 1: the direction to the next leg, drawn out of the identified point. */
function DepartArrow() {
  const tip = lerp(P1, P2, 0.42);
  return (
    <g data-mark="direction">
      <line x1={P1.x} y1={P1.y} x2={tip.x} y2={tip.y} stroke={ORANGE} strokeWidth={2.1} strokeLinecap="round" opacity={0.2} />
      <line x1={P1.x} y1={P1.y} x2={tip.x} y2={tip.y} stroke={ORANGE} strokeWidth={0.95} strokeLinecap="round" />
      <Arrowhead at={tip} az={bearing(P1, P2)} s={1.25} />
    </g>
  );
}

function Labels({ state, fixAt }: { state: MapState; fixAt: Pt }) {
  const { moment: m, saddleFixed, revealTruth } = state;
  const out: ReactNode[] = [];
  const fixLabel = m.id === 'depart' ? 'עיקול הנחל' : 'נקודה מזוהה אחרונה';
  // the fix label sits east of its marker (clear of the route, which leaves westwards)
  out.push(
    <Callout key="fix" at={fixAt === P1 ? { x: P1.x + 6.4, y: P1.y - 3.4 } : { x: P2.x + 9.4, y: P2.y + 0.1 }} tone="sage" data="fix">
      {fixLabel}
    </Callout>,
  );
  if (m.id === 'depart') out.push(<Callout key="dir" at={{ x: 53.6, y: 59.2 }} tone="orange" data="direction">הכיוון לקטע הבא</Callout>);
  if (fixAt === P1) out.push(<Callout key="p2" at={{ x: P2.x - 4.6, y: P2.y - 2.9 }} data="next">אוכף</Callout>);
  out.push(
    <Callout key="p3" at={{ x: P3.x - 7.2, y: P3.y + 0.1 }} data="crossing">
      חציית דרך עפר
    </Callout>,
  );
  if (m.estimate && !(m.id === 'saddle' && saddleFixed)) {
    const e = m.estimate.at;
    const at = m.id === 'after' ? { x: e.x + 8.6, y: e.y + 0.4 } : m.id === 'saddle' ? { x: e.x - 7.2, y: e.y + 3.4 } : { x: e.x + 3.4, y: e.y - 4.3 };
    out.push(
      <Callout key="est" at={at} tone="orange" dashed data="estimate">
        {`אומדן: כ־${m.estimate.meters} מ׳`}
      </Callout>,
    );
  }
  if (revealTruth && m.id === 'after') out.push(<Callout key="truth" at={{ x: DRIFT_END.x + 7.8, y: DRIFT_END.y - 1.2 }} tone="truth" data="truth">המיקום בפועל</Callout>);
  return <g data-layer="labels">{out}</g>;
}

