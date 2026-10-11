'use client';

/* ─────────────── דאטום: התאמת האליפסואיד לכדור הארץ — guided 3-D ───────────────
   Replaces the 2-D DatumFit block of CoordinatesScene (deck "מבוא לגיאודזיה
   חלק א׳", slides 15–20 — no other source). Reference:
   design/mockups/datum-concepts/01-guided-3d-site-palette.png, brief:
   design/mockups/datum-concepts/claude-guided-3d-prompt.md.

   Layout: the lesson's guided-demo pattern (OnboardingScene, 32 : 68) — three
   stations in an accordion on the right, the live globe on the left with the
   surface selector and the demo timeline under it, the fit readout across the
   card, the two original explanation cards below. Every learning sentence is
   the original block's, word for word; the paragraph is only split, in its
   original order, between the lead and the stations. The geometry and the
   score are the original (datumGeometry.ts). */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { FIT_GOOD, RANGE, computeBest, scoreFor, type BestFits, type DatumMode, type Pose } from './datumGeometry';
import { PHASES, datumReducer, initialDatumState, isAnimating, type DatumAction, type DatumState, type Step, type Surface } from './datumDemo';
import { GapInset, SectionSvg } from './DatumSection';
import { GlobeOverlays, INSET, MARKER_R, makeOverlayRefs } from './datumOverlays';

const DatumGlobe3D = dynamic(() => import('./DatumGlobe3D'), { ssr: false, loading: () => null });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
/** Static render of the same globe, same camera, no text — shown while the 3-D
    view loads and, beside the live section, when WebGL is unavailable. */
const FALLBACK_SRC = `${BASE}/assets/lessons/topic02/datum-guided/datum-fallback.webp`;

/** Latin, digits and symbols inside Hebrew text (same as CoordinatesScene). */
function L({ children }: { children: React.ReactNode }) {
  return (
    <bdi dir="ltr" className="whitespace-nowrap">
      {children}
    </bdi>
  );
}

const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';
const BODY = 'text-base leading-relaxed text-black';

const DATUM_MODES: { id: DatumMode; label: string; body: string }[] = [
  { id: 'global', label: 'דאטום עולמי', body: 'מתאימים את האליפסואיד מרחבית לכלל כדור הארץ.' },
  { id: 'local', label: 'דאטום מקומי', body: 'מתאימים את האליפסואיד מרחבית רק לאזור מסוים על פני כדור הארץ (מסומן בקו עבה).' },
];

const SURFACES: { id: Surface; label: string }[] = [
  { id: 'surface', label: 'פני השטח' },
  { id: 'geoid', label: 'גיאואיד' },
  { id: 'ellipsoid', label: 'אליפסואיד' },
];
const SURFACE_LABEL = Object.fromEntries(SURFACES.map((s) => [s.id, s.label])) as Record<Surface, string>;

const STEPS: { title: string }[] = [{ title: 'גוף הייחוס' }, { title: 'מיקום וכיוון' }, { title: 'עולמי ומקומי' }];

let BEST: BestFits | null = null;
const getBest = () => (BEST ??= computeBest());
const reducer = (s: DatumState, a: DatumAction) => datumReducer(s, a, getBest());

