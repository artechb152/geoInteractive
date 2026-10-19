'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * SortQuiz — תרגול מיון מהיר בין שתי קטגוריות (תבליט/תכסית, טבעית/מלאכותית).
 * כל פריט נענה בנפרד ומקבל משוב מיידי עם הסבר; אפשר לאפס ולנסות שוב.
 *
 * Two layouts, same items/answers/scoring:
 * - `layout="grid"` (default) — every item as its own card with its own pair of buttons
 *   (topic-02 task 9 „טבעית או מלאכותית?” and the archive V1 scenes).
 * - `layout="stage"` — one item at a time: a strip of item tokens (progress + free navigation),
 *   the item on stage with the two choices beside it, feedback directly under the choices, and a
 *   completion row. Opt in per call site (topic-02 task 4 uses it).
 *   Stage-only opt-ins (defaults keep the plain stage): `visuals` adds an illustration per item and
 *   per option; `showScore` / `showPosition` / `showFinalScore` hide the live „x/y נכון”, the
 *   „פריט n מתוך N” line and the completion score; `hint` and `doneText` are the quiet line under the
 *   choices before an answer and the line shown once every item is answered; `centerChoices` centers
 *   the illustrated choices on the item's illustration; `autoAdvance` moves on right after an answer.
 */
export type SortOption<K extends string> = {
  id: K;
  label: string;
  /** stage only: the category's name in the wrong-answer line („הסיווג הנכון: …”); defaults to `label` */
  feedbackLabel?: string;
};

export type SortItem<K extends string> = {
  id: string;
  label: string;
  answer: K;
  /** ההסבר שמוצג אחרי התשובה — למה זו הקטגוריה הנכונה. */
  why: string;
};

type SortQuizProps<K extends string> = {
  title: string;
  prompt: string;
  options: [SortOption<K>, SortOption<K>];
  items: SortItem<K>[];
};

/** Illustrations for the stage layout (URLs already include the base path). */
export type SortQuizVisuals<K extends string> = {
  /** per item.id — shown large under the item's name; the alt describes the item, never its category */
  items: Record<string, { src: string; alt: string }>;
  /** per option.id — decorative art above the option's label */
  options: Record<K, string>;
};

