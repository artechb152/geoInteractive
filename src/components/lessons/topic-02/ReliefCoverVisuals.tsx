'use client';

/**
 * ReliefCoverVisuals — the "במפה" board of „אותה גבעה, שלושה נופים” (screen 3 of
 * ReliefCoverIntroScene) and its legend swatches. A topographic sheet of the same ground as the live
 * model beside it (reliefCoverCompare.data), north up, in metres:
 *   relief      contours every 5 m, every 25 m an index contour with its height set into the line
 *               (figures facing uphill), spot heights on the summits
 *   land cover  the grove's extent with a symbol per tree, the orchard's parcel with its rows of
 *               trees, every building's footprint at its true size and turn, the quarry site with
 *               ticks along its cut faces
 *   sheet       a 100 m grid numbered in the margin, a north arrow and a scale bar
 * In state 4 the contours inside the quarry are re-traced from the quarried ground and the previous
 * lines stay under them, dashed. Never mirrored for RTL; every <text> sets textAnchor.
 */

import { useId } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MAP } from './topographyTerrainStyle';
import { PIT_ROCK } from './terrainBlockGeometry';
import {
  COVER, GROVE_AREA, HILL, ORCHARD_PARCEL, ORCHARD_PARCEL_CUT, QUARRIED, QUARRY, QUARRY_SITE, SHEET, SPOTS,
  contourLabels, contoursFor, houseCorners, type Contours, type LegendKey, type Pt, type StateId,
} from './reliefCoverCompare.data';

const EASE = [0.22, 1, 0.36, 1] as const;
const W = SHEET.w;
const H = SHEET.h;
/** The sheet plus its margin (grid numbers west and south). */
const COLLAR = { w: 30, s: 24, n: 8, e: 8 } as const;
export const MAP_VIEWBOX = { x: -COLLAR.w, y: -COLLAR.n, w: W + COLLAR.w + COLLAR.e, h: H + COLLAR.n + COLLAR.s } as const;

const HAIR = 0.55; // contour (m on the sheet ≈ px at 1440)
const INDEX_W = 1.25;
const FS = { contour: 11.5, spot: 12, grid: 11 } as const;
const QUARRY_FILL = PIT_ROCK;

const f1 = (n: number) => n.toFixed(1);
const linePath = (pts: Pt[], closed: boolean) => 'M' + pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join('L') + (closed ? 'Z' : '');
const ringsPath = (rings: Pt[][]) => rings.map((r) => linePath(r, true)).join('');

/** One path per contour level of a contour set. */
function levelPaths(c: Contours) {
  return c.levels.map((lv) => ({ level: lv.level, index: lv.index, d: lv.lines.map((l) => linePath(l.pts, l.closed)).join('') }));
}
const PATHS = { hill: levelPaths(contoursFor('bare')), quarry: levelPaths(contoursFor('quarry')) };
/** Outside this box the hill and the quarried hill are the same ground, so their contours coincide. */
const CUT_BOX = { x: QUARRY.x0 - 2, y: QUARRY.y0 - 2, w: QUARRY.x1 - QUARRY.x0 + 4, h: QUARRY.y1 - QUARRY.y0 + 4 } as const;
const LABELS = { hill: contourLabels(contoursFor('bare'), HILL), quarry: contourLabels(contoursFor('quarry'), QUARRIED) };

function ContourSet({ paths, attr }: { paths: ReturnType<typeof levelPaths>; attr?: boolean }) {
  return (
    <g fill="none" stroke={MAP.contour} strokeLinejoin="round" strokeLinecap="round">
      {paths.map((p) => (
        <path key={p.level} data-contour={attr ? p.level : undefined} d={p.d} strokeWidth={p.index ? INDEX_W : HAIR} />
      ))}
    </g>
  );
}