export function DatumGuided() {
  const [state, dispatch] = useReducer(reducer, undefined, initialDatumState);
  const reduce = !!useReducedMotion();
  const best = getBest();
  const score = scoreFor(state.pose, state.mode, best);
  const good = score >= FIT_GOOD;
  const animating = isAnimating(state);
  const [expanded, setExpanded] = useState<Step | null>(0);

  // ── stage visibility: load near the viewport, pause off-screen / hidden tab ──
  const stageRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting) setActivated(true);
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!inView) dispatch({ type: 'pause' });
  }, [inView]);
  useEffect(() => {
    const onVis = () => document.hidden && dispatch({ type: 'pause' });
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // ── animation frames only while something moves ──
  useEffect(() => {
    if (!animating || !inView) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      dispatch({ type: 'tick', dt: Math.min(64, now - last) });
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animating, inView]);

  // ── WebGL / 3-D readiness ──
  const [webgl, setWebgl] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const [ready, setReady] = useState(false);
  const [capture, setCapture] = useState(false);
  useEffect(() => {
    let ok = false;
    try {
      const c = document.createElement('canvas');
      ok = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      ok = false;
    }
    setWebgl(ok ? 'yes' : 'no');
    setCapture(new URLSearchParams(window.location.search).has('datum-capture'));
  }, []);
  const onFail = useCallback(() => setWebgl('no'), []);
  const onReady = useCallback(() => setReady(true), []);

  // ── camera: reset nonce, wheel zoom only once the stage is engaged ──
  const [viewNonce, setViewNonce] = useState(0);
  const [cameraMoved, setCameraMoved] = useState(false);
  const [zoomOn, setZoomOn] = useState(false);
  useEffect(() => {
    const off = (e: PointerEvent) => {
      if (!stageRef.current?.contains(e.target as Node)) setZoomOn(false);
    };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, []);
  const resetView = () => {
    setViewNonce((n) => n + 1);
    setCameraMoved(false);
  };

  // ── fullscreen (the same mechanism as the lesson's other 3-D stages) ──
  const fsButtonRef = useRef<HTMLButtonElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => {
      const on = document.fullscreenElement === stageRef.current;
      setFullscreen(on);
      if (!on) fsButtonRef.current?.focus();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  };

  const refs = useMemo(() => makeOverlayRefs(stageRef), []);

  // ── actions ──
  const play = () => {
    if (reduce) {
      dispatch({ type: 'backToDemo' });
      dispatch({ type: 'stepReduced' });
    } else dispatch({ type: 'play' });
  };
  const togglePlay = () => dispatch(reduce ? { type: 'stepReduced' } : { type: 'togglePlay' });
  const showFit = () => dispatch({ type: 'showFit', instant: reduce });
  const onMovePose = useCallback((pose: Pose) => dispatch({ type: 'movePose', pose }), []);
  const onInspect = useCallback((t: number) => dispatch({ type: 'setInspect', t }), []);

  const clickStep = (i: Step) => {
    if (expanded === i) {
      setExpanded(null);
      return;
    }
    setExpanded(i);
    dispatch({ type: 'openStep', step: i });
  };
  const pickSurface = (s: Surface) => {
    // choosing the active surface again re-frames the explanation view
    if (s === state.surface) resetView();
    dispatch({ type: 'selectSurface', surface: s });
  };

  // ── announcements: once the pose settles, not every frame ──
  const meterLabel = state.mode === 'global' ? 'התאמה לכל כדור הארץ' : 'התאמה לאזור המסומן';
  const feedback =
    state.mode === 'global'
      ? 'האליפסואיד מותאם מרחבית לכלל כדור הארץ – זהו דאטום עולמי.'
      : 'האליפסואיד מותאם מרחבית רק לאזור המסומן – זהו דאטום מקומי.';
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    if (animating) return;
    const id = window.setTimeout(() => setAnnounce(`${meterLabel}: ${score}%.${good ? ` ${feedback}` : ''}`), 700);
    return () => window.clearTimeout(id);
  }, [animating, score, good, meterLabel, feedback]);

  const description = `המשטח הפעיל: ${SURFACE_LABEL[state.surface]}. גיאואיד גלי בכחול ואליפסואיד בכתום. ${
    state.mode === 'local' ? 'אזור ההתאמה מסומן בקו עבה בצד הימני העליון. ' : ''
  }התאמה: ${score} אחוז.`;

  const timelineOff = state.step === 0 || state.interaction === 'manual';
  const show3d = webgl === 'yes';

  return (
    <div className="my-10">
      <h3 className={H3}>דאטום: התאמת האליפסואיד לכדור הארץ</h3>
      <p className={LEAD}>
        <strong className="text-fg">דאטום</strong> הוא מכלול הפרמטרים המגדירים ומעגנים את האליפסואיד ביחס לפני כדור הארץ.
      </p>

      <div className="surface-elevated p-6 lg:p-8">
        <div className="grid md:grid-cols-[32fr_68fr] gap-6 items-start">
          {/* ── stations (right) ── */}
          <div className="space-y-1">
            {STEPS.map((st, idx) => {
              const i = idx as Step;
              const active = state.step === i;
              const open = expanded === i;
              return (
                <div
                  key={st.title}
                  className={cn(
                    'relative isolate overflow-hidden rounded-xl border transition-colors duration-200 ease-snap',
                    'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
                    active ? 'border-brand/45 bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-brand/30 hover:before:bg-brand/[0.03]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => clickStep(i)}
                    aria-expanded={open}
                    aria-controls={`datum-step-${i}`}
                    className="w-full p-4 text-start flex items-center gap-3 cursor-pointer rounded-xl focus-visible:ring-inset focus-visible:ring-offset-0"
                  >
                    <span
                      className={cn(
                        'size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ease-snap',
                        active ? 'bg-brand-dark text-bg-elevated' : 'bg-bg-accent text-fg-muted',
                      )}
                    >
                      <span className="font-display text-base font-bold">{i + 1}</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold leading-snug text-black text-lg md:text-xl">{st.title}</div>
                    </div>
                    <motion.span
                      animate={{ rotate: open ? 180 : 0 }}
                      transition={{ duration: reduce ? 0 : 0.25 }}
                      className={cn('shrink-0 inline-flex', open ? 'text-brand-dark' : 'text-fg-dim')}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key={`datum-panel-${i}`}
                        id={`datum-step-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1">
                          {i === 0 && (
                            <p className={BODY}>
                              נחשוב על הדאטום כעל הגוף המתמטי שמתאר בצורה הטובה ביותר את כדור הארץ כולו, או חלק ממנו – ונזכיר כי בלתי אפשרי לתאר את
                              כדור הארץ בצורה מתמטית, רק פיזיקלית.
                            </p>
                          )}
                          {i === 1 && (
                            <>
                              <p className={BODY}>
                                המטרה: שהדאטום יהיה כמה שיותר דומה וקרוב לפני השטח. בתרשים – כדור הארץ כפי שהוא מוגדר על ידי שילוב של גיאואיד (בכחול)
                                ואליפסואיד (בכתום). הזיזו, סובבו ושנו את קנה המידה של האליפסואיד כדי להלביש אותו על הגיאואיד.
                              </p>
                              <FitControls state={state} dispatch={dispatch} onPlay={play} onShowFit={showFit} />
                            </>
                          )}
                          {i === 2 && (
                            <>
                              <div role="group" aria-label="סוג הדאטום" className="grid grid-cols-2 gap-2 mb-3">
                                {DATUM_MODES.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    aria-pressed={state.mode === m.id}
                                    onClick={() => dispatch({ type: 'setMode', mode: m.id })}
                                    className={cn(
                                      'rounded-xl border px-3 py-2 font-display text-base font-bold text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                                      state.mode === m.id ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                                    )}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                              <p className={BODY}>{DATUM_MODES.find((m) => m.id === state.mode)!.body}</p>
                              <FitControls state={state} dispatch={dispatch} onPlay={play} onShowFit={showFit} />
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* ── the visualisation (left) ── */}
          <div className="min-w-0">
            <div
              ref={stageRef}
              role="group"
              aria-label="דאטום: התאמת האליפסואיד לכדור הארץ"
              aria-describedby="datum-stage-desc"
              onPointerDown={() => setZoomOn(true)}
              onFocus={() => setZoomOn(true)}
              className={cn('relative w-full overflow-hidden bg-bg-elevated', fullscreen ? 'h-full' : 'h-[440px] rounded-xl')}
            >
              <p id="datum-stage-desc" className="sr-only">
                {description}
              </p>

              {show3d && (
                <>
                  {/* the static render under the canvas until the first 3-D frame — never an empty card */}
                  {!ready && <StaticGlobe className="absolute inset-0" />}
                  {activated && (
                    <div className="absolute inset-0">
                      <DatumGlobe3D
                        pose={state.pose}
                        mode={state.mode}
                        surface={state.surface}
                        interaction={state.interaction}
                        inspect={state.inspect}
                        active={inView}
                        reduce={reduce}
                        viewNonce={viewNonce}
                        zoomEnabled={zoomOn}
                        capture={capture}
                        showMarker
                        refs={refs}
                        onMovePose={onMovePose}
                        onInspect={onInspect}
                        onReady={onReady}
                        onFail={onFail}
                        onCameraMoved={() => setCameraMoved(true)}
                      />
                    </div>
                  )}
                  {!capture && <GlobeOverlays refs={refs} surface={state.surface} labels={SURFACE_LABEL} />}
                  {!capture && (
                    <InspectMarker
                      markerRef={refs.marker}
                      t={state.inspect}
                      onKey={(dt) => dispatch({ type: 'setInspect', t: state.inspect + dt })}
                    />
                  )}
                </>
              )}

              {webgl === 'no' && (
                // No WebGL: the static render, plainly a picture, beside the live section the controls drive.
                // Both sit side by side across the top; the close-up keeps its slot below.
                <div className="absolute inset-x-0 top-0 grid grid-cols-2 items-start gap-3 pt-2">
                  <SectionSvg pose={state.pose} mode={state.mode} score={score} className="aspect-[3/2] w-full" />
                  <StaticGlobe className="relative block h-auto w-full" />
                </div>
              )}

              {/* the linked close-up: lower left, beside the globe (illustration side, not mirrored) */}
              {!capture && (
                <GapInset
                  pose={state.pose}
                  inspect={state.inspect}
                  mode={state.mode}
                  surface={state.surface}
                  size={INSET.size}
                  live={show3d && ready}
                  className="absolute"
                  style={{ left: INSET.left, bottom: INSET.bottom }}
                />
              )}

              {!capture && (
                <div className="absolute bottom-2 start-2 flex items-center gap-2">
                  {show3d && (
                    <button
                      type="button"
                      onClick={resetView}
                      className={cn(
                        'h-9 rounded-xl border border-border bg-bg-elevated/95 px-3 font-display text-sm font-semibold text-fg-muted transition-colors hover:border-brand/30 hover:text-fg cursor-pointer',
                        !cameraMoved && 'opacity-70',
                      )}
                    >
                      החזרת המבט
                    </button>
                  )}
                  <button
                    ref={fsButtonRef}
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={fullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
                    title={fullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
                    className="grid size-9 place-items-center rounded-xl border border-border bg-bg-elevated/95 text-fg-muted transition-colors hover:border-brand/30 hover:text-fg cursor-pointer"
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      {fullscreen ? <path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" /> : <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" />}
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* active surface */}
            <div
              role="radiogroup"
              aria-label="המשטח הפעיל"
              className="mx-auto mt-3 grid w-full max-w-[496px] grid-cols-3 gap-1 rounded-xl border border-border bg-bg-accent p-1"
              onKeyDown={(e) => {
                const i = SURFACES.findIndex((s) => s.id === state.surface);
                // RTL row: ArrowLeft goes to the next item (visually left)
                const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                const next = SURFACES[(i + d + SURFACES.length) % SURFACES.length];
                dispatch({ type: 'selectSurface', surface: next.id });
                (e.currentTarget.querySelector(`[data-surface="${next.id}"]`) as HTMLElement | null)?.focus();
              }}
            >
              {SURFACES.map((s) => {
                const on = state.surface === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    data-surface={s.id}
                    onClick={() => pickSurface(s.id)}
                    className={cn(
                      'h-9 rounded-lg font-display text-base font-bold transition-colors duration-200 ease-snap motion-reduce:transition-none cursor-pointer',
                      on ? 'bg-brand-dark text-bg-elevated' : 'text-fg hover:bg-brand/[0.08]',
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <Timeline state={state} disabled={timelineOff} reduce={reduce} onToggle={togglePlay} onScrub={(p) => dispatch({ type: 'scrub', progress: p })} />
          </div>
        </div>

        {/* fit readout across the card — the original meter, labels and feedback */}
        <div className={cn('mt-6 rounded-xl p-4 sm:p-5 transition-colors motion-reduce:transition-none', good ? 'bg-brand/10' : 'bg-bg-accent/60')}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-display font-semibold text-fg-muted">{meterLabel}</span>
            <span className="font-display text-3xl font-bold tabular-nums text-fg">
              <L>{score}%</L>
            </span>
          </div>
          {good && <p className="mt-1 text-base leading-relaxed text-fg">{feedback}</p>}
          <p className="mt-2 text-sm text-fg-muted">בהמחשה הדו־ממדית יש ארבעה פרמטרים בלבד: הזזה בשני צירים, סיבוב וקנה מידה.</p>
        </div>
        <div aria-live="polite" className="sr-only">
          {announce}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="surface p-5 sm:p-6">
          <h4 className="font-display text-lg font-bold leading-snug text-fg mb-2">ההבדל בין אליפסואיד לדאטום</h4>
          <p className="text-base leading-relaxed text-fg mb-2">תהליך המעבר מאליפסואיד לדאטום נעשה בשבעה פרמטרים:</p>
          <ul className="space-y-1.5 text-base leading-relaxed text-fg">
            <li>
              <strong>שלושה פרמטרי הזזה</strong> – הזזה של הדאטום עצמו במרחב (<L>X, Y, Z</L>).
            </li>
            <li>
              <strong>שלושה פרמטרי סיבוב</strong> – סיבוב של הדאטום סביב הצירים שלו (<L>X, Y, Z</L>).
            </li>
            <li>
              <strong>פרמטר קנה מידה</strong> – שינוי הגודל של הדאטום.
            </li>
          </ul>
          <p className="mt-2 text-sm text-fg-muted">כמו פקק שצריך להתאים לבקבוק שלו.</p>
        </div>
        <div className="surface p-5 sm:p-6">
          <h4 className="font-display text-lg font-bold leading-snug text-fg mb-2">ההבדל בין הדאטומים השונים</h4>
          <p className="text-base leading-relaxed text-fg mb-2">הדאטומים השונים נבדלים ביניהם בפרמטרים הבאים:</p>
          <ul className="space-y-1.5 text-base leading-relaxed text-fg">
            <li>
              רדיוס (<L>a</L>)
            </li>
            <li>
              פחיסות (<L>f</L>)
            </li>
            <li>
              שלושה פרמטרי הזזה במרחב (<L>∆x, ∆y, ∆z</L>)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── demo / manual controls (inside the open station) ─────────────── */

function FitControls({
  state,
  dispatch,
  onPlay,
  onShowFit,
}: {
  state: DatumState;
  dispatch: React.Dispatch<DatumAction>;
  onPlay: () => void;
  onShowFit: () => void;
}) {
  const { pose } = state;
  const set = (key: keyof Pose) => (value: number) => dispatch({ type: 'setPose', key, value });
  if (state.interaction === 'demo') {
    return (
      <div className="mt-4 flex gap-2">
        <Button size="md" className="flex-1 px-4" onClick={onPlay}>
          הפעלת ההדגמה
        </Button>
        <Button variant="secondary" size="md" className="flex-1 px-4" onClick={() => dispatch({ type: 'tryYourself' })}>
          נסו בעצמכם
        </Button>
      </div>
    );
  }
  return (
    <>
      <div className="mt-4 flex flex-col gap-3">
        <RangeRow label="הזזה – ציר X" min={RANGE.dx[0]} max={RANGE.dx[1]} step={2} value={pose.dx} onChange={set('dx')} valueText="הזזה בציר X" display={`${pose.dx}`} />
        {/* SVG y grows downward; the slider and its readout count upward. */}
        <RangeRow
          label="הזזה – ציר Y"
          min={-RANGE.dy[1]}
          max={-RANGE.dy[0]}
          step={2}
          value={-pose.dy}
          onChange={(v) => set('dy')(-v)}
          valueText="הזזה בציר Y"
          display={`${-pose.dy}`}
        />
        <RangeRow label="סיבוב" min={RANGE.rot[0]} max={RANGE.rot[1]} step={1} value={pose.rot} onChange={set('rot')} valueText="סיבוב" display={`${pose.rot}°`} />
        <RangeRow label="קנה מידה" min={RANGE.s[0]} max={RANGE.s[1]} step={0.01} value={pose.s} onChange={set('s')} valueText="קנה מידה" display={`×${pose.s.toFixed(2)}`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'reset' })}>
          איפוס
        </Button>
        <Button variant="secondary" size="sm" onClick={onShowFit}>
          הצגת התאמה
        </Button>
        <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'backToDemo' })}>
          חזרה להדגמה
        </Button>
      </div>
    </>
  );
}

/* Range input — same recipe as CoordinatesScene's RangeRow (native thumb,
   ember focus ring). The pose is snapped to these steps in manual mode. */
function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  valueText,
  display,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  valueText: string;
  display: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm font-display font-semibold text-fg-muted">
        <span>{label}</span>
        <L>{display}</L>
      </span>
      {/* dir="ltr": the thumb travels the same way as the body it moves. */}
      <span dir="ltr" className="relative mt-1 block h-7">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${valueText}: ${display}`}
          className={cn(
            'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent rounded-full focus-visible:ring-0 focus-visible:ring-offset-0',
            '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:mt-0.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bg-elevated [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-cta-ember',
            '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-bg-elevated [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent',
            '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
            '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
          )}
        />
      </span>
    </label>
  );
}

/* ─────────────── demo timeline (under the globe) ─────────────── */

// Same inset-track geometry as DatumShiftDemo's slider: the native thumb's
// centre only travels between THUMB/2 and 100% − THUMB/2.
const THUMB_PX = 24;
const track = (fr: number) => `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${fr})`;
const phaseName = (p: number) => (p <= PHASES.hold ? '' : p <= PHASES.shift ? 'הזזה' : p <= PHASES.rotate ? 'סיבוב' : p <= PHASES.scale ? 'קנה מידה' : '');

function Timeline({
  state,
  disabled,
  reduce,
  onToggle,
  onScrub,
}: {
  state: DatumState;
  disabled: boolean;
  reduce: boolean;
  onToggle: () => void;
  onScrub: (p: number) => void;
}) {
  const playing = state.playback === 'playing' && state.interaction === 'demo';
  const mid = state.progress > 0 && state.progress < 1 && state.interaction === 'demo';
  const label = playing ? 'השהיה' : 'המשך';
  // Starting the demo belongs to the station's own button; this one only pauses and resumes.
  const canToggle = !disabled && (playing || (mid && state.playback === 'paused'));
  const pct = Math.round(state.progress * 100);
  const phase = phaseName(state.progress);
  return (
    // dir="ltr": a timeline runs left → right, play button first (as in the reference).
    <div dir="ltr" className={cn('mt-3 flex items-center gap-3 transition-opacity', disabled && 'opacity-45')}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!canToggle}
        aria-label={label}
        title={label}
        className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-accent bg-bg-elevated text-accent transition-colors hover:bg-accent/10 cursor-pointer disabled:cursor-not-allowed disabled:hover:bg-bg-elevated"
      >
        {playing && !reduce ? (
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden>
            <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
            <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden>
            <path d="M4.5 2.6v10.8a.6.6 0 0 0 .9.5l8.4-5.4a.6.6 0 0 0 0-1L5.4 2.1a.6.6 0 0 0-.9.5Z" />
          </svg>
        )}
      </button>
      <div className="relative h-8 flex-1">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
        <div aria-hidden className="absolute start-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-cta-ember" style={{ width: track(state.progress) }} />
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(state.progress * 1000)}
          disabled={disabled}
          onChange={(e) => onScrub(Number(e.target.value) / 1000)}
          aria-label="התקדמות ההדגמה"
          aria-valuetext={`${pct}%${phase ? ` · ${phase}` : ''}`}
          className={cn(
            'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed',
            '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:mt-1 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bg-elevated [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-cta-ember',
            '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-bg-elevated [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent',
            '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
            '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
          )}
        />
      </div>
    </div>
  );
}

/* ─────────────── inspection marker + static render ─────────────── */

/** The close-up's inspection point on the exercise wall: drag it along the
    section (DatumGlobe3D handles the pointer) or use the arrow keys. */
function InspectMarker({ markerRef, t, onKey }: { markerRef: React.RefObject<HTMLDivElement | null>; t: number; onKey: (dt: number) => void }) {
  const deg = Math.round((-t * 180) / Math.PI);
  return (
    <div
      ref={markerRef}
      role="slider"
      tabIndex={0}
      aria-label="נקודת הבדיקה"
      aria-valuemin={-83}
      aria-valuemax={83}
      aria-valuenow={deg}
      aria-valuetext={`${deg}°`}
      onKeyDown={(e) => {
        const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? -0.05 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? 0.05 : 0;
        if (!d) return;
        e.preventDefault();
        onKey(d);
      }}
      className="absolute left-0 top-0 cursor-grab touch-none rounded-full border-2 border-dashed border-fg bg-bg-elevated/25 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      style={{ width: MARKER_R * 2, height: MARKER_R * 2, opacity: 0 }}
    />
  );
}

function StaticGlobe({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export
    <img src={FALLBACK_SRC} alt="" aria-hidden draggable={false} onError={() => setFailed(true)} className={cn('object-contain', className)} />
  );
}
