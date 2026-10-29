'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref } from 'react';
import dynamic from 'next/dynamic';
import type { MotionValue } from 'framer-motion';
import { ArrowLeft, ArrowRight, Hand, LocateFixed } from 'lucide-react';
import { ModelLoading } from '@/components/lesson/ModelLoading';
import { useLessonViewportScale } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';
import { signedTurn } from '../locationCheckGeometry';
import { VISIBILITY_M } from './deadReckoningModel';
import { DEFAULT_PITCH, type LookRig } from './deadReckoningLook';
import { DeadReckoningField } from './DeadReckoningField';

/**
 * The view frame of the dead-reckoning activity: the live first-person scene
 * (DeadReckoningScene3D, loaded on demand) with what belongs on it — the
 * conditions chip, the planning-map button, the look-around hint and the
 * "face the walking direction" button — and the planning map when it is open.
 *
 * Looking around: drag the view, or the arrow keys while it has focus (Home
 * faces the walking direction again). It turns the head only: the walking
 * azimuth stays the compass setting.
 *
 * Without WebGL the frame shows a labelled stand-in — the ground around the
 * navigator from above, with the 30 m of sight — never an empty box.
 */

const DUST_BG = '#c1a484';

const Scene3D = dynamic(() => import('./DeadReckoningScene3D'), {
  ssr: false,
  loading: () => <ModelLoading label="טוען שטח מדברי תלת־ממדי…" className="bg-[#c1a484] pe-[var(--dr-map-w,0px)]" />,
});

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

