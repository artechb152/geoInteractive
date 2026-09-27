'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * "זיהוי תנאי שטח לפי צפיפות" — contour map + A–B cross-section.
 *
 * Each terrain kind is a real height model z(r, θ) around one summit. The map
 * contours are *computed* from it (every 10 m, ray-bisection per angle), and
 * the profile underneath is the same model sampled along the dashed section
 * line A–B. Dashed drop-lines connect every contour crossing on A–B to its
 * height in the profile — the classic "build a profile from contours"
 * construction — so the learner sees that line SPACING on the map *is* the
 * slope in the profile:
 *
 *   gentle → few, widely & evenly spaced lines → long shallow profile
 *   steep  → many tightly packed lines           → short steep profile
 *   cliff  → lines merge on one side (hachured)  → a vertical wall in profile
 *
 * Every contour slot is always rendered with the same path structure (fixed
 * sample count), so switching kinds morphs the lines (they spread, pack or
 * merge) instead of cutting between pictures. Slots above a hill's summit
 * collapse onto the summit and fade out.
 *
 * Diagram — never mirrored for RTL; every <text> sets textAnchor.
 */

export type DensityKind = 'gentle' | 'steep' | 'cliff';

// ── Layout (viewBox units) ────────────────────────────────────────────────
const VB_W = 200;
const VB_H = 190;
const CX = 100; // summit
const CY = 58;
const ASPECT = 0.56; // map ellipse squash (N–S / E–W)
const SEC_A = 16; // section line ends (west A → east B, left → right)
const SEC_B = 184;
const MAP_BOTTOM = 116;
const PROF_TOP = 128;
const PROF_BASE = 176;
const Z_MAX = 90; // metres shown in the profile
const Z_SCALE = (PROF_BASE - PROF_TOP) / Z_MAX;

const SLOTS = [10, 20, 30, 40, 50, 60, 70, 80]; // contour interval = 10 m
const INDEX_H = 50; // every 5th line = index contour (thicker)
const K = 72; // samples per contour ring
const PROFILE_N = 141;
const LABEL_T = -2.25; // where contour labels sit on their ring (upper-left)

const INK = '#38432E';
/** Brown map-contour ink (= tanline.badge) — contour lines are brown, never the orange action accent. */
const CONTOUR_INK = '#8A6F4D';

