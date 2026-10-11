'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { SheetPoint } from './geo';
import { IDENTITY, clampView, nestIn, panView, screenToUnits, zoomAt, type View } from './viewMath';

export const MIN_K = 1;
export const MAX_K = 3;
const ZOOM_MS = 320;

/** A view to open with: zoom `k` about `center` (sheet units, default the sheet centre 500,500). */
export type InitialView = { k: number; center?: SheetPoint; /** On a sheet switch: zoom by this factor right after opening. */ thenZoom?: number };

/** The view that shows `center` in the middle of a `size` px square at zoom k, clamped like any view. */
export function viewAround({ k, center = { x: 500, y: 500 } }: InitialView, size: number, maxK = MAX_K): View {
  const kk = Math.min(maxK, Math.max(MIN_K, k));
  return clampView({ k: kk, x: size / 2 - (center.x / 1000) * size * kk, y: size / 2 - (center.y / 1000) * size * kk }, size, MIN_K, maxK);
}

export type MapViewOptions = {
  /** Deepest zoom (default MAX_K). */
  maxK?: number;
  /** Called instead of zooming out at k = 1: `step` for − and the zoom-out button, false for the wheel. */
  onZoomOutPast?: (step: boolean) => void;
  /**
   * A smaller sheet's extent (sheet units [x0, y0, x1, y1]), handed over to from k > minK. Wheeling in with
   * the cursor inside it steers the view toward it and, from minK, settles the view inside it — so the
   * hand-over happens even when the zoom did not start lined up with the frame.
   */
  zoomInRect?: { rect: [number, number, number, number]; minK: number };
};

/**
 * Zoom/pan state for one square viewport. Changes of layer never touch it (spec §8); the owner calls
 * `resetNow()` (or `resetNow(view)`) when the sheet changes. Over the map the wheel never scrolls the page, even at the zoom limits.
 * `initial` is applied once, right after the first size measurement.
 */
