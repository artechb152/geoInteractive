'use client';

/* ─────────── מערכת קואורדינטות גיאוגרפית — "גלובוס חוקר" (alternative 1) ───────────
   Reference: design/mockups/geographic-coordinates-2026-10-12/01-globe-explorer.png
   (brief: the chosen alternative in claude-handoff.txt there). Replaces the 2-D
   graticule and the pick-the-pair exercise of LatLonExplorer.
   One card, no mode switch: the panel at inline-start, the globe at inline-end.
   - The explorer opens on 30°S 90°E (the deck's example); every change moves the
     parallel / meridian and the point at once. "איפוס" sets 0°, 0° (the equator meets Greenwich).
   - "לתרגול" turns the same panel into practice: random tasks at an adaptive level
     (geoCoords: makeTask / judge). "find" — the coordinates are given and the globe
     marks four lettered points; the learner picks one, on the globe or in the panel;
     "read" — a point is marked and the learner sets its coordinates. A miss is said
     beside the learner's point on the globe and in the panel; the target's lines are
     never drawn before the task is over.
   The model (state, check, copy) is geoCoords.ts; the 3-D view is Globe3D
   (loaded near the viewport, unmounted — and its GPU memory freed — away from
   it); without WebGL or the images, GlobeFlatMap shows the same grid flat. */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CircleAlert, CircleCheck, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import {
  CHOICE_NAMES, LAT_MAX, LEVELS, LON_MAX, MAX_TRIES, fmtLat, fmtLon, geoReducer, globeViewOf, initialGeoState, latCaption, lonCaption,
  messageOf, normalizeLon, toSigned, type Coord, type GeoAction, type GlobeView, type Message, type Vec3,
} from './geoCoords';
import { CoordinateControl } from './CoordinateControl';
import { GlobeFlatMap } from './GlobeFlatMap';
import { loadGlobeImages, type GlobeImages } from './globeAssets';
import type { GlobeApi, OverlayRefs } from './Globe3D';

const Globe3D = dynamic(() => import('./Globe3D'), { ssr: false, loading: () => null });

