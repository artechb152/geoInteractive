'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ListChecks, RotateCcw, Send, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Question = {
  id: string;
  stem: string;
  options: { id: string; label: string }[];
  correctId: string;
  rationale: string;
  feedback?: Record<string, string>;
  objective?: string;
};

const easeSnap = [0.22, 1, 0.36, 1] as const;

export function Quiz({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = Object.keys(answers).length === questions.length;
  const score = submitted
    ? questions.filter((q) => answers[q.id] === q.correctId).length
    : 0;
  const passed = score >= Math.ceil(questions.length * 0.7);

  return (
    <div className="space-y-7">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2.5 text-sm md:text-[15px] font-display font-semibold tracking-wider text-fg-muted">
          <ListChecks className="size-4 text-brand-dark" aria-hidden />
          בדיקת ידע
        </div>
        <h2 className="font-display font-bold tracking-tight text-balance leading-tight text-[clamp(1.5rem,2.6vw,2rem)]">
          בדקו את עצמכם.
        </h2>
        <p className="text-sm md:text-base text-fg-muted">
          {questions.length} שאלות · בחרו תשובה אחת לכל שאלה
        </p>
      </header>

      {/* ── Questions ───────────────────────────────────────────────── */}
      <ol className="space-y-4">
        {questions.map((q, i) => {
          const picked = answers[q.id];
          const isCorrect = picked === q.correctId;
          return (
            <li
              key={q.id}
              className={cn(
                'relative rounded-2xl border bg-bg-elevated p-5 md:p-6 transition-colors duration-300 ease-snap',
                !submitted && 'border-border',
                submitted && isCorrect && 'border-status-ok/40',
                submitted && !isCorrect && 'border-status-danger/40',
              )}
            >
              <div className="flex gap-3.5 items-start mb-4">
                <span
                  className={cn(
                    'grid place-items-center size-8 shrink-0 rounded-full font-display font-bold text-sm border transition-colors',
                    !submitted && 'bg-bg-accent border-border text-fg-muted',
                    submitted && isCorrect && 'bg-status-ok/15 border-status-ok/40 text-status-ok',
                    submitted && !isCorrect && 'bg-status-danger/10 border-status-danger/40 text-status-danger',
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p className="font-display font-semibold text-[15px] md:text-base leading-snug text-fg pt-0.5 text-balance">
                  {q.stem}
                </p>
              </div>

              <div className="space-y-2 pr-[3rem] md:pr-[3.5rem]">
                {q.options.map((o) => {
                  const isPicked = picked === o.id;
                  const isAnswer = o.id === q.correctId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                      className={cn(
                        'w-full text-right px-4 py-3 rounded-xl border transition-all duration-200 ease-snap text-sm md:text-[15px] flex items-center gap-3',
                        !submitted && isPicked && 'border-brand-dark bg-brand/10 text-brand-dark font-medium',
                        !submitted && !isPicked && 'border-border hover:border-brand/40 hover:bg-brand/5 text-fg',
                        submitted && isAnswer && 'border-status-ok/50 bg-status-ok/10 text-status-ok font-medium',
                        submitted && isPicked && !isAnswer && 'border-status-danger/50 bg-status-danger/10 text-status-danger font-medium',
                        submitted && !isPicked && !isAnswer && 'border-border-subtle opacity-55 text-fg-muted',
                        'disabled:cursor-default',
                      )}
                    >
                      <span
                        className={cn(
                          'grid place-items-center size-5 shrink-0 rounded-full border transition-colors',
                          !submitted && isPicked && 'border-brand-dark bg-brand-dark text-bg-elevated',
                          !submitted && !isPicked && 'border-border-strong',
                          submitted && isAnswer && 'border-status-ok bg-status-ok text-bg-elevated',
                          submitted && isPicked && !isAnswer && 'border-status-danger bg-status-danger text-bg-elevated',
                          submitted && !isPicked && !isAnswer && 'border-border opacity-60',
                        )}
                        aria-hidden
                      >
                        {submitted && isAnswer && <Check className="size-3" strokeWidth={3} />}
                        {submitted && isPicked && !isAnswer && <X className="size-3" strokeWidth={3} />}
                        {!submitted && isPicked && <span className="size-1.5 rounded-full bg-bg-elevated" />}
                      </span>
                      <span className="flex-1 text-pretty leading-snug">{o.label}</span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {submitted && (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    transition={{ duration: 0.3, ease: easeSnap }}
                    className="overflow-hidden"
                  >
                    <div
                      className={cn(
                        'p-3.5 rounded-xl text-sm md:text-[15px] border flex gap-2.5 items-start leading-relaxed',
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
                          {isCorrect ? 'נכון.' : 'לא נכון.'}
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
      <div className="rounded-2xl border border-border bg-bg-elevated p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
        {submitted ? (
          <>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'grid place-items-center size-12 rounded-full',
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
                <div className="font-display font-bold text-2xl text-fg leading-tight">
                  <span className={cn(passed ? 'text-brand-dark' : 'text-status-warn')}>{score}</span>
                  <span className="text-fg-dim font-medium">/{questions.length}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-fg hover:bg-bg-accent hover:border-border-strong transition-colors"
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
                'group inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-fg bg-accent hover:bg-accent-hover hover:text-bg-elevated transition-all shadow-glow',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-accent disabled:hover:text-fg',
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
