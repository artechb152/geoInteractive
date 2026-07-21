'use client';

import { useEffect, useRef } from 'react';
import type { Feature } from './OnboardingScene';

/**
 * Realistic-video replacement for the old TerrainCanvas (three.js) diorama.
 * Users never actually dragged/rotated that model, so the interactivity was
 * wasted — this instead scrubs a single continuous realistic-style take
 * (flat ground → mountain rises → river/bridge appears → corridor narrows,
 * same monotonic build as onboardingTerrainField.ts) to a per-stage anchor
 * timestamp.
 *
 * The <video> is never actually played — it's always paused and driven
 * purely via `currentTime`, so a "jump" is just tweening toward a new
 * target time. That makes forward, backward and non-adjacent jumps
 * (stage 1 → 4 or 4 → 1) all the same code path, and sidesteps native
 * reverse playback (negative playbackRate isn't reliable across browsers).
 */

const VIDEO_SRC = '/assets/video/topic-01/onboarding-terrain.mp4';

// Anchor timestamps (seconds) into VIDEO_SRC for each stage's settled frame.
// NOTE: placeholder spacing for a ~12s clip — retune once the real footage
// lands so these line up with its actual beats.
const STAGE_TIME: Record<Feature, number> = {
  flat: 0,
  mountain: 4,
  river: 8,
  narrow: 12,
};

const TOTAL_DURATION = STAGE_TIME.narrow - STAGE_TIME.flat;
const MIN_TWEEN_MS = 500;
const MAX_TWEEN_MS = 1400;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Same module-level-flag pattern as TerrainCanvas.tsx's useTrackReducedMotion
// (not imported from there since that file is retired from the import graph).
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

export default function TerrainVideo({ feature }: { feature: Feature }) {
  useTrackReducedMotion();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const readyRef = useRef(false);

  const seekTo = (target: number) => {
    const video = videoRef.current;
    if (!video || !readyRef.current) return;
    video.currentTime = target;
  };

  const tweenTo = (target: number) => {
    const video = videoRef.current;
    if (!video || !readyRef.current) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (prefersReducedMotion) {
      seekTo(target);
      return;
    }

    const start = video.currentTime;
    const distance = Math.abs(target - start);
    const duration = Math.min(
      MAX_TWEEN_MS,
      Math.max(MIN_TWEEN_MS, MIN_TWEEN_MS + (MAX_TWEEN_MS - MIN_TWEEN_MS) * (distance / TOTAL_DURATION))
    );
    const startedAt = performance.now();

    const step = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      video.currentTime = start + (target - start) * eased;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      readyRef.current = true;
      seekTo(STAGE_TIME[feature]);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', onLoadedMetadata);
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // Intentionally run only on mount — subsequent `feature` changes are
    // handled by the effect below via tweenTo, not a re-seek from scratch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!readyRef.current) return;
    tweenTo(STAGE_TIME[feature]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature]);

  const showBlueLabel = feature === 'flat';
  const showEnemyLabel = feature === 'flat' || feature === 'mountain';
  const showBridgeLabel = feature === 'river';

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="w-full h-full object-cover bg-bg"
      />

      {/* Stage labels — the old three.js version pinned these to a moving
          3D world position via drei's <Html>; a video's continuously
          panning camera has no equivalent "world position" to track, so
          these are simplified to fixed-corner overlay chips gated by the
          same per-stage rules instead of silently dropping the content. */}
      <div className="pointer-events-none absolute inset-0 p-3 flex flex-col justify-between text-xs font-display font-bold">
        <div className="flex justify-between">
          {showBlueLabel && (
            <span className="chip border-border bg-bg-elevated/95 shadow-sm" style={{ color: '#5b9dd9' }}>
              צבא כחול
            </span>
          )}
          {showEnemyLabel && (
            <span className="chip border-border bg-bg-elevated/95 shadow-sm" style={{ color: '#e2553a' }}>
              כוח אויב
            </span>
          )}
        </div>
        {showBridgeLabel && (
          <span className="chip self-center border-border bg-bg-elevated/95 text-accent shadow-sm">
            גשר
          </span>
        )}
      </div>
    </div>
  );
}
