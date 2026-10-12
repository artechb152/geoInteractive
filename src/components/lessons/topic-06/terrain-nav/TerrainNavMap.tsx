'use client';

import { memo, useId, useRef, useState, type ReactNode } from 'react';
import { MAP } from '../../topic-02/topographyTerrainStyle';
import {
  CONTOUR_INTERVAL_M,
  FIELDS,
  GROVES,
  INDEX_INTERVAL_M,
  ORCHARDS,
  ROAD_WIDTH_M,
  SQUARE_CENTER,
  SQUARE_RING,
  START,
  STREAM,
  WATER_TOWER,
  WOODLAND,
  type CheckpointId,
  type Point,
  type XY,
} from './terrainNavScenario';
import { MAP_SHEET, mapToWorld, worldToMap } from './terrainNavGeometry';
import { checkpoint, contourLabels, contours, houseCorners, houses, roads, summits, trees, waterCourses, type Summit } from './terrainNavTerrain';
import { candidatePoint, type CandidateId, type FeatureId } from './terrainNavPractice';
import { featureInfo, pickFeature } from './terrainNavFeatures';

/**
 * The printed topographic map of the terrain-association activity — a flat,
 * north-up sheet drawn from the same terrain module as the 3D model: the
 * contours are the mesh's own iso-lines (every 10 m, index every 50 m), every
 * tree symbol is a modelled tree at its crown size, every building a modelled
 * house footprint, the roads and the stream the same centre-lines.
 *
 * viewBox units are metres (1 unit = 1 m): worldToMap() is the drawing
 * transform. Grid numbers sit in the collar; the north arrow and the scale bar
 * on the sheet.
 *
 * Line language: brown = relief, blue = water, tan with a dark casing = dirt
 * road, dark green = vegetation, dark grey = buildings. Orange is never terrain:
 * it marks the route, the learner's selection and highlights only.
 */

const W = MAP_SHEET.width;
const H = MAP_SHEET.height;
const COLLAR_W = 66;
const COLLAR_S = 58;
const COLLAR_EDGE = 16;
export const MAP_VIEWBOX = { x: -COLLAR_W, y: -COLLAR_EDGE, w: W + COLLAR_W + COLLAR_EDGE, h: H + COLLAR_EDGE + COLLAR_S } as const;
export const MAP_ASPECT = MAP_VIEWBOX.w / MAP_VIEWBOX.h;

/** Type sizes in viewBox units (≈ 0.28 px per unit in the desktop map column: 50 ≈ 14 px, 56 ≈ 16 px). */
const FS = { label: 54, small: 48, grid: 48, contour: 48, letter: 58 } as const;
const HAIR = 3.2;
const INDEX_W = 6.4;
/** Grid lines: thinner and lighter than any contour, so a 200 m line never reads as relief. */
const GRID_W = 2.2;

/** Water — the existing water tones of the lessons' terrain blocks (topic-02 terrainBlockGeometry). */
export const WATER = { line: '#4F8FA6', fill: '#7FB4C6' } as const;

const r1 = (v: number) => Math.round(v * 10) / 10;
function pathOf(pts: readonly XY[], closed = false) {
  let d = '';
  for (let k = 0; k < pts.length; k++) {
    const m = worldToMap({ E: pts[k][0], N: pts[k][1] });
    d += `${k ? 'L' : 'M'}${r1(m.x)} ${r1(m.y)}`;
  }
  return closed ? `${d}Z` : d;
}
const pointsPath = (ps: readonly Point[], closed = true) => pathOf(ps.map((p) => [p.E, p.N] as XY), closed);
const upright = (deg: number) => (deg > 90 ? deg - 180 : deg <= -90 ? deg + 180 : deg);
const plateW = (text: string, size: number) => text.length * size * 0.56 + size * 0.9;

export type MapCandidate = { readonly id: CandidateId; readonly letter: string };

