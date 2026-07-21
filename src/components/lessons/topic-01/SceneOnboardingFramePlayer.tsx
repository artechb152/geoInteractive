'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Feature } from './OnboardingScene';

/**
 * WebP frame-sequence player replacing the three.js/video terrain diorama.
 * Frames are drawn onto a single <canvas> (never swapped DOM elements) so
 * stepping through a sequence never flickers or shows an empty frame.
 * All timing is computed from performance.now()/requestAnimationFrame
 * against a target duration — there is no fixed FPS, so a route through
 * several transition clips still lands inside its overall time budget.
 */

const ASSET_BASE = '/assets/scene-onboarding';

const STEPS_ORDER: Feature[] = ['flat', 'mountain', 'river', 'narrow'];
const STEP_INDEX: Record<Feature, number> = { flat: 0, mountain: 1, river: 2, narrow: 3 };

const TRANSITION_IDS = ['transition-1-2', 'transition-2-3', 'transition-3-4'] as const;
type TransitionId = (typeof TRANSITION_IDS)[number];

// Extracted via ffmpeg (fps=12 from the 24fps/4s source shots) — update if
// the source footage or extraction rate ever changes.
const TRANSITION_FRAME_COUNTS: Record<TransitionId, number> = {
  'transition-1-2': 48,
  'transition-2-3': 48,
  'transition-3-4': 48,
};

const STATE_IMAGE_PATH: Record<Feature, string> = {
  flat: `${ASSET_BASE}/states/state-1-flat.webp`,
  mountain: `${ASSET_BASE}/states/state-2-mountain.webp`,
  river: `${ASSET_BASE}/states/state-3-river.webp`,
  narrow: `${ASSET_BASE}/states/state-4-narrow.webp`,
};

function frameUrl(id: TransitionId, frameNumber: number) {
  return `${ASSET_BASE}/transitions/${id}/frame-${String(frameNumber).padStart(4, '0')}.webp`;
}

// A direct (single-segment) hop targets ~1.2-1.4s; a multi-segment route
// targets ~1.5s TOTAL, split across its segments below — not per segment.
const DIRECT_TRANSITION_DURATION = 1300;
const MULTI_TRANSITION_DURATION = 1500;
// When the user retargets mid-flight, the active segment wraps up inside
// this window instead of either snapping instantly or finishing at its
// original (slower) pace.
const REDIRECT_FINISH_DURATION = 200;

type SegmentPlan = { transitionId: TransitionId; reverse: boolean; frameCount: number };

function computeRoute(fromIdx: number, toIdx: number): SegmentPlan[] {
  const plans: SegmentPlan[] = [];
  if (fromIdx === toIdx) return plans;
  if (toIdx > fromIdx) {
    for (let i = fromIdx; i < toIdx; i++) {
      const id = TRANSITION_IDS[i];
      plans.push({ transitionId: id, reverse: false, frameCount: TRANSITION_FRAME_COUNTS[id] });
    }
  } else {
    for (let i = fromIdx - 1; i >= toIdx; i--) {
      const id = TRANSITION_IDS[i];
      plans.push({ transitionId: id, reverse: true, frameCount: TRANSITION_FRAME_COUNTS[id] });
    }
  }
  return plans;
}

function assignDurations(route: SegmentPlan[]): number[] {
  if (route.length <= 1) return route.map(() => DIRECT_TRANSITION_DURATION);
  const totalFrames = route.reduce((sum, seg) => sum + seg.frameCount, 0);
  return route.map((seg) => Math.max(60, Math.round((MULTI_TRANSITION_DURATION * seg.frameCount) / totalFrames)));
}

// ---- shared caches (module-level: survives remounts, dedupes fetches) ----

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
  let cached = imageCache.get(src);
  if (!cached) {
    cached = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
    imageCache.set(src, cached);
  }
  return cached;
}

const segmentCache = new Map<TransitionId, Promise<HTMLImageElement[]>>();
function preloadSegment(id: TransitionId): Promise<HTMLImageElement[]> {
  let cached = segmentCache.get(id);
  if (!cached) {
    const count = TRANSITION_FRAME_COUNTS[id];
    const urls = Array.from({ length: count }, (_, i) => frameUrl(id, i + 1));
    cached = Promise.all(urls.map(loadImage));
    segmentCache.set(id, cached);
  }
  return cached;
}

// Same module-level-flag pattern as TerrainVideo.tsx/TerrainCanvas.tsx —
// read directly inside the rAF loop rather than prop-drilled React state.
let prefersReducedMotion = false;
function useTrackReducedMotion() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
}

type IdleHandle = number | ReturnType<typeof setTimeout>;
function scheduleIdle(cb: () => void): IdleHandle {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(cb, { timeout: 2000 });
  }
  return setTimeout(cb, 300);
}
function cancelIdle(handle: IdleHandle) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window && typeof handle === 'number') {
    (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(handle);
  } else {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  }
}

