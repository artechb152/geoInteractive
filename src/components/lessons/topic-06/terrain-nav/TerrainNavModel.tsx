'use client';

import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBearing } from './terrainNavGeometry';
import type { ModelProps } from './TerrainNav3D';
import type { ViewStore } from './terrainNavViewStore';

const TerrainNav3D = dynamic(() => import('./TerrainNav3D'), { ssr: false, loading: () => null });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
/** Static views for browsers without WebGL, rendered from this model by scripts/qa/shot-terrain-nav.mjs. */
export const FALLBACK = {
  overview: `${BASE}/assets/lessons/topic06/terrain-nav/overview.jpg`,
  leg: (k: number) => `${BASE}/assets/lessons/topic06/terrain-nav/leg-${k + 1}.jpg`,
} as const;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** A canvas that fails to start (no context, shader error) switches the panel to the static view. */
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

export function TerrainNavModel({
  view,
  mode,
  reduce,
  fallbackSrc,
  modelProps,
  ariaLabel,
  className,
}: {
  view: ViewStore;
  mode: 'learn' | 'practice';
  reduce: boolean;
  /** The static picture for this mode / leg when WebGL is unavailable. */
  fallbackSrc: string;
  modelProps: Omit<ModelProps, 'view' | 'reduce' | 'onReady'>;
  ariaLabel: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<'pending' | 'live' | 'static'>('pending');
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [cut, setCut] = useState(false);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; id: number } | null>(null);
  const st = useSyncExternalStore(view.subscribe, view.get, view.get);

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

  // A mode change is a cut through a brief fade — the camera never flies between the overview and the navigator's eye.
  const lastMode = useRef(mode);
  useEffect(() => {
    if (lastMode.current === mode) return;
    lastMode.current = mode;
    if (reduce) return;
    setCut(true);
    const t = window.setTimeout(() => setCut(false), 260);
    return () => window.clearTimeout(t);
  }, [mode, reduce]);

  const live = renderer === 'live';
  const eye = st.mode === 'eye';

  // Without a canvas nothing publishes the heading: the static picture faces the look's yaw
  // (the overview faces north).
  useEffect(() => {
    if (renderer === 'static') view.publishLive(eye ? st.look.yawDeg : 0, false);
  }, [renderer, eye, st.look.yawDeg, view]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!eye || !live || e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, yaw: st.look.yawDeg, pitch: st.look.pitchDeg, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const w = e.currentTarget.clientWidth || 1;
    const degPerPx = st.look.hfovDeg / w;
    view.look({ yawDeg: d.yaw - (e.clientX - d.x) * degPerPx, pitchDeg: d.pitch + (e.clientY - d.y) * degPerPx });
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!eye || !live) return;
    view.look({ hfovDeg: st.look.hfovDeg * (e.deltaY > 0 ? 1.08 : 1 / 1.08) });
  };
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!live) return;
    if (eye) {
      const step = e.shiftKey ? 15 : 5;
      if (e.key === 'ArrowLeft') view.look({ yawDeg: st.look.yawDeg - step });
      else if (e.key === 'ArrowRight') view.look({ yawDeg: st.look.yawDeg + step });
      else if (e.key === 'ArrowUp') view.look({ pitchDeg: st.look.pitchDeg + 3 });
      else if (e.key === 'ArrowDown') view.look({ pitchDeg: st.look.pitchDeg - 3 });
      else if (e.key === '+' || e.key === '=') view.look({ hfovDeg: st.look.hfovDeg / 1.2 });
      else if (e.key === '-') view.look({ hfovDeg: st.look.hfovDeg * 1.2 });
      else return;
    } else {
      if (e.key === '+' || e.key === '=') view.orbit('zoom-in');
      else if (e.key === '-') view.orbit('zoom-out');
      else if (e.key === 'Home') view.orbit('home');
      else return;
    }
    e.preventDefault();
  };

  const zoomIn = () => (eye ? view.look({ hfovDeg: st.look.hfovDeg / 1.25 }) : view.orbit('zoom-in'));
  const zoomOut = () => (eye ? view.look({ hfovDeg: st.look.hfovDeg * 1.25 }) : view.orbit('zoom-out'));
  const reset = () => (eye ? view.look({ yawDeg: st.look.yawDeg, pitchDeg: -4, hfovDeg: 64 }) : view.orbit('home'));

  return (
    <div
      ref={rootRef}
      className={cn('relative overflow-hidden rounded-xl border border-border/70 bg-[#E2E3DA]', fullscreen && 'rounded-none', className)}
      data-panel="model"
      data-renderer={renderer}
      data-view={st.mode}
    >
      {/* The canvas (live) or the static picture of the same model and camera (no WebGL) */}
      {live && activated && (
        <CanvasErrorBoundary onError={fallBack}>
          <TerrainNav3D view={view} reduce={reduce} onReady={onReady} {...modelProps} />
        </CanvasErrorBoundary>
      )}
      {renderer === 'static' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fallbackSrc} alt="" className="absolute inset-0 size-full object-cover" data-fallback />
      )}

      {/* Interaction surface: in the navigator's view a drag turns the look; in the overview the canvas takes the pointer (orbit). */}
      <div
        role="application"
        aria-roledescription={eye ? 'תצפית מעמדת המנווט' : 'מודל תלת־ממדי'}
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className={cn(
          'absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
          eye && live ? 'cursor-grab touch-none active:cursor-grabbing' : 'pointer-events-none',
        )}
      />

      {/* Loading */}
      {live && !ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#E2E3DA]" data-loading>
          <span className="rounded-lg bg-bg-elevated/90 px-3 py-1.5 font-display text-base font-semibold text-black shadow-sm">טוען את מודל השטח…</span>
        </div>
      )}

      {/* The cut between overview and the navigator's eye */}
      <div aria-hidden className={cn('pointer-events-none absolute inset-0 bg-bg transition-opacity duration-200', cut ? 'opacity-100' : 'opacity-0')} />

      {/* North / heading */}
      <div className="pointer-events-none absolute start-3 top-3" data-overlay>
        {eye ? <HeadingTape yawDeg={st.liveYawDeg} /> : <NorthArrow yawDeg={st.liveYawDeg} topDown={st.liveTopDown} />}
      </div>

      {/* Controls (inline end = left in RTL) */}
      <div className="absolute bottom-3 end-3 flex items-center gap-1.5" data-overlay>
        <button type="button" className={ctrlBtn} onClick={zoomIn} disabled={!live} aria-label="התקרבות" title="התקרבות">
          <Plus className="size-4" aria-hidden />
        </button>
        <button type="button" className={ctrlBtn} onClick={zoomOut} disabled={!live} aria-label="התרחקות" title="התרחקות">
          <Minus className="size-4" aria-hidden />
        </button>
        <button type="button" className={ctrlBtn} onClick={reset} disabled={!live} aria-label={eye ? 'מבט ישר לפנים' : 'חזרה למבט ההתחלתי'} title={eye ? 'מבט ישר לפנים' : 'חזרה למבט ההתחלתי'}>
          <RotateCcw className="size-4" aria-hidden />
        </button>
        {!eye && (
          <button type="button" className={ctrlBtn} onClick={() => view.orbit('top')} disabled={!live} aria-label="מבט מלמעלה, צפון למעלה — כמו במפה" title="מבט מלמעלה, צפון למעלה — כמו במפה">
            <ScanSearch className="size-4" aria-hidden />
          </button>
        )}
        <button
          type="button"
          className={ctrlBtn}
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen?.())}
          aria-label={fullscreen ? 'יציאה ממסך מלא' : 'הצגת המודל במסך מלא'}
          title={fullscreen ? 'יציאה ממסך מלא' : 'הצגת המודל במסך מלא'}
        >
          {fullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
        </button>
      </div>

      {/* How to move the view (in the navigator's view the heading tape takes the top) */}
      <div className={cn('pointer-events-none absolute', eye ? 'bottom-3 start-3' : 'end-3 top-3')} data-overlay>
        <span className="rounded-lg bg-pine/80 px-2.5 py-1 font-display text-sm font-semibold text-paper-bright">
          {eye ? 'גררו כדי להסתכל סביב · חיצי המקלדת' : mode === 'learn' ? 'גררו לסיבוב · גלגלת להתקרבות · לחצו על עצם' : 'גררו לסיבוב · גלגלת להתקרבות'}
        </span>
      </div>
    </div>
  );
}

