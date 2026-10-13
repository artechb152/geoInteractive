'use client';
import { useEffect, useId, useReducer, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { L } from '../Ltr';
import { Calculator } from './Calculator';
import { useRovingKeys } from '../scale/controls';
import {
  AXES, AXIS_NAME, FORMATS, FORMAT_INFO, HINTS, LEAD, MODE_LINE, OPS, OP_SIGN, PICK_ORDER, REFLECT, REFLECT_ASK, RULE, SOURCE, STEPS, STEP_TITLE, TITLE,
  activeStep, formatNote, formatOpen, formatValue, hintText, initialState, judge, numbers, pickLabel, reducer, stepAsk, stepDone,
  successText, wrongText,
  type Action, type Axis, type FormatId, type Op, type Pick, type State, type Step, type Track,
} from './base60';

/* ─────────── חלוקה ב־60 — פירוק המספר, צעד אחר צעד ───────────
   Mockup: design/mockups/base60-concepts-2026-10-12/02-number-workbench.png (alternative 2);
   arithmetic, copy and states: claude-code-handoff.txt there, logic in ./base60.ts.
   Steps at inline start (visual right), the number track at inline end, the coordinate and its
   four writings in a band under both. The track is a diagram: left to right like the number
   it decomposes (whole parts left, fractions right), so it is dir="ltr" and never mirrored. */

const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD_CLS = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';
const HEADING = 'font-display font-bold leading-snug text-black text-lg md:text-xl';
const LABEL = 'text-base font-display font-bold text-black';
const BODY = 'text-base leading-relaxed text-black';
// the scene's choice language (CoordinatesPart2Scene CHOICE / choiceTone)
const CHOICE =
  'rounded-xl border cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const choiceTone = (on: boolean) => (on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]');
const EASE = [0.22, 1, 0.36, 1] as const;

type Act = (a: Action, focus?: string) => void;

/** Where focus lands when a track's active step (or its end) is shown. */
const focusOf = (t: Track) => {
  const k = activeStep(t);
  return k ? `step-${k}` : 'summary';
};

/** Copy with [[…]] runs: each run in its own LTR isolate. */
function Rich({ c }: { c: string }) {
  return <>{c.split(/\[\[(.*?)\]\]/).map((part, i) => (i % 2 ? <L key={i}>{part}</L> : part))}</>;
}

export function Base60Workbench() {
  const [s, dispatch] = useReducer(reducer, undefined, initialState);
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const act: Act = (a, focus) => {
    if (focus) focusNext.current = focus;
    dispatch(a);
  };
  useEffect(() => {
    const key = focusNext.current;
    if (!key) return;
    focusNext.current = null;
    rootRef.current?.querySelector<HTMLElement>(`[data-focus="${key}"]`)?.focus();
  });

  const t = s[s.axis];
  return (
    <div ref={rootRef} className="my-10" data-base60="">
      <h3 className={H3}>{TITLE}</h3>
      <p className={LEAD_CLS}>{LEAD}</p>

      <div className="surface-elevated p-6" data-axis={s.axis} data-mode={t.mode} data-done={t.done}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.87fr)] lg:gap-0">
          <Steps s={s} act={act} uid={uid} />

          <div className="min-w-0 lg:ps-6">
            <div className="flex items-center justify-between gap-3">
              <Calculator />
              <AxisSwitch axis={s.axis} uid={uid} onSelect={(axis) => act({ type: 'axis', axis })} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <NumberTrack key={s.axis} s={s} act={act} uid={uid} />
            </div>
            <p data-track-note="" className="mt-3 rounded-xl bg-bg-accent/60 px-4 py-3 text-center text-base leading-relaxed text-black">
              <Rich c={activeStep(t) ? RULE : formatNote(s.axis, t.fmt)} />
            </p>
          </div>
        </div>

        <Band s={s} act={act} uid={uid} />

        {/* one polite line per change of state */}
        <p aria-live="polite" className="sr-only">
          <span key={s.say.n}>{s.say.text}</span>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── the steps (inline start) ─────────────────── */

