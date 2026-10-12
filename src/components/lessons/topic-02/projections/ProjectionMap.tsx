'use client';
/* ─────────── the flat map of one method ───────────
   The Earth reprojected through the method's own inverse (earthRaster.mapImage), under an
   SVG of the same graticule, the map's outline, the sample parallel and point (orange) and
   the line / point of contact (sage, dashed) — every line from projectionsModel.project.
   An illustration: dir="ltr", never mirrored. The SVG works in the canvas's CSS pixels
   (no viewBox scaling), so line widths and dashes are true screen pixels. The map never
   turns with the 3-D camera. */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { mapImage, type EarthPixels } from './earthRaster';
import {
  CONE_RHO_OUT, CONE_THETA_MAX, CONTACT_LAT, DEMO, MAP_BOX, gridLines, outlineOf, parallelLine, project, type Method, type XY,
} from './projectionsModel';

type Props = {
  method: Method;
  pixels: EarthPixels | null;
  /** the sample parallel and point */
  demo?: boolean;
  /** the line (or point) where the surface touches the globe */
  contact?: boolean;
  label: string;
  /** free space kept around the map inside its box, px */
  pad?: number;
  className?: string;
};

export const ProjectionMap = memo(function ProjectionMap({ method, pixels, demo = true, contact = true, label, pad = 8, className }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (s && Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const box = MAP_BOX[method];
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  const scale = size ? Math.max(1, Math.min((size.w - 2 * pad) / bw, (size.h - 2 * pad) / bh)) : 0;
  const W = Math.round(bw * scale);
  const H = Math.round(bh * scale);

  // the raster, at device pixels
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !scale || !pixels) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const img = mapImage(pixels, method, box, scale * dpr);
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d')?.putImageData(img, 0, 0);
  }, [pixels, method, box, scale]);

  const paths = useMemo(() => {
    if (!scale) return null;
    const xy = ([x, y]: XY) => `${((x - box.x0) * scale).toFixed(1)},${((box.y1 - y) * scale).toFixed(1)}`;
    const d = (pts: XY[], close = false) => `M${pts.map(xy).join('L')}${close ? 'Z' : ''}`;
    const g = gridLines(method);
    // the cone's paper from its apex: the developed sector the surface unrolls into
    let paper = '';
    if (method === 'cone') {
      const arc: XY[] = [];
      for (let k = 0; k <= 96; k++) {
        const t = -CONE_THETA_MAX + (2 * CONE_THETA_MAX * k) / 96;
        arc.push([CONE_RHO_OUT * Math.sin(t), -CONE_RHO_OUT * Math.cos(t)]);
      }
      paper = d([[0, 0], ...arc], true);
    }
    const pt = project(method, DEMO.lat, DEMO.lon);
    return {
      grid: [...g.parallels, ...g.meridians].map((l) => d(l)).join(''),
      outline: d(outlineOf(method), true),
      paper,
      sel: d(parallelLine(method, DEMO.lat)),
      contact: method === 'az' ? '' : d(parallelLine(method, CONTACT_LAT[method])),
      point: { x: (pt[0] - box.x0) * scale, y: (box.y1 - pt[1]) * scale },
      pole: method === 'az' ? { x: (0 - box.x0) * scale, y: box.y1 * scale } : null,
    };
  }, [method, scale, box]);

  return (
    <div ref={boxRef} dir="ltr" role="img" aria-label={label} className={cn('grid h-full w-full place-items-center', className)} data-map={method}>
      {paths && (
        <div className="relative" style={{ width: W, height: H }}>
          {paths.paper && (
            <svg aria-hidden width={W} height={H} className="absolute inset-0 overflow-visible">
              <path d={paths.paper} className="fill-paper-bright stroke-fg/40" strokeWidth={1.25} strokeLinejoin="round" />
            </svg>
          )}
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0" style={{ width: W, height: H }} />
          <svg aria-hidden width={W} height={H} className="absolute inset-0 overflow-visible">
            {/* without imagery (still loading): the map's area in a quiet sea tone, so the grid reads */}
            {!pixels && <path d={paths.outline} className="fill-[#8CC2E2]/40" />}
            <path d={paths.grid} fill="none" className="stroke-fg/30" strokeWidth={1} />
            {contact && paths.contact && <path d={paths.contact} fill="none" className="stroke-brand-dark" strokeWidth={2.25} strokeDasharray="7 5" data-contact />}
            {demo && <path d={paths.sel} fill="none" className="stroke-accent" strokeWidth={2.25} strokeLinecap="round" data-sel />}
            <path d={paths.outline} fill="none" className="stroke-fg/60" strokeWidth={1.25} strokeLinejoin="round" />
            {contact && paths.pole && <circle cx={paths.pole.x} cy={paths.pole.y} r={4.5} className="fill-brand-dark stroke-white" strokeWidth={2} data-contact />}
            {demo && <circle cx={paths.point.x} cy={paths.point.y} r={5.5} className="fill-accent stroke-white" strokeWidth={2.25} data-point />}
          </svg>
        </div>
      )}
    </div>
  );
});
