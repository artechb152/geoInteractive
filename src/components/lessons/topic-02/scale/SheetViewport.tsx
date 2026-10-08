'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistance, formatNumber, niceScaleBar, SHEET_UNITS, type SheetPoint } from './geo';
import { MAX_K, MIN_K, useMapView, type InitialView } from './useMapView';
import { screenToUnits } from './viewMath';
import { FOCUS_RING } from './controls';

const EASE = [0.22, 1, 0.36, 1] as const;
const MORPH_S = 0.6;
/** Quiet time after the last zoom frame before the zoom level is announced. */
const ZOOM_SETTLE_MS = 400;

export type LayerSpec = { key: string; src: string; /** Extra magnification about the sheet centre (screen D). */ magnify?: number };
export type OverlayContext = {
  k: number;
  ppu: number;
  toUnits: (clientX: number, clientY: number) => SheetPoint;
  /** The sheet point at the centre of the visible square. */
  center: SheetPoint;
};
export type CurtainProps = { value: number; onChange: (v: number) => void; leftLabel: string; rightLabel: string };

type Props = {
  id?: string;
  label: string;
  /** Changing it = a different sheet: plays the centred scale morph and resets zoom/pan (to `initialView`, else k = 1). */
  sheetKey: string;
  groundWidthM: number;
  base: LayerSpec;
  top: LayerSpec;
  display: 'base' | 'top' | 'curtain';
  curtain?: CurtainProps;
  attribution: string;
  preload?: string[];
  onPick?: (p: SheetPoint) => void;
  overlay?: (ctx: OverlayContext) => ReactNode;
  /** One T6 line under the map. */
  note?: ReactNode;
  /**
   * Opening view of the sheet (centre defaults to the sheet centre), clamped: applied after the first
   * measurement and again whenever `sheetKey` changes (without it a new sheet opens at k = 1).
   */
  initialView?: InitialView;
  /** The measured side of the square in CSS px, reported after layout and on every resize (1 sheet cm = px / 24). */
  onSize?: (px: number) => void;
};

/**
 * The square map of the scale scenes. Every layer and the SVG overlay sit under ONE transform
 * (zoom/pan), so markers stay on the ground in every representation. The curtain clips outside that
 * transform, so its line stays put while the map pans under it. Map furniture uses physical
 * left/right on purpose — maps are never mirrored (accepted exception, design/docs/assumptions.md).
 */
