'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * SortQuiz — תרגול מיון מהיר בין שתי קטגוריות (תבליט/תכסית, טבעית/מלאכותית).
 * כל פריט נענה בנפרד ומקבל משוב מיידי עם הסבר; אפשר לאפס ולנסות שוב.
 * MVP עיצובי: פס התקדמות לפי פריטים, מצבי נכון/שגוי עם אייקונים, ובאנר סיום
 * שמציג את מונה „x/y נכון” הקיים.
 */
export type SortOption<K extends string> = { id: K; label: string };

export type SortItem<K extends string> = {
  id: string;
  label: string;
  answer: K;
  /** ההסבר שמוצג אחרי התשובה — למה זו הקטגוריה הנכונה. */
  why: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function SortQuiz<K extends string>({
  title,
  prompt,
  options,
  items,
}: {
  title: string;
  prompt: string;
  options: [SortOption<K>, SortOption<K>];
  items: SortItem<K>[];
}) {
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
    <div className="surface-elevated p-5 sm:p-6">
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
