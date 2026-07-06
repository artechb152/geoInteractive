'use client';

/**
 * LessonHero — "תדריך שיעור" בשפת Design 1: כותרת גדולה עם צ'יפ רך
 * "שיעור X מתוך Y", ולצידה נכס Magnific איזומטרי גדול בכרטיס לבן מוגבה.
 * ה-breadcrumb מפריד עם שברון (›) רך במקום מעוינים.
 */
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { lessons, type Lesson } from '@/lib/lessons';
import { lessonAssets } from '@/lib/lesson-scenes';
import { IsometricAsset } from '@/components/assets/IsometricAsset';

function Crumb({ className }: { className?: string }) {
  return <ChevronLeft aria-hidden className={`size-3.5 text-fg-dim/50 ${className ?? ''}`} />;
}

export function LessonBreadcrumb({ lesson }: { lesson: Lesson }) {
  const num = String(lesson.number).padStart(2, '0');
  return (
    <nav aria-label="פירורי לחם" className="flex items-center gap-1.5 text-xs font-display font-semibold text-fg-dim">
      <Link href="/" className="transition-colors hover:text-brand-dark">
        הקורס שלי
      </Link>
      <Crumb />
      <Link href="/#syllabus" className="transition-colors hover:text-brand-dark">
        שיעורים
      </Link>
      <Crumb />
      <Link
        href={`/lessons/${lesson.id}/overview/`}
        aria-current="page"
        className="text-brand-dark transition-colors hover:text-fg"
        title="לתדריך השיעור"
      >
        שיעור {num}
      </Link>
    </nav>
  );
}

export function LessonHero({
  lesson,
  sceneIdx,
  sceneTotal,
}: {
  lesson: Lesson;
  /** אינדקס הסצנה הפעילה (0-based) */
  sceneIdx: number;
  sceneTotal: number;
}) {
  const num = String(lesson.number).padStart(2, '0');
  const assets = lessonAssets[lesson.id];

  return (
    <div className="mt-4 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
      {/* ── כותרת — ימין ב-RTL ── */}
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-accent px-3 py-1 font-display text-xs font-bold text-brand-dark">
          שיעור {num} מתוך {lessons.length}
        </span>
        <h1 className="mt-3 font-display font-extrabold tracking-tight text-balance leading-[1.1] text-[clamp(1.75rem,3.8vw,3rem)]">
          {lesson.title}
        </h1>
        <span aria-hidden className="mt-4 block h-1.5 w-16 rounded-full bg-accent" />
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg text-pretty">
          {lesson.subtitle}
        </p>
        {sceneTotal > 0 && (
          <p className="mt-3 text-sm text-fg-dim">
            סצנה {sceneIdx + 1} מתוך {sceneTotal}
          </p>
        )}
      </div>

      {/* ── נכס Magnific — כרטיס לבן מוגבה, שמאל ב-RTL ── */}
      <div className="overflow-hidden rounded-3xl border border-brand/15 bg-bg-elevated shadow-elevated">
        <IsometricAsset
          assetId={`LESSON-${num}-CARD`}
          src={assets?.card ?? ''}
          alt={`איור איזומטרי בסגנון papercut לשיעור ${lesson.shortTitle}`}
          aspect="1/1"
          compactPlaceholder
        />
      </div>
    </div>
  );
}