function Steps({ s, act, uid }: { s: State; act: Act; uid: string }) {
  const t = s[s.axis];
  const step = activeStep(t);
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:border-e lg:border-border-subtle lg:pe-5">
      <p className={LABEL} data-mode-line="">
        {MODE_LINE[t.mode]}
      </p>
      <ol className="flex flex-col gap-3">
        {STEPS.map((k) => (
          <StepCard key={k} k={k} state={k <= t.done ? 'done' : k === step ? 'active' : 'pending'} s={s} act={act} uid={uid} />
        ))}
      </ol>
      {/* until the end, the summary's place is kept so the column already has its finished height */}
      {step ? <Summary ghost s={s} act={act} uid={uid} /> : <Summary s={s} act={act} uid={uid} />}
    </div>
  );
}

function StepCard({ k, state, s, act, uid }: { k: Step; state: 'done' | 'active' | 'pending'; s: State; act: Act; uid: string }) {
  const t = s[s.axis];
  const active = state === 'active';
  const done = stepDone(s.axis, k);
  return (
    <li
      data-step={k}
      data-state={state}
      aria-current={active ? 'step' : undefined}
      className={cn(
        'rounded-xl border bg-bg-elevated p-4 transition-colors duration-200 ease-snap motion-reduce:transition-none',
        active ? 'border-accent ring-1 ring-accent' : 'border-border',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-xl font-display text-base font-bold transition-colors duration-200 motion-reduce:transition-none',
            active ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
          )}
        >
          <L>{k}</L>
        </span>
        <h4 tabIndex={-1} data-focus={`step-${k}`} className={cn(HEADING, 'min-w-0 flex-1 outline-none')}>
          {STEP_TITLE[k]}
          {state === 'done' && <span className="sr-only"> (הושלם)</span>}
        </h4>
        {state === 'done' && (
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-dark text-white">
            <Icon name="check" size={15} strokeWidth={2.5} />
          </span>
        )}
      </div>

      {/* the card keeps its finished size from the start: the done text holds its cell, unseen, until
          the step is done; the active step's body shares that cell */}
      <div className="mt-3 grid [&>*]:col-start-1 [&>*]:row-start-1">
        <div className={cn(state !== 'done' && 'invisible')}>
          <p className={BODY}>{done.text}</p>
          <p className={BODY}>
            <L>{done.eq}</L>
          </p>
        </div>

        {active && t.mode === 'guided' && (
          <div className="space-y-3">
            <p id={`${uid}-ask`} className={BODY}>
              <Rich c={stepAsk(s.axis, k, 'guided')} />
            </p>
            <Button variant="primary" size="md" className="w-full" data-focus="next" onClick={() => act({ type: 'next' }, k === 3 ? 'summary' : 'next')}>
              הצעד הבא
              <Icon name="arrow-left" size={16} strokeWidth={2} />
            </Button>
          </div>
        )}

        {active && t.mode === 'practice' && <PracticeBody k={k} s={s} act={act} uid={uid} />}
      </div>
    </li>
  );
}

function PracticeBody({ k, s, act, uid }: { k: Step; s: State; act: Act; uid: string }) {
  const t = s[s.axis];
  const a = t.attempt;
  const maxed = a.hints >= HINTS[k];
  const idle = k === 1 ? a.pick === null : a.op === null && !a.value.trim();
  const check = () => act({ type: 'check' }, judge(s.axis, k, a) === 'right' ? (k === 3 ? 'summary' : `step-${k + 1}`) : undefined);
  const msg = a.msg;
  return (
    <div className="space-y-3">
      <p id={`${uid}-ask`} className={BODY}>
        <Rich c={stepAsk(s.axis, k, 'practice')} />
      </p>

      {k === 1 ? (
        <Choices
          label="החלק שנשמר"
          ids={PICK_ORDER}
          value={a.pick}
          cols={3}
          render={(p: Pick) => <L>{pickLabel(s.axis, p)}</L>}
          onSelect={(pick) => act({ type: 'pick', pick })}
        />
      ) : (
        <Choices
          label="הפעולה"
          ids={OPS}
          value={a.op}
          cols={2}
          render={(op: Op) => <L>{`${OP_SIGN[op]} 60`}</L>}
          onSelect={(op) => act({ type: 'op', op })}
          // a click leads on to the result's field in the track, while it is still empty
          onClick={(op) => act({ type: 'op', op }, a.value.trim() ? undefined : `answer-${k}`)}
        />
      )}

      <PrimaryAction className="w-full" inactive={idle} onClick={check}>
        בדיקת תשובה
      </PrimaryAction>
      <Button
        variant="secondary"
        size="md"
        className={cn('w-full', maxed && 'cursor-not-allowed opacity-45 hover:bg-paper-bright/70 active:translate-y-0')}
        aria-disabled={maxed || undefined}
        onClick={maxed ? undefined : () => act({ type: 'hint' })}
      >
        {a.hints ? 'רמז נוסף' : 'רמז'}
      </Button>

      {msg && (
        <Feedback tone={msg.kind === 'hint' ? 'info' : 'wrong'}>
          {msg.kind === 'hint' && (
            <p className={LABEL}>
              רמז <L>{msg.level}</L> מתוך <L>{HINTS[k]}</L>
            </p>
          )}
          <p className={BODY}>
            <Rich c={msg.kind === 'hint' ? hintText(s.axis, k, msg.level) : wrongText(s.axis, k, msg.why)} />
          </p>
        </Feedback>
      )}
    </div>
  );
}

