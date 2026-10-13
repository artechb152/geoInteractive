'use client';

import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { useProgress } from '@react-three/drei';
import { cn } from '@/lib/utils';
import { useLessonViewportScale } from '@/components/lesson/LessonViewportFit';
import { FORK, READINGS } from './locationCheckScenario';
import { bearingToViewX, formatBearing, normalizeDegrees, projectToView, signedTurn, type EyePoint } from './locationCheckGeometry';
import { heightAt, observerEye } from './locationCheckTerrain';
import { INITIAL_LOOK, type LookStore } from './locationCheckViewStore';

/**
 * The observation panel: the live eye-level canvas (LocationCheckTerrain3D)
 * and everything drawn or handled over it in the DOM — look controls (drag,
 * keys) and the heading tape. The view is only looked at: the
 * groves in it are landmarks, nothing in it is selected.
 * All of it goes through the pure projection of locationCheckGeometry with the
 * frame's measured size, so it registers with the canvas (whose camera takes
 * the same size) and works unchanged over the static fallback picture
 * (rendered from the same world and camera by scripts/qa/shot-location-check.mjs).
 *
 * Nothing here shows where the observer stands.
 */

const LocationCheckTerrain3D = dynamic(() => import('./LocationCheckTerrain3D'), { ssr: false, loading: () => null });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
/** Static view for browsers without WebGL: the opening look (INITIAL_LOOK) in a 4:3 frame. */
export const FALLBACK_SRC = `${BASE}/assets/lessons/topic06/location-check/observation-north.jpg`;
/** Frame aspect of the observation (width / height) — also the fallback picture's. */
export const OBSERVATION_ASPECT = 4 / 3;

const TAPE_H = 30;
/** Radius of the ring on a marker's real target (px). */
const RING_R_PX = 7;

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

export type TapeMarker = {
  bearingDeg: number;
  label: string;
  tone: 'measured' | 'predicted';
  /** A real point the marker refers to (its drop line ends there); otherwise the line ends on the horizon. */
  target?: EyePoint;
};