/** North arrow of the overview: turns with the camera (north stays north on the ground). */
function NorthArrow({ yawDeg, topDown }: { yawDeg: number; topDown: boolean }) {
  return (
    <div className="flex size-14 flex-col items-center justify-center rounded-full border border-border bg-bg-elevated/95 shadow-sm" data-north={Math.round(topDown ? 0 : -yawDeg)}>
      <svg viewBox="-20 -20 40 40" className="size-11" aria-hidden>
        <g transform={`rotate(${topDown ? 0 : -yawDeg})`}>
          <path d="M0 -15 L6 4 L0 0 L-6 4 Z" fill="#38432E" />
          <path d="M0 15 L6 -4 L0 0 L-6 -4 Z" fill="#C9B99B" />
          <text y={-6.5} textAnchor="middle" dominantBaseline="central" fontSize={7} fontWeight={800} fill="#FFFFFF" className="font-display" transform="translate(0 0)">
            N
          </text>
        </g>
      </svg>
      <span className="sr-only">החץ מצביע לצפון</span>
    </div>
  );
}

/** Heading of the navigator's look: a strip of the compass around the current bearing. */
function HeadingTape({ yawDeg }: { yawDeg: number }) {
  const W = 220;
  const span = 90; // degrees shown across the strip
  const pxPerDeg = W / span;
  const marks: ReactNode[] = [];
  const start = Math.floor((yawDeg - span / 2) / 5) * 5;
  for (let d = start; d <= yawDeg + span / 2; d += 5) {
    const x = W / 2 + (d - yawDeg) * pxPerDeg;
    const n = ((d % 360) + 360) % 360;
    const card = n % 90 === 0 ? ['צ', 'מז', 'ד', 'מע'][n / 90] : null;
    marks.push(<line key={`l${d}`} x1={x} x2={x} y1={n % 15 === 0 ? 14 : 18} y2={24} stroke="#38432E" strokeWidth={n % 15 === 0 ? 1.4 : 0.8} />);
    if (n % 15 === 0)
      marks.push(
        <text key={`t${d}`} x={x} y={8} textAnchor="middle" dominantBaseline="central" fontSize={card ? 11 : 10} fontWeight={card ? 800 : 600} fill={card ? '#D97E2B' : '#38432E'} className="font-display tabular-nums">
          {card ?? String(n).padStart(3, '0')}
        </text>,
      );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated/95 px-2 py-1 shadow-sm" data-heading={Math.round(yawDeg) % 360}>
      <svg width={W} height={28} viewBox={`0 0 ${W} 28`} aria-hidden>
        {marks}
        <path d={`M${W / 2 - 5} 28 L${W / 2} 22 L${W / 2 + 5} 28 Z`} fill="#D97E2B" />
      </svg>
      <span className="font-display text-base font-bold tabular-nums text-black" aria-live="off">
        {formatBearing(yawDeg)}
      </span>
    </div>
  );
}