export function ReliefCoverMap({ state, ariaLabel }: { state: StateId; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = COVER[state];
  const quarry = state === 'quarry';
  const set = quarry ? 'quarry' : 'hill';
  const fade = {
    initial: reduce ? false : { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduce ? 0 : 0.45, ease: EASE },
  } as const;
  // in state 4 the quarry site has taken the parcel's western part (its trees are gone)
  const P = quarry ? ORCHARD_PARCEL_CUT : ORCHARD_PARCEL;

  return (
    <svg
      viewBox={`${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={`${uid}-sheet`}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
        {/* the sheet without the quarry's box, and the box alone */}
        <clipPath id={`${uid}-out`}>
          <path clipRule="evenodd" d={`M0,0H${W}V${H}H0Z M${CUT_BOX.x},${CUT_BOX.y}v${CUT_BOX.h}h${CUT_BOX.w}v${-CUT_BOX.h}Z`} />
        </clipPath>
        <clipPath id={`${uid}-in`}>
          <rect x={CUT_BOX.x} y={CUT_BOX.y} width={CUT_BOX.w} height={CUT_BOX.h} />
        </clipPath>
      </defs>
      <rect x={MAP_VIEWBOX.x} y={MAP_VIEWBOX.y} width={MAP_VIEWBOX.w} height={MAP_VIEWBOX.h} fill={MAP.collar} />
      <rect x={0} y={0} width={W} height={H} fill={MAP.paper} />

      <g clipPath={`url(#${uid}-sheet)`}>
        {/* 100 m grid */}
        <g stroke={MAP.grid} strokeWidth={0.5} strokeOpacity={0.8}>
          {[100, 200, 300, 400].map((x) => (
            <path key={`e${x}`} d={`M${x} 0V${H}`} />
          ))}
          {[100, 200, 300].map((y) => (
            <path key={`n${y}`} d={`M0 ${H - y}H${W}`} />
          ))}
        </g>

        {/* land-cover areas, under the contours */}
        <AnimatePresence initial={false}>
          {c.grove.length > 0 && (
            <motion.path key="grove-area" {...fade} d={ringsPath(GROVE_AREA)} fill={MAP.vegFill} fillOpacity={0.75} />
          )}
          {c.orchard.length > 0 && (
            <motion.rect
              key={quarry ? 'orchard-parcel-cut' : 'orchard-parcel'}
              {...fade}
              x={P.x0}
              y={P.y0}
              width={P.x1 - P.x0}
              height={P.y1 - P.y0}
              fill={MAP.vegFill}
              fillOpacity={0.6}
              stroke={MAP.vegInk}
              strokeWidth={0.6}
              strokeDasharray="3 2"
            />
          )}
          {quarry && (
            <motion.g key="quarry-site" {...fade}>
              <path d={ringsPath(QUARRY_SITE.rings)} fill={QUARRY_FILL} fillOpacity={0.45} />
              {/* the previous state's contours — dashed; hidden wherever the new line lies on them */}
              <g clipPath={`url(#${uid}-in)`}>
                <g fill="none" stroke={MAP.contour} strokeOpacity={0.55} strokeWidth={0.6} strokeDasharray="2.4 1.8">
                  {PATHS.hill.map((p) => (
                    <path key={p.level} d={p.d} />
                  ))}
                </g>
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* contours: the same lines in every state outside the quarry's box; inside it, the state's own */}
        <g clipPath={`url(#${uid}-out)`}>
          <ContourSet paths={PATHS.hill} />
        </g>
        <g clipPath={`url(#${uid}-in)`}>
          <AnimatePresence initial={false}>
            <motion.g key={set} {...fade} transition={{ duration: reduce ? 0 : 0.6, ease: EASE, delay: reduce || !quarry ? 0 : 0.25 }}>
              <ContourSet paths={PATHS[set]} attr />
            </motion.g>
          </AnimatePresence>
        </g>

        {/* land-cover symbols */}
        <AnimatePresence initial={false}>
          {c.grove.length > 0 && (
            <motion.g key="grove" {...fade} fill="none" stroke={MAP.vegInk} strokeWidth={0.7}>
              {c.grove.map((t) => (
                <circle key={t.id} cx={f1(t.x)} cy={f1(t.y)} r={f1(t.r)} />
              ))}
            </motion.g>
          )}
          {c.orchard.map((t) => (
            <motion.circle key={t.id} {...fade} cx={t.x} cy={t.y} r={1.9} fill={MAP.vegInk} />
          ))}
          {c.houses.length > 0 && (
            <motion.g key="houses" {...fade} fill={MAP.building}>
              {c.houses.map((h) => (
                <path key={h.id} d={linePath(houseCorners(h), true)} />
              ))}
            </motion.g>
          )}
          {quarry && (
            <motion.path
              key="quarry-ticks"
              {...fade}
              d={QUARRY_SITE.ticks.map(([a, b]) => `M${f1(a[0])},${f1(a[1])}L${f1(b[0])},${f1(b[1])}`).join('')}
              fill="none"
              stroke={MAP.ink}
              strokeWidth={0.8}
              strokeLinecap="round"
            />
          )}
        </AnimatePresence>

        {/* index-contour heights, set into their line on a paper plate, figures facing uphill */}
        <AnimatePresence initial={false}>
          <motion.g key={set} {...fade}>
            {LABELS[set].map((l) => (
              <g key={`${l.level}-${f1(l.x)}`} transform={`translate(${f1(l.x)} ${f1(l.y)}) rotate(${f1(l.deg)})`} data-contour-label={l.level}>
                <rect x={-11} y={-6.5} width={22} height={13} rx={2} fill={MAP.paper} />
                <text textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={FS.contour} fontWeight={700} fill={MAP.contour} className="font-display tabular-nums">
                  {l.level}
                </text>
              </g>
            ))}
          </motion.g>
        </AnimatePresence>

        {SPOTS.map((s) => (
          <g key={s.id} data-spot={s.h}>
            <circle cx={s.x} cy={s.y} r={1.9} fill={MAP.ink} />
            <rect x={s.x + 3} y={s.y - 7} width={23} height={14} rx={2} fill={MAP.paper} fillOpacity={0.9} />
            <text x={s.x + 4.5} y={s.y + 0.5} textAnchor="start" direction="ltr" dominantBaseline="central" fontSize={FS.spot} fontWeight={800} fill={MAP.ink} className="font-display tabular-nums">
              {s.h}
            </text>
          </g>
        ))}

        <NorthArrow />
        <ScaleBar />
      </g>
      <rect x={0} y={0} width={W} height={H} fill="none" stroke={MAP.ink} strokeWidth={1.2} />
      <GridLabels />
    </svg>
  );
}

/** Grid numbers in the margin: eastings under the sheet, northings along its west side (read bottom-up). */
function GridLabels() {
  const common = { fontSize: FS.grid, fontWeight: 600, fill: MAP.muted, className: 'font-display tabular-nums', dominantBaseline: 'central' as const, direction: 'ltr' as const };
  return (
    <g pointerEvents="none">
      {[0, 100, 200, 300, 400].map((x) => (
        <text key={x} x={x} y={H + COLLAR.s / 2} textAnchor={x === 0 ? 'start' : 'middle'} {...common}>
          {x}
        </text>
      ))}
      {[100, 200, 300].map((y) => (
        <text key={y} transform={`translate(${-COLLAR.w / 2} ${H - y}) rotate(-90)`} textAnchor="middle" {...common}>
          {y}
        </text>
      ))}
    </g>
  );
}

/** North arrow in the sheet's north-east corner. */
function NorthArrow() {
  const x = W - 14;
  const y = 8;
  return (
    <g pointerEvents="none" data-map="north">
      <rect x={x - 11} y={y - 4} width={22} height={40} rx={3} fill={MAP.paper} fillOpacity={0.94} />
      <text x={x} y={y + 6} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={800} fill={MAP.ink} className="font-display">
        N
      </text>
      <path d={`M${x} ${y + 12}l6 22l-6 -5l-6 5z`} fill={MAP.ink} />
    </g>
  );
}

/** 0–100 m in the sheet's south-east corner; its length is in map metres. */
function ScaleBar() {
  const seg = 25;
  const x0 = W - 4 * seg - 30;
  const y = H - 14;
  return (
    <g pointerEvents="none" data-map="scale">
      <rect x={x0 - 8} y={y - 18} width={4 * seg + 34} height={28} rx={3} fill={MAP.paper} fillOpacity={0.94} />
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={x0 + k * seg} y={y} width={seg} height={4} fill={k % 2 === 0 ? MAP.ink : MAP.collar} stroke={MAP.ink} strokeWidth={0.6} />
      ))}
      {[0, 50, 100].map((m) => (
        <text key={m} x={x0 + m} y={y - 8} textAnchor="middle" direction="ltr" dominantBaseline="central" fontSize={10} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
          {m}
        </text>
      ))}
      <text x={x0 + 4 * seg + 6} y={y + 2} textAnchor="start" direction="ltr" dominantBaseline="central" fontSize={10} fontWeight={600} fill={MAP.ink} className="font-display">
        m
      </text>
    </g>
  );
}

/* ── Legend swatches (HTML legend in ReliefCoverCompare) — the map's own symbols ── */

const ARC = 'M1,7 C5,2 11,2 15,7';

export function LegendSwatch({ k }: { k: LegendKey }) {
  return (
    <svg viewBox="0 0 16 10" className="h-3 w-5 shrink-0" aria-hidden>
      {k === 'contour' && <path d={ARC} fill="none" stroke={MAP.contour} strokeWidth={0.8} />}
      {k === 'index' && <path d={ARC} fill="none" stroke={MAP.contour} strokeWidth={1.8} />}
      {k === 'before' && <path d={ARC} fill="none" stroke={MAP.contour} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="2 1.5" />}
      {k === 'grove' && (
        <>
          <rect x={0.5} y={0.5} width={15} height={9} rx={2} fill={MAP.vegFill} />
          <g fill="none" stroke={MAP.vegInk} strokeWidth={0.8}>
            <circle cx={4.5} cy={4} r={2.2} />
            <circle cx={10.5} cy={3.6} r={1.8} />
            <circle cx={8} cy={7} r={1.6} />
          </g>
        </>
      )}
      {k === 'orchard' && (
        <>
          <rect x={0.5} y={0.5} width={15} height={9} fill={MAP.vegFill} fillOpacity={0.6} stroke={MAP.vegInk} strokeWidth={0.6} strokeDasharray="1.6 1" />
          <g fill={MAP.vegInk}>
            {[4, 8, 12].flatMap((x) => [3.3, 6.7].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} />))}
          </g>
        </>
      )}
      {k === 'houses' && (
        <g fill={MAP.building}>
          <rect x={2.5} y={2.5} width={5} height={4} transform="rotate(8 5 4.5)" />
          <rect x={9.5} y={3.5} width={4.5} height={4} transform="rotate(-6 11.75 5.5)" />
        </g>
      )}
      {k === 'quarry' && (
        <>
          <rect x={1} y={2} width={14} height={7} fill={QUARRY_FILL} fillOpacity={0.45} />
          <path d="M1,2 H15 M3,2 V4.5 M6,2 V4.5 M9,2 V4.5 M12,2 V4.5" stroke={MAP.ink} strokeWidth={0.7} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