export function DeadReckoningView({
  distM,
  look,
  walkHeading,
  wadiLabel,
  reduceMotion,
  height,
  mapButton,
  mapOpen,
  mapInset,
  mapPanel,
  fallbackLabel,
  countTarget,
  frameRef,
}: {
  distM: MotionValue<number>;
  look: LookRig;
  /** The walking azimuth (the compass setting) — what "face the walking direction" turns to. */
  walkHeading: number;
  wadiLabel: boolean;
  reduceMotion: boolean;
  /** Frame height, reference px. */
  height: number;
  /** The planning-map toggle, top inline-end of the frame. */
  mapButton: ReactNode;
  mapOpen: boolean;
  /** Width the open map covers at the inline end, px (the loader centres itself in the rest). */
  mapInset: number;
  /** The planning map, over the view's inline-end half, when open. */
  mapPanel: ReactNode;
  /** What the stand-in view shows now (its accessible name). */
  fallbackLabel: string;
  /** The planned count once computed (the stand-in's counter). */
  countTarget: number | null;
  frameRef?: Ref<HTMLDivElement>;
}) {
  const [gl, setGl] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [looked, setLooked] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const fit = useLessonViewportScale();

  useEffect(() => setGl(hasWebGL() ? 'yes' : 'no'), []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Drag to look: the world follows the pointer (as in a street-level photo viewer).
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-no-look]')) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const k = 0.2 / (fit || 1);
    look.drag(-(e.clientX - d.x) * k, (e.clientY - d.y) * k * 0.8);
    d.x = e.clientX;
    d.y = e.clientY;
    if (!looked) setLooked(true);
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 45 : 15;
    // Physical directions: the arrows turn the head left and right whatever the page direction.
    if (e.key === 'ArrowLeft') look.nudge(-step, 0);
    else if (e.key === 'ArrowRight') look.nudge(step, 0);
    else if (e.key === 'ArrowUp') look.nudge(0, 5);
    else if (e.key === 'ArrowDown') look.nudge(0, -5);
    else if (e.key === 'Home') look.aim(walkHeading, DEFAULT_PITCH);
    else return;
    e.preventDefault();
    if (!looked) setLooked(true);
  };

  const show3D = gl === 'yes';
  return (
    <div
      ref={(el) => {
        box.current = el;
        if (typeof frameRef === 'function') frameRef(el);
        else if (frameRef) (frameRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className="relative overflow-hidden rounded-xl border border-border/70"
      style={{ height, background: DUST_BG, ['--dr-map-w' as string]: mapOpen ? `${mapInset}px` : '0px' }}
      data-panel="dr-view"
      data-view-ready={ready || undefined}
    >
      {show3D ? (
        <div
          className="absolute inset-0 cursor-grab touch-none select-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-accent active:cursor-grabbing"
          tabIndex={0}
          role="application"
          aria-roledescription="מבט בשטח"
          aria-label="המבט שלכם בשטח, בתוך סופת חול. חיצים: הסתכלות סביב. Home: מבט לכיוון התנועה."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          data-look-surface
        >
          {onScreen || ready ? (
            <Scene3D distM={distM} look={look} wadiLabel={wadiLabel} reduceMotion={reduceMotion} active={onScreen} onReady={() => setReady(true)} onFail={() => setGl('no')} />
          ) : (
            <ModelLoading label="טוען שטח מדברי תלת־ממדי…" className="bg-[#c1a484] pe-[var(--dr-map-w,0px)]" />
          )}
        </div>
      ) : gl === 'no' ? (
        // The stand-in sits at the inline start, clear of the planning map (inline end); its note on it, beside its counter.
        <div className="absolute inset-0 bg-paper-bright" data-fallback>
          <div className="absolute inset-y-4 start-4 overflow-hidden rounded-lg border border-border/70" style={{ aspectRatio: '344 / 358' }}>
            <DeadReckoningField distM={distM} heading={walkHeading} target={countTarget} label={fallbackLabel} className="h-full w-full" />
            <p className="absolute bottom-3 start-3 max-w-[15rem] rounded-lg bg-white/95 px-3 py-2 text-base leading-snug text-black shadow-sm">
              <span className="font-display font-bold">תצוגה חלופית: </span>
              הדפדפן אינו מציג תלת־ממד, ולכן מוצג השטח סביבכם במבט מלמעלה.
            </p>
          </div>
        </div>
      ) : null}

      {/* What the view is, and the storm's limit */}
      <div className="pointer-events-none absolute start-4 top-4 rounded-lg bg-paper-bright/90 px-3 py-1.5 shadow-sm" data-view-chip>
        <div className="font-display text-base font-bold leading-snug text-black">המבט שלכם בשטח</div>
        <div className="text-base leading-snug text-black">{`ראות כ־${VISIBILITY_M} מ׳`}</div>
      </div>
      {/* Under the open map its own close button takes over */}
      <div className={cn('absolute end-4 top-4', mapOpen && 'invisible')} data-no-look>
        {mapButton}
      </div>

      {show3D && !mapOpen && <LookHint look={look} walkHeading={walkHeading} looked={looked} />}
      {mapPanel}
    </div>
  );
}

/** Bottom centre: how to look around (until the learner has), then a way back to the walking direction. */
function LookHint({ look, walkHeading, looked }: { look: LookRig; walkHeading: number; looked: boolean }) {
  const yaw = useSyncExternalStore(
    (fn) => look.subscribe(fn),
    () => Math.round(look.yaw),
    () => 0,
  );
  const off = Math.abs(signedTurn(walkHeading, yaw)) > 8;
  if (looked && off)
    return (
      <button
        type="button"
        onClick={() => look.aim(walkHeading, DEFAULT_PITCH)}
        className="absolute inset-x-0 bottom-4 mx-auto inline-flex h-10 w-fit items-center gap-2 rounded-full bg-fg/75 px-4 font-display text-base font-semibold text-white shadow-md backdrop-blur-sm transition-colors hover:bg-fg/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        data-no-look
        data-look-reset
      >
        <LocateFixed className="size-4" aria-hidden />
        מבט לכיוון התנועה
      </button>
    );
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-3 rounded-full bg-fg/60 px-4 py-1.5 text-white shadow-md backdrop-blur-sm transition-opacity duration-300',
        looked && 'opacity-0',
      )}
      aria-hidden
      data-look-hint
    >
      <ArrowRight className="size-4" />
      <span className="flex items-center gap-1.5 font-display text-base font-semibold">
        <Hand className="size-4" />
        גררו כדי להסתכל סביב
      </span>
      <ArrowLeft className="size-4" />
    </div>
  );
}
