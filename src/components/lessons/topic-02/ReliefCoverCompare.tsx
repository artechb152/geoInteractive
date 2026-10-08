'use client';

/**
 * ReliefCoverCompare — screen 3 of ReliefCoverIntroScene, „אותה גבעה, שלושה נופים”
 * (docs/superpowers/specs/2026-10-08-relief-cover-compare-design.md §5).
 * One hill in four states — bare → natural grove → buildings and orchard → quarry.
 * Before every transition the learner predicts what will change (relief, land
 * cover or both); the boards play the change, then supportive feedback and the
 * comparison cells for that state. The full original table closes the activity.
 * All copy comes from the scene (single source); the table cells stay verbatim.
 */

import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { BoardView } from './LandformsScene';
import { LegendSwatch, ReliefCoverBlock, ReliefCoverMap } from './ReliefCoverVisuals';
import {
  ANSWERS, CHIP, CORRECT, INITIAL_FLOW, LEGEND, STATES, STATE_CELLS, flowReducer, isComplete, splitExamples,
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
/** Map-key entries drawn with contour lines (relief); every other entry is a land-cover symbol. */
const CONTOUR_KEYS: readonly LegendKey[] = ['contour', 'index', 'before'];

export function ReliefCoverCompare({ rows, copy }: { rows: CompareRow[]; copy: ReliefCoverCopy }) {
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
  const cardRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
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

  // After a prediction the card takes focus once the new state's content has mounted (see FocusOnMount):
  // with mode="wait" the old content is still on screen right after the click.
  const focusAfterSwap = useRef(false);
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
    const target = STATES[next.view] as Exclude<StateId, 'bare'>;
    focusAfterSwap.current = true;
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

  return (
    <>
      <div data-qa="relief-cover-compare" className="surface-elevated p-5 sm:p-6">
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

        {/* the two boards; row 2 = the map key, under the map */}
        <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
          <BoardView caption={{ kind: 'real', sub: copy.states[state] }}>
            <div data-qa="rc-block">
              <ReliefCoverBlock state={state} ariaLabel={`${copy.states[state]} — ${copy.boards.real}`} />
            </div>
          </BoardView>
          {/* grid: the figure keeps the row's full height, so both frames stay equal */}
          <div className="relative grid">
            <BoardView caption={{ kind: 'map', sub: copy.states[state] }} frameClassName="bg-paper-bright">
              <div data-qa="rc-map">
                <ReliefCoverMap state={state} ariaLabel={`${copy.states[state]} — ${copy.boards.map}`} />
              </div>
            </BoardView>
            {/* the contour chip sits on the map's caption line (spec §5), clear of every symbol and label */}
            <AnimatePresence initial={false}>
              {chip && (
                <motion.span
                  key={chip}
                  data-qa="rc-chip"
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.3, ease: EASE, delay: frontier ? settle : 0 } }}
                  exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}
                  className="absolute -top-0.5 end-0 rounded-full bg-bg-accent px-2.5 py-0.5 font-display text-sm font-semibold leading-5 text-fg"
                >
                  {copy.chips[chip]}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div aria-hidden className="hidden md:block" />
          {/* map key: one line of contour entries, one line of land-cover symbols (kept even when empty,
              so the key — and the card below it — keeps its height in every state), the disclaimer */}
          <div data-qa="rc-legend" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm text-fg-muted">
            <span className="font-display font-bold leading-5 text-fg">{copy.legendTitle}</span>
            <div className="grid gap-y-1.5">
              {[true, false].map((contour) => (
                <div key={String(contour)} className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1.5">
                  {LEGEND[state]
                    .filter((k) => CONTOUR_KEYS.includes(k) === contour)
                    .map((k) => (
                      <span key={k} className="inline-flex items-center gap-1.5 leading-5">
                        <LegendSwatch k={k} />
                        {copy.legend[k]}
                      </span>
                    ))}
                </div>
              ))}
            </div>
            <span className="col-span-2 leading-5">{copy.disclaimer}</span>
          </div>
        </div>

        {/* state card: feedback (if arrived by prediction) · the state's cells · the next prediction */}
        <div
          ref={cardRef}
          tabIndex={-1}
          data-qa="rc-state-card"
          className="mt-5 rounded-xl bg-bg-accent/60 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated sm:p-5"
        >
          <p data-qa="rc-status" role="status" aria-live="polite" className="sr-only">
            {announcement}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            >
              <FocusOnMount
                run={() => {
                  if (!focusAfterSwap.current) return;
                  focusAfterSwap.current = false;
                  cardRef.current?.focus();
                }}
              />
              {state !== 'bare' && answer && (
                <div className="relative mb-5">
                  {/* while the boards play the change, the feedback's place shows as a quiet panel,
                      not a hole; it cross-fades into the feedback when the change lands */}
                  {frontier && settle > 0 && (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-lg bg-bg-accent"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE, delay: settle }}
                    />
                  )}
                  <motion.div
                    data-qa="rc-feedback"
                    className="relative"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduce ? 0 : 0.3, ease: EASE, delay: frontier ? settle : 0 }}
                  >
                    <Feedback state={state} answer={answer} copy={copy} />
                  </motion.div>
                </div>
              )}

              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {STATE_CELLS[state].map((ref) => (
                  <div key={`${ref.row}-${ref.layer}-${ref.part ?? ''}`} data-qa="rc-cell">
                    <dt className="flex items-center gap-1.5 font-display text-sm font-semibold text-fg-muted">
                      <span aria-hidden className={cn('size-2 rounded-full', LAYER_DOT[ref.layer])} />
                      {ref.row} · {copy.layers[ref.layer]}
                    </dt>
                    <dd className="mt-1 text-pretty text-base leading-relaxed text-fg">{cellText(ref)}</dd>
                  </div>
                ))}
              </dl>

              {frontier && !last && (
                <div className="mt-5 border-t border-border-subtle pt-4">
                  {!flow.asking ? (
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'continue' });
                        cancelPending();
                        focusSoon(() => questionRef.current?.querySelector('button'));
                      }}
                      className="btn-primary cursor-pointer px-5 text-sm"
                    >
                      {copy.next}
                    </button>
                  ) : (
                    <div ref={questionRef} data-qa="rc-question">
                      <p id={`${uid}-q`} className="font-display text-lg font-bold text-fg">
                        {copy.question}
                      </p>
                      <p className="mt-1 text-sm text-fg-muted">
                        {copy.states[state]} ← {copy.states[STATES[flow.view + 1]]}
                      </p>
                      <div role="group" aria-labelledby={`${uid}-q`} className="mt-3 grid max-w-md grid-cols-3 gap-2">
                        {ANSWERS.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => predict(a)}
                            className={cn(
                              'cursor-pointer rounded-xl border border-border bg-bg-elevated px-3 py-2.5 font-display text-base font-semibold text-fg',
                              'transition-colors duration-200 ease-snap hover:border-brand/30 hover:bg-brand/[0.03] focus-visible:ring-offset-bg-elevated',
                            )}
                          >
                            {copy.answers[a]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* summary: always here (a learner who skips can still open it); opens itself at the quarry */}
      <section data-qa="rc-summary" aria-labelledby={`${uid}-sum`} className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 id={`${uid}-sum`} className="font-display text-xl font-bold leading-tight text-fg">
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
    </>
  );
}

