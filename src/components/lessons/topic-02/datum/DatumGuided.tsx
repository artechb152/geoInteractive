'use client';

/* ─────────────── דאטום: אליפסואיד ועיגון — guided 3-D ───────────────
   Lesson 2, tasks 14–15 (2026-10-26): what the datum adds to the choice of an
   ellipsoid, and how datums differ. Built on the guided 3-D globe (deck
   "מבוא לגיאודזיה חלק א׳", slides 15–20; reference
   design/mockups/datum-concepts/01-guided-3d-site-palette.png).

   Layout: the lesson's guided-demo pattern (OnboardingScene, 32 : 68) — three
   compact stations on the right, followed by the active station's controls
   and feedback; on the left the live globe, its reference marks (the Earth's
   centre and rotation axis, the ellipsoid's own centre and axes, the dashed
   outline of the pose it is compared with) and their legend.
   1. "אותו אליפסואיד, עיגון אחר" — two anchorings of one ellipsoid: the size
      and the shape stay, the centre and the axes move. The reference body
      versus its anchoring;
   2. "דאטום עולמי ומקומי" — the geocentric global datum against a local one
      with the same ellipsoid, read at two fixed check points with the
      close-up;
   3. "בדיקה: מה השתנה?" — three pairs (the anchoring, the ellipsoid, both),
      with feedback that explains what to look at.
   Removed on 2026-10-26: the shift → rotate → scale demo and its four-slider
   experiment (a visual fit to the geoid is not what defines a datum, and the
   scale phase changed the ellipsoid, not its anchoring), and the surface
   picker (the screen before this one teaches the bodies). The seven
   parameters moved to the "הרחבה" card below: they convert coordinates
   between datums; they do not define one. No score is shown. Copy changes
   are listed in design/docs/assumptions.md (2026-10-26). */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { ModelLoading } from '@/components/lesson/ModelLoading';
import { gapAt, type DatumMode } from './datumGeometry';
import {
  CHECK, DATUM_POSE, PROBES, checkComplete, datumReducer, initialDatumState, inspectOf, isAnimating, lookOf, otherPose, solved, viewPose,
  type Anchor, type Change, type Guide, type Look, type Probe, type Step, type Surface,
} from './datumDemo';
import { GapInset, SectionSvg } from './DatumSection';
import { GlobeOverlays, GuideLegend, INSET, MARKER_R, makeOverlayRefs } from './datumOverlays';
import { FitScreen } from '../coordinates1Fit';

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

// the activity's heading and lead, at the top of its own card (one envelope per activity)
const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-2 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-6 max-w-3xl';
const BODY = 'text-base leading-relaxed text-black';
const NOTE = 'text-sm leading-snug text-fg-muted';
/** Each station's feedback slot holds its tallest state (station 1 with the comparison, station 3's last
    answer), so an answer or a choice never resizes the card, the stage or the globe. */
const FEEDBACK_MIN_H: Record<Step, string> = { 0: 'min-h-[200px]', 1: '', 2: 'min-h-[176px]' };

const STEPS: { title: string }[] = [{ title: 'אותו אליפסואיד, עיגון אחר' }, { title: 'דאטום עולמי ומקומי' }, { title: 'בדיקה: מה השתנה?' }];

const SURFACE_LABEL: Record<Surface, string> = { surface: 'פני השטח', geoid: 'גיאואיד', ellipsoid: 'אליפסואיד' };
/** The marks' legend: upper left of the stage, under the surface label (illustration side, not mirrored). */
const LEGEND_POS: React.CSSProperties = { left: 0, top: 60 };

