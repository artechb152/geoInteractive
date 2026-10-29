'use client';

import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLessonViewportScale } from '@/components/lesson/LessonViewportFit';
import { ModelLoading } from '@/components/lesson/ModelLoading';
import { NorthArrow } from '../terrain-nav/TerrainNavModel';
import type { ViewStore } from '../terrain-nav/terrainNavViewStore';
import type { Lab3DProps } from './PlanningLab3D';

const LABEL = 'טוען שטח תלת־ממדי…';
/** The frame's own background: the loader and the canvas share it, so a half-built canvas never shows. */
const FRAME_BG = 'bg-[#E2E3DA]';

// The chunk's own loading frame looks the same as the panel's loader under it; only the panel's is announced.
const PlanningLab3D = dynamic(() => import('./PlanningLab3D'), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="absolute inset-0">
      <ModelLoading label={LABEL} className={FRAME_BG} />
    </div>
  ),
});

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
/** A still of this model from its opening camera (scripts/qa/shot-planning-lab.mjs), for browsers without WebGL. */
export const FALLBACK_SRC = `${BASE}/assets/lessons/topic06/planning-lab/overview.jpg`;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** A canvas that fails to start (no context, shader error) switches the panel to the labelled still. */
class CanvasErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const ctrlBtn =
  'flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-bg-elevated/95 text-black shadow-sm hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-45';

/**
 * The model panel: the lazy 3D chunk (or the labelled still without WebGL), its
 * loader until the first frame, the north arrow, and the view controls in the
 * lesson's style — zoom, the opening view, straight down (north up, like the
 * map) and full screen. The camera moves only when asked; editing never moves it.
 */
export function PlanningLabModel({ view, reduce, modelProps, className, style }: { view: ViewStore; reduce: boolean; modelProps: Omit<Lab3DProps, 'view' | 'reduce' | 'onReady' | 'onProgress' | 'onHidden' | 'pointerScale'>; className?: string; style?: CSSProperties }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<'pending' | 'live' | 'static'>('pending');
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [fullscreen, setFullscreen] = useState(false);
  const [anyHidden, setAnyHidden] = useState(false);
  const st = useSyncExternalStore(view.subscribe, view.get, view.get);
  const fitScale = useLessonViewportScale();
  const pointerScale = fullscreen ? 1 : fitScale;

  useEffect(() => setRenderer(hasWebGL() ? 'live' : 'static'), []);
  const fallBack = useCallback(() => setRenderer('static'), []);
  const onReady = useCallback(() => setReady(true), []);

  // Start the 3D only near the viewport; once started it stays (frames render on demand only).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setActivated(true), { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (renderer === 'static') view.publishLive(0, false);
  }, [renderer, view]);

  const live = renderer === 'live';
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!live) return;
    if (e.key === '+' || e.key === '=') view.orbit('zoom-in');
    else if (e.key === '-') view.orbit('zoom-out');
    else if (e.key === 'Home') view.orbit('home');
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      className={cn('relative overflow-hidden rounded-xl border border-border/70', FRAME_BG, fullscreen && 'rounded-none', className)}
      style={fullscreen ? undefined : style}
      data-panel="model"
      data-renderer={renderer}
      data-ready={ready || undefined}
    >
      {live && activated && (
        <CanvasErrorBoundary onError={fallBack}>
          <PlanningLab3D view={view} reduce={reduce} onReady={onReady} onProgress={setProgress} onHidden={setAnyHidden} pointerScale={pointerScale} {...modelProps} />
        </CanvasErrorBoundary>
      )}
      {renderer === 'static' && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FALLBACK_SRC} alt="" className="absolute inset-0 size-full object-cover" data-fallback />
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center" data-overlay>
            <span className="rounded-lg bg-bg-elevated/95 px-3 py-1.5 text-center font-display text-base font-semibold text-black shadow-sm">תמונה קבועה של המודל: הדפדפן אינו מציג תלת־ממד. המפה עובדת כרגיל.</span>
          </div>
        </>
      )}

      {/* Keyboard surface for the view (zoom, the opening view); the canvas takes the pointer */}
      <div
        role="application"
        aria-roledescription="מודל תלת־ממדי"
        aria-label="מודל תלת־ממדי של אותו שטח: הרכס, האוכף, הנחל והערוץ, דרך העפר, המוצא והיעד, והמסלול שלכם עליו. + ו־− מקרבים ומרחיקים, Home חוזר למבט ההתחלתי. העריכה במקלדת נעשית במפה."
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="pointer-events-none absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      />

      {/* Loading: until the first frame with the textures, shadows and every instance in place */}
      {live && !ready && <ModelLoading label={LABEL} progress={activated ? progress : undefined} className={FRAME_BG} />}

      {/* North (turns with the camera) */}
      <div className="pointer-events-none absolute start-3 top-3" data-overlay>
        <NorthArrow yawDeg={st.liveYawDeg} topDown={st.liveTopDown} />
      </div>

      {/* How to move the view; and, while the ground hides a route point, what its dashed ring means */}
      {live && (
        <div className="pointer-events-none absolute end-3 top-3 flex flex-col items-end gap-1.5" data-overlay>
          <span className="rounded-lg bg-pine/80 px-2.5 py-1 font-display text-sm font-semibold text-paper-bright">גררו לסיבוב · גלגלת להתקרבות</span>
          {ready && anyHidden && (
            <span className="rounded-lg bg-pine/80 px-2.5 py-1 font-display text-sm font-semibold text-paper-bright" data-hidden-note>
              עיגול מקווקו: נקודה שמאחורי הרכס · עורכים אותה במפה
            </span>
          )}
        </div>
      )}

      {/* View controls (inline end = left in RTL) — none for the still: it has no camera */}
      <div className={cn('absolute bottom-3 end-3 flex items-center gap-1.5', renderer === 'static' && 'hidden')} data-overlay>
        <button type="button" className={ctrlBtn} onClick={() => view.orbit('zoom-in')} disabled={!live} aria-label="התקרבות" title="התקרבות">
          <Plus className="size-4" aria-hidden />
        </button>
        <button type="button" className={ctrlBtn} onClick={() => view.orbit('zoom-out')} disabled={!live} aria-label="התרחקות" title="התרחקות">
          <Minus className="size-4" aria-hidden />
        </button>
        <button type="button" className={ctrlBtn} onClick={() => view.orbit('home')} disabled={!live} aria-label="חזרה למבט ההתחלתי" title="חזרה למבט ההתחלתי">
          <RotateCcw className="size-4" aria-hidden />
        </button>
        <button type="button" className={ctrlBtn} onClick={() => view.orbit('top')} disabled={!live} aria-label="מבט מלמעלה, צפון למעלה — כמו במפה" title="מבט מלמעלה, צפון למעלה — כמו במפה" data-view="top">
          <ScanSearch className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className={ctrlBtn}
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen?.())}
          aria-label={fullscreen ? 'יציאה ממסך מלא' : 'הצגת המודל במסך מלא'}
          title={fullscreen ? 'יציאה ממסך מלא' : 'הצגת המודל במסך מלא'}
          data-view="fullscreen"
        >
          {fullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
