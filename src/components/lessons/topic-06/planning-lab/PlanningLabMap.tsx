'use client';

import { memo, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { MAP } from '../../topic-02/topographyTerrainStyle';
import { WATER } from '../terrain-nav/TerrainNavMap';
import { ORANGE_DEEP, SAGE_DARK } from '../PlanningRouteMap';
import { DEST, GROVE, ORCHARD, ROAD_WIDTH_M, ROCKS, START, STREAM, WATER_TANK, WOODLAND, CONTOUR_INTERVAL_M, INDEX_INTERVAL_M, type Point, type XY } from './planningLabWorld';
import { MAP_SHEET, mapToWorld, worldToMap } from './planningLabView';
import { blockCorners, boulders, buildings, contourLabels, contours, roads, saddle, summitOf, summits, trees, waterCourses, type Summit } from './planningLabTerrain';
import { bearing, closestOnSegment, featureOf, legsOf, pickFeature, standsOn, type FeatureId } from './planningLabPlan';
import { editable, type Action, type RouteNode, type Selection, type Tool } from './planningLabState';

/**
 * The planning map — a printed, north-up topographic sheet drawn from the
 * same terrain module as the 3D model (contours are the mesh's own iso-lines,
 * every tree symbol a modelled tree, the roads and water the same centre-lines)
 * with the learner's route on top.
 *
 * viewBox units are metres (worldToMap). Pointer positions go through the
 * inverse screen CTM, so clicks and drags land on the right ground point at any
 * lesson-fit scale and in full screen.
 *
 * On the map:
 *   - press a route point and drag to move it; a click selects it;
 *   - press the route line and drag to bend it at a new point; a click selects the leg;
 *   - a click elsewhere does what the tool says: add a route point, add a
 *     checkpoint at a feature, or identify a feature.
 * Keyboard: every route point is a button — arrows move it 10 m (Shift: 50 m)
 * in map directions, Delete removes it, Enter selects it.
 *
 * Line language (the lesson's map): brown relief, blue water, tan dirt roads,
 * green vegetation, black buildings. Orange is never terrain — it is the route
 * and the learner's selection.
 */

const W = MAP_SHEET.width;
const H = MAP_SHEET.height;
const COLLAR_W = 70;
const COLLAR_S = 60;
const COLLAR_N = 14;
const COLLAR_E = 44;
export const MAP_VIEWBOX = { x: -COLLAR_W, y: -COLLAR_N, w: W + COLLAR_W + COLLAR_E, h: H + COLLAR_N + COLLAR_S } as const;
export const MAP_ASPECT = MAP_VIEWBOX.w / MAP_VIEWBOX.h;

/** Type sizes in viewBox units: at the map panel's ≈ 0.36 px per unit, label ≈ 15 px, small ≈ 13 px. */
const FS = { label: 42, small: 36, grid: 34, contour: 34 } as const;
const HAIR = 2.6;
const INDEX_W = 5.2;
const GRID_W = 1.8;
const ROUTE_W = 11;
/** Hit radii on screen, px. */
const HANDLE_HIT_PX = 15;
const LINE_HIT_PX = 9;
/** Pointer travel before a press becomes a drag, px. */
const DRAG_PX = 4;

const r1 = (v: number) => Math.round(v * 10) / 10;
function pathOf(pts: readonly XY[], closed = false) {
  let d = '';
  for (let k = 0; k < pts.length; k++) {
    const m = worldToMap({ E: pts[k][0], N: pts[k][1] });
    d += `${k ? 'L' : 'M'}${r1(m.x)} ${r1(m.y)}`;
  }
  return closed ? `${d}Z` : d;
}
const pointsPath = (ps: readonly Point[], closed = false) => pathOf(ps.map((p) => [p.E, p.N] as XY), closed);
const upright = (deg: number) => (deg > 90 ? deg - 180 : deg <= -90 ? deg + 180 : deg);
const plateW = (text: string, size: number) => text.length * size * 0.55 + size * 0.9;

export type MapOverlay = {
  readonly nodes: readonly RouteNode[];
  readonly tool: Tool;
  readonly selection: Selection;
  readonly showDirect: boolean;
  readonly dragging: string | null;
};

export function PlanningLabMap({ overlay, dispatch, className }: { overlay: MapOverlay; dispatch: (a: Action) => void; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const press = useRef<{ kind: 'node' | 'line' | 'ground'; id?: string; at: Point; x: number; y: number; pointer: number; dragging: boolean } | null>(null);
  const [hover, setHover] = useState<{ kind: 'node' | 'line' | 'feature' | 'ground'; id?: string } | null>(null);
  const raf = useRef(0);
  const pendingMove = useRef<Point | null>(null);
  const { nodes, tool, selection } = overlay;

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /** Pointer → ground metres through the inverse screen CTM; also px per metre at the current scale. */
  const toGround = (e: { clientX: number; clientY: number }) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { ground: mapToWorld(p.x, p.y), inside: p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H, pxPerM: Math.hypot(ctm.a, ctm.b) };
  };

  const hitNode = (g: Point, pxPerM: number) => {
    let best: RouteNode | null = null;
    let bd = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.E - g.E, n.N - g.N) * pxPerM;
      if (d < bd && d <= HANDLE_HIT_PX + (n.kind === 'start' || n.kind === 'end' ? 4 : 0)) {
        bd = d;
        best = n;
      }
    }
    return best;
  };
  const hitLine = (g: Point, pxPerM: number) => {
    let best: { from: string; at: Point } | null = null;
    let bd = Infinity;
    for (let k = 0; k < nodes.length - 1; k++) {
      const c = closestOnSegment(g, nodes[k], nodes[k + 1]);
      const d = c.d * pxPerM;
      if (d < bd && d <= LINE_HIT_PX) {
        bd = d;
        best = { from: nodes[k].id, at: c.at };
      }
    }
    return best;
  };

  const flushMove = () => {
    raf.current = 0;
    const p = pendingMove.current;
    const pr = press.current;
    if (!p || !pr?.dragging) return;
    dispatch({ type: 'drag', at: p });
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const g = toGround(e);
    if (!g || !g.inside) return;
    const n = hitNode(g.ground, g.pxPerM);
    const line = n ? null : hitLine(g.ground, g.pxPerM);
    press.current = n
      ? { kind: 'node', id: n.id, at: g.ground, x: e.clientX, y: e.clientY, pointer: e.pointerId, dragging: false }
      : line
        ? { kind: 'line', id: line.from, at: line.at, x: e.clientX, y: e.clientY, pointer: e.pointerId, dragging: false }
        : { kind: 'ground', at: g.ground, x: e.clientX, y: e.clientY, pointer: e.pointerId, dragging: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (n) (e.target as Element).closest<SVGGElement>('[data-node]')?.focus({ preventScroll: true });
    e.preventDefault();
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = toGround(e);
    const pr = press.current;
    if (pr && pr.pointer === e.pointerId) {
      if (!g) return;
      const far = Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > DRAG_PX;
      if (!pr.dragging && far) {
        if (pr.kind === 'node') {
          const n = nodes.find((x) => x.id === pr.id);
          if (n && editable(n)) {
            pr.dragging = true;
            dispatch({ type: 'dragStart', id: pr.id! });
          }
        } else if (pr.kind === 'line') {
          // bend the leg at a new route point, then drag it
          pr.dragging = true;
          dispatch({ type: 'grab', at: pr.at });
        }
      }
      if (pr.dragging) {
        pendingMove.current = g.ground;
        if (!raf.current) raf.current = requestAnimationFrame(flushMove);
      }
      return;
    }
    if (!g || !g.inside) {
      if (hover) setHover(null);
      return;
    }
    const n = hitNode(g.ground, g.pxPerM);
    const line = n ? null : hitLine(g.ground, g.pxPerM);
    const f = n || line || tool === 'route' ? null : pickFeature(g.ground, 8 / g.pxPerM);
    const next = n ? { kind: 'node' as const, id: n.id } : line ? { kind: 'line' as const, id: line.from } : f ? { kind: 'feature' as const, id: f } : { kind: 'ground' as const };
    if (next.kind !== hover?.kind || next.id !== hover?.id) setHover(next);
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pr = press.current;
    if (!pr || pr.pointer !== e.pointerId) return;
    press.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (pr.dragging) {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
        flushMove();
      }
      dispatch({ type: 'dragEnd' });
      return;
    }
    if (pr.kind === 'node') dispatch({ type: 'select', selection: { kind: 'node', id: pr.id! } });
    else if (pr.kind === 'line') dispatch({ type: 'select', selection: { kind: 'leg', from: pr.id! } });
    else groundClick(pr.at);
  };

  const onPointerCancel = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pr = press.current;
    if (!pr || pr.pointer !== e.pointerId) return;
    press.current = null;
    if (pr.dragging) dispatch({ type: 'dragEnd' });
  };

  /** A click on the ground: the tool's action. */
  const groundClick = (at: Point) => {
    if (tool === 'route') {
      dispatch({ type: 'add', at });
      return;
    }
    const f = pickFeature(at, 6);
    if (tool === 'checks') {
      if (f) dispatch({ type: 'addCheck', feature: f });
      else dispatch({ type: 'select', selection: null });
    } else dispatch({ type: 'select', selection: f ? { kind: 'feature', id: f } : null });
  };

  const onNodeKey = (e: ReactKeyboardEvent<SVGGElement>, n: RouteNode) => {
    const step = e.shiftKey ? 50 : 10;
    const move: Record<string, [number, number]> = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowRight: [step, 0], ArrowLeft: [-step, 0] };
    if (e.key in move) {
      if (!editable(n)) return;
      dispatch({ type: 'nudge', id: n.id, dE: move[e.key][0], dN: move[e.key][1] });
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && editable(n)) {
      const i = nodes.findIndex((x) => x.id === n.id);
      const next = nodes[i - 1] ?? nodes[i + 1];
      dispatch({ type: 'remove', id: n.id });
      requestAnimationFrame(() => svgRef.current?.querySelector<SVGGElement>(`[data-node="${next.id}"]`)?.focus({ preventScroll: true }));
    } else if (e.key === 'Enter' || e.key === ' ') {
      dispatch({ type: 'select', selection: { kind: 'node', id: n.id } });
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const cursor = press.current?.dragging
    ? 'grabbing'
    : hover?.kind === 'node'
      ? nodes.find((n) => n.id === hover.id && editable(n))
        ? 'grab'
        : 'pointer'
      : hover?.kind === 'line'
        ? 'pointer'
        : hover?.kind === 'feature'
          ? 'pointer'
          : tool === 'route'
            ? 'crosshair'
            : 'default';

  const hoverFeature = hover?.kind === 'feature' ? (hover.id as FeatureId) : null;
  const selFeature = selection?.kind === 'feature' ? selection.id : null;
  const selNodeFeature = selection?.kind === 'node' ? nodes.find((n) => n.id === selection.id)?.feature : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={`${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="group"
      aria-label="מפת התכנון, צפון למעלה: קווי גובה כל 10 מ׳, רכס עם שתי פסגות ואוכף ביניהן, נחל וערוץ מדרום לרכס, דרך עפר מצפון לו. המוצא A ליד מבנה בולט בדרום־מזרח, היעד B בחורשת אורנים בצפון־מערב. נקודות המסלול הן כפתורים: חיצים מזיזים, Delete מוחק."
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={() => !press.current && setHover(null)}
      data-map-tool={tool}
    >
      <MapSheet />
      <defs>
        <clipPath id="pl-sheet">
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath="url(#pl-sheet)" pointerEvents="none">
        {selFeature && <FeatureHighlight id={selFeature} />}
        {selNodeFeature && selNodeFeature !== selFeature && <FeatureHighlight id={selNodeFeature} />}
        {hoverFeature && hoverFeature !== selFeature && <FeatureHighlight id={hoverFeature} faint />}
        {overlay.showDirect && <DirectLine />}
        <RouteLayer nodes={nodes} selection={selection} hoverLeg={hover?.kind === 'line' ? hover.id! : null} />
      </g>
      {/* Route points above the clip, so a point at the edge keeps its whole handle */}
      <g>
        {nodes.map((n, i) => (
          <NodeMark
            key={n.id}
            n={n}
            index={i}
            nodes={nodes}
            selected={selection?.kind === 'node' && selection.id === n.id}
            hovered={hover?.kind === 'node' && hover.id === n.id}
            dragging={overlay.dragging === n.id}
            onKeyDown={(e) => onNodeKey(e, n)}
          />
        ))}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- the printed sheet (static)

const MapSheet = memo(function MapSheet() {
  const levels = contours();
  const labels = contourLabels();
  const allTrees = trees();
  const w = waterCourses();
  const inSheet = (p: Point) => p.E >= 0 && p.E <= W && p.N >= 0 && p.N <= H;
  return (
    <g pointerEvents="none" data-map="sheet">
      <defs>
        <clipPath id="pl-sheet-base">
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      <rect x={MAP_VIEWBOX.x} y={MAP_VIEWBOX.y} width={MAP_VIEWBOX.w} height={MAP_VIEWBOX.h} fill={MAP.collar} />
      <rect x={0} y={0} width={W} height={H} fill={MAP.paper} />
      <g clipPath="url(#pl-sheet-base)">
        {/* 200 m local grid */}
        <g stroke={MAP.grid} strokeWidth={GRID_W} strokeOpacity={0.75}>
          {[200, 400, 600, 800].map((E) => (
            <path key={`e${E}`} d={`M${E} 0V${H}`} />
          ))}
          {[200, 400, 600, 800, 1000].map((N) => (
            <path key={`n${N}`} d={`M0 ${H - N}H${W}`} />
          ))}
        </g>

        {/* Vegetation: woodland and the orchard lightly tinted, the grove fully; one symbol per modelled tree */}
        <g fill={MAP.vegFill}>
          {WOODLAND.map((wd) => (
            <path key={wd.id} d={pathOf(wd.ring, true)} fillOpacity={0.5} />
          ))}
          <path d={pathOf(ORCHARD.ring, true)} fillOpacity={0.45} />
          <path d={pathOf(GROVE, true)} stroke={MAP.vegInk} strokeWidth={HAIR} strokeDasharray="10 7" />
        </g>
        <g fill="none" stroke={MAP.vegInk} strokeWidth={1.8}>
          {allTrees
            .filter((t) => t.kind !== 'olive' && t.group !== 'lone' && inSheet(t))
            .map((t, i) => {
              const m = worldToMap(t);
              return <circle key={i} cx={r1(m.x)} cy={r1(m.y)} r={r1(t.crownR)} />;
            })}
        </g>
        <g fill={MAP.vegInk}>
          {allTrees
            .filter((t) => t.kind === 'olive')
            .map((t, i) => {
              const m = worldToMap(t);
              return <circle key={i} cx={r1(m.x)} cy={r1(m.y)} r={2.4} />;
            })}
        </g>

        {/* Contours — the 50 m index lines heavier */}
        <g fill="none" stroke={MAP.contour} strokeLinejoin="round">
          {levels.map((lv) => lv.lines.map((line, k) => <path key={`${lv.heightM}-${k}`} d={pathOf(line.pts, line.closed)} strokeWidth={lv.index ? INDEX_W : HAIR} />))}
        </g>

        {/* Water: the stream (solid) and the ravine (dashed) */}
        <g fill="none" stroke={WATER.line} strokeLinecap="round" strokeLinejoin="round">
          <path d={pathOf(w.stream.pts)} strokeWidth={STREAM.waterWidthM + 3} />
          <path d={pathOf(w.ravine.pts)} strokeWidth={3.2} strokeDasharray="14 9" />
        </g>

        {/* Dirt roads, cased */}
        {roads().map((r) => (
          <path key={`c-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadCasing} strokeWidth={ROAD_WIDTH_M + 5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {roads().map((r) => (
          <path key={`f-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadFill} strokeWidth={ROAD_WIDTH_M} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* The building at A, its annex and the water tank */}
        <g fill={MAP.building}>
          {buildings().map((b, i) => (
            <path key={i} d={pointsPath(blockCorners(b), true)} />
          ))}
        </g>
        {(() => {
          const m = worldToMap(WATER_TANK);
          return (
            <g>
              <circle cx={m.x} cy={m.y} r={7} fill={MAP.paper} stroke={MAP.ink} strokeWidth={2.6} />
              <circle cx={m.x} cy={m.y} r={2.4} fill={MAP.ink} />
            </g>
          );
        })()}

        {/* The rocks at B: the map's rock sign for each large block */}
        <g fill={MAP.paper} stroke={MAP.ink} strokeWidth={1.8} strokeLinejoin="round">
          {boulders()
            .filter((b) => b.atB && b.sizeM > 2)
            .map((b, i) => {
              const m = worldToMap(b);
              const s = 2.2 + b.sizeM * 0.9;
              return <path key={i} d={`M${r1(m.x - s)} ${r1(m.y + s * 0.6)}L${r1(m.x - s * 0.3)} ${r1(m.y - s * 0.8)}L${r1(m.x + s * 0.5)} ${r1(m.y - s * 0.5)}L${r1(m.x + s)} ${r1(m.y + s * 0.6)}Z`} />;
            })}
        </g>

        {/* Index-contour heights, set into their line on a paper plate */}
        {labels.map((l) => {
          const m = worldToMap(l);
          return (
            <g key={`${l.heightM}-${l.E}`} transform={`translate(${r1(m.x)} ${r1(m.y)}) rotate(${r1(upright(l.angleDeg))})`}>
              <rect x={-30} y={-18} width={60} height={36} rx={5} fill={MAP.paper} />
              <text textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={FS.contour} fontWeight={700} fill={MAP.contour} className="font-display tabular-nums">
                {l.heightM}
              </text>
            </g>
          );
        })}

        {summits().map((s) => (
          <SpotHeight key={s.id} s={s} />
        ))}
        <NorthArrow />
        <ScaleBar />
      </g>
      <rect x={0} y={0} width={W} height={H} fill="none" stroke={MAP.ink} strokeWidth={2.6} />
      <GridLabels />
    </g>
  );
});

function SpotHeight({ s }: { s: Summit }) {
  const m = worldToMap(s);
  return (
    <g data-spot={s.id}>
      <path d={`M${r1(m.x)} ${r1(m.y - 9)}l9 15h-18z`} fill={MAP.ink} />
      <rect x={r1(m.x + 11)} y={r1(m.y - 19)} width={70} height={36} rx={5} fill={MAP.paper} fillOpacity={0.92} />
      <text x={r1(m.x + 15)} y={r1(m.y - 1)} textAnchor="start" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display tabular-nums">
        {Math.round(s.heightM)}
      </text>
    </g>
  );
}

function GridLabels() {
  const common = { fontSize: FS.grid, fontWeight: 600, fill: MAP.muted, className: 'font-display tabular-nums', dominantBaseline: 'central' as const, direction: 'ltr' as const };
  return (
    <g pointerEvents="none">
      {[0, 200, 400, 600, 800, 1000].map((E) => (
        <text key={E} x={E} y={H + COLLAR_S / 2} textAnchor={E === 0 ? 'start' : E === W ? 'end' : 'middle'} {...common}>
          {E}
        </text>
      ))}
      {[200, 400, 600, 800, 1000].map((N) => (
        <text key={N} transform={`translate(${-COLLAR_W / 2} ${H - N}) rotate(-90)`} textAnchor="middle" {...common}>
          {N}
        </text>
      ))}
    </g>
  );
}

/** North arrow on a paper plate in the sheet's north-east corner. */
function NorthArrow() {
  const x = W - 52;
  const y = 22;
  return (
    <g pointerEvents="none" data-map="north">
      <rect x={x - 40} y={y - 8} width={80} height={150} rx={10} fill={MAP.paper} fillOpacity={0.94} />
      <text x={x} y={y + 22} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display">
        צפון
      </text>
      <path d={`M${x} ${y + 48}l18 84l-18 -20l-18 20z`} fill={MAP.ink} />
    </g>
  );
}

/** 0–200 m on a paper plate in the south-west corner; its length is the drawing transform itself (1 unit = 1 m). */
function ScaleBar() {
  const seg = 50;
  const x0 = 34;
  const y = H - 40;
  return (
    <g pointerEvents="none" data-map="scale">
      <rect x={10} y={y - 72} width={4 * seg + 124} height={98} rx={10} fill={MAP.paper} fillOpacity={0.94} />
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={x0 + k * seg} y={y} width={seg} height={13} fill={k % 2 === 0 ? MAP.ink : MAP.collar} stroke={MAP.ink} strokeWidth={1.8} />
      ))}
      {[0, 100, 200].map((m) => (
        <text key={m} x={x0 + m} y={y - 28} textAnchor="middle" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
          {m}
        </text>
      ))}
      <text x={x0 + 4 * seg + 40} y={y + 7} textAnchor="end" direction="rtl" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display">
        מ׳
      </text>
    </g>
  );
}

// ---------------------------------------------------------------- overlays

/** The closed contour around a summit, the first level at least 20 m below it — what "a summit" looks like on the map. */
function summitOutline(id: 'peak-west' | 'peak-east'): string | null {
  const s = summitOf(id);
  const level = Math.floor((s.heightM - 20) / CONTOUR_INTERVAL_M) * CONTOUR_INTERVAL_M;
  const lv = contours().find((c) => c.heightM === level);
  if (!lv) return null;
  for (const line of lv.lines) {
    if (!line.closed) continue;
    let inside = false;
    const P = line.pts;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      if (P[i][1] > s.N !== P[j][1] > s.N && s.E < ((P[j][0] - P[i][0]) * (s.N - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside;
    }
    if (inside) return pathOf(line.pts, true);
  }
  return null;
}

/** A feature in the highlight colour over its own symbol — the same geometry the model highlights. */
function FeatureHighlight({ id, faint }: { id: FeatureId; faint?: boolean }) {
  const op = faint ? 0.45 : 1;
  const ring = (p: Point, r: number) => {
    const m = worldToMap(p);
    return <circle cx={m.x} cy={m.y} r={r} fill={MAP.accent} fillOpacity={0.12 * op} stroke={MAP.accent} strokeOpacity={op} strokeWidth={6} />;
  };
  let body: ReactNode = null;
  if (id === 'building') body = ring(featureOf('building').anchor, 42);
  else if (id === 'rocks') body = ring({ E: ROCKS.E, N: ROCKS.N }, ROCKS.rM + 8);
  else if (id === 'saddle') body = ring(saddle(), 52);
  else if (id === 'grove') body = <path d={pathOf(GROVE, true)} fill={MAP.accent} fillOpacity={0.14 * op} stroke={MAP.accent} strokeOpacity={op} strokeWidth={6} />;
  else if (id === 'orchard') body = <path d={pathOf(ORCHARD.ring, true)} fill={MAP.accent} fillOpacity={0.16 * op} stroke={MAP.accent} strokeOpacity={op} strokeWidth={6} />;
  else if (id === 'stream' || id === 'ravine') {
    const w = waterCourses();
    body = <path d={pathOf(id === 'stream' ? w.stream.pts : w.ravine.pts)} fill="none" stroke={MAP.accent} strokeOpacity={0.45 * op} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />;
  } else if (id === 'road' || id === 'track') {
    body = <path d={pathOf(roads().find((r) => r.id === id)!.pts)} fill="none" stroke={MAP.accent} strokeOpacity={0.45 * op} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />;
  } else {
    const d = summitOutline(id);
    if (d) body = <path d={d} fill={MAP.accent} fillOpacity={0.14 * op} stroke={MAP.accent} strokeOpacity={op} strokeWidth={6} strokeLinejoin="round" />;
  }
  const f = featureOf(id);
  const m = worldToMap(f.anchor);
  return (
    <g data-highlight={id} data-faint={faint || undefined}>
      {body}
      {!faint && id !== 'saddle' && id !== 'rocks' && id !== 'building' && <Plate x={m.x} y={m.y - 46} text={f.name} tone="accent" />}
      {!faint && (id === 'saddle' || id === 'rocks' || id === 'building') && <Plate x={m.x} y={m.y + (id === 'building' ? 60 : -70)} text={f.name} tone="accent" />}
    </g>
  );
}

/** A Hebrew label on a paper plate (no stroke halo). */
function Plate({ x, y, text, tone = 'ink', size = FS.small }: { x: number; y: number; text: string; tone?: 'ink' | 'accent' | 'sage'; size?: number }) {
  const w = plateW(text, size);
  const h = size * 1.36;
  const ink = tone === 'accent' ? ORANGE_DEEP : tone === 'sage' ? SAGE_DARK : MAP.ink;
  const edge = tone === 'accent' ? MAP.accent : tone === 'sage' ? SAGE_DARK : MAP.hairline;
  const cx = Math.min(W - w / 2 - 6, Math.max(w / 2 + 6, x));
  const cy = Math.min(H - h / 2 - 6, Math.max(h / 2 + 6, y));
  return (
    <g pointerEvents="none">
      <rect x={r1(cx - w / 2)} y={r1(cy - h / 2)} width={r1(w)} height={r1(h)} rx={h / 2} fill={MAP.paper} fillOpacity={0.96} stroke={edge} strokeWidth={2.4} />
      <text x={r1(cx)} y={r1(cy)} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={size} fontWeight={700} fill={ink} className="font-display">
        {text}
      </text>
    </g>
  );
}

function DirectLine() {
  const a = worldToMap(START);
  const b = worldToMap(DEST);
  return (
    <g data-overlay="direct">
      <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke={MAP.paper} strokeWidth={9} strokeLinecap="round" strokeOpacity={0.8} />
      <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke={MAP.ink} strokeWidth={4.4} strokeDasharray="13 10" strokeLinecap="round" />
    </g>
  );
}

function Chevron({ from, to, size = 12, color = MAP.accent }: { from: Point; to: Point; size?: number; color?: string }) {
  const a = worldToMap(from);
  const b = worldToMap(to);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <path
      d={`M${-size} ${-size}L${size * 0.35} 0L${-size} ${size}`}
      transform={`translate(${r1((a.x + b.x) / 2)} ${r1((a.y + b.y) / 2)}) rotate(${r1(ang)})`}
      fill="none"
      stroke={color}
      strokeWidth={5.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** The route: cased orange legs with a chevron each (the way of travel); the selected leg wider, with its tag. */
function RouteLayer({ nodes, selection, hoverLeg }: { nodes: readonly RouteNode[]; selection: Selection; hoverLeg: string | null }) {
  const legs = legsOf(nodes);
  const selLeg = selection?.kind === 'leg' ? nodes.findIndex((n) => n.id === selection.from) : -1;
  return (
    <g data-route={nodes.length - 1}>
      <path d={pointsPath(nodes)} fill="none" stroke={MAP.paper} strokeWidth={ROUTE_W + 7} strokeLinejoin="round" strokeLinecap="round" strokeOpacity={0.9} />
      {legs.map((l, k) => {
        const on = k === selLeg;
        const hov = !on && hoverLeg === nodes[k].id;
        return (
          <g key={nodes[k].id} data-leg={k + 1} data-selected={on || undefined}>
            {(on || hov) && <path d={pointsPath([l.from, l.to])} stroke={MAP.accent} strokeOpacity={on ? 0.28 : 0.18} strokeWidth={ROUTE_W + 18} strokeLinecap="round" />}
            <path d={pointsPath([l.from, l.to])} stroke={MAP.accent} strokeWidth={on ? ROUTE_W + 3 : ROUTE_W} strokeLinecap="round" />
            {l.distanceM > 70 && <Chevron from={l.from} to={l.to} size={on ? 14 : 11} color="#FFFFFF" />}
          </g>
        );
      })}
      {selLeg >= 0 && legs[selLeg] && <LegTag leg={legs[selLeg]} n={selLeg + 1} />}
    </g>
  );
}

/** "קטע n · 420 מ׳" beside the selected leg's middle, on the side away from the map's edge. */
function LegTag({ leg, n }: { leg: ReturnType<typeof legsOf>[number]; n: number }) {
  const a = worldToMap(leg.from);
  const b = worldToMap(leg.to);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const text = `קטע ${n} · ${Math.round(leg.distanceM)} מ׳`;
  const off = 30 + plateW(text, FS.small) / 2;
  const sides = [1, -1].map((s) => ({ x: mid.x + Math.sin(ang) * off * s, y: mid.y - Math.cos(ang) * off * s }));
  const inside = (p: { x: number; y: number }) => Math.min(p.x, W - p.x, p.y, H - p.y);
  const at = inside(sides[0]) >= inside(sides[1]) ? sides[0] : sides[1];
  return (
    <g data-leg-tag={n}>
      <Plate x={at.x} y={at.y} text={text} tone="accent" />
    </g>
  );
}

/** A route point: A and B (orange letter discs), a route point (white handle), a checkpoint (its number). */
function NodeMark({
  n,
  index,
  nodes,
  selected,
  hovered,
  dragging,
  onKeyDown,
}: {
  n: RouteNode;
  index: number;
  nodes: readonly RouteNode[];
  selected: boolean;
  hovered: boolean;
  dragging: boolean;
  onKeyDown: (e: ReactKeyboardEvent<SVGGElement>) => void;
}) {
  const m = worldToMap(n);
  const checkNo = n.kind === 'check' ? nodes.slice(0, index + 1).filter((x) => x.kind === 'check').length : 0;
  const onIt = n.kind === 'check' && n.feature ? standsOn(n.feature, n) : true;
  const label =
    n.kind === 'start'
      ? 'המוצא A, ליד המבנה הבולט'
      : n.kind === 'end'
        ? 'היעד B, בחורשת האורנים על הסלעים'
        : n.kind === 'check'
          ? `נקודת אימות ${checkNo}: ${featureOf(n.feature!).name}${onIt ? '' : ' (הנקודה זזה מהסימן)'}`
          : `נקודת מסלול ${index}`;
  const ring = selected ? 8 : 0;
  const prev = nodes[index - 1];
  const next = nodes[index + 1];
  // the end letters' tags sit away from the route
  const awayDeg = n.kind === 'start' ? bearing(next ?? n, n) : n.kind === 'end' ? bearing(prev ?? n, n) : null;
  return (
    <g
      data-node={n.id}
      data-kind={n.kind}
      data-x={r1(n.E)}
      data-y={r1(n.N)}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      aria-keyshortcuts={editable(n) ? 'ArrowUp ArrowDown ArrowLeft ArrowRight Delete' : undefined}
      onKeyDown={onKeyDown}
      className="outline-none [&:focus-visible>.pl-focus]:opacity-100"
    >
      <circle className="pl-focus opacity-0" cx={m.x} cy={m.y} r={n.kind === 'way' ? 30 : 38} fill="none" stroke={MAP.accent} strokeWidth={4} strokeDasharray="7 5" />
      {selected && <circle cx={m.x} cy={m.y} r={(n.kind === 'way' ? 18 : 26) + ring + 6} fill={MAP.accent} fillOpacity={0.18} />}
      {n.kind === 'start' || n.kind === 'end' ? (
        <g>
          <circle cx={m.x} cy={m.y} r={25} fill={MAP.accent} stroke="#FFFFFF" strokeWidth={5} />
          <text x={m.x} y={m.y + 1} textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={32} fontWeight={800} fill="#FFFFFF" className="font-display">
            {n.kind === 'start' ? 'A' : 'B'}
          </text>
          {awayDeg !== null && (
            <EndTag x={m.x + Math.sin((awayDeg * Math.PI) / 180) * 62} y={m.y - Math.cos((awayDeg * Math.PI) / 180) * 62} text={n.kind === 'start' ? 'מוצא' : 'יעד'} />
          )}
        </g>
      ) : n.kind === 'check' ? (
        <g data-on-feature={onIt ? 'yes' : 'no'}>
          <circle cx={m.x} cy={m.y} r={21} fill={onIt ? SAGE_DARK : MAP.paper} stroke={onIt ? '#FFFFFF' : MAP.accent} strokeWidth={onIt ? 4.5 : 5} strokeDasharray={onIt ? undefined : '8 5'} />
          <text x={m.x} y={m.y + 1} textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={26} fontWeight={800} fill={onIt ? '#FFFFFF' : ORANGE_DEEP} className="font-display tabular-nums">
            {checkNo}
          </text>
        </g>
      ) : (
        <g>
          <circle cx={m.x} cy={m.y} r={hovered || dragging ? 15 : 13} fill="#FFFFFF" stroke={MAP.accent} strokeWidth={6} />
          <circle cx={m.x} cy={m.y} r={4} fill={MAP.accent} />
        </g>
      )}
    </g>
  );
}

function EndTag({ x, y, text }: { x: number; y: number; text: string }) {
  const w = plateW(text, FS.small);
  const h = FS.small * 1.36;
  const cx = Math.min(W - w / 2 - 6, Math.max(w / 2 + 6, x));
  const cy = Math.min(H - h / 2 - 6, Math.max(h / 2 + 6, y));
  return (
    <g pointerEvents="none">
      <rect x={r1(cx - w / 2)} y={r1(cy - h / 2)} width={r1(w)} height={r1(h)} rx={6} fill={MAP.paper} fillOpacity={0.96} stroke={MAP.ink} strokeWidth={2.2} />
      <text x={r1(cx)} y={r1(cy)} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display">
        {text}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------- legend

function Swatch({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 46 30" className="h-[20px] w-[31px] shrink-0" aria-hidden>
      <g transform="translate(0 15)">{children}</g>
    </svg>
  );
}

const ROUTE_KEY: { kind: 'route' | 'direct' | 'way' | 'check' | 'end'; text: string }[] = [
  { kind: 'route', text: 'המסלול שלכם, וכיוון ההתקדמות' },
  { kind: 'direct', text: 'הקו הישיר (להשוואה)' },
  { kind: 'way', text: 'נקודת מסלול: גוררים אותה' },
  { kind: 'check', text: 'נקודת אימות, לפי סדר הדרך' },
  { kind: 'end', text: 'המוצא A והיעד B' },
];

/** The map key — the plan's marks, then the sheet's own symbols, at their stroke weights. */
export function PlanningMapLegend() {
  const SW = 46;
  const items: { swatch: ReactNode; text: string }[] = [
    { swatch: <path d={`M0 0h${SW}`} stroke={MAP.contour} strokeWidth={HAIR} />, text: `קו גובה · כל ${CONTOUR_INTERVAL_M} מ׳` },
    { swatch: <path d={`M0 0h${SW}`} stroke={MAP.contour} strokeWidth={INDEX_W} />, text: `קו גובה ראשי · כל ${INDEX_INTERVAL_M} מ׳` },
    { swatch: <path d={`M${SW / 2} -9l9 15h-18z`} fill={MAP.ink} />, text: 'נקודת גובה (מ׳)' },
    { swatch: <path d={`M0 0h${SW}`} stroke={WATER.line} strokeWidth={6} />, text: 'נחל' },
    { swatch: <path d={`M0 0h${SW}`} stroke={WATER.line} strokeWidth={3.2} strokeDasharray="7 4.5" />, text: 'ערוץ יבש' },
    {
      swatch: (
        <>
          <path d={`M0 0h${SW}`} stroke={MAP.roadCasing} strokeWidth={ROAD_WIDTH_M + 5} />
          <path d={`M0 0h${SW}`} stroke={MAP.roadFill} strokeWidth={ROAD_WIDTH_M} />
        </>
      ),
      text: 'דרך עפר',
    },
    {
      swatch: (
        <>
          <path d={`M2 -12h${SW - 4}v24h${-(SW - 4)}z`} fill={MAP.vegFill} stroke={MAP.vegInk} strokeWidth={HAIR} strokeDasharray="8 5" />
          <circle cx={15} cy={0} r={6} fill="none" stroke={MAP.vegInk} strokeWidth={2} />
          <circle cx={31} cy={2} r={6} fill="none" stroke={MAP.vegInk} strokeWidth={2} />
        </>
      ),
      text: 'חורשה',
    },
    {
      swatch: (
        <>
          <path d={`M2 -12h${SW - 4}v24h${-(SW - 4)}z`} fill={MAP.vegFill} fillOpacity={0.5} />
          <circle cx={14} cy={-3} r={5} fill="none" stroke={MAP.vegInk} strokeWidth={2} />
          <circle cx={32} cy={4} r={5} fill="none" stroke={MAP.vegInk} strokeWidth={2} />
        </>
      ),
      text: 'חורש (עצים פזורים)',
    },
    {
      swatch: (
        <>
          {[8, 18, 28, 38].map((x) => (
            <circle key={x} cx={x} cy={-5} r={2.6} fill={MAP.vegInk} />
          ))}
          {[8, 18, 28, 38].map((x) => (
            <circle key={`b${x}`} cx={x} cy={6} r={2.6} fill={MAP.vegInk} />
          ))}
        </>
      ),
      text: 'מטע זיתים',
    },
    {
      swatch: (
        <>
          <rect x={9} y={-8} width={16} height={11} fill={MAP.building} />
          <circle cx={34} cy={4} r={6} fill={MAP.paper} stroke={MAP.ink} strokeWidth={2.4} />
          <circle cx={34} cy={4} r={2} fill={MAP.ink} />
        </>
      ),
      text: 'מבנה ומגדל מים',
    },
    { swatch: <path d="M10 8L18 -9L28 -6L36 8Z" fill={MAP.paper} stroke={MAP.ink} strokeWidth={2} strokeLinejoin="round" />, text: 'סלעים' },
  ];
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5" data-legend="map-symbols">
      {ROUTE_KEY.map((it) => (
        <li key={it.text} className="flex items-center gap-2 text-base leading-snug text-black" data-legend-route={it.kind}>
          <RouteKeyGlyph kind={it.kind} />
          {it.text}
        </li>
      ))}
      <li aria-hidden className="col-span-2 my-0.5 border-t border-border" />
      {items.map((it) => (
        <li key={it.text} className="flex items-center gap-2 text-base leading-snug text-black">
          <Swatch>{it.swatch}</Swatch>
          {it.text}
        </li>
      ))}
    </ul>
  );
}

/** Route glyphs for the strip under the views — the same marks the map and the model draw. */
export function RouteKeyGlyph({ kind }: { kind: 'route' | 'direct' | 'way' | 'check' | 'end' }) {
  let g: ReactNode = null;
  if (kind === 'route')
    g = (
      <>
        <path d="M2 0h42" stroke={MAP.accent} strokeWidth={6} strokeLinecap="round" />
        <path d="M18 -5l7 5l-7 5" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  else if (kind === 'direct') g = <path d="M2 0h42" stroke={MAP.ink} strokeWidth={3} strokeDasharray="7 5" strokeLinecap="round" />;
  else if (kind === 'way')
    g = (
      <>
        <circle cx={23} cy={0} r={8} fill="#FFFFFF" stroke={MAP.accent} strokeWidth={3.5} />
        <circle cx={23} cy={0} r={2.5} fill={MAP.accent} />
      </>
    );
  else if (kind === 'check')
    g = (
      <>
        <circle cx={23} cy={0} r={11} fill="#566b46" stroke="#FFFFFF" strokeWidth={2} />
        <text x={23} y={1} textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={14} fontWeight={800} fill="#FFFFFF" className="font-display">
          1
        </text>
      </>
    );
  else if (kind === 'end')
    g = (
      <>
        <circle cx={23} cy={0} r={11} fill={MAP.accent} />
        <text x={23} y={1} textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={14} fontWeight={800} fill="#FFFFFF" className="font-display">
          A
        </text>
      </>
    );
  return <Swatch>{g}</Swatch>;
}