/** A small radio group in the lesson's choice language, with RTL roving arrows. */
function Choices<T extends string>({
  label,
  ids,
  value,
  cols,
  render,
  onSelect,
  onClick,
}: {
  label: string;
  ids: readonly T[];
  value: T | null;
  cols: 2 | 3;
  render: (id: T) => ReactNode;
  onSelect: (id: T) => void;
  onClick?: (id: T) => void;
}) {
  const current = value ?? ids[0];
  const { onKeyDown, register } = useRovingKeys(ids, current, onSelect);
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-3', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')} onKeyDown={onKeyDown}>
      {ids.map((id) => {
        const on = value === id;
        return (
          <button
            key={id}
            ref={register(id)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={id === current ? 0 : -1}
            onClick={() => (onClick ?? onSelect)(id)}
            className={cn(CHOICE, choiceTone(on), 'h-12 font-display text-lg font-bold tabular-nums text-fg')}
          >
            {render(id)}
          </button>
        );
      })}
    </div>
  );
}

/** `ghost`: laid out but unseen and unreachable — it only holds the summary's place. */
function Summary({ s, act, uid, ghost }: { s: State; act: Act; uid: string; ghost?: boolean }) {
  const t = s[s.axis];
  const n = numbers(s.axis);
  if (ghost)
    return (
      <div aria-hidden className="pointer-events-none invisible space-y-3">
        <Feedback tone="right" quiet>
          {t.mode === 'guided' && <p className={LABEL}>&nbsp;</p>}
          <p className={BODY}>
            <Rich c={successText(s.axis, t.mode)} />
          </p>
        </Feedback>
        {t.mode === 'guided' || s.axis === 'lon' ? <div className="h-12" /> : <div className="h-28" />}
      </div>
    );
  return (
    <div tabIndex={-1} data-focus="summary" data-summary={t.mode} className="space-y-3 outline-none">
      <Feedback tone="right">
        {t.mode === 'guided' && (
          <p className={LABEL}>
            <L>{`${n.src}° = ${formatValue(SOURCE[s.axis], 'DMS')}`}</L>
          </p>
        )}
        <p className={BODY}>
          <Rich c={successText(s.axis, t.mode)} />
        </p>
      </Feedback>

      {t.mode === 'guided' ? (
        <Button variant="primary" size="md" className="w-full" onClick={() => act({ type: 'practice' }, 'step-1')}>
          השלימו בעצמכם
          <Icon name="arrow-left" size={16} strokeWidth={2} />
        </Button>
      ) : s.axis === 'lon' ? (
        <Button variant="primary" size="md" className="w-full" onClick={() => act({ type: 'axis', axis: 'lat' }, focusOf(s.lat))}>
          משימה נוספת: קו רוחב
          <Icon name="arrow-left" size={16} strokeWidth={2} />
        </Button>
      ) : (
        <div>
          <p id={`${uid}-reflect`} className={cn(LABEL, 'mb-2')}>
            {REFLECT_ASK}
          </p>
          <ReflectChoices value={s.reflect} labelledBy={`${uid}-reflect`} onSelect={(part) => act({ type: 'reflect', part })} />
          {s.reflect && (
            <Feedback tone="info" className="mt-3">
              <p className={BODY}>{REFLECT.find((r) => r.id === s.reflect)!.tip}</p>
            </Feedback>
          )}
        </div>
      )}
    </div>
  );
}

