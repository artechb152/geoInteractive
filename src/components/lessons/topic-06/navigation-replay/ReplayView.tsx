'use client';
/**
 * „מה רואים בשטח” — the replay's view panel: the live 3D view from the
 * moment's station (ReplayScene3D, lazy), a heading ribbon, the view controls
 * (zoom, back to the opening view, full screen), the project's loading line,
 * and the photographed fallback when WebGL is missing, fails or is lost.
 *
 * Looking around: drag, or the keyboard on the focused view (← → turn,
 * ↑ ↓ tilt, + − zoom, Home back to the opening view). The eye never leaves
 * the station. Pointer deltas are screen px; inside the laptop fit they are
 * divided by its scale so a drag turns the view 1 : 1.
 */
import { Component, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useProgress } from '@react-three/drei';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { ModelLoading } from '@/components/lesson/ModelLoading';
import { useLessonViewportScale } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';
import type { ViewStore, Look } from './replayViewStore';
import type { W2 } from './replayWorld';
import { ReplayFallback } from './ReplayFallback';

const LOADING_LABEL = 'טוען שטח תלת־ממדי…';

const ReplayScene3D = dynamic(() => import('./ReplayScene3D'), {
  ssr: false,
  loading: () => <ModelLoading label={LOADING_LABEL} className="bg-bg-accent" />,
});

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** A canvas that fails to start (no context, shader error, asset error) switches the panel to the stills. */
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

export type ViewMode = 'pending' | 'live' | 'static';