/* ── station 1 ── */
const ANCHORS: { id: Anchor; label: string }[] = [
  { id: 'a', label: 'עיגון א׳' },
  { id: 'b', label: 'עיגון ב׳' },
];
const ANCHOR_LABEL = Object.fromEntries(ANCHORS.map((a) => [a.id, a.label])) as Record<Anchor, string>;
/** What each anchoring is — read on the globe's marks. */
const ANCHOR_NOTE: Record<Anchor, { title: string; body: string }> = {
  a: { title: 'עיגון א׳: במרכז כדור הארץ', body: 'מרכז האליפסואיד במרכז כדור הארץ, והציר הקצר שלו חופף לציר הסיבוב.' },
  b: { title: 'עיגון ב׳: מוזז ומסובב', body: 'המרכז זז ממרכז כדור הארץ, והצירים הסתובבו. הגודל והצורה לא השתנו.' },
};

/* ── station 2 ── */
const DATUM_MODES: { id: DatumMode; label: string }[] = [
  { id: 'global', label: 'עולמי' },
  { id: 'local', label: 'מקומי' },
];
const MODE_NAME: Record<DatumMode, string> = { global: 'העולמי', local: 'המקומי' };
const PROBE_LIST: { id: Probe; label: string; where: string }[] = [
  { id: 'inside', label: 'באזור המסומן', where: 'באזור המסומן' },
  { id: 'outside', label: 'מחוץ לאזור', where: 'מחוץ לאזור' },
];

/** The gap at a check point, in words — from the computed gap of this datum and of the other one at the
    same point (section units; the close-up's arrow is the same distance). */
function probeNote(mode: DatumMode, probe: Probe) {
  const other: DatumMode = mode === 'global' ? 'local' : 'global';
  const gap = gapAt(DATUM_POSE[mode], PROBES[probe]);
  const otherGap = gapAt(DATUM_POSE[other], PROBES[probe]);
  const level =
    gap < 3
      ? 'הגיאואיד והאליפסואיד כמעט חופפים'
      : gap < 8
        ? 'יש פער קטן בין הגיאואיד לאליפסואיד'
        : gap < 20
          ? 'יש פער בין הגיאואיד לאליפסואיד'
          : 'יש פער גדול בין הגיאואיד לאליפסואיד';
  const cmp =
    Math.abs(gap - otherGap) < 2
      ? `בדאטום ${MODE_NAME[other]} הפער בנקודה הזאת דומה.`
      : `בדאטום ${MODE_NAME[other]} הפער בנקודה הזאת ${gap < otherGap ? 'גדול' : 'קטן'} יותר.`;
  return `${PROBE_LIST.find((p) => p.id === probe)!.where}, ${level}. ${cmp}`;
}

/* ── station 3 ── */
const CHANGES: { id: Change; label: string; hint: string; right: string }[] = [
  { id: 'anchor', label: 'העיגון בלבד', hint: 'מרכז וכיוון', right: 'נכון: העיגון בלבד' },
  { id: 'ellipsoid', label: 'האליפסואיד בלבד', hint: 'גודל וצורה', right: 'נכון: האליפסואיד בלבד' },
  { id: 'both', label: 'גם וגם', hint: 'האליפסואיד והעיגון', right: 'נכון: גם וגם' },
];
/** Per pair (CHECK order), what each answer means: the right one explains what changed; a wrong one says
    why, and points at the mark to look at again. */
const CHECK_FEEDBACK: Record<Change, string>[] = [
  {
    anchor: 'הגודל והצורה זהים, אבל מרכז האליפסואיד זז וציריו הסתובבו. אותו אליפסואיד בעיגון אחר הוא דאטום אחר.',
    ellipsoid: 'האליפסואיד הכתום והקו המקווקו זהים בגודל ובצורה, ולכן האליפסואיד לא השתנה. מה כן זז?',
    both: 'השוו את האליפסואיד הכתום לקו המקווקו: הגודל והצורה לא השתנו. מה כן השתנה?',
  },
  {
    ellipsoid: 'המרכז והצירים נשארו על מרכז כדור הארץ ועל ציר הסיבוב, אבל האליפסואיד גדול יותר. זה אליפסואיד אחר באותו עיגון.',
    anchor: 'המרכז והצירים הכתומים לא זזו: הם עדיין על מרכז כדור הארץ ועל ציר הסיבוב. מה כן השתנה?',
    both: 'המרכז והצירים לא זזו, ולכן העיגון לא השתנה. מה כן השתנה?',
  },
  {
    both: 'האליפסואיד קטן יותר, וגם מרכזו וציריו זזו: השתנו גם גוף הייחוס וגם העיגון.',
    anchor: 'המרכז והצירים אכן זזו, אבל זה לא הכול. השוו גם את הגודל: האליפסואיד הכתום מול הקו המקווקו.',
    ellipsoid: 'הגודל אכן השתנה, אבל זה לא הכול. בדקו גם את המרכז והצירים הכתומים: האם הם זזו ממרכז כדור הארץ ומציר הסיבוב?',
  },
];