export function useMapView(ref: RefObject<HTMLElement | null>, initial?: InitialView, opts: MapViewOptions = {}) {
  const reduce = !!useReducedMotion();
  const [view, setView] = useState<View>(IDENTITY);
  const [size, setSize] = useState(1);
  const viewRef = useRef(view);
  viewRef.current = view;
  const raf = useRef(0);
  const initialRef = useRef(initial);
  const maxK = opts.maxK ?? MAX_K;
  const maxKRef = useRef(maxK);
  maxKRef.current = maxK;
  const outPastRef = useRef(opts.onZoomOutPast);
  outPastRef.current = opts.onZoomOutPast;
  const inRectRef = useRef(opts.zoomInRect);
  inRectRef.current = opts.zoomInRect;

  const sizeRef = useRef(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const s = el.clientWidth || 1;
      const old = sizeRef.current;
      if (s === old) return;
      sizeRef.current = s;
      setSize(s);
      const first = initialRef.current;
      if (old === 1 && s > 1 && first) {
        initialRef.current = undefined;
        setView(viewAround(first, s, maxKRef.current));
        return;
      }
      const r = s / old;
      setView((v) => clampView({ k: v.k, x: v.x * r, y: v.y * r }, s, MIN_K, maxKRef.current));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  const animateTo = useCallback(
    (goal: View) => {
      cancelAnimationFrame(raf.current);
      if (reduce) {
        setView(goal);
        return;
      }
      const from = viewRef.current;
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / ZOOM_MS);
        const e = 1 - (1 - t) ** 3;
        setView({ k: from.k + (goal.k - from.k) * e, x: from.x + (goal.x - from.x) * e, y: from.y + (goal.y - from.y) * e });
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [reduce],
  );
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const zoomBy = useCallback(
    (factor: number) => {
      if (factor < 1 && viewRef.current.k <= MIN_K + 1e-3 && outPastRef.current) {
        outPastRef.current(true);
        return;
      }
      animateTo(zoomAt(viewRef.current, factor, size / 2, size / 2, size, MIN_K, maxKRef.current));
    },
    [animateTo, size],
  );
  const panBy = useCallback(
    (dx: number, dy: number) => {
      cancelAnimationFrame(raf.current);
      setView((v) => panView(v, dx, dy, size, MIN_K, maxKRef.current));
    },
    [size],
  );
  const reset = useCallback(() => animateTo(IDENTITY), [animateTo]);
  /** Jump (no animation) to the full sheet, or to `to` once the size is known. */
  const resetNow = useCallback((to?: InitialView) => {
    cancelAnimationFrame(raf.current);
    const next = to && sizeRef.current > 1 ? viewAround(to, sizeRef.current, maxKRef.current) : IDENTITY;
    // Synchronously, so a zoom started right after the jump animates from it.
    viewRef.current = next;
    setView(next);
  }, []);

  const getView = useCallback(() => viewRef.current, []);

  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    dragged.current = false;
  }, []);
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      if ((e.buttons & 1) === 0) {
        drag.current = null;
        return;
      }
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      if (!d.moved) {
        d.moved = true;
        dragged.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      d.x = e.clientX;
      d.y = e.clientY;
      if (viewRef.current.k > MIN_K) panBy(dx, dy);
    },
    [panBy],
  );
  const endPointer = useCallback((e: PointerEvent<HTMLElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const k = viewRef.current.k;
      if (e.deltaY > 0 && k <= MIN_K + 1e-3 && outPastRef.current) {
        e.preventDefault();
        cancelAnimationFrame(raf.current);
        outPastRef.current(false);
        return;
      }
      if (e.deltaY === 0) return;
      // Over the map the wheel only zooms: at a limit it does nothing (the page does not scroll).
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const s = el.clientWidth || 1;
      const zr = inRectRef.current;
      if (zr && e.deltaY < 0) {
        const p = screenToUnits(viewRef.current, sx, sy, s);
        const [x0, y0, x1, y1] = zr.rect;
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) {
          const next = zoomAt(viewRef.current, Math.exp(-e.deltaY * 0.0016), sx, sy, s, MIN_K, maxKRef.current);
          if (next.k > zr.minK) {
            // Small enough to fit: settle inside the frame (the hand-over follows).
            animateTo(nestIn(next, zr.rect, s));
            return;
          }
          // Still larger than the frame: pull part of the way toward keeping it whole in sight.
          cancelAnimationFrame(raf.current);
          const goal = nestIn(next, zr.rect, s);
          const a = Math.min(1, Math.abs(e.deltaY) * 0.005);
          setView({ k: next.k, x: next.x + (goal.x - next.x) * a, y: next.y + (goal.y - next.y) * a });
          return;
        }
      }
      if ((e.deltaY < 0 && k >= maxKRef.current) || (e.deltaY > 0 && k <= MIN_K)) return;
      cancelAnimationFrame(raf.current);
      setView(zoomAt(viewRef.current, Math.exp(-e.deltaY * 0.0016), sx, sy, s, MIN_K, maxKRef.current));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref, animateTo]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target !== e.currentTarget) return; // handles and buttons inside manage their own keys
      const step = size * 0.1;
      switch (e.key) {
        case '+':
        case '=':
          zoomBy(1.5);
          break;
        case '-':
        case '_':
          zoomBy(1 / 1.5);
          break;
        case '0':
          reset();
          break;
        case 'ArrowLeft':
          if (viewRef.current.k <= MIN_K) return;
          panBy(step, 0);
          break;
        case 'ArrowRight':
          if (viewRef.current.k <= MIN_K) return;
          panBy(-step, 0);
          break;
        case 'ArrowUp':
          if (viewRef.current.k <= MIN_K) return;
          panBy(0, step);
          break;
        case 'ArrowDown':
          if (viewRef.current.k <= MIN_K) return;
          panBy(0, -step);
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [panBy, reset, size, zoomBy],
  );

  const toUnits = useCallback(
    (clientX: number, clientY: number): SheetPoint => {
      const el = ref.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return screenToUnits(viewRef.current, clientX - r.left, clientY - r.top, el.clientWidth || 1);
    },
    [ref],
  );

  return {
    view,
    size,
    maxK,
    zoomBy,
    panBy,
    reset,
    resetNow,
    toUnits,
    /** The current view, including a jump made by resetNow that has not rendered yet. */
    getView,
    wasDragged: () => dragged.current,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer, onKeyDown },
  };
}
