'use client';

/* The explorer without 3-D (no WebGL, or the globe's images failed to load): the
   same grid flat, in plate carrée — x = lon + 180, y = 90 − lat in a 360 × 180
   viewBox — driven by the same state as the globe (lines, mark, target, miss note),
   so the controls, the tasks and the check keep working; a "find" task's lettered
   choices are buttons on the map. The Blue Marble image underlies it when it loads (it
   is the same projection); otherwise the paper panel shows through. A map, so never
   mirrored for RTL: the box is dir="ltr" and its labels sit by physical position on
   purpose. */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CHOICE_NAMES, fmtLat, fmtLon, type GlobeView, type Signed } from './geoCoords';
import { GLOBE_DIR } from './globeAssets';

const STEP = 30;
const CHIP = 'pointer-events-none absolute whitespace-nowrap rounded-md border border-accent/70 bg-bg-elevated/95 px-2 py-0.5 font-display text-sm font-bold text-black';
const xPct = (lon: number) => ((lon + 180) / 360) * 100;
const yPct = (lat: number) => ((90 - lat) / 180) * 100;
const at = (p: Signed) => ({ left: `${xPct(p.lon)}%`, top: `${yPct(p.lat)}%` });

export function GlobeFlatMap({
  view,
  onChoose,
  disc,
  className,
}: {
  view: GlobeView;
  onChoose?: (i: number) => void;
  /** a choice's look (shared with the globe and the panel) */
  disc: (view: GlobeView, i: number) => string;
  className?: string;
}) {
  const [img, setImg] = useState(true);
  const { sel, target, note } = view;
  return (
    <div dir="ltr" className={cn('relative aspect-[2/1] w-full overflow-hidden rounded-xl border border-border/70 bg-paper-panel', className)}>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${GLOBE_DIR}/earth-color.webp`} alt="" aria-hidden className="absolute inset-0 size-full object-fill" onError={() => setImg(false)} />
      )}
      <svg viewBox="0 0 360 180" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
        {Array.from({ length: 360 / STEP - 1 }, (_, i) => (i + 1) * STEP).map((x) =>
          x === 180 ? null : <line key={`v${x}`} x1={x} y1="0" x2={x} y2="180" className={img ? 'stroke-white/40' : 'stroke-fg/15'} strokeWidth="1" vectorEffect="non-scaling-stroke" />,
        )}
        {Array.from({ length: 180 / STEP - 1 }, (_, i) => (i + 1) * STEP).map((y) =>
          y === 90 ? null : <line key={`h${y}`} x1="0" y1={y} x2="360" y2={y} className={img ? 'stroke-white/40' : 'stroke-fg/15'} strokeWidth="1" vectorEffect="non-scaling-stroke" />,
        )}
        <line x1="0" y1="90" x2="360" y2="90" className="stroke-brand" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <line x1="180" y1="0" x2="180" y2="180" className="stroke-brand" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        {sel && (
          <>
            <line x1="0" y1={90 - sel.lat} x2="360" y2={90 - sel.lat} className="stroke-accent" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            <line x1={sel.lon + 180} y1="0" x2={sel.lon + 180} y2="180" className="stroke-accent" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <span style={{ left: 'calc(50% + 6px)', top: 8 }} className="pointer-events-none absolute rounded-md border border-border/70 bg-bg-elevated/95 px-2 py-0.5 font-display text-sm font-bold text-black shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
        <span dir="rtl">
          גריניץ׳ · <bdi dir="ltr">0°</bdi>
        </span>
      </span>
      <span style={{ left: 8, top: '50%' }} className="pointer-events-none absolute -translate-y-[calc(100%+4px)] rounded-md border border-border/70 bg-bg-elevated/95 px-2 py-0.5 font-display text-sm font-bold text-black shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
        <span dir="rtl">
          קו המשווה · <bdi dir="ltr">0°</bdi>
        </span>
      </span>
      {target && <span aria-hidden className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-fg bg-white/40 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]" style={at(target)} />}
      {view.choices.map((c, i) => (
        <button
          key={i}
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={!onChoose || view.ruled.includes(i)}
          onClick={() => onChoose?.(i)}
          className={cn('absolute -translate-x-1/2 -translate-y-1/2', disc(view, i))}
          style={at(c)}
        >
          {CHOICE_NAMES[i]}
        </button>
      ))}
      {sel && (
        <>
          <span aria-hidden className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-accent shadow-[0_1px_4px_rgba(40,50,35,0.45)]" style={at(sel)} />
          {/* the values on their own lines: latitude on the parallel, longitude on the meridian */}
          <span className={cn(CHIP, '-translate-y-1/2', sel.lon > 120 ? '-translate-x-[calc(100%+14px)]' : 'translate-x-3.5')} style={at(sel)}>
            {fmtLat(sel.lat)}
          </span>
          <span className={cn(CHIP, '-translate-x-1/2', sel.lat > 60 ? 'translate-y-3.5' : '-translate-y-[calc(100%+14px)]')} style={at(sel)}>
            {fmtLon(sel.lon)}
          </span>
        </>
      )}
      {note && (
        <span dir="rtl" className={cn(CHIP, 'border-fg/50 translate-y-3', note.at.lon > 120 ? '-translate-x-full' : '')} style={at(note.at)}>
          {note.text}
        </span>
      )}
    </div>
  );
}
