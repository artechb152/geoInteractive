'use client';

import { memo, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { MAP } from '../topic-02/topographyTerrainStyle';
import {
  CANDIDATES,
  FORK,
  GROVES,
  LAST_KNOWN,
  OBSERVER,
  READINGS,
  ROAD_WIDTH_M,
  type CandidateId,
  type Point,
  type XY,
} from './locationCheckScenario';
import { MAP_SHEET, bearing, destination, distance, formatBearing, formatMetres, grovePolygon, metresToMap, signedTurn, worldToMap } from './locationCheckGeometry';
import { CONTOUR_INTERVAL_M, contourLabels, contours, groveTrees, roads, spotHeights } from './locationCheckTerrain';
import { candidateCenter, directionCheck, distanceCheck, type DirectionCheck } from './locationCheckState';
import type { LookStore } from './locationCheckViewStore';

/**
 * The printed topographic map of the location-check activity — a straight,
 * north-up sheet drawn from the same terrain module as the 3D observation:
 * contours are the mesh's own iso-lines, the grove symbols are the model's
 * tree positions, the roads are the same centre-lines at the same 8 m width.
 *
 * viewBox units are metres (1 unit = 1 m): the neatline is 1400 × 1050, so
 * worldToMap() of the geometry module is the drawing transform itself. Grid
 * labels, legend, north arrow and scale bar sit in the collar outside it.
 *
 * Pointer → area: the client point goes through the inverse screen CTM
 * (viewBox, preserveAspectRatio, collar and any fullscreen scaling included)
 * and is hit-tested against each area's halo and name plate — never against
 * pixel regions. The groves are landmarks only, not targets. The keyboard path
 * is the activity's area buttons, which select the same ids.
 *
 * A chosen area shows its own map values at once, in plain ink and before any
 * check: the bearing from its centre to the road split and the distance from
 * the last known position — computed by the same functions as the check.
 *
 * Line language: solid = what the map shows (roads, the map bearing, the
 * paced-distance ring); dashed = what was measured or is only a hypothesis
 * (the measured bearing, the hypothesis halos, the faded last-known mark).
 */

const W = MAP_SHEET.width;
const H = MAP_SHEET.height;
/** Collar: northings on the west side, eastings under the sheet, a hairline margin elsewhere. */
const COLLAR_W = 54;
const COLLAR_S = 50;
const COLLAR_EDGE = 14;
export const MAP_VIEWBOX = { x: -COLLAR_W, y: -COLLAR_EDGE, w: W + COLLAR_W + COLLAR_EDGE, h: H + COLLAR_EDGE + COLLAR_S } as const;
/** Width / height of the whole map frame — the activity sizes the map column with it, so map and observation share a height. */
export const MAP_ASPECT = MAP_VIEWBOX.w / MAP_VIEWBOX.h;

/** Type sizes in viewBox units (≈ 0.34 px per unit in the desktop map column: 40 ≈ 13.5 px, 48 ≈ 16 px). */
const FS = { feature: 46, small: 41, grid: 38, area: 48, contour: 40 } as const;
/** Selection halo around a hypothesis centre — a selection mark, not an accuracy radius. */
export const HALO_R = 55;
/** Minimum line weight: ≈ 1 px at the desktop width. */
const HAIR = 2.4;
const GROVE_DASH = '10 7';

const COLORS = {
  // overlay roles, from the existing tokens (tailwind.config.ts)
  hot: '#e2553a', // accent-hot — the measured azimuth, as on the compass above (lines and borders only)
  dim: '#8A8873', // fg-dim — faded last-known position
} as const;

const r1 = (v: number) => Math.round(v * 10) / 10;
const toXY = (p: Point) => worldToMap(p);
function pathOf(pts: readonly XY[], closed = false) {
  let d = '';
  for (let k = 0; k < pts.length; k++) {
    const m = toXY({ E: pts[k][0], N: pts[k][1] });
    d += `${k ? 'L' : 'M'}${r1(m.x)} ${r1(m.y)}`;
  }
  return closed ? `${d}Z` : d;
}
const ringXY = (ring: readonly Point[]) => pathOf(ring.map((p) => [p.E, p.N] as XY), true);
/** Never set text upside down. */
const upright = (deg: number) => (deg > 90 ? deg - 180 : deg <= -90 ? deg + 180 : deg);
/** Plate width for a label: estimated glyph run plus slack (the font is not measured). */
const plateW = (text: string, size: number) => text.length * size * 0.56 + size * 0.9;

type PlateAnchor = 'middle' | 'start' | 'end';
/** The paper plate behind a label (map units); anchor as in PlateLabel. */
function plateRect(x: number, y: number, text: string, size: number, anchor: PlateAnchor) {
  const w = plateW(text, size);
  const h = size * 1.32;
  const pad = size * 0.4;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x - w + pad : x - pad;
  return { left, top: y - h / 2, w, h };
}

/** Where an area's name sits: beside its halo, on the side away from the other area. */
function areaLabel(c: (typeof CANDIDATES)[number]) {
  const m = toXY(c.center);
  const right = c.id === 'area-2';
  return { x: right ? m.x + HALO_R + 12 : m.x - HALO_R - 12, y: m.y, anchor: (right ? 'end' : 'start') as PlateAnchor };
}

/** The area under a map point (map units): its halo, with a little slack, or its name plate. */
function hitTest(x: number, y: number): CandidateId | null {
  for (const c of CANDIDATES) {
    const m = toXY(c.center);
    if (Math.hypot(x - m.x, y - m.y) <= HALO_R + 8) return c.id;
    const l = areaLabel(c);
    const r = plateRect(l.x, l.y, c.label, FS.area, l.anchor);
    if (x >= r.left && x <= r.left + r.w && y >= r.top && y <= r.top + r.h) return c.id;
  }
  return null;
}

export function LocationCheckMap({
  selectedCandidate,
  checked,
  solved,
  lookStore,
  onSelectCandidate,
  className,
}: {
  selectedCandidate: CandidateId | null;
  /** A fresh (not stale) check of the chosen area exists; false before a check or after the choice changed. */
  checked: boolean;
  solved: boolean;
  lookStore: LookStore;
  onSelectCandidate: (id: CandidateId) => void;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<CandidateId | null>(null);
  const uid = useId().replace(/:/g, '');

  const pointerHit = (e: { clientX: number; clientY: number }): CandidateId | null => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return hitTest(p.x, p.y);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="מפת התרגיל, צפון למעלה: התפצלות הדרך, שתי חורשות, המיקום האחרון הידוע ושני אזורי מיקום אפשריים. בוחרים אזור במפה או בכפתורי האזור."
      style={{ cursor: hover ? 'pointer' : 'default', touchAction: 'manipulation' }}
      onPointerMove={(e) => {
        const h = pointerHit(e);
        if (h !== hover) setHover(h);
      }}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        const h = pointerHit(e);
        if (h) onSelectCandidate(h);
      }}
    >
      <MapBase uid={uid} />

      {/* Exercise layer */}
      <LastKnownMarker />
      {CANDIDATES.map((c) => (
        <CandidateMarker key={c.id} c={c} selected={selectedCandidate === c.id} hovered={hover === c.id} />
      ))}

      {/* The chosen area's values and the check results stay on the sheet: clipped to the neatline. */}
      <defs>
        <clipPath id={`lc-sheet-${uid}`}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#lc-sheet-${uid})`}>
        {selectedCandidate && <AreaOverlay candidateId={selectedCandidate} checked={checked} />}
        {solved && <ObserverReveal lookStore={lookStore} />}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- static sheet

const MapBase = memo(function MapBase({ uid }: { uid: string }) {
  const clip = `lc-clip-${uid}`;
  const levels = contours();
  const labels = contourLabels();
  const trees = groveTrees();
  const { summit, westHill } = spotHeights();
  const f = toXY(FORK);
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      <rect x={MAP_VIEWBOX.x} y={MAP_VIEWBOX.y} width={MAP_VIEWBOX.w} height={MAP_VIEWBOX.h} fill={MAP.collar} />
      <rect x={0} y={0} width={W} height={H} fill={MAP.paper} />

      <g clipPath={`url(#${clip})`}>
        {/* 100 m local grid */}
        <g stroke={MAP.grid} strokeWidth={HAIR}>
          {Array.from({ length: W / 100 - 1 }, (_, k) => (k + 1) * 100).map((E) => (
            <path key={`e${E}`} d={`M${E} 0V${H}`} />
          ))}
          {Array.from({ length: Math.floor(H / 100) }, (_, k) => (k + 1) * 100).map((N) => (
            <path key={`n${N}`} d={`M0 ${H - N}H${W}`} />
          ))}
        </g>

        {/* Groves: tint, outline, and one symbol per real tree (crown size) */}
        {GROVES.map((g) => (
          <path key={g.id} d={ringXY(grovePolygon(g.center))} fill={MAP.vegFill} stroke={MAP.vegInk} strokeWidth={HAIR} strokeDasharray={GROVE_DASH} />
        ))}
        <g fill="none" stroke={MAP.vegInk} strokeWidth={2}>
          {trees.map((t, i) => {
            const m = toXY(t);
            return <circle key={i} cx={r1(m.x)} cy={r1(m.y)} r={r1(t.crownR)} />;
          })}
        </g>

        {/* Contours — the 50 m index lines heavier */}
        {levels.map((lv) =>
          lv.lines.map((line, k) => (
            <path
              key={`${lv.heightM}-${k}`}
              d={pathOf(line.pts, line.closed)}
              fill="none"
              stroke={MAP.contour}
              strokeWidth={lv.index ? 4.6 : HAIR}
              strokeLinejoin="round"
            />
          )),
        )}

        {/* Dirt roads: the shared 8 m width, cased */}
        {roads().map((r) => (
          <path key={`c-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadCasing} strokeWidth={ROAD_WIDTH_M + 4} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {roads().map((r) => (
          <path key={`f-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadFill} strokeWidth={ROAD_WIDTH_M} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* The junction itself, and its name in the road-free wedge east of it */}
        <circle cx={f.x} cy={f.y} r={8} fill={MAP.ink} />
        <PlateLabel x={f.x + 26} y={f.y + 14} size={FS.small} weight={700} anchor="end">
          התפצלות הדרך
        </PlateLabel>

        {/* Index-contour heights, set into their line on a paper plate */}
        {labels.map((l) => {
          const m = toXY(l);
          return (
            <g key={`${l.heightM}-${l.E}`} transform={`translate(${r1(m.x)} ${r1(m.y)}) rotate(${r1(upright(l.angleDeg))})`}>
              <rect x={-34} y={-19} width={68} height={38} rx={6} fill={MAP.paper} />
              <text textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={FS.contour} fontWeight={700} fill={MAP.contour} className="font-display tabular-nums">
                {l.heightM}
              </text>
            </g>
          );
        })}

        <SpotHeight p={summit} />
        <SpotHeight p={westHill} />
        <NorthArrow />
        <ScaleBar />

        {/* Grove names */}
        {GROVES.map((g) => {
          const m = toXY({ E: g.center.E, N: g.center.N + 50 + 28 });
          return (
            <PlateLabel key={g.id} x={m.x} y={m.y} size={FS.feature} weight={700}>
              {g.mapLabel}
            </PlateLabel>
          );
        })}
      </g>

      <rect x={0} y={0} width={W} height={H} fill="none" stroke={MAP.ink} strokeWidth={3} />
      <GridLabels />
    </>
  );
});

/**
 * A Hebrew label on a paper plate (no stroke halo). anchor — where x sits:
 * 'middle'; 'start' = the label's right edge (it runs leftward, RTL);
 * 'end' = the label's left edge (it runs rightward).
 */
function PlateLabel({
  x,
  y,
  size,
  weight,
  anchor = 'middle',
  fill = MAP.ink,
  children,
}: {
  x: number;
  y: number;
  size: number;
  weight: number;
  anchor?: PlateAnchor;
  fill?: string;
  children: string;
}) {
  const r = plateRect(x, y, children, size, anchor);
  return (
    <g pointerEvents="none">
      <rect x={r1(r.left)} y={r1(r.top)} width={r1(r.w)} height={r1(r.h)} rx={size * 0.25} fill={MAP.paper} fillOpacity={0.94} />
      <text x={r1(x)} y={r1(y)} textAnchor={anchor} dominantBaseline="central" direction="rtl" fontSize={size} fontWeight={weight} fill={fill} className="font-display">
        {children}
      </text>
    </g>
  );
}

function SpotHeight({ p }: { p: { E: number; N: number; heightM: number } }) {
  const m = toXY(p);
  return (
    <g pointerEvents="none">
      <path d={`M${r1(m.x)} ${r1(m.y - 10)}l10 17h-20z`} fill={MAP.ink} />
      <rect x={r1(m.x + 13)} y={r1(m.y - 18)} width={70} height={36} rx={6} fill={MAP.paper} fillOpacity={0.94} />
      <text x={r1(m.x + 17)} y={r1(m.y)} textAnchor="start" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display tabular-nums">
        {Math.round(p.heightM)}
      </text>
    </g>
  );
}

/** Local grid numbers: northings along the west side (read bottom-up), eastings under the sheet. */
function GridLabels() {
  const common = { fontSize: FS.grid, fontWeight: 600, fill: MAP.muted, className: 'font-display tabular-nums', dominantBaseline: 'central' as const, direction: 'ltr' as const };
  const es = Array.from({ length: W / 200 + 1 }, (_, k) => k * 200);
  // N = 0 is left out: the corner already carries the easting 0.
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

/** North arrow on a paper plate in the sheet's north-east corner (clear of the roads). */
function NorthArrow() {
  const x = W - 52;
  const y = 22;
  return (
    <g pointerEvents="none">
      <rect x={x - 40} y={y - 8} width={80} height={150} rx={10} fill={MAP.paper} fillOpacity={0.94} />
      <text x={x} y={y + 24} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display">
        צפון
      </text>
      <path d={`M${x} ${y + 50}l18 82l-18 -20l-18 20z`} fill={MAP.ink} />
    </g>
  );
}

/** 0–300 m on a paper plate in the sheet's south-west corner; its length is metresToMap(), the drawing transform. */
function ScaleBar() {
  const seg = metresToMap(100);
  const x0 = 34;
  const y = H - 40;
  return (
    <g pointerEvents="none">
      <rect x={10} y={y - 64} width={3 * seg + 110} height={92} rx={10} fill={MAP.paper} fillOpacity={0.94} />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={x0 + k * seg} y={y} width={seg} height={15} fill={k % 2 === 0 ? MAP.ink : MAP.collar} stroke={MAP.ink} strokeWidth={2} />
      ))}
      {[0, 100, 200, 300].map((m, k) => (
        <text key={m} x={x0 + k * seg} y={y - 26} textAnchor="middle" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
          {m}
        </text>
      ))}
      {/* RTL: the text's end (its left edge) sits at x, so it reads to the right of the bar. */}
      <text x={x0 + 3 * seg + 14} y={y + 8} textAnchor="end" direction="rtl" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display">
        מ׳
      </text>
    </g>
  );
}