type StageOptions<K extends string> = {
  /** the practice's section heading, set at the top of the card (one envelope per activity) */
  heading?: string;
  visuals?: SortQuizVisuals<K>;
  showScore?: boolean;
  showPosition?: boolean;
  showFinalScore?: boolean;
  hint?: string;
  doneText?: string;
  /** with `visuals`: the choice cards sit vertically centered on the item's illustration (feedback below both) */
  centerChoices?: boolean;
  /** an answer moves straight on to the next unanswered item (its result shows on the strip; the
   *  explanation stays one click away on the item's token) */
  autoAdvance?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function SortQuiz<K extends string>({
  layout = 'grid',
  heading,
  visuals,
  showScore,
  showPosition,
  showFinalScore,
  hint,
  doneText,
  centerChoices,
  autoAdvance,
  ...props
}: SortQuizProps<K> & StageOptions<K> & { layout?: 'grid' | 'stage' }) {
  return layout === 'stage' ? (
    <SortQuizStage
      {...props}
      {...{ heading, visuals, showScore, showPosition, showFinalScore, hint, doneText, centerChoices, autoAdvance }}
    />
  ) : (
    <SortQuizGrid {...props} />
  );
}

function SortQuizGrid<K extends string>({ title, prompt, options, items }: SortQuizProps<K>) {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const [answers, setAnswers] = useState<Record<string, K>>({});
  const answered = items.filter((it) => answers[it.id] !== undefined).length;
  const correct = items.filter((it) => answers[it.id] === it.answer).length;
  const done = answered === items.length;
  const perfect = done && correct === items.length;

  const answer = (id: string, k: K) =>
    setAnswers((a) => (a[id] !== undefined ? a : { ...a, [id]: k }));

  const reset = () => {
    setAnswers({});
    // Return keyboard users to the first question after a restart.
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
  };

  const cardVariants: Variants = {
    idle: { scale: 1, x: 0 },
    right: reduce ? { scale: 1 } : { scale: [1, 1.03, 1], transition: { duration: 0.35, ease: EASE } },
    wrong: reduce ? { x: 0 } : { x: [0, -5, 5, -3, 3, 0], transition: { duration: 0.4, ease: 'easeInOut' } },
  };

  return (
    <div data-qa="sort-quiz" data-layout="grid" className="surface-elevated p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 mb-4">
        <div>
          <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{title}</h3>
          <p className="text-sm text-fg-muted leading-relaxed mt-1">{prompt}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* live score — a real status chip: filled, no border, so it never reads like the bordered reset action beside it */}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-sm transition-colors duration-300',
              perfect ? 'bg-brand/15 text-brand-dark' : 'bg-bg-accent text-fg-muted',
            )}
            aria-live="polite"
          >
            <span className="font-display font-semibold tabular-nums">
              {correct}/{items.length} נכון
            </span>
          </span>
          {answered > 0 && !done && (
            <button
              type="button"
              onClick={reset}
              className="btn-secondary px-3 py-1.5 text-sm cursor-pointer focus-visible:ring-offset-bg-elevated"
            >
              <Icon name="refresh" size={15} />
              התחלה מחדש
            </button>
          )}
        </div>
      </div>

      {/* Progress: one segment per item — filled as it's answered, tinted by result */}
      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={answered}
        className="flex gap-1 mb-5"
      >
        {items.map((it) => {
          const picked = answers[it.id];
          return (
            <span key={it.id} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-border-subtle">
              <motion.span
                className={cn('absolute inset-0 rounded-full', picked === it.answer ? 'bg-brand' : 'bg-status-danger/70')}
                initial={false}
                animate={{ scaleX: picked !== undefined ? 1 : 0 }}
                style={{ originX: 1 }}
                transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
              />
            </span>
          );
        })}
      </div>

      <ul ref={listRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((it) => {
          const picked = answers[it.id];
          const isAnswered = picked !== undefined;
          const isRight = picked === it.answer;
          return (
            <motion.li
              key={it.id}
              variants={cardVariants}
              initial={false}
              animate={!isAnswered ? 'idle' : isRight ? 'right' : 'wrong'}
              className={cn(
                'rounded-xl p-3.5 transition-colors duration-300',
                !isAnswered && 'bg-bg-accent/60',
                isAnswered && isRight && 'bg-brand/10',
                isAnswered && !isRight && 'bg-status-danger/[0.06]',
              )}
            >
              <div className="mb-3 font-display font-bold text-base text-fg leading-6">{it.label}</div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label={`מיון: ${it.label}`}>
                {options.map((opt) => {
                  const chosen = picked === opt.id;
                  const isAnswer = opt.id === it.answer;
                  const showRight = isAnswered && isAnswer;
                  const showWrong = isAnswered && chosen && !isAnswer;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      // aria-disabled (not disabled) keeps focus in place after answering,
                      // so keyboard users can Tab straight on to the next item.
                      aria-disabled={isAnswered}
                      aria-pressed={chosen}
                      onClick={() => !isAnswered && answer(it.id, opt.id)}
                      className={cn(
                        'rounded-xl border px-2 py-2 text-sm font-display font-semibold',
                        'inline-flex items-center justify-center gap-1.5 transition-colors duration-200 ease-snap',
                        'focus-visible:ring-offset-bg-elevated',
                        !isAnswered &&
                          'border-border bg-bg-elevated text-fg hover:border-brand/30 hover:bg-brand/[0.03] cursor-pointer',
                        showRight && 'border-brand bg-brand/15 text-brand-dark cursor-default',
                        showWrong && 'border-status-danger/60 bg-status-danger/10 text-status-danger cursor-default',
                        isAnswered && !showRight && !showWrong && 'border-border/60 bg-bg-elevated text-fg-dim cursor-default',
                      )}
                    >
                      {showRight && <Icon name="check" size={14} strokeWidth={2.6} />}
                      {showWrong && <Icon name="x" size={13} strokeWidth={2.6} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence initial={false}>
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className={cn('pt-3 text-sm leading-relaxed', isRight ? 'text-brand-dark' : 'text-status-danger')}>
                      <strong>{isRight ? 'נכון. ' : 'לא בדיוק. '}</strong>
                      <span className="text-fg-muted">{it.why}</span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>

      {/* Completion — the final "x/y נכון" result as a plain inset (tinted sage only when perfect) */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: reduce ? 0 : 0.2 }}
            className={cn(
              'mt-5 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4',
              perfect ? 'bg-brand/10' : 'bg-bg-accent/60',
            )}
          >
            <span className="font-display font-bold text-xl text-fg tabular-nums">
              {correct}/{items.length} נכון
            </span>
            <button
              type="button"
              onClick={reset}
              className="btn-secondary px-4 text-sm cursor-pointer focus-visible:ring-offset-bg-elevated"
            >
              <Icon name="refresh" size={15} />
              התחלה מחדש
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Option recipe inside the white workspace (lessons 2 & 6 cleanup spec §1). */
const OPTION_IDLE = 'border-border bg-bg-elevated text-fg hover:border-brand/30 hover:bg-brand/[0.03] cursor-pointer';
/** Illustrated choice cards and the token strip sit on a faint cream tint inside the white card. */
const OPTION_IDLE_TINTED = 'border-border bg-bg-accent/60 text-fg hover:border-brand/30 hover:bg-brand/[0.03] cursor-pointer';

/** A result mark: check (right) or x (wrong) in a filled circle; the text beside it names the result. */
function ResultMark({ right, size = 'md' }: { right: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full text-bg-elevated',
        size === 'sm' ? 'size-5' : 'size-6',
        right ? 'bg-brand-dark' : 'bg-status-danger',
      )}
    >
      <Icon name={right ? 'check' : 'x'} size={size === 'sm' ? 12 : 14} strokeWidth={3} />
    </span>
  );
}

/**
 * Stage layout — three regions that never share a look:
 *   item     — the item's name, large plain text (no box), and, with `visuals`, its illustration
 *              under it in a fixed 3:2 frame (object-contain, so no edge of the art is cut);
 *   choices  — the two bordered option buttons beside it (illustrated cards with `visuals`);
 *   feedback — a tinted inset directly under the choices (sage = right, red = wrong, as in the grid).
 * The token strip above is the progress and the item navigation in one (free order, review after
 * finishing). Keyboard: the strip is one Tab stop (arrow keys / Home / End move along it in the
 * reading direction); Tab → the two choices → „next”, which lands on the next item's first choice.
 * Without the final score (`showFinalScore={false}`) there is no completion row: the restart stays in
 * the header from the start, and `doneText` appears under the last feedback once every item is answered.
 */
function SortQuizStage<K extends string>({
  title,
  prompt,
  options,
  items,
  heading,
  visuals,
  showScore = true,
  showPosition = true,
  showFinalScore = true,
  hint,
  doneText,
  centerChoices = false,
  autoAdvance = false,
}: SortQuizProps<K> & StageOptions<K>) {
  const reduce = useReducedMotion();
  const tokenRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const choicesRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [answers, setAnswers] = useState<Record<string, K>>({});
  const [cur, setCur] = useState(0);

  const answered = items.filter((it) => answers[it.id] !== undefined).length;
  const correct = items.filter((it) => answers[it.id] === it.answer).length;
  const done = answered === items.length;
  const perfect = done && correct === items.length;

  const item = items[cur];
  const picked = answers[item.id];
  const isAnswered = picked !== undefined;
  const isRight = picked === item.answer;
  const answerOption = options.find((o) => o.id === item.answer);
  const answerLabel = answerOption?.feedbackLabel ?? answerOption?.label;
  /** the next unanswered item after the current one (wrapping), or -1 once all are answered */
  let nextIdx = -1;
  for (let s = 1; s < items.length && nextIdx === -1; s++) {
    const i = (cur + s) % items.length;
    if (answers[items[i].id] === undefined) nextIdx = i;
  }

  // Focus moves after the render that creates its target: an answer hands focus to „next” (so the
  // keyboard loop is answer → next; the feedback is announced by its live region), „next” and the
  // restart hand it to the first choice of the item now on stage.
  const [focusTo, setFocusTo] = useState<'next' | 'choice' | null>(null);
  useEffect(() => {
    if (focusTo === 'next') nextRef.current?.focus();
    else if (focusTo === 'choice') choicesRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    if (focusTo) setFocusTo(null);
  }, [focusTo]);

  // Illustrations: the item on stage loads normally; once it has, the next unanswered item's
  // illustration is fetched in the background so „next” rarely shows an empty frame.
  const [stageLoaded, setStageLoaded] = useState(false);
  const nextSrc = visuals && nextIdx !== -1 ? visuals.items[items[nextIdx].id]?.src : undefined;
  useEffect(() => {
    if (!stageLoaded || !nextSrc) return;
    const img = new window.Image();
    img.src = nextSrc;
  }, [stageLoaded, nextSrc]);

  // autoAdvance: the result of the answer that moved the stage on, for screen readers (sighted
  // learners see it on the strip); cleared by any other move.
  const [announce, setAnnounce] = useState('');
  const advancedAt = useRef(-Infinity);
  const show = (i: number) => {
    setCur(i);
    setAnnounce('');
  };

  /** The first answer per item is kept: a double click or a second choice never overwrites it. */
  const answer = (id: string, k: K) => {
    if (answers[id] !== undefined) return;
    // after an auto-advance the choices are the next item's: the second click of a double click
    // (or a quick repeat) must not answer it too
    if (performance.now() - advancedAt.current < 450) return;
    setAnswers((a) => (a[id] !== undefined ? a : { ...a, [id]: k }));
    if (nextIdx === -1) return;
    if (autoAdvance) {
      advancedAt.current = performance.now();
      show(nextIdx);
      setAnnounce(
        k === item.answer ? `${item.label}: נכון.` : `${item.label}: לא בדיוק. הסיווג הנכון: ${answerLabel}.`,
      );
      setFocusTo('choice');
    } else setFocusTo('next');
  };

  const goNext = () => {
    if (nextIdx === -1) return;
    show(nextIdx);
    setFocusTo('choice');
  };

  const reset = () => {
    setAnswers({});
    show(0);
    setFocusTo('choice');
  };

  const onTokenKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    let to = -1;
    if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) to = Math.min(cur + 1, items.length - 1);
    else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) to = Math.max(cur - 1, 0);
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = items.length - 1;
    if (to === -1) return;
    e.preventDefault();
    show(to);
    tokenRefs.current[to]?.focus();
  };

  /** short entrance when the item on stage changes (name, illustration, feedback) — no shake, no bounce */
  const enter = {
    initial: reduce ? false : ({ opacity: 0, y: 6 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.25, ease: EASE },
  };

  const centered = !!visuals && centerChoices;

  const resetButton = (
    <button
      type="button"
      data-qa="sq-reset"
      onClick={reset}
      className={cn(
        'shrink-0 cursor-pointer focus-visible:ring-offset-bg-elevated',
        visuals ? 'btn-ghost px-3 py-1.5 text-base text-fg' : 'btn-secondary px-3 py-1.5 text-sm',
      )}
    >
      <Icon name="refresh" size={visuals ? 17 : 15} />
      התחלה מחדש
    </button>
  );

  return (
    <div data-qa="sort-quiz" data-layout="stage" className="surface-elevated p-6 lg:p-8">
      {heading && <h3 className="mb-5 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">{heading}</h3>}
      {/* Header: the question and its instruction; live score + restart while in progress */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h4 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{title}</h4>
          <p className="mt-1 text-base leading-relaxed text-fg-muted">{prompt}</p>
        </div>
        {(!done || !showFinalScore) && (
          <div className="flex items-center gap-2">
            {showScore && (
              <span
                className="inline-flex items-center rounded-full bg-bg-accent px-3 py-1 text-sm text-fg-muted"
                aria-live="polite"
              >
                <span className="font-display font-semibold tabular-nums">
                  {correct}/{items.length} נכון
                </span>
              </span>
            )}
            {(answered > 0 || !showFinalScore) && resetButton}
          </div>
        )}
      </div>

      {/* Token strip — the progress (tinted by result) and the navigation between items */}
      <ol aria-label={title} className={cn('grid grid-cols-4 lg:grid-cols-8', visuals ? 'mt-8 gap-3' : 'mt-6 gap-2')}>
        {items.map((it, i) => {
          const p = answers[it.id];
          const answeredIt = p !== undefined;
          const rightIt = p === it.answer;
          const isCur = i === cur;
          return (
            <li key={it.id}>
              <button
                ref={(el) => {
                  tokenRefs.current[i] = el;
                }}
                type="button"
                data-qa="sq-token"
                tabIndex={isCur ? 0 : -1}
                aria-current={isCur ? 'step' : undefined}
                onClick={() => show(i)}
                onKeyDown={onTokenKey}
                className={cn(
                  'flex w-full items-center rounded-xl border transition-colors duration-200 ease-snap cursor-pointer',
                  'font-display font-semibold leading-tight focus-visible:ring-offset-bg-elevated',
                  visuals
                    ? 'h-14 justify-center gap-2 px-2 text-lg text-fg'
                    : 'h-11 justify-between gap-1.5 px-3 text-start text-base',
                  // quieter than the choice buttons: the strip is progress + navigation, not the action
                  visuals
                    ? [
                        !answeredIt && (isCur ? 'bg-accent/10' : 'bg-bg-accent/60 hover:bg-bg-accent'),
                        answeredIt && (rightIt ? 'bg-brand/10' : 'bg-status-danger/[0.06]'),
                        // the item on stage: an orange 2px frame (border + inset shadow, so the focus ring composes with it)
                        isCur
                          ? 'border-accent shadow-[inset_0_0_0_1px_theme(colors.accent.DEFAULT)]'
                          : answeredIt
                            ? rightIt
                              ? 'border-brand/25 hover:border-brand/50'
                              : 'border-status-danger/25 hover:border-status-danger/50'
                            : 'border-border hover:border-border-strong',
                      ]
                    : [
                        !answeredIt &&
                          (isCur
                            ? 'border-accent bg-accent/10 text-fg'
                            : 'border-transparent bg-bg-accent text-fg-muted hover:border-border hover:text-fg'),
                        answeredIt && rightIt && 'bg-brand/10 text-fg',
                        answeredIt && !rightIt && 'bg-status-danger/[0.06] text-fg',
                        answeredIt && (isCur ? 'border-accent' : 'border-transparent hover:border-border'),
                      ],
                )}
              >
                <span className="truncate">{it.label}</span>
                {answeredIt &&
                  (visuals ? (
                    <ResultMark right={rightIt} size="sm" />
                  ) : (
                    <span aria-hidden className={cn('shrink-0', rightIt ? 'text-brand-dark' : 'text-status-danger')}>
                      <Icon name={rightIt ? 'check' : 'x'} size={15} strokeWidth={2.6} />
                    </span>
                  ))}
                {answeredIt && <span className="sr-only">{rightIt ? '— נכון' : '— לא נכון'}</span>}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Stage: the item (start) · the choices and their feedback (end).
          centered: the two column wrappers dissolve (`contents`) into one three-row grid —
          name | illustration ↔ choices (centered on it) | feedback under the choices. */}
      <div
        className={cn(
          'grid items-start gap-x-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]',
          centered ? 'mt-10 gap-y-3' : visuals ? 'mt-10 gap-y-5' : 'mt-8 gap-y-5',
        )}
      >
        <div className={cn(centered && 'contents')}>
          <div className={cn(centered && 'lg:col-start-1 lg:row-start-1')}>
            {showPosition && (
              <p className="mb-2 text-sm font-display font-semibold text-fg-muted tabular-nums">
                פריט {cur + 1} מתוך {items.length}
              </p>
            )}
            <motion.p key={item.id} {...enter} className="font-display text-4xl font-bold leading-tight text-fg">
              {item.label}
            </motion.p>
          </div>
          {visuals?.items[item.id] && (
            // fixed 3:2 frame: the illustration swaps inside it, so the stage never changes height
            <div
              data-qa="sq-illustration"
              className={cn('relative aspect-[3/2] w-full', centered ? 'lg:col-start-1 lg:row-start-2' : 'mt-3')}
            >
              <motion.div key={item.id} {...enter} className="absolute inset-0">
                <Image
                  src={visuals.items[item.id].src}
                  alt={visuals.items[item.id].alt}
                  width={1536}
                  height={1024}
                  sizes="(min-width: 1024px) 520px, 100vw"
                  onLoad={() => setStageLoaded(true)}
                  className="size-full object-contain"
                />
              </motion.div>
            </div>
          )}
        </div>

        <div className={cn(centered && 'contents')}>
          <div
            ref={choicesRef}
            data-qa="sq-choices"
            className={cn('grid grid-cols-2 gap-3', centered && 'lg:col-start-2 lg:row-start-2 lg:self-center')}
            role="group"
            aria-label={`מיון: ${item.label}`}
          >
            {options.map((opt) => {
              const chosen = picked === opt.id;
              const isAnswer = opt.id === item.answer;
              const showRight = isAnswered && isAnswer;
              const showWrong = isAnswered && chosen && !isAnswer;
              const art = visuals?.options[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-qa="sq-option"
                  // aria-disabled (not disabled) keeps focus in place after answering,
                  // so keyboard users can Tab straight on to „next”.
                  aria-disabled={isAnswered}
                  aria-pressed={chosen}
                  onClick={() => answer(item.id, opt.id)}
                  className={cn(
                    'border font-display font-bold transition-colors duration-200 ease-snap focus-visible:ring-offset-bg-elevated',
                    art
                      ? 'flex flex-col items-center rounded-2xl px-4 pb-4 pt-4 text-2xl leading-tight'
                      : 'flex h-14 items-center justify-center gap-2 rounded-xl text-lg',
                    !isAnswered && (art ? OPTION_IDLE_TINTED : OPTION_IDLE),
                    showRight && 'border-brand bg-brand/10 text-fg cursor-default',
                    showWrong && 'border-status-danger/60 bg-status-danger/[0.06] text-fg cursor-default',
                    isAnswered && !showRight && !showWrong && 'border-border/60 bg-bg-elevated text-fg-muted cursor-default',
                  )}
                >
                  {art ? (
                    <>
                      {/* decorative — the label below names the choice */}
                      <span className="relative block aspect-[3/2] h-[150px]">
                        <Image src={art} alt="" width={1536} height={1024} sizes="225px" className="size-full object-contain" />
                      </span>
                      <span className="mt-2 inline-flex items-center gap-2">
                        {(showRight || showWrong) && <ResultMark right={showRight} />}
                        {opt.label}
                      </span>
                    </>
                  ) : (
                    <>
                      {showRight && <Icon name="check" size={18} strokeWidth={2.6} className="text-brand-dark" />}
                      {showWrong && <Icon name="x" size={17} strokeWidth={2.6} className="text-status-danger" />}
                      {opt.label}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback slot — height reserved so moving between items doesn't shift the layout.
              No exit animation: the feedback belongs to the item on stage and swaps with it at once
              (an exiting copy would also hold a stale „next” button). */}
          <div
            className={cn(
              centered ? 'min-h-[124px] lg:col-start-2 lg:row-start-3' : visuals ? 'mt-4 min-h-[150px]' : 'mt-4 min-h-[88px]',
            )}
            aria-live="polite"
          >
            {announce && <p className="sr-only">{announce}</p>}
            {isAnswered ? (
              <motion.div
                key={item.id}
                data-qa="sq-feedback"
                {...enter}
                className={cn(
                  'flex items-center justify-between gap-5 rounded-xl p-4',
                  isRight ? 'bg-brand/10' : 'bg-status-danger/[0.06]',
                )}
              >
                <div className="flex items-start gap-3">
                  {visuals && (
                    <span className="mt-0.5">
                      <ResultMark right={isRight} />
                    </span>
                  )}
                  <p className="text-base leading-relaxed text-fg">
                    <strong className="font-display font-bold">
                      {isRight ? 'נכון. ' : `לא בדיוק. הסיווג הנכון: ${answerLabel}. `}
                    </strong>
                    {item.why}
                  </p>
                </div>
                {nextIdx !== -1 && (
                  <button
                    ref={nextRef}
                    type="button"
                    data-qa="sq-next"
                    onClick={goNext}
                    className="btn-primary shrink-0 px-4 cursor-pointer focus-visible:ring-offset-bg-elevated"
                  >
                    לפריט הבא
                    <Icon name="arrow-left" size={17} />
                  </button>
                )}
              </motion.div>
            ) : (
              hint && (
                <p
                  data-qa="sq-hint"
                  className={cn('text-center text-base leading-relaxed text-fg-muted', !centered && 'pt-3')}
                >
                  {hint}
                </p>
              )
            )}
            {!showFinalScore && done && doneText && (
              <p data-qa="sq-done" className="mt-3 font-display text-base font-bold leading-relaxed text-fg">
                {doneText}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Completion — the result and the way back in; the strip above stays clickable for review.
          The final score is announced from a region that is always mounted. */}
      {showFinalScore && (
        <>
          <p className="sr-only" aria-live="polite">
            {done ? `${correct}/${items.length} נכון` : ''}
          </p>
          <AnimatePresence>
            {done && (
              <motion.div
                data-qa="sq-done"
                initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: EASE, delay: reduce ? 0 : 0.15 }}
                className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-5"
              >
                <div>
                  <p className="font-display text-2xl font-bold text-fg tabular-nums">
                    {correct}/{items.length} נכון
                  </p>
                  <p className="mt-1 text-sm text-fg-muted leading-snug">
                    {perfect ? 'כל הפריטים סווגו נכון.' : 'בחרו פריט בשורה שלמעלה כדי לקרוא שוב את ההסבר.'}
                  </p>
                </div>
                {resetButton}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
