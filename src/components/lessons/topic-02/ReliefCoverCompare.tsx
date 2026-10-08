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

import { useEffect, useId, useReducer, useRef, useState } from 'react';
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

  const cardRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const focusSoon = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());

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
  // feedback waits for the boards' transition (cover objects ≈ 0.5 s, quarry morph 0.9 s)
  const settle = reduce ? 0 : state === 'quarry' ? 0.95 : 0.6;

  return (
    <>
      <div data-qa="relief-cover-compare" className="surface-elevated p-5 sm:p-6">
        {/* stepper: reached states re-open; later ones wait for a prediction */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <ol aria-label={copy.stepsLabel} className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            {STATES.map((s, i) => {
              const isView = i === flow.view;
              const reached = i <= flow.reached;
              return (
                <li key={s}>
                  <button
                    type="button"
                    disabled={!reached}
                    aria-current={isView ? 'step' : undefined}
                    onClick={() => dispatch({ type: 'view', index: i })}
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
          {flow.reached > 0 && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'reset' });
                setSummaryOpen(false);
              }}
              className="btn-secondary cursor-pointer px-3 py-1.5 text-sm focus-visible:ring-offset-bg-elevated"
            >
              <Icon name="refresh" size={15} />
              {copy.restart}
            </button>
          )}
        </div>

        {/* the two boards; row 2 = the map key, under the map */}
        <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
          <BoardView caption={{ kind: 'real', sub: copy.states[state] }}>
            <div data-qa="rc-block">
              <ReliefCoverBlock state={state} ariaLabel={`${copy.states[state]} — ${copy.boards.real}`} />
            </div>
          </BoardView>
          <BoardView caption={{ kind: 'map', sub: copy.states[state] }} frameClassName="bg-paper-bright">
            <div data-qa="rc-map" className="relative">
              <ReliefCoverMap state={state} ariaLabel={`${copy.states[state]} — ${copy.boards.map}`} />
              <AnimatePresence initial={false}>
                {chip && (
                  <motion.span
                    key={chip}
                    data-qa="rc-chip"
                    initial={reduce ? false : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.3, ease: EASE, delay: frontier ? settle : 0 } }}
                    exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}
                    className="absolute end-2 top-2 rounded-full bg-white/90 px-2.5 py-1 font-display text-sm font-semibold text-fg shadow-sm"
                  >
                    {copy.chips[chip]}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </BoardView>
          <div aria-hidden className="hidden md:block" />
          <div data-qa="rc-legend" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-fg-muted">
            <span className="font-display font-bold text-fg">{copy.legendTitle}</span>
            {LEGEND[state].map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <LegendSwatch k={k} />
                {copy.legend[k]}
              </span>
            ))}
            <span className="basis-full">{copy.disclaimer}</span>
          </div>
        </div>

        {/* state card: feedback (if arrived by prediction) · the state's cells · the next prediction */}
        <div
          ref={cardRef}
          tabIndex={-1}
          data-qa="rc-state-card"
          className="mt-5 rounded-xl bg-bg-accent/60 p-4 focus-visible:outline-none sm:p-5"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            >
              {state !== 'bare' && answer && (
                <motion.div
                  data-qa="rc-feedback"
                  role="status"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE, delay: frontier ? settle : 0 }}
                >
                  <Feedback state={state} answer={answer} copy={copy} />
                </motion.div>
              )}

              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {STATE_CELLS[state].map((ref) => (
                  <div key={`${ref.row}-${ref.layer}-${ref.part ?? ''}`} data-qa="rc-cell">
                    <dt className="flex items-center gap-1.5 font-display text-sm font-semibold text-fg-muted">
                      <span aria-hidden className={cn('size-2 rounded-full', LAYER_DOT[ref.layer])} />
                      {ref.row} · {copy.layers[ref.layer]}
                    </dt>
                    <dd className="mt-1 text-base leading-relaxed text-fg">{cellText(ref)}</dd>
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
                            onClick={() => {
                              dispatch({ type: 'predict', answer: a });
                              focusSoon(() => cardRef.current);
                            }}
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
        <AnimatePresence initial={false}>
          {summaryOpen && (
            <motion.div
              key="table"
              id={`${uid}-table`}
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
      </section>
    </>
  );
}

function Feedback({ state, answer, copy }: { state: Exclude<StateId, 'bare'>; answer: Answer; copy: ReliefCoverCopy }) {
  const right = answer === CORRECT[state];
  return (
    <div className={cn('mb-5 rounded-lg p-3.5', right ? 'bg-brand/10' : 'bg-status-danger/[0.06]')}>
      <p className={cn('flex items-center gap-1.5 font-display text-base font-bold', right ? 'text-brand-dark' : 'text-status-danger')}>
        <Icon name={right ? 'check' : 'x'} size={15} strokeWidth={2.6} />
        {right ? copy.correct : `${copy.wrong} ${copy.answers[CORRECT[state]]}`}
      </p>
      {state === 'quarry' ? (
        <div className="mt-2 space-y-1.5 text-base leading-relaxed text-fg">
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
        <p className="mt-2 text-base leading-relaxed text-fg">{copy.feedback[state]}</p>
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