export type MapLayer = {
  readonly mode: 'learn' | 'practice';
  /** Learn: the whole planned route with its checkpoints and names. */
  readonly fullRoute: boolean;
  /** Practice: checkpoints already verified (the route is drawn up to the last of them). */
  readonly confirmed: readonly CheckpointId[];
  readonly candidates: readonly MapCandidate[];
  readonly selectedCandidate: CandidateId | null;
  /** The map measure from the leg start to the selected point. */
  readonly measure: { readonly from: Point; readonly to: Point; readonly text: string } | null;
  /** Features drawn highlighted (learn selection, hint, evidence). */
  readonly highlights: readonly FeatureId[];
};

export function TerrainNavMap({
  layer,
  onPickFeature,
  onPickCandidate,
  className,
}: {
  layer: MapLayer;
  onPickFeature: (id: FeatureId | null) => void;
  onPickCandidate: (id: CandidateId) => void;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<string | null>(null);

  /** Pointer → map metres through the inverse screen CTM (viewBox, letterboxing and fullscreen scaling included). */
  const toGround = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return null;
    // On-screen tolerance: ~10 px in metres at the current scale.
    const slack = 10 / Math.abs(ctm.a);
    return { ground: mapToWorld(p.x, p.y), slack };
  };
  const hit = (e: { clientX: number; clientY: number }): { kind: 'candidate'; id: CandidateId } | { kind: 'feature'; id: FeatureId } | null => {
    const g = toGround(e);
    if (!g) return null;
    if (layer.mode === 'practice') {
      let best: CandidateId | null = null;
      let bd = Infinity;
      for (const c of layer.candidates) {
        const p = candidatePoint(c.id);
        const d = Math.hypot(p.E - g.ground.E, p.N - g.ground.N);
        if (d < bd) {
          bd = d;
          best = c.id;
        }
      }
      return best && bd <= 70 + g.slack ? { kind: 'candidate', id: best } : null;
    }
    const f = pickFeature(g.ground, g.slack);
    return f ? { kind: 'feature', id: f } : null;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={
        layer.mode === 'learn'
          ? 'מפה טופוגרפית של שטח האימון, צפון למעלה: קווי גובה כל 10 מ׳, שלוש כיפות לאורך הציר, נחל, חורשות, דרכי עפר וכפר עם כיכר מרכזית. A בדרום־מזרח, B בכיכר הכפר.'
          : 'מפת התכנון, צפון למעלה, ועליה נקודות לבחירה באותיות. בחרו נקודה במפה או בכפתורי הנקודות.'
      }
      style={{ cursor: hover ? 'pointer' : 'default', touchAction: 'manipulation' }}
      onPointerMove={(e) => {
        const h = hit(e);
        const key = h ? `${h.kind}:${h.id}` : null;
        if (key !== hover) setHover(key);
      }}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        const h = hit(e);
        if (h?.kind === 'candidate') onPickCandidate(h.id);
        else if (layer.mode === 'learn') onPickFeature(h?.kind === 'feature' ? h.id : null);
      }}
      data-map-mode={layer.mode}
    >
      <MapBase uid={uid} />
      <defs>
        <clipPath id={`tn-sheet-${uid}`}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#tn-sheet-${uid})`}>
        {layer.highlights.map((id) => (
          <FeatureHighlight key={id} id={id} />
        ))}
        {hover?.startsWith('feature:') && !layer.highlights.includes(hover.slice(8) as FeatureId) && <FeatureHighlight id={hover.slice(8) as FeatureId} faint />}
        <RouteLayer layer={layer} />
        {layer.measure && <MeasureLine {...layer.measure} avoid={[START, ...layer.candidates.map((c) => candidatePoint(c.id)), ...layer.confirmed.map((id) => checkpoint(id))]} />}
        {layer.mode === 'practice' &&
          layer.candidates.map((c) => <CandidateMark key={c.id} c={c} selected={layer.selectedCandidate === c.id} hovered={hover === `candidate:${c.id}`} />)}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- static sheet

