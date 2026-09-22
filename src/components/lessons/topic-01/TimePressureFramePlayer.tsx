'use client';

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, forwardRef } from 'react';

/**
 * WebP frame-sequence player for the "time-pressure" timeline
 * (#scene-asymmetric), copying SceneOnboardingFramePlayer.tsx's canvas
 * technique 1:1 (single <canvas>, never a swapped <video>, so stepping
 * never flickers or shows an empty frame) instead of the raw <video>/mp4
 * playback this activity used before. Frames were extracted from the
 * original transition mp4s via ffmpeg (fps=12 from the 24fps/4s source
 * clips — see MEDIA-MAP.md) into
 * /assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3/frames.
 *
 * Like the onboarding player, ANY station-to-station request plays real
 * footage, forward or backward, single-hop or multi-hop: a request for
 * station 1 → 3 plays transition-1-2 then transition-2-3 back to back; a
 * request for 4 → 1 plays transition-3-4, transition-2-3, transition-1-2
 * each in reverse. There is intentionally no user-facing skip control —
 * playback always runs to completion (per product decision 2026-09-22): a
 * re-request mid-flight retargets the route (finishing the in-flight
 * segment quickly, then continuing toward the new target), it never jumps
 * straight to a frame.
 */

const ASSET_BASE = '/assets/lessons/topic01/scene-asymmetric/time-pressure-film-v3';
const STATION_COUNT = 5;

const TRANSITION_IDS = ['transition-1-2', 'transition-2-3', 'transition-3-4', 'transition-4-5'] as const;
type TransitionId = (typeof TRANSITION_IDS)[number];

// All four source clips are 24fps/4s, extracted at fps=12 — see frames/ dir.
const FRAME_COUNT = 48;

const STATE_IMAGE_PATH = [
  `${ASSET_BASE}/states-frames/state-1-field.webp`,
  `${ASSET_BASE}/states-frames/state-2-treasury.webp`,
  `${ASSET_BASE}/states-frames/state-3-public.webp`,
  `${ASSET_BASE}/states-frames/state-4-politics.webp`,
  `${ASSET_BASE}/states-frames/state-5-international.webp`,
] as const;

function frameUrl(id: TransitionId, frameNumber: number) {
  return `${ASSET_BASE}/frames/${id}/frame-${String(frameNumber).padStart(4, '0')}.webp`;
}

// A direct (single-segment) hop targets ~1.2-1.4s; a multi-segment route
// targets ~1.5s TOTAL, split across its segments below — not per segment.
// Same figures as the onboarding player.
const DIRECT_TRANSITION_DURATION = 1300;
const MULTI_TRANSITION_DURATION = 1500;
// When the user retargets mid-flight, the active segment wraps up inside
// this window instead of either snapping instantly or finishing at its
// original (slower) pace.
const REDIRECT_FINISH_DURATION = 200;

type SegmentPlan = { transitionId: TransitionId; reverse: boolean };

function computeRoute(fromIdx: number, toIdx: number): SegmentPlan[] {
  const plans: SegmentPlan[] = [];
  if (fromIdx === toIdx) return plans;
  if (toIdx > fromIdx) {
    for (let i = fromIdx; i < toIdx; i++) {
      plans.push({ transitionId: TRANSITION_IDS[i], reverse: false });
    }
  } else {
    for (let i = fromIdx - 1; i >= toIdx; i--) {
      plans.push({ transitionId: TRANSITION_IDS[i], reverse: true });
    }
  }
  return plans;
}

function assignDurations(route: SegmentPlan[]): number[] {
  if (route.length <= 1) return route.map(() => DIRECT_TRANSITION_DURATION);
  // All segments share the same FRAME_COUNT here, so an even split is the
  // same as the onboarding player's frame-weighted split.
  return route.map(() => Math.max(60, Math.round(MULTI_TRANSITION_DURATION / route.length)));
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
    const urls = Array.from({ length: FRAME_COUNT }, (_, i) => frameUrl(id, i + 1));
    cached = Promise.all(urls.map(loadImage));
    segmentCache.set(id, cached);
  }
  return cached;
}

// Same module-level-flag pattern as SceneOnboardingFramePlayer.tsx — read
// directly inside the rAF loop rather than prop-drilled React state.
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

