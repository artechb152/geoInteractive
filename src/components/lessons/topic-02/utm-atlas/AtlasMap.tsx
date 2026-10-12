'use client';
/* One map frame of the UTM zone atlas — the world locator map or the enlargement.
   Drawn in degrees (x = lon, y = −lat) in an SVG stretched to the frame, so the
   window's equirectangular projection is just the frame's aspect. A map: north
   up, east right, dir="ltr", never mirrored; overlay labels use physical
   left/top on purpose. Text lives in HTML overlays (never stretched SVG text). */

import { memo, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { Basemap } from './useBasemap';
import { fracX, fracY, latAt, lonAt, svgPoints, viewBottom, viewBox, viewTop, wrapCopies, type GridLine, type View } from './atlasGeometry';
import { NORTH_LIMIT, SOUTH_LIMIT, zoneBoundarySegments, zoneOutline, type LatLon } from './utmAtlas';

export type Marks = {
  /** Tinted zone: the point's zone, a practice pick, or a revealed answer. */
  focusZone?: number | null;
  focusTone?: 'accent' | 'pick';
  /** Neighbour zones drawn as outlines in the enlargement. */
  outlineZones?: number[];
  /** A boundary to point at (crossed, or the one a practice answer turns on). */
  boundary?: { lon: number; s: number; n: number } | null;
  equator?: 'plain' | 'highlight';
  greenwich?: boolean;
  /** World map only: the enlargement's window. */
  locator?: View | null;
  pin?: { lat: number; lon: number; label: string } | null;
  grid?: GridLine[] | null;
  readingLines?: { up: [number, number][]; across: [number, number][] } | null;
};

export type Chip = { key: string; lat?: number; lon?: number; fx?: number; fy?: number; style?: CSSProperties; tone?: 'plain' | 'accent' | 'strong'; children: ReactNode };
export type TopLabel = { key: string; fx: number; text: ReactNode; tone?: 'muted' | 'strong' | 'accent' };

type Phase = 'start' | 'move' | 'end';

/** Shift (multiple of 360°) that brings a longitude next to the window's centre. */
const shiftNear = (v: View, lon: number) => Math.round((v.lon0 - lon) / 360) * 360;

export function AtlasMap({
  kind,
  name,
  description,
  view,
  basemap,
  marks,
  topLabels,
  chips = [],
  children,
  frameRef,
  onPointer,
  onPinKey,
  pinAria,
  pinDescribedBy,
  pinRef,
}: {
  kind: 'world' | 'inset';
  name: string;
  description: string;
  view: View;
  basemap: Basemap | null;
  marks: Marks;
  topLabels: TopLabel[];
  chips?: Chip[];
  children?: ReactNode;
  frameRef: RefObject<HTMLDivElement | null>;
  onPointer?: (p: LatLon, phase: Phase, onPin: boolean) => void;
  onPinKey?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  pinAria?: string;
  pinDescribedBy?: string;
  pinRef?: RefObject<HTMLButtonElement | null>;
}) {
  const drag = useRef<{ id: number; dx: number; dy: number; onPin: boolean } | null>(null);

  const at = (clientX: number, clientY: number): LatLon => {
    const r = frameRef.current!.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const fy = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    return { lat: latAt(view, fy), lon: lonAt(view, fx) };
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!onPointer || e.button !== 0) return;
    const onPin = Boolean((e.target as Element).closest('[data-pin]')) && Boolean(marks.pin);
    let dx = 0;
    let dy = 0;
    if (onPin && marks.pin) {
      const r = frameRef.current!.getBoundingClientRect();
      dx = e.clientX - (r.left + fracX(view, marks.pin.lon) * r.width);
      dy = e.clientY - (r.top + fracY(view, marks.pin.lat) * r.height);
    }
    drag.current = { id: e.pointerId, dx, dy, onPin };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    if (onPin && onPinKey) pinRef?.current?.focus({ preventScroll: true });
    onPointer(at(e.clientX - dx, e.clientY - dy), 'start', onPin);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !onPointer) return;
    onPointer(at(e.clientX - d.dx, e.clientY - d.dy), 'move', d.onPin);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !onPointer) return;
    drag.current = null;
    onPointer(at(e.clientX - d.dx, e.clientY - d.dy), 'end', d.onPin);
  };

  const copies = wrapCopies(view);
  const latS = viewBottom(view);
  const latN = viewTop(view);
  const westEdge = view.lon0 - view.w / 2;
  const eastEdge = view.lon0 + view.w / 2;
  const nonScaling = { vectorEffect: 'non-scaling-stroke' as const };

  const segs = zoneBoundarySegments().flatMap(([[x1, y1], [x2, y2]]) => {
    const dx = shiftNear(view, (x1 + x2) / 2);
    const a = x1 + dx;
    const b = x2 + dx;
    if (Math.max(a, b) < westEdge - 1 || Math.min(a, b) > eastEdge + 1) return [];
    if (Math.max(y1, y2) < latS - 1 || Math.min(y1, y2) > latN + 1) return [];
    return [[a, -y1, b, -y2]];
  });
  const outline = (z: number) => {
    const o = zoneOutline(z);
    const dx = shiftNear(view, (o[0][0] + o.at(-1)![0]) / 2);
    return o.map(([lon, lat]) => `${lon + dx},${-lat}`).join(' ');
  };
  const shiftRun = (run: [number, number][]) => {
    const dx = shiftNear(view, run[0][0]);
    return dx ? run.map(([lon, lat]) => [lon + dx, lat] as [number, number]) : run;
  };

  const pin = marks.pin;
  const pos = (lat: number, lon: number) => ({ left: `${(fracX(view, lon) * 100).toFixed(3)}%`, top: `${(fracY(view, lat) * 100).toFixed(3)}%` });

  return (
    <div className="min-w-0" data-map={kind}>
      {/* labels above the frame: zone numbers (world) or boundary longitudes (enlargement) */}
      <div dir="ltr" aria-hidden className="relative h-6 font-display text-[13px] leading-6">
        {topLabels.map((t) => (
          <span
            key={t.key}
            data-top-label={t.key}
            className={cn(
              'absolute -translate-x-1/2 whitespace-nowrap tabular-nums',
              // the chosen zone: black text (orange text is ≈ 3:1) over an orange bar
              t.tone === 'accent' ? 'border-b-[3px] border-accent font-bold text-black' : t.tone === 'strong' ? 'font-bold text-black' : 'font-semibold text-fg-muted',
            )}
            style={{ left: `${(Math.min(0.97, Math.max(0.03, t.fx)) * 100).toFixed(3)}%` }}
          >
            {t.text}
          </span>
        ))}
      </div>

      <div
        ref={frameRef}
        dir="ltr"
        role="group"
        aria-label={name}
        data-frame={kind}
        data-view={`${view.lon0},${view.lat0},${view.w},${view.h}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={cn(
          'relative aspect-[3/2] select-none touch-none overflow-hidden rounded-xl border border-border/70 bg-paper-card [container-type:inline-size]',
          onPointer && 'cursor-crosshair',
        )}
      >
        <div role="img" aria-label={description} className="absolute inset-0">
          <svg viewBox={viewBox(view)} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            {basemap && copies.map((dx) => <Land key={dx} basemap={basemap} dx={dx} kind={kind} />)}

            {/* outside UTM coverage: veiled, edged by dashed lines */}
            <rect x={westEdge - 1} y={-90} width={view.w + 2} height={90 - NORTH_LIMIT} className="fill-paper-card/75" />
            <rect x={westEdge - 1} y={-SOUTH_LIMIT} width={view.w + 2} height={90 + SOUTH_LIMIT} className="fill-paper-card/75" />
            {[NORTH_LIMIT, SOUTH_LIMIT].map((lat) => (
              // dotted: the coverage limit, apart from the dashed zone boundaries
              <line key={lat} x1={westEdge - 1} x2={eastEdge + 1} y1={-lat} y2={-lat} className="stroke-fg/60" strokeWidth={1.5} strokeDasharray="1 3" strokeLinecap="round" {...nonScaling} data-coverage={lat} />
            ))}

            {/* zone boundaries */}
            <g className={kind === 'world' ? 'stroke-fg/40' : 'stroke-fg/55'} strokeWidth={kind === 'world' ? 0.75 : 1.25} strokeDasharray={kind === 'inset' ? '6 5' : undefined}>
              {segs.map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} {...nonScaling} />
              ))}
            </g>

            {marks.focusZone != null && (
              <polygon
                points={outline(marks.focusZone)}
                data-focus-zone={marks.focusZone}
                className={cn(
                  marks.focusTone === 'pick' ? 'fill-brand/20 stroke-brand-dark' : kind === 'world' ? 'fill-accent/30 stroke-accent' : 'fill-accent/15 stroke-accent',
                )}
                strokeWidth={kind === 'world' ? 1.5 : 2}
                strokeDasharray={kind === 'inset' ? '7 5' : undefined}
                {...nonScaling}
              />
            )}

            {/* equator */}
            <line
              x1={westEdge - 1}
              x2={eastEdge + 1}
              y1={0}
              y2={0}
              data-equator={marks.equator ?? 'plain'}
              className={marks.equator === 'highlight' ? 'stroke-accent' : 'stroke-fg/55'}
              strokeWidth={marks.equator === 'highlight' ? 3 : 1}
              {...nonScaling}
            />

            {marks.greenwich && (
              <line x1={shiftNear(view, 0)} x2={shiftNear(view, 0)} y1={-NORTH_LIMIT} y2={-SOUTH_LIMIT} className="stroke-fg/80" strokeWidth={2.5} data-greenwich {...nonScaling} />
            )}

            {marks.grid?.map((g) =>
              g.runs.map((run, i) => (
                <polyline
                  key={`${g.kind}${g.hemisphere}${g.value}-${i}`}
                  points={svgPoints(shiftRun(run))}
                  fill="none"
                  data-grid-line={`${g.kind}:${g.value}`}
                  className={g.kind === 'e' && g.value === 500000 ? 'stroke-fg/80' : 'stroke-fg/50'}
                  strokeWidth={g.kind === 'e' && g.value === 500000 ? 2 : 1.25}
                  {...nonScaling}
                />
              )),
            )}

            {marks.boundary && (
              <line
                x1={marks.boundary.lon + shiftNear(view, marks.boundary.lon)}
                x2={marks.boundary.lon + shiftNear(view, marks.boundary.lon)}
                y1={-marks.boundary.n}
                y2={-marks.boundary.s}
                data-boundary={marks.boundary.lon}
                className="stroke-accent"
                strokeWidth={kind === 'world' ? 2.5 : 3.5}
                {...nonScaling}
              />
            )}

            {marks.readingLines &&
              (['up', 'across'] as const).map((k) => (
                <g key={k} data-reading-line={k}>
                  <polyline points={svgPoints(shiftRun(marks.readingLines![k]))} fill="none" className="stroke-bg-elevated/80" strokeWidth={4} {...nonScaling} />
                  <polyline points={svgPoints(shiftRun(marks.readingLines![k]))} fill="none" className="stroke-accent" strokeWidth={2} strokeDasharray="6 4" {...nonScaling} />
                </g>
              ))}

            {marks.locator &&
              [
                ['stroke-bg-elevated', 4.5],
                ['stroke-accent', 2],
              ].map(([cls, sw], i) => (
                <rect
                  key={i}
                  x={marks.locator!.lon0 - marks.locator!.w / 2}
                  y={-viewTop(marks.locator!)}
                  width={marks.locator!.w}
                  height={marks.locator!.h}
                  fill="none"
                  data-locator={i ? '' : undefined}
                  className={cls as string}
                  strokeWidth={sw as number}
                  {...nonScaling}
                />
              ))}
          </svg>

          {chips.map((c) => {
            const left = c.fx != null ? `${(c.fx * 100).toFixed(3)}%` : c.lon != null ? pos(0, c.lon).left : undefined;
            const top = c.fy != null ? `${(c.fy * 100).toFixed(3)}%` : c.lat != null ? pos(c.lat, 0).top : undefined;
            return (
              <span
                key={c.key}
                data-chip={c.key}
                className={cn(
                  'absolute whitespace-nowrap rounded-md px-1.5 py-0.5 font-display text-[13px] leading-tight tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.1)]',
                  c.tone === 'accent'
                    ? 'border border-accent bg-bg-elevated font-bold text-black'
                    : c.tone === 'strong'
                      ? 'bg-bg-elevated/90 font-bold text-black'
                      : 'bg-bg-elevated/85 font-semibold text-fg-muted',
                )}
                style={{ left, top, ...c.style }}
              >
                {c.children}
              </span>
            );
          })}
        </div>

        {children}

        {pin && (
          <button
            ref={pinRef}
            type="button"
            data-pin={pin.label}
            aria-label={pinAria}
            aria-describedby={pinDescribedBy}
            onKeyDown={onPinKey}
            tabIndex={onPinKey ? 0 : -1}
            aria-hidden={onPinKey ? undefined : true}
            className="group absolute z-[3] flex cursor-grab flex-col items-center rounded-full focus-visible:outline-none active:cursor-grabbing"
            style={{ ...pos(pin.lat, pin.lon), transform: 'translate(-50%, calc(-100% + 3px))' }}
          >
            <span
              className={cn(
                'grid place-items-center rounded-full border-2 border-bg-elevated bg-accent font-display font-bold leading-none text-bg-elevated shadow-[0_2px_6px_rgba(40,50,35,0.35)] ring-2 ring-accent',
                'group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-fg',
                kind === 'world' ? 'size-7 text-sm' : 'size-9 text-base',
              )}
            >
              {pin.label}
            </span>
            <span className={cn('w-0.5 bg-accent', kind === 'world' ? 'h-2' : 'h-3')} />
            <span className="-mt-px size-1.5 rounded-full bg-accent" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Land, large lakes and country boundaries — memoised so a moving point never re-renders ~40 000 vertices. */
const Land = memo(function Land({ basemap, dx, kind }: { basemap: Basemap; dx: number; kind: 'world' | 'inset' }) {
  return (
    <g transform={`translate(${dx} 0) scale(${1 / basemap.BASEMAP_UNIT})`} data-atlas-land>
      <path d={basemap.LAND_D} fillRule="evenodd" className="fill-brand/50 stroke-brand-dark/45" strokeWidth={kind === 'world' ? 0.5 : 0.75} vectorEffect="non-scaling-stroke" />
      <path d={basemap.LAKES_D} className="fill-paper-card stroke-brand-dark/35" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
      <path d={basemap.BORDERS_D} fill="none" className="stroke-paper-bright" strokeWidth={kind === 'world' ? 0.5 : 1} vectorEffect="non-scaling-stroke" />
    </g>
  );
});
