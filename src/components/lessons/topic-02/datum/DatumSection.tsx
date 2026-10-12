'use client';

/* ─────────────── דאטום — 2-D views of the same section ───────────────
   GapInset: the linked close-up of the gap between the geoid and the posed
   ellipsoid at the inspection point — a local section of the exercise wall
   (datumInset.ts). With WebGL the bands themselves are drawn by the globe's
   renderer into this circle (DatumInset3D) and this layer adds only the gap
   arrow and the two measured points, projected with the same view, so they
   sit on the band crests. Without WebGL (or until the 3-D view is up) it
   draws the same section itself: a cream ground, the Earth's side of the
   geoid a shade deeper, two filled bands with a lit crest, an edge and a
   soft shadow. The arrow is exactly the radial gap fitError measures, under
   the view's display mapping; no values, no units.

   SectionSvg: the original 2-D DatumFit drawing, on a light card. It is the
   live section beside the static image when WebGL is not available, so it
   shows what the globe would: the Earth's surface in this section, the
   geoid and the posed ellipse with the body in focus drawn stronger, the
   marked region, station 2's temporary reference marks and station 3's two
   check points. */

import { useId } from 'react';
import { cn } from '@/lib/utils';
import { DISPLAY_K, DV, ELL, GEOID, REGION, GC, geoidAt, surfaceEnvelopeW, svgDisplay, type DatumMode, type Pose } from './datumGeometry';
import type { Guide, Look, Surface } from './datumDemo';
import {
  GAP_MIN, INSET_BAND, curveRun, ellipseCentrePlane, ellipsePhiAt, ellipsePlane, geoidPlane, insetPx, insetView, toPlane, type InsetView,
} from './datumInset';

const C_H = '#5b9dd9'; // accent.cool — the geoid, as in the original block
const C_ACC = '#D97E2B'; // accent — the ellipsoid
const C_INK = '#38432E'; // fg

const poly = (pts: { x: number; y: number }[], close = false) =>
  `${pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}${close ? ' Z' : ''}`;

/** A run of a curve (plane units) → close-up pixels, shifted by (dx, dy) px. */
function runPath(v: InsetView, run: Float32Array, dx = 0, dy = 0) {
  const pts = [];
  for (let i = 0; i < run.length / 4; i++) {
    const p = insetPx(v, [run[i * 4], run[i * 4 + 1], 0]);
    pts.push({ x: p.x + dx, y: p.y + dy });
  }
  return poly(pts);
}

const RUN_N = 160;

