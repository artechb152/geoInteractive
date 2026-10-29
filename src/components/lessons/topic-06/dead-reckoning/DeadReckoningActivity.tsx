'use client';

import { useEffect, useId, useMemo, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { Check, Eye, Footprints, Info, Map as MapIcon, RotateCcw, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useLessonViewportScale } from '@/components/lesson/LessonViewportFit';
import { RadioRow } from '../terrain-nav/RadioRow';
import { signedTurn } from '../locationCheckGeometry';
import {
  AZIMUTH_DEG,
  COUNT_MAX,
  DEBRIEF_CASES,
  DEVIATION_DEG,
  DISTANCE_M,
  HILL,
  INITIAL_STATE,
  OTHER_PACE_M,
  PACE_M,
  PLANNED_PAIRS,
  SEGMENT_M,
  SHORT_PACE_M,
  STEP_PAIRS,
  VISIBILITY_M,
  WADI_CROSSING_M,
  WADI_STOP_PAIRS,
  deviationGap,
  pairsToMetres,
  reducer,
  shortPaceShortfall,
  view as viewOf,
  type DebriefCase,
  type SignOption,
  type State,
  type VerifyOption,
} from './deadReckoningModel';
import { DEFAULT_PITCH, LookRig } from './deadReckoningLook';
import { DeadReckoningMap } from './DeadReckoningMap';
import { DeadReckoningView } from './DeadReckoningView';
import { TravelCompass, formatAzimuth } from './TravelCompass';

/**
 * "ניווט עיוור" — the dead-reckoning activity of lesson 6, inside a sandstorm,
 * seen from the navigator's own eyes. One card: the title row (title, short
 * description; the stepper; a quiet reset), the live
 * first-person view with the planning map on demand, a toolbar under it (the
 * compass, the walking direction, the pace counter and the estimate, the
 * advance button), the task panel and one status line.
 *
 *   1 מתכננים   how many pace pairs is 1,200 m at the example's 1.5 m pace?
 *               (typed; each common slip is named), then set the compass to
 *               062° — the view turns with it. Until the count is checked
 *               right, nothing on the card shows it (view().countKnown).
 *   2 מתקדמים   each press walks 100 pairs (150 m): the camera really moves
 *               through the terrain, the counter and the map's estimate follow
 *               the same motion value. At 400 pairs a dry wadi crosses the
 *               way, 15 m ahead: compare it with the map and name it; its
 *               label appears only then, and only while it is in sight.
 *   3 מאמתים    the count is complete — what does it prove? After the
 *               learner's answer, the map debrief: a 3° error and a short
 *               pace drawn to scale, and the landmark to verify against.
 *
 * Rapid presses: a segment is one reducer state (`moving`); presses while it
 * runs are ignored and the button is disabled, so a count can never be
 * doubled or skip the wadi stop. "איפוס" returns everything — count, camera,
 * compass, answers, map — to the opening.
 */

/** The technique's board copy, owned by CombatNavScene. */
export type DeadReckoningCopy = {
  /** The method's principle — the status line once the task is done (earlier it would answer the task's questions). */
  readonly principle: string;
};

const n = (v: number) => v.toLocaleString('en-US');
const Deg = ({ v }: { v: number }) => (
  <bdi dir="ltr" className="tabular-nums">
    {formatAzimuth(v)}
  </bdi>
);
const roundM = (v: number) => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));

/** Reference px. The view's height in the approved composition (1440 × 1122). */
const FRAME_H = 560;
/** Lowest view height on short screens, and what sits above and beside it down to the toolbar's foot (card padding, title row, toolbar). */
const FRAME_MIN = 400;
const CHROME_TO_TOOLBAR = 319;
/** Viewport px the lesson keeps above (site header + gap) and below a screen (LessonFitUniform). */
const VIEWPORT_RESERVE = 104 + 24;

/**
 * The view keeps the mockup's 560 px where the screen has room (1440 × 1122: the whole card fits). On a
 * shorter screen (1920 × 910, a laptop at 125 %) the card cannot fit whole, so the view gives up height,
 * down to 400 px, until the view and the toolbar — what the walk needs — fit one screen together.
 * The lesson fit's scale does not depend on this card's height, so this cannot feed back into it.
 */
function useFrameHeight() {
  const scale = useLessonViewportScale();
  const [vh, setVh] = useState<number | null>(null);
  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  if (vh === null) return FRAME_H;
  const room = (vh - VIEWPORT_RESERVE) / (scale || 1) - CHROME_TO_TOOLBAR;
  return Math.round(Math.min(FRAME_H, Math.max(FRAME_MIN, room)));
}
const COMPASS_PX = 164;
/** One 150 m segment on screen, seconds — a short glide, so counting on never feels like waiting. */
const WALK_S = 1.4;

