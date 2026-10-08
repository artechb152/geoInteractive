'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { SheetPoint } from './geo';
import { IDENTITY, clampView, panView, screenToUnits, zoomAt, type View } from './viewMath';

export const MIN_K = 1;
export const MAX_K = 3;
const ZOOM_MS = 320;

/** A view to open with: zoom `k` about `center` (sheet units, default the sheet centre 500,500). */
export type InitialView = { k: number; center?: SheetPoint };

/** The view that shows `center` in the middle of a `size` px square at zoom k, clamped like any view. */
export function viewAround({ k, center = { x: 500, y: 500 } }: InitialView, size: number): View {
  const kk = Math.min(MAX_K, Math.max(MIN_K, k));
  return clampView({ k: kk, x: size / 2 - (center.x / 1000) * size * kk, y: size / 2 - (center.y / 1000) * size * kk }, size, MIN_K, MAX_K);
}

/**
 * Zoom/pan state for one square viewport. Changes of layer never touch it (spec §8); the owner calls
 * `resetNow()` (or `resetNow(view)`) when the sheet changes. Wheel zoom passes through at the limits so the page still scrolls.
 * `initial` is applied once, right after the first size measurement.
 */
export function useMapView(ref: RefObject<HTMLElement | null>, initial?: InitialView) {
  const reduce = !!useReducedMotion();
  const [view, setView] = useState<View>(IDENTITY);
  const [size, setSize] = useState(1);
  const viewRef = useRef(view);
  viewRef.current = view;
  const raf = useRef(0);
  const initialRef = useRef(initial);

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
        setView(viewAround(first, s));
        return;
      }
      const r = s / old;
      setView((v) => clampView({ k: v.k, x: v.x * r, y: v.y * r }, s, MIN_K, MAX_K));
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
    (factor: number) => animateTo(zoomAt(viewRef.current, factor, size / 2, size / 2, size, MIN_K, MAX_K)),
    [animateTo, size],
  );
  const panBy = useCallback(
    (dx: number, dy: number) => {
      cancelAnimationFrame(raf.current);
      setView((v) => panView(v, dx, dy, size, MIN_K, MAX_K));
    },
    [size],
  );
  const reset = useCallback(() => animateTo(IDENTITY), [animateTo]);
  /** Jump (no animation) to the full sheet, or to `to` once the size is known. */
  const resetNow = useCallback((to?: InitialView) => {
    cancelAnimationFrame(raf.current);
    setView(to && sizeRef.current > 1 ? viewAround(to, sizeRef.current) : IDENTITY);
  }, []);

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
      if (e.deltaY === 0 || (e.deltaY < 0 && k >= MAX_K) || (e.deltaY > 0 && k <= MIN_K)) return;
      e.preventDefault();
      cancelAnimationFrame(raf.current);
      const r = el.getBoundingClientRect();
      setView(zoomAt(viewRef.current, Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top, el.clientWidth || 1, MIN_K, MAX_K));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);

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
    zoomBy,
    panBy,
    reset,
    resetNow,
    toUnits,
    wasDragged: () => dragged.current,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer, onKeyDown },
  };
}
