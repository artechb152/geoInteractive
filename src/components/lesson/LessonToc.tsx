'use client';

/**
 * LessonToc — "תוכן השיעור" בשפת Design 1 (§12).
 *
 * דסקטופ: כרטיס לבן sticky בעמודה הימנית; כל סצנה היא שורה עם עיגול
 * ממוספר על ציר אנכי דק. מובייל: רצועת פלטות אופקית + ציר התקדמות
 * (LessonTocMobile).
 *
 * מצבי נקודת ציון:
 *   completed — עיגול מרווה מלא עם ✓
 *   active    — עיגול כתום מלא + רקע חם לשורה
 *   future    — עיגול outline אפור
 */
import { Check } from 'lucide-react';
import type { PagedScene } from './PagedLearn';
import type { LessonNavInfo } from './LessonShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

type TocState = 'completed' | 'active' | 'future';

function stateOf(i: number, active: number): TocState {
  if (i < active) return 'completed';
  if (i === active) return 'active';
  return 'future';
}

function Waypoint({ state, index }: { state: TocState; index: number }) {
  if (state === 'completed') {
    return (
      <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-brand-dark" aria-hidden>
        <Check className="size-3.5 text-bg" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-accent font-display text-xs font-bold text-bg-elevated"
        aria-hidden
      >
        {index + 1}
      </span>
    );
  }
  return (
    <span
      className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full border border-border-strong bg-bg-card font-display text-xs font-bold text-fg-dim"
      aria-hidden
    >
      {index + 1}
    </span>
  );
}

export function LessonToc({
  scenes,
  active,
  onGoto,
  lesson,
  className,
}: {
  scenes: PagedScene[];
  active: number;
  onGoto: (i: number) => void;
  lesson?: LessonNavInfo['current'];
  className?: string;
}) {
  const pct = ((active + 1) / scenes.length) * 100;
  return (
    <SurfaceCard
      as="aside"
      className={cn(
        'sticky top-[calc(var(--header-h)+1rem)] max-h-[calc(100vh-var(--header-h)-2rem)] overflow-y-auto p-4',
        className,
      )}
    >
      <div aria-label="תוכן השיעור">
        {lesson && (
          <div className="mb-3 border-b border-border px-1 pb-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-accent" dir="ltr">
                {String(lesson.number).padStart(2, '0')}
              </span>
              <span className="font-display text-[13px] font-extrabold leading-tight text-fg text-balance">
                {lesson.shortTitle}
              </span>
            </div>
          </div>
        )}
        <div className="mb-3 px-1 text-[10px] font-display font-bold uppercase tracking-[0.22em] text-brand-dark">
          תוכן השיעור
        </div>

        {/* ציר אנכי דק + נקודות ציון */}
        <ol className="relative flex list-none flex-col">
          <span aria-hidden className="absolute bottom-6 top-6 start-[13px] w-px bg-border" />
          {scenes.map((s, i) => {
            const state = stateOf(i, active);
            const isActive = state === 'active';
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onGoto(i)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors',
                    isActive ? 'bg-bg-accent' : 'hover:bg-bg-accent/60',
                  )}
                >
                  <Waypoint state={state} index={i} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-[13.5px] leading-snug',
                      isActive
                        ? 'font-extrabold text-fg'
                        : state === 'completed'
                          ? 'font-medium text-fg-muted'
                          : 'text-fg-dim',
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 border-t border-border px-1 pt-3.5">
          <div className="mb-2 flex items-center justify-between text-[11px] text-fg-dim">
            <span className="font-display font-bold text-brand-dark">התקדמות</span>
            <span className="font-mono" dir="ltr">
              {active + 1}/{scenes.length}
            </span>
          </div>
          <ProgressBar value={pct} tone="accent" label="התקדמות בסצנות" />
        </div>
      </div>
    </SurfaceCard>
  );
}

/** רצועת פלטות אופקית + ציר התקדמות — מתחת ל-lg (design-system §11 mobile). */
export function LessonTocMobile({
  scenes,
  active,
  onGoto,
  lesson,
  className,
}: {
  scenes: PagedScene[];
  active: number;
  onGoto: (i: number) => void;
  lesson?: LessonNavInfo['current'];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {lesson && (
        <div className="flex items-baseline gap-2 font-display">
          <span className="font-mono text-base font-bold text-accent" dir="ltr">
            {String(lesson.number).padStart(2, '0')}
          </span>
          <span className="text-sm font-extrabold text-fg">{lesson.shortTitle}</span>
        </div>
      )}
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="ציר הלמידה">
        {scenes.map((s, i) => {
          const state = stateOf(i, active);
          const isActive = state === 'active';
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              onClick={() => onGoto(i)}
              aria-selected={isActive}
              aria-label={`תת נושא: ${s.label}`}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 font-display text-xs font-bold transition-colors',
                isActive
                  ? 'bg-accent text-bg-elevated'
                  : state === 'completed'
                    ? 'bg-brand/15 text-brand-dark'
                    : 'bg-bg-accent text-fg-dim hover:text-fg',
              )}
            >
              {state === 'completed' && <Check className="size-3" strokeWidth={3} aria-hidden />}
              {s.label}
            </button>
          );
        })}
      </div>
      <ProgressBar
        value={((active + 1) / scenes.length) * 100}
        tone="accent"
        label="התקדמות בסצנות"
      />
    </div>
  );
}