const MapBase = memo(function MapBase({ uid }: { uid: string }) {
  const clip = `tn-clip-${uid}`;
  const levels = contours();
  const labels = contourLabels();
  const allTrees = trees();
  const w = waterCourses();
  return (
    <g pointerEvents="none">
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      <rect x={MAP_VIEWBOX.x} y={MAP_VIEWBOX.y} width={MAP_VIEWBOX.w} height={MAP_VIEWBOX.h} fill={MAP.collar} />
      <rect x={0} y={0} width={W} height={H} fill={MAP.paper} />
      <g clipPath={`url(#${clip})`}>
        {/* 200 m local grid */}
        <g stroke={MAP.grid} strokeWidth={GRID_W} strokeOpacity={0.75}>
          {Array.from({ length: Math.floor(W / 200) }, (_, k) => (k + 1) * 200)
            .filter((E) => E < W)
            .map((E) => (
              <path key={`e${E}`} d={`M${E} 0V${H}`} />
            ))}
          {Array.from({ length: Math.floor(H / 200) }, (_, k) => (k + 1) * 200)
            .filter((N) => N < H)
            .map((N) => (
              <path key={`n${N}`} d={`M0 ${H - N}H${W}`} />
            ))}
        </g>

        {/* Cultivated fields: boundary only (open ground) */}
        <g fill="none" stroke={MAP.muted} strokeWidth={HAIR} strokeDasharray="4 8" strokeLinecap="round">
          {FIELDS.map((f) => (
            <path key={f.id} d={pathOf(f.ring, true)} />
          ))}
        </g>

        {/* Vegetation: woodland and orchards tinted lightly, groves fully; one symbol per modelled tree */}
        <g fill={MAP.vegFill}>
          {WOODLAND.map((wd) => (
            <path key={wd.id} d={pathOf(wd.ring, true)} fillOpacity={0.55} />
          ))}
          {ORCHARDS.map((o) => (
            <path key={o.id} d={pathOf(o.ring, true)} fillOpacity={0.45} />
          ))}
          {GROVES.map((g) => (
            <path key={g.id} d={pathOf(g.ring, true)} stroke={MAP.vegInk} strokeWidth={HAIR} strokeDasharray="12 8" />
          ))}
        </g>
        {/* Isolated trees (group 'lone') are below this sheet's mapping threshold, as on a printed map of this scale. */}
        <g fill="none" stroke={MAP.vegInk} strokeWidth={2}>
          {allTrees
            .filter((t) => t.kind !== 'olive' && t.group !== 'lone')
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
              return <circle key={i} cx={r1(m.x)} cy={r1(m.y)} r={2.6} />;
            })}
        </g>

        {/* Contours — the 50 m index lines heavier */}
        <g fill="none" stroke={MAP.contour} strokeLinejoin="round">
          {levels.map((lv) =>
            lv.lines.map((line, k) => <path key={`${lv.heightM}-${k}`} d={pathOf(line.pts, line.closed)} strokeWidth={lv.index ? INDEX_W : HAIR} />),
          )}
        </g>

        {/* Water: the stream (solid) and the side gully (dashed) */}
        <g fill="none" stroke={WATER.line} strokeLinecap="round" strokeLinejoin="round">
          <path d={pathOf(w.stream.pts)} strokeWidth={STREAM.waterWidthM + 2.5} />
          {w.gullies.map((g) => (
            <path key={g.id} d={pathOf(g.pts)} strokeWidth={3.2} strokeDasharray="16 10" />
          ))}
        </g>

        {/* Dirt roads: the shared 6 m width, cased */}
        {roads().map((r) => (
          <path key={`c-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadCasing} strokeWidth={ROAD_WIDTH_M + 5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {roads().map((r) => (
          <path key={`f-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadFill} strokeWidth={ROAD_WIDTH_M} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* The village: the paved square, every house footprint, the water tower */}
        <path d={pathOf(SQUARE_RING, true)} fill={MAP.hairline} stroke={MAP.ink} strokeWidth={2.4} />
        <g fill={MAP.building}>
          {houses().map((h, i) => (
            <path key={i} d={pointsPath(houseCorners(h))} />
          ))}
        </g>
        <WaterTowerSymbol />

        {/* Index-contour heights, set into their line on a paper plate */}
        {labels.map((l) => {
          const m = worldToMap(l);
          return (
            <g key={`${l.heightM}-${l.E}`} transform={`translate(${r1(m.x)} ${r1(m.y)}) rotate(${r1(upright(l.angleDeg))})`}>
              <rect x={-38} y={-22} width={76} height={44} rx={6} fill={MAP.paper} />
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
      <rect x={0} y={0} width={W} height={H} fill="none" stroke={MAP.ink} strokeWidth={3} />
      <GridLabels />
    </g>
  );
});

function WaterTowerSymbol() {
  const m = worldToMap(WATER_TOWER);
  return (
    <g>
      <circle cx={m.x} cy={m.y} r={11} fill={MAP.paper} stroke={MAP.ink} strokeWidth={3.4} />
      <circle cx={m.x} cy={m.y} r={3.6} fill={MAP.ink} />
    </g>
  );
}

/** A Hebrew label on a paper plate (no stroke halo). anchor: 'middle'; 'start' = right edge at x (RTL); 'end' = left edge at x. */
function PlateLabel({ x, y, size, weight, anchor = 'middle', fill = MAP.ink, children }: { x: number; y: number; size: number; weight: number; anchor?: 'middle' | 'start' | 'end'; fill?: string; children: string }) {
  const w = plateW(children, size);
  const h = size * 1.32;
  const pad = size * 0.4;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x - w + pad : x - pad;
  return (
    <g pointerEvents="none">
      <rect x={r1(left)} y={r1(y - h / 2)} width={r1(w)} height={r1(h)} rx={size * 0.25} fill={MAP.paper} fillOpacity={0.94} />
      <text x={r1(x)} y={r1(y)} textAnchor={anchor} dominantBaseline="central" direction="rtl" fontSize={size} fontWeight={weight} fill={fill} className="font-display">
        {children}
      </text>
    </g>
  );
}

function SpotHeight({ s }: { s: Summit }) {
  const m = worldToMap(s);
  // the value sits east of the triangle, or west of it near the sheet's east edge
  const x = m.x > W - 120 ? m.x - 98 : m.x + 14;
  return (
    <g data-spot={s.id}>
      <path d={`M${r1(m.x)} ${r1(m.y - 11)}l11 19h-22z`} fill={MAP.ink} />
      <rect x={r1(x)} y={r1(m.y - 22)} width={84} height={42} rx={6} fill={MAP.paper} fillOpacity={0.92} />
      <text x={r1(x + 4)} y={r1(m.y - 1)} textAnchor="start" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display tabular-nums">
        {Math.round(s.heightM)}
      </text>
    </g>
  );
}

/** Local grid numbers: northings along the west side (read bottom-up), eastings under the sheet. */
function GridLabels() {
  const common = { fontSize: FS.grid, fontWeight: 600, fill: MAP.muted, className: 'font-display tabular-nums', dominantBaseline: 'central' as const, direction: 'ltr' as const };
  const es = Array.from({ length: Math.floor(W / 200) + 1 }, (_, k) => k * 200);
  const ns = Array.from({ length: Math.floor(H / 200) }, (_, k) => (k + 1) * 200);
  return (
    <g pointerEvents="none">
      {es.map((E) => (
        <text key={E} x={E} y={H + COLLAR_S / 2} textAnchor={E === 0 ? 'start' : E === W ? 'end' : 'middle'} {...common}>
          {E}
        </text>
      ))}
      {ns.map((N) => (
        <text key={N} transform={`translate(${-COLLAR_W / 2} ${H - N}) rotate(-90)`} textAnchor="middle" {...common}>
          {N}
        </text>
      ))}
    </g>
  );
}

/** North arrow on a paper plate in the sheet's north-east corner. */
function NorthArrow() {
  const x = W - 62;
  const y = 26;
  return (
    <g pointerEvents="none" data-map="north">
      <rect x={x - 46} y={y - 10} width={92} height={170} rx={12} fill={MAP.paper} fillOpacity={0.94} />
      <text x={x} y={y + 28} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display">
        צפון
      </text>
      <path d={`M${x} ${y + 58}l21 94l-21 -23l-21 23z`} fill={MAP.ink} />
    </g>
  );
}

/** 0–400 m on a paper plate in the sheet's south-west corner; its length is in map metres, the drawing transform itself. */
function ScaleBar() {
  const seg = 100;
  const x0 = 40;
  const y = H - 46;
  return (
    <g pointerEvents="none" data-map="scale">
      <rect x={12} y={y - 74} width={4 * seg + 136} height={104} rx={12} fill={MAP.paper} fillOpacity={0.94} />
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={x0 + k * seg} y={y} width={seg} height={16} fill={k % 2 === 0 ? MAP.ink : MAP.collar} stroke={MAP.ink} strokeWidth={2} />
      ))}
      {[0, 200, 400].map((m) => (
        <text key={m} x={x0 + m} y={y - 28} textAnchor="middle" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
          {m}
        </text>
      ))}
      <text x={x0 + 4 * seg + 34} y={y + 8} textAnchor="end" direction="rtl" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display">
        מ׳
      </text>
    </g>
  );
}

// ---------------------------------------------------------------- overlays

/** The closed contour around a dome's summit at the first level at least 20 m below it — what "a dome" looks like on the map. */
function domeOutline(id: FeatureId): string | null {
  const s = summits().find((q) => q.id === id);
  if (!s) return null;
  const level = Math.floor((s.heightM - 20) / CONTOUR_INTERVAL_M) * CONTOUR_INTERVAL_M;
  const lv = contours().find((c) => c.heightM === level);
  if (!lv) return null;
  // the closed line that contains the summit (ray cast)
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

const HL = { stroke: MAP.accent, fill: MAP.accent } as const;

/** A feature drawn in the highlight colour on top of its own symbol — the same geometry the model highlights. */
function FeatureHighlight({ id, faint }: { id: FeatureId; faint?: boolean }) {
  const op = faint ? 0.45 : 1;
  const ring = (p: Point, r: number) => {
    const m = worldToMap(p);
    return <circle cx={m.x} cy={m.y} r={r} fill={HL.fill} fillOpacity={0.14 * op} stroke={HL.stroke} strokeOpacity={op} strokeWidth={7} />;
  };
  let body: ReactNode = null;
  if (id === 'A') body = ring(START, 46);
  else if (id === 'tower') body = ring(WATER_TOWER, 40);
  else if (id === 'square') body = <path d={pathOf(SQUARE_RING, true)} fill={HL.fill} fillOpacity={0.3 * op} stroke={HL.stroke} strokeOpacity={op} strokeWidth={7} />;
  else if (id === 'village') {
    body = (
      <g fill={HL.fill} fillOpacity={0.85 * op}>
        {houses().map((h, i) => (
          <path key={i} d={pointsPath(houseCorners(h))} stroke={HL.stroke} strokeWidth={5} strokeOpacity={op} />
        ))}
      </g>
    );
  } else if (id === 'G1' || id === 'G2' || id === 'G3') {
    const g = GROVES.find((q) => q.id === id)!;
    body = <path d={pathOf(g.ring, true)} fill={HL.fill} fillOpacity={0.16 * op} stroke={HL.stroke} strokeOpacity={op} strokeWidth={7} />;
  } else if (id === 'stream' || id === 'gully-north') {
    const w = waterCourses();
    const pts = id === 'stream' ? w.stream.pts : w.gullies.find((g) => g.id === id)!.pts;
    body = <path d={pathOf(pts)} fill="none" stroke={HL.stroke} strokeOpacity={0.5 * op} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />;
  } else if (id === 'track-east' || id === 'road-west' || id === 'road-north') {
    const r = roads().find((q) => q.id === id)!;
    body = <path d={pathOf(r.pts)} fill="none" stroke={HL.stroke} strokeOpacity={0.5 * op} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />;
  } else {
    const d = domeOutline(id);
    if (d) body = <path d={d} fill={HL.fill} fillOpacity={0.14 * op} stroke={HL.stroke} strokeOpacity={op} strokeWidth={7} strokeLinejoin="round" />;
  }
  return (
    <g pointerEvents="none" data-highlight={id}>
      {body}
    </g>
  );
}

function Chevron({ from, to }: { from: Point; to: Point }) {
  const a = worldToMap(from);
  const b = worldToMap(to);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return <path d="M-13 -13L4 0L-13 13" transform={`translate(${r1(mx)} ${r1(my)}) rotate(${r1(ang)})`} fill="none" stroke={MAP.accent} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />;
}

/**
 * The route: in learn mode the whole plan (dashed, with chevrons, A, the three
 * checkpoints and B named); in practice the legs walked so far (solid) up to
 * the last verified checkpoint, and A. Nothing marks the leg being checked.
 */
function RouteLayer({ layer }: { layer: MapLayer }) {
  const pts = [START, ...(['H1', 'H2', 'H3', 'B'] as const).map((id) => checkpoint(id))];
  const ids = ['A', 'H1', 'H2', 'H3', 'B'] as const;
  const info = featureInfo();
  const shownUpTo = layer.fullRoute ? 4 : layer.confirmed.length;
  const path = (k: number) => pointsPath(pts.slice(0, k + 1), false);
  return (
    <g pointerEvents="none" data-route={layer.fullRoute ? 'plan' : `walked-${layer.confirmed.length}`}>
      {shownUpTo > 0 && (
        <>
          <path d={path(shownUpTo)} fill="none" stroke={MAP.paper} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" strokeOpacity={0.85} />
          <path
            d={path(shownUpTo)}
            fill="none"
            stroke={MAP.accent}
            strokeWidth={9}
            strokeDasharray={layer.fullRoute ? '22 13' : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.slice(1, shownUpTo + 1).map((p, k) => (
            <Chevron key={k} from={pts[k]} to={p} />
          ))}
        </>
      )}
      {/* Checkpoints shown: their ring, and their name in learn mode or once verified */}
      {pts.slice(1, shownUpTo + 1).map((p, k) => {
        const id = ids[k + 1];
        const m = worldToMap(p);
        const isB = id === 'B';
        const name = isB ? 'B' : info.get(id as FeatureId)!.name;
        return (
          <g key={id} data-checkpoint={id}>
            <circle cx={m.x} cy={m.y} r={isB ? 26 : 22} fill={MAP.paper} fillOpacity={0.8} stroke={MAP.accent} strokeWidth={7} />
            <circle cx={m.x} cy={m.y} r={isB ? 9 : 7} fill={MAP.accent} />
            {isB ? (
              <PlateLabel x={m.x - 40} y={m.y - 44} size={FS.label} weight={800} fill={MAP.ink}>
                B
              </PlateLabel>
            ) : (
              <PlateLabel x={m.x - 34} y={m.y + 50} size={FS.label} weight={800} anchor="start">
                {name}
              </PlateLabel>
            )}
          </g>
        );
      })}
      {/* A — the known start */}
      {(() => {
        const m = worldToMap(START);
        return (
          <g data-checkpoint="A">
            <circle cx={m.x} cy={m.y} r={30} fill={MAP.accent} stroke={MAP.paper} strokeWidth={5} />
            <text x={m.x} y={m.y + 1} textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={44} fontWeight={800} fill="#FFFFFF" className="font-display">
              A
            </text>
          </g>
        );
      })()}
      {layer.fullRoute && (
        <PlateLabel x={worldToMap(SQUARE_CENTER).x + 60} y={worldToMap(SQUARE_CENTER).y + 58} size={FS.small} weight={700} anchor="end">
          כיכר
        </PlateLabel>
      )}
    </g>
  );
}

const DOME_IDS = { H1: 1, H2: 1, H3: 1, D1: 1, D2: 1, D3: 1, D4: 1 } as const;

/** A point the learner can mark: a ring with its letter on a plate. The real point is never told apart. */
function CandidateMark({ c, selected, hovered }: { c: MapCandidate; selected: boolean; hovered: boolean }) {
  const m = worldToMap(candidatePoint(c.id));
  // A summit carries a spot height, so its letter sits beside it, on the side away from the
  // value (east of the triangle, west near the east edge). Points in the village sit close
  // together: their letter is on the point itself.
  const onPoint = !(c.id in DOME_IDS);
  const lx = onPoint ? m.x : m.x > W - 120 ? m.x + 50 : m.x - 50;
  const ly = onPoint ? m.y : m.y - 44;
  return (
    <g pointerEvents="none" data-candidate={c.id} data-selected={selected || undefined}>
      <circle
        cx={m.x}
        cy={m.y}
        r={onPoint ? 42 : 32}
        fill={selected ? MAP.accent : MAP.paper}
        fillOpacity={selected ? 0.22 : 0}
        stroke={selected ? MAP.accent : MAP.ink}
        strokeWidth={selected ? 8 : hovered ? 6 : 4.5}
        strokeDasharray={selected ? undefined : '11 8'}
      />
      {!onPoint && <circle cx={m.x} cy={m.y} r={selected ? 9 : 7} fill={selected ? MAP.accent : MAP.ink} />}
      <g transform={`translate(${r1(lx)} ${r1(ly)})`}>
        <rect x={-34} y={-34} width={68} height={68} rx={34} fill={selected ? MAP.accent : MAP.paper} stroke={selected ? MAP.accent : MAP.ink} strokeWidth={4} />
        <text textAnchor="middle" dominantBaseline="central" direction="rtl" y={2} fontSize={52} fontWeight={800} fill={selected ? '#FFFFFF' : MAP.ink} className="font-display">
          {c.letter}
        </text>
      </g>
    </g>
  );
}

/** The map's direction and distance from the leg start to the marked point (plain ink, solid: a map measure). */
function MeasureLine({ from, to, text, avoid }: { from: Point; to: Point; text: string; avoid: readonly Point[] }) {
  const a = worldToMap(from);
  const b = worldToMap(to);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const L = 30;
  const end = { x: b.x - Math.cos(ang) * 36, y: b.y - Math.sin(ang) * 36 };
  const head = `M${r1(end.x)} ${r1(end.y)}L${r1(end.x - L * Math.cos(ang - 0.4))} ${r1(end.y - L * Math.sin(ang - 0.4))}L${r1(end.x - L * Math.cos(ang + 0.4))} ${r1(end.y - L * Math.sin(ang + 0.4))}Z`;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  // The value plate beside the line's middle, on the side farther from the other marked points.
  const nx = Math.sin(ang);
  const ny = -Math.cos(ang);
  const w = plateW(text, FS.small);
  const offset = 30 + w / 2;
  const sides = [1, -1].map((side) => {
    const at = { x: mid.x + nx * offset * side, y: mid.y + ny * offset * side };
    const clear = Math.min(...avoid.map((p) => worldToMap(p)).map((m) => Math.hypot(m.x - at.x, m.y - at.y)));
    return { at, clear };
  });
  const { at } = sides[0].clear >= sides[1].clear ? sides[0] : sides[1];
  return (
    <g pointerEvents="none" data-overlay="measure">
      <path d={`M${r1(a.x)} ${r1(a.y)}L${r1(end.x)} ${r1(end.y)}`} stroke={MAP.paper} strokeWidth={11} strokeLinecap="round" strokeOpacity={0.85} />
      <path d={`M${r1(a.x)} ${r1(a.y)}L${r1(end.x)} ${r1(end.y)}`} stroke={MAP.ink} strokeWidth={5} strokeLinecap="round" />
      <path d={head} fill={MAP.ink} />
      <rect x={r1(at.x - w / 2)} y={r1(at.y - FS.small * 0.7)} width={r1(w)} height={r1(FS.small * 1.4)} rx={8} fill={MAP.paper} fillOpacity={0.97} stroke={MAP.ink} strokeWidth={3} />
      <text x={r1(at.x)} y={r1(at.y)} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.small} fontWeight={700} fill={MAP.ink} className="font-display tabular-nums">
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

/** The map key — the sheet's own symbols, at the sheet's stroke weights. */
export function MapSymbolLegend() {
  const SW = 46;
  const items: { swatch: ReactNode; text: string }[] = [
    { swatch: <path d={`M0 0h${SW}`} stroke={MAP.contour} strokeWidth={HAIR} />, text: `קו גובה · כל ${CONTOUR_INTERVAL_M} מ׳` },
    { swatch: <path d={`M0 0h${SW}`} stroke={MAP.contour} strokeWidth={INDEX_W} />, text: `קו גובה ראשי · כל ${INDEX_INTERVAL_M} מ׳` },
    { swatch: <path d={`M${SW / 2} -11l11 19h-22z`} fill={MAP.ink} />, text: 'נקודת גובה (מ׳)' },
    { swatch: <path d={`M2 0h${SW - 4}`} stroke={MAP.accent} strokeWidth={5} strokeLinecap="round" />, text: 'קטעי דרך שאומתו (בתרגול)' },
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
          <path d={`M2 -12h${SW - 4}v24h${-(SW - 4)}z`} fill={MAP.vegFill} fillOpacity={0.55} />
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
    { swatch: <path d={`M2 -10h${SW - 4}v20h${-(SW - 4)}z`} fill="none" stroke={MAP.muted} strokeWidth={HAIR} strokeDasharray="3 5" />, text: 'שדה מעובד' },
    {
      swatch: (
        <>
          <rect x={6} y={-9} width={13} height={11} fill={MAP.building} />
          <rect x={25} y={-4} width={14} height={12} fill={MAP.building} />
        </>
      ),
      text: 'מבנה',
    },
    {
      swatch: (
        <>
          <circle cx={SW / 2} cy={0} r={9} fill={MAP.paper} stroke={MAP.ink} strokeWidth={3} />
          <circle cx={SW / 2} cy={0} r={3} fill={MAP.ink} />
        </>
      ),
      text: 'מגדל מים',
    },
  ];
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5" data-legend="map-symbols">
      {items.map((it) => (
        <li key={it.text} className="flex items-center gap-2 text-base leading-snug text-black">
          <Swatch>{it.swatch}</Swatch>
          {it.text}
        </li>
      ))}
    </ul>
  );
}

/** Swatches for the approved legend items — the same marks the map and the model use for them. */
export type RouteGlyphKind = 'hill' | 'village' | 'route' | 'checkpoint' | 'start' | 'target';
/** Any other kind draws nothing (the scene's legend type is wider than this map's marks). */
export function RouteGlyph({ kind }: { kind: RouteGlyphKind | (string & {}) }) {
  let g: ReactNode = null;
  if (kind === 'hill')
    g = (
      <>
        <ellipse cx={23} cy={0} rx={20} ry={12} fill="none" stroke={MAP.contour} strokeWidth={2.4} />
        <ellipse cx={23} cy={0} rx={11} ry={6} fill="none" stroke={MAP.contour} strokeWidth={2.4} />
        <path d="M23 -4l4 7h-8z" fill={MAP.ink} />
      </>
    );
  else if (kind === 'village')
    g = (
      <>
        <rect x={5} y={-10} width={10} height={9} fill={MAP.building} />
        <rect x={19} y={-6} width={10} height={10} fill={MAP.building} />
        <rect x={32} y={-11} width={9} height={9} fill={MAP.building} />
        <rect x={9} y={3} width={11} height={8} fill={MAP.building} />
      </>
    );
  else if (kind === 'route')
    g = (
      <>
        <path d="M2 0h42" stroke={MAP.accent} strokeWidth={4} strokeDasharray="9 5" strokeLinecap="round" />
        <path d="M19 -6l7 6l-7 6" fill="none" stroke={MAP.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  else if (kind === 'checkpoint')
    g = (
      <>
        <circle cx={23} cy={0} r={10} fill={MAP.paper} stroke={MAP.accent} strokeWidth={3.5} />
        <circle cx={23} cy={0} r={3.5} fill={MAP.accent} />
      </>
    );
  else if (kind === 'start')
    g = (
      <>
        <circle cx={23} cy={0} r={11} fill={MAP.accent} />
        <text x={23} y={1} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} fill="#FFFFFF" className="font-display">
          A
        </text>
      </>
    );
  else if (kind === 'target')
    g = (
      <>
        <rect x={10} y={-10} width={26} height={20} fill={MAP.hairline} stroke={MAP.ink} strokeWidth={1.6} />
        <circle cx={23} cy={0} r={8} fill={MAP.paper} stroke={MAP.accent} strokeWidth={3.5} />
        <circle cx={23} cy={0} r={3} fill={MAP.accent} />
      </>
    );
  return <Swatch>{g}</Swatch>;
}