export function LocationCheckObservation({
  lookStore,
  markers,
  className,
}: {
  lookStore: LookStore;
  /** Bearings marked on the heading tape (the measurement; after a check, the hypothesis' prediction). */
  markers: readonly TapeMarker[];
  className?: string;
}) {
  const reduce = !!useReducedMotion();
  const uid = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'pending' | 'live' | 'static'>('pending');
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // `size` is the untransformed frame; pointer deltas are screen px, so divide
  // them by the laptop-fit scale (1 when not shrunk) to keep the drag 1:1.
  const fitScale = useLessonViewportScale();
  const [dragging, setDragging] = useState(false);
  const [turned, setTurned] = useState(false);
  const [keyFocus, setKeyFocus] = useState(false);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; moved: boolean; id: number } | null>(null);
  const look = useSyncExternalStore(lookStore.subscribe, lookStore.getLive, lookStore.getLive);

  useEffect(() => setMode(hasWebGL() ? 'live' : 'static'), []);
  const fallBack = useCallback(() => setMode('static'), []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setActivated(true), { rootMargin: '400px' });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // Without WebGL the picture is the fixed opening view: the look is fixed too.
  const live = mode === 'live';
  useEffect(() => {
    lookStore.setInteractive(live);
    return () => lookStore.setInteractive(false);
  }, [live, lookStore]);
  useEffect(() => {
    if (mode === 'static') {
      lookStore.reset();
      lookStore.setLive(INITIAL_LOOK);
    }
  }, [mode, lookStore]);

  // Projection and labels use the frame as measured — the canvas camera takes the same size.
  const aspect = size.w > 0 && size.h > 0 ? size.w / size.h : OBSERVATION_ASPECT;
  const viewLook = live ? look : INITIAL_LOOK;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !live) return;
    const t = lookStore.getTarget();
    drag.current = { x: e.clientX, y: e.clientY, yaw: t.yawDeg, pitch: t.pitchDeg, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dx = (e.clientX - d.x) / fitScale;
      const dy = (e.clientY - d.y) / fitScale;
      if (!d.moved && Math.hypot(dx, dy) > 4) {
        d.moved = true;
        frameRef.current?.setPointerCapture(e.pointerId);
        setDragging(true);
        setTurned(true);
      }
      if (d.moved) {
        const w = size.w || 1;
        const degPerPx = viewLook.hfovDeg / w;
        // Drag the scenery: moving the pointer right turns the view left.
        lookStore.setTarget({ yawDeg: d.yaw - dx * degPerPx, pitchDeg: d.pitch + dy * degPerPx });
      }
    }
  };
  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    setDragging(false);
    if (frameRef.current?.hasPointerCapture(e.pointerId)) frameRef.current.releasePointerCapture(e.pointerId);
  };

  const turn = (dYaw: number, dPitch = 0) => {
    const t = lookStore.getTarget();
    lookStore.setTarget({ yawDeg: t.yawDeg + dYaw, pitchDeg: t.pitchDeg + dPitch });
    setTurned(true);
  };
  const zoom = (dFov: number) => lookStore.setTarget({ hfovDeg: lookStore.getTarget().hfovDeg + dFov });
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!live || e.target !== e.currentTarget) return;
    const big = e.shiftKey ? 3 : 1;
    const actions: Record<string, () => void> = {
      // Physical directions: the view is not mirrored for RTL.
      ArrowLeft: () => turn(-5 * big),
      ArrowRight: () => turn(5 * big),
      ArrowUp: () => turn(0, 3),
      ArrowDown: () => turn(0, -3),
      '+': () => zoom(-10),
      '=': () => zoom(-10),
      '-': () => zoom(10),
      Home: () => lookStore.reset(),
      '0': () => lookStore.reset(),
    };
    const run = actions[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  const descId = `${uid}-obs-desc`;
  const showOverlay = mode !== 'pending' && (mode === 'static' || ready);

  const fallbackPicture = (
    // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
    <img src={FALLBACK_SRC} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
  );

  const hint = keyFocus ? 'חצים: סיבוב המבט · + / −: הגדלה' : !turned && live ? 'גררו כדי להביט סביב' : null;

  return (
    <div className={cn('relative bg-bg-accent', className)}>
      <div
        ref={frameRef}
        role="group"
        data-obs-frame
        // Only a turnable view takes focus; the static picture has nothing to operate.
        tabIndex={live ? 0 : -1}
        aria-label={live ? 'תצפית בשטח' : 'תצפית בשטח, תמונה סטטית במבט הפתיחה'}
        aria-describedby={descId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.target === e.currentTarget && e.currentTarget.matches(':focus-visible') && setKeyFocus(true)}
        onBlur={() => setKeyFocus(false)}
        className={cn(
          'relative w-full select-none overflow-hidden outline-none',
          // Focus ring on a layer above the canvas.
          "after:pointer-events-none after:absolute after:inset-0 after:z-20 after:content-[''] focus-visible:after:ring-4 focus-visible:after:ring-inset focus-visible:after:ring-accent",
          live ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
        )}
        style={{ aspectRatio: `${OBSERVATION_ASPECT}`, touchAction: 'pan-y' }}
      >
        <p id={descId} className="sr-only">
          בתצפית הפתיחה יש חורשה משמאל וחורשה קרובה יותר מימין, ליד גבעה. התפצלות הדרך נמצאת מימין למבט הפתיחה.
          {live && ' מקשי החיצים מסובבים ומטים את המבט, פלוס ומינוס להגדלה ולהקטנה, Home למבט הפתיחה.'}
        </p>

        {mode === 'live' && activated && (
          <CanvasErrorBoundary onError={fallBack}>
            <LocationCheckTerrain3D
              lookStore={lookStore}
              reduce={reduce}
              onReady={() => setReady(true)}
            />
          </CanvasErrorBoundary>
        )}
        {mode === 'static' && fallbackPicture}

        {showOverlay && (
          <div aria-hidden data-obs-overlay className="pointer-events-none absolute inset-0">
            <HeadingTape look={viewLook} markers={markers} aspect={aspect} frameH={size.h} frameW={size.w} />
          </div>
        )}

        {mode === 'live' && activated && !ready && <LoadingOverlay />}
      </div>

      {/* Bottom edge: a short hint over the foreground ground, clear of the groves, the ridge and the fork. */}
      {hint && (
        <div data-obs-chrome className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-center">
          <div className="rounded-md bg-fg/80 px-2 py-0.5 font-display text-sm font-semibold text-white">{hint}</div>
        </div>
      )}
    </div>
  );
}

function LoadingOverlay() {
  const { progress } = useProgress();
  return (
    <div role="status" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-accent">
      <div className="font-display text-base font-bold text-black">טוען תצפית תלת־ממדית…</div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-border/60" dir="ltr">
        <div className="h-full bg-accent motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${Math.round(progress)}%` }} />
      </div>
    </div>
  );
}

/**
 * Bearings across the top of the frame, from the live camera: ticks every 5°,
 * numbers every 10°. Markers sit on the tape: the measured bearing to the
 * road split drops a dashed line onto the split itself; after a check, the
 * hypothesis' predicted bearing drops one to the horizon. Off-frame markers
 * stick to the edge with a chevron, pointing the way to turn.
 *
 * Positions are physical screen x of a picture that is never mirrored
 * (projected bearings), so they are set as left offsets inside LTR boxes.
 */
