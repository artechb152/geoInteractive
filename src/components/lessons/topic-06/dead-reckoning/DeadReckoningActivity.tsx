'use client';

import { useEffect, useId, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Footprints, Info, RotateCcw, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import { LegendGlyph, type GlyphKind } from '../CombatNavVisuals';
import { RadioRow } from '../terrain-nav/RadioRow';
import { normalizeDegrees } from '../locationCheckGeometry';
import {
  AZIMUTH_DEG,
  DEVIATION_DEG,
  DISTANCE_M,
  HILL,
  INITIAL_STATE,
  OTHER_PACE_M,
  PACE_M,
  PACE_OPTIONS,
  PLANNED_PAIRS,
  SHORT_PACE_M,
  STEP_PAIRS,
  VISIBILITY_M,
  WADI_CROSSING_M,
  deviationGap,
  pairsToMetres,
  reducer,
  shortPaceShortfall,
  view as viewOf,
  type State,
  type VerifyOption,
} from './deadReckoningModel';
import { DeadReckoningMap } from './DeadReckoningMap';
import { DeadReckoningField, FIELD_COUNTER_END, FIELD_W } from './DeadReckoningField';

/**
 * "ניווט עיוור" — the dead-reckoning activity of lesson 6. One card, laid out to
 * fit one laptop screen in every state (≤ 760 px with the closing card under
 * it, at the 1344 px reference): a title row (the technique's title, owned by
 * CombatNavScene, the badge, the stepper and the reset), then the technique's
 * principle, the field view and the planning map side by side with their
 * caption and legend; beside them, at the inline end, the task column — the
 * step's title, its controls and the feedback, which fills the column so the
 * card never changes height. The task has three steps:
 *
 *   1 מתכננים   how many pace pairs is 1,200 m at the example's 1.5 m pace?
 *               The learner computes it: until it is checked right, nothing on
 *               the card shows the count (view().countKnown) — the right check
 *               switches on the counter, the map's ticks and the copy that
 *               carries it.
 *   2 מתקדמים   set the compass to 62° (the map's arrow turns with it), then
 *               count in hundreds; map and field move from one distance value
 *   3 מאמתים    the count is complete — what does it prove? The right answer
 *               opens the explanation: a 3° error drawn to scale, the short
 *               pace, and the landmark to verify against.
 *
 * Every wrong answer says what went wrong and stays open for another try;
 * "התחלה מחדש" resets the whole task.
 */

/** The technique's approved board copy, owned by CombatNavScene (SUPPORT.dead). */
export type DeadReckoningCopy = {
  readonly badge?: string;
  readonly caption: string;
  /** `labelBeforeCount` stands in for a label that gives the count, until step 1 is checked right. */
  readonly legend: readonly { readonly kind: GlyphKind; readonly label: string; readonly labelBeforeCount?: string }[];
};

const n = (v: number) => v.toLocaleString('en-US');
const Deg = ({ v }: { v: number }) => (
  <bdi dir="ltr" className="tabular-nums">
    {`${v}°`}
  </bdi>
);
const roundM = (v: number) => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));

/** Width of the task column (reference px); the two views share the rest of the card. */
const TASK_W = 340;

const STEP_LABEL = ['מתכננים', 'מתקדמים', 'מאמתים'] as const;
const VERIFY_LABEL: Record<VerifyOption, string> = {
  proof: 'הגענו ל־B: הספירה הושלמה.',
  estimate: 'אנחנו באזור B לפי האומדן, וצריך לאמת את המיקום.',
  'keep-walking': 'ממשיכים באותו כיוון עד שרואים את B.',
};

