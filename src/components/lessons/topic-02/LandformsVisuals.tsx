'use client';

/**
 * LandformsVisuals — illustrations for LandformsScene ("תבניות נוף").
 *
 * Every landform is defined ONCE as a height field h(x, y) over a 100×50 map
 * tile. From that single source we derive both boards, so they always agree:
 *
 *   - "במציאות": a terrain block — the continuous surface in a gentle
 *     axonometric view, coloured by elevation and hill-shaded by the sun, cut
 *     out of the ground with cream paper edges (the course's papercut look).
 *     No contour layers here: the rings belong to the map.
 *   - "במפה": the same surface traced as contour lines (marching squares) with
 *     a constant 10 m interval and a heavier index contour at 150.
 *
 * The landform's key feature (summit ring / spur axis / drainage line / saddle
 * point / depression rim) is marked the same way in both views. Copy strings
 * are passed in from the scene (single source of copy).
 */

import { useId, useMemo, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BASE, C, LEVELS,
  buildContours, buildTerrain, drape, f2, getMorphMesh, identity, isInterior, isVisible, mix, nearestOnLevel, ringsPath,
  type Contours, type HeightFn, type Pt, type Terrain, type TerrainLook, type TerrainSpec,
} from './terrainBlockGeometry';
import { ContourMapSheet, MapLabel, TerrainBlockView, useContourMorph, useIdlePrefetch } from './terrainBlock';

/* ── Shared geometry ─────────────────────────────────────────────────────── */

export type LandformId = 'hill' | 'spur' | 'valley' | 'saddle' | 'depression';

const E = Math.exp;

// Sheet colours by elevation — sand base, then sage → deep olive as the ground
// rises (the map tint follows the same logic: deeper tint = higher ground).
// Neighbouring sheets alternate slightly so every paper layer reads on its own.
const SAND = mix(C.rim, C.paperEdge, 0.45);
const LOW_FACE = mix(C.greenLight, C.paperEdge, 0.55);
function faceColor(z: number): string {
  if (z <= BASE) return SAND;
  const t = (z - LEVELS[0]) / (LEVELS[LEVELS.length - 1] - LEVELS[0]);
  const c = t < 0.5 ? mix(LOW_FACE, C.greenLight, t / 0.5) : mix(C.greenLight, C.greenMid, (t - 0.5) / 0.5);
  return Math.round((z - BASE) / 10) % 2 ? c : mix(c, C.paperEdge, 0.1);
}

// Terrain block: elevation ramp (sand plain → sage slopes → olive tops), lit by a
// sun from the viewer's front-left so slopes facing the reader stay readable.
const GROUND_RAMP: [number, string][] = [
  [0, mix(SAND, LOW_FACE, 0.35)],
  [0.3, LOW_FACE],
  [0.62, C.greenLight],
  [1, C.greenMid],
];

/* ── Landform definitions ────────────────────────────────────────────────── */

type Spec = {
  h: HeightFn;
  kz: number; // oblique: screen-y per metre of elevation (vertical exaggeration)
  ky?: number; // camera: foreshortening of the ground plane (default KY)
  highlight?: number; // level whose closed contour is the key feature
  numbers: { level: number; at: Pt }[]; // elevation labels on the map
};

