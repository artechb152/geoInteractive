'use client';

/**
 * LessonHero V2 — "תדריך שיעור" (design-system §8, שפת V2).
 * מספר-מתאר ענק מאחורי הכותרת, breadcrumb כמסלול עם מעוינים,
 * קו-פעולה כתום+מרווה, וכרטיס התקדמות כ"כרטיס ציר".
 */
import Link from 'next/link';
import type { Lesson } from '@/lib/lessons';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ProgressBar } from '@/components/ui/ProgressBar';

function Diamond({ className }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-1 rotate-45 bg-brand-dark/40 ${className ?? ''}`} />;
}

export function LessonBreadcrumb({ lesson }: { lesson: Lesson }) {
  const num = String(lesson.number).padStart(2, '0');
  return (
    <nav aria-label="פירורי לחם" className="flex items-center gap-2 text-xs font-display font-semibold text-fg-dim">
      <Link href="/" className="transition-colors hover:text-brand-dark">
        הקורס שלי
      </Link>
      <Diamond />
      <Link href="/#syllabus" className="transition-colors hover:text-brand-dark">
        שיעורים
      </Link>
      <Diamond />
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
  const done = sceneTotal > 0 ? sceneIdx + 1 : 0;
  const pct = sceneTotal > 0 ? (done / sceneTotal) * 100 : 0;

  return (
    <div className="relative mt-3 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-10">
      {/* מספר-מתאר ענק — חותם רקע של התדריך */}
      <span
        aria-hidden
        className="outline-numeral pointer-events-none absolute -top-9 -start-3 text-[9rem] leading-none opacity-60 lg:text-[12rem] lg:-top-14"
      >
        {num}
      </span>

      {/* ── כותרת — ימין ב-RTL ── */}
      <div className="relative min-w-0 pt-6 lg:pt-10">
        <h1 className="font-display font-extrabold tracking-tight text-balance leading-[1.08] text-[clamp(1.75rem,3.8vw,3rem)]">
          {lesson.title}
        </h1>
        <span aria-hidden className="mt-4 flex items-center gap-1.5">
          <span className="block h-1.5 w-20 bg-accent" />
          <span className="block size-1.5 rotate-45 bg-brand-dark" />
          <span className="block h-0.5 w-8 bg-brand-dark/40" />
        </span>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg text-pretty">
          {lesson.subtitle}
        </p>
      </div>

      {/* ── כרטיס ציר ההתקדמות — שמאל ב-RTL ── */}
      <SurfaceCard frame className="relative p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-display font-bold uppercase tracking-[0.18em] text-brand-dark">
            התקדמות בציר
          </span>
          <span className="font-mono text-2xl font-bold text-fg" dir="ltr">
            {Math.round(pct)}%
          </span>
        </div>
        <ProgressBar value={pct} tone="accent" className="mt-4" label="התקדמות בשיעור" />
        <div className="mt-3 flex items-center justify-between text-xs text-fg-dim">
          <span>
            נקודת ציון {done} מתוך {sceneTotal}
          </span>
          <span className="font-mono" dir="ltr">
            {done}/{sceneTotal}
          </span>
        </div>
      </SurfaceCard>
    </div>
  );
}
