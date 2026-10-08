'use client';

import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { SceneHeader } from './SceneHeader';
import { ContoursDensitySection } from './ContoursDensitySection';
import { cn } from '@/lib/utils';
import type { MountainView } from './ContourCake3D';
import { MOUNTAIN } from './contourMountain.data';
import { ACCENT, INDEX_LEVEL_M } from './contourMountainStyle';
import { MAP } from './topographyTerrainStyle';

const ContourCake3D = dynamic(() => import('./ContourCake3D'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video sm:aspect-square max-h-[340px] w-full mx-auto flex items-center justify-center text-fg-dim text-sm">
      טוען מודל תלת־ממדי…
    </div>
  ),
});

const VIEWS: { id: MountainView; label: string; caption: string }[] = [
  {
    id: 'whole',
    label: 'הר שלם',
    caption: 'המודל מציג את צורת ההר. הקווים הכהים שנוספו למדרון מחברים נקודות הנמצאות באותו גובה.',
  },
  {
    id: 'sliced',
    label: 'פריסה לשכבות',
    caption: 'המודל מחולק לשכבות בהפרשי גובה של 10 מטרים. גררו שכבה ובחנו כיצד גבול החיתוך מתאים לקו הגובה במפה.',
  },
  {
    id: 'top',
    label: 'מבט מלמעלה',
    caption: 'במבט מלמעלה אפשר לראות כיצד קווי הגובה מתארים את צורת ההר על גבי המפה.',
  },
];

// The density section's data (SHAPES), tabs, map and glossary moved verbatim
// into ContoursDensitySection.tsx / ContoursShapeMap.tsx.

export function ContoursScene() {
  const [activeRing, setActiveRing] = useState<number | null>(null);
  const [view, setView] = useState<MountainView>('whole');
  // Bumped on every view click, so re-clicking the active view re-frames the
  // camera after the learner has zoomed or panned away.
  const [viewNonce, setViewNonce] = useState(0);
  const viewInfo = VIEWS.find((v) => v.id === view)!;

  return (
    <section id="scene-contours" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.4"
        title="קווי גובה: כיצד קוראים את צורת השטח במפה?"
        intro="קו גובה מחבר נקודות הנמצאות באותו גובה. כך אפשר לתאר הרים, עמקים ומדרונות במפה שטוחה. בהדמיה ההר מחולק לשכבות אופקיות: גבול החיתוך של כל שכבה יוצר קו גובה. עברו בין התצוגות ובחנו את הקשר בין המודל למפה."
      />

      <div className="surface-elevated p-6 lg:p-8 mb-6">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-3">
            <div className="text-sm font-display font-semibold text-fg-muted">
              מודל תלת־ממדי · חלוקה לשכבות גובה
            </div>
            <div className="p-4">
              <ContourCake3D view={view} viewNonce={viewNonce} activeRing={activeRing} setActiveRing={setActiveRing} />
            </div>
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="אופן הצגת ההר">
              {VIEWS.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={view === v.id}
                  onClick={() => {
                    setView(v.id);
                    setViewNonce((n) => n + 1);
                  }}
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
                ? 'בתצוגה זו הצפון כלפי מעלה · השתמשו בגלגלת לשינוי התקריב'
                : view === 'sliced'
                  ? 'גררו שכבה לשינוי גובהה · גלגלת לשינוי התקריב · גררו את הרקע לסיבוב'
                  : 'גררו לסיבוב · גלגלת לשינוי התקריב · גררו בלחצן הימני להזזה'}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-display font-semibold text-fg-muted">
              מבט מלמעלה · קווי הגובה במפה
            </div>
            <div className="p-4">
              <ContoursAsMap activeRing={activeRing} setActiveRing={setActiveRing} />
            </div>
            <MapLegend />
            <div className="text-sm text-fg-muted leading-snug text-center">
              העבירו את הסמן על המפה כדי להדגיש את השכבה המתאימה במודל
            </div>
          </div>
        </div>
      </div>

      <h3 className="mt-12 mb-5 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
        הערכת תלילות לפי צפיפות קווי הגובה
      </h3>

      {/* Tabs + info card + contour map/profile + glossary — see ContoursDensitySection. */}
      <ContoursDensitySection />
    </section>
  );
}

/**
 * Top view of the SAME mountain the 3D diorama shows, drawn as a printed
 * topographic map in the lesson's map language (topographyTerrainStyle —
 * the topography sheet's paper, grid and brown contours): the contour lines
 * are the exact iso-lines of the Blender model (contourMountain.data.ts), not
 * idealised ellipses. Deliberately flat — no tints, no shaded relief — so
 * the shape is read from the lines alone, never from a picture of a 3D hill.
 * Layers, bottom → top: paper → 50 m grid → hovered band → contour lines →
 * steep/gentle rulers → contour labels → spot height → north arrow → scale
 * bar → hover targets.
 */
// One path per level; a level's rings (usually one) become subpaths.
const RING_PATHS = MOUNTAIN.levels.map((lv) =>
  lv.rings.map((ring) => `M${ring.map(([x, y]) => `${x} ${y}`).join('L')}Z`).join(''),
);
const LEVEL_COUNT = MOUNTAIN.levels.length;
/** Map units per metre: the 0–100 map spans the whole diorama. */
const MAP_PER_M = 100 / (2 * MOUNTAIN.halfUnits * MOUNTAIN.metersPerUnit);
/** Grid every 50 m, through the diorama's centre. */
const GRID = [-2, -1, 0, 1, 2].map((k) => 50 + k * 50 * MAP_PER_M);
const CONTOUR_W = 0.34;
const INDEX_W = 0.7;

