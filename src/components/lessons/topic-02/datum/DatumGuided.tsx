'use client';

/* ─────────────── דאטום: התאמת האליפסואיד לכדור הארץ — guided 3-D ───────────────
   Replaces the 2-D DatumFit block of CoordinatesScene (deck "מבוא לגיאודזיה
   חלק א׳", slides 15–20 — no other source). Reference:
   design/mockups/datum-concepts/01-guided-3d-site-palette.png; briefs:
   claude-guided-3d-prompt.md, and for what each action means
   claude-interaction-and-learning-refinement-prompt.md.

   Layout: the lesson's guided-demo pattern (OnboardingScene, 32 : 68) — three
   stations in an accordion on the right; on the left the live globe, under
   it only the active station's own control, and the feedback right under
   that, in the same column (normal flow — an open station never pushes it
   away from the globe). One action per station:
   1. "גוף הייחוס" — choose a surface to tell the three bodies apart;
   2. "מיקום וכיוון" — one demo button (shift → rotate → scale, each phase
      changing only its own parameter) and an optional four-parameter
      experiment behind "נסו בעצמכם";
   3. "עולמי ומקומי" — global or local, applied at once, read at two fixed
      check points.
   No score is shown: the original 0–100 measure is a schematic distance to
   the computed fit, not a geodetic accuracy or a measure of learning
   (datumGeometry keeps it for the tests). The deck's sentences are kept
   except where the brief approved a focused rewording (listed in
   design/docs/assumptions.md, 2026-10-12). */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { RANGE, computeBest, gapAt, type BestFits, type DatumMode, type Pose } from './datumGeometry';
import {
  PHASES, PROBES, datumReducer, demoPose, initialDatumState, inspectOf, isAnimating, lookOf, phaseAt, phaseStart, viewPose,
  type DatumAction, type DatumState, type Guide, type Phase, type Probe, type Step, type Surface,
} from './datumDemo';
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
  { id: 'global', label: 'דאטום עולמי', body: 'בדאטום עולמי מתאימים את האליפסואיד לצורת כדור הארץ כולו.' },
  { id: 'local', label: 'דאטום מקומי', body: 'בדאטום מקומי מתמקדים בהתאמת האליפסואיד לאזור מסוים על פני כדור הארץ. בהמחשה האזור מסומן בקו עבה.' },
];
const MODE_NAME: Record<DatumMode, string> = { global: 'העולמי', local: 'המקומי' };
const SCOPE: Record<DatumMode, string> = { global: 'תחום ההתאמה: כלל כדור הארץ.', local: 'תחום ההתאמה: האזור המסומן.' };

const SURFACES: { id: Surface; label: string }[] = [
  { id: 'surface', label: 'פני השטח' },
  { id: 'geoid', label: 'גיאואיד' },
  { id: 'ellipsoid', label: 'אליפסואיד' },
];
const SURFACE_LABEL = Object.fromEntries(SURFACES.map((s) => [s.id, s.label])) as Record<Surface, string>;
/** What the body in focus is, and what the view does to show it. */
const SURFACE_NOTE: Record<Surface, string> = {
  surface: 'המעטפת של כדור הארץ, עם התבליט של היבשות. הגיאואיד והאליפסואיד נראים בחתך.',
  geoid: 'משטח גלי, המתאר בקירוב את פני הים הממוצעים. המעטפת שקופה כדי לחשוף אותו.',
  ellipsoid: 'גוף גאומטרי חלק, המתאר בקירוב את צורת כדור הארץ. הגיאואיד נשאר ברקע כייחוס.',
};

const PHASE_LIST: { id: Phase; label: string; note: string }[] = [
  { id: 'shift', label: 'הזזה', note: 'רק המיקום של האליפסואיד משתנה; הכיוון והגודל נשמרים.' },
  { id: 'rotate', label: 'סיבוב', note: 'רק הכיוון של האליפסואיד משתנה; המיקום והגודל נשמרים.' },
  { id: 'scale', label: 'קנה מידה', note: 'הגודל משתנה באופן אחיד; המיקום, הכיוון והצורה נשמרים.' },
];

/** The experiment's four parameters: label, and what changing it changes. */
const PARAMS: Record<keyof Pose, { label: string; note: string }> = {
  dx: { label: 'הזזה אופקית (X)', note: 'משנה רק את מיקום האליפסואיד, לאורך הציר האופקי.' },
  dy: { label: 'הזזה אנכית (Y)', note: 'משנה רק את מיקום האליפסואיד, לאורך הציר האנכי.' },
  rot: { label: 'סיבוב', note: 'משנה רק את הכיוון של האליפסואיד.' },
  s: { label: 'קנה מידה', note: 'משנה את הגודל באופן אחיד, בלי לשנות את הצורה.' },
};

