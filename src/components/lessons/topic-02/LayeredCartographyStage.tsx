'use client';

import { cn } from '@/lib/utils';

/**
 * LayeredCartographyStage — shared "same terrain, different layer" primitives
 * for topic-02 (cartography). One canonical hill silhouette (elevation
 * expressed as 10 m contour intervals — the fixed interval the lesson's own
 * glossary states for IDF maps) backs the topo view in TopographyScene, the
 * zoom/scale preview in ScaleScene, and both the 2D and 3D renderings in
 * ContoursScene, so the same landform reads as "one place, several
 * representations" rather than four unrelated illustrations.
 */

export type Steepness = 'gentle' | 'mixed' | 'steep' | 'cliff';

export type ContourRing = {
  /** elevation this contour represents, meters (fixed 10 m interval) */
  h: number;
  /** radii in the shared terrain domain */
  rx: number;
  ry: number;
  /** optional center override — used by `cliff` for an eccentric brink */
  cx?: number;
  cy?: number;
};

export const TERRAIN_DOMAIN = { w: 100, h: 75, cx: 50, cy: 38 } as const;

/**
 * Canonical ring sets, one per steepness. Same domain (100×75, peak at
 * 50,38) for all four, so swapping between them is a genuine "reshape the
 * same hill" transition, not a cut to an unrelated picture. `mixed` is the
 * neutral default used where a scene needs "a hill" without teaching
 * steepness specifically (Topography's topo view, Scale's map preview).
 */
export const STEEPNESS_RINGS: Record<Steepness, ContourRing[]> = {
  gentle: [
    { h: 10, rx: 38, ry: 26 },
    { h: 20, rx: 28, ry: 19 },
    { h: 30, rx: 18, ry: 12 },
    { h: 40, rx: 8, ry: 5 },
  ],
  mixed: [
    { h: 10, rx: 35, ry: 24 },
    { h: 20, rx: 28, ry: 19 },
    { h: 30, rx: 22, ry: 15 },
    { h: 40, rx: 16, ry: 11 },
    { h: 50, rx: 10, ry: 7 },
    { h: 60, rx: 5, ry: 4 },
  ],
  steep: [
    { h: 10, rx: 36, ry: 26 },
    { h: 20, rx: 32, ry: 22 },
    { h: 30, rx: 28, ry: 19 },
    { h: 40, rx: 24, ry: 16 },
    { h: 50, rx: 20, ry: 13 },
    { h: 60, rx: 16, ry: 11 },
    { h: 70, rx: 12, ry: 8 },
    { h: 80, rx: 8, ry: 5 },
    { h: 90, rx: 4, ry: 3 },
  ],
  cliff: [
    { h: 10, rx: 38, ry: 26 },
    { h: 20, rx: 32, ry: 23 },
    { h: 30, rx: 26, ry: 20 },
    { h: 40, rx: 22, ry: 17, cx: 52 },
    { h: 50, rx: 21, ry: 16, cx: 53 },
    { h: 60, rx: 20, ry: 16, cx: 54 },
  ],
};

/** Discrete elevation → fill-class ramp (sand → ridge → olive), by relative position in the ring stack. */
export function elevationFillClass(i: number, n: number): string {
  const t = n <= 1 ? 1 : i / (n - 1);
  if (t < 0.4) return 'fill-terrain-sand';
  if (t < 0.8) return 'fill-terrain-ridge';
  return 'fill-terrain-olive';
}

export function elevationOpacity(i: number, n: number): number {
  const t = n <= 1 ? 1 : i / (n - 1);
  return 0.45 + t * 0.5;
}

function hexLerp(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

/** Continuous hex ramp for the 3D material (same sand → olive family as `elevationFillClass`). */
export function elevationColorHex(i: number, n: number): string {
  const t = n <= 1 ? 1 : i / (n - 1);
  return hexLerp('#d8bd83', '#5a6b4a', t);
}

/** Evenly subsample a ring stack down to `count` rings, always keeping the outermost and the peak. Used to show "what disappears" at a lower map scale — same hill, fewer lines. */
export function sampleRings(rings: ContourRing[], count: number): ContourRing[] {
  if (count >= rings.length) return rings;
  if (count <= 1) return [rings[rings.length - 1]];
  const picked: ContourRing[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (rings.length - 1)) / (count - 1));
    picked.push(rings[idx]);
  }
  return picked.filter((r, i, arr) => i === 0 || r !== arr[i - 1]);
}