export function SheetViewport({
  id, label, sheetKey, groundWidthM, base, top, display, curtain, attribution, preload, onPick, overlay, note, initialView, onSize,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const reduce = !!useReducedMotion();
  const map = useMapView(ref, initialView);
  const { view, size } = map;
  const inView = useInView(ref, { margin: '300px', once: true });
  const preloadKey = (preload ?? []).join('|');

  useEffect(() => {
    if (!inView || !preloadKey) return;
    for (const src of preloadKey.split('|')) {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    }
  }, [inView, preloadKey]);

  // Report the measured size (K1): screens draw true-to-sheet lengths from it.
  const onSizeRef = useRef(onSize);
  onSizeRef.current = onSize;
  useLayoutEffect(() => {
    if (size > 1) onSizeRef.current?.(size);
  }, [size]);

  // Zoom status for screen readers: announced once the zoom settles, never at mount (nor for the opening view).
  const [zoomNote, setZoomNote] = useState('');
  const settledK = useRef<number | null>(null);
  useEffect(() => {
    if (size <= 1) return;
    const t = window.setTimeout(() => {
      const k = view.k;
      if (settledK.current !== null && Math.abs(k - settledK.current) > 1e-3) setZoomNote(`תקריב ×${formatNumber(k, 1)}`);
      settledK.current = k;
    }, ZOOM_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [view.k, size]);

  // Scale morph (spec §6.1): the outgoing picture scales by the width ratio and fades while the incoming
  // one grows from 1/ratio to 1 — both about the shared centre, so the ground lines up throughout.
  const shownSrc = display === 'base' ? base.src : top.src;
  const last = useRef({ key: sheetKey, w: groundWidthM, src: shownSrc });
  const changed = last.current.key !== sheetKey;
  const enterRatio = changed ? last.current.w / groundWidthM : 1;
  const [ghost, setGhost] = useState<{ id: string; src: string; ratio: number } | null>(null);
  const { resetNow } = map;
  const initialViewRef = useRef(initialView);
  initialViewRef.current = initialView;
  useLayoutEffect(() => {
    const prev = last.current;
    if (prev.key !== sheetKey) {
      resetNow(initialViewRef.current);
      setGhost(reduce ? null : { id: `${prev.key}->${sheetKey}`, src: prev.src, ratio: prev.w / groundWidthM });
    }
    last.current = { key: sheetKey, w: groundWidthM, src: shownSrc };
  }, [sheetKey, groundWidthM, shownSrc, reduce, resetNow]);

  const world = { transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: '0 0' };
  const ppu = (size * view.k) / SHEET_UNITS;
  const bar = niceScaleBar(groundWidthM / (size * view.k), size * 0.2);
  const cut = (curtain?.value ?? 0.5) * 100;
  const topStyle =
    display === 'base' ? { opacity: 0 } : display === 'top' ? { opacity: 1 } : { opacity: 1, clipPath: `inset(0 0 0 ${cut}%)` };

  return (
    <div>
      <div
        ref={ref}
        id={id}
        role="group"
        aria-roledescription="מפה"
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={0}
        data-qa="sheet-viewport"
        data-view={`${view.k.toFixed(3)},${view.x.toFixed(1)},${view.y.toFixed(1)}`}
        className={cn(
          'relative aspect-square w-full touch-none select-none overflow-hidden rounded-xl bg-paper-card',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated',
          view.k > MIN_K ? 'cursor-grab active:cursor-grabbing' : onPick ? 'cursor-crosshair' : 'cursor-default',
        )}
        {...map.handlers}
        // Focusing a handle outside the visible area would scroll this overflow-hidden box and shift the
        // map against its transform; the view only moves through zoom/pan.
        onScroll={(e) => {
          e.currentTarget.scrollLeft = 0;
          e.currentTarget.scrollTop = 0;
        }}
        onClick={(e) => {
          if (!onPick || map.wasDragged()) return;
          onPick(map.toUnits(e.clientX, e.clientY));
        }}
      >
        <motion.div
          key={sheetKey}
          className="absolute inset-0"
          style={{ transformOrigin: '50% 50%' }}
          initial={changed && !reduce ? { scale: 1 / enterRatio } : false}
          animate={{ scale: 1 }}
          transition={{ duration: MORPH_S, ease: EASE }}
        >
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={world}>
              <LayerImg layer={base} />
            </div>
          </div>
          <div className="absolute inset-0 transition-opacity duration-200 ease-snap motion-reduce:transition-none" style={topStyle}>
            <div className="absolute inset-0" style={world}>
              <LayerImg layer={top} />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0" style={world}>
            <svg viewBox="0 0 1000 1000" className="absolute inset-0 size-full overflow-visible">
              {size > 1 && overlay?.({ k: view.k, ppu, toUnits: map.toUnits, center: screenToUnits(view, size / 2, size / 2, size) })}
            </svg>
          </div>
        </motion.div>

        {ghost && (
          <motion.img
            key={ghost.id}
            data-qa="morph-ghost"
            src={ghost.src}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full"
            style={{ transformOrigin: '50% 50%' }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: ghost.ratio, opacity: 0 }}
            transition={{ duration: MORPH_S, ease: EASE }}
            onAnimationComplete={() => setGhost(null)}
          />
        )}

        {display === 'curtain' && curtain && <CurtainLine {...curtain} frame={ref} size={size} />}
        <NorthArrow />
        {/* The bar describes the sheet on screen; mid-morph two sheets are visible, so it waits for the morph to end. */}
        {size > 1 && !ghost && <ScaleBar meters={bar.meters} px={bar.px} />}
        <ZoomButtons k={view.k} onIn={() => map.zoomBy(1.5)} onOut={() => map.zoomBy(1 / 1.5)} onReset={map.reset} />
      </div>

      {display === 'curtain' && curtain && <CurtainSlider {...curtain} />}
      <p id={hintId} data-qa="map-hint" className="mt-2 text-sm leading-snug text-fg-muted">
        להתקרבות: גלגלת העכבר או מקשי + ו־−. חיצים להזזה כשהמפה מוגדלת, 0 לאיפוס.
      </p>
      {note && <p className="mt-1 text-sm leading-snug text-fg-muted">{note}</p>}
      <p className="mt-1 text-[13px] leading-snug text-fg-muted">{attribution}</p>
      <p data-qa="zoom-status" aria-live="polite" className="sr-only">
        {zoomNote}
      </p>
    </div>
  );
}

function LayerImg({ layer }: { layer: LayerSpec }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- georeferenced raster inside a CSS-transformed stack; next/image would break the 1:1 sheet mapping
    <img
      src={layer.src}
      alt=""
      draggable={false}
      decoding="async"
      className="absolute inset-0 size-full select-none"
      style={layer.magnify ? { transform: `scale(${layer.magnify})`, transformOrigin: '50% 50%' } : undefined}
    />
  );
}

/** Map convention: the bar runs from its left end ("0") to the value at its right end, so the box is LTR. */
function ScaleBar({ meters, px }: { meters: number; px: number }) {
  return (
    <div
      aria-hidden
      dir="ltr"
      data-qa="scale-bar"
      className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-bg-elevated/90 px-2.5 pb-2 pt-1.5 shadow-sm"
    >
      <div className="mb-1 flex items-end justify-between gap-2 text-[13px] font-display font-semibold leading-none text-fg tabular-nums" style={{ width: px }}>
        <span data-qa="scale-bar-zero">0</span>
        {/* Hebrew unit: an RTL isolate keeps "500 מ׳" reading naturally; the number ends at the bar's end. */}
        <bdi dir="rtl" data-qa="scale-bar-value">
          {formatDistance(meters)}
        </bdi>
      </div>
      <div className="flex h-1.5 border border-fg" style={{ width: px }}>
        <span className="h-full w-1/2 bg-fg" />
      </div>
    </div>
  );
}

function NorthArrow() {
  return (
    <div aria-hidden className="pointer-events-none absolute left-3 top-3 flex flex-col items-center gap-0.5 rounded-lg bg-bg-elevated/90 px-1.5 py-1 shadow-sm">
      <span className="text-[13px] font-display font-bold leading-none text-fg">צ</span>
      <svg width="12" height="16" viewBox="0 0 12 16">
        <path d="M6 0 L12 16 L6 12 L0 16 Z" fill="#38432E" />
      </svg>
    </div>
  );
}

function ZoomButtons({ k, onIn, onOut, onReset }: { k: number; onIn: () => void; onOut: () => void; onReset: () => void }) {
  // At a limit the button stays opaque (it sits on the map) and only its icon and cursor dim.
  const btn = cn(
    'flex size-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-fg shadow-sm transition-colors duration-200 ease-snap hover:border-brand/30',
    'aria-disabled:cursor-not-allowed aria-disabled:text-fg-dim aria-disabled:hover:border-border',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  );
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const atMax = k >= MAX_K - 1e-3;
  const atMin = k <= MIN_K + 1e-3;
  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1.5" onPointerDown={stop} onClick={stop} onKeyDown={stop}>
      <button type="button" className={btn} aria-label="התקרבות" aria-disabled={atMax} onClick={atMax ? undefined : onIn}>
        <Plus size={18} aria-hidden />
      </button>
      <button type="button" className={btn} aria-label="התרחקות" aria-disabled={atMin} onClick={atMin ? undefined : onOut}>
        <Minus size={18} aria-hidden />
      </button>
      <button type="button" className={btn} aria-label="איפוס התצוגה" aria-disabled={atMin} onClick={atMin ? undefined : onReset}>
        <RotateCcw size={16} aria-hidden />
      </button>
    </div>
  );
}

