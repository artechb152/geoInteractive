'use client';
/* ─────────── the 3-D stage without WebGL ───────────
   The same model drawn flat: the base view and its fit (projectionsModel.baseView / fitCamera),
   the sheet's own lines moved by the same sheetPoint the 3-D view uses and projected through
   the same camera, hidden where the globe stands in front of them (geoCoords.segmentHitsEllipsoid).
   The globe is the Earth image seen from that view (orthographic, cached per view), sized to the
   projected body. Linked to the same slider; it does not turn. */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { segmentHitsEllipsoid } from '../geo-globe/geoCoords';
import { sampleEarth, type EarthPixels } from './earthRaster';
import {
  CAM_FOV, CONTACT_LAT, DEMO, baseView, fitCamera, framePoints, gridLines, outlineOf, parallelLine, project, sheetPoint, viewBasis, type Method, type Vec3, type XY,
} from './projectionsModel';
import type { StageView } from './ProjectionStage3D';

const D2R = Math.PI / 180;
const globeCache = new Map<string, HTMLCanvasElement>();

/** The Earth from (el, az), orthographic, lit softly from the upper left (as the 3-D key light). */
function globeImage(px: EarthPixels | null, el: number, az: number, n = 256): HTMLCanvasElement {
  const key = `${px?.source ?? 'none'}|${Math.round(el)}|${Math.round(az)}|${n}`;
  const hit = globeCache.get(key);
  if (hit) return hit;
  const { d, up, right } = viewBasis(Math.round(el), Math.round(az));
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  const g = c.getContext('2d')!;
  const img = g.createImageData(n, n);
  const L = [-0.36, 0.42, 0.83];
  const rgb = [0, 0, 0];
  const tmp = [0, 0, 0];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const u = ((i + 0.5) / n) * 2 - 1;
      const v = 1 - ((j + 0.5) / n) * 2;
      const rr = u * u + v * v;
      if (rr > 1) continue;
      const w = Math.sqrt(1 - rr);
      const x = u * right[0] + v * up[0] + w * d[0];
      const y = u * right[1] + v * up[1] + w * d[1];
      const z = u * right[2] + v * up[2] + w * d[2];
      const lat = Math.asin(Math.max(-1, Math.min(1, y))) / D2R;
      const lon = Math.atan2(-z, x) / D2R;
      if (px) sampleEarth(px, lat, lon, rgb, tmp);
      else rgb.splice(0, 3, 86, 154, 201);
      const k = 0.62 + 0.5 * Math.max(0, u * L[0] + v * L[1] + w * L[2]);
      const o = (j * n + i) * 4;
      img.data[o] = Math.min(255, rgb[0] * k);
      img.data[o + 1] = Math.min(255, rgb[1] * k);
      img.data[o + 2] = Math.min(255, rgb[2] * k);
      img.data[o + 3] = Math.round(255 * Math.min(1, (1 - Math.sqrt(rr)) * n * 0.5));
    }
  g.putImageData(img, 0, 0);
  if (globeCache.size > 40) globeCache.delete(globeCache.keys().next().value!);
  globeCache.set(key, c);
  return c;
}