/**
 * A contour number set into its line, as on a printed map: a paper plate
 * breaks the line and the digits take the contour's own ink.
 */
function MapChip({
  x,
  y,
  angle = 0,
  width,
  ink = MAP.contour,
  active = false,
  children,
}: {
  x: number;
  y: number;
  angle?: number;
  width: number;
  ink?: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  const h = 4.2;
  return (
    <g transform={`rotate(${angle} ${x} ${y})`} className="pointer-events-none">
      <rect
        x={x - width / 2}
        y={y - h / 2}
        width={width}
        height={h}
        rx={1}
        fill={MAP.paper}
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
        fill={active ? ACCENT : ink}
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
      <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={MAP.ink} strokeOpacity={0.6} strokeWidth={0.4} />
      {hits.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={0.75} fill={MAP.paper} stroke={MAP.ink} strokeWidth={0.3} />
      ))}
      <rect x={lx - 5.2} y={ly - 2.7} width={10.4} height={5.4} rx={1.2} fill={MAP.paper} />
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={3.8} className="font-display font-bold" fill={MAP.ink}>
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
        aria-label={`מפת קווי גובה של ההר: חמישה קווים בהפרשי גובה של 10 מטרים, פסגה בגובה ${s.heightM} מטר. במערב הקווים צפופים (מדרון תלול), בדרום־מזרח הם מרווחים (מדרון מתון).`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="100" height="100" rx="1.5" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="100" height="100" fill={MAP.paper} />
          <g stroke={MAP.grid} strokeWidth={0.18} aria-hidden>
            {GRID.map((g) => (
              <path key={g} d={`M${g} 0V100M0 ${g}H100`} />
            ))}
          </g>

          {activeRing !== null && (
            <path
              d={RING_PATHS[activeRing] + (activeRing + 1 < LEVEL_COUNT ? RING_PATHS[activeRing + 1] : '')}
              fillRule="evenodd"
              fill={ACCENT}
              fillOpacity={0.3}
            />
          )}

          {MOUNTAIN.levels.map((lv, i) => {
            const isActive = activeRing === i;
            return (
              <path
                key={`line-${i}`}
                d={RING_PATHS[i]}
                fill="none"
                stroke={isActive ? ACCENT : MAP.contour}
                strokeWidth={isActive ? 0.95 : lv.heightM === INDEX_LEVEL_M ? INDEX_W : CONTOUR_W}
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

          {/* summit: spot height — triangle on the exact high point + its height */}
          <path d={`M${s.x} ${s.y - 1.6} L${s.x + 1.5} ${s.y + 1} L${s.x - 1.5} ${s.y + 1} Z`} fill={MAP.ink} className="pointer-events-none" />
          <MapChip x={s.x} y={s.y + 4.4} width={6.6} ink={MAP.ink}>
            {s.heightM}
          </MapChip>

          {/* north arrow — the map (and the 3D top view) are north-up */}
          <g aria-hidden className="pointer-events-none" transform="translate(93 10)">
            <path d="M0 -5 L2.2 1.2 L0 0 L-2.2 1.2 Z" fill={MAP.ink} />
            <text x="0" y="4.4" textAnchor="middle" dominantBaseline="central" fontSize={3.2} className="font-display font-bold" fill={MAP.ink}>
              צ
            </text>
          </g>

          <ScaleBar />

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

        <rect x="0.2" y="0.2" width="99.6" height="99.6" rx="1.5" fill="none" stroke={MAP.ink} strokeWidth={0.4} />
      </svg>
    </div>
  );
}

/** 0–50 m bar along one grid square in the lower-left corner, 25 m segments alternating ink / paper. */
function ScaleBar() {
  const x0 = GRID[0];
  const y = 92.5;
  const seg = 25 * MAP_PER_M;
  return (
    <g aria-hidden className="pointer-events-none">
      {[0, 1].map((k) => (
        <rect key={k} x={x0 + k * seg} y={y} width={seg} height={1.1} fill={k === 0 ? MAP.ink : MAP.paper} stroke={MAP.ink} strokeWidth={0.2} />
      ))}
      {[0, 25, 50].map((m, k) => (
        <text key={m} x={x0 + k * seg} y={y - 2} textAnchor="middle" dominantBaseline="central" fontSize={2.8} className="font-display font-bold tabular-nums" fill={MAP.ink}>
          {m}
        </text>
      ))}
      {/* RTL: the text's end (its left edge) sits at x, so it reads to the right of the bar. */}
      <text x={x0 + 2 * seg + 1.4} y={y + 0.55} textAnchor="end" direction="rtl" dominantBaseline="central" fontSize={2.8} className="font-display font-bold" fill={MAP.ink}>
        מ׳
      </text>
    </g>
  );
}

/** The map's key, as printed under a topographic sheet. */
function MapLegend() {
  const line = (width: number) => (
    <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden className="shrink-0">
      <path d="M1 4H23" stroke={MAP.contour} strokeWidth={width} strokeLinecap="round" />
    </svg>
  );
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] font-display font-semibold text-fg-muted">
      <span className="flex items-center gap-1.5">
        {line(CONTOUR_W * 3.4)}
        קו גובה · כל 10 מ׳
      </span>
      <span className="flex items-center gap-1.5">
        {line(INDEX_W * 3.4)}
        קו גובה ראשי
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden className="shrink-0">
          <path d="M6 0.5L11 9.5H1Z" fill={MAP.ink} />
        </svg>
        נקודת גובה
      </span>
    </div>
  );
}
