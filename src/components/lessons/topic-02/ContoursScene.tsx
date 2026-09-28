'use client';

import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { SceneHeader } from './SceneHeader';
import { ContoursDensitySection } from './ContoursDensitySection';
import { cn } from '@/lib/utils';
import type { MountainView } from './ContourCake3D';
import { MOUNTAIN } from './contourMountain.data';
import { ACCENT, BAND_COLORS, CONTOUR_INK, INDEX_LEVEL_M } from './contourMountainStyle';

const ContourCake3D = dynamic(() => import('./ContourCake3D'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video sm:aspect-square max-h-[340px] w-full mx-auto flex items-center justify-center text-fg-dim text-sm">
      טוען מודל תלת־ממד…
    </div>
  ),
});

const VIEWS: { id: MountainView; label: string; caption: string }[] = [
  {
    id: 'whole',
    label: 'הר שלם',
    caption: 'כך ההר נראה בשטח. כל קו כהה על המדרון מחבר נקודות שנמצאות באותו גובה בדיוק.',
  },
  {
    id: 'sliced',
    label: 'פריסה לשכבות',
    caption: 'חתכנו את ההר כל 10 מטרים. הרימו שכבה ותראו: השפה של כל פרוסה היא בדיוק קו גובה.',
  },
  {
    id: 'top',
    label: 'מבט מלמעלה',
    caption: 'מלמעלה הגובה נעלם ונשארים רק הקווים. זו בדיוק המפה.',
  },
];

// The density section's data (SHAPES), tabs, map and glossary moved verbatim
// into ContoursDensitySection.tsx / ContoursShapeMap.tsx.

export function ContoursScene() {
  const [activeRing, setActiveRing] = useState<number | null>(null);
  const [view, setView] = useState<MountainView>('whole');
  const viewInfo = VIEWS.find((v) => v.id === view)!;

  return (
    <section id="scene-contours" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.4"
        title="לפצח את השטח: איך פורסים הר תלת-ממדי לקווים שאפשר לקרוא?"
               intro="האתגר הכי גדול במפה הוא להבין איך השטח נראה במציאות. הרי המפה היא דף שטוח, אבל העולם הוא תלת-ממדי. כדי לפתור את זה, אנחנו משתמשים בשיטה חכמה: קווי גובה. דמיינו שחתכנו את ההר לפרוסות אופקיות (כמו עוגת קומות). כל קו שתראו במפה הוא פשוט הקצה של פרוסה כזו."
      />

      <div className="surface-elevated p-6 lg:p-8 mb-6">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-3">
            <div className="text-sm font-display font-semibold text-fg-muted">
              מבט תלת־ממדי · ההר כעוגת פרוסות
            </div>
            <div className="p-4">
              <ContourCake3D view={view} activeRing={activeRing} setActiveRing={setActiveRing} />
            </div>
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="אופן הצגת ההר">
              {VIEWS.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={view === v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    'rounded-xl border px-3.5 py-2 font-display font-bold text-sm text-fg transition-colors duration-200 ease-snap cursor-pointer flex items-center gap-2',
                    view === v.id
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  )}
                >
                  <span
                    className={cn(
                      'size-6 rounded-full text-[13px] tabular-nums flex items-center justify-center transition-colors duration-200',
                      view === v.id ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  {v.label}
                </button>
              ))}
            </div>
            <p className="text-base text-fg leading-relaxed text-center min-h-[3.25rem]" aria-live="polite">
              {viewInfo.caption}
            </p>
            <div className="text-sm text-fg-muted leading-snug text-center">
              {view === 'top'
                ? 'במבט מלמעלה הצפון תמיד למעלה, כמו במפה'
                : view === 'sliced'
                  ? 'גררו שכבה למעלה או למטה · גררו את הרקע כדי לסובב'
                  : 'גררו כדי לסובב את ההר'}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-display font-semibold text-fg-muted">
              מבט מלמעלה · איך זה נראה במפה
            </div>
            <div className="p-4">
              <ContoursAsMap activeRing={activeRing} setActiveRing={setActiveRing} />
            </div>
            <ElevationLegend activeRing={activeRing} setActiveRing={setActiveRing} />
            <div className="text-sm text-fg-muted leading-snug text-center">
              רחפו עם העכבר על המפה כדי לראות את הפרוסה התואמת בהר
            </div>
          </div>
        </div>
      </div>

      <h3 className="mt-12 mb-5 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
        זיהוי תנאי שטח לפי צפיפות
      </h3>

      {/* Tabs + info card + contour map/profile + glossary — see ContoursDensitySection. */}
      <ContoursDensitySection />
    </section>
  );
}

