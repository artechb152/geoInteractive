'use client';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { LINE_V, SPAN_U, type ZoomGeometry } from './ellipsoidView';
import { STATION_IDS } from './measurementLayout';
import { MEASUREMENT_MODEL as M } from './measurementModel.data';
import { MODEL_URLS } from './measurementView';
import { C_ACCENT, C_ELL, C_INK } from './referenceBodiesStyle';

const f = (v: number) => v.toFixed(1);

/**
 * The ellipsoid's marked area, enlarged (ellipsoidView.zoomGeometry): the
 * stretch of the landscape the section is drawn along, as its own top-down image
 * on a thin layer, lifted above the matching piece of the ellipsoid — a smooth,
 * gently curved sheet with its grid. The two are drawn apart on purpose: the
 * ellipsoid is the reference surface, the ground a separate thing above it;
 * enlarging the body does not make it rough. The survey line crosses the layer
 * where it runs on the landscape, its ends right above the section's ends.
 * `linked`: the line is drawn firm, with its stations — the state the section
 * below answers. The geometry takes the body's angle, so the layer turns as
 * the body does; `inSight` false (the area round the back of the body) fades
 * it, `hot` (the area pointed at or turned on the body) brightens its frame.
 */
export function EllipsoidZoom({
  width,
  height,
  zoom,
  linked,
  inSight = true,
  hot = false,
}: {
  width: number;
  height: number;
  zoom: ZoomGeometry;
  linked: boolean;
  inSight?: boolean;
  hot?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const [u0, u1] = SPAN_U;
  const n = 12;
  const edge = (pt: (u: number, v: number) => { x: number; y: number }, ua: number, va: number, ub: number, vb: number) =>
    Array.from({ length: n + 1 }, (_, k) => pt(ua + ((ub - ua) * k) / n, va + ((vb - va) * k) / n));
  const ring = (pt: (u: number, v: number) => { x: number; y: number }) =>
    [...edge(pt, u0, 0, u1, 0), ...edge(pt, u1, 0, u1, 1), ...edge(pt, u1, 1, u0, 1), ...edge(pt, u0, 1, u0, 0)];
  const path = (pts: { x: number; y: number }[], close = true) => `${pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)},${f(p.y)}`).join('')}${close ? 'Z' : ''}`;
  // the top-down image (u 0 … 1 across the whole model, v 1 … 0 down the image) mapped onto the layer
  const o = zoom.terrain(0, 1);
  const ax = zoom.terrain(1, 1);
  const ay = zoom.terrain(0, 0);
  const img = `matrix(${(ax.x - o.x) / M.albedo.w} ${(ax.y - o.y) / M.albedo.w} ${(ay.x - o.x) / M.albedo.h} ${(ay.y - o.y) / M.albedo.h} ${o.x} ${o.y})`;
  const corners: [number, number][] = [
    [u0, 0],
    [u1, 0],
    [u1, 1],
    [u0, 1],
  ];
  const left = Math.min(...corners.map(([u, v]) => zoom.terrain(u, v).x));
  const lineW = linked ? 3 : 2;

  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      className={cn('absolute inset-0 overflow-visible transition-opacity duration-300 motion-reduce:transition-none', inSight ? 'opacity-100' : 'opacity-45')}
      data-in-sight={inSight}
    >
      <defs>
        <clipPath id={`${uid}-area`}>
          <path d={path(ring(zoom.terrain))} />
        </clipPath>
      </defs>

      {/* the piece of the ellipsoid: smooth, gently curved, with its grid */}
      <path d={path(ring(zoom.patch))} fill={C_ELL} fillOpacity={0.14} stroke={C_ELL} strokeWidth={1.5} strokeLinejoin="round" />
      <g fill="none" stroke={C_ELL} strokeOpacity={0.5} strokeWidth={1}>
        {[0.25, 0.5, 0.75].map((v) => (
          <path key={`v${v}`} d={path(edge(zoom.patch, u0, v, u1, v), false)} />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((t) => {
          const u = u0 + (u1 - u0) * t;
          return <path key={`u${t}`} d={path(edge(zoom.patch, u, 0, u, 1), false)} />;
        })}
      </g>

      {/* the ground stands above it: the layer's corners down to the sheet */}
      <g stroke={C_INK} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="3 3">
        {corners.map(([u, v], i) => {
          const a = zoom.terrain(u, v);
          const b = zoom.patch(u, v);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>

      {/* the ground: the landscape's own image on a thin layer */}
      <g clipPath={`url(#${uid}-area)`}>
        <image href={MODEL_URLS.albedo} width={M.albedo.w} height={M.albedo.h} transform={img} preserveAspectRatio="none" />
      </g>
      {/* the same orange frame as the marked area on the body: this is that area */}
      <path
        d={path(ring(zoom.terrain))}
        fill="none"
        stroke={C_ACCENT}
        strokeWidth={hot ? 3.5 : 2.5}
        strokeLinejoin="round"
        className="transition-[stroke-width] duration-200 motion-reduce:transition-none"
      />

      {/* the survey line across it: its ends stand over the section's ends */}
      <line
        x1={zoom.line[0].x}
        y1={zoom.line[0].y}
        x2={zoom.line[1].x}
        y2={zoom.line[1].y}
        stroke={C_ACCENT}
        strokeWidth={lineW}
        className="transition-[stroke-width] duration-300 motion-reduce:transition-none"
      />
      {zoom.line.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={C_ACCENT} stroke="#FDFBF3" strokeWidth={1.5} />
      ))}
      <g className={cn('transition-opacity duration-300 motion-reduce:transition-none', linked ? 'opacity-100' : 'opacity-0')}>
        {STATION_IDS.map((id) => {
          const p = zoom.stations[id];
          return (
            <g key={id}>
              <circle cx={p.x} cy={p.y} r={2.5} fill="#FDFBF3" stroke={C_INK} strokeWidth={1.25} />
              <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill={C_INK} className="font-display" stroke="#FDFBF3" strokeWidth={3} paintOrder="stroke">
                {id}
              </text>
            </g>
          );
        })}
      </g>

      {/* names, left of the area like the section's line names */}
      <text x={left - 8} y={zoom.terrain(u0, LINE_V).y} textAnchor="end" dominantBaseline="central" direction="ltr" fontSize={13} fontWeight={700} fill={C_INK} className="font-display">
        פני השטח
      </text>
      <text x={left - 8} y={zoom.patch(u0, 0.3).y} textAnchor="end" dominantBaseline="central" direction="ltr" fontSize={13} fontWeight={700} fill={C_ELL} className="font-display">
        אליפסואיד
      </text>
    </svg>
  );
}