export default function SceneOnboardingFramePlayer({ targetState }: { targetState: Feature }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isLoadingSegment, setIsLoadingSegment] = useState(false);

  const mountedRef = useRef(true);
  const currentImageRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const runTokenRef = useRef(0);

  // The step actually settled/at-rest right now (matches a state image).
  const settledStepRef = useRef<Feature>(targetState);
  // Final destination of the route currently playing (null when idle).
  const currentRouteDestRef = useRef<Feature | null>(null);
  // Latest target requested mid-flight; always overwritten, never queued.
  const pendingTargetRef = useRef<Feature | null>(null);
  const isAnimatingRef = useRef(false);
  const fastFinishRequestedRef = useRef(false);

  const prevTargetRef = useRef(targetState);

  useTrackReducedMotion();

  const drawCover = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Canvas pixel size tracks its container via ResizeObserver — runs before
  // paint so there's never a blank/stale-sized frame visible.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    ctxRef.current = canvas.getContext('2d');

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        if (currentImageRef.current) drawCover(currentImageRef.current);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const setLoadingSafe = (value: boolean) => {
    if (mountedRef.current) setIsLoadingSegment(value);
  };

  const showImage = (img: HTMLImageElement) => {
    currentImageRef.current = img;
    drawCover(img);
  };

  const runSegmentFrames = (images: HTMLImageElement[], reverse: boolean, duration: number, onDone: () => void) => {
    const token = ++runTokenRef.current;
    const frameCount = images.length;
    let effectiveDuration = Math.max(1, duration);
    let lastDrawnIndex = -1;
    const startTime = performance.now();

    const drawAt = (progress: number) => {
      const rawIdx = reverse
        ? Math.round((1 - progress) * (frameCount - 1))
        : Math.round(progress * (frameCount - 1));
      const idx = Math.min(frameCount - 1, Math.max(0, rawIdx));
      if (idx !== lastDrawnIndex) {
        lastDrawnIndex = idx;
        showImage(images[idx]);
      }
    };

    if (prefersReducedMotion) {
      drawAt(1);
      onDone();
      return;
    }

    drawAt(0);

    const tick = (now: number) => {
      if (!mountedRef.current || runTokenRef.current !== token) return;
      if (fastFinishRequestedRef.current) {
        const elapsedNow = now - startTime;
        effectiveDuration = Math.min(effectiveDuration, elapsedNow + REDIRECT_FINISH_DURATION);
        fastFinishRequestedRef.current = false;
      }
      // Clamp to 0: the very first rAF callback can carry a timestamp
      // fractionally earlier than the performance.now() captured just
      // before scheduling it, which would otherwise yield a negative
      // progress and an out-of-range frame index.
      const progress = Math.min(1, Math.max(0, (now - startTime) / effectiveDuration));
      drawAt(progress);
      if (progress >= 1) {
        rafRef.current = null;
        onDone();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const playSegment = (route: SegmentPlan[], durations: number[], segIdx: number, startIdxAbs: number, direction: 1 | -1) => {
    const seg = route[segIdx];
    isAnimatingRef.current = true;
    const alreadyCached = segmentCache.has(seg.transitionId);
    if (!alreadyCached) setLoadingSafe(true);

    preloadSegment(seg.transitionId).then((images) => {
      if (!mountedRef.current) return;
      setLoadingSafe(false);

      runSegmentFrames(images, seg.reverse, durations[segIdx], () => {
        if (!mountedRef.current) return;
        const boundaryIdxAbs = startIdxAbs + direction * (segIdx + 1);
        const boundaryStep = STEPS_ORDER[boundaryIdxAbs];
        settledStepRef.current = boundaryStep;

        const pending = pendingTargetRef.current;
        if (pending !== null) {
          pendingTargetRef.current = null;
          isAnimatingRef.current = false;
          if (pending !== boundaryStep) {
            startRoute(boundaryStep, pending);
          } else {
            currentRouteDestRef.current = null;
          }
          return;
        }

        const nextSegIdx = segIdx + 1;
        if (nextSegIdx >= route.length) {
          isAnimatingRef.current = false;
          currentRouteDestRef.current = null;
          return;
        }
        playSegment(route, durations, nextSegIdx, startIdxAbs, direction);
      });
    });
  };

  const startRoute = (fromStep: Feature, toStep: Feature) => {
    const fromIdx = STEP_INDEX[fromStep];
    const toIdx = STEP_INDEX[toStep];
    if (fromIdx === toIdx) {
      isAnimatingRef.current = false;
      currentRouteDestRef.current = null;
      return;
    }
    const direction: 1 | -1 = toIdx > fromIdx ? 1 : -1;
    const route = computeRoute(fromIdx, toIdx);
    const durations = assignDurations(route);
    currentRouteDestRef.current = toStep;
    playSegment(route, durations, 0, fromIdx, direction);
  };

  const handleTargetChange = (newTarget: Feature) => {
    if (!isAnimatingRef.current) {
      pendingTargetRef.current = null;
      if (newTarget === settledStepRef.current) return;
      startRoute(settledStepRef.current, newTarget);
      return;
    }
    if (newTarget === currentRouteDestRef.current) {
      // Already headed there — a repeat click on the active target is a no-op.
      pendingTargetRef.current = null;
      return;
    }
    pendingTargetRef.current = newTarget;
    currentRouteDestRef.current = newTarget;
    fastFinishRequestedRef.current = true;
  };

  // Mount: show the initial state instantly, then quietly warm the cache
  // for all three transitions so later clicks never wait on the network.
  useEffect(() => {
    mountedRef.current = true;
    settledStepRef.current = targetState;
    let cancelled = false;

    loadImage(STATE_IMAGE_PATH[targetState]).then((img) => {
      if (cancelled || !mountedRef.current) return;
      showImage(img);
    });

    const idleHandle = scheduleIdle(() => {
      TRANSITION_IDS.forEach((id) => {
        preloadSegment(id).catch(() => {
          /* a background warm-up failure just means the next click preloads normally */
        });
      });
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      cancelIdle(idleHandle);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to subsequent target changes (not the initial mount value).
  useEffect(() => {
    if (prevTargetRef.current === targetState) return;
    prevTargetRef.current = targetState;
    handleTargetChange(targetState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetState]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} aria-hidden className="w-full h-full block" />
      {isLoadingSegment && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-bg-elevated/90 px-3 py-1.5 shadow-sm">
            <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
            <span className="text-xs font-display font-bold text-fg-dim">טוען...</span>
          </div>
        </div>
      )}
    </div>
  );
}
