'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Question = {
  id: string;
  stem: string;
  options: { id: string; label: string }[];
  correctId: string;
  rationale: string;
  /**
   * Optional per-option diagnostic hints (keyed by option id). When a
   * question provides `feedback`, the quiz switches to a *hint-first* flow:
   * a wrong answer shows the matching hint and lets the learner try again,
   * and the correct answer is revealed only after the learner picks it or
   * clicks "הצג תשובה". Questions without `feedback` keep the classic
   * reveal-on-submit behavior unchanged.
   */
  feedback?: Record<string, string>;
  objective?: string;
};

const easeSnap = [0.22, 1, 0.36, 1] as const;

const GENERIC_HINT =
  'עוד לא מדויק. חזרו לשכבה או למושג שהשאלה בודקת, וחשבו איזו שיטה עונה עליה בדיוק.';

export function Quiz({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  // Questions where the learner asked to see the answer (hint-flow only).
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const allAnswered = Object.keys(answers).length === questions.length;
  const score = submitted
    ? questions.filter((q) => answers[q.id] === q.correctId).length
    : 0;
  const passed = score >= Math.ceil(questions.length * 0.7);

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setRevealed(new Set());
  };

  const revealAnswer = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="text-sm font-display font-semibold tracking-wider text-fg-muted">
          בדיקת ידע
        </div>
        <h2 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl text-balance">
          בדקו את עצמכם.
        </h2>
        <p className="text-base leading-relaxed text-fg-muted">
          {questions.length} שאלות · בחרו תשובה אחת לכל שאלה
        </p>
      </header>

      {/* ── Questions ───────────────────────────────────────────────── */}
      <ol className="space-y-3">
        {questions.map((q, i) => {
          const picked = answers[q.id];
          const isCorrect = picked === q.correctId;
          // Hint-flow is opt-in: only questions that ship per-option
          // diagnostics use it. Everything else keeps the classic flow.
          const hintMode = !!q.feedback && Object.keys(q.feedback).length > 0;
          const isRevealed = revealed.has(q.id);
          // Whether the correct option + rationale may be shown. In classic
          // mode this is simply "submitted". In hint mode we hold it back on
          // a wrong answer until the learner recovers or asks to reveal.
          const showAnswer = submitted && (!hintMode || isCorrect || isRevealed);
          // A wrong pick that is still being worked on (hint mode only).
          const inRetry = submitted && hintMode && !isCorrect && !isRevealed;
          const locked = submitted && !inRetry;

          return (
            <li
              key={q.id}
              className={cn(
                'relative surface bg-bg-elevated p-4 transition-all duration-300 ease-snap',
                !submitted && 'border-border',
                submitted && isCorrect && 'border-status-ok/50',
                submitted && !isCorrect && 'border-status-danger/50',
              )}
            >
              <div className="flex gap-3 items-center mb-3">
                <span
                  className={cn(
                    'size-11 rounded-xl flex items-center justify-center shrink-0 border font-display text-base font-bold transition-all duration-300 ease-snap',
                    !submitted && 'bg-bg-accent text-fg-muted border-border',
                    submitted && isCorrect && 'text-status-ok bg-status-ok/10 border-status-ok/50',
                    submitted && !isCorrect && 'text-status-danger bg-status-danger/10 border-status-danger/50',
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p className="font-display font-bold leading-tight text-black text-lg md:text-xl text-balance">
                  {q.stem}
                </p>
              </div>

              <div className="space-y-2 ps-14">
                {q.options.map((o) => {
                  const isPicked = picked === o.id;
                  const isAnswer = o.id === q.correctId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={locked}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                      className={cn(
                        'w-full text-start px-4 py-3 rounded-xl border transition-all duration-300 ease-snap text-base leading-relaxed text-black flex items-center gap-3',
                        // pre-submit + active retry (options stay pickable)
                        !locked && isPicked && !inRetry && 'border-accent bg-accent/10',
                        !locked && isPicked && inRetry && 'border-status-danger/50 bg-status-danger/10',
                        !locked && !isPicked && 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                        // locked / answer shown
                        showAnswer && isAnswer && 'bg-status-ok/10 border-status-ok/50',
                        showAnswer && isPicked && !isAnswer && 'bg-status-danger/10 border-status-danger/50',
                        showAnswer && !isPicked && !isAnswer && 'border-border-subtle opacity-45',
                        'disabled:cursor-default',
                      )}
                    >
                      <span
                        className={cn(
                          'grid place-items-center size-5 shrink-0 rounded-full border transition-colors',
                          !locked && isPicked && !inRetry && 'border-accent bg-accent text-bg-elevated',
                          !locked && isPicked && inRetry && 'border-status-danger bg-status-danger text-bg-elevated',
                          !locked && !isPicked && 'border-border',
                          showAnswer && isAnswer && 'border-status-ok bg-status-ok text-bg-elevated',
                          showAnswer && isPicked && !isAnswer && 'border-status-danger bg-status-danger text-bg-elevated',
                          showAnswer && !isPicked && !isAnswer && 'border-border opacity-45',
                        )}
                        aria-hidden
                      >
                        {showAnswer && isAnswer && <Check className="size-3" strokeWidth={3} />}
                        {showAnswer && isPicked && !isAnswer && <X className="size-3" strokeWidth={3} />}
                        {inRetry && isPicked && <X className="size-3" strokeWidth={3} />}
                        {!locked && isPicked && !inRetry && <span className="size-1.5 rounded-full bg-bg-elevated" />}
                      </span>
                      <span className="flex-1 text-pretty leading-relaxed">{o.label}</span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {/* Hint-flow: wrong answer, correct answer still withheld ── */}
                {inRetry && (
                  <motion.div
                    key="hint"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: easeSnap }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-xl text-base leading-relaxed border border-status-danger/50 bg-status-danger/10">
                      <span className="text-black text-pretty">
                        <strong className="font-bold text-status-danger me-1">עוד לא.</strong>
                        <span className="text-black">{q.feedback?.[picked] ?? GENERIC_HINT}</span>
                      </span>
                      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm text-fg-muted leading-snug">בחרו תשובה אחרת ונסו שוב.</span>
                        <button
                          type="button"
                          onClick={() => revealAnswer(q.id)}
                          className="inline-flex items-center text-sm font-display font-semibold text-fg-muted hover:text-brand-dark transition-colors"
                        >
                          הצג תשובה
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Answer shown: correct, revealed, or classic flow ──────── */}
                {showAnswer && (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: easeSnap }}
                    className="overflow-hidden"
                  >
                    <div
                      className={cn(
                        'p-4 rounded-xl text-base leading-relaxed border flex gap-2.5 items-start',
                        isCorrect
                          ? 'border-status-ok/50 bg-status-ok/10'
                          : 'border-status-danger/50 bg-status-danger/10',
                      )}
                    >
                      <span
                        className={cn(
                          'grid place-items-center size-5 shrink-0 rounded-full mt-0.5',
                          isCorrect ? 'bg-status-ok text-bg-elevated' : 'bg-status-danger text-bg-elevated',
                        )}
                        aria-hidden
                      >
                        {isCorrect ? (
                          <Check className="size-3" strokeWidth={3} />
                        ) : (
                          <X className="size-3" strokeWidth={3} />
                        )}
                      </span>
                      <span className="text-black text-pretty">
                        <strong className={cn('font-bold me-1', isCorrect ? 'text-status-ok' : 'text-status-danger')}>
                          {isCorrect ? 'נכון.' : isRevealed ? 'התשובה הנכונה מסומנת למעלה.' : 'לא נכון.'}
                        </strong>
                        <span className="text-black">{q.rationale}</span>
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>

      {/* ── Footer: submit / score ──────────────────────────────────── */}
      <div className="surface bg-bg-elevated p-4 flex flex-wrap items-center justify-between gap-4">
        {submitted ? (
          <>
            <div className="flex items-center">
              <div>
                <div className="text-sm font-display font-semibold tracking-wider text-fg-muted">
                  ציון
                </div>
                <div className="font-display font-bold text-xl text-black leading-tight tabular-nums">
                  <span className={cn(passed ? 'text-brand-dark' : 'text-status-danger')}>{score}</span>
                  <span className="text-fg-muted font-medium">/{questions.length}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="btn-secondary"
            >
              ניסיון נוסף
            </button>
          </>
        ) : (
          <>
            <div className="text-sm text-fg-muted leading-snug">
              {allAnswered
                ? 'ענית על כל השאלות — מוכן לשלוח.'
                : `${Object.keys(answers).length}/${questions.length} שאלות נענו`}
            </div>
            <button
              type="button"
              disabled={!allAnswered}
              onClick={() => setSubmitted(true)}
              className="btn-primary disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:translate-y-0"
            >
              <span>שליחת תשובות</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