const STEP_LABEL = ['מתכננים', 'מתקדמים', 'מאמתים'] as const;
const SIGN_LABEL: Record<SignOption, string> = { wadi: 'ערוץ יבש', road: 'דרך עפר', hill: 'גבעה עם אנטנה' };
const VERIFY_LABEL: Record<VerifyOption, string> = {
  proof: 'הגענו ל־B',
  estimate: 'אנחנו באזור B לפי האומדן — צריך לאמת',
  'keep-walking': 'ממשיכים באותו כיוון עד שרואים את B',
};
const DEBRIEF_LABEL: Record<DebriefCase, string> = { deviation: `סטייה של ${DEVIATION_DEG}° בכיוון`, 'short-pace': `צעד כפול של ${SHORT_PACE_M} מ׳` };

export function DeadReckoningActivity({ copy, title, intro }: { copy: DeadReckoningCopy; title?: ReactNode; intro?: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const v = viewOf(state);
  const reduce = !!useReducedMotion();
  const uid = useId();
  // Bumped by every reset, so focus and the view return to the opening even when reset at the opening.
  const [round, setRound] = useState(0);
  const look = useMemo(() => new LookRig(), []);
  const distM = useMotionValue(0);
  const [mapOpen, setMapOpen] = useState(true);
  const mapButtonRef = useRef<HTMLButtonElement>(null);
  const mapCloseRef = useRef<HTMLButtonElement>(null);
  const frameH = useFrameHeight();

  const restart = () => {
    dispatch({ type: 'restart' });
    setRound((r) => r + 1);
    setMapOpen(true);
    look.aim(0, DEFAULT_PITCH, true);
  };

  // ---- the walk: one segment per press, one motion value for the camera, the counter and the map
  useEffect(() => {
    if (!state.moving) {
      const at = pairsToMetres(state.pairs);
      if (Math.abs(distM.get() - at) > 0.01) distM.jump(at);
      return;
    }
    const to = pairsToMetres(state.pairs + STEP_PAIRS);
    look.aim(AZIMUTH_DEG, DEFAULT_PITCH);
    if (reduce) {
      distM.jump(to);
      dispatch({ type: 'arrive' });
      return;
    }
    const c = animate(distM, to, { duration: WALK_S, ease: [0.45, 0, 0.55, 1], onComplete: () => dispatch({ type: 'arrive' }) });
    return () => c.stop();
  }, [state.moving, state.pairs, round, reduce, distM, look]);

  // ---- the head follows the body while the compass is set; the opening faces north, up the dirt road
  useEffect(() => {
    if (v.phase === 'compass') look.aim(state.heading, DEFAULT_PITCH);
  }, [v.phase, state.heading, look]);
  useEffect(() => {
    if (state.step === 'walk' && state.pairs === 0 && !state.moving) look.aim(AZIMUTH_DEG, DEFAULT_PITCH);
  }, [state.step, state.pairs, state.moving, look]);

  // ---- the map: open while planning, closed on the way (the learner opens it when needed), the debrief opens it
  useEffect(() => {
    if (state.step === 'walk' && state.pairs === 0) setMapOpen(false);
  }, [state.step, state.pairs]);
  useEffect(() => {
    if (v.done) setMapOpen(true);
  }, [v.done]);
  const toggleMap = (open: boolean, returnFocus = true) => {
    setMapOpen(open);
    if (open) requestAnimationFrame(() => mapCloseRef.current?.focus({ preventScroll: true }));
    else if (returnFocus) requestAnimationFrame(() => mapButtonRef.current?.focus({ preventScroll: true }));
  };

  // Dev-only handle for scripts/qa/shot-dead-reckoning.mjs.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __dr?: unknown; __drDev?: unknown };
    w.__dr = {
      state,
      distM: distM.get(),
      get look() {
        return { yaw: look.yaw, pitch: look.pitch };
      },
      mapOpen,
    };
    // Camera controls for the visual QA shots (scripts/qa/shot-dead-reckoning.mjs) — never the task's state.
    w.__drDev = { place: (m: number, yaw: number, pitch = DEFAULT_PITCH) => (distM.jump(m), look.aim(yaw, pitch, true)) };
    return () => {
      delete w.__dr;
      delete w.__drDev;
    };
  });

  // A new step or phase moves keyboard focus to its first control, marked data-autofocus wherever it sits
  // (the count field, the compass, the advance button, the landmark's options…); the old one is gone or disabled.
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stepKey = `${round}:${state.step}:${v.phase}:${v.atWadi && v.sign !== 'right'}:${v.counted}:${v.done}`;
  const lastStepKey = useRef(stepKey);
  useEffect(() => {
    if (lastStepKey.current === stepKey) return;
    lastStepKey.current = stepKey;
    const el =
      rootRef.current?.querySelector<HTMLElement>('[data-autofocus]:not([disabled])') ??
      panelRef.current?.querySelector<HTMLElement>('input, [role="radio"][tabindex="0"], button:not([disabled])');
    el?.focus({ preventScroll: true });
  }, [stepKey]);

  const instruction =
    v.phase === 'count'
      ? 'חשבו כמה צעדים כפולים תספרו עד B.'
      : v.phase === 'compass'
        ? 'כוונו את המצפן לאזימוט התכנון: הוא יקבע את כיוון ההליכה.'
        : state.step === 'walk'
          ? v.atWadi && v.sign !== 'right'
            ? 'זיהיתם סימן בשטח? השוו אותו למפת התכנון.'
            : 'שמרו על האזימוט וספרו צעדים. מה אפשר לזהות בדרך?'
          : v.done
            ? 'תחקיר: מה יכול להזיז את נקודת הסיום?'
            : 'הספירה הושלמה. מה ידוע כעת, ומה צריך לאמת?';

  const fallbackLabel = `השטח סביבכם במבט מלמעלה, ${n(Math.round(v.metres))} מ׳ מ־A באזימוט ${AZIMUTH_DEG}°. סופת חול — רואים רק כ־${VISIBILITY_M} מ׳.`;

  return (
    <div ref={rootRef} className="surface-elevated p-8" data-activity="dead-reckoning" data-step={state.step} data-phase={v.phase ?? undefined} data-pairs={state.pairs} data-moving={state.moving || undefined} data-done={v.done || undefined}>
      {/* Title row: the technique and its conditions; the progress and the instruction; a quiet reset */}
      <div className="grid items-start gap-x-8" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}>
        <div className="min-w-0">
          {title}
          {intro && <div className="mt-1">{intro}</div>}
        </div>
        <div className="flex flex-col items-center pt-1">
          <Stepper current={v.stepNumber} done={v.done} />
          {/* Announced when the step or phase changes; each check and each stop is announced by the feedback */}
          <p className="mt-4 text-center font-display text-lg font-semibold leading-snug text-black" aria-live="polite" data-instruction>
            {instruction}
          </p>
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={restart} disabled={state === INITIAL_STATE} className="text-base text-black">
            <RotateCcw className="size-[18px]" aria-hidden />
            איפוס
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <DeadReckoningView
          distM={distM}
          look={look}
          walkHeading={v.phase === 'compass' || v.phase === 'count' ? state.heading : AZIMUTH_DEG}
          wadiLabel={v.atWadi && v.wadiKnown}
          reduceMotion={reduce}
          height={frameH}
          fallbackLabel={fallbackLabel}
          countTarget={v.countKnown ? PLANNED_PAIRS : null}
          mapButton={
            <button
              ref={mapButtonRef}
              type="button"
              onClick={() => toggleMap(!mapOpen)}
              aria-expanded={mapOpen}
              aria-controls={`${uid}-map`}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-xl px-4 font-display text-base font-bold text-black shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                mapOpen ? 'bg-paper-bright ring-2 ring-accent/70' : 'bg-paper-bright/95 hover:bg-white',
              )}
              data-map-toggle
            >
              <MapIcon className="size-5" aria-hidden />
              מפת התכנון
            </button>
          }
          mapOpen={mapOpen}
          mapInset={mapWidth(frameH) + 24 + 12}
          mapPanel={
            mapOpen && (
              <MapPanel
                id={`${uid}-map`}
                frameH={frameH}
                state={state}
                distM={distM}
                closeRef={mapCloseRef}
                onClose={() => toggleMap(false)}
                onDebrief={(value) => dispatch({ type: 'setDebrief', value })}
              />
            )
          }
        />
      </div>

      <Toolbar state={state} look={look} distM={distM} dispatch={dispatch} />

      <div ref={panelRef} className="mt-4" data-dr-panel={v.phase ?? state.step}>
        <TaskPanel state={state} dispatch={dispatch} onOpenMap={() => toggleMap(true)} />
      </div>

      <p className="mt-4 border-t border-border pt-3.5 text-center text-base leading-snug text-black" data-status-line>
        {v.done ? (
          <>
            <span className="font-display font-bold">עקרון הפעולה: </span>
            {copy.principle}
          </>
        ) : state.step === 'plan' ? `נקודת המוצא: צומת דרכי עפר (A). היעד B: ${n(DISTANCE_M)} מ׳ באזימוט ${formatAzimuth(AZIMUTH_DEG)}.` : `כל התקדמות: ${STEP_PAIRS} צעדים כפולים = ${n(SEGMENT_M)} מ׳, באזימוט ${formatAzimuth(AZIMUTH_DEG)}.`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- progress

function Stepper({ current, done }: { current: 1 | 2 | 3; done: boolean }) {
  return (
    <ol className="flex items-center" aria-label="שלבי המשימה" data-stepper={done ? 'done' : current}>
      {STEP_LABEL.map((label, i) => {
        const k = i + 1;
        const complete = k < current || (k === current && done);
        const now = k === current && !done;
        return (
          <li key={label} className="flex items-center" aria-current={now ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={cn('mx-3 h-px w-16', k <= current ? 'bg-fg-dim' : 'bg-border')} />}
            <span className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full font-display text-base font-bold',
                  complete ? 'bg-pine text-white' : now ? 'bg-accent text-white shadow-cta-ember' : 'border border-border bg-bg-accent text-black',
                )}
              >
                {complete ? <Check className="size-5" strokeWidth={3} aria-hidden /> : k}
              </span>
              <span className={cn('font-display text-base', now ? 'font-bold text-accent' : 'font-semibold text-black')}>
                {label}
                <span className="sr-only">{complete ? ' — הושלם' : now ? ' — השלב הנוכחי' : ''}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- the toolbar under the view

type Dispatch = (a: Parameters<typeof reducer>[1]) => void;

const TURNS = [
  { by: -10, label: '10°', aria: 'סיבוב של 10° נגד כיוון השעון', Icon: RotateCcw },
  { by: -1, label: '1°', aria: 'סיבוב של 1° נגד כיוון השעון', Icon: RotateCcw },
  { by: 1, label: '1°', aria: 'סיבוב של 1° עם כיוון השעון', Icon: RotateCw },
  { by: 10, label: '10°', aria: 'סיבוב של 10° עם כיוון השעון', Icon: RotateCw },
] as const;

function Toolbar({ state, look, distM, dispatch }: { state: State; look: LookRig; distM: MotionValue<number>; dispatch: Dispatch }) {
  const v = viewOf(state);
  const setting = v.phase === 'compass';
  const travel = v.phase ? state.heading : AZIMUTH_DEG;
  const live = useTransform(distM, (d) => n(Math.round(d / PACE_M)));
  const metres = useTransform(distM, (d) => `כ־${n(Math.round(d))} מ׳ לפי הספירה`);
  const pct = useTransform(distM, (d) => `${Math.round((100 * d) / DISTANCE_M)}%`);
  const advance =
    state.step === 'plan' ? (
      <Button variant="primary" size="lg" className="min-w-[17rem] rounded-full" onClick={() => dispatch({ type: 'depart' })} disabled={!setting} data-advance="depart">
        <Footprints className="size-5" aria-hidden />
        יציאה לדרך
      </Button>
    ) : state.step === 'walk' ? (
      <Button variant="primary" size="lg" className={cn('min-w-[17rem] rounded-full', state.moving && 'cursor-progress opacity-70')} onClick={() => dispatch({ type: 'advance' })} disabled={!v.canAdvance && !state.moving} aria-disabled={state.moving || undefined} data-advance="walk" data-autofocus={!v.atWadi || v.sign === 'right' ? '' : undefined}>
        <Footprints className="size-5" aria-hidden />
        {/* While a segment runs the button keeps its focus (a disabled button would drop it) and presses are ignored. */}
        {state.moving ? 'מתקדמים…' : `התקדמות: ${STEP_PAIRS} צעדים כפולים`}
      </Button>
    ) : (
      <Button variant="primary" size="lg" className="min-w-[17rem] rounded-full" disabled data-advance="counted">
        <Check className="size-5" aria-hidden />
        הספירה הושלמה
      </Button>
    );
  return (
    <div className="mt-3 flex items-center gap-7 px-2" data-dr-toolbar>
      {/* The compass and the walking direction */}
      <div className="flex items-center gap-5">
        <TravelCompass
          look={look}
          travel={travel}
          size={COMPASS_PX}
          onTurn={setting ? (by) => dispatch({ type: 'turn', by }) : undefined}
          onSet={setting ? (value) => dispatch({ type: 'setHeading', value }) : undefined}
        />
        <div className="min-w-[10.5rem]">
          <div className="font-display text-base font-bold text-black">כיוון התנועה</div>
          <div className="font-display text-[42px] font-bold leading-tight text-black tabular-nums" dir="ltr" data-heading-readout>
            {formatAzimuth(travel)}
          </div>
          {setting ? (
            <div dir="ltr" className="mt-1 grid grid-cols-4 gap-1" data-turns>
              {TURNS.map((t) => (
                <button
                  key={t.by}
                  type="button"
                  aria-label={t.aria}
                  title={t.aria}
                  onClick={() => dispatch({ type: 'turn', by: t.by })}
                  className="inline-flex h-9 cursor-pointer items-center justify-center gap-0.5 rounded-lg border border-border bg-bg-elevated px-1.5 font-display text-base font-semibold text-black transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <t.Icon className="size-3.5" aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <ViewReadout look={look} travel={travel} />
          )}
        </div>
      </div>

      <span aria-hidden className="h-24 w-px bg-border" />

      {/* The pace count and what it gives */}
      <div className="flex min-w-0 flex-1 flex-col items-center" data-counter>
        <div className="font-display font-bold leading-none text-black tabular-nums" dir="ltr">
          <span className="text-[40px]">
            {state.moving ? <motion.span>{live}</motion.span> : n(state.pairs)}
          </span>
          <span className="text-[40px] text-fg-dim">{' / '}</span>
          <span className="text-[40px]" data-count-target>
            {v.countKnown ? n(PLANNED_PAIRS) : '?'}
          </span>
        </div>
        <div className="mt-1 font-display text-base font-bold text-black">צעדים כפולים</div>
        <div className="text-base text-black">{state.moving ? <motion.span>{metres}</motion.span> : `כ־${n(v.metres)} מ׳ לפי הספירה`}</div>
        {/* Fills from the inline start (right), as the course's own progress bars do */}
        <div className="mt-2 flex w-full max-w-[19rem] items-center gap-3">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border/70">
            <motion.div className="absolute inset-y-0 start-0 rounded-full bg-accent" style={{ width: pct }} />
          </div>
          <motion.span dir="ltr" className="w-12 text-start text-base font-semibold text-black tabular-nums">
            {pct}
          </motion.span>
        </div>
      </div>

      <span aria-hidden className="h-24 w-px bg-border" />

      <div className="flex shrink-0 justify-end">{advance}</div>
    </div>
  );
}

/** Under the walking direction: where the head points, when it is turned away from it. */
function ViewReadout({ look, travel }: { look: LookRig; travel: number }) {
  const yaw = useSyncExternalStore(
    (fn) => look.subscribe(fn),
    () => Math.round(look.yaw) % 360,
    () => travel,
  );
  const off = Math.abs(signedTurn(travel, yaw)) > 3;
  return (
    <div className={cn('mt-1 font-display text-base font-semibold text-black transition-opacity', off ? 'opacity-100' : 'opacity-0')} aria-hidden={!off} data-view-readout>
      כיוון המבט: <Deg v={yaw} />
    </div>
  );
}

// ---------------------------------------------------------------- the task panel

function TaskPanel({ state, dispatch, onOpenMap }: { state: State; dispatch: Dispatch; onOpenMap: () => void }) {
  const v = viewOf(state);
  const uid = useId();
  const [text, setText] = useState('');
  useEffect(() => {
    if (state.count === null && state.countChecked === null) setText('');
  }, [state.count, state.countChecked]);

  let body: ReactNode;
  if (v.phase === 'count') {
    body = (
      <form
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'checkCount' });
        }}
        data-controls="count"
      >
        <label htmlFor={`${uid}-count`} className="font-display text-base font-bold text-black">
          {`מרחק ${n(DISTANCE_M)} מ׳, צעד כפול ${PACE_M} מ׳ (מדידה אישית). כמה צעדים כפולים תספרו?`}
        </label>
        <input
          id={`${uid}-count`}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d]/g, '').slice(0, String(COUNT_MAX).length);
            setText(t);
            dispatch({ type: 'setCount', value: t === '' ? null : Number(t) });
          }}
          data-autofocus
          className="h-11 w-28 rounded-xl border border-fg-dim/60 bg-white px-3 text-center font-display text-lg font-bold text-black tabular-nums focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-describedby={`${uid}-fb`}
          data-count-input
        />
        <Button type="submit" variant="primary" size="md" disabled={state.count === null || !!v.count}>
          בדיקה
        </Button>
      </form>
    );
  } else if (v.phase === 'compass') {
    body = (
      <div className="font-display text-base font-bold text-black" data-controls="compass">
        {`סובבו את המצפן (גרירה, חיצים או הכפתורים) לאזימוט `}
        <Deg v={AZIMUTH_DEG} />
        {`, ואז „יציאה לדרך”. האזימוט נמדד מהצפון, עם כיוון השעון.`}
      </div>
    );
  } else if (state.step === 'walk' && v.atWadi && v.sign !== 'right') {
    body = (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-controls="sign">
        <span id={`${uid}-q`} className="font-display text-base font-bold text-black">
          משהו חוצה את הדרך לפניכם. מה זה, לפי המפה?
        </span>
        <RadioRow labelledBy={`${uid}-q`} options={(['wadi', 'road', 'hill'] as const).map((id) => ({ id, label: SIGN_LABEL[id] }))} value={state.sign} onChange={(value) => dispatch({ type: 'chooseSign', value })} data="sign" />
        <Button variant="primary" size="md" onClick={() => dispatch({ type: 'checkSign' })} disabled={state.sign === null || !!v.sign}>
          בדיקה
        </Button>
        <Button variant="secondary" size="md" onClick={onOpenMap} className="ms-auto border-accent text-accent" data-compare-map>
          <MapIcon className="size-5" aria-hidden />
          השוואה למפה
        </Button>
      </div>
    );
  } else if (state.step === 'verify' && !v.done) {
    body = (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-controls="verify">
        <span id={`${uid}-q`} className="font-display text-base font-bold text-black">
          {`ספרתם ${n(PLANNED_PAIRS)} צעדים כפולים באזימוט `}
          <Deg v={AZIMUTH_DEG} />
          {'. סביבכם רק חול. מה אפשר לקבוע?'}
        </span>
        <RadioRow labelledBy={`${uid}-q`} options={(['proof', 'estimate', 'keep-walking'] as const).map((id) => ({ id, label: VERIFY_LABEL[id] }))} value={state.verify} onChange={(value) => dispatch({ type: 'chooseVerify', value })} data="verify" />
        <Button variant="primary" size="md" onClick={() => dispatch({ type: 'checkVerify' })} disabled={state.verify === null || !!v.verify} className="ms-auto">
          בדיקה
        </Button>
      </div>
    );
  } else {
    body = null;
  }

  return (
    <div className="rounded-xl border border-border bg-white px-5 py-3.5">
      {body && <div className="mb-2.5">{body}</div>}
      <Feedback state={state} id={`${uid}-fb`} onOpenMap={onOpenMap} />
    </div>
  );
}