export function GapInset({
  pose,
  inspect,
  mode,
  emph,
  size,
  live,
  className,
  style,
}: {
  pose: Pose;
  inspect: number;
  mode: DatumMode;
  /** the body in focus: its band a little wider (none: both alike) */
  emph: Surface | null;
  size: number;
  /** the 3-D close-up draws the bands into this circle; only the arrow and the points here */
  live: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const v = insetView(pose, inspect, size);
  const P = (p: { x: number; y: number }) => insetPx(v, [p.x, p.y, 0]);
  const q = P(v.q);
  const e = P(v.e);
  const showArrow = v.gap > GAP_MIN;
  const arrow = (
    <>
      <defs>
        <marker id={`gapArrow${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C_INK} />
        </marker>
      </defs>
      <circle cx={q.x} cy={q.y} r={3.4} fill={C_H} stroke="#FFFFFF" strokeWidth={1.5} />
      <circle cx={e.x} cy={e.y} r={3.4} fill={C_ACC} stroke="#FFFFFF" strokeWidth={1.5} />
      {showArrow && (
        <line x1={q.x} y1={q.y} x2={e.x} y2={e.y} stroke={C_INK} strokeWidth={1.6} markerStart={`url(#gapArrow${uid})`} markerEnd={`url(#gapArrow${uid})`} />
      )}
    </>
  );

  let drawing = null;
  if (!live) {
    const gRun = curveRun(geoidPlane, inspect, { x: 0, y: 0 }, v, RUN_N, new Float32Array(RUN_N * 4));
    const eRun = curveRun((s) => ellipsePlane(pose, s), ellipsePhiAt(pose, inspect), ellipseCentrePlane(pose), v, RUN_N, new Float32Array(RUN_N * 4));
    const gW = 2 * INSET_BAND.half.geoid * (emph === 'geoid' ? 1.12 : 1);
    const eW = 2 * INSET_BAND.half.ellipsoid * (emph === 'ellipsoid' ? 1.12 : 1);
    const sh = INSET_BAND.shadow;
    const earth = poly(DISPLAY_GEOID.map((p) => P(p)), true);
    const band = (run: Float32Array, color: string, w: number) => (
      <>
        <path d={runPath(v, run)} fill="none" stroke={C_INK} strokeOpacity={0.28} strokeWidth={w + 1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={runPath(v, run)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
        <path d={runPath(v, run, -0.7, -1.1)} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={w * 0.32} strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
    drawing = (
      <>
        <defs>
          <filter id={`gapSoft${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <radialGradient id={`gapVignette${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0.6" stopColor={C_INK} stopOpacity={0} />
            <stop offset="1" stopColor={C_INK} stopOpacity={0.07} />
          </radialGradient>
        </defs>
        <rect width={size} height={size} fill="#FAF6F0" />
        <path d={earth} fill="#F3E9DC" />
        {mode === 'local' && (
          <path d={poly(DISPLAY_LOCAL.map((p) => P(p)))} fill="none" stroke={C_H} strokeOpacity={0.32} strokeWidth={2 * INSET_BAND.arc - 6} strokeLinecap="round" />
        )}
        <g filter={`url(#gapSoft${uid})`} opacity={0.2}>
          <path d={runPath(v, gRun, sh.dx, -sh.dy)} fill="none" stroke={C_INK} strokeWidth={gW + 2 * sh.spread} strokeLinecap="round" />
          <path d={runPath(v, eRun, sh.dx, -sh.dy)} fill="none" stroke={C_INK} strokeWidth={eW + 2 * sh.spread} strokeLinecap="round" />
        </g>
        {band(eRun, C_ACC, eW)}
        {band(gRun, C_H, gW)}
        <rect width={size} height={size} fill={`url(#gapVignette${uid})`} />
      </>
    );
  }

  return (
    <div
      aria-hidden
      className={cn('overflow-hidden rounded-full border-2 border-border-strong shadow-elevated', !live && 'bg-bg-elevated', className)}
      style={{ width: size, height: size, ...style }}
    >
      {/* the full circle in close-up pixels (the border sits over its edge), as the 3-D pass draws it */}
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute -inset-[2px] block" style={{ width: size, height: size }}>
        {drawing}
        {arrow}
      </svg>
    </div>
  );
}

/** The geoid and the marked arc on the wall's display plane (built once, densely). */
const DISPLAY_GEOID = Array.from({ length: 721 }, (_, i) => toPlane(geoidAt(-Math.PI + (i / 720) * 2 * Math.PI)));
const DISPLAY_LOCAL = REGION.local.map(toPlane);

/** The original exercise drawing (DatumFit), light card — the live view when there is no WebGL. */
export function SectionSvg({
  pose,
  mode,
  look,
  guide,
  probes,
  description,
  className,
}: {
  pose: Pose;
  mode: DatumMode;
  look: Look;
  guide: Guide | null;
  /** station 3: the chosen check point and the other one (section angles) */
  probes: { on: number; off: number } | null;
  /** what the view shows, in words (the same text as the globe's description) */
  description: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const emph: Surface | null = look === 'motion' ? 'ellipsoid' : look === 'compare' ? null : look;
  const strong = (id: Surface) => emph === id;
  const cx = GC.x + pose.dx;
  const cy = GC.y + pose.dy;
  const rx = ELL.rx * pose.s;
  const ry = ELL.ry * pose.s;
  const outline = (p: Pose, props: React.SVGProps<SVGEllipseElement>) => (
    <g transform={`translate(${GC.x + p.dx} ${GC.y + p.dy}) rotate(${p.rot}) scale(${p.s})`}>
      <ellipse rx={ELL.rx} ry={ELL.ry} fill="none" vectorEffect="non-scaling-stroke" {...props} />
    </g>
  );
  const ink = { stroke: C_INK, vectorEffect: 'non-scaling-stroke' as const };
  const arrow = `url(#secArrow${uid})`;
  const rotating = guide?.kind === 'rotate';
  const axisK = rotating ? 1.32 : 1;
  const point = (t: number) => svgDisplay(geoidAt(t));
  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border/70 bg-bg-elevated', className)}>
      <svg viewBox={`0 0 ${DV.w} ${DV.h}`} className="block h-full w-full" role="img" aria-label={description}>
        <defs>
          <marker id={`secArrow${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={C_INK} />
          </marker>
        </defs>
        {/* the view's display mapping (DISPLAY_K), as on the globe beside it */}
        <g transform={`translate(0 ${GC.y}) scale(1 ${DISPLAY_K}) translate(0 ${-GC.y})`}>
          {/* the Earth's surface in this section (its smooth form — the relief is the 3-D view's) */}
          <path
            d={SURFACE_SVG}
            fill={strong('surface') ? '#F3E9DC' : 'none'}
            {...ink}
            strokeOpacity={strong('surface') ? 0.9 : 0.35}
            strokeWidth={strong('surface') ? 3 : 1.5}
          />
          <path
            d={GEOID_SVG}
            fill="none"
            stroke={C_H}
            strokeWidth={strong('geoid') ? 4.5 : 3}
            strokeOpacity={emph && !strong('geoid') ? 0.7 : 1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {mode === 'local' && (
            <>
              <path d={LOCAL_SVG} fill="none" stroke={C_H} strokeWidth="10" strokeLinecap="round" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
              {/* the marked region's end caps: marked by shape, not by colour alone */}
              {LOCAL_CAPS.map((d) => (
                <path key={d} d={d} {...ink} strokeWidth={2.4} strokeOpacity={0.9} />
              ))}
            </>
          )}

          {/* station 2's temporary reference marks */}
          {guide && 'from' in guide && outline(guide.from, { ...ink, strokeOpacity: 0.6, strokeWidth: 1.6, strokeDasharray: '6 5' })}
          {guide?.kind === 'shift' && (
            <line
              x1={GC.x + guide.from.dx}
              y1={GC.y + guide.from.dy}
              x2={GC.x + guide.to.dx}
              y2={GC.y + guide.to.dy}
              {...ink}
              strokeOpacity={0.75}
              strokeWidth={1.6}
              strokeDasharray="6 5"
              markerEnd={arrow}
            />
          )}
          {guide?.kind === 'axis' && (
            <line
              x1={guide.axis === 'x' ? cx - 1.5 * rx : cx}
              y1={guide.axis === 'x' ? cy : cy - 1.5 * ry}
              x2={guide.axis === 'x' ? cx + 1.5 * rx : cx}
              y2={guide.axis === 'x' ? cy : cy + 1.5 * ry}
              {...ink}
              strokeOpacity={0.72}
              strokeWidth={1.6}
              markerStart={arrow}
              markerEnd={arrow}
            />
          )}
          {rotating && (
            <path d={`M${cx} ${cy - 1.5 * ry} V${cy + 1.5 * ry} M${cx - 1.5 * rx} ${cy} H${cx + 1.5 * rx}`} {...ink} strokeOpacity={0.6} strokeWidth={1.4} strokeDasharray="6 5" />
          )}

          <g transform={`translate(${cx} ${cy}) rotate(${pose.rot}) scale(${pose.s})`}>
            <ellipse
              rx={ELL.rx}
              ry={ELL.ry}
              fill="none"
              className="stroke-accent"
              strokeWidth={strong('ellipsoid') ? 4.5 : 3}
              strokeOpacity={emph && !strong('ellipsoid') ? 0.7 : 1}
              vectorEffect="non-scaling-stroke"
            />
            {/* its own axes: dashed; solid, and longer, while it turns */}
            <line
              x1={-ELL.rx * axisK}
              y1="0"
              x2={ELL.rx * axisK}
              y2="0"
              className={rotating ? 'stroke-accent' : 'stroke-accent/50'}
              strokeWidth={rotating ? 2.4 : 1.5}
              strokeDasharray={rotating ? undefined : '5 4'}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              y1={-ELL.ry * axisK}
              x2="0"
              y2={ELL.ry * axisK}
              className={rotating ? 'stroke-accent' : 'stroke-accent/50'}
              strokeWidth={rotating ? 2.4 : 1.5}
              strokeDasharray={rotating ? undefined : '5 4'}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>

        {/* station 3: the two check points on the geoid (outside the display stretch: round marks) */}
        {probes && (
          <>
            <circle cx={point(probes.off).x} cy={point(probes.off).y} r={7} fill="#FFFFFF" fillOpacity={0.4} stroke={C_INK} strokeOpacity={0.6} strokeWidth={1.6} strokeDasharray="3 3" />
            <circle cx={point(probes.on).x} cy={point(probes.on).y} r={9} fill="#FFFFFF" fillOpacity={0.4} stroke={C_INK} strokeWidth={2.2} />
          </>
        )}
      </svg>
    </div>
  );
}

const GEOID_SVG = poly(GEOID, true);
const LOCAL_SVG = poly(REGION.local);
/** End caps of the marked region: short strokes across the geoid, along the radius. */
const LOCAL_CAPS = [REGION.local[0], REGION.local[REGION.local.length - 1]].map((p) => {
  const vx = p.x - GC.x;
  const vy = p.y - GC.y;
  const l = Math.hypot(vx, vy) || 1;
  return `M${(p.x - (vx / l) * 12).toFixed(1)},${(p.y - (vy / l) * 12).toFixed(1)} L${(p.x + (vx / l) * 12).toFixed(1)},${(p.y + (vy / l) * 12).toFixed(1)}`;
});
/** The Earth's surface in the exercise plane: the view's smooth envelope at λ = 0 (u ≥ 0) and λ = π. */
const SURFACE_SVG = poly(
  Array.from({ length: 360 }, (_, i) => {
    const t = -Math.PI + (i / 360) * 2 * Math.PI;
    const beta = Math.atan2(-Math.sin(t), Math.abs(Math.cos(t)));
    const w = surfaceEnvelopeW(beta, Math.cos(t) >= 0 ? 0 : Math.PI);
    return { x: GC.x + ELL.rx * w * Math.cos(t), y: GC.y + ELL.ry * w * Math.sin(t) };
  }),
  true,
);