export function DatumGuided() {
  const [state, dispatch] = useReducer(datumReducer, undefined, initialDatumState);
  const reduce = !!useReducedMotion();
  const pose = viewPose(state);
  const inspect = inspectOf(state);
  const animating = isAnimating(state);
  const { step } = state;
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

  // ── animation frames only while something moves (an off-screen ease simply resumes) ──
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

  // ── what the globe draws ──
  const look: Look = capture ? 'surface' : lookOf(state);
  const other = otherPose(state);
  const guide = useMemo<Guide | null>(() => (capture ? null : { other }), [capture, other]);
  const region = step === 1;
  const otherProbe: Probe = state.probe === 'inside' ? 'outside' : 'inside';

  // ── station 3: focus the first answer of a new pair ──
  const answersRef = useRef<HTMLDivElement>(null);
  const focusAnswers = () => requestAnimationFrame(() => answersRef.current?.querySelector('button')?.focus());

  // ── actions ──
  const clickStep = (i: Step) => {
    if (expanded === i) {
      // closing the text keeps the station (and its view) as it is
      setExpanded(null);
      return;
    }
    setExpanded(i);
    dispatch({ type: 'openStep', step: i, instant: reduce });
  };

  const pairDone = solved(state, state.pair);
  const complete = checkComplete(state);
  const pick = state.picks[state.pair];

  // ── feedback: short, about the active station ──
  const feedback = useMemo(() => {
    if (step === 0) {
      const n = ANCHOR_NOTE[state.anchor];
      return { title: n.title, body: state.anchor === 'a' && !state.seenB ? `${n.body} עברו לעיגון ב׳ והשוו.` : n.body };
    }
    if (step === 1) return { title: `דאטום ${MODE_NAME[state.mode]} · ${PROBE_LIST.find((p) => p.id === state.probe)!.label}`, body: probeNote(state.mode, state.probe) };
    const right = CHANGES.find((c) => c.id === CHECK[state.pair].answer)!.right;
    if (!pick) return { title: 'לפני שבוחרים', body: 'צפו במעבר מדאטום א׳ לדאטום ב׳: מה זז, מה הסתובב ומה השתנה בגודל?' };
    return { title: pairDone ? right : 'עדיין לא', body: CHECK_FEEDBACK[state.pair][pick] };
  }, [step, state.anchor, state.seenB, state.mode, state.probe, state.pair, pick, pairDone]);

  // announced once things settle — not every frame
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    if (animating) return;
    const id = window.setTimeout(() => setAnnounce(`${feedback.title}. ${feedback.body}`), 700);
    return () => window.clearTimeout(id);
  }, [animating, feedback]);

  const description = [
    step === 0
      ? `אותו אליפסואיד בשני עיגונים. מוצג ${ANCHOR_LABEL[state.anchor]}; הקו המקווקו הוא העיגון האחר.`
      : step === 1
        ? `דאטום ${MODE_NAME[state.mode]}; הקו המקווקו הוא הדאטום האחר. האזור המסומן בקו עבה בצד הימני העליון; התקריב מראה את הפער בנקודת הבדיקה.`
        : `זוג ${state.pair + 1} מתוך ${CHECK.length}: הקו המקווקו הוא דאטום א׳ (העולמי), והאליפסואיד הכתום הוא דאטום ב׳.`,
    'גיאואיד גלי בכחול ואליפסואיד בכתום. מסומנים ציר הסיבוב ומרכז כדור הארץ, ומרכז האליפסואיד וציריו.',
  ].join(' ');

  const show3d = webgl === 'yes';
  const legend =
    step === 0
      ? { current: ANCHOR_LABEL[state.anchor], other: ANCHOR_LABEL[state.anchor === 'a' ? 'b' : 'a'] }
      : step === 1
        ? { current: `דאטום ${MODE_NAME[state.mode]}`, other: `דאטום ${MODE_NAME[state.mode === 'global' ? 'local' : 'global']}` }
        : { current: 'דאטום ב׳', other: 'דאטום א׳ (העולמי)' };

  const stationPanel = (
    <>
      {/* the active station controls, below the compact accordion */}
      <div className="mt-3">
        {step === 0 && (
          <Segmented label="העיגון המוצג" items={ANCHORS} value={state.anchor} onChange={(a) => dispatch({ type: 'setAnchor', anchor: a, instant: reduce })} attr="data-anchor" />
        )}
        {step === 1 && (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
            <span className="text-sm font-display font-semibold text-fg-muted">דאטום</span>
            <Segmented label="סוג הדאטום" items={DATUM_MODES} value={state.mode} onChange={(m) => dispatch({ type: 'setMode', mode: m, instant: reduce })} attr="data-mode" />
            <span className="text-sm font-display font-semibold text-fg-muted">נקודת בדיקה</span>
            <Segmented label="נקודת הבדיקה" items={PROBE_LIST} value={state.probe} onChange={(p) => dispatch({ type: 'setProbe', probe: p })} attr="data-probe" />
          </div>
        )}
        {step === 2 && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-display font-semibold text-fg-muted">
                זוג <L>{state.pair + 1}</L> מתוך <L>{CHECK.length}</L>
              </span>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => dispatch({ type: 'replay', instant: reduce })}>
                <Icon name="refresh" size={16} />
                הצגת המעבר שוב
              </Button>
            </div>
            <div ref={answersRef} role="group" aria-label="מה השתנה בין דאטום א׳ לדאטום ב׳?" className="mt-2 flex flex-col gap-1.5">
              {CHANGES.map((c) => {
                const on = pick === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    aria-disabled={pairDone && !on}
                    data-change={c.id}
                    onClick={() => dispatch({ type: 'pick', change: c.id })}
                    className={cn(
                      'flex h-11 items-center gap-2 rounded-xl border px-4 text-start transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated',
                      pairDone ? 'cursor-default' : 'cursor-pointer',
                      !on && !pairDone && 'hover:border-brand/30 hover:bg-brand/[0.03]',
                    )}
                  >
                    <span className="font-display text-base font-bold text-fg">{c.label}</span>
                    <span className="text-sm text-fg-muted">({c.hint})</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* feedback: below the station controls, in the information column */}
      <div className={cn('mt-3', FEEDBACK_MIN_H[step])} data-datum-feedback={step === 2 ? (pick ? (pairDone ? 'right' : 'wrong') : 'idle') : 'note'}>
        {step === 2 && pick ? (
          <CheckFeedback
            right={pairDone}
            title={feedback.title}
            body={feedback.body}
            onNext={
              pairDone && state.pair < CHECK.length - 1
                ? () => {
                    dispatch({ type: 'nextPair', instant: reduce });
                    focusAnswers();
                  }
                : null
            }
            onRestart={
              complete
                ? () => {
                    dispatch({ type: 'restartCheck', instant: reduce });
                    focusAnswers();
                  }
                : null
            }
          />
        ) : (
          <div className="rounded-xl bg-bg-accent/60 p-4">
            <p className="font-display text-base font-bold leading-snug text-fg">{feedback.title}</p>
            <p className="mt-1 text-base leading-relaxed text-fg">{feedback.body}</p>
            {step === 0 && state.seenB && <AnchorSummary />}
          </div>
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </>
  );

  return (
    <div className="my-10">
      {/* laptop fit: the guided stage and the conversion note are two screens, each shrunk on its own; heights are
          the tallest state at 1920 × 1080 (station 3: 927; the note open: 244) */}
      <FitScreen name="datum" height={927} className="">
        <div>
          <div className="surface-elevated p-6 lg:p-8">
            <h3 className={H3}>דאטום: אליפסואיד ועיגון</h3>
            <p className={LEAD}>
              <strong className="text-fg">דאטום</strong> מגדיר את גוף הייחוס ואת עיגונו ביחס לכדור הארץ. האליפסואיד קובע את הצורה והגודל; העיגון קובע היכן
              מרכז האליפסואיד ולאן מכוונים ציריו.
            </p>

            <div className="grid md:grid-cols-[32fr_68fr] gap-6 items-stretch">
              {/* ── stations (right) ── */}
              <div className="flex flex-col gap-1">
                {STEPS.map((st, idx) => {
                  const i = idx as Step;
                  const active = step === i;
                  const open = expanded === i;
                  return (
                    <div
                      key={st.title}
                      className={cn(
                        'relative isolate flex flex-col overflow-hidden rounded-xl border transition-colors duration-200 ease-snap',
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
                        className="w-full p-4 text-start flex shrink-0 items-center gap-3 cursor-pointer rounded-xl focus-visible:ring-inset focus-visible:ring-offset-0"
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
                              {i === 0 && <p className={BODY}>האליפסואיד הכתום הוא גוף הייחוס. עברו בין שני העיגונים שלו ובדקו: מה משתנה ומה נשאר?</p>}
                              {i === 1 && (
                                <>
                                  <p className={BODY}>
                                    דאטום עולמי מעוגן במרכז המסה של כדור הארץ ומתאים לכולו בקירוב. דאטום מקומי מעוגן לנקודת מוצא באזור אחד, כך שהאליפסואיד
                                    מתאים היטב לגיאואיד שם (הקו העבה). כאן יש לשניהם אותו אליפסואיד, ורק העיגון שונה.
                                  </p>
                                  <p className={cn(NOTE, 'mt-2')}>ההבדלים מוגדלים מאוד להמחשה: בפועל מרכזי דאטומים רחוקים זה מזה לרוב עד כמה מאות מטרים, לעומת רדיוס של כ־6,400 ק״מ.</p>
                                </>
                              )}
                              {i === 2 && (
                                <>
                                  <p className={BODY}>הקו המקווקו הוא דאטום א׳ (העולמי), והאליפסואיד הכתום הוא דאטום ב׳. מה השתנה בין שני הדאטומים?</p>
                                  <p className={cn(NOTE, 'mt-2')}>גם כאן השינויים מוגדלים להמחשה.</p>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {stationPanel}
              </div>

              {/* ── the visualisation (left): the globe, its marks and (station 2) the linked close-up ── */}
              <div className="min-w-0 flex flex-col">
                <div
                  ref={stageRef}
                  role="group"
                  aria-label="דאטום: אליפסואיד ועיגון"
                  aria-describedby="datum-stage-desc"
                  onPointerDown={() => setZoomOn(true)}
                  onFocus={() => setZoomOn(true)}
                  data-station={step}
                  data-look={look}
                  data-anchor={state.anchor}
                  data-mode={state.mode}
                  data-pair={step === 2 ? state.pair : ''}
                  data-moving={animating ? 'true' : 'false'}
                  data-pose={`${pose.dx.toFixed(2)},${pose.dy.toFixed(2)},${pose.rot.toFixed(2)},${pose.s.toFixed(3)}`}
                  data-other={`${other.dx},${other.dy},${other.rot},${other.s}`}
                  data-inspect={step === 1 ? inspect.toFixed(3) : ''}
                  className="relative h-[440px] w-full overflow-hidden rounded-xl bg-bg-elevated md:flex-1 md:min-h-[440px]"
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
                            region={region}
                            look={look}
                            guide={guide}
                            inspect={inspect}
                            altInspect={step === 1 ? PROBES[otherProbe] : null}
                            active={inView}
                            reduce={reduce}
                            zoomEnabled={zoomOn}
                            capture={capture}
                            showMarker={step === 1}
                            refs={refs}
                            onReady={onReady}
                            onFail={onFail}
                          />
                        </div>
                      )}
                      {!capture && <GlobeOverlays refs={refs} emph={null} labels={SURFACE_LABEL} />}
                      {!capture && <InspectMarker markerRef={refs.marker} />}
                      {!capture && (
                        <ProbeMarker markerRef={refs.markerAlt} shown={step === 1} onPick={() => dispatch({ type: 'setProbe', probe: otherProbe })} />
                      )}
                    </>
                  )}
                  {/* until the first 3-D frame: the lessons' model loading indicator, on a card over the static render */}
                  {webgl !== 'no' && !ready && <ModelLoading card label="טוען גלובוס תלת־ממדי…" />}

                  {webgl === 'no' && (
                    // No WebGL: the static render, plainly a picture, beside the live section the controls drive.
                    // Both sit side by side across the top; the close-up keeps its slot below.
                    <div className="absolute inset-x-0 top-0 grid grid-cols-2 items-start gap-3 pt-2">
                      <SectionSvg
                        pose={pose}
                        region={region}
                        look={look}
                        guide={guide}
                        probes={step === 1 ? { on: PROBES[state.probe], off: PROBES[otherProbe] } : null}
                        description={description}
                        className="aspect-[3/2] w-full"
                      />
                      <StaticGlobe className="relative block h-auto w-full" />
                    </div>
                  )}

                  {/* lower left, beside the globe (illustration side, not mirrored): the close-up in station 2 */}
                  {!capture && step === 1 && (
                    <GapInset
                      pose={pose}
                      inspect={inspect}
                      region={region}
                      emph={null}
                      size={INSET.size}
                      live={show3d && ready}
                      className="absolute"
                      style={{ left: INSET.left, bottom: INSET.bottom }}
                    />
                  )}
                  {/* what the marks are (every station), once they are drawn: upper left, under the surface label;
                      without WebGL the section takes the top, so it sits at the bottom, beside the close-up */}
                  {!capture && (webgl === 'no' || ready) && (
                    <GuideLegend
                      current={legend.current}
                      other={legend.other}
                      style={show3d ? LEGEND_POS : { left: step === 1 ? INSET.left + INSET.size + 12 : INSET.left, bottom: INSET.bottom }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FitScreen>

      <FitScreen name="datum-conversion" height={244} className="mt-6">
        <ConversionNote reduce={reduce} />
      </FitScreen>
    </div>
  );
}

/* ─────────────── station 1: what changed, once both anchorings are seen ─────────────── */

function AnchorSummary() {
  return (
    <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-base leading-snug">
      <dt className="font-display font-bold text-fg">גוף הייחוס</dt>
      <dd className="text-fg">אותו אליפסואיד: אותו גודל ואותה צורה</dd>
      <dt className="font-display font-bold text-fg">העיגון</dt>
      <dd className="text-fg">שונה: מרכז אחר וכיוון אחר</dd>
      <dd className="col-span-2 mt-1 font-display font-bold text-fg">אותו אליפסואיד בעיגון אחר הוא דאטום אחר.</dd>
    </dl>
  );
}

/* ─────────────── station 3: the answer's feedback ─────────────── */

function CheckFeedback({
  right,
  title,
  body,
  onNext,
  onRestart,
}: {
  right: boolean;
  title: string;
  body: string;
  onNext: (() => void) | null;
  onRestart: (() => void) | null;
}) {
  if (!right) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-accent/60 bg-bg-elevated p-3">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-accent text-accent">
          <Icon name="x" size={16} strokeWidth={2.5} />
        </span>
        <p className="min-w-0 text-base leading-relaxed text-black">{body}</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/[0.08] p-3">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-dark text-white">
        <Icon name="check" size={18} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        {/* the way on stands beside the verdict, so the answer is no taller than a wrong one needs */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-bold leading-snug text-black">{title}</p>
          {(onNext || onRestart) && (
            <Button variant="secondary" size="sm" className="shrink-0" onClick={(onNext ?? onRestart)!}>
              {onNext ? 'לזוג הבא' : 'מההתחלה'}
            </Button>
          )}
        </div>
        <p className="text-base leading-relaxed text-black">{body}</p>
        {onRestart && <p className="text-base leading-relaxed text-black">דאטומים יכולים להיבדל באליפסואיד, בעיגון או בשניהם.</p>}
      </div>
    </div>
  );
}

/* ─────────────── הרחבה: converting coordinates between datums (advanced, closed by default) ─────────────── */

function ConversionNote({ reduce }: { reduce: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('rounded-2xl border bg-bg-card transition-colors duration-200 ease-snap', open ? 'border-brand/45' : 'border-border/60')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="datum-conversion-body"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-5 text-start transition-colors duration-200 ease-snap hover:bg-brand/[0.03] sm:px-6 focus-visible:ring-inset focus-visible:ring-offset-0"
      >
        <span className="flex-1 font-display text-lg font-bold leading-snug text-fg md:text-xl">הרחבה: המרת קואורדינטות בין דאטומים</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.25 }} className={cn('inline-flex shrink-0', open ? 'text-brand-dark' : 'text-fg-dim')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="datum-conversion-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-6 px-5 pb-5 sm:px-6 sm:pb-6 md:grid-cols-2">
              <div>
                <p className="text-base leading-relaxed text-fg">
                  הדאטום מגדיר את גוף הייחוס ואת עיגונו. המרת קואורדינטות היא פעולה אחרת: חישוב הקואורדינטות של אותה נקודה בדאטום אחר. שיטה נפוצה משתמשת
                  בשבעה פרמטרים:
                </p>
                <ul className="mt-2 space-y-1.5 text-base leading-relaxed text-fg">
                  <li>
                    <strong>שלוש הזזות</strong> – לאורך הצירים (<L>X, Y, Z</L>).
                  </li>
                  <li>
                    <strong>שלושה סיבובים</strong> – סביב אותם צירים.
                  </li>
                  <li>
                    <strong>קנה מידה</strong> – תיקון קטן מאוד של המרחקים. הוא אינו משנה את האליפסואיד.
                  </li>
                </ul>
              </div>
              <div className="space-y-2 text-base leading-relaxed text-fg">
                <p>שבעת הפרמטרים מראים שההבדל בין דאטומים אינו רק הזזה. לעתים יש גם עיוותים מקומיים ברשת המדידה, ואז משתמשים גם בטבלאות תיקון.</p>
                <p>
                  אם האליפסואידים שונים, ההמרה מביאה בחשבון גם את הגודל (<L>a</L>) והפחיסות (<L>f</L>) של כל אחד מהם.
                </p>
                <p>בפועל העיגון נקבע במדידות: בדאטומים מקומיים ישנים לפי נקודת מוצא בשטח, ובדאטומים מודרניים לפי רשת תחנות קבועות.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────── a segmented radio group (anchorings, datums, check points) ─────────────── */

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

/* ─────────────── check-point markers + static render ─────────────── */

/** Station 2: the chosen check point on the exercise wall (the radio group under the stations is its
    accessible control). DatumGlobe3D places it every frame. */
function InspectMarker({ markerRef }: { markerRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={markerRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-solid border-fg bg-bg-elevated/25"
      style={{ width: MARKER_R * 2, height: MARKER_R * 2, opacity: 0 }}
    />
  );
}

/** Station 2: the other check point — a quieter ring; clicking it chooses it. */
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