// Curtain chips, in screen px. Each chip hangs off the line on its own side, CHIP_GAP away from it. The north
// arrow box (12 px from the top-left corner, 24 × 39 px) ends at x = 36, y = 51: a left chip that would reach
// under it drops below it.
const CHIP_GAP = 8;
const NORTH_CLEAR_X = 36 + 8;
const NORTH_DROP_Y = 51 + 8;

function CurtainLine({
  value, onChange, leftLabel, rightLabel, frame, size,
}: CurtainProps & { frame: RefObject<HTMLDivElement | null>; size: number }) {
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    onChange(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  // Chip widths are measured (font metrics), and re-measured if they change.
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;
    const measure = () => setW((cur) => (cur[0] === l.offsetWidth && cur[1] === r.offsetWidth ? cur : [l.offsetWidth, r.offsetWidth]));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(l);
    ro.observe(r);
    return () => ro.disconnect();
  }, [leftLabel, rightLabel]);

  const x = value * size;
  // A chip shows only when its half has room for it plus the gap on both sides (it never crosses the line).
  const leftFits = x >= w[0] + 2 * CHIP_GAP;
  const rightFits = size - x >= w[1] + 2 * CHIP_GAP;
  const leftDrop = x - CHIP_GAP - w[0] < NORTH_CLEAR_X;
  const chip =
    'pointer-events-none absolute top-3 whitespace-nowrap rounded-full border border-border bg-bg-elevated/95 px-2.5 py-1 text-[13px] font-display font-bold text-fg';
  return (
    <>
      <div aria-hidden data-qa="curtain-line" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(56,67,46,0.35)]" style={{ left: `${value * 100}%` }} />
      <div
        aria-hidden
        data-qa="curtain-handle"
        className="absolute top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full border-2 border-accent bg-bg-elevated shadow-elevated"
        style={{ left: `${value * 100}%` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="18" height="12" viewBox="0 0 18 12">
          <path d="M6 1 L1 6 L6 11 M12 1 L17 6 L12 11" fill="none" stroke="#38432E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span
        ref={leftRef}
        aria-hidden
        data-qa="curtain-chip-left"
        data-shown={leftFits}
        className={cn(chip, !leftFits && 'invisible')}
        style={{ right: `calc(${(1 - value) * 100}% + ${CHIP_GAP}px)`, top: leftDrop ? NORTH_DROP_Y : undefined }}
      >
        {leftLabel}
      </span>
      <span
        ref={rightRef}
        aria-hidden
        data-qa="curtain-chip-right"
        data-shown={rightFits}
        className={cn(chip, !rightFits && 'invisible')}
        style={{ left: `calc(${value * 100}% + ${CHIP_GAP}px)` }}
      >
        {rightLabel}
      </span>
    </>
  );
}

/**
 * The keyboard alternative to the handle, as wide as the map. The track is widened by the thumb width so the
 * thumb's centre sits under the curtain line at every value (0 → left edge, 100 → right edge).
 */
function CurtainSlider({ value, onChange, leftLabel, rightLabel }: CurtainProps) {
  const inputId = useId();
  return (
    <div className="mt-3">
      <label htmlFor={inputId} className="block text-sm font-display font-semibold text-fg-muted">
        מיקום הווילון
      </label>
      <input
        id={inputId}
        type="range"
        dir="ltr"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-valuetext={`${Math.round(value * 100)}% — ${leftLabel} משמאל לקו, ${rightLabel} מימין לקו`}
        className={cn('-mx-2 mt-1 block w-[calc(100%+16px)] rounded-full accent-accent', FOCUS_RING)}
      />
    </div>
  );
}