export function DeadReckoningActivity({
  copy,
  title: techniqueTitle,
  intro,
  footer,
}: {
  copy: DeadReckoningCopy;
  /** The technique's title (its h3), at the inline start of the title row. */
  title?: ReactNode;
  /** The technique's principle, over the two views (it spans their width, not the task column's). */
  intro?: ReactNode;
  /** Rendered under the task; told whether the count is known, so copy that gives it can wait for step 1. */
  footer?: (countKnown: boolean) => ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const v = viewOf(state);
  // Bumped by every restart, so focus returns to step 1 even when the restart is made in step 1.
  const [round, setRound] = useState(0);
  const restart = () => {
    dispatch({ type: 'restart' });
    setRound((r) => r + 1);
  };
  const reduce = !!useReducedMotion();
  const uid = useId();
  const titleId = `${uid}-title`;

  // One distance value drives the map's estimate and the field view: they cannot drift apart.
  const distM = useMotionValue(0);
  useEffect(() => {
    const target = pairsToMetres(state.pairs);
    if (reduce || target <= distM.get()) {
      distM.jump(target);
      return;
    }
    const c = animate(distM, target, { duration: 0.9, ease: [0.45, 0, 0.55, 1] });
    return () => c.stop();
  }, [state.pairs, reduce, distM]);

  // Dev-only handle for scripts/qa/shot-dead-reckoning.mjs.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __dr?: unknown };
    w.__dr = { state, distM: distM.get() };
    return () => {
      delete w.__dr;
    };
  }, [state, distM]);

  // A new step, or a restart, moves keyboard focus to the step's first control (the old one is gone or disabled).
  const stripRef = useRef<HTMLDivElement>(null);
  const stepKey = `${round}:${state.step}:${v.done}`;
  // Compared with the last key rather than a "first render" flag: StrictMode re-runs the
  // mount effect, and a flag then focused (and ringed) the first pace option, 800, on arrival.
  const lastStepKey = useRef(stepKey);
  useEffect(() => {
    if (lastStepKey.current === stepKey) return;
    lastStepKey.current = stepKey;
    const el = stripRef.current?.querySelector<HTMLElement>('[data-autofocus], [role="radio"][tabindex="0"], [role="slider"], button:not([disabled])');
    el?.focus({ preventScroll: true });
  }, [stepKey]);

  const atStart = state.step === 'plan' || state.step === 'heading';
  const fieldNote = atStart
    ? 'צומת הדרכים A — נקודת מוצא מזוהה'
    : v.atWadi
      ? 'ערוץ יבש — סימן שאפשר להשוות למפה'
      : v.counted
        ? 'חול בלבד — אין סימן מזוהה בטווח הראייה'
        : 'חול בלבד — אין סימן בטווח הראייה';
  const title =
    state.step === 'plan'
      ? 'מתכננים: כמה צעדים כפולים עד B?'
      : state.step === 'heading'
        ? 'מכוונים את המצפן'
        : state.step === 'walk'
          ? 'מתקדמים וסופרים'
          : v.done
            ? 'סיום: נדרש אימות'
            : 'מאמתים: מה הספירה מוכיחה?';

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="dead-reckoning" data-step={state.step} data-done={v.done || undefined} aria-labelledby={titleId}>
      {/* Title row: the technique, the conditions, the task's progress and the reset */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
          {techniqueTitle}
          {copy.badge && <StatusChip tone="badge">{copy.badge}</StatusChip>}
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <Stepper current={v.stepNumber} done={v.done} />
          <Button variant="secondary" size="sm" onClick={restart} disabled={state === INITIAL_STATE}>
            <RotateCcw className="size-4" aria-hidden />
            התחלה מחדש
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-x-6" style={{ gridTemplateColumns: `minmax(0, 1fr) ${TASK_W}px` }}>
        <div className="min-w-0">
          {intro}

          {/* The two views: what you see (inline start) and the planning map, at one height */}
          <div className={cn('grid gap-4', intro && 'mt-3.5')} style={{ gridTemplateColumns: `${FIELD_W}px minmax(0, 1fr)` }}>
            <div className="relative overflow-hidden rounded-xl border border-border/70 bg-paper-bright" data-panel="dr-field">
              <DeadReckoningField
                distM={distM}
                heading={state.step === 'plan' ? null : state.step === 'heading' ? state.heading : AZIMUTH_DEG}
                target={v.countKnown ? PLANNED_PAIRS : null}
                label={`בשטח, מבט מלמעלה סביב המנווט: ${fieldNote}. סופת חול — רואים רק כ־${VISIBILITY_M} מ׳ סביבכם.`}
                className="absolute inset-0 h-full w-full"
              />
              <span className="absolute start-3 top-3 rounded-lg bg-paper-bright/95 px-2.5 py-1 font-display text-base font-bold text-black shadow-sm">בשטח: מה שרואים סביבכם</span>
              {/* Beside the pace counter (bottom, inline end): two lines at most */}
              <span className="absolute bottom-3 start-3 rounded-lg bg-paper-bright/95 px-2.5 py-1 font-display text-base font-semibold leading-snug text-black shadow-sm" style={{ maxWidth: FIELD_W - FIELD_COUNTER_END - 22 }} data-field-note>
                {fieldNote}
              </span>
            </div>
            <div className="relative aspect-[14/9] overflow-hidden rounded-xl border border-border/70 bg-white" data-panel="dr-map">
              <DeadReckoningMap
                distM={distM}
                heading={state.heading}
                showTicks={v.countKnown}
                showHeading={state.step === 'heading'}
                showDeviation={v.done}
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>

          {/* Caption and legend, under the views they describe */}
          <div className="mt-3" data-legend="dead-reckoning">
            <p className="text-base leading-relaxed text-black">{copy.caption}</p>
            <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
              {copy.legend.map((it) => (
                <li key={it.label} className="flex items-center gap-2 text-base leading-snug text-black">
                  <LegendGlyph kind={it.kind} />
                  <span>{!v.countKnown && it.labelBeforeCount ? it.labelBeforeCount : it.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The task column: the step, its instruction and controls, then the feedback, which fills the rest */}
        <div ref={stripRef} className="flex min-w-0 flex-col" data-dr-strip={state.step}>
          <h4 id={titleId} className="font-display text-lg font-bold leading-snug text-black md:text-xl" aria-live="polite">
            {title}
          </h4>
          <div className="mt-2.5">
            <StepControls state={state} dispatch={dispatch} onRestart={restart} />
          </div>
          <Feedback state={state} />
        </div>
      </div>

      {footer?.(v.countKnown)}
    </div>
  );
}

// ---------------------------------------------------------------- progress

function Stepper({ current, done }: { current: 1 | 2 | 3; done: boolean }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="שלבי המשימה" data-stepper={done ? 'done' : current}>
      {STEP_LABEL.map((label, i) => {
        const k = i + 1;
        const complete = k < current || (k === current && done);
        const now = k === current && !done;
        return (
          <li key={label} className="flex items-center gap-1.5" aria-current={now ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={cn('h-0.5 w-4 rounded', k <= current ? 'bg-accent' : 'bg-border')} />}
            <span className={cn('flex size-6 items-center justify-center rounded-full border-2 font-display text-sm font-bold', complete ? 'border-accent bg-accent text-white' : now ? 'border-accent bg-white text-black' : 'border-border bg-white text-black')}>
              {complete ? <Check className="size-3.5" strokeWidth={3.5} aria-hidden /> : k}
            </span>
            <span className={cn('font-display text-base', now ? 'font-bold text-black' : 'font-semibold text-fg-muted')}>
              {label}
              <span className="sr-only">{complete ? ' — הושלם' : now ? ' — השלב הנוכחי' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- the step's controls

type Dispatch = (a: Parameters<typeof reducer>[1]) => void;

function StepControls({ state, dispatch, onRestart }: { state: State; dispatch: Dispatch; onRestart: () => void }) {
  const v = viewOf(state);
  const uid = useId();
  if (state.step === 'plan') {
    return (
      <div data-controls="plan">
        <p className="text-base leading-relaxed text-black">
          מ־A ל־B: אזימוט <Deg v={AZIMUTH_DEG} />, מרחק {n(DISTANCE_M)} מ׳. לפי מדידה אישית, הצעד הכפול שלכם באורך {PACE_M} מ׳ (הנחת הדוגמה).
        </p>
        <div id={`${uid}-q`} className="mt-2 mb-1.5 font-display text-base font-bold text-black">
          כמה צעדים כפולים תספרו?
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RadioRow
            labelledBy={`${uid}-q`}
            options={PACE_OPTIONS.map((p) => ({ id: p, label: n(p) }))}
            value={state.pace}
            disabled={v.pace === 'right'}
            onChange={(value) => dispatch({ type: 'choosePace', value })}
            data="pace"
          />
          {v.pace === 'right' ? (
            <Button variant="primary" size="md" onClick={() => dispatch({ type: 'toHeading' })} className="ms-auto">
              המשך: כיוון התנועה
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={() => dispatch({ type: 'checkPace' })} disabled={state.pace === null} className="ms-auto">
              בדיקה
            </Button>
          )}
        </div>
      </div>
    );
  }
  if (state.step === 'heading') {
    return (
      <div data-controls="heading">
        <p className="text-base leading-relaxed text-black">
          סובבו את המצפן לאזימוט <Deg v={AZIMUTH_DEG} />: הוא נמדד מהצפון, עם כיוון השעון. החץ הכהה במפה מראה לאן תלכו.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CompassControl value={state.heading} onSet={(value) => dispatch({ type: 'setHeading', value })} onTurn={(by) => dispatch({ type: 'turn', by })} />
          <Button variant="primary" size="md" onClick={() => dispatch({ type: 'depart' })} className="ms-auto">
            יציאה לדרך
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }
  if (state.step === 'walk') {
    return (
      <div data-controls="walk">
        <p className="text-base leading-relaxed text-black">
          כל לחיצה: {STEP_PAIRS} צעדים כפולים = {n(pairsToMetres(STEP_PAIRS))} מ׳, באזימוט <Deg v={AZIMUTH_DEG} />. עקבו אחרי הספירה במפה ובשטח.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button variant="primary" size="md" onClick={() => dispatch({ type: 'advance' })}>
            <Footprints className="size-4" aria-hidden />
            {`עוד ${STEP_PAIRS} צעדים כפולים`}
          </Button>
          <p className="font-display text-base font-semibold text-black" data-count={state.pairs}>
            נספרו <bdi className="tabular-nums">{n(state.pairs)}</bdi> מתוך {n(PLANNED_PAIRS)} · כ־{n(v.metres)} מ׳ מ־A
          </p>
        </div>
      </div>
    );
  }
  // verify
  if (v.done) {
    return (
      <div data-controls="done">
        <p className="text-base leading-relaxed text-black">סיימתם את הספירה והגעתם לאומדן של B. כדי לאשר שזה B, צריך סימן שטח מזוהה, או כיוון ומרחק אליו.</p>
        <Button variant="secondary" size="md" onClick={onRestart} className="mt-3" data-autofocus>
          <RotateCcw className="size-4" aria-hidden />
          התחלה מחדש
        </Button>
      </div>
    );
  }
  return (
    <div data-controls="verify">
      <div id={`${uid}-q`} className="mb-2 text-base leading-relaxed text-black">
        <span className="font-display font-bold">ספרתם {n(PLANNED_PAIRS)} צעדים כפולים באזימוט <Deg v={AZIMUTH_DEG} />. סביבכם רק חול. מה אפשר לקבוע?</span>
      </div>
      <RadioRow
        labelledBy={`${uid}-q`}
        options={(['proof', 'estimate', 'keep-walking'] as const).map((id) => ({ id, label: VERIFY_LABEL[id] }))}
        value={state.verify}
        onChange={(value) => dispatch({ type: 'chooseVerify', value })}
        stacked
        data="verify"
      />
      <div className="mt-3 flex justify-end">
        <Button variant="primary" size="md" onClick={() => dispatch({ type: 'checkVerify' })} disabled={state.verify === null}>
          בדיקה
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the compass

const TURNS = [
  { by: -10, label: '10°', aria: 'סיבוב של 10° נגד כיוון השעון', Icon: RotateCcw },
  { by: -1, label: '1°', aria: 'סיבוב של 1° נגד כיוון השעון', Icon: RotateCcw },
  { by: 1, label: '1°', aria: 'סיבוב של 1° עם כיוון השעון', Icon: RotateCw },
  { by: 10, label: '10°', aria: 'סיבוב של 10° עם כיוון השעון', Icon: RotateCw },
] as const;

/** A compass dial (drag, click or arrow keys) with fine-turn buttons; clockwise from north, as an azimuth is read. */
function CompassControl({ value, onSet, onTurn }: { value: number; onSet: (deg: number) => void; onTurn: (by: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const fromPointer = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.08) return;
    onSet(Math.round(normalizeDegrees((Math.atan2(dx, -dy) * 180) / Math.PI)) % 360);
  };
  const onKey = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (by !== undefined) onTurn(by);
    else if (e.key === 'Home') onSet(0);
    else return;
    e.preventDefault();
  };
  const rad = (value * Math.PI) / 180;
  const tip = { x: Math.sin(rad) * 44, y: -Math.cos(rad) * 44 };
  const arc = { x: Math.sin(rad) * 30, y: -Math.cos(rad) * 30 };
  return (
    <div className="flex items-center gap-3.5" data-compass>
      <svg
        ref={ref}
        viewBox="-60 -60 120 120"
        className="size-[124px] shrink-0 cursor-pointer touch-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="slider"
        tabIndex={0}
        aria-label="כיוון המצפן (אזימוט)"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={value}
        aria-valuetext={`${value} מעלות`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={onKey}
      >
        <circle r={57} className="fill-paper-bright stroke-border" strokeWidth={2} />
        {value > 0 && <path d={`M0 0L0 -30A30 30 0 ${value > 180 ? 1 : 0} 1 ${arc.x.toFixed(2)} ${arc.y.toFixed(2)}Z`} className="fill-accent" fillOpacity={0.18} />}
        {Array.from({ length: 36 }, (_, k) => {
          const a = (k * 10 * Math.PI) / 180;
          const r0 = k % 9 === 0 ? 46 : k % 3 === 0 ? 49 : 51;
          return <line key={k} x1={Math.sin(a) * r0} y1={-Math.cos(a) * r0} x2={Math.sin(a) * 55} y2={-Math.cos(a) * 55} className="stroke-fg-muted" strokeWidth={k % 3 === 0 ? 1.6 : 0.9} />;
        })}
        <text x={0} y={-35} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} className="fill-fg font-display">
          צ
        </text>
        {[90, 180, 270].map((d) => (
          <text key={d} x={Math.sin((d * Math.PI) / 180) * 35} y={-Math.cos((d * Math.PI) / 180) * 35} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} direction="ltr" className="fill-fg-muted font-display tabular-nums">
            {d}
          </text>
        ))}
        <line x1={0} y1={0} x2={tip.x.toFixed(2)} y2={tip.y.toFixed(2)} className="stroke-accent" strokeWidth={3.5} strokeLinecap="round" />
        <polygon points="0,-52 6,-40 -6,-40" className="fill-accent" transform={`rotate(${value})`} />
        <circle r={4} className="fill-fg" />
      </svg>
      <div>
        <div className="font-display text-3xl font-bold leading-none text-black tabular-nums" dir="ltr" data-heading-readout>
          {`${value}°`}
        </div>
        {/* Two by two, to fit the task column: counter-clockwise on top, clockwise below */}
        <div dir="ltr" className="mt-2.5 grid grid-cols-2 gap-1.5">
          {TURNS.map((t) => (
            <button
              key={t.by}
              type="button"
              aria-label={t.aria}
              title={t.aria}
              onClick={() => onTurn(t.by)}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-1 rounded-xl border border-border bg-bg-elevated px-2.5 font-display text-base font-semibold text-black transition-colors duration-200 ease-snap hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <t.Icon className="size-4" aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- feedback

type Tone = 'info' | 'wrong' | 'right';

function Feedback({ state }: { state: State }) {
  const v = viewOf(state);
  let tone: Tone = 'info';
  let title: ReactNode = null;
  let lines: ReactNode[] = [];
  let kind = 'info';

  if (state.step === 'plan') {
    if (v.pace === 'right') {
      tone = 'right';
      kind = 'pace-right';
      title = (
        <>
          נכון: {n(DISTANCE_M)} ÷ {PACE_M} = {n(PLANNED_PAIRS)} צעדים כפולים.
        </>
      );
      lines = [`המספר נכון לצעד שנמדד בדוגמה (${PACE_M} מ׳). מי שהצעד הכפול שלו ${OTHER_PACE_M} מ׳ יספור ${n(DISTANCE_M / OTHER_PACE_M)}, ולכן כל מנווט מודד את הצעד שלו.`];
    } else if (v.pace) {
      tone = 'wrong';
      kind = `pace-${v.pace}`;
      if (v.pace === 'multiplied') {
        title = `${n(DISTANCE_M * PACE_M)} מתקבל מ־${n(DISTANCE_M)} × ${PACE_M}: הכפלתם.`;
        lines = ['צעד כפול ארוך ממטר, ולכן יש פחות צעדים מאשר מטרים. חלקו את המרחק באורך הצעד הכפול.'];
      } else if (v.pace === 'single-steps') {
        title = `${n(PLANNED_PAIRS * 2)} הוא מספר הצעדים הבודדים.`;
        lines = [`צעד כפול הוא שני צעדים, וסופרים אותו פעם אחת. חלקו את המרחק באורך הצעד הכפול (${PACE_M} מ׳).`];
      } else {
        title = `${n(DISTANCE_M)} הוא המרחק במטרים, לא מספר הצעדים.`;
        lines = [`כל צעד כפול שלכם מכסה ${PACE_M} מ׳. חלקו את המרחק באורך הצעד הכפול.`];
      }
    } else {
      title = 'בחרו תשובה ולחצו ״בדיקה״.';
    }
  } else if (state.step === 'heading') {
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
          סובבו עוד <Deg v={Math.abs(h.turnDeg)} /> {h.turnDeg > 0 ? 'עם כיוון השעון' : 'נגד כיוון השעון'}. בכיוון הזה הייתם מסיימים כ־{n(roundM(h.endGapM))} מ׳ מ־B.
        </>,
      ].filter(Boolean);
    } else {
      kind = 'heading-live';
      title = (
        <>
          המצפן מכוון ל־<Deg v={state.heading} />.
        </>
      );
      lines = [
        <>
          החץ הכהה במפה יוצא מ־A בכיוון הזה. הקו המקווקו הוא התכנון: <Deg v={AZIMUTH_DEG} />.
        </>,
      ];
    }
  } else if (state.step === 'walk') {
    if (state.pairs === 0) {
      tone = 'right';
      kind = 'departed';
      title = (
        <>
          המצפן מכוון ל־<Deg v={AZIMUTH_DEG} />: יוצאים מ־A.
        </>
      );
      lines = ['הסמן במפה הוא אומדן לפי הספירה, לא מיקום שנבדק.'];
    } else if (v.atWadi) {
      kind = 'wadi';
      title = 'בדיקה בדרך: חציתם ערוץ יבש.';
      lines = [`במפה הערוץ חוצה את הציר ${n(WADI_CROSSING_M)} מ׳ מ־A, בדיוק לפי הספירה (${n(state.pairs)} צעדים כפולים). ערוץ שחוצה את הציר מאשר את המרחק שעברתם, לא סטייה לצדדים.`];
    } else {
      kind = 'walking';
      title = (
        <>
          {n(state.pairs)} צעדים כפולים × {PACE_M} מ׳ = {n(v.metres)} מ׳ מ־A, באזימוט <Deg v={AZIMUTH_DEG} />.
        </>
      );
      lines = [`במפה הסמן מתקדם לאורך הקו. בשטח רואים רק כ־${VISIBILITY_M} מ׳ סביבכם.`];
    }
  } else if (v.verify === 'right') {
    tone = 'right';
    kind = 'verify-right';
    title = 'נכון: הספירה נותנת אומדן, לא הוכחה.';
    lines = [
      <>
        שגיאות מצטברות: סטייה של {DEVIATION_DEG}° בלבד (הקו הכהה במפה) יוצרת פער של כ־{n(roundM(deviationGap(DISTANCE_M / 2)))} מ׳ אחרי {n(DISTANCE_M / 2)} מ׳. בסוף הדרך הפער כ־{n(roundM(deviationGap(DISTANCE_M)))} מ׳, יותר מטווח הראייה.
      </>,
      `גם צעד כפול של ${SHORT_PACE_M} מ׳ במקום ${PACE_M} מ׳ יעצור אתכם ${n(shortPaceShortfall())} מ׳ לפני B.`,
      `לכן מאמתים מול סימן מזוהה: במפה יש גבעה עם אנטנה ${n(HILL.fromTargetM)} מ׳ צפון־מערבית ל־B. כשהראות משתפרת, בודקים מול הגבעה.`,
    ];
  } else if (v.verify === 'wrong') {
    tone = 'wrong';
    kind = `verify-${state.verify}`;
    if (state.verify === 'proof') {
      title = 'לא בהכרח. הספירה מעריכה כמה הלכתם, לא איפה אתם.';
      lines = [`סטייה קטנה בכיוון או צעד קצר יותר מזיזים את נקודת הסיום, ובראות של כ־${VISIBILITY_M} מ׳ לא תראו את ההבדל.`];
    } else {
      title = 'לא. בלי סימן מזוהה אין דרך לדעת שהגעתם, וגם לא מתי לעצור.';
      lines = ['בסוף הספירה עוצרים באומדן, ומאמתים את המיקום מול סימן מזוהה: כשהראות משתפרת, או בחיפוש זהיר סביב האומדן.'];
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

  const icon = tone === 'right' ? <Check className="mt-0.5 size-5 shrink-0" aria-hidden /> : tone === 'wrong' ? <X className="mt-0.5 size-5 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-5 shrink-0" aria-hidden />;
  return (
    // Announced once per check (keyed by the attempt). It fills the task column, whose height the views set,
    // so no verdict changes the card's height (the column fits the longest one: scripts/qa/shot-dead-reckoning.mjs).
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'mt-3 min-h-0 flex-1 rounded-xl border px-4 py-3',
        tone === 'right' ? 'border-brand bg-brand/10' : tone === 'wrong' ? 'border-accent-hot/60 bg-bg-accent' : 'border-dashed border-border bg-bg-accent/50',
      )}
      data-dr-feedback={kind}
    >
      <div key={`${kind}-${state.attempts}-${state.pairs}`}>
        <div className="flex items-start gap-2 font-display text-base font-bold leading-snug text-black">
          {icon}
          <span>{title}</span>
        </div>
        {lines.length > 0 && (
          <ul className="mt-1.5 space-y-1 text-base leading-snug text-black">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
