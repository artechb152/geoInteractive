'use client';

/**
 * SceneNavigation V2 — ניווט תחתון בתוך גיליון הסצנה (design-system §14).
 * "הבא" פלטה כתומה · "הקודם" פלטת נייר · מעוינים + "נקודת ציון X/Y" במרכז.
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
    <div className="mt-10 flex flex-col gap-4 border-t-2 border-dashed border-brand-dark/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
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

      {/* מעוינים — אינדיקטור ציר */}
      <div className="order-first flex flex-col items-center gap-2 sm:order-none">
        <div className="flex items-center gap-2" aria-hidden>
          {scenes.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                'rotate-45 transition-all duration-300',
                i === active
                  ? 'size-2.5 bg-accent'
                  : i < active
                    ? 'size-1.5 bg-brand-dark'
                    : 'size-1.5 border border-border-strong bg-transparent',
              )}
            />
          ))}
        </div>
        <span className="text-[11px] font-display font-semibold text-fg-dim">
          נקודת ציון {active + 1} מתוך {scenes.length}
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
