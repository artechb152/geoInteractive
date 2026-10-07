'use client';

/**
 * SlopeVisuals — the two linked boards of "4 סוגי מדרונות" (LandformsScene).
 *
 *   - "מהצד": a realistic cut-away of the hillside rendered in Blender
 *     (scripts/blender/render_slope_profiles.py) — topsoil over layered rock,
 *     scrub and boulders on top, in the lesson-1 render style. The render is
 *     framed 1:1 on this board's viewBox, so the cut edge IS the profile curve
 *     below, and the equal-height crossings sit exactly on it.
 *   - "במפה": the same slope as a topographic map plate, in the map language of
 *     the contours scene (ContoursShapeMap): paper plate, grid, brown contours
 *     with a heavier index line, elevations written on the lines, a section line
 *     and a summit mark. Brackets under the plate name what the spacing means.
 *
 * Both boards share the horizontal scale, so every crossing drops straight
 * onto its contour line. Copy strings are passed in from the scene.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';

type Pt = [number, number];

// [d, e] normalized — d = horizontal distance from the foot (0) to the crest (1),
// e = height in equal contour intervals (0 = foot, 1 = crest). The same crossings feed
// both boards, so a steep segment reads as tight contours.
// Keep in sync with scripts/blender/render_slope_profiles.py (it renders these curves).
export const SLOPE_GEO: Record<string, [number, number][]> = {
  even: [[0, 0], [0.2, 0.2], [0.4, 0.4], [0.6, 0.6], [0.8, 0.8], [1, 1]],
  convex: [[0, 0], [0.04, 0.2], [0.16, 0.4], [0.36, 0.6], [0.64, 0.8], [1, 1]],
  concave: [[0, 0], [0.36, 0.2], [0.64, 0.4], [0.84, 0.6], [0.96, 0.8], [1, 1]],
  shoulder: [[0, 0], [0.1, 0.2], [0.2, 0.4], [0.75, 0.6], [0.86, 0.8], [1, 1]],
};

export type SlopeZoneKind = 'steep' | 'gentle' | 'even';

// Stretches of each slope named under the map (d ranges, same axis as SLOPE_GEO).
const SLOPE_ZONES: Record<string, { from: number; to: number; kind: SlopeZoneKind }[]> = {
  even: [{ from: 0, to: 1, kind: 'even' }],
  convex: [
    { from: 0, to: 0.16, kind: 'steep' },
    { from: 0.36, to: 1, kind: 'gentle' },
  ],
  concave: [
    { from: 0, to: 0.64, kind: 'gentle' },
    { from: 0.84, to: 1, kind: 'steep' },
  ],
  shoulder: [
    { from: 0, to: 0.2, kind: 'steep' },
    { from: 0.2, to: 0.75, kind: 'gentle' },
    { from: 0.75, to: 1, kind: 'steep' },
  ],
};

const geoOf = (slope: string) => SLOPE_GEO[slope] ?? SLOPE_GEO.even;
const zonesOf = (slope: string) => SLOPE_ZONES[slope] ?? SLOPE_ZONES.even;

const ASSET_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/slope-profiles`;
const KINDS = ['even', 'convex', 'concave', 'shoulder'];

// Illustration / map palette — the same values the contours-scene map uses.
const C = {
  ink: '#38432E',
  accent: '#D97E2B',
  contour: '#8A6F4D', // brown map ink (= tanline.badge)
  level: '#C9A56B', // tanline.contour
  shade: '#8A6F4D', // relief shading = the contour ink, only fainter
  plate: '#F8F2E7',
  plateEdge: '#DCCDB2',
  paper: '#FDFBF3',
};

const f2 = (n: number) => n.toFixed(2);
const EASE = [0.22, 1, 0.36, 1] as const;

// Monotone cubic (Fritsch–Carlson) through the crossings — a smooth slope that
// still passes exactly through every equal-height crossing.
function monotoneSegments(pts: [number, number][]): { c1: Pt; c2: Pt; to: Pt }[] {
  const n = pts.length;
  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(pts[i + 1][0] - pts[i][0]);
    delta.push((pts[i + 1][1] - pts[i][1]) / h[i]);
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }
  return pts.slice(0, -1).map(([d, e], i) => {
    const [d2, e2] = pts[i + 1];
    return {
      c1: [d + h[i] / 3, e + (m[i] * h[i]) / 3] as Pt,
      c2: [d2 - h[i] / 3, e2 - (m[i + 1] * h[i]) / 3] as Pt,
      to: [d2, e2] as Pt,
    };
  });
}

// Profile board geometry (viewBox 0 0 200 60) — the Blender camera frames exactly this.
const P_W = 200;
const P_H = 60;
const sx = (d: number) => 30 + d * 144; // foot → crest, shared with the map plate
const py = (e: number) => 46 - e * 30;
const P_BOTTOM = 53; // underside of the rendered slab
const P_LEFT = 18;
const P_RIGHT = 190;

type Geo = [number, number][];

function surfacePath(pts: Geo, X = sx, Y = py, left = P_LEFT, right = P_RIGHT): string {
  const segs = monotoneSegments(pts);
  let d = `M${f2(left)},${f2(Y(0))}L${f2(X(0))},${f2(Y(0))}`;
  for (const s of segs) {
    d += `C${f2(X(s.c1[0]))},${f2(Y(s.c1[1]))} ${f2(X(s.c2[0]))},${f2(Y(s.c2[1]))} ${f2(X(s.to[0]))},${f2(Y(s.to[1]))}`;
  }
  d += `L${f2(right)},${f2(Y(1))}`;
  return d;
}

// e(d) of the same curve surfacePath draws: its d-controls sit at thirds, so each
// Bézier segment is exactly this cubic Hermite. Flat beyond the foot and the crest.
function heightFn(pts: Geo): (d: number) => number {
  const segs = monotoneSegments(pts);
  const last = pts.length - 1;
  return (d) => {
    if (d <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < last; i++) {
      if (d > pts[i + 1][0]) continue;
      const t = (d - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
      const u = 1 - t;
      return u * u * u * pts[i][1] + 3 * u * u * t * segs[i].c1[1] + 3 * u * t * t * segs[i].c2[1] + t * t * t * pts[i + 1][1];
    }
    return pts[last][1];
  };
}

const LEVELS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const ELEV = (e: number) => String(Math.round(100 + e * 100));

/* ── The morph: one tween drives the profile curve ───────────────────────── */