// ---------------------------------------------------------------- feedback

type Tone = 'info' | 'wrong' | 'right';

function Feedback({ state, id, onOpenMap }: { state: State; id: string; onOpenMap: () => void }) {
  const v = viewOf(state);
  let tone: Tone = 'info';
  let title: ReactNode = null;
  let lines: ReactNode[] = [];
  let kind = 'info';
  let action: ReactNode = null;

  if (v.phase === 'count') {
    const c = v.count;
    if (c && c !== 'right') {
      tone = 'wrong';
      kind = `count-${c}`;
      if (c === 'multiplied') {
        title = `${n(DISTANCE_M * PACE_M)} מתקבל מ־${n(DISTANCE_M)} × ${PACE_M}: הכפלתם.`;
        lines = ['צעד כפול ארוך ממטר, ולכן יש פחות צעדים ממטרים. חלקו את המרחק באורך הצעד הכפול.'];
      } else if (c === 'single-steps') {
        title = `${n(PLANNED_PAIRS * 2)} הוא מספר הצעדים הבודדים.`;
        lines = [`צעד כפול הוא שני צעדים, וסופרים אותו פעם אחת. חלקו את המרחק באורך הצעד הכפול (${PACE_M} מ׳).`];
      } else if (c === 'metres') {
        title = `${n(DISTANCE_M)} הוא המרחק במטרים, לא מספר הצעדים.`;
        lines = [`כל צעד כפול שלכם מכסה ${PACE_M} מ׳. חלקו את המרחק באורך הצעד הכפול.`];
      } else {
        title = `${n(state.count ?? 0)} אינו מתאים לחישוב.`;
        lines = [`חלקו את המרחק (${n(DISTANCE_M)} מ׳) באורך הצעד הכפול (${PACE_M} מ׳), ונסו שוב.`];
      }
    } else {
      title = 'הקלידו מספר ולחצו ״בדיקה״.';
    }
  } else if (v.phase === 'compass') {
    const h = v.heading;
    if (h && h.kind === 'off') {
      tone = 'wrong';
      kind = 'heading-off';
      title = (
        <>
          <Deg v={state.heading} /> אינו כיוון התכנון (<Deg v={AZIMUTH_DEG} />).
        </>
      );
      const cause =
        h.cause === 'counter-clockwise' ? (
          <>
            <Deg v={360 - AZIMUTH_DEG} /> מתקבל כשמודדים {AZIMUTH_DEG}° נגד כיוון השעון. אזימוט נמדד עם כיוון השעון.
          </>
        ) : h.cause === 'from-east' ? (
          <>
            <Deg v={90 - AZIMUTH_DEG} /> מתקבל כשמודדים {AZIMUTH_DEG}° מהמזרח. אזימוט נמדד מהצפון.
          </>
        ) : h.cause === 'reverse' ? (
          <>
            זה כמעט האזימוט ההפוך (<Deg v={AZIMUTH_DEG + 180} />): מ־B אל A.
          </>
        ) : null;
      lines = [
        cause,
        <>
          סובבו עוד {Math.abs(h.turnDeg)}° {h.turnDeg > 0 ? 'עם כיוון השעון' : 'נגד כיוון השעון'}. בכיוון הזה הייתם מסיימים כ־{n(roundM(h.endGapM))} מ׳ מ־B.
        </>,
      ].filter(Boolean);
    } else {
      tone = 'right';
      kind = 'count-right';
      title = (
        <>
          נכון: {n(DISTANCE_M)} ÷ {PACE_M} = {n(PLANNED_PAIRS)} צעדים כפולים.
        </>
      );
      lines = [`המספר נכון לצעד שנמדד בדוגמה. מי שהצעד הכפול שלו ${OTHER_PACE_M} מ׳ יספור ${n(DISTANCE_M / OTHER_PACE_M)}, ולכן כל מנווט מודד את הצעד שלו.`];
    }
  } else if (state.step === 'walk') {
    if (v.atWadi && v.sign === 'right') {
      tone = 'right';
      kind = 'sign-right';
      title = 'נכון: ערוץ יבש. הספירה והשטח מתיישבים.';
      lines = [
        `במפה הערוץ חוצה את הציר כ־${n(WADI_CROSSING_M)} מ׳ מ־A. לפי הספירה עברתם ${n(v.metres)} מ׳, והערוץ כ־${n(WADI_CROSSING_M - v.metres)} מ׳ לפניכם.`,
        'ערוץ שחוצה את הציר מאמת את המרחק שעברתם, לא שאתם בדיוק על הקו: גם בסטייה קטנה הייתם פוגשים אותו.',
      ];
    } else if (v.atWadi && v.sign === 'wrong') {
      tone = 'wrong';
      kind = `sign-${state.sign}`;
      title = state.sign === 'road' ? 'לא. דרכי העפר במפה נפגשות ב־A ואינן חוצות את הציר בהמשך.' : `לא. הגבעה עם האנטנה נמצאת ליד B, עוד כ־${n(DISTANCE_M - v.metres)} מ׳ לפי הספירה.`;
      lines = ['לפניכם שקע בקרקע עם גדות. מצאו במפה את מה שחוצה את הציר ליד הסמן שלכם.'];
    } else if (v.atWadi) {
      kind = 'sign';
      title = `${n(state.pairs)} צעדים כפולים: כ־${n(v.metres)} מ׳ מ־A.`;
      lines = ['בטווח הראייה מופיע שקע שחוצה את הדרך. השוו אותו למפה ובחרו מה הוא.'];
      action = null;
    } else if (state.moving) {
      kind = 'walking';
      title = 'מתקדמים וסופרים…';
      lines = [`${STEP_PAIRS} צעדים כפולים, באזימוט ${formatAzimuth(AZIMUTH_DEG)}.`];
    } else if (state.pairs === 0) {
      tone = 'right';
      kind = 'departed';
      title = (
        <>
          המצפן מכוון ל־<Deg v={AZIMUTH_DEG} />: יוצאים מ־A.
        </>
      );
      lines = ['בכל התקדמות הספירה עולה ב־100, והאומדן במפה זז איתה. האומדן אינו מיקום שנבדק.'];
    } else {
      kind = state.pairs === WADI_STOP_PAIRS + STEP_PAIRS ? 'past-wadi' : 'walking-stop';
      title = `${n(state.pairs)} צעדים כפולים × ${PACE_M} מ׳ = כ־${n(v.metres)} מ׳ מ־A.`;
      lines = [
        state.pairs === WADI_STOP_PAIRS + STEP_PAIRS
          ? `הערוץ כבר ${n(v.metres - WADI_CROSSING_M)} מ׳ מאחוריכם, מחוץ לטווח הראייה. סביבכם רק חול ואבנים.`
          : `סביבכם רק חול ואבנים: אין סימן מזוהה בטווח הראייה (כ־${VISIBILITY_M} מ׳).`,
      ];
    }
  } else if (v.verify === 'right') {
    tone = 'right';
    kind = 'verify-right';
    title = 'נכון: הספירה נותנת אומדן, לא הוכחה.';
    lines = [
      `סטייה של ${DEVIATION_DEG}° בלבד מזיזה את נקודת הסיום כ־${n(roundM(deviationGap(DISTANCE_M)))} מ׳ מ־B, וצעד כפול של ${SHORT_PACE_M} מ׳ במקום ${PACE_M} עוצר אתכם ${n(shortPaceShortfall())} מ׳ לפניה — הרבה מעבר לטווח הראייה.`,
      `הצעד הבא: מאמתים מול סימן מזוהה — הגבעה עם האנטנה, ${n(HILL.fromTargetM)} מ׳ צפון־מערבית ל־B, כשהראות משתפרת — או בחיפוש זהיר סביב האומדן.`,
    ];
    action = (
      <button type="button" onClick={onOpenMap} className="font-display font-semibold text-black underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">
        לתחקיר במפה
      </button>
    );
  } else if (v.verify === 'wrong') {
    tone = 'wrong';
    kind = `verify-${state.verify}`;
    if (state.verify === 'proof') {
      title = 'לא בהכרח. הספירה מעריכה כמה הלכתם, לא איפה אתם.';
      lines = [`סטייה קטנה בכיוון או צעד קצר יותר מזיזים את נקודת הסיום, ובראות של כ־${VISIBILITY_M} מ׳ לא תראו את ההבדל.`];
    } else {
      title = 'לא. בלי סימן מזוהה אין דרך לדעת שהגעתם, וגם לא מתי לעצור.';
      lines = ['בסוף הספירה עוצרים באומדן, ומאמתים את המיקום מול סימן מזוהה.'];
    }
  } else {
    kind = 'verify';
    title = (
      <>
        {n(PLANNED_PAIRS)} × {PACE_M} מ׳ = {n(DISTANCE_M)} מ׳: הספירה הושלמה.
      </>
    );
    lines = ['בחרו מה אפשר לקבוע, ולחצו ״בדיקה״.'];
  }

  const icon =
    tone === 'right' ? (
      <Check className="mt-0.5 size-5 shrink-0 text-brand-dark" strokeWidth={3} aria-hidden />
    ) : tone === 'wrong' ? (
      <X className="mt-0.5 size-5 shrink-0 text-accent-hot" strokeWidth={3} aria-hidden />
    ) : kind === 'sign' ? (
      <Eye className="mt-0.5 size-5 shrink-0" aria-hidden />
    ) : (
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
    );
  return (
    // Announced once per check or stop (keyed); never per frame.
    <div id={id} role="status" aria-live="polite" aria-atomic="true" data-dr-feedback={kind} data-tone={tone}>
      <div key={`${kind}-${state.attempts}-${state.pairs}`} className="flex items-start gap-2.5">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-bold leading-snug text-black">{title}</div>
          {lines.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-base leading-snug text-black">
              {lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </div>
        {action && <div className="shrink-0 self-center">{action}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the planning map over the view

/** The map's width in the panel: as wide as the view's height allows at the sheet's 14:9, at most 676 px. */
const mapWidth = (frameH: number) => Math.round(Math.min(676, ((frameH - 92) * 14) / 9));

function MapPanel({
  id,
  frameH,
  state,
  distM,
  closeRef,
  onClose,
  onDebrief,
}: {
  id: string;
  frameH: number;
  state: State;
  distM: MotionValue<number>;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onDebrief: (c: DebriefCase) => void;
}) {
  const v = viewOf(state);
  const uid = useId();
  return (
    <div
      id={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${uid}-t`}
      className="absolute end-3 top-3 z-10 rounded-xl bg-white p-3 shadow-[0_10px_30px_rgba(60,45,25,0.28)]"
      style={{ width: mapWidth(frameH) + 24 }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      data-no-look
      data-map-panel
    >
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <h4 id={`${uid}-t`} className="font-display text-lg font-bold text-black">
          מפת התכנון
        </h4>
        {v.done && (
          <div className="flex items-center gap-1.5" role="group" aria-label="תחקיר: מה הזיז את נקודת הסיום">
            {DEBRIEF_CASES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={state.debrief === c}
                onClick={() => onDebrief(c)}
                className={cn(
                  'h-9 rounded-lg px-3 font-display text-base font-bold text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  state.debrief === c ? 'border-2 border-accent bg-accent/10' : 'border border-border bg-white hover:border-accent/60',
                )}
                data-debrief={c}
              >
                {DEBRIEF_LABEL[c]}
              </button>
            ))}
          </div>
        )}
        <button ref={closeRef} type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 font-display text-base font-semibold text-black hover:bg-bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" data-map-close>
          <X className="size-5" aria-hidden />
          סגירה
        </button>
      </div>
      <div className="relative aspect-[14/9] overflow-hidden rounded-lg border border-border/70" data-panel="dr-map">
        <DeadReckoningMap
          distM={distM}
          heading={state.heading}
          showTicks={v.countKnown}
          showHeading={v.phase === 'compass'}
          debrief={v.done ? state.debrief : null}
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