const SPECS: Record<LandformId, Spec> = {
  hill: {
    h: (x, y) => {
      const dx = (x - 50) / 23;
      const dy = (y - 25) / 12.5;
      const th = Math.atan2(dy, dx);
      const r2 = (dx * dx + dy * dy) * (1 + 0.08 * Math.sin(2 * th + 0.7) + 0.05 * Math.cos(3 * th - 0.4));
      return BASE + 68 * E(-0.9 * r2);
    },
    kz: 0.28,
    highlight: 160,
    numbers: [
      { level: 150, at: [66, 25] },
      { level: 110, at: [84, 25] },
    ],
  },
  spur: {
    h: (x, y) => {
      const b = 22 * E(-(((x - 50) / 11) ** 2));
      return 170 - 1.8 * (y + 3 - b) + 0.8 * Math.sin(x * 0.19);
    },
    kz: 0.23,
    numbers: [
      { level: 150, at: [16, 12] },
      { level: 120, at: [16, 29] },
    ],
  },
  valley: {
    h: (x, y) => {
      const v = 18 * Math.max(0, 1 - Math.abs(x - 50) / 17) ** 1.5;
      const s = 5 * (E(-(((x - 16) / 10) ** 2)) + E(-(((x - 84) / 10) ** 2)));
      return 160 - 1.8 * (y - 20 + v - s);
    },
    kz: 0.23,
    numbers: [
      { level: 150, at: [86, 27] },
      { level: 120, at: [86, 44] },
    ],
  },
  saddle: {
    h: (x, y) => {
      const q = (cx: number) => ((x - cx) / 11) ** 2 + ((y - 25) / 11.5) ** 2;
      return (
        BASE +
        42.6 * (E(-q(26)) + E(-q(74))) +
        35.3 * E(-(((y - 25) / 10.5) ** 2)) * E(-(((x - 50) / 30) ** 4))
      );
    },
    kz: 0.24,
    numbers: [
      { level: 150, at: [26, 17] },
      { level: 130, at: [50, 13] },
    ],
  },
  depression: {
    h: (x, y) => {
      const dx = (x - 50) / 31;
      const dy = (y - 24) / 18;
      const th = Math.atan2(dy, dx);
      const r = Math.sqrt(dx * dx + dy * dy) * (1 + 0.05 * Math.sin(3 * th + 1));
      // smooth min(1, r): a rounded rim instead of a sharp crease
      const k = Math.max(0.08 - Math.abs(1 - r), 0) / 0.08;
      // steep walls around a wide, flat floor — a makhtesh, not a funnel
      return 112 + 40 * (Math.min(1, r) - k * k * 0.02) ** 1.8;
    },
    kz: 0.3,
    // looked at from a little higher than the rest, so the eye sees INTO the pit
    ky: 0.52,
    highlight: 150,
    numbers: [
      { level: 150, at: [82, 24] },
      { level: 130, at: [64, 24] },
    ],
  },
};

// The landforms' look: the elevation ramp above, and on the hill its key summit
// ring tinted toward the accent (the same ring is highlighted on the map).
const LANDFORM_LOOK: TerrainLook = { ramp: GROUND_RAMP };
const HILL_LOOK: TerrainLook = {
  ramp: GROUND_RAMP,
  tint: (col, q) => (q.raw >= (SPECS.hill.highlight as number) ? mix(col, C.accent, 0.32) : col),
};
const TERRAIN_SPECS = Object.fromEntries(
  (Object.keys(SPECS) as LandformId[]).map((f) => {
    const { h, kz, ky } = SPECS[f];
    return [f, { h, kz, ky, look: f === 'hill' ? HILL_LOOK : LANDFORM_LOOK } satisfies TerrainSpec];
  }),
) as Record<LandformId, TerrainSpec>;

const getTerrain = (form: LandformId): Terrain => buildTerrain(TERRAIN_SPECS[form]);

type Landform = Contours & { spec: Spec };

const cache = new Map<LandformId, Landform>();

function getLandform(id: LandformId): Landform {
  const hit = cache.get(id);
  if (hit) return hit;
  const lf: Landform = { spec: SPECS[id], ...buildContours(SPECS[id].h) };
  cache.set(id, lf);
  return lf;
}

/* ── Feature overlays (the key feature of each landform) ─────────────────── */

type Line = { from: Pt; to: Pt };

// Plan-view geometry of each key feature, shared by both boards.
const FEATURES: Record<LandformId, { axis?: Line; ridge?: Line; drain?: Line; point?: Pt }> = {
  hill: {},
  spur: { axis: { from: [50, 9], to: [50, 41] } },
  valley: { drain: { from: [50, 1], to: [50, 49.5] } },
  saddle: { ridge: { from: [26, 25], to: [74, 25] }, point: [50, 25] },
  depression: { point: [50, 24] },
};

