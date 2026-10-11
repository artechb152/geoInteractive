'use client';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Layers, Link2, MousePointerClick, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { DATUM, EXTENT_H, EXTENT_W, POINTS, SCALE_BAR_M, START_POINT, VIEW, type PointId } from './reference-systems/referenceSystems.data';
import {
  READINGS, fx, fy, graticule, graticuleLabel, pct, polylinePoints, rightLabelFits, topLabelFits, utmGrid, zoneText,
} from './reference-systems/referenceSystemsGeometry';

/* ─────────── מערכות ייחוס — "אותה נקודה, שתי שפות" ───────────
   Brief: design/mockups/topic-02-reference-systems-2026-10-11/claude-linked-comparison-prompt.md
   Mockup: design/mockups/topic-02-reference-systems-2026-10-11/02-linked-comparison.png

   Two readings of ONE base map on ONE datum (WGS84): geographic ϕ/λ on the
   right (inline-start), UTM 36N E/N on the left. Picking a point on either
   map — or with the A/B/C buttons — selects it on both, and both reading
   cards update in the same render from the same stored E/N. The exploration
   tabs are the rows of the scene's original table; switching them moves the
   emphasis, never the point or its numbers.

   All copy (title, column names, rows) is passed in by CoordinatesPart2Scene;
   this file adds only the operating labels the brief allows. */

export type ProjectionRowId = 'scope' | 'units' | 'what';
export type ProjectionRow = { id: ProjectionRowId; label: string; geo: ReactNode; utm: ReactNode };

const START_MODE: ProjectionRowId = 'units';

