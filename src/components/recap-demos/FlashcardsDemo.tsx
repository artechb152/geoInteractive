'use client';

/**
 * Flashcards with self-rated active recall. Each card shows the term;
 * the learner thinks of the definition, flips the card, and decides
 * "ידעתי" or "צריך לחזור". Cards marked "צריך לחזור" loop back to
 * the end of the queue, so the session ends only when everything is
 * marked "ידעתי". The flip uses framer-motion's rotateY.
 */

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, RefreshCw, RotateCcw } from 'lucide-react';
import { LESSON_1_TERMS } from './lesson-1-terms';
import { cn } from '@/lib/utils';

function shuffleIds(ids: string[]) {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FlashcardsDemo() {
  const initialQueue = useMemo(() => shuffleIds(LESSON_1_TERMS.map((t) => t.id)), []);
  const [queue, setQueue] = useState<string[]>(initialQueue);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [reviewedTimes, setReviewedTimes] = useState<Record<string, number>>({});
  const [flipped, setFlipped] = useState(false);
  const reduce = useReducedMotion();

  const currentId = queue[0];
  const currentTerm = LESSON_1_TERMS.find((t) => t.id === currentId);

  // Reset flip whenever the active card changes.
  useEffect(() => {
    setFlipped(false);
  }, [currentId]);

  const total = LESSON_1_TERMS.length;
  const knownCount = knownIds.size;
  const done = queue.length === 0;

  function markKnown() {
    if (!currentId) return;
    setKnownIds((prev) => new Set(prev).add(currentId));
    setReviewedTimes((prev) => ({ ...prev, [currentId]: (prev[currentId] ?? 0) + 1 }));
    setQueue((q) => q.slice(1));
  }
  function markReview() {
    if (!currentId) return;
    setReviewedTimes((prev) => ({ ...prev, [currentId]: (prev[currentId] ?? 0) + 1 }));
    // push to end of queue
    setQueue((q) => [...q.slice(1), q[0]]);
  }
  function reset() {
    setQueue(shuffleIds(LESSON_1_TERMS.map((t) => t.id)));
    setKnownIds(new Set());
    setReviewedTimes({});
    setFlipped(false);
  }

  // ── Done screen ────────────────────────────────────────────────
  if (done) {
    const reviewedHard = Object.entries(reviewedTimes).filter(([, n]) => n > 1);
    return (
      <div className="rounded-[4px] border border-status-ok/40 bg-status-ok/10 p-8 text-center">
        <div className="inline-flex size-14 rounded-full bg-status-ok/20 text-status-ok items-center justify-center mb-3">
          <Check className="size-7" strokeWidth={2.5} />
        </div>
        <div className="font-display font-bold text-xl mb-1.5">סיימת את כל המושגים</div>
        <div className="text-fg-muted text-sm mb-5">
          ידעת את כל {total} המושגים. {reviewedHard.length > 0
            ? `${reviewedHard.length} מתוכם דרשו חזרה.`
            : 'בלי חזרות — מצוין.'}
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[3px] bg-accent text-bg-elevated font-semibold hover:bg-accent-hover transition-colors"
        >
          <RotateCcw className="size-4" aria-hidden /> סבב נוסף
        </button>
      </div>
    );
  }

  // ── Active card ────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="text-sm text-fg-muted">
          ידעתי: <strong className="text-status-ok">{knownCount}</strong> / {total}
          <span className="mx-2 text-fg-dim">·</span>
          נשארו בתור: <strong className="text-fg">{queue.length}</strong>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-fg-muted hover:text-fg hover:border-border-strong transition-colors"
        >
          <RotateCcw className="size-3.5" aria-hidden /> איפוס
        </button>
      </div>

      <div className="flex justify-center mb-6">
        {/* CARD — perspective wrapper + flip child */}
        <div className="w-full max-w-xl h-[300px]" style={{ perspective: '1200px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentId + (flipped ? '-back' : '-front')}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full"
            >
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-pressed={flipped}
                aria-label={flipped ? 'הצג מושג' : 'הפוך לראות הגדרה'}
                className={cn(
                  'w-full h-full rounded-[4px] border p-8 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer',
                  flipped
                    ? 'border-accent-hover/40 bg-bg-elevated'
                    : 'border-accent/40 bg-accent/5',
                )}
              >
                {flipped ? (
                  <>
                    <div className="text-[11px] font-display font-semibold tracking-wider text-accent uppercase">
                      הגדרה
                    </div>
                    <div className="font-display font-semibold text-lg md:text-xl leading-snug text-fg max-w-md text-balance">
                      {currentTerm?.def}
                    </div>
                    <div className="text-xs text-fg-dim mt-2">קליק לחזרה</div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] font-display font-semibold tracking-wider text-accent uppercase">
                      מושג
                    </div>
                    <div className="font-display font-bold text-3xl md:text-4xl leading-tight text-fg max-w-md text-balance">
                      {currentTerm?.term}
                    </div>
                    <div className="text-xs text-fg-dim mt-2">קליק להפוך</div>
                  </>
                )}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Self-rating buttons — only show after the card is flipped */}
      <div className="flex justify-center gap-3 min-h-[52px]">
        {flipped && (
          <>
            <button
              type="button"
              onClick={markReview}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[3px] border border-accent/40 bg-bg-elevated text-accent font-semibold hover:bg-accent/10 transition-colors"
            >
              <RefreshCw className="size-4 text-accent" aria-hidden />
              צריך לחזור
            </button>
            <button
              type="button"
              onClick={markKnown}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[3px] bg-accent text-bg-elevated font-semibold hover:bg-accent-hover transition-colors"
            >
              <Check className="size-4" aria-hidden />
              ידעתי
            </button>
          </>
        )}
      </div>
    </div>
  );
}
