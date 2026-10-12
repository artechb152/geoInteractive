'use client';

/* ─────────── היטלים: מכדור למפה — "מעבדת פתיחה" (alternative 1) ───────────
   Reference: design/mockups/projections-concepts-2026-10-12/01-unfolding-lab.png; brief:
   claude-implementation-option-1.txt there. Replaces ProjectionsBlock / ProjectionArt of
   CoordinatesPart2Scene (deck ב׳, slides 3–5).
   One card: three method tabs; the stage — the projection surface on the 3-D globe (inline
   start, right) and the map it makes (inline end, left); a slider that opens the surface
   (0 % at the right, "עטיפה" → 100 % at the left, "מפה שטוחה"), the demonstration and the
   initial view, a line that explains the method and the phase. "נסו לזהות את המשטח" turns
   the same card into practice: three target maps (conic, azimuthal, cylindrical), a surface
   to choose and check; the check shows the chosen surface and unrolls it with the same
   mechanism. The model (projections, sheets, camera, practice, copy) is projectionsModel.ts. */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, BookOpen, CircleCheck, Lightbulb, Pause, Play, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { loadGlobeImages } from '../geo-globe/globeAssets';
import { useRovingKeys } from '../scale/controls';
import { useBasemap } from '../utm-atlas/useBasemap';
import { decodeRings } from '../utm-atlas/atlasGeometry';
import { BODY, CHOICE, HEADING, LABEL, choiceTone } from '../utm-atlas/atlasControls';
import { earthFromRings, earthPixelsFrom, type EarthPixels } from './earthRaster';
import { ProjectionMap } from './ProjectionMap';
import { ProjectionStageFlat } from './ProjectionStageFlat';
import { SurfaceIcon } from './SurfaceIcon';
import type { StageApi, StageImages, StageView } from './ProjectionStage3D';
import {
  CONTACT_LEGEND, ENDS, EXPLAIN, MAP_DESCRIPTION, METHODS, PHASE_LABEL, QUESTION, START_HINT, SUMMARY, SUMMARY_TITLE, SURFACE_NAME, TAB_NAME,
  demoDuration, easeInOut, feedbackOf, initialPractice, isSolved, phaseOf, practiceReducer, sliderKey, stageDescription, targetOf, type Feedback, type Method,
} from './projectionsModel';

const Stage3D = dynamic(() => import('./ProjectionStage3D'), { ssr: false, loading: () => null });

// the scene's own heading and lead (CoordinatesPart2Scene H3 / LEAD)
const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';
/** the legend's text (DatumFieldChallenge Legend, lessons-02-06 spec T6) */
const T6 = 'text-sm leading-snug text-fg-muted';
const T5 = 'text-sm font-display font-semibold text-fg-muted';
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated';

/** The two views' height: the stage keeps it in every method, phase and state. */
const STAGE_H = 436;
/** The controls' band under the stage: the same in learning and in practice. */
const CONTROLS_H = 212;
/** The practice: how long the checked surface takes to unroll. */
const REVEAL_SECONDS = 3.4;

type Mode = 'learn' | 'practice';

