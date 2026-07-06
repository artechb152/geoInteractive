'use client';

/**
 * Click-to-pair matching demo. The learner clicks a term, then clicks
 * a definition (or vice versa), and an SVG line is drawn between the
 * two. After all 8 pairs are matched, "בדוק" colour-codes the lines
 * green (correct) or red (wrong) so the learner can fix mistakes.
 *
 * Why click-to-pair vs HTML5 drag-and-drop: drag is fiddly on touch
 * + when both rows are RTL, drag offsets get confusing. Tap term →
 * tap def gives the same "connect them" feel without the friction.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import { LESSON_1_TERMS } from './lesson-1-terms';
import { cn } from '@/lib/utils';

// Stable per-mount shuffle so each side appears in a different order
// (so positions in the two columns don't give the answer away).
function useShuffled<T>(items: T[]) {
  return useMemo(() => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [items]);
}

export function MatchDemo() {
  const terms = useShuffled(LESSON_1_TERMS);
  const defs = useShuffled(LESSON_1_TERMS);

  // pairs[termId] = defId
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [selectedDef, setSelectedDef] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const termRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const defRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<
    { termId: string; defId: string; x1: number; y1: number; x2: number; y2: number }[]
  >([]);

  // Re-measure lines whenever pairs or the layout changes.
  useLayoutEffect(() => {
    const recalc = () => {
      if (!stageRef.current) return;
      const stage = stageRef.current.getBoundingClientRect();
      const next: typeof lines = [];
      for (const [termId, defId] of Object.entries(pairs)) {
        const t = termRefs.current[termId]?.getBoundingClientRect();
        const d = defRefs.current[defId]?.getBoundingClientRect();
        if (!t || !d) continue;
        next.push({
          termId,
          defId,
          // Terms column is on the RIGHT in RTL → start line at left edge of term card
          x1: t.left - stage.left,
          y1: t.top + t.height / 2 - stage.top,
          // Defs column is on the LEFT → end line at right edge of def card
          x2: d.right - stage.left,
          y2: d.top + d.height / 2 - stage.top,
        });
      }
      setLines(next);
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [pairs]);

  // If the user picks both ends, commit the pair.
  useEffect(() => {
    if (selectedTerm && selectedDef) {
      setPairs((prev) => {
        const next = { ...prev };
        // Remove any existing pair that involves either side.
        for (const [tId, dId] of Object.entries(next)) {
          if (tId === selectedTerm || dId === selectedDef) delete next[tId];
        }
        next[selectedTerm] = selectedDef;
        return next;
      });
      setSelectedTerm(null);
      setSelectedDef(null);
    }
  }, [selectedTerm, selectedDef]);

  const allPaired = Object.keys(pairs).length === LESSON_1_TERMS.length;
  const correctCount = Object.entries(pairs).filter(([t, d]) => t === d).length;

  function reset() {
    setPairs({});
    setSelectedTerm(null);
    setSelectedDef(null);
    setSubmitted(false);
  }

  function lineColor(termId: string, defId: string) {
    if (!submitted) return 'stroke-accent';
    return termId === defId ? 'stroke-status-ok' : 'stroke-status-danger';
  }

  function statusFor(termId: string, defId: string | undefined) {
    if (!submitted || !defId) return null;
    return termId === defId ? 'ok' : 'bad';
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="text-sm text-fg-muted">
          זוגות: <strong className="text-fg">{Object.keys(pairs).length}</strong> /{' '}
          {LESSON_1_TERMS.length}
          {submitted && (
            <span className="ms-3">
              נכון: <strong className="text-status-ok">{correctCount}</strong> /{' '}
              {LESSON_1_TERMS.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-fg-muted hover:text-fg hover:border-border-strong transition-colors"
          >
            <RotateCcw className="size-3.5" aria-hidden /> איפוס
          </button>
          <button
            type="button"
            disabled={!allPaired || submitted}
            onClick={() => setSubmitted(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent text-bg-elevated font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="size-3.5" aria-hidden /> בדוק
          </button>
        </div>
      </div>

      <div ref={stageRef} className="relative">
        {/* SVG overlay for connecting lines — sits above the cards
            but behind clicks (pointer-events: none). */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
        >
          {lines.map((l) => (
            <line
              key={`${l.termId}-${l.defId}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              className={cn('transition-colors', lineColor(l.termId, l.defId))}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="grid grid-cols-2 gap-x-16 sm:gap-x-24 gap-y-2.5">
          {/* TERMS column — first child = RIGHT in RTL */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[11px] font-display font-semibold text-fg-muted uppercase tracking-wider mb-1">
              מושג
            </div>
            {terms.map((t) => {
              const isSelected = selectedTerm === t.id;
              const matchedDef = pairs[t.id];
              const status = statusFor(t.id, matchedDef);
              return (
                <div
                  key={t.id}
                  ref={(el) => {
                    termRefs.current[t.id] = el;
                  }}
                  onClick={() => !submitted && setSelectedTerm(isSelected ? null : t.id)}
                  className={cn(
                    'cursor-pointer rounded-[3px] border bg-bg-elevated px-3.5 py-2.5 text-right transition-all',
                    'font-display font-semibold text-[15px] text-fg',
                    submitted && status === 'ok' && 'border-status-ok/60 bg-status-ok/10',
                    submitted && status === 'bad' && 'border-status-danger/60 bg-status-danger/10',
                    !submitted && isSelected && 'border-accent bg-accent/10',
                    !submitted && !isSelected && matchedDef && 'border-accent/40 bg-accent/5',
                    !submitted && !isSelected && !matchedDef && 'border-border hover:border-accent/30',
                  )}
                >
                  {t.term}
                </div>
              );
            })}
          </div>

          {/* DEFS column */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[11px] font-display font-semibold text-fg-muted uppercase tracking-wider mb-1">
              הגדרה
            </div>
            {defs.map((d) => {
              const isSelected = selectedDef === d.id;
              const pairedTermId = Object.entries(pairs).find(([, dId]) => dId === d.id)?.[0];
              const status = pairedTermId ? statusFor(pairedTermId, d.id) : null;
              return (
                <div
                  key={d.id}
                  ref={(el) => {
                    defRefs.current[d.id] = el;
                  }}
                  onClick={() => !submitted && setSelectedDef(isSelected ? null : d.id)}
                  className={cn(
                    'cursor-pointer rounded-[3px] border bg-bg-elevated px-3.5 py-2.5 text-right transition-all text-sm text-fg-muted leading-snug',
                    submitted && status === 'ok' && 'border-status-ok/60 bg-status-ok/10 text-fg',
                    submitted && status === 'bad' && 'border-status-danger/60 bg-status-danger/10 text-fg',
                    !submitted && isSelected && 'border-accent bg-accent/10 text-fg',
                    !submitted && !isSelected && pairedTermId && 'border-accent/40 bg-accent/5',
                    !submitted && !isSelected && !pairedTermId && 'border-border hover:border-accent/30',
                  )}
                >
                  {d.def}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mt-6 rounded-[3px] border p-4',
            correctCount === LESSON_1_TERMS.length
              ? 'border-status-ok/40 bg-status-ok/10 text-status-ok'
              : 'border-status-warn/40 bg-status-warn/10 text-status-warn',
          )}
        >
          {correctCount === LESSON_1_TERMS.length
            ? '🎯 כל הזוגות נכונים. כל הכבוד!'
            : `${correctCount}/${LESSON_1_TERMS.length} נכונים. אדום = טעות, ירוק = נכון.`}
        </motion.div>
      )}
    </div>
  );
}