type TerrainMapProps = {
  rings: ContourRing[];
  cx?: number;
  cy?: number;
  domain?: { w: number; h: number };
  activeRing?: number | null;
  onRingChange?: (i: number | null) => void;
  showGrid?: boolean;
  showFill?: boolean;
  showLabels?: boolean;
  /** show a height label every Nth ring (plus the peak) — avoids crowding on many-ring stacks (e.g. `steep`) */
  labelEvery?: number;
  peakMarker?: boolean;
  interactive?: boolean;
  className?: string;
};

/**
 * Generic top-down contour map. Rings are ordered outer(lowest)→inner
 * (peak). Hover AND keyboard focus drive the same `onRingChange` callback
 * so mouse, touch and keyboard all reach the same highlight state.
 */
export function TerrainMap({
  rings,
  cx = TERRAIN_DOMAIN.cx,
  cy = TERRAIN_DOMAIN.cy,
  domain = TERRAIN_DOMAIN,
  activeRing = null,
  onRingChange,
  showGrid = true,
  showFill = true,
  showLabels = true,
  labelEvery = 1,
  peakMarker = true,
  interactive = true,
  className,
}: TerrainMapProps) {
  const n = rings.length;
  return (
    <svg
      viewBox={`0 0 ${domain.w} ${domain.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn('w-full h-full select-none', className)}
    >
      <rect x="0" y="0" width={domain.w} height={domain.h} className="fill-bg" />

      {showGrid &&
        Array.from({ length: 11 }).map((_, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={(i * domain.w) / 10} y1="0" x2={(i * domain.w) / 10} y2={domain.h}
              className="stroke-border-subtle/30" strokeWidth="0.1"
            />
            <line
              x1="0" y1={(i * domain.h) / 10} x2={domain.w} y2={(i * domain.h) / 10}
              className="stroke-border-subtle/30" strokeWidth="0.1"
            />
          </g>
        ))}

      {showFill &&
        rings.map((r, i) => {
          const isActive = activeRing === i;
          return (
            <ellipse
              key={`band-${i}`}
              cx={r.cx ?? cx} cy={r.cy ?? cy} rx={r.rx} ry={r.ry}
              className={cn('transition-[fill,opacity] duration-300', isActive ? 'fill-accent/30' : elevationFillClass(i, n))}
              style={{ opacity: isActive ? 0.9 : elevationOpacity(i, n) }}
            />
          );
        })}

      {rings.map((r, i) => {
        const isActive = activeRing === i;
        const isLabeled = showLabels && (i % labelEvery === 0 || i === n - 1 || isActive);
        return (
          <g
            key={`ring-${i}`}
            tabIndex={interactive ? 0 : -1}
            role={interactive ? 'button' : undefined}
            aria-label={interactive ? `קו גובה ${r.h} מטר` : undefined}
            onMouseEnter={() => onRingChange?.(i)}
            onMouseLeave={() => onRingChange?.(null)}
            onFocus={() => onRingChange?.(i)}
            onBlur={() => onRingChange?.(null)}
            className={cn(
              interactive &&
                'cursor-crosshair outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
            )}
          >
            {interactive && (
              <ellipse cx={r.cx ?? cx} cy={r.cy ?? cy} rx={r.rx + 3} ry={r.ry + 3} fill="transparent" />
            )}
            <ellipse
              cx={r.cx ?? cx} cy={r.cy ?? cy} rx={r.rx} ry={r.ry}
              fill="none" stroke="currentColor"
              strokeWidth={isActive ? 0.9 : 0.3}
              className={cn('transition-colors', isActive ? 'text-accent' : 'text-terrain-olive/70')}
            />
            {isLabeled && (
              <text
                x={r.cx ?? cx} y={(r.cy ?? cy) - r.ry - 1.2} textAnchor="middle" direction="ltr"
                className={cn('text-[2.6px] font-display font-bold tabular-nums', isActive ? 'fill-accent' : 'fill-fg-dim')}
                paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round"
              >
                {r.h}
              </text>
            )}
          </g>
        );
      })}

      {peakMarker && <circle cx={cx} cy={cy} r="0.6" className="fill-accent" />}
    </svg>
  );
}