/** Mix two #RRGGBB colours (t = 0 → a, t = 1 → b). */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, sh: number) => (p >> sh) & 0xff;
  const m = (sh: number) => Math.round(ch(pa, sh) + (ch(pb, sh) - ch(pa, sh)) * t);
  return '#' + ((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0');
}
const GRID = '#EEE5D2';

// ── Height models ─────────────────────────────────────────────────────────
type Model = {
  H: number; // summit height (m)
  R: (t: number) => number; // horizontal reach of the hill along angle t
  g: (u: number, t: number) => number; // height fraction 1 → 0 as u = r/R goes 0 → 1
};

const wobble = (t: number) => 1 + 0.045 * Math.sin(2 * t + 0.7) + 0.03 * Math.cos(3 * t - 0.5);
const eastness = (t: number) => ((1 + Math.cos(t)) / 2) ** 2; // 1 facing B, 0 facing A

/** Cliff face profile: near-flat top, then a sheer drop over the last 18 %. */
const cliffFace = (u: number) => (u < 0.82 ? 1 - (0.1 * u) / 0.82 : (0.9 * (1 - u)) / 0.18);

const MODELS: Record<DensityKind, Model> = {
  // Low, broad cone → a few lines, wide and evenly spaced.
  gentle: { H: 45, R: (t) => 80 * wobble(t), g: (u) => 1 - u },
  // Tall, tight cone → many lines packed close together.
  steep: { H: 86, R: (t) => 54 * wobble(t), g: (u) => 1 - u },
  // Cuesta: gentle back-slope toward A, sheer wall toward B.
  cliff: {
    H: 86,
    R: (t) => (80 + (36 - 80) * eastness(t)) * (1 + 0.03 * Math.sin(2 * t + 0.7)),
    g: (u, t) => {
      const w = eastness(t);
      return (1 - w) * (1 - u) + w * cliffFace(u);
    },
  },
};

/** Radius (fraction u of R) at which the hill reaches height fraction f. */
function solveU(m: Model, f: number, t: number) {
  let lo = 0;
  let hi = 1;
  for (let n = 0; n < 28; n++) {
    const mid = (lo + hi) / 2;
    if (m.g(mid, t) > f) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

type Pt = [number, number];

function ringPoint(m: Model, h: number, t: number): Pt {
  const visible = h < m.H;
  const u = visible ? solveU(m, h / m.H, t) : 0.02; // hidden → collapse on summit
  const r = u * m.R(t);
  return [CX + r * Math.cos(t), CY + r * Math.sin(t) * ASPECT];
}

const f2 = (n: number) => n.toFixed(2);

/** Closed Catmull-Rom → cubic Bézier path; fixed structure so paths morph. */
function closedPath(pts: Pt[]) {
  const n = pts.length;
  let d = `M${f2(pts[0][0])},${f2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f2(c1[0])},${f2(c1[1])} ${f2(c2[0])},${f2(c2[1])} ${f2(p2[0])},${f2(p2[1])}`;
  }
  return `${d}Z`;
}

function heightAlongSection(m: Model, x: number) {
  const t = x >= CX ? 0 : Math.PI;
  const u = Math.abs(x - CX) / m.R(t);
  return u >= 1 ? 0 : m.H * m.g(u, t);
}

type Geometry = {
  rings: { h: number; d: string; visible: boolean; label: Pt; xw: number; xe: number }[];
  profile: string;
  profileTop: string;
  hachures: string;
};

function buildGeometry(kind: DensityKind): Geometry {
  const m = MODELS[kind];
  const rings = SLOTS.map((h) => {
    const pts: Pt[] = Array.from({ length: K }, (_, k) => ringPoint(m, h, (k / K) * Math.PI * 2));
    const visible = h < m.H;
    const uw = visible ? solveU(m, h / m.H, Math.PI) : 0.02;
    const ue = visible ? solveU(m, h / m.H, 0) : 0.02;
    return {
      h,
      d: closedPath(pts),
      visible,
      label: ringPoint(m, h, LABEL_T),
      xw: CX - uw * m.R(Math.PI),
      xe: CX + ue * m.R(0),
    };
  });

  const pts: Pt[] = Array.from({ length: PROFILE_N }, (_, i) => {
    const x = SEC_A + ((SEC_B - SEC_A) * i) / (PROFILE_N - 1);
    return [x, PROF_BASE - heightAlongSection(m, x) * Z_SCALE];
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f2(x)},${f2(y)}`).join('');
  const profile = `M${SEC_A},${PROF_BASE}L${line.slice(1)}L${SEC_B},${PROF_BASE}Z`;

  // Cliff convention: short teeth on the downhill side of the merged lines.
  let hachures = '';
  if (kind === 'cliff') {
    for (let t = -0.95; t <= 0.951; t += 0.1) {
      const [x, y] = ringPoint(m, SLOTS[0], t);
      const nx = Math.cos(t);
      const ny = Math.sin(t) * ASPECT;
      const len = Math.hypot(nx, ny);
      hachures += `M${f2(x)},${f2(y)}L${f2(x + (nx / len) * 2.6)},${f2(y + (ny / len) * 2.6)}`;
    }
  }

  return { rings, profile, profileTop: line, hachures };
}

// Precompute once — pure data, identical on server and client.
const GEOMETRY: Record<DensityKind, Geometry> = {
  gentle: buildGeometry('gentle'),
  steep: buildGeometry('steep'),
  cliff: buildGeometry('cliff'),
};
const CLIFF_HACHURES = GEOMETRY.cliff.hachures;

// Band tints: paper → soft olive as we climb (quiet — the LINES are the lesson).
const bandFill = (j: number) => mixHex('#F4ECDA', '#C3C094', j / (SLOTS.length - 1));

export function ContoursShapeMap({
  kind,
  label,
  describedBy,
}: {
  kind: DensityKind;
  label: string;
  describedBy?: string;
}) {
  const reduce = useReducedMotion();
  const geo = GEOMETRY[kind];
  const tr = useMemo(
    () => ({ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const }),
    [reduce],
  );

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="block w-full h-auto select-none"
      role="img"
      aria-label={label}
      aria-describedby={describedBy}
    >
      <defs>
        <linearGradient id="t2-density-profile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A9163" />
          <stop offset="1" stopColor="#6E7A4E" />
        </linearGradient>
        <clipPath id="t2-density-mapclip">
          <rect x="4" y="2" width={VB_W - 8} height={MAP_BOTTOM - 2} rx="4" />
        </clipPath>
      </defs>

      {/* ── MAP (top view) ─────────────────────────────────────────── */}
      <rect x="4" y="2" width={VB_W - 8} height={MAP_BOTTOM - 2} rx="4" fill="#FBF7EF" stroke="#E6DAC2" strokeWidth="0.4" />
      <g clipPath="url(#t2-density-mapclip)">
        {Array.from({ length: 19 }).map((_, i) => (
          <line key={`gx${i}`} x1={10 + i * 10} y1="2" x2={10 + i * 10} y2={MAP_BOTTOM} stroke={GRID} strokeWidth="0.3" />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`gy${i}`} x1="4" y1={8 + i * 10} x2={VB_W - 4} y2={8 + i * 10} stroke={GRID} strokeWidth="0.3" />
        ))}

        {/* band tints, outer (low) first */}
        {geo.rings.map((r, j) => (
          <motion.path
            key={`fill-${r.h}`}
            initial={false}
            animate={{ d: r.d, opacity: r.visible ? 1 : 0 }}
            transition={tr}
            fill={bandFill(j)}
            stroke="none"
          />
        ))}

        {/* contour lines — brown, index (50 m) thicker */}
        {geo.rings.map((r) => (
          <motion.path
            key={`line-${r.h}`}
            initial={false}
            animate={{ d: r.d, opacity: r.visible ? 1 : 0 }}
            transition={tr}
            fill="none"
            stroke={CONTOUR_INK}
            strokeWidth={r.h === INDEX_H ? 0.95 : 0.5}
            strokeLinejoin="round"
          />
        ))}

        {/* cliff hachures (teeth point downhill) */}
        <motion.path
          d={CLIFF_HACHURES}
          initial={false}
          animate={{ opacity: kind === 'cliff' ? 0.9 : 0 }}
          transition={{ duration: reduce ? 0 : 0.35, delay: kind === 'cliff' && !reduce ? 0.45 : 0 }}
          fill="none"
          stroke={CONTOUR_INK}
          strokeWidth="0.45"
          strokeLinecap="round"
        />

        {/* drop-lines: contour crossing on A–B → its height in the profile */}
        {geo.rings.flatMap((r) =>
          (['xw', 'xe'] as const).map((side) => (
            <motion.line
              key={`drop-${r.h}-${side}`}
              initial={false}
              animate={{ x1: r[side], x2: r[side], opacity: r.visible ? 0.55 : 0 }}
              transition={tr}
              y1={CY}
              y2={MAP_BOTTOM}
              stroke={CONTOUR_INK}
              strokeWidth="0.3"
              strokeDasharray="1.2 1.2"
            />
          )),
        )}

        {/* summit */}
        <path d={`M${CX},${CY - 2.2}L${CX + 2},${CY + 1.3}L${CX - 2},${CY + 1.3}Z`} fill="#55613C" />

        {/* section line A–B */}
        <line x1={SEC_A} y1={CY} x2={SEC_B} y2={CY} stroke={INK} strokeWidth="0.55" strokeDasharray="2.4 1.6" />
        {geo.rings.flatMap((r) =>
          (['xw', 'xe'] as const).map((side) => (
            <motion.circle
              key={`cross-${r.h}-${side}`}
              initial={false}
              animate={{ cx: r[side], opacity: r.visible ? 1 : 0 }}
              transition={tr}
              cy={CY}
              r="0.75"
              fill={INK}
            />
          )),
        )}

        {/* contour labels: lowest line + index line (gentle has no 50 m line → its 30 m line) */}
        {geo.rings.map((r) => {
          const show =
            r.visible && (r.h === SLOTS[0] || r.h === INDEX_H || (kind === 'gentle' && r.h === 30));
          return (
            <motion.g
              key={`lbl-${r.h}`}
              initial={false}
              animate={{ x: r.label[0], y: r.label[1], opacity: show ? 1 : 0 }}
              transition={tr}
            >
              <rect x="-5" y="-3.2" width="10" height="6.4" rx="1.8" fill="#FFFDF8" stroke="#D9CBAE" strokeWidth="0.3" />
              <text
                x="0"
                y="0.1"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="4.6"
                fontWeight={700}
                fill={INK}
                className="font-display tabular-nums"
              >
                {r.h}
              </text>
            </motion.g>
          );
        })}
      </g>

      {/* section end markers (outside the clip so they never get cut) */}
      {(
        [
          [SEC_A, 'A'],
          [SEC_B, 'B'],
        ] as const
      ).map(([x, l]) => (
        <g key={l}>
          <circle cx={x} cy={CY} r="3.6" fill="#FFFFFF" stroke={INK} strokeWidth="0.55" />
          <text x={x} y={CY + 0.2} textAnchor="middle" dominantBaseline="central" fontSize="4.2" fontWeight={700} fill={INK} className="font-display">
            {l}
          </text>
        </g>
      ))}

      {/* ── PROFILE (side view along A–B) ─────────────────────────── */}
      <rect x="4" y={PROF_TOP - 6} width={VB_W - 8} height={PROF_BASE - PROF_TOP + 16} rx="4" fill="#F7F0E3" />
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((h) => (
        <g key={`lvl-${h}`}>
          <line
            x1={SEC_A}
            x2={SEC_B}
            y1={PROF_BASE - h * Z_SCALE}
            y2={PROF_BASE - h * Z_SCALE}
            stroke="#E4D7BD"
            strokeWidth={h === INDEX_H ? 0.45 : 0.25}
          />
          {h % 20 === 0 && (
            <text
              x={SEC_A - 2.5}
              y={PROF_BASE - h * Z_SCALE}
              textAnchor="end"
              dominantBaseline="central"
              fontSize="4"
              fill="#8A8873"
              className="font-display tabular-nums"
            >
              {h}
            </text>
          )}
        </g>
      ))}

      {/* drop-lines continue into the profile and stop at their height */}
      {geo.rings.flatMap((r) =>
        (['xw', 'xe'] as const).map((side) => (
          <motion.line
            key={`pdrop-${r.h}-${side}`}
            initial={false}
            animate={{ x1: r[side], x2: r[side], y2: PROF_BASE - r.h * Z_SCALE, opacity: r.visible ? 0.55 : 0 }}
            transition={tr}
            y1={PROF_TOP - 6}
            stroke={CONTOUR_INK}
            strokeWidth="0.3"
            strokeDasharray="1.2 1.2"
          />
        )),
      )}

      {/* papercut terrain slice: soft drop shadow + fill + light top edge */}
      <motion.path initial={false} animate={{ d: geo.profile }} transition={tr} fill="#5A4A33" opacity={0.12} transform="translate(0.8 1.2)" />
      <motion.path initial={false} animate={{ d: geo.profile }} transition={tr} fill="url(#t2-density-profile)" />
      <motion.path
        initial={false}
        animate={{ d: geo.profileTop }}
        transition={tr}
        fill="none"
        stroke="#E8DCC4"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <line x1={SEC_A} x2={SEC_B} y1={PROF_BASE} y2={PROF_BASE} stroke="#55613C" strokeWidth="0.6" />

      {/* profile height points where each contour meets the ground */}
      {geo.rings.flatMap((r) =>
        (['xw', 'xe'] as const).map((side) => (
          <motion.circle
            key={`pt-${r.h}-${side}`}
            initial={false}
            animate={{ cx: r[side], cy: PROF_BASE - r.h * Z_SCALE, opacity: r.visible ? 1 : 0 }}
            transition={tr}
            r="0.8"
            fill="#FFFDF8"
            stroke="#38432E"
            strokeWidth="0.35"
          />
        )),
      )}

      {(
        [
          [SEC_A, 'A'],
          [SEC_B, 'B'],
        ] as const
      ).map(([x, l]) => (
        <text key={`p-${l}`} x={x} y={PROF_BASE + 5.5} textAnchor="middle" dominantBaseline="central" fontSize="4.2" fontWeight={700} fill={INK} className="font-display">
          {l}
        </text>
      ))}
    </svg>
  );
}

/** Mini contour glyph for the terrain-kind tabs (same idea, 24×24). */
export function DensityGlyph({ kind, className }: { kind: DensityKind; className?: string }) {
  const rings =
    kind === 'gentle'
      ? [
          [12, 10],
          [12, 6.2],
          [12, 2.6],
        ]
      : kind === 'steep'
        ? [
            [12, 10],
            [12, 8.2],
            [12, 6.4],
            [12, 4.6],
            [12, 2.8],
          ]
        : [
            [12, 10],
            [13.6, 8.3],
            [15, 6.8],
            [16.2, 5.5],
          ];
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.3" className={className} aria-hidden>
      {rings.map(([cx, r], i) => (
        <ellipse key={i} cx={cx} cy="12" rx={r} ry={r * 0.72} />
      ))}
    </svg>
  );
}
