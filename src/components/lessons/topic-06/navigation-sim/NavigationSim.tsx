'use client';

import { useEffect, useId, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Info, Lightbulb, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LessonFitUniform, LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';
import { distance } from '../locationCheckGeometry';
import { NavigationSimMap, type LineTone, type MapLine, type MarkTone } from './NavigationSimMap';
import {
  DEMO,
  INITIAL_STATE,
  MARK_TOLERANCE_M,
  ON_CROSSING_M,
  OBJECTS,
  OBJECT_IDS,
  REAL_ERROR_DEG,
  SCENARIOS,
  backAzimuth,
  backAzimuthWorking,
  fmtDeg,
  helpOffer,
  lineShiftAt,
  parseAzimuth,
  reducer,
  view as viewOf,
  type Action,
  type LineVerdict,
  type ObjectId,
  type Stage,
  type State,
} from './navigationSimModel';

/**
 * Lesson 6 › תרגול — resection ("חיתוך לאחור"). One card: the map at the inline
 * end, and one step at a time beside it:
 *
 *   1 הדגמה   one measurement to the water tower (080°): drawn as measured, the
 *             line is on the wrong side of the tower; reversed (260°), every
 *             point on it sees the tower at 080°
 *   2 בחירה   choose two of the three objects; the readings to them appear
 *   3 קווים   type each back azimuth; the line turns on the map as you type
 *   4 מיקום   mark the crossing on the map (click, or arrow keys)
 *   5 אימות   the third object's back azimuth: its line passes through the mark
 *
 * Typing and marking are neutral; a verdict appears only after "בדיקה". A
 * wrong check names the mistake (not reversed, another object's measurement,
 * off the lines) without the answer; hints are graded, and the solution is
 * offered after a hint or a second wrong check. "תרחיש נוסף" moves to another
 * position with other readings; "התחלה מחדש" restarts the current one.
 *
 * A mark is accepted up to MARK_TOLERANCE_M from the crossing, so the text
 * never says a line passes through the mark: lines pass through the crossing,
 * and a mark farther than ON_CROSSING_M from it is told its distance.
 */

const Deg = ({ v }: { v: number }) => (
  <bdi dir="ltr" className="whitespace-nowrap tabular-nums">
    {fmtDeg(v)}
  </bdi>
);
const Ltr = ({ children }: { children: string }) => (
  <bdi dir="ltr" className="whitespace-nowrap tabular-nums">
    {children}
  </bdi>
);
const n = (v: number) => v.toLocaleString('en-US');
const round5 = (v: number) => Math.round(v / 5) * 5;
const round50 = (v: number) => Math.round(v / 50) * 50;

const STEP_LABEL = ['הדגמה', 'בחירה', 'קווים', 'מיקום', 'אימות'] as const;

type Dispatch = (a: Action) => void;

/** Lesson 6's compositions are laid out at this width and shrink with the lesson's one scale (Topic06Lesson). */
const LESSON_REFERENCE_WIDTH = 1344;

/** The mark's distance from the crossing, rounded to 5 m — null when it is on it (within the mark's centre dot). */
function offCrossing(mark: { E: number; N: number } | null, position: { E: number; N: number }) {
  const off = mark ? distance(mark, position) : 0;
  return off <= ON_CROSSING_M ? null : Math.max(ON_CROSSING_M, round5(off));
}

/**
 * The practice tab is outside the learn tab's LessonFitUniform, so the card gets
 * the same fit here: laid out at the lesson's width and shrunk by the same scale
 * as every other lesson-6 activity. One fit only — the card never sits inside
 * another one.
 */
export function NavigationSim() {
  return (
    <LessonFitUniform>
      <LessonViewportFit referenceWidth={LESSON_REFERENCE_WIDTH}>
        <NavigationSimCard />
      </LessonViewportFit>
    </LessonFitUniform>
  );
}

function NavigationSimCard() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const v = viewOf(state);
  const reduce = !!useReducedMotion();
  const uid = useId();
  const titleId = `${uid}-title`;
  // The line whose field has focus is drawn orange on the map.
  const [active, setActive] = useState<ObjectId | null>(null);

  // Dev-only handle for scripts/qa/shot-navigation-sim.mjs (the state only — never the answer).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __navsim?: unknown };
    w.__navsim = { state };
    return () => {
      delete w.__navsim;
    };
  }, [state]);

  // A new step (or a verdict that swaps the main button) moves focus to the step's first control.
  const panelRef = useRef<HTMLDivElement>(null);
  const focusKey = `${state.scenario}:${state.step}:${v.linesRight}:${v.markRight || state.help.mark.solved}`;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = panelRef.current?.closest('[data-activity]')?.querySelector<HTMLElement>('[data-autofocus]');
    el?.focus({ preventScroll: true });
  }, [focusKey]);

  const sc = v.scenario;
  const scenarioIdx = state.scenario;
  const demo = state.step === 'demo-1' || state.step === 'demo-2';

  // ---- what the map draws
  const lineTone = (id: ObjectId): LineTone => {
    const verdict = v.verdict(id);
    if (verdict) return verdict.kind === 'right' ? 'right' : 'wrong';
    return active === id ? 'active' : 'draft';
  };
  const lines: MapLine[] = [];
  if (v.pair && (state.step === 'lines' || state.step === 'mark' || state.step === 'verify' || state.step === 'done')) {
    for (const id of v.pair) {
      const val = v.value(id);
      if (val !== null) lines.push({ id, deg: val, tone: lineTone(id) });
    }
  }
  if (v.third && (state.step === 'verify' || state.step === 'done')) {
    const val = v.value(v.third);
    if (val !== null) lines.push({ id: v.third, deg: val, tone: lineTone(v.third) });
  }
  const markTone: MarkTone = state.step === 'verify' || state.step === 'done' ? 'right' : v.mark ? (v.mark.kind === 'right' ? 'right' : 'wrong') : 'draft';
  const ring: ObjectId[] = demo ? [DEMO.object] : state.step === 'choose' ? [...state.chosen] : active ? [active] : [];
  const dim: ObjectId[] = demo ? OBJECT_IDS.filter((id) => id !== DEMO.object) : state.step === 'lines' && v.third ? [v.third] : [];
  const wedges = state.step === 'done' ? OBJECT_IDS.map((id) => ({ id, deg: backAzimuth(sc.readings[id]) })) : undefined;

  return (
    <section className="surface-elevated p-6 lg:p-8" data-activity="navigation-sim" data-step={state.step} data-scenario={sc.id} aria-labelledby={titleId}>
      {/* Title and progress (the lesson's card tiers, as in the location check); the same-north note under the
          progress, over the map, so the map alone sets the row's height */}
      <header className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
            חיתוך לאחור: איפה אתם על המפה?
          </h2>
          <p className="mt-1.5 text-base leading-snug text-fg-muted">בלי GPS: מצפן ושלושה עצמים שמזוהים גם בשטח וגם במפה.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <Stepper current={v.stepNumber} done={v.done} />
          <p className="text-base leading-snug text-fg-muted" data-north-note>
            כל הכיוונים בתרגיל נמדדים מאותו צפון: הצפון של המפה הוא גם הצפון של המצפן.
          </p>
        </div>
      </header>

      {/* The map sets the row's height; every step (hints and feedback included) fits beside it. */}
      <div className="mt-4 grid gap-6" style={{ gridTemplateColumns: 'minmax(0, 37fr) minmax(0, 63fr)' }}>
        {/* The step: at the inline start */}
        <div ref={panelRef} className="flex min-w-0 flex-col" data-panel="navsim-step">
          <StepPanel
            state={state}
            dispatch={dispatch}
            onActive={setActive}
            label={
              <p className="shrink-0 font-display text-sm font-bold text-fg-muted" data-scenario-label>
                {demo ? 'הדגמה' : `תרחיש ${scenarioIdx + 1} מתוך ${SCENARIOS.length}`}
              </p>
            }
          />
          <div className="mt-auto flex items-center gap-3 border-t border-border-subtle pt-2.5">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'reset' })} disabled={state.step === 'demo-1' || (state.step === 'choose' && state.chosen.length === 0)}>
              <RotateCcw className="size-4" aria-hidden />
              התחלה מחדש
            </Button>
          </div>
        </div>

        {/* The map: at the inline end */}
        <div className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/70 bg-white" data-panel="navsim-map">
            <NavigationSimMap
              mode={state.step}
              ring={ring}
              dim={dim}
              lines={lines}
              wedges={wedges}
              mark={state.step === 'mark' || state.step === 'verify' || state.step === 'done' ? state.marker : null}
              markTone={markTone}
              reduce={reduce}
              onPickObject={(id) => dispatch({ type: 'toggle', id })}
              onPlace={state.step === 'mark' ? (at) => dispatch({ type: 'place', at }) : undefined}
              onMove={(dE, dN) => dispatch({ type: 'move', dE, dN })}
              onCheck={() => dispatch({ type: 'checkMark' })}
              markLabel="המפה: סימון המיקום. לחיצה מציבה את הסימון; חיצים מזיזים אותו ב־20 מ׳, ועם Shift ב־100 מ׳; Enter בודק."
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <MarkAnnouncer state={state} />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- progress