function sampleLine(l: Line, step = 0.25): Pt[] {
  const [x1, y1] = l.from;
  const [x2, y2] = l.to;
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step));
  return Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n] as Pt);
}

function Arrowhead({ tip, dir, size = 2.2, fill }: { tip: Pt; dir: Pt; size?: number; fill: string }) {
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / len;
  const uy = dir[1] / len;
  const bx = tip[0] - ux * size;
  const by = tip[1] - uy * size;
  const w = size * 0.55;
  return (
    <polygon
      points={`${f2(tip[0])},${f2(tip[1])} ${f2(bx - uy * w)},${f2(by + ux * w)} ${f2(bx + uy * w)},${f2(by - ux * w)}`}
      fill={fill}
    />
  );
}

function Summit({ at, fill, size = 2.4 }: { at: Pt; fill: string; size?: number }) {
  const [x, y] = at;
  return (
    <polygon
      points={`${f2(x)},${f2(y - size)} ${f2(x - size * 0.62)},${f2(y + size * 0.1)} ${f2(x + size * 0.62)},${f2(y + size * 0.1)}`}
      fill={fill}
      stroke="#FFFFFF"
      strokeWidth={0.35}
      strokeLinejoin="round"
    />
  );
}

/* ── "במציאות" — terrain block ───────────────────────────────────────────── */

const PREFETCH = (Object.keys(SPECS) as LandformId[]).map((f) => () => {
  getMorphMesh(getTerrain(f));
  getLandform(f);
});

export function LandformReality({ form, ariaLabel }: { form: LandformId; ariaLabel: string }) {
  const terrain = getTerrain(form);
  // key feature, draped on the ground once the block is in place
  const marks = useMemo(() => realityOverlays(form, getLandform(form), terrain), [form, terrain]);
  // Prepare the other landforms while the reader is idle, so switching is quick.
  useIdlePrefetch(PREFETCH);
  return <TerrainBlockView terrain={terrain} ariaLabel={ariaLabel} marks={marks} />;
}

