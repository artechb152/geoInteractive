'use client';
/**
 * „מפת התכנון” of the decision exercise — a topographic map of the same
 * ground the 3D view stands on (contours traced from the height field, the
 * maquis and trees where the 3D scatter grows them, the stream, the dirt
 * road), north up, never mirrored.
 *
 * It draws what the navigator KNOWS, and keeps the three things apart:
 *   verified   the identified points (sage discs with a tick) and the track
 *              between them;
 *   estimate   the dead-reckoned position — a dashed orange ring whose radius
 *              is its uncertainty, growing with every metre counted since the
 *              last identified point (never drawn as a point fix);
 *   target     the next planned checkpoint (an open ring with a flag).
 * A check adds its loci (sight lines, the distance arc, the feature stood on)
 * and the place they fix. The true track appears only in the marked debrief.
 *
 * While a check asks for it, a click on the map picks the sign under the
 * pointer (replayCheck.signFromMap); the hovered sign is outlined.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FONT, HAIR, INK, ORANGE, ORANGE_DEEP, PAPER, SAGE, SAGE_DARK } from '../PlanningRouteMap';
import { useSvgId } from '../CombatNavVisuals';
import { LEG_PATHS, M_PER_UNIT, REPLAY_MAP_VIEW, ROAD, RAVINE, STREAM, SUMMIT_N, SUMMIT_S, fx, fromLab, type Pt } from './replayGeography';
import { contourLines, toPath, type Box } from './replayContours';
import { heightAt, surfaceAt } from './replayTerrain';
import { shrubDensity, hash01 } from './replayScatter';
import { toMap, toWorld, type W2 } from './replayWorld';
import { replayTrees } from './replayLandmarks';
import { SIGNS, pointAlong, type SignId } from './replayRoute';
import { locusPoints, signFromMap, type CheckVerdict, type Locus } from './replayCheck';
import { TARGET_AT, type Knowledge } from './replayRun';
import { TARGET_NAME } from './replayScenario';
import type { WalkStore } from './replayWalk';
import { polyline } from './replayWorld';

/** The crop of the planning sheet this map shows (map units): the stream crossing to the road and the pines. */
export const MAP_VIEW: Box = REPLAY_MAP_VIEW;

const STREAM_BLUE = '#4f8fb0';
const CONTOUR = '#C9A56B';
const CONTOUR_INDEX = '#A9844B';
const TRUE_TRACK = '#2b3a4a';
const LOCUS = '#2f6f86';
const ARC = '#a0612a';

// ——— static layers, computed once from the model ———
let cache: { contours: { d: string; index: boolean; level: number }[]; maquis: string; pines: string; peaks: { at: Pt; h: number; id: SignId }[] } | null = null;
function staticLayers() {
  if (cache) return cache;
  const { lines } = contourLines(MAP_VIEW, { step: 0.4, interval: 5, indexEvery: 25 });
  const contours = lines.map((l) => ({ d: toPath(l.pts), index: l.index, level: l.level }));
  const dot = (p: Pt, r: number) => `M${fx(p.x - r)} ${fx(p.y)}a${fx(r)} ${fx(r)} 0 1 0 ${fx(2 * r)} 0a${fx(r)} ${fx(r)} 0 1 0 ${fx(-2 * r)} 0`;
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
      maquis += dot({ x: px, y: py }, 0.2 + 0.12 * hash01(i, j, 5));
    }
  let pines = '';
  for (const tree of replayTrees()) {
    const p = fromLab(tree);
    const d = dot(p, tree.crownR / M_PER_UNIT);
    if (tree.kind === 'pine') pines += d;
    else maquis += d;
  }
  const peaks = (
    [
      [SUMMIT_N, 'summitE'],
      [SUMMIT_S, 'summitW'],
    ] as const
  ).map(([p, id]) => {
    const w = toWorld(p);
    return { at: p, h: Math.round(heightAt(w.x, w.z)), id };
  });
  cache = { contours, maquis, pines, peaks };
  return cache;
}

const LABEL = 1.6;

