'use client';
/**
 * „במהלך הניווט: מה צריך לבדוק?” — a navigation decision exercise (lesson 6,
 * „דגשים לתכנון ולניווט”, screen 2). The learner leads a navigation from the
 * stream crossing to the dirt-road crossing. At every stop they compare what
 * the plan expects with what the terrain and the counted distance show, and
 * decide: continue (the walk goes on, the estimate moves, its uncertainty
 * grows) or stop and check (identify a sign in the view, find it on the map,
 * combine it with the distance or another sign — only a real crossing of the
 * evidence fixes the position). A scenario event in the woodland pulls the
 * walk off the line whatever is decided; the decisions decide when it is
 * found and what that costs. The debrief is built from what was done.
 *
 *   ReplayView   the live 3D view from where the navigator really stands (start)
 *   ReplayMap    the planning map: verified points, the estimate, the target,
 *                the check's evidence; the true track only in the debrief (end)
 *   decision bar one question and its actions, per phase
 *   route row    the stops reached; a past stop can be reviewed (read-only)
 *
 * Layout is fixed at the lesson's reference width (1344) with one height in
 * every state, so the laptop fit never rescales between steps.
 */
import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Check, Footprints, Info, Lightbulb, MapPin, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReplayView, type ViewMode } from './ReplayView';
import { ReplayMap, type MapDebrief, type MapFix } from './ReplayMap';
import type { ViewMarker } from './ReplayMarkers';
import { createViewStore } from './replayViewStore';
import { createWalkStore, walkPlan, type WalkStore } from './replayWalk';
import { current, debriefOf, initialRun, lociOf, nextStop, runReducer, toTargetM, type CheckState, type Knowledge, type RunState, type Visit } from './replayRun';
import { signFromView, signName, type ViewPick } from './replayCheck';
import { SIGNS, STAND_IN_M, STOP_SEES, segmentOf, signAnchor, type SignId, type StopId } from './replayRoute';
import { FIX_NAME, STOPS, STOP_LABEL, TARGET_NAME, WALK_TO, arrivalText, debriefHeadline, msgText, round10, verdictText, visitLine } from './replayScenario';
import { along, bearingW, distW, type W2 } from './replayWorld';
import { heightAt } from './replayTerrain';

const EASE = [0.22, 1, 0.36, 1] as const;
/** Width of the 3D panel at the reference width; the map takes the rest. */
const VIEW_W = 808;
const PANEL_H = 430;
/** The decision bar's height: its tallest state (the check with its feedback). */
const DECISION_H = 192;
const SIGN_ORDER: SignId[] = ['saddle', 'summitW', 'summitE', 'stream', 'road', 'woodland', 'pines'];

/** Where a sign's label goes in the view: its anchor — or, for the saddle stood in, the ground a little ahead. */
function anchorFor(sign: SignId, eye: W2, yawDeg: number): W2 | null {
  if (sign === 'saddle' && distW(eye, SIGNS.saddle.at!) < STAND_IN_M) return along(eye, yawDeg, 22);
  return signAnchor(sign, eye);
}

export function NavigationReplayScreen() {
  return (
    <div data-tips-screen="nav">
      {/* The screen's title and instruction, centred above the activity card. */}
      <header className="mb-2 text-center">
        <h3 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-black">במהלך הניווט: מה צריך לבדוק?</h3>
        <p className="mt-1 text-base leading-snug text-black">
          הגיעו מחציית הנחל לחציית דרך העפר. התחילו בבדיקה מודרכת: בחרו סימן בשטח ומצאו אותו במפה. בהמשך, בכל תחנה החליטו: ממשיכים, או עוצרים לבדוק את המיקום.
        </p>
      </header>
      <NavigationReplayActivity />
    </div>
  );
}

const fixesUpTo = (visits: Visit[], last: number): MapFix[] => {
  const out: MapFix[] = [];
  visits.slice(0, last + 1).forEach((v, i) => v.fix && out.push({ at: v.fix.at, name: FIX_NAME[v.stop], visit: i }));
  // the known starting point, until the opening check confirms it
  if (!visits[0].fix) out.unshift({ at: visits[0].truth, name: FIX_NAME.stream, visit: 0 });
  return out;
};