// pts = the curve on screen right now (crossings interpolated between types);
// kind = the render shown. It switches to the new type at once — the new
// hillside itself morphs from the old shape into its own; nothing cross-fades.
type Morph = { pts: Geo; kind: string };

const sameGeo = (a: Geo, b: Geo) => a.every(([d, e], i) => Math.abs(d - b[i][0]) < 1e-6 && Math.abs(e - b[i][1]) < 1e-6);

function useSlopeMorph(slope: string): Morph {
  const reduce = useReducedMotion();
  const [morph, setMorph] = useState<Morph>(() => ({ pts: geoOf(slope), kind: slope }));
  const current = useRef(morph);

  useEffect(() => {
    const from = current.current.pts;
    const to = geoOf(slope);
    const commit = (m: Morph) => {
      current.current = m;
      setMorph(m);
    };
    if (sameGeo(from, to)) {
      if (current.current.kind !== slope) commit({ pts: to, kind: slope });
      return;
    }
    if (reduce) {
      commit({ pts: to, kind: slope });
      return;
    }
    // Starts from whatever is on screen, so a click mid-morph carries on smoothly.
    const controls = animate(0, 1, {
      duration: 0.55,
      ease: EASE,
      onUpdate: (p) =>
        commit({
          pts: from.map(([d, e], i) => [d + (to[i][0] - d) * p, e + (to[i][1] - e) * p] as [number, number]),
          kind: slope,
        }),
    });
    return () => controls.stop();
  }, [slope, reduce]);

  return morph;
}

const renders = new Map<string, Promise<HTMLImageElement>>();
function loadRender(kind: string): Promise<HTMLImageElement> {
  let p = renders.get(kind);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `${ASSET_BASE}/${kind}.webp`;
    });
    renders.set(kind, p);
  }
  return p;
}