/** Latin, digits and symbols inside Hebrew text (as in CoordinatesPart2Scene). */
function L({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}
/** A message string: its "15°N"-style tokens and Latin letters isolated as LTR runs. */
function Bidi({ text }: { text: string }) {
  const parts = text.split(/(\d+°[NSEW]?|\b[NSEW]\b)/g);
  return <>{parts.map((p, i) => (i % 2 ? <L key={i}>{p}</L> : p))}</>;
}

// the scene's own heading and lead styles (CoordinatesPart2Scene H3 / LEAD)
const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';
const H4 = 'font-display font-bold leading-tight text-black text-base md:text-lg';

/** The globe's stage: its height sets the globe's size (the camera's field is vertical). */
const STAGE_H = 660;

/** Overlay origin: the projection works in physical px inside the dir="ltr" overlay
    (logical start-0 would also set right: 0 there — tailwindcss-rtl's ancestor selectors). */
const ORIGIN: React.CSSProperties = { left: 0, top: 0 };
const CHIP = 'pointer-events-none absolute whitespace-nowrap rounded-md border bg-bg-elevated/95 px-2 py-0.5 font-display text-sm font-bold leading-tight text-black shadow-[0_1px_4px_rgba(40,50,35,0.16)] opacity-0 transition-opacity duration-150 motion-reduce:transition-none';

const newSeed = () => (Math.random() * 2 ** 32) | 0;

export function GlobeExplorer() {
  const [state, dispatch] = useReducer(geoReducer, undefined, initialGeoState);
  const reduce = !!useReducedMotion();
  const view = globeViewOf(state);
  const said = messageOf(state);
  const task = state.stage === 'task' ? state.task : null;
  const explore = toSigned(state.explore);

  // ── near the viewport: mount the 3-D view; away from it: unmount (frees the GPU) ──
  const stageRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '320px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ── WebGL, the images, the first frame ──
  const [webgl, setWebgl] = useState<'unknown' | 'yes' | 'no'>('unknown');
  useEffect(() => {
    let ok = false;
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      ok = !!probe;
      // give the probe's context back at once — the page holds several 3-D views
      probe?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      ok = false;
    }
    setWebgl(ok ? 'yes' : 'no');
  }, []);
  const [images, setImages] = useState<GlobeImages | null>(null);
  const [failed, setFailed] = useState<null | 'webgl' | 'images'>(null);
  useEffect(() => {
    if (!near || webgl !== 'yes' || images) return;
    let live = true;
    loadGlobeImages().then(
      (img) => live && setImages(img),
      () => live && setFailed('images'),
    );
    return () => {
      live = false;
    };
  }, [near, webgl, images]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!near) setReady(false);
  }, [near]);
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed('webgl'), []);
  // a context the browser took away while showing: rebuild the canvas; only a repeated loss means
  // the 3-D view cannot hold here, and the flat map takes over
  const [canvasKey, setCanvasKey] = useState(0);
  const losses = useRef(0);
  const onLost = useCallback(() => {
    losses.current += 1;
    if (losses.current > 2) setFailed('webgl');
    else {
      setReady(false);
      setCanvasKey((k) => k + 1);
    }
  }, []);
  const flat = webgl === 'no' || failed !== null;
  const show3d = webgl === 'yes' && !failed && near && !!images;

  // ── wheel zoom only once the globe is engaged (the lesson scrolls otherwise) ──
  const [zoomOn, setZoomOn] = useState(false);
  useEffect(() => {
    const off = (e: PointerEvent) => {
      if (!stageRef.current?.contains(e.target as Node)) setZoomOn(false);
    };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, []);

  const api = useRef<GlobeApi | null>(null);
  const camMemory = useRef<Vec3 | null>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const latChipRef = useRef<HTMLDivElement>(null);
  const lonChipRef = useRef<HTMLDivElement>(null);
  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const targetRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const eqRef = useRef<HTMLDivElement>(null);
  const gwRef = useRef<HTMLDivElement>(null);
  const northRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const refs = useMemo<OverlayRefs>(
    () => ({ stage: stageRef, marker: markerRef, latChip: latChipRef, lonChip: lonChipRef, choices: choiceRefs, target: targetRef, note: noteRef, equator: eqRef, greenwich: gwRef, north: northRef, shadow: shadowRef }),
    [],
  );

  // the camera: the explorer's point is kept in view as it moves (no "show the point" button);
  // a "read" task turns to the point it asks about, and after a miss to the learner's point too;
  // a finished task turns to its answer. A "find" task opens on its four choices as a group and
  // turns to a letter only when the learner picks it — never to the answer before the task ends.
  const inExplore = state.stage === 'explore';
  useEffect(() => {
    if (inExplore && ready) api.current?.show([{ lat: explore.lat, lon: explore.lon }]);
  }, [inExplore, explore.lat, explore.lon, ready]);
  useEffect(() => {
    if (!task || !ready) return;
    if (task.kind === 'read') api.current?.focus(task);
    // the four choices as a group (their mean direction), so as many as can be are in view
    else api.current?.show(task.choices);
  }, [task, ready]);
  const last = state.last;
  useEffect(() => {
    if (task?.kind === 'read' && last && ready) api.current?.show([last.at, task]);
  }, [task, last, ready]);
  useEffect(() => {
    if (state.outcome && state.task) api.current?.focus(state.task);
  }, [state.outcome, state.task]);

  const onChoose = useCallback(
    (i: number) => {
      dispatch({ type: 'pick', i });
      const c = task?.choices[i];
      if (c) api.current?.show([c]);
    },
    [task],
  );

  // QA (scripts/qa/shot-geo-globe.mjs): which choice is right, outside production only
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __geoGlobeAnswer?: () => number };
    w.__geoGlobeAnswer = () => (task ? task.choices.findIndex((c) => c.lat === task.lat && normalizeLon(c.lon) === normalizeLon(task.lon)) : -1);
    return () => {
      delete w.__geoGlobeAnswer;
    };
  }, [task]);

  const onStageKey = (e: React.KeyboardEvent) => {
    const a = api.current;
    if (!a) return;
    const step = Math.PI / 12;
    const k = e.key;
    // the same sense as dragging: → turns the globe's face to the right
    if (k === 'ArrowRight') a.rotate(-step, 0);
    else if (k === 'ArrowLeft') a.rotate(step, 0);
    else if (k === 'ArrowUp') a.rotate(0, -step);
    else if (k === 'ArrowDown') a.rotate(0, step);
    else if (k === '+' || k === '=') a.zoom(0.88);
    else if (k === '-' || k === '_') a.zoom(1.14);
    else if (k === 'Home') a.resetView();
    else return;
    e.preventDefault();
  };

  const description = !task
    ? `גלובוס תלת־ממדי עם רשת קווי רוחב ואורך כל 30 מעלות. מסומנים קו הרוחב ${fmtLat(explore.lat)} וקו האורך ${fmtLon(explore.lon)}, ונקודת המפגש שלהם.`
    : task.kind === 'find'
      ? `גלובוס תלת־ממדי עם רשת קווי רוחב ואורך כל 30 מעלות, ועליו ארבע נקודות מסומנות באותיות ${CHOICE_NAMES.join(', ')}. איזו מהן נמצאת ברוחב ${fmtLat(task.lat)} ובאורך ${fmtLon(task.lon)}? בחרו אות בפאנל.`
      : 'גלובוס תלת־ממדי עם רשת קווי רוחב ואורך כל 30 מעלות. נקודה מסומנת בעיגול; קבעו את הרוחב והאורך שלה.';

  const controls = (c: Coord, compact = false) => {
    const { lat, lon } = toSigned(c);
    return (
      <>
        <CoordinateControl
          compact={compact}
          name="רוחב"
          mag={c.latMag}
          max={LAT_MAX}
          dir={c.latDir}
          dirs={[
            { id: 'N', name: 'צפון' },
            { id: 'S', name: 'דרום' },
          ]}
          letter={lat === 0 ? '' : c.latDir}
          caption={latCaption(lat)}
          onMag={(v) => dispatch({ type: 'latMag', v })}
          onStep={(d) => dispatch({ type: 'latStep', d })}
          onDir={(dir) => dispatch({ type: 'latDir', dir })}
        />
        <CoordinateControl
          compact={compact}
          name="אורך"
          mag={c.lonMag}
          max={LON_MAX}
          dir={c.lonDir}
          dirs={[
            { id: 'W', name: 'מערב' },
            { id: 'E', name: 'מזרח' },
          ]}
          letter={lon === 0 || lon === 180 ? '' : c.lonDir}
          caption={lonCaption(lon, lat)}
          onMag={(v) => dispatch({ type: 'lonMag', v })}
          onStep={(d) => dispatch({ type: 'lonStep', d })}
          onDir={(dir) => dispatch({ type: 'lonDir', dir })}
        />
      </>
    );
  };

  return (
    <div className="my-10" data-screen="geographic-coordinates">
      <h3 className={H3}>מערכת קואורדינטות גיאוגרפית</h3>
      <p className={LEAD}>
        האליפסואיד מחולק ל־360 חלקים לאורך ול־180 חלקים לרוחב, וכל נקודה או עצם מוגדרים בשני פרמטרים זוויתיים, במעלות: רוחב ואורך.{' '}
        <strong className="text-fg">
          רוחב (<L>ϕ</L>)
        </strong>{' '}
        נמדד מקו המשווה צפונה (ערך חיובי) ודרומה (ערך שלילי); קווי הרוחב נקראים <strong className="text-fg">פרללות</strong>.{' '}
        <strong className="text-fg">
          אורך (<L>λ</L>)
        </strong>{' '}
        נמדד מקו האורך של גריניץ׳, שנקבע כאפס, מזרחה (ערך חיובי) ומערבה (ערך שלילי); קווי האורך נקראים <strong className="text-fg">מרידיאנים</strong>.
        שנו את הרוחב ואת האורך ובדקו היכן הקווים נפגשים.
      </p>

      <div
        className="surface-elevated relative p-6"
        data-geo-explorer
        data-stage={state.stage}
        data-lat={explore.lat}
        data-lon={explore.lon}
        data-task-kind={task?.kind ?? ''}
        data-task-lat={task?.lat ?? ''}
        data-task-lon={task?.lon ?? ''}
        data-level={state.level}
        data-misses={state.misses}
        data-outcome={state.outcome ?? ''}
        data-stale={said?.stale ? 'true' : 'false'}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* ── the panel (inline-start = right) ── */}
          <div className="flex min-w-0 flex-col gap-3 lg:border-e lg:border-border/70 lg:pe-5">
            {!task ? (
              <>
                <h4 className={cn(H4, 'flex h-10 items-center')}>בונים מיקום</h4>
                <div className="flex flex-1 flex-col justify-center gap-3">{controls(state.explore)}</div>
                <div className="flex gap-3">
                  <Button size="md" className="flex-1" onClick={() => dispatch({ type: 'start', seed: newSeed() })}>
                    לתרגול
                  </Button>
                  <Button size="md" variant="secondary" className="px-5" onClick={() => dispatch({ type: 'resetExplore' })} aria-label="איפוס הרוחב והאורך ל־0 מעלות" title="מחזיר את הרוחב והאורך ל־0°, במפגש קו המשווה וגריניץ׳">
                    איפוס
                  </Button>
                </div>
              </>
            ) : (
              <TaskPanel state={state} dispatch={dispatch} controls={controls} said={said} view={view} onChoose={onChoose} />
            )}
          </div>

          {/* ── the globe (inline-end = left) ── */}
          <div className="min-w-0">
            <div
              ref={stageRef}
              role="group"
              aria-roledescription="גלובוס"
              aria-label="גלובוס תלת־ממדי"
              aria-describedby="geo-globe-desc"
              tabIndex={flat ? -1 : 0}
              onKeyDown={onStageKey}
              onPointerDown={() => setZoomOn(true)}
              onFocus={() => setZoomOn(true)}
              data-ready={ready ? 'true' : 'false'}
              data-flat={flat ? 'true' : 'false'}
              className={cn(
                'group relative w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                !flat && 'cursor-grab active:cursor-grabbing',
              )}
              style={{ height: STAGE_H }}
            >
              <p id="geo-globe-desc" className="sr-only">
                {description} גררו או השתמשו בחצים כדי לסובב את הגלובוס, ובמקשים + ו־− לתקריב. הסיבוב משנה רק את נקודת המבט.
              </p>

              {/* until the first 3-D frame: the lesson's shared loading indicator (as in the terrain / contour models) */}
              {!flat && !ready && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2" role="status">
                  <div className="font-display text-sm font-bold text-fg-muted">טוען גלובוס תלת־ממדי…</div>
                  <div className="h-1.5 w-40 overflow-hidden rounded-full bg-border/60" dir="ltr">
                    <div className="h-full bg-accent transition-[width] duration-300" style={{ width: images ? '70%' : '25%' }} />
                  </div>
                </div>
              )}

              {/* the contact shadow, behind the canvas so it only shows outside the disc (placed by Globe3D) */}
              {show3d && (
                <div
                  ref={shadowRef}
                  aria-hidden
                  className={cn('pointer-events-none absolute rounded-[50%] bg-[radial-gradient(closest-side,rgba(56,67,46,0.2),rgba(56,67,46,0.07)_60%,rgba(56,67,46,0))]', !ready && 'invisible')}
                  style={ORIGIN}
                />
              )}

              {show3d && (
                <div className={cn('absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none', ready ? 'opacity-100' : 'opacity-0')}>
                  <Globe3D
                    key={canvasKey}
                    images={images!}
                    sel={view.sel}
                    win={view.win}
                    choices={view.choices}
                    target={view.target}
                    note={view.note?.at ?? null}
                    reduce={reduce}
                    zoomEnabled={zoomOn}
                    active={near}
                    api={api}
                    memory={camMemory}
                    refs={refs}
                    onReady={onReady}
                    onFail={onFail}
                    onLost={onLost}
                  />
                </div>
              )}

              {/* labels and markers, placed every frame by Globe3D — an illustration, so dir="ltr" */}
              {show3d && (
                <div dir="ltr" aria-hidden className={cn('pointer-events-none absolute inset-0', !ready && 'invisible')}>
                  <div ref={eqRef} className={cn(CHIP, 'border-border/70')} style={ORIGIN}>
                    <span dir="rtl">
                      קו המשווה · <L>0°</L>
                    </span>
                  </div>
                  <div ref={gwRef} className={cn(CHIP, 'border-border/70')} style={ORIGIN}>
                    <span dir="rtl">
                      גריניץ׳ · <L>0°</L>
                    </span>
                  </div>
                  <div ref={northRef} style={ORIGIN} className="pointer-events-none absolute font-display text-sm font-bold leading-none text-black opacity-0">
                    N
                  </div>
                  <div ref={lonChipRef} className={cn(CHIP, 'border-accent/70')} style={ORIGIN} data-chip="lon">
                    {view.sel ? fmtLon(view.sel.lon) : ''}
                  </div>
                  <div ref={latChipRef} className={cn(CHIP, 'border-accent/70')} style={ORIGIN} data-chip="lat">
                    {view.sel ? fmtLat(view.sel.lat) : ''}
                  </div>
                  <div ref={noteRef} className={cn(CHIP, 'border-fg/45')} style={ORIGIN} data-note>
                    <span dir="rtl">{view.note?.text}</span>
                  </div>
                  <div ref={targetRef} style={ORIGIN} className="pointer-events-none absolute size-7 opacity-0" data-target-marker>
                    <span className="absolute inset-0 rounded-full border-[3px] border-fg bg-white/35 shadow-[0_0_0_2px_rgba(255,255,255,0.9),0_1px_6px_rgba(40,50,35,0.4)]" />
                    <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
                  </div>
                  {view.choices.map((_, i) => (
                    <button
                      key={i}
                      ref={(el) => {
                        choiceRefs.current[i] = el;
                      }}
                      type="button"
                      tabIndex={-1}
                      style={ORIGIN}
                      onClick={() => onChoose(i)}
                      disabled={!!state.outcome || view.ruled.includes(i)}
                      data-choice={i}
                      className={cn('pointer-events-auto absolute opacity-0', choiceDisc(view, i))}
                    >
                      {CHOICE_NAMES[i]}
                    </button>
                  ))}
                  <div ref={markerRef} style={ORIGIN} className="pointer-events-none absolute size-5 opacity-0" data-marker>
                    <span className="absolute inset-0 rounded-full border-[3px] border-white bg-accent shadow-[0_1px_5px_rgba(40,50,35,0.5)]" />
                    {view.win && <span className="absolute -inset-2 rounded-full border-2 border-accent/80 motion-safe:animate-[ping_1.2s_ease-out_1]" />}
                    {view.win && <span className="absolute -inset-1.5 rounded-full border-2 border-white/90" />}
                  </div>
                </div>
              )}

              {flat && (
                <div className="absolute inset-0 flex flex-col justify-center gap-3">
                  <p role="status" className="text-base leading-relaxed text-black">
                    {failed === 'images'
                      ? 'לא ניתן היה לטעון את הגלובוס. מוצגת מפה שטוחה של אותה רשת.'
                      : 'התצוגה התלת־ממדית אינה זמינה בדפדפן זה. מוצגת מפה שטוחה של אותה רשת.'}
                  </p>
                  <GlobeFlatMap view={view} onChoose={state.outcome ? undefined : onChoose} disc={choiceDisc} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── the practice panel ───────────────────────── */

function TaskPanel({
  state,
  dispatch,
  controls,
  said,
  view,
  onChoose,
}: {
  state: ReturnType<typeof initialGeoState>;
  dispatch: React.Dispatch<GeoAction>;
  controls: (c: Coord, compact?: boolean) => React.ReactNode;
  said: ReturnType<typeof messageOf>;
  view: GlobeView;
  onChoose: (i: number) => void;
}) {
  const task = state.task!;
  const over = !!state.outcome;
  const level = LEVELS[state.level];
  return (
    <>
      <div className="flex h-10 items-center justify-between gap-2">
        <h4 className={H4}>תרגול</h4>
        <span className="text-sm font-display font-semibold text-fg-muted" data-level-label>
          רמה <L>{state.level + 1}</L> מתוך <L>{LEVELS.length}</L> · {level.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3">
        {/* the question */}
        <div className="rounded-xl border border-border px-4 py-3" data-task>
          {task.kind === 'find' ? (
            <>
              <p className="font-display text-base font-bold text-black">מצאו על הגלובוס את הנקודה:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <TargetChip>
                  רוחב <L>{fmtLat(task.lat)}</L>
                </TargetChip>
                <TargetChip>
                  אורך <L>{fmtLon(task.lon)}</L>
                </TargetChip>
              </div>
            </>
          ) : (
            <p className="flex items-center gap-2 font-display text-base font-bold text-black">
              <span aria-hidden className="relative inline-block size-5 shrink-0 rounded-full border-[3px] border-fg">
                <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
              </span>
              מהן הקואורדינטות של הנקודה המסומנת?
            </p>
          )}
        </div>

        {task.kind === 'find' && <ChoiceRow view={view} over={over} onChoose={onChoose} />}

        {task.kind === 'read' && <div className={cn('flex flex-col gap-2', over && 'pointer-events-none opacity-60')}>{controls(state.answer, true)}</div>}

        {/* what happened — said here and, for a miss, beside the point on the globe */}
        {said && <TaskMessage message={said.message} stale={said.stale} />}

        {!over && (
          <p className="flex items-center gap-2 text-sm font-display font-semibold text-fg-muted" data-tries>
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: MAX_TRIES[task.kind] }, (_, i) => (
                <span key={i} className={cn('size-2 rounded-full', i < state.misses ? 'bg-fg/60' : 'border border-fg/40')} />
              ))}
            </span>
            ניסיון <L>{state.misses + 1}</L> מתוך <L>{MAX_TRIES[task.kind]}</L>
          </p>
        )}
      </div>

      <div className="flex gap-3">
        {!over ? (
          <Button size="md" className="flex-1" onClick={() => dispatch({ type: 'check' })} disabled={task.kind === 'find' && state.pick === null}>
            בדיקה
          </Button>
        ) : (
          <Button size="md" className="flex-1" onClick={() => dispatch({ type: 'next' })}>
            נקודה הבאה
            <Icon name="arrow-left" size={16} />
          </Button>
        )}
        <Button size="md" variant="secondary" className="px-5" onClick={() => dispatch({ type: 'explore' })} title="חזרה לבניית מיקום חופשית">
          לחקירה
        </Button>
      </div>
    </>
  );
}