const BASE_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/reference-systems/linked-terrain-base.webp`;

// Same choice language as the rest of the scene (CoordinatesPart2Scene CHOICE / choiceTone),
// plus ring-1 on the chosen one so "selected" never rests on colour alone.
const CHOICE =
  'rounded-xl border cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const choiceTone = (on: boolean) => (on ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]');
const FADE = 'transition-opacity duration-200 ease-snap motion-reduce:transition-none';
/** Emphasis of whatever the active tab is about. */
const EMPH = 'bg-accent/10 ring-1 ring-inset ring-accent/50';
/** Hairline between reading fields, centred in the gap on the inline-start side. */
const DIVIDER =
  "[&+&]:before:absolute [&+&]:before:inset-y-3 [&+&]:before:-start-[4px] [&+&]:before:w-px [&+&]:before:bg-border/70 [&+&]:before:content-['']";

function L({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}

const UTM_GRID = utmGrid();
const GRATICULE = graticule();
/* Meridian labels are ≈ 75 px wide and 15″ ≈ 87 px apart at 1440. In a narrower map every
   other one steps aside — the half that keeps clear of the north arrow. */
const MERIDIAN_LABELS = (() => {
  const fit = GRATICULE.meridians.filter((l) => topLabelFits(l.edge));
  const dropEven = fit.length > 0 && fx(fit[0].edge) < 0.25;
  return fit.map((l, i) => ({ ...l, thin: (i % 2 === 0) === dropEven }));
})();

export function ReferenceSystemsLinkedComparison({
  heading,
  geoTitle,
  utmTitle,
  rows,
}: {
  heading: ReactNode;
  geoTitle: ReactNode;
  utmTitle: ReactNode;
  rows: ProjectionRow[];
}) {
  const [selected, setSelected] = useState<PointId>(START_POINT);
  const [preview, setPreview] = useState<PointId | null>(null);
  const [mode, setMode] = useState<ProjectionRowId>(START_MODE);
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ids = {
    instr: `${uid}-instr`,
    geo: `${uid}-geo`,
    utm: `${uid}-utm`,
    heading: `${uid}-heading`,
    tab: (m: ProjectionRowId) => `${uid}-tab-${m}`,
    panel: (m: ProjectionRowId) => `${uid}-panel-${m}`,
  };

  const pick = (id: PointId) => {
    setSelected(id);
    setPreview(null);
  };
  const reset = () => {
    setSelected(START_POINT);
    setPreview(null);
    setMode(START_MODE);
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = rows.findIndex((r) => r.id === mode);
    let next = -1;
    // RTL: the next tab is to the left
    if (e.key === 'ArrowLeft') next = Math.min(rows.length - 1, idx + 1);
    else if (e.key === 'ArrowRight') next = Math.max(0, idx - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = rows.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setMode(rows[next].id);
    tabRefs.current[next]?.focus();
  };

  const r = READINGS[selected];
  const hover = preview && preview !== selected ? preview : null;
  const mapProps = { selected, hover, mode, onPick: pick, onPreview: setPreview };

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="reference-systems">
      {/* info row: what to do (DOM-first → right), the shared datum and reset (left) */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p id={ids.instr} className="flex items-center gap-2 text-base font-display font-bold text-black">
            <MousePointerClick size={20} strokeWidth={2} aria-hidden className="shrink-0 text-fg-muted" />
            בחרו נקודה באחת המפות
          </p>
          <div role="group" aria-labelledby={ids.instr} className="flex gap-1.5">
            {POINTS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected === p.id}
                aria-label={`נקודה ${p.id}`}
                data-point-button={p.id}
                onClick={() => pick(p.id)}
                onPointerEnter={() => setPreview(p.id)}
                onPointerLeave={() => setPreview(null)}
                onFocus={() => setPreview(p.id)}
                onBlur={() => setPreview(null)}
                className={cn(CHOICE, choiceTone(selected === p.id), 'grid size-9 place-items-center font-display text-sm font-bold text-fg')}
              >
                {p.id}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* pill classes as LandCoverScene's tags */}
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3.5 py-1.5 text-sm font-display font-semibold text-fg">
            <Layers size={16} strokeWidth={2} aria-hidden className="shrink-0 text-fg-muted" />
            דאטום משותף: <L>{DATUM}</L>
          </span>
          <Button variant="secondary" size="sm" onClick={reset}>
            <RotateCcw size={16} strokeWidth={2} aria-hidden />
            איפוס
          </Button>
        </div>
      </div>

      {/* the two readings: geographic at inline-start (right), UTM at inline-end (left).
          On desktop the panels share rows (subgrid) so title / map / card line up,
          and the link glyph sits centred on the map row. */}
      <div className="relative mt-6 grid gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto] lg:gap-x-10 lg:gap-y-0">
        <ReadingPanel kind="geo" titleId={ids.geo} title={geoTitle} className="lg:col-start-1 lg:row-start-1" {...mapProps} />
        <ReadingPanel kind="utm" titleId={ids.utm} title={utmTitle} className="lg:col-start-2 lg:row-start-1" {...mapProps} />
        <div
          aria-hidden
          className="pointer-events-none z-10 hidden place-items-center lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:grid lg:self-center lg:justify-self-center"
        >
          <span className="grid size-9 place-items-center rounded-full border border-border bg-bg-elevated text-fg-muted shadow-elevated">
            <Link2 size={18} strokeWidth={2} />
          </span>
        </div>
      </div>

      {/* one short announcement per selection — not on hover */}
      <p aria-live="polite" className="sr-only">
        {`נקודה ${selected}: רוחב ${r.latText}, אורך ${r.lonText}; מזרח ${r.eText}, צפון ${r.nText}, ${zoneText}.`}
      </p>

      {/* exploration: the original table, one row at a time */}
      <div className="mt-6 rounded-xl bg-bg-accent/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 id={ids.heading} className="font-display font-bold leading-tight text-black text-base md:text-lg">
            {heading}
          </h4>
          <div role="tablist" aria-labelledby={ids.heading} onKeyDown={onTabKey} className="flex flex-wrap gap-2">
            {rows.map((row, i) => {
              const on = row.id === mode;
              return (
                <button
                  key={row.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={ids.tab(row.id)}
                  aria-selected={on}
                  aria-controls={ids.panel(row.id)}
                  tabIndex={on ? 0 : -1}
                  data-mode={row.id}
                  onClick={() => setMode(row.id)}
                  className={cn(CHOICE, choiceTone(on), 'px-4 py-2 font-display text-base font-bold text-black')}
                >
                  {row.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* all panels share one cell, so the band keeps one height in every state */}
        <div className="mt-4 grid [&>*]:[grid-area:1/1]">
          {rows.map((row) => {
            const on = row.id === mode;
            return (
              <div
                key={row.id}
                role="tabpanel"
                id={ids.panel(row.id)}
                aria-labelledby={ids.tab(row.id)}
                aria-hidden={!on}
                tabIndex={on ? 0 : -1}
                data-mode-panel={row.id}
                className={cn('transition-[opacity,visibility] duration-200 ease-snap motion-reduce:transition-none', on ? 'visible opacity-100' : 'invisible opacity-0')}
              >
                <dl className="grid gap-4 lg:grid-cols-2 lg:gap-10">
                  <div>
                    <dt className="text-base font-display font-bold text-black">{geoTitle}</dt>
                    <dd className="mt-0.5 text-base leading-relaxed text-black">{row.geo}</dd>
                  </div>
                  <div>
                    <dt className="text-base font-display font-bold text-black">{utmTitle}</dt>
                    <dd className="mt-0.5 text-base leading-relaxed text-black">{row.utm}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── One column: title + system, the map, the reading card ─────────────── */

type MapState = {
  selected: PointId;
  hover: PointId | null;
  mode: ProjectionRowId;
  onPick: (id: PointId) => void;
  onPreview: (id: PointId | null) => void;
};

function ReadingPanel({
  kind,
  title,
  titleId,
  className,
  ...state
}: { kind: 'geo' | 'utm'; title: ReactNode; titleId: string; className: string } & MapState) {
  const r = READINGS[state.selected];
  const geo = kind === 'geo';
  const { mode } = state;
  return (
    <section
      aria-labelledby={titleId}
      data-system={kind}
      className={cn('flex min-w-0 flex-col gap-3 rounded-xl border border-border/60 bg-bg-accent/40 p-4 lg:row-span-3 lg:grid lg:grid-rows-subgrid', className)}
    >
      <header className="text-center">
        <h4 id={titleId} className="font-display font-bold leading-tight text-black text-base md:text-lg">
          {title}
        </h4>
        <p className="mt-1.5 flex justify-center">
          <span
            data-meta={kind}
            className={cn(
              'rounded-md px-2 py-0.5 font-display text-sm font-semibold transition-colors duration-200 ease-snap motion-reduce:transition-none',
              mode === 'scope' ? cn(EMPH, 'text-black') : 'text-fg-muted',
            )}
          >
            <L>{geo ? DATUM : `${DATUM} / UTM ${zoneText}`}</L>
          </span>
        </p>
      </header>

      <TerrainMap kind={kind} {...state} />

      <dl
        data-readout={kind}
        className={cn('grid gap-2 rounded-xl border border-border/60 bg-bg-elevated p-1.5', geo ? 'grid-cols-2' : 'grid-cols-[1fr_1fr_auto]')}
      >
        {geo ? (
          <>
            <ReadingField label="רוחב" axis="ϕ" value={r.latText} unit="מעלות" field="lat" mode={mode} />
            <ReadingField label="אורך" axis="λ" value={r.lonText} unit="מעלות" field="lon" mode={mode} />
          </>
        ) : (
          <>
            <ReadingField label="מזרח" axis="E" value={r.eText} unit="מטרים" field="e" mode={mode} />
            <ReadingField label="צפון" axis="N" value={r.nText} unit="מטרים" field="n" mode={mode} />
            <ReadingField label="פלח וחצי כדור" value={zoneText} field="zone" mode={mode} />
          </>
        )}
      </dl>
    </section>
  );
}

function ReadingField({
  label,
  axis,
  value,
  unit,
  field,
  mode,
}: {
  label: string;
  axis?: string;
  value: string;
  unit?: string;
  field: 'lat' | 'lon' | 'e' | 'n' | 'zone';
  mode: ProjectionRowId;
}) {
  const what = mode === 'what';
  const units = mode === 'units';
  return (
    <div
      data-field={field}
      className={cn(
        'relative flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-center transition-colors duration-200 ease-snap motion-reduce:transition-none',
        DIVIDER,
        what && EMPH,
      )}
    >
      <dt className="text-base font-display font-bold leading-tight text-black sm:whitespace-nowrap">
        {label}
        {axis && (
          <>
            {' '}
            <L>{axis}</L>
          </>
        )}
      </dt>
      <dd className="font-display text-base font-bold leading-none tabular-nums text-black sm:text-xl">
        <L>{value}</L>
      </dd>
      {unit ? (
        <dd
          data-unit={field}
          className={cn(
            'min-h-6 rounded-md px-1.5 text-base leading-6 transition-colors duration-200 ease-snap motion-reduce:transition-none',
            units ? cn(EMPH, 'font-bold text-black') : 'text-fg-muted',
          )}
        >
          {unit}
        </dd>
      ) : (
        // reserved line: keeps the three UTM fields level with each other
        <div aria-hidden className="min-h-6" />
      )}
    </div>
  );
}

/* ── The map ──────────────────────────────────────────────────────────────
   One SVG in the base image's own metres (viewBox = VIEW): the image, its
   paper/grid fallback, the grid of this reading and the feature rings all
   share it, so nothing can drift off the terrain. HTML overlays (labels,
   pins) are placed by the same VIEW fractions; the box keeps VIEW's 5:4
   ratio, so a fraction is the same spot of terrain on both maps. Physical
   left/top on purpose: a map is never mirrored for RTL. */

const RING_KEYS = POINTS.map((p) => p.id);

function TerrainMap({ kind, selected, hover, mode, onPick, onPreview }: { kind: 'geo' | 'utm' } & MapState) {
  const uid = useId();
  const [failed, setFailed] = useState(false);
  const geo = kind === 'geo';
  const r = READINGS[selected];
  const units = mode === 'units';
  const desc = geo
    ? `מפה עם רשת קווי רוחב ואורך. מסומנת נקודה ${selected}: רוחב ${r.latText}, אורך ${r.lonText}.`
    : `אותה מפה עם רשת UTM במטרים, פלח ${zoneText}. מסומנת נקודה ${selected}: מזרח ${r.eText}, צפון ${r.nText}.`;

  return (
    <div dir="ltr" data-map={kind} className="relative aspect-[5/4] select-none overflow-hidden rounded-xl border border-border/70 bg-bg-accent [container-type:inline-size]">
      <div role="img" aria-label={desc} className="absolute inset-0">
        <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <pattern id={`${uid}-paper`} width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M100 0 V100 M0 100 H100" fill="none" className="stroke-brand-dark/15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </pattern>
          </defs>
          {/* fallback while loading / if the image fails: paper + a plain grid, same size */}
          <rect x="0" y="0" width={EXTENT_W} height={EXTENT_H} className="fill-bg-accent" />
          <rect x="0" y="0" width={EXTENT_W} height={EXTENT_H} fill={`url(#${uid}-paper)`} />
          {!failed && (
            <image
              href={BASE_SRC}
              x="0"
              y="0"
              width={EXTENT_W}
              height={EXTENT_H}
              preserveAspectRatio="none"
              data-base-image
              onError={() => setFailed(true)}
            />
          )}

          {geo ? (
            <g fill="none" className="stroke-fg/55" strokeWidth="1.25" data-grid="graticule">
              {[...GRATICULE.meridians, ...GRATICULE.parallels].map((l, i) => (
                <polyline key={i} points={polylinePoints(l.points)} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          ) : (
            <g className="stroke-fg/55" strokeWidth="1.25" data-grid="utm">
              {UTM_GRID.eastings.map((l) => (
                <line key={`e${l.value}`} x1={l.at} y1={0} x2={l.at} y2={EXTENT_H} vectorEffect="non-scaling-stroke" />
              ))}
              {UTM_GRID.northings.map((l) => (
                <line key={`n${l.value}`} x1={0} y1={l.at} x2={EXTENT_W} y2={l.at} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          )}

          {/* the marked feature: chosen point solid, hover preview dashed */}
          {RING_KEYS.map((id) => {
            const p = READINGS[id];
            const { rx, ry, rot } = p.point.ring;
            const on = id === selected;
            const pre = id === hover;
            return (
              <ellipse
                key={id}
                data-ring={id}
                data-ring-state={on ? (hover ? 'dimmed' : 'selected') : pre ? 'preview' : 'off'}
                cx={p.x}
                cy={p.y}
                rx={rx}
                ry={ry}
                transform={`rotate(${rot} ${p.x} ${p.y})`}
                vectorEffect="non-scaling-stroke"
                strokeWidth={on ? 2.5 : 2}
                strokeDasharray={pre ? '6 5' : undefined}
                className={cn(
                  FADE,
                  on ? 'fill-accent/10 stroke-accent' : 'fill-transparent stroke-fg',
                  on ? (hover ? 'opacity-40' : 'opacity-100') : pre ? 'opacity-90' : 'opacity-0',
                )}
              />
            );
          })}
        </svg>

        {/* edge labels: top = eastings / meridians, right = northings / parallels */}
        <div aria-hidden>
          {geo
            ? MERIDIAN_LABELS.map((l) => (
                  <MapLabel key={`m${l.sec}`} emph={units} thin={l.thin} style={{ left: pct(fx(l.edge)), top: 6, transform: 'translateX(-50%)' }}>
                    {graticuleLabel(l.sec, 'lon')}
                  </MapLabel>
              ))
            : UTM_GRID.eastings
                .filter((l) => topLabelFits(l.at))
                .map((l) => (
                  <MapLabel key={`e${l.value}`} emph={units} style={{ left: pct(fx(l.at)), top: 6, transform: 'translateX(-50%)' }}>
                    {l.value}
                  </MapLabel>
                ))}
          {geo
            ? GRATICULE.parallels
                .filter((l) => rightLabelFits(l.edge))
                .map((l) => (
                  <MapLabel key={`p${l.sec}`} emph={units} style={{ right: 6, top: pct(fy(l.edge)), transform: 'translateY(-50%)' }}>
                    {graticuleLabel(l.sec, 'lat')}
                  </MapLabel>
                ))
            : UTM_GRID.northings
                .filter((l) => rightLabelFits(l.at))
                .map((l) => (
                  <MapLabel key={`n${l.value}`} emph={units} style={{ right: 6, top: pct(fy(l.at)), transform: 'translateY(-50%)' }}>
                    {l.value}
                  </MapLabel>
                ))}
        </div>

        <NorthArrow />
        <ScaleBar />
        {!geo && (
          <span
            aria-hidden
            data-zone-chip
            className={cn(
              'absolute whitespace-nowrap rounded-md border px-2 py-0.5 font-display text-sm font-bold leading-snug text-black transition-colors duration-200 ease-snap motion-reduce:transition-none',
              mode === 'scope' ? 'border-accent bg-bg-elevated ring-1 ring-accent' : 'border-border/70 bg-bg-elevated/90',
            )}
            style={{ right: 8, bottom: 8 }}
          >
            UTM {zoneText}
          </span>
        )}
      </div>

      {/* pointer targets only — the A/B/C group above is the accessible, keyboard path, so the
          pins stay out of the accessibility tree (no name heard three times) */}
      {POINTS.map((p) => (
        <MapPin
          key={p.id}
          id={p.id}
          x={READINGS[p.id].x}
          y={READINGS[p.id].y}
          active={p.id === selected}
          preview={p.id === hover}
          onPick={onPick}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}

function MapLabel({ emph, thin, style, children }: { emph: boolean; thin?: boolean; style: React.CSSProperties; children: ReactNode }) {
  return (
    <span
      data-map-label
      className={cn(
        'absolute whitespace-nowrap rounded px-1 font-display text-[13px] leading-snug tabular-nums transition-colors duration-200 ease-snap motion-reduce:transition-none',
        // below the 1440 target only: a map box under 340 px (phones) drops its edge labels; under 400 px the pins shrink
        '[@container(max-width:340px)]:hidden',
        thin && '[@container(max-width:420px)]:hidden',
        emph ? 'bg-bg-elevated font-bold text-black ring-1 ring-accent/60' : 'bg-bg-elevated/85 font-semibold text-fg',
      )}
      style={style}
    >
      {children}
    </span>
  );
}

function NorthArrow() {
  return (
    <div aria-hidden data-north className="absolute flex flex-col items-center rounded-md bg-bg-elevated/85 px-1.5 pb-1 pt-0.5 text-fg" style={{ left: 8, top: 8 }}>
      <span className="font-display text-sm font-bold leading-none">N</span>
      <svg width="12" height="15" viewBox="0 0 10 12" className="mt-0.5 fill-fg">
        <path d="M5 0 L10 12 L5 9 L0 12 Z" />
      </svg>
    </div>
  );
}

/** 0 · 250 · 500 m, the bar a fraction of the map width (same box as the terrain); the unit sits after the bar. */
function ScaleBar() {
  const w = SCALE_BAR_M / VIEW.w;
  return (
    <div
      aria-hidden
      data-scale-bar
      className="absolute flex items-start gap-2 rounded-md bg-bg-elevated/85 px-2.5 pb-1.5 pt-1 font-display text-xs font-semibold leading-none tabular-nums text-fg"
      style={{ left: 8, bottom: 8 }}
    >
      {/* the bar's own width is the fraction of the MAP, hence the map-relative calc */}
      <div className="shrink-0" style={{ width: `calc((100cqw) * ${w.toFixed(4)})` }}>
        <div className="relative mb-1 h-3.5">
          {/* physical, like every map overlay here: a scale bar reads 0 → 500 left to right */}
          <span className="absolute -translate-x-1/2" style={{ left: 0 }}>
            0
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: '50%' }}>
            {SCALE_BAR_M / 2}
          </span>
          <span className="absolute translate-x-1/2" style={{ right: 0 }}>
            {SCALE_BAR_M}
          </span>
        </div>
        <div className="flex h-1.5 border border-fg">
          <span className="flex-1 bg-fg" />
          <span className="flex-1 bg-bg-elevated" />
        </div>
      </div>
      <span dir="rtl" className="ps-1 leading-[14px]">
        מ׳
      </span>
    </div>
  );
}

/** Pin with its tip on the point (StationPin language, MeasurementLandscape.tsx). */
function MapPin({
  id,
  x,
  y,
  active,
  preview,
  onPick,
  onPreview,
}: {
  id: PointId;
  x: number;
  y: number;
  active: boolean;
  preview: boolean;
  onPick: (id: PointId) => void;
  onPreview: (id: PointId | null) => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      data-pin={id}
      data-active={active || undefined}
      onClick={() => onPick(id)}
      onPointerEnter={() => onPreview(id)}
      onPointerLeave={() => onPreview(null)}
      className="group absolute flex cursor-pointer flex-col items-center focus-visible:outline-none"
      style={{ left: pct(fx(x)), top: pct(fy(y)), transform: 'translate(-50%, calc(-100% + 3px))' }}
    >
      <span
        className={cn(
          'grid place-items-center rounded-full border-2 font-display font-bold leading-none shadow-[0_2px_6px_rgba(40,50,35,0.35)] transition-colors duration-200 ease-snap motion-reduce:transition-none',
          active
            ? 'size-9 border-bg-elevated bg-accent text-base text-bg-elevated ring-2 ring-accent [@container(max-width:400px)]:size-7 [@container(max-width:400px)]:text-sm'
            : cn('size-8 bg-bg-elevated text-sm text-brand-dark [@container(max-width:400px)]:size-6 [@container(max-width:400px)]:text-xs', preview ? 'border-accent' : 'border-brand-dark group-hover:border-accent'),
        )}
      >
        {id}
      </span>
      <span className={cn('h-3 w-0.5 [@container(max-width:400px)]:h-2', active ? 'bg-accent' : 'bg-brand-dark')} />
      <span className={cn('-mt-px size-1.5 rounded-full', active ? 'bg-accent' : 'bg-brand-dark')} />
    </button>
  );
}