// Bends one render onto the curve on screen, column by column: everything above
// the ground (surface strip, scrub, sky) rides up/down with the ground line, and
// the cut face stretches between the ground line and the fixed slab underside.
function warpRender(ctx: CanvasRenderingContext2D, img: HTMLImageElement, native: Geo, shown: Geo) {
  const { width: W, height: H } = ctx.canvas;
  const k = W / P_W; // canvas px per board unit
  const ik = img.naturalWidth / P_W; // render px per board unit
  const eIn = heightFn(native);
  const eOut = heightFn(shown);
  const SEAM = 0.2; // the above-ground strip overlaps the face a hair, so no seam shows
  ctx.clearRect(0, 0, W, H);
  for (let cx = 0; cx < W; cx += 2) {
    const cw = Math.min(2, W - cx);
    const d = ((cx + cw / 2) / k - 30) / 144;
    const a = py(eIn(d)); // ground line in the render
    const b = py(eOut(d)); // ground line on screen
    const sx0 = (cx / k) * ik;
    const sw = (cw / k) * ik;
    ctx.drawImage(img, sx0, a * ik, sw, (P_BOTTOM - a) * ik, cx, b * k, cw, (P_BOTTOM - b) * k);
    const top = Math.max(0, b - a);
    const srcTop = top - (b - a);
    ctx.drawImage(img, sx0, srcTop * ik, sw, (a + SEAM - srcTop) * ik, cx, top * k, cw, (b + SEAM - top) * k);
  }
  // contact shadow under the slab stays put
  ctx.drawImage(img, 0, P_BOTTOM * ik, img.naturalWidth, (P_H - P_BOTTOM) * ik, 0, P_BOTTOM * k, W, (P_H - P_BOTTOM) * k);
}

// The realistic hillside (Blender renders), drawn on a canvas so it can morph.
function SlopeTerrain({ morph }: { morph: Morph }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef<Partial<Record<string, HTMLImageElement>>>({});
  const [loaded, setLoaded] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let alive = true;
    for (const kind of KINDS) {
      loadRender(kind)
        .then((img) => {
          if (!alive) return;
          images.current[kind] = img;
          setLoaded((n) => n + 1);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width * Math.min(2, window.devicePixelRatio || 1)));
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !width) return;
    const H = Math.round((width * P_H) / P_W);
    if (canvas.width !== width || canvas.height !== H) {
      canvas.width = width;
      canvas.height = H;
    }
    const img = images.current[morph.kind];
    if (!img) {
      ctx.clearRect(0, 0, width, H);
      return;
    }
    const native = geoOf(morph.kind);
    if (sameGeo(native, morph.pts)) {
      ctx.clearRect(0, 0, width, H);
      ctx.drawImage(img, 0, 0, width, H);
    } else {
      warpRender(ctx, img, native, morph.pts);
    }
  }, [morph, width, loaded]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}

