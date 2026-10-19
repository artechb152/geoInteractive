'use client';

/**
 * ReliefCoverCompare — screen 3 of ReliefCoverIntroScene, „אותה גבעה, שלושה נופים”
 * (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5).
 * One hill in four states — bare → natural grove → buildings and orchard → quarry.
 * Before every transition the learner predicts what will change (relief, land
 * cover or both); the boards play the change, then supportive feedback and the
 * comparison cells for that state. The full original table closes the activity.
 * One action panel right under the boards carries the whole loop in one place — the next change
 * and its question, then the feedback and "לשלב הבא" — so nothing has to be scrolled to act.
 * Lesson copy comes from the scene (single source; the table cells stay verbatim); the panel's
 * interface copy is TASK below.
 */

import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { BoardView } from './LandformsScene';
import { ReliefCoverMap } from './ReliefCoverVisuals';
import { ReliefCoverModel } from './ReliefCoverModel';
import {
  ANSWERS, CHIP, CORRECT, INITIAL_FLOW, STATES, STATE_CELLS, flowReducer, isComplete, splitExamples,
  type Answer, type CellRef, type LegendKey, type StateId,
} from './reliefCoverCompare.data';

type Layer = 'relief' | 'cover';
export type CompareRow = { label: string; relief: string; cover: string };
export type ReliefCoverCopy = {
  states: Record<StateId, string>;
  stepsLabel: string;
  question: string;
  answers: Record<Answer, string>;
  correct: string;
  wrong: string;
  feedback: { grove: string; built: string; quarry: { lead: string; relief: string; cover: string } };
  chips: { same: string; changed: string };
  legendTitle: string;
  legend: Record<LegendKey, string>;
  disclaimer: string;
  boards: { real: string; map: string };
  layers: Record<Layer, string>;
  next: string;
  restart: string;
  summary: { title: string; show: string; hide: string };
};

const EASE = [0.22, 1, 0.36, 1] as const;
/** Layer dot — the same legend key as the scene's LAYER_SWATCH (sand = relief, sage = cover). */
const LAYER_DOT: Record<Layer, string> = { relief: 'bg-terrain-sand', cover: 'bg-brand' };
type Target = Exclude<StateId, 'bare'>;
/** The action panel's interface copy (no lesson content: the scenarios only say what happens to the
 *  hill, never what it changes). Kept here, not in the scene's COMPARE_COPY, because
 *  ReliefCoverIntroScene is owned elsewhere; its `question` and `next` strings are no longer shown. */
const TASK = {
  nextLabel: 'השינוי הבא',
  scenario: {
    grove: 'על הגבעה החשופה צומח חורש טבעי: עצים ושיחים.',
    built: 'החורש נכרת. במקומו נבנה כפר קטן, ולמרגלות הגבעה ניטע מטע זיתים.',
    quarry: 'במדרון הגבעה נפתחת מחצבה, והיא מתרחבת אל שטח המטע.',
  } as Record<Target, string>,
  question: 'מה ישתנה בשטח בעקבות זה?',
  answerHint: { relief: 'צורת פני הקרקע', cover: 'מה שנמצא על פני הקרקע', both: 'גם הצורה וגם מה שעליה' } as Record<Answer, string>,
  watch: 'צפו בשינוי בדגם ובמפה…',
  chose: 'בחרתם',
  /** [changed, unchanged] — תבליט is masculine, תכסית feminine */
  status: { relief: ['השתנה', 'לא השתנה'], cover: ['השתנתה', 'לא השתנתה'] } as Record<Layer, [string, string]>,
  next: (s: string) => `לשלב הבא: ${s}`,
  back: (n: number, s: string) => `חזרה לשלב ${n}: ${s}`,
  done: 'סיימתם את ארבעת השלבים.',
  toSummary: 'לטבלת הסיכום',
  start: 'נקודת ההתחלה: גבעה חשופה, בלי צמחייה ובלי מבנים. רואים בה רק את התבליט.',
};
/** Which layer changed on the way into each state (from CORRECT). */
const changedIn = (s: Target, l: Layer) => CORRECT[s] === 'both' || CORRECT[s] === l;