function realityOverlays(form: LandformId, lf: Landform, t: Terrain): ReactNode[] {
  const { highlight } = lf.spec;
  const feat = FEATURES[form];
  const out: ReactNode[] = [];

  // the same closed contour that is highlighted on the map (hill top, depression rim)
  if (highlight !== undefined) {
    const d = (lf.rings.get(highlight) ?? [])
      .filter(isInterior)
      .map((r) => drape(t, r, true))
      .join('');
    if (d) out.push(<path key="hl" d={d} fill="none" stroke={C.accent} strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" />);
  }
  if (feat.axis) {
    out.push(
      <path
        key="ax"
        d={drape(t, sampleLine(feat.axis))}
        fill="none"
        stroke={C.accent}
        strokeWidth={0.65}
        strokeDasharray="1.6 1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    );
    const [ex, ey] = feat.axis.to;
    if (isVisible(t, ex, ey + 2.6)) {
      const tip = t.at(ex, ey + 2.6);
      const from = t.at(ex, ey);
      out.push(<Arrowhead key="axh" tip={tip} dir={[tip[0] - from[0], tip[1] - from[1]]} fill={C.accent} />);
    }
  }
  if (feat.drain) {
    const d = drape(t, sampleLine(feat.drain));
    out.push(
      <g key="dr" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} stroke={C.riverDeep} strokeWidth={1.3} />
        <path d={d} stroke={C.river} strokeWidth={0.8} />
      </g>,
    );
  }
  if (feat.ridge) {
    out.push(
      <path
        key="rg"
        d={drape(t, sampleLine(feat.ridge))}
        fill="none"
        stroke={C.accent}
        strokeWidth={0.6}
        strokeDasharray="1.4 0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    );
  }
  if (form === 'saddle' && feat.point && isVisible(t, feat.point[0], feat.point[1])) {
    const [sx, sy] = t.at(feat.point[0], feat.point[1]);
    out.push(<circle key="sp" cx={sx} cy={sy} r={1.3} fill={C.accent} stroke="#FFFFFF" strokeWidth={0.45} />);
  }
  return out;
}

/* ── "במפה" — contour map ─────────────────────────────────────────────────── */

export type LandformMapLabels = {
  toLow: string;
  toPeak: string;
  drainage: string;
  saddle: string;
  low: string;
};

// Short ticks on each depression contour, pointing downhill (into the pit).
function hachures(lf: Landform, level: number): string {
  const out: string[] = [];
  const h = lf.spec.h;
  for (const ring of (lf.rings.get(level) ?? []).filter(isInterior)) {
    let acc = 0;
    for (let i = 1; i <= ring.length; i++) {
      const a = ring[i - 1];
      const b = ring[i % ring.length];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc < 3.2) continue;
      acc = 0;
      const e = 0.3;
      const gx = (h(b[0] + e, b[1]) - h(b[0] - e, b[1])) / (2 * e);
      const gy = (h(b[0], b[1] + e) - h(b[0], b[1] - e)) / (2 * e);
      const g = Math.hypot(gx, gy) || 1;
      out.push(`M${f2(b[0])},${f2(b[1])}L${f2(b[0] - (gx / g) * 1.1)},${f2(b[1] - (gy / g) * 1.1)}`);
    }
  }
  return out.join('');
}

export function LandformMap({
  form,
  labels,
  ariaLabel,
}: {
  form: LandformId;
  labels: LandformMapLabels;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const lf = getLandform(form);
  const feat = FEATURES[form];
  const highlightRings = lf.spec.highlight ? (lf.rings.get(lf.spec.highlight) ?? []).filter(isInterior) : [];

  // Switching landforms: the contours reshape with the ground (useContourMorph).
  // The labels and key-feature marks wait until the new form has settled.
  const { paths, still, switched } = useContourMorph(lf);
  // first showing: the marks follow the contours' fade-in; after a switch they come right away
  const marks = { duration: reduce ? 0 : 0.3, delay: reduce || switched ? 0 : 0.45 };
  const marksIn = reduce ? false : { opacity: 0 };

  return (
    <ContourMapSheet
      ariaLabel={ariaLabel}
      paths={paths}
      inClip={
        still &&
        form === 'depression' && (
          <motion.path
            key={`hach-${form}`}
            initial={switched ? marksIn : false}
            animate={{ opacity: 1 }}
            transition={marks}
            d={lf.levels.map((L) => hachures(lf, L)).join('')}
            fill="none"
            stroke={C.contourIndex}
            strokeWidth={0.28}
            strokeLinecap="round"
          />
        )
      }
    >
      {/* key contour — matches the highlighted sheet on the diorama */}
      {still && highlightRings.length > 0 && (
        <motion.path
          key={`hl-${form}`}
          initial={marksIn}
          animate={{ opacity: 1 }}
          transition={marks}
          d={ringsPath(highlightRings, identity)}
          fill={form === 'hill' ? C.accent : 'none'}
          fillOpacity={0.14}
          stroke={C.accent}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      )}

      {/* elevation numbers on the lines (metres) */}
      {still && (
        <motion.g key={`num-${form}`} initial={switched ? marksIn : false} animate={{ opacity: 1 }} transition={marks}>
          {lf.spec.numbers.map(({ level, at }) => {
            const p = nearestOnLevel(lf, level, at);
            return p ? (
              <MapLabel key={level} at={p} text={String(level)} fill={C.contourIndex} size={2.3} charW={0.62} />
            ) : null;
          })}
        </motion.g>
      )}

      {/* key feature — matches the marks on the diorama */}
      {still && (
        <motion.g key={`feat-${form}`} initial={marksIn} animate={{ opacity: 1 }} transition={marks}>
          {form === 'spur' && feat.axis && (
            <>
              <line
                x1={feat.axis.from[0]}
                y1={feat.axis.from[1]}
                x2={feat.axis.to[0]}
                y2={feat.axis.to[1]}
                stroke={C.accent}
                strokeWidth={0.6}
                strokeDasharray="1.6 1"
                strokeLinecap="round"
              />
              <Arrowhead tip={[feat.axis.to[0], feat.axis.to[1] + 2.4]} dir={[0, 1]} fill={C.accent} />
              <MapLabel at={[50, 47]} text={labels.toLow} fill={C.accent} />
            </>
          )}

          {form === 'valley' && feat.drain && (
            <>
              <line
                x1={feat.drain.from[0]}
                y1={feat.drain.from[1]}
                x2={feat.drain.to[0]}
                y2={feat.drain.to[1]}
                stroke={C.river}
                strokeWidth={0.9}
                strokeLinecap="round"
              />
              {/* reading cue: the V's apex points up-valley, toward the high ground */}
              <line x1={59} y1={38} x2={59} y2={12} stroke={C.accent} strokeWidth={0.55} strokeLinecap="round" />
              <Arrowhead tip={[59, 9.4]} dir={[0, -1]} fill={C.accent} />
              <MapLabel at={[59, 5.6]} text={labels.toPeak} fill={C.accent} />
              <MapLabel at={[50, 45.5]} text={labels.drainage} fill={C.riverDeep} />
            </>
          )}

          {form === 'saddle' && feat.ridge && feat.point && (
            <>
              <line
                x1={feat.ridge.from[0] + 3}
                y1={feat.ridge.from[1]}
                x2={feat.ridge.to[0] - 3}
                y2={feat.ridge.to[1]}
                stroke={C.accent}
                strokeWidth={0.55}
                strokeDasharray="1.4 0.9"
                strokeLinecap="round"
              />
              <circle cx={feat.point[0]} cy={feat.point[1]} r={1.2} fill={C.accent} stroke="#FFFFFF" strokeWidth={0.4} />
              <MapLabel at={[50, 31]} text={labels.saddle} fill={C.accent} />
            </>
          )}

          {form === 'depression' && feat.point && <MapLabel at={feat.point} text={labels.low} fill={C.accent} />}
        </motion.g>
      )}
    </ContourMapSheet>
  );
}

/* ── Slopes — linked side profile + contour strip ────────────────────────── */

// [d, e] normalized — d = horizontal distance from the foot (0) to the crest (1),
// e = height in equal contour intervals (0 = foot, 1 = crest). The same crossings feed
// both the side profile and the map view, so a steep segment reads as tight contours.
export const SLOPE_GEO: Record<string, [number, number][]> = {
  even: [[0, 0], [0.2, 0.2], [0.4, 0.4], [0.6, 0.6], [0.8, 0.8], [1, 1]],
  convex: [[0, 0], [0.04, 0.2], [0.16, 0.4], [0.36, 0.6], [0.64, 0.8], [1, 1]],
  concave: [[0, 0], [0.36, 0.2], [0.64, 0.4], [0.84, 0.6], [0.96, 0.8], [1, 1]],
  shoulder: [[0, 0], [0.1, 0.2], [0.2, 0.4], [0.75, 0.6], [0.86, 0.8], [1, 1]],
};

const geoOf = (slope: string) => SLOPE_GEO[slope] ?? SLOPE_GEO.even;

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

// Profile board geometry (viewBox 0 0 200 56)
const P_W = 200;
const P_H = 51;
const sx = (d: number) => 30 + d * 144; // foot → crest, shared with the contour strip
const py = (e: number) => 40 - e * 29;
const P_GROUND = 40;
const P_BOTTOM = 45;
const P_LEFT = 18;
const P_RIGHT = 190;

function surfacePath(slope: string, X = sx, Y = py, left = P_LEFT, right = P_RIGHT): string {
  const pts = geoOf(slope);
  const segs = monotoneSegments(pts);
  let d = `M${f2(left)},${f2(Y(0))}L${f2(X(0))},${f2(Y(0))}`;
  for (const s of segs) {
    d += `C${f2(X(s.c1[0]))},${f2(Y(s.c1[1]))} ${f2(X(s.c2[0]))},${f2(Y(s.c2[1]))} ${f2(X(s.to[0]))},${f2(Y(s.to[1]))}`;
  }
  d += `L${f2(right)},${f2(Y(1))}`;
  return d;
}

const BAND_COLORS = [0, 1, 2, 3, 4].map((k) => faceColor(BASE + ((k + 0.5) / 5) * 60));
const ELEV = (e: number) => String(Math.round(100 + e * 100));

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
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pts = geoOf(slope);
  const surface = surfacePath(slope);
  const body = `${surface}L${P_RIGHT},${P_BOTTOM}L${P_LEFT},${P_BOTTOM}Z`;
  const tr = { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <svg viewBox={`0 0 ${P_W} ${P_H}`} className="block w-full h-auto" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F6EFE6" />
        </linearGradient>
        <clipPath id={`${uid}-body`}>
          <motion.path initial={false} animate={{ d: body }} transition={tr} />
        </clipPath>
        <filter id={`${uid}-lift`} x="-5%" y="-20%" width="110%" height="150%">
          <feDropShadow dx="0" dy="0.7" stdDeviation="0.8" floodColor="#3B3524" floodOpacity="0.22" />
        </filter>
      </defs>
      <rect x={0} y={0} width={P_W} height={P_H} fill={`url(#${uid}-sky)`} />

      {/* equal-height reference lines + elevations (m) */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((e) => (
        <g key={e}>
          <line
            x1={18}
            y1={py(e)}
            x2={P_RIGHT + 4}
            y2={py(e)}
            stroke={C.contour}
            strokeOpacity={0.55}
            strokeWidth={0.28}
            strokeDasharray="1.4 1.2"
          />
          <text
            x={11}
            y={py(e) + 1.05}
            textAnchor="middle"
            fontSize={2.9}
            fill={C.contourIndex}
            className="font-display font-semibold"
          >
            {ELEV(e)}
          </text>
        </g>
      ))}

      {/* the terrain as a papercut cross-section: one band per contour interval */}
      <g filter={`url(#${uid}-lift)`}>
        <g clipPath={`url(#${uid}-body)`}>
          <rect x={P_LEFT} y={P_GROUND} width={P_RIGHT - P_LEFT} height={P_BOTTOM - P_GROUND} fill={C.rim} />
          {BAND_COLORS.map((col, k) => (
            <rect
              key={k}
              x={P_LEFT}
              y={py((k + 1) / 5)}
              width={P_RIGHT - P_LEFT}
              height={py(k / 5) - py((k + 1) / 5) + 0.02}
              fill={col}
            />
          ))}
        </g>
        <motion.path
          initial={false}
          animate={{ d: surface }}
          transition={tr}
          fill="none"
          stroke={C.greenDeep}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      </g>

      {/* drop lines — each crossing falls straight onto its contour line below */}
      {pts.map(([d, e], i) => (
        <motion.line
          key={'drop' + i}
          initial={false}
          animate={{ x1: sx(d), x2: sx(d), y1: py(e) }}
          transition={tr}
          y2={P_H}
          stroke={C.contourIndex}
          strokeOpacity={0.55}
          strokeWidth={0.3}
          strokeDasharray="0.9 0.9"
        />
      ))}
      {pts.slice(1, 5).map(([d, e], i) => (
        <motion.circle
          key={'dot' + i}
          initial={false}
          animate={{ cx: sx(d), cy: py(e) }}
          transition={tr}
          r={1.5}
          fill={C.accent}
          stroke="#FFFFFF"
          strokeWidth={0.5}
        />
      ))}

      {/* crest + foot */}
      <Summit at={[sx(1), py(1) - 0.9]} fill={C.ink} size={2.6} />
      <text x={sx(1) + 9} y={py(1) - 1.2} textAnchor="middle" fontSize={3.6} fill={C.ink} className="font-display font-bold">
        {topLabel}
      </text>
      <text x={sx(0) - 11} y={P_BOTTOM + 4.4} textAnchor="middle" fontSize={3.6} fill={C.ink} className="font-display font-bold">
        {bottomLabel}
      </text>
    </svg>
  );
}

// Contour strip (viewBox 0 0 200 40) — the same slope from above. Every line is the
// same gentle curve shifted to its crossing's x, so spacing is the only variable.
const M_H = 36;
const M_TOP = 7.5;
const M_BOT = 28.5;
const contourD = (x: number) =>
  `M${f2(x)},${M_TOP}C${f2(x + 1.8)},${f2(M_TOP + 8)} ${f2(x - 1.8)},${f2(M_BOT - 8)} ${f2(x)},${M_BOT}`;

export function SlopeContours({
  slope,
  bottomLabel,
  topLabel,
  ruleLabel,
  ariaLabel,
}: {
  slope: string;
  bottomLabel: string;
  topLabel: string;
  ruleLabel: string;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const pts = geoOf(slope);
  const tr = { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };
  const mid = (M_TOP + M_BOT) / 2;

  return (
    <svg viewBox={`0 0 ${P_W} ${M_H}`} className="block w-full h-auto" role="img" aria-label={ariaLabel}>
      <rect x={0} y={0} width={P_W} height={M_H} fill={C.paper} />
      <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} fill="#FFFFFF" />
      <g stroke={C.hairlineSoft} strokeWidth={0.2}>
        {Array.from({ length: 17 }, (_, i) => (
          <line key={i} x1={P_LEFT + (i + 1) * 10} y1={M_TOP} x2={P_LEFT + (i + 1) * 10} y2={M_BOT} />
        ))}
        <line x1={P_LEFT} y1={18} x2={P_RIGHT} y2={18} />
      </g>
      {/* drop-line stubs continuing from the profile above */}
      {pts.map(([d], i) => (
        <motion.line
          key={'stub' + i}
          initial={false}
          animate={{ x1: sx(d), x2: sx(d) }}
          transition={tr}
          y1={0}
          y2={M_TOP}
          stroke={C.contourIndex}
          strokeOpacity={0.55}
          strokeWidth={0.3}
          strokeDasharray="0.9 0.9"
        />
      ))}
      {pts.map(([d], i) => {
        const isIndex = i === 0 || i === pts.length - 1;
        return (
          <g key={i}>
            <motion.path
              initial={false}
              animate={{ d: contourD(sx(d)) }}
              transition={tr}
              fill="none"
              stroke={isIndex ? C.contourIndex : C.contour}
              strokeWidth={isIndex ? 0.75 : 0.55}
              strokeLinecap="round"
            />
            {/* downhill tick — points toward the foot (lower ground) */}
            <motion.line
              initial={false}
              animate={{ x1: sx(d), x2: sx(d) - 2.2 }}
              transition={tr}
              y1={mid}
              y2={mid}
              stroke={isIndex ? C.contourIndex : C.contour}
              strokeWidth={0.5}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} fill="none" stroke={C.hairline} strokeWidth={0.35} />
      <text x={P_W / 2} y={5} textAnchor="middle" fontSize={3.3} fill={C.ink} className="font-display font-bold">
        {ruleLabel}
      </text>
      <text x={sx(0)} y={33.3} textAnchor="middle" fontSize={3.4} fill={C.ink} className="font-display font-bold">
        {bottomLabel}
      </text>
      <text x={sx(1)} y={33.3} textAnchor="middle" fontSize={3.4} fill={C.ink} className="font-display font-bold">
        {topLabel}
      </text>
    </svg>
  );
}

// Tiny profile glyph for the slope tabs.
export function SlopeGlyph({ slope, className }: { slope: string; className?: string }) {
  const X = (d: number) => 4 + d * 32;
  const Y = (e: number) => 19 - e * 15;
  return (
    <svg viewBox="0 0 40 22" className={className} aria-hidden>
      <path d={`${surfacePath(slope, X, Y, 1, 39)}L39,21L1,21Z`} fill="currentColor" fillOpacity={0.16} />
      <path
        d={surfacePath(slope, X, Y, 1, 39)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
