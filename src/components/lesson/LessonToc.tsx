'use client';

/**
 * LessonToc V2 — "ציר הלמידה" (design-system §12, שפת V2).
 *
 * דסקטופ: פאנל גיליון-מפה sticky בעמודה הימנית; הסצנות הן נקודות ציון
 * (waypoints) מעוינות על ציר אנכי מקווקו — כמו ציר מתוכנן על מפה.
 * מובייל: רצועת פלטות אופקית + ציר התקדמות (LessonTocMobile).
 *
 * מצבי נקודת ציון:
 *   completed — מעוין מרווה מלא עם ✓
 *   active    — מעוין כתום עם טבעת + רקע חם לשורה
 *   future    — מעוין outline אפור
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

function Waypoint({ state }: { state: TocState }) {
  if (state === 'completed') {
    return (
      <span className="relative z-10 grid size-[18px] shrink-0 rotate-45 place-items-center bg-brand-dark" aria-hidden>
        <Check className="size-3 -rotate-45 text-bg" strokeWidth={3.5} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="relative z-10 grid size-[18px] shrink-0 rotate-45 place-items-center border-2 border-accent bg-bg-card" aria-hidden>
        <span className="size-2 bg-accent" />
      </span>
    );
  }
  return (
    <span className="relative z-10 size-[14px] shrink-0 rotate-45 border-2 border-border-strong bg-bg-card mx-0.5" aria-hidden />
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
      frame
      className={cn(
        'sticky top-[calc(var(--header-h)+1rem)] max-h-[calc(100vh-var(--header-h)-2rem)] overflow-y-auto p-4',
        className,
      )}
    >
      <div aria-label="ציר הלמידה">
        {lesson && (
          <div className="mb-3 border-b border-brand-dark/15 px-1 pb-3">
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
          ציר הלמידה
        </div>

        {/* ציר אנכי מקווקו + נקודות ציון */}
        <ol className="relative flex list-none flex-col">
          <span
            aria-hidden
            className="absolute bottom-5 top-5 start-[21px] w-px border-s-2 border-dashed border-brand-dark/25"
          />
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
                    'flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors',
                    isActive ? 'bg-bg-accent' : 'hover:bg-bg-accent/60',
                  )}
                >
                  <Waypoint state={state} />
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
                  <span className="font-mono text-[10px] text-fg-dim" aria-hidden dir="ltr">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 border-t border-brand-dark/15 px-1 pt-3.5">
          <div className="mb-2 flex items-center justify-between text-[11px] text-fg-dim">
            <span className="font-display font-bold text-brand-dark">התקדמות בציר</span>
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
                'oct-sm inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 font-display text-xs font-bold transition-colors',
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