/** A paper pill label, sized to its rendered text once the font is ready (no stroke halo). */
function Callout({ at, children, tone = 'ink', dashed = false, data }: { at: Pt; children: string; tone?: 'ink' | 'orange' | 'sage' | 'truth' | 'locus'; dashed?: boolean; data?: string }) {
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
  const w = fx((tw ?? children.length * 0.8) + 2);
  const stroke = tone === 'orange' ? ORANGE : tone === 'sage' ? SAGE_DARK : tone === 'truth' ? TRUE_TRACK : tone === 'locus' ? LOCUS : HAIR;
  const fill = tone === 'orange' ? ORANGE_DEEP : tone === 'sage' ? SAGE_DARK : tone === 'truth' ? TRUE_TRACK : tone === 'locus' ? LOCUS : INK;
  return (
    <g data-label={data} pointerEvents="none">
      <rect x={fx(at.x - w / 2)} y={fx(at.y - 1.45)} width={w} height={2.9} rx={1.45} fill={PAPER} stroke={stroke} strokeWidth={0.16} strokeDasharray={dashed ? '0.7 0.45' : undefined} />
      <text ref={ref} x={at.x} y={fx(at.y + 0.56)} textAnchor="middle" fontSize={LABEL} fontWeight={700} fill={fill} style={FONT}>
        {children}
      </text>
    </g>
  );
}

