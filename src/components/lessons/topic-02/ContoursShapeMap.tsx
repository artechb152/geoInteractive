'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import {
  CX,
  CY,
  GEOMETRY,
  INDEX_H,
  PROF_BASE,
  SEC_A,
  SEC_B,
  SLOTS,
  Z_SCALE,
  blendTerrain,
  closedPath,
  type DensityKind,
  type Pt,
  type Weights,
} from './contourDensityGeometry';

export type { DensityKind } from './contourDensityGeometry';
export const DENSITY_ASSET_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/contour-density`;

const INK = '#38432E';
const CONTOUR_INK = '#8A6F4D'; // brown map ink (= tanline.badge)
const LEVEL_INK = '#C9A56B'; // tanline.contour
const EASE = [0.22, 1, 0.36, 1] as const;

// Profile board: a cut slab of layered rock whose top edge is the A–B ground line.
const SLAB_BOTTOM = PROF_BASE + 5;
const TEX_Y = 124; // limestone texture spans the whole profile board (1152 × 384 → 200 × 66.67)
const py = (h: number) => PROF_BASE - h * Z_SCALE;
const f2 = (n: number) => n.toFixed(2);

/**
 * "זיהוי תנאי שטח לפי צפיפות" — contour map + A–B cross-section, one live model.
 *
 * The map rings and the profile below come from the same height model
 * (contourDensityGeometry). Dashed drop-lines run from every contour crossing
 * on A–B straight down to that contour's height on the ground line — the
 * classic "profile from contours" construction — so line SPACING on the map
 * reads as SLOPE in the profile. Switching kinds tweens the mix of height
 * models (blendTerrain), and every frame is re-derived from that one surface:
 * rings spread, pack or merge while the hill rises, falls or breaks into a
 * cliff under them, and the drop-lines never leave the terrain.
 *
 * The profile is a papercut slab in the slope boards' look (LandformsScene):
 * horizontal limestone strata fixed in space (the hill is carved from them),
 * topsoil and scrub on every walkable stretch, bare rock where it's too steep.
 *
 * Diagram — never mirrored for RTL; every <text> sets textAnchor.
 */

/** Resting states: one height model each. */
const AT_REST: Record<DensityKind, Weights> = {
  gentle: { gentle: 1, steep: 0, cliff: 0 },
  steep: { gentle: 0, steep: 1, cliff: 0 },
  cliff: { gentle: 0, steep: 0, cliff: 1 },
};
const KINDS = Object.keys(AT_REST) as DensityKind[];

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const mixWeights = (a: Weights, b: Weights, p: number): Weights => ({
  gentle: mix(a.gentle, b.gentle, p),
  steep: mix(a.steep, b.steep, p),
  cliff: mix(a.cliff, b.cliff, p),
});

// Elevation labels: the lowest line + the index line (gentle has no 50 m line → its 30 m line).
const labelled = (kind: DensityKind, h: number) => h === SLOTS[0] || h === (kind === 'gentle' ? 30 : INDEX_H);

/** Tweens the model mix from whatever is on screen, so a click mid-morph carries on smoothly. */
function useDensityMorph(kind: DensityKind): Weights {
  const reduce = useReducedMotion();
  const [weights, setWeights] = useState(() => AT_REST[kind]);
  const shown = useRef(weights);

  useEffect(() => {
    const from = shown.current;
    const to = AT_REST[kind];
    const commit = (w: Weights) => {
      shown.current = w;
      setWeights(w);
    };
    if (from === to) return;
    if (reduce) {
      commit(to);
      return;
    }
    const controls = animate(0, 1, {
      duration: 0.7,
      ease: EASE,
      onUpdate: (p) => commit(p >= 1 ? to : mixWeights(from, to, p)),
    });
    return () => controls.stop();
  }, [kind, reduce]);

  return weights;
}

/** Ground line in board units, framed by flat ground out to A and B. */
function groundLine(section: Pt[]): Pt[] {
  return [
    [SEC_A, PROF_BASE],
    ...section.map(([x, h]): Pt => [Math.min(SEC_B, Math.max(SEC_A, x)), py(h)]),
    [SEC_B, PROF_BASE],
  ];
}

/** Ground height at x (the line is x-monotone). */
function groundY(line: Pt[], x: number) {
  let lo = 0;
  let hi = line.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (line[mid][0] <= x) lo = mid;
    else hi = mid;
  }
  const [x0, y0] = line[lo];
  const [x1, y1] = line[hi];
  return x1 - x0 < 1e-6 ? Math.min(y0, y1) : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

// Soil and scrub cling to anything gentler than this (board rise / run); steeper is bare rock.
const BARE_ROCK = 2.2;

/** The walkable stretches of the ground line, as one multi-run path. */
function soilRuns(line: Pt[]) {
  let d = '';
  let open = false;
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1];
    const [x1, y1] = line[i];
    const dx = x1 - x0;
    const dy = Math.abs(y1 - y0);
    if (dx < 1e-6 && dy < 1e-6) continue; // levels stacked on the summit
    if (dy <= BARE_ROCK * dx) {
      if (!open) d += `M${f2(x0)},${f2(y0)}`;
      d += `L${f2(x1)},${f2(y1)}`;
      open = true;
    } else open = false;
  }
  return d;
}

// Scrub: fixed x positions (seeded jitter) that ride the ground as it morphs.
const SCRUB = Array.from({ length: 46 }, (_, i) => {
  const rand = (n: number) => {
    const s = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  return { x: SEC_A + 2 + i * 3.6 + (rand(1) - 0.5) * 2.2, s: 0.75 + rand(2) * 0.55, flip: rand(3) > 0.5 ? 1 : -1 };
});

export function ContoursShapeMap({
  kind,
  label,
  describedBy,
}: {
  kind: DensityKind;
  label: string;
  describedBy?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const weights = useDensityMorph(kind);
  const terrain = useMemo(() => blendTerrain(weights), [weights]);
  const labelOn = (h: number) => KINDS.reduce((sum, k) => sum + (labelled(k, h) ? weights[k] : 0), 0);
  const line = groundLine(terrain.section);
  const ground = line.map(([x, y], i) => `${i ? 'L' : 'M'}${f2(x)},${f2(y)}`).join('');
  const slab = `M${SEC_A},${SLAB_BOTTOM}L${ground.slice(1)}L${SEC_B},${SLAB_BOTTOM}Z`;
  const soil = soilRuns(line);

  return (
    <svg
      viewBox="0 0 200 190"
      className="block w-full h-auto select-none"
      role="img"
      aria-label={label}
      aria-describedby={describedBy}
    >
      <defs>
        <pattern id={`${uid}-rock`} patternUnits="userSpaceOnUse" x="0" y={TEX_Y} width="200" height="66.67">
          <image href={`${DENSITY_ASSET_BASE}/limestone-section.webp`} width="200" height="66.67" preserveAspectRatio="none" />
        </pattern>
        <linearGradient id={`${uid}-depth`} gradientUnits="userSpaceOnUse" x1="0" y1={py(90)} x2="0" y2={SLAB_BOTTOM}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.12" />
          <stop offset="1" stopColor={INK} stopOpacity="0.16" />
        </linearGradient>
        <clipPath id={`${uid}-slab`}>
          <path d={slab} />
        </clipPath>
      </defs>

      <rect width="200" height="119" rx="4" fill="#F6EFE6" />
      <rect y="123" width="200" height="67" rx="4" fill="#F6EFE6" />

      {/* ── MAP (top view) ─────────────────────────────────────────── */}
      <rect x="2" y="2" width="196" height="114" rx="3" fill="#F8F2E7" stroke="#DCCDB2" strokeWidth="0.35" />
      <g stroke="#DCCDB2" strokeWidth="0.3" opacity="0.55">
        {[20, 40, 60, 80, 100, 120, 140, 160, 180].map((x) => <path key={x} d={`M${x} 3V115`} />)}
        {[18, 38, 58, 78, 98].map((y) => <path key={y} d={`M3 ${y}H197`} />)}
      </g>
      {terrain.rings.map((r) => (
        <path
          key={r.h}
          d={closedPath(r.pts)}
          fill="none"
          stroke={CONTOUR_INK}
          strokeWidth={r.h === INDEX_H ? 1 : 0.5}
          strokeLinejoin="round"
          opacity={r.on}
        />
      ))}
      {/* cliff teeth arrive once the merged lines have settled under them */}
      <path d={GEOMETRY.cliff.hachures} fill="none" stroke={CONTOUR_INK} strokeWidth="0.65" opacity={weights.cliff ** 3} />
      <path d={`M${SEC_A} ${CY}H${SEC_B}`} fill="none" stroke={INK} strokeWidth="0.55" strokeDasharray="2.4 1.6" />

      {/* ── PROFILE (side view along A–B) ─────────────────────────── */}
      {SLOTS.map((h) => (
        <line
          key={h}
          x1={SEC_A}
          x2={SEC_B}
          y1={py(h)}
          y2={py(h)}
          stroke={LEVEL_INK}
          strokeOpacity="0.7"
          strokeWidth={h === INDEX_H ? 0.4 : 0.28}
          strokeDasharray="1.4 1.2"
        />
      ))}
      {[20, 40, 60, 80].map((h) => (
        <text key={h} x={SEC_A - 3} y={py(h)} textAnchor="end" dominantBaseline="central" fontSize="4" fill="#8A8873" className="font-display tabular-nums">
          {h}
        </text>
      ))}

      <rect x={SEC_A + 0.6} y={SLAB_BOTTOM} width={SEC_B - SEC_A - 1.2} height="1.4" rx="0.7" fill="#5A4A33" opacity="0.14" />
      <path d={slab} fill="#C9B892" />
      <path d={slab} fill={`url(#${uid}-rock)`} />
      <path d={slab} fill={`url(#${uid}-depth)`} />
      {/* topsoil under the walkable ground, a papercut edge everywhere, grass on top */}
      <path d={soil} fill="none" stroke={CONTOUR_INK} strokeOpacity="0.85" strokeWidth="2.4" strokeLinejoin="round" clipPath={`url(#${uid}-slab)`} />
      <path d={ground} fill="none" stroke="#E8DCC4" strokeWidth="0.35" strokeLinejoin="round" />
      <path d={soil} fill="none" stroke="#8A9163" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
      {SCRUB.map(({ x, s, flip }, i) => {
        const y = groundY(line, x);
        const rise = Math.abs(groundY(line, x + 1.5) - groundY(line, x - 1.5)) / 3;
        const on = Math.min(1, Math.max(0, (BARE_ROCK - rise) / 1.2));
        if (on <= 0) return null;
        return (
          <g key={i} opacity={on}>
            <circle cx={x} cy={y - s * 0.5} r={s} fill="#55613C" />
            <circle cx={x + flip * s * 0.75} cy={y - s * 0.3} r={s * 0.7} fill="#6E7A4E" />
            <circle cx={x - flip * s * 0.25} cy={y - s * 0.85} r={s * 0.42} fill="#8A9163" />
          </g>
        );
      })}

      {/* drop-lines: each contour crossing on A–B falls to its height on the ground */}
      {terrain.rings.flatMap((r) =>
        [r.xw, r.xe].map((x, side) => (
          <line
            key={`drop-${r.h}-${side}`}
            x1={x}
            x2={x}
            y1={CY}
            y2={py(r.h)}
            stroke={CONTOUR_INK}
            strokeWidth="0.3"
            strokeDasharray="1.2 1.2"
            opacity={0.55 * r.on}
          />
        )),
      )}

      {/* map crossings, contour labels, summit, section ends */}
      {terrain.rings.flatMap((r) =>
        [r.xw, r.xe].map((x, side) => <circle key={`cross-${r.h}-${side}`} cx={x} cy={CY} r="0.75" fill={INK} opacity={r.on} />),
      )}
      {terrain.rings.map((r) => (
        <g key={r.h} transform={`translate(${f2(r.label[0])} ${f2(r.label[1])})`} opacity={labelOn(r.h) * r.on}>
          <rect x="-4" y="-3" width="8" height="6" rx="1" fill="#F8F2E7" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="4.6" fontWeight={700} fill={CONTOUR_INK} className="font-display tabular-nums">
            {r.h}
          </text>
        </g>
      ))}
      <circle cx={CX} cy={CY} r="0.9" fill={INK} />
      {[SEC_A, SEC_B].map((x, i) => (
        <g key={x} transform={`translate(${x} ${CY})`}>
          <circle r="3.6" fill="#FFFFFF" stroke={INK} strokeWidth="0.55" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="4.2" fontWeight={700} fill={INK} className="font-display">
            {i === 0 ? 'A' : 'B'}
          </text>
        </g>
      ))}

      {/* profile points: where each contour meets the ground */}
      {terrain.rings.flatMap((r) =>
        [r.xw, r.xe].map((x, side) => (
          <circle key={`pt-${r.h}-${side}`} cx={x} cy={py(r.h)} r="1" fill="#FFFDF8" stroke={INK} strokeWidth="0.35" opacity={r.on} />
        )),
      )}
      {[SEC_A, SEC_B].map((x, i) => (
        <text key={x} x={x} y={SLAB_BOTTOM + 4.6} textAnchor="middle" dominantBaseline="central" fontSize="4.2" fontWeight={700} fill={INK} className="font-display">
          {i === 0 ? 'A' : 'B'}
        </text>
      ))}
    </svg>
  );
}

/** Flat cartography glyph for the terrain-kind tabs. */
function TopographicPlate({ kind }: { kind: DensityKind }) {
  const rings = GEOMETRY[kind].rings.filter((ring) => ring.visible);
  return (
    <g>
      <rect x="2" y="2" width="196" height="114" rx="3" fill="#F8F2E7" stroke="#DCCDB2" strokeWidth="0.35" />
      {rings.map((ring) => (
        <path key={ring.h} d={ring.d} fill="none" stroke={CONTOUR_INK} strokeWidth="1.8" strokeLinejoin="round" />
      ))}
      {kind === 'cliff' && <path d={GEOMETRY[kind].hachures} fill="none" stroke={CONTOUR_INK} strokeWidth="0.65" />}
    </g>
  );
}

export function ContourMapThumbnail({ kind }: { kind: DensityKind }) {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true" className="h-10 w-16 rounded-lg">
      <TopographicPlate kind={kind} />
    </svg>
  );
}
