import { useLatestRef } from './useLatestRef';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * useZoomPan — זום והזזה על מרובע ריבועי.
 *
 * העיקרון: כל השכבות (שתי התמונות + שכבת ה-SVG) יושבות בתוך אלמנט "עולם"
 * אחד שמקבל `transform` יחיד. לכן אזורי הלחיצה נשארים מיושרים לתמונה בכל
 * רמת זום — לא צריך להתמיר קואורדינטות בשום מקום אחר בקוד.
 *
 * מערכת הצירים: נקודה במרחב ה-viewBox (0..1000) ממופה לפיקסלי מסך לפי
 *   screen = (p / 1000) * size * k + offset
 */

export interface View {
  k: number;
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const IDENTITY: View = { k: 1, x: 0, y: 0 };

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return reduced;
}

interface Options {
  min?: number;
  max?: number;
  /** נקרא בכל שינוי זום שהמשתמש יזם — להכרזה לקורא מסך. */
  onZoomChange?: (k: number) => void;
}

export function useZoomPan(
  containerRef: React.RefObject<HTMLElement>,
  { min = 1, max = 6, onZoomChange }: Options = {},
) {
  const [view, setViewState] = useState<View>(IDENTITY);
  const viewRef = useLatestRef(view);
  const rafRef = useRef(0);
  const reduced = usePrefersReducedMotion();

  const sizeOf = useCallback(() => {
    const el = containerRef.current;
    return el ? el.clientWidth || 1 : 1;
  }, [containerRef]);

  /** מונע "חלונות ריקים": העולם חייב לכסות את המרובע בכל רגע. */
  const clamp = useCallback(
    (v: View): View => {
      const size = sizeOf();
      const k = Math.min(max, Math.max(min, v.k));
      const span = size * k;
      const lo = size - span; // ערך שלילי או 0
      return {
        k,
        x: Math.min(0, Math.max(lo, v.x)),
        y: Math.min(0, Math.max(lo, v.y)),
      };
    },
    [max, min, sizeOf],
  );

  const setView = useCallback(
    (next: View | ((v: View) => View)) => {
      setViewState((prev) => {
        const raw = typeof next === 'function' ? next(prev) : next;
        return clamp(raw);
      });
    },
    [clamp],
  );

  /** מעבר רך אל תצוגה — מכבד העדפת תנועה מופחתת. */
  const animateTo = useCallback(
    (target: View) => {
      cancelAnimationFrame(rafRef.current);
      const goal = clamp(target);
      if (reduced) {
        setViewState(goal);
        return;
      }
      const from = viewRef.current;
      const t0 = performance.now();
      const dur = 320;
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - (1 - t) ** 3;
        setViewState({
          k: from.k + (goal.k - from.k) * e,
          x: from.x + (goal.x - from.x) * e,
          y: from.y + (goal.y - from.y) * e,
        });
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [clamp, reduced],
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /** זום סביב נקודת מסך (יחסית לפינת המרובע). */
  const zoomAround = useCallback(
    (factor: number, sx: number, sy: number, animate = false) => {
      const v = viewRef.current;
      const k = Math.min(max, Math.max(min, v.k * factor));
      if (k === v.k) return;
      const ratio = k / v.k;
      const next = { k, x: sx - (sx - v.x) * ratio, y: sy - (sy - v.y) * ratio };
      if (animate) animateTo(next);
      else setView(next);
      onZoomChange?.(k);
    },
    [animateTo, max, min, onZoomChange, setView],
  );

  /** זום ממרכז המרובע — לכפתורים ולמקלדת. */
  const zoomByCenter = useCallback(
    (factor: number) => {
      const size = sizeOf();
      zoomAround(factor, size / 2, size / 2, true);
    },
    [sizeOf, zoomAround],
  );

  const reset = useCallback(() => {
    animateTo(IDENTITY);
    onZoomChange?.(1);
  }, [animateTo, onZoomChange]);

  /**
   * מרכוז וזום אל מלבן במרחב ה-viewBox (0..1000).
   * `yFraction` מאפשר להעמיד את הצורה בשליש העליון במקום במרכז — כך היא
   * נשארת גלויה כשהכרטיס נפתח כמגירה תחתונה במסך צר.
   */
  const zoomToRect = useCallback(
    (
      rect: Rect,
      { padding = 1.9, yFraction = 0.5 }: { padding?: number; yFraction?: number } = {},
    ) => {
      const size = sizeOf();
      const w = Math.max(rect.width, 40) * padding;
      const h = Math.max(rect.height, 40) * padding;
      const k = Math.min(max, Math.max(min, 1000 / Math.max(w, h)));
      const cx = ((rect.x + rect.width / 2) / 1000) * size * k;
      const cy = ((rect.y + rect.height / 2) / 1000) * size * k;
      animateTo({ k, x: size / 2 - cx, y: size * yFraction - cy });
      onZoomChange?.(k);
    },
    [animateTo, max, min, onZoomChange, sizeOf],
  );

  /** הזזה יחסית בפיקסלים — לחיצי המקלדת. */
  const panBy = useCallback(
    (dx: number, dy: number) => setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
    [setView],
  );

  /* ------------------------- אירועי מצביע ------------------------- */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const dragged = useRef(false);

  const local = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    },
    [containerRef],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointers.current.set(e.pointerId, local(e));
      dragged.current = false;
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
        };
      }
    },
    [local],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const prev = pointers.current.get(e.pointerId)!;
      const now = local(e);
      pointers.current.set(e.pointerId, now);

      if (pointers.current.size >= 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        dragged.current = true;
        zoomAround(d / pinch.current.dist, cx, cy);
        pinch.current = { dist: d, cx, cy };
        return;
      }
      if (viewRef.current.k <= 1) return;
      const dx = now.x - prev.x;
      const dy = now.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 1.5) dragged.current = true;
      panBy(dx, dy);
    },
    [local, panBy, zoomAround],
  );

  const endPointer = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }, []);

  /**
   * גלגלת = זום. `passive: false` מחייב האזנה ידנית — React מרשם wheel
   * כ-passive ולכן `preventDefault` בתוך onWheel של React אינו עובד.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        zoomAround(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [containerRef, zoomAround]);

  // שינוי גודל החלון עלול להוציא את התצוגה מהגבולות
  useEffect(() => {
    const onResize = () => setView((v) => v);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setView]);

  const style = useMemo(
    () => ({
      transform: `translate(${view.x.toFixed(2)}px, ${view.y.toFixed(2)}px) scale(${view.k.toFixed(4)})`,
      transformOrigin: '0 0',
    }),
    [view],
  );

  return {
    view,
    style,
    zoomByCenter,
    zoomToRect,
    reset,
    panBy,
    /** true אם התנועה האחרונה הייתה גרירה — כדי לא לפרש אותה כלחיצה. */
    wasDragged: () => dragged.current,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer,
    },
  };
}
