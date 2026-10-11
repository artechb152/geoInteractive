'use client';

/* ─────────────── דאטום — overlays above the 3-D globe ───────────────
   Label chips, their leader lines, and the close-up's tangent leaders. The
   markup is static React; DatumGlobe3D moves the line ends every rendered
   frame through these refs (projected 3-D anchors, no per-frame re-render)
   and hides a label whose anchor is hidden. Kept out of DatumGlobe3D so the
   lesson bundle does not load three.js before the stage scrolls into view.

   Positions are the mockup's (01-guided-3d-site-palette.png): physical
   left/right inside the illustration, never mirrored for RTL. */

import { createRef, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { Surface } from './datumDemo';

export type ChipId = Surface;
export const CHIP_IDS: ChipId[] = ['surface', 'geoid', 'ellipsoid'];

/** The close-up's fixed slot in the stage (px): lower left, beside the globe. */
export const INSET = { size: 188, left: 0, bottom: 10 } as const;
export const MARKER_R = 17;

export const CHIP_POS: Record<ChipId, { left?: number; right?: number; top: number }> = {
  surface: { left: 92, top: 18 },
  ellipsoid: { right: 6, top: 228 },
  geoid: { right: 6, top: 300 },
};

export const CHIP_COLOR: Record<ChipId, string> = {
  surface: '#38432E', // fg
  geoid: '#5B9DD9', // accent.cool
  ellipsoid: '#D97E2B', // accent
};

export type OverlayRefs = {
  stage: RefObject<HTMLDivElement | null>;
  chips: Record<ChipId, RefObject<HTMLSpanElement | null>>;
  leaders: Record<ChipId, RefObject<SVGLineElement | null>>;
  dots: Record<ChipId, RefObject<SVGCircleElement | null>>;
  marker: RefObject<HTMLDivElement | null>;
  insetLeaders: [RefObject<SVGLineElement | null>, RefObject<SVGLineElement | null>];
};

export function makeOverlayRefs(stage: RefObject<HTMLDivElement | null>): OverlayRefs {
  const per = <T,>() => ({ surface: createRef<T>(), geoid: createRef<T>(), ellipsoid: createRef<T>() }) as Record<ChipId, RefObject<T | null>>;
  return {
    stage,
    chips: per<HTMLSpanElement>(),
    leaders: per<SVGLineElement>(),
    dots: per<SVGCircleElement>(),
    marker: createRef<HTMLDivElement>(),
    insetLeaders: [createRef<SVGLineElement>(), createRef<SVGLineElement>()],
  };
}

export function GlobeOverlays({ refs, surface, labels }: { refs: OverlayRefs; surface: Surface; labels: Record<ChipId, string> }) {
  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
        {CHIP_IDS.map((id) => (
          <g key={id} opacity={surface === id ? 1 : 0.6}>
            <line ref={refs.leaders[id]} stroke={CHIP_COLOR[id]} strokeWidth={1.5} style={{ opacity: 0, transition: 'opacity 150ms' }} />
            <circle ref={refs.dots[id]} r={5} fill={CHIP_COLOR[id]} stroke="#FFFFFF" strokeWidth={2} style={{ opacity: 0, transition: 'opacity 150ms' }} />
          </g>
        ))}
        {refs.insetLeaders.map((r, i) => (
          <line key={i} ref={r} stroke="#8A8873" strokeWidth={1.5} strokeDasharray="4 4" style={{ opacity: 0 }} />
        ))}
      </svg>
      {CHIP_IDS.map((id) => {
        const pos = CHIP_POS[id];
        return (
          <span
            key={id}
            ref={refs.chips[id]}
            aria-hidden
            className={cn(
              'pointer-events-none absolute whitespace-nowrap rounded-full border-2 bg-bg-elevated px-3 py-0.5 font-display text-base font-bold leading-normal text-fg shadow-pill-soft transition-opacity duration-150 motion-reduce:transition-none',
            )}
            style={{ borderColor: CHIP_COLOR[id], top: pos.top, opacity: 0, ...(pos.left !== undefined ? { left: pos.left } : { right: pos.right }) }}
          >
            {labels[id]}
          </span>
        );
      })}
    </>
  );
}