/** The feedback's heading: „נכון” or „התשובה הנכונה: …” — shared by the visible feedback and the announcement. */
function feedbackHead(state: Exclude<StateId, 'bare'>, answer: Answer, copy: ReliefCoverCopy) {
  const right = answer === CORRECT[state];
  return { right, text: right ? copy.correct : `${copy.wrong} ${copy.answers[CORRECT[state]]}` };
}

/** The same feedback as plain text, for the screen-reader live region (no new strings). */
function feedbackAnnouncement(state: Exclude<StateId, 'bare'>, answer: Answer, copy: ReliefCoverCopy) {
  const body =
    state === 'quarry'
      ? [copy.feedback.quarry.lead, ...(['relief', 'cover'] as Layer[]).map((l) => `${copy.layers[l]} — ${copy.feedback.quarry[l]}`)].join(' ')
      : copy.feedback[state];
  return `${feedbackHead(state, answer, copy).text}. ${body}`;
}

/** Runs `run` once when it mounts. The keyed state content renders one, so it fires after the swap. */
function FocusOnMount({ run }: { run: () => void }) {
  const latest = useRef(run);
  useEffect(() => {
    latest.current();
  }, []);
  return null;
}

function Feedback({ state, answer, copy }: { state: Exclude<StateId, 'bare'>; answer: Answer; copy: ReliefCoverCopy }) {
  const { right, text } = feedbackHead(state, answer, copy);
  return (
    <div className={cn('rounded-lg p-3.5', right ? 'bg-brand/10' : 'bg-status-danger/[0.06]')}>
      <p className={cn('flex items-center gap-1.5 font-display text-base font-bold', right ? 'text-brand-dark' : 'text-status-danger')}>
        <Icon name={right ? 'check' : 'x'} size={15} strokeWidth={2.6} />
        {text}
      </p>
      {state === 'quarry' ? (
        <div className="mt-2 space-y-1.5 text-pretty text-base leading-relaxed text-fg">
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
    </div>
  );
}

/** The original comparison table, unchanged (moved from ReliefCoverIntroScene screen 3). */
function CompareTable({ rows, layers }: { rows: CompareRow[]; layers: Record<Layer, string> }) {
  return (
    <div className="surface overflow-hidden">
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
