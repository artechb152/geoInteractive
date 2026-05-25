'use client';

/**
 * Speed-quiz demo. For each of the 8 terms the learner sees the
 * definition and four term options — the correct one + three
 * distractors drawn from the rest of the lesson. Clicking flips a
 * tile green/red, then auto-advances after a short pause.
 *
 * No timer pressure (this is recap, not high-stakes), but answers
 * are committed on click so the score reflects first-try accuracy.
 */

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, RotateCcw, X } from 'lucide-react';
import { LESSON_1_TERMS } from './lesson-1-terms';
import { cn } from '@/lib/utils';

type Question = {
  termId: string;
  def: string;
  options: { id: string; term: string }[];
  correctId: string;
};

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(): Question[] {
  return shuffle(LESSON_1_TERMS).map((t) => {
    const distractors = shuffle(LESSON_1_TERMS.filter((x) => x.id !== t.id)).slice(0, 3);
    const options = shuffle([t, ...distractors]).map((x) => ({ id: x.id, term: x.term }));
    return { termId: t.id, def: t.def, options, correctId: t.id };
  });
}

export function QuizDemo() {
  const [questions, setQuestions] = useState<Question[]>(() => buildQuestions());
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);

  const q = questions[idx];
  const total = questions.length;
  const done = idx >= total;

  // Auto-advance shortly after the learner answers.
  useEffect(() => {
    if (!picked) return;
    const t = setTimeout(() => {
      setIdx((i) => i + 1);
      setPicked(null);
    }, 1100);
    return () => clearTimeout(t);
  }, [picked]);

  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    if (id === q.correctId) {
      setScore((s) => s + 1);
    } else {
      setMissed((m) => [...m, q.termId]);
    }
  }

  function reset() {
    setQuestions(buildQuestions());
    setIdx(0);
    setPicked(null);
    setScore(0);
    setMissed([]);
  }

  // ── Done screen ────────────────────────────────────────────────
  if (done) {
    const pct = Math.round((score / total) * 100);
    const tone =
      pct >= 90 ? 'ok' : pct >= 60 ? 'warn' : 'danger';
    const toneCls = {
      ok: 'border-status-ok/40 bg-status-ok/10 text-status-ok',
      warn: 'border-status-warn/40 bg-status-warn/10 text-status-warn',
      danger: 'border-status-danger/40 bg-status-danger/10 text-status-danger',
    }[tone];
    return (
      <div className={cn('rounded-2xl border p-8 text-center', toneCls)}>
        <div className="font-display font-bold text-3xl mb-1">
          {score} / {total}
        </div>
        <div className="text-sm mb-1 font-display font-semibold tracking-wider">
          {pct}% תשובות נכונות בנסיון ראשון
        </div>
        {missed.length > 0 && (
          <div className="text-sm text-fg-muted mt-4 mb-5">
            כדאי לחזור על:{' '}
            {missed
              .map((id) => LESSON_1_TERMS.find((t) => t.id === id)?.term)
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-fg font-semibold hover:bg-accent-hover transition-colors shadow-glow"
        >
          <RotateCcw className="size-4" aria-hidden /> נסה שוב
        </button>
      </div>
    );
  }

  // ── Question screen ────────────────────────────────────────────
  const pct = (idx / total) * 100;

  return (
    <div>
      {/* Progress bar + counter */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="text-sm text-fg-muted">
          שאלה <strong className="text-fg">{idx + 1}</strong> / {total}
        </div>
        <div className="text-sm text-fg-muted">
          ציון: <strong className="text-status-ok">{score}</strong>
        </div>
      </div>
      <div className="h-1 rounded-full bg-bg-accent overflow-hidden mb-7">
        <motion.div
          className="h-full bg-gradient-to-l from-accent to-accent-cool rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Definition card */}
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 md:p-8 mb-6 text-center">
            <div className="text-[11px] font-display font-semibold tracking-wider text-accent-hover uppercase mb-2">
              לאיזה מושג ההגדרה הזו שייכת?
            </div>
            <div className="font-display font-semibold text-lg md:text-xl leading-snug text-fg text-balance max-w-2xl mx-auto">
              {q.def}
            </div>
          </div>

          {/* Options grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            {q.options.map((opt) => {
              const isPicked = picked === opt.id;
              const isCorrect = opt.id === q.correctId;
              const reveal = picked !== null;
              const showOk = reveal && isCorrect;
              const showBad = reveal && isPicked && !isCorrect;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => pick(opt.id)}
                  disabled={picked !== null}
                  className={cn(
                    'group rounded-xl border bg-bg-elevated px-4 py-3.5 text-right font-display font-semibold text-base transition-all',
                    'flex items-center justify-between gap-3',
                    showOk && 'border-status-ok/60 bg-status-ok/10 text-status-ok',
                    showBad && 'border-status-danger/60 bg-status-danger/10 text-status-danger',
                    !reveal && 'border-border hover:border-accent/40 hover:bg-accent/5 cursor-pointer',
                    reveal && !showOk && !showBad && 'opacity-60',
                  )}
                >
                  <span>{opt.term}</span>
                  {showOk && <Check className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />}
                  {showBad && <X className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