export const ProjectionStageFlat = memo(function ProjectionStageFlat({ view, pixels }: { view: StageView; pixels: EarthPixels | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = view.m;
  const e = m === 'az' ? 0 : view.p;
  const b = baseView(m, view.p);
  const scene = useMemo(() => {
    if (!size) return null;
    const W = size.w;
    const H = size.h;
    const aspect = W / Math.max(1, H);
    const fit = fitCamera(framePoints(m, e, b.el, b.az), b.el, b.az, aspect, CAM_FOV, 0.96);
    const { d, up, right } = viewBasis(b.el, b.az);
    const cam: Vec3 = [fit.target[0] + d[0] * fit.dist, fit.target[1] + d[1] * fit.dist, fit.target[2] + d[2] * fit.dist];
    const tanV = Math.tan((CAM_FOV * D2R) / 2);
    const toPx = (p: Vec3): XY => {
      const r = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]];
      const depth = -(r[0] * d[0] + r[1] * d[1] + r[2] * d[2]);
      const sx = (r[0] * right[0] + r[1] * right[1] + r[2] * right[2]) / depth / (tanV * aspect);
      const sy = (r[0] * up[0] + r[1] * up[1] + r[2] * up[2]) / depth / tanV;
      return [((sx + 1) / 2) * W, ((1 - sy) / 2) * H];
    };
    // a polyline split into the runs seen and the runs the globe hides
    const runs = (pts: Vec3[]) => {
      const seen: XY[][] = [];
      const hidden: XY[][] = [];
      let cur: XY[] = [];
      let curHidden: boolean | null = null;
      for (const p of pts) {
        const h = segmentHitsEllipsoid(cam, p, 1e-4);
        const q = toPx(p);
        if (curHidden !== null && h !== curHidden) {
          cur.push(q);
          (curHidden ? hidden : seen).push(cur);
          cur = [];
        }
        cur.push(q);
        curHidden = h;
      }
      if (cur.length > 1) (curHidden ? hidden : seen).push(cur);
      return { seen, hidden };
    };
    const path = (ls: XY[][]) => ls.map((l) => `M${l.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`).join('');
    const o = { p: [0, 0, 0] as Vec3, n: [0, 0, 0] as Vec3 };
    const onSheet = (flat: XY[]) => flat.map(([x, y]) => (m ? ([...sheetPoint(m, e, x, y, o).p] as Vec3) : ([0, 0, 0] as Vec3)));
    const onGlobe = (lat: number, lon: number): Vec3 => {
      const la = lat * D2R;
      const lo = lon * D2R;
      return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
    };
    // the globe: centre and projected radius
    const c = toPx([0, 0, 0]);
    const D = Math.hypot(cam[0], cam[1], cam[2]);
    const R = (H / 2) * (Math.tan(Math.asin(1 / D)) / tanV);
    // the globe's own lines: graticule, sample parallel (front side only)
    const gGrid: Vec3[][] = [];
    for (let lat = -75; lat <= 75; lat += 15) gGrid.push(Array.from({ length: 97 }, (_, k) => onGlobe(lat, -180 + (360 * k) / 96)));
    for (let lon = -180; lon < 180; lon += 15) gGrid.push(Array.from({ length: 49 }, (_, k) => onGlobe(-84 + (168 * k) / 48, lon)));
    const front = (ls: Vec3[][]) => path(ls.flatMap((l) => runs(l).seen));
    const out = {
      c,
      R,
      globeGrid: front(gGrid),
      globeSel: view.demo ? front([Array.from({ length: 145 }, (_, k) => onGlobe(DEMO.lat, -180 + (360 * k) / 144))]) : '',
      globeContact: m && m !== 'az' ? front([Array.from({ length: 145 }, (_, k) => onGlobe(CONTACT_LAT[m], -180 + (360 * k) / 144))]) : '',
      globePoint: view.demo && !segmentHitsEllipsoid(cam, onGlobe(DEMO.lat, DEMO.lon).map((v) => v * 1.0005) as Vec3, 1e-4) ? toPx(onGlobe(DEMO.lat, DEMO.lon)) : null,
      sheet: null as null | { grid: { seen: string; hidden: string }; outline: { seen: string; hidden: string }; sel: string; contact: string; point: XY | null; pole: XY | null },
    };
    if (m) {
      const g = gridLines(m);
      const split = (ls: XY[][]) => {
        const r = ls.map((l) => runs(onSheet(l)));
        return { seen: path(r.flatMap((x) => x.seen)), hidden: path(r.flatMap((x) => x.hidden)) };
      };
      const pt = onSheet([project(m, DEMO.lat, DEMO.lon)])[0];
      out.sheet = {
        grid: split([...g.parallels, ...g.meridians]),
        outline: split([outlineOf(m)]),
        sel: view.demo ? path(runs(onSheet(parallelLine(m, DEMO.lat))).seen) : '',
        contact: m === 'az' ? '' : path(runs(onSheet(parallelLine(m, CONTACT_LAT[m]))).seen),
        // as in 3-D: the sheet's copy of the point once the sheet is (nearly) the flat map
        point: view.demo && (m === 'az' || view.p >= 0.8) && !segmentHitsEllipsoid(cam, pt, 1e-4) ? toPx(pt) : null,
        pole: m === 'az' ? toPx(onSheet([[0, 0]])[0]) : null,
      };
    }
    return out;
  }, [size, m, e, b.el, b.az, view.demo]);

  // the globe image for this view, scaled to the projected body
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const src = globeImage(pixels, b.el, b.az);
    cv.width = src.width;
    cv.height = src.height;
    cv.getContext('2d')?.drawImage(src, 0, 0);
  }, [pixels, b.el, b.az]);

  return (
    <div ref={ref} dir="ltr" className="absolute inset-x-0 top-0 bottom-12" data-flat-stage>
      {scene && (
        <>
          <svg aria-hidden className="absolute inset-0 h-full w-full">
            {scene.sheet && (
              <g fill="none" className="stroke-fg" strokeOpacity={0.22} strokeWidth={1}>
                <path d={scene.sheet.grid.hidden} />
                <path d={scene.sheet.outline.hidden} strokeWidth={1.5} />
              </g>
            )}
          </svg>
          <canvas
            ref={canvasRef}
            aria-hidden
            className="absolute"
            style={{ left: scene.c[0] - scene.R, top: scene.c[1] - scene.R, width: scene.R * 2, height: scene.R * 2 }}
          />
          <svg aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
            <path d={scene.globeGrid} fill="none" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={1} />
            {scene.globeContact && <path d={scene.globeContact} fill="none" className="stroke-brand-dark" strokeWidth={2.5} strokeDasharray="7 5" />}
            {scene.globeSel && <path d={scene.globeSel} fill="none" className="stroke-accent" strokeWidth={2.25} />}
            {scene.globePoint && <circle cx={scene.globePoint[0]} cy={scene.globePoint[1]} r={5.5} className="fill-accent stroke-white" strokeWidth={2.25} />}
            {scene.sheet && (
              <g fill="none">
                <path d={scene.sheet.grid.seen} className="stroke-fg" strokeOpacity={0.45} strokeWidth={1} />
                <path d={scene.sheet.outline.seen} className="stroke-fg" strokeOpacity={0.7} strokeWidth={1.5} />
                {scene.sheet.contact && <path d={scene.sheet.contact} className="stroke-brand-dark" strokeWidth={2.5} strokeDasharray="7 5" />}
                {scene.sheet.sel && <path d={scene.sheet.sel} className="stroke-accent" strokeWidth={2.25} />}
                {scene.sheet.pole && <circle cx={scene.sheet.pole[0]} cy={scene.sheet.pole[1]} r={4.5} className="fill-brand-dark stroke-white" strokeWidth={2} />}
                {scene.sheet.point && <circle cx={scene.sheet.point[0]} cy={scene.sheet.point[1]} r={5.5} className="fill-accent stroke-white" strokeWidth={2.25} />}
              </g>
            )}
          </svg>
        </>
      )}
    </div>
  );
});