/**
 * Top view of the SAME mountain the 3D diorama shows: the contour lines are
 * the exact iso-lines of the Blender model (contourMountain.data.ts), not
 * idealised ellipses, and every band uses the colour of its 3D slice.
 * Layers, bottom → top: band fills → hovered band → hillshade relief (lit
 * from the NW, like the 3D key light) → contour lines → steep/gentle
 * rulers → label chips → summit → north arrow → hover targets.
 */
const HILLSHADE_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/contour-mountain/hillshade.png`;
// One path per level; a level's rings (usually one) become subpaths.
const RING_PATHS = MOUNTAIN.levels.map((lv) =>
  lv.rings.map((ring) => `M${ring.map(([x, y]) => `${x} ${y}`).join('L')}Z`).join(''),
);
const LEVEL_COUNT = MOUNTAIN.levels.length;
const CHIP_FILL = '#FFFFFF';

/** White label plate — the same chip the 3D view uses, so labels read alike. */
function MapChip({
  x,
  y,
  angle = 0,
  width,
  active = false,
  children,
}: {
  x: number;
  y: number;
  angle?: number;
  width: number;
  active?: boolean;
  children: React.ReactNode;
}) {
  const h = 4.6;
  return (
    <g transform={`rotate(${angle} ${x} ${y})`} className="pointer-events-none">
      <rect
        x={x - width / 2}
        y={y - h / 2}
        width={width}
        height={h}
        rx={1.2}
        fill={CHIP_FILL}
        fillOpacity={0.94}
        stroke={active ? ACCENT : 'none'}
        strokeWidth={0.45}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={3.4}
        className="font-display font-bold tabular-nums"
        fill={active ? ACCENT : CONTOUR_INK}
      >
        {children}
      </text>
    </g>
  );
}

/**
 * A ruler laid across the contours along one ray from the summit, with a dot
 * at every crossing — "dense = steep, sparse = gentle" measured on the map.
 */
function SlopeRuler({ side, label }: { side: 'steep' | 'gentle'; label: string }) {
  const hits = MOUNTAIN.levels.map((lv) => lv[side]);
  const outer = hits[0];
  const inner = hits[hits.length - 1];
  const dx = outer.x - inner.x;
  const dy = outer.y - inner.y;
  const len = Math.hypot(dx, dy);
  // the word continues the ray outward, just past the 10 m crossing
  const lx = outer.x + (dx / len) * 7.5;
  const ly = outer.y + (dy / len) * 7.5;
  return (
    <g aria-hidden className="pointer-events-none">
      <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={CONTOUR_INK} strokeOpacity={0.6} strokeWidth={0.4} />
      {hits.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={0.75} fill={CHIP_FILL} stroke={CONTOUR_INK} strokeWidth={0.3} />
      ))}
      <rect x={lx - 5.2} y={ly - 2.7} width={10.4} height={5.4} rx={1.2} fill={CHIP_FILL} fillOpacity={0.94} />
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={3.8} className="font-display font-bold" fill={CONTOUR_INK}>
        {label}
      </text>
    </g>
  );
}

function ContoursAsMap({ activeRing, setActiveRing }: { activeRing: number | null; setActiveRing: (n: number | null) => void; }) {
  const clipId = useId();
  const s = MOUNTAIN.summit;
  return (
    <div className="aspect-video sm:aspect-square max-h-[340px] mx-auto">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full select-none"
        role="img"
        aria-label={`מפת קווי גובה של ההר: חמישה קווים כל 10 מטרים, פסגה בגובה ${s.heightM} מטר. במערב הקווים צפופים (מדרון תלול), בדרום־מזרח הם מרווחים (מדרון מתון).`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="100" height="100" rx="1.5" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {/* hypsometric bands — ground first, summit band painted last */}
          <rect x="0" y="0" width="100" height="100" fill={BAND_COLORS[0]} />
          {RING_PATHS.map((d, i) => (
            <path key={`band-${i}`} d={d} fill={BAND_COLORS[i + 1]} />
          ))}

          {activeRing !== null && (
            <path
              d={RING_PATHS[activeRing] + (activeRing + 1 < LEVEL_COUNT ? RING_PATHS[activeRing + 1] : '')}
              fillRule="evenodd"
              fill={ACCENT}
              fillOpacity={0.45}
            />
          )}

          {/* shaded relief — makes the flat map read as a mountain */}
          <image href={HILLSHADE_URL} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />

          {MOUNTAIN.levels.map((lv, i) => {
            const isActive = activeRing === i;
            return (
              <path
                key={`line-${i}`}
                d={RING_PATHS[i]}
                fill="none"
                stroke={isActive ? ACCENT : CONTOUR_INK}
                strokeOpacity={isActive ? 1 : 0.85}
                strokeWidth={isActive ? 0.95 : lv.heightM === INDEX_LEVEL_M ? 0.6 : 0.34}
                strokeLinejoin="round"
                className="transition-colors"
              />
            );
          })}

          <SlopeRuler side="steep" label="תלול" />
          <SlopeRuler side="gentle" label="מתון" />

          {MOUNTAIN.levels.map((lv, i) => (
            <MapChip key={`label-${i}`} x={lv.label.x} y={lv.label.y} angle={lv.label.angle} width={6.6} active={activeRing === i}>
              {lv.heightM}
            </MapChip>
          ))}

          {/* summit: triangle on the exact high point + spot height */}
          <path d={`M${s.x} ${s.y - 1.6} L${s.x + 1.5} ${s.y + 1} L${s.x - 1.5} ${s.y + 1} Z`} fill={CONTOUR_INK} className="pointer-events-none" />
          <MapChip x={s.x} y={s.y + 4.4} width={6.6}>
            {s.heightM}
          </MapChip>

          {/* north arrow — the map (and the 3D top view) are north-up */}
          <g aria-hidden className="pointer-events-none" transform="translate(93 10)">
            <path d="M0 -5 L2.2 1.2 L0 0 L-2.2 1.2 Z" fill={CONTOUR_INK} />
            <text x="0" y="4.4" textAnchor="middle" dominantBaseline="central" fontSize={3.2} className="font-display font-bold" fill={CONTOUR_INK}>
              צ
            </text>
          </g>

          {/* hover targets: a band's whole area, inner bands stacked on top */}
          {RING_PATHS.map((d, i) => (
            <path
              key={`hit-${i}`}
              d={d}
              fill="transparent"
              className="cursor-crosshair"
              onPointerEnter={() => setActiveRing(i)}
              onPointerLeave={() => setActiveRing(null)}
              onClick={() => setActiveRing(i)}
            />
          ))}
        </g>

        <rect x="0.2" y="0.2" width="99.6" height="99.6" rx="1.5" fill="none" stroke={CONTOUR_INK} strokeOpacity={0.25} strokeWidth={0.4} />
      </svg>
    </div>
  );
}

/** Colour key for the bands; hovering a swatch lights up that slice too. */
function ElevationLegend({ activeRing, setActiveRing }: { activeRing: number | null; setActiveRing: (n: number | null) => void; }) {
  const bounds = [0, ...MOUNTAIN.levels.map((lv) => lv.heightM), MOUNTAIN.summit.heightM];
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-[13px] font-display font-semibold text-fg-muted whitespace-nowrap">גובה (מ׳)</span>
      <div className="flex">
        {BAND_COLORS.map((color, band) => {
          const ring = band - 1; // band 0 is the ground, not a slice
          const active = ring >= 0 && activeRing === ring;
          return (
            <div
              key={band}
              className={cn('flex flex-col items-center', ring >= 0 && 'cursor-crosshair')}
              onPointerEnter={ring >= 0 ? () => setActiveRing(ring) : undefined}
              onPointerLeave={ring >= 0 ? () => setActiveRing(null) : undefined}
            >
              <span
                className={cn('block h-3 w-11 transition-shadow', active && 'ring-2 ring-accent ring-inset')}
                style={{ background: color }}
              />
              <span dir="ltr" className={cn('text-[13px] tabular-nums mt-1', active ? 'text-accent font-bold' : 'text-fg-muted')}>
                {bounds[band]}–{bounds[band + 1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}