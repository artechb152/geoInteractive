'use client';

/**
 * Categorisation demo. 8 term chips at the top, 3 category bins
 * below. The learner clicks a chip to "pick it up", then clicks a
 * bin to drop it. Each chip can be moved freely between bins or
 * back to the pool until they hit "בדוק", which colour-codes each
 * placed chip green/red.
 *
 * Click-based instead of HTML5 drag for the same reasons as the
 * matching demo (touch friendliness, no offset confusion in RTL).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import {
  CATEGORIES,
  LESSON_1_TERMS,
  TONE_CLASSES,
  type CategoryId,
} from './lesson-1-terms';
import { cn } from '@/lib/utils';

export function SortDemo() {
  // assignments[termId] = categoryId | undefined (= still in the pool)
  const [assignments, setAssignments] = useState<Record<string, CategoryId | undefined>>(
    {},
  );
  const [pickedUp, setPickedUp] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function clickChip(id: string) {
    if (submitted) return;
    setPickedUp((p) => (p === id ? null : id));
  }
  function clickBin(catId: CategoryId | null) {
    if (submitted) return;
    if (!pickedUp) return;
    setAssignments((prev) => ({ ...prev, [pickedUp]: catId ?? undefined }));
    setPickedUp(null);
  }

  function reset() {
    setAssignments({});
    setPickedUp(null);
    setSubmitted(false);
  }

  const placed = Object.values(assignments).filter(Boolean).length;
  const allPlaced = placed === LESSON_1_TERMS.length;
  const correctCount = LESSON_1_TERMS.filter(
    (t) => assignments[t.id] === t.category,
  ).length;

  function statusFor(termId: string) {
    if (!submitted) return null;
    const t = LESSON_1_TERMS.find((x) => x.id === termId);
    if (!t) return null;
    return assignments[termId] === t.category ? 'ok' : 'bad';
  }

  const pool = LESSON_1_TERMS.filter((t) => !assignments[t.id]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="text-sm text-fg-muted">
          ממוין: <strong className="text-fg">{placed}</strong> /{' '}
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
            disabled={!allPlaced || submitted}
            onClick={() => setSubmitted(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent text-bg-elevated font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="size-3.5" aria-hidden /> בדוק
          </button>
        </div>
      </div>

      {/* POOL — unsorted chips */}
      <div
        onClick={() => clickBin(null)}
        className={cn(
          'rounded-[3px] border bg-bg-elevated min-h-[80px] p-3 mb-6 transition-colors',
          pickedUp && 'border-accent/50 bg-accent/5 cursor-pointer',
          !pickedUp && 'border-border-subtle',
        )}
      >
        <div className="text-[11px] font-display font-semibold text-fg-muted uppercase tracking-wider mb-2">
          מאגר המושגים{pool.length === 0 && ' (ריק — כולם ממוינים)'}
        </div>
        <div className="flex flex-wrap gap-2">
          {pool.map((t) => (
            <Chip
              key={t.id}
              label={t.term}
              picked={pickedUp === t.id}
              onClick={(e) => {
                e.stopPropagation();
                clickChip(t.id);
              }}
            />
          ))}
        </div>
      </div>

      {/* BINS */}
      <div className="grid sm:grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => {
          const tone = TONE_CLASSES[cat.tone];
          const inBin = LESSON_1_TERMS.filter((t) => assignments[t.id] === cat.id);
          return (
            <div
              key={cat.id}
              onClick={() => clickBin(cat.id)}
              className={cn(
                'rounded-[3px] border-2 border-dashed min-h-[180px] p-3 transition-colors',
                pickedUp ? `${tone.border} ${tone.bg} cursor-pointer` : 'border-border-subtle bg-bg-elevated/30',
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('size-2 rounded-full', tone.dot)} aria-hidden />
                <div
                  className={cn(
                    'text-sm font-display font-bold tracking-wider',
                    tone.text,
                  )}
                >
                  {cat.label}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {inBin.map((t) => {
                  const status = statusFor(t.id);
                  return (
                    <Chip
                      key={t.id}
                      label={t.term}
                      status={status}
                      picked={pickedUp === t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        clickChip(t.id);
                      }}
                    />
                  );
                })}
                {inBin.length === 0 && !pickedUp && (
                  <div className="text-xs text-fg-dim italic py-2">ריק</div>
                )}
              </div>
            </div>
          );
        })}
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
            ? '🎯 כל המושגים בקטגוריה הנכונה. הבנת את המבנה.'
            : `${correctCount}/${LESSON_1_TERMS.length} נכונים. אדום = בקטגוריה לא נכונה.`}
        </motion.div>
      )}
    </div>
  );
}

function Chip({
  label,
  picked,
  status,
  onClick,
}: {
  label: string;
  picked: boolean;
  status?: 'ok' | 'bad' | null;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-bg font-display font-semibold text-sm transition-all',
        status === 'ok' && 'border-status-ok/60 bg-status-ok/10 text-status-ok',
        status === 'bad' && 'border-status-danger/60 bg-status-danger/10 text-status-danger',
        !status && picked && 'border-accent bg-accent text-bg-elevated scale-105',
        !status && !picked && 'border-border text-fg hover:border-accent/40 hover:bg-accent/5',
      )}
    >
      {label}
    </button>
  );
}
