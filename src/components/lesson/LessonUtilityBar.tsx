'use client';

/**
 * LessonUtilityBar — פס דביק רך בתחתית המסך (Design 1, §15).
 * לבן/קרם עם צל עדין כלפי מעלה, התקדמות בימין, CTA כתום בשמאל.
 * במובייל: CTA אחד ברור.
 */
import { ArrowLeft, Flag } from 'lucide-react';
import type { LessonNavInfo } from './LessonShell';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';

export function LessonUtilityBar({
  sceneIdx,
  sceneTotal,
  sceneLabel,
  isLast,
  nextLesson,
}: {
  sceneIdx: number;
  sceneTotal: number;
  sceneLabel?: string;
  isLast: boolean;
  nextLesson?: LessonNavInfo['next'];
}) {
  const pct = sceneTotal > 0 ? ((sceneIdx + 1) / sceneTotal) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated/95 shadow-[0_-8px_28px_-16px_rgba(58,58,58,0.18)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* ── התקדמות — צד ימין ב-RTL ── */}
        <div className="hidden min-w-0 items-center gap-4 sm:flex">
          <span className="whitespace-nowrap font-mono text-xs text-fg-dim" dir="ltr">
            {sceneIdx + 1}/{sceneTotal}
          </span>
          <ProgressBar value={pct} tone="accent" className="w-32" />
          {sceneLabel && (
            <span className="truncate font-display text-sm font-bold text-fg">{sceneLabel}</span>
          )}
        </div>

        {/* ── CTA — צד שמאל ב-RTL ── */}
        <div className="flex flex-1 justify-end sm:flex-none">
          {isLast ? (
            nextLesson ? (
              <Button
                href={`/lessons/${nextLesson.id}/`}
                size="sm"
                aria-label="סיים שיעור והמשך לשיעור הבא"
                className="w-full sm:w-auto"
              >
                <span className="truncate">סיים שיעור · {nextLesson.shortTitle}</span>
                <ArrowLeft className="size-4 shrink-0" aria-hidden />
              </Button>
            ) : (
              <Button href="/" size="sm" aria-label="סיום הקורס" className="w-full sm:w-auto">
                <Flag className="size-4 shrink-0" aria-hidden />
                <span>סיים את הקורס</span>
              </Button>
            )
          ) : (
            <Button
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}
              aria-label="המשך לשלב הבא"
              className="w-full sm:w-auto"
            >
              <span>המשך לשלב הבא</span>
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
