'use client';

/**
 * SceneNavigation — ניווט תחתון בתוך כרטיס הסצנה (Design 1, §14).
 * "הבא" כפתור כתום · "הקודם" כפתור outline · נקודות רכות + "סצנה X מתוך Y" במרכז.
 * בסצנת הסיכום, ה"הבא" הופך לקישור לשיעור הבא (או "סיום הקורס").
 */
import { ArrowLeft, ArrowRight, Flag } from 'lucide-react';
import type { PagedScene } from './PagedLearn';
import type { LessonNavInfo } from './LessonShell';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function SceneNavigation({
  scenes,
  active,
  onGoto,
  nextLesson,
}: {
  scenes: PagedScene[];
  active: number;
  onGoto: (i: number) => void;
  nextLesson?: LessonNavInfo['next'];
}) {
  const isFirst = active === 0;
  const isLast = active === scenes.length - 1;

  return (
    <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      {/* הקודם — אחורה בסדר הלמידה */}
      <Button
        variant="secondary"
        size="sm"
        disabled={isFirst}
        onClick={() => onGoto(active - 1)}
        aria-label="הסצנה הקודמת"
        className={cn('sm:max-w-[16rem]', isFirst && 'invisible')}
      >
        <ArrowRight className="size-4 shrink-0" aria-hidden />
        <span className="truncate">הקודם · {isFirst ? '' : scenes[active - 1].label}</span>
      </Button>

      {/* נקודות רכות — אינדיקטור סצנות */}
      <div className="order-first flex flex-col items-center gap-2 sm:order-none">
        <div className="flex items-center gap-1.5" aria-hidden>
          {scenes.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                'rounded-full transition-all duration-300',
                i === active
                  ? 'h-2 w-5 bg-accent'
                  : i < active
                    ? 'size-2 bg-brand-dark/60'
                    : 'size-2 border border-border-strong bg-transparent',
              )}
            />
          ))}
        </div>
        <span className="text-[11px] font-display font-semibold text-fg-dim">
          סצנה {active + 1} מתוך {scenes.length}
        </span>
      </div>

      {/* הבא — קדימה בסדר הלמידה */}
      {isLast ? (
        nextLesson ? (
          <Button
            href={`/lessons/${nextLesson.id}/`}
            size="sm"
            aria-label="לשיעור הבא"
            className="sm:max-w-[18rem]"
          >
            <span className="truncate">השיעור הבא · {nextLesson.shortTitle}</span>
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
          </Button>
        ) : (
          <Button href="/" size="sm" aria-label="סיום הקורס">
            <Flag className="size-4 shrink-0" aria-hidden />
            <span>סיום הקורס · חזרה לסילבוס</span>
          </Button>
        )
      ) : (
        <Button
          size="sm"
          onClick={() => onGoto(active + 1)}
          aria-label="הסצנה הבאה"
          className="sm:max-w-[16rem]"
        >
          <span className="truncate">הבא · {scenes[active + 1].label}</span>
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
        </Button>
      )}
    </div>
  );
}