type PanelTone = 'ask' | 'right' | 'wrong' | 'plain';
const PANEL_TONE: Record<PanelTone, string> = {
  ask: 'border-accent/40 bg-accent/[0.05]',
  right: 'border-brand/40 bg-brand/[0.08]',
  wrong: 'border-status-danger/30 bg-status-danger/[0.05]',
  plain: 'border-border bg-bg-elevated',
};

/** `header` — the block's heading, set at the top of the card; the summary closes the same card
 *  (one envelope per activity). */
export function ReliefCoverCompare({ rows, copy, header }: { rows: CompareRow[]; copy: ReliefCoverCopy; header?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [flow, dispatch] = useReducer(flowReducer, INITIAL_FLOW);
  const state = STATES[flow.view];
  const done = isComplete(flow);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // the full table opens on its own once the quarry is reached
  useEffect(() => {
    if (done) setSummaryOpen(true);
  }, [done]);

  const stepsRef = useRef<HTMLOListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const focusSoon = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());

  // feedback waits for the boards' transition (cover objects ≈ 0.5 s, quarry morph 0.9 s)
  const settleFor = (s: StateId) => (reduce ? 0 : s === 'quarry' ? 0.95 : 0.6);

  // Screen-reader announcement of the feedback. The live region is mounted from the first paint
  // (a region inserted together with its text is usually not announced) and is filled only when the
  // learner arrives at a state by prediction — after the same delay as the visible feedback.
  // Revisits, "continue" and reset leave it empty.
  const [announcement, setAnnouncement] = useState('');
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearAnnouncement = () => {
    clearTimeout(announceTimer.current);
    setAnnouncement('');
  };
  useEffect(() => () => clearTimeout(announceTimer.current), []);

  // After a prediction the panel takes focus, after "next" its first answer — once the new content
  // has mounted (see FocusOnMount): with mode="wait" the old content is still on screen right after
  // the click.
  const focusAfterSwap = useRef<'panel' | 'answers' | false>(false);
  // The flow as of the last click, not of the last render: during the ~0.2 s exit the old answer
  // buttons are still on screen with this render's handlers, and a second click must not announce
  // an answer the reducer ignores (it stores only the first).
  const flowRef = useRef(flow);
  useLayoutEffect(() => {
    flowRef.current = flow;
  }, [flow]);
  const predict = (a: Answer) => {
    const cur = flowRef.current;
    const next = flowReducer(cur, { type: 'predict', answer: a });
    if (next === cur) return; // not asking any more — the reducer ignores it, so does the announcement
    flowRef.current = next;
    const target = STATES[next.view] as Target;
    focusAfterSwap.current = 'panel';
    dispatch({ type: 'predict', answer: a });
    clearAnnouncement();
    announceTimer.current = setTimeout(
      () => setAnnouncement(feedbackAnnouncement(target, a, copy)),
      settleFor(target) * 1000,
    );
  };
  /** Leaving the prediction path (revisit, "continue", reset): nothing pending may fire later. */
  const cancelPending = () => {
    clearAnnouncement();
    focusAfterSwap.current = false;
  };

  const cellText = (ref: CellRef) => {
    const row = rows.find((r) => r.label === ref.row);
    if (!row) throw new Error(`ReliefCoverCompare: no comparison row "${ref.row}"`);
    const text = row[ref.layer];
    return ref.part === undefined ? text : splitExamples(text)[ref.part];
  };

  const frontier = flow.view === flow.reached;
  const last = flow.view === STATES.length - 1;
  const answer = state === 'bare' ? undefined : flow.answers[state];
  const chip = CHIP[state];
  const settle = settleFor(state);
  const nextState = last ? undefined : (STATES[flow.view + 1] as Target);
  /** The panel: the next question (at the frontier), the feedback that led into the state on show,
   *  or — the bare start, revisited — a note. */
  const mode: 'ask' | 'result' | 'start' = frontier && !last && flow.asking ? 'ask' : answer ? 'result' : 'start';
  const tone: PanelTone =
    mode === 'ask' ? 'ask' : mode === 'result' && answer ? (answer === CORRECT[state as Target] ? 'right' : 'wrong') : 'plain';
  // the verdict's colour lands with the feedback, after the boards' change
  const toneDelay = mode === 'result' && frontier ? settle : 0;

  const goNext = () => {
    dispatch({ type: 'continue' });
    cancelPending();
    focusAfterSwap.current = 'answers';
  };
  const goBack = () => {
    dispatch({ type: 'view', index: flow.reached });
    cancelPending();
    focusAfterSwap.current = 'panel';
  };
  const toSummary = () => {
    summaryRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    focusSoon(() => summaryRef.current);
  };
  const ctaClass = 'inline-flex shrink-0 cursor-pointer items-center gap-2 justify-self-start px-5 py-3 text-base';
  const cta = !frontier ? (
    <button type="button" onClick={goBack} className={cn('btn-secondary', ctaClass)}>
      {TASK.back(flow.reached + 1, copy.states[STATES[flow.reached]])}
    </button>
  ) : last ? (
    <div className="flex flex-col items-start gap-2">
      <p className="font-display text-sm font-semibold text-fg-muted">{TASK.done}</p>
      <button type="button" onClick={toSummary} className={cn('btn-primary', ctaClass)}>
        {TASK.toSummary}
        <Icon name="arrow-left" size={18} />
      </button>
    </div>
  ) : (
    <button type="button" onClick={goNext} className={cn('btn-primary', ctaClass)}>
      {TASK.next(copy.states[nextState!])}
      <Icon name="arrow-left" size={18} />
    </button>
  );

  return (
    <div data-qa="relief-cover-compare" className="surface-elevated p-5 sm:p-6">
      {header}
      {/* stepper: reached states re-open; later ones wait for a prediction */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <ol ref={stepsRef} aria-label={copy.stepsLabel} className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          {STATES.map((s, i) => {
            const isView = i === flow.view;
            const reached = i <= flow.reached;
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={!reached}
                  aria-current={isView ? 'step' : undefined}
                  onClick={() => {
                    dispatch({ type: 'view', index: i });
                    cancelPending();
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition-colors duration-200 ease-snap',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated',
                    isView
                      ? 'border-accent bg-accent/10'
                      : reached
                        ? 'cursor-pointer border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]'
                        : 'cursor-not-allowed border-border/60 bg-bg-elevated opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold transition-colors duration-200',
                      isView ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="font-display text-base font-bold leading-tight text-fg">{copy.states[s]}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {/* always laid out, so the stepper never reflows; hidden (and out of the a11y tree and the
            tab order) until there is something to restart */}
        <button
          type="button"
          disabled={flow.reached === 0}
          aria-hidden={flow.reached === 0 || undefined}
          onClick={() => {
            dispatch({ type: 'reset' });
            setSummaryOpen(false);
            cancelPending();
            // this button hides (nothing reached any more) — keep focus in the flow, at its start
            focusSoon(() => stepsRef.current?.querySelector('button'));
          }}
          className={cn(
            'btn-secondary cursor-pointer px-3 py-1.5 text-sm focus-visible:ring-offset-bg-elevated',
            flow.reached === 0 && 'invisible',
          )}
        >
          <Icon name="refresh" size={15} />
          {copy.restart}
        </button>
      </div>

      {/* the two boards — the map at the start (right), the model beside it; row 2 = the contour
          chip under the map, the opening hint under the model */}
      <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
        {/* grid: the figure keeps the row's full height, so both frames stay equal */}
        <div className="grid">
          <BoardView frameClassName="border border-border-subtle bg-white">
            <div data-qa="rc-map">
              <ReliefCoverMap state={state} ariaLabel={`${copy.states[state]} — ${copy.boards.map}`} />
            </div>
          </BoardView>
        </div>
        <BoardView frameClassName="border border-border-subtle">
          <div data-qa="rc-block">
            <ReliefCoverModel state={state} reduce={!!reduce} ariaLabel={`${copy.states[state]} — ${copy.boards.real}`} />
          </div>
        </BoardView>
        {/* the contour chip, under the map (its row keeps its height in every state, so the card
            below never moves); "changed" wears the relief key, since that is what changed */}
        <div className="flex min-h-6 justify-start">
          <AnimatePresence initial={false}>
            {chip && (
              <motion.span
                key={chip}
                data-qa="rc-chip"
                initial={reduce ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.3, ease: EASE, delay: frontier ? settle : 0 } }}
                exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-sm font-semibold leading-5 text-fg',
                  chip === 'changed' ? 'bg-terrain-sand/30' : 'bg-bg-accent',
                )}
              >
                {chip === 'changed' && <span aria-hidden className={cn('size-2 rounded-full', LAYER_DOT.relief)} />}
                {copy.chips[chip]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div aria-hidden className="hidden md:block" />
      </div>

      {/* the action panel — right under the boards and always in the same place, so nothing has to
          be scrolled to act: the next change and its question; after an answer, the feedback and
          the way on. The state's cells follow it as reading. */}
      <p data-qa="rc-status" role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div
        ref={panelRef}
        tabIndex={-1}
        data-qa="rc-task"
        data-mode={mode}
        className={cn(
          'relative mt-3 overflow-hidden rounded-xl border p-4 transition-colors duration-300 sm:px-5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated',
          PANEL_TONE[tone],
        )}
        style={{ transitionDelay: `${toneDelay}s` }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${state}-${mode}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            className="grid items-center gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <FocusOnMount
              run={() => {
                const target = focusAfterSwap.current;
                if (!target) return;
                focusAfterSwap.current = false;
                (target === 'answers' ? answersRef.current?.querySelector('button') : panelRef.current)?.focus();
              }}
            />
            {mode === 'ask' && (
              <>
                <div data-qa="rc-question">
                  <p className="flex items-center gap-2 font-display text-sm font-bold text-fg-muted">
                    <span className="flex size-6 items-center justify-center rounded-md bg-accent font-display text-xs font-bold text-white">
                      {flow.view + 2}
                    </span>
                    {TASK.nextLabel}: {copy.states[nextState!]}
                  </p>
                  <p id={`${uid}-scn`} className="mt-1.5 text-pretty text-base leading-relaxed text-fg">
                    {TASK.scenario[nextState!]}
                  </p>
                  <p id={`${uid}-q`} className="mt-1 font-display text-lg font-bold leading-snug text-fg">
                    {TASK.question}
                  </p>
                </div>
                <div
                  ref={answersRef}
                  role="group"
                  aria-labelledby={`${uid}-q`}
                  aria-describedby={`${uid}-scn`}
                  className="grid grid-cols-3 gap-2 lg:w-[38rem]"
                >
                  {ANSWERS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      data-answer={a}
                      onClick={() => predict(a)}
                      className={cn(
                        'flex min-h-[4.25rem] cursor-pointer flex-col items-start justify-center gap-0.5 rounded-xl border-2 border-border bg-bg-elevated px-3 py-2 text-start',
                        'transition-colors duration-200 ease-snap hover:border-accent/60 hover:bg-accent/[0.06] focus-visible:ring-offset-bg-elevated',
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-display text-base font-bold leading-tight text-fg">
                        <AnswerDots answer={a} />
                        {copy.answers[a]}
                      </span>
                      <span className="text-sm leading-snug text-fg-muted">{TASK.answerHint[a]}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {mode === 'result' && answer && state !== 'bare' && (
              <>
                <div data-qa="rc-feedback" className="min-w-0">
                  <Feedback state={state} answer={answer} copy={copy} />
                </div>
                {cta}
              </>
            )}

            {mode === 'start' && (
              <>
                <p className="text-pretty text-base leading-relaxed text-fg">{TASK.start}</p>
                {cta}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* while the boards play the change, the panel says where to look; the verdict appears
            (and the panel takes its colour) once the change has landed */}
        {mode === 'result' && frontier && settle > 0 && (
          <motion.div
            key={`watch-${state}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-bg-elevated font-display text-base font-bold text-fg-muted"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: settle }}
          >
            <Icon name="eye" size={18} />
            {TASK.watch}
          </motion.div>
        )}
      </div>

      {/* the state's cells — what the comparison table says about what is on show */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.dl
          key={state}
          data-qa="rc-cells"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
          className="mt-3 grid gap-x-6 gap-y-3 rounded-xl bg-bg-accent/60 p-4 sm:grid-cols-2 sm:px-5"
        >
          {STATE_CELLS[state].map((ref) => (
            <div key={`${ref.row}-${ref.layer}-${ref.part ?? ''}`} data-qa="rc-cell">
              <dt className="flex items-center gap-1.5 font-display text-sm font-semibold text-fg-muted">
                <span aria-hidden className={cn('size-2 rounded-full', LAYER_DOT[ref.layer])} />
                {ref.row} · {copy.layers[ref.layer]}
              </dt>
              <dd className="mt-1 text-pretty text-base leading-relaxed text-fg">{cellText(ref)}</dd>
            </div>
          ))}
        </motion.dl>
      </AnimatePresence>

      {/* summary: always here (a learner who skips can still open it); opens itself at the quarry.
          It closes the comparison's own card, under a hairline. */}
      <section data-qa="rc-summary" aria-labelledby={`${uid}-sum`} className="mt-6 border-t border-border-subtle pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 ref={summaryRef} tabIndex={-1} id={`${uid}-sum`} className="scroll-mt-28 font-display text-xl font-bold leading-tight text-fg focus-visible:outline-none">
            {copy.summary.title}
          </h4>
          <button
            type="button"
            aria-expanded={summaryOpen}
            aria-controls={`${uid}-table`}
            onClick={() => setSummaryOpen((o) => !o)}
            className="btn-secondary cursor-pointer px-4 py-2 text-sm"
          >
            {summaryOpen ? copy.summary.hide : copy.summary.show}
          </button>
        </div>
        {/* always mounted, so aria-controls always resolves; the table animates inside it */}
        <div id={`${uid}-table`}>
          <AnimatePresence initial={false}>
            {summaryOpen && (
              <motion.div
                key="table"
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, height: 0 }}
                transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="pt-4">
                  <CompareTable rows={rows} layers={copy.layers} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

/** The feedback's heading: „נכון: תכסית” or „בחרתם „שניהם”. התשובה הנכונה: תכסית” — shared by the
 *  visible feedback and the announcement. */
function feedbackHead(state: Target, answer: Answer, copy: ReliefCoverCopy) {
  const right = answer === CORRECT[state];
  const correct = copy.answers[CORRECT[state]];
  return { right, text: right ? `${copy.correct}: ${correct}` : `${TASK.chose} „${copy.answers[answer]}”. ${copy.wrong} ${correct}` };
}

/** „תבליט: לא השתנה” — one layer's verdict for the change into `state`. */
const verdict = (state: Target, l: Layer, copy: ReliefCoverCopy) => `${copy.layers[l]}: ${TASK.status[l][changedIn(state, l) ? 0 : 1]}`;

/** The same feedback as plain text, for the screen-reader live region (no new strings). */
function feedbackAnnouncement(state: Target, answer: Answer, copy: ReliefCoverCopy) {
  const body =
    state === 'quarry'
      ? [copy.feedback.quarry.lead, ...(['relief', 'cover'] as Layer[]).map((l) => `${copy.layers[l]} — ${copy.feedback.quarry[l]}`)].join(' ')
      : copy.feedback[state];
  const verdicts = (['relief', 'cover'] as Layer[]).map((l) => verdict(state, l, copy)).join(', ');
  return `${feedbackHead(state, answer, copy).text}. ${verdicts}. ${body}`;
}

/** Runs `run` once when it mounts. The keyed state content renders one, so it fires after the swap. */
function FocusOnMount({ run }: { run: () => void }) {
  const latest = useRef(run);
  useEffect(() => {
    latest.current();
  }, []);
  return null;
}

/** The answer's layer key: sand = relief, sage = cover, both for "both". */
function AnswerDots({ answer }: { answer: Answer }) {
  const layers: Layer[] = answer === 'both' ? ['relief', 'cover'] : [answer];
  return (
    <span aria-hidden className="flex -space-x-0.5 rtl:space-x-reverse">
      {layers.map((l) => (
        <span key={l} className={cn('size-2.5 rounded-full ring-2 ring-bg-elevated', LAYER_DOT[l])} />
      ))}
    </span>
  );
}

function Feedback({ state, answer, copy }: { state: Target; answer: Answer; copy: ReliefCoverCopy }) {
  const { right, text } = feedbackHead(state, answer, copy);
  return (
    <>
      <p data-qa="rc-head" className={cn('flex items-center gap-1.5 font-display text-lg font-bold leading-snug', right ? 'text-brand-dark' : 'text-status-danger')}>
        <Icon name={right ? 'check' : 'x'} size={17} strokeWidth={2.6} />
        {text}
      </p>
      {/* the verdict per layer: what changed and what did not */}
      <ul className="mt-2 flex flex-wrap gap-2">
        {(['relief', 'cover'] as Layer[]).map((l) => {
          const changed = changedIn(state, l);
          return (
            <li
              key={l}
              data-qa="rc-verdict"
              data-changed={changed || undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-sm leading-5',
                changed ? 'bg-bg-elevated font-bold text-fg shadow-sm' : 'bg-bg-accent/70 font-semibold text-fg-muted',
              )}
            >
              <span aria-hidden className={cn('size-2 rounded-full', LAYER_DOT[l])} />
              {verdict(state, l, copy)}
            </li>
          );
        })}
      </ul>
      {state === 'quarry' ? (
        <div className="mt-2 space-y-1 text-pretty text-base leading-relaxed text-fg">
          <p>{copy.feedback.quarry.lead}</p>
          {(['relief', 'cover'] as Layer[]).map((l) => (
            <p key={l} className="flex items-start gap-2">
              <span aria-hidden className={cn('mt-2 size-2 shrink-0 rounded-full', LAYER_DOT[l])} />
              <span>
                <strong className="font-display">{copy.layers[l]}</strong> — {copy.feedback.quarry[l]}
              </span>
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-pretty text-base leading-relaxed text-fg">{copy.feedback[state]}</p>
      )}
    </>
  );
}

/** The original comparison table, unchanged (moved from ReliefCoverIntroScene screen 3). */
function CompareTable({ rows, layers }: { rows: CompareRow[]; layers: Record<Layer, string> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle">
      <div className="grid grid-cols-[minmax(7rem,0.6fr)_1fr_1fr] text-sm">
        <div className="p-3.5 bg-bg-accent/60 border-b border-border-subtle" />
        <CompareHead layer="relief">{layers.relief}</CompareHead>
        <CompareHead layer="cover">{layers.cover}</CompareHead>
        {rows.map((row, i) => (
          <div key={row.label} className="contents">
            <div className={cn('px-4 py-3.5 font-display font-semibold text-fg', i > 0 && 'border-t border-border-subtle')}>{row.label}</div>
            <div className={cn('px-4 py-3.5 text-fg-muted leading-relaxed', i > 0 && 'border-t border-border-subtle')}>{row.relief}</div>
            <div className={cn('px-4 py-3.5 text-fg-muted leading-relaxed', i > 0 && 'border-t border-border-subtle')}>{row.cover}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareHead({ layer, children }: { layer: Layer; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3.5 bg-bg-accent/60 border-b border-border-subtle font-display font-bold text-base text-fg flex items-center gap-2">
      <span aria-hidden className={cn('size-2.5 rounded-full', LAYER_DOT[layer])} />
      {children}
    </div>
  );
}