const REFLECT_IDS = REFLECT.map((r) => r.id);

function ReflectChoices({ value, labelledBy, onSelect }: { value: State['reflect']; labelledBy: string; onSelect: (p: (typeof REFLECT_IDS)[number]) => void }) {
  const current = value ?? REFLECT_IDS[0];
  const { onKeyDown, register } = useRovingKeys(REFLECT_IDS, current, onSelect);
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-3 gap-2" onKeyDown={onKeyDown}>
      {REFLECT.map((r) => (
        <button
          key={r.id}
          ref={register(r.id)}
          type="button"
          role="radio"
          aria-checked={value === r.id}
          tabIndex={r.id === current ? 0 : -1}
          onClick={() => onSelect(r.id)}
          className={cn(CHOICE, choiceTone(value === r.id), 'min-h-12 px-2 py-2 font-display text-[15px] font-bold leading-tight text-fg')}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────── the axis switch ─────────────────── */

function AxisSwitch({ axis, uid, onSelect }: { axis: Axis; uid: string; onSelect: (a: Axis) => void }) {
  const { onKeyDown, register } = useRovingKeys(AXES, axis, onSelect);
  return (
    <div className="flex items-center justify-end gap-3">
      <span id={`${uid}-axis`} className={BODY}>
        בחרו קו להצגה:
      </span>
      <div role="radiogroup" aria-labelledby={`${uid}-axis`} className="flex gap-2" onKeyDown={onKeyDown}>
        {AXES.map((a) => (
          <button
            key={a}
            ref={register(a)}
            type="button"
            role="radio"
            aria-checked={axis === a}
            tabIndex={axis === a ? 0 : -1}
            data-axis-option={a}
            onClick={() => onSelect(a)}
            className={cn(CHOICE, choiceTone(axis === a), 'h-10 min-w-[6.5rem] px-5 font-display text-base font-bold text-fg')}
          >
            {AXIS_NAME[a]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── the number track (inline end) ─────────────────── */

/* Lanes (% of the track's width), left to right: whole degrees · whole minutes · seconds, and the
   fractions' work lane between the last two. Rows are fixed px so nothing moves as nodes arrive. */
const LANE = { A: 17, B: 47, C: 79, BC: 63, MID: 50 } as const;
const Y = {
  src: 0,
  srcH: 64,
  split1: 81,
  r1: 98,
  r1H: 52,
  arrow: 184,
  eq2: 200,
  r2: 222,
  r2H: 48,
  split2: 316,
  r3: 332,
  r3H: 50,
  eq3: 428,
  eqH: 48,
  keptA: 206,
  keptB: 438,
  fin: 508,
  finH: 56,
  height: 598,
} as const;
const EQ_W = 120;

type Tone = 'idle' | 'active' | 'chosen';
const BOX_TONE: Record<Tone, string> = {
  idle: 'border border-border bg-bg-accent',
  active: 'border-2 border-accent bg-accent/10',
  chosen: 'border border-accent bg-accent/10',
};

function NumberTrack({ s, act, uid }: { s: State; act: Act; uid: string }) {
  const reduce = !!useReducedMotion();
  const t = s[s.axis];
  const step = activeStep(t);
  const n = numbers(s.axis);
  const practice = t.mode === 'practice';
  const a = t.attempt;
  const emphasis = practice && a.hints > 0;
  // once decomposed, the chosen writing is marked on the nodes it is read from
  const chosen = (f: FormatId[]) => (!step && f.includes(t.fmt) ? 'chosen' : 'idle');
  const tone = (k: Step, f: FormatId[]): Tone => (step === k ? 'active' : chosen(f));
  const [srcWhole, srcFrac] = n.src.split('.');
  const pickOn = (p: Pick) => practice && step === 1 && (a.pick === p || a.pick === 'all');
  const motionOf = (delay: number) => ({ reduce, delay });

  return (
    <div
      dir="ltr"
      role="group"
      aria-label={`מסלול הפירוק של ${n.src}°`}
      className="relative min-w-[560px]"
      style={{ height: Y.height }}
      data-track=""
    >
      <AnimatePresence initial={false}>
        {/* the source */}
        <Box key="src" id="src" x={LANE.MID} top={Y.src} w={240} h={Y.srcH} size="text-4xl" tone={tone(1, ['D'])} m={motionOf(0)}>
          <span className={cn('rounded-md px-0.5 transition-colors duration-200 motion-reduce:transition-none', pickOn('whole') && 'bg-accent/20')}>{srcWhole}</span>
          <span
            className={cn(
              'rounded-md px-0.5 transition-colors duration-200 motion-reduce:transition-none',
              pickOn('frac') && 'bg-accent/20',
              practice && step === 1 && a.hints > 0 && 'underline decoration-accent decoration-2 underline-offset-[7px]',
            )}
          >
            .{srcFrac}
          </span>
          °
        </Box>

        {/* step 1: the whole degrees stay; the fraction moves on */}
        {t.done >= 1 && <Split key="split1" from={LANE.MID} fromY={Y.srcH} midY={Y.split1} to={[LANE.A, LANE.BC]} toY={Y.r1} m={motionOf(0)} />}
        {t.done >= 1 && (
          <Box key="deg" id="deg" x={LANE.A} top={Y.r1} w={150} h={Y.r1H} size="text-2xl" tone={chosen(['DM'])} caption={KEPT} m={motionOf(0.12)}>
            {n.deg}°
          </Box>
        )}
        {t.done >= 1 && (
          <Box key="degFrac" id="degFrac" x={LANE.BC} top={Y.r1} w={176} h={Y.r1H} size="text-2xl" tone={tone(2, [])} ring={step === 2 && emphasis} caption="שבר המעלה" m={motionOf(0.12)}>
            {n.degFrac}°
          </Box>
        )}

        {/* step 2: the fraction × 60 → minutes */}
        {practice && step === 2 && (
          <Equation key="eq2" x={LANE.BC} top={Y.eq2} lhs={<Lhs frac={n.degFrac} op={a.op} />} unit="′" m={motionOf(0)}>
            <Answer uid={uid} step={2} unit="בדקות" value={a.value} onChange={(value) => act({ type: 'input', value })} onEnter={() => act({ type: 'check' }, judge(s.axis, 2, a) === 'right' ? 'step-3' : undefined)} />
          </Equation>
        )}
        {t.done >= 2 && <Times60 key="arrow" x={LANE.BC} top={Y.arrow} m={motionOf(0)} />}
        {t.done >= 2 && (
          <Box key="minAll" id="minAll" x={LANE.BC} top={Y.r2} w={200} h={Y.r2H} size="text-2xl" tone={chosen(['DM'])} caption="דקות" m={motionOf(0.15)}>
            {n.minAll}′
          </Box>
        )}

        {/* step 3: the whole minutes stay; the minute's fraction × 60 → seconds */}
        {t.done >= 2 && <Split key="split2" from={LANE.BC} fromY={Y.r2 + Y.r2H + 28} midY={Y.split2} to={[LANE.B, LANE.C]} toY={Y.r3} m={motionOf(0.3)} />}
        {t.done >= 2 && (
          <Box key="min" id="min" x={LANE.B} top={Y.r3} w={140} h={Y.r3H} size="text-2xl" tone="idle" caption={KEPT} m={motionOf(0.4)}>
            {n.min}′
          </Box>
        )}
        {t.done >= 2 && (
          <Box key="minFrac" id="minFrac" x={LANE.C} top={Y.r3} w={160} h={Y.r3H} size="text-2xl" tone={tone(3, [])} ring={step === 3 && emphasis} caption="שבר הדקה" m={motionOf(0.4)}>
            {n.minFrac}′
          </Box>
        )}
        {practice && step === 3 && (
          <Equation key="eq3" x={LANE.C} top={Y.eq3} lhs={<Lhs frac={n.minFrac} op={a.op} />} unit="″" m={motionOf(0)}>
            <Answer uid={uid} step={3} unit="בשניות" value={a.value} onChange={(value) => act({ type: 'input', value })} onEnter={() => act({ type: 'check' }, judge(s.axis, 3, a) === 'right' ? 'summary' : undefined)} />
          </Equation>
        )}
        {t.done >= 3 && (
          <Equation key="eq3-done" x={LANE.C} top={Y.eq3} lhs={<Lhs frac={n.minFrac} op="mul" />} unit="″" m={motionOf(0)}>
            <div data-node="sec" className={cn('flex size-full items-center justify-center rounded-xl font-display text-xl font-bold tabular-nums text-black', BOX_TONE.idle)}>
              {n.sec}
            </div>
          </Equation>
        )}

        {/* the writing: each part comes down its own lane — the degrees and minutes from where they were kept */}
        {t.done >= 3 && <Kept key="keptA" x={LANE.A} y1={Y.keptA} y2={Y.fin} m={motionOf(0.15)} />}
        {t.done >= 3 && <Kept key="keptB" x={LANE.B} y1={Y.keptB} y2={Y.fin} m={motionOf(0.15)} />}
        {t.done >= 3 && <Kept key="keptC" x={LANE.C} y1={Y.eq3 + Y.eqH} y2={Y.fin} m={motionOf(0.15)} />}
        {t.done >= 3 && (
          <Box key="finDeg" id="finDeg" x={LANE.A} top={Y.fin} w={168} h={Y.finH} size="text-3xl" tone={chosen(['DMS', 'S'])} caption="מעלות" m={motionOf(0.35)}>
            {n.deg}°
          </Box>
        )}
        {t.done >= 3 && (
          <Box key="finMin" id="finMin" x={LANE.B} top={Y.fin} w={156} h={Y.finH} size="text-3xl" tone={chosen(['DMS', 'S'])} caption="דקות" m={motionOf(0.35)}>
            {n.min2}′
          </Box>
        )}
        {t.done >= 3 && (
          <Box key="finSec" id="finSec" x={LANE.C} top={Y.fin} w={190} h={Y.finH} size="text-3xl" tone={chosen(['DMS', 'S'])} caption="שניות" m={motionOf(0.35)}>
            {n.sec2}″
          </Box>
        )}
      </AnimatePresence>
    </div>
  );
}

const KEPT = (
  <>
    החלק השלם
    <br />
    (נשמר)
  </>
);

type M = { reduce: boolean; delay: number };

/** A node arriving: a short drop-in after its step's action; instant under reduced motion. */
function appear({ reduce, delay }: M) {
  return {
    initial: { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: reduce ? 0 : 0.15 } },
    transition: { duration: reduce ? 0 : 0.28, delay: reduce ? 0 : delay, ease: EASE },
  };
}

function Box({
  id,
  x,
  top,
  w,
  h,
  size,
  tone,
  ring,
  caption,
  m,
  children,
}: {
  id: string;
  x: number;
  top: number;
  w: number;
  h: number;
  size: string;
  tone: Tone;
  ring?: boolean;
  caption?: ReactNode;
  m: M;
  children: ReactNode;
}) {
  return (
    <motion.div className="absolute" style={{ left: `calc(${x}% - ${w / 2}px)`, top, width: w }} {...appear(m)}>
      <div
        data-node={id}
        data-tone={tone}
        className={cn(
          'flex items-center justify-center rounded-xl font-display font-bold leading-none tabular-nums text-black transition-[background-color,border-color,box-shadow] duration-200 ease-snap motion-reduce:transition-none',
          size,
          BOX_TONE[tone],
          ring && 'ring-4 ring-accent/25',
        )}
        style={{ height: h }}
      >
        {children}
      </div>
      {caption && (
        <p dir="rtl" className="mt-1.5 text-center text-base leading-snug text-black">
          {caption}
        </p>
      )}
    </motion.div>
  );
}

const LINE = 'absolute border-fg-dim';

/** One value splitting in two: down from `from`, across, and down into each of `to`. */
function Split({ from, fromY, midY, to, toY, m }: { from: number; fromY: number; midY: number; to: [number, number]; toY: number; m: M }) {
  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-0" {...appear(m)}>
      <span className={cn(LINE, 'w-0 border-l-[1.5px]')} style={{ left: `${from}%`, top: fromY, height: midY - fromY }} />
      <span className={cn(LINE, 'h-0 border-t-[1.5px]')} style={{ left: `${to[0]}%`, width: `${to[1] - to[0]}%`, top: midY }} />
      {to.map((x) => (
        <span key={x} className={cn(LINE, 'w-0 border-l-[1.5px]')} style={{ left: `${x}%`, top: midY, height: toY - midY }} />
      ))}
    </motion.div>
  );
}

/** A kept part carried down its lane to the writing: drawn from the top. */
function Kept({ x, y1, y2, m }: { x: number; y1: number; y2: number; m: M }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute w-0 border-l-2 border-dashed border-fg-dim/70"
      style={{ left: `calc(${x}% - 1px)`, top: y1, height: y2 - y1, originY: 0 }}
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      exit={{ opacity: 0, transition: { duration: m.reduce ? 0 : 0.15 } }}
      transition={{ duration: m.reduce ? 0 : 0.35, delay: m.reduce ? 0 : m.delay, ease: EASE }}
    />
  );
}

/** ↓ × 60 between the degree's fraction and the minutes. */
function Times60({ x, top, m }: { x: number; top: number; m: M }) {
  return (
    <motion.div aria-hidden className="absolute flex items-center gap-1.5" style={{ left: `calc(${x}% - 7px)`, top, height: 34 }} {...appear(m)}>
      <svg width="14" height="34" viewBox="0 0 14 34" className="text-accent">
        <path d="M7 1v30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M2 25l5 7 5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-lg font-bold text-black">× 60</span>
    </motion.div>
  );
}

/** "0.404 × 60 =" — the operator follows the learner's choice; "?" until there is one. */
function Lhs({ frac, op }: { frac: string; op: Op | null }) {
  return (
    <>
      {frac} <span className={op ? undefined : 'text-fg-dim'}>{op ? OP_SIGN[op] : '?'}</span> 60 =
    </>
  );
}

/** The result's box centred on its lane; the operation to its left, the unit to its right. */
function Equation({ x, top, lhs, unit, m, children }: { x: number; top: number; lhs: ReactNode; unit: string; m: M; children: ReactNode }) {
  return (
    <motion.div className="absolute" style={{ left: `calc(${x}% - ${EQ_W / 2}px)`, top, width: EQ_W, height: Y.eqH }} {...appear(m)}>
      {/* physical sides on purpose: inside this LTR diagram the RTL plugin's start/end utilities
          still resolve against the page's dir="rtl" */}
      <span data-eq-part="" className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-display text-lg font-bold tabular-nums text-black" style={{ right: '100%', marginRight: 12 }}>
        {lhs}
      </span>
      {children}
      <span data-eq-part="" className="absolute top-1/2 -translate-y-1/2 font-display text-xl font-bold text-black" style={{ left: '100%', marginLeft: 6 }}>
        {unit}
      </span>
    </motion.div>
  );
}

function Answer({ uid, step, unit, value, onChange, onEnter }: { uid: string; step: 2 | 3; unit: string; value: string; onChange: (v: string) => void; onEnter: () => void }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      dir="ltr"
      // per step: the previous step's field may still be fading out
      data-focus={`answer-${step}`}
      aria-label={`התוצאה ${unit}`}
      aria-describedby={`${uid}-ask`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        onEnter();
      }}
      className="size-full rounded-xl border-2 border-accent bg-bg-elevated px-2 text-center font-display text-xl font-bold tabular-nums text-black"
    />
  );
}

/* ─────────────────── the band: back, reset, the coordinate, its writings ─────────────────── */

function Band({ s, act, uid }: { s: State; act: Act; uid: string }) {
  const t = s[s.axis];
  const open = FORMATS.filter((f) => formatOpen(f, t.done));
  const { onKeyDown, register } = useRovingKeys(open, t.fmt, (fmt) => act({ type: 'format', fmt }));
  const atStart = t.done === 0;
  const info = FORMAT_INFO[t.fmt];
  return (
    <div className="mt-6 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            size="md"
            className={cn('px-4', atStart && 'cursor-not-allowed opacity-45 hover:bg-paper-bright/70 active:translate-y-0')}
            aria-disabled={atStart || undefined}
            onClick={atStart ? undefined : () => act({ type: 'back' })}
          >
            <Undo2 className="size-4" strokeWidth={2} aria-hidden />
            חזור צעד
          </Button>
          <Button variant="ghost" size="md" className="px-4" onClick={() => act({ type: 'reset' })}>
            <Icon name="refresh" size={16} strokeWidth={2} />
            איפוס
          </Button>
        </div>

        <div className="min-w-[14rem] flex-1">
          <p id={`${uid}-coord`} className="mb-2 text-center text-base text-black">
            קואורדינטה ({AXIS_NAME[s.axis]}):
          </p>
          <output
            aria-labelledby={`${uid}-coord`}
            data-coordinate=""
            className="flex h-12 items-center justify-center rounded-xl border border-border bg-bg-accent font-display text-2xl font-bold tabular-nums text-black"
          >
            <L>{formatValue(SOURCE[s.axis], t.fmt)}</L>
          </output>
        </div>

        <span aria-hidden className="w-px self-stretch bg-border" />

        <div className="shrink-0">
          <p id={`${uid}-fmt`} className="mb-2 text-center text-base text-black">
            תצוגה בצורות כתיבה שונות (אותה נקודה)
          </p>
          {/* D → DM → DMS → S, left to right like the writings themselves */}
          <div role="radiogroup" aria-labelledby={`${uid}-fmt`} dir="ltr" className="grid grid-cols-4 gap-2" onKeyDown={onKeyDown}>
            {FORMATS.map((f) => {
              const on = t.fmt === f;
              const closed = !formatOpen(f, t.done);
              return (
                <button
                  key={f}
                  ref={closed ? undefined : register(f)}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={closed || undefined}
                  tabIndex={on ? 0 : -1}
                  data-format={f}
                  onClick={closed ? undefined : () => act({ type: 'format', fmt: f })}
                  className={cn(CHOICE, choiceTone(on), 'h-12 w-[5.5rem] font-display text-base font-bold text-fg', closed && 'cursor-not-allowed opacity-45 hover:border-border hover:bg-bg-elevated')}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* what the chosen writing is, in words; each writing has its own as soon as it opens */}
      <p data-format-info={t.fmt} className="mt-4 rounded-xl bg-bg-accent/60 px-4 py-3 text-base leading-relaxed text-black">
        <span className="font-display font-bold">
          <L>{t.fmt}</L> · {info.name}:
        </span>{' '}
        <Rich c={info.text} />
      </p>
    </div>
  );
}

/* ─────────────────── shared parts (as in datum-field/DatumFieldChallenge.tsx) ─────────────────── */

/** The lesson's primary button (Button primary · md classes), aria-disabled so focus stays. */
function PrimaryAction({ children, onClick, inactive, className }: { children: ReactNode; onClick: () => void; inactive: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-disabled={inactive || undefined}
      onClick={inactive ? undefined : onClick}
      className={cn(
        'inline-flex items-center justify-center select-none whitespace-nowrap font-display transition-all duration-200 ease-snap',
        'h-12 px-6 text-[15px] gap-2 rounded-xl',
        'bg-cta-ember font-bold text-white shadow-cta-ember hover:brightness-105 active:translate-y-px',
        inactive && 'opacity-45 cursor-not-allowed hover:brightness-100 active:translate-y-0',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Feedback next to the action: an inset tinted by its meaning; one glyph (✓ / ✕) when it is a verdict.
    `quiet`: a placeholder's copy, unmarked. */
function Feedback({ tone, children, className, quiet }: { tone: 'info' | 'wrong' | 'right'; children: ReactNode; className?: string; quiet?: boolean }) {
  return (
    <div data-feedback={quiet ? undefined : tone} className={cn('rounded-xl p-3.5', tone === 'right' ? 'bg-brand/[0.08]' : tone === 'wrong' ? 'bg-bg-accent' : 'bg-bg-accent/60', className)}>
      <div className="flex gap-3">
        {tone !== 'info' && (
          <span
            aria-hidden
            className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full', tone === 'right' ? 'bg-brand-dark text-white' : 'border-2 border-border-strong text-fg')}
          >
            <Icon name={tone === 'right' ? 'check' : 'x'} size={15} strokeWidth={2.5} />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">{children}</div>
      </div>
    </div>
  );
}