export function NavigationReplayActivity() {
  const reduce = !!useReducedMotion();
  const uid = useId();
  const [run, dispatch] = useReducer(runReducer, undefined, initialRun);
  const view = useMemo(() => createViewStore(STOPS.stream.view), []);
  const walk = useMemo(createWalkStore, []);
  const walkPhase = useSyncExternalStore(walk.subscribe, walk.phase, walk.phase);
  const [viewMode, setViewMode] = useState<ViewMode>('pending');
  const [hintOn, setHintOn] = useState(false);
  /** where each sign was clicked in the view (its label is drawn there) */
  const [picked, setPicked] = useState<Partial<Record<SignId, W2>>>({});
  const [announce, setAnnounce] = useState('');
  const promptRef = useRef<HTMLHeadingElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const advanceFocus = useRef(false);

  const reviewing = run.review !== null;
  const shownIndex = reviewing ? run.review! : run.visits.length - 1;
  const shown = run.visits[shownIndex];
  const cur = current(run);
  const text = STOPS[shown.stop];
  const live = viewMode === 'live';
  const done = run.phase === 'done';

  // dev / QA hooks: the look, and the run
  useEffect(() => {
    const w = window as unknown as { __replayView?: typeof view; __replayRun?: RunState };
    w.__replayView = view;
    w.__replayRun = run;
  }, [view, run]);

  // a stop shown (arrived at, or reviewed): its opening look
  useEffect(() => view.setHome(STOPS[shown.stop].view), [shown.stop, shownIndex, view]);
  // a new stop: per-stop help and labels start afresh; the prompt takes the focus
  const visits = run.visits.length;
  useEffect(() => {
    setHintOn(false);
    setPicked({});
    if (visits > 1) {
      setAnnounce(`הגעתם לתחנה: ${STOP_LABEL[current(run).stop]}.`);
      promptRef.current?.focus({ preventScroll: true });
    }
    // only on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits]);

  // continuing: walk the segment in the view (or arrive at once without the live view or with reduced motion)
  useEffect(() => {
    if (run.phase !== 'walking' || !run.walk) return;
    if (reduce || viewMode !== 'live') {
      dispatch({ type: 'arrive' });
      return;
    }
    walk.start(walkPlan(run.walk.from, run.walk.to, run.walk.route), view.get());
    setAnnounce(`${WALK_TO[run.walk.to]}. אפשר לדלג להגעה.`);
    // a new walk only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.phase, run.walk]);
  useEffect(() => {
    if (walkPhase !== 'arrived') return;
    walk.cancel();
    dispatch({ type: 'arrive' });
  }, [walkPhase, walk]);
  useEffect(() => {
    if ((reduce || viewMode === 'static') && walkPhase !== 'idle' && walkPhase !== 'arrived') walk.skip();
  }, [reduce, viewMode, walkPhase, walk]);
  useEffect(() => () => walk.cancel(), [walk]);

  const reset = () => {
    walk.cancel();
    dispatch({ type: 'reset' });
    setAnnounce('הפעילות התחילה מחדש: חציית הנחל.');
  };

  // ——— the check, in the view and on the map ———
  const check = run.phase === 'check' && !reviewing ? cur.check : null;
  const task = check ? checkTask(run, check) : reviewing ? {
    target: 'review', title: 'אתם בסקירה של תחנה קודמת', detail: 'אפשר לעיין בהחלטה ובתוצאה שלה. להמשך התרגיל לחצו למטה על „חזרה לתחנה הנוכחית”.',
  } : done ? {
    target: 'done', title: 'הניווט הסתיים — בדקו מה קרה בדרך', detail: 'במפה מוצג כעת המסלול שעברתם בפועל. השוו אותו לאומדן וקראו כיצד ההחלטות שלכם השפיעו על הניווט.',
  } : run.phase === 'walking' ? {
    target: 'walking', title: 'הכוח בתנועה לתחנה הבאה', detail: 'התנועה מתבצעת אוטומטית. אפשר להסתכל בהתקדמות או ללחוץ למטה על „דלגו להגעה”.',
  } : cur.fix ? {
    target: 'fixed', title: cur.agrees === false ? 'המיקום נמצא והכיוון תוקן — אפשר להמשיך' : 'המיקום אומת — אפשר להמשיך', detail: 'קראו את תוצאת הבדיקה למטה, ואז לחצו על כפתור ההמשך כדי לצאת לקטע הבא.',
  } : {
    target: 'decide', title: 'עכשיו מחליטים: ממשיכים או עוצרים לבדיקה?', detail: 'השוו את השטח שמימין לתכנון ולמרחק שמתוארים למטה. בחרו „עוצרים לבדיקה” כדי לאמת מיקום, או „ממשיכים” כדי להתקדם.',
  };
  const guidedNext = text.help === 'guided' && check ? text.hint.find((s) => !check.matched.includes(s)) ?? null : null;
  const hintSign = check && !check.pending ? (text.help === 'guided' ? guidedNext : hintOn ? text.hint.find((s) => !check.matched.includes(s)) ?? null : null) : null;
  const pulse = check?.pending && (text.help === 'guided' || hintOn) ? check.pending : null;

  // A list choice replaces its own control. Keep keyboard focus on the next
  // useful action; direct terrain/map clicks keep their existing focus.
  useEffect(() => {
    if (!advanceFocus.current) return;
    advanceFocus.current = false;
    const selector = task.target === 'map' ? '[data-list="map"]'
      : task.target === 'view' ? '[data-list="view"]'
      : task.target === 'distance' ? '[data-action="distance"]'
      : task.target === 'commit' ? '[data-action="commit"]'
      : '[data-action="next"]';
    activityRef.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [run, task.target]);

  // the guided opening turns the view to its second sign once the first is matched
  useEffect(() => {
    if (!guidedNext || guidedNext === 'saddle' || !check || check.pending) return;
    const at = signAnchor(guidedNext, cur.truth);
    if (at) view.goTo({ ...view.get(), yawDeg: bearingW(cur.truth, at), pitchDeg: -9 }, reduce);
    // when the next guided sign changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidedNext]);

  const onViewPick = useCallback(
    (p: ViewPick | null) => {
      const sign = p ? signFromView(p) : null;
      if (sign && p?.hit) setPicked((m) => ({ ...m, [sign]: { x: p.hit!.x, z: p.hit!.z } }));
      dispatch({ type: 'pick-view', sign, from: 'view' });
    },
    [dispatch],
  );
  const onListPick = (sign: SignId) => {
    advanceFocus.current = true;
    setPicked((m) => {
      const n = { ...m };
      delete n[sign];
      return n;
    });
    dispatch({ type: 'pick-view', sign, from: 'list' });
    // turn the live view to it, so the label is in sight
    const at = signAnchor(sign, cur.truth);
    if (at && live && STOP_SEES[cur.stop].includes(sign)) {
      const d = Math.max(1, distW(cur.truth, at));
      const pitch = (Math.atan2(heightAt(at.x, at.z) - heightAt(cur.truth.x, cur.truth.z) - 1.7, d) * 180) / Math.PI;
      view.goTo({ ...view.get(), yawDeg: bearingW(cur.truth, at), pitchDeg: Math.max(-20, Math.min(12, pitch)) }, reduce);
    }
  };

  const markers = useMemo<ViewMarker[]>(() => {
    const out: ViewMarker[] = [];
    const c = shown.check;
    if (c)
      for (const id of [...c.matched, ...(c.pending && !reviewing ? [c.pending] : [])]) {
        const at = picked[id] ?? anchorFor(id, shown.truth, STOPS[shown.stop].view.yawDeg);
        if (at) out.push({ id, at, label: SIGNS[id].name, tone: 'picked', lift: 1.4 });
      }
    if (hintSign) {
      const at = anchorFor(hintSign, shown.truth, STOPS[shown.stop].view.yawDeg);
      if (at) out.push({ id: 'hint', at, label: SIGNS[hintSign].name, tone: 'hint', lift: 2 });
    }
    return out;
  }, [shown, picked, hintSign, reviewing]);

  // ——— the map ———
  const knowShown: Knowledge = reviewing ? shown.arrival : run.know;
  const fixes = fixesUpTo(run.visits, shownIndex);
  const lastFixVisit = [...run.visits.slice(0, shownIndex + 1)].reverse().find((v) => v.fix);
  const debrief: MapDebrief | null = useMemo(() => {
    if (!done) return null;
    const path: W2[] = [];
    run.visits.forEach((v, i) => {
      if (i === 0) return path.push(v.truth);
      path.push(...(segmentOf(run.visits[i - 1].stop, v.stop) ?? [v.truth]).slice(1));
    });
    return { path, stops: run.visits.map((v) => ({ truth: v.truth, estimate: v.arrival.estimate, label: STOP_LABEL[v.stop] })) };
  }, [done, run.visits]);
  const walking = run.phase === 'walking' && run.walk ? { from: run.know.counted, add: distW(run.walk.route[0], run.walk.route[run.walk.route.length - 1]) } : null;

  return (
    <div
      ref={activityRef}
      role="group"
      aria-labelledby={`${uid}-title`}
      className="surface-elevated px-6 pb-4 pt-3"
      data-activity="navigation-replay"
      data-stop={shown.stop}
      data-phase={run.phase}
      data-review={reviewing || undefined}
      data-travel={walkPhase}
    >
      <h4 id={`${uid}-title`} className="sr-only">
        במהלך הניווט: מה צריך לבדוק?
      </h4>
      <RouteRow run={run} onReview={(i) => dispatch({ type: 'review', index: i })} onReset={reset} />

        <div className="mt-3 flex min-h-[84px] items-center gap-3 rounded-xl border border-brand/45 bg-bg-accent p-3" role="status" aria-live="polite" aria-atomic="true" data-next-task data-target={task.target}>
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand-dark text-bg-elevated">
            {task.target === 'distance' || task.target === 'walking' ? <Footprints className="size-5" /> : task.target === 'commit' || task.target === 'fixed' ? <Check className="size-5" /> : <MapPin className="size-5" />}
          </span>
          <div>
            <p className="font-display text-base font-bold leading-tight text-black md:text-lg">{task.title}</p>
            <p className="mt-1 text-base leading-relaxed text-black">{task.detail}</p>
          </div>
        </div>

      {/* the field (start / right) and the planning map (end / left) */}
      <div className="mt-2 grid gap-4" style={{ gridTemplateColumns: `${VIEW_W}px minmax(0, 1fr)`, height: PANEL_H }}>
        {done ? (
          <DebriefPanel run={run} />
        ) : (
          <ReplayView
            stationKey={shown.stop}
            station={shown.truth}
            view={view}
            description={text.viewText}
            reduce={reduce}
            walk={walk}
            onMode={setViewMode}
            pickPrompt={check && !check.pending ? (task.target !== 'view' ? 'אפשר להוסיף סימן נוסף בלחיצה בשטח' : guidedNext ? `לחצו על ${SIGNS[guidedNext].the}` : 'לחצו על סימן שאתם מזהים גם במפה') : null}
            onPick={onViewPick}
            markers={markers}
            className={cn('h-full', task?.target === 'view' && 'ring-2 ring-accent')}
          />
        )}
        <MapPanel know={knowShown} fixes={fixes} done={done} pending={check?.pending ?? null}>
          <ReplayMap
            know={knowShown}
            fixes={fixes}
            loci={done || run.phase === 'walking' ? [] : lociOf(run, shown)}
            verdict={done || run.phase === 'walking' ? null : shown.check?.verdict ?? null}
            pick={check?.pending ? (sign) => dispatch({ type: 'pick-map', sign }) : null}
            pulse={pulse}
            correction={!done && lastFixVisit?.agrees === false}
            walk={walk}
            walking={walking}
            debrief={debrief}
            description={mapDescription(run, shown, knowShown, done)}
          />
        </MapPanel>
      </div>

      <div className="mt-3 border-t border-border/80 pt-3" data-replay-footer>
        <div style={{ minHeight: DECISION_H }} data-decision={reviewing ? 'review' : run.phase}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${shownIndex}-${run.phase}-${shown.fix ? 'f' : ''}-${reviewing ? 'r' : ''}`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {reviewing ? (
                <ReviewBar run={run} index={shownIndex} promptRef={promptRef} onBack={() => dispatch({ type: 'review', index: null })} />
              ) : done ? (
                <DebriefBar run={run} promptRef={promptRef} onReset={reset} />
              ) : run.phase === 'walking' ? (
                <WalkBar run={run} walk={walk} />
              ) : run.phase === 'check' && check ? (
                <CheckBar
                  run={run}
                  check={check}
                  promptRef={promptRef}
                  live={live}
                  hintOn={hintOn}
                  onHint={() => setHintOn(true)}
                  onListView={onListPick}
                  onListMap={(sign) => { advanceFocus.current = true; dispatch({ type: 'pick-map', sign }); }}
                  onDistance={() => { advanceFocus.current = true; dispatch({ type: 'add-distance' }); }}
                  onCommit={() => dispatch({ type: 'commit' })}
                  onCancel={() => dispatch({ type: 'cancel-check' })}
                  onContinue={() => dispatch({ type: 'continue' })}
                />
              ) : cur.fix ? (
                <FixedBar run={run} promptRef={promptRef} onContinue={() => dispatch({ type: 'continue' })} />
              ) : (
                <DecideBar run={run} promptRef={promptRef} onCheck={() => dispatch({ type: 'check' })} onContinue={() => dispatch({ type: 'continue' })} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" data-announce>
        {announce}
      </p>
    </div>
  );
}

// ───────────────────────────────────────────── the map's accessible name

function mapDescription(run: RunState, v: Visit, k: Knowledge, done: boolean): string {
  const parts = [`במפה: הנקודה המזוהה האחרונה — ${FIX_NAME[k.fix.stop]}.`];
  if (k.counted > 0) parts.push(`האומדן: כ־${round10(k.counted)} מ׳ ממנה על המסלול המתוכנן, בתחום של כ־${round10(k.uncertainty)} מ׳.`);
  parts.push(`היעד הבא: ${TARGET_NAME[k.target]}, כ־${round10(toTargetM(k))} מ׳.`);
  const loci = lociOf(run, v);
  if (loci.length) parts.push(`ראיות הבדיקה: ${loci.map((l) => (l.kind === 'arc' ? 'קשת המרחק' : l.kind === 'sight' ? `קו כיוון מ${SIGNS[l.sign].the}` : SIGNS[l.sign].the)).join(', ')}.`);
  if (done) parts.push('תחקיר: מסומנת הדרך שעברתם בפועל, ובכל תחנה המיקום בפועל מול האומדן.');
  return parts.join(' ');
}

// ───────────────────────────────────────────── the map panel and its key

function MapPanel({ know, fixes, done, pending, children }: { know: Knowledge; fixes: MapFix[]; done: boolean; pending: SignId | null; children: ReactNode }) {
  const latest = fixes[fixes.length - 1];
  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-bg-elevated', pending && 'ring-2 ring-accent')} data-panel="map">
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 px-3.5">
        <h5 className="font-display text-lg font-bold leading-none text-black">{pending ? `מצאו במפה: ${signName(pending)}` : 'מפת התכנון'}</h5>
        {!pending && <span className="text-[13px] text-fg-muted">{done ? 'תחקיר: מה קרה בפועל' : 'מה ידוע לנווט'}</span>}
      </div>
      {/* the three things the map keeps apart, with their current values */}
      <ul className="flex h-8 shrink-0 items-center justify-between gap-2 border-y border-border/60 bg-bg-accent/40 px-3 text-[13px] leading-none text-black" data-map-key>
        <li className="flex min-w-0 items-center gap-1.5" data-key="fix">
          <KeyGlyph kind="fix" />
          <span className="truncate">
            אומת: <strong className="font-bold">{latest?.name}</strong>
          </span>
        </li>
        <li className="flex items-center gap-1.5" data-key="estimate">
          <KeyGlyph kind="estimate" />
          <span>{know.counted > 0 ? <>אומדן ±{round10(know.uncertainty)} מ׳</> : 'אומדן: אין'}</span>
        </li>
        <li className="flex min-w-0 items-center gap-1.5" data-key="target">
          <KeyGlyph kind="target" />
          <span className="truncate">
            יעד: <strong className="font-bold">{TARGET_NAME[know.target]}</strong>
          </span>
        </li>
      </ul>
      <div className="min-h-0 flex-1 overflow-hidden rounded-b-xl">{children}</div>
    </div>
  );
}

function KeyGlyph({ kind }: { kind: 'fix' | 'estimate' | 'target' }) {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 shrink-0 overflow-visible" aria-hidden>
      {kind === 'fix' && (
        <g>
          <circle cx="7" cy="7" r="5.6" fill="#749C75" stroke="#5B7C5C" strokeWidth="1" />
          <path d="M4.5 7.1 L6.3 8.9 L9.6 5.3" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {kind === 'estimate' && (
        <g>
          <circle cx="7" cy="7" r="5.6" fill="#D97E2B" fillOpacity="0.12" stroke="#D97E2B" strokeWidth="1.1" strokeDasharray="2.2 1.5" />
          <circle cx="7" cy="7" r="1.3" fill="#D97E2B" />
        </g>
      )}
      {kind === 'target' && (
        <g>
          <circle cx="6" cy="9" r="3.6" fill="#fff" stroke="#38432E" strokeWidth="1.2" />
          <path d="M6 5.6 V0.8 L11 2.2 L6 3.6" fill="#D97E2B" stroke="#38432E" strokeWidth="0.6" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}

// ───────────────────────────────────────────── the route row

function RouteRow({ run, onReview, onReset }: { run: RunState; onReview: (i: number | null) => void; onReset: () => void }) {
  const last = run.visits.length - 1;
  const reached = run.visits.some((v) => v.stop === 'crossing');
  return (
    <div className="flex items-center justify-between gap-4" data-route-row>
      <nav aria-label="התחנות שעברתם" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5" data-timeline>
          {run.visits.map((v, i) => {
            const active = (run.review ?? last) === i;
            const status = v.fix ? (v.agrees ? 'fix' : 'mismatch') : i < last ? 'continued' : 'here';
            return (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden className="h-px w-4 bg-brand-dark/40" />}
                <button
                  type="button"
                  onClick={() => onReview(i === last ? null : i)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-full border px-2.5 font-display text-[15px] leading-none transition-colors',
                    active ? 'border-accent bg-accent/10 font-bold text-accent' : 'border-border bg-bg-elevated font-medium text-black hover:bg-bg-accent',
                  )}
                  data-moment={v.stop}
                  data-status={status}
                >
                  <StopIcon status={status} />
                  {STOP_LABEL[v.stop]}
                  <span className="sr-only">{status === 'fix' ? ' — המיקום אומת' : status === 'mismatch' ? ' — נמצאה סטייה ותוקנה' : status === 'continued' ? ' — המשכתם בלי לאמת' : ' — כאן עכשיו'}</span>
                </button>
              </li>
            );
          })}
          {!reached && (
            <li className="flex items-center gap-1.5 text-fg-muted" aria-label="היעד: חציית דרך העפר">
              <span aria-hidden className="h-px w-6 border-t border-dashed border-brand-dark/40" />
              <span className="flex h-8 items-center gap-1 rounded-full border border-dashed border-border px-2.5 font-display text-[15px] leading-none">
                <MapPin className="size-3.5" aria-hidden />
                חציית דרך העפר
              </span>
            </li>
          )}
        </ol>
      </nav>
      <button type="button" onClick={onReset} className="btn-secondary h-9 shrink-0 gap-2 px-3.5 text-base" data-reset>
        <RotateCcw className="size-4" aria-hidden />
        התחלה מחדש
      </button>
    </div>
  );
}

function StopIcon({ status }: { status: 'fix' | 'mismatch' | 'continued' | 'here' }) {
  if (status === 'fix')
    return (
      <span aria-hidden className="grid size-[18px] place-items-center rounded-full bg-brand-dark text-white">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  if (status === 'mismatch')
    return (
      <span aria-hidden className="grid size-[18px] place-items-center rounded-full bg-accent text-white">
        <AlertTriangle className="size-3" strokeWidth={2.6} />
      </span>
    );
  if (status === 'continued')
    return (
      <span aria-hidden className="grid size-[18px] place-items-center rounded-full border-[1.5px] border-dashed border-accent text-accent">
        <ArrowLeft className="size-3" strokeWidth={2.6} />
      </span>
    );
  return <span aria-hidden className="size-[18px] rounded-full border-[3px] border-accent bg-white" />;
}

// ───────────────────────────────────────────── decision bar pieces

/** Two columns: the text (start / right) and the actions (end / left). */
function Row({ text, actions }: { text: ReactNode; actions: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6">
      <div className="min-w-0">{text}</div>
      <div className="flex flex-col items-stretch gap-2.5">{actions}</div>
    </div>
  );
}

function Prompt({ promptRef, children, kicker }: { promptRef: React.RefObject<HTMLHeadingElement | null>; children: ReactNode; kicker?: ReactNode }) {
  return (
    <h5 ref={promptRef} tabIndex={-1} className="flex items-baseline gap-2 font-display text-lg font-bold leading-snug text-black outline-none" data-prompt>
      {kicker && <span className="shrink-0 rounded-md bg-bg-accent px-2 py-0.5 text-sm font-bold text-fg-muted">{kicker}</span>}
      <span>{children}</span>
    </h5>
  );
}

function Line({ label, children, tone = 'plain', data }: { label: string; children: ReactNode; tone?: 'plain' | 'event' | 'changed'; data?: string }) {
  return (
    <p className="mt-1 flex items-start gap-2 text-base leading-snug text-black" data-line={data}>
      {tone === 'event' ? (
        <AlertTriangle className="mt-[3px] size-4 shrink-0 text-accent" aria-hidden />
      ) : tone === 'changed' ? (
        <Footprints className="mt-[3px] size-4 shrink-0 text-fg-muted" aria-hidden />
      ) : (
        <Info className="mt-[3px] size-4 shrink-0 text-fg-muted" aria-hidden />
      )}
      <span>
        <strong className="font-bold">{label} </strong>
        {children}
      </span>
    </p>
  );
}

function Feedback({ tone, lead, body, data }: { tone: 'ok' | 'warn' | 'info'; lead?: string | null; body: ReactNode; data?: string }) {
  return (
    <div className="mt-1.5 flex items-start gap-2.5" data-tone={tone} data-feedback={data}>
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white',
          tone === 'ok' && 'bg-brand-dark',
          tone === 'warn' && 'bg-accent',
          tone === 'info' && 'bg-fg-muted',
        )}
      >
        {tone === 'ok' ? <Check className="size-3" strokeWidth={3} /> : tone === 'warn' ? <AlertTriangle className="size-3" strokeWidth={2.6} /> : <Info className="size-3" strokeWidth={2.6} />}
      </span>
      <p className="text-base leading-snug text-black">
        {lead && <strong className="me-1 font-bold">{lead}</strong>}
        {body}
      </p>
    </div>
  );
}

const countedLine = (k: Knowledge) => (k.counted > 0 ? `נספרו כ־${round10(k.counted)} מ׳ מהנקודה המזוהה האחרונה („${FIX_NAME[k.fix.stop]}”).` : `אתם בנקודה המזוהה („${FIX_NAME[k.fix.stop]}”).`);

type BarProps = { run: RunState; promptRef: React.RefObject<HTMLHeadingElement | null> };

function DecideBar({ run, promptRef, onCheck, onContinue }: BarProps & { onCheck: () => void; onContinue: () => void }) {
  useEffect(() => promptRef.current?.focus({ preventScroll: true }), [promptRef]);
  const v = current(run);
  const t = STOPS[v.stop];
  const prev = run.visits[run.visits.length - 2];
  const blocked = nextStop(run) === null;
  return (
    <Row
      text={
        <>
          <Prompt promptRef={promptRef} kicker={STOP_LABEL[v.stop]}>
            {t.question}
          </Prompt>
          {t.event && (
            <Line label="אירוע:" tone="event" data="event">
              {t.event}
            </Line>
          )}
          <Line label="צפוי:" data="expect">
            {t.expect(run.know)}
          </Line>
          <Line label="נתון:" data="counted">
            {countedLine(run.know)}
          </Line>
          {prev && !prev.fix && !t.event && (
            <Line label="מה השתנה:" tone="changed" data="changed">
              {arrivalText(prev.arrival, v.arrival)}
            </Line>
          )}
        </>
      }
      actions={
        <>
          <div className={cn('grid gap-3', blocked ? 'grid-cols-1' : 'grid-cols-2')} role="group" aria-label="ההחלטה">
            {/* RTL: the first button sits on the right */}
            <button type="button" className="btn-primary h-14 whitespace-nowrap px-3 text-lg" onClick={onCheck} data-choice="check">
              עוצרים לבדיקה
            </button>
            {!blocked && (
              <button type="button" className="btn-secondary h-14 whitespace-nowrap px-3 text-lg" onClick={onContinue} data-choice="continue">
                ממשיכים
              </button>
            )}
          </div>
          {blocked && t.mustCheck && <p className="text-base leading-snug text-black" data-must-check>{t.mustCheck}</p>}
          {!blocked && <p className="text-base leading-relaxed text-black">„עוצרים לבדיקה” פותח השוואה בין השטח למפה. „ממשיכים” מעביר לתחנה הבאה בלי לאמת את המיקום.</p>}
        </>
      }
    />
  );
}

/** One next action, derived from the same evidence the map and reducer use. */
function checkTask(run: RunState, check: CheckState) {
  const t = STOPS[current(run).stop];
  const count = lociOf(run).length;
  if (check.pending) return {
    target: 'map', title: `עכשיו במפה: לחצו על ${SIGNS[check.pending].the}`,
    detail: 'חפשו במפה שמשמאל את אותו סימן שבחרתם בשטח. אפשר גם לבחור אותו מהרשימה שמתחת לתצוגה.',
  };
  if (count >= 2 && !check.verdict) return {
    target: 'commit', title: 'אספתם שתי ראיות — עכשיו בדקו את המיקום',
    detail: 'לחצו על „אימות המיקום” למטה. הבדיקה תראה אם הראיות נפגשות בנקודה אחת ואם היא תואמת לאומדן.',
  };
  if (count > 0 && !check.distance && run.know.counted > 0) return {
    target: 'distance', title: 'הוסיפו לבדיקה את המרחק שנספר',
    detail: 'לחצו למטה על „הוספת המרחק”. השילוב בין המרחק לסימן מהשטח עוזר לקבוע איפה אתם.',
  };
  const next = t.help === 'guided' ? t.hint.find((s) => !check.matched.includes(s)) : null;
  return {
    target: 'view',
    title: next ? `עכשיו בשטח: לחצו על ${SIGNS[next].the}` : count ? 'בחרו בשטח סימן נוסף מכיוון אחר' : 'בחרו בשטח סימן שתוכלו למצוא גם במפה',
    detail: count
      ? check.verdict?.kind === 'partial' ? 'הראיות שנאספו עדיין לא קובעות נקודה אחת. בחרו סימן מכיוון אחר ומצאו גם אותו במפה.' : 'סימן אחד עדיין לא קובע מיקום. בחרו סימן נוסף, ואז מצאו גם אותו במפה.'
      : 'התצפית נמצאת מימין. גררו כדי להסתכל סביב ולחצו לחיצה קצרה לבחירת סימן. אפשר גם לבחור מהרשימה למטה.',
  };
}

function SignSelect({ label, onPick, data, exclude = [] }: { label: string; onPick: (s: SignId) => void; data: string; exclude?: SignId[] }) {
  const id = useId();
  return (
    <div className="mt-2 flex items-center gap-3">
      <label htmlFor={id} className="text-base leading-relaxed text-black">{data === 'view' ? 'או בחרו סימן בשטח מהרשימה:' : 'או מצאו את הסימן במפה ברשימה:'}</label>
      <select
        id={id}
        aria-label={label}
        className="h-12 rounded-xl border border-border bg-bg-elevated px-3 text-base text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        value=""
        onChange={(e) => e.target.value && onPick(e.target.value as SignId)}
        data-list={data}
      >
        <option value="">בחרו סימן…</option>
        {SIGN_ORDER.filter((s) => !exclude.includes(s)).map((s) => (
          <option key={s} value={s}>
            {signName(s)}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckBar({
  run,
  check,
  promptRef,
  live,
  hintOn,
  onHint,
  onListView,
  onListMap,
  onDistance,
  onCommit,
  onCancel,
  onContinue,
}: BarProps & {
  check: CheckState;
  live: boolean;
  hintOn: boolean;
  onHint: () => void;
  onListView: (s: SignId) => void;
  onListMap: (s: SignId) => void;
  onDistance: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const v = current(run);
  const t = STOPS[v.stop];
  const k = run.know;
  const loci = lociOf(run);
  const guided = t.help === 'guided';
  const task = checkTask(run, check);
  const canCommit = loci.length >= 2 && !check.pending;
  const progressId = useId();
  const feedback = check.verdict ? verdictText(check.verdict, FIX_NAME[v.stop], k) : check.msg ? { ...msgText(check.msg), lead: null as string | null, body: msgText(check.msg).text } : null;
  const canGoOn = nextStop(run) !== null;
  useEffect(() => {
    if (run.visits.length > 1) promptRef.current?.focus({ preventScroll: true });
    // Focus after this bar mounts, once the previous phase's fade has ended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Row
      text={
        <>
          <Prompt promptRef={promptRef} kicker={STOP_LABEL[v.stop]}>
            {guided ? t.question : 'בדיקת מיקום: אוספים שתי ראיות ומשווים לאומדן'}
          </Prompt>
          {check.matched.length > 0 && <p className="mt-1 text-base leading-relaxed text-black">הותאם במפה: <strong>{check.matched.map(signName).join(' · ')}</strong>{check.distance ? ` · נוסף מרחק של כ־${round10(k.counted)} מ׳` : ''}.</p>}
          {check.pending ? (
            <SignSelect label="בחירת הסימן במפה מרשימה" onPick={onListMap} data="map" />
          ) : task.target === 'view' ? (
            <SignSelect label="בחירת סימן בשטח מרשימה" onPick={onListView} data="view" exclude={check.matched} />
          ) : (
            <details className="mt-2 text-base text-black">
              <summary className="cursor-pointer py-2">הוספת סימן נוסף לבדיקה (לבחירה)</summary>
              <SignSelect label="בחירת סימן בשטח מרשימה" onPick={onListView} data="view" exclude={check.matched} />
            </details>
          )}
          <div role="status" aria-live="polite" aria-atomic="true" className="min-h-[1.5rem]" data-check-feedback>
            {feedback && <Feedback tone={feedback.tone === 'info' ? 'info' : feedback.tone} lead={feedback.lead} body={feedback.body} data={check.verdict ? check.verdict.kind : check.msg?.kind} />}
          </div>
        </>
      }
      actions={
        <>
          {task.target === 'distance' && (
            <button type="button" onClick={onDistance} className="btn-primary h-14 gap-2 text-lg" data-action="distance">
              <Footprints className="size-5" aria-hidden />
              הוספת המרחק: כ־{round10(k.counted)} מ׳
            </button>
          )}
          <button type="button" className={cn(canCommit ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed', 'h-14 gap-2 text-lg', task.target === 'distance' && 'hidden')} onClick={onCommit} disabled={!canCommit} aria-describedby={progressId} data-action="commit">
            <MapPin className="size-5" aria-hidden />
            אימות המיקום
          </button>
          <p id={progressId} className="text-base leading-relaxed text-black" data-evidence-progress>
            {check.pending ? 'קודם השלימו את ההתאמה במפה.' : loci.length >= 2 ? `${loci.length} ראיות נאספו. אפשר לבדוק אם הן קובעות מיקום.` : loci.length === 1 ? `נאספה ראיה אחת מתוך שתיים. ${k.counted > 0 ? 'הוסיפו סימן נוסף או מרחק שנספר.' : 'הוסיפו סימן נוסף מהשטח והתאימו אותו במפה.'}` : 'נאספו 0 מתוך 2 ראיות. התחילו מבחירת סימן בשטח.'}
          </p>
          <div className="flex items-center justify-between gap-2">
            {t.help === 'hint' && !hintOn ? (
              <button type="button" onClick={onHint} className={cn('btn-ghost h-9 gap-1.5 px-3 text-[15px]', check.misses >= 2 && 'text-accent')} data-action="hint">
                <Lightbulb className="size-4" aria-hidden />
                רמז
              </button>
            ) : (
              <span />
            )}
            {!guided && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={onCancel} className="btn-ghost h-9 px-3 text-[15px]" data-action="cancel-check">
                  חזרה להחלטה
                </button>
                {canGoOn && check.verdict?.kind === 'partial' && (
                  <button type="button" onClick={onContinue} className="btn-ghost h-9 px-3 text-[15px]" data-action="continue-anyway">
                    ממשיכים בלי מיקום
                  </button>
                )}
              </div>
            )}
          </div>
          {!live && <p className="sr-only">התצוגה החיה אינה זמינה: בחרו את הסימן מהרשימה.</p>}
        </>
      }
    />
  );
}

function FixedBar({ run, promptRef, onContinue }: BarProps & { onContinue: () => void }) {
  useEffect(() => promptRef.current?.focus({ preventScroll: true }), [promptRef]);
  const v = current(run);
  const verdict = v.check?.verdict;
  const text = verdict ? verdictText(verdict, FIX_NAME[v.stop], v.arrival) : null;
  const to = nextStop(run);
  const k = run.know;
  const label = to === 'end' ? 'ממשיכים — לתחקיר' : v.agrees === false ? 'ממשיכים בכיוון המתוקן' : v.stop === 'stream' ? 'יוצאים לקטע הבא' : 'ממשיכים';
  return (
    <Row
      text={
        <>
          <Prompt promptRef={promptRef} kicker={STOP_LABEL[v.stop]}>
            {v.agrees === false ? 'הבדיקה מצאה סטייה' : 'הבדיקה קבעה את המיקום'}
          </Prompt>
          {text && <Feedback tone={text.tone === 'info' ? 'info' : text.tone} lead={text.lead} body={text.body} data="fix" />}
          <Line label="עכשיו:" data="next">
            {to === 'end'
              ? 'הגעתם לחציית דרך העפר, והמיקום אומת. הקטע הבא: אל חורשת האורנים.'
              : `היעד הבא: ${TARGET_NAME[k.target]}, כ־${round10(toTargetM(k))} מ׳${v.agrees === false ? ' — בכיוון החדש שבמפה.' : '.'}`}
          </Line>
        </>
      }
      actions={
        <button type="button" className="btn-primary h-14 gap-2 text-lg" onClick={onContinue} data-action="next">
          <Footprints className="size-5" aria-hidden />
          {label}
        </button>
      }
    />
  );
}

function WalkBar({ run, walk }: { run: RunState; walk: WalkStore }) {
  const skipRef = useRef<HTMLButtonElement>(null);
  const phase = useSyncExternalStore(walk.subscribe, walk.phase, walk.phase);
  const progress = useSyncExternalStore(walk.subscribe, () => Math.round(walk.get().progress * 40) / 40, () => 0);
  useEffect(() => skipRef.current?.focus({ preventScroll: true }), []);
  const w = run.walk!;
  const chord = distW(w.route[0], w.route[w.route.length - 1]);
  const t = progress * progress * (3 - 2 * progress);
  const inWoods = w.from === 'saddle' && w.to === 'woods' && t > 0.3;
  return (
    <Row
      text={
        <div role="status" data-travel-status>
          <h5 className="font-display text-lg font-bold leading-snug text-black">{phase === 'preparing' ? 'מכינים את הקטע הבא…' : WALK_TO[w.to]}</h5>
          <Line label="נספרו:" data="counted-live">
            כ־{round10(run.know.counted + chord * t)} מ׳ מהנקודה המזוהה („{FIX_NAME[run.know.fix.stop]}”). האומדן במפה זז על המסלול המתוכנן, ותחום אי־הוודאות גדל.
          </Line>
          {inWoods && (
            <Line label="בחורש:" tone="event" data="woods">
              עוקפים עצים וסבך. הקו הישר אובד.
            </Line>
          )}
        </div>
      }
      actions={
        <button ref={skipRef} type="button" className="btn-secondary h-12 text-base" onClick={() => walk.skip()} data-skip-walk>
          דלגו להגעה
        </button>
      }
    />
  );
}

function ReviewBar({ run, index, promptRef, onBack }: BarProps & { index: number; onBack: () => void }) {
  const v = run.visits[index];
  const line = visitLine(v, run.visits[index + 1]);
  return (
    <Row
      text={
        <>
          <Prompt promptRef={promptRef} kicker="סקירה">
            {STOP_LABEL[v.stop]}
          </Prompt>
          <Line label="ההחלטה:">{line.chose}.</Line>
          <Line label="הראיה:">{line.evidence}.</Line>
          <Feedback tone={line.tone === 'info' ? 'info' : line.tone} body={line.result} data="review" />
        </>
      }
      actions={
        <>
          <button type="button" className="btn-primary h-12 text-base" onClick={onBack} data-action="back-to-current">
            חזרה לתחנה הנוכחית
          </button>
          <p className="text-[15px] leading-snug text-fg-muted">בסקירה אי אפשר לשנות החלטות. כדי לנסות דרך אחרת — התחלה מחדש.</p>
        </>
      }
    />
  );
}

// ───────────────────────────────────────────── the debrief

const PRINCIPLE_TEXT = {
  woods: 'אחרי מכשול או עקיפה בודקים מיד — כך הסטייה התגלתה כשהייתה קטנה.',
  road: 'דרך עפר שמופיעה מוקדם מהצפוי היא אי־התאמה: היא אומרת רק שהגעתם לדרך, לא באיזו נקודה עליה.',
  beyond: 'המשך מנקודה לא ידועה מגדיל את הטעות. כשהצפוי והנראה לא תואמים — עוצרים ובודקים.',
  saddle: 'האוכף לא אומת, ולכן האומדן אחריו נמדד מחציית הנחל — ממרחק גדול יותר, עם אי־ודאות גדולה יותר.',
  partial: 'בדיקה חלקית — סימן בלי מרחק, או מרחק בלי סימן — לא קבעה מיקום. רק ראיות שנפגשות קובעות.',
  crossing: 'חציית דרך העפר לא אומתה לפני הקטע האחרון, ולכן הוא יצא מאומדן.',
  match: 'כשהצפוי והנראה תאמו, המשכתם — וכשבדקתם בכל זאת, הבדיקה אישרה את האומדן.',
} as const;

function principles(run: RunState): string[] {
  const d = debriefOf(run);
  const out: string[] = [];
  if (d.driftFoundAt) out.push(PRINCIPLE_TEXT[d.driftFoundAt as 'woods' | 'road' | 'beyond']);
  if (!d.saddleVerified) out.push(PRINCIPLE_TEXT.saddle);
  if (d.partials > 0) out.push(PRINCIPLE_TEXT.partial);
  if (!d.crossingVerified) out.push(PRINCIPLE_TEXT.crossing);
  if (out.length < 3) out.push(PRINCIPLE_TEXT.match);
  return out.slice(0, 3);
}

function DebriefPanel({ run }: { run: RunState }) {
  const d = debriefOf(run);
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-bg-elevated px-5 py-3.5" data-panel="debrief" aria-labelledby="replay-debrief-title">
      <h4 id="replay-debrief-title" className="font-display text-xl font-bold leading-tight text-black">
        תחקיר: מה החלטתם, על מה הסתמכתם, ומה קרה
      </h4>
      <div className="mt-2 grid grid-cols-3 gap-3" data-metrics>
        <Metric label="הלכתם בפועל" value={`כ־${round10(d.walkedM)} מ׳`} note={`מתוכנן: כ־${round10(d.plannedM)} מ׳`} />
        <Metric label="בדיקות שקבעו מיקום" value={`${d.fixes.length}`} note={d.partials === 1 ? 'ועוד אחת חלקית' : d.partials ? `ועוד ${d.partials} חלקיות` : 'בלי בדיקות חלקיות'} />
        <Metric label="הסטייה בחורש התגלתה" value={d.driftFoundAt ? STOP_LABEL[d.driftFoundAt] : 'לא התגלתה'} note={d.driftOffsetM ? `כ־${round10(d.driftOffsetM)} מ׳ מהאומדן` : ''} />
      </div>
      <ol className="mt-3 min-h-0 flex-1 divide-y divide-border/60 overflow-hidden text-[15px] leading-snug" data-debrief-lines>
        {run.visits.map((v, i) => {
          const l = visitLine(v, run.visits[i + 1]);
          return (
            <li key={i} className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 py-1.5" data-debrief-stop={v.stop}>
              <span className="font-display font-bold text-black">{STOP_LABEL[v.stop]}</span>
              <span className="text-black">
                <strong className="font-bold">{l.chose}</strong> · {l.evidence} · <span className={l.tone === 'warn' ? 'text-accent' : undefined}>{l.result}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl bg-bg-accent/60 px-3 py-2">
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="font-display text-xl font-bold leading-tight text-black">{value}</p>
      {note && <p className="text-sm text-fg-muted">{note}</p>}
    </div>
  );
}

function DebriefBar({ run, promptRef, onReset }: BarProps & { onReset: () => void }) {
  const scrollToQuestion = () => {
    const q = document.querySelector('[data-tips-screen="question"]') as HTMLElement | null;
    q?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    (q?.querySelector('[data-option]') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  return (
    <Row
      text={
        <div data-summary>
          <Prompt promptRef={promptRef} kicker="תחקיר">
            {debriefHeadline(debriefOf(run))}
          </Prompt>
          <ul className="mt-1.5 space-y-1" data-principles>
            {principles(run).map((p) => (
              <li key={p} className="flex items-start gap-2 text-base leading-snug text-black">
                <Check className="mt-1 size-4 shrink-0 text-brand-dark" strokeWidth={3} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      }
      actions={
        <>
          <button type="button" className="btn-primary h-12 text-base" onClick={scrollToQuestion} data-action="to-question">
            להמשך: שאלת יישום
          </button>
          <button type="button" className="btn-secondary h-12 gap-2 text-base" onClick={onReset} data-action="restart">
            <RotateCcw className="size-4" aria-hidden />
            ניסיון בדרך אחרת
          </button>
        </>
      }
    />
  );
}
