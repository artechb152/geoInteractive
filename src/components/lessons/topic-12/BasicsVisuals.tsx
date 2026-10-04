'use client';

/**
 * Topic-12 · 12.1 — illustrations for the attribute-table query and the
 * "local vs network" architecture cards.
 *
 * QueryBlocks draws the 4 buildings of the attribute table as isometric
 * blocks. Each block's height comes from the table's "גובה (מ׳)" column, so
 * the attribute literally shapes the geometry. Footprints and layout are
 * illustrative; heights are ×1.3 so the 4–15 m spread reads at this size.
 */

import { cn } from '@/lib/utils';

export type QueryBuilding = { id: number; height: number };

// Footprints in metres on a 64 × 46 m plot (x → east-south-east, y → south-west).
const FOOTPRINTS: Record<number, { x: number; y: number; w: number; d: number }> = {
  1: { x: 4, y: 5, w: 14, d: 11 },
  2: { x: 27, y: 3, w: 30, d: 14 },
  3: { x: 5, y: 29, w: 16, d: 13 },
  4: { x: 31, y: 30, w: 27, d: 11 },
};
const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const KZ = 1.3;
const iso = (x: number, y: number, z = 0): [number, number] => [(x - y) * COS, (x + y) * SIN - z * KZ];
const pts = (...p: [number, number][]) => p.map((q) => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(' ');

export function QueryBlocks({
  buildings,
  selected,
  onSelect,
}: {
  buildings: QueryBuilding[];
  selected: Set<number>;
  onSelect: (id: number | null) => void;
}) {
  const order = [...buildings].sort((a, b) => {
    const fa = FOOTPRINTS[a.id], fb = FOOTPRINTS[b.id];
    return fa.x + fa.y + (fa.w + fa.d) / 2 - (fb.x + fb.y + (fb.w + fb.d) / 2);
  });
  const plot = { w: 64, d: 46 };
  return (
    <svg viewBox="-46 -16 108 73" className="block h-full w-full" aria-hidden onClick={() => onSelect(null)}>
      {/* ground plot + the street between the two rows */}
      <polygon points={pts(iso(0, 0), iso(plot.w, 0), iso(plot.w, plot.d), iso(0, plot.d))} className="fill-bg-accent stroke-border" strokeWidth="0.3" />
      <polygon points={pts(iso(0, 22), iso(plot.w, 22), iso(plot.w, 26), iso(0, 26))} className="fill-border-subtle" />
      {order.map((b) => {
        const f = FOOTPRINTS[b.id];
        const h = b.height;
        const on = selected.has(b.id);
        const top = pts(iso(f.x, f.y, h), iso(f.x + f.w, f.y, h), iso(f.x + f.w, f.y + f.d, h), iso(f.x, f.y + f.d, h));
        const front = pts(iso(f.x, f.y + f.d, h), iso(f.x + f.w, f.y + f.d, h), iso(f.x + f.w, f.y + f.d, 0), iso(f.x, f.y + f.d, 0));
        const side = pts(iso(f.x + f.w, f.y, h), iso(f.x + f.w, f.y + f.d, h), iso(f.x + f.w, f.y + f.d, 0), iso(f.x + f.w, f.y, 0));
        const c = iso(f.x + f.w / 2, f.y + f.d / 2, h);
        return (
          <g
            key={b.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(b.id);
            }}
            className="cursor-pointer"
          >
            {/* opaque body first, so tinted faces never show the street through them */}
            <g className="fill-paper-bright">
              <polygon points={front} />
              <polygon points={side} />
              <polygon points={top} />
            </g>
            <g strokeLinejoin="round" strokeWidth="0.3" className={cn('transition-colors duration-300', on ? 'stroke-ember-deep' : 'stroke-fg-muted/60')}>
              <polygon points={front} className={cn('transition-colors duration-300', on ? 'fill-accent/60' : 'fill-border')} />
              <polygon points={side} className={cn('transition-colors duration-300', on ? 'fill-accent/80' : 'fill-border-strong/70')} />
              <polygon points={top} className={cn('transition-colors duration-300', on ? 'fill-accent/30' : 'fill-paper-bright')} />
            </g>
            <circle cx={c[0]} cy={c[1]} r="3.1" className={on ? 'fill-bg-elevated stroke-accent' : 'fill-bg-elevated'} strokeWidth="0.7" />
            <text x={c[0]} y={c[1] + 1.45} textAnchor="middle" fontSize="4.1" className="font-display font-bold tabular-nums fill-fg">
              {b.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Local: one workstation, files on its own disk — nothing leaves it. */
export function LocalSchematic() {
  return (
    <svg viewBox="0 0 96 56" className="block h-14 w-24 shrink-0" aria-hidden>
      <g fill="none" className="stroke-fg-muted" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        <rect x="30" y="8" width="36" height="25" rx="3" />
        <path d="M48 33v7M38 44h20" />
      </g>
      <polyline points="35,27 42,20 49,24 56,15 61,19" fill="none" className="stroke-brand-dark" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {/* the file, on the same machine */}
      <g className="stroke-fg-muted" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M72 30h10l4 4v14H72Z" className="fill-bg-elevated" />
        <path d="M82 30v4h4" fill="none" />
      </g>
    </svg>
  );
}

/** Network: one spatial database, two workstations on the same layer. */
export function NetworkSchematic() {
  const screen = (x: number) => (
    <g key={x}>
      <rect x={x} y="10" width="26" height="18" rx="2.5" fill="none" className="stroke-fg-muted" strokeWidth="1.5" />
      <path d={`M${x + 13} 28v5M${x + 7} 36h12`} fill="none" className="stroke-fg-muted" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points={`${x + 4},24 ${x + 9},18 ${x + 14},21 ${x + 19},14 ${x + 22},17`} fill="none" className="stroke-brand-dark" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 120 56" className="block h-14 w-[120px] shrink-0" aria-hidden>
      <path d="M17 36v8h86v-8M60 44v-4" fill="none" className="stroke-brand-dark" strokeWidth="1.5" strokeLinejoin="round" />
      {screen(4)}
      {screen(90)}
      {/* the central DB */}
      <g className="stroke-fg-muted" strokeWidth="1.5">
        <path d="M49 14v20c0 3 22 3 22 0V14" className="fill-bg-elevated" />
        <ellipse cx="60" cy="14" rx="11" ry="3.4" className="fill-bg-elevated" />
        <path d="M49 21c0 3 22 3 22 0M49 28c0 3 22 3 22 0" fill="none" />
      </g>
    </svg>
  );
}