const PROBE_LIST: { id: Probe; label: string; where: string }[] = [
  { id: 'inside', label: 'באזור המסומן', where: 'בנקודה שבאזור המסומן' },
  { id: 'outside', label: 'מחוץ לאזור', where: 'בנקודה שמחוץ לאזור' },
];

const STEPS: { title: string }[] = [{ title: 'גוף הייחוס' }, { title: 'מיקום וכיוון' }, { title: 'עולמי ומקומי' }];

let BEST: BestFits | null = null;
const getBest = () => (BEST ??= computeBest());
const reducer = (s: DatumState, a: DatumAction) => datumReducer(s, a, getBest());

const samePose = (a: Pose, b: Pose) => a.dx === b.dx && a.dy === b.dy && a.rot === b.rot && a.s === b.s;

/** The gap at a check point, in words — from the computed gap of this fit and of the other one
    at the same point (section units; the close-up's arrow is the same distance). */
function probeNote(mode: DatumMode, probe: Probe, best: BestFits) {
  const other: DatumMode = mode === 'global' ? 'local' : 'global';
  const gap = gapAt(best[mode].pose, PROBES[probe]);
  const otherGap = gapAt(best[other].pose, PROBES[probe]);
  const level =
    gap < 3
      ? 'הגיאואיד והאליפסואיד כמעט חופפים'
      : gap < 8
        ? 'נשאר פער קטן בין הגיאואיד לאליפסואיד'
        : gap < 20
          ? 'נשאר פער בין הגיאואיד לאליפסואיד'
          : 'נשאר פער גדול בין הגיאואיד לאליפסואיד';
  const cmp =
    Math.abs(gap - otherGap) < 2
      ? `בדאטום ${MODE_NAME[other]} הפער כאן דומה.`
      : `בדאטום ${MODE_NAME[other]} הפער כאן ${gap < otherGap ? 'גדול' : 'קטן'} יותר.`;
  return `${PROBE_LIST.find((p) => p.id === probe)!.where} ${level}. ${cmp}`;
}

type ParamFocus = { key: keyof Pose; from: Pose } | null;