// ---------------------------------------------------------------- legend (HTML, shown on demand)

function Swatch({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 46 30" className="h-[20px] w-[31px] shrink-0" aria-hidden>
      <g transform="translate(0 15)">{children}</g>
    </svg>
  );
}

/**
 * The map key, as a list for a popover: the sheet's symbols, and — while an
 * area or a check result is drawn — what its lines mean. Same strokes as the sheet.
 */
export function MapLegend({ area, result, solved }: { area: boolean; result: boolean; solved: boolean }) {
  const SW = 46;
  const items: { swatch: ReactNode; text: string }[] = [
    { swatch: <path d={`M0 0h${SW}`} stroke={MAP.contour} strokeWidth={HAIR} />, text: `קו גובה · כל ${CONTOUR_INTERVAL_M} מ׳` },
    { swatch: <path d={`M0 0h${SW}`} stroke={MAP.contour} strokeWidth={4.6} />, text: 'קו גובה ראשי · כל 50 מ׳' },
    {
      swatch: (
        <>
          <path d={`M2 -12h${SW - 4}v24h${-(SW - 4)}z`} fill={MAP.vegFill} stroke={MAP.vegInk} strokeWidth={HAIR} strokeDasharray={GROVE_DASH} />
          <circle cx={15} cy={0} r={6} fill="none" stroke={MAP.vegInk} strokeWidth={2} />
          <circle cx={31} cy={2} r={6} fill="none" stroke={MAP.vegInk} strokeWidth={2} />
        </>
      ),
      text: 'חורשה',
    },
    {
      swatch: (
        <>
          <path d={`M0 0h${SW}`} stroke={MAP.roadCasing} strokeWidth={ROAD_WIDTH_M + 4} />
          <path d={`M0 0h${SW}`} stroke={MAP.roadFill} strokeWidth={ROAD_WIDTH_M} />
        </>
      ),
      text: 'דרך עפר',
    },
    { swatch: <path d={`M${SW / 2} -10l10 17h-20z`} fill={MAP.ink} />, text: 'נקודת גובה (מ׳)' },
    { swatch: <circle cx={SW / 2} cy={0} r={12} fill="none" stroke={MAP.ink} strokeWidth={3} strokeDasharray="8 6" />, text: 'אזור מיקום אפשרי' },
    { swatch: <circle cx={SW / 2} cy={0} r={11} fill="none" stroke={COLORS.dim} strokeWidth={3} strokeDasharray="6 5" />, text: 'מיקום אחרון ידוע' },
  ];
  if (area) items.push({ swatch: <path d={`M0 0h${SW}`} stroke={MAP.ink} strokeWidth={5} />, text: 'כיוון ומרחק לפי המפה' });
  if (result) {
    items.push({ swatch: <path d={`M0 0h${SW}`} stroke={COLORS.hot} strokeWidth={5} strokeDasharray="12 7" />, text: 'כיוון שנמדד בשטח' });
    items.push({ swatch: <path d={`M0 0h${SW}`} stroke={MAP.ink} strokeOpacity={0.18} strokeWidth={22} />, text: 'טווח המרחק המשוער' });
  }
  if (solved) items.push({ swatch: <path d={`M4 12L${SW - 4} -12V12Z`} fill={MAP.accent} fillOpacity={0.18} stroke={MAP.accent} strokeWidth={2.5} />, text: 'תחום המבט' });
  return (
    <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2" data-legend="map">
      {items.map((it) => (
        <li key={it.text} className="flex items-center gap-2 text-base leading-snug text-black">
          <Swatch>{it.swatch}</Swatch>
          {it.text}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- exercise layer

function LastKnownMarker() {
  const m = toXY(LAST_KNOWN);
  return (
    <g pointerEvents="none">
      <circle cx={m.x} cy={m.y} r={17} fill={MAP.paper} fillOpacity={0.6} stroke={COLORS.dim} strokeWidth={3.5} strokeDasharray="6 5" />
      <circle cx={m.x} cy={m.y} r={4.5} fill={COLORS.dim} />
      <PlateLabel x={m.x + 28} y={m.y} size={FS.small} weight={600} anchor="end">
        מיקום אחרון ידוע
      </PlateLabel>
    </g>
  );
}

function CandidateMarker({ c, selected, hovered }: { c: (typeof CANDIDATES)[number]; selected: boolean; hovered: boolean }) {
  const m = toXY(c.center);
  const l = areaLabel(c);
  return (
    <g pointerEvents="none" data-candidate={c.id}>
      <circle
        cx={m.x}
        cy={m.y}
        r={HALO_R}
        fill={selected ? MAP.accent : 'none'}
        fillOpacity={selected ? 0.14 : 0}
        stroke={selected ? MAP.accent : MAP.ink}
        strokeWidth={selected ? 5 : hovered ? 4 : 3}
        strokeDasharray={selected ? undefined : '10 7'}
      />
      <circle cx={m.x} cy={m.y} r={selected ? 9 : 7} fill={selected ? MAP.accent : MAP.ink} />
      <PlateLabel x={l.x} y={l.y} size={FS.area} weight={selected ? 800 : 700} anchor={l.anchor}>
        {c.label}
      </PlateLabel>
    </g>
  );
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Arc between two bearings around a centre (map coordinates). */
function arcPath(c: { x: number; y: number }, fromDeg: number, toDeg: number, r: number) {
  const at = (deg: number) => ({ x: c.x + Math.sin(rad(deg)) * r, y: c.y - Math.cos(rad(deg)) * r });
  const turn = signedTurn(fromDeg, toDeg);
  const a = at(fromDeg);
  const b = at(fromDeg + turn);
  return `M${r1(a.x)} ${r1(a.y)}A${r} ${r} 0 0 ${turn > 0 ? 1 : 0} ${r1(b.x)} ${r1(b.y)}`;
}

function Arrow({ from, to, color, dashed, width = 5 }: { from: Point; to: Point; color: string; dashed?: boolean; width?: number }) {
  const a = toXY(from);
  const b = toXY(to);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const L = 26;
  const head = `M${r1(b.x)} ${r1(b.y)}L${r1(b.x - L * Math.cos(ang - 0.38))} ${r1(b.y - L * Math.sin(ang - 0.38))}L${r1(b.x - L * Math.cos(ang + 0.38))} ${r1(b.y - L * Math.sin(ang + 0.38))}Z`;
  return (
    <g pointerEvents="none">
      <path d={`M${r1(a.x)} ${r1(a.y)}L${r1(b.x - L * 0.7 * Math.cos(ang))} ${r1(b.y - L * 0.7 * Math.sin(ang))}`} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '16 10' : undefined} strokeLinecap="round" />
      <path d={head} fill={color} />
    </g>
  );
}

/** A point beside a line: `along` metres from `from` toward bearing, `side` units to its right (negative: left). */
function beside(from: Point, bearingDeg: number, along: number, side: number) {
  const p = toXY(destination(from, bearingDeg, along));
  return { x: p.x + Math.cos(rad(bearingDeg)) * side, y: p.y + Math.sin(rad(bearingDeg)) * side };
}

const VALUE_H = FS.small * 1.38;
/** Sideways offset that keeps a value plate (ValueLabel) clear of its own line, with a small margin. */
function clearOfLine(bearingDeg: number, text: string) {
  return (plateW(text, FS.small) / 2) * Math.abs(Math.cos(rad(bearingDeg))) + (VALUE_H / 2) * Math.abs(Math.sin(rad(bearingDeg))) + 10;
}

/**
 * Where the direction plate sits: beside the line to the road split, clear of it
 * as the bare value ("008°"), on the side away from the measured line. The check
 * keeps that centre (the captioned plate then rests on the line), except when the
 * two lines coincide: one plate set on them names both.
 */
function directionLabelAt(center: Point, dir: DirectionCheck, checked: boolean) {
  if (dir.consistent && checked) return beside(center, dir.predictedDeg, 170, 64);
  const west = signedTurn(dir.predictedDeg, dir.observedDeg) > 0;
  return beside(center, dir.predictedDeg, 160, (west ? -1 : 1) * clearOfLine(dir.predictedDeg, formatBearing(dir.predictedDeg)));
}

/**
 * The chosen area on the map. As soon as it is chosen, in plain ink and with no
 * verdict: the arrow from the last known position with its distance, and the
 * arrow from the area to the road split with its bearing — the values the
 * learner compares with the measurements. A fresh check adds the measurements:
 * the paced-distance band, the measured bearing (dashed) and the gap.
 */
function AreaOverlay({ candidateId, checked }: { candidateId: CandidateId; checked: boolean }) {
  const center = candidateCenter(candidateId);
  const dir = directionCheck(candidateId);
  const dist = distanceCheck(candidateId);
  const c = toXY(center);
  const l = toXY(LAST_KNOWN);
  const fromLast = bearing(LAST_KNOWN, center)!;
  const distText = formatMetres(dist.predictedM);
  const dirText = formatBearing(dir.predictedDeg);
  // West of the line from the last known position (its east side carries that position's name),
  // short of the area so it stays clear of the area's own labels.
  const distAt = beside(LAST_KNOWN, fromLast, dist.predictedM * 0.4, -clearOfLine(fromLast, distText));
  const dirAt = directionLabelAt(center, dir, false);
  const measuredEnd = destination(center, READINGS.forkBearingDeg, distance(center, FORK));
  return (
    <>
      {checked && (
        // Paced distance from the last known position: the 260–340 m band and the 300 m ring, solid (a map measure)
        <g pointerEvents="none" data-overlay="result">
          <circle cx={l.x} cy={l.y} r={(READINGS.distanceMinM + READINGS.distanceMaxM) / 2} fill="none" stroke={MAP.ink} strokeOpacity={0.08} strokeWidth={READINGS.distanceMaxM - READINGS.distanceMinM} />
          <circle cx={l.x} cy={l.y} r={READINGS.distanceM} fill="none" stroke={MAP.ink} strokeOpacity={0.55} strokeWidth={3.5} />
        </g>
      )}
      <g pointerEvents="none" data-overlay="values" data-area={candidateId}>
        <Arrow from={LAST_KNOWN} to={center} color={MAP.ink} width={3.5} />
        <Arrow from={center} to={FORK} color={MAP.ink} />
        <ValueLabel x={distAt.x} y={distAt.y} color={MAP.ink} value={distText} rtlValue />
        {!checked && <ValueLabel x={dirAt.x} y={dirAt.y} color={MAP.ink} value={dirText} />}
      </g>
      {checked && (
        // The map's direction from this area to F (solid, above) vs the measured 043° (dashed)
        <g pointerEvents="none" data-overlay="result">
          <Arrow from={center} to={measuredEnd} color={COLORS.hot} dashed />
          {!dir.consistent && <path d={arcPath(c, dir.predictedDeg, dir.observedDeg, 150)} fill="none" stroke={COLORS.hot} strokeWidth={4} />}
          <DirectionLabels center={center} dir={dir} />
        </g>
      )}
    </>
  );
}

function DirectionLabels({ center, dir }: { center: Point; dir: DirectionCheck }) {
  const value = formatBearing(dir.predictedDeg);
  if (dir.consistent) {
    // The two lines coincide: one plate names both.
    const both = directionLabelAt(center, dir, true);
    return <ValueLabel x={both.x} y={both.y} color={MAP.ink} value={value} caption="במפה ובתצפית" />;
  }
  // Each label on the outer side of its own line (west of the westerly one).
  const pred = directionLabelAt(center, dir, true);
  const predWest = signedTurn(dir.predictedDeg, dir.observedDeg) > 0;
  const meas = beside(center, dir.observedDeg, 270, predWest ? 62 : -62);
  const mid = dir.predictedDeg + signedTurn(dir.predictedDeg, dir.observedDeg) / 2;
  const gap = toXY(destination(center, mid, 96));
  return (
    <>
      <ValueLabel x={pred.x} y={pred.y} color={MAP.ink} value={value} caption="במפה" />
      <ValueLabel x={meas.x} y={meas.y} color={COLORS.hot} value={formatBearing(dir.observedDeg)} caption="נמדד בשטח" />
      <ValueLabel x={gap.x} y={gap.y} color={COLORS.hot} value={`${Math.round(dir.differenceDeg)}°`} caption="פער" />
    </>
  );
}

/**
 * A value ("043°", "300 מ׳") with an optional short Hebrew caption on one plate,
 * centred on (x, y); ink text, the role's colour on the border. Bearings are kept
 * left-to-right; a value with Hebrew units (rtlValue) reads with the caption.
 */
function ValueLabel({ x, y, color, value, caption, rtlValue }: { x: number; y: number; color: string; value: string; caption?: string; rtlValue?: boolean }) {
  const size = FS.small;
  const w = plateW(caption ? `${caption} ${value}` : value, size);
  const h = VALUE_H;
  return (
    <g pointerEvents="none">
      <rect x={r1(x - w / 2)} y={r1(y - h / 2)} width={r1(w)} height={r1(h)} rx={6} fill={MAP.paper} fillOpacity={0.96} stroke={color} strokeWidth={3} />
      <text x={r1(x)} y={r1(y)} textAnchor="middle" direction="rtl" dominantBaseline="central" fontSize={size} fontWeight={700} fill={MAP.ink} className="font-display tabular-nums">
        {caption && `${caption} `}
        {rtlValue ? (
          value
        ) : (
          <tspan direction="ltr" unicodeBidi="isolate">
            {value}
          </tspan>
        )}
      </text>
    </g>
  );
}

/** After a successful check only: where the observation was taken, and its live field of view. */
function ObserverReveal({ lookStore }: { lookStore: LookStore }) {
  const look = useSyncExternalStore(lookStore.subscribe, lookStore.getLive, lookStore.getLive);
  const o = toXY(OBSERVER);
  const R = 640;
  const at = (deg: number) => ({ x: o.x + Math.sin(rad(deg)) * R, y: o.y - Math.cos(rad(deg)) * R });
  const a = at(look.yawDeg - look.hfovDeg / 2);
  const b = at(look.yawDeg + look.hfovDeg / 2);
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  return (
    <g pointerEvents="none" data-overlay="observer" className="motion-safe:transition-opacity motion-safe:duration-500" style={{ opacity: shown ? 1 : 0 }}>
      <path d={`M${r1(o.x)} ${r1(o.y)}L${r1(a.x)} ${r1(a.y)}A${R} ${R} 0 0 1 ${r1(b.x)} ${r1(b.y)}Z`} fill={MAP.accent} fillOpacity={0.1} stroke={MAP.accent} strokeWidth={2.5} />
      <circle cx={o.x} cy={o.y} r={13} fill={MAP.collar} stroke={MAP.ink} strokeWidth={4} />
      <circle cx={o.x} cy={o.y} r={6} fill={MAP.ink} />
      {/* Below-left of the halo, inside the paced-distance ring, clear of the "אזור 1" label. */}
      <PlateLabel x={o.x + 10} y={o.y + HALO_R + 30} size={FS.small} weight={700} anchor="start">
        מיקום הצופה
      </PlateLabel>
    </g>
  );
}
