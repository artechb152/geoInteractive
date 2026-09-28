'use client';

import { useId, type ReactNode, type Ref } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TOPO, type SheetPoint } from './topographyTerrain.data';
import { COLLAR, LEGEND_H, SHEET, VIEWBOX } from './topographyLayout';
import { EASE, GRID_ORIGIN, MAP, M_PER_SHEET_UNIT } from './topographyTerrainStyle';

/**
 * The topographic map sheet of the topography scene, drawn from the same
 * generated terrain data as the 3D model and the aerial photo
 * (topographyTerrain.data.ts), so every contour, building and road lands
 * exactly where the canvas shows it.
 *
 * The viewBox is VIEWBOX (topographyLayout) with preserveAspectRatio "meet":
 * that is the registration contract with the camera — sheetRect() computes
 * where this neatline lands in the container, and the top-down camera frames
 * exactly that rectangle.
 *
 * reveal     fades the whole sheet in over the ground it describes — one slow
 *            cross-fade, never rebuilt piece by piece, so the learner sees the
 *            map settle onto the same terrain; off fades it away.
 * labels     false omits all text (the rasterized slab in the stacked view).
 * animated   false renders static SVG (the slab texture and the no-WebGL
 *            fallback). The art itself uses presentation attributes only, so
 *            the static SVG rasterizes the same outside the page.
 */
const FADE_IN_S = 1.2;
/** Symmetric ease: the half-way blend — the map lying on the photo — lingers long enough to read. */
const FADE_EASE = [0.45, 0, 0.55, 1] as const;
const FADE_OUT_S = 0.45;

