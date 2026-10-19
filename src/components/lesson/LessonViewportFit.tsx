'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MotionConfig, type Point } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * LessonViewportFit — shrinks one lesson composition uniformly, like a slide,
 * so the whole composition fits the space a laptop screen actually leaves for
 * it. It never enlarges: on a screen with room for the reference composition
 * the scale is 1 and nothing is transformed.
 *
 *   scale = min(1, availableWidth / referenceWidth, availableHeight / referenceHeight)
 *
 * How it works
 *   - The children are always laid out at exactly `referenceWidth` px, so
 *     their internal layout and every line break stay identical to the
 *     reference composition. Only a CSS `transform: scale()` shrinks them.
 *   - The wrapper's footprint in the page is set to the SCALED size (width
 *     and height), so the page below moves up and no empty band is left
 *     where the unscaled composition used to be. Nothing is clipped — there
 *     is no `overflow: hidden` anywhere in this component.
 *   - Available width = the content width of the wrapper itself (it is
 *     `w-full`), so the site header, the lesson side nav, the column
 *     max-width and every padding are already subtracted by the real layout.
 *   - Available height = viewport height − `reserveTop` − `reserveBottom`.
 *     Both default to `'auto'`, measured from layout (transform-free, so the
 *     scene enter animation in PagedLearn doesn't skew it):
 *       · `reserveTop: 'auto'` — the wrapper's distance from the top of the
 *         document: header offset, shell paddings and anything rendered
 *         above the composition.
 *       · `reserveBottom: 'auto'` — everything that sits below the wrapper
 *         inside the closest `<main>`: following siblings at every level
 *         (e.g. PagedLearn's prev/next row) and the ancestors' bottom
 *         paddings. Free space created by a `min-height` is ignored.
 *     Pass a number (px) instead when the composition is vertically centered
 *     or otherwise positioned by its own height (the measured position would
 *     then depend on the scale).
 *   - Re-measures on window resize and whenever the composition, or the
 *     content around it, changes size — an opened accordion or a feedback
 *     panel included.
 *
 * Interaction inside the scaled composition
 *   - Clicks, keyboard, focus, SVG and anything that maps pointer
 *     coordinates through `getBoundingClientRect()` ratios keep working.
 *   - framer-motion `drag` / pan / layout animations are corrected
 *     automatically (a `MotionConfig` with `transformPagePoint` is provided).
 *   - Custom pointer code that turns screen-px deltas into local px must
 *     divide by `useLessonViewportScale()`.
 *   - A react-three-fiber `<Canvas>` must measure its untransformed size:
 *     `<Canvas resize={LESSON_FIT_CANVAS_RESIZE}>`. Without it the canvas
 *     sizes itself from the already-scaled rect and is shrunk twice.
 *   - Below scale 1 the composition is a transformed box: `position: fixed`
 *     descendants become relative to it. Portal overlays to `document.body`.
 *
 * Content rules: the composition must not size itself from the viewport —
 * no `vw`/`vh`/`dvh` units and no breakpoint variants that differ across
 * the laptop range (`2xl:` starts at 1536px). Freeze such values to their
 * reference-viewport result while the composition is wrapped.
 *
 * Don't nest one LessonViewportFit inside another.
 */

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const LessonViewportScaleContext = createContext(1);

/** Current scale of the enclosing LessonViewportFit (1 outside of one, or when not shrunk). */
export function useLessonViewportScale() {
  return useContext(LessonViewportScaleContext);
}

/**
 * `resize` prop for a react-three-fiber `<Canvas>` rendered inside a
 * LessonViewportFit: measure the untransformed offset size instead of the
 * scaled bounding rect.
 */
export const LESSON_FIT_CANVAS_RESIZE = { offsetSize: true } as const;

/**
 * Tallest `referenceHeight` a lesson screen is fitted against, px. A screen
 * taller than this is fitted as this height (its foot scrolls on a laptop), so
 * tall screens aren't bound by the height to a narrower width than the
 * screens around them. 704 keeps the common 1536 × 730 laptop view (a
 * 1920 × 1080 display at 125%, under its 104 px top and 24 px bottom reserves)
 * bound by the width: (730 − 128) / 704 ≥ 1148 / 1344.
 */
export const LESSON_FIT_MAX_HEIGHT = 704;

/** Shared fit of a lesson wrapped in `LessonFitUniform` (see there). */
type UniformFit = { height: number; reserveTop: number; reserveBottom: number };
const LESSON_FIT_UNIFORM: UniformFit = { height: LESSON_FIT_MAX_HEIGHT, reserveTop: 80 + 24, reserveBottom: 24 };
const LessonFitUniformContext = createContext<UniformFit | null>(null);

/**
 * Wrap a lesson in this so every LessonViewportFit inside it shrinks by the
 * same scale — min(1, available width / reference width, (viewport height −
 * the sticky site header and a 24 px gap − 24 px below) / LESSON_FIT_MAX_HEIGHT)
 * — instead of each screen fitting its own height: all sub-topics of the
 * lesson keep one content width. The screens' own `referenceHeight` and
 * reserves are ignored inside it (they still apply where a scene is rendered
 * on its own, e.g. the archive). Taller screens scroll.
 */
export function LessonFitUniform({ children }: { children: ReactNode }) {
  return <LessonFitUniformContext.Provider value={LESSON_FIT_UNIFORM}>{children}</LessonFitUniformContext.Provider>;
}

type Reserve = number | 'auto';

export type LessonViewportFitProps = {
  /** Width of the composition in the reference layout, px. Children are always laid out at this width. */
  referenceWidth: number;
  /**
   * Height of the composition in the reference layout, px. Omit to use the
   * composition's measured height (the fit then follows every height change).
   */
  referenceHeight?: number;
  /** Viewport px used above the composition. Default `'auto'` (measured). */
  reserveTop?: Reserve;
  /** Viewport px used below the composition. Default `'auto'` (measured). */
  reserveBottom?: Reserve;
  /**
   * Inline position of the scaled composition when it is narrower than the
   * available width. Logical: `start` is the visual right in RTL.
   */
  align?: 'start' | 'center' | 'end';
  /**
   * When a state of the composition (open accordion, feedback) grows taller
   * than `referenceHeight`: `false` (default) keeps the scale steady and the
   * page grows to the new scaled height; `true` shrinks further so the taller
   * state still fits. No effect without `referenceHeight`.
   */
  fitTallerStates?: boolean;
  /**
   * Lowest scale the HEIGHT limit may push to; below it the page scrolls
   * instead. The width limit always applies, so the composition never gets
   * wider than the available width. Default 0.5.
   */
  minScale?: number;
  /** Classes for the outer wrapper (keeps `w-full`; its width must not depend on its content). */
  className?: string;
  /** Classes for the reference-width box that holds the children. */
  contentClassName?: string;
  children: ReactNode;
};

type FitState = { scale: number; contentHeight: number | null };

/** Document-relative layout top, ignoring CSS transforms. */
function layoutTopInDocument(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    if (parent) top += parent.clientTop;
    node = parent;
  }
  return top;
}

const px = (value: string) => parseFloat(value) || 0;

/** In-flow content and bottom paddings below `el`, up to the closest `<main>`. */
function layoutSpaceBelow(el: HTMLElement): number {
  const stop = el.closest('main') ?? document.body;
  let below = 0;
  let node: HTMLElement = el;
  while (node !== stop && node.parentElement) {
    const parent = node.parentElement;
    const nodeBottom = node.offsetTop + node.offsetHeight + px(getComputedStyle(node).marginBottom);
    let lowest = nodeBottom;
    for (const child of Array.from(parent.children)) {
      if (child === node || !(child instanceof HTMLElement)) continue;
      const cs = getComputedStyle(child);
      if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
      lowest = Math.max(lowest, child.offsetTop + child.offsetHeight + px(cs.marginBottom));
    }
    const pcs = getComputedStyle(parent);
    below += lowest - nodeBottom + px(pcs.paddingBottom) + px(pcs.borderBottomWidth);
    node = parent;
  }
  return below;
}

export function LessonViewportFit({
  referenceWidth,
  referenceHeight,
  reserveTop = 'auto',
  reserveBottom = 'auto',
  align = 'center',
  fitTallerStates = false,
  minScale = 0.5,
  className,
  contentClassName,
  children,
}: LessonViewportFitProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<FitState>({ scale: 1, contentHeight: null });
  const uniform = useContext(LessonFitUniformContext);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const ocs = getComputedStyle(outer);
    const availableWidth = outer.clientWidth - px(ocs.paddingLeft) - px(ocs.paddingRight);
    const contentHeight = inner.offsetHeight;
    let availableHeight: number;
    let basisHeight: number;
    if (uniform) {
      availableHeight = window.innerHeight - uniform.reserveTop - uniform.reserveBottom;
      basisHeight = uniform.height;
    } else {
      const top = reserveTop === 'auto' ? layoutTopInDocument(outer) + outer.clientTop + px(ocs.paddingTop) : reserveTop;
      const bottom =
        reserveBottom === 'auto'
          ? layoutSpaceBelow(outer) + px(ocs.paddingBottom) + px(ocs.borderBottomWidth)
          : reserveBottom;
      availableHeight = window.innerHeight - top - bottom;
      basisHeight =
        referenceHeight === undefined
          ? contentHeight
          : fitTallerStates
            ? Math.max(referenceHeight, contentHeight)
            : referenceHeight;
    }

    const widthScale = availableWidth / referenceWidth;
    const heightScale = basisHeight > 0 ? Math.max(availableHeight / basisHeight, minScale) : 1;
    const raw = Math.min(1, widthScale, heightScale);
    const scale = raw > 0 ? Math.round(raw * 10000) / 10000 : 1;

    setFit((prev) =>
      Math.abs(prev.scale - scale) < 0.0005 && prev.contentHeight === contentHeight
        ? prev
        : { scale, contentHeight },
    );
  }, [uniform, referenceWidth, referenceHeight, reserveTop, reserveBottom, fitTallerStates, minScale]);

  useIsomorphicLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Batch bursts (a resize drag fires many observer callbacks) into one
    // measurement per frame — this also keeps ResizeObserver from reporting
    // a loop when our own footprint change resizes the body.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(outer);
    observer.observe(inner);
    observer.observe(document.body);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [measure]);

  const { scale, contentHeight } = fit;
  const scaled = scale < 1;

  const transformPagePoint = useCallback(
    (point: Point) => (scale === 1 ? point : { x: point.x / scale, y: point.y / scale }),
    [scale],
  );

  return (
    <div
      ref={outerRef}
      data-lesson-viewport-fit=""
      data-fit-scale={scale}
      className={cn('w-full min-w-0', className)}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: referenceWidth * scale,
          height: contentHeight === null ? undefined : contentHeight * scale,
          marginInlineStart: align === 'start' ? 0 : 'auto',
          marginInlineEnd: align === 'end' ? 0 : 'auto',
        }}
      >
        <div
          ref={innerRef}
          className={contentClassName}
          style={{
            flex: 'none',
            width: referenceWidth,
            transform: scaled ? `scale(${scale})` : undefined,
            transformOrigin: 'top center',
          }}
        >
          <LessonViewportScaleContext.Provider value={scale}>
            <MotionConfig transformPagePoint={transformPagePoint}>{children}</MotionConfig>
          </LessonViewportScaleContext.Provider>
        </div>
      </div>
    </div>
  );
}