function FixMarker({ p, name, latest }: { p: Pt; name: string; latest: boolean }) {
  const r = latest ? 1.35 : 0.95;
  return (
    <g data-marker="fix" data-name={name} data-x={fx(p.x)} data-y={fx(p.y)} data-latest={latest || undefined}>
      <circle cx={p.x} cy={p.y} r={r + 0.55} fill={PAPER} stroke={HAIR} strokeWidth={0.1} />
      <circle cx={p.x} cy={p.y} r={r} fill={SAGE} stroke={SAGE_DARK} strokeWidth={0.22} />
      <path d={`M${fx(p.x - r * 0.48)} ${fx(p.y + 0.03)} L${fx(p.x - r * 0.12)} ${fx(p.y + r * 0.38)} L${fx(p.x + r * 0.52)} ${fx(p.y - r * 0.38)}`} fill="none" stroke="#FFFFFF" strokeWidth={latest ? 0.36 : 0.26} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** The next target: an open ring with a small flag. */
function TargetMarker({ p, name }: { p: Pt; name: string }) {
  return (
    <g data-marker="target" data-name={name} data-x={fx(p.x)} data-y={fx(p.y)}>
      <circle cx={p.x} cy={p.y} r={1.25} fill="#FFFFFF" stroke={INK} strokeWidth={0.34} />
      <circle cx={p.x} cy={p.y} r={0.34} fill={INK} />
      <path d={`M${fx(p.x)} ${fx(p.y - 1.2)} L${fx(p.x)} ${fx(p.y - 3.4)} L${fx(p.x + 1.5)} ${fx(p.y - 2.9)} L${fx(p.x)} ${fx(p.y - 2.4)}`} fill={ORANGE} stroke={INK} strokeWidth={0.14} strokeLinejoin="round" />
    </g>
  );
}

/** Dead-reckoned position: a dashed ring as wide as its uncertainty (an estimate, not a fix). */
function EstimateRing({ p, rM }: { p: Pt; rM: number }) {
  const r = Math.max(1.1, rM / M_PER_UNIT);
  return (
    <g data-marker="estimate" data-x={fx(p.x)} data-y={fx(p.y)} data-r={Math.round(rM)}>
      <circle cx={p.x} cy={p.y} r={fx(r)} fill={ORANGE} fillOpacity={0.1} stroke={ORANGE} strokeWidth={0.26} strokeDasharray="0.85 0.55" />
      <circle cx={p.x} cy={p.y} r={0.36} fill={ORANGE} />
    </g>
  );
}

function Arrowhead({ at, az, fill = ORANGE_DEEP, s = 1 }: { at: Pt; az: number; fill?: string; s?: number }) {
  return <path d="M0 -1.35 L 1.05 0.85 L 0 0.35 L -1.05 0.85 Z" transform={`translate(${fx(at.x)} ${fx(at.y)}) rotate(${fx(az)}) scale(${s})`} fill={fill} />;
}

const line = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${fx(p.x)} ${fx(p.y)}`).join('');
const mline = (pts: W2[]) => line(pts.map(toMap));
const bearingMap = (a: Pt, b: Pt) => (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI;

/** An identified point; `visit` orders them (the verified track joins fixes made at consecutive stops only). */
export type MapFix = { at: W2; name: string; visit: number };
export type MapDebrief = { path: W2[]; stops: { truth: W2; estimate: W2; label: string }[] };

export type ReplayMapProps = {
  know: Knowledge;
  fixes: MapFix[];
  /** the check's loci, and the place they fixed (if any) */
  loci: Locus[];
  verdict: CheckVerdict | null;
  /** a check asks for the sign on the map: clicks pick */
  pick: ((sign: SignId | null) => void) | null;
  /** the guided opening's sign to find (pulses) */
  pulse: SignId | null;
  /** after a correction: the new leg from the fix to the target */
  correction: boolean;
  walk?: WalkStore;
  /** while walking: the estimate moves `add` metres along the plan from `from` */
  walking: { from: number; add: number } | null;
  debrief: MapDebrief | null;
  description: string;
};

export function ReplayMap(p: ReplayMapProps) {
  const reduce = !!useReducedMotion();
  const id = useSvgId('replaymap');
  const L = useMemo(staticLayers, []);
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<SignId | null>(null);
  const { know } = p;
  const vb = `${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.w} ${MAP_VIEW.h}`;
  const scaleM = 250;
  const scaleU = scaleM / M_PER_UNIT;
  const sb = { x: MAP_VIEW.x + 2.4, y: MAP_VIEW.y + MAP_VIEW.h - 2.2 };
  const planned = [...LEG_PATHS[1], ...LEG_PATHS[2].slice(1), ...LEG_PATHS[3].slice(1)];
  const fixMap = toMap(know.fix.at);
  const target = toMap(TARGET_AT[know.target]);
  const latest = p.fixes[p.fixes.length - 1];

  const toWorldPt = (e: React.PointerEvent | React.MouseEvent): W2 | null => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return toWorld({ x: pt.x, y: pt.y });
  };

  return (
    <svg
      ref={svg}
      viewBox={vb}
      className={p.pick ? 'block h-full w-full cursor-crosshair select-none' : 'block h-full w-full select-none'}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={p.description}
      data-map-pick={p.pick ? 'on' : undefined}
      onPointerMove={p.pick ? (e) => setHover((w => (w ? signFromMap(w) : null))(toWorldPt(e))) : undefined}
      onPointerLeave={() => setHover(null)}
      onClick={
        p.pick
          ? (e) => {
              const w = toWorldPt(e);
              p.pick!(w ? signFromMap(w) : null);
            }
          : undefined
      }
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
        {/* ——— the sheet ——— */}
        <path d={L.maquis} fill="#7E9F64" fillOpacity={0.42} data-layer="maquis" />
        <path d={L.pines} fill="#3f6b4a" fillOpacity={0.72} data-layer="pines" />
        <g data-layer="contours" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {L.contours.map((c, i) => (
            <path key={i} d={c.d} stroke={c.index ? CONTOUR_INDEX : CONTOUR} strokeWidth={c.index ? 0.22 : 0.11} opacity={c.index ? 0.95 : 0.8} data-level={c.level} />
          ))}
        </g>
        <path d={STREAM} fill="none" stroke="#A9CFE0" strokeWidth={1.0} strokeLinecap="round" opacity={0.6} />
        <path d={STREAM} fill="none" stroke={STREAM_BLUE} strokeWidth={0.32} strokeDasharray="1.4 0.65" strokeLinecap="round" data-layer="stream" />
        <path d={RAVINE} fill="none" stroke={STREAM_BLUE} strokeWidth={0.2} strokeDasharray="0.65 0.45" />
        <path d={ROAD} fill="none" stroke="#8f6d3a" strokeWidth={1.15} strokeLinecap="round" />
        <path d={ROAD} fill="none" stroke="#F6E7C8" strokeWidth={0.64} strokeLinecap="round" data-layer="road" />
        {L.peaks.map((pk) => (
          <g key={pk.h} data-peak={pk.id}>
            <circle cx={pk.at.x} cy={pk.at.y} r={0.3} fill={INK} />
            <text x={pk.at.x} y={fx(pk.at.y - 0.75)} textAnchor="middle" fontSize={1.55} fontWeight={600} fill="#7a6440" style={FONT}>
              {pk.h}
            </text>
          </g>
        ))}

        {/* the planned example route, faint: the reference every estimate is measured along */}
        <path d={line(planned)} fill="none" stroke={ORANGE} strokeOpacity={0.45} strokeWidth={0.32} strokeDasharray="0.9 0.8" strokeLinecap="round" data-layer="planned" />

        {/* ——— the check ——— */}
        <SignHighlight sign={p.pick ? hover : null} tone="hover" />
        {p.pulse && <SignHighlight sign={p.pulse} tone="pulse" reduce={reduce} />}
        <g data-layer="loci">
          {p.loci.map((l, i) => (
            <LocusShape key={i} l={l} />
          ))}
        </g>

        {/* ——— what the navigator knows ——— */}
        <g data-layer="known">
          {!p.debrief &&
            p.fixes.slice(1).map((f, i) =>
              f.visit - p.fixes[i].visit === 1 ? <path key={i} d={mline([p.fixes[i].at, f.at])} fill="none" stroke={SAGE_DARK} strokeWidth={0.55} strokeLinecap="round" data-layer="verified-track" /> : null,
            )}
          {/* the plan from the last identified point */}
          {!p.debrief && (
            <path
              d={mline(p.correction ? [know.fix.at, TARGET_AT[know.target]] : know.plan)}
              fill="none"
              stroke={ORANGE}
              strokeWidth={p.correction ? 0.55 : 0.45}
              strokeDasharray={p.correction ? undefined : '1.05 0.8'}
              strokeLinecap="round"
              strokeLinejoin="round"
              data-layer={p.correction ? 'correction' : 'plan'}
            />
          )}
          {p.correction && !p.debrief && <Arrowhead at={midway(fixMap, target)} az={bearingMap(fixMap, target)} s={1.1} />}
          {p.fixes.map((f, i) => (
            <FixMarker key={i} p={toMap(f.at)} name={f.name} latest={i === p.fixes.length - 1} />
          ))}
          {!p.debrief && <TargetMarker p={target} name={TARGET_NAME[know.target]} />}
          {!p.debrief && !p.walking && know.counted > 0 && <EstimateRing p={toMap(know.estimate)} rM={know.uncertainty} />}
          {p.walking && p.walk && <WalkingEstimate walk={p.walk} plan={know.plan} from={p.walking.from} add={p.walking.add} />}
          {p.verdict?.kind === 'fix' && !p.debrief && <FixFound at={toMap(p.verdict.at)} reduce={reduce} />}
        </g>

        {p.debrief && <DebriefLayer d={p.debrief} />}

        {/* labels last, over everything, each on a free side of its mark */}
        <g data-layer="labels">
          {(() => {
            const est = toMap(know.estimate);
            const showEst = !p.debrief && !p.walking && know.counted > 0;
            const avoid: Pt[] = [...L.peaks.map((pk) => pk.at), ...L.peaks.map((pk) => ({ x: pk.at.x, y: pk.at.y - 1.2 })), target, ...(latest ? [toMap(latest.at)] : []), ...(showEst ? [est] : [])];
            const out: ReactNode[] = [];
            const put = (key: string, anchor: Pt, text: string, r: number, tone: 'sage' | 'ink' | 'orange', data: string, dashed = false) => {
              const at = placeLabel(anchor, text, r, avoid);
              avoid.push(at);
              out.push(
                <Callout key={key} at={at} tone={tone} dashed={dashed} data={data}>
                  {text}
                </Callout>,
              );
            };
            if (latest) put('fix', toMap(latest.at), `אומת: ${latest.name}`, 1.9, 'sage', 'fix');
            if (!p.debrief) put('target', target, TARGET_NAME[know.target], 2.2, 'ink', 'target');
            if (showEst) put('est', est, 'אומדן', Math.max(1.1, know.uncertainty / M_PER_UNIT) + 0.4, 'orange', 'estimate', true);
            return out;
          })()}
          {p.debrief && (
            <Callout at={{ x: MAP_VIEW.x + MAP_VIEW.w - 5.6, y: MAP_VIEW.y + 2.6 }} tone="truth" data="debrief">
              תחקיר
            </Callout>
          )}
        </g>
      </g>

      {/* north arrow (top-left) and scale bar (bottom-left) */}
      <g transform={`translate(${MAP_VIEW.x + 3.2} ${MAP_VIEW.y + 4})`} pointerEvents="none">
        <rect x={-2} y={-3.1} width={4} height={6} rx={0.75} fill={PAPER} opacity={0.9} stroke={HAIR} strokeWidth={0.14} />
        <text x={0} y={-0.8} textAnchor="middle" fontSize={1.8} fontWeight={700} fill={INK} style={FONT}>
          צ
        </text>
        <path d="M0 -0.1 L1.05 2.4 L0 1.85 L-1.05 2.4 Z" fill={INK} />
      </g>
      <g transform={`translate(${sb.x} ${sb.y})`} data-scale-m={scaleM} pointerEvents="none">
        <rect x={-1.1} y={-2.5} width={fx(scaleU + 2.4)} height={3.5} rx={0.65} fill={PAPER} opacity={0.9} />
        <rect x={0} y={0} width={fx(scaleU)} height={0.5} fill="#FFFFFF" stroke={INK} strokeWidth={0.11} />
        <rect x={0} y={0} width={fx(scaleU / 2)} height={0.5} fill={INK} />
        {[0, scaleU / 2, scaleU].map((x, i) => (
          <text key={i} x={fx(x)} y={-0.55} textAnchor="middle" fontSize={1.45} fill={INK} style={FONT}>
            {i === 0 ? '0' : i === 1 ? '125' : '250 מ׳'}
          </text>
        ))}
      </g>
    </svg>
  );
}

const midway = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * A label's centre beside its mark: below, above, west, east or a diagonal —
 * the first that stays on the sheet and clear of the other marks and labels.
 */
function placeLabel(anchor: Pt, text: string, r: number, avoid: Pt[]): Pt {
  const w = text.length * 0.78 + 2;
  const h = 2.9;
  const gap = r + 0.4;
  const options: Pt[] = [
    { x: anchor.x, y: anchor.y + gap + h / 2 },
    { x: anchor.x, y: anchor.y - gap - h / 2 },
    { x: anchor.x - gap - w / 2, y: anchor.y },
    { x: anchor.x + gap + w / 2, y: anchor.y },
    { x: anchor.x - gap - w / 2 + 1, y: anchor.y + gap + 0.6 },
    { x: anchor.x + gap + w / 2 - 1, y: anchor.y + gap + 0.6 },
    { x: anchor.x - gap - w / 2 + 1, y: anchor.y - gap - 0.6 },
    { x: anchor.x + gap + w / 2 - 1, y: anchor.y - gap - 0.6 },
  ];
  const clearOfNorth = (c: Pt) => !(c.x - w / 2 < MAP_VIEW.x + 6 && c.y - h / 2 < MAP_VIEW.y + 7.6);
  const onSheet = (c: Pt) => clearOfNorth(c) && c.x - w / 2 > MAP_VIEW.x + 0.6 && c.x + w / 2 < MAP_VIEW.x + MAP_VIEW.w - 0.6 && c.y - h / 2 > MAP_VIEW.y + 0.6 && c.y + h / 2 < MAP_VIEW.y + MAP_VIEW.h - 4.2;
  const clear = (c: Pt) => avoid.every((a) => (a.x === anchor.x && a.y === anchor.y) || Math.abs(a.x - c.x) > w / 2 + 1 || Math.abs(a.y - c.y) > h / 2 + 1);
  return options.find((c) => onSheet(c) && clear(c)) ?? options.find(onSheet) ?? options[0];
}

/** A sign outlined on the map: under the pointer while picking, or pulsing in the guided opening. */
function SignHighlight({ sign, tone, reduce }: { sign: SignId | null; tone: 'hover' | 'pulse'; reduce?: boolean }) {
  if (!sign) return null;
  const s = SIGNS[sign];
  const color = tone === 'pulse' ? ORANGE : LOCUS;
  const anim = tone === 'pulse' && !reduce ? { animate: { opacity: [0.35, 1, 0.35] }, transition: { duration: 1.6, repeat: Infinity } } : {};
  let shape: ReactNode = null;
  if (s.kind === 'line' && s.line) shape = <path d={mline(s.line.pts)} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={1.8} strokeLinecap="round" />;
  else if (s.id === 'woodland') shape = <WoodlandOutline color={color} />;
  else if (s.at) shape = <circle cx={toMap(s.at).x} cy={toMap(s.at).y} r={s.id === 'pines' ? 3.2 : s.id === 'saddle' ? 1.9 : 3} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={0.32} />;
  return (
    <motion.g pointerEvents="none" data-highlight={tone} data-sign={sign} {...anim}>
      {shape}
    </motion.g>
  );
}

function WoodlandOutline({ color }: { color: string }) {
  const d = useMemo(() => {
    let out = '';
    for (const t of SIGNS.woodland.members!) {
      const p = toMap(t);
      const r = 0.55;
      out += `M${fx(p.x - r)} ${fx(p.y)}a${r} ${r} 0 1 0 ${fx(2 * r)} 0a${r} ${r} 0 1 0 ${fx(-2 * r)} 0`;
    }
    return out;
  }, []);
  return <path d={d} fill={color} fillOpacity={0.35} />;
}

function LocusShape({ l }: { l: Locus }) {
  if (l.kind === 'stand') {
    const p = toMap(l.at);
    return <circle cx={p.x} cy={p.y} r={1.9} fill="none" stroke={LOCUS} strokeWidth={0.36} data-locus="stand" />;
  }
  const pts = locusPoints(l).map(toMap);
  if (l.kind === 'arc') return <path d={line(pts)} fill="none" stroke={ARC} strokeWidth={0.32} strokeDasharray="1 0.6" data-locus="arc" data-r={Math.round(l.r)} />;
  if (l.kind === 'on') return <path d={line(pts)} fill="none" stroke={LOCUS} strokeOpacity={0.75} strokeWidth={0.9} strokeLinecap="round" data-locus="on" data-sign={l.sign} />;
  // a sight line: from the sign back towards the eye
  return (
    <g data-locus="sight" data-sign={l.sign}>
      <path d={line(pts)} fill="none" stroke={LOCUS} strokeWidth={0.34} strokeDasharray="1.3 0.5" strokeLinecap="round" />
      <circle cx={pts[0].x} cy={pts[0].y} r={0.7} fill={LOCUS} />
    </g>
  );
}

/** The place a check fixed: a ring that settles onto the new identified point. */
function FixFound({ at, reduce }: { at: Pt; reduce: boolean }) {
  return (
    <motion.circle
      cx={at.x}
      cy={at.y}
      fill="none"
      stroke={SAGE_DARK}
      strokeWidth={0.32}
      initial={reduce ? false : { r: 4.5, opacity: 0 }}
      animate={{ r: 2.3, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      data-marker="found"
    />
  );
}

const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** The estimate while walking: it moves along the plan by the distance counted, its ring widening. */
function WalkingEstimate({ walk, plan, from, add }: { walk: WalkStore; plan: W2[]; from: number; add: number }) {
  const ref = useRef<SVGGElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const pl = useMemo(() => polyline(plan), [plan]);
  useEffect(() => {
    const update = () => {
      const t = smooth(walk.get().progress);
      const m = from + add * t;
      const p = toMap(pointAlong(pl, m));
      ref.current?.setAttribute('transform', `translate(${fx(p.x)} ${fx(p.y)})`);
      ring.current?.setAttribute('r', String(fx(Math.max(1.1, (8 + 0.08 * m) / M_PER_UNIT))));
    };
    update();
    return walk.subscribe(update);
  }, [walk, pl, from, add]);
  return (
    <g ref={ref} data-walking-estimate>
      <title>האומדן בזמן התנועה</title>
      <circle ref={ring} r={1.1} fill={ORANGE} fillOpacity={0.1} stroke={ORANGE} strokeWidth={0.26} strokeDasharray="0.85 0.55" />
      <circle r={0.36} fill={ORANGE} />
    </g>
  );
}

/** The debrief: the way really walked, and at every stop where the navigator was against where they thought they were. */
function DebriefLayer({ d }: { d: MapDebrief }) {
  return (
    <g data-layer="debrief">
      <path d={mline(d.path)} fill="none" stroke={TRUE_TRACK} strokeWidth={0.5} strokeLinecap="round" strokeLinejoin="round" data-truth="track" />
      {d.stops.map((s, i) => {
        const t = toMap(s.truth);
        const e = toMap(s.estimate);
        const off = Math.hypot(t.x - e.x, t.y - e.y) > 0.6;
        return (
          <g key={i} data-truth-stop={i}>
            {off && <line x1={e.x} y1={e.y} x2={t.x} y2={t.y} stroke={ORANGE_DEEP} strokeWidth={0.18} strokeDasharray="0.5 0.4" />}
            {off && <circle cx={e.x} cy={e.y} r={0.7} fill="#FFFFFF" stroke={ORANGE} strokeWidth={0.22} />}
            <circle cx={t.x} cy={t.y} r={0.62} fill={TRUE_TRACK} data-marker="truth" />
          </g>
        );
      })}
    </g>
  );
}