function Stepper({ current, done }: { current: 1 | 2 | 3 | 4 | 5; done: boolean }) {
  return (
    <ol className="flex shrink-0 items-center gap-1.5" aria-label="שלבי התרגול" data-stepper={done ? 'done' : current}>
      {STEP_LABEL.map((label, i) => {
        const k = i + 1;
        const complete = k < current || (k === current && done);
        const now = k === current && !done;
        return (
          <li key={label} className="flex items-center gap-1.5" aria-current={now ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={cn('h-0.5 w-3 rounded', k <= current ? 'bg-accent' : 'bg-border')} />}
            <span className={cn('flex size-6 items-center justify-center rounded-full border-2 font-display text-sm font-bold', complete ? 'border-accent bg-accent text-white' : now ? 'border-accent bg-white text-black' : 'border-border bg-white text-black')}>
              {complete ? <Check className="size-3.5" strokeWidth={3.5} aria-hidden /> : k}
            </span>
            <span className={cn('font-display text-sm', now ? 'font-bold text-black' : 'font-semibold text-fg-muted')}>
              {label}
              <span className="sr-only">{complete ? ' — הושלם' : now ? ' — השלב הנוכחי' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- one step

/** The step's heading, with the scenario label at the row's inline end (the label stays first in reading order). */
const H3 = ({ children, label }: { children: ReactNode; label: ReactNode }) => (
  <div className="flex flex-row-reverse items-baseline justify-between gap-3">
    {label}
    <h3 className="min-w-0 font-display text-xl font-bold leading-snug text-black">{children}</h3>
  </div>
);
const P = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cn('mt-1.5 text-base leading-normal text-black', className)}>{children}</p>;

function StepPanel({ state, dispatch, onActive, label }: { state: State; dispatch: Dispatch; onActive: (id: ObjectId | null) => void; label: ReactNode }) {
  const v = viewOf(state);
  const sc = v.scenario;

  if (state.step === 'demo-1') {
    return (
      <div data-controls="demo-1">
        <H3 label={label}>
          הדגמה: מדדתם <Deg v={DEMO.reading} /> אל מגדל המים
        </H3>
        <P>
          אתם במקום לא ידוע ורואים את מגדל המים. המצפן מראה שהמגדל באזימוט <Deg v={DEMO.reading} /> מכם.
        </P>
        <P>
          במפה ידוע רק מקום המגדל. אם משרטטים ממנו קו ב־<Deg v={DEMO.reading} />, מכל נקודה על הקו המגדל נראה ב־<Deg v={backAzimuth(DEMO.reading)} />, לא כמו במדידה.
        </P>
        <div className="mt-4">
          <Button variant="primary" size="md" onClick={() => dispatch({ type: 'next' })} data-autofocus>
            הפכו את הכיוון
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  if (state.step === 'demo-2') {
    return (
      <div data-controls="demo-2">
        <H3 label={label}>
          הכיוון ההפוך: <Ltr>{backAzimuthWorking(DEMO.reading)}</Ltr>
        </H3>
        <P>
          מכל נקודה על הקו שיוצא מהמגדל ב־<Deg v={backAzimuth(DEMO.reading)} />, המגדל נראה ב־<Deg v={DEMO.reading} />, כמו במדידה. אתם איפשהו על הקו הזה.
        </P>
        <P>קו אחד לא מספיק. מדידה אל עצם נוסף נותנת קו שני, והמיקום שלכם בנקודה שבה הקווים נחתכים.</P>
        <div className="mt-4">
          <Button variant="primary" size="md" onClick={() => dispatch({ type: 'next' })} data-autofocus>
            לתרגול
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  if (state.step === 'choose') {
    return (
      <div data-controls="choose">
        <H3 label={label}>בחרו שני עצמים למדידה</H3>
        <P>לחצו על שני עצמים במפה או כאן. את השלישי נשמור לבדיקה בסוף.</P>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="עצמים למדידה">
          {OBJECT_IDS.map((id, k) => {
            const on = state.chosen.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => dispatch({ type: 'toggle', id })}
                // Chosen = thicker border, tint and bold (as RadioRow): neutral, no ✓ — any pair works.
                className={cn(
                  'flex h-10 cursor-pointer items-center whitespace-nowrap rounded-xl px-3.5 font-display text-base text-black transition-colors duration-200 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  on ? 'border-2 border-accent bg-accent/10 font-bold' : 'border border-fg-dim/60 bg-bg-elevated font-semibold hover:border-accent/60 hover:bg-accent/[0.04]',
                )}
                data-object={id}
                {...(k === 0 ? { 'data-autofocus': true } : {})}
              >
                {OBJECTS[id].name}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Button variant="primary" size="md" onClick={() => dispatch({ type: 'measure' })} disabled={state.chosen.length < 2}>
            מדידה במצפן
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
        </div>
        <p className="mt-2 text-sm text-fg-muted" aria-live="polite">
          {state.chosen.length === 2 ? `נבחרו ${OBJECTS[state.chosen[0]].name} ו${OBJECTS[state.chosen[1]].name}.` : `נבחרו ${state.chosen.length} מתוך 2.`}
        </p>
      </div>
    );
  }

  if (state.step === 'lines') {
    return (
      <div data-controls="lines">
        <H3 label={label}>משרטטים קו מכל עצם</H3>
        <P>המדידות הן מכם אל העצמים, אבל במפה הקו יוצא מהעצם אליכם. חשבו לכל מדידה את האזימוט החוזר והקלידו אותו.</P>
        <LineTable ids={v.pair!} state={state} dispatch={dispatch} onActive={onActive} onEnter={() => dispatch({ type: 'checkLines' })} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {v.linesRight ? (
            <Button variant="primary" size="md" onClick={() => dispatch({ type: 'toMark' })} data-autofocus>
              המשך: סימון המיקום
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={() => dispatch({ type: 'checkLines' })} disabled={v.pair!.some((id) => v.value(id) === null)}>
              בדיקה
            </Button>
          )}
          <HelpButtons state={state} stage="lines" dispatch={dispatch} />
        </div>
        <Feedback state={state} hints={<Hints state={state} stage="lines" />} />
      </div>
    );
  }

  if (state.step === 'mark') {
    const ok = v.markRight || state.help.mark.solved;
    return (
      <div data-controls="mark">
        <H3 label={label}>סמנו את המיקום שלכם</H3>
        <P>לחצו על המפה בנקודה שבה אתם נמצאים לפי שני הקווים. במקלדת: הזיזו את הסימון בחיצים ולחצו Enter.</P>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {ok ? (
            <Button variant="primary" size="md" onClick={() => dispatch({ type: 'toVerify' })} data-autofocus>
              המשך: אימות
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={() => dispatch({ type: 'checkMark' })} disabled={!state.marker}>
              בדיקה
            </Button>
          )}
          <HelpButtons state={state} stage="mark" dispatch={dispatch} />
        </div>
        <Feedback state={state} hints={<Hints state={state} stage="mark" />} />
        {/* The map is the step's first control: focus lands on it */}
        <FocusMap />
      </div>
    );
  }

  if (state.step === 'verify') {
    const third = v.third!;
    return (
      <div data-controls="verify">
        <H3 label={label}>אימות מול {OBJECTS[third].name}</H3>
        <P>
          מדדתם גם אל {OBJECTS[third].name}: <Deg v={sc.readings[third]} />. הקלידו את האזימוט החוזר. אם המיקום נכון, הקו {OBJECTS[third].from} יעבור בחיתוך של שני הקווים.
        </P>
        <LineTable ids={[third]} state={state} dispatch={dispatch} onActive={onActive} onEnter={() => dispatch({ type: 'checkVerify' })} autofocus />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" onClick={() => dispatch({ type: 'checkVerify' })} disabled={v.value(third) === null}>
            בדיקה
          </Button>
          <HelpButtons state={state} stage="verify" dispatch={dispatch} />
        </div>
        <Feedback state={state} hints={<Hints state={state} stage="verify" />} />
      </div>
    );
  }

  // done
  const third = v.third!;
  const longest = OBJECT_IDS.reduce((a, b) => (distance(OBJECTS[a].pos, sc.position) >= distance(OBJECTS[b].pos, sc.position) ? a : b));
  // The shift is worked from the rounded length the text prints, so the two numbers agree.
  const len = round50(distance(OBJECTS[longest].pos, sc.position));
  // The third line passes through the crossing; an accepted mark may sit near it, not on it.
  const off = offCrossing(state.marker, sc.position);
  return (
    <div data-controls="done">
      <H3 label={label}>המיקום נמצא ואומת</H3>
      <div className="mt-2 flex items-start gap-2 rounded-xl border border-brand bg-brand/10 px-3.5 py-2.5 font-display text-base font-bold leading-snug text-black" role="status" data-navsim-feedback={state.help.verify.solved ? 'verify-solved' : 'verify-right'} data-mark-off={off ?? 0}>
        <Check className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>
          {state.help.verify.solved ? <>הקו {OBJECTS[third].from}: </> : <>נכון: </>}
          <Ltr>{backAzimuthWorking(sc.readings[third])}</Ltr>. שלושת הקווים נפגשים בנקודה אחת, והיא המיקום שלכם.
          {off !== null && <> הסימון שלכם כ־{n(off)} מ׳ ממנה.</>}
        </span>
      </div>
      <P>
        בתרגיל המדידות אידאליות, ולכן הקווים נפגשים בנקודה אחת. במציאות כל מדידה סוטה מעט: סטייה של <Ltr>{`${REAL_ERROR_DEG}°`}</Ltr> בקו הארוך, {OBJECTS[longest].from} (כ־{n(len)} מ׳ עד המיקום), מזיזה אותו בכ־{n(round5(lineShiftAt(len)))} מ׳ ליד המיקום.
      </P>
      <P>הרצועות במפה מראות סטייה כזו בכל קו: המיקום הוא אזור, לא נקודה.</P>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="primary" size="md" onClick={() => dispatch({ type: 'nextScenario' })} data-autofocus>
          תרחיש נוסף
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/** Marks the map as the mark step's first focus target (the map lives outside the panel). */
function FocusMap() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-activity="navigation-sim"] [data-map-focus]');
    el?.setAttribute('data-autofocus', '');
    return () => el?.removeAttribute('data-autofocus');
  }, []);
  return null;
}

// ---------------------------------------------------------------- lines: one row per object

/** Object · its measurement · the line typed for it. */
const COLS = 'minmax(0, 1fr) 6.75rem 9.5rem';

function LineTable({ ids, state, dispatch, onActive, onEnter, autofocus }: { ids: readonly ObjectId[]; state: State; dispatch: Dispatch; onActive: (id: ObjectId | null) => void; onEnter: () => void; autofocus?: boolean }) {
  const v = viewOf(state);
  const uid = useId();
  return (
    <div className="mt-2.5" data-line-table>
      {/* One header line: each column's name, then whose direction it is */}
      <div className="grid items-baseline gap-x-3 whitespace-nowrap border-b border-border-subtle pb-1.5 leading-tight" style={{ gridTemplateColumns: COLS }} aria-hidden>
        <span className="font-display text-sm font-bold text-fg-muted">עצם</span>
        <span>
          <span className="font-display text-sm font-bold text-black">מדידה</span> <span className="text-sm text-fg-muted">מכם אליו</span>
        </span>
        <span>
          <span className="font-display text-sm font-bold text-black">קו במפה</span> <span className="text-sm text-fg-muted">ממנו אליכם</span>
        </span>
      </div>
      {ids.map((id, k) => {
        const verdict = v.verdict(id);
        const right = verdict?.kind === 'right';
        const raw = state.entries[id] ?? '';
        const over = parseAzimuth(raw) === 'over';
        const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
          const by = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
          if (by !== undefined) {
            e.preventDefault();
            dispatch({ type: 'nudge', id, by });
          } else if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        };
        return (
          <div key={id} className="border-b border-border-subtle py-1.5" data-line-row={id} data-verdict={verdict?.kind}>
            <div className="grid items-center gap-x-3" style={{ gridTemplateColumns: COLS }}>
              <label htmlFor={`${uid}-${id}`} className="font-display text-base font-bold text-black">
                {OBJECTS[id].name}
              </label>
              <span className="font-display text-lg font-bold text-black">
                <Deg v={v.scenario.readings[id]} />
              </span>
              <span className="flex items-center gap-1.5">
                <span dir="ltr" className="flex items-center">
                  <input
                    id={`${uid}-${id}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={3}
                    dir="ltr"
                    value={raw}
                    readOnly={right}
                    aria-label={`הקו ${OBJECTS[id].from}, אזימוט במעלות`}
                    aria-describedby={`${uid}-keys`}
                    aria-invalid={verdict ? !right : undefined}
                    onChange={(e) => dispatch({ type: 'setEntry', id, text: e.target.value })}
                    onKeyDown={onKey}
                    onFocus={() => onActive(id)}
                    onBlur={() => onActive(null)}
                    className={cn(
                      'h-9 w-[4.25rem] rounded-xl border bg-bg-elevated px-2 text-center font-display text-lg font-bold tabular-nums text-black placeholder:text-fg-dim/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      right ? 'border-brand bg-brand/10' : verdict ? 'border-accent-hot' : 'border-fg-dim/60',
                    )}
                    placeholder="___"
                    data-line-input={id}
                    {...((autofocus || k === 0) && !right ? { 'data-autofocus': true } : {})}
                  />
                  <span className="ms-0.5 font-display text-lg font-bold text-black">°</span>
                </span>
                {verdict &&
                  (right ? (
                    <>
                      <Check className="size-5 text-brand-dark" strokeWidth={3} aria-hidden />
                      <span className="sr-only">נכון</span>
                    </>
                  ) : (
                    <>
                      <X className="size-5 text-accent-hot" strokeWidth={3} aria-hidden />
                      <span className="sr-only">לא נכון</span>
                    </>
                  ))}
              </span>
            </div>
            {over && <p className="mt-1 text-sm text-fg-muted">מעל <Ltr>359°</Ltr>: מפחיתים <Ltr>360°</Ltr>.</p>}
          </div>
        );
      })}
      <p id={`${uid}-keys`} className="mt-1 text-sm text-fg-muted">
        החיצים <Ltr>↑ ↓</Ltr> מסובבים את הקו במעלה אחת.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- feedback

type Tone = 'info' | 'wrong' | 'right';

/** What a wrong line means, in one sentence — the mistake, never the answer. */
function lineCause(id: ObjectId, value: number, verdict: Exclude<LineVerdict, { kind: 'right' }>, reading: number): ReactNode {
  const o = OBJECTS[id];
  if (verdict.kind === 'reverse')
    return (
      <>
        הקו {o.from}: <Deg v={value} /> הוא המדידה עצמה, מכם אל העצם. במפה הקו יוצא מהעצם אליכם, בכיוון ההפוך.
      </>
    );
  if (verdict.kind === 'other-object')
    return verdict.reversed ? (
      <>
        הקו {o.from}: <Deg v={value} /> מתאים למדידה אל {OBJECTS[verdict.other].name}. כל קו נבנה מהמדידה אל העצם שממנו הוא יוצא.
      </>
    ) : (
      <>
        הקו {o.from}: <Deg v={value} /> הוא המדידה אל {OBJECTS[verdict.other].name}. כל קו נבנה מהמדידה אל העצם שלו, בכיוון ההפוך.
      </>
    );
  return (
    <>
      הקו {o.from}: <Deg v={value} /> אינו ההפך של <Deg v={reading} />. בין מדידה לאזימוט החוזר שלה יש בדיוק <Ltr>180°</Ltr>.
    </>
  );
}

/** The verdict of the step, and under it (same box, as in the terrain association) the hints asked for. */
function Feedback({ state, hints }: { state: State; hints?: ReactNode }) {
  const v = viewOf(state);
  const sc = v.scenario;
  let tone: Tone = 'info';
  let title: ReactNode = null;
  let lines: ReactNode[] = [];
  let kind = 'info';

  if (state.step === 'lines' && v.pair) {
    const verdicts = v.pair.map((id) => [id, v.verdict(id)] as const);
    const wrong = verdicts.filter(([, x]) => x && x.kind !== 'right') as [ObjectId, Exclude<LineVerdict, { kind: 'right' }>][];
    if (v.linesRight) {
      tone = 'right';
      kind = state.help.lines.solved ? 'lines-solved' : 'lines-right';
      title = state.help.lines.solved ? 'הפתרון: כל מדידה, בכיוון ההפוך.' : 'נכון: שני הקווים יוצאים מהעצמים אליכם.';
      lines = [
        ...v.pair.map((id) => (
          <span key={id}>
            {OBJECTS[id].name}: <Ltr>{backAzimuthWorking(sc.readings[id])}</Ltr>
          </span>
        )),
        'המיקום שלכם נמצא על שני הקווים.',
      ];
    } else if (wrong.length > 0) {
      tone = 'wrong';
      kind = `lines-${wrong.map(([, x]) => x.kind).join('+')}`;
      title = wrong.length === 2 ? 'שני הקווים לא תואמים את המדידות.' : `הקו ${OBJECTS[wrong[0][0]].from} לא תואם את המדידה.`;
      lines = wrong.map(([id, x]) => <span key={id}>{lineCause(id, v.value(id)!, x, sc.readings[id])}</span>);
    } else {
      kind = 'lines-live';
      title = 'הקווים במפה זזים לפי מה שאתם מקלידים.';
      lines = ['כשיש ערך בשני השדות, לחצו ״בדיקה״.'];
    }
  } else if (state.step === 'mark') {
    const mk = v.mark;
    if (state.help.mark.solved) {
      tone = 'right';
      kind = 'mark-solved';
      title = 'הפתרון: המיקום בנקודה שבה שני הקווים נחתכים.';
      lines = ['רק נקודה אחת נמצאת על שני הקווים יחד.'];
    } else if (mk?.kind === 'right') {
      // Accepted up to MARK_TOLERANCE_M: the distance is said, not hidden.
      const off = offCrossing(state.marker, sc.position);
      tone = 'right';
      kind = 'mark-right';
      title = off === null ? 'נכון: הסימון בחיתוך הקווים.' : `נכון: הסימון כ־${n(off)} מ׳ מהחיתוך.`;
      lines = [
        off === null
          ? 'זה המיקום שלכם לפי שתי המדידות. עכשיו בודקים אותו מול העצם השלישי.'
          : `סימון עד ${n(MARK_TOLERANCE_M)} מ׳ מהחיתוך מתקבל. המיקום עצמו בחיתוך, ואותו בודקים מול העצם השלישי.`,
      ];
    } else if (mk) {
      tone = 'wrong';
      kind = `mark-${mk.kind}`;
      if (mk.kind === 'one-line') {
        title = `הסימון על הקו ${OBJECTS[mk.on].from}, אבל רחוק מהקו ${OBJECTS[mk.off].from}.`;
        lines = ['המיקום שלכם צריך להיות על שני הקווים בבת אחת.'];
      } else if (mk.kind === 'near') {
        title = 'קרוב, אבל עדיין לא בחיתוך.';
        lines = ['קרבו את הסימון לנקודה שבה שני הקווים נפגשים.'];
      } else {
        title = 'הסימון לא נמצא על אף אחד מהקווים.';
        lines = ['כל קו מראה איפה אפשר להיות לפי מדידה אחת. אתם על שניהם.'];
      }
    } else {
      kind = state.marker ? 'mark-placed' : 'mark-empty';
      title = state.marker ? 'הסימון הוצב. אפשר להזיז אותו ואז ללחוץ ״בדיקה״.' : 'עדיין אין סימון במפה.';
    }
  } else if (state.step === 'verify' && v.third) {
    const x = v.verdict(v.third);
    if (x && x.kind !== 'right') {
      tone = 'wrong';
      kind = `verify-${x.kind}`;
      title = `הקו ${OBJECTS[v.third].from} לא תואם את המדידה.`;
      lines = [lineCause(v.third, v.value(v.third)!, x, sc.readings[v.third])];
    } else {
      kind = 'verify-live';
      title = 'הקו במפה זז לפי מה שאתם מקלידים.';
    }
  } else return null;

  const icon = tone === 'right' ? <Check className="mt-0.5 size-5 shrink-0" aria-hidden /> : tone === 'wrong' ? <X className="mt-0.5 size-5 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-5 shrink-0" aria-hidden />;
  return (
    // Announced once per check (keyed by the check count).
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn('mt-2.5 rounded-xl border px-3.5 py-2', tone === 'right' ? 'border-brand bg-brand/10' : tone === 'wrong' ? 'border-accent-hot/60 bg-bg-accent' : 'border-dashed border-border bg-bg-accent/50')}
      data-navsim-feedback={kind}
    >
      <div key={`${kind}-${state.checks}`}>
        <div className="flex items-start gap-2 font-display text-base font-bold leading-snug text-black">
          {icon}
          <span>{title}</span>
        </div>
        {lines.length > 0 && (
          <ul className="mt-1 space-y-1 ps-7 text-base leading-snug text-black">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>
      {hints}
    </div>
  );
}

// ---------------------------------------------------------------- hints and the solution

function hintText(state: State, stage: Stage, level: 1 | 2): ReactNode {
  const v = viewOf(state);
  const sc = v.scenario;
  if (stage === 'mark') {
    if (level === 1) return 'כל קו מסמן את כל המקומות האפשריים לפי מדידה אחת. רק נקודה אחת נמצאת על שניהם.';
    // Follow the line the mark is on (when it is on one) to the other.
    const [a, b] = v.mark?.kind === 'one-line' ? [v.mark.on, v.mark.off] : v.pair!;
    return (
      <>
        עקבו אחרי הקו {OBJECTS[a].from} עד שהוא פוגש את הקו {OBJECTS[b].from}, וסמנו שם.
      </>
    );
  }
  if (level === 1) return 'המדידה יצאה מכם אל העצם. על המפה מתחילים בעצם וחוזרים אליכם: אותו קו, בכיוון ההפוך.';
  // Level 2: the rule, worked on the first line that is still wrong — the result left open.
  const ids = stage === 'lines' ? v.pair! : [v.third!];
  const id = ids.find((x) => !v.isRight(x)) ?? ids[0];
  const r = sc.readings[id];
  return (
    <>
      מתחת ל־<Ltr>180°</Ltr> מוסיפים <Ltr>180°</Ltr>, ומ־<Ltr>180°</Ltr> ומעלה מפחיתים <Ltr>180°</Ltr>. {OBJECTS[id].name}: <Ltr>{`${fmtDeg(r)} ${r < 180 ? '+' : '−'} 180° = ?`}</Ltr>
    </>
  );
}

/** The hint and solution offers: beside the step's main button (the same focus order as before: check, hint, solution). */
function HelpButtons({ state, stage, dispatch }: { state: State; stage: Stage; dispatch: Dispatch }) {
  const offer = helpOffer(state, stage);
  const h = state.help[stage];
  if (!offer.hint && !offer.solve) return null;
  return (
    <div className="flex flex-wrap gap-2" data-help={stage}>
      {offer.hint && (
        <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'hint', stage })}>
          <Lightbulb className="size-4" aria-hidden />
          {h.hint === 0 ? 'רמז' : 'רמז נוסף'}
        </Button>
      )}
      {offer.solve && (
        <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'solve', stage })}>
          הצגת הפתרון
        </Button>
      )}
    </div>
  );
}

/** The hints asked for, in the feedback box under the verdict. */
function Hints({ state, stage }: { state: State; stage: Stage }) {
  const offer = helpOffer(state, stage);
  const h = state.help[stage];
  if (!offer.show) return null;
  return (
    <ol className="mt-1.5 space-y-1 border-t border-border-subtle pt-1.5 text-base leading-snug text-black" data-help={stage}>
      {([1, 2] as const)
        .filter((k) => k <= h.hint)
        .map((k) => (
          <li key={k} className="flex items-start gap-2" data-hint={k}>
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>
              <span className="font-display font-bold">רמז {k}: </span>
              {hintText(state, stage, k)}
            </span>
          </li>
        ))}
    </ol>
  );
}

// ---------------------------------------------------------------- screen-reader position of the mark

function MarkAnnouncer({ state }: { state: State }) {
  const at = state.step === 'mark' ? state.marker : null;
  return (
    <span className="sr-only" aria-live="polite" aria-atomic="true">
      {at ? `הסימון: ${n(Math.round(at.E))} מזרח, ${n(Math.round(at.N))} צפון ברשת המפה.` : ''}
    </span>
  );
}
