'use client';

import { useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { SceneHeader } from './SceneHeader';
import { ContoursDensitySection } from './ContoursDensitySection';
import { LESSON_FIT_MAX_HEIGHT, LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { ModelLoading } from '@/components/lesson/ModelLoading';
import { cn } from '@/lib/utils';
import type { MountainView } from './ContourCake3D';
import { MOUNTAIN } from './contourMountain.data';
import { ACCENT, INDEX_LEVEL_M } from './contourMountainStyle';
import { MAP } from './topographyTerrainStyle';

const ContourCake3D = dynamic(() => import('./ContourCake3D'), {
  ssr: false,
  // the model's own frame and loading indicator while its chunk loads (ContourCake3D takes over the same box)
  loading: () => (
    <div className="relative aspect-video sm:aspect-square max-h-[340px] w-full mx-auto bg-white">
      <ModelLoading label="טוען הר תלת־ממדי…" />
    </div>
  ),
});

/** Per view: what it shows (caption) and what to do in it (hint). The map ↔ model hover link is LayerLink's. */
const VIEWS: { id: MountainView; label: string; caption: string; hint: string }[] = [
  {
    id: 'whole',
    label: 'הר שלם',
    caption: 'על ההר מסומנים קווי גובה כל 10 מטרים. אלה אותם קווים שמופיעים במפה.',
    hint: 'גררו לסיבוב · גלגלת לתקריב',
  },
  {
    id: 'sliced',
    label: 'פריסה לשכבות',
    caption: 'ההר חתוך לשכבות אופקיות בגובה הקווים. גבול כל חיתוך הוא קו הגובה המתאים במפה.',
    hint: 'גררו שכבה למעלה או למטה · גררו את הרקע לסיבוב',
  },
  {
    id: 'top',
    label: 'מבט מלמעלה',
    caption: 'מלמעלה, הקווים שעל ההר נראים כמו קווי הגובה במפה.',
    hint: 'הצפון כלפי מעלה, כמו במפה · גלגלת לתקריב',
  },
];

// The density section's data (SHAPES), tabs, map and glossary moved verbatim
// into ContoursDensitySection.tsx / ContoursShapeMap.tsx.

/**
 * Laptop fit — each of the two screens (3D model + map card; density section)
 * is its own LessonViewportFit, laid out at the 1920×1080 reference width (the
 * section's content box: max-w-lesson 1408 − lg:px-8) and shrunk uniformly where
 * it doesn't fit. The scene header stays outside the fits (as in the
 * topography screen), and each screen is read after scrolling it up under the
 * fixed site header (--header-h, 5rem from lg), so its reserve is that header
 * plus a 24px gap. 24px below both. A screen taller than LESSON_FIT_MAX_HEIGHT
 * is fitted as that height, so a laptop shrinks it to the same width as the
 * other topic-02 screens (not a narrower, height-bound one); its foot scrolls.
 * SceneHeader's clamp(…3.8vw…) title is already at its 46px cap from 1210px.
 */
const FIT_WIDTH = 1344;
const FIT_TOP = 80 + 24;
const FIT_BOTTOM = 24;
/** Heights at FIT_WIDTH, px (measured 2026-10-19; the model screen 2026-10-27, with the 460 px map). The model
    screen (without the scene header) is the same in all three views, and the density screen on all three tabs —
    the scale stays steady across tabs. */
const FIT_HEIGHT_MODEL = 684;
const FIT_HEIGHT_DENSITY = Math.min(890, LESSON_FIT_MAX_HEIGHT);

export function ContoursScene() {
  const [activeRing, setActiveRing] = useState<number | null>(null);
  // The map has keyboard focus: its ring and the key line under LayerLink show.
  const [mapKeys, setMapKeys] = useState(false);
  const keysId = useId();
  const [view, setView] = useState<MountainView>('whole');
  // Bumped on every view click, so re-clicking the active view re-frames the
  // camera after the learner has zoomed or panned away.
  const [viewNonce, setViewNonce] = useState(0);
  const viewInfo = VIEWS.find((v) => v.id === view)!;

  return (
    <section id="scene-contours" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── Screen 1: the 3D model and its contour map ── */}
      <SceneHeader
        step="02.4"
        title="קווי גובה: כיצד קוראים את צורת השטח במפה?"
        intro="קו גובה מחבר נקודות הנמצאות באותו גובה. כך אפשר לתאר הרים, עמקים ומדרונות במפה שטוחה."
      />
      <LessonViewportFit
        referenceWidth={FIT_WIDTH}
        referenceHeight={FIT_HEIGHT_MODEL}
        reserveTop={FIT_TOP}
        reserveBottom={FIT_BOTTOM}
      >

        {/* No mb-6: it collapsed into the density title's mt-12, which now sits on screen 2's wrapper. */}
        <div className="surface-elevated p-6 lg:p-8">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              <div className="text-sm font-display font-semibold text-fg-muted">
                מודל תלת־ממדי
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
              <div className="text-sm text-fg-muted leading-snug text-center">{viewInfo.hint}</div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-display font-semibold text-fg-muted">
                מפת קווי גובה
              </div>
              <div className="p-4">
                <ContoursAsMap
                  activeRing={activeRing}
                  setActiveRing={setActiveRing}
                  keys={mapKeys}
                  setKeys={setMapKeys}
                  keysId={keysId}
                />
              </div>
              <MapLegend />
              <LayerLink activeRing={activeRing} />
              <MapKeys id={keysId} shown={mapKeys} />
            </div>
          </div>
        </div>
      </LessonViewportFit>

      {/* ── Screen 2: steepness from contour density ── */}
      <LessonViewportFit
        referenceWidth={FIT_WIDTH}
        referenceHeight={FIT_HEIGHT_DENSITY}
        reserveTop={FIT_TOP}
        reserveBottom={FIT_BOTTOM}
        className="mt-12"
      >
        {/* One card: title, tabs, the selected kind's text, glossary and contour map/profile — see ContoursDensitySection. */}
        <ContoursDensitySection />
      </LessonViewportFit>
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
 *
 * Keyboard: the map frame is one tab stop, a vertical slider over the layers
 * (0 = none lit, 1–5 = the bands from 10 m up). Keyboard focus lights the
 * lowest band; ↑/↓ step a band, Home/End jump to the bottom/top one, Esc
 * clears. It drives the same activeRing as the pointer, so the model and
 * LayerLink follow exactly as on hover; leaving (Tab) clears it like the
 * pointer leaving. Tab is never trapped.
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

/** A keyboard (not pointer) focus. Browsers without :focus-visible count every focus as keyboard. */
const isKeyboardFocus = (el: Element) => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

function ContoursAsMap({
  activeRing,
  setActiveRing,
  keys,
  setKeys,
  keysId,
}: {
  activeRing: number | null;
  setActiveRing: (n: number | null) => void;
  /** The map has keyboard focus (ring + key line shown). */
  keys: boolean;
  setKeys: (on: boolean) => void;
  /** The key line under the map, read as the slider's description. */
  keysId: string;
}) {
  const clipId = useId();
  const descId = useId();
  const s = MOUNTAIN.summit;
  // The band the keys lit last: blur clears only that, never one the pointer
  // has lit since (e.g. a click that starts a slice drag in the model).
  const keyRing = useRef<number | null>(null);
  const lightByKey = (n: number | null) => {
    keyRing.current = n;
    setActiveRing(n);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const at = activeRing ?? -1; // -1: nothing lit
    const top = LEVEL_COUNT - 1;
    const next =
      e.key === 'ArrowUp' ? Math.min(at + 1, top)
      : e.key === 'ArrowDown' ? Math.max(at - 1, -1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? top
      : e.key === 'Escape' && at >= 0 ? -1 // nothing lit: let Esc through
      : null;
    if (next === null) return;
    e.preventDefault();
    setKeys(true);
    lightByKey(next < 0 ? null : next);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="שכבת גובה מודגשת במפה ובמודל"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={LEVEL_COUNT}
      aria-valuenow={activeRing === null ? 0 : activeRing + 1}
      aria-valuetext={activeRing === null ? 'אין שכבה מודגשת' : layerText(activeRing)}
      aria-describedby={`${descId} ${keysId}`}
      data-qa="contour-map-keys"
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        // a click focuses too, but there the pointer drives the highlight
        if (!isKeyboardFocus(e.currentTarget)) return;
        setKeys(true);
        if (activeRing === null) lightByKey(0);
      }}
      onBlur={() => {
        if (!keys) return;
        setKeys(false);
        if (activeRing === keyRing.current) setActiveRing(null);
      }}
      // 460 px: a 3.4-unit number reads ≈ 12 px at the lesson's 1440 × 1122 scale (0.78); its labels keep their
      // size relative to the contours. The map column then sets the card's height.
      className={cn(
        'aspect-video sm:aspect-square max-h-[460px] mx-auto rounded-md outline-none',
        keys && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
      )}
    >
      <svg
        id={descId}
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
            <text x="0" y="4.6" textAnchor="middle" dominantBaseline="central" fontSize={3.4} className="font-display font-bold" fill={MAP.ink}>
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

/** Scale-bar numbers and unit, as the contour numbers (≈ 12 px on screen). */
const SCALE_FONT = 3.4;

/** 0–50 m bar along one grid square in the lower-left corner, 25 m segments alternating ink / paper. */
function ScaleBar() {
  const x0 = GRID[0];
  const y = 92.5;
  const seg = 25 * MAP_PER_M;
  const ty = y - 2.4;
  return (
    <g aria-hidden className="pointer-events-none">
      {[0, 1].map((k) => (
        <rect key={k} x={x0 + k * seg} y={y} width={seg} height={1.1} fill={k === 0 ? MAP.ink : MAP.paper} stroke={MAP.ink} strokeWidth={0.2} />
      ))}
      {[0, 25, 50].map((m, k) => (
        <text key={m} x={x0 + k * seg} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={SCALE_FONT} className="font-display font-bold tabular-nums" fill={MAP.ink}>
          {m}
        </text>
      ))}
      {/* On the numbers' line, clear of "50" (two digits ≈ 1.2 em wide, centred on the tick).
          RTL: the text's end (its left edge) sits at x, so it reads to the right of the "50". */}
      <text x={x0 + 2 * seg + SCALE_FONT * 0.95} y={ty} textAnchor="end" direction="rtl" dominantBaseline="central" fontSize={SCALE_FONT} className="font-display font-bold" fill={MAP.ink}>
        מ׳
      </text>
    </g>
  );
}

/** Layer i in words — the link line and the map slider's aria-valuetext. */
function layerText(i: number) {
  const lv = MOUNTAIN.levels[i];
  const above = MOUNTAIN.levels[i + 1];
  return (
    (above ? `השכבה שבין ${lv.heightM} ל־${above.heightM} מ׳` : `השכבה שמעל ${lv.heightM} מ׳, עד הפסגה`) +
    ` · הגבול התחתון שלה הוא קו הגובה ${lv.heightM}`
  );
}

/**
 * The map ↔ model link in words. Idle: how to light a layer. Lit: which layer,
 * and that its lower boundary is the highlighted contour (map band i spans line
 * i to line i+1; model slice i sits on line i).
 */
function LayerLink({ activeRing }: { activeRing: number | null }) {
  const text = activeRing === null ? null : layerText(activeRing);
  return (
    <div
      data-qa="contour-link"
      className={cn(
        'flex items-center justify-center gap-1.5 text-sm leading-snug text-center',
        text ? 'text-fg' : 'text-fg-muted',
      )}
    >
      {text ? (
        <>
          <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden className="shrink-0">
            <path d="M1 4H17" stroke={ACCENT} strokeWidth={3} strokeLinecap="round" />
          </svg>
          <span>{text}</span>
        </>
      ) : (
        'העבירו את הסמן על שכבה במודל או על המפה, והיא תודגש בשניהם'
      )}
    </div>
  );
}

/**
 * The map's keys, shown under LayerLink only while the map has keyboard focus.
 * Its line is kept while hidden (the map column sets the card's height), so
 * showing it moves nothing. Always in the DOM: it is the slider's description
 * for screen readers.
 */
function MapKeys({ id, shown }: { id: string; shown: boolean }) {
  return (
    <div className="text-sm leading-snug min-h-[1lh]">
      <p id={id} data-qa="contour-map-keys-hint" className={cn('text-sm text-fg-muted leading-snug text-center', !shown && 'sr-only')}>
        <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> לשכבה גבוהה או נמוכה יותר ·{' '}
        <kbd className="font-sans">Esc</kbd> לביטול ההדגשה
      </p>
    </div>
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
