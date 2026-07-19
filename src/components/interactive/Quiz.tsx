'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ListChecks, RotateCcw, Send, Trophy, Lightbulb, Eye } from 'lucide-react';
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
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2.5 text-sm md:text-[15px] font-display font-semibold tracking-wider text-fg-muted">
          <ListChecks className="size-4 text-accent" aria-hidden />
          בדיקת ידע
        </div>
        <h2 className="font-display font-bold tracking-tight text-balance leading-tight text-[clamp(1.25rem,2.2vw,1.625rem)]">
          בדקו את עצמכם.
        </h2>
        <p className="text-sm md:text-base text-fg-muted">
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
                'relative rounded-[4px] border bg-bg-elevated p-3.5 md:p-4 transition-colors duration-300 ease-snap',
                !submitted && 'border-border',
                submitted && isCorrect && 'border-status-ok/40',
                submitted && !isCorrect && inRetry && 'border-status-warn/40',
                submitted && !isCorrect && !inRetry && 'border-status-danger/40',
              )}
            >
              <div className="flex gap-3 items-start mb-3.5">
                <span
                  className={cn(
                    'grid place-items-center size-7 shrink-0 rounded-full font-display font-bold text-xs border transition-colors',
                    !submitted && 'bg-bg-accent border-border text-fg-muted',
                    submitted && isCorrect && 'bg-status-ok/15 border-status-ok/40 text-status-ok',
                    submitted && !isCorrect && inRetry && 'bg-status-warn/10 border-status-warn/40 text-status-warn',
                    submitted && !isCorrect && !inRetry && 'bg-status-danger/10 border-status-danger/40 text-status-danger',
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p className="font-display font-semibold text-sm md:text-[15px] leading-snug text-fg pt-0.5 text-balance">
                  {q.stem}
                </p>
              </div>

              <div className="space-y-1.5 pr-[2.75rem] md:pr-[3.25rem]">
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
                        'w-full text-right px-3.5 py-2.5 rounded-[3px] border transition-all duration-200 ease-snap text-sm md:text-[15px] flex items-center gap-3',
                        // pre-submit + active retry (options stay pickable)
                        !locked && isPicked && !inRetry && 'border-accent-hover bg-accent/10 text-accent font-medium',
                        !locked && isPicked && inRetry && 'border-status-danger/50 bg-status-danger/10 text-status-danger font-medium',
                        !locked && !isPicked && 'border-border hover:border-accent/40 hover:bg-accent/5 text-fg',
                        // locked / answer shown
                        showAnswer && isAnswer && 'border-status-ok/50 bg-status-ok/10 text-status-ok font-medium',
                        showAnswer && isPicked && !isAnswer && 'border-status-danger/50 bg-status-danger/10 text-status-danger font-medium',
                        showAnswer && !isPicked && !isAnswer && 'border-border-subtle opacity-55 text-fg-muted',
                        'disabled:cursor-default',
                      )}
                    >
                      <span
                        className={cn(
                          'grid place-items-center size-5 shrink-0 rounded-full border transition-colors',
                          !locked && isPicked && !inRetry && 'border-accent-hover bg-accent-hover text-bg-elevated',
                          !locked && isPicked && inRetry && 'border-status-danger bg-status-danger text-bg-elevated',
                          !locked && !isPicked && 'border-border-strong',
                          showAnswer && isAnswer && 'border-status-ok bg-status-ok text-bg-elevated',
                          showAnswer && isPicked && !isAnswer && 'border-status-danger bg-status-danger text-bg-elevated',
                          showAnswer && !isPicked && !isAnswer && 'border-border opacity-60',
                        )}
                        aria-hidden
                      >
                        {showAnswer && isAnswer && <Check className="size-3" strokeWidth={3} />}
                        {showAnswer && isPicked && !isAnswer && <X className="size-3" strokeWidth={3} />}
                        {inRetry && isPicked && <X className="size-3" strokeWidth={3} />}
                        {!locked && isPicked && !inRetry && <span className="size-1.5 rounded-full bg-bg-elevated" />}
                      </span>
                      <span className="flex-1 text-pretty leading-snug">{o.label}</span>
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
                    <div className="p-3 rounded-[3px] text-sm md:text-[15px] border border-status-warn/40 bg-status-warn/5 leading-relaxed">
                      <div className="flex gap-2.5 items-start">
                        <span
                          className="grid place-items-center size-5 shrink-0 rounded-full mt-0.5 bg-status-warn/25 text-status-warn"
                          aria-hidden
                        >
                          <Lightbulb className="size-3" strokeWidth={2.5} />
                        </span>
                        <span className="text-fg text-pretty">
                          <strong className="font-semibold text-status-warn me-1">עוד לא.</strong>
                          <span className="text-fg-muted">{q.feedback?.[picked] ?? GENERIC_HINT}</span>
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-3 flex-wrap ps-7">
                        <span className="text-xs text-fg-dim">בחרו תשובה אחרת ונסו שוב.</span>
                        <button
                          type="button"
                          onClick={() => revealAnswer(q.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-medium border border-border text-fg-muted hover:text-fg hover:bg-bg-accent hover:border-border-strong transition-colors"
                        >
                          <Eye className="size-3.5" aria-hidden />
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
                        'p-3 rounded-[3px] text-sm md:text-[15px] border flex gap-2.5 items-start leading-relaxed',
                        isCorrect
                          ? 'border-status-ok/30 bg-status-ok/5'
                          : 'border-status-warn/40 bg-status-warn/5',
                      )}
                    >
                      <span
                        className={cn(
                          'grid place-items-center size-5 shrink-0 rounded-full mt-0.5',
                          isCorrect ? 'bg-status-ok/25 text-status-ok' : 'bg-status-warn/25 text-status-warn',
                        )}
                        aria-hidden
                      >
                        {isCorrect ? (
                          <Check className="size-3" strokeWidth={3} />
                        ) : (
                          <X className="size-3" strokeWidth={3} />
                        )}
                      </span>
                      <span className="text-fg text-pretty">
                        <strong className={cn('font-semibold me-1', isCorrect ? 'text-status-ok' : 'text-status-warn')}>
                          {isCorrect ? 'נכון.' : isRevealed ? 'התשובה הנכונה מסומנת למעלה.' : 'לא נכון.'}
                        </strong>
                        <span className="text-fg-muted">{q.rationale}</span>
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
      <div className="rounded-[4px] border border-border bg-bg-elevated p-3.5 md:p-4 flex flex-wrap items-center justify-between gap-4">
        {submitted ? (
          <>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'grid place-items-center size-10 rounded-full',
                  passed ? 'bg-brand/15 text-brand-dark border border-brand/30' : 'bg-status-warn/15 text-status-warn border border-status-warn/30',
                )}
                aria-hidden
              >
                <Trophy className="size-5" />
              </span>
              <div>
                <div className="text-[11px] font-display font-semibold tracking-wider text-fg-dim uppercase">
                  ציון
                </div>
                <div className="font-display font-bold text-xl text-fg leading-tight">
                  <span className={cn(passed ? 'text-brand-dark' : 'text-status-warn')}>{score}</span>
                  <span className="text-fg-dim font-medium">/{questions.length}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[3px] text-sm font-medium border border-border text-fg hover:bg-bg-accent hover:border-border-strong transition-colors"
            >
              <RotateCcw className="size-4" aria-hidden />
              ניסיון נוסף
            </button>
          </>
        ) : (
          <>
            <div className="text-sm text-fg-muted">
              {allAnswered
                ? 'ענית על כל השאלות — מוכן לשלוח.'
                : `${Object.keys(answers).length}/${questions.length} שאלות נענו`}
            </div>
            <button
              type="button"
              disabled={!allAnswered}
              onClick={() => setSubmitted(true)}
              className={cn(
                'group inline-flex items-center gap-2 px-5 py-2.5 rounded-[3px] font-medium text-bg-elevated bg-accent hover:bg-accent-hover transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent',
              )}
            >
              <Send className="size-4" aria-hidden />
              <span>שליחת תשובות</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