export function SlopeProfile({
  slope,
  bottomLabel,
  topLabel,
  ariaLabel,
}: {
  slope: string;
  bottomLabel: string;
  topLabel: string;
  ariaLabel: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const morph = useSlopeMorph(slope);
  const { pts } = morph;

  return (
    <div className="relative" role="img" aria-label={ariaLabel}>
      {/* back: sky + equal-height reference lines + elevations (m) */}
      <svg viewBox={`0 0 ${P_W} ${P_H}`} className="block w-full h-auto" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#F6EFE6" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={P_W} height={P_H} fill={`url(#${uid}-sky)`} />
        {LEVELS.map((e) => (
          <g key={e}>
            <line x1={16} y1={py(e)} x2={P_RIGHT + 4} y2={py(e)} stroke={C.level} strokeOpacity={0.7} strokeWidth={0.28} strokeDasharray="1.4 1.2" />
            <text x={11} y={py(e) + 1.05} textAnchor="middle" fontSize={3.4} fill={C.contour} className="font-display font-semibold">
              {ELEV(e)}
            </text>
          </g>
        ))}
      </svg>

      {/* middle: the realistic hillside, morphing between slope types */}
      <SlopeTerrain morph={morph} />

      {/* front: drop lines, crossings and labels — all on the curve on screen */}
      <svg viewBox={`0 0 ${P_W} ${P_H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {/* drop lines — each crossing falls straight down onto its contour line in the map */}
        {pts.map(([d, e], i) => (
          <g key={'drop' + i}>
            <line x1={sx(d)} x2={sx(d)} y1={py(e)} y2={P_BOTTOM} stroke={C.paper} strokeOpacity={0.9} strokeWidth={0.35} strokeDasharray="0.9 0.9" />
            <line x1={sx(d)} x2={sx(d)} y1={P_BOTTOM + 0.6} y2={P_H} stroke={C.contour} strokeOpacity={0.6} strokeWidth={0.3} strokeDasharray="0.9 0.9" />
          </g>
        ))}
        {pts.map(([d, e], i) => (
          <circle key={'dot' + i} cx={sx(d)} cy={py(e)} r={1.5} fill={C.accent} stroke="#FFFFFF" strokeWidth={0.5} />
        ))}

        {/* crest + foot */}
        <text x={sx(1)} y={py(1) - 8.5} textAnchor="middle" fontSize={4.2} fill={C.ink} className="font-display font-bold">
          {topLabel}
        </text>
        <text x={sx(0) - 7} y={P_H - 1.6} textAnchor="middle" fontSize={4.2} fill={C.ink} className="font-display font-bold">
          {bottomLabel}
        </text>
      </svg>
    </div>
  );
}

// Map plate (viewBox 0 0 200 64) — the same slope from above, as one flank of a
// hill: every contour bows toward the low ground and all lines share one shape,
// shifted to its crossing, so spacing is the only thing that changes.
const M_H = 64;
const M_TOP = 5;
const M_BOT = 49;
const M_MID = 27; // section line — the cut shown in the profile above
const M_HALF = M_MID - M_TOP;
const ARM = 9; // how far the contour arms bend toward the summit at the plate edge
const LABEL_ROWS = [36, 42.5]; // alternate rows keep neighbouring elevations apart

// Slight natural irregularity — zero on the section line, so every contour
// still crosses it exactly at its profile crossing.
function wiggle(y: number, i: number): number {
  const t = Math.abs(y - M_MID) / M_HALF;
  return (0.4 * Math.sin(0.28 * y + i * 0.9) + 0.14 * Math.sin(0.75 * y + 1.3 + i * 0.5)) * Math.min(1, t * 2.5);
}
const contourX = (x0: number, y: number, i: number) => x0 + ARM * ((y - M_MID) / M_HALF) ** 2 + wiggle(y, i);

const C_N = 60;
const C_Y0 = M_TOP - 1;
const C_Y1 = M_BOT + 1;
const contourPts = (x0: number, i: number): Pt[] =>
  Array.from({ length: C_N + 1 }, (_, k) => {
    const y = C_Y0 + ((C_Y1 - C_Y0) * k) / C_N;
    return [contourX(x0, y, i), y] as Pt;
  });
const polyD = (pts: Pt[]) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${f2(x)},${f2(y)}`).join('');

// Relief shading between two neighbouring contours: the steeper the stretch
// (height gained per distance), the darker — as on a hill-shaded topo map.
function bandD(x0: number, i: number, x1: number): string {
  return polyD([...contourPts(x0, i), ...contourPts(x1, i + 1).reverse()]) + 'Z';
}
const shadeOf = (dd: number) => Math.min(0.3, 0.035 + 0.05 * (0.2 / Math.max(dd, 0.01)));

export function SlopeContours({
  slope,
  bottomLabel,
  topLabel,
  zoneLabels,
  ariaLabel,
}: {
  slope: string;
  bottomLabel: string;
  topLabel: string;
  zoneLabels: Record<SlopeZoneKind, string>;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pts = geoOf(slope);
  const tr = { duration: reduce ? 0 : 0.55, ease: EASE };
  const summitX = (sx(1) + P_RIGHT) / 2 + 1;

  return (
    <svg viewBox={`0 0 ${P_W} ${M_H}`} className="block w-full h-auto" role="img" aria-label={ariaLabel}>
      <defs>
        <clipPath id={`${uid}-plate`}>
          <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} rx={2} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={P_W} height={M_H} fill={C.paper} />

      {/* map plate + grid */}
      <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} rx={2} fill={C.plate} />
      <g stroke={C.plateEdge} strokeWidth={0.3} opacity={0.55}>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={'gx' + i} d={`M${38 + i * 20} ${M_TOP}V${M_BOT}`} />
        ))}
        {[M_MID - 11, M_MID + 11].map((y) => (
          <path key={'gy' + y} d={`M${P_LEFT} ${y}H${P_RIGHT}`} />
        ))}
      </g>

      {/* drop lines arriving from the profile, down to the section line */}
      {pts.map(([d], i) => (
        <motion.line
          key={'stub' + i}
          initial={false}
          animate={{ x1: sx(d), x2: sx(d) }}
          transition={tr}
          y1={0}
          y2={M_MID}
          stroke={C.contour}
          strokeOpacity={0.5}
          strokeWidth={0.3}
          strokeDasharray="0.9 0.9"
        />
      ))}

      {/* relief shading + contour lines — 20 m interval; the foot and crest lines are index contours */}
      <g clipPath={`url(#${uid}-plate)`}>
        {pts.slice(0, -1).map(([d], i) => {
          const next = pts[i + 1][0];
          return (
            <motion.path
              key={'band' + i}
              initial={false}
              animate={{ d: bandD(sx(d), i, sx(next)), fillOpacity: shadeOf(next - d) }}
              transition={tr}
              fill={C.shade}
              stroke="none"
            />
          );
        })}
        {pts.map(([d], i) => {
          const isIndex = i === 0 || i === pts.length - 1;
          return (
            <motion.path
              key={'c' + i}
              initial={false}
              animate={{ d: polyD(contourPts(sx(d), i)) }}
              transition={tr}
              fill="none"
              stroke={C.contour}
              strokeWidth={isIndex ? 1 : 0.5}
              strokeLinejoin="round"
            />
          );
        })}
      </g>
      <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} rx={2} fill="none" stroke={C.plateEdge} strokeWidth={0.35} />

      {/* section line — the cut drawn in the profile above */}
      <path d={`M${P_LEFT + 1} ${M_MID}H${P_RIGHT - 1}`} fill="none" stroke={C.ink} strokeWidth={0.45} strokeDasharray="2.4 1.6" />
      {pts.map(([d], i) => (
        <motion.circle
          key={'dot' + i}
          initial={false}
          animate={{ cx: sx(d) }}
          transition={tr}
          cy={M_MID}
          r={1.25}
          fill={C.accent}
          stroke="#FFFFFF"
          strokeWidth={0.45}
        />
      ))}

      {/* elevations written on the lines, as on a real map */}
      {pts.map(([d, e], i) => {
        const y = LABEL_ROWS[i % 2];
        return (
          <motion.g key={'lbl' + i} initial={false} animate={{ x: contourX(sx(d), y, i), y }} transition={tr}>
            <rect x={-4.3} y={-2.7} width={8.6} height={5.4} rx={1.1} fill={C.plate} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={4.2} fontWeight={700} fill={C.contour} className="font-display tabular-nums">
              {ELEV(e)}
            </text>
          </motion.g>
        );
      })}

      {/* summit (top of the slope) and foot */}
      <polygon
        points={`${f2(summitX)},${f2(M_MID - 5.4)} ${f2(summitX - 1.6)},${f2(M_MID - 2.6)} ${f2(summitX + 1.6)},${f2(M_MID - 2.6)}`}
        fill={C.ink}
      />
      <text x={summitX} y={M_MID - 8.2} textAnchor="middle" fontSize={3.9} fill={C.ink} className="font-display font-bold">
        {topLabel}
      </text>
      <text x={(P_LEFT + sx(0)) / 2} y={M_MID - 8.2} textAnchor="middle" fontSize={3.9} fill={C.ink} className="font-display font-bold">
        {bottomLabel}
      </text>

      {/* what the spacing means, stretch by stretch */}
      <motion.g
        key={slope}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.25 }}
      >
        {zonesOf(slope).map((z) => {
          const x1 = sx(z.from) + 0.6;
          const x2 = sx(z.to) - 0.6;
          return (
            <g key={z.from}>
              <path d={`M${f2(x1)} ${M_BOT + 2.2}V${M_BOT + 3.8}H${f2(x2)}V${M_BOT + 2.2}`} fill="none" stroke={C.ink} strokeWidth={0.4} strokeLinejoin="round" />
              <text x={(x1 + x2) / 2} y={M_BOT + 9.4} textAnchor="middle" fontSize={3.8} fill={C.ink} className="font-display font-bold">
                {zoneLabels[z.kind]}
              </text>
            </g>
          );
        })}
      </motion.g>
    </svg>
  );
}

// Tiny profile glyph for the slope tabs.
export function SlopeGlyph({ slope, className }: { slope: string; className?: string }) {
  const X = (d: number) => 4 + d * 32;
  const Y = (e: number) => 19 - e * 15;
  return (
    <svg viewBox="0 0 40 22" className={className} aria-hidden>
      <path d={`${surfacePath(geoOf(slope), X, Y, 1, 39)}L39,21L1,21Z`} fill="currentColor" fillOpacity={0.16} />
      <path
        d={surfacePath(geoOf(slope), X, Y, 1, 39)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
