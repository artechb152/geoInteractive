import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  Crosshair,
  Flag,
  ListChecks,
  Play,
  Target,
} from 'lucide-react';
import { lessons, getLesson, nextLesson, prevLesson } from '@/lib/lessons';
import { lessonScenes, lessonAssets, interactionLabels } from '@/lib/lesson-scenes';
import { LessonStatsBar } from '@/components/lesson/LessonStatsBar';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { PageShell } from '@/components/ui/PageShell';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { StatusChip } from '@/components/ui/StatusChip';
import { Button } from '@/components/ui/Button';
import { TopoField } from '@/components/ui/TopoField';
import { cn } from '@/lib/utils';

/**
 * Lesson Overview — דף הכניסה לשיעור בשפת Design 1 (§22.3).
 * Hero דו-עמודי (טקסט + asset) → CTA התחלה → stats bar → מטרות →
 * מבנה השיעור → דרישות קדם → שיעורים קשורים.
 */

export function generateStaticParams() {
  return lessons.map((l) => ({ topicId: l.id }));
}

export default async function LessonOverviewPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const lesson = getLesson(topicId);
  if (!lesson) notFound();

  const scenes = lessonScenes[topicId] ?? [];
  const assets = lessonAssets[topicId];
  const prev = prevLesson(topicId);
  const next = nextLesson(topicId);
  const num = String(lesson.number).padStart(2, '0');

  return (
    <main className="relative">
      {/* ── תדריך: Hero דו-עמודי על שולחן המפות ── */}
      <div className="border-b border-border">
        <div className="mx-auto w-full max-w-lesson px-4 sm:px-6 lg:px-8 relative py-7 lg:py-10">
          <nav aria-label="פירורי לחם" className="flex items-center gap-1.5 text-sm font-display font-semibold tracking-wider text-fg-muted">
            <Link href="/" className="transition-colors hover:text-brand-dark">
              הקורס שלי
            </Link>
            <ChevronLeft aria-hidden className="size-3.5 text-fg-dim" />
            <Link href="/#syllabus" className="transition-colors hover:text-brand-dark">
              שיעורים
            </Link>
            <ChevronLeft aria-hidden className="size-3.5 text-fg-dim" />
            <span className="text-brand-dark" aria-current="page">
              שיעור {num} · תדריך
            </span>
          </nav>

          <div className="mt-4 grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
            {/* עמודת טקסט — ימין ב-RTL */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone="brand">
                  תדריך שיעור {num} מתוך {lessons.length}
                </StatusChip>
                <StatusChip tone="neutral">
                  {interactionLabels[lesson.interactions[0]]}
                </StatusChip>
              </div>
              <h1 className="mt-4 font-display font-extrabold tracking-tight text-balance leading-[1.1] text-black text-[clamp(1.875rem,3.8vw,2.875rem)]">
                {lesson.title}
              </h1>
              <span aria-hidden className="mt-4 block h-1 w-10 rounded-full bg-accent" />
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted text-pretty">
                {lesson.subtitle}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button href={`/lessons/${lesson.id}/`} size="lg">
                  <span>התחל שיעור</span>
                </Button>
                <Button href="/#syllabus" variant="secondary" size="lg">
                  חזרה לסילבוס
                </Button>
              </div>
            </div>

            {/* asset Magnific — כרטיס לבן מוגבה, שמאל ב-RTL */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-bg-elevated shadow-elevated">
              <IsometricAsset
                assetId={`LESSON-${num}-HOOK`}
                src={assets?.hook ?? ''}
                alt={`איור איזומטרי בסגנון papercut לשיעור ${lesson.shortTitle}`}
                aspect="16/9"
              />
            </div>
          </div>

          <LessonStatsBar lesson={lesson} sceneTotal={scenes.length} className="mt-12" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-lesson px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* ── מטרות השיעור ── */}
          <section aria-labelledby="objectives-heading">
            <p className="text-sm font-display font-semibold tracking-wider text-fg-muted">מה יוצאים איתו</p>
            <h2
              id="objectives-heading"
              className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
            >
              מטרות השיעור
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              {lesson.objectives.map((obj, i) => (
                <SurfaceCard as="div" flat key={i} className="p-4">
                  <p className="text-base leading-relaxed text-black text-pretty">
                    {obj}
                  </p>
                </SurfaceCard>
              ))}
            </div>
          </section>

          {/* ── מבנה השיעור ── */}
          <section aria-labelledby="structure-heading">
            <p className="text-sm font-display font-semibold tracking-wider text-fg-muted">מפת דרך</p>
            <h2
              id="structure-heading"
              className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
            >
              מבנה השיעור
            </h2>
            <SurfaceCard className="mt-5 p-5">
              <ol className="relative flex list-none flex-col">
                {/* ציר אנכי דק */}
                <span aria-hidden className="absolute bottom-6 top-6 start-[15px] w-px bg-border" />
                {scenes.map((s, i) => {
                  return (
                    <li key={s.id} className="relative flex items-center gap-3.5 pb-5 last:pb-0">
                      <span aria-hidden className="relative z-10 grid size-8 shrink-0 place-items-center"><span className={cn('size-2.5 rounded-full', i === 0 ? 'bg-accent' : 'bg-border-strong')} /></span>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-sm text-fg-muted" dir="ltr">
                            {num}.{i + 1}
                          </span>
                          <span className="font-display text-sm font-bold leading-tight text-black">
                            {s.label}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-5 border-t border-border pt-4">
                <Button href={`/lessons/${lesson.id}/`} className="w-full">
                  <span>התחל שיעור</span>
                </Button>
              </div>
            </SurfaceCard>

            {/* ── דרישות קדם ── */}
            <div className="mt-12">
              <p className="text-sm font-display font-semibold tracking-wider text-fg-muted">לפני שמתחילים</p>
              <h3 className="mt-1 font-display text-xl font-bold leading-tight tracking-tight">דרישות קדם</h3>
              {prev ? (
                <Link
                  href={`/lessons/${prev.id}/overview/`}
                  className="group mt-3 flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated p-4 transition-all duration-300 ease-snap hover:border-brand/30 hover:bg-brand/[0.03]"
                >
                  <ArrowRight className="size-5 shrink-0 text-fg-dim transition-colors group-hover:text-brand-dark" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-display font-semibold tracking-wider text-fg-muted">מומלץ להשלים קודם</div>
                    <div className="truncate font-display text-sm font-bold leading-tight text-black transition-colors group-hover:text-brand-dark">
                      שיעור {String(prev.number).padStart(2, '0')} · {prev.shortTitle}
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="mt-3 text-base leading-relaxed text-black">
                  זהו שיעור הפתיחה של הקורס — אפשר להתחיל ישר.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ── שיעורים קשורים ── */}
        <section aria-labelledby="related-heading" className="mt-12 border-t border-border-subtle pt-8">
          <p className="text-sm font-display font-semibold tracking-wider text-fg-muted">המשך המסלול</p>
          <h2
            id="related-heading"
            className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          >
            שיעורים קשורים
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {prev && (
              <Link
                href={`/lessons/${prev.id}/overview/`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated p-4 transition-all duration-300 ease-snap hover:border-brand/30 hover:bg-brand/[0.03]"
              >
                <ArrowRight className="size-5 shrink-0 text-fg-dim transition-colors group-hover:text-brand-dark" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-display font-semibold tracking-wider text-fg-muted">
                    השיעור הקודם
                  </div>
                  <div className="truncate font-display text-sm font-bold leading-tight text-black">
                    {prev.shortTitle}
                  </div>
                </div>
              </Link>
            )}
            {next && (
              <Link
                href={`/lessons/${next.id}/overview/`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated p-4 transition-all duration-300 ease-snap hover:border-brand/30 hover:bg-brand/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-display font-semibold tracking-wider text-accent">
                    השיעור הבא
                  </div>
                  <div className="truncate font-display text-sm font-bold leading-tight text-black">
                    {next.shortTitle}
                  </div>
                </div>
                <ArrowLeft className="size-5 shrink-0 text-fg-muted transition-colors group-hover:text-brand-dark" aria-hidden />
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