export function ProjectionsLab() {
  const reduce = !!useReducedMotion();
  const uid = useId();
  const [mode, setMode] = useState<Mode>('learn');
  const [method, setMethod] = useState<Method>('cyl');
  const [p, setP] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [practice, dispatch] = useReducer(practiceReducer, undefined, initialPractice);
  const [reveal, setReveal] = useState(0);
  const api = useRef<StageApi | null>(null);

  /* ── the Earth: near the viewport, load the images (the page's one cache) → the maps' pixels ── */
  const cardRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '320px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [webgl, setWebgl] = useState<'unknown' | 'yes' | 'no'>('unknown');
  useEffect(() => {
    let ok = false;
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      ok = !!probe;
      probe?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      ok = false;
    }
    setWebgl(ok ? 'yes' : 'no');
  }, []);
  const [stageImages, setStageImages] = useState<StageImages | null>(null);
  const [pixels, setPixels] = useState<EarthPixels | null>(null);
  const [imagesFailed, setImagesFailed] = useState(false);
  const wanted = near || mode === 'practice';
  useEffect(() => {
    if (!wanted || stageImages || imagesFailed) return;
    let live = true;
    loadGlobeImages()
      .then(async (img) => {
        if (!live) return;
        setStageImages(img);
        const px = await earthPixelsFrom(img);
        if (live) setPixels(px);
      })
      .catch(() => live && setImagesFailed(true));
    return () => {
      live = false;
    };
  }, [wanted, stageImages, imagesFailed]);
  // without the images: Natural Earth land, through the same pipeline (maps and globe)
  const { basemap } = useBasemap();
  useEffect(() => {
    if (!imagesFailed || !basemap) return;
    const e = earthFromRings(decodeRings(basemap.LAND_D, basemap.BASEMAP_UNIT), decodeRings(basemap.LAKES_D, basemap.BASEMAP_UNIT));
    setPixels(e.pixels);
    setStageImages({ color: e.color, relief: e.relief });
  }, [imagesFailed, basemap]);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!near) setReady(false);
  }, [near]);
  const [failed3d, setFailed3d] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const losses = useRef(0);
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed3d(true), []);
  const onLost = useCallback(() => {
    losses.current += 1;
    if (losses.current > 2) setFailed3d(true);
    else {
      setReady(false);
      setCanvasKey((k) => k + 1);
    }
  }, []);
  const flat = webgl === 'no' || failed3d;
  const show3d = webgl === 'yes' && !failed3d && near && !!stageImages;

  /* ── the demonstration: from where it is to the end; stopped by any hand on the slider ── */
  const anim = useRef<{ raf: number; timers: number[] }>({ raf: 0, timers: [] });
  const stopAnim = useCallback(() => {
    cancelAnimationFrame(anim.current.raf);
    anim.current.timers.forEach((t) => window.clearTimeout(t));
    anim.current = { raf: 0, timers: [] };
  }, []);
  useEffect(() => stopAnim, [stopAnim]);
  const stopDemo = useCallback(() => {
    stopAnim();
    setPlaying(false);
  }, [stopAnim]);
  /** run 0–1 toward 1 from `from`: tweened, or (reduced motion) in key states without motion */
  const runTo = useCallback(
    (from: number, set: (v: number) => void, seconds: number, done: () => void) => {
      stopAnim();
      if (reduce) {
        set(from);
        const steps = from < 0.5 ? [0.5, 1] : [1];
        steps.forEach((v, i) =>
          anim.current.timers.push(
            window.setTimeout(() => {
              set(v);
              if (v === 1) done();
            }, 750 * (i + 1)),
          ),
        );
        return;
      }
      const t0 = performance.now();
      const dur = seconds * 1000;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        set(from + (1 - from) * easeInOut(k));
        if (k < 1) anim.current.raf = requestAnimationFrame(step);
        else done();
      };
      anim.current.raf = requestAnimationFrame(step);
    },
    [reduce, stopAnim],
  );
  const onPlay = () => {
    if (playing) return stopDemo();
    const from = p >= 0.995 ? 0 : p;
    setPlaying(true);
    runTo(from, setP, demoDuration(from), () => setPlaying(false));
  };
  const setProgress = (v: number) => {
    if (playing) stopDemo();
    setP(v);
  };
  const chooseMethod = (m: Method) => {
    if (m === method) return;
    stopDemo();
    setMethod(m);
    setP(0);
    api.current?.resetView();
  };
  const tabKeys = useRovingKeys(METHODS, method, chooseMethod);

  /* ── practice ── */
  const target = targetOf(practice);
  const started = practice.tries > 0 || practice.index > 0 || practice.pick !== null || practice.done;
  const enterPractice = () => {
    stopDemo();
    setMode('practice');
  };
  const backToLearn = () => {
    stopAnim();
    setMode('learn');
  };
  // a check shows the chosen surface and unrolls it with the learning's own mechanism
  useEffect(() => {
    if (mode !== 'practice') return;
    if (!practice.checked) {
      stopAnim();
      setReveal(0);
      return;
    }
    runTo(0, setReveal, REVEAL_SECONDS, () => undefined);
    // a new check (tries) restarts it; changing the pick clears it
  }, [mode, practice.checked, practice.tries, practice.index, runTo, stopAnim]);
  const feedback = feedbackOf(practice);

  /* ── what the stage shows ── */
  const learning = mode === 'learn';
  const view: StageView = useMemo(
    () => (learning ? { m: method, p, demo: true } : { m: practice.done ? null : practice.checked, p: reveal, demo: false }),
    [learning, method, p, practice.done, practice.checked, reveal],
  );
  const phase = phaseOf(p);

  const onStageKey = (e: React.KeyboardEvent) => {
    const a = api.current;
    if (!a) return;
    const k = e.key;
    // the same sense as dragging: → turns the globe's face to the right
    if (k === 'ArrowRight') a.turn(-10, 0);
    else if (k === 'ArrowLeft') a.turn(10, 0);
    else if (k === 'ArrowUp') a.turn(0, 8);
    else if (k === 'ArrowDown') a.turn(0, -8);
    else if (k === 'Home') a.resetView();
    else return;
    e.preventDefault();
  };

  const panelId = `${uid}-panel`;
  const descId = `${uid}-desc`;
  const stageTitle = learning ? 'משטח ההטלה' : practice.checked ? `המשטח שבחרתם: ${SURFACE_NAME[practice.checked]}` : 'כדור הארץ';
  const mapTitle = learning ? 'המפה המתקבלת' : 'מפת היעד';

  return (
    <div className="my-10" data-screen="projections">
      <h3 className={H3}>היטלים: מכדור למפה</h3>
      <p className={LEAD}>
        <strong className="text-fg">היטל</strong> הוא מעבר ממשטח מעוקל לייצוג שטוח. בחרו משטח ופתחו אותו כדי לראות איזו מפה מתקבלת.
      </p>

      <div
        ref={cardRef}
        className="surface-elevated p-6 lg:p-8"
        data-projections-lab
        data-mode={mode}
        data-method={method}
        data-progress={p.toFixed(3)}
        data-playing={playing ? 'true' : 'false'}
        data-target={learning ? '' : target}
        data-pick={practice.pick ?? ''}
        data-checked={practice.checked ?? ''}
        data-task={practice.index}
        data-solved={practice.solved.map(Number).join('')}
        data-done={practice.done ? 'true' : 'false'}
        data-ready={ready ? 'true' : 'false'}
        data-flat={flat ? 'true' : 'false'}
        data-earth={pixels?.source ?? ''}
      >
        {/* ── row 1: the methods, or the practice's heading (one height) ── */}
        {learning ? (
          <div role="tablist" aria-label="שיטת ההטלה" className="grid h-14 grid-cols-3 gap-2" onKeyDown={tabKeys.onKeyDown}>
            {METHODS.map((m) => {
              const on = m === method;
              return (
                <button
                  key={m}
                  ref={tabKeys.register(m)}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${m}`}
                  aria-selected={on}
                  aria-controls={panelId}
                  tabIndex={on ? 0 : -1}
                  data-tab={m}
                  onClick={() => chooseMethod(m)}
                  className={cn(CHOICE, choiceTone(on), FOCUS, 'flex items-center justify-center gap-3 px-4')}
                >
                  <SurfaceIcon m={m} size={34} className={on ? 'text-accent' : 'text-fg-muted'} />
                  <span className={HEADING}>{TAB_NAME[m]}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-14 items-center justify-between gap-4 border-b border-border-subtle" data-practice-head>
            <h4 className={cn(HEADING, 'flex items-center gap-2')}>
              {practice.done && <CircleCheck size={24} strokeWidth={1.8} aria-hidden className="text-brand-dark" />}
              {practice.done ? SUMMARY_TITLE : 'תרגול: זהו את המשטח'}
            </h4>
            {!practice.done && (
              <span className={T5} data-task-label>
                משימה {practice.index + 1} מתוך {practice.order.length}
              </span>
            )}
          </div>
        )}

        {/* ── the stage ── */}
        <div id={panelId} role={learning ? 'tabpanel' : undefined} aria-labelledby={learning ? `${uid}-tab-${method}` : undefined} className="mt-6 rounded-xl bg-bg-accent/60 px-6 pb-4 pt-5" data-stage>
          {!learning && practice.done ? (
            <SummaryStage pixels={pixels} />
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] gap-6">
                {/* the surface on the globe (inline start = right) */}
                <section className="min-w-0" aria-label={stageTitle}>
                  <h4 className={cn(HEADING, 'text-center')} data-stage-title>
                    {stageTitle}
                  </h4>
                  <div
                    role="group"
                    aria-roledescription="המחשה תלת־ממדית"
                    aria-label="כדור הארץ ומשטח ההטלה"
                    aria-describedby={descId}
                    tabIndex={flat ? -1 : 0}
                    onKeyDown={onStageKey}
                    className={cn('relative mt-3 w-full overflow-hidden rounded-xl', FOCUS, !flat && 'cursor-grab active:cursor-grabbing')}
                    style={{ height: STAGE_H }}
                    data-3d
                  >
                    <p id={descId} className="sr-only">
                      {stageDescription(view.m, view.p)} {flat ? '' : 'גררו או השתמשו בחצים כדי לסובב את המבט. Home מחזיר למבט ההתחלתי.'}
                    </p>
                    {/* until the first 3-D frame: a quiet disc where the globe will stand — never an empty box */}
                    {!flat && !ready && (
                      <div aria-hidden className="absolute inset-0 grid place-items-center">
                        <div className="size-[248px] rounded-full bg-bg-accent motion-safe:animate-pulse" />
                      </div>
                    )}
                    {show3d && (
                      <div className={cn('absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none', ready ? 'opacity-100' : 'opacity-0')}>
                        <Stage3D key={canvasKey} images={stageImages!} view={view} reduce={reduce} active={near} api={api} onReady={onReady} onFail={onFail} onLost={onLost} onEngage={noop} />
                      </div>
                    )}
                    {flat && <ProjectionStageFlat view={view} pixels={pixels} />}
                    {/* always present, so a change of its text is announced */}
                    <p role="status" className={cn(T6, 'pointer-events-none absolute inset-x-0 bottom-2 text-center text-balance')} data-stage-status>
                      {flat
                        ? 'התצוגה התלת־ממדית אינה זמינה בדפדפן זה. מוצג שרטוט של אותו כדור ואותו משטח.'
                        : pixels?.source === 'basemap'
                          ? 'תמונת כדור הארץ לא נטענה. מוצגות היבשות בצבע אחיד.'
                          : ''}
                    </p>
                  </div>
                </section>

                {/* the map (inline end = left) */}
                <section className="min-w-0" aria-label={mapTitle}>
                  <h4 className={cn(HEADING, 'text-center')} data-map-title>
                    {mapTitle}
                  </h4>
                  <div className="mt-3" style={{ height: STAGE_H }}>
                    <ProjectionMap
                      method={learning ? method : target}
                      pixels={pixels}
                      demo={learning}
                      contact={learning}
                      label={learning ? MAP_DESCRIPTION[method] : `מפת היעד. ${MAP_DESCRIPTION[target]}`}
                    />
                  </div>
                </section>
              </div>
              <Legend method={learning ? method : null} />
            </>
          )}
        </div>

        {/* ── the controls (one height in every state) ── */}
        <div className="mt-6" style={{ height: CONTROLS_H }} data-controls>
          {learning ? (
            <div className="flex h-full flex-col gap-4">
              <ProgressSlider method={method} value={p} onChange={setProgress} />
              <div className="flex flex-1 items-start gap-6">
                <div className="flex shrink-0 gap-3">
                  <Button size="md" className="w-[188px]" onClick={onPlay} data-play={playing ? 'stop' : p >= 0.995 ? 'replay' : 'play'}>
                    {playing ? <Pause size={18} aria-hidden fill="currentColor" /> : <Play size={18} aria-hidden fill="currentColor" />}
                    {playing ? 'עצירת ההדגמה' : p >= 0.995 ? 'הדגמה חוזרת' : 'הפעלת ההדגמה'}
                  </Button>
                  <Button size="md" variant="secondary" onClick={() => api.current?.resetView()} title="מחזיר את זווית המבט בלבד, בלי לשנות את פתיחת המשטח">
                    <RefreshCcw size={18} aria-hidden />
                    מבט התחלתי
                  </Button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-end gap-3">
                  <div className="flex w-full items-start gap-3 rounded-xl bg-bg-accent px-4 py-3" data-explain={`${method}-${phase}`}>
                    <BookOpen size={22} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-fg-muted" />
                    <p className={BODY} aria-live="polite">
                      {EXPLAIN[method][phase]}
                      {phase === 'start' && ` ${START_HINT[method]}`}
                    </p>
                  </div>
                  <Button size="md" variant="secondary" onClick={enterPractice} data-enter-practice>
                    <Lightbulb size={18} aria-hidden />
                    {practice.done ? 'סיכום התרגול' : started ? 'חזרה לתרגול' : 'נסו לזהות את המשטח'}
                  </Button>
                </div>
              </div>
            </div>
          ) : practice.done ? (
            <div className="flex h-full flex-col justify-center gap-4" data-summary-actions>
              <p className={BODY}>שלוש ההתאמות נכונות. אפשר לתרגל שוב בסדר אחר, או לחזור למעבדה ולפתוח את המשטחים.</p>
              <div className="flex gap-3">
                <Button size="md" onClick={() => dispatch({ type: 'restart' })}>
                  תרגול חוזר
                </Button>
                <Button size="md" variant="secondary" onClick={backToLearn}>
                  חזרה ללמידה
                </Button>
              </div>
            </div>
          ) : (
            <PracticePanel state={practice} dispatch={dispatch} feedback={feedback} onBack={backToLearn} />
          )}
        </div>
      </div>
    </div>
  );
}

const noop = () => undefined;

/* ───────────────────────── the slider ───────────────────────── */

/** The process 0–1: 0 at the right ("עטיפה"), 1 at the left ("מפה שטוחה") — the reading
    direction. A native range in an RTL box (its minimum is at the right); the keys are this
    lab's own (projectionsModel.sliderKey): ← / ↑ advance, → / ↓ go back, Home / End. */
function ProgressSlider({ method, value, onChange }: { method: Method; value: number; onChange: (v: number) => void }) {
  const id = useId();
  const [a, b] = ENDS[method];
  const phase = PHASE_LABEL[method][phaseOf(value)];
  const pct = Math.round(value * 100);
  return (
    <div data-slider>
      <div className="flex items-center gap-4">
        <span className={cn(LABEL, 'w-24 shrink-0 text-start')} data-end="start">
          {a}
        </span>
        <span dir="rtl" className="relative block h-9 flex-1">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
          {/* the part done: from the start (right) to the thumb */}
          <span aria-hidden className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-dark" style={{ insetInlineStart: 0, width: `calc(11px + ${value} * (100% - 22px))` }} />
          <input
            type="range"
            dir="rtl"
            min={0}
            max={1000}
            step={1}
            value={Math.round(value * 1000)}
            onChange={(e) => onChange(Number(e.target.value) / 1000)}
            onKeyDown={(e) => {
              if (e.altKey || e.ctrlKey || e.metaKey) return;
              const v = sliderKey(e.key, value);
              if (v === null) return;
              e.preventDefault();
              onChange(v);
            }}
            aria-label={method === 'az' ? 'מעבר למבט על' : 'פתיחת המשטח'}
            aria-valuetext={`${pct}% – ${phase}`}
            aria-describedby={`${id}-phase`}
            data-progress-input
            className={cn(
              'absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none',
              '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
              '[&::-webkit-slider-thumb]:mt-[7px] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-[22px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(40,50,35,0.4)]',
              '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-[22px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-accent',
              '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)] [&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
            )}
          />
        </span>
        <span className={cn(LABEL, 'w-24 shrink-0 text-end')} data-end="end">
          {b}
        </span>
      </div>
      <p id={`${id}-phase`} className={cn(LABEL, 'text-center')} data-phase={phaseOf(value)}>
        {phase}
      </p>
    </div>
  );
}

/* ───────────────────────── the legend ───────────────────────── */

/** What the lines mean, drawn as on the map and the globe (DatumFieldChallenge's legend
    recipe). The line of contact is never the sample parallel. Kept (empty) in practice so the
    stage keeps its height. */
function Legend({ method }: { method: Method | null }) {
  const item = 'flex items-center gap-1.5';
  return (
    <ul className={cn('mt-3 flex h-5 items-center justify-center gap-x-6', !method && 'invisible')} data-legend aria-hidden={!method}>
      <li className={item}>
        {method === 'az' ? (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="4.5" className="fill-brand-dark stroke-white" strokeWidth={2} />
          </svg>
        ) : (
          <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden>
            <path d="M1 4h7M12 4h7M23 4h2" className="stroke-brand-dark" strokeWidth={2.5} strokeLinecap="butt" />
          </svg>
        )}
        <span className={T6}>{method ? CONTACT_LEGEND[method] : ''}</span>
      </li>
      <li className={item}>
        <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden>
          <path d="M1 4h24" className="stroke-accent" strokeWidth={2.5} strokeLinecap="round" />
        </svg>
        <span className={T6}>קו רוחב לדוגמה</span>
      </li>
      <li className={item}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <circle cx="8" cy="8" r="5" className="fill-accent stroke-white" strokeWidth={2} />
        </svg>
        <span className={T6}>נקודה לדוגמה</span>
      </li>
    </ul>
  );
}

/* ───────────────────────── practice ───────────────────────── */

function PracticePanel({
  state,
  dispatch,
  feedback,
  onBack,
}: {
  state: ReturnType<typeof initialPractice>;
  dispatch: React.Dispatch<Parameters<typeof practiceReducer>[1]>;
  feedback: Feedback | null;
  onBack: () => void;
}) {
  const solved = isSolved(state);
  const last = state.index >= state.order.length - 1;
  const value = state.pick ?? METHODS[0];
  const keys = useRovingKeys(METHODS, value, (m) => dispatch({ type: 'pick', m }));
  const action = !solved ? (
    <Button size="lg" className="w-[184px] rounded-xl" onClick={() => dispatch({ type: 'check' })} disabled={!state.pick || state.checked === state.pick} data-check>
      בדיקת תשובה
    </Button>
  ) : last ? (
    <Button size="lg" className="w-[184px] rounded-xl" onClick={() => dispatch({ type: 'finish' })} data-finish>
      לסיכום
      <ArrowLeft size={16} aria-hidden />
    </Button>
  ) : (
    <Button size="lg" className="w-[184px] rounded-xl" onClick={() => dispatch({ type: 'next' })} data-next>
      למשימה הבאה
      <ArrowLeft size={16} aria-hidden />
    </Button>
  );
  return (
    <div className="flex h-full flex-col gap-3" data-practice>
      <p className={HEADING} id="projections-question">
        {QUESTION}
      </p>
      <div className="flex gap-3">
        <div role="radiogroup" aria-labelledby="projections-question" className="grid h-14 min-w-0 flex-1 grid-cols-3 gap-2" onKeyDown={keys.onKeyDown}>
          {METHODS.map((m) => {
            const on = state.pick === m;
            const verdict = state.checked === m ? (m === targetOf(state) ? 'right' : 'wrong') : null;
            return (
              <button
                key={m}
                ref={keys.register(m)}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={(state.pick ?? METHODS[0]) === m ? 0 : -1}
                disabled={solved && !on}
                data-option={m}
                onClick={() => dispatch({ type: 'pick', m })}
                className={cn(CHOICE, choiceTone(on), FOCUS, 'relative flex items-center justify-center gap-3 px-4 disabled:cursor-default disabled:opacity-55')}
              >
                <SurfaceIcon m={m} size={32} className={on ? 'text-accent' : 'text-fg-muted'} />
                <span className={HEADING}>{SURFACE_NAME[m]}</span>
                {/* the choice also carries a shape, not only a colour */}
                {on && <span aria-hidden className="absolute inset-x-6 bottom-1.5 h-0.5 rounded-full bg-fg" />}
                {verdict && (
                  <span
                    aria-hidden
                    className={cn('absolute -top-2 -end-2 grid size-6 place-items-center rounded-full', verdict === 'right' ? 'bg-brand-dark text-white' : 'border-2 border-border-strong bg-bg-elevated text-fg')}
                  >
                    <Icon name={verdict === 'right' ? 'check' : 'x'} size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 items-start gap-3">
        <FeedbackLine feedback={feedback} />
        <div className="flex shrink-0 gap-2">
          <Button size="md" variant="secondary" onClick={() => dispatch({ type: 'hint' })} disabled={solved || state.hint} data-hint>
            <Lightbulb size={18} aria-hidden />
            רמז
          </Button>
          <Button size="md" variant="ghost" onClick={onBack} data-back>
            חזרה להדגמה
          </Button>
        </div>
      </div>
    </div>
  );
}

/** One feedback line (aria-live): the verdict told by words and a glyph — success in the
    lesson's green, the rest in ink; never red. The hint follows on its own line. */
function FeedbackLine({ feedback }: { feedback: Feedback | null }) {
  const tone = feedback?.tone ?? 'info';
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      data-feedback={tone}
      className={cn('flex min-w-0 flex-1 gap-3 rounded-xl px-3.5 py-2.5', tone === 'right' ? 'bg-brand/[0.08]' : tone === 'wrong' ? 'bg-bg-accent' : 'bg-bg-accent/60')}
    >
      {tone !== 'info' && (
        <span aria-hidden className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', tone === 'right' ? 'bg-brand-dark text-white' : 'border-2 border-border-strong text-fg')}>
          <Icon name={tone === 'right' ? 'check' : 'x'} size={12} strokeWidth={3} />
        </span>
      )}
      <div className="min-w-0">
        <p className={BODY}>{feedback?.text}</p>
        {feedback?.hint && (
          <p className={cn(BODY, 'mt-1 flex items-start gap-1.5')} data-hint-text>
            <Lightbulb size={18} aria-hidden className="mt-1 shrink-0 text-fg-muted" />
            {feedback.hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** The summary in the stage's place: each surface, the shape it makes, and its map. */
function SummaryStage({ pixels }: { pixels: EarthPixels | null }) {
  return (
    <ul className="grid grid-cols-3 gap-6" style={{ height: STAGE_H + 28 + 12 + 32 }} data-summary>
      {SUMMARY.map((s) => (
        <li key={s.m} className="flex min-w-0 flex-col items-center gap-3 rounded-xl bg-bg-elevated/70 p-4">
          <div className="text-center">
            <p className={cn(HEADING, 'flex items-center justify-center gap-2')}>
              <SurfaceIcon m={s.m} size={30} className="text-fg-muted" />
              {s.surface}
            </p>
            <p className={cn(BODY, 'mt-1 flex items-center justify-center gap-1.5')}>
              <ArrowLeft size={16} aria-hidden className="shrink-0 text-fg-muted" />
              {s.shape}
            </p>
          </div>
          <div className="w-full flex-1">
            <ProjectionMap method={s.m} pixels={pixels} demo={false} contact={false} label={`${s.surface}: ${MAP_DESCRIPTION[s.m]}`} pad={4} />
          </div>
        </li>
      ))}
    </ul>
  );
}