/** The choices as one radio row — the keyboard's way to pick, and a shortcut that turns the
    globe to the letter. The globe's own lettered discs do the same by click. */
function ChoiceRow({ view, over, onChoose }: { view: GlobeView; over: boolean; onChoose: (i: number) => void }) {
  const n = view.choices.length;
  const usable = (i: number) => !over && !view.ruled.includes(i);
  return (
    <div className="flex items-center gap-3" data-choices>
      <span className="text-base font-display font-bold text-black">בחרו אות:</span>
      <div
        role="radiogroup"
        aria-label="הנקודות על הגלובוס"
        className="flex gap-2"
        onKeyDown={(e) => {
          // RTL row: ArrowLeft goes to the next letter (visually left)
          const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          let i = view.picked ?? (d > 0 ? -1 : n);
          for (let k = 0; k < n; k++) {
            i = (i + d + n) % n;
            if (usable(i)) break;
          }
          if (!usable(i)) return;
          onChoose(i);
          (e.currentTarget.querySelector(`[data-choice-option="${i}"]`) as HTMLElement | null)?.focus();
        }}
      >
        {view.choices.map((c, i) => {
          const on = view.picked === i;
          const first = view.picked === null ? view.choices.findIndex((_, k) => usable(k)) : view.picked;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`נקודה ${CHOICE_NAMES[i]}${view.ruled.includes(i) ? ' – נבדקה ואינה נכונה' : ''}${view.answer === i ? ' – התשובה' : ''}`}
              tabIndex={i === first ? 0 : -1}
              disabled={!usable(i)}
              data-choice-option={i}
              onClick={() => onChoose(i)}
              className={cn(choiceDisc(view, i), 'size-10 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2')}
            >
              {CHOICE_NAMES[i]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One look for a choice, on the globe and in the panel: open · picked (filled) · ruled out
    (faded, struck) · the answer once the task is over (orange). */
export function choiceDisc(view: GlobeView, i: number) {
  const ruled = view.ruled.includes(i);
  return cn(
    'grid place-items-center rounded-full border-2 font-display font-bold leading-none transition-colors duration-150 motion-reduce:transition-none',
    'size-[30px] text-base shadow-[0_1px_5px_rgba(40,50,35,0.35)]',
    view.answer === i
      ? 'border-white bg-accent text-white'
      : view.picked === i && !ruled
        ? 'border-white bg-brand-dark text-bg-elevated'
        : ruled
          ? 'border-fg/30 bg-bg-elevated/80 text-fg/45 line-through'
          : 'cursor-pointer border-fg bg-bg-elevated text-black hover:bg-brand/[0.12]',
  );
}

function TargetChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-2.5 py-0.5 font-display text-base font-bold text-black">{children}</span>;
}

const TONE_ICON: Record<Message['tone'], React.ReactNode> = {
  info: <Target size={22} strokeWidth={1.8} aria-hidden />,
  ok: <CircleCheck size={22} strokeWidth={1.8} aria-hidden />,
  reveal: <Target size={22} strokeWidth={1.8} aria-hidden />,
  retry: <CircleAlert size={22} strokeWidth={1.8} aria-hidden />,
};

/** The task's own line: success in the lesson's green, the rest in ink (told apart by wording
    and icon, never by red). */
function TaskMessage({ message, stale }: { message: Message; stale: boolean }) {
  const ok = message.tone === 'ok';
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      data-geo-feedback
      data-tone={message.tone}
      className={cn('flex gap-2.5 rounded-xl px-3 py-2.5 transition-colors duration-200 motion-reduce:transition-none', ok ? 'bg-brand/[0.09]' : 'bg-bg-accent/60', stale && 'opacity-60')}
    >
      <span className={cn('mt-0.5 shrink-0', ok ? 'text-brand-dark' : 'text-fg')}>{TONE_ICON[message.tone]}</span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-display text-base font-bold leading-snug text-black">
          {stale && <StatusChip tone="badge">בדיקה קודמת</StatusChip>}
          <span>
            <Bidi text={message.title} />
          </span>
        </p>
        <p className="mt-0.5 text-base leading-relaxed text-black">
          <Bidi text={message.body} />
        </p>
      </div>
    </div>
  );
}
