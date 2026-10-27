'use client';

import { useEffect, useId, useReducer, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Lightbulb, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LessonFitUniform, LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';
import { FOCUS_RING, OPTION_ACTIVE, OPTION_BASE, OPTION_IDLE } from '../scale/controls';
import { PracticeMap, rulerReading, type MarkTone } from './PracticeMap';
import {
  DATUM,
  HEMISPHERE,
  READ_MM,
  SCENARIO_COUNT,
  TASKS,
  ZONE,
  fmtCm,
  fmtInt,
  fmtRatio,
  helpOffer,
  initialState,
  normalise,
  reachable,
  reducer,
  resultOf,
  round10,
  scenario as scenarioOf,
  shownVerdict,
  type Action,
  type FeatureKind,
  type MarkLetter,
  type Result,
  type Scenario,
  type SegmentId,
  type State,
  type TaskId,
  type Verdict,
} from './practiceModel';

/**
 * Lesson 2 › תרגול — "קוראים את המפה". One card: the map at the inline end (left), one task at a
 * time beside it, four steps on the same fictional map:
 *
 *   1 זיהוי    choose the marked element that is relief, not cover
 *   2 תלילות   two segments with the same height difference: which slope is gentler
 *   3 מרחק     the horizontal distance between two points, with the ruler and the scale
 *   4 מיקום    the full UTM reading of a point on a grid intersection
 *
 * Choosing or typing is neutral; a verdict appears only after "בדיקה", and only while the answer is
 * still the one checked. A hint is offered after the first wrong check; the solution after two
 * different wrong answers or after the hint, and only on request. Re-checking the same answer is
 * not a new try. The summary tells, per skill, whether it was solved alone, with the hint, or by
 * the solution. Data, answers and feedback rules: practiceModel.ts.
 */

const LESSON_REFERENCE_WIDTH = 1344;

const STEP_LABEL = ['זיהוי', 'תלילות', 'מרחק', 'מיקום'] as const;
const SKILL: Record<TaskId, string> = {
  relief: 'זיהוי רכיב תבליט',
  slope: 'השוואת תלילות',
  distance: 'מדידת מרחק',
  location: 'קריאת מיקום',
};
/** The lesson's sub-topic to go back to for each skill (ids of Topic02Lesson SCENES). */
const REVIEW: Record<TaskId, { id: string; label: string }> = {
  relief: { id: 'relief-cover', label: 'תבליט ותכסית' },
  slope: { id: 'contours', label: 'קווי גובה' },
  distance: { id: 'scale', label: 'קנה מידה' },
  location: { id: 'coordinates-2', label: 'קואורדינטות 2' },
};
const RESULT_TEXT: Record<Result, string> = { self: 'נפתר עצמאית', hint: 'נעזרתם ברמז', solution: 'הוצג פתרון' };

const KIND: Record<FeatureKind, string> = {
  dome: 'כיפה',
  saddle: 'אוכף',
  grove: 'חורשה',
  orchard: 'מטע',
  building: 'מבנה',
  road: 'דרך',
};

const Ltr = ({ children }: { children: ReactNode }) => (
  <bdi dir="ltr" className="whitespace-nowrap tabular-nums">
    {children}
  </bdi>
);

type Dispatch = (a: Action) => void;

/**
 * The practice tab is outside the learn tab's LessonFitUniform, so the card gets the same fit here:
 * laid out at the lesson's width and shrunk by the lesson's one scale. One fit only.
 */
export function CartographyPractice() {
  return (
    <LessonFitUniform>
      <LessonViewportFit referenceWidth={LESSON_REFERENCE_WIDTH}>
        <PracticeCard />
      </LessonViewportFit>
    </LessonFitUniform>
  );
}

function PracticeCard() {
  const [state, rawDispatch] = useReducer(reducer, 0, initialState);
  const [ruler, setRuler] = useState(false);
  // A new scenario or a restart puts the ruler away.
  const dispatch: Dispatch = (a) => {
    if (a.type === 'restart' || a.type === 'nextScenario') setRuler(false);
    rawDispatch(a);
  };
  const sc = scenarioOf(state.scenario);
  const uid = useId();
  const titleId = `${uid}-title`;
  const mapDescId = `${uid}-map-desc`;
  const step = state.step;
  const task = TASKS[step] as TaskId | undefined;

  // Dev-only handle for scripts/qa/shot-cartography-practice.mjs (the state only — never the answer).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __cartoPractice?: unknown };
    w.__cartoPractice = { state };
    return () => {
      delete w.__cartoPractice;
    };
  }, [state]);

  // A new step (or another scenario) moves focus to its question, so the step is read from its start.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step, state.scenario]);

  const t = task ? state.tasks[task] : null;
  const verdict = task && t ? shownVerdict(task, t) : null;
  const tone = (right: boolean, picked: boolean): MarkTone => (!picked ? 'idle' : verdict === null ? 'selected' : right ? 'right' : 'wrong');

  const reliefT = state.tasks.relief;
  const slopeT = state.tasks.slope;
  const markTones: Partial<Record<MarkLetter, MarkTone>> = {};
  if (step === 0) for (const m of sc.marks) markTones[m.letter] = tone(m.letter === sc.reliefAnswer, reliefT.answer === m.letter);
  const segTones: Partial<Record<SegmentId, MarkTone>> = {};
  if (step === 1) for (const s of sc.segments) segTones[s.id] = tone(s.id === sc.slopeAnswer, slopeT.answer === s.id);

  return (
    <section className="surface-elevated p-6 lg:p-8" data-activity="cartography-practice" data-step={step} data-scenario={sc.id} aria-labelledby={titleId}>
      <header className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
            קוראים את המפה
          </h2>
          <p className="mt-1.5 text-base leading-snug text-fg-muted">ארבע משימות קצרות על אותה מפה: מזהים, משווים, מודדים וקוראים מיקום.</p>
        </div>
        <Stepper state={state} dispatch={dispatch} />
      </header>

      <div className="mt-5 grid gap-6" style={{ gridTemplateColumns: 'minmax(0, 35fr) minmax(0, 65fr)' }}>
        {/* The task: at the inline start */}
        <div className="flex min-w-0 flex-col" data-panel="carto-step">
          <p className="font-display text-sm font-bold text-fg-muted" data-scenario-label>
            {task ? `משימה ${step + 1} מתוך ${TASKS.length} · ` : ''}תרחיש {state.scenario + 1} מתוך {SCENARIO_COUNT}
          </p>
          {task ? (
            <TaskPanel key={`${state.scenario}-${step}`} state={state} sc={sc} task={task} dispatch={dispatch} headingRef={headingRef} ruler={ruler} setRuler={setRuler} />
          ) : (
            <Summary state={state} dispatch={dispatch} headingRef={headingRef} />
          )}
          {/* On the summary the progress buttons lead back to any step. */}
          {step > 0 && task && (
            <div className="mt-auto flex items-center gap-3 pt-4">
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'goto', step: step - 1 })}>
                <ArrowRight className="size-4" aria-hidden />
                לשלב הקודם
              </Button>
            </div>
          )}
        </div>

        {/* The map: at the inline end */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-white" data-panel="carto-map">
            <PracticeMap
              sc={sc}
              step={step}
              marks={markTones}
              onPickMark={reliefT.outcome ? undefined : (l) => dispatch({ type: 'answer', task: 'relief', value: l })}
              segments={segTones}
              onPickSegment={slopeT.outcome ? undefined : (id) => dispatch({ type: 'answer', task: 'slope', value: id })}
              evidence={step === 1 && !!slopeT.outcome}
              ruler={step === 2 && ruler}
              measured={step === 2 && !!state.tasks.distance.outcome}
              readLines={step === 3 && !!state.tasks.location.outcome}
              className="block h-auto w-full"
              labelledBy={`${uid}-map-name`}
              describedBy={mapDescId}
            />
          </div>
          <span id={`${uid}-map-name`} className="sr-only">
            מפת התרגול
          </span>
          <p className="mt-2 text-base leading-snug text-fg-muted" data-map-meta>
            רווח אנכי <Ltr>{sc.interval}</Ltr> מ׳ · דאטום <Ltr>{DATUM}</Ltr> · <Ltr>UTM</Ltr> פלח <Ltr>{ZONE}</Ltr>, חצי כדור צפוני · מפה בדיונית לתרגול
          </p>
          <MapDescription id={mapDescId} state={state} sc={sc} ruler={ruler} />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- progress

function Stepper({ state, dispatch }: { state: State; dispatch: Dispatch }) {
  const reach = reachable(state);
  const done = state.step === TASKS.length;
  return (
    <ol className="flex shrink-0 items-center gap-1.5" aria-label="שלבי התרגול" data-stepper={done ? 'done' : state.step + 1}>
      {STEP_LABEL.map((label, i) => {
        const complete = !!state.tasks[TASKS[i]].outcome;
        const now = i === state.step;
        const open = i <= reach && !now;
        const body = (
          <>
            <span className={cn('flex size-6 items-center justify-center rounded-full border-2 font-display text-sm font-bold', complete ? 'border-accent bg-accent text-white' : now ? 'border-accent bg-white text-fg' : 'border-border bg-white text-fg')}>
              {complete ? <Check className="size-3.5" strokeWidth={3.5} aria-hidden /> : i + 1}
            </span>
            <span className={cn('font-display text-sm', now ? 'font-bold text-fg' : 'font-semibold text-fg-muted')}>
              {label}
              <span className="sr-only">{complete ? ' — הושלם' : now ? ' — השלב הנוכחי' : ''}</span>
            </span>
          </>
        );
        return (
          <li key={label} className="flex items-center gap-1.5" aria-current={now ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={cn('h-0.5 w-3 rounded', i <= reach ? 'bg-accent' : 'bg-border')} />}
            {open ? (
              <button type="button" onClick={() => dispatch({ type: 'goto', step: i })} className={cn('flex cursor-pointer items-center gap-1.5 rounded-full pe-1.5 hover:bg-bg-accent', FOCUS_RING)} data-step-link={i}>
                {body}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 pe-1.5">{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- one task

const H3 = ({ children, headingRef }: { children: ReactNode; headingRef: React.Ref<HTMLHeadingElement> }) => (
  <h3 ref={headingRef} tabIndex={-1} className="mt-1 font-display text-xl font-bold leading-snug text-fg focus:outline-none">
    {children}
  </h3>
);
const P = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cn('mt-2 text-base leading-relaxed text-fg', className)}>{children}</p>;

function TaskPanel({ state, sc, task, dispatch, headingRef, ruler, setRuler }: { state: State; sc: Scenario; task: TaskId; dispatch: Dispatch; headingRef: React.Ref<HTMLHeadingElement>; ruler: boolean; setRuler: (v: boolean) => void }) {
  const t = state.tasks[task];
  const verdict = shownVerdict(task, t);
  const canCheck = normalise(task, t.answer) !== null;
  const last = state.step === TASKS.length - 1;
  const primary = t.outcome ? (
    <Button variant="primary" size="md" onClick={() => dispatch({ type: 'goto', step: state.step + 1 })} data-primary="next">
      {last ? 'לסיכום' : 'לשלב הבא'}
      <ArrowLeft className="size-4" aria-hidden />
    </Button>
  ) : (
    <Button variant="primary" size="md" onClick={() => dispatch({ type: 'check', task })} disabled={!canCheck}>
      בדיקה
    </Button>
  );

  let head: ReactNode;
  let controls: ReactNode;
  if (task === 'relief') {
    head = (
      <>
        <H3 headingRef={headingRef}>איזה מהרכיבים המסומנים הוא רכיב תבליט?</H3>
        <P>במפה מסומנים שלושה רכיבים. בחרו אחד, במפה או כאן.</P>
      </>
    );
    controls = <Choices task={task} ids={sc.marks.map((m) => m.letter)} label={(l) => <>רכיב {l}</>} state={state} dispatch={dispatch} disc />;
  } else if (task === 'slope') {
    const [lo, hi] = sc.slope.levels;
    head = (
      <>
        <H3 headingRef={headingRef}>באיזה קטע המדרון מתון יותר?</H3>
        <P>
          שני הקטעים יורדים מאותה גבעה, מקו הגובה <Ltr>{hi}</Ltr> מ׳ עד קו הגובה <Ltr>{lo}</Ltr> מ׳.
        </P>
      </>
    );
    controls = <Choices task={task} ids={sc.segments.map((s) => s.id)} label={(id) => <>קטע {id}</>} state={state} dispatch={dispatch} disc />;
  } else if (task === 'distance') {
    head = (
      <>
        <H3 headingRef={headingRef}>מה המרחק האופקי בין א ל־ב?</H3>
        <P>מדדו בקו ישר בעזרת הסרגל וקנה המידה של המפה, וכתבו את התשובה במטרים.</P>
      </>
    );
    controls = <DistanceInput state={state} dispatch={dispatch} ruler={ruler} setRuler={setRuler} />;
  } else {
    head = (
      <>
        <H3 headingRef={headingRef}>איזו קריאה מתארת את הנקודה המסומנת?</H3>
        <P>הנקודה בחיתוך של שני קווי רשת. את ערכי הקווים קוראים במסגרת, ואת הדאטום, הפלח וחצי הכדור – בשולי המפה.</P>
      </>
    );
    controls = <Choices task={task} ids={sc.readings.map((r) => r.letter)} label={(l) => <Ltr>{sc.readings.find((r) => r.letter === l)!.text}</Ltr>} state={state} dispatch={dispatch} column />;
  }

  return (
    <div data-controls={task}>
      {head}
      {controls}
      <div className="mt-4">{primary}</div>
      <Feedback sc={sc} task={task} verdict={verdict} state={state} />
      <HelpRow sc={sc} task={task} state={state} dispatch={dispatch} />
    </div>
  );
}

/** One choice per mark / segment / reading: neutral when chosen, ✓/✗ only after a check of that choice. */
function Choices({ task, ids, label, state, dispatch, disc, column }: { task: TaskId; ids: readonly string[]; label: (id: string) => ReactNode; state: State; dispatch: Dispatch; disc?: boolean; column?: boolean }) {
  const t = state.tasks[task];
  const verdict = shownVerdict(task, t);
  const locked = !!t.outcome;
  const groupLabel = task === 'relief' ? 'הרכיבים המסומנים' : task === 'slope' ? 'הקטעים' : 'הקריאות';
  return (
    <div role="group" aria-label={groupLabel} className={cn('mt-3 flex gap-2', column ? 'flex-col' : 'flex-wrap')} data-choices={task}>
      {ids.map((id) => {
        const on = t.answer === id;
        const mark = on && verdict ? (verdict === 'right' ? 'right' : 'wrong') : null;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            aria-disabled={locked && !on ? true : undefined}
            onClick={() => !locked && dispatch({ type: 'answer', task, value: id })}
            className={cn(
              OPTION_BASE,
              FOCUS_RING,
              'flex min-h-11 items-center gap-2.5 px-3.5 py-2 font-display text-base font-semibold text-fg',
              column ? 'w-full' : '',
              mark === 'right' ? 'border-brand before:bg-brand/10' : mark === 'wrong' ? 'border-accent-hot before:bg-accent-hot/[0.06]' : on ? OPTION_ACTIVE : OPTION_IDLE,
              locked && !on && 'cursor-default opacity-60',
            )}
            data-choice={id}
            data-verdict={mark ?? undefined}
          >
            {disc && <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-fg bg-white font-display text-base font-extrabold text-fg">{id}</span>}
            {!disc && <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-white font-display text-sm font-bold text-fg-muted">{id}</span>}
            <span className="min-w-0 flex-1">{label(id)}</span>
            {mark === 'right' && (
              <>
                <Check className="size-5 shrink-0 text-brand-dark" strokeWidth={3} aria-hidden />
                <span className="sr-only">נכון</span>
              </>
            )}
            {mark === 'wrong' && (
              <>
                <X className="size-5 shrink-0 text-accent-hot" strokeWidth={3} aria-hidden />
                <span className="sr-only">לא נכון</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DistanceInput({ state, dispatch, ruler, setRuler }: { state: State; dispatch: Dispatch; ruler: boolean; setRuler: (v: boolean) => void }) {
  const uid = useId();
  const t = state.tasks.distance;
  const verdict = shownVerdict('distance', t);
  const locked = !!t.outcome;
  const typed = t.answer.trim() !== '';
  const bad = typed && normalise('distance', t.answer) === null;
  return (
    <div className="mt-3" data-distance>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setRuler(!ruler)} aria-pressed={ruler} data-ruler-toggle>
          {ruler ? 'הסרת הסרגל' : 'הנחת סרגל'}
        </Button>
        <span className="text-sm leading-snug text-fg-muted">הסרגל מראה ס״מ של המפה המודפסת, לא של המסך.</span>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <label htmlFor={`${uid}-m`} className="font-display text-base font-bold text-fg">
          המרחק בשטח
        </label>
        <span dir="ltr" className="flex items-center">
          <input
            id={`${uid}-m`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            dir="ltr"
            maxLength={9}
            value={t.answer}
            readOnly={locked}
            aria-invalid={verdict && verdict !== 'right' ? true : bad ? true : undefined}
            aria-describedby={bad ? `${uid}-bad` : undefined}
            onChange={(e) => dispatch({ type: 'answer', task: 'distance', value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!locked) dispatch({ type: 'check', task: 'distance' });
              }
            }}
            className={cn(
              'h-11 w-28 rounded-xl border bg-bg-elevated px-2 text-center font-display text-lg font-bold tabular-nums text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              verdict === 'right' ? 'border-brand bg-brand/10' : verdict ? 'border-accent-hot' : 'border-fg-dim/60',
            )}
            data-distance-input
          />
        </span>
        <span className="font-display text-base font-bold text-fg">מ׳</span>
        {verdict === 'right' && (
          <>
            <Check className="size-5 text-brand-dark" strokeWidth={3} aria-hidden />
            <span className="sr-only">נכון</span>
          </>
        )}
        {verdict && verdict !== 'right' && (
          <>
            <X className="size-5 text-accent-hot" strokeWidth={3} aria-hidden />
            <span className="sr-only">לא נכון</span>
          </>
        )}
      </div>
      {bad && (
        <p id={`${uid}-bad`} className="mt-1.5 text-sm text-fg-muted">
          כתבו מספר בלבד, במטרים.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- feedback

type Fb = { tone: 'right' | 'wrong'; title: ReactNode; body?: ReactNode };

function feedbackOf(sc: Scenario, task: TaskId, verdict: Verdict, solved: boolean, answer: string): Fb {
  if (task === 'relief') {
    if (verdict === 'right' || solved) {
      const m = sc.marks.find((x) => x.letter === sc.reliefAnswer)!;
      const lead = solved ? `הפתרון: ${m.letter} מסמן ${KIND[m.kind]}.` : `נכון: ${m.letter} מסמן ${KIND[m.kind]}.`;
      const body =
        m.kind === 'dome' ? (
          <>
            קווי גובה סגורים סביב נקודה גבוהה (<Ltr>{Math.round(sc.tops.find((x) => x.at === m.at)?.z ?? 0)}</Ltr> מ׳) מתארים את צורת הקרקע עצמה, ולכן זה תבליט.
          </>
        ) : (
          <>מעבר נמוך בין שתי קבוצות של קווי גובה סגורים. זו צורת הקרקע עצמה, ולכן זה תבליט.</>
        );
      return { tone: 'right', title: lead, body };
    }
    const m = sc.marks.find((x) => x.letter === answer)!;
    const what: Record<FeatureKind, string> = {
      grove: 'זו חורשה: צומח שגדל על פני הקרקע, ולכן זו תכסית.',
      orchard: 'זה מטע: עצים שהאדם נטע על פני הקרקע, ולכן זו תכסית.',
      building: 'זה מבנה: האדם הקים אותו על פני הקרקע, ולכן זו תכסית.',
      road: 'זו דרך: האדם סלל אותה על פני הקרקע, ולכן זו תכסית.',
      dome: '',
      saddle: '',
    };
    return { tone: 'wrong', title: what[m.kind], body: 'תבליט הוא צורת הקרקע עצמה, ובמפה קוראים אותו מקווי הגובה ולא מסמלים שעל פניה.' };
  }

  if (task === 'slope') {
    const [lo, hi] = sc.slope.levels;
    const dh = hi - lo;
    if (verdict === 'right' || solved) {
      const g = sc.segments.find((s) => s.id === sc.slopeAnswer)!;
      const o = sc.segments.find((s) => s.id !== sc.slopeAnswer)!;
      return {
        tone: 'right',
        title: solved ? `הפתרון: בקטע ${g.id} המדרון מתון יותר.` : `נכון: בקטע ${g.id} המדרון מתון יותר.`,
        body: (
          <>
            בשני הקטעים יורדים <Ltr>{dh}</Ltr> מ׳ (<Ltr>{dh / sc.interval}</Ltr> מרווחים של <Ltr>{sc.interval}</Ltr> מ׳). בקטע {g.id} זה קורה לאורך כ־<Ltr>{fmtInt(round10(g.length))}</Ltr> מ׳, ובקטע {o.id} לאורך כ־
            <Ltr>{fmtInt(round10(o.length))}</Ltr> מ׳: הקווים בקטע {g.id} מרווחים יותר.
          </>
        ),
      };
    }
    return {
      tone: 'wrong',
      title: 'השוו את המרחק בין הקווים בשני הקטעים.',
      body: (
        <>
          בשני הקטעים אותו הפרש גובה, <Ltr>{dh}</Ltr> מ׳. המדרון מתון יותר במקום שבו ההפרש הזה נפרש על מרחק אופקי ארוך יותר.
        </>
      ),
    };
  }

  if (task === 'distance') {
    const { metres, cm } = sc.ground3;
    if (verdict === 'right' || solved) {
      return {
        tone: 'right',
        title: (
          <>
            {solved ? 'הפתרון' : 'נכון'}: המרחק כ־<Ltr>{fmtInt(metres)}</Ltr> מ׳.
          </>
        ),
        body: (
          <>
            {/* Hebrew first, so the line opens with words and the working reads left to right after it. */}
            בסרגל <Ltr>{fmtCm(cm)}</Ltr> ס״מ, ובשטח: <Ltr>{`${fmtCm(cm)} × ${fmtInt(sc.denominator)} = ${fmtInt(cm * sc.denominator)}`}</Ltr> ס״מ, כלומר <Ltr>{fmtInt(metres)}</Ltr> מ׳. קריאה בסרגל מדויקת עד כ־<Ltr>{READ_MM}</Ltr> מ״מ, ולכן מתקבלת כל תשובה עד{' '}
            <Ltr>{fmtInt(sc.ground3.tolerance)}</Ltr> מ׳ מזה.
          </>
        ),
      };
    }
    const text: Partial<Record<Verdict, Fb>> = {
      'map-cm': { tone: 'wrong', title: 'זה המרחק במפה, בס״מ.', body: 'כדי לקבל את המרחק בשטח, ממירים אותו לפי קנה המידה של המפה.' },
      'units-km': { tone: 'wrong', title: 'נראה שזה מרחק בקילומטרים.', body: 'התשובה צריכה להיות במטרים. בקילומטר יש 1,000 מ׳.' },
      'units-cm': { tone: 'wrong', title: 'נראה שזה מרחק בסנטימטרים.', body: 'התשובה צריכה להיות במטרים. במטר יש 100 ס״מ.' },
      scale: { tone: 'wrong', title: 'נראה שהחישוב נעשה בקנה מידה אחר.', body: 'בדקו בשולי המפה את קנה המידה, וכמה מטרים בשטח מייצג ס״מ אחד במפה.' },
      far: { tone: 'wrong', title: 'התשובה רחוקה מהמרחק בין הנקודות.', body: 'קראו שוב בסרגל כמה ס״מ יש בין א ל־ב, והמירו לפי קנה המידה.' },
    };
    return text[verdict]!;
  }

  // location
  if (verdict === 'right' || solved) {
    return {
      tone: 'right',
      title: solved ? `הפתרון: קריאה ${sc.locationAnswer}.` : `נכון: קריאה ${sc.locationAnswer}.`,
      body: (
        <>
          <Ltr>E</Ltr> מהקו האנכי (<Ltr>{sc.point.E}</Ltr>), <Ltr>N</Ltr> מהקו האופקי (<Ltr>{sc.point.N}</Ltr>), ומשולי המפה: <Ltr>{DATUM}</Ltr>, פלח <Ltr>{ZONE}</Ltr>, חצי כדור צפוני (<Ltr>{HEMISPHERE}</Ltr>).
        </>
      ),
    };
  }
  const text: Partial<Record<Verdict, Fb>> = {
    'adjacent-E': { tone: 'wrong', title: <>ערך ה־<Ltr>E</Ltr> בקריאה הזו שייך לקו רשת אנכי סמוך.</>, body: 'עקבו מהנקודה לאורך הקו האנכי שעובר בה, עד התווית שמתחת למסגרת.' },
    'adjacent-N': { tone: 'wrong', title: <>ערך ה־<Ltr>N</Ltr> בקריאה הזו שייך לקו רשת אופקי סמוך.</>, body: 'עקבו מהנקודה לאורך הקו האופקי שעובר בה, עד התווית שמשמאל למסגרת.' },
    hemisphere: {
      tone: 'wrong',
      title: <>ה־<Ltr>S</Ltr> שאחרי מספר הפלח מציין חצי כדור דרומי.</>,
      body: (
        <>
          בשולי המפה כתוב חצי כדור צפוני. ה־<Ltr>N</Ltr> שצמוד לפלח הוא חצי הכדור, והוא רכיב אחר מה־<Ltr>N</Ltr> שלפני מספר הצפון במטרים.
        </>
      ),
    },
    swap: {
      tone: 'wrong',
      title: <>בקריאה הזו <Ltr>E</Ltr> ו־<Ltr>N</Ltr> התחלפו.</>,
      body: (
        <>
          אחרי <Ltr>E</Ltr> כתוב כאן ערך של קו אופקי. <Ltr>E</Ltr> נקרא מהתוויות שמתחת למסגרת, ו־<Ltr>N</Ltr> מהתוויות שמשמאל לה.
        </>
      ),
    },
  };
  return text[verdict]!;
}

function Feedback({ sc, task, verdict, state }: { sc: Scenario; task: TaskId; verdict: Verdict | null; state: State }) {
  const t = state.tasks[task];
  const solved = t.outcome === 'solution';
  const fb = verdict ? feedbackOf(sc, task, verdict, solved, t.answer) : null;
  return (
    // Announced once per check (the inner block is keyed by the check count).
    <div role="status" aria-live="polite" aria-atomic="true" data-carto-feedback={fb ? (solved ? 'solution' : verdict) : 'none'}>
      {fb && (
        <div key={state.checks} className={cn('mt-3 rounded-xl border px-3.5 py-2.5', fb.tone === 'right' ? 'border-brand bg-brand/10' : 'border-accent-hot/60 bg-bg-accent')}>
          <div className="flex items-start gap-2 font-display text-base font-bold leading-snug text-fg">
            {fb.tone === 'right' ? <Check className="mt-0.5 size-5 shrink-0" aria-hidden /> : <X className="mt-0.5 size-5 shrink-0" aria-hidden />}
            <span>{fb.title}</span>
          </div>
          {fb.body && <p className="mt-1 ps-7 text-base leading-snug text-fg">{fb.body}</p>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- hint and solution

function hintOf(sc: Scenario, task: TaskId): ReactNode {
  if (task === 'relief') return 'תכסית מסומנת במפה בסמלים: צומח, מבנים ודרכים. תבליט נקרא מצורת קווי הגובה. בדקו מה נמצא סביב כל סימון.';
  if (task === 'slope') return 'הפרש הגובה בשני הקטעים זהה. השוו את אורך הקטעים: באיזה מהם הקווים רחוקים זה מזה יותר?';
  if (task === 'distance')
    return (
      <>
        קראו בסרגל את המרחק במפה, בס״מ. <Ltr>{fmtRatio(sc.denominator)}</Ltr> פירושו שס״מ אחד במפה הוא <Ltr>{fmtInt(sc.denominator)}</Ltr> ס״מ בשטח. בסוף המירו למטרים.
      </>
    );
  return (
    <>
      <Ltr>E</Ltr> נקרא מהקו האנכי שעובר בנקודה (התוויות מתחת למסגרת), ו־<Ltr>N</Ltr> מהקו האופקי (התוויות משמאל). הדאטום, הפלח וחצי הכדור כתובים בשולי המפה.
    </>
  );
}

function HelpRow({ sc, task, state, dispatch }: { sc: Scenario; task: TaskId; state: State; dispatch: Dispatch }) {
  const t = state.tasks[task];
  const offer = helpOffer(t);
  const showHint = t.hint && !t.outcome;
  if (!offer.hint && !offer.solve && !showHint) return null;
  return (
    <div className="mt-2.5" data-help={task}>
      {showHint && (
        <p className="flex items-start gap-2 rounded-xl bg-bg-accent/60 px-3.5 py-2.5 text-base leading-snug text-fg" data-hint>
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            <span className="font-display font-bold">רמז: </span>
            {hintOf(sc, task)}
          </span>
        </p>
      )}
      {(offer.hint || offer.solve) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {offer.hint && (
            <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'hint', task })}>
              <Lightbulb className="size-4" aria-hidden />
              רמז
            </Button>
          )}
          {offer.solve && (
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'solve', task })}>
              הצגת הפתרון
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- summary

function Summary({ state, dispatch, headingRef }: { state: State; dispatch: Dispatch; headingRef: React.Ref<HTMLHeadingElement> }) {
  const review = (id: string) => window.dispatchEvent(new CustomEvent('lesson:open-scene', { detail: { id } }));
  return (
    <div data-controls="summary">
      <H3 headingRef={headingRef}>סיימתם את ארבע המשימות</H3>
      <P className="text-fg-muted">כך פתרתם כל משימה בתרחיש הזה:</P>
      <ul className="mt-3 divide-y divide-border-subtle border-y border-border-subtle" data-summary>
        {TASKS.map((task) => {
          const r = resultOf(state.tasks[task])!;
          return (
            <li key={task} className="flex items-center justify-between gap-3 py-2.5" data-summary-row={task} data-result={r}>
              <span className="font-display text-base font-bold text-fg">{SKILL[task]}</span>
              <span className="flex items-center gap-2 text-base text-fg">
                {r === 'self' && <Check className="size-4 text-brand-dark" strokeWidth={3} aria-hidden />}
                {RESULT_TEXT[r]}
              </span>
            </li>
          );
        })}
      </ul>
      {TASKS.some((task) => resultOf(state.tasks[task]) !== 'self') && (
        <div className="mt-3" data-review>
          <p className="text-sm text-fg-muted">לחזרה בלשונית הלימוד:</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TASKS.filter((task) => resultOf(state.tasks[task]) !== 'self').map((task) => (
              <Button key={task} variant="secondary" size="sm" onClick={() => review(REVIEW[task].id)} data-review-link={REVIEW[task].id}>
                {REVIEW[task].label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="primary" size="md" onClick={() => dispatch({ type: 'nextScenario' })}>
          תרחיש נוסף
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <Button variant="secondary" size="md" onClick={() => dispatch({ type: 'restart' })}>
          <RotateCcw className="size-4" aria-hidden />
          התחלה מחדש
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the map in words (screen readers)

/** The source data each step needs, as text — symbols, heights, line spacing, the grid — never the verdict. */
function MapDescription({ id, state, sc, ruler }: { id: string; state: State; sc: Scenario; ruler: boolean }) {
  const k = 1000 / sc.denominator;
  const items: string[] = [`מפה בקנה מידה ${fmtRatio(sc.denominator)}, הצפון למעלה. קווי גובה כל ${sc.interval} מ׳.`];
  const where = (kind: FeatureKind, at: readonly [number, number]) => {
    if (kind === 'dome') return `בתוך קווי גובה סגורים, ליד נקודת גובה של ${Math.round(sc.tops.find((x) => x.at === at)?.z ?? 0)} מ׳`;
    if (kind === 'saddle') return 'בין שתי קבוצות של קווי גובה סגורים, בנקודה הנמוכה שביניהן';
    if (kind === 'grove') return 'בתוך שטח ירוק מסומן בעיגולים קטנים של עצים';
    if (kind === 'orchard') return 'בתוך שטח ירוק מסומן בנקודות בשורות';
    if (kind === 'building') return 'על ריבוע שחור קטן';
    return 'על קו כפול חום־צהוב שחוצה את המפה';
  };
  if (state.step === 0) for (const m of sc.marks) items.push(`רכיב ${m.letter}: ${where(m.kind, m.at)}.`);
  if (state.step === 1) {
    const [lo, hi] = sc.slope.levels;
    for (const s of sc.segments) items.push(`קטע ${s.id}: מקו ${hi} מ׳ עד קו ${lo} מ׳, ${(hi - lo) / sc.interval + 1} קווי גובה לאורך ${fmtCm(s.length * k)} מ״מ במפה.`);
  }
  if (state.step === 2) {
    items.push('שתי נקודות, א ו־ב. בשולי המפה סרגל קנה מידה שכל ס״מ בו מסומן.');
    if (ruler) items.push(`הסרגל מונח מ־א: הנקודה ב נמצאת מול ${rulerReading(sc)} ס״מ.`);
  }
  if (state.step === 3) {
    items.push(`קווי הרשת האנכיים, משמאל לימין: ${sc.gridE.join(', ')}. קווי הרשת האופקיים, מלמטה למעלה: ${sc.gridN.join(', ')}.`);
    const iE = sc.gridE.indexOf(sc.point.E) + 1;
    const iN = sc.gridN.indexOf(sc.point.N) + 1;
    items.push(`הנקודה המסומנת נמצאת על הקו האנכי ה־${iE} משמאל ועל הקו האופקי ה־${iN} מלמטה.`);
  }
  return (
    <div id={id} className="sr-only" data-map-description>
      {items.map((s, i) => (
        <p key={i}>{s}</p>
      ))}
    </div>
  );
}