export type TimePressureFramePlayerHandle = {
  /** Requests a station — always plays the real footage to get there (see
   * module docs above), forward or backward, single- or multi-hop. */
  request: (target: number) => void;
};

type Props = {
  initialIndex: number;
  onPhaseChange: (phase: 'idle' | 'loading' | 'playing', pendingTarget: number | null) => void;
  onSettle: (index: number) => void;
};

export const TimePressureFramePlayer = forwardRef<TimePressureFramePlayerHandle, Props>(function TimePressureFramePlayer(
  { initialIndex, onPhaseChange, onSettle },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const mountedRef = useRef(true);
  const currentImageRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const runTokenRef = useRef(0);

  // The station actually settled/at-rest right now (matches a state image).
  const settledIndexRef = useRef(initialIndex);
  // Final destination of the route currently playing (null when idle).
  const currentRouteDestRef = useRef<number | null>(null);
  // Latest target requested mid-flight; always overwritten, never queued.
  const pendingTargetRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const fastFinishRequestedRef = useRef(false);

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

  const showImage = (img: HTMLImageElement) => {
    currentImageRef.current = img;
    drawCover(img);
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
    if (!alreadyCached) onPhaseChange('loading', currentRouteDestRef.current);

    preloadSegment(seg.transitionId).then((images) => {
      if (!mountedRef.current) return;
      onPhaseChange('playing', currentRouteDestRef.current);

      runSegmentFrames(images, seg.reverse, durations[segIdx], () => {
        if (!mountedRef.current) return;
        const boundaryIdxAbs = startIdxAbs + direction * (segIdx + 1);
        settledIndexRef.current = boundaryIdxAbs;
        onSettle(boundaryIdxAbs);

        const pending = pendingTargetRef.current;
        if (pending !== null) {
          pendingTargetRef.current = null;
          isAnimatingRef.current = false;
          if (pending !== boundaryIdxAbs) {
            startRoute(boundaryIdxAbs, pending);
          } else {
            currentRouteDestRef.current = null;
            onPhaseChange('idle', null);
          }
          return;
        }

        const nextSegIdx = segIdx + 1;
        if (nextSegIdx >= route.length) {
          isAnimatingRef.current = false;
          currentRouteDestRef.current = null;
          onPhaseChange('idle', null);
          return;
        }
        playSegment(route, durations, nextSegIdx, startIdxAbs, direction);
      });
    });
  };

  const startRoute = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) {
      isAnimatingRef.current = false;
      currentRouteDestRef.current = null;
      onPhaseChange('idle', null);
      return;
    }
    const direction: 1 | -1 = toIdx > fromIdx ? 1 : -1;
    const route = computeRoute(fromIdx, toIdx);
    const durations = assignDurations(route);
    currentRouteDestRef.current = toIdx;
    playSegment(route, durations, 0, fromIdx, direction);
  };

  const request = (target: number) => {
    if (target < 0 || target >= STATION_COUNT) return;

    if (prefersReducedMotion) {
      runTokenRef.current += 1;
      settledIndexRef.current = target;
      pendingTargetRef.current = null;
      currentRouteDestRef.current = null;
      isAnimatingRef.current = false;
      loadImage(STATE_IMAGE_PATH[target]).then((img) => {
        if (mountedRef.current) showImage(img);
      });
      onPhaseChange('idle', null);
      onSettle(target);
      return;
    }

    if (!isAnimatingRef.current) {
      pendingTargetRef.current = null;
      if (target === settledIndexRef.current) return;
      startRoute(settledIndexRef.current, target);
      return;
    }
    if (target === currentRouteDestRef.current) {
      // Already headed there — a repeat click on the active target is a no-op.
      pendingTargetRef.current = null;
      return;
    }
    pendingTargetRef.current = target;
    currentRouteDestRef.current = target;
    fastFinishRequestedRef.current = true;
  };

  useImperativeHandle(ref, () => ({ request }), []);

  // Mount: show the initial state instantly, then quietly warm the cache
  // for all four transitions so later clicks never wait on the network.
  useEffect(() => {
    mountedRef.current = true;
    settledIndexRef.current = initialIndex;
    let cancelled = false;

    loadImage(STATE_IMAGE_PATH[initialIndex]).then((img) => {
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

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} aria-hidden className="w-full h-full block" />
    </div>
  );
});