function HeadingTape({ look, markers, aspect, frameH, frameW }: { look: { yawDeg: number; pitchDeg: number; hfovDeg: number }; markers: readonly TapeMarker[]; aspect: number; frameH: number; frameW: number }) {
  const eye = useMemo(() => observerEye(), []);
  const half = look.hfovDeg / 2 + 6;
  const ticks: { b: number; x: number }[] = [];
  for (let b = Math.ceil((look.yawDeg - half) / 5) * 5; b <= look.yawDeg + half; b += 5) {
    const x = bearingToViewX(look, b);
    if (x !== null && x >= 0 && x <= 1) ticks.push({ b, x });
  }
  const tapeFrac = frameH > 0 ? TAPE_H / frameH : 0.08;
  const placed = markers.map((m) => {
    const x = bearingToViewX(look, m.bearingDeg);
    const off = x === null || x < 0.05 || x > 0.95;
    const side: 'left' | 'right' = signedTurn(look.yawDeg, m.bearingDeg) < 0 ? 'left' : 'right';
    // Where the dashed drop line ends: on the target, or on the horizon 4 km out.
    const far = m.target ?? { E: eye.E + Math.sin((m.bearingDeg * Math.PI) / 180) * 4000, N: eye.N + Math.cos((m.bearingDeg * Math.PI) / 180) * 4000, heightM: eye.heightM };
    const end = projectToView(look, aspect, eye, far);
    return { m, x, off, side, end };
  });
  // Chip spans along the tape (estimated width), so a later chip can step aside instead of covering an earlier one.
  const W = frameW || 1;
  const chipW = (m: TapeMarker, off: boolean) => (m.label.length * 8 + 54 + (off ? 16 : 0)) / W;
  const spans: { lo: number; hi: number }[] = [];
  const chipPos = placed.map(({ m, x, off, side }) => {
    const w = chipW(m, off);
    let lo = off ? (side === 'left' ? 0.01 : 0.99 - w) : x! - w / 2;
    for (const s of spans) if (lo < s.hi && lo + w > s.lo) lo = lo + w / 2 < (s.lo + s.hi) / 2 ? s.lo - w - 0.01 : s.hi + 0.01;
    lo = Math.min(Math.max(lo, 0.005), 0.995 - w);
    spans.push({ lo, hi: lo + w });
    return lo;
  });
  // Numbers hidden where a marker chip sits on the tape.
  const covered = (x: number) => spans.some((s) => x > s.lo - 0.03 && x < s.hi + 0.03);
  return (
    <div className="absolute inset-0" dir="ltr">
      {placed.map(({ m, x, off, end }) =>
        off || !end.inFront || end.y <= tapeFrac ? null : (
          <svg key={`line-${m.tone}`} className="absolute inset-0 size-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line
              x1={x! * 100}
              y1={tapeFrac * 100}
              x2={end.x * 100}
              // A line to a real target stops at its ring, so the target itself stays in view.
              y2={(Math.min(end.y, 1) - (m.target ? RING_R_PX / Math.max(frameH, 1) : 0)) * 100}
              vectorEffect="non-scaling-stroke"
              strokeWidth={2}
              strokeDasharray="5 4"
              className={m.tone === 'measured' ? 'stroke-accent-hot' : 'stroke-fg'}
            />
          </svg>
        ),
      )}
      {placed.map(({ m, off, end }) =>
        off || !m.target || !end.inFront || end.y > 1 ? null : (
          <span
            key={`ring-${m.tone}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-hot bg-transparent"
            style={{ left: `${end.x * 100}%`, top: `${end.y * 100}%`, width: RING_R_PX * 2, height: RING_R_PX * 2 }}
          />
        ),
      )}
      <div className="absolute inset-x-0 top-0 border-b border-border/70 bg-bg-elevated/85" style={{ height: TAPE_H }}>
        {ticks.map(({ b, x }) => (
          <span key={b} className={cn('absolute bottom-0 w-px bg-fg/60', b % 10 === 0 ? 'h-2' : 'h-1')} style={{ left: `${x * 100}%` }} />
        ))}
        {ticks
          .filter(({ b, x }) => b % 10 === 0 && !covered(x))
          .map(({ b, x }) => (
            <span key={`l${b}`} className="absolute top-1 -translate-x-1/2 font-mono text-sm font-semibold leading-4 text-black tabular-nums" style={{ left: `${x * 100}%` }}>
              {normalizeDegrees(b) === 0 ? 'צ' : String(normalizeDegrees(b)).padStart(3, '0')}
            </span>
          ))}
        {placed.map(({ m, off, side }, i) => {
          return (
            <span
              key={`chip-${m.tone}`}
              className={cn(
                'absolute top-[2px] flex h-[26px] items-center gap-1 whitespace-nowrap rounded-md border-2 bg-bg-elevated px-1.5 font-display text-sm font-bold text-black shadow-sm',
                // Text stays black; the role's colour is on the border (accent-hot is too light for small text).
                m.tone === 'measured' ? 'border-accent-hot' : 'border-fg',
              )}
              style={{ left: `${chipPos[i] * 100}%` }}
            >
              {off && side === 'left' && <span aria-hidden>◀</span>}
              <span dir="rtl">{m.label}</span>
              <span className="font-mono tabular-nums">{formatBearing(m.bearingDeg)}</span>
              {off && side === 'right' && <span aria-hidden>▶</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** The measured bearing to the road split, as marked in the view (its dashed line ends on F). Fixed: it never follows the camera. */
export const MEASURED_MARKER: TapeMarker = {
  bearingDeg: READINGS.forkBearingDeg,
  label: 'התפצלות הדרך',
  tone: 'measured',
  target: { E: FORK.E, N: FORK.N, heightM: heightAt(FORK.E, FORK.N) + 0.5 },
};
