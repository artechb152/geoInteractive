/**
 * LessonStatsBar — פס סטטים רוחבי בשפת Design 1: כרטיס לבן רך עם
 * משבצות אייקון עגולות וקווי הפרדה עדינים מאוד (כמו רצועת ה-features
 * בתחתית ה-Hero במסמך העיצוב).
 */
import { Clock, Gauge, Crosshair, Layers, Activity } from 'lucide-react';
import type { Lesson } from '@/lib/lessons';
import { interactionLabels, difficultyLabels } from '@/lib/lesson-scenes';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';

function StatCell({
  icon,
  label,
  value,
  divider = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-3 px-4 py-4 sm:px-5">
      {divider && (
        <span aria-hidden className="absolute inset-y-4 start-0 hidden w-px bg-border lg:block" />
      )}
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand-dark">
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <div className="text-[11px] text-fg-dim">{label}</div>
        <div className="mt-0.5 truncate font-display text-sm font-extrabold text-fg">{value}</div>
      </div>
    </div>
  );
}

export function LessonStatsBar({
  lesson,
  sceneTotal,
  sceneIdx,
  className,
}: {
  lesson: Lesson;
  sceneTotal: number;
  /** אינדקס סצנה פעילה; אם לא סופק (Overview) — סטטוס "מוכן ללמידה" */
  sceneIdx?: number;
  className?: string;
}) {
  const hasProgress = sceneIdx !== undefined && sceneTotal > 0;
  const isRecap = hasProgress && sceneIdx === sceneTotal - 1;

  return (
    <SurfaceCard flat className={cn('overflow-hidden', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCell icon={<Clock className="size-4" />} label="משך השיעור" value={`${lesson.duration} דק'`} divider={false} />
        <StatCell
          icon={<Gauge className="size-4" />}
          label="רמת קושי"
          value={difficultyLabels[lesson.difficulty]}
        />
        <StatCell
          icon={<Crosshair className="size-4" />}
          label="סוג תרגול"
          value={interactionLabels[lesson.interactions[0]]}
        />
        <StatCell icon={<Layers className="size-4" />} label="נקודות ציון" value={`${sceneTotal} סצנות`} />
        <div className="relative col-span-2 flex items-center gap-3 px-4 py-4 sm:col-span-1 sm:px-5">
          <span aria-hidden className="absolute inset-y-4 start-0 hidden w-px bg-border lg:block" />
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand-dark">
            <Activity className="size-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[11px] text-fg-dim">סטטוס</div>
            <div className="mt-1">
              {!hasProgress ? (
                <StatusChip tone="dim">מוכן ללמידה</StatusChip>
              ) : isRecap ? (
                <StatusChip tone="brand">בשלב הסיכום</StatusChip>
              ) : (
                <StatusChip tone="accent">בלמידה</StatusChip>
              )}
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