export function TopographyMapSheet({
  reveal,
  labels = true,
  animated = true,
  className,
  svgRef,
}: {
  reveal: boolean;
  labels?: boolean;
  animated?: boolean;
  className?: string;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const reduce = !!useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const clip = `topo-clip-${uid}`;
  const pat = (k: string) => `topo-${k}-${uid}`;
  const levels = TOPO.contours;

  const art: ReactNode = (
    <>
      {/* Collar + paper + grid */}
      <rect x={VIEWBOX.x} y={VIEWBOX.y} width={VIEWBOX.w} height={VIEWBOX.h} fill={MAP.collar} />
      <rect x={0} y={0} width={SHEET.w} height={SHEET.h} fill={MAP.paper} />
      <g clipPath={`url(#${clip})`} stroke={MAP.grid} strokeWidth={MAP.gridW}>
        {TOPO.grid.e.map((g) => (
          <path key={g.label} d={`M${g.x} 0V${SHEET.h}`} />
        ))}
        {TOPO.grid.n.map((g) => (
          <path key={g.label} d={`M0 ${g.y}H${SHEET.w}`} />
        ))}
      </g>
      <Ticks />

      <g clipPath={`url(#${clip})`}>
        {/* Vegetation */}
        {TOPO.vegetation.map((v) => (
          <g key={v.kind}>
            <path d={ring(v.ring)} fill={MAP.vegFill} fillOpacity={v.kind === 'sparse' ? 0.6 : v.kind === 'orchard' ? 0.75 : 1} />
            <path
              d={ring(v.ring)}
              fill={`url(#${pat(v.kind === 'woodland' ? 'wood' : v.kind)})`}
              stroke={MAP.vegInk}
              strokeWidth={0.12}
              strokeDasharray={v.kind === 'orchard' ? undefined : '0.45 0.35'}
            />
          </g>
        ))}

        {/* Contours — the 50 m index lines heavier */}
        {levels.map((lv) =>
          lv.rings.map((r, k) => (
            <path
              key={`${lv.heightM}-${k}`}
              d={ring(r)}
              fill="none"
              stroke={MAP.contour}
              strokeWidth={lv.index ? MAP.indexW : MAP.contourW}
              strokeLinejoin="round"
            />
          )),
        )}

        {/* Road, path, buildings, summit */}
        <path d={line(TOPO.road)} fill="none" stroke={MAP.roadCasing} strokeWidth={MAP.roadW + 0.34} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line(TOPO.road)} fill="none" stroke={MAP.roadFill} strokeWidth={MAP.roadW} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line(TOPO.path)} fill="none" stroke={MAP.path} strokeWidth={MAP.pathW} strokeDasharray={MAP.pathDash} strokeLinejoin="round" />
        {TOPO.buildings.map((b, i) => (
          <rect
            key={i}
            x={b.x - b.w / 2}
            y={b.y - b.h / 2}
            width={b.w}
            height={b.h}
            transform={`rotate(${b.angle} ${b.x} ${b.y})`}
            fill={MAP.building}
          />
        ))}
        <path d={`M${TOPO.summit.x} ${TOPO.summit.y - 0.95}l0.85 1.45h-1.7z`} fill={MAP.ink} />

        {/* Labels inside the neatline */}
        {labels && (
          <>
            {levels
              .filter((lv) => lv.label)
              .map((lv) => (
                <g key={lv.heightM} transform={`translate(${lv.label!.x} ${lv.label!.y}) rotate(${upright(lv.label!.angle)})`}>
                  <rect x={-2.35} y={-1.3} width={4.7} height={2.6} rx={0.4} fill={MAP.paper} />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={2.3}
                    fontWeight={700}
                    fill={MAP.contour}
                    className="font-display tabular-nums"
                  >
                    {lv.heightM}
                  </text>
                </g>
              ))}
            <text
              x={TOPO.summit.x + 1.4}
              y={TOPO.summit.y + 0.2}
              direction="ltr"
              textAnchor="start"
              dominantBaseline="central"
              fontSize={2.6}
              fontWeight={800}
              fill={MAP.ink}
              className="font-display tabular-nums"
            >
              {TOPO.summit.heightM}
            </text>
            {TOPO.vegetation
              .filter((v) => v.label)
              .map((v) => (
                <HebrewLabel key={v.kind} x={v.label!.x} y={v.label!.y} size={2.4}>
                  {v.label!.text}
                </HebrewLabel>
              ))}
            <HebrewLabel x={TOPO.roadLabel.x} y={TOPO.roadLabel.y} angle={TOPO.roadLabel.angle} size={2.1}>
              דרך עפר
            </HebrewLabel>
            <HebrewLabel x={TOPO.pathLabel.x} y={TOPO.pathLabel.y} angle={TOPO.pathLabel.angle} size={2.1}>
              שביל רגלי
            </HebrewLabel>
          </>
        )}
      </g>

      {/* Neatline + collar furniture */}
      <rect x={0} y={0} width={SHEET.w} height={SHEET.h} fill="none" stroke={MAP.ink} strokeWidth={0.22} />
      {labels && (
        <>
          <GridLabels />
          <Legend />
          <NorthArrow />
          <ScaleBar />
        </>
      )}
    </>
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={SHEET.w} height={SHEET.h} />
        </clipPath>
        {/* Woodland: small tree glyphs on the green tint. */}
        <pattern id={pat('wood')} width={3.2} height={3.2} patternUnits="userSpaceOnUse">
          <circle cx={0.9} cy={0.9} r={0.42} fill="none" stroke={MAP.vegInk} strokeWidth={0.12} />
          <circle cx={2.5} cy={2.4} r={0.42} fill="none" stroke={MAP.vegInk} strokeWidth={0.12} />
        </pattern>
        {/* Orchard: trees in rows. */}
        <pattern id={pat('orchard')} width={1.6} height={1.6} patternUnits="userSpaceOnUse">
          <circle cx={0.8} cy={0.8} r={0.24} fill={MAP.vegInk} />
        </pattern>
        {/* Sparse woodland: a few scattered glyphs. */}
        <pattern id={pat('sparse')} width={5.2} height={5.2} patternUnits="userSpaceOnUse">
          <circle cx={1.2} cy={1.4} r={0.42} fill="none" stroke={MAP.vegInk} strokeWidth={0.12} />
          <circle cx={3.9} cy={3.9} r={0.42} fill="none" stroke={MAP.vegInk} strokeWidth={0.12} />
        </pattern>
      </defs>
      {animated ? (
        <motion.g
          initial={false}
          animate={{ opacity: reveal ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: reveal ? FADE_IN_S : FADE_OUT_S, ease: reveal ? FADE_EASE : EASE }}
        >
          {art}
        </motion.g>
      ) : (
        <g opacity={reveal ? 1 : 0}>{art}</g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- helpers

const f = (v: number) => Math.round(v * 100) / 100;
/** Never set digits upside down, whatever angle the generator hands over. */
const upright = (deg: number) => (deg > 90 ? deg - 180 : deg <= -90 ? deg + 180 : deg);
function ring(pts: readonly SheetPoint[]) {
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
}
function line(pts: readonly SheetPoint[]) {
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`;
}

function HebrewLabel({ x, y, angle = 0, size, children }: { x: number; y: number; angle?: number; size: number; children: ReactNode }) {
  return (
    <text
      transform={`translate(${x} ${y}) rotate(${angle})`}
      textAnchor="middle"
      dominantBaseline="central"
      direction="rtl"
      fontSize={size}
      fontWeight={600}
      fill={MAP.ink}
      className="font-display"
    >
      {children}
    </text>
  );
}

/** 100 m ticks on the inside of the neatline, from the ITM grid origin. */
function Ticks() {
  const step = 100 / M_PER_SHEET_UNIT;
  const firstE = (Math.ceil(GRID_ORIGIN.e / 100) * 100 - GRID_ORIGIN.e) / M_PER_SHEET_UNIT;
  const xs: number[] = [];
  for (let x = firstE || step; x < SHEET.w - 0.01; x += step) xs.push(x);
  const ys: number[] = [];
  for (let k = 1; SHEET.h - k * step > 0.01; k++) ys.push(SHEET.h - k * step);
  const L = 0.8;
  return (
    <g stroke={MAP.ink} strokeWidth={0.14}>
      {xs.map((x) => (
        <path key={`e${x}`} d={`M${f(x)} 0v${L}M${f(x)} ${SHEET.h}v${-L}`} />
      ))}
      {ys.map((y) => (
        <path key={`n${y}`} d={`M0 ${f(y)}h${L}M${SHEET.w} ${f(y)}h${-L}`} />
      ))}
    </g>
  );
}

function GridLabels() {
  const common = { fontSize: 1.9, fontWeight: 600, fill: MAP.muted, className: 'font-display tabular-nums', dominantBaseline: 'central' as const };
  return (
    <g>
      {TOPO.grid.e.map((g) => (
        <g key={g.label}>
          <text x={g.x} y={-COLLAR / 2} textAnchor="middle" {...common}>{g.label}</text>
          <text x={g.x} y={SHEET.h + COLLAR / 2} textAnchor="middle" {...common}>{g.label}</text>
        </g>
      ))}
      {TOPO.grid.n.map((g) => (
        <g key={g.label}>
          <text transform={`translate(${-COLLAR / 2} ${g.y}) rotate(-90)`} textAnchor="middle" {...common}>{g.label}</text>
          <text transform={`translate(${SHEET.w + COLLAR / 2} ${g.y}) rotate(90)`} textAnchor="middle" {...common}>{g.label}</text>
        </g>
      ))}
    </g>
  );
}

const STRIP_TOP = SHEET.h + COLLAR;                  // the legend strip under the lower grid labels
const STRIP_MID = STRIP_TOP + LEGEND_H / 2;

/** Legend at the inline start (visual right) of the strip: swatch, then its label. */
function Legend() {
  const row = (y: number, swatch: ReactNode, text: string) => (
    <g key={text}>
      {swatch}
      <text x={SHEET.w - 5} y={y} textAnchor="start" direction="rtl" dominantBaseline="central" fontSize={2.0} fontWeight={600} fill={MAP.ink} className="font-display">
        {text}
      </text>
    </g>
  );
  const y1 = STRIP_MID - 2.1;
  const y2 = STRIP_MID + 2.1;
  return (
    <g>
      {row(y1, <path d={`M${SHEET.w - 3.8} ${y1}h3.6`} stroke={MAP.contour} strokeWidth={MAP.indexW} />, 'קו גובה ראשי')}
      {row(y2, <path d={`M${SHEET.w - 3.8} ${y2}h3.6`} stroke={MAP.path} strokeWidth={MAP.pathW} strokeDasharray={MAP.pathDash} />, 'שביל')}
    </g>
  );
}

function NorthArrow() {
  const x = SHEET.w / 2;
  return (
    <g>
      <text x={x} y={STRIP_TOP + 1.6} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={2.2} fontWeight={800} fill={MAP.ink} className="font-display">
        צ
      </text>
      <path d={`M${x} ${STRIP_TOP + 3.2}l1.25 6.2l-1.25-1.5l-1.25 1.5z`} fill={MAP.ink} />
    </g>
  );
}

/** 0–300 m bar at the visual left, 100 m segments alternating ink / white. */
function ScaleBar() {
  const seg = 100 / M_PER_SHEET_UNIT;
  const y = STRIP_MID + 1.2;
  return (
    <g>
      {[0, 1, 2].map((k) => (
        <rect key={k} x={k * seg} y={y} width={seg} height={1.05} fill={k % 2 === 0 ? MAP.ink : MAP.collar} stroke={MAP.ink} strokeWidth={0.14} />
      ))}
      {[0, 100, 200, 300].map((m, k) => (
        <text key={m} x={k * seg} y={y - 1.5} textAnchor="middle" dominantBaseline="central" fontSize={1.9} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
          {m}
        </text>
      ))}
      {/* RTL: the text's end (its left edge) sits at x, so it reads to the right of the bar. */}
      <text x={3 * seg + 1.2} y={y + 0.5} textAnchor="end" direction="rtl" dominantBaseline="central" fontSize={1.9} fontWeight={600} fill={MAP.ink} className="font-display">
        מ׳
      </text>
    </g>
  );
}
