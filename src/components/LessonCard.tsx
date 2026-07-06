import Link from 'next/link';
import { ArrowLeft, Clock, Layers } from 'lucide-react';
import type { Lesson } from '@/lib/lessons';
import { lessonScenes, lessonAssets, difficultyLabels } from '@/lib/lesson-scenes';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { StatusChip } from '@/components/ui/StatusChip';
import { FrameCorners } from '@/components/ui/FrameCorners';

/**
 * LessonCard V2 — כרטיס דוסייה בגריד הסילבוס (design-system §22.2, שפת V2).
 * גיליון-מפה חד: מספר-מתאר ענק ברקע, נכס 1:1 בחלון עם סוגריים-מסגרת,
 * חותמת קושי, מטא עם מוביל-נקודות. מוביל לדף ה-Overview.
 */
export function LessonCard({ lesson }: { lesson: Lesson }) {
  const num = String(lesson.number).padStart(2, '0');
  const sceneCount = lessonScenes[lesson.id]?.length ?? 0;
  const asset = lessonAssets[lesson.id];

  return (
    <Link
      href={`/lessons/${lesson.id}/overview/`}
      className="group relative flex flex-col overflow-hidden rounded-[3px] border border-brand-dark/25 bg-bg-card shadow-paper transition-all duration-300 ease-snap hover:-translate-y-1 hover:border-brand-dark/50"
    >
      {/* מספר-מתאר ענק — חותם רקע */}
      <span
        aria-hidden
        className="outline-numeral pointer-events-none absolute -top-5 -start-2 text-[6.5rem] leading-none opacity-70"
      >
        {num}
      </span>

      {/* ── חלון הנכס ── */}
      <div className="relative mx-3 mt-3 ms-[4.5rem]">
        <div className="relative border border-brand-dark/20 bg-bg p-1">
          <FrameCorners size="sm" />
          <IsometricAsset
            assetId={`LESSON-${num}-CARD`}
            src={asset?.card ?? ''}
            alt={`איור איזומטרי לשיעור ${lesson.shortTitle}`}
            aspect="16/9"
            compactPlaceholder
          />
        </div>
        <span className="absolute -bottom-2.5 end-2">
          <StatusChip tone={lesson.difficulty === 'foundation' ? 'brand' : lesson.difficulty === 'intermediate' ? 'neutral' : 'accent'}>
            {difficultyLabels[lesson.difficulty]}
          </StatusChip>
        </span>
      </div>

      {/* ── גוף ── */}
      <div className="relative flex flex-1 flex-col px-4 pb-4 pt-4">
        <h3 className="font-display text-lg font-extrabold leading-snug text-fg text-balance transition-colors group-hover:text-brand-dark">
          {lesson.shortTitle}
        </h3>
        <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-fg-muted line-clamp-2 text-pretty">
          {lesson.subtitle}
        </p>

        {/* מטא — מוביל נקודות */}
        <div className="mt-3.5 flex flex-col gap-1">
          <div className="dotted-leader text-xs text-fg-dim">
            <span className="order-1 inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              משך
            </span>
            <span className="order-3 font-mono font-bold text-fg">{lesson.duration} דק'</span>
          </div>
          <div className="dotted-leader text-xs text-fg-dim">
            <span className="order-1 inline-flex items-center gap-1.5">
              <Layers className="size-3.5" aria-hidden />
              סצנות
            </span>
            <span className="order-3 font-mono font-bold text-fg">{sceneCount}</span>
          </div>
        </div>
      </div>

      {/* ── פס פעולה תחתון ── */}
      <div className="flex items-center justify-between border-t border-brand-dark/15 bg-bg-accent/50 px-4 py-2.5 transition-colors group-hover:bg-brand-dark group-hover:text-bg">
        <span className="font-display text-xs font-bold tracking-wide text-brand-dark transition-colors group-hover:text-bg">
          פתח תדריך שיעור
        </span>
        <ArrowLeft
          className="size-4 text-accent transition-transform group-hover:-translate-x-1"
          aria-hidden
        />
      </div>
    </Link>
  );
}