export function ReplayView({
  stationKey,
  station,
  momentIndex,
  view,
  description,
  reduce,
  onMode,
  prefetch,
  className,
}: {
  stationKey: string;
  station: W2;
  /** 0-based moment index (the fallback stills are per moment). */
  momentIndex: number;
  view: ViewStore;
  /** What the view shows, for screen readers. */
  description: string;
  reduce: boolean;
  onMode?: (m: ViewMode) => void;
  /** All stations, so the scene can prepare them in the background. */
  prefetch: [string, W2][];
  className?: string;
}) {
  const uid = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const fsButton = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<ViewMode>('pending');
  const [activated, setActivated] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [sceneUp, setSceneUp] = useState(false);
  const onSceneMount = useCallback(() => setSceneUp(true), []);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const fitScale = useLessonViewportScale();
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const look = useSyncExternalStore(view.subscribe, view.get, view.get);

  useEffect(() => {
    const m: ViewMode = hasWebGL() ? 'live' : 'static';
    setMode(m);
  }, []);
  useEffect(() => onMode?.(mode), [mode, onMode]);
  const fallBack = useCallback(() => setMode('static'), []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setActivated(true), { rootMargin: '600px' });
    near.observe(el);
    const vis = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '100px' });
    vis.observe(el);
    return () => {
      ro.disconnect();
      near.disconnect();
      vis.disconnect();
    };
  }, []);

  useEffect(() => {
    const onChange = () => {
      const fs = document.fullscreenElement === panelRef.current;
      setFullscreen(fs);
      // back from full screen: focus returns to the button that opened it
      if (!fs) fsButton.current?.focus({ preventScroll: true });
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void panelRef.current?.requestFullscreen?.();
  };

  const hfov = size.h > 0 ? (2 * Math.atan(Math.tan((look.vfovDeg * Math.PI) / 360) * (size.w / size.h)) * 180) / Math.PI : 80;
  const live = mode === 'live';
  const degPerPx = size.h > 0 ? look.vfovDeg / size.h : 0.1;

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (mode === 'static') {
      // the stills turn by quarters
      const home = view.home();
      const q = Math.round((((view.get().yawDeg - home.yawDeg) % 360) + 360) % 360 / 90);
      if (k === 'ArrowLeft') view.goTo({ ...home, yawDeg: home.yawDeg + (q - 1) * 90 }, true);
      else if (k === 'ArrowRight') view.goTo({ ...home, yawDeg: home.yawDeg + (q + 1) * 90 }, true);
      else if (k === 'Home' || k === '0') view.goTo('home', true);
      else return;
      e.preventDefault();
      return;
    }
    if (!live) return;
    const step = e.shiftKey ? 2 : 8;
    if (k === 'ArrowLeft') view.turn(-step, 0);
    else if (k === 'ArrowRight') view.turn(step, 0);
    else if (k === 'ArrowUp') view.turn(0, 3);
    else if (k === 'ArrowDown') view.turn(0, -3);
    else if (k === '+' || k === '=') view.zoom(0.8);
    else if (k === '-' || k === '_') view.zoom(1.25);
    else if (k === 'Home' || k === '0') view.goTo('home', reduce);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={panelRef}
      data-panel="view"
      className={cn('flex flex-col overflow-hidden rounded-xl border border-border/70 bg-bg-elevated', fullscreen && 'h-full rounded-none border-0', className)}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 px-4">
        <h4 id={`${uid}-title`} className="font-display text-lg font-bold leading-none text-black">
          מה רואים בשטח
        </h4>
        {mode === 'static' && <span className="text-sm text-fg-muted">תצלומים מהמודל · התצוגה החיה אינה זמינה</span>}
      </div>
      <div
        ref={frameRef}
        tabIndex={0}
        role="group"
        aria-roledescription="תצפית"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-desc`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (!live || e.button !== 0) return;
          if ((e.target as HTMLElement).closest('button')) return;
          drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const s = fullscreen ? 1 : fitScale || 1;
          const dx = (e.clientX - d.x) / s;
          const dy = (e.clientY - d.y) / s;
          d.x = e.clientX;
          d.y = e.clientY;
          // grab the ground: dragging right turns the view left
          view.turn(-dx * degPerPx, dy * degPerPx);
        }}
        onPointerUp={(e) => {
          if (drag.current?.id === e.pointerId) drag.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
        className={cn(
          'relative min-h-0 flex-1 select-none overflow-hidden rounded-b-xl bg-bg-accent outline-none',
          "after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-b-xl after:content-[''] focus-visible:after:ring-4 focus-visible:after:ring-inset focus-visible:after:ring-accent",
          live ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
          fullscreen && 'rounded-none after:rounded-none',
        )}
        style={{ touchAction: 'none' }}
        data-view-frame
        data-mode={mode}
        data-ready={(live && ready && !busy) || undefined}
      >
        <p id={`${uid}-desc`} className="sr-only">
          {description}
          {live ? ' גררו או השתמשו בחיצים כדי להסתכל סביב, פלוס ומינוס להגדלה ולהקטנה, Home למבט הפתיחה.' : ' חצים ימינה ושמאלה מסובבים את התצלום ברבע סיבוב, Home למבט הפתיחה.'}
        </p>

        {live && activated && (
          <CanvasErrorBoundary onError={fallBack}>
            <ReplayScene3D
              stationKey={stationKey}
              station={station}
              view={view}
              active={inView || fullscreen}
              onReady={() => setReady(true)}
              onBusy={setBusy}
              onLost={fallBack}
              prefetch={prefetch}
              onMount={onSceneMount}
            />
          </CanvasErrorBoundary>
        )}
        {mode === 'static' && <ReplayFallback momentIndex={momentIndex} view={view} reduce={reduce} />}

        <HeadingRibbon look={look} hfov={hfov} />

        {(mode === 'live' || mode === 'static') && (
          <div className="absolute bottom-3 z-10 flex gap-2" style={{ left: 12 }} dir="ltr" data-view-controls>
            <ViewButton label="הגדלה" onClick={() => view.zoom(0.8)} disabled={!live}>
              <Plus className="size-5" aria-hidden />
            </ViewButton>
            <ViewButton label="הקטנה" onClick={() => view.zoom(1.25)} disabled={!live}>
              <Minus className="size-5" aria-hidden />
            </ViewButton>
            <ViewButton label="חזרה למבט הפתיחה" onClick={() => view.goTo('home', reduce)}>
              <RotateCcw className="size-[18px]" aria-hidden />
            </ViewButton>
            <ViewButton ref={fsButton} label={fullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'} onClick={toggleFullscreen} pressed={fullscreen}>
              {fullscreen ? <Minimize2 className="size-[18px]" aria-hidden /> : <Maximize2 className="size-[18px]" aria-hidden />}
            </ViewButton>
          </div>
        )}

        {/* next/dynamic shows the line while the chunk loads; from then on this one, until the view is drawn */}
        {live && sceneUp && (!ready || busy) && <LoadingOverlay first={!ready} />}
      </div>
    </div>
  );
}

function LoadingOverlay({ first }: { first: boolean }) {
  const { active, progress } = useProgress();
  // the first load hides the half-built canvas; a station change dims the previous view instead
  return <ModelLoading label={LOADING_LABEL} progress={active ? progress : undefined} className={first ? 'bg-bg-accent' : 'bg-bg-accent/70'} />;
}

const ViewButton = ({
  ref,
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={pressed}
    onClick={onClick}
    disabled={disabled}
    className="grid size-10 place-items-center rounded-lg border border-border/80 bg-bg-elevated text-black shadow-sm transition-colors duration-150 hover:bg-bg-accent disabled:opacity-40"
  >
    {children}
  </button>
);

const CARDINALS: [number, string][] = [
  [0, 'צ'],
  [90, 'מז'],
  [180, 'ד'],
  [270, 'מע'],
];

/**
 * Directions across the top of the view, from the live camera: a tick every
 * 10°, the cardinal points named. Positions are the projected bearings (a
 * picture is never mirrored), set as left offsets in an LTR box.
 */
function HeadingRibbon({ look, hfov }: { look: Look; hfov: number }) {
  const half = hfov / 2;
  const t = Math.tan((half * Math.PI) / 180);
  const xOf = (b: number) => {
    const d = ((((b - look.yawDeg) % 360) + 540) % 360) - 180;
    if (Math.abs(d) > half + 2) return null;
    return 0.5 + Math.tan((d * Math.PI) / 180) / t / 2;
  };
  const ticks: { b: number; x: number }[] = [];
  for (let b = 0; b < 360; b += 10) {
    const x = xOf(b);
    if (x !== null && x > 0.03 && x < 0.97) ticks.push({ b, x });
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-9 bg-gradient-to-b from-white/55 to-white/0" dir="ltr" data-heading-ribbon>
      {ticks.map(({ b, x }) => {
        const name = CARDINALS.find(([c]) => c === b)?.[1];
        return (
          <div key={b} className="absolute top-1.5 flex -translate-x-1/2 flex-col items-center" style={{ left: `${x * 100}%` }}>
            {name ? (
              <span className="font-display text-sm font-bold leading-none text-black">{name}</span>
            ) : (
              <span className={cn('mt-1 w-px bg-black/55', b % 30 === 0 ? 'h-2.5' : 'h-1.5')} />
            )}
          </div>
        );
      })}
      {/* the heading index: where the view looks */}
      <svg className="absolute bottom-0 -translate-x-1/2" style={{ left: '50%' }} width="12" height="8" viewBox="0 0 12 8">
        <path d="M6 0 L12 8 L0 8 Z" fill="#1d1d1b" />
      </svg>
    </div>
  );
}
