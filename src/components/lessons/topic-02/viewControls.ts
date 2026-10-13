'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useLessonViewportScale } from '@/components/lesson/LessonViewportFit';

/** Pointer travel (px) before a press becomes a drag: a shorter press stays a click (a station is picked). */
const DRAG_START = 5;

/**
 * Drag-to-turn on a stage. A press only becomes a drag once it has moved
 * DRAG_START px; only then is the pointer captured — so a short press on a
 * station pin is still that pin's click, and a drag that starts on a pin turns
 * the view and never picks a station when it ends (the release goes to the stage).
 * `onTurn` gets the movement (px) since the last call, in the stage's own px
 * (screen px ÷ the laptop fit's scale), so a drag turns the view as much at any fit.
 */
export function useDragTurn(onTurn: (dx: number, dy: number) => void, onStart?: () => void) {
  const s = useRef<{ id: number; x0: number; y0: number; x: number; y: number; on: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const turn = useRef(onTurn);
  turn.current = onTurn;
  const start = useRef(onStart);
  start.current = onStart;
  const fit = useRef(1);
  fit.current = useLessonViewportScale();

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    s.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, on: false };
  }, []);
  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const d = s.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.on) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_START) return;
      d.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      start.current?.();
    }
    turn.current((e.clientX - d.x) / fit.current, (e.clientY - d.y) / fit.current);
    d.x = e.clientX;
    d.y = e.clientY;
  }, []);
  const end = useCallback((e: PointerEvent<HTMLElement>) => {
    if (s.current?.id !== e.pointerId) return;
    s.current = null;
    setDragging(false);
  }, []);
  return { dragging, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end } };
}

/** Arrow keys on a focused stage: ←/→ turn round, ↑/↓ tilt. Returns true when it used the key. */
export function arrowTurn(e: KeyboardEvent<HTMLElement>, turn: (round: number, tilt: number) => void, step = { round: 10, tilt: 8 }) {
  const d = { ArrowLeft: [-step.round, 0], ArrowRight: [step.round, 0], ArrowUp: [0, step.tilt], ArrowDown: [0, -step.tilt] }[e.key];
  if (!d) return false;
  e.preventDefault();
  turn(d[0], d[1]);
  return true;
}

/**
 * A short eased move of a view state toward a goal (the preset buttons, the
 * "back to the opening view" button): at once under reduced motion. A drag or
 * key press calls stop() first, so the hand always wins.
 */
export function useTween<V>(get: () => V, set: (v: V) => void, lerp: (a: V, b: V, t: number) => V, reduce: boolean) {
  const raf = useRef(0);
  const stop = useCallback(() => cancelAnimationFrame(raf.current), []);
  const to = useCallback(
    (goal: V, ms = 650) => {
      cancelAnimationFrame(raf.current);
      if (reduce) {
        set(goal);
        return;
      }
      const from = get();
      const t0 = performance.now();
      const step = (t: number) => {
        const u = Math.min(1, (t - t0) / ms);
        set(lerp(from, goal, 1 - (1 - u) ** 3));
        if (u < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    },
    [get, set, lerp, reduce],
  );
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { to, stop };
}