export function DatumGuided() {
  const [state, dispatch] = useReducer(reducer, undefined, initialDatumState);
  const reduce = !!useReducedMotion();
  const best = getBest();
  const fit = best.global.pose;
  const pose = viewPose(state, best);
  const inspect = inspectOf(state);
  const look = lookOf(state);
  const animating = isAnimating(state);
  const { lab, step } = state;
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

  // ── wheel zoom only once the stage is engaged (the lesson scrolls otherwise) ──
  const [zoomOn, setZoomOn] = useState(false);
  useEffect(() => {
    const off = (e: PointerEvent) => {
      if (!stageRef.current?.contains(e.target as Node)) setZoomOn(false);
    };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, []);

  const refs = useMemo(() => makeOverlayRefs(stageRef), []);

  // ── station 2: the parameter being adjusted (focus / drag) — its marks and its note ──
  const [param, setParam] = useState<ParamFocus>(null);
  const onParam = useCallback((key: keyof Pose | null) => setParam(key ? { key, from: lab.pose } : null), [lab.pose]);
  const manual = lab.interaction === 'manual';
  const phase = step === 1 && !manual && lab.playback !== 'idle' ? phaseAt(lab.progress) : null;
  const guide = useMemo<Guide | null>(() => {
    if (step !== 1) return null;
    if (manual) {
      if (!param) return null;
      if (param.key === 'rot') return { kind: 'rotate' };
      if (param.key === 's') return { kind: 'scale', from: param.from };
      return { kind: 'axis', axis: param.key === 'dx' ? 'x' : 'y', from: param.from };
    }
    if (phase === 'shift') return { kind: 'shift', from: phaseStart('shift', fit), to: demoPose(PHASES.shift, fit) };
    if (phase === 'rotate') return { kind: 'rotate' };
    if (phase === 'scale') return { kind: 'scale', from: phaseStart('scale', fit) };
    return null;
  }, [step, manual, param, phase, fit]);

  // ── focus stays somewhere sensible when the experiment opens / closes ──
  const tryRef = useRef<HTMLDivElement>(null);
  const labRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef<'lab' | 'try' | null>(null);
  useEffect(() => {
    const f = focusNext.current;
    focusNext.current = null;
    if (f === 'lab') labRef.current?.querySelector<HTMLInputElement>('input[type=range]')?.focus();
    if (f === 'try') tryRef.current?.querySelector('button')?.focus();
  }, [manual]);

  // ── actions ──
  const onDemo = () => dispatch(reduce ? { type: 'demoStep' } : { type: 'demo' });
  const clickStep = (i: Step) => {
    if (expanded === i) {
      // closing the text keeps the station (and its view) as it is
      setExpanded(null);
      return;
    }
    setExpanded(i);
    setParam(null);
    dispatch({ type: 'openStep', step: i, instant: reduce });
  };
  const onMovePose = useCallback((p: Pose) => dispatch({ type: 'movePose', pose: p }), []);
  const onInspect = useCallback((t: number) => dispatch({ type: 'setInspect', t }), []);

  const demoLabel =
    manual || lab.playback === 'idle'
      ? 'הפעלת ההדגמה'
      : lab.playback === 'ended'
        ? 'הדגמה חוזרת'
        : reduce
          ? 'לשלב הבא'
          : lab.playback === 'playing'
            ? 'עצירת ההדגמה'
            : 'המשך ההדגמה';

  // ── feedback: short, about the active station ──
  const feedback = useMemo(() => {
    if (step === 0) return { title: `במיקוד: ${SURFACE_LABEL[state.surface]}`, body: SURFACE_NOTE[state.surface] };
    if (step === 1) {
      if (manual) {
        if (param) return { title: PARAMS[param.key].label, body: PARAMS[param.key].note };
        return {
          title: 'ניסוי',
          body: samePose(lab.pose, fit) ? 'זו ההתאמה המחושבת בהמחשה.' : 'שנו פרמטר אחד בכל פעם, ובחנו מה משתנה במודל.',
        };
      }
      if (lab.playback === 'ended') return { title: 'סוף ההדגמה', body: 'האליפסואיד הוזז, סובב והוגדל עד שהוא קרוב לגיאואיד.' };
      const ph = PHASE_LIST.find((p) => p.id === phase);
      if (ph) return { title: ph.label, body: ph.note };
      return { title: 'לפני ההדגמה', body: 'האליפסואיד (בכתום) מוזז ומסובב ביחס לגיאואיד, וקטן ממנו.' };
    }
    return { title: SCOPE[state.mode], body: probeNote(state.mode, state.probe, best) };
  }, [step, state.surface, state.mode, state.probe, manual, param, lab.pose, lab.playback, phase, fit, best]);

  // announced once things settle — not every frame, not every slider step
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    if (animating) return;
    const id = window.setTimeout(() => setAnnounce(`${feedback.title} ${feedback.body}`), 700);
    return () => window.clearTimeout(id);
  }, [animating, feedback]);

  const mode: DatumMode = step === 2 ? state.mode : 'global';
  const description = [
    step === 0 ? `המשטח במיקוד: ${SURFACE_LABEL[state.surface]}.` : step === 1 ? 'האליפסואיד בהמחשת הזזה, סיבוב וקנה מידה.' : SCOPE[state.mode],
    'גיאואיד גלי בכחול ואליפסואיד בכתום.',
    mode === 'local' ? 'אזור ההתאמה מסומן בקו עבה בצד הימני העליון.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const show3d = webgl === 'yes';
  const otherProbe: Probe = state.probe === 'inside' ? 'outside' : 'inside';
  // the stepper: the demo's active phase (the ones before it done); in the experiment, the kind
  // of change the parameter being adjusted makes
  const activePhase: Phase | null = manual
    ? param && (param.key === 'rot' ? 'rotate' : param.key === 's' ? 'scale' : 'shift')
    : lab.playback === 'ended'
      ? null
      : phase;
  const phaseIndex = manual ? -1 : lab.playback === 'ended' ? PHASE_LIST.length : PHASE_LIST.findIndex((p) => p.id === activePhase);

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
              const active = step === i;
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
                    aria-current={active ? 'step' : undefined}
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
                            <>
                              <p className={BODY}>האליפסואיד הוא מודל מתמטי המתאר בקירוב את צורת כדור הארץ. הדאטום קובע את מיקומו ואת כיוונו ביחס לכדור הארץ.</p>
                              <p className="mt-2 text-sm font-display font-semibold text-fg-muted">בחרו בפני השטח, בגיאואיד או באליפסואיד כדי לראות את ההבדלים ביניהם.</p>
                            </>
                          )}
                          {i === 1 && (
                            <>
                              <p className={BODY}>כדי להתאים את האליפסואיד לכדור הארץ, משנים את מיקומו, את כיוונו ואת קנה המידה שלו. בהדגמה נראה בנפרד את השפעת ההזזה, הסיבוב ושינוי הגודל.</p>
                              {manual ? (
                                <Experiment
                                  ref={labRef}
                                  pose={lab.pose}
                                  dispatch={dispatch}
                                  reduce={reduce}
                                  onParam={onParam}
                                  onBack={() => {
                                    focusNext.current = 'try';
                                    setParam(null);
                                    dispatch({ type: 'backToDemo', instant: reduce });
                                  }}
                                />
                              ) : (
                                <div ref={tryRef} className="mt-4">
                                  <Button
                                    variant="secondary"
                                    size="md"
                                    className="w-full px-4"
                                    onClick={() => {
                                      focusNext.current = 'lab';
                                      dispatch({ type: 'tryYourself' });
                                    }}
                                  >
                                    נסו בעצמכם
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                          {i === 2 && (
                            <>
                              <div role="radiogroup" aria-label="סוג הדאטום" className="grid grid-cols-2 gap-2 mb-3">
                                {DATUM_MODES.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={state.mode === m.id}
                                    onClick={() => dispatch({ type: 'setMode', mode: m.id, instant: reduce })}
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

          {/* ── the visualisation (left): the globe, the active station's control, its feedback ── */}
          <div className="min-w-0">
            <div
              ref={stageRef}
              role="group"
              aria-label="דאטום: התאמת האליפסואיד לכדור הארץ"
              aria-describedby="datum-stage-desc"
              onPointerDown={() => setZoomOn(true)}
              onFocus={() => setZoomOn(true)}
              data-station={step}
              data-look={look}
              data-playback={step === 1 ? (manual ? 'manual' : lab.playback) : ''}
              data-phase={activePhase ?? ''}
              data-guide={guide?.kind ?? ''}
              data-pose={`${pose.dx.toFixed(2)},${pose.dy.toFixed(2)},${pose.rot.toFixed(2)},${pose.s.toFixed(3)}`}
              data-inspect={inspect.toFixed(3)}
              className="relative h-[440px] w-full overflow-hidden rounded-xl bg-bg-elevated"
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
                        pose={pose}
                        mode={mode}
                        look={look}
                        draggable={step === 1 && manual}
                        guide={guide}
                        inspect={inspect}
                        altInspect={step === 2 ? PROBES[otherProbe] : null}
                        markerDraggable={step !== 2}
                        active={inView}
                        reduce={reduce}
                        zoomEnabled={zoomOn}
                        capture={capture}
                        showMarker
                        refs={refs}
                        onMovePose={onMovePose}
                        onInspect={onInspect}
                        onReady={onReady}
                        onFail={onFail}
                      />
                    </div>
                  )}
                  {!capture && <GlobeOverlays refs={refs} emph={step === 0 ? state.surface : null} labels={SURFACE_LABEL} />}
                  {!capture && (
                    <InspectMarker
                      markerRef={refs.marker}
                      t={inspect}
                      interactive={step !== 2}
                      onKey={(dt) => dispatch({ type: 'setInspect', t: state.inspect + dt })}
                    />
                  )}
                  {!capture && (
                    <ProbeMarker markerRef={refs.markerAlt} shown={step === 2} onPick={() => dispatch({ type: 'setProbe', probe: otherProbe })} />
                  )}
                </>
              )}

              {webgl === 'no' && (
                // No WebGL: the static render, plainly a picture, beside the live section the controls drive.
                // Both sit side by side across the top; the close-up keeps its slot below.
                <div className="absolute inset-x-0 top-0 grid grid-cols-2 items-start gap-3 pt-2">
                  <SectionSvg
                    pose={pose}
                    mode={mode}
                    look={look}
                    guide={guide}
                    probes={step === 2 ? { on: PROBES[state.probe], off: PROBES[otherProbe] } : null}
                    description={description}
                    className="aspect-[3/2] w-full"
                  />
                  <StaticGlobe className="relative block h-auto w-full" />
                </div>
              )}

              {/* the linked close-up: lower left, beside the globe (illustration side, not mirrored) */}
              {!capture && (
                <GapInset
                  pose={pose}
                  inspect={inspect}
                  mode={mode}
                  emph={step === 0 && state.surface !== 'surface' ? state.surface : step === 1 ? 'ellipsoid' : null}
                  size={INSET.size}
                  live={show3d && ready}
                  className="absolute"
                  style={{ left: INSET.left, bottom: INSET.bottom }}
                />
              )}
            </div>

            {/* the active station's own control, right under the globe */}
            <div className="mt-3 min-h-12">
              {step === 0 && (
                <Segmented
                  label="המשטח במיקוד"
                  items={SURFACES}
                  value={state.surface}
                  onChange={(s) => dispatch({ type: 'selectSurface', surface: s })}
                  attr="data-surface"
                />
              )}
              {step === 1 && (
                <div className="flex items-center gap-3">
                  <Button size="md" className="min-w-[184px] shrink-0 px-5" onClick={onDemo}>
                    {demoLabel}
                  </Button>
                  <ol aria-label="שלבי ההדגמה" className="flex flex-1 items-center justify-center gap-1.5">
                    {PHASE_LIST.map((p, k) => {
                      const on = p.id === activePhase;
                      const done = k < phaseIndex;
                      return (
                        <li key={p.id} aria-current={on ? 'step' : undefined} className="flex items-center gap-1.5">
                          {k > 0 && (
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-fg-dim" aria-hidden>
                              <path d="m10 3.5-4.5 4.5 4.5 4.5" />
                            </svg>
                          )}
                          <span
                            className={cn(
                              'inline-flex h-9 items-center gap-1 rounded-full px-3.5 font-display text-base font-bold transition-colors duration-200 ease-snap motion-reduce:transition-none',
                              on ? 'bg-brand-dark text-bg-elevated' : done ? 'text-fg' : 'text-fg-muted',
                            )}
                          >
                            {done && (
                              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-dark" aria-hidden>
                                <path d="m3.5 8.5 3 3 6-7" />
                              </svg>
                            )}
                            {p.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
              {step === 2 && (
                <div className="mx-auto flex w-full max-w-[560px] items-center gap-3">
                  <span className="shrink-0 text-sm font-display font-semibold text-fg-muted">נקודת הבדיקה</span>
                  <Segmented
                    label="נקודת הבדיקה"
                    items={PROBE_LIST}
                    value={state.probe}
                    onChange={(p) => dispatch({ type: 'setProbe', probe: p })}
                    attr="data-probe"
                    className="flex-1"
                  />
                </div>
              )}
            </div>

            {/* feedback: short, about the active station — in flow, right under the globe's control */}
            <div data-datum-feedback className="mt-3 min-h-[92px] rounded-xl bg-bg-accent/60 p-4">
              <p className="font-display text-base font-bold leading-snug text-fg">{feedback.title}</p>
              <p className="mt-1 text-base leading-relaxed text-fg">{feedback.body}</p>
            </div>
            <div aria-live="polite" className="sr-only">
              {announce}
            </div>
          </div>
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

/* ─────────────── a segmented radio group (the surfaces, the check points) ─────────────── */

function Segmented<T extends string>({
  label,
  items,
  value,
  onChange,
  attr,
  className,
}: {
  label: string;
  items: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** a data attribute naming each option (for keyboard focus and tests) */
  attr: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('mx-auto grid w-full max-w-[496px] gap-1 rounded-xl border border-border bg-bg-accent p-1', className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      onKeyDown={(e) => {
        const i = items.findIndex((s) => s.id === value);
        // RTL row: ArrowLeft goes to the next item (visually left)
        const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const next = items[(i + d + items.length) % items.length];
        onChange(next.id);
        (e.currentTarget.querySelector(`[${attr}="${next.id}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {items.map((s) => {
        const on = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            {...{ [attr]: s.id }}
            onClick={() => onChange(s.id)}
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
  );
}

/* ─────────────── station 2: the optional experiment (inside the open station) ─────────────── */

function Experiment({
  ref,
  pose,
  dispatch,
  reduce,
  onParam,
  onBack,
}: {
  ref: React.Ref<HTMLDivElement>;
  pose: Pose;
  dispatch: React.Dispatch<DatumAction>;
  reduce: boolean;
  onParam: (key: keyof Pose | null) => void;
  onBack: () => void;
}) {
  const set = (key: keyof Pose) => (value: number) => dispatch({ type: 'setPose', key, value });
  const focus = (key: keyof Pose) => ({ onFocus: () => onParam(key), onBlur: () => onParam(null) });
  return (
    <div ref={ref}>
      <p className="mt-3 text-sm text-fg-muted">בניסוי מוצג חתך דו־ממדי. אפשר להזיז את האליפסואיד בשני כיוונים, לסובב אותו ולשנות את גודלו. השינויים הוגדלו כדי שיהיה קל להבחין בהם.</p>
      <p className={cn(BODY, 'mt-2')}>השתמשו במחוונים כדי לשנות את מיקום האליפסואיד, את כיוונו ואת גודלו, ובחנו כיצד משתנה הפער בינו לבין הגיאואיד.</p>
      <div className="mt-4 flex flex-col gap-3">
        <RangeRow label={PARAMS.dx.label} min={RANGE.dx[0]} max={RANGE.dx[1]} step={2} value={pose.dx} onChange={set('dx')} display={`${pose.dx}`} {...focus('dx')} />
        {/* SVG y grows downward; the slider and its readout count upward. */}
        <RangeRow
          label={PARAMS.dy.label}
          min={-RANGE.dy[1]}
          max={-RANGE.dy[0]}
          step={2}
          value={-pose.dy}
          onChange={(v) => set('dy')(-v)}
          display={`${-pose.dy}`}
          {...focus('dy')}
        />
        <RangeRow label={PARAMS.rot.label} min={RANGE.rot[0]} max={RANGE.rot[1]} step={1} value={pose.rot} onChange={set('rot')} display={`${pose.rot}°`} {...focus('rot')} />
        <RangeRow label={PARAMS.s.label} min={RANGE.s[0]} max={RANGE.s[1]} step={0.01} value={pose.s} onChange={set('s')} display={`×${pose.s.toFixed(2)}`} {...focus('s')} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'reset', instant: reduce })}>
          איפוס
        </Button>
        <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'showFit', instant: reduce })}>
          הצגת התאמה
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          חזרה להדגמה
        </Button>
      </div>
    </div>
  );
}

/* Range input — same recipe as CoordinatesScene's RangeRow (native thumb,
   ember focus ring). The pose is snapped to these steps in the experiment. */
function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  display,
  onFocus,
  onBlur,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  display: string;
  onFocus: () => void;
  onBlur: () => void;
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
          onFocus={onFocus}
          onBlur={onBlur}
          onPointerDown={onFocus}
          aria-valuetext={`${label}: ${display}`}
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

/* ─────────────── inspection markers + static render ─────────────── */

/** The close-up's inspection point on the exercise wall. Stations 1–2: drag it
    along the section (DatumGlobe3D handles the pointer) or use the arrow keys.
    Station 3: it marks the chosen check point (the radio group under the
    globe is its accessible control). */
function InspectMarker({
  markerRef,
  t,
  interactive,
  onKey,
}: {
  markerRef: React.RefObject<HTMLDivElement | null>;
  t: number;
  interactive: boolean;
  onKey: (dt: number) => void;
}) {
  const deg = Math.round((-t * 180) / Math.PI);
  const slider = interactive
    ? {
        role: 'slider',
        tabIndex: 0,
        'aria-label': 'נקודת הבדיקה',
        'aria-valuemin': -83,
        'aria-valuemax': 83,
        'aria-valuenow': deg,
        'aria-valuetext': `${deg}°`,
        onKeyDown: (e: React.KeyboardEvent) => {
          const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? -0.05 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? 0.05 : 0;
          if (!d) return;
          e.preventDefault();
          onKey(d);
        },
      }
    : { 'aria-hidden': true };
  return (
    <div
      ref={markerRef}
      {...slider}
      className={cn(
        'absolute left-0 top-0 rounded-full border-2 border-dashed border-fg bg-bg-elevated/25 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        interactive ? 'cursor-grab touch-none active:cursor-grabbing' : 'border-solid',
      )}
      style={{ width: MARKER_R * 2, height: MARKER_R * 2, opacity: 0 }}
    />
  );
}

/** Station 3: the other check point — a quieter ring; clicking it chooses it. */
function ProbeMarker({ markerRef, shown, onPick }: { markerRef: React.RefObject<HTMLDivElement | null>; shown: boolean; onPick: () => void }) {
  return (
    <div
      ref={markerRef}
      aria-hidden
      onClick={onPick}
      className={cn(
        'absolute left-0 top-0 rounded-full border-2 border-dashed border-fg/55 bg-bg-elevated/20 transition-[border-color] hover:border-fg cursor-pointer',
        !shown && 'hidden',
      )}
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
